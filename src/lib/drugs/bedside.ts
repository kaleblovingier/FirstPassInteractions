/** Bedside teaching calculators — Bazett / Fridericia QTc and Cockcroft–Gault. Not a charted QTc. */

export interface QtcInput {
  qtMs: number;
  hr: number;
}

export interface QtcResult {
  rr: number;
  bazett: number;
  fridericia: number;
  note: string;
}

export function qtcOf({ qtMs, hr }: QtcInput): QtcResult | null {
  if (!Number.isFinite(qtMs) || !Number.isFinite(hr) || qtMs < 200 || qtMs > 800 || hr < 30 || hr > 220) {
    return null;
  }
  const rr = 60 / hr;
  const bazett = qtMs / Math.sqrt(rr);
  const fridericia = qtMs / rr ** (1 / 3);
  let note = "Fridericia is quieter at high heart rates. Bazett over-corrects tachycardia.";
  if (bazett >= 500 || fridericia >= 500) {
    note = "≥500 ms on either formula is the classic high-risk teaching cut — electrolytes, stop a possible-risk agent if you can. Not a diagnosis of TdP.";
  } else if (bazett >= 470) {
    note = "Prolonged on many maps (often ~450 men / ~470 women). This desk is not sex-adjusted and not an ECG.";
  }
  return {
    rr: Math.round(rr * 1000) / 1000,
    bazett: Math.round(bazett),
    fridericia: Math.round(fridericia),
    note,
  };
}

export type Sex = "male" | "female";

export interface CrclInput {
  age: number;
  weightKg: number;
  scr: number;
  sex: Sex;
}

export interface CrclResult {
  crcl: number;
  band: "usual" | "caution" | "severe";
  note: string;
}

export function crclOf({ age, weightKg, scr, sex }: CrclInput): CrclResult | null {
  if (
    !Number.isFinite(age) ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(scr) ||
    age < 18 ||
    age > 110 ||
    weightKg < 30 ||
    weightKg > 250 ||
    scr <= 0 ||
    scr > 20
  ) {
    return null;
  }
  const crcl = ((140 - age) * weightKg * (sex === "female" ? 0.85 : 1)) / (72 * scr);
  const rounded = Math.round(crcl);
  let band: CrclResult["band"] = "usual";
  let note = "Cockcroft–Gault, not CKD-EPI. Many labels still dose on this number. IBW vs total weight is a separate argument for obesity.";
  if (rounded < 30) {
    band = "severe";
    note = "CrCl <30 — several NTI and DOAC rows on this desk become avoid or specialist-only. Flip CKD on the host to score them.";
  } else if (rounded < 60) {
    band = "caution";
    note = "CrCl 30–59. Dose-cuts live here for dabigatran, gabapentin, lithium, enoxaparin. Flip CKD on the host.";
  }
  return { crcl: rounded, band, note };
}

/** Sheiner–Tozer total-to-corrected phenytoin. Hypoalbuminemia teaching — not a free level. */
export interface PhenytoinInput {
  total: number;
  albumin: number;
  crclLow: boolean;
}

export interface PhenytoinResult {
  corrected: number;
  note: string;
}

export function phenytoinCorrected({ total, albumin, crclLow }: PhenytoinInput): PhenytoinResult | null {
  if (
    !Number.isFinite(total) ||
    !Number.isFinite(albumin) ||
    total <= 0 ||
    total > 80 ||
    albumin < 0.8 ||
    albumin > 6
  ) {
    return null;
  }
  const adj = crclLow ? 0.1 : 0.2;
  const corrected = total / (adj * albumin + 0.1);
  const rounded = Math.round(corrected * 10) / 10;
  let note =
    "Sheiner–Tozer. Corrected ≈ total / ((0.2 × albumin) + 0.1). CrCl <10 uses 0.1 × albumin. A free level is better when you can get one.";
  if (rounded >= 20) {
    note = `Corrected ~${rounded} µg/mL — nystagmus teaching starts around 20 total. This is not a free phenytoin and not a dose cut.`;
  }
  return { corrected: rounded, note };
}

/** Child-Pugh classification for hepatic impairment. FDA PK guidance standard. */
export type BilirubinBand = "under2" | "twoToThree" | "over3";
export type AlbuminBand = "over35" | "twoEightToThreeFive" | "under28";
export type InrBand = "under17" | "oneSevenToTwoThree" | "over23";
export type AscitesGrade = "none" | "slight" | "moderate";
export type EncephalopathyGrade = "none" | "grade1_2" | "grade3_4";

export interface ChildPughInput {
  bilirubin: BilirubinBand;
  albumin: AlbuminBand;
  inr: InrBand;
  ascites: AscitesGrade;
  encephalopathy: EncephalopathyGrade;
}

export interface ChildPughResult {
  score: number;
  classBand: "A" | "B" | "C";
  impairment: "mild" | "moderate" | "severe";
  label: string;
  note: string;
}

export function childPughOf({
  bilirubin,
  albumin,
  inr,
  ascites,
  encephalopathy,
}: ChildPughInput): ChildPughResult {
  const biliPts = bilirubin === "under2" ? 1 : bilirubin === "twoToThree" ? 2 : 3;
  const albPts = albumin === "over35" ? 1 : albumin === "twoEightToThreeFive" ? 2 : 3;
  const inrPts = inr === "under17" ? 1 : inr === "oneSevenToTwoThree" ? 2 : 3;
  const ascPts = ascites === "none" ? 1 : ascites === "slight" ? 2 : 3;
  const encephPts = encephalopathy === "none" ? 1 : encephalopathy === "grade1_2" ? 2 : 3;

  const score = biliPts + albPts + inrPts + ascPts + encephPts;
  let classBand: ChildPughResult["classBand"] = "A";
  let impairment: ChildPughResult["impairment"] = "mild";
  let label = "Class A (5–6 pts) · Mild impairment";
  let note =
    "Class A (5–6 points): Well-compensated liver disease. Many FDA labels permit standard starting regimens with clinical and laboratory monitoring.";

  if (score >= 10) {
    classBand = "C";
    impairment = "severe";
    label = "Class C (10–15 pts) · Severe impairment";
    note =
      "Class C (10–15 points): Decompensated cirrhosis. Portosystemic shunting dramatically reduces first-pass hepatic extraction. Many labels contraindicate or lack pharmacokinetic data.";
  } else if (score >= 7) {
    classBand = "B";
    impairment = "moderate";
    label = "Class B (7–9 pts) · Moderate impairment";
    note =
      "Class B (7–9 points): Significant functional compromise. Frequent FDA label cutoff for empirical 50% dose reductions, extended dosing intervals, or specialist oversight.";
  }

  return { score, classBand, impairment, label, note };
}

/** Vancomycin 24-hour AUC / MIC consensus pharmacokinetic calculator (ASHP/IDSA/PIDS/SIDP 2020). */
export interface VancoAucInput {
  totalDailyDoseMg: number;
  crcl: number;
  mic?: number;
}

export interface VancoAucResult {
  auc24: number;
  mic: number;
  ratio: number;
  band: "subtherapeutic" | "target" | "supratherapeutic";
  label: string;
  note: string;
}

export function vancoAucOf({
  totalDailyDoseMg,
  crcl,
  mic = 1,
}: VancoAucInput): VancoAucResult | null {
  if (
    !Number.isFinite(totalDailyDoseMg) ||
    !Number.isFinite(crcl) ||
    !Number.isFinite(mic) ||
    totalDailyDoseMg < 250 ||
    totalDailyDoseMg > 8000 ||
    crcl < 5 ||
    crcl > 250 ||
    mic <= 0 ||
    mic > 16
  ) {
    return null;
  }

  const cl_L_h = 0.042 * crcl + 0.3;
  const rawAuc = totalDailyDoseMg / cl_L_h;
  const auc24 = Math.round(rawAuc);
  const ratio = Math.round((auc24 / mic) * 10) / 10;

  let band: VancoAucResult["band"] = "target";
  let label = "Target therapeutic window (AUC24:MIC 400–600)";
  let note =
    "2020 ASHP/IDSA consensus target (400–600 mg·h/L assuming MIC 1 mg/L). Maximizes bactericidal kill while keeping nephrotoxicity risk low.";

  if (ratio < 400) {
    band = "subtherapeutic";
    label = "Subtherapeutic (AUC24:MIC <400)";
    note =
      "AUC24:MIC <400 correlates with clinical treatment failure and selective pressure for intermediate resistance (VISA). Consider review with infectious diseases specialist.";
  } else if (ratio > 600) {
    band = "supratherapeutic";
    label = "Supratherapeutic / Nephrotoxicity watch (AUC24:MIC >600)";
    note =
      "AUC24:MIC >600 confers a 3- to 4-fold increased incidence of acute kidney injury (AKI). Review intervals, hydration, and concomitant nephrotoxins (e.g. piperacillin/tazobactam, NSAIDs, contrast).";
  }

  return {
    auc24,
    mic,
    ratio,
    band,
    label,
    note,
  };
}

/** Serum Osmolar Gap & Toxic Alcohol Screen. */
export interface OsmolarGapInput {
  measuredOsm: number;
  na: number;
  glucose: number;
  bun: number;
  ethanolMgDl?: number;
}

export interface OsmolarGapResult {
  calculatedOsm: number;
  gap: number;
  band: "normal" | "borderline" | "elevated";
  label: string;
  note: string;
}

export function osmolarGapOf({
  measuredOsm,
  na,
  glucose,
  bun,
  ethanolMgDl = 0,
}: OsmolarGapInput): OsmolarGapResult | null {
  if (
    !Number.isFinite(measuredOsm) ||
    !Number.isFinite(na) ||
    !Number.isFinite(glucose) ||
    !Number.isFinite(bun) ||
    !Number.isFinite(ethanolMgDl) ||
    measuredOsm < 200 ||
    measuredOsm > 550 ||
    na < 100 ||
    na > 180 ||
    glucose < 20 ||
    glucose > 2500 ||
    bun < 1 ||
    bun > 250 ||
    ethanolMgDl < 0 ||
    ethanolMgDl > 1200
  ) {
    return null;
  }

  const ethContribution = ethanolMgDl > 0 ? ethanolMgDl / 4.6 : 0;
  const rawCalc = 2 * na + glucose / 18 + bun / 2.8 + ethContribution;
  const calculatedOsm = Math.round(rawCalc * 10) / 10;
  const gap = Math.round((measuredOsm - calculatedOsm) * 10) / 10;

  let band: OsmolarGapResult["band"] = "normal";
  let label = "Normal osmolar gap (≤10 mOsm/kg)";
  let note =
    "Calculated osmolality accounts for measured solutes. A normal gap does not rule out late toxic alcohol presentation if parent alcohol is already metabolized into toxic acid metabolites.";

  if (gap >= 15) {
    band = "elevated";
    label = "Significantly elevated gap (≥15 mOsm/kg)";
    note =
      "Gap ≥15 strongly suggests an unmeasured osmotically active low-MW solute: Ethylene glycol (antifreeze; renal failure, calcium oxalate crystals), Methanol (windshield fluid; formic acid retinal toxicity/blindness), Isopropanol (rubbing alcohol; ketosis without severe acidosis), or Propylene glycol (IV drug solvent; lactic acidosis). Consider ADH blockade (fomepizole) and emergent nephrology / poison center consult.";
  } else if (gap > 10) {
    band = "borderline";
    label = "Borderline osmolar gap (11–14 mOsm/kg)";
    note =
      "Mildly elevated or borderline gap. May represent laboratory assay variation or early low-level ingestion. Correlate with clinical history, arterial blood gas, and anion gap.";
  }

  return {
    calculatedOsm,
    gap,
    band,
    label,
    note,
  };
}

