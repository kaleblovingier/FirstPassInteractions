import test from "node:test";
import assert from "node:assert/strict";
import type { Drug, EnzymeRole } from "../types.ts";
import type { FdaDdiEntry } from "./fda-ddi-table.ts";
import { FDA_DDI_TABLE, FDA_DDI_SOURCE } from "./fda-ddi-table.ts";
import { buildCatalogMatcher, classifyPair, validateAgainstFda } from "./validate-fda.ts";

function drug(id: string, name: string, enzymes: EnzymeRole[], extra: Partial<Drug> = {}): Drug {
  return { id, name, brands: [], cls: "Test", aliases: [], enzymes, pd: [], toxicityHint: "", kind: "drug", ...extra };
}
const inh = (enzyme: EnzymeRole["enzyme"], strength: "strong" | "moderate" | "weak"): EnzymeRole => ({ enzyme, kind: "inhibitor", strength });
const ind = (enzyme: EnzymeRole["enzyme"], strength: "strong" | "moderate" | "weak"): EnzymeRole => ({ enzyme, kind: "inducer", strength });
const sub = (enzyme: EnzymeRole["enzyme"], sensitivity: "sensitive" | "major" | "minor"): EnzymeRole => ({
  enzyme,
  kind: "substrate",
  sensitivity,
  pathway: "clearance",
});
const row = (drug: string, target: FdaDdiEntry["target"], kind: FdaDdiEntry["kind"], fdaClass: string | null): FdaDdiEntry =>
  ({ drug, target, kind, fdaClass, cell: "", footnotes: [] }) as FdaDdiEntry;

test("classifyPair: exact, strength, direction, missing", () => {
  assert.equal(classifyPair(row("x", "CYP3A4", "inhibitor", "strong"), [inh("CYP3A4", "strong")]), "match");
  assert.equal(classifyPair(row("x", "CYP3A4", "inhibitor", "strong"), [inh("CYP3A4", "moderate")]), "strength_mismatch");
  assert.equal(classifyPair(row("x", "CYP3A4", "inducer", "weak"), [inh("CYP3A4", "weak")]), "direction_mismatch");
  assert.equal(classifyPair(row("x", "CYP3A4", "inhibitor", "weak"), [ind("CYP3A4", "weak")]), "direction_mismatch");
  assert.equal(classifyPair(row("x", "CYP3A4", "inhibitor", "weak"), [inh("CYP2D6", "weak")]), "missing_in_catalog");
  assert.equal(classifyPair(row("x", "CYP3A4", "inhibitor", "weak"), [sub("CYP3A4", "major")]), "missing_in_catalog");
});

test("classifyPair: a same-kind role wins over an opposite-kind role on the target", () => {
  assert.equal(classifyPair(row("x", "CYP3A4", "inducer", "strong"), [inh("CYP3A4", "weak"), ind("CYP3A4", "strong")]), "match");
});

test("classifyPair: substrate grades map sensitive↔sensitive, moderate-sensitive↔major", () => {
  assert.equal(classifyPair(row("x", "CYP3A4", "substrate", "sensitive"), [sub("CYP3A4", "sensitive")]), "match");
  assert.equal(classifyPair(row("x", "CYP3A4", "substrate", "moderate-sensitive"), [sub("CYP3A4", "major")]), "match");
  assert.equal(classifyPair(row("x", "CYP3A4", "substrate", "sensitive"), [sub("CYP3A4", "major")]), "strength_mismatch");
  assert.equal(classifyPair(row("x", "CYP3A4", "substrate", "moderate-sensitive"), [sub("CYP3A4", "minor")]), "strength_mismatch");
  assert.equal(classifyPair(row("x", "CYP3A4", "substrate", "sensitive"), [inh("CYP3A4", "strong")]), "missing_in_catalog");
});

test("classifyPair: ungraded P-gp rows compare role presence only", () => {
  assert.equal(classifyPair(row("x", "P-gp", "inhibitor", null), [inh("P-gp", "weak")]), "match");
  assert.equal(classifyPair(row("x", "P-gp", "substrate", null), [sub("P-gp", "minor")]), "match");
  assert.equal(classifyPair(row("x", "P-gp", "inhibitor", null), []), "missing_in_catalog");
});

test("matcher: id > name > alias > brand, salt forms and 'and' combos, reviewed aliases", () => {
  const drugs = [
    drug("aprepitant", "Aprepitant", [], { aliases: ["fosaprepitant"] }),
    drug("fosaprepitant", "Fosaprepitant", []),
    drug("lopinavir", "Lopinavir/ritonavir", []),
    drug("metoprolol", "Metoprolol", [], { brands: ["Lopressor"] }),
    drug("dabigatran", "Dabigatran", []),
  ];
  const m = buildCatalogMatcher(drugs);
  assert.equal(m("fosaprepitant")?.drug.id, "fosaprepitant");
  assert.equal(m("lopinavir and ritonavir")?.drug.id, "lopinavir");
  assert.equal(m("Metoprolol succinate")?.drug.id, "metoprolol");
  assert.equal(m("LOPRESSOR")?.via, "brand");
  assert.equal(m("dabigatran etexilate")?.via, "reviewed-alias");
  assert.equal(m("S-mephenytoin"), null);
  assert.equal(m("---"), null);
});

test("validateAgainstFda: denominator is FDA-listed ∩ catalog only", () => {
  const drugs = [
    drug("ketoconazole", "Ketoconazole", [inh("CYP3A4", "strong")]),
    drug("fluconazole", "Fluconazole", [inh("CYP2C19", "strong"), inh("CYP3A4", "strong"), inh("CYP2C9", "moderate")]),
    drug("rifampin", "Rifampin", [inh("CYP3A4", "weak")]),
    drug("sertraline-not-in-fixture", "Zzz catalog-only drug", [inh("CYP2D6", "strong")]),
  ];
  const table = [
    row("ketoconazole", "CYP3A4", "inhibitor", "strong"),
    row("fluconazole", "CYP2C19", "inhibitor", "strong"),
    row("fluconazole", "CYP3A4", "inhibitor", "moderate"),
    row("rifampin", "CYP3A4", "inducer", "strong"),
    row("rifampin", "CYP2C8", "inducer", "moderate"),
    row("telithromycin", "CYP3A4", "inhibitor", "strong"),
  ];
  const r = validateAgainstFda(drugs, table, {});
  assert.equal(r.overall.compared, 5);
  assert.equal(r.overall.exact, 2);
  assert.equal(r.overall.exactPct, 40);
  assert.equal(r.overall.rolePct, 60);
  assert.deepEqual(r.counts, {
    direction_mismatch: 1,
    strength_mismatch: 1,
    missing_in_catalog: 1,
    not_in_fda: 1,
    drug_not_in_catalog: 1,
  });
  assert.deepEqual(r.drugsNotInCatalog, ["telithromycin"]);
  // Strong gate: keto 3A (match), fluc 2C19 (match), rifampin 3A inducer (direction).
  assert.equal(r.strongPerpetrators.compared, 3);
  assert.equal(r.strongPerpetrators.exact, 2);
  // not_in_fda: fluconazole 2C9 inhibitor (FDA row absent in fixture). Catalog-only drug never appears.
  assert.deepEqual(r.notInFda.map((d) => `${d.catalogId}|${d.target}`), ["fluconazole|CYP2C9"]);
  assert.ok(r.reviewList.every((d) => d.category !== "not_in_fda" && d.category !== "drug_not_in_catalog"));
  assert.equal(r.reviewList[0]?.category, "direction_mismatch");
  assert.equal(r.perTarget.CYP3A4?.compared, 3);
});

test("validateAgainstFda: duplicate FDA rows for the same drug/target/role count once", () => {
  const drugs = [drug("aprepitant", "Aprepitant", [inh("CYP3A4", "moderate")])];
  const table = [row("aprepitant", "CYP3A4", "inhibitor", "moderate"), row("aprepitant", "CYP3A4", "inhibitor", "moderate")];
  assert.equal(validateAgainstFda(drugs, table, {}).overall.compared, 1);
});

test("FDA transcription is well-formed and scoped to modeled targets", () => {
  assert.equal(FDA_DDI_SOURCE.retrieved, "2026-09-26");
  assert.ok(FDA_DDI_TABLE.length > 250);
  const targets = new Set(["CYP1A2", "CYP2B6", "CYP2C8", "CYP2C9", "CYP2C19", "CYP2D6", "CYP3A4", "P-gp"]);
  for (const e of FDA_DDI_TABLE) {
    assert.ok(targets.has(e.target), e.drug);
    if (e.target === "P-gp") assert.equal(e.fdaClass, null, e.drug);
    else if (e.kind === "substrate") assert.ok(e.fdaClass === "sensitive" || e.fdaClass === "moderate-sensitive", e.drug);
    else assert.ok(["strong", "moderate", "weak"].includes(String(e.fdaClass)), e.drug);
    assert.ok(!/\bmg\b/i.test(e.cell), e.drug);
  }
  const has = (drug: string, target: string, kind: string, fdaClass: string | null) =>
    FDA_DDI_TABLE.some((e) => e.drug === drug && e.target === target && e.kind === kind && e.fdaClass === fdaClass);
  // Spot-check rows against the FDA page.
  assert.ok(has("ketoconazole", "CYP3A4", "inhibitor", "strong"));
  assert.ok(has("fluvoxamine", "CYP1A2", "inhibitor", "strong"));
  assert.ok(has("rifampin", "CYP2C19", "inducer", "strong"));
  assert.ok(has("ciprofloxacin", "CYP1A2", "inhibitor", "moderate"));
  assert.ok(has("digoxin", "P-gp", "substrate", null));
  assert.ok(has("tizanidine", "CYP1A2", "substrate", "sensitive"));
});
