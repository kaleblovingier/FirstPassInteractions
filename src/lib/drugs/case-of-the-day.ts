import { DRUG_BY_ID } from "./catalog";
import { SAMPLE_REGIMENS, sampleNeedsPro, type SampleLane, type SampleRegimen } from "./samples";

/**
 * "Case of the day" — one free teaching pair, the same for everyone on a given
 * local calendar day. No server, no analytics: the day number picks the case.
 *
 * Only cases that work on the free desk qualify (no founding host factors,
 * at most five drugs, every drug resolves in the formulary). Street-supply and
 * entactogen lanes stay out of the featured slot so a link posted to a clinic
 * or a class opens on a clinic-staple, food, MAT, or sedative teaching pair.
 * Those cases are still one tap away in the example list.
 */
export const DAILY_LANES: readonly SampleLane[] = ["clinic", "food", "mat", "nmda", "gaba"];

export const FREE_CAP = 5;

/** Free-friendly cases eligible for the daily slot, sorted by id so the rotation is stable. */
export function dailyCasePool(
  samples: readonly SampleRegimen[] = SAMPLE_REGIMENS,
): SampleRegimen[] {
  return samples
    .filter(
      (s) =>
        DAILY_LANES.includes(s.lane) &&
        !sampleNeedsPro(s) &&
        s.drugIds.length >= 2 &&
        s.drugIds.length <= FREE_CAP &&
        s.drugIds.every((id) => Boolean(DRUG_BY_ID[id])),
    )
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Whole days since 1970-01-01 for the viewer's local calendar date (DST-safe). */
export function localDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** The case for `date` (local calendar day). Null only if the pool is empty. */
export function caseOfTheDay(
  date: Date = new Date(),
  samples: readonly SampleRegimen[] = SAMPLE_REGIMENS,
): SampleRegimen | null {
  const pool = dailyCasePool(samples);
  if (pool.length === 0) return null;
  const n = localDayNumber(date);
  return pool[((n % pool.length) + pool.length) % pool.length];
}

/** Query value that always means "today's case" — safe to paste once and keep. */
export const CASE_OF_THE_DAY_PARAM = "today";
