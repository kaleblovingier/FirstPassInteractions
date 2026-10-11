import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateMechanismIntersect,
  PRESET_SCENARIOS,
  INTERSECT_REGULATORY_NOTICE,
  type IntersectCategory,
} from "./mechanism-intersect";
import { DRUG_BY_ID } from "./catalog";

describe("Pharmacodynamic Mechanism Intersect Engine", () => {
  it("evaluates empty regimen to minimal load across all categories", () => {
    const res = evaluateMechanismIntersect([]);
    assert.equal(res.drugs.length, 0);
    assert.equal(res.loads.length, 5);
    assert.equal(res.highestLevel, "minimal");
    for (const load of res.loads) {
      assert.equal(load.score, 0);
      assert.equal(load.level, "minimal");
      assert.equal(load.contributingDrugs.length, 0);
    }
  });

  it("calculates high anticholinergic burden for classic geriatric stack", () => {
    const res = evaluateMechanismIntersect(["oxybutynin", "amitriptyline", "diphenhydramine"]);
    const ach = res.loads.find((l) => l.category === "anticholinergic");
    assert.ok(ach);
    assert.equal(ach.score, 9); // 3 + 3 + 3
    assert.equal(ach.level, "severe");
    assert.equal(ach.contributingDrugs.length, 3);
    assert.equal(res.highestLevel, "severe");
    assert.equal(res.highestCategory, "anticholinergic");
  });

  it("calculates synergistic sedation and respiratory depression for opioid + benzo + gabapentinoid", () => {
    const res = evaluateMechanismIntersect(["alprazolam", "fentanyl", "pregabalin"]);
    const sed = res.loads.find((l) => l.category === "sedation");
    assert.ok(sed);
    assert.ok(sed.score >= 8); // 3 + 3 + 2 = 8
    assert.ok(sed.level === "high" || sed.level === "severe");
    assert.ok(sed.clinicalPearls.some((p) => p.includes("FDA Boxed Warning")));
  });

  it("detects lethal serotonin collision between MAOI and SSRI", () => {
    const res = evaluateMechanismIntersect(["phenelzine", "fluoxetine"]);
    const ser = res.loads.find((l) => l.category === "serotonin");
    assert.ok(ser);
    assert.equal(ser.level, "severe");
    assert.equal(ser.score, 10);
    assert.ok(ser.summary.includes("CRITICAL COLLISION"));
  });

  it("calculates additive QTc hERG delay for triple cardiac stack", () => {
    const res = evaluateMechanismIntersect(["amiodarone", "haloperidol", "methadone"]);
    const qtc = res.loads.find((l) => l.category === "qtc");
    assert.ok(qtc);
    assert.equal(qtc.score, 9); // 3 + 3 + 3
    assert.equal(qtc.level, "severe");
    assert.equal(qtc.contributingDrugs.length, 3);
  });

  it("calculates pressor sympathomimetic push for amphetamine + pseudoephedrine", () => {
    const res = evaluateMechanismIntersect(["amphetamine", "pseudoephedrine"]);
    const pressor = res.loads.find((l) => l.category === "pressor");
    assert.ok(pressor);
    assert.equal(pressor.score, 5); // 3 + 2
    assert.equal(pressor.level, "high");
    assert.equal(pressor.contributingDrugs.length, 2);
  });

  it("all preset scenarios have valid drug IDs in catalog", () => {
    assert.ok(PRESET_SCENARIOS.length >= 5);
    for (const preset of PRESET_SCENARIOS) {
      assert.ok(preset.id);
      assert.ok(preset.name);
      assert.ok(preset.description);
      assert.ok(preset.drugIds.length > 0);
      for (const drugId of preset.drugIds) {
        assert.ok(DRUG_BY_ID[drugId], `Drug ID ${drugId} must exist in DRUG_BY_ID catalog`);
      }
      const evalRes = evaluateMechanismIntersect(preset.drugIds);
      const highLoad = evalRes.loads.find((l) => l.category === preset.expectedHighCategory);
      assert.ok(highLoad);
      assert.ok(highLoad.score > 0, `Preset ${preset.id} must generate positive score for expected category`);
    }
  });

  it("maintains non-prescriptive regulatory posture under FD&C Act § 520(o)(1)(E)", () => {
    assert.ok(INTERSECT_REGULATORY_NOTICE.includes("520(o)(1)(E)"));
    assert.ok(INTERSECT_REGULATORY_NOTICE.includes("does not diagnose, prescribe"));
  });
});
