import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { ninthAliasCard } from "./ninth-alias";

test("ninthAliasCard(dirty-30) stores m 30 ninth", () => {
  const drug = DRUG_BY_ID["dirty-30"];
  assert.equal(drug.id, "dirty-30");
  assert.equal(drug.name, "Dirty 30 (pressed M30)");
  assert.equal(drug.aliases[8], "m 30");
  const card = ninthAliasCard(drug);
  assert.ok(card);
  assert.equal(card.id, "aka9-dirty-30");
  assert.equal(card.lane, "desk");
  assert.equal(card.kicker, "Ninth name");
  assert.equal(card.title, "Dirty 30 (pressed M30)");
  assert.equal(card.prompt, "Dirty 30 (pressed M30).");
  assert.equal(card.prompt.includes("m 30"), false);
  assert.equal(card.ask, "Which other name is stored ninth?");
  assert.equal(card.correct, "m 30");
  assert.equal(
    card.answer,
    "Dirty 30 (pressed M30) also stores m 30 ninth. An alias is not a different map.",
  );
  assert.deepEqual(card.drugIds, ["dirty-30"]);
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  assert.equal(distractors.length, 3);
  for (const name of drug.aliases) {
    assert.equal(
      distractors.some((choice) => choice.id === name),
      false,
    );
  }
  assert.ok(card.choices?.some((choice) => choice.id === "m 30"));
});

test("ninthAliasCard is null without a ninth alias", () => {
  assert.equal(ninthAliasCard(DRUG_BY_ID.buprenorphine), null);
  assert.equal(ninthAliasCard(DRUG_BY_ID.warfarin), null);
});
