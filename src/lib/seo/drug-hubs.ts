import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { MARKET_STATUS } from "@/lib/drugs/catalog-label-names";
import { buildBriefUrl } from "@/lib/drugs/brief";
import { SEVERITY_LABEL, SEVERITY_RANK, type Severity } from "@/lib/drugs/types";
import { pairPages, type PairPage } from "./pair-pages";
import type { GradeBasis } from "@/lib/drugs/grade-provenance";
import { drugEnzymeLinks, type DrugEnzymeLink } from "./enzyme-hubs";
import {
  DRUG_HUB_CTA_TEMPLATE,
  DRUG_HUB_DESCRIPTION_TEMPLATE,
  DRUG_HUB_TITLE_TEMPLATE,
  SITE_URL,
  fillDrugTemplate,
} from "./pair-copy";

export interface DrugHubPair {
  pairSlug: string;
  otherId: string;
  otherName: string;
  /** Lead "Why this grade" basis from the pair page. */
  why?: GradeBasis;
}

export interface DrugHubGroup {
  severity: Severity | "none";
  label: string;
  pairs: DrugHubPair[];
}

export interface DrugHub {
  slug: string;
  drugId: string;
  name: string;
  title: string;
  description: string;
  canonical: string;
  deskUrl: string;
  cta: string;
  groups: DrugHubGroup[];
  pairCount: number;
  /** Each enzyme the drug stores a catalog role on, linked to its /enzyme hub. */
  enzymes: DrugEnzymeLink[];
  /** US market status (withdrawn or restricted), shown above the pairs. */
  marketStatus?: string;
}

const toSlug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Combination products with a brand (same test pairSlug uses: an en dash or
 * slash in the catalog name) are addressed and named by their first brand:
 * naltrexone-bupropion -> /drug/contrave, "Contrave (naltrexone–bupropion)".
 * Names that already carry the brand (Paxlovid) keep their id and name.
 */
function comboBrand(id: string): string | undefined {
  const d = DRUG_BY_ID[id];
  if (!d || !/[–/]/.test(d.name)) return undefined;
  const brand = d.brands?.[0];
  if (!brand || d.name.toLowerCase().includes(brand.toLowerCase())) return undefined;
  return brand;
}

/** Hub slug for a catalog drug id. */
export function drugHubSlug(id: string): string {
  const brand = comboBrand(id);
  return brand ? toSlug(brand) : toSlug(id);
}

/** Display name on the hub (title, h1, intro). */
export function drugHubName(id: string): string {
  const d = DRUG_BY_ID[id];
  const brand = comboBrand(id);
  if (!d) return id;
  return brand ? `${brand} (${d.name.charAt(0).toLowerCase()}${d.name.slice(1)})` : d.name;
}

export function drugHubPath(id: string): string {
  return `/drug/${drugHubSlug(id)}`;
}

function build(): DrugHub[] {
  const byDrug = new Map<string, PairPage[]>();
  for (const p of pairPages()) {
    for (const id of [p.drugA, p.drugB]) {
      if (!byDrug.has(id)) byDrug.set(id, []);
      byDrug.get(id)!.push(p);
    }
  }
  const hubs: DrugHub[] = [];
  for (const [id, pages] of byDrug) {
    const name = drugHubName(id);
    const groups = new Map<Severity | "none", DrugHubPair[]>();
    for (const p of pages) {
      const otherId = p.drugA === id ? p.drugB : p.drugA;
      const otherName = p.drugA === id ? p.nameB : p.nameA;
      if (!groups.has(p.severity)) groups.set(p.severity, []);
      groups.get(p.severity)!.push({ pairSlug: p.slug, otherId, otherName, ...(p.why[0] ? { why: p.why[0] } : {}) });
    }
    const g: DrugHubGroup[] = [...groups.entries()]
      .sort((x, y) => SEVERITY_RANK[y[0]] - SEVERITY_RANK[x[0]])
      .map(([severity, pairs]) => ({
        severity,
        label: SEVERITY_LABEL[severity],
        pairs: pairs.sort((x, y) => x.otherName.localeCompare(y.otherName)),
      }));
    const slug = drugHubSlug(id);
    hubs.push({
      slug,
      drugId: id,
      name,
      title: fillDrugTemplate(DRUG_HUB_TITLE_TEMPLATE, name),
      description: fillDrugTemplate(DRUG_HUB_DESCRIPTION_TEMPLATE, name),
      canonical: `${SITE_URL}/drug/${slug}`,
      deskUrl: buildBriefUrl([id], { base: SITE_URL }).replace(SITE_URL, ""),
      cta: fillDrugTemplate(DRUG_HUB_CTA_TEMPLATE, name),
      groups: g,
      pairCount: pages.length,
      enzymes: drugEnzymeLinks(id),
      ...(MARKET_STATUS[id] ? { marketStatus: MARKET_STATUS[id] } : {}),
    });
  }
  hubs.sort((x, y) => x.slug.localeCompare(y.slug));
  return hubs;
}

let cache: DrugHub[] | null = null;
export function drugHubs(): DrugHub[] {
  return (cache ??= build());
}

/** Old hub slug (catalog id) -> current slug, for 301s. */
export function legacyDrugHubRedirect(slug: string): string | undefined {
  if (drugHubBySlug(slug)) return undefined;
  const hub = drugHubs().find((h) => toSlug(h.drugId) === slug);
  return hub && hub.slug !== slug ? hub.slug : undefined;
}

export function drugHubBySlug(slug: string): DrugHub | undefined {
  return drugHubs().find((h) => h.slug === slug);
}
