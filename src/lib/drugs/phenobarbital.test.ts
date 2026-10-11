import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePhenobarbitalLoading,
  calculatePhenobarbitalElimination,
  phenobarbitalOnDesk,
  phenobarbitalReportOnDesk,
} from "./phenobarbital";

describe("phenobarbital pharmacokinetics & elimination calculations", () => {
  it("calculates loading dose and infusion velocity for alcohol withdrawal", () => {
    // 70 kg adult, alcohol withdrawal target 20 µg/mL from 0 baseline, Vd 0.6 L/kg
    // Total Vd = 70 * 0.6 = 42 L
    // Loading dose = 42 * 20 = 840 mg
    // Min infusion time = ceil(840 / 60) = 14 minutes
    const res = calculatePhenobarbitalLoading({
      weightKg: 70,
      indication: "alcohol-withdrawal",
      currentLevelUgMl: 0,
      targetLevelUgMl: 20,
      vdLPerKg: 0.6,
    });

    assert.ok(res);
    assert.equal(res.loadingDoseMg, 840);
    assert.equal(res.loadingDoseMgPerKg, 12);
    assert.equal(res.minInfusionDurationMinutes, 14);
    assert.equal(res.maxInfusionRateMgPerMin, 60);
    assert.ok(res.indicationGuidance.includes("built-in auto-taper"));
    assert.ok(res.propyleneGlycolAlert.includes("propylene glycol"));
    assert.ok(res.builtInTaperPearl.includes("80–120 hours"));
  });

  it("calculates loading dose for status epilepticus with pre-existing level", () => {
    // 80 kg adult with breakthrough seizures, current level 10 µg/mL, target 30 µg/mL
    // Deficit = 20 µg/mL; Total Vd = 80 * 0.6 = 48 L
    // Loading dose = 48 * 20 = 960 mg
    const res = calculatePhenobarbitalLoading({
      weightKg: 80,
      indication: "status-epilepticus",
      currentLevelUgMl: 10,
      targetLevelUgMl: 30,
    });

    assert.ok(res);
    assert.equal(res.deficitUgMl, 20);
    assert.equal(res.loadingDoseMg, 960);
    assert.equal(res.minInfusionDurationMinutes, 16);
    assert.ok(res.indicationGuidance.includes("Status Epilepticus"));
  });

  it("calculates Henderson-Hasselbalch ionization and clearance fold-increase", () => {
    // Baseline urine pH 6.0 vs Alkalinized 7.8, pKa 7.24
    // At pH 6.0: ~5.4% ionized
    // At pH 7.8: ~78.5% ionized
    const res = calculatePhenobarbitalElimination({
      baselineUrinePh: 6.0,
      alkalinizedUrinePh: 7.8,
      serumLevelUgMl: 75,
    });

    assert.ok(res);
    assert.equal(res.pKa, 7.24);
    assert.ok(res.baselineIonizedPercent < 10);
    assert.ok(res.alkalinizedIonizedPercent > 70);
    assert.ok(res.ionizationFoldIncrease > 10);
    assert.ok(res.clearanceFoldIncrease >= 5);
    assert.equal(res.toxicityBand, "severe-toxicity");
    assert.ok(res.toxicityLabel.includes("Severe Barbiturate Toxicity"));
    assert.ok(res.paradoxicalAciduriaAlert.includes("Paradoxical Aciduria"));
    assert.ok(res.paradoxicalAciduriaAlert.includes("potassium"));
    assert.ok(res.hemodialysisCriteria.includes(">100 µg/mL"));
  });

  it("classifies lethal overdose band when level > 100 µg/mL", () => {
    const res = calculatePhenobarbitalElimination({
      serumLevelUgMl: 120,
    });

    assert.ok(res);
    assert.equal(res.toxicityBand, "lethal-overdose");
    assert.ok(res.toxicityLabel.includes("Critical"));
  });

  it("rejects non-physiologic inputs", () => {
    assert.equal(
      calculatePhenobarbitalLoading({
        weightKg: -5,
        indication: "alcohol-withdrawal",
      }),
      null,
    );

    assert.equal(
      calculatePhenobarbitalElimination({
        baselineUrinePh: 2.0,
      }),
      null,
    );
  });

  it("detects phenobarbital and primidone on tray and reports drug interaction warnings", () => {
    assert.equal(phenobarbitalOnDesk(["phenobarbital"]), true);
    assert.equal(phenobarbitalOnDesk(["primidone"]), true);
    assert.equal(phenobarbitalOnDesk(["lorazepam"]), false);

    const report = phenobarbitalReportOnDesk(["primidone"]);
    assert.equal(report.hasPrimidone, true);
    assert.equal(report.hasPhenobarbital, false);
    assert.ok(report.primidoneProdrugNote?.includes("CYP2C19"));
    assert.ok(report.broadInductionSummary?.includes("CYP3A4"));
  });
});

