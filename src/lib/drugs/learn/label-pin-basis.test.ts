import test from "node:test";
import assert from "node:assert/strict";
import { labelPinBasisCard } from "./label-pin-basis";

test("labelPinBasisCard reads the pin basis when gold owns the quote", () => {
  const card = labelPinBasisCard("simvastatin", "clarithromycin");
  assert.ok(card);
  assert.equal(card.id, "pbas-clarithromycin|simvastatin");
  assert.equal(card.correct, "named");
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(card.prompt.includes("named"), false);
  assert.equal(card.prompt.includes(String(card.correct)), false);
  assert.equal(card.choices?.length, 2);
  assert.ok(card.choices?.some((choice) => choice.id === "named"));
  assert.ok(card.choices?.some((choice) => choice.id === "class"));
  assert.ok(card.answer.includes("Not a new finding."));
  assert.ok(card.answer.includes("The pair check is still the severity."));
  assert.doesNotMatch(card.answer, /\b\d+\s*mg\b/i);
});

test("labelPinBasisCard is null when the line already asks basis or has no pin", () => {
  assert.equal(labelPinBasisCard("ranolazine", "phenobarbital"), null);
  assert.equal(labelPinBasisCard("ranolazine", "primidone"), null);
  assert.equal(labelPinBasisCard("warfarin", "clarithromycin"), null);
});
