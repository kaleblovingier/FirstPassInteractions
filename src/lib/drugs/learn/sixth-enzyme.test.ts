import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { sixthEnzymeCard } from "./sixth-enzyme";

test("sixthEnzymeCard(rifampin) names CYP2C8", () => {
  const card = sixthEnzymeCard(DRUG_BY_ID.rifampin);
  assert.ok(card);
  assert.equal(card.correct, "CYP2C8");
  assert.equal(card.prompt, "Rifampin.");
  assert.equal(card.prompt.includes("CYP2C8"), false);
  assert.ok(card.choices?.some((choice) => choice.id === "CYP2C8"));
});

test("sixthEnzymeCard is null when a sixth row is not stored", () => {
  assert.equal(sixthEnzymeCard(DRUG_BY_ID.warfarin), null);
  assert.equal(sixthEnzymeCard(DRUG_BY_ID.simvastatin), null);
});
