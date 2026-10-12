import assert from "node:assert/strict";
import test from "node:test";
import { DRUG_BY_ID } from "../catalog";
import { aliasCountCard } from "./alias-count";

test("aliasCountCard for ketamine counts two stored aliases", () => {
  const card = aliasCountCard(DRUG_BY_ID.ketamine);
  assert.equal(card.correct, "2");
  assert.equal(card.prompt, "Ketamine.");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});

test("aliasCountCard for simvastatin counts zero stored aliases", () => {
  const card = aliasCountCard(DRUG_BY_ID.simvastatin);
  assert.equal(card.correct, "0");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});
