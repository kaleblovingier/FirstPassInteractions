/**
 * Phenobarbital Pharmacokinetics, Loading Kinetics & Elimination Enhancement.
 * AWS built-in taper, Status Epilepticus loading, and Henderson-Hasselbalch urinary alkalinization.
 * Educational reference only. Not a medical order or directive clinical decision support.
 */

import { DRUG_BY_ID } from "./catalog";

export type PhenobarbitalIndication = "alcohol-withdrawal" | "status-epilepticus" | "maintenance-tdm";

export interface PhenobarbitalLoadingInput {
  weightKg: number;
  indication: PhenobarbitalIndication;
  currentLevelUgMl?: number;
  targetLevelUgMl?: number;
  vdLPerKg?: number;
}

export interface PhenobarbitalLoadingResult {
  weightKg: number;
  indication: PhenobarbitalIndication;
  currentLevelUgMl: number;
  targetLevelUgMl: number;
  deficitUgMl: number;
  vdLPerKg: number;
  totalVdL: number;
  loadingDoseMg: number;
  loadingDoseMgPerKg: number;
  maxInfusionRateMgPerMin: number;
  minInfusionDurationMinutes: number;
  indicationGuidance: string;
  propyleneGlycolAlert: string;
  respiratorySedationNote: string;
  builtInTaperPearl: string;
}

export function calculatePhenobarbitalLoading({
  weightKg,
  indication,
  currentLevelUgMl = 0,
  targetLevelUgMl,
  vdLPerKg = 0.6,
}: PhenobarbitalLoadingInput): PhenobarbitalLoadingResult | null {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(currentLevelUgMl) ||
    !Number.isFinite(vdLPerKg) ||
    weightKg < 20 ||
    weightKg > 300 ||
    currentLevelUgMl < 0 ||
    currentLevelUgMl > 120 ||
    vdLPerKg < 0.4 ||
    vdLPerKg > 1.0
  ) {
    return null;
  }

  // Default targets if not specified
  let defaultTarget = 20;
  if (indication === "alcohol-withdrawal") {
    defaultTarget = 20; // 15–25 µg/mL
  } else if (indication === "status-epilepticus") {
    defaultTarget = 20; // 20–40 µg/mL
  } else {
    defaultTarget = 20; // 15–40 µg/mL
  }

  const effectiveTarget = targetLevelUgMl ?? defaultTarget;
  if (!Number.isFinite(effectiveTarget) || effectiveTarget < 5 || effectiveTarget > 60) {
    return null;
  }

  const deficitUgMl = Math.max(0, effectiveTarget - currentLevelUgMl);
  const totalVdL = Math.round(weightKg * vdLPerKg * 10) / 10;
  const rawLoadingDoseMg = totalVdL * deficitUgMl;
  const loadingDoseMg = Math.round(rawLoadingDoseMg / 10) * 10; // Round to nearest 10 mg
  const loadingDoseMgPerKg = Math.round((loadingDoseMg / weightKg) * 10) / 10;

  // Adult max infusion rate: 60 mg/min (to prevent hemodynamic collapse from propylene glycol)
  const maxInfusionRateMgPerMin = 60;
  const minInfusionDurationMinutes = Math.max(5, Math.ceil(loadingDoseMg / maxInfusionRateMgPerMin));

  let indicationGuidance = "";
  if (indication === "alcohol-withdrawal") {
    indicationGuidance =
      "Alcohol / Sedative Withdrawal (AWS): Loading strategy aims for 15–25 µg/mL. Unlike short-acting benzodiazepines, phenobarbital's 80–120 h half-life provides an intrinsic 'built-in auto-taper', drastically reducing ICU admissions, delirium tremens, and recurrent seizure rebound.";
  } else if (indication === "status-epilepticus") {
    indicationGuidance =
      "Status Epilepticus (SE): Second-line or third-line anticonvulsant loading. 15–20 mg/kg initial load (target 20–40 µg/mL) delivers rapid GABA-A receptor activation and presynaptic glutamate inhibition.";
  } else {
    indicationGuidance =
      "Maintenance / Epilepsy TDM: Standard target window 15–40 µg/mL. Steady state requires 2–3 weeks (4–5 half-lives) without a loading dose.";
  }

  const propyleneGlycolAlert =
    `Black box caution: IV phenobarbital contains propylene glycol and alcohol co-solvents. Maximum IV infusion velocity is 60 mg/min (minimum ${minInfusionDurationMinutes} minutes for this ${loadingDoseMg} mg dose). Rapid IV push precipitates acute hypotension, bradycardia, cardiac arrest, and thrombophlebitis.`;

  const respiratorySedationNote =
    "Synergistic CNS / Respiratory Depression: Concomitant opioids, benzodiazepines, or active ethanol intoxication multiply respiratory drive suppression. Continuous pulse oximetry, telemetry, and bag-valve-mask equipment at bedside are mandatory.";

  const builtInTaperPearl =
    "Pharmacokinetic Pearl: Phenobarbital half-life in adults is 80–120 hours (~3.5 to 5 days). After a successful loading dose, therapeutic serum levels persist for several days and decay smoothly over 10–14 days, preventing acute withdrawal relapse without requiring scheduled tapering pills.";

  return {
    weightKg,
    indication,
    currentLevelUgMl,
    targetLevelUgMl: effectiveTarget,
    deficitUgMl,
    vdLPerKg,
    totalVdL,
    loadingDoseMg,
    loadingDoseMgPerKg,
    maxInfusionRateMgPerMin,
    minInfusionDurationMinutes,
    indicationGuidance,
    propyleneGlycolAlert,
    respiratorySedationNote,
    builtInTaperPearl,
  };
}

export interface PhenobarbitalEliminationInput {
  baselineUrinePh?: number;
  alkalinizedUrinePh?: number;
  serumLevelUgMl?: number;
}

export interface PhenobarbitalEliminationResult {
  pKa: number;
  baselineUrinePh: number;
  alkalinizedUrinePh: number;
  baselineIonizedPercent: number;
  alkalinizedIonizedPercent: number;
  ionizationFoldIncrease: number;
  clearanceFoldIncrease: number;
  toxicityBand: "therapeutic" | "elevated" | "severe-toxicity" | "lethal-overdose";
  toxicityLabel: string;
  protocolSummary: string;
  paradoxicalAciduriaAlert: string;
  hemodialysisCriteria: string;
}

export function calculatePhenobarbitalElimination({
  baselineUrinePh = 6.0,
  alkalinizedUrinePh = 7.8,
  serumLevelUgMl = 65,
}: PhenobarbitalEliminationInput): PhenobarbitalEliminationResult | null {
  if (
    !Number.isFinite(baselineUrinePh) ||
    !Number.isFinite(alkalinizedUrinePh) ||
    !Number.isFinite(serumLevelUgMl) ||
    baselineUrinePh < 4.5 ||
    baselineUrinePh > 8.5 ||
    alkalinizedUrinePh < 6.5 ||
    alkalinizedUrinePh > 9.0 ||
    serumLevelUgMl < 0 ||
    serumLevelUgMl > 300
  ) {
    return null;
  }

  // Phenobarbital pKa is ~7.24 (typically 7.2 to 7.4)
  const pKa = 7.24;

  // Henderson-Hasselbalch equation for weak acid:
  // [A-] / [HA] = 10^(pH - pKa)
  // Fraction ionized = 1 / (1 + 10^(pKa - pH))
  const baseFractionIonized = 1 / (1 + Math.pow(10, pKa - baselineUrinePh));
  const alkFractionIonized = 1 / (1 + Math.pow(10, pKa - alkalinizedUrinePh));

  const baselineIonizedPercent = Math.round(baseFractionIonized * 1000) / 10;
  const alkalinizedIonizedPercent = Math.round(alkFractionIonized * 1000) / 10;

  const ionizationFoldIncrease =
    baseFractionIonized > 0
      ? Math.round((alkFractionIonized / baseFractionIonized) * 10) / 10
      : 1;

  // Clinical studies (Waddell & Butler, Proudfoot) show renal clearance increases 5- to 10-fold
  // with urinary alkalinization to pH 7.5–8.0
  const clearanceFoldIncrease = Math.min(10, Math.max(1, Math.round(ionizationFoldIncrease * 0.8 * 10) / 10));

  let toxicityBand: PhenobarbitalEliminationResult["toxicityBand"] = "therapeutic";
  let toxicityLabel = "Therapeutic Range (15–40 µg/mL)";

  if (serumLevelUgMl > 100) {
    toxicityBand = "lethal-overdose";
    toxicityLabel = "Critical / Life-Threatening Overdose (>100 µg/mL)";
  } else if (serumLevelUgMl > 60) {
    toxicityBand = "severe-toxicity";
    toxicityLabel = "Severe Barbiturate Toxicity (>60 µg/mL) · Coma / Respiratory Failure";
  } else if (serumLevelUgMl > 40) {
    toxicityBand = "elevated";
    toxicityLabel = "Supratherapeutic / Sedation Watch (41–60 µg/mL)";
  }

  const protocolSummary =
    `Urinary Alkalinization Protocol: Administer IV Sodium Bicarbonate (100–150 mEq in 1,000 mL D5W at 150–250 mL/h) to maintain urine pH between 7.5 and 8.0. Blood gas must be checked every 2–4 hours; stop or reduce bicarbonate if systemic arterial/venous pH exceeds 7.55.`;

  const paradoxicalAciduriaAlert =
    `CRITICAL TRAP — Hypokalemic Paradoxical Aciduria: Systemic alkalinization drives potassium into intracellular compartments, provoking acute hypokalemia. When serum K+ drops, renal distal tubular H+/K+ antiporters are forced to excrete H+ into the lumen to preserve potassium, resulting in paradoxical acid urine (pH <7.0) despite high serum bicarbonate! Maintain serum potassium strictly between 4.0–4.5 mEq/L with aggressive potassium chloride co-infusion.`;

  const hemodialysisCriteria =
    `Extracorporeal Elimination Indications: High-flux hemodialysis or charcoal hemoperfusion is indicated for severe phenobarbital poisoning when: (1) Serum level >100 µg/mL; (2) Refractory shock / hypotension unresponsive to vasopressors; (3) Prolonged deep unarousable coma; or (4) Renal failure or severe pulmonary edema precluding bicarbonate fluid load.`;

  return {
    pKa,
    baselineUrinePh,
    alkalinizedUrinePh,
    baselineIonizedPercent,
    alkalinizedIonizedPercent,
    ionizationFoldIncrease,
    clearanceFoldIncrease,
    toxicityBand,
    toxicityLabel,
    protocolSummary,
    paradoxicalAciduriaAlert,
    hemodialysisCriteria,
  };
}

export function phenobarbitalOnDesk(ids: string[]): boolean {
  return ids.includes("phenobarbital") || ids.includes("primidone");
}

export interface PhenobarbitalTrayReport {
  hasPhenobarbital: boolean;
  hasPrimidone: boolean;
  activeDrugName: string | null;
  primidoneProdrugNote: string | null;
  broadInductionSummary: string | null;
}

export function phenobarbitalReportOnDesk(ids: string[]): PhenobarbitalTrayReport {
  const hasPheno = ids.includes("phenobarbital");
  const hasPrimidone = ids.includes("primidone");
  const active = hasPheno || hasPrimidone;

  let activeDrugName: string | null = null;
  if (hasPheno && hasPrimidone) {
    activeDrugName = "Phenobarbital + Primidone";
  } else if (hasPheno) {
    activeDrugName = DRUG_BY_ID["phenobarbital"]?.name ?? "Phenobarbital";
  } else if (hasPrimidone) {
    activeDrugName = DRUG_BY_ID["primidone"]?.name ?? "Primidone";
  }

  let primidoneProdrugNote: string | null = null;
  if (hasPrimidone) {
    primidoneProdrugNote =
      "Primidone is an active prodrug biotransformed by CYP2C19 into phenobarbital and phenylethylmalonamide (PEMA). Full barbiturate TDM and CYP enzyme induction develop over 1–2 weeks.";
  }

  let broadInductionSummary: string | null = null;
  if (active) {
    broadInductionSummary =
      "Potent CYP Inducer: Phenobarbital is a potent transcriptional inducer of CYP3A4, CYP2C9, CYP2C19, UGT enzymes, and P-glycoprotein. Major interaction casualties include oral contraceptives (loss of efficacy), direct oral anticoagulants (DOAC failure), methadone (withdrawal), and immunosuppressants (tacrolimus/cyclosporine rejection).";
  }

  return {
    hasPhenobarbital: hasPheno,
    hasPrimidone,
    activeDrugName,
    primidoneProdrugNote,
    broadInductionSummary,
  };
}

