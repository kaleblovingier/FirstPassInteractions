/**
 * Phenytoin & Fosphenytoin Clinical Pharmacokinetics, Nonlinear Saturation Dynamics,
 * and Protein-Binding Displacement Station.
 *
 * Educational clinical pharmacology and pharmacokinetics reference synthesizing:
 * 1. Nonlinear Michaelis-Menten Saturation Kinetics:
 *    - Mathematical model: Daily Dose R (mg/day) = (Vmax * Css) / (Km + Css), where:
 *        Vmax = maximum rate of metabolism (typical adult mean ~ 7 mg/kg/day, range 5–10 mg/kg/day)
 *        Km   = Michaelis constant (typical adult mean ~ 4.0 mg/L, range 2–8 mg/L)
 *    - Clearance equation: CL = Vmax / (Km + C). As concentration C increases, clearance decreases dramatically!
 *    - Educational clinical consequence:
 *        At low concentrations (< 10 mg/L), kinetics approximate first-order;
 *        As concentration approaches therapeutic window (10–20 mg/L), enzymes saturate;
 *        Above 20 mg/L, kinetics become zero-order, where a tiny 10–20% dose increase (e.g. 300 mg to 360 mg)
 *        can cause a 100–300% doubling or tripling of serum level into severe toxicity (ataxia, nystagmus, lethargy, coma).
 * 2. Protein Binding & Free Phenytoin Calculations:
 *    - Normal plasma protein binding: 90% bound to albumin, 10% free / unbound fraction (fu = 0.10).
 *    - Therapeutic ranges:
 *        Total phenytoin = 10 to 20 mg/L (mcg/mL)
 *        Free / unbound phenytoin = 1.0 to 2.0 mg/L (mcg/mL)
 *    - Sheiner-Tozer / Winter-Tozer hypoalbuminemia correction:
 *        C_adj = C_observed / ((0.2 * Albumin_g_dL) + 0.1)
 *    - End-Stage Renal Disease (ESRD / CrCl < 10 mL/min / Dialysis) correction:
 *        C_adj_esrd = C_observed / ((0.1 * Albumin_g_dL) + 0.1)
 * 3. Valproate × Phenytoin Collision (The Double-Hit):
 *    - Hit 1: Valproic acid displaces phenytoin from plasma albumin binding sites (increases free fraction fu).
 *    - Hit 2: Valproic acid inhibits CYP2C9 hepatic metabolism of phenytoin.
 *    - Clinical Paradox: Total serum phenytoin level appears NORMAL or even LOW (e.g. 9 mg/L),
 *      but free phenytoin is toxic (e.g. 2.8 mg/L)! Clinician mistakenly increases dose if checking total level only.
 * 4. Critical Collisions:
 *    - Strong CYP2C9/2C19 inhibitors: Fluconazole, voriconazole, amiodarone, sulfamethoxazole-trimethoprim (Bactrim)
 *      dramatically reduce clearance and precipitate acute toxicity.
 *    - Potent hepatic inducers: Carbamazepine, phenobarbital, rifampin increase Vmax.
 *    - Enteral tube feeding binding: Phenytoin binds to proteins in tube feeds, reducing bioavailability by 50–70%
 *      (requires holding feeds 1–2h before and after).
 * 5. Fosphenytoin Prodrug Kinetics & Infusion Safety:
 *    - Water-soluble phosphate ester prodrug (Cerebyx) dosed in Phenytoin Sodium Equivalents (PE).
 *    - 1.5 mg fosphenytoin sodium = 1.0 mg phenytoin sodium PE.
 *    - Avoids propylene glycol vehicle, hypotension, cardiac arrhythmias, and extravasation necrosis ("Purple Glove Syndrome").
 *    - Max infusion rate: 150 mg PE/min (vs 50 mg/min for IV phenytoin sodium).
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support:
 * Educational interaction and pharmacokinetic simulation reference intended for licensed healthcare
 * professionals and supervised trainees. Not an FDA-cleared medical device, order set, or dosing directive.
 * The FDA-approved Prescribing Information and attending clinician govern all clinical decisions.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

/**
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support statutory declaration.
 */
export const PHENYTOIN_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational pharmacokinetic model is intended solely for use by licensed healthcare professionals and supervised health-professions students to analyze nonlinear Michaelis-Menten saturation kinetics, albumin binding displacement, and drug collisions. It displays underlying mathematical formulas, published population parameters, and primary literature citations so the clinician can independently review the scientific basis of all calculations. It does not provide automated diagnostic or dosing directives, does not generate medical orders or prescriptions, and does not replace individualized clinical judgment or the FDA-approved Prescribing Information.";

/** Reference population constants */
export const POPULATION_VMAX_MEAN_MG_KG_DAY = 7.0;
export const POPULATION_VMAX_RANGE_MG_KG_DAY = { min: 5.0, max: 10.0 } as const;
export const POPULATION_KM_MEAN_MG_L = 4.0;
export const POPULATION_KM_RANGE_MG_L = { min: 2.0, max: 8.0 } as const;

/** Therapeutic target ranges */
export const THERAPEUTIC_TOTAL_RANGE_MG_L = { min: 10.0, max: 20.0 } as const;
export const THERAPEUTIC_FREE_RANGE_MG_L = { min: 1.0, max: 2.0 } as const;
export const NORMAL_FREE_FRACTION = 0.10; // 10% unbound in healthy plasma

/** Salt factors */
export const SALT_FACTOR_SODIUM = 0.92; // Phenytoin sodium capsules/IV (100 mg salt = 92 mg free acid)
export const SALT_FACTOR_ACID = 1.00; // Phenytoin acid / chewable / oral suspension
export const FOSPHENOXY_CONVERSION_RATIO = 1.5; // 1.5 mg fosphenytoin sodium = 1.0 mg phenytoin sodium PE

export type PhenytoinLevelBand =
  | "subtherapeutic"
  | "therapeutic"
  | "supratherapeutic-mild"
  | "moderate-toxicity"
  | "severe-toxicity";

export interface SheinerTozerResult {
  observedTotalMcgMl: number;
  albuminGDl: number;
  isEsrd: boolean;
  adjustedTotalMcgMl: number;
  estimatedFreeMcgMl: number;
  estimatedFreeFractionPct: number;
  formulaUsed: "sheiner-tozer-standard" | "sheiner-tozer-esrd";
  formulaExpression: string;
  clinicalNote: string;
}

export interface PhenytoinLevelInput {
  totalMcgMl: number;
  albuminGDl?: number;
  measuredFreeMcgMl?: number;
  isEsrdOrDialysis?: boolean;
  hasValproate?: boolean;
}

export interface PhenytoinLevelEvaluation {
  observedTotalMcgMl: number;
  albuminGDl: number;
  isEsrdOrDialysis: boolean;
  adjustedTotalMcgMl: number;
  measuredFreeMcgMl?: number;
  estimatedFreeMcgMl: number;
  effectiveFreeMcgMl: number;
  estimatedFreeFractionPct: number;
  isMeasuredFree: boolean;
  totalBand: PhenytoinLevelBand;
  freeBand: PhenytoinLevelBand;
  clinicalSigns: string[];
  saturationRisk: "low" | "moderate" | "high" | "critical";
  hypoalbuminemiaWarning: boolean;
  valproateDoubleHitWarning: boolean;
  clinicalParadoxDetected: boolean;
  headline: string;
  clinicalInterpretation: string;
  pearl: string;
}

export interface TitrationStep {
  doseIncreasePct: number;
  newDoseMg: number;
  newCssMgL: number | null;
  cssIncreasePct: number | null;
  alert: string;
}

export interface MichaelisMentenKineticsSummary {
  vmaxMgKgDay: number;
  vmaxTotalMgDay: number;
  kmMgL: number;
  weightKg: number;
  currentConcentrationMgL: number;
  clearanceLPerDay: number;
  clearanceLPerKgPerDay: number;
  clearanceLPerHour: number;
  kineticPhase: "first-order-approximate" | "mixed-order-saturating" | "zero-order-saturated";
  dailyDoseMg?: number;
  predictedCssMgL: number | null;
  isSaturated: boolean;
  doseTitrationWarning?: string;
  titrationSimulation: TitrationStep[];
}

export interface FosphenytoinGuidance {
  prodrugName: string;
  conversionRatio: string;
  peEquivalentDoseMg: number;
  fosphenytoinDoseMg: number;
  maxInfusionRateMgPEPerMin: number;
  maxPhenytoinInfusionRateMgPerMin: number;
  purpleGloveSyndromeRisk: string;
  phComparison: string;
  imAdministrationPermitted: boolean;
  clinicalRecommendation: string;
}

export interface PhenytoinCollision {
  drugId: string;
  drugName: string;
  category:
    | "valproate-double-hit"
    | "cyp2c9-inhibition"
    | "hepatic-induction"
    | "tube-feed-binding"
    | "narrow-therapeutic-index";
  severity: "contraindicated" | "major" | "moderate";
  headline: string;
  mechanism: string;
  clinicalAction: string;
  monitoringRecommendation: string;
}

export interface PhenytoinPgxSummary {
  cyp2c9Phenotype: string;
  cyp2c19Phenotype: string;
  vmaxAdjustmentFactor: number;
  recommendedDoseAdjustmentPct: number;
  cpicRecommendation: string;
}

export interface PhenytoinReportParams {
  totalMcgMl?: number;
  albuminGDl?: number;
  measuredFreeMcgMl?: number;
  weightKg?: number;
  dailyDoseMg?: number;
  targetCssMgL?: number;
  vmaxMgKgDay?: number;
  kmMgL?: number;
  isEsrdOrDialysis?: boolean;
}

export interface PhenytoinReport {
  hasPhenytoin: boolean;
  onDesk: {
    hasPhenytoin: boolean;
    hasFosphenytoin: boolean;
    hasAnyPhenytoin: boolean;
    hasValproate: boolean;
    hasCyp2c9Inhibitors: boolean;
    hasInducers: boolean;
    hasTubeFeed: boolean;
    detectedPerpetratorIds: string[];
  };
  levelEval: PhenytoinLevelEvaluation;
  sheinerTozer: SheinerTozerResult;
  kinetics: MichaelisMentenKineticsSummary;
  fosphenytoin: FosphenytoinGuidance;
  collisions: PhenytoinCollision[];
  pgx: PhenytoinPgxSummary;
  clinicalPearls: string[];
  disclaimer: string;
}

export const PHENYTOIN_IDS = new Set(["phenytoin", "dilantin"]);
export const FOSPHENOXY_IDS = new Set(["fosphenytoin", "cerebyx"]);
export const VALPROATE_IDS = new Set(["valproate", "divalproex", "depakote", "depakene"]);
export const CYP2C9_INHIBITOR_IDS = new Set([
  "fluconazole",
  "voriconazole",
  "amiodarone",
  "tmp-smx",
  "bactrim",
  "sulfamethoxazole",
  "metronidazole",
  "miconazole",
]);
export const INDUCER_IDS = new Set([
  "carbamazepine",
  "phenobarbital",
  "rifampin",
  "primidone",
]);
export const TUBE_FEED_IDS = new Set([
  "enteral-feed",
  "enteral-nutrition",
  "tube-feed",
  "osmolite",
  "jevity",
]);

/**
 * Checks if phenytoin, fosphenytoin, or interacting perpetrators/conditions are present on the desk.
 */
export function phenytoinOnDesk(drugIds: string[]): {
  hasPhenytoin: boolean;
  hasFosphenytoin: boolean;
  hasAnyPhenytoin: boolean;
  hasValproate: boolean;
  hasCyp2c9Inhibitors: boolean;
  hasInducers: boolean;
  hasTubeFeed: boolean;
  detectedPerpetratorIds: string[];
} {
  const normalized = drugIds.map((id) => id.toLowerCase().trim());
  const hasPhenytoin = normalized.some((id) => PHENYTOIN_IDS.has(id));
  const hasFosphenytoin = normalized.some((id) => FOSPHENOXY_IDS.has(id));
  const hasAnyPhenytoin = hasPhenytoin || hasFosphenytoin;
  const hasValproate = normalized.some((id) => VALPROATE_IDS.has(id));
  const hasCyp2c9Inhibitors = normalized.some((id) => CYP2C9_INHIBITOR_IDS.has(id));
  const hasInducers = normalized.some((id) => INDUCER_IDS.has(id));
  const hasTubeFeed = normalized.some((id) => TUBE_FEED_IDS.has(id));

  const detectedPerpetratorIds = normalized.filter(
    (id) =>
      VALPROATE_IDS.has(id) ||
      CYP2C9_INHIBITOR_IDS.has(id) ||
      INDUCER_IDS.has(id) ||
      TUBE_FEED_IDS.has(id),
  );

  return {
    hasPhenytoin,
    hasFosphenytoin,
    hasAnyPhenytoin,
    hasValproate,
    hasCyp2c9Inhibitors,
    hasInducers,
    hasTubeFeed,
    detectedPerpetratorIds,
  };
}

/**
 * Calculates Michaelis-Menten daily dose rate R (mg/day) required to achieve target steady-state concentration Css:
 *
 * Daily Dose R (mg/day) = (Vmax * Css) / (Km + Css)
 *
 * @param targetCss Target steady-state concentration Css (mg/L or mcg/mL)
 * @param vmax Maximum rate of metabolism. If weightKg is provided, vmax is treated as mg/kg/day; if omitted, vmax is total mg/day.
 * @param km Michaelis constant Km (mg/L or mcg/mL)
 * @param weightKg Patient weight in kg (optional)
 */
export function calculateMichaelisMentenDose(
  targetCss: number,
  vmax: number = POPULATION_VMAX_MEAN_MG_KG_DAY,
  km: number = POPULATION_KM_MEAN_MG_L,
  weightKg?: number,
): number {
  if (targetCss <= 0 || vmax <= 0 || km <= 0) return 0;
  const vmaxTotal = weightKg !== undefined && weightKg > 0 ? vmax * weightKg : vmax;
  const dailyDose = (vmaxTotal * targetCss) / (km + targetCss);
  return Math.round(dailyDose * 10) / 10;
}

/**
 * Solves Michaelis-Menten model for predicted steady-state concentration Css given daily dose R (mg/day):
 *
 * Css = (R * Km) / (Vmax - R)
 *
 * Note on enzyme saturation:
 * If Daily Dose R >= Vmax, metabolic capacity is completely overwhelmed.
 * Elimination proceeds at fixed zero-order rate while input exceeds output, causing runaway accumulation and severe toxicity.
 */
export function calculatePredictedCss(
  dailyDoseMg: number,
  vmax: number = POPULATION_VMAX_MEAN_MG_KG_DAY,
  km: number = POPULATION_KM_MEAN_MG_L,
  weightKg?: number,
): {
  predictedCss: number | null;
  clearanceLPerDay: number | null;
  isSaturated: boolean;
  warning?: string;
} {
  if (dailyDoseMg <= 0) {
    return { predictedCss: 0, clearanceLPerDay: null, isSaturated: false };
  }
  const vmaxTotal = weightKg !== undefined && weightKg > 0 ? vmax * weightKg : vmax;

  if (dailyDoseMg >= vmaxTotal) {
    return {
      predictedCss: null,
      clearanceLPerDay: null,
      isSaturated: true,
      warning: `Daily dose (${dailyDoseMg} mg/day) meets or exceeds Vmax (${Math.round(vmaxTotal)} mg/day). Metabolic enzymes are completely saturated (zero-order kinetics). Phenytoin will accumulate continuously without reaching steady state, precipitating severe life-threatening toxicity.`,
    };
  }

  const predictedCss = (dailyDoseMg * km) / (vmaxTotal - dailyDoseMg);
  const clearanceLPerDay = vmaxTotal / (km + predictedCss);

  return {
    predictedCss: Math.round(predictedCss * 10) / 10,
    clearanceLPerDay: Math.round(clearanceLPerDay * 10) / 10,
    isSaturated: false,
  };
}

/**
 * Calculates concentration-dependent phenytoin systemic clearance CL:
 *
 * CL = Vmax / (Km + C)
 *
 * As concentration C increases, clearance decreases dramatically!
 */
export function calculatePhenytoinClearance(
  concentrationMgL: number,
  vmax: number = POPULATION_VMAX_MEAN_MG_KG_DAY,
  km: number = POPULATION_KM_MEAN_MG_L,
  weightKg?: number,
): {
  clearanceLPerDay: number;
  clearanceLPerKgPerDay: number;
  clearanceLPerHour: number;
} {
  const conc = Math.max(0.1, concentrationMgL);
  const vmaxPerKg = weightKg !== undefined && weightKg > 0 ? vmax : vmax / 70;
  const vmaxTotal = weightKg !== undefined && weightKg > 0 ? vmax * weightKg : vmax;

  const clTotalDay = vmaxTotal / (km + conc);
  const clKgDay = vmaxPerKg / (km + conc);
  const clTotalHr = clTotalDay / 24;

  return {
    clearanceLPerDay: Math.round(clTotalDay * 100) / 100,
    clearanceLPerKgPerDay: Math.round(clKgDay * 1000) / 1000,
    clearanceLPerHour: Math.round(clTotalHr * 100) / 100,
  };
}

/**
 * Linearized two-point Ludden method for patient-specific Vmax and Km estimation:
 * R = Vmax - Km * (R / Css)
 *
 * Given two steady-state dose-concentration pairs:
 * Km = (R1 - R2) / ((R1 / C1) - (R2 / C2))
 * Vmax = R1 + Km * (R1 / C1)
 */
export function estimateVmaxKmFromTwoPoints(
  pair1: { dailyDoseMg: number; cssMgL: number },
  pair2: { dailyDoseMg: number; cssMgL: number },
): { vmaxMgDay: number; kmMgL: number } | null {
  const { dailyDoseMg: r1, cssMgL: c1 } = pair1;
  const { dailyDoseMg: r2, cssMgL: c2 } = pair2;

  if (r1 <= 0 || c1 <= 0 || r2 <= 0 || c2 <= 0 || r1 === r2 || c1 === c2) {
    return null;
  }

  const ratio1 = r1 / c1;
  const ratio2 = r2 / c2;
  const denominator = ratio1 - ratio2;

  if (Math.abs(denominator) < 0.0001) return null;

  // Linearized Michaelis-Menten: R = Vmax - Km * (R / Css)
  // Slope m = -Km = (R2 - R1) / (ratio2 - ratio1) => Km = (R2 - R1) / (ratio1 - ratio2)
  const km = (r2 - r1) / denominator;
  const vmax = r1 + km * ratio1;

  if (km <= 0 || vmax <= 0) return null;

  return {
    vmaxMgDay: Math.round(vmax * 10) / 10,
    kmMgL: Math.round(km * 10) / 10,
  };
}

/**
 * Simulates the nonlinear jump in serum concentration resulting from small percentage dose escalations.
 * Demonstrates why a 10–20% dose increase (e.g. 300 mg to 360 mg) can trigger a 100–300% doubling/tripling of serum level.
 */
export function simulateDoseTitrationJump(
  currentDoseMg: number,
  doseIncreasePct: number,
  vmaxMgDay: number,
  kmMgL: number,
): TitrationStep {
  const newDoseMg = Math.round(currentDoseMg * (1 + doseIncreasePct / 100));
  const currentResult = calculatePredictedCss(currentDoseMg, vmaxMgDay, kmMgL);
  const newResult = calculatePredictedCss(newDoseMg, vmaxMgDay, kmMgL);

  const currentCss = currentResult.predictedCss;
  const newCss = newResult.predictedCss;

  let cssIncreasePct: number | null = null;
  let alert = "";

  if (newResult.isSaturated) {
    alert = `CRITICAL TOXICITY WARNING: Increasing dose by ${doseIncreasePct}% to ${newDoseMg} mg/day exceeds metabolic saturation (Vmax = ${Math.round(vmaxMgDay)} mg/day). Serum levels will escalate without bound!`;
  } else if (currentCss !== null && newCss !== null && currentCss > 0) {
    cssIncreasePct = Math.round(((newCss - currentCss) / currentCss) * 100);
    if (cssIncreasePct >= 100) {
      alert = `NONLINEAR SATURATION ALERT: A modest ${doseIncreasePct}% dose increase causes a ${cssIncreasePct}% surge in steady-state concentration (from ${currentCss} to ${newCss} mg/L) due to Michaelis-Menten enzyme saturation.`;
    } else {
      alert = `Dose increase of ${doseIncreasePct}% (${newDoseMg} mg/day) produces an estimated steady-state level of ${newCss} mg/L (+${cssIncreasePct}%).`;
    }
  } else {
    alert = `Simulation for ${newDoseMg} mg/day calculated.`;
  }

  return {
    doseIncreasePct,
    newDoseMg,
    newCssMgL: newCss,
    cssIncreasePct,
    alert,
  };
}

/**
 * Calculates Sheiner-Tozer (Winter-Tozer) hypoalbuminemia and ESRD-adjusted phenytoin concentration:
 *
 * Standard Sheiner-Tozer equation:
 *   C_adj = C_observed / ((0.2 * Albumin_g_dL) + 0.1)
 *
 * End-Stage Renal Disease (ESRD / CrCl < 10 mL/min / Dialysis) equation:
 *   C_adj_esrd = C_observed / ((0.1 * Albumin_g_dL) + 0.1)
 *
 * Rationale:
 * Phenytoin is ~90% bound to plasma albumin in normal physiological conditions.
 * In hypoalbuminemia (albumin < 3.5 g/dL), unbound fraction fu expands.
 * In uremia / ESRD, uremic toxins and conformational changes cut albumin binding affinity in half.
 *
 * Unbound / Free level estimation:
 *   C_free_est = 0.10 * C_adj
 */
export function calculateSheinerTozer(
  observedTotalMcgMl: number,
  albuminGDl: number,
  isEsrdOrDialysis: boolean = false,
): SheinerTozerResult {
  const obs = Math.max(0, observedTotalMcgMl);
  const alb = Math.max(0.5, Math.min(6.0, albuminGDl));

  if (isEsrdOrDialysis) {
    const denominator = 0.1 * alb + 0.1;
    const adjustedTotal = obs / denominator;
    const estimatedFree = 0.1 * adjustedTotal;
    const freeFraction = obs > 0 ? (estimatedFree / obs) * 100 : 10;

    return {
      observedTotalMcgMl: obs,
      albuminGDl: alb,
      isEsrd: true,
      adjustedTotalMcgMl: Math.round(adjustedTotal * 10) / 10,
      estimatedFreeMcgMl: Math.round(estimatedFree * 100) / 100,
      estimatedFreeFractionPct: Math.round(freeFraction * 10) / 10,
      formulaUsed: "sheiner-tozer-esrd",
      formulaExpression: "C_adj = C_observed / ((0.1 * Albumin) + 0.1)",
      clinicalNote: `ESRD / Dialysis adjusted: Uremic toxins and decreased albumin affinity expand the free fraction to ~${Math.round(freeFraction)}%. Total phenytoin of ${obs} mcg/mL corresponds to an effective normal-binding exposure of ${Math.round(adjustedTotal * 10) / 10} mcg/mL (free ~${Math.round(estimatedFree * 100) / 100} mcg/mL).`,
    };
  }

  const denominator = 0.2 * alb + 0.1;
  const adjustedTotal = obs / denominator;
  const estimatedFree = 0.1 * adjustedTotal;
  const freeFraction = obs > 0 ? (estimatedFree / obs) * 100 : 10;

  return {
    observedTotalMcgMl: obs,
    albuminGDl: alb,
    isEsrd: false,
    adjustedTotalMcgMl: Math.round(adjustedTotal * 10) / 10,
    estimatedFreeMcgMl: Math.round(estimatedFree * 100) / 100,
    estimatedFreeFractionPct: Math.round(freeFraction * 10) / 10,
    formulaUsed: "sheiner-tozer-standard",
    formulaExpression: "C_adj = C_observed / ((0.2 * Albumin) + 0.1)",
    clinicalNote:
      alb < 3.5
        ? `Hypoalbuminemia adjusted (${alb} g/dL): With reduced binding sites, free fraction is expanded to ~${Math.round(freeFraction)}%. Observed total ${obs} mcg/mL corresponds to an effective normal-binding exposure of ${Math.round(adjustedTotal * 10) / 10} mcg/mL (free ~${Math.round(estimatedFree * 100) / 100} mcg/mL).`
        : `Normal serum albumin (${alb} g/dL): Standard ~90% protein binding. Adjusted total is ${Math.round(adjustedTotal * 10) / 10} mcg/mL.`,
  };
}

/**
 * Evaluates measured and estimated total and free phenytoin levels, categorizing toxicity tiers
 * and detecting the life-threatening Valproate × Phenytoin diagnostic trap.
 */
export function evaluatePhenytoinLevel(params: PhenytoinLevelInput): PhenytoinLevelEvaluation {
  const {
    totalMcgMl,
    albuminGDl = 4.0,
    measuredFreeMcgMl,
    isEsrdOrDialysis = false,
    hasValproate = false,
  } = params;

  const st = calculateSheinerTozer(totalMcgMl, albuminGDl, isEsrdOrDialysis);

  let effectiveFree: number;
  let estimatedFreeFractionPct: number;
  let isMeasuredFree = false;

  if (measuredFreeMcgMl !== undefined && measuredFreeMcgMl > 0) {
    effectiveFree = measuredFreeMcgMl;
    isMeasuredFree = true;
    estimatedFreeFractionPct = totalMcgMl > 0 ? (effectiveFree / totalMcgMl) * 100 : 10;
  } else if (hasValproate) {
    // Valproate displacement increases free fraction to 20-35%
    const displacedFreeFraction = Math.max(st.estimatedFreeFractionPct, 25.0);
    effectiveFree = (totalMcgMl * displacedFreeFraction) / 100;
    estimatedFreeFractionPct = displacedFreeFraction;
  } else {
    effectiveFree = st.estimatedFreeMcgMl;
    estimatedFreeFractionPct = st.estimatedFreeFractionPct;
  }

  effectiveFree = Math.round(effectiveFree * 100) / 100;
  estimatedFreeFractionPct = Math.round(estimatedFreeFractionPct * 10) / 10;

  // Evaluate bands
  // Total band evaluated on adjusted concentration (or observed if normal binding)
  const evalTotal = st.adjustedTotalMcgMl;
  let totalBand: PhenytoinLevelBand = "therapeutic";
  if (evalTotal < 10.0) {
    totalBand = "subtherapeutic";
  } else if (evalTotal <= 20.0) {
    totalBand = "therapeutic";
  } else if (evalTotal <= 30.0) {
    totalBand = "supratherapeutic-mild";
  } else if (evalTotal <= 40.0) {
    totalBand = "moderate-toxicity";
  } else {
    totalBand = "severe-toxicity";
  }

  let freeBand: PhenytoinLevelBand = "therapeutic";
  if (effectiveFree < 1.0) {
    freeBand = "subtherapeutic";
  } else if (effectiveFree <= 2.0) {
    freeBand = "therapeutic";
  } else if (effectiveFree <= 3.0) {
    freeBand = "supratherapeutic-mild";
  } else if (effectiveFree <= 4.0) {
    freeBand = "moderate-toxicity";
  } else {
    freeBand = "severe-toxicity";
  }

  // Clinical signs mapped to toxicity severity
  const clinicalSigns: string[] = [];
  if (freeBand === "supratherapeutic-mild" || totalBand === "supratherapeutic-mild") {
    clinicalSigns.push("Horizontal nystagmus on lateral gaze", "Mild gait unsteadiness / ataxia", "Drowsiness");
  } else if (freeBand === "moderate-toxicity" || totalBand === "moderate-toxicity") {
    clinicalSigns.push(
      "Prominent cerebellar ataxia (inability to tandem walk)",
      "Dysarthria (slurred speech)",
      "Nausea and vomiting",
      "Tremor and hyperreflexia",
      "Diplopia (double vision)",
    );
  } else if (freeBand === "severe-toxicity" || totalBand === "severe-toxicity") {
    clinicalSigns.push(
      "Marked obtundation / lethargy / stupor / coma",
      "Paradoxical increase in seizure frequency",
      "Respiratory depression",
      "Hemodynamic instability / hypotension",
    );
  }

  let saturationRisk: PhenytoinLevelEvaluation["saturationRisk"] = "low";
  if (evalTotal >= 30.0 || effectiveFree >= 3.0) {
    saturationRisk = "critical";
  } else if (evalTotal >= 20.0 || effectiveFree >= 2.0) {
    saturationRisk = "high";
  } else if (evalTotal >= 15.0 || effectiveFree >= 1.5) {
    saturationRisk = "moderate";
  }

  // Check Valproate Double-Hit Paradox:
  // Total appears normal or subtherapeutic (<= 15 mg/L), but free is elevated (> 2.0 mg/L)
  const valproateDoubleHitWarning = hasValproate;
  const clinicalParadoxDetected = hasValproate && totalMcgMl <= 15.0 && effectiveFree > 2.0;

  let headline = "";
  let clinicalInterpretation = "";

  if (clinicalParadoxDetected) {
    headline = "CRITICAL VALPROATE × PHENYTOIN DOUBLE-HIT PARADOX";
    clinicalInterpretation = `Total serum phenytoin (${totalMcgMl} mcg/mL) appears misleadingly NORMAL or LOW, but FREE phenytoin (${effectiveFree} mcg/mL) is TOXIC! Valproate displaces phenytoin from albumin binding sites (expanding free fraction to ~${estimatedFreeFractionPct}%) while concurrently inhibiting CYP2C9 clearance. Escalating the dose based on total level alone will precipitate catastrophic neurotoxicity.`;
  } else if (freeBand === "severe-toxicity") {
    headline = `CRITICAL TOXICITY: Free Phenytoin ${effectiveFree} mcg/mL (>4.0 mcg/mL)`;
    clinicalInterpretation = `Markedly toxic free concentration. High risk of coma, obtundation, paradoxical seizures, and cardiovascular compromise. Michaelis-Menten elimination is fully saturated (zero-order); clearance is minimal.`;
  } else if (freeBand === "moderate-toxicity") {
    headline = `MODERATE TOXICITY: Free Phenytoin ${effectiveFree} mcg/mL (3.0–4.0 mcg/mL)`;
    clinicalInterpretation = `Active unbound drug is substantially elevated. Expect prominent cerebellar ataxia, dysarthria, and nausea. Michaelis-Menten enzymes are saturated.`;
  } else if (freeBand === "supratherapeutic-mild") {
    headline = `SUPRATHERAPEUTIC: Free Phenytoin ${effectiveFree} mcg/mL (2.1–3.0 mcg/mL)`;
    clinicalInterpretation = `Unbound drug exceeds the 1.0–2.0 mcg/mL therapeutic window. Watch for early nystagmus and mild ataxia. Note: Even a small 25–50 mg dose reduction may take several days to normalize due to saturation clearance kinetics.`;
  } else if (freeBand === "therapeutic") {
    headline = `OPTIMAL WINDOW: Free Phenytoin ${effectiveFree} mcg/mL (1.0–2.0 mcg/mL)`;
    clinicalInterpretation = `Free concentration is within the target therapeutic window (1.0–2.0 mcg/mL). Total adjusted concentration is ${st.adjustedTotalMcgMl} mcg/mL.`;
  } else {
    headline = `SUBTHERAPEUTIC: Free Phenytoin ${effectiveFree} mcg/mL (<1.0 mcg/mL)`;
    clinicalInterpretation = `Unbound concentration is below the minimum therapeutic threshold. Increased risk of breakthrough seizures. Assess adherence, inducers, or tube feeding co-administration.`;
  }

  const pearl =
    "Because phenytoin is 90% albumin-bound and undergoes capacity-limited Michaelis-Menten elimination, total level alone is untrustworthy whenever albumin is <3.5 g/dL, in renal failure (ESRD), or when valproate is co-administered. Free phenytoin (target 1.0–2.0 mcg/mL) directly reflects tissue exposure and neurotoxicity risk.";

  return {
    observedTotalMcgMl: totalMcgMl,
    albuminGDl,
    isEsrdOrDialysis,
    adjustedTotalMcgMl: st.adjustedTotalMcgMl,
    measuredFreeMcgMl,
    estimatedFreeMcgMl: st.estimatedFreeMcgMl,
    effectiveFreeMcgMl: effectiveFree,
    estimatedFreeFractionPct,
    isMeasuredFree,
    totalBand,
    freeBand,
    clinicalSigns,
    saturationRisk,
    hypoalbuminemiaWarning: albuminGDl < 3.5,
    valproateDoubleHitWarning,
    clinicalParadoxDetected,
    headline,
    clinicalInterpretation,
    pearl,
  };
}

/**
 * Calculates fosphenytoin (Cerebyx) stoichiometry, dosing conversion, and parenteral infusion safety rails.
 */
export function calculateFosphenytoinEquivalent(
  doseMg: number,
  form: "phenytoin-sodium" | "fosphenytoin-pe" | "phenytoin-acid" = "phenytoin-sodium",
): FosphenytoinGuidance {
  let peMg = doseMg;
  let fosphenytoinMg = doseMg * FOSPHENOXY_CONVERSION_RATIO;

  if (form === "fosphenytoin-pe") {
    peMg = doseMg;
    fosphenytoinMg = doseMg * FOSPHENOXY_CONVERSION_RATIO;
  } else if (form === "phenytoin-acid") {
    peMg = doseMg / SALT_FACTOR_SODIUM;
    fosphenytoinMg = peMg * FOSPHENOXY_CONVERSION_RATIO;
  }

  peMg = Math.round(peMg * 10) / 10;
  fosphenytoinMg = Math.round(fosphenytoinMg * 10) / 10;

  return {
    prodrugName: "Fosphenytoin Sodium (Cerebyx)",
    conversionRatio: "1.5 mg fosphenytoin sodium = 1.0 mg phenytoin sodium PE",
    peEquivalentDoseMg: peMg,
    fosphenytoinDoseMg: fosphenytoinMg,
    maxInfusionRateMgPEPerMin: 150,
    maxPhenytoinInfusionRateMgPerMin: 50,
    purpleGloveSyndromeRisk:
      "Eliminated with fosphenytoin. IV phenytoin requires propylene glycol solvent (pH 12) which triggers severe vasoconstriction, thrombosis, and extravasation necrosis ('Purple Glove Syndrome'). Fosphenytoin is water-soluble at pH 8.6–9.0.",
    phComparison: "IV Phenytoin: pH ~12.0 (highly alkaline tissue irritant) vs IV Fosphenytoin: pH ~8.6–9.0 (physiologically tolerated).",
    imAdministrationPermitted: true,
    clinicalRecommendation:
      "Prefer fosphenytoin for parenteral administration in status epilepticus. Can be infused 3× faster (up to 150 mg PE/min vs 50 mg/min for IV phenytoin) with significantly lower risk of severe hypotension, arrhythmias, and Purple Glove Syndrome. IM administration is well tolerated.",
  };
}

/**
 * Identifies high-risk clinical pharmacokinetic collisions for phenytoin / fosphenytoin.
 */
export function findPhenytoinCollisions(drugIds: string[]): PhenytoinCollision[] {
  const collisions: PhenytoinCollision[] = [];
  const normalized = drugIds.map((id) => id.toLowerCase().trim());

  // 1. Valproate (The Double-Hit)
  if (normalized.some((id) => VALPROATE_IDS.has(id))) {
    collisions.push({
      drugId: "valproate",
      drugName: "Valproate / Divalproex",
      category: "valproate-double-hit",
      severity: "contraindicated",
      headline: "Phenytoin × Valproate: The Double-Hit Binding Displacement & CYP2C9 Block",
      mechanism:
        "Valproic acid exerts a synergistic dual collision: 1) Competitively displaces phenytoin from albumin binding sites, expanding the unbound (free) fraction fu from 10% to 25–35%; 2) Inhibits CYP2C9 hepatic metabolism of phenytoin. Total phenytoin level appears artificially normal or subtherapeutic while active free phenytoin reaches severe neurotoxic concentrations.",
      clinicalAction:
        "CRITICAL PARADOX ALERT: NEVER titrate phenytoin based on total serum levels when valproate is co-administered. Order a direct FREE (unbound) phenytoin level immediately. Target free level 1.0–2.0 mcg/mL. Be prepared to reduce phenytoin dose despite a 'low' total level.",
      monitoringRecommendation: "Monitor free phenytoin and serum ammonia regularly. Monitor for ataxia, nystagmus, and cognitive slowing.",
    });
  }

  // 2. Strong / Moderate CYP2C9 / CYP2C19 Inhibitors
  const cyp2c9Inhibitors = [
    { id: "fluconazole", name: "Fluconazole", note: "Moderate CYP2C9 & strong CYP2C19 inhibitor; increases phenytoin AUC by 75–200%." },
    { id: "voriconazole", name: "Voriconazole", note: "Potent CYP2C9 & CYP2C19 inhibitor; causes mutual collision (phenytoin induces voriconazole, voriconazole spikes phenytoin)." },
    { id: "amiodarone", name: "Amiodarone", note: "CYP2C9 inhibitor with multi-week half-life; precipitates delayed, progressive phenytoin intoxication." },
    { id: "tmp-smx", name: "Trimethoprim-sulfamethoxazole (Bactrim)", note: "CYP2C9 inhibitor; common outpatient trigger of acute phenytoin toxicity and ataxia." },
    { id: "bactrim", name: "Bactrim (TMP-SMX)", note: "CYP2C9 inhibitor; common outpatient trigger of acute phenytoin toxicity and ataxia." },
    { id: "sulfamethoxazole", name: "Sulfamethoxazole", note: "CYP2C9 inhibitor; common outpatient trigger of acute phenytoin toxicity." },
  ];

  for (const inh of cyp2c9Inhibitors) {
    if (normalized.includes(inh.id)) {
      const existing = collisions.some((c) => c.drugId === inh.id || (inh.id === "bactrim" && c.drugId === "tmp-smx"));
      if (!existing) {
        collisions.push({
          drugId: inh.id,
          drugName: DRUG_BY_ID[inh.id]?.name ?? inh.name,
          category: "cyp2c9-inhibition",
          severity: "major",
          headline: `Phenytoin × ${DRUG_BY_ID[inh.id]?.name ?? inh.name}: CYP2C9 Saturation Block`,
          mechanism: `${inh.note} Because phenytoin operates near enzyme saturation (Km ~4 mcg/mL), inhibition of CYP2C9 rapidly collapses clearance, causing serum concentrations to spike precipitously into severe toxicity.`,
          clinicalAction:
            "Preemptively reduce phenytoin maintenance dose by 25–50% upon initiating inhibitor therapy. Check serum levels within 3–5 days. Educate patient on signs of acute toxicity (ataxia, slurred speech, double vision).",
          monitoringRecommendation: "Serial free and total phenytoin levels; clinical cerebellar exam.",
        });
      }
    }
  }

  // 3. Potent Hepatic Inducers
  const inducers = [
    { id: "carbamazepine", name: "Carbamazepine", note: "Strong inducer of CYP2C9/2C19 and CYP3A4. Reciprocally, phenytoin induces carbamazepine clearance." },
    { id: "phenobarbital", name: "Phenobarbital", note: "Potent CYP2C9/2C19/3A4 inducer; accelerates phenytoin elimination." },
    { id: "rifampin", name: "Rifampin", note: "Profound hepatic CYP2C9/2C19 inducer; can crash phenytoin concentrations by 50–80%, risking breakthrough seizures." },
  ];

  for (const ind of inducers) {
    if (normalized.includes(ind.id)) {
      collisions.push({
        drugId: ind.id,
        drugName: DRUG_BY_ID[ind.id]?.name ?? ind.name,
        category: "hepatic-induction",
        severity: "major",
        headline: `Phenytoin × ${DRUG_BY_ID[ind.id]?.name ?? ind.name}: Induction Clearance Surge`,
        mechanism: `${ind.note} Hepatic enzyme induction increases Vmax and clearance of phenytoin, lowering serum concentrations by 30–70% and precipitating loss of seizure control. In reverse, phenytoin induces co-drug metabolism.`,
        clinicalAction:
          "Anticipate substantial drop in phenytoin serum concentrations. Dose titration of phenytoin may be required. When stopping the inducer, de-escalate phenytoin proactively to prevent severe delayed rebound toxicity.",
        monitoringRecommendation: "Frequent serum phenytoin levels during initiation and discontinuation of the inducer.",
      });
    }
  }

  // 4. Enteral Tube Feeding Binding
  if (normalized.some((id) => TUBE_FEED_IDS.has(id))) {
    collisions.push({
      drugId: "enteral-feed",
      drugName: "Enteral Nutrition / Tube Feeds",
      category: "tube-feed-binding",
      severity: "major",
      headline: "Phenytoin × Enteral Tube Feeds: Physical Binding & 50–70% Bioavailability Loss",
      mechanism:
        "Phenytoin oral suspension physically binds to intact proteins, divalent cations, and plastic tubing in continuous enteral formulas (e.g. Osmolite, Jevity). Oral bioavailability collapses by 50–70%, leading to therapeutic failure and breakthrough status epilepticus.",
      clinicalAction:
        "MANDATORY ADMINISTRATION RAIL: Hold continuous enteral nutrition for 1 to 2 hours BEFORE and 1 to 2 hours AFTER each phenytoin dose. Flush the feeding tube with 30–60 mL of water before and after administration. If therapeutic levels cannot be achieved, switch to IV fosphenytoin or IV phenytoin.",
      monitoringRecommendation: "Check total and free phenytoin levels 3–5 days after initiating or altering tube feeding regimens.",
    });
  }

  return collisions;
}

/**
 * Evaluates CPIC pharmacogenomic considerations for CYP2C9 and CYP2C19 metabolizer phenotypes.
 */
export function evaluatePhenytoinPgx(phenotypes: HostContext["phenotypes"]): PhenytoinPgxSummary {
  const cyp2c9 = phenotypes?.CYP2C9 ?? "NM";
  const cyp2c19 = phenotypes?.CYP2C19 ?? "NM";

  let vmaxAdjustmentFactor = 1.0;
  let recommendedDoseAdjustmentPct = 0;
  let cpicRecommendation = "";

  if (cyp2c9 === "PM") {
    // CYP2C9 Poor Metabolizer (*3/*3, *2/*3)
    vmaxAdjustmentFactor = 0.40; // 60% reduction in Vmax
    recommendedDoseAdjustmentPct = -50;
    cpicRecommendation =
      "CPIC Level A: CYP2C9 Poor Metabolizer. Vmax is markedly decreased (~60% reduction). Reduce initial maintenance dose by 50% or more. Reaching steady state requires up to 2–3 weeks (markedly prolonged half-life). Monitor free phenytoin closely to prevent toxic accumulation.";
  } else if (cyp2c9 === "IM") {
    // CYP2C9 Intermediate Metabolizer (*1/*3, *2/*2, *1/*2)
    vmaxAdjustmentFactor = 0.70; // 30% reduction in Vmax
    recommendedDoseAdjustmentPct = -25;
    cpicRecommendation =
      "CPIC Level A: CYP2C9 Intermediate Metabolizer. Vmax is moderately decreased (~30% reduction). Reduce initial maintenance dose by 25%. Monitor serum levels closely during titration.";
  } else if (cyp2c9 === "UM") {
    vmaxAdjustmentFactor = 1.20;
    recommendedDoseAdjustmentPct = 15;
    cpicRecommendation =
      "CYP2C9 Ultrarapid Metabolizer. Accelerated clearance; may require higher maintenance dosing to achieve target steady-state concentrations.";
  } else {
    cpicRecommendation =
      "CPIC Level A: CYP2C9 Normal Metabolizer (*1/*1). Standard population Michaelis-Menten dosing parameters apply (mean Vmax ~7 mg/kg/day, Km ~4 mcg/mL).";
  }

  return {
    cyp2c9Phenotype: cyp2c9,
    cyp2c19Phenotype: cyp2c19,
    vmaxAdjustmentFactor,
    recommendedDoseAdjustmentPct,
    cpicRecommendation,
  };
}

/**
 * Generates the comprehensive Phenytoin & Fosphenytoin Clinical Pharmacokinetics Report.
 */
export function phenytoinReportOnDesk(
  drugIds: string[],
  host: HostContext,
  params?: PhenytoinReportParams,
): PhenytoinReport {
  const onDesk = phenytoinOnDesk(drugIds);
  const hasPhenytoin = onDesk.hasAnyPhenytoin;

  const totalMcgMl = params?.totalMcgMl ?? 15.0;
  const isEsrdOrDialysis = params?.isEsrdOrDialysis ?? host.kidney === "ckd";
  const albuminGDl = params?.albuminGDl ?? (isEsrdOrDialysis ? 3.0 : host.age === "geriatric" ? 3.5 : 4.0);
  const weightKg = params?.weightKg ?? 70.0;
  const dailyDoseMg = params?.dailyDoseMg ?? 300.0;
  const targetCssMgL = params?.targetCssMgL ?? 15.0;

  // Pharmacogenomic baseline adjustments
  const pgx = evaluatePhenytoinPgx(host.phenotypes);
  const baseVmax = params?.vmaxMgKgDay ?? POPULATION_VMAX_MEAN_MG_KG_DAY;
  const effectiveVmaxMgKgDay = baseVmax * pgx.vmaxAdjustmentFactor;
  const kmMgL = params?.kmMgL ?? POPULATION_KM_MEAN_MG_L;
  const vmaxTotalMgDay = effectiveVmaxMgKgDay * weightKg;

  // Level evaluation
  const levelEval = evaluatePhenytoinLevel({
    totalMcgMl,
    albuminGDl,
    measuredFreeMcgMl: params?.measuredFreeMcgMl,
    isEsrdOrDialysis,
    hasValproate: onDesk.hasValproate,
  });

  const sheinerTozer = calculateSheinerTozer(totalMcgMl, albuminGDl, isEsrdOrDialysis);

  // Clearance and predicted steady state
  const currentConc = levelEval.effectiveFreeMcgMl > 0 ? levelEval.effectiveFreeMcgMl * 10 : totalMcgMl;
  const clearanceInfo = calculatePhenytoinClearance(currentConc, effectiveVmaxMgKgDay, kmMgL, weightKg);
  const predicted = calculatePredictedCss(dailyDoseMg, effectiveVmaxMgKgDay, kmMgL, weightKg);

  // Titration simulation: 10%, 20%, 33%, 50% dose jumps
  const titrationSimulation = [
    simulateDoseTitrationJump(dailyDoseMg, 10, vmaxTotalMgDay, kmMgL),
    simulateDoseTitrationJump(dailyDoseMg, 20, vmaxTotalMgDay, kmMgL),
    simulateDoseTitrationJump(dailyDoseMg, 33, vmaxTotalMgDay, kmMgL),
  ];

  let kineticPhase: MichaelisMentenKineticsSummary["kineticPhase"] = "mixed-order-saturating";
  if (currentConc < 8.0) {
    kineticPhase = "first-order-approximate";
  } else if (currentConc > 20.0 || predicted.isSaturated) {
    kineticPhase = "zero-order-saturated";
  }

  let doseTitrationWarning: string | undefined;
  if (predicted.isSaturated) {
    doseTitrationWarning = `SATURATION EXCEEDED: Dose of ${dailyDoseMg} mg/day exceeds metabolic capacity Vmax (${Math.round(vmaxTotalMgDay)} mg/day). Unchecked drug accumulation will occur.`;
  } else if (currentConc >= 18.0) {
    doseTitrationWarning =
      "ZERO-ORDER CLEARANCE HAZARD: Patient is operating in the saturable Michaelis-Menten zone. Avoid standard 100 mg dose adjustments; use small 25–30 mg increments (e.g. 300 to 330 mg) and verify levels at steady state.";
  }

  const kinetics: MichaelisMentenKineticsSummary = {
    vmaxMgKgDay: Math.round(effectiveVmaxMgKgDay * 10) / 10,
    vmaxTotalMgDay: Math.round(vmaxTotalMgDay * 10) / 10,
    kmMgL,
    weightKg,
    currentConcentrationMgL: currentConc,
    clearanceLPerDay: clearanceInfo.clearanceLPerDay,
    clearanceLPerKgPerDay: clearanceInfo.clearanceLPerKgPerDay,
    clearanceLPerHour: clearanceInfo.clearanceLPerHour,
    kineticPhase,
    dailyDoseMg,
    predictedCssMgL: predicted.predictedCss,
    isSaturated: predicted.isSaturated,
    doseTitrationWarning,
    titrationSimulation,
  };

  const fosphenytoin = calculateFosphenytoinEquivalent(dailyDoseMg, "phenytoin-sodium");
  const collisions = findPhenytoinCollisions(drugIds);

  const clinicalPearls: string[] = [
    "Nonlinear Michaelis-Menten Saturation: Daily dose R = (Vmax * Css) / (Km + Css). Clearance is concentration-dependent (CL = Vmax / (Km + C)). As levels climb into the therapeutic range, clearance drops precipitously. A small 10–20% dose increase can double or triple serum concentration.",
    "Albumin Binding & Hypoalbuminemia: Phenytoin is 90% albumin-bound in healthy individuals (free fraction fu = 0.10). In hypoalbuminemia (albumin < 3.5 g/dL), use the Sheiner-Tozer correction: C_adj = C_observed / ((0.2 * Albumin) + 0.1).",
    "ESRD / Uremia Binding Shift: In end-stage renal disease (CrCl < 10 mL/min or dialysis), uremic toxins displace phenytoin from albumin, cutting affinity in half: C_adj_esrd = C_observed / ((0.1 * Albumin) + 0.1). Always target free phenytoin 1.0–2.0 mcg/mL.",
    "Valproate Double-Hit Diagnostic Trap: Valproate displaces phenytoin from albumin AND inhibits its CYP2C9 metabolism. Total phenytoin may test normal or low (e.g. 9 mcg/mL) while free phenytoin is severely toxic (>2.5 mcg/mL). Never dose-escalate based on total level alone.",
    "Enteral Tube Feed Hold: Phenytoin suspension binds to proteins and plastic in enteral feeding tubes, reducing bioavailability by 50–70%. Hold continuous feeds 1–2 hours before and after administration, and flush tube with 30–60 mL water.",
    "Fosphenytoin Safety Profile: Fosphenytoin (Cerebyx) is a water-soluble prodrug dosed in Phenytoin Sodium Equivalents (PE; 1.5 mg fosphenytoin = 1.0 mg PE). It avoids the propylene glycol vehicle and pH 12 alkaline necrosis ('Purple Glove Syndrome') of IV phenytoin and can be infused up to 150 mg PE/min.",
  ];

  if (host.preg === "pregnant") {
    clinicalPearls.unshift(
      "PREGNANCY & TERATOGENICITY: Phenytoin causes Fetal Hydantoin Syndrome (craniofacial abnormalities, digit/nail hypoplasia, microcephaly, growth and developmental delay). Supplement high-dose folic acid (4–5 mg/day). Clearance accelerates during pregnancy; check free levels monthly.",
    );
  }

  if (host.age === "geriatric") {
    clinicalPearls.push(
      "GERIATRIC POPULATION: Lower mean albumin, reduced hepatic CYP2C9 metabolic capacity (lower Vmax), and enhanced pharmacodynamic cerebellar sensitivity. Reduce initial maintenance doses and cap IV infusion at 25 mg/min.",
    );
  }

  return {
    hasPhenytoin,
    onDesk,
    levelEval,
    sheinerTozer,
    kinetics,
    fosphenytoin,
    collisions,
    pgx,
    clinicalPearls,
    disclaimer: `${PHENYTOIN_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`,
  };
}
