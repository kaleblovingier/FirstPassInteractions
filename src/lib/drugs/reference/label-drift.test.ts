import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  checkQuote,
  citedSections,
  segments,
  setidOf,
  splMeta,
  splSections,
  type QuotedRow,
} from "./label-drift";
import { build, PATHS, quotedRows } from "../../../../scripts/label-drift-check";

const XML = `<document><title>DEMO tablets</title><effectiveTime value="20260105"/><versionNumber value="7"/>
<component><structuredBody>
<component><section><id root="a"/><code code="34070-3" displayName="CONTRAINDICATIONS"/><title>4 CONTRAINDICATIONS</title>
<text><list><item><caption>•</caption>Bradycardia &lt;50 bpm</item><item><caption>•</caption>Concomitant use of <content>erythromycin</content></item></list></text>
<component><section><code code="42229-5" displayName="SPL UNCLASSIFIED SECTION"/><title>4.1 Combination with Certain Drugs</title><text>DEMO is contraindicated with drug X\u2019s products … and more.</text></section></component>
</section></component>
<component><section><code code="34073-7" displayName="DRUG INTERACTIONS"/><title>7 DRUG INTERACTIONS</title><text>Avoid   use with   rifampin.</text></section></component>
<component><section><code code="42229-5" displayName="SPL UNCLASSIFIED SECTION"/><text>Product comparison: DEMO is contraindicated with zeta.</text></section></component>
</structuredBody></component></document>`;

const row = (quote: string, labelSection: string): QuotedRow => ({
  pairs: ["a+b"],
  labelDrug: "Demo",
  labelSection,
  quote,
  url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=s-1",
  setid: "s-1",
});

test("label drift: SPL parsing reads version, date and titled sections", () => {
  assert.deepEqual(splMeta(XML), { title: "DEMO tablets", version: 7, effective: "2026-01-05" });
  const s = splSections(XML);
  assert.deepEqual(
    s.map((x) => x.title),
    [
      "4 CONTRAINDICATIONS",
      "4.1 Combination with Certain Drugs",
      "7 DRUG INTERACTIONS",
      "[SPL UNCLASSIFIED SECTION]",
    ],
  );
  assert.match(s[0]!.text, /Bradycardia <50 bpm/);
  assert.equal(setidOf("https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc"), "abc");
  assert.equal(setidOf("https://www.accessdata.fda.gov/x.pdf"), null);
});

test("label drift: cited section matching by number and by heading", () => {
  const s = splSections(XML);
  assert.deepEqual(
    citedSections(s, "4.1 Combination with Certain Drugs").map((x) => x.title),
    ["4.1 Combination with Certain Drugs"],
  );
  assert.deepEqual(
    citedSections(s, "CONTRAINDICATIONS").map((x) => x.title),
    ["4 CONTRAINDICATIONS"],
  );
  assert.deepEqual(citedSections(s, "4 CONTRAINDICATIONS; 7 DRUG INTERACTIONS").length, 2);
});

test("label drift: segments split on the ellipsis and keep the final period", () => {
  assert.deepEqual(segments("A is contraindicated with: … B, … C."), [
    "A is contraindicated with",
    "B",
    "C.",
  ]);
});

test("label drift: pass, moved and drifted", () => {
  const s = splSections(XML);
  // Text with "<50 bpm" must not be eaten as a tag (regression).
  assert.equal(
    checkQuote(row("DEMO … Concomitant use of erythromycin", "4 CONTRAINDICATIONS"), s, "").status,
    "pass",
  );
  assert.equal(
    checkQuote(row("Avoid use with rifampin", "7 DRUG INTERACTIONS"), s, "").status,
    "pass",
  );
  assert.equal(
    checkQuote(
      row("contraindicated with drug X's products", "4.1 Combination with Certain Drugs"),
      s,
      "",
    ).status,
    "pass",
  );
  const moved = checkQuote(row("Avoid use with rifampin", "4 CONTRAINDICATIONS"), s, "");
  assert.equal(moved.status, "moved");
  assert.equal(moved.section, "7 DRUG INTERACTIONS");
  assert.equal(
    checkQuote(row("DEMO is contraindicated with zeta", "CONTRAINDICATIONS"), s, "").status,
    "moved",
  );
  const d = checkQuote(row("Concomitant use of clarithromycin", "4 CONTRAINDICATIONS"), s, "");
  assert.equal(d.status, "drifted");
  assert.equal(d.missing, "Concomitant use of clarithromycin");
  assert.match(d.current ?? "", /erythromycin/);
});

test("label drift: committed report and label versions match the offline fixture (--check)", () => {
  const fx = JSON.parse(readFileSync(PATHS.fixture, "utf8"));
  const out = build(fx);
  assert.equal(
    readFileSync(PATHS.md, "utf8"),
    out.md,
    "docs/validation/label-drift.md is stale; re-run scripts/label-drift-check.ts",
  );
  assert.equal(readFileSync(PATHS.versions, "utf8"), out.json, "label-versions.json is stale");
  for (const r of quotedRows())
    if (r.setid) assert.ok(fx.labels[r.setid], `${r.pairs[0]}: setid ${r.setid} in fixture`);
  assert.equal(out.results.filter((r) => r.status === "unfetched").length, 0);
});

test("label drift: label-versions.json has a version and date for every quoted setid", () => {
  const v = JSON.parse(readFileSync(PATHS.versions, "utf8"));
  assert.match(v.retrieved, /^\d{4}-\d{2}-\d{2}$/);
  for (const [setid, l] of Object.entries<{ version: number; effective: string }>(v.labels)) {
    assert.ok(Number.isInteger(l.version) && l.version > 0, setid);
    assert.match(l.effective, /^\d{4}-\d{2}-\d{2}$/, setid);
  }
});
