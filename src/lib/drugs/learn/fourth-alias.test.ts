import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fourthAliasCard } from "./fourth-alias";

test("fourthAliasCard(buprenorphine) names bunavail", () => {
  const card = fourthAliasCard(DRUG_BY_ID.buprenorphine);
  assert.ok(card);
  assert.equal(card.correct, "bunavail");
  assert.equal(card.prompt, "Buprenorphine.");
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  for (const name of ["suboxone", "subutex", "zubsolv", "bunavail"]) {
    assert.equal(
      distractors.some((choice) => choice.id === name),
      false,
    );
  }
  assert.ok(card.choices?.some((choice) => choice.id === "bunavail"));
});

test("fourthAliasCard is null without a fourth alias", () => {
  assert.equal(fourthAliasCard(DRUG_BY_ID.ketamine), null);
  assert.equal(fourthAliasCard(DRUG_BY_ID.simvastatin), null);
});
