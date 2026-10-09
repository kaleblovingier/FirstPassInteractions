import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OBSTETRIC_CDS_DISCLAIMER,
  OBSTETRIC_REGULATORY_NOTICE,
  calculateMaternalPkAdaptations,
  calculatePregnancyProteinBindingCorrection,
  mgDlToMeqL,
  mgDlToMmolL,
  meqLToMgDl,
  mmolLToMgDl,
  ZUSPAN_REGIMEN,
  PRITCHARD_REGIMEN,
  evaluateMagnesiumSulfate,
  evaluateAcuteSevereHypertension,
  evaluatePphUterotonicCascade,
  EMBRYOLOGICAL_PHASES,
  getEmbryologicalPhase,
  CANONICAL_TERATOGENS,
  evaluateTeratogenRisk,
  obstetricOnDesk,
  obstetricReportOnDesk,
  CANONICAL_OBSTETRIC_CITATIONS,
} from "./obstetric-kinetics";
import { DEFAULT_HOST, type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

describe("Obstetric Kinetics, Maternal Resuscitation & Perinatal Pharmacotherapy Engine", () => {
  // ==========================================================================
  // 1. STATUTORY NON-DEVICE CDS CONFORMANCE (FD&C Act § 520(o)(1)(E))
  // ==========================================================================
  describe("Regulatory Posture & Non-Device CDS Conformance", () => {
    it("exports statutory disclaimer explicitly referencing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(OBSTETRIC_CDS_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(OBSTETRIC_CDS_DISCLAIMER.includes("Non-Device Clinical Decision Support"));
      assert.ok(OBSTETRIC_CDS_DISCLAIMER.includes("licensed healthcare professionals"));
      assert.ok(OBSTETRIC_CDS_DISCLAIMER.includes("Maternal-Fetal Medicine"));
      assert.ok(OBSTETRIC_CDS_DISCLAIMER.includes("independent clinical review"));
    });

    it("verifies disclaimer emphasizes strictly non-prescriptive posture", () => {
      assert.ok(OBSTETRIC_CDS_DISCLAIMER.includes("STRICTLY NON-PRESCRIPTIVE"));
      assert.ok(OBSTETRIC_CDS_DISCLAIMER.includes("Does not generate patient-specific medical orders"));
      assert.ok(OBSTETRIC_CDS_DISCLAIMER.includes("closed-loop infusion pump controls"));
      assert.ok(OBSTETRIC_CDS_DISCLAIMER.includes("Prescribing Information"));
    });

    it("embeds NOT_CLEARED and PI_FOOTER in the unified regulatory notice", () => {
      assert.ok(OBSTETRIC_REGULATORY_NOTICE.includes(NOT_CLEARED));
      assert.ok(OBSTETRIC_REGULATORY_NOTICE.includes(PI_FOOTER));
    });

    it("includes canonical peer-reviewed citations (ACOG, Magpie, Zuspan, Pritchard)", () => {
      const titles = CANONICAL_OBSTETRIC_CITATIONS.map((c) => c.title).join(" ");
      assert.ok(titles.includes("Practice Bulletin No. 222"));
      assert.ok(titles.includes("Committee Opinion No. 767"));
      assert.ok(titles.includes("Practice Bulletin No. 183"));
      assert.ok(titles.includes("Magpie Trial"));
      assert.ok(titles.includes("Parkland Memorial Hospital protocol for treatment of eclampsia"));
      assert.ok(titles.includes("Physiologic and pharmacokinetic changes in pregnancy"));
    });
  });

  // ==========================================================================
  // 2. PILLAR 1: MATERNAL GESTATIONAL PHARMACOKINETICS
  // ==========================================================================
  describe("Maternal Gestational PK Adaptations", () => {
    it("models plasma volume expansion (+40-50% at 32 weeks) and hydrophilic Vd expansion", () => {
      const pk32w = calculateMaternalPkAdaptations(32);
      assert.strictEqual(pk32w.trimester, "third");
      assert.ok(pk32w.plasmaVolumeExpansionPct >= 40 && pk32w.plasmaVolumeExpansionPct <= 50);
      assert.ok(pk32w.plasmaVolumeDeltaMl >= 1000);
      assert.ok(pk32w.hydrophilicVdMultiplier > 1.3);
      assert.ok(pk32w.hydrophilicCmaxReductionPct >= 20);
    });

    it("models renal hyperfiltration (+50% GFR surge) and lower baseline serum creatinine", () => {
      const pk32w = calculateMaternalPkAdaptations(32);
      assert.ok(pk32w.gfrIncreasePct >= 40);
      assert.strictEqual(pk32w.expectedCreatinineRangeMgDl.min, 0.4);
      assert.strictEqual(pk32w.expectedCreatinineRangeMgDl.max, 0.7);
      assert.ok(pk32w.renalClearanceMultiplier >= 1.4);
    });

    it("models dilutional hypoalbuminemia (~1.0 g/dL drop) and protein binding correction", () => {
      const pk32w = calculateMaternalPkAdaptations(32);
      assert.ok(pk32w.dilutionalAlbuminDropGDl >= 0.8 && pk32w.dilutionalAlbuminDropGDl <= 1.2);
      assert.ok(pk32w.expectedAlbuminGDl <= 3.5);

      const correction = calculatePregnancyProteinBindingCorrection({
        measuredTotalLevel: 8.0,
        albuminGDl: 3.1,
        drug: "phenytoin",
      });
      assert.strictEqual(correction.drugName, "Phenytoin");
      assert.ok(correction.correctedTotalLevel > 8.0);
      assert.ok(correction.estimatedPregnancyFreeFraction > correction.estimatedFreeFractionBaseline);
      assert.ok(correction.interpretation.includes("diluted by hypoalbuminemia"));
    });

    it("quantifies hepatic CYP and UGT induction/repression shifts", () => {
      const pk = calculateMaternalPkAdaptations(28);
      assert.strictEqual(pk.cypShifts.cyp3a4.direction, "induced");
      assert.strictEqual(pk.cypShifts.cyp2d6.direction, "induced");
      assert.strictEqual(pk.cypShifts.cyp2c9.direction, "induced");
      assert.strictEqual(pk.cypShifts.ugt1a4_2b7.direction, "induced");
      assert.strictEqual(pk.cypShifts.cyp1a2.direction, "repressed");

      assert.ok(pk.cypShifts.ugt1a4_2b7.affectedDrugs.some((d) => d.includes("Lamotrigine")));
      assert.ok(pk.cypShifts.cyp1a2.affectedDrugs.includes("Caffeine") || pk.cypShifts.cyp1a2.affectedDrugs.includes("Theophylline"));
    });
  });

  // ==========================================================================
  // 3. PILLAR 2: MAGNESIUM SULFATE NEUROPROTECTION & TOXICITY RAILS
  // ==========================================================================
  describe("Magnesium Sulfate Neuroprotection & Toxicity Safeguards", () => {
    it("converts units accurately between mg/dL, mmol/L, and mEq/L", () => {
      // 4.8 mg/dL is ~2.0 mmol/L and ~4.0 mEq/L
      const mmol = mgDlToMmolL(4.8);
      const meq = mgDlToMeqL(4.8);
      assert.ok(Math.abs(mmol - 1.97) < 0.1);
      assert.ok(Math.abs(meq - 3.95) < 0.2);

      const backMgFromMeq = meqLToMgDl(4.0);
      assert.ok(Math.abs(backMgFromMeq - 4.9) < 0.2);

      const backMgFromMmol = mmolLToMgDl(2.0);
      assert.ok(Math.abs(backMgFromMmol - 4.9) < 0.2);
    });

    it("documents Zuspan IV and Pritchard IM standard regimens", () => {
      assert.strictEqual(ZUSPAN_REGIMEN.regimenName, "Zuspan (IV)");
      assert.ok(ZUSPAN_REGIMEN.loadingDoseDescription.includes("4 to 6 g IV"));
      assert.ok(ZUSPAN_REGIMEN.maintenanceDoseDescription.includes("1 to 2 g/h"));

      assert.strictEqual(PRITCHARD_REGIMEN.regimenName, "Pritchard (IM)");
      assert.ok(PRITCHARD_REGIMEN.loadingDoseDescription.includes("4 g IV"));
      assert.ok(PRITCHARD_REGIMEN.loadingDoseDescription.includes("10 g deep IM"));
    });

    it("evaluates therapeutic window (4.8 to 8.4 mg/dL)", () => {
      const evalTherapeutic = evaluateMagnesiumSulfate({ serumMagnesiumMgDl: 6.0 });
      assert.strictEqual(evalTherapeutic.tier, "therapeutic");
      assert.strictEqual(evalTherapeutic.antidoteRequired, false);
      assert.ok(evalTherapeutic.clinicalFindingsExpected.some((f) => f.includes("Intact patellar deep tendon reflexes")));
    });

    it("evaluates subtherapeutic levels (< 4.8 mg/dL)", () => {
      const evalSub = evaluateMagnesiumSulfate({ serumMagnesiumMgDl: 3.5 });
      assert.strictEqual(evalSub.tier, "subtherapeutic");
      assert.strictEqual(evalSub.antidoteRequired, false);
      assert.ok(evalSub.clinicalFindingsExpected.some((f) => f.includes("vulnerable to eclamptic convulsions")));
    });

    it("detects loss of patellar reflexes milestone (9.0 to 12.0 mg/dL)", () => {
      const evalReflexes = evaluateMagnesiumSulfate({ serumMagnesiumMgDl: 10.5 });
      assert.strictEqual(evalReflexes.tier, "loss_of_reflexes");
      assert.ok(evalReflexes.tierLabel.includes("Loss of Deep Tendon Patellar Reflexes"));
      assert.ok(evalReflexes.antidoteProtocol !== undefined);
      assert.ok(evalReflexes.clinicalFindingsExpected.some((f) => f.includes("Loss of patellar deep tendon reflexes")));
    });

    it("detects respiratory depression milestone (12.0 to 15.0 mg/dL) requiring emergency antidote", () => {
      const evalResp = evaluateMagnesiumSulfate({ serumMagnesiumMgDl: 13.5 });
      assert.strictEqual(evalResp.tier, "respiratory_depression");
      assert.strictEqual(evalResp.antidoteRequired, true);
      assert.strictEqual(evalResp.antidoteProtocol?.agent, "Calcium Gluconate 10% Solution");
      assert.strictEqual(evalResp.antidoteProtocol?.dose, "1 g (10 mL of 10% solution)");
      assert.strictEqual(evalResp.antidoteProtocol?.rate, "Over 3 to 5 minutes");
      assert.ok(evalResp.antidoteProtocol?.mechanism.includes("competitively antagonizes magnesium"));
    });

    it("detects cardiac conduction block and asystole milestone (> 15.0 mg/dL)", () => {
      const evalCardiac = evaluateMagnesiumSulfate({ serumMagnesiumMgDl: 18.0 });
      assert.strictEqual(evalCardiac.tier, "conduction_block_or_arrest");
      assert.strictEqual(evalCardiac.antidoteRequired, true);
      assert.ok(evalCardiac.clinicalFindingsExpected.some((f) => f.includes("cardiac arrest") || f.includes("asystole")));
    });

    it("flags renal failure accumulation trap when Cr >= 1.2 mg/dL or urine output < 30 mL/h", () => {
      const renalTrap = evaluateMagnesiumSulfate({
        serumMagnesiumMgDl: 6.2,
        serumCreatinineMgDl: 1.4,
        urineOutputMlHr: 20,
      });
      assert.strictEqual(renalTrap.renalAccumulationWarning, true);
      assert.ok(renalTrap.renalTrapDetails?.hazardHeadline.includes("Renal Failure Magnesium Accumulation Trap"));
      assert.ok(renalTrap.renalTrapDetails?.actionRequired.includes("reduce maintenance rate to 1.0 g/h or hold"));
      assert.ok(renalTrap.renalTrapDetails?.monitoringFrequency.includes("serial stat serum magnesium levels every 2 to 4 hours"));
    });
  });

  // ==========================================================================
  // 4. PILLAR 3: ACUTE SEVERE MATERNAL HYPERTENSION (BP >= 160/110 mmHg)
  // ==========================================================================
  describe("Acute Severe Maternal Hypertension Pharmacotherapy", () => {
    it("identifies acute severe hypertension threshold (BP >= 160/110 mmHg)", () => {
      const severe = evaluateAcuteSevereHypertension({ systolicBp: 172, diastolicBp: 114 });
      assert.strictEqual(severe.isSevereHypertension, true);
      assert.ok(severe.activeAlerts.some((a) => a.includes("ACUTE SEVERE MATERNAL HYPERTENSION DETECTED")));
      assert.ok(severe.targetBloodPressure.includes("140-150 mmHg"));
    });

    it("verifies IV Labetalol contraindications in maternal asthma and severe bradycardia", () => {
      const asthmaEval = evaluateAcuteSevereHypertension({
        systolicBp: 168,
        diastolicBp: 112,
        hasAsthma: true,
      });
      assert.strictEqual(asthmaEval.firstLineAgents.labetalol.isSuitableForCase, false);
      assert.ok(asthmaEval.firstLineAgents.labetalol.suitabilityRationale.includes("CONTRAINDICATED: Maternal asthma"));

      const bradyEval = evaluateAcuteSevereHypertension({
        systolicBp: 168,
        diastolicBp: 112,
        heartRateBpm: 52,
      });
      assert.strictEqual(bradyEval.firstLineAgents.labetalol.isSuitableForCase, false);
      assert.ok(bradyEval.firstLineAgents.labetalol.suitabilityRationale.includes("CONTRAINDICATED: Baseline maternal bradycardia"));
    });

    it("surfaces IV Hydralazine delayed peak onset (15-20 min) and reflex tachycardia warnings", () => {
      const evalHydralazine = evaluateAcuteSevereHypertension({
        systolicBp: 170,
        diastolicBp: 110,
        heartRateBpm: 118,
      });
      const hydralazine = evalHydralazine.firstLineAgents.hydralazine;
      assert.ok(hydralazine.peakMinutes.includes("15 to 20 minutes"));
      assert.ok(hydralazine.boxedWarningsOrCautions.some((w) => w.includes("DELAYED ONSET TRAP")));
      assert.ok(hydralazine.boxedWarningsOrCautions.some((w) => w.includes("REFLEX TACHYCARDIA")));
      assert.ok(hydralazine.boxedWarningsOrCautions.some((w) => w.includes("FETAL COMPROMISE")));
    });

    it("enforces Oral Nifedipine IR swallow whole rail (NEVER sublingual) and magnesium synergy alert", () => {
      const evalNif = evaluateAcuteSevereHypertension({
        systolicBp: 165,
        diastolicBp: 115,
        isReceivingMagnesium: true,
      });
      const nifedipine = evalNif.firstLineAgents.nifedipine_ir;
      assert.ok(nifedipine.boxedWarningsOrCautions.some((w) => w.includes("SWALLOW WHOLE")));
      assert.ok(nifedipine.boxedWarningsOrCautions.some((w) => w.includes("NEVER BITE, CHEW, PUNCTURE, OR ADMINISTER SUBLINGUALLY")));
      assert.ok(nifedipine.boxedWarningsOrCautions.some((w) => w.includes("MAGNESIUM SULFATE SYNERGY")));
      assert.ok(evalNif.activeAlerts.some((a) => a.includes("Concomitant Magnesium Sulfate")));
    });
  });

  // ==========================================================================
  // 5. PILLAR 4: POSTPARTUM HEMORRHAGE (PPH) STEPPED UTEROTONIC CASCADE
  // ==========================================================================
  describe("Postpartum Hemorrhage Uterotonic Stepped Cascade", () => {
    it("orders stepped cascade correctly (Oxytocin -> Methergine -> Carboprost -> Misoprostol)", () => {
      const cascade = evaluatePphUterotonicCascade();
      assert.strictEqual(cascade.steppedSequence.length, 4);
      assert.strictEqual(cascade.steppedSequence[0].agentName, "Oxytocin");
      assert.strictEqual(cascade.steppedSequence[1].agentName, "Methylergonovine");
      assert.strictEqual(cascade.steppedSequence[2].agentName, "Carboprost Tromethamine (15-Methyl PGF2α)");
      assert.strictEqual(cascade.steppedSequence[3].agentName, "Misoprostol");
    });

    it("enforces Methylergonovine ABSOLUTE CONTRAINDICATION in maternal hypertension", () => {
      const cascadeHt = evaluatePphUterotonicCascade({ hasMaternalHypertension: true });
      assert.strictEqual(cascadeHt.steps.step2_methergine.isContraindicated, true);
      assert.ok(cascadeHt.steps.step2_methergine.contraindicationReason?.includes("ABSOLUTE CONTRAINDICATION: Maternal hypertension"));
      assert.strictEqual(cascadeHt.criticalSafetyBadges.methergineHypertensionAlert, true);
      assert.ok(cascadeHt.steps.step2_methergine.keySafetyAlerts.some((a) => a.includes("ABSOLUTE CONTRAINDICATION IN HYPERTENSION")));
    });

    it("enforces Carboprost (Hemabate) ABSOLUTE CONTRAINDICATION in maternal asthma", () => {
      const cascadeAsthma = evaluatePphUterotonicCascade({ hasMaternalAsthma: true });
      assert.strictEqual(cascadeAsthma.steps.step3_carboprost.isContraindicated, true);
      assert.ok(cascadeAsthma.steps.step3_carboprost.contraindicationReason?.includes("ABSOLUTE CONTRAINDICATION: Maternal asthma"));
      assert.strictEqual(cascadeAsthma.criticalSafetyBadges.carboprostAsthmaAlert, true);
      assert.ok(cascadeAsthma.steps.step3_carboprost.adverseReactions.some((r) => r.includes("Profuse secretory diarrhea")));
    });

    it("highlights Oxytocin rapid push hypotension and prolonged infusion hyponatremia hazards", () => {
      const cascade = evaluatePphUterotonicCascade({ hasFluidOverloadOrProlongedInfusion: true });
      const oxy = cascade.steps.step1_oxytocin;
      assert.ok(oxy.keySafetyAlerts.some((a) => a.includes("NEVER ADMINISTER RAPID UNDILUTED IV PUSH")));
      assert.ok(oxy.keySafetyAlerts.some((a) => a.includes("HIGH-DOSE PROLONGED INFUSION HYPONATREMIA TRAP")));
      assert.strictEqual(cascade.criticalSafetyBadges.oxytocinHyponatremiaAlert, true);
    });

    it("confirms Misoprostol safety in asthma/HTN and highlights hyperthermia/rigors reactions", () => {
      const cascadeBoth = evaluatePphUterotonicCascade({
        hasMaternalHypertension: true,
        hasMaternalAsthma: true,
      });
      assert.strictEqual(cascadeBoth.steps.step2_methergine.isContraindicated, true);
      assert.strictEqual(cascadeBoth.steps.step3_carboprost.isContraindicated, true);
      assert.strictEqual(cascadeBoth.steps.step4_misoprostol.isContraindicated, false);
      assert.ok(cascadeBoth.steps.step4_misoprostol.keySafetyAlerts.some((a) => a.includes("SAFE IN ASTHMA & HYPERTENSION")));
      assert.ok(cascadeBoth.steps.step4_misoprostol.keySafetyAlerts.some((a) => a.includes("SEVERE HYPERTHERMIA & RIGORS")));
    });
  });

  // ==========================================================================
  // 6. PILLAR 5: CRITICAL EMBRYOLOGICAL WINDOWS & CANONICAL TERATOGENS
  // ==========================================================================
  describe("Embryological Timing Windows & Canonical Teratogens", () => {
    it("maps gestational age to correct embryological phase", () => {
      assert.strictEqual(getEmbryologicalPhase(3).id, "pre_implantation");
      assert.strictEqual(getEmbryologicalPhase(3).primaryRiskType, "All-or-None");

      assert.strictEqual(getEmbryologicalPhase(7).id, "organogenesis");
      assert.strictEqual(getEmbryologicalPhase(7).primaryRiskType, "Major Structural Malformations");

      assert.strictEqual(getEmbryologicalPhase(24).id, "fetal_period");
      assert.strictEqual(getEmbryologicalPhase(24).primaryRiskType, "Functional Deficits & Fetopathy");
    });

    it("models ACE inhibitors/ARBs 2nd/3rd trimester fetopathy (Potter sequence)", () => {
      const ace = CANONICAL_TERATOGENS.ace_inhibitors_arbs;
      assert.strictEqual(ace.severityTier, "contraindicated_late_fetopathy");
      assert.ok(ace.molecularBiochemicalMechanism.includes("AT1 receptors"));
      assert.ok(ace.characteristicPhenotypeSignature.some((s) => s.includes("Potter Sequence")));
      assert.ok(ace.characteristicPhenotypeSignature.some((s) => s.includes("Pulmonary hypoplasia")));
      assert.ok(ace.characteristicPhenotypeSignature.some((s) => s.includes("renal tubular dysgenesis")));
    });

    it("models Isotretinoin neural crest disruption and conotruncal/craniofacial defects", () => {
      const iso = CANONICAL_TERATOGENS.isotretinoin;
      assert.strictEqual(iso.severityTier, "high_risk_major_teratogen");
      assert.ok(iso.molecularBiochemicalMechanism.includes("RAR/RXR"));
      assert.ok(iso.characteristicPhenotypeSignature.some((s) => s.includes("microtia")));
      assert.ok(iso.characteristicPhenotypeSignature.some((s) => s.includes("Conotruncal cardiovascular defects")));
    });

    it("models Valproic acid HDAC inhibition and neural tube defect risk", () => {
      const valp = CANONICAL_TERATOGENS.valproic_acid;
      assert.ok(valp.molecularBiochemicalMechanism.includes("histone deacetylases (HDAC)"));
      assert.ok(valp.characteristicPhenotypeSignature.some((s) => s.includes("spina bifida")));
      assert.ok(valp.characteristicPhenotypeSignature.some((s) => s.includes("reduction in childhood IQ")));
    });

    it("models Warfarin VKORC1 inhibition and mandatory pre-6-week LMWH switch", () => {
      const warf = CANONICAL_TERATOGENS.warfarin;
      assert.ok(warf.molecularBiochemicalMechanism.includes("VKORC1"));
      assert.ok(warf.characteristicPhenotypeSignature.some((s) => s.includes("nasal hypoplasia")));
      assert.ok(warf.characteristicPhenotypeSignature.some((s) => s.includes("Stippled epiphyses")));
      assert.ok(warf.clinicalManagementRail.includes("BEFORE 6 weeks gestation"));
    });

    it("models Methotrexate DHFR inhibition and Aminopterin/Methotrexate syndrome", () => {
      const mtx = CANONICAL_TERATOGENS.methotrexate;
      assert.ok(mtx.molecularBiochemicalMechanism.includes("dihydrofolate reductase (DHFR)"));
      assert.ok(mtx.characteristicPhenotypeSignature.some((s) => s.includes("craniosynostosis")));
    });

    it("models Thalidomide Cereblon/SALL4 degradation and phocomelia limb reduction", () => {
      const thal = CANONICAL_TERATOGENS.thalidomide;
      assert.ok(thal.molecularBiochemicalMechanism.includes("cereblon (CRBN)"));
      assert.ok(thal.molecularBiochemicalMechanism.includes("SALL4"));
      assert.ok(thal.characteristicPhenotypeSignature.some((s) => s.includes("Phocomelia")));
    });

    it("accurately evaluates teratogen risks on desk with dynamic window matching", () => {
      const drugList = ["lisinopril", "isotretinoin", "methotrexate"];
      const eval7w = evaluateTeratogenRisk(drugList, 7);

      assert.strictEqual(eval7w.gestationalAgeWeeks, 7);
      assert.strictEqual(eval7w.currentPhase.id, "organogenesis");
      assert.strictEqual(eval7w.hasHighRiskTeratogen, true);

      const isoFinding = eval7w.findings.find((f) => f.matchedCompound.id === "isotretinoin");
      assert.ok(isoFinding);
      assert.strictEqual(isoFinding?.isCurrentlyInVulnerabilityWindow, true);

      const aceFinding = eval7w.findings.find((f) => f.matchedCompound.id === "ace_inhibitors_arbs");
      assert.ok(aceFinding);
      // At 7w GA, ACE inhibitor peak vulnerability (weeks 13-40) is in future trimester
      assert.strictEqual(aceFinding?.isCurrentlyInVulnerabilityWindow, false);

      // Advance to 20w GA: ACE inhibitor window now active
      const eval20w = evaluateTeratogenRisk(drugList, 20);
      const ace20 = eval20w.findings.find((f) => f.matchedCompound.id === "ace_inhibitors_arbs");
      assert.strictEqual(ace20?.isCurrentlyInVulnerabilityWindow, true);
    });
  });

  // ==========================================================================
  // 7. DESK TRAY DETECTION & END-TO-END REPORT GENERATION
  // ==========================================================================
  describe("Desk Tray Detection & End-to-End Report Generation", () => {
    it("detects magnesium, antihypertensives, uterotonics, teratogens, and PK-altered drugs", () => {
      const tray = [
        "magnesium sulfate",
        "labetalol",
        "oxytocin",
        "methergine",
        "lisinopril",
        "ampicillin",
        "acetaminophen",
      ];
      const result = obstetricOnDesk(tray);

      assert.strictEqual(result.hasObstetricDrug, true);
      assert.strictEqual(result.hasMagnesium, true);
      assert.strictEqual(result.hasAntihypertensives, true);
      assert.strictEqual(result.hasUterotonics, true);
      assert.strictEqual(result.hasTeratogens, true);
      assert.strictEqual(result.hasPregnancyPkAlteredDrugs, true);

      assert.ok(result.detectedMagnesiumIds.includes("magnesium sulfate"));
      assert.ok(result.detectedAntihypertensiveIds.includes("labetalol"));
      assert.ok(result.detectedUterotonicIds.includes("oxytocin"));
      assert.ok(result.detectedUterotonicIds.includes("methergine"));
      assert.ok(result.detectedTeratogenIds.includes("lisinopril"));
      assert.ok(result.detectedPkAlteredIds.includes("ampicillin"));
    });

    it("generates comprehensive report with active alerts for severe hypertension and contraindicated methergine", () => {
      const host: HostContext = {
        ...DEFAULT_HOST,
        preg: "pregnant",
        kidney: "ckd",
      };

      const report = obstetricReportOnDesk(
        ["magnesium sulfate", "labetalol", "methergine"],
        host,
        {
          gestationalAgeWeeks: 34,
          systolicBp: 168,
          diastolicBp: 112,
          serumMagnesiumMgDl: 12.8,
          urineOutputMlHr: 22,
          serumCreatinineMgDl: 1.5,
          hasMaternalHypertension: true,
          hasMaternalAsthma: false,
        },
      );

      assert.strictEqual(report.onDesk.hasMagnesium, true);
      assert.strictEqual(report.onDesk.hasAntihypertensives, true);
      assert.strictEqual(report.onDesk.hasUterotonics, true);

      // Magnesium toxicity check
      assert.strictEqual(report.magnesiumSulfate.tier, "respiratory_depression");
      assert.strictEqual(report.magnesiumSulfate.antidoteRequired, true);
      assert.strictEqual(report.magnesiumSulfate.renalAccumulationWarning, true);

      // Severe HTN check
      assert.strictEqual(report.acuteHypertension.isSevereHypertension, true);

      // Methergine contraindication in HTN
      assert.strictEqual(report.pphUterotonics.steps.step2_methergine.isContraindicated, true);

      // Active alerts count
      assert.ok(report.activeAlerts.length >= 3);
      assert.ok(report.activeAlerts.some((a) => a.includes("CRITICAL MAGNESIUM TOXICITY")));
      assert.ok(report.activeAlerts.some((a) => a.includes("RENAL FAILURE MAGNESIUM ACCUMULATION TRAP")));
      assert.ok(report.activeAlerts.some((a) => a.includes("ACUTE SEVERE HYPERTENSION")));
      assert.ok(report.activeAlerts.some((a) => a.includes("Methylergonovine on desk in a patient with maternal hypertension")));

      // Regulatory disclaimer attached
      assert.ok(report.regulatoryDisclaimer.includes("FD&C Act § 520(o)(1)(E)"));
    });

    it("generates clean baseline report for tray with no obstetric drugs", () => {
      const report = obstetricReportOnDesk(["atorvastatin", "metformin"], DEFAULT_HOST, {
        gestationalAgeWeeks: 20,
        systolicBp: 120,
        diastolicBp: 75,
      });

      assert.strictEqual(report.onDesk.hasObstetricDrug, false);
      assert.strictEqual(report.magnesiumSulfate.antidoteRequired, false);
      assert.strictEqual(report.acuteHypertension.isSevereHypertension, false);
      assert.strictEqual(report.teratogenEvaluation.findings.length, 0);
    });
  });
});
