import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { thirdSubstrateCard } from "./third-substrate";

test("thirdSubstrateCard names the third substrate row", () => {
  const methadone = thirdSubstrateCard(DRUG_BY_ID.methadone);
  assert.ok(methadone);
  assert.equal(methadone.correct, "CYP2C19");
  assert.equal(methadone.prompt, "Methadone.");
  assert.ok(methadone.choices?.some((choice) => choice.id === "CYP2C19"));
  const warfarin = thirdSubstrateCard(DRUG_BY_ID.warfarin);
  assert.ok(warfarin);
  assert.equal(warfarin.correct, "CYP1A2");
  assert.equal(warfarin.prompt, "Warfarin.");
});

test("thirdSubstrateCard is null when a third substrate is not stored", () => {
  assert.equal(thirdSubstrateCard(DRUG_BY_ID.simvastatin), null);
  assert.equal(thirdSubstrateCard(DRUG_BY_ID.clarithromycin), null);
});
