/** "Why this grade" — the one-click basis a reviewer sees next to a severity tier.
 *  UI-only view over basisFor(): it never changes a grade and never adds a source.
 *  If no external source is on file, it says so plainly (catalog rule).
 *  A label cite can also show the SPL version date and last DailyMed check from
 *  label-versions.json. That line is display-only. */
import { basisFor, type FindingBasis } from "./basis";
import { setidOf } from "./reference/label-drift";
import labelVersionsFile from "./reference/label-versions.json" with { type: "json" };
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

/** Dates stored per DailyMed setid. `labelDrug` is not a join key: basis titles
 *  are not stable label names ("Prescribing Information", "Zanaflex label, …"). */
interface StoredLabelVersion {
  effective?: string | null;
  checkedOn?: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const LABEL_VERSIONS: Record<string, StoredLabelVersion> = {};
for (const [id, row] of Object.entries(
  labelVersionsFile.labels as Record<string, StoredLabelVersion>,
)) {
  LABEL_VERSIONS[id.toLowerCase()] = row;
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return ISO_DATE.test(trimmed) ? trimmed : null;
}

const NO_LABEL_VERSION = "No label version date is on file.";

/** Freshness line for a label cite, matched by DailyMed `setid` (the key in
 *  label-versions.json). Omits the line when this row is not a specific label
 *  we can look up. Says plainly when the setid is on the cite but not on file.
 *  Never invents a date. */
export function labelFreshnessLine(
  basis: Pick<GradeBasis, "kind" | "href">,
  versions: Record<string, StoredLabelVersion> = LABEL_VERSIONS,
): string | null {
  if (basis.kind !== "label" || !basis.href) return null;
  const setid = setidOf(basis.href)?.trim().toLowerCase();
  if (!setid) return null;
  const row = versions[setid];
  if (!row) return NO_LABEL_VERSION;
  const effective = isoDate(row.effective);
  const checkedOn = isoDate(row.checkedOn);
  if (effective && checkedOn) return `Label version dated ${effective}. Last checked ${checkedOn}.`;
  if (effective) return `Label version dated ${effective}.`;
  if (checkedOn) return `Last checked ${checkedOn}.`;
  return NO_LABEL_VERSION;
}

function cap(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** Visible link text that names what the link opens, never a bare "Open source".
 *  A DailyMed label link names whose label it opens, e.g. "Contrave label on DailyMed";
 *  a DailyMed search link says so, e.g. "Search DailyMed for Selegiline". */
export function sourceLinkText(title: string, href: string): string {
  let url: URL | null = null;
  try {
    url = new URL(href);
  } catch {
    url = null;
  }
  const host = url?.hostname ?? "";
  const labelOwner = /^(.+?) label(?:,|$)/.exec(title)?.[1];
  if (host.endsWith("dailymed.nlm.nih.gov")) {
    const query = url?.searchParams.get("query")?.trim();
    const owner = labelOwner ?? (query ? cap(query) : "");
    if (url?.pathname.includes("search.cfm")) return owner ? `Search DailyMed for ${owner}` : "Search DailyMed";
    return owner ? `${owner} label on DailyMed` : "Label on DailyMed";
  }
  if (labelOwner) return `${labelOwner} label`;
  if (host.endsWith("pubmed.ncbi.nlm.nih.gov") || /^PMID /.test(title)) return `${title} on PubMed`;
  if (host.endsWith("cpicpgx.org")) return "CPIC guideline";
  if (host.endsWith("fda.gov")) return /interaction table/i.test(title) ? "FDA interaction table" : "FDA safety notice";
  return title;
}
