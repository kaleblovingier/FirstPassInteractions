/**
 * Loader side of the drug and class embed cards: reads the same hubs /drug/$slug
 * and /class/$slug use. Kept apart from hub-embed.ts so the hub data stays in
 * loader chunks, out of the client components that draw the cards and snippets.
 */
import { notFound, redirect } from "@tanstack/react-router";
import { classLinkForDrug, classHubBySlug, classHubRedirect, type ClassHub } from "./class-hubs";
import { drugHubBySlug, legacyDrugHubRedirect, type DrugHub } from "./drug-hubs";
import { CITED_ONLY_HUB_INTRO, SITE_URL } from "./pair-copy";
import {
  CLASS_EMBED_MAX_ENZYMES,
  CLASS_EMBED_MAX_MEMBERS,
  DRUG_EMBED_MAX_PAIRS,
  type ClassEmbed,
  type DrugEmbed,
} from "./hub-embed";

const abs = (path: string) => `${SITE_URL}${path}`;

/** The drug card's fields, copied from the hub unchanged; only the pair list is cut short. */
export function drugEmbedFromHub(hub: DrugHub, classLink?: { name: string; path: string }): DrugEmbed {
  const pairs = hub.groups
    .flatMap((g) => g.pairs.map((p) => ({ pairSlug: p.pairSlug, otherName: p.otherName, severityLabel: g.label, href: abs(`/pair/${p.pairSlug}`) })))
    .slice(0, DRUG_EMBED_MAX_PAIRS);
  return {
    slug: hub.slug,
    name: hub.name,
    classLink: classLink ? { name: classLink.name, href: abs(classLink.path) } : null,
    pairs,
    pairCount: hub.pairCount,
    note: hub.pairCount === 0 ? CITED_ONLY_HUB_INTRO : null,
    canonical: hub.canonical,
  };
}

/** The card for a drug hub slug, or undefined for a slug with no hub (the route 404s). */
export function drugEmbedBySlug(slug: string): DrugEmbed | undefined {
  const hub = drugHubBySlug(slug);
  return hub ? drugEmbedFromHub(hub, classLinkForDrug(hub.drugId)) : undefined;
}

/**
 * The /embed/drug/$slug loader: the card, a 301 to the current embed address for a
 * renamed hub slug (as /drug/$slug does), or notFound() (HTTP 404) for an unknown slug.
 */
export function loadDrugEmbed(slug: string): DrugEmbed {
  const moved = legacyDrugHubRedirect(slug);
  if (moved) throw redirect({ to: "/embed/drug/$slug", params: { slug: moved }, statusCode: 301 });
  const card = drugEmbedBySlug(slug);
  if (!card) throw notFound();
  return card;
}

/** The class card's fields, copied from the class page unchanged; only the lists are cut short. */
export function classEmbedFromHub(hub: ClassHub): ClassEmbed {
  return {
    slug: hub.slug,
    name: hub.name,
    members: hub.members.slice(0, CLASS_EMBED_MAX_MEMBERS).map((m) => ({ name: m.name, href: abs(m.href) })),
    memberCount: hub.members.length,
    enzymes: hub.enzymes.slice(0, CLASS_EMBED_MAX_ENZYMES).map((e) => ({
      name: e.name,
      href: abs(e.path),
      drugs: e.drugs,
      roles: e.roles.map((r) => ({ label: r.label, count: r.count })),
    })),
    enzymeCount: hub.enzymes.length,
    severityCounts: hub.pairGroups.map((g) => ({ label: g.label, count: g.pairs.length })),
    pairCount: hub.counts.pairs,
    canonical: hub.canonical,
  };
}

/** The card for a class slug, or undefined for a slug with no class page (the route 404s). */
export function classEmbedBySlug(slug: string): ClassEmbed | undefined {
  const hub = classHubBySlug(slug);
  return hub ? classEmbedFromHub(hub) : undefined;
}

/**
 * The /embed/class/$slug loader: the card, a 301 to the canonical embed address for a
 * loose slug (as /class/$slug does), or notFound() (HTTP 404) for an unknown slug.
 */
export function loadClassEmbed(slug: string): ClassEmbed {
  const moved = classHubRedirect(slug);
  if (moved) throw redirect({ to: "/embed/class/$slug", params: { slug: moved }, statusCode: 301 });
  const card = classEmbedBySlug(slug);
  if (!card) throw notFound();
  return card;
}
