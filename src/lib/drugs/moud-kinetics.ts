/**
 * Medications for Opioid Use Disorder (MOUD), Harm Reduction & Addiction Medicine Kinetics Engine
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support Architecture:
 * - Transparent receptor affinity, partial agonist efficacy, lipophilic depot elimination,
 *   and continuous infusion pharmacodynamics
 * - Canonical peer-reviewed citations:
 *   ASAM National Practice Guideline for the Treatment of Opioid Use Disorder (2020),
 *   Hämmig et al., Use of buprenorphine in 'micro-doses' to induce patients with full opioid agonist (Bernese method). Addict Sci Clin Pract. 2016;11(1):17,
 *   Greenwald et al., Buprenorphine maintenance and mu-opioid receptor availability. Neuropsychopharmacology. 2003,
 *   Huhn et al., Protracted renal and lipophilic clearance of illicit fentanyl. Drug Alcohol Depend. 2020,
 *   Kerr et al., Xylazine: Pharmacology, Clinical Presentation, and Harm Reduction. CDC / MMWR 2023,
 *   SAMHSA Opioid Overdose Prevention Toolkit (2020).
 * - Strictly non-prescriptive: educational decision support, risk calculators, and pharmacological modeling.
 */

import type { HostContext } from "./types";

export const NOT_CLEARED =
  "Educational & harm reduction reference only. Not an FDA-cleared medical device, prescription order, or diagnostic mandate. Licensed clinical judgment required under FD&C Act § 520(o)(1)(E).";

export const PI_FOOTER =
  "Evidence base reflects ASAM, SAMHSA, CDC, and peer-reviewed addiction medicine literature. Individual patient clinical presentation, objective withdrawal scores, and real-time airway monitoring supersede static models.";

export interface OpioidReceptorAffinity {
  agent: string;
  kiNanomolar: number; // lower = higher binding affinity
  intrinsicEfficacyAlpha: number; // 0.0 (antagonist) to 1.0 (full agonist)
  relativeAffinityRank: number; // 1 = highest affinity
  durationHours: number;
}

export const OPIOID_RECEPTOR_AFFINITIES: Record<string, OpioidReceptorAffinity> = {
  buprenorphine: {
    agent: "Buprenorphine",
    kiNanomolar: 0.21,
    intrinsicEfficacyAlpha: 0.32,
    relativeAffinityRank: 1,
    durationHours: 24,
  },
  fentanyl: {
    agent: "Fentanyl",
    kiNanomolar: 1.2,
    intrinsicEfficacyAlpha: 1.0,
    relativeAffinityRank: 2,
    durationHours: 1.5, // acute single bolus redistribution; chronic depot much longer
  },
  morphine: {
    agent: "Morphine",
    kiNanomolar: 1.8,
    intrinsicEfficacyAlpha: 1.0,
    relativeAffinityRank: 3,
    durationHours: 4,
  },
  methadone: {
    agent: "Methadone",
    kiNanomolar: 3.2,
    intrinsicEfficacyAlpha: 1.0,
    relativeAffinityRank: 4,
    durationHours: 28,
  },
  oxycodone: {
    agent: "Oxycodone",
    kiNanomolar: 18.0,
    intrinsicEfficacyAlpha: 1.0,
    relativeAffinityRank: 5,
    durationHours: 4.5,
  },
  naloxone: {
    agent: "Naloxone (Antagonist)",
    kiNanomolar: 1.4,
    intrinsicEfficacyAlpha: 0.0,
    relativeAffinityRank: 2,
    durationHours: 0.75, // 45-60 min duration of action
  },
  naltrexone: {
    agent: "Naltrexone (Antagonist)",
    kiNanomolar: 0.26,
    intrinsicEfficacyAlpha: 0.0,
    relativeAffinityRank: 1,
    durationHours: 48,
  },
};

/**
 * Precipitated Withdrawal Risk Evaluator
 */
export interface PrecipitatedWithdrawalAssessment {
  riskTier: "high" | "moderate" | "low" | "minimal";
  riskScore: number; // 0 to 10
  receptorMechanism: string;
  cowsRecommendation: string;
  alternativeStrategy: string;
}

export function evaluatePrecipitatedWithdrawalRisk(options: {
  lastFullAgonistUsed: "fentanyl" | "methadone" | "short-acting (oxycodone/heroin/morphine)";
  hoursSinceLastUse: number;
  currentCowsScore?: number;
  inductionApproach: "traditional" | "bernese-micro-induction" | "high-dose-macro-induction";
}): PrecipitatedWithdrawalAssessment {
  const { lastFullAgonistUsed, hoursSinceLastUse, currentCowsScore, inductionApproach } = options;

  if (inductionApproach === "bernese-micro-induction") {
    return {
      riskTier: "minimal",
      riskScore: 1,
      receptorMechanism:
        "Micro-induction uses sub-milligram doses (0.5 mg) that occupy only 2-5% of mu receptors, avoiding acute drop in net signaling. Full-agonist baseline is maintained during stepwise titration.",
      cowsRecommendation: "Objective withdrawal is NOT required. Patient should remain on baseline full-agonist.",
      alternativeStrategy: "Continue standard 7-day Bernese micro-dosing schedule.",
    };
  }

  let baseRiskScore = 0;
  if (lastFullAgonistUsed === "fentanyl") {
    baseRiskScore = hoursSinceLastUse < 24 ? 9 : hoursSinceLastUse < 48 ? 7 : 4;
  } else if (lastFullAgonistUsed === "methadone") {
    baseRiskScore = hoursSinceLastUse < 36 ? 9 : hoursSinceLastUse < 72 ? 6 : 3;
  } else {
    baseRiskScore = hoursSinceLastUse < 12 ? 8 : hoursSinceLastUse < 24 ? 4 : 1;
  }

  if (currentCowsScore !== undefined) {
    if (currentCowsScore >= 13) {
      baseRiskScore = Math.max(1, baseRiskScore - 4);
    } else if (currentCowsScore < 8) {
      baseRiskScore = Math.min(10, baseRiskScore + 2);
    }
  }

  let riskTier: "high" | "moderate" | "low" | "minimal" = "minimal";
  if (baseRiskScore >= 7) riskTier = "high";
  else if (baseRiskScore >= 4) riskTier = "moderate";
  else if (baseRiskScore >= 2) riskTier = "low";

  return {
    riskTier,
    riskScore: baseRiskScore,
    receptorMechanism:
      "Buprenorphine Ki (~0.21 nM) displaces full agonists with higher Ki (~1-3 nM). Low intrinsic efficacy (alpha ~0.32) precipitously collapses net receptor activation from 100% to ~30%, precipitating autonomic storm.",
    cowsRecommendation:
      currentCowsScore !== undefined && currentCowsScore < 12
        ? `Current COWS score (${currentCowsScore}) is subtherapeutic for traditional induction. Require COWS >= 12 to 13 before first standard buprenorphine dose.`
        : "Ensure documented objective withdrawal signs (dilated pupils, piloerection, tremor, vomiting/diarrhea) before standard induction.",
    alternativeStrategy:
      lastFullAgonistUsed === "fentanyl" && hoursSinceLastUse < 48
        ? "Due to lipophilic fentanyl adipose accumulation, consider low-dose Bernese micro-induction to bypass withdrawal wait."
        : "Standard 2 to 4 mg buprenorphine test dose once COWS criteria met.",
  };
}

/**
 * Bernese Micro-Induction Titration Protocol (Hämmig et al., 2016)
 */
export interface BerneseProtocolStep {
  day: number;
  buprenorphineDose: string;
  fullAgonistInstruction: string;
  estimatedReceptorOccupancyPercent: number;
  clinicalNote: string;
}

export const BERNESE_PROTOCOL_SCHEDULE: readonly BerneseProtocolStep[] = [
  {
    day: 1,
    buprenorphineDose: "0.5 mg sublingual once daily",
    fullAgonistInstruction: "Continue regular baseline full-agonist opioid unchanged",
    estimatedReceptorOccupancyPercent: 3,
    clinicalNote: "Imperceptible receptor occupancy; zero withdrawal expected.",
  },
  {
    day: 2,
    buprenorphineDose: "0.5 mg sublingual twice daily (1 mg total)",
    fullAgonistInstruction: "Continue regular baseline full-agonist opioid unchanged",
    estimatedReceptorOccupancyPercent: 7,
    clinicalNote: "Steady state begins building given buprenorphine 24-36h half-life.",
  },
  {
    day: 3,
    buprenorphineDose: "1.0 mg sublingual twice daily (2 mg total)",
    fullAgonistInstruction: "Continue regular baseline full-agonist opioid unchanged",
    estimatedReceptorOccupancyPercent: 15,
    clinicalNote: "Gradual competitive displacement of full agonists begins without signal drop.",
  },
  {
    day: 4,
    buprenorphineDose: "2.0 mg sublingual twice daily (4 mg total)",
    fullAgonistInstruction: "Continue regular baseline full-agonist opioid unchanged",
    estimatedReceptorOccupancyPercent: 30,
    clinicalNote: "Patient may note slight blunting of full-agonist euphoria.",
  },
  {
    day: 5,
    buprenorphineDose: "4.0 mg sublingual twice daily (8 mg total)",
    fullAgonistInstruction: "Continue regular baseline full-agonist opioid unchanged",
    estimatedReceptorOccupancyPercent: 55,
    clinicalNote: "Over half of mu receptors occupied by buprenorphine.",
  },
  {
    day: 6,
    buprenorphineDose: "8.0 mg sublingual once in AM, 4.0 mg in PM (12 mg total)",
    fullAgonistInstruction: "Begin voluntary reduction / taper of full-agonist opioid",
    estimatedReceptorOccupancyPercent: 75,
    clinicalNote: "Cravings significantly suppressed; patient comfortable.",
  },
  {
    day: 7,
    buprenorphineDose: "16.0 mg sublingual once daily (target maintenance dose)",
    fullAgonistInstruction: "STOP full-agonist opioid completely",
    estimatedReceptorOccupancyPercent: 88,
    clinicalNote: "Receptors fully saturated by buprenorphine (>85% occupancy). Transition complete.",
  },
];

/**
 * Naloxone Renarcotization Hazard & Continuous Infusion Calculator
 */
export interface NaloxoneInfusionPlan {
  bolusDoseAdministeredMg: number;
  hourlyContinuousInfusionMg: number; // 2/3 of waking bolus
  hourlyInfusionMlPerHour: number; // assuming standard 4 mg / 100 mL NS bag (0.04 mg/mL)
  minimumObservationHours: number;
  renarcotizationRiskLevel: "high" | "moderate" | "low";
  pharmacokineticTrap: string;
}

export function calculateNaloxoneInfusion(options: {
  successfulBolusMg: number;
  suspectedOpioid: "methadone" | "fentanyl" | "extended-release oxycodone" | "short-acting heroin/morphine";
}): NaloxoneInfusionPlan {
  const { successfulBolusMg, suspectedOpioid } = options;

  const hourlyRateMg = Math.round((successfulBolusMg * (2 / 3)) * 100) / 100;
  // Standard concentration: 4 mg in 100 mL D5W or 0.9% NS = 0.04 mg/mL
  const concentrationMgPerMl = 0.04;
  const rateMlPerHour = Math.round((hourlyRateMg / concentrationMgPerMl) * 10) / 10;

  let minHours = 4;
  let riskLevel: "high" | "moderate" | "low" = "moderate";

  if (suspectedOpioid === "methadone" || suspectedOpioid === "extended-release oxycodone") {
    minHours = 24;
    riskLevel = "high";
  } else if (suspectedOpioid === "fentanyl") {
    minHours = 12;
    riskLevel = "high";
  } else {
    minHours = 4;
    riskLevel = "moderate";
  }

  return {
    bolusDoseAdministeredMg: successfulBolusMg,
    hourlyContinuousInfusionMg: hourlyRateMg,
    hourlyInfusionMlPerHour: rateMlPerHour,
    minimumObservationHours: minHours,
    renarcotizationRiskLevel: riskLevel,
    pharmacokineticTrap:
      "Naloxone IV t1/2 is only 30-90 minutes (duration of action 45-60 min). Long-acting or lipophilic opioids exert respiratory depression for 6-24+ hours. When naloxone clears, recurrent fatal apnea ('renarcotization') occurs unless continuous infusion or serial observation is maintained.",
  };
}

/**
 * Xylazine ("Tranq") Co-Intoxication Management Protocol
 */
export interface XylazineProtocol {
  clinicalHallmarks: string[];
  naloxoneResponseAlert: string;
  supportiveCarePriorities: string[];
  woundCareGuidance: string;
}

export function getXylazineProtocol(): XylazineProtocol {
  return {
    clinicalHallmarks: [
      "Severe central hypotension and marked bradycardia (clonidine-like central alpha-2 agonism)",
      "Profound sedation / prolonged unarousable coma outlasting typical opioid sedation",
      "Dry mouth, hypothermia, hyperglycemia (inhibition of pancreatic insulin secretion)",
      "Severe necrotic skin ulcerations with fibrinous eschar at injection and distant sites",
    ],
    naloxoneResponseAlert:
      "XYLAZINE IS NOT AN OPIOID. It is COMPLETELY UNRESPONSIVE to naloxone. Naloxone will reverse the opioid component of respiratory depression, but the patient will remain sedated and bradycardic from xylazine. DO NOT escalate naloxone doses past 10 mg; repeated massive doses will NOT wake the patient and will precipitate severe opioid withdrawal.",
    supportiveCarePriorities: [
      "Bag-valve-mask ventilatory support and airway protection are the primary life-saving interventions",
      "Isotonic intravenous fluid resuscitation for central vasodilatory hypotension",
      "Consider vasopressors (norepinephrine) if refractory shock persists",
      "Monitor blood glucose for acute transient hyperglycemia",
    ],
    woundCareGuidance:
      "Xylazine causes microvascular dermal vasoconstriction leading to ischemic necrosis and ulcerations. Wounds require gentle mechanical debridement, topical barrier dressings, and avoidance of caustic antiseptics. Does NOT require wound excision unless cellulitis or necrotizing infection is proven.",
  };
}

/**
 * Desk Detection
 */
export interface MoudDeskDetection {
  hasMoud: boolean;
  hasBuprenorphine: boolean;
  hasMethadone: boolean;
  hasNaltrexone: boolean;
  hasNaloxone: boolean;
  hasFentanyl: boolean;
  hasFullAgonist: boolean;
  detectedAgents: string[];
}

export function moudOnDesk(drugIds: string[]): MoudDeskDetection {
  const normalized = drugIds.map((d) => d.toLowerCase());
  const detected: string[] = [];

  const hasBuprenorphine = normalized.includes("buprenorphine");
  const hasMethadone = normalized.includes("methadone");
  const hasNaltrexone = normalized.includes("naltrexone");
  const hasNaloxone = normalized.includes("naloxone");
  const hasFentanyl = normalized.includes("fentanyl");

  const fullAgonists = ["fentanyl", "morphine", "oxycodone", "hydromorphone", "methadone", "heroin", "codeine"];
  const hasFullAgonist = normalized.some((d) => fullAgonists.includes(d));

  if (hasBuprenorphine) detected.push("buprenorphine");
  if (hasMethadone) detected.push("methadone");
  if (hasNaltrexone) detected.push("naltrexone");
  if (hasNaloxone) detected.push("naloxone");
  if (hasFentanyl) detected.push("fentanyl");

  return {
    hasMoud: hasBuprenorphine || hasMethadone || hasNaltrexone || hasNaloxone,
    hasBuprenorphine,
    hasMethadone,
    hasNaltrexone,
    hasNaloxone,
    hasFentanyl,
    hasFullAgonist,
    detectedAgents: detected,
  };
}

/**
 * End-to-End MOUD & Addiction Kinetics Report Generator
 */
export interface MoudReport {
  detection: MoudDeskDetection;
  precipitatedWithdrawalReview?: PrecipitatedWithdrawalAssessment;
  naloxoneInfusionPlan?: NaloxoneInfusionPlan;
  berneseSchedule: readonly BerneseProtocolStep[];
  xylazineProtocol: XylazineProtocol;
  safetyAlerts: string[];
  citations: string[];
  disclaimer: string;
}

export function moudReportOnDesk(
  drugIds: string[],
  host?: HostContext,
  options?: {
    lastFullAgonistUsed?: "fentanyl" | "methadone" | "short-acting (oxycodone/heroin/morphine)";
    hoursSinceLastUse?: number;
    currentCowsScore?: number;
    successfulNaloxoneBolusMg?: number;
  },
): MoudReport {
  const detection = moudOnDesk(drugIds);
  const safetyAlerts: string[] = [];
  const citations: string[] = [
    "American Society of Addiction Medicine (ASAM). National Practice Guideline for the Treatment of Opioid Use Disorder (2020 Focused Update). J Addict Med. 2020;14(2S):1-91.",
    "Hämmig R, et al. Use of buprenorphine in 'micro-doses' to induce patients with full opioid agonist into treatment (Bernese method). Addict Sci Clin Pract. 2016;11(1):17.",
    "Greenwald MK, et al. Buprenorphine maintenance and mu-opioid receptor availability. Neuropsychopharmacology. 2003;28(11):2000-2009.",
    "Huhn AS, et al. Protracted renal and lipophilic clearance of illicit fentanyl. Drug Alcohol Depend. 2020;214:108180.",
  ];

  // Precipitated Withdrawal Assessment
  let precipitatedWithdrawalReview: PrecipitatedWithdrawalAssessment | undefined;
  if (detection.hasBuprenorphine && (detection.hasFullAgonist || options?.lastFullAgonistUsed)) {
    precipitatedWithdrawalReview = evaluatePrecipitatedWithdrawalRisk({
      lastFullAgonistUsed: options?.lastFullAgonistUsed ?? (detection.hasFentanyl ? "fentanyl" : "short-acting (oxycodone/heroin/morphine)"),
      hoursSinceLastUse: options?.hoursSinceLastUse ?? 8,
      currentCowsScore: options?.currentCowsScore,
      inductionApproach: "traditional",
    });

    if (precipitatedWithdrawalReview.riskTier === "high") {
      safetyAlerts.push(
        "High Precipitated Withdrawal Hazard: Initiating standard-dose buprenorphine while full-agonist receptors are occupied triggers acute signal collapse. Ensure COWS >= 12-13 or use Bernese micro-induction.",
      );
    }
  }

  // Naltrexone Opioid-Free Window
  if (detection.hasNaltrexone && detection.hasFullAgonist) {
    safetyAlerts.push(
      "Naltrexone Strict Opioid Abstinence Rule: Naltrexone is a pure antagonist (Ki 0.26 nM). Administration requires 7 to 14 days of complete opioid abstinence. Administering naltrexone with active opioids causes severe, intractable precipitated withdrawal.",
    );
  }

  // Methadone QTc & Steady State
  if (detection.hasMethadone) {
    safetyAlerts.push(
      "Methadone Kinetics & Arrhythmia Safety: Variable half-life (15-60h). Steady state requires 5 to 7 days; avoid premature dose increases. Blocks cardiac hERG channels; monitor baseline and serial QTc intervals, especially with doses >= 100 mg/d.",
    );
  }

  // Naloxone Infusion Plan
  let naloxoneInfusionPlan: NaloxoneInfusionPlan | undefined;
  if (options?.successfulNaloxoneBolusMg !== undefined) {
    naloxoneInfusionPlan = calculateNaloxoneInfusion({
      successfulBolusMg: options.successfulNaloxoneBolusMg,
      suspectedOpioid: detection.hasMethadone ? "methadone" : detection.hasFentanyl ? "fentanyl" : "short-acting heroin/morphine",
    });
  }

  return {
    detection,
    precipitatedWithdrawalReview,
    naloxoneInfusionPlan,
    berneseSchedule: BERNESE_PROTOCOL_SCHEDULE,
    xylazineProtocol: getXylazineProtocol(),
    safetyAlerts,
    citations,
    disclaimer: `${NOT_CLEARED} ${PI_FOOTER}`,
  };
}

