/**
 * Acid-Base Disorders, Respiratory Compensation, Delta-Delta Kinetics &
 * Hyponatremia / Osmotic Demyelination Syndrome (ODS) Prevention Reference Engine
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support (CDS) Architecture:
 * - Conforms strictly to 21 U.S.C. § 360j(o)(1)(E) and FDA CDS Guidance (January 2026).
 * - Intended for licensed nephrologists, critical care physicians, emergency physicians,
 *   clinical pharmacists (PharmD / BCPS / BCCCP), and supervised trainees.
 * - Displays transparent physiological, biochemical, and physical-chemical rationales
 *   derived from peer-reviewed nephrology and critical care literature (Winter's formula,
 *   Figge albumin correction, Adrogué-Madias, Sterns, Verbalis, European Hyponatraemia Guidelines).
 * - Enables independent clinical verification of all calculated parameters.
 * - DOES NOT provide automated prescription orders, closed-loop infusion commands,
 *   or definitive bedside diagnostic directives.
 *
 * Core Pillars:
 * 1. Serum Anion Gap & Albumin Correction:
 *    - AG = Na - (Cl + HCO3). Normal reference: 8 to 12 mEq/L.
 *    - Figge albumin correction: For each 1.0 g/dL drop in serum albumin below baseline (4.0 g/dL),
 *      unmeasured anionic charge decreases by 2.5 mEq/L.
 *      Corrected AG = AG_observed + 2.5 * (4.0 - Albumin_g_dL).
 *      Uncorrected AG misses occult high anion gap metabolic acidosis in critically ill patients!
 * 2. Winter's Formula for Secondary Respiratory Compensation:
 *    - Evaluates expected PaCO2 in metabolic acidosis: Expected PaCO2 = (1.5 * [HCO3-]) + 8 +/- 2.
 *    - Pure compensation: Measured PaCO2 within expected range.
 *    - Concomitant Respiratory Acidosis: Measured PaCO2 > expected (hypoventilation, CNS depression).
 *    - Concomitant Respiratory Alkalosis: Measured PaCO2 < expected (hyperventilation, sepsis, salicylism).
 * 3. Delta-Delta (Delta Gap / Delta Bicarbonate) Analysis:
 *    - Delta AG = Corrected AG - 12; Delta HCO3 = 24 - [HCO3-]; Ratio = Delta AG / Delta HCO3.
 *    - Ratio < 0.4 to 0.8: Mixed HAGMA + NAGMA (e.g. DKA + high-volume 0.9% normal saline, or RTA, diarrhea).
 *    - Ratio 1.0 to 2.0: Pure HAGMA (uncomplicated DKA, lactic acidosis).
 *    - Ratio > 2.0: Mixed HAGMA + concurrent Metabolic Alkalosis (DKA + vomiting, prior diuretic use).
 * 4. Hyponatremia & Osmotic Demyelination Syndrome (ODS) Safeguards:
 *    - Euvolemic (SIADH) vs Hypovolemic (CSW, diuretic, GI loss) vs Hypervolemic differentiation.
 *    - CRITICAL ODS SAFETY CEILING: Maximum safe rate <= 8 mEq/L in 24h (<= 4-6 mEq/L in high-risk patients:
 *      chronic > 48h, malnutrition, advanced cirrhosis, alcoholism, baseline Na < 105 mEq/L).
 *    - Adrogue-Madias Formula: Delta Na per 1 L infusate = (Infusate Na - Serum Na) / (TBW + 1).
 *    - 3% Hypertonic Saline Emergency Rescue: isotonic-vs-hypertonic rescue guidance & DDAVP clamp reference.
 *    - Katz & Hillier hyperglycemia sodium correction and serum osmolal gap evaluation.
 * 5. Henderson-Hasselbalch Ionization, Urinary Ion Trapping & Gastric pH Absorption Kinetics:
 *    - Weak acids: f_i = 1 / (1 + 10^(pKa - pH)); Weak bases: f_i = 1 / (1 + 10^(pH - pKa)).
 *    - Weak acid urinary alkalinization (salicylate, phenobarbital, methotrexate) & acidemia BBB/CSF trapping.
 *    - Weak base alkaline-urine clearance impairment (amphetamine, quinidine, flecainide).
 *    - Gastric pH elevation (PPI / H2RA / P-CAB) impairing weak-base dissolution (ketoconazole, itraconazole,
 *      posaconazole suspension, atazanavir, rilpivirine, dasatinib, erlotinib, pazopanib).
 */

import { type Unsized, withoutUnentered } from "./assumed-inputs";
import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

/**
 * Statutory Non-Device Clinical Decision Support disclaimer under FD&C Act § 520(o)(1)(E).
 */
export const ACID_BASE_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational acid-base and hyponatremia reference engine is intended solely for licensed healthcare professionals and supervised health-professions trainees. It models physical-chemical equilibria, Figge albumin corrections, Winter's respiratory compensation, Delta-Delta ratios, Henderson-Hasselbalch ionization, urinary ion trapping, gastric pH dissolution, and Adrogué-Madias sodium kinetics to enable independent verification of clinical rationale in critical care and nephrology. It does not provide automated diagnostic conclusions, does not generate infusion orders or prescription directives, and does not replace individualized bedside clinical judgment, arterial blood gas confirmation, or the FDA-approved Prescribing Information.";

export const ACID_BASE_CITATIONS: readonly string[] = [
  "Winter SD, Pearson JR, Gabow PA, Schultz AL, Lepoff RB. The fall of the serum anion gap. Arch Intern Med. 1990;150(2):311-313.",
  "Figge J, Jabor A, Kazda A, Fencl V. Anion gap and hypoalbuminemia. Crit Care Med. 1998;26(11):1807-1810. PMID 9824071.",
  "Emmett M, Narins RG. Clinical use of the anion gap. Medicine (Baltimore). 1977;56(1):38-54.",
  "Adrogué HJ, Madias NE. Hyponatremia. N Engl J Med. 2000;342(21):1581-1589.",
  "Sterns RH. Disorders of plasma sodium--causes, consequences, and correction. N Engl J Med. 2015;372(1):55-65.",
  "Verbalis JG, Goldsmith SR, Bustamante A, et al. Diagnosis, evaluation, and treatment of hyponatremia: expert panel recommendations. Am J Med. 2013;126(10 Suppl 1):S1-S42.",
  "Spasovski G, Vanholder R, Allolio B, et al. Clinical practice guideline on diagnosis and treatment of hyponatraemia. Eur J Endocrinol. 2014;170(3):G1-47.",
  "Sterns RH, Nigwekar SU, Hix JK. The treatment of hyponatremia. Semin Nephrol. 2009;29(3):282-299.",
  "Rondon-Berrios H, Tandukar S, Sterns RH. Rapid re-lowering for hyponatremia overcorrection: a systematic review. Kidney360. 2021;2(9):1428-1436.",
  "Kraut JA, Madias NE. Serum anion gap: its uses and limitations in clinical medicine. Clin J Am Soc Nephrol. 2007;2(1):162-174.",
  "Hamm LL, Nakhoul N, Hering-Smith KS. Acid-Base Homeostasis. Clin J Am Soc Nephrol. 2015;10(12):2232-2242.",
  "Proudfoot AT, Krenzelok EP, Vale JA. Position Paper on urine alkalinization. J Toxicol Clin Toxicol. 2004;42(1):1-26. PMID 15083932.",
  "Proudfoot AT, Krenzelok EP, Vale JA. Does urine alkalinization increase salicylate elimination? If so, why? Toxicol Rev. 2003;22(3):129-136. PMID 15181662.",
  "Hill JB. Salicylate intoxication. N Engl J Med. 1973;288(21):1110-1113. PMID 4572648.",
  "Beckett AH, Rowland M. The amphetamines: clinical and pharmacokinetic implications of recent studies of an assay procedure and urinary excretion in man. Arzneimittelforschung. 1966;16(11):1433-1437. PMID 4880484.",
  "Budha NR, Frymoyer A, Smelick GS, et al. Drug absorption interactions between oral targeted anticancer agents and PPIs: is pH-dependent solubility the Achilles heel of targeted therapy? Clin Pharmacol Ther. 2012;92(2):203-213. PMID 22739140.",
  "Yago MR, Frymoyer A, Benet LZ, et al. The use of betaine HCl to enhance dasatinib absorption in healthy volunteers with rabeprazole-induced hypochlorhydria. AAPS J. 2014;16(6):1358-1365. PMID 25274610.",
  "Ogawa R, Echizen H. Clinically significant drug interactions with antacids: an update. Drugs. 2011;71(14):1839-1864. PMID 21942976.",
  "Katz MA. Hyperglycemia-induced hyponatremia--calculation of expected serum sodium depression. N Engl J Med. 1973;289(16):843-844. PMID 4763428.",
  "Hillier TA, Abbott RD, Barrett EJ. Hyponatremia: evaluating the correction factor for hyperglycemia. Am J Med. 1999;106(4):399-403. PMID 10225241.",
];

// Helper rounding & edge-case sanitization functions
function round1(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round(val * 10) / 10;
}

function round2(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round(val * 100) / 100;
}

function round4(val: number): number {
  if (!Number.isFinite(val)) return 0;
  if (val > 0 && val < 0.001) return Number(val.toPrecision(5));
  return Math.round(val * 10000) / 10000;
}

function finiteOrFallback(val: number, fallback: number): { value: number; replaced: boolean } {
  return Number.isFinite(val) ? { value: val, replaced: false } : { value: fallback, replaced: true };
}

// ============================================================================
// 1. SERUM ANION GAP & ALBUMIN CORRECTION (FIGGE FORMULA)
// ============================================================================

export interface AnionGapInput {
  sodiumMeqL: number;
  chlorideMeqL: number;
  bicarbonateMeqL: number;
  potassiumMeqL?: number;
  albuminGdl?: number;
}

export type AnionGapCategory = "low" | "normal" | "elevated";

export interface AnionGapResult {
  observedAnionGap: number;
  correctedAnionGap: number;
  baselineAlbuminGdl: number;
  albuminGdl?: number;
  isHypoalbuminemic: boolean;
  albuminDeltaGdl: number;
  albuminAdjustmentMeqL: number;
  category: AnionGapCategory;
  occultHagmaUnmasked: boolean;
  formulaUsed: string;
  interpretation: string;
  clinicalSignificance: string;
  etiologies: string[];
  potassiumIncludedAnionGap?: number;
  inputGuardWarning?: string;
}

/**
 * Calculates serum anion gap and applies Figge-Fencl albumin correction.
 * For every 1.0 g/dL drop in serum albumin below 4.0 g/dL, unmeasured anionic charges
 * decrease by 2.5 mEq/L.
 * Formula: Corrected AG = Observed AG + 2.5 * (4.0 - Albumin_g_dL).
 */
export function calculateAnionGap(input: AnionGapInput): AnionGapResult {
  const guardNotes: string[] = [];
  const naCheck = finiteOrFallback(input.sodiumMeqL, 140);
  const clCheck = finiteOrFallback(input.chlorideMeqL, 104);
  const hco3Check = finiteOrFallback(input.bicarbonateMeqL, 24);
  if (naCheck.replaced || clCheck.replaced || hco3Check.replaced) {
    guardNotes.push("Non-finite electrolyte input was replaced with physiological baseline for safe calculation.");
  }

  const sodiumMeqL = naCheck.value;
  const chlorideMeqL = clCheck.value;
  const bicarbonateMeqL = hco3Check.value;

  let albuminGdl = input.albuminGdl;
  if (albuminGdl !== undefined) {
    if (!Number.isFinite(albuminGdl)) {
      guardNotes.push("Non-finite albumin value ignored; Figge correction skipped.");
      albuminGdl = undefined;
    } else if (albuminGdl < 0) {
      guardNotes.push(`Negative albumin (${albuminGdl} g/dL) clamped to 0 g/dL.`);
      albuminGdl = 0;
    } else if (albuminGdl > 10) {
      guardNotes.push(`Implausible albumin (${albuminGdl} g/dL) clamped to 10 g/dL.`);
      albuminGdl = 10;
    }
  }

  const observedAG = round1(sodiumMeqL - (chlorideMeqL + bicarbonateMeqL));
  const potassiumIncludedAnionGap =
    input.potassiumMeqL !== undefined && Number.isFinite(input.potassiumMeqL)
      ? round1(sodiumMeqL + input.potassiumMeqL - (chlorideMeqL + bicarbonateMeqL))
      : undefined;
  const baselineAlbumin = 4.0;

  let correctedAG = observedAG;
  let isHypoalbuminemic = false;
  let albuminDelta = 0;
  let adjustment = 0;

  if (albuminGdl !== undefined) {
    albuminDelta = round2(baselineAlbumin - albuminGdl);
    adjustment = round1(2.5 * albuminDelta);
    correctedAG = round1(observedAG + adjustment);
    isHypoalbuminemic = albuminGdl < 4.0;
  }

  const occultHagmaUnmasked = observedAG <= 12 && correctedAG > 12;

  let category: AnionGapCategory = "normal";
  let interpretation = "";
  let clinicalSignificance = "";
  const etiologies: string[] = [];

  if (correctedAG > 12) {
    category = "elevated";
    interpretation = `High Anion Gap Metabolic Acidosis (Corrected AG: ${correctedAG} mEq/L; normal 8–12 mEq/L).`;
    clinicalSignificance = occultHagmaUnmasked
      ? `OCCULT HIGH ANION GAP UNMASKED: Observed AG was deceptively normal (${observedAG} mEq/L) due to hypoalbuminemia (albumin ${albuminGdl} g/dL). Figge correction reveals true excess unmeasured anions (+${adjustment} mEq/L).`
      : `Excess unmeasured organic anions are accumulating in extracellular fluid, titrating serum bicarbonate.`;
    etiologies.push(
      "Lactic acidosis (Type A tissue hypoperfusion, Type B mitochondrial/toxic/metformin)",
      "Diabetic Ketoacidosis (DKA), Alcoholic Ketoacidosis (AKA), Starvation ketosis",
      "End-stage renal disease / Uremia (sulfate, phosphate, organic acid retention)",
      "Toxic alcohols: Methanol (formic acid), Ethylene glycol (glycolic/oxalic acid)",
      "Salicylate intoxication (lactic acid, ketoacids, salicylic acid)",
      "Pyroglutamic acid (5-oxoproline) acidosis from chronic acetaminophen in malnutrition",
    );
  } else if (correctedAG < 6) {
    category = "low";
    interpretation = `Low Anion Gap (${correctedAG} mEq/L; normal 8–12 mEq/L).`;
    clinicalSignificance =
      "Reduced anion gap may reflect unmeasured cations, lab artifact, or severe hypoalbuminemia if uncorrected.";
    etiologies.push(
      "Multiple myeloma / Monoclonal gammopathy (IgG paraproteins carry net positive charge)",
      "Severe hypoalbuminemia (if albumin unmeasured or inadequately corrected)",
      "Severe hypercalcemia, hypermagnesemia, or severe hyperkalemia",
      "Lithium intoxication (exogenous unmeasured cation)",
      "Bromide or iodide intoxication (spurious hyperchloremia on ion-selective electrodes)",
    );
  } else {
    category = "normal";
    interpretation = `Normal Anion Gap (${correctedAG} mEq/L; reference range 8–12 mEq/L).`;
    clinicalSignificance =
      "No elevation in unmeasured organic anions detected. If metabolic acidosis is present (low HCO3), it represents Normal Anion Gap Metabolic Acidosis (NAGMA / hyperchloremic acidosis).";
    etiologies.push(
      "Gastrointestinal bicarbonate loss (severe diarrhea, enterostomy, ileostomy)",
      "Renal Tubular Acidosis (Type 1 distal, Type 2 proximal/acetazolamide, Type 4 hypoaldosteronism)",
      "High-volume 0.9% Normal Saline fluid resuscitation (hyperchloremic dilutional acidosis)",
      "Carbonic anhydrase inhibitor therapy (acetazolamide, topiramate)",
    );
  }

  return {
    observedAnionGap: observedAG,
    correctedAnionGap: correctedAG,
    baselineAlbuminGdl: baselineAlbumin,
    albuminGdl,
    isHypoalbuminemic,
    albuminDeltaGdl: albuminDelta,
    albuminAdjustmentMeqL: adjustment,
    category,
    occultHagmaUnmasked,
    formulaUsed:
      albuminGdl !== undefined
        ? `AG_corrected = [Na - (Cl + HCO3)] + 2.5 * (4.0 - Albumin) = ${observedAG} + 2.5 * (${baselineAlbumin} - ${albuminGdl}) = ${correctedAG} mEq/L`
        : `AG_observed = Na - (Cl + HCO3) = ${observedAG} mEq/L (Albumin not provided)`,
    interpretation,
    clinicalSignificance,
    etiologies,
    ...(potassiumIncludedAnionGap !== undefined ? { potassiumIncludedAnionGap } : {}),
    ...(guardNotes.length > 0 ? { inputGuardWarning: guardNotes.join(" ") } : {}),
  };
}

// ============================================================================
// 2. WINTER'S FORMULA FOR SECONDARY RESPIRATORY COMPENSATION
// ============================================================================

export interface WintersInput {
  bicarbonateMeqL: number;
  measuredPaco2MmHg: number;
  measuredPh?: number;
}

export type RespiratoryCompensationStatus =
  | "adequate-compensation"
  | "concomitant-respiratory-acidosis"
  | "concomitant-respiratory-alkalosis"
  | "not-metabolic-acidosis";

export interface WintersResult {
  bicarbonateMeqL: number;
  measuredPaco2MmHg: number;
  expectedPaco2: number;
  expectedPaco2Min: number;
  expectedPaco2Max: number;
  status: RespiratoryCompensationStatus;
  statusLabel: string;
  formulaUsed: string;
  clinicalRationale: string;
  differentialDiagnosis: string[];
  actionGuidance: string;
  hendersonHasselbalchCheck?: BloodGasHendersonHasselbalchResult;
  inputGuardWarning?: string;
}

/**
 * Evaluates secondary respiratory compensation in metabolic acidosis using Winter's formula.
 * Expected PaCO2 = (1.5 * [HCO3-]) + 8 +/- 2.
 * Range: [1.5 * HCO3 + 6, 1.5 * HCO3 + 10].
 */
export function evaluateWintersFormula(input: WintersInput): WintersResult {
  const guardNotes: string[] = [];
  const hco3Check = finiteOrFallback(input.bicarbonateMeqL, 24);
  const paco2Check = finiteOrFallback(input.measuredPaco2MmHg, 40);
  if (hco3Check.replaced || paco2Check.replaced) {
    guardNotes.push("Non-finite ABG/bicarbonate input replaced with physiological baseline.");
  }

  let bicarbonateMeqL = hco3Check.value;
  let measuredPaco2MmHg = paco2Check.value;
  if (bicarbonateMeqL <= 0) {
    guardNotes.push(`Non-positive HCO3- (${bicarbonateMeqL} mEq/L) clamped to 1 mEq/L.`);
    bicarbonateMeqL = 1;
  }
  if (measuredPaco2MmHg <= 0) {
    guardNotes.push(`Non-positive PaCO2 (${measuredPaco2MmHg} mmHg) clamped to 5 mmHg.`);
    measuredPaco2MmHg = 5;
  }

  const hhCheck =
    input.measuredPh !== undefined && Number.isFinite(input.measuredPh)
      ? calculateBloodGasHendersonHasselbalch({
          bicarbonateMeqL,
          paco2MmHg: measuredPaco2MmHg,
          measuredPh: input.measuredPh,
        }) ?? undefined
      : undefined;

  const expectedPaco2 = round1(1.5 * bicarbonateMeqL + 8);
  const expectedPaco2Min = round1(1.5 * bicarbonateMeqL + 6);
  const expectedPaco2Max = round1(1.5 * bicarbonateMeqL + 10);

  if (bicarbonateMeqL >= 24) {
    return {
      bicarbonateMeqL,
      measuredPaco2MmHg,
      expectedPaco2,
      expectedPaco2Min,
      expectedPaco2Max,
      status: "not-metabolic-acidosis",
      statusLabel: "Serum Bicarbonate >= 24 mEq/L (Metabolic Acidosis Not Present)",
      formulaUsed: "Winter's formula is validated specifically for metabolic acidosis (HCO3 < 24 mEq/L).",
      clinicalRationale:
        "When serum bicarbonate is normal or elevated, primary metabolic acidosis is absent. If metabolic alkalosis is suspected (HCO3 > 26), expected PaCO2 rises by approximately 0.7 mmHg per 1 mEq/L increase in HCO3.",
      differentialDiagnosis: [
        "Metabolic alkalosis (volume contraction, diuretic use, vomiting, hyperaldosteronism)",
        "Chronic respiratory acidosis with renal bicarbonate compensation",
        "Normal baseline chemistry",
      ],
      actionGuidance:
        "Evaluate clinical volume status, urine chloride, and ABG pH to differentiate metabolic alkalosis from respiratory compensation.",
      ...(hhCheck ? { hendersonHasselbalchCheck: hhCheck } : {}),
      ...(guardNotes.length > 0 ? { inputGuardWarning: guardNotes.join(" ") } : {}),
    };
  }

  let status: RespiratoryCompensationStatus;
  let statusLabel = "";
  let clinicalRationale = "";
  const differentialDiagnosis: string[] = [];
  let actionGuidance = "";

  if (measuredPaco2MmHg >= expectedPaco2Min && measuredPaco2MmHg <= expectedPaco2Max) {
    status = "adequate-compensation";
    statusLabel = "Pure Secondary Respiratory Compensation (Simple Metabolic Acidosis)";
    clinicalRationale = `Measured PaCO2 (${measuredPaco2MmHg} mmHg) falls squarely within the expected Winter's compensatory window (${expectedPaco2Min}–${expectedPaco2Max} mmHg). Alveolar hyperventilation (Kussmaul breathing) is appropriately blowing off CO2 to defend systemic pH.`;
    differentialDiagnosis.push(
      "Uncomplicated metabolic acidosis with intact central respiratory drive and ventilatory mechanics",
    );
    actionGuidance =
      "Maintain support of spontaneous ventilation. Address underlying metabolic acidosis driver (e.g. insulin/fluids for DKA, perfusion restoration for lactic acidosis). Avoid sedative-hypnotics that impair respiratory drive.";
  } else if (measuredPaco2MmHg > expectedPaco2Max) {
    status = "concomitant-respiratory-acidosis";
    statusLabel = "Concomitant Respiratory Acidosis (Relative Alveolar Hypoventilation)";
    clinicalRationale = `Measured PaCO2 (${measuredPaco2MmHg} mmHg) exceeds expected compensatory ceiling (${expectedPaco2Max} mmHg). The patient is hypoventilating relative to metabolic acid burden, creating a severe mixed acid-base disorder that drastically worsens acidemia!`;
    differentialDiagnosis.push(
      "Respiratory muscle exhaustion / ventilatory fatigue from prolonged Kussmaul hyperventilation",
      "Central nervous system depression (sedatives, opioids, encephalopathy, cerebral edema)",
      "Underlying obstructive lung disease (severe COPD, status asthmaticus) limiting hyperventilation",
      "Neuromuscular weakness (myasthenia gravis, Guillain-Barré, severe hypophosphatemia)",
      "Thoracic mechanical restriction (massive abdominal distension, chest wall trauma, pneumothorax)",
    );
    actionGuidance =
      "This pattern calls for prompt assessment of airway patency and ventilatory endurance, evaluation for respiratory muscle fatigue or CNS sedation, and readiness for ventilatory support (NIV or endotracheal intubation) with minute ventilation set high enough to match metabolic compensatory demands.";
  } else {
    status = "concomitant-respiratory-alkalosis";
    statusLabel = "Concomitant Respiratory Alkalosis (Primary Alveolar Hyperventilation)";
    clinicalRationale = `Measured PaCO2 (${measuredPaco2MmHg} mmHg) is lower than expected Winter's floor (${expectedPaco2Min} mmHg). The patient is hyperventilating in excess of what is required to compensate for metabolic acidosis, signaling an independent primary respiratory alkalosis stimulus.`;
    differentialDiagnosis.push(
      "Severe systemic sepsis / Systemic Inflammatory Response Syndrome (SIRS)",
      "Early salicylate (aspirin) toxicity (direct medullary chemoreceptor respiratory center stimulation)",
      "Hepatic encephalopathy / Cirrhosis (elevated progesterone and neural stimulation)",
      "Acute pulmonary embolism / Hypoxemia driving tachypnea",
      "Central nervous system lesion / Intracranial pathology",
      "Severe acute anxiety, psychogenic hyperventilation, or unmanaged severe pain",
      "Pregnancy (high circulating progesterone stimulates respiratory center)",
    );
    actionGuidance =
      "Investigate for occult sepsis, pulmonary embolism, salicylate toxicity, or hepatic dysfunction. Serial lactate and salicylate levels are warranted.";
  }

  return {
    bicarbonateMeqL,
    measuredPaco2MmHg,
    expectedPaco2,
    expectedPaco2Min,
    expectedPaco2Max,
    status,
    statusLabel,
    formulaUsed: `Expected PaCO2 = (1.5 * [HCO3-]) + 8 +/- 2 = (1.5 * ${bicarbonateMeqL}) + 8 +/- 2 = ${expectedPaco2} mmHg (Range: ${expectedPaco2Min} to ${expectedPaco2Max} mmHg)`,
    clinicalRationale,
    differentialDiagnosis,
    actionGuidance,
    ...(hhCheck ? { hendersonHasselbalchCheck: hhCheck } : {}),
    ...(guardNotes.length > 0 ? { inputGuardWarning: guardNotes.join(" ") } : {}),
  };
}

// ============================================================================
// 3. DELTA-DELTA (DELTA GAP / DELTA BICARBONATE) ANALYSIS
// ============================================================================

export interface DeltaDeltaInput {
  correctedAnionGap: number;
  bicarbonateMeqL: number;
}

export type DeltaDeltaCategory =
  | "mixed-hagma-nagma"
  | "pure-hagma"
  | "mixed-hagma-metabolic-alkalosis"
  | "pure-nagma"
  | "normal-acid-base";

export interface DeltaDeltaResult {
  correctedAnionGap: number;
  bicarbonateMeqL: number;
  deltaAnionGap: number;
  deltaBicarbonate: number;
  deltaRatio: number | null;
  predictedBaselineBicarbonate: number;
  category: DeltaDeltaCategory;
  categoryLabel: string;
  formulaUsed: string;
  pathophysiology: string;
  etiologies: string[];
  clinicalSignificance: string;
  inputGuardWarning?: string;
}

/**
 * Calculates Delta-Delta analysis (Delta AG / Delta HCO3) to detect mixed acid-base disorders.
 * Delta AG = Corrected AG - 12 (excess unmeasured anions above baseline).
 * Delta HCO3 = 24 - [HCO3-] (bicarbonate deficit below baseline).
 * Ratio = Delta AG / Delta HCO3.
 *
 * Diagnostic bands:
 * - Ratio < 0.4 to 0.8: Mixed HAGMA + NAGMA (hyperchloremic acidosis).
 * - Ratio 1.0 to 2.0 (and 0.8-1.0 transition): Pure HAGMA (1:1 buffering).
 * - Ratio > 2.0: Mixed HAGMA + concurrent Metabolic Alkalosis.
 */
export function calculateDeltaDelta(input: DeltaDeltaInput): DeltaDeltaResult {
  const agCheck = finiteOrFallback(input.correctedAnionGap, 12);
  const hco3Check = finiteOrFallback(input.bicarbonateMeqL, 24);
  const inputGuardWarning =
    agCheck.replaced || hco3Check.replaced
      ? "Non-finite corrected anion gap or bicarbonate replaced with baseline reference for safe calculation."
      : undefined;

  const correctedAnionGap = agCheck.value;
  const bicarbonateMeqL = hco3Check.value;
  const deltaAG = round1(correctedAnionGap - 12);
  const deltaHCO3 = round1(24 - bicarbonateMeqL);
  const predictedBaselineHCO3 = round1(bicarbonateMeqL + deltaAG);

  // If no high anion gap exists (deltaAG <= 0)
  if (deltaAG <= 0) {
    if (bicarbonateMeqL < 24) {
      return {
        correctedAnionGap,
        bicarbonateMeqL,
        deltaAnionGap: deltaAG,
        deltaBicarbonate: deltaHCO3,
        deltaRatio: null,
        predictedBaselineBicarbonate: predictedBaselineHCO3,
        category: "pure-nagma",
        categoryLabel: "Pure Normal Anion Gap Metabolic Acidosis (NAGMA / Hyperchloremic Acidosis)",
        formulaUsed: `Corrected AG (${correctedAnionGap} mEq/L) <= 12 baseline; Delta AG = 0. Delta HCO3 = 24 - ${bicarbonateMeqL} = ${deltaHCO3} mEq/L.`,
        pathophysiology:
          "There is no elevation in unmeasured organic anions. Acidosis is entirely driven by loss of bicarbonate or retention of chloride, maintaining electroneutrality with a normal anion gap.",
        etiologies: [
          "Gastrointestinal bicarbonate loss (diarrhea, intestinal fistula, ileostomy)",
          "Renal Tubular Acidosis (Type 1 distal, Type 2 proximal, Type 4 hypoaldosteronism)",
          "Rapid high-volume resuscitation with 0.9% Normal Saline (hyperchloremic acidosis)",
          "Carbonic anhydrase inhibitors (acetazolamide, topiramate)",
          "Post-hypocapnic metabolic acidosis",
        ],
        clinicalSignificance:
          "Calculate Urine Anion Gap (Na + K - Cl) to differentiate gastrointestinal bicarbonate loss (negative UAG with high urinary NH4+) from renal tubular acidification defects (positive UAG with impaired NH4+ excretion).",
        ...(inputGuardWarning ? { inputGuardWarning } : {}),
      };
    }

    return {
      correctedAnionGap,
      bicarbonateMeqL,
      deltaAnionGap: deltaAG,
      deltaBicarbonate: deltaHCO3,
      deltaRatio: null,
      predictedBaselineBicarbonate: predictedBaselineHCO3,
      category: "normal-acid-base",
      categoryLabel: "Normal Anion Gap & Normal Bicarbonate (No Acidosis Detected)",
      formulaUsed: `Corrected AG (${correctedAnionGap} mEq/L) <= 12; HCO3 (${bicarbonateMeqL} mEq/L) >= 24.`,
      pathophysiology: "Serum unmeasured anions and bicarbonate are both within physiological limits.",
      etiologies: ["Normal acid-base equilibrium"],
      clinicalSignificance: "No high anion gap or normal anion gap metabolic acidosis present on current panel.",
      ...(inputGuardWarning ? { inputGuardWarning } : {}),
    };
  }

  // Delta AG > 0 (HAGMA is present)
  // Check if deltaHCO3 <= 0 (bicarbonate is normal or elevated despite high anion gap!)
  if (deltaHCO3 <= 0) {
    return {
      correctedAnionGap,
      bicarbonateMeqL,
      deltaAnionGap: deltaAG,
      deltaBicarbonate: deltaHCO3,
      deltaRatio: null,
      predictedBaselineBicarbonate: predictedBaselineHCO3,
      category: "mixed-hagma-metabolic-alkalosis",
      categoryLabel: "Mixed High Anion Gap Metabolic Acidosis + Profound Metabolic Alkalosis",
      formulaUsed: `Delta AG = ${deltaAG} mEq/L, but Delta HCO3 <= 0 (HCO3 is ${bicarbonateMeqL} >= 24 mEq/L). Ratio mathematically undefined/infinite.`,
      pathophysiology:
        "Severe concurrent metabolic alkalosis is so prominent that serum bicarbonate remains normal or elevated despite the accumulation of substantial unmeasured organic acid anions!",
      etiologies: [
        "DKA or Lactic Acidosis in a patient with severe vomiting or gastric suction (massive loss of HCl)",
        "Severe volume contraction alkalosis from aggressive loop diuretic therapy prior to shock/acidosis",
        "Pre-existing chronic hypercapnia with high compensatory renal bicarbonate retention",
        "Milk-alkali syndrome or exogenous sodium bicarbonate infusion concurrent with HAGMA",
      ],
      clinicalSignificance:
        `Predicted baseline bicarbonate is markedly elevated at ${predictedBaselineHCO3} mEq/L (normal ~24 mEq/L). Patient has two powerful opposing metabolic derangements.`,
      ...(inputGuardWarning ? { inputGuardWarning } : {}),
    };
  }

  const deltaRatio = round2(deltaAG / deltaHCO3);

  if (deltaRatio < 0.8) {
    return {
      correctedAnionGap,
      bicarbonateMeqL,
      deltaAnionGap: deltaAG,
      deltaBicarbonate: deltaHCO3,
      deltaRatio,
      predictedBaselineBicarbonate: predictedBaselineHCO3,
      category: "mixed-hagma-nagma",
      categoryLabel: "Mixed High Anion Gap (HAGMA) + Normal Anion Gap (NAGMA / Hyperchloremic) Acidosis",
      formulaUsed: `Delta Ratio = Delta AG / Delta HCO3 = (${correctedAnionGap} - 12) / (24 - ${bicarbonateMeqL}) = ${deltaAG} / ${deltaHCO3} = ${deltaRatio}`,
      pathophysiology:
        "The deficit in bicarbonate (Delta HCO3) is disproportionately greater than the elevation in unmeasured anions (Delta AG). This proves that bicarbonate is being consumed by unmeasured organic acids AND lost directly (or diluted by hyperchloremia).",
      etiologies: [
        "Diabetic Ketoacidosis (DKA) resuscitated with high-volume 0.9% Normal Saline (hyperchloremic component)",
        "Diabetic Ketoacidosis with significant urinary loss of ketoacid anions (ketoaciduria)",
        "Lactic acidosis or DKA co-occurring with severe gastrointestinal diarrhea",
        "Uremic acidosis co-occurring with Renal Tubular Acidosis (RTA)",
        "Early toxic alcohol poisoning with concurrent saline fluid loading",
      ],
      clinicalSignificance:
        `Predicted baseline bicarbonate is subnormal (${predictedBaselineHCO3} mEq/L vs normal 24 mEq/L), confirming an occult hyperchloremic non-gap acidosis co-existing with the high anion gap process. Switch crystalloid from 0.9% Normal Saline to balanced crystalloid (e.g. Plasma-Lyte, Lactated Ringer's) to prevent worsening hyperchloremic acidosis.`,
      ...(inputGuardWarning ? { inputGuardWarning } : {}),
    };
  }

  if (deltaRatio > 2.0) {
    return {
      correctedAnionGap,
      bicarbonateMeqL,
      deltaAnionGap: deltaAG,
      deltaBicarbonate: deltaHCO3,
      deltaRatio,
      predictedBaselineBicarbonate: predictedBaselineHCO3,
      category: "mixed-hagma-metabolic-alkalosis",
      categoryLabel: "Mixed High Anion Gap Metabolic Acidosis (HAGMA) + Concurrent Metabolic Alkalosis",
      formulaUsed: `Delta Ratio = Delta AG / Delta HCO3 = (${correctedAnionGap} - 12) / (24 - ${bicarbonateMeqL}) = ${deltaAG} / ${deltaHCO3} = ${deltaRatio}`,
      pathophysiology:
        "The increase in anion gap (Delta AG) is disproportionately greater than the drop in bicarbonate (Delta HCO3). This indicates that bicarbonate was either pre-existing elevated or is being regenerated through loss of protons/chloride.",
      etiologies: [
        "DKA or Lactic Acidosis with profuse vomiting or nasogastric suction (loss of gastric HCl)",
        "Concurrent or preceding loop/thiazide diuretic therapy causing contraction alkalosis",
        "Chronic baseline respiratory acidosis (e.g. severe COPD) with chronic compensatory bicarbonate retention",
        "Hyperaldosteronism or severe hypokalemia stimulating renal proton secretion",
      ],
      clinicalSignificance:
        `Predicted baseline bicarbonate is elevated at ${predictedBaselineHCO3} mEq/L (normal 24 mEq/L), unmasking a concurrent metabolic alkalosis. As the organic acidosis resolves, the patient risks severe post-acidosis rebound metabolic alkalemia!`,
      ...(inputGuardWarning ? { inputGuardWarning } : {}),
    };
  }

  return {
    correctedAnionGap,
    bicarbonateMeqL,
    deltaAnionGap: deltaAG,
    deltaBicarbonate: deltaHCO3,
    deltaRatio,
    predictedBaselineBicarbonate: predictedBaselineHCO3,
    category: "pure-hagma",
    categoryLabel: "Pure High Anion Gap Metabolic Acidosis (HAGMA)",
    formulaUsed: `Delta Ratio = Delta AG / Delta HCO3 = (${correctedAnionGap} - 12) / (24 - ${bicarbonateMeqL}) = ${deltaAG} / ${deltaHCO3} = ${deltaRatio}`,
    pathophysiology:
      "There is near 1:1 stoichiometric buffering between the generation of excess unmeasured organic acid anions and the titrating reduction in serum bicarbonate.",
    etiologies: [
      "Uncomplicated Diabetic Ketoacidosis (DKA) prior to large-volume saline loading",
      "Pure Lactic Acidosis (sepsis, cardiogenic shock, mesenteric ischemia, severe seizure)",
      "Alcoholic Ketoacidosis (AKA) or Starvation Ketosis",
      "Acute toxic alcohol ingestion (Methanol, Ethylene glycol) prior to significant renal clearance",
    ],
    clinicalSignificance:
      `Predicted baseline bicarbonate is near normal (${predictedBaselineHCO3} mEq/L, reference 22–26 mEq/L). No significant co-existing NAGMA or metabolic alkalosis identified.`,
    ...(inputGuardWarning ? { inputGuardWarning } : {}),
  };
}

// ============================================================================
// 4. HYPONATREMIA & OSMOTIC DEMYELINATION SYNDROME (ODS) ENGINE
// ============================================================================

export type VolumeStatus = "hypovolemic" | "euvolemic" | "hypervolemic";
export type PatientSex = "male" | "female";

export interface HyponatremiaTriageInput {
  serumSodiumMeqL: number;
  volumeStatus?: VolumeStatus;
  urineSodiumMeqL?: number;
  urineOsmolalityMosmKg?: number;
  serumOsmolalityMosmKg?: number;
  serumPotassiumMeqL?: number;
  durationHours?: number;
  isMalnourished?: boolean;
  hasAdvancedLiverDisease?: boolean;
  hasChronicAlcoholism?: boolean;
}

export type HyponatremiaTonicity =
  | "hypotonic"
  | "isotonic-pseudohyponatremia"
  | "hypertonic-translocational";

export interface HyponatremiaEvaluationResult {
  serumSodiumMeqL: number;
  hyponatremiaSeverity: "mild" | "moderate" | "severe" | "normonatremic" | "hypernatremic";
  isChronicOrUnknownDuration: boolean;
  isHighRiskForOds: boolean;
  highRiskFactors: string[];
  safeCorrectionCeiling24h: number;
  etiologyCategory: string;
  etiologyDetails: string;
  urineFindingsSummary: string;
  odsPathophysiologySummary: string;
  clinicalSafeguards: string[];
  tonicityClassification?: HyponatremiaTonicity;
  inputGuardWarning?: string;
}

/**
 * Diagnostic triage of hyponatremia and Osmotic Demyelination Syndrome (ODS) risk stratification.
 * Enforces strict non-prescriptive CDS guidance for maximum 24h sodium elevation limits.
 */
export function evaluateHyponatremia(input: HyponatremiaTriageInput): HyponatremiaEvaluationResult {
  const guardNotes: string[] = [];
  const naCheck = finiteOrFallback(input.serumSodiumMeqL, 135);
  if (naCheck.replaced) {
    guardNotes.push("Non-finite serum sodium replaced with normonatremic baseline.");
  }

  let serumSodiumMeqL = naCheck.value;
  if (serumSodiumMeqL <= 0) {
    guardNotes.push(`Non-positive serum sodium (${serumSodiumMeqL} mEq/L) clamped to 80 mEq/L.`);
    serumSodiumMeqL = 80;
  }

  const {
    volumeStatus,
    urineSodiumMeqL,
    urineOsmolalityMosmKg,
    serumOsmolalityMosmKg,
    serumPotassiumMeqL,
    durationHours,
    isMalnourished,
    hasAdvancedLiverDisease,
    hasChronicAlcoholism,
  } = input;

  let severity: "mild" | "moderate" | "severe" | "normonatremic" | "hypernatremic" = "normonatremic";
  if (serumSodiumMeqL >= 146) {
    severity = "hypernatremic";
  } else if (serumSodiumMeqL >= 135) {
    severity = "normonatremic";
  } else if (serumSodiumMeqL >= 130) {
    severity = "mild";
  } else if (serumSodiumMeqL >= 120) {
    severity = "moderate";
  } else {
    severity = "severe";
  }

  const isChronicOrUnknownDuration =
    durationHours === undefined || !Number.isFinite(durationHours) || durationHours > 48;
  const highRiskFactors: string[] = [];

  if (isChronicOrUnknownDuration) {
    highRiskFactors.push("Chronic duration (> 48 hours or unknown duration allows brain organic osmolyte adaptation)");
  }
  if (serumSodiumMeqL < 105) {
    highRiskFactors.push(`Profound baseline hyponatremia (${serumSodiumMeqL} mEq/L < 105 mEq/L)`);
  }
  if (isMalnourished) {
    highRiskFactors.push("Severe malnutrition / cachexia / depleted osmolyte substrates");
  }
  if (hasAdvancedLiverDisease) {
    highRiskFactors.push("Advanced liver cirrhosis / end-stage liver disease");
  }
  if (hasChronicAlcoholism) {
    highRiskFactors.push("Chronic alcohol use disorder / hypokalemia / hypomagnesemia");
  }
  if (serumPotassiumMeqL !== undefined && Number.isFinite(serumPotassiumMeqL) && serumPotassiumMeqL < 3.0) {
    highRiskFactors.push(`Severe concomitant hypokalemia (${serumPotassiumMeqL} mEq/L; K+ repletion elevates serum Na+)`);
  }

  const isHighRiskForOds = highRiskFactors.length > 0 && severity !== "normonatremic" && severity !== "hypernatremic";
  const safeCorrectionCeiling24h = isHighRiskForOds ? 6 : 8;

  let tonicityClassification: HyponatremiaTonicity | undefined;
  let tonicityPrefix = "";
  if (serumOsmolalityMosmKg !== undefined && Number.isFinite(serumOsmolalityMosmKg) && serumOsmolalityMosmKg > 0) {
    if (serumOsmolalityMosmKg < 275) {
      tonicityClassification = "hypotonic";
    } else if (serumOsmolalityMosmKg <= 295) {
      tonicityClassification = "isotonic-pseudohyponatremia";
      tonicityPrefix = `Isotonic pseudohyponatremia (Serum Osm ${serumOsmolalityMosmKg} mOsm/kg; evaluate for severe hypertriglyceridemia or paraproteinemia; direct ion-selective electrode unaffected). `;
    } else {
      tonicityClassification = "hypertonic-translocational";
      tonicityPrefix = `Hypertonic translocational hyponatremia (Serum Osm ${serumOsmolalityMosmKg} mOsm/kg; osmotic water shift from hyperglycemia or mannitol—apply Katz/Hillier glucose correction [PMID 4763428, PMID 10225241]). `;
    }
  }

  // Etiological volume differentiation
  let etiologyCategory = "Undifferentiated Hyponatremia";
  let etiologyDetails = "Requires clinical assessment of extracellular fluid volume, urine sodium, and urine osmolality.";
  let urineFindingsSummary = "Urine electrolytes pending or unmeasured.";

  if (tonicityClassification === "isotonic-pseudohyponatremia") {
    etiologyCategory = "Isotonic Pseudohyponatremia (Laboratory Electrolyte Exclusion Artifact)";
    etiologyDetails =
      "Measured plasma osmolality is normal (275–295 mOsm/kg). Indirect potentiometry dilutes plasma water displaced by marked lipids or paraproteins; water-phase sodium activity is normal.";
  } else if (tonicityClassification === "hypertonic-translocational") {
    etiologyCategory = "Hypertonic Translocational Hyponatremia (Effective Osmole Shift)";
    etiologyDetails =
      "Measured plasma osmolality is elevated (> 295 mOsm/kg) from impermeant extracellular osmoles (hyperglycemia, mannitol, hypertonic contrast) drawing intracellular water into plasma.";
  } else if (volumeStatus === "hypovolemic") {
    etiologyCategory = "Hypovolemic Hyponatremia (Volume Depletion)";
    if (urineSodiumMeqL !== undefined && Number.isFinite(urineSodiumMeqL)) {
      if (urineSodiumMeqL < 20) {
        etiologyDetails =
          "Extrarenal sodium losses (vomiting, diarrhea, third-spacing, burns). Kidneys are avidly conserving sodium (UNa < 20 mEq/L).";
      } else {
        etiologyDetails =
          "Renal sodium wasting (diuretic use, Cerebral Salt Wasting [CSW], mineralocorticoid deficiency / Addison's, salt-losing nephropathy). UNa is elevated (> 20 mEq/L) despite volume contraction.";
      }
    } else {
      etiologyDetails =
        "Volume contracted state. Non-osmotic ADH secretion is stimulated by baroreceptors to defend circulatory perfusion, overriding plasma osmolality.";
    }
  } else if (volumeStatus === "euvolemic") {
    etiologyCategory = "Euvolemic Hyponatremia (Normal Extracellular Volume)";
    if (urineOsmolalityMosmKg !== undefined && Number.isFinite(urineOsmolalityMosmKg) && urineOsmolalityMosmKg < 100) {
      etiologyDetails =
        "Maximally dilute urine (UOsm < 100 mOsm/kg): Suggests primary polydipsia, beer potomania, or very low solute intake ('tea and toast' diet). ADH is appropriately suppressed.";
    } else {
      etiologyDetails =
        "Inappropriately concentrated urine (UOsm > 100 mOsm/kg, usually > 300 mOsm/kg; UNa > 30 mEq/L): Highly consistent with SIADH (Syndrome of Inappropriate Antidiuretic Hormone secretion). Rule out secondary adrenal insufficiency and severe hypothyroidism.";
    }
  } else if (volumeStatus === "hypervolemic") {
    etiologyCategory = "Hypervolemic Hyponatremia (Volume Expansion with Edema/Ascites)";
    if (urineSodiumMeqL !== undefined && Number.isFinite(urineSodiumMeqL) && urineSodiumMeqL < 20) {
      etiologyDetails =
        "Effective arterial blood volume underfilling (Congestive Heart Failure, Cirrhosis, Nephrotic Syndrome). Splanchnic/arterial pooling triggers intense baroreceptor-mediated non-osmotic ADH secretion and renal sodium avidity.";
    } else {
      etiologyDetails =
        "Advanced renal failure (Acute Kidney Injury or end-stage Chronic Kidney Disease) with impaired free water clearance due to markedly reduced nephron filtration mass.";
    }
  }

  if (tonicityPrefix && tonicityClassification !== "hypotonic") {
    etiologyDetails = `${tonicityPrefix}${etiologyDetails}`;
  }

  if (
    (urineSodiumMeqL !== undefined && Number.isFinite(urineSodiumMeqL)) ||
    (urineOsmolalityMosmKg !== undefined && Number.isFinite(urineOsmolalityMosmKg))
  ) {
    const parts: string[] = [];
    if (urineSodiumMeqL !== undefined && Number.isFinite(urineSodiumMeqL)) parts.push(`Urine Na: ${urineSodiumMeqL} mEq/L`);
    if (urineOsmolalityMosmKg !== undefined && Number.isFinite(urineOsmolalityMosmKg)) {
      parts.push(`Urine Osm: ${urineOsmolalityMosmKg} mOsm/kg`);
    }
    urineFindingsSummary = parts.join(", ");
  }

  const odsPathophysiologySummary =
    "In chronic hyponatremia (>48h), astrocytes extrude organic intracellular osmoles (myoinositol, glutamate, taurine) to mitigate cerebral edema. Rapid hypertonic correction creates a hyperosmolar extracellular environment faster than brain cells can resynthesize or transport back organic osmoles. This drives acute oligodendrocyte dehydration, blood-brain barrier disruption, and non-inflammatory demyelination of crossing pontine tracts (pseudobulbar palsy, quadriplegia, locked-in syndrome, coma).";

  const clinicalSafeguards = [
    `CRITICAL ODS SAFETY CEILING: Serum sodium must NOT rise by more than ${safeCorrectionCeiling24h} mEq/L in any 24-hour period.`,
    "Monitor serum sodium every 2 hours during active hypertonic therapy, and every 4 hours during fluid restriction.",
    "Be alert for sudden 'water autodiresis' (urine output > 400-500 mL/h with dilute urine): when the underlying stimulus (hypovolemia, SIADH drug) resolves, rapid free-water clearance can cause catastrophic overcorrection within hours!",
    "If overcorrection threatens, literature supports prompt initiation of the Desmopressin (DDAVP) clamp and D5W re-lowering strategy.",
  ];

  return {
    serumSodiumMeqL,
    hyponatremiaSeverity: severity,
    isChronicOrUnknownDuration,
    isHighRiskForOds,
    highRiskFactors,
    safeCorrectionCeiling24h,
    etiologyCategory,
    etiologyDetails,
    urineFindingsSummary,
    odsPathophysiologySummary,
    clinicalSafeguards,
    ...(tonicityClassification ? { tonicityClassification } : {}),
    ...(guardNotes.length > 0 ? { inputGuardWarning: guardNotes.join(" ") } : {}),
  };
}

// ============================================================================
// 5. ADROGUÉ-MADIAS KINETICS & INFUSATE SODIUM PREDICTIONS
// ============================================================================

export type InfusateType =
  | "3-percent-saline"
  | "0.9-percent-saline"
  | "lactated-ringers"
  | "0.45-percent-saline"
  | "d5w";

export interface InfusateProfile {
  type: InfusateType;
  name: string;
  sodiumMeqL: number;
  potassiumMeqL: number;
  tonicity: string;
  osmolarityMosmL: number;
  clinicalNotes: string;
}

export const INFUSATE_PROFILES: Record<InfusateType, InfusateProfile> = {
  "3-percent-saline": {
    type: "3-percent-saline",
    name: "3% Hypertonic Saline (NaCl)",
    sodiumMeqL: 513,
    potassiumMeqL: 0,
    tonicity: "Hypertonic (513 mEq/L Na)",
    osmolarityMosmL: 1026,
    clinicalNotes:
      "Indicated for severe symptomatic hyponatremia with acute seizures, coma, or impending brainstem herniation. Carries significant risk of ODS if infusion rate is unmonitored.",
  },
  "0.9-percent-saline": {
    type: "0.9-percent-saline",
    name: "0.9% Normal Saline (NaCl)",
    sodiumMeqL: 154,
    potassiumMeqL: 0,
    tonicity: "Isotonic (154 mEq/L Na)",
    osmolarityMosmL: 308,
    clinicalNotes:
      "Indicated for hypovolemic hyponatremia. Paradoxical hazard: In SIADH, infusing 0.9% normal saline often WORSENS hyponatremia because the kidney excretes sodium in concentrated urine while retaining the free water!",
  },
  "lactated-ringers": {
    type: "lactated-ringers",
    name: "Lactated Ringer's Solution",
    sodiumMeqL: 130,
    potassiumMeqL: 4,
    tonicity: "Near-isotonic / slightly hypotonic (130 mEq/L Na + 4 mEq/L K)",
    osmolarityMosmL: 273,
    clinicalNotes:
      "Balanced crystalloid with lactate buffer. Potassium content (4 mEq/L) contributes to effective extracellular cation concentration.",
  },
  "0.45-percent-saline": {
    type: "0.45-percent-saline",
    name: "0.45% Half-Normal Saline",
    sodiumMeqL: 77,
    potassiumMeqL: 0,
    tonicity: "Hypotonic (77 mEq/L Na)",
    osmolarityMosmL: 154,
    clinicalNotes:
      "Supplies approximately 500 mL of electrolyte-free water per liter. Used in hypernatremia correction or for controlled maintenance.",
  },
  d5w: {
    type: "d5w",
    name: "5% Dextrose in Water (D5W)",
    sodiumMeqL: 0,
    potassiumMeqL: 0,
    tonicity: "Hypotonic in vivo (0 mEq/L Na, 100% free water once glucose metabolized)",
    osmolarityMosmL: 252,
    clinicalNotes:
      "Provides pure free water. Mainstay of emergency re-lowering protocols when serum sodium has risen too rapidly during hyponatremia correction.",
  },
};

export interface AdrogueMadiasInput {
  serumSodiumMeqL: number;
  serumPotassiumMeqL?: number;
  weightKg: number;
  sex: PatientSex;
  isGeriatric?: boolean;
  infusateType: InfusateType;
  targetDeltaNa24h?: number;
  infusionVolumeMl?: number;
  isHighRiskOds?: boolean;
}

export interface AdrogueMadiasResult {
  infusate: InfusateProfile;
  totalBodyWaterLiters: number;
  tbwFactor: number;
  deltaNaPerLiter: number;
  volumeNeededForTargetMl?: number;
  hourlyRateFor24hTargetMlH?: number;
  predictedDeltaNaForVolume?: number;
  exceedsSafe24hCeiling: boolean;
  safe24hCeilingMeqL: number;
  odsWarning: string | null;
  formulaUsed: string;
  inputGuardWarning?: string;
}

/**
 * Calculates projected change in serum sodium using the Adrogué-Madias formula.
 * Delta Na per 1 L infusate = (Infusate_Na + Infusate_K - Serum_Na) / (Total Body Water + 1).
 * TBW factors:
 * - Non-elderly male: 0.6 * weight
 * - Non-elderly female: 0.5 * weight
 * - Geriatric male (>= 65): 0.5 * weight
 * - Geriatric female (>= 65): 0.45 * weight
 */
export function calculateAdrogueMadias(input: AdrogueMadiasInput): AdrogueMadiasResult {
  const guardNotes: string[] = [];
  const naCheck = finiteOrFallback(input.serumSodiumMeqL, 135);
  const wtCheck = finiteOrFallback(input.weightKg, 70);
  if (naCheck.replaced) guardNotes.push("Non-finite serum sodium replaced with 135 mEq/L.");
  if (wtCheck.replaced) guardNotes.push("Non-finite body weight replaced with 70 kg.");

  let serumSodiumMeqL = naCheck.value;
  if (serumSodiumMeqL <= 0) {
    guardNotes.push(`Non-positive serum sodium (${serumSodiumMeqL} mEq/L) clamped to 80 mEq/L.`);
    serumSodiumMeqL = 80;
  }

  let weightKg = wtCheck.value;
  if (weightKg <= 0) {
    guardNotes.push(`Non-positive body weight (${weightKg} kg) clamped to 1 kg to prevent TBW divide-by-zero.`);
    weightKg = 1;
  }

  const {
    sex,
    isGeriatric,
    infusateType,
    targetDeltaNa24h,
    infusionVolumeMl,
    isHighRiskOds,
  } = input;

  let tbwFactor = 0.6;
  if (sex === "female") {
    tbwFactor = isGeriatric ? 0.45 : 0.5;
  } else {
    tbwFactor = isGeriatric ? 0.5 : 0.6;
  }

  const tbw = Math.max(0.5, round1(weightKg * tbwFactor));
  const infusate = INFUSATE_PROFILES[infusateType];
  const infusateCations = infusate.sodiumMeqL + infusate.potassiumMeqL;

  // Delta Na per 1 liter = (Infusate cations - Serum Na) / (TBW + 1)
  const deltaNaPerLiter = round2((infusateCations - serumSodiumMeqL) / (tbw + 1));

  const safe24hCeilingMeqL = isHighRiskOds ? 6 : 8;

  let volumeNeededForTargetMl: number | undefined;
  let hourlyRateFor24hTargetMlH: number | undefined;

  if (targetDeltaNa24h !== undefined && Number.isFinite(targetDeltaNa24h) && deltaNaPerLiter !== 0) {
    const volumeLiters = targetDeltaNa24h / deltaNaPerLiter;
    if (volumeLiters > 0) {
      volumeNeededForTargetMl = Math.round(volumeLiters * 1000);
      hourlyRateFor24hTargetMlH = round1(volumeNeededForTargetMl / 24);
    }
  }

  let predictedDeltaNaForVolume: number | undefined;
  let exceedsSafe24hCeiling = false;
  let odsWarning: string | null = null;

  if (infusionVolumeMl !== undefined && Number.isFinite(infusionVolumeMl)) {
    const safeVolumeMl = Math.max(0, infusionVolumeMl);
    if (infusionVolumeMl < 0) {
      guardNotes.push(`Negative infusion volume (${infusionVolumeMl}) clamped to 0.`);
    }
    predictedDeltaNaForVolume = round1(deltaNaPerLiter * (safeVolumeMl / 1000));
    if (predictedDeltaNaForVolume > safe24hCeilingMeqL) {
      exceedsSafe24hCeiling = true;
      odsWarning = `CRITICAL ODS ALERT: Projected sodium rise of +${predictedDeltaNaForVolume} mEq/L from ${safeVolumeMl} mL of ${infusate.name} exceeds the safe 24-hour ceiling (${safe24hCeilingMeqL} mEq/L)! Rapid correction risks irreversible osmotic demyelination syndrome.`;
    }
  } else if (targetDeltaNa24h !== undefined && Number.isFinite(targetDeltaNa24h) && targetDeltaNa24h > safe24hCeilingMeqL) {
    exceedsSafe24hCeiling = true;
    odsWarning = `Target correction of +${targetDeltaNa24h} mEq/L exceeds the safe 24-hour ceiling (${safe24hCeilingMeqL} mEq/L). Standard recommendations cap total 24h elevation at <= 8 mEq/L (<= 6 mEq/L in high-risk patients).`;
  }

  return {
    infusate,
    totalBodyWaterLiters: tbw,
    tbwFactor,
    deltaNaPerLiter,
    volumeNeededForTargetMl,
    hourlyRateFor24hTargetMlH,
    predictedDeltaNaForVolume,
    exceedsSafe24hCeiling,
    safe24hCeilingMeqL,
    odsWarning,
    formulaUsed: `Delta Na per 1 L = (Infusate_Na [${infusate.sodiumMeqL}] + Infusate_K [${infusate.potassiumMeqL}] - Serum_Na [${serumSodiumMeqL}]) / (TBW [${tbw} L] + 1) = ${deltaNaPerLiter} mEq/L`,
    ...(guardNotes.length > 0 ? { inputGuardWarning: guardNotes.join(" ") } : {}),
  };
}

// ============================================================================
// 5A. SERUM OSMOLAL GAP & HYPERGLYCEMIA-CORRECTED SODIUM
// ============================================================================

export interface OsmolalGapInput {
  measuredOsmolalityMosmKg: number;
  sodiumMeqL: number;
  glucoseMgDl: number;
  bunMgDl: number;
  ethanolMgDl?: number;
  ethanolDivisor?: 4.6 | 3.7;
}

export interface OsmolalGapResult {
  measuredOsmolalityMosmKg: number;
  calculatedOsmolalityMosmKg: number;
  osmolalGapMosmKg: number;
  ethanolContributionMosmKg: number;
  ethanolDivisorUsed: 4.6 | 3.7;
  category: "normal" | "borderline" | "elevated";
  interpretation: string;
  formulaUsed: string;
  differentialToxicAlcohols: string[];
}

/**
 * Computes calculated serum osmolality and osmolal gap for toxic alcohol / unmeasured osmole evaluation.
 * Calculated Osm = 2 * Na + Glucose / 18 + BUN / 2.8 + Ethanol / divisor (default 4.6 theoretical; 3.7 empirical).
 * Returns null if any input is non-finite or physiologically invalid (Na <= 0, negative solutes, measuredOsm <= 0).
 */
export function calculateOsmolalGap(input: OsmolalGapInput): OsmolalGapResult | null {
  const {
    measuredOsmolalityMosmKg,
    sodiumMeqL,
    glucoseMgDl,
    bunMgDl,
    ethanolMgDl = 0,
    ethanolDivisor = 4.6,
  } = input;

  if (
    !Number.isFinite(measuredOsmolalityMosmKg) ||
    !Number.isFinite(sodiumMeqL) ||
    !Number.isFinite(glucoseMgDl) ||
    !Number.isFinite(bunMgDl) ||
    !Number.isFinite(ethanolMgDl) ||
    measuredOsmolalityMosmKg <= 0 ||
    sodiumMeqL <= 0 ||
    glucoseMgDl < 0 ||
    bunMgDl < 0 ||
    ethanolMgDl < 0
  ) {
    return null;
  }

  const divisor: 4.6 | 3.7 = ethanolDivisor === 3.7 ? 3.7 : 4.6;
  const ethanolContributionMosmKg = round1(ethanolMgDl > 0 ? ethanolMgDl / divisor : 0);
  const rawCalculated = 2 * sodiumMeqL + glucoseMgDl / 18 + bunMgDl / 2.8 + (ethanolMgDl > 0 ? ethanolMgDl / divisor : 0);
  const calculatedOsmolalityMosmKg = round1(rawCalculated);
  const osmolalGapMosmKg = round1(measuredOsmolalityMosmKg - calculatedOsmolalityMosmKg);

  let category: OsmolalGapResult["category"] = "normal";
  let interpretation =
    "Normal serum osmolal gap (<= 10 mOsm/kg). Note: late toxic alcohol presentation can exhibit a normal osmolal gap alongside severe HAGMA once parent alcohol has been oxidized to organic acids.";

  if (osmolalGapMosmKg >= 15) {
    category = "elevated";
    interpretation = `Significantly elevated osmolal gap (${osmolalGapMosmKg} mOsm/kg >= 15 mOsm/kg), strongly suggesting unmeasured low-molecular-weight active osmoles (methanol, ethylene glycol, isopropanol, propylene glycol, or mannitol).`;
  } else if (osmolalGapMosmKg > 10) {
    category = "borderline";
    interpretation = `Borderline elevated osmolal gap (${osmolalGapMosmKg} mOsm/kg, 10–14.9 mOsm/kg). Correlate with corrected anion gap, ketonemia, lactic acid, and alcohol dehydrogenase inhibitor considerations.`;
  }

  return {
    measuredOsmolalityMosmKg,
    calculatedOsmolalityMosmKg,
    osmolalGapMosmKg,
    ethanolContributionMosmKg,
    ethanolDivisorUsed: divisor,
    category,
    interpretation,
    formulaUsed: `Osm_calc = 2*${sodiumMeqL} + ${glucoseMgDl}/18 + ${bunMgDl}/2.8${ethanolMgDl > 0 ? ` + ${ethanolMgDl}/${divisor}` : ""} = ${calculatedOsmolalityMosmKg} mOsm/kg; Gap = ${measuredOsmolalityMosmKg} - ${calculatedOsmolalityMosmKg} = ${osmolalGapMosmKg} mOsm/kg`,
    differentialToxicAlcohols: [
      "Methanol (oxidized via ADH/ALDH to formic acid -> retinal/optic nerve toxicity + severe HAGMA)",
      "Ethylene glycol (oxidized to glycolic and oxalic acids -> calcium oxalate crystalluria + AKI + severe HAGMA)",
      "Isopropanol (oxidized to acetone -> ketosis/ketonuria with osmolar gap and WITHOUT HAGMA)",
      "Propylene glycol (IV lorazepam/phenobarbital/etomidate solvent -> lactic acidosis + elevated osmolar gap)",
    ],
  };
}

export interface HyperglycemiaSodiumResult {
  measuredSodiumMeqL: number;
  glucoseMgDl: number;
  katzCorrectedSodiumMeqL: number;
  hillierCorrectedSodiumMeqL: number;
  recommendedCorrectedSodiumMeqL: number;
  formulaNote: string;
}

/**
 * Corrects serum sodium for osmotic water translocation induced by hyperglycemia.
 * - Katz (1973, PMID 4763428): +1.6 mEq/L per 100 mg/dL glucose above 100 mg/dL.
 * - Hillier (1999, PMID 10225241): +2.4 mEq/L per 100 mg/dL glucose above 100 mg/dL (better fit when glucose > 400 mg/dL).
 */
export function calculateHyperglycemiaCorrectedSodium(
  measuredSodiumMeqL: number,
  glucoseMgDl: number,
): HyperglycemiaSodiumResult | null {
  if (!Number.isFinite(measuredSodiumMeqL) || !Number.isFinite(glucoseMgDl) || measuredSodiumMeqL <= 0 || glucoseMgDl < 0) {
    return null;
  }
  const excessGlucoseSteps = Math.max(0, (glucoseMgDl - 100) / 100);
  const katzCorrectedSodiumMeqL = round1(measuredSodiumMeqL + 1.6 * excessGlucoseSteps);
  const hillierCorrectedSodiumMeqL = round1(measuredSodiumMeqL + 2.4 * excessGlucoseSteps);
  const recommendedCorrectedSodiumMeqL =
    glucoseMgDl > 400 ? hillierCorrectedSodiumMeqL : katzCorrectedSodiumMeqL;

  return {
    measuredSodiumMeqL,
    glucoseMgDl,
    katzCorrectedSodiumMeqL,
    hillierCorrectedSodiumMeqL,
    recommendedCorrectedSodiumMeqL,
    formulaNote:
      glucoseMgDl > 400
        ? "Glucose > 400 mg/dL: Hillier 2.4 mEq/L factor per 100 mg/dL excess glucose preferred (PMID 10225241); Katz 1.6 factor shown for reference (PMID 4763428)."
        : "Glucose <= 400 mg/dL: Katz 1.6 mEq/L factor per 100 mg/dL excess glucose above 100 mg/dL applied (PMID 4763428).",
  };
}

// ============================================================================
// 5B. HENDERSON-HASSELBALCH IONIZATION, URINARY ION TRAPPING & GASTRIC pH
// ============================================================================

export type IonizableDrugClass = "weak-acid" | "weak-base";

export interface HendersonHasselbalchIonizationInput {
  pKa: number;
  pH: number;
  drugClass: IonizableDrugClass;
  referenceCompartmentPh?: number;
}

export interface HendersonHasselbalchIonizationResult {
  pKa: number;
  pH: number;
  drugClass: IonizableDrugClass;
  referenceCompartmentPh: number;
  ionizedFraction: number;
  unionizedFraction: number;
  ionizedPercent: number;
  unionizedPercent: number;
  logIonizedToUnionizedRatio: number;
  ionizedToUnionizedRatio: number;
  aqueousSolubilityMultiplier: number;
  compartmentToReferenceTotalRatio: number;
  formulaUsed: string;
}

function safePow10(exp: number): number {
  const clamped = Math.max(-15, Math.min(15, exp));
  return Math.pow(10, clamped);
}

/**
 * Exact Henderson-Hasselbalch ionization and transmembrane equilibrium partitioning calculator.
 * - Weak acids (HA <-> H+ + A-): ionized fraction f_i = 1 / (1 + 10^(pKa - pH)); unionized f_u = 1 / (1 + 10^(pH - pKa)).
 * - Weak bases (BH+ <-> B + H+): ionized fraction f_i = 1 / (1 + 10^(pH - pKa)); unionized f_u = 1 / (1 + 10^(pKa - pH)).
 * - Aqueous solubility multiplier S(pH)/S0 = 1 + 10^logRatio = 1 / f_u.
 * - Compartment-to-reference total equilibrium ratio assumes passive equilibration of unionized species across membranes.
 */
export function calculateHendersonHasselbalchIonization(
  input: HendersonHasselbalchIonizationInput,
): HendersonHasselbalchIonizationResult | null {
  const { pKa, pH, drugClass, referenceCompartmentPh = 7.4 } = input;
  if (
    !Number.isFinite(pKa) ||
    !Number.isFinite(pH) ||
    !Number.isFinite(referenceCompartmentPh) ||
    pH < 0 ||
    pH > 14 ||
    referenceCompartmentPh < 0 ||
    referenceCompartmentPh > 14 ||
    pKa < -5 ||
    pKa > 18
  ) {
    return null;
  }

  const logRatio = drugClass === "weak-acid" ? pH - pKa : pKa - pH;
  const refLogRatio = drugClass === "weak-acid" ? referenceCompartmentPh - pKa : pKa - referenceCompartmentPh;

  const ionizedFraction = 1 / (1 + safePow10(-logRatio));
  const unionizedFraction = 1 / (1 + safePow10(logRatio));
  const ionizedToUnionizedRatio = safePow10(logRatio);
  const aqueousSolubilityMultiplier = 1 + ionizedToUnionizedRatio;
  const refSolubilityMultiplier = 1 + safePow10(refLogRatio);
  const compartmentToReferenceTotalRatio = aqueousSolubilityMultiplier / refSolubilityMultiplier;

  return {
    pKa,
    pH,
    drugClass,
    referenceCompartmentPh,
    ionizedFraction: round4(ionizedFraction),
    unionizedFraction: round4(unionizedFraction),
    ionizedPercent: round2(ionizedFraction * 100),
    unionizedPercent: round2(unionizedFraction * 100),
    logIonizedToUnionizedRatio: round2(logRatio),
    ionizedToUnionizedRatio: ionizedToUnionizedRatio >= 100 ? Math.round(ionizedToUnionizedRatio * 10) / 10 : round4(ionizedToUnionizedRatio),
    aqueousSolubilityMultiplier:
      aqueousSolubilityMultiplier >= 100 ? Math.round(aqueousSolubilityMultiplier * 10) / 10 : round4(aqueousSolubilityMultiplier),
    compartmentToReferenceTotalRatio:
      compartmentToReferenceTotalRatio >= 100
        ? Math.round(compartmentToReferenceTotalRatio * 10) / 10
        : round4(compartmentToReferenceTotalRatio),
    formulaUsed:
      drugClass === "weak-acid"
        ? `Weak Acid: f_i = 1 / (1 + 10^(pKa [${pKa}] - pH [${pH}])) = ${round4(ionizedFraction)}`
        : `Weak Base: f_i = 1 / (1 + 10^(pH [${pH}] - pKa [${pKa}])) = ${round4(ionizedFraction)}`,
  };
}

export interface BloodGasHendersonHasselbalchInput {
  bicarbonateMeqL: number;
  paco2MmHg: number;
  measuredPh?: number;
}

export interface BloodGasHendersonHasselbalchResult {
  expectedPh: number;
  expectedHydrogenIonNeqL: number;
  measuredPh?: number;
  phDiscrepancy?: number;
  isInternallyConsistent: boolean;
  interpretation: string;
}

/**
 * Evaluates internal consistency of blood gas pH, PaCO2, and [HCO3-] using plasma Henderson-Hasselbalch
 * (pH = 6.1 + log10([HCO3-] / (0.03 * PaCO2))) and Kassirer-Bleich ([H+] = 24 * PaCO2 / [HCO3-]).
 */
export function calculateBloodGasHendersonHasselbalch(
  input: BloodGasHendersonHasselbalchInput,
): BloodGasHendersonHasselbalchResult | null {
  const { bicarbonateMeqL, paco2MmHg, measuredPh } = input;
  if (
    !Number.isFinite(bicarbonateMeqL) ||
    !Number.isFinite(paco2MmHg) ||
    bicarbonateMeqL <= 0 ||
    paco2MmHg <= 0
  ) {
    return null;
  }

  const expectedPh = round2(6.1 + Math.log10(bicarbonateMeqL / (0.03 * paco2MmHg)));
  const expectedHydrogenIonNeqL = round1((24 * paco2MmHg) / bicarbonateMeqL);

  if (measuredPh !== undefined && Number.isFinite(measuredPh)) {
    const phDiscrepancy = round2(measuredPh - expectedPh);
    const isInternallyConsistent = Math.abs(phDiscrepancy) <= 0.05;
    return {
      expectedPh,
      expectedHydrogenIonNeqL,
      measuredPh,
      phDiscrepancy,
      isInternallyConsistent,
      interpretation: isInternallyConsistent
        ? `ABG values are internally consistent with Henderson-Hasselbalch equilibrium (expected pH ${expectedPh} vs measured ${measuredPh}, delta ${phDiscrepancy}).`
        : `DISCORDANT BLOOD GAS: Expected pH ${expectedPh} differs from measured pH ${measuredPh} by ${phDiscrepancy} units (> 0.05). Verify non-simultaneous chemistry/ABG timing, transcription error, or pre-analytical air bubble.`,
    };
  }

  return {
    expectedPh,
    expectedHydrogenIonNeqL,
    isInternallyConsistent: true,
    interpretation: `Predicted arterial pH = ${expectedPh} (expected [H+] = ${expectedHydrogenIonNeqL} nEq/L).`,
  };
}

export interface UrinaryIonTrappingProfile {
  drugId: string;
  drugName: string;
  aliases: readonly string[];
  drugClass: IonizableDrugClass;
  pKa: number;
  renalExcretionUnchangedPercent: string;
  alkalinizationEffect: "enhances-clearance" | "impairs-clearance";
  targetUrinePhForEnhancedClearance?: string;
  acidemiaCnsTrappingHazard?: string;
  clinicalMechanism: string;
  hazardOrCaveat: string;
  citations: readonly string[];
}

export const URINARY_ION_TRAPPING_PROFILES: readonly UrinaryIonTrappingProfile[] = [
  {
    drugId: "aspirin",
    drugName: "Salicylate / Aspirin",
    aliases: ["salicylate", "bismuth-subsalicylate"],
    drugClass: "weak-acid",
    pKa: 3.0,
    renalExcretionUnchangedPercent: "~10% at acidic urine pH 5.5 rising to >30–80% total salicylate clearance with alkalinization",
    alkalinizationEffect: "enhances-clearance",
    targetUrinePhForEnhancedClearance: "pH 7.5 to 8.0",
    acidemiaCnsTrappingHazard:
      "CRITICAL CNS/BBB ION-TRAPPING HAZARD (PMID 4572648): When systemic arterial pH falls below 7.35 (e.g. hypoventilation during intubation/sedation or progressive metabolic acidemia), plasma unionized salicylic acid [HA] rises exponentially (~2-fold per 0.30 pH drop), crossing the lipophilic blood-brain barrier and becoming trapped inside CNS cells, triggering cerebral edema, seizures, and cardiovascular collapse.",
    clinicalMechanism:
      "Raising urine pH from 5.5 to 7.5–8.0 shifts urinary ionized fraction from 99.69% to 99.997–99.999% and slashes the unionized, membrane-permeant salicylic acid fraction by 100- to 316-fold (urine-to-plasma equilibrium ratio R_U/P rises from 0.013 at pH 5.5 to 3.98 at pH 8.0), preventing distal tubular back-diffusion (PMID 15083932, PMID 15181662).",
    hazardOrCaveat:
      "Hypokalemia blocks urinary alkalinization: K+ depletion forces distal intercalated H+/K+-ATPase to secrete H+ in exchange for K+ conservation ('paradoxical aciduria'), making urinary alkalinization ineffective until potassium is repleted.",
    citations: ["PMID 15083932", "PMID 15181662", "PMID 4572648"],
  },
  {
    drugId: "phenobarbital",
    drugName: "Phenobarbital",
    aliases: [],
    drugClass: "weak-acid",
    pKa: 7.3,
    renalExcretionUnchangedPercent: "~25% unchanged at baseline, rising substantially under alkaline diuresis",
    alkalinizationEffect: "enhances-clearance",
    targetUrinePhForEnhancedClearance: "pH 7.5 to 8.0",
    clinicalMechanism:
      "Because phenobarbital's pKa (7.3) sits directly within the physiological urine pH window, shifting urine pH from 5.5 to 7.5–8.0 dramatically converts the drug from 98.4% unionized (only 1.56% ionized at pH 5.5, favoring near-complete tubular reabsorption) to 61.3–83.4% ionized (a 39- to 53-fold jump in ionized fraction and 100- to 316-fold jump in [A-]/[HA], PMID 15083932).",
    hazardOrCaveat:
      "Monitor for respiratory depression and hypotension; multi-dose activated charcoal remains first-line GI/enterohepatic clearance enhancer alongside urinary alkalinization or extracorporeal clearance in severe toxicity.",
    citations: ["PMID 15083932"],
  },
  {
    drugId: "methotrexate",
    drugName: "Methotrexate",
    aliases: [],
    drugClass: "weak-acid",
    pKa: 4.8,
    renalExcretionUnchangedPercent: ">80–90% excreted unchanged via glomerular filtration and active OAT1/OAT3 tubular secretion",
    alkalinizationEffect: "enhances-clearance",
    targetUrinePhForEnhancedClearance: "pH >= 7.0 (typically 7.5 to 8.0 in high-dose regimens)",
    clinicalMechanism:
      "Raising urine pH from 5.5 to 7.5–8.0 elevates ionized methotrexate from 83.4% to 99.80–99.94% (cutting unionized fraction by 83- to 264-fold) and boosts aqueous solubility of both methotrexate and its poorly soluble 7-hydroxymethotrexate metabolite >10-fold, preventing intratubular crystal precipitation and obstructive AKI.",
    hazardOrCaveat:
      "Acidic urine (pH < 6.0), volume depletion, or third-space effusions precipitate crystal nephropathy; competitive OAT1/3 inhibitors (NSAIDs, probenecid, piperacillin-tazobactam) further block proximal clearance.",
    citations: ["PMID 2225539"],
  },
  {
    drugId: "amphetamine",
    drugName: "Amphetamine / Dextroamphetamine / Methamphetamine",
    aliases: [
      "dextroamphetamine",
      "methamphetamine",
      "amphetamine-mixed-salts-ir",
      "amphetamine-mixed-salts-xr",
      "amphetamine-odt",
    ],
    drugClass: "weak-base",
    pKa: 9.9,
    renalExcretionUnchangedPercent: "~55–70% unchanged in acidic urine (pH ~5.5), dropping to <5% in alkaline urine (pH ~8.0)",
    alkalinizationEffect: "impairs-clearance",
    clinicalMechanism:
      "In acidic urine (pH 5.5), amphetamine is 99.996% protonated/ionized (f_u = 0.004%, R_U/P = 79.2), trapping it in urine for rapid elimination. Alkaline urine (pH 7.5–8.0, e.g. from acetazolamide, sodium bicarbonate, or potassium citrate) increases the lipophilic unionized free base f_u 100- to 316-fold (to 0.40–1.24%, R_U/P dropping to 0.25), driving passive distal reabsorption and lengthening elimination half-life from ~7 h to 18–34 h (PMID 4880484).",
    hazardOrCaveat:
      "Alkaline urine dangerously prolongs sympathomimetic toxicity (agitation, hyperthermia, hypertension, arrhythmia). However, forced urinary acidification is contraindicated in overdose because aciduria precipitates myoglobin casts during rhabdomyolysis and worsens acute kidney injury (PMID 15083932).",
    citations: ["PMID 4880484", "PMID 15083932"],
  },
  {
    drugId: "quinidine",
    drugName: "Quinidine",
    aliases: ["quinidine-gluconate"],
    drugClass: "weak-base",
    pKa: 8.5,
    renalExcretionUnchangedPercent: "~15–25% unchanged renally with pronounced pH-dependent distal reabsorption",
    alkalinizationEffect: "impairs-clearance",
    clinicalMechanism:
      "Alkalinizing urine from pH 5.5 to 7.5–8.0 collapses quinidine ionization from 99.90% down to 90.91% (pH 7.5) and 75.97% (pH 8.0), raising the membrane-permeant unionized base fraction 91- to 240-fold (from 0.10% to 9.09–24.03%) and decreasing renal quinidine clearance.",
    hazardOrCaveat:
      "Concurrent carbonic anhydrase inhibitors or systemic alkalinizers reduce renal quinidine clearance, elevating plasma levels and magnifying QTc prolongation / Torsades de Pointes risk.",
    citations: ["PMID 15083932"],
  },
  {
    drugId: "flecainide",
    drugName: "Flecainide",
    aliases: [],
    drugClass: "weak-base",
    pKa: 9.3,
    renalExcretionUnchangedPercent: "~25–35% excreted unchanged in urine (pH-dependent)",
    alkalinizationEffect: "impairs-clearance",
    clinicalMechanism:
      "Raising urine pH from 5.5 to 7.5–8.0 elevates unionized flecainide from 0.016% to 1.56–4.77% (~99- to 301-fold rise in lipophilic free base), increasing distal tubular reabsorption and prolonging flecainide elimination half-life.",
    hazardOrCaveat:
      "Chronic urinary alkalinization (acetazolamide, potassium citrate) impairs flecainide clearance and risks Class Ic QRS widening / proarrhythmia. Distinction: acute IV sodium bicarbonate remains a mechanistic rescue in flecainide overdose specifically to overcome Nav1.5 blockade via high extracellular Na+ and serum pH-mediated unbinding, despite slowing urinary elimination.",
    citations: ["PMID 15083932"],
  },
];

const URINARY_TRAPPING_BY_ID = new Map<string, UrinaryIonTrappingProfile>();
for (const profile of URINARY_ION_TRAPPING_PROFILES) {
  URINARY_TRAPPING_BY_ID.set(profile.drugId, profile);
  for (const alias of profile.aliases) {
    URINARY_TRAPPING_BY_ID.set(alias, profile);
  }
}

export function getUrinaryIonTrappingProfile(drugId: string): UrinaryIonTrappingProfile | undefined {
  return URINARY_TRAPPING_BY_ID.get(drugId.toLowerCase().trim());
}

export interface UrinaryIonTrappingEvaluation {
  profile: UrinaryIonTrappingProfile;
  catalogDrugName: string;
  baselineUrinePh: number;
  alkalinizedUrinePh: number;
  baselineIonization: HendersonHasselbalchIonizationResult;
  alkalinizedIonization: HendersonHasselbalchIonizationResult;
  unionizedFractionFoldChange: number;
  urineToPlasmaRatioShift: string;
  systemicArterialPh?: number;
  csfBbbAcidemiaHazard?: {
    triggered: boolean;
    plasmaUnionizedAt740Percent: number;
    plasmaUnionizedAtMeasuredPhPercent: number;
    unionizedIncreaseFoldVs740: number;
    rationale: string;
  };
}

/**
 * Quantifies Henderson-Hasselbalch urinary ion trapping from acidic urine (default pH 5.5)
 * to alkalinized urine (default pH 7.8) and evaluates BBB/CSF salicylate trapping under acidemia (pH < 7.35).
 */
export function evaluateUrinaryIonTrapping(input: {
  drugId: string;
  baselineUrinePh?: number;
  targetUrinePh?: number;
  systemicArterialPh?: number;
}): UrinaryIonTrappingEvaluation | null {
  const profile = getUrinaryIonTrappingProfile(input.drugId);
  if (!profile) return null;

  const baselineUrinePh =
    input.baselineUrinePh !== undefined && Number.isFinite(input.baselineUrinePh) ? input.baselineUrinePh : 5.5;
  const alkalinizedUrinePh =
    input.targetUrinePh !== undefined && Number.isFinite(input.targetUrinePh) ? input.targetUrinePh : 7.8;

  const baseHH = calculateHendersonHasselbalchIonization({
    pKa: profile.pKa,
    pH: baselineUrinePh,
    drugClass: profile.drugClass,
    referenceCompartmentPh: 7.4,
  });
  const alkHH = calculateHendersonHasselbalchIonization({
    pKa: profile.pKa,
    pH: alkalinizedUrinePh,
    drugClass: profile.drugClass,
    referenceCompartmentPh: 7.4,
  });

  if (!baseHH || !alkHH) return null;

  const rawBaseFu =
    1 / (1 + safePow10(profile.drugClass === "weak-acid" ? baselineUrinePh - profile.pKa : profile.pKa - baselineUrinePh));
  const rawAlkFu =
    1 / (1 + safePow10(profile.drugClass === "weak-acid" ? alkalinizedUrinePh - profile.pKa : profile.pKa - alkalinizedUrinePh));
  const rawFold =
    rawBaseFu > 0 && rawAlkFu > 0
      ? profile.drugClass === "weak-acid"
        ? rawBaseFu / rawAlkFu
        : rawAlkFu / rawBaseFu
      : 1;
  const unionizedFractionFoldChange = round1(rawFold);

  let csfBbbAcidemiaHazard: UrinaryIonTrappingEvaluation["csfBbbAcidemiaHazard"];
  if (
    profile.drugId === "aspirin" &&
    input.systemicArterialPh !== undefined &&
    Number.isFinite(input.systemicArterialPh)
  ) {
    const refPlasma = calculateHendersonHasselbalchIonization({
      pKa: profile.pKa,
      pH: 7.4,
      drugClass: "weak-acid",
    });
    const currentPlasma = calculateHendersonHasselbalchIonization({
      pKa: profile.pKa,
      pH: input.systemicArterialPh,
      drugClass: "weak-acid",
    });
    if (refPlasma && currentPlasma) {
      const triggered = input.systemicArterialPh < 7.35;
      const increaseFold = round2(currentPlasma.unionizedFraction / Math.max(1e-9, refPlasma.unionizedFraction));
      csfBbbAcidemiaHazard = {
        triggered,
        plasmaUnionizedAt740Percent: round4(refPlasma.unionizedFraction * 100),
        plasmaUnionizedAtMeasuredPhPercent: round4(currentPlasma.unionizedFraction * 100),
        unionizedIncreaseFoldVs740: increaseFold,
        rationale: triggered
          ? `Systemic acidemia (arterial pH ${input.systemicArterialPh} < 7.35) raises plasma unionized salicylic acid ${increaseFold}x vs pH 7.40, accelerating passive BBB diffusion and CNS ion trapping (PMID 4572648).`
          : `Arterial pH (${input.systemicArterialPh}) is >= 7.35, limiting BBB salicylate entry relative to acidemia; avoid hypoventilation/respiratory acidosis.`,
      };
    }
  }

  const normalizedKey = input.drugId.toLowerCase().trim();
  const catalogDrugName = DRUG_BY_ID[normalizedKey]?.name ?? DRUG_BY_ID[profile.drugId]?.name ?? profile.drugName;

  return {
    profile,
    catalogDrugName,
    baselineUrinePh,
    alkalinizedUrinePh,
    baselineIonization: baseHH,
    alkalinizedIonization: alkHH,
    unionizedFractionFoldChange,
    urineToPlasmaRatioShift: `R_U/P shifts from ${baseHH.compartmentToReferenceTotalRatio} (pH ${baselineUrinePh}) to ${alkHH.compartmentToReferenceTotalRatio} (pH ${alkalinizedUrinePh})`,
    ...(input.systemicArterialPh !== undefined ? { systemicArterialPh: input.systemicArterialPh } : {}),
    ...(csfBbbAcidemiaHazard ? { csfBbbAcidemiaHazard } : {}),
  };
}

export interface GastricAcidSuppressantProfile {
  drugId: string;
  drugName: string;
  classLabel: "PPI" | "P-CAB" | "H2RA";
  typicalElevatedGastricPh: number;
  mechanism: string;
}

export const GASTRIC_ACID_SUPPRESSANT_PROFILES: readonly GastricAcidSuppressantProfile[] = [
  { drugId: "omeprazole", drugName: "Omeprazole", classLabel: "PPI", typicalElevatedGastricPh: 5.5, mechanism: "Irreversible parietal H+/K+-ATPase inhibition raising fasted intragastric pH from ~1.5 to 5.0–6.0" },
  { drugId: "omeprazole-sodium-bicarbonate", drugName: "Omeprazole–sodium bicarbonate", classLabel: "PPI", typicalElevatedGastricPh: 5.5, mechanism: "Immediate-release PPI + bicarbonate buffer raising intragastric pH from ~1.5 to >5.5" },
  { drugId: "esomeprazole", drugName: "Esomeprazole", classLabel: "PPI", typicalElevatedGastricPh: 5.5, mechanism: "Irreversible S-enantiomer H+/K+-ATPase inhibition sustaining intragastric pH >5.0" },
  { drugId: "pantoprazole", drugName: "Pantoprazole", classLabel: "PPI", typicalElevatedGastricPh: 5.2, mechanism: "Irreversible parietal H+/K+-ATPase inhibition raising intragastric pH to ~5.0–5.5" },
  { drugId: "lansoprazole", drugName: "Lansoprazole", classLabel: "PPI", typicalElevatedGastricPh: 5.4, mechanism: "Irreversible parietal H+/K+-ATPase inhibition raising intragastric pH to ~5.0–5.5" },
  { drugId: "rabeprazole", drugName: "Rabeprazole", classLabel: "PPI", typicalElevatedGastricPh: 5.6, mechanism: "Rapid irreversible H+/K+-ATPase inhibition sustaining gastric pH >5.5" },
  { drugId: "dexlansoprazole", drugName: "Dexlansoprazole", classLabel: "PPI", typicalElevatedGastricPh: 5.6, mechanism: "Dual-delayed-release R-lansoprazole sustaining 24h gastric pH >5.5" },
  { drugId: "vonoprazan", drugName: "Vonoprazan", classLabel: "P-CAB", typicalElevatedGastricPh: 6.2, mechanism: "Potassium-competitive acid blocker achieving rapid, profound sustained gastric pH >= 6.0" },
  { drugId: "famotidine", drugName: "Famotidine", classLabel: "H2RA", typicalElevatedGastricPh: 4.5, mechanism: "Competitive histamine H2 receptor antagonism raising gastric pH to ~4.0–5.0" },
  { drugId: "cimetidine", drugName: "Cimetidine", classLabel: "H2RA", typicalElevatedGastricPh: 4.5, mechanism: "Competitive H2 receptor antagonism raising gastric pH ~4.0–5.0 (plus CYP and OCT2/MATE1 inhibition)" },
  { drugId: "nizatidine", drugName: "Nizatidine", classLabel: "H2RA", typicalElevatedGastricPh: 4.5, mechanism: "Competitive histamine H2 receptor antagonism raising intragastric pH to ~4.0–5.0" },
];

export interface GastricPhDrugProfile {
  drugId: string;
  drugName: string;
  aliases: readonly string[];
  pKa: number;
  drugClass: "weak-base";
  expectedAucReductionWithPpi: string;
  severity: "contraindicated-or-avoid" | "major-exposure-drop";
  dissolutionMechanism: string;
  formulationAndMitigation: string;
  citations: readonly string[];
}

export const GASTRIC_PH_DRUG_PROFILES: readonly GastricPhDrugProfile[] = [
  {
    drugId: "ketoconazole",
    drugName: "Ketoconazole",
    aliases: ["levoketoconazole"],
    pKa: 6.5,
    drugClass: "weak-base",
    expectedAucReductionWithPpi: "80% to >95% AUC loss",
    severity: "contraindicated-or-avoid",
    dissolutionMechanism:
      "Oral ketoconazole is a poorly soluble dibasic weak base (pKa 6.5 / 2.9) that must be protonated in acidic gastric juice (pH ~1.5) to dissolve before duodenal transit. Raising gastric pH to >= 5.0 collapses aqueous solubility by orders of magnitude (PMID 21942976).",
    formulationAndMitigation:
      "Avoid PPIs/H2RAs/P-CABs with oral ketoconazole. Acidic beverages only partially rescue H2RA-mediated hypochlorhydria and fail against sustained PPI/P-CAB acid blockade.",
    citations: ["PMID 21942976"],
  },
  {
    drugId: "itraconazole",
    drugName: "Itraconazole",
    aliases: [],
    pKa: 3.7,
    drugClass: "weak-base",
    expectedAucReductionWithPpi: "~60% to 65% AUC loss (capsules)",
    severity: "major-exposure-drop",
    dissolutionMechanism:
      "Itraconazole capsules exhibit sharp pH-dependent dissolution (pKa ~3.7): at pH 1.5, >99% is ionized and soluble, whereas at pH 5.5 ionization falls to ~1.5%, dropping relative solubility >100-fold and risking subtherapeutic antifungal levels (PMID 21942976).",
    formulationAndMitigation:
      "Oral hydroxypropyl-beta-cyclodextrin solution or SUBA-itraconazole formulations bypass gastric-acid dependence; conventional capsules require low gastric pH.",
    citations: ["PMID 21942976"],
  },
  {
    drugId: "posaconazole",
    drugName: "Posaconazole",
    aliases: [],
    pKa: 4.6,
    drugClass: "weak-base",
    expectedAucReductionWithPpi: "~32% to 45% AUC loss (oral suspension only)",
    severity: "major-exposure-drop",
    dissolutionMechanism:
      "Posaconazole oral suspension (weak base, pKa 3.6 / 4.6) precipitates rapidly when gastric pH rises from 1.5 to >5.0 during PPI or cimetidine therapy, cutting bioavailability and exposing high-risk patients to breakthrough invasive mold infection (PMID 21942976).",
    formulationAndMitigation:
      "Delayed-release posaconazole tablets (released in small intestine via HPMCAS polymer matrix) and IV formulation are insensitive to gastric acid suppression.",
    citations: ["PMID 21942976"],
  },
  {
    drugId: "atazanavir",
    drugName: "Atazanavir",
    aliases: ["atazanavir-cobicistat"],
    pKa: 4.4,
    drugClass: "weak-base",
    expectedAucReductionWithPpi: "~75% AUC loss (unboosted); ~40–65% loss if uncompensated",
    severity: "contraindicated-or-avoid",
    dissolutionMechanism:
      "Atazanavir solubility collapses >100-fold as gastric pH exceeds 4.0 (pKa ~4.4). Protonation at pH 1.5 drives dissolution, whereas PPI-induced hypochlorhydria (pH >= 5.0) causes un-dissolved drug passage and HIV virologic rebound (PMID 21942976).",
    formulationAndMitigation:
      "PPIs are contraindicated with unboosted atazanavir and treatment-experienced patients; check FDA Prescribing Information for strict boosted-regimen ceilings and temporal H2RA separation.",
    citations: ["PMID 21942976"],
  },
  {
    drugId: "rilpivirine",
    drugName: "Rilpivirine",
    aliases: ["dolutegravir-rilpivirine", "rilpivirine-ftc-taf", "rilpivirine-ftc-tdf"],
    pKa: 5.6,
    drugClass: "weak-base",
    expectedAucReductionWithPpi: "~40% AUC loss (up to 65% Cmin drop)",
    severity: "contraindicated-or-avoid",
    dissolutionMechanism:
      "Oral rilpivirine (pKa ~5.6) requires acidic gastric pH plus food for dissolution. PPIs raise gastric pH to >= 5.0, slashing rilpivirine systemic exposure and risking HIV virologic failure and NNRTI resistance mutations (PMID 21942976).",
    formulationAndMitigation:
      "PPIs are strictly contraindicated with oral rilpivirine regimens; H2RAs require strict temporal separation per FDA label. Long-acting intramuscular cabotegravir-rilpivirine bypasses GI absorption.",
    citations: ["PMID 21942976"],
  },
  {
    drugId: "dasatinib",
    drugName: "Dasatinib",
    aliases: [],
    pKa: 6.8,
    drugClass: "weak-base",
    expectedAucReductionWithPpi: "~43% to 61% AUC and Cmax loss",
    severity: "contraindicated-or-avoid",
    dissolutionMechanism:
      "Dasatinib (weak base, pKa ~6.8 / 3.1) solubility drops >2,000-fold from 18.4 mg/mL at pH 2.6 to <0.008 mg/mL at pH 6.0. Concomitant PPIs or H2RAs profoundly impair dissolution and compromise BCR-ABL molecular remission (PMID 22739140, PMID 25274610).",
    formulationAndMitigation:
      "Concurrent PPIs and H2RAs should be avoided; locally acting antacids separated from dasatinib by at least 2 hours minimize pH overlap per FDA Prescribing Information.",
    citations: ["PMID 22739140", "PMID 25274610"],
  },
  {
    drugId: "erlotinib",
    drugName: "Erlotinib",
    aliases: [],
    pKa: 5.4,
    drugClass: "weak-base",
    expectedAucReductionWithPpi: "~46% AUC and ~61% Cmax loss",
    severity: "major-exposure-drop",
    dissolutionMechanism:
      "Erlotinib exhibits steep pH-dependent solubility (pKa ~5.4); elevating gastric pH above 5.0 with PPIs suppresses protonated dissolution and significantly reduces oral bioavailability (PMID 22739140).",
    formulationAndMitigation:
      "Avoid PPIs when feasible; consult FDA Prescribing Information for H2RA staggering windows.",
    citations: ["PMID 22739140"],
  },
  {
    drugId: "pazopanib",
    drugName: "Pazopanib",
    aliases: [],
    pKa: 6.4,
    drugClass: "weak-base",
    expectedAucReductionWithPpi: "~40% AUC loss",
    severity: "major-exposure-drop",
    dissolutionMechanism:
      "Pazopanib is practically insoluble at pH > 4.0; esomeprazole co-administration elevates gastric pH >5.0 and cuts pazopanib AUC by ~40% (PMID 22739140).",
    formulationAndMitigation:
      "Avoid concomitant PPIs/H2RAs or separate short-acting acid suppression per label.",
    citations: ["PMID 22739140"],
  },
  {
    drugId: "mycophenolate-mofetil",
    drugName: "Mycophenolate mofetil",
    aliases: ["mycophenolate"],
    pKa: 5.6,
    drugClass: "weak-base",
    expectedAucReductionWithPpi: "~30% to 50% MPA Cmax and early AUC reduction",
    severity: "major-exposure-drop",
    dissolutionMechanism:
      "Mycophenolate mofetil (morpholinoethyl ester weak base, pKa ~5.6) requires low gastric pH for rapid ester dissolution and release; PPI-mediated gastric pH > 4.5–5.0 impairs dissolution and lowers active mycophenolic acid exposure.",
    formulationAndMitigation:
      "Enteric-coated mycophenolate sodium (EC-MPS) releases at neutral small-intestinal pH and is unaffected by PPI therapy.",
    citations: ["PMID 21942976"],
  },
];

const GASTRIC_SUPPRESSANT_BY_ID = new Map(GASTRIC_ACID_SUPPRESSANT_PROFILES.map((s) => [s.drugId, s]));
const GASTRIC_PH_VICTIM_BY_ID = new Map<string, GastricPhDrugProfile>();
for (const v of GASTRIC_PH_DRUG_PROFILES) {
  GASTRIC_PH_VICTIM_BY_ID.set(v.drugId, v);
  for (const alias of v.aliases) {
    GASTRIC_PH_VICTIM_BY_ID.set(alias, v);
  }
}

export interface GastricPhSolubilityEvaluation {
  profile: GastricPhDrugProfile;
  catalogDrugName: string;
  baselineGastricPh: number;
  elevatedGastricPh: number;
  baselineIonization: HendersonHasselbalchIonizationResult;
  elevatedIonization: HendersonHasselbalchIonizationResult;
  relativeSolubilityRatio: number;
  solubilityRetentionPercent: number;
}

/**
 * Models Henderson-Hasselbalch weak-base aqueous solubility collapse when gastric acid suppression
 * raises intragastric pH from ~1.5 to 5.0–6.0+.
 */
export function evaluateGastricPhSolubilityShift(input: {
  drugId: string;
  baselineGastricPh?: number;
  elevatedGastricPh?: number;
}): GastricPhSolubilityEvaluation | null {
  const profile = GASTRIC_PH_VICTIM_BY_ID.get(input.drugId.toLowerCase().trim());
  if (!profile) return null;

  const baselineGastricPh =
    input.baselineGastricPh !== undefined && Number.isFinite(input.baselineGastricPh) ? input.baselineGastricPh : 1.5;
  const elevatedGastricPh =
    input.elevatedGastricPh !== undefined && Number.isFinite(input.elevatedGastricPh) ? input.elevatedGastricPh : 5.5;

  const baseHH = calculateHendersonHasselbalchIonization({
    pKa: profile.pKa,
    pH: baselineGastricPh,
    drugClass: "weak-base",
    referenceCompartmentPh: baselineGastricPh,
  });
  const elevHH = calculateHendersonHasselbalchIonization({
    pKa: profile.pKa,
    pH: elevatedGastricPh,
    drugClass: "weak-base",
    referenceCompartmentPh: baselineGastricPh,
  });

  if (!baseHH || !elevHH) return null;

  const relativeSolubilityRatio = round2(baseHH.aqueousSolubilityMultiplier / Math.max(1e-9, elevHH.aqueousSolubilityMultiplier));
  const solubilityRetentionPercent = round2((elevHH.aqueousSolubilityMultiplier / baseHH.aqueousSolubilityMultiplier) * 100);
  const key = input.drugId.toLowerCase().trim();

  return {
    profile,
    catalogDrugName: DRUG_BY_ID[key]?.name ?? DRUG_BY_ID[profile.drugId]?.name ?? profile.drugName,
    baselineGastricPh,
    elevatedGastricPh,
    baselineIonization: baseHH,
    elevatedIonization: elevHH,
    relativeSolubilityRatio,
    solubilityRetentionPercent,
  };
}

export interface GastricPhCollision {
  suppressant: GastricAcidSuppressantProfile;
  victim: GastricPhDrugProfile;
  victimCatalogId: string;
  evaluation: GastricPhSolubilityEvaluation;
  summary: string;
}

/**
 * Detects active tray pairs where a PPI, P-CAB, or H2RA elevates gastric pH and impairs dissolution
 * of a pH-dependent weakly basic drug.
 */
export function detectGastricPhCollisions(drugIds: string[]): GastricPhCollision[] {
  const normalized = drugIds.map((id) => id.toLowerCase().trim());
  const suppressants = normalized
    .map((id) => GASTRIC_SUPPRESSANT_BY_ID.get(id))
    .filter((s): s is GastricAcidSuppressantProfile => Boolean(s));
  if (suppressants.length === 0) return [];

  const collisions: GastricPhCollision[] = [];
  const seenPairs = new Set<string>();

  for (const id of normalized) {
    const victimProfile = GASTRIC_PH_VICTIM_BY_ID.get(id);
    if (!victimProfile) continue;
    for (const sup of suppressants) {
      const key = `${sup.drugId}::${id}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);

      const evaluation = evaluateGastricPhSolubilityShift({
        drugId: id,
        baselineGastricPh: 1.5,
        elevatedGastricPh: sup.typicalElevatedGastricPh,
      });
      if (!evaluation) continue;

      collisions.push({
        suppressant: sup,
        victim: victimProfile,
        victimCatalogId: id,
        evaluation,
        summary: `${sup.drugName} (${sup.classLabel}) raises gastric pH (~1.5 -> ${sup.typicalElevatedGastricPh}), collapsing ${evaluation.catalogDrugName} (pKa ${victimProfile.pKa}) theoretical protonated solubility ${evaluation.relativeSolubilityRatio}x (${victimProfile.expectedAucReductionWithPpi}).`,
      });
    }
  }

  return collisions;
}

// ============================================================================
// 6. CLINICAL PROTOCOLS & SAFEGUARD DIRECTIVES
// ============================================================================

export const HYPERTONIC_SALINE_RESCUE_PROTOCOL = {
  title: "Emergency 3% Hypertonic Saline Bolus Rescue Protocol",
  indication:
    "Severe symptomatic hyponatremia complicated by active seizures, coma, stupor, or signs of impending transtentorial herniation.",
  bolusDoseMl: 100,
  infusionDurationMinutes: 10,
  maxConsecutiveBoluses: 3,
  repeatIntervalMinutes: "10 to 20 minutes",
  targetAcuteSodiumRiseMeqL: "4 to 6 mEq/L",
  physiologicGoal:
    "Rapidly increases intravascular osmolality to draw water out of swollen astrocytic cytoplasm, reducing brain volume by ~10% to halt active seizures and prevent fatal brainstem herniation.",
  postRescueGuidance:
    "As soon as acute severe neurological manifestations resolve, discontinue hypertonic boluses immediately. Ensure the subsequent 24-hour cumulative sodium rise does not exceed the <= 8 mEq/L ceiling (or <= 4-6 mEq/L in high-risk patients).",
  literatureReferences: [
    "Spasovski G, et al. Eur J Endocrinol. 2014;170(3):G1-47.",
    "Verbalis JG, et al. Am J Med. 2013;126(10 Suppl 1):S1-S42.",
    "Sterns RH. N Engl J Med. 2015;372(1):55-65.",
  ],
};

export const DDAVP_CLAMP_PROTOCOL = {
  title: "Proactive Desmopressin (DDAVP) Clamp Protocol",
  indication:
    "Management of severe hyponatremia where sudden endogenous water autodiresis is anticipated, creating unpredictable overcorrection risk.",
  mechanism:
    "Administration of DDAVP stimulates renal V2 receptors in collecting duct principal cells, fixing urinary concentrating capacity and preventing sudden massive free water diuresis.",
  dosing:
    "Desmopressin (DDAVP) 1 to 2 mcg IV or SubQ every 6 to 8 hours, combined with a calculated, steady continuous infusion of 3% Hypertonic Saline.",
  clinicalAdvantages:
    "Eliminates the unpredictability of fluctuating endogenous vasopressin levels. Allows the clinician to precisely control the rate of serum sodium elevation using the infusion pump without fear of catastrophic autodiresis.",
  literatureReferences: [
    "Sterns RH, et al. Semin Nephrol. 2009;29(3):282-299.",
    "Rondon-Berrios H, et al. Kidney360. 2021;2(9):1428-1436.",
  ],
};

export const RELOWERING_PROTOCOL = {
  title: "Emergency Re-lowering Protocol for Inadvertent Sodium Overcorrection",
  triggerThreshold:
    "Serum sodium rise exceeding > 8 mEq/L within 24 hours (or > 4-6 mEq/L in high-risk patients with malnutrition, cirrhosis, or baseline Na < 105 mEq/L).",
  immediateSteps: [
    "Promptly discontinue all sodium-containing IV infusions, saline flushes, and diuretics.",
    "Administer Desmopressin (DDAVP) 2 mcg IV or SubQ immediately to arrest renal free water wasting.",
    "Initiate IV infusion of 5% Dextrose in Water (D5W) (typically 3 mL/kg/hour) or administer oral/nasogastric free water.",
    "Perform serial serum sodium checks every 1 to 2 hours until the 24-hour delta has been safely brought back below the 8 mEq/L ceiling.",
  ],
  neuroprotectiveRationale:
    "Re-lowering within 24 hours of overcorrection rescues oligodendrocytes from apoptosis and blood-brain barrier disintegration, reliably preventing permanent osmotic myelinolysis even after inadvertent hypertonic overshooting.",
  literatureReferences: [
    "Rondon-Berrios H, Tandukar S, Sterns RH. Rapid re-lowering for hyponatremia overcorrection. Kidney360. 2021;2(9):1428-1436.",
    "Sterns RH. Disorders of plasma sodium. N Engl J Med. 2015;372(1):55-65.",
  ],
};

export const WINTERS_INTERPRETATION_GUIDE = {
  title: "Secondary Respiratory Compensation Rules of Thumb",
  metabolicAcidosis: "Winter's Formula: Expected PaCO2 = (1.5 * [HCO3-]) + 8 +/- 2.",
  metabolicAlkalosis:
    "Summer's Formula / Rule of Thumb: Expected PaCO2 = 0.7 * ([HCO3-] - 24) + 40 +/- 2 (PaCO2 rises ~0.7 mmHg per 1 mEq/L rise in HCO3 above 24, typically maxing out at ~55 mmHg).",
  acuteRespiratoryAcidosis: "For every 10 mmHg acute rise in PaCO2, [HCO3-] rises by 1 mEq/L.",
  chronicRespiratoryAcidosis: "For every 10 mmHg chronic rise in PaCO2, [HCO3-] rises by 3.5 to 4 mEq/L.",
  acuteRespiratoryAlkalosis: "For every 10 mmHg acute fall in PaCO2, [HCO3-] falls by 2 mEq/L.",
  chronicRespiratoryAlkalosis: "For every 10 mmHg chronic fall in PaCO2, [HCO3-] falls by 4 to 5 mEq/L.",
};

export const DELTA_DELTA_INTERPRETATION_GUIDE = {
  title: "Delta-Delta Ratio Reference Guide (Delta AG / Delta HCO3)",
  deltaAgFormula: "Delta AG = Corrected AG - 12 (where 12 is normal baseline AG)",
  deltaHco3Formula: "Delta HCO3 = 24 - [HCO3-] (where 24 is normal baseline HCO3)",
  ratioBands: [
    {
      ratio: "< 0.4 to 0.8",
      interpretation: "Mixed High Anion Gap (HAGMA) + Normal Anion Gap (NAGMA / Hyperchloremic Acidosis)",
      clinicalExamples: "DKA with large-volume 0.9% normal saline resuscitation, DKA with urinary ketoacid loss, lactic acidosis + diarrhea, uremic acidosis + RTA.",
    },
    {
      ratio: "1.0 to 2.0",
      interpretation: "Pure High Anion Gap Metabolic Acidosis (HAGMA)",
      clinicalExamples: "Uncomplicated DKA, pure lactic acidosis, alcoholic ketoacidosis, acute toxic alcohols.",
    },
    {
      ratio: "> 2.0",
      interpretation: "Mixed High Anion Gap Metabolic Acidosis (HAGMA) + Concurrent Metabolic Alkalosis",
      clinicalExamples: "DKA or lactic acidosis with profuse vomiting or NG suction, preceding loop/thiazide diuretic use, chronic COPD respiratory acidosis compensation.",
    },
  ],
};

// ============================================================================
// 7. DESK TRAY DRUG DETECTION
// ============================================================================

export interface AcidBaseOnDeskResult {
  hasCarbonicAnhydraseInhibitor: boolean;
  hasBicarbonateOrAlkalinizer: boolean;
  hasLoopDiuretic: boolean;
  hasThiazideDiuretic: boolean;
  hasSglt2Inhibitor: boolean;
  hasVaptan: boolean;
  hasPotassiumSparingOrMra: boolean;
  hasDesmopressinOrDdavp: boolean;
  hasSalicylate: boolean;
  hasMetformin: boolean;
  hasSalineOrFluid: boolean;
  hasCalcineurinInhibitor: boolean;
  hasWeakAcidIonTrappingCandidate: boolean;
  hasWeakBaseIonTrappingCandidate: boolean;
  hasGastricAcidSuppressant: boolean;
  hasGastricPhDependentDrug: boolean;
  matchedDrugIds: string[];
  riskSummaries: string[];
}

const CAI_DRUGS = new Set(["acetazolamide", "topiramate", "topiramate-xr", "zonisamide"]);
const ALKALINIZER_DRUGS = new Set([
  "alkalinizer",
  "sodium-bicarbonate",
  "sodium-bicarbonate-iv",
  "omeprazole-sodium-bicarbonate",
  "potassium-citrate",
  "sodium bicarbonate",
  "baking soda",
  "potassium citrate",
  "citrate",
]);
const LOOP_DRUGS = new Set(["furosemide", "bumetanide", "torsemide", "ethacrynic-acid", "ethacrynic acid"]);
const THIAZIDE_DRUGS = new Set([
  "hctz",
  "hydrochlorothiazide",
  "chlorothiazide",
  "chlorthalidone",
  "metolazone",
  "indapamide",
  "bendroflumethiazide",
]);
const SGLT2_DRUGS = new Set([
  "empagliflozin",
  "dapagliflozin",
  "canagliflozin",
  "ertugliflozin",
  "bexagliflozin",
  "sotagliflozin",
]);
const VAPTAN_DRUGS = new Set(["tolvaptan", "conivaptan"]);
const K_SPARING_DRUGS = new Set(["spironolactone", "eplerenone", "finerenone", "amiloride", "triamterene"]);
const DDAVP_DRUGS = new Set(["desmopressin", "ddavp", "vasopressin"]);
const SALICYLATE_DRUGS = new Set(["aspirin", "salicylate", "bismuth-subsalicylate", "bismuth subsalicylate"]);
const METFORMIN_DRUGS = new Set(["metformin", "empagliflozin-metformin", "dapagliflozin-metformin"]);
const SALINE_DRUGS = new Set(["saline", "hypertonic saline", "normal saline"]);
const CNI_DRUGS = new Set(["tacrolimus", "tacrolimus-xr", "cyclosporine", "voclosporin"]);
const WEAK_BASE_TRAPPING_EXTRAS = new Set(["mexiletine", "procainamide", "pseudoephedrine"]);

/**
 * Inspects drugs on the desk for acid-base, diuretic, electrolyte, ion-trapping,
 * gastric-pH, or hyponatremia-modulating agents.
 */
export function acidBaseOnDesk(drugIds: string[]): AcidBaseOnDeskResult {
  const normalized = new Set(drugIds.map((id) => id.toLowerCase().trim()));
  if (normalized.has("hctz")) normalized.add("hydrochlorothiazide");
  if (normalized.has("hydrochlorothiazide")) normalized.add("hctz");

  const matched = new Set<string>();
  const riskSummaries: string[] = [];

  let hasCarbonicAnhydraseInhibitor = false;
  let hasBicarbonateOrAlkalinizer = false;
  let hasLoopDiuretic = false;
  let hasThiazideDiuretic = false;
  let hasSglt2Inhibitor = false;
  let hasVaptan = false;
  let hasPotassiumSparingOrMra = false;
  let hasDesmopressinOrDdavp = false;
  let hasSalicylate = false;
  let hasMetformin = false;
  let hasSalineOrFluid = false;
  let hasCalcineurinInhibitor = false;
  let hasWeakAcidIonTrappingCandidate = false;
  let hasWeakBaseIonTrappingCandidate = false;
  let hasGastricAcidSuppressant = false;
  let hasGastricPhDependentDrug = false;

  for (const id of normalized) {
    if (CAI_DRUGS.has(id)) {
      hasCarbonicAnhydraseInhibitor = true;
      matched.add(id);
    }
    if (ALKALINIZER_DRUGS.has(id)) {
      hasBicarbonateOrAlkalinizer = true;
      matched.add(id);
    }
    if (LOOP_DRUGS.has(id)) {
      hasLoopDiuretic = true;
      matched.add(id);
    }
    if (THIAZIDE_DRUGS.has(id)) {
      hasThiazideDiuretic = true;
      matched.add(id);
    }
    if (SGLT2_DRUGS.has(id)) {
      hasSglt2Inhibitor = true;
      matched.add(id);
    }
    if (VAPTAN_DRUGS.has(id)) {
      hasVaptan = true;
      matched.add(id);
    }
    if (K_SPARING_DRUGS.has(id)) {
      hasPotassiumSparingOrMra = true;
      matched.add(id);
    }
    if (DDAVP_DRUGS.has(id)) {
      hasDesmopressinOrDdavp = true;
      matched.add(id);
    }
    if (SALICYLATE_DRUGS.has(id)) {
      hasSalicylate = true;
      matched.add(id);
    }
    if (METFORMIN_DRUGS.has(id)) {
      hasMetformin = true;
      matched.add(id);
    }
    if (SALINE_DRUGS.has(id)) {
      hasSalineOrFluid = true;
      matched.add(id);
    }
    if (CNI_DRUGS.has(id)) {
      hasCalcineurinInhibitor = true;
      matched.add(id);
    }
    const urinaryProfile = URINARY_TRAPPING_BY_ID.get(id);
    if (urinaryProfile) {
      if (urinaryProfile.drugClass === "weak-acid") {
        hasWeakAcidIonTrappingCandidate = true;
      } else {
        hasWeakBaseIonTrappingCandidate = true;
      }
      matched.add(id);
    } else if (WEAK_BASE_TRAPPING_EXTRAS.has(id)) {
      hasWeakBaseIonTrappingCandidate = true;
      matched.add(id);
    }
    if (GASTRIC_SUPPRESSANT_BY_ID.has(id)) {
      hasGastricAcidSuppressant = true;
      matched.add(id);
    }
    if (GASTRIC_PH_VICTIM_BY_ID.has(id)) {
      hasGastricPhDependentDrug = true;
      matched.add(id);
    }
  }

  if (hasCarbonicAnhydraseInhibitor) {
    riskSummaries.push(
      "Carbonic Anhydrase Inhibitor on desk: Induces proximal tubular bicarbonaturia (urine pH > 7.5), predisposing to hyperchloremic Normal Anion Gap Metabolic Acidosis (NAGMA / Type 2 RTA), hypokalemia, and weak-base urinary ion trapping.",
    );
  }
  if (hasBicarbonateOrAlkalinizer) {
    riskSummaries.push(
      "Alkalinizing agent on desk: Exogenous bicarbonate/citrate load raises systemic and urinary pH (enhances weak-acid clearance for salicylate/phenobarbital/methotrexate; impairs weak-base clearance for amphetamine/quinidine/flecainide).",
    );
  }
  if (hasLoopDiuretic) {
    riskSummaries.push(
      "Loop Diuretic on desk: Induces volume contraction and renal proton/potassium wasting, driving hypokalemic hypochloremic metabolic alkalosis ('contraction alkalosis').",
    );
  }
  if (hasThiazideDiuretic) {
    riskSummaries.push(
      "Thiazide Diuretic on desk: Inhibits cortical diluting segment NCC cotransporter while sparing medullary water concentration, creating a high risk of severe thiazide-induced hyponatremia.",
    );
  }
  if (hasSglt2Inhibitor) {
    riskSummaries.push(
      "SGLT2 Inhibitor on desk: Promotes ketogenesis and osmotic diuresis; carries a labeled warning for Euglycemic Diabetic Ketoacidosis (euDKA, High Anion Gap Metabolic Acidosis).",
    );
  }
  if (hasVaptan) {
    riskSummaries.push(
      "V2 Receptor Antagonist (Vaptan) on desk: Produces rapid aquaresis. Labeled boxed warning: must be initiated in hospital with close sodium monitoring to prevent rapid overcorrection and Osmotic Demyelination Syndrome (ODS).",
    );
  }
  if (hasPotassiumSparingOrMra) {
    riskSummaries.push(
      "Potassium-Sparing Diuretic / MRA on desk: Blocks cortical collecting duct ENaC or mineralocorticoid receptors, impairing H+ and K+ excretion and predisposing to hyperkalemic NAGMA (Type 4 RTA phenotype).",
    );
  }
  if (hasDesmopressinOrDdavp) {
    riskSummaries.push(
      "Desmopressin (DDAVP) on desk: Potent V2 receptor agonist. Induces antidiuresis and water retention; utilized therapeutically in the DDAVP clamp / re-lowering strategy to prevent ODS.",
    );
  }
  if (hasSalicylate) {
    riskSummaries.push(
      "Salicylate on desk: Classic mixed acid-base disorder: direct medullary respiratory center stimulation causes respiratory alkalosis, while mitochondrial oxidative uncoupling generates lactic/ketoacidosis (HAGMA). Urinary alkalinization (pH 7.5–8.0) traps ionized salicylate in urine; systemic acidemia (pH < 7.35) drives CNS/BBB trapping (PMID 4572648, PMID 15083932).",
    );
  }
  if (hasMetformin) {
    riskSummaries.push(
      "Metformin on desk: Carries boxed warning for Metformin-Associated Lactic Acidosis (MALA, severe HAGMA), particularly in renal hypoperfusion or acute kidney injury.",
    );
  }
  if (hasCalcineurinInhibitor) {
    riskSummaries.push(
      "Calcineurin Inhibitor on desk: Inhibits cortical collecting duct H+-ATPase and mineralocorticoid responsiveness, causing hyperkalemic NAGMA (Type 4 RTA).",
    );
  }
  if (hasWeakAcidIonTrappingCandidate && !hasSalicylate) {
    riskSummaries.push(
      "pH-sensitive weak acid on desk (e.g. phenobarbital / methotrexate): Urinary alkalinization (pH 7.5–8.0) markedly increases urinary ionized fraction, accelerating renal clearance and preventing intratubular crystal precipitation (PMID 15083932).",
    );
  }
  if (hasWeakBaseIonTrappingCandidate) {
    riskSummaries.push(
      "pH-sensitive weak base on desk (e.g. amphetamine / quinidine / flecainide): Alkaline urine (pH 7.5–8.0 from acetazolamide or bicarbonate) increases unionized free-base reabsorption, reducing renal clearance and prolonging systemic toxicity (PMID 4880484).",
    );
  }
  if (hasGastricAcidSuppressant && hasGastricPhDependentDrug) {
    riskSummaries.push(
      "Gastric pH absorption collision on desk: Acid suppression raises intragastric pH (~1.5 -> 5.0+), collapsing protonated dissolution of co-present weakly basic oral agents (PMID 22739140, PMID 21942976).",
    );
  }

  return {
    hasCarbonicAnhydraseInhibitor,
    hasBicarbonateOrAlkalinizer,
    hasLoopDiuretic,
    hasThiazideDiuretic,
    hasSglt2Inhibitor,
    hasVaptan,
    hasPotassiumSparingOrMra,
    hasDesmopressinOrDdavp,
    hasSalicylate,
    hasMetformin,
    hasSalineOrFluid,
    hasCalcineurinInhibitor,
    hasWeakAcidIonTrappingCandidate,
    hasWeakBaseIonTrappingCandidate,
    hasGastricAcidSuppressant,
    hasGastricPhDependentDrug,
    matchedDrugIds: Array.from(matched),
    riskSummaries,
  };
}

// ============================================================================
// 8. COMPREHENSIVE ACID-BASE & HYPONATREMIA REPORT GENERATOR
// ============================================================================

export interface AcidBaseReportOptions {
  chemistry?: {
    sodiumMeqL: number;
    potassiumMeqL?: number;
    chlorideMeqL: number;
    bicarbonateMeqL: number;
    albuminGdl?: number;
  };
  abg?: {
    measuredPh: number;
    measuredPaco2MmHg: number;
    measuredPao2MmHg?: number;
  };
  hyponatremiaTriage?: {
    volumeStatus?: VolumeStatus;
    urineSodiumMeqL?: number;
    urineOsmolalityMosmKg?: number;
    durationHours?: number;
    isMalnourished?: boolean;
    hasAdvancedLiverDisease?: boolean;
    hasChronicAlcoholism?: boolean;
  };
  patientBiometrics?: {
    weightKg: number;
    sex: PatientSex;
    isGeriatric?: boolean;
    targetDeltaNa24h?: number;
    selectedInfusate?: InfusateType;
    infusionVolumeMl?: number;
  };
}

export type AcidBaseAlertTier = "critical" | "warning" | "advisory" | "info";

export interface AcidBaseAlert {
  tier: AcidBaseAlertTier;
  category: "AnionGap" | "Winters" | "DeltaDelta" | "ODS" | "DrugCollision";
  title: string;
  rationale: string;
  actionGuidance: string;
}

type AcidBaseSizedSection =
  | "anionGapEvaluation"
  | "wintersEvaluation"
  | "deltaDeltaEvaluation"
  | "hyponatremiaEvaluation"
  | "adrogueMadiasPredictions";

export interface AcidBaseReport {
  onDesk: AcidBaseOnDeskResult;
  anionGapEvaluation: AnionGapResult;
  wintersEvaluation: WintersResult;
  deltaDeltaEvaluation: DeltaDeltaResult;
  hyponatremiaEvaluation: HyponatremiaEvaluationResult;
  adrogueMadiasPredictions: AdrogueMadiasResult[];
  urinaryIonTrappingEvaluations?: UrinaryIonTrappingEvaluation[];
  gastricPhCollisions?: GastricPhCollision[];
  alerts: AcidBaseAlert[];
  protocols: {
    hypertonicSalineRescue: typeof HYPERTONIC_SALINE_RESCUE_PROTOCOL;
    ddavpClamp: typeof DDAVP_CLAMP_PROTOCOL;
    relowering: typeof RELOWERING_PROTOCOL;
    wintersGuide: typeof WINTERS_INTERPRETATION_GUIDE;
    deltaDeltaGuide: typeof DELTA_DELTA_INTERPRETATION_GUIDE;
  };
  disclaimer: string;
}

/**
 * Generates an end-to-end clinical acid-base and hyponatremia decision-support report.
 * Adheres strictly to FD&C Act § 520(o)(1)(E) non-device, non-prescriptive CDS posture.
 */
export function acidBaseReportOnDesk(
  drugIds: string[],
  host: HostContext,
  options: AcidBaseReportOptions & Required<Pick<AcidBaseReportOptions, "chemistry" | "abg" | "patientBiometrics">>,
): AcidBaseReport;
export function acidBaseReportOnDesk(
  drugIds: string[],
  host: HostContext,
  options?: AcidBaseReportOptions,
): AcidBaseReport | Unsized<AcidBaseReport, AcidBaseSizedSection>;
export function acidBaseReportOnDesk(drugIds: string[], host: HostContext, options?: AcidBaseReportOptions) {
  const onDesk = acidBaseOnDesk(drugIds);
  const alerts: AcidBaseAlert[] = [];

  // 1. Chemistry Panel Setup
  const chem = options?.chemistry ?? {
    sodiumMeqL: 140,
    potassiumMeqL: 4.0,
    chlorideMeqL: 104,
    bicarbonateMeqL: 24,
    albuminGdl: 4.0,
  };

  const abg = options?.abg ?? {
    measuredPh: 7.4,
    measuredPaco2MmHg: 40,
  };

  const bio = options?.patientBiometrics ?? {
    weightKg: 70,
    sex: "male",
    isGeriatric: host.age === "geriatric",
    targetDeltaNa24h: 6,
    selectedInfusate: "3-percent-saline",
  };

  // 2. Anion Gap Evaluation
  const anionGapEvaluation = calculateAnionGap({
    sodiumMeqL: chem.sodiumMeqL,
    chlorideMeqL: chem.chlorideMeqL,
    bicarbonateMeqL: chem.bicarbonateMeqL,
    potassiumMeqL: chem.potassiumMeqL,
    albuminGdl: chem.albuminGdl,
  });

  if (anionGapEvaluation.occultHagmaUnmasked) {
    alerts.push({
      tier: "critical",
      category: "AnionGap",
      title: "Occult High Anion Gap Metabolic Acidosis Unmasked by Albumin Correction",
      rationale: `Observed AG was ${anionGapEvaluation.observedAnionGap} mEq/L (falsely normal), but Figge albumin correction unmasks a true AG of ${anionGapEvaluation.correctedAnionGap} mEq/L due to profound hypoalbuminemia (albumin ${chem.albuminGdl ?? "unmeasured"} g/dL).`,
      actionGuidance:
        "Investigate for occult lactic acidosis, ketoacidosis, toxic alcohols, or uremic acid retention. Do not rely on uncorrected anion gap in hypoalbuminemic patients.",
    });
  } else if (anionGapEvaluation.category === "elevated") {
    alerts.push({
      tier: "warning",
      category: "AnionGap",
      title: `High Anion Gap Metabolic Acidosis Detected (AG: ${anionGapEvaluation.correctedAnionGap} mEq/L)`,
      rationale: anionGapEvaluation.clinicalSignificance,
      actionGuidance:
        "Obtain serum lactate, beta-hydroxybutyrate, BUN/creatinine, and toxic alcohol/salicylate screening if clinically indicated.",
    });
  }

  // 3. Winter's Compensation Evaluation
  const wintersEvaluation = evaluateWintersFormula({
    bicarbonateMeqL: chem.bicarbonateMeqL,
    measuredPaco2MmHg: abg.measuredPaco2MmHg,
    measuredPh: abg.measuredPh,
  });

  if (wintersEvaluation.status === "concomitant-respiratory-acidosis") {
    alerts.push({
      tier: "critical",
      category: "Winters",
      title: "Concomitant Respiratory Acidosis (Relative Alveolar Hypoventilation)",
      rationale: `Measured PaCO2 (${abg.measuredPaco2MmHg} mmHg) exceeds Winter's compensation ceiling (${wintersEvaluation.expectedPaco2Max} mmHg). Ventilatory exhaustion or CNS depression is worsening severe acidemia.`,
      actionGuidance:
        "Urgent airway and ventilatory assessment. Evaluate for respiratory muscle exhaustion, sedative co-ingestion, or severe bronchospasm.",
    });
  } else if (wintersEvaluation.status === "concomitant-respiratory-alkalosis") {
    alerts.push({
      tier: "warning",
      category: "Winters",
      title: "Concomitant Respiratory Alkalosis (Primary Alveolar Hyperventilation)",
      rationale: `Measured PaCO2 (${abg.measuredPaco2MmHg} mmHg) is lower than Winter's compensation floor (${wintersEvaluation.expectedPaco2Min} mmHg). An independent hyperventilation stimulus is present.`,
      actionGuidance:
        "Screen for occult sepsis, pulmonary embolism, salicylate toxicity, or hepatic encephalopathy driving excessive central hyperventilation.",
    });
  }

  // 4. Delta-Delta Evaluation
  const deltaDeltaEvaluation = calculateDeltaDelta({
    correctedAnionGap: anionGapEvaluation.correctedAnionGap,
    bicarbonateMeqL: chem.bicarbonateMeqL,
  });

  if (deltaDeltaEvaluation.category === "mixed-hagma-nagma") {
    alerts.push({
      tier: "warning",
      category: "DeltaDelta",
      title: "Mixed High Anion Gap + Normal Anion Gap (Hyperchloremic) Acidosis",
      rationale: `Delta Ratio is ${deltaDeltaEvaluation.deltaRatio} (< 0.8). Bicarbonate has fallen disproportionately more than the rise in anion gap.`,
      actionGuidance:
        "Avoid aggressive 0.9% normal saline resuscitation which exacerbates hyperchloremic acidosis. Consider balanced crystalloids (e.g. Plasma-Lyte, Lactated Ringer's) and evaluate for GI or renal bicarbonate losses.",
    });
  } else if (deltaDeltaEvaluation.category === "mixed-hagma-metabolic-alkalosis") {
    alerts.push({
      tier: "warning",
      category: "DeltaDelta",
      title: "Mixed High Anion Gap Acidosis + Concurrent Metabolic Alkalosis",
      rationale: `Predicted baseline bicarbonate is elevated (${deltaDeltaEvaluation.predictedBaselineBicarbonate} mEq/L). Anion gap elevation exceeds bicarbonate reduction.`,
      actionGuidance:
        "Evaluate for gastric hydrochloric acid losses (vomiting, NG suction) or prior diuretic use. Monitor closely for severe post-acidosis rebound alkalemia as ketoacids or lactate clear.",
    });
  }

  // 5. Hyponatremia & ODS Safeguard Evaluation
  const hyponatremiaEvaluation = evaluateHyponatremia({
    serumSodiumMeqL: chem.sodiumMeqL,
    volumeStatus: options?.hyponatremiaTriage?.volumeStatus,
    urineSodiumMeqL: options?.hyponatremiaTriage?.urineSodiumMeqL,
    urineOsmolalityMosmKg: options?.hyponatremiaTriage?.urineOsmolalityMosmKg,
    serumPotassiumMeqL: chem.potassiumMeqL,
    durationHours: options?.hyponatremiaTriage?.durationHours,
    isMalnourished: options?.hyponatremiaTriage?.isMalnourished,
    hasAdvancedLiverDisease: options?.hyponatremiaTriage?.hasAdvancedLiverDisease,
    hasChronicAlcoholism:
      options?.hyponatremiaTriage?.hasChronicAlcoholism || host.alcohol === "chronic",
  });

  if (hyponatremiaEvaluation.hyponatremiaSeverity === "moderate" || hyponatremiaEvaluation.hyponatremiaSeverity === "severe") {
    const ceiling = hyponatremiaEvaluation.safeCorrectionCeiling24h;
    alerts.push({
      tier: hyponatremiaEvaluation.isHighRiskForOds ? "critical" : "warning",
      category: "ODS",
      title: `Critical ODS Safety Ceiling: Max <= ${ceiling} mEq/L in 24 Hours`,
      rationale: `Serum sodium is ${chem.sodiumMeqL} mEq/L. ${hyponatremiaEvaluation.isHighRiskForOds ? "HIGH-RISK ODS FACTORS PRESENT (" + hyponatremiaEvaluation.highRiskFactors.join("; ") + ")." : "Standard correction ceiling applies."} Rapid correction risks irreversible pontine/extrapontine myelinolysis.`,
      actionGuidance:
        `Cap cumulative 24-hour correction at <= ${ceiling} mEq/L. If rapid water autodiresis occurs, initiate DDAVP clamp and D5W re-lowering strategy.`,
    });
  }

  // 6. Adrogué-Madias Infusate Predictions
  const infusateList: InfusateType[] = [
    "3-percent-saline",
    "0.9-percent-saline",
    "lactated-ringers",
    "0.45-percent-saline",
    "d5w",
  ];

  const adrogueMadiasPredictions = infusateList.map((type) =>
    calculateAdrogueMadias({
      serumSodiumMeqL: chem.sodiumMeqL,
      serumPotassiumMeqL: chem.potassiumMeqL,
      weightKg: bio.weightKg,
      sex: bio.sex,
      isGeriatric: bio.isGeriatric,
      infusateType: type,
      targetDeltaNa24h: bio.targetDeltaNa24h,
      infusionVolumeMl: bio.selectedInfusate === type ? bio.infusionVolumeMl : undefined,
      isHighRiskOds: hyponatremiaEvaluation.isHighRiskForOds,
    }),
  );

  const selectedPrediction = adrogueMadiasPredictions.find(
    (p) => p.infusate.type === bio.selectedInfusate,
  );
  if (selectedPrediction?.exceedsSafe24hCeiling && selectedPrediction.odsWarning) {
    alerts.push({
      tier: "critical",
      category: "ODS",
      title: "Adrogue-Madias Projection Exceeds Safe 24h Sodium Ceiling",
      rationale: selectedPrediction.odsWarning,
      actionGuidance:
        "Recalculate infusion volume and hourly rate. Consider lower infusion volume or target an acute rise of no more than 4 to 6 mEq/L.",
    });
  }

  // 7. Drug Collision Alerts on Tray
  if (onDesk.hasVaptan && hyponatremiaEvaluation.hyponatremiaSeverity !== "normonatremic") {
    alerts.push({
      tier: "critical",
      category: "DrugCollision",
      title: "Vaptan (V2 Antagonist) Active During Hyponatremia Management",
      rationale:
        "Vaptans induce rapid free water excretion. Concurrent administration with hypertonic saline or uncontrolled water access risks catastrophic overcorrection (> 8–12 mEq/L in 24h) and irreversible ODS.",
      actionGuidance:
        "FDA boxed warning mandates inpatient initiation with serum sodium monitoring every 2 to 4 hours. Do not administer hypertonic saline concurrently unless emergent rescue is required.",
    });
  }

  if (onDesk.hasThiazideDiuretic && hyponatremiaEvaluation.hyponatremiaSeverity !== "normonatremic") {
    alerts.push({
      tier: "warning",
      category: "DrugCollision",
      title: "Thiazide Diuretic Implicated in Hyponatremia Pathogenesis",
      rationale:
        "Thiazides impair urinary dilution in the cortical diluting segment without impairing medullary concentrating gradient, predisposing to severe hyponatremia.",
      actionGuidance:
        "Discontinue thiazide diuretic immediately. Be alert that upon discontinuation, renal diluting capacity recovers and autodiresis may accelerate overcorrection.",
    });
  }

  if (onDesk.hasCarbonicAnhydraseInhibitor && deltaDeltaEvaluation.category === "mixed-hagma-nagma") {
    alerts.push({
      tier: "warning",
      category: "DrugCollision",
      title: "Carbonic Anhydrase Inhibitor Potentiating Hyperchloremic NAGMA",
      rationale:
        "Acetazolamide or topiramate induces proximal tubular bicarbonaturia and hyperchloremia, amplifying normal anion gap acidosis.",
      actionGuidance:
        "Evaluate necessity of carbonic anhydrase inhibitor. Consider alternative agents if hyperchloremic acidemia is severe.",
    });
  }

  // 8. Urinary Ion Trapping & Gastric pH Dissolution Evaluations
  const urinaryIonTrappingEvaluations: UrinaryIonTrappingEvaluation[] = [];
  for (const id of drugIds) {
    const evalItem = evaluateUrinaryIonTrapping({
      drugId: id,
      systemicArterialPh: options?.abg?.measuredPh,
    });
    if (evalItem && !urinaryIonTrappingEvaluations.some((u) => u.profile.drugId === evalItem.profile.drugId)) {
      urinaryIonTrappingEvaluations.push(evalItem);
    }
  }

  const salicylateEval = urinaryIonTrappingEvaluations.find((u) => u.profile.drugId === "aspirin");
  if (salicylateEval?.csfBbbAcidemiaHazard?.triggered) {
    alerts.push({
      tier: "critical",
      category: "DrugCollision",
      title: "Salicylate + Systemic Acidemia (pH < 7.35): CNS / BBB Ion-Trapping Hazard",
      rationale: salicylateEval.csfBbbAcidemiaHazard.rationale,
      actionGuidance:
        "Avoid hypoventilation or uncompensated respiratory acidosis (including during airway intubation) and evaluate urinary alkalinization kinetics alongside potassium repletion per toxicology reference (PMID 4572648, PMID 15083932).",
    });
  }

  const weakBaseOnTray = urinaryIonTrappingEvaluations.filter(
    (u) => u.profile.alkalinizationEffect === "impairs-clearance",
  );
  if (weakBaseOnTray.length > 0 && (onDesk.hasBicarbonateOrAlkalinizer || onDesk.hasCarbonicAnhydraseInhibitor)) {
    alerts.push({
      tier: "warning",
      category: "DrugCollision",
      title: "Alkaline Urine Trapping Impairing Weak-Base Renal Clearance",
      rationale: `${weakBaseOnTray.map((w) => w.catalogDrugName).join(", ")} undergoes pH-dependent passive distal reabsorption when urine pH rises (7.5–8.0), raising unionized free-base fraction and prolonging elimination half-life (PMID 4880484, PMID 15083932).`,
      actionGuidance:
        "Monitor for prolonged stimulant sympathomimetic toxicity or antiarrhythmic QRS/QTc excess when co-administered with acetazolamide, sodium bicarbonate, or potassium citrate.",
    });
  }

  const gastricPhCollisions = detectGastricPhCollisions(drugIds);
  for (const col of gastricPhCollisions) {
    alerts.push({
      tier: col.victim.severity === "contraindicated-or-avoid" ? "critical" : "warning",
      category: "DrugCollision",
      title: `Gastric pH Elevation Impairs ${col.victim.drugName} Dissolution (${col.suppressant.drugName})`,
      rationale: `${col.summary} ${col.victim.dissolutionMechanism}`,
      actionGuidance: col.victim.formulationAndMitigation,
    });
  }

  const report: AcidBaseReport = {
    onDesk,
    anionGapEvaluation,
    wintersEvaluation,
    deltaDeltaEvaluation,
    hyponatremiaEvaluation,
    adrogueMadiasPredictions,
    ...(urinaryIonTrappingEvaluations.length > 0 ? { urinaryIonTrappingEvaluations } : {}),
    ...(gastricPhCollisions.length > 0 ? { gastricPhCollisions } : {}),
    alerts,
    protocols: {
      hypertonicSalineRescue: HYPERTONIC_SALINE_RESCUE_PROTOCOL,
      ddavpClamp: DDAVP_CLAMP_PROTOCOL,
      relowering: RELOWERING_PROTOCOL,
      wintersGuide: WINTERS_INTERPRETATION_GUIDE,
      deltaDeltaGuide: DELTA_DELTA_INTERPRETATION_GUIDE,
    },
    disclaimer: `${ACID_BASE_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`,
  };
  return withoutUnentered(report, [
    [
      "chemistry panel",
      options?.chemistry,
      ["anionGapEvaluation", "wintersEvaluation", "deltaDeltaEvaluation", "hyponatremiaEvaluation", "adrogueMadiasPredictions"],
    ],
    ["blood gas", options?.abg, ["wintersEvaluation"]],
    ["weight and sex", options?.patientBiometrics, ["adrogueMadiasPredictions"]],
  ]);
}
