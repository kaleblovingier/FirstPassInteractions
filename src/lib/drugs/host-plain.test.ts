import test from "node:test";
import assert from "node:assert/strict";
import {
  AGE_PLAIN,
  ALCOHOL_PLAIN,
  ENZYME_SPEED_HELPER,
  ENZYME_SPEED_TITLE,
  HOST_COACH,
  HOST_SECTION_TITLES,
  KETAMINE_ROUTE_NOTE,
  KETAMINE_ROUTE_PLAIN,
  KIDNEY_PLAIN,
  METABOLIZER_PLAIN,
  PREG_PLAIN,
  allHostPlainCopy,
  howCommonLine,
} from "./host-plain.ts";

test("coach strip explains how the panel works and keeps the scientific title", () => {
  assert.equal(HOST_COACH.kicker, "How this works");
  assert.equal(HOST_COACH.title.plain, "About this person");
  assert.equal(HOST_COACH.title.scientific, "Host factors");
  assert.match(HOST_COACH.body, /re-reads every pair/i);
  assert.match(HOST_COACH.how, /blocks that enzyme/i);
});

test("empty state says typical or quiet is not a green light", () => {
  assert.match(HOST_COACH.empty, /not a green light/i);
  assert.match(HOST_COACH.empty, /quiet result/i);
  assert.match(HOST_COACH.empty, /clinician govern/i);
  assert.match(HOST_COACH.footer, /Teaching only/);
});

test("plain titles keep the scientific term alongside", () => {
  assert.match(ENZYME_SPEED_TITLE.scientific, /Metabolizer phenotype/);
  for (const t of Object.values(HOST_SECTION_TITLES)) {
    assert.ok(t.plain.length > 0);
    assert.ok(t.scientific.length > 0);
    assert.notEqual(t.plain, t.scientific);
  }
  assert.match(HOST_SECTION_TITLES.smoking.scientific, /CYP1A2/);
  assert.match(HOST_SECTION_TITLES.kidney.scientific, /GFR/);
});

test("button words are everyday language", () => {
  assert.deepEqual(METABOLIZER_PLAIN, { PM: "Slow", IM: "A bit slow", NM: "Typical", UM: "Fast" });
  assert.equal(ALCOHOL_PLAIN.chronic, "Heavy, long-term");
  assert.equal(KETAMINE_ROUTE_PLAIN.oral, "By mouth");
  assert.equal(AGE_PLAIN.geriatric, "Older adult");
  assert.equal(KIDNEY_PLAIN.ckd, "Filter slower");
  assert.equal(PREG_PLAIN.lactating, "Breastfeeding");
  assert.match(KETAMINE_ROUTE_NOTE, /by mouth with grapefruit/i);
});

test("frequency data passes through unchanged", () => {
  assert.equal(howCommonLine("~2–6% EUR *3/*3"), "How common: ~2–6% EUR *3/*3");
});

test("guard: no mg, no dose advice, no safe-to-start, no 'Strong', no arrows or symbols", () => {
  const copy = allHostPlainCopy();
  assert.ok(copy.length > 20);
  for (const s of copy) {
    assert.doesNotMatch(s, /\bmg\b/i, s);
    assert.doesNotMatch(s, /milligram/i, s);
    assert.doesNotMatch(s, /\bdose\b|\bdosing\b/i, s);
    assert.doesNotMatch(s, /safe to start/i, s);
    assert.doesNotMatch(s, /\bstrong\b/i, s);
    assert.doesNotMatch(s, /[→←↑↓↔⇒⇐⇔×]|->|<-|=>/, s);
  }
});

test("enzyme speed helper: a status you already know, a CPIC teaching summary, not a genetic test", () => {
  assert.match(ENZYME_SPEED_HELPER, /already know/);
  assert.match(ENZYME_SPEED_HELPER, /teaching summary of CPIC guidance/);
  assert.match(ENZYME_SPEED_HELPER, /not a genetic test result/);
  assert.match(ENZYME_SPEED_TITLE.scientific, /CPIC paraphrase/);
  assert.match(HOST_COACH.footer, /not a genetic test result/);
  assert.ok(allHostPlainCopy().includes(ENZYME_SPEED_HELPER));
});
