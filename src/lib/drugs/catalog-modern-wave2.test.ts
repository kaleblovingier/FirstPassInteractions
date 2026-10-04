import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, DRUGS, normalizeSearchText, searchDrugs } from "./catalog.ts";
import { MODERN_WAVE2_FORMULARY } from "./catalog-modern-wave2.ts";
import { SAMPLE_REGIMENS } from "./samples.ts";

const WAVE2_IDS = [
  "fezolinetant",
  "elinzanetant",
  "mavacamten",
  "aprocitentan",
  "suzetrigine",
  "lefamulin",
  "retatrutide",
  "orforglipron",
  "cagrilintide",
  "acrylfentanyl",
  "furanylfentanyl",
  "cyclopropylfentanyl",
  "ocfentanil",
  "metodesnitazene",
  "o-dsmt",
  "mdpv",
  "n-ethylhexedrone",
  "nifoxipam",
  "desalkylgidazepam",
  "flubrotizolam",
  "cytisine",
] as const;

/** Wave-2 rows dropped because an earlier catalog already carries them (earlier row wins). */
const DROPPED_TO_MAIN: Record<string, string> = {
  rimegepant: "rimegepant",
  ubrogepant: "ubrogepant",
  atogepant: "atogepant",
  zavegepant: "zavegepant",
  pitolisant: "pitolisant",
  solriamfetol: "solriamfetol",
  tasimelteon: "tasimelteon",
  "dxm-bupropion": "auvelity",
  "olanzapine-samidorphan": "olanzapine-samidorphan",
  doravirine: "doravirine",
  fostemsavir: "fostemsavir",
  tecovirimat: "tecovirimat",
  brincidofovir: "brincidofovir",
  finerenone: "finerenone",
  vericiguat: "vericiguat",
  andexanet: "andexanet-alfa",
  idarucizumab: "idarucizumab",
  sotorasib: "sotorasib",
  adagrasib: "adagrasib",
  omadacycline: "omadacycline",
  ibrexafungerp: "ibrexafungerp",
  rezafungin: "rezafungin",
  setmelanotide: "setmelanotide",
  sufentanil: "sufentanil",
  alfentanil: "alfentanil",
  remifentanil: "remifentanil",
  "3-mmc": "three-mmc",
  "2-fdck": "two-fdck",
  "3-meo-pcp": "three-meo-pcp",
};

function searchKeys(drug: { id: string; name: string; brands: string[]; aliases: string[] }): string[] {
  return [...new Set([drug.id, drug.name, ...drug.brands, ...drug.aliases].map(normalizeSearchText).filter(Boolean))];
}

test("wave2 formulary ids are present and searchable", () => {
  assert.equal(MODERN_WAVE2_FORMULARY.length, WAVE2_IDS.length);
  for (const id of WAVE2_IDS) {
    assert.ok(DRUG_BY_ID[id], `missing ${id}`);
    assert.ok(MODERN_WAVE2_FORMULARY.some((d) => d.id === id), `${id} not in wave2`);
    assert.ok(searchDrugs(id).some((d) => d.id === id), `search miss ${id}`);
  }
});

test("wave2 rows are all live in the merged catalog", () => {
  for (const row of MODERN_WAVE2_FORMULARY) {
    assert.equal(DRUG_BY_ID[row.id], row, `${row.id} shadowed by an earlier catalog`);
  }
});

test("dropped wave2 duplicates resolve to the row already on the shelf", () => {
  for (const [waveId, mainId] of Object.entries(DROPPED_TO_MAIN)) {
    assert.ok(!MODERN_WAVE2_FORMULARY.some((d) => d.id === waveId), `${waveId} should be dropped from wave2`);
    assert.ok(DRUG_BY_ID[mainId], `main row ${mainId} missing`);
  }
});

test("wave2 rows share no id, name, brand, or alias with any other row", () => {
  const wave = new Set(MODERN_WAVE2_FORMULARY);
  const owner = new Map<string, string>();
  for (const drug of DRUGS) {
    if (wave.has(drug)) continue;
    for (const key of searchKeys(drug)) owner.set(key, drug.id);
  }
  const seen = new Map<string, string>();
  for (const row of MODERN_WAVE2_FORMULARY) {
    for (const key of searchKeys(row)) {
      assert.ok(!owner.has(key), `${row.id} key "${key}" already belongs to ${owner.get(key)}`);
      assert.ok(!seen.has(key) || seen.get(key) === row.id, `${row.id} key "${key}" repeats ${seen.get(key)}`);
      seen.set(key, row.id);
    }
  }
});

test("wave2 brand aliases resolve", () => {
  assert.equal(searchDrugs("Camzyos")[0]?.id, "mavacamten");
  assert.equal(searchDrugs("Veozah")[0]?.id, "fezolinetant");
  assert.equal(searchDrugs("Lynkuet")[0]?.id, "elinzanetant");
  assert.equal(searchDrugs("Journavx")[0]?.id, "suzetrigine");
  assert.equal(searchDrugs("Xenleta")[0]?.id, "lefamulin");
  assert.equal(searchDrugs("Tryvio")[0]?.id, "aprocitentan");
  assert.equal(searchDrugs("odsmt")[0]?.id, "o-dsmt");
  assert.equal(searchDrugs("a-pvp")[0]?.id, "a-pvp"); // core shelf already has α-PVP
  assert.equal(searchDrugs("Nurtec")[0]?.id, "rimegepant"); // clinic row wins
  assert.equal(searchDrugs("3-mmc")[0]?.id, "three-mmc"); // core row wins
});

test("elinzanetant reflects current Lynkuet label status and safety precautions", () => {
  const row = DRUG_BY_ID.elinzanetant;
  assert.deepEqual(row.brands, ["Lynkuet"]);
  assert.match(row.cls, /NK1\/NK3 receptor antagonist/);
  assert.ok(row.enzymes.some((role) => role.kind === "substrate" && role.enzyme === "CYP3A4"));
  assert.match(row.toxicityHint, /pregnancy contraindication/i);
  assert.match(row.note ?? "", /avoid strong CYP3A4 inhibitors, grapefruit/i);
  assert.match(row.note ?? "", /baseline hepatic tests/i);
  assert.match(row.note ?? "", /dailymed\.nlm\.nih\.gov/i);
});

test("every sample regimen references drugs on the shelf", () => {
  for (const sample of SAMPLE_REGIMENS) {
    for (const id of sample.drugIds) assert.ok(DRUG_BY_ID[id], `${sample.id} references missing ${id}`);
  }
});
