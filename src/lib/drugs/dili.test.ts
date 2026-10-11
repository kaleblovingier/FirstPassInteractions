import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DILI_CITATIONS,
  DILI_DISCLAIMER,
  DILI_DRUG_NOTES,
  HYS_LAW_TEACHING,
  RUCAM_DEFAULTS,
  RUCAM_DOMAINS,
  RUCAM_GROUP_I,
  diliCardsOnDesk,
  diliOnDesk,
  diliReportOnDesk,
  hysLaw,
  meetsDiliThreshold,
  newRRatio,
  rRatio,
  rucam,
  rucamBand,
  rucamOptions,
  type RucamAnswers,
} from "./dili";
import * as dili from "./dili";
import { DRUG_BY_ID } from "./catalog";
import { DEFAULT_HOST } from "./types";

const ULN = { altUln: 40, astUln: 40, alpUln: 120, tbiliUln: 1.2 };

describe("DILI teaching engine", () => {
  describe("R ratio", () => {
    it("R = 5.0 is hepatocellular", () => {
      const r = rRatio({ alt: 200, altUln: 40, alp: 120, alpUln: 120 });
      assert.equal(r.r, 5);
      assert.equal(r.pattern, "hepatocellular");
    });

    it("R = 2.0 is cholestatic", () => {
      const r = rRatio({ alt: 80, altUln: 40, alp: 120, alpUln: 120 });
      assert.equal(r.r, 2);
      assert.equal(r.pattern, "cholestatic");
    });

    it("R = 3 is mixed", () => {
      const r = rRatio({ alt: 120, altUln: 40, alp: 120, alpUln: 120 });
      assert.equal(r.r, 3);
      assert.equal(r.pattern, "mixed");
    });

    it("nR uses the higher of ALT and AST", () => {
      const lowAlt = { alt: 80, altUln: 40, ast: 240, astUln: 40, alp: 120, alpUln: 120 };
      assert.equal(rRatio(lowAlt).pattern, "cholestatic");
      const n = newRRatio(lowAlt);
      assert.equal(n.r, 6);
      assert.equal(n.pattern, "hepatocellular");
      const highAlt = newRRatio({ ...lowAlt, alt: 400, ast: 40 });
      assert.equal(highAlt.r, 10);
    });
  });

  describe("case definition (Aithal 2011)", () => {
    it("ALT 5× ULN meets it", () => {
      assert.equal(meetsDiliThreshold({ alt: 200, alp: 100, tbili: 0.8, ...ULN }).met, true);
    });
    it("ALT 4× ULN with normal bilirubin does not", () => {
      assert.equal(meetsDiliThreshold({ alt: 160, alp: 100, tbili: 0.8, ...ULN }).met, false);
    });
    it("ALP 2× ULN meets it unless the source is bone", () => {
      assert.equal(meetsDiliThreshold({ alt: 40, alp: 240, tbili: 0.8, ...ULN }).met, true);
      assert.equal(meetsDiliThreshold({ alt: 40, alp: 240, tbili: 0.8, boneCause: true, ...ULN }).met, false);
    });
    it("ALT 3× ULN with bilirubin over 2× ULN meets it", () => {
      const r = meetsDiliThreshold({ alt: 120, alp: 100, tbili: 3, ...ULN });
      assert.equal(r.met, true);
      assert.equal(r.criteria.altThreeBiliTwo, true);
      assert.equal(r.criteria.altFive, false);
    });
  });

  describe("Hy's law", () => {
    it("positive: ALT 10×, bilirubin 3×, ALP normal", () => {
      const h = hysLaw({ alt: 400, ast: 300, alp: 130, tbili: 3.6, ...ULN });
      assert.equal(h.met, true);
      assert.deepEqual(h.components, { aminotransferase: true, bilirubin: true, noCholestasis: true });
      assert.equal(h.teaching, HYS_LAW_TEACHING);
      assert.ok(h.teaching.includes("10%"));
    });
    it("AST alone above 3× counts", () => {
      assert.equal(hysLaw({ alt: 100, ast: 200, alp: 130, tbili: 3.6, ...ULN }).met, true);
    });
    it("negative: ALP at 2× ULN fails the no-cholestasis arm", () => {
      const h = hysLaw({ alt: 400, ast: 300, alp: 240, tbili: 3.6, ...ULN });
      assert.equal(h.met, false);
      assert.equal(h.components.noCholestasis, false);
    });
    it("negative: bilirubin exactly 2× ULN is not over 2×", () => {
      assert.equal(hysLaw({ alt: 400, ast: 300, alp: 130, tbili: 2.4, ...ULN }).met, false);
    });
  });

  describe("RUCAM", () => {
    it("every domain has options for both tables and covers domains 1–7", () => {
      const nums = new Set(RUCAM_DOMAINS.map((d) => d.domain));
      assert.deepEqual([...nums].sort(), [1, 2, 3, 4, 5, 6, 7]);
      for (const d of RUCAM_DOMAINS) {
        assert.ok(d.options.hepatocellular.length > 0, d.key);
        assert.ok(d.options.cholestatic.length > 0, d.key);
        assert.ok(d.options.cholestatic.some((o) => o.value === RUCAM_DEFAULTS[d.key]), `${d.key} default (cholestatic)`);
        assert.ok(d.options.hepatocellular.some((o) => o.value === RUCAM_DEFAULTS[d.key]), `${d.key} default (hepatocellular)`);
      }
      assert.equal(RUCAM_GROUP_I.length, 7);
    });

    it("max hepatocellular score is 14, max cholestatic is 13", () => {
      const max = (t: "hepatocellular" | "cholestatic") =>
        RUCAM_DOMAINS.reduce((s, d) => s + Math.max(...d.options[t].map((o) => o.points)), 0);
      assert.equal(max("hepatocellular"), 14);
      assert.equal(max("cholestatic"), 13);
    });

    it("textbook hepatocellular case reaches highly probable", () => {
      const a: RucamAnswers = {
        onset: "5to90", // +2
        course: "drop50in8", // +3
        alcohol: "no",
        age: "55plus", // +1
        concomitant: "none",
        alternatives: "allRuledOut", // +2
        previous: "labelled", // +2
        reexposure: "other",
      };
      const r = rucam("hepatocellular", a);
      assert.equal(r.total, 10);
      assert.equal(r.band, "highly probable");
      assert.equal(r.perDomain.length, RUCAM_DOMAINS.length);
    });

    it("another cause and a guilty co-drug reach excluded", () => {
      const r = rucam("hepatocellular", {
        onset: "under5orOver90", // +1
        course: "lessThan50after30", // −2
        alcohol: "no",
        age: "under55",
        concomitant: "evidence", // −3
        alternatives: "highlyProbable", // −3
        previous: "unknown",
        reexposure: "other",
      });
      assert.equal(r.total, -7);
      assert.equal(r.band, "excluded");
    });

    it("incompatible timing excludes regardless of the sum", () => {
      const r = rucam("hepatocellular", { ...RUCAM_DEFAULTS, onset: "incompatible", course: "drop50in8", previous: "labelled", alternatives: "allRuledOut" });
      assert.ok(r.total > 0);
      assert.equal(r.timingExcludes, true);
      assert.equal(r.band, "excluded");
    });

    it("mixed scores on the cholestatic table", () => {
      const a: RucamAnswers = { ...RUCAM_DEFAULTS, course: "drop50in180" };
      const r = rucam("mixed", a);
      assert.equal(r.table, "cholestatic");
      assert.equal(r.total, 2 + 2);
      assert.deepEqual(rucamOptions("course", "mixed"), rucamOptions("course", "cholestatic"));
      // A hepatocellular-only answer scores 0 on the cholestatic table.
      assert.equal(rucam("cholestatic", { ...RUCAM_DEFAULTS, course: "drop50in8" }).total, 2);
    });

    it("band boundaries", () => {
      assert.equal(rucamBand(-3), "excluded");
      assert.equal(rucamBand(0), "excluded");
      assert.equal(rucamBand(1), "unlikely");
      assert.equal(rucamBand(2), "unlikely");
      assert.equal(rucamBand(3), "possible");
      assert.equal(rucamBand(5), "possible");
      assert.equal(rucamBand(6), "probable");
      assert.equal(rucamBand(8), "probable");
      assert.equal(rucamBand(9), "highly probable");
      assert.equal(rucamBand(14), "highly probable");
    });
  });

  describe("desk detection", () => {
    it("empty tray finds nothing", () => {
      assert.deepEqual(diliOnDesk([]), { hasHepatotoxic: false, matchedIds: [], topCategory: null });
    });

    it("acetaminophen plus metformin: A is top, metformin E is matched but not the driver", () => {
      const d = diliOnDesk(["metformin", "acetaminophen"]);
      assert.equal(d.hasHepatotoxic, true);
      assert.deepEqual(d.matchedIds, ["metformin", "acetaminophen"]);
      assert.equal(d.topCategory, "A");
    });

    it("metformin alone is category E and not hepatotoxic", () => {
      const d = diliOnDesk(["metformin"]);
      assert.equal(d.hasHepatotoxic, false);
      assert.equal(d.topCategory, "E");
    });

    it("amox-clav, nitrofurantoin and divalproex are picked up", () => {
      const d = diliOnDesk(["amox-clav", "nitrofurantoin", "divalproex"]);
      assert.deepEqual(d.matchedIds, ["amox-clav", "nitrofurantoin", "divalproex"]);
      assert.equal(d.topCategory, "A");
      assert.equal(diliCardsOnDesk(["divalproex"])[0].livertoxKey, "valproate");
    });

    it("report notes classic agents and the stacked-hepatotoxin warning", () => {
      const r = diliReportOnDesk(["acetaminophen", "isoniazid", "atorvastatin"], { ...DEFAULT_HOST, age: "geriatric", alcohol: "chronic" });
      assert.ok(r.notes.includes(DILI_DRUG_NOTES.acetaminophen));
      assert.ok(r.notes.includes(DILI_DRUG_NOTES.isoniazid));
      assert.ok(r.notes.includes(DILI_DRUG_NOTES.statin));
      assert.ok(r.notes.some((n) => n.startsWith("More than one")));
      assert.ok(r.notes.some((n) => n.includes("Alcohol")));
      assert.ok(r.notes.some((n) => n.includes("55")));
      assert.equal(r.citations, DILI_CITATIONS);
      assert.equal(r.disclaimer, DILI_DISCLAIMER);
    });

    it("rosuvastatin alone still gets the statin note", () => {
      assert.deepEqual(diliReportOnDesk(["rosuvastatin"]).notes, [DILI_DRUG_NOTES.statin]);
    });

    it("a quiet tray has no notes", () => {
      assert.deepEqual(diliReportOnDesk(["lisinopril"], DEFAULT_HOST).notes, []);
    });
  });

  describe("catalog and copy", () => {
    it("every referenced id is in the catalog", () => {
      const ids = [
        "acetaminophen",
        "amox-clav",
        "isoniazid",
        "valproate",
        "divalproex",
        "valproate-iv",
        "valproate-sprinkle",
        "methotrexate",
        "amiodarone",
        "nitrofurantoin",
        "atorvastatin",
        "simvastatin",
        "lovastatin",
        "rosuvastatin",
        "pravastatin",
        "fluvastatin",
        "pitavastatin",
        "simvastatin-ezetimibe",
        "atorvastatin-amlodipine",
        "rosuvastatin-ezetimibe",
        "metformin",
        "lisinopril",
        ...Object.keys(DILI_DRUG_NOTES).filter((k) => k !== "statin"),
      ];
      for (const id of ids) assert.ok(DRUG_BY_ID[id], id);
    });

    it("citations include ACG 2021, Danan, Temple, FDA 2009, Björnsson, Aithal", () => {
      for (const s of ["Chalasani", "Danan", "Temple", "FDA", "Björnsson", "Aithal"]) {
        assert.ok(DILI_CITATIONS.some((c) => c.includes(s)), s);
      }
    });

    it("no string says prescribe", () => {
      const strings: string[] = [];
      const walk = (v: unknown) => {
        if (typeof v === "string") strings.push(v);
        else if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") Object.values(v).forEach(walk);
      };
      walk(Object.values(dili).filter((v) => typeof v !== "function"));
      walk(diliReportOnDesk(["acetaminophen", "amox-clav", "isoniazid", "valproate", "methotrexate", "amiodarone", "nitrofurantoin", "simvastatin"], { ...DEFAULT_HOST, alcohol: "chronic", age: "geriatric" }));
      walk(hysLaw({ alt: 400, ast: 300, alp: 130, tbili: 3.6, ...ULN }));
      assert.ok(strings.length > 50);
      for (const s of strings) assert.ok(!/prescrib/i.test(s), s);
    });
  });
});
