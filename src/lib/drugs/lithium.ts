/**
 * Lithium Pharmacokinetics, Proximal Tubular Reabsorption,
 * and EXTRIP Extracorporeal Elimination Consensus Guidance.
 *
 * Educational clinical pharmacology reference only (non-device CDS).
 * Does not provide directive medical orders or patient-specific prescriptions.
 * Clinical management is governed by the FDA Prescribing Information,
 * Nephrology consultation, and Regional Poison Centers (1-800-222-1222).
 */

export type LithiumTargetBand = "acute-mania" | "maintenance" | "geriatric";

export interface LithiumTargetRange {
  band: LithiumTargetBand;
  min: number;
  max: number;
  label: string;
  rationale: string;
}

export const LITHIUM_TARGET_RANGES: Record<LithiumTargetBand, LithiumTargetRange> = {
  "acute-mania": {
    band: "acute-mania",
    min: 0.8,
    max: 1.2,
    label: "Acute Mania (0.8–1.2 mEq/L)",
    rationale:
      "Targeted during acute manic/mixed bipolar episodes to achieve rapid behavioral stabilization; drawn 12 hours post-dose at steady-state.",
  },
  maintenance: {
    band: "maintenance",
    min: 0.6,
    max: 0.8,
    label: "Maintenance Bipolar Therapy (0.6–0.8 mEq/L)",
    rationale:
      "Standard long-term maintenance target to prevent affective relapse while minimizing chronic nephrogenic diabetes insipidus and renal tubular injury.",
  },
  geriatric: {
    band: "geriatric",
    min: 0.4,
    max: 0.6,
    label: "Geriatric / High Vulnerability (0.4–0.6 mEq/L)",
    rationale:
      "Lower target band in older adults or patients with pre-existing neurocognitive disorders who demonstrate heightened vulnerability to neurotoxicity even at normal levels.",
  },
};

export type LithiumToxicitySeverity =
  | "subtherapeutic"
  | "therapeutic"
  | "borderline-elevated"
  | "mild"
  | "moderate"
  | "severe-life-threatening";

export interface LithiumLevelClassification {
  levelMeqL: number;
  severity: LithiumToxicitySeverity;
  headline: string;
  symptoms: string[];
  inTargetRange: boolean;
  clinicalNote: string;
}

export function classifyLithiumLevel(
  levelMeqL: number,
  targetBand: LithiumTargetBand = "maintenance",
): LithiumLevelClassification {
  const target = LITHIUM_TARGET_RANGES[targetBand];

  if (levelMeqL < target.min) {
    return {
      levelMeqL,
      severity: "subtherapeutic",
      headline: `Subtherapeutic for ${target.label}`,
      symptoms: ["Risk of mood destabilization", "Bipolar relapse"],
      inTargetRange: false,
      clinicalNote: `Concentration is below the lower target threshold of ${target.min} mEq/L. Ensure steady-state was reached (4–5 days) and confirming adherence before dosage adjustments.`,
    };
  }

  if (levelMeqL <= target.max) {
    return {
      levelMeqL,
      severity: "therapeutic",
      headline: `Within Target Range (${target.label})`,
      symptoms: ["Expected mild therapeutic tremor may be present"],
      inTargetRange: true,
      clinicalNote: `Concentration is within the consensus range for ${target.label} (12-hour trough). Routine TDM, BMP, and thyroid function (TSH) monitoring recommended.`,
    };
  }

  if (levelMeqL < 1.5) {
    return {
      levelMeqL,
      severity: "borderline-elevated",
      headline: "Borderline Elevated (1.2–1.5 mEq/L)",
      symptoms: ["Fine hand tremor", "Mild polyuria / polydipsia", "Mild nausea or loose stools"],
      inTargetRange: false,
      clinicalNote:
        "Above standard maintenance targets. Assess hydration, renal clearance, and recent addition of interacting medications (thiazides, NSAIDs, ACEi/ARBs).",
    };
  }

  if (levelMeqL < 2.0) {
    return {
      levelMeqL,
      severity: "mild",
      headline: "Mild Toxicity (1.5–2.0 mEq/L)",
      symptoms: [
        "Coarse hand tremor",
        "Persistent nausea / vomiting / diarrhea",
        "Muscular weakness",
        "Mild lethargy / sluggishness",
        "Ataxia and unsteadiness",
      ],
      inTargetRange: false,
      clinicalNote:
        "Grade 1 toxicity. Hold lithium, obtain STAT repeat level, IV volume resuscitation with 0.9% NaCl if volume contracted, and evaluate renal function.",
    };
  }

  if (levelMeqL <= 2.5) {
    return {
      levelMeqL,
      severity: "moderate",
      headline: "Moderate Toxicity (2.0–2.5 mEq/L)",
      symptoms: [
        "Severe confusion and disorientation",
        "Pronounced ataxia and dysarthria (slurred speech)",
        "Hyperreflexia and clonus",
        "Myoclonus and coarse muscle fasciculations",
        "ECG changes (flat/inverted T-waves, sinus bradycardia)",
      ],
      inTargetRange: false,
      clinicalNote:
        "Grade 2 toxicity. High risk of clinical deterioration. Transfer to high-acuity/ICU care, initiate aggressive isotonic saline expansion, and consider EXTRIP hemodialysis criteria if renal clearance is impaired.",
    };
  }

  return {
    levelMeqL,
    severity: "severe-life-threatening",
    headline: "Severe / Life-Threatening Toxicity (>2.5 mEq/L)",
    symptoms: [
      "Seizures and status epilepticus",
      "Stupor and coma",
      "Cardiovascular collapse and complex dysrhythmias",
      "SILENT Syndrome (Syndrome of Irreversible Lithium-Effectuated Neurotoxicity)",
      "Acute renal tubular necrosis and circulatory shock",
    ],
    inTargetRange: false,
    clinicalNote:
      "Grade 3 critical toxicity. Emergent Nephrology and Medical Toxicology consultation (Poison Center 1-800-222-1222). Extracorporeal elimination (hemodialysis) frequently indicated per EXTRIP guidelines.",
  };
}

export interface ExtripLithiumTriageInput {
  serumLithiumMeqL: number;
  crclMlMin?: number;
  hasSevereNeurologicSigns?: boolean;
  hasDecreasedConsciousnessOrConfusion?: boolean;
  hasRenalImpairment?: boolean;
  isAcuteIngestion?: boolean;
}

export interface ExtripLithiumTriageResult {
  indication: "recommended" | "suggested" | "not-indicated";
  summary: string;
  criteriaMet: string[];
  modalityRecommendation: string;
  reboundWarning: {
    isHighRisk: boolean;
    timingHours: number;
    rationale: string;
    mitigation: string;
  };
  monitoringGuidance: string;
  disclaimer: string;
}

/**
 * Evaluates international EXTRIP (Extracorporeal Treatments in Poisoning) consensus
 * guidelines for lithium toxicity (Decker et al., Clin Toxicol 2015).
 */
export function evaluateExtripLithiumCriteria(
  input: ExtripLithiumTriageInput,
): ExtripLithiumTriageResult {
  const {
    serumLithiumMeqL,
    crclMlMin,
    hasSevereNeurologicSigns = false,
    hasDecreasedConsciousnessOrConfusion = false,
    hasRenalImpairment = false,
    isAcuteIngestion = false,
  } = input;

  const renalImpaired =
    hasRenalImpairment || (crclMlMin !== undefined && crclMlMin < 45);

  const criteriaMet: string[] = [];

  // Recommendation 1: Dialysis Recommended (Strong)
  let recommended = false;

  if (hasSevereNeurologicSigns) {
    recommended = true;
    criteriaMet.push(
      "Presence of severe neurologic manifestations (coma, seizures, life-threatening dysrhythmias) regardless of lithium concentration (EXTRIP Recommendation 1D).",
    );
  }

  if (serumLithiumMeqL > 4.0 && renalImpaired) {
    recommended = true;
    criteriaMet.push(
      `Serum lithium > 4.0 mEq/L (${serumLithiumMeqL.toFixed(1)} mEq/L) with kidney function impairment (CrCl < 45 mL/min) (EXTRIP Recommendation 1A).`,
    );
  }

  if (serumLithiumMeqL > 5.0) {
    recommended = true;
    criteriaMet.push(
      `Serum lithium > 5.0 mEq/L (${serumLithiumMeqL.toFixed(1)} mEq/L) regardless of renal function or initial clinical status (EXTRIP Recommendation 1B).`,
    );
  }

  // Recommendation 2: Dialysis Suggested (Conditional / Weak)
  let suggested = false;

  if (!recommended) {
    if (serumLithiumMeqL > 4.0 && !renalImpaired) {
      suggested = true;
      criteriaMet.push(
        `Serum lithium > 4.0 mEq/L (${serumLithiumMeqL.toFixed(1)} mEq/L) in patients without kidney impairment (EXTRIP Recommendation 2A).`,
      );
    }

    if (
      serumLithiumMeqL > 2.5 &&
      (renalImpaired || hasDecreasedConsciousnessOrConfusion)
    ) {
      suggested = true;
      criteriaMet.push(
        `Serum lithium > 2.5 mEq/L (${serumLithiumMeqL.toFixed(1)} mEq/L) with moderate/severe kidney impairment or significant neurologic signs/confusion (EXTRIP Recommendation 2B).`,
      );
    }
  }

  const indication = recommended
    ? "recommended"
    : suggested
      ? "suggested"
      : "not-indicated";

  const summary = recommended
    ? "EXTRIP Consensus: Extracorporeal treatment (hemodialysis) is RECOMMENDED."
    : suggested
      ? "EXTRIP Consensus: Extracorporeal treatment (hemodialysis) is SUGGESTED."
      : "EXTRIP Consensus: Extracorporeal treatment does not meet standard threshold criteria at this time.";

  const isReboundHighRisk = serumLithiumMeqL >= 2.0 || recommended || suggested;

  return {
    indication,
    summary,
    criteriaMet,
    modalityRecommendation:
      "Intermittent Hemodialysis (IHD) is the preferred initial extracorporeal modality due to superior solute clearance (~150–200 mL/min vs ~30–50 mL/min for CRRT). Continuous Renal Replacement Therapy (CRRT / CVVHDF) is an acceptable alternative if hemodynamically unstable or as post-IHD bridge to prevent rebound.",
    reboundWarning: {
      isHighRisk: isReboundHighRisk,
      timingHours: 6,
      rationale:
        "Intracellular Redistribution Rebound: Lithium distributes across total body water (Vd ~0.7–0.9 L/kg) and enters intracellular compartments slowly. During a 4–6 hour hemodialysis run, vascular lithium is rapidly cleared; however, intracellular lithium efflux is rate-limited. Once dialysis is terminated, intracellular lithium diffuses back into the intravascular space, producing a rebound concentration spike of 0.5–1.5 mEq/L within 6–12 hours.",
      mitigation:
        "Mandatory Protocol: Obtain repeat serum lithium concentration at 6 to 8 hours post-dialysis completion. If rebound concentration approaches toxic thresholds or neurotoxicity persists, repeat hemodialysis or continuous venovenous hemodiafiltration (CVVHDF) may be required.",
    },
    monitoringGuidance: isAcuteIngestion
      ? "Acute Ingestion Caveat: In acute overdoses with delayed-release or sustained-release formulations, peak absorption may be delayed up to 12–24 hours post-ingestion. Serial 2- to 4-hour levels are required to identify true peak before ruling out extracorporeal indications."
      : "Chronic Toxicity Caveat: In chronic toxicity, tissue and brain concentrations are in equilibrium with plasma. Neurotoxicity can be profound at lower serum levels (2.0–3.0 mEq/L) and persists longer post-clearance.",
    disclaimer:
      "EXTRIP criteria represent expert consensus and systematic review recommendations. Clinical decision-making must integrate real-time bedside exam, hemodynamics, urine output, and consultation with Nephrology and Medical Toxicology (Poison Center 1-800-222-1222).",
  };
}

export interface LithiumClearanceEstimateInput {
  crclMlMin: number;
  weightKg: number;
  takingThiazide?: boolean;
  takingNsaid?: boolean;
  takingAceiArb?: boolean;
  takingLoopDiuretic?: boolean;
  isDehydrated?: boolean;
}

export interface LithiumClearanceEstimateResult {
  baselineCrCl: number;
  baselineLithiumClearanceMlMin: number;
  estimatedLithiumClearanceMlMin: number;
  fractionalExcretionPercent: number;
  percentReduction: number;
  halfLifeHours: number;
  volumeOfDistributionLiters: number;
  interactingFactors: string[];
  physiologicExplanation: string;
}

/**
 * Calculates estimated renal lithium clearance based on proximal tubular handling physics.
 * Lithium is filtered freely at the glomerulus; normally ~80% is reabsorbed in the proximal
 * tubule via NHE3, yielding a baseline clearance of ~20% of CrCl (FE_Li ~ 20%).
 */
export function calculateLithiumClearance(
  input: LithiumClearanceEstimateInput,
): LithiumClearanceEstimateResult {
  const {
    crclMlMin,
    weightKg,
    takingThiazide = false,
    takingNsaid = false,
    takingAceiArb = false,
    takingLoopDiuretic = false,
    isDehydrated = false,
  } = input;

  const safeCrCl = Math.max(5, Math.min(200, crclMlMin));
  const safeWeight = Math.max(30, Math.min(250, weightKg));

  // Baseline Vd ~ 0.8 L/kg
  const volumeOfDistributionLiters = safeWeight * 0.8;

  // Baseline lithium clearance is ~20% of CrCl in eunatremic, euvolemic adults
  const baselineLithiumClearanceMlMin = safeCrCl * 0.2;

  let multiplier = 1.0;
  const interactingFactors: string[] = [];

  if (takingThiazide) {
    // Thiazides block distal NCCT -> natriuresis -> compensatory proximal Na+/Li+ reabsorption
    multiplier *= 0.6; // ~40% reduction
    interactingFactors.push(
      "Thiazide Diuretic: Distal NCCT inhibition triggers compensatory proximal tubular Na+ and Li+ hyper-reabsorption (~40% clearance reduction).",
    );
  }

  if (takingNsaid) {
    // NSAIDs block renal PGE2/PGI2 -> afferent arteriolar constriction -> dropped GFR
    multiplier *= 0.75; // ~25% reduction
    interactingFactors.push(
      "NSAID: Renal prostaglandin synthesis inhibition induces afferent arteriolar vasoconstriction (~25% clearance reduction).",
    );
  }

  if (takingAceiArb) {
    // ACEi/ARBs block efferent Ang II vasoconstriction -> drops intraglomerular pressure
    multiplier *= 0.8; // ~20% reduction
    interactingFactors.push(
      "ACE Inhibitor / ARB: Efferent arteriolar dilation reduces intraglomerular hydrostatic pressure (~20% clearance reduction).",
    );
  }

  if (isDehydrated) {
    // Volume contraction stimulates angiotensin II / aldosterone -> proximal Na+ avid reabsorption
    multiplier *= 0.7; // ~30% reduction
    interactingFactors.push(
      "Volume Depletion / Dehydration: Intravascular volume contraction drives avid proximal tubular Na+/Li+ co-reabsorption (~30% clearance reduction).",
    );
  }

  if (takingLoopDiuretic && !takingThiazide) {
    // Loop diuretics cause volume contraction though less direct proximal activation than thiazides
    multiplier *= 0.85; // ~15% reduction
    interactingFactors.push(
      "Loop Diuretic: Natriuresis and volume contraction increase proximal tubular retention (~15% clearance reduction).",
    );
  }

  // Prevent clearance multiplier from dropping below 0.15 (physiologic floor)
  const safeMultiplier = Math.max(0.15, multiplier);
  const estimatedLithiumClearanceMlMin = baselineLithiumClearanceMlMin * safeMultiplier;
  const percentReduction = Math.round((1 - safeMultiplier) * 100);

  // Fractional excretion of lithium: estimated clearance / CrCl * 100%
  const fractionalExcretionPercent = (estimatedLithiumClearanceMlMin / safeCrCl) * 100;

  // Elimination half-life: t1/2 = 0.693 * Vd / Cl
  // Convert clearance to L/h: Cl (mL/min) * 0.06 = Cl (L/h)
  const clearanceLitersPerHour = estimatedLithiumClearanceMlMin * 0.06;
  const halfLifeHours = Math.round((0.693 * volumeOfDistributionLiters) / clearanceLitersPerHour);

  const physiologicExplanation =
    "Lithium is handled by the renal proximal tubule like sodium via the NHE3 antiporter. It is not reabsorbed in the distal tubule. Any hemodynamic or pharmacologic insult that contracts intravascular volume or activates the renin-angiotensin-aldosterone axis forces the proximal tubule to hyper-reabsorb sodium, trapping lithium in the circulation and drastically prolonging its elimination half-life.";

  return {
    baselineCrCl: safeCrCl,
    baselineLithiumClearanceMlMin: Math.round(baselineLithiumClearanceMlMin * 10) / 10,
    estimatedLithiumClearanceMlMin: Math.round(estimatedLithiumClearanceMlMin * 10) / 10,
    fractionalExcretionPercent: Math.round(fractionalExcretionPercent * 10) / 10,
    percentReduction,
    halfLifeHours,
    volumeOfDistributionLiters: Math.round(volumeOfDistributionLiters * 10) / 10,
    interactingFactors,
    physiologicExplanation,
  };
}

export interface LithiumDeskReport {
  hasLithium: boolean;
  warnings: string[];
  interactingDrugs: string[];
  educationalNotice: string;
}

const THIAZIDE_DRUG_IDS = new Set([
  "hctz",
  "chlorthalidone",
  "chlorothiazide",
  "lisinopril-hctz",
  "losartan-hctz",
  "valsartan-hctz",
  "hydrochlorothiazide-triamterene",
  "spironolactone-hctz",
  "bendroflumethiazide",
]);

const NSAID_DRUG_IDS = new Set([
  "ibuprofen",
  "naproxen",
  "celecoxib",
  "meloxicam",
  "ketorolac",
  "indomethacin",
  "diclofenac",
]);

const ACEI_ARB_DRUG_IDS = new Set([
  "lisinopril",
  "losartan",
  "valsartan",
  "enalapril",
  "ramipril",
  "lisinopril-hctz",
  "losartan-hctz",
  "valsartan-hctz",
  "sacubitril-valsartan",
]);

const LOOP_DRUG_IDS = new Set(["furosemide", "bumetanide", "torsemide"]);

export function lithiumReportOnDesk(
  trayDrugIds: readonly string[],
): LithiumDeskReport {
  const hasLithium = trayDrugIds.includes("lithium");
  if (!hasLithium) {
    return {
      hasLithium: false,
      warnings: [],
      interactingDrugs: [],
      educationalNotice: "",
    };
  }

  const warnings: string[] = [];
  const interactingDrugs: string[] = [];

  const thiazidesOnTray = trayDrugIds.filter((id) => THIAZIDE_DRUG_IDS.has(id));
  if (thiazidesOnTray.length > 0) {
    interactingDrugs.push(...thiazidesOnTray);
    warnings.push(
      `Major Nephrologic Collision: Thiazide Diuretics (${thiazidesOnTray.join(", ")}) + Lithium. Thiazide-induced natriuresis provokes profound compensatory proximal tubular sodium and lithium hyper-reabsorption, reducing lithium clearance by 30–50% and precipitating severe lithium toxicity.`,
    );
  }

  const nsaidsOnTray = trayDrugIds.filter((id) => NSAID_DRUG_IDS.has(id));
  if (nsaidsOnTray.length > 0) {
    interactingDrugs.push(...nsaidsOnTray);
    warnings.push(
      `Renal Prostaglandin Collision: NSAIDs (${nsaidsOnTray.join(", ")}) + Lithium. Inhibition of renal vasodilatory PGE2 and PGI2 constricts afferent arterioles, reducing GFR and decreasing lithium clearance by 20–40%.`,
    );
  }

  const raasOnTray = trayDrugIds.filter((id) => ACEI_ARB_DRUG_IDS.has(id));
  if (raasOnTray.length > 0) {
    interactingDrugs.push(...raasOnTray);
    warnings.push(
      `Hemodynamic Collision: ACE Inhibitors / ARBs (${raasOnTray.join(", ")}) + Lithium. Efferent arteriolar dilation drops intraglomerular pressure, causing progressive lithium accumulation and toxicity over several days.`,
    );
  }

  const loopsOnTray = trayDrugIds.filter((id) => LOOP_DRUG_IDS.has(id));
  if (loopsOnTray.length > 0) {
    interactingDrugs.push(...loopsOnTray);
    warnings.push(
      `Volume Depletion Alert: Loop Diuretics (${loopsOnTray.join(", ")}) + Lithium. Natriuresis and volume contraction increase risk of proximal lithium hyper-reabsorption.`,
    );
  }

  return {
    hasLithium: true,
    warnings,
    interactingDrugs: Array.from(new Set(interactingDrugs)),
    educationalNotice:
      "Educational Clinical Pharmacology Reference. Lithium has a narrow therapeutic window (0.6–1.2 mEq/L). For suspected toxicity, obtain STAT serum lithium, BMP, and ECG. Consult Nephrology and Medical Toxicology (Poison Center 1-800-222-1222).",
  };
}

