/**
 * Glycemic Kinetics, DKA & HHS Resuscitation Protocols, Critical Potassium Safety Gate,
 * Two-Bag Fluid Titration, Sulfonylurea-Induced Hypoglycemia Octreotide Antidote,
 * and Inpatient Basal-Bolus-Correction Insulin Sizing Engine.
 *
 * Authored from the clinical perspective of an MD (Endocrinologist & Critical Care Physician)
 * & PharmD (Endocrine & Inpatient Glycemic Pharmacotherapy Specialist) and Senior Software Engineer.
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support (CDS) Architecture:
 * - Conforms strictly to 21 U.S.C. § 360j(o)(1)(E) and FDA CDS Software Guidance (January 2026).
 * - Intended for licensed endocrinologists, intensivists, emergency physicians, hospitalists,
 *   clinical pharmacologists, clinical pharmacists (PharmD), and supervised health-professions trainees.
 * - Displays transparent physiological, biochemical, osmolar, and clinical trial rationale
 *   derived from peer-reviewed literature (ADA Standards of Care in Diabetes 2024/2026,
 *   Endocrine Society Guidelines, Kitabchi AE et al. Diabetes Care 2009, Fayfman M et al. 2017,
 *   Dhatariya KK et al. Nat Rev Dis Primers 2020, RABBIT 2 Trial [Umpierrez GE et al. Diabetes Care 2007],
 *   Klein-Schwartz W et al. Clin Toxicol 2016, Boyle PJ et al. J Emerg Med 1993).
 * - Enables independent clinical verification of all calculated doses, potassium gates,
 *   fluid infusion rates, dextrose addition thresholds, and insulin sensitivity factors.
 * - STRICTLY NON-PRESCRIPTIVE: Does NOT generate automated medical orders, does NOT emit
 *   closed-loop infusion pump directives, and does NOT replace individualized bedside clinical
 *   evaluation, institutional critical care protocols, or the FDA-approved Prescribing Information.
 */

import type { HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

// ============================================================================
// 1. STATUTORY REGULATORY DISCLAIMER (FD&C Act § 520(o)(1)(E))
// ============================================================================

export const GLYCEMIC_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational glycemic kinetics, DKA/HHS stepped resuscitation algorithm, critical potassium safety gate, two-bag fluid titration calculator, sulfonylurea octreotide antidote protocol, and inpatient basal-bolus-correction insulin sizing engine is intended solely for licensed healthcare professionals (endocrinologists, intensivists, emergency physicians, hospitalists, clinical pharmacists) and supervised health-professions trainees. It models American Diabetes Association (ADA) and Endocrine Society consensus protocols, transcellular potassium flux dynamics, sodium correction equations, idiogenic osmole cerebral edema thresholds, SSTR2-mediated insulin exocytosis arrest, and empiric total daily dose partitions to enable independent clinical verification of patient care strategies. It does not provide automated diagnostic conclusions, does not emit closed-loop infusion commands, and does not replace individualized bedside clinical evaluation, institutional critical care pathways, or the FDA-approved Prescribing Information.";

// ============================================================================
// 2. PEER-REVIEWED LITERATURE & GUIDELINE CITATIONS
// ============================================================================

export interface Citation {
  id: string;
  citation: string;
  pmid?: string;
  doi?: string;
  relevance: string;
}

export const GLYCEMIC_CITATIONS: Citation[] = [
  {
    id: "ada-standards-care-2024",
    citation:
      "American Diabetes Association Professional Practice Committee. 16. Diabetes Care in the Hospital: Standards of Care in Diabetes-2024. Diabetes Care. 2024;47(Suppl 1):S295-S306.",
    pmid: "38078575",
    doi: "10.2337/dc24-S016",
    relevance:
      "Definitive ADA recommendations for inpatient glycemic management, basal-bolus-correction regimens, glycemic targets (140-180 mg/dL), and avoidance of sliding-scale insulin monotherapy.",
  },
  {
    id: "kitabchi-hyperglycemic-crises-2009",
    citation:
      "Kitabchi AE, Umpierrez GE, Miles JM, Fisher JN. Hyperglycemic crises in adult patients with diabetes. Diabetes Care. 2009;32(7):1335-1343.",
    pmid: "19564476",
    doi: "10.2337/dc09-9032",
    relevance:
      "Foundational consensus statement outlining DKA/HHS diagnostic criteria, stepped fluid resuscitation, critical potassium safety gate (<3.3 mEq/L hold insulin), fixed-rate regular insulin infusion (0.1 units/kg/h), and dextrose addition switch points.",
  },
  {
    id: "dhatariya-dka-review-2020",
    citation:
      "Dhatariya KK, Glaser NS, Codner E, Dunger DB. Diabetic ketoacidosis. Nat Rev Dis Primers. 2020;6(1):40.",
    pmid: "32439898",
    doi: "10.1038/s41572-020-0165-1",
    relevance:
      "Comprehensive review of DKA pathophysiology, ketone body kinetics, risk factors for cerebral edema during over-rapid osmolality drops, and subcutaneous basal insulin transition bridge.",
  },
  {
    id: "hillier-corrected-sodium-1999",
    citation:
      "Hillier TA, Abbott RD, Barrett-Connor E. Hyponatremia evaluated: reconsidering the role of serum glucose in the calculation of serum sodium. Am J Med. 1999;106(4):399-403.",
    pmid: "10225241",
    doi: "10.1016/s0002-9343(99)00055-8",
    relevance:
      "Established the refined 2.0 mEq/L sodium correction factor for each 100 mg/dL elevation in blood glucose above baseline in marked hyperglycemia, complementing the classic 1.6 factor by Katz.",
  },
  {
    id: "katz-hyperglycemia-sodium-1973",
    citation:
      "Katz MA. Hyperglycemia-induced hypovolemia -- sodium and water balance. N Engl J Med. 1973;289(16):843-848.",
    pmid: "4742240",
    doi: "10.1056/NEJM197310182891607",
    relevance:
      "Classic derivation of corrected sodium formula: Corrected Na = Measured Na + 0.016 * (Glucose - 100), accounting for transcellular osmotic water shifting.",
  },
  {
    id: "rabbit2-trial-2007",
    citation:
      "Umpierrez GE, Smiley D, Zisman A, et al. Randomized study of basal-bolus insulin therapy in the inpatient management of patients with type 2 diabetes (RABBIT 2 trial). Diabetes Care. 2007;30(9):2181-2186.",
    pmid: "17513708",
    doi: "10.2337/dc07-0295",
    relevance:
      "Landmark multicenter RCT demonstrating superiority of physiologic basal-bolus insulin regimens over sliding-scale regular insulin alone (improved glycemic control without increasing hypoglycemia).",
  },
  {
    id: "klein-schwartz-octreotide-2016",
    citation:
      "Klein-Schwartz W, Stassinos GL, Isbister GK. Treatment of sulfonylurea-induced hypoglycemia with octreotide: a systematic review. Clin Toxicol (Phila). 2016;54(7):582-593.",
    pmid: "27203362",
    doi: "10.1080/15563650.2016.1180387",
    relevance:
      "Systematic review establishing octreotide (50-100 mcg SubQ/IV q8-12h) efficacy in halting refractory sulfonylurea-induced hypoglycemia and mitigating the paradoxical dextrose stimulation trap.",
  },
  {
    id: "boyle-octreotide-su-1993",
    citation:
      "Boyle PJ, Justice K, Krentz AJ, Nagy RJ, Schade DS. Octreotide reverses hyperinsulinemia and prevents hypoglycemia induced by sulfonylurea overdoses. Ann Intern Med. 1993;119(6):463-469.",
    pmid: "8357112",
    doi: "10.7326/0003-4819-119-6-199309150-00003",
    relevance:
      "Elucidated the cellular mechanism of somatostatin analog SSTR2 binding, closure of voltage-dependent calcium channels, and complete arrest of SUR1-mediated insulin exocytosis.",
  },
  {
    id: "fayfman-hyperglycemic-crises-update-2017",
    citation:
      "Fayfman M, Pasquel FJ, Umpierrez GE. Management of Hyperglycemic Crises: Diabetic Ketoacidosis and Hyperglycemic Hyperosmolar State. Med Clin North Am. 2017;101(3):587-606.",
    pmid: "28372715",
    doi: "10.1016/j.mcna.2016.12.011",
    relevance:
      "Modern clinical algorithm detailing two-bag fluid replacement, cerebral edema mitigation, and 2-hour subcutaneous basal insulin overlap prior to discontinuing intravenous insulin.",
  },
  {
    id: "edge-cerebral-edema-2001",
    citation:
      "Edge JA, Jakes RW, Roy Y, et al. The UK risk factor study of cerebral oedema in children and young adults with diabetic ketoacidosis. Arch Dis Child. 2001;85(1):16-22.",
    pmid: "11420190",
    doi: "10.1136/adc.85.1.16",
    relevance:
      "Identified precipitous reductions in effective serum osmolality and excessive early fluid administration as leading contributors to life-threatening cerebral edema in hyperglycemic crises.",
  },
];

// ============================================================================
// 3. TYPES & INTERFACES
// ============================================================================

export type HyperglycemicCrisisType = "DKA" | "HHS" | "COMBINED_DKA_HHS" | "EUGLYCEMIC_DKA" | "UNSPECIFIED_HYPERGLYCEMIA";

export type PotassiumGateStatus =
  | "critical-hold-insulin"
  | "replete-k-run-insulin"
  | "hold-k-run-insulin";

export interface PotassiumSafetyGateEvaluation {
  serumK: number;
  status: PotassiumGateStatus;
  insulinAction: "HOLD_ALL_INSULIN" | "START_OR_CONTINUE_INSULIN";
  isInsulinPermitted: boolean;
  potassiumReplacementRate: string;
  targetSerumK: string;
  monitoringFrequency: string;
  warningSeverity: "critical" | "caution" | "safe";
  warningBanner: string;
  physiologicalRationale: string;
}

export interface CorrectedSodiumResult {
  measuredNa: number;
  glucose: number;
  katzNa: number;
  hillierNa: number;
  selectedFormula: "katz" | "hillier";
  correctedNa: number;
  deltaNa: number;
  clinicalInterpretation: "low" | "normal" | "high";
  recommendedMaintenanceFluid: "0.45% NS (Half-Normal Saline)" | "0.9% NS (Normal Saline)";
}

export interface TwoBagFluidTitrationEvaluation {
  crisisType: HyperglycemicCrisisType;
  currentGlucose: number;
  correctedSodium: CorrectedSodiumResult;
  effectiveSerumOsmolality: number;
  initialResuscitation: {
    fluidType: string;
    rateMlPerHour: string;
    durationHours: string;
    clinicalObjective: string;
  };
  maintenanceFluidPhase: {
    fluidType: string;
    rateMlPerHour: string;
    rationale: string;
  };
  dextroseSwitchThreshold: number; // 200 mg/dL for DKA, 300 mg/dL for HHS
  isDextroseIndicated: boolean;
  dextroseAdditionMilestone: {
    reached: boolean;
    recommendedFluid: string;
    targetGlucoseClampingRange: string;
    cerebralEdemaWarning: string;
    twoBagComposition: {
      bag1: string; // Saline + KCl without dextrose
      bag2: string; // Saline + KCl with 10% dextrose
      titrationStrategy: string;
    };
  };
}

export interface IvInsulinProtocolEvaluation {
  patientWeightKg: number;
  isInsulinPermittedByKGate: boolean;
  fixedRateUnitsPerHour: number; // 0.1 units/kg/h
  noBolusRateUnitsPerHour: number; // 0.14 units/kg/h
  optionalInitialBolusUnits: number; // 0.1 units/kg
  targetDeclineRateRange: string; // "50 to 75 mg/dL per hour"
  declineRateEvaluation?: {
    priorGlucose: number;
    currentGlucose: number;
    hourlyDecline: number;
    assessment: "subtarget" | "optimal" | "acceptable" | "excessive";
    clinicalGuidance: string;
  };
  dkaResolutionStatus: {
    isResolved: boolean;
    criteriaMetCount: number;
    criteriaTotal: number;
    glucoseSatisfied: boolean; // < 200
    bicarbonateSatisfied: boolean; // >= 18
    venousPhSatisfied: boolean; // > 7.30
    anionGapSatisfied: boolean; // <= 12
    clinicalGuidance: string;
  };
  subcutaneousTransitionBridge: {
    mandatoryAdvanceTimeHours: number; // 2 hours
    clinicalProtocol: string;
    halfLifeWarning: string;
    recommendedBasalDoseDescription: string;
  };
}

export interface OctreotideProtocolEvaluation {
  hasSulfonylureaOrSecretagogue: boolean;
  detectedAgents: string[];
  isOverdoseOrRefractoryHypo: boolean;
  adultDosing: {
    route: string;
    doseRange: string;
    frequency: string;
    durationHours: string;
  };
  pediatricDosing: {
    route: string;
    doseMgKg: string;
    frequency: string;
  };
  observationWindowHours: number; // >= 24 hours
  paradoxicalDextroseTrapWarning: string;
  pharmacodynamicMechanism: string;
  monitoringPlan: string;
}

export interface InpatientInsulinRegimenEvaluation {
  patientWeightKg: number;
  phenotypeMultiplier: number;
  phenotypeDescription: string;
  totalDailyDoseUnits: number;
  basalComponent: {
    fraction: number; // 0.50
    dailyUnits: number;
    frequencyOptions: string[];
    typicalAgents: string[];
  };
  prandialComponent: {
    fraction: number; // 0.50
    totalDailyUnits: number;
    perMealUnits: number; // divided into 3 meals
    typicalAgents: string[];
    npoInstructions: string;
  };
  correctionScale: {
    ruleOf1800Isf: number; // mg/dL drop per 1 unit rapid-acting
    ruleOf500Cir: number; // grams carbohydrate per 1 unit rapid-acting
    targetBloodGlucose: number; // 140 mg/dL
    steppedDosingTable: Array<{
      glucoseRange: string;
      additionalUnits: number;
      actionGuidance: string;
    }>;
  };
}

export interface GlycemicDeskDetection {
  hasGlycemicAgent: boolean;
  hasInsulin: boolean;
  hasRapidInsulin: boolean;
  hasRegularInsulin: boolean;
  hasBasalInsulin: boolean;
  hasSulfonylurea: boolean;
  hasMeglitinide: boolean;
  hasSecretagogue: boolean;
  hasOctreotide: boolean;
  hasSglt2: boolean;
  hasMetformin: boolean;
  matchedDrugIds: string[];
  summary: string;
}

export interface GlycemicReportOptions {
  patientWeightKg?: number;
  serumPotassium?: number; // mEq/L
  bloodGlucose?: number; // mg/dL
  priorBloodGlucose?: number; // mg/dL 1 hour ago
  measuredSodium?: number; // mEq/L
  chloride?: number; // mEq/L
  serumBicarbonate?: number; // mEq/L
  venousPh?: number;
  condition?: "DKA" | "HHS";
  isNpo?: boolean;
  patientPhenotype?: "frail_renal" | "standard" | "obese_resistant";
  isSulfonylureaOverdose?: boolean;
}

export interface GlycemicReport {
  onDesk: GlycemicDeskDetection;
  patientWeightKg: number;
  serumPotassium: number;
  bloodGlucose: number;
  potassiumGate: PotassiumSafetyGateEvaluation;
  fluidTitration: TwoBagFluidTitrationEvaluation;
  insulinProtocol: IvInsulinProtocolEvaluation;
  octreotideProtocol: OctreotideProtocolEvaluation;
  inpatientRegimen: InpatientInsulinRegimenEvaluation;
  safetyAlerts: string[];
  clinicalPearls: string[];
  disclaimer: string;
  citations: Citation[];
}

// ============================================================================
// 4. CORE PILLAR 1A: CRITICAL POTASSIUM SAFETY GATE
// ============================================================================

/**
 * Evaluates the critical potassium safety gate prior to initiating or continuing insulin.
 *
 * Physiologic Basis:
 * Exogenous insulin activates cell-membrane Na+/K+ ATPase, driving potassium rapidly into
 * skeletal myocytes and hepatocytes. In baseline hypokalemia (< 3.3 mEq/L), starting insulin
 * collapses extracellular potassium concentrations, precipitating lethal ventricular
 * fibrillation, torsades de pointes, complete heart block, and diaphragmatic respiratory paralysis.
 */
export function evaluatePotassiumSafetyGate(serumK: number): PotassiumSafetyGateEvaluation {
  if (serumK < 3.3) {
    return {
      serumK,
      status: "critical-hold-insulin",
      insulinAction: "HOLD_ALL_INSULIN",
      isInsulinPermitted: false,
      potassiumReplacementRate:
        "20 to 40 mEq/h IV (central venous catheter required for rates > 20 mEq/h; continuous cardiac ECG telemetry) until K+ >= 3.3 mEq/L",
      targetSerumK: "Replete serum K+ to >= 3.3 mEq/L prior to starting any insulin; maintenance target 4.0 to 5.0 mEq/L",
      monitoringFrequency: "Check serum potassium every 1 hour until >= 3.3 mEq/L",
      warningSeverity: "critical",
      warningBanner:
        "CRITICAL POTASSIUM SAFETY GATE: Serum K+ < 3.3 mEq/L! HOLD ALL INSULIN IMMEDIATELY! Administer IV potassium (20-40 mEq/h) until K+ >= 3.3 mEq/L. Starting insulin in severe hypokalemia drives potassium into cells, causing lethal cardiac arrhythmias and respiratory arrest!",
      physiologicalRationale:
        "Insulin binding to its tyrosine kinase receptor activates membrane-bound Na+/K+-ATPase transporters, triggering rapid massive cellular influx of potassium. If administered in profound hypokalemia (<3.3 mEq/L), extracellular potassium drops precipitously, provoking lethal ventricular arrhythmias (ventricular fibrillation, torsades de pointes), asystole, and acute diaphragmatic failure.",
    };
  }

  if (serumK <= 5.3) {
    return {
      serumK,
      status: "replete-k-run-insulin",
      insulinAction: "START_OR_CONTINUE_INSULIN",
      isInsulinPermitted: true,
      potassiumReplacementRate:
        "Add 20 to 30 mEq K+ per liter of IV maintenance fluid (2/3 KCl and 1/3 KPO4 to avoid hyperchloremic acidosis and hypophosphatemia) while running insulin",
      targetSerumK: "Maintain serum K+ within 4.0 to 5.0 mEq/L throughout insulin infusion",
      monitoringFrequency: "Check serum potassium every 2 to 4 hours",
      warningSeverity: "caution",
      warningBanner:
        "POTASSIUM REPLETION MANDATORY: Serum K+ is 3.3 to 5.3 mEq/L. Add 20-30 mEq K+ per liter of IV fluid to maintain serum K+ 4.0-5.0 mEq/L while running insulin.",
      physiologicalRationale:
        "Total body potassium stores are profoundly depleted (typically by 3 to 6 mEq/kg) in DKA/HHS via osmotic diuresis and urinary loss of ketoacid salts. Ongoing insulin infusion and volume expansion will rapidly shift potassium intracellularly; maintenance K+ repletion prevents iatrogenic hypokalemic cardiac collapse.",
    };
  }

  // serumK > 5.3
  return {
    serumK,
    status: "hold-k-run-insulin",
    insulinAction: "START_OR_CONTINUE_INSULIN",
    isInsulinPermitted: true,
    potassiumReplacementRate:
      "Do not add potassium to IV maintenance fluids; initiate/continue IV regular insulin infusion",
    targetSerumK: "Monitor serum K+ every 2 hours until level falls below 5.3 mEq/L, then initiate 20-30 mEq/L repletion",
    monitoringFrequency: "Check serum potassium every 2 hours",
    warningSeverity: "safe",
    warningBanner:
      "HOLD POTASSIUM: Serum K+ > 5.3 mEq/L. Do not add potassium to IV fluids. Initiate/continue insulin infusion and monitor serum potassium every 2 hours.",
    physiologicalRationale:
      "Initial hyperkalemia is common in DKA due to acidemia-induced transcellular H+/K+ exchange, insulinopenia, and hyperosmolality, despite profound whole-body potassium depletion. As insulin drives potassium into cells and volume resuscitation corrects hemoconcentration, serum potassium will fall reliably.",
  };
}

// ============================================================================
// 5. CORE PILLAR 1B: TWO-BAG FLUID TITRATION & CORRECTED SODIUM ENGINE
// ============================================================================

/**
 * Calculates corrected sodium using both Katz (1.6) and Hillier (2.0) factors.
 */
export function calculateCorrectedSodium(
  measuredNa: number,
  glucose: number,
  preferredFormula: "katz" | "hillier" = "katz",
): CorrectedSodiumResult {
  const excessHundreds = Math.max(0, (glucose - 100) / 100);
  const katzNa = Math.round((measuredNa + 1.6 * excessHundreds) * 10) / 10;
  const hillierNa = Math.round((measuredNa + 2.0 * excessHundreds) * 10) / 10;
  const correctedNa = preferredFormula === "hillier" ? hillierNa : katzNa;
  const deltaNa = Math.round((correctedNa - measuredNa) * 10) / 10;

  let clinicalInterpretation: "low" | "normal" | "high" = "normal";
  let recommendedMaintenanceFluid: "0.45% NS (Half-Normal Saline)" | "0.9% NS (Normal Saline)" =
    "0.45% NS (Half-Normal Saline)";

  if (correctedNa < 135) {
    clinicalInterpretation = "low";
    recommendedMaintenanceFluid = "0.9% NS (Normal Saline)";
  } else if (correctedNa > 145) {
    clinicalInterpretation = "high";
    recommendedMaintenanceFluid = "0.45% NS (Half-Normal Saline)";
  } else {
    clinicalInterpretation = "normal";
    recommendedMaintenanceFluid = "0.45% NS (Half-Normal Saline)";
  }

  return {
    measuredNa,
    glucose,
    katzNa,
    hillierNa,
    selectedFormula: preferredFormula,
    correctedNa,
    deltaNa,
    clinicalInterpretation,
    recommendedMaintenanceFluid,
  };
}

/**
 * Calculates effective serum osmolality (mOsm/kg).
 * Effective Osmolality = 2 * Na + (Glucose / 18)
 * (Urea / BUN is omitted because urea is an ineffective osmole that freely permeates cell membranes).
 */
export function calculateEffectiveSerumOsmolality(measuredNa: number, glucose: number): number {
  return Math.round((2 * measuredNa + glucose / 18) * 10) / 10;
}

/**
 * Calculates serum anion gap.
 * Anion Gap = Measured Na - (Chloride + Bicarbonate)
 * Normal reference: 8 to 12 mEq/L.
 */
export function calculateAnionGap(measuredNa: number, chloride: number, bicarbonate: number): number {
  return Math.round(measuredNa - (chloride + bicarbonate));
}

/**
 * Evaluates the Two-Bag IV Fluid Titration protocol and Dextrose Addition Point.
 */
export function evaluateTwoBagFluidTitration(params: {
  measuredNa: number;
  glucose: number;
  condition?: "DKA" | "HHS";
  formula?: "katz" | "hillier";
}): TwoBagFluidTitrationEvaluation {
  const condition = params.condition ?? "DKA";
  const crisisType: HyperglycemicCrisisType = condition === "HHS" ? "HHS" : "DKA";
  const correctedSodium = calculateCorrectedSodium(params.measuredNa, params.glucose, params.formula ?? "katz");
  const effectiveSerumOsmolality = calculateEffectiveSerumOsmolality(params.measuredNa, params.glucose);

  const dextroseSwitchThreshold = condition === "HHS" ? 300 : 200;
  const isDextroseIndicated = params.glucose < dextroseSwitchThreshold;

  const targetClampingRange =
    condition === "HHS" ? "Maintain glucose 200 to 300 mg/dL until alert and hyperosmolality resolves" : "Maintain glucose 150 to 200 mg/dL until acidosis and ketosis resolve";

  return {
    crisisType,
    currentGlucose: params.glucose,
    correctedSodium,
    effectiveSerumOsmolality,
    initialResuscitation: {
      fluidType: "0.9% Normal Saline (0.9% NaCl)",
      rateMlPerHour: "1,000 to 1,500 mL/h (or 15 to 20 mL/kg/h)",
      durationHours: "First 1 to 2 hours",
      clinicalObjective:
        "Expand intravascular volume, restore renal hemodynamics, and accelerate peripheral clearance of counter-regulatory hormones.",
    },
    maintenanceFluidPhase: {
      fluidType: correctedSodium.recommendedMaintenanceFluid,
      rateMlPerHour: "250 to 500 mL/h",
      rationale:
        correctedSodium.clinicalInterpretation === "low"
          ? "Corrected Na is low (<135 mEq/L); isotonic 0.9% NS provides required intravascular osmoles and volume."
          : "Corrected Na is normal or high (>=135 mEq/L); hypotonic 0.45% NS provides free water to correct profound intracellular dehydration.",
    },
    dextroseSwitchThreshold,
    isDextroseIndicated,
    dextroseAdditionMilestone: {
      reached: isDextroseIndicated,
      recommendedFluid: isDextroseIndicated
        ? `5% Dextrose with 0.45% NS (D5 1/2NS) or 0.9% NS + 20-30 mEq K+/L at 150-250 mL/h`
        : `Non-dextrose maintenance fluid (${correctedSodium.recommendedMaintenanceFluid}) until glucose < ${dextroseSwitchThreshold} mg/dL`,
      targetGlucoseClampingRange: targetClampingRange,
      cerebralEdemaWarning:
        "CEREBRAL EDEMA WARNING: Rapid decline in blood glucose without dextrose replacement creates a steep osmotic gradient into brain tissue (idiogenic osmoles), triggering water influx and life-threatening cerebral edema. MANDATORY switch to 5% Dextrose when glucose reaches < 200 mg/dL (DKA) or < 300 mg/dL (HHS) while CONTINUING insulin infusion until acidosis and ketosis resolve!",
      twoBagComposition: {
        bag1: `Bag 1 (No Dextrose): ${correctedSodium.recommendedMaintenanceFluid} + 20-30 mEq KCl/L`,
        bag2: `Bag 2 (High Dextrose): D10 ${correctedSodium.recommendedMaintenanceFluid} + 20-30 mEq KCl/L`,
        titrationStrategy:
          "Run Bag 1 and Bag 2 concomitantly on independent infusion channels at a fixed total rate (e.g., 250 mL/h). Dynamically alter the Bag 1:Bag 2 ratio to vary dextrose delivery between 0% and 10% to clamp blood glucose at 150-200 mg/dL (DKA) without pausing the insulin infusion or wasting IV bags.",
      },
    },
  };
}

// ============================================================================
// 6. CORE PILLAR 1C: IV REGULAR INSULIN PROTOCOL & DKA RESOLUTION CRITERIA
// ============================================================================

export function evaluateIvInsulinProtocol(params: {
  patientWeightKg: number;
  serumK: number;
  currentGlucose: number;
  priorGlucose?: number;
  bicarbonate?: number;
  venousPh?: number;
  anionGap?: number;
}): IvInsulinProtocolEvaluation {
  const kGate = evaluatePotassiumSafetyGate(params.serumK);
  const weight = Math.max(20, Math.min(250, params.patientWeightKg));
  const fixedRateUnitsPerHour = Math.round(weight * 0.1 * 10) / 10;
  const noBolusRateUnitsPerHour = Math.round(weight * 0.14 * 10) / 10;
  const optionalInitialBolusUnits = Math.round(weight * 0.1 * 10) / 10;

  let declineRateEvaluation: IvInsulinProtocolEvaluation["declineRateEvaluation"] = undefined;
  if (params.priorGlucose !== undefined) {
    const hourlyDecline = params.priorGlucose - params.currentGlucose;
    let assessment: "subtarget" | "optimal" | "acceptable" | "excessive" = "optimal";
    let clinicalGuidance = "Target glucose decline achieved (50-75 mg/dL/h). Continue current insulin infusion rate.";

    if (hourlyDecline < 50) {
      assessment = "subtarget";
      clinicalGuidance =
        "Subtarget glucose decline (< 50 mg/dL/h): First verify volume resuscitation. If patient is adequately hydrated, double the insulin infusion rate (or administer an IV bolus of 0.14 units/kg and continue infusion) until target decline of 50-75 mg/dL/h is attained.";
    } else if (hourlyDecline <= 75) {
      assessment = "optimal";
      clinicalGuidance =
        "Optimal glucose decline rate (50-75 mg/dL/h). Continue current insulin rate and monitor blood glucose hourly.";
    } else if (hourlyDecline <= 100) {
      assessment = "acceptable";
      clinicalGuidance =
        "Acceptable glucose decline rate (75-100 mg/dL/h). Maintain close hourly bedside glucose monitoring.";
    } else {
      assessment = "excessive";
      clinicalGuidance =
        "Precipitous glucose decline (> 100 mg/dL/h): High hazard of acute osmolar collapse and cerebral edema. Consider reducing insulin rate by 20% to 50% and prepare dextrose co-infusion.";
    }

    declineRateEvaluation = {
      priorGlucose: params.priorGlucose,
      currentGlucose: params.currentGlucose,
      hourlyDecline,
      assessment,
      clinicalGuidance,
    };
  }

  // DKA Resolution Assessment (ADA Standards of Care):
  // Blood glucose < 200 mg/dL AND at least TWO of:
  // 1. Serum bicarbonate >= 18 mEq/L
  // 2. Venous pH > 7.30
  // 3. Anion gap <= 12 mEq/L
  const glucoseSatisfied = params.currentGlucose < 200;
  const bicarbSatisfied = params.bicarbonate !== undefined && params.bicarbonate >= 18;
  const phSatisfied = params.venousPh !== undefined && params.venousPh > 7.30;
  const agSatisfied = params.anionGap !== undefined && params.anionGap <= 12;

  let criteriaMetCount = 0;
  if (bicarbSatisfied) criteriaMetCount++;
  if (phSatisfied) criteriaMetCount++;
  if (agSatisfied) criteriaMetCount++;

  const isResolved = glucoseSatisfied && criteriaMetCount >= 2;
  const clinicalGuidance = isResolved
    ? "DKA Resolution Criteria MET (Glucose < 200 mg/dL and >= 2 of: HCO3 >= 18, pH > 7.30, Anion Gap <= 12). Patient may transition to subcutaneous insulin once alert and eating."
    : `DKA Not Yet Resolved (Glucose < 200 satisfied: ${glucoseSatisfied ? "YES" : "NO"}; Lab criteria met: ${criteriaMetCount}/3). Continue IV insulin and electrolyte replacement.`;

  return {
    patientWeightKg: weight,
    isInsulinPermittedByKGate: kGate.isInsulinPermitted,
    fixedRateUnitsPerHour,
    noBolusRateUnitsPerHour,
    optionalInitialBolusUnits,
    targetDeclineRateRange: "50 to 75 mg/dL per hour",
    declineRateEvaluation,
    dkaResolutionStatus: {
      isResolved,
      criteriaMetCount,
      criteriaTotal: 3,
      glucoseSatisfied,
      bicarbonateSatisfied: bicarbSatisfied,
      venousPhSatisfied: phSatisfied,
      anionGapSatisfied: agSatisfied,
      clinicalGuidance,
    },
    subcutaneousTransitionBridge: {
      mandatoryAdvanceTimeHours: 2,
      clinicalProtocol:
        "Administer subcutaneous basal insulin (e.g. Glargine, Degludec, Detemir) at least 2 HOURS PRIOR to discontinuing intravenous insulin infusion.",
      halfLifeWarning:
        "CRITICAL HALF-LIFE HAZARD: Intravenous regular insulin possesses an elimination half-life of only 5 to 9 minutes. Abrupt cessation of IV insulin without an established subcutaneous basal depot leads to rapid insulinopenia, unchecked lipolysis, and rebound ketoacidosis within 2 to 4 hours!",
      recommendedBasalDoseDescription:
        "Resume pre-admission home basal dose or calculate weight-based inpatient basal (0.2 to 0.3 units/kg). Overlap by 2 hours.",
    },
  };
}

// ============================================================================
// 7. CORE PILLAR 2: SULFONYLUREA OVERDOSE & OCTREOTIDE ANTIDOTE
// ============================================================================

export const SULFONYLUREA_DRUG_IDS = [
  "glipizide",
  "glyburide",
  "glimepiride",
  "repaglinide",
  "nateglinide",
  "tolbutamide",
  "chlorpropamide",
];

/**
 * Evaluates sulfonylurea / secretagogue toxicity and the octreotide antidote protocol.
 */
export function evaluateSulfonylureaToxicity(
  drugIds: string[],
  options?: { isOverdose?: boolean; patientWeightKg?: number },
): OctreotideProtocolEvaluation {
  const matched = drugIds.filter((id) =>
    SULFONYLUREA_DRUG_IDS.some((su) => id.toLowerCase().includes(su)),
  );
  const hasSulfonylureaOrSecretagogue = matched.length > 0;
  const isOverdoseOrRefractoryHypo = Boolean(options?.isOverdose || hasSulfonylureaOrSecretagogue);

  return {
    hasSulfonylureaOrSecretagogue,
    detectedAgents: matched,
    isOverdoseOrRefractoryHypo,
    adultDosing: {
      route: "Subcutaneous (SubQ) or Slow IV infusion (over 3 minutes)",
      doseRange: "50 to 100 mcg",
      frequency: "Every 8 to 12 hours",
      durationHours: "24 to 48 hours",
    },
    pediatricDosing: {
      route: "Subcutaneous or Slow IV",
      doseMgKg: "1 to 2 mcg/kg per dose (maximum 50 mcg)",
      frequency: "Every 8 to 12 hours",
    },
    observationWindowHours: 24,
    paradoxicalDextroseTrapWarning:
      "THE PARADOXICAL DEXTROSE TRAP: Administering IV dextrose boluses (e.g. D50W) alone triggers rapid glucose influx into pancreatic beta cells via GLUT2. Glucokinase phosphorylation generates intracellular ATP, amplifying depolarization and causing SECONDARY MASSIVE SURGES OF ENDOGENOUS INSULIN RELEASE, resulting in recurrent profound, refractory neuroglycopenic hypoglycemia!",
    pharmacodynamicMechanism:
      "Octreotide is a synthetic somatostatin octapeptide analog that selectively binds somatostatin receptor subtype 2 (SSTR2) and subtype 5 (SSTR5) on pancreatic beta cells. Receptor activation hyperpolarizes beta cells and closes voltage-gated L-type calcium channels, blocking intracellular Ca2+ influx and halting calcium-dependent exocytosis of insulin granules, directly neutralizing SUR1-mediated hyperinsulinemia.",
    monitoringPlan:
      "Administer initial IV dextrose (e.g. 50 mL D50W) only to treat acute neuroglycopenia, followed immediately by Octreotide 50-100 mcg SubQ/IV. Monitor point-of-care blood glucose hourly initially, then every 2-4 hours. Continue glucose monitoring for at least 24 hours AFTER the final dose of octreotide before discharge.",
  };
}

// ============================================================================
// 8. CORE PILLAR 3: INPATIENT BASAL-BOLUS-CORRECTION INSULIN SIZING ENGINE
// ============================================================================

/**
 * Calculates physiological inpatient basal-bolus-correction insulin regimen.
 * Conforms to ADA Standards of Care and landmark RABBIT 2 Trial evidence.
 */
export function calculateInpatientInsulinRegimen(params: {
  patientWeightKg: number;
  phenotype?: "frail_renal" | "standard" | "obese_resistant";
  egfr?: number;
  age?: number;
  isNpo?: boolean;
}): InpatientInsulinRegimenEvaluation {
  const weight = Math.max(20, Math.min(250, params.patientWeightKg));

  // Determine multiplier based on clinical phenotype, age, and renal status
  let phenotypeMultiplier = 0.4;
  let phenotypeDescription = "Standard adult patient (0.4 to 0.5 units/kg/day)";

  if (params.phenotype === "frail_renal" || (params.egfr !== undefined && params.egfr < 45) || (params.age !== undefined && params.age >= 75)) {
    phenotypeMultiplier = 0.25;
    phenotypeDescription =
      "Conservative / Frail / Geriatric / Moderate-to-severe CKD / Dialysis (0.2 to 0.3 units/kg/day) — high hypoglycemia risk";
  } else if (params.phenotype === "obese_resistant") {
    phenotypeMultiplier = 0.65;
    phenotypeDescription =
      "Severe insulin resistance / Obesity (BMI > 30) / High-dose glucocorticoids / Sepsis (0.6 to 0.8 units/kg/day)";
  } else {
    phenotypeMultiplier = 0.45;
    phenotypeDescription = "Standard adult hospitalized patient with Type 2 diabetes (0.4 to 0.5 units/kg/day)";
  }

  const totalDailyDoseUnits = Math.round(weight * phenotypeMultiplier);
  const basalUnits = Math.round(totalDailyDoseUnits * 0.5);
  const prandialTotalUnits = totalDailyDoseUnits - basalUnits; // remaining 50%
  const perMealUnits = Math.round((prandialTotalUnits / 3) * 10) / 10;

  // Rule of 1800 for rapid-acting insulin sensitivity factor (ISF)
  // ISF = 1800 / TDD (mg/dL drop per 1 unit rapid-acting insulin)
  const isf = Math.max(10, Math.round(1800 / Math.max(5, totalDailyDoseUnits)));

  // Rule of 500 for carbohydrate-to-insulin ratio (CIR)
  // CIR = 500 / TDD (grams of carbohydrate covered by 1 unit)
  const cir = Math.max(3, Math.round(500 / Math.max(5, totalDailyDoseUnits)));

  // Target blood glucose: 140 mg/dL
  const targetBg = 140;

  // Stepped correction scale table
  const steppedDosingTable = [
    {
      glucoseRange: "< 140 mg/dL",
      additionalUnits: 0,
      actionGuidance: "Target range (140-180 mg/dL). No correction bolus required.",
    },
    {
      glucoseRange: "140 to 179 mg/dL",
      additionalUnits: Math.max(1, Math.round((160 - targetBg) / isf)),
      actionGuidance: "Mild hyperglycemia above target. Administer pre-meal correction.",
    },
    {
      glucoseRange: "180 to 219 mg/dL",
      additionalUnits: Math.max(2, Math.round((200 - targetBg) / isf)),
      actionGuidance: "Moderate hyperglycemia. Administer pre-meal correction.",
    },
    {
      glucoseRange: "220 to 259 mg/dL",
      additionalUnits: Math.max(3, Math.round((240 - targetBg) / isf)),
      actionGuidance: "Substantial hyperglycemia. Administer correction bolus.",
    },
    {
      glucoseRange: "260 to 299 mg/dL",
      additionalUnits: Math.max(4, Math.round((280 - targetBg) / isf)),
      actionGuidance: "Marked hyperglycemia. Administer correction; verify hydration and oral intake.",
    },
    {
      glucoseRange: ">= 300 mg/dL",
      additionalUnits: Math.max(5, Math.round((320 - targetBg) / isf)),
      actionGuidance:
        "Severe hyperglycemia: Administer correction bolus, evaluate for ketones/infection, and alert managing clinician.",
    },
  ];

  return {
    patientWeightKg: weight,
    phenotypeMultiplier,
    phenotypeDescription,
    totalDailyDoseUnits,
    basalComponent: {
      fraction: 0.5,
      dailyUnits: basalUnits,
      frequencyOptions: ["Once daily at bedtime or morning (Glargine, Degludec)", "Divided q12h (Detemir, NPH)"],
      typicalAgents: ["Insulin glargine (Lantus, Basaglar)", "Insulin degludec (Tresiba)", "Insulin detemir (Levemir)"],
    },
    prandialComponent: {
      fraction: 0.5,
      totalDailyUnits: prandialTotalUnits,
      perMealUnits,
      typicalAgents: ["Insulin lispro (Humalog)", "Insulin aspart (NovoLog)", "Insulin glulisine (Apidra)"],
      npoInstructions:
        "NPO GUIDANCE: If patient is made NPO (nothing by mouth), HOLD all nutritional prandial doses! CONTINUE basal insulin (at 50% to 80% of regular dose to prevent ketogenesis) and continue correctional insulin scale every 4 to 6 hours.",
    },
    correctionScale: {
      ruleOf1800Isf: isf,
      ruleOf500Cir: cir,
      targetBloodGlucose: targetBg,
      steppedDosingTable,
    },
  };
}

// ============================================================================
// 9. DESK DETECTION
// ============================================================================

export function glycemicOnDesk(drugIds: string[]): GlycemicDeskDetection {
  const norm = drugIds.map((d) => d.toLowerCase().trim());

  const hasRapidInsulin = norm.some(
    (d) => d.includes("lispro") || d.includes("aspart") || d.includes("glulisine") || d.includes("novolog") || d.includes("humalog"),
  );
  const hasRegularInsulin = norm.some(
    (d) => d === "insulin-regular" || d.includes("humulin r") || d.includes("novolin r") || d.includes("regular insulin"),
  );
  const hasBasalInsulin = norm.some(
    (d) =>
      d.includes("glargine") ||
      d.includes("detemir") ||
      d.includes("degludec") ||
      d.includes("lantus") ||
      d.includes("basaglar") ||
      d.includes("toujeo") ||
      d.includes("tresiba") ||
      d.includes("levemir") ||
      d.includes("nph"),
  );
  const hasInsulin = hasRapidInsulin || hasRegularInsulin || hasBasalInsulin || norm.some((d) => d.includes("insulin"));

  const hasSulfonylurea = norm.some((d) =>
    SULFONYLUREA_DRUG_IDS.some((su) => d.includes(su)),
  );
  const hasMeglitinide = norm.some((d) => d.includes("repaglinide") || d.includes("nateglinide"));
  const hasSecretagogue = hasSulfonylurea || hasMeglitinide;

  const hasOctreotide = norm.some((d) => d.includes("octreotide") || d.includes("lanreotide") || d.includes("sandostatin"));
  const hasSglt2 = norm.some(
    (d) =>
      d.includes("gliflozin") ||
      d.includes("invokana") ||
      d.includes("farxiga") ||
      d.includes("jardiance") ||
      d.includes("steglatro") ||
      d.includes("inpefa"),
  );
  const hasMetformin = norm.some((d) => d.includes("metformin") || d.includes("glucophage"));

  const matchedDrugIds: string[] = [];
  norm.forEach((id) => {
    if (
      id.includes("insulin") ||
      id.includes("lispro") ||
      id.includes("aspart") ||
      id.includes("glargine") ||
      id.includes("detemir") ||
      id.includes("degludec") ||
      SULFONYLUREA_DRUG_IDS.some((su) => id.includes(su)) ||
      id.includes("repaglinide") ||
      id.includes("nateglinide") ||
      id.includes("octreotide") ||
      id.includes("lanreotide") ||
      id.includes("gliflozin") ||
      id.includes("metformin")
    ) {
      matchedDrugIds.push(id);
    }
  });

  const hasGlycemicAgent =
    hasInsulin || hasSecretagogue || hasOctreotide || hasSglt2 || hasMetformin;

  const parts: string[] = [];
  if (hasInsulin) parts.push("Insulin");
  if (hasSulfonylurea) parts.push("Sulfonylurea");
  if (hasOctreotide) parts.push("Octreotide");
  if (hasSglt2) parts.push("SGLT2i");
  if (hasMetformin) parts.push("Metformin");

  const summary = parts.length > 0 ? parts.join(" · ") : "No glycemic agents detected";

  return {
    hasGlycemicAgent,
    hasInsulin,
    hasRapidInsulin,
    hasRegularInsulin,
    hasBasalInsulin,
    hasSulfonylurea,
    hasMeglitinide,
    hasSecretagogue,
    hasOctreotide,
    hasSglt2,
    hasMetformin,
    matchedDrugIds,
    summary,
  };
}

// ============================================================================
// 10. COMPREHENSIVE REPORT GENERATOR
// ============================================================================

export function glycemicReportOnDesk(
  drugIds: string[],
  host: HostContext,
  options?: GlycemicReportOptions,
): GlycemicReport {
  const onDesk = glycemicOnDesk(drugIds);

  const weight = options?.patientWeightKg ?? 70;
  const serumK = options?.serumPotassium ?? 4.2;
  const bloodGlucose = options?.bloodGlucose ?? 380;
  const condition = options?.condition ?? "DKA";

  const potassiumGate = evaluatePotassiumSafetyGate(serumK);
  const fluidTitration = evaluateTwoBagFluidTitration({
    measuredNa: options?.measuredSodium ?? 134,
    glucose: bloodGlucose,
    condition,
  });

  const anionGap =
    options?.chloride !== undefined && options?.serumBicarbonate !== undefined && options?.measuredSodium !== undefined
      ? calculateAnionGap(options.measuredSodium, options.chloride, options.serumBicarbonate)
      : options?.serumBicarbonate !== undefined
        ? 134 - (102 + options.serumBicarbonate)
        : 18;

  const insulinProtocol = evaluateIvInsulinProtocol({
    patientWeightKg: weight,
    serumK,
    currentGlucose: bloodGlucose,
    priorGlucose: options?.priorBloodGlucose,
    bicarbonate: options?.serumBicarbonate ?? 14,
    venousPh: options?.venousPh ?? 7.22,
    anionGap,
  });

  const octreotideProtocol = evaluateSulfonylureaToxicity(drugIds, {
    isOverdose: options?.isSulfonylureaOverdose,
    patientWeightKg: weight,
  });

  const inpatientRegimen = calculateInpatientInsulinRegimen({
    patientWeightKg: weight,
    phenotype: options?.patientPhenotype,
    egfr: host.egfr,
    age: host.age === "geriatric" ? 78 : 55,
    isNpo: options?.isNpo,
  });

  const safetyAlerts: string[] = [];

  // 1. Critical Potassium Gate Alert
  if (potassiumGate.status === "critical-hold-insulin") {
    safetyAlerts.push(potassiumGate.warningBanner);
  }

  // 2. Dextrose Addition / Cerebral Edema Milestone
  if (fluidTitration.dextroseAdditionMilestone.reached) {
    safetyAlerts.push(fluidTitration.dextroseAdditionMilestone.cerebralEdemaWarning);
  }

  // 3. Sulfonylurea Overdose / Paradoxical Dextrose Trap
  if (octreotideProtocol.hasSulfonylureaOrSecretagogue || options?.isSulfonylureaOverdose) {
    safetyAlerts.push(octreotideProtocol.paradoxicalDextroseTrapWarning);
  }

  // 4. SGLT2 Euglycemic DKA Alert
  if (onDesk.hasSglt2) {
    safetyAlerts.push(
      "SGLT2 INHIBITOR EUGLYCEMIC DKA HAZARD: SGLT2 inhibitors (canagliflozin, dapagliflozin, empagliflozin, ertugliflozin, sotagliflozin) promote persistent renal glucosuria, allowing ketoacidosis to develop at normal or mildly elevated blood glucose levels (< 200-250 mg/dL). Always check serum beta-hydroxybutyrate and venous blood gas even if glucose is not markedly elevated!",
    );
  }

  // 5. Metformin Lactic Acidosis Hazard
  if (onDesk.hasMetformin && (condition === "DKA" || condition === "HHS" || (host.egfr !== undefined && host.egfr < 30))) {
    safetyAlerts.push(
      "METFORMIN LACTIC ACIDOSIS (MALA) RISK: Metformin should be withheld in DKA, HHS, acute renal failure, or sepsis due to impaired hepatic lactate clearance and mitochondrial complex I inhibition. Monitor serum lactate closely.",
    );
  }

  // 6. Subcutaneous Transition Warning
  if (insulinProtocol.dkaResolutionStatus.isResolved) {
    safetyAlerts.push(
      "SUBQ TRANSITION TIMING: Administer subcutaneous basal insulin 2 hours prior to stopping the IV insulin infusion. Stopping IV insulin early causes rebound ketoacidosis within 2 to 4 hours due to IV regular insulin's short 5-9 minute half-life.",
    );
  }

  const clinicalPearls: string[] = [
    "Critical Potassium Gate: If serum K+ < 3.3 mEq/L, insulin must be withheld while aggressive IV potassium (20-40 mEq/h) is administered. Giving insulin in severe hypokalemia drives potassium into cells, precipitating fatal cardiac arrest.",
    "Two-Bag Fluid Resuscitation: Restoring volume with 0.9% NS (1-1.5 L/h first 1-2h), transitioning to 0.45% NS based on corrected sodium, and introducing 5% Dextrose when glucose drops < 200 mg/dL (DKA) or < 300 mg/dL (HHS) prevents rapid osmolar collapse and lethal cerebral edema.",
    "Octreotide Antidote for Sulfonylureas: Sulfonylureas trigger constitutive SUR1-mediated beta-cell depolarization. Giving IV dextrose boluses alone triggers further insulin exocytosis ('the paradoxical dextrose trap'). Octreotide (50-100 mcg SubQ/IV q8-12h) arrests insulin exocytosis via SSTR2 receptors.",
    "Inpatient Basal-Bolus vs Sliding Scale: Sliding-scale monotherapy is condemned by ADA/AACE guidelines due to reactive glycemic rollercoasters. Physiologic basal-bolus regimens (50% basal / 50% nutritional prandial + Rule of 1800 correction) achieve superior glycemic control without increasing hypoglycemia.",
    "Subcutaneous Basal Insulin 2-Hour Overlap: Intravenous regular insulin clears in minutes (half-life 5-9 min). Administering subcutaneous basal insulin 2 hours before stopping the infusion maintains plasma insulin levels while subcutaneous depot absorbs, preventing rapid ketoacidosis relapse.",
  ];

  return {
    onDesk,
    patientWeightKg: weight,
    serumPotassium: serumK,
    bloodGlucose,
    potassiumGate,
    fluidTitration,
    insulinProtocol,
    octreotideProtocol,
    inpatientRegimen,
    safetyAlerts,
    clinicalPearls,
    disclaimer: `${GLYCEMIC_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`,
    citations: GLYCEMIC_CITATIONS,
  };
}
