import test from "node:test";
import assert from "node:assert/strict";
import { labelPinSentenceCard } from "./label-pin-sentence";

const ZANAFLEX = "Zanaflex is contraindicated in patients taking strong CYP1A2 inhibitors";
const RANEXA = "RANEXA is contraindicated in patients: … Taking inducers of CYP3A";

test("labelPinSentenceCard reads the stored contraindications sentence", () => {
  const card = labelPinSentenceCard("tizanidine", "fluvoxamine");
  assert.ok(card);
  assert.equal(card.id, "csen-fluvoxamine|tizanidine");
  assert.equal(card.correct, ZANAFLEX);
  assert.equal(card.prompt, "Tizanidine × Fluvoxamine.");
  assert.equal(card.prompt.includes(ZANAFLEX), false);
  assert.equal(card.prompt.includes(String(card.correct)), false);
  assert.equal(card.choices?.length, 4);
  assert.ok(card.choices?.some((choice) => choice.id === ZANAFLEX));
  assert.ok(card.answer.includes("That sentence is not a new finding."));
  assert.ok(card.answer.includes("The pair check is still the severity."));
  assert.doesNotMatch(card.answer, /\b\d+\s*mg\b/i);
  const ranolazine = labelPinSentenceCard("ranolazine", "phenobarbital");
  assert.equal(ranolazine?.correct, RANEXA);
  assert.equal(ranolazine?.id, "csen-phenobarbital|ranolazine");
});

test("labelPinSentenceCard is null when no different sentence is stored", () => {
  assert.equal(labelPinSentenceCard("simvastatin", "clarithromycin"), null);
  assert.equal(labelPinSentenceCard("warfarin", "clarithromycin"), null);
  assert.equal(labelPinSentenceCard("darunavir", "grazoprevir-elbasvir"), null);
});
