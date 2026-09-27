/**
 * Catalog CYP roles aligned to FDA's Table 1 examples (wave 1).
 * Teaching data only. Not a dose.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, DRUGS } from "./catalog";
import type { Enzyme, EnzymeRole } from "./types";

type Kind = EnzymeRole["kind"];

function grades(id: string, enzyme: Enzyme, kind: Kind): string[] {
  const drug = DRUG_BY_ID[id];
  assert.ok(drug, `${id} is on the shelf`);
  return drug.enzymes
    .filter((r) => r.enzyme === enzyme && r.kind === kind)
    .map((r) => (r.kind === "substrate" ? r.sensitivity : r.strength) as string);
}

function expectRole(id: string, enzyme: Enzyme, kind: Kind, grade: string) {
  assert.deepEqual(grades(id, enzyme, kind), [grade], `${id} ${enzyme} ${kind}`);
}

test("tucatinib: strong 3A inhibitor, weak 2C8 inhibitor, 2C8 substrate (every Tukysa row)", () => {
  const rows = DRUGS.filter((d) => d.brands.includes("Tukysa"));
  assert.ok(rows.length >= 1);
  for (const d of rows) {
    expectRole(d.id, "CYP3A4", "inhibitor", "strong");
    expectRole(d.id, "CYP2C8", "inhibitor", "weak");
    expectRole(d.id, "CYP2C8", "substrate", "major");
    assert.doesNotMatch(d.toxicityHint ?? "", /Strong 2C8/);
  }
});

test("ceritinib is a strong 3A inhibitor", () => {
  expectRole("ceritinib", "CYP3A4", "inhibitor", "strong");
  expectRole("ceritinib", "CYP2C9", "inhibitor", "weak");
});

test("ivosidenib is a strong 3A inducer", () => {
  expectRole("ivosidenib", "CYP3A4", "inducer", "strong");
});

test("fluoxetine is a strong 2C19 inhibitor", () => {
  expectRole("fluoxetine", "CYP2C19", "inhibitor", "strong");
  expectRole("fluoxetine", "CYP2D6", "inhibitor", "strong");
});

test("carbamazepine: strong 2B6 inducer, weak 2C9 inducer", () => {
  expectRole("carbamazepine", "CYP2B6", "inducer", "strong");
  expectRole("carbamazepine", "CYP2C9", "inducer", "weak");
  expectRole("carbamazepine", "CYP3A4", "inducer", "strong");
});

test("rifampin, phenobarbital, grapefruit, ciprofloxacin match FDA grades", () => {
  expectRole("rifampin", "CYP3A4", "inducer", "strong");
  expectRole("rifampin", "CYP2C19", "inducer", "strong");
  expectRole("rifampin", "CYP2B6", "inducer", "moderate");
  expectRole("rifampin", "CYP2C9", "inducer", "moderate");
  expectRole("rifampin", "CYP2C8", "inducer", "moderate");
  expectRole("rifampin", "CYP1A2", "inducer", "moderate");
  expectRole("phenobarbital", "CYP3A4", "inducer", "moderate");
  expectRole("primidone", "CYP3A4", "inducer", "moderate");
  expectRole("grapefruit", "CYP3A4", "inhibitor", "moderate");
  expectRole("ciprofloxacin", "CYP1A2", "inhibitor", "moderate");
  expectRole("ciprofloxacin", "CYP3A4", "inhibitor", "moderate");
});

test("other perpetrator grades aligned to FDA", () => {
  const cases: [string, Enzyme, Kind, string][] = [
    ["abiraterone", "CYP2D6", "inhibitor", "moderate"],
    ["cinacalcet", "CYP2D6", "inhibitor", "moderate"],
    ["amiodarone", "CYP3A4", "inhibitor", "weak"],
    ["apalutamide", "CYP2C19", "inducer", "moderate"],
    ["armodafinil", "CYP3A4", "inducer", "weak"],
    ["modafinil", "CYP3A4", "inducer", "weak"],
    ["cimetidine", "CYP1A2", "inhibitor", "weak"],
    ["cimetidine", "CYP2D6", "inhibitor", "weak"],
    ["cimetidine", "CYP3A4", "inhibitor", "weak"],
    ["conivaptan", "CYP3A4", "inhibitor", "moderate"],
    ["cyclosporine", "CYP3A4", "inhibitor", "weak"],
    ["etravirine", "CYP3A4", "inducer", "moderate"],
    ["fluconazole", "CYP2C9", "inhibitor", "moderate"],
    ["fosaprepitant", "CYP3A4", "inhibitor", "weak"],
    ["nevirapine", "CYP2B6", "inducer", "weak"],
    ["omeprazole", "CYP2C19", "inhibitor", "weak"],
    ["teriflunomide", "CYP1A2", "inducer", "moderate"],
    ["voriconazole", "CYP2C9", "inhibitor", "weak"],
    ["zileuton", "CYP1A2", "inhibitor", "weak"],
  ];
  for (const [id, e, k, g] of cases) expectRole(id, e, k, g);
});

test("missing FDA-listed roles are now on the rows", () => {
  const cases: [string, Enzyme, Kind, string][] = [
    ["crizotinib", "CYP3A4", "inhibitor", "moderate"],
    ["imatinib", "CYP3A4", "inhibitor", "moderate"],
    ["dabrafenib", "CYP3A4", "inducer", "moderate"],
    ["lorlatinib", "CYP3A4", "inducer", "moderate"],
    ["repotrectinib", "CYP3A4", "inducer", "moderate"],
    ["efavirenz", "CYP2C19", "inducer", "moderate"],
    ["phenytoin", "CYP1A2", "inducer", "moderate"],
    ["felbamate", "CYP2C19", "inhibitor", "moderate"],
    ["deferasirox", "CYP2C8", "inhibitor", "moderate"],
    ["mexiletine", "CYP1A2", "inhibitor", "moderate"],
    ["capmatinib", "CYP1A2", "inhibitor", "moderate"],
    ["vemurafenib", "CYP1A2", "inhibitor", "moderate"],
    ["ethinyl-estradiol", "CYP1A2", "inhibitor", "moderate"],
    ["selpercatinib", "CYP2C8", "inhibitor", "moderate"],
    ["pirtobrutinib", "CYP2C8", "inhibitor", "moderate"],
    ["piperine", "CYP2C9", "inhibitor", "moderate"],
    ["alosetron", "CYP1A2", "substrate", "sensitive"],
    ["mobocertinib", "CYP3A4", "substrate", "sensitive"],
    ["pimozide", "CYP2D6", "substrate", "major"],
    ["trimipramine", "CYP2D6", "substrate", "major"],
    ["rabeprazole", "CYP2C19", "substrate", "major"],
    ["tazemetostat", "CYP3A4", "substrate", "major"],
  ];
  for (const [id, e, k, g] of cases) expectRole(id, e, k, g);
});

test("changed rows carry no milligram doses in their text", () => {
  for (const id of ["tucatinib", "ceritinib", "ivosidenib", "ciprofloxacin", "modafinil", "phenobarbital", "deferasirox", "conivaptan"]) {
    const d = DRUG_BY_ID[id];
    assert.doesNotMatch(`${d.toxicityHint ?? ""} ${d.note ?? ""}`, /\d+\s*(mg|mcg)\b/i, id);
  }
});
