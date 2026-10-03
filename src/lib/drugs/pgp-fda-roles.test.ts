import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog.ts";

/**
 * Current FDA examples of transporter substrates and inhibitors (no P-gp
 * inducers are listed):
 * https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems
 *
 * FDA does not grade P-gp strength. Grades below follow the catalog's
 * existing bins (weak under a 2-fold AUC rise; moderate from about 2-fold
 * up to under 5-fold), using digoxin or dabigatran label AUC changes.
 * Strong was not used: it would newly mark sensitive P-gp substrates
 * contraindicated, and none of these labels do that.
 *
 * Footnote on that table: adefovir dipivoxil, oseltamivir, tenofovir
 * alafenamide, and tenofovir disoproxil prodrugs are P-gp substrates.
 * Tenofovir alafenamide already had a P-gp role. Tenofovir disoproxil is
 * graded minor from a small tenofovir AUC rise. Adefovir and oseltamivir
 * stay on the skip list: no probe-inhibitor AUC to grade.
 */

const MUST_HAVE: { id: string; kind: "inhibitor" | "substrate" }[] = [
  { id: "amiodarone", kind: "inhibitor" },
  { id: "capmatinib", kind: "inhibitor" },
  { id: "clarithromycin", kind: "inhibitor" },
  { id: "cobicistat", kind: "inhibitor" },
  { id: "cyclosporine", kind: "inhibitor" },
  { id: "dronedarone", kind: "inhibitor" },
  { id: "erythromycin", kind: "inhibitor" },
  { id: "itraconazole", kind: "inhibitor" },
  { id: "ketoconazole", kind: "inhibitor" },
  { id: "lapatinib", kind: "inhibitor" },
  { id: "lopinavir", kind: "inhibitor" },
  { id: "pirtobrutinib", kind: "inhibitor" },
  { id: "propafenone", kind: "inhibitor" },
  { id: "quinidine", kind: "inhibitor" },
  { id: "ranolazine", kind: "inhibitor" },
  { id: "rolapitant", kind: "inhibitor" },
  { id: "sofosbuvir-velpatasvir-voxilaprevir", kind: "inhibitor" },
  { id: "tucatinib", kind: "inhibitor" },
  { id: "verapamil", kind: "inhibitor" },
  { id: "dabigatran", kind: "substrate" },
  { id: "digoxin", kind: "substrate" },
  { id: "edoxaban", kind: "substrate" },
  { id: "fexofenadine", kind: "substrate" },
  { id: "loperamide", kind: "substrate" },
  { id: "tenofovir-af", kind: "substrate" },
  { id: "tenofovir-df", kind: "substrate" },
];

/** Grades added in this change. Do not raise these to strong. */
const ADDED_GRADE: Record<string, { kind: "inhibitor" | "substrate"; value: string }> = {
  capmatinib: { kind: "inhibitor", value: "weak" },
  pirtobrutinib: { kind: "inhibitor", value: "weak" },
  tucatinib: { kind: "inhibitor", value: "weak" },
  lapatinib: { kind: "inhibitor", value: "moderate" },
  propafenone: { kind: "inhibitor", value: "moderate" },
  lopinavir: { kind: "inhibitor", value: "moderate" },
  "sofosbuvir-velpatasvir-voxilaprevir": { kind: "inhibitor", value: "moderate" },
  "tenofovir-df": { kind: "substrate", value: "minor" },
};

/**
 * In the catalog, named by FDA, intentionally ungraded.
 * No topical-only row was on the current P-gp list.
 */
const SKIP_UNGRADED: { id: string; why: string }[] = [
  {
    id: "adefovir",
    why: "Hepsera is adefovir dipivoxil. The FDA footnote calls that prodrug a P-gp substrate, but the label has no probe-inhibitor AUC, so sensitivity stays ungraded.",
  },
  {
    id: "oseltamivir",
    why: "Tamiflu is the prodrug the FDA footnote calls a P-gp substrate. The active carboxylate is not that victim, and the label has no probe-inhibitor AUC to grade.",
  },
];

/** FDA-listed, not in this catalog. Not invented here. */
const NOT_IN_CATALOG = ["belumosudil", "danicopan", "fostamatinib", "saquinavir"];

test("FDA-listed P-gp roles present in the catalog are carried", () => {
  for (const row of MUST_HAVE) {
    const drug = DRUG_BY_ID[row.id];
    assert.ok(drug, `missing catalog drug ${row.id}`);
    assert.ok(
      drug.enzymes.some((e) => e.enzyme === "P-gp" && e.kind === row.kind),
      `${row.id} lacks P-gp ${row.kind}`,
    );
  }
});

test("newly added P-gp grades stay at the conservative bin", () => {
  for (const [id, expect] of Object.entries(ADDED_GRADE)) {
    const drug = DRUG_BY_ID[id];
    assert.ok(drug, id);
    const role = drug.enzymes.find((e) => e.enzyme === "P-gp" && e.kind === expect.kind);
    assert.ok(role, `${id} missing ${expect.kind}`);
    const value = role.kind === "substrate" ? role.sensitivity : role.strength;
    assert.equal(value, expect.value, id);
  }
});

test("documented P-gp skip list stays ungraded", () => {
  for (const row of SKIP_UNGRADED) {
    const drug = DRUG_BY_ID[row.id];
    assert.ok(drug, row.id);
    assert.ok(row.why.length > 20, row.id);
    assert.equal(
      drug.enzymes.some((e) => e.enzyme === "P-gp"),
      false,
      `${row.id} grew a P-gp role; drop it from the skip list`,
    );
  }
  for (const id of NOT_IN_CATALOG) {
    assert.equal(DRUG_BY_ID[id], undefined, id);
  }
});
