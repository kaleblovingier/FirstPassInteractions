/**
 * Offline check of the citation shelf against the snapshot scripts/verify-pmids.ts last fetched.
 * Nothing here touches the network. A new or changed citation fails until someone runs:
 *   npx --no-install tsx scripts/verify-pmids.ts --write
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CITES } from "./pubmed";
import snapshot from "./reference/pmid-snapshot.json";
import { collectInlinePmids, normalizeText, type SnapshotRow } from "../../../scripts/verify-pmids.ts";

const rows: SnapshotRow[] = snapshot;
const byPmid = new Map(rows.map((r) => [r.pmid, r]));
const inline = collectInlinePmids();

test("every curated citation has a snapshot row with the same year, journal and title", () => {
  for (const c of CITES) {
    const row = byPmid.get(c.pmid);
    assert.ok(row, `PMID ${c.pmid} has no snapshot row; run scripts/verify-pmids.ts --write`);
    assert.equal(c.year, row.year, `PMID ${c.pmid} year`);
    assert.equal(normalizeText(c.journal), normalizeText(row.journal), `PMID ${c.pmid} journal`);
    assert.equal(normalizeText(c.title), normalizeText(row.title), `PMID ${c.pmid} title`);
  }
});

test("every PMID written into source has a snapshot row", () => {
  assert.ok(inline.size > 0, "the source scan found no PMIDs");
  for (const [pmid, where] of inline) assert.ok(byPmid.has(pmid), `PMID ${pmid} at ${where} has no snapshot row`);
});

test("one curated row per paper, and every snapshot row is still cited", () => {
  const curated = CITES.map((c) => c.pmid);
  assert.equal(new Set(curated).size, curated.length, "a PMID appears twice on the curated shelf");
  const cited = new Set([...curated, ...inline.keys()]);
  for (const r of rows) {
    assert.ok(cited.has(r.pmid), `snapshot row ${r.pmid} is no longer cited`);
    assert.match(r.checked, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("the source scan reads every way a PMID is written", () => {
  assert.ok(inline.get("27441996")?.startsWith("src/lib/learn/glossary.ts"), "PMID in a glossary string");
  assert.ok(inline.get("38078585")?.startsWith("src/lib/drugs/glycemic-kinetics.ts"), 'pmid: "..." field');
  assert.ok(inline.has("11752357"), "PMID in clinical copy");
});
