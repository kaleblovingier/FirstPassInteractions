import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOST } from "./types";
import {
  NEUROPSYCH_KINETICS_REGULATORY_DISCLAIMER,
  NEUROPSYCH_CITATIONS,
  evaluateHunterSerotoninCriteria,
  evaluateNmsCriteria,
  evaluateAnticholinergicToxidrome,
  evaluateMalignantHyperthermia,
  NEURO_EMERGENCY_COMPARISON_MATRIX,
  evaluateClozapineAnc,
  modelClozapineTobaccoKinetics,
  evaluateCighRisk,
  detectClozapine1a2Collisions,
  ANTIDEPRESSANT_KINETICS_REGISTRY,
  evaluateFinishSyndromeRisk,
  calculateAntidepressantCrossTaper,
  neuropsychOnDesk,
  neuropsychReportOnDesk,
} from "./neuropsych-kinetics";

describe("Neuropsychiatric Polypharmacy, TDM & Neuro-Emergency Engine", () => {
  /* ======================================================================== */
  /* 1. Regulatory Posture & Authoritative Citations (FD&C Act § 520(o)(1)(E))*/
  /* ======================================================================== */
  describe("Regulatory Posture & Authoritative Citations", () => {
    it("exports comprehensive regulatory disclaimer conforming to FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(NEUROPSYCH_KINETICS_REGULATORY_DISCLAIMER);
      assert.match(NEUROPSYCH_KINETICS_REGULATORY_DISCLAIMER, /FD&C Act § 520\(o\)\(1\)\(E\)/i);
      assert.match(NEUROPSYCH_KINETICS_REGULATORY_DISCLAIMER, /Non-Device Clinical Decision Support/i);
      assert.match(NEUROPSYCH_KINETICS_REGULATORY_DISCLAIMER, /non-prescriptive/i);
      assert.match(NEUROPSYCH_KINETICS_REGULATORY_DISCLAIMER, /educational/i);
      assert.match(NEUROPSYCH_KINETICS_REGULATORY_DISCLAIMER, /no.*patient-specific dosing orders/i);
    });

    it("cites landmark neuropsychiatry, toxicology, and TDM literature", () => {
      assert.ok(NEUROPSYCH_CITATIONS.length >= 8);
      const joined = NEUROPSYCH_CITATIONS.join(" ");
      assert.match(joined, /Hunter Serotonin Toxicity/i);
      assert.match(joined, /Levenson/i);
      assert.match(joined, /Gurrera/i);
      assert.match(joined, /Clozaril.*REMS/i);
      assert.match(joined, /Rostami-Hodjegan/i);
      assert.match(joined, /Rosenbaum.*discontinuation/i);
      assert.match(joined, /de Leon.*hypomotility/i);
      assert.match(joined, /Boyer.*serotonin/i);
    });

    it("strictly preserves non-prescriptive posture across all clinical evaluations", () => {
      const sampleOutputs = JSON.stringify([
        evaluateHunterSerotoninCriteria({
          serotonergicExposure: true,
          spontaneousClonus: true,
          inducibleClonus: false,
          ocularClonus: false,
          agitation: false,
          diaphoresis: false,
          tremor: false,
          hyperreflexia: false,
          hypertonia: false,
          temperatureCelsius: 37.5,
        }),
        evaluateClozapineAnc(450, false),
        modelClozapineTobaccoKinetics({
          currentDailyDoseMg: 400,
          isSmokingTobacco: true,
          scenario: "cessation-acute",
          daysPostChange: 5,
        }),
        calculateAntidepressantCrossTaper("fluoxetine", "phenelzine"),
      ]);

      assert.doesNotMatch(sampleOutputs, /\bprescribe\s+\d+\s*mg\b/i);
      assert.doesNotMatch(sampleOutputs, /\btake\s+\d+\s*mg\s+daily\b/i);
      assert.doesNotMatch(sampleOutputs, /\badminister\s+\d+\s*mg\s+po\b/i);
    });
  });

  /* ======================================================================== */
  /* 2. Hunter Serotonin Toxicity Criteria Engine                             */
  /* ======================================================================== */
  describe("Hunter Serotonin Toxicity Criteria Engine", () => {
    const baseNegative = {
      serotonergicExposure: true,
      spontaneousClonus: false,
      inducibleClonus: false,
      ocularClonus: false,
      agitation: false,
      diaphoresis: false,
      tremor: false,
      hyperreflexia: false,
      hypertonia: false,
      temperatureCelsius: 37.0,
    };

    it("requires serotonergic exposure as an absolute prerequisite", () => {
      const res = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        serotonergicExposure: false,
        spontaneousClonus: true, // Clonus present, but no serotonergic exposure
      });
      assert.equal(res.meetsHunterCriteria, false);
      assert.equal(res.satisfiedRuleIndex, null);
      assert.match(res.clinicalPresentationSummary, /require serotonergic exposure as a prerequisite/i);
    });

    it("satisfies Rule 1: Spontaneous clonus alone", () => {
      const res = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        spontaneousClonus: true,
      });
      assert.equal(res.meetsHunterCriteria, true);
      assert.equal(res.satisfiedRuleIndex, 1);
      assert.match(res.satisfiedRuleName!, /Spontaneous Clonus/i);
      assert.equal(res.severityGrade, "moderate");
    });

    it("satisfies Rule 2: Inducible clonus + agitation OR diaphoresis", () => {
      const withAgitation = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        inducibleClonus: true,
        agitation: true,
      });
      assert.equal(withAgitation.meetsHunterCriteria, true);
      assert.equal(withAgitation.satisfiedRuleIndex, 2);

      const withDiaphoresis = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        inducibleClonus: true,
        diaphoresis: true,
      });
      assert.equal(withDiaphoresis.meetsHunterCriteria, true);
      assert.equal(withDiaphoresis.satisfiedRuleIndex, 2);

      // Without agitation or diaphoresis, inducible clonus alone fails Rule 2
      const alone = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        inducibleClonus: true,
      });
      assert.equal(alone.meetsHunterCriteria, false);
    });

    it("satisfies Rule 3: Ocular clonus + agitation OR diaphoresis", () => {
      const res = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        ocularClonus: true,
        diaphoresis: true,
      });
      assert.equal(res.meetsHunterCriteria, true);
      assert.equal(res.satisfiedRuleIndex, 3);
      assert.match(res.satisfiedRuleName!, /Ocular Clonus/i);
    });

    it("satisfies Rule 4: Tremor + Hyperreflexia", () => {
      const res = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        tremor: true,
        hyperreflexia: true,
      });
      assert.equal(res.meetsHunterCriteria, true);
      assert.equal(res.satisfiedRuleIndex, 4);
      assert.match(res.satisfiedRuleName!, /Tremor \+ Hyperreflexia/i);

      // Tremor alone without hyperreflexia does not satisfy
      const tremorOnly = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        tremor: true,
        hyperreflexia: false,
      });
      assert.equal(tremorOnly.meetsHunterCriteria, false);
    });

    it("satisfies Rule 5: Hypertonia + Temp > 38°C + (ocular or inducible clonus)", () => {
      const res = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        hypertonia: true,
        temperatureCelsius: 38.8,
        inducibleClonus: true,
      });
      assert.equal(res.meetsHunterCriteria, true);
      assert.equal(res.satisfiedRuleIndex, 5);
      assert.match(res.satisfiedRuleName!, /Hypertonia \+ Temperature > 38\.0°C/i);

      // If temperature is <= 38°C, rule 5 is not met
      const afebrile = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        hypertonia: true,
        temperatureCelsius: 37.8,
        inducibleClonus: true,
      });
      assert.equal(afebrile.meetsHunterCriteria, false);
    });

    it("grades severe-critical when marked hyperthermia (>= 39.5°C) is present", () => {
      const res = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        spontaneousClonus: true,
        temperatureCelsius: 40.2,
      });
      assert.equal(res.meetsHunterCriteria, true);
      assert.equal(res.severityGrade, "severe-critical");
    });

    it("provides specific Cyproheptadine dosing algorithm and explicitly avoids antipyretics", () => {
      const res = evaluateHunterSerotoninCriteria({
        ...baseNegative,
        spontaneousClonus: true,
      });
      assert.match(res.managementProtocol.antidoteRecommendation, /Cyproheptadine/i);
      assert.match(res.managementProtocol.antidoteRecommendation, /12 mg/i);
      assert.match(res.managementProtocol.antidoteRecommendation, /2 mg every 2 hours/i);
      assert.match(res.managementProtocol.antipyreticWarning, /Avoid antipyretics/i);
      assert.match(res.managementProtocol.antipyreticWarning, /muscular activity.*clonus/i);
      assert.match(res.managementProtocol.neuromuscularBlockadeGuidance, /Succinylcholine is CONTRAINDICATED/i);
    });
  });

  /* ======================================================================== */
  /* 3. NMS, Anticholinergic, and Toxidrome Differential Matrix               */
  /* ======================================================================== */
  describe("Toxidrome Differential Engine (NMS, Anticholinergic, MH)", () => {
    it("confirms NMS under Levenson / DSM-5 criteria with lead-pipe rigidity, hyperthermia, and CPK elevation", () => {
      const nms = evaluateNmsCriteria({
        dopamineAntagonistExposure: true,
        leadPipeRigidity: true,
        temperatureCelsius: 39.4,
        autonomicInstability: true,
        alteredMentalStatus: true,
        elevatedCpk: true,
        cpkLevelUPerL: 15400,
        leukocytosis: true,
        hyporeflexiaOrNormalReflexes: true,
      });

      assert.equal(nms.meetsNmsCriteria, true);
      assert.equal(nms.diagnosticConfidence, "confirmed");
      assert.ok(nms.levensonMajorCriteriaMet.length >= 3);
      assert.ok(nms.levensonMinorCriteriaMet.length >= 2);
      assert.match(nms.pharmacotherapyProtocol.dopamineAgonistBromocriptine, /Bromocriptine.*2\.5.*5.*mg/i);
      assert.match(nms.pharmacotherapyProtocol.ryanodineBlockerDantrolene, /Dantrolene.*1\.0.*2\.5.*mg\/kg/i);
      assert.match(nms.pharmacotherapyProtocol.nmdaAntagonistAmantadine, /Amantadine.*100.*mg/i);
    });

    it("differentiates NMS from Serotonin Syndrome based on tone, reflexes, onset, and bowel sounds", () => {
      const nms = evaluateNmsCriteria({
        dopamineAntagonistExposure: true,
        leadPipeRigidity: true,
        temperatureCelsius: 38.5,
        autonomicInstability: true,
        alteredMentalStatus: true,
        elevatedCpk: true,
        leukocytosis: true,
        hyporeflexiaOrNormalReflexes: true,
      });

      assert.match(nms.differentiatorVsSerotoninSyndrome.neuromuscularComparison, /lead-pipe.*hyporeflexia/i);
      assert.match(nms.differentiatorVsSerotoninSyndrome.neuromuscularComparison, /hyperreflexia.*clonus/i);
      assert.match(nms.differentiatorVsSerotoninSyndrome.onsetComparison, /days to weeks/i);
      assert.match(nms.differentiatorVsSerotoninSyndrome.onsetComparison, /6 to 24 hours/i);
      assert.match(nms.differentiatorVsSerotoninSyndrome.bowelComparison, /normal or hypoactive/i);
      assert.match(nms.differentiatorVsSerotoninSyndrome.bowelComparison, /hyperactive.*diarrhea/i);
    });

    it("identifies Anticholinergic Toxidrome and validates ANHIDROSIS as the critical discriminator", () => {
      const antichol = evaluateAnticholinergicToxidrome({
        anticholinergicExposure: true,
        mydriasis: true,
        deliriumOrAgitation: true,
        flushing: true,
        hyperthermia: true,
        anhidrosis: true,
        urinaryRetentionOrHypoactiveBowel: true,
        tachycardia: true,
        tcaIngestionOrWideQrsOrAvBlock: false,
      });

      assert.equal(antichol.meetsAnticholinergicToxidrome, true);
      assert.match(antichol.criticalDiscriminatorVsSsAndNms, /ANHIDROSIS.*DIAPHORESIS/i);
      assert.equal(antichol.physostigmineSuitability.isCandidate, true);
      assert.match(antichol.physostigmineSuitability.protocolSummary, /Physostigmine.*0\.5.*2\.0.*mg/i);
    });

    it("strictly flags Physostigmine contraindication when TCA or wide QRS/AV block is present", () => {
      const anticholWithTca = evaluateAnticholinergicToxidrome({
        anticholinergicExposure: true,
        mydriasis: true,
        deliriumOrAgitation: true,
        flushing: true,
        hyperthermia: true,
        anhidrosis: true,
        urinaryRetentionOrHypoactiveBowel: true,
        tachycardia: true,
        tcaIngestionOrWideQrsOrAvBlock: true,
      });

      assert.equal(anticholWithTca.physostigmineSuitability.isCandidate, false);
      assert.match(anticholWithTca.physostigmineSuitability.contraindicationWarning, /ABSOLUTE CONTRAINDICATION/i);
      assert.match(anticholWithTca.physostigmineSuitability.contraindicationWarning, /asystolic cardiac arrest/i);
    });

    it("evaluates Malignant Hyperthermia and points to RYR1 mutation and Dantrolene antidote", () => {
      const mh = evaluateMalignantHyperthermia({
        volatileAnestheticOrSuccinylcholineExposure: true,
        masseterSpasmOrRigidity: true,
        rapidEndTidalCo2Rise: true,
        hyperthermia: true,
        sinusTachycardia: true,
        metabolicAcidosis: true,
      });

      assert.equal(mh.isLikelyMh, true);
      assert.match(mh.molecularEtiology, /RYR1/i);
      assert.match(mh.antidoteDantroleneGuidance, /Dantrolene Sodium.*2\.5 mg\/kg/i);
    });

    it("contains exhaustive 4-way comparison matrix rows", () => {
      assert.equal(NEURO_EMERGENCY_COMPARISON_MATRIX.length, 4);
      const entities = NEURO_EMERGENCY_COMPARISON_MATRIX.map((r) => r.entity);
      assert.ok(entities.some((e) => e.includes("Serotonin Syndrome")));
      assert.ok(entities.some((e) => e.includes("Neuroleptic Malignant Syndrome")));
      assert.ok(entities.some((e) => e.includes("Anticholinergic Toxidrome")));
      assert.ok(entities.some((e) => e.includes("Malignant Hyperthermia")));
    });
  });

  /* ======================================================================== */
  /* 4. Clozapine REMS Absolute Neutrophil Count (ANC) Engine                 */
  /* ======================================================================== */
  describe("Clozapine REMS Absolute Neutrophil Count (ANC) Protocols", () => {
    it("classifies General Population ANC according to official FDA REMS thresholds", () => {
      // Normal: >= 1,500
      const normal = evaluateClozapineAnc(1800, false);
      assert.equal(normal.status, "normal");
      assert.equal(normal.canInitiateOrContinue, true);
      assert.equal(normal.hematologyConsultRequired, false);

      // Mild neutropenia: 1,000 to 1,499
      const mild = evaluateClozapineAnc(1250, false);
      assert.equal(mild.status, "mild-neutropenia");
      assert.equal(mild.canInitiateOrContinue, true);
      assert.match(mild.monitoringFrequency, /Three times weekly/i);

      // Moderate neutropenia: 500 to 999
      const mod = evaluateClozapineAnc(750, false);
      assert.equal(mod.status, "moderate-neutropenia");
      assert.equal(mod.canInitiateOrContinue, false);
      assert.equal(mod.hematologyConsultRequired, true);
      assert.match(mod.monitoringFrequency, /Daily/i);

      // Severe agranulocytosis: < 500
      const severe = evaluateClozapineAnc(380, false);
      assert.equal(severe.status, "severe-agranulocytosis");
      assert.equal(severe.canInitiateOrContinue, false);
      assert.equal(severe.rechallengePermitted, false);
      assert.equal(severe.hematologyConsultRequired, true);
      assert.match(severe.clinicalActionDirective, /IMMEDIATE PERMANENT CLOZAPINE CESSATION/i);
    });

    it("classifies Benign Ethnic Neutropenia (BEN) with adjusted baseline (1,000 / µL)", () => {
      // BEN Normal: >= 1,000
      const benNormal = evaluateClozapineAnc(1100, true);
      assert.equal(benNormal.status, "normal");
      assert.equal(benNormal.canInitiateOrContinue, true);

      // BEN Mild neutropenia: 500 to 999
      const benMild = evaluateClozapineAnc(750, true);
      assert.equal(benMild.status, "mild-neutropenia");
      assert.equal(benMild.canInitiateOrContinue, true);
      assert.match(benMild.monitoringFrequency, /Three times weekly/i);

      // BEN Severe agranulocytosis: < 500
      const benSevere = evaluateClozapineAnc(450, true);
      assert.equal(benSevere.status, "severe-agranulocytosis");
      assert.equal(benSevere.canInitiateOrContinue, false);
      assert.equal(benSevere.rechallengePermitted, false);
    });
  });

  /* ======================================================================== */
  /* 5. Tobacco Smoke Induction vs Smoking Cessation Paradox                  */
  /* ======================================================================== */
  describe("Clozapine Tobacco Smoke CYP1A2 Induction & Cessation Kinetics", () => {
    it("models steady-state smoker clearance (~1.5x induction by PAHs)", () => {
      const model = modelClozapineTobaccoKinetics({
        currentDailyDoseMg: 400,
        isSmokingTobacco: true,
        cigarettesPerDay: 20,
        scenario: "smoker-steady",
        knownSmokerSerumLevelNgMl: 450,
      });

      assert.equal(model.cyp1a2InductionRatio, 1.5);
      assert.equal(model.relativeClearance, 1.5);
      assert.equal(model.projectedSerumConcentrationNgMl, 450);
      assert.equal(model.toxicityRiskTier, "therapeutic-window");
    });

    it("models abrupt smoking cessation surge (+50% to +100%) and seizure hazard", () => {
      const model = modelClozapineTobaccoKinetics({
        currentDailyDoseMg: 400,
        isSmokingTobacco: true,
        cigarettesPerDay: 20,
        scenario: "cessation-acute",
        daysPostChange: 7, // De-induction complete
        knownSmokerSerumLevelNgMl: 550,
      });

      // Clearance drops from 1.5 down to 1.0, concentration surges by ~50% (550 * 1.5 = 825)
      assert.ok(model.projectedSerumConcentrationNgMl >= 800);
      assert.ok(model.projectedConcentrationChangePercent >= 45);
      assert.equal(model.toxicityRiskTier, "elevated-seizure-risk");
      assert.ok(model.recommendedDoseAdjustmentMg < 400); // Recommends ~30-40% reduction
      assert.match(model.nicotineReplacementEducation, /NICOTINE DOES NOT/i);
    });

    it("triggers critical-toxicity when projected serum concentration crosses 1,000 ng/mL", () => {
      const highModel = modelClozapineTobaccoKinetics({
        currentDailyDoseMg: 600,
        isSmokingTobacco: true,
        cigarettesPerDay: 25,
        scenario: "cessation-acute",
        daysPostChange: 7,
        knownSmokerSerumLevelNgMl: 750,
      });

      assert.ok(highModel.projectedSerumConcentrationNgMl >= 1000);
      assert.equal(highModel.toxicityRiskTier, "critical-toxicity");
      assert.ok(highModel.clinicalHazards.some((h) => h.includes("CRITICAL SEIZURE HAZARD")));
    });

    it("evaluates Clozapine-Induced Gastrointestinal Hypomotility (CIGH) and highlights mortality", () => {
      const cigh = evaluateCighRisk({
        hasClozapine: true,
        concurrentAnticholinergicAgents: ["benztropine"],
        concurrentOpioid: true,
        ageYears: 68,
        constipationReported: true,
        bowelMovementAbsenceDays: 3,
      });

      assert.equal(cigh.riskScore, "critical");
      assert.match(cigh.mortalityWarning, /EXCEED the mortality from clozapine-induced agranulocytosis/i);
      assert.ok(cigh.mandatedProactiveInterventions.some((i) => i.includes("Polyethylene glycol")));
    });

    it("detects strong CYP1A2 inhibitor collisions with Fluvoxamine and Ciprofloxacin", () => {
      const collisions = detectClozapine1a2Collisions(["clozapine", "fluvoxamine", "ciprofloxacin"]);
      assert.equal(collisions.length, 2);

      const fluvox = collisions.find((c) => c.interactingDrugName === "Fluvoxamine");
      assert.ok(fluvox);
      assert.equal(fluvox.collisionSeverity, "contraindicated");
      assert.match(fluvox.magnitudeFoldIncrease, /2-fold to 5-fold/i);

      const cipro = collisions.find((c) => c.interactingDrugName === "Ciprofloxacin");
      assert.ok(cipro);
      assert.equal(cipro.collisionSeverity, "major");
      assert.match(cipro.magnitudeFoldIncrease, /2-fold to 3-fold/i);
    });
  });

  /* ======================================================================== */
  /* 6. Antidepressant Discontinuation Kinetics & Cross-Tapering              */
  /* ======================================================================== */
  describe("Antidepressant Discontinuation & Cross-Tapering Kinetics", () => {
    it("registers elimination half-lives and FINISH risk tiers", () => {
      const parox = ANTIDEPRESSANT_KINETICS_REGISTRY["paroxetine"];
      assert.ok(parox);
      assert.equal(parox.parentHalfLifeHours, 21);
      assert.equal(parox.finishRiskTier, "extreme");
      assert.equal(parox.anticholinergicReboundRisk, true);

      const venlax = ANTIDEPRESSANT_KINETICS_REGISTRY["venlafaxine"];
      assert.ok(venlax);
      assert.equal(venlax.parentHalfLifeHours, 5);
      assert.equal(venlax.finishRiskTier, "extreme");

      const fluox = ANTIDEPRESSANT_KINETICS_REGISTRY["fluoxetine"];
      assert.ok(fluox);
      assert.equal(fluox.finishRiskTier, "low-auto-taper");
      assert.equal(fluox.washoutRequiredBeforeMaoiDays, 35); // 5 weeks!
    });

    it("evaluates FINISH syndrome risk for short vs long half-life agents", () => {
      const paroxEval = evaluateFinishSyndromeRisk("paroxetine", true);
      assert.ok(paroxEval);
      assert.equal(paroxEval.riskTier, "extreme");
      assert.equal(paroxEval.fluoxetineBridgingCandidate, true);
      assert.match(paroxEval.finishMnemonicDetails.s, /brain zaps/i);

      const fluoxEval = evaluateFinishSyndromeRisk("fluoxetine", true);
      assert.ok(fluoxEval);
      assert.equal(fluoxEval.riskTier, "low-auto-taper");
      assert.equal(fluoxEval.fluoxetineBridgingCandidate, false);
    });

    it("enforces mandatory 5-week washout when switching from Fluoxetine to an MAOI", () => {
      const crossTaper = calculateAntidepressantCrossTaper("fluoxetine", "phenelzine");
      assert.equal(crossTaper.strategy, "mandatory-washout-maoi");
      assert.equal(crossTaper.washoutDaysRequired, 35); // 5 weeks (35 days)
      assert.equal(crossTaper.serotoninSyndromeRiskDuringTransition, "critical");
      assert.match(crossTaper.scheduleSummary, /MANDATORY 5-WEEK \(35 DAYS\) WASHOUT REQUIRED/i);
      assert.match(crossTaper.contraindicationNotice!, /norfluoxetine.*7 to 15 days/i);
    });

    it("enforces 14-day washout when switching from standard SSRI to MAOI or vice versa", () => {
      const ssriToMaoi = calculateAntidepressantCrossTaper("sertraline", "tranylcypromine");
      assert.equal(ssriToMaoi.washoutDaysRequired, 14);
      assert.equal(ssriToMaoi.strategy, "mandatory-washout-maoi");

      const maoiToSsri = calculateAntidepressantCrossTaper("phenelzine", "escitalopram");
      assert.equal(maoiToSsri.washoutDaysRequired, 14);
      assert.equal(maoiToSsri.strategy, "mandatory-washout-maoi");
    });

    it("recommends conservative 3- to 4-week cross-taper for extreme FINISH agents", () => {
      const venlaToSert = calculateAntidepressantCrossTaper("venlafaxine", "sertraline", 150);
      assert.equal(venlaToSert.strategy, "cross-taper");
      assert.equal(venlaToSert.washoutDaysRequired, 0);
      assert.match(venlaToSert.scheduleSummary, /3- to 4-Week Cross-Taper/i);
      assert.equal(venlaToSert.stepByStepProtocol.length, 4);
    });
  });

  /* ======================================================================== */
  /* 7. Desk Detection & End-to-End Report Generation                         */
  /* ======================================================================== */
  describe("Desk Tray Detection & End-to-End Report Generation", () => {
    it("detects neuropsychiatric agents accurately on active desk tray", () => {
      assert.equal(neuropsychOnDesk(["clozapine", "lisinopril"]), true);
      assert.equal(neuropsychOnDesk(["paroxetine", "atorvastatin"]), true);
      assert.equal(neuropsychOnDesk(["haloperidol"]), true);
      assert.equal(neuropsychOnDesk(["bromocriptine"]), true);
      assert.equal(neuropsychOnDesk(["metformin", "lisinopril", "amiodarone"]), false);
    });

    it("generates comprehensive report for clozapine with smoking host", () => {
      const smokingHost = { ...DEFAULT_HOST, smoking: true };
      const report = neuropsychReportOnDesk(["clozapine", "fluvoxamine"], smokingHost);

      assert.equal(report.hasNeuropsych, true);
      assert.equal(report.overallRiskTier, "critical");
      assert.equal(report.clozapineReport.hasClozapine, true);
      assert.ok(report.clozapineReport.collisions1a2.length >= 1);
      assert.ok(report.activeAlerts.some((a) => a.includes("CYP1A2 Collision - CONTRAINDICATED")));
      assert.ok(report.activeAlerts.some((a) => a.includes("Clozapine Tobacco Smoke Induction")));
      assert.ok(report.clinicalPearls.length >= 5);
      assert.ok(report.regulatoryNotice.length > 50);
    });

    it("generates report with MAOI washout alert when fluoxetine and phenelzine co-exist", () => {
      const report = neuropsychReportOnDesk(["fluoxetine", "phenelzine"], DEFAULT_HOST);
      assert.equal(report.overallRiskTier, "critical");
      assert.ok(report.antidepressantDiscontinuation.maoiWashoutAlerts.length >= 1);
      assert.equal(
        report.antidepressantDiscontinuation.maoiWashoutAlerts[0].washoutDaysRequired,
        35,
      );
      assert.ok(report.activeAlerts.some((a) => a.includes("CRITICAL MAOI WASHOUT CONTRAINDICATION")));
    });
  });
});
