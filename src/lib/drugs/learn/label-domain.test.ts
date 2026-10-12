import test from "node:test";
import assert from "node:assert/strict";
import { labelDomainCard } from "./label-domain";

test("labelDomainCard(simvastatin, clarithromycin) stores the domain statins", () => {
  const card = labelDomainCard("simvastatin", "clarithromycin");
  assert.ok(card);
  assert.equal(String(card.correct), "statins");
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(card.prompt.includes("statins"), false);
  assert.ok(card.choices?.some((choice) => choice.id === "statins"));
  const distractors = card.choices?.filter((choice) => choice.id !== String(card.correct)) ?? [];
  assert.equal(
    distractors.some((choice) => choice.id === "statins"),
    false,
  );
});

test("labelDomainCard is null without a stored domain", () => {
  assert.equal(labelDomainCard("warfarin", "clarithromycin"), null);
  assert.equal(labelDomainCard("ranolazine", "phenobarbital"), null);
});
