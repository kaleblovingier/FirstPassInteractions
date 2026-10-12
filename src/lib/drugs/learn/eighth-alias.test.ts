import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { eighthAliasCard } from "./eighth-alias";

test("eighthAliasCard(dirty-30) names m30", () => {
  const dirty = DRUG_BY_ID["dirty-30"];
  assert.equal(dirty.aliases[7], "m30");
  const card = eighthAliasCard(dirty);
  assert.ok(card);
  assert.equal(card.id, "aka8-dirty-30");
  assert.equal(card.lane, "desk");
  assert.equal(card.kicker, "Eighth name");
  assert.equal(card.title, "Dirty 30 (pressed M30)");
  assert.equal(card.prompt, "Dirty 30 (pressed M30).");
  assert.equal(card.prompt.includes("m30"), false);
  assert.equal(card.ask, "Which other name is stored eighth?");
  assert.equal(card.correct, "m30");
  assert.equal(
    card.answer,
    "Dirty 30 (pressed M30) also stores m30 eighth. An alias is not a different map.",
  );
  assert.deepEqual(card.drugIds, ["dirty-30"]);
  const distractors = card.choices?.filter((choice) => choice.id !== card.correct) ?? [];
  assert.equal(distractors.length, 3);
  for (const name of dirty.aliases) {
    assert.equal(
      distractors.some((choice) => choice.id === name),
      false,
    );
  }
  assert.ok(card.choices?.some((choice) => choice.id === "m30" && choice.label === "m30"));
});

test("eighthAliasCard is null without an eighth alias", () => {
  assert.equal(DRUG_BY_ID.buprenorphine.aliases.length, 7);
  assert.equal(eighthAliasCard(DRUG_BY_ID.buprenorphine), null);
  assert.equal(eighthAliasCard(DRUG_BY_ID.simvastatin), null);
  const emptyEighth = {
    ...DRUG_BY_ID.simvastatin,
    aliases: ["a", "b", "c", "d", "e", "f", "g", ""],
  };
  assert.equal(eighthAliasCard(emptyEighth), null);
});
