/**
 * Swappable copy for the public pair pages (/pair/<slug>, /pairs, sitemap).
 * MarketingFirstPass owns the final wording: edit only this file.
 *
 * Rules the tests enforce (src/lib/seo/pair-pages.test.ts):
 * - Titles and meta descriptions may only name the desk's own tier for the pair
 *   ({severity}); never a stronger tier word.
 * - No dose instructions anywhere.
 * - Buyer wording says "Founding", never "Pro".
 */

export const SITE_URL = "https://firstpass-desk.vercel.app";

/** Placeholders: {a} {b} drug names, {severity} desk tier label (e.g. "Use care"). */
export const PAIR_TITLE_TEMPLATE = "{a} and {b} interaction: {severity} | FirstPass";

export const PAIR_DESCRIPTION_TEMPLATE =
  "{a} with {b}: the FirstPass desk shows {severity}. The mechanism in one line, with the FDA label quote and source where one exists. Educational reference.";

export const PAIRS_INDEX_TITLE = "Label-sourced drug interaction pairs | FirstPass";

export const PAIRS_INDEX_DESCRIPTION =
  "Drug pairs the FirstPass desk checks against FDA label text: each page shows the desk's tier, the mechanism and the exact label quote with its DailyMed source.";

export const PAIRS_INDEX_INTRO =
  "Each pair below is checked against FDA label text. Open a pair to see how the desk grades it, why, and the label sentence it rests on.";

export const PAIR_CTA = "Open this pair on the desk";

/** Shown on every pair page and the index. */
export const PAIR_DISCLAIMER =
  "Educational reference only. Not FDA-cleared. Not a substitute for professional judgment; no dosing advice.";

export function fillPairTemplate(tpl: string, v: { a: string; b: string; severity: string }): string {
  return tpl.replaceAll("{a}", v.a).replaceAll("{b}", v.b).replaceAll("{severity}", v.severity);
}
