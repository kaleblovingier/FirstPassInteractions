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

  it("clinicalCards produces 80 well-formed multiple-choice cards", () => {
    const cards = clinicalCards();
    assert.equal(cards.length, 80);

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
    assert.equal(cards.length, 80);
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
      "r-ward-dasatinib-omeprazole-ph-collapse",
      "r-clinic-gabapentin-ckd-myoclonic-coma",
      "r-icu-lithium-hctz-toxicity",
      "r-ed-digoxin-amiodarone-heart-block",
      "r-icu-sildenafil-nitroglycerin-cgmp-shock",
      "r-or-rocuronium-sugammadex-chelation",
      "r-ward-phenytoin-michaelis-menten-spill",
      "r-ed-salicylate-zero-order-acidosis",
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

  it("contains no Hälg citation and correctly cites Hämmig et al., 2016", () => {
    const cards = clinicalCards();
    const berneseCard = cards.find((c) => c.id === "clin-bup-micro-induction-bernese");
    assert.ok(berneseCard, "Bernese card must exist");
    assert.doesNotMatch(berneseCard.answer, /Hälg/i);
    assert.doesNotMatch(berneseCard.prompt, /Hälg/i);
    assert.match(berneseCard.answer, /Hämmig et al\., 2016/);

    const berneseRound = ROUNDS.find((r) => r.id === "r-mat-bup-micro-induction-bernese");
    assert.ok(berneseRound, "Bernese round must exist");
    assert.doesNotMatch(berneseRound.teach, /Hälg/i);
    assert.doesNotMatch(berneseRound.stem, /Hälg/i);
    assert.match(berneseRound.teach, /Hämmig et al\., 2016/);

    // Verify across all clinical cards and rounds that no Hälg remains
    for (const card of cards) {
      const text = `${card.title} ${card.prompt} ${card.ask} ${card.answer}`;
      assert.doesNotMatch(text, /Hälg/i, `Card ${card.id} must not contain Hälg`);
    }
    for (const round of ROUNDS) {
      const text = `${round.title} ${round.stem} ${round.ask} ${round.teach}`;
      assert.doesNotMatch(text, /Hälg/i, `Round ${round.id} must not contain Hälg`);
    }
  });

  it("addiction study cards and rounds avoid prescriptive milligram numbers and stay educational", () => {
    const addictionCardIds = [
      "clin-bup-precip-pharmacology",
      "clin-fentanyl-adipose-depot-kinetics",
      "clin-naloxone-half-life-renarcotization",
      "clin-methadone-cyp-qtc-safety",
      "clin-naltrexone-washout-window",
      "clin-xylazine-tranq-management",
      "clin-alcohol-withdrawal-ciwa-gaba",
      "clin-bup-micro-induction-bernese",
    ];
    const cards = clinicalCards();
    for (const id of addictionCardIds) {
      const card = cards.find((c) => c.id === id);
      assert.ok(card, `Card ${id} must exist`);
      const allText = `${card.prompt} ${card.ask} ${card.answer} ${card.choices?.map((c) => c.label).join(" ") ?? ""}`;
      assert.doesNotMatch(allText, /0\.5\s*mg/i, `Card ${id} should not specify 0.5 mg`);
      assert.doesNotMatch(allText, /8\s*[-–]\s*16\s*mg/i, `Card ${id} should not specify 8-16 mg`);
      assert.doesNotMatch(allText, /16\s*mg\s+total/i, `Card ${id} should not specify 16 mg total`);
      assert.doesNotMatch(allText, /\b2\s*mg\s+intranasal\s+naloxone/i, `Card ${id} should not specify 2 mg intranasal naloxone`);
      assert.doesNotMatch(allText, /\b50\s*mg\b/i, `Card ${id} should not specify 50 mg`);
      assert.doesNotMatch(allText, /\b10\s*mg\/hr\b/i, `Card ${id} should not specify 10 mg/hr`);
    }

    const addictionRoundIds = [
      "r-mat-bup-micro-induction-bernese",
      "r-street-xylazine-resuscitation-airway",
    ];
    for (const rId of addictionRoundIds) {
      const round = ROUNDS.find((r) => r.id === rId);
      assert.ok(round, `Round ${rId} must exist`);
      const text = `${round.stem} ${round.ask} ${round.teach}`;
      assert.doesNotMatch(text, /0\.5\s*mg/i, `Round ${rId} should not specify 0.5 mg`);
      assert.doesNotMatch(text, /8\s*[-–]\s*16\s*mg/i, `Round ${rId} should not specify 8-16 mg`);
      assert.doesNotMatch(text, /16\s*mg\s+total/i, `Round ${rId} should not specify 16 mg total`);
    }
  });

  it("sub-topic categories cover all 80 clinical cards with balanced distribution", () => {
    const cards = clinicalCards();
    const topicIds = CLINICAL_TOPICS.map((t) => t.id);

    // Every card has a valid non-all topic
    for (const card of cards) {
      assert.ok(card.topic, `Card ${card.id} must have a topic defined`);
      assert.ok(topicIds.includes(card.topic), `Card ${card.id} topic ${card.topic} must be valid`);
      assert.notEqual(card.topic, "all");
    }

    // Every topic in CLINICAL_TOPICS (except 'all') has at least 1 card
    for (const topic of CLINICAL_TOPICS) {
      if (topic.id === "all") continue;
      const count = cards.filter((c) => c.topic === topic.id).length;
      assert.ok(count >= 1, `Topic ${topic.id} has ${count} cards, expected >= 1`);
    }

    // Every key in CLINICAL_TOPIC_MAP points to an existing card
    for (const cardId of Object.keys(CLINICAL_TOPIC_MAP)) {
      const card = cards.find((c) => c.id === cardId);
      assert.ok(card, `Key ${cardId} in CLINICAL_TOPIC_MAP must exist in clinicalCards()`);
    }
  });

  it("new clinical cards and rounds maintain strict educational and non-prescriptive posture", () => {
    const newCardIds = [
      "clin-renal-gabapentinoid-myoclonus",
      "clin-beers-anticholinergic-fall-fracture",
      "clin-dasatinib-ppi-gastric-ph",
      "clin-ss-vs-nms-differentials",
      "clin-hd-dialyzability-factors",
      "clin-qtc-hypokalemia-herg-blockade",
    ];
    const cards = clinicalCards();
    for (const id of newCardIds) {
      const card = cards.find((c) => c.id === id);
      assert.ok(card, `New card '${id}' must exist in clinicalCards()`);
      assert.ok(card.choices && card.choices.length >= 4, `Card '${id}' must have at least 4 choices`);
      assert.ok(card.correct, `Card '${id}' must define a correct choice`);
      const correctChoice = card.choices?.find((c) => c.id === card.correct);
      assert.ok(correctChoice, `Card '${id}' correct choice must exist in choices`);
      assert.ok(card.drugIds.length > 0, `Card '${id}' must reference drugIds`);
      for (const drugId of card.drugIds) {
        assert.ok(DRUG_BY_ID[drugId], `Drug '${drugId}' in card '${id}' must exist in catalog`);
      }
      assert.equal(card.topic, CLINICAL_TOPIC_MAP[id], `Card '${id}' topic must match CLINICAL_TOPIC_MAP`);

      const text = `${card.prompt} ${card.ask} ${card.answer} ${card.choices?.map((c) => c.label).join(" ") ?? ""}`;
      assert.doesNotMatch(text, /prescribe\s+\d+\s*mg/i);
      assert.doesNotMatch(text, /dispense\s+\d+\s*mg/i);
      assert.doesNotMatch(text, /clinical decision support/i);
    }

    // Verify key citations are present in the new cards
    const gabaCard = cards.find((c) => c.id === "clin-renal-gabapentinoid-myoclonus")!;
    assert.match(gabaCard.answer, /KDIGO/);
    assert.match(gabaCard.answer, /FDA labeling/);

    const beersCard = cards.find((c) => c.id === "clin-beers-anticholinergic-fall-fracture")!;
    assert.match(beersCard.prompt + beersCard.answer, /2023.*Beers/i);

    const dasatCard = cards.find((c) => c.id === "clin-dasatinib-ppi-gastric-ph")!;
    assert.match(dasatCard.answer, /FDA labeling/);

    const hunterCard = cards.find((c) => c.id === "clin-ss-vs-nms-differentials")!;
    assert.match(hunterCard.prompt + hunterCard.answer, /Hunter/i);

    const hdCard = cards.find((c) => c.id === "clin-hd-dialyzability-factors")!;
    assert.match(hdCard.answer, /Molecular Weight/i);
    assert.match(hdCard.answer, /Protein Binding/i);
    assert.match(hdCard.answer, /Volume of Distribution/i);
    assert.match(hdCard.answer, /Water Solubility/i);

    const qtcCard = cards.find((c) => c.id === "clin-qtc-hypokalemia-herg-blockade")!;
    assert.match(qtcCard.answer, /hERG/i);
    assert.match(qtcCard.answer, /IKr/);

    const newRoundIds = [
      "r-ward-dasatinib-omeprazole-ph-collapse",
      "r-clinic-gabapentin-ckd-myoclonic-coma",
    ];
    for (const rId of newRoundIds) {
      const round = ROUNDS.find((r) => r.id === rId);
      assert.ok(round, `New round '${rId}' must exist in ROUNDS`);
      const text = `${round.stem} ${round.ask} ${round.teach}`;
      assert.doesNotMatch(text, /prescribe\s+\d+\s*mg/i);
      assert.doesNotMatch(text, /dispense\s+\d+\s*mg/i);
      assert.doesNotMatch(text, /clinical decision support/i);
    }
  });

  it("high-yield clinical cards expand to 65 and verify non-prescriptive regulatory posture", () => {
    const highYieldCardIds = [
      "clin-lithium-hctz-nsaid-clearance",
      "clin-digoxin-amiodarone-pgp",
      "clin-doac-reversal-mechanisms",
      "clin-warfarin-bactrim-cyp2c9",
      "clin-linezolid-ssri-maoi",
      "clin-methadone-fluconazole-qtc-3a4",
    ];
    const cards = clinicalCards();
    assert.equal(cards.length, 80, "Total clinical cards must be exactly 80");

    for (const id of highYieldCardIds) {
      const card = cards.find((c) => c.id === id);
      assert.ok(card, `High-yield card '${id}' must exist in clinicalCards()`);
      assert.equal(card.lane, "clinical");
      assert.ok(card.choices && card.choices.length >= 4, `Card '${id}' must have at least 4 choices`);
      assert.ok(card.correct, `Card '${id}' must define a correct choice`);
      const correctChoice = card.choices?.find((c) => c.id === card.correct);
      assert.ok(correctChoice, `Card '${id}' correct choice must exist in choices`);
      assert.ok(card.drugIds.length > 0, `Card '${id}' must reference drugIds`);
      for (const drugId of card.drugIds) {
        assert.ok(DRUG_BY_ID[drugId], `Drug '${drugId}' in card '${id}' must exist in catalog`);
      }
      assert.equal(card.topic, CLINICAL_TOPIC_MAP[id], `Card '${id}' topic must match CLINICAL_TOPIC_MAP`);

      const text = `${card.title} ${card.prompt} ${card.ask} ${card.answer} ${card.choices?.map((c) => c.label).join(" ") ?? ""}`;
      assert.doesNotMatch(text, /prescribe\s+\d+\s*mg/i, `Card '${id}' must not contain prescriptive text`);
      assert.doesNotMatch(text, /dispense\s+\d+\s*mg/i, `Card '${id}' must not contain dispensing text`);
      assert.doesNotMatch(text, /clinical decision support/i, `Card '${id}' must not claim to be CDS`);
    }

    // Check specific mechanisms and literature citations
    const lithiumCard = cards.find((c) => c.id === "clin-lithium-hctz-nsaid-clearance")!;
    assert.equal(lithiumCard.topic, "electrolytes");
    assert.match(lithiumCard.answer, /NHE3/);
    assert.match(lithiumCard.answer, /proximal/i);
    assert.match(lithiumCard.answer, /prostaglandin/i);

    const digAmiodCard = cards.find((c) => c.id === "clin-digoxin-amiodarone-pgp")!;
    assert.equal(digAmiodCard.topic, "cardio");
    assert.match(digAmiodCard.answer, /P-glycoprotein|P-gp/i);
    assert.match(digAmiodCard.answer, /AV\s+node|atrioventricular/i);
    assert.match(digAmiodCard.answer, /xanthopsia/i);

    const doacCard = cards.find((c) => c.id === "clin-doac-reversal-mechanisms")!;
    assert.equal(doacCard.topic, "bedside");
    assert.match(doacCard.answer, /Idarucizumab/i);
    assert.match(doacCard.answer, /Fab\s+fragment/i);
    assert.match(doacCard.answer, /Andexanet\s+alfa/i);
    assert.match(doacCard.answer, /decoy/i);

    const warfCard = cards.find((c) => c.id === "clin-warfarin-bactrim-cyp2c9")!;
    assert.equal(warfCard.topic, "cyp");
    assert.match(warfCard.answer, /CYP2C9/);
    assert.match(warfCard.answer, /\(S\)-warfarin/);
    assert.match(warfCard.answer, /enantiomer/i);

    const linezolidCard = cards.find((c) => c.id === "clin-linezolid-ssri-maoi")!;
    assert.equal(linezolidCard.topic, "tox");
    assert.match(linezolidCard.answer, /monoamine\s+oxidase|MAO/i);
    assert.match(linezolidCard.answer, /serotonin\s+syndrome/i);
    assert.match(linezolidCard.answer, /Hunter/i);

    const methadoneCard = cards.find((c) => c.id === "clin-methadone-fluconazole-qtc-3a4")!;
    assert.equal(methadoneCard.topic, "cardio");
    assert.match(methadoneCard.answer, /CYP3A4/);
    assert.match(methadoneCard.answer, /hERG|IKr/);
    assert.match(methadoneCard.answer, /Torsades/i);

    // Verify the two new clinical case rounds
    const lithiumRound = ROUNDS.find((r) => r.id === "r-icu-lithium-hctz-toxicity");
    assert.ok(lithiumRound, "Round 'r-icu-lithium-hctz-toxicity' must exist");
    assert.equal(lithiumRound.setting, "ward");
    assert.equal(lithiumRound.title, "The bipolar stabilizer and the added thiazide");
    assert.ok(lithiumRound.drugIds.includes("lithium"));
    assert.ok(lithiumRound.drugIds.includes("hydrochlorothiazide") || lithiumRound.drugIds.includes("hctz"));
    assert.match(lithiumRound.teach, /NHE3/);
    assert.match(lithiumRound.teach, /proximal/i);
    const lithiumRoundText = `${lithiumRound.stem} ${lithiumRound.ask} ${lithiumRound.teach}`;
    assert.doesNotMatch(lithiumRoundText, /prescribe\s+\d+\s*mg/i);
    assert.doesNotMatch(lithiumRoundText, /dispense\s+\d+\s*mg/i);
    assert.doesNotMatch(lithiumRoundText, /clinical decision support/i);

    const digAmiodRound = ROUNDS.find((r) => r.id === "r-ed-digoxin-amiodarone-heart-block");
    assert.ok(digAmiodRound, "Round 'r-ed-digoxin-amiodarone-heart-block' must exist");
    assert.equal(digAmiodRound.setting, "clinic");
    assert.equal(digAmiodRound.title, "The atrial fibrillation rate control collision");
    assert.deepEqual(digAmiodRound.drugIds, ["digoxin", "amiodarone"]);
    assert.match(digAmiodRound.teach, /P-glycoprotein|P-gp/i);
    assert.match(digAmiodRound.teach, /AV\s+node|atrioventricular/i);
    assert.match(digAmiodRound.teach, /xanthopsia/i);
    const digAmiodRoundText = `${digAmiodRound.stem} ${digAmiodRound.ask} ${digAmiodRound.teach}`;
    assert.doesNotMatch(digAmiodRoundText, /prescribe\s+\d+\s*mg/i);
    assert.doesNotMatch(digAmiodRoundText, /dispense\s+\d+\s*mg/i);
    assert.doesNotMatch(digAmiodRoundText, /clinical decision support/i);
  });

  it("new clinical mechanism cards expand clinicalCards to 72 and verify non-prescriptive regulatory posture", () => {
    const new7CardIds = [
      "clin-sugammadex-cyclodextrin-chelation",
      "clin-ivabradine-if-hcn-channel",
      "clin-sildenafil-nitrate-cgmp-shock",
      "clin-sacubitril-neprilysin-angioedema",
      "clin-sglt2-tubuloglomerular-feedback",
      "clin-vmat2-vesicular-depletion",
      "clin-aspirin-platelet-covalent-acetylation",
    ];
    const cards = clinicalCards();
    assert.equal(cards.length, 80, "Total clinical cards must be exactly 80");

    for (const id of new7CardIds) {
      const card = cards.find((c) => c.id === id);
      assert.ok(card, `Card '${id}' must exist in clinicalCards()`);
      assert.equal(card.lane, "clinical");
      assert.ok(card.choices && card.choices.length >= 4, `Card '${id}' must have at least 4 choices`);
      assert.ok(card.correct, `Card '${id}' must define a correct choice`);
      const correctChoice = card.choices?.find((c) => c.id === card.correct);
      assert.ok(correctChoice, `Card '${id}' correct choice must exist in choices`);
      assert.ok(card.drugIds.length > 0, `Card '${id}' must reference drugIds`);
      for (const drugId of card.drugIds) {
        assert.ok(DRUG_BY_ID[drugId], `Drug '${drugId}' in card '${id}' must exist in catalog`);
      }
      assert.equal(card.topic, CLINICAL_TOPIC_MAP[id], `Card '${id}' topic must match CLINICAL_TOPIC_MAP`);

      const text = `${card.title} ${card.prompt} ${card.ask} ${card.answer} ${card.choices?.map((c) => c.label).join(" ") ?? ""}`;
      assert.doesNotMatch(text, /prescribe\s+\d+\s*mg/i, `Card '${id}' must not contain prescriptive text`);
      assert.doesNotMatch(text, /dispense\s+\d+\s*mg/i, `Card '${id}' must not contain dispensing text`);
      assert.doesNotMatch(text, /clinical decision support/i, `Card '${id}' must not claim to be CDS`);
    }

    // Verify specific mechanism assertions
    const sugCard = cards.find((c) => c.id === "clin-sugammadex-cyclodextrin-chelation")!;
    assert.equal(sugCard.topic, "bedside");
    assert.match(sugCard.answer, /cyclodextrin/i);
    assert.match(sugCard.answer, /guest-host|inclusion complex/i);
    assert.match(sugCard.answer, /rocuronium/i);
    assert.match(sugCard.answer, /acetylcholinesterase/i);

    const ivaCard = cards.find((c) => c.id === "clin-ivabradine-if-hcn-channel")!;
    assert.equal(ivaCard.topic, "cardio");
    assert.match(ivaCard.answer, /HCN/);
    assert.match(ivaCard.answer, /funny/i);
    assert.match(ivaCard.answer, /sinoatrial|SA node/i);
    assert.match(ivaCard.answer, /inotropy|contractility/i);

    const silCard = cards.find((c) => c.id === "clin-sildenafil-nitrate-cgmp-shock")!;
    assert.equal(silCard.topic, "cardio");
    assert.match(silCard.answer, /PDE-5/);
    assert.match(silCard.answer, /cGMP/);
    assert.match(silCard.answer, /guanylyl cyclase/i);
    assert.match(silCard.answer, /vasodilation|shock/i);

    const sacCard = cards.find((c) => c.id === "clin-sacubitril-neprilysin-angioedema")!;
    assert.equal(sacCard.topic, "cardio");
    assert.match(sacCard.answer, /neprilysin/i);
    assert.match(sacCard.answer, /bradykinin/i);
    assert.match(sacCard.answer, /angioedema/i);
    assert.match(sacCard.answer, /36-hour washout/i);

    const sgltCard = cards.find((c) => c.id === "clin-sglt2-tubuloglomerular-feedback")!;
    assert.equal(sgltCard.topic, "electrolytes");
    assert.match(sgltCard.answer, /macula densa/i);
    assert.match(sgltCard.answer, /tubuloglomerular feedback/i);
    assert.match(sgltCard.answer, /afferent/i);

    const vmatCard = cards.find((c) => c.id === "clin-vmat2-vesicular-depletion")!;
    assert.equal(vmatCard.topic, "neuro");
    assert.match(vmatCard.answer, /VMAT2/);
    assert.match(vmatCard.answer, /presynaptic/i);
    assert.match(vmatCard.answer, /dopamine/i);
    assert.match(vmatCard.answer, /tardive dyskinesia/i);

    const aspCard = cards.find((c) => c.id === "clin-aspirin-platelet-covalent-acetylation")!;
    assert.equal(aspCard.topic, "bedside");
    assert.match(aspCard.answer, /Serine 529|Ser529/i);
    assert.match(aspCard.answer, /COX-1/);
    assert.match(aspCard.answer, /thromboxane/i);
    assert.match(aspCard.answer, /anucleate/i);

    // Verify the two new clinical rounds
    const silRound = ROUNDS.find((r) => r.id === "r-icu-sildenafil-nitroglycerin-cgmp-shock");
    assert.ok(silRound, "Round 'r-icu-sildenafil-nitroglycerin-cgmp-shock' must exist");
    assert.equal(silRound.setting, "ward");
    assert.equal(silRound.lane, "clinic");
    assert.deepEqual(silRound.drugIds, ["sildenafil", "nitroglycerin"]);
    assert.match(silRound.teach, /cGMP/);
    assert.match(silRound.teach, /guanylyl cyclase/i);
    assert.match(silRound.teach, /PDE-5/);
    const silRoundText = `${silRound.stem} ${silRound.ask} ${silRound.teach}`;
    assert.doesNotMatch(silRoundText, /prescribe\s+\d+\s*mg/i);
    assert.doesNotMatch(silRoundText, /dispense\s+\d+\s*mg/i);
    assert.doesNotMatch(silRoundText, /clinical decision support/i);

    const rocRound = ROUNDS.find((r) => r.id === "r-or-rocuronium-sugammadex-chelation");
    assert.ok(rocRound, "Round 'r-or-rocuronium-sugammadex-chelation' must exist");
    assert.equal(rocRound.setting, "ward");
    assert.equal(rocRound.lane, "clinic");
    assert.deepEqual(rocRound.drugIds, ["rocuronium", "sugammadex"]);
    assert.match(rocRound.teach, /cyclodextrin/i);
    assert.match(rocRound.teach, /1:1/);
    assert.match(rocRound.teach, /rocuronium/i);
    assert.match(rocRound.teach, /muscarinic|bradycardia/i);
    const rocRoundText = `${rocRound.stem} ${rocRound.ask} ${rocRound.teach}`;
    assert.doesNotMatch(rocRoundText, /prescribe\s+\d+\s*mg/i);
    assert.doesNotMatch(rocRoundText, /dispense\s+\d+\s*mg/i);
    assert.doesNotMatch(rocRoundText, /clinical decision support/i);
  });

  it("high-yield mechanism cards expand clinicalCards to 80 and verify non-prescriptive regulatory posture", () => {
    const new8CardIds = [
      "clin-phenytoin-michaelis-menten",
      "clin-vd-dialysis-clearance",
      "clin-steroid-nuclear-receptor-transactivation",
      "clin-aspirin-zero-order-salicylate",
      "clin-anticholinergic-hyperthermia",
      "clin-gaba-a-subtypes-sedation-anxiolysis",
      "clin-amiodarone-thyroid-mechanisms",
      "clin-sglt2-ketogenesis-glucagon",
    ];
    const cards = clinicalCards();
    assert.equal(cards.length, 80, "Total clinical cards must be exactly 80");

    for (const id of new8CardIds) {
      const card = cards.find((c) => c.id === id);
      assert.ok(card, `Card '${id}' must exist in clinicalCards()`);
      assert.equal(card.lane, "clinical");
      assert.ok(card.choices && card.choices.length >= 4, `Card '${id}' must have at least 4 choices`);
      assert.ok(card.correct, `Card '${id}' must define a correct choice`);
      const correctChoice = card.choices?.find((c) => c.id === card.correct);
      assert.ok(correctChoice, `Card '${id}' correct choice must exist in choices`);
      assert.ok(card.drugIds.length > 0, `Card '${id}' must reference drugIds`);
      for (const drugId of card.drugIds) {
        assert.ok(DRUG_BY_ID[drugId], `Drug '${drugId}' in card '${id}' must exist in catalog`);
      }
      assert.equal(card.topic, CLINICAL_TOPIC_MAP[id], `Card '${id}' topic must match CLINICAL_TOPIC_MAP`);

      const text = `${card.title} ${card.prompt} ${card.ask} ${card.answer} ${card.choices?.map((c) => c.label).join(" ") ?? ""}`;
      assert.doesNotMatch(text, /prescribe\s+\d+\s*mg/i, `Card '${id}' must not contain prescriptive text`);
      assert.doesNotMatch(text, /dispense\s+\d+\s*mg/i, `Card '${id}' must not contain dispensing text`);
      assert.doesNotMatch(text, /clinical decision support/i, `Card '${id}' must not claim to be CDS`);
    }

    // Verify card 1: phenytoin Michaelis-Menten
    const phenCard = cards.find((c) => c.id === "clin-phenytoin-michaelis-menten")!;
    assert.equal(phenCard.topic, "cyp");
    assert.match(phenCard.answer, /Michaelis-Menten/i);
    assert.match(phenCard.answer, /CYP2C9/);
    assert.match(phenCard.answer, /Vmax/);
    assert.match(phenCard.answer, /Km/);
    assert.match(phenCard.answer, /zero-order/i);
    assert.match(phenCard.answer, /exponential/i);

    // Verify card 2: Vd dialysis clearance
    const vdCard = cards.find((c) => c.id === "clin-vd-dialysis-clearance")!;
    assert.equal(vdCard.topic, "electrolytes");
    assert.match(vdCard.answer, /volume of distribution|Vd/i);
    assert.match(vdCard.answer, /hemodialysis/i);
    assert.match(vdCard.answer, /digoxin/i);
    assert.match(vdCard.answer, /amitriptyline/i);
    assert.match(vdCard.answer, /amiodarone/i);
    assert.match(vdCard.answer, /EXTRIP/i);

    // Verify card 3: steroid nuclear receptor
    const sterCard = cards.find((c) => c.id === "clin-steroid-nuclear-receptor-transactivation")!;
    assert.equal(sterCard.topic, "bedside");
    assert.match(sterCard.answer, /Hsp90/);
    assert.match(sterCard.answer, /transactivation/i);
    assert.match(sterCard.answer, /transrepression/i);
    assert.match(sterCard.answer, /Glucocorticoid Response Elements|GRE/i);
    assert.match(sterCard.answer, /NF-κB|NF-kB/i);
    assert.match(sterCard.answer, /AP-1/);

    // Verify card 4: aspirin zero order salicylate
    const aspZeroCard = cards.find((c) => c.id === "clin-aspirin-zero-order-salicylate")!;
    assert.equal(aspZeroCard.topic, "tox");
    assert.match(aspZeroCard.answer, /glycine/i);
    assert.match(aspZeroCard.answer, /salicyluric/i);
    assert.match(aspZeroCard.answer, /zero-order/i);
    assert.match(aspZeroCard.answer, /alkaliniz/i);

    // Verify card 5: anticholinergic hyperthermia
    const antiCard = cards.find((c) => c.id === "clin-anticholinergic-hyperthermia")!;
    assert.equal(antiCard.topic, "tox");
    assert.match(antiCard.answer, /M3|muscarinic/i);
    assert.match(antiCard.answer, /anhidrosis/i);
    assert.match(antiCard.answer, /sweat/i);
    assert.match(antiCard.answer, /cooling/i);

    // Verify card 6: GABA-A subtypes
    const gabaCard = cards.find((c) => c.id === "clin-gaba-a-subtypes-sedation-anxiolysis")!;
    assert.equal(gabaCard.topic, "neuro");
    assert.match(gabaCard.answer, /α1|alpha-1/i);
    assert.match(gabaCard.answer, /α2|alpha-2/i);
    assert.match(gabaCard.answer, /sedat/i);
    assert.match(gabaCard.answer, /anxioly/i);
    assert.match(gabaCard.answer, /zolpidem/i);

    // Verify card 7: amiodarone thyroid
    const amiodCard = cards.find((c) => c.id === "clin-amiodarone-thyroid-mechanisms")!;
    assert.equal(amiodCard.topic, "cardio");
    assert.match(amiodCard.answer, /37%|iodine/i);
    assert.match(amiodCard.answer, /5'-deiodinase|deiodinase/i);
    assert.match(amiodCard.answer, /AIT-1/);
    assert.match(amiodCard.answer, /AIT-2/);

    // Verify card 8: SGLT2 ketogenesis glucagon
    const sgltKetoCard = cards.find((c) => c.id === "clin-sglt2-ketogenesis-glucagon")!;
    assert.equal(sgltKetoCard.topic, "electrolytes");
    assert.match(sgltKetoCard.answer, /glucagon/i);
    assert.match(sgltKetoCard.answer, /insulin/i);
    assert.match(sgltKetoCard.answer, /CPT-1|carnitine palmitoyltransferase/i);
    assert.match(sgltKetoCard.answer, /euglycemic/i);

    // Verify the two new clinical rounds
    const phenRound = ROUNDS.find((r) => r.id === "r-ward-phenytoin-michaelis-menten-spill");
    assert.ok(phenRound, "Round 'r-ward-phenytoin-michaelis-menten-spill' must exist");
    assert.equal(phenRound.setting, "ward");
    assert.equal(phenRound.lane, "clinic");
    assert.deepEqual(phenRound.drugIds, ["phenytoin", "valproate"]);
    assert.match(phenRound.teach, /Michaelis-Menten/i);
    assert.match(phenRound.teach, /CYP2C9/);
    assert.match(phenRound.teach, /Vmax/);
    assert.match(phenRound.teach, /zero-order/i);
    assert.match(phenRound.teach, /exponential/i);
    const phenRoundText = `${phenRound.stem} ${phenRound.ask} ${phenRound.teach}`;
    assert.doesNotMatch(phenRoundText, /prescribe\s+\d+\s*mg/i);
    assert.doesNotMatch(phenRoundText, /dispense\s+\d+\s*mg/i);
    assert.doesNotMatch(phenRoundText, /clinical decision support/i);

    const salRound = ROUNDS.find((r) => r.id === "r-ed-salicylate-zero-order-acidosis");
    assert.ok(salRound, "Round 'r-ed-salicylate-zero-order-acidosis' must exist");
    assert.equal(salRound.setting, "clinic");
    assert.equal(salRound.lane, "clinic");
    assert.deepEqual(salRound.drugIds, ["aspirin", "sodium-bicarbonate"]);
    assert.match(salRound.teach, /zero-order/i);
    assert.match(salRound.teach, /glycine/i);
    assert.match(salRound.teach, /alkaliniz/i);
    assert.match(salRound.teach, /ion trapping|ionized/i);
    const salRoundText = `${salRound.stem} ${salRound.ask} ${salRound.teach}`;
    assert.doesNotMatch(salRoundText, /prescribe\s+\d+\s*mg/i);
    assert.doesNotMatch(salRoundText, /dispense\s+\d+\s*mg/i);
    assert.doesNotMatch(salRoundText, /clinical decision support/i);
  });
});


