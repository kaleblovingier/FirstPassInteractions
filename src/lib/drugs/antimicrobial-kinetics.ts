/**
 * Antimicrobial Pharmacokinetics / Pharmacodynamics (PK/PD),
 * Augmented Renal Clearance (ARC) Detection & Organ-Toxicity Safety Rails.
 *
 * FD&C ACT § 520(o)(1)(E) REGULATORY COMPLIANCE POSTURE:
 * Non-Device Clinical Decision Support (CDS) Software Reference.
 * This software module is intended solely for educational, analytical, and
 * clinical decision-support reference by licensed healthcare professionals
 * (Infectious Diseases Specialists, Intensivists, Clinical Pharmacists,
 * Clinical Pharmacologists, and Hospitalists) and medical/pharmacy trainees.
 *
 * In strict conformity with Section 520(o)(1)(E) of the Federal Food, Drug,
 * and Cosmetic Act (21 U.S.C. § 360j(o)(1)(E)):
 * 1. It does not acquire, process, or analyze medical images or signals from in vitro
 *    diagnostic devices or automated pattern recognition;
 * 2. It displays and analyzes established antimicrobial PK/PD indices,
 *    concentration-time profiles, clearance kinetics, and peer-reviewed clinical guidelines;
 * 3. It provides non-prescriptive clinical considerations and educational rationale;
 * 4. It enables healthcare professionals to independently review the pharmacological basis,
 *    mathematical models, and authoritative citations so that they do not rely primarily
 *    on any recommendation to make patient-specific clinical decisions.
 *
 * This engine does NOT provide patient-specific prescribing orders, dosing directives,
 * or automated diagnostic determinations.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext, DEFAULT_HOST } from "./types";

// ============================================================================
// REGULATORY NOTICE & AUTHORITATIVE LITERATURE CITATIONS
// ============================================================================

export const ANTIMICROBIAL_KINETICS_REGULATORY_NOTICE =
  "FirstPass Antimicrobial Pharmacokinetics, Augmented Renal Clearance & Safety Rail Engine is an educational Clinical Decision Support reference under FD&C Act § 520(o)(1)(E). It provides non-prescriptive pharmacological explanations of tri-modal PK/PD indices (fT>MIC, Cmax/MIC, AUC24/MIC), Augmented Renal Clearance (ARC) risk modeling, and high-alert antimicrobial organ-toxicity safety rails compiled from IDSA, ASHP, EUCAST, CLSI, and peer-reviewed critical care literature. It does not provide patient-specific dosing orders, treatment directives, or diagnostic determinations. Licensed clinicians retain sole responsibility for independent regimen design and therapeutic drug monitoring.";

export const ANTIMICROBIAL_KINETICS_CITATIONS: readonly string[] = [
  "Rybak MJ, Le J, Lodise TP, et al. Therapeutic monitoring of vancomycin for serious methicillin-resistant Staphylococcus aureus infections: A revised consensus guideline and review by the ASHP, IDSA, PIDS, and SIDP. Am J Health-Syst Pharm. 2020;77(11):835-864. doi:10.1093/ajhp/zxaa036.",
  "Nicolau DP, Freeman CD, Belliveau PP, et al. Experience with a once-daily aminoglycoside program administered to 2,184 adult patients. Antimicrob Agents Chemother. 1995;39(3):650-655. doi:10.1128/AAC.39.3.650.",
  "Abdul-Aziz MH, Lipman J, Mouton JW, et al. Applying pharmacokinetic/pharmacodynamic principles in critically ill patients: optimizing beta-lactam dosing. Intensive Care Med. 2019;45(11):1589-1601. doi:10.1007/s00134-019-05742-2.",
  "Udy AA, Roberts JA, Lipman J. Implications of augmented renal clearance in critically ill patients. Nat Rev Nephrol. 2011;7(9):539-543. doi:10.1038/nrneph.2011.92.",
  "Barletta JF, Mangram AJ, Sucher JF, et al. Augmented renal clearance in trauma: Validating the ARCTIC scoring model. J Trauma Acute Care Surg. 2017;82(6):1065-1070. doi:10.1097/TA.0000000000001440.",
  "Fugate JE, Kalimullah EA, Hocker SE, et al. Cefepime neurotoxicity in the intensive care unit: a cause of severe, underrecognized encephalopathy. Crit Care. 2013;17(6):R264. doi:10.1186/cc13125.",
  "Boschung-Pasquier L, Atkinson A, Perrottet N, et al. Cefepime neurotoxicity: thresholds and risk factors. A systematic review. Clin Microbiol Infect. 2020;26(3):333-339. doi:10.1016/j.cmi.2019.10.005.",
  "Lawrence KR, Adra M, Gillman PK. Serious adverse events associated with oxazolidinone antibiotics: focus on serotonin syndrome and linezolid. Pharmacotherapy. 2006;26(5):697-707. doi:10.1592/phco.26.5.697.",
  "Bhavnani SM, Rubino CM, Ambrose PG, Drusano GL. Daptomycin exposure and the probability of elevations in creatine phosphokinase (CPK): an analysis of patients from a prospective clinical trial. Clin Infect Dis. 2010;50(12):1568-1574. doi:10.1086/652767.",
  "The European Committee on Antimicrobial Susceptibility Testing (EUCAST). Pharmacokinetic-pharmacodynamic (PK/PD) dosing guidelines and clinical breakpoints. EUCAST; 2024.",
];

// ============================================================================
// DATA CONTRACTS & TAXONOMY
// ============================================================================

export type AntimicrobialClass =
  | "beta_lactam"
  | "aminoglycoside"
  | "glycopeptide"
  | "lipopeptide"
  | "oxazolidinone"
  | "polymyxin"
  | "fluoroquinolone";

export type BetaLactamSubclass =
  | "carbapenem"
  | "penicillin"
  | "cephalosporin"
  | "monobactam";

export type PkPdIndexType =
  | "time_dependent"
  | "concentration_dependent"
  | "exposure_dependent";

// ----------------------------------------------------------------------------
// Beta-Lactam Profiles & Inputs
// ----------------------------------------------------------------------------

export interface BetaLactamProfile {
  id: string;
  name: string;
  subclass: BetaLactamSubclass;
  proteinBindingPct: number;
  freeFraction: number; // fu = 1 - (proteinBindingPct / 100)
  typicalHalfLifeHours: number;
  vdPerKg: number; // Volume of distribution (L/kg)
  renalExcretionFraction: number; // fraction excreted unchanged renally
  standardThresholdPct: number; // %fT > MIC bactericidal target (40% carbapenem, 50% pen, 60-70% ceph)
  criticalIllTargetMultiplier: number; // 4 to 5x MIC for 100% fT
  standardDoseMg: number;
  standardIntervalHours: number;
  standardInfusionHours: number;
  extendedInfusionHours: number;
  continuousInfusionViable: boolean;
  clinicalPearls: string[];
}

export const BETA_LACTAM_PROFILES: Record<string, BetaLactamProfile> = {
  meropenem: {
    id: "meropenem",
    name: "Meropenem",
    subclass: "carbapenem",
    proteinBindingPct: 2,
    freeFraction: 0.98,
    typicalHalfLifeHours: 1.0,
    vdPerKg: 0.25,
    renalExcretionFraction: 0.70,
    standardThresholdPct: 40,
    criticalIllTargetMultiplier: 4,
    standardDoseMg: 1000,
    standardIntervalHours: 8,
    standardInfusionHours: 0.5,
    extendedInfusionHours: 3.0,
    continuousInfusionViable: true,
    clinicalPearls: [
      "Carbapenem bactericidal threshold: Free concentration above MIC for >= 40% of dosing interval (40% fT > MIC).",
      "Critically ill target: 100% fT > 4x MIC for deep-seated infections, septic shock, and elevated MIC pathogens (Pseudomonas aeruginosa).",
      "Extended infusion (3-hour infusion of 1g or 2g q8h) substantially increases %fT > MIC without increasing total daily dose.",
      "In Augmented Renal Clearance (CrCl > 130-150 mL/min), clearance accelerates 2-fold; standard 1g q8h intermittent bolus leads to subtherapeutic troughs within 2-3 hours.",
    ],
  },
  "piperacillin-tazobactam": {
    id: "piperacillin-tazobactam",
    name: "Piperacillin / Tazobactam (Zosyn)",
    subclass: "penicillin",
    proteinBindingPct: 25,
    freeFraction: 0.75,
    typicalHalfLifeHours: 1.0,
    vdPerKg: 0.24,
    renalExcretionFraction: 0.68,
    standardThresholdPct: 50,
    criticalIllTargetMultiplier: 4,
    standardDoseMg: 4500, // or 3375
    standardIntervalHours: 8,
    standardInfusionHours: 0.5,
    extendedInfusionHours: 4.0,
    continuousInfusionViable: true,
    clinicalPearls: [
      "Penicillin bactericidal threshold: Free drug above MIC for >= 50% of interval (50% fT > MIC).",
      "Extended infusion (3.375g or 4.5g infused over 4 hours every 8 hours) achieves superior pharmacodynamic target attainment for Pseudomonas aeruginosa (MIC 8-16 mg/L).",
      "Co-administration with vancomycin produces synergistic acute kidney injury (AKI) / interstitial nephritis rates compared to vancomycin + cefepime.",
    ],
  },
  cefepime: {
    id: "cefepime",
    name: "Cefepime (Maxipime)",
    subclass: "cephalosporin",
    proteinBindingPct: 20,
    freeFraction: 0.80,
    typicalHalfLifeHours: 2.0,
    vdPerKg: 0.25,
    renalExcretionFraction: 0.85,
    standardThresholdPct: 65,
    criticalIllTargetMultiplier: 4,
    standardDoseMg: 2000,
    standardIntervalHours: 8,
    standardInfusionHours: 0.5,
    extendedInfusionHours: 4.0,
    continuousInfusionViable: true,
    clinicalPearls: [
      "Cephalosporin bactericidal threshold: Free concentration above MIC for >= 60-70% of dosing interval.",
      "Critically ill deep infection target: 100% fT > 4x MIC.",
      "High-Alert Organ Safety: Crosses the blood-brain barrier and exerts concentration-dependent competitive antagonism at postsynaptic GABA-A receptors.",
      "In renal impairment (CrCl < 50 mL/min) without dose reduction, cefepime accumulates (troughs > 20-35 mcg/mL) triggering non-convulsive status epilepticus (NCSE), encephalopathy, and myoclonus.",
    ],
  },
  ceftazidime: {
    id: "ceftazidime",
    name: "Ceftazidime (Fortaz)",
    subclass: "cephalosporin",
    proteinBindingPct: 10,
    freeFraction: 0.90,
    typicalHalfLifeHours: 1.8,
    vdPerKg: 0.23,
    renalExcretionFraction: 0.85,
    standardThresholdPct: 65,
    criticalIllTargetMultiplier: 4,
    standardDoseMg: 2000,
    standardIntervalHours: 8,
    standardInfusionHours: 0.5,
    extendedInfusionHours: 3.0,
    continuousInfusionViable: true,
    clinicalPearls: [
      "Cephalosporin bactericidal target: >= 60-70% fT > MIC.",
      "Extended or continuous infusion (e.g. 6g continuous infusion per 24 hours) optimizes bactericidal eradication in cystic fibrosis and nosocomial pneumonia.",
    ],
  },
  ceftriaxone: {
    id: "ceftriaxone",
    name: "Ceftriaxone (Rocephin)",
    subclass: "cephalosporin",
    proteinBindingPct: 90,
    freeFraction: 0.10,
    typicalHalfLifeHours: 8.0,
    vdPerKg: 0.15,
    renalExcretionFraction: 0.50, // dual biliary/renal
    standardThresholdPct: 65,
    criticalIllTargetMultiplier: 4,
    standardDoseMg: 2000,
    standardIntervalHours: 24,
    standardInfusionHours: 0.5,
    extendedInfusionHours: 2.0,
    continuousInfusionViable: false,
    clinicalPearls: [
      "Long half-life (~8 hours) allows once-daily dosing (q24h) for most infections.",
      "Saturable protein binding (90-95% bound; free fraction rises in hypoalbuminemia or severe sepsis).",
      "Dual elimination (50% renal, 50% biliary); generally does not require renal dosage adjustment in isolated renal failure.",
      "Contraindicated with calcium-containing IV solutions in neonates due to fatal calcium-ceftriaxone crystalline precipitation in lungs and kidneys.",
    ],
  },
  aztreonam: {
    id: "aztreonam",
    name: "Aztreonam (Azactam)",
    subclass: "monobactam",
    proteinBindingPct: 56,
    freeFraction: 0.44,
    typicalHalfLifeHours: 1.7,
    vdPerKg: 0.20,
    renalExcretionFraction: 0.70,
    standardThresholdPct: 55,
    criticalIllTargetMultiplier: 4,
    standardDoseMg: 2000,
    standardIntervalHours: 8,
    standardInfusionHours: 0.5,
    extendedInfusionHours: 3.0,
    continuousInfusionViable: true,
    clinicalPearls: [
      "Monobactam bactericidal threshold: >= 50-60% fT > MIC.",
      "Gram-negative aerobic coverage only (no Gram-positive or anaerobic activity).",
      "Safe in severe penicillin allergy / anaphylaxis due to lack of cross-reactivity (EXCEPT with ceftazidime, which shares an identical R1 side chain!).",
    ],
  },
};

export interface BetaLactamSimulationInput {
  drugId: string;
  doseMg: number;
  intervalHours: number;
  infusionHours: number;
  crCl: number; // mL/min
  mic: number; // mg/L or mcg/mL
  patientWeightKg?: number;
}

export interface BetaLactamSimulationResult {
  drugId: string;
  drugName: string;
  subclass: BetaLactamSubclass;
  ke: number; // elimination rate constant (1/h)
  halfLifeHours: number;
  clearanceLPerHr: number;
  volumeDistributionL: number;
  cMaxSsUgMl: number;
  cMinSsUgMl: number;
  freeCMaxSsUgMl: number;
  freeCMinSsUgMl: number;
  fTAboveMicHours: number;
  fTAboveMicPct: number;
  fTAbove4xMicPct: number;
  standardThresholdPct: number;
  standardThresholdAchieved: boolean;
  criticalIllTargetAchieved: boolean;
  infusionMode: "standard_bolus" | "extended_infusion" | "continuous_infusion";
  comparisonVsBolus?: {
    standardBolusPct: number;
    extendedInfusionPct: number;
    gainPct: number;
    criticalGainPct: number;
  };
  arcWarning: boolean;
  clinicalRationale: string;
}

// ----------------------------------------------------------------------------
// Aminoglycosides & Hartford Nomogram Profiles & Inputs
// ----------------------------------------------------------------------------

export interface AminoglycosideHartfordInput {
  agent: "gentamicin" | "tobramycin" | "amikacin";
  doseMgPerKg?: number; // 7 mg/kg for gent/tobra, 15 mg/kg for amikacin
  actualWeightKg: number;
  heightCm: number;
  sex: "male" | "female";
  serumLevelUgMl?: number;
  drawHoursPostDose?: number; // 6 to 14 hours
  mic?: number;
}

export interface AminoglycosideHartfordResult {
  agent: string;
  actualWeightKg: number;
  ibwKg: number;
  adjBwKg: number;
  weightCategory: "underweight" | "normal" | "obese";
  dosingWeightType: "actual" | "ibw" | "adj";
  dosingWeightKg: number;
  recommendedDoseMg: number;
  dosePerKgUsed: number;
  estimatedPeakUgMl: number;
  peakToMicRatio: number;
  peakTargetAchieved: boolean; // Cmax/MIC >= 8-10:1
  nomogramInterval: "q24h" | "q36h" | "q48h" | "off_nomogram" | null;
  drawTimeHours: number | null;
  measuredLevelUgMl: number | null;
  troughWashoutTargetUgMl: number;
  postAntibioticEffectHours: string;
  lysosomalSaturationPearl: string;
  organToxicityRail: {
    nephrotoxicity: string;
    ototoxicity: string;
    loopDiureticCollision: boolean;
  };
  clinicalRecommendation: string;
}

// ----------------------------------------------------------------------------
// Vancomycin AUC24/MIC Profiles & Inputs
// ----------------------------------------------------------------------------

export interface VancomycinAucInput {
  totalDailyDoseMg: number;
  crCl: number;
  weightKg?: number;
  mic?: number; // default 1.0 mg/L
  measuredTroughUgMl?: number;
}

export interface VancomycinAucResult {
  totalDailyDoseMg: number;
  estimatedClearanceLPerHr: number;
  estimatedAuc24: number;
  mic: number;
  aucToMicRatio: number;
  band: "subtherapeutic" | "target" | "supratherapeutic_toxic";
  targetAttained: boolean;
  nephrotoxicityRisk: "standard" | "elevated" | "severe";
  akiOddsRatio: number;
  troughWarning: string | null;
  consensusGuidelineRecommendation: string;
}

// ----------------------------------------------------------------------------
// Augmented Renal Clearance (ARC) & ARCTIC Score
// ----------------------------------------------------------------------------

export interface ArcticScoreInput {
  age: number;
  hasTrauma: boolean;
  sofaScore: number;
  crClMeasured?: number;
}

export interface ArcticScoreResult {
  agePoints: number;
  traumaPoints: number;
  sofaPoints: number;
  totalScore: number; // 0 to 10
  isHighRiskArc: boolean; // Score >= 6 indicates high risk
  physiologicDefinition: string;
  hyperdynamicMechanism: string;
  hydrophilicAntibioticTrap: string;
  populationsAtRisk: string[];
  recommendedDosingAdaptations: string[];
  monitoringGuidance: string;
}

// ----------------------------------------------------------------------------
// High-Alert Antimicrobial Organ-Toxicity Safety
// ----------------------------------------------------------------------------

export interface CefepimeNeurotoxicityAssessment {
  crCl: number;
  isDialysis: boolean;
  riskLevel: "standard" | "high" | "critical";
  gabaAAntagonismMechanism: string;
  toxicTroughThresholdMcgMl: number;
  eegFindings: {
    pattern: string;
    triphasicWaves: boolean;
    significance: string;
  };
  clinicalSpectrum: string[];
  hemodialysisClearancePct: number;
  actionPlan: string[];
}

export interface LinezolidSafetyAssessment {
  durationDays: number;
  serotoninCollisionPresent: boolean;
  collidingSerotonergicDrugs: string[];
  maoiMechanism: string;
  serotoninSyndromeRisk: "none" | "critical";
  tyraminePressorRisk: "moderate" | "high";
  myelosuppressionWarning: boolean;
  neuropathyWarning: boolean;
  mitochondrialMechanism: string;
  actionPlan: string[];
}

export interface DaptomycinSafetyAssessment {
  isPneumoniaIndication: boolean;
  surfactantContraindicationAlert: string;
  statinCollisionPresent: boolean;
  collidingStatins: string[];
  cpkMonitoringRule: string;
  discontinuationThresholds: {
    symptomaticCpkU_L: number;
    asymptomaticCpkU_L: number;
  };
  membraneDepolarizationMechanism: string;
}

// ----------------------------------------------------------------------------
// Desk Detection Contract
// ----------------------------------------------------------------------------

export interface AntimicrobialDeskDetection {
  hasAntimicrobial: boolean;
  hasBetaLactam: boolean;
  hasPenicillin: boolean;
  hasCephalosporin: boolean;
  hasCarbapenem: boolean;
  hasMonobactam: boolean;
  hasAminoglycoside: boolean;
  hasGlycopeptide: boolean;
  hasVancomycin: boolean;
  hasLipopeptide: boolean;
  hasDaptomycin: boolean;
  hasOxazolidinone: boolean;
  hasLinezolid: boolean;
  hasPolymyxin: boolean;
  hasFluoroquinolone: boolean;
  hasCefepime: boolean;
  matchedAntimicrobials: string[];
  matchedInteractingAgents: string[];
  detectedClasses: AntimicrobialClass[];
}

// ----------------------------------------------------------------------------
// Master Comprehensive Report Contract
// ----------------------------------------------------------------------------

export interface AntimicrobialMasterReport {
  detection: AntimicrobialDeskDetection;
  arcAssessment: ArcticScoreResult;
  betaLactamAssessments: BetaLactamSimulationResult[];
  aminoglycosideAssessments: AminoglycosideHartfordResult[];
  vancomycinAssessment?: VancomycinAucResult;
  cefepimeAssessment?: CefepimeNeurotoxicityAssessment;
  linezolidAssessment?: LinezolidSafetyAssessment;
  daptomycinAssessment?: DaptomycinSafetyAssessment;
  organSafetyAlerts: Array<{
    drug: string;
    severity: "critical" | "high" | "warning";
    title: string;
    mechanism: string;
    action: string;
  }>;
  stewardshipPearls: string[];
  regulatoryNotice: string;
  citations: readonly string[];
}

// ============================================================================
// DRUG ID TAXONOMY CONSTANTS
// ============================================================================

export const BETA_LACTAM_IDS = new Set([
  "meropenem",
  "meropenem-vaborbactam",
  "ertapenem",
  "imipenem",
  "imipenem-cilastatin",
  "doripenem",
  "piperacillin-tazobactam",
  "piperacillin",
  "ampicillin",
  "ampicillin-sulbactam",
  "amoxicillin",
  "amoxicillin-clavulanate",
  "penicillin-g",
  "penicillin-v",
  "nafcillin",
  "oxacillin",
  "cefepime",
  "ceftriaxone",
  "ceftazidime",
  "ceftazidime-avibactam",
  "ceftolozane-tazobactam",
  "ceftaroline",
  "ceftobiprole",
  "ceftibuten",
  "cefazolin",
  "cefdinir",
  "cefuroxime",
  "cefoxitin",
  "cefotetan",
  "cefpodoxime",
  "cephalexin",
  "aztreonam",
]);

export const AMINOGLYCOSIDE_IDS = new Set([
  "gentamicin",
  "tobramycin",
  "amikacin",
  "streptomycin",
  "plazomicin",
  "neomycin",
]);

export const GLYCOPEPTIDE_IDS = new Set([
  "vancomycin",
  "vancomycin-oral",
  "dalbavancin",
  "oritavancin",
  "telavancin",
]);

export const LIPOPEPTIDE_IDS = new Set(["daptomycin"]);

export const OXAZOLIDINONE_IDS = new Set(["linezolid", "tedizolid"]);

export const POLYMYXIN_IDS = new Set(["colistin", "polymyxin-b", "polymyxin"]);

export const FLUOROQUINOLONE_IDS = new Set([
  "ciprofloxacin",
  "levofloxacin",
  "moxifloxacin",
  "delafloxacin",
  "ofloxacin",
]);

export const SEROTONERGIC_IDS = new Set([
  "fluoxetine",
  "sertraline",
  "paroxetine",
  "citalopram",
  "escitalopram",
  "fluvoxamine",
  "venlafaxine",
  "desvenlafaxine",
  "duloxetine",
  "milnacipran",
  "levomilnacipran",
  "vilazodone",
  "vortioxetine",
  "tramadol",
  "meperidine",
  "methadone",
  "dextromethorphan",
  "buspirone",
  "trazodone",
]);

export const STATIN_IDS = new Set([
  "atorvastatin",
  "rosuvastatin",
  "simvastatin",
  "pravastatin",
  "lovastatin",
  "fluvastatin",
  "pitavastatin",
]);

export const LOOP_DIURETIC_IDS = new Set([
  "furosemide",
  "bumetanide",
  "torsemide",
  "ethacrynic-acid",
]);

export const NMBA_IDS = new Set([
  "rocuronium",
  "vecuronium",
  "cisatracurium",
  "pancuronium",
  "succinylcholine",
]);

export const CATION_IDS = new Set([
  "calcium",
  "calcium-carbonate",
  "magnesium",
  "magnesium-oxide",
  "aluminum-hydroxide",
  "ferrous-sulfate",
  "iron",
  "zinc",
]);

export const STEROID_IDS = new Set([
  "prednisone",
  "prednisolone",
  "methylprednisolone",
  "dexamethasone",
  "hydrocortisone",
]);

// ============================================================================
// CORE ALGORITHMIC IMPLEMENTATIONS
// ============================================================================

/**
 * Simulates Beta-Lactam Pharmacokinetics across Intermittent, Extended, or Continuous Infusions.
 * Evaluates %fT > MIC bactericidal target and critically ill 100% fT > 4x MIC target.
 */
export function simulateBetaLactamInfusion({
  drugId,
  doseMg,
  intervalHours,
  infusionHours,
  crCl,
  mic,
  patientWeightKg = 70,
}: BetaLactamSimulationInput): BetaLactamSimulationResult {
  const profile = BETA_LACTAM_PROFILES[drugId] ?? BETA_LACTAM_PROFILES["meropenem"];
  const weight = Math.max(30, Math.min(250, patientWeightKg));
  const clCrClamped = Math.max(10, Math.min(250, crCl));
  const micClamped = Math.max(0.0625, Math.min(64, mic));
  const tau = Math.max(4, Math.min(48, intervalHours));
  const tInf = Math.max(0.25, Math.min(tau, infusionHours));
  const dose = Math.max(250, doseMg);

  // Volume of distribution Vd (L)
  const vd = profile.vdPerKg * weight;

  // Baseline clearance at CrCl 100 mL/min
  const keBaseline = Math.LN2 / profile.typicalHalfLifeHours;
  const clBaselineLHr = vd * keBaseline;

  // Split renal vs non-renal clearance based on renalExcretionFraction
  const clNonRenal = clBaselineLHr * (1 - profile.renalExcretionFraction);
  const clRenal = clBaselineLHr * profile.renalExcretionFraction * (clCrClamped / 100);
  const clearanceLHr = clNonRenal + clRenal;

  const ke = clearanceLHr / vd;
  const halfLifeHours = Math.LN2 / ke;

  const isContinuous = tInf >= tau || tInf >= 24;
  let cMaxSs = 0;
  let cMinSs = 0;
  let fTAboveMicHours = 0;
  let fTAbove4xMicHours = 0;

  if (isContinuous) {
    // 24-hour continuous infusion steady state: Css = Rate / CL = Dose_total / (tau * CL)
    const rateMgHr = dose / tau;
    cMaxSs = rateMgHr / clearanceLHr;
    cMinSs = cMaxSs;
    const freeCss = cMaxSs * profile.freeFraction;

    if (freeCss >= micClamped) {
      fTAboveMicHours = tau;
    }
    if (freeCss >= micClamped * profile.criticalIllTargetMultiplier) {
      fTAbove4xMicHours = tau;
    }
  } else {
    // Intermittent or extended infusion steady state (one-compartment model)
    const expKeTinf = Math.exp(-ke * tInf);
    const expKeTau = Math.exp(-ke * tau);

    // Cmax,ss at the end of zero-order infusion
    const numerator = dose * (1 - expKeTinf);
    const denominator = tInf * vd * ke * (1 - expKeTau);
    cMaxSs = denominator > 0 ? numerator / denominator : 0;

    // Cmin,ss at the end of dosing interval
    cMinSs = cMaxSs * Math.exp(-ke * (tau - tInf));

    // Numerical integration across dosing interval with 240 steps (~1-2 min step)
    const steps = 240;
    const dt = tau / steps;
    const target1 = micClamped;
    const target4 = micClamped * profile.criticalIllTargetMultiplier;

    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) * dt;
      let totalC = 0;
      if (t <= tInf) {
        totalC = (dose / (tInf * vd * ke)) * (1 - Math.exp(-ke * t)) + cMinSs * Math.exp(-ke * t);
      } else {
        totalC = cMaxSs * Math.exp(-ke * (t - tInf));
      }
      const freeC = totalC * profile.freeFraction;
      if (freeC >= target1) {
        fTAboveMicHours += dt;
      }
      if (freeC >= target4) {
        fTAbove4xMicHours += dt;
      }
    }
  }

  const fTAboveMicPct = Math.min(100, Math.round((fTAboveMicHours / tau) * 1000) / 10);
  const fTAbove4xMicPct = Math.min(100, Math.round((fTAbove4xMicHours / tau) * 1000) / 10);

  const standardAchieved = fTAboveMicPct >= profile.standardThresholdPct;
  const criticalAchieved = fTAbove4xMicPct >= 100;

  let infusionMode: BetaLactamSimulationResult["infusionMode"] = "standard_bolus";
  if (isContinuous) {
    infusionMode = "continuous_infusion";
  } else if (tInf >= 2.5) {
    infusionMode = "extended_infusion";
  }

  // Calculate comparative gain if currently extended or continuous vs standard 0.5h bolus
  let comparisonVsBolus: BetaLactamSimulationResult["comparisonVsBolus"] = undefined;
  if (tInf > 0.5) {
    const bolusSim = simulateBetaLactamInfusion({
      drugId,
      doseMg,
      intervalHours: tau,
      infusionHours: 0.5,
      crCl: clCrClamped,
      mic: micClamped,
      patientWeightKg: weight,
    });
    comparisonVsBolus = {
      standardBolusPct: bolusSim.fTAboveMicPct,
      extendedInfusionPct: fTAboveMicPct,
      gainPct: Math.round((fTAboveMicPct - bolusSim.fTAboveMicPct) * 10) / 10,
      criticalGainPct: Math.round((fTAbove4xMicPct - bolusSim.fTAbove4xMicPct) * 10) / 10,
    };
  }

  const arcWarning = clCrClamped > 130;

  let clinicalRationale = `${profile.name} exhibits time-dependent bactericidal killing. Free drug concentrations must exceed the pathogen MIC for >= ${profile.standardThresholdPct}% of the interval for standard efficacy.`;
  if (criticalAchieved) {
    clinicalRationale += ` Aggressive critically ill target of 100% fT > 4x MIC (${(micClamped * 4).toFixed(1)} mcg/mL) is successfully achieved.`;
  } else if (standardAchieved) {
    clinicalRationale += ` Standard target achieved (${fTAboveMicPct}%), but falls short of 100% fT > 4x MIC for deep-seated infection.`;
  } else {
    clinicalRationale += ` SUBTHERAPEUTIC: Fails to maintain free drug > MIC for the bactericidal threshold (${fTAboveMicPct}% vs ${profile.standardThresholdPct}% required). Risk of clinical failure.`;
  }

  return {
    drugId: profile.id,
    drugName: profile.name,
    subclass: profile.subclass,
    ke: Math.round(ke * 1000) / 1000,
    halfLifeHours: Math.round(halfLifeHours * 10) / 10,
    clearanceLPerHr: Math.round(clearanceLHr * 10) / 10,
    volumeDistributionL: Math.round(vd * 10) / 10,
    cMaxSsUgMl: Math.round(cMaxSs * 10) / 10,
    cMinSsUgMl: Math.round(cMinSs * 10) / 10,
    freeCMaxSsUgMl: Math.round(cMaxSs * profile.freeFraction * 10) / 10,
    freeCMinSsUgMl: Math.round(cMinSs * profile.freeFraction * 10) / 10,
    fTAboveMicHours: Math.round(fTAboveMicHours * 10) / 10,
    fTAboveMicPct,
    fTAbove4xMicPct,
    standardThresholdPct: profile.standardThresholdPct,
    standardThresholdAchieved: standardAchieved,
    criticalIllTargetAchieved: criticalAchieved,
    infusionMode,
    comparisonVsBolus,
    arcWarning,
    clinicalRationale,
  };
}

// ----------------------------------------------------------------------------
// Hartford Nomogram Cutoff Table
// ----------------------------------------------------------------------------

interface HartfordRow {
  hour: number;
  q24Max: number;
  q36Max: number;
  q48Max: number;
}

const HARTFORD_CUTOFFS: readonly HartfordRow[] = [
  { hour: 6, q24Max: 4.5, q36Max: 7.0, q48Max: 10.0 },
  { hour: 7, q24Max: 3.5, q36Max: 5.5, q48Max: 8.0 },
  { hour: 8, q24Max: 2.8, q36Max: 4.5, q48Max: 6.5 },
  { hour: 9, q24Max: 2.2, q36Max: 3.5, q48Max: 5.2 },
  { hour: 10, q24Max: 1.8, q36Max: 2.8, q48Max: 4.1 },
  { hour: 11, q24Max: 1.4, q36Max: 2.2, q48Max: 3.3 },
  { hour: 12, q24Max: 1.1, q36Max: 1.8, q48Max: 2.6 },
  { hour: 13, q24Max: 0.9, q36Max: 1.4, q48Max: 2.1 },
  { hour: 14, q24Max: 0.7, q36Max: 1.1, q48Max: 1.7 },
];

/**
 * Calculates Aminoglycoside Extended-Interval (Hartford Nomogram) Kinetics.
 * Computes Devine IBW, AdjBW (0.4 factor in obesity), peak-to-MIC ratio, and Hartford interval.
 */
export function calculateAminoglycosideHartford({
  agent,
  doseMgPerKg,
  actualWeightKg,
  heightCm,
  sex,
  serumLevelUgMl,
  drawHoursPostDose,
  mic = agent === "amikacin" ? 4.0 : 1.0,
}: AminoglycosideHartfordInput): AminoglycosideHartfordResult {
  const isAmikacin = agent === "amikacin";
  const defaultDoseMgKg = isAmikacin ? 15 : 7;
  const doseMgKg = doseMgPerKg && doseMgPerKg > 0 ? doseMgPerKg : defaultDoseMgKg;

  // Devine IBW calculation
  const heightInches = heightCm / 2.54;
  const inchesOver60 = heightInches - 60;
  const baseIbw = sex === "male" ? 50 : 45.5;
  const rawIbw = baseIbw + 2.3 * inchesOver60;
  const ibwKg = Math.round(Math.max(20, rawIbw) * 10) / 10;

  // Adjusted Body Weight with 0.4 correction
  const adjBwKg = Math.round((ibwKg + 0.4 * (actualWeightKg - ibwKg)) * 10) / 10;
  const weightRatio = actualWeightKg / ibwKg;

  let weightCategory: AminoglycosideHartfordResult["weightCategory"] = "normal";
  let dosingWeightType: AminoglycosideHartfordResult["dosingWeightType"] = "ibw";
  let dosingWeightKg = ibwKg;

  if (weightRatio < 1.0) {
    weightCategory = "underweight";
    dosingWeightType = "actual";
    dosingWeightKg = actualWeightKg;
  } else if (weightRatio > 1.2) {
    weightCategory = "obese";
    dosingWeightType = "adj";
    dosingWeightKg = adjBwKg;
  }

  const recommendedDoseMg = Math.round(dosingWeightKg * doseMgKg);

  // Volume of distribution Vd ~0.26 L/kg of dosing weight
  const vd = dosingWeightKg * 0.26;
  const estimatedPeakUgMl = Math.round((recommendedDoseMg / vd) * 10) / 10;
  const peakToMicRatio = Math.round((estimatedPeakUgMl / mic) * 10) / 10;
  const peakTargetAchieved = peakToMicRatio >= 8.0;

  // Hartford nomogram interval determination
  let nomogramInterval: AminoglycosideHartfordResult["nomogramInterval"] = null;
  const drawTime = drawHoursPostDose ?? null;
  const measuredLevel = serumLevelUgMl ?? null;

  if (drawTime !== null && measuredLevel !== null && drawTime >= 6 && drawTime <= 14) {
    const roundedHour = Math.round(drawTime);
    const row = HARTFORD_CUTOFFS.find((r) => r.hour === roundedHour);
    if (row) {
      // Amikacin cutoffs are 2.5x those of gentamicin/tobramycin
      const factor = isAmikacin ? 2.5 : 1.0;
      const q24Limit = row.q24Max * factor;
      const q36Limit = row.q36Max * factor;
      const q48Limit = row.q48Max * factor;

      if (measuredLevel <= q24Limit) {
        nomogramInterval = "q24h";
      } else if (measuredLevel <= q36Limit) {
        nomogramInterval = "q36h";
      } else if (measuredLevel <= q48Limit) {
        nomogramInterval = "q48h";
      } else {
        nomogramInterval = "off_nomogram";
      }
    }
  }

  const agentLabel = agent.charAt(0).toUpperCase() + agent.slice(1);
  const troughWashoutTargetUgMl = isAmikacin ? 2.5 : 0.5;

  let clinicalRec = `${agentLabel} ${doseMgKg} mg/kg dosing based on ${dosingWeightType.toUpperCase()} (${dosingWeightKg} kg) achieves an estimated peak of ${estimatedPeakUgMl} mcg/mL (Cmax/MIC ratio ${peakToMicRatio}:1).`;
  if (!peakTargetAchieved) {
    clinicalRec += ` Target Cmax/MIC >= 8-10:1 NOT met for MIC ${mic} mcg/mL.`;
  } else {
    clinicalRec += ` Bactericidal peak target (Cmax/MIC >= 8-10:1) successfully achieved.`;
  }

  if (nomogramInterval) {
    if (nomogramInterval === "off_nomogram") {
      clinicalRec += ` Level drawn at ${drawTime}h (${measuredLevel} mcg/mL) falls ABOVE the 48-hour nomogram zone. Hold therapy and follow serial levels until trough < ${troughWashoutTargetUgMl} mcg/mL before re-dosing.`;
    } else {
      clinicalRec += ` Nomogram plots into the ${nomogramInterval.toUpperCase()} dosing interval.`;
    }
  }

  return {
    agent: agentLabel,
    actualWeightKg,
    ibwKg,
    adjBwKg,
    weightCategory,
    dosingWeightType,
    dosingWeightKg,
    recommendedDoseMg,
    dosePerKgUsed: doseMgKg,
    estimatedPeakUgMl,
    peakToMicRatio,
    peakTargetAchieved,
    nomogramInterval,
    drawTimeHours: drawTime,
    measuredLevelUgMl: measuredLevel,
    troughWashoutTargetUgMl,
    postAntibioticEffectHours: "2 to 4 hours post-MIC drop (up to 6 hours in vivo)",
    lysosomalSaturationPearl:
      "Megalin-cubilin receptor uptake in renal proximal tubules is saturable. Transient high peaks do NOT increase tubular uptake, while extended interval permits cortical wash-out and prevents lysosomal accumulation.",
    organToxicityRail: {
      nephrotoxicity:
        "Acute tubular necrosis via proximal tubule lysosomal phospholipidosis. Reversible if caught early with prompt trough wash-out.",
      ototoxicity:
        "Sensory hair cell apoptosis via mechanotransducer channel entry and reactive oxygen species generation. Cochlear (hearing loss) and vestibular (ataxia, oscillopsia) toxicity is irreversible.",
      loopDiureticCollision: true,
    },
    clinicalRecommendation: clinicalRec,
  };
}

// ----------------------------------------------------------------------------
// Vancomycin Consensus AUC24/MIC
// ----------------------------------------------------------------------------

/**
 * Calculates Vancomycin AUC24/MIC ratio per ASHP/IDSA/PIDS/SIDP 2020 Consensus Guidelines.
 * Explicitly flags trough-only monitoring pitfalls and nephrotoxicity risk.
 */
export function calculateVancomycinAuc({
  totalDailyDoseMg,
  crCl,
  mic = 1.0,
  measuredTroughUgMl,
}: VancomycinAucInput): VancomycinAucResult {
  const clCrClamped = Math.max(10, Math.min(250, crCl));
  const dailyDose = Math.max(500, Math.min(6000, totalDailyDoseMg));
  const micClamped = Math.max(0.25, Math.min(4, mic));

  // Matzke/Rybak population clearance formula: CL (L/h) = 0.0411 * CrCl (mL/min) + 0.22
  const clearanceLHr = Math.round((0.0411 * clCrClamped + 0.22) * 100) / 100;
  const estimatedAuc24 = Math.round((dailyDose / clearanceLHr) * 10) / 10;
  const aucToMicRatio = Math.round((estimatedAuc24 / micClamped) * 10) / 10;

  let band: VancomycinAucResult["band"] = "target";
  let nephroRisk: VancomycinAucResult["nephrotoxicityRisk"] = "standard";
  let akiOddsRatio = 1.0;

  if (aucToMicRatio < 400) {
    band = "subtherapeutic";
    nephroRisk = "standard";
  } else if (aucToMicRatio > 600) {
    band = "supratherapeutic_toxic";
    nephroRisk = aucToMicRatio > 700 ? "severe" : "elevated";
    akiOddsRatio = aucToMicRatio > 700 ? 3.5 : 2.4;
  }

  let troughWarning: string | null = null;
  if (measuredTroughUgMl !== undefined && measuredTroughUgMl > 15) {
    troughWarning =
      "Trough-only monitoring (15-20 mcg/mL) abandoned per 2020 IDSA/ASHP consensus guidelines. Troughs > 15 mcg/mL double acute kidney injury rates with zero clinical superiority over AUC 400-600 targeting.";
  }

  let guidelineRec = `Consensus AUC24/MIC target is 400-600 mg*h/L (assuming BMD MIC 1.0 mg/L). Estimated AUC24 is ${estimatedAuc24} mg*h/L (AUC/MIC ${aucToMicRatio}).`;
  if (band === "subtherapeutic") {
    guidelineRec += " SUBTHERAPEUTIC: Elevated risk of treatment failure, persistent bacteremia, and emergence of VISA strains.";
  } else if (band === "supratherapeutic_toxic") {
    guidelineRec += ` TOXIC: AUC exceeds 600 mg*h/L. Associated with a 2- to 3-fold higher acute kidney injury (AKI) rate. Consider dose reduction or interval extension.`;
  } else {
    guidelineRec += " Optimal bactericidal therapeutic window achieved.";
  }

  return {
    totalDailyDoseMg: dailyDose,
    estimatedClearanceLPerHr: clearanceLHr,
    estimatedAuc24,
    mic: micClamped,
    aucToMicRatio,
    band,
    targetAttained: band === "target",
    nephrotoxicityRisk: nephroRisk,
    akiOddsRatio,
    troughWarning,
    consensusGuidelineRecommendation: guidelineRec,
  };
}

// ----------------------------------------------------------------------------
// Augmented Renal Clearance (ARC) & ARCTIC Score Engine
// ----------------------------------------------------------------------------

/**
 * Calculates ARCTIC Score (Augmented Renal Clearance in Trauma / Intensive Care).
 * Validated clinical decision support model predicting glomerular hyperfiltration and hydrophilic failure.
 */
export function calculateArcticScore({
  age,
  hasTrauma,
  sofaScore,
}: ArcticScoreInput): ArcticScoreResult {
  const ageClamped = Math.max(16, Math.min(105, age));
  const sofaClamped = Math.max(0, Math.min(24, sofaScore));

  let agePoints = 0;
  if (ageClamped < 50) {
    agePoints = 6;
  } else if (ageClamped <= 75) {
    agePoints = 3;
  } else {
    agePoints = 0;
  }

  const traumaPoints = hasTrauma ? 3 : 0;
  const sofaPoints = sofaClamped <= 4 ? 1 : 0;
  const totalScore = agePoints + traumaPoints + sofaPoints;

  const isHighRiskArc = totalScore >= 6;

  return {
    agePoints,
    traumaPoints,
    sofaPoints,
    totalScore,
    isHighRiskArc,
    physiologicDefinition:
      "Augmented Renal Clearance (ARC) is defined as creatinine clearance exceeding physiologic norms (> 130 mL/min/1.73m2 in females, > 140 mL/min/1.73m2 in males, often > 160-200 mL/min).",
    hyperdynamicMechanism:
      "Systemic inflammatory response syndrome (SIRS), massive neuroendocrine activation, fluid resuscitation, and elevated cardiac output drive supranormal renal blood flow and glomerular hyperfiltration.",
    hydrophilicAntibioticTrap:
      "CRITICAL CLINICAL TRAP: Standard hydrophilic antibiotic dosing (beta-lactams, vancomycin, aminoglycosides, colistin) results in catastrophic underdosing (50-80% subtherapeutic plasma concentrations!) and clinical failure / emergent resistance.",
    populationsAtRisk: [
      "Polytrauma & traumatic brain injury (TBI)",
      "Severe thermal burns (>20% TBSA)",
      "Early hyperdynamic septic shock",
      "Neutropenic fever & hematologic malignancy with high cardiac output",
      "Acute pancreatitis with aggressive fluid resuscitation",
    ],
    recommendedDosingAdaptations: [
      "Empiric beta-lactam dose escalation (e.g. Meropenem 2g q8h instead of 1g q8h)",
      "Prolonged (3-4 hour) or continuous (24-hour) infusions to maintain fT > MIC",
      "Shortened dosing intervals (e.g. Piperacillin-tazobactam 4.5g q6h instead of q8h; Cefepime 2g q8h)",
      "Vancomycin dose escalation with mandatory AUC therapeutic drug monitoring",
    ],
    monitoringGuidance:
      "Cockcroft-Gault and CKD-EPI drastically underestimate GFR in hyperdynamic young patients. Measure 8- or 24-hour urinary creatinine clearance directly to confirm true elimination capacity.",
  };
}

// ----------------------------------------------------------------------------
// High-Alert Antimicrobial Organ-Toxicity Safety Rails
// ----------------------------------------------------------------------------

/**
 * Evaluates Cefepime Neurotoxicity and GABA-A Competitive Antagonism Risk.
 */
export function evaluateCefepimeNeurotoxicity(
  crCl: number,
  isDialysis = false,
  dailyDoseGrams = 6.0
): CefepimeNeurotoxicityAssessment {
  const renalCrCl = Math.max(0, crCl);
  let riskLevel: CefepimeNeurotoxicityAssessment["riskLevel"] = "standard";

  if (isDialysis || renalCrCl < 30) {
    riskLevel = "critical";
  } else if (renalCrCl < 50 || dailyDoseGrams > 4.0) {
    riskLevel = "high";
  }

  return {
    crCl: renalCrCl,
    isDialysis,
    riskLevel,
    gabaAAntagonismMechanism:
      "Cefepime crosses the blood-brain barrier and exerts concentration-dependent competitive antagonism at postsynaptic GABA-A receptors, blocking inhibitory chloride influx and triggering neuronal hyperexcitability.",
    toxicTroughThresholdMcgMl: 20.0,
    eegFindings: {
      pattern: "Generalized periodic discharges (GPDs) with triphasic morphology (triphasic waves) and non-convulsive status epilepticus (NCSE).",
      triphasicWaves: true,
      significance: "Pathognomonic EEG signature of cefepime neurotoxicity. Often misdiagnosed as septic encephalopathy.",
    },
    clinicalSpectrum: [
      "Myoclonus (focal twitching or generalized jerks)",
      "Acute encephalopathy, disorientation, and confusion",
      "Aphasia, mutism, and motor slowing",
      "Non-convulsive status epilepticus (NCSE)",
      "Coma and asterixis in severe accumulation",
    ],
    hemodialysisClearancePct: 70,
    actionPlan: [
      "Renal adjustment mandatory if CrCl < 50 mL/min (e.g., reduce to 1g q12h or 1g q24h).",
      "If neurotoxicity or myoclonus develops: immediately discontinue cefepime.",
      "In severe NCSE or marked renal impairment: perform emergent intermittent hemodialysis (~70% removed per 3h session).",
      "Administer supportive benzodiazepines or levetiracetam for seizure suppression.",
    ],
  };
}

/**
 * Evaluates Linezolid MAO Inhibition, Serotonergic Collisions & Chronotoxicity.
 */
export function evaluateLinezolidSafety({
  durationDays,
  coAdministeredAgents = [],
}: {
  durationDays: number;
  coAdministeredAgents?: string[];
  baselinePlatelets?: number;
}): LinezolidSafetyAssessment {
  const days = Math.max(1, durationDays);
  const collidingSerotonergic: string[] = [];

  for (const agent of coAdministeredAgents) {
    const norm = agent.toLowerCase().trim();
    if (SEROTONERGIC_IDS.has(norm) || DRUG_BY_ID[norm]?.pd.includes("serotonergic") || DRUG_BY_ID[norm]?.pd.includes("ssri-snri")) {
      collidingSerotonergic.push(norm);
    }
  }

  const hasCollision = collidingSerotonergic.length > 0;
  const myelosuppressionWarning = days >= 14;
  const neuropathyWarning = days > 28;

  return {
    durationDays: days,
    serotoninCollisionPresent: hasCollision,
    collidingSerotonergicDrugs: collidingSerotonergic,
    maoiMechanism:
      "Linezolid is a weak, reversible non-selective inhibitor of monoamine oxidase (MAO-A and MAO-B).",
    serotoninSyndromeRisk: hasCollision ? "critical" : "none",
    tyraminePressorRisk: "high",
    myelosuppressionWarning,
    neuropathyWarning,
    mitochondrialMechanism:
      "Linezolid inhibits mammalian mitochondrial protein synthesis due to structural homology between bacterial 23S rRNA and mitochondrial 16S rRNA.",
    actionPlan: [
      hasCollision
        ? "CRITICAL COLLISION: Co-administration with SSRIs/SNRIs/tramadol triggers severe serotonin syndrome (clonus, hyperthermia, autonomic instability). Avoid combination or select alternative agent (e.g., daptomycin, vancomycin)."
        : "Counsel patient on avoiding tyramine-rich foods (aged cheeses, cured meats, tap beers) to prevent hypertensive crisis.",
      myelosuppressionWarning
        ? "CHRONOTOXICITY ALERT: Therapy duration >= 14 days. Obtain weekly complete blood count (CBC); monitor for thrombocytopenia, anemia, and leukopenia."
        : "Therapy duration < 14 days; obtain baseline CBC.",
      neuropathyWarning
        ? "CHRONOTOXICITY ALERT: Therapy duration > 28 days. High risk of peripheral neuropathy and irreversible optic neuropathy / blindness. Consider infectious disease consultation for regimen switch."
        : "Duration < 28 days; low risk of neuropathy.",
    ],
  };
}

/**
 * Evaluates Daptomycin Pulmonary Surfactant Contraindication & Skeletal Myopathy.
 */
export function evaluateDaptomycinSafety(
  isPneumoniaIndication: boolean,
  coAdministeredAgents: string[] = []
): DaptomycinSafetyAssessment {
  const collidingStatins: string[] = [];
  for (const drug of coAdministeredAgents) {
    const norm = drug.toLowerCase().trim();
    if (STATIN_IDS.has(norm) || DRUG_BY_ID[norm]?.pd.includes("statin")) {
      collidingStatins.push(norm);
    }
  }

  return {
    isPneumoniaIndication,
    surfactantContraindicationAlert:
      "STRICT CONTRAINDICATION IN PNEUMONIA: Daptomycin binds with high affinity to dipalmitoylphosphatidylcholine (DPPC) in pulmonary surfactant, causing inactivation and clinical treatment failure.",
    statinCollisionPresent: collidingStatins.length > 0,
    collidingStatins,
    cpkMonitoringRule:
      "Obtain baseline and weekly serum Creatine Phosphokinase (CPK) during daptomycin therapy. Co-administered HMG-CoA reductase inhibitors (statins) must be temporarily held.",
    discontinuationThresholds: {
      symptomaticCpkU_L: 1000,
      asymptomaticCpkU_L: 2000,
    },
    membraneDepolarizationMechanism:
      "Rapid concentration- and exposure-dependent bactericidal action via calcium-dependent insertion into bacterial membranes, oligomerization, potassium efflux, and rapid membrane depolarization without cell lysis.",
  };
}

// ============================================================================
// DESK TRAY DETECTION & REPORT GENERATION
// ============================================================================

/**
 * Rapid desk detection function matching antimicrobials and colliding perpetrators/victims.
 */
export function antimicrobialOnDesk(drugIds: string[]): AntimicrobialDeskDetection {
  const normalized = new Set(drugIds.map((id) => id.toLowerCase().trim()));

  let hasBetaLactam = false;
  let hasPenicillin = false;
  let hasCephalosporin = false;
  let hasCarbapenem = false;
  let hasMonobactam = false;
  let hasAminoglycoside = false;
  let hasGlycopeptide = false;
  let hasVancomycin = false;
  let hasLipopeptide = false;
  let hasDaptomycin = false;
  let hasOxazolidinone = false;
  let hasLinezolid = false;
  let hasPolymyxin = false;
  let hasFluoroquinolone = false;
  let hasCefepime = false;

  const matchedAntimicrobials: string[] = [];
  const matchedInteractingAgents: string[] = [];
  const detectedClassesSet = new Set<AntimicrobialClass>();

  for (const id of normalized) {
    const drug = DRUG_BY_ID[id];
    const aliases = drug?.aliases ?? [];
    const allMatches = [id, ...aliases.map((a) => a.toLowerCase())];

    const isMatch = (set: Set<string>) => allMatches.some((m) => set.has(m));

    // Beta-Lactams
    if (isMatch(BETA_LACTAM_IDS) || drug?.cls?.toLowerCase().includes("penicillin") || drug?.cls?.toLowerCase().includes("cephalosporin") || drug?.cls?.toLowerCase().includes("carbapenem")) {
      hasBetaLactam = true;
      detectedClassesSet.add("beta_lactam");
      if (!matchedAntimicrobials.includes(id)) matchedAntimicrobials.push(id);

      if (id.includes("cef") || aliases.some((a) => a.toLowerCase().includes("cef"))) {
        hasCephalosporin = true;
        if (id.includes("cefepime") || aliases.some((a) => a.toLowerCase().includes("cefepime"))) {
          hasCefepime = true;
        }
      } else if (id.includes("meropenem") || id.includes("ertapenem") || id.includes("imipenem") || id.includes("doripenem")) {
        hasCarbapenem = true;
      } else if (id.includes("aztreonam")) {
        hasMonobactam = true;
      } else {
        hasPenicillin = true;
      }
    }

    // Aminoglycosides
    if (isMatch(AMINOGLYCOSIDE_IDS) || drug?.cls?.toLowerCase().includes("aminoglycoside")) {
      hasAminoglycoside = true;
      detectedClassesSet.add("aminoglycoside");
      if (!matchedAntimicrobials.includes(id)) matchedAntimicrobials.push(id);
    }

    // Glycopeptides
    if (isMatch(GLYCOPEPTIDE_IDS) || id.includes("vancomycin")) {
      hasGlycopeptide = true;
      hasVancomycin = true;
      detectedClassesSet.add("glycopeptide");
      if (!matchedAntimicrobials.includes(id)) matchedAntimicrobials.push(id);
    }

    // Lipopeptides
    if (isMatch(LIPOPEPTIDE_IDS) || id.includes("daptomycin")) {
      hasLipopeptide = true;
      hasDaptomycin = true;
      detectedClassesSet.add("lipopeptide");
      if (!matchedAntimicrobials.includes(id)) matchedAntimicrobials.push(id);
    }

    // Oxazolidinones
    if (isMatch(OXAZOLIDINONE_IDS) || id.includes("linezolid") || id.includes("tedizolid")) {
      hasOxazolidinone = true;
      if (id.includes("linezolid")) hasLinezolid = true;
      detectedClassesSet.add("oxazolidinone");
      if (!matchedAntimicrobials.includes(id)) matchedAntimicrobials.push(id);
    }

    // Polymyxins
    if (isMatch(POLYMYXIN_IDS)) {
      hasPolymyxin = true;
      detectedClassesSet.add("polymyxin");
      if (!matchedAntimicrobials.includes(id)) matchedAntimicrobials.push(id);
    }

    // Fluoroquinolones
    if (isMatch(FLUOROQUINOLONE_IDS) || drug?.cls?.toLowerCase().includes("fluoroquinolone")) {
      hasFluoroquinolone = true;
      detectedClassesSet.add("fluoroquinolone");
      if (!matchedAntimicrobials.includes(id)) matchedAntimicrobials.push(id);
    }

    // Interacting Agents
    if (
      isMatch(STATIN_IDS) ||
      isMatch(SEROTONERGIC_IDS) ||
      isMatch(LOOP_DIURETIC_IDS) ||
      isMatch(NMBA_IDS) ||
      isMatch(CATION_IDS) ||
      isMatch(STEROID_IDS)
    ) {
      if (!matchedAntimicrobials.includes(id) && !matchedInteractingAgents.includes(id)) {
        matchedInteractingAgents.push(id);
      }
    }
  }

  const hasAntimicrobial = matchedAntimicrobials.length > 0;

  return {
    hasAntimicrobial,
    hasBetaLactam,
    hasPenicillin,
    hasCephalosporin,
    hasCarbapenem,
    hasMonobactam,
    hasAminoglycoside,
    hasGlycopeptide,
    hasVancomycin,
    hasLipopeptide,
    hasDaptomycin,
    hasOxazolidinone,
    hasLinezolid,
    hasPolymyxin,
    hasFluoroquinolone,
    hasCefepime,
    matchedAntimicrobials,
    matchedInteractingAgents,
    detectedClasses: Array.from(detectedClassesSet),
  };
}

/**
 * Master Comprehensive Antimicrobial Pharmacokinetics & Safety Report Generator.
 */
export function antimicrobialReportOnDesk(
  drugIds: string[],
  host: HostContext = DEFAULT_HOST
): AntimicrobialMasterReport {
  const detection = antimicrobialOnDesk(drugIds);

  // Host context parameters
  const hostAge = host.age === "geriatric" ? 78 : 34;
  const isCkd = host.kidney === "ckd";
  const crClEst = isCkd ? 25 : 95;

  // ARCTIC Score Calculation
  const arcAssessment = calculateArcticScore({
    age: hostAge,
    hasTrauma: false,
    sofaScore: 2,
    crClMeasured: crClEst,
  });

  // Beta-lactam simulation for matched beta-lactams
  const betaLactamAssessments: BetaLactamSimulationResult[] = [];
  for (const id of detection.matchedAntimicrobials) {
    if (BETA_LACTAM_PROFILES[id]) {
      const p = BETA_LACTAM_PROFILES[id];
      const sim = simulateBetaLactamInfusion({
        drugId: p.id,
        doseMg: p.standardDoseMg,
        intervalHours: p.standardIntervalHours,
        infusionHours: p.extendedInfusionHours,
        crCl: crClEst,
        mic: 2.0,
      });
      betaLactamAssessments.push(sim);
    }
  }

  // Aminoglycoside simulations
  const aminoglycosideAssessments: AminoglycosideHartfordResult[] = [];
  if (detection.hasAminoglycoside) {
    const agAgent = detection.matchedAntimicrobials.find((id) =>
      id === "amikacin" ? "amikacin" : id === "tobramycin" ? "tobramycin" : "gentamicin"
    ) as "gentamicin" | "tobramycin" | "amikacin" | undefined;

    const agSim = calculateAminoglycosideHartford({
      agent: agAgent ?? "gentamicin",
      actualWeightKg: 75,
      heightCm: 175,
      sex: "male",
      mic: agAgent === "amikacin" ? 4.0 : 1.0,
    });
    aminoglycosideAssessments.push(agSim);
  }

  // Vancomycin simulation
  let vancomycinAssessment: VancomycinAucResult | undefined = undefined;
  if (detection.hasVancomycin) {
    vancomycinAssessment = calculateVancomycinAuc({
      totalDailyDoseMg: 3000,
      crCl: crClEst,
      mic: 1.0,
    });
  }

  // Cefepime assessment
  let cefepimeAssessment: CefepimeNeurotoxicityAssessment | undefined = undefined;
  if (detection.hasCefepime || drugIds.includes("cefepime")) {
    cefepimeAssessment = evaluateCefepimeNeurotoxicity(crClEst, false, 6.0);
  }

  // Linezolid assessment
  let linezolidAssessment: LinezolidSafetyAssessment | undefined = undefined;
  if (detection.hasOxazolidinone || drugIds.includes("linezolid")) {
    linezolidAssessment = evaluateLinezolidSafety({
      durationDays: 14,
      coAdministeredAgents: drugIds,
    });
  }

  // Daptomycin assessment
  let daptomycinAssessment: DaptomycinSafetyAssessment | undefined = undefined;
  if (detection.hasDaptomycin || drugIds.includes("daptomycin")) {
    daptomycinAssessment = evaluateDaptomycinSafety(false, drugIds);
  }

  // Collisions and Organ Safety Alerts
  const organSafetyAlerts: AntimicrobialMasterReport["organSafetyAlerts"] = [];

  // Cefepime in renal impairment
  if (detection.hasCefepime && crClEst < 50) {
    organSafetyAlerts.push({
      drug: "Cefepime",
      severity: "critical",
      title: "Cefepime Neurotoxicity & GABA-A Competitive Antagonism",
      mechanism:
        "Cefepime crosses the BBB and competitively antagonizes GABA-A receptors. Reduced renal clearance (CrCl < 50 mL/min) leads to toxic drug accumulation, myoclonus, encephalopathy, and non-convulsive status epilepticus (NCSE).",
      action:
        "Dose reduce immediately per renal guidelines (e.g. 1g q12h-24h). Discontinue if encephalopathy or myoclonus emerges; intermittent hemodialysis clears ~70% per session.",
    });
  }

  // Linezolid with Serotonergic agents
  if (detection.hasOxazolidinone && linezolidAssessment?.serotoninCollisionPresent) {
    organSafetyAlerts.push({
      drug: "Linezolid",
      severity: "critical",
      title: "Linezolid MAO Inhibition x Serotonergic Drug Collision",
      mechanism:
        "Reversible non-selective MAO-A/B inhibition by linezolid blocks serotonin breakdown. Co-administration with SSRIs, SNRIs, or tramadol triggers life-threatening serotonin toxicity.",
      action:
        "Avoid combination. If MRSA coverage is required, transition to vancomycin, daptomycin, or ceftaroline.",
    });
  }

  // Linezolid myelosuppression >= 14d
  if (detection.hasOxazolidinone && (linezolidAssessment?.durationDays ?? 0) >= 14) {
    organSafetyAlerts.push({
      drug: "Linezolid",
      severity: "high",
      title: "Linezolid Chronotoxicity & Bone Marrow Suppression",
      mechanism:
        "Mitochondrial protein synthesis inhibition manifests as progressive thrombocytopenia and anemia after >= 14 days of therapy.",
      action: "Mandatory weekly CBC monitoring. Evaluate regimen switch if platelet count drops precipitously.",
    });
  }

  // Daptomycin + Statin
  if (detection.hasDaptomycin && daptomycinAssessment?.statinCollisionPresent) {
    organSafetyAlerts.push({
      drug: "Daptomycin",
      severity: "high",
      title: "Daptomycin x HMG-CoA Reductase Inhibitor Sarcolemmal Collision",
      mechanism:
        "Synergistic disruption of skeletal muscle sarcolemma and mitochondrial respiration increases the risk of severe myopathy and rhabdomyolysis.",
      action: "Temporarily hold statin therapy for the duration of daptomycin. Monitor weekly serum CPK.",
    });
  }

  // Daptomycin Pneumonia Alert
  if (detection.hasDaptomycin) {
    organSafetyAlerts.push({
      drug: "Daptomycin",
      severity: "warning",
      title: "Daptomycin Pulmonary Surfactant Inactivation Rail",
      mechanism:
        "Daptomycin is irreversibly bound and inactivated by pulmonary surfactant dipalmitoylphosphatidylcholine (DPPC).",
      action: "Strictly contraindicated for community-acquired or nosocomial pneumonia.",
    });
  }

  // Aminoglycoside Ototoxicity / Nephrotoxicity
  if (detection.hasAminoglycoside) {
    organSafetyAlerts.push({
      drug: "Aminoglycoside",
      severity: "high",
      title: "Aminoglycoside Megalin-Cubilin Lysosomal & Vestibulocochlear Rails",
      mechanism:
        "Saturable uptake across proximal tubule brush border causes acute tubular necrosis. Penetration into endolymph via hair cell MET channels causes permanent sensorineural hearing loss.",
      action:
        "Use once-daily extended-interval (Hartford) dosing to maximize peak-to-MIC ratio while ensuring trough wash-out (< 0.5-1.0 mcg/mL). Avoid co-administration with loop diuretics.",
    });
  }

  const stewardshipPearls = [
    "Beta-lactams: Time-dependent killing. Prolonged 3- to 4-hour extended infusion (or 24h continuous infusion) maximizes %fT > MIC without increasing total daily dose.",
    "Augmented Renal Clearance (ARC): ARCTIC score >= 6 indicates hyperfiltration (> 130-150 mL/min). Hydrophilic antibiotics (beta-lactams, vancomycin, aminoglycosides) risk catastrophic underdosing.",
    "Vancomycin: Target AUC24/MIC = 400-600 mg*h/L. Trough-only monitoring (15-20 mcg/mL) abandoned due to doubled acute kidney injury rates with zero clinical superiority.",
    "Aminoglycosides: Concentration-dependent killing (Cmax/MIC >= 8-10:1). Extended-interval dosing allows lysosomal wash-out, minimizing nephrotoxicity and irreversible ototoxicity.",
    "Cefepime: Competitive GABA-A receptor antagonist. CrCl < 50 mL/min requires dose reduction to prevent non-convulsive status epilepticus (NCSE) and triphasic waves on EEG.",
    "Linezolid: Weak reversible MAOI. Severe serotonergic syndrome with SSRIs/SNRIs/tramadol; dietary tyramine hypertensive crisis; myelosuppression after >= 14 days of therapy.",
  ];

  return {
    detection,
    arcAssessment,
    betaLactamAssessments,
    aminoglycosideAssessments,
    vancomycinAssessment,
    cefepimeAssessment,
    linezolidAssessment,
    daptomycinAssessment,
    organSafetyAlerts,
    stewardshipPearls,
    regulatoryNotice: ANTIMICROBIAL_KINETICS_REGULATORY_NOTICE,
    citations: ANTIMICROBIAL_KINETICS_CITATIONS,
  };
}
