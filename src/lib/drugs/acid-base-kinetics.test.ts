import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  ACID_BASE_CDS_DISCLAIMER,
  ACID_BASE_CITATIONS,
  calculateAnionGap,
  evaluateWintersFormula,
  calculateDeltaDelta,
  evaluateHyponatremia,
  calculateAdrogueMadias,
  calculateOsmolalGap,
  calculateHyperglycemiaCorrectedSodium,
  calculateHendersonHasselbalchIonization,
  calculateBloodGasHendersonHasselbalch,
  URINARY_ION_TRAPPING_PROFILES,
  getUrinaryIonTrappingProfile,
  evaluateUrinaryIonTrapping,
  GASTRIC_ACID_SUPPRESSANT_PROFILES,
  GASTRIC_PH_DRUG_PROFILES,
  evaluateGastricPhSolubilityShift,
  detectGastricPhCollisions,
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

  // ==========================================================================
  // 8. EDGE-CASE GUARDS & INFUSATE PROFILES
  // ==========================================================================
  describe("Edge-Case Guards, Osmolal Gap & Hyperglycemia Sodium Correction", () => {
    it("validates INFUSATE_PROFILES sodium and osmolarity constants", () => {
      assert.equal(INFUSATE_PROFILES["3-percent-saline"].sodiumMeqL, 513);
      assert.equal(INFUSATE_PROFILES["0.9-percent-saline"].sodiumMeqL, 154);
      assert.equal(INFUSATE_PROFILES["lactated-ringers"].potassiumMeqL, 4);
      assert.equal(INFUSATE_PROFILES.d5w.sodiumMeqL, 0);
    });

    it("guards Anion Gap, Winter's, Delta-Delta, Hyponatremia, and Adrogué-Madias against NaN, zero, and negative inputs", () => {
      const agNaN = calculateAnionGap({
        sodiumMeqL: Number.NaN,
        chlorideMeqL: 104,
        bicarbonateMeqL: 24,
        albuminGdl: -1.5,
      });
      assert.ok(Number.isFinite(agNaN.observedAnionGap));
      assert.ok(Number.isFinite(agNaN.correctedAnionGap));
      assert.equal(agNaN.albuminGdl, 0);
      assert.ok(agNaN.inputGuardWarning);

      const agZeroAlb = calculateAnionGap({
        sodiumMeqL: 140,
        chlorideMeqL: 104,
        bicarbonateMeqL: 24,
        albuminGdl: 0,
        potassiumMeqL: 4.5,
      });
      assert.equal(agZeroAlb.correctedAnionGap, 22);
      assert.equal(agZeroAlb.potassiumIncludedAnionGap, 16.5);

      const wintersZero = evaluateWintersFormula({
        bicarbonateMeqL: 0,
        measuredPaco2MmHg: Number.NaN,
      });
      assert.ok(Number.isFinite(wintersZero.expectedPaco2));
      assert.ok(wintersZero.inputGuardWarning);

      const deltaNaN = calculateDeltaDelta({
        correctedAnionGap: Number.NaN,
        bicarbonateMeqL: 24,
      });
      assert.ok(Number.isFinite(deltaNaN.deltaAnionGap));
      assert.equal(deltaNaN.deltaRatio, null);

      const adrogueZero = calculateAdrogueMadias({
        serumSodiumMeqL: 118,
        weightKg: 0,
        sex: "female",
        infusateType: "3-percent-saline",
        infusionVolumeMl: -100,
      });
      assert.ok(Number.isFinite(adrogueZero.deltaNaPerLiter));
      assert.ok(adrogueZero.totalBodyWaterLiters > 0);
      assert.equal(adrogueZero.predictedDeltaNaForVolume, 0);
      assert.ok(adrogueZero.inputGuardWarning);
    });

    it("differentiates hypotonic, isotonic pseudohyponatremia, and hypertonic translocational hyponatremia", () => {
      const iso = evaluateHyponatremia({
        serumSodiumMeqL: 126,
        serumOsmolalityMosmKg: 286,
      });
      assert.equal(iso.tonicityClassification, "isotonic-pseudohyponatremia");
      assert.ok(iso.etiologyCategory.includes("Pseudohyponatremia"));

      const hyper = evaluateHyponatremia({
        serumSodiumMeqL: 128,
        serumOsmolalityMosmKg: 315,
      });
      assert.equal(hyper.tonicityClassification, "hypertonic-translocational");
      assert.ok(hyper.etiologyDetails.includes("PMID 4763428"));
    });

    it("computes serum osmolal gap and guards invalid inputs cleanly", () => {
      const elevated = calculateOsmolalGap({
        measuredOsmolalityMosmKg: 340,
        sodiumMeqL: 140,
        glucoseMgDl: 90,
        bunMgDl: 14,
        ethanolMgDl: 46,
      });
      assert.ok(elevated);
      // 2*140 + 90/18 + 14/2.8 + 46/4.6 = 280 + 5 + 5 + 10 = 300; Gap = 40
      assert.equal(elevated.calculatedOsmolalityMosmKg, 300);
      assert.equal(elevated.osmolalGapMosmKg, 40);
      assert.equal(elevated.category, "elevated");

      assert.equal(
        calculateOsmolalGap({
          measuredOsmolalityMosmKg: 290,
          sodiumMeqL: 0,
          glucoseMgDl: 90,
          bunMgDl: 14,
        }),
        null,
      );
      assert.equal(
        calculateOsmolalGap({
          measuredOsmolalityMosmKg: Number.NaN,
          sodiumMeqL: 140,
          glucoseMgDl: 90,
          bunMgDl: 14,
        }),
        null,
      );
    });

    it("computes Katz and Hillier hyperglycemia-corrected sodium", () => {
      const moderate = calculateHyperglycemiaCorrectedSodium(130, 300);
      assert.ok(moderate);
      assert.equal(moderate.katzCorrectedSodiumMeqL, 133.2);
      assert.equal(moderate.recommendedCorrectedSodiumMeqL, 133.2);

      const severe = calculateHyperglycemiaCorrectedSodium(124, 700);
      assert.ok(severe);
      // 6 steps of 100 mg/dL above 100: Hillier 2.4 * 6 = +14.4 -> 138.4
      assert.equal(severe.hillierCorrectedSodiumMeqL, 138.4);
      assert.equal(severe.recommendedCorrectedSodiumMeqL, 138.4);

      assert.equal(calculateHyperglycemiaCorrectedSodium(135, -10), null);
    });
  });

  // ==========================================================================
  // 9. HENDERSON-HASSELBALCH, URINARY ION TRAPPING & GASTRIC pH KINETICS
  // ==========================================================================
  describe("Henderson-Hasselbalch Ionization, Urinary Trapping & Gastric pH Absorption", () => {
    it("computes exact Henderson-Hasselbalch weak-acid and weak-base ionized fractions and blood gas consistency", () => {
      // Weak acid: pKa 7.3 at pH 7.3 => 50% ionized, 50% unionized
      const acidHalf = calculateHendersonHasselbalchIonization({
        pKa: 7.3,
        pH: 7.3,
        drugClass: "weak-acid",
      });
      assert.ok(acidHalf);
      assert.equal(acidHalf.ionizedFraction, 0.5);
      assert.equal(acidHalf.unionizedFraction, 0.5);

      // Weak base: pKa 9.9 at pH 7.9 => 1 / (1 + 10^(7.9 - 9.9)) = 1 / 1.01 = 0.9901
      const base99 = calculateHendersonHasselbalchIonization({
        pKa: 9.9,
        pH: 7.9,
        drugClass: "weak-base",
      });
      assert.ok(base99);
      assert.equal(base99.ionizedFraction, 0.9901);
      assert.equal(base99.unionizedFraction, 0.0099);

      // Invalid bounds / NaN return null
      assert.equal(calculateHendersonHasselbalchIonization({ pKa: 5, pH: 15, drugClass: "weak-acid" }), null);
      assert.equal(calculateHendersonHasselbalchIonization({ pKa: Number.NaN, pH: 7.4, drugClass: "weak-base" }), null);

      // Plasma Henderson-Hasselbalch consistency: HCO3 = 24, PaCO2 = 40 -> expected pH = 7.40, [H+] = 40
      const abgOk = calculateBloodGasHendersonHasselbalch({ bicarbonateMeqL: 24, paco2MmHg: 40, measuredPh: 7.4 });
      assert.ok(abgOk);
      assert.equal(abgOk.expectedPh, 7.4);
      assert.equal(abgOk.expectedHydrogenIonNeqL, 40);
      assert.equal(abgOk.isInternallyConsistent, true);

      const abgDiscordant = calculateBloodGasHendersonHasselbalch({ bicarbonateMeqL: 24, paco2MmHg: 40, measuredPh: 7.15 });
      assert.ok(abgDiscordant);
      assert.equal(abgDiscordant.isInternallyConsistent, false);
      assert.equal(calculateBloodGasHendersonHasselbalch({ bicarbonateMeqL: 0, paco2MmHg: 40 }), null);
    });

    it("quantifies weak-acid urinary alkalinization (salicylate, phenobarbital, methotrexate) and salicylate acidemia CNS/BBB trapping", () => {
      // Salicylate: pH 5.5 -> 7.8 decreases unionized permeant salicylic acid ~200x, R_U/P increases markedly
      const sal = evaluateUrinaryIonTrapping({
        drugId: "aspirin",
        baselineUrinePh: 5.5,
        targetUrinePh: 7.8,
        systemicArterialPh: 7.1,
      });
      assert.ok(sal);
      assert.equal(sal.profile.drugClass, "weak-acid");
      assert.ok(sal.baselineIonization.ionizedPercent > 99.6 && sal.baselineIonization.ionizedPercent < 99.8);
      assert.ok(sal.alkalinizedIonization.ionizedPercent > 99.99);
      assert.ok(sal.unionizedFractionFoldChange >= 190 && sal.unionizedFractionFoldChange <= 210);
      assert.ok(sal.alkalinizedIonization.compartmentToReferenceTotalRatio > sal.baselineIonization.compartmentToReferenceTotalRatio);
      assert.ok(sal.csfBbbAcidemiaHazard?.triggered);
      assert.ok(sal.csfBbbAcidemiaHazard!.unionizedIncreaseFoldVs740 >= 1.9);

      // Phenobarbital (pKa 7.3): pH 5.5 (1.56% ionized, 98.44% unionized) -> pH 8.0 (83.37% ionized, 16.63% unionized)
      // That yields a ~5.9x drop in unionized fraction, >50x rise in ionized fraction, and 316x shift in [A-]/[HA]
      const pheno = evaluateUrinaryIonTrapping({
        drugId: "phenobarbital",
        baselineUrinePh: 5.5,
        targetUrinePh: 8.0,
      });
      assert.ok(pheno);
      assert.ok(pheno.baselineIonization.ionizedPercent < 2.0);
      assert.ok(pheno.alkalinizedIonization.ionizedPercent > 82.0);
      assert.ok(pheno.unionizedFractionFoldChange >= 5.5 && pheno.unionizedFractionFoldChange <= 6.2);
      assert.ok(pheno.alkalinizedIonization.ionizedFraction / pheno.baselineIonization.ionizedFraction > 50);

      // Methotrexate (pKa 4.8): pH 5.5 (~83.4% ionized) -> pH 7.8 (~99.9% ionized)
      const mtx = evaluateUrinaryIonTrapping({
        drugId: "methotrexate",
        baselineUrinePh: 5.5,
        targetUrinePh: 7.8,
      });
      assert.ok(mtx);
      assert.ok(mtx.baselineIonization.ionizedPercent > 82 && mtx.baselineIonization.ionizedPercent < 85);
      assert.ok(mtx.alkalinizedIonization.ionizedPercent > 99.8);
      assert.ok(getUrinaryIonTrappingProfile("bismuth-subsalicylate")?.drugId === "aspirin");
    });

    it("quantifies weak-base alkaline-urine clearance impairment (amphetamine, quinidine, flecainide)", () => {
      const amph = evaluateUrinaryIonTrapping({
        drugId: "amphetamine",
        baselineUrinePh: 5.5,
        targetUrinePh: 8.0,
      });
      assert.ok(amph);
      assert.equal(amph.profile.alkalinizationEffect, "impairs-clearance");
      assert.ok(amph.baselineIonization.ionizedPercent > 99.99);
      assert.ok(amph.alkalinizedIonization.unionizedPercent > amph.baselineIonization.unionizedPercent * 100);
      assert.ok(amph.unionizedFractionFoldChange >= 300);

      const quin = evaluateUrinaryIonTrapping({ drugId: "quinidine", baselineUrinePh: 5.5, targetUrinePh: 7.8 });
      assert.ok(quin);
      assert.equal(quin.profile.alkalinizationEffect, "impairs-clearance");
      assert.ok(quin.alkalinizedIonization.unionizedPercent > 15);

      const flec = evaluateUrinaryIonTrapping({ drugId: "flecainide", baselineUrinePh: 5.5, targetUrinePh: 8.0 });
      assert.ok(flec);
      assert.equal(flec.profile.alkalinizationEffect, "impairs-clearance");
      assert.ok(flec.unionizedFractionFoldChange >= 250);
    });

    it("models gastric pH elevation (1.5 -> 5.0+) impairing dissolution of ketoconazole, itraconazole, posaconazole, atazanavir, rilpivirine, and dasatinib", () => {
      for (const victimId of ["ketoconazole", "itraconazole", "posaconazole", "atazanavir", "rilpivirine", "dasatinib"]) {
        const shift = evaluateGastricPhSolubilityShift({
          drugId: victimId,
          baselineGastricPh: 1.5,
          elevatedGastricPh: 5.5,
        });
        assert.ok(shift, `Expected solubility evaluation for ${victimId}`);
        assert.ok(
          shift.relativeSolubilityRatio > 10,
          `Expected >10x solubility collapse for ${victimId}, got ${shift.relativeSolubilityRatio}`,
        );
        assert.ok(shift.solubilityRetentionPercent < 10);
      }

      const ppiCollisions = detectGastricPhCollisions([
        "omeprazole",
        "dasatinib",
        "rilpivirine",
        "ketoconazole",
      ]);
      assert.equal(ppiCollisions.length, 3);
      assert.ok(ppiCollisions.some((c) => c.victim.drugId === "dasatinib"));
      assert.ok(ppiCollisions.some((c) => c.victim.drugId === "rilpivirine"));
      assert.ok(ppiCollisions.some((c) => c.victim.drugId === "ketoconazole"));

      const h2Collisions = detectGastricPhCollisions(["famotidine", "atazanavir", "itraconazole"]);
      assert.equal(h2Collisions.length, 2);
      const pcabCollisions = detectGastricPhCollisions(["vonoprazan", "posaconazole"]);
      assert.equal(pcabCollisions.length, 1);
    });

    it("integrates ion-trapping and gastric-pH collisions into acidBaseOnDesk and acidBaseReportOnDesk, and validates catalog IDs", () => {
      for (const profile of URINARY_ION_TRAPPING_PROFILES) {
        assert.ok(DRUG_BY_ID[profile.drugId], `Missing catalog ID ${profile.drugId}`);
        for (const alias of profile.aliases) {
          if (alias === "salicylate") continue;
          assert.ok(DRUG_BY_ID[alias], `Missing catalog alias ${alias}`);
        }
      }
      for (const sup of GASTRIC_ACID_SUPPRESSANT_PROFILES) {
        assert.ok(DRUG_BY_ID[sup.drugId], `Missing gastric suppressant catalog ID ${sup.drugId}`);
      }
      for (const v of GASTRIC_PH_DRUG_PROFILES) {
        assert.ok(DRUG_BY_ID[v.drugId], `Missing gastric victim catalog ID ${v.drugId}`);
        for (const alias of v.aliases) {
          assert.ok(DRUG_BY_ID[alias], `Missing gastric victim alias ${alias}`);
        }
      }

      const deskCheck = acidBaseOnDesk([
        "sodium-bicarbonate-iv",
        "amphetamine",
        "omeprazole",
        "dasatinib",
        "ertugliflozin",
        "finerenone",
      ]);
      assert.equal(deskCheck.hasBicarbonateOrAlkalinizer, true);
      assert.equal(deskCheck.hasWeakBaseIonTrappingCandidate, true);
      assert.equal(deskCheck.hasGastricAcidSuppressant, true);
      assert.equal(deskCheck.hasGastricPhDependentDrug, true);
      assert.equal(deskCheck.hasSglt2Inhibitor, true);
      assert.equal(deskCheck.hasPotassiumSparingOrMra, true);

      const salicylateAcidemiaReport = acidBaseReportOnDesk(
        ["aspirin", "acetazolamide", "amphetamine", "omeprazole", "rilpivirine"],
        DEFAULT_HOST,
        {
          chemistry: {
            sodiumMeqL: 140,
            chlorideMeqL: 102,
            bicarbonateMeqL: 12,
            albuminGdl: 4.0,
          },
          abg: {
            measuredPh: 7.18,
            measuredPaco2MmHg: 33,
          },
          patientBiometrics: {
            weightKg: 70,
            sex: "male",
          },
        },
      );

      assert.ok(salicylateAcidemiaReport.alerts.some((a) => a.title.includes("CNS / BBB Ion-Trapping Hazard")));
      assert.ok(salicylateAcidemiaReport.alerts.some((a) => a.title.includes("Weak-Base Renal Clearance")));
      assert.ok(salicylateAcidemiaReport.alerts.some((a) => a.title.includes("Gastric pH Elevation Impairs Rilpivirine")));
      assert.ok((salicylateAcidemiaReport.gastricPhCollisions?.length ?? 0) === 1);
      assert.ok((salicylateAcidemiaReport.urinaryIonTrappingEvaluations?.length ?? 0) === 2);
    });
  });
});
