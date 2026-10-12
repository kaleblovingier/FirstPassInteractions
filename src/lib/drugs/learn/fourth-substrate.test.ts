import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fourthSubstrateCard } from "./fourth-substrate";

test("fourthSubstrateCard(methadone) names CYP1A2", () => {
  const card = fourthSubstrateCard(DRUG_BY_ID.methadone);
  assert.ok(card);
  assert.equal(card.correct, "CYP1A2");
  assert.equal(card.prompt, "Methadone.");
  assert.equal(card.prompt.includes("CYP1A2"), false);
  assert.ok(card.choices?.some((choice) => choice.id === "CYP1A2"));
});

test("fourthSubstrateCard is null without a fourth substrate", () => {
  assert.equal(fourthSubstrateCard(DRUG_BY_ID.warfarin), null);
  assert.equal(fourthSubstrateCard(DRUG_BY_ID.simvastatin), null);
  assert.equal(fourthSubstrateCard(DRUG_BY_ID.rifampin), null);
});
