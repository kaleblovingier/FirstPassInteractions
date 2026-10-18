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
  "Drug pairs where an FDA label names a specific interaction, each with the label's own wording and a link to the source. Open any pair in the desk to see it alongside other drugs. Educational reference only. Not FDA-cleared. The Prescribing Information governs. A pair that isn't listed here hasn't been cleared as safe; it just isn't on this list.";

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
  "Drug pairs with {drug} where an FDA label names a specific interaction, each with the label's wording and a DailyMed link. Educational reference only. Not FDA-cleared. The Prescribing Information governs.";

export const DRUG_HUB_CTA_TEMPLATE = "Open {drug} in the desk";

/** Intro paragraph under the h1 on every drug hub. */
export const DRUG_HUB_INTRO_TEMPLATE =
  "These are pairs with {drug} where an FDA label names an interaction, grouped by the desk's grade. A drug that isn't listed here hasn't been cleared as safe with {drug}; it just isn't on this list. Open any pair in the desk to see it alongside other drugs.";

export function fillDrugTemplate(tpl: string, drug: string): string {
  return tpl.replaceAll("{drug}", drug);
}

/* —— Enzyme hub pages (/enzyme/<slug>, /enzymes) ——————————————————————————
 * Same rules as above; src/lib/seo/enzyme-hubs.test.ts enforces them: no
 * severity tier words in titles or meta, no dose instructions, no "Pro", no
 * pricing. Every drug named in ENZYME_ABOUT must hold that role in the
 * catalog, and the test checks each one. Textbook-level only.
 * Placeholders: {enzyme} the display name (CYP3A4, P-glycoprotein (P-gp)),
 * {roles} the roles the page lists ("inhibitors, inducers and substrates"),
 * {count} the number of mapped items, {items} the kinds present
 * ("medicines, foods and herbs"), {role} one role word ("inducers").
 */
export const ENZYME_HUB_TITLE_TEMPLATE = "{enzyme} {roles} | FirstPass";

export const ENZYME_HUB_H1_TEMPLATE = "{enzyme} {roles}";

export const ENZYME_HUB_DESCRIPTION_TEMPLATE =
  "{enzyme} {roles} on the FirstPass desk: {count} mapped {items}, grouped by strength and sensitivity. Educational reference only. Not FDA-cleared. The Prescribing Information governs.";

/** Under the h1 on every enzyme hub. */
export const ENZYME_HUB_INTRO_TEMPLATE =
  "This is the desk's mapped set for {enzyme}, taken from the same catalog the desk uses to grade pairs. It is not a complete list. A drug that isn't listed here hasn't been cleared as safe; it just isn't on this list.";

export const ENZYME_HUB_LEGEND =
  "Names with a solid underline open that drug's page of label-sourced pairs. Names with a dotted underline open the desk with that drug.";

export const ENZYME_HUB_CTA = "Open the desk";

/** Plain-language summary per enzyme. Keep it general; the lists carry the detail. */
export const ENZYME_ABOUT: Record<string, string> = {
  CYP1A2:
    "CYP1A2 is a liver enzyme that clears caffeine, theophylline, clozapine, olanzapine and tizanidine. Smoking induces it, so levels of these drugs can fall in people who smoke and rise after they quit. The desk files smoking under nicotine, but the induction comes from chemicals in tobacco smoke, not from nicotine itself. Fluvoxamine is a strong inhibitor and ciprofloxacin a moderate one.",
  CYP2B6:
    "CYP2B6 is a liver enzyme that clears bupropion, efavirenz and ketamine, and it carries part of methadone's clearance. Its gene varies widely between people, which changes how fast these drugs are cleared.",
  CYP2C8:
    "CYP2C8 is a liver enzyme that clears repaglinide, pioglitazone and montelukast. Gemfibrozil is a strong inhibitor, and clopidogrel inhibits it too.",
  CYP2C9:
    "CYP2C9 is a liver enzyme that clears warfarin, phenytoin, NSAIDs such as celecoxib and ibuprofen, and sulfonylureas such as glipizide. It also activates losartan. Warfarin and phenytoin have a narrow therapeutic index, so small changes in CYP2C9 activity matter. Its gene varies between people, and carriers of reduced-function variants clear these drugs more slowly.",
  CYP2C19:
    "CYP2C19 is a liver enzyme that activates clopidogrel and clears omeprazole and other proton pump inhibitors, citalopram, escitalopram and diazepam. Its gene varies widely between people. Poor metabolizers make less of clopidogrel's active form, and strong inhibitors such as fluvoxamine can have a similar effect.",
  CYP2D6:
    "CYP2D6 is a liver enzyme that clears many antidepressants, antipsychotics, beta-blockers such as metoprolol, and opioids. It turns codeine and tramadol into stronger opioids and turns tamoxifen into its main active form. Its gene varies widely: people range from poor to ultrarapid metabolizers. Strong inhibitors such as paroxetine, fluoxetine, bupropion and quinidine can make a normal metabolizer act like a poor one. Medicines rarely induce CYP2D6.",
  CYP2E1:
    "CYP2E1 is a liver enzyme that handles ethanol and other small molecules. It also turns a small share of acetaminophen into a toxic metabolite. Long-term heavy drinking induces it, and disulfiram is a strong inhibitor.",
  CYP3A4:
    "CYP3A4 is the most abundant CYP enzyme in the liver, and it also works in the wall of the small intestine. It clears more medicines than any other CYP enzyme, including midazolam and simvastatin. Because it acts in the gut wall, it changes how much of a swallowed medicine reaches the blood, which is why grapefruit juice can matter. Clarithromycin, itraconazole and ritonavir are strong inhibitors; rifampin and St. John's wort are strong inducers.",
  "P-gp":
    "P-glycoprotein (P-gp) is a transporter, not a CYP enzyme. It sits in the gut wall, liver, kidney and the blood-brain barrier and pumps drugs out of cells: back into the gut, into bile and urine, and away from the brain. Blocking it can raise levels of digoxin and dabigatran; inducing it can lower them. Many drugs that act on CYP3A4 act on P-gp too: verapamil blocks it and rifampin induces it.",
};

export const ENZYME_HOW_HEADING = "What inhibition and induction mean";

export const ENZYME_INHIBITION_TEMPLATE =
  "An inhibitor slows {enzyme}. Drugs that depend on {enzyme} can build up, so their levels and effects can rise. Reversible inhibition starts as the inhibitor builds up and fades as it clears. Some inhibitors destroy the enzyme, and the effect lasts until the body makes more.";

/** P-gp is a transporter: no enzyme-destroying inhibitors in the wording. */
export const ENZYME_INHIBITION_TRANSPORTER_TEMPLATE =
  "An inhibitor slows {enzyme}. Drugs that depend on {enzyme} can build up, so their levels and effects can rise. The effect starts as the inhibitor builds up and fades as it clears.";

export const ENZYME_INDUCTION_TEMPLATE =
  "An inducer makes the body produce more {enzyme}. Levels of drugs that depend on {enzyme} can fall, and so can their effect. Induction builds over days to weeks and takes about as long to fade after the inducer stops.";

/** Shown only when the page lists an activation-pathway substrate. */
export const ENZYME_ACTIVATION_NOTE_TEMPLATE =
  "Substrates marked activation pathway are ones {enzyme} turns into an active or reactive product. For these, inhibition can mean less of that product, and induction can mean more.";

export const ENZYME_STRENGTH_NOTE =
  "Strong, moderate and weak are the desk's grades for how much a perpetrator changes a sensitive substrate's exposure, in FDA's fold-change bins.";

export const ENZYME_STRENGTH_NOTE_TRANSPORTER = "Strong, moderate and weak are the desk's own grades for P-gp.";

export const ENZYME_FDA_TABLE_LINK = "FDA table of substrates, inhibitors and inducers";

export const ENZYME_SUBSTRATE_GROUP_NOTE: Record<"sensitive" | "major" | "minor", string> = {
  sensitive: "Exposure rises the most when {enzyme} is blocked.",
  major: "{enzyme} is one of the main routes for these.",
  minor: "{enzyme} is a smaller route for these; other routes carry most of the load.",
};

export const ENZYME_NONE_TEMPLATE = "No {role} are mapped for {enzyme} on the desk.";

export const ENZYME_PAIRS_HEADING_TEMPLATE = "Pair pages that run through {enzyme}";

export const ENZYME_PAIRS_INTRO_TEMPLATE =
  "Label-sourced pair pages where the desk's top finding is a {enzyme} interaction, grouped by the desk's grade.";

export const ENZYMES_INDEX_TITLE = "CYP450 inhibitors, inducers and substrates by enzyme | FirstPass";

export const ENZYMES_INDEX_DESCRIPTION =
  "The CYP enzymes and the P-gp transporter mapped on the FirstPass desk, each with its inhibitors, inducers and substrates grouped by grade. Educational reference only. Not FDA-cleared. The Prescribing Information governs.";

export const ENZYMES_INDEX_H1 = "Drug-metabolizing enzymes on the desk";

export const ENZYMES_INDEX_INTRO =
  "Each page lists the medicines, foods and herbs the desk maps to one enzyme or transporter, grouped by the desk's grades, with links to drug pages and label-sourced pair pages. This is the desk's mapped set, not a complete list. A drug that isn't listed hasn't been cleared as safe; it just isn't on this list.";

export function fillEnzymeTemplate(
  tpl: string,
  v: { enzyme: string; roles?: string; count?: number; items?: string; role?: string },
): string {
  return tpl
    .replaceAll("{enzyme}", v.enzyme)
    .replaceAll("{roles}", v.roles ?? "")
    .replaceAll("{count}", String(v.count ?? ""))
    .replaceAll("{items}", v.items ?? "")
    .replaceAll("{role}", v.role ?? "");
}
