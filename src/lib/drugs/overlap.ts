/**
 * Timing sketch: how much of each tray item is left by simple first-order half-life math, and how
 * much two items still overlap. Teaching only. It never changes a severity, and a low number is
 * not a clearance to combine: label washout clocks and enzyme resynthesis outlast it.
 */

import { DRUG_BY_ID } from "./catalog";
import { summarizePairs } from "./fanout";
import { HALF_LIVES, NO_SINGLE_HALF_LIFE } from "./half-lives";
import { pkHalfLifeH } from "./pk";
import type { DecayRow, IngestionTimes, OverlapRow, Report, Timeline } from "./types";

/** Share left after `hoursAgo`, by C(t) = C0 · 0.5^(t / t½). 1 at or before time zero. */
export function remainingFraction(halfLifeH: number, hoursAgo: number): number {
  if (!(halfLifeH > 0) || Number.isNaN(hoursAgo)) {
    throw new RangeError("half-life must be positive and hoursAgo a number");
  }
  return hoursAgo <= 0 ? 1 : 0.5 ** (hoursAgo / halfLifeH);
}

/**
 * Typical adult half-life for a catalog id, with where it came from. The PK shelf wins over
 * HALF_LIVES. An id listed in NO_SINGLE_HALF_LIFE has none, whatever else is stored.
 */
export function halfLifeFor(id: string): { hours: number; source: string } | undefined {
  if (Object.hasOwn(NO_SINGLE_HALF_LIFE, id)) return undefined;
  const hours = pkHalfLifeH(id);
  if (hours !== undefined) return { hours, source: "FirstPass PK shelf" };
  return Object.hasOwn(HALF_LIVES, id) ? { ...HALF_LIVES[id]! } : undefined;
}

/** Decay rows for the tray and an overlap row for every pair, in tray order. */
export function timeline(ids: readonly string[], times: IngestionTimes, report: Report): Timeline {
  const rows: DecayRow[] = ids
    .filter((id) => Object.hasOwn(DRUG_BY_ID, id))
    .map((id) => {
      const half = halfLifeFor(id);
      const stated = Object.hasOwn(times, id) ? times[id] : undefined;
      const hoursAgo = stated !== undefined && Number.isFinite(stated) && stated >= 0 ? stated : undefined;
      const row: DecayRow = { id, name: DRUG_BY_ID[id].name, halfLifeH: half?.hours, source: half?.source, hoursAgo };
      if (Object.hasOwn(NO_SINGLE_HALF_LIFE, id)) row.note = NO_SINGLE_HALF_LIFE[id];
      if (half && hoursAgo !== undefined) row.remaining = remainingFraction(half.hours, hoursAgo);
      return row;
    });
  const left = new Map(rows.map((row) => [row.id, row.remaining]));
  // Clocks that outlast half-life math: label washouts, lingering rows, enzyme inactivation.
  const holdsFor = ([x, y]: [string, string]): string | undefined => {
    const heads = report.findings
      .filter(
        (f) =>
          f.drugIds.includes(x) &&
          f.drugIds.includes(y) &&
          f.tags.some((t) => t === "washout" || t === "linger" || t === "tdi"),
      )
      .map((f) => f.headline);
    return heads.length ? [...new Set(heads)].join("; ") : undefined;
  };
  const pairs: OverlapRow[] = summarizePairs(
    rows.map((row) => row.id),
    report.findings,
  ).map(({ pair, highestSeverity }) => {
    const a = left.get(pair[0]);
    const b = left.get(pair[1]);
    const holds = holdsFor(pair);
    if (holds) return { pair, severity: highestSeverity, holds };
    return {
      pair,
      severity: highestSeverity,
      activeOverlapPercent: a === undefined || b === undefined ? undefined : Math.min(a, b) * 100,
    };
  });
  return { rows, pairs };
}
