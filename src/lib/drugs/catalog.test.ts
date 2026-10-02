import test from "node:test";
import assert from "node:assert/strict";
import {
  DRUG_BY_ID,
  normalizeSearchText,
  searchDrugs,
  stripSaltFormTokens,
} from "./catalog.ts";

test("normalizes punctuation and diacritics for lookup", () => {
  assert.equal(normalizeSearchText("Triméthoprim–sulfamethoxazole"), "trimethoprim sulfamethoxazole");
  assert.equal(normalizeSearchText("5-HTP"), "5 htp");
});

test("finds common generic, brand, salt-form, and alias variants", () => {
  assert.equal(searchDrugs("Bactrim")[0]?.id, "tmp-smx");
  assert.equal(searchDrugs("nirmatrelvir/ritonavir")[0]?.id, "paxlovid");
  assert.equal(searchDrugs("5-HTP")[0]?.id, "five-htp");
  assert.equal(searchDrugs("metformin hcl")[0]?.id, "metformin");
  assert.equal(searchDrugs("CYP 3A4")[0]?.id, "clarithromycin");
});

test("strips common salt and release tokens from queries", () => {
  assert.equal(stripSaltFormTokens("metformin hcl"), "metformin");
  assert.equal(stripSaltFormTokens("sertraline hydrochloride"), "sertraline");
  assert.equal(stripSaltFormTokens("bupropion xl"), "bupropion");
  assert.equal(stripSaltFormTokens("metformin"), "metformin");
});

test("finds drugs when the user pastes salt or release forms", () => {
  assert.equal(searchDrugs("sertraline hydrochloride")[0]?.id, "sertraline");
  assert.equal(searchDrugs("metformin HCl")[0]?.id, "metformin");
  assert.ok(searchDrugs("bupropion xl").some((d) => d.id.startsWith("bupropion")));
});

test("does not turn punctuation-only input into a broad result set", () => {
  assert.deepEqual(searchDrugs("---"), []);
});

test("does not return excluded catalog entries", () => {
  const results = searchDrugs("opioid", ["fentanyl", "methadone"]);
  assert.equal(results.some((drug) => drug.id === "fentanyl" || drug.id === "methadone"), false);
  assert.ok(results.length > 0);
});

test("every catalog entry has a searchable identity", () => {
  for (const drug of Object.values(DRUG_BY_ID)) {
    assert.ok(normalizeSearchText(`${drug.id} ${drug.name}`));
  }
});
