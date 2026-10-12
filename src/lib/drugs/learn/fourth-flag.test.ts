import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fourthFlagCard } from "./fourth-flag";

test("fourthFlagCard(amitriptyline) names qt-possible", () => {
  const card = fourthFlagCard(DRUG_BY_ID.amitriptyline);
  assert.ok(card);
  assert.equal(card.correct, "qt-possible");
  assert.equal(card.prompt, "Amitriptyline.");
  assert.equal(card.prompt.includes("qt"), false);
  assert.ok(card.choices?.some((choice) => choice.id === "qt-possible"));
});

test("fourthFlagCard is null when a fourth flag is not stored", () => {
  assert.equal(fourthFlagCard(DRUG_BY_ID.aspirin), null);
  assert.equal(fourthFlagCard(DRUG_BY_ID.simvastatin), null);
});
