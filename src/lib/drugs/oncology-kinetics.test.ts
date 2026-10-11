import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOST } from "./types";
import {
  ONCOLOGY_KINETICS_REGULATORY_DISCLAIMER,
  ONCOLOGY_CITATIONS,
  MTX_MOLECULAR_WEIGHT,
  HDMTX_MILESTONES,
  MTX_NOMOGRAM_CURVE,
  mtxUmolToMgL,
  mtxMgLToUmol,
  evaluateMtxElimination,
  calculateLeucovorinRescue,
  evaluateGlucarpidaseCriteria,
  evaluateUrineAlkalinization,
  detectMtxCollisions,
  evaluateThiopurineXoCollision,
  evaluateCniTriazoleCollision,
  oncologyOnDesk,
  oncologyReportOnDesk,
} from "./oncology-kinetics";

describe("Oncology Antimetabolite, Immunosuppressant & Rescue Pharmacology Engine", () => {
  describe("Regulatory Posture & Authoritative Citations (FD&C Act § 520(o)(1)(E))", () => {
    it("exports comprehensive regulatory disclaimer citing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(ONCOLOGY_KINETICS_REGULATORY_DISCLAIMER);
      assert.match(ONCOLOGY_KINETICS_REGULATORY_DISCLAIMER, /FD&C Act § 520\(o\)\(1\)\(E\)/i);
      assert.match(ONCOLOGY_KINETICS_REGULATORY_DISCLAIMER, /non-prescriptive/i);
      assert.match(ONCOLOGY_KINETICS_REGULATORY_DISCLAIMER, /educational.*decision-support/i);
      assert.match(ONCOLOGY_KINETICS_REGULATORY_DISCLAIMER, /no.*dosing orders/i);
    });

    it("cites landmark oncology, pharmacokinetics, and pharmacogenomics literature", () => {
      assert.ok(ONCOLOGY_CITATIONS.length >= 8);
      const joinedCitations = ONCOLOGY_CITATIONS.join(" ");
      assert.match(joinedCitations, /Ramsey/i);
      assert.match(joinedCitations, /Widemann/i);
      assert.match(joinedCitations, /Bleyer/i);
      assert.match(joinedCitations, /Relling.*CPIC/i);
      assert.match(joinedCitations, /Venkataramanan/i);
      assert.match(joinedCitations, /Glucarpidase/i);
    });

    it("maintains non-prescriptive posture across all clinical guidelines and nomograms", () => {
      const nomogramSample = JSON.stringify([
        calculateLeucovorinRescue(48, 2.5),
        evaluateGlucarpidaseCriteria({
          hoursPostStart: 48,
          mtxConcentrationUmolL: 8.0,
          baselineScrMgDl: 1.0,
          currentScrMgDl: 2.0,
        }),
        detectMtxCollisions(["ibuprofen", "omeprazole", "piperacillin-tazobactam"]),
        evaluateThiopurineXoCollision(["mercaptopurine", "allopurinol"]),
        evaluateCniTriazoleCollision(["tacrolimus", "voriconazole"]),
      ]);

      assert.doesNotMatch(nomogramSample, /\bprescribe\s+\d+\s*mg\b/i);
      assert.doesNotMatch(nomogramSample, /\btake\s+\d+\s*mg\s+daily\b/i);
      assert.doesNotMatch(nomogramSample, /\badminister\s+\d+\s*mg\s+po\b/i);
    });
  });

  describe("High-Dose Methotrexate (HDMTX) Kinetics & Nomograms", () => {
    it("accurately converts concentrations between µmol/L and mg/L (µg/mL)", () => {
      assert.equal(MTX_MOLECULAR_WEIGHT, 454.44);

      // 1 µmol/L = 0.454 mg/L
      const mgL1 = mtxUmolToMgL(1.0);
      assert.equal(mgL1, 0.454);

      // 10 µmol/L = 4.544 mg/L
      const mgL10 = mtxUmolToMgL(10.0);
      assert.equal(mgL10, 4.544);

      // Round-trip conversion (within rounding tolerance)
      const convertedBack = mtxMgLToUmol(mgL10);
      assert.ok(Math.abs(convertedBack - 10.0) < 0.01);

      // Handles zero and invalid inputs safely
      assert.equal(mtxUmolToMgL(0), 0);
      assert.equal(mtxUmolToMgL(-5), 0);
      assert.equal(mtxMgLToUmol(0), 0);
      assert.equal(mtxMgLToUmol(-5), 0);
    });

    it("validates canonical HDMTX elimination targets (24h <= 5 µM, 48h <= 1 µM, 72h <= 0.1 µM)", () => {
      assert.equal(HDMTX_MILESTONES.h24.targetUmolL, 5.0);
      assert.equal(HDMTX_MILESTONES.h48.targetUmolL, 1.0);
      assert.equal(HDMTX_MILESTONES.h72.targetUmolL, 0.1);
      assert.equal(HDMTX_MILESTONES.safeClearanceUmolL, 0.05);

      // 24h normal elimination
      const eval24Normal = evaluateMtxElimination(24, 4.0);
      assert.ok(eval24Normal);
      assert.equal(eval24Normal.status, "normal");
      assert.equal(eval24Normal.isDelayed, false);
      assert.equal(eval24Normal.targetCutoffUmolL, 5.0);

      // 24h delayed elimination
      const eval24Delayed = evaluateMtxElimination(24, 12.0);
      assert.ok(eval24Delayed);
      assert.equal(eval24Delayed.status, "delayed");
      assert.equal(eval24Delayed.isDelayed, true);

      // 48h normal elimination
      const eval48Normal = evaluateMtxElimination(48, 0.8);
      assert.ok(eval48Normal);
      assert.equal(eval48Normal.status, "normal");
      assert.equal(eval48Normal.isDelayed, false);
      assert.equal(eval48Normal.targetCutoffUmolL, 1.0);

      // 48h delayed elimination
      const eval48Delayed = evaluateMtxElimination(48, 2.5);
      assert.ok(eval48Delayed);
      assert.equal(eval48Delayed.status, "delayed");
      assert.equal(eval48Delayed.isDelayed, true);

      // 72h normal elimination
      const eval72Normal = evaluateMtxElimination(72, 0.08);
      assert.ok(eval72Normal);
      assert.equal(eval72Normal.status, "normal");
      assert.equal(eval72Normal.isDelayed, false);
      assert.equal(eval72Normal.targetCutoffUmolL, 0.1);

      // 72h delayed elimination
      const eval72Delayed = evaluateMtxElimination(72, 0.25);
      assert.ok(eval72Delayed);
      assert.equal(eval72Delayed.status, "delayed");
      assert.equal(eval72Delayed.isDelayed, true);

      // 72h severely delayed elimination (> 3x target)
      const eval72Severe = evaluateMtxElimination(72, 0.45);
      assert.ok(eval72Severe);
      assert.equal(eval72Severe.status, "severely-delayed");
      assert.equal(eval72Severe.isDelayed, true);

      // Safe clearance (< 0.05 µM)
      const evalCleared = evaluateMtxElimination(72, 0.03);
      assert.ok(evalCleared);
      assert.equal(evalCleared.status, "cleared");
      assert.equal(evalCleared.isCleared, true);

      // Invalid input handling
      assert.equal(evaluateMtxElimination(-5, 10), null);
      assert.equal(evaluateMtxElimination(24, -1), null);
    });

    it("calculates Leucovorin rescue nomogram dose escalations and enforces IV route for high doses", () => {
      // 1. Cleared MTX: Leucovorin discontinuation
      const resCleared = calculateLeucovorinRescue(72, 0.04);
      assert.ok(resCleared);
      assert.equal(resCleared.tier, "discontinue");
      assert.equal(resCleared.recommendedDoseMgM2, 0);

      // 2. 24h Normal elimination (MTX 3.5 µM <= 5.0 µM): standard rescue 15 mg/m² q6h PO or IV
      const res24Normal = calculateLeucovorinRescue(24, 3.5);
      assert.ok(res24Normal);
      assert.equal(res24Normal.tier, "standard");
      assert.equal(res24Normal.recommendedDoseMgM2, 15);
      assert.equal(res24Normal.frequencyHours, 6);
      assert.equal(res24Normal.route, "PO or IV");

      // 3. 24h Moderate delayed elimination (MTX 10.0 µM > 5.0 µM): escalate to 30 mg/m² q6h IV strictly
      const res24Mod = calculateLeucovorinRescue(24, 10.0);
      assert.ok(res24Mod);
      assert.equal(res24Mod.tier, "moderate-escalation");
      assert.equal(res24Mod.recommendedDoseMgM2, 30);
      assert.equal(res24Mod.route, "IV strictly");
      assert.match(res24Mod.routeRationale, /saturate intestinal Reduced Folate Carrier/i);

      // 4. 48h High-dose delayed elimination (MTX 6.5 µM > 5.0 µM): escalate to 100 mg/m² q6h IV strictly
      const res48High = calculateLeucovorinRescue(48, 6.5);
      assert.ok(res48High);
      assert.equal(res48High.tier, "high-dose-escalation");
      assert.equal(res48High.recommendedDoseMgM2, 100);
      assert.equal(res48High.frequencyHours, 6);
      assert.equal(res48High.route, "IV strictly");

      // 5. 48h Critical salvage delayed elimination (MTX 15.0 µM > 10.0 µM): escalate to 150 mg/m² q3h IV strictly
      const res48Crit = calculateLeucovorinRescue(48, 15.0);
      assert.ok(res48Crit);
      assert.equal(res48Crit.tier, "critical-salvage");
      assert.equal(res48Crit.recommendedDoseMgM2, 150);
      assert.equal(res48Crit.frequencyHours, 3);
      assert.equal(res48Crit.route, "IV strictly");

      // Invalid input handling
      assert.equal(calculateLeucovorinRescue(-1, 5), null);
      assert.equal(calculateLeucovorinRescue(24, -2), null);
    });

    it("evaluates Glucarpidase salvage criteria per Ramsey 2018 consensus and flags Leucovorin timing interference", () => {
      // Patient with 48h MTX 8.0 µM (> 5.0 µM threshold) and Cr rising from 0.9 to 1.8 mg/dL (+100% >= 50%)
      const eligible = evaluateGlucarpidaseCriteria({
        hoursPostStart: 48,
        mtxConcentrationUmolL: 8.0,
        baselineScrMgDl: 0.9,
        currentScrMgDl: 1.8,
      });

      assert.ok(eligible);
      assert.equal(eligible.meetsSalvageCriteria, true);
      assert.equal(eligible.mtxLevelElevated, true);
      assert.equal(eligible.renalImpairmentPresent, true);
      assert.equal(eligible.percentCreatinineRise, 100);
      assert.equal(eligible.withinOptimalWindow, true);
      assert.match(eligible.biochemicalMechanism, /DAMPA.*and L-glutamate/i);

      // Verify critical timing warning: 2h separation from Leucovorin
      assert.match(eligible.criticalTimingWarning, /DO NOT administer Leucovorin within 2 hours/i);

      // Verify immunoassay cross-reactivity warning
      assert.match(eligible.laboratoryAssayInterferenceWarning, /DAMPA metabolite strongly cross-reacts/i);
      assert.match(eligible.laboratoryAssayInterferenceWarning, /LC-MS\/MS or HPLC/i);

      // Patient with high MTX but preserved kidney function (Cr 1.0 -> 1.1, +10% < 50%)
      const noAki = evaluateGlucarpidaseCriteria({
        hoursPostStart: 48,
        mtxConcentrationUmolL: 8.0,
        baselineScrMgDl: 1.0,
        currentScrMgDl: 1.1,
      });
      assert.ok(noAki);
      assert.equal(noAki.meetsSalvageCriteria, false);
      assert.equal(noAki.mtxLevelElevated, true);
      assert.equal(noAki.renalImpairmentPresent, false);

      // Patient with AKI but normal MTX clearance (MTX 0.4 µM < 5.0 µM at 48h)
      const noMtx = evaluateGlucarpidaseCriteria({
        hoursPostStart: 48,
        mtxConcentrationUmolL: 0.4,
        baselineScrMgDl: 1.0,
        currentScrMgDl: 2.2,
      });
      assert.ok(noMtx);
      assert.equal(noMtx.meetsSalvageCriteria, false);
      assert.equal(noMtx.mtxLevelElevated, false);
      assert.equal(noMtx.renalImpairmentPresent, true);

      // Oliguria parameter triggers renal criterion
      const oliguriaCase = evaluateGlucarpidaseCriteria({
        hoursPostStart: 48,
        mtxConcentrationUmolL: 8.0,
        baselineScrMgDl: 1.0,
        currentScrMgDl: 1.2,
        oliguriaPresent: true,
      });
      assert.ok(oliguriaCase);
      assert.equal(oliguriaCase.meetsSalvageCriteria, true);
    });

    it("evaluates urine alkalinization targets (pH >= 7.0) and hydration volume (>= 3 L/m²/day)", () => {
      // Subtarget pH (5.5 < 7.0)
      const acidic = evaluateUrineAlkalinization({ urinePh: 5.5, hydrationRateLPerM2Day: 3.5 });
      assert.ok(acidic);
      assert.equal(acidic.isPhAdequate, false);
      assert.match(acidic.clinicalGuidance, /HOLD MTX INFUSION/i);
      assert.match(acidic.clinicalGuidance, /sodium bicarbonate/i);
      assert.match(acidic.clinicalGuidance, /acetazolamide/i);
      assert.match(acidic.biochemicalRationale, /7-hydroxy-methotrexate/i);

      // Target pH (7.4 >= 7.0) with adequate hydration (3.2 L/m²/day)
      const optimal = evaluateUrineAlkalinization({ urinePh: 7.4, hydrationRateLPerM2Day: 3.2 });
      assert.ok(optimal);
      assert.equal(optimal.isPhAdequate, true);
      assert.equal(optimal.isHydrationAdequate, true);
      assert.match(optimal.clinicalGuidance, /Adequate nephroprotective parameters/i);

      // Adequate pH but subtarget hydration (2.2 L/m²/day < 3.0)
      const lowFluid = evaluateUrineAlkalinization({ urinePh: 7.2, hydrationRateLPerM2Day: 2.2 });
      assert.ok(lowFluid);
      assert.equal(lowFluid.isPhAdequate, true);
      assert.equal(lowFluid.isHydrationAdequate, false);
      assert.match(lowFluid.clinicalGuidance, /SUBTARGET/i);

      // Invalid pH values
      assert.equal(evaluateUrineAlkalinization({ urinePh: 2.0 }), null);
      assert.equal(evaluateUrineAlkalinization({ urinePh: 10.0 }), null);
    });

    it("detects critical transporter collisions with HDMTX across NSAIDs, PPIs, Beta-lactams, and Salicylates", () => {
      // NSAID collision (OAT1/OAT3 inhibition)
      const nsaidCollisions = detectMtxCollisions(["ibuprofen", "ketorolac", "naproxen"]);
      assert.equal(nsaidCollisions.length, 3);
      assert.ok(nsaidCollisions.every((c) => c.collisionClass === "nsaid"));
      assert.ok(nsaidCollisions.every((c) => c.severity === "contraindicated"));
      assert.match(nsaidCollisions[0].transporterOrMechanism, /OAT1.*OAT3/i);

      // PPI collision (BCRP / OAT3 inhibition)
      const ppiCollisions = detectMtxCollisions(["omeprazole", "pantoprazole"]);
      assert.equal(ppiCollisions.length, 2);
      assert.ok(ppiCollisions.every((c) => c.collisionClass === "ppi"));
      assert.ok(ppiCollisions.every((c) => c.severity === "major"));
      assert.match(ppiCollisions[0].transporterOrMechanism, /BCRP.*ABCG2/i);
      assert.match(ppiCollisions[0].recommendation, /famotidine/i);

      // Beta-lactam competition (OAT1/OAT3 competitive secretion antagonism)
      const blCollisions = detectMtxCollisions(["piperacillin-tazobactam", "ampicillin"]);
      assert.equal(blCollisions.length, 2);
      assert.ok(blCollisions.every((c) => c.collisionClass === "beta-lactam"));
      assert.match(blCollisions[0].hazard, /compete directly.*OAT1\/OAT3/i);

      // Salicylate collision (albumin displacement + tubular competition)
      const salCollisions = detectMtxCollisions(["aspirin"]);
      assert.equal(salCollisions.length, 1);
      assert.equal(salCollisions[0].collisionClass, "salicylate");
      assert.equal(salCollisions[0].severity, "contraindicated");
      assert.match(salCollisions[0].transporterOrMechanism, /albumin binding displacement/i);

      // Clean list
      const clean = detectMtxCollisions(["acetaminophen", "famotidine", "ondansetron"]);
      assert.equal(clean.length, 0);
    });
  });

  describe("Thiopurines (6-MP / AZA) x Xanthine Oxidase Inhibitors", () => {
    it("identifies 6-MP / AZA x Allopurinol collision and mandates 67% to 75% dose reduction", () => {
      const collision6mp = evaluateThiopurineXoCollision(["mercaptopurine", "allopurinol"]);
      assert.equal(collision6mp.hasThiopurine, true);
      assert.equal(collision6mp.hasXoInhibitor, true);
      assert.equal(collision6mp.hasCollision, true);
      assert.equal(collision6mp.severity, "major");
      assert.equal(collision6mp.requiredDoseReductionPercent, 75);
      assert.equal(collision6mp.doseMultiplier, 0.25);
      assert.match(collision6mp.biochemicalMechanism, /HGPRT/i);
      assert.match(collision6mp.biochemicalMechanism, /6-thioguanine nucleotides/i);
      assert.match(collision6mp.clinicalGuidance, /67% to 75% dose reduction/i);

      const collisionAza = evaluateThiopurineXoCollision(["azathioprine", "allopurinol"]);
      assert.equal(collisionAza.hasCollision, true);
      assert.equal(collisionAza.requiredDoseReductionPercent, 75);
    });

    it("classifies Febuxostat + Thiopurine as contraindicated", () => {
      const febuxostatPair = evaluateThiopurineXoCollision(["azathioprine", "febuxostat"]);
      assert.equal(febuxostatPair.hasCollision, true);
      assert.equal(febuxostatPair.severity, "contraindicated");
      assert.match(febuxostatPair.clinicalGuidance, /CONTRAINDICATED COMBINATION/i);
    });

    it("evaluates pharmacogenomic synergy with TPMT and NUDT15 variant alleles", () => {
      const hostVariant = {
        ...DEFAULT_HOST,
        tpmt: "IM",
        nudt15: "IM",
      };

      const pgxCollision = evaluateThiopurineXoCollision(
        ["mercaptopurine", "allopurinol"],
        hostVariant,
      );

      assert.match(pgxCollision.pharmacogenomicSynergy.combinedPhenotypeWarning, /HIGH-RISK PHARMACOGENOMIC/i);
      assert.match(pgxCollision.pharmacogenomicSynergy.tpmtRiskDescription, /S-methylation/i);
      assert.match(pgxCollision.pharmacogenomicSynergy.nudt15RiskDescription, /6-thio-\(d\)GTP/i);
    });

    it("returns clean non-collision status for single agents", () => {
      const singleThio = evaluateThiopurineXoCollision(["mercaptopurine"]);
      assert.equal(singleThio.hasThiopurine, true);
      assert.equal(singleThio.hasXoInhibitor, false);
      assert.equal(singleThio.hasCollision, false);
      assert.equal(singleThio.requiredDoseReductionPercent, 0);

      const singleXo = evaluateThiopurineXoCollision(["allopurinol"]);
      assert.equal(singleXo.hasThiopurine, false);
      assert.equal(singleXo.hasXoInhibitor, true);
      assert.equal(singleXo.hasCollision, false);
    });
  });

  describe("Calcineurin Inhibitors (Tacrolimus / Cyclosporine) & Triazole Antifungals", () => {
    it("models strong CYP3A4 & P-gp inhibition causing 3- to 5-fold elevation in Tacrolimus trough", () => {
      const tacroVori = evaluateCniTriazoleCollision(["tacrolimus", "voriconazole"]);
      assert.equal(tacroVori.hasCni, true);
      assert.equal(tacroVori.hasTriazole, true);
      assert.equal(tacroVori.hasCollision, true);
      assert.equal(tacroVori.severity, "major");
      assert.equal(tacroVori.troughElevationFold, "3- to 5-fold");
      assert.equal(tacroVori.recommendedEmpiricDoseReductionPercent, 67);

      assert.ok(tacroVori.targetTroughRange);
      assert.equal(tacroVori.targetTroughRange.agent, "Tacrolimus");
      assert.match(tacroVori.targetTroughRange.troughRangeNgMl, /5–15 ng\/mL/i);

      assert.match(tacroVori.molecularMechanism, /CYP3A4.*CYP3A5.*P-glycoprotein/i);
      assert.match(tacroVori.monitoringFrequencyGuidance, /48 to 72 hours/i);
      assert.ok(tacroVori.clinicalToxicityManifestations.some((m) => m.includes("Nephrotoxicity")));
      assert.ok(tacroVori.clinicalToxicityManifestations.some((m) => m.includes("PRES")));
      assert.ok(tacroVori.clinicalToxicityManifestations.some((m) => m.includes("Hyperkalemia")));
      assert.ok(tacroVori.clinicalToxicityManifestations.some((m) => m.includes("Microangiopathy")));
    });

    it("evaluates Cyclosporine with Posaconazole / Isavuconazole", () => {
      const csaPosa = evaluateCniTriazoleCollision(["cyclosporine", "posaconazole"]);
      assert.equal(csaPosa.hasCollision, true);
      assert.equal(csaPosa.troughElevationFold, "2- to 3-fold");
      assert.equal(csaPosa.recommendedEmpiricDoseReductionPercent, 50);

      assert.ok(csaPosa.targetTroughRange);
      assert.equal(csaPosa.targetTroughRange.agent, "Cyclosporine");
      assert.match(csaPosa.targetTroughRange.troughRangeNgMl, /100–300 ng\/mL/i);
    });

    it("returns clean evaluation for single CNI or non-interfering regimens", () => {
      const cniOnly = evaluateCniTriazoleCollision(["tacrolimus"]);
      assert.equal(cniOnly.hasCni, true);
      assert.equal(cniOnly.hasTriazole, false);
      assert.equal(cniOnly.hasCollision, false);

      const unrelated = evaluateCniTriazoleCollision(["aspirin", "lisinopril"]);
      assert.equal(unrelated.hasCollision, false);
    });
  });

  describe("Detection Function & Full Report Generator", () => {
    it("oncologyOnDesk accurately detects primary antimetabolites, immunosuppressants, and rescue agents", () => {
      assert.equal(oncologyOnDesk(["methotrexate"]), true);
      assert.equal(oncologyOnDesk(["tacrolimus"]), true);
      assert.equal(oncologyOnDesk(["cyclosporine"]), true);
      assert.equal(oncologyOnDesk(["mercaptopurine"]), true);
      assert.equal(oncologyOnDesk(["azathioprine"]), true);
      assert.equal(oncologyOnDesk(["leucovorin"]), true);
      assert.equal(oncologyOnDesk(["glucarpidase"]), true);
      assert.equal(oncologyOnDesk(["6-mp"]), true);
      assert.equal(oncologyOnDesk(["prograf"]), true);

      // Clean desk
      assert.equal(oncologyOnDesk(["atorvastatin", "metformin"]), false);
      assert.equal(oncologyOnDesk([]), false);
    });

    it("oncologyReportOnDesk integrates multi-hit collisions and stratifies risk tiers", () => {
      // High-risk multi-collision regimen: MTX + Ketorolac + Omeprazole + Piperacillin-tazobactam
      const multiHitDesk = ["methotrexate", "ketorolac", "omeprazole", "piperacillin-tazobactam"];
      const rep = oncologyReportOnDesk(multiHitDesk, DEFAULT_HOST);

      assert.equal(rep.hasOncology, true);
      assert.equal(rep.overallRiskTier, "critical");
      assert.equal(rep.hdmtxReport.hasMethotrexate, true);
      assert.equal(rep.hdmtxReport.collisions.length, 3);
      assert.ok(rep.activeAlerts.length >= 3);
      assert.ok(rep.clinicalPearls.length >= 4);
      assert.match(rep.regulatoryNotice, /FD&C Act § 520\(o\)\(1\)\(E\)/i);

      // Combined Thiopurine + CNI regimen
      const comboDesk = ["mercaptopurine", "allopurinol", "tacrolimus", "voriconazole"];
      const comboRep = oncologyReportOnDesk(comboDesk, DEFAULT_HOST);

      assert.equal(comboRep.hasOncology, true);
      assert.equal(comboRep.overallRiskTier, "high");
      assert.equal(comboRep.thiopurineReport.hasCollision, true);
      assert.equal(comboRep.cniReport.hasCollision, true);
    });
  });
});
