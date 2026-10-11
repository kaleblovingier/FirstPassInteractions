import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OPIOID_RECEPTOR_AFFINITIES,
  NOT_CLEARED,
  PI_FOOTER,
  evaluatePrecipitatedWithdrawalRisk,
  BERNESE_PROTOCOL_SCHEDULE,
  calculateNaloxoneInfusion,
  getXylazineProtocol,
  moudOnDesk,
  moudReportOnDesk,
} from "./moud-kinetics";

describe("MOUD, Harm Reduction & Addiction Medicine Kinetics Engine", () => {
  describe("Regulatory Compliance & FD&C Act § 520(o)(1)(E) Posture", () => {
    it("exports statutory disclaimer explicitly citing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(NOT_CLEARED.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(NOT_CLEARED.includes("Not an FDA-cleared medical device"));
    });

    it("verifies non-prescriptive educational decision support language", () => {
      assert.ok(PI_FOOTER.includes("Evidence base reflects ASAM"));
      assert.ok(PI_FOOTER.includes("Individual patient clinical presentation"));
    });

    it("report generator embeds statutory disclaimer with NOT_CLEARED and PI_FOOTER", () => {
      const report = moudReportOnDesk(["buprenorphine"]);
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });

    it("surfaces peer-reviewed literature citations including ASAM, Hämmig, and Greenwald", () => {
      const report = moudReportOnDesk(["buprenorphine"]);
      assert.ok(report.citations.length >= 3);
      assert.ok(report.citations.some((c) => c.includes("ASAM")));
      assert.ok(report.citations.some((c) => c.includes("Hämmig")));
      assert.ok(report.citations.some((c) => c.includes("Greenwald")));
    });
  });

  describe("Opioid Receptor Affinity Hierarchy & Partial Agonism", () => {
    it("models buprenorphine with highest affinity (Ki 0.21 nM) and partial efficacy (alpha 0.32)", () => {
      const bup = OPIOID_RECEPTOR_AFFINITIES.buprenorphine;
      assert.equal(bup.kiNanomolar, 0.21);
      assert.equal(bup.intrinsicEfficacyAlpha, 0.32);
      assert.equal(bup.relativeAffinityRank, 1);
    });

    it("models fentanyl as full agonist (alpha 1.0) with lower affinity than buprenorphine", () => {
      const fen = OPIOID_RECEPTOR_AFFINITIES.fentanyl;
      assert.equal(fen.intrinsicEfficacyAlpha, 1.0);
      assert.ok(fen.kiNanomolar > OPIOID_RECEPTOR_AFFINITIES.buprenorphine.kiNanomolar);
    });

    it("models naloxone as pure antagonist with alpha 0.0 and short 45-min duration", () => {
      const nal = OPIOID_RECEPTOR_AFFINITIES.naloxone;
      assert.equal(nal.intrinsicEfficacyAlpha, 0.0);
      assert.equal(nal.durationHours, 0.75);
    });
  });

  describe("Precipitated Withdrawal Risk Evaluation", () => {
    it("identifies high risk when buprenorphine is taken < 24h after fentanyl with low COWS score", () => {
      const evalResult = evaluatePrecipitatedWithdrawalRisk({
        lastFullAgonistUsed: "fentanyl",
        hoursSinceLastUse: 8,
        currentCowsScore: 4,
        inductionApproach: "traditional",
      });
      assert.equal(evalResult.riskTier, "high");
      assert.ok(evalResult.cowsRecommendation.includes("COWS >= 12 to 13"));
    });

    it("identifies minimal risk when using Bernese micro-induction approach", () => {
      const evalResult = evaluatePrecipitatedWithdrawalRisk({
        lastFullAgonistUsed: "fentanyl",
        hoursSinceLastUse: 6,
        inductionApproach: "bernese-micro-induction",
      });
      assert.equal(evalResult.riskTier, "minimal");
      assert.equal(evalResult.riskScore, 1);
      assert.ok(evalResult.receptorMechanism.includes("Micro-induction"));
    });

    it("lowers risk when COWS score is >= 13 indicating objective withdrawal", () => {
      const evalResult = evaluatePrecipitatedWithdrawalRisk({
        lastFullAgonistUsed: "short-acting (oxycodone/heroin/morphine)",
        hoursSinceLastUse: 18,
        currentCowsScore: 16,
        inductionApproach: "traditional",
      });
      assert.equal(evalResult.riskTier, "minimal");
    });
  });

  describe("Bernese Micro-Induction Schedule", () => {
    it("provides complete 7-day stepwise schedule from 0.5 mg to 16 mg", () => {
      assert.equal(BERNESE_PROTOCOL_SCHEDULE.length, 7);
      assert.equal(BERNESE_PROTOCOL_SCHEDULE[0].day, 1);
      assert.ok(BERNESE_PROTOCOL_SCHEDULE[0].buprenorphineDose.includes("0.5 mg"));
      assert.equal(BERNESE_PROTOCOL_SCHEDULE[6].day, 7);
      assert.ok(BERNESE_PROTOCOL_SCHEDULE[6].buprenorphineDose.includes("16.0 mg"));
      assert.ok(BERNESE_PROTOCOL_SCHEDULE[6].fullAgonistInstruction.includes("STOP full-agonist"));
    });

    it("models progressive receptor occupancy from ~3% on Day 1 to ~88% on Day 7", () => {
      assert.equal(BERNESE_PROTOCOL_SCHEDULE[0].estimatedReceptorOccupancyPercent, 3);
      assert.equal(BERNESE_PROTOCOL_SCHEDULE[6].estimatedReceptorOccupancyPercent, 88);
    });
  });

  describe("Naloxone Continuous Infusion & Renarcotization Trap", () => {
    it("calculates 2/3 hourly infusion rate from successful waking bolus", () => {
      const plan = calculateNaloxoneInfusion({
        successfulBolusMg: 1.2,
        suspectedOpioid: "fentanyl",
      });
      assert.equal(plan.bolusDoseAdministeredMg, 1.2);
      assert.equal(plan.hourlyContinuousInfusionMg, 0.8);
      assert.equal(plan.hourlyInfusionMlPerHour, 20.0);
      assert.equal(plan.renarcotizationRiskLevel, "high");
      assert.equal(plan.minimumObservationHours, 12);
      assert.ok(plan.pharmacokineticTrap.includes("Naloxone IV t1/2 is only 30-90 minutes"));
    });

    it("mandates 24-hour observation for methadone overdose due to long half-life", () => {
      const plan = calculateNaloxoneInfusion({
        successfulBolusMg: 0.8,
        suspectedOpioid: "methadone",
      });
      assert.equal(plan.minimumObservationHours, 24);
      assert.equal(plan.renarcotizationRiskLevel, "high");
    });
  });

  describe("Xylazine Co-Intoxication Management", () => {
    it("details non-opioid alpha-2 hallmarks and absolute naloxone refractoriness", () => {
      const proto = getXylazineProtocol();
      assert.ok(proto.naloxoneResponseAlert.includes("XYLAZINE IS NOT AN OPIOID"));
      assert.ok(proto.naloxoneResponseAlert.includes("COMPLETELY UNRESPONSIVE to naloxone"));
      assert.ok(proto.clinicalHallmarks.some((h) => h.includes("bradycardia")));
      assert.ok(proto.woundCareGuidance.includes("ischemic necrosis"));
    });
  });

  describe("Desk Detection & End-to-End Report Generation", () => {
    it("detects MOUD agents accurately from tray", () => {
      const det = moudOnDesk(["buprenorphine", "naloxone", "fentanyl"]);
      assert.equal(det.hasMoud, true);
      assert.equal(det.hasBuprenorphine, true);
      assert.equal(det.hasNaloxone, true);
      assert.equal(det.hasFentanyl, true);
      assert.equal(det.hasFullAgonist, true);
    });

    it("generates comprehensive report with precipitated withdrawal alert when buprenorphine and fentanyl are co-present", () => {
      const report = moudReportOnDesk(["buprenorphine", "fentanyl"], undefined, {
        hoursSinceLastUse: 6,
        currentCowsScore: 5,
      });
      assert.ok(report.safetyAlerts.some((a) => a.includes("Precipitated Withdrawal Hazard")));
      assert.ok(report.precipitatedWithdrawalReview);
      assert.equal(report.precipitatedWithdrawalReview.riskTier, "high");
    });

    it("generates naltrexone strict abstinence alert when naltrexone and full agonist are co-present", () => {
      const report = moudReportOnDesk(["naltrexone", "morphine"]);
      assert.ok(report.safetyAlerts.some((a) => a.includes("Naltrexone Strict Opioid Abstinence Rule")));
    });

    it("generates methadone QTc alert when methadone is present", () => {
      const report = moudReportOnDesk(["methadone"]);
      assert.ok(report.safetyAlerts.some((a) => a.includes("Methadone Kinetics & Arrhythmia Safety")));
    });

    it("generates clean baseline report for non-MOUD drugs", () => {
      const report = moudReportOnDesk(["amoxicillin", "atorvastatin"]);
      assert.equal(report.detection.hasMoud, false);
      assert.equal(report.safetyAlerts.length, 0);
    });
  });
});
