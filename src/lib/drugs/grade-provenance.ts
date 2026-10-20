/** "Why this grade" — the one-click basis a reviewer sees next to a severity tier.
 *  UI-only view over basisFor(): it never changes a grade and never adds a source.
 *  If no external source is on file, it says so plainly (catalog rule). */
import { basisFor, type FindingBasis } from "./basis";
import type { Finding } from "./types";

export type GradeBasisKind = "label" | "source" | "rule";

export interface GradeBasis {
  kind: GradeBasisKind;
  /** Short heading, e.g. "Zyvox label, Contraindications" or "Basis: catalog enzyme rule". */
  title: string;
  /** Quote or explanation, verbatim from basisFor(). */
  detail: string;
  /** DailyMed / FDA / PubMed / CPIC link when one is on file. */
  href?: string;
}

const LABEL_KINDS = new Set<FindingBasis["kind"]>(["fda-pi", "fda-boxed", "fda-warning"]);

/** Plain note for a row whose tier rests only on the desk's own rule. */
export function ruleNote(finding: Finding): GradeBasis {
  const enzyme = finding.kind === "pk" && finding.enzymes.length > 0;
  return {
    kind: "rule",
    title: enzyme ? "Basis: catalog enzyme rule" : "Basis: catalog rule",
    detail: enzyme
      ? `No FDA label quote is on file for this pair. The tier comes from the catalog's ${finding.enzymes.join(", ")} roles and the desk's severity rule, not from a cited source. Check the Prescribing Information.`
      : "No FDA label quote is on file for this pair. The tier comes from the desk's curated rule, not from a cited source. Check the Prescribing Information.",
  };
}

/** Every basis for a finding, in basisFor() order, as one-click "Why this grade" rows. */
export function gradeBases(finding: Finding): GradeBasis[] {
  const out: GradeBasis[] = [];
  for (const b of basisFor(finding)) {
    if (b.kind === "desk") continue;
    out.push({ kind: LABEL_KINDS.has(b.kind) ? "label" : "source", title: b.label, detail: b.detail, ...(b.href ? { href: b.href } : {}) });
  }
  return out.length ? out : [{ ...ruleNote(finding), ...deskHref(finding) }];
}

function deskHref(finding: Finding): { href?: string } {
  const desk = basisFor(finding).find((b) => b.kind === "desk");
  return desk?.href ? { href: desk.href } : {};
}

/** The single lead basis shown first. */
export function leadGradeBasis(finding: Finding): GradeBasis {
  return gradeBases(finding)[0]!;
}

/** True when the tier has a cited source (label or literature) with a link. */
export function hasCitedSource(finding: Finding): boolean {
  return gradeBases(finding).some((b) => b.kind !== "rule" && Boolean(b.href));
}
