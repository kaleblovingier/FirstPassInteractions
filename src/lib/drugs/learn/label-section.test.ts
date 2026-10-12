import test from "node:test";
import assert from "node:assert/strict";
import { labelSectionCard } from "./label-section";

test("labelSectionCard(clarithromycin, simvastatin) stores 4 CONTRAINDICATIONS", () => {
  const card = labelSectionCard("clarithromycin", "simvastatin");
  assert.ok(card);
  assert.equal(card.correct, "4 CONTRAINDICATIONS");
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(card.prompt.includes("4 CONTRAINDICATIONS"), false);
  assert.equal(card.prompt.includes(String(card.correct)), false);
  assert.ok(card.choices?.some((choice) => choice.id === "4 CONTRAINDICATIONS"));
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  assert.equal(
    distractors.some((choice) => choice.id === "4 CONTRAINDICATIONS"),
    false,
  );
});

test("labelSectionCard is null for warfarin and clarithromycin", () => {
  assert.equal(labelSectionCard("warfarin", "clarithromycin"), null);
});
