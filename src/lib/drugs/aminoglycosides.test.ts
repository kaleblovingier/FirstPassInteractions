import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateAminoglycosideWeight,
  evaluateHartfordNomogram,
  aminoglycosidesOnDesk,
  aminoglycosideReportOnDesk,
  TRADITIONAL_AG_TARGETS,
} from "./aminoglycosides";

describe("aminoglycoside pharmacokinetics & Hartford nomogram", () => {
  it("calculates dosing weight correctly in obesity using AdjBW 0.4", () => {
    // 5'10" male (178 cm), Weight 110 kg
    // Height inches = 178 / 2.54 = 70.08 -> 10.08 inches over 60
    // IBW = 50 + 2.3 * 10.08 = 73.2 kg
    // Weight / IBW = 110 / 73.2 = 1.50 (>120% IBW -> obese)
    // AdjBW = 73.2 + 0.4 * (110 - 73.2) = 73.2 + 14.7 = 87.9 kg
    const res = calculateAminoglycosideWeight({
      heightCm: 178,
      weightKg: 110,
      sex: "male",
    });

    assert.ok(res);
    assert.equal(res.weightCategory, "obese");
    assert.equal(res.recommendedWeightType, "adj");
    assert.ok(Math.abs(res.ibwKg - 73.2) < 0.5);
    assert.ok(Math.abs(res.dosingWeightKg - 87.9) < 0.5);
    assert.ok(res.rationale.includes("Adjusted Body Weight"));
    assert.ok(res.rationale.includes("poor adipose penetration"));
  });

  it("selects actual body weight in underweight patients", () => {
    // 5'6" female (168 cm), Weight 42 kg
    // IBW = 45.5 + 2.3 * 6.14 = 59.6 kg
    // ABW < IBW -> underweight
    const res = calculateAminoglycosideWeight({
      heightCm: 168,
      weightKg: 42,
      sex: "female",
    });

    assert.ok(res);
    assert.equal(res.weightCategory, "underweight");
    assert.equal(res.recommendedWeightType, "actual");
    assert.equal(res.dosingWeightKg, 42);
    assert.ok(res.rationale.includes("Actual Body Weight"));
  });

  it("selects IBW in normal weight patients", () => {
    // 5'10" male (178 cm), Weight 75 kg
    const res = calculateAminoglycosideWeight({
      heightCm: 178,
      weightKg: 75,
      sex: "male",
    });

    assert.ok(res);
    assert.equal(res.weightCategory, "normal");
    assert.equal(res.recommendedWeightType, "ibw");
    assert.ok(res.dosingWeightKg > 70 && res.dosingWeightKg < 75);
  });

  it("evaluates Hartford nomogram intervals across clearance tiers", () => {
    // Gentamicin, 8 hours post-start
    // At t=8h: Q24 line ~ 5.8 µg/mL, Q36 line ~ 8.2 µg/mL, Q48 line ~ 11.5 µg/mL

    // Case 1: Level 4.0 µg/mL -> Q24H
    const q24 = evaluateHartfordNomogram({
      agent: "gentamicin",
      hoursPostStart: 8,
      serumLevelUgMl: 4.0,
    });
    assert.ok(q24);
    assert.equal(q24.interval, "q24h");
    assert.ok(q24.label.includes("Q24H"));

    // Case 2: Level 7.0 µg/mL -> Q36H
    const q36 = evaluateHartfordNomogram({
      agent: "gentamicin",
      hoursPostStart: 8,
      serumLevelUgMl: 7.0,
    });
    assert.ok(q36);
    assert.equal(q36.interval, "q36h");
    assert.ok(q36.label.includes("Q36H"));

    // Case 3: Level 10.0 µg/mL -> Q48H
    const q48 = evaluateHartfordNomogram({
      agent: "gentamicin",
      hoursPostStart: 8,
      serumLevelUgMl: 10.0,
    });
    assert.ok(q48);
    assert.equal(q48.interval, "q48h");
    assert.ok(q48.label.includes("Q48H"));

    // Case 4: Level 14.0 µg/mL -> OFF NOMOGRAM
    const off = evaluateHartfordNomogram({
      agent: "gentamicin",
      hoursPostStart: 8,
      serumLevelUgMl: 14.0,
    });
    assert.ok(off);
    assert.equal(off.interval, "off-nomogram");
    assert.ok(off.label.includes("OFF NOMOGRAM"));
    assert.ok(off.safetyAlert?.includes("toxicity"));
  });

  it("scales Hartford nomogram cutoffs for amikacin by 2.5 factor", () => {
    // Amikacin, 8 hours post-start
    // Q24 line is ~ 5.8 * 2.5 = 14.5 µg/mL
    const resAmikacin = evaluateHartfordNomogram({
      agent: "amikacin",
      hoursPostStart: 8,
      serumLevelUgMl: 12.0,
    });

    assert.ok(resAmikacin);
    assert.equal(resAmikacin.interval, "q24h");
    assert.ok(resAmikacin.q24CutoffUgMl && resAmikacin.q24CutoffUgMl > 14);
  });

  it("rejects or flags invalid sampling timing (<6h or >14h)", () => {
    const early = evaluateHartfordNomogram({
      agent: "gentamicin",
      hoursPostStart: 4.5,
      serumLevelUgMl: 8.0,
    });
    assert.ok(early);
    assert.equal(early.interval, "too-early");
    assert.ok(early.label.includes("Too Early"));

    const late = evaluateHartfordNomogram({
      agent: "gentamicin",
      hoursPostStart: 18.0,
      serumLevelUgMl: 2.0,
    });
    assert.ok(late);
    assert.equal(late.interval, "too-late");
    assert.ok(late.label.includes("Too Late"));
  });

  it("detects active aminoglycosides and collisions on desk tray", () => {
    assert.equal(aminoglycosidesOnDesk(["gentamicin"]), true);
    assert.equal(aminoglycosidesOnDesk(["tobramycin"]), true);
    assert.equal(aminoglycosidesOnDesk(["amikacin"]), true);
    assert.equal(aminoglycosidesOnDesk(["vancomycin"]), false);

    // Vancomycin collision
    const reportVanco = aminoglycosideReportOnDesk(["tobramycin", "vancomycin"]);
    assert.equal(reportVanco.hasAminoglycoside, true);
    assert.equal(reportVanco.hasVancomycinCollision, true);
    assert.ok(reportVanco.nephrotoxicityAlert?.includes("Synergistic Nephrotoxicity"));

    // Loop diuretic collision
    const reportLoop = aminoglycosideReportOnDesk(["gentamicin", "furosemide"]);
    assert.equal(reportLoop.hasLoopDiureticCollision, true);
    assert.ok(reportLoop.nephrotoxicityAlert?.includes("Loop Diuretic"));
  });

  it("provides traditional targets for endocarditis synergy", () => {
    const synergy = TRADITIONAL_AG_TARGETS.gentamicin["synergy-endocarditis"];
    assert.equal(synergy.peakTargetUgMl, "3–4 µg/mL");
    assert.equal(synergy.troughTargetUgMl, "<1.0 µg/mL");
    assert.ok(synergy.rationale.includes("Enterococcus"));
  });
});

