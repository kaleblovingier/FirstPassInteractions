/**
 * 2024–2026 labels where every graded role is one class word.
 * A row may carry more than one role. Teaching data. Not a dose.
 * Ungraded transporters and in vitro lines with no class word are not scored.
 * P-gp lines with no potency word (levoketoconazole, trofinetide) are not graded.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog";
import type { EnzymeRole } from "./types";

test("wave4 catalog rows use one class word per role", () => {
  const cases = [
    { id: "vonoprazan", query: "Voquezna", roles: [{ enzyme: "CYP3A4", kind: "inhibitor", grade: "weak" }] },
    { id: "levoketoconazole", query: "Recorlev", roles: [{ enzyme: "CYP3A4", kind: "inhibitor", grade: "strong" }] },
    { id: "trofinetide", query: "Daybue", roles: [{ enzyme: "CYP3A4", kind: "inhibitor", grade: "weak" }] },
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
