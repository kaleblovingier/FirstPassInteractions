import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import { ROUNDS } from "./rounds";
import {
  STUDY_LANES,
  cardsFor,
  clinicalCards,
  type StudyLane,
} from "./study";

describe("study learning tools", () => {
  it("includes clinical lane in STUDY_LANES", () => {
    const laneIds = STUDY_LANES.map((l) => l.id);
    assert.ok(laneIds.includes("clinical" as StudyLane));
  });

  it("clinicalCards produces 24 well-formed multiple-choice cards", () => {
    const cards = clinicalCards();
    assert.equal(cards.length, 24);

    for (const card of cards) {
      assert.ok(card.id.startsWith("clin-"));
      assert.equal(card.lane, "clinical");
      assert.ok(card.title.length > 0);
      assert.ok(card.kicker.length > 0);
      assert.ok(card.prompt.length > 0);
      assert.ok(card.ask.length > 0);
      assert.ok(card.answer.length > 0);

      // Verify multiple choice format
      assert.ok(card.choices && card.choices.length >= 3);
      assert.ok(card.correct);
      const correctChoice = card.choices.find((c) => c.id === card.correct);
      assert.ok(
        correctChoice,
        `Card ${card.id} correct ID '${card.correct}' must exist in choices`,
      );

      // Verify referenced drugs exist in catalog
      for (const drugId of card.drugIds) {
        assert.ok(
          DRUG_BY_ID[drugId],
          `Drug ${drugId} in card ${card.id} must exist in catalog`,
        );
      }
    }
  });

  it("cardsFor('clinical') delegates to clinicalCards", () => {
    const cards = cardsFor("clinical", [], []);
    assert.equal(cards.length, 24);
    assert.equal(cards[0].lane, "clinical");
  });

  it("new rounds are registered in ROUNDS array with valid catalog drugs", () => {
    const expectedRoundIds = [
      "r-ward-cefepime-dialysis",
      "r-ward-vanco-zosyn-auc",
      "r-clinic-geriatric-acb-stack",
      "r-street-toxic-alcohol-gap",
      "r-ward-doac-dialysis-divergence",
      "r-ward-child-pugh-first-pass",
      "r-clinic-steroid-taper-hpa",
      "r-ward-dka-pseudohyponatremia",
      "r-ward-apap-nomogram-kings",
      "r-ward-iron-dextran-test-dose",
      "r-ward-digoxin-amiodarone-pgp",
      "r-ward-vanco-sawchuk-zaske",
      "r-ward-phenobarb-aws-kinetics",
      "r-ward-phenobarb-urine-alkalinization",
    ];

    for (const rId of expectedRoundIds) {
      const round = ROUNDS.find((r) => r.id === rId);
      assert.ok(round, `Round '${rId}' must exist in ROUNDS`);
      assert.ok(round.title.length > 0);
      assert.ok(round.stem.length > 0);
      assert.ok(round.ask.length > 0);
      assert.ok(round.teach.length > 0);
      assert.ok(round.drugIds.length > 0);

      for (const drugId of round.drugIds) {
        assert.ok(
          DRUG_BY_ID[drugId],
          `Drug '${drugId}' in round '${rId}' must exist in catalog`,
        );
      }
    }
  });

  it("study copy adheres to non-prescriptive regulatory standards", () => {
    const cards = clinicalCards();
    for (const card of cards) {
      const allText = `${card.prompt} ${card.ask} ${card.answer}`;
      assert.doesNotMatch(allText, /prescribe\s+\d+\s*mg/i);
      assert.doesNotMatch(allText, /dispense\s+\d+\s*mg/i);
      assert.doesNotMatch(allText, /clinical decision support/i);
    }
  });
});

