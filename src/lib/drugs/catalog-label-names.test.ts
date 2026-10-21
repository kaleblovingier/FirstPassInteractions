/**
 * Names added because a stored current label already contraindicates them.
 * No enzyme grade. Ungraded P-gp FDA names stay off.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, DRUGS, searchDrugs } from "./catalog";
import { LABEL_NAMED_SHELF } from "./catalog-label-names";
import { buildCatalogMatcher } from "./reference/validate-fda";

const UNGRADED = ["belumosudil", "danicopan", "fostamatinib", "saquinavir and ritonavir"];

test("label-named shelf is eleven names and no enzyme grade", () => {
  assert.equal(LABEL_NAMED_SHELF.length, 11);
  assert.equal(DRUGS.filter((d) => d.cls === "Named on a stored label").length, 11);
  const match = buildCatalogMatcher(DRUGS);
  for (const drug of LABEL_NAMED_SHELF) {
    assert.equal(DRUG_BY_ID[drug.id]?.id, drug.id);
    assert.equal(drug.enzymes.length, 0, drug.id);
    assert.equal(drug.brands.length, 0, drug.id);
    assert.equal(drug.pd.length, 0, drug.id);
    assert.doesNotMatch(`${drug.toxicityHint} ${drug.note ?? ""}`, /\b\d+(\.\d+)?\s*(mg|mcg|g)\b/i);
    assert.match(drug.note ?? "", /No enzyme grade is stored/);
    assert.equal(searchDrugs(drug.name)[0]?.id, drug.id, drug.id);
  }
  for (const name of UNGRADED) assert.equal(match(name), null, name);
});
