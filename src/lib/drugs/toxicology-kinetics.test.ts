import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TOXICOLOGY_CDS_DISCLAIMER,
  TOXICOLOGY_CITATIONS,
  calculateRumackTreatmentLine,
  calculateRumackHighRiskLine,
  evaluateRumackMatthewNomogram,
  APAP_CLINICAL_PHASES,
  NAC_IV_REGIMENS,
  NAC_ANAPHYLACTOID_MANAGEMENT,
  NAC_STOPPING_CRITERIA,
  calculateOsmolalGap,
  TOXIC_ALCOHOL_PROFILES,
  FOMEPIZOLE_PROTOCOL,
  TOXIC_ALCOHOL_EXTRIP_HEMODIALYSIS,
  calculateSalicylateIonization,
  SALICYLATE_OVERDOSE_PROFILE,
  OPIOID_REVERSAL_PROFILE,
  calculateNaloxoneInfusionRate,
  toxicologyOnDesk,
  toxicologyReportOnDesk,
} from "./toxicology-kinetics";
import { DEFAULT_HOST } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

describe("Emergency Toxicology, Toxidrome Differentiation & Antidote Kinetics Engine", () => {
  // ==========================================================================
  // 1. STATUTORY CDS COMPLIANCE (FD&C Act § 520(o)(1)(E))
  // ==========================================================================
  describe("Regulatory Posture & Non-Device CDS Conformance", () => {
    it("exports statutory disclaimer explicitly referencing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(TOXICOLOGY_CDS_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(TOXICOLOGY_CDS_DISCLAIMER.includes("Non-Device Clinical Decision Support"));
      assert.ok(TOXICOLOGY_CDS_DISCLAIMER.includes("licensed healthcare professionals"));
      assert.ok(TOXICOLOGY_CDS_DISCLAIMER.includes("independent verification"));
      assert.ok(TOXICOLOGY_CDS_DISCLAIMER.includes("Prescribing Information"));
    });

    it("verifies disclaimer emphasizes non-prescriptive, educational decision support", () => {
      assert.ok(TOXICOLOGY_CDS_DISCLAIMER.includes("does not provide automated diagnostic conclusions"));
      assert.ok(TOXICOLOGY_CDS_DISCLAIMER.includes("does not generate infusion orders"));
      assert.ok(TOXICOLOGY_CDS_DISCLAIMER.includes("prescription directives"));
      assert.ok(TOXICOLOGY_CDS_DISCLAIMER.includes("hemodialysis commands"));
    });

    it("contains authoritative peer-reviewed emergency toxicology citations", () => {
      assert.ok(TOXICOLOGY_CITATIONS.length >= 8);
      assert.ok(TOXICOLOGY_CITATIONS.some((c) => c.includes("Rumack BH")));
      assert.ok(TOXICOLOGY_CITATIONS.some((c) => c.includes("Smilkstein MJ")));
      assert.ok(TOXICOLOGY_CITATIONS.some((c) => c.includes("EXTRIP")));
      assert.ok(TOXICOLOGY_CITATIONS.some((c) => c.includes("Goldfrank")));
    });

    it("report generator embeds statutory disclaimer with regulatory footers", () => {
      const report = toxicologyReportOnDesk(["acetaminophen"], DEFAULT_HOST);
      assert.ok(report.disclaimer.includes(TOXICOLOGY_CDS_DISCLAIMER));
      assert.ok(report.disclaimer.includes(NOT_CLEARED));
      assert.ok(report.disclaimer.includes(PI_FOOTER));
    });
  });

  // ==========================================================================
  // 2. ACETAMINOPHEN (APAP) OVERDOSE & RUMACK-MATTHEW NOMOGRAM KINETICS
  // ==========================================================================
  describe("Acetaminophen Overdose & Rumack-Matthew Nomogram Kinetics", () => {
    it("calculates conventional 150-treatment line correctly at key nomogram points", () => {
      // Equation: y = 150 * e^(-0.17325 * (t - 4))
      const at4h = calculateRumackTreatmentLine(4);
      assert.equal(at4h, 150.0);

      const at8h = calculateRumackTreatmentLine(8);
      assert.equal(at8h, 75.0);

      const at12h = calculateRumackTreatmentLine(12);
      assert.equal(at12h, 37.5);

      const at24h = calculateRumackTreatmentLine(24);
      assert.equal(at24h, 4.7);

      // Null outside 4 to 24 hours
      assert.equal(calculateRumackTreatmentLine(3.9), null);
      assert.equal(calculateRumackTreatmentLine(24.5), null);
      assert.equal(calculateRumackTreatmentLine(-1), null);
    });

    it("calculates high-risk 300 line correctly at key nomogram points", () => {
      // Equation: y = 300 * e^(-0.17325 * (t - 4))
      const at4h = calculateRumackHighRiskLine(4);
      assert.equal(at4h, 300.0);

      const at8h = calculateRumackHighRiskLine(8);
      assert.equal(at8h, 150.0);

      const at12h = calculateRumackHighRiskLine(12);
      assert.equal(at12h, 75.0);

      assert.equal(calculateRumackHighRiskLine(2), null);
      assert.equal(calculateRumackHighRiskLine(25), null);
    });

    it("evaluates pre-nomogram phase (< 4h) appropriately", () => {
      const earlyNormal = evaluateRumackMatthewNomogram({
        hoursPostIngestion: 2,
        serumApapMcgMl: 80,
      });
      assert.equal(earlyNormal.band, "too-early");
      assert.equal(earlyNormal.nacIndicated, false);
      assert.ok(earlyNormal.nacUrgency.includes("4 hours post-ingestion"));

      const earlyMassive = evaluateRumackMatthewNomogram({
        hoursPostIngestion: 2,
        serumApapMcgMl: 350,
      });
      assert.equal(earlyMassive.band, "too-early");
      assert.equal(earlyMassive.nacIndicated, true);
      assert.ok(earlyMassive.nacUrgency.includes("Initiate IV NAC immediately"));
    });

    it("evaluates late presentation phase (> 24h) appropriately", () => {
      const late = evaluateRumackMatthewNomogram({
        hoursPostIngestion: 36,
        serumApapMcgMl: 25,
      });
      assert.equal(late.band, "late-presentation");
      assert.equal(late.nacIndicated, true);
      assert.ok(late.clinicalGuidance.includes("valid only between 4 and 24 hours"));
    });

    it("evaluates nomogram bands between 4 and 24 hours", () => {
      // Below line at 8h (threshold is 75)
      const below = evaluateRumackMatthewNomogram({
        hoursPostIngestion: 8,
        serumApapMcgMl: 50,
      });
      assert.equal(below.band, "below-treatment");
      assert.equal(below.nacIndicated, false);
      assert.equal(below.treatmentLineMcgMl, 75.0);

      // Above treatment line at 8h (between 75 and 150)
      const above = evaluateRumackMatthewNomogram({
        hoursPostIngestion: 8,
        serumApapMcgMl: 100,
      });
      assert.equal(above.band, "above-treatment");
      assert.equal(above.nacIndicated, true);

      // High-risk line at 8h (>= 150)
      const highRisk = evaluateRumackMatthewNomogram({
        hoursPostIngestion: 8,
        serumApapMcgMl: 180,
      });
      assert.equal(highRisk.band, "high-risk");
      assert.equal(highRisk.nacIndicated, true);
    });

    it("models high-risk modifiers: chronic ethanol, fasting, isoniazid, and acute ethanol", () => {
      const modified = evaluateRumackMatthewNomogram({
        hoursPostIngestion: 8,
        serumApapMcgMl: 70, // Just below 75 threshold
        chronicAlcoholOrInducer: true,
        malnutritionOrFasting: true,
        isoniazidCoIngestion: true,
      });
      assert.equal(modified.nacIndicated, true);
      assert.ok(modified.riskModifiers.some((m) => m.includes("CYP2E1 expression")));
      assert.ok(modified.riskModifiers.some((m) => m.includes("glutathione stores")));
      assert.ok(modified.riskModifiers.some((m) => m.includes("Isoniazid")));

      const acuteAlcohol = evaluateRumackMatthewNomogram({
        hoursPostIngestion: 8,
        serumApapMcgMl: 100,
        acuteAlcoholCoIngestion: true,
      });
      assert.ok(acuteAlcohol.riskModifiers.some((m) => m.includes("competitive substrate inhibitor")));
    });

    it("validates four clinical phases of APAP toxicity", () => {
      assert.ok(APAP_CLINICAL_PHASES.phase1);
      assert.ok(APAP_CLINICAL_PHASES.phase2);
      assert.ok(APAP_CLINICAL_PHASES.phase3);
      assert.ok(APAP_CLINICAL_PHASES.phase4);

      assert.equal(APAP_CLINICAL_PHASES.phase1.phase, "Phase I");
      assert.ok(APAP_CLINICAL_PHASES.phase1.laboratoryFindings.some((f) => f.includes("normal (< 40-50 U/L)")));

      assert.equal(APAP_CLINICAL_PHASES.phase2.phase, "Phase II");
      assert.ok(APAP_CLINICAL_PHASES.phase2.pathophysiology.includes("centrilobular (Zone 3)"));
      assert.ok(APAP_CLINICAL_PHASES.phase2.pathophysiology.includes("30% baseline"));

      assert.equal(APAP_CLINICAL_PHASES.phase3.phase, "Phase III");
      assert.ok(APAP_CLINICAL_PHASES.phase3.clinicalName.includes("Peak Hepatotoxicity"));
      assert.ok(APAP_CLINICAL_PHASES.phase3.pathophysiology.includes("centrilobular (Zone 3)"));
      assert.ok(APAP_CLINICAL_PHASES.phase3.laboratoryFindings.some((f) => f.includes("10,000 to 20,000 U/L")));

      assert.equal(APAP_CLINICAL_PHASES.phase4.phase, "Phase IV");
      assert.ok(APAP_CLINICAL_PHASES.phase4.pathophysiology.includes("complete histological recovery"));
    });

    it("validates IV NAC protocols (21-hour 3-bag and 20-hour 2-bag)", () => {
      const threeBag = NAC_IV_REGIMENS.threeBag21h;
      assert.equal(threeBag.totalDurationHours, 21);
      assert.equal(threeBag.totalDoseMgKg, 300);
      assert.equal(threeBag.bags.length, 3);
      assert.equal(threeBag.bags[0].doseMgKg, 150);
      assert.equal(threeBag.bags[1].doseMgKg, 50);
      assert.equal(threeBag.bags[2].doseMgKg, 100);

      const twoBag = NAC_IV_REGIMENS.twoBag20h;
      assert.equal(twoBag.totalDurationHours, 20);
      assert.equal(twoBag.totalDoseMgKg, 300);
      assert.equal(twoBag.bags.length, 2);
      assert.equal(twoBag.bags[0].doseMgKg, 200);
      assert.equal(twoBag.bags[1].doseMgKg, 100);
    });

    it("asserts non-IgE anaphylactoid reaction management protocol", () => {
      assert.equal(NAC_ANAPHYLACTOID_MANAGEMENT.isIgEMediated, false);
      assert.ok(NAC_ANAPHYLACTOID_MANAGEMENT.pathophysiology.includes("Non-immune (non-IgE)"));
      assert.ok(NAC_ANAPHYLACTOID_MANAGEMENT.steppedManagement.some((s) => s.includes("pause or hold")));
      assert.ok(NAC_ANAPHYLACTOID_MANAGEMENT.steppedManagement.some((s) => s.includes("H1-antihistamine")));
      assert.ok(NAC_ANAPHYLACTOID_MANAGEMENT.steppedManagement.some((s) => s.includes("RESTART IV NAC at a reduced infusion rate")));
    });

    it("verifies NAC stopping criteria requirements", () => {
      assert.ok(NAC_STOPPING_CRITERIA.criteria.some((c) => c.includes("APAP is undetectable")));
      assert.ok(NAC_STOPPING_CRITERIA.criteria.some((c) => c.includes("consistently declining")));
      assert.ok(NAC_STOPPING_CRITERIA.criteria.some((c) => c.includes("INR is < 2.0")));
    });
  });

  // ==========================================================================
  // 3. TOXIC ALCOHOLS & FOMEPIZOLE / HEMODIALYSIS KINETICS
  // ==========================================================================
  describe("Toxic Alcohols & Fomepizole / Hemodialysis Kinetics", () => {
    it("calculates serum osmolal gap accurately with and without ethanol", () => {
      // Normal case: Na 140, Gluc 90, BUN 14, EtOH 0, Measured Osm 290
      // Calc = 2*140 + 90/18 + 14/2.8 = 280 + 5 + 5 = 290. Gap = 0.
      const normalResult = calculateOsmolalGap({
        measuredOsmolality: 290,
        sodiumMeqL: 140,
        glucoseMgDl: 90,
        bunMgDl: 14,
        ethanolMgDl: 0,
      });
      assert.equal(normalResult.calculatedOsmolality, 290.0);
      assert.equal(normalResult.osmolalGap, 0.0);
      assert.equal(normalResult.isGapElevated, false);

      // Elevated toxic alcohol case: Measured 335, Calc 290, Gap = 45 mOsm/kg
      const elevatedResult = calculateOsmolalGap({
        measuredOsmolality: 335,
        sodiumMeqL: 140,
        glucoseMgDl: 90,
        bunMgDl: 14,
        ethanolMgDl: 0,
      });
      assert.equal(elevatedResult.osmolalGap, 45.0);
      assert.equal(elevatedResult.isGapElevated, true);

      // Ethanol present: EtOH 230 mg/dL -> 230 / 4.6 = 50 mOsm/kg
      const withEtoh = calculateOsmolalGap({
        measuredOsmolality: 342,
        sodiumMeqL: 140,
        glucoseMgDl: 90,
        bunMgDl: 14,
        ethanolMgDl: 230,
      });
      assert.equal(withEtoh.calculatedOsmolality, 340.0);
      assert.equal(withEtoh.osmolalGap, 2.0);
      assert.equal(withEtoh.isGapElevated, false);
    });

    it("articulates gap trade-off kinetics", () => {
      const res = calculateOsmolalGap({
        measuredOsmolality: 320,
        sodiumMeqL: 140,
        glucoseMgDl: 90,
        bunMgDl: 14,
      });
      assert.ok(res.gapTradeOffNote.includes("Gap Trade-Off"));
      assert.ok(res.gapTradeOffNote.includes("osmolal gap to progressively narrow/normalize"));
      assert.ok(res.gapTradeOffNote.includes("High Anion Gap Metabolic Acidosis"));
    });

    it("verifies methanol pathway, retinal/putaminal pathology, and leucovorin co-factor", () => {
      const m = TOXIC_ALCOHOL_PROFILES.methanol;
      assert.equal(m.id, "methanol");
      assert.equal(m.toxicMetabolite, "Formic Acid (Formate)");
      assert.ok(m.metabolicPathway.includes("Formaldehyde"));
      assert.ok(m.metabolicPathway.includes("Formic Acid"));
      assert.ok(m.primaryPathology.some((p) => p.includes("Cytochrome c Oxidase")));
      assert.ok(m.primaryPathology.some((p) => p.includes("snowfield blindness")));
      assert.ok(m.primaryPathology.some((p) => p.includes("putaminal hemorrhagic necrosis")));
      assert.ok(m.coFactorTherapy.agents.includes("Leucovorin"));
      assert.ok(m.coFactorTherapy.biochemicalMechanism.includes("tetrahydrofolate (THF)"));
    });

    it("verifies ethylene glycol pathway, calcium oxalate precipitation, and thiamine/pyridoxine co-factors", () => {
      const eg = TOXIC_ALCOHOL_PROFILES["ethylene-glycol"];
      assert.equal(eg.id, "ethylene-glycol");
      assert.ok(eg.metabolicPathway.includes("Glycolic Acid"));
      assert.ok(eg.metabolicPathway.includes("Oxalic Acid"));
      assert.ok(eg.primaryPathology.some((p) => p.includes("Calcium Oxalate Monohydrate")));
      assert.ok(eg.primaryPathology.some((p) => p.includes("acute tubular necrosis")));
      assert.ok(eg.primaryPathology.some((p) => p.includes("profound hypocalcemia")));
      assert.ok(eg.primaryPathology.some((p) => p.includes("QTc prolongation")));
      assert.ok(eg.coFactorTherapy.agents.includes("Thiamine"));
      assert.ok(eg.coFactorTherapy.agents.includes("Pyridoxine"));
      assert.ok(eg.coFactorTherapy.biochemicalMechanism.includes("alpha-hydroxy-beta-ketoadipate"));
      assert.ok(eg.coFactorTherapy.biochemicalMechanism.includes("glycine"));
    });

    it("validates fomepizole dosing protocol and 8,000-fold affinity over ethanol", () => {
      assert.ok(FOMEPIZOLE_PROTOCOL.affinityVsEthanol.includes("8,000-fold"));
      assert.ok(FOMEPIZOLE_PROTOCOL.pharmacology.includes("Ki of ~0.1 uM"));
      assert.ok(FOMEPIZOLE_PROTOCOL.loadingDose.includes("15 mg/kg IV"));
      assert.ok(FOMEPIZOLE_PROTOCOL.maintenanceDoses.includes("10 mg/kg IV every 12 hours for 4 doses"));
      assert.ok(FOMEPIZOLE_PROTOCOL.escalatedMaintenanceDose.includes("15 mg/kg IV every 12 hours beginning at dose 5"));
      assert.ok(FOMEPIZOLE_PROTOCOL.escalatedMaintenanceDose.includes("auto-induction"));
    });

    it("verifies EXTRIP hemodialysis indications for toxic alcohols", () => {
      const hd = TOXIC_ALCOHOL_EXTRIP_HEMODIALYSIS;
      assert.ok(hd.indications.some((i) => i.includes("Arterial pH < 7.25")));
      assert.ok(hd.indications.some((i) => i.includes(">= 50 mg/dL")));
      assert.ok(hd.indications.some((i) => i.includes("Visual impairment")));
      assert.ok(hd.indications.some((i) => i.includes("Acute kidney injury")));
    });
  });

  // ==========================================================================
  // 4. SALICYLATE OVERDOSE & URINARY ALKALINIZATION ION-TRAPPING
  // ==========================================================================
  describe("Salicylate Overdose & Urinary Alkalinization Ion-Trapping", () => {
    it("calculates Henderson-Hasselbalch ionization and clearance acceleration across urine pH", () => {
      // At pH 3.5 = pKa 3.5 -> ratio = 10^0 = 1, % ionized = 50%
      const at35 = calculateSalicylateIonization(3.5);
      assert.equal(at35.ionizedRatio, 1.0);
      assert.equal(at35.ionizedPercent, 50.0);

      // At pH 5.5 -> ratio = 10^(5.5 - 3.5) = 10^2 = 100, % ionized = 100/101 = 99.01%
      const at55 = calculateSalicylateIonization(5.5);
      assert.equal(at55.ionizedRatio, 100.0);
      assert.ok(at55.ionizedPercent > 99.0 && at55.ionizedPercent < 99.1);

      // At pH 7.5 -> ratio = 10^4 = 10,000, % ionized = 99.99%
      const at75 = calculateSalicylateIonization(7.5);
      assert.equal(at75.ionizedRatio, 10000.0);
      assert.ok(at75.ionizedPercent > 99.98 && at75.ionizedPercent <= 100);
      assert.ok(at75.clearanceFoldIncreaseApprox >= 10);
      assert.ok(at75.clinicalSignificance.includes("Optimal Ion-Trapping achieved"));

      // At pH 8.0 -> ratio = 10^4.5 ~= 31,622.8
      const at80 = calculateSalicylateIonization(8.0);
      assert.ok(at80.ionizedPercent > 99.99);
      assert.ok(at80.clearanceFoldIncreaseApprox >= 15);
    });

    it("details dual acid-base disturbance (respiratory alkalosis + metabolic acidosis)", () => {
      const d = SALICYLATE_OVERDOSE_PROFILE.dualAcidBaseMechanics;
      assert.ok(d.primaryRespiratoryAlkalosis.includes("medullary respiratory center"));
      assert.ok(d.primaryMetabolicAcidosis.includes("uncouple oxidative phosphorylation"));
      assert.ok(d.netAdultPresentation.includes("Mixed respiratory alkalosis and high anion gap metabolic acidosis"));
      assert.ok(d.cnsToxicityRisk.includes("blood-brain barrier"));
    });

    it("verifies mandatory potassium rule and paradoxical aciduria mechanism", () => {
      const k = SALICYLATE_OVERDOSE_PROFILE.potassiumRule;
      assert.ok(k.physiologicalMechanism.includes("H+/K+ ATPase"));
      assert.ok(k.paradoxicalAciduria.includes("paradoxical aciduria"));
      assert.ok(k.targetSerumPotassium.includes(">= 4.0 to 4.5 mEq/L"));
      assert.ok(k.replacementInstruction.includes("20 to 40 mEq KCl"));
    });

    it("verifies emergent hemodialysis thresholds for salicylates", () => {
      const hd = SALICYLATE_OVERDOSE_PROFILE.extripHemodialysisCriteria;
      assert.equal(hd.acuteLevelMgDl, 100);
      assert.equal(hd.chronicLevelMgDl, 60);
      assert.ok(hd.clinicalCriteria.some((c) => c.includes("Altered mental status")));
      assert.ok(hd.clinicalCriteria.some((c) => c.includes("pulmonary edema")));
    });
  });

  // ==========================================================================
  // 5. OPIOID OVERDOSE & NALOXONE TITRATION KINETICS
  // ==========================================================================
  describe("Opioid Overdose & Naloxone Titration Kinetics", () => {
    it("confirms competitive mu-opioid receptor antagonist properties and half-life", () => {
      const p = OPIOID_REVERSAL_PROFILE.naloxonePharmacology;
      assert.ok(p.receptorMechanism.includes("mu-opioid receptor (MOR) antagonist"));
      assert.ok(p.muReceptorAffinityKi.includes("Ki ~ 1 to 2 nM"));
      assert.ok(p.halfLifeMinutes.includes("30 to 90 minutes"));
    });

    it("identifies high renarcotization risk opioids (methadone, fentanyl, extended-release)", () => {
      const r = OPIOID_REVERSAL_PROFILE.renarcotizationKinetics;
      assert.ok(r.pathophysiology.includes("Renarcotization is the recurrence of lethal central respiratory depression"));
      assert.ok(r.highRiskOpioids.some((o) => o.id === "methadone" && o.halfLifeOrLipophilicity.includes("24 to 36 hours")));
      assert.ok(r.highRiskOpioids.some((o) => o.id === "fentanyl" && o.halfLifeOrLipophilicity.includes("adipose")));
    });

    it("calculates continuous naloxone infusion rate (2/3 of successful initial bolus)", () => {
      // 0.4 mg bolus -> 2/3 * 0.4 = 0.267 mg/h -> rounded to 0.27 mg/h
      const inf1 = calculateNaloxoneInfusionRate(0.4);
      assert.equal(inf1.initialBolusMg, 0.4);
      assert.equal(inf1.hourlyInfusionRateMg, 0.27);
      assert.ok(inf1.mixingInstruction.includes("4 mg Naloxone to 1,000 mL"));

      // 1.2 mg bolus -> 2/3 * 1.2 = 0.8 mg/h
      const inf2 = calculateNaloxoneInfusionRate(1.2);
      assert.equal(inf2.hourlyInfusionRateMg, 0.8);

      // Observation window
      assert.ok(inf1.observationRecommendation.includes("4–6 hours"));
    });
  });

  // ==========================================================================
  // 6. DESK DETECTION & COMPREHENSIVE REPORT GENERATOR
  // ==========================================================================
  describe("Desk Detection & Comprehensive Report Generator", () => {
    it("correctly identifies APAP, toxic alcohols, salicylates, opioids, and antidotes", () => {
      const desk = toxicologyOnDesk([
        "acetaminophen",
        "aspirin",
        "methadone",
        "naloxone",
        "fomepizole",
        "isoniazid",
      ]);

      assert.equal(desk.hasToxicologyAgent, true);
      assert.equal(desk.hasApap, true);
      assert.equal(desk.hasSalicylate, true);
      assert.equal(desk.hasOpioid, true);
      assert.equal(desk.hasAntidote, true);
      assert.equal(desk.hasCyp2e1Inducer, true);
      assert.equal(desk.hasHighRenarcotizationRisk, true);
      assert.ok(desk.detectedApapIds.includes("acetaminophen"));
      assert.ok(desk.detectedSalicylateIds.includes("aspirin"));
      assert.ok(desk.detectedOpioidIds.includes("methadone"));
      assert.ok(desk.detectedRenarcotizationRiskIds.includes("methadone"));
      assert.ok(desk.detectedAntidoteIds.includes("naloxone"));
      assert.ok(desk.detectedAntidoteIds.includes("fomepizole"));
      assert.ok(desk.detectedCyp2e1InducerIds.includes("isoniazid"));
    });

    it("handles non-toxicology regimens gracefully", () => {
      const desk = toxicologyOnDesk(["atorvastatin", "metformin", "lisinopril"]);
      assert.equal(desk.hasToxicologyAgent, false);
      assert.equal(desk.hasApap, false);
      assert.equal(desk.hasToxicAlcohol, false);
      assert.equal(desk.hasSalicylate, false);
      assert.equal(desk.hasOpioid, false);
      assert.equal(desk.allToxicologyIds.length, 0);
      assert.ok(desk.summary.includes("No primary emergency toxicology compounds"));
    });

    it("generates end-to-end toxicology report with active alerts and calculations", () => {
      const report = toxicologyReportOnDesk(
        ["acetaminophen", "methadone", "aspirin"],
        DEFAULT_HOST,
        {
          apapNomogram: {
            hoursPostIngestion: 8,
            serumApapMcgMl: 120, // Above treatment line of 75
          },
          urinePhForSalicylate: 6.0,
          initialNaloxoneBolusMg: 0.4,
        },
      );

      assert.equal(report.onDesk.hasToxicologyAgent, true);
      assert.ok(report.apapEvaluation);
      assert.equal(report.apapEvaluation.nacIndicated, true);
      assert.ok(report.salicylateIonizationEvaluation);
      assert.equal(report.salicylateIonizationEvaluation.urinePh, 6.0);
      assert.ok(report.naloxoneInfusionCalculation);
      assert.equal(report.naloxoneInfusionCalculation.hourlyInfusionRateMg, 0.27);

      // Alerts generated for APAP, Salicylate, and Opioid Renarcotization
      assert.ok(report.alerts.length >= 3);
      assert.ok(report.alerts.some((a) => a.category === "APAP"));
      assert.ok(report.alerts.some((a) => a.category === "Salicylate"));
      assert.ok(report.alerts.some((a) => a.category === "Opioid" && a.tier === "critical"));

      // Clinical pillars present
      assert.ok(report.clinicalPillars.apap.phases);
      assert.ok(report.clinicalPillars.toxicAlcohols.profiles);
      assert.ok(report.clinicalPillars.salicylates.profile);
      assert.ok(report.clinicalPillars.opioids.profile);
    });

    it("generates report with elevated osmolal gap alert when toxic alcohol specified", () => {
      const report = toxicologyReportOnDesk([], DEFAULT_HOST, {
        osmolalGap: {
          measuredOsmolality: 335,
          sodiumMeqL: 140,
          glucoseMgDl: 90,
          bunMgDl: 14,
        },
      });

      assert.ok(report.osmolalGapEvaluation);
      assert.equal(report.osmolalGapEvaluation.isGapElevated, true);
      assert.ok(report.alerts.some((a) => a.category === "ToxicAlcohol" && a.tier === "critical"));
    });
  });
});
