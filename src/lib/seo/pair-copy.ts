/**
 * Swappable copy for the public pair pages (/pair/<slug>, /pairs, sitemap).
 * MarketingFirstPass owns the final wording: edit only this file.
 *
 * Rules the tests enforce (src/lib/seo/pair-pages.test.ts):
 * - Titles and meta descriptions may only name the desk's own tier for the pair
 *   ({tier}); never a stronger tier word.
 * - No dose instructions anywhere.
 * - Buyer wording says "Founding", never "Pro".
 */

export const SITE_URL = "https://firstpass-desk.vercel.app";

/** Placeholders: {drugA} {drugB} drug names, {tier} the desk's own SEVERITY_LABEL, unchanged. */
export const PAIR_TITLE_TEMPLATE = "{drugA} + {drugB} interaction: {tier} | FirstPass";

export const PAIR_DESCRIPTION_TEMPLATE =
  "What the {drugA} and {drugB} labels say about taking them together, with the label quote and a DailyMed link. Educational reference only. Not FDA-cleared. The Prescribing Information governs.";

export const PAIRS_INDEX_TITLE = "Label-sourced drug interaction pairs | FirstPass";

export const PAIRS_INDEX_DESCRIPTION =
  "Drug pairs the FirstPass desk checks against FDA label text: each page shows the desk's tier, the mechanism and the exact label quote with its DailyMed source.";

export const PAIRS_INDEX_INTRO =
  "Drug pairs where an FDA label names a specific interaction, each with the label's own wording and a link to the source. Open any pair in the desk to check it alongside the rest of a regimen. Educational reference only. Not FDA-cleared. The Prescribing Information governs. A pair that isn't listed here hasn't been cleared as safe; it just isn't on this list.";

export const PAIR_CTA = "Open this pair in the desk";

/** Shown on every pair page and the index. */
export const PAIR_DISCLAIMER =
  "Educational reference only. Not FDA-cleared. The Prescribing Information governs.";

export function fillPairTemplate(tpl: string, v: { drugA: string; drugB: string; tier: string }): string {
  return tpl.replaceAll("{drugA}", v.drugA).replaceAll("{drugB}", v.drugB).replaceAll("{tier}", v.tier);
}

/** Drug hub pages (/drug/<slug>). Placeholder: {drug} the catalog drug name. */
export const DRUG_HUB_TITLE_TEMPLATE = "{drug} interactions on FDA labels | FirstPass";

export const DRUG_HUB_DESCRIPTION_TEMPLATE =
  "Drug pairs where an FDA label names an interaction with {drug}, each with the label's own wording and a DailyMed link. Educational reference only. Not FDA-cleared. The Prescribing Information governs.";

export const DRUG_HUB_CTA_TEMPLATE = "Open {drug} in the desk";

/** Shown under the disclaimer on every drug hub. */
export const DRUG_HUB_NOT_LISTED =
  "A pair that isn't listed here hasn't been cleared as safe; it just isn't on this list.";

export function fillDrugTemplate(tpl: string, drug: string): string {
  return tpl.replaceAll("{drug}", drug);
}
