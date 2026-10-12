import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { secondSubstrateCard } from "./second-substrate";

test("secondSubstrateCard(warfarin) names CYP3A4", () => {
  const card = secondSubstrateCard(DRUG_BY_ID.warfarin);
  assert.ok(card);
  assert.equal(card.correct, "CYP3A4");
  assert.equal(card.prompt, "Warfarin.");
  assert.ok(card.answer.includes("minor"));
  assert.ok(card.answer.includes("clearance"));
});

test("secondSubstrateCard(clopidogrel) names CYP3A4", () => {
  const card = secondSubstrateCard(DRUG_BY_ID.clopidogrel);
  assert.ok(card);
  assert.equal(card.correct, "CYP3A4");
});

test("secondSubstrateCard(clarithromycin) is null", () => {
  assert.equal(secondSubstrateCard(DRUG_BY_ID.clarithromycin), null);
});

test("secondSubstrateCard(simvastatin) is null", () => {
  assert.equal(secondSubstrateCard(DRUG_BY_ID.simvastatin), null);
});
