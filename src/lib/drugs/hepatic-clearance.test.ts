import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  HEPATIC_DISCLAIMER,
  HEPATIC_CITATIONS,
  HEPATIC_BLOOD_FLOW_L_H,
  REFERENCE_ALBUMIN_G_DL,
  HEPATIC_PROFILES,
  HEPATIC_PROFILE_BY_ID,
  CIRRHOSIS_PRESETS,
  extractionClass,
  intrinsicClearanceFrom,
  scaleFu,
  wellStirred,
  compareHepatic,
  hepaticOnDesk,
  hepaticReportOnDesk,
  type CirrhosisState,
} from "./hepatic-clearance";

const near = (a: number, b: number, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) <= tol, `expected ${a} ≈ ${b} (tol ${tol})`);

const P = (id: string) => {
  const p = HEPATIC_PROFILE_BY_ID[id];
  assert.ok(p, `profile ${id}`);
  return p;
};

describe("Hepatic clearance engine", () => {
  describe("constants and sources", () => {
    it("exposes flow and reference albumin", () => {
      assert.equal(HEPATIC_BLOOD_FLOW_L_H, 90);
      assert.equal(REFERENCE_ALBUMIN_G_DL, 4.2);
    });

    it("disclaimer frames a teaching model, not a dose", () => {
      assert.match(HEPATIC_DISCLAIMER, /Teaching model/);
      assert.match(HEPATIC_DISCLAIMER, /not a dose/);
      assert.match(HEPATIC_DISCLAIMER, /label/);
    });

    it("cites Wilkinson & Shand, Verbeeck, Benet & Hoener, Johnson, and FDA 2003", () => {
      for (const key of ["Wilkinson", "Verbeeck", "Benet", "Johnson", "FDA Guidance"]) {
        assert.ok(HEPATIC_CITATIONS.some((c) => c.includes(key)), key);
      }
    });

    it("every profile id exists in the catalog", () => {
      assert.equal(HEPATIC_PROFILES.length, 9);
      for (const p of HEPATIC_PROFILES) {
        assert.ok(DRUG_BY_ID[p.id], `${p.id} missing from DRUG_BY_ID`);
        assert.equal(p.fa, 1);
      }
    });

    it("presets carry the illustrative values", () => {
      assert.deepEqual(CIRRHOSIS_PRESETS.normal, { clintMultiplier: 1, flowMultiplier: 1, shuntFraction: 0, albuminGdl: 4.2 });
      assert.deepEqual(CIRRHOSIS_PRESETS.C, { clintMultiplier: 0.25, flowMultiplier: 0.8, shuntFraction: 0.5, albuminGdl: 2.5 });
    });
  });

  describe("building blocks", () => {
    it("extractionClass bounds", () => {
      assert.equal(extractionClass(0.7), "high");
      assert.equal(extractionClass(0.95), "high");
      assert.equal(extractionClass(0.69), "intermediate");
      assert.equal(extractionClass(0.3), "intermediate");
      assert.equal(extractionClass(0.29), "low");
      assert.equal(extractionClass(0.003), "low");
    });

    it("intrinsicClearanceFrom satisfies fu·CLint = E·Q/(1−E)", () => {
      const clint = intrinsicClearanceFrom(0.75, 0.13);
      near(0.13 * clint, (0.75 * 90) / 0.25);
    });

    it("scaleFu is identity at reference albumin and rises as albumin falls", () => {
      near(scaleFu(0.1, 4.2), 0.1);
      assert.ok(scaleFu(0.1, 2.5) > 0.1);
      assert.ok(scaleFu(0.01, 2.5) > scaleFu(0.01, 3.0));
      assert.ok(scaleFu(0.1, 5) < 0.1);
    });
  });

  describe("well-stirred model", () => {
    it("normal state returns CLh ≈ E·Q and F ≈ fg·(1−E) for every profile", () => {
      for (const p of HEPATIC_PROFILES) {
        const r = wellStirred(p, CIRRHOSIS_PRESETS.normal);
        near(r.clh, p.extraction * 90);
        near(r.fOral, p.fg * (1 - p.extraction));
        near(r.extractionPerfused, p.extraction);
      }
    });

    it("low-E oral unbound AUC ratio ≈ 1/clintMultiplier with no shunt, regardless of albumin", () => {
      for (const albuminGdl of [4.2, 3.0, 2.0]) {
        const state: CirrhosisState = { clintMultiplier: 0.5, flowMultiplier: 0.8, shuntFraction: 0, albuminGdl };
        const c = compareHepatic(P("warfarin"), state);
        near(c.ratios.aucOralUnbound, 2, 1e-6);
      }
    });

    it("warfarin unbound oral ratio under preset C with shunt 0 is about 4", () => {
      const c = compareHepatic(P("warfarin"), { ...CIRRHOSIS_PRESETS.C, shuntFraction: 0 });
      near(c.ratios.aucOralUnbound, 4, 1e-6);
    });

    it("flow change alone: high-E IV AUC rises roughly 1/flow; low-E IV barely moves", () => {
      const state: CirrhosisState = { clintMultiplier: 1, flowMultiplier: 0.8, shuntFraction: 0, albuminGdl: 4.2 };
      const high = compareHepatic(P("propranolol"), state);
      assert.ok(high.ratios.aucIv > 1.1, `high-E IV ratio ${high.ratios.aucIv}`);
      assert.ok(Math.abs(high.ratios.aucIv - 1 / 0.8) < 0.15, `high-E IV ratio ${high.ratios.aucIv}`);
      const low = compareHepatic(P("warfarin"), state);
      assert.ok(Math.abs(low.ratios.aucIv - 1) < 0.01, `low-E IV ratio ${low.ratios.aucIv}`);
    });

    it("propranolol oral AUC rises more than 3-fold under preset C, more than IV does", () => {
      const c = compareHepatic(P("propranolol"), CIRRHOSIS_PRESETS.C);
      assert.ok(c.ratios.aucOral > 3, `oral ratio ${c.ratios.aucOral}`);
      assert.ok(c.ratios.aucOral > c.ratios.aucIv);
      assert.ok(c.ratios.fOral > 2);
    });

    it("unbound AUC equals fu × total AUC", () => {
      const r = wellStirred(P("phenytoin"), CIRRHOSIS_PRESETS.B);
      near(r.aucOralUnboundRel, r.fu * r.aucOralRel);
      near(r.aucIvUnboundRel, r.fu * r.aucIvRel);
    });
  });

  describe("teaching sentences", () => {
    it("high-E teaching names blood flow and first pass", () => {
      const c = compareHepatic(P("verapamil"), CIRRHOSIS_PRESETS.C);
      assert.equal(c.extractionClass, "high");
      const t = c.teaching.join(" ");
      assert.match(t, /blood flow/);
      assert.match(t, /first-pass/);
    });

    it("low-E teaching names unbound exposure, free levels and Benet & Hoener", () => {
      const c = compareHepatic(P("phenytoin"), CIRRHOSIS_PRESETS.C);
      assert.equal(c.extractionClass, "low");
      const t = c.teaching.join(" ");
      assert.match(t, /unbound/);
      assert.match(t, /free levels/);
      assert.match(t, /Benet and Hoener/);
    });

    it("notes gut-wall CYP3A is not modeled when Fg < 1", () => {
      const c = compareHepatic(P("midazolam"), CIRRHOSIS_PRESETS.B);
      assert.equal(c.extractionClass, "intermediate");
      assert.ok(c.teaching.some((s) => s.includes("Gut-wall CYP3A")));
      const w = compareHepatic(P("warfarin"), CIRRHOSIS_PRESETS.B);
      assert.ok(!w.teaching.some((s) => s.includes("Gut-wall CYP3A")));
    });

    it("never uses the word prescribe", () => {
      for (const p of HEPATIC_PROFILES) {
        const c = compareHepatic(p, CIRRHOSIS_PRESETS.C);
        for (const s of c.teaching) assert.ok(!/prescribe/i.test(s), s);
      }
    });
  });

  describe("desk detection and report", () => {
    it("matches only profiled ids, de-duplicated, in tray order", () => {
      const d = hepaticOnDesk(["sertraline", "warfarin", "propranolol", "warfarin"]);
      assert.deepEqual(d.matchedIds, ["warfarin", "propranolol"]);
      assert.equal(d.hasHepaticPreset, true);
      assert.equal(hepaticOnDesk(["sertraline"]).hasHepaticPreset, false);
    });

    it("report compares each matched drug under preset B and carries sources", () => {
      const r = hepaticReportOnDesk(["morphine", "theophylline"]);
      assert.equal(r.comparisons.length, 2);
      for (const c of r.comparisons) assert.deepEqual(c.state, CIRRHOSIS_PRESETS.B);
      assert.equal(r.disclaimer, HEPATIC_DISCLAIMER);
      assert.equal(r.citations, HEPATIC_CITATIONS);
    });
  });
});
