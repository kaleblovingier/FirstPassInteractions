import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fourthEnzymeCard } from "./fourth-enzyme";

test("fourthEnzymeCard(rifampin) names CYP2B6", () => {
  const card = fourthEnzymeCard(DRUG_BY_ID.rifampin);
  assert.ok(card);
  assert.equal(card.correct, "CYP2B6");
  assert.equal(card.prompt, "Rifampin.");
  assert.equal(card.prompt.includes("CYP2B6"), false);
  assert.ok(card.choices?.some((choice) => choice.id === "CYP2B6"));
});

test("fourthEnzymeCard is null when a fourth row is not stored", () => {
  assert.equal(fourthEnzymeCard(DRUG_BY_ID.warfarin), null);
  assert.equal(fourthEnzymeCard(DRUG_BY_ID.simvastatin), null);
});
