import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { pairPages } from "@/lib/seo/pair-pages";
import {
  DOSE_UNIT_RE, GRADE_CHOICES, PRACTICE_DESCRIPTION, PRACTICE_INTRO, PRACTICE_TITLE, SCORE_KEY,
  enzymeChoices, hasDoseText, loadScore, practiceQuestions, saveScore, scoreAnswer,
} from "./practice";
import { PracticeView } from "@/components/learn/practice-view";

const qs = practiceQuestions();

test("questions come only from existing pair pages with unchanged grade, enzymes and quote", () => {
  assert.ok(qs.length > 50, `got ${qs.length}`);
  const bySlug = new Map(pairPages().map((p) => [p.slug, p]));
  for (const q of qs) {
    const p = bySlug.get(q.slug);
    assert.ok(p, q.slug);
    assert.equal(q.gradeLabel, p.severityLabel);
    assert.deepEqual(q.enzymes, p.enzymes);
    assert.equal(q.quote?.quote, p.quote?.quote);
    assert.equal(q.quote?.url, p.quote?.url);
    assert.ok(GRADE_CHOICES.includes(q.gradeLabel));
    assert.match(q.quote!.url, /^https:\/\//);
  }
});

test("dose guard regex catches dose units", () => {
  for (const s of ["10 mg", "0.5 mg/kg", "2 units", "1 g/kg", "40 mEq", "5 mcg"]) assert.ok(hasDoseText(s), s);
  for (const s of ["CYP3A4 inhibitor", "Avoid together", "MAOI"]) assert.ok(!hasDoseText(s), s);
});

test("no question carries dose text", () => {
  for (const q of qs) assert.ok(!hasDoseText(JSON.stringify(q)), q.slug);
});

test("rendered practice card and revealed answer contain no dose units", () => {
  for (let i = 0; i < qs.length; i++) {
    const html = renderToStaticMarkup(createElement(PracticeView, { questions: qs, initialIndex: i }));
    assert.ok(!DOSE_UNIT_RE.test(html.replace(/<[^>]+>/g, " ")), `card ${qs[i]!.slug}`);
  }
});

test("rendered page is accessible: labelled radios in fieldsets, live score", () => {
  const html = renderToStaticMarkup(createElement(PracticeView, { questions: qs }));
  assert.match(html, /<fieldset/);
  assert.match(html, /<legend/);
  const inputs = html.match(/<input[^>]*id="([^"]+)"/g) ?? [];
  assert.ok(inputs.length >= 4);
  for (const m of inputs) {
    const id = m.match(/id="([^"]+)"/)![1];
    assert.ok(html.includes(`for="${id}"`), `label for ${id}`);
  }
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<h1/);
});

test("copy: educational, no pricing, no Pro, no clinical-decision claims", () => {
  const src = readFileSync("src/components/learn/practice-view.tsx", "utf8") + readFileSync("src/lib/learn/practice.ts", "utf8");
  const copy = [PRACTICE_TITLE, PRACTICE_DESCRIPTION, PRACTICE_INTRO].join(" ") + renderToStaticMarkup(createElement(PracticeView, { questions: qs }));
  assert.ok(!/\bfree\b|\$\d|price|pricing|\bPro\b/i.test(copy));
  assert.ok(!/\bPro\b/.test(src));
  assert.ok(!/clinical decision|decision support|diagnos|recommend(ed)? dose/i.test(copy));
  assert.match(PRACTICE_INTRO, /not a clinical tool/);
});

test("scoring and localStorage round trip", () => {
  const q = qs.find((x) => x.enzymes.length && x.roleA) ?? qs[0]!;
  const right = scoreAnswer(q, { grade: q.gradeLabel, enzyme: q.enzymes[0], role: q.roleA ?? undefined });
  assert.ok(right.all);
  assert.ok(!scoreAnswer(q, { grade: "nope" }).all);
  const choices = enzymeChoices(q, qs.flatMap((x) => x.enzymes), 3);
  if (q.enzymes[0]) assert.ok(choices.includes(q.enzymes[0]));
  const mem = new Map<string, string>();
  const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  saveScore(st, { answered: 3, correct: 2 });
  assert.equal(mem.has(SCORE_KEY), true);
  assert.deepEqual(loadScore(st), { answered: 3, correct: 2 });
  mem.set(SCORE_KEY, "garbage");
  assert.deepEqual(loadScore(st), { answered: 0, correct: 0 });
  assert.deepEqual(loadScore(undefined), { answered: 0, correct: 0 });
});

test("practice code makes no network calls", () => {
  const src = readFileSync("src/components/learn/practice-view.tsx", "utf8") + readFileSync("src/lib/learn/practice.ts", "utf8");
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|createServerFn/.test(src));
});
