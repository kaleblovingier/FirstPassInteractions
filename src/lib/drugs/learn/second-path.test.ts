import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { secondPathCard } from "./second-path";

test("secondPathCard(warfarin) is clearance", () => {
  const card = secondPathCard(DRUG_BY_ID.warfarin);
  assert.ok(card);
  assert.equal(card.correct, "clearance");
  assert.equal(card.prompt, "Warfarin.");
});

test("secondPathCard(clopidogrel) is activation", () => {
  const card = secondPathCard(DRUG_BY_ID.clopidogrel);
  assert.ok(card);
  assert.equal(card.correct, "activation");
  assert.equal(card.prompt, "Clopidogrel.");
});

test("secondPathCard(simvastatin) is null", () => {
  assert.equal(secondPathCard(DRUG_BY_ID.simvastatin), null);
});

test("secondPathCard(clarithromycin) is null", () => {
  assert.equal(secondPathCard(DRUG_BY_ID.clarithromycin), null);
});
