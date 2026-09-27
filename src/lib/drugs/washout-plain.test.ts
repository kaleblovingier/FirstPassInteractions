import test from "node:test";
import assert from "node:assert/strict";
import {
  WASHOUT_COACH,
  WASHOUT_EMPTY,
  WASHOUT_FOOTER,
  WASHOUT_OFFSET,
  WASHOUT_TITLE,
  washoutDaysWords,
  washoutOffsetKind,
} from "./washout-plain.ts";

const COPY = [
  WASHOUT_TITLE.plainTitle,
  WASHOUT_TITLE.scientific,
  WASHOUT_COACH.kicker,
  WASHOUT_COACH.body,
  WASHOUT_COACH.estimate,
  WASHOUT_EMPTY,
  WASHOUT_FOOTER,
  ...Object.values(WASHOUT_OFFSET).flatMap((o) => [o.tag, o.plain]),
];

test("plain title leads, half-life kept as muted science", () => {
  assert.equal(WASHOUT_TITLE.plainTitle, "How long it lingers");
  assert.match(WASHOUT_TITLE.scientific, /half-life/);
});

test("coach says teaching estimate; label and prescriber govern", () => {
  assert.match(WASHOUT_COACH.body, /lingering after the last dose/);
  assert.match(WASHOUT_COACH.estimate, /teaching estimate/i);
  assert.match(WASHOUT_COACH.estimate, /labeling and the prescriber govern/);
});

test("empty state is not a green light", () => {
  assert.match(WASHOUT_EMPTY, /not a green light/);
});

test("no doses, no safe-to-start claims, no Strong severity, no arrows", () => {
  for (const line of COPY) {
    assert.doesNotMatch(line, /\bmg\b|milligram/i, line);
    assert.doesNotMatch(line, /safe to (start|restart|resume)/i, line);
    assert.doesNotMatch(line, /\bStrong\b/, line);
    assert.doesNotMatch(line, /[→←↑↓⇒]|->/, line);
  }
});

test("offset kind only when the data distinguishes it", () => {
  assert.equal(washoutOffsetKind({ ids: ["rifampin"], days: 14, label: "" }), "inducer");
  assert.equal(washoutOffsetKind({ ids: ["efavirenz"], days: 14, label: "" }), "inducer");
  assert.equal(washoutOffsetKind({ ids: ["fluoxetine"], days: 35, label: "" }), "inhibitor");
  assert.equal(washoutOffsetKind({ ids: ["phenelzine"], days: 14, label: "" }), "maoi-irreversible");
  assert.equal(washoutOffsetKind({ ids: ["moclobemide"], days: 1, label: "" }), "maoi-reversible");
  assert.equal(washoutOffsetKind({ ids: ["unknown-thing"], days: 3, label: "" }), null);
  assert.match(WASHOUT_OFFSET.inducer.plain, /weeks/);
  assert.doesNotMatch(Object.values(WASHOUT_OFFSET).map((o) => o.plain).join(" "), /\d/);
});

test("days in words, number unchanged", () => {
  assert.equal(washoutDaysWords(35), "about 35 days");
  assert.equal(washoutDaysWords(1), "about 1 day");
});

test("every mapped washout row gets a plain offset kind", async () => {
  const { WASHOUT } = await import("./host.ts");
  for (const w of WASHOUT) {
    assert.notEqual(washoutOffsetKind(w), null, w.ids.join(","));
  }
});
