import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { eleventhAliasCard } from "./eleventh-alias";

test("eleventhAliasCard(dirty-30) names pressed perc", () => {
  const dirty = DRUG_BY_ID["dirty-30"];
  assert.equal(dirty.name, "Dirty 30 (pressed M30)");
  assert.equal(dirty.aliases[10], "pressed perc");
  const card = eleventhAliasCard(dirty);
  assert.ok(card);
  assert.equal(card.id, "aka11-dirty-30");
  assert.equal(card.lane, "desk");
  assert.equal(card.kicker, "Eleventh name");
  assert.equal(card.title, "Dirty 30 (pressed M30)");
  assert.equal(card.prompt, "Dirty 30 (pressed M30).");
  assert.equal(card.prompt.includes("pressed perc"), false);
  assert.equal(card.prompt.includes(String(card.correct)), false);
  assert.equal(card.ask, "Which other name is stored eleventh?");
  assert.equal(card.correct, "pressed perc");
  assert.equal(
    card.answer,
    "Dirty 30 (pressed M30) also stores pressed perc eleventh. An alias is not a different map.",
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
  assert.ok(card.choices?.some((choice) => choice.id === "pressed perc" && choice.label === "pressed perc"));
});

test("eleventhAliasCard is null without an eleventh alias", () => {
  assert.equal(eleventhAliasCard(DRUG_BY_ID.ketamine), null);
  assert.equal(eleventhAliasCard(DRUG_BY_ID.buprenorphine), null);
  const emptyEleventh = {
    ...DRUG_BY_ID.ketamine,
    aliases: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", ""],
  };
  assert.equal(eleventhAliasCard(emptyEleventh), null);
});
