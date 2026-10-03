import test from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./engine.ts";
import { DRUG_BY_ID } from "./catalog.ts";
import type { Severity } from "./types.ts";

const RANK: Record<Severity, number> = { contraindicated: 4, major: 3, moderate: 2, minor: 1 };

function pairSeverity(a: string, b: string): Severity | "none" {
  let best: Severity | "none" = "none";
  for (const f of analyze([a, b]).findings) {
    if (!f.drugIds.includes(a) || !f.drugIds.includes(b)) continue;
    if (best === "none" || RANK[f.severity] > RANK[best]) best = f.severity;
  }
  return best;
}

test("methylene blue is modeled as an MAOI, with no invented CYP grades", () => {
  const mb = DRUG_BY_ID["methylene-blue"];
  assert.ok(mb, "methylene-blue is on the shelf");
  assert.ok(mb.pd.includes("maoi"));
  assert.ok(mb.pd.includes("serotonergic"));
  assert.deepEqual(mb.enzymes, []);
  for (const id of ["phenelzine", "tranylcypromine"] as const) {
    const maoi = DRUG_BY_ID[id];
    assert.ok(maoi.pd.includes("maoi") && maoi.pd.includes("serotonergic"), id);
  }
});

test("methylene blue plus an SSRI is at least major and matches other MAOIs", () => {
  const sev = pairSeverity("methylene-blue", "sertraline");
  assert.ok(sev === "major" || sev === "contraindicated", sev);
  assert.equal(sev, pairSeverity("phenelzine", "sertraline"));
  assert.equal(sev, pairSeverity("tranylcypromine", "sertraline"));
  const stim = pairSeverity("methylene-blue", "amphetamine");
  assert.equal(stim, pairSeverity("tranylcypromine", "amphetamine"));
});
