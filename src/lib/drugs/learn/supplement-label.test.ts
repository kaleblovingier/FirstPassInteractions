import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRUG_BY_ID } from "../catalog";
import { analyze } from "../engine";
import { ROUNDS } from "../rounds";
import { clinicalCards, cardsFor } from "../study";
import { DOSE_PATTERN } from "../../guards/dose-rule";
import { CITED_ONLY_HUB_IDS } from "../../seo/drug-hubs";
import { SEVERITY_LABEL } from "../types";
import {
  SUPPLEMENT_LABEL_IDS,
  SUPPLEMENT_LABEL_PARTNERS,
  supplementLabelCards,
} from "./supplement-label";

const WAVE3_IDS = [
  "lecanemab",
  "donanemab",
  "aficamten",
  "etripamil",
  "lerodalcibep",
  "zoliflodacin",
  "tradipitant",
];

const cards = supplementLabelCards();

test("cited-only supplement cards match the five label-named hubs", () => {
  assert.deepEqual([...SUPPLEMENT_LABEL_IDS], [...CITED_ONLY_HUB_IDS]);
  assert.equal(cards.length, SUPPLEMENT_LABEL_IDS.length);
  assert.deepEqual(
    cards.map((card) => card.drugIds[0]),
    [...SUPPLEMENT_LABEL_IDS],
  );
});

test("each card cites the stored label note and does not grade the pair", () => {
  const severityWords = [
    ...Object.keys(SEVERITY_LABEL),
    ...Object.values(SEVERITY_LABEL),
  ];
  for (const card of cards) {
    const id = card.drugIds[0]!;
    const partner = SUPPLEMENT_LABEL_PARTNERS[id as (typeof SUPPLEMENT_LABEL_IDS)[number]];
    const note = DRUG_BY_ID[id]?.note ?? "";
    assert.ok(note.length > 0, id);
    assert.equal(card.lane, "clinical");
    assert.equal(card.kicker, "Label citation");
    assert.ok(card.choices && card.choices.length >= 4, card.id);
    assert.ok(card.choices.some((choice) => choice.id === card.correct), card.id);
    assert.deepEqual(card.drugIds, [id, partner]);
    assert.ok(DRUG_BY_ID[partner], partner);
    assert.match(card.answer, new RegExp(note.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(card.answer, /does not assign a severity/);
    assert.equal(analyze([id, partner]).findings.length, 0, `${id} must stay ungraded`);

    const text = `${card.title} ${card.prompt} ${card.ask} ${card.answer} ${card.choices.map((c) => c.label).join(" ")}`;
    const dose = new RegExp(DOSE_PATTERN.source, "g");
    const doseHit = dose.exec(text);
    assert.equal(doseHit, null, `${card.id} dose hit ${doseHit?.[0] ?? ""}`);
    assert.doesNotMatch(text, /\bfree\b|\$\d|pricing|\bPro\b/i);
    assert.doesNotMatch(text, /clinical decision/i);
    for (const word of severityWords) {
      assert.equal(text.toLowerCase().includes(word.toLowerCase()), false, `${card.id} contains ${word}`);
    }
    for (const wave of WAVE3_IDS) assert.equal(card.drugIds.includes(wave), false, wave);
  }
});

test("clinical lane includes the supplement cards and rounds do not", () => {
  const clinical = clinicalCards();
  const viaLane = cardsFor("clinical", [], []);
  for (const card of cards) {
    assert.ok(clinical.some((row) => row.id === card.id), card.id);
    assert.ok(viaLane.some((row) => row.id === card.id), card.id);
    assert.equal(
      ROUNDS.some((round) => round.drugIds.some((id) => id === card.drugIds[0])),
      false,
      card.drugIds[0],
    );
  }
  assert.equal(clinical.length, viaLane.length);
});

test("supplement card module does not touch plans, stripe return, or wave3 files", () => {
  const src = readFileSync(new URL("./supplement-label.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /plans\.tsx|stripe-return|catalog-modern-wave3|rounds-wave|samples-wave/);
  assert.doesNotMatch(src, /\bPro\b/);
});
