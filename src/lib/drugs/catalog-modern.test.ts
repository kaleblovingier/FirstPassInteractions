import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog.ts";

const NEW_IDS = [
  "dulaglutide",
  "liraglutide",
  "daridorexant",
  "cariprazine",
  "lumateperone",
  "brexpiprazole",
  "asenapine",
  "iloperidone",
  "pimavanserin",
  "gepirone",
  "zuranolone",
  "nirmatrelvir",
  "bictegravir",
  "cabotegravir",
  "lenacapavir",
  "letermovir",
  "maribavir",
  "molnupiravir",
  "remdesivir",
  "upadacitinib",
  "tofacitinib",
  "baricitinib",
  "ritlecitinib",
  "deucravacitinib",
  "apremilast",
  "etodesnitazene",
  "n-pyrrolidino-etonitazene",
  "butonitazene",
  "flunitazene",
  "brorphine",
  "u-47700",
  "pyrazolam",
  "flubromazepam",
  "deschloroetizolam",
  "meclonazepam",
  "phenazolam",
  "eutylone",
  "n-ethylpentylone",
  "mdphp",
] as const;

test("modern formulary ids are present and searchable", () => {
  for (const id of NEW_IDS) {
    assert.ok(DRUG_BY_ID[id], `missing ${id}`);
    assert.ok(searchDrugs(id).some((d) => d.id === id), `search miss ${id}`);
  }
});

test("modern brand aliases resolve", () => {
  assert.equal(searchDrugs("Quviviq")[0]?.id, "daridorexant");
  assert.equal(searchDrugs("Vraylar")[0]?.id, "cariprazine");
  assert.equal(searchDrugs("Zurzuvae")[0]?.id, "zuranolone");
  assert.equal(searchDrugs("Trulicity")[0]?.id, "dulaglutide");
  assert.equal(searchDrugs("Sunlenca")[0]?.id, "lenacapavir");
  assert.equal(searchDrugs("ephylone")[0]?.id, "n-ethylpentylone");
});
