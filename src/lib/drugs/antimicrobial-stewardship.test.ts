import assert from "node:assert/strict";
import test from "node:test";
import {
  ANTIMICROBIAL_CITATIONS,
  ANTIMICROBIAL_PROFILES,
  ANTIMICROBIAL_REGULATORY_DISCLAIMER,
  antimicrobialOnDesk,
  antimicrobialReportOnDesk,
  detectAntimicrobialCollisions,
  evaluateCefepimeNeurotoxicity,
  evaluateDaptomycinMyopathy,
  evaluateFluoroquinoloneCollisions,
  evaluateOxazolidinoneToxicities,
  evaluatePolymyxinToxicities,
  generateStewardshipMonitoringPlan,
  generateStewardshipPearls,
} from "./antimicrobial-stewardship";
import { DEFAULT_HOST, type HostContext } from "./types";

test("Regulatory Posture: exports statutory FD&C Act § 520(o)(1)(E) disclaimer and authoritative citations", () => {
  assert.ok(
    ANTIMICROBIAL_REGULATORY_DISCLAIMER.includes("Section 520(o)(1)(E)"),
    "Disclaimer must cite FD&C Act § 520(o)(1)(E)"
  );
  assert.ok(
    ANTIMICROBIAL_REGULATORY_DISCLAIMER.includes("non-prescriptive educational decision-support"),
    "Disclaimer must clarify non-prescriptive educational scope"
  );
  assert.ok(ANTIMICROBIAL_CITATIONS.length >= 7, "Citations must include comprehensive literature");
  assert.ok(
    ANTIMICROBIAL_CITATIONS.some((c) => c.includes("Cefepime") && c.includes("renal")),
    "Citations must reference Cefepime neurotoxicity in renal impairment"
  );
  assert.ok(
    ANTIMICROBIAL_CITATIONS.some((c) => c.includes("Daptomycin") && c.includes("CPK")),
    "Citations must reference Daptomycin CPK/myopathy trials"
  );
  assert.ok(
    ANTIMICROBIAL_CITATIONS.some((c) => c.includes("oxazolidinone") || c.includes("linezolid")),
    "Citations must reference Oxazolidinone / Linezolid adverse events"
  );
  assert.ok(
    ANTIMICROBIAL_CITATIONS.some((c) => c.includes("Polymyxin")),
    "Citations must reference Polymyxin toxicity"
  );
  assert.ok(
    ANTIMICROBIAL_CITATIONS.some((c) => c.includes("fluoroquinolone")),
    "Citations must reference Fluoroquinolone safety warnings"
  );
});

test("antimicrobialOnDesk: accurately identifies targeted antimicrobials and interacting perpetrators on desk", () => {
  const empty = antimicrobialOnDesk(["metoprolol", "lisinopril"]);
  assert.equal(empty.hasAntimicrobial, false);
  assert.equal(empty.hasCefepime, false);
  assert.equal(empty.hasDaptomycin, false);
  assert.equal(empty.matchedAntimicrobials.length, 0);

  const cefepimeDesk = antimicrobialOnDesk(["cefepime", "furosemide"]);
  assert.equal(cefepimeDesk.hasAntimicrobial, true);
  assert.equal(cefepimeDesk.hasCefepime, true);
  assert.ok(cefepimeDesk.matchedAntimicrobials.includes("cefepime"));

  const daptoStatinDesk = antimicrobialOnDesk(["daptomycin", "atorvastatin"]);
  assert.equal(daptoStatinDesk.hasDaptomycin, true);
  assert.equal(daptoStatinDesk.hasStatin, true);
  assert.ok(daptoStatinDesk.matchedInteractingAgents.includes("atorvastatin"));

  const linezolidSeroDesk = antimicrobialOnDesk(["linezolid", "sertraline"]);
  assert.equal(linezolidSeroDesk.hasLinezolid, true);
  assert.equal(linezolidSeroDesk.hasOxazolidinone, true);
  assert.equal(linezolidSeroDesk.hasSerotonergic, true);

  const polymyxinNmbaDesk = antimicrobialOnDesk(["colistin", "rocuronium", "gentamicin"]);
  assert.equal(polymyxinNmbaDesk.hasColistin, true);
  assert.equal(polymyxinNmbaDesk.hasPolymyxin, true);
  assert.equal(polymyxinNmbaDesk.hasNeuromuscularBlocker, true);
  assert.equal(polymyxinNmbaDesk.hasAminoglycoside, true);

  const fqCationSteroidDesk = antimicrobialOnDesk([
    "ciprofloxacin",
    "calcium-carbonate",
    "prednisone",
  ]);
  assert.equal(fqCationSteroidDesk.hasCiprofloxacin, true);
  assert.equal(fqCationSteroidDesk.hasFluoroquinolone, true);
  assert.equal(fqCationSteroidDesk.hasCation, true);
  assert.equal(fqCationSteroidDesk.hasCorticosteroid, true);
});

test("Cefepime Neurotoxicity: details GABA-A competitive antagonism, renal threshold, and clinical spectrum", () => {
  const normalHost: HostContext = { ...DEFAULT_HOST, kidney: "ok", age: "adult" };
  const reportNormal = evaluateCefepimeNeurotoxicity(["cefepime"], normalHost);
  assert.ok(reportNormal);
  assert.equal(reportNormal.agentId, "cefepime");
  assert.equal(reportNormal.riskLevel, "standard");
  assert.ok(reportNormal.mechanism.includes("GABA-A"));
  assert.ok(reportNormal.mechanism.includes("competitive antagonist"));

  // Check clinical spectrum items
  assert.ok(reportNormal.clinicalSpectrum.ncse.name.includes("Non-Convulsive Status Epilepticus"));
  assert.ok(reportNormal.clinicalSpectrum.eegFindings.pattern.includes("Generalized Periodic Discharges"));
  assert.ok(reportNormal.clinicalSpectrum.myoclonus.description.includes("shock-like"));
  assert.ok(reportNormal.clinicalSpectrum.asterixis.name.includes("Asterixis"));

  // Check onset kinetics
  assert.ok(reportNormal.onsetKinetics.typicalOnsetDays.includes("2 to 5 days"));
  assert.ok(reportNormal.onsetKinetics.reversalCourse.includes("48 to 72 hours"));
  assert.equal(reportNormal.onsetKinetics.serumTroughThresholdMcgMl, 20);

  // Check hemodialysis clearance
  assert.equal(reportNormal.hemodialysisClearance.fractionRemovedPerSessionPct, 70);
  assert.ok(
    reportNormal.hemodialysisClearance.dosingScheduleStandard.includes("AFTER hemodialysis")
  );

  // Check CKD host escalation to critical
  const ckdHost: HostContext = { ...DEFAULT_HOST, kidney: "ckd" };
  const reportCkd = evaluateCefepimeNeurotoxicity(["cefepime"], ckdHost);
  assert.ok(reportCkd);
  assert.equal(reportCkd.riskLevel, "critical");
  assert.ok(reportCkd.riskFactors.some((f) => f.includes("chronic kidney disease")));
});

test("Daptomycin Skeletal Myopathy: models sarcolemmal disruption, statin collision, and CPK monitoring rails", () => {
  const host: HostContext = { ...DEFAULT_HOST, kidney: "ok" };

  // Daptomycin alone
  const daptAlone = evaluateDaptomycinMyopathy(["daptomycin"], host);
  assert.ok(daptAlone);
  assert.equal(daptAlone.statinCollision.present, false);
  assert.equal(daptAlone.statinCollision.severity, "none");
  assert.ok(daptAlone.mechanism.includes("sarcolemma"));
  assert.equal(daptAlone.practiceStandard.discontinuationThresholds.symptomaticCpkU_L, 1000);
  assert.equal(daptAlone.practiceStandard.discontinuationThresholds.asymptomaticCpkU_L, 2000);

  // Daptomycin + Atorvastatin
  const daptStatin = evaluateDaptomycinMyopathy(["daptomycin", "atorvastatin"], host);
  assert.ok(daptStatin);
  assert.equal(daptStatin.statinCollision.present, true);
  assert.equal(daptStatin.statinCollision.severity, "major");
  assert.ok(daptStatin.statinCollision.statinAgents.includes("atorvastatin"));
  assert.ok(daptStatin.practiceStandard.statinManagement.includes("Hold all statin therapy"));
  assert.ok(daptStatin.stewardshipAction.some((a) => a.includes("CRITICAL COLLISION")));

  // CKD host requires twice weekly monitoring
  const ckdHost: HostContext = { ...DEFAULT_HOST, kidney: "ckd" };
  const daptCkd = evaluateDaptomycinMyopathy(["daptomycin"], ckdHost);
  assert.ok(daptCkd);
  assert.ok(daptCkd.practiceStandard.cpkMonitoringCadence.includes("Twice weekly"));
});

test("Linezolid & Tedizolid: models reversible MAO inhibition, Hunter serotonin toxicity, tyramine, and chronotoxicity", () => {
  const host: HostContext = DEFAULT_HOST;

  // Linezolid alone
  const linAlone = evaluateOxazolidinoneToxicities(["linezolid"], host);
  assert.ok(linAlone);
  assert.ok(linAlone.agentsPresent.includes("linezolid"));
  assert.ok(linAlone.mechanism.includes("MAO-A"));
  assert.equal(linAlone.serotoninToxicity.riskLevel, "none");

  // Check tyramine details
  assert.ok(linAlone.tyraminePressorCollision.dietaryAvoidanceList.some((d) => d.includes("cheese")));
  assert.ok(linAlone.tyraminePressorCollision.dietaryAvoidanceList.some((d) => d.includes("beers")));

  // Check time-dependent toxicities
  assert.equal(linAlone.timeDependentToxicities.myelosuppression.onsetThresholdDays, 14);
  assert.ok(
    linAlone.timeDependentToxicities.myelosuppression.manifestations.includes(
      "Thrombocytopenia (platelets < 100,000/mcL)"
    )
  );
  assert.equal(linAlone.timeDependentToxicities.neuropathies.onsetThresholdDays, 28);
  assert.ok(linAlone.timeDependentToxicities.neuropathies.opticNeuropathy.includes("scotomas"));

  // Linezolid + SSRI (sertraline) -> life-threatening serotonin toxicity
  const linSertraline = evaluateOxazolidinoneToxicities(["linezolid", "sertraline"], host);
  assert.ok(linSertraline);
  assert.equal(linSertraline.serotoninToxicity.riskLevel, "severe-life-threatening");
  assert.ok(linSertraline.serotoninToxicity.interactingAgents.includes("sertraline"));
  assert.ok(linSertraline.serotoninToxicity.hunterCriteria.includes("Spontaneous clonus"));
  assert.ok(
    linSertraline.stewardshipAction.some((a) => a.includes("CONTRAINDICATED / HIGH-ALERT COLLISION"))
  );
});

test("Colistin & Polymyxin B: models tubular membrane permeabilization, presynaptic blockade, and calcium reversal", () => {
  const host: HostContext = DEFAULT_HOST;

  // Colistin + Vecuronium + Gentamicin
  const polyReport = evaluatePolymyxinToxicities(["colistin", "vecuronium", "gentamicin"], host);
  assert.ok(polyReport);
  assert.ok(polyReport.agentsPresent.includes("colistin"));
  assert.equal(polyReport.nephrotoxicity.incidencePct, "30% to 50%");
  assert.ok(polyReport.nephrotoxicity.pathophysiology.includes("cationic amphipathic detergents"));

  // Neuromuscular blockade
  assert.ok(polyReport.neuromuscularBlockade.mechanism.includes("presynaptic"));
  assert.ok(polyReport.neuromuscularBlockade.synergisticAgents.includes("vecuronium"));
  assert.ok(polyReport.neuromuscularBlockade.synergisticAgents.includes("gentamicin"));
  assert.ok(polyReport.neuromuscularBlockade.reversalPearl.includes("Calcium Gluconate"));
  assert.ok(polyReport.stewardshipAction.some((a) => a.includes("CRITICAL ANESTHETIC COLLISION")));
});

test("Fluoroquinolones: models boxed warnings, steroid Achilles tendon synergy, and cation chelation rails", () => {
  const host: HostContext = { ...DEFAULT_HOST, age: "geriatric" };

  // Cipro + Prednisone + Calcium
  const fqReport = evaluateFluoroquinoloneCollisions(
    ["ciprofloxacin", "prednisone", "calcium-carbonate"],
    host
  );
  assert.ok(fqReport);
  assert.ok(fqReport.agentsPresent.includes("ciprofloxacin"));

  // Boxed warnings
  const bbw = fqReport.blackBoxWarnings;
  assert.ok(bbw.tendinopathy.targetSite.includes("Achilles tendon"));
  assert.ok(bbw.tendinopathy.mechanism.includes("matrix metalloproteinases"));
  assert.equal(bbw.tendinopathy.steroidCollision.present, true);
  assert.ok(bbw.tendinopathy.steroidCollision.steroids.includes("prednisone"));
  assert.ok(bbw.tendinopathy.steroidCollision.synergyDescription.includes("4- to 10-fold"));
  assert.ok(bbw.peripheralNeuropathy.description.includes("axonal polyneuropathy"));
  assert.ok(bbw.cnsToxicities.mechanism.includes("GABA-A"));
  assert.ok(bbw.qtProlongation.hierarchy.includes("Moxifloxacin > Levofloxacin > Ciprofloxacin"));
  assert.ok(bbw.aorticAneurysmDissection.mechanism.includes("aortic dissection"));

  // Cation chelation
  assert.equal(fqReport.cationChelationCollision.present, true);
  assert.ok(fqReport.cationChelationCollision.cationsPresent.includes("calcium-carbonate"));
  assert.equal(fqReport.cationChelationCollision.bioavailabilityReductionPct, "50% to 90%");
  assert.ok(
    fqReport.cationChelationCollision.mandatorySpacingRule.includes(
      "2 hours BEFORE or 4 to 6 hours AFTER"
    )
  );

  // Stewardship actions
  assert.ok(
    fqReport.stewardshipAction.some((a) => a.includes("MANDATORY TIMING SEPARATION"))
  );
  assert.ok(
    fqReport.stewardshipAction.some((a) => a.includes("HIGH-RISK BOXED COLLISION"))
  );
});

test("detectAntimicrobialCollisions: identifies clinical collision records with exact severity ratings", () => {
  const ckdHost: HostContext = { ...DEFAULT_HOST, kidney: "ckd" };
  const allDrugs = [
    "cefepime",
    "daptomycin",
    "atorvastatin",
    "linezolid",
    "sertraline",
    "colistin",
    "rocuronium",
    "ciprofloxacin",
    "prednisone",
    "ferrous-sulfate",
    "ibuprofen",
  ];

  const collisions = detectAntimicrobialCollisions(allDrugs, ckdHost);
  assert.ok(collisions.length >= 7, "Must detect all major collisions in complex tray");

  const cefepimeCol = collisions.find((c) => c.category === "cefepime-renal-neurotoxicity");
  assert.ok(cefepimeCol);
  assert.equal(cefepimeCol.severity, "major");

  const daptoCol = collisions.find((c) => c.category === "daptomycin-statin-myopathy");
  assert.ok(daptoCol);
  assert.equal(daptoCol.severity, "major");

  const linezolidCol = collisions.find((c) => c.category === "oxazolidinone-serotonergic-syndrome");
  assert.ok(linezolidCol);
  assert.equal(linezolidCol.severity, "contraindicated");

  const polyCol = collisions.find((c) => c.category === "polymyxin-nmba-respiratory-paralysis");
  assert.ok(polyCol);
  assert.equal(polyCol.severity, "contraindicated");

  const fqSteroidCol = collisions.find((c) => c.category === "fluoroquinolone-steroid-tendon-rupture");
  assert.ok(fqSteroidCol);
  assert.equal(fqSteroidCol.severity, "major");

  const fqChelationCol = collisions.find((c) => c.category === "fluoroquinolone-cation-chelation");
  assert.ok(fqChelationCol);
  assert.equal(fqChelationCol.severity, "major");

  const fqNsaidCol = collisions.find((c) => c.category === "fluoroquinolone-nsaid-seizure");
  assert.ok(fqNsaidCol);
  assert.equal(fqNsaidCol.severity, "moderate");
});

test("antimicrobialReportOnDesk: generates comprehensive master report with pearls, monitoring plan, and disclaimer", () => {
  const tray = ["cefepime", "daptomycin", "simvastatin", "linezolid"];
  const host: HostContext = { ...DEFAULT_HOST, kidney: "ckd" };

  const report = antimicrobialReportOnDesk(tray, host);
  assert.equal(report.hasAntimicrobial, true);
  assert.equal(report.antimicrobialsOnDesk.length, 3); // cefepime, daptomycin, linezolid
  assert.ok(report.cefepimeNeurotoxicity);
  assert.ok(report.daptomycinMyopathy);
  assert.ok(report.oxazolidinoneSerotoninTyramine);
  assert.equal(report.polymyxinToxicities, null);
  assert.equal(report.fluoroquinoloneCollisions, null);

  // Pearls & Monitoring Plan
  assert.ok(report.stewardshipPearls.length >= 3);
  assert.ok(report.stewardshipPearls.some((p) => p.includes("Cefepime Hemodialysis Timing")));
  assert.ok(report.stewardshipPearls.some((p) => p.includes("Daptomycin Statin Hold Standard")));
  assert.ok(report.monitoringPlan.length >= 3);
  assert.ok(report.monitoringPlan.some((m) => m.parameter.includes("Creatine Phosphokinase")));

  // Regulatory text
  assert.ok(report.disclaimer.includes("FD&C Act § 520(o)(1)(E)"));
  assert.ok(report.citations.length > 5);
});

test("Profiles integrity: ANTIMICROBIAL_PROFILES contains verified clinical metadata for all core agents", () => {
  const expectedAgents = [
    "cefepime",
    "daptomycin",
    "linezolid",
    "tedizolid",
    "colistin",
    "polymyxin-b",
    "ciprofloxacin",
    "levofloxacin",
    "moxifloxacin",
  ];

  for (const id of expectedAgents) {
    const profile = ANTIMICROBIAL_PROFILES[id];
    assert.ok(profile, `Profile must exist for ${id}`);
    assert.equal(profile.id, id);
    assert.ok(profile.name.length > 0);
    assert.ok(profile.spectrumSummary.length > 0);
    assert.ok(profile.stewardshipIndication.length > 0);
    assert.ok(profile.keyToxicities.length > 0);
  }
});
