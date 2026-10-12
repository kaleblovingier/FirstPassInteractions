import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { twelfthAliasCard } from "./twelfth-alias";

test("twelfthAliasCard(dirty-30) names pressed oxy", () => {
  const dirty = DRUG_BY_ID["dirty-30"];
  assert.equal(dirty.id, "dirty-30");
  assert.equal(dirty.name, "Dirty 30 (pressed M30)");
  assert.equal(dirty.aliases.length, 12);
  assert.equal(dirty.aliases[11], "pressed oxy");
  assert.equal(dirty.aliases[12], undefined);
  const card = twelfthAliasCard(dirty);
  assert.ok(card);
  assert.equal(card.id, "aka12-dirty-30");
  assert.equal(card.lane, "desk");
  assert.equal(card.kicker, "Twelfth name");
  assert.equal(card.title, "Dirty 30 (pressed M30)");
  assert.equal(card.prompt, "Dirty 30 (pressed M30).");
  assert.equal(card.prompt.includes("pressed oxy"), false);
  assert.equal(card.prompt.includes(String(card.correct)), false);
  assert.equal(card.ask, "Which other name is stored twelfth?");
  assert.equal(card.correct, "pressed oxy");
  assert.equal(
    card.answer,
    "Dirty 30 (pressed M30) also stores pressed oxy twelfth. An alias is not a different map.",
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
  assert.ok(card.choices?.some((choice) => choice.id === "pressed oxy" && choice.label === "pressed oxy"));
  assert.equal(card.choices?.length, 4);
  assert.equal(/milligram|\bmg\b/i.test(`${card.ask} ${card.answer} ${card.kicker} ${card.prompt}`), false);
});

test("twelfthAliasCard is null without a twelfth alias", () => {
  assert.equal(twelfthAliasCard(DRUG_BY_ID.buprenorphine), null);
  assert.equal(twelfthAliasCard(DRUG_BY_ID.simvastatin), null);
  assert.equal(twelfthAliasCard(DRUG_BY_ID.warfarin), null);
  const emptyTwelfth = {
    ...DRUG_BY_ID.ketamine,
    aliases: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", ""],
  };
  assert.equal(twelfthAliasCard(emptyTwelfth), null);
});
