import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEPRESCRIBE_QUESTIONS,
  EMPTY_TRAY_NOTE,
  FALLS_CITATIONS,
  FALLS_DISCLAIMER,
  FALL_MECHANISMS,
  FRID_CLASSES,
  STEADI_NONE,
  STEADI_QUESTIONS,
  THIAZIDE_IDS,
  WHAT_IF_NOTE,
  fallMechanismsOf,
  fallsOnDesk,
  fallsReportOnDesk,
  fallsWhatIf,
  fridClassesOf,
  steadiScreen,
} from "./falls";
import { acbOnDesk } from "./acb";
import { DRUG_BY_ID } from "./catalog";
import { clinicFor } from "./clinic";
import { DEFAULT_HOST } from "./types";

const geriatric = { ...DEFAULT_HOST, age: "geriatric" as const };

function collectStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectStrings(x, out));
  return out;
}

describe("falls risk and deprescribing engine", () => {
  describe("sedation stack: benzodiazepine + opioid + gabapentinoid", () => {
    const tray = ["lorazepam", "oxycodone", "gabapentin"];

    it("counts three FRIDs in three classes, all sedation", () => {
      const d = fallsOnDesk(tray);
      assert.equal(d.hasFrid, true);
      assert.equal(d.fridCount, 3);
      assert.equal(d.stacked, true);
      assert.deepEqual(d.classIds, ["bzra", "opioid", "gabapentinoid"]);
      assert.deepEqual(d.mechanisms, ["sedation"]);
      assert.equal(d.hasSedation, true);
      assert.equal(d.hasOrthostatic, false);
    });

    it("trips the Beers 2023 three-CNS-drug row", () => {
      const d = fallsOnDesk(tray);
      assert.equal(d.beersCnsActiveCount, 3);
      assert.equal(d.beersCnsStack, true);
    });

    it("names the mechanism per drug and per class, and flags the Beers pairs", () => {
      const r = fallsReportOnDesk(tray, geriatric);
      assert.equal(r.drugs.length, 3);
      for (const row of r.drugs) assert.deepEqual(row.mechanisms, ["sedation"]);
      assert.equal(r.mechanisms.length, 1);
      assert.equal(r.mechanisms[0].id, "sedation");
      assert.deepEqual(r.mechanisms[0].drugIds, tray);
      assert.ok(r.notes.some((n) => /3 CNS-active drugs/.test(n) && /Beers 2023/.test(n)));
      assert.ok(r.notes.some((n) => /benzodiazepines as a pair to avoid/.test(n)));
      assert.ok(r.notes.some((n) => /gabapentinoids as a pair to avoid/.test(n)));
      assert.match(r.summary, /3 fall-risk drugs/);
      assert.match(r.summary, /stack/);
    });

    it("reuses the Beers rows from the clinic cards", () => {
      const r = fallsReportOnDesk(tray);
      const lorazepam = r.drugs.find((x) => x.id === "lorazepam");
      assert.ok(lorazepam);
      assert.equal(lorazepam.beersRow, clinicFor("lorazepam")?.beers ?? null);
      assert.ok(lorazepam.beersRow);
    });

    it("BZRA deprescribing points to the algorithm and warns on abrupt stop, without a schedule", () => {
      const r = fallsReportOnDesk(tray);
      const bzra = r.classes.find((c) => c.id === "bzra");
      assert.ok(bzra);
      assert.equal(bzra.deprescribe.taper, "yes");
      assert.match(bzra.deprescribe.taperNote, /algorithm/);
      assert.match(bzra.deprescribe.taperNote, /Abrupt stop/);
      assert.match(bzra.deprescribe.algorithm ?? "", /deprescribing\.org/);
      assert.match(bzra.beers ?? "", /Beers 2023/);
    });
  });

  describe("other mechanisms", () => {
    it("orthostatic class: alpha-1 blocker, nitrate, loop diuretic", () => {
      const tray = ["doxazosin", "isosorbide-mononitrate", "furosemide"];
      const d = fallsOnDesk(tray);
      assert.equal(d.fridCount, 3);
      assert.deepEqual(d.classIds, ["alpha-blocker", "nitrate", "diuretic"]);
      assert.deepEqual(d.mechanisms, ["orthostatic"]);
      assert.equal(d.beersCnsActiveCount, 0);
      const r = fallsReportOnDesk(tray);
      assert.ok(r.notes.some((n) => /drop pressure on standing/.test(n) && /lying and standing/.test(n)));
      assert.match(r.classes.find((c) => c.id === "alpha-blocker")?.beers ?? "", /hypertension/);
    });

    it("thiazide adds low sodium to the orthostatic mechanism", () => {
      assert.deepEqual(fallMechanismsOf("hctz"), ["orthostatic", "hyponatremia"]);
      assert.deepEqual(fallMechanismsOf("furosemide"), ["orthostatic"]);
      assert.deepEqual(fallMechanismsOf("sertraline"), ["sedation", "hyponatremia"]);
      const r = fallsReportOnDesk(["hctz", "sertraline"]);
      assert.ok(r.notes.some((n) => /lower sodium/.test(n)));
    });

    it("sulfonylurea is a hypoglycemia FRID with its Beers row", () => {
      const d = fallsOnDesk(["glyburide"]);
      assert.equal(d.hasFrid, true);
      assert.deepEqual(d.classIds, ["sulfonylurea"]);
      assert.deepEqual(d.mechanisms, ["hypoglycemia"]);
      assert.equal(d.hasHypoglycemia, true);
      const r = fallsReportOnDesk(["glyburide"]);
      assert.equal(r.drugs[0].beersRow, clinicFor("glyburide")?.beers ?? null);
      assert.match(r.classes[0].beers ?? "", /glipizide/);
      assert.match(r.classes[0].deprescribe.algorithm ?? "", /antihyperglycemic/);
    });

    it("beta-blocker with a sulfonylurea adds the masking note and a bradycardia mechanism", () => {
      const r = fallsReportOnDesk(["glipizide", "metoprolol"]);
      assert.deepEqual(r.detection.mechanisms, ["hypoglycemia", "bradycardia"]);
      assert.ok(r.notes.some((n) => /blunt the tremor/.test(n)));
    });

    it("insulin and cholinesterase inhibitors map to their mechanisms", () => {
      assert.deepEqual(fridClassesOf("insulin-glargine"), ["insulin"]);
      assert.deepEqual(fallMechanismsOf("insulin-glargine"), ["hypoglycemia"]);
      assert.deepEqual(fridClassesOf("donepezil"), ["cholinesterase-inhibitor"]);
      assert.deepEqual(fallMechanismsOf("donepezil"), ["bradycardia"]);
    });

    it("anticholinergic mechanism and total come from the ACB module", () => {
      const tray = ["amitriptyline", "oxybutynin"];
      const r = fallsReportOnDesk(tray);
      assert.ok(fallMechanismsOf("amitriptyline").includes("anticholinergic"));
      assert.ok(fallMechanismsOf("amitriptyline").includes("orthostatic"));
      assert.deepEqual(fridClassesOf("oxybutynin"), ["anticholinergic"]);
      assert.equal(r.acb?.totalScore, acbOnDesk(tray)?.totalScore);
      assert.equal(r.acb?.totalScore, 6);
      assert.equal(r.drugs.find((x) => x.id === "oxybutynin")?.acbScore, 3);
      assert.ok(r.notes.some((n) => /ACB module/.test(n)));
    });
  });

  describe("non-FRIDs", () => {
    it("a statin is not counted", () => {
      const d = fallsOnDesk(["atorvastatin"]);
      assert.equal(d.hasFrid, false);
      assert.equal(d.fridCount, 0);
      assert.equal(fallsOnDesk(["atorvastatin", "lorazepam"]).fridCount, 1);
    });

    it("second-generation antihistamines and loperamide are not counted", () => {
      for (const id of ["cetirizine", "fexofenadine", "loperamide"]) {
        assert.ok(DRUG_BY_ID[id], id);
        assert.deepEqual(fridClassesOf(id), [], id);
      }
    });

    it("unknown ids and duplicates are ignored", () => {
      const d = fallsOnDesk(["not-a-drug", "zolpidem", "zolpidem"]);
      assert.equal(d.fridCount, 1);
      assert.deepEqual(d.fridIds, ["zolpidem"]);
    });

    it("alcohol is a note, not a counted FRID", () => {
      const r = fallsReportOnDesk(["ethanol", "zolpidem"]);
      assert.equal(r.detection.fridCount, 1);
      assert.ok(r.notes.some((n) => /Alcohol on the tray/.test(n)));
    });
  });

  describe("host factors", () => {
    it("emphasizes an older adult", () => {
      const r = fallsReportOnDesk(["zolpidem"], geriatric);
      assert.equal(r.host.olderAdult, true);
      assert.match(r.host.message, /Older adult/);
      assert.match(r.summary, /^Older adult\./);
    });

    it("still teaches for an adult host but names the 65+ frame", () => {
      for (const host of [DEFAULT_HOST, undefined]) {
        const r = fallsReportOnDesk(["zolpidem"], host);
        assert.equal(r.host.olderAdult, false);
        assert.match(r.host.message, /65 and older/);
        assert.equal(r.detection.fridCount, 1);
      }
    });

    it("kidney flag adds gabapentinoid and glucose-lowering notes", () => {
      const r = fallsReportOnDesk(["pregabalin", "glipizide"], { ...DEFAULT_HOST, kidney: "ckd" });
      assert.ok(r.notes.some((n) => /Gabapentin and pregabalin are cleared by the kidney/.test(n)));
      assert.ok(r.notes.some((n) => /prolongs sulfonylurea and insulin/.test(n)));
    });

    it("alcohol on the host adds a sedation note", () => {
      const r = fallsReportOnDesk(["zolpidem"], { ...DEFAULT_HOST, alcohol: "chronic" });
      assert.ok(r.notes.some((n) => /Alcohol on the host/.test(n)));
    });
  });

  describe("remove-one what-if", () => {
    const tray = ["lorazepam", "oxycodone", "gabapentin", "doxazosin"];

    it("removing the only orthostatic drug drops the count and the mechanism", () => {
      const w = fallsWhatIf(tray, "doxazosin");
      assert.equal(w.wasFrid, true);
      assert.equal(w.before.fridCount, 4);
      assert.equal(w.after.fridCount, 3);
      assert.deepEqual(w.lostMechanisms, ["orthostatic"]);
      assert.deepEqual(w.lostClassIds, ["alpha-blocker"]);
      assert.match(w.message, /from 4 to 3/);
    });

    it("removing one sedative keeps the mechanism but clears the Beers line", () => {
      const w = fallsWhatIf(tray, "lorazepam");
      assert.equal(w.after.fridCount, 3);
      assert.deepEqual(w.lostMechanisms, []);
      assert.equal(w.before.beersCnsActiveCount, 3);
      assert.equal(w.after.beersCnsActiveCount, 2);
      assert.match(w.message, /still covered/);
      assert.match(w.message, /below the Beers 2023 three-CNS-drug line/);
    });

    it("removing a non-FRID leaves the count alone", () => {
      const w = fallsWhatIf([...tray, "atorvastatin"], "atorvastatin");
      assert.equal(w.wasFrid, false);
      assert.equal(w.before.fridCount, w.after.fridCount);
      assert.match(w.message, /not a mapped fall-risk drug/);
    });

    it("removing the last FRID says it is still not a green light", () => {
      const w = fallsWhatIf(["zolpidem"], "zolpidem");
      assert.equal(w.after.fridCount, 0);
      assert.match(w.message, /not a green light/);
      assert.match(WHAT_IF_NOTE, /not a plan to stop/);
    });

    it("tracks the ACB total change", () => {
      const w = fallsWhatIf(["amitriptyline", "oxybutynin"], "oxybutynin");
      assert.equal(w.before.acbTotal, 6);
      assert.equal(w.after.acbTotal, 3);
      assert.match(w.message, /ACB total falls from 6 to 3/);
    });
  });

  describe("STEADI screen", () => {
    it("has the three key questions", () => {
      assert.deepEqual(
        STEADI_QUESTIONS.map((q) => q.key),
        ["fell", "unsteady", "worries"],
      );
    });

    it("any yes screens at risk; with FRIDs on the tray the tone is high", () => {
      const s = steadiScreen({ ...STEADI_NONE, fell: true }, 3);
      assert.equal(s.screenedAtRisk, true);
      assert.equal(s.yesCount, 1);
      assert.equal(s.tone, "high");
      assert.ok(s.steps.some((x) => /lying and standing blood pressure/.test(x)));
      assert.ok(s.steps.some((x) => /medicines for fall risk/.test(x)));
    });

    it("at risk with no FRID is not a clean bill", () => {
      const s = steadiScreen({ ...STEADI_NONE, worries: true }, 0);
      assert.equal(s.tone, "watch");
      assert.match(s.headline, /not a clean bill/);
    });

    it("a negative screen does not erase drug risk", () => {
      const s = steadiScreen(STEADI_NONE, 2);
      assert.equal(s.screenedAtRisk, false);
      assert.equal(s.tone, "watch");
      assert.match(s.headline, /does not remove the drug risk/);
    });

    it("negative screen, no FRID: low, re-screen yearly", () => {
      const s = steadiScreen(STEADI_NONE, 0);
      assert.equal(s.tone, "low");
      assert.ok(s.steps.some((x) => /once a year/.test(x)));
    });
  });

  describe("empty tray", () => {
    it("is not a green light", () => {
      const d = fallsOnDesk([]);
      assert.equal(d.hasFrid, false);
      assert.equal(d.fridCount, 0);
      assert.deepEqual(d.mechanisms, []);
      const r = fallsReportOnDesk([]);
      assert.equal(r.summary, EMPTY_TRAY_NOTE);
      assert.match(r.summary, /not a green light/);
      assert.deepEqual(r.classes, []);
      assert.deepEqual(r.drugs, []);
      assert.equal(r.acb, null);
      assert.ok(r.notes.includes(EMPTY_TRAY_NOTE));
    });
  });

  describe("shape, sources and posture", () => {
    it("report is JSON-serializable", () => {
      const r = fallsReportOnDesk(["lorazepam", "oxycodone", "gabapentin", "doxazosin", "hctz", "glyburide", "amitriptyline"], geriatric);
      assert.deepEqual(JSON.parse(JSON.stringify(r)), r);
    });

    it("every class has the three deprescribing answers and a known mechanism", () => {
      assert.equal(DEPRESCRIBE_QUESTIONS.length, 3);
      for (const c of FRID_CLASSES) {
        assert.ok(c.deprescribe.indication.length > 10, c.id);
        assert.ok(c.deprescribe.alternative.length > 10, c.id);
        assert.ok(c.deprescribe.taperNote.length > 10, c.id);
        assert.ok(["yes", "no", "ask"].includes(c.deprescribe.taper), c.id);
        assert.ok(c.mechanisms.length > 0, c.id);
        for (const m of c.mechanisms) assert.ok(FALL_MECHANISMS[m], `${c.id}:${m}`);
      }
    });

    it("every thiazide id is in the catalog", () => {
      for (const id of THIAZIDE_IDS) assert.ok(DRUG_BY_ID[id], id);
      assert.ok(THIAZIDE_IDS.has("hctz"));
    });

    it("cites the anchor sources", () => {
      for (const needle of [
        "Age Ageing 2021;50(4):1189",
        "J Am Geriatr Soc 2023;71(7):2052",
        "STEADI",
        "Can Fam Physician 2018;64(5):339",
        "Can Fam Physician 2018;64(1):17",
      ]) {
        assert.ok(FALLS_CITATIONS.some((c) => c.includes(needle)), needle);
      }
      const r = fallsReportOnDesk(["zolpidem"]);
      assert.equal(r.citations, FALLS_CITATIONS);
      assert.equal(r.disclaimer, FALLS_DISCLAIMER);
    });

    it("no string says prescribe, and none carries a dose or a taper schedule", () => {
      const strings = collectStrings([
        FALLS_DISCLAIMER,
        FRID_CLASSES,
        FALL_MECHANISMS,
        STEADI_QUESTIONS,
        WHAT_IF_NOTE,
        fallsReportOnDesk(
          ["lorazepam", "oxycodone", "gabapentin", "doxazosin", "hctz", "glyburide", "metoprolol", "amitriptyline", "oxybutynin", "ethanol"],
          { ...geriatric, kidney: "ckd", alcohol: "chronic" },
        ),
        fallsReportOnDesk([]),
        fallsWhatIf(["lorazepam", "oxycodone", "gabapentin"], "lorazepam"),
        steadiScreen({ fell: true, unsteady: true, worries: true }, 3),
        steadiScreen(STEADI_NONE, 0),
      ]);
      assert.ok(strings.length > 100);
      for (const s of strings) {
        assert.ok(!/prescribe/i.test(s), s);
        assert.ok(!/\d\s*(mg|mcg|µg|units?)\b/i.test(s), s);
        assert.ok(!/\d+\s*%/.test(s), s);
        assert.ok(!/\bevery \d+ (day|week)s?\b/i.test(s), s);
      }
    });
  });
});
