import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  CNS_PROFILES,
  CNS_CLASS_DIVERGENCES,
  CNS_PENETRATION_REGULATORY_DISCLAIMER,
  KNOWN_PGP_INHIBITORS,
  getAllCnsPenetrationProfiles,
  getCnsProfileById,
  getAllCnsClassDivergences,
  getCnsClassDivergenceById,
  calculateBbpScore,
  detectCnsRisksOnTray,
} from "./cns-penetration";

describe("Blood-Brain Barrier Neuro-Pharmacokinetics Matrix", () => {
  // -------------------------------------------------------------
  // 1. Catalog Integrity & DRUG_BY_ID Validation
  // -------------------------------------------------------------
  describe("Catalog Integrity & DRUG_BY_ID Validation", () => {
    it("ensures every referenced drug ID in CNS_PROFILES exists in DRUG_BY_ID", () => {
      assert.ok(CNS_PROFILES.length >= 21, "Must contain at least 21 required drug profiles");
      for (const profile of CNS_PROFILES) {
        assert.ok(
          DRUG_BY_ID[profile.drugId],
          `Profile drug '${profile.drugId}' must exist in DRUG_BY_ID catalog`,
        );
      }
    });

    it("ensures every referenced drug ID in CNS_CLASS_DIVERGENCES exists in DRUG_BY_ID", () => {
      assert.ok(CNS_CLASS_DIVERGENCES.length >= 5, "Must contain at least 5 required class divergences");
      for (const div of CNS_CLASS_DIVERGENCES) {
        for (const drugId of div.comparatorA.drugIds) {
          assert.ok(
            DRUG_BY_ID[drugId],
            `ComparatorA drug '${drugId}' in divergence '${div.id}' must exist in DRUG_BY_ID`,
          );
        }
        for (const drugId of div.comparatorB.drugIds) {
          assert.ok(
            DRUG_BY_ID[drugId],
            `ComparatorB drug '${drugId}' in divergence '${div.id}' must exist in DRUG_BY_ID`,
          );
        }
      }
    });

    it("ensures all KNOWN_PGP_INHIBITORS exist in DRUG_BY_ID", () => {
      for (const inhId of KNOWN_PGP_INHIBITORS) {
        assert.ok(
          DRUG_BY_ID[inhId],
          `P-gp inhibitor '${inhId}' must exist in DRUG_BY_ID catalog`,
        );
      }
    });

    it("specifically validates all 21 prompt-specified drugs exist in profiles and catalog", () => {
      const requiredDrugs = [
        "diphenhydramine",
        "hydroxyzine",
        "cetirizine",
        "fexofenadine",
        "loratadine",
        "propranolol",
        "metoprolol",
        "atenolol",
        "nadolol",
        "dexamethasone",
        "prednisone",
        "ceftriaxone",
        "ampicillin",
        "meropenem",
        "vancomycin",
        "fluconazole",
        "voriconazole",
        "itraconazole",
        "loperamide",
        "morphine",
        "fentanyl",
      ];

      for (const drugId of requiredDrugs) {
        assert.ok(DRUG_BY_ID[drugId], `Required drug '${drugId}' must exist in DRUG_BY_ID`);
        const profile = getCnsProfileById(drugId);
        assert.ok(profile, `Required drug '${drugId}' must have a CNS penetration profile`);
      }
    });
  });

  // -------------------------------------------------------------
  // 2. Biophysical Determinants of BBB Permeability
  // -------------------------------------------------------------
  describe("Biophysical Determinants of BBB Permeability", () => {
    it("validates that all profiles have valid biophysical parameters within physiological limits", () => {
      for (const p of CNS_PROFILES) {
        const { molecularWeight, logP, tpsa, hBondDonors, hBondAcceptors } = p.biophysical;
        assert.ok(molecularWeight > 50 && molecularWeight < 2500, `Valid MW for ${p.drugId}`);
        assert.ok(logP >= -5 && logP <= 8, `Valid logP for ${p.drugId}`);
        assert.ok(tpsa >= 0 && tpsa <= 600, `Valid TPSA for ${p.drugId}`);
        assert.ok(hBondDonors >= 0, `Valid HBD for ${p.drugId}`);
        assert.ok(hBondAcceptors >= 0, `Valid HBA for ${p.drugId}`);
        assert.ok(
          ["neutral", "cationic", "anionic", "zwitterionic"].includes(p.biophysical.chargeAtPh74),
          `Valid physiological charge for ${p.drugId}`,
        );
      }
    });

    it("verifies Lipinski / Pajouhesh & Lenz CNS rules: small MW, optimal logP, low TPSA favor high penetration", () => {
      const fentanyl = getCnsProfileById("fentanyl")!;
      assert.ok(fentanyl.biophysical.molecularWeight < 400, "Fentanyl MW < 400 Da");
      assert.ok(fentanyl.biophysical.logP >= 1.5 && fentanyl.biophysical.logP <= 4.5, "Fentanyl lipophilic");
      assert.ok(fentanyl.biophysical.tpsa < 50, "Fentanyl TPSA < 50 Å²");
      assert.equal(fentanyl.biophysical.hBondDonors, 0);
      assert.equal(fentanyl.kinetics.brainTissueAccumulation, "High");
      assert.equal(fentanyl.kinetics.rateOfPenetration, "Rapid (seconds to minutes)");

      const vancomycin = getCnsProfileById("vancomycin")!;
      assert.ok(vancomycin.biophysical.molecularWeight > 1000, "Vancomycin macromolecule > 1000 Da");
      assert.ok(vancomycin.biophysical.tpsa > 200, "Vancomycin massive TPSA > 200 Å²");
      assert.ok(vancomycin.biophysical.hBondDonors > 10, "Vancomycin high HBD");
      assert.equal(vancomycin.kinetics.intactCsfPlasmaRatioPercent <= 1, true, "Vancomycin excluded intact");
    });
  });

  // -------------------------------------------------------------
  // 3. High-Yield Drug Class Divergences
  // -------------------------------------------------------------
  describe("High-Yield Drug Class Divergences", () => {
    it("verifies Antihistamine divergence: 1st-Gen sedating vs 2nd-Gen non-sedating", () => {
      const dph = getCnsProfileById("diphenhydramine")!;
      const fex = getCnsProfileById("fexofenadine")!;
      const cet = getCnsProfileById("cetirizine")!;
      const lor = getCnsProfileById("loratadine")!;

      // 1st gen
      assert.equal(dph.centralSedationDeliriumRisk, "High");
      assert.ok(dph.biophysical.tpsa < 20, "DPH has very low TPSA");
      assert.equal(dph.biophysical.pgpSubstrate, false, "DPH is not P-gp effluxed");
      assert.ok(dph.kinetics.intactCsfPlasmaRatioPercent >= 60);

      // 2nd gen
      assert.equal(fex.centralSedationDeliriumRisk, "Negligible");
      assert.equal(fex.biophysical.pgpSubstrate, true, "Fexofenadine is P-gp substrate");
      assert.equal(fex.kinetics.intactCsfPlasmaRatioPercent <= 5, true);

      assert.equal(cet.biophysical.chargeAtPh74, "zwitterionic");
      assert.equal(cet.biophysical.pgpSubstrate, true);
      assert.equal(cet.centralSedationDeliriumRisk, "Low");

      assert.equal(lor.biophysical.pgpSubstrate, true);
      assert.equal(lor.centralSedationDeliriumRisk, "Negligible");
    });

    it("verifies Beta-Blocker divergence: Lipophilic vs Hydrophilic", () => {
      const prop = getCnsProfileById("propranolol")!;
      const met = getCnsProfileById("metoprolol")!;
      const aten = getCnsProfileById("atenolol")!;
      const nad = getCnsProfileById("nadolol")!;

      // Lipophilic
      assert.ok(prop.biophysical.logP > 2.0);
      assert.ok(met.biophysical.logP > 1.5);
      assert.ok(prop.kinetics.intactCsfPlasmaRatioPercent >= 60);
      assert.ok(prop.cnsAdverseEffects.some((e) => e.toLowerCase().includes("nightmares") || e.toLowerCase().includes("dreams")));

      // Hydrophilic
      assert.ok(aten.biophysical.logP < 0.5);
      assert.ok(nad.biophysical.logP < 1.0);
      assert.ok(aten.kinetics.intactCsfPlasmaRatioPercent <= 5);
      assert.ok(nad.kinetics.intactCsfPlasmaRatioPercent <= 5);
      assert.equal(aten.centralSedationDeliriumRisk, "Negligible");
      assert.equal(nad.centralSedationDeliriumRisk, "Negligible");
    });

    it("verifies Corticosteroid divergence: Dexamethasone vs Prednisone", () => {
      const dexa = getCnsProfileById("dexamethasone")!;
      const pred = getCnsProfileById("prednisone")!;

      assert.equal(dexa.tightJunctionSensitivity, "High");
      assert.ok(dexa.cnsClinicalIndications.some((i) => i.toLowerCase().includes("vasogenic") || i.toLowerCase().includes("meningitis")));
      assert.ok(dexa.kinetics.inflamedCsfPlasmaRatioPercent > pred.kinetics.inflamedCsfPlasmaRatioPercent);
      assert.ok(dexa.mechanisticSummary.includes("claudin-5") && dexa.mechanisticSummary.includes("occludin"));
    });

    it("verifies Antimicrobial divergence: Intact vs Inflamed & Triazole partition", () => {
      const ceft = getCnsProfileById("ceftriaxone")!;
      const ampi = getCnsProfileById("ampicillin")!;
      const mero = getCnsProfileById("meropenem")!;
      const vanc = getCnsProfileById("vancomycin")!;
      const fluc = getCnsProfileById("fluconazole")!;
      const vori = getCnsProfileById("voriconazole")!;
      const itra = getCnsProfileById("itraconazole")!;

      // Beta-lactams & vancomycin jump in inflamed meninges
      assert.ok(ceft.kinetics.inflamedCsfPlasmaRatioPercent >= 10 * ceft.kinetics.intactCsfPlasmaRatioPercent);
      assert.ok(ampi.kinetics.inflamedCsfPlasmaRatioPercent >= 5 * ampi.kinetics.intactCsfPlasmaRatioPercent);
      assert.ok(mero.kinetics.inflamedCsfPlasmaRatioPercent >= 4 * mero.kinetics.intactCsfPlasmaRatioPercent);
      assert.ok(vanc.kinetics.inflamedCsfPlasmaRatioPercent >= 5 * vanc.kinetics.intactCsfPlasmaRatioPercent);

      // Triazole contrast
      assert.ok(fluc.kinetics.intactCsfPlasmaRatioPercent >= 70, "Fluconazole > 70% CSF intact");
      assert.ok(vori.kinetics.intactCsfPlasmaRatioPercent >= 50, "Voriconazole >= 50% CSF intact");
      assert.ok(itra.kinetics.intactCsfPlasmaRatioPercent < 10, "Itraconazole < 10% CSF intact");
      assert.ok(itra.biophysical.pgpSubstrate, "Itraconazole is P-gp substrate");
      assert.ok(itra.kinetics.proteinBindingPercent > 99, "Itraconazole >99% protein bound");
    });

    it("verifies Opioid divergence: Loperamide P-gp exclusion vs Morphine/Fentanyl", () => {
      const lop = getCnsProfileById("loperamide")!;
      const morph = getCnsProfileById("morphine")!;
      const fent = getCnsProfileById("fentanyl")!;

      assert.equal(lop.biophysical.pgpSubstrate, true, "Loperamide is avid P-gp substrate");
      assert.equal(lop.kinetics.intactCsfPlasmaRatioPercent <= 1, true, "Loperamide < 1% CSF intact");
      assert.equal(lop.centralSedationDeliriumRisk, "Negligible", "Loperamide non-sedating at standard doses");

      assert.equal(fent.biophysical.pgpSubstrate, false);
      assert.ok(fent.kinetics.intactCsfPlasmaRatioPercent >= 80);
      assert.equal(fent.centralSedationDeliriumRisk, "High");

      assert.ok(morph.kinetics.intactCsfPlasmaRatioPercent >= 20);
      assert.equal(morph.centralSedationDeliriumRisk, "High");
    });
  });

  // -------------------------------------------------------------
  // 4. Meningeal Inflammation Modifier & Scoring Engine
  // -------------------------------------------------------------
  describe("Meningeal Inflammation Modifier & Scoring Engine", () => {
    it("calculates BBP score correctly for high-penetrating vs excluded drugs intact", () => {
      const fentanylScore = calculateBbpScore("fentanyl", false);
      assert.ok(fentanylScore.score >= 75, "Fentanyl should score >= 75");
      assert.equal(fentanylScore.level, "High");

      const dphScore = calculateBbpScore("diphenhydramine", false);
      assert.ok(dphScore.score >= 70, "Diphenhydramine should score >= 70");
      assert.equal(dphScore.level, "High");

      const lopScore = calculateBbpScore("loperamide", false);
      assert.ok(lopScore.score <= 15, "Loperamide intact should score <= 15");
      assert.equal(lopScore.level, "Negligible");

      const ceftScore = calculateBbpScore("ceftriaxone", false);
      assert.ok(ceftScore.score <= 25, "Ceftriaxone intact should score <= 25");
    });

    it("boosts BBP score and CSF ratio for tight-junction-sensitive antimicrobials when inflamed", () => {
      const ceftIntact = calculateBbpScore("ceftriaxone", false);
      const ceftInflamed = calculateBbpScore("ceftriaxone", true);

      assert.ok(ceftInflamed.score > ceftIntact.score + 20, "Ceftriaxone score should jump >20 points when inflamed");
      assert.ok(ceftInflamed.factors.inflammationBonus === 30, "Ceftriaxone receives full 30 pt inflammation bonus");
      assert.equal(ceftInflamed.csfPlasmaRatioEstimatePercent, 17);

      const meroIntact = calculateBbpScore("meropenem", false);
      const meroInflamed = calculateBbpScore("meropenem", true);
      assert.ok(meroInflamed.score > meroIntact.score + 20);
      assert.equal(meroInflamed.csfPlasmaRatioEstimatePercent, 25);
    });

    it("does not inflate inflammation bonus for hydrophobic lipophilic drugs that don't depend on paracellular clefts", () => {
      const fentIntact = calculateBbpScore("fentanyl", false);
      const fentInflamed = calculateBbpScore("fentanyl", true);
      assert.equal(fentInflamed.factors.inflammationBonus, 0);
      assert.equal(fentIntact.score, fentInflamed.score);
    });
  });

  // -------------------------------------------------------------
  // 5. Desk Tray Risk Detection
  // -------------------------------------------------------------
  describe("Desk Tray Risk Detection", () => {
    it("detects Critical P-gp Efflux Bypass when Loperamide is paired with a P-gp inhibitor", () => {
      const risks = detectCnsRisksOnTray(["loperamide", "quinidine"]);
      const bypassRisk = risks.find((r) => r.id === "loperamide-pgp-bypass-cns-flood");
      assert.ok(bypassRisk, "Must flag loperamide P-gp bypass risk");
      assert.equal(bypassRisk.severity, "critical");
      assert.ok(bypassRisk.involvedDrugIds.includes("loperamide"));
      assert.ok(bypassRisk.involvedDrugIds.includes("quinidine"));
      assert.ok(bypassRisk.hazard.includes("respiratory arrest") || bypassRisk.hazard.includes("stupor"));
      assert.ok(bypassRisk.biophysicalMechanism.includes("ABCB1") || bypassRisk.biophysicalMechanism.includes("P-glycoprotein"));
    });

    it("detects Warning Cumulative Sedation when 1st-Gen Antihistamine is paired with an opioid or benzodiazepine", () => {
      const risks = detectCnsRisksOnTray(["diphenhydramine", "morphine"]);
      const sedRisk = risks.find((r) => r.id === "cumulative-high-cns-sedative-delirium");
      assert.ok(sedRisk, "Must flag cumulative sedative delirium risk");
      assert.equal(sedRisk.severity, "warning");
      assert.ok(sedRisk.involvedDrugIds.includes("diphenhydramine"));
      assert.ok(sedRisk.involvedDrugIds.includes("morphine"));
      assert.ok(sedRisk.actionableConsiderations.some((c) => c.includes("Beers") || c.includes("2nd-generation")));
    });

    it("detects Warning Vancomycin exclusion across intact BBB, and transitions to advisory when inflamed", () => {
      const intactRisks = detectCnsRisksOnTray(["vancomycin"], false);
      const intactRisk = intactRisks.find((r) => r.id === "vancomycin-intact-bbb-exclusion");
      assert.ok(intactRisk, "Must flag vancomycin intact BBB exclusion");
      assert.equal(intactRisk.severity, "warning");

      const inflamedRisks = detectCnsRisksOnTray(["vancomycin"], true);
      const inflamedRisk = inflamedRisks.find((r) => r.id === "vancomycin-inflamed-monitoring-advisory");
      assert.ok(inflamedRisk, "Must provide advisory for inflamed paracellular cleft passage");
      assert.equal(inflamedRisk.severity, "advisory");
    });

    it("detects Warning for Itraconazole ineffectiveness in fungal CNS infections", () => {
      const risks = detectCnsRisksOnTray(["itraconazole"]);
      const itraRisk = risks.find((r) => r.id === "itraconazole-cns-exclusion-warning");
      assert.ok(itraRisk, "Must flag itraconazole CNS exclusion warning");
      assert.equal(itraRisk.severity, "warning");
      assert.ok(itraRisk.actionableConsiderations.some((c) => c.includes("fluconazole") || c.includes("voriconazole")));
    });

    it("detects Critical Carbapenem-Valproate collision on desk tray", () => {
      const risks = detectCnsRisksOnTray(["meropenem", "valproate"]);
      const collisionRisk = risks.find((r) => r.id === "meropenem-valproate-seizure-collision");
      assert.ok(collisionRisk, "Must flag meropenem-valproate seizure collision");
      assert.equal(collisionRisk.severity, "critical");
    });

    it("detects Advisory for Lipophilic Beta-Blockers (Propranolol)", () => {
      const risks = detectCnsRisksOnTray(["propranolol"]);
      const bbRisk = risks.find((r) => r.id === "lipophilic-beta-blocker-cns-adverse-effects");
      assert.ok(bbRisk, "Must flag lipophilic beta-blocker advisory");
      assert.equal(bbRisk.severity, "advisory");
      assert.ok(bbRisk.actionableConsiderations.some((c) => c.includes("atenolol") || c.includes("nadolol")));
    });

    it("detects Advisory for Dexamethasone tight junction stabilization when co-prescribed with antimicrobials", () => {
      const risks = detectCnsRisksOnTray(["dexamethasone", "ceftriaxone", "vancomycin"]);
      const dexaRisk = risks.find((r) => r.id === "dexamethasone-antimicrobial-timing-advisory");
      assert.ok(dexaRisk, "Must flag dexamethasone tight junction stabilization advisory");
      assert.equal(dexaRisk.severity, "advisory");
    });
  });

  // -------------------------------------------------------------
  // 6. Regulatory Posture (FD&C Act § 520(o)(1)(E))
  // -------------------------------------------------------------
  describe("Regulatory Posture & Non-Prescriptive CDS Posture", () => {
    it("exports official regulatory disclaimer referencing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(CNS_PENETRATION_REGULATORY_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(CNS_PENETRATION_REGULATORY_DISCLAIMER.includes("Educational Clinical Decision Support"));
      assert.ok(CNS_PENETRATION_REGULATORY_DISCLAIMER.includes("claudin-5"));
    });

    it("strictly avoids prescriptive dosing directives across all profiles, divergences, and tray risks", () => {
      // Must not contain prescriptive phrases such as "administer X mg" or "prescribe X mg"
      const prescriptiveRegex = /\b(?:administer|give|prescribe|inject)\s+\d+\s*(?:mg|g|mcg|ml)\b/i;

      for (const profile of CNS_PROFILES) {
        assert.equal(
          prescriptiveRegex.test(profile.mechanisticSummary),
          false,
          `Profile for ${profile.drugId} must not contain prescriptive dosing directive in mechanistic summary`,
        );
        for (const mon of profile.monitoringConsiderations) {
          assert.equal(
            prescriptiveRegex.test(mon),
            false,
            `Profile for ${profile.drugId} must not contain prescriptive dosing in monitoring: ${mon}`,
          );
        }
      }

      for (const div of CNS_CLASS_DIVERGENCES) {
        assert.equal(
          prescriptiveRegex.test(div.molecularMechanism),
          false,
          `Divergence ${div.id} molecular mechanism must not contain prescriptive dosing`,
        );
        for (const pearl of div.clinicalPearls) {
          assert.equal(
            prescriptiveRegex.test(pearl),
            false,
            `Divergence ${div.id} clinical pearl must not contain prescriptive dosing: ${pearl}`,
          );
        }
      }

      // Tray risks
      const allSampleRisks = detectCnsRisksOnTray([
        "loperamide",
        "quinidine",
        "diphenhydramine",
        "morphine",
        "vancomycin",
        "itraconazole",
        "propranolol",
        "dexamethasone",
        "meropenem",
        "valproate",
      ]);
      for (const risk of allSampleRisks) {
        for (const action of risk.actionableConsiderations) {
          assert.equal(
            prescriptiveRegex.test(action),
            false,
            `Risk ${risk.id} consideration must not contain prescriptive dosing: ${action}`,
          );
        }
      }
    });

    it("verifies peer-reviewed literature citations exist for all profiles and divergences", () => {
      for (const profile of CNS_PROFILES) {
        assert.ok(
          profile.citations.length >= 1,
          `Profile for ${profile.drugId} must contain literature citations`,
        );
      }
      for (const div of CNS_CLASS_DIVERGENCES) {
        assert.ok(
          div.citations.length >= 1,
          `Divergence ${div.id} must contain literature citations`,
        );
      }
    });
  });

  // -------------------------------------------------------------
  // 7. Helper Functions
  // -------------------------------------------------------------
  describe("Helper Functions", () => {
    it("getAllCnsPenetrationProfiles returns the full list of profiles", () => {
      const all = getAllCnsPenetrationProfiles();
      assert.equal(all.length, CNS_PROFILES.length);
    });

    it("getCnsProfileById returns correct profile or undefined", () => {
      const prof = getCnsProfileById("propranolol");
      assert.ok(prof);
      assert.equal(prof.drugId, "propranolol");
      assert.equal(getCnsProfileById("nonexistent_xyz"), undefined);
    });

    it("getAllCnsClassDivergences and getCnsClassDivergenceById work as expected", () => {
      const divs = getAllCnsClassDivergences();
      assert.equal(divs.length, CNS_CLASS_DIVERGENCES.length);
      const single = getCnsClassDivergenceById("antihistamines-1st-vs-2nd-generation");
      assert.ok(single);
      assert.equal(single.id, "antihistamines-1st-vs-2nd-generation");
    });
  });
});
