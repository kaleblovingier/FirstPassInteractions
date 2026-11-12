/**
 * Typical adult elimination half-lives for catalog ids that have no row on the PK shelf (pk.ts).
 * Read only by the timing sketch in overlap.ts. Nothing here changes a severity or a PK curve.
 *
 * Every row names where its number came from: the FDA label section, or a PMID whose abstract
 * states it. A number with no source that can be opened does not belong here.
 */

export interface HalfLifeRow {
  /** Typical adult elimination half-life, in hours. */
  hours: number;
  /** Where the number came from ("Zoloft PI, section 12.3", "PMID 12345678"). */
  source: string;
}

/** Keyed by catalog id. The PK shelf wins when both have a row. */
export const HALF_LIVES: Record<string, HalfLifeRow> = {};

/**
 * Ids where one half-life would mislead, with the sentence the sketch shows instead
 * (ethanol clears at a fixed rate, not a fixed fraction). These get no percent.
 */
export const NO_SINGLE_HALF_LIFE: Record<string, string> = {};
