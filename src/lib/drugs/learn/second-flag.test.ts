import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DRUG_BY_ID } from "../catalog";
import { secondFlagCard } from "./second-flag";

describe("secondFlagCard", () => {
  it("asks the second PD flag for simvastatin", () => {
    const card = secondFlagCard(DRUG_BY_ID.simvastatin);
    assert.ok(card);
    assert.equal(card.correct, "hepatotoxic");
    assert.equal(card.prompt, "Simvastatin.");
  });

  it("returns null when there is no second flag", () => {
    assert.equal(secondFlagCard(DRUG_BY_ID.warfarin), null);
  });

  it("includes hepatotoxic among simvastatin choices", () => {
    const card = secondFlagCard(DRUG_BY_ID.simvastatin);
    assert.ok(card);
    assert.ok(card.choices?.some((choice) => choice.id === "hepatotoxic"));
  });
});
