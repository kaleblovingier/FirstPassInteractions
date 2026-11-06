import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import { ANDEXXA_FDA_URL, ANDEXXA_REVERSAL_NOTE, MARKET_STATUS } from "./catalog-label-names";
import { ANTICOAGULANT_PROFILES, calculateAndexanetAlfaDosing } from "./anticoagulation-reversal";
import { evaluateReversal } from "./doac";
import { reversalOnDesk } from "./reversal";
import { boardsCards, clinicalCards } from "./study";
import { DOSE_PATTERN } from "../guards/dose-rule";

const NOT_SOLD = /no longer sold in the US/i;
const hasDose = (s: string) => new RegExp(DOSE_PATTERN.source).test(s);

// FDA Safety Communication, 2025-12-18: Andexxa "will no longer be manufactured for or sold in the U.S."
test("the andexanet catalog row carries the FDA market status and link", () => {
  const note = DRUG_BY_ID["andexanet-alfa"]?.note ?? "";
  assert.equal(note, MARKET_STATUS["andexanet-alfa"]);
  assert.match(note, NOT_SOLD);
  assert.match(note, /considers the risks of the product to outweigh its benefits/);
  assert.ok(note.includes(ANDEXXA_FDA_URL));
});

test("where Andexxa led reversal, the row names no replacement and no dose", () => {
  for (const id of ["apixaban", "rivaroxaban"] as const) {
    const first = ANTICOAGULANT_PROFILES[id]!.reversalOptions.firstLine;
    assert.match(first, NOT_SOLD, id);
    assert.match(first, /institution's protocol and the Prescribing Information/, id);
    assert.doesNotMatch(first, /PCC|Kcentra/, id);
    const rev = evaluateReversal(id, "major");
    assert.equal(rev.specificAntidote?.regimen, ANDEXXA_REVERSAL_NOTE, id);
    assert.ok(!hasDose(rev.headline) && !rev.immediateActions.some((a) => /Andexanet/.test(a) && !NOT_SOLD.test(a)), id);
  }
  assert.match(ANTICOAGULANT_PROFILES.edoxaban!.reversalOptions.alternativeOffLabel ?? "", NOT_SOLD);
  assert.match(calculateAndexanetAlfaDosing({ agent: "apixaban", lastDoseMg: 5, hoursSinceLastDose: 2 }).marketStatus, NOT_SOLD);
  assert.match(reversalOnDesk(["apixaban"]).map((r) => r.card.pearl).join(" "), NOT_SOLD);
});

test("study answers that teach Andexxa say it is no longer sold in the US", () => {
  const cards = [...clinicalCards(), ...boardsCards()].filter((c) => /andexanet|andexxa/i.test(c.answer));
  assert.ok(cards.length >= 3);
  for (const c of cards) assert.match(c.answer, NOT_SOLD, c.id);
});
