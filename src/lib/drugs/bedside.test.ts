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
} from "./bedside";

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


