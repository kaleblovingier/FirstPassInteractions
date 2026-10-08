/**
 * Oncology Antimetabolite, Immunosuppressant & Rescue Pharmacology Engine
 *
 * FD&C Act § 520(o)(1)(E) Regulatory Posture:
 * Non-device Clinical Decision Support software reference. This module provides
 * educational, non-prescriptive mechanistic explanations of antimetabolite pharmacokinetics,
 * high-dose methotrexate (HDMTX) elimination modeling, leucovorin rescue nomograms,
 * glucarpidase salvage criteria, thiopurine xanthine-oxidase metabolic shunting,
 * calcineurin inhibitor-triazole CYP3A4/P-gp interactions, and transporter-mediated
 * clearance collisions to enable licensed healthcare professionals and oncology clinical
 * pharmacists to independently analyze cytotoxic regimens and avoid catastrophic collisions.
 * It does not provide patient-specific dosing orders, treatment directives, or diagnostic determinations.
 *
 * Authoritative Literature & Guideline Citations:
 * - Ramsey LB, Balis FM, O'Brien MM, et al. Consensus Guideline for Use of Glucarpidase in Patients with
 *   High-Dose Methotrexate Induced Acute Kidney Injury and Delayed Methotrexate Clearance.
 *   Oncologist. 2018;23(1):52-61. doi:10.1634/theoncologist.2017-0243.
 * - Widemann BC, Adamson PC. Understanding and managing methotrexate nephrotoxicity.
 *   Oncologist. 2006;11(6):694-703. doi:10.1634/theoncologist.11-6-694.
 * - Howard SC, McCormick J, Pui CH, Buddington RK, Harvey RD. Preventing and Managing Toxicities of
 *   High-Dose Methotrexate. Oncologist. 2016;21(12):1471-1482. doi:10.1634/theoncologist.2015-0164.
 * - Bleyer WA. The clinical pharmacology of methotrexate: New applications of an old drug.
 *   Cancer. 1978;41(1):36-51. doi:10.1002/1097-0142(197801)41:1<36::aid-cncr2820410108>3.0.co;2-i.
 * - Bleyer WA. Methotrexate leucovorin rescue nomogram. Cancer Clin Trials. 1981;4(2):107-109.
 * - Relling MV, Schwab M, Whirl-Carrillo M, et al. Clinical Pharmacogenetics Implementation Consortium (CPIC)
 *   Guideline for Thiopurine Methyltransferase and NUDT15 Genotypes and Thiopurine Dosing.
 *   Clin Pharmacol Ther. 2019;105(5):1095-1105. doi:10.1002/cpt.1304.
 * - Venkataramanan R, Swaminathan A, Prasad T, et al. Clinical pharmacokinetics of tacrolimus.
 *   Clin Pharmacokinet. 1995;29(6):404-430. doi:10.2165/00003088-199529060-00003.
 * - Campagne O, Stewart CF. Clinical Pharmacokinetics and Pharmacodynamics of High-Dose Methotrexate
 *   in Pediatric and Young Adult Oncology. Clin Pharmacokinet. 2021;60(11):1399-1422.
 * - FDA Center for Drug Evaluation and Research. Voraxaze (glucarpidase) Prescribing Information (NDA 022569).
 * - FDA Center for Drug Evaluation and Research. Prograf (tacrolimus) Prescribing Information (NDA 050720).
 * - FDA Center for Drug Evaluation and Research. Trexall (methotrexate) Prescribing Information (NDA 011719).
 */

import { DRUG_BY_ID } from "./catalog";
import type { HostContext } from "./types";

export const ONCOLOGY_KINETICS_REGULATORY_DISCLAIMER =
  "FirstPass Oncology Antimetabolite, Immunosuppressant & Rescue Pharmacology Engine is an educational clinical pharmacology reference under Section 520(o)(1)(E) of the Federal Food, Drug, and Cosmetic Act (FD&C Act § 520(o)(1)(E)). It provides non-prescriptive educational decision-support describing high-dose methotrexate kinetics, leucovorin rescue nomograms, glucarpidase salvage criteria, thiopurine-xanthine oxidase metabolic rerouting, calcineurin inhibitor-triazole CYP3A4/P-gp interactions, and transporter-mediated clearance collisions based on peer-reviewed oncology, nephrology, and pharmacogenomics literature. It does not provide medical diagnoses, treatment directives, or patient-specific dosing orders. Licensed clinicians and oncology clinical pharmacists must exercise independent clinical judgment and consult institutional protocols and FDA-approved prescribing information.";

export const ONCOLOGY_CITATIONS: readonly string[] = [
  "Ramsey LB, Balis FM, O'Brien MM, et al. Consensus Guideline for Use of Glucarpidase in Patients with High-Dose Methotrexate Induced Acute Kidney Injury and Delayed Methotrexate Clearance. Oncologist. 2018;23(1):52-61. doi:10.1634/theoncologist.2017-0243.",
  "Widemann BC, Adamson PC. Understanding and managing methotrexate nephrotoxicity. Oncologist. 2006;11(6):694-703. doi:10.1634/theoncologist.11-6-694.",
  "Howard SC, McCormick J, Pui CH, Buddington RK, Harvey RD. Preventing and Managing Toxicities of High-Dose Methotrexate. Oncologist. 2016;21(12):1471-1482. doi:10.1634/theoncologist.2015-0164.",
  "Bleyer WA. The clinical pharmacology of methotrexate: New applications of an old drug. Cancer. 1978;41(1):36-51. doi:10.1002/1097-0142(197801)41:1<36::aid-cncr2820410108>3.0.co;2-i.",
  "Bleyer WA. Methotrexate leucovorin rescue nomogram. Cancer Clin Trials. 1981;4(2):107-109.",
  "Relling MV, Schwab M, Whirl-Carrillo M, et al. Clinical Pharmacogenetics Implementation Consortium (CPIC) Guideline for Thiopurine Methyltransferase and NUDT15 Genotypes and Thiopurine Dosing. Clin Pharmacol Ther. 2019;105(5):1095-1105. doi:10.1002/cpt.1304.",
  "Venkataramanan R, Swaminathan A, Prasad T, et al. Clinical pharmacokinetics of tacrolimus. Clin Pharmacokinet. 1995;29(6):404-430. doi:10.2165/00003088-199529060-00003.",
  "Campagne O, Stewart CF. Clinical Pharmacokinetics and Pharmacodynamics of High-Dose Methotrexate in Pediatric and Young Adult Oncology. Clin Pharmacokinet. 2021;60(11):1399-1422. doi:10.1007/s40262-021-01053-0.",
  "FDA CDER. Voraxaze (glucarpidase) Prescribing Information (NDA 022569). BTG International; 2012.",
  "FDA CDER. Prograf (tacrolimus) Prescribing Information (NDA 050720). Astellas Pharma US; 2023.",
  "FDA CDER. Trexall (methotrexate) Prescribing Information (NDA 011719). Teva Pharmaceuticals; 2022.",
  "FDA CDER. Purinethol (mercaptopurine) Prescribing Information (NDA 009370). Teva Pharmaceuticals; 2021.",
];

/* ========================================================================== */
/* SECTION 1: HIGH-DOSE METHOTREXATE (HDMTX) KINETICS & RESCUE ENGINE        */
/* ========================================================================== */

/** Molecular weight of Methotrexate in g/mol */
export const MTX_MOLECULAR_WEIGHT = 454.44;

/** Converts MTX serum concentration from micromolar (µmol/L or µM) to mg/L (µg/mL) */
export function mtxUmolToMgL(uM: number): number {
  if (!Number.isFinite(uM) || uM < 0) return 0;
  return Math.round(((uM * MTX_MOLECULAR_WEIGHT) / 1000) * 1000) / 1000;
}

/** Converts MTX serum concentration from mg/L (µg/mL) to micromolar (µmol/L or µM) */
export function mtxMgLToUmol(mgL: number): number {
  if (!Number.isFinite(mgL) || mgL < 0) return 0;
  return Math.round(((mgL * 1000) / MTX_MOLECULAR_WEIGHT) * 1000) / 1000;
}

/** Standard HDMTX clearance threshold milestones per Bleyer & Howard nomograms */
export const HDMTX_MILESTONES = {
  h24: { targetUmolL: 5.0, highDelayedUmolL: 20.0, salvageUmolL: 50.0 },
  h48: { targetUmolL: 1.0, highDelayedUmolL: 5.0, salvageUmolL: 5.0 },
  h72: { targetUmolL: 0.1, highDelayedUmolL: 0.4, salvageUmolL: 1.0 },
  safeClearanceUmolL: 0.05,
} as const;

export type MtxEliminationStatus =
  | "cleared"
  | "normal"
  | "delayed"
  | "severely-delayed"
  | "critical-toxicity";

export interface MtxCurvePoint {
  hoursPostStart: number;
  targetMaxUmolL: number;
  delayedThresholdUmolL: number;
  criticalThresholdUmolL: number;
}

export const MTX_NOMOGRAM_CURVE: readonly MtxCurvePoint[] = [
  { hoursPostStart: 24, targetMaxUmolL: 5.0, delayedThresholdUmolL: 15.0, criticalThresholdUmolL: 50.0 },
  { hoursPostStart: 36, targetMaxUmolL: 2.5, delayedThresholdUmolL: 8.0, criticalThresholdUmolL: 30.0 },
  { hoursPostStart: 42, targetMaxUmolL: 1.5, delayedThresholdUmolL: 5.0, criticalThresholdUmolL: 15.0 },
  { hoursPostStart: 48, targetMaxUmolL: 1.0, delayedThresholdUmolL: 3.0, criticalThresholdUmolL: 5.0 },
  { hoursPostStart: 60, targetMaxUmolL: 0.3, delayedThresholdUmolL: 1.0, criticalThresholdUmolL: 2.5 },
  { hoursPostStart: 72, targetMaxUmolL: 0.1, delayedThresholdUmolL: 0.4, criticalThresholdUmolL: 1.0 },
  { hoursPostStart: 96, targetMaxUmolL: 0.05, delayedThresholdUmolL: 0.15, criticalThresholdUmolL: 0.4 },
];

export interface MtxEliminationEvaluation {
  hoursPostStart: number;
  concentrationUmolL: number;
  concentrationMgL: number;
  status: MtxEliminationStatus;
  targetCutoffUmolL: number;
  halfLifeEstimateHours: {
    normalRange: string;
    patientEstimatedRange: string;
  };
  isCleared: boolean;
  isDelayed: boolean;
  isGlucarpidaseCandidateMtxThreshold: boolean;
  explanation: string;
  clinicalImplication: string;
}

/**
 * Evaluates serum MTX elimination status against canonical Bleyer/Howard targets.
 * Target thresholds: 24h <= 5.0 µM, 48h <= 1.0 µM, 72h <= 0.1 µM; cleared <= 0.05 µM.
 */
export function evaluateMtxElimination(
  hoursPostStart: number,
  concentrationUmolL: number,
): MtxEliminationEvaluation | null {
  if (
    !Number.isFinite(hoursPostStart) ||
    !Number.isFinite(concentrationUmolL) ||
    hoursPostStart <= 0 ||
    concentrationUmolL < 0
  ) {
    return null;
  }

  const concentrationMgL = mtxUmolToMgL(concentrationUmolL);

  // Compute interpolated target cutoff based on curve
  let targetCutoff = 5.0;
  let salvageThreshold = 50.0;

  if (hoursPostStart <= 24) {
    targetCutoff = 5.0;
    salvageThreshold = 50.0;
  } else if (hoursPostStart <= 36) {
    const fraction = (hoursPostStart - 24) / (36 - 24);
    targetCutoff = 5.0 - fraction * (5.0 - 2.5);
    salvageThreshold = 50.0 - fraction * (50.0 - 30.0);
  } else if (hoursPostStart <= 48) {
    const fraction = (hoursPostStart - 36) / (48 - 36);
    targetCutoff = 2.5 - fraction * (2.5 - 1.0);
    salvageThreshold = 30.0 - fraction * (30.0 - 5.0);
  } else if (hoursPostStart <= 72) {
    const fraction = (hoursPostStart - 48) / (72 - 48);
    targetCutoff = 1.0 - fraction * (1.0 - 0.1);
    salvageThreshold = 5.0 - fraction * (5.0 - 1.0);
  } else {
    targetCutoff = 0.05;
    salvageThreshold = 0.4;
  }

  targetCutoff = Math.round(targetCutoff * 100) / 100;
  salvageThreshold = Math.round(salvageThreshold * 100) / 100;

  let status: MtxEliminationStatus = "normal";
  let isGlucarpidaseCandidate = false;

  if (concentrationUmolL <= HDMTX_MILESTONES.safeClearanceUmolL) {
    status = "cleared";
  } else if (concentrationUmolL <= targetCutoff) {
    status = "normal";
  } else if (concentrationUmolL >= salvageThreshold) {
    status = "critical-toxicity";
    isGlucarpidaseCandidate = true;
  } else if (concentrationUmolL > targetCutoff * 3) {
    status = "severely-delayed";
  } else {
    status = "delayed";
  }

  const normalRange = "3.5–10 hours (terminal phase)";
  let patientEstimatedRange = "Expected normal clearance (~3.5–10h)";

  if (status === "delayed") {
    patientEstimatedRange = "Prolonged elimination (~12–18 hours); elevated exposure risk";
  } else if (status === "severely-delayed" || status === "critical-toxicity") {
    patientEstimatedRange = "Severely impaired elimination (>24–48 hours); high accumulation risk";
  }

  let explanation = "";
  let clinicalImplication = "";

  switch (status) {
    case "cleared":
      explanation = `Serum MTX concentration (${concentrationUmolL} µM) is below the universal safe clearance cutoff (<= 0.05 µM).`;
      clinicalImplication =
        "Host tissues have cleared cytotoxic intracellular free drug. Leucovorin rescue and hyperhydration can typically be discontinued per protocol.";
      break;
    case "normal":
      explanation = `Serum MTX concentration (${concentrationUmolL} µM at ${hoursPostStart}h) is within the expected normal elimination corridor (target <= ${targetCutoff} µM).`;
      clinicalImplication =
        "Maintain standard scheduled leucovorin rescue (typically 15 mg/m² q6h) and continued hydration/alkalinization until MTX falls below 0.05 µM.";
      break;
    case "delayed":
      explanation = `Serum MTX concentration (${concentrationUmolL} µM at ${hoursPostStart}h) exceeds the nominal target (<= ${targetCutoff} µM), indicating delayed clearance.`;
      clinicalImplication =
        "Mandates escalated leucovorin dosing and intensified urine alkalinization/hydration to prevent mucosal and bone marrow toxicity.";
      break;
    case "severely-delayed":
      explanation = `Serum MTX concentration (${concentrationUmolL} µM at ${hoursPostStart}h) is more than 3-fold above target threshold (${targetCutoff} µM).`;
      clinicalImplication =
        "High risk of severe pancytopenia, mucositis, and acute kidney injury. Requires aggressive high-dose intravenous leucovorin escalation and nephrology/pharmacist surveillance.";
      break;
    case "critical-toxicity":
      explanation = `Serum MTX concentration (${concentrationUmolL} µM at ${hoursPostStart}h) meets or exceeds critical salvage criteria (> 2 SD above population mean; threshold >= ${salvageThreshold} µM).`;
      clinicalImplication =
        "Critical delayed elimination. Immediately evaluate for acute renal impairment (Cr rise >= 50%) to assess Glucarpidase (Voraxaze) salvage candidacy.";
      break;
  }

  return {
    hoursPostStart,
    concentrationUmolL,
    concentrationMgL,
    status,
    targetCutoffUmolL: targetCutoff,
    halfLifeEstimateHours: {
      normalRange,
      patientEstimatedRange,
    },
    isCleared: status === "cleared",
    isDelayed: status === "delayed" || status === "severely-delayed" || status === "critical-toxicity",
    isGlucarpidaseCandidateMtxThreshold: isGlucarpidaseCandidate,
    explanation,
    clinicalImplication,
  };
}

export type LeucovorinDoseTier =
  | "discontinue"
  | "standard"
  | "moderate-escalation"
  | "high-dose-escalation"
  | "critical-salvage";

export interface LeucovorinNomogramResult {
  hoursPostStart: number;
  mtxConcentrationUmolL: number;
  tier: LeucovorinDoseTier;
  recommendedDoseMgM2: number;
  frequencyHours: number;
  route: "PO or IV" | "IV strictly";
  routeRationale: string;
  mechanism: string;
  timingGuidance: string;
  actionSummary: string;
}

/**
 * Evaluates Leucovorin (folinic acid) rescue requirements from serum MTX level
 * using the Bleyer and Widemann clinical nomograms.
 */
export function calculateLeucovorinRescue(
  hoursPostStart: number,
  mtxConcentrationUmolL: number,
): LeucovorinNomogramResult | null {
  if (
    !Number.isFinite(hoursPostStart) ||
    !Number.isFinite(mtxConcentrationUmolL) ||
    hoursPostStart <= 0 ||
    mtxConcentrationUmolL < 0
  ) {
    return null;
  }

  // Safe cutoff
  if (mtxConcentrationUmolL <= HDMTX_MILESTONES.safeClearanceUmolL) {
    return {
      hoursPostStart,
      mtxConcentrationUmolL,
      tier: "discontinue",
      recommendedDoseMgM2: 0,
      frequencyHours: 0,
      route: "PO or IV",
      routeRationale: "Serum MTX is <= 0.05 µM; systemic toxicity risk has resolved.",
      mechanism:
        "Leucovorin (5-formyl-tetrahydrofolate) supplies reduced folates, bypassing MTX inhibition of dihydrofolate reductase (DHFR). With drug cleared, endogenous folate cofactor cycling resumes.",
      timingGuidance: "Rescue may be discontinued once serum MTX <= 0.05 µM in two consecutive samples.",
      actionSummary: "Discontinue leucovorin rescue; taper IV fluids as clinically indicated.",
    };
  }

  let tier: LeucovorinDoseTier = "standard";
  let doseMgM2 = 15;
  let freqHours = 6;
  let route: "PO or IV" | "IV strictly" = "PO or IV";

  if (hoursPostStart < 42) {
    if (mtxConcentrationUmolL > 50.0) {
      tier = "critical-salvage";
      doseMgM2 = 150;
      freqHours = 3;
      route = "IV strictly";
    } else if (mtxConcentrationUmolL > 15.0) {
      tier = "high-dose-escalation";
      doseMgM2 = 100;
      freqHours = 6;
      route = "IV strictly";
    } else if (mtxConcentrationUmolL > 5.0) {
      tier = "moderate-escalation";
      doseMgM2 = 30;
      freqHours = 6;
      route = "IV strictly";
    } else {
      tier = "standard";
      doseMgM2 = 15;
      freqHours = 6;
      route = "PO or IV";
    }
  } else if (hoursPostStart <= 54) {
    if (mtxConcentrationUmolL > 10.0) {
      tier = "critical-salvage";
      doseMgM2 = 150;
      freqHours = 3;
      route = "IV strictly";
    } else if (mtxConcentrationUmolL > 5.0) {
      tier = "high-dose-escalation";
      doseMgM2 = 100;
      freqHours = 6;
      route = "IV strictly";
    } else if (mtxConcentrationUmolL > 1.0) {
      tier = "moderate-escalation";
      doseMgM2 = 50;
      freqHours = 6;
      route = "IV strictly";
    } else {
      tier = "standard";
      doseMgM2 = 15;
      freqHours = 6;
      route = "PO or IV";
    }
  } else {
    // > 54 hours (e.g. 72h)
    if (mtxConcentrationUmolL > 2.0) {
      tier = "critical-salvage";
      doseMgM2 = 150;
      freqHours = 3;
      route = "IV strictly";
    } else if (mtxConcentrationUmolL > 0.4) {
      tier = "high-dose-escalation";
      doseMgM2 = 100;
      freqHours = 6;
      route = "IV strictly";
    } else if (mtxConcentrationUmolL > 0.1) {
      tier = "moderate-escalation";
      doseMgM2 = 30;
      freqHours = 6;
      route = "IV strictly";
    } else {
      tier = "standard";
      doseMgM2 = 15;
      freqHours = 6;
      route = "PO or IV";
    }
  }

  const routeRationale =
    route === "IV strictly"
      ? "Doses exceeding 25 mg saturate intestinal Reduced Folate Carrier 1 (RFC-1 / SLC19A1) mucosal transport, preventing oral bioavailability. Intravenous administration is mandatory for escalated rescue doses."
      : "Standard doses <= 25 mg can be administered orally or intravenously; bioavailability is reliable at lower concentrations.";

  const mechanism =
    "Leucovorin (folinic acid, 5-formyl-THF) is readily converted to tetrahydrofolate cofactors without requiring dihydrofolate reductase (DHFR), restoring purine and thymidylate biosynthesis in non-malignant mucosal and bone marrow cells.";

  const timingGuidance =
    "Initiate leucovorin rescue typically between 24 and 42 hours following the initiation of HDMTX infusion. Administering rescue prematurely (<24h) blunts oncologic efficacy; delaying rescue beyond 42–48h permits irreversible host mucosal ulceration and stem cell death.";

  let actionSummary = "";
  switch (tier) {
    case "standard":
      actionSummary = `Standard protocol rescue: Nomogram specifies ${doseMgM2} mg/m² ${route} every ${freqHours} hours. Recheck serum MTX every 24h until < 0.05 µM.`;
      break;
    case "moderate-escalation":
      actionSummary = `Moderate rescue escalation: Nomogram specifies ${doseMgM2} mg/m² ${route} every ${freqHours} hours. Increase hydration and monitor urine pH closely.`;
      break;
    case "high-dose-escalation":
      actionSummary = `High-dose rescue escalation: Nomogram specifies ${doseMgM2} mg/m² ${route} every ${freqHours} hours. High risk of systemic toxicity; monitor renal and hematologic labs daily.`;
      break;
    case "critical-salvage":
      actionSummary = `Critical rescue escalation: Nomogram specifies ${doseMgM2} mg/m² ${route} every ${freqHours} hours. Immediately evaluate for Glucarpidase salvage if concurrent nephrotoxicity is documented.`;
      break;
  }

  return {
    hoursPostStart,
    mtxConcentrationUmolL,
    tier,
    recommendedDoseMgM2: doseMgM2,
    frequencyHours: freqHours,
    route,
    routeRationale,
    mechanism,
    timingGuidance,
    actionSummary,
  };
}

export interface GlucarpidaseEvaluationInput {
  hoursPostStart: number;
  mtxConcentrationUmolL: number;
  baselineScrMgDl: number;
  currentScrMgDl: number;
  oliguriaPresent?: boolean;
}

export interface GlucarpidaseEvaluationResult {
  meetsSalvageCriteria: boolean;
  mtxLevelElevated: boolean;
  renalImpairmentPresent: boolean;
  percentCreatinineRise: number;
  withinOptimalWindow: boolean;
  biochemicalMechanism: string;
  criticalTimingWarning: string;
  laboratoryAssayInterferenceWarning: string;
  clinicalGuidance: string;
}

/**
 * Evaluates Glucarpidase (Voraxaze, recombinant carboxypeptidase G2) salvage eligibility
 * based on the Ramsey et al. 2018 Consensus Guidelines.
 * Criteria: MTX level > 2 standard deviations above mean AND acute renal impairment (Cr rise >= 50% or oliguria).
 */
export function evaluateGlucarpidaseCriteria({
  hoursPostStart,
  mtxConcentrationUmolL,
  baselineScrMgDl,
  currentScrMgDl,
  oliguriaPresent = false,
}: GlucarpidaseEvaluationInput): GlucarpidaseEvaluationResult | null {
  if (
    !Number.isFinite(hoursPostStart) ||
    !Number.isFinite(mtxConcentrationUmolL) ||
    !Number.isFinite(baselineScrMgDl) ||
    !Number.isFinite(currentScrMgDl) ||
    hoursPostStart <= 0 ||
    baselineScrMgDl <= 0 ||
    currentScrMgDl <= 0 ||
    mtxConcentrationUmolL < 0
  ) {
    return null;
  }

  const percentCreatinineRise = Math.round(((currentScrMgDl - baselineScrMgDl) / baselineScrMgDl) * 100);
  const renalImpairmentPresent = percentCreatinineRise >= 50 || oliguriaPresent;

  // Ramsey et al. consensus thresholds (> 2 SD above population mean):
  // 24h: > 50 µM; 36h: > 30 µM; 42h: > 10 µM; 48h: > 5 µM; 72h: > 1 µM (or > 0.4 µM)
  let mtxThresholdUmolL = 50.0;
  if (hoursPostStart <= 24) {
    mtxThresholdUmolL = 50.0;
  } else if (hoursPostStart <= 36) {
    mtxThresholdUmolL = 30.0;
  } else if (hoursPostStart <= 48) {
    mtxThresholdUmolL = 5.0;
  } else {
    mtxThresholdUmolL = 1.0;
  }

  const mtxLevelElevated = mtxConcentrationUmolL >= mtxThresholdUmolL;
  const withinOptimalWindow = hoursPostStart <= 60; // consensus recommends within 48-60h before irreversible toxicity
  const meetsSalvageCriteria = mtxLevelElevated && renalImpairmentPresent;

  const biochemicalMechanism =
    "Glucarpidase (recombinant bacterial carboxypeptidase G2) is an intravenous zinc-dependent exopeptidase that rapidly cleaves the terminal glutamate residue of extracellular methotrexate, hydrolyzing it into 4-[[2,4-diamino-6-pteridinyl)methyl]methylamino]benzoic acid (DAMPA) and L-glutamate within 15 minutes (>95% reduction in circulating MTX). DAMPA possesses <1% of MTX antimetabolite activity and is metabolized predominantly by the liver, bypassing non-functional renal tubular secretion.";

  const criticalTimingWarning =
    "CRITICAL LEUCOVORIN INTERFERENCE HAZARD: Glucarpidase also hydrolyzes Leucovorin (folinic acid), as it possesses a terminal glutamate moiety. DO NOT administer Leucovorin within 2 hours before or 2 hours after Glucarpidase. Resume Leucovorin at least 2 hours post-Glucarpidase administration, dosing Leucovorin based on the pre-Glucarpidase MTX level until chromatographic measurement confirms clearance.";

  const laboratoryAssayInterferenceWarning =
    "IMMUNOASSAY ARTIFACT WARNING: DAMPA metabolite strongly cross-reacts with standard clinical methotrexate immunoassays (ECLIA, EMIT, FPIA), producing falsely elevated reported MTX concentrations for 48 to 72 hours post-administration. Chromatographic quantification (LC-MS/MS or HPLC) is required to determine authentic MTX levels following Glucarpidase.";

  let clinicalGuidance = "";
  if (meetsSalvageCriteria) {
    clinicalGuidance = `PATIENT MEETS GLUCARPIDASE SALVAGE CRITERIA: Serum MTX (${mtxConcentrationUmolL} µM >= threshold ${mtxThresholdUmolL} µM) with concurrent acute renal injury (Cr rise +${percentCreatinineRise}% >= 50%). Glucarpidase administration is indicated to prevent irreversible multi-organ toxicities. Observe strict 2-hour separation from Leucovorin.`;
  } else if (mtxLevelElevated && !renalImpairmentPresent) {
    clinicalGuidance = `Serum MTX (${mtxConcentrationUmolL} µM) is elevated above nomogram threshold, but acute renal impairment criterion (Cr rise +${percentCreatinineRise}% < 50%) is not met. Glucarpidase is typically reserved for delayed clearance with acute nephrotoxicity. Intensify intravenous Leucovorin rescue and high-volume alkalinized hydration.`;
  } else if (!mtxLevelElevated && renalImpairmentPresent) {
    clinicalGuidance = `Acute renal impairment is present (Cr rise +${percentCreatinineRise}%), but serum MTX (${mtxConcentrationUmolL} µM) is below the salvage threshold (${mtxThresholdUmolL} µM). Continue high-volume alkalinized hydration and nomogram-guided Leucovorin rescue.`;
  } else {
    clinicalGuidance = `Neither critical MTX elevation nor acute renal impairment criteria are met. Continue routine institutional HDMTX monitoring protocol.`;
  }

  return {
    meetsSalvageCriteria,
    mtxLevelElevated,
    renalImpairmentPresent,
    percentCreatinineRise,
    withinOptimalWindow,
    biochemicalMechanism,
    criticalTimingWarning,
    laboratoryAssayInterferenceWarning,
    clinicalGuidance,
  };
}

export interface UrineAlkalinizationInput {
  urinePh: number;
  hydrationRateLPerM2Day?: number;
  urineOutputMlPerHr?: number;
}

export interface UrineAlkalinizationEvaluation {
  urinePh: number;
  isPhAdequate: boolean;
  targetPh: number;
  solubilityFoldIncrease: string;
  hydrationRateLPerM2Day?: number;
  isHydrationAdequate: boolean;
  biochemicalRationale: string;
  clinicalGuidance: string;
}

/**
 * Evaluates urine alkalinization and hydration targets to prevent MTX crystal nephropathy.
 * Methotrexate and 7-OH-MTX solubility increases >10- to 50-fold from pH 5.0 to pH >= 7.0.
 */
export function evaluateUrineAlkalinization({
  urinePh,
  hydrationRateLPerM2Day,
  urineOutputMlPerHr,
}: UrineAlkalinizationInput): UrineAlkalinizationEvaluation | null {
  if (!Number.isFinite(urinePh) || urinePh < 3.0 || urinePh > 9.0) {
    return null;
  }

  const isPhAdequate = urinePh >= 7.0;
  const isHydrationAdequate = hydrationRateLPerM2Day !== undefined ? hydrationRateLPerM2Day >= 3.0 : true;

  const biochemicalRationale =
    "Methotrexate is a dicarboxylic weak acid with pKa values of 3.8, 4.8, and 5.5. At an acidic urine pH of 5.0, its aqueous solubility is only ~0.44 mmol/L (~200 mg/L). At a neutral or alkaline urine pH >= 7.0, solubility surges to >22 mmol/L (>10,000 mg/L), an over 10- to 50-fold increase. Furthermore, its major hepatic aldehyde oxidase metabolite, 7-hydroxy-methotrexate (7-OH-MTX), has 3- to 5-fold lower solubility than parent drug and crystallizes readily into intratubular casts, causing obstructive acute tubular necrosis.";

  let clinicalGuidance = "";
  if (!isPhAdequate) {
    clinicalGuidance = `URINE PH INADEQUATE (${urinePh} < target 7.0): HIGH RISK OF TUBULAR PRECIPITATION. Hold MTX infusion if not yet started. Infuse intravenous sodium bicarbonate (typically 40–50 mEq/L in D5W or 0.45% NaCl) ± oral sodium bicarbonate. Consider acetazolamide (250–500 mg IV/PO) if systemic alkalemia (arterial/venous HCO3- > 30 mEq/L) prevents further bicarbonate infusion while urine remains acidic.`;
  } else if (!isHydrationAdequate) {
    clinicalGuidance = `URINE PH ACCEPTABLE (${urinePh} >= 7.0) BUT HYDRATION RATE IS SUBTARGET (< 3.0 L/m²/day): Increase intravenous fluid velocity to >= 3.0 L/m²/day (or >= 125–200 mL/m²/hr) to maintain target urine output >= 100 mL/hr and prevent tubular concentration stagnation.`;
  } else {
    clinicalGuidance = `Adequate nephroprotective parameters documented (urine pH ${urinePh} >= 7.0 with high-volume hydration). Continue checking urine pH with every void or every 4 hours throughout MTX infusion and post-hydration phase.`;
  }

  return {
    urinePh,
    isPhAdequate,
    targetPh: 7.0,
    solubilityFoldIncrease: ">10- to 50-fold",
    hydrationRateLPerM2Day,
    isHydrationAdequate,
    biochemicalRationale,
    clinicalGuidance,
  };
}

export type MtxCollisionClass =
  | "nsaid"
  | "ppi"
  | "beta-lactam"
  | "salicylate";

export interface MtxCollisionAlert {
  drugId: string;
  drugName: string;
  collisionClass: MtxCollisionClass;
  transporterOrMechanism: string;
  severity: "contraindicated" | "major";
  hazard: string;
  recommendation: string;
}

export const MTX_COLLISION_AGENTS: Record<string, { collisionClass: MtxCollisionClass; name: string }> = {
  // NSAIDs
  ibuprofen: { collisionClass: "nsaid", name: "Ibuprofen" },
  naproxen: { collisionClass: "nsaid", name: "Naproxen" },
  ketorolac: { collisionClass: "nsaid", name: "Ketorolac" },
  indomethacin: { collisionClass: "nsaid", name: "Indomethacin" },
  meloxicam: { collisionClass: "nsaid", name: "Meloxicam" },
  celecoxib: { collisionClass: "nsaid", name: "Celecoxib" },
  diclofenac: { collisionClass: "nsaid", name: "Diclofenac" },
  // PPIs
  omeprazole: { collisionClass: "ppi", name: "Omeprazole" },
  esomeprazole: { collisionClass: "ppi", name: "Esomeprazole" },
  pantoprazole: { collisionClass: "ppi", name: "Pantoprazole" },
  lansoprazole: { collisionClass: "ppi", name: "Lansoprazole" },
  rabeprazole: { collisionClass: "ppi", name: "Rabeprazole" },
  dexlansoprazole: { collisionClass: "ppi", name: "Dexlansoprazole" },
  // Beta-lactams & Penicillins
  "piperacillin-tazobactam": { collisionClass: "beta-lactam", name: "Piperacillin-Tazobactam" },
  ampicillin: { collisionClass: "beta-lactam", name: "Ampicillin" },
  amoxicillin: { collisionClass: "beta-lactam", name: "Amoxicillin" },
  "penicillin-v": { collisionClass: "beta-lactam", name: "Penicillin V" },
  nafcillin: { collisionClass: "beta-lactam", name: "Nafcillin" },
  oxacillin: { collisionClass: "beta-lactam", name: "Oxacillin" },
  // Salicylates
  aspirin: { collisionClass: "salicylate", name: "Aspirin" },
};

/**
 * Detects critical transporter and clearance collisions with High-Dose Methotrexate.
 */
export function detectMtxCollisions(drugIds: string[]): MtxCollisionAlert[] {
  const normalized = new Set(drugIds.map((id) => id.toLowerCase()));
  const alerts: MtxCollisionAlert[] = [];

  for (const id of normalized) {
    const meta = MTX_COLLISION_AGENTS[id];
    if (!meta) continue;

    const drugName = DRUG_BY_ID[id]?.name ?? meta.name;

    switch (meta.collisionClass) {
      case "nsaid":
        alerts.push({
          drugId: id,
          drugName,
          collisionClass: "nsaid",
          transporterOrMechanism: "OAT1 (SLC22A6) & OAT3 (SLC22A8) renal secretory inhibition + renal PGE2 vasoconstriction",
          severity: "contraindicated",
          hazard:
            "NSAIDs potently inhibit basolateral organic anion transporters OAT1 and OAT3, shutting down active tubular secretion of methotrexate. Furthermore, prostaglandin synthesis inhibition decreases renal plasma flow and GFR, prolonging MTX clearance and provoking fatal bone marrow aplasia and acute kidney injury.",
          recommendation:
            "Hold NSAIDs at least 2 to 5 elimination half-lives prior to HDMTX initiation; do not resume until serum MTX is fully cleared (<= 0.05 µM). Manage pain with acetaminophen or opioids.",
        });
        break;
      case "ppi":
        alerts.push({
          drugId: id,
          drugName,
          collisionClass: "ppi",
          transporterOrMechanism: "BCRP (ABCG2) canalicular/tubular efflux & OAT3 inhibition",
          severity: "major",
          hazard:
            "Proton pump inhibitors directly inhibit the Breast Cancer Resistance Protein (BCRP / ABCG2) efflux pump and renal OAT3. Co-administration significantly delays MTX elimination, extending systemic exposure and compounding mucositis and nephrotoxicity.",
          recommendation:
            "Switch PPI to an H2-receptor antagonist (such as famotidine) during HDMTX administration and wash-out phase; resume PPI only after MTX clearance.",
        });
        break;
      case "beta-lactam":
        alerts.push({
          drugId: id,
          drugName,
          collisionClass: "beta-lactam",
          transporterOrMechanism: "OAT1 & OAT3 competitive renal tubular secretory substrate antagonism",
          severity: "major",
          hazard:
            "Penicillins and beta-lactam antibiotics are weak organic acids that compete directly with methotrexate for basolateral OAT1/OAT3 active transport in the proximal tubule. This competition sharply decreases MTX renal clearance, leading to supratherapeutic accumulation.",
          recommendation:
            "Avoid co-prescribing penicillins (especially piperacillin-tazobactam) during HDMTX courses. Utilize alternative non-interfering antimicrobial classes (e.g. cephalosporins, carbapenems, or fluoroquinolones if clinically appropriate) with close MTX level surveillance.",
        });
        break;
      case "salicylate":
        alerts.push({
          drugId: id,
          drugName,
          collisionClass: "salicylate",
          transporterOrMechanism: "Human serum albumin binding displacement + OAT1/OAT3 tubular competition",
          severity: "contraindicated",
          hazard:
            "Salicylates displace methotrexate from plasma albumin binding sites (increasing free unbound pharmacologically active fraction by >50%), while simultaneously competing for renal tubular organic anion secretion. Dual displacement and secretory blockade precipitate acute cytotoxicity.",
          recommendation:
            "Strictly avoid aspirin and salicylate compounds during methotrexate administration.",
        });
        break;
    }
  }

  return alerts;
}

/* ========================================================================== */
/* SECTION 2: THIOPURINES (6-MP / AZA) x XANTHINE OXIDASE INHIBITORS         */
/* ========================================================================== */

export const THIOPURINE_IDS = new Set(["mercaptopurine", "azathioprine"]);
export const XO_INHIBITOR_IDS = new Set(["allopurinol", "febuxostat"]);

export interface ThiopurineXoEvaluation {
  hasThiopurine: boolean;
  hasXoInhibitor: boolean;
  hasCollision: boolean;
  thiopurineAgent: string | null;
  xoInhibitorAgent: string | null;
  severity: "contraindicated" | "major" | "none";
  requiredDoseReductionPercent: number;
  doseMultiplier: number;
  biochemicalMechanism: string;
  pharmacogenomicSynergy: {
    tpmtRiskDescription: string;
    nudt15RiskDescription: string;
    combinedPhenotypeWarning: string;
  };
  clinicalGuidance: string;
}

/**
 * Evaluates Thiopurine (6-MP / Azathioprine) interaction with Xanthine Oxidase inhibitors (Allopurinol, Febuxostat)
 * and incorporates pharmacogenomic synergy with TPMT and NUDT15 alleles.
 */
export function evaluateThiopurineXoCollision(
  drugIds: string[],
  host?: HostContext & { tpmt?: string; nudt15?: string },
): ThiopurineXoEvaluation {
  const normalized = new Set(drugIds.map((id) => id.toLowerCase()));

  // Recognize aliases
  if (normalized.has("6-mp") || normalized.has("6mp") || normalized.has("purinethol")) {
    normalized.add("mercaptopurine");
  }
  if (normalized.has("imuran") || normalized.has("azasan")) {
    normalized.add("azathioprine");
  }

  const thiopurine = [...normalized].find((id) => THIOPURINE_IDS.has(id)) ?? null;
  const xoInhibitor = [...normalized].find((id) => XO_INHIBITOR_IDS.has(id)) ?? null;

  const hasThiopurine = thiopurine !== null;
  const hasXoInhibitor = xoInhibitor !== null;
  const hasCollision = hasThiopurine && hasXoInhibitor;

  const thiopurineName = thiopurine ? DRUG_BY_ID[thiopurine]?.name ?? thiopurine : null;
  const xoInhibitorName = xoInhibitor ? DRUG_BY_ID[xoInhibitor]?.name ?? xoInhibitor : null;

  const severity = hasCollision ? (xoInhibitor === "febuxostat" ? "contraindicated" : "major") : "none";

  // Standard guideline: reduce 6-MP/AZA by 67% to 75% (prescribe 25% to 33% of original dose)
  const requiredDoseReductionPercent = hasCollision ? 75 : 0;
  const doseMultiplier = hasCollision ? 0.25 : 1.0;

  const biochemicalMechanism =
    "Azathioprine is converted to 6-mercaptopurine (6-MP). 6-MP normally undergoes metabolic fate across three competing pathways: (1) oxidative degradation by xanthine oxidase (XO) to inactive 6-thiouric acid, (2) S-methylation by TPMT to inactive 6-methylmercaptopurine (6-MMP), and (3) activation via hypoxanthine-guanine phosphoribosyltransferase (HGPRT) into 6-thioinosine monophosphate and cytotoxic 6-thioguanine nucleotides (6-TGN). When allopurinol or febuxostat blocks xanthine oxidase, the primary catabolic route is eliminated, shunting nearly all thiopurine flux into the HGPRT pathway. This generates a 400–500% surge in intracellular 6-TGN, which incorporate into genomic DNA, provoking lethal bone marrow aplasia and agranulocytosis.";

  const tpmtRiskDescription =
    "TPMT intermediate (IM) or poor metabolizers (PM, e.g. *2, *3A, *3C) already have compromised alternative S-methylation inactivation. Co-administering an XO inhibitor shuts off the remaining clearance route, routing 100% of 6-MP into cytotoxic 6-TGN.";

  const nudt15RiskDescription =
    "NUDT15 (Nudix Hydrolase 15, e.g. *3 allele) dephosphorylates cytotoxic 6-thio-(d)GTP to 6-thio-(d)GMP, sanitizing the nucleotide pool. In NUDT15 deficiency, high levels of 6-thio-dGTP cannot be cleaved and misincorporate into DNA, compounding fatal hematopoietic failure.";

  const hostTpmt = host?.tpmt ?? "NM";
  const hostNudt15 = host?.nudt15 ?? "NM";
  const isVariantPgx = hostTpmt !== "NM" || hostNudt15 !== "NM";

  const combinedPhenotypeWarning = isVariantPgx
    ? `HIGH-RISK PHARMACOGENOMIC SUBSET: Host has non-normal TPMT (${hostTpmt}) or NUDT15 (${hostNudt15}). Combined XO inhibition with impaired thiopurine metabolism produces an extreme multi-fold risk of fatal pancytopenia; standard thiopurine dosing is contraindicated.`
    : "Standard CPIC guidelines mandate pre-treatment TPMT and NUDT15 genotyping prior to thiopurine initiation.";

  let clinicalGuidance = "";
  if (hasCollision) {
    if (xoInhibitor === "febuxostat") {
      clinicalGuidance = `CONTRAINDICATED COMBINATION: ${thiopurineName} + Febuxostat. Febuxostat is a potent non-purine selective XO inhibitor; co-administration is contraindicated in FDA labeling due to severe prolonged marrow suppression. If uric acid reduction is mandatory, consider alternative agents or switch thiopurine.`;
    } else {
      clinicalGuidance = `CRITICAL BOXED WARNING INTERACTION: ${thiopurineName} + Allopurinol. If co-administration is clinically unavoidable, mandatory guideline requires a 67% to 75% dose reduction of ${thiopurineName} (administer only 25% to 33% of standard dose). Monitor complete blood counts weekly until stable.`;
    }
  } else {
    clinicalGuidance = "No thiopurine x xanthine oxidase collision detected on desk.";
  }

  return {
    hasThiopurine,
    hasXoInhibitor,
    hasCollision,
    thiopurineAgent: thiopurineName,
    xoInhibitorAgent: xoInhibitorName,
    severity,
    requiredDoseReductionPercent,
    doseMultiplier,
    biochemicalMechanism,
    pharmacogenomicSynergy: {
      tpmtRiskDescription,
      nudt15RiskDescription,
      combinedPhenotypeWarning,
    },
    clinicalGuidance,
  };
}

/* ========================================================================== */
/* SECTION 3: CALCINEURIN INHIBITORS & TRIAZOLE ANTIFUNGALS                   */
/* ========================================================================== */

export const CNI_IDS = new Set(["tacrolimus", "cyclosporine"]);
export const TRIAZOLE_IDS = new Set([
  "voriconazole",
  "posaconazole",
  "isavuconazole",
  "itraconazole",
  "fluconazole",
  "ketoconazole",
]);

export interface CniTriazoleEvaluation {
  hasCni: boolean;
  hasTriazole: boolean;
  hasCollision: boolean;
  cniAgent: string | null;
  triazoleAgent: string | null;
  severity: "major" | "contraindicated" | "none";
  troughElevationFold: string;
  recommendedEmpiricDoseReductionPercent: number;
  targetTroughRange: {
    agent: string;
    troughRangeNgMl: string;
    toxicThresholdNgMl: string;
  } | null;
  monitoringFrequencyGuidance: string;
  molecularMechanism: string;
  clinicalToxicityManifestations: string[];
  clinicalGuidance: string;
}

/**
 * Evaluates Calcineurin Inhibitor (Tacrolimus / Cyclosporine) interaction with Triazole Antifungals.
 * Triazoles potently inhibit intestinal & hepatic CYP3A4, CYP3A5, and P-glycoprotein,
 * causing 3- to 5-fold elevation in tacrolimus concentrations.
 */
export function evaluateCniTriazoleCollision(drugIds: string[]): CniTriazoleEvaluation {
  const normalized = new Set(drugIds.map((id) => id.toLowerCase()));

  const cni = [...normalized].find((id) => CNI_IDS.has(id)) ?? null;
  const triazole = [...normalized].find((id) => TRIAZOLE_IDS.has(id)) ?? null;

  const hasCni = cni !== null;
  const hasTriazole = triazole !== null;
  const hasCollision = hasCni && hasTriazole;

  const cniName = cni ? DRUG_BY_ID[cni]?.name ?? cni : null;
  const triazoleName = triazole ? DRUG_BY_ID[triazole]?.name ?? triazole : null;

  const targetTroughRange = cni
    ? cni === "tacrolimus"
      ? {
          agent: "Tacrolimus",
          troughRangeNgMl: "5–15 ng/mL (5–10 ng/mL maintenance; 8–12 ng/mL early post-transplant)",
          toxicThresholdNgMl: ">15–20 ng/mL",
        }
      : {
          agent: "Cyclosporine",
          troughRangeNgMl: "100–300 ng/mL (target trough; C2 2-hour peak 800–1400 ng/mL)",
          toxicThresholdNgMl: ">300–400 ng/mL",
        }
    : null;

  const troughElevationFold = cni === "tacrolimus" ? "3- to 5-fold" : "2- to 3-fold";
  const empiricReduction = cni === "tacrolimus" ? 67 : 50; // 67% reduction for tacrolimus (dose 1/3), 50% for cyclosporine

  const molecularMechanism =
    "Tacrolimus and Cyclosporine are low-bioavailability substrates of intestinal and hepatic cytochrome P450 CYP3A4 and CYP3A5 enzymes, as well as the apical efflux transporter P-glycoprotein (P-gp / ABCB1). Triazole antifungals (especially voriconazole, posaconazole, isavuconazole, and itraconazole) are potent competitive and mechanism-based CYP3A4/P-gp inhibitors. Simultaneous inhibition of enterocyte first-pass extraction and hepatic metabolic clearance multiplies systemic exposure, causing rapid 3- to 5-fold surges in tacrolimus trough concentrations.";

  const clinicalToxicityManifestations = [
    "Acute Calcineurin Inhibitor Nephrotoxicity: Severe afferent arteriolar vasoconstriction causing ischemic hypoperfusion, acute tubular vacuolization, oliguria, and doubling of serum creatinine.",
    "Central Neurotoxicity: Coarse intention tremor, severe headache, confusion, seizures, and Posterior Reversible Encephalopathy Syndrome (PRES) with cortical blindness.",
    "Refractory Hyperkalemia: Direct inhibition of mineralocorticoid-dependent principal cell potassium secretion in the cortical collecting duct.",
    "Thrombotic Microangiopathy (TMA) / Hemolytic Uremic Syndrome (HUS): Endothelial cell injury with microangiopathic hemolytic anemia and thrombocytopenia.",
  ];

  const monitoringFrequencyGuidance =
    "Perform baseline TDM trough immediately prior to triazole initiation. Check serum trough concentration at 48 to 72 hours following triazole initiation or dosage adjustment, and at least 2 to 3 times per week until a stable steady-state trough is re-established. Repeat frequent TDM upon triazole discontinuation, as CYP3A inhibition resolves over 5 to 10 days.";

  let clinicalGuidance = "";
  if (hasCollision) {
    clinicalGuidance = `POTENT CYP3A4 & P-GP COLLISION: ${cniName} + ${triazoleName}. Antifungal co-administration provokes a ${troughElevationFold} elevation in ${cniName} trough concentrations. Standard clinical practice mandates an empiric proactive dose reduction of ${cniName} by ${empiricReduction}% upon triazole initiation, followed by rigorous therapeutic drug monitoring at 48–72 hours.`;
  } else {
    clinicalGuidance = "No calcineurin inhibitor x triazole collision detected on desk.";
  }

  return {
    hasCni,
    hasTriazole,
    hasCollision,
    cniAgent: cniName,
    triazoleAgent: triazoleName,
    severity: hasCollision ? "major" : "none",
    troughElevationFold,
    recommendedEmpiricDoseReductionPercent: empiricReduction,
    targetTroughRange,
    monitoringFrequencyGuidance,
    molecularMechanism,
    clinicalToxicityManifestations,
    clinicalGuidance,
  };
}

/* ========================================================================== */
/* SECTION 4: DETECTION FUNCTION & REPORT GENERATOR                           */
/* ========================================================================== */

export const ONCOLOGY_CORE_IDS = new Set([
  "methotrexate",
  "mercaptopurine",
  "azathioprine",
  "tacrolimus",
  "cyclosporine",
  "leucovorin",
  "leucovorin-tox",
  "glucarpidase",
  "glucarpidase-mtx",
]);

/**
 * Detection function: returns true if any core oncology antimetabolite,
 * immunosuppressant, or rescue agent is on the active desk tray.
 */
export function oncologyOnDesk(drugIds: string[]): boolean {
  const normalized = drugIds.map((id) => id.toLowerCase().trim());
  return normalized.some((id) => {
    if (ONCOLOGY_CORE_IDS.has(id)) return true;
    if (["6-mp", "6mp", "purinethol", "imuran", "azasan", "prograf", "neoral", "sandimmune"].includes(id)) {
      return true;
    }
    return false;
  });
}

export interface OncologyReport {
  hasOncology: boolean;
  presentAgents: string[];
  overallRiskTier: "critical" | "high" | "moderate" | "standard";
  hdmtxReport: {
    hasMethotrexate: boolean;
    collisions: MtxCollisionAlert[];
    nomogramMilestones: typeof HDMTX_MILESTONES;
    urineAlkalinizationGuidance: string;
    rescueOverview: string;
  };
  thiopurineReport: ThiopurineXoEvaluation;
  cniReport: CniTriazoleEvaluation;
  activeAlerts: string[];
  clinicalPearls: string[];
  regulatoryNotice: string;
}

/**
 * Report generator: synthesizes complete antimetabolite, immunosuppressant,
 * rescue kinetics, and clearance collision analysis for the active desk.
 */
export function oncologyReportOnDesk(drugIds: string[], host?: HostContext): OncologyReport {
  const normalized = drugIds.map((id) => id.toLowerCase().trim());
  const hasOnc = oncologyOnDesk(normalized);

  const presentAgents = normalized
    .filter((id) => {
      if (ONCOLOGY_CORE_IDS.has(id)) return true;
      if (XO_INHIBITOR_IDS.has(id)) return true;
      if (TRIAZOLE_IDS.has(id)) return true;
      return false;
    })
    .map((id) => DRUG_BY_ID[id]?.name ?? id);

  const hasMtx = normalized.includes("methotrexate");
  const mtxCollisions = hasMtx ? detectMtxCollisions(normalized) : [];

  const thiopurineReport = evaluateThiopurineXoCollision(normalized, host as any);
  const cniReport = evaluateCniTriazoleCollision(normalized);

  const activeAlerts: string[] = [];

  if (hasMtx) {
    if (mtxCollisions.length > 0) {
      for (const col of mtxCollisions) {
        activeAlerts.push(
          `[HDMTX Collision - ${col.severity.toUpperCase()}] ${col.drugName}: ${col.hazard}`,
        );
      }
    } else {
      activeAlerts.push(
        "[HDMTX Standard Protocol] Requires strict urine alkalinization (urine pH >= 7.0), hyperhydration (>= 3 L/m²/day), and scheduled Leucovorin rescue.",
      );
    }
  }

  if (thiopurineReport.hasCollision) {
    activeAlerts.push(
      `[Thiopurine x XO Inhibitor - ${thiopurineReport.severity.toUpperCase()}] ${thiopurineReport.thiopurineAgent} + ${thiopurineReport.xoInhibitorAgent}: Mandatory 67%–75% thiopurine dose cut required to prevent fatal marrow aplasia.`,
    );
  }

  if (cniReport.hasCollision) {
    activeAlerts.push(
      `[Calcineurin Inhibitor x Triazole - ${cniReport.severity.toUpperCase()}] ${cniReport.cniAgent} + ${cniReport.triazoleAgent}: Strong CYP3A4/P-gp inhibition causes 3–5x trough elevation. Empiric dose reduction and close TDM indicated.`,
    );
  }

  let overallRiskTier: OncologyReport["overallRiskTier"] = "standard";
  if (
    mtxCollisions.some((c) => c.severity === "contraindicated") ||
    thiopurineReport.severity === "contraindicated"
  ) {
    overallRiskTier = "critical";
  } else if (
    mtxCollisions.some((c) => c.severity === "major") ||
    thiopurineReport.hasCollision ||
    cniReport.hasCollision
  ) {
    overallRiskTier = "high";
  } else if (hasMtx || thiopurineReport.hasThiopurine || cniReport.hasCni) {
    overallRiskTier = "moderate";
  }

  const clinicalPearls = [
    "High-Dose Methotrexate (HDMTX) nephrotoxicity is primarily caused by intratubular precipitation of 7-OH-MTX and MTX crystals at acidic pH. Maintaining urine pH >= 7.0 with high-volume hydration increases solubility >10- to 50-fold.",
    "Glucarpidase (Voraxaze) cleaves MTX to inactive DAMPA within 15 minutes, but also cleaves Leucovorin! Do not administer Leucovorin within 2 hours before or after Glucarpidase.",
    "Following Glucarpidase, clinical immunoassays (ECLIA/EMIT) falsely report elevated MTX levels for 48–72 hours due to DAMPA cross-reactivity. Use chromatographic assays (LC-MS/MS).",
    "Allopurinol or Febuxostat eliminates xanthine oxidase catabolism of 6-MP, diverting drug into the HGPRT pathway and producing a massive surge in cytotoxic 6-thioguanine nucleotides (6-TGN). Mandatory 67% to 75% thiopurine dose reduction is required.",
    "Strong triazoles (voriconazole, posaconazole) inhibit CYP3A4 and enterocyte P-gp, multiplying tacrolimus exposure 3- to 5-fold. Proactively reduce tacrolimus by ~67% and check trough level at 48–72 hours.",
  ];

  return {
    hasOncology: hasOnc,
    presentAgents,
    overallRiskTier,
    hdmtxReport: {
      hasMethotrexate: hasMtx,
      collisions: mtxCollisions,
      nomogramMilestones: HDMTX_MILESTONES,
      urineAlkalinizationGuidance:
        "Urine pH must be verified >= 7.0 prior to HDMTX start and maintained >= 7.0 throughout therapy with continuous IV sodium bicarbonate infusion and hydration >= 3 L/m²/day.",
      rescueOverview:
        "Leucovorin rescue typically initiates 24–42h post-MTX start. Dose escalation is governed by 24h, 48h, and 72h serum MTX concentrations until MTX is <= 0.05 µM.",
    },
    thiopurineReport,
    cniReport,
    activeAlerts,
    clinicalPearls,
    regulatoryNotice: ONCOLOGY_KINETICS_REGULATORY_DISCLAIMER,
  };
}
