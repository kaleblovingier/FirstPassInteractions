/**
 * Loader side of the embed cards: reads the same pair data /pair/$slug uses.
 * Kept apart from pair-embed.ts so the pair data (and grade-provenance) stay in
 * loader chunks, out of the client components that draw the card and the snippet.
 */
import { notFound, redirect } from "@tanstack/react-router";
import { sourceLinkText } from "@/lib/drugs/grade-provenance";
import { legacyPairRedirect, pairPageBySlug, type PairPage } from "./pair-pages";
import type { PairEmbed } from "./pair-embed";

/** The card's fields, copied from the pair page unchanged. */
export function pairEmbedFromPage(page: PairPage): PairEmbed {
  const lead = page.why[0];
  return {
    slug: page.slug,
    nameA: page.nameA,
    nameB: page.nameB,
    severityLabel: page.severityLabel,
    why: lead ? { title: lead.title, ...(lead.href ? { href: lead.href, linkText: sourceLinkText(lead.title, lead.href) } : {}) } : null,
    quote: page.quote
      ? { quote: page.quote.quote, labelDrug: page.quote.labelDrug, labelSection: page.quote.labelSection, url: page.quote.url }
      : null,
    canonical: page.canonical,
  };
}

/** The card for a pair slug, or undefined for a slug with no pair page (the route 404s). */
export function pairEmbedBySlug(slug: string): PairEmbed | undefined {
  const page = pairPageBySlug(slug);
  return page ? pairEmbedFromPage(page) : undefined;
}

/**
 * The /embed/pair/$slug loader: the card, a 301 to the current embed address for a
 * renamed slug (as /pair/$slug does), or notFound() (HTTP 404) for an unknown slug.
 */
export function loadPairEmbed(slug: string): PairEmbed {
  const moved = legacyPairRedirect(slug);
  if (moved) throw redirect({ to: "/embed/pair/$slug", params: { slug: moved }, statusCode: 301 });
  const card = pairEmbedBySlug(slug);
  if (!card) throw notFound();
  return card;
}
