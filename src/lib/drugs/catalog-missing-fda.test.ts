/**
 * FDA Table 1 names that were missing from the catalog, added only where a
 * current DailyMed label uses one class word the engine already scores.
 * Teaching data. Not a dose.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog";
import { FDA_DDI_TABLE } from "./reference/fda-ddi-table";
import { classifyPair } from "./reference/validate-fda";

test("lazertinib, pexidartinib, and resmetirom resolve and match the label-backed FDA role", () => {
  const cases = [
    { id: "lazertinib", query: "Lazcluze", fda: "Lazertinib", enzyme: "CYP3A4", kind: "inhibitor", grade: "weak" },
    { id: "pexidartinib", query: "Turalio", fda: "pexidartinib", enzyme: "CYP3A4", kind: "inducer", grade: "moderate" },
    { id: "resmetirom", query: "Rezdiffra", fda: "resmetirom", enzyme: "CYP2C8", kind: "inhibitor", grade: "weak" },
  ] as const;
  for (const c of cases) {
    const drug = DRUG_BY_ID[c.id];
    assert.ok(drug, c.id);
    assert.equal(searchDrugs(c.query)[0]?.id, c.id);
    assert.equal(searchDrugs(c.fda)[0]?.id, c.id);
    assert.doesNotMatch(`${drug.toxicityHint ?? ""} ${drug.note ?? ""}`, /\b\d+(\.\d+)?\s*(mg|mcg|g)\b/i);
    const role = drug.enzymes.find((r) => r.enzyme === c.enzyme && r.kind === c.kind);
    assert.ok(role && role.kind !== "substrate" && role.strength === c.grade, c.id);
    const row = FDA_DDI_TABLE.find((e) => e.drug === c.fda && e.target === c.enzyme && e.kind === c.kind);
    assert.ok(row, c.fda);
    assert.equal(classifyPair(row, drug.enzymes), "match", c.id);
  }
});

test("resmetirom stays ungraded as a 2C8 substrate", () => {
  const drug = DRUG_BY_ID.resmetirom;
  assert.ok(drug);
  assert.equal(drug.enzymes.some((r) => r.kind === "substrate"), false);
});

test("topical azoles stay ungraded", () => {
  for (const id of ["clotrimazole", "miconazole", "clotrimazole-troche"]) {
    assert.equal(DRUG_BY_ID[id]?.enzymes.length, 0, id);
  }
});
