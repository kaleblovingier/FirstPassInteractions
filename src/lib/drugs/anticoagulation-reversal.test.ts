import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANTICOAGULATION_CDS_DISCLAIMER,
  ANTICOAGULATION_LITERATURE_CITATIONS,
  ANTICOAGULANT_PROFILES,
  ALL_ANTICOAGULANT_IDS,
  DIRECT_FXA_IDS,
  DIRECT_THROMBIN_IDS,
  DTI_IDS,
  VKA_IDS,
  HEPARINOID_IDS,
  COAGULATION_LAB_TRAPS,
  getAnticoagulantProfile,
  getAllAnticoagulantProfiles,
  calculateHit4TsScore,
  evaluateThrombocytopeniaScore,
  calculateArgatrobanKinetics,
  calculateBivalirudinKinetics,
  evaluateArgatrobanWarfarinCrossover,
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

    it("exports authoritative peer-reviewed literature citations under FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(ANTICOAGULATION_LITERATURE_CITATIONS.length >= 8);
      assert.ok(ANTICOAGULATION_LITERATURE_CITATIONS.some((c) => c.includes("Warkentin")));
      assert.ok(ANTICOAGULATION_LITERATURE_CITATIONS.some((c) => c.includes("ANNEXA-4")));
      assert.ok(ANTICOAGULATION_LITERATURE_CITATIONS.some((c) => c.includes("RE-VERSE AD")));
      assert.ok(ANTICOAGULATION_LITERATURE_CITATIONS.some((c) => c.includes("American Society of Hematology")));
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
  // 3. HIT 4TS SCORING & TRIAGE PROTOCOL (LOW, INTERMEDIATE, HIGH TIERS)
  // ==========================================================================
  describe("Heparin-Induced Thrombocytopenia (HIT) 4Ts Scoring & Triage Engine", () => {
    it("evaluates thrombocytopenia score accurately from platelet drop and nadir", () => {
      // 2 points: >50% drop AND nadir >= 20k
      assert.equal(evaluateThrombocytopeniaScore(200, 50), 2); // 75% drop, nadir 50k
      assert.equal(evaluateThrombocytopeniaScore(300000, 60000), 2); // 80% drop, nadir 60k

      // 1 point: 30-50% drop OR nadir 10-19k
      assert.equal(evaluateThrombocytopeniaScore(100, 60), 1); // 40% drop, nadir 60k
      assert.equal(evaluateThrombocytopeniaScore(200, 15), 1); // nadir 15k is in 10-19k range

      // 0 points: <30% drop OR nadir < 10k
      assert.equal(evaluateThrombocytopeniaScore(200, 160), 0); // 20% drop
      assert.equal(evaluateThrombocytopeniaScore(200, 8), 0); // nadir 8k < 10k
      assert.equal(evaluateThrombocytopeniaScore(0, 0), 0);
    });

    it("calculates Low Probability Tier (0-3 points, pre-test < 2%)", () => {
      const lowResult = calculateHit4TsScore({
        thrombocytopeniaScore: 1, // 30-50% drop
        timingScore: 0,           // fall <= day 4 without recent heparin
        thrombosisScore: 0,       // none
        otherCausesScore: 1,      // possible alternative cause
      });

      assert.equal(lowResult.totalScore, 2);
      assert.equal(lowResult.probabilityTier, "Low");
      assert.equal(lowResult.preTestProbabilityPct, "< 2%");
      assert.equal(lowResult.recommendedActions.cessationOfAllHeparin, false);
      assert.equal(lowResult.recommendedActions.orderPf4Elisa, false);
      assert.equal(lowResult.recommendedActions.orderFunctionalSra, false);
      assert.equal(lowResult.recommendedActions.initiateAlternativeAnticoagulant, false);
      assert.ok(lowResult.clinicalInterpretation.includes("Low pre-test probability"));
      assert.ok(lowResult.clinicalInterpretation.includes("Continue heparin"));
      assert.ok(lowResult.recommendedActions.actionSummary.includes("Do not order PF4 ELISA reflexively"));
    });

    it("calculates Intermediate Probability Tier (4-5 points, ~14% probability)", () => {
      const intResult = calculateHit4TsScore({
        thrombocytopeniaScore: 2, // >50% drop, nadir >= 20k
        timingScore: 1,           // > day 10
        thrombosisScore: 1,       // suspected thrombosis
        otherCausesScore: 1,      // possible other cause
      });

      assert.equal(intResult.totalScore, 5);
      assert.equal(intResult.probabilityTier, "Intermediate");
      assert.equal(intResult.preTestProbabilityPct, "~14%");
      assert.equal(intResult.recommendedActions.cessationOfAllHeparin, true);
      assert.equal(intResult.recommendedActions.orderPf4Elisa, true);
      assert.equal(intResult.recommendedActions.orderFunctionalSra, true);
      assert.equal(intResult.recommendedActions.initiateAlternativeAnticoagulant, true);
      assert.equal(intResult.recommendedActions.avoidPlateletTransfusions, true);
      assert.ok(intResult.recommendedActions.recommendedAlternativeAgents.some((a) => a.includes("Argatroban")));
      assert.ok(intResult.recommendedActions.recommendedAlternativeAgents.some((a) => a.includes("Bivalirudin")));
      assert.ok(intResult.clinicalInterpretation.includes("Immediate cessation of all heparin"));
      assert.ok(intResult.recommendedActions.actionSummary.includes("paradoxical arterial/venous thrombotic occlusion"));
    });

    it("calculates High Probability Tier (6-8 points, ~64% probability)", () => {
      const highResult = calculateHit4TsScore({
        thrombocytopeniaScore: 2, // >50% drop and nadir >= 20k
        timingScore: 2,           // clear fall days 5-10
        thrombosisScore: 2,       // proven new thrombosis
        otherCausesScore: 2,      // none apparent
      });

      assert.equal(highResult.totalScore, 8);
      assert.equal(highResult.probabilityTier, "High");
      assert.equal(highResult.preTestProbabilityPct, "~64%");
      assert.equal(highResult.recommendedActions.cessationOfAllHeparin, true);
      assert.equal(highResult.recommendedActions.orderPf4Elisa, true);
      assert.equal(highResult.recommendedActions.orderFunctionalSra, true);
      assert.equal(highResult.recommendedActions.initiateAlternativeAnticoagulant, true);
      assert.equal(highResult.recommendedActions.avoidPlateletTransfusions, true);
      assert.ok(highResult.clinicalInterpretation.includes("High pre-test probability"));
      assert.ok(highResult.clinicalInterpretation.includes("duplex ultrasound"));
      assert.ok(highResult.scoringBreakdown.thrombocytopenia.includes("2 pts"));
      assert.ok(highResult.scoringBreakdown.timing.includes("2 pts"));
      assert.ok(highResult.scoringBreakdown.thrombosis.includes("2 pts"));
      assert.ok(highResult.scoringBreakdown.otherCauses.includes("2 pts"));
    });

    it("computes 4Ts score from categorical inputs (timing, thrombosis, and other causes)", () => {
      const catResult = calculateHit4TsScore({
        baselinePlateletCount: 250,
        nadirPlateletCount: 80, // >50% drop (68%), nadir 80k -> 2 pts
        timingCategory: "days_5_10_or_rapid_within_30d", // 2 pts
        thrombosisCategory: "proven_new_necrosis_acute_systemic", // 2 pts
        otherCausesCategory: "possible", // 1 pt
      });

      assert.equal(catResult.thrombocytopeniaScore, 2);
      assert.equal(catResult.timingScore, 2);
      assert.equal(catResult.thrombosisScore, 2);
      assert.equal(catResult.otherCausesScore, 1);
      assert.equal(catResult.totalScore, 7);
      assert.equal(catResult.probabilityTier, "High");
    });
  });

  // ==========================================================================
  // 4. NON-HEPARIN DTI KINETICS & ARGATROBAN-WARFARIN TRANSITION ENGINE
  // ==========================================================================
  describe("Non-Heparin DTI Kinetics & Argatroban-Warfarin Transition", () => {
    it("calculates Argatroban kinetics in normal hepatic function and confirms renal preference", () => {
      const normalHep = calculateArgatrobanKinetics({
        weightKg: 70,
        hepaticImpairment: "none",
        baselineApttSeconds: 30,
      });

      assert.equal(normalHep.agentName, "Argatroban");
      assert.equal(normalHep.molecularWeightDa, 508.6);
      assert.equal(normalHep.isPreferredInRenalImpairment, true);
      assert.equal(normalHep.recommendedInitialInfusionRateMcgKgMin, 2.0);
      assert.equal(normalHep.calculatedInfusionRateMcgMin, 140); // 70 * 2 = 140
      assert.equal(normalHep.calculatedInfusionRateMgHr, 8.4);   // 140 * 60 / 1000 = 8.4 mg/hr
      assert.ok(normalHep.eliminationHalfLifeMinutes.includes("39–51 minutes"));
      assert.ok(normalHep.targetMonitoringParameter.includes("aPTT of 1.5 to 3.0"));
    });

    it("reduces Argatroban initial infusion rate in hepatic impairment and severe shock", () => {
      // Child-Pugh B / bilirubin > 1.5 mg/dL -> 0.5 mcg/kg/min
      const modHep = calculateArgatrobanKinetics({
        weightKg: 80,
        hepaticImpairment: "moderate",
      });
      assert.equal(modHep.recommendedInitialInfusionRateMcgKgMin, 0.5);
      assert.equal(modHep.calculatedInfusionRateMcgMin, 40); // 80 * 0.5 = 40
      assert.equal(modHep.calculatedInfusionRateMgHr, 2.4);  // 40 * 60 / 1000 = 2.4 mg/hr
      assert.ok(modHep.eliminationHalfLifeMinutes.includes("181 minutes"));

      // Cardiogenic shock / multiorgan failure -> 0.25 mcg/kg/min
      const shockHep = calculateArgatrobanKinetics({
        weightKg: 80,
        hepaticImpairment: "severe_shock",
      });
      assert.equal(shockHep.recommendedInitialInfusionRateMcgKgMin, 0.25);
      assert.equal(shockHep.calculatedInfusionRateMcgMin, 20);
      assert.equal(shockHep.calculatedInfusionRateMgHr, 1.2);
    });

    it("calculates Bivalirudin kinetics across renal function tiers and PCI indications", () => {
      // Normal renal function in HIT treatment (0.15 mg/kg/hr)
      const normalBiv = calculateBivalirudinKinetics({
        weightKg: 70,
        renalStatus: "normal",
        indication: "hit_treatment",
      });
      assert.equal(normalBiv.agentName, "Bivalirudin");
      assert.equal(normalBiv.molecularWeightDa, 2180);
      assert.equal(normalBiv.isPreferredInHepaticImpairment, true);
      assert.equal(normalBiv.recommendedInfusionRateMgKgHr, 0.15);
      assert.equal(normalBiv.calculatedInfusionRateMgHr, 10.5); // 70 * 0.15 = 10.5 mg/hr
      assert.ok(normalBiv.eliminationHalfLifeMinutes.includes("25 minutes"));
      assert.ok(normalBiv.primaryClearancePathway.includes("80% proteolytic"));

      // Severe CKD (CrCl < 30 mL/min) -> 0.10 mg/kg/hr
      const severeCkd = calculateBivalirudinKinetics({
        weightKg: 70,
        renalStatus: "severe_ckd",
      });
      assert.equal(severeCkd.recommendedInfusionRateMgKgHr, 0.10);
      assert.equal(severeCkd.calculatedInfusionRateMgHr, 7.0);
      assert.ok(severeCkd.eliminationHalfLifeMinutes.includes("57 minutes"));

      // ESRD on Dialysis -> 0.05 mg/kg/hr
      const esrdBiv = calculateBivalirudinKinetics({
        weightKg: 80,
        renalStatus: "esrd_dialysis",
      });
      assert.equal(esrdBiv.recommendedInfusionRateMgKgHr, 0.05);
      assert.equal(esrdBiv.calculatedInfusionRateMgHr, 4.0);
      assert.ok(esrdBiv.eliminationHalfLifeMinutes.includes("3.5 hours"));

      // PCI Indication -> 1.75 mg/kg/hr
      const pciBiv = calculateBivalirudinKinetics({
        weightKg: 80,
        indication: "pci",
      });
      assert.equal(pciBiv.recommendedInfusionRateMgKgHr, 1.75);
      assert.equal(pciBiv.calculatedInfusionRateMgHr, 140);
    });

    it("evaluates Argatroban-Warfarin Crossover Trap when combined INR <= 4.0", () => {
      const trapActive = evaluateArgatrobanWarfarinCrossover({
        combinedInr: 2.8,
        daysOnCombinedTherapy: 2,
      });

      assert.equal(trapActive.hasExceededTargetInr4, false);
      assert.equal(trapActive.canStopArgatrobanNow, false);
      assert.ok(trapActive.recommendedNextStep.includes("DO NOT STOP ARGATROBAN"));
      assert.ok(trapActive.safetyAlert.includes("CRITICAL CROSSOVER TRAP"));
      assert.ok(trapActive.safetyAlert.includes("catastrophic recurrent thrombosis"));
    });

    it("evaluates Argatroban-Warfarin Crossover Trap when combined INR > 4.0 for >= 2 days", () => {
      const readyForHold = evaluateArgatrobanWarfarinCrossover({
        combinedInr: 4.6,
        daysOnCombinedTherapy: 2,
      });

      assert.equal(readyForHold.hasExceededTargetInr4, true);
      assert.equal(readyForHold.canStopArgatrobanNow, true);
      assert.ok(readyForHold.recommendedNextStep.includes("HOLD argatroban infusion now"));
      assert.ok(readyForHold.recommendedNextStep.includes("Wait 4 to 6 hours"));
      assert.ok(readyForHold.recheckInrWindowHours.includes("4 to 6 hours"));
      assert.ok(readyForHold.trueWarfarinInrGoal.includes(">= 2.0"));
    });
  });

  // ==========================================================================
  // 5. ANDEXANET ALFA (ANDEXXA) DOSING ENGINE
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

    it("detects DTIs (Argatroban, Bivalirudin) on desk with hasDti flag", () => {
      const desk = anticoagulationOnDesk(["argatroban", "bivalirudin", "kcentra", "protamine"]);
      assert.equal(desk.hasAnticoagulant, true);
      assert.equal(desk.hasDirectThrombinInhibitor, true);
      assert.equal(desk.hasDti, true);
      assert.equal(desk.hasReversalAgent, true);
      assert.ok(desk.anticoagulants.includes("argatroban"));
      assert.ok(desk.anticoagulants.includes("bivalirudin"));
      assert.ok(desk.reversals.includes("kcentra"));
      assert.ok(desk.reversals.includes("protamine"));
    });

    it("generates end-to-end report evaluating HIT 4Ts score and DTI crossover trap", () => {
      const report = anticoagulationReportOnDesk(["heparin", "argatroban", "warfarin"], DEFAULT_HOST, {
        plateletBaseline: 240,
        plateletNadir: 70, // ~71% drop, nadir 70k -> 2 pts
        hitTimingScore: 2,
        hitThrombosisScore: 2,
        hitOtherCausesScore: 2,
        combinedInr: 4.8,
        daysOnCombinedTherapy: 2,
      });

      assert.ok(report.onDesk.hasHeparinoid);
      assert.ok(report.onDesk.hasDti);
      assert.ok(report.onDesk.hasVka);
      assert.ok(report.hit4TsEvaluation);
      assert.equal(report.hit4TsEvaluation.totalScore, 8);
      assert.equal(report.hit4TsEvaluation.probabilityTier, "High");
      assert.equal(report.hit4TsEvaluation.recommendedActions.cessationOfAllHeparin, true);
      assert.ok(report.argatrobanKinetics);
      assert.equal(report.argatrobanKinetics.agentName, "Argatroban");
      assert.ok(report.argatrobanWarfarinCrossover);
      assert.equal(report.argatrobanWarfarinCrossover.hasExceededTargetInr4, true);
      assert.equal(report.argatrobanWarfarinCrossover.canStopArgatrobanNow, true);
      assert.ok(report.highYieldClinicalPearls.some((p) => p.includes("HIT 4Ts Triage")));
      assert.ok(report.highYieldClinicalPearls.some((p) => p.includes("ARGATROBAN-WARFARIN CROSSOVER TRAP")));
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
