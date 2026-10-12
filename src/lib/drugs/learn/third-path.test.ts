import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { thirdPathCard } from "./third-path";

test("thirdPathCard reads the stored pathway", () => {
  const methadone = thirdPathCard(DRUG_BY_ID.methadone);
  assert.ok(methadone);
  assert.equal(methadone.correct, "clearance");
  assert.equal(methadone.prompt, "Methadone.");
  assert.ok(methadone.choices?.some((choice) => choice.id === "clearance"));
  const warfarin = thirdPathCard(DRUG_BY_ID.warfarin);
  assert.ok(warfarin);
  assert.equal(warfarin.correct, "clearance");
});

test("thirdPathCard is null without a third substrate", () => {
  assert.equal(thirdPathCard(DRUG_BY_ID.simvastatin), null);
  assert.equal(thirdPathCard(DRUG_BY_ID.imipramine), null);
});
