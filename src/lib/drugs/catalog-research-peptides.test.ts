import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog.ts";
import { analyze } from "./engine.ts";

const PEPTIDES = ["semax", "selank", "bpc-157"];

test("research peptides are distinctly labeled and searchable", () => {
  assert.deepEqual(
    searchDrugs("peptides").map((drug) => drug.id),
    PEPTIDES,
  );
  assert.deepEqual(
    searchDrugs("research peptide").map((drug) => drug.id),
    PEPTIDES,
  );
  for (const id of PEPTIDES) {
    assert.equal(DRUG_BY_ID[id]?.kind, "research-peptide", id);
    assert.ok(
      searchDrugs(DRUG_BY_ID[id].name).some((drug) => drug.id === id),
      id,
    );
  }
  assert.deepEqual(
    searchDrugs("peptides", ["selank"]).map((drug) => drug.id),
    ["semax", "bpc-157"],
  );
});

test("research peptide rows do not invent CYP, PD, or interaction grades", () => {
  for (const id of PEPTIDES) {
    assert.deepEqual(DRUG_BY_ID[id].enzymes, [], id);
    assert.deepEqual(DRUG_BY_ID[id].pd, [], id);
    assert.equal(analyze([id, "midazolam"]).findings.length, 0, id);
    assert.match(DRUG_BY_ID[id].note ?? "", /not evidence of safety/i, id);
  }
});

test("BPC-157 carries a specific FDA compounding-risk reference", () => {
  assert.match(DRUG_BY_ID["bpc-157"].note ?? "", /immunogenicity/i);
  assert.match(DRUG_BY_ID["bpc-157"].note ?? "", /FDA\.gov/i);
});
