import assert from "node:assert/strict";
import test from "node:test";
import { DRUG_BY_ID } from "../catalog";
import { secondAliasCard } from "./second-alias";

test("secondAliasCard names the second stored alias for ketamine", () => {
  const card = secondAliasCard(DRUG_BY_ID.ketamine);
  assert.ok(card);
  assert.equal(card.correct, "racemic ketamine");
  assert.equal(card.prompt, "Ketamine.");
  assert.ok(card.choices?.some((choice) => choice.id === "racemic ketamine"));
  assert.equal(
    card.choices?.some((choice) => choice.id === "ketalar"),
    false,
  );
});

test("secondAliasCard is null when simvastatin has no second alias", () => {
  assert.equal(secondAliasCard(DRUG_BY_ID.simvastatin), null);
});
