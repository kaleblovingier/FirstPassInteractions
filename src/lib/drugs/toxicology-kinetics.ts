/**
 * Emergency Toxicology, Toxidrome Differentiation & Antidote Kinetics Reference Engine
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support (CDS) Architecture:
 * - Conforms to 21 U.S.C. § 360j(o)(1)(E) and FDA CDS Software Guidance (January 2026).
 * - Intended for licensed emergency medicine physicians, medical toxicologists, clinical pharmacists
 *   (PharmD / BCPS / DABAT), critical care specialists, and supervised health-professions trainees.
 * - Displays transparent physiological, biochemical, and pharmacokinetic rationales derived from
 *   canonical peer-reviewed emergency toxicology and pharmacology literature (Goldfrank's Toxicologic
 *   Emergencies, Rumack-Matthew, EXTRIP Workgroup Guidelines, Goodman & Gilman).
 * - Enables independent clinical verification of the scientific basis of all findings.
 * - DOES NOT generate automated medical orders, prescription directives, closed-loop infusion pump
 *   controls, or definitive treatment decisions.
 *
 * Core Toxicology Pillars:
 * 1. Acetaminophen (APAP) Overdose & N-Acetylcysteine (NAC) Kinetics:
 *    - Rumack-Matthew Nomogram modeling: Single acute ingestion between 4 and 24 hours. Conventional
 *      150 mcg/mL treatment line at 4 hours with line of toxicity (y = 150 * e^(-0.17325 * (t - 4))).
 *    - Reactive electrophile pathway: CYP2E1 converts APAP to toxic N-acetyl-p-benzoquinone imine (NAPQI).
 *      Depletion of hepatic glutathione below 30% baseline triggers covalent binding to hepatocyte
 *      mitochondrial proteins, causing centrilobular (Zone 3) necrosis.
 *    - High-risk modifiers: Chronic ethanol consumption (CYP2E1 induction) vs acute ethanol (competitive
 *      substrate inhibition protecting liver); fasting/malnutrition/cachexia (depleted baseline glutathione
 *      reserves); Isoniazid (CYP2E1 induction).
 *    - Four clinical phases of APAP toxicity: Phase I (0-24h, preclinical), Phase II (24-72h, hepatic injury
 *      onset with AST/ALT rise), Phase III (72-96h, peak hepatotoxicity, coagulopathy, jaundice, encephalopathy),
 *      Phase IV (4-14 days, recovery vs fatal liver failure).
 *    - IV NAC protocols: 21-hour 3-bag regimen (150 mg/kg over 1h, 50 mg/kg over 4h, 100 mg/kg over 16h)
 *      and simplified 2-bag regimen (200 mg/kg over 4h, 100 mg/kg over 16h). Anaphylactoid non-IgE histamine
 *      release management. Stopping criteria: APAP undetectable, AST/ALT normal or improving, INR < 2.0.
 * 2. Toxic Alcohols (Methanol & Ethylene Glycol) & Fomepizole / Hemodialysis Kinetics:
 *    - Serum osmolal gap calculation: Osmolal Gap = Measured Osmolality - [2*Na + Glucose/18 + BUN/2.8 + Ethanol/4.6].
 *      Normal <= 10 mOsm/kg. Gap trade-off kinetics (osmolal gap narrows as organic acid anion gap widens).
 *    - Methanol: Metabolized by ADH to formaldehyde, then by ALDH to Formic Acid. Formic acid inhibits
 *      mitochondrial cytochrome c oxidase -> retinal toxicity, optic disc hyperemia, snowfield blindness,
 *      putaminal hemorrhagic necrosis. Co-factor therapy: Leucovorin / Folinic acid 50 mg IV q4h
 *      (promotes tetrahydrofolate-dependent conversion of formic acid to CO2 and H2O).
 *    - Ethylene Glycol: ADH converts to glycolaldehyde, glycolic acid (major cause of severe metabolic acidosis),
 *      glyoxylic acid, and oxalic acid. Oxalic acid precipitates with ionized calcium to form calcium oxalate
 *      monohydrate crystals in renal tubules -> acute kidney injury, profound hypocalcemia, QTc prolongation.
 *      Co-factor therapy: Thiamine 100 mg IV + Pyridoxine (Vitamin B6) 50 mg IV q6h (shunts glyoxylate into
 *      alpha-hydroxy-beta-ketoadipate and glycine).
 *    - Fomepizole (4-methylpyrazole): Potent competitive ADH inhibitor (Ki ~ 0.1 uM, 8,000-fold higher affinity
 *      for ADH than ethanol). Dosing protocol: Loading dose 15 mg/kg IV, then 10 mg/kg IV q12h x 4 doses,
 *      then 15 mg/kg IV q12h (due to CYP auto-induction). Hemodialysis indications: severe acidemia pH < 7.25,
 *      serum methanol or ethylene glycol >= 50 mg/dL, visual impairment, acute renal failure.
 * 3. Salicylate (Aspirin) Overdose & Urinary Alkalinization Ion-Trapping:
 *    - Dual acid-base disturbance: Direct stimulation of medullary respiratory center -> hyperventilation
 *      and respiratory alkalosis; uncoupling of oxidative phosphorylation in mitochondria -> accumulation
 *      of lactate, pyruvate, and ketoacids -> high anion gap metabolic acidosis.
 *    - Urinary Alkalinization Ion-Trapping kinetics: Aspirin is a weak acid with pKa 3.5. In acidic urine
 *      (pH 5.0-6.0), salicylic acid is un-ionized and readily reabsorbed across renal tubular epithelium.
 *      Alkalinizing urine to pH 7.5-8.0 via IV Sodium Bicarbonate converts salicylic acid to ionized salicylate (A-),
 *      trapping it in the tubular lumen and escalating renal clearance by up to 20-fold!
 *    - Mandatory Potassium Replacement Rule: Hypokalemia causes renal H+/K+ ATPase to excrete H+ into the urine
 *      in an attempt to retain potassium, creating paradoxical aciduria despite systemic alkalemia. Potassium
 *      must be aggressively repleted (target K >= 4.0-4.5 mEq/L) to achieve alkalinuria.
 *    - Emergent hemodialysis criteria: Salicylate level > 100 mg/dL (acute) or > 60 mg/dL (chronic), altered
 *      mental status, cerebral edema, non-cardiogenic pulmonary edema, refractory acidosis.
 * 4. Opioid Overdose & Naloxone Titration:
 *    - Pure competitive mu-opioid receptor antagonist (Ki ~ 1-2 nM).
 *    - Half-life mismatch & Renarcotization risk: Naloxone half-life is 30-90 minutes. Long-acting opioids
 *      (Methadone t1/2 24-36h, ER oxycodone/morphine) or lipophilic synthetic opioids (fentanyl storage in
 *      adipose tissue) persist long after naloxone clears, causing recurrent fatal respiratory arrest.
 *      Continuous naloxone infusion protocol (2/3 of successful initial bolus dose per hour).
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

/**
 * Statutory Non-Device Clinical Decision Support disclaimer under FD&C Act § 520(o)(1)(E).
 */
export const TOXICOLOGY_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational emergency toxicology and antidote kinetics reference engine is intended solely for licensed healthcare professionals and supervised health-professions trainees. It models pharmacokinetic and toxicokinetic principles, biochemical pathways, nomograms, Henderson-Hasselbalch ion-trapping, and receptor binding to enable independent verification of clinical rationale in toxicologic emergencies. It does not provide automated diagnostic conclusions, does not generate infusion orders, prescription directives, or hemodialysis commands, and does not replace individualized bedside clinical evaluation, poison center consultation, or the FDA-approved Prescribing Information.";

export const TOXICOLOGY_CITATIONS: readonly string[] = [
  "Rumack BH, Matthew H. Acetaminophen poisoning and toxicity. Pediatrics. 1975;55(6):871-876.",
  "Smilkstein MJ, Knapp GL, Kulig KW, Rumack BH. Efficacy of oral N-acetylcysteine in the treatment of acetaminophen overdose. Analysis of the national multicenter study (1976 to 1985). N Engl J Med. 1988;319(24):1557-1562.",
  "Dart RC, Erdman AR, Olson KR, et al. Acetaminophen poisoning: an evidence-based consensus guideline for out-of-hospital management. Clin Toxicol (Phila). 2006;44(1):1-18.",
  "Roberts DM, Yates C, Megarbane B, et al. Recommendations for the role of extracorporeal treatments in the management of acute methanol poisoning: a systematic review and consensus statements. Crit Care Med. 2015;43(2):461-472.",
  "Brent J. Fomepizole for ethylene glycol and methanol poisoning. N Engl J Med. 2009;360(21):2216-2223.",
  "Juurlink DN, Gosselin S, Kielstein JT, et al. Extracorporeal Treatment for Ethylene Glycol Poisoning: Systematic Review and Recommendations from the EXTRIP Workgroup. Crit Care Med. 2016;44(6):1203-1215.",
  "Juurlink DN, Gosselin S, Kielstein JT, et al. Extracorporeal Treatment for Salicylate Poisoning: Systematic Review and Recommendations From the EXTRIP Workgroup. Ann Emerg Med. 2015;66(2):165-181.",
  "Chyka PA, Erdman AR, Christianson G, et al. Salicylate poisoning: an evidence-based consensus guideline for out-of-hospital management. Clin Toxicol (Phila). 2007;45(2):95-131.",
  "Boyer EW. Management of opioid analgesic overdose. N Engl J Med. 2012;367(2):146-155.",
  "Nelson LS, Howland MA, Lewin NA, Smith SW, Goldfrank LR, Hoffman RS. Goldfrank's Toxicologic Emergencies. 11th ed. McGraw-Hill Education; 2019.",
];

// ============================================================================
// 1. ACETAMINOPHEN (APAP) OVERDOSE & N-ACETYLCYSTEINE (NAC) KINETICS
// ============================================================================

export type ApapNomogramBand =
  | "too-early"
  | "below-treatment"
  | "above-treatment"
  | "high-risk"
  | "late-presentation";

export interface RumackNomogramInput {
  hoursPostIngestion: number;
  serumApapMcgMl: number;
  chronicAlcoholOrInducer?: boolean;
  acuteAlcoholCoIngestion?: boolean;
  malnutritionOrFasting?: boolean;
  isoniazidCoIngestion?: boolean;
}

export interface RumackNomogramResult {
  hoursPostIngestion: number;
  serumApapMcgMl: number;
  treatmentLineMcgMl: number | null;
  highRiskLineMcgMl: number | null;
  band: ApapNomogramBand;
  label: string;
  nacIndicated: boolean;
  nacUrgency: string;
  riskModifiers: string[];
  clinicalGuidance: string;
  toxicologyPearl: string;
  formulaUsed: string;
}

export interface ApapClinicalPhase {
  phase: "Phase I" | "Phase II" | "Phase III" | "Phase IV";
  timing: string;
  clinicalName: string;
  pathophysiology: string;
  symptoms: string[];
  laboratoryFindings: string[];
  managementFocus: string;
}

export const APAP_CLINICAL_PHASES: Record<string, ApapClinicalPhase> = {
  phase1: {
    phase: "Phase I",
    timing: "0 to 24 hours post-ingestion",
    clinicalName: "Preclinical / Gastrointestinal Quiescence Phase",
    pathophysiology:
      "Hepatic glutathione reserves are progressively depleted as CYP2E1 oxidizes APAP to NAPQI. Glucuronidation and sulfation pathways saturate. Hepatocyte mitochondrial injury is initiating, but cellular lysis has not yet released systemic intracellular enzymes.",
    symptoms: [
      "Often entirely asymptomatic initially",
      "Anorexia, nausea, vomiting, malaise",
      "Diaphoresis, pallor, mild lethargy",
    ],
    laboratoryFindings: [
      "Serum AST and ALT are normal (< 40-50 U/L)",
      "Bilirubin and PT/INR are normal",
      "Serum APAP level is elevated and plottable on Rumack-Matthew nomogram between 4 and 24 hours",
    ],
    managementFocus:
      "Prompt initiation of N-Acetylcysteine (NAC) within 8 hours of ingestion prevents hepatotoxicity virtually 100% of the time by replenishing cysteine for glutathione synthesis.",
  },
  phase2: {
    phase: "Phase II",
    timing: "24 to 72 hours post-ingestion",
    clinicalName: "Hepatic Injury Onset / Subclinical Transaminitis Phase",
    pathophysiology:
      "Glutathione reserves drop below critical 30% baseline. Free electrophilic NAPQI covalently binds cysteinyl sulfhydryl groups on hepatocyte mitochondrial proteins, triggering mitochondrial permeability transition pore (mPTP) opening, ATP exhaustion, and centrilobular (Zone 3) coagulative necrosis.",
    symptoms: [
      "Initial nausea and vomiting may deceptively improve or resolve ('false recovery')",
      "Right upper quadrant (RUQ) abdominal pain and liver tenderness",
      "Hepatomegaly, oliguria, tachycardia",
    ],
    laboratoryFindings: [
      "Serum AST and ALT begin steep elevation (AST typically rises first and rapidly exceeds 1,000 U/L)",
      "PT/INR begins gradual prolongation",
      "Total bilirubin may begin rising",
      "BUN/Creatinine may elevate (nephrotoxicity from local renal CYP2E1 NAPQI formation in ~10-25% of severe cases)",
    ],
    managementFocus:
      "Continue IV NAC without interruption. Monitor transaminases and coagulation profile every 12 hours. Do not discontinue NAC based on arbitrary time limits if transaminases are climbing.",
  },
  phase3: {
    phase: "Phase III",
    timing: "72 to 96 hours post-ingestion",
    clinicalName: "Peak Hepatotoxicity & Fulminant Hepatic Failure Phase",
    pathophysiology:
      "Maximum centrilobular (Zone 3) necrosis. Widespread hepatocyte apoptosis and necrosis lead to severe loss of synthetic capacity, impaired ammonia detoxification, microvascular collapse, and systemic inflammatory response syndrome (SIRS).",
    symptoms: [
      "Jaundice, scleral icterus",
      "Hepatic encephalopathy (asterixis, confusion, delirium, coma, cerebral edema)",
      "Bleeding diathesis (ecchymoses, mucosal hemorrhage)",
      "Severe oliguria / anuria from hepatorenal syndrome or direct tubular necrosis",
    ],
    laboratoryFindings: [
      "Extreme transaminitis: AST and ALT peak, frequently exceeding 10,000 to 20,000 U/L (AST > ALT is typical)",
      "Severe coagulopathy: INR > 2.0 to > 6.0+",
      "Hyperbilirubinemia: Total bilirubin > 4.0-10.0 mg/dL",
      "Severe lactic acidosis (arterial lactate > 3.5 mmol/L post-resuscitation)",
      "Hypoglycemia (impaired gluconeogenesis and glycogenolysis)",
      "Marked elevation in serum creatinine",
    ],
    managementFocus:
      "King's College Criteria evaluation for emergent orthotopic liver transplantation. Aggressive critical care support: IV NAC infusion, airway protection for Grade III/IV encephalopathy, hypertonic saline for cerebral edema, hemodialysis for renal failure.",
  },
  phase4: {
    phase: "Phase IV",
    timing: "4 to 14 days (up to 3 weeks) post-ingestion",
    clinicalName: "Resolution & Hepatic Regeneration vs. Fatal Multi-Organ Failure",
    pathophysiology:
      "In survivors, surviving hepatocytes and progenitor oval cells undergo vigorous mitotic proliferation. Unlike chronic hepatitis or cirrhosis, APAP causes acute coagulative necrosis without architectural distortion of reticulin framework, enabling complete histological recovery without fibrosis. Non-survivors succumb to brainstem herniation from cerebral edema, septic shock, or multiorgan failure.",
    symptoms: [
      "Resolution of jaundice and encephalopathy in recovering patients",
      "Gradual recovery of appetite and clinical vigor",
    ],
    laboratoryFindings: [
      "AST and ALT decline by ~50% every 24-48 hours toward normal",
      "INR rapidly normalizes before bilirubin (due to short half-life of Factor VII)",
      "Serum bilirubin and renal function gradually return to baseline over 1-3 weeks",
    ],
    managementFocus:
      "Stop NAC once APAP is undetectable, transaminases are clearly down-trending, and INR is < 2.0. Long-term liver architecture is preserved without chronic liver disease in survivors.",
  },
};

/**
 * Calculates the conventional 150 mcg/mL treatment threshold line at hours post-ingestion (4 to 24 hours).
 * Standard toxicity equation: y = 150 * e^(-0.17325 * (t - 4))
 * Half-life elimination constant: k = ln(2)/4 = 0.17328679... (rounded to 0.17325 in canonical nomograms).
 */
export function calculateRumackTreatmentLine(hours: number): number | null {
  if (!Number.isFinite(hours) || hours < 4 || hours > 24) {
    return null;
  }
  const threshold = 150 * Math.exp(-0.17325 * (hours - 4));
  return Math.round(threshold * 10) / 10;
}

/**
 * Calculates the high-risk 300 mcg/mL threshold line at hours post-ingestion (4 to 24 hours).
 * Standard equation: y = 300 * e^(-0.17325 * (t - 4))
 */
export function calculateRumackHighRiskLine(hours: number): number | null {
  if (!Number.isFinite(hours) || hours < 4 || hours > 24) {
    return null;
  }
  const threshold = 300 * Math.exp(-0.17325 * (hours - 4));
  return Math.round(threshold * 10) / 10;
}

/**
 * Comprehensive Rumack-Matthew Nomogram evaluator with high-risk modifier adjustment.
 */
export function evaluateRumackMatthewNomogram(input: RumackNomogramInput): RumackNomogramResult {
  const {
    hoursPostIngestion,
    serumApapMcgMl,
    chronicAlcoholOrInducer = false,
    acuteAlcoholCoIngestion = false,
    malnutritionOrFasting = false,
    isoniazidCoIngestion = false,
  } = input;

  const riskModifiers: string[] = [];

  if (chronicAlcoholOrInducer) {
    riskModifiers.push(
      "Chronic ethanol consumption induces hepatic CYP2E1 expression, accelerating the oxidation of APAP to NAPQI. Concomitant baseline glutathione reserves are frequently reduced.",
    );
  }
  if (acuteAlcoholCoIngestion) {
    riskModifiers.push(
      "Acute ethanol co-ingestion acts as a competitive substrate inhibitor of CYP2E1 (low Ki), transiently suppressing NAPQI production while circulating ethanol is present. However, delayed toxicity may emerge once ethanol metabolizes.",
    );
  }
  if (malnutritionOrFasting) {
    riskModifiers.push(
      "Prolonged fasting, cachexia, or anorexia depletes baseline hepatic glutathione stores below normal reserves, lowering the threshold for covalent mitochondrial protein binding.",
    );
  }
  if (isoniazidCoIngestion) {
    riskModifiers.push(
      "Isoniazid is a potent inducer of CYP2E1, substantially increasing the percentage of APAP shunted into the reactive electrophile NAPQI pathway.",
    );
  }

  // Pre-Nomogram Phase (< 4 hours)
  if (hoursPostIngestion < 4) {
    const isMassive = serumApapMcgMl > 300;
    return {
      hoursPostIngestion,
      serumApapMcgMl,
      treatmentLineMcgMl: null,
      highRiskLineMcgMl: null,
      band: "too-early",
      label: "Pre-Nomogram Absorption Phase (< 4h post-ingestion)",
      nacIndicated: isMassive,
      nacUrgency: isMassive
        ? "Initiate IV NAC immediately without waiting for 4-hour redraw due to overwhelming early level (> 300 mcg/mL)."
        : "Hold routine NAC; redraw serum APAP precisely at 4 hours post-ingestion for definitive nomogram plotting.",
      riskModifiers,
      clinicalGuidance:
        "Levels drawn earlier than 4 hours post-ingestion cannot be interpreted on the Rumack-Matthew nomogram because gastric absorption and hepatic distribution are ongoing. A repeat level at 4 hours establishes peak exposure.",
      toxicologyPearl:
        "If ingestion occurred within 1–2 hours and patient is alert with an intact airway, consider activated charcoal 1 g/kg (up to 50 g) to bind unabsorbed drug.",
      formulaUsed: "N/A (< 4h post-ingestion)",
    };
  }

  // Late Presentation Phase (> 24 hours)
  if (hoursPostIngestion > 24) {
    const isDetectable = serumApapMcgMl > 5;
    return {
      hoursPostIngestion,
      serumApapMcgMl,
      treatmentLineMcgMl: null,
      highRiskLineMcgMl: null,
      band: "late-presentation",
      label: "Late Presentation Phase (> 24h post-ingestion)",
      nacIndicated: true,
      nacUrgency:
        "Immediate NAC initiation recommended regardless of level if APAP is detectable or transaminases are elevated.",
      riskModifiers,
      clinicalGuidance:
        "The Rumack-Matthew nomogram is valid only between 4 and 24 hours. Patients presenting > 24 hours post-ingestion with detectable APAP, transaminitis, or clinical symptoms require immediate full-course NAC.",
      toxicologyPearl:
        "Even in late fulminant hepatic failure (Phase III), NAC provides life-saving microvascular and antioxidant benefits by improving oxygen delivery and scavenging reactive nitrogen species.",
      formulaUsed: "Nomogram invalid beyond 24 hours",
    };
  }

  // Standard Nomogram Window (4 to 24 hours)
  const treatmentLine = calculateRumackTreatmentLine(hoursPostIngestion)!;
  const highRiskLine = calculateRumackHighRiskLine(hoursPostIngestion)!;

  let band: ApapNomogramBand;
  let label: string;
  let nacIndicated: boolean;
  let nacUrgency: string;

  if (serumApapMcgMl >= highRiskLine) {
    band = "high-risk";
    label = `High-Risk Toxicity Band (${serumApapMcgMl} >= ${highRiskLine} mcg/mL high-risk line)`;
    nacIndicated = true;
    nacUrgency = "EMERGENT: Immediate NAC infusion required. High probability of severe centrilobular hepatic necrosis.";
  } else if (serumApapMcgMl >= treatmentLine) {
    band = "above-treatment";
    label = `Probable Toxicity / Treatment Indicated (${serumApapMcgMl} >= ${treatmentLine} mcg/mL 150-line)`;
    nacIndicated = true;
    nacUrgency = "URGENT: Initiate IV NAC infusion immediately. Toxic exposure crosses the 150 mcg/mL treatment line.";
  } else {
    // If high-risk modifiers exist and level is within 10% of treatment line, consider lowered threshold
    const isBorderline = serumApapMcgMl >= treatmentLine * 0.9;
    const hasModifier = chronicAlcoholOrInducer || malnutritionOrFasting || isoniazidCoIngestion;
    if (isBorderline && hasModifier) {
      band = "above-treatment";
      label = `Borderline with High-Risk Modifiers (${serumApapMcgMl} mcg/mL near ${treatmentLine} mcg/mL threshold with CYP2E1 induction/GSH depletion)`;
      nacIndicated = true;
      nacUrgency =
        "PRUDENT NAC INDICATION: Baseline glutathione depletion or CYP2E1 induction lowers the threshold for hepatotoxicity.";
    } else {
      band = "below-treatment";
      label = `Below Nomogram Treatment Line (${serumApapMcgMl} < ${treatmentLine} mcg/mL threshold)`;
      nacIndicated = false;
      nacUrgency = "NAC not indicated for single acute ingestion if history and timing are reliable.";
    }
  }

  return {
    hoursPostIngestion,
    serumApapMcgMl,
    treatmentLineMcgMl: treatmentLine,
    highRiskLineMcgMl: highRiskLine,
    band,
    label,
    nacIndicated,
    nacUrgency,
    riskModifiers,
    clinicalGuidance: nacIndicated
      ? `Serum APAP level of ${serumApapMcgMl} mcg/mL at ${hoursPostIngestion} hours exceeds the conventional 150 mcg/mL treatment line (${treatmentLine} mcg/mL). Full IV NAC therapy is indicated to restore hepatic glutathione reserves.`
      : `Serum APAP level of ${serumApapMcgMl} mcg/mL at ${hoursPostIngestion} hours is below the 150 mcg/mL treatment line (${treatmentLine} mcg/mL). In the absence of repeated supratherapeutic ingestions or uncertain timing, NAC is not required.`,
    toxicologyPearl:
      "When the exact time of ingestion is unknown or ingestion occurred over > 8 hours (staggered ingestion), the Rumack-Matthew nomogram cannot be used. Treat empirically with NAC if APAP > 10-20 mcg/mL or AST/ALT is elevated.",
    formulaUsed: `y = 150 * e^(-0.17325 * (${hoursPostIngestion} - 4)) = ${treatmentLine} mcg/mL`,
  };
}

export interface NacRegimenProtocol {
  name: string;
  totalDurationHours: number;
  totalDoseMgKg: number;
  bags: Array<{
    bagNumber: number;
    doseMgKg: number;
    infusionDurationHours: number;
    infusionRateDescription: string;
    diluentVolumeMl: string;
  }>;
  benefits: string[];
}

export const NAC_IV_REGIMENS: Record<"threeBag21h" | "twoBag20h", NacRegimenProtocol> = {
  threeBag21h: {
    name: "Conventional 21-Hour 3-Bag IV NAC Regimen (Prescott / Smilkstein)",
    totalDurationHours: 21,
    totalDoseMgKg: 300,
    bags: [
      {
        bagNumber: 1,
        doseMgKg: 150,
        infusionDurationHours: 1,
        infusionRateDescription: "Loading dose: 150 mg/kg infused over 60 minutes",
        diluentVolumeMl: "200 mL D5W (or 0.45% NaCl)",
      },
      {
        bagNumber: 2,
        doseMgKg: 50,
        infusionDurationHours: 4,
        infusionRateDescription: "Second dose: 50 mg/kg infused over 4 hours (12.5 mg/kg/h)",
        diluentVolumeMl: "500 mL D5W",
      },
      {
        bagNumber: 3,
        doseMgKg: 100,
        infusionDurationHours: 16,
        infusionRateDescription: "Maintenance dose: 100 mg/kg infused over 16 hours (6.25 mg/kg/h)",
        diluentVolumeMl: "1000 mL D5W",
      },
    ],
    benefits: [
      "Extensively studied and validated in international multicenter trials",
      "Standard of care historically across US poison centers",
    ],
  },
  twoBag20h: {
    name: "Simplified 20-Hour 2-Bag IV NAC Regimen (Australian / Updated Consensus)",
    totalDurationHours: 20,
    totalDoseMgKg: 300,
    bags: [
      {
        bagNumber: 1,
        doseMgKg: 200,
        infusionDurationHours: 4,
        infusionRateDescription: "Loading dose: 200 mg/kg infused over 4 hours (50 mg/kg/h)",
        diluentVolumeMl: "500 mL D5W",
      },
      {
        bagNumber: 2,
        doseMgKg: 100,
        infusionDurationHours: 16,
        infusionRateDescription: "Maintenance dose: 100 mg/kg infused over 16 hours (6.25 mg/kg/h)",
        diluentVolumeMl: "1000 mL D5W",
      },
    ],
    benefits: [
      "Significantly reduces non-IgE anaphylactoid reactions by eliminating the rapid 1-hour peak bolus",
      "Reduces nurse compounding errors and bag-switching delays by eliminating Bag 2 transition",
      "Equal efficacy in preventing hepatotoxicity compared to 3-bag regimen",
    ],
  },
};

export interface NacAnaphylactoidManagement {
  pathophysiology: string;
  isIgEMediated: boolean;
  incidence: string;
  clinicalSigns: string[];
  steppedManagement: string[];
}

export const NAC_ANAPHYLACTOID_MANAGEMENT: NacAnaphylactoidManagement = {
  pathophysiology:
    "Non-immune (non-IgE) pseudoallergic anaphylactoid reaction driven by direct, concentration-dependent mast cell and basophil degranulation with histamine release during the rapid initial loading infusion. It is NOT a true type I IgE-mediated allergy.",
  isIgEMediated: false,
  incidence: "Occurs in approximately 10–20% of patients receiving rapid IV NAC loading (Bag 1).",
  clinicalSigns: [
    "Flushing and erythema of face/neck/torso (most common)",
    "Pruritus, urticaria, angioedema",
    "Nausea, vomiting",
    "Transient bronchospasm, dyspnea, wheezing",
    "Mild transient hypotension (rarely profound cardiovascular collapse)",
  ],
  steppedManagement: [
    "1. Temporarily pause or hold the IV NAC infusion immediately.",
    "2. Administer IV H1-antihistamine (e.g., Diphenhydramine 25–50 mg IV) +/- IV H2-antagonist (e.g., Famotidine 20 mg IV).",
    "3. For bronchospasm or wheezing, administer nebulized Albuterol. Corticosteroids (e.g., Methylprednisolone 60 mg IV) can be added for persistent urticaria.",
    "4. Reserve IM Epinephrine (0.3 mg 1:1000 IM) exclusively for severe airway compromise, stridor, or refractory hypotension.",
    "5. ONCE SYMPTOMS RESOLVE: RESTART IV NAC at a reduced infusion rate (e.g., 50% rate or diluted in double fluid volume). DO NOT PERMANENTLY ABANDON NAC because untreated APAP poisoning is fatal!",
  ],
};

export interface NacStoppingCriteria {
  criteria: string[];
  rationale: string;
  actionIfCriteriaNotMet: string;
}

export const NAC_STOPPING_CRITERIA: NacStoppingCriteria = {
  criteria: [
    "Serum APAP is undetectable (< 10 mcg/mL or below assay detection limit)",
    "Serum AST and ALT are normal, or if elevated, documented to be consistently declining (down-trending)",
    "INR is < 2.0 (and prothrombin time is normal or consistently improving)",
    "Patient is clinically stable without hepatic encephalopathy",
  ],
  rationale:
    "Arbitrary completion of 20 or 21 hours of NAC without verifying APAP clearance and resolving transaminitis can lead to delayed catastrophic liver failure in massive or extended-release ingestions.",
  actionIfCriteriaNotMet:
    "If stopping criteria are not met at the end of the standard protocol, continue maintenance IV NAC (Bag 3 / Bag 2 at 100 mg/kg over 16h or continuous infusion of 6.25 mg/kg/h) and recheck labs every 12 hours until all stopping criteria are fulfilled.",
};

// ============================================================================
// 2. TOXIC ALCOHOLS & FOMEPIZOLE / HEMODIALYSIS KINETICS
// ============================================================================

export interface OsmolalGapInput {
  measuredOsmolality: number;
  sodiumMeqL: number;
  glucoseMgDl: number;
  bunMgDl: number;
  ethanolMgDl?: number;
}

export interface OsmolalGapResult {
  measuredOsmolality: number;
  calculatedOsmolality: number;
  osmolalGap: number;
  isGapElevated: boolean;
  normalThreshold: number;
  interpretation: string;
  gapTradeOffNote: string;
}

/**
 * Calculates serum osmolal gap according to canonical equation:
 * Calculated Osmolality = 2*Na + Glucose/18 + BUN/2.8 + Ethanol/4.6
 * Osmolal Gap = Measured Osmolality - Calculated Osmolality
 * Normal threshold: <= 10 mOsm/kg.
 */
export function calculateOsmolalGap(input: OsmolalGapInput): OsmolalGapResult {
  const { measuredOsmolality, sodiumMeqL, glucoseMgDl, bunMgDl, ethanolMgDl = 0 } = input;

  const ethanolContribution = ethanolMgDl > 0 ? ethanolMgDl / 4.6 : 0;
  const calculatedOsm =
    2 * sodiumMeqL + glucoseMgDl / 18 + bunMgDl / 2.8 + ethanolContribution;

  const roundedCalc = Math.round(calculatedOsm * 10) / 10;
  const gap = Math.round((measuredOsmolality - calculatedOsm) * 10) / 10;
  const isElevated = gap > 10;

  return {
    measuredOsmolality,
    calculatedOsmolality: roundedCalc,
    osmolalGap: gap,
    isGapElevated: isElevated,
    normalThreshold: 10,
    interpretation: isElevated
      ? `Elevated Osmolal Gap (${gap} mOsm/kg > 10 mOsm/kg). Suggests presence of unmeasured low-molecular-weight osmotically active solutes (toxic alcohols: methanol, ethylene glycol, isopropanol, propylene glycol, or diethylene glycol; alcoholic/diabetic ketoacidosis; severe shock).`
      : `Normal Osmolal Gap (${gap} mOsm/kg <= 10 mOsm/kg). Note: Normal gap DOES NOT exclude toxic alcohol poisoning if patient presents late after complete metabolism of parent alcohol into organic acids.`,
    gapTradeOffNote:
      "The 'Gap Trade-Off': Early after ingestion, parent alcohol concentration is high, generating a wide osmolal gap with normal anion gap. Over hours, ADH metabolizes neutral alcohol into toxic organic acids (formic acid, glycolic acid), causing the osmolal gap to progressively narrow/normalize while High Anion Gap Metabolic Acidosis (HAGMA) widens!",
  };
}

export interface ToxicAlcoholProfile {
  id: "methanol" | "ethylene-glycol";
  name: string;
  primarySources: string[];
  metabolicPathway: string;
  toxicMetabolite: string;
  primaryPathology: string[];
  coFactorTherapy: {
    agents: string;
    dosing: string;
    biochemicalMechanism: string;
  };
}

export const TOXIC_ALCOHOL_PROFILES: Record<"methanol" | "ethylene-glycol", ToxicAlcoholProfile> = {
  methanol: {
    id: "methanol",
    name: "Methanol (Methyl Alcohol / Wood Alcohol)",
    primarySources: ["Windshield washer fluid", "Moonshine / contaminated illicit spirits", "Model airplane fuel", "Sterno / canned heaters"],
    metabolicPathway:
      "Methanol --[Alcohol Dehydrogenase (ADH)]--> Formaldehyde --[Aldehyde Dehydrogenase (ALDH)]--> Formic Acid (Formate) --[10-Formyl-THF Synthetase]--> CO2 + H2O",
    toxicMetabolite: "Formic Acid (Formate)",
    primaryPathology: [
      "Inhibition of mitochondrial Cytochrome c Oxidase (Complex IV), arresting oxidative phosphorylation and causing tissue histotoxic hypoxia and severe lactic acidosis",
      "Retinal toxicity: Optic disc hyperemia, edema, demyelination of optic nerve, and profound loss of visual acuity ('snowfield blindness', dilated non-reactive pupils)",
      "Basal ganglia necrosis: Bilateral symmetrical putaminal hemorrhagic necrosis and infarction, causing irreversible parkinsonism, dystonia, and coma",
    ],
    coFactorTherapy: {
      agents: "Leucovorin (Folinic Acid) 50 mg IV q4h (or Folic Acid 50 mg IV/oral q4-6h)",
      dosing: "50 mg IV every 4 hours for at least 24 hours or until methanol and formic acid are cleared",
      biochemicalMechanism:
        "Formate oxidation into benign CO2 and H2O is strictly dependent on tetrahydrofolate (THF) co-factors via 10-formyl-THF synthetase. Exogenous leucovorin donates active THF, accelerating enzymatic clearance of toxic formic acid.",
    },
  },
  "ethylene-glycol": {
    id: "ethylene-glycol",
    name: "Ethylene Glycol (Automotive Antifreeze)",
    primarySources: ["Engine coolants / antifreeze", "Industrial solvents", "De-icing solutions"],
    metabolicPathway:
      "Ethylene Glycol --[ADH]--> Glycolaldehyde --[ALDH]--> Glycolic Acid --[LDH / Glycolate Oxidase]--> Glyoxylic Acid --[Oxalate Oxidase]--> Oxalic Acid (Oxalate)",
    toxicMetabolite: "Glycolic Acid (causes severe metabolic acidosis) and Oxalic Acid (forms calcium oxalate crystals)",
    primaryPathology: [
      "Glycolic acid is the primary driver of profound high anion gap metabolic acidosis and central nervous system depression",
      "Oxalic acid chelates serum ionized calcium to precipitate Calcium Oxalate Monohydrate and Dihydrate crystals in renal proximal tubules, causing acute tubular necrosis, flank pain, and oliguric/anuric acute kidney injury",
      "Systemic chelation produces profound hypocalcemia, causing tetany, seizures, ventricular arrhythmias, and marked QTc prolongation",
      "Facial nerve / cranial neuropathies and meningoencephalitis can occur late in severe poisoning",
    ],
    coFactorTherapy: {
      agents: "Thiamine (Vitamin B1) 100 mg IV q6h PLUS Pyridoxine (Vitamin B6) 50 mg IV q6h",
      dosing: "Thiamine 100 mg IV every 6 hours + Pyridoxine 50 mg IV every 6 hours until ethylene glycol is eliminated",
      biochemicalMechanism:
        "Thiamine is a necessary co-factor for thiamine pyrophosphate (TPP)-dependent glyoxylate carboligase, shunting glyoxylate to alpha-hydroxy-beta-ketoadipate. Pyridoxine is a required co-factor for alanine-glyoxylate aminotransferase (AGT), shunting glyoxylate to the benign amino acid glycine. Together, they actively bypass the conversion of glyoxylate to nephrotoxic oxalic acid!",
    },
  },
};

export interface FomepizoleProtocol {
  pharmacology: string;
  affinityVsEthanol: string;
  loadingDose: string;
  maintenanceDoses: string;
  escalatedMaintenanceDose: string;
  dialysisDosing: string;
}

export const FOMEPIZOLE_PROTOCOL: FomepizoleProtocol = {
  pharmacology:
    "Fomepizole (4-methylpyrazole) is a potent, competitive inhibitor of human alcohol dehydrogenase (ADH) with a Ki of ~0.1 uM.",
  affinityVsEthanol:
    "Fomepizole possesses an approximately 8,000-fold higher binding affinity for ADH than ethanol, halting toxic metabolite formation without inducing CNS depression or hypoglycemia.",
  loadingDose: "15 mg/kg IV in 100 mL 0.9% NaCl or D5W infused over 30 minutes.",
  maintenanceDoses:
    "10 mg/kg IV every 12 hours for 4 doses (doses 1 through 4 administered at 12, 24, 36, and 48 hours).",
  escalatedMaintenanceDose:
    "15 mg/kg IV every 12 hours beginning at dose 5 (after 48 hours), required due to auto-induction of fomepizole's own hepatic cytochrome P450 metabolism.",
  dialysisDosing:
    "Fomepizole is dialyzable; administer dose every 4 hours during intermittent hemodialysis, or infuse continuously at 1 to 1.5 mg/kg/hour, or redose immediately post-HD.",
};

export interface ExtripHemodialysisCriteria {
  indications: string[];
  targetClearanceEndpoint: string;
}

export const TOXIC_ALCOHOL_EXTRIP_HEMODIALYSIS: ExtripHemodialysisCriteria = {
  indications: [
    "Severe acidemia: Arterial pH < 7.25 or refractory metabolic acidosis",
    "Serum methanol or ethylene glycol level >= 50 mg/dL (or >= 20 mg/dL in renal impairment or when fomepizole is unavailable)",
    "Visual impairment, optic disc edema, or retinal abnormalities (methanol)",
    "Acute kidney injury, anuria, or rising serum creatinine (ethylene glycol)",
    "Severe electrolyte abnormalities or hemodynamic instability refractory to conventional medical therapy",
  ],
  targetClearanceEndpoint:
    "Continue hemodialysis until toxic alcohol concentration is < 20 mg/dL, acid-base status is normalized (pH > 7.30, normal anion gap), and osmolal gap is < 10 mOsm/kg.",
};

// ============================================================================
// 3. SALICYLATE (ASPIRIN) OVERDOSE & URINARY ALKALINIZATION ION-TRAPPING
// ============================================================================

export interface SalicylateIonizationResult {
  urinePh: number;
  salicylatePka: number;
  ionizedRatio: number;
  ionizedPercent: number;
  clearanceFoldIncreaseApprox: number;
  clinicalSignificance: string;
}

/**
 * Calculates Henderson-Hasselbalch ionization and clearance acceleration for salicylic acid (pKa 3.5).
 * [A-] / [HA] = 10^(pH - pKa)
 * % Ionized = [A-] / ([A-] + [HA]) * 100%
 */
export function calculateSalicylateIonization(urinePh: number): SalicylateIonizationResult {
  const pka = 3.5;
  const ratio = Math.pow(10, urinePh - pka);
  const ionizedPercent = (ratio / (1 + ratio)) * 100;

  // Approximate fold increase compared to baseline acidic urine pH 5.0
  const baselineRatio = Math.pow(10, 5.0 - pka);
  const baselineIonizedPct = (baselineRatio / (1 + baselineRatio)) * 100;
  const baselineUnionizedFraction = 100 - baselineIonizedPct;
  const currentUnionizedFraction = Math.max(0.001, 100 - ionizedPercent);
  const foldIncrease = Math.min(20, Math.max(1, baselineUnionizedFraction / currentUnionizedFraction));

  let clinicalSignificance: string;
  if (urinePh < 6.5) {
    clinicalSignificance =
      "Acidic urine: Significant un-ionized salicylic acid (HA) diffuses back across the tubular lipid membrane into circulation (non-ionic reabsorption). Renal clearance is minimal.";
  } else if (urinePh < 7.5) {
    clinicalSignificance =
      "Suboptimal alkalinization: Ionization is increasing, but target urine pH of 7.5–8.0 has not yet been achieved. Check serum potassium and adjust bicarbonate infusion.";
  } else {
    clinicalSignificance =
      "Optimal Ion-Trapping achieved: Salicylic acid is > 99.99% ionized into charged salicylate (A-), which is membrane-impermeable and trapped in the tubular lumen, escalating clearance by 10- to 20-fold!";
  }

  return {
    urinePh,
    salicylatePka: pka,
    ionizedRatio: Math.round(ratio * 10) / 10,
    ionizedPercent: Math.round(ionizedPercent * 1000) / 1000,
    clearanceFoldIncreaseApprox: Math.round(foldIncrease * 10) / 10,
    clinicalSignificance,
  };
}

export interface SalicylateOverdoseProfile {
  dualAcidBaseMechanics: {
    primaryRespiratoryAlkalosis: string;
    primaryMetabolicAcidosis: string;
    netAdultPresentation: string;
    cnsToxicityRisk: string;
  };
  urinaryAlkalinizationProtocol: {
    bicarbonateRegimen: string;
    targetUrinePh: string;
    targetSystemicPh: string;
  };
  potassiumRule: {
    physiologicalMechanism: string;
    paradoxicalAciduria: string;
    targetSerumPotassium: string;
    replacementInstruction: string;
  };
  extripHemodialysisCriteria: {
    acuteLevelMgDl: number;
    chronicLevelMgDl: number;
    clinicalCriteria: string[];
  };
}

export const SALICYLATE_OVERDOSE_PROFILE: SalicylateOverdoseProfile = {
  dualAcidBaseMechanics: {
    primaryRespiratoryAlkalosis:
      "Direct salicylate stimulation of the medullary respiratory center causes hyperventilation and tachypnea, driving pCO2 down and initial arterial pH up.",
    primaryMetabolicAcidosis:
      "Salicylates uncouple oxidative phosphorylation in mitochondrial electron transport chains, dissipating the proton gradient, inhibiting Krebs cycle dehydrogenases, and generating high anion gap metabolic acidosis with accumulation of lactate, pyruvate, and ketoacids.",
    netAdultPresentation:
      "Mixed respiratory alkalosis and high anion gap metabolic acidosis. Arterial pH frequently appears falsely normal or near-normal initially, masking severe toxicity.",
    cnsToxicityRisk:
      "As systemic blood pH drops (acidemia), salicylic acid shifts into the un-ionized lipid-soluble form (HA), which readily crosses the blood-brain barrier to enter cerebral tissue, producing tinnitus, confusion, seizures, cerebral edema, and death.",
  },
  urinaryAlkalinizationProtocol: {
    bicarbonateRegimen:
      "100 to 150 mEq Sodium Bicarbonate (2 to 3 ampules of 8.4% NaHCO3) in 1,000 mL D5W infused at 150 to 250 mL/hour (1.5 to 2x maintenance).",
    targetUrinePh: "Urine pH 7.5 to 8.0 (measure urine pH every 1–2 hours).",
    targetSystemicPh: "Keep arterial pH <= 7.55 to avoid catastrophic systemic alkalemia, tetany, and hypocalcemia.",
  },
  potassiumRule: {
    physiologicalMechanism:
      "In the renal cortical collecting tubule, the H+/K+ ATPase and intercalated cell transporters exchange H+ for K+. When hypokalemia is present, the kidney prioritizes K+ retention by excreting H+ into the lumen.",
    paradoxicalAciduria:
      "Hypokalemia causes paradoxical aciduria (urine pH < 6.5) despite systemic alkalemia and continuous IV bicarbonate infusion, completely neutralizing the ion-trapping mechanism!",
    targetSerumPotassium: "Target serum potassium >= 4.0 to 4.5 mEq/L at all times.",
    replacementInstruction:
      "Add 20 to 40 mEq KCl to each liter of bicarbonate infusion unless contraindicated by acute renal failure or hyperkalemia. Without potassium repletion, urine alkalinization is impossible.",
  },
  extripHemodialysisCriteria: {
    acuteLevelMgDl: 100,
    chronicLevelMgDl: 60,
    clinicalCriteria: [
      "Serum salicylate > 100 mg/dL (acute ingestion) regardless of clinical status",
      "Serum salicylate > 60 mg/dL (chronic ingestion) with clinical signs of toxicity",
      "Altered mental status, confusion, seizures, coma, or cerebral edema",
      "Non-cardiogenic pulmonary edema (salicylate-induced ARDS)",
      "Refractory acidemia (pH < 7.20) or failure of urinary alkalinization",
      "Acute renal failure, anuria, or severe fluid overload precluding bicarbonate infusion",
    ],
  },
};

// ============================================================================
// 4. OPIOID OVERDOSE & NALOXONE TITRATION
// ============================================================================

export interface OpioidReversalProfile {
  naloxonePharmacology: {
    receptorMechanism: string;
    muReceptorAffinityKi: string;
    onsetIvMinutes: string;
    halfLifeMinutes: string;
    effectiveDurationHours: string;
  };
  renarcotizationKinetics: {
    pathophysiology: string;
    highRiskOpioids: Array<{
      id: string;
      name: string;
      halfLifeOrLipophilicity: string;
      clinicalRisk: string;
    }>;
  };
  titrationProtocol: {
    resuscitationGoal: string;
    initialBolusMg: string;
    continuousInfusionProtocol: string;
    formula: string;
    postInfusionObservationHours: string;
  };
}

export const OPIOID_REVERSAL_PROFILE: OpioidReversalProfile = {
  naloxonePharmacology: {
    receptorMechanism: "Pure competitive mu-opioid receptor (MOR) antagonist; also binds kappa and delta receptors.",
    muReceptorAffinityKi: "Ki ~ 1 to 2 nM (high affinity displacement of opioid agonists).",
    onsetIvMinutes: "1 to 2 minutes IV (2 to 5 minutes IM/IN).",
    halfLifeMinutes: "30 to 90 minutes (mean elimination half-life ~60 minutes).",
    effectiveDurationHours: "0.75 to 1.5 hours (45 to 90 minutes).",
  },
  renarcotizationKinetics: {
    pathophysiology:
      "Renarcotization is the recurrence of lethal central respiratory depression after the initial reversal of opioid toxicity, caused by the severe mismatch between naloxone's short half-life (~60 min) and the protracted half-life or adipose redistribution of long-acting or lipophilic synthetic opioids.",
    highRiskOpioids: [
      {
        id: "methadone",
        name: "Methadone",
        halfLifeOrLipophilicity: "Elimination half-life: 24 to 36 hours (up to 60h)",
        clinicalRisk:
          "Extremely protracted elimination half-life; patients routinely renarcotize 2–4 hours after a bolus of naloxone.",
      },
      {
        id: "fentanyl",
        name: "Fentanyl & Synthetic Analogs (Carfentanil, Nitazenes)",
        halfLifeOrLipophilicity: "High lipophilicity with massive adipose volume of distribution",
        clinicalRisk:
          "Sustained context-sensitive half-time; rapid redistribution into and wash-out from fat reserves causes late recurrent respiratory arrest and chest wall rigidity ('wooden chest').",
      },
      {
        id: "extended-release-opioids",
        name: "Extended-Release Formulations (OxyContin, MS Contin, Kadian)",
        halfLifeOrLipophilicity: "Prolonged gastrointestinal absorption over 12–24 hours",
        clinicalRisk:
          "Ongoing GI absorption continuously outpaces naloxone clearance, requiring prolonged observation or infusion.",
      },
      {
        id: "buprenorphine",
        name: "Buprenorphine",
        halfLifeOrLipophilicity: "Extremely high MOR affinity (Ki ~ 0.2 nM) and slow dissociation rate",
        clinicalRisk:
          "Requires higher and repeated doses of naloxone to displace, with protracted clinical duration.",
      },
    ],
  },
  titrationProtocol: {
    resuscitationGoal:
      "Titrate to restore spontaneous ventilation (respiratory rate >= 10–12/min, adequate tidal volume, room air SpO2 > 92%) and protect airway WITHOUT precipitating acute opioid withdrawal (which causes vomiting, aspiration, flash pulmonary edema, and sympathetic surge).",
    initialBolusMg:
      "0.04 to 0.4 mg IV initially (titrate every 2–3 minutes; 1–2 mg for synthetic fentanyl/nitazene arrest).",
    continuousInfusionProtocol:
      "Continuous IV naloxone infusion: Administer an hourly infusion rate equal to TWO-THIRDS (2/3) of the total successful bolus dose that effectively reversed the respiratory arrest.",
    formula: "Hourly Naloxone Infusion Rate (mg/h) = (2 / 3) * Total Initial Successful Bolus (mg)",
    postInfusionObservationHours:
      "Observe patient for a minimum of 4 to 6 hours after cessation of naloxone infusion (or bolus) to confirm absence of renarcotization before safe discharge or ward transfer.",
  },
};

/**
 * Calculates continuous naloxone infusion rate from the successful initial bolus dose.
 */
export function calculateNaloxoneInfusionRate(initialBolusMg: number): {
  initialBolusMg: number;
  hourlyInfusionRateMg: number;
  mixingInstruction: string;
  observationRecommendation: string;
} {
  const safeBolus = Math.max(0.04, Math.min(20, initialBolusMg));
  const hourlyRate = (2 / 3) * safeBolus;
  const roundedHourly = Math.round(hourlyRate * 100) / 100;

  return {
    initialBolusMg: safeBolus,
    hourlyInfusionRateMg: roundedHourly,
    mixingInstruction: `Add 4 mg Naloxone to 1,000 mL D5W or 0.9% NaCl (concentration 4 mcg/mL). Infuse at ${(roundedHourly * 250).toFixed(0)} mL/hour to deliver ${roundedHourly} mg/hour.`,
    observationRecommendation:
      "Monitor respiratory rate and SpO2 continuously. If respiratory depression recurs, administer a mini-bolus (half the original dose) and titrate the hourly rate upward by 25–50%. Maintain for at least 4–6 hours after stabilization.",
  };
}

// ============================================================================
// 5. TOXICOLOGY DRUG DETECTION & DESK SCANNER
// ============================================================================

export interface ToxicologyOnDeskResult {
  hasToxicologyAgent: boolean;
  hasApap: boolean;
  hasToxicAlcohol: boolean;
  hasSalicylate: boolean;
  hasOpioid: boolean;
  hasAntidote: boolean;
  hasCyp2e1Inducer: boolean;
  hasHighRenarcotizationRisk: boolean;
  detectedApapIds: string[];
  detectedToxicAlcoholIds: string[];
  detectedSalicylateIds: string[];
  detectedOpioidIds: string[];
  detectedAntidoteIds: string[];
  detectedCyp2e1InducerIds: string[];
  detectedRenarcotizationRiskIds: string[];
  allToxicologyIds: string[];
  summary: string;
}

const APAP_ALIASES = new Set(["acetaminophen", "paracetamol", "apap", "tylenol", "percocet", "vicodin"]);

const TOXIC_ALCOHOL_ALIASES = new Set([
  "methanol",
  "methyl-alcohol",
  "wood-alcohol",
  "ethylene-glycol",
  "antifreeze",
  "isopropanol",
  "isopropyl-alcohol",
  "rubbing-alcohol",
  "diethylene-glycol",
  "propylene-glycol",
]);

const SALICYLATE_ALIASES = new Set([
  "aspirin",
  "salicylate",
  "salicylic-acid",
  "bismuth-subsalicylate",
  "diflunisal",
  "salsalate",
  "mesalamine",
  "sulfasalazine",
]);

const OPIOID_ALIASES = new Set([
  "morphine",
  "fentanyl",
  "methadone",
  "oxycodone",
  "hydrocodone",
  "hydromorphone",
  "oxymorphone",
  "codeine",
  "tramadol",
  "tapentadol",
  "buprenorphine",
  "heroin",
  "carfentanil",
  "meperidine",
  "sufentanil",
  "alfentanil",
  "remifentanil",
  "levorphanol",
  "loperamide",
  "kratom",
  "seven-oh",
  "isotonitazene",
  "protonitazene",
  "metonitazene",
  "etonitazene",
  "u-47700",
  "dirty-30",
]);

const HIGH_RENARCOTIZATION_OPIOIDS = new Set([
  "methadone",
  "fentanyl",
  "carfentanil",
  "buprenorphine",
  "levorphanol",
  "isotonitazene",
  "protonitazene",
  "metonitazene",
  "etonitazene",
  "u-47700",
  "dirty-30",
  "sufentanil",
]);

const ANTIDOTE_ALIASES = new Set([
  "nac",
  "n-acetylcysteine-iv",
  "n-acetylcysteine",
  "acetylcysteine",
  "fomepizole",
  "antizol",
  "naloxone",
  "narcan",
  "nalmefene",
  "sodium-bicarbonate",
  "leucovorin",
  "folinic-acid",
  "thiamine",
  "pyridoxine",
]);

const CYP2E1_INDUCER_ALIASES = new Set([
  "ethanol",
  "isoniazid",
  "rifampin",
  "phenobarbital",
  "carbamazepine",
  "phenytoin",
]);

/**
 * Screens drug list for active emergency toxicology compounds, antidotes, and modifiers.
 */
export function toxicologyOnDesk(drugIds: string[]): ToxicologyOnDeskResult {
  const normalized = drugIds.map((id) => id.toLowerCase().trim());

  const detectedApapIds: string[] = [];
  const detectedToxicAlcoholIds: string[] = [];
  const detectedSalicylateIds: string[] = [];
  const detectedOpioidIds: string[] = [];
  const detectedAntidoteIds: string[] = [];
  const detectedCyp2e1InducerIds: string[] = [];
  const detectedRenarcotizationRiskIds: string[] = [];

  for (const id of normalized) {
    const drug = DRUG_BY_ID[id];
    const names = [id, drug?.name?.toLowerCase() ?? "", ...(drug?.aliases?.map((a) => a.toLowerCase()) ?? [])];

    const matchesAny = (set: Set<string>) => names.some((n) => set.has(n));

    if (matchesAny(APAP_ALIASES)) detectedApapIds.push(id);
    if (matchesAny(TOXIC_ALCOHOL_ALIASES)) detectedToxicAlcoholIds.push(id);
    if (matchesAny(SALICYLATE_ALIASES)) detectedSalicylateIds.push(id);
    if (matchesAny(OPIOID_ALIASES) || drug?.pd?.includes("opioid") || /opioid/i.test(drug?.cls ?? "")) {
      detectedOpioidIds.push(id);
      if (matchesAny(HIGH_RENARCOTIZATION_OPIOIDS) || /methadone|fentanyl|buprenorphine/i.test(drug?.name ?? "")) {
        detectedRenarcotizationRiskIds.push(id);
      }
    }
    if (matchesAny(ANTIDOTE_ALIASES)) detectedAntidoteIds.push(id);
    if (matchesAny(CYP2E1_INDUCER_ALIASES)) detectedCyp2e1InducerIds.push(id);
  }

  const allToxicologyIds = Array.from(
    new Set([
      ...detectedApapIds,
      ...detectedToxicAlcoholIds,
      ...detectedSalicylateIds,
      ...detectedOpioidIds,
      ...detectedAntidoteIds,
      ...detectedCyp2e1InducerIds,
    ]),
  );

  const hasApap = detectedApapIds.length > 0;
  const hasToxicAlcohol = detectedToxicAlcoholIds.length > 0;
  const hasSalicylate = detectedSalicylateIds.length > 0;
  const hasOpioid = detectedOpioidIds.length > 0;
  const hasAntidote = detectedAntidoteIds.length > 0;
  const hasCyp2e1Inducer = detectedCyp2e1InducerIds.length > 0;
  const hasHighRenarcotizationRisk = detectedRenarcotizationRiskIds.length > 0;
  const hasToxicologyAgent = allToxicologyIds.length > 0;

  const categories: string[] = [];
  if (hasApap) categories.push("Acetaminophen");
  if (hasToxicAlcohol) categories.push("Toxic Alcohol");
  if (hasSalicylate) categories.push("Salicylate");
  if (hasOpioid) categories.push("Opioid");
  if (hasAntidote) categories.push("Antidote");

  const summary = hasToxicologyAgent
    ? `Active toxicology components on desk: ${categories.join(", ")} (${allToxicologyIds.length} agents detected).`
    : "No primary emergency toxicology compounds or antidotes detected on current desk.";

  return {
    hasToxicologyAgent,
    hasApap,
    hasToxicAlcohol,
    hasSalicylate,
    hasOpioid,
    hasAntidote,
    hasCyp2e1Inducer,
    hasHighRenarcotizationRisk,
    detectedApapIds,
    detectedToxicAlcoholIds,
    detectedSalicylateIds,
    detectedOpioidIds,
    detectedAntidoteIds,
    detectedCyp2e1InducerIds,
    detectedRenarcotizationRiskIds,
    allToxicologyIds,
    summary,
  };
}

// ============================================================================
// 6. COMPREHENSIVE REPORT GENERATOR
// ============================================================================

export interface ToxicologyReportOptions {
  apapNomogram?: RumackNomogramInput;
  osmolalGap?: OsmolalGapInput;
  urinePhForSalicylate?: number;
  initialNaloxoneBolusMg?: number;
}

export interface ToxicologyAlert {
  tier: "critical" | "warning" | "advisory";
  category: "APAP" | "ToxicAlcohol" | "Salicylate" | "Opioid" | "Antidote";
  title: string;
  rationale: string;
  actionGuidance: string;
}

export interface ToxicologyReport {
  onDesk: ToxicologyOnDeskResult;
  apapEvaluation?: RumackNomogramResult;
  osmolalGapEvaluation?: OsmolalGapResult;
  salicylateIonizationEvaluation?: SalicylateIonizationResult;
  naloxoneInfusionCalculation?: ReturnType<typeof calculateNaloxoneInfusionRate>;
  alerts: ToxicologyAlert[];
  clinicalPillars: {
    apap: {
      phases: typeof APAP_CLINICAL_PHASES;
      ivRegimens: typeof NAC_IV_REGIMENS;
      anaphylactoidManagement: typeof NAC_ANAPHYLACTOID_MANAGEMENT;
      stoppingCriteria: typeof NAC_STOPPING_CRITERIA;
    };
    toxicAlcohols: {
      profiles: typeof TOXIC_ALCOHOL_PROFILES;
      fomepizoleProtocol: typeof FOMEPIZOLE_PROTOCOL;
      hemodialysisCriteria: typeof TOXIC_ALCOHOL_EXTRIP_HEMODIALYSIS;
    };
    salicylates: {
      profile: typeof SALICYLATE_OVERDOSE_PROFILE;
    };
    opioids: {
      profile: typeof OPIOID_REVERSAL_PROFILE;
    };
  };
  disclaimer: string;
}

/**
 * Comprehensive toxicology report generator integrating all 4 pillars, nomograms,
 * calculations, and statutory CDS disclosures.
 */
export function toxicologyReportOnDesk(
  drugIds: string[],
  host: HostContext,
  options?: ToxicologyReportOptions,
): ToxicologyReport {
  const onDesk = toxicologyOnDesk(drugIds);
  const alerts: ToxicologyAlert[] = [];

  // APAP Pillar Evaluation
  let apapEvaluation: RumackNomogramResult | undefined;
  if (onDesk.hasApap || options?.apapNomogram) {
    const input: RumackNomogramInput = options?.apapNomogram ?? {
      hoursPostIngestion: 4,
      serumApapMcgMl: 150,
      chronicAlcoholOrInducer: host.alcohol === "chronic" || onDesk.hasCyp2e1Inducer,
      acuteAlcoholCoIngestion: host.alcohol === "acute",
      malnutritionOrFasting: false,
    };
    apapEvaluation = evaluateRumackMatthewNomogram(input);

    if (apapEvaluation.nacIndicated) {
      alerts.push({
        tier: apapEvaluation.band === "high-risk" ? "critical" : "warning",
        category: "APAP",
        title: `Acetaminophen Overdose: ${apapEvaluation.label}`,
        rationale: `Serum APAP of ${apapEvaluation.serumApapMcgMl} mcg/mL at ${apapEvaluation.hoursPostIngestion}h. ${apapEvaluation.clinicalGuidance}`,
        actionGuidance: apapEvaluation.nacUrgency,
      });
    }
  }

  // Toxic Alcohol Pillar Evaluation
  let osmolalGapEvaluation: OsmolalGapResult | undefined;
  if (onDesk.hasToxicAlcohol || options?.osmolalGap) {
    const input: OsmolalGapInput = options?.osmolalGap ?? {
      measuredOsmolality: 310,
      sodiumMeqL: 140,
      glucoseMgDl: 100,
      bunMgDl: 14,
      ethanolMgDl: 0,
    };
    osmolalGapEvaluation = calculateOsmolalGap(input);

    if (osmolalGapEvaluation.isGapElevated) {
      alerts.push({
        tier: "critical",
        category: "ToxicAlcohol",
        title: `Elevated Osmolal Gap (${osmolalGapEvaluation.osmolalGap} mOsm/kg)`,
        rationale: osmolalGapEvaluation.interpretation,
        actionGuidance:
          "Screen for toxic alcohol exposure (methanol, ethylene glycol). Initiate Fomepizole loading (15 mg/kg IV) and evaluate EXTRIP hemodialysis criteria if severe acidemia or organ injury is present.",
      });
    }
  }

  // Salicylate Pillar Evaluation
  let salicylateIonizationEvaluation: SalicylateIonizationResult | undefined;
  if (onDesk.hasSalicylate || options?.urinePhForSalicylate !== undefined) {
    const urinePh = options?.urinePhForSalicylate ?? 5.5;
    salicylateIonizationEvaluation = calculateSalicylateIonization(urinePh);

    alerts.push({
      tier: urinePh < 7.5 ? "warning" : "advisory",
      category: "Salicylate",
      title: "Salicylate Toxicity & Ion-Trapping Status",
      rationale: `At urine pH ${urinePh}, salicylic acid is ${salicylateIonizationEvaluation.ionizedPercent}% ionized. ${salicylateIonizationEvaluation.clinicalSignificance}`,
      actionGuidance:
        "Administer IV Sodium Bicarbonate to target urine pH 7.5–8.0. CRITICAL: Aggressively replete potassium to serum K >= 4.0–4.5 mEq/L to prevent paradoxical aciduria.",
    });
  }

  // Opioid Renarcotization Evaluation
  let naloxoneInfusionCalculation: ReturnType<typeof calculateNaloxoneInfusionRate> | undefined;
  if (onDesk.hasOpioid || options?.initialNaloxoneBolusMg !== undefined) {
    const bolus = options?.initialNaloxoneBolusMg ?? 0.4;
    naloxoneInfusionCalculation = calculateNaloxoneInfusionRate(bolus);

    if (onDesk.hasHighRenarcotizationRisk) {
      alerts.push({
        tier: "critical",
        category: "Opioid",
        title: "High Renarcotization Risk Detected",
        rationale: `Regimen contains long-acting or lipophilic opioids (${onDesk.detectedRenarcotizationRiskIds.join(", ")}). Naloxone half-life (30–90 min) is substantially shorter than opioid duration.`,
        actionGuidance:
          `Prepare continuous naloxone infusion at ${naloxoneInfusionCalculation.hourlyInfusionRateMg} mg/hour (2/3 of successful initial bolus). Observe patient for >= 4–6 hours post-infusion.`,
      });
    }
  }

  return {
    onDesk,
    apapEvaluation,
    osmolalGapEvaluation,
    salicylateIonizationEvaluation,
    naloxoneInfusionCalculation,
    alerts,
    clinicalPillars: {
      apap: {
        phases: APAP_CLINICAL_PHASES,
        ivRegimens: NAC_IV_REGIMENS,
        anaphylactoidManagement: NAC_ANAPHYLACTOID_MANAGEMENT,
        stoppingCriteria: NAC_STOPPING_CRITERIA,
      },
      toxicAlcohols: {
        profiles: TOXIC_ALCOHOL_PROFILES,
        fomepizoleProtocol: FOMEPIZOLE_PROTOCOL,
        hemodialysisCriteria: TOXIC_ALCOHOL_EXTRIP_HEMODIALYSIS,
      },
      salicylates: {
        profile: SALICYLATE_OVERDOSE_PROFILE,
      },
      opioids: {
        profile: OPIOID_REVERSAL_PROFILE,
      },
    },
    disclaimer: `${TOXICOLOGY_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`,
  };
}
