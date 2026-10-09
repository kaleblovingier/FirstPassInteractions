import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AF_CITATIONS,
  AF_DISCLAIMER,
  AF_DOAC_IDS,
  AF_RATE_RHYTHM_IDS,
  AUGUSTUS_NOTE,
  EDOXABAN_HIGH_CRCL_NOTE,
  FEMALE_SEX_NOTE,
  P2Y12_IDS,
  VKA_IDS,
  afDoacDosing,
  afOnDesk,
  afReportOnDesk,
  cha2ds2Va,
  chads2Vasc,
  hasBled,
  trayBleedModifiers,
  type BleedRiskInput,
  type StrokeRiskInput,
} from "./af-stroke-bleed";
import { DRUG_BY_ID } from "./catalog";
import { DOAC_IDS, evaluateDoacRenal } from "./doac";
import { DEFAULT_HOST } from "./types";

const none: StrokeRiskInput = {
  ageYears: 50,
  sex: "male",
  chf: false,
  hypertension: false,
  diabetes: false,
  strokeTia: false,
  vascular: false,
};

const all: StrokeRiskInput = { ageYears: 80, sex: "female", chf: true, hypertension: true, diabetes: true, strokeTia: true, vascular: true };

const noBleed: BleedRiskInput = {
  uncontrolledHtn: false,
  abnormalRenal: false,
  abnormalLiver: false,
  stroke: false,
  bleeding: false,
  labileInr: false,
  onVka: false,
  ageYears: 50,
  antiplateletOrNsaid: false,
  alcohol: false,
};

const allBleed: BleedRiskInput = {
  uncontrolledHtn: true,
  abnormalRenal: true,
  abnormalLiver: true,
  stroke: true,
  bleeding: true,
  labileInr: true,
  onVka: true,
  ageYears: 70,
  antiplateletOrNsaid: true,
  alcohol: true,
};

function collectStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectStrings(x, out));
  return out;
}

describe("AF stroke and bleed teaching engine", () => {
  describe("CHA2DS2-VASc", () => {
    it("75-year-old woman with hypertension scores 4", () => {
      const r = chads2Vasc({ ...none, ageYears: 75, sex: "female", hypertension: true });
      assert.equal(r.score, 4);
      assert.equal(r.tier, "recommended");
    });

    it("66-year-old man with no other factors scores 1", () => {
      const r = chads2Vasc({ ...none, ageYears: 66 });
      assert.equal(r.score, 1);
      assert.equal(r.tier, "reasonable");
    });

    it("maximum is 9 and age counts once", () => {
      const r = chads2Vasc(all);
      assert.equal(r.score, 9);
      assert.equal(r.max, 9);
      assert.equal(r.items.filter((i) => i.key.startsWith("age") && i.met).length, 1);
    });

    it("age bands: 64 → 0, 65 → 1, 74 → 1, 75 → 2", () => {
      assert.equal(chads2Vasc({ ...none, ageYears: 64 }).score, 0);
      assert.equal(chads2Vasc({ ...none, ageYears: 65 }).score, 1);
      assert.equal(chads2Vasc({ ...none, ageYears: 74 }).score, 1);
      assert.equal(chads2Vasc({ ...none, ageYears: 75 }).score, 2);
    });

    it("thresholds by sex: men 0/1/2, women 1/2/3", () => {
      assert.equal(chads2Vasc({ ...none }).tier, "not-recommended");
      assert.equal(chads2Vasc({ ...none, hypertension: true }).tier, "reasonable");
      assert.equal(chads2Vasc({ ...none, hypertension: true, diabetes: true }).tier, "recommended");

      const f = { ...none, sex: "female" as const };
      assert.equal(chads2Vasc(f).score, 1);
      assert.equal(chads2Vasc(f).tier, "not-recommended");
      assert.equal(chads2Vasc({ ...f, hypertension: true }).score, 2);
      assert.equal(chads2Vasc({ ...f, hypertension: true }).tier, "reasonable");
      assert.equal(chads2Vasc({ ...f, hypertension: true, diabetes: true }).score, 3);
      assert.equal(chads2Vasc({ ...f, hypertension: true, diabetes: true }).tier, "recommended");
    });

    it("prior stroke alone is 2 points and anticoagulation is recommended", () => {
      const r = chads2Vasc({ ...none, strokeTia: true });
      assert.equal(r.score, 2);
      assert.equal(r.tier, "recommended");
    });

    it("frames female sex as a modifier", () => {
      const r = chads2Vasc({ ...none, sex: "female" });
      assert.ok(r.notes.includes(FEMALE_SEX_NOTE));
      assert.match(FEMALE_SEX_NOTE, /modifier/);
      assert.match(FEMALE_SEX_NOTE, /not a standalone/);
    });
  });

  describe("CHA2DS2-VA", () => {
    it("drops sex: same patient scores one less for a woman, same for a man", () => {
      const f = { ...none, ageYears: 75, sex: "female" as const, hypertension: true };
      assert.equal(cha2ds2Va(f).score, chads2Vasc(f).score - 1);
      const m = { ...f, sex: "male" as const };
      assert.equal(cha2ds2Va(m).score, chads2Vasc(m).score);
      assert.equal(cha2ds2Va(f).score, cha2ds2Va(m).score);
      assert.ok(!cha2ds2Va(f).items.some((i) => i.key === "sex"));
    });

    it("maximum is 8", () => {
      const r = cha2ds2Va(all);
      assert.equal(r.score, 8);
      assert.equal(r.max, 8);
    });

    it("ESC 2024 tiers: 0 not, 1 consider, ≥2 recommended", () => {
      assert.equal(cha2ds2Va(none).tier, "not-recommended");
      assert.equal(cha2ds2Va({ ...none, diabetes: true }).tier, "consider");
      assert.equal(cha2ds2Va({ ...none, diabetes: true, vascular: true }).tier, "recommended");
    });
  });

  describe("HAS-BLED", () => {
    it("maximum is 9", () => {
      const r = hasBled(allBleed);
      assert.equal(r.score, 9);
      assert.equal(r.max, 9);
    });

    it("labile INR counts only on a VKA", () => {
      assert.equal(hasBled({ ...noBleed, labileInr: true, onVka: false }).score, 0);
      assert.equal(hasBled({ ...noBleed, labileInr: true, onVka: true }).score, 1);
      assert.equal(hasBled({ ...allBleed, onVka: false }).score, 8);
      assert.ok(hasBled({ ...noBleed, labileInr: true }).notes.some((n) => /vitamin K antagonist/.test(n)));
    });

    it("elderly means over 65", () => {
      assert.equal(hasBled({ ...noBleed, ageYears: 65 }).score, 0);
      assert.equal(hasBled({ ...noBleed, ageYears: 66 }).score, 1);
    });

    it("renal and liver count separately, drugs and alcohol count separately", () => {
      assert.equal(hasBled({ ...noBleed, abnormalRenal: true, abnormalLiver: true }).score, 2);
      assert.equal(hasBled({ ...noBleed, antiplateletOrNsaid: true, alcohol: true }).score, 2);
    });

    it("≥3 is high risk and the message refuses to treat it as a reason to withhold", () => {
      const r = hasBled({ ...noBleed, uncontrolledHtn: true, ageYears: 70, antiplateletOrNsaid: true });
      assert.equal(r.score, 3);
      assert.equal(r.highRisk, true);
      assert.match(r.message, /not, by itself, a reason to withhold/);
      assert.equal(hasBled({ ...noBleed, uncontrolledHtn: true, ageYears: 70 }).highRisk, false);
    });

    it("lists modifiable items that are met, never age or stroke", () => {
      const r = hasBled({ ...noBleed, uncontrolledHtn: true, ageYears: 80, stroke: true, alcohol: true });
      const keys = r.modifiableMet.map((i) => i.key);
      assert.deepEqual(keys.sort(), ["alcohol", "htn"]);
      for (const i of r.items) {
        if (i.key === "elderly" || i.key === "stroke") assert.equal(i.modifiability, "fixed");
      }
    });
  });

  describe("trayBleedModifiers", () => {
    it("detects aspirin + clopidogrel + apixaban as triple therapy", () => {
      const t = trayBleedModifiers(["aspirin", "clopidogrel", "apixaban"]);
      assert.deepEqual(t.antiplateletIds, ["aspirin", "clopidogrel"]);
      assert.deepEqual(t.p2y12Ids, ["clopidogrel"]);
      assert.deepEqual(t.anticoagulantIds, ["apixaban"]);
      assert.equal(t.autoFill.antiplateletOrNsaid, true);
      assert.equal(t.autoFill.onVka, false);
      assert.equal(t.tripleTherapy, true);
      assert.ok(t.tripleTherapyNote?.includes("AUGUSTUS"));
      assert.match(AUGUSTUS_NOTE, /without aspirin/);
    });

    it("anticoagulant + P2Y12 only is combined, not triple", () => {
      const t = trayBleedModifiers(["clopidogrel", "apixaban"]);
      assert.equal(t.tripleTherapy, false);
      assert.equal(t.combinedTherapy, true);
      assert.ok(t.tripleTherapyNote);
    });

    it("NSAIDs fill D, SSRIs are noted but do not fill D", () => {
      const n = trayBleedModifiers(["ibuprofen", "warfarin"]);
      assert.deepEqual(n.nsaidIds, ["ibuprofen"]);
      assert.equal(n.autoFill.antiplateletOrNsaid, true);
      assert.equal(n.autoFill.onVka, true);

      const s = trayBleedModifiers(["sertraline", "rivaroxaban"]);
      assert.deepEqual(s.ssriSnriIds, ["sertraline"]);
      assert.equal(s.autoFill.antiplateletOrNsaid, false);
      assert.ok(s.notes.some((x) => /serotonin/.test(x)));
    });

    it("empty tray fills nothing", () => {
      const t = trayBleedModifiers([]);
      assert.equal(t.autoFill.antiplateletOrNsaid, false);
      assert.equal(t.tripleTherapyNote, null);
    });
  });

  describe("afDoacDosing", () => {
    it("returns a rail for each DOAC and matches doac.ts", () => {
      const d = afDoacDosing({ ageYears: 70, weightKg: 80, scrMgDl: 1.0, sex: "male" });
      assert.ok(d.crcl);
      assert.equal(d.crcl.crcl, 78);
      assert.deepEqual(
        d.rows.map((r) => r.agentId).sort(),
        ["apixaban", "dabigatran", "edoxaban", "rivaroxaban"],
      );
      for (const r of d.rows) {
        assert.deepEqual(r.rail, evaluateDoacRenal(r.agentId, 78, 80, "nvaf"));
      }
      assert.ok(d.rows.find((r) => r.agentId === "apixaban")?.abc);
      assert.ok(d.notes.some((n) => n.includes(EDOXABAN_HIGH_CRCL_NOTE)));
    });

    it("high CrCl surfaces the edoxaban boxed warning from doac.ts", () => {
      const d = afDoacDosing({ ageYears: 30, weightKg: 90, scrMgDl: 0.7, sex: "male" });
      const edox = d.rows.find((r) => r.agentId === "edoxaban");
      assert.equal(edox?.rail.status, "black-box");
      assert.equal(edox?.rail.explanation, EDOXABAN_HIGH_CRCL_NOTE);
    });

    it("apixaban ABC: 82 years and 58 kg → reduction", () => {
      const d = afDoacDosing({ ageYears: 82, weightKg: 58, scrMgDl: 1.0, sex: "female" });
      assert.equal(d.rows.find((r) => r.agentId === "apixaban")?.abc?.reductionIndicated, true);
    });

    it("invalid input returns no rows", () => {
      const d = afDoacDosing({ ageYears: 70, weightKg: 80, scrMgDl: 0, sex: "male" });
      assert.equal(d.crcl, null);
      assert.equal(d.rows.length, 0);
    });
  });

  describe("desk detection and report", () => {
    it("rate/rhythm drug alone is AF-relevant", () => {
      const d = afOnDesk(["metoprolol", "acetaminophen"]);
      assert.equal(d.hasAfRelevant, true);
      assert.deepEqual(d.matchedIds, ["metoprolol"]);
      assert.equal(afOnDesk(["acetaminophen"]).hasAfRelevant, false);
    });

    it("splits anticoagulants and antiplatelets", () => {
      const d = afOnDesk(["aspirin", "apixaban", "amiodarone"]);
      assert.deepEqual(d.anticoagulantIds, ["apixaban"]);
      assert.deepEqual(d.antiplateletIds, ["aspirin"]);
      assert.equal(d.matchedIds.length, 3);
    });

    it("report notes rate control without anticoagulant, and host flags", () => {
      const r = afReportOnDesk(["diltiazem"], { ...DEFAULT_HOST, age: "geriatric", kidney: "ckd", alcohol: "chronic" });
      assert.ok(r.notes.some((n) => /does not replace stroke prevention/.test(n)));
      assert.ok(r.notes.some((n) => /Older adult/.test(n)));
      assert.ok(r.notes.some((n) => /Kidney flag/.test(n)));
      assert.ok(r.notes.some((n) => /alcohol/.test(n)));
      assert.equal(r.disclaimer, AF_DISCLAIMER);
      assert.equal(r.citations, AF_CITATIONS);
    });

    it("report carries the triple-therapy note", () => {
      const r = afReportOnDesk(["aspirin", "clopidogrel", "apixaban"]);
      assert.ok(r.notes.some((n) => n.includes("AUGUSTUS")));
    });
  });

  describe("citations and catalog", () => {
    it("cites the five anchor sources", () => {
      for (const needle of ["Chest 2010;137(2):263", "Chest 2010;138(5):1093", "Circulation 2024;149:e1", "Eur Heart J 2024;45:3314", "N Engl J Med 2019;380:1509"]) {
        assert.ok(AF_CITATIONS.some((c) => c.includes(needle)), needle);
      }
    });

    it("every referenced drug id exists in the catalog", () => {
      const ids = [
        ...AF_DOAC_IDS,
        ...AF_RATE_RHYTHM_IDS,
        ...P2Y12_IDS,
        ...VKA_IDS,
        "aspirin",
        "clopidogrel",
        "prasugrel",
        "ticagrelor",
        "ibuprofen",
        "sertraline",
      ];
      for (const id of ids) assert.ok(DRUG_BY_ID[id], id);
      assert.equal(AF_RATE_RHYTHM_IDS.length, 9);
      assert.equal(AF_DOAC_IDS.length, DOAC_IDS.size);
    });

    it("no string says prescribe", () => {
      const strings = collectStrings([
        AF_DISCLAIMER,
        AF_CITATIONS,
        chads2Vasc(all),
        chads2Vasc(none),
        cha2ds2Va(all),
        cha2ds2Va(none),
        hasBled(allBleed),
        hasBled({ ...noBleed, labileInr: true }),
        trayBleedModifiers(["aspirin", "clopidogrel", "apixaban", "ibuprofen", "sertraline", "ginkgo", "warfarin"]),
        afDoacDosing({ ageYears: 70, weightKg: 80, scrMgDl: 1.0, sex: "male" }),
        afDoacDosing({ ageYears: 30, weightKg: 90, scrMgDl: 0.7, sex: "male" }),
        afDoacDosing({ ageYears: 85, weightKg: 55, scrMgDl: 2.5, sex: "female" }),
        afReportOnDesk(["aspirin", "clopidogrel", "apixaban", "dronedarone", "diltiazem"], {
          ...DEFAULT_HOST,
          age: "geriatric",
          kidney: "ckd",
          alcohol: "chronic",
        }),
      ]);
      assert.ok(strings.length > 50);
      for (const s of strings) assert.ok(!/prescribe/i.test(s), s);
    });
  });
});
