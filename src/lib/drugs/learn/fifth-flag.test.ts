import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fifthFlagCard } from "./fifth-flag";

test("fifthFlagCard(amitriptyline) names seizure-lowering", () => {
  const card = fifthFlagCard(DRUG_BY_ID.amitriptyline);
  assert.ok(card);
  assert.equal(card.correct, "seizure-lowering");
  assert.equal(card.prompt, "Amitriptyline.");
  assert.ok(card.choices?.some((choice) => choice.id === "seizure-lowering"));
});

test("fifthFlagCard is null when a fifth flag is not stored", () => {
  assert.equal(fifthFlagCard(DRUG_BY_ID.clozapine), null);
  assert.equal(fifthFlagCard(DRUG_BY_ID.simvastatin), null);
});
