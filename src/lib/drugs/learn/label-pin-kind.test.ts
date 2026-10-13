import test from "node:test";
import assert from "node:assert/strict";
import { labelPinKindCard } from "./label-pin-kind";

test("labelPinKindCard reads the direction the pin stores", () => {
  const card = labelPinKindCard("simvastatin", "clarithromycin");
  assert.ok(card);
  assert.equal(card.id, "pkind-clarithromycin|simvastatin");
  assert.equal(card.correct, "inhibitor");
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(card.prompt.includes(String(card.correct)), false);
  assert.equal(card.choices?.some((c) => c.id === "inhibitor"), true);
  assert.equal(card.choices?.some((c) => c.id === "inducer"), true);
});

test("labelPinKindCard reads an inducer pin", () => {
  const card = labelPinKindCard("lurasidone", "rifampin");
  assert.ok(card);
  assert.equal(card.correct, "inducer");
  const named = labelPinKindCard("ranolazine", "phenobarbital");
  assert.ok(named);
  assert.equal(named.correct, "inducer");
});

test("labelPinKindCard is null when the pin stores no direction", () => {
  assert.equal(labelPinKindCard("darunavir", "grazoprevir-elbasvir"), null);
  assert.equal(labelPinKindCard("warfarin", "clarithromycin"), null);
});
