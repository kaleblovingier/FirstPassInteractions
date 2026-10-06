/**
 * Pre-Visit Clinical Sign-Off Packet & Regimen Report Generator.
 * Consolidates active regimen pharmacology, host pharmacogenomics (CYP phenotypes),
 * composite clinical risk scores (MME, ACB, QTc, CNS depression), collision triage,
 * plain-language patient counseling points, and structured EHR progress notes.
 *
 * Educational reference only — not FDA-cleared CDS, not a prescription writer.
 * The FDA-approved Prescribing Information and the attending clinician govern.
 */

import { DRUG_BY_ID } from "./catalog";
import { alertsOnDesk, type AlertFlag } from "./alerts";
import { acbOnDesk, type AcbReport } from "./acb";
import { mmeOnDesk, type MmeFactor } from "./mme";
import { qtReport, type QtReport } from "./qt";
import { doacReportOnDesk, type DoacReport } from "./doac";
import { plainLanguageSummary } from "./interaction-summary";
import {
  AGE_LABEL,
  ALCOHOL_LABEL,
  CANNABIS_ROUTE_LABEL,
  ITEM_KIND_LABEL,
  KETAMINE_ROUTE_LABEL,
  KIDNEY_LABEL,
  METABOLIZER_LABEL,
  PHENOTYPE_ENZYMES,
  PREG_LABEL,
  SEVERITY_LABEL,
  type EnzymeRole,
  type Finding,
  type HostContext,
  type Severity,
} from "./types";
import { NOT_CLEARED, PI_FOOTER, SOFTWARE } from "../regulatory";

export interface RegimenItemDetail {
  id: string;
  name: string;
  brandExamples: string[];
  cls: string;
  kind: string;
  dose: string;
  substrates: string[];
  inhibitors: string[];
  inducers: string[];
  alertFlags: AlertFlag[];
  toxicityHint: string;
}

export interface ClinicalRiskIndexes {
  mme: {
    hasOpioid: boolean;
    items: MmeFactor[];
    warning: string | null;
  };
  acb: AcbReport | null;
  qt: QtReport | null;
  cnsDepression: {
    hasSynergy: boolean;
    agents: string[];
    boxedWarning: string | null;
  };
  harmReduction: {
    hasStreetOrOpioid: boolean;
    headline: string | null;
    guidance: string | null;
  };
  anticoagulation: {
    hasAnticoagulant: boolean;
    agents: string[];
    hasDoac: boolean;
    report: DoacReport | null;
    summary: string | null;
  };
}

export interface ClinicalPacketData {
  generatedAt: string;
  encounterDate: string;
  disclaimer: string;
  regimen: RegimenItemDetail[];
  hostSummary: {
    age: string;
    kidney: string;
    preg: string;
    smoking: string;
    alcohol: string;
    ketamineRoute: string;
    cannabisRoute: string;
    phenotypes: {
      enzyme: string;
      phenotype: string;
      label: string;
    }[];
  };
  riskIndexes: ClinicalRiskIndexes;
  collisions: {
    contraindicated: Finding[];
    major: Finding[];
    moderate: Finding[];
    minor: Finding[];
  };
  counselingPoints: string[];
  ehrNoteText: string;
  patientHandoutText: string;
}

const STREET_DRUG_IDS = new Set([
  "fentanyl",
  "dirty-30",
  "heroin",
  "xylazine",
  "medetomidine",
  "seven-oh",
  "carfentanil",
  "isotonitazene",
  "protonitazene",
  "metonitazene",
  "etonitazene",
]);

export function buildClinicalPacket(
  ids: string[],
  host: HostContext,
  findings: Finding[],
  doses: Record<string, string> = {},
): ClinicalPacketData {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeFormatted = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const generatedAt = `${dateFormatted} at ${timeFormatted}`;

  // 1. Regimen details
  const alertMap = new Map<string, AlertFlag[]>();
  for (const item of alertsOnDesk(ids)) {
    alertMap.set(item.id, item.flags);
  }

  const regimen: RegimenItemDetail[] = [];
  for (const id of ids) {
    const drug = DRUG_BY_ID[id];
    if (!drug) continue;
    const substrates: string[] = [];
    const inhibitors: string[] = [];
    const inducers: string[] = [];
    for (const c of drug.enzymes ?? []) {
      if (c.kind === "substrate") {
        substrates.push(String(c.enzyme));
      } else if (c.kind === "inhibitor") {
        inhibitors.push(`${c.enzyme} (${c.strength})`);
      } else if (c.kind === "inducer") {
        inducers.push(`${c.enzyme} (${c.strength})`);
      }
    }

    regimen.push({
      id,
      name: drug.name,
      brandExamples: drug.brands,
      cls: drug.cls,
      kind: ITEM_KIND_LABEL[drug.kind] ?? drug.kind,
      dose: doses[id]?.trim() || "Unspecified",
      substrates,
      inhibitors,
      inducers,
      alertFlags: alertMap.get(id) ?? [],
      toxicityHint: drug.toxicityHint,
    });
  }

  // 2. Host summary
  const hostSummary = {
    age: AGE_LABEL[host.age ?? "adult"],
    kidney: KIDNEY_LABEL[host.kidney ?? "ok"],
    preg: PREG_LABEL[host.preg ?? "off"],
    smoking: host.smoking ? "Daily Combusted Tobacco (CYP1A2 induced ~30-50%)" : "Non-smoker / Off",
    alcohol: ALCOHOL_LABEL[host.alcohol],
    ketamineRoute: KETAMINE_ROUTE_LABEL[host.ketamineRoute],
    cannabisRoute: CANNABIS_ROUTE_LABEL[host.cannabisRoute],
    phenotypes: PHENOTYPE_ENZYMES.map((enzyme) => ({
      enzyme,
      phenotype: host.phenotypes[enzyme],
      label: METABOLIZER_LABEL[host.phenotypes[enzyme]],
    })),
  };

  // 3. Clinical risk indexes
  // 3a. MME & Opioids
  const mmeFactors = mmeOnDesk(ids);
  const opioidDrugs = ids.filter((id) => {
    const d = DRUG_BY_ID[id];
    return d?.pd.includes("opioid") || mmeFactors.some((m) => m.id === id);
  });
  let mmeWarning: string | null = null;
  if (opioidDrugs.length > 0) {
    mmeWarning =
      "CDC Clinical Practice Guideline (2022): Exercise extra caution when evaluating cumulative daily dosage. Dosages ≥50 MME/day warrant overdose risk discussion and naloxone co-prescription; dosages ≥90 MME/day require careful justification. Note that transdermal fentanyl, buprenorphine, and illicit opioids cannot be directly modeled with standard linear oral conversion.";
  }

  // 3b. Anticholinergic Cognitive Burden
  const acbReport = acbOnDesk(ids);

  // 3c. Cardiac QTc Repolarization
  const qtRep = qtReport(ids, host);

  // 3d. CNS / Respiratory Depression Synergism
  const cnsDepressants = ids.filter((id) => {
    const d = DRUG_BY_ID[id];
    return d?.pd.includes("cns-depressant") || d?.pd.includes("benzo-zdrug") || d?.pd.includes("opioid");
  });
  const hasBenzo = ids.some((id) => DRUG_BY_ID[id]?.pd.includes("benzo-zdrug"));
  const hasOpioid = opioidDrugs.length > 0;
  const hasAlcohol = ids.includes("ethanol") || host.alcohol === "acute" || host.alcohol === "chronic";
  const hasSynergy = (hasOpioid && hasBenzo) || (hasOpioid && hasAlcohol) || cnsDepressants.length >= 3;

  let boxedWarning: string | null = null;
  if (hasOpioid && hasBenzo) {
    boxedWarning =
      "FDA Boxed Warning: Concomitant prescribing of opioids and benzodiazepines or other CNS depressants may result in profound sedation, respiratory depression, coma, and death. Reserve co-prescribing for patients with inadequate alternative treatment options; limit dosages and durations to the minimum required.";
  } else if (hasOpioid && hasAlcohol) {
    boxedWarning =
      "Alcohol Synergism: Acute or chronic ethanol intake co-administered with central opioids markedly accelerates respiratory depression and elevates fatal overdose hazards. Extended-release formulations (e.g. Kadian) may undergo rapid alcohol-induced dose dumping.";
  } else if (cnsDepressants.length >= 3) {
    boxedWarning =
      "Polypharmacy CNS Depression: Three or more central depressants present on the regimen. Synergistic airway compromise, psychomotor impairment, and aspiration risk are heightened.";
  }

  // 3e. Harm Reduction & Overdose Risk
  const hasStreet = ids.some((id) => STREET_DRUG_IDS.has(id));
  const hasStreetOrOpioid = hasStreet || hasOpioid || ids.includes("xylazine");
  let harmHeadline: string | null = null;
  let harmGuidance: string | null = null;
  if (hasStreet) {
    harmHeadline = "Street Drug / Adulterant Supply Advisory";
    harmGuidance =
      "Illicit fentanyl and xylazine ('tranq') adulteration present high risk of sudden apnea, bradycardia, and severe necrotic wounds. Naloxone will not reverse alpha-2 adrenergic xylazine sedation; provide rescue breathing immediately and call 911.";
  } else if (hasOpioid) {
    harmHeadline = "Opioid Safety & Naloxone Co-Prescription Prompt";
    harmGuidance =
      "Verify naloxone (Narcan) availability in patient's home and review signs of respiratory depression with patient and family members. Ensure state access line and free naloxone resources are provided.";
  }

  // 3f. Anticoagulation & Bleed Management
  const doacReport = doacReportOnDesk(ids, host);
  const hasAnticoagulant = doacReport.hasAnticoagulant;
  let anticoagulationSummary: string | null = null;
  if (hasAnticoagulant) {
    const agents = doacReport.anticoagulantsOnDesk.map((id) => DRUG_BY_ID[id]?.name ?? id);
    anticoagulationSummary = `Anticoagulant therapy active (${agents.join(", ")}). Multi-agent bleed risk, organ clearance rails, and emergency reversal pathways evaluated.`;
  }

  const riskIndexes: ClinicalRiskIndexes = {
    mme: {
      hasOpioid,
      items: mmeFactors,
      warning: mmeWarning,
    },
    acb: acbReport,
    qt: qtRep,
    cnsDepression: {
      hasSynergy,
      agents: cnsDepressants.map((id) => DRUG_BY_ID[id]?.name ?? id),
      boxedWarning,
    },
    harmReduction: {
      hasStreetOrOpioid,
      headline: harmHeadline,
      guidance: harmGuidance,
    },
    anticoagulation: {
      hasAnticoagulant,
      agents: doacReport.anticoagulantsOnDesk.map((id) => DRUG_BY_ID[id]?.name ?? id),
      hasDoac: doacReport.hasDoac,
      report: hasAnticoagulant ? doacReport : null,
      summary: anticoagulationSummary,
    },
  };

  // 4. Collisions by severity
  const collisions = {
    contraindicated: findings.filter((f) => f.severity === "contraindicated"),
    major: findings.filter((f) => f.severity === "major"),
    moderate: findings.filter((f) => f.severity === "moderate"),
    minor: findings.filter((f) => f.severity === "minor"),
  };

  // 5. Patient counseling points
  const counselingPoints: string[] = [];
  if (hasOpioid) {
    counselingPoints.push(
      "Take pain medicines exactly as prescribed. Never take extra doses or combine with alcohol or sedatives without talking to your prescriber.",
    );
    counselingPoints.push(
      "Keep naloxone (Narcan nasal spray) accessible at home, and make sure family or caregivers know how to use it in an emergency.",
    );
  }
  if (hasBenzo) {
    counselingPoints.push(
      "Do not stop sedative or anti-anxiety medications abruptly without medical guidance, as sudden discontinuation can trigger rebound anxiety or withdrawal seizures.",
    );
  }
  if (acbReport && acbReport.totalScore >= 3) {
    counselingPoints.push(
      "Your medication list includes medicines that can cause dry mouth, constipation, blurred vision, or memory fog. Drink plenty of water, report difficulty urinating, and rise slowly to prevent dizziness or falls.",
    );
  }
  if (qtRep && qtRep.rows.length > 0) {
    counselingPoints.push(
      "Contact your care team promptly if you experience unexplained fluttering in your chest, racing heartbeat, or sudden lightheadedness.",
    );
  }
  if (host.smoking) {
    counselingPoints.push(
      "Combusted tobacco smoke speeds up how your body clears certain medications (like olanzapine or clozapine). If you change your smoking habits or quit, let your doctor know immediately so doses can be adjusted.",
    );
  }
  if (ids.some((id) => ["grapefruit", "atorvastatin", "simvastatin", "tacrolimus", "cyclosporine"].includes(id))) {
    counselingPoints.push(
      "Avoid consuming grapefruit or grapefruit juice, as it blocks the liver enzymes needed to break down your medicines and can cause dangerous drug build-up.",
    );
  }
  if (hasAnticoagulant) {
    counselingPoints.push(
      "Report any unusual bleeding immediately, including persistent nosebleeds, blood in your urine or stools (red or black/tarry), or unexpected large bruises. Seek emergency care for head injury or severe falls.",
    );
    counselingPoints.push(
      "Do not stop taking your blood thinner without talking to your prescriber. Abrupt discontinuation sharply raises your risk of blood clots or stroke.",
    );
    if (ids.includes("rivaroxaban")) {
      counselingPoints.push(
        "Rivaroxaban (Xarelto) 15 mg and 20 mg tablets must always be taken with food (with your evening meal). Taking it without food reduces drug absorption by one-third and leaves you vulnerable to clots.",
      );
    }
    if (ids.includes("dabigatran")) {
      counselingPoints.push(
        "Dabigatran (Pradaxa) capsules must be swallowed whole with plenty of water. Never open, crush, or chew capsules, and keep them in their original bottle with desiccant.",
      );
    }
    if (ids.some((id) => ["ibuprofen", "naproxen", "aspirin", "ketorolac"].includes(id))) {
      counselingPoints.push(
        "Avoid taking over-the-counter pain medications like ibuprofen (Advil/Motrin) or naproxen (Aleve) while on a blood thinner without medical clearance, as this drastically raises stomach ulcer and bleeding risk.",
      );
    }
  }
  for (const f of collisions.contraindicated.slice(0, 3)) {
    counselingPoints.push(plainLanguageSummary(f));
  }
  if (counselingPoints.length === 0) {
    counselingPoints.push(
      "Take each medication according to the directions on the pharmacy prescription bottle.",
      "Keep an up-to-date medication list in your wallet or phone and share it with every healthcare provider you visit.",
      "Report any unexpected rash, severe dizziness, or breathing changes to your healthcare team right away.",
    );
  }

  // 6. Structured EHR Note Text
  const ehrLines: string[] = [
    `FIRSTPASS CLINICAL PHARMACOLOGY CONSULTATION & REGIMEN REPORT`,
    `Generated: ${generatedAt}`,
    `Reference Engine: FirstPass v${SOFTWARE.version} (Educational Interaction Modeler)`,
    `Regulatory Notice: ${NOT_CLEARED}`,
    "",
    `==================================================================`,
    `1. MODELED HOST CONTEXT & METABOLIZER STATUS`,
    `==================================================================`,
    `- Age Cohort: ${hostSummary.age}`,
    `- Renal Function: ${hostSummary.kidney}`,
    `- Pregnancy/Lactation: ${hostSummary.preg}`,
    `- Tobacco Smoke: ${hostSummary.smoking}`,
    `- Alcohol Pattern: ${hostSummary.alcohol}`,
    `- Pharmacogenomic CPIC Phenotypes:`,
    ...hostSummary.phenotypes.map((p) => `  • ${p.enzyme}: ${p.label}`),
    "",
    `==================================================================`,
    `2. ACTIVE REGIMEN & ENZYME PATHWAYS`,
    `==================================================================`,
  ];

  for (const item of regimen) {
    const subStr = item.substrates.length ? `Substrate: ${item.substrates.join(", ")}` : "No major CYP substrate mapped";
    const inhStr = item.inhibitors.length ? `Inhibits: ${item.inhibitors.join(", ")}` : null;
    const indStr = item.inducers.length ? `Induces: ${item.inducers.join(", ")}` : null;
    const flagStr = item.alertFlags.length ? `Safety Flags: [${item.alertFlags.map((f) => f.label).join(", ")}]` : null;
    ehrLines.push(
      `• ${item.name} (${item.cls}) | Dose: ${item.dose}`,
      `  Pathways: ${[subStr, inhStr, indStr].filter(Boolean).join(" | ")}`,
      ...(flagStr ? [`  ${flagStr}`] : []),
    );
  }

  ehrLines.push(
    "",
    `==================================================================`,
    `3. MULTI-AGENT CLINICAL TOXICITY INDEXES`,
    `==================================================================`,
  );

  if (riskIndexes.acb) {
    ehrLines.push(
      `- Anticholinergic Cognitive Burden (ACB): Total Score ${riskIndexes.acb.totalScore} (${riskIndexes.acb.riskLevel.toUpperCase()} RISK)`,
      `  ${riskIndexes.acb.summary}`,
      `  Contributors: ${riskIndexes.acb.contributors.map((c) => `${c.name} (+${c.score})`).join(", ")}`,
    );
  } else {
    ehrLines.push(`- Anticholinergic Cognitive Burden: 0 (No scored anticholinergic agents mapped)`);
  }

  if (riskIndexes.qt && riskIndexes.qt.rows.length > 0) {
    ehrLines.push(
      `- Cardiac QTc Prolongation Burden: Score ${riskIndexes.qt.score} (${riskIndexes.qt.known} known-risk, ${riskIndexes.qt.possible} possible-risk)`,
      `  Agents: ${riskIndexes.qt.rows.map((r) => `${r.name} [${r.risk}]`).join(", ")}`,
      `  Clinical Watch: ${riskIndexes.qt.tell}`,
    );
  } else {
    ehrLines.push(`- Cardiac QTc Prolongation Burden: No additive QTc prolonging agents identified`);
  }

  if (riskIndexes.cnsDepression.hasSynergy) {
    ehrLines.push(
      `- Synergistic CNS / Respiratory Depression: HIGH CONCERN`,
      `  Agents: ${riskIndexes.cnsDepression.agents.join(", ")}`,
      `  Advisory: ${riskIndexes.cnsDepression.boxedWarning ?? "Synergistic sedation and hypoventilation risk."}`,
    );
  }

  if (riskIndexes.mme.hasOpioid) {
    ehrLines.push(
      `- Opioid / MME Evaluation: Opioids present on desk`,
      `  Guideline Advisory: ${riskIndexes.mme.warning}`,
    );
  }

  if (riskIndexes.anticoagulation.hasAnticoagulant && riskIndexes.anticoagulation.report) {
    const r = riskIndexes.anticoagulation.report;
    ehrLines.push(
      `- Anticoagulation & Bleed Risk Evaluation: Active agents (${riskIndexes.anticoagulation.agents.join(", ")})`,
    );
    if (r.apixabanAbc) {
      ehrLines.push(
        `  Apixaban ABC Criteria: ${r.apixabanAbc.criteriaMetCount}/3 met (${r.apixabanAbc.reductionIndicated ? "Dose reduction to 2.5 mg BID indicated" : "Standard 5 mg BID maintained"})`,
      );
    }
    for (const rail of r.renalRails) {
      ehrLines.push(`  ${rail.agentName} Renal Rail: ${rail.doseRecommendation} [${rail.status.toUpperCase()}]`);
      if (rail.foodRequirement) ehrLines.push(`    Administration Note: ${rail.foodRequirement}`);
      if (rail.capsuleIntegrityWarning) ehrLines.push(`    Capsule Integrity: ${rail.capsuleIntegrityWarning}`);
    }
    for (const rev of r.reversals) {
      if (rev.specificAntidote) {
        ehrLines.push(`  Emergency Reversal: ${rev.specificAntidote.name} (${rev.specificAntidote.brand}) — ${rev.specificAntidote.regimen}`);
      } else {
        ehrLines.push(`  Emergency Reversal: ${rev.nonSpecificAlternative.agent} — ${rev.nonSpecificAlternative.dosing}`);
      }
    }
  }

  ehrLines.push(
    "",
    `==================================================================`,
    `4. PHARMACOLOGICAL COLLISION TRIAGE`,
    `==================================================================`,
  );

  if (findings.length === 0) {
    ehrLines.push("No mapped collisions identified for the current active regimen.");
  } else {
    if (collisions.contraindicated.length > 0) {
      ehrLines.push(`[CONTRAINDICATED / AVOID TOGETHER]`);
      for (const f of collisions.contraindicated) {
        ehrLines.push(`• ${f.headline}`);
        ehrLines.push(`  Mechanism: ${f.mechanism}`);
        ehrLines.push(`  Clinical Watch: ${f.clinical}`);
      }
      ehrLines.push("");
    }
    if (collisions.major.length > 0) {
      ehrLines.push(`[MAJOR / SERIOUS CONCERN]`);
      for (const f of collisions.major) {
        ehrLines.push(`• ${f.headline}`);
        ehrLines.push(`  Mechanism: ${f.mechanism}`);
        ehrLines.push(`  Clinical Watch: ${f.clinical}`);
      }
      ehrLines.push("");
    }
    if (collisions.moderate.length > 0) {
      ehrLines.push(`[MODERATE / USE CARE]`);
      for (const f of collisions.moderate) {
        ehrLines.push(`• ${f.headline} — ${f.clinical}`);
      }
      ehrLines.push("");
    }
  }

  ehrLines.push(
    `==================================================================`,
    `5. PATIENT COUNSELING TALKING POINTS`,
    `==================================================================`,
    ...counselingPoints.map((cp) => `• ${cp}`),
    "",
    `==================================================================`,
    `6. CLINICIAN ATTESTATION & REVIEW CHECKLIST`,
    `==================================================================`,
    `[X] Active regimen reconciled with external pharmacy / clinical records`,
    `[X] CYP450 pharmacokinetic and pharmacodynamic collisions evaluated`,
    `[X] Organ clearance (renal/hepatic) dosing parameters reviewed`,
    `[X] Multi-agent toxicity (ACB, QTc, Sedation, MME) evaluated`,
    `[X] Patient counseling delivered & naloxone co-prescription offered/verified`,
    "",
    `Reviewed By: ___________________________________ [MD/DO/PharmD/NP/PA]`,
    `Date & Time: ___________________________________`,
    `Notes: _________________________________________________________________`,
    "",
    `------------------------------------------------------------------`,
    PI_FOOTER,
  );

  const ehrNoteText = ehrLines.join("\n");

  // 7. Patient Handout Text
  const handoutLines = [
    `FirstPass · Patient Medication Information Guide`,
    `Date: ${dateFormatted}`,
    "",
    `Your Active Medicines:`,
    ...regimen.map((r) => `• ${r.name}${r.brandExamples.length ? ` (${r.brandExamples.join(", ")})` : ""}`),
    "",
    `Important Everyday Safety Tips:`,
    ...counselingPoints.map((cp) => `• ${cp}`),
    "",
    `Emergency & Support Resources:`,
    `• Medical Emergency / Overdose: Call 911 immediately`,
    `• 24/7 Suicide & Crisis Lifeline: Call or text 988`,
    `• SAMHSA National Treatment Helpline: 1-800-662-4357`,
    `• Poison Help Center: 1-800-222-1222`,
    "",
    `Notice: This document is for educational review. Always talk with your pharmacist or doctor before changing or stopping any medication.`,
  ];
  const patientHandoutText = handoutLines.join("\n");

  return {
    generatedAt,
    encounterDate: dateFormatted,
    disclaimer: NOT_CLEARED,
    regimen,
    hostSummary,
    riskIndexes,
    collisions,
    counselingPoints,
    ehrNoteText,
    patientHandoutText,
  };
}
