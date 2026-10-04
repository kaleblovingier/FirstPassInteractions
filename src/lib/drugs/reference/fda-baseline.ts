/**
 * Regression-gate constants for the FDA DDI agreement check
 * (see validate-fda.ts and fda-regression.test.ts).
 */

/**
 * Exact agreement (role + FDA class) on FDA strong-inhibitor and
 * strong-inducer pairs whose drug is in our catalog, as measured on
 * 2026-10-03 against FDA Table 1 (content current as of 2026-05-29)
 * on main: 34 / 34 = 100%. Same run, all compared pairs:
 * exact 85.2% (236/277), role 98.6% (273/277). Raise this when the
 * formulary owner fixes rows; never lower it to make a failing change pass.
 */
export const FDA_STRONG_PERPETRATOR_BASELINE_PCT = 100;

/**
 * Reviewed direction mismatches ("FDA drug|target"), e.g. FDA says inducer
 * where the catalog only says inhibitor. Each entry needs a
 * TODO for formulary owner review. Empty: none measured on 2026-09-26.
 */
export const REVIEWED_DIRECTION_MISMATCHES: readonly string[] = [];
