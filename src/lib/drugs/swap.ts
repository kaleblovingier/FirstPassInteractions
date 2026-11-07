/**
 * "Try a swap": what the desk's own findings would look like if one item on the
 * tray were replaced by another. Both lists come from analyze() unchanged; this
 * file only lines them up. A quieter list is not a clearance and the swap is not
 * a substitution recommendation. Product labeling and the prescriber govern.
 */

import { analyze } from "./engine";
import { swapIds } from "./tray-history";
import { SEVERITY_RANK, type Finding, type HostContext, type Report, type Severity } from "./types";

/** Plain copy for the swap panel. No em dashes, no promise of safety. */
export const SWAP_COPY = {
  title: "Try a swap",
  scientific: "What-if regimen · same desk model",
  intro:
    "Pick one item on the tray and a replacement to see how the desk's list would change. The tray stays as it is until you apply the swap.",
  caveat:
    "Teaching only. This is not a substitution recommendation, and a shorter list is not a clearance. The label and the prescriber govern.",
  quiet: "Both trays map the same findings in this teaching model. That does not mean either is free of interactions.",
} as const;

export { swapIds };

export interface SwapRegrade {
  finding: Finding;
  was: Severity;
}

export interface SwapDiff {
  /** The tray after the swap, in the same order with the replacement in place. */
  ids: string[];
  before: Report;
  after: Report;
  /** Findings on the current tray that the swapped tray does not map. */
  gone: Finding[];
  /** Findings the swapped tray maps that the current tray does not. */
  added: Finding[];
  /** Same finding on both trays, graded differently by the engine. */
  regraded: SwapRegrade[];
  /** Findings that stay with the same grade. */
  kept: number;
}

function bySeverity(a: Finding, b: Finding): number {
  return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.headline.localeCompare(b.headline);
}

/**
 * Compare the engine's report for the tray now with the report for the swapped
 * tray under the same host. Amounts for the item taken off are dropped; the rest
 * are kept as entered. Returns null when the swap is not possible.
 */
export function swapDiff(
  ids: string[],
  host: HostContext,
  outId: string,
  inId: string,
  amounts: Record<string, number> = {},
): SwapDiff | null {
  const next = swapIds(ids, outId, inId);
  if (!next) return null;
  const kept: Record<string, number> = {};
  for (const [id, v] of Object.entries(amounts)) if (id !== outId) kept[id] = v;
  const before = analyze(ids, host, amounts);
  const after = analyze(next, host, kept);
  const afterById = new Map(after.findings.map((f) => [f.id, f]));
  const beforeIds = new Set(before.findings.map((f) => f.id));
  const gone: Finding[] = [];
  const regraded: SwapRegrade[] = [];
  let same = 0;
  for (const f of before.findings) {
    const match = afterById.get(f.id);
    if (!match) gone.push(f);
    else if (match.severity !== f.severity) regraded.push({ finding: match, was: f.severity });
    else same += 1;
  }
  const added = after.findings.filter((f) => !beforeIds.has(f.id));
  return {
    ids: next,
    before,
    after,
    gone: gone.sort(bySeverity),
    added: added.sort(bySeverity),
    regraded: regraded.sort((a, b) => bySeverity(a.finding, b.finding)),
    kept: same,
  };
}
