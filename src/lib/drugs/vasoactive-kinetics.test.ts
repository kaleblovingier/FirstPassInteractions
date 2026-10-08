import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  VASOACTIVE_CDS_DISCLAIMER,
  TARGET_RECEPTORS,
  VASOACTIVE_DRUG_PROFILES,
  BETA_BLOCKER_IDS,
  MAOI_IDS,
  INDIRECT_SYMPATHOMIMETIC_IDS,
  INOTROPE_IDS,
  directionToScore,
  scoreToDirection,
  getVasoactiveProfile,
  getAllVasoactiveProfiles,
  getReceptorTarget,
  getAllReceptorTargets,
  getComparativeReceptorMatrix,
  evaluateEpinephrineHyperlactatemia,
  evaluateAcidemiaAdrenergicUncoupling,
  findVasoactiveCollisions,
  vasoactiveOnDesk,
  aggregateHemodynamics,
  vasoactiveReportOnDesk,
  type TargetReceptorId,
  type VasoactiveDrugId,
} from "./vasoactive-kinetics";
import { DEFAULT_HOST } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

const EXPECTED_RECEPTORS: TargetReceptorId[] = [
  "alpha-1",
  "alpha-2",
  "beta-1",
  "beta-2",
  "V1a",
  "AT1",
  "D1",
  "D2",
];

describe("Critical Care Vasoactive Kinetics & Adrenergic Hemodynamics Engine", () => {
  // ==========================================================================
  // 1. STATUTORY CDS COMPLIANCE (FD&C Act § 520(o)(1)(E))
  // ==========================================================================
  describe("Regulatory Posture & Non-Device CDS Conformance", () => {
    it("exports statutory disclaimer explicitly referencing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(VASOACTIVE_CDS_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(VASOACTIVE_CDS_DISCLAIMER.includes("Non-Device Clinical Decision Support"));
      assert.ok(VASOACTIVE_CDS_DISCLAIMER.includes("licensed healthcare professionals"));
      assert.ok(VASOACTIVE_CDS_DISCLAIMER.includes("independent review"));
      assert.ok(VASOACTIVE_CDS_DISCLAIMER.includes("Prescribing Information"));
    });

    it("verifies disclaimer emphasizes non-prescriptive, educational decision support", () => {
      assert.ok(
        VASOACTIVE_CDS_DISCLAIMER.includes("does not provide automated diagnostic conclusions"),
      );
      assert.ok(
        VASOACTIVE_CDS_DISCLAIMER.includes("does not generate infusion pump directives"),
      );
      assert.ok(
        VASOACTIVE_CDS_DISCLAIMER.includes("does not replace individualized bedside clinical evaluation"),
      );
    });

    it("report generator includes comprehensive disclaimer with regulatory footer", () => {
      const report = vasoactiveReportOnDesk(["norepinephrine"], DEFAULT_HOST);
      assert.ok(report.disclaimer.includes(VASOACTIVE_CDS_DISCLAIMER));
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });
  });

  // ==========================================================================
  // 2. RECEPTOR TARGETS REGISTRY & G-PROTEIN COUPLING
  // ==========================================================================
  describe("Receptor Targets Registry & Signal Transduction", () => {
    it("contains all 8 required critical care receptors", () => {
      const allTargets = getAllReceptorTargets();
      assert.equal(allTargets.length, 8);
      for (const id of EXPECTED_RECEPTORS) {
        const target = getReceptorTarget(id);
        assert.ok(target, `Target receptor '${id}' must be present`);
        assert.equal(target?.id, id);
      }
    });

    it("verifies accurate G-protein coupling for each receptor", () => {
      assert.equal(TARGET_RECEPTORS["alpha-1"].gProtein, "Gq");
      assert.equal(TARGET_RECEPTORS["alpha-2"].gProtein, "Gi");
      assert.equal(TARGET_RECEPTORS["beta-1"].gProtein, "Gs");
      assert.equal(TARGET_RECEPTORS["beta-2"].gProtein, "Gs");
      assert.equal(TARGET_RECEPTORS["V1a"].gProtein, "Gq");
      assert.equal(TARGET_RECEPTORS["AT1"].gProtein, "Gq");
      assert.equal(TARGET_RECEPTORS["D1"].gProtein, "Gs");
      assert.equal(TARGET_RECEPTORS["D2"].gProtein, "Gi");
    });

    it("validates second-messenger pathways and molecular signaling descriptions", () => {
      // Alpha-1: Gq / PLC / IP3 / DAG
      assert.ok(TARGET_RECEPTORS["alpha-1"].secondMessenger.includes("PLC"));
      assert.ok(TARGET_RECEPTORS["alpha-1"].secondMessenger.includes("IP3"));
      assert.ok(TARGET_RECEPTORS["alpha-1"].molecularSignaling.includes("MLCK"));

      // Beta-1: Gs / Adenylyl cyclase / cAMP / PKA
      assert.ok(TARGET_RECEPTORS["beta-1"].secondMessenger.includes("cAMP"));
      assert.ok(TARGET_RECEPTORS["beta-1"].secondMessenger.includes("PKA"));
      assert.ok(TARGET_RECEPTORS["beta-1"].molecularSignaling.includes("Cav1.2"));

      // V1a: Gq / PLC / K(ATP) channel closure
      assert.ok(TARGET_RECEPTORS["V1a"].secondMessenger.includes("PLC"));
      assert.ok(TARGET_RECEPTORS["V1a"].molecularSignaling.includes("K_ATP"));

      // AT1: Gq / Rho-kinase
      assert.ok(TARGET_RECEPTORS["AT1"].gProtein === "Gq");
      assert.ok(TARGET_RECEPTORS["AT1"].molecularSignaling.includes("Rho"));
    });
  });

  // ==========================================================================
  // 3. MASTER VASOACTIVE DRUG PROFILES & RECEPTOR BINDING MATRIX
  // ==========================================================================
  describe("Master Vasoactive Drug Profiles & Binding Matrix", () => {
    const EXPECTED_DRUG_IDS: VasoactiveDrugId[] = [
      "norepinephrine",
      "epinephrine",
      "phenylephrine",
      "vasopressin",
      "dobutamine",
      "milrinone",
      "dopamine",
      "angiotensin-ii",
    ];

    it("contains profiles for all 8 core critical care vasoactive drugs", () => {
      const allProfiles = getAllVasoactiveProfiles();
      assert.equal(allProfiles.length, 8);
      for (const id of EXPECTED_DRUG_IDS) {
        const profile = getVasoactiveProfile(id);
        assert.ok(profile, `Profile for '${id}' must exist`);
        assert.equal(profile?.id, id);
      }
    });

    it("validates Norepinephrine: potent alpha-1, strong beta-1, weak beta-2", () => {
      const ne = VASOACTIVE_DRUG_PROFILES.norepinephrine;
      assert.equal(ne.receptorAffinities["alpha-1"], 4);
      assert.equal(ne.receptorAffinities["beta-1"], 3);
      assert.equal(ne.receptorAffinities["beta-2"], 1);
      assert.equal(ne.receptorAffinities["alpha-2"], 2);
      assert.equal(ne.receptorAffinities["V1a"], 0);
      assert.equal(ne.receptorAffinities["AT1"], 0);
      assert.equal(ne.receptorAffinities["D1"], 0);
      assert.equal(ne.hemodynamics.map.direction, "surge");
      assert.equal(ne.hemodynamics.svr.direction, "surge");
      assert.equal(ne.hemodynamics.coCi.direction, "neutral");
    });

    it("validates Epinephrine: potent alpha-1, beta-1, beta-2", () => {
      const epi = VASOACTIVE_DRUG_PROFILES.epinephrine;
      assert.equal(epi.receptorAffinities["alpha-1"], 4);
      assert.equal(epi.receptorAffinities["beta-1"], 4);
      assert.equal(epi.receptorAffinities["beta-2"], 4);
      assert.equal(epi.receptorAffinities["alpha-2"], 3);
      assert.equal(epi.receptorAffinities["V1a"], 0);
      assert.equal(epi.hemodynamics.map.direction, "surge");
      assert.equal(epi.hemodynamics.coCi.direction, "surge");
      assert.equal(epi.hemodynamics.hr.direction, "surge");
      assert.equal(epi.hemodynamics.mvo2.direction, "surge");
    });

    it("validates Phenylephrine: pure selective alpha-1 agonist with zero beta activity", () => {
      const pe = VASOACTIVE_DRUG_PROFILES.phenylephrine;
      assert.equal(pe.receptorAffinities["alpha-1"], 4);
      assert.equal(pe.receptorAffinities["beta-1"], 0);
      assert.equal(pe.receptorAffinities["beta-2"], 0);
      assert.equal(pe.receptorAffinities["V1a"], 0);
      assert.equal(pe.hemodynamics.svr.direction, "surge");
      assert.equal(pe.hemodynamics.coCi.direction, "decrease");
      assert.equal(pe.hemodynamics.hr.direction, "decrease"); // reflex bradycardia
    });

    it("validates Vasopressin: selective V1a agonist with zero adrenergic affinity", () => {
      const avp = VASOACTIVE_DRUG_PROFILES.vasopressin;
      assert.equal(avp.receptorAffinities["V1a"], 4);
      assert.equal(avp.receptorAffinities["alpha-1"], 0);
      assert.equal(avp.receptorAffinities["beta-1"], 0);
      assert.equal(avp.receptorAffinities["beta-2"], 0);
      assert.equal(avp.receptorAffinities["AT1"], 0);
      assert.equal(avp.hemodynamics.svr.direction, "surge");
      assert.equal(avp.hemodynamics.pvr.direction, "neutral");
    });

    it("validates Dobutamine: potent beta-1 inotrope with beta-2 vasodilation", () => {
      const dob = VASOACTIVE_DRUG_PROFILES.dobutamine;
      assert.equal(dob.receptorAffinities["beta-1"], 4);
      assert.equal(dob.receptorAffinities["beta-2"], 2);
      assert.equal(dob.receptorAffinities["alpha-1"], 1);
      assert.equal(dob.receptorAffinities["V1a"], 0);
      assert.equal(dob.hemodynamics.coCi.direction, "surge");
      assert.equal(dob.hemodynamics.svr.direction, "decrease");
      assert.equal(dob.hemodynamics.pvr.direction, "decrease");
    });

    it("validates Milrinone: selective PDE3 inhibitor with zero direct receptor affinities", () => {
      const mil = VASOACTIVE_DRUG_PROFILES.milrinone;
      for (const r of EXPECTED_RECEPTORS) {
        assert.equal(mil.receptorAffinities[r], 0, `Milrinone direct binding to ${r} must be 0`);
      }
      assert.ok(mil.drugClass.includes("PDE3"));
      assert.equal(mil.hemodynamics.svr.direction, "marked-drop");
      assert.equal(mil.hemodynamics.pvr.direction, "marked-drop");
      assert.equal(mil.hemodynamics.coCi.direction, "surge");
      assert.equal(mil.halfLifeMinutes, 140.0);
    });

    it("validates Dopamine: dose-dependent D1, D2, beta-1, and alpha-1 engagement", () => {
      const dopa = VASOACTIVE_DRUG_PROFILES.dopamine;
      assert.equal(dopa.receptorAffinities["D1"], 4);
      assert.equal(dopa.receptorAffinities["D2"], 4);
      assert.equal(dopa.receptorAffinities["beta-1"], 3);
      assert.equal(dopa.receptorAffinities["alpha-1"], 4);
      assert.equal(dopa.hemodynamics.coCi.direction, "surge");
      assert.equal(dopa.hemodynamics.hr.direction, "surge");
    });

    it("validates Angiotensin II: selective AT1 agonist with zero adrenergic affinity", () => {
      const at2 = VASOACTIVE_DRUG_PROFILES["angiotensin-ii"];
      assert.equal(at2.receptorAffinities["AT1"], 4);
      assert.equal(at2.receptorAffinities["alpha-1"], 0);
      assert.equal(at2.receptorAffinities["beta-1"], 0);
      assert.equal(at2.receptorAffinities["V1a"], 0);
      assert.equal(at2.hemodynamics.map.direction, "surge");
      assert.equal(at2.hemodynamics.svr.direction, "surge");
    });

    it("checks comparative matrix utility output", () => {
      const matrix = getComparativeReceptorMatrix();
      assert.equal(matrix.receptors.length, 8);
      assert.equal(matrix.drugs.length, 8);
    });
  });

  // ==========================================================================
  // 4. HEMODYNAMIC DIRECTION UTILITIES & AGGREGATION
  // ==========================================================================
  describe("Hemodynamic Trajectory Vectors & Multi-Agent Aggregation", () => {
    it("converts directions to numerical scores and back accurately", () => {
      assert.equal(directionToScore("surge"), 2);
      assert.equal(directionToScore("increase"), 1);
      assert.equal(directionToScore("neutral"), 0);
      assert.equal(directionToScore("decrease"), -1);
      assert.equal(directionToScore("marked-drop"), -2);

      assert.equal(scoreToDirection(2), "surge");
      assert.equal(scoreToDirection(1.6), "surge");
      assert.equal(scoreToDirection(1.0), "increase");
      assert.equal(scoreToDirection(0.0), "neutral");
      assert.equal(scoreToDirection(-1.0), "decrease");
      assert.equal(scoreToDirection(-2.0), "marked-drop");
    });

    it("aggregates dual vasopressor regimen: Norepinephrine + Vasopressin", () => {
      const ne = VASOACTIVE_DRUG_PROFILES.norepinephrine;
      const avp = VASOACTIVE_DRUG_PROFILES.vasopressin;
      const agg = aggregateHemodynamics([ne, avp]);

      assert.equal(agg.netMap, "surge");
      assert.equal(agg.netSvr, "surge");
      assert.equal(agg.netCoCi, "neutral");
      assert.equal(agg.netPvr, "increase");
      assert.ok(agg.summary.includes("Norepinephrine + Vasopressin"));
    });

    it("aggregates pressor + inodilator combination: Norepinephrine + Dobutamine", () => {
      const ne = VASOACTIVE_DRUG_PROFILES.norepinephrine;
      const dob = VASOACTIVE_DRUG_PROFILES.dobutamine;
      const agg = aggregateHemodynamics([ne, dob]);

      // NE (+2 MAP, +2 SVR, 0 CO) + Dobutamine (0 MAP, -1 SVR, +2 CO)
      // avg MAP = 1.0 (increase), avg SVR = 0.5 (increase), avg CO = 1.0 (increase)
      assert.equal(agg.netMap, "increase");
      assert.equal(agg.netCoCi, "increase");
      assert.ok(agg.coCiScore > 0);
    });

    it("returns neutral trajectory when no drugs are simulated", () => {
      const empty = aggregateHemodynamics([]);
      assert.equal(empty.netMap, "neutral");
      assert.equal(empty.mapScore, 0);
    });
  });

  // ==========================================================================
  // 5. EPINEPHRINE HYPERLACTATEMIA MECHANICS (TYPE B vs TYPE A)
  // ==========================================================================
  describe("Epinephrine Hyperlactatemia Mechanics (Type B vs Type A)", () => {
    it("identifies normal lactate as non-pathologic and non-glycolytic", () => {
      const res = evaluateEpinephrineHyperlactatemia({
        epinephrineActive: true,
        lactateMmolL: 1.4,
      });
      assert.equal(res.classification, "normal-lactate");
      assert.equal(res.isTypeBLactatemia, false);
      assert.equal(res.isTypeAHypoperfusion, false);
    });

    it("classifies elevated lactate with preserved perfusion on Epinephrine as benign Type B", () => {
      const res = evaluateEpinephrineHyperlactatemia({
        epinephrineActive: true,
        lactateMmolL: 5.2,
        scvO2Pct: 76,
        pvaCo2GapMmHg: 4.5,
        urineOutputMlKgHr: 0.8,
      });

      assert.equal(res.classification, "benign-type-b-aerobic-glycolysis");
      assert.equal(res.isTypeBLactatemia, true);
      assert.equal(res.isTypeAHypoperfusion, false);
      assert.ok(res.headline.includes("BENIGN TYPE B"));
      assert.ok(res.biochemicalMechanism.includes("beta-2"));
      assert.ok(res.biochemicalMechanism.includes("cAMP"));
      assert.ok(res.biochemicalMechanism.includes("Pyruvate Dehydrogenase"));
    });

    it("classifies elevated lactate with impaired perfusion markers as Type A tissue dysoxia", () => {
      const res = evaluateEpinephrineHyperlactatemia({
        epinephrineActive: true,
        lactateMmolL: 6.8,
        scvO2Pct: 54, // low (<70%)
        pvaCo2GapMmHg: 8.5, // wide (>=6 mmHg)
        urineOutputMlKgHr: 0.2, // oliguric
      });

      assert.equal(res.classification, "type-a-tissue-dysoxia");
      assert.equal(res.isTypeAHypoperfusion, true);
      assert.ok(res.headline.includes("TYPE A HYPOPERFUSION"));
    });

    it("classifies elevated lactate without epinephrine as Type A hypoperfusion", () => {
      const res = evaluateEpinephrineHyperlactatemia({
        epinephrineActive: false,
        lactateMmolL: 4.5,
      });

      assert.equal(res.classification, "type-a-tissue-dysoxia");
      assert.equal(res.isTypeAHypoperfusion, true);
    });
  });

  // ==========================================================================
  // 6. ACIDEMIA-INDUCED ADRENERGIC UNCOUPLING & VASOPRESSIN EFFICACY
  // ==========================================================================
  describe("Acidemia-Induced Adrenergic Uncoupling & V1a Receptor Preservation", () => {
    it("maintains 100% responsiveness at normal arterial pH 7.40", () => {
      const res = evaluateAcidemiaAdrenergicUncoupling(7.40, ["norepinephrine"]);
      assert.equal(res.isAcidemicUncouplingRisk, false);
      assert.equal(res.uncouplingSeverity, "none");
      assert.equal(res.estimatedCatecholamineResponsivenessPct, 100);
      assert.equal(res.estimatedVasopressinResponsivenessPct, 100);
    });

    it("detects severe adrenergic uncoupling when arterial pH drops below 7.20", () => {
      const res = evaluateAcidemiaAdrenergicUncoupling(7.14, ["norepinephrine"]);
      assert.equal(res.isAcidemicUncouplingRisk, true);
      assert.equal(res.uncouplingSeverity, "severe-adrenergic-uncoupling");
      assert.equal(res.estimatedCatecholamineResponsivenessPct, 45);
      // Vasopressin remains 85% effective
      assert.equal(res.estimatedVasopressinResponsivenessPct, 85);
      assert.ok(res.headline.includes("SEVERE ACIDEMIA"));
      assert.ok(res.clinicalAction.includes("Add non-adrenergic Vasopressin"));
    });

    it("models critical uncoupling at pH < 7.10 with marked catecholamine resistance", () => {
      const res = evaluateAcidemiaAdrenergicUncoupling(7.05, ["norepinephrine", "epinephrine"]);
      assert.equal(res.isAcidemicUncouplingRisk, true);
      assert.equal(res.estimatedCatecholamineResponsivenessPct, 30);
      assert.equal(res.estimatedVasopressinResponsivenessPct, 85);
      assert.ok(res.headline.includes("CRITICAL ACIDEMIA UNCOUPLING"));
      assert.ok(res.molecularMechanism.includes("K_ATP"));
      assert.ok(res.molecularMechanism.includes("iNOS"));
    });

    it("explains scientific rationale for vasopressin V1a resistance to acidosis", () => {
      const res = evaluateAcidemiaAdrenergicUncoupling(7.12, ["norepinephrine"]);
      assert.ok(res.scientificRationaleForVasopressin.includes("V1a receptors retain high ligand binding affinity"));
      assert.ok(res.scientificRationaleForVasopressin.includes("CLOSES open K_ATP channels"));
    });
  });

  // ==========================================================================
  // 7. CRITICAL RECEPTOR CLASHES & DRUG COLLISIONS
  // ==========================================================================
  describe("Critical Receptor Clashes & Drug Collisions", () => {
    it("Collision 1: Beta-Blockers x Epinephrine triggers unopposed alpha-1 surge alert", () => {
      const collisions = findVasoactiveCollisions({
        drugIds: ["propranolol", "epinephrine"],
      });

      assert.equal(collisions.length, 1);
      const c = collisions[0];
      assert.equal(c.category, "beta-blocker-epinephrine-unopposed-alpha");
      assert.equal(c.severity, "contraindicated");
      assert.ok(c.headline.includes("Unopposed Alpha-1"));
      assert.ok(c.hemodynamicConsequence.includes("reflex vagal bradycardia"));
      assert.ok(c.antidoteOrRescueStrategy.includes("GLUCAGON"));
      assert.ok(c.citations.length >= 2);
    });

    it("Collision 1: Also triggers for cardioselective and mixed beta-blockers (metoprolol, labetalol, atenolol)", () => {
      for (const bb of ["metoprolol", "labetalol", "atenolol", "carvedilol", "esmolol"]) {
        const collisions = findVasoactiveCollisions({
          drugIds: [bb, "epinephrine"],
        });
        assert.ok(
          collisions.some((c) => c.category === "beta-blocker-epinephrine-unopposed-alpha"),
          `Expected collision for ${bb} + epinephrine`,
        );
      }
    });

    it("Collision 2: MAO Inhibitors x Indirect-acting Sympathomimetics triggers hypertensive crisis alert", () => {
      const collisions = findVasoactiveCollisions({
        drugIds: ["phenelzine", "ephedrine"],
      });

      assert.equal(collisions.length, 1);
      const c = collisions[0];
      assert.equal(c.category, "maoi-indirect-sympathomimetic-crisis");
      assert.equal(c.severity, "contraindicated");
      assert.ok(c.headline.includes("Vesicular Norepinephrine Flood"));
      assert.ok(c.molecularReceptorMechanism.includes("VMAT2"));
      assert.ok(c.antidoteOrRescueStrategy.includes("DIRECT-ACTING VASOPRESSORS"));
      assert.ok(c.antidoteOrRescueStrategy.includes("Phentolamine"));
    });

    it("Collision 2: Triggers for Linezolid + Amphetamine and Tranylcypromine + Dopamine", () => {
      const coll1 = findVasoactiveCollisions({
        drugIds: ["linezolid", "amphetamine"],
      });
      assert.ok(
        coll1.some((c) => c.category === "maoi-indirect-sympathomimetic-crisis"),
      );

      const coll2 = findVasoactiveCollisions({
        drugIds: ["tranylcypromine", "dopamine"],
      });
      assert.ok(
        coll2.some((c) => c.category === "maoi-indirect-sympathomimetic-crisis"),
      );
    });

    it("Collision 3: Milrinone PDE3 Accumulation in Renal Impairment triggers major alert", () => {
      const collisions = findVasoactiveCollisions({
        drugIds: ["milrinone"],
        host: { ...DEFAULT_HOST, kidney: "ckd" },
        crClMlMin: 25,
      });

      assert.equal(collisions.length, 1);
      const c = collisions[0];
      assert.equal(c.category, "milrinone-renal-accumulation");
      assert.equal(c.severity, "major");
      assert.ok(c.headline.includes("Milrinone Accumulation in Renal Impairment"));
      assert.ok(c.molecularReceptorMechanism.includes("80% to 90%"));
      assert.ok(c.clinicalAction.includes("MANDATORY DOSE REDUCTION"));
      assert.ok(c.antidoteOrRescueStrategy.includes("Dobutamine"));
    });

    it("Collision 3: Does NOT trigger for Milrinone when renal function is normal", () => {
      const collisions = findVasoactiveCollisions({
        drugIds: ["milrinone"],
        host: { ...DEFAULT_HOST, kidney: "ok" },
        crClMlMin: 95,
      });
      assert.equal(collisions.length, 0);
    });

    it("Collision 4: Inotropes in Dynamic LVOT Obstruction (HOCM / SAM) triggers contraindicated alert", () => {
      const collisions = findVasoactiveCollisions({
        drugIds: ["dobutamine"],
        hasLvotObstructionOrHocm: true,
      });

      assert.equal(collisions.length, 1);
      const c = collisions[0];
      assert.equal(c.category, "inotrope-lvot-obstruction-hocm");
      assert.equal(c.severity, "contraindicated");
      assert.ok(c.headline.includes("Venturi Collapse"));
      assert.ok(c.molecularReceptorMechanism.includes("Venturi effect"));
      assert.ok(c.antidoteOrRescueStrategy.includes("PHENYLEPHRINE"));
      assert.ok(c.antidoteOrRescueStrategy.includes("Volume expansion"));
    });

    it("Collision 4: Does NOT trigger for pure alpha-1 Phenylephrine in HOCM (it is the indicated rescue pressor)", () => {
      const collisions = findVasoactiveCollisions({
        drugIds: ["phenylephrine"],
        hasLvotObstructionOrHocm: true,
      });
      // Phenylephrine is NOT in INOTROPE_IDS
      assert.equal(collisions.length, 0);
    });
  });

  // ==========================================================================
  // 8. DESK DETECTION & COMPREHENSIVE REPORT GENERATION
  // ==========================================================================
  describe("Desk Detection & Comprehensive Report Generator", () => {
    it("vasoactiveOnDesk correctly analyzes and categorizes diverse regimens", () => {
      const result = vasoactiveOnDesk([
        "norepinephrine",
        "vasopressin",
        "metoprolol",
        "linezolid",
        "pseudoephedrine",
      ]);

      assert.equal(result.hasVasoactive, true);
      assert.equal(result.vasoactiveDrugs.length, 2);
      assert.equal(result.hasCatecholamines, true);
      assert.equal(result.hasNonAdrenergicVasopressors, true);
      assert.equal(result.hasBetaBlockers, true);
      assert.equal(result.hasMaoisInhibitors, true);
      assert.equal(result.hasIndirectSympathomimetics, true);
      assert.equal(result.hasMilrinone, false);
      assert.ok(result.detectedBetaBlockerIds.includes("metoprolol"));
      assert.ok(result.detectedMaoiIds.includes("linezolid"));
      assert.ok(result.detectedIndirectSympathomimeticIds.includes("pseudoephedrine"));
    });

    it("vasoactiveReportOnDesk produces rich critical care report with all sections", () => {
      const report = vasoactiveReportOnDesk(
        ["norepinephrine", "epinephrine", "propranolol"],
        DEFAULT_HOST,
        {
          arterialPh: 7.16,
          lactateMmolL: 5.5,
          scvO2Pct: 78,
          pvaCo2GapMmHg: 4.2,
          hasLvotObstructionOrHocm: false,
        },
      );

      assert.equal(report.onDesk.hasVasoactive, true);
      assert.equal(report.activeDrugs.length, 2);
      assert.ok(report.aggregatedHemodynamics);
      assert.ok(report.hyperlactatemiaEvaluation);
      assert.equal(
        report.hyperlactatemiaEvaluation?.classification,
        "benign-type-b-aerobic-glycolysis",
      );
      assert.ok(report.acidemiaEvaluation);
      assert.equal(report.acidemiaEvaluation?.isAcidemicUncouplingRisk, true);
      assert.ok(report.collisions.length >= 1);
      assert.equal(report.collisions[0].category, "beta-blocker-epinephrine-unopposed-alpha");
      assert.ok(report.clinicalPearls.length >= 6);
      assert.ok(report.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
    });

    it("handles empty drug list gracefully with neutral report", () => {
      const report = vasoactiveReportOnDesk([], DEFAULT_HOST);
      assert.equal(report.onDesk.hasVasoactive, false);
      assert.equal(report.activeDrugs.length, 0);
      assert.equal(report.collisions.length, 0);
      assert.ok(report.disclaimer.length > 50);
    });
  });
});
