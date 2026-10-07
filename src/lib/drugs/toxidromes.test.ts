import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  CLASSICAL_TOXIDROMES,
  ANTIDOTE_PATHWAYS,
  TOXIDROME_DISCRIMINATOR_MATRIX,
  TOXIDROME_REGULATORY_DISCLAIMER,
  getAllToxidromes,
  getToxidromeById,
  getAllAntidotes,
  getAntidoteById,
  matchToxidromeSigns,
  detectToxidromesOnTray,
  type ClassicalToxidromeId,
} from "./toxidromes";

describe("Toxicological Toxidrome & Antidotal Mechanism Simulator", () => {
  describe("Classical Toxidromes Model", () => {
    it("defines exactly the 6 classical toxidromes with valid structures", () => {
      const toxidromes = getAllToxidromes();
      assert.equal(toxidromes.length, 6);

      const expectedIds: ClassicalToxidromeId[] = [
        "anticholinergic",
        "cholinergic",
        "opioid",
        "sympathomimetic",
        "sedative-hypnotic",
        "serotonergic",
      ];

      for (const expectedId of expectedIds) {
        const toxidrome = getToxidromeById(expectedId);
        assert.ok(toxidrome, `Toxidrome '${expectedId}' must exist`);
        assert.ok(toxidrome.name.length > 0);
        assert.ok(toxidrome.headlineSummary.length > 0);
        assert.ok(toxidrome.classicalMnemonic.length > 0);
        assert.ok(toxidrome.mnemonicItems.length >= 3);
        assert.ok(toxidrome.pathophysiology.length > 0);

        // Check vital signs and exam signs
        assert.ok(toxidrome.signs.vitals.heartRate.length > 0);
        assert.ok(toxidrome.signs.vitals.bloodPressure.length > 0);
        assert.ok(toxidrome.signs.vitals.respiratoryRate.length > 0);
        assert.ok(toxidrome.signs.vitals.temperature.length > 0);
        assert.ok(toxidrome.signs.pupils.length > 0);
        assert.ok(toxidrome.signs.skin.length > 0);
        assert.ok(toxidrome.signs.mucousMembranes.length > 0);
        assert.ok(toxidrome.signs.bowelSounds.length > 0);
        assert.ok(toxidrome.signs.urinaryBladder.length > 0);
        assert.ok(toxidrome.signs.neuromuscular.length > 0);
        assert.ok(toxidrome.signs.mentalStatus.length > 0);

        // Check discriminators, causative groups, antidote, pearls
        assert.ok(toxidrome.keyDiscriminators.length >= 1);
        assert.ok(toxidrome.associatedDrugIds.length >= 2);
        assert.ok(toxidrome.causativeAgentGroups.length >= 1);
        assert.ok(toxidrome.primaryAntidote.name.length > 0);
        assert.ok(toxidrome.primaryAntidote.mechanismSummary.length > 0);
        assert.ok(toxidrome.diagnosticPearls.length >= 2);
        assert.ok(toxidrome.references.length >= 1);
      }
    });

    it("verifies anticholinergic toxidrome specific criteria and key anhidrosis discriminator", () => {
      const anti = getToxidromeById("anticholinergic");
      assert.ok(anti);
      assert.match(anti.classicalMnemonic, /Blind as a bat/i);
      assert.match(anti.classicalMnemonic, /dry as a bone/i);
      assert.match(anti.signs.skin, /anhidrosis|dry/i);
      assert.match(anti.signs.pupils, /mydriasis/i);
      assert.match(anti.signs.urinaryBladder, /urinary retention/i);
      assert.match(anti.signs.bowelSounds, /hypoactive|absent/i);
      assert.match(anti.primaryAntidote.name, /Physostigmine/i);

      // Associated drugs
      assert.ok(anti.associatedDrugIds.includes("atropine"));
      assert.ok(anti.associatedDrugIds.includes("scopolamine"));
      assert.ok(anti.associatedDrugIds.includes("diphenhydramine"));
      assert.ok(anti.associatedDrugIds.includes("amitriptyline"));
    });

    it("verifies cholinergic toxidrome with SLUDGEM / DUMBELS and killer Bs", () => {
      const chol = getToxidromeById("cholinergic");
      assert.ok(chol);
      assert.match(chol.classicalMnemonic, /SLUDGEM/i);
      assert.match(chol.classicalMnemonic, /DUMBELS/i);
      assert.match(chol.signs.pupils, /miosis/i);
      assert.match(chol.signs.skin, /diaphoretic|sweat/i);
      assert.match(chol.signs.neuromuscular, /fasciculations/i);
      assert.match(chol.signs.bowelSounds, /hyperactive/i);
      assert.match(chol.primaryAntidote.name, /Atropine/i);
      assert.match(chol.primaryAntidote.name, /Pralidoxime/i);

      // Associated drugs
      assert.ok(chol.associatedDrugIds.includes("malathion"));
      assert.ok(chol.associatedDrugIds.includes("physostigmine"));
    });

    it("verifies opioid toxidrome triad (coma, miosis, respiratory depression) and naloxone", () => {
      const op = getToxidromeById("opioid");
      assert.ok(op);
      assert.match(op.classicalMnemonic, /triad/i);
      assert.match(op.signs.pupils, /miosis|pinpoint/i);
      assert.match(op.signs.vitals.respiratoryRate, /bradypnea/i);
      assert.match(op.signs.mentalStatus, /coma|stupor/i);
      assert.match(op.primaryAntidote.name, /Naloxone/i);

      // Associated drugs
      assert.ok(op.associatedDrugIds.includes("morphine"));
      assert.ok(op.associatedDrugIds.includes("oxycodone"));
      assert.ok(op.associatedDrugIds.includes("fentanyl"));
      assert.ok(op.associatedDrugIds.includes("methadone"));
    });

    it("verifies sympathomimetic toxidrome and diaphoresis discriminator vs anticholinergic", () => {
      const symp = getToxidromeById("sympathomimetic");
      assert.ok(symp);
      assert.match(symp.signs.skin, /diaphoretic|sweat/i);
      assert.match(symp.signs.pupils, /mydriasis/i);
      assert.match(symp.signs.vitals.heartRate, /tachycardia/i);
      assert.match(symp.signs.vitals.bloodPressure, /hypertension/i);
      assert.match(symp.signs.bowelSounds, /hyperactive|normal/i);

      // Associated drugs
      assert.ok(symp.associatedDrugIds.includes("cocaine"));
      assert.ok(symp.associatedDrugIds.includes("amphetamine"));
      assert.ok(symp.associatedDrugIds.includes("methamphetamine"));
      assert.ok(symp.associatedDrugIds.includes("mdma"));
    });

    it("verifies sedative-hypnotic toxidrome and flumazenil boxed warning", () => {
      const sed = getToxidromeById("sedative-hypnotic");
      assert.ok(sed);
      assert.match(sed.signs.pupils, /normal|midposition/i);
      assert.match(sed.signs.neuromuscular, /ataxia/i);
      assert.match(sed.primaryAntidote.name, /Flumazenil/i);
      assert.ok(
        sed.primaryAntidote.boxedWarningsOrContraindications.some((w) =>
          /seizure|withdrawal/i.test(w),
        ),
      );

      // Associated drugs
      assert.ok(sed.associatedDrugIds.includes("diazepam"));
      assert.ok(sed.associatedDrugIds.includes("lorazepam"));
      assert.ok(sed.associatedDrugIds.includes("phenobarbital"));
      assert.ok(sed.associatedDrugIds.includes("zolpidem"));
      assert.ok(sed.associatedDrugIds.includes("ethanol"));
    });

    it("verifies serotonergic toxidrome and Hunter criteria clonus", () => {
      const sero = getToxidromeById("serotonergic");
      assert.ok(sero);
      assert.match(sero.classicalMnemonic, /Hunter/i);
      assert.match(sero.signs.neuromuscular, /clonus/i);
      assert.match(sero.signs.neuromuscular, /hyperreflexia/i);
      assert.match(sero.signs.skin, /diaphoretic/i);
      assert.match(sero.primaryAntidote.name, /Cyproheptadine/i);

      // Associated drugs
      assert.ok(sero.associatedDrugIds.includes("fluoxetine"));
      assert.ok(sero.associatedDrugIds.includes("sertraline"));
      assert.ok(sero.associatedDrugIds.includes("amitriptyline"));
      assert.ok(sero.associatedDrugIds.includes("linezolid"));
      assert.ok(sero.associatedDrugIds.includes("mdma"));
      assert.ok(sero.associatedDrugIds.includes("dextromethorphan"));
    });
  });

  describe("10 Molecular Antidote Mechanism Pathways", () => {
    it("defines all 10 molecular antidote pathways with rich cascades", () => {
      const antidotes = getAllAntidotes();
      assert.equal(antidotes.length, 10);

      const expectedIds = [
        "nac-acetaminophen",
        "hydroxocobalamin-cyanide",
        "sodium-bicarbonate-tca",
        "pralidoxime-organophosphates",
        "atropine-cholinergic",
        "naloxone-opioid",
        "digoxin-immune-fab",
        "glucagon-cardiac",
        "hiet-ccb-bb",
        "lipid-emulsion-ile",
      ];

      for (const expectedId of expectedIds) {
        const antidote = getAntidoteById(expectedId);
        assert.ok(antidote, `Antidote pathway '${expectedId}' must exist`);
        assert.ok(antidote.name.length > 0);
        assert.ok(antidote.targetToxicity.length > 0);
        assert.ok(antidote.antidoteDrugId.length > 0);
        assert.ok(antidote.toxinDrugIds.length > 0);
        assert.ok(antidote.biochemicalClassification.length > 0);
        assert.ok(antidote.primaryTargetReceptorOrEnzyme.length > 0);
        assert.ok(antidote.molecularMechanismSummary.length > 0);
        assert.ok(antidote.stepByStepCascade.length >= 4);

        for (const step of antidote.stepByStepCascade) {
          assert.ok(step.step > 0);
          assert.ok(step.title.length > 0);
          assert.ok(step.cellularCompartment.length > 0);
          assert.ok(step.biochemicalEvent.length > 0);
          assert.ok(step.molecularDescription.length > 0);
        }

        assert.ok(antidote.kineticProfile.onset.length > 0);
        assert.ok(antidote.kineticProfile.criticalWindow.length > 0);
        assert.ok(antidote.physiologicRestorationTargets.length >= 2);
        assert.ok(antidote.monitoringParameters.length >= 2);
        assert.ok(antidote.boxedWarningsOrContraindications.length >= 1);
        assert.ok(antidote.clinicalPearls.length >= 1);
        assert.ok(antidote.citations.length >= 1);
      }
    });

    it("verifies N-acetylcysteine restores glutathione (GSH) for NAPQI", () => {
      const nac = getAntidoteById("nac-acetaminophen");
      assert.ok(nac);
      assert.equal(nac.antidoteDrugId, "nac");
      assert.ok(nac.toxinDrugIds.includes("acetaminophen"));
      assert.match(nac.molecularMechanismSummary, /glutathione|GSH/i);
      assert.match(nac.molecularMechanismSummary, /NAPQI/i);
    });

    it("verifies Hydroxocobalamin Co3+ coordination for Cyanide Complex IV", () => {
      const hydro = getAntidoteById("hydroxocobalamin-cyanide");
      assert.ok(hydro);
      assert.equal(hydro.antidoteDrugId, "hydroxocobalamin");
      assert.match(hydro.molecularMechanismSummary, /cobalt|Co3\+/i);
      assert.match(hydro.molecularMechanismSummary, /cytochrome c oxidase|Complex IV/i);
      assert.match(hydro.molecularMechanismSummary, /cyanocobalamin/i);
    });

    it("verifies Sodium Bicarbonate alkalinization and Nav1.5 unblock for TCAs", () => {
      const bicarb = getAntidoteById("sodium-bicarbonate-tca");
      assert.ok(bicarb);
      assert.equal(bicarb.antidoteDrugId, "sodium-bicarbonate");
      assert.ok(bicarb.toxinDrugIds.includes("amitriptyline"));
      assert.match(bicarb.molecularMechanismSummary, /alkalinization/i);
      assert.match(bicarb.molecularMechanismSummary, /Nav1\.5/i);
    });

    it("verifies Pralidoxime (2-PAM) nucleophilic reactivation of AChE before aging", () => {
      const pam = getAntidoteById("pralidoxime-organophosphates");
      assert.ok(pam);
      assert.equal(pam.antidoteDrugId, "pralidoxime");
      assert.match(pam.molecularMechanismSummary, /nucleophilic/i);
      assert.match(pam.molecularMechanismSummary, /acetylcholinesterase/i);
      assert.match(pam.molecularMechanismSummary, /aging/i);
    });

    it("verifies Atropine competitive muscarinic M1/M2/M3 antagonism", () => {
      const atr = getAntidoteById("atropine-cholinergic");
      assert.ok(atr);
      assert.equal(atr.antidoteDrugId, "atropine");
      assert.match(atr.molecularMechanismSummary, /competitive/i);
      assert.match(atr.molecularMechanismSummary, /muscarinic/i);
      assert.match(atr.molecularMechanismSummary, /M1.*M2.*M3/i);
    });

    it("verifies Naloxone competitive displacement at mu, delta, kappa opioid receptors", () => {
      const nal = getAntidoteById("naloxone-opioid");
      assert.ok(nal);
      assert.equal(nal.antidoteDrugId, "naloxone");
      assert.match(nal.molecularMechanismSummary, /competitive/i);
      assert.match(nal.molecularMechanismSummary, /mu.*delta.*kappa|mu.*kappa.*delta/i);
    });

    it("verifies Digoxin Immune Fab (DigiFab) high-affinity ovine Fab fragment binding", () => {
      const digi = getAntidoteById("digoxin-immune-fab");
      assert.ok(digi);
      assert.equal(digi.antidoteDrugId, "digoxin-immune-fab");
      assert.ok(digi.toxinDrugIds.includes("digoxin"));
      assert.match(digi.molecularMechanismSummary, /Fab/i);
      assert.match(digi.molecularMechanismSummary, /digoxin/i);
    });

    it("verifies Glucagon non-adrenergic GPCR Gs bypass for beta-blocker/CCB toxicity", () => {
      const gluc = getAntidoteById("glucagon-cardiac");
      assert.ok(gluc);
      assert.equal(gluc.antidoteDrugId, "glucagon");
      assert.match(gluc.molecularMechanismSummary, /bypasses/i);
      assert.match(gluc.molecularMechanismSummary, /adenylyl cyclase|cAMP|PKA/i);
    });

    it("verifies HIET metabolic myocardial substrate switch to glucose oxidation", () => {
      const hiet = getAntidoteById("hiet-ccb-bb");
      assert.ok(hiet);
      assert.equal(hiet.antidoteDrugId, "insulin-regular");
      assert.match(hiet.molecularMechanismSummary, /fatty acid.*glucose|carbohydrate/i);
      assert.match(hiet.molecularMechanismSummary, /inotropy/i);
    });

    it("verifies Intravenous Lipid Emulsion (ILE) lipid sink partitioning for lipophilic toxins", () => {
      const ile = getAntidoteById("lipid-emulsion-ile");
      assert.ok(ile);
      assert.equal(ile.antidoteDrugId, "lipid-emulsion");
      assert.ok(ile.toxinDrugIds.includes("bupivacaine"));
      assert.ok(ile.toxinDrugIds.includes("verapamil"));
      assert.ok(ile.toxinDrugIds.includes("amitriptyline"));
      assert.match(ile.molecularMechanismSummary, /lipophilic/i);
      assert.match(ile.molecularMechanismSummary, /partition/i);
    });
  });

  describe("Toxidrome Discriminator Matrix", () => {
    it("provides complete side-by-side discriminator matrix across all 6 toxidromes", () => {
      assert.ok(TOXIDROME_DISCRIMINATOR_MATRIX.length >= 10);

      const requiredCategories = [
        "vitals",
        "pupils",
        "skin",
        "peristalsis",
        "reflexes",
        "mentalStatus",
      ];

      for (const cat of requiredCategories) {
        const found = TOXIDROME_DISCRIMINATOR_MATRIX.some((r) => r.category === cat);
        assert.ok(found, `Category '${cat}' must be represented in discriminator matrix`);
      }

      for (const row of TOXIDROME_DISCRIMINATOR_MATRIX) {
        assert.ok(row.parameter.length > 0);
        assert.ok(row.anticholinergic.length > 0);
        assert.ok(row.cholinergic.length > 0);
        assert.ok(row.opioid.length > 0);
        assert.ok(row.sympathomimetic.length > 0);
        assert.ok(row.sedativeHypnotic.length > 0);
        assert.ok(row.serotonergic.length > 0);
      }
    });

    it("verifies key discriminator: sweating vs anhidrosis (dry skin)", () => {
      const skinRow = TOXIDROME_DISCRIMINATOR_MATRIX.find(
        (r) => /Skin Moisture|Sweating/i.test(r.parameter),
      );
      assert.ok(skinRow);
      assert.match(skinRow.anticholinergic, /anhidrosis|dry/i);
      assert.match(skinRow.sympathomimetic, /diaphoretic|sweat/i);
      assert.match(skinRow.cholinergic, /diaphoretic|sweat/i);
      assert.match(skinRow.serotonergic, /diaphoretic|sweat/i);
    });

    it("verifies key discriminator: pinpoint vs dilated pupils", () => {
      const pupilRow = TOXIDROME_DISCRIMINATOR_MATRIX.find(
        (r) => /Pupil/i.test(r.parameter),
      );
      assert.ok(pupilRow);
      assert.match(pupilRow.opioid, /miosis|pinpoint/i);
      assert.match(pupilRow.cholinergic, /miosis|pinpoint/i);
      assert.match(pupilRow.anticholinergic, /mydriasis|dilated/i);
      assert.match(pupilRow.sympathomimetic, /mydriasis|dilated/i);
      assert.match(pupilRow.sedativeHypnotic, /normal|midposition/i);
    });
  });

  describe("Catalog Integrity & DRUG_BY_ID Validation", () => {
    it("ensures every referenced drug ID in associatedDrugIds exists in DRUG_BY_ID", () => {
      for (const toxidrome of CLASSICAL_TOXIDROMES) {
        for (const drugId of toxidrome.associatedDrugIds) {
          assert.ok(
            DRUG_BY_ID[drugId],
            `Drug '${drugId}' in toxidrome '${toxidrome.id}' must exist in DRUG_BY_ID catalog`,
          );
        }
      }
    });

    it("ensures every referenced causative group drug ID exists in DRUG_BY_ID", () => {
      for (const toxidrome of CLASSICAL_TOXIDROMES) {
        for (const group of toxidrome.causativeAgentGroups) {
          for (const drugId of group.drugIds) {
            assert.ok(
              DRUG_BY_ID[drugId],
              `Drug '${drugId}' in group '${group.name}' of toxidrome '${toxidrome.id}' must exist in DRUG_BY_ID`,
            );
          }
        }
      }
    });

    it("ensures every antidote and toxin drug ID in the 10 pathways exists in DRUG_BY_ID", () => {
      for (const pathway of ANTIDOTE_PATHWAYS) {
        assert.ok(
          DRUG_BY_ID[pathway.antidoteDrugId],
          `Antidote drug '${pathway.antidoteDrugId}' in pathway '${pathway.id}' must exist in DRUG_BY_ID`,
        );

        for (const toxinId of pathway.toxinDrugIds) {
          assert.ok(
            DRUG_BY_ID[toxinId],
            `Toxin drug '${toxinId}' in pathway '${pathway.id}' must exist in DRUG_BY_ID`,
          );
        }
      }
    });
  });

  describe("Clinical Sign Diagnostic Matcher", () => {
    it("accurately matches opioid toxidrome from classic triad", () => {
      const results = matchToxidromeSigns({
        pupils: "miosis",
        respiratoryRate: "bradypnea",
        mentalStatus: "coma",
      });

      assert.ok(results.length > 0);
      assert.equal(results[0].toxidrome.id, "opioid");
      assert.equal(results[0].confidenceTier, "High");
      assert.ok(results[0].matchingFeatures.some((f) => /pinpoint|miosis/i.test(f)));
      assert.ok(results[0].matchingFeatures.some((f) => /bradypnea/i.test(f)));
    });

    it("accurately distinguishes anticholinergic (dry skin) from sympathomimetic (sweating)", () => {
      const dryResults = matchToxidromeSigns({
        skin: "dry",
        pupils: "mydriasis",
        heartRate: "tachycardia",
        mentalStatus: "delirium",
      });
      assert.equal(dryResults[0].toxidrome.id, "anticholinergic");
      assert.ok(dryResults[0].matchingFeatures.some((f) => /anhidrosis|dry/i.test(f)));

      const sweatingResults = matchToxidromeSigns({
        skin: "diaphoretic",
        pupils: "mydriasis",
        heartRate: "tachycardia",
        bloodPressure: "hypertension",
      });
      assert.equal(sweatingResults[0].toxidrome.id, "sympathomimetic");
      assert.ok(sweatingResults[0].matchingFeatures.some((f) => /diaphoresis|sweating/i.test(f)));
    });

    it("identifies serotonergic toxicity when clonus and hyperthermia are present", () => {
      const results = matchToxidromeSigns({
        neuromuscular: "clonus",
        skin: "diaphoretic",
        temperature: "hyperthermia",
      });

      assert.equal(results[0].toxidrome.id, "serotonergic");
      assert.ok(results[0].matchingFeatures.some((f) => /clonus/i.test(f)));
    });

    it("identifies cholinergic crisis when miosis, sweating, and fasciculations are present", () => {
      const results = matchToxidromeSigns({
        pupils: "miosis",
        skin: "diaphoretic",
        neuromuscular: "fasciculations",
        bowelSounds: "hyperactive",
      });

      assert.equal(results[0].toxidrome.id, "cholinergic");
      assert.ok(results[0].matchingFeatures.some((f) => /fasciculations/i.test(f)));
    });
  });

  describe("Desk Tray Integration Engine", () => {
    it("detects opioid toxidrome and recommends naloxone when opioids are on tray", () => {
      const detected = detectToxidromesOnTray(["morphine", "fentanyl"]);
      assert.ok(detected.length >= 1);

      const opResult = detected.find((d) => d.toxidrome?.id === "opioid");
      assert.ok(opResult);
      assert.ok(opResult.matchedCausativeDrugIds.includes("morphine"));
      assert.ok(opResult.matchedCausativeDrugIds.includes("fentanyl"));
      assert.equal(opResult.recommendedAntidoteDrugId, "naloxone");
      assert.equal(opResult.matchedAntidoteDrugIds.length, 0);
    });

    it("detects active antidote on tray when naloxone is present with fentanyl", () => {
      const detected = detectToxidromesOnTray(["fentanyl", "naloxone"]);
      const opResult = detected.find((d) => d.toxidrome?.id === "opioid");
      assert.ok(opResult);
      assert.ok(opResult.matchedAntidoteDrugIds.includes("naloxone"));
    });

    it("detects acetaminophen toxicity and connects the NAC antidote pathway", () => {
      const detected = detectToxidromesOnTray(["acetaminophen"]);
      assert.ok(detected.length >= 1);
      const apapResult = detected.find((d) => d.antidotePathway?.id === "nac-acetaminophen");
      assert.ok(apapResult);
      assert.equal(apapResult.recommendedAntidoteDrugId, "nac");
    });

    it("returns empty array when tray has no toxicological agents", () => {
      const detected = detectToxidromesOnTray([]);
      assert.deepEqual(detected, []);
    });
  });

  describe("Non-Prescriptive Regulatory Posture (FD&C Act § 520(o)(1)(E))", () => {
    it("exports official regulatory disclaimer referencing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(TOXIDROME_REGULATORY_DISCLAIMER);
      assert.match(TOXIDROME_REGULATORY_DISCLAIMER, /FD&C Act § 520\(o\)\(1\)\(E\)/);
      assert.match(TOXIDROME_REGULATORY_DISCLAIMER, /Non-Device Clinical Decision Support/i);
      assert.match(TOXIDROME_REGULATORY_DISCLAIMER, /1-800-222-1222/);
    });

    it("ensures descriptions avoid prescriptive directives across all models", () => {
      // Prohibited prescriptive strings like "administer 2 mg IV", "give 4 mg", "push 10 mg"
      const prescriptiveRegex = /\b(?:give|administer|inject|push)\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units)\b/i;

      for (const toxidrome of CLASSICAL_TOXIDROMES) {
        assert.doesNotMatch(toxidrome.headlineSummary, prescriptiveRegex);
        assert.doesNotMatch(toxidrome.pathophysiology, prescriptiveRegex);
        assert.doesNotMatch(toxidrome.primaryAntidote.mechanismSummary, prescriptiveRegex);
        for (const pearl of toxidrome.diagnosticPearls) {
          assert.doesNotMatch(pearl, prescriptiveRegex);
        }
      }

      for (const antidote of ANTIDOTE_PATHWAYS) {
        assert.doesNotMatch(antidote.molecularMechanismSummary, prescriptiveRegex);
        for (const step of antidote.stepByStepCascade) {
          assert.doesNotMatch(step.molecularDescription, prescriptiveRegex);
        }
        for (const target of antidote.physiologicRestorationTargets) {
          assert.doesNotMatch(target, prescriptiveRegex);
        }
      }
    });
  });
});
