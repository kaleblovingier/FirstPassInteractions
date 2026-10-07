import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateMultiQtc,
  deriveTisdaleDefaults,
  evaluateTisdaleScore,
  evaluateQtDesk,
  getTdpResuscitationNomogram,
  LOOP_DIURETIC_IDS,
} from "./qt-resus";
import { DEFAULT_HOST } from "./types";

test("calculateMultiQtc: concordant calculation at 60 bpm", () => {
  const result = calculateMultiQtc({
    qtMs: 400,
    hrBpm: 60,
    sex: "male",
  });

  assert.ok(result);
  assert.equal(result.rrSec, 1.0);
  assert.equal(result.bazettMs, 400);
  assert.equal(result.fridericiaMs, 400);
  assert.equal(result.framinghamMs, 400);
  assert.equal(result.hodgesMs, 400);
  assert.equal(result.riskBand, "normal");
  assert.equal(result.isProlonged, false);
  assert.equal(result.isCritical, false);
  assert.equal(result.rateTrap.type, "concordant");
});

test("calculateMultiQtc: tachycardia inflation trap (HR 105 bpm)", () => {
  const result = calculateMultiQtc({
    qtMs: 340,
    hrBpm: 105,
    sex: "female",
  });

  assert.ok(result);
  assert.equal(result.rateTrap.type, "tachycardia-inflation");
  assert.ok(result.rateTrap.divergenceMs >= 20);
  // Bazett overestimates due to square-root math
  assert.ok(result.bazettMs > result.fridericiaMs);
  assert.equal(result.recommendedFormula, "Fridericia");
  assert.match(result.rateTrap.explanation, /Bazett/);
});

test("calculateMultiQtc: bradycardia underestimation trap (HR 45 bpm)", () => {
  const result = calculateMultiQtc({
    qtMs: 520,
    hrBpm: 45,
    sex: "male",
  });

  assert.ok(result);
  assert.equal(result.rateTrap.type, "bradycardia-underestimation");
  assert.ok(result.rateTrap.divergenceMs >= 15);
  // Fridericia reveals greater repolarization prolongation than Bazett during bradycardia
  assert.ok(result.fridericiaMs > result.bazettMs);
  assert.match(result.rateTrap.recommendation, /Fridericia/);
});

test("calculateMultiQtc: critical threshold (>= 500 ms) and baseline escalation delta", () => {
  const result = calculateMultiQtc({
    qtMs: 490,
    hrBpm: 65,
    sex: "male",
    baselineQtcMs: 420,
  });

  assert.ok(result);
  assert.ok(result.recommendedQtcMs >= 500);
  assert.equal(result.riskBand, "critical");
  assert.equal(result.isCritical, true);
  assert.ok(result.deltaBaselineMs !== null && result.deltaBaselineMs >= 60);
  assert.ok(result.deltaBaselineAlert !== null);
  assert.match(result.deltaBaselineAlert, /Critical Escalation/);
});

test("calculateMultiQtc: invalid ranges return null", () => {
  assert.equal(calculateMultiQtc({ qtMs: 100, hrBpm: 60, sex: "male" }), null);
  assert.equal(calculateMultiQtc({ qtMs: 900, hrBpm: 60, sex: "male" }), null);
  assert.equal(calculateMultiQtc({ qtMs: 400, hrBpm: 20, sex: "male" }), null);
  assert.equal(calculateMultiQtc({ qtMs: 400, hrBpm: 250, sex: "male" }), null);
});

test("evaluateTisdaleScore: low, moderate, and high tiers", () => {
  // Low tier (0 pts)
  const low = evaluateTisdaleScore({});
  assert.equal(low.score, 0);
  assert.equal(low.tier, "low");
  assert.match(low.predictedRiskPercentage, /< 15%/);

  // Moderate tier: age (1) + loop (1) + 2 QT drugs (3) + sepsis (3) = 8 pts
  const mod = evaluateTisdaleScore({
    ageGeriatric: true,
    loopDiuretic: true,
    twoOrMoreQtDrugs: true,
    sepsis: true,
  });
  assert.equal(mod.score, 8);
  assert.equal(mod.tier, "moderate");
  assert.match(mod.predictedRiskPercentage, /~37%/);

  // High tier: age (1) + female (1) + loop (1) + hypokalemia (2) + admission QTc (2) + 2 QT drugs (3) + heart failure (3) = 13 pts
  const high = evaluateTisdaleScore({
    ageGeriatric: true,
    femaleSex: true,
    loopDiuretic: true,
    hypokalemia: true,
    admissionQtcProlonged: true,
    twoOrMoreQtDrugs: true,
    heartFailure: true,
  });
  assert.equal(high.score, 13);
  assert.equal(high.tier, "high");
  assert.match(high.predictedRiskPercentage, /~73%/);
  assert.equal(high.telemetryRequirement, "Mandatory continuous telemetry with QTc alarms active");
  assert.equal(high.electrolyteTargets.potassiumMeqL, "4.5–5.0 mEq/L");
});

test("deriveTisdaleDefaults: accurately auto-detects from desk context", () => {
  const host = { ...DEFAULT_HOST, age: "geriatric" as const };
  const ids = ["methadone", "ondansetron", "furosemide"];

  const defaults = deriveTisdaleDefaults(ids, host);
  assert.equal(defaults.ageGeriatric, true);
  assert.equal(defaults.loopDiuretic, true);
  assert.equal(defaults.twoOrMoreQtDrugs, true);

  const evaluated = evaluateTisdaleScore(defaults);
  // age (1) + loop (1) + 2 QT drugs (3) = 5 points (low tier, but 5 pts close to moderate)
  assert.equal(evaluated.score, 5);
});

test("getTdpResuscitationNomogram: stable protocol specifies magnesium, overdrive, and avoidance", () => {
  const nomo = getTdpResuscitationNomogram("stable-recurrent-bursts");
  assert.equal(nomo.clinicalStatus, "stable-recurrent-bursts");
  assert.equal(nomo.steps.length, 5);

  const step1 = nomo.steps[0];
  assert.match(step1.title, /Magnesium Sulfate/);
  assert.match(step1.dosingOrParameters, /2 grams IV/);
  assert.ok(step1.clinicalPearls.some((p) => p.includes("completely normal")));

  const step2 = nomo.steps[1];
  assert.match(step2.title, /Overdrive/);
  assert.match(step2.dosingOrParameters, /90–110 bpm/);
  assert.ok(step2.clinicalPearls.some((p) => p.includes("Isoproterenol is strictly contraindicated in Congenital Long QT")));

  assert.ok(nomo.antiarrhythmicAvoidanceList.some((a) => a.includes("Amiodarone")));
});

test("getTdpResuscitationNomogram: unstable protocol mandates unsynchronized defibrillation", () => {
  const nomo = getTdpResuscitationNomogram("unstable-pulseless");
  assert.equal(nomo.clinicalStatus, "unstable-pulseless");
  assert.equal(nomo.urgency, "emergent");

  const step1 = nomo.steps[0];
  assert.match(step1.title, /Unsynchronized Defibrillation/);
  assert.match(step1.dosingOrParameters, /200 Joules/);
  assert.ok(step1.clinicalPearls.some((p) => p.includes("Do NOT attempt synchronized cardioversion")));
});

test("evaluateQtDesk: end-to-end integration", () => {
  const host = { ...DEFAULT_HOST, age: "adult" as const };
  const ids = ["sotalol", "furosemide"];

  const result = evaluateQtDesk(ids, host);
  assert.equal(result.hasQtDrugs, true);
  assert.ok(result.activeQtRows.some((r) => r.id === "sotalol"));
  assert.ok(result.loopDiureticsOnDesk.includes("furosemide"));
  assert.ok(result.pathophysiologySummary.includes("hERG / KCNH2"));
});

