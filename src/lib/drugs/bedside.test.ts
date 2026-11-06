import test from "node:test";
import assert from "node:assert/strict";
import {
  childPughOf,
  crclOf,
  osmolarGapOf,
  phenytoinCorrected,
  qtcOf,
  vancoAucOf,
  anionGapOf,
  correctedSodiumOf,
  bodyMetricsOf,
  crclWeightComparisonOf,
  calvertCarboplatinOf,
  calculateVancoSawchukZaske,
  calculateAminoglycosideWeight,
  evaluateHartfordNomogram,
  classifyLithiumLevel,
  evaluateExtripLithiumCriteria,
  calculateLithiumClearance,
  deindexEgfr,
  egfrBlockedReason,
  egfrCr2021,
  egfrCrCys2021,
  egfrCys2012,
  egfrOf,
  kdigoGOf,
  type EgfrInput,
} from "./bedside";
import { stationMatches } from "./station-groups";
import { DOSE_PATTERN } from "../guards/dose-rule";

test("qtcOf calculates Bazett and Fridericia", () => {
  const normal = qtcOf({ qtMs: 400, hr: 60 });
  assert.ok(normal);
  assert.equal(normal.rr, 1);
  assert.equal(normal.bazett, 400);
  assert.equal(normal.fridericia, 400);

  const prolonged = qtcOf({ qtMs: 520, hr: 75 });
  assert.ok(prolonged);
  assert.ok(prolonged.bazett >= 500);
  assert.match(prolonged.note, /high-risk teaching cut/i);

  // Out of bounds checks
  assert.equal(qtcOf({ qtMs: 100, hr: 60 }), null);
  assert.equal(qtcOf({ qtMs: 400, hr: 20 }), null);
});

test("crclOf calculates Cockcroft–Gault renal clearance", () => {
  const male = crclOf({ age: 60, weightKg: 72, scr: 1.0, sex: "male" });
  assert.ok(male);
  assert.equal(male.crcl, 80);
  assert.equal(male.band, "usual");

  const femaleCkd = crclOf({ age: 80, weightKg: 50, scr: 2.2, sex: "female" });
  assert.ok(femaleCkd);
  assert.ok(femaleCkd.crcl < 30);
  assert.equal(femaleCkd.band, "severe");
  assert.match(femaleCkd.note, /CrCl <30/i);

  // Out of bounds
  assert.equal(crclOf({ age: 15, weightKg: 70, scr: 1, sex: "male" }), null);
  assert.equal(crclOf({ age: 60, weightKg: 70, scr: -1, sex: "male" }), null);
});

test("phenytoinCorrected calculates Sheiner–Tozer adjusted level", () => {
  const normalCrcl = phenytoinCorrected({ total: 10, albumin: 2.5, crclLow: false });
  assert.ok(normalCrcl);
  // 10 / (0.2 * 2.5 + 0.1) = 10 / 0.6 = 16.7
  assert.equal(normalCrcl.corrected, 16.7);

  const lowCrcl = phenytoinCorrected({ total: 10, albumin: 2.5, crclLow: true });
  assert.ok(lowCrcl);
  // 10 / (0.1 * 2.5 + 0.1) = 10 / 0.35 = 28.6
  assert.equal(lowCrcl.corrected, 28.6);
  assert.match(lowCrcl.note, /nystagmus teaching/i);

  assert.equal(phenytoinCorrected({ total: 0, albumin: 4, crclLow: false }), null);
});

test("childPughOf classifies hepatic impairment into classes A, B, and C", () => {
  const classA = childPughOf({
    bilirubin: "under2",
    albumin: "over35",
    inr: "under17",
    ascites: "none",
    encephalopathy: "none",
  });
  assert.equal(classA.score, 5);
  assert.equal(classA.classBand, "A");
  assert.equal(classA.impairment, "mild");
  assert.match(classA.note, /Class A/);

  const classB = childPughOf({
    bilirubin: "twoToThree",
    albumin: "twoEightToThreeFive",
    inr: "under17",
    ascites: "slight",
    encephalopathy: "none",
  });
  // 2 + 2 + 1 + 2 + 1 = 8
  assert.equal(classB.score, 8);
  assert.equal(classB.classBand, "B");
  assert.equal(classB.impairment, "moderate");
  assert.match(classB.note, /Class B/);

  const classC = childPughOf({
    bilirubin: "over3",
    albumin: "under28",
    inr: "over23",
    ascites: "moderate",
    encephalopathy: "grade3_4",
  });
  // 3 + 3 + 3 + 3 + 3 = 15
  assert.equal(classC.score, 15);
  assert.equal(classC.classBand, "C");
  assert.equal(classC.impairment, "severe");
  assert.match(classC.note, /Class C/);
});

test("vancoAucOf calculates 24h area and classifies against 400–600 target window", () => {
  // CrCl 100 mL/min -> Cl = 0.042 * 100 + 0.3 = 4.5 L/h. Daily dose 2250 mg -> AUC = 500
  const target = vancoAucOf({ totalDailyDoseMg: 2250, crcl: 100, mic: 1 });
  assert.ok(target);
  assert.equal(target.auc24, 500);
  assert.equal(target.ratio, 500);
  assert.equal(target.band, "target");
  assert.match(target.note, /2020 ASHP\/IDSA consensus target/);

  // Under-dosed: 1000 mg daily with CrCl 100 -> AUC = 222
  const low = vancoAucOf({ totalDailyDoseMg: 1000, crcl: 100, mic: 1 });
  assert.ok(low);
  assert.ok(low.ratio < 400);
  assert.equal(low.band, "subtherapeutic");
  assert.match(low.note, /treatment failure/i);

  // Over-dosed: 3500 mg daily with CrCl 100 -> AUC = 778
  const high = vancoAucOf({ totalDailyDoseMg: 3500, crcl: 100, mic: 1 });
  assert.ok(high);
  assert.ok(high.ratio > 600);
  assert.equal(high.band, "supratherapeutic");
  assert.match(high.note, /kidney injury/i);

  // Out of bounds
  assert.equal(vancoAucOf({ totalDailyDoseMg: 100, crcl: 100 }), null);
  assert.equal(vancoAucOf({ totalDailyDoseMg: 2000, crcl: 0 }), null);
});

test("osmolarGapOf calculates gap and identifies elevated toxic alcohol threshold", () => {
  // Normal: Measured 290, Na 140, Glu 90, BUN 14
  // Calc = 2*140 + 90/18 + 14/2.8 = 280 + 5 + 5 = 290. Gap = 0
  const normal = osmolarGapOf({ measuredOsm: 290, na: 140, glucose: 90, bun: 14 });
  assert.ok(normal);
  assert.equal(normal.calculatedOsm, 290);
  assert.equal(normal.gap, 0);
  assert.equal(normal.band, "normal");

  // Toxic alcohol: Measured 325, Na 140, Glu 90, BUN 14 -> Calc 290 -> Gap 35
  const elevated = osmolarGapOf({ measuredOsm: 325, na: 140, glucose: 90, bun: 14 });
  assert.ok(elevated);
  assert.equal(elevated.gap, 35);
  assert.equal(elevated.band, "elevated");
  assert.match(elevated.note, /Ethylene glycol/i);
  assert.match(elevated.note, /Methanol/i);

  // Ethanol contribution: Measured 335, with ethanol 207 mg/dL (contrib = 207 / 4.6 = 45)
  // Calc = 290 + 45 = 335. Gap = 0
  const eth = osmolarGapOf({ measuredOsm: 335, na: 140, glucose: 90, bun: 14, ethanolMgDl: 207 });
  assert.ok(eth);
  assert.equal(eth.gap, 0);
  assert.equal(eth.band, "normal");

  // Out of bounds
  assert.equal(osmolarGapOf({ measuredOsm: 100, na: 140, glucose: 90, bun: 14 }), null);
});

test("bedside copy remains educational without diagnosing or prescribing doses", () => {
  const bili = childPughOf({
    bilirubin: "over3",
    albumin: "under28",
    inr: "over23",
    ascites: "moderate",
    encephalopathy: "grade3_4",
  });
  assert.doesNotMatch(`${bili.label} ${bili.note}`, /\b\d+(\.\d+)?\s*(mg|mcg|g)\b/i);
  assert.doesNotMatch(`${bili.label} ${bili.note}`, /clinical decision support/i);

  const vanco = vancoAucOf({ totalDailyDoseMg: 2000, crcl: 80 });
  assert.ok(vanco);
  assert.doesNotMatch(vanco.note, /prescribe\s+\d+\s*mg/i);

  const gap = osmolarGapOf({ measuredOsm: 320, na: 140, glucose: 100, bun: 20 });
  assert.ok(gap);
  assert.doesNotMatch(gap.note, /administer\s+\d+\s*mg/i);

  const ag = anionGapOf({ na: 140, cl: 100, hco3: 15, albumin: 2.5 });
  assert.ok(ag);
  assert.doesNotMatch(ag.interpretation, /prescribe\s+\d+\s*mg/i);
  assert.doesNotMatch(ag.etiologyNote, /administer\s+\d+\s*mg/i);
});

test("anionGapOf calculates serum anion gap, albumin correction, and delta ratio", () => {
  // Normal gap: Na 140, Cl 104, HCO3 24 -> Gap = 12
  const normal = anionGapOf({ na: 140, cl: 104, hco3: 24 });
  assert.ok(normal);
  assert.equal(normal.rawGap, 12);
  assert.equal(normal.correctedGap, 12);
  assert.equal(normal.band, "normal");
  assert.equal(normal.albuminCorrectionApplied, false);
  assert.match(normal.etiologyNote, /NAGMA/i);

  // Pure HAGMA (e.g. DKA): Na 135, Cl 95, HCO3 10 -> Gap = 28
  // deltaGap = 28 - 12 = 16, deltaBicarb = 24 - 10 = 14 -> ratio = 16 / 14 = 1.14 (0.8 - 2.0 = pure HAGMA)
  const hagma = anionGapOf({ na: 135, cl: 95, hco3: 10 });
  assert.ok(hagma);
  assert.equal(hagma.rawGap, 30);
  assert.equal(hagma.band, "elevated");
  assert.ok(hagma.deltaRatio !== null);
  assert.equal(hagma.deltaRatio, 1.29);
  assert.match(hagma.interpretation, /uncomplicated pure high anion gap/i);
  assert.match(hagma.etiologyNote, /GOLD MARK/i);

  // Albumin correction unmasking hidden HAGMA in hypoalbuminemia
  // Na 140, Cl 106, HCO3 24 -> rawGap = 10 (looks normal). Albumin = 2.0 g/dL -> correction +2.5 * (4 - 2) = +5 -> correctedGap = 15 (elevated!)
  const maskedHagma = anionGapOf({ na: 140, cl: 106, hco3: 24, albumin: 2.0 });
  assert.ok(maskedHagma);
  assert.equal(maskedHagma.rawGap, 10);
  assert.equal(maskedHagma.correctedGap, 15);
  assert.equal(maskedHagma.albuminCorrectionApplied, true);
  assert.equal(maskedHagma.band, "elevated");

  // Low anion gap: Na 136, Cl 112, HCO3 22 -> rawGap = 2
  const low = anionGapOf({ na: 136, cl: 112, hco3: 22 });
  assert.ok(low);
  assert.equal(low.rawGap, 2);
  assert.equal(low.band, "low");
  assert.match(low.etiologyNote, /lithium toxicity/i);
  assert.match(low.etiologyNote, /multiple myeloma/i);

  // Out of bounds
  assert.equal(anionGapOf({ na: 80, cl: 100, hco3: 24 }), null);
  assert.equal(anionGapOf({ na: 140, cl: 40, hco3: 24 }), null);
  assert.equal(anionGapOf({ na: 140, cl: 100, hco3: 1 }), null);
  assert.equal(anionGapOf({ na: 140, cl: 100, hco3: 24, albumin: 10 }), null);
});

test("correctedSodiumOf calculates Katz and Hillier pseudohyponatremia math", () => {
  // Normal glucose: no correction
  const normalGlu = correctedSodiumOf({ measuredNa: 140, glucose: 95 });
  assert.ok(normalGlu);
  assert.equal(normalGlu.katzSodium, 140);
  assert.equal(normalGlu.hillierSodium, 140);
  assert.equal(normalGlu.deltaNa, 0);

  // Marked hyperglycemia in DKA: Na 130, Glucose 600 (excess = 500)
  // Katz: 130 + 1.6 * 5 = 138
  // Hillier: 130 + 2.4 * 5 = 142
  const dka = correctedSodiumOf({ measuredNa: 130, glucose: 600 });
  assert.ok(dka);
  assert.equal(dka.katzSodium, 138);
  assert.equal(dka.hillierSodium, 142);
  assert.equal(dka.deltaNa, 12);
  assert.match(dka.fluidGuidance, /0\.45% NaCl/);
  assert.match(dka.note, /Hillier et al\. 1999/);

  // Severe true hyponatremia despite correction: Na 120, Glucose 300 (excess = 200)
  // Hillier: 120 + 2.4 * 2 = 124.8 -> low (<135)
  const trueHypo = correctedSodiumOf({ measuredNa: 120, glucose: 300 });
  assert.ok(trueHypo);
  assert.equal(trueHypo.hillierSodium, 124.8);
  assert.match(trueHypo.fluidGuidance, /0\.9% NaCl/);

  // Out of bounds
  assert.equal(correctedSodiumOf({ measuredNa: 90, glucose: 200 }), null);
  assert.equal(correctedSodiumOf({ measuredNa: 140, glucose: 3000 }), null);
});

test("bodyMetricsOf calculates IBW, AdjBW, BMI, and BSA across weight categories", () => {
  // Male 178 cm (70.1 in), 80 kg
  // IBW = 50 + 2.3 * 10.1 = 73.2 kg
  // AdjBW = 73.2 + 0.4 * (80 - 73.2) = 75.9 kg
  const maleNormal = bodyMetricsOf({ heightCm: 178, weightKg: 80, sex: "male" });
  assert.ok(maleNormal);
  assert.equal(maleNormal.ibwKg, 73.2);
  assert.equal(maleNormal.adjBwKg, 75.9);
  assert.equal(maleNormal.bmi, 25.2);
  assert.equal(maleNormal.bsaMosteller, 1.99);
  assert.equal(maleNormal.weightCategory, "normal");

  // Obese male 170 cm (66.9 in), 130 kg
  // IBW = 50 + 2.3 * 6.9 = 65.9 kg
  // AdjBW = 65.9 + 0.4 * (130 - 65.9) = 91.5 kg
  const obese = bodyMetricsOf({ heightCm: 170, weightKg: 130, sex: "male" });
  assert.ok(obese);
  assert.equal(obese.ibwKg, 65.9);
  assert.equal(obese.adjBwKg, 91.5);
  assert.equal(obese.weightCategory, "obese");
  assert.match(obese.dosingWeightAdvice, /Adjusted Body Weight/i);

  // Underweight female 175 cm (68.9 in), 48 kg
  // IBW = 45.5 + 2.3 * 8.9 = 66.0 kg
  const underweight = bodyMetricsOf({ heightCm: 175, weightKg: 48, sex: "female" });
  assert.ok(underweight);
  assert.equal(underweight.weightCategory, "underweight");
  assert.match(underweight.dosingWeightAdvice, /Use Actual Body Weight/i);

  // Out of bounds
  assert.equal(bodyMetricsOf({ heightCm: 80, weightKg: 70, sex: "male" }), null);
  assert.equal(bodyMetricsOf({ heightCm: 180, weightKg: 20, sex: "male" }), null);
});

test("crclWeightComparisonOf demonstrates divergence in obesity vs underweight", () => {
  // Severe obesity: Age 60, SCr 1.0, Male, 170 cm, 130 kg
  // ABW = 130 kg -> CrCl ~144 mL/min
  // IBW = 65.9 kg -> CrCl ~73 mL/min
  // AdjBW = 91.5 kg -> CrCl ~102 mL/min
  const obeseComp = crclWeightComparisonOf({
    age: 60,
    sex: "male",
    scr: 1.0,
    heightCm: 170,
    weightKg: 130,
  });
  assert.ok(obeseComp);
  assert.ok(obeseComp.crclActual > 130);
  assert.ok(obeseComp.crclIbw < 80);
  assert.equal(obeseComp.recommendedWeightUsed, "adj");
  assert.ok(obeseComp.divergenceMlMin > 50);
  assert.match(obeseComp.clinicalCaveat, /inflates CrCl/i);

  // Underweight: Age 70, SCr 0.8, Female, 160 cm, 40 kg
  const underComp = crclWeightComparisonOf({
    age: 70,
    sex: "female",
    scr: 0.8,
    heightCm: 160,
    weightKg: 40,
  });
  assert.ok(underComp);
  assert.equal(underComp.recommendedWeightUsed, "actual");
  assert.match(underComp.clinicalCaveat, /Underweight/i);
});

test("calvertCarboplatinOf calculates AUC targeted dose and enforces FDA 125 mL/min GFR cap", () => {
  // Normal GFR 80 mL/min, Target AUC 5
  // Dose = 5 * (80 + 25) = 525 mg
  const normal = calvertCarboplatinOf({ targetAuc: 5, gfrOrCrcl: 80 });
  assert.ok(normal);
  assert.equal(normal.carboplatinDoseMg, 525);
  assert.equal(normal.uncappedDoseMg, 525);
  assert.equal(normal.capApplied, false);
  assert.equal(normal.effectiveGfr, 80);

  // Hyperfiltration GFR 160 mL/min, Target AUC 6
  // FDA cap at 125 mL/min: Dose = 6 * (125 + 25) = 900 mg
  // Uncapped dose would have been 6 * (160 + 25) = 1110 mg!
  const capped = calvertCarboplatinOf({ targetAuc: 6, gfrOrCrcl: 160 });
  assert.ok(capped);
  assert.equal(capped.effectiveGfr, 125);
  assert.equal(capped.capApplied, true);
  assert.equal(capped.carboplatinDoseMg, 900);
  assert.equal(capped.uncappedDoseMg, 1110);
  assert.match(capped.safetyNote, /FDA Safety Cap Applied/i);

  // Out of bounds
  assert.equal(calvertCarboplatinOf({ targetAuc: 0.5, gfrOrCrcl: 80 }), null);
  assert.equal(calvertCarboplatinOf({ targetAuc: 5, gfrOrCrcl: 0 }), null);
});

test("calculateVancoSawchukZaske calculates two-point PK equations and targets", () => {
  const res = calculateVancoSawchukZaske({
    doseMg: 1000,
    infusionHours: 1.0,
    tauHours: 12,
    c1PeakUgMl: 26,
    t1HoursPostInfusion: 1.5,
    c2TroughUgMl: 10,
    t2HoursBeforeNextDose: 0.5,
    mic: 1.0,
  });
  assert.ok(res);
  assert.equal(res.band, "target");
  assert.ok(res.auc24 >= 400 && res.auc24 <= 600);
  assert.equal(res.samplingTimingWarning, null);
});

test("bedside aminoglycoside weight and Hartford nomogram functions calculate accurately", () => {
  const wt = calculateAminoglycosideWeight({ heightCm: 178, weightKg: 110, sex: "male" });
  assert.ok(wt);
  assert.equal(wt.weightCategory, "obese");
  assert.equal(wt.recommendedWeightType, "adj");

  const nomo = evaluateHartfordNomogram({ agent: "gentamicin", hoursPostStart: 8, serumLevelUgMl: 4.0 });
  assert.ok(nomo);
  assert.equal(nomo.interval, "q24h");
});

test("bedside lithium level classification, clearance physics, and EXTRIP hemodialysis operate accurately", () => {
  const level = classifyLithiumLevel(0.7, "maintenance");
  assert.equal(level.severity, "therapeutic");
  assert.equal(level.inTargetRange, true);

  const extrip = evaluateExtripLithiumCriteria({ serumLithiumMeqL: 4.5, crclMlMin: 35 });
  assert.equal(extrip.indication, "recommended");
  assert.ok(extrip.reboundWarning.isHighRisk);

  const cl = calculateLithiumClearance({ crclMlMin: 100, weightKg: 70, takingThiazide: true });
  assert.equal(cl.percentReduction, 40);
  assert.equal(cl.estimatedLithiumClearanceMlMin, 12);
});

// Expected eGFRs below are the whole-number outputs of two independent calculators, read 2026-11-04:
// NKF = kidney.org/professionals/gfr_calculator, MDCalc = mdcalc.com/calc/3939 (CKD-EPI equations).
const within1 = (actual: number | null, expected: number, source: string) => {
  assert.ok(actual !== null, source);
  assert.ok(Math.abs(Math.round(actual) - expected) <= 1, `${source}: got ${actual}, expected ${expected} ±1`);
};

test("egfrCr2021 matches published calculator outputs for the CKD-EPI 2021 creatinine equation", () => {
  const cases: [EgfrInput, number, string][] = [
    [{ age: 60, sex: "male", scr: 1.0 }, 86, "NKF and MDCalc"],
    [{ age: 50, sex: "female", scr: 0.6 }, 109, "NKF and MDCalc"],
    [{ age: 80, sex: "female", scr: 2.2 }, 22, "NKF and MDCalc"],
    [{ age: 30, sex: "male", scr: 4.0 }, 20, "NKF and MDCalc"],
    [{ age: 70, sex: "female", scr: 1.4 }, 40, "NKF"],
    [{ age: 40, sex: "male", scr: 0.8 }, 115, "NKF"],
  ];
  for (const [input, expected, source] of cases) within1(egfrCr2021(input), expected, `${source} ${JSON.stringify(input)}`);
});

test("egfrCrCys2021 matches published calculator outputs for the CKD-EPI 2021 creatinine–cystatin C equation", () => {
  const cases: [EgfrInput, number, string][] = [
    [{ age: 70, sex: "female", scr: 1.4, cystatinC: 1.5 }, 42, "NKF and MDCalc"],
    [{ age: 40, sex: "male", scr: 0.8, cystatinC: 0.7 }, 123, "NKF and MDCalc"],
    [{ age: 35, sex: "female", scr: 0.7, cystatinC: 0.8 }, 113, "NKF and MDCalc"],
  ];
  for (const [input, expected, source] of cases) within1(egfrCrCys2021(input), expected, `${source} ${JSON.stringify(input)}`);
});

test("egfrCys2012 matches published calculator outputs for the CKD-EPI 2012 cystatin C equation", () => {
  const cases: [Pick<EgfrInput, "age" | "sex" | "cystatinC">, number, string][] = [
    [{ age: 70, sex: "female", cystatinC: 1.5 }, 41, "NKF and MDCalc"],
    [{ age: 75, sex: "male", cystatinC: 2.0 }, 29, "NKF and MDCalc"],
    [{ age: 65, sex: "female", cystatinC: 0.6 }, 110, "NKF and MDCalc"],
    [{ age: 40, sex: "male", cystatinC: 0.7 }, 121, "NKF"],
    [{ age: 35, sex: "female", cystatinC: 0.8 }, 108, "NKF"],
  ];
  for (const [input, expected, source] of cases) within1(egfrCys2012(input), expected, `${source} ${JSON.stringify(input)}`);
});

test("CKD-EPI terms collapse to 1 at Scr = κ and cystatin C = 0.8, with no jump across κ", () => {
  // At Scr = κ both creatinine terms are 1, leaving the intercept, age and sex factors.
  assert.ok(Math.abs(egfrCr2021({ age: 50, sex: "male", scr: 0.9 })! - 142 * 0.9938 ** 50) < 1e-9);
  assert.ok(Math.abs(egfrCr2021({ age: 35, sex: "female", scr: 0.7 })! - 142 * 0.9938 ** 35 * 1.012) < 1e-9);
  assert.ok(
    Math.abs(egfrCrCys2021({ age: 35, sex: "female", scr: 0.7, cystatinC: 0.8 })! - 135 * 0.9961 ** 35 * 0.963) < 1e-9,
  );
  assert.ok(Math.abs(egfrCys2012({ age: 40, sex: "male", cystatinC: 0.8 })! - 133 * 0.996 ** 40) < 1e-9);
  for (const [sex, k] of [["male", 0.9], ["female", 0.7]] as const) {
    const below = egfrCr2021({ age: 60, sex, scr: k - 1e-6 })!;
    const above = egfrCr2021({ age: 60, sex, scr: k + 1e-6 })!;
    assert.ok(Math.abs(below - above) < 0.001, `${sex} creatinine curve is continuous at κ`);
  }
});

test("CKD-EPI 2021 creatinine takes the female and male branches from the paper", () => {
  // Below κ: α −0.241 (F) / −0.302 (M). Above κ: −1.200 for both. Female factor 1.012.
  const f = egfrCr2021({ age: 50, sex: "female", scr: 0.6 })!;
  const m = egfrCr2021({ age: 50, sex: "male", scr: 0.6 })!;
  assert.ok(Math.abs(f - 142 * (0.6 / 0.7) ** -0.241 * 0.9938 ** 50 * 1.012) < 1e-9);
  assert.ok(Math.abs(m - 142 * (0.6 / 0.9) ** -0.302 * 0.9938 ** 50) < 1e-9);
  const fHigh = egfrCr2021({ age: 50, sex: "female", scr: 1.2 })!;
  const mHigh = egfrCr2021({ age: 50, sex: "male", scr: 1.2 })!;
  assert.ok(Math.abs(fHigh - 142 * (1.2 / 0.7) ** -1.2 * 0.9938 ** 50 * 1.012) < 1e-9);
  assert.ok(Math.abs(mHigh - 142 * (1.2 / 0.9) ** -1.2 * 0.9938 ** 50) < 1e-9);
  // The same creatinine reads as a lower GFR in a woman (smaller κ).
  assert.ok(fHigh < mHigh);
});

test("CKD-EPI eGFR falls as age or creatinine rises", () => {
  for (const sex of ["male", "female"] as const) {
    for (let age = 18; age < 110; age += 1) {
      assert.ok(egfrCr2021({ age: age + 1, sex, scr: 1.1 })! < egfrCr2021({ age, sex, scr: 1.1 })!);
      assert.ok(egfrCrCys2021({ age: age + 1, sex, scr: 1.1, cystatinC: 1.2 })! < egfrCrCys2021({ age, sex, scr: 1.1, cystatinC: 1.2 })!);
      assert.ok(egfrCys2012({ age: age + 1, sex, cystatinC: 1.2 })! < egfrCys2012({ age, sex, cystatinC: 1.2 })!);
    }
    for (let x = 0.3; x < 9.9; x += 0.1) {
      assert.ok(egfrCr2021({ age: 60, sex, scr: x + 0.1 })! < egfrCr2021({ age: 60, sex, scr: x })!);
      assert.ok(egfrCrCys2021({ age: 60, sex, scr: x + 0.1, cystatinC: 1 })! < egfrCrCys2021({ age: 60, sex, scr: x, cystatinC: 1 })!);
      assert.ok(egfrCrCys2021({ age: 60, sex, scr: 1, cystatinC: x + 0.1 })! < egfrCrCys2021({ age: 60, sex, scr: 1, cystatinC: x })!);
      assert.ok(egfrCys2012({ age: 60, sex, cystatinC: x + 0.1 })! < egfrCys2012({ age: 60, sex, cystatinC: x })!);
    }
  }
});

test("CKD-EPI returns null for children and out-of-range input, with a reason the card can show", () => {
  assert.equal(egfrCr2021({ age: 17, sex: "male", scr: 0.8 }), null);
  assert.equal(egfrCr2021({ age: 111, sex: "male", scr: 0.8 }), null);
  assert.equal(egfrCr2021({ age: Number.NaN, sex: "male", scr: 0.8 }), null);
  assert.equal(egfrCr2021({ age: 60, sex: "male", scr: 0 }), null);
  assert.equal(egfrCr2021({ age: 60, sex: "male", scr: -1 }), null);
  assert.equal(egfrCr2021({ age: 60, sex: "male", scr: 21 }), null);
  assert.equal(egfrCrCys2021({ age: 60, sex: "male", scr: 1 }), null);
  assert.equal(egfrCrCys2021({ age: 60, sex: "male", scr: 1, cystatinC: 0 }), null);
  assert.equal(egfrCys2012({ age: 60, sex: "male", cystatinC: 11 }), null);
  assert.equal(egfrCys2012({ age: 16, sex: "female", cystatinC: 1 }), null);

  const card = { sex: "female" as const, scr: 0.6, heightCm: 160, weightKg: 50 };
  assert.equal(egfrOf({ ...card, age: 12 }), null);
  assert.match(egfrBlockedReason(12), /adults 18 and older/);
  assert.match(egfrBlockedReason(12), /pediatric equation/);
  // A typed but unusable cystatin C blanks the card instead of silently falling back to creatinine.
  assert.equal(egfrOf({ ...card, age: 40, cystatinC: Number.NaN }), null);
  assert.match(egfrBlockedReason(40), /cystatin C 0–10 mg\/L or blank/);
});

test("de-indexed eGFR is eGFR × BSA / 1.73 and matches the NKF calculator's BSA-adjusted output", () => {
  assert.equal(deindexEgfr(86, 1.73), 86);
  assert.ok(Math.abs(deindexEgfr(60, 2.236)! - (60 * 2.236) / 1.73) < 1e-9);
  assert.ok(deindexEgfr(60, 2.2)! > 60, "a large body has a higher eGFR in mL/min");
  assert.ok(deindexEgfr(60, 1.4)! < 60, "a small body has a lower eGFR in mL/min");
  assert.equal(deindexEgfr(60, 0), null);
  assert.equal(deindexEgfr(Number.NaN, 1.8), null);

  // NKF "Adjust eGFR for body surface area: Yes" (Du Bois), mL/min.
  const typical = egfrOf({ age: 60, sex: "male", scr: 1.0, heightCm: 175, weightKg: 70 });
  assert.ok(typical);
  assert.equal(typical.egfr, 86);
  assert.equal(typical.bsa, 1.85);
  within1(typical.absolute, 92, "NKF BSA-adjusted, 175 cm 70 kg");
  assert.deepEqual(typical.g, { category: "G2", label: "Mildly decreased" });
  assert.equal(typical.equation, "creatinine");
  assert.equal(typical.byMarker, null);

  // Du Bois, not Mosteller: Mosteller BSA would give about 115 here.
  within1(egfrOf({ age: 60, sex: "male", scr: 1.0, heightCm: 160, weightKg: 120 })?.absolute ?? null, 108, "NKF BSA-adjusted, 160 cm 120 kg");
  within1(egfrOf({ age: 80, sex: "female", scr: 2.2, heightCm: 150, weightKg: 45 })?.absolute ?? null, 18, "NKF BSA-adjusted, 150 cm 45 kg");

  const withCys = egfrOf({ age: 70, sex: "female", scr: 1.4, cystatinC: 1.5, heightCm: 160, weightKg: 50 });
  assert.ok(withCys);
  assert.equal(withCys.equation, "creatinine + cystatin C");
  assert.equal(withCys.egfr, 42);
  within1(withCys.absolute, 36, "NKF BSA-adjusted creatinine–cystatin C, 160 cm 50 kg");
  assert.deepEqual(withCys.byMarker, { cr: 40, cys: 41, both: 42 });
  assert.equal(withCys.g.category, "G3b");

  // No usable height: the indexed eGFR still shows, the mL/min value does not.
  const noHeight = egfrOf({ age: 60, sex: "male", scr: 1.0, heightCm: 0, weightKg: 70 });
  assert.ok(noHeight);
  assert.equal(noHeight.egfr, 86);
  assert.equal(noHeight.bsa, null);
  assert.equal(noHeight.absolute, null);
});

test("kdigoGOf reads the KDIGO 2024 GFR categories from the whole-number eGFR", () => {
  const cat = (x: number) => kdigoGOf(x)?.category;
  // Rounding: 89.5 is reported as 90, so G1; 89.4 as 89, so G2.
  assert.equal(cat(90), "G1");
  assert.equal(cat(89.5), "G1");
  assert.equal(cat(89.4), "G2");
  assert.equal(cat(89), "G2");
  assert.equal(cat(60), "G2");
  assert.equal(cat(59.5), "G2");
  assert.equal(cat(59), "G3a");
  assert.equal(cat(45), "G3a");
  assert.equal(cat(44), "G3b");
  assert.equal(cat(30), "G3b");
  assert.equal(cat(29), "G4");
  assert.equal(cat(15), "G4");
  assert.equal(cat(14), "G5");
  assert.equal(cat(0), "G5");
  assert.equal(kdigoGOf(-1), null);
  assert.equal(kdigoGOf(Number.NaN), null);
  assert.equal(kdigoGOf(50)?.label, "Mildly to moderately decreased");
  assert.equal(kdigoGOf(35)?.label, "Moderately to severely decreased");
  assert.equal(kdigoGOf(10)?.label, "Kidney failure");
});

test("renal copy carries lab units only, never an administered dose, and the station search finds eGFR", () => {
  const copy = [
    egfrBlockedReason(12),
    egfrBlockedReason(40),
    crclOf({ age: 60, weightKg: 72, scr: 1.0, sex: "male" })!.note,
    ...[95, 70, 50, 35, 20, 10].map((x) => kdigoGOf(x)!.label),
    "eGFR 86 mL/min/1.73 m²",
    "eGFR 86 mL/min/1.73m²",
    "cystatin C 1.2 mg/L",
    "SCr 1.4 mg/dL",
  ];
  for (const s of copy) assert.equal(s.match(DOSE_PATTERN), null, s);
  assert.doesNotMatch(crclOf({ age: 60, weightKg: 72, scr: 1.0, sex: "male" })!.note, /not CKD-EPI/);

  assert.ok(stationMatches({ id: "bedside", label: "Bedside" }, "Desk tools", "egfr"));
  assert.ok(stationMatches({ id: "bedside", label: "Bedside" }, "Desk tools", "ckd-epi"));
});



