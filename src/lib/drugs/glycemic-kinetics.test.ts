import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GLYCEMIC_CDS_DISCLAIMER,
  GLYCEMIC_CITATIONS,
  evaluatePotassiumSafetyGate,
  calculateCorrectedSodium,
  calculateEffectiveSerumOsmolality,
  calculateAnionGap,
  evaluateTwoBagFluidTitration,
  evaluateIvInsulinProtocol,
  evaluateSulfonylureaToxicity,
  calculateInpatientInsulinRegimen,
  glycemicOnDesk,
  glycemicReportOnDesk,
} from "./glycemic-kinetics";
import { DEFAULT_HOST } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

describe("Glycemic Kinetics, DKA/HHS Protocols, Potassium Safety Gate & Inpatient Insulin Engine", () => {
  // ==========================================================================
  // 1. STATUTORY CDS REGULATORY CONFORMANCE (FD&C Act § 520(o)(1)(E))
  // ==========================================================================
  describe("Regulatory Posture & Non-Device CDS Conformance", () => {
    it("exports statutory disclaimer explicitly citing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(GLYCEMIC_CDS_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(GLYCEMIC_CDS_DISCLAIMER.includes("Non-Device Clinical Decision Support"));
      assert.ok(GLYCEMIC_CDS_DISCLAIMER.includes("licensed healthcare professionals"));
      assert.ok(GLYCEMIC_CDS_DISCLAIMER.includes("independent clinical verification"));
      assert.ok(GLYCEMIC_CDS_DISCLAIMER.includes("Prescribing Information"));
    });

    it("ensures disclaimer maintains non-prescriptive, educational decision support posture", () => {
      assert.ok(GLYCEMIC_CDS_DISCLAIMER.includes("does not provide automated diagnostic conclusions"));
      assert.ok(GLYCEMIC_CDS_DISCLAIMER.includes("does not emit closed-loop infusion commands"));
      assert.ok(GLYCEMIC_CDS_DISCLAIMER.includes("does not replace individualized bedside clinical evaluation"));
    });

    it("contains authoritative peer-reviewed endocrine & critical care literature citations", () => {
      assert.ok(GLYCEMIC_CITATIONS.length >= 8);
      assert.ok(GLYCEMIC_CITATIONS.some((c) => c.citation.includes("Standards of Care")));
      assert.ok(GLYCEMIC_CITATIONS.some((c) => c.citation.includes("Kitabchi")));
      assert.ok(GLYCEMIC_CITATIONS.some((c) => c.citation.includes("Dhatariya")));
      assert.ok(GLYCEMIC_CITATIONS.some((c) => c.citation.includes("RABBIT 2")));
      assert.ok(GLYCEMIC_CITATIONS.some((c) => c.citation.includes("Klein-Schwartz")));
      assert.ok(GLYCEMIC_CITATIONS.some((c) => c.citation.includes("Boyle")));
      assert.ok(GLYCEMIC_CITATIONS.some((c) => c.citation.includes("Hillier")));
    });

    it("embeds statutory disclaimer with platform regulatory footers in reports", () => {
      const report = glycemicReportOnDesk(["insulin-regular", "glipizide"], DEFAULT_HOST);
      assert.ok(report.disclaimer.includes(GLYCEMIC_CDS_DISCLAIMER));
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });
  });

  // ==========================================================================
  // 2. CRITICAL POTASSIUM SAFETY GATE (<3.3, 3.3-5.3, >5.3)
  // ==========================================================================
  describe("Critical Potassium Safety Gate Evaluation", () => {
    it("strictly HOLDS all insulin and mandates aggressive IV potassium repletion when K+ < 3.3 mEq/L", () => {
      const gate = evaluatePotassiumSafetyGate(2.9);
      assert.equal(gate.status, "critical-hold-insulin");
      assert.equal(gate.insulinAction, "HOLD_ALL_INSULIN");
      assert.equal(gate.isInsulinPermitted, false);
      assert.equal(gate.warningSeverity, "critical");
      assert.ok(gate.potassiumReplacementRate.includes("20 to 40 mEq/h"));
      assert.ok(gate.potassiumReplacementRate.includes("central venous catheter required"));
      assert.ok(gate.potassiumReplacementRate.includes("continuous cardiac ECG telemetry"));
      assert.ok(gate.warningBanner.includes("HOLD ALL INSULIN IMMEDIATELY"));
      assert.ok(gate.warningBanner.includes("cardiac arrhythmias"));
      assert.ok(gate.physiologicalRationale.includes("Na+/K+-ATPase"));
    });

    it("permits insulin infusion and mandates ongoing potassium repletion when K+ is 3.3 to 5.3 mEq/L", () => {
      const gate = evaluatePotassiumSafetyGate(4.2);
      assert.equal(gate.status, "replete-k-run-insulin");
      assert.equal(gate.insulinAction, "START_OR_CONTINUE_INSULIN");
      assert.equal(gate.isInsulinPermitted, true);
      assert.equal(gate.warningSeverity, "caution");
      assert.ok(gate.potassiumReplacementRate.includes("20 to 30 mEq K+"));
      assert.ok(gate.targetSerumK.includes("4.0 to 5.0 mEq/L"));
      assert.ok(gate.monitoringFrequency.includes("2 to 4 hours"));
    });

    it("handles boundary condition K+ = 3.3 mEq/L as replete and start insulin", () => {
      const gate = evaluatePotassiumSafetyGate(3.3);
      assert.equal(gate.status, "replete-k-run-insulin");
      assert.equal(gate.isInsulinPermitted, true);
    });

    it("handles boundary condition K+ = 5.3 mEq/L as replete and start insulin", () => {
      const gate = evaluatePotassiumSafetyGate(5.3);
      assert.equal(gate.status, "replete-k-run-insulin");
      assert.equal(gate.isInsulinPermitted, true);
    });

    it("holds potassium repletion and permits insulin when K+ > 5.3 mEq/L with q2h monitoring", () => {
      const gate = evaluatePotassiumSafetyGate(5.8);
      assert.equal(gate.status, "hold-k-run-insulin");
      assert.equal(gate.insulinAction, "START_OR_CONTINUE_INSULIN");
      assert.equal(gate.isInsulinPermitted, true);
      assert.equal(gate.warningSeverity, "safe");
      assert.ok(gate.potassiumReplacementRate.includes("Do not add potassium"));
      assert.ok(gate.monitoringFrequency.includes("every 2 hours"));
      assert.ok(gate.physiologicalRationale.includes("transcellular H+/K+ exchange"));
    });
  });

  // ==========================================================================
  // 3. TWO-BAG FLUID TITRATION & CORRECTED SODIUM ENGINE
  // ==========================================================================
  describe("Corrected Sodium & Two-Bag Fluid Titration", () => {
    it("calculates corrected sodium via Katz (1.6) and Hillier (2.0) factors", () => {
      // Measured Na = 130, Glucose = 600
      // Excess hundreds = (600 - 100) / 100 = 5.0
      // Katz Na = 130 + 1.6 * 5 = 138.0
      // Hillier Na = 130 + 2.0 * 5 = 140.0
      const katzResult = calculateCorrectedSodium(130, 600, "katz");
      assert.equal(katzResult.katzNa, 138.0);
      assert.equal(katzResult.hillierNa, 140.0);
      assert.equal(katzResult.correctedNa, 138.0);
      assert.equal(katzResult.deltaNa, 8.0);
      assert.equal(katzResult.clinicalInterpretation, "normal");
      assert.equal(katzResult.recommendedMaintenanceFluid, "0.45% NS (Half-Normal Saline)");

      const hillierResult = calculateCorrectedSodium(130, 600, "hillier");
      assert.equal(hillierResult.correctedNa, 140.0);
      assert.equal(hillierResult.deltaNa, 10.0);
    });

    it("recommends 0.9% NS maintenance when corrected sodium is low (<135 mEq/L)", () => {
      const result = calculateCorrectedSodium(120, 300, "katz");
      // 120 + 1.6 * 2 = 123.2 (<135)
      assert.equal(result.clinicalInterpretation, "low");
      assert.equal(result.recommendedMaintenanceFluid, "0.9% NS (Normal Saline)");
    });

    it("calculates effective serum osmolality without urea artifact (2*Na + Glucose/18)", () => {
      // Measured Na = 140, Glucose = 360 -> 2*140 + 360/18 = 280 + 20 = 300.0 mOsm/kg
      const osm = calculateEffectiveSerumOsmolality(140, 360);
      assert.equal(osm, 300.0);
    });

    it("calculates anion gap correctly: Na - (Cl + HCO3)", () => {
      // Na = 135, Cl = 98, HCO3 = 12 -> 135 - 110 = 25
      const ag = calculateAnionGap(135, 98, 12);
      assert.equal(ag, 25);
    });

    it("identifies Dextrose switch point milestone at glucose < 200 mg/dL in DKA", () => {
      const dkaPreSwitch = evaluateTwoBagFluidTitration({
        measuredNa: 135,
        glucose: 240,
        condition: "DKA",
      });
      assert.equal(dkaPreSwitch.dextroseSwitchThreshold, 200);
      assert.equal(dkaPreSwitch.isDextroseIndicated, false);
      assert.equal(dkaPreSwitch.dextroseAdditionMilestone.reached, false);

      const dkaPostSwitch = evaluateTwoBagFluidTitration({
        measuredNa: 135,
        glucose: 185,
        condition: "DKA",
      });
      assert.equal(dkaPostSwitch.isDextroseIndicated, true);
      assert.equal(dkaPostSwitch.dextroseAdditionMilestone.reached, true);
      assert.ok(dkaPostSwitch.dextroseAdditionMilestone.cerebralEdemaWarning.includes("CEREBRAL EDEMA WARNING"));
      assert.ok(dkaPostSwitch.dextroseAdditionMilestone.cerebralEdemaWarning.includes("idiogenic osmoles"));
      assert.ok(dkaPostSwitch.dextroseAdditionMilestone.twoBagComposition.titrationStrategy.includes("Bag 1:Bag 2 ratio"));
    });

    it("identifies Dextrose switch point milestone at glucose < 300 mg/dL in HHS", () => {
      const hhsPreSwitch = evaluateTwoBagFluidTitration({
        measuredNa: 142,
        glucose: 350,
        condition: "HHS",
      });
      assert.equal(hhsPreSwitch.dextroseSwitchThreshold, 300);
      assert.equal(hhsPreSwitch.isDextroseIndicated, false);

      const hhsPostSwitch = evaluateTwoBagFluidTitration({
        measuredNa: 142,
        glucose: 280,
        condition: "HHS",
      });
      assert.equal(hhsPostSwitch.dextroseSwitchThreshold, 300);
      assert.equal(hhsPostSwitch.isDextroseIndicated, true);
      assert.ok(hhsPostSwitch.dextroseAdditionMilestone.targetGlucoseClampingRange.includes("200 to 300 mg/dL"));
    });
  });

  // ==========================================================================
  // 4. IV REGULAR INSULIN DOSING & DKA RESOLUTION CRITERIA
  // ==========================================================================
  describe("IV Regular Insulin Dosing, Decline Rate & DKA Resolution", () => {
    it("calculates fixed-rate regular insulin at 0.1 units/kg/h and no-bolus rate 0.14 units/kg/h", () => {
      const protocol = evaluateIvInsulinProtocol({
        patientWeightKg: 70,
        serumK: 4.5,
        currentGlucose: 350,
      });
      assert.equal(protocol.fixedRateUnitsPerHour, 7.0);
      assert.equal(protocol.noBolusRateUnitsPerHour, 9.8);
      assert.equal(protocol.optionalInitialBolusUnits, 7.0);
      assert.equal(protocol.targetDeclineRateRange, "50 to 75 mg/dL per hour");
    });

    it("evaluates glucose hourly decline rate and issues appropriate clinical guidance", () => {
      // Subtarget decline (< 50 mg/dL/h)
      const subtarget = evaluateIvInsulinProtocol({
        patientWeightKg: 80,
        serumK: 4.0,
        currentGlucose: 380,
        priorGlucose: 410, // decline of 30 mg/dL/h
      });
      assert.equal(subtarget.declineRateEvaluation?.hourlyDecline, 30);
      assert.equal(subtarget.declineRateEvaluation?.assessment, "subtarget");
      assert.ok(subtarget.declineRateEvaluation?.clinicalGuidance.includes("double the insulin infusion rate"));

      // Optimal decline (50-75 mg/dL/h)
      const optimal = evaluateIvInsulinProtocol({
        patientWeightKg: 80,
        serumK: 4.0,
        currentGlucose: 330,
        priorGlucose: 395, // decline of 65 mg/dL/h
      });
      assert.equal(optimal.declineRateEvaluation?.assessment, "optimal");

      // Excessive decline (> 100 mg/dL/h)
      const excessive = evaluateIvInsulinProtocol({
        patientWeightKg: 80,
        serumK: 4.0,
        currentGlucose: 240,
        priorGlucose: 380, // decline of 140 mg/dL/h
      });
      assert.equal(excessive.declineRateEvaluation?.assessment, "excessive");
      assert.ok(excessive.declineRateEvaluation?.clinicalGuidance.includes("cerebral edema"));
    });

    it("verifies DKA resolution criteria (glucose < 200 AND >= 2 of HCO3 >= 18, pH > 7.30, Anion Gap <= 12)", () => {
      // Not resolved: Glucose 250 (fails glucose rule), even if bicarb/pH/AG normal
      const notResolvedHighGlucose = evaluateIvInsulinProtocol({
        patientWeightKg: 70,
        serumK: 4.2,
        currentGlucose: 250,
        bicarbonate: 19,
        venousPh: 7.35,
        anionGap: 10,
      });
      assert.equal(notResolvedHighGlucose.dkaResolutionStatus.glucoseSatisfied, false);
      assert.equal(notResolvedHighGlucose.dkaResolutionStatus.isResolved, false);

      // Not resolved: Glucose 180, but only 1 lab criteria met
      const notResolvedOneLab = evaluateIvInsulinProtocol({
        patientWeightKg: 70,
        serumK: 4.2,
        currentGlucose: 180,
        bicarbonate: 14,
        venousPh: 7.28,
        anionGap: 11, // only AG satisfied
      });
      assert.equal(notResolvedOneLab.dkaResolutionStatus.glucoseSatisfied, true);
      assert.equal(notResolvedOneLab.dkaResolutionStatus.criteriaMetCount, 1);
      assert.equal(notResolvedOneLab.dkaResolutionStatus.isResolved, false);

      // Fully resolved: Glucose 175, HCO3 19, pH 7.33, AG 10
      const fullyResolved = evaluateIvInsulinProtocol({
        patientWeightKg: 70,
        serumK: 4.2,
        currentGlucose: 175,
        bicarbonate: 19,
        venousPh: 7.33,
        anionGap: 10,
      });
      assert.equal(fullyResolved.dkaResolutionStatus.glucoseSatisfied, true);
      assert.equal(fullyResolved.dkaResolutionStatus.criteriaMetCount, 3);
      assert.equal(fullyResolved.dkaResolutionStatus.isResolved, true);
      assert.ok(fullyResolved.dkaResolutionStatus.clinicalGuidance.includes("Resolution Criteria MET"));
    });

    it("enforces subcutaneous basal insulin 2-hour transition bridge before stopping IV insulin", () => {
      const protocol = evaluateIvInsulinProtocol({
        patientWeightKg: 70,
        serumK: 4.0,
        currentGlucose: 160,
      });
      assert.equal(protocol.subcutaneousTransitionBridge.mandatoryAdvanceTimeHours, 2);
      assert.ok(protocol.subcutaneousTransitionBridge.halfLifeWarning.includes("5 to 9 minutes"));
      assert.ok(protocol.subcutaneousTransitionBridge.halfLifeWarning.includes("rebound ketoacidosis"));
    });
  });

  // ==========================================================================
  // 5. SULFONYLUREA OVERDOSE & OCTREOTIDE ANTIDOTE PROTOCOL
  // ==========================================================================
  describe("Sulfonylurea Overdose & Octreotide Antidote", () => {
    it("identifies sulfonylureas and generates full octreotide dosing protocol", () => {
      const oct = evaluateSulfonylureaToxicity(["glipizide", "metformin"]);
      assert.equal(oct.hasSulfonylureaOrSecretagogue, true);
      assert.ok(oct.detectedAgents.includes("glipizide"));
      assert.equal(oct.adultDosing.doseRange, "50 to 100 mcg");
      assert.ok(oct.adultDosing.frequency.includes("8 to 12 hours"));
      assert.equal(oct.observationWindowHours, 24);
    });

    it("articulates the Paradoxical Dextrose Trap and SSTR2 pharmacodynamic mechanism", () => {
      const oct = evaluateSulfonylureaToxicity(["glyburide"]);
      assert.ok(oct.paradoxicalDextroseTrapWarning.includes("PARADOXICAL DEXTROSE TRAP"));
      assert.ok(oct.paradoxicalDextroseTrapWarning.includes("GLUT2"));
      assert.ok(oct.paradoxicalDextroseTrapWarning.includes("MASSIVE SURGES OF ENDOGENOUS INSULIN RELEASE"));
      assert.ok(oct.pharmacodynamicMechanism.includes("SSTR2"));
      assert.ok(oct.pharmacodynamicMechanism.includes("voltage-gated L-type calcium channels"));
      assert.ok(oct.monitoringPlan.includes("at least 24 hours AFTER the final dose"));
    });

    it("provides pediatric octreotide dosing (1-2 mcg/kg, max 50 mcg)", () => {
      const oct = evaluateSulfonylureaToxicity(["glimepiride"]);
      assert.ok(oct.pediatricDosing.doseMgKg.includes("1 to 2 mcg/kg"));
      assert.ok(oct.pediatricDosing.doseMgKg.includes("maximum 50 mcg"));
    });
  });

  // ==========================================================================
  // 6. INPATIENT BASAL-BOLUS-CORRECTION INSULIN SIZING ENGINE
  // ==========================================================================
  describe("Inpatient Basal-Bolus-Correction Insulin Regimen & Rule of 1800", () => {
    it("sizes standard adult inpatient regimen at 0.45 units/kg/day with 50/50 basal/prandial split", () => {
      // 80 kg patient * 0.45 = 36 units TDD
      // Basal = 18 units
      // Prandial = 18 units total (6 units per meal across 3 meals)
      // Rule of 1800: ISF = 1800 / 36 = 50 mg/dL
      const regimen = calculateInpatientInsulinRegimen({
        patientWeightKg: 80,
      });
      assert.equal(regimen.totalDailyDoseUnits, 36);
      assert.equal(regimen.basalComponent.dailyUnits, 18);
      assert.equal(regimen.prandialComponent.totalDailyUnits, 18);
      assert.equal(regimen.prandialComponent.perMealUnits, 6.0);
      assert.equal(regimen.correctionScale.ruleOf1800Isf, 50);
      assert.equal(regimen.correctionScale.targetBloodGlucose, 140);
    });

    it("applies conservative dosing (0.25 units/kg/day) in frail / elderly / CKD patients", () => {
      // 60 kg patient * 0.25 = 15 units TDD
      const frailRegimen = calculateInpatientInsulinRegimen({
        patientWeightKg: 60,
        phenotype: "frail_renal",
        egfr: 25,
      });
      assert.equal(frailRegimen.phenotypeMultiplier, 0.25);
      assert.equal(frailRegimen.totalDailyDoseUnits, 15);
      assert.equal(frailRegimen.basalComponent.dailyUnits, 8);
      assert.ok(frailRegimen.phenotypeDescription.includes("Conservative / Frail"));
    });

    it("applies higher multiplier (0.65 units/kg/day) for severe insulin resistance / obesity", () => {
      // 100 kg * 0.65 = 65 units TDD
      const resistantRegimen = calculateInpatientInsulinRegimen({
        patientWeightKg: 100,
        phenotype: "obese_resistant",
      });
      assert.equal(resistantRegimen.phenotypeMultiplier, 0.65);
      assert.equal(resistantRegimen.totalDailyDoseUnits, 65);
    });

    it("provides NPO instructions: HOLD nutritional prandial doses and MAINTAIN basal", () => {
      const regimen = calculateInpatientInsulinRegimen({
        patientWeightKg: 70,
        isNpo: true,
      });
      assert.ok(regimen.prandialComponent.npoInstructions.includes("HOLD all nutritional prandial doses"));
      assert.ok(regimen.prandialComponent.npoInstructions.includes("CONTINUE basal insulin"));
    });

    it("generates progressive stepped correction scale based on ISF", () => {
      const regimen = calculateInpatientInsulinRegimen({
        patientWeightKg: 70,
      });
      const table = regimen.correctionScale.steppedDosingTable;
      assert.equal(table.length, 6);
      assert.equal(table[0].additionalUnits, 0); // <140
      assert.ok(table[table.length - 1].additionalUnits >= 4); // >=300
    });
  });

  // ==========================================================================
  // 7. DESK TRAY DETECTION
  // ==========================================================================
  describe("Desk Tray Detection (glycemicOnDesk)", () => {
    it("detects rapid, regular, and basal insulins correctly", () => {
      const rapid = glycemicOnDesk(["insulin-lispro", "metformin"]);
      assert.equal(rapid.hasRapidInsulin, true);
      assert.equal(rapid.hasInsulin, true);

      const regular = glycemicOnDesk(["insulin-regular"]);
      assert.equal(regular.hasRegularInsulin, true);
      assert.equal(regular.hasInsulin, true);

      const basal = glycemicOnDesk(["insulin-glargine"]);
      assert.equal(basal.hasBasalInsulin, true);
      assert.equal(basal.hasInsulin, true);
    });

    it("detects sulfonylureas, meglitinides, and octreotide", () => {
      const su = glycemicOnDesk(["glipizide", "glyburide"]);
      assert.equal(su.hasSulfonylurea, true);
      assert.equal(su.hasSecretagogue, true);

      const meglitinide = glycemicOnDesk(["repaglinide"]);
      assert.equal(meglitinide.hasMeglitinide, true);
      assert.equal(meglitinide.hasSecretagogue, true);

      const antidote = glycemicOnDesk(["octreotide"]);
      assert.equal(antidote.hasOctreotide, true);
    });

    it("detects SGLT2 inhibitors and Metformin", () => {
      const sglt2 = glycemicOnDesk(["empagliflozin"]);
      assert.equal(sglt2.hasSglt2, true);

      const met = glycemicOnDesk(["metformin"]);
      assert.equal(met.hasMetformin, true);
    });

    it("returns clean summary string and empty matched list when no glycemic agents on desk", () => {
      const none = glycemicOnDesk(["atorvastatin", "lisinopril"]);
      assert.equal(none.hasGlycemicAgent, false);
      assert.equal(none.matchedDrugIds.length, 0);
      assert.equal(none.summary, "No glycemic agents detected");
    });
  });

  // ==========================================================================
  // 8. COMPREHENSIVE REPORT GENERATOR
  // ==========================================================================
  describe("Comprehensive Report Generator (glycemicReportOnDesk)", () => {
    it("generates end-to-end report with critical potassium gate alert when K+ < 3.3", () => {
      const report = glycemicReportOnDesk(["insulin-regular"], DEFAULT_HOST, {
        patientWeightKg: 75,
        serumPotassium: 3.1,
        bloodGlucose: 420,
      });

      assert.equal(report.potassiumGate.status, "critical-hold-insulin");
      assert.equal(report.insulinProtocol.isInsulinPermittedByKGate, false);
      assert.ok(report.safetyAlerts.some((a) => a.includes("HOLD ALL INSULIN")));
    });

    it("generates SGLT2 Euglycemic DKA alert when SGLT2 inhibitor is present", () => {
      const report = glycemicReportOnDesk(["empagliflozin", "metformin"], DEFAULT_HOST);
      assert.ok(report.safetyAlerts.some((a) => a.includes("EUGLYCEMIC DKA HAZARD")));
    });

    it("generates Paradoxical Dextrose Trap alert when sulfonylurea is present", () => {
      const report = glycemicReportOnDesk(["glimepiride"], DEFAULT_HOST, {
        isSulfonylureaOverdose: true,
      });
      assert.ok(report.safetyAlerts.some((a) => a.includes("PARADOXICAL DEXTROSE TRAP")));
    });

    it("generates Cerebral Edema warning alert when glucose drops below milestone threshold", () => {
      const report = glycemicReportOnDesk(["insulin-regular"], DEFAULT_HOST, {
        bloodGlucose: 180,
        condition: "DKA",
      });
      assert.ok(report.safetyAlerts.some((a) => a.includes("CEREBRAL EDEMA WARNING")));
    });

    it("integrates clinical pearls, citations, and disclaimer", () => {
      const report = glycemicReportOnDesk(["insulin-glargine", "insulin-lispro"], DEFAULT_HOST);
      assert.ok(report.clinicalPearls.length >= 5);
      assert.ok(report.citations.length >= 8);
      assert.ok(report.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
    });
  });
});
