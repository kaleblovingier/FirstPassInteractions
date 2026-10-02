/**
 * Everyday copy for the exported / copied desk report ("Teaching handout").
 * Teaching handout for huddles only — not a chart note, not a dose, not a
 * go-ahead. Findings come from the engine and are never changed here; this
 * file only frames them in plain words. Product labeling and the prescriber govern.
 */

import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

/** Plain title first, scientific terms muted beside it. */
export const EXPORT_TITLE = {
  plainTitle: "Teaching handout",
  scientific: "Regimen report · CYP450 / PD findings",
} as const;

/** Short how-this-works note placed at the top of every exported report. */
export const EXPORT_COACH = {
  kicker: "How this works",
  body: "This handout lists what was on the tray, the person factors that were set, and each possible concern the desk found, with a short everyday explanation beside the technical wording.",
  use: "It is a teaching handout for team huddles and study, not a chart note or an order. Product labeling and the prescriber govern.",
} as const;

/** Plain section titles with the scientific term kept alongside. */
export const EXPORT_SECTIONS = {
  tray: { plainTitle: "What was on the tray", scientific: "Regimen" },
  person: { plainTitle: "About this person", scientific: "Host factors · metabolizer phenotype" },
  findings: { plainTitle: "What to talk through", scientific: "Findings · severity · mechanism" },
} as const;

/** Note under the person section: metabolizer rows are a known status, read as a CPIC teaching summary. */
export const EXPORT_PERSON_NOTE =
  "Metabolizer status is what the team already knew, picked by hand. The desk reads it as a teaching summary of CPIC guidance, not a genetic test result.";

/** Label for the overall ceiling line. */
export const EXPORT_HIGHEST_LABEL = "Biggest concern on this tray";

/** Empty state: a short or empty report is not a green light. */
export const EXPORT_EMPTY =
  "No possible concerns are mapped for this tray. A short or empty report is not a green light — this desk only knows a teaching list, and the label and prescriber still govern.";

/** Existing educational disclaimer line (kept verbatim from the prior report). */
export const EXPORT_DISCLAIMER = "Educational interaction reference. Not a substitute for clinical judgment.";

/** Footer under the findings. */
export const EXPORT_FOOTER =
  "Teaching only — not a dose, not a go-ahead, and not personal advice. Confirm against current FDA-approved labeling; the prescriber governs.";

/** Swap arrow shorthand for words so the handout reads aloud cleanly. */
export function arrowsToWords(text: string): string {
  return text
    .replace(/\s*(→|⇒|->)\s*/g, " leads to ")
    .replace(/\s*←\s*/g, " comes from ")
    .replace(/↑\s*/g, "higher ")
    .replace(/↓\s*/g, "lower ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export type ExportFinding = {
  severity: string;
  headline: string;
  plain: string;
  mechanism: string;
  clinical: string;
};

export type ExportReportInput = {
  names: string;
  person: { label: string; value: string }[];
  highestLabel: string;
  findings: ExportFinding[];
};

function heading(s: { plainTitle: string; scientific: string }): string {
  return `${s.plainTitle} (${s.scientific})`;
}

/** Plain-words text body for the copied "Report". Disclaimer and PI footer always included. */
export function buildExportReport(input: ExportReportInput): string {
  const lines: string[] = [
    `FirstPass · ${EXPORT_TITLE.plainTitle} (${EXPORT_TITLE.scientific})`,
    "",
    `${EXPORT_COACH.kicker}: ${EXPORT_COACH.body} ${EXPORT_COACH.use}`,
    "",
    heading(EXPORT_SECTIONS.tray),
    input.names || "Nothing on the tray",
    "",
    heading(EXPORT_SECTIONS.person),
    ...input.person.map((p) => `- ${p.label}: ${p.value}`),
    EXPORT_PERSON_NOTE,
    "",
    heading(EXPORT_SECTIONS.findings),
  ];
  if (!input.findings.length) {
    lines.push(EXPORT_EMPTY);
  } else {
    lines.push(`${EXPORT_HIGHEST_LABEL}: ${input.highestLabel}`, "");
    for (const f of input.findings) {
      lines.push(`- ${f.severity}: ${arrowsToWords(f.headline)}`);
      lines.push(`  In plain words: ${arrowsToWords(f.plain)}`);
      lines.push(`  How it happens: ${arrowsToWords(f.mechanism)}.`);
      lines.push(`  What the team watches: ${arrowsToWords(f.clinical)}`);
    }
  }
  lines.push("", EXPORT_FOOTER, EXPORT_DISCLAIMER, NOT_CLEARED, PI_FOOTER);
  return lines.join("\n");
}

/** One-line comment preamble for CSV / JSON downloads (data columns unchanged). */
export const EXPORT_FILE_NOTE = `${EXPORT_TITLE.plainTitle}: ${EXPORT_COACH.use} A short or empty report is not a green light.`;
