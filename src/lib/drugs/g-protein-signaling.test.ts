import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  G_PROTEIN_PATHWAYS,
  G_PROTEIN_REGULATORY_DISCLAIMER,
  G_PROTEIN_CITATIONS,
  getGProteinPathwayById,
  findGProteinForReceptor,
  getAllGProteinPathways,
  type GProteinPathway,
} from "./g-protein-signaling";

describe("G-Protein Signaling Switchboard Database", () => {
  it("defines all four major classical second messenger pathways", () => {
    assert.equal(G_PROTEIN_PATHWAYS.length, 4);

    const expectedIds = [
      "gq-phospholipase-c",
      "gs-adenylyl-cyclase",
      "gi-adenylyl-cyclase-inhibition",
      "pde-cgmp-signaling",
    ];

    for (const expectedId of expectedIds) {
      const pathway = G_PROTEIN_PATHWAYS.find((p) => p.id === expectedId);
      assert.ok(pathway, `Missing pathway with id: ${expectedId}`);
      assert.equal(pathway.id, expectedId);
      assert.ok(pathway.name.length > 0);
      assert.ok(pathway.mnemonic.length > 0);
      assert.ok(pathway.primaryReceptors.length > 0);
      assert.ok(pathway.effectorEnzyme.length > 0);
      assert.ok(pathway.secondMessengers.length > 0);
      assert.ok(pathway.downstreamKinase.length > 0);
      assert.ok(pathway.cellularResponse.length > 0);
      assert.ok(pathway.molecularCascadeSummary.length > 0);
      assert.ok(pathway.molecularSteps.length >= 5);
      assert.ok(pathway.tissueResponses.length >= 3);
      assert.ok(pathway.clinicalDrugTargets.length >= 4);
      assert.ok(pathway.pharmacologyPearls.length >= 2);
      assert.ok(pathway.citations.length >= 2);
    }
  });

  it("verifies every referenced drugId in clinicalDrugTargets exists in DRUG_BY_ID", () => {
    let totalDrugsChecked = 0;
    for (const pathway of G_PROTEIN_PATHWAYS) {
      for (const target of pathway.clinicalDrugTargets) {
        totalDrugsChecked++;
        assert.ok(
          DRUG_BY_ID[target.drugId],
          `Referenced drug '${target.drugId}' in pathway '${pathway.id}' does not exist in DRUG_BY_ID!`,
        );
        assert.ok(target.drugName.length > 0);
        assert.ok(target.action.length > 0);
        assert.ok(target.clinicalUse.length > 0);
      }
    }
    assert.ok(totalDrugsChecked >= 20, `Expected at least 20 clinical drugs, checked ${totalDrugsChecked}`);
  });

  it("verifies biochemical cascades for Gq (Phospholipase C / IP3-DAG / PKC)", () => {
    const gq = getGProteinPathwayById("gq-phospholipase-c");
    assert.ok(gq);
    assert.equal(gq.gProtein, "Gq");
    assert.match(gq.mnemonic, /HAVe 1 M&M/i);
    assert.match(gq.effectorEnzyme, /Phospholipase C/i);

    const secondMessengersStr = gq.secondMessengers.join(" ");
    assert.match(secondMessengersStr, /IP3|Inositol 1,4,5-trisphosphate/i);
    assert.match(secondMessengersStr, /DAG|Diacylglycerol/i);
    assert.match(secondMessengersStr, /Ca2\+|Calcium/i);
    assert.match(gq.downstreamKinase, /PKC|Protein Kinase C/i);

    // Verify key receptors: H1, Alpha-1, V1, M1, M3, M5, 5-HT2A
    const recs = gq.primaryReceptors;
    assert.ok(recs.includes("H1"));
    assert.ok(recs.includes("Alpha-1"));
    assert.ok(recs.includes("V1"));
    assert.ok(recs.includes("M1"));
    assert.ok(recs.includes("M3"));
    assert.ok(recs.includes("M5"));
    assert.ok(recs.includes("5-HT2A"));

    // Verify drug targets: Prazosin, Clonidine, Atropine, Diphenhydramine, Epinephrine
    const drugIds = gq.clinicalDrugTargets.map((d) => d.drugId);
    assert.ok(drugIds.includes("prazosin"));
    assert.ok(drugIds.includes("clonidine"));
    assert.ok(drugIds.includes("atropine"));
    assert.ok(drugIds.includes("diphenhydramine"));
    assert.ok(drugIds.includes("epinephrine"));
  });

  it("verifies biochemical cascades for Gs (Adenylyl Cyclase / cAMP / PKA)", () => {
    const gs = getGProteinPathwayById("gs-adenylyl-cyclase");
    assert.ok(gs);
    assert.equal(gs.gProtein, "Gs");
    assert.match(gs.mnemonic, /Beta-1, Beta-2, D1, H2, V2/i);
    assert.match(gs.effectorEnzyme, /Adenylyl Cyclase/i);
    assert.ok(gs.secondMessengers.some((sm) => /cAMP|Cyclic AMP/i.test(sm)));
    assert.match(gs.downstreamKinase, /PKA|Protein Kinase A/i);

    // Verify key receptors: Beta-1, Beta-2, D1, H2, V2
    const recs = gs.primaryReceptors;
    assert.ok(recs.includes("Beta-1"));
    assert.ok(recs.includes("Beta-2"));
    assert.ok(recs.includes("D1"));
    assert.ok(recs.includes("H2"));
    assert.ok(recs.includes("V2"));

    // Verify tissue responses: Beta-1 inotropy, Beta-2 bronchodilation, V2 aquaporin-2, H2 acid secretion
    const responses = gs.tissueResponses;
    assert.ok(responses.some((r) => /Heart|Myocardium/i.test(r.tissue) && /inotropy|Cav1\.2/i.test(r.physiologicalEffect + r.mechanism)));
    assert.ok(responses.some((r) => /Bronchial|Smooth Muscle/i.test(r.tissue) && /MLCK|bronchodilation/i.test(r.mechanism + r.physiologicalEffect)));
    assert.ok(responses.some((r) => /Collecting Duct|Renal/i.test(r.tissue) && /Aquaporin-2/i.test(r.mechanism + r.physiologicalEffect)));
    assert.ok(responses.some((r) => /Parietal/i.test(r.tissue) && /H\+\/K\+ ATPase|acid/i.test(r.mechanism + r.physiologicalEffect)));

    // Verify drug targets: Albuterol, Metoprolol, Famotidine, Desmopressin, Dobutamine
    const drugIds = gs.clinicalDrugTargets.map((d) => d.drugId);
    assert.ok(drugIds.includes("albuterol"));
    assert.ok(drugIds.includes("metoprolol"));
    assert.ok(drugIds.includes("famotidine"));
    assert.ok(drugIds.includes("desmopressin"));
    assert.ok(drugIds.includes("dobutamine"));
  });

  it("verifies biochemical cascades for Gi (AC Inhibition / GIRK / Hyperpolarization)", () => {
    const gi = getGProteinPathwayById("gi-adenylyl-cyclase-inhibition");
    assert.ok(gi);
    assert.equal(gi.gProtein, "Gi");
    assert.match(gi.mnemonic, /MAD 2s/i);
    assert.match(gi.effectorEnzyme, /Adenylyl Cyclase.*Inhibit/i);
    assert.match(gi.effectorEnzyme, /GIRK/i);

    // Verify key receptors: M2, Alpha-2, D2, Mu-Opioid, GABA-B
    const recs = gi.primaryReceptors;
    assert.ok(recs.includes("M2"));
    assert.ok(recs.includes("Alpha-2"));
    assert.ok(recs.includes("D2"));
    assert.ok(recs.some((r) => /Mu-Opioid|MOR/i.test(r)));
    assert.ok(recs.includes("GABA-B"));

    // Verify cellular/tissue response mechanisms: GIRK opening, N-type Ca2+ channel closure
    assert.match(gi.molecularCascadeSummary, /GIRK/i);
    assert.match(gi.molecularCascadeSummary, /calcium channels|N-type/i);

    // Verify drug targets: Clonidine, Morphine, Fentanyl, Haloperidol, Baclofen, Methocarbamol
    const drugIds = gi.clinicalDrugTargets.map((d) => d.drugId);
    assert.ok(drugIds.includes("clonidine"));
    assert.ok(drugIds.includes("morphine"));
    assert.ok(drugIds.includes("fentanyl"));
    assert.ok(drugIds.includes("haloperidol"));
    assert.ok(drugIds.includes("baclofen"));
    assert.ok(drugIds.includes("methocarbamol"));
  });

  it("verifies biochemical cascades for PDE & cGMP axis", () => {
    const pde = getGProteinPathwayById("pde-cgmp-signaling");
    assert.ok(pde);
    assert.equal(pde.gProtein, "PDE");
    assert.match(pde.effectorEnzyme, /Soluble Guanylyl Cyclase|sGC/i);
    assert.match(pde.effectorEnzyme, /Phosphodiesterase|PDE/i);
    assert.ok(pde.secondMessengers.some((sm) => /cGMP|Cyclic GMP/i.test(sm)));
    assert.match(pde.downstreamKinase, /PKG|Protein Kinase G/i);
    assert.match(pde.downstreamKinase, /MLCP|Myosin Light Chain Phosphatase/i);

    // Verify high-yield collision: Sildenafil + Nitroglycerin
    const pearlsJoined = pde.pharmacologyPearls.map((p) => p.title + " " + p.description).join(" ");
    assert.match(pearlsJoined, /sildenafil/i);
    assert.match(pearlsJoined, /nitroglycerin/i);
    assert.match(pearlsJoined, /hypotension|vasodilatory collapse|shock/i);

    // Verify drug targets: Sildenafil, Tadalafil, Nitroglycerin, Isosorbide mononitrate, Milrinone, Roflumilast
    const drugIds = pde.clinicalDrugTargets.map((d) => d.drugId);
    assert.ok(drugIds.includes("sildenafil"));
    assert.ok(drugIds.includes("tadalafil"));
    assert.ok(drugIds.includes("nitroglycerin"));
    assert.ok(drugIds.includes("isosorbide-mononitrate"));
    assert.ok(drugIds.includes("milrinone"));
    assert.ok(drugIds.includes("roflumilast"));
  });
});

describe("Helper Functions", () => {
  it("getGProteinPathwayById returns correct pathway or null", () => {
    assert.equal(getGProteinPathwayById("gq-phospholipase-c")?.gProtein, "Gq");
    assert.equal(getGProteinPathwayById("gs-adenylyl-cyclase")?.gProtein, "Gs");
    assert.equal(getGProteinPathwayById("gi-adenylyl-cyclase-inhibition")?.gProtein, "Gi");
    assert.equal(getGProteinPathwayById("pde-cgmp-signaling")?.gProtein, "PDE");
    assert.equal(getGProteinPathwayById("non-existent-pathway-id"), null);
    assert.equal(getGProteinPathwayById(""), null);
  });

  it("findGProteinForReceptor accurately identifies coupling for canonical receptors", () => {
    // Gq receptors
    assert.equal(findGProteinForReceptor("Alpha-1")?.id, "gq-phospholipase-c");
    assert.equal(findGProteinForReceptor("alpha1")?.id, "gq-phospholipase-c");
    assert.equal(findGProteinForReceptor("H1")?.id, "gq-phospholipase-c");
    assert.equal(findGProteinForReceptor("M1")?.id, "gq-phospholipase-c");
    assert.equal(findGProteinForReceptor("M3")?.id, "gq-phospholipase-c");
    assert.equal(findGProteinForReceptor("V1")?.id, "gq-phospholipase-c");
    assert.equal(findGProteinForReceptor("5-HT2A")?.id, "gq-phospholipase-c");

    // Gs receptors
    assert.equal(findGProteinForReceptor("Beta-1")?.id, "gs-adenylyl-cyclase");
    assert.equal(findGProteinForReceptor("beta1")?.id, "gs-adenylyl-cyclase");
    assert.equal(findGProteinForReceptor("Beta-2")?.id, "gs-adenylyl-cyclase");
    assert.equal(findGProteinForReceptor("beta-2")?.id, "gs-adenylyl-cyclase");
    assert.equal(findGProteinForReceptor("D1")?.id, "gs-adenylyl-cyclase");
    assert.equal(findGProteinForReceptor("H2")?.id, "gs-adenylyl-cyclase");
    assert.equal(findGProteinForReceptor("V2")?.id, "gs-adenylyl-cyclase");

    // Gi receptors
    assert.equal(findGProteinForReceptor("M2")?.id, "gi-adenylyl-cyclase-inhibition");
    assert.equal(findGProteinForReceptor("Alpha-2")?.id, "gi-adenylyl-cyclase-inhibition");
    assert.equal(findGProteinForReceptor("alpha2")?.id, "gi-adenylyl-cyclase-inhibition");
    assert.equal(findGProteinForReceptor("D2")?.id, "gi-adenylyl-cyclase-inhibition");
    assert.equal(findGProteinForReceptor("Mu-Opioid")?.id, "gi-adenylyl-cyclase-inhibition");
    assert.equal(findGProteinForReceptor("MOR")?.id, "gi-adenylyl-cyclase-inhibition");
    assert.equal(findGProteinForReceptor("GABA-B")?.id, "gi-adenylyl-cyclase-inhibition");

    // PDE & cGMP
    assert.equal(findGProteinForReceptor("sGC")?.id, "pde-cgmp-signaling");
    assert.equal(findGProteinForReceptor("PDE-5")?.id, "pde-cgmp-signaling");
    assert.equal(findGProteinForReceptor("PDE-3")?.id, "pde-cgmp-signaling");

    // Invalid queries
    assert.equal(findGProteinForReceptor("non-existent-receptor-xyz"), null);
    assert.equal(findGProteinForReceptor(""), null);
  });

  it("getAllGProteinPathways returns full readonly array", () => {
    const all = getAllGProteinPathways();
    assert.equal(all.length, 4);
    assert.deepEqual(all, G_PROTEIN_PATHWAYS);
  });
});

describe("Non-prescriptive Regulatory Posture (FD&C Act § 520(o)(1)(E))", () => {
  it("exports official regulatory disclaimer referencing FD&C Act § 520(o)(1)(E)", () => {
    assert.ok(G_PROTEIN_REGULATORY_DISCLAIMER.length > 0);
    assert.match(G_PROTEIN_REGULATORY_DISCLAIMER, /FD&C Act § 520\(o\)\(1\)\(E\)/);
    assert.match(G_PROTEIN_REGULATORY_DISCLAIMER, /decision-support/i);
    assert.match(G_PROTEIN_REGULATORY_DISCLAIMER, /educational/i);
    assert.match(G_PROTEIN_REGULATORY_DISCLAIMER, /no.*dosing directives/i);
  });

  it("ensures pathways and drug targets avoid prescriptive dosing directives", () => {
    for (const pathway of G_PROTEIN_PATHWAYS) {
      const pathwayText = JSON.stringify(pathway);
      assert.doesNotMatch(
        pathwayText,
        /\bprescribe\s+\d+/i,
        `Pathway ${pathway.id} contains prescription directive`,
      );
      assert.doesNotMatch(
        pathwayText,
        /\btake\s+\d+\s*mg\s+daily\b/i,
        `Pathway ${pathway.id} contains patient dosing directive`,
      );
      assert.doesNotMatch(
        pathwayText,
        /\btitrate\s+to\s+\d+\s*mg\b/i,
        `Pathway ${pathway.id} contains titration directive`,
      );
    }
  });

  it("verifies peer-reviewed literature citations are provided", () => {
    assert.ok(G_PROTEIN_CITATIONS.length >= 5);
    const combinedCitations = G_PROTEIN_CITATIONS.join(" ");
    assert.match(combinedCitations, /Goodman & Gilman/i);
    assert.match(combinedCitations, /Basic & Clinical Pharmacology|Katzung/i);
  });
});
