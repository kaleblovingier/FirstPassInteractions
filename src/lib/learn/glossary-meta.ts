import { SITE_URL } from "@/lib/seo/pair-copy";

// Kept apart from glossary.ts: the route's head is in every page's entry bundle, and importing glossary.ts brings every term.
export const GLOSSARY_URL = `${SITE_URL}/glossary`;
export const GLOSSARY_TITLE = "Clinical pharmacology glossary | FirstPass";
export const GLOSSARY_DESCRIPTION =
  "Plain-language definitions of the drug-interaction, pharmacokinetic, pharmacogenomic and safety terms used on FirstPass, each checked against a cited source. Educational reference only.";
