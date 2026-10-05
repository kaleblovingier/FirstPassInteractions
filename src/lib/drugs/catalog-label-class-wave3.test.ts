/**
 * 2024–2026 labels where every graded role is one class word.
 * A row may carry more than one role. Teaching data. Not a dose.
 * Ungraded transporters and in vitro lines with no class word are not scored.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog";
import type { EnzymeRole } from "./types";

test("wave3 catalog rows use one class word per role", () => {
  const cases = [
    {
      id: "relacorilant",
      query: "Lifyorli",
      roles: [
        { enzyme: "CYP3A4", kind: "inhibitor", grade: "strong" },
        { enzyme: "CYP2C8", kind: "inducer", grade: "weak" },
      ],
    },
    {
      id: "lonafarnib",
      query: "Zokinvy",
      roles: [
        { enzyme: "CYP3A4", kind: "inhibitor", grade: "strong" },
        { enzyme: "CYP2C19", kind: "inhibitor", grade: "moderate" },
        { enzyme: "P-gp", kind: "inhibitor", grade: "weak" },
      ],
    },
    {
      id: "omaveloxolone",
      query: "Skyclarys",
      roles: [
        { enzyme: "CYP3A4", kind: "inducer", grade: "weak" },
        { enzyme: "CYP2C8", kind: "inducer", grade: "weak" },
      ],
    },
    {
      id: "sparsentan",
      query: "Filspari",
      roles: [
        { enzyme: "CYP2B6", kind: "inducer", grade: "weak" },
        { enzyme: "CYP2C9", kind: "inducer", grade: "weak" },
        { enzyme: "CYP2C19", kind: "inducer", grade: "moderate" },
        { enzyme: "P-gp", kind: "inhibitor", grade: "weak" },
      ],
    },
    {
      id: "nitisinone",
      query: "Orfadin",
      roles: [
        { enzyme: "CYP2C9", kind: "inhibitor", grade: "moderate" },
        { enzyme: "CYP2E1", kind: "inducer", grade: "weak" },
      ],
    },
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
