import test from "node:test";
import assert from "node:assert/strict";
import {
  ATLAS_COACH,
  ATLAS_COLUMN,
  ATLAS_COLUMN_EMPTY,
  ATLAS_ENZYME_PLAIN,
  ATLAS_FDA_INDEX,
  ATLAS_FOOTER,
  ATLAS_TITLE,
} from "./atlas-plain.ts";
import { ENZYMES } from "./types.ts";

const COPY = [
  ATLAS_TITLE.plainTitle,
  ATLAS_TITLE.scientific,
  ATLAS_COACH.kicker,
  ATLAS_COACH.body,
  ATLAS_COACH.estimate,
  ATLAS_FDA_INDEX.tag,
  ATLAS_FDA_INDEX.gloss,
  ATLAS_COLUMN_EMPTY,
  ATLAS_FOOTER,
  ...Object.values(ATLAS_ENZYME_PLAIN).flatMap((e) => [e.nickname, e.blurb]),
  ...Object.values(ATLAS_COLUMN).flatMap((c) => [c.title, c.scientific, c.hint, c.tag]),
];

test("plain title leads, enzyme atlas kept as muted science", () => {
  assert.equal(ATLAS_TITLE.plainTitle, "Liver enzyme map");
  assert.match(ATLAS_TITLE.scientific, /Enzyme atlas/);
  assert.match(ATLAS_TITLE.scientific, /CYP450/);
});

test("coach explains the three lists; label and prescriber govern", () => {
  assert.equal(ATLAS_COACH.kicker, "How this works");
  assert.match(ATLAS_COACH.body, /build up/);
  assert.match(ATLAS_COACH.body, /wear off/);
  assert.match(ATLAS_COACH.estimate, /labeling and the prescriber govern/);
  assert.match(ATLAS_FOOTER, /Prescribing Information/);
});

test("every pathway has a plain nickname and blurb", () => {
  for (const e of ENZYMES) {
    assert.ok(ATLAS_ENZYME_PLAIN[e], e);
    assert.ok(ATLAS_ENZYME_PLAIN[e].nickname.length > 0, e);
    assert.ok(ATLAS_ENZYME_PLAIN[e].blurb.length > 20, e);
  }
});

test("columns: plain title first, science term muted, word tags not letter codes", () => {
  assert.equal(ATLAS_COLUMN.substrate.scientific, "Substrates");
  assert.equal(ATLAS_COLUMN.inhibitor.scientific, "Inhibitors");
  assert.equal(ATLAS_COLUMN.inducer.scientific, "Inducers");
  for (const c of Object.values(ATLAS_COLUMN)) {
    assert.ok(c.tag.length > 3, c.tag);
    assert.doesNotMatch(c.tag, /^[A-Z]{1,3}$/);
  }
  assert.match(ATLAS_FDA_INDEX.gloss, /textbook example/);
});

test("empty list is not a green light", () => {
  assert.match(ATLAS_COLUMN_EMPTY, /not a green light/);
});

test("no doses, no safe-to-start claims, no Strong severity, no arrows", () => {
  for (const line of COPY) {
    assert.doesNotMatch(line, /\bmg\b|milligram/i, line);
    assert.doesNotMatch(line, /safe to (start|restart|resume)/i, line);
    assert.doesNotMatch(line, /\bStrong\b/, line);
    // "strong" only allowed as the FDA class, e.g. "strong (FDA class) inhibitor".
    assert.doesNotMatch(line, /\bstrong\b(?! \(FDA class\))/i, line);
    assert.doesNotMatch(line, /[→←↑↓⇒]|->/, line);
  }
});
