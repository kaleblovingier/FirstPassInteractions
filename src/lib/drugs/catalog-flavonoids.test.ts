import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "./catalog.ts";
import { analyze } from "./engine.ts";

const FLAVONOIDS = ["quercetin", "apigenin", "luteolin", "naringin", "hesperidin", "rutin", "green-tea"];
const NEW_FLAVONOIDS = ["apigenin", "luteolin", "naringin", "hesperidin", "rutin"];

test("flavonoid supplements are available from the dedicated search collection", () => {
  assert.deepEqual(
    searchDrugs("flavonoids").map((drug) => drug.id),
    FLAVONOIDS,
  );
  assert.deepEqual(
    searchDrugs("bioflavonoids").map((drug) => drug.id),
    FLAVONOIDS,
  );
  for (const id of NEW_FLAVONOIDS) {
    assert.equal(DRUG_BY_ID[id]?.kind, "herb", id);
    assert.ok(searchDrugs(DRUG_BY_ID[id].name).some((drug) => drug.id === id), id);
  }
  assert.deepEqual(
    searchDrugs("flavonoids", ["quercetin"]).map((drug) => drug.id),
    FLAVONOIDS.filter((id) => id !== "quercetin"),
  );
});

test("new flavonoid rows do not invent CYP, PD, or interaction grades", () => {
  for (const id of NEW_FLAVONOIDS) {
    assert.deepEqual(DRUG_BY_ID[id].enzymes, [], id);
    assert.deepEqual(DRUG_BY_ID[id].pd, [], id);
    assert.equal(analyze([id, "midazolam"]).findings.length, 0, id);
  }
});

test("naringin distinguishes isolated flavonoid supplements from grapefruit juice", () => {
  assert.match(DRUG_BY_ID.naringin.note ?? "", /furanocoumarins, not naringin/i);
  assert.match(DRUG_BY_ID.naringin.note ?? "", /PMID 23297394/);
});
