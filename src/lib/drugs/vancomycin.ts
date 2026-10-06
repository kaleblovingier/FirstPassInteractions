/**
 * Vancomycin Pharmacokinetics & Consensus Therapeutic Drug Monitoring (ASHP/IDSA/PIDS/SIDP 2020).
 * Sawchuk-Zaske two-concentration peak/trough equations and Bayesian-comparable AUC24:MIC targeting.
 * Educational reference only. Not a medical order or directive clinical decision support.
 */

import { DRUG_BY_ID } from "./catalog";

export interface VancoSawchukZaskeInput {
  /** Dose administered (mg) */
  doseMg: number;
  /** Infusion duration (hours), typically 1 to 2 hours (≤1000 mg/h rate) */
  infusionHours: number;
  /** Dosing interval tau (hours), e.g. 8, 12, 24, 48 */
  tauHours: number;
  /** Peak serum concentration C1 (µg/mL) drawn post-infusion */
  c1PeakUgMl: number;
  /** Time between end of infusion and C1 peak draw (hours), recommended ≥1–2 h */
  t1HoursPostInfusion: number;
  /** Trough serum concentration C2 (µg/mL) drawn prior to next dose */
  c2TroughUgMl: number;
  /** Time between C2 trough draw and next scheduled dose (hours), typically 0.5 h */
  t2HoursBeforeNextDose: number;
  /** Minimum Inhibitory Concentration (mg/L), default 1.0 */
  mic?: number;
}

export interface VancoSawchukZaskeResult {
  /** Elimination rate constant ke (1/h) */
  ke: number;
  /** Elimination half-life (hours) */
  halfLifeHours: number;
  /** Extrapolated true peak at end of infusion Cmax (µg/mL) */
  trueCmaxUgMl: number;
  /** Extrapolated true trough at end of dosing interval Cmin (µg/mL) */
  trueCminUgMl: number;
  /** Volume of distribution Vd (L) */
  vdL: number;
  /** Systemic clearance Cl (L/h) */
  clearanceLPerHr: number;
  /** 24-hour Area Under the Curve AUC24 (mg·h/L) */
  auc24: number;
  /** AUC24 / MIC ratio */
  aucToMicRatio: number;
  /** Therapeutic target classification */
  band: "subtherapeutic" | "target" | "supratherapeutic";
  label: string;
  clinicalNote: string;
  samplingTimingWarning: string | null;
  troughContextNote: string;
}

export function calculateVancoSawchukZaske({
  doseMg,
  infusionHours,
  tauHours,
  c1PeakUgMl,
  t1HoursPostInfusion,
  c2TroughUgMl,
  t2HoursBeforeNextDose,
  mic = 1.0,
}: VancoSawchukZaskeInput): VancoSawchukZaskeResult | null {
  if (
    !Number.isFinite(doseMg) ||
    !Number.isFinite(infusionHours) ||
    !Number.isFinite(tauHours) ||
    !Number.isFinite(c1PeakUgMl) ||
    !Number.isFinite(t1HoursPostInfusion) ||
    !Number.isFinite(c2TroughUgMl) ||
    !Number.isFinite(t2HoursBeforeNextDose) ||
    !Number.isFinite(mic) ||
    doseMg < 250 ||
    doseMg > 6000 ||
    infusionHours <= 0 ||
    infusionHours > 6 ||
    tauHours < 6 ||
    tauHours > 72 ||
    c1PeakUgMl <= 0 ||
    c1PeakUgMl > 120 ||
    c2TroughUgMl <= 0 ||
    c2TroughUgMl > 100 ||
    t1HoursPostInfusion < 0 ||
    t1HoursPostInfusion > 12 ||
    t2HoursBeforeNextDose < 0 ||
    t2HoursBeforeNextDose > 12 ||
    mic <= 0 ||
    mic > 16
  ) {
    return null;
  }

  // Elapsed time between C1 and C2 samples:
  // C1 time = infusionHours + t1HoursPostInfusion
  // C2 time = tauHours - t2HoursBeforeNextDose
  const deltaT = tauHours - infusionHours - t1HoursPostInfusion - t2HoursBeforeNextDose;
  if (deltaT <= 0.5 || c1PeakUgMl <= c2TroughUgMl) {
    // Inverted or non-spaced concentrations
    return null;
  }

  // 1. Elimination rate constant ke (1/h)
  const keRaw = Math.log(c1PeakUgMl / c2TroughUgMl) / deltaT;
  if (keRaw <= 0.001 || keRaw > 0.5) {
    return null;
  }
  const ke = Math.round(keRaw * 1000) / 1000;

  // 2. Elimination half-life (h)
  const halfLifeHours = Math.round((Math.LN2 / keRaw) * 10) / 10;

  // 3. Extrapolate True Peak (Cmax at end of infusion)
  // Cmax = C1 * e^(ke * t1)
  const trueCmaxUgMl = Math.round(c1PeakUgMl * Math.exp(keRaw * t1HoursPostInfusion) * 10) / 10;

  // 4. Extrapolate True Trough (Cmin immediately prior to next dose)
  // Cmin = C2 * e^(-ke * t2)
  const trueCminUgMl = Math.round(c2TroughUgMl * Math.exp(-keRaw * t2HoursBeforeNextDose) * 10) / 10;

  // 5. Volume of distribution Vd (L)
  // Intermittent IV infusion one-compartment steady-state model:
  // Vd = [Dose * (1 - e^(-ke * t_inf))] / [t_inf * ke * (Cmax - Cmin * e^(-ke * t_inf))]
  const expKeTinf = Math.exp(-keRaw * infusionHours);
  const denom = infusionHours * keRaw * (trueCmaxUgMl - trueCminUgMl * expKeTinf);
  if (denom <= 0) {
    return null;
  }
  const vdLRaw = (doseMg * (1 - expKeTinf)) / denom;
  if (vdLRaw < 10 || vdLRaw > 250) {
    return null;
  }
  const vdL = Math.round(vdLRaw * 10) / 10;

  // 6. Clearance Cl (L/h)
  const clearanceRaw = keRaw * vdLRaw;
  const clearanceLPerHr = Math.round(clearanceRaw * 100) / 100;

  // 7. Steady-state 24-hour AUC (mg·h/L)
  // AUC_tau = Dose / Cl; AUC24 = AUC_tau * (24 / tau)
  const totalDailyDoseMg = doseMg * (24 / tauHours);
  const auc24Raw = totalDailyDoseMg / clearanceRaw;
  const auc24 = Math.round(auc24Raw);
  const aucToMicRatio = Math.round((auc24 / mic) * 10) / 10;

  // Target window classification (400–600 mg·h/L for serious MRSA)
  let band: VancoSawchukZaskeResult["band"] = "target";
  let label = "Target Therapeutic Window (AUC24:MIC 400–600)";
  let clinicalNote =
    "2020 ASHP/IDSA/PIDS/SIDP consensus target achieved. Maximizes clinical cure in serious MRSA infections (bacteremia, endocarditis, pneumonia, osteomyelitis) while minimizing nephrotoxicity risk.";

  if (aucToMicRatio < 400) {
    band = "subtherapeutic";
    label = "Subtherapeutic Exposure (AUC24:MIC <400)";
    clinicalNote =
      "AUC24:MIC <400 correlates with clinical treatment failure and increases selective pressure for vancomycin-intermediate S. aureus (VISA). Dose titration or interval shortening is typically reviewed.";
  } else if (aucToMicRatio > 600) {
    band = "supratherapeutic";
    label = "Supratherapeutic / Nephrotoxicity Watch (AUC24:MIC >600)";
    clinicalNote =
      "AUC24:MIC >600 confers a 3- to 4-fold increased incidence of acute kidney injury (AKI). Risk multiplies when co-prescribed with nephrotoxic agents (e.g. piperacillin-tazobactam, aminoglycosides, IV contrast, NSAIDs).";
  }

  // Sampling timing check: alpha-distribution phase
  let samplingTimingWarning: string | null = null;
  if (t1HoursPostInfusion < 1.0) {
    samplingTimingWarning =
      "Warning: C1 Peak was drawn <1.0 h post-infusion. Vancomycin distribution (alpha-phase) requires 1–2 hours post-infusion to reach tissue equilibrium. Drawing early reflects vascular distribution and overestimates elimination rate constant (ke), leading to falsely depressed Vd.";
  }

  const troughContextNote =
    `Extrapolated steady-state trough is ${trueCminUgMl} µg/mL. Under 2020 guidelines, targeting troughs of 15–20 µg/mL is explicitly deprecated due to nephrotoxicity; AUC-guided dosing frequently achieves therapeutic efficacy (AUC 400–600) with troughs between 10–15 µg/mL.`;

  return {
    ke,
    halfLifeHours,
    trueCmaxUgMl,
    trueCminUgMl,
    vdL,
    clearanceLPerHr,
    auc24,
    aucToMicRatio,
    band,
    label,
    clinicalNote,
    samplingTimingWarning,
    troughContextNote,
  };
}

export function vancomycinOnDesk(ids: string[]): boolean {
  return ids.includes("vancomycin");
}

export interface VancomycinTrayReport {
  hasVancomycin: boolean;
  vancomycinDrugName: string | null;
  hasZosynCollision: boolean;
  zosynDrugName: string | null;
  alertNote: string | null;
}

export function vancomycinReportOnDesk(ids: string[]): VancomycinTrayReport {
  const hasVancomycin = ids.includes("vancomycin");
  const hasZosyn = ids.includes("piperacillin-tazobactam");

  let alertNote: string | null = null;
  if (hasVancomycin && hasZosyn) {
    alertNote =
      "Active tray collision: IV Vancomycin + Piperacillin–tazobactam (Zosyn). Landmark observational trials (Luther 2018, Schreier 2014) demonstrate a synergistic doubling of acute kidney injury (AKI) compared to vancomycin + cefepime. Daily SCr, urine output, and AUC-guided dosing recommended.";
  } else if (hasVancomycin) {
    alertNote =
      "IV Vancomycin active on tray. Target AUC24:MIC 400–600 mg·h/L. Avoid empirical trough targeting of 15–20 µg/mL.";
  }

  return {
    hasVancomycin,
    vancomycinDrugName: hasVancomycin ? DRUG_BY_ID["vancomycin"]?.name ?? "Vancomycin" : null,
    hasZosynCollision: hasVancomycin && hasZosyn,
    zosynDrugName: hasZosyn ? DRUG_BY_ID["piperacillin-tazobactam"]?.name ?? "Piperacillin–tazobactam" : null,
    alertNote,
  };
}

