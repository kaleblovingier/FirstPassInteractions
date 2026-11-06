import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { analyze } from "@/lib/drugs/engine";
import { SAMPLE_REGIMENS, sampleNeedsPro } from "@/lib/drugs/samples";
import { DEFAULT_HOST, type Finding } from "@/lib/drugs/types";
import { DOSE_PATTERN } from "@/lib/guards/dose-rule";
import { WorkupView } from "@/components/learn/workup-view";
import {
  DONE_KEY, NOT_A_GREEN_LIGHT, WORKUP_DESCRIPTION, WORKUP_INTRO, WORKUP_TITLE, gradeWorkup, loadDone, pairKey,
  pairsOf, parseWorkupSearch, saveDone, scoredKey, summaryLine, toWorkupCase, workupCases, workupPath, type PairCall,
} from "./workup";

const cases = workupCases();
const sample = (id: string) => SAMPLE_REGIMENS.find((s) => s.id === id)!;
const hasDose = (s: string) => s.search(DOSE_PATTERN) >= 0;

test("pairs: n·(n−1)/2 unordered pairs in a stable list order", () => {
  assert.deepEqual(pairsOf(["a", "b", "c", "d"]), [["a", "b"], ["a", "c"], ["a", "d"], ["b", "c"], ["b", "d"], ["c", "d"]]);
  assert.deepEqual(pairsOf([]), []);
  for (const n of [1, 2, 3, 6]) assert.equal(pairsOf([...Array(n).keys()]).length, (n * (n - 1)) / 2, `n=${n}`);
  assert.equal(pairKey("b", "a"), pairKey("a", "b"));
  for (const c of cases) {
    assert.equal(c.pairs.length, (c.drugs.length * (c.drugs.length - 1)) / 2, c.id);
    assert.equal(new Set(c.pairs.map((p) => p.key)).size, c.pairs.length, c.id);
    assert.deepEqual(toWorkupCase(sample(c.id))?.pairs, c.pairs, c.id);
  }
});

test("eligible cases are free, 3–6 items, with a scored pair and no dose text in what the page shows", () => {
  assert.ok(cases.length > 0);
  for (const c of cases) {
    assert.equal(sampleNeedsPro(sample(c.id)), false, c.id);
    assert.ok(c.drugs.length >= 3 && c.drugs.length <= 6, c.id);
    assert.ok(c.findings.some((f) => c.pairs.some((p) => p.key === scoredKey(f))), c.id);
    assert.equal(c.deskUrl, `/?case=${c.id}`);
    const shown = [c.title, c.blurb, ...c.drugs.flatMap((d) => [d.name, d.cls]), ...c.findings.flatMap((f) => [f.headline, f.mechanism, f.effect])];
    assert.ok(!shown.some(hasDose), c.id);
  }
});

test("eligibility rejects licensed host factors, size outside 3–6, dose text and no two-drug finding", () => {
  const base = sample(cases[0]!.id);
  const quiet = ["acamprosate", "famotidine", "febuxostat", "amoxicillin"];
  assert.ok(toWorkupCase({ ...base, ketamineRoute: "oral" }), "ketamine route stays free");
  for (const pro of [{ phenotypes: { CYP2D6: "PM" as const } }, { smoking: true }, { alcohol: "chronic" as const }, { cannabisRoute: "oral" as const }]) {
    assert.equal(toWorkupCase({ ...base, ...pro }), null, JSON.stringify(pro));
  }
  assert.equal(toWorkupCase({ ...base, drugIds: base.drugIds.slice(0, 2) }), null);
  assert.ok(toWorkupCase({ ...base, drugIds: [...base.drugIds, ...quiet.slice(0, 3)] }), "6 items");
  assert.equal(toWorkupCase({ ...base, drugIds: [...base.drugIds, ...quiet] }), null, "7 items");
  assert.equal(toWorkupCase({ ...base, blurb: `${base.blurb} Label cap 20 mg.` }), null);
  assert.equal(toWorkupCase({ ...base, title: "Oxycodone 5 mg and friends" }), null);
  // An entered teaching dose puts milligrams into a desk finding; that case stays off the page.
  const dosed = { ...sample("dose-simva-amio"), title: "T", blurb: "B", drugIds: ["simvastatin", "amiodarone", "famotidine"] };
  assert.equal(toWorkupCase(dosed), null);
  assert.ok(toWorkupCase({ ...dosed, doses: undefined }));
  const none = quiet.slice(0, 3);
  assert.equal(analyze(none, DEFAULT_HOST).findings.filter(scoredKey).length, 0, "precondition: a quiet triple");
  assert.equal(toWorkupCase({ ...base, drugIds: none }), null);
});

const F = (id: string, kind: Finding["kind"], severity: Finding["severity"], drugIds: string[]): Finding => ({
  id, kind, severity, drugIds, headline: id, enzymes: [], effect: "", mechanism: "", clinical: "", tags: [],
});
const drugs = ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase(), cls: "" }));
const toy = {
  pairs: pairsOf(drugs).map(([a, b]) => ({ key: pairKey(a.id, b.id), a, b })),
  findings: [
    F("ab-pk", "pk", "minor", ["b", "a"]),
    F("ab-pd", "pd", "major", ["a", "b"]),
    F("bc-pk", "pk", "moderate", ["b", "c"]),
    F("abc-stack", "pd", "major", ["a", "b", "c"]),
    F("a-clinic", "clinic", "moderate", ["a"]),
    F("ac-geno", "geno", "major", ["a", "c"]),
  ],
};
const AB = pairKey("a", "b"), AC = pairKey("a", "c"), BC = pairKey("b", "c");

test("grader: hits, misses and over-calls; gene, clinic and multi-drug rows go to Also on the desk", () => {
  const g = gradeWorkup(toy, { [AB]: { call: "pk", severity: "major" }, [AC]: { call: "pd", severity: "minor" }, [BC]: { call: "none" } });
  assert.deepEqual(g.pairs.map((r) => r.outcome), ["found", "over-called", "missed"]);
  assert.deepEqual(g.pairs[0]!.findings.map((f) => f.id), ["ab-pd", "ab-pk"], "highest grade first");
  assert.deepEqual([g.interacting, g.found, g.missed, g.overCalled], [2, 1, 1, 1]);
  assert.deepEqual([g.kindMatched, g.severityGuessed, g.severityMatched], [1, 1, 1]);
  assert.equal(g.pairs[1]!.severityMatch, null, "no desk grade to compare on an over-call");
  assert.deepEqual(g.also.map((f) => f.id), ["abc-stack", "a-clinic", "ac-geno"]);
  assert.equal(summaryLine(g), "You found 1 of 2 interacting pairs; 1 over-called. Your kind matched the desk on 1 of 1. Your severity matched on 1 of 1 guess.");
});

test("grader: either kind is a hit, the kind must exist on the desk, severity is the pair's highest grade", () => {
  const g = gradeWorkup(toy, { [AB]: { call: "pd" }, [AC]: { call: "none", severity: "major" }, [BC]: { call: "pd", severity: "moderate" } });
  assert.deepEqual(g.pairs.map((r) => [r.outcome, r.kindMatch, r.severityMatch]), [
    ["found", true, null],
    ["none-agreed", null, null],
    ["found", false, true],
  ]);
  assert.equal(g.pairs[1]!.severity, undefined, "a severity on a 'none' call is ignored");
  assert.equal(summaryLine(g), "You found 2 of 2 interacting pairs; none over-called. Your kind matched the desk on 1 of 2. Your severity matched on 1 of 1 guess.");
  const low = gradeWorkup(toy, { [AB]: { call: "pk", severity: "minor" } });
  assert.deepEqual([low.pairs[0]!.kindMatch, low.pairs[0]!.severityMatch], [true, false], "the PK row is minor but the pair's highest grade is major");
  const blank = gradeWorkup(toy, {});
  assert.deepEqual(blank.pairs.map((r) => r.outcome), ["missed", "none-agreed", "missed"], "unanswered counts as none");
  assert.equal(summaryLine(blank), "You found 0 of 2 interacting pairs; none over-called.");
});

test("grader agrees with analyze() on every eligible case", () => {
  for (const c of cases) {
    // Answer every pair the way the desk grades it: its top finding's kind and severity.
    const deskAnswers = gradeWorkup(c, {}).pairs.map((r) => {
      const top = r.findings[0];
      return [r.pair.key, top ? { call: top.kind as PairCall, severity: top.severity } : { call: "none" as const }];
    });
    const g = gradeWorkup(c, Object.fromEntries(deskAnswers));
    assert.ok(g.interacting > 0, c.id);
    assert.deepEqual([g.found, g.missed, g.overCalled, g.kindMatched, g.severityMatched], [g.interacting, 0, 0, g.interacting, g.interacting], c.id);
    assert.equal(g.pairs.reduce((n, r) => n + r.findings.length, 0) + g.also.length, c.findings.length, `${c.id}: every finding scored once or listed`);
    assert.ok(g.also.every((f) => f.kind === "geno" || f.kind === "clinic" || f.drugIds.length !== 2), c.id);
  }
});

test("search: ?case= must name an eligible case, anything else falls back to the picker", () => {
  const id = cases[0]!.id;
  assert.deepEqual(parseWorkupSearch({ case: id }), { case: id });
  // ketamine-3a4 is free but two drugs; dxm-2d6pm needs a license (phenotype).
  for (const bad of ["no-such-case", "", "ketamine-3a4", "dxm-2d6pm", 123, true, null, [id], { id }]) {
    assert.equal(parseWorkupSearch({ case: bad }).case, undefined, JSON.stringify(bad));
  }
  assert.equal(parseWorkupSearch({}).case, undefined);
  assert.deepEqual(Object.keys(parseWorkupSearch({ case: id, utm: "x" })), ["case"]);
  assert.equal(workupPath(id), `/workup?case=${id}`);
});

test("checked marks stay in this browser and survive bad storage", () => {
  const mem = new Map<string, string>();
  const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  saveDone(["x", "y"], st);
  assert.deepEqual(loadDone(st), ["x", "y"]);
  assert.equal(DONE_KEY, "firstpass.workup.v1");
  mem.set(DONE_KEY, "garbage");
  assert.deepEqual(loadDone(st), []);
  mem.set(DONE_KEY, JSON.stringify(["x", 3, null]));
  assert.deepEqual(loadDone(st), ["x"]);
  const blocked = { getItem: (): string => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.deepEqual(loadDone(blocked), []);
  assert.doesNotThrow(() => saveDone(["x"], blocked));
});

test("rendered page: a labelled radio group per pair, a live result region, desk link, disclaimers, no dose text", () => {
  for (const c of cases) {
    const html = renderToStaticMarkup(createElement(WorkupView, { cases, caseId: c.id }));
    assert.equal(html.match(/<fieldset/g)?.length, c.pairs.length, c.id);
    assert.equal(html.match(/<legend/g)?.length, c.pairs.length, c.id);
    const ids = [...html.matchAll(/<input[^>]*id="([^"]+)"/g)].map((m) => m[1]!);
    assert.equal(ids.length, c.pairs.length * 3, c.id);
    for (const id of ids) assert.ok(html.includes(`for="${id}"`), id);
    assert.match(html, /role="status"/);
    assert.match(html, /<h1/);
    assert.ok(html.includes(`href="${c.deskUrl}"`), c.id);
    assert.ok(html.includes(NOT_A_GREEN_LIGHT));
    assert.match(html, /data-testid="pair-disclaimer"/);
    assert.ok(!hasDose(html.replace(/<[^>]+>/g, " ")), c.id);
  }
  const picker = renderToStaticMarkup(createElement(WorkupView, { cases }));
  assert.doesNotMatch(picker, /<fieldset/);
  for (const c of cases) assert.ok(picker.includes(`href="${workupPath(c.id)}"`), c.id);
});

test("copy: educational framing, no pricing, no decision-support claims", () => {
  const html = renderToStaticMarkup(createElement(WorkupView, { cases, caseId: cases[0]!.id }));
  const copy = [WORKUP_TITLE, WORKUP_DESCRIPTION, WORKUP_INTRO, html].join(" ");
  assert.doesNotMatch(copy, /\bfree\b|\$\d|pricing|\bPro\b|clinical decision|decision support|diagnos/i);
  assert.match(WORKUP_INTRO, /not a clinical tool/);
});
