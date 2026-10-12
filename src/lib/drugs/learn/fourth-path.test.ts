import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fourthPathCard } from "./fourth-path";

test("fourthPathCard(methadone) is clearance", () => {
  const card = fourthPathCard(DRUG_BY_ID.methadone);
  assert.ok(card);
  assert.equal(card.correct, "clearance");
  assert.equal(card.prompt, "Methadone.");
  assert.ok(card.choices?.some((choice) => choice.id === "clearance"));
});

test("fourthPathCard is null without a fourth substrate", () => {
  assert.equal(fourthPathCard(DRUG_BY_ID.warfarin), null);
  assert.equal(fourthPathCard(DRUG_BY_ID.simvastatin), null);
});
