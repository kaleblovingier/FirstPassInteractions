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

/** Serum Anion Gap with Albumin Correction & Delta Ratio */
export interface AnionGapInput {
  na: number;
  cl: number;
  hco3: number;
  albumin?: number;
}

export interface AnionGapResult {
  rawGap: number;
  correctedGap: number;
  albuminCorrectionApplied: boolean;
  deltaGap: number;
  deltaBicarb: number;
  deltaRatio: number | null;
  band: "low" | "normal" | "elevated";
  label: string;
  interpretation: string;
  etiologyNote: string;
}

export function anionGapOf({ na, cl, hco3, albumin }: AnionGapInput): AnionGapResult | null {
  if (
    !Number.isFinite(na) ||
    !Number.isFinite(cl) ||
    !Number.isFinite(hco3) ||
    na < 100 ||
    na > 180 ||
    cl < 50 ||
    cl > 150 ||
    hco3 < 2 ||
    hco3 > 60 ||
    (albumin !== undefined && (!Number.isFinite(albumin) || albumin < 0.5 || albumin > 6.0))
  ) {
    return null;
  }

  const rawGap = Math.round((na - (cl + hco3)) * 10) / 10;
  const albVal = albumin ?? 4.0;
  const albCorrection = Math.round(2.5 * (4.0 - albVal) * 10) / 10;
  const correctedGap = Math.round((rawGap + albCorrection) * 10) / 10;
  const albuminCorrectionApplied = albumin !== undefined && albumin !== 4.0;

  const effectiveGap = albumin !== undefined ? correctedGap : rawGap;
  const deltaGap = Math.round((effectiveGap - 12) * 10) / 10;
  const deltaBicarb = Math.round((24 - hco3) * 10) / 10;
  const deltaRatio =
    deltaBicarb > 0 && deltaGap > 0
      ? Math.round((deltaGap / deltaBicarb) * 100) / 100
      : null;

  let band: AnionGapResult["band"] = "normal";
  let label = "Normal anion gap (8–12 mEq/L)";
  let interpretation = "Unmeasured anions and cations in typical physiologic balance.";
  let etiologyNote =
    "If metabolic acidosis is present with a normal gap, consider non-anion gap metabolic acidosis (NAGMA / hyperchloremic: diarrhea, large-volume 0.9% saline infusion, RTA, acetazolamide).";

  if (effectiveGap > 12) {
    band = "elevated";
    label = `Elevated anion gap (${effectiveGap} mEq/L)`;
    interpretation = "High anion gap metabolic acidosis (HAGMA) pattern.";
    etiologyNote =
      "Classic etiology: GOLD MARK / MUDPILES — Glycols (ethylene/propylene), Oxoproline (chronic paracetamol/acetaminophen in malnourished/septic patients), L-lactate (hypoperfusion/sepsis/metformin), D-lactate (short bowel), Methanol, Aspirin / salicylates, Renal failure (uremic toxins/phosphates/sulfates), Ketoacidosis (DKA, alcoholic AKA, starvation).";
  } else if (effectiveGap < 4) {
    band = "low";
    label = `Low / negative anion gap (${effectiveGap} mEq/L)`;
    interpretation = "Reduced unmeasured anions or accumulation of unmeasured cations.";
    etiologyNote =
      "Hypoalbuminemia is the leading cause (each 1 g/dL drop in albumin lowers expected gap by ~2.5 mEq/L). Other etiologies: lithium toxicity (unmeasured cation), multiple myeloma (cationic IgG paraproteinemia), severe hypercalcemia, hypermagnesemia, or bromide/iodide assay interference.";
  }

  if (deltaRatio !== null) {
    if (deltaRatio < 0.8) {
      interpretation += ` Delta ratio ${deltaRatio}: suggests mixed HAGMA + concurrent NAGMA (hyperchloremic acidosis).`;
    } else if (deltaRatio > 2.0) {
      interpretation += ` Delta ratio ${deltaRatio}: suggests mixed HAGMA + concurrent metabolic alkalosis (vomiting, diuresis) or pre-existing compensated respiratory acidosis.`;
    } else {
      interpretation += ` Delta ratio ${deltaRatio}: consistent with uncomplicated pure high anion gap metabolic acidosis.`;
    }
  }

  return {
    rawGap,
    correctedGap,
    albuminCorrectionApplied,
    deltaGap,
    deltaBicarb,
    deltaRatio,
    band,
    label,
    interpretation,
    etiologyNote,
  };
}

/** Hyperglycemia-Corrected Sodium (Pseudohyponatremia math) */
export interface CorrectedSodiumInput {
  measuredNa: number;
  glucose: number;
}

export interface CorrectedSodiumResult {
  measuredNa: number;
  glucose: number;
  katzSodium: number;
  hillierSodium: number;
  deltaNa: number;
  fluidGuidance: string;
  note: string;
}

export function correctedSodiumOf({ measuredNa, glucose }: CorrectedSodiumInput): CorrectedSodiumResult | null {
  if (
    !Number.isFinite(measuredNa) ||
    !Number.isFinite(glucose) ||
    measuredNa < 100 ||
    measuredNa > 180 ||
    glucose < 30 ||
    glucose > 2500
  ) {
    return null;
  }

  const excessGlu = Math.max(0, glucose - 100);
  const katzSodium = Math.round((measuredNa + 1.6 * (excessGlu / 100)) * 10) / 10;
  const hillierSodium = Math.round((measuredNa + 2.4 * (excessGlu / 100)) * 10) / 10;
  const deltaNa = Math.round((hillierSodium - measuredNa) * 10) / 10;

  let fluidGuidance = "Euvolemic / baseline sodium monitoring.";
  if (glucose > 200) {
    if (hillierSodium >= 135) {
      fluidGuidance =
        "Corrected sodium is normal or elevated (≥135 mEq/L). In DKA/HHS resuscitation, 0.45% NaCl (half-normal saline) is typically favored once hemodynamically stable to avoid worsening hypertonicity.";
    } else {
      fluidGuidance =
        "Corrected sodium is low (<135 mEq/L). In DKA/HHS resuscitation, 0.9% NaCl (normal saline) is typically continued until corrected sodium normalizes.";
    }
  }

  const note =
    glucose > 400
      ? "For marked hyperglycemia (>400 mg/dL), Hillier et al. 1999 (2.4 multiplier) showed superior prospective accuracy over the classic 1973 Katz 1.6 factor. Both are displayed for clinical teaching."
      : "Hyperglycemia causes osmotic water shift from ICF to ECF, diluting serum sodium (translocational pseudohyponatremia).";

  return {
    measuredNa,
    glucose,
    katzSodium,
    hillierSodium,
    deltaNa,
    fluidGuidance,
    note,
  };
}

/** Body Weight Metrics (IBW, AdjBW, BMI, BSA) */
export interface BodyMetricsInput {
  heightCm: number;
  weightKg: number;
  sex: Sex;
}

export interface BodyMetricsResult {
  heightCm: number;
  heightInches: number;
  weightKg: number;
  sex: Sex;
  ibwKg: number;
  adjBwKg: number;
  bmi: number;
  bsaMosteller: number;
  bsaDuBois: number;
  weightToIbwRatio: number;
  weightCategory: "underweight" | "normal" | "obese";
  dosingWeightAdvice: string;
}

export function bodyMetricsOf({ heightCm, weightKg, sex }: BodyMetricsInput): BodyMetricsResult | null {
  if (
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm < 100 ||
    heightCm > 250 ||
    weightKg < 30 ||
    weightKg > 300
  ) {
    return null;
  }

  const heightInches = Math.round((heightCm / 2.54) * 10) / 10;
  const inchesOver60 = heightInches - 60;

  // Devine 1974 formula
  const baseIbw = sex === "male" ? 50 : 45.5;
  const rawIbw = baseIbw + 2.3 * inchesOver60;
  const ibwKg = Math.round(Math.max(20, rawIbw) * 10) / 10;

  // Adjusted Body Weight (0.4 factor)
  const adjBwKg = Math.round((ibwKg + 0.4 * (weightKg - ibwKg)) * 10) / 10;

  // BMI = kg / m^2
  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

  // Mosteller BSA = sqrt(cm * kg / 3600)
  const bsaMosteller = Math.round(Math.sqrt((heightCm * weightKg) / 3600) * 100) / 100;

  // Du Bois BSA = 0.007184 * kg^0.425 * cm^0.725
  const bsaDuBois =
    Math.round(0.007184 * Math.pow(weightKg, 0.425) * Math.pow(heightCm, 0.725) * 100) / 100;

  const weightToIbwRatio = Math.round((weightKg / ibwKg) * 100) / 100;

  let weightCategory: BodyMetricsResult["weightCategory"] = "normal";
  let dosingWeightAdvice = "Actual weight is within 100–120% of IBW. Use actual body weight or IBW per package insert.";

  if (weightToIbwRatio < 1.0) {
    weightCategory = "underweight";
    dosingWeightAdvice =
      "Actual weight is below Ideal Body Weight (<100% IBW). Use Actual Body Weight for Cockcroft–Gault (using IBW overestimates renal clearance).";
  } else if (weightToIbwRatio > 1.2) {
    weightCategory = "obese";
    dosingWeightAdvice =
      "Actual weight exceeds 120% of IBW. Using actual weight in Cockcroft–Gault overestimates GFR. Adjusted Body Weight (AdjBW 0.4) is standard for aminoglycosides and hydrophilic antimicrobials.";
  }

  return {
    heightCm,
    heightInches,
    weightKg,
    sex,
    ibwKg,
    adjBwKg,
    bmi,
    bsaMosteller,
    bsaDuBois,
    weightToIbwRatio,
    weightCategory,
    dosingWeightAdvice,
  };
}

/** Cockcroft–Gault Weight Selection Comparison (ABW vs IBW vs AdjBW) */
export interface CrclWeightComparisonInput {
  age: number;
  sex: Sex;
  scr: number;
  weightKg: number;
  heightCm: number;
}

export interface CrclWeightComparisonResult {
  crclActual: number;
  crclIbw: number;
  crclAdj: number;
  recommendedWeightUsed: "actual" | "ibw" | "adj";
  recommendedCrcl: number;
  divergenceMlMin: number;
  clinicalCaveat: string;
}

export function crclWeightComparisonOf({
  age,
  sex,
  scr,
  weightKg,
  heightCm,
}: CrclWeightComparisonInput): CrclWeightComparisonResult | null {
  const metrics = bodyMetricsOf({ heightCm, weightKg, sex });
  if (!metrics) return null;

  const resActual = crclOf({ age, weightKg, scr, sex });
  const resIbw = crclOf({ age, weightKg: metrics.ibwKg, scr, sex });
  const resAdj = crclOf({ age, weightKg: metrics.adjBwKg, scr, sex });

  if (!resActual || !resIbw || !resAdj) return null;

  let recommendedWeightUsed: CrclWeightComparisonResult["recommendedWeightUsed"] = "ibw";
  let recommendedCrcl = resIbw.crcl;
  let clinicalCaveat = "Actual weight is within 120% of IBW; IBW or actual weight typically yield concordant dosing.";

  if (metrics.weightCategory === "underweight") {
    recommendedWeightUsed = "actual";
    recommendedCrcl = resActual.crcl;
    clinicalCaveat =
      "Underweight (ABW < IBW): using IBW artificially inflates estimated clearance. Use actual body weight to prevent drug overdosing.";
  } else if (metrics.weightCategory === "obese") {
    recommendedWeightUsed = "adj";
    recommendedCrcl = resAdj.crcl;
    clinicalCaveat =
      `Obesity (ABW is ${Math.round(metrics.weightToIbwRatio * 100)}% of IBW): using actual body weight inflates CrCl by +${resActual.crcl - resIbw.crcl} mL/min. For narrow-index hydrophilic drugs and aminoglycosides, Adjusted Body Weight (AdjBW) is standard. For DOACs, consult product-specific labeling.`;
  }

  const divergenceMlMin = Math.abs(resActual.crcl - resIbw.crcl);

  return {
    crclActual: resActual.crcl,
    crclIbw: resIbw.crcl,
    crclAdj: resAdj.crcl,
    recommendedWeightUsed,
    recommendedCrcl,
    divergenceMlMin,
    clinicalCaveat,
  };
}

/** Calvert Formula for Carboplatin AUC-targeted Dosing */
export interface CalvertInput {
  targetAuc: number; // typically 4 to 6 mg·min/mL
  gfrOrCrcl: number; // mL/min
}

export interface CalvertResult {
  targetAuc: number;
  inputGfr: number;
  effectiveGfr: number;
  capApplied: boolean;
  carboplatinDoseMg: number;
  uncappedDoseMg: number;
  maxDoseCappedAt125: number;
  safetyNote: string;
}

export function calvertCarboplatinOf({ targetAuc, gfrOrCrcl }: CalvertInput): CalvertResult | null {
  if (
    !Number.isFinite(targetAuc) ||
    !Number.isFinite(gfrOrCrcl) ||
    targetAuc < 1 ||
    targetAuc > 10 ||
    gfrOrCrcl < 5 ||
    gfrOrCrcl > 300
  ) {
    return null;
  }

  // FDA 2010 safety alert: GFR capped at 125 mL/min
  const capApplied = gfrOrCrcl > 125;
  const effectiveGfr = Math.min(gfrOrCrcl, 125);
  const carboplatinDoseMg = Math.round(targetAuc * (effectiveGfr + 25));
  const uncappedDoseMg = Math.round(targetAuc * (gfrOrCrcl + 25));
  const maxDoseCappedAt125 = Math.round(targetAuc * (125 + 25));

  let safetyNote =
    "Dose calculated using standard Calvert equation: Dose = Target AUC · (GFR + 25). Predicts severe thrombocytopenia nadir.";

  if (capApplied) {
    safetyNote =
      `FDA Safety Cap Applied: GFR was capped at 125 mL/min (uncapped dose would be ${uncappedDoseMg} mg). Capping prevents lethal neutropenic sepsis and thrombocytopenia in patients with hyperfiltrating kidneys.`;
  }

  return {
    targetAuc,
    inputGfr: gfrOrCrcl,
    effectiveGfr,
    capApplied,
    carboplatinDoseMg,
    uncappedDoseMg,
    maxDoseCappedAt125,
    safetyNote,
  };
}

export {
  calculateVancoSawchukZaske,
  type VancoSawchukZaskeInput,
  type VancoSawchukZaskeResult,
} from "./vancomycin";


