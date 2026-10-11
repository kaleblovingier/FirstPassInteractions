import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANTIARRHYTHMIC_CDS_DISCLAIMER,
  ANTIARRHYTHMIC_CITATIONS,
  evaluateDigoxinTdm,
  evaluateElectrolyteAmplifiers,
  calculateDigiFabVials,
  ANTIARRHYTHMIC_PROFILES,
  antiarrhythmicOnDesk,
  antiarrhythmicReportOnDesk,
  POTENT_PGP_INHIBITOR_MAP,
} from "./antiarrhythmic-kinetics";
import { DEFAULT_HOST } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

describe("Antiarrhythmic Kinetics, Vaughan-Williams & Digoxin / DigiFab Engine", () => {
  // ==========================================================================
  // 1. STATUTORY CDS REGULATORY CONFORMANCE (FD&C Act § 520(o)(1)(E))
  // ==========================================================================
  describe("Regulatory Posture & Non-Device CDS Conformance", () => {
    it("exports statutory disclaimer explicitly citing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(ANTIARRHYTHMIC_CDS_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(ANTIARRHYTHMIC_CDS_DISCLAIMER.includes("Non-Device Clinical Decision Support"));
      assert.ok(ANTIARRHYTHMIC_CDS_DISCLAIMER.includes("licensed healthcare professionals"));
      assert.ok(ANTIARRHYTHMIC_CDS_DISCLAIMER.includes("independent verification"));
      assert.ok(ANTIARRHYTHMIC_CDS_DISCLAIMER.includes("Prescribing Information"));
    });

    it("ensures disclaimer maintains non-prescriptive, educational decision support posture", () => {
      assert.ok(ANTIARRHYTHMIC_CDS_DISCLAIMER.includes("does not provide automated diagnostic conclusions"));
      assert.ok(ANTIARRHYTHMIC_CDS_DISCLAIMER.includes("does not generate infusion orders"));
      assert.ok(ANTIARRHYTHMIC_CDS_DISCLAIMER.includes("prescription directives"));
    });

    it("contains authoritative peer-reviewed cardiovascular & electrophysiology literature citations", () => {
      assert.ok(ANTIARRHYTHMIC_CITATIONS.length >= 8);
      assert.ok(ANTIARRHYTHMIC_CITATIONS.some((c) => c.includes("DIG")));
      assert.ok(ANTIARRHYTHMIC_CITATIONS.some((c) => c.includes("CAST")));
      assert.ok(ANTIARRHYTHMIC_CITATIONS.some((c) => c.includes("Vaughan Williams")));
      assert.ok(ANTIARRHYTHMIC_CITATIONS.some((c) => c.includes("Dofetilide")));
      assert.ok(ANTIARRHYTHMIC_CITATIONS.some((c) => c.includes("Tisdale")));
    });

    it("embeds statutory disclaimer with platform regulatory footers in reports", () => {
      const report = antiarrhythmicReportOnDesk(["digoxin", "flecainide"], DEFAULT_HOST);
      assert.ok(report.disclaimer.includes(ANTIARRHYTHMIC_CDS_DISCLAIMER));
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });
  });

  // ==========================================================================
  // 2. DIGOXIN TDM & INDICATION-SPECIFIC TARGETS (HFrEF vs AFib)
  // ==========================================================================
  describe("Digoxin Pharmacokinetics & Therapeutic Drug Monitoring (TDM)", () => {
    it("evaluates HFrEF target window (0.5 to 0.9 ng/mL) based on DIG trial evidence", () => {
      const optimal = evaluateDigoxinTdm({
        serumDigoxinNgMl: 0.7,
        indication: "hfref",
        hoursPostDose: 12,
      });
      assert.equal(optimal.band, "target");
      assert.equal(optimal.isWithinTargetRange, true);
      assert.equal(optimal.isToxic, false);
      assert.ok(optimal.mortalityEvidence.includes("DIG Trial"));
      assert.ok(optimal.mortalityEvidence.includes("Rathore"));

      const low = evaluateDigoxinTdm({
        serumDigoxinNgMl: 0.4,
        indication: "hfref",
        hoursPostDose: 12,
      });
      assert.equal(low.band, "subtherapeutic");
      assert.equal(low.isWithinTargetRange, false);
    });

    it("flags elevated HFrEF levels (1.0 to 1.2 and 1.3 to 2.0 ng/mL) with excess mortality evidence", () => {
      const borderline = evaluateDigoxinTdm({
        serumDigoxinNgMl: 1.1,
        indication: "hfref",
        hoursPostDose: 12,
      });
      assert.equal(borderline.band, "elevated");
      assert.equal(borderline.isWithinTargetRange, false);
      assert.ok(borderline.clinicalMeaning.includes("Above evidence-based heart failure target"));

      const supraTarget = evaluateDigoxinTdm({
        serumDigoxinNgMl: 1.6,
        indication: "hfref",
        hoursPostDose: 12,
      });
      assert.equal(supraTarget.band, "elevated");
      assert.equal(supraTarget.isToxic, false);
      assert.ok(supraTarget.clinicalMeaning.includes("excess mortality"));
    });

    it("evaluates Atrial Fibrillation rate control targets (0.8 to 2.0 ng/mL)", () => {
      const afOptimal = evaluateDigoxinTdm({
        serumDigoxinNgMl: 1.0,
        indication: "afib",
        hoursPostDose: 14,
      });
      assert.equal(afOptimal.band, "target");
      assert.equal(afOptimal.isWithinTargetRange, true);

      const afPermissible = evaluateDigoxinTdm({
        serumDigoxinNgMl: 1.8,
        indication: "afib",
        hoursPostDose: 12,
      });
      assert.equal(afPermissible.band, "target");
      assert.equal(afPermissible.isWithinTargetRange, true);
      assert.ok(afPermissible.clinicalMeaning.includes("refractory AFib rate control"));
    });

    it("identifies definite digitalis toxicity (> 2.0 ng/mL) and life-threatening toxicity (> 4.0 ng/mL)", () => {
      const toxic = evaluateDigoxinTdm({
        serumDigoxinNgMl: 2.8,
        indication: "hfref",
        hoursPostDose: 12,
      });
      assert.equal(toxic.band, "toxic");
      assert.equal(toxic.isToxic, true);
      assert.equal(toxic.isLifeThreatening, false);

      const lifeThreatening = evaluateDigoxinTdm({
        serumDigoxinNgMl: 4.8,
        indication: "afib",
        hoursPostDose: 12,
      });
      assert.equal(lifeThreatening.band, "severe-toxicity");
      assert.equal(lifeThreatening.isToxic, true);
      assert.equal(lifeThreatening.isLifeThreatening, true);
      assert.ok(lifeThreatening.clinicalMeaning.includes("DigiFab reversal indicated"));
    });
  });

  // ==========================================================================
  // 3. DISTRIBUTION KINETICS & SAMPLING TIMING TRAP
  // ==========================================================================
  describe("Distribution Kinetics & Pre-Distribution Phase Artifact", () => {
    it("flags samples drawn < 6 hours post-dose as distribution artifacts (Vd ~ 7 L/kg)", () => {
      const earlySample = evaluateDigoxinTdm({
        serumDigoxinNgMl: 3.5,
        indication: "hfref",
        hoursPostDose: 3,
      });
      assert.equal(earlySample.band, "distribution-phase-artifact");
      assert.equal(earlySample.isDistributionLagArtifact, true);
      assert.ok(earlySample.samplingTimingGuidance.includes("SAMPLING TIMING TRAP"));
      assert.ok(earlySample.samplingTimingGuidance.includes("Vd ~ 7 L/kg"));
      assert.ok(earlySample.samplingTimingGuidance.includes("Withhold DigiFab sizing"));
    });

    it("recognizes borderline 6 to 8 hour sampling and valid >= 8 hour steady-state trough", () => {
      const borderline = evaluateDigoxinTdm({
        serumDigoxinNgMl: 0.8,
        indication: "hfref",
        hoursPostDose: 7,
      });
      assert.equal(borderline.isDistributionLagArtifact, false);
      assert.ok(borderline.samplingTimingGuidance.includes("Borderline distribution window"));

      const trough = evaluateDigoxinTdm({
        serumDigoxinNgMl: 0.8,
        indication: "hfref",
        hoursPostDose: 18,
      });
      assert.equal(trough.isDistributionLagArtifact, false);
      assert.ok(trough.samplingTimingGuidance.includes("Valid steady-state trough sampling"));
    });
  });

  // ==========================================================================
  // 4. ELECTROLYTE SENSITIVITY AMPLIFIERS
  // ==========================================================================
  describe("Electrolyte Sensitivity Amplifiers (K+, Mg2+, Ca2+)", () => {
    it("identifies hypokalemia as competitive binding amplifier at Na+/K+ ATPase", () => {
      const evalResult = evaluateElectrolyteAmplifiers({
        potassiumMeqL: 3.1,
        magnesiumMgDl: 2.1,
        calciumMgDl: 9.5,
        serumDigoxinNgMl: 1.0,
      });
      assert.equal(evalResult.hasAmplifier, true);
      assert.equal(evalResult.hypokalemia, true);
      assert.equal(evalResult.hypomagnesemia, false);
      assert.ok(evalResult.mechanisms.some((m) => m.includes("alpha-subunit")));
      assert.ok(evalResult.arrhythmiaHazards.includes("Bidirectional ventricular tachycardia"));
    });

    it("identifies hypomagnesemia as cofactor loss and hypercalcemia as NCX reverse-mode overload", () => {
      const evalResult = evaluateElectrolyteAmplifiers({
        potassiumMeqL: 4.2,
        magnesiumMgDl: 1.4,
        calciumMgDl: 11.2,
        serumDigoxinNgMl: 1.2,
      });
      assert.equal(evalResult.hasAmplifier, true);
      assert.equal(evalResult.hypomagnesemia, true);
      assert.equal(evalResult.hypercalcemia, true);
      assert.ok(evalResult.mechanisms.some((m) => m.includes("obligatory enzymatic cofactor")));
      assert.ok(evalResult.mechanisms.some((m) => m.includes("NCX (Na+/Ca2+ exchanger) reverse-mode")));
      assert.ok(evalResult.arrhythmiaHazards.some((h) => h.includes("PAT with block")));
    });

    it("escalates severity to 'severe' when critical hypokalemia (<3.0) or combined perturbations exist", () => {
      const severeEval = evaluateElectrolyteAmplifiers({
        potassiumMeqL: 2.8,
        magnesiumMgDl: 1.9,
      });
      assert.equal(severeEval.severity, "severe");
      assert.ok(severeEval.clinicalAdvisory.includes("CRITICAL ELECTROLYTE SENSITIVITY"));
    });
  });

  // ==========================================================================
  // 5. P-GLYCOPROTEIN (P-gp) & RENAL CLEARANCE COLLISIONS
  // ==========================================================================
  describe("P-glycoprotein (P-gp / ABCB1) Clearance Collision", () => {
    it("recognizes potent P-gp inhibitors and mandates 50% empiric dose reduction", () => {
      const amio = POTENT_PGP_INHIBITOR_MAP["amiodarone"];
      assert.equal(amio.digoxinDoseCutPct, 50);

      const verap = POTENT_PGP_INHIBITOR_MAP["verapamil"];
      assert.equal(verap.digoxinDoseCutPct, 50);

      const tdmWithPgp = evaluateDigoxinTdm({
        serumDigoxinNgMl: 0.8,
        hasPgpInhibitor: true,
        pgpInhibitorIds: ["amiodarone"],
      });
      assert.ok(tdmWithPgp.pgpCollisionAlert);
      assert.ok(tdmWithPgp.pgpCollisionAlert.doseAdjustmentGuidance.includes("50% EMPIRIC DIGOXIN DOSE REDUCTION"));
      assert.ok(tdmWithPgp.pgpCollisionAlert.aucImpact.includes("doubling digoxin systemic exposure"));
    });
  });

  // ==========================================================================
  // 6. DIGOXIN IMMUNE FAB (DIGIFAB) REVERSAL FORMULAS
  // ==========================================================================
  describe("Digoxin Immune Fab (DigiFab) Reversal Protocols", () => {
    it("calculates vials for known acute ingestion: (mg ingested * 0.8) / 0.5 mg/vial", () => {
      // 10 mg ingested: (10 * 0.8) / 0.5 = 16 vials
      const res10 = calculateDigiFabVials({
        scenario: "acute-known-ingestion",
        mgDigoxinIngested: 10,
      });
      assert.equal(res10.exactVialsCalculated, 16);
      assert.equal(res10.vialsToAdministerRoundedUp, 16);
      assert.equal(res10.mgDigoxinNeutralized, 8);

      // 5 mg ingested: (5 * 0.8) / 0.5 = 8 vials
      const res5 = calculateDigiFabVials({
        scenario: "acute-known-ingestion",
        mgDigoxinIngested: 5,
      });
      assert.equal(res5.exactVialsCalculated, 8);
      assert.equal(res5.vialsToAdministerRoundedUp, 8);

      // 2.5 mg ingested: (2.5 * 0.8) / 0.5 = 4 vials
      const res25 = calculateDigiFabVials({
        scenario: "acute-known-ingestion",
        mgDigoxinIngested: 2.5,
      });
      assert.equal(res25.exactVialsCalculated, 4);
      assert.equal(res25.vialsToAdministerRoundedUp, 4);
    });

    it("calculates vials for steady-state SDC: (SDC ng/mL * Weight kg) / 100", () => {
      // SDC = 4.0 ng/mL, Weight = 70 kg -> (4.0 * 70) / 100 = 2.8 vials -> round up to 3 vials
      const res4 = calculateDigiFabVials({
        scenario: "steady-state-serum-concentration",
        serumDigoxinNgMl: 4.0,
        patientWeightKg: 70,
      });
      assert.equal(res4.exactVialsCalculated, 2.8);
      assert.equal(res4.vialsToAdministerRoundedUp, 3);
      assert.equal(res4.mgDigoxinNeutralized, 1.5);

      // SDC = 5.0 ng/mL, Weight = 80 kg -> (5.0 * 80) / 100 = 4.0 vials -> 4 vials
      const res5 = calculateDigiFabVials({
        scenario: "steady-state-serum-concentration",
        serumDigoxinNgMl: 5.0,
        patientWeightKg: 80,
      });
      assert.equal(res5.exactVialsCalculated, 4.0);
      assert.equal(res5.vialsToAdministerRoundedUp, 4);

      // SDC = 3.5 ng/mL, Weight = 100 kg -> (3.5 * 100) / 100 = 3.5 vials -> round up to 4 vials
      const res35 = calculateDigiFabVials({
        scenario: "steady-state-serum-concentration",
        serumDigoxinNgMl: 3.5,
        patientWeightKg: 100,
      });
      assert.equal(res35.exactVialsCalculated, 3.5);
      assert.equal(res35.vialsToAdministerRoundedUp, 4);
    });

    it("provides empiric dosing for cardiac arrest / hemodynamic collapse (10 to 20 vials)", () => {
      const arrestRes = calculateDigiFabVials({
        scenario: "empiric-arrest-or-instability",
      });
      assert.equal(arrestRes.exactVialsCalculated, 10);
      assert.equal(arrestRes.vialsToAdministerRoundedUp, 10);
      assert.ok(arrestRes.formulaDescription.includes("10 to 20 vials IV push"));
      assert.ok(arrestRes.stoichiometricRationale.includes("cardiac arrest"));
    });
  });

  // ==========================================================================
  // 7. CRITICAL POST-FAB MONITORING TRAP & REBOUND HYPOKALEMIA
  // ==========================================================================
  describe("Post-Fab Immunoassay Trap & Rebound Hypokalemia", () => {
    it("validates post-Fab total digoxin spike explanation and uninterpretable window (1 to 2 weeks)", () => {
      const calc = calculateDigiFabVials({
        scenario: "steady-state-serum-concentration",
        serumDigoxinNgMl: 4.5,
        patientWeightKg: 75,
      });

      const trap = calc.postFabMonitoringTrap;
      assert.ok(trap.totalDigoxinSpikeExplanation.includes("CRITICAL POST-FAB IMMUNOASSAY TRAP"));
      assert.ok(trap.totalDigoxinSpikeExplanation.includes("10- to 20-fold"));
      assert.ok(trap.totalDigoxinSpikeExplanation.includes("TOTAL digoxin"));
      assert.ok(trap.uninterpretableWindowDuration.includes("1 to 2 weeks"));
      assert.ok(trap.telemetryAndEkgDirective.includes("continuous cardiac telemetry"));
    });

    it("validates rapid rebound hypokalemia warning due to Na+/K+ ATPase reactivation", () => {
      const calc = calculateDigiFabVials({
        scenario: "steady-state-serum-concentration",
        serumDigoxinNgMl: 4.0,
        patientWeightKg: 70,
      });

      const trap = calc.postFabMonitoringTrap;
      assert.ok(trap.potassiumShiftWarning.includes("RAPID REBOUND HYPOKALEMIA HAZARD"));
      assert.ok(trap.potassiumShiftWarning.includes("reactivates myocyte and skeletal muscle Na+/K+ ATPase"));
      assert.ok(trap.potassiumShiftWarning.includes("Serial serum potassium monitoring every 1–2 hours"));
    });
  });

  // ==========================================================================
  // 8. VAUGHAN-WILLIAMS CLASSIFICATION & CHANNELOPATHY MECHANISMS
  // ==========================================================================
  describe("Vaughan-Williams Classification & Proarrhythmic Mechanisms", () => {
    it("validates Class Ia profiles (Procainamide, Quinidine, Disopyramide)", () => {
      const procain = ANTIARRHYTHMIC_PROFILES["procainamide"];
      assert.equal(procain.vwClass, "Ia");
      assert.ok(procain.primaryChannelTarget.includes("Nav1.5"));
      assert.ok(procain.primaryChannelTarget.includes("IKr"));
      assert.ok(procain.ecgManifestations.includes("Widened QRS"));
      assert.ok(procain.ecgManifestations.includes("prolonged QT"));
      assert.ok(procain.clinicalPearls.some((p) => p.includes("N-acetylprocainamide (NAPA)")));

      const quin = ANTIARRHYTHMIC_PROFILES["quinidine"];
      assert.equal(quin.vwClass, "Ia");
      assert.ok(quin.clinicalPearls.some((p) => p.includes("Cinchonism")));
      assert.ok(quin.clinicalPearls.some((p) => p.includes("doubles digoxin concentrations")));

      const diso = ANTIARRHYTHMIC_PROFILES["disopyramide"];
      assert.equal(diso.vwClass, "Ia");
      assert.ok(diso.clinicalPearls.some((p) => p.includes("Hypertrophic Obstructive Cardiomyopathy")));
    });

    it("validates Class Ib profiles (Lidocaine, Mexiletine): zero QRS widening at normal rates", () => {
      const lido = ANTIARRHYTHMIC_PROFILES["lidocaine"];
      assert.equal(lido.vwClass, "Ib");
      assert.ok(lido.conductanceEffect.includes("ischemic myocardium"));
      assert.ok(lido.actionPotentialEffect.includes("Shortens Phase 3 repolarization"));
      assert.ok(lido.ecgManifestations.includes("Normal QRS duration"));
      assert.ok(lido.clinicalPearls.some((p) => p.toLowerCase().includes("ineffective in supraventricular arrhythmias")));
      assert.ok(lido.clinicalPearls.some((p) => p.includes("Neurotoxicity precedes cardiotoxicity")));

      const mex = ANTIARRHYTHMIC_PROFILES["mexiletine"];
      assert.equal(mex.vwClass, "Ib");
      assert.ok(mex.clinicalPearls.some((p) => p.includes("Long QT Syndrome Type 3")));
    });

    it("validates Class Ic profiles (Flecainide, Propafenone) & CAST trial landmark contraindication", () => {
      const flec = ANTIARRHYTHMIC_PROFILES["flecainide"];
      assert.equal(flec.vwClass, "Ic");
      assert.equal(flec.useDependencePattern, "marked-use-dependence");
      assert.ok(flec.castTrialStatus?.isCastContraindicated);
      assert.ok(flec.castTrialStatus.trialSummary.includes("LANDMARK CAST TRIAL CONTRAINDICATION"));
      assert.ok(flec.castTrialStatus.trialSummary.includes("> 2.5-fold higher rate of arrhythmic death"));
      assert.ok(flec.castTrialStatus.safeClinicalNiche.includes("STRUCTURALLY NORMAL HEARTS"));
      assert.ok(flec.clinicalPearls.some((p) => p.includes("1:1 Atrial Flutter Hazard")));

      const prop = ANTIARRHYTHMIC_PROFILES["propafenone"];
      assert.equal(prop.vwClass, "Ic");
      assert.ok(prop.castTrialStatus?.isCastContraindicated);
      assert.ok(prop.clinicalPearls.some((p) => p.includes("intrinsic beta-blocking activity")));
    });

    it("validates Class III profiles (Amiodarone, Sotalol, Dofetilide, Dronedarone)", () => {
      const amio = ANTIARRHYTHMIC_PROFILES["amiodarone"];
      assert.equal(amio.vwClass, "III");
      assert.ok(amio.clinicalPearls.some((p) => p.includes("Torsades de Pointes is exceptionally low (< 0.5–1%)")));
      assert.ok(amio.clinicalPearls.some((p) => p.includes("half-life: 40 to 60 days")));
      assert.ok(amio.clinicalPearls.some((p) => p.includes("Pulmonary fibrosis")));

      const sotalol = ANTIARRHYTHMIC_PROFILES["sotalol"];
      assert.equal(sotalol.vwClass, "III");
      assert.equal(sotalol.useDependencePattern, "reverse-use-dependence");
      assert.ok(sotalol.clinicalPearls.some((p) => p.includes("Racemic mixture")));
      assert.ok(sotalol.clinicalPearls.some((p) => p.includes("> 80% excreted unchanged in urine")));

      const dofet = ANTIARRHYTHMIC_PROFILES["dofetilide"];
      assert.equal(dofet.vwClass, "III");
      assert.ok(dofet.dofetilideRemsProfile?.isRemsRegulated);
      assert.ok(dofet.dofetilideRemsProfile.inpatientRequirement.includes(">= 3-DAY (72-HOUR) INPATIENT HOSPITALIZATION"));
      assert.ok(dofet.dofetilideRemsProfile.baselineQtcLimit.includes("<= 440 ms"));
    });
  });

  // ==========================================================================
  // 9. DESK DETECTION & REPORT GENERATION
  // ==========================================================================
  describe("Desk Tray Detection & Comprehensive Report Generator", () => {
    it("accurately detects multi-class antiarrhythmic and Digoxin combinations", () => {
      const detected = antiarrhythmicOnDesk(["flecainide", "digoxin", "amiodarone", "metoprolol", "furosemide"]);
      assert.equal(detected.hasAntiarrhythmic, true);
      assert.equal(detected.hasDigoxin, true);
      assert.equal(detected.hasClass1c, true);
      assert.equal(detected.hasClass3, true);
      assert.equal(detected.hasClass2, true);
      assert.equal(detected.hasPgpInhibitor, true);
      assert.equal(detected.hasElectrolyteDisturbanceRisk, true);
      assert.ok(detected.detectedCastContraindicatedIds.includes("flecainide"));
      assert.ok(detected.detectedPgpInhibitorIds.includes("amiodarone"));
    });

    it("generates comprehensive report with alerts for CAST contraindication and P-gp collisions", () => {
      const report = antiarrhythmicReportOnDesk(["flecainide", "digoxin", "verapamil"], DEFAULT_HOST, {
        digoxinTdm: {
          serumDigoxinNgMl: 2.2,
          indication: "hfref",
          hoursPostDose: 12,
        },
      });

      assert.equal(report.onDesk.hasAntiarrhythmic, true);
      assert.equal(report.onDesk.hasDigoxin, true);
      assert.ok(report.digoxinEvaluation);
      assert.equal(report.digoxinEvaluation.isToxic, true);

      // CAST alert
      assert.ok(report.alerts.some((a) => a.category === "CAST" && a.tier === "critical"));

      // P-gp collision alert
      assert.ok(report.alerts.some((a) => a.category === "PgpCollision" && a.tier === "critical"));

      // Digoxin toxicity alert
      assert.ok(report.alerts.some((a) => a.category === "Digoxin" && a.tier === "critical"));
    });

    it("generates Dofetilide REMS advisory with Cockcroft-Gault CrCl titration", () => {
      const report = antiarrhythmicReportOnDesk(["dofetilide"], DEFAULT_HOST, {
        measuredCrClMlMin: 50,
        baselineQtcMs: 420,
      });

      assert.ok(report.dofetilideRemsAdvisory);
      assert.equal(report.dofetilideRemsAdvisory.recommendedStartingDose, "250 mcg PO BID");
      assert.ok(report.alerts.some((a) => a.category === "DofetilideREMS"));
    });

    it("flags Dofetilide REMS baseline QTc contraindication when QTc > 440 ms", () => {
      const report = antiarrhythmicReportOnDesk(["dofetilide"], DEFAULT_HOST, {
        measuredCrClMlMin: 70,
        baselineQtcMs: 460,
      });

      assert.ok(report.alerts.some((a) => a.category === "DofetilideREMS" && a.tier === "critical" && a.title.includes("QTc Violation")));
    });
  });
});
