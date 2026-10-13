import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { fifthAliasCard } from "./fifth-alias";

test("fifthAliasCard(buprenorphine) names belbuca", () => {
  const card = fifthAliasCard(DRUG_BY_ID.buprenorphine);
  assert.ok(card);
  assert.equal(card.correct, "belbuca");
  assert.equal(card.prompt, "Buprenorphine.");
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  for (const name of ["suboxone", "subutex", "zubsolv", "bunavail", "belbuca"]) {
    assert.equal(
      distractors.some((choice) => choice.id === name),
      false,
    );
  }
  assert.ok(card.choices?.some((choice) => choice.id === "belbuca"));
});

test("fifthAliasCard is null without a fifth alias", () => {
  assert.equal(fifthAliasCard(DRUG_BY_ID.ketamine), null);
  assert.equal(fifthAliasCard(DRUG_BY_ID.simvastatin), null);
});
