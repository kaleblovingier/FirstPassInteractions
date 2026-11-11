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
import { deriveTisdaleDefaults, evaluateTisdaleScore, type TisdaleResult } from "./qt-resus";
import { doacReportOnDesk, type DoacReport, type ReversalEvaluation } from "./doac";
import { potassiumReportOnDesk, potassiumOnDesk, type PotassiumEvaluation } from "./potassium";
import { sglt2ReportOnDesk, sglt2OnDesk, type Sglt2Report } from "./sglt2";
import { safetyOnDesk, type SafetyHit } from "./safety";
import { wardsOnDesk, type WardHit } from "./wards";
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
  SEVERITY_RANK,
  type Finding,
  type HostContext,
  type Severity,
} from "./types";
import { NOT_CLEARED, PI_FOOTER, SOFTWARE } from "../regulatory";
import { EXPORT_EMPTY, EXPORT_NOT_A_DOSE, findingSourceLine } from "./brief";
import { DOSE_PATTERN } from "../guards/dose-rule";

/** What the packet prints in place of a sentence that carries a computed dose. */
export const DOSE_PER_PI = "Dose per the Prescribing Information.";

/** Keeps the guidance sentences; any sentence with a milligram, unit or rate becomes DOSE_PER_PI. */
export function withoutDose(text: string): string {
  const dose = new RegExp(DOSE_PATTERN.source);
  const out = text.split(/(?<=\.)\s+/).map((s) => (dose.test(s) ? DOSE_PER_PI : s));
  return out.filter((s, i) => s !== DOSE_PER_PI || out[i - 1] !== DOSE_PER_PI).join(" ");
}

/** One reversal option for the note and the printed packet, with no dose. */
export function reversalLine(rev: ReversalEvaluation): string {
  const a = rev.specificAntidote;
  return a
    ? `${a.name} (${a.brand}) — ${withoutDose(a.regimen)}`
    : `${rev.nonSpecificAlternative.agent} — ${withoutDose(rev.nonSpecificAlternative.dosing)}`;
}

/** Situations only the clinician can mark; reversal and TdP lines print only when marked. */
export interface PacketMarks {
  activeBleeding?: boolean;
  activeTdp?: boolean;
}

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
  qt: (QtReport & { tisdale?: TisdaleResult }) | null;
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
  potassium: {
    hasPotassiumIssue: boolean;
    perpetratorCount: number;
    hasPerpetrator: boolean;
    hasBinder: boolean;
    perpetrators: string[];
    report: PotassiumEvaluation | null;
    summary: string | null;
  };
  sglt2: {
    hasSglt2: boolean;
    agents: string[];
    report: Sglt2Report | null;
    summary: string | null;
  };
}

export interface LabeledCollisionAlert {
  id: string;
  kind: "safety" | "ward";
  title: string;
  severity: Severity;
  tone: "danger" | "warn";
  mechanism: string;
  clinical: string;
  watch: string;
  source: string;
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
  labeledCollisions?: LabeledCollisionAlert[];
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

function toLabeledCollisionAlert(
  hit: SafetyHit | WardHit,
  kind: "safety" | "ward",
): LabeledCollisionAlert {
  return {
    id: hit.id,
    kind,
    title: hit.title,
    severity: hit.severity,
    tone: hit.tone,
    mechanism: hit.mechanism,
    clinical: hit.clinical,
    watch: hit.watch,
    source: hit.source,
  };
}

function collectLabeledCollisions(ids: string[]): LabeledCollisionAlert[] {
  const raw: LabeledCollisionAlert[] = [
    ...safetyOnDesk(ids).map((hit) => toLabeledCollisionAlert(hit, "safety")),
    ...wardsOnDesk(ids).map((hit) => toLabeledCollisionAlert(hit, "ward")),
  ];
  const seen = new Set<string>();
  const out: LabeledCollisionAlert[] = [];
  for (const item of raw) {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  out.sort((a, b) => {
    const sevDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sevDiff !== 0) return sevDiff;
    const toneDiff = (b.tone === "danger" ? 1 : 0) - (a.tone === "danger" ? 1 : 0);
    if (toneDiff !== 0) return toneDiff;
    const kindDiff = (b.kind === "safety" ? 1 : 0) - (a.kind === "safety" ? 1 : 0);
    if (kindDiff !== 0) return kindDiff;
    const titleDiff = a.title.localeCompare(b.title);
    if (titleDiff !== 0) return titleDiff;
    return a.id.localeCompare(b.id);
  });
  return out;
}

const LABELED_COUNSELING_BY_ID: Record<string, { topic: string; text: string }> = {
  "carbapenem-vpa": {
    topic: "carbapenem-valproate",
    text: "Carbapenem antibiotics can cause valproate levels to drop rapidly and trigger breakthrough seizures. Do not take these together without your prescriber's direction, never stop your seizure medicine on your own, and seek urgent medical care for any seizure activity.",
  },
  "valproate-carbapenem": {
    topic: "carbapenem-valproate",
    text: "Carbapenem antibiotics can cause valproate levels to drop rapidly and trigger breakthrough seizures. Do not take these together without your prescriber's direction, never stop your seizure medicine on your own, and seek urgent medical care for any seizure activity.",
  },
  "vanco-zosyn": {
    topic: "vanco-zosyn",
    text: "Receiving vancomycin together with piperacillin-tazobactam can place extra strain on your kidneys. Report decreased urination, leg or ankle swelling, unusual fatigue, or nausea to your care team right away.",
  },
  "arni-acei": {
    topic: "arni-acei",
    text: "Do not take sacubitril-valsartan (Entresto) together with an ACE inhibitor (such as lisinopril), as combining them can cause life-threatening swelling of the face, lips, tongue, or throat (angioedema). Confirm the required waiting period between stopping one and starting the other with your prescriber, and call 911 immediately for any facial swelling or trouble breathing.",
  },
  "capecitabine-warfarin": {
    topic: "capecitabine-warfarin",
    text: "Taking capecitabine or fluorouracil with warfarin can sharply increase blood-thinner activity and bleeding risk. Keep all scheduled INR blood checks, and seek medical care right away for unusual bruising, nosebleeds, or red or black stools.",
  },
  "warfarin-cyp2c9": {
    topic: "warfarin-cyp2c9",
    text: "Adding sulfamethoxazole-trimethoprim (Bactrim) or metronidazole to warfarin can make your blood too thin within days. Keep urgent INR blood-test checks, and seek immediate care for unusual bleeding, blood in urine or stool, severe headache, or large unexplained bruises.",
  },
  "cni-azole": {
    topic: "cni-clearance-surge",
    text: "Combining transplant medicines (such as tacrolimus, cyclosporine, or sirolimus) with strong enzyme-blocking antifungals, antibiotics, or antivirals can cause medicine levels to surge quickly. Do not start or stop either medicine without your transplant team's direction, keep all blood-level lab appointments, and report new tremors, severe headaches, vision changes, or decreased urination immediately.",
  },
  "cni-strong-3a4": {
    topic: "cni-clearance-surge",
    text: "Combining transplant medicines (such as tacrolimus, cyclosporine, or sirolimus) with strong enzyme-blocking antifungals, antibiotics, or antivirals can cause medicine levels to surge quickly. Do not start or stop either medicine without your transplant team's direction, keep all blood-level lab appointments, and report new tremors, severe headaches, vision changes, or decreased urination immediately.",
  },
  "linezolid-sero": {
    topic: "serotonin-toxicity",
    text: "Combining an MAOI medicine (including linezolid) with serotonergic antidepressants or pain medicines can trigger dangerous serotonin buildup. Never start or stop these together without specialist guidance and required waiting periods, and seek emergency care for high fever, confusion, heavy sweating, fast heartbeat, or muscle twitching or stiffness.",
  },
  "maoi-serotonergic": {
    topic: "serotonin-toxicity",
    text: "Combining an MAOI medicine (including linezolid) with serotonergic antidepressants or pain medicines can trigger dangerous serotonin buildup. Never start or stop these together without specialist guidance and required waiting periods, and seek emergency care for high fever, confusion, heavy sweating, fast heartbeat, or muscle twitching or stiffness.",
  },
  "sofosbuvir-amio": {
    topic: "sofosbuvir-amio",
    text: "Taking sofosbuvir-based hepatitis C treatment with amiodarone can cause dangerously slow heartbeats. Check with your prescriber before taking both, and seek emergency care for fainting, severe dizziness, shortness of breath, or chest discomfort.",
  },
  "clozapine-benzo": {
    topic: "clozapine-benzo",
    text: "Combining clozapine with a benzodiazepine carries a serious risk of extreme drowsiness, fainting, and dangerous breathing collapse. Contact your prescriber before taking them together, and seek emergency care for severe sleepiness, slow breathing, or trouble waking up.",
  },
  "lamotrigine-vpa": {
    topic: "lamotrigine-vpa",
    text: "Valproate slows how your body clears lamotrigine, raising the risk of serious skin reactions. Follow your prescriber's exact start schedule and seek urgent medical attention right away for any new skin rash, blisters, fever, or mouth sores.",
  },
  "tamoxifen-2d6": {
    topic: "tamoxifen-2d6",
    text: "Certain antidepressants and other medicines can block your body from activating tamoxifen, making it less effective. Check with your oncology prescriber or pharmacist before starting or stopping any prescription or over-the-counter medicine.",
  },
  "ocp-inducer": {
    topic: "ocp-inducer",
    text: "Enzyme-inducing medicines can speed up breakdown of hormonal birth control and cause it to fail. Ask your prescriber or pharmacist about reliable backup or alternative birth control while taking this combination.",
  },
  "isotretinoin-tetra": {
    topic: "isotretinoin-tetra",
    text: "Never take isotretinoin together with a tetracycline antibiotic (such as doxycycline or minocycline), as combining them can cause dangerous pressure around the brain. Seek immediate care for severe headaches, blurred or double vision, or ringing in the ears.",
  },
  "fq-steroid": {
    topic: "fq-steroid",
    text: "Taking a fluoroquinolone antibiotic together with a steroid raises the risk of painful tendon swelling or rupture, especially at the Achilles heel. Stop the antibiotic and contact your prescriber right away if you notice pain, swelling, or tenderness in any tendon, and rest the joint.",
  },
  "dual-raas": {
    topic: "dual-raas",
    text: "Combining two blood-pressure medicines that block the same kidney hormone pathway increases the risk of severe dizziness, kidney injury, and high potassium. Check with your prescriber to confirm whether both are intended, and report fainting, lightheadedness, or decreased urination right away.",
  },
  "ppi-acid": {
    topic: "ppi-acid",
    text: "Stomach acid reducers (proton pump inhibitors) can block absorption of certain HIV or antifungal medicines so they may stop working. Do not take over-the-counter heartburn pills without checking with your prescriber or pharmacist first.",
  },
  "pde5-nitrate": {
    topic: "pde5-nitrate",
    text: "Never take PDE5 medicines (for erectile dysfunction or pulmonary hypertension) together with nitroglycerin or other nitrate heart medicines, as the combination can cause a sudden, life-threatening drop in blood pressure. Seek emergency medical help for severe dizziness, fainting, or chest pain.",
  },
  "xo-thiopurine": {
    topic: "xo-thiopurine",
    text: "Combining gout medicines (allopurinol or febuxostat) with azathioprine or mercaptopurine can cause severe drops in blood counts. Do not take these together without direct specialist instructions, keep all blood-count checks, and report fever, sore throat, unusual bruising, or bleeding immediately.",
  },
  "mtx-tmpsmx": {
    topic: "mtx-tmpsmx",
    text: "Do not take Bactrim (TMP-SMX) together with methotrexate unless explicitly directed by your specialist, as this combination can cause dangerous drops in blood counts and painful mouth sores. Seek urgent medical attention for fever, chills, mouth ulcers, unusual bleeding, or widespread skin rash.",
  },
  "colchicine-inhibitor": {
    topic: "colchicine-inhibitor",
    text: "Combining colchicine with strong enzyme-blocking antibiotics or antifungals can cause dangerous colchicine buildup. Call your prescriber before taking them together, and seek urgent medical care for sudden severe diarrhea, vomiting, muscle pain or weakness, or numbness.",
  },
  "statin-strong-3a4": {
    topic: "statin-strong-3a4",
    text: "Taking simvastatin or lovastatin with strong enzyme-blocking antibiotics or antifungals can cause severe muscle breakdown and kidney injury. Check with your prescriber or pharmacist before taking both, and report unexplained muscle pain, tenderness, weakness, or dark brown urine right away.",
  },
  "mtx-nsaid": {
    topic: "mtx-nsaid",
    text: "NSAID pain relievers (such as ibuprofen or naproxen) can block methotrexate clearance and cause serious blood-count drops or kidney injury. Avoid NSAIDs unless your prescribing specialist specifically approves them, and report mouth sores, fever, dark stools, or unusual bruising right away.",
  },
  "lithium-renal-clearance": {
    topic: "lithium-renal-clearance",
    text: "Certain blood-pressure pills, water pills, and NSAID pain relievers (such as ibuprofen or naproxen) can raise lithium levels to toxic ranges. Check with your prescriber or pharmacist before starting or stopping pain or blood-pressure medicines, stay well hydrated, and report new hand shakiness, unsteadiness, slurred speech, confusion, or severe nausea right away.",
  },
  "digoxin-pgp": {
    topic: "digoxin-pgp",
    text: "Combining digoxin with certain heart-rhythm medicines or antibiotics can cause digoxin levels to climb. Keep scheduled lab and heart checks, and report nausea, vomiting, unusual fatigue, yellow-green vision halos, or a very slow or irregular heartbeat promptly.",
  },
  "doac-inducer": {
    topic: "doac-inducer",
    text: "Certain seizure medicines, rifampin, or St. John's wort can make your body clear blood thinners too fast, leaving you unprotected against blood clots or stroke. Do not start herbal products (especially St. John's wort) or change seizure medicines without telling your anticoagulation team, and seek emergency care for chest pain, sudden shortness of breath, leg swelling, or stroke symptoms.",
  },
  "theophylline-cyp1a2": {
    topic: "theophylline-cyp1a2",
    text: "Combining theophylline with ciprofloxacin or fluvoxamine can cause theophylline to build up to dangerous levels. Contact your prescriber before taking them together, and seek urgent medical care for persistent nausea or vomiting, rapid or pounding heartbeat, severe jitteriness, or seizures.",
  },
  "opioid-benzo": {
    topic: "opioid-benzo",
    text: "Combining opioids with benzodiazepines or other sedatives can cause life-threatening breathing slowdown and overdose. Never mix them without direct prescriber oversight, keep naloxone accessible at home, and call 911 for extreme drowsiness or slow breathing.",
  },
  "qt-hypokalemic-diuretic": {
    topic: "qt-hypokalemic-diuretic",
    text: "Water pills can lower potassium and magnesium and increase heart-rhythm risk when paired with QT-prolonging medicines. Keep all scheduled electrolyte blood checks, and seek prompt care for palpitations, dizziness, or fainting.",
  },
  "tizanidine-cyp1a2": {
    topic: "tizanidine-cyp1a2",
    text: "Never take tizanidine together with ciprofloxacin or fluvoxamine, as this combination can cause extreme drowsiness, dangerously low blood pressure, and fainting. Contact your prescriber or pharmacist right away to arrange an alternative medicine before taking both.",
  },
  "hyperkalemia-raas-k": {
    topic: "hyperkalemia-raas-k",
    text: "Combining medications that hold onto potassium can raise blood potassium to dangerous levels. Keep scheduled kidney and potassium lab checks, and seek urgent care for new muscle weakness, numbness or tingling, or an irregular heartbeat.",
  },
  "ergot-strong-3a4": {
    topic: "ergot-strong-3a4",
    text: "Never take ergotamine, dihydroergotamine, or methylergonovine together with strong enzyme-blocking antivirals, antibiotics, or antifungals (such as ritonavir, Paxlovid, clarithromycin, or itraconazole), as this can trigger dangerous blood-vessel spasms that cut off blood flow to your brain, heart, and limbs. Contact your prescriber before taking them together, and call 911 immediately for cold, pale, numb, or bluish fingers or toes, chest pain, severe stomach pain, or sudden stroke symptoms.",
  },
  "maoi-tyramine-sympathomimetic": {
    topic: "maoi-hypertensive-crisis",
    text: "Combining an MAOI medicine with decongestants (such as pseudoephedrine or phenylephrine), stimulants, or high-tyramine foods (such as aged cheeses, cured meats, or tap beer) can trigger a sudden, life-threatening spike in blood pressure. Avoid these decongestants, stimulants, and restricted foods during therapy and through the required waiting period afterward, never stop your MAOI abruptly without your prescriber's guidance, and call 911 immediately for a sudden severe headache at the back of your head, chest pain, shortness of breath, stiff neck, or heavy sweating.",
  },
  "amiodarone-warfarin": {
    topic: "amiodarone-warfarin",
    text: "Amiodarone slows how your body clears warfarin, which can make your blood too thin over several weeks and keep raising bleeding risk for months even after amiodarone is stopped. Never stop amiodarone or warfarin on your own without your heart or anticoagulation prescriber's direction, keep every scheduled INR blood test, and seek immediate care for unusual bleeding, red or black stools, pink or bloody urine, or a sudden severe headache.",
  },
  "isoniazid-acetaminophen": {
    topic: "isoniazid-acetaminophen",
    text: "Taking acetaminophen (Tylenol) while on isoniazid can stress your liver and cause serious liver injury, even at ordinary labeled amounts. Check labels on over-the-counter cold, flu, and pain medicines to avoid hidden acetaminophen unless your prescriber specifically approves it, never stop isoniazid without talking to your care team, and seek urgent medical care for yellowing of your skin or eyes, dark urine, upper right stomach pain, persistent nausea or vomiting, or unusual confusion.",
  },
  "ivabradine-cyp3a4-ndhp-ccb": {
    topic: "ivabradine-bradycardia",
    text: "Combining ivabradine with diltiazem, verapamil, or strong enzyme-blocking antibiotics, antifungals, or antivirals can cause ivabradine levels to build up and slow your heartbeat to dangerous levels. Contact your heart prescriber or pharmacist right away before taking them together—never stop your prescribed heart medicines abruptly on your own—and call 911 or seek emergency care for fainting, severe dizziness, shortness of breath, chest pain, or a very slow pulse.",
  },
  "phenytoin-cyp2c9-inhibition": {
    topic: "phenytoin-cyp2c9-inhibition",
    text: "Adding certain antifungals, antibiotics, heart-rhythm medicines, or antidepressants (such as fluconazole, voriconazole, Bactrim, metronidazole, amiodarone, or fluvoxamine) can cause phenytoin levels to spike sharply. Never stop taking phenytoin on your own—stopping suddenly can trigger severe seizures—keep all scheduled phenytoin blood-level checks, and seek urgent medical care for slurred speech, unsteady walking, double vision, extreme sleepiness, or confusion.",
  },
  "sulfonylurea-cyp2c9-hypoglycemia": {
    topic: "sulfonylurea-cyp2c9-hypoglycemia",
    text: "Taking Bactrim (TMP-SMX), fluconazole, or voriconazole with a sulfonylurea diabetes pill (such as glipizide, glyburide, or glimepiride) can cause dangerous, long-lasting drops in blood sugar during treatment and for days afterward. Contact your prescriber before taking both, check your blood sugar closely, and seek emergency care for confusion, slurred speech, shakiness, cold sweats, or passing out—low blood sugar from this pairing can return even after initial treatment.",
  },
  "dihydropyridine-ccb-macrolide-hypotension": {
    topic: "dhp-ccb-macrolide-hypotension",
    text: "Taking clarithromycin or erythromycin with calcium-channel-blocker blood pressure pills (such as amlodipine or nifedipine) can cause blood pressure medicine levels to build up and trigger dangerously low blood pressure and kidney strain. Check with your prescriber or pharmacist before taking both—never stop your blood pressure medicine on your own—and seek emergency care for severe dizziness, fainting, confusion, or noticeably decreased urination.",
  },
  "naltrexone-opioid-precipitated-overdose": {
    topic: "naltrexone-opioid",
    text: "Naltrexone blocks opioid effects: starting it while opioids are still in your body can trigger sudden, severe precipitated withdrawal (intense vomiting, diarrhea, agitation, or confusion), while taking large amounts of opioids to try to override that blockade—or taking prior amounts after stopping or missing naltrexone when tolerance has dropped—can cause sudden, fatal breathing arrest and overdose. Talk with your prescriber before taking these together, never try to break through naltrexone with extra opioids, and call 911 immediately for severe withdrawal, slow breathing, or trouble waking up.",
  },
};

function labeledCollisionCounseling(
  c: LabeledCollisionAlert,
  existingPoints: string[],
  hasOpioid: boolean,
  hasBenzo: boolean,
  seenTopics: Set<string>,
): string | null {
  if (c.severity !== "contraindicated" && c.tone !== "danger") return null;

  if (
    c.id === "opioid-benzo" &&
    ((hasOpioid && hasBenzo) || existingPoints.some((p) => /naloxone|sedatives/i.test(p)))
  ) {
    return null;
  }

  const mapped = LABELED_COUNSELING_BY_ID[c.id];
  if (mapped) {
    if (seenTopics.has(mapped.topic)) return null;
    seenTopics.add(mapped.topic);
    return withoutDose(mapped.text);
  }

  const topic = `${c.kind}:${c.id}`;
  if (seenTopics.has(topic)) return null;
  seenTopics.add(topic);

  const pairNames = withoutDose(c.title).replace(/ × /g, " and ");
  const watchClean = withoutDose(c.watch)
    .replace(/\s*The Prescribing Information governs\.?/gi, "")
    .replace(/\s*This desk (?:does not|is not) [^.]+\.?/gi, "")
    .trim();
  const watchTail = watchClean ? ` Watch for or review: ${watchClean}` : "";
  return withoutDose(
    `High-alert medication interaction (${pairNames}): check with your prescriber or pharmacist before taking these together.${watchTail}`,
  );
}

export function buildClinicalPacket(
  ids: string[],
  host: HostContext,
  findings: Finding[],
  doses: Record<string, string> = {},
  marks: PacketMarks = {},
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
      "CDC 2022: at ≥50 MME/day from all sources, add precautions including offering naloxone (Rec. 4 and 8); the 2022 guideline drops fixed upper thresholds. Note that transdermal fentanyl, buprenorphine, and illicit opioids cannot be directly modeled with standard linear oral conversion. Source: https://www.cdc.gov/mmwr/volumes/71/rr/rr7103a1.htm";
  }

  // 3b. Anticholinergic Cognitive Burden
  const acbReport = acbOnDesk(ids);

  // 3c. Cardiac QTc Repolarization & Tisdale Risk Model
  const rawQtRep = qtReport(ids, host);
  let qtRep: (QtReport & { tisdale?: TisdaleResult }) | null = null;
  if (rawQtRep) {
    const tisdaleInput = deriveTisdaleDefaults(ids, host);
    const tisdale = evaluateTisdaleScore(tisdaleInput);
    qtRep = {
      ...rawQtRep,
      tisdale,
    };
  }

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

  // 3g. Potassium Homeostasis & Cardioprotection
  const potDesk = potassiumOnDesk(ids);
  let potReport: PotassiumEvaluation | null = null;
  let potSummary: string | null = null;
  const hasPotassiumIssue = potDesk.hasPerpetrator || potDesk.hasBinder || potDesk.hasSupplement || potDesk.hasShiftAgent;
  if (hasPotassiumIssue) {
    potReport = potassiumReportOnDesk(ids, host);
    potSummary = `${potReport.headline}. ${potReport.perpetrators.length} potassium-retaining agent(s) on regimen (${potReport.perpetrators.map((p) => p.name).join(", ")}).`;
    if (potReport.activeBindersOnRegimen.length > 0) {
      potSummary += ` Active GI binder: ${potReport.activeBindersOnRegimen.join(", ")}.`;
    }
  }

  // 3h. SGLT2 Inhibitor Homeostasis & euDKA
  const sglt2Desk = sglt2OnDesk(ids);
  let sglt2Report: Sglt2Report | null = null;
  let sglt2Summary: string | null = null;
  if (sglt2Desk.hasSglt2) {
    sglt2Report = sglt2ReportOnDesk(ids, host);
    const names = sglt2Report.agentsOnDesk.map((a) => a.name).join(", ");
    sglt2Summary = `SGLT2 inhibitor therapy active (${names}). Pre-op surgical holds (3–4 days), euglycemic DKA vigilance (glucose < 250 mg/dL), and Fournier's safety rails evaluated.`;
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
    potassium: {
      hasPotassiumIssue,
      perpetratorCount: potDesk.perpetratorCount,
      hasPerpetrator: potDesk.hasPerpetrator,
      hasBinder: potDesk.hasBinder,
      perpetrators: potReport ? potReport.perpetrators.map((p) => p.name) : [],
      report: potReport,
      summary: potSummary,
    },
    sglt2: {
      hasSglt2: sglt2Desk.hasSglt2,
      agents: sglt2Report ? sglt2Report.agentsOnDesk.map((a) => a.name) : [],
      report: sglt2Report,
      summary: sglt2Summary,
    },
  };

  // 4. Collisions by severity + high-alert labeled & institutional safety collisions
  const collisions = {
    contraindicated: findings.filter((f) => f.severity === "contraindicated"),
    major: findings.filter((f) => f.severity === "major"),
    moderate: findings.filter((f) => f.severity === "moderate"),
    minor: findings.filter((f) => f.severity === "minor"),
  };
  const labeledCollisions = collectLabeledCollisions(ids);

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
        "Higher-strength rivaroxaban (Xarelto) tablets (See the Prescribing Information) must always be taken with food (with your evening meal). Taking it without food reduces drug absorption by one-third and leaves you vulnerable to clots.",
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
  if (ids.includes("valproate")) {
    counselingPoints.push(
      "Valproate (Depakote): Contact your care team immediately if you notice severe sluggishness, extreme sleepiness, or trembling hands. These can be signs of hyperammonemia (ammonia build-up), which can occur even if standard liver tests are normal.",
    );
    counselingPoints.push(
      "Never stop taking valproate suddenly without speaking to your doctor, as sudden discontinuation can trigger breakthrough seizures or psychiatric relapse.",
    );
    if (host.preg === "pregnant" || host.preg === "off") {
      counselingPoints.push(
        "Valproate carries an FDA boxed warning for severe birth defects (spina bifida) and permanent reductions in childhood IQ. Discuss effective contraception and alternative medications if you could become pregnant.",
      );
    }
  }
  if (potDesk.hasPerpetrator || potDesk.hasSupplement) {
    counselingPoints.push(
      "Avoid using salt substitutes containing potassium chloride (such as NoSalt or Nu-Salt) and check with your prescriber before taking potassium supplements, as combining them with your heart or kidney medications can lead to dangerous potassium spikes.",
    );
  }
  if (potDesk.hasBinder) {
    if (ids.includes("patiromer")) {
      counselingPoints.push(
        "Patiromer (Veltassa): Separate all your other oral medications by at least 3 hours before or 3 hours after taking patiromer, because it can bind other medications in your stomach and stop them from working.",
      );
    }
    if (ids.includes("sodium-zirconium-cyclosilicate")) {
      counselingPoints.push(
        "Sodium zirconium cyclosilicate (Lokelma): Take as directed with meals. Report any noticeable swelling in your feet or legs, as each dose contains a small amount of dietary sodium.",
      );
    }
  }
  if (sglt2Desk.hasSglt2) {
    counselingPoints.push(
      "SGLT2 Inhibitor Safety: If you are scheduled for any surgery or dental procedure, you must stop your SGLT2 medication at least 3 to 4 days beforehand. Do not restart it until you are eating and drinking normally and your surgical team clears you.",
    );
    counselingPoints.push(
      "Euglycemic DKA Warning: Contact your care team or emergency room immediately if you develop nausea, vomiting, shortness of breath, abdominal pain, or extreme fatigue — even if your home blood sugar reading is completely normal.",
    );
    counselingPoints.push(
      "Drink plenty of water daily to prevent dehydration and dizziness, and seek urgent medical evaluation for any severe pain, redness, or swelling in the groin or genital area.",
    );
  }
  const seenLabeledCounselingTopics = new Set<string>();
  for (const c of labeledCollisions) {
    const note = labeledCollisionCounseling(
      c,
      counselingPoints,
      hasOpioid,
      hasBenzo,
      seenLabeledCounselingTopics,
    );
    if (note) counselingPoints.push(note);
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
    ehrLines.push(`- Anticholinergic Cognitive Burden: not scored. No agent on this regimen is on the mapped ACB list; that is not a computed zero.`);
  }

  if (riskIndexes.qt && riskIndexes.qt.rows.length > 0) {
    ehrLines.push(
      `- Cardiac QTc Prolongation Burden: Score ${riskIndexes.qt.score} (${riskIndexes.qt.known} known-risk, ${riskIndexes.qt.possible} possible-risk)`,
      `  Agents: ${riskIndexes.qt.rows.map((r) => `${r.name} [${r.risk}]`).join(", ")}`,
      `  Clinical Watch: ${riskIndexes.qt.tell}`,
    );
    if (riskIndexes.qt.tisdale) {
      ehrLines.push(
        `  Tisdale Inpatient QTc Risk: Score ${riskIndexes.qt.tisdale.score}/21 (${riskIndexes.qt.tisdale.tierLabel.toUpperCase()}) — ${riskIndexes.qt.tisdale.predictedRiskPercentage}`,
        `  Telemetry Protocol: ${riskIndexes.qt.tisdale.telemetryRequirement} | Electrolyte Goals: K+ ${riskIndexes.qt.tisdale.electrolyteTargets.potassiumMeqL}, Mg2+ ${riskIndexes.qt.tisdale.electrolyteTargets.magnesiumMgDl}`,
      );
      if (marks.activeTdp) {
        ehrLines.push(
          `  Acute TdP Resuscitation Directive: Magnesium Sulfate (See the Prescribing Information) over 1–2 min (suppresses EADs regardless of baseline Mg) | Avoid Class Ia/III antiarrhythmics`,
        );
      }
    }
  } else {
    ehrLines.push(`- Cardiac QTc Prolongation Burden: no QTc-prolonging agent in the mapped set. Not proof of absent QT risk.`);
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
        `  Apixaban ABC Criteria: ${r.apixabanAbc.criteriaMetCount}/3 met (${r.apixabanAbc.reductionIndicated ? "Dose reduction indicated (See the Prescribing Information)" : "Standard dose maintained (See the Prescribing Information)"})`,
      );
    }
    for (const rail of r.renalRails) {
      ehrLines.push(`  ${rail.agentName} Renal Rail: ${withoutDose(rail.doseRecommendation)} [${rail.status.toUpperCase()}]`);
      if (rail.foodRequirement) ehrLines.push(`    Administration Note: ${rail.foodRequirement}`);
      if (rail.capsuleIntegrityWarning) ehrLines.push(`    Capsule Integrity: ${rail.capsuleIntegrityWarning}`);
    }
    if (marks.activeBleeding) {
      for (const rev of r.reversals) ehrLines.push(`  Emergency Reversal: ${reversalLine(rev)}`);
    }
  }

  if (ids.includes("valproate")) {
    ehrLines.push(
      `- Valproate Pharmacokinetics & Hyperammonemia Evaluation: Active agent on desk`,
      `  TDM & Albumin Binding: Target total (50–100 mcg/mL), free (5–15 mcg/mL). Saturable binding occurs >75–100 mcg/mL or in hypoalbuminemia.`,
      `  Hyperammonemic Encephalopathy (VHE): Metabolite block of NAGS produces severe encephalopathy with completely normal AST/ALT.`,
      `  Antidote Protocol: IV L-Carnitine (Levocarnitine) loading dose, then maintenance until ammonia resolves (See the Prescribing Information).`,
    );
  }

  if (riskIndexes.potassium.hasPotassiumIssue && riskIndexes.potassium.report) {
    const pr = riskIndexes.potassium.report;
    ehrLines.push(
      `- Potassium Homeostasis & Cardioprotective Shifting: ${pr.headline}`,
      `  Severity Tier: ${pr.severityTier.toUpperCase()} | Modeled Baseline: ${pr.potassiumMeqL.toFixed(1)} mEq/L (eGFR ${pr.egfrMlMin} mL/min)`,
    );
    if (pr.perpetrators.length > 0) {
      ehrLines.push(`  Active Perpetrators: ${pr.perpetrators.map((p) => `${p.name} [${p.category}]`).join(", ")}`);
    }
    if (pr.membraneStabilization.indicated) {
      ehrLines.push(`  Myocardial Membrane Stabilization: ${pr.membraneStabilization.primaryAgent.name}. See the Prescribing Information.`);
    }
    if (pr.intracellularShifting.indicated) {
      ehrLines.push("  Intracellular Shifting: See the Prescribing Information.");
    }
    if (pr.elimination.hemodialysis.emergentIndicated) {
      ehrLines.push(`  Definitive Elimination: Emergent Hemodialysis Indicated (${pr.elimination.hemodialysis.triggersPresent.join("; ")})`);
    } else if (pr.elimination.loopDiuretic.candidate) {
      ehrLines.push(`  Kaliuresis: ${withoutDose(pr.elimination.loopDiuretic.recommendedDose)}`);
    }
    if (pr.activeBindersOnRegimen.length > 0) {
      ehrLines.push(`  Active GI Binders: ${pr.activeBindersOnRegimen.join(", ")}`);
    }
  }

  if (riskIndexes.sglt2.hasSglt2 && riskIndexes.sglt2.report) {
    const sr = riskIndexes.sglt2.report;
    ehrLines.push(
      `- SGLT2 Inhibitor & Euglycemic DKA Evaluation: Active agents (${riskIndexes.sglt2.agents.join(", ")})`,
      `  Perioperative Rail: Hold at least ${sr.preopSchedule.map((s) => `${s.agentName} (>= ${s.recommendedHoldDays} days)`).join(", ")} prior to major surgery.`,
      `  Diagnostic Trap Alert: euDKA presents with blood glucose < 250 mg/dL with high anion gap metabolic acidosis & ketonemia; requires simultaneous IV dextrose + insulin resuscitation.`,
    );
    for (const rail of sr.renalRails) {
      ehrLines.push(`  Renal Indication Rail (${rail.agentName}): Glycemic [${rail.glycemicStatus.toUpperCase()}], Cardiorenal [${rail.cardiorenalStatus.toUpperCase()}] at eGFR ${rail.currentEgfr} mL/min.`);
    }
  }

  ehrLines.push(
    "",
    `==================================================================`,
    `4. PHARMACOLOGICAL COLLISION TRIAGE`,
    `==================================================================`,
  );

  if (findings.length === 0 && labeledCollisions.length === 0) {
    ehrLines.push(EXPORT_EMPTY);
  } else {
    if (labeledCollisions.length > 0) {
      ehrLines.push(`[HIGH-ALERT LABELED & INSTITUTIONAL SAFETY COLLISIONS]`);
      for (const c of labeledCollisions) {
        const severityTag = SEVERITY_LABEL[c.severity].toUpperCase();
        const kindTag = c.kind === "ward" ? "Institutional Safety Rail" : "Labeled Safety Collision";
        ehrLines.push(`• [${severityTag}] ${withoutDose(c.title)} (${kindTag})`);
        ehrLines.push(`  Mechanism: ${withoutDose(c.mechanism)}`);
        ehrLines.push(`  Bedside Watch: ${withoutDose(c.watch)}`);
        ehrLines.push(`  Official PI Source: ${withoutDose(c.source)}`);
      }
      ehrLines.push("");
    }
    if (collisions.contraindicated.length > 0) {
      ehrLines.push(`[CONTRAINDICATED / AVOID TOGETHER]`);
      for (const f of collisions.contraindicated) {
        ehrLines.push(`• ${f.headline}`);
        ehrLines.push(`  Mechanism: ${f.mechanism}`);
        ehrLines.push(`  Clinical Watch: ${f.clinical}`);
        ehrLines.push(`  Source: ${findingSourceLine(f)}`);
      }
      ehrLines.push("");
    }
    if (collisions.major.length > 0) {
      ehrLines.push(`[MAJOR / SERIOUS CONCERN]`);
      for (const f of collisions.major) {
        ehrLines.push(`• ${f.headline}`);
        ehrLines.push(`  Mechanism: ${f.mechanism}`);
        ehrLines.push(`  Clinical Watch: ${f.clinical}`);
        ehrLines.push(`  Source: ${findingSourceLine(f)}`);
      }
      ehrLines.push("");
    }
    if (collisions.moderate.length > 0) {
      ehrLines.push(`[MODERATE / USE CARE]`);
      for (const f of collisions.moderate) {
        ehrLines.push(`• ${f.headline} — ${f.clinical}`, `  Source: ${findingSourceLine(f)}`);
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
    `[ ] Active regimen reconciled with external pharmacy / clinical records`,
    `[ ] CYP450 pharmacokinetic and pharmacodynamic collisions evaluated`,
    `[ ] Organ clearance (renal/hepatic) dosing parameters reviewed`,
    `[ ] Multi-agent toxicity (ACB, QTc, Sedation, MME) evaluated`,
    `[ ] Patient counseling delivered & naloxone co-prescription offered/verified`,
    "",
    `Reviewed By: ___________________________________ [MD/DO/PharmD/NP/PA]`,
    `Date & Time: ___________________________________`,
    `Notes: _________________________________________________________________`,
    "",
    `------------------------------------------------------------------`,
    EXPORT_NOT_A_DOSE,
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
    `This guide does not set or change any dose. Your prescriber and the medicine's FDA-approved label (Prescribing Information) govern. ${SOFTWARE.name} ${SOFTWARE.version} is not FDA-cleared.`,
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
    labeledCollisions,
    counselingPoints,
    ehrNoteText,
    patientHandoutText,
  };
}
