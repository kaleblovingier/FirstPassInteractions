import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALLERGY_CITATIONS,
  ALLERGY_DISCLAIMER,
  BETA_LACTAMS,
  BETA_LACTAM_BY_ID,
  NARANJO_ITEMS,
  PEN_FAST_ITEMS,
  PEN_FAST_MNEMONIC,
  SCAR_PROFILES,
  SCAR_RECHALLENGE_RULE,
  SULFONAMIDES,
  SULFONAMIDE_NOTE,
  allergyOnDesk,
  allergyReportOnDesk,
  crossReactivity,
  naranjo,
  naranjoBand,
  penFast,
  scarProfilesFor,
  type NaranjoAnswer,
  type PenFastInput,
} from "./drug-allergy";
import { DRUG_BY_ID } from "./catalog";
import { DEFAULT_HOST } from "./types";

const pf = (withinFiveYears: boolean, anaphylaxisOrScar: boolean, treatmentRequired: boolean): PenFastInput => ({
  withinFiveYears,
  anaphylaxisOrScar,
  treatmentRequired,
});

describe("drug allergy teaching engine", () => {
  describe("PEN-FAST", () => {
    const cases: [PenFastInput, number, string][] = [
      [pf(false, false, false), 0, "very-low"],
      [pf(false, false, true), 1, "low"],
      [pf(true, false, false), 2, "low"],
      [pf(true, false, true), 3, "moderate"],
      [pf(true, true, false), 4, "high"],
      [pf(true, true, true), 5, "high"],
    ];
    for (const [input, score, band] of cases) {
      it(`score ${score} → ${band}`, () => {
        const r = penFast(input);
        assert.equal(r.score, score);
        assert.equal(r.band, band);
        assert.equal(r.lowRisk, score < 3);
      });
    }

    it("risk text carries the published percentages", () => {
      assert.ok(penFast(pf(false, false, false)).riskText.includes("under 1%"));
      assert.ok(penFast(pf(true, false, false)).riskText.includes("5%"));
      assert.ok(penFast(pf(true, false, true)).riskText.includes("20%"));
      assert.ok(penFast(pf(true, true, true)).riskText.includes("50%"));
    });

    it("low-risk teaching names PALACE and the amoxicillin challenge; SCAR stays a hard stop", () => {
      const t = penFast(pf(false, false, true)).teaching;
      assert.ok(t.includes("PALACE"));
      assert.ok(t.includes("amoxicillin"));
      assert.ok(t.includes("severe cutaneous"));
    });

    it("items and mnemonic sum to 5 points and spell F, A/S, T", () => {
      assert.equal(PEN_FAST_ITEMS.reduce((s, i) => s + i.points, 0), 5);
      for (const k of ["F =", "A =", "S =", "T ="]) assert.ok(PEN_FAST_MNEMONIC.includes(k), k);
    });
  });

  describe("beta-lactam cross-reactivity", () => {
    it("amoxicillin ↔ cephalexin share an identical R1", () => {
      assert.equal(crossReactivity("amoxicillin", "cephalexin").level, "identical-r1");
      assert.equal(crossReactivity("cephalexin", "amoxicillin").level, "identical-r1");
    });

    it("ceftazidime ↔ aztreonam share an identical R1", () => {
      assert.equal(crossReactivity("ceftazidime", "aztreonam").level, "identical-r1");
      assert.equal(crossReactivity("aztreonam", "ceftazidime").level, "identical-r1");
    });

    it("penicillin ↔ cefazolin is dissimilar", () => {
      const r = crossReactivity("penicillin-g", "cefazolin");
      assert.equal(r.level, "dissimilar");
      assert.ok(r.why.includes("Cefazolin"));
      assert.equal(crossReactivity("amoxicillin", "cefazolin").level, "dissimilar");
    });

    it("ceftriaxone ↔ cefepime identical; cefuroxime ↔ ceftriaxone similar", () => {
      assert.equal(crossReactivity("ceftriaxone", "cefepime").level, "identical-r1");
      assert.equal(crossReactivity("cefuroxime", "ceftriaxone").level, "similar-r1");
    });

    it("same drug", () => {
      assert.equal(crossReactivity("amoxicillin", "amoxicillin").level, "same-drug");
    });

    it("aztreonam does not cross-react with penicillins; carbapenems under 1%", () => {
      assert.equal(crossReactivity("amoxicillin", "aztreonam").level, "dissimilar");
      const c = crossReactivity("penicillin-g", "meropenem");
      assert.equal(c.level, "dissimilar");
      assert.ok(c.why.includes("under 1%"));
    });

    it("two penicillins flag the shared core even with different R1", () => {
      const r = crossReactivity("amoxicillin", "nafcillin");
      assert.equal(r.level, "dissimilar");
      assert.equal(r.coreShared, true);
      assert.equal(crossReactivity("amoxicillin", "cephalexin").coreShared, false);
    });

    it("unknown id is not known", () => {
      assert.equal(crossReactivity("amoxicillin", "warfarin").known, false);
    });

    it("the relation is symmetric", () => {
      for (const a of BETA_LACTAMS) {
        for (const b of BETA_LACTAMS) {
          assert.equal(crossReactivity(a.id, b.id).level, crossReactivity(b.id, a.id).level, `${a.id}/${b.id}`);
        }
      }
    });

    it("ids are unique", () => {
      assert.equal(Object.keys(BETA_LACTAM_BY_ID).length, BETA_LACTAMS.length);
    });
  });

  describe("Naranjo", () => {
    it("has 10 items with the published point values", () => {
      assert.equal(NARANJO_ITEMS.length, 10);
      const expected: [number, number][] = [
        [1, 0], [2, -1], [1, 0], [2, -1], [-1, 2], [-1, 1], [1, 0], [1, 0], [1, 0], [1, 0],
      ];
      NARANJO_ITEMS.forEach((item, i) => {
        assert.equal(item.points.yes, expected[i][0], item.id);
        assert.equal(item.points.no, expected[i][1], item.id);
        assert.equal(item.points.unknown, 0, item.id);
      });
    });

    it("all unknown → 0, doubtful", () => {
      const r = naranjo(Array<NaranjoAnswer>(10).fill("unknown"));
      assert.equal(r.score, 0);
      assert.equal(r.band, "doubtful");
      assert.deepEqual(naranjo([]), { score: 0, band: "doubtful" });
    });

    it("a definite case scores ≥ 9", () => {
      const ans: NaranjoAnswer[] = ["yes", "yes", "yes", "yes", "no", "unknown", "yes", "yes", "yes", "yes"];
      const r = naranjo(ans);
      assert.equal(r.score, 12);
      assert.equal(r.band, "definite");
    });

    it("boundaries: 5 probable, 4 possible", () => {
      // Q2 yes (2) + Q3 yes (1) + Q5 no (2) = 5
      assert.deepEqual(naranjo({ q2: "yes", q3: "yes", q5: "no" }), { score: 5, band: "probable" });
      // Q2 yes (2) + Q5 no (2) = 4
      assert.deepEqual(naranjo({ q2: "yes", q5: "no" }), { score: 4, band: "possible" });
      assert.equal(naranjoBand(9), "definite");
      assert.equal(naranjoBand(8), "probable");
      assert.equal(naranjoBand(1), "possible");
      assert.equal(naranjoBand(-2), "doubtful");
    });

    it("the floor is −4", () => {
      const r = naranjo({ q2: "no", q4: "no", q5: "yes", q6: "yes" });
      assert.equal(r.score, -4);
      assert.equal(r.band, "doubtful");
    });
  });

  describe("SCAR profiles", () => {
    it("covers SJS/TEN, DRESS and AGEP with their latencies", () => {
      const byKey = Object.fromEntries(SCAR_PROFILES.map((p) => [p.key, p]));
      assert.ok(byKey["sjs-ten"].latency.includes("4–28 days"));
      assert.ok(byKey.dress.latency.includes("2–8 weeks"));
      assert.ok(byKey.agep.latency.includes("48 hours"));
      assert.ok(byKey["sjs-ten"].hla.some((h) => h.allele === "HLA-B*15:02"));
      assert.ok(byKey["sjs-ten"].hla.some((h) => h.allele === "HLA-B*58:01"));
      assert.ok(byKey.dress.hla.some((h) => h.allele === "HLA-A*31:01"));
      assert.ok(byKey["sjs-ten"].causalityTool.includes("ALDEN"));
      assert.ok(byKey.dress.causalityTool.includes("RegiSCAR"));
    });

    it("rechallenge rule is absolute", () => {
      assert.ok(SCAR_RECHALLENGE_RULE.includes("absolute contraindication"));
      assert.ok(SCAR_RECHALLENGE_RULE.includes("desensitization"));
    });

    it("scarProfilesFor finds carbamazepine in SJS/TEN and DRESS", () => {
      assert.deepEqual(scarProfilesFor("carbamazepine").map((p) => p.key), ["sjs-ten", "dress"]);
    });
  });

  describe("desk detection", () => {
    it("sorts beta-lactams, SCAR culprits and sulfonamides", () => {
      const d = allergyOnDesk(["amoxicillin", "carbamazepine", "furosemide", "tmp-smx", "warfarin"]);
      assert.equal(d.hasAllergyRelevant, true);
      assert.deepEqual(d.betaLactamIds, ["amoxicillin"]);
      assert.deepEqual(d.scarRiskIds, ["carbamazepine", "tmp-smx"]);
      assert.deepEqual(d.sulfonamideIds, ["furosemide", "tmp-smx"]);
      assert.deepEqual(d.matchedIds, ["amoxicillin", "carbamazepine", "furosemide", "tmp-smx"]);
    });

    it("an unrelated tray finds nothing", () => {
      const d = allergyOnDesk(["warfarin", "metoprolol"]);
      assert.equal(d.hasAllergyRelevant, false);
      assert.deepEqual(d.matchedIds, []);
    });

    it("report notes name identical R1 pairs, HLA links and the sulfonamide teaching", () => {
      const r = allergyReportOnDesk(["ceftazidime", "aztreonam", "carbamazepine", "furosemide"], DEFAULT_HOST);
      assert.ok(r.notes.some((n) => n.includes("Identical R1") && n.includes("Aztreonam")));
      assert.ok(r.notes.some((n) => n.includes("HLA-B*15:02") && n.includes("HLA-A*31:01")));
      assert.ok(r.notes.includes(SULFONAMIDE_NOTE));
      assert.equal(r.citations, ALLERGY_CITATIONS);
      assert.equal(r.disclaimer, ALLERGY_DISCLAIMER);
      assert.deepEqual(allergyReportOnDesk([]).notes, []);
    });
  });

  describe("data integrity", () => {
    it("every referenced id exists in DRUG_BY_ID", () => {
      const ids = [
        ...BETA_LACTAMS.map((b) => b.id),
        ...SCAR_PROFILES.flatMap((p) => p.culpritIds),
        ...SULFONAMIDES.map((s) => s.id),
      ];
      for (const id of ids) assert.ok(DRUG_BY_ID[id], id);
    });

    it("no teaching string says prescribe", () => {
      const strings: string[] = [
        ALLERGY_DISCLAIMER,
        ...ALLERGY_CITATIONS,
        PEN_FAST_MNEMONIC,
        SCAR_RECHALLENGE_RULE,
        SULFONAMIDE_NOTE,
        ...PEN_FAST_ITEMS.map((i) => i.label),
        ...NARANJO_ITEMS.map((i) => i.question),
        ...BETA_LACTAMS.map((b) => b.note ?? ""),
        ...SCAR_PROFILES.flatMap((p) => [p.name, p.latency, p.features, p.causalityTool, ...p.culpritNames, ...p.hla.flatMap((h) => [h.drugs, h.note])]),
      ];
      for (let s = 0; s <= 5; s++) {
        const r = penFast({ withinFiveYears: s >= 2, anaphylaxisOrScar: s >= 4, treatmentRequired: s % 2 === 1 });
        strings.push(r.riskText, r.teaching);
      }
      for (const a of BETA_LACTAMS) for (const b of BETA_LACTAMS) strings.push(crossReactivity(a.id, b.id).why);
      strings.push(...allergyReportOnDesk(["amoxicillin", "cephalexin", "allopurinol", "carbamazepine", "tmp-smx", "hctz"]).notes);
      for (const s of strings) assert.ok(!/prescrib/i.test(s), s);
    });
  });
});
