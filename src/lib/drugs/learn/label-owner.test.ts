import test from "node:test";
import assert from "node:assert/strict";
import { labelOwnerCard } from "./label-owner";

test("labelOwnerCard(simvastatin, clarithromycin) stores the line on Zocor", () => {
  const card = labelOwnerCard("simvastatin", "clarithromycin");
  assert.ok(card);
  assert.equal(card.correct, "Zocor (simvastatin)");
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(card.prompt.includes("Zocor"), false);
  assert.equal(card.prompt.includes(String(card.correct)), false);
  assert.ok(card.choices?.some((choice) => choice.id === "Zocor (simvastatin)"));
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  assert.equal(
    distractors.some((choice) => choice.id === "Zocor (simvastatin)"),
    false,
  );
});

test("labelOwnerCard is null when no label line is stored", () => {
  assert.equal(labelOwnerCard("warfarin", "clarithromycin"), null);
});
