/**
 * Practice mode: quiz questions built only from existing pair pages (gold set + label pins).
 * Adds no pairs, grades, enzyme strengths or dose text. Educational recall practice only.
 */
import { pairPages, type PairPage } from "@/lib/seo/pair-pages";
import { analyze } from "@/lib/drugs/engine";
import { bySeed } from "@/lib/drugs/learn/learn-order";
import { isDue, normalizeStudyMarks, scheduleStudyMark, type StudyMark } from "@/lib/drugs/study-marks";
import { GLOSSARY_BY_ID } from "@/lib/learn/glossary";
import { SEVERITY_LABEL, type Severity } from "@/lib/drugs/types";
import { GRADES, type PracticeSearch } from "./practice-meta";

export { PRACTICE_DESCRIPTION, PRACTICE_TITLE, parsePracticeSearch, type PracticeSearch } from "./practice-meta";

export type EnzymeRole = "inhibitor" | "inducer" | "substrate";

export interface PracticeQuestion {
  slug: string;
  nameA: string;
  nameB: string;
  gradeLabel: string;
  /** Enzymes on the pair's top finding (engine list). Empty → no enzyme question. */
  enzymes: string[];
  /** Role of drug A at enzymes[0] from the engine's burden table, only when it has exactly one role there. */
  roleA: EnzymeRole | null;
  quote: { labelDrug: string; labelSection: string; quote: string; url: string } | null;
}

export const GRADE_CHOICES: string[] = GRADES.map((s) => SEVERITY_LABEL[s]);
export const ROLE_CHOICES: EnzymeRole[] = ["inhibitor", "inducer", "substrate"];

/** Glossary entries (deep link /glossary#<id>) for what a revealed card names: its role, enzyme and grade words. */
export function glossaryLinks(q: Pick<PracticeQuestion, "gradeLabel" | "enzymes" | "roleA">): { id: string; label: string }[] {
  const ids = [
    q.roleA,
    q.enzymes.some((e) => e.startsWith("CYP")) ? "cytochrome-p450" : null,
    q.enzymes.includes("P-gp") ? "p-glycoprotein" : null,
    q.gradeLabel === SEVERITY_LABEL.contraindicated ? "contraindication" : null,
  ];
  return [...new Set(ids)].flatMap((id) => (id && GLOSSARY_BY_ID[id] ? [{ id, label: GLOSSARY_BY_ID[id].term }] : []));
}

/** Dose-unit guard shared by the question filter and the tests. */
export const DOSE_UNIT_RE = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g\/kg|mg\/kg|units?|IU|mEq|mL)\b|\b(?:mg|mcg|g\/kg|mg\/kg|units?)\s*\/\s*(?:kg|day|h|hr|dose)\b/i;

export function hasDoseText(s: string): boolean {
  return DOSE_UNIT_RE.test(s);
}

function roleOf(drugId: string, partnerId: string, enzyme: string): EnzymeRole | null {
  const b = analyze([drugId, partnerId]).burden.find((x) => x.enzyme === enzyme);
  if (!b) return null;
  const roles: EnzymeRole[] = [];
  if (b.inhibitors.includes(drugId)) roles.push("inhibitor");
  if (b.inducers.includes(drugId)) roles.push("inducer");
  if (b.substrates.includes(drugId)) roles.push("substrate");
  return roles.length === 1 ? roles[0]! : null;
}

export function toQuestion(p: PairPage): PracticeQuestion | null {
  if (p.severity === "none" || !p.quote) return null;
  const q = { labelDrug: p.quote.labelDrug, labelSection: p.quote.labelSection, quote: p.quote.quote, url: p.quote.url };
  if ([q.quote, q.labelSection, p.nameA, p.nameB].some(hasDoseText)) return null;
  const enzymes = [...p.enzymes];
  return {
    slug: p.slug,
    nameA: p.nameA,
    nameB: p.nameB,
    gradeLabel: p.severityLabel,
    enzymes,
    roleA: enzymes[0] ? roleOf(p.drugA, p.drugB, enzymes[0]) : null,
    quote: q,
  };
}

let cache: PracticeQuestion[] | null = null;
export function practiceQuestions(): PracticeQuestion[] {
  return (cache ??= pairPages().map(toQuestion).filter((q): q is PracticeQuestion => q !== null));
}

/** Enzyme options for a question: the right answer plus up to 3 others drawn from enzymes already in the question set. */
export function enzymeChoices(q: PracticeQuestion, pool: string[], seed: number): string[] {
  const answer = q.enzymes[0];
  if (!answer) return [];
  const others = [...new Set(pool)].filter((e) => e !== answer).sort();
  const picked: string[] = [];
  for (let i = 0; i < others.length && picked.length < 3; i++) picked.push(others[(seed + i * 7) % others.length]!);
  return [...new Set([answer, ...picked])].sort();
}

export interface PracticeScore { answered: number; correct: number }
export const SCORE_KEY = "firstpass.practice.score.v1";

export function loadScore(storage: Pick<Storage, "getItem"> | undefined): PracticeScore {
  try {
    const raw = storage?.getItem(SCORE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (v && Number.isInteger(v.answered) && Number.isInteger(v.correct) && v.correct >= 0 && v.correct <= v.answered) return v;
  } catch { /* ignore */ }
  return { answered: 0, correct: 0 };
}

export function saveScore(storage: Pick<Storage, "setItem"> | undefined, s: PracticeScore): void {
  try { storage?.setItem(SCORE_KEY, JSON.stringify(s)); } catch { /* private mode etc. */ }
}

export function scoreAnswer(q: PracticeQuestion, a: { grade: string; enzyme?: string; role?: string }): { grade: boolean; enzyme: boolean | null; role: boolean | null; all: boolean } {
  const grade = a.grade === q.gradeLabel;
  const enzyme = q.enzymes.length ? a.enzyme === q.enzymes[0] : null;
  const role = q.roleA ? a.role === q.roleA : null;
  return { grade, enzyme, role, all: grade && enzyme !== false && role !== false };
}

/** Enzymes and grades that occur in the question set: the only values the deck filters offer. */
export function deckFacets(qs: PracticeQuestion[]): { enzymes: string[]; grades: Severity[] } {
  return {
    enzymes: [...new Set(qs.flatMap((q) => q.enzymes))].sort((a, b) => a.localeCompare(b, "en", { numeric: true })),
    grades: GRADES.filter((g) => qs.some((q) => q.gradeLabel === SEVERITY_LABEL[g])),
  };
}

/** The cards a search selects. A value that no card has is ignored, so an old or mistyped link still opens a deck. */
export function practiceDeck(qs: PracticeQuestion[], search: PracticeSearch): { enzyme?: string; grade?: Severity; cards: PracticeQuestion[] } {
  const facets = deckFacets(qs);
  const enzyme = facets.enzymes.find((e) => e === search.enzyme);
  const grade = facets.grades.find((g) => g === search.grade);
  const cards = qs.filter((q) => (!enzyme || q.enzymes.includes(enzyme)) && (!grade || q.gradeLabel === SEVERITY_LABEL[grade]));
  return { enzyme, grade, cards };
}

export const SESSION_SIZE = 10;
/** Fixed seed for the first session, so the server and the browser render the same first card. */
export const FIRST_SESSION_SEED = "practice";

/** Up to SESSION_SIZE cards in seeded order. Cards due in `marks` come first, most overdue first. */
export function sessionCards(deck: PracticeQuestion[], seed: string, marks: Record<string, StudyMark> = {}, now = Date.now()): PracticeQuestion[] {
  const order = bySeed(deck.map((q) => ({ id: q.slug, q })), seed).map((r) => r.q);
  const due = order.filter((q) => isDue(marks[q.slug], now)).sort((a, b) => marks[a.slug]!.nextReview - marks[b.slug]!.nextReview);
  return [...due, ...order.filter((q) => !isDue(marks[q.slug], now))].slice(0, SESSION_SIZE);
}

export interface CardResult { q: PracticeQuestion; all: boolean }
export interface EnzymeAccuracy { enzyme: string; correct: number; answered: number }
export const NO_ENZYME = "No enzyme listed";

/** End-of-session score, accuracy per enzyme (weakest first, then most misses), and the missed cards in session order. */
export function sessionSummary(results: CardResult[]): { correct: number; answered: number; byEnzyme: EnzymeAccuracy[]; missed: PracticeQuestion[] } {
  const groups = new Map<string, EnzymeAccuracy>();
  for (const { q, all } of results) {
    const enzyme = q.enzymes[0] ?? NO_ENZYME;
    const g = groups.get(enzyme) ?? { enzyme, correct: 0, answered: 0 };
    g.answered++;
    if (all) g.correct++;
    groups.set(enzyme, g);
  }
  const misses = (g: EnzymeAccuracy) => g.answered - g.correct;
  const byEnzyme = [...groups.values()].sort(
    (a, b) => a.correct * b.answered - b.correct * a.answered || misses(b) - misses(a) || a.enzyme.localeCompare(b.enzyme),
  );
  const missed = results.filter((r) => !r.all).map((r) => r.q);
  return { correct: results.length - missed.length, answered: results.length, byEnzyme, missed };
}

/** Spaced review per pair: a card answered fully right is "got", anything wrong is "miss" (due again now). */
export function markAnswer(marks: Record<string, StudyMark>, slug: string, all: boolean, now = Date.now()): Record<string, StudyMark> {
  return { ...marks, [slug]: scheduleStudyMark(marks[slug], all ? "got" : "miss", now) };
}

export const MARKS_KEY = "firstpass.practice.marks.v1";

export function loadMarks(storage: Pick<Storage, "getItem"> | undefined, now = Date.now()): Record<string, StudyMark> {
  try {
    const raw = storage?.getItem(MARKS_KEY);
    return raw ? normalizeStudyMarks(JSON.parse(raw), now) : {};
  } catch {
    return {};
  }
}

export function saveMarks(storage: Pick<Storage, "setItem"> | undefined, marks: Record<string, StudyMark>): void {
  try { storage?.setItem(MARKS_KEY, JSON.stringify(marks)); } catch { /* private mode etc. */ }
}

export const PRACTICE_INTRO =
  "Recall practice for students and trainees. Each card is a pair already on FirstPass with a quote from its FDA label. Pick your answers, then reveal the label text. This is a study aid, not a clinical tool. The Prescribing Information governs.";
