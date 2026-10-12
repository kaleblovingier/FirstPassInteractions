import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { thirdBrandCard } from "./third-brand";

test("thirdBrandCard(buprenorphine) names Butrans", () => {
  const card = thirdBrandCard(DRUG_BY_ID.buprenorphine);
  assert.ok(card);
  assert.equal(card.correct, "Butrans");
  assert.equal(card.prompt, "Buprenorphine.");
  assert.equal(card.choices?.some((choice) => choice.id === "Suboxone"), false);
  assert.equal(card.choices?.some((choice) => choice.id === "Subutex"), false);
  assert.ok(card.choices?.some((choice) => choice.id === "Butrans"));
});

test("thirdBrandCard is null without a third brand", () => {
  assert.equal(thirdBrandCard(DRUG_BY_ID.warfarin), null);
  assert.equal(thirdBrandCard(DRUG_BY_ID.simvastatin), null);
});
