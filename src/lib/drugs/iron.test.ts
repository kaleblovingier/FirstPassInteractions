import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  IRON_FORMULATIONS,
  calculateGanzoni,
  ironOnDesk,
  ironReportOnDesk,
} from "./iron";
import { DRUG_BY_ID } from "./catalog";

describe("parenteral iron & Ganzoni kinetics", () => {
  it("defines standard clinical reference properties for all 5 parenteral iron formulations", () => {
    const keys = Object.keys(IRON_FORMULATIONS);
    assert.equal(keys.length, 5);

    for (const key of keys) {
      const f = IRON_FORMULATIONS[key];
      assert.equal(f.id, key);
      assert.ok(f.name.length > 0);
      assert.ok(f.brand.length > 0);
      assert.ok(f.elementalIronMgPerMl > 0);
      assert.ok(f.maxSingleDoseMg > 0);
      assert.ok(f.infusionTimeMin > 0);
      assert.ok(typeof f.testDoseRequired === "boolean");
      assert.ok(["high", "moderate", "low", "minimal"].includes(f.fgf23HypophosphatemiaRisk));
      assert.ok(f.clinicalNote.length > 0);

      // Verify each drug exists in the main catalog
      assert.ok(DRUG_BY_ID[key], `Drug '${key}' must exist in catalog`);
    }
  });

  it("identifies iron dextran boxed warning and test dose requirement", () => {
    const dextran = IRON_FORMULATIONS["iron-dextran"];
    assert.equal(dextran.testDoseRequired, true);
    assert.ok(dextran.boxedWarning !== null);
    assert.match(dextran.boxedWarning ?? "", /anaphylactic/i);
    assert.match(dextran.boxedWarning ?? "", /25 mg/i);
  });

  it("identifies ferric carboxymaltose FGF23 hypophosphatemia alert", () => {
    const fcm = IRON_FORMULATIONS["ferric-carboxymaltose"];
    assert.equal(fcm.fgf23HypophosphatemiaRisk, "high");
    assert.match(fcm.clinicalNote, /FGF23/);
    assert.match(fcm.clinicalNote, /phosphate wasting/i);
  });

  it("calculates accurate Ganzoni deficit in standard adult patient", () => {
    // 70 kg, actual Hb 8.0, target 15.0 g/dL
    // Hb deficit = 7.0 g/dL
    // Deficit = 70 * 7.0 * 2.4 + 500 = 1176 + 500 = 1676 mg
    const res = calculateGanzoni({
      actualHb: 8.0,
      targetHb: 15.0,
      weightKg: 70,
    });

    assert.equal(res.hbDeficit, 7.0);
    assert.equal(res.depotIronMg, 500);
    assert.equal(res.rawDeficitMg, 1676);
    assert.equal(res.suggestedDeficitMg, 1676);
    assert.equal(res.simplifiedMatrixMg, 1500); // Hb < 10, wt >= 70 -> 1500 mg
  });

  it("detects obesity and computes adjusted body weight deficit divergence", () => {
    // 120 kg, 175 cm male, Hb 10.0, target 15.0
    // Devine IBW = 50 + 2.3 * (68.9 - 60) = 50 + 2.3 * 8.9 = ~70.5 kg
    // Patient is obese (120 kg > 70.5 * 1.2)
    const res = calculateGanzoni({
      actualHb: 10.0,
      targetHb: 15.0,
      weightKg: 120,
      heightCm: 175,
      sex: "male",
    });

    assert.equal(res.isObese, true);
    assert.ok(res.ibwKg !== null && res.ibwKg > 65 && res.ibwKg < 75);
    assert.ok(res.ibwDeficitMg !== null);
    assert.ok(res.rawDeficitMg > res.ibwDeficitMg); // Raw overpredicts
    assert.equal(res.suggestedDeficitMg, res.ibwDeficitMg);
    assert.match(res.divergenceNote, /overpredicts deficit/i);
  });

  it("scales depot iron for pediatric / low-weight patients under 35 kg", () => {
    const res = calculateGanzoni({
      actualHb: 9.0,
      targetHb: 13.0,
      weightKg: 20,
    });

    // Depot iron = 20 kg * 15 mg/kg = 300 mg
    assert.equal(res.depotIronMg, 300);
    // Deficit = 20 * 4.0 * 2.4 + 300 = 192 + 300 = 492 mg
    assert.equal(res.rawDeficitMg, 492);
  });

  it("detects active iron products in desk tray", () => {
    const empty = ironOnDesk(["metformin", "lisinopril"]);
    assert.equal(empty.hasIron, false);
    assert.equal(empty.activeParenteral.length, 0);

    const withIron = ironOnDesk(["iron-sucrose", "ferric-carboxymaltose", "ferrous-sulfate"]);
    assert.equal(withIron.hasIron, true);
    assert.equal(withIron.activeParenteral.length, 2);
    assert.equal(withIron.oralIronIds.length, 1);

    const report = ironReportOnDesk(["iron-dextran", "ferric-carboxymaltose", "ferrous-sulfate"]);
    assert.match(report.headline, /Active Iron Products/i);
    assert.ok(report.items.some((i) => i.warning && /Black Box Warning/i.test(i.title)));
    assert.ok(report.items.some((i) => i.warning && /FGF23/i.test(i.title)));
    assert.ok(report.items.some((i) => /Hepcidin/i.test(i.title)));
  });

  it("iron calculations and copy adhere to non-prescriptive regulatory principles", () => {
    const res = calculateGanzoni({
      actualHb: 8.0,
      weightKg: 70,
    });

    for (const note of res.clinicalSafetyNotes) {
      assert.doesNotMatch(note, /prescribe\s+\d+\s*mg/i);
      assert.doesNotMatch(note, /administer\s+\d+\s*mg/i);
    }
  });
});

