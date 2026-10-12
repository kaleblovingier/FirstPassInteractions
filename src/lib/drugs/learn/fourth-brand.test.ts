import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fourthBrandCard } from "./fourth-brand";

test("fourthBrandCard(buprenorphine) names Sublocade", () => {
  const card = fourthBrandCard(DRUG_BY_ID.buprenorphine);
  assert.ok(card);
  assert.equal(card.correct, "Sublocade");
  assert.equal(card.prompt, "Buprenorphine.");
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  assert.equal(distractors.some((choice) => choice.id === "Suboxone"), false);
  assert.equal(distractors.some((choice) => choice.id === "Subutex"), false);
  assert.equal(distractors.some((choice) => choice.id === "Butrans"), false);
  assert.equal(distractors.some((choice) => choice.id === "Sublocade"), false);
  assert.ok(card.choices?.some((choice) => choice.id === "Sublocade"));
});

test("fourthBrandCard is null without a fourth brand", () => {
  assert.equal(fourthBrandCard(DRUG_BY_ID.warfarin), null);
  assert.equal(fourthBrandCard(DRUG_BY_ID.simvastatin), null);
});
