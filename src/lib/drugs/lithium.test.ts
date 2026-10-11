import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyLithiumLevel,
  evaluateExtripLithiumCriteria,
  calculateLithiumClearance,
  lithiumReportOnDesk,
  LITHIUM_TARGET_RANGES,
} from "./lithium";

describe("lithium pharmacokinetics & EXTRIP guidance", () => {
  it("classifies serum concentrations across consensus target bands", () => {
    // Acute mania band (0.8 - 1.2 mEq/L)
    const maniaLow = classifyLithiumLevel(0.6, "acute-mania");
    assert.equal(maniaLow.severity, "subtherapeutic");
    assert.equal(maniaLow.inTargetRange, false);

    const maniaOk = classifyLithiumLevel(1.0, "acute-mania");
    assert.equal(maniaOk.severity, "therapeutic");
    assert.equal(maniaOk.inTargetRange, true);

    // Maintenance band (0.6 - 0.8 mEq/L)
    const maintOk = classifyLithiumLevel(0.7, "maintenance");
    assert.equal(maintOk.severity, "therapeutic");
    assert.equal(maintOk.inTargetRange, true);

    const maintBorder = classifyLithiumLevel(1.3, "maintenance");
    assert.equal(maintBorder.severity, "borderline-elevated");

    // Geriatric band (0.4 - 0.6 mEq/L)
    const geriOk = classifyLithiumLevel(0.5, "geriatric");
    assert.equal(geriOk.severity, "therapeutic");
    assert.equal(geriOk.inTargetRange, true);
  });

  it("classifies mild, moderate, and severe life-threatening toxicities", () => {
    // Mild (1.5 - 2.0 mEq/L)
    const mild = classifyLithiumLevel(1.8);
    assert.equal(mild.severity, "mild");
    assert.ok(mild.symptoms.some((s) => s.toLowerCase().includes("tremor")));

    // Moderate (2.0 - 2.5 mEq/L)
    const mod = classifyLithiumLevel(2.3);
    assert.equal(mod.severity, "moderate");
    assert.ok(mod.symptoms.some((s) => s.toLowerCase().includes("clonus") || s.toLowerCase().includes("ataxia")));

    // Severe (>2.5 mEq/L)
    const severe = classifyLithiumLevel(3.8);
    assert.equal(severe.severity, "severe-life-threatening");
    assert.ok(severe.symptoms.some((s) => s.toLowerCase().includes("silent")));
  });

  it("evaluates EXTRIP consensus hemodialysis criteria accurately", () => {
    // Severe neuro symptoms -> recommended regardless of level
    const recNeuro = evaluateExtripLithiumCriteria({
      serumLithiumMeqL: 2.2,
      hasSevereNeurologicSigns: true,
    });
    assert.equal(recNeuro.indication, "recommended");
    assert.ok(recNeuro.criteriaMet.some((c) => c.includes("severe neurologic")));

    // Level > 4.0 with renal impairment -> recommended
    const recRenal = evaluateExtripLithiumCriteria({
      serumLithiumMeqL: 4.2,
      crclMlMin: 30,
    });
    assert.equal(recRenal.indication, "recommended");
    assert.ok(recRenal.criteriaMet.some((c) => c.includes("CrCl < 45")));

    // Level > 5.0 -> recommended regardless of kidneys
    const recHigh = evaluateExtripLithiumCriteria({
      serumLithiumMeqL: 5.4,
      crclMlMin: 90,
    });
    assert.equal(recHigh.indication, "recommended");
    assert.ok(recHigh.criteriaMet.some((c) => c.includes("> 5.0")));

    // Level > 4.0 without renal impairment -> suggested
    const sugNormalKidneys = evaluateExtripLithiumCriteria({
      serumLithiumMeqL: 4.3,
      crclMlMin: 80,
    });
    assert.equal(sugNormalKidneys.indication, "suggested");

    // Level > 2.5 with moderate renal impairment -> suggested
    const sugModerateRenal = evaluateExtripLithiumCriteria({
      serumLithiumMeqL: 2.8,
      crclMlMin: 40,
    });
    assert.equal(sugModerateRenal.indication, "suggested");

    // Level 1.1 asymptomatic -> not indicated
    const notIndicated = evaluateExtripLithiumCriteria({
      serumLithiumMeqL: 1.1,
      crclMlMin: 90,
    });
    assert.equal(notIndicated.indication, "not-indicated");
  });

  it("includes intracellular redistribution rebound guidance and monitoring", () => {
    const result = evaluateExtripLithiumCriteria({
      serumLithiumMeqL: 3.5,
      crclMlMin: 25,
    });

    assert.ok(result.reboundWarning.isHighRisk);
    assert.equal(result.reboundWarning.timingHours, 6);
    assert.ok(result.reboundWarning.rationale.includes("Intracellular Redistribution"));
    assert.ok(result.reboundWarning.mitigation.includes("6 to 8 hours post-dialysis"));
    assert.ok(result.modalityRecommendation.includes("Intermittent Hemodialysis"));
  });

  it("calculates proximal tubular clearance reductions and half-life extensions", () => {
    // Baseline: CrCl 100 mL/min, 70 kg
    const baseline = calculateLithiumClearance({
      crclMlMin: 100,
      weightKg: 70,
    });
    assert.equal(baseline.baselineLithiumClearanceMlMin, 20); // 20% of 100
    assert.equal(baseline.estimatedLithiumClearanceMlMin, 20);
    assert.equal(baseline.fractionalExcretionPercent, 20);
    assert.equal(baseline.percentReduction, 0);
    assert.ok(baseline.halfLifeHours >= 25 && baseline.halfLifeHours <= 35);

    // Thiazide added: ~40% drop
    const thiazide = calculateLithiumClearance({
      crclMlMin: 100,
      weightKg: 70,
      takingThiazide: true,
    });
    assert.equal(thiazide.estimatedLithiumClearanceMlMin, 12);
    assert.equal(thiazide.percentReduction, 40);
    assert.ok(thiazide.halfLifeHours > baseline.halfLifeHours);

    // Triple whammy (Thiazide + NSAID + ACEi)
    const tripleWhammy = calculateLithiumClearance({
      crclMlMin: 80,
      weightKg: 70,
      takingThiazide: true,
      takingNsaid: true,
      takingAceiArb: true,
    });
    assert.ok(tripleWhammy.percentReduction >= 60);
    assert.ok(tripleWhammy.halfLifeHours > 60);
    assert.ok(tripleWhammy.interactingFactors.length === 3);
  });

  it("detects lithium and drug interaction collisions on tray", () => {
    // No lithium
    const noLi = lithiumReportOnDesk(["sertraline", "atorvastatin"]);
    assert.equal(noLi.hasLithium, false);

    // Lithium alone
    const liAlone = lithiumReportOnDesk(["lithium"]);
    assert.equal(liAlone.hasLithium, true);
    assert.equal(liAlone.interactingDrugs.length, 0);

    // Lithium + Thiazide + NSAID
    const collision = lithiumReportOnDesk(["lithium", "hctz", "ibuprofen", "lisinopril"]);
    assert.equal(collision.hasLithium, true);
    assert.equal(collision.warnings.length, 3);
    assert.ok(collision.interactingDrugs.includes("hctz"));
    assert.ok(collision.interactingDrugs.includes("ibuprofen"));
    assert.ok(collision.interactingDrugs.includes("lisinopril"));
  });

  it("complies with non-prescriptive regulatory standards", () => {
    const report = lithiumReportOnDesk(["lithium", "hctz"]);
    assert.doesNotMatch(report.educationalNotice, /prescribe\s+\d+\s*mg/i);
    assert.doesNotMatch(report.educationalNotice, /clinical decision support/i);

    const extrip = evaluateExtripLithiumCriteria({ serumLithiumMeqL: 4.5 });
    assert.doesNotMatch(extrip.disclaimer, /clinical decision support/i);
  });
});

