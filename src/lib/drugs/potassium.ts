/**
 * Hyperkalemia, Potassium Homeostasis & Cardioprotective Shifting Station.
 *
 * Educational clinical pharmacology reference synthesizing:
 * 1. Electrophysiological Membrane Progression & Arrhythmia Dynamics:
 *    - Resting membrane potential depolarization via Nernst equation: Em = -61.5 * log10([K+]in / [K+]out).
 *    - EKG Progression: Peaked symmetric T waves (5.5-6.5) -> PR prolongation & P wave loss (6.5-7.5)
 *      -> QRS widening & conduction blocks (7.0-8.0) -> Sine wave pattern, VF, PEA, asystole (> 8.0).
 *    - Critical EKG Dissociation Trap: ~50% of patients with K >= 6.5 mEq/L lack classic EKG findings
 *      prior to sudden lethal decompensation. Normal EKG must never delay treatment of severe hyperkalemia.
 * 2. Active Perpetrator Mapping by Nephron Site & Endocrine Axis:
 *    - RAAS Inhibitors (ACEi, ARB, ARNI): Block angiotensin II & adrenal aldosterone release.
 *    - Mineralocorticoid Receptor Antagonists (MRAs): Spironolactone, Eplerenone, Finerenone.
 *    - ENaC Luminal Blockers: Triamterene, Amiloride, and Trimethoprim (in TMP-SMX / Bactrim).
 *    - Calcineurin Inhibitors: Tacrolimus, Cyclosporine (downregulate ROMK & Na+/K+-ATPase).
 *    - Prostaglandin Blockers (NSAIDs): Blunt renin-aldosterone axis & renal blood flow.
 *    - Heparins: Inhibit aldosterone synthase in adrenal zona glomerulosa.
 *    - Beta-blockers: Blunt beta-2 mediated intracellular potassium uptake.
 *    - Digitalis (Digoxin): Direct Na+/K+-ATPase inhibition.
 *    - Exogenous Loads: Potassium supplements (KCl), salt substitutes (LoSalt/NoSalt), high-K foods.
 * 3. 3-Step Acute Treatment Nomogram:
 *    - Step 1: Myocardial Membrane Stabilization (Calcium gluconate 1-2 g IV; Calcium chloride 1 g IV).
 *    - Step 2: Intracellular Shifting (Regular Insulin 5-10 units IV + D50W 25-50 g; Albuterol 10-20 mg nebulized;
 *              Sodium Bicarbonate 50-100 mEq IV only if severe metabolic acidosis pH < 7.20).
 *    - Step 3: Total Body Potassium Elimination (Loop diuretics; Modern GI binders: Lokelma [SZC] vs
 *              Veltassa [Patiromer] vs SPS [Kayexalate with colonic necrosis alert]; Emergent Hemodialysis).
 *
 * Strictly non-prescriptive educational reference. Not an FDA-cleared clinical decision
 * support tool, not an order set, and not a dosing directive. The FDA-approved Prescribing
 * Information, institutional emergency protocols, and attending clinician govern.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { PI_FOOTER, NOT_CLEARED } from "../regulatory";

export type PotassiumSeverityTier = "normal" | "mild" | "moderate" | "severe-emergency";

export type EcgFinding =
  | "normal"
  | "peaked-t"
  | "pr-prolongation"
  | "p-loss"
  | "qrs-widening"
  | "sine-wave"
  | "none-documented";

export type UrineOutputStatus = "normal" | "oliguric" | "anuric";

export interface PotassiumPerpetrator {
  drugId: string;
  name: string;
  category:
    | "raas-inhibitor"
    | "mra"
    | "enac-blocker"
    | "calcineurin-inhibitor"
    | "nsaid"
    | "heparin"
    | "beta-blocker"
    | "digoxin"
    | "potassium-load";
  potency: "high" | "moderate" | "low";
  mechanism: string;
  nephronSite: string;
  recommendedHoldAction: string;
}

export interface MembraneStabilizationStep {
  indicated: boolean;
  rationale: string;
  primaryAgent: {
    name: string;
    dose: string;
    infusionTime: string;
    onset: string;
    duration: string;
    repeatInterval: string;
    routePreference: string;
    elementalCalciumMeq: number;
  };
  alternativeAgent: {
    name: string;
    dose: string;
    infusionTime: string;
    routePreference: string;
    elementalCalciumMeq: number;
    specialAlert: string;
  };
  digoxinPrecaution: string;
}

export interface IntracellularShiftingStep {
  indicated: boolean;
  insulinDoseUnits: number;
  insulinAdjustmentReason: string;
  dextroseRequirement: {
    doseGrams: number;
    volumeD50wMl: number;
    administer: boolean;
    reason: string;
  };
  glucoseMonitoringCadence: string;
  albuterolDosing: {
    doseMg: number;
    administration: string;
    asthmaComparison: string;
    onsetAndDuration: string;
    caution: string;
  };
  sodiumBicarbonateGuidance: {
    indicated: boolean;
    dose: string;
    acidosisRequirement: string;
    ineffectiveWarning: string;
  };
}

export interface EliminationStep {
  loopDiuretic: {
    candidate: boolean;
    agentName: string;
    recommendedDose: string;
    feasibilityNote: string;
  };
  giBinders: {
    szcLokelma: {
      name: string;
      dose: string;
      maintenanceDose: string;
      onset: string;
      sodiumLoadWarning: string;
      clinicalNiche: string;
    };
    patiromerVeltassa: {
      name: string;
      dose: string;
      onset: string;
      drugSeparationWindow: string;
      clinicalNiche: string;
    };
    spsKayexalate: {
      name: string;
      dose: string;
      onset: string;
      boxedWarningBowelNecrosis: string;
      recommendation: string;
    };
  };
  hemodialysis: {
    emergentIndicated: boolean;
    clearanceRateMeqPerHour: string;
    triggersPresent: string[];
    summary: string;
  };
}

export interface PotassiumEvaluation {
  potassiumMeqL: number;
  egfrMlMin: number;
  ecgFinding: EcgFinding;
  urineOutput: UrineOutputStatus;
  baselineGlucoseMgDl: number;
  severityTier: PotassiumSeverityTier;
  headline: string;
  ecgInterpretation: string;
  dissociationTrapAlert: string;
  perpetrators: PotassiumPerpetrator[];
  activeBindersOnRegimen: string[];
  membraneStabilization: MembraneStabilizationStep;
  intracellularShifting: IntracellularShiftingStep;
  elimination: EliminationStep;
  immediateActions: string[];
  clinicalPearls: string[];
  disclaimer: string;
}

// —— PERPETRATOR CATALOG DEFINITIONS ——————————————————————————

export const RAAS_IDS = new Set([
  "lisinopril",
  "enalapril",
  "ramipril",
  "benazepril",
  "captopril",
  "quinapril",
  "fosinopril",
  "losartan",
  "valsartan",
  "candesartan",
  "irbesartan",
  "olmesartan",
  "telmisartan",
  "sacubitril-valsartan",
  "aliskiren",
]);

export const MRA_IDS = new Set([
  "spironolactone",
  "spironolactone-hctz",
  "spironolactone-derm",
  "eplerenone",
  "finerenone",
]);

export const ENAC_IDS = new Set([
  "triamterene",
  "hydrochlorothiazide-triamterene",
  "amiloride",
  "tmp-smx", // Trimethoprim acts like amiloride blocking luminal ENaC channels
]);

export const CNI_IDS = new Set([
  "tacrolimus",
  "cyclosporine",
]);

export const NSAID_IDS = new Set([
  "ibuprofen",
  "naproxen",
  "meloxicam",
  "celecoxib",
  "indomethacin",
  "ketorolac",
  "diclofenac",
  "nabumetone",
  "piroxicam",
  "sulindac",
  "etodolac",
]);

export const HEPARIN_IDS = new Set([
  "heparin",
  "enoxaparin",
  "dalteparin",
]);

export const BETA_BLOCKER_IDS = new Set([
  "propranolol",
  "metoprolol",
  "carvedilol",
  "labetalol",
  "atenolol",
  "bisoprolol",
  "nadolol",
  "nebivolol",
]);

export const K_LOAD_IDS = new Set([
  "potassium",
  "high-k-foods",
]);

export const BINDER_IDS = new Set([
  "sodium-zirconium-cyclosilicate",
  "patiromer",
  "sodium-polystyrene-sulfonate",
]);

export const SHIFT_AGENT_IDS = new Set([
  "insulin-regular",
  "albuterol",
  "calcium-gluconate",
  "calcium-gluconate-iv",
  "sodium-bicarbonate",
  "sodium-bicarbonate-iv",
]);

/**
 * Quick detector for potassium-relevant agents on the active desk tray.
 */
export function potassiumOnDesk(ids: string[]): {
  hasPerpetrator: boolean;
  hasRaas: boolean;
  hasMra: boolean;
  hasEnac: boolean;
  hasCni: boolean;
  hasNsaid: boolean;
  hasBactrim: boolean;
  hasSupplement: boolean;
  hasBinder: boolean;
  hasShiftAgent: boolean;
  perpetratorCount: number;
} {
  let hasRaas = false;
  let hasMra = false;
  let hasEnac = false;
  let hasCni = false;
  let hasNsaid = false;
  let hasBactrim = false;
  let hasSupplement = false;
  let hasBinder = false;
  let hasShiftAgent = false;
  let perpetratorCount = 0;

  for (const id of ids) {
    if (RAAS_IDS.has(id)) {
      hasRaas = true;
      perpetratorCount++;
    }
    if (MRA_IDS.has(id)) {
      hasMra = true;
      perpetratorCount++;
    }
    if (ENAC_IDS.has(id)) {
      hasEnac = true;
      perpetratorCount++;
      if (id === "tmp-smx") hasBactrim = true;
    }
    if (CNI_IDS.has(id)) {
      hasCni = true;
      perpetratorCount++;
    }
    if (NSAID_IDS.has(id)) {
      hasNsaid = true;
      perpetratorCount++;
    }
    if (HEPARIN_IDS.has(id)) {
      perpetratorCount++;
    }
    if (BETA_BLOCKER_IDS.has(id)) {
      perpetratorCount++;
    }
    if (id === "digoxin") {
      perpetratorCount++;
    }
    if (K_LOAD_IDS.has(id)) {
      hasSupplement = true;
      perpetratorCount++;
    }
    if (BINDER_IDS.has(id)) {
      hasBinder = true;
    }
    if (SHIFT_AGENT_IDS.has(id)) {
      hasShiftAgent = true;
    }
  }

  return {
    hasPerpetrator: perpetratorCount > 0,
    hasRaas,
    hasMra,
    hasEnac,
    hasCni,
    hasNsaid,
    hasBactrim,
    hasSupplement,
    hasBinder,
    hasShiftAgent,
    perpetratorCount,
  };
}

/**
 * Scans regimen IDs and constructs structured perpetrator descriptors.
 */
export function identifyPerpetrators(ids: string[]): PotassiumPerpetrator[] {
  const result: PotassiumPerpetrator[] = [];

  for (const id of ids) {
    const drug = DRUG_BY_ID[id];
    const name = drug?.name ?? id;

    if (MRA_IDS.has(id)) {
      result.push({
        drugId: id,
        name,
        category: "mra",
        potency: "high",
        mechanism: "Competitive antagonism of aldosterone receptor in cortical collecting duct (CCD) principal cells blunts ROMK potassium excretion.",
        nephronSite: "Late distal tubule & cortical collecting duct principal cells",
        recommendedHoldAction: "Hold immediately. Do not resume until K+ < 5.0 mEq/L and renal function stabilizes.",
      });
    } else if (id === "tmp-smx") {
      result.push({
        drugId: id,
        name,
        category: "enac-blocker",
        potency: "high",
        mechanism: "Trimethoprim is structurally homologous to amiloride and directly blocks luminal Epithelial Sodium Channels (ENaC), dissipating the transepithelial lumen-negative potential required for K+ excretion.",
        nephronSite: "Cortical collecting duct luminal ENaC channels",
        recommendedHoldAction: "Review indication. If treating uncomplicated UTI or cellulitis, switch to non-ENaC alternative (e.g., nitrofurantoin, beta-lactam). If high-dose PJP therapy, monitor K+ q12-24h.",
      });
    } else if (ENAC_IDS.has(id)) {
      result.push({
        drugId: id,
        name,
        category: "enac-blocker",
        potency: "high",
        mechanism: "Direct blockade of luminal ENaC channels stops sodium reabsorption and abolishes lumen-negative electrochemical gradient driving potassium secretion.",
        nephronSite: "Cortical collecting duct luminal ENaC channels",
        recommendedHoldAction: "Discontinue immediately. Extreme synergy with ACEi/ARBs and salt substitutes.",
      });
    } else if (RAAS_IDS.has(id)) {
      const isArni = id === "sacubitril-valsartan";
      result.push({
        drugId: id,
        name,
        category: "raas-inhibitor",
        potency: "high",
        mechanism: isArni
          ? "Neprilysin inhibition plus AT1 receptor antagonism suppresses downstream adrenal aldosterone secretion, reducing principal cell potassium excretion."
          : "Blunts angiotensin II generation / AT1 signaling, reducing adrenal zona glomerulosa aldosterone production and distal nephron potassium secretion.",
        nephronSite: "Renal glomerulus (efferent arteriole) and adrenal zona glomerulosa",
        recommendedHoldAction: "Hold during acute hyperkalemia. Re-evaluate dose or consider potassium binder co-therapy (Lokelma/Patiromer) once stabilized to preserve cardiorenal GDMT.",
      });
    } else if (CNI_IDS.has(id)) {
      result.push({
        drugId: id,
        name,
        category: "calcineurin-inhibitor",
        potency: "moderate",
        mechanism: "Inhibits tubular Na+/K+-ATPase, downregulates ROMK channels, and induces hyporeninemic hypoaldosteronism with impaired distal nephron sodium delivery.",
        nephronSite: "Tubular basolateral membrane & cortical collecting duct",
        recommendedHoldAction: "Do not stop abruptly in solid organ transplant recipients without consulting transplant team; check trough concentration and treat hyperkalemia medically.",
      });
    } else if (NSAID_IDS.has(id)) {
      result.push({
        drugId: id,
        name,
        category: "nsaid",
        potency: "moderate",
        mechanism: "Inhibits renal vasodilatory prostaglandins (PGE2, PGI2), causing afferent arteriolar constriction, decreased GFR, and hyporeninemic hypoaldosteronism.",
        nephronSite: "Afferent arteriole and juxtaglomerular apparatus",
        recommendedHoldAction: "Discontinue immediately. Avoid co-administration with ACEi/ARBs or diuretics (the dangerous 'triple whammy' acute kidney injury triad).",
      });
    } else if (HEPARIN_IDS.has(id)) {
      result.push({
        drugId: id,
        name,
        category: "heparin",
        potency: "low",
        mechanism: "Direct toxic effect on adrenal zona glomerulosa cells, reducing aldosterone synthase activity within 3-5 days of initiation.",
        nephronSite: "Adrenal zona glomerulosa",
        recommendedHoldAction: "Monitor K+ if therapy exceeds 3-5 days, especially in CKD, diabetes, or when combined with RAAS inhibitors.",
      });
    } else if (BETA_BLOCKER_IDS.has(id)) {
      result.push({
        drugId: id,
        name,
        category: "beta-blocker",
        potency: "low",
        mechanism: "Blunts beta-2 receptor mediated stimulation of Na+/K+-ATPase in skeletal muscle, impairing physiologic cellular uptake of potassium after oral loads.",
        nephronSite: "Peripheral extrarenal skeletal muscle & juxtaglomerular apparatus",
        recommendedHoldAction: "Usually maintained in heart failure/CAD unless severe cardiogenic collapse or severe bradyarrhythmia occurs.",
      });
    } else if (id === "digoxin") {
      result.push({
        drugId: id,
        name,
        category: "digoxin",
        potency: "moderate",
        mechanism: "Inhibits myocardial and systemic Na+/K+-ATPase pumps. Severe acute toxicity causes massive extracellular potassium efflux (hyperkalemia correlates with mortality).",
        nephronSite: "Systemic cell membranes (Na+/K+-ATPase pump)",
        recommendedHoldAction: "Check digoxin level and EKG. In acute toxicity with severe hyperkalemia (> 5.0-5.5 mEq/L), administer DigiFab (digoxin immune Fab); avoid rapid IV calcium pushes.",
      });
    } else if (K_LOAD_IDS.has(id)) {
      result.push({
        drugId: id,
        name,
        category: "potassium-load",
        potency: "high",
        mechanism: "Direct exogenous potassium administration (oral supplements, IV fluids, or high-potassium salt substitutes like KCl).",
        nephronSite: "Exogenous gastrointestinal / parenteral intake",
        recommendedHoldAction: "Stop all potassium supplements immediately. Audit diet for potassium-chloride salt substitutes (LoSalt/NoSalt), coconut water, and high-potassium foods.",
      });
    }
  }

  return result;
}

/**
 * Core clinical hyperkalemia evaluator synthesizing lab values, EKG findings,
 * renal metrics, baseline glycemic control, and active regimen.
 */
export function evaluatePotassium({
  potassiumMeqL,
  egfrMlMin = 60,
  ecgFinding = "none-documented",
  urineOutput = "normal",
  baselineGlucoseMgDl = 140,
  regimenIds = [],
}: {
  potassiumMeqL: number;
  egfrMlMin?: number;
  ecgFinding?: EcgFinding;
  urineOutput?: UrineOutputStatus;
  baselineGlucoseMgDl?: number;
  regimenIds?: string[];
}): PotassiumEvaluation {
  // Stratify Severity Tier
  const hasMalignantEcg =
    ecgFinding === "peaked-t" ||
    ecgFinding === "pr-prolongation" ||
    ecgFinding === "p-loss" ||
    ecgFinding === "qrs-widening" ||
    ecgFinding === "sine-wave";

  let severityTier: PotassiumSeverityTier = "normal";
  if (potassiumMeqL >= 6.5 || hasMalignantEcg) {
    severityTier = "severe-emergency";
  } else if (potassiumMeqL >= 6.0) {
    severityTier = "moderate";
  } else if (potassiumMeqL >= 5.1) {
    severityTier = "mild";
  } else {
    severityTier = "normal";
  }

  // EKG Interpretation & Progression Description
  let ecgInterpretation = "";
  switch (ecgFinding) {
    case "peaked-t":
      ecgInterpretation =
        "Tall, narrow, symmetric, 'tented' T waves with narrow base. Earliest repolarization abnormality (Phase 3 acceleration via IKr potassium channels). High specificity for hyperkalemic cardiotoxicity.";
      break;
    case "pr-prolongation":
      ecgInterpretation =
        "PR interval prolongation (> 200 ms). Indicates delayed atrial conduction and atrioventricular nodal slowdown from partial resting membrane depolarization.";
      break;
    case "p-loss":
      ecgInterpretation =
        "Flattening and loss of P waves. Indicates sinoatrial standstill with sinoventricular conduction directly from SA node to AV node via specialized internodal tracts.";
      break;
    case "qrs-widening":
      ecgInterpretation =
        "Marked intraventricular conduction delay with QRS widening (> 120 ms) and bundle branch block morphology. Fast voltage-gated Na+ channels (INa) are severely inactivated.";
      break;
    case "sine-wave":
      ecgInterpretation =
        "Sine wave pattern: terminal merging of widened QRS complex into broadened T wave. Imminent pre-arrest state; ventricular fibrillation or asystole is immediately imminent.";
      break;
    case "normal":
      ecgInterpretation =
        "Normal sinus rhythm without overt hyperkalemic repolarization or conduction abnormalities. Warning: does NOT exclude impending life-threatening arrhythmia if K+ >= 6.5 mEq/L.";
      break;
    case "none-documented":
    default:
      ecgInterpretation =
        "12-lead EKG not documented. Immediate stat 12-lead EKG and continuous telemetry required whenever potassium exceeds 5.5 mEq/L.";
      break;
  }

  // Critical EKG Dissociation Alert
  const dissociationTrapAlert =
    potassiumMeqL >= 6.0 && (ecgFinding === "normal" || ecgFinding === "none-documented")
      ? "CRITICAL EKG DISSOCIATION TRAP: Up to 46-52% of patients with severe hyperkalemia (K >= 6.5 mEq/L) demonstrate a normal EKG or non-specific baseline changes prior to sudden malignant ventricular collapse. A normal EKG should NEVER delay emergency membrane stabilization or shifting therapy when K >= 6.5 mEq/L."
      : "Remember: hyperkalemic EKG abnormalities can progress unpredictably without following clean linear textbook stages, especially in patients with baseline conduction disease or concomitant ischemia.";

  // Step 1: Membrane Stabilization
  const needsMembraneStabilization = severityTier === "severe-emergency" || hasMalignantEcg || potassiumMeqL >= 6.5;
  const membraneStabilization: MembraneStabilizationStep = {
    indicated: needsMembraneStabilization,
    rationale: needsMembraneStabilization
      ? "Immediate myocardial membrane stabilization required to restore normal cardiac resting membrane threshold potential and prevent fatal ventricular arrhythmias. DOES NOT lower serum potassium."
      : "Not acutely indicated at current potassium and EKG baseline. Keep calcium available if K+ rises >= 6.5 or conduction defects emerge.",
    primaryAgent: {
      name: "Calcium Gluconate 10%",
      dose: "1 to 2 g (10 to 20 mL of 10% solution)",
      infusionTime: "IV push over 2 to 5 minutes with continuous cardiac telemetry",
      onset: "1 to 3 minutes",
      duration: "30 to 60 minutes (transient membrane effect)",
      repeatInterval: "Repeat in 5 to 10 minutes if EKG abnormalities persist or recur",
      routePreference: "Preferred for peripheral IV access (lower extravasation and tissue necrosis hazard)",
      elementalCalciumMeq: 4.65, // ~4.65 mEq elemental Ca per 1 g (10 mL)
    },
    alternativeAgent: {
      name: "Calcium Chloride 10%",
      dose: "1 g (10 mL of 10% solution) IV over 2 to 5 minutes",
      infusionTime: "2 to 5 minutes (rapid push in cardiac arrest)",
      routePreference: "Central venous access strongly preferred",
      elementalCalciumMeq: 13.6, // ~13.6 mEq elemental Ca per 1 g (10 mL) — 3x more potent
      specialAlert: "Severe tissue necrosis and skin sloughing if extravasated into peripheral tissues. Reserve for central line access, cardiac arrest, or profound shock.",
    },
    digoxinPrecaution: regimenIds.includes("digoxin")
      ? "DIGOXIN ALERT: Concomitant digoxin presence. Historical 'stone heart' dogma with rapid calcium has been re-evaluated, but caution is warranted: infuse calcium gluconate slowly over 20-30 minutes and prioritize urgent DigiFab (digoxin immune Fab) administration if digoxin toxicity is suspected."
      : "No active digoxin on regimen. Standard IV calcium push dosing applies.",
  };

  // Step 2: Intracellular Shifting
  const needsShifting = severityTier === "severe-emergency" || severityTier === "moderate";
  
  // Renal or glycemic insulin dose tailoring:
  // Patients with eGFR < 30 mL/min or baseline BG < 150 mg/dL have markedly increased risk of severe hypoglycemia.
  // Many modern critical care protocols recommend 5 units regular insulin instead of 10 units in CKD/ESRD.
  const isCkdOrHypoProne = egfrMlMin < 30 || baselineGlucoseMgDl < 140;
  const insulinDoseUnits = isCkdOrHypoProne ? 5 : 10;
  const insulinAdjustmentReason = isCkdOrHypoProne
    ? `Adjusted to ${insulinDoseUnits} units IV (reduced from standard 10 units) due to reduced renal clearance of insulin (eGFR ${egfrMlMin} mL/min) and/or baseline glucose (${baselineGlucoseMgDl} mg/dL) to protect against severe refractory hypoglycemia.`
    : "Standard 10 units IV push. Drives potassium into skeletal muscle and hepatic cells via Na+/K+-ATPase stimulation within 15-30 minutes.";

  const shouldAdministerDextrose = baselineGlucoseMgDl < 250;
  const intracellularShifting: IntracellularShiftingStep = {
    indicated: needsShifting,
    insulinDoseUnits,
    insulinAdjustmentReason,
    dextroseRequirement: {
      doseGrams: shouldAdministerDextrose ? 25 : 0,
      volumeD50wMl: shouldAdministerDextrose ? 50 : 0,
      administer: shouldAdministerDextrose,
      reason: shouldAdministerDextrose
        ? "Dextrose 50% (D50W) 25 g (50 mL IV) co-administered simultaneously with insulin to prevent severe hypoglycemia. Consider repeating 25 g at 60 minutes or hanging 10% dextrose (D10W) infusion at 50-75 mL/hr."
        : `Baseline blood glucose is elevated (${baselineGlucoseMgDl} mg/dL >= 250 mg/dL). Bolus dextrose may be deferred, but frequent point-of-care glucose monitoring remains mandatory.`,
    },
    glucoseMonitoringCadence: "Point-of-care capillary blood glucose hourly for at least 4 to 6 hours. Hypoglycemia nadir typically occurs between 60 to 180 minutes post-insulin injection.",
    albuterolDosing: {
      doseMg: 10,
      administration: "10 to 20 mg nebulized over 10 to 15 minutes",
      asthmaComparison: "4x to 8x higher than standard asthma bronchodilator dose (standard asthma neb is 2.5 mg). Requires multiple unit-dose vials or continuous nebulization.",
      onsetAndDuration: "Onset ~30 min, peak 60-90 min, duration 2-4 hours. Produces additive 0.5 to 1.0 mEq/L serum potassium reduction when combined with insulin.",
      caution: "Caution in severe tachyarrhythmias, active coronary ischemia, or heart rate > 120 bpm. Note: ~20% of ESRD patients are non-responders due to beta-2 adrenergic desensitization.",
    },
    sodiumBicarbonateGuidance: {
      indicated: false, // Default: only for documented severe metabolic acidosis
      dose: "Sodium Bicarbonate 8.4% (50 mEq / 50 mL IV over 5 minutes) or isotonic infusion (150 mEq in 1 L D5W)",
      acidosisRequirement: "ONLY indicated if concurrent severe metabolic acidosis is documented (pH < 7.20 or serum bicarbonate < 15 mEq/L).",
      ineffectiveWarning: "Bolus sodium bicarbonate in non-acidemic hyperkalemic patients is INEFFECTIVE for acute potassium lowering and risks hypernatremia, acute volume overload, and hypocalcemic tetany.",
    },
  };

  // Step 3: Potassium Elimination
  const loopCandidate = urineOutput === "normal" && egfrMlMin >= 15;
  const loopDose = egfrMlMin < 30 ? "Furosemide 80 to 120 mg IV" : "Furosemide 40 to 80 mg IV";
  
  const hdTriggers: string[] = [];
  if (potassiumMeqL >= 6.5) hdTriggers.push(`Severe refractory hyperkalemia (${potassiumMeqL} mEq/L)`);
  if (urineOutput === "anuric" || urineOutput === "oliguric") hdTriggers.push(`Impaired renal clearance (${urineOutput} urine output)`);
  if (egfrMlMin < 15) hdTriggers.push(`End-stage renal disease / severe AKI (eGFR ${egfrMlMin} mL/min)`);
  if (hasMalignantEcg) hdTriggers.push(`Malignant cardiac conduction defects (${ecgFinding})`);

  const elimination: EliminationStep = {
    loopDiuretic: {
      candidate: loopCandidate,
      agentName: "Furosemide IV (or Bumetanide / Torsemide)",
      recommendedDose: loopCandidate ? loopDose : "Not recommended (ineffective in anuria/severe ESRD)",
      feasibilityNote: loopCandidate
        ? `Patient has preserved urine output (${urineOutput}) and residual GFR (${egfrMlMin} mL/min). Loop diuretic blocks Na+/K+/2Cl- symporter in thick ascending limb, enhancing distal tubular delivery and flow rate to drive potassium excretion.`
        : `Patient is ${urineOutput} with eGFR ${egfrMlMin} mL/min. Loop diuretics have negligible efficacy in anuria and risk ototoxicity with high doses. Prioritize emergent hemodialysis.`,
    },
    giBinders: {
      szcLokelma: {
        name: "Sodium Zirconium Cyclosilicate (SZC / Lokelma)",
        dose: "10 g PO TID with meals for up to 48 hours",
        maintenanceDose: "5 to 10 g PO once daily once potassium normalizes",
        onset: "~1 hour (median time to normal potassium ~2.2 hours)",
        sodiumLoadWarning: "Each 5 g dose contains ~400 mg sodium. Monitor for peripheral edema in severe decompensated heart failure or oliguric renal failure.",
        clinicalNiche: "Agent of choice for acute emergency GI binding due to rapid 1-hour onset and high selectivity for potassium over calcium/magnesium throughout GI tract.",
      },
      patiromerVeltassa: {
        name: "Patiromer (Veltassa)",
        dose: "8.4 g PO once daily with food (titrate up to 25.2 g daily)",
        onset: "4 to 7 hours (subacute / chronic outpatient use)",
        drugSeparationWindow: "CRITICAL: Non-selectively binds other oral drugs. Separate all other oral medications by at least 3 hours before or 3 hours after patiromer.",
        clinicalNiche: "Ideal for chronic outpatient hyperkalemia management to enable RAAS inhibitor / MRA continuation in heart failure and CKD. NOT suitable for solitary emergency resuscitation due to delayed 4-7h onset.",
      },
      spsKayexalate: {
        name: "Sodium Polystyrene Sulfonate (SPS / Kayexalate)",
        dose: "15 to 60 g PO or retention enema",
        onset: "2 to 24 hours (unpredictable)",
        boxedWarningBowelNecrosis: "FDA WARNING: Risk of intestinal necrosis, ischemic colitis, and colonic perforation, especially when co-administered with sorbitol. Avoid in postoperative patients, ileus, bowel obstruction, or severe constipation.",
        recommendation: "Modern consensus discourages SPS in acute care when Lokelma or Patiromer is available.",
      },
    },
    hemodialysis: {
      emergentIndicated: hdTriggers.length >= 2 || (potassiumMeqL >= 6.5 && urineOutput === "anuric"),
      clearanceRateMeqPerHour: "25 to 50 mEq K+ removed per hour on low-potassium dialysate bath (1-2 mEq/L)",
      triggersPresent: hdTriggers,
      summary: hdTriggers.length >= 2 || (potassiumMeqL >= 6.5 && urineOutput === "anuric")
        ? "EMERGENT HEMODIALYSIS INDICATED: Definitive potassium elimination required. Prepare emergent vascular access, nephrology consultation, and dialyzer priming."
        : "Hemodialysis reserve: medical therapy currently viable, but keep dialysis alert active if refractory or renal function deteriorates.",
    },
  };

  // Perpetrators & Active Binders
  const perpetrators = identifyPerpetrators(regimenIds);
  const activeBindersOnRegimen = regimenIds
    .filter((id) => BINDER_IDS.has(id))
    .map((id) => DRUG_BY_ID[id]?.name ?? id);

  // Immediate Action Items
  const immediateActions: string[] = [];
  if (needsMembraneStabilization) {
    immediateActions.push("STAT: Administer Calcium Gluconate 1-2 g IV push over 2-5 min under continuous telemetry.");
  }
  if (needsShifting) {
    immediateActions.push(`SHIFT: Regular Insulin ${insulinDoseUnits} units IV + D50W ${shouldAdministerDextrose ? "25 g (50 mL)" : "omitted (BG >= 250)"} IV push.`);
    immediateActions.push("SHIFT: Albuterol 10-20 mg nebulized over 10-15 minutes (additive K+ reduction).");
    immediateActions.push("MONITOR: Point-of-care blood glucose q1h x 4-6 hours (prevent hypoglycemia nadir).");
  }
  if (elimination.hemodialysis.emergentIndicated) {
    immediateActions.push("ELIMINATE: Stat Nephrology consult for emergent hemodialysis.");
  } else if (loopCandidate) {
    immediateActions.push(`ELIMINATE: ${loopDose} to drive kaliuresis.`);
  }
  immediateActions.push("BIND: Initiate Sodium Zirconium Cyclosilicate (Lokelma) 10 g PO TID for rapid gastrointestinal K+ capture.");

  if (perpetrators.length > 0) {
    const names = perpetrators.map((p) => p.name).join(", ");
    immediateActions.push(`HOLD OFFENDING AGENTS: Immediately hold ${names}.`);
  }
  immediateActions.push("RECHECK: Stat potassium re-draw in 1 to 2 hours to confirm downward trajectory.");

  // Clinical Pearls
  const clinicalPearls = [
    "Membrane stabilization with IV calcium does not lower potassium by a single milliequivalent — it only temporarily buys 30-60 minutes by shifting the threshold cardiac action potential away from resting potential.",
    "Up to 50% of patients with severe hyperkalemia have a completely normal or non-diagnostic EKG right up until sudden cardiac arrest (the classic EKG Dissociation Trap).",
    "In patients with CKD (eGFR < 30 mL/min), reduce shifting regular insulin from 10 units to 5 units IV to protect against devastating, prolonged hypoglycemia.",
    "Standard asthma albuterol (2.5 mg) is insufficient for hyperkalemia shifting; 10 to 20 mg (4x to 8x the bronchodilator dose) is required to stimulate beta-2 Na+/K+-ATPase translocation.",
    "Bactrim (TMP-SMX) is a stealth ENaC blocker: trimethoprim acts like amiloride in the cortical collecting duct, routinely causing unexplained inpatient hyperkalemia.",
    "Lokelma (SZC) binds potassium within 1 hour throughout the entire GI tract, while Patiromer requires 4-7 hours and is designed for outpatient chronic GDMT enablement.",
    "SPS (Kayexalate) carries an FDA boxed warning for colonic necrosis and intestinal perforation, especially with sorbitol, and is no longer preferred in acute resuscitation.",
  ];

  let headline = "";
  if (severityTier === "severe-emergency") {
    headline = `CRITICAL HYPERKALEMIA (${potassiumMeqL.toFixed(1)} mEq/L) — Immediate 3-Step Resuscitation Required`;
  } else if (severityTier === "moderate") {
    headline = `MODERATE HYPERKALEMIA (${potassiumMeqL.toFixed(1)} mEq/L) — Active Shifting & Elimination Warranted`;
  } else if (severityTier === "mild") {
    headline = `MILD HYPERKALEMIA (${potassiumMeqL.toFixed(1)} mEq/L) — Outpatient / Subacute Management & Drug Hold`;
  } else {
    headline = `EU-KALEMIC BASELINE (${potassiumMeqL.toFixed(1)} mEq/L) — Homeostasis Stable`;
  }

  return {
    potassiumMeqL,
    egfrMlMin,
    ecgFinding,
    urineOutput,
    baselineGlucoseMgDl,
    severityTier,
    headline,
    ecgInterpretation,
    dissociationTrapAlert,
    perpetrators,
    activeBindersOnRegimen,
    membraneStabilization,
    intracellularShifting,
    elimination,
    immediateActions,
    clinicalPearls,
    disclaimer: `${NOT_CLEARED} Educational reference synthesizing emergency hyperkalemia shifting and pharmacology. ${PI_FOOTER}`,
  };
}

/**
 * Report generator from current desk IDs and host context.
 */
export function potassiumReportOnDesk(ids: string[], host?: HostContext): PotassiumEvaluation {
  const onDesk = potassiumOnDesk(ids);
  
  // Default potassium estimation based on perpetrators on desk:
  // If multiple perpetrators present, simulate a clinically relevant elevated baseline for teaching.
  let defaultK = 4.5;
  if (onDesk.perpetratorCount >= 3) {
    defaultK = 6.6;
  } else if (onDesk.perpetratorCount >= 2) {
    defaultK = 6.1;
  } else if (onDesk.perpetratorCount === 1) {
    defaultK = 5.4;
  }

  const defaultEcg: EcgFinding = defaultK >= 6.5 ? "peaked-t" : defaultK >= 6.0 ? "peaked-t" : "normal";
  const defaultEgfr = host?.kidney === "ckd" ? 28 : 75;
  const defaultUrine: UrineOutputStatus = host?.kidney === "ckd" ? "oliguric" : "normal";

  return evaluatePotassium({
    potassiumMeqL: defaultK,
    egfrMlMin: defaultEgfr,
    ecgFinding: defaultEcg,
    urineOutput: defaultUrine,
    baselineGlucoseMgDl: 140,
    regimenIds: ids,
  });
}

