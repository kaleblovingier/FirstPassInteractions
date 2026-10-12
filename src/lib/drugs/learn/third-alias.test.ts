import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { thirdAliasCard } from "./third-alias";

test("thirdAliasCard(buprenorphine) names zubsolv", () => {
  const card = thirdAliasCard(DRUG_BY_ID.buprenorphine);
  assert.ok(card);
  assert.equal(card.correct, "zubsolv");
  assert.equal(card.prompt, "Buprenorphine.");
  assert.equal(card.choices?.some((choice) => choice.id === "suboxone"), false);
  assert.equal(card.choices?.some((choice) => choice.id === "subutex"), false);
  assert.ok(card.choices?.some((choice) => choice.id === "zubsolv"));
});

test("thirdAliasCard is null without a third alias", () => {
  assert.equal(thirdAliasCard(DRUG_BY_ID.ketamine), null);
  assert.equal(thirdAliasCard(DRUG_BY_ID.simvastatin), null);
});
