import test from "node:test";
import assert from "node:assert/strict";
import {
  childPughOf,
  crclOf,
  osmolarGapOf,
  phenytoinCorrected,
  qtcOf,
  vancoAucOf,
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
});

