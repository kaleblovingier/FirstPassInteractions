import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateDigoxinLevel,
  calculateDigifab,
  digoxinOnDesk,
  digoxinReportOnDesk,
  DIGOXIN_PGP_INTERACTORS,
} from "./digoxin";
import { DRUG_BY_ID } from "./catalog";

describe("digoxin pharmacokinetics & DigiFab sizing", () => {
  it("verifies digoxin and all modeled P-gp interactors exist in catalog", () => {
    assert.ok(DRUG_BY_ID["digoxin"], "digoxin must exist in catalog");
    for (const p of DIGOXIN_PGP_INTERACTORS) {
      assert.ok(DRUG_BY_ID[p.id], `P-gp interactor '${p.id}' must exist in catalog`);
    }
  });

  it("evaluates heart failure levels correctly under DIG trial guidance", () => {
    // 0.7 ng/mL is optimal
    const optimal = evaluateDigoxinLevel(0.7, "heart-failure", 12);
    assert.equal(optimal.band, "target");
    assert.match(optimal.label, /0.5–0.9/);
    assert.match(optimal.mortalityNote ?? "", /lowest all-cause mortality/i);

    // 1.5 ng/mL is elevated with mortality warning
    const elevated = evaluateDigoxinLevel(1.5, "heart-failure", 12);
    assert.equal(elevated.band, "elevated");
    assert.match(elevated.mortalityNote ?? "", /increased mortality risk/i);

    // 3.2 ng/mL is toxic
    const toxic = evaluateDigoxinLevel(3.2, "heart-failure", 12);
    assert.equal(toxic.band, "toxic");
    assert.match(toxic.label, /Toxic/);
  });

  it("evaluates atrial fibrillation rate control levels", () => {
    // 1.0 ng/mL is target for AF
    const target = evaluateDigoxinLevel(1.0, "atrial-fib", 12);
    assert.equal(target.band, "target");

    // 2.5 ng/mL is toxic
    const toxic = evaluateDigoxinLevel(2.5, "atrial-fib", 12);
    assert.equal(toxic.band, "toxic");
  });

  it("warns about falsely elevated levels during the pre-distribution phase (<6h)", () => {
    const early = evaluateDigoxinLevel(4.0, "heart-failure", 3);
    assert.equal(early.band, "distribution-warning");
    assert.match(early.label, /Pre-Distribution/);
    assert.ok(early.samplingTimingWarning);
    assert.match(early.samplingTimingWarning, /tissue binding/i);
  });

  it("calculates accurate DigiFab vials for acute ingestion with known mg", () => {
    // 10 mg ingested tablet -> 10 * 0.8 bioavailability = 8 mg absorbed
    // 8 mg / 0.5 mg/vial = 16 vials
    const res = calculateDigifab({
      scenario: "acute-dose",
      ingestedDoseMg: 10,
    });

    assert.equal(res.vialsRecommended, 16);
    assert.equal(res.vialsRounded, 16);
    assert.equal(res.mgDigoxinBound, 8);
    assert.match(res.calculationMethod, /Known Acute/);
  });

  it("calculates accurate DigiFab vials for steady-state SDC and weight", () => {
    // 4.0 ng/mL in 75 kg patient -> (4.0 * 75) / 100 = 3.0 vials
    const res = calculateDigifab({
      scenario: "steady-state-level",
      serumLevelNgMl: 4.0,
      weightKg: 75,
    });

    assert.equal(res.vialsRecommended, 3.0);
    assert.equal(res.vialsRounded, 3);
    assert.match(res.formulaString, /4 ng\/mL/);
  });

  it("provides empiric protocols for unstable toxicity or arrest", () => {
    const acuteArrest = calculateDigifab({
      scenario: "empiric-arrest",
      indication: "acute",
    });
    assert.equal(acuteArrest.vialsRecommended, 10);

    const chronicUnstable = calculateDigifab({
      scenario: "empiric-arrest",
      indication: "chronic",
    });
    assert.equal(chronicUnstable.vialsRecommended, 4);
  });

  it("emphasizes critical lab trap and rebound hypokalemia", () => {
    const res = calculateDigifab({
      scenario: "steady-state-level",
      serumLevelNgMl: 5.0,
      weightKg: 80,
    });

    assert.match(res.postFabImmunoassayAlert, /10- to 20-fold/);
    assert.match(res.postFabImmunoassayAlert, /cross-react/i);
    assert.match(res.postFabImmunoassayAlert, /5–7 days/);
    assert.match(res.reboundHypokalemiaAlert, /rebound hypokalemia/i);
  });

  it("detects digoxin and P-gp interactors on the active desk tray", () => {
    const empty = digoxinOnDesk(["metformin", "lisinopril"]);
    assert.equal(empty.hasDigoxin, false);
    assert.equal(empty.pgpInteractors.length, 0);

    const withPair = digoxinOnDesk(["digoxin", "amiodarone", "verapamil"]);
    assert.equal(withPair.hasDigoxin, true);
    assert.equal(withPair.pgpInteractors.length, 2);

    const report = digoxinReportOnDesk(["digoxin", "amiodarone"]);
    assert.equal(report.hasDigoxin, true);
    assert.ok(report.items.some((i) => i.warning && /Amiodarone/i.test(i.title)));
    assert.ok(report.items.some((i) => /50% dose reduction/i.test(i.detail)));
  });

  it("digoxin copy adheres to non-prescriptive regulatory principles", () => {
    const res = calculateDigifab({
      scenario: "steady-state-level",
      serumLevelNgMl: 3.5,
      weightKg: 70,
    });

    for (const caveat of res.clinicalCaveats) {
      assert.doesNotMatch(caveat, /prescribe\s+\d+\s*vial/i);
      assert.doesNotMatch(caveat, /administer\s+\d+\s*mg/i);
    }
  });
});

