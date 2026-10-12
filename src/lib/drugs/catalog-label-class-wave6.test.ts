/**
 * Wave 6: roles taken from one class word on the current DailyMed label.
 * Each row keeps its existing victim role and adds one perpetrator role.
 * Ranges, in-vitro-only lines, and unmodeled transporters are not scored.
 * Teaching data. Not a dose.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog";
import type { EnzymeRole } from "./types";

test("wave6 catalog rows add one class-word perpetrator role each", () => {
  const cases = [
    { id: "avacopan", query: "Tavneos", enzyme: "CYP3A4", kind: "inhibitor", grade: "moderate" },
    { id: "abrocitinib", query: "Cibinqo", enzyme: "CYP2C19", kind: "inhibitor", grade: "moderate" },
    { id: "palbociclib", query: "Ibrance", enzyme: "CYP3A4", kind: "inhibitor", grade: "weak" },
    { id: "encorafenib", query: "Braftovi", enzyme: "CYP3A4", kind: "inducer", grade: "strong" },
    { id: "asenapine", query: "Saphris", enzyme: "CYP2D6", kind: "inhibitor", grade: "weak" },
  ] as const;
  for (const c of cases) {
    const drug = DRUG_BY_ID[c.id];
    assert.ok(drug, c.id);
    assert.equal(searchDrugs(c.query)[0]?.id, c.id);
    assert.doesNotMatch(`${drug.toxicityHint ?? ""} ${drug.note ?? ""}`, /\b\d+(\.\d+)?\s*(mg|mcg|g)\b/i);
    const graded = drug.enzymes.filter(
      (r): r is Extract<EnzymeRole, { kind: "inhibitor" | "inducer" }> =>
        r.kind === "inhibitor" || r.kind === "inducer",
    );
    assert.equal(graded.length, 1, c.id);
    assert.equal(graded[0].enzyme, c.enzyme, c.id);
    assert.equal(graded[0].kind, c.kind, c.id);
    assert.equal(graded[0].strength, c.grade, c.id);
  }
});
