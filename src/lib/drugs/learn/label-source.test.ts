import test from "node:test";
import assert from "node:assert/strict";
import { labelSourceCard } from "./label-source";

test("labelSourceCard reads the stored source of a gold quote", () => {
  const card = labelSourceCard("simvastatin", "clarithromycin");
  assert.ok(card);
  assert.equal(card.id, "src-clarithromycin|simvastatin");
  assert.equal(card.correct, "gold");
  assert.equal(card.prompt, "Simvastatin × Clarithromycin.");
  assert.equal(String(card.prompt).toLowerCase().includes("gold"), false);
  assert.equal(card.choices?.length, 2);
  assert.equal(card.choices?.some((choice) => choice.id === "gold"), true);
  assert.equal(card.choices?.some((choice) => choice.id === "pin"), true);
});

test("labelSourceCard reads a pin-only line as pin", () => {
  const card = labelSourceCard("warfarin", "clarithromycin");
  assert.equal(card, null);
  const pin = labelSourceCard("ranolazine", "phenobarbital");
  assert.equal(pin?.id, "src-phenobarbital|ranolazine");
  assert.equal(pin?.correct, "pin");
  assert.equal(String(pin?.prompt).toLowerCase().includes("pin"), false);
  assert.equal(pin?.choices?.some((choice) => choice.id === "pin"), true);
});
