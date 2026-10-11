import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  RENAL_MECHANISMS_REGULATORY_DISCLAIMER,
  RENAL_MECHANISMS_CITATIONS,
  NEPHRON_SEGMENTS,
  NEPHRON_TRANSPORTERS,
  DIURETIC_CLASS_PROFILES,
  RENAL_COLLISIONS,
  getAllNephronSegments,
  getNephronSegmentById,
  getAllNephronTransporters,
  getTransportersBySegment,
  getDiureticClassProfiles,
  getDiureticClassById,
  detectRenalCollisions,
  getRenalPharmacologySummary,
} from "./renal-mechanisms";

describe("Renal Tubular Acidification, Secretion & Diuretic Segmental Pharmacology Engine", () => {
  describe("Regulatory Posture (FD&C Act § 520(o)(1)(E))", () => {
    it("exports valid FDA 520(o)(1)(E) non-prescriptive regulatory disclaimer", () => {
      assert.ok(RENAL_MECHANISMS_REGULATORY_DISCLAIMER);
      assert.match(RENAL_MECHANISMS_REGULATORY_DISCLAIMER, /FD&C Act § 520\(o\)\(1\)\(E\)/i);
      assert.match(RENAL_MECHANISMS_REGULATORY_DISCLAIMER, /non-prescriptive/i);
      assert.match(RENAL_MECHANISMS_REGULATORY_DISCLAIMER, /educational.*decision-support/i);
      assert.ok(RENAL_MECHANISMS_CITATIONS.length >= 6);
    });

    it("maintains non-prescriptive posture across all clinical and physiological copy", () => {
      const jsonStr = JSON.stringify({
        segments: NEPHRON_SEGMENTS,
        transporters: NEPHRON_TRANSPORTERS,
        profiles: DIURETIC_CLASS_PROFILES,
        collisions: RENAL_COLLISIONS,
      });

      assert.doesNotMatch(jsonStr, /administer\s+\d+\s*mg/i);
      assert.doesNotMatch(jsonStr, /prescribe\s+\d+\s*mg/i);
      assert.doesNotMatch(jsonStr, /give\s+\d+\s*mg/i);
    });
  });

  describe("Nephron Segments Physiology & Membrane Dynamics", () => {
    it("defines exactly 5 anatomical nephron segments with complete physiological profiles", () => {
      const segments = getAllNephronSegments();
      assert.equal(segments.length, 5);

      const segmentIds = segments.map((s) => s.id);
      assert.deepEqual(
        segmentIds.sort(),
        ["ccd-intercalated", "ccd-principal", "dct", "pct", "tal"].sort(),
      );

      for (const seg of segments) {
        assert.ok(seg.name.length > 0);
        assert.ok(seg.shortName.length > 0);
        assert.ok(seg.anatomicalZone.length > 0);
        assert.ok(seg.transepithelialPotential.length > 0);
        assert.ok(seg.waterPermeability.length > 0);
        assert.ok(seg.fractionalSodiumReabsorption.length > 0);
        assert.ok(seg.primaryTransporters.length > 0);
        assert.ok(seg.keyPhysiologicalMechanisms.length > 0);
        assert.ok(seg.pharmacologicalTargets.length > 0);
        assert.ok(seg.tubularFluidComposition.entryOsmolality.length > 0);
        assert.ok(seg.tubularFluidComposition.exitOsmolality.length > 0);
        assert.ok(seg.tubularFluidComposition.phChange.length > 0);
        assert.ok(seg.clinicalPearls.length > 0);
      }
    });

    it("verifies Segment 1: Proximal Convoluted Tubule (PCT) with SGLT2, CA II/IV, NHE3, OAT1/3, OCT2", () => {
      const pct = getNephronSegmentById("pct");
      assert.ok(pct);
      assert.equal(pct.id, "pct");
      assert.match(pct.fractionalSodiumReabsorption, /65%/);
      assert.match(pct.waterPermeability, /AQP1/i);

      // Verify SGLT2 target and drugs
      const sglt2Target = pct.pharmacologicalTargets.find((t) => t.targetMolecule.includes("SGLT2"));
      assert.ok(sglt2Target);
      assert.ok(sglt2Target.representativeDrugIds.includes("empagliflozin"));
      assert.ok(sglt2Target.representativeDrugIds.includes("dapagliflozin"));

      // Verify CA target, bicarbonaturia, alkaline urine, metabolic acidosis
      const caTarget = pct.pharmacologicalTargets.find((t) => t.drugClass.includes("Carbonic Anhydrase"));
      assert.ok(caTarget);
      assert.ok(caTarget.representativeDrugIds.includes("acetazolamide"));
      assert.match(caTarget.electrolyteConsequences.bicarbonateAndAcidBase, /metabolic acidosis|bicarbonaturia/i);
      assert.match(caTarget.electrolyteConsequences.urinePh, /alkaline/i);

      // Verify PCT transporters
      const pctTransporters = getTransportersBySegment("pct");
      const transporterIds = pctTransporters.map((t) => t.id);
      assert.ok(transporterIds.includes("sglt2"));
      assert.ok(transporterIds.includes("ca-iv-ii"));
      assert.ok(transporterIds.includes("nhe3"));
      assert.ok(transporterIds.includes("oat1-3"));
      assert.ok(transporterIds.includes("oct2"));
    });

    it("verifies Segment 2: Thick Ascending Limb (TAL) with NKCC2, ROMK +10 mV potential, and Ca/Mg paracellular drive", () => {
      const tal = getNephronSegmentById("tal");
      assert.ok(tal);
      assert.equal(tal.id, "tal");
      assert.match(tal.waterPermeability, /impermeable/i);
      assert.match(tal.transepithelialPotential, /\+10\s*mV.*lumen-positive/i);

      // Verify NKCC2 and loop diuretics
      const loopTarget = tal.pharmacologicalTargets.find((t) => t.targetMolecule.includes("NKCC2"));
      assert.ok(loopTarget);
      assert.ok(loopTarget.representativeDrugIds.includes("furosemide"));
      assert.ok(loopTarget.representativeDrugIds.includes("torsemide"));
      assert.ok(loopTarget.representativeDrugIds.includes("bumetanide"));

      // Verify hypercalciuria (hypocalcemia risk) and marked hypomagnesemia
      assert.match(loopTarget.electrolyteConsequences.calcium, /hypercalciuria|hypocalcemia/i);
      assert.match(loopTarget.electrolyteConsequences.magnesium, /hypomagnesemia/i);

      // Verify TAL transporters: NKCC2, ROMK, Claudin-16/19
      const talTransporters = getTransportersBySegment("tal");
      const talIds = talTransporters.map((t) => t.id);
      assert.ok(talIds.includes("nkcc2"));
      assert.ok(talIds.includes("romk-tal"));
      assert.ok(talIds.includes("claudin-16-19"));

      const claudin = talTransporters.find((t) => t.id === "claudin-16-19")!;
      assert.equal(claudin.membrane, "paracellular");
      assert.deepEqual(claudin.solutes, ["Ca2+", "Mg2+"]);
    });

    it("verifies Segment 3: Distal Convoluted Tubule (DCT) with NCC, TRPV5, NCX1, and hypocalciuria", () => {
      const dct = getNephronSegmentById("dct");
      assert.ok(dct);
      assert.equal(dct.id, "dct");
      assert.match(dct.fractionalSodiumReabsorption, /5-7%/);

      // Verify NCC target and thiazides
      const thiazideTarget = dct.pharmacologicalTargets.find((t) => t.targetMolecule.includes("NCC"));
      assert.ok(thiazideTarget);
      assert.ok(thiazideTarget.representativeDrugIds.includes("hydrochlorothiazide"));
      assert.ok(thiazideTarget.representativeDrugIds.includes("chlorthalidone"));
      assert.ok(thiazideTarget.representativeDrugIds.includes("metolazone"));

      // Verify hypocalciuria and hypercalcemia risk
      assert.match(thiazideTarget.electrolyteConsequences.calcium, /hypocalciuria|hypercalcemia/i);

      // Verify DCT transporters: NCC, TRPV5, NCX1
      const dctTransporters = getTransportersBySegment("dct");
      const dctIds = dctTransporters.map((t) => t.id);
      assert.ok(dctIds.includes("ncc"));
      assert.ok(dctIds.includes("trpv5"));
      assert.ok(dctIds.includes("ncx1-dct"));

      const trpv5 = dctTransporters.find((t) => t.id === "trpv5")!;
      assert.equal(trpv5.membrane, "apical");
      assert.deepEqual(trpv5.solutes, ["Ca2+"]);

      const ncx1 = dctTransporters.find((t) => t.id === "ncx1-dct")!;
      assert.equal(ncx1.membrane, "basolateral");
      assert.match(ncx1.stoichiometry, /3\s*Na\+.*1\s*Ca2\+/i);
    });

    it("verifies Segment 4: CCD Principal Cells with ENaC, Aldosterone MR axis, ROMK K+ secretion, and V2R/AQP2", () => {
      const ccd = getNephronSegmentById("ccd-principal");
      assert.ok(ccd);
      assert.match(ccd.transepithelialPotential, /lumen-negative/i);

      // Verify ENaC blockers: amiloride, triamterene
      const enacTarget = ccd.pharmacologicalTargets.find((t) => t.targetMolecule.includes("ENaC"));
      assert.ok(enacTarget);
      assert.ok(enacTarget.representativeDrugIds.includes("amiloride"));
      assert.ok(enacTarget.representativeDrugIds.includes("triamterene"));
      assert.match(enacTarget.electrolyteConsequences.potassium, /potassium retention|hyperkalemia/i);

      // Verify MR antagonists: spironolactone, eplerenone
      const mraTarget = ccd.pharmacologicalTargets.find((t) => t.targetMolecule.includes("Mineralocorticoid"));
      assert.ok(mraTarget);
      assert.ok(mraTarget.representativeDrugIds.includes("spironolactone"));
      assert.ok(mraTarget.representativeDrugIds.includes("eplerenone"));

      // Verify V2 receptor antagonist: tolvaptan
      const v2Target = ccd.pharmacologicalTargets.find((t) => t.targetMolecule.includes("V2"));
      assert.ok(v2Target);
      assert.ok(v2Target.representativeDrugIds.includes("tolvaptan"));

      // Verify CCD Principal transporters: ENaC, MR, ROMK, V2R/AQP2
      const ccdTransporters = getTransportersBySegment("ccd-principal");
      const ccdIds = ccdTransporters.map((t) => t.id);
      assert.ok(ccdIds.includes("enac"));
      assert.ok(ccdIds.includes("mr-aldosterone"));
      assert.ok(ccdIds.includes("romk-ccd"));
      assert.ok(ccdIds.includes("v2r-aqp2"));
    });

    it("verifies Segment 5: CCD Intercalated Cells (Alpha & Beta) with H+-ATPase, Pendrin, and urine acidification", () => {
      const ic = getNephronSegmentById("ccd-intercalated");
      assert.ok(ic);

      // Verify Intercalated cell transporters: H+-ATPase, H+/K+-ATPase, AE1, Pendrin
      const icTransporters = getTransportersBySegment("ccd-intercalated");
      const icIds = icTransporters.map((t) => t.id);
      assert.ok(icIds.includes("h-atpase-alpha"));
      assert.ok(icIds.includes("h-k-atpase-alpha"));
      assert.ok(icIds.includes("ae1-alpha"));
      assert.ok(icIds.includes("pendrin-beta"));

      const hAtpase = icTransporters.find((t) => t.id === "h-atpase-alpha")!;
      assert.equal(hAtpase.membrane, "apical");
      assert.deepEqual(hAtpase.solutes, ["H+"]);
      assert.match(hAtpase.drivingForce, /ATP hydrolysis/i);

      const pendrin = icTransporters.find((t) => t.id === "pendrin-beta")!;
      assert.equal(pendrin.membrane, "apical");
      assert.match(pendrin.stoichiometry, /1\s*Cl-.*1\s*HCO3-/i);

      // Verify V2 agonist desmopressin
      const v2AgonistTarget = ic.pharmacologicalTargets.find((t) => t.representativeDrugIds.includes("desmopressin"));
      assert.ok(v2AgonistTarget);
    });
  });

  describe("Diuretic Class Comparison Matrix", () => {
    it("provides complete comparison across all major diuretic classes", () => {
      const profiles = getDiureticClassProfiles();
      assert.ok(profiles.length >= 7);

      const profileIds = profiles.map((p) => p.id);
      assert.ok(profileIds.includes("ca-inhibitors"));
      assert.ok(profileIds.includes("loop-diuretics"));
      assert.ok(profileIds.includes("thiazides"));
      assert.ok(profileIds.includes("potassium-sparing-enac"));
      assert.ok(profileIds.includes("potassium-sparing-mra"));
      assert.ok(profileIds.includes("sglt2-inhibitors"));
      assert.ok(profileIds.includes("v2-antagonists"));

      for (const p of profiles) {
        assert.ok(p.className.length > 0);
        assert.ok(p.tubularSite.length > 0);
        assert.ok(p.molecularTarget.length > 0);
        assert.ok(p.representativeDrugIds.length > 0);
        assert.ok(p.fractionalSodiumExcretion.length > 0);
        assert.ok(p.calciumEffect.length > 0);
        assert.ok(p.magnesiumEffect.length > 0);
        assert.ok(p.potassiumEffect.length > 0);
        assert.ok(p.acidBaseEffect.length > 0);
        assert.ok(p.urinePhEffect.length > 0);
        assert.ok(p.clinicalIndications.length > 0);
        assert.ok(p.highYieldBoardPearls.length > 0);
        assert.ok(p.monitoredParameters.length > 0);
      }
    });

    it("contrasts Loop vs Thiazide calcium mechanics ('Loops lose, Thiazides take in')", () => {
      const loop = getDiureticClassById("loop-diuretics")!;
      const thiazide = getDiureticClassById("thiazides")!;

      assert.match(loop.calciumEffect, /hypercalciuria|hypocalcemia/i);
      assert.match(thiazide.calciumEffect, /hypocalciuria|hypercalcemia/i);
      assert.match(loop.calciumMechanism, /\+10\s*mV.*lumen-positive/i);
      assert.match(thiazide.calciumMechanism, /NCX1/i);
    });

    it("contrasts Potassium-Sparing vs Loop/Thiazide potassium handling", () => {
      const enac = getDiureticClassById("potassium-sparing-enac")!;
      const mra = getDiureticClassById("potassium-sparing-mra")!;
      const loop = getDiureticClassById("loop-diuretics")!;

      assert.match(enac.potassiumEffect, /sparing|hyperkalemia/i);
      assert.match(mra.potassiumEffect, /sparing|hyperkalemia/i);
      assert.match(loop.potassiumEffect, /wasting|hypokalemia/i);
    });

    it("verifies Carbonic Anhydrase inhibitor acid-base signature (alkaline urine + metabolic acidosis)", () => {
      const ca = getDiureticClassById("ca-inhibitors")!;
      assert.match(ca.acidBaseEffect, /metabolic acidosis|non-anion gap/i);
      assert.match(ca.urinePhEffect, /alkaline/i);
    });
  });

  describe("High-Yield Nephrology & Diuretic Collisions Detection", () => {
    it("detects the Triple Whammy collision (ACEi/ARB + Loop + NSAID)", () => {
      const collisions = detectRenalCollisions(["lisinopril", "furosemide", "ibuprofen"]);
      const tripleWhammy = collisions.find((c) => c.collision.id === "triple-whammy");

      assert.ok(tripleWhammy);
      assert.equal(tripleWhammy.collision.severity, "critical");
      assert.match(tripleWhammy.collision.title, /Triple Whammy/i);
      assert.ok(tripleWhammy.matchedDrugIds.includes("lisinopril"));
      assert.ok(tripleWhammy.matchedDrugIds.includes("furosemide"));
      assert.ok(tripleWhammy.matchedDrugIds.includes("ibuprofen"));
      assert.match(tripleWhammy.collision.mechanismsInvolved.afferentArteriole!, /NSAID.*prostaglandin/i);
      assert.match(tripleWhammy.collision.mechanismsInvolved.efferentArteriole!, /ACE.*angiotensin/i);
    });

    it("detects Sequential Nephron Blockade (Loop Diuretic + Thiazide/Metolazone)", () => {
      const collisions = detectRenalCollisions(["bumetanide", "metolazone"]);
      const seqBlock = collisions.find((c) => c.collision.id === "sequential-nephron-blockade");

      assert.ok(seqBlock);
      assert.equal(seqBlock.collision.severity, "synergistic-clinical");
      assert.match(seqBlock.collision.title, /Sequential Nephron Blockade/i);
      assert.ok(seqBlock.matchedDrugIds.includes("bumetanide"));
      assert.ok(seqBlock.matchedDrugIds.includes("metolazone"));
      assert.match(seqBlock.collision.pathophysiologyDetail, /hypertrophy/i);
    });

    it("detects Diuretic-Induced Contraction Alkalosis Risk for Loop Diuretics", () => {
      const collisions = detectRenalCollisions(["furosemide"]);
      const alkalosis = collisions.find((c) => c.collision.id === "contraction-alkalosis-risk");

      assert.ok(alkalosis);
      assert.match(alkalosis.collision.title, /Contraction Alkalosis/i);
      assert.ok(alkalosis.matchedDrugIds.includes("furosemide"));
      assert.match(alkalosis.collision.pathophysiologyDetail, /(?:aldosterone|hyperaldosteronism).*H\+-ATPase/i);
    });

    it("detects Lithium Nephrogenic DI & Amiloride ENaC Rescue", () => {
      // Lithium alone
      const lithiumAlone = detectRenalCollisions(["lithium"]);
      const ndiAlone = lithiumAlone.find((c) => c.collision.id === "lithium-ndi-enac");
      assert.ok(ndiAlone);
      assert.ok(ndiAlone.matchedDrugIds.includes("lithium"));
      assert.ok(!ndiAlone.matchedDrugIds.includes("amiloride"));

      // Lithium + Amiloride rescue
      const lithiumAmiloride = detectRenalCollisions(["lithium", "amiloride"]);
      const ndiRescued = lithiumAmiloride.find((c) => c.collision.id === "lithium-ndi-enac");
      assert.ok(ndiRescued);
      assert.ok(ndiRescued.matchedDrugIds.includes("lithium"));
      assert.ok(ndiRescued.matchedDrugIds.includes("amiloride"));
      assert.match(ndiRescued.collision.pathophysiologyDetail, /ENaC.*GSK3/i);
      assert.match(ndiRescued.collision.mitigationPhysiology, /Amiloride/i);
    });

    it("detects Dual RAAS / Aldosterone Blockade Hyperkalemia Hazard", () => {
      const collisions = detectRenalCollisions(["losartan", "spironolactone"]);
      const dualRaas = collisions.find((c) => c.collision.id === "dual-raas-hyperkalemia");

      assert.ok(dualRaas);
      assert.equal(dualRaas.collision.severity, "critical");
      assert.ok(dualRaas.matchedDrugIds.includes("losartan"));
      assert.ok(dualRaas.matchedDrugIds.includes("spironolactone"));
    });

    it("detects SGLT2 + Loop Diuretic additive volume contraction", () => {
      const collisions = detectRenalCollisions(["empagliflozin", "torsemide"]);
      const sglt2Loop = collisions.find((c) => c.collision.id === "sglt2-loop-hypovolemia");

      assert.ok(sglt2Loop);
      assert.ok(sglt2Loop.matchedDrugIds.includes("empagliflozin"));
      assert.ok(sglt2Loop.matchedDrugIds.includes("torsemide"));
    });

    it("returns empty collisions for empty or non-interacting list", () => {
      assert.deepEqual(detectRenalCollisions([]), []);
      assert.deepEqual(detectRenalCollisions(["acetaminophen", "atorvastatin"]), []);
    });
  });

  describe("Helper Functions & Pharmacology Summary", () => {
    it("getRenalPharmacologySummary correctly summarizes active segments, transporters, and collisions", () => {
      const summary = getRenalPharmacologySummary(["furosemide", "metolazone", "lisinopril", "ibuprofen"]);

      assert.ok(summary.activeSegments.length >= 2);
      assert.ok(summary.activeTransporters.some((t) => t.id === "nkcc2"));
      assert.ok(summary.activeTransporters.some((t) => t.id === "ncc"));
      assert.ok(summary.collisions.some((c) => c.collision.id === "triple-whammy"));
      assert.ok(summary.collisions.some((c) => c.collision.id === "sequential-nephron-blockade"));
      assert.ok(summary.diureticClasses.some((p) => p.id === "loop-diuretics"));
      assert.ok(summary.diureticClasses.some((p) => p.id === "thiazides"));
    });
  });

  describe("Catalog Integrity & DRUG_BY_ID Validation", () => {
    it("ensures every referenced drug ID across all data structures exists in DRUG_BY_ID", () => {
      const allReferencedDrugIds = new Set<string>();

      // From transporters
      for (const t of getAllNephronTransporters()) {
        for (const id of t.inhibitedByDrugIds) {
          allReferencedDrugIds.add(id);
        }
      }

      // From segments pharmacological targets
      for (const s of getAllNephronSegments()) {
        for (const target of s.pharmacologicalTargets) {
          for (const id of target.representativeDrugIds) {
            allReferencedDrugIds.add(id);
          }
        }
      }

      // From diuretic profiles
      for (const p of getDiureticClassProfiles()) {
        for (const id of p.representativeDrugIds) {
          allReferencedDrugIds.add(id);
        }
      }

      // From collisions
      for (const col of RENAL_COLLISIONS) {
        for (const id of col.interactingDrugIds) {
          allReferencedDrugIds.add(id);
        }
      }

      assert.ok(allReferencedDrugIds.size >= 15, `Expected >= 15 referenced drugs, got ${allReferencedDrugIds.size}`);

      const missing: string[] = [];
      for (const drugId of allReferencedDrugIds) {
        if (!DRUG_BY_ID[drugId]) {
          missing.push(drugId);
        }
      }

      assert.deepEqual(
        missing,
        [],
        `All referenced drugs must exist in DRUG_BY_ID catalog. Missing: ${missing.join(", ")}`,
      );
    });

    it("specifically validates core required drugs in DRUG_BY_ID", () => {
      const coreRequired = [
        "empagliflozin",
        "dapagliflozin",
        "acetazolamide",
        "furosemide",
        "torsemide",
        "bumetanide",
        "hydrochlorothiazide",
        "chlorthalidone",
        "metolazone",
        "amiloride",
        "spironolactone",
        "eplerenone",
        "tolvaptan",
        "desmopressin",
        "lisinopril",
        "losartan",
        "ibuprofen",
        "lithium",
      ];

      for (const id of coreRequired) {
        assert.ok(
          DRUG_BY_ID[id],
          `Core drug '${id}' must be present in DRUG_BY_ID`,
        );
      }
    });
  });
});
