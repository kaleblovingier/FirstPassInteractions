/**
 * Practice mode: quiz questions built only from existing pair pages (gold set + label pins).
 * Adds no pairs, grades, enzyme strengths or dose text. Educational recall practice only.
 */
import { pairPages, type PairPage } from "@/lib/seo/pair-pages";
import { analyze } from "@/lib/drugs/engine";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { bySeed } from "@/lib/drugs/learn/learn-order";
import { isDue, normalizeStudyMarks, scheduleStudyMark, type StudyMark } from "@/lib/drugs/study-marks";
import { GLOSSARY_BY_ID } from "@/lib/learn/glossary";
import { SEVERITY_LABEL, type Severity } from "@/lib/drugs/types";
import { GRADES, PRACTICE_ENZYMES, SET_MAX, setSlugs, type PracticeSearch } from "./practice-meta";

export {
  PRACTICE_DESCRIPTION, PRACTICE_ENZYMES, PRACTICE_TITLE, SET_MAX, normalizeSetParam, parsePracticeSearch, setSlugs, type PracticeSearch,
} from "./practice-meta";

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
  /** Catalog drug classes (Drug.cls) of the two drugs: whitespace tidied, one per classKey, shelf-note placeholders left out. */
  classes: string[];
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

/** Catalog `cls` values that are shelf notes, not drug classes, so they are never offered as a class filter. */
export const NON_CLASS_LABELS = new Set(["named on a stored label", "fda table 1 example"]);

/** Class label with whitespace tidied: trimmed, runs of spaces collapsed. */
export function tidyClass(cls: string): string {
  return cls.trim().replace(/\s+/g, " ");
}

/** URL key for a drug class: case and whitespace normalized, then slugged (`HIV protease inhibitor` → `hiv-protease-inhibitor`). */
export function classKey(cls: string): string {
  return tidyClass(cls).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Drug classes for a pair from the catalog, one per key, drug A's first. */
export function pairClasses(drugIds: string[]): string[] {
  const out = new Map<string, string>();
  for (const id of drugIds) {
    const cls = DRUG_BY_ID[id]?.cls;
    if (!cls) continue;
    const label = tidyClass(cls);
    const key = classKey(label);
    if (!key || NON_CLASS_LABELS.has(label.toLowerCase()) || out.has(key)) continue;
    out.set(key, label);
  }
  return [...out.values()];
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
    classes: pairClasses([p.drugA, p.drugB]),
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

/** Fewest cards a drug class needs before the deck offers it as a filter. */
export const CLASS_MIN = 3;

export interface ClassFacet { key: string; label: string; count: number }

/** Drug classes on at least CLASS_MIN cards, sorted by label. A card counts once per class, even when both drugs share it. */
export function classFacets(qs: PracticeQuestion[]): ClassFacet[] {
  const byKey = new Map<string, ClassFacet>();
  for (const q of qs) {
    for (const key of new Set(q.classes.map(classKey))) {
      const f = byKey.get(key) ?? { key, label: tidyClass(q.classes.find((c) => classKey(c) === key)!), count: 0 };
      f.count++;
      byKey.set(key, f);
    }
  }
  return [...byKey.values()]
    .filter((f) => f.count >= CLASS_MIN)
    .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base", numeric: true }));
}

/** Enzymes, grades and drug classes that occur in the question set: the only values the deck filters offer. */
export function deckFacets(qs: PracticeQuestion[]): { enzymes: string[]; grades: Severity[]; classes: ClassFacet[] } {
  return {
    enzymes: [...new Set(qs.flatMap((q) => q.enzymes))].sort((a, b) => a.localeCompare(b, "en", { numeric: true })),
    grades: GRADES.filter((g) => qs.some((q) => q.gradeLabel === SEVERITY_LABEL[g])),
    classes: classFacets(qs),
  };
}

export interface PracticeDeck {
  enzyme?: string;
  grade?: Severity;
  /** Class key, when a drug-class filter is on. */
  cls?: string;
  /** Slugs of a shared practice set, in the link's order. When present, the deck is exactly these cards and the filters are off. */
  set?: string[];
  cards: PracticeQuestion[];
}

/**
 * The cards a search selects. A value that no card has is ignored, so an old or mistyped link still opens a deck.
 * A `set` keeps only slugs of existing cards, in the link's order, deduped, at most SET_MAX; if none is left the filters apply.
 */
export function practiceDeck(qs: PracticeQuestion[], search: PracticeSearch): PracticeDeck {
  const bySlug = new Map(qs.map((q) => [q.slug, q]));
  const setCards = [...new Set(setSlugs(search.set))].flatMap((s) => bySlug.get(s) ?? []).slice(0, SET_MAX);
  if (setCards.length) return { set: setCards.map((q) => q.slug), cards: setCards };
  const facets = deckFacets(qs);
  const enzyme = facets.enzymes.find((e) => e === search.enzyme);
  const grade = facets.grades.find((g) => g === search.grade);
  const cls = facets.classes.find((c) => c.key === search.class)?.key;
  const cards = qs.filter(
    (q) =>
      (!enzyme || q.enzymes.includes(enzyme)) &&
      (!grade || q.gradeLabel === SEVERITY_LABEL[grade]) &&
      (!cls || q.classes.some((c) => classKey(c) === cls)),
  );
  return { enzyme, grade, cls, cards };
}

/** A search's filters without its set, with unset filters left out (for "Clear set"). */
export function filtersOnly(search: PracticeSearch): PracticeSearch {
  const s: PracticeSearch = {};
  if (search.enzyme) s.enzyme = search.enzyme;
  if (search.grade) s.grade = search.grade;
  if (search.class) s.class = search.class;
  return s;
}

/** The search a deck's own (applied) filters stand for, with unset filters left out. */
export function deckSearch(deck: Pick<PracticeDeck, "enzyme" | "grade" | "cls">): PracticeSearch {
  return filtersOnly({ enzyme: PRACTICE_ENZYMES.find((e) => e === deck.enzyme), grade: deck.grade, class: deck.cls });
}

/** Same-site address for a search: `/practice?set=a,b` for a set, else its filters, e.g. `/practice?enzyme=CYP3A4&class=statin`. */
export function practiceHref(search: PracticeSearch): string {
  const parts: string[] = [];
  if (search.set) parts.push(`set=${setSlugs(search.set).map(encodeURIComponent).join(",")}`);
  else {
    if (search.enzyme) parts.push(`enzyme=${encodeURIComponent(search.enzyme)}`);
    if (search.grade) parts.push(`grade=${encodeURIComponent(search.grade)}`);
    if (search.class) parts.push(`class=${encodeURIComponent(search.class)}`);
  }
  return parts.length ? `/practice?${parts.join("&")}` : "/practice";
}

/** Shareable link to a fixed set: the first SET_MAX distinct cards given, in their order. */
export function setLink(origin: string, cards: Pick<PracticeQuestion, "slug">[]): string {
  const slugs = [...new Set(cards.map((q) => q.slug))].slice(0, SET_MAX);
  return `${origin.replace(/\/+$/, "")}${practiceHref({ set: slugs.join(",") || undefined })}`;
}

export const SESSION_SIZE = 10;
/** Fixed seed for the first session, so the server and the browser render the same first card. */
export const FIRST_SESSION_SEED = "practice";

export interface SessionOptions {
  /** Keep the deck's own order instead of shuffling by seed (a shared set). */
  ordered?: boolean;
  /** Cards per session; SESSION_SIZE by default. */
  size?: number;
}

/** Session options for a deck: a shared set runs whole, in its own order. */
export function sessionOptions(deck: Pick<PracticeDeck, "set">): SessionOptions {
  return deck.set ? { ordered: true, size: SET_MAX } : {};
}

/** Up to `size` cards in seeded order (or deck order when `ordered`). Cards due in `marks` come first, most overdue first. */
export function sessionCards(
  deck: PracticeQuestion[], seed: string, marks: Record<string, StudyMark> = {}, now = Date.now(), opts: SessionOptions = {},
): PracticeQuestion[] {
  const order = opts.ordered ? [...deck] : bySeed(deck.map((q) => ({ id: q.slug, q })), seed).map((r) => r.q);
  const due = order.filter((q) => isDue(marks[q.slug], now)).sort((a, b) => marks[a.slug]!.nextReview - marks[b.slug]!.nextReview);
  return [...due, ...order.filter((q) => !isDue(marks[q.slug], now))].slice(0, opts.size ?? SESSION_SIZE);
}

/** Running tally for this visit only: React state, never stored or sent. */
export type VisitAction = { type: "answer"; all: boolean } | { type: "reset" };
export const EMPTY_TALLY: PracticeScore = { answered: 0, correct: 0 };

export function visitTally(state: PracticeScore, action: VisitAction): PracticeScore {
  if (action.type === "reset") return EMPTY_TALLY;
  return { answered: state.answered + 1, correct: state.correct + (action.all ? 1 : 0) };
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
