import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fifthBrandCard } from "./fifth-brand";

test("fifthBrandCard(buprenorphine) names Zubsolv", () => {
  const card = fifthBrandCard(DRUG_BY_ID.buprenorphine);
  assert.ok(card);
  assert.equal(card.correct, "Zubsolv");
  assert.equal(card.prompt, "Buprenorphine.");
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  for (const banned of ["Suboxone", "Subutex", "Butrans", "Sublocade", "Zubsolv"]) {
    assert.equal(distractors.some((choice) => choice.id === banned), false);
  }
});

test("fifthBrandCard is null without a fifth brand", () => {
  assert.equal(fifthBrandCard(DRUG_BY_ID.warfarin), null);
});
