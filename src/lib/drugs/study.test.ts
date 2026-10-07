import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import { ROUNDS } from "./rounds";
import {
  STUDY_LANES,
  CLINICAL_TOPICS,
  CLINICAL_TOPIC_MAP,
  cardsFor,
  clinicalCards,
  type StudyLane,
  type ClinicalTopic,
} from "./study";

describe("study learning tools", () => {
  it("enzyme map asks the row words back", () => {
    const cards = cardsFor("cyp", [], []);
    const ids = ["cyp-arrow-inhibit", "cyp-arrow-induce", "cyp-arrow-prodrug", "cyp-arrow-blank", "cyp-arrow-shelf", "cyp-arrow-victim"];
    for (const id of ids) {
      const card = cards.find((c) => c.id === id);
      assert.ok(card, id);
      assert.equal(card.lane, "cyp");
      assert.ok(card.choices && card.choices.some((choice) => choice.id === card.correct));
      assert.equal(card.drugIds.length, 0);
    }
    const roles = cards.filter((c) => c.id.startsWith("cyp-CYP3A4-inhibitor-"));
    assert.ok(roles.length >= 1 && roles.length <= 3);
  });

  it("includes clinical lane in STUDY_LANES", () => {
    const laneIds = STUDY_LANES.map((l) => l.id);
    assert.ok(laneIds.includes("clinical" as StudyLane));
  });

  it("clinicalCards produces 53 well-formed multiple-choice cards", () => {
    const cards = clinicalCards();
    assert.equal(cards.length, 53);

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
    assert.equal(cards.length, 53);
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
      "r-ward-hartford-aminoglycoside-interval",
      "r-ward-aminoglycoside-ototoxicity-mt1555",
      "r-ward-gentamicin-synergy-endocarditis",
      "r-ward-lithium-extrip-dialysis-rebound",
      "r-ward-lithium-thiazide-triple-whammy",
      "r-ward-qtc-bazett-tachycardia-trap",
      "r-ward-tdp-magnesium-normal-paradox",
      "r-ward-eudka-sglt2-normal-glucose",
      "r-ward-sglt2-preop-surgical-hold",
      "r-ward-hyperkalemia-normal-ekg-dissociation",
      "r-ward-hyperkalemia-ckd-insulin-dose-reduction",
      "r-ward-valproate-vhe-normal-lft-trap",
      "r-ward-valproate-meropenem-crash",
      "r-clinic-rivaroxaban-food-bioavailability",
      "r-clinic-dabigatran-capsule-crush-hemorrhage",
      "r-mat-bup-micro-induction-bernese",
      "r-street-xylazine-resuscitation-airway",
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

  it("sub-topic categories cover all 53 clinical cards with balanced distribution", () => {
    const cards = clinicalCards();
    const topicIds = CLINICAL_TOPICS.map((t) => t.id);

    // Every card has a valid non-all topic
    for (const card of cards) {
      assert.ok(card.topic, `Card ${card.id} must have a topic defined`);
      assert.ok(topicIds.includes(card.topic), `Card ${card.id} topic ${card.topic} must be valid`);
      assert.notEqual(card.topic, "all");
    }

    // Every topic in CLINICAL_TOPICS (except 'all') has at least 4 cards
    for (const topic of CLINICAL_TOPICS) {
      if (topic.id === "all") continue;
      const count = cards.filter((c) => c.topic === topic.id).length;
      assert.ok(count >= 4, `Topic ${topic.id} has ${count} cards, expected >= 4`);
    }

    // Every key in CLINICAL_TOPIC_MAP points to an existing card
    for (const cardId of Object.keys(CLINICAL_TOPIC_MAP)) {
      const card = cards.find((c) => c.id === cardId);
      assert.ok(card, `Key ${cardId} in CLINICAL_TOPIC_MAP must exist in clinicalCards()`);
    }
  });
});

