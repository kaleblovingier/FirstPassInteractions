/**
 * Practice mode: quiz questions built only from existing pair pages (gold set + label pins).
 * Adds no pairs, grades, enzyme strengths or dose text. Educational recall practice only.
 */
import { pairPages, type PairPage } from "@/lib/seo/pair-pages";
import { analyze } from "@/lib/drugs/engine";
import { SEVERITY_LABEL, type Severity } from "@/lib/drugs/types";

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

export const GRADE_CHOICES: string[] = (["contraindicated", "major", "moderate", "minor"] as Severity[]).map((s) => SEVERITY_LABEL[s]);
export const ROLE_CHOICES: EnzymeRole[] = ["inhibitor", "inducer", "substrate"];

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

export const PRACTICE_TITLE = "Practice: drug-pair recall | FirstPass";
export const PRACTICE_DESCRIPTION =
  "Study drug pairs from FDA label quotes. Guess the grade and the enzyme, then check the label text. Educational practice only.";
export const PRACTICE_INTRO =
  "Recall practice for students and trainees. Each card is a pair already on FirstPass with a quote from its FDA label. Pick your answers, then reveal the label text. This is a study aid, not a clinical tool. The Prescribing Information governs.";
