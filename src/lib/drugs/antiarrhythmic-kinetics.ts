/**
 * Antiarrhythmic Pharmacokinetics, Vaughan-Williams Classification,
 * Channelopathy Mechanisms, Digoxin TDM & DigiFab Reversal Engine
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support (CDS) Architecture:
 * - Conforms to 21 U.S.C. § 360j(o)(1)(E) and FDA CDS Software Guidance (January 2026).
 * - Intended for licensed cardiologists, cardiac electrophysiologists, clinical pharmacologists,
 *   critical care physicians, cardiovascular clinical pharmacists (PharmD / BCCP / BCPS),
 *   and supervised health-professions trainees.
 * - Displays transparent biophysical, electrophysiological, and pharmacokinetic rationales derived from
 *   canonical peer-reviewed cardiovascular literature (DIG Trial, CAST, Vaughan Williams, Sicilian Gamble,
 *   Goodman & Gilman, Tisdale AHA Statements, Dofetilide REMS).
 * - Enables independent clinical verification of all calculated parameters, channel kinetics, and alerts.
 * - DOES NOT generate automated medical orders, prescription directives, closed-loop infusion commands,
 *   or definitive treatment decisions.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext, DEFAULT_HOST } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

// ============================================================================
// 1. REGULATORY NOTICE & AUTHORITATIVE CITATIONS
// ============================================================================

/**
 * Statutory Non-Device Clinical Decision Support disclaimer under FD&C Act § 520(o)(1)(E).
 */
export const ANTIARRHYTHMIC_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational antiarrhythmic pharmacokinetics, Vaughan-Williams classification, channelopathy mechanism, and Digoxin TDM / DigiFab reversal engine is intended solely for licensed healthcare professionals and supervised health-professions trainees. It models cardiac action potential kinetics, ion channel conductance, P-glycoprotein clearance collisions, electrolyte sensitivity amplifiers, DigiFab stoichiometry, CAST trial contraindications, and Dofetilide REMS titration rules to enable independent verification of clinical rationale in cardiac electrophysiology and cardiovascular pharmacotherapy. It does not provide automated diagnostic conclusions, does not generate infusion orders or prescription directives, and does not replace individualized bedside clinical evaluation, emergency cardiac consultation, or the FDA-approved Prescribing Information.";

export const ANTIARRHYTHMIC_CITATIONS: readonly string[] = [
  "The Digitalis Investigation Group (DIG). The effect of digoxin on mortality and morbidity in patients with heart failure. N Engl J Med. 1997;336(8):525-533.",
  "Rathore SS, Curtis JP, Wang Y, Bristow MR, Krumholz HM. Association of serum digoxin concentration and outcomes in patients with heart failure. JAMA. 2003;289(7):871-878.",
  "The Cardiac Arrhythmia Suppression Trial (CAST) Investigators. Preliminary report: effect of encainide and flecainide on mortality in a randomized trial of arrhythmia suppression after myocardial infarction. N Engl J Med. 1989;321(6):406-412.",
  "The CAST II Investigators. Effect of the antiarrhythmic agent moricizine on survival after myocardial infarction. N Engl J Med. 1992;327(4):227-233.",
  "Antman EM, Wenger TL, Butler VP Jr, Haber E, Smith TW. Treatment of 150 cases of life-threatening digitalis intoxication with digoxin-specific Fab antibody fragments: Final report of a multicenter study. Circulation. 1990;81(6):1744-1752.",
  "Bauman JL, DiDomenico RJ, Galanter WL. Mechanisms, manifestations, and management of digoxin toxicity for the modern clinician. Am J Manag Care. 2006;12(6 Suppl):S162-S171.",
  "Vaughan Williams EM. Classification of antiarrhythmic drugs. In: Sandoe E, Flensted-Jensen E, Olesen KH, eds. Symposium on Cardiac Arrhythmias. AB Astra; 1970:449-472.",
  "Roden DM. Antiarrhythmic drugs. In: Brunton LL, Hilal-Dandan R, Knollmann BC, eds. Goodman & Gilman's: The Pharmacological Basis of Therapeutics. 13th ed. McGraw-Hill; 2018:547-570.",
  "Tisdale JE, Chung MK, Campbell KB, et al. Drug-induced QT interval prolongation and torsades de pointes: a scientific statement from the American Heart Association. Circulation. 2020;142(17):e447-e460.",
  "Tikosyn (Dofetilide) Prescribing Information & Risk Evaluation and Mitigation Strategy (REMS). US Food and Drug Administration; Reference ID: 4172823.",
  "Al-Khatib SM, Stevenson WG, Ackerman MJ, et al. 2017 AHA/ACC/HRS Guideline for Management of Patients With Ventricular Arrhythmias and the Prevention of Sudden Cardiac Death. Circulation. 2018;138(13):e272-e391.",
  "Joglar JA, Chung MK, Armbruster AL, et al. 2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation. Circulation. 2024;149(1):e1-e156.",
];

// ============================================================================
// 2. CORE PILLAR 1: DIGOXIN PK, TDM & SENSITIVITY AMPLIFIERS
// ============================================================================

export type DigoxinIndication = "hfref" | "afib";

export type DigoxinLevelBand =
  | "subtherapeutic"
  | "target"
  | "elevated"
  | "toxic"
  | "severe-toxicity"
  | "distribution-phase-artifact";

export interface DigoxinTdmInput {
  serumDigoxinNgMl: number;
  indication?: DigoxinIndication;
  hoursPostDose?: number;
  potassiumMeqL?: number;
  magnesiumMgDl?: number;
  calciumMgDl?: number;
  ionizedCalciumMmolL?: number;
  hasPgpInhibitor?: boolean;
  pgpInhibitorIds?: string[];
  patientWeightKg?: number;
  estimatedCrClMlMin?: number;
}

export interface ElectrolyteAmplifierEvaluation {
  hasAmplifier: boolean;
  severity: "none" | "moderate" | "severe";
  hypokalemia: boolean;
  hypomagnesemia: boolean;
  hypercalcemia: boolean;
  mechanisms: string[];
  arrhythmiaHazards: string[];
  clinicalAdvisory: string;
}

export interface DigoxinTdmEvaluation {
  serumDigoxinNgMl: number;
  indication: DigoxinIndication;
  hoursPostDose: number;
  band: DigoxinLevelBand;
  label: string;
  isWithinTargetRange: boolean;
  targetRangeSummary: string;
  isToxic: boolean;
  isLifeThreatening: boolean;
  isDistributionLagArtifact: boolean;
  clinicalMeaning: string;
  pharmacokineticRationale: string;
  mortalityEvidence: string;
  samplingTimingGuidance: string;
  electrolyteSensitivity: ElectrolyteAmplifierEvaluation;
  pgpCollisionAlert?: {
    perpetrators: string[];
    doseAdjustmentGuidance: string;
    aucImpact: string;
  };
}

/**
 * Evaluates electrolyte sensitivity amplifiers for digitalis proarrhythmia.
 * Hypokalemia: loss of competitive K+ binding at Na+/K+ ATPase extracellular domain.
 * Hypomagnesemia: loss of obligatory intracellular cofactor for Na+/K+ ATPase.
 * Hypercalcemia: additive intracellular Ca2+ overload via reverse-mode NCX.
 */
export function evaluateElectrolyteAmplifiers(params: {
  potassiumMeqL?: number;
  magnesiumMgDl?: number;
  calciumMgDl?: number;
  ionizedCalciumMmolL?: number;
  serumDigoxinNgMl?: number;
}): ElectrolyteAmplifierEvaluation {
  const { potassiumMeqL, magnesiumMgDl, calciumMgDl, ionizedCalciumMmolL, serumDigoxinNgMl = 1.0 } = params;

  const hypokalemia = potassiumMeqL !== undefined && potassiumMeqL < 3.5;
  const severeHypokalemia = potassiumMeqL !== undefined && potassiumMeqL < 3.0;
  const hypomagnesemia = magnesiumMgDl !== undefined && magnesiumMgDl < 1.8;
  const severeHypomagnesemia = magnesiumMgDl !== undefined && magnesiumMgDl < 1.4;
  const hypercalcemia =
    (calciumMgDl !== undefined && calciumMgDl > 10.5) ||
    (ionizedCalciumMmolL !== undefined && ionizedCalciumMmolL > 1.32);

  const mechanisms: string[] = [];
  const arrhythmiaHazards: string[] = [];

  if (hypokalemia) {
    mechanisms.push(
      "Extracellular K+ depletion removes competitive inhibition at the alpha-subunit cardiac Na+/K+ ATPase digitalis binding site, dramatically amplifying digoxin binding affinity and pump inhibition even at low or normal serum concentrations.",
    );
    arrhythmiaHazards.push("Premature ventricular contractions (bigeminy/trigeminy)", "Bidirectional ventricular tachycardia");
  }

  if (hypomagnesemia) {
    mechanisms.push(
      "Magnesium is an obligatory enzymatic cofactor for Na+/K+ ATPase phosphohydrolase. Hypomagnesemia impairs intrinsic pump activity independent of digoxin and impairs renal potassium preservation, perpetuating refractory hypokalemia.",
    );
    arrhythmiaHazards.push("Accelerated junctional rhythm", "Ventricular ectopy", "Refractory hypokalemic arrhythmias");
  }

  if (hypercalcemia) {
    mechanisms.push(
      "Elevated extracellular Ca2+ compounds digitalis-induced NCX (Na+/Ca2+ exchanger) reverse-mode calcium loading, precipitating profound sarcoplasmic reticulum calcium overload, spontaneous calcium sparks, and transient inward current (Iti) mediated delayed afterdepolarizations (DADs).",
    );
    arrhythmiaHazards.push("Paroxysmal atrial tachycardia with block (PAT with block)", "High-grade / complete AV block", "Ventricular fibrillation");
  }

  const hasAmplifier = hypokalemia || hypomagnesemia || hypercalcemia;
  let severity: ElectrolyteAmplifierEvaluation["severity"] = "none";
  if (severeHypokalemia || severeHypomagnesemia || (hypokalemia && hypercalcemia)) {
    severity = "severe";
  } else if (hasAmplifier) {
    severity = "moderate";
  }

  let clinicalAdvisory = "Electrolyte profile within acceptable limits for cardiac glycoside therapy.";
  if (hasAmplifier) {
    const sdcRef = serumDigoxinNgMl > 0 ? ` at current SDC ${serumDigoxinNgMl} ng/mL` : "";
    clinicalAdvisory = `CRITICAL ELECTROLYTE SENSITIVITY${sdcRef}: Digitalis toxicity and lethal triggered proarrhythmias occur at 'normal' or therapeutic serum levels in the presence of hypokalemia, hypomagnesemia, or hypercalcemia. Target serum K >= 4.0–4.5 mEq/L and serum Mg >= 2.0 mg/dL prior to further dosing.`;
  }

  return {
    hasAmplifier,
    severity,
    hypokalemia,
    hypomagnesemia,
    hypercalcemia,
    mechanisms,
    arrhythmiaHazards,
    clinicalAdvisory,
  };
}

/**
 * Evaluates serum digoxin concentration (SDC) against clinical indication and distribution kinetics.
 * Heart Failure (HFrEF): Target 0.5–0.9 ng/mL (DIG Trial: >= 1.2 ng/mL associated with increased mortality).
 * Atrial Fibrillation: Target 0.8–2.0 ng/mL (optimal 0.8–1.2 ng/mL; > 2.0 ng/mL toxic).
 * Distribution timing trap: Sampling < 6–8 hours post-dose reflects distribution phase, falsely elevating SDC.
 */
export function evaluateDigoxinTdm(input: DigoxinTdmInput): DigoxinTdmEvaluation {
  const {
    serumDigoxinNgMl,
    indication = "hfref",
    hoursPostDose = 12,
    hasPgpInhibitor = false,
    pgpInhibitorIds = [],
  } = input;

  const level = Math.max(0, serumDigoxinNgMl);
  const isEarlyDistribution = hoursPostDose < 6;
  const isBorderlineDistribution = hoursPostDose >= 6 && hoursPostDose < 8;

  const electrolyteSensitivity = evaluateElectrolyteAmplifiers(input);

  let band: DigoxinLevelBand;
  let label: string;
  let clinicalMeaning: string;
  let isWithinTargetRange = false;
  let isToxic = false;
  let isLifeThreatening = false;
  let isDistributionLagArtifact = false;

  const targetRangeSummary =
    indication === "hfref"
      ? "0.5 to 0.9 ng/mL (HFrEF Neurohormonal Target)"
      : "0.8 to 2.0 ng/mL (AFib Rate Control Target; optimal 0.8–1.2 ng/mL)";

  const mortalityEvidence =
    "DIG Trial (NEJM 1997) & Rathore post-hoc analysis (JAMA 2003): SDC 0.5–0.9 ng/mL achieved mortality reduction in HFrEF. Concentrations >= 1.2 ng/mL increased all-cause mortality by 11.8% without additional hemodynamic or hospitalization benefit. In women, levels > 1.2 ng/mL conferred substantial excess mortality.";

  const samplingTimingGuidance = isEarlyDistribution
    ? "MANDATORY SAMPLING TIMING TRAP: Digoxin has a massive volume of distribution (Vd ~ 7 L/kg) and binds slowly to cardiac myocyte Na+/K+ ATPase over 6 to 8 hours. Blood drawn < 6 hours post-dose captures distributing vascular drug, appearing spuriously elevated / toxic. Withhold DigiFab sizing based on this sample unless the patient is hemodynamically unstable with malignant arrhythmias; re-draw at >= 8 hours post-dose."
    : isBorderlineDistribution
    ? "Borderline distribution window (6 to 8 hours post-dose). Myocardial tissue equilibrium is nearing completion; serum level is clinically interpretable but true 12- to 24-hour trough is preferred."
    : "Valid steady-state trough sampling (>= 8 hours post-dose or immediately prior to next scheduled maintenance dose). Reflects true myocardial tissue Na+/K+ ATPase equilibrium.";

  if (isEarlyDistribution) {
    band = "distribution-phase-artifact";
    label = "Pre-Distribution Phase Artifact (< 6h post-dose)";
    clinicalMeaning =
      "Sample drawn prior to completion of multi-compartment tissue distribution. Plasma level does not reflect myocardial Na+/K+ ATPase saturation. Wait until >= 6 to 8 hours post-dose to evaluate steady-state therapeutic exposure.";
    isDistributionLagArtifact = true;
  } else if (level < 0.5) {
    band = "subtherapeutic";
    label = `Subtherapeutic (< 0.5 ng/mL) for ${indication === "hfref" ? "HFrEF" : "AFib"}`;
    clinicalMeaning =
      "Below neurohormonal modulating threshold in heart failure and below vagomimetic AV nodal conduction slowing threshold in atrial fibrillation.";
  } else if (indication === "hfref") {
    if (level <= 0.9) {
      band = "target";
      label = "Optimal Therapeutic Target (0.5–0.9 ng/mL)";
      clinicalMeaning =
        "Optimal neurohormonal attenuation, reduction in heart failure hospitalization, and lowest all-cause mortality per DIG trial evidence.";
      isWithinTargetRange = true;
    } else if (level <= 1.2) {
      band = "elevated";
      label = "Borderline Elevated (1.0–1.2 ng/mL)";
      clinicalMeaning =
        "Above evidence-based heart failure target. Provides no additional inotropic benefit and trends toward increased all-cause mortality.";
    } else if (level <= 2.0) {
      band = "elevated";
      label = "Elevated Supra-Target SDC (1.3–2.0 ng/mL)";
      clinicalMeaning =
        "Supra-target exposure in HFrEF. Definite association with excess mortality in DIG trial retrospective analysis. High risk of proarrhythmia if hypokalemia or hypomagnesemia coexists.";
    } else if (level <= 4.0) {
      band = "toxic";
      label = "Definite Digitalis Toxicity (> 2.0 ng/mL)";
      clinicalMeaning =
        "Marked cardiac glycoside toxicity. High risk of junctional escape rhythms, premature ventricular complexes, bidirectional VT, and AV block. Prompt clinical assessment and telemetry indicated.";
      isToxic = true;
    } else {
      band = "severe-toxicity";
      label = "Life-Threatening Digitalis Toxicity (> 4.0 ng/mL)";
      clinicalMeaning =
        "Severe, life-threatening overdose. Extreme hazard of refractory malignant ventricular arrhythmias, complete heart block, and lethal hyperkalemia. Immediate evaluation for Digoxin Immune Fab (DigiFab) mandatory.";
      isToxic = true;
      isLifeThreatening = true;
    }
  } else {
    // Atrial Fibrillation Rate Control Indication
    if (level <= 1.2) {
      band = "target";
      label = "Optimal AFib Rate Control Target (0.8–1.2 ng/mL)";
      clinicalMeaning =
        "Sufficient central and peripheral vagotonic stimulation for resting ventricular rate control with minimal proarrhythmic hazard.";
      isWithinTargetRange = true;
    } else if (level <= 2.0) {
      band = "target";
      label = "Permissible AFib Rate Control Target (1.3–2.0 ng/mL)";
      clinicalMeaning =
        "Historically tolerated range for refractory AFib rate control, though modern consensus advises targeting <= 1.2 ng/mL due to concentration-dependent mortality signals.";
      isWithinTargetRange = true;
    } else if (level <= 4.0) {
      band = "toxic";
      label = "Digitalis Toxicity (> 2.0 ng/mL)";
      clinicalMeaning =
        "Supra-therapeutic toxicity threshold. High risk of high-grade AV block, paroxysmal atrial tachycardia with block, and ventricular ectopy.";
      isToxic = true;
    } else {
      band = "severe-toxicity";
      label = "Life-Threatening Toxicity (> 4.0 ng/mL)";
      clinicalMeaning =
        "Severe cardiac glycoside overdose with imminent risk of fatal ventricular tachydysrhythmias or asystole. DigiFab reversal indicated.";
      isToxic = true;
      isLifeThreatening = true;
    }
  }

  // P-gp collision guidance
  let pgpCollisionAlert: DigoxinTdmEvaluation["pgpCollisionAlert"];
  if (hasPgpInhibitor || pgpInhibitorIds.length > 0) {
    pgpCollisionAlert = {
      perpetrators: pgpInhibitorIds.length > 0 ? pgpInhibitorIds : ["Potent P-gp Inhibitor"],
      doseAdjustmentGuidance:
        "MANDATORY 50% EMPIRIC DIGOXIN DOSE REDUCTION upon initiation of potent P-gp inhibitor (amiodarone, verapamil, quinidine, dronedarone, clarithromycin).",
      aucImpact:
        "P-glycoprotein (ABCB1) inhibition impairs renal tubular secretion and decreases non-renal clearance, doubling digoxin systemic exposure (AUC increase ~80–100%). Serum levels must be rechecked in 7 to 14 days.",
    };
  }

  const pharmacokineticRationale =
    "Digoxin is cleared ~70–80% by the kidneys via glomerular filtration and active P-gp tubular secretion. Volume of distribution is ~7 L/kg in healthy adults, reduced to ~4–5 L/kg in severe renal impairment. Elimination half-life is 36–48 hours with normal renal function, extending to 3.5–5 days in anuria.";

  return {
    serumDigoxinNgMl: level,
    indication,
    hoursPostDose,
    band,
    label,
    isWithinTargetRange,
    targetRangeSummary,
    isToxic,
    isLifeThreatening,
    isDistributionLagArtifact,
    clinicalMeaning,
    pharmacokineticRationale,
    mortalityEvidence,
    samplingTimingGuidance,
    electrolyteSensitivity,
    pgpCollisionAlert,
  };
}

// ============================================================================
// 3. CORE PILLAR 2: DIGOXIN IMMUNE FAB (DIGIFAB) REVERSAL ENGINE
// ============================================================================

export type DigiFabDosingScenario =
  | "acute-known-ingestion"
  | "steady-state-serum-concentration"
  | "empiric-arrest-or-instability";

export interface DigiFabCalculationInput {
  scenario: DigiFabDosingScenario;
  mgDigoxinIngested?: number;
  serumDigoxinNgMl?: number;
  patientWeightKg?: number;
  isCardiacArrestOrSevereShock?: boolean;
}

export interface DigiFabCalculationResult {
  scenario: DigiFabDosingScenario;
  exactVialsCalculated: number;
  vialsToAdministerRoundedUp: number;
  formulaDescription: string;
  stoichiometricRationale: string;
  mgDigoxinNeutralized: number;
  reversalMechanism: string;
  postFabMonitoringTrap: {
    totalDigoxinSpikeExplanation: string;
    uninterpretableWindowDuration: string;
    telemetryAndEkgDirective: string;
    potassiumShiftWarning: string;
  };
  clinicalConsiderations: string[];
}

/**
 * Calculates Digoxin Immune Fab (DigiFab) vial requirements:
 * 1. Acute Ingestion: Vials = (mg ingested * 0.8) / 0.5 mg/vial
 * 2. Steady-State SDC: Vials = (SDC ng/mL * Weight kg) / 100
 * 3. Empiric Arrest / Instability: 10 to 20 vials IV push (adults)
 */
export function calculateDigiFabVials(input: DigiFabCalculationInput): DigiFabCalculationResult {
  const {
    scenario,
    mgDigoxinIngested = 10,
    serumDigoxinNgMl = 4.0,
    patientWeightKg = 70,
    isCardiacArrestOrSevereShock = false,
  } = input;

  let exactVials = 0;
  let formulaDescription = "";
  let stoichiometricRationale = "";

  if (scenario === "empiric-arrest-or-instability" || isCardiacArrestOrSevereShock) {
    exactVials = 10;
    formulaDescription = "Empiric Resuscitation Protocol: 10 to 20 vials IV push for adult cardiac arrest or refractory life-threatening hemodynamic collapse.";
    stoichiometricRationale =
      "In acute cardiac arrest or impending asystole / refractory ventricular fibrillation, calculation from lab values is deferred. Standard adult empiric resuscitation initiates with 10 vials IV push, followed by an additional 10 vials if no hemodynamic response within 15–30 minutes.";
  } else if (scenario === "acute-known-ingestion") {
    // Bioavailability ~80% (0.8) for oral tablets. 1 vial binds 0.5 mg digoxin.
    const absorbedMg = Math.max(0, mgDigoxinIngested) * 0.8;
    exactVials = absorbedMg / 0.5;
    formulaDescription = `Vials = (mg ingested [${mgDigoxinIngested} mg] * 0.8 oral bioavailability) / 0.5 mg per vial = ${(exactVials).toFixed(2)} vials.`;
    stoichiometricRationale =
      "Each vial contains 40 mg DigiFab (or 38 mg Digibind) which stoichiometrically binds approximately 0.5 mg of digoxin. The 0.8 factor accounts for ~80% systemic bioavailability of standard digoxin oral tablets.";
  } else {
    // Steady-state serum concentration: Vials = (SDC ng/mL * Weight kg) / 100
    const sdc = Math.max(0, serumDigoxinNgMl);
    const wt = Math.max(1, patientWeightKg);
    exactVials = (sdc * wt) / 100;
    formulaDescription = `Vials = (SDC [${sdc} ng/mL] * Weight [${wt} kg]) / 100 = ${(exactVials).toFixed(2)} vials.`;
    stoichiometricRationale =
      "Derived from steady-state body load: Body Burden (mg) = [SDC (ng/mL) * Vd (5.6 L/kg) * Weight (kg)] / 1000. Each vial neutralizes 0.5 mg. Dividing body burden by 0.5 yields (SDC * Weight) / 89.28, traditionally simplified to (SDC * Weight) / 100 in emergency toxicology consensus guidelines.";
  }

  const vialsRounded = Math.max(1, Math.ceil(exactVials));
  const mgDigoxinNeutralized = vialsRounded * 0.5;

  const reversalMechanism =
    "DigiFab consists of sterile, lyophilized decoy antigen-binding fragments (Fab) derived from sheep immunized with digoxin-albumin conjugate. Possesses a ~10-fold higher affinity for digoxin than the myocyte Na+/K+ ATPase pump. Injected Fab fragments rapidly bind free circulating digoxin, dropping free plasma concentrations to near zero within minutes and establishing a concentration gradient that draws tissue-bound digitalis off myocardial receptors into the vascular space for immune neutralization.";

  const postFabMonitoringTrap = {
    totalDigoxinSpikeExplanation:
      "CRITICAL POST-FAB IMMUNOASSAY TRAP: Standard clinical immunoassays (chemiluminescent, EMIT, RIA) measure TOTAL digoxin (both free pharmacologically active drug and inactive Fab-bound complexes). Following DigiFab administration, reported serum digoxin levels typically spike by 10- to 20-fold (e.g. from 3.5 ng/mL to 30–50 ng/mL)! This reflects circulating inert Fab-digoxin complexes awaiting renal clearance, NOT ongoing or worsening clinical toxicity.",
    uninterpretableWindowDuration:
      "Serum total digoxin levels remain completely uninterpretable for 1 to 2 weeks post-DigiFab (and up to 3–4 weeks in severe renal impairment / ESRD). Clinicians must NEVER re-administer DigiFab based solely on a high post-reversal total digoxin lab result.",
    telemetryAndEkgDirective:
      "Patient stabilization must be guided entirely by continuous cardiac telemetry, 12-lead EKG (resolution of AV block, normalization of PR/QRS, suppression of ventricular ectopy), and hemodynamic parameters.",
    potassiumShiftWarning:
      "RAPID REBOUND HYPOKALEMIA HAZARD: As DigiFab reactivates myocyte and skeletal muscle Na+/K+ ATPase pumps, potassium is transported rapidly from the extracellular space into cells. Pre-existing digitalis hyperkalemia resolves precipitously, and patients frequently plummet into severe hypokalemia within 1 to 4 hours post-infusion. Serial serum potassium monitoring every 1–2 hours and proactive K+ repletion (target 4.0–4.5 mEq/L) are mandatory to prevent hypokalemic ventricular tachydysrhythmias.",
  };

  const clinicalConsiderations = [
    "Infuse over 30 minutes diluted in 0.9% NaCl, or give rapid IV push in cardiac arrest.",
    "Monitor for non-IgE anaphylactoid reactions or sheep protein hypersensitivity (rare with purified Fab fragments).",
    "Underlying heart failure or atrial fibrillation with rapid ventricular response may unmask or worsen as inotropic support and vagomimetic AV nodal slowing are abruptly terminated.",
    "Renal excretion of Fab-digoxin complexes: In renal failure, elimination of the complex is prolonged; however, spontaneous dissociation of digoxin from Fab is clinically negligible due to sub-nanomolar affinity.",
  ];

  return {
    scenario,
    exactVialsCalculated: Math.round(exactVials * 100) / 100,
    vialsToAdministerRoundedUp: vialsRounded,
    formulaDescription,
    stoichiometricRationale,
    mgDigoxinNeutralized,
    reversalMechanism,
    postFabMonitoringTrap,
    clinicalConsiderations,
  };
}

// ============================================================================
// 4. CORE PILLAR 3: VAUGHAN-WILLIAMS CLASSIFICATION & PROARRHYTHMIC HAZARDS
// ============================================================================

export type VaughanWilliamsClass =
  | "Ia"
  | "Ib"
  | "Ic"
  | "II"
  | "III"
  | "IV"
  | "Misc";

export interface AntiarrhythmicDrugProfile {
  id: string;
  name: string;
  brandNames: string[];
  vwClass: VaughanWilliamsClass;
  primaryChannelTarget: string;
  conductanceEffect: string;
  actionPotentialEffect: string;
  conductionVelocityEffect: string;
  ecgManifestations: string;
  useDependencePattern: "marked-use-dependence" | "intermediate-use-dependence" | "reverse-use-dependence" | "rate-independent";
  useDependenceDescription: string;
  castTrialStatus?: {
    isCastContraindicated: boolean;
    trialSummary: string;
    proarrhythmiaMechanism: string;
    safeClinicalNiche: string;
  };
  dofetilideRemsProfile?: {
    isRemsRegulated: boolean;
    inpatientRequirement: string;
    baselineCrClDosing: Array<{ crClRange: string; doseMcgBid: number | string }>;
    baselineQtcLimit: string;
    titrationRule: string;
  };
  clinicalPearls: string[];
  boxedWarnings: string[];
  contraindications: string[];
}

export const ANTIARRHYTHMIC_PROFILES: Record<string, AntiarrhythmicDrugProfile> = {
  procainamide: {
    id: "procainamide",
    name: "Procainamide",
    brandNames: ["Pronestyl", "Procanbid"],
    vwClass: "Ia",
    primaryChannelTarget: "Nav1.5 (INa fast inward sodium) + IKr (delayed rectifier potassium)",
    conductanceEffect: "Moderate Nav1.5 blockade + moderate IKr blockade",
    actionPotentialEffect: "Depresses Phase 0 upstroke (Vmax); prolongs Phase 3 repolarization and effective refractory period (ERP).",
    conductionVelocityEffect: "Moderate slowing of intra-atrial, AV nodal, His-Purkinje, and ventricular conduction.",
    ecgManifestations: "Widened QRS complex + prolonged QT/QTc interval.",
    useDependencePattern: "intermediate-use-dependence",
    useDependenceDescription: "Intermediate kinetics of association and dissociation from sodium channels (tau recovery 1–5 seconds).",
    clinicalPearls: [
      "Active hepatic metabolite N-acetylprocainamide (NAPA) possesses pure Class III potassium channel blocking properties without sodium channel blockade.",
      "NAPA is eliminated renally; accumulates markedly in CKD, precipitating severe Torsades de Pointes.",
      "Chronic therapy causes Drug-Induced Lupus Erythematosus (DILE) in 50–80% of patients (anti-histone antibodies).",
      "First-line agent for hemodynamically stable pre-excited atrial fibrillation (Wolff-Parkinson-White syndrome).",
    ],
    boxedWarnings: [
      "Drug-Induced Lupus Erythematosus (DILE) and antinuclear antibodies.",
      "Fatal agranulocytosis / bone marrow suppression (0.5% incidence).",
      "Proarrhythmic hazard in structural heart disease and myocardial infarction.",
    ],
    contraindications: [
      "Complete heart block / 2nd-degree Mobitz II block without functioning pacemaker.",
      "Systemic lupus erythematosus.",
      "Torsades de Pointes or baseline prolonged QT interval.",
    ],
  },
  quinidine: {
    id: "quinidine",
    name: "Quinidine",
    brandNames: ["Quinidex", "Quinaglute"],
    vwClass: "Ia",
    primaryChannelTarget: "Nav1.5 + IKr + alpha-adrenergic & muscarinic M2 receptors",
    conductanceEffect: "Moderate Nav1.5 block + IKr block + antimuscarinic vagolytic block",
    actionPotentialEffect: "Moderate Phase 0 depression; prolongs repolarization and ERP.",
    conductionVelocityEffect: "Slows intraventricular conduction; vagolytic effect may paradoxically accelerate AV nodal conduction.",
    ecgManifestations: "Widened QRS, prolonged QT, flattened T waves.",
    useDependencePattern: "intermediate-use-dependence",
    useDependenceDescription: "Intermediate recovery kinetics; marked reverse use-dependence for IKr blockade causing TdP at slow heart rates.",
    clinicalPearls: [
      "Potent P-gp and CYP2D6 inhibitor: doubles digoxin concentrations and blocks codeine/tamoxifen bioactivation.",
      "Anticholinergic vagolytic effect can accelerate AV nodal conduction in atrial flutter; must co-administer AV nodal blocker.",
      "Cinchonism: tinnitus, headache, blurred vision, delirium.",
      "Quinidine syncope represents paroxysmal Torsades de Pointes occurring at therapeutic or subtherapeutic levels.",
    ],
    boxedWarnings: [
      "Increased mortality in clinical trials of atrial flutter/fibrillation.",
    ],
    contraindications: [
      "Baseline long QT syndrome / TdP history.",
      "Myasthenia gravis.",
      "Thrombocytopenic purpura history with quinidine.",
    ],
  },
  disopyramide: {
    id: "disopyramide",
    name: "Disopyramide",
    brandNames: ["Norpace", "Norpace CR"],
    vwClass: "Ia",
    primaryChannelTarget: "Nav1.5 + IKr + muscarinic M2/M3 receptors",
    conductanceEffect: "Nav1.5 block + IKr block + profound anticholinergic block + negative inotropy",
    actionPotentialEffect: "Moderate Phase 0 depression; prolongs ERP and repolarization.",
    conductionVelocityEffect: "Slows ventricular conduction.",
    ecgManifestations: "Widened QRS, prolonged QTc.",
    useDependencePattern: "intermediate-use-dependence",
    useDependenceDescription: "Intermediate sodium channel dissociation kinetics.",
    clinicalPearls: [
      "Profound negative inotropic agent; potent peripheral vasoconstrictor.",
      "Clinical niche: Hypertrophic Obstructive Cardiomyopathy (HOCM) to alleviate dynamic left ventricular outflow tract (LVOT) gradients.",
      "Extreme anticholinergic toxicity: urinary retention, dry mouth, glaucoma precipitation, constipation.",
    ],
    boxedWarnings: [
      "Proarrhythmic mortality risk similar to other Class I antiarrhythmics.",
    ],
    contraindications: [
      "Heart failure with reduced ejection fraction (HFrEF) or uncompensated cardiogenic shock.",
      "Pre-existing long QT syndrome.",
      "Severe urinary retention or untreated closed-angle glaucoma.",
    ],
  },
  lidocaine: {
    id: "lidocaine",
    name: "Lidocaine (Xylocaine)",
    brandNames: ["Xylocaine"],
    vwClass: "Ib",
    primaryChannelTarget: "Nav1.5 (inactivated and open states)",
    conductanceEffect: "Fast on-off Nav1.5 blockade, preferential affinity for depolarized / ischemic myocardium",
    actionPotentialEffect: "Shortens Phase 3 repolarization and Action Potential Duration (APD); ERP/APD ratio increased.",
    conductionVelocityEffect: "Zero or negligible effect on conduction velocity in normal tissue; slows conduction exclusively in ischemic zones.",
    ecgManifestations: "Normal QRS duration; slight shortening or neutral QT interval.",
    useDependencePattern: "rate-independent",
    useDependenceDescription: "Rapid unbinding during diastole (tau recovery < 0.5 seconds). At normal heart rates and normal resting potential (-90 mV), blocks < 10% of channels.",
    clinicalPearls: [
      "Selectively targets ischemic, depolarized, or rapidly firing ventricular tissue (VT/VF during acute myocardial infarction).",
      "Virtually ineffective in supraventricular arrhythmias (atrial action potentials are too short to generate the inactivated state required for high-affinity binding).",
      "Hepatic clearance is blood-flow limited; dose must be halved in congestive heart failure, hepatic cirrhosis, or shock.",
      "Neurotoxicity precedes cardiotoxicity: perioral numbness, metallic taste, paresthesias, confusion, seizures.",
    ],
    boxedWarnings: [],
    contraindications: [
      "Advanced AV block (2nd or 3rd degree) without pacemaker.",
      "Severe amide local anesthetic hypersensitivity.",
    ],
  },
  mexiletine: {
    id: "mexiletine",
    name: "Mexiletine",
    brandNames: ["Mexitil"],
    vwClass: "Ib",
    primaryChannelTarget: "Nav1.5 (inactivated/late inward sodium current INa-L)",
    conductanceEffect: "Fast on-off Nav1.5 blockade; potent inhibitor of late sodium current (INa-L)",
    actionPotentialEffect: "Shortens APD and repolarization.",
    conductionVelocityEffect: "No QRS widening in normal conduction.",
    ecgManifestations: "Normal QRS; shortens or neutral QT.",
    useDependencePattern: "rate-independent",
    useDependenceDescription: "Rapid dissociation kinetics during diastole; preferentially binds depolarized channels.",
    clinicalPearls: [
      "Oral analogue of lidocaine with high oral bioavailability (~90%).",
      "Clinical niche: Monomorphic ventricular tachycardia in ischemic cardiomyopathy and adjuvant therapy for Congenital Long QT Syndrome Type 3 (LQT3, SCN5A gain-of-function mutation).",
      "Take with meals to prevent severe gastrointestinal nausea and dyspepsia.",
    ],
    boxedWarnings: [
      "Mortality warning based on CAST extrapolation to Class I antiarrhythmics in post-MI patients.",
    ],
    contraindications: [
      "Cardiogenic shock or pre-existing 2nd/3rd-degree AV block without pacemaker.",
    ],
  },
  flecainide: {
    id: "flecainide",
    name: "Flecainide",
    brandNames: ["Tambocor"],
    vwClass: "Ic",
    primaryChannelTarget: "Nav1.5 (slow open-channel blockade) + RyR2 (cardiac ryanodine receptor)",
    conductanceEffect: "Profound, slow on-off Nav1.5 blockade without potassium channel effect; RyR2 inhibition",
    actionPotentialEffect: "Severe depression of Phase 0 upstroke (Vmax reduction); minimal effect on repolarization or APD.",
    conductionVelocityEffect: "Marked slowing of intra-atrial, His-Purkinje, and intraventricular conduction velocity.",
    ecgManifestations: "Marked QRS prolongation; PR prolongation; minimal change in JT/repolarization (QT lengthens secondary to QRS).",
    useDependencePattern: "marked-use-dependence",
    useDependenceDescription: "Slow dissociation from sodium channels during diastole (tau recovery > 10–30 seconds). At faster heart rates (tachycardia, exercise), channel unbinding is incomplete, causing progressive drug accumulation, extreme QRS widening, and sinusoidal VT.",
    castTrialStatus: {
      isCastContraindicated: true,
      trialSummary:
        "LANDMARK CAST TRIAL CONTRAINDICATION (NEJM 1989): In post-MI patients with asymptomatic ventricular ectopy, flecainide therapy resulted in a > 2.5-fold higher rate of arrhythmic death and cardiac arrest compared to placebo (relative risk 2.64, 95% CI 1.60–4.36; trial halted early by DSMB).",
      proarrhythmiaMechanism:
        "In ischemic or scarred myocardium, slow sodium channel unbinding causes non-uniform conduction slowing, creates critical conduction block, and generates large excitable gaps for lethal macroreentrant ventricular tachycardia (monomorphic or sinusoidal VT).",
      safeClinicalNiche:
        "STRICTLY RESTRICTED TO STRUCTURALLY NORMAL HEARTS: Paroxysmal atrial fibrillation/flutter without ischemic disease, prior MI, or ventricular hypertrophy. 'Pill-in-the-pocket' conversion requires concurrent AV nodal blocker (beta-blocker or diltiazem/verapamil) to prevent 1:1 AV conduction of slowed atrial flutter (200 bpm). Also used in Catecholaminergic Polymorphic Ventricular Tachycardia (CPVT) via RyR2 inhibition.",
    },
    clinicalPearls: [
      "Exercise testing is mandatory during chronic titration to evaluate rate-dependent QRS widening under adrenergic stress.",
      "1:1 Atrial Flutter Hazard: Flecainide slows atrial flutter rate from 300 to ~200 bpm; the slower rate allows 1:1 AV nodal conduction, triggering life-threatening wide-complex ventricular tachycardia. Always co-prescribe AV nodal blocker.",
      "CYP2D6 substrate (~30% metabolism) and 70% renal elimination. Reduce dose in renal impairment or CYP2D6 poor metabolizers.",
    ],
    boxedWarnings: [
      "Mortality excess in post-MI patients with asymptomatic ventricular arrhythmias (CAST trial).",
      "Proarrhythmic hazard in structural heart disease and heart failure.",
    ],
    contraindications: [
      "Ischemic heart disease, coronary artery disease, or prior myocardial infarction.",
      "Structural heart disease, left ventricular hypertrophy, or heart failure (HFrEF / HFpEF).",
      "Pre-existing bundle branch block or bifascicular block without pacemaker.",
      "Brugada syndrome (unmasks type 1 Brugada coved ST-segment elevation).",
    ],
  },
  propafenone: {
    id: "propafenone",
    name: "Propafenone",
    brandNames: ["Rythmol", "Rythmol SR"],
    vwClass: "Ic",
    primaryChannelTarget: "Nav1.5 (slow open-channel block) + beta-1/beta-2 adrenergic receptors + IKr (weak)",
    conductanceEffect: "Slow on-off Nav1.5 blockade + mild non-selective beta-adrenergic antagonism",
    actionPotentialEffect: "Profound Phase 0 upstroke depression; minimal effect on APD.",
    conductionVelocityEffect: "Marked intraventricular conduction slowing; beta-blocker slows AV nodal conduction.",
    ecgManifestations: "QRS widening, PR interval prolongation, sinus bradycardia.",
    useDependencePattern: "marked-use-dependence",
    useDependenceDescription: "Marked exercise-induced and tachycardia-induced use-dependence.",
    castTrialStatus: {
      isCastContraindicated: true,
      trialSummary:
        "CAST CLASS CONTRAINDICATION: As a Class Ic agent with slow sodium channel kinetics, propafenone shares the class contraindication in structural and ischemic heart disease.",
      proarrhythmiaMechanism:
        "Exacerbates reentrant ventricular proarrhythmia in myocardial scar and worsens heart failure via negative inotropy and beta-blockade.",
      safeClinicalNiche:
        "Atrial fibrillation maintenance in structurally normal hearts ('lone AFib'). Mild intrinsic beta-blocking activity provides some protection against 1:1 atrial flutter conduction.",
    },
    clinicalPearls: [
      "Possesses weak intrinsic beta-blocking activity (~1/40th potency of propranolol); can trigger bronchospasm in asthma/COPD.",
      "Extensively metabolized by CYP2D6 (saturable kinetics) and CYP3A4. CYP2D6 poor metabolizers exhibit 5-fold higher plasma concentrations.",
      "Inhibits P-glycoprotein: raises serum digoxin concentrations by ~30–50%.",
    ],
    boxedWarnings: [
      "Excess mortality in post-MI structural heart disease (CAST extrapolation).",
    ],
    contraindications: [
      "Ischemic heart disease, coronary artery disease, prior MI.",
      "Heart failure or severe left ventricular systolic dysfunction.",
      "Severe bradycardia, sick sinus syndrome, or high-grade AV block without pacemaker.",
      "Severe obstructive airway disease (asthma, severe bronchospasm).",
    ],
  },
  amiodarone: {
    id: "amiodarone",
    name: "Amiodarone",
    brandNames: ["Cordarone", "Pacerone", "Nexterone"],
    vwClass: "III",
    primaryChannelTarget: "IKr (hERG) + Nav1.5 (inactivated) + Cav1.2 (L-type Ca2+) + non-competitive alpha/beta adrenergic",
    conductanceEffect: "Pan-channel blocker: Class I, II, III, and IV electrophysiologic properties",
    actionPotentialEffect: "Uniform prolongation of Phase 3 repolarization and APD across all myocardial layers (atrial, ventricular, Purkinje).",
    conductionVelocityEffect: "Slows AV nodal and intraventricular conduction; slows sinus rate.",
    ecgManifestations: "PR prolongation, marked QTc prolongation, widened T waves, sinus bradycardia.",
    useDependencePattern: "rate-independent",
    useDependenceDescription: "Unlike pure Class III agents, amiodarone does NOT exhibit reverse use-dependence. Its blockade of calcium and sodium channels suppresses early afterdepolarizations (EADs) and reduces transmural dispersion of repolarization.",
    clinicalPearls: [
      "Paradoxical Torsades de Pointes safety: Despite massive QT prolongation (QTc often > 500 ms), the incidence of Torsades de Pointes is exceptionally low (< 0.5–1%) due to concurrent L-type Ca2+ channel blockade suppressing triggered early afterdepolarizations (EADs).",
      "Extremely long elimination half-life: 40 to 60 days (tissue accumulation in adipose, lung, liver). Clinical effects and drug interactions persist for months after discontinuation.",
      "Potent inhibitor of CYP3A4, CYP2C9, and P-gp: doubles warfarin INR (mandatory 30–50% warfarin dose cut) and doubles digoxin concentration (mandatory 50% digoxin dose cut).",
      "Extracardiac multi-organ toxicity: Pulmonary fibrosis (interstitial pneumonitis; 5–10% fatality), thyroid dysfunction (hyper- or hypothyroidism; 37% iodine by weight), hepatotoxicity, corneal microdeposits (ubiquitous, benign), optic neuropathy, peripheral neuropathy, dermatologic blue-gray discoloration.",
    ],
    boxedWarnings: [
      "Pulmonary toxicity: Fatal toxic pneumonitis / pulmonary fibrosis.",
      "Hepatotoxicity: Acute hepatic necrosis and cirrhosis.",
      "Worsened arrhythmia: Proarrhythmic exacerbation in 2–5% of patients.",
    ],
    contraindications: [
      "Severe sinus node dysfunction / sick sinus syndrome without pacemaker.",
      "2nd or 3rd-degree AV block without pacemaker.",
      "Cardiogenic shock.",
      "Iodine hypersensitivity.",
    ],
  },
  sotalol: {
    id: "sotalol",
    name: "Sotalol",
    brandNames: ["Betapace", "Betapace AF", "Sorine"],
    vwClass: "III",
    primaryChannelTarget: "IKr (hERG) + non-selective beta-1/beta-2 adrenergic receptors",
    conductanceEffect: "Selective IKr potassium channel blockade + competitive beta-blockade",
    actionPotentialEffect: "Marked prolongation of Phase 3 repolarization and APD.",
    conductionVelocityEffect: "Slows AV nodal conduction and sinus rate.",
    ecgManifestations: "Prolonged QTc interval, sinus bradycardia, prominent U waves.",
    useDependencePattern: "reverse-use-dependence",
    useDependenceDescription: "Classic reverse use-dependence: Potassium channel blockade and APD prolongation are most pronounced at slow heart rates and long pauses, dramatically amplifying Torsades de Pointes hazard during bradycardia.",
    clinicalPearls: [
      "Racemic mixture: d-sotalol (pure Class III IKr blocker) + l-sotalol (potent non-selective beta-blocker).",
      "Renal elimination: > 80% excreted unchanged in urine. Strict dosing adjustments based on Cockcroft-Gault CrCl.",
      "Hospital admission required for initiation (minimum 3 days / 6 doses with continuous telemetry and serial QTc checks).",
      "Torsades de Pointes incidence is 2–4% overall, rising to > 7% in women, heart failure, hypokalemia, or renal impairment.",
    ],
    boxedWarnings: [
      "To minimize proarrhythmia risk, initiate in a facility with continuous cardiac monitoring and resuscitation personnel for at least 3 days.",
      "Do not substitute Betapace for Betapace AF due to different patient education and labeling.",
    ],
    contraindications: [
      "Baseline QTc > 450 ms.",
      "CrCl < 40 mL/min (for Betapace AF).",
      "Bronchial asthma or severe COPD.",
      "Sinus bradycardia (< 50 bpm) or 2nd/3rd-degree AV block without pacemaker.",
      "Serum potassium < 4.0 mEq/L or magnesium < 2.0 mg/dL.",
    ],
  },
  dofetilide: {
    id: "dofetilide",
    name: "Dofetilide",
    brandNames: ["Tikosyn"],
    vwClass: "III",
    primaryChannelTarget: "IKr (hERG) selective rapid delayed rectifier potassium channel",
    conductanceEffect: "Pure, potent, highly selective IKr blockade without other channel or autonomic effects",
    actionPotentialEffect: "Pure Phase 3 repolarization prolongation and APD extension.",
    conductionVelocityEffect: "Zero effect on conduction velocity (pure repolarization agent).",
    ecgManifestations: "Marked QTc prolongation; no QRS widening; no PR prolongation.",
    useDependencePattern: "reverse-use-dependence",
    useDependenceDescription: "Marked reverse use-dependence: Action potential prolongation is greatest at slow pacing rates, rendering bradycardic pauses lethal proarrhythmic triggers.",
    dofetilideRemsProfile: {
      isRemsRegulated: true,
      inpatientRequirement:
        "MANDATORY >= 3-DAY (72-HOUR) INPATIENT HOSPITALIZATION WITH CONTINUOUS CARDIAC TELEMETRY: Hospitalization is legally mandated by FDA REMS for initiation or dose escalation. Cardiac resuscitation equipment and staff trained in TdP management must be immediately available.",
      baselineCrClDosing: [
        { crClRange: "CrCl > 60 mL/min", doseMcgBid: 500 },
        { crClRange: "CrCl 40 to 60 mL/min", doseMcgBid: 250 },
        { crClRange: "CrCl 20 to 39 mL/min", doseMcgBid: 125 },
        { crClRange: "CrCl < 20 mL/min", doseMcgBid: "CONTRAINDICATED" },
      ],
      baselineQtcLimit: "Baseline QTc must be <= 440 ms (<= 500 ms in bundle branch block / ventricular pacing).",
      titrationRule:
        "Measure 12-lead EKG at 2 to 3 hours post-dose (Tmax). If QTc increases by > 15% from baseline or exceeds 500 ms (550 ms in BBB), immediately reduce dose (e.g. 500 -> 250 mcg BID; 250 -> 125 mcg BID). If QTc > 500 ms on 125 mcg BID, permanently discontinue.",
    },
    clinicalPearls: [
      "Safe in heart failure and prior myocardial infarction (DIAMOND trial: neutral mortality in HFrEF/post-MI, effective in converting and maintaining sinus rhythm in AFib).",
      "Renal elimination: ~80% cleared renally (half via filtration, half via active cationic tubular secretion mediated by OCT2 / SLC22A2 and MATE1).",
      "Strict contraindicated drug interactions: Verapamil, Cimetidine, Hydrochlorothiazide, Ketoconazole, Prochlorperazine, Megestrol, Trimethoprim/Sulfamethoxazole (all block OCT2/MATE1 renal excretion and trigger fatal TdP).",
      "Pre-requisite labs: Serum K+ must be >= 4.0 mEq/L and serum Mg2+ >= 2.0 mg/dL prior to initial dose.",
    ],
    boxedWarnings: [
      "Must be initiated (or re-initiated) in an inpatient facility with continuous ECG monitoring for a minimum of 3 days.",
      "Calculate Cockcroft-Gault CrCl and baseline QTc prior to first dose.",
      "Torsades de Pointes risk is directly concentration-dependent.",
    ],
    contraindications: [
      "Baseline QTc > 440 ms (or > 500 ms with ventricular conduction abnormality).",
      "CrCl < 20 mL/min or end-stage renal disease.",
      "Concurrent administration of verapamil, cimetidine, HCTZ, ketoconazole, trimethoprim.",
      "Severe hypokalemia (< 4.0 mEq/L) or hypomagnesemia (< 2.0 mg/dL).",
    ],
  },
  dronedarone: {
    id: "dronedarone",
    name: "Dronedarone",
    brandNames: ["Multaq"],
    vwClass: "III",
    primaryChannelTarget: "IKr + IKs + INa + ICa-L + adrenergic receptors",
    conductanceEffect: "Multi-channel blocker; non-iodinated amiodarone derivative with shorter half-life (~24–30h)",
    actionPotentialEffect: "Prolongs repolarization and APD across atrial and ventricular tissues.",
    conductionVelocityEffect: "Slows AV nodal conduction and sinus rate.",
    ecgManifestations: "Moderate QTc prolongation, PR prolongation, bradycardia.",
    useDependencePattern: "rate-independent",
    useDependenceDescription: "Multi-channel blocking profile attenuates reverse use-dependence.",
    clinicalPearls: [
      "Designed to eliminate amiodarone's organ toxicities by removing iodine moieties and adding a methane-sulfonyl group.",
      "ANDROMEDA TRIAL BOXED WARNING: Contraindicated in symptomatic NYHA Class IV heart failure or NYHA Class II-III with recent decompensation (2-fold increase in mortality).",
      "PALLAS TRIAL BOXED WARNING: Contraindicated in permanent atrial fibrillation where sinus rhythm will not be restored (2-fold increase in death, stroke, and HF hospitalizations).",
      "Potent CYP3A4 and P-gp inhibitor: doubles digoxin concentrations (mandates 50% digoxin dose cut) and raises statin levels.",
      "Increases serum creatinine by ~0.1 mg/dL via inhibition of OCT2/MATE tubular secretion without altering actual GFR.",
    ],
    boxedWarnings: [
      "Doubled mortality in decompensated heart failure (ANDROMEDA trial).",
      "Doubled cardiovascular death, stroke, and heart failure hospitalizations in permanent AFib (PALLAS trial).",
    ],
    contraindications: [
      "Permanent atrial fibrillation (unable to be cardioverted to sinus rhythm).",
      "NYHA Class IV heart failure or recent hospitalization for decompensated heart failure.",
      "2nd or 3rd-degree AV block or sick sinus syndrome without pacemaker.",
      "Concurrent strong CYP3A4 inhibitors (ketoconazole, clarithromycin) or QT-prolonging drugs.",
      "Severe hepatic impairment.",
    ],
  },
};

// ============================================================================
// 5. DESK TRAY DETECTION & COMPREHENSIVE REPORT GENERATOR
// ============================================================================

export interface AntiarrhythmicDeskDetection {
  hasAntiarrhythmic: boolean;
  hasDigoxin: boolean;
  hasDigiFab: boolean;
  hasClass1a: boolean;
  hasClass1b: boolean;
  hasClass1c: boolean;
  hasClass2: boolean;
  hasClass3: boolean;
  hasClass4: boolean;
  hasPgpInhibitor: boolean;
  hasElectrolyteDisturbanceRisk: boolean;
  detectedAntiarrhythmicIds: string[];
  detectedDigoxinIds: string[];
  detectedClass1aIds: string[];
  detectedClass1bIds: string[];
  detectedClass1cIds: string[];
  detectedClass3Ids: string[];
  detectedPgpInhibitorIds: string[];
  detectedCastContraindicatedIds: string[];
  detectedDofetilideRemsIds: string[];
}

export interface AntiarrhythmicAlert {
  tier: "critical" | "warning" | "advisory";
  category: "Digoxin" | "DigiFab" | "CAST" | "DofetilideREMS" | "VaughanWilliams" | "PgpCollision" | "ElectrolyteAmplifier";
  title: string;
  rationale: string;
  actionGuidance: string;
}

export interface AntiarrhythmicReportOptions {
  digoxinTdm?: DigoxinTdmInput;
  digiFabCalc?: DigiFabCalculationInput;
  hasStructuralOrIschemicHeartDisease?: boolean;
  baselineQtcMs?: number;
  measuredCrClMlMin?: number;
}

export interface AntiarrhythmicReport {
  onDesk: AntiarrhythmicDeskDetection;
  activeDrugProfiles: AntiarrhythmicDrugProfile[];
  digoxinEvaluation?: DigoxinTdmEvaluation;
  digiFabCalculation?: DigiFabCalculationResult;
  castTrialAdvisories: Array<{
    drugId: string;
    drugName: string;
    summary: string;
    actionGuidance: string;
  }>;
  dofetilideRemsAdvisory?: {
    drugId: string;
    isIndicated: boolean;
    inpatientRule: string;
    baselineQtcMs?: number;
    measuredCrClMlMin?: number;
    recommendedStartingDose: string;
    titrationInstructions: string;
  };
  alerts: AntiarrhythmicAlert[];
  disclaimer: string;
  citations: readonly string[];
}

export const POTENT_PGP_INHIBITOR_MAP: Record<string, { name: string; digoxinDoseCutPct: number; mechanism: string }> = {
  amiodarone: { name: "Amiodarone", digoxinDoseCutPct: 50, mechanism: "Potent P-gp inhibition in proximal renal tubules and gut; doubles digoxin AUC." },
  verapamil: { name: "Verapamil", digoxinDoseCutPct: 50, mechanism: "P-gp and renal clearance inhibition; doubles digoxin serum levels and compounds AV block." },
  quinidine: { name: "Quinidine", digoxinDoseCutPct: 50, mechanism: "Displaces digoxin from tissue binding sites and potently blocks P-gp tubular secretion; doubles SDC." },
  dronedarone: { name: "Dronedarone", digoxinDoseCutPct: 50, mechanism: "Strong P-gp inhibitor; labeled requirement to empirically reduce digoxin dose by 50%." },
  clarithromycin: { name: "Clarithromycin", digoxinDoseCutPct: 50, mechanism: "Potent gut and renal P-gp inhibitor; marked elevation of systemic digoxin exposure." },
  itraconazole: { name: "Itraconazole", digoxinDoseCutPct: 50, mechanism: "Potent P-gp and CYP3A inhibitor; significantly impairs digoxin elimination." },
  cyclosporine: { name: "Cyclosporine", digoxinDoseCutPct: 50, mechanism: "Strong P-gp and OATP inhibitor; dramatically increases digoxin exposure." },
  propafenone: { name: "Propafenone", digoxinDoseCutPct: 30, mechanism: "Class Ic agent with moderate P-gp inhibition; increases digoxin levels ~30–50%." },
};

export const ELECTROLYTE_WASTING_DRUGS = new Set([
  "furosemide",
  "torsemide",
  "bumetanide",
  "hydrochlorothiazide",
  "chlorthalidone",
  "indapamide",
  "prednisone",
  "dexamethasone",
  "hydrocortisone",
  "amphotericin-b",
  "licorice",
  "senna",
  "bisacodyl",
]);

/**
 * Detects antiarrhythmic drugs, cardiac glycosides, reversal agents, and clearance collision partners on the desk.
 */
export function antiarrhythmicOnDesk(drugIds: string[]): AntiarrhythmicDeskDetection {
  const normIds = drugIds.map((id) => id.toLowerCase().trim());

  const detectedAntiarrhythmicIds: string[] = [];
  const detectedDigoxinIds: string[] = [];
  const detectedClass1aIds: string[] = [];
  const detectedClass1bIds: string[] = [];
  const detectedClass1cIds: string[] = [];
  const detectedClass3Ids: string[] = [];
  const detectedPgpInhibitorIds: string[] = [];
  const detectedCastContraindicatedIds: string[] = [];
  const detectedDofetilideRemsIds: string[] = [];

  let hasDigoxin = false;
  let hasDigiFab = false;
  let hasClass1a = false;
  let hasClass1b = false;
  let hasClass1c = false;
  let hasClass2 = false;
  let hasClass3 = false;
  let hasClass4 = false;
  let hasElectrolyteDisturbanceRisk = false;

  for (const id of normIds) {
    if (id === "digoxin") {
      hasDigoxin = true;
      detectedDigoxinIds.push(id);
    }
    if (id === "digifab" || id === "digoxin-immune-fab") {
      hasDigiFab = true;
    }

    if (id in POTENT_PGP_INHIBITOR_MAP) {
      detectedPgpInhibitorIds.push(id);
    }

    if (ELECTROLYTE_WASTING_DRUGS.has(id)) {
      hasElectrolyteDisturbanceRisk = true;
    }

    const profile = ANTIARRHYTHMIC_PROFILES[id];
    if (profile) {
      detectedAntiarrhythmicIds.push(id);
      if (profile.vwClass === "Ia") {
        hasClass1a = true;
        detectedClass1aIds.push(id);
      } else if (profile.vwClass === "Ib") {
        hasClass1b = true;
        detectedClass1bIds.push(id);
      } else if (profile.vwClass === "Ic") {
        hasClass1c = true;
        detectedClass1cIds.push(id);
        if (profile.castTrialStatus?.isCastContraindicated) {
          detectedCastContraindicatedIds.push(id);
        }
      } else if (profile.vwClass === "III") {
        hasClass3 = true;
        detectedClass3Ids.push(id);
        if (profile.dofetilideRemsProfile?.isRemsRegulated) {
          detectedDofetilideRemsIds.push(id);
        }
      }
    }

    // Detect Class II (Beta-blockers)
    if (
      [
        "metoprolol",
        "atenolol",
        "propranolol",
        "carvedilol",
        "esmolol",
        "bisoprolol",
        "nadolol",
        "labetalol",
        "sotalol",
      ].includes(id)
    ) {
      hasClass2 = true;
    }

    // Detect Class IV (Non-DHP CCBs)
    if (["verapamil", "diltiazem"].includes(id)) {
      hasClass4 = true;
    }
  }

  const hasAntiarrhythmic =
    detectedAntiarrhythmicIds.length > 0 ||
    hasDigoxin ||
    hasClass1a ||
    hasClass1b ||
    hasClass1c ||
    hasClass2 ||
    hasClass3 ||
    hasClass4;

  const hasPgpInhibitor = detectedPgpInhibitorIds.length > 0;

  return {
    hasAntiarrhythmic,
    hasDigoxin,
    hasDigiFab,
    hasClass1a,
    hasClass1b,
    hasClass1c,
    hasClass2,
    hasClass3,
    hasClass4,
    hasPgpInhibitor,
    hasElectrolyteDisturbanceRisk,
    detectedAntiarrhythmicIds,
    detectedDigoxinIds,
    detectedClass1aIds,
    detectedClass1bIds,
    detectedClass1cIds,
    detectedClass3Ids,
    detectedPgpInhibitorIds,
    detectedCastContraindicatedIds,
    detectedDofetilideRemsIds,
  };
}

/**
 * Comprehensive Antiarrhythmic, Digoxin TDM & DigiFab Report Generator.
 */
export function antiarrhythmicReportOnDesk(
  drugIds: string[],
  host: HostContext = DEFAULT_HOST,
  options?: AntiarrhythmicReportOptions,
): AntiarrhythmicReport {
  const onDesk = antiarrhythmicOnDesk(drugIds);
  const activeDrugProfiles = onDesk.detectedAntiarrhythmicIds
    .map((id) => ANTIARRHYTHMIC_PROFILES[id])
    .filter((p): p is AntiarrhythmicDrugProfile => Boolean(p));

  const alerts: AntiarrhythmicAlert[] = [];

  // 1. Digoxin TDM Evaluation
  let digoxinEvaluation: DigoxinTdmEvaluation | undefined;
  if (onDesk.hasDigoxin || options?.digoxinTdm) {
    const input: DigoxinTdmInput = options?.digoxinTdm ?? {
      serumDigoxinNgMl: 1.0,
      indication: "hfref",
      hoursPostDose: 12,
      hasPgpInhibitor: onDesk.hasPgpInhibitor,
      pgpInhibitorIds: onDesk.detectedPgpInhibitorIds,
      patientWeightKg: 70,
    };
    // Ensure P-gp inhibitors detected on desk are wired into evaluation if not explicitly provided
    if (onDesk.hasPgpInhibitor && (!input.pgpInhibitorIds || input.pgpInhibitorIds.length === 0)) {
      input.hasPgpInhibitor = true;
      input.pgpInhibitorIds = onDesk.detectedPgpInhibitorIds;
    }
    digoxinEvaluation = evaluateDigoxinTdm(input);

    if (digoxinEvaluation.isDistributionLagArtifact) {
      alerts.push({
        tier: "critical",
        category: "Digoxin",
        title: "Sampling Timing Trap: Pre-Distribution Phase (< 6h post-dose)",
        rationale: digoxinEvaluation.clinicalMeaning,
        actionGuidance: digoxinEvaluation.samplingTimingGuidance,
      });
    } else if (digoxinEvaluation.isLifeThreatening) {
      alerts.push({
        tier: "critical",
        category: "Digoxin",
        title: `Life-Threatening Digoxin Overdose (${digoxinEvaluation.serumDigoxinNgMl} ng/mL)`,
        rationale: digoxinEvaluation.clinicalMeaning,
        actionGuidance:
          "Immediate continuous telemetry, 12-lead EKG, serum potassium evaluation. Prepare Digoxin Immune Fab (DigiFab) reversal according to steady-state stoichiometry or empiric arrest protocol.",
      });
    } else if (digoxinEvaluation.isToxic) {
      alerts.push({
        tier: "critical",
        category: "Digoxin",
        title: `Definite Digoxin Toxicity (${digoxinEvaluation.serumDigoxinNgMl} ng/mL)`,
        rationale: digoxinEvaluation.clinicalMeaning,
        actionGuidance:
          "Hold digitalis therapy. Check serial potassium and magnesium. Continuous cardiac monitoring for AV block or ventricular ectopy. Assess indication for DigiFab.",
      });
    } else if (digoxinEvaluation.band === "elevated") {
      alerts.push({
        tier: "warning",
        category: "Digoxin",
        title: `Elevated Digoxin Concentration (${digoxinEvaluation.serumDigoxinNgMl} ng/mL)`,
        rationale: digoxinEvaluation.clinicalMeaning,
        actionGuidance:
          "Consider dose reduction. DIG trial data shows increased all-cause mortality with SDC >= 1.2 ng/mL in HFrEF without added benefit.",
      });
    }

    if (digoxinEvaluation.electrolyteSensitivity.hasAmplifier) {
      alerts.push({
        tier: digoxinEvaluation.electrolyteSensitivity.severity === "severe" ? "critical" : "warning",
        category: "ElectrolyteAmplifier",
        title: "Digitalis Arrhythmia Sensitivity Amplifier Active",
        rationale: digoxinEvaluation.electrolyteSensitivity.mechanisms.join(" "),
        actionGuidance: digoxinEvaluation.electrolyteSensitivity.clinicalAdvisory,
      });
    }

    if (digoxinEvaluation.pgpCollisionAlert) {
      alerts.push({
        tier: "critical",
        category: "PgpCollision",
        title: `P-gp Collision: Digoxin + ${digoxinEvaluation.pgpCollisionAlert.perpetrators.join(", ")}`,
        rationale: digoxinEvaluation.pgpCollisionAlert.aucImpact,
        actionGuidance: digoxinEvaluation.pgpCollisionAlert.doseAdjustmentGuidance,
      });
    }
  }

  // 2. DigiFab Calculation
  let digiFabCalculation: DigiFabCalculationResult | undefined;
  if (onDesk.hasDigiFab || options?.digiFabCalc || digoxinEvaluation?.isToxic) {
    const defaultScenario: DigiFabDosingScenario = digoxinEvaluation?.isLifeThreatening
      ? "steady-state-serum-concentration"
      : "steady-state-serum-concentration";

    const calcInput: DigiFabCalculationInput = options?.digiFabCalc ?? {
      scenario: defaultScenario,
      serumDigoxinNgMl: digoxinEvaluation?.serumDigoxinNgMl ?? 4.0,
      patientWeightKg: options?.digoxinTdm?.patientWeightKg ?? 70,
    };
    digiFabCalculation = calculateDigiFabVials(calcInput);

    alerts.push({
      tier: "critical",
      category: "DigiFab",
      title: "Mandatory Post-Fab Immunoassay Trap & Rebound Hypokalemia Alert",
      rationale: digiFabCalculation.postFabMonitoringTrap.totalDigoxinSpikeExplanation,
      actionGuidance: `${digiFabCalculation.postFabMonitoringTrap.uninterpretableWindowDuration} ${digiFabCalculation.postFabMonitoringTrap.telemetryAndEkgDirective} ${digiFabCalculation.postFabMonitoringTrap.potassiumShiftWarning}`,
    });
  }

  // 3. CAST Trial Landmark Contraindications
  const castTrialAdvisories: AntiarrhythmicReport["castTrialAdvisories"] = [];
  const hasStructuralDisease =
    options?.hasStructuralOrIschemicHeartDisease ||
    host.kidney === "ckd" || // common comorbidity marker in complex regimes
    false;

  for (const id of onDesk.detectedCastContraindicatedIds) {
    const prof = ANTIARRHYTHMIC_PROFILES[id];
    if (prof?.castTrialStatus) {
      castTrialAdvisories.push({
        drugId: id,
        drugName: prof.name,
        summary: prof.castTrialStatus.trialSummary,
        actionGuidance: prof.castTrialStatus.safeClinicalNiche,
      });

      alerts.push({
        tier: "critical",
        category: "CAST",
        title: `CAST Trial Landmark Contraindication: ${prof.name} (Class Ic)`,
        rationale: `${prof.castTrialStatus.trialSummary} ${prof.castTrialStatus.proarrhythmiaMechanism}`,
        actionGuidance: `${prof.castTrialStatus.safeClinicalNiche} STRICTLY CONTRAINDICATED in coronary artery disease, prior MI, or structural heart disease.`,
      });
    }
  }

  // 4. Dofetilide REMS Protocol
  let dofetilideRemsAdvisory: AntiarrhythmicReport["dofetilideRemsAdvisory"];
  if (onDesk.detectedDofetilideRemsIds.includes("dofetilide")) {
    const prof = ANTIARRHYTHMIC_PROFILES["dofetilide"];
    const rems = prof?.dofetilideRemsProfile;
    const crCl = options?.measuredCrClMlMin ?? (host.kidney === "ckd" ? 35 : 85);
    const qtc = options?.baselineQtcMs ?? 420;

    let recDose = "500 mcg PO BID";
    if (crCl < 20) recDose = "CONTRAINDICATED (CrCl < 20 mL/min)";
    else if (crCl < 40) recDose = "125 mcg PO BID";
    else if (crCl <= 60) recDose = "250 mcg PO BID";

    dofetilideRemsAdvisory = {
      drugId: "dofetilide",
      isIndicated: true,
      inpatientRule: rems?.inpatientRequirement ?? "Mandatory 3-day inpatient telemetry initiation.",
      baselineQtcMs: qtc,
      measuredCrClMlMin: crCl,
      recommendedStartingDose: recDose,
      titrationInstructions: rems?.titrationRule ?? "Monitor QTc at 2-3 hours post-dose.",
    };

    if (qtc > 440) {
      alerts.push({
        tier: "critical",
        category: "DofetilideREMS",
        title: `Dofetilide REMS Baseline QTc Violation (${qtc} ms > 440 ms)`,
        rationale: "FDA REMS requires baseline QTc <= 440 ms (<= 500 ms with bundle branch block). Initiating dofetilide with baseline QTc > 440 ms confers unacceptable risk of fatal Torsades de Pointes.",
        actionGuidance: "Withhold dofetilide initiation. Re-evaluate alternative antiarrhythmic or non-pharmacologic rhythm strategies.",
      });
    }

    if (crCl < 20) {
      alerts.push({
        tier: "critical",
        category: "DofetilideREMS",
        title: `Dofetilide Strict Renal Contraindication (CrCl ${crCl} mL/min < 20 mL/min)`,
        rationale: "Dofetilide is cleared 80% by kidneys. At CrCl < 20 mL/min, drug accumulation causes profound IKr blockade and refractory TdP.",
        actionGuidance: "Absolute contraindication. Use amiodarone or non-antiarrhythmic rate control strategies in advanced renal dysfunction.",
      });
    } else {
      alerts.push({
        tier: "warning",
        category: "DofetilideREMS",
        title: "Dofetilide FDA REMS Inpatient Mandate Active",
        rationale: `${rems?.inpatientRequirement} Recommended starting dose based on Cockcroft-Gault CrCl (${crCl} mL/min): ${recDose}.`,
        actionGuidance: rems?.titrationRule ?? "Check 12-lead EKG at 2-3 hours post-dose.",
      });
    }
  }

  // 5. General Vaughan-Williams / Multi-Class Proarrhythmia Alerts
  if (onDesk.hasClass1a && onDesk.hasClass3) {
    alerts.push({
      tier: "critical",
      category: "VaughanWilliams",
      title: "Concurrent Class Ia + Class III IKr Potassium Channel Blockade",
      rationale: "Concomitant use of Class Ia (procainamide, quinidine, disopyramide) and Class III agents produces additive IKr repolarization delay, marked QT prolongation, and extreme risk of Torsades de Pointes.",
      actionGuidance: "Avoid dual IKr blockade regimens. Continuous cardiac telemetry and immediate access to IV magnesium / transvenous pacing required.",
    });
  }

  return {
    onDesk,
    activeDrugProfiles,
    digoxinEvaluation,
    digiFabCalculation,
    castTrialAdvisories,
    dofetilideRemsAdvisory,
    alerts,
    disclaimer: `${ANTIARRHYTHMIC_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`,
    citations: ANTIARRHYTHMIC_CITATIONS,
  };
}
