import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  TRANSPORTERS,
  BARRIER_ARCHITECTURES,
  TRANSPORTER_REGULATORY_DISCLAIMER,
  getTransporterById,
  findTransportersForDrug,
  getAllTransporters,
  getBarrierById,
  getAllBarriers,
} from "./transporter-network";

describe("Transmembrane Transporter & Barrier Network Database", () => {
  it("defines the 5 major clinical transporter families with valid structures", () => {
    assert.equal(TRANSPORTERS.length, 5);

    const expectedIds = [
      "pgp-abcb1",
      "bcrp-abcg2",
      "oatp1b1-1b3-slco",
      "oat1-oat3-slc22",
      "oct2-mate-slc22",
    ];

    for (const expectedId of expectedIds) {
      const transporter = TRANSPORTERS.find((t) => t.id === expectedId);
      assert.ok(transporter, `Transporter ${expectedId} should be present`);
      assert.ok(transporter.gene.length > 0);
      assert.ok(transporter.name.length > 0);
      assert.ok(["ABC Efflux", "SLC Influx"].includes(transporter.family));
      assert.ok(transporter.primaryLocations.length > 0);
      assert.ok(transporter.physiologicalRole.length > 0);
      assert.ok(transporter.substrates.length > 0);
      assert.ok(transporter.inhibitors.length > 0);
      assert.ok(transporter.clinicalCollisions.length > 0);
      assert.ok(transporter.citations.length > 0);
    }
  });

  it("ensures every referenced drug ID in substrates, inhibitors, inducers, and collisions exists in DRUG_BY_ID", () => {
    for (const transporter of TRANSPORTERS) {
      // Check substrates
      for (const sub of transporter.substrates) {
        assert.ok(
          DRUG_BY_ID[sub],
          `Substrate drug '${sub}' in transporter '${transporter.id}' must exist in DRUG_BY_ID`,
        );
      }

      // Check inhibitors
      for (const inh of transporter.inhibitors) {
        assert.ok(
          DRUG_BY_ID[inh],
          `Inhibitor drug '${inh}' in transporter '${transporter.id}' must exist in DRUG_BY_ID`,
        );
      }

      // Check inducers
      for (const ind of transporter.inducers) {
        assert.ok(
          DRUG_BY_ID[ind],
          `Inducer drug '${ind}' in transporter '${transporter.id}' must exist in DRUG_BY_ID`,
        );
      }

      // Check clinical collisions
      for (const col of transporter.clinicalCollisions) {
        assert.equal(col.drugPair.length, 2, `Collision '${col.id}' must have a drug pair of 2 elements`);
        for (const drug of col.drugPair) {
          assert.ok(
            DRUG_BY_ID[drug],
            `Collision drug '${drug}' in collision '${col.id}' of transporter '${transporter.id}' must exist in DRUG_BY_ID`,
          );
        }
        assert.ok(col.title.length > 0);
        assert.ok(col.description.length > 0);
        assert.ok(col.hazard.length > 0);
        assert.ok(["critical", "high", "moderate"].includes(col.severity));
        assert.ok(col.literatureCitation.length > 0);
      }
    }
  });

  it("verifies P-gp (pgp-abcb1) clinical profile and required high-yield collisions", () => {
    const pgp = getTransporterById("pgp-abcb1");
    assert.ok(pgp);
    assert.equal(pgp.family, "ABC Efflux");
    assert.equal(pgp.atpDependent, true);

    // Required substrates
    assert.ok(pgp.substrates.includes("digoxin"));
    assert.ok(pgp.substrates.includes("loperamide"));
    assert.ok(pgp.substrates.includes("dabigatran"));
    assert.ok(pgp.substrates.includes("colchicine"));
    assert.ok(pgp.substrates.includes("cyclosporine"));

    // Required inhibitors
    assert.ok(pgp.inhibitors.includes("verapamil"));
    assert.ok(pgp.inhibitors.includes("quinidine"));
    assert.ok(pgp.inhibitors.includes("amiodarone"));
    assert.ok(pgp.inhibitors.includes("clarithromycin"));

    // Required inducers
    assert.ok(pgp.inducers.includes("rifampin"));
    assert.ok(pgp.inducers.includes("st-johns-wort"));
    assert.ok(pgp.inducers.includes("carbamazepine"));

    // High yield collisions
    const loperamideQuinidine = pgp.clinicalCollisions.find(
      (c) => c.drugPair.includes("loperamide") && c.drugPair.includes("quinidine"),
    );
    assert.ok(loperamideQuinidine, "Must contain Loperamide + Quinidine collision");
    assert.match(loperamideQuinidine.description, /blood-brain barrier|BBB/i);
    assert.match(loperamideQuinidine.hazard, /respiratory depression/i);

    const digoxinAmiodarone = pgp.clinicalCollisions.find(
      (c) => c.drugPair.includes("digoxin") && c.drugPair.includes("amiodarone"),
    );
    assert.ok(digoxinAmiodarone, "Must contain Digoxin + Amiodarone collision");
  });

  it("verifies BCRP (bcrp-abcg2) clinical profile", () => {
    const bcrp = getTransporterById("bcrp-abcg2");
    assert.ok(bcrp);
    assert.equal(bcrp.family, "ABC Efflux");
    assert.ok(bcrp.substrates.includes("rosuvastatin"));
    assert.ok(bcrp.substrates.includes("methotrexate"));
    assert.ok(bcrp.substrates.includes("sulfasalazine"));
    assert.ok(bcrp.substrates.includes("topotecan"));
    assert.ok(bcrp.inhibitors.includes("gefitinib"));
  });

  it("verifies OATP1B1/1B3 (oatp1b1-1b3-slco) sinusoidal influx and statin collisions", () => {
    const oatp = getTransporterById("oatp1b1-1b3-slco");
    assert.ok(oatp);
    assert.equal(oatp.family, "SLC Influx");
    assert.ok(oatp.substrates.includes("atorvastatin"));
    assert.ok(oatp.substrates.includes("rosuvastatin"));
    assert.ok(oatp.substrates.includes("simvastatin"));
    assert.ok(oatp.inhibitors.includes("cyclosporine"));
    assert.ok(oatp.inhibitors.includes("gemfibrozil"));

    const statinCollision = oatp.clinicalCollisions.find(
      (c) => c.drugPair.includes("cyclosporine") && c.drugPair.includes("atorvastatin"),
    );
    assert.ok(statinCollision);
    assert.match(statinCollision.hazard, /rhabdomyolysis/i);
  });

  it("verifies OAT1/3 (oat1-oat3-slc22) renal basolateral influx and probenecid collisions", () => {
    const oat = getTransporterById("oat1-oat3-slc22");
    assert.ok(oat);
    assert.equal(oat.family, "SLC Influx");
    assert.ok(oat.substrates.includes("penicillin-g") || oat.substrates.includes("penicillin-v"));
    assert.ok(oat.substrates.includes("methotrexate"));
    assert.ok(oat.substrates.includes("furosemide"));
    assert.ok(oat.inhibitors.includes("probenecid"));

    const probenecidMtx = oat.clinicalCollisions.find(
      (c) => c.drugPair.includes("probenecid") && c.drugPair.includes("methotrexate"),
    );
    assert.ok(probenecidMtx);
    assert.match(probenecidMtx.hazard, /methotrexate toxicity|pancytopenia/i);
  });

  it("verifies OCT2 / MATE axis (oct2-mate-slc22) renal cation secretion and metformin collisions", () => {
    const oct = getTransporterById("oct2-mate-slc22");
    assert.ok(oct);
    assert.equal(oct.family, "SLC Influx");
    assert.ok(oct.substrates.includes("metformin"));
    assert.ok(oct.inhibitors.includes("cimetidine"));
    assert.ok(oct.inhibitors.includes("dolutegravir"));

    const cimetidineMetformin = oct.clinicalCollisions.find(
      (c) => c.drugPair.includes("cimetidine") && c.drugPair.includes("metformin"),
    );
    assert.ok(cimetidineMetformin);
    assert.match(cimetidineMetformin.hazard, /lactic acidosis/i);
  });
});

describe("Helper Functions", () => {
  it("getTransporterById returns correct transporter or null", () => {
    assert.equal(getTransporterById("pgp-abcb1")?.gene, "ABCB1");
    assert.equal(getTransporterById("bcrp-abcg2")?.gene, "ABCG2");
    assert.equal(getTransporterById("unknown-transporter"), null);
    assert.equal(getTransporterById(""), null);
  });

  it("findTransportersForDrug correctly locates transporters for key index drugs", () => {
    // Digoxin -> P-gp
    const digoxinResults = findTransportersForDrug("digoxin");
    assert.ok(digoxinResults.some((t) => t.id === "pgp-abcb1"));

    // Loperamide -> P-gp
    const loperamideResults = findTransportersForDrug("loperamide");
    assert.ok(loperamideResults.some((t) => t.id === "pgp-abcb1"));

    // Atorvastatin -> OATP1B1
    const atorvastatinResults = findTransportersForDrug("atorvastatin");
    assert.ok(atorvastatinResults.some((t) => t.id === "oatp1b1-1b3-slco"));

    // Metformin -> OCT2 / MATE axis
    const metforminResults = findTransportersForDrug("metformin");
    assert.ok(metforminResults.some((t) => t.id === "oct2-mate-slc22"));

    // Probenecid -> OAT1 / OAT3
    const probenecidResults = findTransportersForDrug("probenecid");
    assert.ok(probenecidResults.some((t) => t.id === "oat1-oat3-slc22"));

    // Multi-transporter drug: Cyclosporine (P-gp, BCRP, OATP1B1)
    const cyclosporineResults = findTransportersForDrug("cyclosporine");
    assert.ok(cyclosporineResults.length >= 2);
    assert.ok(cyclosporineResults.some((t) => t.id === "pgp-abcb1"));
    assert.ok(cyclosporineResults.some((t) => t.id === "oatp1b1-1b3-slco"));

    // Non-existent drug
    assert.deepEqual(findTransportersForDrug("non_existent_drug_xyz"), []);
    assert.deepEqual(findTransportersForDrug(""), []);
  });

  it("getAllTransporters returns all 5 transporters", () => {
    const all = getAllTransporters();
    assert.equal(all.length, 5);
  });
});

describe("Barrier Architecture Models", () => {
  it("defines the 4 primary clinical physiological barriers", () => {
    assert.equal(BARRIER_ARCHITECTURES.length, 4);

    const expectedBarriers = ["bbb", "intestinal", "hepatic", "renal"];
    for (const bId of expectedBarriers) {
      const barrier = getBarrierById(bId as any);
      assert.ok(barrier, `Barrier ${bId} must be present`);
      assert.ok(barrier.name.length > 0);
      assert.ok(barrier.apicalSideLabel.length > 0);
      assert.ok(barrier.basolateralSideLabel.length > 0);
      assert.ok(barrier.transporterNodes.length > 0);
      assert.ok(barrier.clinicalTakeaway.length > 0);

      // Verify that all transporterNodes reference valid transporters
      for (const node of barrier.transporterNodes) {
        const t = getTransporterById(node.transporterId);
        assert.ok(t, `Node in barrier ${bId} references valid transporter ${node.transporterId}`);
      }
    }
  });

  it("getAllBarriers returns all barrier architectures", () => {
    const barriers = getAllBarriers();
    assert.equal(barriers.length, 4);
  });
});

describe("Non-prescriptive Regulatory Posture (FD&C Act § 520(o)(1)(E))", () => {
  it("exports official regulatory disclaimer referencing FD&C Act § 520(o)(1)(E)", () => {
    assert.ok(TRANSPORTER_REGULATORY_DISCLAIMER.length > 0);
    assert.match(TRANSPORTER_REGULATORY_DISCLAIMER, /FD&C Act § 520\(o\)\(1\)\(E\)/);
    assert.match(TRANSPORTER_REGULATORY_DISCLAIMER, /educational/i);
    assert.match(TRANSPORTER_REGULATORY_DISCLAIMER, /decision support/i);
    assert.match(TRANSPORTER_REGULATORY_DISCLAIMER, /no.*dosing directives/i);
  });

  it("strictly avoids prescriptive treatment or dosing directives in descriptions and hazards", () => {
    for (const transporter of TRANSPORTERS) {
      const text = JSON.stringify(transporter);
      assert.doesNotMatch(text, /\bprescribe\s+\d+/i, `Transporter ${transporter.id} contains prescription directive`);
      assert.doesNotMatch(text, /\btake\s+\d+\s*mg\s+daily\b/i, `Transporter ${transporter.id} contains dosing directive`);
      assert.doesNotMatch(text, /\btitrate\s+to\s+\d+\s*mg\b/i, `Transporter ${transporter.id} contains titration directive`);
    }
  });

  it("cites peer-reviewed literature, FDA guidance, and IUPHAR for all transporters", () => {
    for (const transporter of TRANSPORTERS) {
      const citationJoined = transporter.citations.join(" ");
      assert.match(citationJoined, /FDA|Nat Rev|Clin Pharmacol|Pharmacol Rev|Mol Pharmacol|Eur J|Burckhardt|Koepsell/i);
      assert.ok(transporter.fdaClassification.length > 0);
      assert.ok(transporter.iupharClassification.length > 0);
    }
  });
});
