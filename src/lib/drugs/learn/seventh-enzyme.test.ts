import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { seventhEnzymeCard } from "./seventh-enzyme";

test("seventhEnzymeCard(rifampin) names P-gp", () => {
  const rifampin = DRUG_BY_ID.rifampin;
  assert.equal(rifampin.enzymes[6]?.enzyme, "P-gp");
  const card = seventhEnzymeCard(rifampin);
  assert.ok(card);
  assert.equal(card.correct, "P-gp");
  assert.equal(card.prompt, "Rifampin.");
  assert.equal(card.prompt.includes("P-gp"), false);
  assert.ok(card.choices?.some((choice) => choice.id === "P-gp"));
});

test("seventhEnzymeCard(ritonavir) names CYP2C9", () => {
  const ritonavir = DRUG_BY_ID.ritonavir;
  assert.equal(ritonavir.enzymes.length, 7);
  assert.equal(ritonavir.enzymes[6]?.enzyme, "CYP2C9");
  const card = seventhEnzymeCard(ritonavir);
  assert.notEqual(card, null);
  assert.ok(card);
  assert.equal(card.correct, "CYP2C9");
  assert.equal(card.prompt, "Ritonavir.");
});

test("seventhEnzymeCard is null when a seventh row is not stored", () => {
  assert.equal(seventhEnzymeCard(DRUG_BY_ID.warfarin), null);
});
