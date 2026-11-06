import test from "node:test";
import assert from "node:assert/strict";
import {
  DRUG_BY_ID,
  DRUGS,
  normalizeSearchText,
  saltFormKeys,
  searchDrugs,
  stripSaltFormTokens,
  withoutStrength,
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

test("keeps a salt that is the drug and reads past a pasted strength", () => {
  assert.deepEqual(saltFormKeys("potassium chloride er"), ["potassium chloride er", "potassium chloride", "chloride"]);
  assert.equal(searchDrugs("potassium chloride ER")[0]?.id, "potassium-chloride");
  assert.equal(searchDrugs("diltiazem CD")[0]?.id, "diltiazem");
  assert.equal(withoutStrength("lisinopril 10 mg"), "lisinopril");
  assert.equal(withoutStrength("5 fu"), "5 fu");
  assert.equal(searchDrugs("Synthroid 50 mcg")[0]?.id, "levothyroxine");
});

test("shelf keywords that are brands list their own row first", () => {
  assert.equal(searchDrugs("Zosyn")[0]?.id, "piperacillin-tazobactam");
  assert.equal(searchDrugs("Entresto")[0]?.id, "sacubitril-valsartan");
  assert.equal(searchDrugs("Opvee")[0]?.id, "nalmefene");
  assert.equal(searchDrugs("wards")[0]?.id, "meropenem");
});

test("common abbreviations name the drug, not a substring neighbour", () => {
  assert.equal(searchDrugs("MTX")[0]?.id, "methotrexate");
  assert.equal(searchDrugs("ASA")[0]?.id, "aspirin");
  assert.notEqual(searchDrugs("tPA")[0]?.id, "parenteral-nutrition");
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

test("merged catalog has no duplicate ids", () => {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const drug of DRUGS) {
    if (seen.has(drug.id)) dupes.push(drug.id);
    seen.add(drug.id);
  }
  assert.deepEqual(dupes, []);
  assert.equal(Object.keys(DRUG_BY_ID).length, DRUGS.length);
});
