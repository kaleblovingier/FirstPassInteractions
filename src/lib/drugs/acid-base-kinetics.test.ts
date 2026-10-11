import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ACID_BASE_CDS_DISCLAIMER,
  ACID_BASE_CITATIONS,
  calculateAnionGap,
  evaluateWintersFormula,
  calculateDeltaDelta,
  evaluateHyponatremia,
  calculateAdrogueMadias,
  INFUSATE_PROFILES,
  HYPERTONIC_SALINE_RESCUE_PROTOCOL,
  DDAVP_CLAMP_PROTOCOL,
  RELOWERING_PROTOCOL,
  WINTERS_INTERPRETATION_GUIDE,
  DELTA_DELTA_INTERPRETATION_GUIDE,
  acidBaseOnDesk,
  acidBaseReportOnDesk,
} from "./acid-base-kinetics";
import { DEFAULT_HOST } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

describe("Acid-Base Disorders, Respiratory Compensation & Hyponatremia / ODS Engine", () => {
  // ==========================================================================
  // 1. STATUTORY CDS COMPLIANCE & NON-PRESCRIPTIVE POSTURE (FD&C Act § 520(o)(1)(E))
  // ==========================================================================
  describe("Regulatory Posture & Non-Device CDS Conformance", () => {
    it("exports statutory disclaimer explicitly referencing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(ACID_BASE_CDS_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(ACID_BASE_CDS_DISCLAIMER.includes("Non-Device Clinical Decision Support"));
      assert.ok(ACID_BASE_CDS_DISCLAIMER.includes("licensed healthcare professionals"));
      assert.ok(ACID_BASE_CDS_DISCLAIMER.includes("independent verification"));
      assert.ok(ACID_BASE_CDS_DISCLAIMER.includes("Prescribing Information"));
    });

    it("verifies disclaimer emphasizes non-prescriptive, educational decision support", () => {
      assert.ok(ACID_BASE_CDS_DISCLAIMER.includes("does not provide automated diagnostic conclusions"));
      assert.ok(ACID_BASE_CDS_DISCLAIMER.includes("does not generate infusion orders"));
      assert.ok(ACID_BASE_CDS_DISCLAIMER.includes("prescription directives"));
    });

    it("contains authoritative peer-reviewed nephrology and critical care citations", () => {
      assert.ok(ACID_BASE_CITATIONS.length >= 8);
      assert.ok(ACID_BASE_CITATIONS.some((c) => c.includes("Winter SD")));
      assert.ok(ACID_BASE_CITATIONS.some((c) => c.includes("Figge J")));
      assert.ok(ACID_BASE_CITATIONS.some((c) => c.includes("Adrogué HJ")));
      assert.ok(ACID_BASE_CITATIONS.some((c) => c.includes("Sterns RH")));
      assert.ok(ACID_BASE_CITATIONS.some((c) => c.includes("Verbalis JG")));
    });

    it("report generator embeds statutory disclaimer with regulatory footers", () => {
      const report = acidBaseReportOnDesk(["furosemide"], DEFAULT_HOST);
      assert.ok(report.disclaimer.includes(ACID_BASE_CDS_DISCLAIMER));
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });

    it("maintains non-prescriptive posture across all clinical guidelines and protocols", () => {
      const jsonStr = JSON.stringify({
        protocols: {
          hypertonicRescue: HYPERTONIC_SALINE_RESCUE_PROTOCOL,
          ddavpClamp: DDAVP_CLAMP_PROTOCOL,
          relowering: RELOWERING_PROTOCOL,
        },
        guides: {
          winters: WINTERS_INTERPRETATION_GUIDE,
          deltaDelta: DELTA_DELTA_INTERPRETATION_GUIDE,
        },
      });

      assert.doesNotMatch(jsonStr, /prescribe\s+\d+\s*mg/i);
      assert.doesNotMatch(jsonStr, /order\s+\d+\s*mg/i);
    });
  });

  // ==========================================================================
  // 2. PILLAR 1: SERUM ANION GAP & ALBUMIN CORRECTION (FIGGE FORMULA)
  // ==========================================================================
  describe("Anion Gap & Figge Albumin Correction", () => {
    it("calculates normal anion gap with normal albumin correctly", () => {
      const res = calculateAnionGap({
        sodiumMeqL: 140,
        chlorideMeqL: 104,
        bicarbonateMeqL: 24,
        albuminGdl: 4.0,
      });

      // Observed AG = 140 - (104 + 24) = 12
      assert.equal(res.observedAnionGap, 12);
      assert.equal(res.correctedAnionGap, 12);
      assert.equal(res.albuminAdjustmentMeqL, 0);
      assert.equal(res.category, "normal");
      assert.equal(res.occultHagmaUnmasked, false);
      assert.equal(res.isHypoalbuminemic, false);
    });

    it("unmasks occult high anion gap acidosis in severe hypoalbuminemia", () => {
      // ICU septic patient: Na 138, Cl 106, HCO3 20 -> Observed AG = 138 - 126 = 12 (falsely normal!)
      // Albumin 2.0 g/dL -> Delta = 4.0 - 2.0 = 2.0 -> Adjustment = 2.5 * 2.0 = +5.0 mEq/L
      // Corrected AG = 12 + 5 = 17.0 mEq/L (Severe HAGMA!)
      const res = calculateAnionGap({
        sodiumMeqL: 138,
        chlorideMeqL: 106,
        bicarbonateMeqL: 20,
        albuminGdl: 2.0,
      });

      assert.equal(res.observedAnionGap, 12);
      assert.equal(res.correctedAnionGap, 17);
      assert.equal(res.albuminAdjustmentMeqL, 5);
      assert.equal(res.category, "elevated");
      assert.equal(res.occultHagmaUnmasked, true);
      assert.equal(res.isHypoalbuminemic, true);
      assert.ok(res.clinicalSignificance.includes("OCCULT HIGH ANION GAP UNMASKED"));
    });

    it("handles extreme hypoalbuminemia across tiers (3.0, 2.0, 1.0 g/dL)", () => {
      const tier1 = calculateAnionGap({ sodiumMeqL: 140, chlorideMeqL: 105, bicarbonateMeqL: 24, albuminGdl: 3.0 });
      // Observed AG = 140 - 129 = 11. Adj = 2.5 * 1.0 = 2.5. Corrected = 13.5
      assert.equal(tier1.observedAnionGap, 11);
      assert.equal(tier1.albuminAdjustmentMeqL, 2.5);
      assert.equal(tier1.correctedAnionGap, 13.5);
      assert.equal(tier1.category, "elevated");

      const tier2 = calculateAnionGap({ sodiumMeqL: 140, chlorideMeqL: 105, bicarbonateMeqL: 24, albuminGdl: 1.0 });
      // Observed AG = 11. Adj = 2.5 * 3.0 = 7.5. Corrected = 18.5
      assert.equal(tier2.observedAnionGap, 11);
      assert.equal(tier2.albuminAdjustmentMeqL, 7.5);
      assert.equal(tier2.correctedAnionGap, 18.5);
      assert.equal(tier2.occultHagmaUnmasked, true);
    });

    it("identifies low anion gap with myeloma / unmeasured cation differential", () => {
      const lowRes = calculateAnionGap({
        sodiumMeqL: 132,
        chlorideMeqL: 108,
        bicarbonateMeqL: 21,
        albuminGdl: 4.0,
      });
      // Observed AG = 132 - 129 = 3
      assert.equal(lowRes.observedAnionGap, 3);
      assert.equal(lowRes.correctedAnionGap, 3);
      assert.equal(lowRes.category, "low");
      assert.ok(lowRes.etiologies.some((e) => e.includes("Multiple myeloma")));
    });

    it("handles missing albumin by using observed anion gap without error", () => {
      const res = calculateAnionGap({
        sodiumMeqL: 145,
        chlorideMeqL: 100,
        bicarbonateMeqL: 15,
      });
      // Observed AG = 145 - 115 = 30
      assert.equal(res.observedAnionGap, 30);
      assert.equal(res.correctedAnionGap, 30);
      assert.equal(res.category, "elevated");
      assert.equal(res.albuminGdl, undefined);
    });
  });

  // ==========================================================================
  // 3. PILLAR 2: WINTER'S FORMULA SECONDARY RESPIRATORY COMPENSATION
  // ==========================================================================
  describe("Winter's Formula Secondary Respiratory Compensation", () => {
    it("identifies pure secondary respiratory compensation in metabolic acidosis", () => {
      // HCO3 = 12 mEq/L
      // Expected PaCO2 = 1.5 * 12 + 8 = 26 mmHg (+/- 2, range: 24 to 28 mmHg)
      // Measured PaCO2 = 26 mmHg -> Adequate compensation
      const res = evaluateWintersFormula({
        bicarbonateMeqL: 12,
        measuredPaco2MmHg: 26,
      });

      assert.equal(res.expectedPaco2, 26);
      assert.equal(res.expectedPaco2Min, 24);
      assert.equal(res.expectedPaco2Max, 28);
      assert.equal(res.status, "adequate-compensation");
      assert.ok(res.statusLabel.includes("Pure Secondary Respiratory Compensation"));
    });

    it("detects concomitant respiratory acidosis (hypoventilation / fatigue)", () => {
      // HCO3 = 12 mEq/L, Expected range 24-28 mmHg
      // Measured PaCO2 = 36 mmHg (> 28) -> Relative hypoventilation!
      const res = evaluateWintersFormula({
        bicarbonateMeqL: 12,
        measuredPaco2MmHg: 36,
      });

      assert.equal(res.status, "concomitant-respiratory-acidosis");
      assert.ok(res.statusLabel.includes("Concomitant Respiratory Acidosis"));
      assert.ok(res.differentialDiagnosis.some((d) => d.includes("Respiratory muscle exhaustion")));
      assert.ok(res.differentialDiagnosis.some((d) => d.includes("Central nervous system depression")));
    });

    it("detects concomitant respiratory alkalosis (hyperventilation / sepsis / salicylate)", () => {
      // HCO3 = 12 mEq/L, Expected range 24-28 mmHg
      // Measured PaCO2 = 18 mmHg (< 24) -> Excessive hyperventilation!
      const res = evaluateWintersFormula({
        bicarbonateMeqL: 12,
        measuredPaco2MmHg: 18,
      });

      assert.equal(res.status, "concomitant-respiratory-alkalosis");
      assert.ok(res.statusLabel.includes("Concomitant Respiratory Alkalosis"));
      assert.ok(res.differentialDiagnosis.some((d) => d.includes("sepsis")));
      assert.ok(res.differentialDiagnosis.some((d) => d.includes("salicylate")));
    });

    it("handles non-acidosis cases gracefully (HCO3 >= 24)", () => {
      const res = evaluateWintersFormula({
        bicarbonateMeqL: 26,
        measuredPaco2MmHg: 42,
      });

      assert.equal(res.status, "not-metabolic-acidosis");
      assert.ok(res.statusLabel.includes("Metabolic Acidosis Not Present"));
    });
  });

  // ==========================================================================
  // 4. PILLAR 3: DELTA-DELTA (DELTA GAP / DELTA BICARBONATE) ANALYSIS
  // ==========================================================================
  describe("Delta-Delta Analysis & Mixed Disorders", () => {
    it("identifies mixed HAGMA + NAGMA (Ratio < 0.8)", () => {
      // Corrected AG = 18 mEq/L (Delta AG = 18 - 12 = 6)
      // HCO3 = 14 mEq/L (Delta HCO3 = 24 - 14 = 10)
      // Ratio = 6 / 10 = 0.6 (< 0.8)
      const res = calculateDeltaDelta({
        correctedAnionGap: 18,
        bicarbonateMeqL: 14,
      });

      assert.equal(res.deltaAnionGap, 6);
      assert.equal(res.deltaBicarbonate, 10);
      assert.equal(res.deltaRatio, 0.6);
      assert.equal(res.predictedBaselineBicarbonate, 20); // 14 + 6 = 20 < 24
      assert.equal(res.category, "mixed-hagma-nagma");
      assert.ok(res.etiologies.some((e) => e.includes("0.9% Normal Saline")));
      assert.ok(res.clinicalSignificance.includes("Switch crystalloid from 0.9% Normal Saline"));
    });

    it("identifies pure High Anion Gap Metabolic Acidosis (Ratio 1.0 to 2.0)", () => {
      // Corrected AG = 24 mEq/L (Delta AG = 24 - 12 = 12)
      // HCO3 = 14 mEq/L (Delta HCO3 = 24 - 14 = 10)
      // Ratio = 12 / 10 = 1.2
      const res = calculateDeltaDelta({
        correctedAnionGap: 24,
        bicarbonateMeqL: 14,
      });

      assert.equal(res.deltaAnionGap, 12);
      assert.equal(res.deltaBicarbonate, 10);
      assert.equal(res.deltaRatio, 1.2);
      assert.equal(res.predictedBaselineBicarbonate, 26);
      assert.equal(res.category, "pure-hagma");
      assert.ok(res.etiologies.some((e) => e.includes("Diabetic Ketoacidosis")));
    });

    it("identifies mixed HAGMA + concurrent Metabolic Alkalosis (Ratio > 2.0)", () => {
      // Corrected AG = 26 mEq/L (Delta AG = 26 - 12 = 14)
      // HCO3 = 20 mEq/L (Delta HCO3 = 24 - 20 = 4)
      // Ratio = 14 / 4 = 3.5 (> 2.0)
      const res = calculateDeltaDelta({
        correctedAnionGap: 26,
        bicarbonateMeqL: 20,
      });

      assert.equal(res.deltaAnionGap, 14);
      assert.equal(res.deltaBicarbonate, 4);
      assert.equal(res.deltaRatio, 3.5);
      assert.equal(res.predictedBaselineBicarbonate, 34); // 20 + 14 = 34 >> 24!
      assert.equal(res.category, "mixed-hagma-metabolic-alkalosis");
      assert.ok(res.etiologies.some((e) => e.includes("vomiting")));
      assert.ok(res.etiologies.some((e) => e.includes("diuretic")));
    });

    it("identifies mixed HAGMA + metabolic alkalosis when HCO3 >= 24 despite high AG", () => {
      // Corrected AG = 22 mEq/L (Delta AG = 10)
      // HCO3 = 26 mEq/L (Delta HCO3 = -2 <= 0)
      const res = calculateDeltaDelta({
        correctedAnionGap: 22,
        bicarbonateMeqL: 26,
      });

      assert.equal(res.deltaAnionGap, 10);
      assert.equal(res.category, "mixed-hagma-metabolic-alkalosis");
      assert.equal(res.deltaRatio, null);
      assert.equal(res.predictedBaselineBicarbonate, 36);
    });

    it("identifies pure NAGMA when AG is normal but bicarbonate is low", () => {
      // Corrected AG = 11 mEq/L (Delta AG <= 0)
      // HCO3 = 16 mEq/L (Delta HCO3 = 8)
      const res = calculateDeltaDelta({
        correctedAnionGap: 11,
        bicarbonateMeqL: 16,
      });

      assert.equal(res.category, "pure-nagma");
      assert.equal(res.deltaRatio, null);
      assert.ok(res.etiologies.some((e) => e.includes("Renal Tubular Acidosis")));
      assert.ok(res.etiologies.some((e) => e.includes("diarrhea")));
    });
  });

  // ==========================================================================
  // 5. PILLAR 4: HYPONATREMIA & OSMOTIC DEMYELINATION SYNDROME (ODS)
  // ==========================================================================
  describe("Hyponatremia Triage & ODS Risk Safeguards", () => {
    it("differentiates hypovolemic, euvolemic, and hypervolemic hyponatremia based on urine labs", () => {
      // Hypovolemic extrarenal loss (UNa < 20)
      const hypoExtra = evaluateHyponatremia({
        serumSodiumMeqL: 124,
        volumeStatus: "hypovolemic",
        urineSodiumMeqL: 10,
        urineOsmolalityMosmKg: 450,
      });
      assert.equal(hypoExtra.hyponatremiaSeverity, "moderate");
      assert.ok(hypoExtra.etiologyCategory.includes("Hypovolemic"));
      assert.ok(hypoExtra.etiologyDetails.includes("Extrarenal sodium losses"));

      // Euvolemic SIADH (UNa > 30, UOsm > 300)
      const euSiadh = evaluateHyponatremia({
        serumSodiumMeqL: 120,
        volumeStatus: "euvolemic",
        urineSodiumMeqL: 45,
        urineOsmolalityMosmKg: 500,
      });
      assert.ok(euSiadh.etiologyCategory.includes("Euvolemic"));
      assert.ok(euSiadh.etiologyDetails.includes("SIADH"));

      // Hypervolemic CHF (UNa < 20)
      const hyperChf = evaluateHyponatremia({
        serumSodiumMeqL: 128,
        volumeStatus: "hypervolemic",
        urineSodiumMeqL: 12,
      });
      assert.ok(hyperChf.etiologyCategory.includes("Hypervolemic"));
      assert.ok(hyperChf.etiologyDetails.includes("Heart Failure"));
    });

    it("applies strict <= 6 mEq/24h ceiling for high-risk ODS patients vs <= 8 standard", () => {
      // High-risk patient: chronic duration + malnutrition + baseline Na < 105
      const highRisk = evaluateHyponatremia({
        serumSodiumMeqL: 102,
        durationHours: 72,
        isMalnourished: true,
        hasChronicAlcoholism: true,
      });

      assert.equal(highRisk.isHighRiskForOds, true);
      assert.equal(highRisk.safeCorrectionCeiling24h, 6);
      assert.ok(highRisk.highRiskFactors.length >= 3);

      // Low-risk / standard patient
      const standard = evaluateHyponatremia({
        serumSodiumMeqL: 128,
        durationHours: 12,
        isMalnourished: false,
        hasAdvancedLiverDisease: false,
        hasChronicAlcoholism: false,
      });

      assert.equal(standard.isHighRiskForOds, false);
      assert.equal(standard.safeCorrectionCeiling24h, 8);
    });
  });

  // ==========================================================================
  // 6. ADROGUÉ-MADIAS KINETICS & INFUSATE DELTA NA PREDICTIONS
  // ==========================================================================
  describe("Adrogué-Madias Formula & Infusates", () => {
    it("calculates Delta Na per 1 L across 3% saline, 0.9% saline, and D5W infusates accurately", () => {
      // 70 kg adult male: TBW = 70 * 0.6 = 42 L. TBW + 1 = 43 L.
      // Serum Na = 115 mEq/L.
      const male70kg = {
        serumSodiumMeqL: 115,
        weightKg: 70,
        sex: "male" as const,
        isGeriatric: false,
      };

      // 3% Saline: (513 - 115) / 43 = 398 / 43 = 9.2558... -> 9.26 mEq/L
      const res3pct = calculateAdrogueMadias({ ...male70kg, infusateType: "3-percent-saline" });
      assert.equal(res3pct.totalBodyWaterLiters, 42);
      assert.equal(res3pct.deltaNaPerLiter, 9.26);

      // 0.9% Normal Saline: (154 - 115) / 43 = 39 / 43 = 0.9069... -> 0.91 mEq/L
      const res09pct = calculateAdrogueMadias({ ...male70kg, infusateType: "0.9-percent-saline" });
      assert.equal(res09pct.deltaNaPerLiter, 0.91);

      // D5W: (0 - 115) / 43 = -115 / 43 = -2.6744... -> -2.67 mEq/L
      const resD5w = calculateAdrogueMadias({ ...male70kg, infusateType: "d5w" });
      assert.equal(resD5w.deltaNaPerLiter, -2.67);
    });

    it("adjusts Total Body Water for sex and geriatric age", () => {
      // Non-geriatric female 60 kg: TBW factor 0.5 -> 30 L
      const femaleAdult = calculateAdrogueMadias({
        serumSodiumMeqL: 120,
        weightKg: 60,
        sex: "female",
        isGeriatric: false,
        infusateType: "3-percent-saline",
      });
      assert.equal(femaleAdult.tbwFactor, 0.5);
      assert.equal(femaleAdult.totalBodyWaterLiters, 30);

      // Geriatric female 60 kg: TBW factor 0.45 -> 27 L
      const femaleGeri = calculateAdrogueMadias({
        serumSodiumMeqL: 120,
        weightKg: 60,
        sex: "female",
        isGeriatric: true,
        infusateType: "3-percent-saline",
      });
      assert.equal(femaleGeri.tbwFactor, 0.45);
      assert.equal(femaleGeri.totalBodyWaterLiters, 27);

      // Geriatric male 70 kg: TBW factor 0.5 -> 35 L
      const maleGeri = calculateAdrogueMadias({
        serumSodiumMeqL: 120,
        weightKg: 70,
        sex: "male",
        isGeriatric: true,
        infusateType: "3-percent-saline",
      });
      assert.equal(maleGeri.tbwFactor, 0.5);
      assert.equal(maleGeri.totalBodyWaterLiters, 35);
    });

    it("triggers critical ODS alert when projected volume exceeds 24-hour ceiling", () => {
      // Infusing 1000 mL of 3% saline in a 70 kg male with baseline Na 115 gives +9.3 mEq/L (> 8 mEq/L ceiling!)
      const res = calculateAdrogueMadias({
        serumSodiumMeqL: 115,
        weightKg: 70,
        sex: "male",
        infusateType: "3-percent-saline",
        infusionVolumeMl: 1000,
      });

      assert.equal(res.exceedsSafe24hCeiling, true);
      assert.ok(res.odsWarning?.includes("CRITICAL ODS ALERT"));
      assert.ok(res.odsWarning?.includes("exceeds the safe 24-hour ceiling"));
    });

    it("calculates hourly infusion rate for target 24h elevation correctly", () => {
      // Target delta 6 mEq/L with 3% saline (deltaNaPerLiter = 9.26)
      // Volume = 6 / 9.26 = 0.6479 L = 648 mL
      // Hourly rate = 648 / 24 = 27 mL/h
      const res = calculateAdrogueMadias({
        serumSodiumMeqL: 115,
        weightKg: 70,
        sex: "male",
        infusateType: "3-percent-saline",
        targetDeltaNa24h: 6,
      });

      assert.ok(res.volumeNeededForTargetMl! >= 640 && res.volumeNeededForTargetMl! <= 660);
      assert.ok(res.hourlyRateFor24hTargetMlH! >= 26 && res.hourlyRateFor24hTargetMlH! <= 28);
    });
  });

  // ==========================================================================
  // 7. DESK TRAY DETECTION & REPORT INTEGRATION
  // ==========================================================================
  describe("Desk Tray Detection & End-to-End Report Generation", () => {
    it("detects carbonic anhydrase inhibitors, loop, thiazide, SGLT2, and vaptans on desk", () => {
      const desk = acidBaseOnDesk([
        "acetazolamide",
        "furosemide",
        "hctz",
        "empagliflozin",
        "tolvaptan",
        "spironolactone",
        "desmopressin",
        "aspirin",
        "metformin",
      ]);

      assert.equal(desk.hasCarbonicAnhydraseInhibitor, true);
      assert.equal(desk.hasLoopDiuretic, true);
      assert.equal(desk.hasThiazideDiuretic, true);
      assert.equal(desk.hasSglt2Inhibitor, true);
      assert.equal(desk.hasVaptan, true);
      assert.equal(desk.hasPotassiumSparingOrMra, true);
      assert.equal(desk.hasDesmopressinOrDdavp, true);
      assert.equal(desk.hasSalicylate, true);
      assert.equal(desk.hasMetformin, true);
      assert.ok(desk.matchedDrugIds.length >= 8);
      assert.ok(desk.riskSummaries.length >= 8);
    });

    it("generates comprehensive acid-base report with integrated alerts and protocols", () => {
      const report = acidBaseReportOnDesk(
        ["tolvaptan", "hctz", "acetazolamide"],
        DEFAULT_HOST,
        {
          chemistry: {
            sodiumMeqL: 118,
            potassiumMeqL: 3.2,
            chlorideMeqL: 85,
            bicarbonateMeqL: 15,
            albuminGdl: 2.5,
          },
          abg: {
            measuredPh: 7.28,
            measuredPaco2MmHg: 22,
          },
          hyponatremiaTriage: {
            volumeStatus: "euvolemic",
            urineSodiumMeqL: 50,
            urineOsmolalityMosmKg: 400,
            durationHours: 72,
          },
          patientBiometrics: {
            weightKg: 65,
            sex: "female",
            targetDeltaNa24h: 6,
            selectedInfusate: "3-percent-saline",
          },
        },
      );

      // Verify report integrity
      assert.ok(report.onDesk.hasVaptan);
      assert.ok(report.onDesk.hasThiazideDiuretic);
      assert.ok(report.onDesk.hasCarbonicAnhydraseInhibitor);

      // Anion Gap: Observed = 118 - (85 + 15) = 18.
      // Albumin 2.5 -> Delta = 1.5 -> Adj = 2.5 * 1.5 = 3.75 -> Corrected AG = 21.8 mEq/L
      assert.equal(report.anionGapEvaluation.observedAnionGap, 18);
      assert.equal(report.anionGapEvaluation.correctedAnionGap, 21.8);
      assert.equal(report.anionGapEvaluation.category, "elevated");

      // Winter's: HCO3 = 15. Expected PaCO2 = 1.5 * 15 + 8 = 30.5 (range: 28.5 to 32.5).
      // Measured PaCO2 = 22 (< 28.5) -> Concomitant Respiratory Alkalosis!
      assert.equal(report.wintersEvaluation.status, "concomitant-respiratory-alkalosis");

      // Delta-Delta: Corrected AG = 21.8 (Delta AG = 9.8). HCO3 = 15 (Delta HCO3 = 9).
      // Ratio = 9.8 / 9 = 1.09 -> Pure HAGMA
      assert.equal(report.deltaDeltaEvaluation.category, "pure-hagma");

      // Hyponatremia: Na = 118 -> Severe, Chronic -> High risk ODS, ceiling 6
      assert.equal(report.hyponatremiaEvaluation.hyponatremiaSeverity, "severe");
      assert.equal(report.hyponatremiaEvaluation.isHighRiskForOds, true);
      assert.equal(report.hyponatremiaEvaluation.safeCorrectionCeiling24h, 6);

      // Alerts
      assert.ok(report.alerts.length >= 3);
      assert.ok(report.alerts.some((a) => a.category === "ODS"));
      assert.ok(report.alerts.some((a) => a.category === "Winters"));
      assert.ok(report.alerts.some((a) => a.category === "DrugCollision"));

      // Protocols present
      assert.ok(report.protocols.hypertonicSalineRescue.title.includes("3% Hypertonic Saline"));
      assert.ok(report.protocols.ddavpClamp.title.includes("Desmopressin (DDAVP) Clamp"));
      assert.ok(report.protocols.relowering.title.includes("Emergency Re-lowering"));

      // Regulatory disclaimer
      assert.ok(report.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
    });
  });
});
