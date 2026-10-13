import { analyze } from "@/lib/drugs/engine";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { LABEL_CONTRAINDICATIONS } from "@/lib/drugs/label-contraindications";
import { LABEL_GOLD_SET } from "@/lib/drugs/reference/label-gold-set";
import { SEVERITY_LABEL, SEVERITY_RANK, type Severity } from "@/lib/drugs/types";
import { buildBriefUrl } from "@/lib/drugs/brief";
import { drugHubs } from "./drug-hubs";
import {
  PAIR_DESCRIPTION_TEMPLATE,
  PAIR_TITLE_TEMPLATE,
  SITE_URL,
  fillPairTemplate,
} from "./pair-copy";

export interface PairQuote {
  labelDrug: string;
  labelSection: string;
  quote: string;
  url: string;
  /** "gold" = label-gold-set.ts row; "pin" = label-contraindications.ts row. */
  source: "gold" | "pin";
  sourceId: string;
}

export interface PairPage {
  slug: string;
  drugA: string;
  drugB: string;
  nameA: string;
  nameB: string;
  severity: Severity | "none";
  severityLabel: string;
  mechanism: string;
  quote: PairQuote | null;
  title: string;
  description: string;
  canonical: string;
  deskUrl: string;
}

function oneLine(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

const toSlug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Slug for a pair. When one drug's id shares a slug token with the other's
 * (e.g. naltrexone-bupropion + bupropion), the combination product is named
 * by its first brand (contrave-bupropion) so the address doesn't repeat a word.
 */
export function pairSlug(a: string, b: string): string {
  const ta = a.split("-");
  const tb = b.split("-");
  if (!ta.some((t) => tb.includes(t))) return `${a}-${b}`;
  const da = DRUG_BY_ID[a];
  const db = DRUG_BY_ID[b];
  const isCombo = (id: string) => /[–/]/.test(DRUG_BY_ID[id]?.name ?? "");
  let target: "a" | "b";
  if (isCombo(a) !== isCombo(b)) target = isCombo(a) ? "a" : "b";
  else target = ta.length >= tb.length ? "a" : "b";
  const brand = (target === "a" ? da : db)?.brands?.[0];
  if (!brand) return `${a}-${b}`;
  const bs = toSlug(brand);
  const next = target === "a" ? `${bs}-${b}` : `${a}-${bs}`;
  return next.split("-").some((t, i, arr) => arr.indexOf(t) !== i) ? `${a}-${b}` : next;
}

function build(): PairPage[] {
  const seen = new Map<string, { a: string; b: string; quote: PairQuote | null }>();
  const key = (a: string, b: string) => [a, b].sort().join("|");
  for (const g of LABEL_GOLD_SET) {
    if (!DRUG_BY_ID[g.drugA] || !DRUG_BY_ID[g.drugB]) continue;
    const k = key(g.drugA, g.drugB);
    if (seen.has(k)) continue;
    seen.set(k, {
      a: g.drugA,
      b: g.drugB,
      quote: g.paraphrased
        ? null
        : { labelDrug: g.labelDrug, labelSection: g.labelSection, quote: g.quote, url: g.url, source: "gold", sourceId: g.id },
    });
  }
  for (const p of LABEL_CONTRAINDICATIONS) {
    if (!DRUG_BY_ID[p.labelDrugId] || !DRUG_BY_ID[p.otherId]) continue;
    const k = key(p.labelDrugId, p.otherId);
    const q: PairQuote = { labelDrug: p.labelDrug, labelSection: p.labelSection, quote: p.quote, url: p.url, source: "pin", sourceId: p.id };
    const cur = seen.get(k);
    if (cur) {
      if (!cur.quote) cur.quote = q;
      continue;
    }
    seen.set(k, { a: p.labelDrugId, b: p.otherId, quote: q });
  }
  const pages: PairPage[] = [];
  for (const { a, b, quote } of seen.values()) {
    const da = DRUG_BY_ID[a]!;
    const db = DRUG_BY_ID[b]!;
    const report = analyze([a, b]);
    const pair = report.findings.filter((f) => f.drugIds.includes(a) && f.drugIds.includes(b));
    let top = pair[0];
    for (const f of pair) if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[top!.severity]) top = f;
    const severity: Severity | "none" = top ? top.severity : "none";
    const severityLabel = SEVERITY_LABEL[severity];
    const mechanism = top ? oneLine(`${top.mechanism}${top.effect ? ` (${top.effect})` : ""}`) : "No pair finding on the desk.";
    const slug = pairSlug(a, b);
    const legacy = `${a}-${b}`;
    if (legacy !== slug) legacySlugs.set(legacy, slug);
    const v = { drugA: da.name, drugB: db.name, tier: severityLabel };
    pages.push({
      slug,
      drugA: a,
      drugB: b,
      nameA: da.name,
      nameB: db.name,
      severity,
      severityLabel,
      mechanism,
      quote,
      title: fillPairTemplate(PAIR_TITLE_TEMPLATE, v),
      description: fillPairTemplate(PAIR_DESCRIPTION_TEMPLATE, v),
      canonical: `${SITE_URL}/pair/${slug}`,
      deskUrl: buildBriefUrl([a, b], { base: SITE_URL }).replace(SITE_URL, ""),
    });
  }
  pages.sort((x, y) => x.slug.localeCompare(y.slug));
  return pages;
}

const legacySlugs = new Map<string, string>();
let cache: PairPage[] | null = null;
export function pairPages(): PairPage[] {
  return (cache ??= build());
}

export function pairPageBySlug(slug: string): PairPage | undefined {
  return pairPages().find((p) => p.slug === slug);
}

/** Old slug → current slug, for 301s from addresses that were renamed. */
export function legacyPairRedirect(slug: string): string | undefined {
  pairPages();
  const to = legacySlugs.get(slug);
  return to && !pairPageBySlug(slug) ? to : undefined;
}

export function sitemapXml(): string {
  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/pairs`,
    `${SITE_URL}/for-programs`,
    ...pairPages().map((p) => p.canonical),
    ...hubUrls(),
  ];
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${esc(u)}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
}

/** Drug hub URLs (/drug/<slug>): one per catalog drug that appears in a pair page. */
function hubUrls(): string[] {
  return drugHubs().map((h) => h.canonical);
}
