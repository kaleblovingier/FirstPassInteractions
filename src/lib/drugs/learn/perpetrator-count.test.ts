import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { perpetratorCountCard } from "./perpetrator-count";

test("simvastatin perpetrator count is 0", () => {
  const card = perpetratorCountCard(DRUG_BY_ID.simvastatin);
  assert.equal(card.correct, "0");
  assert.equal(card.prompt, "Simvastatin.");
  assert.ok(card.choices?.some((choice) => choice.id === "0"));
});

test("clarithromycin perpetrator count is 2", () => {
  const card = perpetratorCountCard(DRUG_BY_ID.clarithromycin);
  assert.equal(card.correct, "2");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});

test("grapefruit perpetrator count is 2", () => {
  const card = perpetratorCountCard(DRUG_BY_ID.grapefruit);
  assert.equal(card.correct, "2");
  assert.equal(card.prompt, "Grapefruit juice.");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});

test("rifampin perpetrator count is 7", () => {
  const card = perpetratorCountCard(DRUG_BY_ID.rifampin);
  assert.equal(card.correct, "7");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});

test("azithromycin perpetrator count is 0", () => {
  const card = perpetratorCountCard(DRUG_BY_ID.azithromycin);
  assert.equal(card.correct, "0");
  assert.ok(card.choices?.some((choice) => choice.id === card.correct));
});
