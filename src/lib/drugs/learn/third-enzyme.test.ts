import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { thirdEnzymeCard } from "./third-enzyme";

test("thirdEnzymeCard(warfarin) names CYP1A2", () => {
  const card = thirdEnzymeCard(DRUG_BY_ID.warfarin);
  assert.notEqual(card, null);
  assert.ok(card);
  assert.equal(card.correct, "CYP1A2");
  assert.equal(card.prompt, "Warfarin.");
});

test("thirdEnzymeCard(simvastatin) is null", () => {
  assert.equal(thirdEnzymeCard(DRUG_BY_ID.simvastatin), null);
});

test("warfarin third-enzyme choices include CYP1A2", () => {
  const card = thirdEnzymeCard(DRUG_BY_ID.warfarin);
  assert.ok(card);
  assert.ok(card.choices?.some((choice) => choice.id === "CYP1A2"));
});

test("thirdEnzymeCard(clarithromycin) names P-gp", () => {
  const card = thirdEnzymeCard(DRUG_BY_ID.clarithromycin);
  assert.ok(card);
  assert.equal(card.correct, "P-gp");
});
