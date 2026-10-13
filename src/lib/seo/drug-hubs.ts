import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { buildBriefUrl } from "@/lib/drugs/brief";
import { SEVERITY_LABEL, SEVERITY_RANK, type Severity } from "@/lib/drugs/types";
import { pairPages, type PairPage } from "./pair-pages";
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
}

const toSlug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Hub slug for a catalog drug id. */
export function drugHubSlug(id: string): string {
  return toSlug(id);
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
    const name = DRUG_BY_ID[id]?.name ?? id;
    const groups = new Map<Severity | "none", DrugHubPair[]>();
    for (const p of pages) {
      const otherId = p.drugA === id ? p.drugB : p.drugA;
      const otherName = p.drugA === id ? p.nameB : p.nameA;
      if (!groups.has(p.severity)) groups.set(p.severity, []);
      groups.get(p.severity)!.push({ pairSlug: p.slug, otherId, otherName });
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
    });
  }
  hubs.sort((x, y) => x.slug.localeCompare(y.slug));
  return hubs;
}

let cache: DrugHub[] | null = null;
export function drugHubs(): DrugHub[] {
  return (cache ??= build());
}

export function drugHubBySlug(slug: string): DrugHub | undefined {
  return drugHubs().find((h) => h.slug === slug);
}
