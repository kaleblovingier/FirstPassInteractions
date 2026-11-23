import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRUGS, DRUG_BY_ID, searchDrugs } from "./catalog.ts";
import { MODERN_WAVE6_FORMULARY } from "./catalog-modern-wave6.ts";
import { findDoses } from "../guards/dose-rule.ts";

const WAVE6_IDS = [
  "cychlorphine",
  "spirochlorphine",
  "sr-17018",
  "dichloro-brorphine",
  "chlorphine",
  "n-phenethyl-chloro-nor-orphine",
  "protonitazepyne",
  "metonitazepyne",
  "etonitazepipne",
  "norisotonitazene",
  "n-pyrrolidino-ethylene-isotonitazene",
  "ethylbromazolam",
  "ethylflualprazolam",
  "hhc",
  "hhc-p",
  "hhc-o",
  "ten-oh-hhc",
] as const;

test("wave 6 formulary has 17 unique compounds merged cleanly into DRUG_BY_ID", () => {
  assert.equal(MODERN_WAVE6_FORMULARY.length, 17);
  assert.equal(DRUGS.length, Object.keys(DRUG_BY_ID).length);
  for (const id of WAVE6_IDS) {
    const drug = DRUG_BY_ID[id];
    assert.ok(drug, `missing ${id} in DRUG_BY_ID`);
    assert.equal(drug.kind, "drug");
    assert.ok(drug.note && drug.note.length > 40, `note too short on ${id}`);
  }
});

test("all 27 emerging forensic NPS compounds and their key aliases resolve accurately via searchDrugs", () => {
  const cases: readonly [query: string, expectedId: string][] = [
    // Orphines (7)
    ["Cychlorphine", "cychlorphine"],
    ["N-propionitrile chlorphine", "cychlorphine"],
    ["Brorphine", "brorphine"],
    ["Spirochlorphine", "spirochlorphine"],
    ["R-6890", "spirochlorphine"],
    ["SR-17018", "sr-17018"],
    ["5,6-dichloro-desmethylchlorphine", "sr-17018"],
    ["5,6-dichloro-brorphine", "dichloro-brorphine"],
    ["Chlorphine", "chlorphine"],
    ["N'-phenethyl-5/6-chloro nor-orphine", "n-phenethyl-chloro-nor-orphine"],
    // Nitazenes (8)
    ["Etonitazene", "etonitazene"],
    ["Isotonitazene", "isotonitazene"],
    ["Metonitazene", "metonitazene"],
    ["Protonitazepyne", "protonitazepyne"],
    ["N-pyrrolidino protonitazene", "protonitazepyne"],
    ["Metonitazepyne", "metonitazepyne"],
    ["Etonitazepipne", "etonitazepipne"],
    ["Norisotonitazene", "norisotonitazene"],
    ["N-desethyl isotonitazene", "norisotonitazene"],
    ["N-pyrrolidino ethylene isotonitazene", "n-pyrrolidino-ethylene-isotonitazene"],
    // Designer benzodiazepines (4)
    ["Desalkylgidazepam", "desalkylgidazepam"],
    ["bromonordiazepam", "desalkylgidazepam"],
    ["Ethylbromazolam", "ethylbromazolam"],
    ["Ethylflualprazolam", "ethylflualprazolam"],
    ["clobromazolam", "phenazolam"],
    ["phenazolam", "phenazolam"],
    // Semi-synthetic cannabinoids — HHC series (4)
    ["HHC", "hhc"],
    ["hexahydrocannabinol", "hhc"],
    ["HHC-P", "hhc-p"],
    ["HHC acetate", "hhc-o"],
    ["10-OH-HHC", "ten-oh-hhc"],
    // Veterinary alpha-2 adulterant (1)
    ["Medetomidine", "medetomidine"],
    // Concentrated kratom alkaloid (1)
    ["7-hydroxymitragynine", "seven-oh"],
    ["7-OH", "seven-oh"],
    // Arylcyclohexylamine dissociatives (2)
    ["Deschloroketamine", "dck"],
    ["DCK", "dck"],
    ["2-FDCK", "two-fdck"],
    ["2-fluoro-deschloroketamine", "two-fdck"],
  ];

  for (const [query, expectedId] of cases) {
    const top = searchDrugs(query)[0];
    assert.equal(top?.id, expectedId, `searchDrugs(${JSON.stringify(query)}) returned ${top?.id ?? "none"}, expected ${expectedId}`);
  }
});

test("SR-17018 teaching note warns that preclinical G-protein bias does not prevent human respiratory arrest", () => {
  const sr = DRUG_BY_ID["sr-17018"];
  assert.ok(sr);
  assert.match(sr.note ?? "", /G-protein-biased/i);
  assert.match(sr.note ?? "", /does NOT (?:confer human clinical safety|eliminate respiratory arrest)/i);
});

test("catalog-modern-wave6.ts contains zero administered dose patterns", () => {
  const src = readFileSync(new URL("./catalog-modern-wave6.ts", import.meta.url), "utf8");
  assert.deepEqual(findDoses(src), []);
});
