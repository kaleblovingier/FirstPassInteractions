import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  VASOACTIVE_AGENTS,
  NOT_CLEARED,
  PI_FOOTER,
  evaluateScaiShockStage,
  evaluateEpinephrineLactate,
  compareInotropeRenalClearance,
  getPhentolamineExtravasationProtocol,
  vasoactiveOnDesk,
  vasoactiveReportOnDesk,
} from "./vasoactive-kinetics";
import { DEFAULT_HOST } from "./types";

describe("Vasoactive Hemodynamics & Shock Classification Engine", () => {
  describe("Regulatory Compliance & FD&C Act § 520(o)(1)(E) Posture", () => {
    it("exports statutory disclaimer citing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(NOT_CLEARED.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(NOT_CLEARED.includes("Not an FDA-cleared medical device"));
    });

    it("verifies non-prescriptive educational decision support language", () => {
      assert.ok(PI_FOOTER.includes("Calculations reflect peer-reviewed literature"));
      assert.ok(PI_FOOTER.includes("Real-time clinical judgment"));
    });

    it("report generator embeds statutory disclaimer with NOT_CLEARED and PI_FOOTER", () => {
      const report = vasoactiveReportOnDesk(["norepinephrine"]);
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });

    it("surfaces peer-reviewed literature citations including SCAI, Surviving Sepsis, and SOAP II", () => {
      const report = vasoactiveReportOnDesk(["norepinephrine"]);
      assert.ok(report.citations.length >= 4);
      assert.ok(report.citations.some((c) => c.includes("SCAI")));
      assert.ok(report.citations.some((c) => c.includes("Surviving Sepsis")));
      assert.ok(report.citations.some((c) => c.includes("SOAP II")));
    });
  });

  describe("Receptor Selectivity Profiles", () => {
    it("accurately models Norepinephrine as predominant alpha-1 with modest beta-1", () => {
      const agent = VASOACTIVE_AGENTS.norepinephrine;
      assert.equal(agent.receptorProfile.alpha1, 4);
      assert.equal(agent.receptorProfile.beta1, 2);
      assert.equal(agent.receptorProfile.beta2, 1);
      assert.equal(agent.receptorProfile.v1a, 0);
      assert.equal(agent.receptorProfile.hemodynamicEffect.svr, "increase");
    });

    it("accurately models Epinephrine as potent alpha and beta agonist with dose-dependent spectrum", () => {
      const agent = VASOACTIVE_AGENTS.epinephrine;
      assert.equal(agent.receptorProfile.alpha1, 4);
      assert.equal(agent.receptorProfile.beta1, 4);
      assert.equal(agent.receptorProfile.beta2, 3);
      assert.equal(agent.arrhythmiaRisk, "high");
    });

    it("accurately models Vasopressin as selective V1a agonist with zero beta chronotropy", () => {
      const agent = VASOACTIVE_AGENTS.vasopressin;
      assert.equal(agent.receptorProfile.v1a, 4);
      assert.equal(agent.receptorProfile.alpha1, 0);
      assert.equal(agent.receptorProfile.beta1, 0);
      assert.equal(agent.receptorProfile.hemodynamicEffect.hr, "neutral");
    });

    it("accurately models Phenylephrine as pure alpha-1 with reflex bradycardia and CO decrease", () => {
      const agent = VASOACTIVE_AGENTS.phenylephrine;
      assert.equal(agent.receptorProfile.alpha1, 4);
      assert.equal(agent.receptorProfile.beta1, 0);
      assert.equal(agent.receptorProfile.hemodynamicEffect.hr, "decrease");
      assert.equal(agent.receptorProfile.hemodynamicEffect.co, "decrease");
    });

    it("accurately models Dobutamine as beta-1 predominant inotrope with low renal dependence", () => {
      const agent = VASOACTIVE_AGENTS.dobutamine;
      assert.equal(agent.receptorProfile.beta1, 4);
      assert.equal(agent.receptorProfile.beta2, 2);
      assert.equal(agent.renalClearanceFraction, 0.1);
      assert.equal(agent.halfLifeMinutes, 2);
    });

    it("accurately models Milrinone as PDE-3 inhibitor inodilator with 85% renal elimination", () => {
      const agent = VASOACTIVE_AGENTS.milrinone;
      assert.equal(agent.receptorProfile.pde3Inhibition, true);
      assert.equal(agent.renalClearanceFraction, 0.85);
      assert.equal(agent.class, "inodilator");
      assert.equal(agent.receptorProfile.hemodynamicEffect.svr, "decrease");
    });

    it("accurately models Angiotensin II as pure AT1 agonist with thromboembolism safety warnings", () => {
      const agent = VASOACTIVE_AGENTS["angiotensin-ii"];
      assert.equal(agent.receptorProfile.at1, 4);
      assert.ok(agent.keySafetyAlerts.some((a) => a.toLowerCase().includes("thromboembolism")));
    });
  });

  describe("SCAI Shock Stage Stratification", () => {
    it("evaluates normotensive patient as Stage A (At Risk)", () => {
      const result = evaluateScaiShockStage({
        sbp: 125,
        map: 82,
        lactate: 1.1,
      });
      assert.equal(result.stage, "A");
      assert.equal(result.mortalityRiskTier, "low (<5%)");
    });

    it("evaluates isolated relative hypotension or tachycardia with normal lactate as Stage B (Beginning)", () => {
      const result = evaluateScaiShockStage({
        sbp: 86,
        map: 58,
        heartRate: 112,
        lactate: 1.4,
      });
      assert.equal(result.stage, "B");
      assert.equal(result.mortalityRiskTier, "moderate (5-15%)");
    });

    it("evaluates hypotension with elevated lactate or oliguria requiring vasopressor as Stage C (Classic)", () => {
      const result = evaluateScaiShockStage({
        sbp: 82,
        map: 54,
        lactate: 3.2,
        vasoactiveAgentCount: 1,
        urineOutputMlPerHour: 18,
      });
      assert.equal(result.stage, "C");
      assert.equal(result.mortalityRiskTier, "high (15-30%)");
      assert.ok(result.recommendedMonitoring.some((m) => m.toLowerCase().includes("arterial line")));
    });

    it("evaluates escalating multiple vasopressors or severe lactate as Stage D (Deteriorating)", () => {
      const result = evaluateScaiShockStage({
        sbp: 84,
        lactate: 4.8,
        vasoactiveAgentCount: 2,
      });
      assert.equal(result.stage, "D");
      assert.equal(result.mortalityRiskTier, "severe (30-50%)");
    });

    it("evaluates cardiac arrest with CPR or severe acidosis as Stage E (Extremis)", () => {
      const result = evaluateScaiShockStage({
        cardiacArrestOrCPR: true,
        lactate: 9.5,
      });
      assert.equal(result.stage, "E");
      assert.equal(result.mortalityRiskTier, "catastrophic (>50%)");
      assert.ok(result.recommendedMonitoring.some((m) => m.toLowerCase().includes("ecmo")));
    });
  });

  describe("Epinephrine Type B Hyperlactatemia Differentiation", () => {
    it("identifies benign Type B aerobic hyperlactatemia when pH, ScvO2, and urine output are preserved", () => {
      const result = evaluateEpinephrineLactate({
        lactate: 4.2,
        epinephrineActive: true,
        arterialPh: 7.39,
        scvO2: 74,
        urineOutputAdequate: true,
      });
      assert.equal(result.classification, "Type B (Aerobic Epinephrine-Mediated)");
      assert.equal(result.isBenignMetabolicArtifact, true);
      assert.ok(result.clinicalActionSummary.includes("Do NOT mistake"));
      assert.ok(result.physiologicalRationale.includes("beta-2 adrenergic receptors"));
    });

    it("differentiates true Type A anaerobic debt when acidemia or depressed ScvO2 is present despite epinephrine", () => {
      const result = evaluateEpinephrineLactate({
        lactate: 5.8,
        epinephrineActive: true,
        arterialPh: 7.24,
        scvO2: 52,
        urineOutputAdequate: false,
      });
      assert.equal(result.classification, "Type A (Anaerobic Tissue Hypoperfusion)");
      assert.equal(result.isBenignMetabolicArtifact, false);
      assert.ok(result.clinicalActionSummary.includes("Severe tissue hypoperfusion present"));
    });

    it("classifies elevated lactate without epinephrine as Type A hypoperfusion", () => {
      const result = evaluateEpinephrineLactate({
        lactate: 3.5,
        epinephrineActive: false,
      });
      assert.equal(result.classification, "Type A (Anaerobic Tissue Hypoperfusion)");
      assert.equal(result.isBenignMetabolicArtifact, false);
    });

    it("identifies normal lactate <= 2.0 as Indeterminate / Mixed baseline", () => {
      const result = evaluateEpinephrineLactate({
        lactate: 1.2,
        epinephrineActive: false,
      });
      assert.equal(result.classification, "Indeterminate / Mixed");
      assert.equal(result.isBenignMetabolicArtifact, false);
    });
  });

  describe("Milrinone vs Dobutamine Renal Clearance Elimination", () => {
    it("shows normal half-life of milrinone at CrCl 80 mL/min", () => {
      const comp = compareInotropeRenalClearance(80);
      assert.equal(comp.milrinone.accumulationRiskTier, "normal");
      assert.equal(comp.milrinone.estimatedHalfLifeHours, 2.4);
      assert.equal(comp.dobutamine.estimatedHalfLifeMinutes, 2.0);
    });

    it("identifies severe accumulation and 10-fold half-life surge of milrinone at CrCl 15 mL/min", () => {
      const comp = compareInotropeRenalClearance(15);
      assert.equal(comp.milrinone.accumulationRiskTier, "severe accumulation / toxicity trap");
      assert.ok(comp.milrinone.estimatedHalfLifeHours >= 24);
      assert.ok(comp.milrinone.doseAdjustmentRationale.includes("CrCl < 30 mL/min"));
      assert.ok(comp.dobutamine.clinicalRecommendation.includes("Preferred inotrope in AKI"));
    });
  });

  describe("Extravasation Phentolamine Rescue Protocol", () => {
    it("returns standard phentolamine 5 to 10 mg infiltration protocol within 12h window", () => {
      const proto = getPhentolamineExtravasationProtocol();
      assert.ok(proto.antidote.includes("Phentolamine"));
      assert.ok(proto.doseAndPreparation.includes("5 to 10 mg"));
      assert.equal(proto.timeWindowHours, 12);
      assert.ok(proto.alternativeAgent.includes("Nitroglycerin"));
    });
  });

  describe("Desk Detection & End-to-End Report Generation", () => {
    it("accurately detects vasoactive agents from drugIds", () => {
      const det = vasoactiveOnDesk(["norepinephrine", "vasopressin", "lisinopril"]);
      assert.equal(det.hasVasoactive, true);
      assert.equal(det.detectedAgents.length, 2);
      assert.equal(det.hasVasopressor, true);
      assert.equal(det.isMultiVasoactive, true);
      assert.equal(det.hasExtravasationRisk, true);
    });

    it("generates comprehensive report with alerts for milrinone in renal failure", () => {
      const report = vasoactiveReportOnDesk(["milrinone", "norepinephrine"], { kidney: "ckd" }, { patientCrCl: 20 });
      assert.equal(report.detection.hasMilrinone, true);
      assert.ok(report.safetyAlerts.some((a) => a.includes("Milrinone Renal Clearance Hazard")));
      assert.ok(report.safetyAlerts.some((a) => a.includes("Concomitant Vasoactive Regimen")));
      assert.ok(report.safetyAlerts.some((a) => a.includes("High Alpha-1 Extravasation Hazard")));
    });

    it("generates clean baseline report for non-vasoactive drugs", () => {
      const report = vasoactiveReportOnDesk(["metformin", "atorvastatin"]);
      assert.equal(report.detection.hasVasoactive, false);
      assert.equal(report.activeAgents.length, 0);
      assert.equal(report.safetyAlerts.length, 0);
    });
  });
});
