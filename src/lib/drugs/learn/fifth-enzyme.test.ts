import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fifthEnzymeCard } from "./fifth-enzyme";

test("fifthEnzymeCard(rifampin) names CYP1A2", () => {
  const card = fifthEnzymeCard(DRUG_BY_ID.rifampin);
  assert.ok(card);
  assert.equal(DRUG_BY_ID.rifampin.enzymes[4]?.enzyme, "CYP1A2");
  assert.equal(card.correct, "CYP1A2");
  assert.equal(card.prompt, "Rifampin.");
  assert.equal(card.prompt.includes("CYP1A2"), false);
  assert.ok(card.choices?.some((choice) => choice.id === "CYP1A2"));
});

test("fifthEnzymeCard is null when a fifth row is not stored", () => {
  assert.equal(fifthEnzymeCard(DRUG_BY_ID.warfarin), null);
  assert.equal(fifthEnzymeCard(DRUG_BY_ID.simvastatin), null);
});
