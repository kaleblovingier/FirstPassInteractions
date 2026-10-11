import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateVancoSawchukZaske,
  vancomycinOnDesk,
  vancomycinReportOnDesk,
} from "./vancomycin";

describe("vancomycin pharmacokinetics & Sawchuk-Zaske calculations", () => {
  it("calculates realistic ke, half-life, Vd, clearance, and AUC24 for target patient", () => {
    // Standard patient: 1250 mg q12h over 1.5 h
    // C1 peak drawn 1.5 h post-infusion = 28 ug/mL
    // C2 trough drawn 0.5 h pre-dose = 12 ug/mL
    // Delta T = 12 - 1.5 - 1.5 - 0.5 = 8.5 hours
    const res = calculateVancoSawchukZaske({
      doseMg: 1250,
      infusionHours: 1.5,
      tauHours: 12,
      c1PeakUgMl: 28,
      t1HoursPostInfusion: 1.5,
      c2TroughUgMl: 12,
      t2HoursBeforeNextDose: 0.5,
      mic: 1.0,
    });

    assert.ok(res);
    assert.equal(res.band, "target");
    assert.ok(res.auc24 >= 400 && res.auc24 <= 600, `Expected AUC24 in target window, got ${res.auc24}`);
    assert.ok(res.halfLifeHours > 4 && res.halfLifeHours < 12);
    assert.ok(res.ke > 0.05 && res.ke < 0.15);
    assert.ok(res.vdL > 30 && res.vdL < 80);
    assert.ok(res.clearanceLPerHr > 2 && res.clearanceLPerHr < 8);
    assert.ok(res.trueCmaxUgMl > 28);
    assert.ok(res.trueCminUgMl < 12);
    assert.equal(res.samplingTimingWarning, null);
    assert.ok(res.troughContextNote.includes("10–15"));
  });

  it("flags subtherapeutic window when exposure is low", () => {
    // Fast eliminator or low dose: 1000 mg q24h
    // C1 = 20, C2 = 4 (delta T = 24 - 1 - 2 - 1 = 20 h)
    const res = calculateVancoSawchukZaske({
      doseMg: 1000,
      infusionHours: 1.0,
      tauHours: 24,
      c1PeakUgMl: 20,
      t1HoursPostInfusion: 2.0,
      c2TroughUgMl: 4,
      t2HoursBeforeNextDose: 1.0,
      mic: 1.0,
    });

    assert.ok(res);
    assert.equal(res.band, "subtherapeutic");
    assert.ok(res.auc24 < 400);
    assert.ok(res.label.includes("Subtherapeutic"));
  });

  it("flags supratherapeutic window when clearance is low / dose is high", () => {
    // Slower clearance: 1500 mg q12h
    // C1 = 42, C2 = 22
    const res = calculateVancoSawchukZaske({
      doseMg: 1500,
      infusionHours: 2.0,
      tauHours: 12,
      c1PeakUgMl: 42,
      t1HoursPostInfusion: 1.0,
      c2TroughUgMl: 22,
      t2HoursBeforeNextDose: 0.5,
      mic: 1.0,
    });

    assert.ok(res);
    assert.equal(res.band, "supratherapeutic");
    assert.ok(res.auc24 > 600);
    assert.ok(res.label.includes("Supratherapeutic"));
    assert.ok(res.clinicalNote.includes("piperacillin-tazobactam"));
  });

  it("warns about sampling during alpha-distribution phase when t1 < 1.0 hour", () => {
    const res = calculateVancoSawchukZaske({
      doseMg: 1000,
      infusionHours: 1.0,
      tauHours: 12,
      c1PeakUgMl: 30,
      t1HoursPostInfusion: 0.5, // Drawn only 30 min post-infusion
      c2TroughUgMl: 14,
      t2HoursBeforeNextDose: 0.5,
    });

    assert.ok(res);
    assert.ok(res.samplingTimingWarning);
    assert.ok(res.samplingTimingWarning.includes("alpha-phase"));
    assert.ok(res.samplingTimingWarning.includes("1–2 hours"));
  });

  it("rejects invalid, inverted, or non-physiologic levels", () => {
    // Inverted concentrations (trough higher than peak)
    assert.equal(
      calculateVancoSawchukZaske({
        doseMg: 1000,
        infusionHours: 1.0,
        tauHours: 12,
        c1PeakUgMl: 10,
        t1HoursPostInfusion: 1.0,
        c2TroughUgMl: 20, // Impossible at steady state
        t2HoursBeforeNextDose: 0.5,
      }),
      null,
    );

    // Negative or extreme values
    assert.equal(
      calculateVancoSawchukZaske({
        doseMg: -500,
        infusionHours: 1.0,
        tauHours: 12,
        c1PeakUgMl: 25,
        t1HoursPostInfusion: 1.0,
        c2TroughUgMl: 10,
        t2HoursBeforeNextDose: 0.5,
      }),
      null,
    );
  });

  it("detects vancomycin and vanco-zosyn collision on tray", () => {
    assert.equal(vancomycinOnDesk(["vancomycin", "ceftriaxone"]), true);
    assert.equal(vancomycinOnDesk(["linezolid"]), false);

    const reportSingle = vancomycinReportOnDesk(["vancomycin"]);
    assert.equal(reportSingle.hasVancomycin, true);
    assert.equal(reportSingle.hasZosynCollision, false);

    const reportPair = vancomycinReportOnDesk(["vancomycin", "piperacillin-tazobactam"]);
    assert.equal(reportPair.hasVancomycin, true);
    assert.equal(reportPair.hasZosynCollision, true);
    assert.ok(reportPair.alertNote?.includes("Luther 2018"));
  });
});
