import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveLabelDates, MonographNote } from "@/components/label-freshness";
import { DRUG_BY_ID } from "./catalog";
import { labelFreshnessLine, liveLabelDateLine, noteLabelBasis } from "./grade-provenance";

const FILES = [
  "src/lib/drugs/catalog-modern.ts",
  "src/lib/drugs/catalog-modern-wave2.ts",
  "src/lib/drugs/catalog-modern-wave3.ts",
];

const MODERN_IDS = [
  "gepotidacin",
  "pivmecillinam",
  "ensifentrine",
  "sotatercept",
  "elinzanetant",
  "mavacamten",
  "mavorixafor",
  "vanzacaftor-tezacaftor-deutivacaftor",
] as const;

const versions = JSON.parse(
  readFileSync("src/lib/drugs/reference/label-versions.json", "utf8"),
) as {
  labels: Record<string, { version: number; effective: string; checkedOn: string }>;
};

function drugSnap(id: string) {
  const drug = DRUG_BY_ID[id];
  assert.ok(drug, id);
  return { enzymes: drug.enzymes, pd: drug.pd, note: drug.note };
}

describe("modern catalog DailyMed setids", () => {
  it("fails when a setid= in the modern catalogs is missing from label-versions.json", () => {
    let n = 0;
    for (const file of FILES) {
      const text = readFileSync(file, "utf8");
      const ids = [...text.matchAll(/setid=([0-9a-f-]+)/gi)].map((m) => m[1]!.toLowerCase());
      assert.ok(ids.length > 0, `${file} cites no DailyMed setid`);
      for (const id of ids) {
        n += 1;
        const row = versions.labels[id];
        assert.ok(row, `${file}: setid ${id} missing from label-versions.json`);
        assert.ok(Number.isInteger(row.version) && row.version > 0, id);
        assert.match(row.effective, /^\d{4}-\d{2}-\d{2}$/, id);
        assert.match(row.checkedOn, /^\d{4}-\d{2}-\d{2}$/, id);
      }
    }
    assert.ok(n >= 8, "expected the eight modern DailyMed cites");
  });

  it("shows labelFreshnessLine on the monograph note and does not change the drug", () => {
    const app = readFileSync("src/components/desk/app.tsx", "utf8");
    assert.match(app, /drug\.note \? <MonographNote note=\{drug\.note\} \/>/);
    for (const id of MODERN_IDS) {
      const drug = DRUG_BY_ID[id];
      assert.ok(drug?.note, id);
      const before = structuredClone(drugSnap(id));
      const basis = noteLabelBasis(drug.note);
      assert.ok(basis, id);
      const line = labelFreshnessLine(basis);
      assert.deepEqual(drugSnap(id), before, `${id}: freshness changed the drug`);
      assert.match(
        line ?? "",
        /^Label version dated \d{4}-\d{2}-\d{2}\. Last checked \d{4}-\d{2}-\d{2}\.$/,
        id,
      );
      const html = renderToStaticMarkup(createElement(MonographNote, { note: drug.note }));
      assert.deepEqual(drugSnap(id), before, `${id}: render changed the drug`);
      assert.equal((html.match(/data-testid="label-freshness"/g) ?? []).length, 1, id);
      assert.ok(html.includes(line!), id);
      assert.doesNotMatch(line!, /grade|severity|avoid together/i, id);
    }
    const plain = DRUG_BY_ID.sulopenem;
    assert.ok(plain?.note && !/setid=/.test(plain.note));
    assert.equal(noteLabelBasis(plain.note), null);
    const html = renderToStaticMarkup(createElement(MonographNote, { note: plain.note }));
    assert.equal(html.includes("label-freshness"), false);
  });

  it("names both dates when a live FDA or DailyMed day differs, and stays quiet otherwise", () => {
    const dossier = readFileSync("src/components/desk/dossier.tsx", "utf8");
    assert.match(dossier, /LiveLabelDates setid=\{label\.setId\} liveDate=\{label\.effective\}/);
    assert.match(dossier, /LiveLabelDates setid=\{d\.setId\} liveDate=\{d\.published\}/);
    const id = "80b57cfe-7819-4d95-a57d-014af42f118d";
    const row = versions.labels[id];
    assert.ok(row, id);
    const before = structuredClone(drugSnap("gepotidacin"));
    assert.equal(liveLabelDateLine(id, row.effective), null);
    assert.equal(liveLabelDateLine(id, `${row.effective}T00:00:00`), null);
    assert.equal(liveLabelDateLine(id, ""), null);
    assert.equal(liveLabelDateLine("not-in-the-file", "2020-01-01"), null);
    const line = liveLabelDateLine(id, "2020-01-01");
    assert.equal(
      line,
      `Live label dated 2020-01-01. Label version on file dated ${row.effective}.`,
    );
    assert.deepEqual(drugSnap("gepotidacin"), before);
    const shown = renderToStaticMarkup(
      createElement(LiveLabelDates, { setid: id, liveDate: "2020-01-01T00:00:00" }),
    );
    assert.ok(shown.includes('data-testid="label-date-compare"'));
    assert.ok(shown.includes("2020-01-01"));
    assert.ok(shown.includes(row.effective));
    assert.equal(
      renderToStaticMarkup(createElement(LiveLabelDates, { setid: id, liveDate: row.effective })),
      "",
    );
    assert.equal(
      renderToStaticMarkup(
        createElement(LiveLabelDates, { setid: "missing-setid", liveDate: "2020-01-01" }),
      ),
      "",
    );
  });
});
