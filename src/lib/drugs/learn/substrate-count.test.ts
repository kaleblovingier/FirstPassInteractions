import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { substrateCountCard } from "./substrate-count";

test("simvastatin substrate count is 1", () => {
  const card = substrateCountCard(DRUG_BY_ID.simvastatin);
  assert.equal(card.correct, "1");
  assert.equal(card.prompt, "Simvastatin.");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});

test("warfarin substrate count is 3", () => {
  const card = substrateCountCard(DRUG_BY_ID.warfarin);
  assert.equal(card.correct, "3");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});

test("clarithromycin substrate count is 1", () => {
  const card = substrateCountCard(DRUG_BY_ID.clarithromycin);
  assert.equal(card.correct, "1");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});

test("azithromycin substrate count is 0", () => {
  const card = substrateCountCard(DRUG_BY_ID.azithromycin);
  assert.equal(card.correct, "0");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});
