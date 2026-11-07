/**
 * Duplicate catalog rows (2026-11-07 draft): the catalog matches the "after"
 * values in reference/duplicate-rows.ts, every quote is verbatim in its saved
 * source, each edited duplicate agrees with its label-backed row, and the
 * generated doc is current. Regenerate: npx --yes tsx scripts/duplicate-rows.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRUGS, DRUG_BY_ID, searchDrugs } from "./catalog";
import { enz } from "./catalog-clinic";
import { analyze } from "./engine";
import { DEFAULT_HOST, SEVERITY_RANK } from "./types";
import { FDA_DDI_TABLE } from "./reference/fda-ddi-table";
import {
  BUPROPION_MAOI_QUOTE,
  BUPROPION_SEIZURE_QUOTE,
  BUPROPION_SPL_SETID,
  DUPLICATE_ROW_EDITS,
  EPIDIOLEX_2C19_QUOTE,
  FDA_CELL_BUPROPION_2D6,
  FDA_CELL_DXM_2D6,
  LYBALVI_OPIOID_FRAGMENT,
} from "./reference/duplicate-rows";
import { DOC_PATH, render } from "../../../scripts/duplicate-rows.ts";

const spl = JSON.parse(readFileSync(new URL("../../../scripts/fixtures/label-drift-spl.json", import.meta.url), "utf8")) as {
  labels: Record<string, { sections: { title: string; text: string }[] }>;
};
const section4 = (setid: string) =>
  spl.labels[setid].sections
    .filter((s) => s.title.startsWith("4"))
    .map((s) => s.text)
    .join(" ");

test("bupropion quotes are verbatim in the saved section 4", () => {
  const t = section4(BUPROPION_SPL_SETID);
  assert.ok(t.includes(BUPROPION_SEIZURE_QUOTE));
  assert.ok(t.includes(BUPROPION_MAOI_QUOTE));
});

test("FDA Table 1 cells are the transcribed ones", () => {
  const cellOf = (drug: string, target: string, kind: string) =>
    FDA_DDI_TABLE.find((r) => r.drug === drug && r.target === target && r.kind === kind)?.cell;
  assert.equal(cellOf("bupropion", "CYP2D6", "inhibitor"), FDA_CELL_BUPROPION_2D6);
  assert.equal(cellOf("dextromethorphan", "CYP2D6", "substrate"), FDA_CELL_DXM_2D6);
});

test("Lybalvi and Epidiolex fragments are the ones already saved in the repo", () => {
  const gold = readFileSync(new URL("./reference/label-gold-set.ts", import.meta.url), "utf8");
  assert.ok(gold.includes(`Section 4 says '${LYBALVI_OPIOID_FRAGMENT}' and names no drug.`));
  const audit = readFileSync(new URL("../../../docs/validation/strength-audit-2026-10-19.md", import.meta.url), "utf8");
  assert.ok(audit.includes(`Epidiolex: "${EPIDIOLEX_2C19_QUOTE}"`));
});

test("catalog rows carry the after values", () => {
  for (const e of DUPLICATE_ROW_EDITS) {
    const d = DRUG_BY_ID[e.id];
    assert.ok(d, e.id);
    if (e.after.enzymes !== undefined) assert.deepEqual(d.enzymes, enz(e.after.enzymes), `${e.id} enzymes`);
    if (e.after.pd) assert.deepEqual(d.pd, e.after.pd, `${e.id} pd`);
    if (e.after.brands) assert.deepEqual(d.brands, e.after.brands, `${e.id} brands`);
    if (e.after.aliases) assert.deepEqual(d.aliases, e.after.aliases, `${e.id} aliases`);
  }
});

const grade = (a: string, b: string) =>
  analyze([a, b], DEFAULT_HOST)
    .findings.filter((f) => f.drugIds.includes(a) && f.drugIds.includes(b))
    .reduce((m, f) => Math.max(m, SEVERITY_RANK[f.severity]), 0);

test("both Auvelity rows give the same pair grade with every partner", () => {
  const off = DRUGS.filter((d) => d.id !== "auvelity" && d.id !== "dextromethorphan-bupropion").filter(
    (d) => grade("dextromethorphan-bupropion", d.id) !== grade("auvelity", d.id),
  );
  assert.deepEqual(off.map((d) => d.id), []);
});

test("both Lybalvi rows show the precipitated-withdrawal card with every opioid", () => {
  const antag = (a: string, b: string) => analyze([a, b]).findings.some((f) => f.id.endsWith("pd-antag-opioid"));
  const opioids = DRUGS.filter((d) => d.pd.includes("opioid"));
  assert.ok(opioids.length > 20);
  for (const o of opioids) assert.equal(antag("olanzapine-samidorphan", o.id), antag("lybalvi", o.id), o.id);
  assert.ok(antag("olanzapine-samidorphan", "oxycodone"));
});

test("Epidiolex search returns the Epidiolex row first", () => {
  assert.equal(searchDrugs("epidiolex")[0]?.id, "cannabidiol-epidiolex");
  assert.ok(!DRUG_BY_ID.cannabidiol.brands.includes("Epidiolex"));
});

test("duplicate-rows doc is current", () => {
  assert.equal(
    readFileSync(DOC_PATH, "utf8").replace(/\r\n/g, "\n"),
    render().replace(/\r\n/g, "\n"),
    "duplicate-rows-2026-11-07.md is stale; run npx --yes tsx scripts/duplicate-rows.ts",
  );
});
