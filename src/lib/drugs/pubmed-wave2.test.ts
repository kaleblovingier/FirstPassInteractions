/**
 * Structural checks for the wave-2 PubMed shelf, ahead of the integration step that
 * merges CITES_WAVE2 into the main CITES export. Mirrors the sanity checks the other
 * "waveN" files run on themselves (ids real, no collisions, no stray doses in copy).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CITES_WAVE2 } from "./pubmed-wave2";
import { CITES, CITE_TAGS, type CiteTag } from "./pubmed";
import { DRUG_BY_ID } from "./catalog";
import { ROUNDS_WAVE2 } from "./rounds-wave2";
import { SAMPLE_REGIMENS_WAVE2 } from "./samples-wave2";

const TARGET_IDS = [
  "medetomidine",
  "xylazine",
  "metonitazene",
  "protonitazene",
  "tapentadol",
  "suzetrigine",
  "tianeptine",
  "phenibut",
  "tirzepatide",
  "semaglutide",
  "kratom",
  "methylene-blue",
] as const;

const VALID_TAGS = new Set<CiteTag>(CITE_TAGS.map((t) => t.id).filter((id): id is CiteTag => id !== "all"));

test("wave2 cites is non-empty and every row has the shape c() produces", () => {
  assert.ok(CITES_WAVE2.length > 0, "expected at least one wave2 citation");
  for (const row of CITES_WAVE2) {
    assert.match(row.pmid, /^\d+$/, `pmid should be numeric: ${row.pmid}`);
    assert.ok(row.year >= 1990 && row.year <= 2027, `${row.pmid}: implausible year ${row.year}`);
    assert.ok(row.journal.length > 0, `${row.pmid}: empty journal`);
    assert.ok(row.title.length > 0, `${row.pmid}: empty title`);
    assert.ok(row.why.length > 0, `${row.pmid}: empty why`);
    assert.ok(row.tags.length > 0, `${row.pmid}: no tags`);
    for (const t of row.tags) assert.ok(VALID_TAGS.has(t), `${row.pmid}: unknown tag "${t}"`);
    assert.ok(row.drugIds.length > 0, `${row.pmid}: no drugIds`);
  }
});

test("wave2 drugIds all resolve to real catalog rows", () => {
  for (const row of CITES_WAVE2) {
    for (const id of row.drugIds) {
      assert.ok(DRUG_BY_ID[id], `${row.pmid}: drugId "${id}" is not on the shelf`);
    }
  }
});

test("wave2 pmids are unique within the file and do not collide with the existing shelf", () => {
  const seen = new Set<string>();
  for (const row of CITES_WAVE2) {
    assert.ok(!seen.has(row.pmid), `duplicate pmid within wave2: ${row.pmid}`);
    seen.add(row.pmid);
  }
  // Once integrated, CITES === [...original, ...CITES_WAVE2], so comparing
  // against CITES directly would just find wave2's own merged entries.
  // Exclude them by reference to rebuild the pre-merge shelf and still catch
  // a real collision against the original citations.
  const wave2Set = new Set(CITES_WAVE2);
  const existing = new Set(CITES.filter((c) => !wave2Set.has(c)).map((c) => c.pmid));
  for (const row of CITES_WAVE2) {
    assert.ok(!existing.has(row.pmid), `${row.pmid} already exists in the main CITES shelf`);
  }
});

test("every target drug that was missing coverage now has at least one wave2 citation", () => {
  const covered = new Set(CITES_WAVE2.flatMap((c) => c.drugIds));
  const missing = TARGET_IDS.filter((id) => !covered.has(id));
  assert.deepEqual(missing, [], `still uncited after wave2: ${missing.join(", ")}`);
});

test("tianeptine teaching does not present the unsourced CYP3A4 grade as a label", () => {
  const round = ROUNDS_WAVE2.find((row) => row.id === "r-tianeptine-ritonavir");
  assert.ok(round);
  assert.match(round.teach, /not a prescribing-information sentence/);
  assert.match(round.teach, /beta-oxidation/);
  assert.doesNotMatch(round.teach, /doesn't read labels/);
  assert.doesNotMatch(`${round.stem} ${round.teach}`, /\b\d+(\.\d+)?\s?(mg|mcg)\b/i);
  const sample = SAMPLE_REGIMENS_WAVE2.find((row) => row.id === "metonitazene-bromazolam");
  assert.ok(sample);
  assert.match(sample.blurb, /no FDA label of its own/);
  assert.doesNotMatch(sample.blurb, /FDA boxed-warning/);
});

test("wave2 why copy does not over-read the papers it cites", () => {
  const byPmid = new Map(CITES_WAVE2.map((row) => [row.pmid, row.why]));
  const tirz = byPmid.get("42721915") ?? "";
  assert.match(tirz, /20% to 23%/);
  assert.match(tirz, /not the same as lost contraceptive efficacy/);
  assert.doesNotMatch(tirz, /55-66%/);
  const med = byPmid.get("41668237") ?? "";
  assert.match(med, /bag-mask ventilation/);
  assert.doesNotMatch(med, /without any extra naloxone/);
  const kratom = byPmid.get("36924284") ?? "";
  assert.doesNotMatch(kratom, /single cup/);
  assert.doesNotMatch(kratom, /\b\d+(\.\d+)?\s?(mg|mcg|g)\b/i);
});

test("wave2 why copy carries no milligram doses", () => {
  for (const row of CITES_WAVE2) {
    assert.doesNotMatch(row.why, /\b\d+(\.\d+)?\s?(mg|mcg)\b/i, `${row.pmid}: dose language in why`);
  }
});

test("wave2 rows citing more than one drugId are not claiming a specific pair interaction", () => {
  for (const row of CITES_WAVE2) {
    if (row.drugIds.length > 1) assert.ok(!row.pair, `${row.pmid}: multi-drugId row should not also set pair`);
  }
});
