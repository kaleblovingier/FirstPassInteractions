import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EQUIANALGESIC,
  EQUI_BY_KEY,
  toOme,
  fromOme,
  crossToleranceReduction,
  rotateOpioid,
  DURAGESIC_TABLE,
  toFentanylPatch,
  patchToOme,
  RIPAMONTI_BANDS,
  AYONRINDE_BANDS,
  methadoneRatioFor,
  toMethadone,
  METHADONE_START_CAP_MG,
  rotationOnDesk,
  defaultFromKey,
  factorsFromHost,
  rotationReportOnDesk,
  ROTATION_CITATIONS,
  ROTATION_DISCLAIMER,
  type RotationFactors,
} from "./opioid-rotation";
import { DEFAULT_HOST } from "./types";

const base: RotationFactors = {
  geriatric: false,
  renalImpairment: false,
  hepaticImpairment: false,
  sedativeOnTray: false,
  reason: "uncontrolled-pain",
};

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

describe("opioid rotation teaching engine", () => {
  describe("equianalgesic table", () => {
    it("every key is unique and indexed", () => {
      assert.equal(Object.keys(EQUI_BY_KEY).length, EQUIANALGESIC.length);
      assert.equal(EQUI_BY_KEY["morphine-po"].equianalgesicMg, 30);
    });

    it("convert-from-only rows are not targets", () => {
      for (const k of ["tramadol-po", "codeine-po", "tapentadol-po", "fentanyl-iv"]) {
        assert.equal(EQUI_BY_KEY[k].target, false, k);
      }
    });
  });

  describe("toOme / fromOme", () => {
    it("40 mg oxycodone PO/24 h → 60 OME", () => {
      near(toOme("oxycodone-po", 40), 60);
    });

    it("60 OME → 15 mg hydromorphone PO before reduction", () => {
      near(fromOme("hydromorphone-po", 60), 15);
    });

    it("30 mg IV morphine → 90 OME and back", () => {
      near(toOme("morphine-iv", 30), 90);
      near(fromOme("morphine-iv", 90), 30);
    });

    it("unknown key or nonpositive dose returns 0", () => {
      assert.equal(toOme("nope", 10), 0);
      assert.equal(toOme("morphine-po", 0), 0);
      assert.equal(toOme("morphine-po", -5), 0);
      assert.equal(fromOme("morphine-po", Number.NaN), 0);
    });
  });

  describe("crossToleranceReduction", () => {
    it("same molecule has 0 reduction", () => {
      const ct = crossToleranceReduction(true, { ...base, geriatric: true });
      assert.equal(ct.reduction, 0);
    });

    it("uncontrolled pain, no risks → 25%", () => {
      assert.equal(crossToleranceReduction(false, base).reduction, 0.25);
    });

    it("any risk modifier → 50%", () => {
      for (const f of [
        { ...base, geriatric: true },
        { ...base, renalImpairment: true },
        { ...base, hepaticImpairment: true },
        { ...base, sedativeOnTray: true },
        { ...base, reason: "adverse-effects" as const },
      ]) {
        assert.equal(crossToleranceReduction(false, f).reduction, 0.5);
      }
    });

    it("no risk and pain not the driver → 33%", () => {
      assert.equal(crossToleranceReduction(false, { ...base, reason: "formulary" }).reduction, 0.33);
      assert.equal(crossToleranceReduction(false, { ...base, reason: "route-change" }).reduction, 0.33);
    });
  });

  describe("rotateOpioid", () => {
    it("morphine PO → IV, same molecule: no reduction", () => {
      const r = rotateOpioid({ fromKey: "morphine-po", fromMgPer24h: 90, toKey: "morphine-iv", factors: base });
      assert.ok(r);
      assert.equal(r.crossTolerance.reduction, 0);
      assert.equal(r.ome, 90);
      assert.equal(r.calculatedTargetMgPer24h, 30);
      assert.equal(r.reducedTargetMgPer24h, 30);
    });

    it("returns null for a convert-from-only target", () => {
      assert.equal(rotateOpioid({ fromKey: "morphine-po", fromMgPer24h: 60, toKey: "tramadol-po", factors: base }), null);
    });

    it("returns null for a nonpositive dose or unknown key", () => {
      assert.equal(rotateOpioid({ fromKey: "morphine-po", fromMgPer24h: 0, toKey: "oxycodone-po", factors: base }), null);
      assert.equal(rotateOpioid({ fromKey: "morphine-po", fromMgPer24h: -10, toKey: "oxycodone-po", factors: base }), null);
      assert.equal(rotateOpioid({ fromKey: "x", fromMgPer24h: 10, toKey: "oxycodone-po", factors: base }), null);
    });

    it("oxycodone 40 → hydromorphone PO, uncontrolled pain: 25% off, split q4h, BT 10–20%", () => {
      const r = rotateOpioid({ fromKey: "oxycodone-po", fromMgPer24h: 40, toKey: "hydromorphone-po", intervalH: 4, factors: base });
      assert.ok(r);
      assert.equal(r.ome, 60);
      assert.equal(r.calculatedTargetMgPer24h, 15);
      // 15 × 0.75 = 11.25 → 11.3
      assert.equal(r.reducedTargetMgPer24h, 11.3);
      // range: 50% off = 7.5, 25% off = 11.25 → 11.3
      assert.deepEqual(r.reducedRangeMgPer24h, [7.5, 11.3]);
      assert.equal(r.dosesPerDay, 6);
      // 11.25 / 6 = 1.875 → 1.9
      assert.equal(r.perDoseMg, 1.9);
      // 1.125 → 1.1; 2.25 → 2.3
      assert.deepEqual(r.breakthroughMg, [1.1, 2.3]);
      assert.equal(r.steps.length, 5);
    });

    it("q12h split gives 2 doses; default interval comes from the target row", () => {
      const r12 = rotateOpioid({ fromKey: "morphine-po", fromMgPer24h: 120, toKey: "oxycodone-po", intervalH: 12, factors: { ...base, reason: "formulary" } });
      assert.ok(r12);
      assert.equal(r12.dosesPerDay, 2);
      // 120 OME → 80 oxy → ×0.67 = 53.6 → per dose 26.8
      assert.equal(r12.reducedTargetMgPer24h, 53.6);
      assert.equal(r12.perDoseMg, 26.8);
      const rDef = rotateOpioid({ fromKey: "morphine-po", fromMgPer24h: 120, toKey: "oxymorphone-po", factors: base });
      assert.ok(rDef);
      assert.equal(rDef.intervalH, 6);
      assert.equal(rDef.dosesPerDay, 4);
    });

    it("renal warning when target is morphine and renal impairment is set", () => {
      const r = rotateOpioid({ fromKey: "oxycodone-po", fromMgPer24h: 20, toKey: "morphine-po", factors: { ...base, renalImpairment: true } });
      assert.ok(r);
      assert.ok(r.warnings.some((w) => w.includes("renally cleared")));
      const r2 = rotateOpioid({ fromKey: "morphine-po", fromMgPer24h: 30, toKey: "hydromorphone-po", factors: { ...base, renalImpairment: true } });
      assert.ok(r2);
      assert.ok(!r2.warnings.some((w) => w.includes("renally cleared")));
    });

    it("naloxone warning at ≥50 and benefit–risk at ≥90 OME", () => {
      const at49 = rotateOpioid({ fromKey: "morphine-po", fromMgPer24h: 49, toKey: "oxycodone-po", factors: base });
      const at50 = rotateOpioid({ fromKey: "morphine-po", fromMgPer24h: 50, toKey: "oxycodone-po", factors: base });
      const at90 = rotateOpioid({ fromKey: "morphine-po", fromMgPer24h: 90, toKey: "oxycodone-po", factors: base });
      assert.ok(at49 && at50 && at90);
      assert.ok(!at49.warnings.some((w) => w.includes("naloxone")));
      assert.ok(at50.warnings.some((w) => w.includes("50 mg OME") && w.includes("naloxone")));
      assert.ok(at90.warnings.some((w) => w.includes("90 mg OME") && w.includes("naloxone")));
      assert.ok(!at90.warnings.some((w) => w.includes("50 mg OME")));
    });

    it("convert-from-only source and sedative on tray each warn", () => {
      const r = rotateOpioid({ fromKey: "tramadol-po", fromMgPer24h: 200, toKey: "morphine-po", factors: { ...base, sedativeOnTray: true } });
      assert.ok(r);
      assert.ok(r.warnings.some((w) => w.includes("convert-from row only")));
      assert.ok(r.warnings.some((w) => w.includes("CNS depressant")));
      assert.equal(r.crossTolerance.reduction, 0.5);
    });
  });

  describe("fentanyl patch", () => {
    it("59 OME → not tolerant, no patch", () => {
      const p = toFentanylPatch(59);
      assert.equal(p.opioidTolerant, false);
      assert.equal(p.mcgPerH, null);
      assert.ok(p.warnings.some((w) => w.includes("not opioid tolerant")));
    });

    it("band edges", () => {
      assert.equal(toFentanylPatch(60).mcgPerH, 25);
      assert.equal(toFentanylPatch(134).mcgPerH, 25);
      assert.equal(toFentanylPatch(134.5).mcgPerH, 25);
      assert.equal(toFentanylPatch(135).mcgPerH, 50);
      assert.equal(toFentanylPatch(1124).mcgPerH, 300);
    });

    it("1200 OME → above the table", () => {
      const p = toFentanylPatch(1200);
      assert.equal(p.mcgPerH, null);
      assert.equal(p.opioidTolerant, true);
      assert.ok(p.warnings.some((w) => w.includes("Above the label table")));
    });

    it("no further cross-tolerance cut on top of the label table", () => {
      assert.ok(toFentanylPatch(100).steps.some((s) => s.includes("Do not take a further cross-tolerance cut")));
    });

    it("table is contiguous in 90 mg steps", () => {
      for (let i = 1; i < DURAGESIC_TABLE.length; i++) {
        assert.equal(DURAGESIC_TABLE[i].omeLow, DURAGESIC_TABLE[i - 1].omeHigh + 1);
      }
    });

    it("patchToOme uses 2.4 per mcg/h", () => {
      assert.equal(patchToOme(25), 60);
      assert.equal(patchToOme(12), 28.8);
      assert.equal(patchToOme(0), 0);
    });
  });

  describe("methadone", () => {
    const cases: [number, number, number][] = [
      [60, 4, 3],
      [90, 4, 3],
      [91, 8, 3],
      [100, 8, 3],
      [101, 8, 5],
      [400, 12, 10],
      [1200, 12, 20],
    ];
    for (const [ome, rip, ayo] of cases) {
      it(`OME ${ome} → Ripamonti ${rip}:1, Ayonrinde ${ayo}:1`, () => {
        assert.equal(methadoneRatioFor(RIPAMONTI_BANDS, ome).ratio, rip);
        assert.equal(methadoneRatioFor(AYONRINDE_BANDS, ome).ratio, ayo);
      });
    }

    it("60 OME: lowest figure is 15 mg (Ripamonti 4:1), under the cap", () => {
      const m = toMethadone(60);
      assert.ok(m);
      assert.equal(m.ratios[0].mgPer24h, 15);
      assert.equal(m.ratios[1].mgPer24h, 20);
      assert.equal(m.cappedMgPer24h, 15);
      assert.equal(m.perDoseQ8hMg, 5);
    });

    it("the cap never exceeds 40 mg and q8h = cap / 3", () => {
      for (const ome of [60, 200, 400, 800, 1200, 3000]) {
        const m = toMethadone(ome);
        assert.ok(m);
        assert.ok(m.cappedMgPer24h <= METHADONE_START_CAP_MG, `ome ${ome}`);
        assert.equal(m.capMgPer24h, 40);
        assert.equal(m.perDoseQ8hMg, Math.round((m.cappedMgPer24h / 3) * 10) / 10);
      }
      const big = toMethadone(1200);
      assert.ok(big);
      // 1200/12 = 100, 1200/20 = 60 → min 60 → capped 40
      assert.equal(big.cappedMgPer24h, 40);
      assert.equal(big.perDoseQ8hMg, 13.3);
    });

    it("nonpositive OME returns null; warnings name ECG", () => {
      assert.equal(toMethadone(0), null);
      const m = toMethadone(100);
      assert.ok(m);
      assert.ok(m.warnings.some((w) => w.includes("ECG")));
    });
  });

  describe("desk detection", () => {
    it("flags lorazepam and alprazolam as sedatives, not opioids", () => {
      const d = rotationOnDesk(["oxycodone", "lorazepam", "alprazolam"]);
      assert.equal(d.hasOpioid, true);
      assert.deepEqual(d.opioidIds, ["oxycodone"]);
      assert.deepEqual(d.sedativeIds, ["lorazepam", "alprazolam"]);
    });

    it("flags buprenorphine and methadone", () => {
      const d = rotationOnDesk(["buprenorphine", "methadone"]);
      assert.equal(d.hasBuprenorphine, true);
      assert.equal(d.hasMethadone, true);
      assert.deepEqual(d.sedativeIds, []);
      const r = rotationReportOnDesk(["buprenorphine"]);
      assert.ok(r.notes.some((n) => n.includes("partial agonist")));
    });

    it("defaultFromKey picks the first PO row on the tray, else morphine PO", () => {
      assert.equal(defaultFromKey(["oxycodone"]), "oxycodone-po");
      assert.equal(defaultFromKey(["fentanyl"]), "morphine-po");
      assert.equal(defaultFromKey([]), "morphine-po");
    });

    it("factorsFromHost reads age, kidney, eGFR and sedatives", () => {
      const f = factorsFromHost(["morphine", "lorazepam"], { ...DEFAULT_HOST, age: "geriatric", kidney: "ckd" });
      assert.equal(f.geriatric, true);
      assert.equal(f.renalImpairment, true);
      assert.equal(f.sedativeOnTray, true);
      assert.equal(f.reason, "uncontrolled-pain");
      const g = factorsFromHost(["morphine"], { ...DEFAULT_HOST, egfr: 25 });
      assert.equal(g.renalImpairment, true);
      const h = factorsFromHost(["morphine"], DEFAULT_HOST);
      assert.equal(h.geriatric, false);
      assert.equal(h.renalImpairment, false);
      assert.equal(h.sedativeOnTray, false);
    });
  });

  describe("disclaimer and citations", () => {
    it("disclaimer frames teaching, not an order", () => {
      assert.ok(ROTATION_DISCLAIMER.includes("Teaching arithmetic"));
      assert.ok(ROTATION_DISCLAIMER.includes("not a dose or an order"));
    });

    it("citations name McPherson, CDC 2022, Duragesic, Chou, Ripamonti, Ayonrinde", () => {
      for (const s of ["McPherson", "CDC", "Duragesic", "Chou", "Ripamonti", "Ayonrinde"]) {
        assert.ok(ROTATION_CITATIONS.some((c) => c.includes(s)), s);
      }
      const r = rotationReportOnDesk(["morphine"], DEFAULT_HOST);
      assert.equal(r.citations, ROTATION_CITATIONS);
      assert.equal(r.disclaimer, ROTATION_DISCLAIMER);
    });
  });
});
