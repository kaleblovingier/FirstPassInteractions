import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { flagCountCard } from "./flag-count";

test("flagCountCard counts simvastatin effect flags", () => {
  const card = flagCountCard(DRUG_BY_ID.simvastatin);
  assert.equal(card.correct, "2");
  assert.equal(card.prompt, "Simvastatin.");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});

test("flagCountCard counts warfarin effect flags", () => {
  const card = flagCountCard(DRUG_BY_ID.warfarin);
  assert.equal(card.correct, "1");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});
