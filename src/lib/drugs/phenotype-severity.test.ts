import test from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./engine";
import { DRUGS } from "./catalog";
import { DEFAULT_HOST, PHENOTYPE_ENZYMES, type HostContext, type Metabolizer, type PhenotypeEnzyme } from "./types";

// B-P0-2 option A (#231): Avoid together is kept for a named label pin. A genotype
// sketch never reads contraindicated, ultrarapid activation included.

function hostWith(enzyme: PhenotypeEnzyme, pheno: Metabolizer): HostContext {
  return { ...DEFAULT_HOST, phenotypes: { ...DEFAULT_HOST.phenotypes, [enzyme]: pheno } };
}

function genoFinding(drugId: string, enzyme: PhenotypeEnzyme, pheno: Metabolizer) {
  return analyze([drugId], hostWith(enzyme, pheno)).findings.find((f) => f.id === `geno-${enzyme}-${pheno}-${drugId}`);
}

test("ultrarapid CYP2D6 + codeine is capped at Serious concern; poor metabolizer still cannot read Avoid together", () => {
  const um = genoFinding("codeine", "CYP2D6", "UM");
  assert.ok(um, "geno-CYP2D6-UM-codeine");
  assert.equal(um.severity, "major");
  const pm = genoFinding("codeine", "CYP2D6", "PM");
  assert.ok(pm, "geno-CYP2D6-PM-codeine");
  assert.notEqual(pm.severity, "contraindicated");
});

test("no genotype sketch on any catalog drug reads contraindicated", () => {
  for (const enzyme of PHENOTYPE_ENZYMES) {
    for (const pheno of ["PM", "IM", "UM"] as const) {
      const host = hostWith(enzyme, pheno);
      for (const d of DRUGS) {
        const f = analyze([d.id], host).findings.find((x) => x.id === `geno-${enzyme}-${pheno}-${d.id}`);
        if (f) assert.notEqual(f.severity, "contraindicated", f.id);
      }
    }
  }
});
