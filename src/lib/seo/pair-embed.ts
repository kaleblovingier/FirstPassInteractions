/**
 * Embeddable pair cards (/embed/pair/<slug>): a small, framable view of a public
 * pair page that faculty can drop into a course page with an <iframe>, no LTI.
 *
 * Read-only over pair-pages.ts: every field comes from the same PairPage the
 * /pair/<slug> page renders, so the grade label, the lead "why" basis and the
 * label quote are the pair page's own, never re-derived here.
 *
 * Framing is allowed only under /embed/ (vercel.json, scripts/vercel-routes.mjs).
 * Embed pages are noindex, canonical to the pair page, and not in the sitemap.
 *
 * This module stays light (types and string helpers only) because the pair page's
 * client bundle uses embedSnippet(); the loader that reads pair data is in
 * pair-embed-load.ts.
 */
import type { PairPage } from "./pair-pages";
import { SITE_URL } from "./pair-copy";

export const EMBED_PAIR_PREFIX = "/embed/pair/";

/** Height the snippet asks for; the card is laid out to fit about 600x320. */
export const EMBED_HEIGHT = 340;

export interface PairEmbed {
  slug: string;
  nameA: string;
  nameB: string;
  /** The pair page's grade label, unchanged (SEVERITY_LABEL). */
  severityLabel: string;
  /** Heading of the pair page's first "Why this grade" row, with its source link (and that link's text) when one is on file. */
  why: { title: string; href?: string; linkText?: string } | null;
  quote: { quote: string; labelDrug: string; labelSection: string; url: string } | null;
  /** The pair page this card stands in for. */
  canonical: string;
}

export function embedPairPath(slug: string): string {
  return `${EMBED_PAIR_PREFIX}${encodeURIComponent(slug)}`;
}

export function embedPairUrl(slug: string): string {
  return `${SITE_URL}${embedPairPath(slug)}`;
}

/** Escapes text for a double-quoted HTML attribute. */
export function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The iframe snippet a course page pastes in. Always points at the canonical SITE_URL, never the current host. */
export function embedSnippet(page: Pick<PairPage, "slug" | "nameA" | "nameB">): string {
  const src = escapeAttr(embedPairUrl(page.slug));
  const title = escapeAttr(`FirstPass: ${page.nameA} and ${page.nameB} interaction card`);
  return `<iframe src="${src}" title="${title}" width="100%" height="${EMBED_HEIGHT}" loading="lazy" style="border:0;max-width:640px"></iframe>`;
}
