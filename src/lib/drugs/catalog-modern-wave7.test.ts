import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRUGS, DRUG_BY_ID, searchDrugs } from "./catalog.ts";
import { MODERN_WAVE7_FORMULARY } from "./catalog-modern-wave7.ts";
import { analyze } from "./engine.ts";
import { findDoses } from "../guards/dose-rule.ts";

const WAVE7_IDS = [
  "aniracetam",
  "oxiracetam",
  "pramiracetam",
  "fasoracetam",
  "coluracetam",
  "nefiracetam",
  "bromantane",
  "flmodafinil",
  "cerebrolysin",
  "dihexa",
  "sulforaphane",
  "cordyceps",
  "tongkat-ali",
  "agmatine",
  "taurine",
  "glycine",
  "alcar",
  "uridine-monophosphate",
  "lithium-orotate",
  "l-tryptophan",
] as const;

test("wave 7 formulary has 20 unique compounds merged cleanly into DRUG_BY_ID with globally unique catalog ids", () => {
  assert.equal(MODERN_WAVE7_FORMULARY.length, 20);
  assert.equal(DRUGS.length, Object.keys(DRUG_BY_ID).length);
  const seen = new Set<string>();
  for (const drug of DRUGS) {
    assert.equal(seen.has(drug.id), false, `duplicate catalog id ${drug.id}`);
    seen.add(drug.id);
  }
  for (const id of WAVE7_IDS) {
    const drug = DRUG_BY_ID[id];
    assert.ok(drug, `missing ${id} in DRUG_BY_ID`);
    assert.ok(drug.note && drug.note.length > 60, `note too short on ${id}`);
    assert.ok(drug.toxicityHint.trim().length > 10, `toxicityHint too short on ${id}`);
  }
  assert.equal(DRUG_BY_ID["cerebrolysin"].kind, "research-peptide");
  assert.equal(DRUG_BY_ID["dihexa"].kind, "research-peptide");
});

test("all 20 wave 7 monographs and priority aliases resolve as exact top hits via searchDrugs", () => {
  const cases: readonly [query: string, expectedId: string][] = [
    ["Aniracetam", "aniracetam"],
    ["draganon", "aniracetam"],
    ["Oxiracetam", "oxiracetam"],
    ["neuromet", "oxiracetam"],
    ["Pramiracetam", "pramiracetam"],
    ["pramistar", "pramiracetam"],
    ["Fasoracetam", "fasoracetam"],
    ["ns-105", "fasoracetam"],
    ["Coluracetam", "coluracetam"],
    ["mkc-231", "coluracetam"],
    ["Nefiracetam", "nefiracetam"],
    ["dm-9384", "nefiracetam"],
    ["Bromantane", "bromantane"],
    ["ladasten", "bromantane"],
    ["Flmodafinil", "flmodafinil"],
    ["CRL-40,940", "flmodafinil"],
    ["lauflumide", "flmodafinil"],
    ["Cerebrolysin", "cerebrolysin"],
    ["Dihexa", "dihexa"],
    ["pnb-0408", "dihexa"],
    ["Sulforaphane", "sulforaphane"],
    ["broccoli sprout extract", "sulforaphane"],
    ["Cordyceps", "cordyceps"],
    ["cordycepin", "cordyceps"],
    ["Tongkat Ali", "tongkat-ali"],
    ["Eurycoma longifolia", "tongkat-ali"],
    ["Agmatine", "agmatine"],
    ["Agmatine sulfate", "agmatine"],
    ["Taurine", "taurine"],
    ["Glycine", "glycine"],
    ["ALCAR", "alcar"],
    ["Acetyl-L-Carnitine", "alcar"],
    ["Uridine", "uridine-monophosphate"],
    ["uridine-monophosphate", "uridine-monophosphate"],
    ["triacetyluridine", "uridine-monophosphate"],
    ["Lithium Orotate", "lithium-orotate"],
    ["l-tryptophan", "l-tryptophan"],
    ["tryptophan", "l-tryptophan"],
    // Priority catalog alias fixes
    ["n-acetylcysteine", "nac"],
    ["n-acetyl-l-cysteine", "nac"],
    ["acetylcysteine", "nac"],
    ["5-htp", "five-htp"],
    ["5htp", "five-htp"],
    ["oxitriptan", "five-htp"],
    ["curcumin", "turmeric"],
    ["curcuminoids", "turmeric"],
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

test("wave 7 pharmacodynamic and CYP roles trigger expected interaction cards", () => {
  const flmodOcp = analyze(["flmodafinil", "ethinyl-estradiol"]).findings;
  assert.ok(flmodOcp.some((f) => f.enzymes.includes("CYP3A4")), "flmodafinil should induce CYP3A4");

  const trpMaoi = analyze(["l-tryptophan", "phenelzine"]).findings;
  assert.ok(trpMaoi.some((f) => f.tags.includes("serotonin")), "l-tryptophan + MAOI should flag serotonin risk");

  const aniWarf = analyze(["aniracetam", "warfarin"]).findings;
  assert.ok(aniWarf.some((f) => /bleed/i.test(f.effect)), "aniracetam + warfarin should flag bleeding caution");

  const alcarWarf = analyze(["alcar", "warfarin"]).findings;
  assert.ok(alcarWarf.some((f) => /bleed/i.test(f.effect)), "ALCAR + warfarin should flag bleeding caution");
});

test("catalog-modern-wave7.ts contains zero administered dose patterns", () => {
  const src = readFileSync(new URL("./catalog-modern-wave7.ts", import.meta.url), "utf8");
  assert.deepEqual(findDoses(src), []);
});
