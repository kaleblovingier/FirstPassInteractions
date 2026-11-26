import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRUGS, DRUG_BY_ID, searchDrugs } from "./catalog.ts";
import { MODERN_WAVE8_FORMULARY } from "./catalog-modern-wave8.ts";
import { analyze } from "./engine.ts";
import { findDoses } from "../guards/dose-rule.ts";

const WAVE8_IDS = [
  "pterostilbene",
  "pqq",
  "nicotinamide-riboside",
  "polygala-tenuifolia",
  "sabroxy",
  "thymosin-beta-4",
  "blue-lotus",
  "magnesium-l-threonate",
  "palmitoylethanolamide",
  "oleamide",
  "baicalin",
  "fisetin",
] as const;

test("wave 8 formulary has 12 unique compounds merged cleanly into DRUG_BY_ID with globally unique catalog ids", () => {
  assert.equal(MODERN_WAVE8_FORMULARY.length, 12);
  assert.equal(DRUGS.length, Object.keys(DRUG_BY_ID).length);
  const seen = new Set<string>();
  for (const drug of DRUGS) {
    assert.equal(seen.has(drug.id), false, `duplicate catalog id ${drug.id}`);
    seen.add(drug.id);
  }
  for (const id of WAVE8_IDS) {
    const drug = DRUG_BY_ID[id];
    assert.ok(drug, `missing ${id} in DRUG_BY_ID`);
    assert.ok(drug.note && drug.note.length > 60, `note too short on ${id}`);
    assert.ok(drug.toxicityHint.trim().length > 10, `toxicityHint too short on ${id}`);
  }
  assert.equal(DRUG_BY_ID["thymosin-beta-4"].kind, "research-peptide");
});

test("all 12 wave 8 monographs and key aliases resolve as top hits via searchDrugs", () => {
  const cases: readonly [query: string, expectedId: string][] = [
    ["Pterostilbene", "pterostilbene"],
    ["dimethylresveratrol", "pterostilbene"],
    ["PQQ", "pqq"],
    ["pyrroloquinoline quinone", "pqq"],
    ["Nicotinamide riboside", "nicotinamide-riboside"],
    ["niagen", "nicotinamide-riboside"],
    ["Polygala tenuifolia", "polygala-tenuifolia"],
    ["yuan zhi", "polygala-tenuifolia"],
    ["Sabroxy", "sabroxy"],
    ["oroxylin a", "sabroxy"],
    ["Thymosin beta-4", "thymosin-beta-4"],
    ["tb-500", "thymosin-beta-4"],
    ["Blue lotus", "blue-lotus"],
    ["nuciferine", "blue-lotus"],
    ["Magnesium L-threonate", "magnesium-l-threonate"],
    ["magtein", "magnesium-l-threonate"],
    ["Palmitoylethanolamide", "palmitoylethanolamide"],
    ["normast", "palmitoylethanolamide"],
    ["Oleamide", "oleamide"],
    ["Baicalin", "baicalin"],
    ["chinese skullcap", "baicalin"],
    ["Fisetin", "fisetin"],
  ];

  for (const [query, expectedId] of cases) {
    const top = searchDrugs(query)[0];
    assert.equal(
      top?.id,
      expectedId,
      `searchDrugs(${JSON.stringify(query)}) returned ${top?.id ?? "none"}, expected ${expectedId}`,
    );
  }
});

test("wave 8 pharmacodynamic and CYP roles trigger expected clinical interaction cards", () => {
  const polySsri = analyze(["polygala-tenuifolia", "phenelzine"]).findings;
  assert.ok(
    polySsri.some((f) => f.tags.includes("serotonin")),
    "polygala-tenuifolia + phenelzine should flag serotonergic risk",
  );

  const baicWarf = analyze(["baicalin", "warfarin"]).findings;
  assert.ok(
    baicWarf.some((f) => f.enzymes.includes("CYP2C9")),
    "baicalin + warfarin should flag CYP2C9 interaction",
  );

  const fisWarf = analyze(["fisetin", "warfarin"]).findings;
  assert.ok(
    fisWarf.some((f) => /bleed/i.test(f.effect) || f.enzymes.includes("CYP2C9")),
    "fisetin + warfarin should flag bleeding/CYP2C9 caution",
  );

  const oleaAlp = analyze(["oleamide", "alprazolam"]).findings;
  assert.ok(
    oleaAlp.some((f) => /sedat|cns|respir/i.test(`${f.effect} ${f.mechanism} ${f.clinical}`)),
    "oleamide + alprazolam should flag additive CNS depression",
  );
});

test("catalog-modern-wave8.ts contains zero administered dose patterns", () => {
  const src = readFileSync(new URL("./catalog-modern-wave8.ts", import.meta.url), "utf8");
  assert.deepEqual(findDoses(src), []);
});
