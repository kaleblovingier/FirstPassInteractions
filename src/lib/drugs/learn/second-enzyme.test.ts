import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { secondEnzymeCard } from "./second-enzyme";

test("secondEnzymeCard(warfarin) names CYP3A4", () => {
  const card = secondEnzymeCard(DRUG_BY_ID.warfarin);
  assert.notEqual(card, null);
  assert.ok(card);
  assert.equal(card.correct, "CYP3A4");
  assert.equal(card.prompt, "Warfarin.");
});

test("secondEnzymeCard(simvastatin) is null", () => {
  assert.equal(secondEnzymeCard(DRUG_BY_ID.simvastatin), null);
});

test("warfarin second-enzyme choices include CYP3A4", () => {
  const card = secondEnzymeCard(DRUG_BY_ID.warfarin);
  assert.ok(card);
  assert.ok(card.choices?.some((choice) => choice.id === "CYP3A4"));
});
