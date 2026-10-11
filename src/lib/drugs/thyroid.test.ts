import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANTITHYROID_COMPARE,
  ANTITHYROID_IDS,
  OTHER_INDUCER_GROUP_KEY,
  THYROID_CITATIONS,
  THYROID_DISCLAIMER,
  THYROID_EMPTY_NOTE,
  THYROID_GROUPS,
  THYROID_HORMONE_IDS,
  THYROID_MAPPED_IDS,
  THYROID_MECHANISMS,
  THYROID_STOP_NOTE,
  THYROID_WARFARIN_NOTE,
  defaultThyroidContext,
  strongInducerEnzymes,
  thyroidExplain,
  thyroidHits,
  thyroidOnDesk,
  thyroidReportOnDesk,
  thyroidSeparation,
} from "./thyroid";
import { DRUG_BY_ID } from "./catalog";
import { SEPARATION_RULES } from "./separation";
import { DEFAULT_HOST } from "./types";

function collectStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectStrings(x, out));
  return out;
}

const groupOf = (key: string) => THYROID_GROUPS.find((g) => g.key === key);

describe("thyroid teaching engine", () => {
  describe("mechanism buckets", () => {
    it("levothyroxine + calcium routes calcium to absorption", () => {
      const d = thyroidOnDesk(["levothyroxine", "calcium"]);
      assert.equal(d.hasThyroidRelevant, true);
      assert.equal(d.onThyroidHormone, true);
      assert.equal(d.hasAbsorption, true);
      assert.deepEqual(d.byMechanism.absorption, ["calcium"]);
      assert.deepEqual(d.hormoneIds, ["levothyroxine"]);
    });

    it("amiodarone routes to gland and lights the station alone", () => {
      const d = thyroidOnDesk(["amiodarone"]);
      assert.equal(d.hasGland, true);
      assert.deepEqual(d.byMechanism.gland, ["amiodarone"]);
      assert.equal(d.hasThyroidRelevant, true);
    });

    it("a labeled inducer routes to clearance", () => {
      const d = thyroidOnDesk(["levothyroxine", "rifampin"]);
      assert.equal(d.hasClearance, true);
      assert.deepEqual(d.byMechanism.clearance, ["rifampin"]);
      const hit = thyroidHits(["rifampin"]).find((h) => h.id === "rifampin");
      assert.equal(hit?.groupKey, "inducer-labeled");
    });

    it("a strong inducer the label does not name is read from catalog roles", () => {
      assert.ok(strongInducerEnzymes(DRUG_BY_ID["st-johns-wort"]).length > 0);
      const hits = thyroidHits(["levothyroxine", "st-johns-wort"]);
      const sjw = hits.find((h) => h.id === "st-johns-wort");
      assert.equal(sjw?.mechanism, "clearance");
      assert.equal(sjw?.groupKey, OTHER_INDUCER_GROUP_KEY);
      assert.match(sjw?.what ?? "", /CYP3A4/);
      // Labeled inducers are not double-counted as "other".
      assert.equal(thyroidHits(["rifampin"]).filter((h) => h.groupKey === OTHER_INDUCER_GROUP_KEY).length, 0);
    });

    it("a weak or non-inducer is not pulled into clearance", () => {
      assert.equal(thyroidOnDesk(["levothyroxine", "modafinil"]).hasClearance, false);
    });

    it("binding: oral estrogen raises TBG", () => {
      const d = thyroidOnDesk(["levothyroxine", "ethinyl-estradiol"]);
      assert.equal(d.hasBinding, true);
      assert.deepEqual(d.byMechanism.binding, ["ethinyl-estradiol"]);
      assert.equal(thyroidOnDesk(["estradiol-patch"]).hasBinding, false);
    });

    it("pituitary: octreotide and bexarotene", () => {
      const d = thyroidOnDesk(["octreotide", "bexarotene"]);
      assert.equal(d.hasPituitary, true);
      assert.deepEqual(d.byMechanism.pituitary.sort(), ["bexarotene", "octreotide"]);
      assert.equal(d.hasThyroidRelevant, true);
    });

    it("assay: biotin lights the station; heparin is filed but quiet alone", () => {
      const b = thyroidOnDesk(["biotin"]);
      assert.equal(b.hasAssay, true);
      assert.equal(b.hasThyroidRelevant, true);
      const h = thyroidOnDesk(["heparin"]);
      assert.equal(h.hasAssay, true);
      assert.equal(h.hasAnyMapped, true);
      assert.equal(h.hasThyroidRelevant, false);
    });

    it("antithyroid: methimazole and PTU", () => {
      const d = thyroidOnDesk(["methimazole", "propylthiouracil"]);
      assert.equal(d.onAntithyroid, true);
      assert.deepEqual(d.antithyroidIds, ["methimazole", "propylthiouracil"]);
      assert.deepEqual(d.byMechanism.antithyroid, ["methimazole", "propylthiouracil"]);
      assert.equal(d.hasThyroidRelevant, true);
    });

    it("a drug can sit in two buckets when both are real (mitotane: TBG and induction)", () => {
      const d = thyroidOnDesk(["mitotane"]);
      assert.ok(d.byMechanism.binding.includes("mitotane"));
      assert.ok(d.byMechanism.clearance.includes("mitotane"));
    });
  });

  describe("quiet and empty trays", () => {
    it("empty tray: nothing flagged", () => {
      const d = thyroidOnDesk([]);
      assert.equal(d.hasThyroidRelevant, false);
      assert.equal(d.hasAnyMapped, false);
      assert.deepEqual(d.matchedIds, []);
      for (const m of THYROID_MECHANISMS) assert.deepEqual(d.byMechanism[m.key], []);
      const r = thyroidReportOnDesk([]);
      assert.equal(r.context, "untreated");
      assert.equal(r.separation, null);
      assert.equal(r.antithyroid, null);
      assert.deepEqual(r.notes, []);
      assert.equal(r.map.length, THYROID_MECHANISMS.length);
      assert.ok(r.map.every((row) => row.hits.length === 0));
    });

    it("a drug in no bucket is not flagged", () => {
      const d = thyroidOnDesk(["acetaminophen", "apixaban"]);
      assert.equal(d.hasThyroidRelevant, false);
      assert.equal(d.hasAnyMapped, false);
      assert.deepEqual(thyroidHits(["acetaminophen"]), []);
    });

    it("unknown ids are ignored", () => {
      assert.equal(thyroidOnDesk(["not-a-drug"]).hasAnyMapped, false);
    });

    it("absorption drug without thyroid hormone is filed but does not light the station", () => {
      const d = thyroidOnDesk(["calcium", "omeprazole"]);
      assert.equal(d.hasAbsorption, true);
      assert.equal(d.hasThyroidRelevant, false);
      const r = thyroidReportOnDesk(["calcium", "omeprazole"]);
      assert.ok(r.notes.some((n) => /No thyroid hormone is on the tray/.test(n)));
    });

    it("explain: empty result says it is not a green light", () => {
      const e = thyroidExplain(["acetaminophen"], "treated", "tsh-up");
      assert.equal(e.empty, true);
      assert.equal(e.emptyNote, THYROID_EMPTY_NOTE.treated);
      assert.match(e.emptyNote ?? "", /not a green light/);
      const u = thyroidExplain([], "untreated", "all");
      assert.match(u.emptyNote ?? "", /not a green light/);
    });
  });

  describe("treated vs untreated", () => {
    it("default context follows the tray", () => {
      assert.equal(defaultThyroidContext(["levothyroxine"]), "treated");
      assert.equal(defaultThyroidContext(["liothyronine"]), "treated");
      assert.equal(defaultThyroidContext(["amiodarone"]), "untreated");
    });

    it("TSH up on stable levothyroxine: absorption, clearance, binding, gland all answer", () => {
      const ids = ["levothyroxine", "calcium", "rifampin", "ethinyl-estradiol", "lithium", "biotin"];
      const e = thyroidExplain(ids, "treated", "tsh-up");
      assert.deepEqual(
        e.groups.map((g) => g.mechanism),
        ["absorption", "clearance", "binding", "gland"],
      );
      assert.ok(!e.matchedIds.includes("biotin"), "biotin lowers TSH, it does not raise it");
      assert.equal(e.empty, false);
      assert.equal(e.emptyNote, null);
    });

    it("an intact gland compensates for absorption and clearance", () => {
      const e = thyroidExplain(["calcium", "rifampin", "omeprazole"], "untreated", "tsh-up");
      assert.equal(e.empty, true);
    });

    it("TBG change: TSH moves only on levothyroxine; total T4 moves in both", () => {
      assert.ok(thyroidExplain(["estradiol-oral"], "treated", "tsh-up").matchedIds.includes("estradiol-oral"));
      assert.ok(!thyroidExplain(["estradiol-oral"], "untreated", "tsh-up").matchedIds.includes("estradiol-oral"));
      assert.ok(thyroidExplain(["estradiol-oral"], "untreated", "t4-odd").matchedIds.includes("estradiol-oral"));
    });

    it("low TSH that looks hyperthyroid: pituitary, assay, and gland", () => {
      const e = thyroidExplain(["dexamethasone", "biotin", "amiodarone", "calcium"], "untreated", "tsh-down");
      assert.deepEqual(
        e.groups.map((g) => g.mechanism),
        ["gland", "pituitary", "assay"],
      );
    });

    it("pattern 'all' returns every mapped drug active in that context", () => {
      const e = thyroidExplain(["levothyroxine", "calcium", "heparin"], "treated", "all");
      assert.deepEqual(e.matchedIds.sort(), ["calcium", "heparin"]);
      assert.equal(e.question, "Every mechanism on the tray");
    });
  });

  describe("reuse of the Separate station", () => {
    it("levothyroxine spacing comes word for word from separation.ts", () => {
      const rule = SEPARATION_RULES.find((r) => r.victimId === "levothyroxine");
      assert.ok(rule);
      const s = thyroidSeparation(["levothyroxine", "calcium", "cholestyramine"]);
      assert.equal(s?.apart, rule.apart);
      assert.equal(s?.source, rule.source);
      assert.deepEqual(s?.bindersOnTray.map((b) => b.id).sort(), ["calcium", "cholestyramine"]);
      assert.equal(thyroidSeparation(["calcium"]), null);
    });

    it("every Separate-station levothyroxine binder is filed under absorption", () => {
      const rule = SEPARATION_RULES.find((r) => r.victimId === "levothyroxine");
      const absorption = new Set(THYROID_GROUPS.filter((g) => g.mechanism === "absorption").flatMap((g) => g.ids));
      for (const id of rule?.binderIds ?? []) assert.ok(absorption.has(id), id);
    });

    it("report points absorption hits at the Separate station", () => {
      const r = thyroidReportOnDesk(["levothyroxine", "calcium"]);
      assert.ok(r.separation);
      assert.ok(r.notes.some((n) => /Separate station/.test(n)));
      assert.ok(r.notes.includes(THYROID_STOP_NOTE));
    });
  });

  describe("report", () => {
    it("is JSON-serializable and carries citations and disclaimer", () => {
      const r = thyroidReportOnDesk(["levothyroxine", "calcium", "amiodarone", "methimazole", "warfarin"], DEFAULT_HOST);
      assert.deepEqual(JSON.parse(JSON.stringify(r)), r);
      assert.equal(r.disclaimer, THYROID_DISCLAIMER);
      assert.equal(r.citations, THYROID_CITATIONS);
      assert.equal(r.context, "treated");
      assert.equal(r.antithyroid, ANTITHYROID_COMPARE);
      assert.ok(r.notes.includes(THYROID_WARFARIN_NOTE));
    });

    it("context can be overridden", () => {
      const r = thyroidReportOnDesk(["levothyroxine"], undefined, "untreated");
      assert.equal(r.context, "untreated");
      assert.equal(r.map[0].inContext, THYROID_MECHANISMS[0].untreated);
    });

    it("host flags: pregnancy with a thionamide, pregnancy on levothyroxine, older adult, CKD binders", () => {
      const preg = thyroidReportOnDesk(["propylthiouracil"], { ...DEFAULT_HOST, preg: "pregnant" });
      assert.ok(preg.notes.some((n) => /16 weeks/.test(n)));
      const pregLevo = thyroidReportOnDesk(["levothyroxine"], { ...DEFAULT_HOST, preg: "pregnant" });
      assert.ok(pregLevo.notes.some((n) => /raises levothyroxine needs/.test(n)));
      const old = thyroidReportOnDesk(["levothyroxine"], { ...DEFAULT_HOST, age: "geriatric" });
      assert.ok(old.notes.some((n) => /Older adult/.test(n)));
      const ckd = thyroidReportOnDesk(["levothyroxine", "sevelamer"], { ...DEFAULT_HOST, kidney: "ckd" });
      assert.ok(ckd.notes.some((n) => /phosphate binders/.test(n)));
    });

    it("biotin and heparin notes name the assay, not the thyroid", () => {
      const r = thyroidReportOnDesk(["biotin", "enoxaparin"]);
      assert.ok(r.notes.some((n) => /assay/.test(n)));
      assert.ok(r.notes.some((n) => /artifact/.test(n)));
    });
  });

  describe("citations and catalog", () => {
    it("cites the anchor sources", () => {
      for (const needle of [
        "Synthroid",
        "Thyroid 2014;24(12):1670",
        "Thyroid 2017;27(3):315",
        "Thyroid 2016;26(10):1343",
        "Eur Thyroid J 2018;7(2):55",
        "Biotin",
        "Propylthiouracil",
      ]) {
        assert.ok(THYROID_CITATIONS.some((c) => c.includes(needle)), needle);
      }
    });

    it("every mapped id exists in the catalog", () => {
      for (const id of [...THYROID_MAPPED_IDS, ...THYROID_HORMONE_IDS, ...ANTITHYROID_IDS]) assert.ok(DRUG_BY_ID[id], id);
      for (const id of ["levothyroxine", "liothyronine", "methimazole", "propylthiouracil", "amiodarone", "lithium", "calcium", "sevelamer", "omeprazole", "rifampin", "carbamazepine", "estradiol-oral", "ethinyl-estradiol", "biotin", "heparin", "octreotide"]) {
        assert.ok(THYROID_MAPPED_IDS.includes(id) || THYROID_HORMONE_IDS.includes(id), id);
      }
    });

    it("groups are well formed", () => {
      for (const g of THYROID_GROUPS) {
        assert.ok(g.ids.length > 0, g.key);
        assert.ok(g.what.length > 20, g.key);
        assert.ok(groupOf(g.key), g.key);
      }
    });

    it("no string says prescribe", () => {
      const strings = collectStrings([
        THYROID_DISCLAIMER,
        THYROID_CITATIONS,
        THYROID_MECHANISMS,
        THYROID_GROUPS,
        ANTITHYROID_COMPARE,
        thyroidReportOnDesk(
          ["levothyroxine", "calcium", "rifampin", "st-johns-wort", "ethinyl-estradiol", "amiodarone", "octreotide", "biotin", "heparin", "methimazole", "warfarin", "digoxin"],
          { ...DEFAULT_HOST, preg: "pregnant", age: "geriatric", kidney: "ckd" },
        ),
        thyroidExplain(["calcium"], "untreated", "tsh-up"),
      ]);
      assert.ok(strings.length > 100);
      for (const s of strings) assert.ok(!/prescribe/i.test(s), s);
    });
  });
});
