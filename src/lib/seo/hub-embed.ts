/**
 * Embeddable drug and class cards (/embed/drug/<slug>, /embed/class/<slug>): the
 * same framable, noindex treatment as the pair cards (pair-embed.ts), for a drug
 * hub and a class page.
 *
 * Read-only over drug-hubs.ts and class-hubs.ts: every name, grade label, role
 * label and count is the hub's own, never re-derived here. The cards only cut
 * the hub's lists short (the first rows in the hub's own order) and link to the
 * full page for the rest.
 *
 * Like pair-embed.ts, this module stays light (types and string helpers only)
 * because the drug hub and class page client bundles use the snippet helpers;
 * the loaders that read hub data are in hub-embed-load.ts.
 */
import { SITE_URL } from "./pair-copy";
import { embedIframe } from "./pair-embed";

export const EMBED_DRUG_PREFIX = "/embed/drug/";
export const EMBED_CLASS_PREFIX = "/embed/class/";

/** Pair rows on a drug card: the hub's first rows (most severe first, then by name). */
export const DRUG_EMBED_MAX_PAIRS = 8;
/** Member drugs named on a class card, in the class page's order. */
export const CLASS_EMBED_MAX_MEMBERS = 12;
/** Enzyme rows on a class card, in the class page's order. */
export const CLASS_EMBED_MAX_ENZYMES = 5;

/** Height the drug and class snippets ask for: eight pair rows, or five enzyme rows, plus the footer at about 600 wide. */
export const HUB_EMBED_HEIGHT = 520;

export interface EmbedLink {
  name: string;
  /** Absolute SITE_URL address. */
  href: string;
}

export interface DrugEmbedPair {
  pairSlug: string;
  otherName: string;
  /** The hub group's grade label, unchanged (SEVERITY_LABEL). */
  severityLabel: string;
  href: string;
}

export interface DrugEmbed {
  slug: string;
  name: string;
  classLink: EmbedLink | null;
  /** The first DRUG_EMBED_MAX_PAIRS pairs in the hub's order. */
  pairs: DrugEmbedPair[];
  /** Every pair page on the hub (the "See all N" count). */
  pairCount: number;
  /** For a cited-only supplement hub (no pair pages): the hub's own intro line. */
  note: string | null;
  /** The drug hub this card stands in for. */
  canonical: string;
}

export interface ClassEmbedEnzyme {
  name: string;
  href: string;
  /** Distinct class drugs that store any role on this enzyme. */
  drugs: number;
  roles: { label: string; count: number }[];
}

export interface ClassEmbed {
  slug: string;
  name: string;
  /** The first CLASS_EMBED_MAX_MEMBERS members with a drug page. */
  members: EmbedLink[];
  memberCount: number;
  /** The first CLASS_EMBED_MAX_ENZYMES enzyme rows. */
  enzymes: ClassEmbedEnzyme[];
  enzymeCount: number;
  /** Pair pages per grade label, most severe first (the class page's groups). */
  severityCounts: { label: string; count: number }[];
  pairCount: number;
  /** The class page this card stands in for. */
  canonical: string;
}

export function embedDrugPath(slug: string): string {
  return `${EMBED_DRUG_PREFIX}${encodeURIComponent(slug)}`;
}

export function embedClassPath(slug: string): string {
  return `${EMBED_CLASS_PREFIX}${encodeURIComponent(slug)}`;
}

export function embedDrugUrl(slug: string): string {
  return `${SITE_URL}${embedDrugPath(slug)}`;
}

export function embedClassUrl(slug: string): string {
  return `${SITE_URL}${embedClassPath(slug)}`;
}

/** The drug card's iframe snippet. Always points at the canonical SITE_URL, never the current host. */
export function drugEmbedSnippet(hub: { slug: string; name: string }): string {
  return embedIframe({ src: embedDrugUrl(hub.slug), title: `FirstPass: ${hub.name} drug-pair card`, height: HUB_EMBED_HEIGHT });
}

/** The class card's iframe snippet. Always points at the canonical SITE_URL, never the current host. */
export function classEmbedSnippet(hub: { slug: string; name: string }): string {
  return embedIframe({ src: embedClassUrl(hub.slug), title: `FirstPass: ${hub.name} drug-class card`, height: HUB_EMBED_HEIGHT });
}
