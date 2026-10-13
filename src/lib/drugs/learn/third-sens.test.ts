import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { thirdSensCard } from "./third-sens";

test("thirdSensCard reads the stored sensitivity", () => {
  const methadone = thirdSensCard(DRUG_BY_ID.methadone);
  assert.ok(methadone);
  assert.equal(methadone.correct, "minor");
  assert.equal(methadone.prompt, "Methadone.");
  assert.ok(methadone.choices?.some((choice) => choice.id === "minor"));
  const warfarin = thirdSensCard(DRUG_BY_ID.warfarin);
  assert.ok(warfarin);
  assert.equal(warfarin.correct, "minor");
});

test("thirdSensCard is null without a third substrate", () => {
  assert.equal(thirdSensCard(DRUG_BY_ID.simvastatin), null);
  assert.equal(thirdSensCard(DRUG_BY_ID.voriconazole), null);
});
