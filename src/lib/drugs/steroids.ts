/** Systemic Corticosteroid Equivalence, Relative Potencies, and HPA Axis Suppression Teaching Station.
 * Non-device educational clinical pharmacology reference. Not a prescribing calculator.
 */

import { DRUG_BY_ID } from "./catalog";

export type DurationCategory = "short" | "intermediate" | "long";

export interface SteroidAgent {
  id: string;
  name: string;
  brandNames: string[];
  equivDoseMg: number;
  antiInflammatoryPotency: number;
  mineralocorticoidPotency: number;
  durationCategory: DurationCategory;
  biologicHalfLifeHours: string;
  plasmaHalfLifeHours: string;
  hepaticConversion: boolean;
  clinicalPearls: string;
  inCatalog: boolean;
}

export const STEROID_AGENTS: SteroidAgent[] = [
  {
    id: "hydrocortisone",
    name: "Hydrocortisone",
    brandNames: ["Cortef", "Solu-Cortef"],
    equivDoseMg: 20,
    antiInflammatoryPotency: 1,
    mineralocorticoidPotency: 1,
    durationCategory: "short",
    biologicHalfLifeHours: "8–12 h",
    plasmaHalfLifeHours: "1.5–2 h",
    hepaticConversion: false,
    clinicalPearls:
      "Endogenous cortisol equivalent. Reference standard (potency = 1). Carries significant mineralocorticoid activity (sodium/water retention, hypokalemia). Drug of choice for adrenal crisis stress-dosing and primary adrenal replacement.",
    inCatalog: Boolean(DRUG_BY_ID["hydrocortisone"]),
  },
  {
    id: "cortisone",
    name: "Cortisone",
    brandNames: ["Cortone"],
    equivDoseMg: 25,
    antiInflammatoryPotency: 0.8,
    mineralocorticoidPotency: 0.8,
    durationCategory: "short",
    biologicHalfLifeHours: "8–12 h",
    plasmaHalfLifeHours: "0.5–1 h",
    hepaticConversion: true,
    clinicalPearls:
      "Inactive prodrug requiring hepatic 11β-hydroxysteroid dehydrogenase type 1 (11β-HSD1) reduction to active hydrocortisone. Avoid in severe hepatic failure (Child-Pugh C) where conversion is impaired.",
    inCatalog: Boolean(DRUG_BY_ID["cortisone"]),
  },
  {
    id: "prednisone",
    name: "Prednisone",
    brandNames: ["Deltasone", "Rayos"],
    equivDoseMg: 5,
    antiInflammatoryPotency: 4,
    mineralocorticoidPotency: 0.8,
    durationCategory: "intermediate",
    biologicHalfLifeHours: "18–36 h",
    plasmaHalfLifeHours: "2–3 h",
    hepaticConversion: true,
    clinicalPearls:
      "Inactive prodrug converted in liver by 11β-HSD1 to active prednisolone. Four times more potent than hydrocortisone with modest mineralocorticoid retention. Benchmark agent for outpatient inflammatory regimens and HPA equivalence math.",
    inCatalog: Boolean(DRUG_BY_ID["prednisone"]),
  },
  {
    id: "prednisolone",
    name: "Prednisolone",
    brandNames: ["Prelone", "Orapred", "Millipred"],
    equivDoseMg: 5,
    antiInflammatoryPotency: 4,
    mineralocorticoidPotency: 0.8,
    durationCategory: "intermediate",
    biologicHalfLifeHours: "18–36 h",
    plasmaHalfLifeHours: "2–4 h",
    hepaticConversion: false,
    clinicalPearls:
      "Active form of prednisone. Bypasses hepatic bioactivation; preferred oral agent in severe liver cirrhosis and common pediatric liquid formulation.",
    inCatalog: Boolean(DRUG_BY_ID["prednisolone"]),
  },
  {
    id: "methylprednisolone",
    name: "Methylprednisolone",
    brandNames: ["Medrol", "Solu-Medrol", "Depo-Medrol"],
    equivDoseMg: 4,
    antiInflammatoryPotency: 5,
    mineralocorticoidPotency: 0,
    durationCategory: "intermediate",
    biologicHalfLifeHours: "18–36 h",
    plasmaHalfLifeHours: "2–3 h",
    hepaticConversion: false,
    clinicalPearls:
      "Methylated analogue of prednisolone. Zero mineralocorticoid activity (minimal fluid retention). Frequent choice for acute inpatient IV pulse therapy (asthma, COPD, spinal cord, transplant rejection).",
    inCatalog: Boolean(DRUG_BY_ID["methylprednisolone"]),
  },
  {
    id: "triamcinolone",
    name: "Triamcinolone",
    brandNames: ["Kenalog", "Aristocort"],
    equivDoseMg: 4,
    antiInflammatoryPotency: 5,
    mineralocorticoidPotency: 0,
    durationCategory: "intermediate",
    biologicHalfLifeHours: "18–36 h",
    plasmaHalfLifeHours: "2–5 h",
    hepaticConversion: false,
    clinicalPearls:
      "Fluorinated intermediate-acting steroid with zero mineralocorticoid effect. Frequently formulated for intra-articular, intramuscular depot, or topical/inhaled administration.",
    inCatalog: Boolean(DRUG_BY_ID["triamcinolone"]),
  },
  {
    id: "dexamethasone",
    name: "Dexamethasone",
    brandNames: ["Decadron", "DexPak"],
    equivDoseMg: 0.75,
    antiInflammatoryPotency: 25,
    mineralocorticoidPotency: 0,
    durationCategory: "long",
    biologicHalfLifeHours: "36–54 h",
    plasmaHalfLifeHours: "3–4.5 h",
    hepaticConversion: false,
    clinicalPearls:
      "Highly potent long-acting fluorinated glucocorticoid with zero mineralocorticoid effect. Crosses blood-brain barrier effectively (drug of choice for cerebral edema/CNS tumors). Does not cross-react in serum cortisol assays (used in overnight dexamethasone suppression test). Moderate CYP3A4 inducer.",
    inCatalog: Boolean(DRUG_BY_ID["dexamethasone"]),
  },
  {
    id: "betamethasone",
    name: "Betamethasone",
    brandNames: ["Celestone"],
    equivDoseMg: 0.6,
    antiInflammatoryPotency: 25,
    mineralocorticoidPotency: 0,
    durationCategory: "long",
    biologicHalfLifeHours: "36–54 h",
    plasmaHalfLifeHours: "3–5 h",
    hepaticConversion: false,
    clinicalPearls:
      "Stereoisomer of dexamethasone with identical long-acting potency and zero mineralocorticoid retention. Crosses the placenta; standard regimen for antenatal fetal lung maturation in preterm labor.",
    inCatalog: Boolean(DRUG_BY_ID["betamethasone"]),
  },
  {
    id: "fludrocortisone",
    name: "Fludrocortisone",
    brandNames: ["Florinef"],
    equivDoseMg: 0.1,
    antiInflammatoryPotency: 10,
    mineralocorticoidPotency: 125,
    durationCategory: "intermediate",
    biologicHalfLifeHours: "18–36 h",
    plasmaHalfLifeHours: "3.5 h",
    hepaticConversion: false,
    clinicalPearls:
      "Potent synthetic mineralocorticoid (mineralocorticoid potency ~125–250× hydrocortisone). Used at small doses (0.05–0.2 mg/day) exclusively for aldosterone replacement in primary adrenal insufficiency (Addison's) and severe orthostatic hypotension.",
    inCatalog: Boolean(DRUG_BY_ID["fludrocortisone"]),
  },
];

export const STEROID_BY_ID: Record<string, SteroidAgent> = Object.fromEntries(
  STEROID_AGENTS.map((a) => [a.id, a]),
);

export interface SteroidConversionInput {
  fromDrugId: string;
  amountMg: number;
  targetDrugId?: string;
}

export interface ConvertedTarget {
  id: string;
  name: string;
  equivDoseMg: number;
  amountMg: number;
  antiInflammatoryPotency: number;
  mineralocorticoidPotency: number;
}

export interface SteroidConversionResult {
  fromAgent: SteroidAgent;
  sourceAmountMg: number;
  prednisoneEqMg: number;
  hydrocortisoneEqMg: number;
  conversions: ConvertedTarget[];
  specificTarget: ConvertedTarget | null;
  mineralocorticoidWarning: string | null;
  hepaticProdrugNote: string | null;
}

/** Convert a systemic corticosteroid dose into therapeutic equivalents */
export function convertSteroid({
  fromDrugId,
  amountMg,
  targetDrugId,
}: SteroidConversionInput): SteroidConversionResult | null {
  const fromAgent = STEROID_BY_ID[fromDrugId];
  if (!fromAgent || !Number.isFinite(amountMg) || amountMg <= 0 || amountMg > 5000) {
    return null;
  }

  // Equivalent ratio: (amountMg / fromAgent.equivDoseMg) * targetAgent.equivDoseMg
  const equivFactor = amountMg / fromAgent.equivDoseMg;
  const prednisoneEqMg = Math.round(equivFactor * 5 * 100) / 100;
  const hydrocortisoneEqMg = Math.round(equivFactor * 20 * 100) / 100;

  const conversions: ConvertedTarget[] = STEROID_AGENTS.map((target) => {
    const targetAmount = Math.round(equivFactor * target.equivDoseMg * 100) / 100;
    return {
      id: target.id,
      name: target.name,
      equivDoseMg: target.equivDoseMg,
      amountMg: targetAmount,
      antiInflammatoryPotency: target.antiInflammatoryPotency,
      mineralocorticoidPotency: target.mineralocorticoidPotency,
    };
  });

  const specificTarget = targetDrugId
    ? conversions.find((c) => c.id === targetDrugId) ?? null
    : null;

  let mineralocorticoidWarning: string | null = null;
  if (fromAgent.mineralocorticoidPotency >= 0.8 && amountMg >= fromAgent.equivDoseMg) {
    mineralocorticoidWarning =
      `${fromAgent.name} carries significant mineralocorticoid activity (potency ${fromAgent.mineralocorticoidPotency}). Watch for sodium/water retention, edema, blood pressure elevation, and hypokalemia. Dexamethasone and methylprednisolone have zero mineralocorticoid effect.`;
  }

  let hepaticProdrugNote: string | null = null;
  if (fromAgent.hepaticConversion) {
    hepaticProdrugNote =
      `${fromAgent.name} is an inactive prodrug requiring hepatic conversion by 11β-HSD1 to active ${fromAgent.id === "prednisone" ? "prednisolone" : "hydrocortisone"}. In severe hepatic impairment (cirrhosis / Child-Pugh C), direct active agents are preferred.`;
  }

  return {
    fromAgent,
    sourceAmountMg: amountMg,
    prednisoneEqMg,
    hydrocortisoneEqMg,
    conversions,
    specificTarget,
    mineralocorticoidWarning,
    hepaticProdrugNote,
  };
}

export type DosingTiming = "morning" | "evening" | "divided";

export interface HpaSuppressionInput {
  prednisoneEqMgPerDay: number;
  durationWeeks: number;
  timing?: DosingTiming;
  cushingoidFeatures?: boolean;
}

export interface HpaSuppressionResult {
  risk: "low" | "intermediate" | "high";
  label: string;
  summary: string;
  taperRecommendation: string;
  stressDoseNeeded: boolean;
  stressDoseGuidance: string;
  pjpProphylaxisNote: string | null;
  glucoseWatch: string;
}

/** Assess hypothalamic-pituitary-adrenal (HPA) axis suppression risk and tapering principles */
export function hpaSuppressionRisk({
  prednisoneEqMgPerDay,
  durationWeeks,
  timing = "morning",
  cushingoidFeatures = false,
}: HpaSuppressionInput): HpaSuppressionResult | null {
  if (
    !Number.isFinite(prednisoneEqMgPerDay) ||
    !Number.isFinite(durationWeeks) ||
    prednisoneEqMgPerDay <= 0 ||
    prednisoneEqMgPerDay > 2000 ||
    durationWeeks < 0 ||
    durationWeeks > 260
  ) {
    return null;
  }

  // Endocrine Society / CDC / UpToDate Consensus Criteria:
  // High Risk:
  // - >20 mg/day prednisone equivalent for >3 weeks
  // - Clinical Cushingoid appearance
  // - Evening or divided dosing for >2-3 weeks at >=5 mg/day
  // Low Risk:
  // - Any dose for <3 weeks (<21 days)
  // - Morning physiologic replacement (<5 mg/day prednisone eq)
  // Intermediate Risk:
  // - 10-20 mg/day prednisone eq for >3 weeks

  let risk: HpaSuppressionResult["risk"] = "intermediate";
  let label = "Intermediate HPA axis suppression risk (suppression possible)";
  let summary =
    "Individual HPA axis sensitivity varies widely in this range. Pituitary-adrenal reserve may be partially blunted.";
  let taperRecommendation =
    "Gradual tapering is standard to prevent rebound flare of the underlying disease and allow gradual HPA axis recovery. Early morning cortisol or ACTH stimulation testing can verify adrenal recovery if clinically uncertain.";
  let stressDoseNeeded = false;
  let stressDoseGuidance =
    "Consider perioperative stress-dose hydrocortisone for major surgery or critical illness if clinical signs of adrenal insufficiency arise, or evaluate with early morning cortisol.";

  if (
    durationWeeks > 3 &&
    (prednisoneEqMgPerDay > 20 || cushingoidFeatures || (timing !== "morning" && prednisoneEqMgPerDay >= 5))
  ) {
    risk = "high";
    label = "High HPA axis suppression risk (suppression expected)";
    summary =
      "Prolonged supraphysiologic glucocorticoid exposure suppresses hypothalamic CRH and pituitary ACTH, inducing bilateral adrenocortical atrophy. Abrupt withdrawal risks life-threatening acute adrenal crisis.";
    taperRecommendation =
      "Gradual steroid taper is mandatory. Tapering allows the adrenal cortex months to recover physiologic secretory capacity. Do not discontinue abruptly.";
    stressDoseNeeded = true;
    stressDoseGuidance =
      "Stress-dose hydrocortisone coverage is indicated during acute critical illness, severe trauma, or major surgical procedures until the HPA axis has fully recovered.";
  } else if (durationWeeks < 3 || (prednisoneEqMgPerDay < 5 && timing === "morning")) {
    risk = "low";
    label = "Low HPA axis suppression risk (suppression unlikely)";
    summary =
      "Short courses (<3 weeks) or physiologic morning replacement (<5 mg/d prednisone equivalent) rarely cause clinically significant adrenocortical atrophy.";
    taperRecommendation =
      "Tapering is generally not required for HPA recovery reasons alone, though gradual withdrawal may still be prudent if underlying inflammatory disease is prone to rapid relapse.";
    stressDoseNeeded = false;
    stressDoseGuidance = "Supplemental perioperative stress dosing is typically unnecessary.";
  }

  // PJP Prophylaxis Reminder:
  // Prednisone equivalent >=20 mg/day for >=4 weeks in patients with underlying immunocompromise
  let pjpProphylaxisNote: string | null = null;
  if (prednisoneEqMgPerDay >= 20 && durationWeeks >= 4) {
    pjpProphylaxisNote =
      "Opportunistic infection watch: Sustained prednisone equivalent ≥20 mg/day for ≥4 weeks confers cellular immunosuppression. Guidelines recommend evaluating the indication for Pneumocystis jirovecii pneumonia (PJP) prophylaxis (e.g. TMP-SMX).";
  }

  const glucoseWatch =
    "Glucocorticoids induce hepatic gluconeogenesis and peripheral insulin resistance. Peak postprandial glucose spike typically occurs in late afternoon (4–8 hours post-dose). Fasting morning blood glucose alone often underestimates daily glycemic excursions.";

  return {
    risk,
    label,
    summary,
    taperRecommendation,
    stressDoseNeeded,
    stressDoseGuidance,
    pjpProphylaxisNote,
    glucoseWatch,
  };
}

/** Check if any steroid agent is currently placed on the desk tray */
export function steroidsOnDesk(ids: string[]): SteroidAgent[] {
  return STEROID_AGENTS.filter((agent) => ids.includes(agent.id));
}

/** Generate a summary report for any steroids on the desk tray */
export interface SteroidReport {
  present: SteroidAgent[];
  summary: string;
  hasSteroid: boolean;
  pearls: string[];
}

export function steroidReportOnDesk(ids: string[]): SteroidReport {
  const present = steroidsOnDesk(ids);
  if (!present.length) {
    return {
      present: [],
      summary: "No systemic corticosteroid on the active tray.",
      hasSteroid: false,
      pearls: [],
    };
  }

  const names = present.map((p) => p.name).join(", ");
  const summary = `Active corticosteroid${present.length > 1 ? "s" : ""} on tray: ${names}.`;
  const pearls = present.map((p) => `${p.name}: ${p.clinicalPearls}`);

  return {
    present,
    summary,
    hasSteroid: true,
    pearls,
  };
}

