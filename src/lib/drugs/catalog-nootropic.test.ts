import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog.ts";
import { analyze } from "./engine.ts";

const IDS = [
  "l-theanine",
  "lions-mane",
  "bacopa",
  "huperzine",
  "citicoline",
  "alpha-gpc",
  "piracetam",
  "phenylpiracetam",
  "noopept",
  "adrafinil",
  "vinpocetine",
  "kanna",
  "saffron",
  "lemon-balm",
  "gotu-kola",
  "black-seed",
  "phosphatidylserine",
  "nmn",
  "l-tyrosine",
];

test("nootropic and supplement rows are on the shelf and searchable", () => {
  for (const id of IDS) assert.equal(DRUG_BY_ID[id]?.kind, "herb", id);
  assert.equal(searchDrugs("lion's mane")[0]?.id, "lions-mane");
  assert.equal(searchDrugs("nootropil")[0]?.id, "piracetam");
  assert.equal(searchDrugs("zembrin")[0]?.id, "kanna");
  assert.equal(searchDrugs("suntheanine")[0]?.id, "l-theanine");
  const shelf = searchDrugs("nootropics").map((d) => d.id);
  for (const id of ["l-theanine", "piracetam", "huperzine", "adrafinil", "bacopa"]) {
    assert.ok(shelf.includes(id), id);
  }
});

test("quiet nootropics do not invent a pair", () => {
  for (const id of ["l-theanine", "lions-mane", "noopept", "citicoline", "nmn", "l-tyrosine"]) {
    assert.equal(analyze([id, "caffeine"]).findings.length, 0, id);
  }
});

test("piracetam bleeds, huperzine slows the node, kanna is serotonergic", () => {
  const bleed = analyze(["piracetam", "warfarin"]).findings;
  assert.ok(bleed.some((f) => f.drugIds.includes("piracetam") && /bleed/i.test(f.effect)));
  const brady = analyze(["huperzine", "metoprolol"]).findings;
  assert.ok(brady.some((f) => f.tags.includes("bradycardia")));
  const sero = analyze(["kanna", "sertraline"]).findings;
  assert.ok(sero.some((f) => f.tags.includes("serotonin") && f.severity === "major"));
});

test("bacopa is only a weak 2C19 grade and adrafinil keeps the modafinil map", () => {
  const bacopa = DRUG_BY_ID.bacopa.enzymes;
  assert.deepEqual(
    bacopa.map((e) => `${e.enzyme}:${e.kind}`),
    ["CYP2C19:inhibitor"],
  );
  assert.equal(bacopa[0].kind === "inhibitor" && bacopa[0].strength, "weak");
  const adra = DRUG_BY_ID.adrafinil;
  assert.ok(adra.pd.includes("hepatotoxic"));
  assert.ok(adra.enzymes.some((e) => e.enzyme === "CYP2C19" && e.kind === "inhibitor" && e.strength === "moderate"));
  assert.ok(adra.enzymes.some((e) => e.enzyme === "CYP3A4" && e.kind === "inducer" && e.strength === "weak"));
});

test("new shelf notes lead with everyday words", () => {
  for (const id of [...IDS, "schisandra"]) {
    const note = DRUG_BY_ID[id].note ?? "";
    const first = note.split(". ")[0];
    assert.doesNotMatch(first, /CYP|SmPC|Ramasamy|LAT1|AChE|PD\b/, `${id} opens with jargon: ${first}`);
    assert.ok(first.length > 20, id);
  }
});
