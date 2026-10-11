/**
 * Aminoglycoside Pharmacokinetics, Extended-Interval Dosing & Hartford Nomogram.
 * Weight adjustment in obesity (AdjBW 0.4), Nicolau et al. 1995 Hartford nomogram (6–14h),
 * concentration-dependent bactericidal targets, and nephrotoxicity/ototoxicity monitoring.
 * Educational reference only. Not a medical order or directive clinical decision support.
 */

import { DRUG_BY_ID } from "./catalog";
import type { Sex } from "./bedside";

export type AminoglycosideAgentId = "gentamicin" | "tobramycin" | "amikacin";

export interface AminoglycosideWeightInput {
  heightCm: number;
  weightKg: number;
  sex: Sex;
}

export interface AminoglycosideWeightResult {
  actualWeightKg: number;
  ibwKg: number;
  adjBwKg: number;
  weightToIbwRatio: number;
  weightCategory: "underweight" | "normal" | "obese";
  dosingWeightKg: number;
  recommendedWeightType: "actual" | "ibw" | "adj";
  rationale: string;
}

export function calculateAminoglycosideWeight({
  heightCm,
  weightKg,
  sex,
}: AminoglycosideWeightInput): AminoglycosideWeightResult | null {
  if (
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm < 100 ||
    heightCm > 250 ||
    weightKg < 20 ||
    weightKg > 300
  ) {
    return null;
  }

  const heightInches = heightCm / 2.54;
  const inchesOver60 = heightInches - 60;

  // Devine 1974 formula
  const baseIbw = sex === "male" ? 50 : 45.5;
  const rawIbw = baseIbw + 2.3 * inchesOver60;
  const ibwKg = Math.round(Math.max(20, rawIbw) * 10) / 10;

  // Adjusted Body Weight with 0.4 factor
  const adjBwKg = Math.round((ibwKg + 0.4 * (weightKg - ibwKg)) * 10) / 10;
  const weightToIbwRatio = Math.round((weightKg / ibwKg) * 100) / 100;

  let weightCategory: AminoglycosideWeightResult["weightCategory"] = "normal";
  let recommendedWeightType: AminoglycosideWeightResult["recommendedWeightType"] = "ibw";
  let dosingWeightKg = ibwKg;
  let rationale =
    "Actual weight is within 100–120% of IBW. Ideal Body Weight (IBW) is standard for hydrophilic aminoglycoside dosing.";

  if (weightToIbwRatio < 1.0) {
    weightCategory = "underweight";
    recommendedWeightType = "actual";
    dosingWeightKg = weightKg;
    rationale =
      "Underweight (ABW < IBW): Use Actual Body Weight. Using IBW would overestimate extracellular fluid volume and cause drug overdosing.";
  } else if (weightToIbwRatio > 1.2) {
    weightCategory = "obese";
    recommendedWeightType = "adj";
    dosingWeightKg = adjBwKg;
    rationale =
      `Obese (ABW is ${Math.round(weightToIbwRatio * 100)}% of IBW): Use Adjusted Body Weight (AdjBW = IBW + 0.4 × [ABW - IBW]). Aminoglycosides are polar/hydrophilic molecules that distribute primarily into extracellular water with poor adipose penetration (~40%). Using actual weight causes severe overdosing.`;
  }

  return {
    actualWeightKg: weightKg,
    ibwKg,
    adjBwKg,
    weightToIbwRatio,
    weightCategory,
    dosingWeightKg,
    recommendedWeightType,
    rationale,
  };
}

export type HartfordInterval = "q24h" | "q36h" | "q48h" | "off-nomogram" | "too-early" | "too-late";

export interface HartfordNomogramInput {
  agent: AminoglycosideAgentId;
  hoursPostStart: number;
  serumLevelUgMl: number;
}

export interface HartfordNomogramResult {
  agent: AminoglycosideAgentId;
  hoursPostStart: number;
  serumLevelUgMl: number;
  interval: HartfordInterval;
  q24CutoffUgMl: number | null;
  q36CutoffUgMl: number | null;
  q48CutoffUgMl: number | null;
  label: string;
  clinicalGuidance: string;
  safetyAlert: string | null;
  exclusionCriteriaNote: string;
}

export function evaluateHartfordNomogram({
  agent,
  hoursPostStart,
  serumLevelUgMl,
}: HartfordNomogramInput): HartfordNomogramResult | null {
  if (
    !Number.isFinite(hoursPostStart) ||
    !Number.isFinite(serumLevelUgMl) ||
    hoursPostStart <= 0 ||
    hoursPostStart > 48 ||
    serumLevelUgMl < 0 ||
    serumLevelUgMl > 100
  ) {
    return null;
  }

  // Exclusion criteria educational notice
  const exclusionCriteriaNote =
    "Hartford Nomogram Exclusions: (1) CrCl <20–30 mL/min; (2) Ascites, severe cirrhosis, or significant volume overload (altered Vd); (3) Burns >20% BSA; (4) Pregnancy; (5) Enterococcal endocarditis synergy (requires conventional low-dose 1 mg/kg q8h).";

  // Check timing validity (validated window is 6 to 14 hours post-infusion start)
  if (hoursPostStart < 6.0) {
    return {
      agent,
      hoursPostStart,
      serumLevelUgMl,
      interval: "too-early",
      q24CutoffUgMl: null,
      q36CutoffUgMl: null,
      q48CutoffUgMl: null,
      label: "Sample Drawn Too Early (<6 hours post-start)",
      clinicalGuidance:
        "Concentration drawn <6 hours reflects post-infusion tissue distribution. The Hartford nomogram was strictly validated for random levels drawn between 6 and 14 hours after the start of a 60-minute infusion. Redraw at appropriate time point.",
      safetyAlert: "Do not adjust interval based on pre-distribution or early levels.",
      exclusionCriteriaNote,
    };
  }

  if (hoursPostStart > 14.0) {
    return {
      agent,
      hoursPostStart,
      serumLevelUgMl,
      interval: "too-late",
      q24CutoffUgMl: null,
      q36CutoffUgMl: null,
      q48CutoffUgMl: null,
      label: "Sample Drawn Too Late (>14 hours post-start)",
      clinicalGuidance:
        "Concentrations drawn >14 hours cannot be interpreted on the Hartford nomogram. Wait for concentration to clear to <1 µg/mL before administering another dose, and check serial serum creatinine.",
      safetyAlert: "Delayed sampling: Hartford nomogram lines terminate at 14 hours.",
      exclusionCriteriaNote,
    };
  }

  // Multiplier for Amikacin (15 mg/kg base vs 7 mg/kg gent/tobra):
  // Amikacin reference concentrations are 2.5x gentamicin/tobramycin
  const amikacinFactor = agent === "amikacin" ? 2.5 : 1.0;

  // Hartford lines based on Nicolau et al. 1995:
  // At t = 6h: Q24h line = 8.5, Q36h line = 12.0, Q48h line = 16.0
  // Slope = -0.194 per hour
  const deltaT = hoursPostStart - 6.0;
  const decay = Math.exp(-0.194 * deltaT);

  const q24CutoffUgMl = Math.round(8.5 * decay * amikacinFactor * 10) / 10;
  const q36CutoffUgMl = Math.round(12.0 * decay * amikacinFactor * 10) / 10;
  const q48CutoffUgMl = Math.round(16.0 * decay * amikacinFactor * 10) / 10;

  let interval: HartfordInterval = "q24h";
  let label = "Q24H Dosing Interval (Normal Clearance)";
  let clinicalGuidance =
    "Concentration falls below the Q24h line. Continue standard 24-hour dosing interval. Concentration-dependent bactericidal killing is maintained with adequate drug-free period to prevent receptor saturation.";
  let safetyAlert: string | null = null;

  if (serumLevelUgMl > q48CutoffUgMl) {
    interval = "off-nomogram";
    label = "OFF NOMOGRAM · Critical Accumulation Risk";
    clinicalGuidance =
      `Serum level exceeds the Q48h threshold (${q48CutoffUgMl} µg/mL). STOP extended-interval dosing. Do not administer scheduled dose. Monitor daily serum creatinine and follow serial levels until concentration clears to <1 µg/mL (<4–5 µg/mL for amikacin) before considering further doses.`;
    safetyAlert =
      "High toxicity watch: Proximal tubular accumulation and inner ear hair cell saturation. Evaluate for acute kidney injury or synergistic nephrotoxins.";
  } else if (serumLevelUgMl > q36CutoffUgMl) {
    interval = "q48h";
    label = "Q48H Dosing Interval (Severely Reduced Clearance)";
    clinicalGuidance =
      `Serum level falls between the Q36h line (${q36CutoffUgMl} µg/mL) and Q48h line (${q48CutoffUgMl} µg/mL). Extend dosing interval to Every 48 Hours to permit adequate wash-out.`;
    safetyAlert = "Re-check renal function prior to next scheduled infusion.";
  } else if (serumLevelUgMl > q24CutoffUgMl) {
    interval = "q36h";
    label = "Q36H Dosing Interval (Moderately Reduced Clearance)";
    clinicalGuidance =
      `Serum level falls between the Q24h line (${q24CutoffUgMl} µg/mL) and Q36h line (${q36CutoffUgMl} µg/mL). Extend dosing interval to Every 36 Hours.`;
  }

  return {
    agent,
    hoursPostStart,
    serumLevelUgMl,
    interval,
    q24CutoffUgMl,
    q36CutoffUgMl,
    q48CutoffUgMl,
    label,
    clinicalGuidance,
    safetyAlert,
    exclusionCriteriaNote,
  };
}

export interface TraditionalAgTarget {
  agent: AminoglycosideAgentId;
  indication: "severe-sepsis-pneumonia" | "urinary-tract" | "synergy-endocarditis";
  peakTargetUgMl: string;
  troughTargetUgMl: string;
  rationale: string;
}

export const TRADITIONAL_AG_TARGETS: Record<
  AminoglycosideAgentId,
  Record<TraditionalAgTarget["indication"], TraditionalAgTarget>
> = {
  gentamicin: {
    "severe-sepsis-pneumonia": {
      agent: "gentamicin",
      indication: "severe-sepsis-pneumonia",
      peakTargetUgMl: "8–10 µg/mL",
      troughTargetUgMl: "<1.0–2.0 µg/mL",
      rationale: "Maximizes Cmax:MIC ratio (≥8–10) for Gram-negative bacilli; low trough prevents proximal tubule endocytosis.",
    },
    "urinary-tract": {
      agent: "gentamicin",
      indication: "urinary-tract",
      peakTargetUgMl: "4–6 µg/mL",
      troughTargetUgMl: "<1.0 µg/mL",
      rationale: "Urinary concentrations are 50–100x higher than serum due to extensive glomerular filtration.",
    },
    "synergy-endocarditis": {
      agent: "gentamicin",
      indication: "synergy-endocarditis",
      peakTargetUgMl: "3–4 µg/mL",
      troughTargetUgMl: "<1.0 µg/mL",
      rationale: "Low-dose synergy (1 mg/kg q8h) with cell-wall active agents (ampicillin/vancomycin) for Enterococcus / Strep endocarditis.",
    },
  },
  tobramycin: {
    "severe-sepsis-pneumonia": {
      agent: "tobramycin",
      indication: "severe-sepsis-pneumonia",
      peakTargetUgMl: "8–10 µg/mL",
      troughTargetUgMl: "<1.0–2.0 µg/mL",
      rationale: "Preferred aminoglycoside against Pseudomonas aeruginosa. Cmax:MIC ≥10 required for lung tissue penetration.",
    },
    "urinary-tract": {
      agent: "tobramycin",
      indication: "urinary-tract",
      peakTargetUgMl: "4–6 µg/mL",
      troughTargetUgMl: "<1.0 µg/mL",
      rationale: "High urinary excretion; low troughs minimize renal cortical accumulation.",
    },
    "synergy-endocarditis": {
      agent: "tobramycin",
      indication: "synergy-endocarditis",
      peakTargetUgMl: "3–4 µg/mL",
      troughTargetUgMl: "<1.0 µg/mL",
      rationale: "Synergy targets align with gentamicin when tobramycin is selected.",
    },
  },
  amikacin: {
    "severe-sepsis-pneumonia": {
      agent: "amikacin",
      indication: "severe-sepsis-pneumonia",
      peakTargetUgMl: "25–35 µg/mL",
      troughTargetUgMl: "<4.0–8.0 µg/mL",
      rationale: "Higher target range due to broader resistance against aminoglycoside-modifying enzymes (AMEs).",
    },
    "urinary-tract": {
      agent: "amikacin",
      indication: "urinary-tract",
      peakTargetUgMl: "15–20 µg/mL",
      troughTargetUgMl: "<4.0 µg/mL",
      rationale: "Effective against MDR urinary isolates.",
    },
    "synergy-endocarditis": {
      agent: "amikacin",
      indication: "synergy-endocarditis",
      peakTargetUgMl: "15–20 µg/mL",
      troughTargetUgMl: "<4.0 µg/mL",
      rationale: "Rarely utilized for synergy; reserve for isolates resistant to gentamicin/tobramycin.",
    },
  },
};

export const AMINOGLYCOSIDE_IDS = new Set<string>(["gentamicin", "tobramycin", "amikacin"]);

export function aminoglycosidesOnDesk(ids: string[]): boolean {
  return ids.some((id) => AMINOGLYCOSIDE_IDS.has(id));
}

export interface AminoglycosideReport {
  hasAminoglycoside: boolean;
  presentAgents: string[];
  activeAgentId: AminoglycosideAgentId | null;
  hasVancomycinCollision: boolean;
  hasLoopDiureticCollision: boolean;
  nephrotoxicityAlert: string | null;
  ototoxicityAlert: string | null;
}

export function aminoglycosideReportOnDesk(ids: string[]): AminoglycosideReport {
  const present = ids.filter((id): id is AminoglycosideAgentId => AMINOGLYCOSIDE_IDS.has(id));
  const hasAg = present.length > 0;
  const activeAgentId = present[0] ?? null;

  const hasVanco = ids.includes("vancomycin");
  const hasLoop = ids.some((id) => ["furosemide", "bumetanide", "torsemide"].includes(id));

  let nephrotoxicityAlert: string | null = null;
  if (hasAg && hasVanco) {
    nephrotoxicityAlert =
      "Synergistic Nephrotoxicity Collision: Aminoglycoside + Vancomycin. Concurrent administration produces additive proximal tubular injury, markedly multiplying acute kidney injury (AKI) incidence. Monitor daily serum creatinine and maintain minimal troughs.";
  } else if (hasAg && hasLoop) {
    nephrotoxicityAlert =
      "Nephrotoxicity / Ototoxicity Stacking: Aminoglycoside + Loop Diuretic. Furosemide impairs aminoglycoside cochlear clearance and concentrates drug in inner ear perilymph, accelerating cochlear hair cell apoptosis.";
  } else if (hasAg) {
    nephrotoxicityAlert =
      "Megalin-Mediated Nephrotoxicity: Filtered aminoglycosides are reabsorbed via megalin/cubilin receptors into proximal tubular epithelial cells, accumulating in lysosomes and provoking phospholipidosis / ATN. Once-daily dosing mitigates receptor uptake by saturating endocytosis.";
  }

  let ototoxicityAlert: string | null = null;
  if (hasAg) {
    ototoxicityAlert =
      "Irreversible Sensory Ototoxicity: Aminoglycosides accumulate in inner ear endolymph and perilymph, generating reactive oxygen species that cause apoptosis of outer hair cells in the organ of Corti and vestibular labyrinth. High-frequency sensorineural hearing loss and vestibulopathy (oscillopsia) are frequently permanent. Mitochondrial 12S rRNA m.1555A>G mutation confers extreme hypersusceptibility.";
  }

  return {
    hasAminoglycoside: hasAg,
    presentAgents: present.map((id) => DRUG_BY_ID[id]?.name ?? id),
    activeAgentId,
    hasVancomycinCollision: hasAg && hasVanco,
    hasLoopDiureticCollision: hasAg && hasLoop,
    nephrotoxicityAlert,
    ototoxicityAlert,
  };
}

