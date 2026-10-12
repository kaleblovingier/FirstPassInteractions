import test from "node:test";
import assert from "node:assert/strict";
import { labelClassCard } from "./label-class";

test("labelClassCard reads the stored label class", () => {
  const card = labelClassCard("simvastatin", "clarithromycin");
  assert.ok(card);
  assert.equal(card.correct, "contraindicated");
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(card.prompt.includes("contraindicated"), false);
  assert.equal(card.choices?.length, 4);
  assert.ok(card.choices?.some((choice) => choice.id === "contraindicated"));
  assert.ok(card.answer.includes("The pair check is still the severity."));
  assert.doesNotMatch(card.answer, /\b\d+\s*mg\b/i);
});

test("labelClassCard is null without a stored label class", () => {
  assert.equal(labelClassCard("warfarin", "clarithromycin"), null);
});
