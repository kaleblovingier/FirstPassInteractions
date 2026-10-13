import test from "node:test";
import assert from "node:assert/strict";
import { labelMoreCard } from "./label-more";

test("labelMoreCard counts other lines stored on the same label", () => {
  const card = labelMoreCard("simvastatin", "clarithromycin");
  assert.ok(card);
  assert.equal(String(card.correct), "2");
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(card.prompt.includes("2"), false);
  assert.ok(card.choices?.some((choice) => choice.id === "2"));
  const distractors = card.choices?.filter((choice) => choice.id !== "2") ?? [];
  assert.equal(
    distractors.some((choice) => choice.id === "2"),
    false,
  );
  assert.match(card.answer, /Not a suggestion to add them/);
  assert.doesNotMatch(card.answer, /\b\d+\s*mg\b/i);
});

test("labelMoreCard is null when no label line is stored", () => {
  assert.equal(labelMoreCard("warfarin", "clarithromycin"), null);
});
