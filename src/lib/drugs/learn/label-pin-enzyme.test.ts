import test from "node:test";
import assert from "node:assert/strict";
import { labelPinEnzymeCard } from "./label-pin-enzyme";

test("labelPinEnzymeCard reads the enzyme the pin stores", () => {
  const card = labelPinEnzymeCard("simvastatin", "clarithromycin");
  assert.ok(card);
  assert.equal(card.id, "penz-clarithromycin|simvastatin");
  assert.equal(card.correct, "CYP3A4");
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(card.prompt.includes(String(card.correct)), false);
  assert.equal(card.choices?.some((c) => c.id === "CYP3A4"), true);
  assert.equal((card.choices?.length ?? 0) >= 2, true);
});

test("labelPinEnzymeCard reads an inducer pin enzyme", () => {
  const card = labelPinEnzymeCard("lurasidone", "rifampin");
  assert.ok(card);
  assert.equal(card.correct, "CYP3A4");
  const named = labelPinEnzymeCard("ranolazine", "phenobarbital");
  assert.ok(named);
  assert.equal(named.correct, "CYP3A4");
});

test("labelPinEnzymeCard is null when the pin stores no enzyme", () => {
  assert.equal(labelPinEnzymeCard("darunavir", "grazoprevir-elbasvir"), null);
  assert.equal(labelPinEnzymeCard("warfarin", "clarithromycin"), null);
});
