import test from "node:test";
import assert from "node:assert/strict";
import { labelRetrievedCard } from "./label-retrieved";

test("labelRetrievedCard reads the stored retrieval date", () => {
  const card = labelRetrievedCard("simvastatin", "clarithromycin");
  assert.ok(card);
  assert.equal(card.id, "ret-clarithromycin|simvastatin");
  assert.equal(card.correct, "2026-09-27");
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(card.prompt.includes("2026"), false);
  assert.equal(card.prompt.includes(String(card.correct)), false);
  assert.equal(card.choices?.length, 4);
  assert.ok(card.choices?.some((choice) => choice.id === "2026-09-27"));
  assert.ok(card.answer.includes("That date is not a new finding."));
  assert.ok(card.answer.includes("The pair check is still the severity."));
  assert.doesNotMatch(card.answer, /\b\d+\s*mg\b/i);
  const later = labelRetrievedCard("dofetilide", "verapamil");
  assert.equal(later?.correct, "2026-10-12");
  assert.equal(later?.id, "ret-dofetilide|verapamil");
  assert.equal(later?.prompt, "Dofetilide × Verapamil.");
});

test("labelRetrievedCard is null when no label line is stored", () => {
  assert.equal(labelRetrievedCard("warfarin", "clarithromycin"), null);
});
