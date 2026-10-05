/**
 * 2024–2026 labels (plus telithromycin) where every graded role is one class word.
 * A row may carry more than one role. Teaching data. Not a dose.
 * Ranges (elagolix CYP3A weak-to-moderate), victim-only lines, and P-gp/CYP
 * lines with no potency word are not scored. BCRP is not modeled.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog";
import type { EnzymeRole } from "./types";

test("wave5 catalog rows use one class word per role", () => {
  const cases = [
    { id: "elagolix", query: "Orilissa", roles: [{ enzyme: "CYP2C19", kind: "inhibitor", grade: "weak" }] },
    {
      id: "camizestrant",
      query: "Etcamah",
      roles: [
        { enzyme: "CYP2C9", kind: "inhibitor", grade: "strong" },
        { enzyme: "CYP2C19", kind: "inhibitor", grade: "strong" },
      ],
    },
    { id: "tipranavir", query: "Aptivus", roles: [{ enzyme: "P-gp", kind: "inhibitor", grade: "weak" }] },
    { id: "telithromycin", query: "Ketek", roles: [{ enzyme: "CYP3A4", kind: "inhibitor", grade: "strong" }] },
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
