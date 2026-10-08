import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANESTHESIA_CDS_DISCLAIMER,
  NMBA_PROFILES,
  ALL_NMBA_IDS,
  AMINOSTEROID_NMBA_IDS,
  BENZYLISOQUINOLINIUM_NMBA_IDS,
  DEPOLARIZING_NMBA_IDS,
  REVERSAL_PROFILES,
  SEDATIVE_PROFILES,
  getNmbaProfile,
  getAllNmbaProfiles,
  getReversalProfile,
  getAllReversalProfiles,
  getSedativeProfile,
  getAllSedativeProfiles,
  evaluateTofDepth,
  calculateSugammadexDose,
  calculateNeostigmineGlycopyrrolateDose,
  evaluateSuccinylcholineHyperkalemiaRisk,
  evaluatePseudocholinesteraseDeficiency,
  evaluatePrisRisk,
  anesthesiaOnDesk,
  anesthesiaReportOnDesk,
} from "./anesthesia-reversal";
import { DEFAULT_HOST } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

describe("Comprehensive Anesthesia Reversal, NMBA Kinetics & ICU Sedation Engine", () => {
  // ==========================================================================
  // 1. STATUTORY REGULATORY POSTURE (FD&C Act § 520(o)(1)(E))
  // ==========================================================================
  describe("Regulatory Compliance & Non-Device CDS Posture", () => {
    it("exports statutory disclaimer explicitly referencing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(ANESTHESIA_CDS_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(ANESTHESIA_CDS_DISCLAIMER.includes("Non-Device Clinical Decision Support"));
      assert.ok(ANESTHESIA_CDS_DISCLAIMER.includes("licensed healthcare professionals"));
      assert.ok(ANESTHESIA_CDS_DISCLAIMER.includes("independent clinical verification"));
      assert.ok(ANESTHESIA_CDS_DISCLAIMER.includes("Prescribing Information"));
    });

    it("verifies non-prescriptive educational decision support language", () => {
      assert.ok(ANESTHESIA_CDS_DISCLAIMER.includes("does not provide automated diagnostic conclusions"));
      assert.ok(ANESTHESIA_CDS_DISCLAIMER.includes("does not generate medical orders or infusion pump directives"));
      assert.ok(ANESTHESIA_CDS_DISCLAIMER.includes("does not replace individualized bedside clinical evaluation"));
    });

    it("report generator embeds statutory disclaimer with NOT_CLEARED and PI_FOOTER", () => {
      const report = anesthesiaReportOnDesk(["rocuronium"], DEFAULT_HOST);
      assert.ok(report.disclaimer.includes(ANESTHESIA_CDS_DISCLAIMER));
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });
  });

  // ==========================================================================
  // 2. MASTER NMBA PROFILES & ELECTROPHYSIOLOGIC MONITORING (TOF/PTC)
  // ==========================================================================
  describe("Master NMBA Profiles & Electrophysiologic Monitoring", () => {
    it("verifies Succinylcholine depolarizing kinetics and nAChR agonist mechanism", () => {
      const sux = getNmbaProfile("succinylcholine");
      assert.ok(sux);
      assert.equal(sux.class, "depolarizing");
      assert.ok(sux.mechanism.includes("Nicotinic acetylcholine receptor (nAChR) agonist"));
      assert.ok(sux.mechanism.includes("Phase I block"));
      assert.ok(sux.mechanism.includes("Phase II block"));
      assert.equal(sux.sugammadexReversibility, "none");
      assert.equal(sux.sugammadexAffinityKdMicroMolar, null);
    });

    it("verifies Aminosteroids (Rocuronium, Vecuronium, Pancuronium) receptor antagonism", () => {
      const roc = getNmbaProfile("rocuronium");
      assert.ok(roc);
      assert.equal(roc.class, "non-depolarizing-aminosteroid");
      assert.equal(roc.sugammadexAffinityKdMicroMolar, 0.1);
      assert.equal(roc.sugammadexReversibility, "high");

      const vec = getNmbaProfile("vecuronium");
      assert.ok(vec);
      assert.equal(vec.class, "non-depolarizing-aminosteroid");
      assert.equal(vec.sugammadexAffinityKdMicroMolar, 1.5);
      assert.ok(vec.activeMetabolites.includes("3-desacetylvecuronium"));

      const pan = getNmbaProfile("pancuronium");
      assert.ok(pan);
      assert.equal(pan.class, "non-depolarizing-aminosteroid");
      assert.equal(pan.sugammadexAffinityKdMicroMolar, 3.5);
    });

    it("verifies Cisatracurium organ-independent Hofmann elimination and zero Sugammadex affinity", () => {
      const cis = getNmbaProfile("cisatracurium");
      assert.ok(cis);
      assert.equal(cis.class, "non-depolarizing-benzylisoquinolinium");
      assert.equal(cis.organIndependence, true);
      assert.ok(cis.eliminationPathway.includes("Hofmann elimination"));
      assert.ok(cis.eliminationPathway.includes("ester hydrolysis"));
      assert.equal(cis.sugammadexReversibility, "none");
      assert.equal(cis.sugammadexAffinityKdMicroMolar, null);
      assert.equal(cis.histamineRelease, "none");
    });

    it("verifies Train-of-Four (TOF) and Post-Tetanic Count (PTC) depth tier mapping", () => {
      // Intense block: TOF 0, PTC 0
      const intense = evaluateTofDepth({ twitches: 0, postTetanicCount: 0 });
      assert.equal(intense.depth, "intense");
      assert.equal(intense.neostigmineEligible, false);
      assert.equal(intense.recommendedSugammadexDoseMgKg, 16);

      // Deep block: TOF 0, PTC 1-2
      const deep = evaluateTofDepth({ twitches: 0, postTetanicCount: 2 });
      assert.equal(deep.depth, "deep");
      assert.equal(deep.neostigmineEligible, false);
      assert.equal(deep.recommendedSugammadexDoseMgKg, 4);

      // Moderate block: TOF 2
      const moderate = evaluateTofDepth({ twitches: 2 });
      assert.equal(moderate.depth, "moderate");
      assert.equal(moderate.neostigmineEligible, true);
      assert.equal(moderate.recommendedSugammadexDoseMgKg, 2);

      // Recovered: TOF 4, ratio >= 0.90
      const recovered = evaluateTofDepth({ twitches: 4, tofRatio: 0.95 });
      assert.equal(recovered.depth, "minimal-or-recovered");
      assert.equal(recovered.neostigmineEligible, false);
      assert.ok(recovered.clinicalCaveat.includes("PARADOXICAL WEAKNESS WARNING"));
    });
  });

  // ==========================================================================
  // 3. SUCCINYLCHOLINE SPECIAL PATHOPHYSIOLOGY EVALUATORS
  // ==========================================================================
  describe("Succinylcholine Phase I/II, Pseudocholinesterase & Hyperkalemia", () => {
    it("flags acute lethal hyperkalemia in severe thermal burns past 24-48 hours", () => {
      const burnEval = evaluateSuccinylcholineHyperkalemiaRisk({
        hasThermalBurn: true,
        burnDaysPostInjury: 10,
      });
      assert.equal(burnEval.isContraindicated, true);
      assert.ok(burnEval.mechanism.includes("EXTRAJUNCTIONAL nAChR UPREGULATION"));
      assert.ok(burnEval.predictedPotassiumSurgeMeqL.includes("+3.0 to > 5.0 mEq/L"));
      assert.ok(burnEval.safeAlternatives.some((a) => a.includes("Rocuronium")));
    });

    it("flags acute lethal hyperkalemia in denervation, spinal cord injury, or ALS", () => {
      const denervEval = evaluateSuccinylcholineHyperkalemiaRisk({
        hasSpinalCordInjuryOrStroke: true,
        denervationDaysPostInjury: 14,
      });
      assert.equal(denervEval.isContraindicated, true);

      const nmdEval = evaluateSuccinylcholineHyperkalemiaRisk({
        hasNeuromuscularDisease: true,
        neuromuscularConditionName: "Amyotrophic Lateral Sclerosis (ALS)",
      });
      assert.equal(nmdEval.isContraindicated, true);
      assert.ok(nmdEval.identifiedRiskFactors.some((r) => r.includes("Amyotrophic Lateral Sclerosis")));
    });

    it("evaluates Pseudocholinesterase (BChE) deficiency variants and dibucaine numbers", () => {
      // Homozygous atypical EaEa
      const eaea = evaluatePseudocholinesteraseDeficiency({
        variantType: "homozygous-atypical",
      });
      assert.ok(eaea.dibucaineNumber.includes("15 - 30"));
      assert.ok(eaea.expectedApneaDuration.includes("4 to 8+ hours"));
      assert.ok(eaea.contraindicatedInterventions.some((c) => c.includes("NEOSTIGMINE IS CONTRAINDICATED")));

      // Heterozygous atypical EuEa
      const euea = evaluatePseudocholinesteraseDeficiency({
        variantType: "heterozygous-atypical",
      });
      assert.ok(euea.dibucaineNumber.includes("50 - 65"));
      assert.ok(euea.expectedApneaDuration.includes("20 to 30 minutes"));

      // Normal EuEu
      const eueu = evaluatePseudocholinesteraseDeficiency({});
      assert.ok(eueu.dibucaineNumber.includes("70 - 85"));
      assert.ok(eueu.expectedApneaDuration.includes("5 to 10 minutes"));
    });
  });

  // ==========================================================================
  // 4. SUGAMMADEX CYCLODEXTRIN ENCAPSULATION & DOSING TIERS
  // ==========================================================================
  describe("Sugammadex 1:1 Encapsulation Kinetics & Weight-Based Dosing Tiers", () => {
    it("calculates 2 mg/kg for moderate block (TOF reappearance of T2)", () => {
      const res = calculateSugammadexDose({
        weightKg: 70,
        depthCategory: "moderate",
        nmbaId: "rocuronium",
      });
      assert.equal(res.recommendedDoseMgKg, 2);
      assert.equal(res.totalDoseMg, 140);
      assert.equal(res.vialsRequired200mg, 1);
      assert.equal(res.isEffectiveForAgent, true);
      assert.equal(res.affinityKdMicroMolar, 0.1);
    });

    it("calculates 4 mg/kg for deep block (PTC 1-2, TOF 0)", () => {
      const res = calculateSugammadexDose({
        weightKg: 80,
        depthCategory: "deep",
        nmbaId: "rocuronium",
      });
      assert.equal(res.recommendedDoseMgKg, 4);
      assert.equal(res.totalDoseMg, 320);
      assert.equal(res.vialsRequired200mg, 2);
      assert.equal(res.vialsRequired500mg, 1);
    });

    it("calculates 16 mg/kg for immediate rescue reversal post-rocuronium 1.2 mg/kg", () => {
      const res = calculateSugammadexDose({
        weightKg: 100,
        depthCategory: "immediate-rescue",
        nmbaId: "rocuronium",
      });
      assert.equal(res.recommendedDoseMgKg, 16);
      assert.equal(res.totalDoseMg, 1600);
      assert.equal(res.vialsRequired500mg, 4);
    });

    it("flags complete ineffectiveness and zero affinity for Cisatracurium or Succinylcholine", () => {
      const cisRes = calculateSugammadexDose({
        weightKg: 75,
        depthCategory: "moderate",
        nmbaId: "cisatracurium",
      });
      assert.equal(cisRes.isEffectiveForAgent, false);
      assert.equal(cisRes.affinityKdMicroMolar, null);
      assert.ok(cisRes.encapsulationKinetics.includes("ZERO AFFINITY"));

      const suxRes = calculateSugammadexDose({
        weightKg: 75,
        depthCategory: "moderate",
        nmbaId: "succinylcholine",
      });
      assert.equal(suxRes.isEffectiveForAgent, false);
      assert.equal(suxRes.affinityKdMicroMolar, null);
    });
  });

  // ==========================================================================
  // 5. SUGAMMADEX CRITICAL DRUG COLLISIONS
  // ==========================================================================
  describe("Sugammadex Hormonal Contraceptives & Displacement Collisions", () => {
    it("enforces mandatory 7-day non-hormonal barrier contraception counseling mandate", () => {
      const res = calculateSugammadexDose({
        weightKg: 65,
        depthCategory: "moderate",
        nmbaId: "rocuronium",
      });
      assert.ok(res.hormonalContraceptiveMandate.includes("MANDATORY CONTRACEPTIVE COUNSELING"));
      assert.ok(res.hormonalContraceptiveMandate.includes("7 CONSECUTIVE DAYS"));
      assert.ok(res.hormonalContraceptiveMandate.includes("34%"));

      // In report on desk
      const report = anesthesiaReportOnDesk(["sugammadex", "ethinyl-estradiol"], DEFAULT_HOST);
      const collision = report.activeCollisions.find((c) => c.id === "sugammadex-contraceptive-collision");
      assert.ok(collision);
      assert.equal(collision.severity, "critical");
      assert.ok(collision.managementGuidance.includes("7 CONSECUTIVE DAYS"));
    });

    it("detects Toremifene and Flucloxacillin competitive displacement and recurarization hazard", () => {
      const report = anesthesiaReportOnDesk(["sugammadex", "toremifene", "rocuronium"], DEFAULT_HOST);
      const collision = report.activeCollisions.find((c) => c.id === "sugammadex-displacement-recurarization");
      assert.ok(collision);
      assert.equal(collision.severity, "critical");
      assert.ok(collision.clinicalConsequence.includes("delayed recurarization"));
      assert.ok(collision.clinicalConsequence.includes("respiratory arrest"));
    });
  });

  // ==========================================================================
  // 6. CONVENTIONAL NEOSTIGMINE + GLYCOPYRROLATE REVERSAL
  // ==========================================================================
  describe("Neostigmine Ceiling Effect & Glycopyrrolate Muscarinic Co-Administration", () => {
    it("enforces neostigmine ceiling contraindication when TOF twitches = 0", () => {
      const res = calculateNeostigmineGlycopyrrolateDose({
        weightKg: 70,
        tofTwitches: 0,
      });
      assert.equal(res.isEligible, false);
      assert.ok(res.contraindicatedReason?.includes("CEILING EFFECT"));
      assert.equal(res.neostigmineTotalMg, 0);
      assert.equal(res.glycopyrrolateTotalMg, 0);
    });

    it("enforces paradoxical weakness contraindication when TOF ratio >= 0.90", () => {
      const res = calculateNeostigmineGlycopyrrolateDose({
        weightKg: 70,
        tofTwitches: 4,
        tofRatio: 0.92,
      });
      assert.equal(res.isEligible, false);
      assert.ok(res.contraindicatedReason?.includes("PARADOXICAL WEAKNESS CONTRAINDICATION"));
      assert.ok(res.contraindicatedReason?.includes("receptor desensitization"));
    });

    it("calculates neostigmine dosing with 5.0 mg max cap and exact 0.2 mg/mg glycopyrrolate ratio", () => {
      // 70 kg at T2 (0.05 mg/kg -> 3.5 mg neostigmine, 0.70 mg glycopyrrolate)
      const res70 = calculateNeostigmineGlycopyrrolateDose({
        weightKg: 70,
        tofTwitches: 2,
      });
      assert.equal(res70.isEligible, true);
      assert.equal(res70.neostigmineTotalMg, 3.5);
      assert.equal(res70.glycopyrrolateTotalMg, 0.7);
      assert.equal(res70.neostigmineMaxCapApplied, false);

      // 120 kg at T1 (0.07 mg/kg -> 8.4 mg -> capped at 5.0 mg neostigmine, 1.0 mg glycopyrrolate)
      const res120 = calculateNeostigmineGlycopyrrolateDose({
        weightKg: 120,
        tofTwitches: 1,
      });
      assert.equal(res120.isEligible, true);
      assert.equal(res120.neostigmineTotalMg, 5.0);
      assert.equal(res120.glycopyrrolateTotalMg, 1.0);
      assert.equal(res120.neostigmineMaxCapApplied, true);
      assert.ok(res120.glycopyrrolateRatioExplanation.includes("0.2 mg glycopyrrolate per 1.0 mg neostigmine"));
    });

    it("triggers collision alert when Neostigmine is administered without Glycopyrrolate", () => {
      const report = anesthesiaReportOnDesk(["neostigmine"], DEFAULT_HOST);
      const collision = report.activeCollisions.find((c) => c.id === "neostigmine-unopposed-muscarinic-hyperstimulation");
      assert.ok(collision);
      assert.equal(collision.severity, "critical");
      assert.ok(collision.clinicalConsequence.includes("asystole"));
    });
  });

  // ==========================================================================
  // 7. ICU SEDATION & PROPOFOL INFUSION SYNDROME (PRIS)
  // ==========================================================================
  describe("ICU Sedation-Analgesia & Propofol PRIS Safety Thresholds", () => {
    it("flags high PRIS risk when propofol exceeds 4-5 mg/kg/h or 48 hours", () => {
      // High rate: 5.0 mg/kg/h for 24 hours
      const evalHighRate = evaluatePrisRisk({
        rateMgKgH: 5.0,
        durationHours: 24,
      });
      assert.equal(evalHighRate.isHighPrisRisk, true);
      assert.ok(evalHighRate.mechanism.includes("MITOCHONDRIAL UNCOUPLING"));
      assert.ok(evalHighRate.hallmarkFeatures.some((h) => h.includes("Brugada-like ECG pattern")));

      // Prolonged duration: 3.5 mg/kg/h for 60 hours
      const evalProlonged = evaluatePrisRisk({
        rateMgKgH: 3.5,
        durationHours: 60,
      });
      assert.equal(evalProlonged.isHighPrisRisk, true);

      // Safe rate & duration: 2.0 mg/kg/h for 24 hours
      const evalSafe = evaluatePrisRisk({
        rateMgKgH: 2.0,
        durationHours: 24,
      });
      assert.equal(evalSafe.isHighPrisRisk, false);
    });

    it("verifies Dexmedetomidine delirium-sparing and non-respiratory-depressant profile", () => {
      const dex = getSedativeProfile("dexmedetomidine");
      assert.ok(dex);
      assert.equal(dex.deliriumRisk, "low-delirium-sparing");
      assert.equal(dex.respiratoryDepression, false);
      assert.ok(dex.clinicalPearls.some((p) => p.includes("SPARES RESPIRATORY DRIVE")));
    });

    it("verifies Benzodiazepines (Midazolam, Lorazepam) PADIS delirium hazard profile", () => {
      const mid = getSedativeProfile("midazolam");
      assert.ok(mid);
      assert.equal(mid.deliriumRisk, "high-independent-risk-factor");
      assert.ok(mid.keyWarnings.some((w) => w.includes("INDEPENDENT RISK FACTOR FOR ICU DELIRIUM")));

      const lor = getSedativeProfile("lorazepam");
      assert.ok(lor);
      assert.ok(lor.keyWarnings.some((w) => w.includes("PROPYLENE GLYCOL TOXICITY")));
    });
  });

  // ==========================================================================
  // 8. DESK DETECTION & END-TO-END CLINICAL REPORT GENERATION
  // ==========================================================================
  describe("Desk Detection & End-to-End Clinical Report Generator", () => {
    it("detects NMBAs, reversals, sedatives, contraceptives, and interactors accurately", () => {
      const desk = anesthesiaOnDesk([
        "rocuronium",
        "sugammadex",
        "propofol",
        "ethinyl-estradiol",
        "toremifene",
      ]);
      assert.equal(desk.hasNmba, true);
      assert.equal(desk.hasAminosteroidNmba, true);
      assert.equal(desk.hasReversal, true);
      assert.equal(desk.hasSugammadex, true);
      assert.equal(desk.hasSedative, true);
      assert.equal(desk.hasPropofol, true);
      assert.equal(desk.hasContraceptive, true);
      assert.equal(desk.hasDisplacementAgent, true);
    });

    it("generates comprehensive clinical report with all pillars and pearls", () => {
      const report = anesthesiaReportOnDesk(
        ["rocuronium", "sugammadex", "propofol", "glycopyrrolate"],
        DEFAULT_HOST,
        {
          weightKg: 85,
          tofTwitches: 2,
          propofolRateMgKgH: 2.5,
          propofolDurationHours: 12,
        },
      );
      assert.ok(report.onDesk.hasNmba);
      assert.ok(report.sugammadexDosing);
      assert.equal(report.sugammadexDosing.recommendedDoseMgKg, 2);
      assert.equal(report.sugammadexDosing.totalDoseMg, 170);
      assert.ok(report.neostigmineDosing);
      assert.ok(report.prisEvaluation);
      assert.equal(report.prisEvaluation.isHighPrisRisk, false);
      assert.ok(report.clinicalPearls.length >= 5);
      assert.ok(report.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
    });

    it("returns clean baseline report when desk contains non-anesthesia medications", () => {
      const report = anesthesiaReportOnDesk(["acetaminophen", "atorvastatin"], DEFAULT_HOST);
      assert.equal(report.onDesk.hasNmba, false);
      assert.equal(report.onDesk.hasReversal, false);
      assert.equal(report.onDesk.hasSedative, false);
      assert.ok(report.disclaimer.includes(ANESTHESIA_CDS_DISCLAIMER));
    });
  });
});
