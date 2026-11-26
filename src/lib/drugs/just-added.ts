/**
 * "What did adding that drug bring?" The ids a tray change appended, and a one-line summary of the
 * rows that involve them. Display only: it never grades, it counts the engine's own rows.
 */
import { DRUG_BY_ID } from "./catalog";
import { SEVERITY_LABEL, SEVERITY_RANK, type Finding, type Severity } from "./types";

/**
 * Ids appended to the end of a tray that already held something. A removal, a swap, a loaded tray or
 * the first fill after a page load is not "adding", so it gives none.
 */
export function appendedIds(prev: readonly string[], next: readonly string[]): string[] {
  if (prev.length === 0 || next.length <= prev.length) return [];
  return prev.every((id, i) => next[i] === id) ? next.slice(prev.length) : [];
}

/** The rows that involve any of `ids`. */
export function rowsWith(findings: readonly Finding[], ids: readonly string[]): Finding[] {
  return findings.filter((f) => f.drugIds.some((id) => ids.includes(id)));
}

/** "Adding Metoprolol brought 2 rows: 1 serious concern, 1 use care." */
export function addedSummary(ids: readonly string[], findings: readonly Finding[]): string {
  const names = ids.map((id) => DRUG_BY_ID[id]?.name ?? id);
  const who = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  const rows = rowsWith(findings, ids);
  if (rows.length === 0) return `Adding ${who} brought no mapped rows. A blank pair is not a clearance.`;
  const counts = new Map<Severity, number>();
  for (const f of rows) counts.set(f.severity, (counts.get(f.severity) ?? 0) + 1);
  const parts = [...counts]
    .sort((a, b) => SEVERITY_RANK[b[0]] - SEVERITY_RANK[a[0]])
    .map(([severity, n]) => `${n} ${SEVERITY_LABEL[severity].toLowerCase()}`);
  return `Adding ${who} brought ${rows.length} ${rows.length === 1 ? "row" : "rows"}: ${parts.join(", ")}.`;
}
