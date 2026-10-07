import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  DRUG_RECEPTOR_PROFILES,
  RECEPTOR_TARGETS,
  RECEPTOR_PROFILES_REGULATORY_DISCLAIMER,
  getProfileForDrug,
  getAllDrugProfiles,
  filterProfilesByClass,
  searchProfiles,
  compareReceptorProfiles,
  type AffinityTier,
  type FunctionalActivity,
  type ReceptorFamily,
} from "./receptor-profiles";

const VALID_TIERS: readonly AffinityTier[] = [
  "Sub-nanomolar",
  "High",
  "Moderate",
  "Low",
  "Negligible",
];

const VALID_ACTIVITIES: readonly FunctionalActivity[] = [
  "Full Agonist",
  "Partial Agonist",
  "Antagonist",
  "Inverse Agonist",
  "Reuptake Inhibitor",
  "PAM",
  "Channel Blocker",
];

const VALID_FAMILIES: readonly ReceptorFamily[] = [
  "Dopamine",
  "Serotonin",
  "Adrenergic",
  "Histamine",
  "Muscarinic",
  "Opioid",
  "Transporters",
  "Ionotropic / Amino Acid",
];

describe("Receptor Profiles Pharmacological Database", () => {
  it("defines comprehensive RECEPTOR_TARGETS covering all required families and subtypes", () => {
    const requiredReceptors = [
      // Dopamine
      "D1", "D2", "D3", "D4",
      // Serotonin
      "5-HT1A", "5-HT2A", "5-HT2C", "5-HT3", "5-HT7",
      // Adrenergic
      "Alpha-1", "Alpha-2", "Beta-1", "Beta-2",
      // Histamine
      "H1",
      // Muscarinic
      "M1", "M2", "M3",
      // Opioid
      "Mu", "Kappa", "Delta",
      // Transporters
      "SERT", "NET", "DAT",
      // Ionotropic / Amino Acid
      "NMDA", "GABA-A",
    ];

    for (const rec of requiredReceptors) {
      assert.ok(RECEPTOR_TARGETS[rec], `Missing required receptor target: ${rec}`);
      const target = RECEPTOR_TARGETS[rec];
      assert.equal(target.receptor, rec);
      assert.ok(target.name.length > 0, `Target ${rec} must have a full name`);
      assert.ok(VALID_FAMILIES.includes(target.family), `Target ${rec} has invalid family: ${target.family}`);
      assert.ok(target.description.length > 0, `Target ${rec} must have description`);
      assert.ok(target.agonismConsequences.length > 0, `Target ${rec} must describe agonism`);
      assert.ok(target.antagonismConsequences.length > 0, `Target ${rec} must describe antagonism`);
      assert.ok(target.primaryClinicalImplications.length > 0, `Target ${rec} must have clinical implications`);
      assert.ok(target.citation.length > 0, `Target ${rec} must cite peer-reviewed literature`);
    }
  });

  it("verifies accurate clinical consequence explanations for canonical receptor targets", () => {
    // D2 antagonism -> Antipsychotic efficacy, EPS risk, hyperprolactinemia
    const d2 = RECEPTOR_TARGETS["D2"];
    assert.match(d2.antagonismConsequences, /antipsychotic/i);
    assert.match(d2.antagonismConsequences, /extrapyramidal|EPS/i);
    assert.match(d2.antagonismConsequences, /hyperprolactinemia|prolactin/i);

    // 5-HT2A antagonism -> EPS reduction, slow-wave sleep promotion
    const ht2a = RECEPTOR_TARGETS["5-HT2A"];
    assert.match(ht2a.antagonismConsequences, /EPS/i);
    assert.match(ht2a.antagonismConsequences, /slow-wave sleep|sleep/i);

    // H1 antagonism -> Sedation, weight gain
    const h1 = RECEPTOR_TARGETS["H1"];
    assert.match(h1.antagonismConsequences, /sedation|somnolence/i);
    assert.match(h1.antagonismConsequences, /weight gain|appetite/i);

    // M1 antagonism -> Anticholinergic cognitive blur, dry mouth
    const m1 = RECEPTOR_TARGETS["M1"];
    assert.match(m1.antagonismConsequences, /anticholinergic|cognitive/i);
    assert.match(m1.antagonismConsequences, /dry mouth/i);

    // Alpha-1 antagonism -> Orthostatic hypotension, reflex tachycardia
    const a1 = RECEPTOR_TARGETS["Alpha-1"];
    assert.match(a1.antagonismConsequences, /orthostatic/i);
    assert.match(a1.antagonismConsequences, /tachycardia/i);
  });

  it("contains at least 30 representative clinical agents in DRUG_RECEPTOR_PROFILES", () => {
    assert.ok(
      DRUG_RECEPTOR_PROFILES.length >= 30,
      `Expected at least 30 drug profiles, got ${DRUG_RECEPTOR_PROFILES.length}`,
    );
  });

  it("ensures every drug profile maps to an existing catalog ID in DRUG_BY_ID", () => {
    for (const profile of DRUG_RECEPTOR_PROFILES) {
      assert.ok(
        profile.drugId in DRUG_BY_ID,
        `drugId '${profile.drugId}' in receptor profiles does not exist in DRUG_BY_ID catalog`,
      );
    }
  });

  it("validates required core drugs across therapeutic categories", () => {
    const requiredDrugs = [
      // Antipsychotics
      "clozapine", "olanzapine", "quetiapine", "risperidone", "aripiprazole", "haloperidol",
      // Antidepressants
      "fluoxetine", "sertraline", "venlafaxine", "bupropion", "amitriptyline", "mirtazapine",
      // Sedatives / Anxiolytics
      "clonazepam", "zolpidem", "buspirone", "hydroxyzine", "dexmedetomidine",
      // Analgesics
      "morphine", "fentanyl", "buprenorphine", "ketamine", "tramadol",
      // Cardiovascular / Autonomic
      "propranolol", "clonidine", "prazosin", "atropine", "epinephrine",
    ];

    for (const drugId of requiredDrugs) {
      const profile = getProfileForDrug(drugId);
      assert.ok(profile, `Missing required clinical agent profile: ${drugId}`);
      assert.equal(profile.drugId, drugId);
      assert.ok(profile.drugName.length > 0);
      assert.ok(profile.primaryClass.length > 0);
      assert.ok(profile.mechanismSummary.length > 0);
      assert.ok(profile.primaryTarget.length > 0);
      assert.ok(profile.bindings.length >= 3, `${drugId} should have at least 3 receptor bindings`);
      assert.ok(profile.downstreamEffects.length >= 3, `${drugId} should list at least 3 downstream effects`);
    }
  });

  it("validates structural integrity of binding entries across all profiles", () => {
    for (const profile of DRUG_RECEPTOR_PROFILES) {
      for (const binding of profile.bindings) {
        assert.ok(binding.receptor.length > 0, `${profile.drugId}: binding has empty receptor name`);
        assert.ok(VALID_FAMILIES.includes(binding.targetFamily), `${profile.drugId}: invalid target family '${binding.targetFamily}'`);
        assert.ok(VALID_TIERS.includes(binding.affinityTier), `${profile.drugId}: invalid affinity tier '${binding.affinityTier}'`);
        assert.ok(VALID_ACTIVITIES.includes(binding.functionalActivity), `${profile.drugId}: invalid functional activity '${binding.functionalActivity}'`);
        assert.ok(binding.clinicalSignificance.length > 0, `${profile.drugId}: missing clinical significance for ${binding.receptor}`);

        if (binding.affinityKiNm !== undefined) {
          assert.ok(binding.affinityKiNm >= 0, `${profile.drugId}: Ki value must be non-negative`);
        }
      }
    }
  });
});

describe("Receptor Profiles Helper Functions", () => {
  it("getProfileForDrug retrieves correct profile and handles case/whitespace insensitivity", () => {
    const clozapine = getProfileForDrug("clozapine");
    assert.ok(clozapine);
    assert.equal(clozapine.drugName, "Clozapine");

    const upper = getProfileForDrug("  CLOZAPINE  ");
    assert.ok(upper);
    assert.equal(upper.drugId, "clozapine");

    assert.equal(getProfileForDrug("unknown_substance_xyz"), null);
    assert.equal(getProfileForDrug(""), null);
  });

  it("getAllDrugProfiles returns full list", () => {
    const all = getAllDrugProfiles();
    assert.equal(all.length, DRUG_RECEPTOR_PROFILES.length);
  });

  it("filterProfilesByClass filters accurately by primary class and pill tags", () => {
    const all = filterProfilesByClass("all");
    assert.equal(all.length, DRUG_RECEPTOR_PROFILES.length);

    const antipsychotics = filterProfilesByClass("Antipsychotics");
    assert.ok(antipsychotics.length >= 6);
    assert.ok(antipsychotics.some((p) => p.drugId === "haloperidol"));
    assert.ok(antipsychotics.some((p) => p.drugId === "clozapine"));
    assert.ok(!antipsychotics.some((p) => p.drugId === "fluoxetine"));

    const antidepressants = filterProfilesByClass("Antidepressants");
    assert.ok(antidepressants.length >= 6);
    assert.ok(antidepressants.some((p) => p.drugId === "sertraline"));
    assert.ok(antidepressants.some((p) => p.drugId === "mirtazapine"));

    const opioids = filterProfilesByClass("Opioids");
    assert.ok(opioids.length >= 5);
    assert.ok(opioids.some((p) => p.drugId === "morphine"));
    assert.ok(opioids.some((p) => p.drugId === "fentanyl"));

    const sedatives = filterProfilesByClass("Sedatives");
    assert.ok(sedatives.length >= 5);
    assert.ok(sedatives.some((p) => p.drugId === "clonazepam"));
    assert.ok(sedatives.some((p) => p.drugId === "buspirone"));

    const autonomic = filterProfilesByClass("Autonomic");
    assert.ok(autonomic.length >= 5);
    assert.ok(autonomic.some((p) => p.drugId === "propranolol"));
    assert.ok(autonomic.some((p) => p.drugId === "clonidine"));
  });

  it("searchProfiles performs multi-field keyword querying", () => {
    const byName = searchProfiles("haloperidol");
    assert.ok(byName.length >= 1);
    assert.equal(byName[0].drugId, "haloperidol");

    const byReceptor = searchProfiles("NMDA");
    assert.ok(byReceptor.some((p) => p.drugId === "ketamine"));
    assert.ok(byReceptor.some((p) => p.drugId === "methadone"));

    const byMechanism = searchProfiles("dissociative");
    assert.ok(byMechanism.some((p) => p.drugId === "ketamine"));

    const byEmpty = searchProfiles("");
    assert.equal(byEmpty.length, DRUG_RECEPTOR_PROFILES.length);
  });

  it("compareReceptorProfiles generates rich side-by-side comparison for Haloperidol vs Clozapine", () => {
    const comparison = compareReceptorProfiles("haloperidol", "clozapine");
    assert.ok(comparison.drug1);
    assert.ok(comparison.drug2);
    assert.equal(comparison.drug1.drugName, "Haloperidol");
    assert.equal(comparison.drug2.drugName, "Clozapine");

    assert.ok(comparison.sharedReceptors.includes("D2"));
    assert.ok(comparison.divergentReceptors.length > 0);
    assert.ok(comparison.comparisonTable.length > 0);

    // Clinical divergence highlights
    assert.ok(comparison.clinicalDivergenceNotes.length > 0);
    const notesJoined = comparison.clinicalDivergenceNotes.join(" ");
    // Should highlight EPS difference (Haloperidol D2 vs Clozapine)
    assert.match(notesJoined, /motor|EPS|extrapyramidal/i);
    // Should highlight Sedation/H1 difference (Clozapine H1 vs Haloperidol)
    assert.match(notesJoined, /sedation|H1/i);
    // Should highlight Anticholinergic/M1 difference (Clozapine M1)
    assert.match(notesJoined, /anticholinergic|M1/i);
  });

  it("compareReceptorProfiles analyzes Sertraline vs Mirtazapine divergence", () => {
    const comparison = compareReceptorProfiles("sertraline", "mirtazapine");
    assert.ok(comparison.drug1);
    assert.ok(comparison.drug2);
    assert.ok(comparison.comparisonTable.length > 0);

    const notesJoined = comparison.clinicalDivergenceNotes.join(" ");
    // Mirtazapine has high H1 sedation and weight gain
    assert.match(notesJoined, /sedation|H1|weight/i);
  });

  it("compareReceptorProfiles handles missing drugs gracefully", () => {
    const comparison = compareReceptorProfiles("invalid_1", "invalid_2");
    assert.equal(comparison.drug1, null);
    assert.equal(comparison.drug2, null);
    assert.equal(comparison.sharedReceptors.length, 0);
    assert.ok(comparison.clinicalDivergenceNotes[0].includes("Neither drug profile"));
  });
});

describe("Non-prescriptive Regulatory Posture (FD&C Act § 520(o)(1)(E))", () => {
  it("exports official regulatory disclaimer referencing FD&C Act § 520(o)(1)(E)", () => {
    assert.ok(RECEPTOR_PROFILES_REGULATORY_DISCLAIMER.length > 0);
    assert.match(RECEPTOR_PROFILES_REGULATORY_DISCLAIMER, /FD&C Act § 520\(o\)\(1\)\(E\)/);
    assert.match(RECEPTOR_PROFILES_REGULATORY_DISCLAIMER, /decision-support/i);
    assert.match(RECEPTOR_PROFILES_REGULATORY_DISCLAIMER, /educational/i);
    assert.match(RECEPTOR_PROFILES_REGULATORY_DISCLAIMER, /no dosing directives/i);
  });

  it("ensures profiles avoid prescriptive treatment directives", () => {
    for (const profile of DRUG_RECEPTOR_PROFILES) {
      const text = JSON.stringify(profile);
      assert.doesNotMatch(text, /\bprescribe\s+\d+/i, `Profile ${profile.drugId} contains prescription directive`);
      assert.doesNotMatch(text, /\btake\s+\d+\s*mg\s+daily\b/i, `Profile ${profile.drugId} contains dosing directive`);
      assert.doesNotMatch(text, /\btitrate\s+to\s+\d+\s*mg\b/i, `Profile ${profile.drugId} contains titration directive`);
    }
  });
});
