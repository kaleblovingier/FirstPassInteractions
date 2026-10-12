/**
 * Wave 7: current DailyMed labels where every graded role is one class word.
 * Teaching data. Not a dose. P-gp lines with no potency word, victim-only
 * lines, and BCRP are not scored.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog";
import type { EnzymeRole } from "./types";

test("wave7 catalog rows use one class word per role", () => {
  const cases = [
    {
      id: "berotralstat",
      query: "Orladeyo",
      roles: [
        { enzyme: "CYP2D6", kind: "inhibitor", grade: "moderate" },
        { enzyme: "CYP3A4", kind: "inhibitor", grade: "moderate" },
        { enzyme: "CYP2C9", kind: "inhibitor", grade: "weak" },
        { enzyme: "CYP2C19", kind: "inhibitor", grade: "weak" },
      ],
    },
    { id: "fexinidazole", query: "fexinidazole", roles: [{ enzyme: "CYP3A4", kind: "inducer", grade: "moderate" }] },
    { id: "glycerol-phenylbutyrate", query: "Ravicti", roles: [{ enzyme: "CYP3A4", kind: "inducer", grade: "weak" }] },
    { id: "bictegravir-lenacapavir", query: "Bixlenvo", roles: [{ enzyme: "CYP3A4", kind: "inhibitor", grade: "moderate" }] },
  ] as const;
  for (const c of cases) {
    const drug = DRUG_BY_ID[c.id];
    assert.ok(drug, c.id);
    assert.equal(searchDrugs(c.query)[0]?.id, c.id);
    assert.equal(searchDrugs(c.id)[0]?.id, c.id);
    assert.doesNotMatch(`${drug.toxicityHint ?? ""} ${drug.note ?? ""}`, /\b\d+(\.\d+)?\s*(mg|mcg|g)\b/i);
    const graded = drug.enzymes.filter(
      (r): r is Extract<EnzymeRole, { kind: "inhibitor" | "inducer" }> =>
        r.kind === "inhibitor" || r.kind === "inducer",
    );
    assert.equal(graded.length, c.roles.length, c.id);
    for (const want of c.roles) {
      const role = graded.find((r) => r.enzyme === want.enzyme && r.kind === want.kind);
      assert.ok(role, `${c.id} ${want.enzyme} ${want.kind}`);
      assert.equal(role.strength, want.grade, c.id);
    }
  }
});
