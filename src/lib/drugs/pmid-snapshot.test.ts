/**
 * Offline check of the citation shelf against the snapshot scripts/verify-pmids.ts last fetched.
 * Nothing here touches the network. A new or changed citation fails until someone runs:
 *   npx --no-install tsx scripts/verify-pmids.ts --write
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CITES } from "./pubmed";
import snapshot from "./reference/pmid-snapshot.json";
import { collectInlineCitations, normalizeText, type SnapshotRow } from "../../../scripts/verify-pmids.ts";

const rows: SnapshotRow[] = snapshot;
const byPmid = new Map(rows.map((r) => [r.pmid, r]));
const citations = collectInlineCitations();
const inline = new Map([...citations].map(([pmid, c]) => [pmid, c.where]));

/** Every journal the snapshot knows, normalized for comparison. */
const knownJournals = new Set(rows.map((r) => normalizeText(r.journal)));

/**
 * The journal slot of a formal citation: the words just before ". <year>;", as in
 * "… Eur J Pharm Sci. 2019;127:282-290". Reading only that slot keeps short titles
 * such as "Drug Saf" or "Chest" from matching ordinary prose elsewhere on the line.
 */
function citedJournals(line: string): string[] {
  return [...line.matchAll(/([A-Za-z][A-Za-z&'()’.\- ]{2,40}?)\.\s*(?:19|20)\d{2}\s*[;:]/g)]
    .map((m) => normalizeText(m[1].split(/[.,;(]/).pop() ?? ""))
    .filter((j) => j.length > 0);
}

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

/**
 * A PMID that exists is not a PMID that fits. Round 13 shipped five citations whose
 * IDs pointed at real but unrelated papers (a physics paper, a concrete-beam paper,
 * a Staphylococcus assay, a dermatology case report, a mouse ethanol study), and
 * every one of them passed the checks above. So when a citation line names a journal
 * this snapshot knows, it has to be that PMID's own journal.
 *
 * This catches a wrong journal, not a wrong paper in the right journal: the piperine
 * row cited a different J Pharmacol Exp Ther 2002 paper and would still slip through.
 * Whether a sentence matches its paper is still a reader's job, per
 * docs/validation/citation-audit.md.
 */
test("a citation naming a journal names its own PMID's journal", () => {
  let checked = 0;
  for (const [pmid, { where, line }] of citations) {
    const row = byPmid.get(pmid);
    if (!row) continue;
    const named = citedJournals(line);
    const own = normalizeText(row.journal);
    if (named.includes(own)) {
      checked += 1;
      continue;
    }
    // Only a journal the snapshot itself knows counts as a claim worth testing;
    // anything else in that slot is prose this check cannot read.
    const other = named.find((j) => knownJournals.has(j));
    assert.ok(
      !other,
      `PMID ${pmid} at ${where} is cited in "${other}" but the snapshot has it in "${row.journal}" (${row.year}): "${row.title}"`,
    );
  }
  assert.ok(checked > 20, `expected the journal slot to be readable on many citations, read ${checked}`);
});

test("the source scan reads every way a PMID is written", () => {
  assert.ok(inline.get("27441996")?.startsWith("src/lib/learn/glossary.ts"), "PMID in a glossary string");
  assert.ok(inline.get("38078585")?.startsWith("src/lib/drugs/glycemic-kinetics.ts"), 'pmid: "..." field');
  assert.ok(inline.has("11752357"), "PMID in clinical copy");
});
