import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { secondGradeCard } from "./second-grade";

test("clarithromycin second perpetrator strength is moderate", () => {
  const card = secondGradeCard(DRUG_BY_ID.clarithromycin);
  assert.ok(card);
  assert.equal(card.correct, "moderate");
  assert.equal(card.prompt, "Clarithromycin.");
  assert.ok(card.answer.includes("P-gp"));
  assert.ok(card.answer.includes("inhibitor"));
});

test("rifampin second perpetrator strength is moderate", () => {
  const card = secondGradeCard(DRUG_BY_ID.rifampin);
  assert.ok(card);
  assert.equal(card.correct, "moderate");
  assert.ok(card.answer.includes("CYP2C9"));
  assert.ok(card.answer.includes("inducer"));
});

test("fluconazole second perpetrator strength is strong", () => {
  const card = secondGradeCard(DRUG_BY_ID.fluconazole);
  assert.ok(card);
  assert.equal(card.correct, "strong");
});

test("simvastatin second grade card is null", () => {
  assert.equal(secondGradeCard(DRUG_BY_ID.simvastatin), null);
});
