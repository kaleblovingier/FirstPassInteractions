import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, DRUGS, searchDrugs } from "./catalog";
import type { Enzyme } from "./types";

function grade(id: string, enzyme: Enzyme, kind: "inhibitor" | "substrate") {
  const r = DRUG_BY_ID[id].enzymes.find((e) => e.enzyme === enzyme && e.kind === kind);
  if (!r) return undefined;
  return r.kind === "substrate" ? r.sensitivity : r.strength;
}

test("cobicistat-boosted combo tablets carry strong CYP3A4 inhibition and the 3A4 victim role", () => {
  for (const id of ["darunavir-cobicistat", "darunavir-cobicistat-ftc-taf", "atazanavir-cobicistat"]) {
    assert.equal(grade(id, "CYP3A4", "inhibitor"), "strong", id);
    assert.equal(grade(id, "CYP2D6", "inhibitor"), "weak", id);
    assert.equal(grade(id, "CYP3A4", "substrate"), "major", id);
    assert.doesNotMatch(DRUG_BY_ID[id].toxicityHint ?? "", /\bmg\b|→|->/);
  }
  assert.equal(grade("atazanavir-cobicistat", "CYP2C8", "inhibitor"), "weak");
});

test("plain darunavir and atazanavir keep the boosted (strong) grade; notes say so", () => {
  assert.equal(grade("darunavir", "CYP3A4", "inhibitor"), "strong");
  assert.match(DRUG_BY_ID.darunavir.toxicityHint ?? "", /ritonavir or cobicistat/);
  assert.equal(grade("atazanavir", "CYP3A4", "inhibitor"), "strong");
  assert.match(DRUG_BY_ID.atazanavir.toxicityHint ?? "", /Unboosted Reyataz is a moderate 3A4 inhibitor/);
});

test("tucatinib is one catalog row, still found by brand and name", () => {
  assert.equal(DRUG_BY_ID["tucatinib-her2"], undefined);
  const rows = DRUGS.filter((d) => d.brands.includes("Tukysa") || d.name === "Tucatinib");
  assert.deepEqual(rows.map((d) => d.id), ["tucatinib"]);
  for (const q of ["tukysa", "Tukysa", "tucatinib"]) {
    assert.equal(searchDrugs(q)[0]?.id, "tucatinib", q);
  }
});
