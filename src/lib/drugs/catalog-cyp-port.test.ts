import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import type { EnzymeRole } from "./types";

function roles(id: string): EnzymeRole[] {
  const drug = DRUG_BY_ID[id];
  assert.ok(drug, `${id} is on the shelf`);
  return drug.enzymes;
}

function has(id: string, want: Partial<EnzymeRole>): boolean {
  return roles(id).some((r) =>
    Object.entries(want).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v),
  );
}

test("sufentanil and alfentanil carry a CYP3A4 substrate role (ported from wave 2)", () => {
  assert.ok(has("sufentanil", { enzyme: "CYP3A4", kind: "substrate", sensitivity: "major" }));
  assert.ok(has("alfentanil", { enzyme: "CYP3A4", kind: "substrate", sensitivity: "sensitive" }));
});

test("other ported wave-2 roles land on the existing rows", () => {
  assert.ok(has("zavegepant", { enzyme: "CYP3A4", kind: "substrate", sensitivity: "minor" }));
  assert.ok(has("ibrexafungerp", { enzyme: "CYP3A4", kind: "substrate", sensitivity: "major" }));
  assert.ok(has("tecovirimat", { enzyme: "CYP2C8", kind: "inhibitor", strength: "weak" }));
  assert.ok(has("tecovirimat", { enzyme: "CYP2C19", kind: "inhibitor", strength: "weak" }));
  assert.ok(has("tecovirimat", { enzyme: "CYP3A4", kind: "inducer", strength: "weak" }));
  assert.ok(has("sotorasib", { enzyme: "P-gp", kind: "inhibitor", strength: "moderate" }));
});

test("sotorasib keeps its existing 3A4 map (moderate inducer, no 3A4 inhibitor role)", () => {
  assert.ok(has("sotorasib", { enzyme: "CYP3A4", kind: "substrate", sensitivity: "major" }));
  assert.ok(has("sotorasib", { enzyme: "CYP3A4", kind: "inducer", strength: "moderate" }));
  assert.ok(!has("sotorasib", { enzyme: "CYP3A4", kind: "inhibitor" }));
});
