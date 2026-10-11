import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFosphenytoinEquivalent,
  calculateMichaelisMentenDose,
  calculatePhenytoinClearance,
  calculatePredictedCss,
  calculateSheinerTozer,
  estimateVmaxKmFromTwoPoints,
  evaluatePhenytoinLevel,
  evaluatePhenytoinPgx,
  findPhenytoinCollisions,
  phenytoinOnDesk,
  phenytoinReportOnDesk,
  simulateDoseTitrationJump,
  PHENYTOIN_CDS_DISCLAIMER,
  POPULATION_KM_MEAN_MG_L,
  POPULATION_VMAX_MEAN_MG_KG_DAY,
  THERAPEUTIC_FREE_RANGE_MG_L,
  THERAPEUTIC_TOTAL_RANGE_MG_L,
} from "./phenytoin-kinetics";
import { DEFAULT_HOST, type HostContext } from "./types";

test("Michaelis-Menten dose and predicted Css calculations conform to mathematical model", () => {
  // Adult 70 kg, Vmax = 7 mg/kg/day -> Vmax_total = 490 mg/day; Km = 4.0 mg/L
  // Daily dose for target Css = 15 mg/L:
  // R = (490 * 15) / (4 + 15) = 7350 / 19 ≈ 386.8 mg/day
  const doseFor15 = calculateMichaelisMentenDose(15, 7.0, 4.0, 70);
  assert.equal(doseFor15, 386.8);

  // Daily dose for target Css = 10 mg/L:
  // R = (490 * 10) / (4 + 10) = 4900 / 14 = 350.0 mg/day
  const doseFor10 = calculateMichaelisMentenDose(10, 7.0, 4.0, 70);
  assert.equal(doseFor10, 350.0);

  // Direct Vmax without weight (treated as total mg/day, e.g. 500 mg/day):
  // Target 15 mg/L, Km 4 mg/L: (500 * 15) / (4 + 15) = 7500 / 19 = 394.7 mg/day
  const doseDirect = calculateMichaelisMentenDose(15, 500, 4.0);
  assert.equal(doseDirect, 394.7);

  // Solve predicted Css from dose:
  // R = 350 mg/day, Vmax = 490 mg/day, Km = 4 mg/L:
  // Css = (350 * 4) / (490 - 350) = 1400 / 140 = 10.0 mg/L
  const pred10 = calculatePredictedCss(350, 7.0, 4.0, 70);
  assert.equal(pred10.isSaturated, false);
  assert.equal(pred10.predictedCss, 10.0);
  assert.ok(pred10.clearanceLPerDay !== null && pred10.clearanceLPerDay > 0);

  // Saturation check: dose >= Vmax (e.g. 500 mg/day >= 490 mg/day)
  const saturated = calculatePredictedCss(500, 7.0, 4.0, 70);
  assert.equal(saturated.isSaturated, true);
  assert.equal(saturated.predictedCss, null);
  assert.match(saturated.warning!, /saturated/i);
});

test("Phenytoin clearance decreases dramatically as concentration rises (saturation dynamics)", () => {
  // CL = Vmax / (Km + C)
  // Low concentration (2 mg/L, first-order approximation): CL = 490 / (4 + 2) = 81.67 L/day
  const clLow = calculatePhenytoinClearance(2.0, 7.0, 4.0, 70);
  // Therapeutic concentration (15 mg/L, saturating): CL = 490 / (4 + 15) = 25.79 L/day
  const clMid = calculatePhenytoinClearance(15.0, 7.0, 4.0, 70);
  // Toxic concentration (35 mg/L, zero-order): CL = 490 / (4 + 35) = 12.56 L/day
  const clHigh = calculatePhenytoinClearance(35.0, 7.0, 4.0, 70);

  assert.ok(clLow.clearanceLPerDay > clMid.clearanceLPerDay);
  assert.ok(clMid.clearanceLPerDay > clHigh.clearanceLPerDay);
  // Clearance drops by >65% from 2 mg/L to 15 mg/L, and by >80% from 2 mg/L to 35 mg/L
  assert.ok(clHigh.clearanceLPerDay < clLow.clearanceLPerDay * 0.2);
});

test("Dose titration simulation reveals nonlinear concentration doubling/tripling from minor dose bumps", () => {
  // Adult with Vmax = 450 mg/day, Km = 4 mg/L
  // Current dose: 300 mg/day -> Css = (300*4)/(450-300) = 1200 / 150 = 8.0 mg/L
  // Dose increase by 20% to 360 mg/day:
  // Css = (360*4)/(450-360) = 1440 / 90 = 16.0 mg/L -> a 100% DOUBLING of serum concentration!
  const sim20 = simulateDoseTitrationJump(300, 20, 450, 4.0);
  assert.equal(sim20.newDoseMg, 360);
  assert.equal(sim20.newCssMgL, 16.0);
  assert.equal(sim20.cssIncreasePct, 100);
  assert.match(sim20.alert, /NONLINEAR SATURATION ALERT/);

  // Dose increase by 33% to ~400 mg/day:
  // Css = (400*4)/(450-400) = 1600 / 50 = 32.0 mg/L -> a 300% QUADRUPLING into severe toxicity!
  const sim33 = simulateDoseTitrationJump(300, 33, 450, 4.0);
  assert.equal(sim33.newDoseMg, 399);
  assert.ok(sim33.newCssMgL !== null && sim33.newCssMgL > 30.0);
  assert.ok(sim33.cssIncreasePct !== null && sim33.cssIncreasePct >= 280);

  // Exceeding Vmax: 55% increase to 465 mg/day (exceeds Vmax 450)
  const simOverflow = simulateDoseTitrationJump(300, 55, 450, 4.0);
  assert.equal(simOverflow.newCssMgL, null);
  assert.match(simOverflow.alert, /CRITICAL TOXICITY WARNING/);
});

test("Two-point Ludden method accurately estimates patient-specific Vmax and Km", () => {
  // Known patient with Vmax = 490 mg/day, Km = 4.0 mg/L
  // Dose 1 = 300 mg/day -> Css1 = (300*4)/(490-300) = 1200/190 = 6.3158 mg/L
  // Dose 2 = 360 mg/day -> Css2 = (360*4)/(490-360) = 1440/130 = 11.0769 mg/L
  const est = estimateVmaxKmFromTwoPoints(
    { dailyDoseMg: 300, cssMgL: 6.3158 },
    { dailyDoseMg: 360, cssMgL: 11.0769 },
  );

  assert.ok(est !== null);
  assert.ok(Math.abs(est.vmaxMgDay - 490) < 1.0);
  assert.ok(Math.abs(est.kmMgL - 4.0) < 0.2);

  // Invalid / identical points return null
  assert.equal(estimateVmaxKmFromTwoPoints({ dailyDoseMg: 300, cssMgL: 10 }, { dailyDoseMg: 300, cssMgL: 10 }), null);
});

test("Sheiner-Tozer correctly corrects for hypoalbuminemia and ESRD binding affinity loss", () => {
  // Normal albumin 4.0 g/dL: standard denominator = (0.2 * 4.0) + 0.1 = 0.9
  const normalAlb = calculateSheinerTozer(15.0, 4.0, false);
  assert.equal(normalAlb.isEsrd, false);
  assert.equal(normalAlb.formulaUsed, "sheiner-tozer-standard");
  assert.ok(normalAlb.adjustedTotalMcgMl >= 15.0 && normalAlb.adjustedTotalMcgMl <= 17.5);
  assert.ok(normalAlb.estimatedFreeFractionPct >= 9 && normalAlb.estimatedFreeFractionPct <= 12);

  // Hypoalbuminemia: Albumin 2.0 g/dL, Observed Total 10.0 mcg/mL
  // Denominator = (0.2 * 2.0) + 0.1 = 0.5 -> C_adj = 10 / 0.5 = 20.0 mcg/mL!
  // Free fraction expands to 20%, estimated free is 2.0 mcg/mL (top of therapeutic range)
  const hypoAlb = calculateSheinerTozer(10.0, 2.0, false);
  assert.equal(hypoAlb.adjustedTotalMcgMl, 20.0);
  assert.equal(hypoAlb.estimatedFreeMcgMl, 2.0);
  assert.equal(hypoAlb.estimatedFreeFractionPct, 20.0);
  assert.match(hypoAlb.clinicalNote, /Hypoalbuminemia adjusted/);

  // ESRD / Dialysis: Albumin 3.0 g/dL, Observed Total 10.0 mcg/mL
  // Denominator = (0.1 * 3.0) + 0.1 = 0.4 -> C_adj_esrd = 10 / 0.4 = 25.0 mcg/mL!
  // Free fraction expands to 25%, estimated free is 2.5 mcg/mL (supratherapeutic/toxic!)
  const esrd = calculateSheinerTozer(10.0, 3.0, true);
  assert.equal(esrd.isEsrd, true);
  assert.equal(esrd.formulaUsed, "sheiner-tozer-esrd");
  assert.equal(esrd.adjustedTotalMcgMl, 25.0);
  assert.equal(esrd.estimatedFreeMcgMl, 2.5);
  assert.equal(esrd.estimatedFreeFractionPct, 25.0);
  assert.match(esrd.clinicalNote, /ESRD \/ Dialysis adjusted/);
});

test("evaluatePhenytoinLevel detects therapeutic windows, toxicity tiers, and clinical signs", () => {
  // Therapeutic range: Total 15 mcg/mL, Albumin 4.0 g/dL
  const normal = evaluatePhenytoinLevel({ totalMcgMl: 15.0, albuminGDl: 4.0 });
  assert.equal(normal.totalBand, "therapeutic");
  assert.equal(normal.freeBand, "therapeutic");
  assert.equal(normal.clinicalSigns.length, 0);

  // Mild toxicity: Adjusted total ~25, Free ~2.5 -> Nystagmus, mild ataxia
  const mildTox = evaluatePhenytoinLevel({ totalMcgMl: 25.0, albuminGDl: 4.0 });
  assert.equal(mildTox.freeBand, "supratherapeutic-mild");
  assert.ok(mildTox.clinicalSigns.some((s) => s.includes("nystagmus")));

  // Moderate toxicity: Measured free = 3.5 mcg/mL -> Dysarthria, prominent cerebellar ataxia
  const modTox = evaluatePhenytoinLevel({ totalMcgMl: 32.0, measuredFreeMcgMl: 3.5 });
  assert.equal(modTox.freeBand, "moderate-toxicity");
  assert.equal(modTox.isMeasuredFree, true);
  assert.ok(modTox.clinicalSigns.some((s) => s.includes("ataxia") || s.includes("Dysarthria")));

  // Severe toxicity: Free = 4.8 mcg/mL -> Coma, stupor, paradoxical seizures
  const severeTox = evaluatePhenytoinLevel({ totalMcgMl: 45.0, measuredFreeMcgMl: 4.8 });
  assert.equal(severeTox.freeBand, "severe-toxicity");
  assert.ok(severeTox.clinicalSigns.some((s) => s.includes("coma") || s.includes("paradoxical")));
});

test("Valproate × Phenytoin Double-Hit correctly flags the Clinical Paradox", () => {
  // CLINICAL PARADOX TRAP:
  // Patient on Valproate + Phenytoin. Total phenytoin is 9.0 mcg/mL (which looks "subtherapeutic" on standard panel <10).
  // But valproate displaces phenytoin from albumin and inhibits CYP2C9.
  // Free fraction expands to 25%, making effective free phenytoin = 2.25 mcg/mL (> 2.0 mcg/mL upper limit)!
  const paradox = evaluatePhenytoinLevel({
    totalMcgMl: 9.0,
    albuminGDl: 4.0,
    hasValproate: true,
  });

  assert.equal(paradox.valproateDoubleHitWarning, true);
  assert.equal(paradox.clinicalParadoxDetected, true);
  assert.match(paradox.headline, /CRITICAL VALPROATE × PHENYTOIN DOUBLE-HIT PARADOX/);
  assert.match(paradox.clinicalInterpretation, /misleadingly NORMAL or LOW/);
  assert.match(paradox.clinicalInterpretation, /FREE phenytoin/);
  assert.match(paradox.clinicalInterpretation, /TOXIC/);

  // If measured free level is 2.8 mcg/mL with total 9.0 mcg/mL
  const measuredParadox = evaluatePhenytoinLevel({
    totalMcgMl: 9.0,
    measuredFreeMcgMl: 2.8,
    hasValproate: true,
  });
  assert.equal(measuredParadox.clinicalParadoxDetected, true);
  assert.equal(measuredParadox.effectiveFreeMcgMl, 2.8);
  assert.equal(measuredParadox.freeBand, "supratherapeutic-mild");
});

test("findPhenytoinCollisions identifies all critical perpetrator classes", () => {
  const collisions = findPhenytoinCollisions([
    "phenytoin",
    "valproate",
    "fluconazole",
    "voriconazole",
    "amiodarone",
    "tmp-smx",
    "carbamazepine",
    "phenobarbital",
    "rifampin",
    "enteral-feed",
  ]);

  // 1. Valproate double hit
  const vpa = collisions.find((c) => c.category === "valproate-double-hit");
  assert.ok(vpa !== undefined);
  assert.equal(vpa.severity, "contraindicated");
  assert.match(vpa.headline, /Double-Hit/i);
  assert.match(vpa.clinicalAction, /NEVER titrate phenytoin based on total/i);

  // 2. Strong CYP2C9/2C19 inhibitors
  const azole = collisions.find((c) => c.drugId === "fluconazole");
  assert.ok(azole !== undefined);
  assert.equal(azole.category, "cyp2c9-inhibition");
  assert.match(azole.mechanism, /CYP2C9/);

  const bactrim = collisions.find((c) => c.drugId === "tmp-smx");
  assert.ok(bactrim !== undefined);

  // 3. Hepatic inducers
  const rif = collisions.find((c) => c.drugId === "rifampin");
  assert.ok(rif !== undefined);
  assert.equal(rif.category, "hepatic-induction");
  assert.match(rif.mechanism, /induction/i);

  // 4. Enteral tube feeding
  const tube = collisions.find((c) => c.category === "tube-feed-binding");
  assert.ok(tube !== undefined);
  assert.match(tube.headline, /50–70% Bioavailability Loss/i);
  assert.match(tube.clinicalAction, /Hold continuous enteral nutrition for 1 to 2 hours/i);
});

test("calculateFosphenytoinEquivalent enforces PE stoichiometry, infusion rails, and Purple Glove safety", () => {
  // 100 mg phenytoin sodium -> 100 mg PE -> 150 mg fosphenytoin sodium
  const fos100 = calculateFosphenytoinEquivalent(100, "phenytoin-sodium");
  assert.equal(fos100.peEquivalentDoseMg, 100);
  assert.equal(fos100.fosphenytoinDoseMg, 150);
  assert.equal(fos100.maxInfusionRateMgPEPerMin, 150);
  assert.equal(fos100.maxPhenytoinInfusionRateMgPerMin, 50);
  assert.equal(fos100.imAdministrationPermitted, true);
  assert.match(fos100.purpleGloveSyndromeRisk, /Purple Glove Syndrome/);
  assert.match(fos100.phComparison, /pH ~12\.0/);

  // Fosphenytoin PE direct input (e.g. 1000 mg PE status epilepticus loading dose)
  const fosLoad = calculateFosphenytoinEquivalent(1000, "fosphenytoin-pe");
  assert.equal(fosLoad.peEquivalentDoseMg, 1000);
  assert.equal(fosLoad.fosphenytoinDoseMg, 1500);
});

test("evaluatePhenytoinPgx correctly adjusts Vmax and recommends dose reductions per CPIC", () => {
  // CYP2C9 PM (*3/*3)
  const pm = evaluatePhenytoinPgx({ ...DEFAULT_HOST.phenotypes, CYP2C9: "PM" });
  assert.equal(pm.vmaxAdjustmentFactor, 0.40);
  assert.equal(pm.recommendedDoseAdjustmentPct, -50);
  assert.match(pm.cpicRecommendation, /Poor Metabolizer/);

  // CYP2C9 IM (*1/*3)
  const im = evaluatePhenytoinPgx({ ...DEFAULT_HOST.phenotypes, CYP2C9: "IM" });
  assert.equal(im.vmaxAdjustmentFactor, 0.70);
  assert.equal(im.recommendedDoseAdjustmentPct, -25);

  // CYP2C9 NM (*1/*1)
  const nm = evaluatePhenytoinPgx({ ...DEFAULT_HOST.phenotypes, CYP2C9: "NM" });
  assert.equal(nm.vmaxAdjustmentFactor, 1.0);
  assert.equal(nm.recommendedDoseAdjustmentPct, 0);
});

test("phenytoinOnDesk identifies active agents and perpetrators accurately", () => {
  const result = phenytoinOnDesk(["dilantin", "depakote", "fluconazole", "enteral-feed"]);
  assert.equal(result.hasPhenytoin, true);
  assert.equal(result.hasAnyPhenytoin, true);
  assert.equal(result.hasValproate, true);
  assert.equal(result.hasCyp2c9Inhibitors, true);
  assert.equal(result.hasTubeFeed, true);
  assert.equal(result.hasInducers, false);

  const empty = phenytoinOnDesk(["atorvastatin", "metformin"]);
  assert.equal(empty.hasAnyPhenytoin, false);
});

test("phenytoinReportOnDesk synthesizes kinetics, host context, pregnancy, and FD&C Act 520(o)(1)(E) disclaimer", () => {
  const hostCkdPreg: HostContext = {
    ...DEFAULT_HOST,
    kidney: "ckd",
    preg: "pregnant",
    age: "adult",
  };

  const report = phenytoinReportOnDesk(
    ["phenytoin", "valproate", "fluconazole"],
    hostCkdPreg,
    {
      totalMcgMl: 12.0,
      dailyDoseMg: 350,
      weightKg: 65,
    },
  );

  assert.equal(report.hasPhenytoin, true);
  assert.equal(report.onDesk.hasValproate, true);
  assert.equal(report.sheinerTozer.isEsrd, true);
  assert.equal(report.sheinerTozer.formulaUsed, "sheiner-tozer-esrd");

  // Check pregnancy warnings (Fetal Hydantoin Syndrome)
  assert.ok(report.clinicalPearls.some((p) => p.includes("Fetal Hydantoin Syndrome")));

  // Check collisions present
  assert.ok(report.collisions.some((c) => c.category === "valproate-double-hit"));
  assert.ok(report.collisions.some((c) => c.category === "cyp2c9-inhibition"));

  // Check FD&C Act § 520(o)(1)(E) regulatory posture
  assert.match(report.disclaimer, /FD&C Act § 520\(o\)\(1\)\(E\)/);
  assert.match(report.disclaimer, /Non-Device Clinical Decision Support/);
  assert.match(report.disclaimer, /Prescribing Information/);
});
