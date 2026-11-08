import { z } from "zod";
import type { Severity } from "@/lib/drugs/types";

// Kept apart from practice.ts: the route's search parser and head are in every page's entry bundle, and practice.ts pulls in the engine and pair pages.
export const GRADES = ["contraindicated", "major", "moderate", "minor"] as const satisfies readonly Severity[];

const PRACTICE_SEARCH = z
  .object({ enzyme: z.string().optional().catch(undefined), grade: z.enum(GRADES).optional().catch(undefined) })
  .catch({});
export type PracticeSearch = z.infer<typeof PRACTICE_SEARCH>;

/** Deck filters from the URL, e.g. `?enzyme=CYP3A4&grade=major`. Malformed values are dropped, never thrown. */
export function parsePracticeSearch(raw: unknown): PracticeSearch {
  return PRACTICE_SEARCH.parse(raw);
}

export const PRACTICE_TITLE = "Practice: drug-pair recall | FirstPass";
export const PRACTICE_DESCRIPTION =
  "Study drug pairs from FDA label quotes. Guess the grade and the enzyme, then check the label text. Educational practice only.";
