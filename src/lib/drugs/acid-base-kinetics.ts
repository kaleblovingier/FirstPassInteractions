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
 *    - 3% Hypertonic Saline Emergency Rescue: 100 mL IV bolus over 10 min, repeatable up to 3 times prn.
 *    - Desmopressin (DDAVP) Clamp / Re-lowering Strategy: DDAVP 1-2 mcg + D5W if rapid autodiresis threatens ceiling.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

/**
 * Statutory Non-Device Clinical Decision Support disclaimer under FD&C Act § 520(o)(1)(E).
 */
export const ACID_BASE_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational acid-base and hyponatremia reference engine is intended solely for licensed healthcare professionals and supervised health-professions trainees. It models physical-chemical equilibria, Figge albumin corrections, Winter's respiratory compensation, Delta-Delta ratios, and Adrogué-Madias sodium kinetics to enable independent verification of clinical rationale in critical care and nephrology. It does not provide automated diagnostic conclusions, does not generate infusion orders or prescription directives, and does not replace individualized bedside clinical judgment, arterial blood gas confirmation, or the FDA-approved Prescribing Information.";

export const ACID_BASE_CITATIONS: readonly string[] = [
  "Winter SD, Pearson JR, Gabow PA, Schultz AL, Lepoff RB. The fall of the serum anion gap. Arch Intern Med. 1990;150(2):311-313.",
  "Figge J, Jabor A, Kazda A, Fencl V. Anion gap and hypoalbuminemia. Crit Care Med. 1998;26(11):1807-1810.",
  "Emmett M, Narins RG. Clinical use of the anion gap. Medicine (Baltimore). 1977;56(1):38-54.",
  "Adrogué HJ, Madias NE. Hyponatremia. N Engl J Med. 2000;342(21):1581-1589.",
  "Sterns RH. Disorders of plasma sodium--causes, consequences, and correction. N Engl J Med. 2015;372(1):55-65.",
  "Verbalis JG, Goldsmith SR, Bustamante A, et al. Diagnosis, evaluation, and treatment of hyponatremia: expert panel recommendations. Am J Med. 2013;126(10 Suppl 1):S1-S42.",
  "Spasovski G, Vanholder R, Allolio B, et al. Clinical practice guideline on diagnosis and treatment of hyponatraemia. Eur J Endocrinol. 2014;170(3):G1-47.",
  "Sterns RH, Nigwekar SU, Hix JK. The treatment of hyponatremia. Semin Nephrol. 2009;29(3):282-299.",
  "Rondon-Berrios H, Tandukar S, Sterns RH. Rapid re-lowering for hyponatremia overcorrection: a systematic review. Kidney360. 2021;2(9):1428-1436.",
  "Kraut JA, Madias NE. Serum anion gap: its uses and limitations in clinical medicine. Clin J Am Soc Nephrol. 2007;2(1):162-174.",
  "Hamm LL, Nakhoul N, Hering-Smith KS. Acid-Base Homeostasis. Clin J Am Soc Nephrol. 2015;10(12):2232-2242.",
];

// Helper rounding functions
function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
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
}

/**
 * Calculates serum anion gap and applies Figge-Fencl albumin correction.
 * For every 1.0 g/dL drop in serum albumin below 4.0 g/dL, unmeasured anionic charges
 * decrease by 2.5 mEq/L.
 * Formula: Corrected AG = Observed AG + 2.5 * (4.0 - Albumin_g_dL).
 */
export function calculateAnionGap(input: AnionGapInput): AnionGapResult {
  const { sodiumMeqL, chlorideMeqL, bicarbonateMeqL, albuminGdl } = input;
  const observedAG = round1(sodiumMeqL - (chlorideMeqL + bicarbonateMeqL));
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
}

/**
 * Evaluates secondary respiratory compensation in metabolic acidosis using Winter's formula.
 * Expected PaCO2 = (1.5 * [HCO3-]) + 8 +/- 2.
 * Range: [1.5 * HCO3 + 6, 1.5 * HCO3 + 10].
 */
export function evaluateWintersFormula(input: WintersInput): WintersResult {
  const { bicarbonateMeqL, measuredPaco2MmHg } = input;
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
    actionGuidance:
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
      "URGENT: Assess airway patency and ventilatory endurance. Evaluate for respiratory muscle fatigue or CNS sedation. Prepare for potential ventilatory support (NIV or endotracheal intubation) with minute ventilation set high enough to match metabolic compensatory demands.";
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
  const { correctedAnionGap, bicarbonateMeqL } = input;
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
}

/**
 * Diagnostic triage of hyponatremia and Osmotic Demyelination Syndrome (ODS) risk stratification.
 * Enforces strict non-prescriptive CDS guidance for maximum 24h sodium elevation limits.
 */
export function evaluateHyponatremia(input: HyponatremiaTriageInput): HyponatremiaEvaluationResult {
  const {
    serumSodiumMeqL,
    volumeStatus,
    urineSodiumMeqL,
    urineOsmolalityMosmKg,
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

  const isChronicOrUnknownDuration = durationHours === undefined || durationHours > 48;
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
  if (serumPotassiumMeqL !== undefined && serumPotassiumMeqL < 3.0) {
    highRiskFactors.push(`Severe concomitant hypokalemia (${serumPotassiumMeqL} mEq/L; K+ repletion elevates serum Na+)`);
  }

  const isHighRiskForOds = highRiskFactors.length > 0 && severity !== "normonatremic" && severity !== "hypernatremic";
  const safeCorrectionCeiling24h = isHighRiskForOds ? 6 : 8;

  // Etiological volume differentiation
  let etiologyCategory = "Undifferentiated Hyponatremia";
  let etiologyDetails = "Requires clinical assessment of extracellular fluid volume, urine sodium, and urine osmolality.";
  let urineFindingsSummary = "Urine electrolytes pending or unmeasured.";

  if (volumeStatus === "hypovolemic") {
    etiologyCategory = "Hypovolemic Hyponatremia (Volume Depletion)";
    if (urineSodiumMeqL !== undefined) {
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
    if (urineOsmolalityMosmKg !== undefined && urineOsmolalityMosmKg < 100) {
      etiologyDetails =
        "Maximally dilute urine (UOsm < 100 mOsm/kg): Suggests primary polydipsia, beer potomania, or very low solute intake ('tea and toast' diet). ADH is appropriately suppressed.";
    } else {
      etiologyDetails =
        "Inappropriately concentrated urine (UOsm > 100 mOsm/kg, usually > 300 mOsm/kg; UNa > 30 mEq/L): Highly consistent with SIADH (Syndrome of Inappropriate Antidiuretic Hormone secretion). Rule out secondary adrenal insufficiency and severe hypothyroidism.";
    }
  } else if (volumeStatus === "hypervolemic") {
    etiologyCategory = "Hypervolemic Hyponatremia (Volume Expansion with Edema/Ascites)";
    if (urineSodiumMeqL !== undefined && urineSodiumMeqL < 20) {
      etiologyDetails =
        "Effective arterial blood volume underfilling (Congestive Heart Failure, Cirrhosis, Nephrotic Syndrome). Splanchnic/arterial pooling triggers intense baroreceptor-mediated non-osmotic ADH secretion and renal sodium avidity.";
    } else {
      etiologyDetails =
        "Advanced renal failure (Acute Kidney Injury or end-stage Chronic Kidney Disease) with impaired free water clearance due to markedly reduced nephron filtration mass.";
    }
  }

  if (urineSodiumMeqL !== undefined || urineOsmolalityMosmKg !== undefined) {
    const parts: string[] = [];
    if (urineSodiumMeqL !== undefined) parts.push(`Urine Na: ${urineSodiumMeqL} mEq/L`);
    if (urineOsmolalityMosmKg !== undefined) parts.push(`Urine Osm: ${urineOsmolalityMosmKg} mOsm/kg`);
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
  const {
    serumSodiumMeqL,
    weightKg,
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

  const tbw = round1(weightKg * tbwFactor);
  const infusate = INFUSATE_PROFILES[infusateType];
  const infusateCations = infusate.sodiumMeqL + infusate.potassiumMeqL;

  // Delta Na per 1 liter = (Infusate cations - Serum Na) / (TBW + 1)
  const deltaNaPerLiter = round2((infusateCations - serumSodiumMeqL) / (tbw + 1));

  const safe24hCeilingMeqL = isHighRiskOds ? 6 : 8;

  let volumeNeededForTargetMl: number | undefined;
  let hourlyRateFor24hTargetMlH: number | undefined;

  if (targetDeltaNa24h !== undefined && deltaNaPerLiter !== 0) {
    const volumeLiters = targetDeltaNa24h / deltaNaPerLiter;
    if (volumeLiters > 0) {
      volumeNeededForTargetMl = Math.round(volumeLiters * 1000);
      hourlyRateFor24hTargetMlH = round1(volumeNeededForTargetMl / 24);
    }
  }

  let predictedDeltaNaForVolume: number | undefined;
  let exceedsSafe24hCeiling = false;
  let odsWarning: string | null = null;

  if (infusionVolumeMl !== undefined) {
    predictedDeltaNaForVolume = round1(deltaNaPerLiter * (infusionVolumeMl / 1000));
    if (predictedDeltaNaForVolume > safe24hCeilingMeqL) {
      exceedsSafe24hCeiling = true;
      odsWarning = `CRITICAL ODS ALERT: Projected sodium rise of +${predictedDeltaNaForVolume} mEq/L from ${infusionVolumeMl} mL of ${infusate.name} exceeds the safe 24-hour ceiling (${safe24hCeilingMeqL} mEq/L)! Rapid correction risks irreversible osmotic demyelination syndrome.`;
    }
  } else if (targetDeltaNa24h !== undefined && targetDeltaNa24h > safe24hCeilingMeqL) {
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
  };
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
  matchedDrugIds: string[];
  riskSummaries: string[];
}

const CAI_DRUGS = new Set(["acetazolamide", "topiramate", "zonisamide"]);
const ALKALINIZER_DRUGS = new Set([
  "alkalinizer",
  "sodium bicarbonate",
  "baking soda",
  "potassium citrate",
  "citrate",
]);
const LOOP_DRUGS = new Set(["furosemide", "bumetanide", "torsemide", "ethacrynic acid"]);
const THIAZIDE_DRUGS = new Set([
  "hctz",
  "hydrochlorothiazide",
  "chlorthalidone",
  "metolazone",
  "indapamide",
]);
const SGLT2_DRUGS = new Set(["empagliflozin", "dapagliflozin", "canagliflozin"]);
const VAPTAN_DRUGS = new Set(["tolvaptan", "conivaptan"]);
const K_SPARING_DRUGS = new Set(["spironolactone", "eplerenone", "amiloride", "triamterene"]);
const DDAVP_DRUGS = new Set(["desmopressin", "ddavp", "vasopressin"]);
const SALICYLATE_DRUGS = new Set(["aspirin", "salicylate", "bismuth subsalicylate"]);
const METFORMIN_DRUGS = new Set(["metformin"]);
const SALINE_DRUGS = new Set(["saline", "hypertonic saline", "normal saline"]);
const CNI_DRUGS = new Set(["tacrolimus", "cyclosporine"]);

/**
 * Inspects drugs on the desk for acid-base, diuretic, electrolyte, or hyponatremia-modulating agents.
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
  }

  if (hasCarbonicAnhydraseInhibitor) {
    riskSummaries.push(
      "Carbonic Anhydrase Inhibitor on desk: Induces proximal tubular bicarbonaturia, predisposing to hyperchloremic Normal Anion Gap Metabolic Acidosis (NAGMA / Type 2 RTA) and hypokalemia.",
    );
  }
  if (hasBicarbonateOrAlkalinizer) {
    riskSummaries.push(
      "Alkalinizing agent on desk: Exogenous bicarbonate load may induce or exacerbate metabolic alkalosis, hypokalemia, and hypernatremia.",
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
      "Salicylate on desk: Classic mixed acid-base disorder: direct medullary respiratory center stimulation causes respiratory alkalosis, while mitochondrial oxidative uncoupling generates lactic/ketoacidosis (HAGMA).",
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

export interface AcidBaseReport {
  onDesk: AcidBaseOnDeskResult;
  anionGapEvaluation: AnionGapResult;
  wintersEvaluation: WintersResult;
  deltaDeltaEvaluation: DeltaDeltaResult;
  hyponatremiaEvaluation: HyponatremiaEvaluationResult;
  adrogueMadiasPredictions: AdrogueMadiasResult[];
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
  options?: AcidBaseReportOptions,
): AcidBaseReport {
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
      rationale: `Observed AG was ${anionGapEvaluation.observedAnionGap} mEq/L (falsely normal), but Figge albumin correction unmasks a true AG of ${anionGapEvaluation.correctedAnionGap} mEq/L due to profound hypoalbuminemia (albumin ${chem.albuminGdl} g/dL).`,
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

  return {
    onDesk,
    anionGapEvaluation,
    wintersEvaluation,
    deltaDeltaEvaluation,
    hyponatremiaEvaluation,
    adrogueMadiasPredictions,
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
}
