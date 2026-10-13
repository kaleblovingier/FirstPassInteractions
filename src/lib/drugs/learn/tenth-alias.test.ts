import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "../catalog";
import { tenthAliasCard } from "./tenth-alias";

test("tenthAliasCard(dirty-30) stores fake perc 30 tenth", () => {
  const drug = DRUG_BY_ID["dirty-30"];
  assert.equal(drug.id, "dirty-30");
  assert.equal(drug.name, "Dirty 30 (pressed M30)");
  assert.equal(drug.aliases[9], "fake perc 30");

  const card = tenthAliasCard(drug);
  assert.ok(card);
  assert.equal(card.id, "aka10-dirty-30");
  assert.equal(card.lane, "desk");
  assert.equal(card.kicker, "Tenth name");
  assert.equal(card.title, "Dirty 30 (pressed M30)");
  assert.equal(card.prompt, "Dirty 30 (pressed M30).");
  assert.equal(card.prompt.includes("fake perc 30"), false);
  assert.equal(card.ask, "Which other name is stored tenth?");
  assert.equal(card.correct, "fake perc 30");
  assert.equal(
    card.answer,
    "Dirty 30 (pressed M30) also stores fake perc 30 tenth. An alias is not a different map.",
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
  assert.ok(card.choices?.some((choice) => choice.id === "fake perc 30"));
  assert.equal(card.choices?.length, 4);
  assert.equal(/milligram|\bmg\b/i.test(`${card.ask} ${card.answer} ${card.kicker}`), false);
});

test("tenthAliasCard is null without a tenth alias", () => {
  assert.equal(tenthAliasCard(DRUG_BY_ID.buprenorphine), null);
  assert.equal(tenthAliasCard(DRUG_BY_ID.simvastatin), null);
});
