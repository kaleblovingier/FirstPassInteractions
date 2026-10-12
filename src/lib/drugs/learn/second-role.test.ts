import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { secondRoleCard } from "./second-role";

test("secondRoleCard(warfarin) stores substrate", () => {
  const card = secondRoleCard(DRUG_BY_ID.warfarin);
  assert.notEqual(card, null);
  assert.ok(card);
  assert.equal(card.correct, "substrate");
  assert.equal(card.prompt, "Warfarin.");
});

test("secondRoleCard(clarithromycin) stores inhibitor", () => {
  const card = secondRoleCard(DRUG_BY_ID.clarithromycin);
  assert.ok(card);
  assert.equal(card.correct, "inhibitor");
});

test("secondRoleCard(rifampin) stores inducer", () => {
  const card = secondRoleCard(DRUG_BY_ID.rifampin);
  assert.ok(card);
  assert.equal(card.correct, "inducer");
});

test("secondRoleCard(simvastatin) is null", () => {
  assert.equal(secondRoleCard(DRUG_BY_ID.simvastatin), null);
});

test("warfarin second-role choices include substrate", () => {
  const card = secondRoleCard(DRUG_BY_ID.warfarin);
  assert.ok(card);
  assert.ok(card.choices?.some((c) => c.id === "substrate"));
});
