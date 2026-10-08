import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANTICOAGULATION_CDS_DISCLAIMER,
  ANTICOAGULANT_PROFILES,
  ALL_ANTICOAGULANT_IDS,
  DIRECT_FXA_IDS,
  DIRECT_THROMBIN_IDS,
  VKA_IDS,
  HEPARINOID_IDS,
  COAGULATION_LAB_TRAPS,
  getAnticoagulantProfile,
  getAllAnticoagulantProfiles,
  calculateAndexanetAlfaDosing,
  getIdarucizumabProtocol,
  calculate4FPccWarfarinDosing,
  get4FPccOffLabelDoacGuidance,
  calculateProtamineDosing,
  anticoagulationOnDesk,
  anticoagulationReportOnDesk,
} from "./anticoagulation-reversal";
import { DEFAULT_HOST } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

describe("Anticoagulation Reversal, DOAC Coagulopathy & Hemostatic Kinetics Engine", () => {
  // ==========================================================================
  // 1. STATUTORY REGULATORY POSTURE (FD&C Act § 520(o)(1)(E))
  // ==========================================================================
  describe("Regulatory Compliance & Non-Device CDS Posture", () => {
    it("exports statutory disclaimer explicitly referencing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(ANTICOAGULATION_CDS_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(ANTICOAGULATION_CDS_DISCLAIMER.includes("Non-Device Clinical Decision Support"));
      assert.ok(ANTICOAGULATION_CDS_DISCLAIMER.includes("licensed healthcare professionals"));
      assert.ok(ANTICOAGULATION_CDS_DISCLAIMER.includes("independent verification"));
      assert.ok(ANTICOAGULATION_CDS_DISCLAIMER.includes("Prescribing Information"));
    });

    it("verifies non-prescriptive educational decision support language", () => {
      assert.ok(ANTICOAGULATION_CDS_DISCLAIMER.includes("does not provide automated diagnostic conclusions"));
      assert.ok(ANTICOAGULATION_CDS_DISCLAIMER.includes("does not generate medical orders or infusion pump directives"));
      assert.ok(ANTICOAGULATION_CDS_DISCLAIMER.includes("does not replace individualized bedside clinical evaluation"));
    });

    it("report generator embeds statutory disclaimer with NOT_CLEARED and PI_FOOTER", () => {
      const report = anticoagulationReportOnDesk(["apixaban"], DEFAULT_HOST);
      assert.ok(report.disclaimer.includes(ANTICOAGULATION_CDS_DISCLAIMER));
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });
  });

  // ==========================================================================
  // 2. MASTER ANTICOAGULANT DRUG PROFILES & KINETIC PARAMETERS
  // ==========================================================================
  describe("Master Anticoagulant Drug Profiles & Kinetics", () => {
    it("verifies Direct Factor Xa Inhibitors: Apixaban, Rivaroxaban, Edoxaban", () => {
      // Apixaban
      const apixaban = getAnticoagulantProfile("apixaban");
      assert.ok(apixaban);
      assert.equal(apixaban.class, "direct-fxa-inhibitor");
      assert.equal(apixaban.renalClearanceFraction, 0.27);
      assert.equal(apixaban.oralBioavailabilityPct, 50);
      assert.equal(apixaban.proteinBindingPct, 87);
      assert.ok(apixaban.eliminationHalfLife.normalHours.includes("12h"));
      assert.equal(apixaban.dialyzability.isDialyzable, false);

      // Rivaroxaban
      const rivaroxaban = getAnticoagulantProfile("rivaroxaban");
      assert.ok(rivaroxaban);
      assert.equal(rivaroxaban.class, "direct-fxa-inhibitor");
      assert.equal(rivaroxaban.renalClearanceFraction, 0.33);
      assert.ok(String(rivaroxaban.oralBioavailabilityPct).includes("food"));
      assert.equal(rivaroxaban.proteinBindingPct, 93);
      assert.ok(rivaroxaban.eliminationHalfLife.normalHours.includes("5–9h"));
      assert.equal(rivaroxaban.dialyzability.isDialyzable, false);

      // Edoxaban
      const edoxaban = getAnticoagulantProfile("edoxaban");
      assert.ok(edoxaban);
      assert.equal(edoxaban.class, "direct-fxa-inhibitor");
      assert.equal(edoxaban.renalClearanceFraction, 0.50);
      assert.equal(edoxaban.proteinBindingPct, 55);
      assert.ok(edoxaban.eliminationHalfLife.normalHours.includes("10–14h"));
      assert.ok(edoxaban.boxedWarningsAndTraps.some((w) => w.includes("CrCl > 95 mL/min")));
    });

    it("verifies Direct Thrombin (FIIa) Inhibitors: Dabigatran, Argatroban, Bivalirudin", () => {
      // Dabigatran
      const dabigatran = getAnticoagulantProfile("dabigatran");
      assert.ok(dabigatran);
      assert.equal(dabigatran.class, "direct-thrombin-inhibitor");
      assert.equal(dabigatran.renalClearanceFraction, 0.80);
      assert.equal(dabigatran.proteinBindingPct, 35);
      assert.ok(dabigatran.eliminationHalfLife.normalHours.includes("12–17h"));
      assert.ok(dabigatran.eliminationHalfLife.severeCkdHours?.includes(">28h"));
      assert.equal(dabigatran.dialyzability.isDialyzable, true);
      assert.ok(dabigatran.dialyzability.clearancePct?.includes("50–60%"));
      assert.ok(dabigatran.boxedWarningsAndTraps.some((w) => w.includes("+75%")));

      // Argatroban
      const argatroban = getAnticoagulantProfile("argatroban");
      assert.ok(argatroban);
      assert.equal(argatroban.class, "direct-thrombin-inhibitor");
      assert.ok(argatroban.renalClearanceFraction < 0.20);
      assert.ok(argatroban.eliminationHalfLife.normalHours.includes("39–51 minutes"));
      assert.ok(argatroban.labSensitivity.ptInr.clinicalPearl.includes("falsely elevates INR"));

      // Bivalirudin
      const bivalirudin = getAnticoagulantProfile("bivalirudin");
      assert.ok(bivalirudin);
      assert.equal(bivalirudin.class, "direct-thrombin-inhibitor");
      assert.equal(bivalirudin.renalClearanceFraction, 0.20);
      assert.ok(bivalirudin.eliminationHalfLife.normalHours.includes("25 minutes"));
    });

    it("verifies Vitamin K Antagonist: Warfarin mechanism, metabolism, and factor half-lives", () => {
      const warfarin = getAnticoagulantProfile("warfarin");
      assert.ok(warfarin);
      assert.equal(warfarin.class, "vitamin-k-antagonist");
      assert.ok(warfarin.mechanism.includes("VKORC1"));
      assert.ok(warfarin.metabolismAndElimination.includes("CYP2C9"));
      assert.ok(warfarin.metabolismAndElimination.includes("S-warfarin"));
      assert.equal(warfarin.proteinBindingPct, 99);

      // Verify factor half-lives in boxed warnings or 4F-PCC calculations
      assert.ok(warfarin.boxedWarningsAndTraps.some((w) => w.includes("Factor VII") && w.includes("~6 hours")));
      assert.ok(warfarin.boxedWarningsAndTraps.some((w) => w.includes("Factor II") && w.includes("~60 hours")));
      assert.ok(warfarin.boxedWarningsAndTraps.some((w) => w.includes("Protein C") && w.includes("~8 hours")));
    });

    it("verifies Indirect Heparinoids: UFH, Enoxaparin, Dalteparin, Fondaparinux", () => {
      // UFH
      const ufh = getAnticoagulantProfile("heparin");
      assert.ok(ufh);
      assert.equal(ufh.class, "indirect-heparinoid");
      assert.ok(ufh.mechanism.includes("1:1"));
      assert.ok(ufh.reversalOptions.notes.includes("100%"));

      // Enoxaparin
      const enoxaparin = getAnticoagulantProfile("enoxaparin");
      assert.ok(enoxaparin);
      assert.equal(enoxaparin.class, "indirect-heparinoid");
      assert.ok(enoxaparin.mechanism.includes("3.8:1"));
      assert.equal(enoxaparin.renalClearanceFraction, 0.40);
      assert.ok(enoxaparin.reversalOptions.notes.includes("60%"));

      // Dalteparin
      const dalteparin = getAnticoagulantProfile("dalteparin");
      assert.ok(dalteparin);
      assert.ok(dalteparin.mechanism.includes("2.7:1"));

      // Fondaparinux
      const fondaparinux = getAnticoagulantProfile("fondaparinux");
      assert.ok(fondaparinux);
      assert.equal(fondaparinux.renalClearanceFraction, 1.00);
      assert.ok(fondaparinux.reversalOptions.firstLine.includes("ZERO effect"));
      assert.ok(fondaparinux.boxedWarningsAndTraps.some((w) => w.includes("ZERO REVERSIBILITY")));
    });

    it("checks retrieval functions getAllAnticoagulantProfiles and getAnticoagulantProfile", () => {
      const allProfiles = getAllAnticoagulantProfiles();
      assert.ok(allProfiles.length >= 8);
      assert.ok(allProfiles.some((p) => p.id === "apixaban"));
      assert.ok(allProfiles.some((p) => p.id === "warfarin"));
      assert.ok(allProfiles.some((p) => p.id === "dabigatran"));
    });
  });

  // ==========================================================================
  // 3. ANDEXANET ALFA (ANDEXXA) DOSING ENGINE
  // ==========================================================================
  describe("Andexanet Alfa Dosing Protocol (ANNEXA-4 Benchmarks)", () => {
    it("determines Low Dose for Apixaban <= 5 mg within 8 hours", () => {
      const result = calculateAndexanetAlfaDosing({
        agent: "apixaban",
        lastDoseMg: 5,
        hoursSinceLastDose: 4,
      });

      assert.equal(result.regimenTier, "Low Dose");
      assert.equal(result.isHighDose, false);
      assert.equal(result.ivBolusMg, 400);
      assert.equal(result.ivBolusRateMgMin, 30);
      assert.equal(result.continuousInfusionMg, 480);
      assert.equal(result.continuousInfusionRateMgMin, 4);
      assert.equal(result.continuousInfusionDurationHours, 2);
      assert.equal(result.totalDoseMg, 880);
      assert.equal(result.vialsRequired.vials100mgOnly, 9);
      assert.equal(result.vialsRequired.vials200mgOnly, 5);
      assert.ok(result.trialBenchmark.includes("ANNEXA-4"));
    });

    it("determines High Dose for Apixaban > 5 mg within 8 hours", () => {
      const result = calculateAndexanetAlfaDosing({
        agent: "apixaban",
        lastDoseMg: 10,
        hoursSinceLastDose: 3,
      });

      assert.equal(result.regimenTier, "High Dose");
      assert.equal(result.isHighDose, true);
      assert.equal(result.ivBolusMg, 800);
      assert.equal(result.ivBolusRateMgMin, 30);
      assert.equal(result.continuousInfusionMg, 960);
      assert.equal(result.continuousInfusionRateMgMin, 8);
      assert.equal(result.continuousInfusionDurationHours, 2);
      assert.equal(result.totalDoseMg, 1760);
      assert.equal(result.vialsRequired.vials100mgOnly, 18);
      assert.equal(result.vialsRequired.vials200mgOnly, 9);
    });

    it("determines Low Dose for Rivaroxaban <= 10 mg within 8 hours", () => {
      const result = calculateAndexanetAlfaDosing({
        agent: "rivaroxaban",
        lastDoseMg: 10,
        hoursSinceLastDose: 6,
      });

      assert.equal(result.regimenTier, "Low Dose");
      assert.equal(result.isHighDose, false);
      assert.equal(result.totalDoseMg, 880);
    });

    it("determines High Dose for Rivaroxaban > 10 mg within 8 hours", () => {
      const result = calculateAndexanetAlfaDosing({
        agent: "rivaroxaban",
        lastDoseMg: 20,
        hoursSinceLastDose: 5,
      });

      assert.equal(result.regimenTier, "High Dose");
      assert.equal(result.isHighDose, true);
      assert.equal(result.totalDoseMg, 1760);
    });

    it("determines Low Dose for any dose taken > 8 hours ago", () => {
      const resultHighApixabanLate = calculateAndexanetAlfaDosing({
        agent: "apixaban",
        lastDoseMg: 10,
        hoursSinceLastDose: 10,
      });
      assert.equal(resultHighApixabanLate.regimenTier, "Low Dose");
      assert.equal(resultHighApixabanLate.isHighDose, false);

      const resultHighRivaroxabanLate = calculateAndexanetAlfaDosing({
        agent: "rivaroxaban",
        lastDoseMg: 20,
        hoursSinceLastDose: 12,
      });
      assert.equal(resultHighRivaroxabanLate.regimenTier, "Low Dose");
      assert.equal(resultHighRivaroxabanLate.isHighDose, false);
    });

    it("validates TFPI binding, rebound thrombosis, and heparin resistance warnings", () => {
      const result = calculateAndexanetAlfaDosing({
        agent: "apixaban",
        lastDoseMg: 5,
        hoursSinceLastDose: 2,
      });
      assert.ok(result.safetyWarnings.prothromboticRisk.includes("TFPI"));
      assert.ok(result.safetyWarnings.prothromboticRisk.includes("~10%"));
      assert.ok(result.safetyWarnings.heparinResistance.includes("heparin resistance"));
      assert.ok(result.safetyWarnings.offLabelRestrictions.includes("apixaban and rivaroxaban"));
    });
  });

  // ==========================================================================
  // 4. IDARUCIZUMAB (PRAXBIND) REGIMEN & DABIGATRAN AFFINITY
  // ==========================================================================
  describe("Idarucizumab Protocol & Dabigatran Molecular Targeting", () => {
    it("validates 5 g IV fixed regimen with 2x 2.5 g vials back-to-back within 15 min", () => {
      const proto = getIdarucizumabProtocol();
      assert.equal(proto.standardFixedDoseGrams, 5.0);
      assert.ok(proto.vialConfiguration.includes("two separate 2.5 g / 50 mL vials"));
      assert.ok(proto.vialConfiguration.includes("within <= 15 minutes"));
    });

    it("validates binding affinity Kd ~ 2 pM and 350-fold excess over thrombin", () => {
      const proto = getIdarucizumabProtocol();
      assert.ok(proto.bindingAffinityKd.includes("2.1 pM") || proto.bindingAffinityKd.includes("2 pM"));
      assert.equal(proto.affinityFoldOverThrombin, 350);
      assert.ok(proto.trialEvidence.includes("RE-VERSE AD"));
      assert.ok(proto.trialEvidence.includes(">98%"));
    });

    it("articulates hemodialysis comparison and resumption timing", () => {
      const proto = getIdarucizumabProtocol();
      assert.ok(proto.hemodialysisComparison.includes("50–60%"));
      assert.ok(proto.resumptionGuidance.includes("24 hours"));
    });
  });

  // ==========================================================================
  // 5. 4-FACTOR PCC (KCENTRA) & WARFARIN REVERSAL DOSING
  // ==========================================================================
  describe("4-Factor PCC Warfarin Reversal Nomogram & Concurrent Vitamin K", () => {
    it("calculates Tier 1 (INR 2.0 to < 4.0): 25 units/kg with max cap 2,500 units", () => {
      // 70 kg patient: 70 * 25 = 1,750 units
      const res70kg = calculate4FPccWarfarinDosing({ baselineInr: 3.2, weightKg: 70 });
      assert.equal(res70kg.dosingTierUnitsPerKg, 25);
      assert.equal(res70kg.calculatedUnitsRaw, 1750);
      assert.equal(res70kg.cappedDoseUnits, 1750);
      assert.equal(res70kg.maximumCapApplied, 2500);

      // 120 kg patient: 120 * 25 = 3,000 units -> capped at 2,500 units
      const res120kg = calculate4FPccWarfarinDosing({ baselineInr: 2.8, weightKg: 120 });
      assert.equal(res120kg.calculatedUnitsRaw, 3000);
      assert.equal(res120kg.cappedDoseUnits, 2500);
    });

    it("calculates Tier 2 (INR 4.0 to 6.0): 35 units/kg with max cap 3,500 units", () => {
      // 80 kg patient: 80 * 35 = 2,800 units
      const res80kg = calculate4FPccWarfarinDosing({ baselineInr: 5.0, weightKg: 80 });
      assert.equal(res80kg.dosingTierUnitsPerKg, 35);
      assert.equal(res80kg.calculatedUnitsRaw, 2800);
      assert.equal(res80kg.cappedDoseUnits, 2800);
      assert.equal(res80kg.maximumCapApplied, 3500);

      // 110 kg patient: 110 * 35 = 3,850 units -> capped at 3,500 units
      const res110kg = calculate4FPccWarfarinDosing({ baselineInr: 4.5, weightKg: 110 });
      assert.equal(res110kg.cappedDoseUnits, 3500);
    });

    it("calculates Tier 3 (INR > 6.0): 50 units/kg with max cap 5,000 units", () => {
      // 75 kg patient: 75 * 50 = 3,750 units
      const res75kg = calculate4FPccWarfarinDosing({ baselineInr: 7.4, weightKg: 75 });
      assert.equal(res75kg.dosingTierUnitsPerKg, 50);
      assert.equal(res75kg.calculatedUnitsRaw, 3750);
      assert.equal(res75kg.cappedDoseUnits, 3750);
      assert.equal(res75kg.maximumCapApplied, 5000);

      // 120 kg patient: 120 * 50 = 6,000 units -> capped at 5,000 units
      const res120kg = calculate4FPccWarfarinDosing({ baselineInr: 8.5, weightKg: 120 });
      assert.equal(res120kg.cappedDoseUnits, 5000);
    });

    it("handles baseline INR < 2.0 as below labeled threshold", () => {
      const res = calculate4FPccWarfarinDosing({ baselineInr: 1.6, weightKg: 70 });
      assert.equal(res.dosingTierUnitsPerKg, 0);
      assert.equal(res.cappedDoseUnits, 0);
      assert.ok(res.clinicalRationale.includes("below the labeled threshold"));
    });

    it("enforces mandatory concurrent IV Vitamin K (Phytonadione 10 mg) and explains FVII ~6h half-life", () => {
      const res = calculate4FPccWarfarinDosing({ baselineInr: 3.5, weightKg: 80 });
      assert.equal(res.mandatoryVitaminK.dose, "10 mg IV");
      assert.ok(res.mandatoryVitaminK.routeAndRate.includes("slow IV infusion over 30 minutes"));
      assert.ok(res.mandatoryVitaminK.physiologicalRationale.includes("Factor VII has a half-life of only ~6 hours"));
      assert.ok(res.mandatoryVitaminK.physiologicalRationale.includes("rebound"));
      assert.ok(res.factorHalfLivesSummary.factorVII.includes("~6 hours"));
      assert.ok(res.factorHalfLivesSummary.factorII.includes("~60 hours"));
      assert.ok(res.factorHalfLivesSummary.proteinC.includes("~8 hours"));
    });

    it("provides off-label 4F-PCC DOAC reversal guidance (fixed 2,000 units or 25-50 units/kg)", () => {
      const guidance = get4FPccOffLabelDoacGuidance();
      assert.equal(guidance.recommendedDosing.fixedDoseUnits, 2000);
      assert.ok(guidance.recommendedDosing.weightTieredRangeUnitsPerKg.includes("25–50 units/kg"));
      assert.ok(guidance.targetAgents.includes("apixaban"));
      assert.ok(guidance.targetAgents.includes("rivaroxaban"));
      assert.ok(guidance.targetAgents.includes("dabigatran"));
      assert.ok(guidance.concurrentVitaminKRole.includes("NOT indicated for DOAC reversal"));
    });
  });

  // ==========================================================================
  // 6. PROTAMINE SULFATE DOSING & SAFETY ALERTS
  // ==========================================================================
  describe("Protamine Sulfate Reversal Mechanics & Safety Profile", () => {
    it("calculates UFH reversal based on time elapsed since discontinuation", () => {
      // Immediate (< 30 min): 1.0 mg per 100 units UFH
      const ufhImmediate = calculateProtamineDosing({
        agent: "heparin",
        doseUnitsOrMg: 5000,
        hoursElapsed: 0.2,
      });
      assert.equal(ufhImmediate.calculatedProtamineDoseMg, 50); // 5000/100 * 1 = 50 mg (at max cap)
      assert.equal(ufhImmediate.maxDoseCapApplied, 50);
      assert.ok(ufhImmediate.percentNeutralization.includes("100%"));

      // 45 min elapsed: 0.75 mg per 100 units UFH
      const ufh45m = calculateProtamineDosing({
        agent: "heparin",
        doseUnitsOrMg: 4000,
        hoursElapsed: 0.75,
      });
      assert.equal(ufh45m.calculatedProtamineDoseMg, 30); // 4000/100 * 0.75 = 30 mg

      // > 2 hours elapsed: 0.25 mg per 100 units UFH
      const ufh3h = calculateProtamineDosing({
        agent: "heparin",
        doseUnitsOrMg: 4000,
        hoursElapsed: 3.0,
      });
      assert.equal(ufh3h.calculatedProtamineDoseMg, 10); // 4000/100 * 0.25 = 10 mg
    });

    it("enforces maximum single dose cap of 50 mg to prevent protamine-induced coagulopathy", () => {
      const ufhHuge = calculateProtamineDosing({
        agent: "heparin",
        doseUnitsOrMg: 10000, // 10,000 units would calculate to 100 mg
        hoursElapsed: 0.1,
      });
      assert.equal(ufhHuge.calculatedProtamineDoseMg, 50);
      assert.ok(ufhHuge.clinicalRationale.includes("maximum 50 mg single dose"));
    });

    it("calculates partial Enoxaparin neutralization (~60% anti-FXa) within 8 hours", () => {
      const enoxaparinRecent = calculateProtamineDosing({
        agent: "enoxaparin",
        doseUnitsOrMg: 40,
        hoursElapsed: 4,
      });
      assert.equal(enoxaparinRecent.calculatedProtamineDoseMg, 40); // 1 mg per 1 mg
      assert.ok(enoxaparinRecent.percentNeutralization.includes("~60%"));

      const enoxaparinLate = calculateProtamineDosing({
        agent: "enoxaparin",
        doseUnitsOrMg: 80,
        hoursElapsed: 10,
      });
      assert.equal(enoxaparinLate.calculatedProtamineDoseMg, 40); // 0.5 mg per 1 mg (80 * 0.5 = 40 mg)
    });

    it("triggers critical ZERO REVERSAL alert for Fondaparinux", () => {
      const fondaparinux = calculateProtamineDosing({
        agent: "fondaparinux",
        doseUnitsOrMg: 7.5,
        hoursElapsed: 2,
      });
      assert.equal(fondaparinux.calculatedProtamineDoseMg, 0);
      assert.equal(fondaparinux.isFondaparinuxZeroReversal, true);
      assert.ok(fondaparinux.percentNeutralization.includes("0% (COMPLETELY REFRACTORY)"));
      assert.ok(fondaparinux.clinicalRationale.includes("ZERO effect"));
    });

    it("flags anaphylactoid risk for fish allergy, prior NPH insulin, or prior vasectomy", () => {
      const highRisk = calculateProtamineDosing({
        agent: "heparin",
        doseUnitsOrMg: 3000,
        hoursElapsed: 1,
        fishAllergy: true,
        priorNphInsulin: true,
        priorVasectomy: true,
      });
      assert.equal(highRisk.anaphylactoidRiskFlags.isHighRiskAnaphylaxis, true);
      assert.equal(highRisk.anaphylactoidRiskFlags.hasFishAllergy, true);
      assert.equal(highRisk.anaphylactoidRiskFlags.hasPriorNphInsulin, true);
      assert.equal(highRisk.anaphylactoidRiskFlags.hasPriorVasectomy, true);
      assert.ok(highRisk.anaphylactoidRiskFlags.pulmonaryVasoconstrictionWarning.includes("pulmonary vasoconstriction"));
    });
  });

  // ==========================================================================
  // 7. COAGULATION LAB TRAPS & MONITORING MATRIX
  // ==========================================================================
  describe("Coagulation Lab Traps & Monitoring Matrix", () => {
    it("includes Apixaban misleading normal PT/INR trap", () => {
      const apixabanTrap = COAGULATION_LAB_TRAPS.find((t) => t.targetDrug.includes("Apixaban"));
      assert.ok(apixabanTrap);
      assert.equal(apixabanTrap.trapType, "misleading-normal");
      assert.ok(apixabanTrap.clinicalRule.includes("does NOT rule out"));
      assert.ok(apixabanTrap.underlyingMechanics.includes("30–50%"));
    });

    it("includes Dabigatran Thrombin Time (TT) exclusion rule", () => {
      const dabigatranTrap = COAGULATION_LAB_TRAPS.find((t) => t.targetDrug.includes("Dabigatran"));
      assert.ok(dabigatranTrap);
      assert.equal(dabigatranTrap.trapType, "exclusion-rule");
      assert.ok(dabigatranTrap.clinicalRule.includes("EXCLUDES"));
    });

    it("includes Argatroban artifactual PT/INR elevation trap", () => {
      const argatrobanTrap = COAGULATION_LAB_TRAPS.find((t) => t.targetDrug.includes("Argatroban"));
      assert.ok(argatrobanTrap);
      assert.equal(argatrobanTrap.trapType, "artifactual-elevation");
      assert.ok(argatrobanTrap.clinicalRule.includes("falsely elevates"));
    });

    it("includes Edoxaban CrCl > 95 mL/min hyper-clearance trap", () => {
      const edoxabanTrap = COAGULATION_LAB_TRAPS.find((t) => t.targetDrug.includes("Edoxaban"));
      assert.ok(edoxabanTrap);
      assert.ok(edoxabanTrap.clinicalRule.includes("CrCl > 95 mL/min"));
    });
  });

  // ==========================================================================
  // 8. DESK DETECTION & END-TO-END REPORT GENERATION
  // ==========================================================================
  describe("Desk Detection & End-to-End Clinical Report Generator", () => {
    it("detects DOACs, VKAs, Heparinoids, and Reversal Agents on desk", () => {
      const desk = anticoagulationOnDesk(["apixaban", "warfarin", "heparin", "idarucizumab"]);
      assert.equal(desk.hasAnticoagulant, true);
      assert.equal(desk.hasDoac, true);
      assert.equal(desk.hasDirectFxaInhibitor, true);
      assert.equal(desk.hasVka, true);
      assert.equal(desk.hasHeparinoid, true);
      assert.equal(desk.hasReversalAgent, true);
      assert.deepEqual(desk.anticoagulants, ["apixaban", "warfarin", "heparin"]);
      assert.deepEqual(desk.reversals, ["idarucizumab"]);
    });

    it("generates end-to-end report for Apixaban patient", () => {
      const report = anticoagulationReportOnDesk(["apixaban"], DEFAULT_HOST, {
        weightKg: 80,
        lastDoseMg: 10,
        hoursSinceLastDose: 4,
      });

      assert.ok(report.onDesk.hasDoac);
      assert.ok(report.andexanetDosing);
      assert.equal(report.andexanetDosing.regimenTier, "High Dose");
      assert.ok(report.fourFactorPccDoacGuidance);
      assert.ok(report.highYieldClinicalPearls.some((p) => p.includes("Apixaban PT Trap")));
      assert.ok(report.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
    });

    it("generates end-to-end report for Warfarin patient with high INR", () => {
      const report = anticoagulationReportOnDesk(["warfarin"], DEFAULT_HOST, {
        weightKg: 85,
        baselineInr: 6.5,
      });

      assert.ok(report.onDesk.hasVka);
      assert.ok(report.fourFactorPccWarfarinDosing);
      assert.equal(report.fourFactorPccWarfarinDosing.dosingTierUnitsPerKg, 50);
      assert.equal(report.fourFactorPccWarfarinDosing.cappedDoseUnits, 4250); // 85 * 50 = 4250
      assert.ok(report.fourFactorPccWarfarinDosing.mandatoryVitaminK.dose.includes("10 mg IV"));
      assert.ok(report.highYieldClinicalPearls.some((p) => p.includes("Warfarin 4F-PCC + Vitamin K Rule")));
    });

    it("generates end-to-end report for Heparin patient requiring Protamine", () => {
      const report = anticoagulationReportOnDesk(["heparin"], DEFAULT_HOST, {
        lastDoseMg: 4000,
        hoursSinceLastDose: 1,
        fishAllergy: true,
      });

      assert.ok(report.onDesk.hasHeparinoid);
      assert.ok(report.protamineDosing);
      assert.equal(report.protamineDosing.anaphylactoidRiskFlags.isHighRiskAnaphylaxis, true);
    });

    it("generates clean neutral report when no anticoagulants are on the desk", () => {
      const report = anticoagulationReportOnDesk(["acetaminophen", "ibuprofen"], DEFAULT_HOST);
      assert.equal(report.onDesk.hasAnticoagulant, false);
      assert.equal(report.onDesk.hasDoac, false);
      assert.equal(report.onDesk.anticoagulants.length, 0);
      assert.ok(report.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
    });
  });
});
