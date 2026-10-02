import { DRUG_BY_ID } from "./catalog";

export type QuickChip = { id: string; label: string; hint: string };

/** One-tap teaching starters under an empty search. */
export const SEARCH_QUICK_CHIPS: QuickChip[] = [
  { id: "ketamine", label: "Ketamine", hint: "First-pass victim" },
  { id: "grapefruit", label: "Grapefruit", hint: "Gut 3A4" },
  { id: "clarithromycin", label: "Clarithromycin", hint: "Strong 3A4" },
  { id: "paroxetine", label: "Paroxetine", hint: "Strong 2D6" },
  { id: "xylazine", label: "Xylazine", hint: "α2 street" },
  { id: "fentanyl", label: "Fentanyl", hint: "Opioid" },
  { id: "semaglutide", label: "Semaglutide", hint: "GLP-1" },
  { id: "warfarin", label: "Warfarin", hint: "NTI" },
];

/** Chips still available given what's already on the tray. */
export function availableQuickChips(selectedIds: string[], limit = 6): QuickChip[] {
  const on = new Set(selectedIds);
  return SEARCH_QUICK_CHIPS.filter((c) => DRUG_BY_ID[c.id] && !on.has(c.id)).slice(0, limit);
}

/** Free plain-words clipboard body for the current findings. */
export function plainWordsReport(
  names: string,
  findings: { severity: string; headline: string; plain: string }[],
  highestLabel: string,
): string {
  if (!findings.length) {
    return [
      `FirstPass · ${names || "empty desk"}`,
      "No mapped findings on this tray.",
      "An empty result is not proof a combination is safe.",
      "Educational model — not clinical decision support.",
    ].join("\n");
  }
  return [
    `FirstPass · ${names}`,
    `Highest concern: ${highestLabel}`,
    "",
    ...findings.map((f) => `• ${f.severity} — ${f.headline}. ${f.plain}`),
    "",
    "Educational model. Not a substitute for clinical decision support. An empty or partial map is not clearance.",
  ].join("\n");
}
