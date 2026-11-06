import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOST } from "./types";
import { SE_WEIGHT_NEEDED, statusEpilepticusReportOnDesk } from "./status-epilepticus";
import { anticoagulationReportOnDesk } from "./anticoagulation-reversal";
import { evaluateReversal } from "./doac";
import { phenytoinReportOnDesk } from "./phenytoin-kinetics";
import { valproateReportOnDesk } from "./valproate";
import { antiarrhythmicReportOnDesk } from "./antiarrhythmic-kinetics";
import { anesthesiaReportOnDesk } from "./anesthesia-reversal";
import { glycemicReportOnDesk } from "./glycemic-kinetics";
import { toxicologyReportOnDesk } from "./toxicology-kinetics";
import { acidBaseReportOnDesk } from "./acid-base-kinetics";
import { pediatricReportOnDesk } from "./pediatric-kinetics";
import { neuropsychReportOnDesk } from "./neuropsych-kinetics";

// Owner rule: with no user-entered value, compute no dose; keep the math where the user entered the inputs.
test("status epilepticus: no entered weight computes no weight-based dose", () => {
  const report = statusEpilepticusReportOnDesk(["lorazepam", "levetiracetam", "mannitol"], DEFAULT_HOST);
  assert.ok("weightNeeded" in report && report.weightNeeded === SE_WEIGHT_NEEDED);
  const json = JSON.stringify(report);
  assert.doesNotMatch(json, /"calculated|"patientWeightKg"/);
  assert.match(json, /"dosePerKgText":"0\.1 mg\/kg IV"/);
  assert.match(json, /10 mg fixed IM \(>40 kg\) or 5 mg fixed IM \(13-40 kg\)/);
});

test("status epilepticus: an entered weight still sizes every regimen", () => {
  const report = statusEpilepticusReportOnDesk(["lorazepam"], DEFAULT_HOST, { weightKg: 80 });
  assert.equal(report.patientWeightKg, 80);
  assert.equal(report.phase1.firstLineRegimens.find((r) => r.drugId === "lorazepam")?.calculatedDoseMg, 4);
  assert.ok(!("weightNeeded" in report));
});

test("Andexxa is sized only from an entered last dose and time", () => {
  assert.equal(anticoagulationReportOnDesk(["rivaroxaban"], DEFAULT_HOST).andexanetDosing, undefined);
  const entered = anticoagulationReportOnDesk(["rivaroxaban"], DEFAULT_HOST, { lastDoseMg: 20, hoursSinceLastDose: 2 });
  assert.equal(entered.andexanetDosing?.regimenTier, "High Dose");
  assert.equal(evaluateReversal("rivaroxaban", "major").andexxaCalc, undefined);
  assert.equal(evaluateReversal("rivaroxaban", "major", { lastDoseMg: 20, hoursSinceLastDose: 2 }).andexxaCalc?.isHighDose, true);
});

test("anticoagulation report sizes nothing from an input that was not entered, and says which are missing", () => {
  const argatroban = anticoagulationReportOnDesk(["argatroban", "bivalirudin", "warfarin"], DEFAULT_HOST);
  assert.deepEqual(argatroban.patientParameters, {
    weightKg: undefined,
    baselineInr: undefined,
    lastDoseMg: undefined,
    hoursSinceLastDose: undefined,
    crClMlMin: undefined,
  });
  assert.equal(argatroban.argatrobanKinetics?.recommendedInitialInfusionRateMcgKgMin, 2);
  assert.doesNotMatch(JSON.stringify(argatroban.argatrobanKinetics), /"calculated/);
  assert.doesNotMatch(JSON.stringify(argatroban.bivalirudinKinetics), /"calculated/);
  assert.equal(argatroban.argatrobanWarfarinCrossover, undefined);
  assert.equal(argatroban.fourFactorPccWarfarinDosing, undefined);
  assert.match(argatroban.inputsNeeded ?? "", /^Not entered: weight, INR, last dose, hours since the last dose./);

  const heparin = anticoagulationReportOnDesk(["heparin"], DEFAULT_HOST);
  assert.equal(heparin.protamineDosing, undefined);
  assert.equal(heparin.hit4TsEvaluation, undefined, "no Low 4Ts verdict from nothing entered");
  assert.match(heparin.inputsNeeded ?? "", /platelet counts or 4Ts findings/);
  assert.equal(anticoagulationReportOnDesk(["acetaminophen"], DEFAULT_HOST).inputsNeeded, undefined);

  const fonda = anticoagulationReportOnDesk(["fondaparinux"], DEFAULT_HOST);
  assert.ok(fonda.highYieldClinicalPearls.some((p) => p.includes("Protamine has ZERO effect")));
});

test("anticoagulation report sizes each section from the values entered", () => {
  const sized = anticoagulationReportOnDesk(["argatroban", "warfarin"], DEFAULT_HOST, { weightKg: 80, baselineInr: 4.2 });
  assert.equal(sized.argatrobanKinetics && "calculatedInfusionRateMcgMin" in sized.argatrobanKinetics, true);
  assert.equal(sized.fourFactorPccWarfarinDosing?.cappedDoseUnits, 2800);
  assert.ok(sized.argatrobanWarfarinCrossover);

  const heparin = anticoagulationReportOnDesk(["heparin"], DEFAULT_HOST, { lastDoseMg: 4000, hoursSinceLastDose: 1 });
  assert.equal(heparin.protamineDosing?.doseUnitsOrMg, 4000);
  // 5 is the mg of another agent, not heparin units; it never turned into an assumed 5,000-unit dose.
  const mg = anticoagulationReportOnDesk(["heparin"], DEFAULT_HOST, { lastDoseMg: 5, hoursSinceLastDose: 1 });
  assert.equal(mg.protamineDosing, undefined);
  assert.match(mg.inputsNeeded ?? "", /last dose/);
  const all = anticoagulationReportOnDesk(["apixaban"], DEFAULT_HOST, { weightKg: 80, baselineInr: 1.1, lastDoseMg: 5, hoursSinceLastDose: 4 });
  assert.equal(all.inputsNeeded, undefined);
});

// An API call enters nothing: every section that a value would have sized is absent, and the report says so.
const NO_SIZED_DOSE = /"(calculated\w*|totalDoseMg|vials\w*|neostigmineTotalMg|glycopyrrolateTotalMg|fixedRateUnitsPerHour|noBolusRateUnitsPerHour|optionalInitialBolusUnits|totalDailyDoseUnits|ivLoadingDoseMg|fosphenytoinDoseMg|newDoseMg|volumeNeededForTargetMl|hourlyRateFor24hTargetMlH|hourlyInfusionRateMg|clampedDoseMg|recommendedDoseAdjustmentMg|exactVialsCalculated|recommendedStartingDose)"/;

const unenteredReports: [string, () => object][] = [
  ["phenytoin", () => phenytoinReportOnDesk(["phenytoin"], DEFAULT_HOST)],
  ["valproate", () => valproateReportOnDesk(["valproate"], DEFAULT_HOST)],
  ["anesthesia", () => anesthesiaReportOnDesk(["rocuronium", "sugammadex", "propofol"], DEFAULT_HOST)],
  ["glycemic", () => glycemicReportOnDesk(["insulin-regular", "glipizide"], DEFAULT_HOST)],
  ["acid-base", () => acidBaseReportOnDesk(["furosemide"], DEFAULT_HOST)],
  ["pediatric", () => pediatricReportOnDesk(["acetaminophen", "amoxicillin"], DEFAULT_HOST)],
  ["toxicology", () => toxicologyReportOnDesk(["acetaminophen", "methadone", "aspirin", "fomepizole"], DEFAULT_HOST)],
];
for (const [name, run] of unenteredReports) {
  test(`${name} report computes no dose when no value was entered, and names what is needed`, () => {
    const report = run();
    assert.doesNotMatch(JSON.stringify(report), NO_SIZED_DOSE);
    assert.match((report as { inputsNeeded?: string }).inputsNeeded ?? "", /^Not entered: /);
  });
}

test("antiarrhythmic report reads no assumed digoxin level, weight or CrCl", () => {
  const report = antiarrhythmicReportOnDesk(["digoxin", "digifab", "dofetilide", "verapamil"], DEFAULT_HOST);
  assert.equal(report.digoxinEvaluation, undefined);
  assert.equal(report.digiFabCalculation, undefined);
  assert.equal(report.dofetilideRemsAdvisory?.recommendedStartingDose, undefined);
  assert.equal(report.dofetilideRemsAdvisory?.measuredCrClMlMin, undefined);
  assert.match(report.inputsNeeded ?? "", /digoxin level.*Cockcroft-Gault CrCl, baseline QTc/);
  assert.ok(!report.alerts.some((a) => a.category === "Digoxin"), "no level verdict from nothing entered");
  assert.ok(report.alerts.some((a) => a.category === "PgpCollision"), "the collision needs no level");
  assert.ok(report.alerts.some((a) => a.category === "DigiFab"), "the post-Fab trap needs no level");
});

test("neuropsych report projects no clozapine concentration from an assumed dose", () => {
  const report = neuropsychReportOnDesk(["clozapine"], { ...DEFAULT_HOST, smoking: true });
  assert.ok(!("tobaccoModel" in report.clozapineReport));
  assert.match(report.clozapineReport.inputsNeeded ?? "", /clozapine daily dose/);
  assert.ok(report.activeAlerts.some((a) => a.includes("Clozapine Tobacco Smoke Induction")));
});

test("entered values still size each section", () => {
  assert.equal(phenytoinReportOnDesk(["phenytoin"], DEFAULT_HOST, { totalMcgMl: 12, weightKg: 65, dailyDoseMg: 350 }).kinetics.dailyDoseMg, 350);
  assert.equal(valproateReportOnDesk(["valproate"], DEFAULT_HOST, { totalMcgMl: 85, ammoniaUmolL: 95, weightKg: 60 }).carnitineDosing?.ivLoadingDoseMg, 6000);
  const anesthesia = anesthesiaReportOnDesk(["rocuronium"], DEFAULT_HOST, { weightKg: 85, tofTwitches: 2, propofolRateMgKgH: 2.5, propofolDurationHours: 12 });
  assert.equal(anesthesia.sugammadexDosing?.totalDoseMg, 170);
  assert.equal(anesthesia.inputsNeeded, undefined);
  const glycemic = glycemicReportOnDesk(["insulin-regular"], DEFAULT_HOST, { patientWeightKg: 75, serumPotassium: 4.2, bloodGlucose: 380, measuredSodium: 134 });
  assert.equal(glycemic.insulinProtocol.fixedRateUnitsPerHour, 7.5);
  assert.ok(!("inputsNeeded" in glycemic));
  const fab = antiarrhythmicReportOnDesk(["digoxin"], DEFAULT_HOST, {
    digoxinTdm: { serumDigoxinNgMl: 4, indication: "hfref", hoursPostDose: 12, patientWeightKg: 80 },
  });
  assert.equal(fab.digiFabCalculation?.vialsToAdministerRoundedUp, 4);
  const dof = antiarrhythmicReportOnDesk(["dofetilide"], DEFAULT_HOST, { measuredCrClMlMin: 50, baselineQtcMs: 420 });
  assert.equal(dof.dofetilideRemsAdvisory?.recommendedStartingDose, "250 mcg PO BID");
  const tox = toxicologyReportOnDesk(["methadone"], DEFAULT_HOST, { initialNaloxoneBolusMg: 0.4 });
  assert.equal(tox.naloxoneInfusionCalculation?.hourlyInfusionRateMg, 0.27);
  assert.equal(tox.inputsNeeded, undefined);
});
