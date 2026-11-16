import { z } from "zod";
import type { Enzyme, Severity } from "@/lib/drugs/types";

// Kept apart from practice.ts: the route's search parser and head are in every page's entry bundle, and practice.ts pulls in the engine and pair pages.
export const GRADES = ["contraindicated", "major", "moderate", "minor"] as const satisfies readonly Severity[];
/** Same list as ENZYMES in drugs/types.ts (a test keeps them equal); copied so the entry bundle doesn't load that module. */
export const PRACTICE_ENZYMES = ["CYP1A2", "CYP2B6", "CYP2C8", "CYP2C9", "CYP2C19", "CYP2D6", "CYP2E1", "CYP3A4", "P-gp"] as const satisfies readonly Enzyme[];

/** Most cards a shared practice set holds. */
export const SET_MAX = 25;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 120;
const CLASS_MAX = 80;

/** `set=a,b,c` → well-formed slugs, first occurrence kept, in order, at most SET_MAX. Empty → undefined. */
export function normalizeSetParam(raw: string | undefined): string | undefined {
  if (!raw || raw.length > SET_MAX * (SLUG_MAX + 1) * 2) return undefined;
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const slug = part.trim();
    if (slug.length > SLUG_MAX || !SLUG_RE.test(slug) || out.includes(slug)) continue;
    out.push(slug);
    if (out.length === SET_MAX) break;
  }
  return out.length ? out.join(",") : undefined;
}

/** The slugs in a parsed `set` value. */
export function setSlugs(set: string | undefined): string[] {
  return set ? set.split(",") : [];
}

export interface PracticeSearch {
  enzyme?: (typeof PRACTICE_ENZYMES)[number];
  grade?: (typeof GRADES)[number];
  /** Drug-class key from classKey() in practice.ts, e.g. `azole-antifungal`. */
  class?: string;
  /** Comma-separated pair slugs of a shared practice set, already normalized by normalizeSetParam(). */
  set?: string;
}

const PRACTICE_SEARCH = z.object({
  enzyme: z.enum(PRACTICE_ENZYMES).optional().catch(undefined),
  grade: z.enum(GRADES).optional().catch(undefined),
  class: z.string().max(CLASS_MAX).regex(SLUG_RE).optional().catch(undefined),
  set: z.string().optional().catch(undefined).transform(normalizeSetParam),
});

/**
 * Deck filters and a shared set from the URL, e.g. `?enzyme=CYP3A4&grade=major&class=statin` or `?set=slug-a,slug-b`.
 * Malformed values are dropped, never thrown. Well-formed values that no card has are dropped later, by practiceDeck().
 */
export function parsePracticeSearch(raw: unknown): PracticeSearch {
  const r = PRACTICE_SEARCH.safeParse(raw);
  return r.success ? r.data : {};
}

export const PRACTICE_TITLE = "Practice: drug-pair recall | FirstPass";
export const PRACTICE_DESCRIPTION =
  "Study drug pairs from FDA label quotes. Guess the grade and the enzyme, then check the label text. Educational practice only.";
