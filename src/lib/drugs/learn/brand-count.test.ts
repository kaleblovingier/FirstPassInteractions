import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { brandCountCard } from "./brand-count";

test("simvastatin brand count is 1", () => {
  const card = brandCountCard(DRUG_BY_ID.simvastatin);
  assert.equal(card.correct, "1");
  assert.equal(card.prompt, "Simvastatin.");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});

test("warfarin brand count is 2", () => {
  const card = brandCountCard(DRUG_BY_ID.warfarin);
  assert.equal(card.correct, "2");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});

test("grapefruit brand count is 0", () => {
  const card = brandCountCard(DRUG_BY_ID.grapefruit);
  assert.equal(card.correct, "0");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});
