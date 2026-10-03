import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog.ts";
import { analyze } from "./engine.ts";

const IDS = [
  "ginger",
  "ephedra",
  "schisandra",
  "lavender",
  "hops",
  "skullcap",
  "gymnema",
  "bitter-melon",
  "aloe",
] as const;

test("supplement wave2 rows are on the shelf and searchable", () => {
  for (const id of IDS) {
    assert.equal(DRUG_BY_ID[id]?.kind, "herb", id);
  }
  assert.equal(searchDrugs("ginger root")[0]?.id, "ginger");
  assert.equal(searchDrugs("ma huang")[0]?.id, "ephedra");
  assert.equal(searchDrugs("wuzhi")[0]?.id, "schisandra");
  assert.equal(searchDrugs("silexan")[0]?.id, "lavender");
  assert.equal(searchDrugs("gurmar")[0]?.id, "gymnema");
  assert.equal(searchDrugs("karela")[0]?.id, "bitter-melon");
  const shelf = searchDrugs("supplements").map((d) => d.id);
  for (const id of ["schisandra", "ginger", "ephedra", "gymnema", "aloe"]) {
    assert.ok(shelf.includes(id), id);
  }
});

test("wave2 CYP and PD flags are present", () => {
  const sch = DRUG_BY_ID.schisandra.enzymes;
  assert.ok(sch.some((e) => e.enzyme === "CYP3A4" && e.kind === "inhibitor" && e.strength === "moderate"));
  assert.ok(sch.some((e) => e.enzyme === "P-gp" && e.kind === "inhibitor" && e.strength === "weak"));
  assert.ok(DRUG_BY_ID.ginger.pd.includes("antiplatelet"));
  assert.ok(DRUG_BY_ID.ephedra.pd.includes("stimulant"));
  assert.ok(DRUG_BY_ID.lavender.pd.includes("cns-depressant"));
  assert.ok(DRUG_BY_ID.hops.pd.includes("cns-depressant"));
  assert.ok(DRUG_BY_ID.skullcap.pd.includes("cns-depressant"));
  assert.ok(DRUG_BY_ID.skullcap.pd.includes("hepatotoxic"));
  assert.ok(DRUG_BY_ID.gymnema.pd.includes("hypoglycemic"));
  assert.ok(DRUG_BY_ID["bitter-melon"].pd.includes("hypoglycemic"));
  assert.ok(DRUG_BY_ID.aloe.pd.includes("hypoglycemic"));
  assert.ok(DRUG_BY_ID.aloe.pd.includes("hypokalemic"));
});

test("wave2 pairs fire on documented mechanisms", () => {
  const bleed = analyze(["ginger", "warfarin"]).findings;
  assert.ok(bleed.some((f) => f.drugIds.includes("ginger") && /bleed/i.test(f.effect)));
  const pressor = analyze(["ephedra", "phenelzine"]).findings;
  assert.ok(pressor.some((f) => f.tags.includes("maoi") && f.tags.includes("pressor")));
  const cyp = analyze(["schisandra", "midazolam"]).findings;
  assert.ok(cyp.some((f) => f.kind === "pk" && f.drugIds.includes("schisandra")));
  const sedate = analyze(["lavender", "lorazepam"]).findings;
  assert.ok(sedate.some((f) => /cns|sedat/i.test(f.effect + f.headline)));
  const hypo = analyze(["gymnema", "glipizide"]).findings;
  assert.ok(hypo.some((f) => /hypo/i.test(f.effect + f.headline)));
  const dig = analyze(["aloe", "digoxin"]).findings;
  assert.ok(dig.some((f) => /digoxin|hypokal/i.test(f.effect + f.mechanism + f.headline)));
});
