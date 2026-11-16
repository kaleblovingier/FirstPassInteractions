import { test } from "node:test";
import assert from "node:assert/strict";
import { Fragment, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { ENZYMES, SEVERITY_LABEL } from "@/lib/drugs/types";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { pairPages } from "@/lib/seo/pair-pages";
import type { StudyMark } from "@/lib/drugs/study-marks";
import {
  CLASS_MIN, DOSE_UNIT_RE, EMPTY_TALLY, FIRST_SESSION_SEED, GRADE_CHOICES, MARKS_KEY, NON_CLASS_LABELS, NO_ENZYME, PRACTICE_DESCRIPTION,
  PRACTICE_ENZYMES, PRACTICE_INTRO, PRACTICE_TITLE, SCORE_KEY, SESSION_SIZE, SET_MAX, classFacets, classKey, deckFacets, deckSearch,
  enzymeChoices, filtersOnly, glossaryLinks, hasDoseText, loadMarks, loadScore, markAnswer, normalizeSetParam, pairClasses,
  parsePracticeSearch, practiceDeck, practiceHref, practiceQuestions, saveMarks, saveScore, scoreAnswer, sessionCards, sessionOptions,
  sessionSummary, setLink, setSlugs, tidyClass, visitTally, type PracticeQuestion, type PracticeSearch,
} from "./practice";
import { PracticeView } from "@/components/learn/practice-view";

const qs = practiceQuestions();
const DAY = 86_400_000;
const card = (slug: string, gradeLabel: string, enzymes: string[] = [], classes: string[] = []): PracticeQuestion =>
  ({ slug, nameA: `${slug} drug`, nameB: "partner", gradeLabel, enzymes, roleA: null, classes, quote: null });
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
    // Classes come straight from the catalog rows of the pair's two drugs.
    const catalog = [p.drugA, p.drugB].map((id) => tidyClass(DRUG_BY_ID[id]!.cls));
    for (const c of q.classes) assert.ok(catalog.includes(c), `${q.slug}: ${c}`);
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
  assert.equal(selects.length, 3);
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
  assert.deepEqual(deckFacets(mini), { enzymes: ["CYP2C9", "CYP2C19", "CYP3A4"], grades: ["contraindicated", "major", "moderate"], classes: [] });
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
  // A mistyped enzyme is not one of the engine's enzymes: dropped at parse, so the deck falls back to every card.
  assert.deepEqual(parsePracticeSearch({ enzyme: "CYP9Z9" }), { enzyme: undefined });
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
  const render = (search: PracticeSearch) => renderToStaticMarkup(createElement(PracticeView, { questions: qs, search }));
  const html = render({ enzyme: "CYP2D6" });
  assert.equal(html, render({ enzyme: "CYP2D6" }));
  const deck = practiceDeck(qs, { enzyme: "CYP2D6" }).cards;
  const lead = sessionCards(deck, FIRST_SESSION_SEED)[0]!;
  assert.ok(html.includes(asHtml(`${lead.nameA} + ${lead.nameB}`)), lead.slug);
  assert.ok(html.includes(`${deck.length} cards in this deck`));
  assert.ok(html.includes(`Card 1 of ${Math.min(SESSION_SIZE, deck.length)}`));
  assert.match(html, /<option value="CYP2D6" selected="">/);
  // Only enzymes, grades and drug classes in the question set are offered.
  const offered = [...html.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]).filter(Boolean);
  const facets = deckFacets(qs);
  assert.deepEqual(offered, [...facets.enzymes, ...facets.grades, ...facets.classes.map((c) => c.key)]);
  // An unknown enzyme or class that slipped past the parser still opens the full deck with "All" selected.
  const all = render({ enzyme: "CYP9Z9", class: "no-such-class" } as unknown as PracticeSearch);
  assert.ok(all.includes(`${qs.length} cards in this deck`));
  assert.match(all, /<option value="" selected="">All enzymes<\/option>/);
  assert.match(all, /<option value="" selected="">All drug classes<\/option>/);
});

test("PRACTICE_ENZYMES (copied for the entry bundle) matches the engine's ENZYMES", () => {
  assert.deepEqual([...PRACTICE_ENZYMES], [...ENZYMES]);
});

test("search params: class and set are validated strictly; bad values are dropped, never thrown", () => {
  assert.deepEqual(parsePracticeSearch({ class: "azole-antifungal" }), { class: "azole-antifungal" });
  for (const bad of ["Azole antifungal", "azole antifungal", "-statin", "statin-", "a--b", "", "x".repeat(81), 7, ["statin"], null]) {
    assert.equal(parsePracticeSearch({ class: bad }).class, undefined, JSON.stringify(bad));
  }
  for (const bad of [42, null, ["a"], {}, "", ",,,", "Not A Slug", "../etc", "a b"]) {
    assert.equal(parsePracticeSearch({ set: bad }).set, undefined, JSON.stringify(bad));
  }
  // Keeps well-formed slugs in order, trims, drops bad ones and repeats.
  assert.equal(parsePracticeSearch({ set: "b-x, a-y ,BAD,b-x,,c-z" }).set, "b-x,a-y,c-z");
  // At most SET_MAX slugs.
  const many = Array.from({ length: 40 }, (_, i) => `pair-${i}`);
  const parsed = setSlugs(parsePracticeSearch({ set: many.join(",") }).set);
  assert.equal(parsed.length, SET_MAX);
  assert.deepEqual(parsed, many.slice(0, SET_MAX));
  assert.equal(normalizeSetParam("a,".repeat(10_000)), undefined, "over-long input is dropped whole");
  assert.equal(normalizeSetParam(`${"a".repeat(121)},ok`), "ok", "an over-long slug is dropped");
  // All four together; unknown keys ignored.
  assert.deepEqual(
    parsePracticeSearch({ enzyme: "CYP3A4", grade: "major", class: "statin", set: "a-b", ref: "x" }),
    { enzyme: "CYP3A4", grade: "major", class: "statin", set: "a-b" },
  );
});

test("drug classes: catalog cls with case and whitespace normalized, shelf notes left out", () => {
  assert.equal(tidyClass("  HIV   protease\tinhibitor "), "HIV protease inhibitor");
  assert.equal(classKey("  HIV   protease inhibitor "), "hiv-protease-inhibitor");
  assert.equal(classKey("hiv PROTEASE inhibitor"), classKey("HIV protease inhibitor"));
  assert.equal(classKey("COVID-19 antiviral (ritonavir-boosted)"), "covid-19-antiviral-ritonavir-boosted");
  const [a, b] = Object.values(DRUG_BY_ID).filter((d) => !NON_CLASS_LABELS.has(tidyClass(d.cls).toLowerCase()));
  assert.ok(a && b);
  const same = Object.values(DRUG_BY_ID).filter((d) => d.cls === a.cls);
  if (same.length > 1) assert.deepEqual(pairClasses([same[0]!.id, same[1]!.id]), [tidyClass(a.cls)], "one class per key");
  assert.deepEqual(pairClasses(["no-such-drug"]), []);
  for (const q of qs) for (const c of q.classes) assert.ok(!NON_CLASS_LABELS.has(c.toLowerCase()), q.slug);

  // Case and spacing variants count as one class; a card counts once per class; classes under CLASS_MIN cards are not offered.
  const fake = [
    card("p1", "Use care", [], ["Statin"]), card("p2", "Use care", [], ["statin "]), card("p3", "Use care", [], [" STATIN", "Statin"]),
    card("p4", "Use care", [], ["Rare class"]), card("p5", "Use care", [], ["Rare  class"]),
  ];
  assert.deepEqual(classFacets(fake), [{ key: "statin", label: "Statin", count: 3 }]);
  assert.equal(CLASS_MIN, 3);
  const real = classFacets(qs);
  assert.ok(real.length > 10, `got ${real.length}`);
  for (const f of real) {
    assert.ok(f.count >= CLASS_MIN, f.key);
    assert.equal(practiceDeck(qs, { class: f.key }).cards.length, f.count, f.key);
  }
  // No two different class labels share a URL key.
  const labels = new Map<string, Set<string>>();
  for (const q of qs) for (const c of q.classes) labels.set(classKey(c), (labels.get(classKey(c)) ?? new Set()).add(c.toLowerCase()));
  for (const [k, v] of labels) assert.equal(v.size, 1, `${k}: ${[...v].join(" | ")}`);
});

test("filters combine: enzyme, grade and drug class all narrow the deck", () => {
  const deckCards = [
    card("a", "Avoid together", ["CYP3A4"], ["Statin", "Azole antifungal"]),
    card("b", "Avoid together", ["CYP3A4"], ["Macrolide antibiotic"]),
    card("c", "Serious concern", ["CYP3A4"], ["Statin"]),
    card("d", "Avoid together", ["CYP2C9"], ["Statin"]),
    card("e", "Use care", [], ["Statin", "Macrolide antibiotic"]),
  ];
  assert.deepEqual(slugs(practiceDeck(deckCards, { class: "statin" }).cards), ["a", "c", "d", "e"]);
  assert.deepEqual(slugs(practiceDeck(deckCards, { class: "statin", enzyme: "CYP3A4" }).cards), ["a", "c"]);
  assert.deepEqual(slugs(practiceDeck(deckCards, { class: "statin", enzyme: "CYP3A4", grade: "contraindicated" }).cards), ["a"]);
  assert.deepEqual(practiceDeck(deckCards, { class: "statin", enzyme: "CYP2C9", grade: "major" }).cards, []);
  // Macrolide is on only two cards, so it is not a filter: the class value is ignored.
  const rare = practiceDeck(deckCards, { class: "macrolide-antibiotic", grade: "contraindicated" });
  assert.equal(rare.cls, undefined);
  assert.deepEqual(slugs(rare.cards), ["a", "b", "d"]);
  // Real data: every combined card matches every filter.
  const real = practiceDeck(qs, { enzyme: "CYP3A4", grade: "contraindicated", class: "azole-antifungal" });
  assert.equal(real.cls, "azole-antifungal");
  assert.ok(real.cards.length > 0);
  for (const q of real.cards) {
    assert.ok(q.enzymes.includes("CYP3A4") && q.gradeLabel === SEVERITY_LABEL.contraindicated && q.classes.some((c) => classKey(c) === "azole-antifungal"), q.slug);
  }
  assert.deepEqual(deckSearch(real), { enzyme: "CYP3A4", grade: "contraindicated", class: "azole-antifungal" });
  assert.deepEqual(deckSearch({}), {});
});

test("practice sets: existing slugs only, in link order, deduped, at most SET_MAX; filters off while a set is open", () => {
  const set = practiceDeck(mini, { set: "c,zz-missing,a,c,b", enzyme: "CYP3A4" });
  assert.deepEqual(set.set, ["c", "a", "b"]);
  assert.deepEqual(slugs(set.cards), ["c", "a", "b"]);
  assert.equal(set.enzyme, undefined, "filters are off while a set is open");
  // A set with no existing slug is ignored and the filters apply.
  const none = practiceDeck(mini, { set: "zz-missing,yy-missing", enzyme: "CYP3A4" });
  assert.equal(none.set, undefined);
  assert.deepEqual(slugs(none.cards), ["a"]);
  // Real data, through the parser: order kept, dupes and unknowns dropped, capped.
  const real = qs.slice(0, 30).map((q) => q.slug).reverse();
  const raw = [real[0], "not-a-pair-at-all", real[1], real[0], ...real.slice(2)].join(",");
  const deck = practiceDeck(qs, parsePracticeSearch({ set: raw }));
  assert.ok(deck.set && deck.set.length <= SET_MAX);
  assert.deepEqual(deck.set, real.slice(0, deck.set.length));
  // Sessions on a set keep its order and hold the whole set.
  assert.deepEqual(sessionOptions(deck), { ordered: true, size: SET_MAX });
  assert.deepEqual(sessionOptions({}), {});
  assert.deepEqual(slugs(sessionCards(deck.cards, FIRST_SESSION_SEED, {}, undefined, sessionOptions(deck))), deck.set);
  assert.deepEqual(slugs(sessionCards(deck.cards, "other seed", {}, undefined, sessionOptions(deck))), deck.set);
  // Due cards still come first in a set (spaced review stays on), the rest keep the set's order.
  const now = 100 * DAY;
  const marks: Record<string, StudyMark> = { [deck.set[3]!]: { mark: "miss", nextReview: now - 1, streak: 0 } };
  const due = slugs(sessionCards(deck.cards, "x", marks, now, sessionOptions(deck)));
  assert.equal(due[0], deck.set[3]);
  assert.deepEqual(due.slice(1), deck.set.filter((s) => s !== deck.set![3]));
});

test("set links and hrefs: first SET_MAX distinct cards as ?set=, filters kept when a set is cleared", () => {
  const cards = qs.slice(0, 30);
  const link = setLink("https://example.test/", cards);
  assert.match(link, /^https:\/\/example\.test\/practice\?set=[a-z0-9,-]+$/);
  const round = practiceDeck(qs, parsePracticeSearch({ set: new URL(link).searchParams.get("set") }));
  assert.deepEqual(round.set, slugs(cards.slice(0, SET_MAX)));
  assert.equal(setLink("https://x.test", [mini[0]!, mini[0]!, mini[1]!]), "https://x.test/practice?set=a,b");
  assert.equal(setLink("https://x.test", []), "https://x.test/practice");
  assert.equal(practiceHref({}), "/practice");
  assert.equal(practiceHref({ enzyme: "P-gp", grade: "major", class: "statin" }), "/practice?enzyme=P-gp&grade=major&class=statin");
  assert.equal(practiceHref({ enzyme: "P-gp", set: "a,b" }), "/practice?set=a,b");
  assert.deepEqual(filtersOnly({ enzyme: "P-gp", set: "a,b" }), { enzyme: "P-gp" });
  assert.equal(practiceHref(filtersOnly({ class: "statin", set: "a,b" })), "/practice?class=statin");
});

test("visit tally: counts answers and full rights, resets to zero, never touches storage", () => {
  let t = EMPTY_TALLY;
  t = visitTally(t, { type: "answer", all: true });
  t = visitTally(t, { type: "answer", all: false });
  t = visitTally(t, { type: "answer", all: true });
  assert.deepEqual(t, { answered: 3, correct: 2 });
  assert.deepEqual(visitTally(t, { type: "reset" }), { answered: 0, correct: 0 });
  assert.deepEqual(EMPTY_TALLY, { answered: 0, correct: 0 }, "the empty tally is not mutated");
  const src = readFileSync("src/lib/learn/practice.ts", "utf8");
  const body = src.slice(src.indexOf("export function visitTally"), src.indexOf("export interface CardResult"));
  assert.ok(body.length > 0 && !/storage|localStorage|fetch/i.test(body));
});

test("rendered page: set banner, clear link, copy button, visit tally, labelled class filter", () => {
  const plain = renderToStaticMarkup(createElement(PracticeView, { questions: qs }));
  assert.match(plain, /This visit: 0 of 0 fully right/);
  assert.match(plain, />Start over</);
  assert.match(plain, />Copy set link</);
  assert.match(plain, /data-testid="practice-copy-status"[^>]*>|aria-live="polite"[^>]*data-testid="practice-copy-status"/);
  assert.match(plain, /Drug class \(either drug in the pair\)/);
  assert.ok(!plain.includes("practice-set-banner"));
  // The copy button names what it copies.
  assert.match(plain, /aria-describedby="[^"]+-hint"/);
  assert.match(plain, /Copies a link to the first 25 cards in this deck/);

  const set = slugs(qs.slice(3, 7));
  const html = renderToStaticMarkup(createElement(PracticeView, { questions: qs, search: parsePracticeSearch({ set: [...set, "nope-nope"].join(","), class: "statin" }) }));
  assert.match(html, /Practice set: 4 questions/);
  assert.match(html, /href="\/practice\?class=statin"[^>]*data-testid="practice-clear-set"/);
  assert.ok(!/<select/.test(html), "filters are hidden while a set is open");
  assert.ok(html.includes(`Card 1 of ${set.length}`));
  const lead = qs[3]!;
  assert.ok(html.includes(asHtml(`${lead.nameA} + ${lead.nameB}`)), "the set's first card leads");
  assert.match(html, /Copies a link to all 4 cards in this deck/);
  const one = renderToStaticMarkup(createElement(PracticeView, { questions: qs, search: { set: qs[0]!.slug } }));
  assert.match(one, /Practice set: 1 question</);
});

test("a revealed card links the glossary entries for its role, enzyme and grade words", () => {
  const base = { gradeLabel: "Major", enzymes: ["CYP3A4"], roleA: "inhibitor" as const };
  assert.deepEqual(glossaryLinks(base).map((g) => g.id), ["inhibitor", "cytochrome-p450"]);
  assert.deepEqual(glossaryLinks({ gradeLabel: SEVERITY_LABEL.contraindicated, enzymes: ["P-gp"], roleA: null }).map((g) => g.id), ["p-glycoprotein", "contraindication"]);
  assert.deepEqual(glossaryLinks({ gradeLabel: "Minor", enzymes: [], roleA: null }), []);
});
