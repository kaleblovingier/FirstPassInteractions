import test from "node:test";
import assert from "node:assert/strict";
import { labelFor } from "../label-on-desk";
import { labelExampleCard } from "./label-example";

test("labelExampleCard(simvastatin, clarithromycin) stores the naming line", () => {
  const card = labelExampleCard("simvastatin", "clarithromycin");
  assert.ok(card);
  const row = labelFor("simvastatin", "clarithromycin");
  assert.ok(row);
  assert.equal(card.correct, row.example);
  assert.equal(String(card.correct).includes("clarithromycin"), true);
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(card.prompt.includes(String(card.correct)), false);
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  assert.equal(
    distractors.some((choice) => choice.id === card.correct),
    false,
  );
});

test("labelExampleCard is null when no naming line is stored", () => {
  assert.equal(labelExampleCard("warfarin", "clarithromycin"), null);
  assert.equal(labelExampleCard("ketamine", "simvastatin"), null);
});
