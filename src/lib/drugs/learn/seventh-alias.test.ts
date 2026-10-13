import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { seventhAliasCard } from "./seventh-alias";

test("seventhAliasCard(buprenorphine) names brixadi", () => {
  const card = seventhAliasCard(DRUG_BY_ID.buprenorphine);
  assert.ok(card);
  assert.equal(card.correct, "brixadi");
  assert.equal(card.prompt, "Buprenorphine.");
  assert.equal(card.prompt.includes("brixadi"), false);
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  for (const name of ["suboxone", "subutex", "zubsolv", "bunavail", "belbuca", "buprenex", "brixadi"]) {
    assert.equal(
      distractors.some((choice) => choice.id === name),
      false,
    );
  }
  assert.ok(card.choices?.some((choice) => choice.id === "brixadi"));
});

test("seventhAliasCard is null without a seventh alias", () => {
  assert.equal(seventhAliasCard(DRUG_BY_ID.ketamine), null);
  assert.equal(seventhAliasCard(DRUG_BY_ID.simvastatin), null);
});
