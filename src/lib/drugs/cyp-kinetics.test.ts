import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  CYP_KINETICS_REGULATORY_DISCLAIMER,
  MOLECULAR_MODES,
  TDI_PERPETRATORS,
  NUCLEAR_INDUCERS,
  COMPETITIVE_INHIBITORS,
  NUCLEAR_RECEPTOR_PATHWAYS,
  SENSITIVE_VICTIM_SUBSTRATES,
  ALL_REFERENCED_DRUG_IDS,
  getAllTdiPerpetrators,
  getAllNuclearInducers,
  getAllCompetitiveInhibitors,
  getNuclearReceptorPathways,
  getMolecularModes,
  getTdiPerpetratorById,
  getNuclearInducerById,
  getCompetitiveInhibitorById,
  calculateEnzymeTrajectory,
  detectTdiInductionOnTray,
} from "./cyp-kinetics";

describe("Cytochrome P450 TDI & Nuclear Induction Simulator", () => {
  describe("Catalog Integrity & Referenced Drug Validation", () => {
    it("every drug ID in ALL_REFERENCED_DRUG_IDS exists in DRUG_BY_ID", () => {
      assert.ok(ALL_REFERENCED_DRUG_IDS.length >= 12, "Must reference all canonical drugs");
      for (const id of ALL_REFERENCED_DRUG_IDS) {
        assert.ok(
          DRUG_BY_ID[id],
          `Referenced drug ID '${id}' must exist in DRUG_BY_ID catalog`,
        );
      }
    });

    it("verifies specific required exemplar drugs exist in catalog", () => {
      const requiredExemplars = [
        "clarithromycin",
        "erythromycin",
        "diltiazem",
        "ritonavir",
        "grapefruit",
        "rifampin",
        "carbamazepine",
        "phenobarbital",
        "phenytoin",
        "charred-meat",
        "fluconazole",
        "ciprofloxacin",
        "quinidine",
        "st-johns-wort",
      ];
      for (const drugId of requiredExemplars) {
        assert.ok(
          DRUG_BY_ID[drugId],
          `Required exemplar drug '${drugId}' must exist in catalog`,
        );
      }
    });

    it("every TDI perpetrator references a valid drug in DRUG_BY_ID and has complete attributes", () => {
      const perpetrators = getAllTdiPerpetrators();
      assert.ok(perpetrators.length >= 5, "Must include at least 5 TDI perpetrators");
      for (const p of perpetrators) {
        assert.ok(DRUG_BY_ID[p.drugId], `TDI perpetrator drugId '${p.drugId}' must exist`);
        assert.ok(p.name.length > 0, "Name must be present");
        assert.ok(p.targetIsoforms.length > 0, "Target isoforms must be specified");
        assert.ok(p.reactiveIntermediate.length > 0, "Reactive intermediate must be detailed");
        assert.ok(p.inactivationRateKinactPerDay > 0, "kinact must be positive");
        assert.ok(p.resynthesisHalfLifeHours.hepatic > 0, "Hepatic half-life must be positive");
        assert.ok(p.resynthesisHalfLifeHours.intestinal > 0, "Intestinal half-life must be positive");
        assert.ok(p.clinicalPearl.length > 20, "Clinical pearl must be rich");
        assert.ok(p.citations.length >= 1, "Must cite literature");
        for (const victim of p.highRiskVictimSubstrates) {
          assert.ok(DRUG_BY_ID[victim], `Victim drug '${victim}' of '${p.drugId}' must exist in catalog`);
        }
      }
    });

    it("every Nuclear inducer references a valid drug in DRUG_BY_ID and has complete attributes", () => {
      const inducers = getAllNuclearInducers();
      assert.ok(inducers.length >= 5, "Must include at least 5 nuclear inducers");
      for (const ind of inducers) {
        assert.ok(DRUG_BY_ID[ind.drugId], `Nuclear inducer drugId '${ind.drugId}' must exist`);
        assert.ok(ind.name.length > 0, "Name must be present");
        assert.ok(["PXR", "CAR", "AhR"].includes(ind.receptor), "Must be canonical nuclear receptor");
        assert.ok(ind.heterodimerPartner.length > 0, "Heterodimer partner must be specified");
        assert.ok(ind.dnaResponseElement.length > 0, "DNA response element must be detailed");
        assert.ok(ind.targetGenes.length > 0, "Target genes must be specified");
        assert.ok(ind.inducedIsoforms.length > 0, "Induced isoforms must be specified");
        assert.ok(ind.onsetLagDays >= 2, "Induction must have an onset lag phase");
        assert.ok(ind.offsetWashoutWeeks >= 1, "Induction must have protracted offset washout");
        assert.ok(ind.maxFoldInduction > 1, "Max fold induction must exceed baseline 1.0");
        assert.ok(ind.clinicalPearl.length > 20, "Clinical pearl must be rich");
        for (const victim of ind.highRiskVictimSubstrates) {
          assert.ok(DRUG_BY_ID[victim], `Victim drug '${victim}' of inducer '${ind.drugId}' must exist`);
        }
      }
    });

    it("every Competitive inhibitor references a valid drug in DRUG_BY_ID", () => {
      const comp = getAllCompetitiveInhibitors();
      assert.ok(comp.length >= 3, "Must include competitive inhibitors (fluconazole, ciprofloxacin, quinidine)");
      for (const c of comp) {
        assert.ok(DRUG_BY_ID[c.drugId], `Competitive inhibitor '${c.drugId}' must exist`);
        assert.ok(c.kiMicromolar > 0, "Ki must be positive");
        assert.ok(c.offsetHours > 0, "Offset hours must be positive");
        assert.ok(c.clinicalPearl.length > 20, "Clinical pearl must be present");
      }
    });

    it("every Sensitive victim substrate references a valid drug in DRUG_BY_ID", () => {
      assert.ok(SENSITIVE_VICTIM_SUBSTRATES.length >= 6);
      for (const v of SENSITIVE_VICTIM_SUBSTRATES) {
        assert.ok(DRUG_BY_ID[v.drugId], `Sensitive victim '${v.drugId}' must exist`);
        assert.ok(v.toxicityWithTdi.length > 0);
        assert.ok(v.failureWithInducer.length > 0);
      }
    });

    it("lookup helpers getTdiPerpetratorById, getNuclearInducerById, getCompetitiveInhibitorById work case-insensitively", () => {
      assert.ok(getTdiPerpetratorById("clarithromycin"));
      assert.ok(getTdiPerpetratorById("CLARITHROMYCIN"));
      assert.equal(getTdiPerpetratorById("non-existent"), undefined);

      assert.ok(getNuclearInducerById("rifampin"));
      assert.ok(getNuclearInducerById("RIFAMPIN"));
      assert.equal(getNuclearInducerById("non-existent"), undefined);

      assert.ok(getCompetitiveInhibitorById("fluconazole"));
      assert.ok(getCompetitiveInhibitorById("FLUCONAZOLE"));
      assert.equal(getCompetitiveInhibitorById("non-existent"), undefined);
    });
  });

  describe("3 Molecular Modes of CYP Modulation", () => {
    it("contains all 3 required molecular modes", () => {
      const modes = getMolecularModes();
      assert.equal(modes.length, 3);
      const ids = modes.map((m) => m.id);
      assert.ok(ids.includes("competitive-reversible"));
      assert.ok(ids.includes("mechanism-based-tdi"));
      assert.ok(ids.includes("nuclear-receptor-induction"));
    });

    it("validates Mode 1: Competitive Reversible Inhibition", () => {
      const mode = MOLECULAR_MODES.find((m) => m.id === "competitive-reversible");
      assert.ok(mode);
      assert.ok(mode.mechanismDescription.includes("reversible"));
      assert.ok(mode.onsetKinetics.includes("Rapid"));
      assert.ok(mode.offsetKinetics.includes("half-life") || mode.offsetKinetics.includes("clearance"));
      assert.ok(mode.exemplarDrugIds.includes("fluconazole"));
      assert.ok(mode.exemplarDrugIds.includes("ciprofloxacin"));
      assert.ok(mode.exemplarDrugIds.includes("quinidine"));
      assert.ok(mode.governingParameters.some((p) => p.includes("Ki")));
    });

    it("validates Mode 2: Mechanism-Based / Time-Dependent Inactivation (MBI / TDI)", () => {
      const mode = MOLECULAR_MODES.find((m) => m.id === "mechanism-based-tdi");
      assert.ok(mode);
      assert.ok(
        mode.mechanismDescription.includes("Metabolite-Intermediate Complex") ||
        mode.mechanismDescription.includes("MIC") ||
        mode.mechanismDescription.includes("alkylation"),
      );
      assert.ok(mode.clinicalAphorism.includes("Stopping the perpetrator does not restore the enzyme"));
      assert.ok(mode.offsetKinetics.includes("de novo"));
      assert.ok(mode.exemplarDrugIds.includes("clarithromycin"));
      assert.ok(mode.exemplarDrugIds.includes("ritonavir"));
      assert.ok(mode.exemplarDrugIds.includes("grapefruit"));
      assert.ok(mode.exemplarDrugIds.includes("diltiazem"));
      assert.ok(mode.governingParameters.some((p) => p.includes("kinact")));
      assert.ok(mode.governingParameters.some((p) => p.includes("kdeg") || p.includes("turnover")));
    });

    it("validates Mode 3: Transcriptional Nuclear Receptor Induction", () => {
      const mode = MOLECULAR_MODES.find((m) => m.id === "nuclear-receptor-induction");
      assert.ok(mode);
      assert.ok(mode.mechanismDescription.includes("PXR") || mode.mechanismDescription.includes("CAR") || mode.mechanismDescription.includes("AhR"));
      assert.ok(mode.clinicalAphorism.includes("Inducers take a week to land and two weeks to leave"));
      assert.ok(mode.onsetKinetics.includes("lag") || mode.onsetKinetics.includes("3–7 days"));
      assert.ok(mode.offsetKinetics.includes("2–3 weeks") || mode.offsetKinetics.includes("washout"));
      assert.ok(mode.exemplarDrugIds.includes("rifampin"));
      assert.ok(mode.exemplarDrugIds.includes("carbamazepine"));
      assert.ok(mode.exemplarDrugIds.includes("phenobarbital"));
      assert.ok(mode.exemplarDrugIds.includes("charred-meat"));
    });
  });

  describe("Nuclear Receptor Pathways (PXR, CAR, AhR)", () => {
    it("contains all 3 canonical nuclear receptor pathways", () => {
      const pathways = getNuclearReceptorPathways();
      assert.equal(pathways.length, 3);
      const receptorIds = pathways.map((p) => p.receptorId);
      assert.ok(receptorIds.includes("PXR"));
      assert.ok(receptorIds.includes("CAR"));
      assert.ok(receptorIds.includes("AhR"));
    });

    it("PXR pathway correctly maps RXR heterodimerization, ER6/DR3 elements, and target genes", () => {
      const pxr = NUCLEAR_RECEPTOR_PATHWAYS.find((p) => p.receptorId === "PXR");
      assert.ok(pxr);
      assert.equal(pxr.geneSymbol, "NR1I2");
      assert.ok(pxr.dimerization.includes("RXR"));
      assert.ok(pxr.responseElements.includes("ER6") || pxr.responseElements.includes("DR3"));
      assert.ok(pxr.regulatedEnzymes.includes("CYP3A4"));
      assert.ok(pxr.regulatedEnzymes.includes("CYP2C9"));
      assert.ok(pxr.regulatedEnzymes.includes("CYP2C19"));
      assert.ok(pxr.regulatedEnzymes.some((e) => e.includes("P-gp")));
      assert.ok(pxr.canonicalInducerIds.includes("rifampin"));
      assert.ok(pxr.canonicalInducerIds.includes("st-johns-wort"));
      assert.ok(pxr.canonicalInducerIds.includes("carbamazepine"));
    });

    it("CAR pathway maps RXR heterodimerization, PBREM enhancer, and target genes", () => {
      const car = NUCLEAR_RECEPTOR_PATHWAYS.find((p) => p.receptorId === "CAR");
      assert.ok(car);
      assert.equal(car.geneSymbol, "NR1I3");
      assert.ok(car.dimerization.includes("RXR"));
      assert.ok(car.responseElements.includes("PBREM"));
      assert.ok(car.regulatedEnzymes.includes("CYP2B6"));
      assert.ok(car.regulatedEnzymes.includes("CYP3A4"));
      assert.ok(car.canonicalInducerIds.includes("phenobarbital"));
      assert.ok(car.canonicalInducerIds.includes("phenytoin"));
    });

    it("AhR pathway maps ARNT heterodimerization, XRE/DRE elements, and CYP1A2 induction", () => {
      const ahr = NUCLEAR_RECEPTOR_PATHWAYS.find((p) => p.receptorId === "AhR");
      assert.ok(ahr);
      assert.equal(ahr.geneSymbol, "AHR");
      assert.ok(ahr.dimerization.includes("ARNT"));
      assert.ok(ahr.responseElements.includes("XRE") || ahr.responseElements.includes("DRE"));
      assert.ok(ahr.regulatedEnzymes.includes("CYP1A2"));
      assert.ok(ahr.canonicalInducerIds.includes("charred-meat"));
      assert.ok(ahr.clinicalPearls.some((p) => p.includes("clozapine") || p.includes("smoking")));
    });
  });

  describe("Dynamic Time-Course Trajectory Engine", () => {
    it("empty drug list produces a flat 100% baseline trajectory", () => {
      const traj = calculateEnzymeTrajectory([], 30, 10);
      assert.equal(traj.dominantMechanism, "Baseline Normal");
      assert.equal(traj.points.length, 31);
      assert.equal(traj.nadirPct, 100);
      assert.equal(traj.peakPct, 100);
      assert.equal(traj.recoveryDay90Pct, null);
      for (const pt of traj.points) {
        assert.equal(pt.activePoolPct, 100);
        assert.equal(pt.phase, "baseline");
      }
    });

    it("models pure TDI: rapid knockout followed by de novo synthesis turnover recovery", () => {
      const traj = calculateEnzymeTrajectory(["ritonavir"], 30, 10);
      assert.equal(traj.dominantMechanism, "TDI / Mechanism-Based");
      assert.equal(traj.points.length, 31);

      // Day 0 starts at 100%
      assert.equal(traj.points[0].activePoolPct, 100);

      // By Day 3, active enzyme drops dramatically
      const day3 = traj.points[3].activePoolPct;
      assert.ok(day3 < 30, `Day 3 enzyme pool (${day3}%) must be deeply suppressed by TDI`);

      // Nadir should be very low (<20%) during exposure
      assert.ok(traj.nadirPct <= 20, `TDI nadir (${traj.nadirPct}%) must be <= 20%`);
      assert.ok(traj.dayAtNadir <= 10, "Nadir must occur during perpetrator exposure");

      // Stop Day is Day 10. Day 11 is immediately after stopping.
      // Enzyme should NOT jump back to 100% immediately!
      const day11 = traj.points[11].activePoolPct;
      assert.ok(day11 < 55, `Day 11 enzyme (${day11}%) must show limited recovery due to kdeg requirement`);

      // Recovery should be progressive over days: Day 14 > Day 11
      const day14 = traj.points[14].activePoolPct;
      assert.ok(day14 > day11, `Day 14 (${day14}%) must be higher than Day 11 (${day11}%)`);

      // 90% recovery day should be several days after stopping (e.g. Day 15-18)
      assert.ok(traj.recoveryDay90Pct !== null, "Must calculate a recovery day");
      assert.ok(traj.recoveryDay90Pct! >= 14, `Recovery to 90% (${traj.recoveryDay90Pct}) must take several days of de novo synthesis`);

      // Clinical summary must explain de novo turnover kinetics
      assert.ok(traj.clinicalSummary.includes("de novo"));
      assert.ok(traj.monitoringPearls.some((p) => p.includes("Stopping the perpetrator does not restore the enzyme")));
    });

    it("models clarithromycin and grapefruit mechanism-based inactivation", () => {
      const clarith = calculateEnzymeTrajectory(["clarithromycin"], 30, 10);
      assert.equal(clarith.dominantMechanism, "TDI / Mechanism-Based");
      assert.ok(clarith.nadirPct < 30);

      const gf = calculateEnzymeTrajectory(["grapefruit"], 30, 10);
      assert.equal(gf.dominantMechanism, "TDI / Mechanism-Based");
      assert.ok(gf.nadirPct < 25);
    });

    it("models pure Nuclear Induction: transcription lag phase and protracted 2-3 week offset", () => {
      const traj = calculateEnzymeTrajectory(["rifampin"], 30, 10);
      assert.equal(traj.dominantMechanism, "Nuclear Induction");

      // Day 0 is 100%
      assert.equal(traj.points[0].activePoolPct, 100);

      // Days 1-2 have lag: modest rise
      const day1 = traj.points[1].activePoolPct;
      assert.ok(day1 < 120, `Day 1 enzyme (${day1}%) must demonstrate onset lag`);

      // Peak occurs near or at stop day (Day 9-10) with marked elevation (>250%)
      assert.ok(traj.peakPct >= 250, `Rifampin peak induction (${traj.peakPct}%) must exceed 250%`);
      assert.ok(traj.dayAtPeak >= 8 && traj.dayAtPeak <= 12, "Peak must occur near Day 10");

      // Discontinued at Day 10.
      // At Day 17 (1 week post-stop), enzyme must STILL be substantially elevated (>130%)
      const day17 = traj.points[17].activePoolPct;
      assert.ok(day17 >= 130, `Day 17 enzyme (${day17}%) must remain elevated 1 week post-discontinuation`);

      // Takes over 2 weeks post-stop (past Day 24) to decay near baseline
      const day26 = traj.points[26].activePoolPct;
      assert.ok(day26 < day17, "Enzyme pool must progressively degrade over weeks");
      assert.ok(traj.clinicalSummary.includes("protracted"));
      assert.ok(traj.monitoringPearls.some((p) => p.includes("Inducers take a week to land and two weeks to leave")));
    });

    it("models charred-meat AhR induction and cessation offset", () => {
      const traj = calculateEnzymeTrajectory(["charred-meat"], 30, 10);
      assert.equal(traj.dominantMechanism, "Nuclear Induction");
      assert.ok(traj.peakPct >= 140, "Charred meat must induce enzyme pool");
      assert.ok(traj.points[10].isoforms.CYP1A2 > 130, "CYP1A2 must be induced");
    });

    it("models Competitive Reversible Inhibition: rapid onset and rapid clearance washout", () => {
      const traj = calculateEnzymeTrajectory(["fluconazole"], 30, 10);
      assert.equal(traj.dominantMechanism, "Competitive Reversible");

      // Nadir during exposure
      assert.ok(traj.nadirPct < 40, "Competitive inhibition must reduce functional capacity");

      // Stopped at Day 10. Unlike TDI, recovery is rapid because enzyme is undamaged!
      const day12 = traj.points[12].activePoolPct;
      assert.ok(day12 >= 70, `Day 12 (${day12}%) must demonstrate rapid reversible washout within 48h`);
      const day14 = traj.points[14].activePoolPct;
      assert.ok(day14 >= 90, `Day 14 (${day14}%) must achieve near-complete recovery`);
      assert.ok(traj.clinicalSummary.includes("rapid offset"));
    });

    it("models Complex Collision when both TDI and Inducer are present", () => {
      const traj = calculateEnzymeTrajectory(["ritonavir", "rifampin"], 30, 10);
      assert.equal(traj.dominantMechanism, "Complex Collision");
      assert.ok(traj.activeModulators.some((m) => m.mode === "tdi"));
      assert.ok(traj.activeModulators.some((m) => m.mode === "induction"));
      assert.ok(traj.monitoringPearls.some((p) => p.includes("Opposing kinetic vectors")));
    });
  });

  describe("Desk Tray Detection (detectTdiInductionOnTray)", () => {
    it("returns clean detection when no interacting drugs are present", () => {
      const result = detectTdiInductionOnTray([]);
      assert.equal(result.hasCollision, false);
      assert.equal(result.collisionType, "none");
      assert.equal(result.kineticAlerts.length, 0);
      assert.equal(result.victimRisks.length, 0);
    });

    it("detects TDI + Sensitive Victim collision (ritonavir + midazolam)", () => {
      const result = detectTdiInductionOnTray(["ritonavir", "midazolam"]);
      assert.equal(result.hasCollision, true);
      assert.equal(result.collisionType, "tdi-knockout");
      assert.ok(result.tdiDrugs.some((t) => t.drugId === "ritonavir"));
      assert.ok(result.victimDrugs.some((v) => v.drugId === "midazolam"));
      assert.ok(result.kineticAlerts.some((a) => a.id.includes("tdi-victim") && a.severity === "critical"));
      assert.ok(result.victimRisks.some((r) => r.victimId === "midazolam" && r.perpetratorId === "ritonavir"));
    });

    it("detects Nuclear Inducer + Sensitive NTI Victim collision (rifampin + tacrolimus)", () => {
      const result = detectTdiInductionOnTray(["rifampin", "tacrolimus"]);
      assert.equal(result.hasCollision, true);
      assert.equal(result.collisionType, "nuclear-induction");
      assert.ok(result.inducerDrugs.some((i) => i.drugId === "rifampin"));
      assert.ok(result.victimDrugs.some((v) => v.drugId === "tacrolimus"));
      assert.ok(result.kineticAlerts.some((a) => a.title.includes("Transcriptional Induction Collision")));
      assert.ok(result.victimRisks.some((r) => r.consequence.includes("rejection")));
    });

    it("detects Opposing Collision when both TDI perpetrator and Inducer are present", () => {
      const result = detectTdiInductionOnTray(["clarithromycin", "rifampin"]);
      assert.equal(result.hasCollision, true);
      assert.equal(result.collisionType, "opposing-tdi-induction");
      assert.ok(result.kineticAlerts.some((a) => a.id === "opposing-collision"));
    });

    it("detects AhR PAH cessation alert when charred-meat and clozapine are present", () => {
      const result = detectTdiInductionOnTray(["charred-meat", "clozapine"]);
      assert.equal(result.hasCollision, true);
      assert.ok(result.kineticAlerts.some((a) => a.id === "pah-cessation-warning"));
    });
  });

  describe("Regulatory Compliance under FD&C Act § 520(o)(1)(E)", () => {
    it("exports CYP_KINETICS_REGULATORY_DISCLAIMER citing FD&C Act § 520(o)(1)(E)", () => {
      assert.ok(CYP_KINETICS_REGULATORY_DISCLAIMER.length > 50);
      assert.ok(CYP_KINETICS_REGULATORY_DISCLAIMER.includes("FD&C Act § 520(o)(1)(E)"));
      assert.ok(CYP_KINETICS_REGULATORY_DISCLAIMER.includes("Non-Device Clinical Decision Support"));
    });

    it("maintains non-prescriptive posture across all clinical pearls and summaries", () => {
      const allText = [
        ...TDI_PERPETRATORS.map((t) => t.clinicalPearl),
        ...NUCLEAR_INDUCERS.map((n) => n.clinicalPearl),
        ...COMPETITIVE_INHIBITORS.map((c) => c.clinicalPearl),
      ].join(" ");

      // Should not contain prescriptive directives like "administer 50 mg" or "take 2 tablets"
      assert.ok(!/administer \d+\s*mg/i.test(allText));
      assert.ok(!/prescribe \d+\s*mg/i.test(allText));
      assert.ok(!/take \d+\s*tablets/i.test(allText));
    });
  });
});
