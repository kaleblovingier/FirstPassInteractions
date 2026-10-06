import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCarnitineDosing,
  evaluateValproateLevel,
  evaluateVhe,
  findValproateCollisions,
  valproateOnDesk,
  valproateReportOnDesk,
} from "./valproate";
import { DEFAULT_HOST } from "./types";

test("evaluateValproateLevel correctly evaluates therapeutic windows and saturable protein binding", () => {
  // Normal albumin 4.0 g/dL, Total 75 mcg/mL -> therapeutic total and free
  const normal = evaluateValproateLevel({ totalMcgMl: 75, albuminGDl: 4.0 });
  assert.equal(normal.totalBand, "target-epilepsy");
  assert.equal(normal.freeBand, "target");
  assert.ok(normal.estimatedFreeMcgMl >= 5 && normal.estimatedFreeMcgMl <= 15);
  assert.equal(normal.saturationWarning, false);

  // Hypoalbuminemia 2.5 g/dL with Total 115 mcg/mL -> free fraction expands to >15%, free level is elevated
  const hypoAlb = evaluateValproateLevel({ totalMcgMl: 115, albuminGDl: 2.5 });
  assert.equal(hypoAlb.totalBand, "target-mania");
  assert.equal(hypoAlb.freeBand, "elevated");
  assert.ok(hypoAlb.estimatedFreeFractionPct > normal.estimatedFreeFractionPct);
  assert.equal(hypoAlb.saturationWarning, true);
  assert.match(hypoAlb.clinicalInterpretation, /hypoalbuminemia/i);

  // Supratherapeutic Total 130 mcg/mL -> binding sites saturate, toxic free level
  const toxicTotal = evaluateValproateLevel({ totalMcgMl: 130, albuminGDl: 4.0 });
  assert.equal(toxicTotal.totalBand, "elevated");
  assert.ok(toxicTotal.estimatedFreeMcgMl > 15);
  assert.equal(toxicTotal.saturationWarning, true);

  // Subtherapeutic Total 35 mcg/mL
  const sub = evaluateValproateLevel({ totalMcgMl: 35, albuminGDl: 4.0 });
  assert.equal(sub.totalBand, "subtherapeutic");
  assert.equal(sub.freeBand, "subtherapeutic");

  // Measured free level takes precedence
  const measured = evaluateValproateLevel({ totalMcgMl: 80, measuredFreeMcgMl: 18 });
  assert.equal(measured.estimatedFreeMcgMl, 18);
  assert.equal(measured.method, "measured");
  assert.equal(measured.freeBand, "elevated");
});

test("evaluateVhe identifies hyperammonemic encephalopathy and highlights the normal LFT trap", () => {
  // Normal ammonia (25 umol/L)
  const norm = evaluateVhe({
    ammoniaUmolL: 25,
    astAltElevated: false,
    hasEncephalopathySymptoms: false,
    hasTopiramate: false,
  });
  assert.equal(norm.riskTier, "normal");
  assert.equal(norm.carnitineIndicated, false);

  // Mild asymptomatic hyperammonemia (60 umol/L)
  const mild = evaluateVhe({
    ammoniaUmolL: 60,
    astAltElevated: false,
    hasEncephalopathySymptoms: false,
    hasTopiramate: false,
  });
  assert.equal(mild.riskTier, "mild-hyperammonemia");
  assert.equal(mild.carnitineIndicated, false);

  // Confirmed VHE: Ammonia 120 umol/L + Encephalopathy symptoms (with completely normal LFTs)
  const vhe = evaluateVhe({
    ammoniaUmolL: 120,
    astAltElevated: false, // NORMAL LFT TRAP
    hasEncephalopathySymptoms: true,
    hasTopiramate: true,
  });
  assert.equal(vhe.riskTier, "confirmed-vhe");
  assert.equal(vhe.carnitineIndicated, true);
  assert.match(vhe.headline, /Confirmed Valproate-Induced Hyperammonemic Encephalopathy/);
  assert.match(vhe.normalLftTrapAlert, /CRITICAL DIAGNOSTIC TRAP/);
  assert.match(vhe.normalLftTrapAlert, /completely NORMAL transaminases/);
  assert.ok(vhe.topiramateSynergyAlert !== null);
  assert.match(vhe.topiramateSynergyAlert, /TOPIRAMATE COLLISION ALERT/);
  assert.ok(vhe.recommendedActions.some((a) => a.includes("L-Carnitine")));
});

test("calculateCarnitineDosing calculates weight-based loading and maintenance with 6g ceiling", () => {
  // 70 kg adult: 70 * 100 = 7,000 mg -> capped at 6,000 mg loading dose
  const adult70 = calculateCarnitineDosing(70, "hyperammonemic-encephalopathy");
  assert.equal(adult70.ivLoadingDoseMg, 6000);
  assert.equal(adult70.ivLoadingDoseVials, 6);
  assert.equal(adult70.ivMaintenanceDoseMg, 3000);
  assert.equal(adult70.maxLoadingDoseMg, 6000);

  // 45 kg patient: 45 * 100 = 4,500 mg loading dose
  const peds45 = calculateCarnitineDosing(45, "hyperammonemic-encephalopathy");
  assert.equal(peds45.ivLoadingDoseMg, 4500);
  assert.equal(peds45.ivLoadingDoseVials, 5);
  assert.equal(peds45.ivMaintenanceDoseMg, 2300);
});

test("findValproateCollisions identifies carbapenem crash, lamotrigine SJS, and topiramate synergy", () => {
  const collisions = findValproateCollisions([
    "valproate",
    "meropenem",
    "lamotrigine",
    "topiramate",
    "aspirin",
  ]);

  const categories = collisions.map((c) => c.category);
  assert.ok(categories.includes("carbapenem-crash"));
  assert.ok(categories.includes("lamotrigine-sjs"));
  assert.ok(categories.includes("topiramate-ammonia"));
  assert.ok(categories.includes("aspirin-displacement"));

  // Meropenem is contraindicated
  const mero = collisions.find((c) => c.category === "carbapenem-crash");
  assert.equal(mero?.severity, "contraindicated");
  assert.match(mero?.mechanism ?? "", /acylpeptide hydrolase/i);

  // Lamotrigine is contraindicated
  const lamo = collisions.find((c) => c.category === "lamotrigine-sjs");
  assert.equal(lamo?.severity, "contraindicated");
  assert.match(lamo?.clinicalAction ?? "", /blue starter kit/i);
});

test("valproateReportOnDesk integrates patient context, pregnancy warnings, and clinical pearls", () => {
  const hostPreg = { ...DEFAULT_HOST, preg: "pregnant" as const };
  const report = valproateReportOnDesk(["valproate", "topiramate"], hostPreg, {
    totalMcgMl: 85,
    albuminGDl: 2.8,
    ammoniaUmolL: 95,
    hasEncephalopathySymptoms: true,
  });

  assert.equal(report.hasValproate, true);
  assert.equal(report.vheEval.riskTier, "confirmed-vhe");
  assert.equal(report.levelEval.saturationWarning, true);
  assert.ok(report.clinicalPearls.some((p) => p.includes("BLACK BOX TERATOGENICITY")));
  assert.ok(report.clinicalPearls.some((p) => p.includes("Normal LFT Diagnostic Trap")));
  assert.ok(report.collisions.length > 0);
  assert.match(report.disclaimer, /Not FDA-cleared/);
});
