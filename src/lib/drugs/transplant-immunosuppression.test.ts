import assert from "node:assert/strict";
import test from "node:test";
import {
  transplantOnDesk,
  transplantReportOnDesk,
  simulateMpaEnterohepaticKinetics,
  simulateCniSteroidTaper,
  detectTransplantCollisions,
  TRANSPLANT_CDS_REGULATORY_NOTICE,
  TRANSPLANT_LITERATURE_CITATIONS,
  SOLID_ORGAN_TDM_PROFILES,
  TRANSPLANT_DRUG_PROFILES,
  type SolidOrgan,
} from "./transplant-immunosuppression";
import { DEFAULT_HOST, type HostContext } from "./types";

test("transplantOnDesk: accurately detects quad-therapy agents and aliases", () => {
  // Test individual primary agents
  const tacDesk = transplantOnDesk(["tacrolimus"]);
  assert.equal(tacDesk.hasTransplant, true);
  assert.equal(tacDesk.hasCni, true);
  assert.equal(tacDesk.hasTacrolimus, true);
  assert.equal(tacDesk.hasCyclosporine, false);

  const csaDesk = transplantOnDesk(["cyclosporine"]);
  assert.equal(csaDesk.hasTransplant, true);
  assert.equal(csaDesk.hasCni, true);
  assert.equal(csaDesk.hasCyclosporine, true);
  assert.equal(csaDesk.hasTacrolimus, false);

  const mmfDesk = transplantOnDesk(["mycophenolate"]);
  assert.equal(mmfDesk.hasTransplant, true);
  assert.equal(mmfDesk.hasAntimetabolite, true);
  assert.equal(mmfDesk.hasMycophenolate, true);
  assert.equal(mmfDesk.hasMmf, true);

  const ecmpsDesk = transplantOnDesk(["myfortic"]);
  assert.equal(ecmpsDesk.hasTransplant, true);
  assert.equal(ecmpsDesk.hasAntimetabolite, true);
  assert.equal(ecmpsDesk.hasMycophenolate, true);
  assert.equal(ecmpsDesk.hasEcMps, true);

  const azaDesk = transplantOnDesk(["azathioprine"]);
  assert.equal(azaDesk.hasTransplant, true);
  assert.equal(azaDesk.hasAntimetabolite, true);
  assert.equal(azaDesk.hasAzathioprine, true);

  const siroDesk = transplantOnDesk(["sirolimus"]);
  assert.equal(siroDesk.hasTransplant, true);
  assert.equal(siroDesk.hasMtorInhibitor, true);
  assert.equal(siroDesk.hasSirolimus, true);

  const everoDesk = transplantOnDesk(["everolimus"]);
  assert.equal(everoDesk.hasTransplant, true);
  assert.equal(everoDesk.hasMtorInhibitor, true);
  assert.equal(everoDesk.hasEverolimus, true);

  const predDesk = transplantOnDesk(["prednisone"]);
  assert.equal(predDesk.hasCorticosteroid, true);
  assert.equal(predDesk.hasPrednisone, true);

  const medrolDesk = transplantOnDesk(["methylprednisolone"]);
  assert.equal(medrolDesk.hasCorticosteroid, true);
  assert.equal(medrolDesk.hasMethylprednisolone, true);
});

test("transplantOnDesk: resolves brand names, formulation aliases, and acronyms", () => {
  const brandDesk = transplantOnDesk([
    "prograf",
    "cellcept",
    "rapamune",
    "deltasone",
  ]);
  assert.equal(brandDesk.hasTransplant, true);
  assert.equal(brandDesk.hasTacrolimus, true);
  assert.equal(brandDesk.hasMmf, true);
  assert.equal(brandDesk.hasSirolimus, true);
  assert.equal(brandDesk.hasPrednisone, true);

  const csaBrandDesk = transplantOnDesk([
    "neoral",
    "sandimmune",
    "gengraf",
    "csa",
    "fk506",
  ]);
  assert.equal(csaBrandDesk.hasCyclosporine, true);
  assert.equal(csaBrandDesk.hasTacrolimus, true);

  const delayedReleaseDesk = transplantOnDesk(["ec-mps", "zortress", "solu-medrol"]);
  assert.equal(delayedReleaseDesk.hasEcMps, true);
  assert.equal(delayedReleaseDesk.hasEverolimus, true);
  assert.equal(delayedReleaseDesk.hasMethylprednisolone, true);
});

test("transplantOnDesk: recognizes interacting perpetrators and ignores non-transplant drugs", () => {
  const perpetratorDesk = transplantOnDesk([
    "tacrolimus",
    "mycophenolate",
    "ciprofloxacin",
    "cholestyramine",
    "pantoprazole",
    "voriconazole",
    "allopurinol",
  ]);
  assert.equal(perpetratorDesk.hasTransplant, true);
  assert.equal(perpetratorDesk.hasMicrobiomeAntibiotic, true);
  assert.equal(perpetratorDesk.hasBileAcidSequestrant, true);
  assert.equal(perpetratorDesk.hasPpi, true);
  assert.equal(perpetratorDesk.hasCyp3aInhibitor, true);
  assert.equal(perpetratorDesk.hasXoInhibitor, true);

  const nonTransplantDesk = transplantOnDesk(["atorvastatin", "metformin", "lisinopril"]);
  assert.equal(nonTransplantDesk.hasTransplant, false);
  assert.equal(nonTransplantDesk.hasCni, false);
  assert.equal(nonTransplantDesk.hasAntimetabolite, false);
  assert.equal(nonTransplantDesk.hasMtorInhibitor, false);
  assert.equal(nonTransplantDesk.detectedTransplantDrugIds.length, 0);
});

test("Solid Organ Maintenance Protocols: validates Kidney, Liver, Heart, Lung TDM matrix", () => {
  const organs: SolidOrgan[] = ["kidney", "liver", "heart", "lung"];

  for (const organ of organs) {
    const profile = SOLID_ORGAN_TDM_PROFILES[organ];
    assert.ok(profile, `Profile must exist for organ ${organ}`);
    assert.ok(profile.firstLineMaintenance.length > 0);
    assert.ok(profile.tacrolimusTargets.months0to3.length > 0);
    assert.ok(profile.tacrolimusTargets.maintenance.length > 0);
    assert.ok(profile.uniqueOrganVulnerabilities.length > 0);
  }

  // Lung transplant recipients require highest CNI intensity due to environmental exposure
  const lung = SOLID_ORGAN_TDM_PROFILES.lung;
  assert.match(lung.tacrolimusTargets.months0to3, /10–14/);
  assert.match(lung.tacrolimusTargets.maintenance, /8–12/);
  assert.match(lung.mtorConsiderations, /bronchial/i);

  // Liver transplant recipients exhibit relative graft tolerance and require lower long-term targets
  const liver = SOLID_ORGAN_TDM_PROFILES.liver;
  assert.match(liver.tacrolimusTargets.maintenance, /4–6/);
  assert.match(liver.mtorConsiderations, /Hepatic Artery Thrombosis/i);

  // Kidney allografts: mTOR conversion requires baseline proteinuria monitoring
  const kidney = SOLID_ORGAN_TDM_PROFILES.kidney;
  assert.match(kidney.mtorConsiderations, /500-800 mg/i);
});

test("Enterohepatic Recirculation Model: Tacrolimus preserves intact MPA secondary peak at 6-12h", () => {
  const sim = simulateMpaEnterohepaticKinetics({
    formulation: "mmf",
    doseMg: 1000,
    cniPerpetrator: "tacrolimus",
    antibioticActive: false,
    cholestyramineActive: false,
    ppiActive: false,
  });

  assert.equal(sim.secondaryPeakAbolished, false);
  assert.ok(sim.secondaryPeakCmaxMcgMl > 5.0, "Secondary peak must be present with Tacrolimus");
  assert.equal(sim.secondaryPeakTmaxHours, 8.0, "Secondary peak should occur around 8h (6-12h window)");
  assert.ok(
    sim.secondaryPeakContributionPct >= 15 && sim.secondaryPeakContributionPct <= 40,
    "Secondary peak should contribute 15-40% of total AUC",
  );
  assert.ok(sim.effectiveAuc0_24 >= 40 && sim.effectiveAuc0_24 <= 55, "Normal 24h AUC range");
});

test("Enterohepatic Recirculation Divergence: Cyclosporine abolishes secondary MPA peak via MRP2 inhibition", () => {
  const simCsa = simulateMpaEnterohepaticKinetics({
    formulation: "mmf",
    doseMg: 1000,
    cniPerpetrator: "cyclosporine",
    antibioticActive: false,
    cholestyramineActive: false,
    ppiActive: false,
  });

  assert.equal(simCsa.secondaryPeakAbolished, true);
  assert.equal(simCsa.secondaryPeakCmaxMcgMl, 0.0);
  assert.ok(
    simCsa.aucPercentChange <= -25 && simCsa.aucPercentChange >= -45,
    "Cyclosporine MRP2 blockade should reduce MPA AUC by ~30-40%",
  );
  assert.ok(
    simCsa.mechanisticNotes.some((note) => note.includes("MRP2 (ABCC2)")),
    "Must explain MRP2 canalicular inhibition",
  );
});

test("Microbiome Collision: Broad-spectrum antibiotics eradicate beta-glucuronidase and drop MPA AUC", () => {
  const simAbx = simulateMpaEnterohepaticKinetics({
    formulation: "mmf",
    doseMg: 1000,
    cniPerpetrator: "tacrolimus",
    antibioticActive: true,
    cholestyramineActive: false,
    ppiActive: false,
  });

  assert.equal(simAbx.secondaryPeakAbolished, true);
  assert.ok(
    simAbx.aucPercentChange <= -25 && simAbx.aucPercentChange >= -50,
    "Antibiotics should drop MPA AUC by 30-50%",
  );
  assert.ok(
    simAbx.mechanisticNotes.some((note) => note.includes("beta-glucuronidase")),
    "Must identify beta-glucuronidase flora eradication",
  );
});

test("Bile Acid Sequestrant Collision: Cholestyramine binds MPA intraluminally and interrupts EHC", () => {
  const simSequestrant = simulateMpaEnterohepaticKinetics({
    formulation: "mmf",
    doseMg: 1000,
    cniPerpetrator: "tacrolimus",
    antibioticActive: false,
    cholestyramineActive: true,
    ppiActive: false,
  });

  assert.equal(simSequestrant.secondaryPeakAbolished, true);
  assert.ok(
    simSequestrant.aucPercentChange <= -35,
    "Cholestyramine intraluminal binding should drop AUC by >= 35%",
  );
  assert.ok(
    simSequestrant.mechanisticNotes.some((n) => n.includes("Cholestyramine binds MPA")),
  );
});

test("Gastric Dissolution Interaction: PPI blunts MMF dissolution but spares EC-MPS (Myfortic)", () => {
  // MMF + PPI: blunted Cmax, delayed absorption
  const simMmfPpi = simulateMpaEnterohepaticKinetics({
    formulation: "mmf",
    doseMg: 1000,
    cniPerpetrator: "tacrolimus",
    antibioticActive: false,
    cholestyramineActive: false,
    ppiActive: true,
  });

  const simMmfBaseline = simulateMpaEnterohepaticKinetics({
    formulation: "mmf",
    doseMg: 1000,
    cniPerpetrator: "tacrolimus",
    antibioticActive: false,
    cholestyramineActive: false,
    ppiActive: false,
  });

  assert.ok(
    simMmfPpi.primaryPeakCmaxMcgMl < simMmfBaseline.primaryPeakCmaxMcgMl,
    "PPI should blunt MMF Cmax",
  );
  assert.ok(
    simMmfPpi.primaryPeakTmaxHours > simMmfBaseline.primaryPeakTmaxHours,
    "PPI should delay MMF Tmax",
  );

  // EC-MPS + PPI: enteric coating releases in small intestine, protected
  const simEcMpsPpi = simulateMpaEnterohepaticKinetics({
    formulation: "ec-mps",
    doseMg: 720,
    cniPerpetrator: "tacrolimus",
    antibioticActive: false,
    cholestyramineActive: false,
    ppiActive: true,
  });

  assert.ok(
    simEcMpsPpi.mechanisticNotes.some((n) => n.includes("EC-MPS (Myfortic) is protected")),
    "EC-MPS must be documented as protected from PPI gastric pH interaction",
  );
});

test("mTOR Inhibitors: FKBP-12 competitive binding, additive nephrotoxicity, and surgical dehiscence", () => {
  // Combination of Tacrolimus + Sirolimus
  const collisions = detectTransplantCollisions(["tacrolimus", "sirolimus"]);

  const fkbpCollision = collisions.find((c) => c.id === "mtor-cni-fkbp12-nephrotoxicity");
  assert.ok(fkbpCollision, "Must detect FKBP-12 competition collision");
  assert.equal(fkbpCollision?.severity, "high");
  assert.match(fkbpCollision?.pharmacologicalMechanism!, /FKBP-12/);
  assert.match(fkbpCollision?.clinicalHazard!, /nephrotoxicity/i);

  const woundCollision = collisions.find((c) => c.id === "mtor-surgical-wound-dehiscence");
  assert.ok(woundCollision, "Must detect surgical wound dehiscence collision");
  assert.match(woundCollision?.pharmacologicalMechanism!, /VEGF/);
  assert.match(woundCollision?.clinicalHazard!, /bronchial/i);
  assert.match(woundCollision?.clinicalHazard!, /hepatic artery thrombosis/i);

  const metabolicCollision = collisions.find(
    (c) => c.id === "mtor-proteinuria-hyperlipidemia-rails",
  );
  assert.ok(metabolicCollision, "Must detect hyperlipidemia and proteinuria rails");
  assert.match(metabolicCollision?.monitoringAndMitigation!, /500-800 mg/);
});

test("Corticosteroid Taper Model: Dynamic CNI Rebound Surge due to resolving CYP3A4/P-gp induction", () => {
  const taperResult = simulateCniSteroidTaper({
    cniAgent: "tacrolimus",
    currentCniTroughNgMl: 8.0,
    initialPrednisoneDoseMg: 20.0,
    taperedPrednisoneDoseMg: 5.0,
  });

  assert.ok(
    taperResult.predictedCniClearanceReductionPct >= 25,
    "Clearance reduction should be at least 25%",
  );
  assert.ok(
    taperResult.projectedReboundTroughNgMl >= 11.0,
    "Projected trough should rebound above 11 ng/mL",
  );
  assert.equal(taperResult.clinicalRiskTier, "high");
  assert.match(taperResult.mechanisticRationale, /Pregnane X Receptor/i);
  assert.match(taperResult.recommendedAction, /proactive/i);

  // Collision alert detection in tray
  const collisions = detectTransplantCollisions(["tacrolimus", "prednisone"]);
  const taperAlert = collisions.find((c) => c.id === "steroid-taper-cni-rebound");
  assert.ok(taperAlert, "Must detect steroid taper dynamic CNI rebound alert");
});

test("Fatal Thiopurine Collision: Azathioprine + Xanthine Oxidase Inhibitor triggers critical alert", () => {
  const collisionsAllopurinol = detectTransplantCollisions(["azathioprine", "allopurinol"]);
  const azaAlert = collisionsAllopurinol.find(
    (c) => c.id === "azathioprine-xo-bone-marrow-aplasia",
  );
  assert.ok(azaAlert, "Must detect Azathioprine + Allopurinol collision");
  assert.equal(azaAlert?.severity, "critical");
  assert.match(azaAlert?.pharmacologicalMechanism!, /6-mercaptopurine/);
  assert.match(azaAlert?.pharmacologicalMechanism!, /6-TGN/);
  assert.match(azaAlert?.clinicalHazard!, /bone marrow aplasia/i);
  assert.match(azaAlert?.monitoringAndMitigation!, /67% to 75%/);

  const collisionsFebuxostat = detectTransplantCollisions(["imuran", "febuxostat"]);
  assert.ok(
    collisionsFebuxostat.some((c) => c.id === "azathioprine-xo-bone-marrow-aplasia"),
  );
});

test("CYP3A4/P-gp Strong Perpetrators: Voriconazole toxicity surge and Rifampin rejection hazards", () => {
  const inhCollisions = detectTransplantCollisions(["tacrolimus", "voriconazole"]);
  const inhAlert = inhCollisions.find((c) => c.id === "cni-strong-cyp3a-inhibitor-surge");
  assert.ok(inhAlert, "Must detect CNI + Strong CYP3A inhibitor alert");
  assert.equal(inhAlert?.severity, "critical");
  assert.match(inhAlert?.clinicalHazard!, /acute kidney injury/i);

  const indCollisions = detectTransplantCollisions(["cyclosporine", "rifampin"]);
  const indAlert = indCollisions.find((c) => c.id === "cni-strong-cyp3a-inducer-rejection");
  assert.ok(indAlert, "Must detect CNI + Strong CYP3A inducer rejection alert");
  assert.equal(indAlert?.severity, "critical");
  assert.match(indAlert?.clinicalHazard!, /allograft rejection/i);
});

test("transplantReportOnDesk: synthesizes complete quad-therapy analysis, host adjustments, and CDS posture", () => {
  // Comprehensive Kidney Quad-Therapy Tray: Tacrolimus + MMF + Prednisone + Ciprofloxacin
  const ckdHost: HostContext = {
    ...DEFAULT_HOST,
    kidney: "ckd",
    age: "geriatric",
  };

  const report = transplantReportOnDesk(
    ["tacrolimus", "cellcept", "deltasone", "ciprofloxacin"],
    ckdHost,
  );

  assert.equal(report.hasTransplantTherapy, true);
  assert.equal(report.overallRiskTier, "critical"); // Cipro x MMF is critical
  assert.deepEqual(report.quadTherapyProfile.cniPresent, ["Tacrolimus"]);
  assert.deepEqual(report.quadTherapyProfile.antimetabolitePresent, ["Mycophenolate Mofetil"]);
  assert.deepEqual(report.quadTherapyProfile.corticosteroidPresent, ["Prednisone"]);

  // Simulations should be populated
  assert.ok(report.mpaEnterohepaticSimulation !== null);
  assert.equal(report.mpaEnterohepaticSimulation?.secondaryPeakAbolished, true);
  assert.ok(report.cniSteroidTaperModel !== null);

  // Host vulnerabilities
  assert.equal(report.hostVulnerabilities.isCkdOrImpairedRenal, true);
  assert.equal(report.hostVulnerabilities.isGeriatric, true);
  assert.ok(
    report.hostVulnerabilities.clinicalAdvisories.some((a) => a.includes("CKD")),
  );

  // Regulatory notice and citations
  assert.ok(report.regulatoryNotice.includes("FD&C Act § 520(o)(1)(E)"));
  assert.ok(report.citations.length >= 8);
  assert.ok(report.citations.some((c) => c.includes("KDIGO")));
});

test("transplantReportOnDesk: pregnancy context triggers mycophenolate teratogenicity alert", () => {
  const pregHost: HostContext = {
    ...DEFAULT_HOST,
    preg: "pregnant",
  };

  const report = transplantReportOnDesk(["mycophenolate", "tacrolimus"], pregHost);
  assert.equal(report.hostVulnerabilities.isPregnancyRisk, true);
  assert.ok(
    report.hostVulnerabilities.clinicalAdvisories.some((a) =>
      a.includes("CRITICAL TERATOGENICITY"),
    ),
    "Must trigger Boxed Warning for Mycophenolate embryofetal toxicity and 45% miscarriage rate",
  );
});

test("TRANSPLANT_DRUG_PROFILES: validates biochemical entries for all core quad-therapy agents", () => {
  const expectedAgents = [
    "tacrolimus",
    "cyclosporine",
    "mycophenolate",
    "azathioprine",
    "sirolimus",
    "everolimus",
    "prednisone",
    "methylprednisolone",
  ];

  for (const agentId of expectedAgents) {
    const profile = TRANSPLANT_DRUG_PROFILES[agentId];
    assert.ok(profile, `Profile must exist for ${agentId}`);
    assert.ok(profile.molecularTarget.length > 0);
    assert.ok(profile.biochemicalMechanism.length > 0);
    assert.ok(profile.keyAdverseEffects.length > 0);
    assert.ok(profile.clinicalPearls.length > 0);
  }
});
