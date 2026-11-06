/**
 * Workup mode: a student calls every drug pair in a regimen (a sample or a WORKUP_LISTS list), then compares the calls
 * with the desk's analyze() findings and their sources. Reuses SAMPLE_REGIMENS, the engine
 * and basis.ts; adds no finding, grade, source or dose text. Educational practice only.
 *
 * Grading choices:
 * - Only findings with exactly two drugIds and kind "pk" or "pd" are scored, once per pair.
 *   Gene, clinic and whole-regimen findings are listed after reveal as "Also on the desk".
 * - Calling "pk" or "pd" on a pair the desk maps is a hit whichever kind the desk found.
 *   The kind matches when the desk has a finding of the called kind (a pair can have both).
 * - A severity guess is compared with the pair's highest desk grade.
 * - An unanswered pair counts as "none".
 */
import { z } from "zod";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { parseDoses } from "@/lib/drugs/dosing";
import { analyze } from "@/lib/drugs/engine";
import { leadGradeBasis } from "@/lib/drugs/grade-provenance";
import { buildBriefUrl } from "@/lib/drugs/brief";
import { buildCaseUrl } from "@/lib/drugs/permalinks";
import { SAMPLE_REGIMENS, sampleNeedsPro, type SampleRegimen } from "@/lib/drugs/samples";
import { DEFAULT_HOST, SEVERITY_RANK, type Finding, type Severity } from "@/lib/drugs/types";
import { DOSE_PATTERN } from "@/lib/guards/dose-rule";
import { SITE_URL } from "@/lib/seo/pair-copy";
import { pairPages } from "@/lib/seo/pair-pages";
import { WORKUP_LISTS } from "./workup-cases";

export type PairCall = "none" | "pk" | "pd";
export interface PairAnswer {
  call: PairCall;
  severity?: Severity;
}

export interface WorkupDrug {
  id: string;
  name: string;
  cls: string;
}
export interface WorkupPair {
  key: string;
  /** Public `/pair/<slug>` page for this pair, when one exists. */
  pagePath?: string;
  a: WorkupDrug;
  b: WorkupDrug;
}
export interface WorkupCase {
  id: string;
  title: string;
  blurb: string;
  /** Desk permalink: `/?case=<id>` for a sample, else the `?brief=` link for the same medicines. */
  deskUrl: string;
  drugs: WorkupDrug[];
  pairs: WorkupPair[];
  /** analyze() findings with the host the desk uses for this sample. */
  findings: Finding[];
}

/** Unordered pairs in list order (0,1), (0,2), …, (1,2), …: n·(n−1)/2 of them. */
export function pairsOf<T>(items: T[]): [T, T][] {
  const out: [T, T][] = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) out.push([items[i], items[j]]);
  return out;
}

export const pairKey = (a: string, b: string) => [a, b].sort().join("|");

/** Pair key of a finding the grader scores, else null. */
export function scoredKey(f: Finding): string | null {
  return f.drugIds.length === 2 && (f.kind === "pk" || f.kind === "pd") ? pairKey(f.drugIds[0], f.drugIds[1]) : null;
}

const hasDose = (s: string) => s.search(DOSE_PATTERN) >= 0;

const pagePaths = () => new Map(pairPages().map((p) => [pairKey(p.drugA, p.drugB), `/pair/${p.slug}`]));

/** A free regimen with 3–6 items, at least one mapped and one unmapped pair, and no dose text anywhere the page shows it; else null. */
export function toWorkupCase(s: Omit<SampleRegimen, "lane">): WorkupCase | null {
  if (sampleNeedsPro(s as SampleRegimen) || s.drugIds.length < 3 || s.drugIds.length > 6) return null;
  const drugs = s.drugIds.map((id) => {
    const d = DRUG_BY_ID[id];
    return { id: d.id, name: d.name, cls: d.cls };
  });
  const paths = pagePaths();
  const pairs = pairsOf(drugs).map(([a, b]) => ({ key: pairKey(a.id, b.id), pagePath: paths.get(pairKey(a.id, b.id)), a, b }));
  const keys = new Set(pairs.map((p) => p.key));
  // Same host the desk loads for a free sample (permalinks.ts → store.load): defaults plus the sample's ketamine route.
  const host = { ...DEFAULT_HOST, ketamineRoute: s.ketamineRoute ?? DEFAULT_HOST.ketamineRoute };
  const findings = analyze(s.drugIds, host, parseDoses(s.doses)).findings;
  const scored = findings.filter((f) => keys.has(scoredKey(f) ?? ""));
  // Every pair mapped (or none) would let all-or-nothing answers score perfectly.
  if (!scored.length || new Set(scored.map(scoredKey)).size === pairs.length) return null;
  const shown = [
    s.title,
    s.blurb,
    ...drugs.flatMap((d) => [d.name, d.cls]),
    ...findings.flatMap((f) => [f.headline, f.mechanism, f.effect]),
    ...scored.flatMap((f) => {
      const b = leadGradeBasis(f);
      return [b.title, b.detail];
    }),
  ];
  if (shown.some(hasDose)) return null;
  return {
    id: s.id,
    title: s.title,
    blurb: s.blurb,
    deskUrl: (SAMPLE_REGIMENS.some((x) => x.id === s.id) ? buildCaseUrl(s.id, { base: SITE_URL }) : buildBriefUrl(s.drugIds, { base: SITE_URL })).replace(SITE_URL, ""),
    drugs,
    pairs,
    findings,
  };
}

let cache: WorkupCase[] | null = null;
export function workupCases(): WorkupCase[] {
  return (cache ??= [...SAMPLE_REGIMENS, ...WORKUP_LISTS].map(toWorkupCase).filter((c): c is WorkupCase => c !== null));
}

export const workupPath = (caseId: string) => `/workup?case=${encodeURIComponent(caseId)}`;

/** `?case=` must name an eligible case; anything else (unknown, empty, non-string) falls back to the picker. */
const searchSchema = z.object({
  case: z
    .string()
    .refine((id) => workupCases().some((c) => c.id === id))
    .optional()
    .catch(undefined),
});
export const parseWorkupSearch = (raw: Record<string, unknown>): { case?: string } => searchSchema.parse(raw);

export type PairOutcome = "found" | "missed" | "unmapped-call" | "none-agreed";
export interface PairResult {
  pair: WorkupPair;
  call: PairCall;
  severity?: Severity;
  /** The desk's scored findings for this pair, highest grade first. */
  findings: Finding[];
  outcome: PairOutcome;
  /** Found pairs only. */
  kindMatch: boolean | null;
  /** Found pairs with a severity guess only. */
  severityMatch: boolean | null;
}
export interface WorkupGrade {
  pairs: PairResult[];
  /** Pairs the desk maps. */
  interacting: number;
  found: number;
  missed: number;
  unmappedCalled: number;
  kindMatched: number;
  severityGuessed: number;
  severityMatched: number;
  /** Findings the grader does not score, in desk order. */
  also: Finding[];
}

export function gradeWorkup(c: Pick<WorkupCase, "pairs" | "findings">, answers: Record<string, PairAnswer | undefined>): WorkupGrade {
  const pairs = c.pairs.map((pair): PairResult => {
    const findings = c.findings
      .filter((f) => scoredKey(f) === pair.key)
      .sort((x, y) => SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity]);
    const { call, severity }: PairAnswer = answers[pair.key] ?? { call: "none" };
    const called = call !== "none";
    const outcome: PairOutcome = findings.length ? (called ? "found" : "missed") : called ? "unmapped-call" : "none-agreed";
    const found = outcome === "found";
    return {
      pair,
      call,
      severity: called ? severity : undefined,
      findings,
      outcome,
      kindMatch: found ? findings.some((f) => f.kind === call) : null,
      severityMatch: found && severity ? severity === findings[0].severity : null,
    };
  });
  const keys = new Set(c.pairs.map((p) => p.key));
  const count = (ok: (r: PairResult) => boolean) => pairs.filter(ok).length;
  return {
    pairs,
    interacting: count((r) => r.findings.length > 0),
    found: count((r) => r.outcome === "found"),
    missed: count((r) => r.outcome === "missed"),
    unmappedCalled: count((r) => r.outcome === "unmapped-call"),
    kindMatched: count((r) => r.kindMatch === true),
    severityGuessed: count((r) => r.severityMatch !== null),
    severityMatched: count((r) => r.severityMatch === true),
    also: c.findings.filter((f) => !keys.has(scoredKey(f) ?? "")),
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function summaryLine(g: WorkupGrade): string {
  const out = [`You found ${g.found} of ${plural(g.interacting, "interacting pair")}; ${g.unmappedCalled || "none"} more called that the desk does not map.`];
  if (g.found) out.push(`Your kind matched the desk on ${g.kindMatched} of ${g.found}.`);
  if (g.severityGuessed) out.push(`Your severity matched on ${g.severityMatched} of ${plural(g.severityGuessed, "guess", "guesses")}.`);
  return out.join(" ");
}

/** Cases checked on this device. Device-only: never sent anywhere. */
export const DONE_KEY = "firstpass.workup.v1";

export function loadDone(storage?: Pick<Storage, "getItem">): string[] {
  try {
    const v: unknown = JSON.parse((storage ?? localStorage).getItem(DONE_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveDone(ids: string[], storage?: Pick<Storage, "setItem">): void {
  try {
    (storage ?? localStorage).setItem(DONE_KEY, JSON.stringify(ids));
  } catch {
    /* private mode, storage blocked */
  }
}

export const WORKUP_TITLE = "Workup: find the interactions | FirstPass";
export const WORKUP_DESCRIPTION =
  "Work up a sample regimen as you would on rounds: call which drug pairs interact and how, then compare with the desk's findings and sources. Educational practice only.";
export const WORKUP_INTRO =
  "A study aid for clinicians and for medical, pharmacy, nursing, NP, PA and other health-professions students. Read the medicine list and call each pair: no interaction, a change in levels (PK, through enzymes or transporters), or an additive effect (PD). Then check your workup against the desk's findings and the source behind each one. It is not a clinical tool. The Prescribing Information governs.";
/** README wording. */
export const NOT_A_GREEN_LIGHT = "A short or empty list is not a green light. It only means nothing in the mapped set matched.";
