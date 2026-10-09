import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CNI_TARGET_GUIDELINES,
  NOT_CLEARED,
  PI_FOOTER,
  evaluateMycophenolateEhc,
  evaluateSteroidTaperCniImpact,
  evaluateAzathioprineXanthineOxidase,
  transplantOnDesk,
  transplantReportOnDesk,
} from "./transplant-kinetics";

describe("Solid Organ Transplant Immunosuppression & CNI Kinetics Engine", () => {
  describe("Regulatory Compliance & FD&C Act § 520(o)(1)(E) Posture", () => {
    it("exports statutory disclaimer citing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(NOT_CLEARED.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(NOT_CLEARED.includes("Not an FDA-cleared medical device"));
    });

    it("verifies non-prescriptive educational decision support language", () => {
      assert.ok(PI_FOOTER.includes("Calculations reflect KDIGO"));
      assert.ok(NOT_CLEARED.includes("Transplant nephrologist / surgeon verification"));
    });

    it("report generator embeds statutory disclaimer with NOT_CLEARED and PI_FOOTER", () => {
      const report = transplantReportOnDesk(["tacrolimus"]);
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });

    it("surfaces peer-reviewed literature citations including KDIGO, AST, and Elion", () => {
      const report = transplantReportOnDesk(["tacrolimus"]);
      assert.ok(report.citations.length >= 3);
      assert.ok(report.citations.some((c) => c.includes("KDIGO")));
      assert.ok(report.citations.some((c) => c.includes("Elion")));
    });
  });

  describe("CNI Therapeutic Drug Monitoring & Whole Blood Sampling Trap", () => {
    it("mandates whole blood EDTA tube for Tacrolimus due to 85-90% erythrocyte partitioning", () => {
      const tac = CNI_TARGET_GUIDELINES.tacrolimus;
      assert.ok(tac.samplingTubeMandate.includes("WHOLE BLOOD"));
      assert.ok(tac.cellularPartitioningNote.includes("85-90% into erythrocytes"));
      assert.ok(tac.earlyPostTransplantTarget.includes("8 to 12 ng/mL"));
      assert.ok(tac.maintenanceTarget.includes("5 to 8 ng/mL"));
    });

    it("highlights acute afferent arteriolar vasoconstriction and PRES neurotoxicity for Tacrolimus", () => {
      const tac = CNI_TARGET_GUIDELINES.tacrolimus;
      assert.ok(tac.nephrotoxicityHallmarks.some((h) => h.includes("afferent arteriolar vasoconstriction")));
      assert.ok(tac.neurotoxicityHallmarks.some((h) => h.includes("Posterior Reversible Encephalopathy Syndrome")));
    });

    it("provides Cyclosporine C0 and C2 peak monitoring guidelines", () => {
      const csa = CNI_TARGET_GUIDELINES.cyclosporine;
      assert.ok(csa.earlyPostTransplantTarget.includes("C2 800-1400 ng/mL"));
      assert.ok(csa.samplingTubeMandate.includes("WHOLE BLOOD"));
    });
  });

  describe("Mycophenolate Enterohepatic Recirculation & Antibiotic Rejection Collision", () => {
    it("models normal secondary peak when microbiome is intact", () => {
      const result = evaluateMycophenolateEhc({
        mycophenolateActive: true,
        broadSpectrumAntibioticsActive: false,
      });
      assert.equal(result.baselineSecondaryPeakPresent, true);
      assert.equal(result.antibioticGutFloraDecimation, false);
      assert.equal(result.predictedMpaAucReductionPercent, 0);
    });

    it("identifies 35% MPA AUC collapse and acute rejection hazard when broad-spectrum antibiotics eliminate gut flora", () => {
      const result = evaluateMycophenolateEhc({
        mycophenolateActive: true,
        broadSpectrumAntibioticsActive: true,
      });
      assert.equal(result.baselineSecondaryPeakPresent, false);
      assert.equal(result.antibioticGutFloraDecimation, true);
      assert.equal(result.predictedMpaAucReductionPercent, 35);
      assert.ok(result.rejectionRiskAlert.includes("CRITICAL IMMUNOSUPPRESSION VULNERABILITY"));
      assert.ok(result.biochemicalMechanism.includes("beta-glucuronidases"));
    });
  });

  describe("Corticosteroid Taper CYP3A4 Rebound Simulation", () => {
    it("predicts 50% CNI trough surge during steroid de-induction weaning", () => {
      const result = evaluateSteroidTaperCniImpact({
        cniActive: true,
        highDoseSteroidTapering: true,
      });
      assert.equal(result.steroidTaperActive, true);
      assert.equal(result.expectedCniTroughSurgePercent, 50);
      assert.ok(result.clinicalAction.includes("PROACTIVE CNI TDM MONITORING"));
      assert.ok(result.biochemicalMechanism.includes("CYP3A4"));
    });
  });

  describe("Azathioprine x Xanthine Oxidase Lethal Collision", () => {
    it("detects lethal pancytopenia collision with Allopurinol and mandates 75% dose reduction", () => {
      const result = evaluateAzathioprineXanthineOxidase(["azathioprine", "allopurinol"]);
      assert.equal(result.isLethalCollisionDetected, true);
      assert.equal(result.pancytopeniaRiskLevel, "catastrophic");
      assert.ok(result.mandatoryDoseReductionRule.includes("MANDATORY 75% AZATHIOPRINE DOSE REDUCTION"));
      assert.ok(result.molecularPathwayShunt.includes("6-thioguanine nucleotides"));
    });

    it("detects no collision when allopurinol is absent", () => {
      const result = evaluateAzathioprineXanthineOxidase(["azathioprine", "tacrolimus"]);
      assert.equal(result.isLethalCollisionDetected, false);
      assert.equal(result.pancytopeniaRiskLevel, "none");
    });
  });

  describe("Desk Detection & End-to-End Report Generation", () => {
    it("detects transplant immunosuppressive agents accurately", () => {
      const det = transplantOnDesk(["tacrolimus", "mycophenolate", "prednisone"]);
      assert.equal(det.hasTransplant, true);
      assert.equal(det.hasTacrolimus, true);
      assert.equal(det.hasMycophenolate, true);
      assert.equal(det.hasPrednisone, true);
    });

    it("generates comprehensive report with lethal thiopurine alert and CNI sampling mandates", () => {
      const report = transplantReportOnDesk(["azathioprine", "allopurinol", "tacrolimus"]);
      assert.ok(report.safetyAlerts.some((a) => a.includes("Lethal Thiopurine-Allopurinol Interaction")));
      assert.ok(report.safetyAlerts.some((a) => a.includes("Tacrolimus Whole Blood Sampling Mandate")));
    });

    it("generates clean baseline report for non-transplant drugs", () => {
      const report = transplantReportOnDesk(["metformin", "lisinopril"]);
      assert.equal(report.detection.hasTransplant, false);
      assert.equal(report.safetyAlerts.length, 0);
    });
  });
});
