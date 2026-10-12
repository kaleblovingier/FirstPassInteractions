import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { sixthAliasCard } from "./sixth-alias";

test("sixthAliasCard(buprenorphine) names buprenex", () => {
  const card = sixthAliasCard(DRUG_BY_ID.buprenorphine);
  assert.ok(card);
  assert.equal(card.correct, "buprenex");
  assert.equal(card.prompt, "Buprenorphine.");
  assert.equal(card.prompt.includes(card.correct), false);
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  for (const name of ["suboxone", "subutex", "zubsolv", "bunavail", "belbuca", "buprenex", "brixadi"]) {
    assert.equal(
      distractors.some((choice) => choice.id === name),
      false,
    );
  }
  assert.ok(card.choices?.some((choice) => choice.id === "buprenex"));
});

test("sixthAliasCard is null without a sixth alias", () => {
  assert.equal(sixthAliasCard(DRUG_BY_ID.ketamine), null);
  assert.equal(sixthAliasCard(DRUG_BY_ID.simvastatin), null);
});
