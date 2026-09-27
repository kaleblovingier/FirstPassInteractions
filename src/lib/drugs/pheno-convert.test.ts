import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog.ts";
import { DEFAULT_HOST } from "./types.ts";
import {
  clinicalPhenoLabel,
  hasPhenoContrast,
  hasPhenoConvert,
  phenoContrastsOnDesk,
  phenoConvertOnDesk,
  phenoconversionFindings,
} from "./pheno-convert.ts";

test("paroxetine + codeine: NM genotype → PM-like on CYP2D6", () => {
  const rows = phenoConvertOnDesk(["paroxetine", "codeine"], DEFAULT_HOST);
  const d6 = rows.find((r) => r.enzyme === "CYP2D6");
  assert.ok(d6);
  assert.equal(d6!.genotype, "NM");
  assert.equal(d6!.clinical, "PM-like");
  assert.equal(d6!.shifted, true);
  assert.ok(d6!.inhibitors.some((p) => p.id === "paroxetine"));
  assert.ok(d6!.victims.some((v) => v.id === "codeine"));
});

test("before/after contrast removes perpetrator and keeps victim", () => {
  const ids = ["paroxetine", "codeine"];
  const contrasts = phenoContrastsOnDesk(ids, DEFAULT_HOST);
  const d6 = contrasts.find((c) => c.enzyme === "CYP2D6");
  assert.ok(d6);
  assert.equal(d6!.shifted, true);
  assert.deepEqual(d6!.beforeIds.sort(), ["codeine"]);
  assert.ok(d6!.afterIds.includes("paroxetine"));
  assert.ok(d6!.afterIds.includes("codeine"));
  assert.equal(d6!.beforeClinical, "NM");
  assert.equal(d6!.afterClinical, "PM-like");
  assert.ok(d6!.perpetrators.some((p) => p.id === "paroxetine" && p.kind === "inhibitor"));
  assert.match(d6!.beforeBlurb, /Lab says/i);
  assert.match(d6!.afterBlurb, /phenoconversion/i);
  assert.equal(hasPhenoContrast(ids, DEFAULT_HOST), true);
  assert.equal(hasPhenoConvert(ids, DEFAULT_HOST), true);
});

test("codeine alone has no perpetrator contrast", () => {
  const contrasts = phenoContrastsOnDesk(["codeine"], DEFAULT_HOST);
  assert.equal(contrasts.length, 0);
  assert.equal(hasPhenoContrast(["codeine"], DEFAULT_HOST), false);
});

test("clinicalPhenoLabel stays layman-friendly", () => {
  assert.equal(clinicalPhenoLabel("PM-like"), "Poor-like (blocked)");
  assert.equal(clinicalPhenoLabel("induced"), "Induced (sped up)");
  assert.equal(clinicalPhenoLabel("NM"), "Normal");
});

test("phenoconversionFindings fires for the teaching pair (host path)", () => {
  const drugs = [DRUG_BY_ID.paroxetine!, DRUG_BY_ID.codeine!];
  const findings = phenoconversionFindings(drugs, DEFAULT_HOST);
  assert.ok(findings.some((f) => f.tags.includes("phenoconversion") && f.enzymes.includes("CYP2D6")));
  assert.ok(findings.every((f) => !/mg\b|milligram/i.test(f.clinical + f.headline)));
});

test("blurbs never invent a milligram", () => {
  for (const c of phenoContrastsOnDesk(["paroxetine", "codeine", "fluoxetine"], DEFAULT_HOST)) {
    const blob = `${c.beforeBlurb} ${c.afterBlurb} ${c.pearl}`;
    assert.equal(/mg\b|milligram|dose of/i.test(blob), false, blob);
  }
});
