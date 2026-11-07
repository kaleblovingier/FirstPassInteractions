import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { LABEL_CONDITIONAL_LINES } from "@/lib/drugs/label-conditional";
import { LABEL_CONTRAINDICATIONS } from "@/lib/drugs/label-contraindications";
import {
  FDA_DDI_FOOTNOTES,
  FDA_DDI_SOURCE,
  FDA_DDI_TABLE,
  FDA_TARGETS,
  type FdaDdiEntry,
  type FdaTarget,
} from "@/lib/drugs/reference/fda-ddi-table";
import { LABEL_GOLD_SET } from "@/lib/drugs/reference/label-gold-set";
import labelVersionsFile from "@/lib/drugs/reference/label-versions.json" with { type: "json" };
import { dailymedSetUrl } from "@/lib/regulatory";
import { enzymeDisplayName, enzymeHubBySlug, enzymePath, enzymeSlug } from "./enzyme-hubs";
import { PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";
import { pairSlug } from "./pair-pages";

/**
 * Copy and data for /sources: the FDA label excerpts the desk has saved, an index
 * of the FDA Table 1 rows it compares against, and the public FDA and NLM pages
 * behind both. Read-only: nothing here sets or changes a grade. The page shows
 * quotes and table rows as stored, and no severity.
 */

export const SOURCES_PATH = "/sources";
export const SOURCES_URL = `${SITE_URL}${SOURCES_PATH}`;
export const SOURCES_TITLE = "Sources: FDA label library and interaction table index | FirstPass";
export const SOURCES_DESCRIPTION = `Every FDA label excerpt FirstPass has saved, with the DailyMed set ID, SPL version and check date, plus an index of the FDA CYP and transporter table rows it uses. ${PAIR_DISCLAIMER}`;
export const SOURCES_H1 = "Sources and label library";
export const SOURCES_INTRO =
  "FirstPass quotes FDA drug labels in their own words and compares its enzyme roles with FDA's table of example substrates, inhibitors and inducers. This page lists both, so you can open the source behind any line on the desk.";

export const RESOURCES_HEADING = "Public FDA and NLM resources";
export const RESOURCES_INTRO =
  "The agency pages behind the desk. They are the place to check a label, an approval, a safety notice or to report a problem.";

export const LIBRARY_HEADING = "Label library";
export const LIBRARY_INTRO =
  "Each label below is one DailyMed set ID. The quotes are the label sentences the desk has saved, with the section they come from and the pairs that cite them. The SPL version and effective date are from the last label check. Open the label on DailyMed for the current text.";
export const LIBRARY_DRIFT_NOTE =
  "A script checks that each saved quote still appears word for word in the cited section of the current label. Its last report is in the repository.";
export const OTHER_LABELS_HEADING = "Other labels cited in drug notes";
export const OTHER_LABELS_INTRO =
  "These labels are cited in catalog drug notes rather than as a pair quote. The version and date are from the last check.";

export const DDI_HEADING = "FDA interaction table index";
export const DDI_INTRO =
  "The rows of FDA's Table 1 that FirstPass has transcribed, for the CYP enzymes and transporter it models, sorted by enzyme and role. Drug names are written as FDA writes them.";
/** FDA's own caveat on Table 1, as stored in fda-ddi-table.ts. */
export const DDI_CAVEAT =
  "FDA says the examples in Table 1 are a guide and not considered a comprehensive list. A drug missing from this index may still have a role on that enzyme.";

export const DRIFT_REPORT_PATH = "docs/validation/label-drift.md";
export const DDI_AGREEMENT_PATH = "docs/validation/fda-ddi-agreement.md";

/* ------------------------------ Label library ------------------------------ */

export interface LibraryPair {
  id: string;
  /** "Drug A + Drug B" with catalog names. */
  label: string;
  /** /pair/<slug> when a public pair page exists. */
  href: string | null;
}

export interface LibraryQuote {
  section: string;
  quote: string;
  pairs: LibraryPair[];
}

export interface LibraryLabel {
  /** Lower-case set ID, or the cited URL when the row has none. */
  key: string;
  /** Heading anchor on /sources. */
  anchor: string;
  labelDrug: string;
  setid: string | null;
  /** DailyMed page for the set ID, or the cited URL. */
  url: string;
  version: number | null;
  effective: string | null;
  checkedOn: string | null;
  sections: string[];
  quotes: LibraryQuote[];
}

export interface OtherLabel {
  setid: string;
  anchor: string;
  labelDrug: string;
  url: string;
  version: number | null;
  effective: string | null;
  checkedOn: string | null;
}

interface StoredVersion {
  labelDrug?: string;
  version?: number | null;
  effective?: string | null;
  checkedOn?: string | null;
}

const VERSIONS = labelVersionsFile.labels as Record<string, StoredVersion>;
export const LABEL_VERSIONS_RETRIEVED: string = labelVersionsFile.retrieved;

function setidOf(url: string): string | null {
  const m = url.match(/[?&]setid=([0-9a-f-]{8,})/i);
  return m ? m[1]!.toLowerCase() : null;
}

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

/** Pairs that have a public /pair/ page: the same rule pair-pages.ts builds from. */
function pairPageKeys(): Set<string> {
  const keys = new Set<string>();
  for (const g of LABEL_GOLD_SET) if (DRUG_BY_ID[g.drugA] && DRUG_BY_ID[g.drugB]) keys.add(pairKey(g.drugA, g.drugB));
  for (const p of LABEL_CONTRAINDICATIONS)
    if (DRUG_BY_ID[p.labelDrugId] && DRUG_BY_ID[p.otherId]) keys.add(pairKey(p.labelDrugId, p.otherId));
  return keys;
}

const nameOf = (id: string) => DRUG_BY_ID[id]?.name ?? id;

function buildLibrary(): LibraryLabel[] {
  const pages = pairPageKeys();
  const byQuote = new Map<string, { labelDrug: string; url: string; section: string; quote: string; pairs: LibraryPair[] }>();
  const add = (id: string, a: string, b: string, labelDrug: string, section: string, quote: string, url: string) => {
    const k = `${url}|${section}|${quote}`;
    let row = byQuote.get(k);
    if (!row) {
      row = { labelDrug, url, section, quote, pairs: [] };
      byQuote.set(k, row);
    }
    if (row.pairs.some((p) => p.id === id)) return;
    const hasPage = pages.has(pairKey(a, b));
    row.pairs.push({ id, label: `${nameOf(a)} + ${nameOf(b)}`, href: hasPage ? `/pair/${pairSlug(a, b)}` : null });
  };
  // Same rows, in the same order, as quotedRows() in scripts/label-drift-check.ts.
  for (const g of LABEL_GOLD_SET) if (!g.paraphrased) add(g.id, g.drugA, g.drugB, g.labelDrug, g.labelSection, g.quote, g.url);
  for (const p of LABEL_CONTRAINDICATIONS) {
    add(p.id, p.labelDrugId, p.otherId, p.labelDrug, p.labelSection, p.quote, p.url);
    if (p.contraindicationsSentence)
      add(p.id, p.labelDrugId, p.otherId, p.labelDrug, "4 CONTRAINDICATIONS", p.contraindicationsSentence, p.url);
  }
  for (const p of LABEL_CONDITIONAL_LINES) add(p.id, p.labelDrugId, p.otherId, p.labelDrug, p.labelSection, p.quote, p.url);

  const byLabel = new Map<string, LibraryLabel>();
  for (const row of byQuote.values()) {
    const setid = setidOf(row.url);
    const key = setid ?? row.url;
    let label = byLabel.get(key);
    if (!label) {
      const v = setid ? VERSIONS[setid] : undefined;
      label = {
        key,
        anchor: `label-${setid ?? byLabel.size}`,
        labelDrug: v?.labelDrug ?? row.labelDrug,
        setid,
        url: setid ? dailymedSetUrl(setid) : row.url,
        version: v?.version ?? null,
        effective: v?.effective ?? null,
        checkedOn: v?.checkedOn ?? null,
        sections: [],
        quotes: [],
      };
      byLabel.set(key, label);
    }
    if (!label.sections.includes(row.section)) label.sections.push(row.section);
    label.quotes.push({ section: row.section, quote: row.quote, pairs: row.pairs });
  }
  const labels = [...byLabel.values()];
  for (const l of labels) {
    l.quotes.sort((a, b) => a.section.localeCompare(b.section) || a.quote.localeCompare(b.quote));
    l.sections.sort((a, b) => a.localeCompare(b));
    for (const q of l.quotes) q.pairs.sort((a, b) => a.label.localeCompare(b.label));
  }
  return labels.sort((a, b) => a.labelDrug.localeCompare(b.labelDrug) || a.key.localeCompare(b.key));
}

let libraryCache: LibraryLabel[] | null = null;
/** One entry per cited label, with every saved quote from it. */
export function labelLibrary(): LibraryLabel[] {
  return (libraryCache ??= buildLibrary());
}

/** Labels in label-versions.json that no pair quote cites (catalog-note cites). */
export function otherLabels(): OtherLabel[] {
  const quoted = new Set(labelLibrary().map((l) => l.setid).filter(Boolean));
  return Object.entries(VERSIONS)
    .filter(([setid]) => !quoted.has(setid.toLowerCase()))
    .map(([setid, v]) => ({
      setid,
      anchor: `label-${setid}`,
      labelDrug: v.labelDrug ?? setid,
      url: dailymedSetUrl(setid),
      version: v.version ?? null,
      effective: v.effective ?? null,
      checkedOn: v.checkedOn ?? null,
    }))
    .sort((a, b) => a.labelDrug.localeCompare(b.labelDrug) || a.setid.localeCompare(b.setid));
}

/* ------------------------- FDA interaction table ------------------------- */

export interface DdiIndexEntry {
  drug: string;
  footnotes: number[];
}

export interface DdiIndexGroup {
  id: string;
  heading: string;
  entries: DdiIndexEntry[];
}

export interface DdiIndexTarget {
  target: FdaTarget;
  anchor: string;
  heading: string;
  /** Desk enzyme page, when one exists. */
  hubPath: string | null;
  count: number;
  groups: DdiIndexGroup[];
  footnotes: { n: number; text: string }[];
}

const GROUPS: { kind: FdaDdiEntry["kind"]; fdaClass: FdaDdiEntry["fdaClass"]; heading: string }[] = [
  { kind: "inhibitor", fdaClass: "strong", heading: "Strong inhibitors" },
  { kind: "inhibitor", fdaClass: "moderate", heading: "Moderate inhibitors" },
  { kind: "inhibitor", fdaClass: "weak", heading: "Weak inhibitors" },
  { kind: "inhibitor", fdaClass: null, heading: "Inhibitors (FDA gives no strength class)" },
  { kind: "inducer", fdaClass: "strong", heading: "Strong inducers" },
  { kind: "inducer", fdaClass: "moderate", heading: "Moderate inducers" },
  { kind: "inducer", fdaClass: "weak", heading: "Weak inducers" },
  { kind: "inducer", fdaClass: null, heading: "Inducers (FDA gives no strength class)" },
  { kind: "substrate", fdaClass: "sensitive", heading: "Sensitive substrates" },
  { kind: "substrate", fdaClass: "moderate-sensitive", heading: "Moderate sensitive substrates" },
  { kind: "substrate", fdaClass: null, heading: "Substrates (FDA gives no sensitivity class)" },
];

function targetHeading(t: FdaTarget): string {
  return t === "CYP3A4" ? 'CYP3A (FDA "3A", desk key CYP3A4)' : enzymeDisplayName(t);
}

function buildDdiIndex(): DdiIndexTarget[] {
  return FDA_TARGETS.map((target) => {
    const rows = FDA_DDI_TABLE.filter((r) => r.target === target);
    const groups: DdiIndexGroup[] = [];
    for (const g of GROUPS) {
      const entries = rows
        .filter((r) => r.kind === g.kind && r.fdaClass === g.fdaClass)
        .map((r) => ({ drug: r.drug, footnotes: [...r.footnotes] }))
        .sort((a, b) => a.drug.localeCompare(b.drug, "en", { sensitivity: "base" }));
      if (entries.length)
        groups.push({ id: `fda-${enzymeSlug(target)}-${g.kind}-${g.fdaClass ?? "unclassed"}`, heading: g.heading, entries });
    }
    const used = [...new Set(rows.flatMap((r) => r.footnotes))].sort((a, b) => a - b);
    return {
      target,
      anchor: `fda-${enzymeSlug(target)}`,
      heading: targetHeading(target),
      hubPath: enzymeHubBySlug(enzymeSlug(target)) ? enzymePath(target) : null,
      count: rows.length,
      groups,
      footnotes: used.map((n) => ({ n, text: FDA_DDI_FOOTNOTES[n] ?? "See the source page." })),
    };
  });
}

let ddiCache: DdiIndexTarget[] | null = null;
/** FDA Table 1 rows by target, then by role and class. */
export function fdaDdiIndex(): DdiIndexTarget[] {
  return (ddiCache ??= buildDdiIndex());
}

export { FDA_DDI_SOURCE };
