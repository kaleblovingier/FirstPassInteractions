import { PROGRAM_TIER_BY_ID, type ProgramTier } from "@/lib/billing/programs";
import { pairPages, type PairPage } from "./pair-pages";
import { audienceBySlug, type ProgramAudience } from "./for-programs-audiences";

/** What an audience page links to for one pair: only fields already shown on /pairs. */
export interface AudiencePairLink {
  slug: string;
  nameA: string;
  nameB: string;
  severityLabel: string;
  quoted: boolean;
}

export interface AudiencePageData {
  audience: ProgramAudience;
  tier: ProgramTier;
  pairs: AudiencePairLink[];
}

/** The existing pair page for two catalog ids, in either order, or undefined. */
export function pairPageForIds(a: string, b: string, pages: PairPage[] = pairPages()): PairPage | undefined {
  return pages.find((p) => (p.drugA === a && p.drugB === b) || (p.drugA === b && p.drugB === a));
}

/** Everything an audience page renders. Pairs that have no page are left out. */
export function audiencePageData(slug: string): AudiencePageData | undefined {
  const audience = audienceBySlug(slug);
  if (!audience) return undefined;
  const pages = pairPages();
  const pairs: AudiencePairLink[] = [];
  for (const [a, b] of audience.pairs) {
    const p = pairPageForIds(a, b, pages);
    if (p) pairs.push({ slug: p.slug, nameA: p.nameA, nameB: p.nameB, severityLabel: p.severityLabel, quoted: p.quote !== null });
  }
  return { audience, tier: PROGRAM_TIER_BY_ID[audience.tier], pairs };
}
