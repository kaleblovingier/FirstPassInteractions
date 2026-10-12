import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { sixthBrandCard } from "./sixth-brand";

test("sixthBrandCard(buprenorphine) names Brixadi", () => {
  const card = sixthBrandCard(DRUG_BY_ID.buprenorphine);
  assert.ok(card);
  assert.equal(card.correct, "Brixadi");
  assert.equal(card.prompt, "Buprenorphine.");
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  for (const banned of ["Suboxone", "Subutex", "Butrans", "Sublocade", "Zubsolv", "Brixadi"]) {
    assert.equal(distractors.some((choice) => choice.id === banned), false);
  }
});

test("sixthBrandCard is null without a sixth brand", () => {
  assert.equal(sixthBrandCard(DRUG_BY_ID.warfarin), null);
});
