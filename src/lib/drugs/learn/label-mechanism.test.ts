import test from "node:test";
import assert from "node:assert/strict";
import { labelMechanismCard } from "./label-mechanism";

test("labelMechanismCard reads the stored mechanism word", () => {
  const card = labelMechanismCard("simvastatin", "clarithromycin");
  assert.ok(card);
  assert.equal(card.correct, "PK");
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(card.prompt.includes("PK"), false);
  assert.equal(card.prompt.includes(String(card.correct)), false);
  assert.equal(card.choices?.length, 3);
  assert.ok(card.answer.includes("The pair check is still the severity."));
  assert.doesNotMatch(card.answer, /\b\d+\s*mg\b/i);
});

test("labelMechanismCard is null without a stored mechanism word", () => {
  assert.equal(labelMechanismCard("warfarin", "clarithromycin"), null);
  assert.equal(labelMechanismCard("ranolazine", "phenobarbital"), null);
});
