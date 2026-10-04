/**
 * 2024–2026 labels that name exactly one class word for one enzyme role.
 * Teaching data. Not a dose. Ungraded transporters on the same label are not scored.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog";

test("wave2 catalog rows use the label's one class word", () => {
  const cases = [
    { id: "elafibranor", query: "Iqirvo", enzyme: "CYP3A4", kind: "inducer", grade: "weak" },
    { id: "givinostat", query: "Duvyzat", enzyme: "CYP3A4", kind: "inhibitor", grade: "weak" },
    { id: "rilzabrutinib", query: "Wayrilz", enzyme: "CYP3A4", kind: "inhibitor", grade: "moderate" },
    { id: "brensocatib", query: "Brinsupri", enzyme: "CYP3A4", kind: "inducer", grade: "weak" },
    { id: "ensitrelvir", query: "Xocova", enzyme: "CYP3A4", kind: "inhibitor", grade: "strong" },
  ] as const;
  for (const c of cases) {
    const drug = DRUG_BY_ID[c.id];
    assert.ok(drug, c.id);
    assert.equal(searchDrugs(c.query)[0]?.id, c.id);
    assert.equal(searchDrugs(c.id)[0]?.id, c.id);
    assert.doesNotMatch(`${drug.toxicityHint ?? ""} ${drug.note ?? ""}`, /\b\d+(\.\d+)?\s*(mg|mcg|g)\b/i);
    const graded = drug.enzymes.filter((r) => r.kind === "inhibitor" || r.kind === "inducer");
    assert.equal(graded.length, 1, c.id);
    const role = graded[0];
    assert.equal(role.enzyme, c.enzyme, c.id);
    assert.equal(role.kind, c.kind, c.id);
    assert.equal(role.strength, c.grade, c.id);
  }
});

test("topical azoles stay ungraded", () => {
  for (const id of ["clotrimazole", "miconazole", "clotrimazole-troche"]) {
    assert.equal(DRUG_BY_ID[id]?.enzymes.length, 0, id);
  }
});
