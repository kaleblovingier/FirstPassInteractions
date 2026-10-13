import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { firstRowRoleCard } from "./first-row-role";

test("firstRowRoleCard(clarithromycin) stores substrate on the first row", () => {
  const card = firstRowRoleCard(DRUG_BY_ID.clarithromycin);
  assert.ok(card);
  assert.equal(card.correct, "substrate");
  assert.equal(card.prompt, "Clarithromycin.");
  assert.ok(card.answer.includes("CYP3A4"));
  assert.ok(card.answer.includes("first row"));
});

test("firstRowRoleCard(simvastatin) stores substrate", () => {
  const card = firstRowRoleCard(DRUG_BY_ID.simvastatin);
  assert.ok(card);
  assert.equal(card.correct, "substrate");
});

test("firstRowRoleCard(rifampin) stores inducer", () => {
  const card = firstRowRoleCard(DRUG_BY_ID.rifampin);
  assert.ok(card);
  assert.equal(card.correct, "inducer");
});

test("firstRowRoleCard(grapefruit) stores inhibitor", () => {
  const card = firstRowRoleCard(DRUG_BY_ID.grapefruit);
  assert.ok(card);
  assert.equal(card.correct, "inhibitor");
});

test("firstRowRoleCard(azithromycin) is null", () => {
  assert.equal(firstRowRoleCard(DRUG_BY_ID.azithromycin), null);
});
