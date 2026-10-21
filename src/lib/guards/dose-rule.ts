/**
 * Single source of truth for the "no administered dose in user-visible copy" rule.
 * Imported by the unit guard (dose-rule.test.ts) and the e2e dose check.
 */

/** Matches an administered amount: number (or range) + mg, mcg, g, grams, mEq, units, IU, mL,
 * including dosing rates (mg/min, mg/kg, mg/kg q8h, mcg/kg/min, units/kg/h), which ARE doses. Excludes concentrations and lab units (mg/dL, mEq/L, mcg/mL, mL/min). */
export const DOSE_PATTERN =
  /\b\d[\d,]*(?:\.\d+)?(?:\s*(?:[-–]|to)\s*\d[\d,]*(?:\.\d+)?)?\s*(?:(?:mg|mcg|µg|g|grams?|mEq|units?|IU)\b(?!\s*\/\s*(?:dL|L|mL|m2|1\.73)\b)|mL\b(?!\s*\/\s*(?:min|kg\/h|hr?|dL|L)\b))(?:\s*\/\s*(?:kg|min|hr?|hour|day|d)\b)*(?:\s+q\d+h\b)?/g;

/** Lab-value / non-dose units that are allowed (documented for reviewers; the pattern already skips them). */
export const NON_DOSE_UNITS = ["mg/dL", "mEq/L", "mcg/mL", "µg/mL", "mL/min", "mL/kg/h", "mmol/L"] as const;

/** Scanned: UI copy, clinical stations, cards, exports (clinical packet / EHR text). */
export const SCOPED_PATHS = ["src/components", "src/routes", "src/lib/drugs"] as const;

/** Never scanned. */
export const EXEMPT_PATHS = [
  // Exact FDA label quote data (pins, gold set, citations) — must stay verbatim.
  "src/lib/drugs/reference/",
  "src/lib/seo/pair-quote-sources.json",
  // Exempt only because these files are off-limits to edit in this repo
  // (pricing / checkout pages; they carry no clinical content).
  "src/routes/plans.tsx",
  "src/routes/stripe-return.tsx",
  // Education practice questions (study cards for trainees), not clinical guidance.
  "src/lib/drugs/study.ts",
] as const;

export const EXEMPT_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".spec.ts"] as const;

export const isExempt = (p: string) =>
  EXEMPT_PATHS.some((e) => p.includes(e)) || EXEMPT_FILE_SUFFIXES.some((s) => p.endsWith(s));

/** Lines that are code comments are not user-visible. */
export const isCommentLine = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

export function findDoses(source: string): { line: number; match: string }[] {
  const out: { line: number; match: string }[] = [];
  source.split("\n").forEach((l, i) => {
    if (isCommentLine(l)) return;
    const code = l.replace(/\s\/\/\s.*$/, "");
    for (const m of code.matchAll(DOSE_PATTERN)) out.push({ line: i + 1, match: m[0] });
  });
  return out;
}
