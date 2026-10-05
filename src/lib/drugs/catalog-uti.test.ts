import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog.ts";
import { analyze } from "./engine.ts";

test("UTI antibiotic search includes both newer agents and established options", () => {
  assert.deepEqual(
    searchDrugs("cystitis antibiotics").map((drug) => drug.id),
    ["nitrofurantoin", "fosfomycin", "pivmecillinam", "gepotidacin", "sulopenem", "tmp-smx"],
  );
  assert.equal(searchDrugs("Blujepa")[0]?.id, "gepotidacin");
  assert.equal(searchDrugs("Pivya")[0]?.id, "pivmecillinam");
  assert.equal(searchDrugs("Orlynvah")[0]?.id, "sulopenem");
});

test("gepotidacin carries its labeled CYP3A4 and QTc cautions", () => {
  const gepotidacin = DRUG_BY_ID.gepotidacin;
  assert.ok(
    gepotidacin.enzymes.some((role) => role.kind === "substrate" && role.enzyme === "CYP3A4"),
  );
  assert.ok(gepotidacin.pd.includes("qt-known"));
  assert.match(gepotidacin.note ?? "", /52% lower AUC with rifampin/i);
  assert.match(gepotidacin.note ?? "", /above the approved dosage/i);
  assert.ok(
    analyze(["gepotidacin", "ketoconazole"]).findings.some((finding) =>
      finding.drugIds.includes("gepotidacin"),
    ),
  );
});

test("pivmecillinam records label cautions without inventing an interaction map", () => {
  const pivmecillinam = DRUG_BY_ID.pivmecillinam;
  assert.deepEqual(pivmecillinam.enzymes, []);
  assert.deepEqual(pivmecillinam.pd, []);
  assert.match(pivmecillinam.note ?? "", /false-positive newborn screen/i);
  assert.match(pivmecillinam.note ?? "", /carnitine depletion/i);
  assert.match(pivmecillinam.note ?? "", /dailymed\.nlm\.nih\.gov/i);
});

test("ensifentrine separates in-vitro metabolism from clinically graded interactions", () => {
  const ensifentrine = DRUG_BY_ID.ensifentrine;
  assert.deepEqual(ensifentrine.enzymes, []);
  assert.deepEqual(ensifentrine.pd, []);
  assert.match(ensifentrine.note ?? "", /predominantly by CYP2C9/i);
  assert.match(ensifentrine.note ?? "", /not rescue therapy/i);
  assert.match(ensifentrine.note ?? "", /dailymed\.nlm\.nih\.gov/i);
});

test("sotatercept records label monitoring and bleeding context without a fabricated interaction grade", () => {
  const sotatercept = DRUG_BY_ID.sotatercept;
  assert.deepEqual(sotatercept.enzymes, []);
  assert.deepEqual(sotatercept.pd, []);
  assert.match(sotatercept.note ?? "", /first 5 doses/i);
  assert.match(sotatercept.note ?? "", /prostacyclin/i);
  assert.match(sotatercept.note ?? "", /4 months after the last dose/i);
  assert.match(sotatercept.note ?? "", /dailymed\.nlm\.nih\.gov/i);
});
