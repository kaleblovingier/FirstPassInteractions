import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  STATUS_EPILEPTICUS_CDS_DISCLAIMER,
  SE_CITATIONS,
  PHASE_1_BENZO_IDS,
  PHASE_2_ASM_IDS,
  PHASE_3_ANESTHETIC_IDS,
  OSMOTHERAPY_IDS,
  ALL_SE_DRUG_IDS,
  statusEpilepticusOnDesk,
  calculatePhase1Dosing,
  calculatePhase2Dosing,
  calculatePhase3Dosing,
  calculateGabaInternalization,
  calculateOsmotherapy,
  evaluateStatusEpilepticusCollisions,
  statusEpilepticusReportOnDesk,
} from "./status-epilepticus";
import { DEFAULT_HOST } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

describe("Status Epilepticus (SE) Stepped Treatment, Receptor Kinetics & Osmotherapy Engine", () => {
  // ==========================================================================
  // 1. STATUTORY REGULATORY POSTURE (FD&C Act § 520(o)(1)(E))
  // ==========================================================================
  describe("Regulatory Compliance & Non-Device CDS Posture", () => {
    it("exports statutory disclaimer explicitly citing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(STATUS_EPILEPTICUS_CDS_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(STATUS_EPILEPTICUS_CDS_DISCLAIMER.includes("Non-Device Clinical Decision Support"));
      assert.ok(STATUS_EPILEPTICUS_CDS_DISCLAIMER.includes("licensed healthcare professionals"));
      assert.ok(STATUS_EPILEPTICUS_CDS_DISCLAIMER.includes("independent clinical verification"));
      assert.ok(STATUS_EPILEPTICUS_CDS_DISCLAIMER.includes("Prescribing Information"));
    });

    it("verifies non-prescriptive educational decision support language", () => {
      assert.ok(STATUS_EPILEPTICUS_CDS_DISCLAIMER.includes("does not provide automated diagnostic conclusions"));
      assert.ok(STATUS_EPILEPTICUS_CDS_DISCLAIMER.includes("does not generate medical orders or infusion pump directives"));
      assert.ok(STATUS_EPILEPTICUS_CDS_DISCLAIMER.includes("does not replace individualized bedside clinical evaluation"));
    });

    it("report generator embeds statutory disclaimer with NOT_CLEARED and PI_FOOTER", () => {
      const report = statusEpilepticusReportOnDesk(["lorazepam", "levetiracetam"], DEFAULT_HOST);
      assert.ok(report.disclaimer.includes(STATUS_EPILEPTICUS_CDS_DISCLAIMER));
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });

    it("surfaces peer-reviewed literature citations including AES, ESETT, and RAMPART", () => {
      assert.ok(SE_CITATIONS.some((c) => c.id === "aes-guidelines-2016"));
      assert.ok(SE_CITATIONS.some((c) => c.id === "esett-trial-nejm-2019"));
      assert.ok(SE_CITATIONS.some((c) => c.id === "rampart-trial-nejm-2012"));
      assert.ok(SE_CITATIONS.some((c) => c.id === "koenig-hypertonic-saline-2008"));
    });
  });

  // ==========================================================================
  // 2. PHASE 1: EMERGENT INITIAL THERAPY (0 TO 5-20 MIN)
  // ==========================================================================
  describe("Phase 1 Emergent Benzodiazepine Dosing & Max Caps", () => {
    it("calculates IV Lorazepam at 0.1 mg/kg with strict 4.0 mg single dose cap", () => {
      // 30 kg child: 30 * 0.1 = 3.0 mg
      const eval30 = calculatePhase1Dosing(30);
      const lzp30 = eval30.firstLineRegimens.find((r) => r.drugId === "lorazepam");
      assert.ok(lzp30);
      assert.equal(lzp30.calculatedDoseMg, 3.0);
      assert.equal(lzp30.maxSingleDoseMg, 4.0);
      assert.equal(lzp30.maxCumulativeDoseMg, 8.0);

      // 50 kg adult: 50 * 0.1 = 5.0 -> capped at 4.0 mg
      const eval50 = calculatePhase1Dosing(50);
      const lzp50 = eval50.firstLineRegimens.find((r) => r.drugId === "lorazepam");
      assert.ok(lzp50);
      assert.equal(lzp50.calculatedDoseMg, 4.0);

      // 80 kg adult: capped at 4.0 mg
      const eval80 = calculatePhase1Dosing(80);
      const lzp80 = eval80.firstLineRegimens.find((r) => r.drugId === "lorazepam");
      assert.ok(lzp80);
      assert.equal(lzp80.calculatedDoseMg, 4.0);
    });

    it("calculates IM Midazolam RAMPART fixed dosing (>40 kg = 10 mg; 13-40 kg = 5 mg)", () => {
      // 70 kg (>40 kg) -> 10 mg IM
      const eval70 = calculatePhase1Dosing(70);
      const mdz70 = eval70.firstLineRegimens.find((r) => r.drugId === "midazolam");
      assert.ok(mdz70);
      assert.equal(mdz70.calculatedDoseMg, 10.0);
      assert.equal(mdz70.maxSingleDoseMg, 10.0);

      // 25 kg (13-40 kg) -> 5 mg IM
      const eval25 = calculatePhase1Dosing(25);
      const mdz25 = eval25.firstLineRegimens.find((r) => r.drugId === "midazolam");
      assert.ok(mdz25);
      assert.equal(mdz25.calculatedDoseMg, 5.0);
    });

    it("calculates Rectal Diazepam at 0.2 mg/kg with 20.0 mg cap", () => {
      const eval40 = calculatePhase1Dosing(40);
      const dzp40 = eval40.firstLineRegimens.find((r) => r.drugId === "diazepam-rectal");
      assert.ok(dzp40);
      assert.equal(dzp40.calculatedDoseMg, 8.0);

      // 120 kg -> 24.0 capped at 20.0 mg
      const eval120 = calculatePhase1Dosing(120);
      const dzp120 = eval120.firstLineRegimens.find((r) => r.drugId === "diazepam-rectal");
      assert.ok(dzp120);
      assert.equal(dzp120.calculatedDoseMg, 20.0);
    });

    it("calculates IV Diazepam at 0.2 mg/kg with 10.0 mg cap", () => {
      const eval70 = calculatePhase1Dosing(70);
      const dzpIv = eval70.firstLineRegimens.find((r) => r.drugId === "diazepam");
      assert.ok(dzpIv);
      assert.equal(dzpIv.calculatedDoseMg, 10.0);
      assert.equal(dzpIv.maxSingleDoseMg, 10.0);
    });

    it("warns about propylene glycol toxicity with lorazepam continuous infusions", () => {
      const eval70 = calculatePhase1Dosing(70);
      const lzp = eval70.firstLineRegimens.find((r) => r.drugId === "lorazepam");
      assert.ok(lzp);
      assert.ok(lzp.vehicleWarnings.some((w) => w.includes("PROPYLENE GLYCOL")));
    });

    it("defines transition trigger to Phase 2 at 20 minutes", () => {
      const eval70 = calculatePhase1Dosing(70);
      assert.ok(eval70.transitionTrigger.includes("SEIZURE PERSISTENCE ≥ 20 MINUTES"));
      assert.ok(eval70.transitionTrigger.includes("Phase 2 Established Status Epilepticus"));
    });
  });

  // ==========================================================================
  // 3. PHASE 2: ESTABLISHED SE & ESETT TRIAL COMPARATOR
  // ==========================================================================
  describe("Phase 2 ESETT Non-Inferiority ASM Dosing & Safety Rails", () => {
    it("calculates Levetiracetam at 60 mg/kg with 4,500 mg maximum cap", () => {
      // 50 kg: 50 * 60 = 3,000 mg
      const eval50 = calculatePhase2Dosing(50);
      const lev50 = eval50.comparators.find((c) => c.drugId === "levetiracetam");
      assert.ok(lev50);
      assert.equal(lev50.calculatedDoseMg, 3000);
      assert.equal(lev50.maxDoseMg, 4500);

      // 70 kg: 70 * 60 = 4,200 mg
      const eval70 = calculatePhase2Dosing(70);
      const lev70 = eval70.comparators.find((c) => c.drugId === "levetiracetam");
      assert.ok(lev70);
      assert.equal(lev70.calculatedDoseMg, 4200);

      // 85 kg: 85 * 60 = 5,100 -> capped at 4,500 mg
      const eval85 = calculatePhase2Dosing(85);
      const lev85 = eval85.comparators.find((c) => c.drugId === "levetiracetam");
      assert.ok(lev85);
      assert.equal(lev85.calculatedDoseMg, 4500);

      // Hemodynamic stability and telemetry status
      assert.equal(lev70.hemodynamicStability, "high");
      assert.equal(lev70.cardiacTelemetryRequired, false);
      assert.equal(lev70.esett60MinEfficacyPct, 47);
    });

    it("calculates Fosphenytoin at 20 mg PE/kg with 1,500 mg PE cap and 150 mg PE/min rate limit", () => {
      // 50 kg: 50 * 20 = 1,000 mg PE -> min time = ceil(1000/150) = 7 -> clamped to 10 min
      const eval50 = calculatePhase2Dosing(50);
      const fos50 = eval50.comparators.find((c) => c.drugId === "fosphenytoin");
      assert.ok(fos50);
      assert.equal(fos50.calculatedDoseMg, 1000);
      assert.equal(fos50.infusionDurationMinutes, 10);

      // 70 kg: 70 * 20 = 1,400 mg PE -> min time = ceil(1400/150) = 10 min
      const eval70 = calculatePhase2Dosing(70);
      const fos70 = eval70.comparators.find((c) => c.drugId === "fosphenytoin");
      assert.ok(fos70);
      assert.equal(fos70.calculatedDoseMg, 1400);
      assert.equal(fos70.infusionDurationMinutes, 10);

      // 90 kg: 90 * 20 = 1,800 -> capped at 1,500 mg PE
      const eval90 = calculatePhase2Dosing(90);
      const fos90 = eval90.comparators.find((c) => c.drugId === "fosphenytoin");
      assert.ok(fos90);
      assert.equal(fos90.calculatedDoseMg, 1500);
      assert.equal(fos90.maxDoseMg, 1500);
      assert.equal(fos90.infusionDurationMinutes, 10);

      // Telemetry mandatory
      assert.equal(fos70.cardiacTelemetryRequired, true);
      assert.equal(fos70.esett60MinEfficacyPct, 45);
      assert.ok(fos70.clinicalPearls.some((p) => p.includes("MANDATORY CONTINUOUS CARDIAC TELEMETRY")));
    });

    it("calculates Valproate Sodium at 40 mg/kg with 3,000 mg cap and POLG contraindication", () => {
      // 50 kg: 50 * 40 = 2,000 mg
      const eval50 = calculatePhase2Dosing(50);
      const val50 = eval50.comparators.find((c) => c.drugId === "valproate");
      assert.ok(val50);
      assert.equal(val50.calculatedDoseMg, 2000);

      // 70 kg: 70 * 40 = 2,800 mg
      const eval70 = calculatePhase2Dosing(70);
      const val70 = eval70.comparators.find((c) => c.drugId === "valproate");
      assert.ok(val70);
      assert.equal(val70.calculatedDoseMg, 2800);

      // 80 kg: 80 * 40 = 3,200 -> capped at 3,000 mg
      const eval80 = calculatePhase2Dosing(80);
      const val80 = eval80.comparators.find((c) => c.drugId === "valproate");
      assert.ok(val80);
      assert.equal(val80.calculatedDoseMg, 3000);
      assert.equal(val80.maxDoseMg, 3000);

      // POLG and mitochondrial contraindication
      assert.equal(val70.esett60MinEfficacyPct, 46);
      assert.ok(
        val70.criticalContraindications.some((c) => c.includes("POLG MUTATIONS & MITOCHONDRIAL DISORDERS")),
      );
    });

    it("surfaces ESETT trial non-inferiority summary and statistics", () => {
      const eval70 = calculatePhase2Dosing(70);
      assert.ok(eval70.esettSummary.trialName.includes("ESETT"));
      assert.ok(eval70.esettSummary.keyFinding.includes("statistical non-inferiority"));
      assert.ok(eval70.esettSummary.keyFinding.includes("47%"));
      assert.ok(eval70.esettSummary.keyFinding.includes("45%"));
      assert.ok(eval70.esettSummary.keyFinding.includes("46%"));
    });

    it("provides alternative second-line lacosamide and phenobarbital parameters", () => {
      const eval70 = calculatePhase2Dosing(70);
      assert.equal(eval70.alternativeSecondLine.lacosamide.doseMg, 400);
      assert.ok(eval70.alternativeSecondLine.lacosamide.warning.includes("PR INTERVAL PROLONGATION"));
      assert.equal(eval70.alternativeSecondLine.phenobarbital.calculatedDoseMg, 1000);
      assert.ok(eval70.alternativeSecondLine.phenobarbital.warning.includes("RESPIRATORY DEPRESSION"));
    });
  });

  // ==========================================================================
  // 4. PHASE 3: REFRACTORY STATUS EPILEPTICUS & ANESTHETIC INFUSIONS
  // ==========================================================================
  describe("Phase 3 Refractory Anesthetic Regimens & Ketamine NMDA Rationale", () => {
    it("calculates Propofol loading bolus, maintenance infusion, and PRIS threshold", () => {
      const eval70 = calculatePhase3Dosing(70);
      const prop = eval70.anesthetics.find((a) => a.drugId === "propofol");
      assert.ok(prop);
      assert.equal(prop.calculatedBolusMg, "70 - 140 mg IV bolus");
      // 70 * 0.03 * 60 = 126 mg/h, 70 * 0.1 * 60 = 420 mg/h
      assert.equal(prop.calculatedMaintenanceRateMgH, "126 - 420 mg/h");
      assert.ok(prop.safetyCeilingAlert.includes("PROPOFOL INFUSION SYNDROME (PRIS)"));
      assert.ok(prop.safetyCeilingAlert.includes("4-5 mg/kg/h"));
      assert.ok(prop.safetyCeilingAlert.includes("48 hours"));
    });

    it("calculates Midazolam continuous infusion and identifies tachyphylaxis risk", () => {
      const eval70 = calculatePhase3Dosing(70);
      const mdz = eval70.anesthetics.find((a) => a.drugId === "midazolam");
      assert.ok(mdz);
      assert.equal(mdz.calculatedBolusMg, "14 mg IV bolus (repeat q5-10m as needed)");
      // 70 * 0.05 = 3.5 mg/h, 70 * 2.0 = 140 mg/h
      assert.equal(mdz.calculatedMaintenanceRateMgH, "3.5 - 140 mg/h");
      assert.equal(mdz.tachyphylaxisRisk, "high");
      assert.ok(mdz.safetyCeilingAlert.includes("RAPID TACHYPHYLAXIS KINETICS"));
    });

    it("calculates Ketamine dosing and highlights NMDA open-channel blockade overcoming GABA-A resistance", () => {
      const eval70 = calculatePhase3Dosing(70);
      const ket = eval70.anesthetics.find((a) => a.drugId === "ketamine");
      assert.ok(ket);
      assert.equal(ket.calculatedBolusMg, "105 - 210 mg IV bolus");
      assert.equal(ket.calculatedMaintenanceRateMgH, "70 - 700 mg/h");
      assert.ok(ket.receptorMechanism.includes("Uncompetitive, open-channel NMDA receptor antagonist"));
      assert.ok(
        ket.clinicalPearls.some((p) => p.includes("CRITICAL ROLE IN GABAERGIC RESISTANCE")),
      );
      assert.ok(
        ket.clinicalPearls.some((p) => p.includes("HEMODYNAMIC ADVANTAGE")),
      );
    });

    it("calculates Pentobarbital barbiturate coma dosing", () => {
      const eval70 = calculatePhase3Dosing(70);
      const pent = eval70.anesthetics.find((a) => a.drugId === "pentobarbital");
      assert.ok(pent);
      assert.equal(pent.calculatedBolusMg, "350 mg IV bolus");
      assert.equal(pent.calculatedMaintenanceRateMgH, "70 - 350 mg/h");
      assert.ok(pent.safetyCeilingAlert.includes("SEVERE SYSTEMIC COMPLICATIONS"));
    });

    it("defines electrographic burst suppression target on continuous video-EEG", () => {
      const eval70 = calculatePhase3Dosing(70);
      assert.ok(eval70.definition.electrographicTarget.includes("burst suppression"));
      assert.ok(eval70.definition.electrographicTarget.includes("8-12 seconds"));
    });
  });

  // ==========================================================================
  // 5. PHARMACORESISTANCE & SYNAPTIC PLASTICITY KINETICS
  // ==========================================================================
  describe("GABA-A Endocytosis Time-Decay Model & Pharmacoresistance Index", () => {
    it("models baseline intact receptor status at t = 0 min", () => {
      const kinetics0 = calculateGabaInternalization(0);
      assert.equal(kinetics0.currentKinetics.timeMinutes, 0);
      assert.equal(kinetics0.currentKinetics.synapticGabaADensityPct, 100);
      assert.equal(kinetics0.currentKinetics.benzodiazepineFoldResistance, 1.0);
      assert.equal(kinetics0.currentKinetics.synapticNmdaDensityPct, 100);
      assert.equal(kinetics0.currentKinetics.pharmacoresistanceIndex, 0.0);
      assert.ok(kinetics0.currentKinetics.clinicalPhaseName.includes("Phase 1"));
    });

    it("models progressive GABA-A receptor loss and fold-resistance at t = 20-30 min", () => {
      const kinetics20 = calculateGabaInternalization(20);
      // R_gaba(20) ~ 15 + 85 * exp(-0.035 * 20) = 15 + 85 * 0.49658 = ~57.2%
      assert.ok(kinetics20.currentKinetics.synapticGabaADensityPct < 65);
      assert.ok(kinetics20.currentKinetics.synapticGabaADensityPct > 50);
      assert.ok(kinetics20.currentKinetics.benzodiazepineFoldResistance > 8.0);
      assert.ok(kinetics20.currentKinetics.synapticNmdaDensityPct > 150);

      const kinetics30 = calculateGabaInternalization(30);
      // R_gaba(30) ~ 15 + 85 * exp(-0.035 * 30) = 15 + 85 * 0.3499 = ~44.7%
      assert.ok(kinetics30.currentKinetics.synapticGabaADensityPct < 50);
      assert.ok(kinetics30.currentKinetics.benzodiazepineFoldResistance > 12.0);
      assert.ok(kinetics30.currentKinetics.synapticNmdaDensityPct > 180);
      assert.ok(kinetics30.currentKinetics.pharmacoresistanceIndex > 0.5);
    });

    it("models profound receptor depletion and ~18-20 fold resistance at t = 60 min", () => {
      const kinetics60 = calculateGabaInternalization(60);
      // R_gaba(60) ~ 15 + 85 * exp(-0.035 * 60) = 15 + 85 * 0.1224 = ~25.4%
      assert.ok(kinetics60.currentKinetics.synapticGabaADensityPct <= 30);
      assert.ok(kinetics60.currentKinetics.benzodiazepineFoldResistance >= 16.0);
      assert.ok(kinetics60.currentKinetics.synapticNmdaDensityPct >= 230);
      assert.ok(kinetics60.currentKinetics.pharmacoresistanceIndex >= 0.85);
      assert.ok(kinetics60.currentKinetics.clinicalPhaseName.includes("Phase 3"));
    });

    it("generates multi-point timeline curve for visual plotting", () => {
      const kinetics = calculateGabaInternalization(45);
      assert.ok(kinetics.timelineCurve.length >= 8);
      const t0 = kinetics.timelineCurve[0];
      const t60 = kinetics.timelineCurve.find((p) => p.timeMinutes === 60);
      assert.ok(t0 && t60);
      assert.equal(t0.synapticGabaADensityPct, 100);
      assert.ok(t60.synapticGabaADensityPct < 30);
    });

    it("provides comprehensive molecular pathophysiology explanations", () => {
      const kinetics = calculateGabaInternalization(30);
      assert.ok(kinetics.molecularPathophysiology.gabaInternalizationMechanism.includes("clathrin-coated pits"));
      assert.ok(kinetics.molecularPathophysiology.glutamateUpregulationMechanism.includes("NMDA"));
      assert.ok(kinetics.molecularPathophysiology.clinicalImplicationForKetamine.includes("Ketamine"));
    });
  });

  // ==========================================================================
  // 6. OSMOTHERAPY FOR ACUTE CEREBRAL EDEMA & ELEVATED ICP
  // ==========================================================================
  describe("Hyperosmolar Therapy: 23.4% Saline vs Mannitol 20%", () => {
    it("calculates 23.4% Hypertonic Saline 30 mL bolus with central venous line mandate", () => {
      const osmo = calculateOsmotherapy(70);
      const hts = osmo.hypertonicSaline234;
      assert.equal(hts.concentrationPercent, 23.4);
      assert.equal(hts.standardBolusVolumeMl, 30);
      assert.equal(hts.totalSodiumDeliveredMeq, 120);
      assert.equal(hts.osmolalityMOsmL, 8008);
      assert.equal(hts.sodiumContentMeqMl, 4.0);
      assert.equal(hts.routeRequirement, "CENTRAL VENOUS LINE ONLY (CVL or PICC)");
      assert.equal(hts.targetSerumSodiumRange, "145 - 155 mEq/L");
      assert.equal(hts.serumSodiumMaxCeiling, 160);
      assert.equal(hts.serumOsmolalityMaxCeiling, 320);
      assert.ok(hts.osmoticDemyelinationRisk.includes("OSMOTIC DEMYELINATION SYNDROME"));
      assert.ok(hts.acidBaseConsequence.includes("HYPERCHLOREMIC METABOLIC ACIDOSIS"));
    });

    it("calculates Mannitol 20% weight-based dosing (0.5 to 1.0 g/kg) and volume", () => {
      // 70 kg: 0.5 g/kg = 35 g (175 mL); 1.0 g/kg = 70 g (350 mL)
      const osmo70 = calculateOsmotherapy(70);
      const man70 = osmo70.mannitol20;
      assert.equal(man70.calculatedGramsLow, 35);
      assert.equal(man70.calculatedGramsHigh, 70);
      assert.equal(man70.calculatedVolumeMlLow, 175);
      assert.equal(man70.calculatedVolumeMlHigh, 350);
      assert.equal(man70.osmolalityMOsmL, 1098);
      assert.equal(man70.mandatoryFilter, "In-line 0.22-micron filter (crystallization hazard)");
      assert.equal(man70.contraindicationCeilingOsm, 320);
      assert.equal(man70.contraindicationCeilingOsmolarGap, 20);

      // 80 kg: 40 g (200 mL) to 80 g (400 mL)
      const osmo80 = calculateOsmotherapy(80);
      assert.equal(osmo80.mannitol20.calculatedGramsLow, 40);
      assert.equal(osmo80.mannitol20.calculatedGramsHigh, 80);
      assert.equal(osmo80.mannitol20.calculatedVolumeMlLow, 200);
      assert.equal(osmo80.mannitol20.calculatedVolumeMlHigh, 400);
    });

    it("details Mannitol triphasic mechanism and osmotic nephrosis renal warnings", () => {
      const osmo = calculateOsmotherapy(70);
      assert.equal(osmo.mannitol20.triphasicMechanism.length, 3);
      assert.ok(osmo.mannitol20.triphasicMechanism[0].includes("Rheologic"));
      assert.ok(osmo.mannitol20.triphasicMechanism[1].includes("Osmotic Dehydration"));
      assert.ok(osmo.mannitol20.triphasicMechanism[2].includes("Diuresis"));
      assert.ok(osmo.mannitol20.renalSafetyWarnings.some((w) => w.includes("OSMOTIC NEPHROSIS")));
    });

    it("provides comparative matrix between hypertonic saline and mannitol", () => {
      const osmo = calculateOsmotherapy(70);
      assert.ok(osmo.comparativeMatrix.onsetOfIcpReduction.includes("23.4% Saline"));
      assert.ok(osmo.comparativeMatrix.hemodynamicImpact.includes("MAP/CPP"));
    });
  });

  // ==========================================================================
  // 7. DESK TRAY DETECTION & COLLISION ALERTS
  // ==========================================================================
  describe("Desk Tray Detection & Safety Collisions", () => {
    it("accurately detects Phase 1 benzodiazepines", () => {
      const det = statusEpilepticusOnDesk(["lorazepam", "aspirin"]);
      assert.equal(det.hasStatusEpilepticusAgent, true);
      assert.equal(det.hasPhase1Benzodiazepine, true);
      assert.equal(det.hasPhase2Asm, false);
      assert.equal(det.activePhaseSummary, "Phase 1: Emergent Initial");
    });

    it("accurately detects Phase 2 ASMs", () => {
      const det = statusEpilepticusOnDesk(["levetiracetam", "fosphenytoin"]);
      assert.equal(det.hasStatusEpilepticusAgent, true);
      assert.equal(det.hasPhase2Asm, true);
      assert.equal(det.hasPhase1Benzodiazepine, false);
      assert.equal(det.activePhaseSummary, "Phase 2: Established");
    });

    it("accurately detects Phase 3 anesthetics and triggers PRIS alert for propofol", () => {
      const det = statusEpilepticusOnDesk(["propofol", "ketamine"]);
      assert.equal(det.hasStatusEpilepticusAgent, true);
      assert.equal(det.hasPhase3Anesthetic, true);

      const collisions = evaluateStatusEpilepticusCollisions(["propofol"], 50);
      assert.ok(collisions.some((c) => c.id === "pris-mitochondrial-uncoupling"));
    });

    it("triggers Fosphenytoin cardiac rate ceiling and telemetry collision alert", () => {
      const collisions = evaluateStatusEpilepticusCollisions(["fosphenytoin"], 30);
      const fosCol = collisions.find((c) => c.id === "fosphenytoin-cardiac-rate-limit");
      assert.ok(fosCol);
      assert.equal(fosCol.severity, "critical");
      assert.ok(fosCol.managementGuidance.includes("150 mg PE/min"));
    });

    it("triggers Valproate POLG and mitochondrial collision alert", () => {
      const collisions = evaluateStatusEpilepticusCollisions(["valproate"], 30);
      const valCol = collisions.find((c) => c.id === "valproate-polg-mitochondrial-warning");
      assert.ok(valCol);
      assert.equal(valCol.severity, "critical");
      assert.ok(valCol.mechanism.includes("POLG"));
    });

    it("triggers 23.4% Saline central line mandate alert", () => {
      const collisions = evaluateStatusEpilepticusCollisions(["hypertonic-saline"], 30);
      const htsCol = collisions.find((c) => c.id === "hypertonic-saline-central-line-requirement");
      assert.ok(htsCol);
      assert.equal(htsCol.severity, "critical");
      assert.ok(htsCol.managementGuidance.includes("central venous catheter"));
    });

    it("triggers Mannitol in-line filter mandate and osmolality limit alert", () => {
      const collisions = evaluateStatusEpilepticusCollisions(["mannitol"], 30);
      const manCol = collisions.find((c) => c.id === "mannitol-crystallization-and-renal-ceiling");
      assert.ok(manCol);
      assert.ok(manCol.managementGuidance.includes("0.22-micron filter"));
    });

    it("identifies multi-phase regimens on desk", () => {
      const det = statusEpilepticusOnDesk(["midazolam", "valproate", "ketamine", "mannitol"]);
      assert.equal(det.hasStatusEpilepticusAgent, true);
      assert.equal(det.hasPhase1Benzodiazepine, true);
      assert.equal(det.hasPhase2Asm, true);
      assert.equal(det.hasPhase3Anesthetic, true);
      assert.equal(det.hasOsmotherapy, true);
      assert.equal(det.activePhaseSummary, "Multi-Phase Regimen");
    });
  });

  // ==========================================================================
  // 8. END-TO-END CLINICAL REPORT GENERATOR
  // ==========================================================================
  describe("End-to-End Clinical Report Generator", () => {
    it("generates comprehensive report with custom weight and host context", () => {
      const report = statusEpilepticusReportOnDesk(["lorazepam", "levetiracetam", "mannitol"], DEFAULT_HOST, {
        weightKg: 80,
        seizureDurationMinutes: 25,
      });

      assert.equal(report.patientWeightKg, 80);
      assert.equal(report.seizureDurationMinutes, 25);
      assert.ok(report.phase1.firstLineRegimens.length > 0);
      assert.ok(report.phase2.comparators.length > 0);
      assert.ok(report.phase3.anesthetics.length > 0);
      assert.ok(report.receptorKinetics.timelineCurve.length > 0);
      assert.ok(report.osmotherapy.hypertonicSaline234);
      assert.ok(report.clinicalPearls.length >= 5);
      assert.ok(report.citations.length >= 5);
      assert.ok(report.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
    });

    it("adds geriatric pharmacodynamic pearl when host is geriatric", () => {
      const geriatricHost = { ...DEFAULT_HOST, age: "geriatric" as const };
      const report = statusEpilepticusReportOnDesk(["lorazepam"], geriatricHost);
      assert.ok(
        report.clinicalPearls.some((p) => p.includes("Geriatric Pharmacodynamics")),
      );
    });

    it("returns clean baseline report when non-SE drugs are on desk", () => {
      const report = statusEpilepticusReportOnDesk(["atorvastatin", "metformin"], DEFAULT_HOST);
      assert.equal(report.onDesk.hasStatusEpilepticusAgent, false);
      assert.equal(report.onDesk.activePhaseSummary, "None");
      assert.equal(report.activeCollisions.length, 0);
      assert.ok(report.phase1);
      assert.ok(report.phase2);
      assert.ok(report.phase3);
    });
  });
});
