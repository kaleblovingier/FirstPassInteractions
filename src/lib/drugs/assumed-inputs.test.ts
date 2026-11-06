import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOST } from "./types";
import { SE_WEIGHT_NEEDED, statusEpilepticusReportOnDesk } from "./status-epilepticus";
import { anticoagulationReportOnDesk } from "./anticoagulation-reversal";
import { evaluateReversal } from "./doac";

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
