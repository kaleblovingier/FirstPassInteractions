import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ClinicalPacketDialog } from "@/components/desk/clinical-packet-dialog";
import { buildClinicalPacket, DOSE_PER_PI, withoutDose } from "./clinical-packet";
import { DOSE_PATTERN } from "../guards/dose-rule";
import { analyze } from "./engine";
import { DEFAULT_HOST } from "./types";
import { EXPORT_EMPTY, EXPORT_NOT_A_DOSE, findingSourceLine } from "./brief";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

test("buildClinicalPacket: formats empty tray gracefully with disclaimers", () => {
  const host = { ...DEFAULT_HOST };
  const findings = analyze([], host).findings;
  const packet = buildClinicalPacket([], host, findings, {});

  assert.equal(packet.regimen.length, 0);
  assert.ok(packet.ehrNoteText.includes("FIRSTPASS CLINICAL PHARMACOLOGY"));
  assert.ok(packet.ehrNoteText.includes("Regulatory Notice"));
  assert.ok(packet.patientHandoutText.includes("Patient Medication Information Guide"));
  assert.equal(packet.riskIndexes.mme.hasOpioid, false);
  assert.equal(packet.riskIndexes.cnsDepression.hasSynergy, false);
});

test("buildClinicalPacket: correctly evaluates opioids, MME warnings, and harm reduction", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["oxycodone", "fentanyl"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { oxycodone: "10 mg q4h" });

  assert.equal(packet.regimen.length, 2);
  const oxy = packet.regimen.find((r) => r.id === "oxycodone");
  assert.equal(oxy?.dose, "10 mg q4h");
  assert.equal(packet.riskIndexes.mme.hasOpioid, true);
  assert.ok(packet.riskIndexes.mme.warning !== null);
  assert.ok(packet.riskIndexes.harmReduction.hasStreetOrOpioid);
  assert.ok(packet.counselingPoints.some((p) => p.includes("naloxone")));
});

test("buildClinicalPacket: detects multi-sedative CNS depression and FDA boxed warning", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["alprazolam", "oxycodone"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, {});

  assert.equal(packet.riskIndexes.cnsDepression.hasSynergy, true);
  assert.ok(packet.riskIndexes.cnsDepression.boxedWarning?.includes("FDA Boxed Warning"));
  assert.ok(packet.ehrNoteText.includes("Synergistic CNS / Respiratory Depression: HIGH CONCERN"));
});

test("buildClinicalPacket: calculates anticholinergic cognitive burden (ACB) score and warnings", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["amitriptyline", "diphenhydramine"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, {});

  assert.ok(packet.riskIndexes.acb !== null);
  assert.ok(packet.riskIndexes.acb.totalScore >= 3);
  assert.equal(packet.riskIndexes.acb.riskLevel, "high");
  assert.ok(packet.ehrNoteText.includes("Anticholinergic Cognitive Burden (ACB): Total Score"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("dry mouth") || cp.includes("memory fog")));
});

test("buildClinicalPacket: evaluates QTc prolongation and host phenotypes", () => {
  const host = {
    ...DEFAULT_HOST,
    smoking: true,
    phenotypes: {
      ...DEFAULT_HOST.phenotypes,
      CYP2D6: "PM" as const,
    },
  };
  const ids = ["methadone", "citalopram"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, {});

  assert.ok(packet.riskIndexes.qt !== null);
  assert.ok(packet.riskIndexes.qt.score > 0);
  assert.ok(packet.hostSummary.smoking.includes("Daily Combusted Tobacco"));
  const cyp2d6 = packet.hostSummary.phenotypes.find((p) => p.enzyme === "CYP2D6");
  assert.equal(cyp2d6?.phenotype, "PM");
});

test("buildClinicalPacket: evaluates anticoagulants, DOAC renal rails, and bleed counseling", () => {
  const host = {
    ...DEFAULT_HOST,
    age: "geriatric" as const,
    kidney: "ckd" as const,
  };
  const ids = ["apixaban", "aspirin"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { apixaban: "5 mg BID" }, { activeBleeding: true });

  assert.equal(packet.riskIndexes.anticoagulation.hasAnticoagulant, true);
  assert.equal(packet.riskIndexes.anticoagulation.hasDoac, true);
  assert.ok(packet.riskIndexes.anticoagulation.report !== null);
  assert.ok(packet.ehrNoteText.includes("Anticoagulation & Bleed Risk Evaluation"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("blood thinner") || cp.includes("unusual bleeding")));
  assert.ok(packet.ehrNoteText.includes("Emergency Reversal"));
});

test("buildClinicalPacket: evaluates valproate saturable binding, VHE, and L-carnitine antidote guidance", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["valproate", "topiramate"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { valproate: "500 mg BID" });

  assert.ok(packet.ehrNoteText.includes("Valproate Pharmacokinetics & Hyperammonemia Evaluation"));
  assert.ok(packet.ehrNoteText.includes("L-Carnitine"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("hyperammonemia") || cp.includes("sluggishness")));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("spina bifida") || cp.includes("birth defects")));
});

test("buildClinicalPacket: evaluates potassium homeostasis, perpetrators, binders, and shifting guidance", () => {
  const host = {
    ...DEFAULT_HOST,
    kidney: "ckd" as const,
  };
  const ids = ["lisinopril", "spironolactone", "tmp-smx", "patiromer"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { lisinopril: "20 mg daily", spironolactone: "25 mg daily" });

  assert.equal(packet.riskIndexes.potassium.hasPotassiumIssue, true);
  assert.equal(packet.riskIndexes.potassium.hasBinder, true);
  assert.ok(packet.riskIndexes.potassium.report !== null);
  assert.ok(packet.riskIndexes.potassium.perpetrators.length >= 3);
  assert.ok(packet.ehrNoteText.includes("Potassium Homeostasis & Cardioprotective Shifting"));
  assert.ok(packet.ehrNoteText.includes("Intracellular Shifting: See the Prescribing Information.") && !packet.ehrNoteText.includes("Regular Insulin"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("salt substitutes") || cp.includes("potassium chloride")));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("Patiromer") && cp.includes("3 hours")));
});

test("buildClinicalPacket: evaluates SGLT2 inhibitor perioperative hold and euDKA counseling", () => {
  const host = {
    ...DEFAULT_HOST,
    kidney: "ckd" as const,
  };
  const ids = ["empagliflozin", "furosemide", "lisinopril"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { empagliflozin: "25 mg daily" });

  assert.equal(packet.riskIndexes.sglt2.hasSglt2, true);
  assert.ok(packet.riskIndexes.sglt2.report !== null);
  assert.ok(packet.riskIndexes.sglt2.agents.some((a) => a.includes("Empagliflozin")));
  assert.ok(packet.ehrNoteText.includes("SGLT2 Inhibitor & Euglycemic DKA Evaluation"));
  assert.ok(packet.ehrNoteText.includes("Perioperative Rail"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("SGLT2") && cp.includes("surgery")));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("Euglycemic DKA") || cp.includes("blood sugar reading is completely normal")));
});

test("buildClinicalPacket: evaluates Tisdale QTc score, inpatient telemetry, and TdP resuscitation nomogram", () => {
  const host = {
    ...DEFAULT_HOST,
    age: "geriatric" as const,
  };
  const ids = ["methadone", "ondansetron", "furosemide"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, {}, { activeTdp: true });

  assert.ok(packet.riskIndexes.qt !== null);
  assert.ok(packet.riskIndexes.qt.tisdale !== undefined);
  assert.equal(packet.riskIndexes.qt.tisdale.factors.some((f) => f.id === "ageGeriatric" && f.present), true);
  assert.equal(packet.riskIndexes.qt.tisdale.factors.some((f) => f.id === "loopDiuretic" && f.present), true);
  assert.equal(packet.riskIndexes.qt.tisdale.factors.some((f) => f.id === "twoOrMoreQtDrugs" && f.present), true);
  assert.ok(packet.ehrNoteText.includes("Tisdale Inpatient QTc Risk"));
  assert.ok(packet.ehrNoteText.includes("Acute TdP Resuscitation Directive: Magnesium Sulfate (See the Prescribing Information)"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("fluttering in your chest") || cp.includes("racing heartbeat")));
});



test("buildClinicalPacket: the EHR note never pre-ticks a clinician attestation", () => {
  const ids = ["methadone", "alprazolam"];
  const packet = buildClinicalPacket(ids, DEFAULT_HOST, analyze(ids, DEFAULT_HOST).findings, {});
  assert.doesNotMatch(packet.ehrNoteText, /\[X\]/i);
  assert.equal(packet.ehrNoteText.match(/^\[ \] /gm)?.length, 5);
});

test("ClinicalPacketDialog: the attestation checklist opens unticked", () => {
  const ids = ["methadone", "alprazolam"];
  const html = renderToStaticMarkup(
    createElement(ClinicalPacketDialog, {
      open: true,
      onClose: () => {},
      selected: ids,
      host: DEFAULT_HOST,
      findings: analyze(ids, DEFAULT_HOST).findings,
    }),
  );
  assert.ok(html.includes("Clinical Verification &amp; Attestation"));
  assert.ok(html.includes('aria-pressed="false"'));
  assert.doesNotMatch(html, /aria-pressed="true"/);
});

test("buildClinicalPacket: an empty or unscored desk never reads as safe", () => {
  const ids = ["ondansetron"];
  const packet = buildClinicalPacket(ids, DEFAULT_HOST, [], {});
  assert.ok(packet.ehrNoteText.includes(EXPORT_EMPTY));
  assert.match(packet.ehrNoteText, /Anticholinergic Cognitive Burden: not scored\. .*not a computed zero/);
  assert.doesNotMatch(packet.ehrNoteText, /Burden: 0 |No additive QTc prolonging agents identified/);
});

test("buildClinicalPacket: printed findings carry a source and the note and handout say not a dose", () => {
  const ids = ["clarithromycin", "simvastatin", "methadone", "alprazolam"];
  const findings = analyze(ids, DEFAULT_HOST).findings;
  const packet = buildClinicalPacket(ids, DEFAULT_HOST, findings, {});
  const printed = findings.filter((f) => f.severity !== "minor");
  assert.ok(printed.length >= 2);
  assert.equal(packet.ehrNoteText.match(/^ {2}Source: /gm)?.length, printed.length);
  for (const f of printed) assert.ok(packet.ehrNoteText.includes(`  Source: ${findingSourceLine(f)}`), f.id);
  assert.ok(packet.ehrNoteText.includes(`${EXPORT_NOT_A_DOSE}\n${PI_FOOTER}`));
  assert.match(packet.patientHandoutText, /does not set or change any dose/);
  assert.match(packet.patientHandoutText, /Prescribing Information\) govern/);
});

test("ClinicalPacketDialog: the printed packet carries sources and the not-cleared / PI footer", () => {
  const ids = ["clarithromycin", "simvastatin"];
  const findings = analyze(ids, DEFAULT_HOST).findings;
  const html = renderToStaticMarkup(
    createElement(ClinicalPacketDialog, { open: true, onClose: () => {}, selected: ids, host: DEFAULT_HOST, findings }),
  );
  assert.ok(html.includes("Source: "));
  for (const s of [EXPORT_NOT_A_DOSE, NOT_CLEARED, PI_FOOTER]) assert.ok(html.includes(s.replace(/&/g, "&amp;")), s);
});

const DOAC_DESKS: [string[], typeof DEFAULT_HOST][] = [
  [["apixaban", "aspirin"], { ...DEFAULT_HOST, age: "geriatric", kidney: "ckd" }],
  [["rivaroxaban", "clarithromycin"], DEFAULT_HOST],
  [["dabigatran", "amiodarone"], { ...DEFAULT_HOST, kidney: "ckd" }],
  [["warfarin", "fluconazole"], DEFAULT_HOST],
  [["edoxaban"], DEFAULT_HOST],
];
const doseIn = (s: string) => new RegExp(DOSE_PATTERN.source).test(s);

test("withoutDose: keeps guidance sentences and replaces only the ones with a dose", () => {
  assert.equal(withoutDose("5 g IV administered as two consecutive 2.5 g / 50 mL IV infusions or boluses."), DOSE_PER_PI);
  assert.equal(withoutDose("Avoid use (CrCl <30 mL/min in acute VTE)"), "Avoid use (CrCl <30 mL/min in acute VTE)");
  assert.equal(
    withoutDose("Dose reduction indicated: Patient meets 2 of 3 criteria. Recommended dose is 2.5 mg PO BID."),
    `Dose reduction indicated: Patient meets 2 of 3 criteria. ${DOSE_PER_PI}`,
  );
});

test("buildClinicalPacket: reversal and TdP lines print only when the clinician marks bleeding or TdP", () => {
  const ids = ["apixaban", "methadone", "ondansetron"];
  const host = { ...DEFAULT_HOST, age: "geriatric" as const };
  const findings = analyze(ids, host).findings;
  const quiet = buildClinicalPacket(ids, host, findings, {});
  assert.doesNotMatch(quiet.ehrNoteText, /Emergency Reversal|Resuscitation Directive/);
  const marked = buildClinicalPacket(ids, host, findings, {}, { activeBleeding: true, activeTdp: true });
  assert.match(marked.ehrNoteText, /Emergency Reversal: Andexanet alfa \(Andexxa\) — No longer sold in the US/);
  assert.match(marked.ehrNoteText, /Acute TdP Resuscitation Directive/);
});

test("buildClinicalPacket: renal rails and reversal lines keep agent and status but never a computed dose", () => {
  for (const [ids, host] of DOAC_DESKS) {
    const p = buildClinicalPacket(ids, host, analyze(ids, host).findings, {}, { activeBleeding: true, activeTdp: true });
    const rails = p.ehrNoteText.split("\n").filter((l) => / Renal Rail: /.test(l));
    for (const l of rails) assert.match(l, /^ {2}\S.* Renal Rail: .+ \[[A-Z_-]+\]$/, l);
    // Only the static label line on which tablet strengths go with food may still name a strength.
    const dosed = p.ehrNoteText.split("\n").filter((l) => doseIn(l) && !/Administration Note:/.test(l));
    assert.deepEqual(dosed, [], ids.join("+"));
    assert.ok(p.ehrNoteText.includes("Emergency Reversal: "), ids.join("+"));
  }
});

test("ClinicalPacketDialog: bleeding and TdP marks start off and the printed card shows no computed dose", () => {
  for (const [ids, host] of DOAC_DESKS) {
    const html = renderToStaticMarkup(
      createElement(ClinicalPacketDialog, { open: true, onClose: () => {}, selected: ids, host, findings: analyze(ids, host).findings }),
    );
    assert.ok(html.includes("Active bleeding") && html.includes("Torsades de pointes (TdP)"));
    assert.doesNotMatch(html, /Emergency Reversal Pathway/);
    const text = html.replace(/<[^>]+>/g, "\n").split("\n").filter(doseIn);
    assert.deepEqual(text, [], ids.join("+"));
  }
});
