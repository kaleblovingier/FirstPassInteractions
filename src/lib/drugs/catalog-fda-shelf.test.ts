/**
 * FDA Table 1 names added with the grade already on that table.
 * Ungraded P-gp rows stay off. Not a dose.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, DRUGS, searchDrugs } from "./catalog";
import { FDA_TABLE_SHELF } from "./catalog-fda-shelf";
import { FDA_DDI_TABLE } from "./reference/fda-ddi-table";
import { buildCatalogMatcher, classifyPair } from "./reference/validate-fda";

const UNGRADED = ["belumosudil", "danicopan", "fostamatinib", "saquinavir and ritonavir"];

test("FDA Table 1 shelf copies graded roles and leaves ungraded rows off", () => {
  assert.equal(FDA_TABLE_SHELF.length, 23);
  assert.equal(DRUGS.filter((d) => d.cls === "FDA Table 1 example").length, 23);
  const match = buildCatalogMatcher(DRUGS);
  for (const drug of FDA_TABLE_SHELF) {
    assert.equal(DRUG_BY_ID[drug.id]?.id, drug.id);
    assert.equal(drug.brands.length, 0);
    assert.equal(drug.pd.length, 0);
    assert.doesNotMatch(`${drug.toxicityHint} ${drug.note ?? ""}`, /\b\d+(\.\d+)?\s*(mg|mcg|g)\b/i);
    assert.equal(searchDrugs(drug.name).some((hit) => hit.id === drug.id), true, drug.id);
    assert.equal(match(drug.name)?.drug.id, drug.id, drug.name);
    const rows = FDA_DDI_TABLE.filter((entry) => entry.drug === drug.name);
    assert.ok(rows.length > 0, drug.name);
    for (const row of rows) {
      assert.equal(classifyPair(row, drug.enzymes), "match", `${drug.id} ${row.target} ${row.kind}`);
    }
  }
  for (const name of UNGRADED) {
    assert.equal(match(name), null, name);
  }
});
