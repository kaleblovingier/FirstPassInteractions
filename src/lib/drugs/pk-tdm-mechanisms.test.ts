import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  PK_CONCEPTS,
  REGULATORY_NOTICE,
  PK_REGULATORY_NOTICE,
  getPkConceptById,
  getAllPkConcepts,
  calculateMichaelisMenten,
  evaluateDialyzability,
  calculateProteinDisplacement,
  calculateSteadyStateAccumulation,
  type PkConcept,
} from "./pk-tdm-mechanisms";

describe("Pharmacokinetics & Nonlinear Clearance Mechanism Engine", () => {
  const EXPECTED_IDS = [
    "michaelis-menten-phenytoin",
    "zero-order-ethanol-salicylate",
    "volume-of-distribution-dialysis",
    "protein-binding-displacement",
    "steady-state-accumulation",
  ] as const;

  describe("Core PK Concepts Catalog", () => {
    it("contains exactly the 5 required core pharmacokinetic concepts", () => {
      const concepts = getAllPkConcepts();
      assert.equal(concepts.length, 5);
      const ids = concepts.map((c) => c.id);
      for (const expectedId of EXPECTED_IDS) {
        assert.ok(
          ids.includes(expectedId),
          `Expected concept ID '${expectedId}' to be present`,
        );
      }
    });

    it("every concept has complete, rich educational content", () => {
      for (const concept of PK_CONCEPTS) {
        assert.ok(concept.id.length > 0, "ID must be non-empty");
        assert.ok(concept.title.length > 0, "Title must be non-empty");
        assert.ok(concept.shortName.length > 0, "Short name must be non-empty");
        assert.ok(concept.summary.length > 20, "Summary must be descriptive");
        assert.ok(
          concept.molecularMechanism.length > 100,
          `Molecular mechanism for ${concept.id} must be rich and detailed`,
        );
        assert.ok(
          concept.clinicalImplications.length > 100,
          `Clinical implications for ${concept.id} must be comprehensive`,
        );
        assert.ok(
          concept.citations.length >= 2,
          `Concept ${concept.id} must cite at least 2 canonical literature sources`,
        );
        assert.ok(
          concept.clinicalPearls.length >= 2,
          `Concept ${concept.id} must provide clinical pearls`,
        );
        assert.ok(
          concept.examBoardNotes.length >= 2,
          `Concept ${concept.id} must provide exam board notes`,
        );
        assert.ok(
          concept.exemplarDrugs.length >= 1,
          `Concept ${concept.id} must list exemplar drugs`,
        );
      }
    });

    it("every exemplar drug exists in the FirstPass main drug catalog", () => {
      for (const concept of PK_CONCEPTS) {
        for (const drugId of concept.exemplarDrugs) {
          assert.ok(
            DRUG_BY_ID[drugId],
            `Exemplar drug '${drugId}' in concept '${concept.id}' must exist in catalog DRUG_BY_ID`,
          );
        }
      }
    });

    it("getPkConceptById retrieves concepts case-insensitively and returns null for invalid IDs", () => {
      const mm = getPkConceptById("michaelis-menten-phenytoin");
      assert.ok(mm);
      assert.equal(mm.id, "michaelis-menten-phenytoin");

      const upper = getPkConceptById("MICHAELIS-MENTEN-PHENYTOIN");
      assert.ok(upper);
      assert.equal(upper.id, "michaelis-menten-phenytoin");

      const trimmed = getPkConceptById("  volume-of-distribution-dialysis  ");
      assert.ok(trimmed);
      assert.equal(trimmed.id, "volume-of-distribution-dialysis");

      assert.equal(getPkConceptById("non-existent-pk-id"), null);
      assert.equal(getPkConceptById(""), null);
    });
  });

  describe("Michaelis-Menten Calculations (calculateMichaelisMenten)", () => {
    it("accurately calculates steady-state concentration for linear, transitional, and saturation regimes", () => {
      // Default: Vmax = 500 mg/day, Km = 4.0 mg/L
      // Css = (Dose * Km) / (Vmax - Dose)
      // At Dose = 300 mg/day: Css = (300 * 4) / (500 - 300) = 1200 / 200 = 6 mg/L
      const res300 = calculateMichaelisMenten(300, 500, 4);
      assert.equal(res300.isSaturated, false);
      assert.equal(res300.cssMgL, 6.0);
      assert.equal(res300.percentVmaxUtilized, 60.0);
      assert.equal(res300.regime, "mixed-transitional");

      // At low dose: 100 mg/day: Css = (100 * 4) / 400 = 1 mg/L (linear regime, C << Km)
      const res100 = calculateMichaelisMenten(100, 500, 4);
      assert.equal(res100.cssMgL, 1.0);
      assert.equal(res100.percentVmaxUtilized, 20.0);
      assert.equal(res100.regime, "linear");

      // At high dose: 400 mg/day: Css = (400 * 4) / 100 = 16 mg/L (therapeutic range)
      const res400 = calculateMichaelisMenten(400, 500, 4);
      assert.equal(res400.cssMgL, 16.0);
      assert.equal(res400.percentVmaxUtilized, 80.0);
      assert.equal(res400.regime, "capacity-limited-zero-order");

      // At near-Vmax dose: 450 mg/day: Css = (450 * 4) / 50 = 36 mg/L (toxic range!)
      const res450 = calculateMichaelisMenten(450, 500, 4);
      assert.equal(res450.cssMgL, 36.0);
      assert.equal(res450.percentVmaxUtilized, 90.0);
      assert.equal(res450.regime, "capacity-limited-zero-order");
    });

    it("demonstrates the classic nonlinear concentration surge upon small dose escalation", () => {
      // Increasing dose from 350 to 400 mg/day (+14.3% dose increase)
      // At 350 mg/day: Css = (350 * 4) / 150 = 9.33 mg/L
      // At 400 mg/day: Css = (400 * 4) / 100 = 16.0 mg/L (+71.5% level increase!)
      const low = calculateMichaelisMenten(350, 500, 4);
      const high = calculateMichaelisMenten(400, 500, 4);

      assert.ok(low.cssMgL !== null && high.cssMgL !== null);
      const doseDeltaRatio = (400 - 350) / 350; // ~0.143
      const concDeltaRatio = (high.cssMgL - low.cssMgL) / low.cssMgL; // (16 - 9.33) / 9.33 = ~0.715

      assert.ok(
        concDeltaRatio > doseDeltaRatio * 4,
        "Concentration delta ratio must vastly exceed dose delta ratio due to zero-order saturation",
      );
    });

    it("correctly handles dose >= Vmax (full capacity saturation / continuous accumulation)", () => {
      const atVmax = calculateMichaelisMenten(500, 500, 4);
      assert.equal(atVmax.isSaturated, true);
      assert.equal(atVmax.cssMgL, null);
      assert.equal(atVmax.clearanceLDay, null);
      assert.equal(atVmax.regime, "capacity-limited-zero-order");
      assert.match(atVmax.explanation, /100% saturated/);

      const aboveVmax = calculateMichaelisMenten(550, 500, 4);
      assert.equal(aboveVmax.isSaturated, true);
      assert.equal(aboveVmax.cssMgL, null);
    });

    it("generates a smooth curve array for graphical visualization", () => {
      const res = calculateMichaelisMenten(300, 500, 4);
      assert.ok(Array.isArray(res.curve));
      assert.ok(res.curve.length > 20);
      assert.equal(res.curve[0].doseMgDay, 0);
      assert.equal(res.curve[0].cssMgL, 0);
      // Curve points should be monotonically increasing
      for (let i = 1; i < res.curve.length; i++) {
        assert.ok(res.curve[i].cssMgL >= res.curve[i - 1].cssMgL);
      }
    });
  });

  describe("Dialyzability Evaluation (evaluateDialyzability)", () => {
    it("evaluates Gentamicin as dialyzable (low Vd 0.25 L/kg, low PB 10%, low MW 477 Da)", () => {
      const evalGenta = evaluateDialyzability(0.25, 10, 477);
      assert.equal(evalGenta.rating, "dialyzable");
      assert.equal(evalGenta.criteria.vd.meetsCriterion, true);
      assert.equal(evalGenta.criteria.proteinBinding.meetsCriterion, true);
      assert.equal(evalGenta.criteria.molecularWeight.meetsCriterion, true);
      assert.match(evalGenta.clinicalImplication, /replacement dosing/i);
    });

    it("evaluates Lithium as dialyzable (low Vd 0.7 L/kg, 0% PB, MW 7 Da)", () => {
      const evalLith = evaluateDialyzability(0.7, 0, 7);
      assert.equal(evalLith.rating, "dialyzable");
      assert.equal(evalLith.criteria.vd.meetsCriterion, true);
      assert.equal(evalLith.criteria.proteinBinding.meetsCriterion, true);
      assert.equal(evalLith.criteria.molecularWeight.meetsCriterion, true);
    });

    it("evaluates Digoxin as not-dialyzable due to massive tissue sequestration (Vd 6.0 L/kg)", () => {
      const evalDigo = evaluateDialyzability(6.0, 25, 781);
      assert.equal(evalDigo.rating, "not-dialyzable");
      assert.equal(evalDigo.criteria.vd.meetsCriterion, false);
      assert.match(evalDigo.mechanisticExplanation, /volume of distribution/i);
    });

    it("evaluates Amiodarone as not-dialyzable due to extreme Vd (60 L/kg) and high protein binding (96%)", () => {
      const evalAmio = evaluateDialyzability(60.0, 96, 645);
      assert.equal(evalAmio.rating, "not-dialyzable");
      assert.equal(evalAmio.criteria.vd.meetsCriterion, false);
      assert.equal(evalAmio.criteria.proteinBinding.meetsCriterion, false);
    });

    it("evaluates Warfarin as not-dialyzable because 99% albumin binding acts as an absolute barrier", () => {
      const evalWarf = evaluateDialyzability(0.14, 99, 308);
      assert.equal(evalWarf.rating, "not-dialyzable");
      assert.equal(evalWarf.criteria.vd.meetsCriterion, true); // Low Vd
      assert.equal(evalWarf.criteria.proteinBinding.meetsCriterion, false); // 99% PB
      assert.match(evalWarf.mechanisticExplanation, /protein binding/i);
    });

    it("evaluates Vancomycin as partially-dialyzable with high-flux membranes (MW 1449 Da, Vd 0.7 L/kg, PB 50%)", () => {
      const evalVanc = evaluateDialyzability(0.7, 50, 1449);
      assert.equal(evalVanc.rating, "partially-dialyzable");
      assert.equal(evalVanc.criteria.molecularWeight.meetsCriterion, true);
      assert.match(evalVanc.criteria.molecularWeight.detail, /high-flux/i);
    });
  });

  describe("Protein Binding & Displacement Calculations", () => {
    it("accurately detects deceptive normal total phenytoin with toxic free fraction surge", () => {
      // Patient with total phenytoin 12 mcg/mL (normal range 10-20)
      // Valproate displaces free fraction from 10% to 22%
      // Free level = 12 * 0.22 = 2.64 mcg/mL (toxic! >2.0)
      const res = calculateProteinDisplacement(12, 10, 22, 4.4);
      assert.equal(res.totalMeasuredMcgMl, 12);
      assert.equal(res.baselineFreeMcgMl, 1.2);
      assert.equal(res.displacedFreeMcgMl, 2.64);
      assert.equal(res.isDeceptiveNormal, true);
      assert.equal(res.freeIncreaseFold, 2.2);
    });

    it("calculates Winter-Tozer albumin correction correctly for hypoalbuminemia", () => {
      // Total phenytoin = 8 mcg/mL in patient with albumin 2.0 g/dL
      // Winter-Tozer = 8 / ((0.2 * 2.0) + 0.1) = 8 / 0.5 = 16 mcg/mL
      const res = calculateProteinDisplacement(8, 10, 10, 2.0);
      assert.equal(res.winterTozerCorrectedMcgMl, 16.0);
    });
  });

  describe("Steady-State Accumulation Calculations", () => {
    it("calculates accumulation factor R and time to steady state correctly", () => {
      // Half-life = 12h, dosing interval = 12h (tau = t1/2)
      // In theory, when tau = t1/2, R = 1 / (1 - 0.5) = 2.0
      const res = calculateSteadyStateAccumulation(12, 12);
      assert.equal(res.accumulationFactorR, 2.0);
      assert.ok(res.hoursToNinetyFivePercentCss >= 50 && res.hoursToNinetyFivePercentCss <= 53);
    });
  });

  describe("Non-prescriptive Regulatory Posture (FD&C Act § 520(o)(1)(E))", () => {
    it("exports official regulatory disclaimer citing FD&C Act § 520(o)(1)(E)", () => {
      assert.match(
        REGULATORY_NOTICE,
        /FD&C Act § 520\(o\)\(1\)\(E\)/,
        "Regulatory notice must explicitly cite FD&C Act § 520(o)(1)(E)",
      );
      assert.match(
        REGULATORY_NOTICE,
        /Educational Decision Support/i,
        "Regulatory notice must state educational decision support posture",
      );
      assert.equal(REGULATORY_NOTICE, PK_REGULATORY_NOTICE);
    });

    it("all concepts cite authoritative pharmacology and pharmacokinetics literature", () => {
      for (const concept of PK_CONCEPTS) {
        const citedText = concept.citations.join(" ");
        assert.match(
          citedText,
          /Rowland & Tozer|Goodman & Gilman|Burton|Winter|Katzung|Goldfrank|EXTRIP|Bennett/i,
          `Concept '${concept.id}' must cite canonical clinical pharmacokinetics textbooks or guidelines`,
        );
      }
    });

    it("contains NO patient-specific prescribing directives or medical orders", () => {
      const allText = JSON.stringify(PK_CONCEPTS);
      assert.doesNotMatch(allText, /\bprescribe \d+/i, "Must not contain prescription orders");
      assert.doesNotMatch(allText, /\btake \d+ ?mg\b/i, "Must not contain patient dosing directives");
      assert.doesNotMatch(allText, /\bgive \d+ ?mg\b/i, "Must not contain dosing directives");
      assert.doesNotMatch(allText, /\badminister \d+ ?mg\/kg\b/i, "Must not contain dosing orders");
    });
  });
});
