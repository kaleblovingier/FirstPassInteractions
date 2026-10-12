import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fourthSensCard } from "./fourth-sens";

test("fourthSensCard(methadone) is minor", () => {
  const card = fourthSensCard(DRUG_BY_ID.methadone);
  assert.ok(card);
  assert.equal(card.correct, "minor");
  assert.equal(card.prompt, "Methadone.");
  assert.ok(card.choices?.some((choice) => choice.id === "minor"));
});

test("fourthSensCard is null without a fourth substrate", () => {
  assert.equal(fourthSensCard(DRUG_BY_ID.warfarin), null);
  assert.equal(fourthSensCard(DRUG_BY_ID.simvastatin), null);
});
