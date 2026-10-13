import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DRUG_BY_ID } from "../catalog";
import { thirdFlagCard } from "./third-flag";

describe("thirdFlagCard", () => {
  it("asks the third PD flag for aspirin", () => {
    const card = thirdFlagCard(DRUG_BY_ID.aspirin);
    assert.ok(card);
    assert.equal(card.correct, "nephrotoxic");
    assert.equal(card.prompt, "Aspirin.");
  });

  it("returns null when there is no third flag", () => {
    assert.equal(thirdFlagCard(DRUG_BY_ID.simvastatin), null);
    assert.equal(thirdFlagCard(DRUG_BY_ID.warfarin), null);
  });

  it("includes nephrotoxic among aspirin choices", () => {
    const card = thirdFlagCard(DRUG_BY_ID.aspirin);
    assert.ok(card);
    assert.ok(card.choices?.some((choice) => choice.id === "nephrotoxic"));
  });
});
