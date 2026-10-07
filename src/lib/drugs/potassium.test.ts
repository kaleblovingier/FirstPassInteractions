import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePotassium,
  identifyPerpetrators,
  potassiumOnDesk,
  potassiumReportOnDesk,
  type EcgFinding,
} from "./potassium";
import { DEFAULT_HOST } from "./types";

test("evaluatePotassium: stratifies severity tiers correctly based on serum potassium levels", () => {
  const normal = evaluatePotassium({ potassiumMeqL: 4.4 });
  assert.equal(normal.severityTier, "normal");
  assert.equal(normal.membraneStabilization.indicated, false);
  assert.equal(normal.intracellularShifting.indicated, false);

  const mild = evaluatePotassium({ potassiumMeqL: 5.4 });
  assert.equal(mild.severityTier, "mild");
  assert.equal(mild.membraneStabilization.indicated, false);
  assert.equal(mild.intracellularShifting.indicated, false);

  const moderate = evaluatePotassium({ potassiumMeqL: 6.2 });
  assert.equal(moderate.severityTier, "moderate");
  assert.equal(moderate.membraneStabilization.indicated, false);
  assert.equal(moderate.intracellularShifting.indicated, true);

  const severe = evaluatePotassium({ potassiumMeqL: 6.8 });
  assert.equal(severe.severityTier, "severe-emergency");
  assert.equal(severe.membraneStabilization.indicated, true);
  assert.equal(severe.intracellularShifting.indicated, true);
});

test("evaluatePotassium: triggers emergency membrane stabilization for malignant EKG findings even with moderate K", () => {
  const malignantEkgs: EcgFinding[] = ["peaked-t", "pr-prolongation", "p-loss", "qrs-widening", "sine-wave"];
  for (const ecg of malignantEkgs) {
    const evalResult = evaluatePotassium({ potassiumMeqL: 5.8, ecgFinding: ecg });
    assert.equal(evalResult.severityTier, "severe-emergency");
    assert.equal(evalResult.membraneStabilization.indicated, true);
    assert.ok(evalResult.membraneStabilization.primaryAgent.name.includes("Calcium Gluconate"));
  }
});

test("evaluatePotassium: surfaces the EKG Dissociation Trap warning when K >= 6.0 and EKG is normal", () => {
  const evalResult = evaluatePotassium({ potassiumMeqL: 6.7, ecgFinding: "normal" });
  assert.ok(evalResult.dissociationTrapAlert.includes("CRITICAL EKG DISSOCIATION TRAP"));
  assert.ok(evalResult.dissociationTrapAlert.includes("46-52%"));
});

test("evaluatePotassium: reduces insulin shifting dose to 5 units in renal impairment or borderline glucose", () => {
  // Normal kidney & glucose: 10 units
  const standard = evaluatePotassium({ potassiumMeqL: 6.6, egfrMlMin: 80, baselineGlucoseMgDl: 160 });
  assert.equal(standard.intracellularShifting.insulinDoseUnits, 10);
  assert.equal(standard.intracellularShifting.dextroseRequirement.administer, true);
  assert.equal(standard.intracellularShifting.dextroseRequirement.doseGrams, 25);

  // Impaired kidney (eGFR < 30): 5 units
  const renalImpaired = evaluatePotassium({ potassiumMeqL: 6.6, egfrMlMin: 20, baselineGlucoseMgDl: 160 });
  assert.equal(renalImpaired.intracellularShifting.insulinDoseUnits, 5);
  assert.ok(renalImpaired.intracellularShifting.insulinAdjustmentReason.includes("Adjusted to 5 units IV"));

  // Low baseline glucose (< 140): 5 units
  const lowGlucose = evaluatePotassium({ potassiumMeqL: 6.6, egfrMlMin: 70, baselineGlucoseMgDl: 110 });
  assert.equal(lowGlucose.intracellularShifting.insulinDoseUnits, 5);

  // Hyperglycemic patient (BG >= 250): omits bolus dextrose
  const hyperglycemic = evaluatePotassium({ potassiumMeqL: 6.6, egfrMlMin: 70, baselineGlucoseMgDl: 280 });
  assert.equal(hyperglycemic.intracellularShifting.dextroseRequirement.administer, false);
  assert.equal(hyperglycemic.intracellularShifting.dextroseRequirement.doseGrams, 0);
});

test("evaluatePotassium: highlights high-dose albuterol requirements and sodium bicarbonate acidosis constraints", () => {
  const res = evaluatePotassium({ potassiumMeqL: 6.3 });
  assert.equal(res.intracellularShifting.albuterolDosing.doseMg, 10);
  assert.ok(res.intracellularShifting.albuterolDosing.asthmaComparison.includes("4x to 8x"));
  assert.ok(res.intracellularShifting.sodiumBicarbonateGuidance.acidosisRequirement.includes("pH < 7.20"));
  assert.ok(res.intracellularShifting.sodiumBicarbonateGuidance.ineffectiveWarning.includes("INEFFECTIVE"));
});

test("evaluatePotassium: distinguishes Calcium Gluconate vs Calcium Chloride and warns regarding Digoxin", () => {
  const withDigoxin = evaluatePotassium({
    potassiumMeqL: 7.1,
    regimenIds: ["digoxin", "lisinopril"],
  });

  assert.ok(withDigoxin.membraneStabilization.primaryAgent.routePreference.includes("peripheral"));
  assert.ok(withDigoxin.membraneStabilization.alternativeAgent.routePreference.includes("Central venous"));
  assert.ok(withDigoxin.membraneStabilization.alternativeAgent.elementalCalciumMeq > 10);
  assert.ok(withDigoxin.membraneStabilization.digoxinPrecaution.includes("DIGOXIN ALERT"));
  assert.ok(withDigoxin.membraneStabilization.digoxinPrecaution.includes("DigiFab"));
});

test("evaluatePotassium: evaluates loop diuretic feasibility based on urine output and eGFR", () => {
  // Preserved urine
  const preserved = evaluatePotassium({ potassiumMeqL: 6.4, egfrMlMin: 45, urineOutput: "normal" });
  assert.equal(preserved.elimination.loopDiuretic.candidate, true);
  assert.ok(preserved.elimination.loopDiuretic.recommendedDose.includes("Furosemide"));

  // Anuric ESRD
  const anuric = evaluatePotassium({ potassiumMeqL: 6.9, egfrMlMin: 8, urineOutput: "anuric" });
  assert.equal(anuric.elimination.loopDiuretic.candidate, false);
  assert.equal(anuric.elimination.hemodialysis.emergentIndicated, true);
  assert.ok(anuric.elimination.hemodialysis.triggersPresent.some((t) => t.includes("Severe refractory hyperkalemia")));
});

test("evaluatePotassium: compares modern GI binders: Lokelma rapid onset, Patiromer spacing, and Kayexalate boxed warning", () => {
  const res = evaluatePotassium({ potassiumMeqL: 6.2 });
  const binders = res.elimination.giBinders;

  assert.ok(binders.szcLokelma.onset.includes("1 hour"));
  assert.ok(binders.szcLokelma.sodiumLoadWarning.includes("400 mg sodium"));

  assert.ok(binders.patiromerVeltassa.onset.includes("4 to 7 hours"));
  assert.ok(binders.patiromerVeltassa.drugSeparationWindow.includes("3 hours"));

  assert.ok(binders.spsKayexalate.boxedWarningBowelNecrosis.includes("intestinal necrosis"));
  assert.ok(binders.spsKayexalate.recommendation.includes("discourages SPS"));
});

test("identifyPerpetrators: identifies diverse clinical perpetrators including Bactrim ENaC homology and MRAs", () => {
  const testRegimen = [
    "lisinopril",
    "spironolactone",
    "tmp-smx",
    "tacrolimus",
    "ibuprofen",
    "potassium",
    "metoprolol",
  ];

  const perpetrators = identifyPerpetrators(testRegimen);
  assert.equal(perpetrators.length, 7);

  const mra = perpetrators.find((p) => p.category === "mra");
  assert.ok(mra);
  assert.ok(mra?.mechanism.includes("cortical collecting duct (CCD) principal cells"));

  const bactrim = perpetrators.find((p) => p.drugId === "tmp-smx");
  assert.ok(bactrim);
  assert.equal(bactrim?.category, "enac-blocker");
  assert.ok(bactrim?.mechanism.includes("amiloride"));

  const cni = perpetrators.find((p) => p.category === "calcineurin-inhibitor");
  assert.ok(cni);
  assert.equal(cni?.name, "Tacrolimus");

  const nsaid = perpetrators.find((p) => p.category === "nsaid");
  assert.ok(nsaid);
  assert.ok(nsaid?.mechanism.includes("vasodilatory prostaglandins"));

  const kLoad = perpetrators.find((p) => p.category === "potassium-load");
  assert.ok(kLoad);
  assert.ok(kLoad?.recommendedHoldAction.includes("Stop all potassium supplements immediately"));
});

test("potassiumOnDesk and potassiumReportOnDesk accurately detect desk agents and model risk", () => {
  const deskIds = ["losartan", "eplerenone", "sodium-zirconium-cyclosilicate", "insulin-regular"];
  const deskInfo = potassiumOnDesk(deskIds);

  assert.equal(deskInfo.hasPerpetrator, true);
  assert.equal(deskInfo.hasRaas, true);
  assert.equal(deskInfo.hasMra, true);
  assert.equal(deskInfo.hasBinder, true);
  assert.equal(deskInfo.hasShiftAgent, true);
  assert.equal(deskInfo.perpetratorCount, 2);

  const report = potassiumReportOnDesk(deskIds, {
    ...DEFAULT_HOST,
    kidney: "ckd",
  });

  assert.ok(report.potassiumMeqL >= 6.0);
  assert.equal(report.egfrMlMin, 28);
  assert.ok(report.activeBindersOnRegimen.length > 0);
});
