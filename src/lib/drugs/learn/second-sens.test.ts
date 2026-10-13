import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { secondSensCard } from "./second-sens";

test("secondSensCard(warfarin) is minor", () => {
  const card = secondSensCard(DRUG_BY_ID.warfarin);
  assert.notEqual(card, null);
  assert.ok(card);
  assert.equal(card.correct, "minor");
  assert.equal(card.prompt, "Warfarin.");
});

test("secondSensCard(voriconazole) is major", () => {
  const card = secondSensCard(DRUG_BY_ID.voriconazole);
  assert.ok(card);
  assert.equal(card.correct, "major");
});

test("secondSensCard(clopidogrel) is minor", () => {
  const card = secondSensCard(DRUG_BY_ID.clopidogrel);
  assert.ok(card);
  assert.equal(card.correct, "minor");
});

test("secondSensCard(simvastatin) is null", () => {
  assert.equal(secondSensCard(DRUG_BY_ID.simvastatin), null);
});
