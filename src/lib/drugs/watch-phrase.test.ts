import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DRUGS } from "./catalog";
import { analyze, watchForPhrase } from "./engine";

describe("watchForPhrase - a stored hint read after \"Watch for\"", () => {
  it("lowercases a plain first word and keeps acronyms and names", () => {
    assert.equal(watchForPhrase("Hyperthermia, serotonin syndrome"), "hyperthermia, serotonin syndrome");
    assert.equal(watchForPhrase("Label-specific bleeding"), "label-specific bleeding");
    for (const kept of ["QT prolongation", "TdP risk", "G-CSF", "CNS depression", "2D6 victim", "R-albuterol", "C. difficile", "Parkinson disease", "μ-agonist"]) {
      assert.equal(watchForPhrase(kept), kept);
    }
  });

  it("drops a closing period, so no catalog hint ends its sentence with two", () => {
    assert.equal(watchForPhrase("Paralysis."), "paralysis");
    for (const drug of DRUGS) assert.doesNotMatch(`Watch for ${watchForPhrase(drug.toxicityHint)}.`, /\.\.$/, drug.id);
  });

  it("reads \"Watch for hyperthermia\" in MDMA's exposure row with sertraline", () => {
    const row = analyze(["mdma", "sertraline"]).findings.find((f) => f.clinical.includes("Expect higher MDMA exposure."));
    assert.match(row?.clinical ?? "", /Watch for hyperthermia, serotonin syndrome/);
  });
});
