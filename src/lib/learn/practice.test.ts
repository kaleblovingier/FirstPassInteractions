import { test } from "node:test";
import assert from "node:assert/strict";
import { Fragment, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { pairPages } from "@/lib/seo/pair-pages";
import type { StudyMark } from "@/lib/drugs/study-marks";
import {
  DOSE_UNIT_RE, FIRST_SESSION_SEED, GRADE_CHOICES, MARKS_KEY, NO_ENZYME, PRACTICE_DESCRIPTION, PRACTICE_INTRO, PRACTICE_TITLE,
  SCORE_KEY, SESSION_SIZE, deckFacets, enzymeChoices, hasDoseText, loadMarks, loadScore, markAnswer, parsePracticeSearch,
  practiceDeck, practiceQuestions, saveMarks, saveScore, scoreAnswer, sessionCards, sessionSummary, type PracticeQuestion,
} from "./practice";
import { PracticeView } from "@/components/learn/practice-view";

const qs = practiceQuestions();
const DAY = 86_400_000;
const card = (slug: string, gradeLabel: string, enzymes: string[] = []): PracticeQuestion =>
  ({ slug, nameA: `${slug} drug`, nameB: "partner", gradeLabel, enzymes, roleA: null, quote: null });
const mini = [card("a", "Avoid together", ["CYP3A4"]), card("b", "Serious concern", ["CYP2C19"]), card("c", "Avoid together", ["CYP2C9"]), card("d", "Use care")];
const slugs = (cards: PracticeQuestion[]) => cards.map((q) => q.slug);
/** Text the way React escapes it in markup. */
const asHtml = (text: string) => renderToStaticMarkup(createElement(Fragment, null, text));

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
  // Each question as a one-card deck, so every card is the one on screen.
  for (const q of qs) {
    const html = renderToStaticMarkup(createElement(PracticeView, { questions: [q] }));
    assert.ok(!DOSE_UNIT_RE.test(html.replace(/<[^>]+>/g, " ")), `card ${q.slug}`);
  }
});

test("rendered page is accessible: labelled radios in fieldsets, labelled deck filters, live score", () => {
  const html = renderToStaticMarkup(createElement(PracticeView, { questions: qs }));
  assert.match(html, /<fieldset/);
  assert.match(html, /<legend/);
  const inputs = html.match(/<input[^>]*id="([^"]+)"/g) ?? [];
  assert.ok(inputs.length >= 4);
  const selects = html.match(/<select[^>]*id="([^"]+)"/g) ?? [];
  assert.equal(selects.length, 2);
  for (const m of [...inputs, ...selects]) {
    const id = m.match(/id="([^"]+)"/)![1];
    assert.ok(html.includes(`for="${id}"`), `label for ${id}`);
  }
  // The first question's group name carries the progress and the pair, for focus after Next.
  assert.match(html, /<fieldset[^>]*aria-labelledby="practice-progress practice-pair [^"]+"/);
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

test("deck filters offer only the enzymes and grades the cards carry", () => {
  assert.deepEqual(deckFacets(mini), { enzymes: ["CYP2C9", "CYP2C19", "CYP3A4"], grades: ["contraindicated", "major", "moderate"] });
  const real = deckFacets(qs);
  assert.ok(real.enzymes.includes("CYP3A4"));
  for (const e of real.enzymes) assert.ok(qs.some((q) => q.enzymes.includes(e)), e);
  for (const g of real.grades) assert.ok(practiceDeck(qs, { grade: g }).cards.length > 0, g);
});

test("deck filters narrow by enzyme and grade, and ignore values no card has", () => {
  assert.deepEqual(slugs(practiceDeck(mini, { enzyme: "CYP3A4" }).cards), ["a"]);
  assert.deepEqual(slugs(practiceDeck(mini, { grade: "contraindicated" }).cards), ["a", "c"]);
  assert.deepEqual(slugs(practiceDeck(mini, { enzyme: "CYP2C9", grade: "contraindicated" }).cards), ["c"]);
  assert.deepEqual(practiceDeck(mini, { enzyme: "CYP2C9", grade: "major" }).cards, []);
  // Well-formed but absent from these cards: dropped, so the link still opens the whole deck.
  const stale = practiceDeck(mini, { enzyme: "CYP2D6", grade: "minor" });
  assert.equal(stale.enzyme, undefined);
  assert.equal(stale.grade, undefined);
  assert.equal(stale.cards.length, mini.length);
  const real = practiceDeck(qs, { enzyme: "CYP3A4", grade: "contraindicated" });
  assert.ok(real.cards.length > 0 && real.cards.every((q) => q.enzymes.includes("CYP3A4") && q.gradeLabel === "Avoid together"));
});

test("search params: valid filters pass; invalid, unknown or wrong-typed values are dropped, never thrown", () => {
  assert.deepEqual(parsePracticeSearch({ enzyme: "CYP3A4", grade: "major" }), { enzyme: "CYP3A4", grade: "major" });
  assert.deepEqual(parsePracticeSearch({ enzyme: "CYP2D6", utm_source: "lms" }), { enzyme: "CYP2D6" });
  assert.deepEqual(parsePracticeSearch({ enzyme: "CYP1A2", grade: "severe" }), { enzyme: "CYP1A2", grade: undefined });
  for (const raw of [{ grade: "Avoid together" }, { grade: null }, { enzyme: 42 }, { enzyme: ["CYP3A4"] }, null, undefined, "enzyme=CYP3A4", 7]) {
    const s = parsePracticeSearch(raw);
    assert.equal(s.enzyme, undefined, JSON.stringify(raw));
    assert.equal(s.grade, undefined, JSON.stringify(raw));
  }
  // A mistyped enzyme parses but matches no card, so the deck falls back to every card.
  assert.equal(practiceDeck(qs, parsePracticeSearch({ enzyme: "CYP9Z9" })).cards.length, qs.length);
});

test("sessions: seeded order, at most ten cards, due cards first with the most overdue first", () => {
  const first = sessionCards(qs, FIRST_SESSION_SEED);
  assert.equal(first.length, SESSION_SIZE);
  assert.equal(new Set(slugs(first)).size, SESSION_SIZE);
  assert.deepEqual(slugs(sessionCards(qs, FIRST_SESSION_SEED)), slugs(first));
  assert.notDeepEqual(slugs(sessionCards(qs, "another seed")), slugs(first));
  assert.deepEqual(slugs(sessionCards(mini, "x")).sort(), ["a", "b", "c", "d"]);

  const now = 1_000 * DAY;
  const marks: Record<string, StudyMark> = {
    b: { mark: "miss", nextReview: now - 500, streak: 0 },
    d: { mark: "miss", nextReview: now - 100, streak: 0 },
    a: { mark: "got", nextReview: now - DAY, streak: 2 }, // its wait ended a day ago
    c: { mark: "got", nextReview: now + DAY, streak: 1 }, // not due yet
  };
  assert.deepEqual(slugs(sessionCards(mini, "x", marks, now)), ["a", "b", "d", "c"]);
  // Without marks nothing jumps the queue.
  assert.deepEqual(slugs(sessionCards(mini, "x", {}, now)), slugs(sessionCards(mini, "x")));
});

test("session summary: score, accuracy by enzyme weakest first, missed pairs in session order", () => {
  const [a, b, c, d] = mini as [PracticeQuestion, PracticeQuestion, PracticeQuestion, PracticeQuestion];
  const a2 = card("a2", "Avoid together", ["CYP3A4"]);
  const b2 = card("b2", "Avoid together", ["CYP2C19"]);
  const s = sessionSummary([
    { q: a, all: true }, { q: b, all: false }, { q: a2, all: false }, { q: d, all: false }, { q: c, all: true }, { q: b2, all: false },
  ]);
  assert.equal(s.correct, 2);
  assert.equal(s.answered, 6);
  assert.deepEqual(s.byEnzyme, [
    { enzyme: "CYP2C19", correct: 0, answered: 2 }, // 0%, two misses
    { enzyme: NO_ENZYME, correct: 0, answered: 1 }, // 0%, one miss
    { enzyme: "CYP3A4", correct: 1, answered: 2 },
    { enzyme: "CYP2C9", correct: 1, answered: 1 },
  ]);
  assert.deepEqual(slugs(s.missed), ["b", "a2", "d", "b2"]);
  assert.deepEqual(sessionSummary([]), { correct: 0, answered: 0, byEnzyme: [], missed: [] });
});

test("review marks: fully right is got (back in a day), anything wrong is miss (due now)", () => {
  const now = 5 * DAY;
  const got = markAnswer({}, "a", true, now);
  assert.deepEqual(got.a, { mark: "got", nextReview: now + DAY, streak: 1 });
  assert.deepEqual(markAnswer(got, "a", true, now).a, { mark: "got", nextReview: now + 3 * DAY, streak: 2 });
  const miss = markAnswer(got, "a", false, now + 1);
  assert.deepEqual(miss.a, { mark: "miss", nextReview: now + 1, streak: 0 });
  assert.equal(got.a!.mark, "got", "the earlier marks object is not mutated");
});

test("review marks persist per device and fall back to none on corrupt or blocked storage", () => {
  const mem = new Map<string, string>();
  const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  const now = 10 * DAY;
  const marks = markAnswer(markAnswer({}, "a", true, now), "b", false, now);
  saveMarks(st, marks);
  assert.ok(mem.has(MARKS_KEY));
  assert.notEqual(MARKS_KEY, SCORE_KEY);
  assert.deepEqual(loadMarks(st, now), marks);
  for (const bad of ["garbage", "null", "42", "[]", '{"a":{"mark":"maybe"}}']) {
    mem.set(MARKS_KEY, bad);
    assert.deepEqual(loadMarks(st, now), {}, bad);
  }
  // Rows are validated with normalizeStudyMarks: older string marks and bad fields are repaired, not trusted.
  mem.set(MARKS_KEY, JSON.stringify({ a: "miss", b: { mark: "got", nextReview: "soon", streak: -3 } }));
  assert.deepEqual(loadMarks(st, now), { a: { mark: "miss", nextReview: now, streak: 0 }, b: { mark: "got", nextReview: now + DAY, streak: 1 } });
  assert.deepEqual(loadMarks(undefined), {});
  const blocked = { getItem: (): string | null => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("QuotaExceededError"); } };
  assert.deepEqual(loadMarks(blocked), {});
  assert.doesNotThrow(() => saveMarks(blocked, marks));
});

test("first render is deterministic and follows the search, so server and browser markup match", () => {
  const render = (search: { enzyme?: string; grade?: "contraindicated" }) => renderToStaticMarkup(createElement(PracticeView, { questions: qs, search }));
  const html = render({ enzyme: "CYP2D6" });
  assert.equal(html, render({ enzyme: "CYP2D6" }));
  const deck = practiceDeck(qs, { enzyme: "CYP2D6" }).cards;
  const lead = sessionCards(deck, FIRST_SESSION_SEED)[0]!;
  assert.ok(html.includes(asHtml(`${lead.nameA} + ${lead.nameB}`)), lead.slug);
  assert.ok(html.includes(`${deck.length} cards in this deck`));
  assert.ok(html.includes(`Card 1 of ${Math.min(SESSION_SIZE, deck.length)}`));
  assert.match(html, /<option value="CYP2D6" selected="">/);
  // Only enzymes and grades in the question set are offered.
  const offered = [...html.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]).filter(Boolean);
  const facets = deckFacets(qs);
  assert.deepEqual(offered, [...facets.enzymes, ...facets.grades]);
  // An unknown enzyme opens the full deck with "All enzymes" selected.
  const all = render({ enzyme: "CYP9Z9" });
  assert.ok(all.includes(`${qs.length} cards in this deck`));
  assert.match(all, /<option value="" selected="">All enzymes<\/option>/);
});
