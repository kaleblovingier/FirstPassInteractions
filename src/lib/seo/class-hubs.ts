import { DRUGS } from "@/lib/drugs/catalog";
import { buildBriefUrl } from "@/lib/drugs/brief";
import {
  ENZYMES,
  SEVERITY_LABEL,
  SEVERITY_RANK,
  type Drug,
  type Enzyme,
  type EnzymeRole,
  type Severity,
} from "@/lib/drugs/types";
import { drugHubName, drugHubPath, drugHubs } from "./drug-hubs";
import { enzymeDisplayName, enzymePath } from "./enzyme-hubs";
import { pairPages } from "./pair-pages";
import {
  CLASS_HUB_DESCRIPTION_TEMPLATE,
  CLASS_HUB_H1_TEMPLATE,
  CLASS_HUB_INTRO_TEMPLATE,
  CLASS_HUB_TITLE_TEMPLATE,
  SITE_URL,
  fillClassTemplate,
} from "./pair-copy";

/**
 * Public drug class hubs (/class/<slug>): the catalog drugs filed under one
 * Drug.cls label, the enzyme roles the catalog stores for them, and the pair
 * pages they appear in. A read-out of the catalog and the pair pages: nothing
 * here adds or edits a class, role or grade.
 */

/** A class is published when at least this many of its drugs have a /drug page. */
export const CLASS_HUB_MIN_MEMBERS = 2;

/** At most this many drugs go into the "open in the desk" link. */
export const CLASS_HUB_DESK_MAX = 4;

/**
 * Catalog cls labels that are not one pharmacological class, so they get no
 * class page. Keys are classKey() of the label.
 * - Filing labels for where an entry came from, not what it is.
 * - Buckets that hold two or more classes under one label; a page would merge them.
 * - A dosage-form bucket whose tablets span several antiretroviral classes.
 */
export const CLASS_HUB_EXCLUDED: Readonly<Record<string, string>> = {
  "fda table 1 example": "filing label for FDA DDI table examples",
  "named on a stored label": "filing label for names quoted on a stored label",
  "braf / mek": "two classes (BRAF and MEK inhibitors) in one bucket",
  "flt3 / idh / hedgehog": "three classes in one bucket",
  "hiv combo tablet": "dosage-form bucket spanning several antiretroviral classes",
};

const GREEK: Record<string, string> = { α: "alpha", β: "beta", γ: "gamma", δ: "delta", κ: "kappa", μ: "mu" };

/**
 * Grouping key for a cls label. Conservative: it folds only case, Unicode
 * form, dash variants and whitespace, so two labels that differ in any word,
 * letter or parenthetical stay apart ("PDE5 inhibitor" vs "PDE5 inhibitor (PAH)").
 */
export function classKey(cls: string): string {
  return cls
    .normalize("NFKC")
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** URL slug for a cls label: "Azole antifungal" -> azole-antifungal, "5-HT3 antagonist" -> 5-ht3-antagonist. */
export function classSlug(cls: string): string {
  return classKey(cls)
    .replace(/[αβγδκμ]/g, (c) => GREEK[c] ?? c)
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function classPath(cls: string): string {
  return `/class/${classSlug(cls)}`;
}

export interface ClassHubMember {
  id: string;
  name: string;
  /** /drug/<slug> for members with a drug page, else the desk link /?brief=<id>. */
  href: string;
  hub: boolean;
}

export interface ClassHubEnzymeRole {
  /** "strong inhibitor", "sensitive substrate", "major-pathway substrate". */
  label: string;
  count: number;
  names: string[];
}

export interface ClassHubEnzyme {
  enzyme: Enzyme;
  name: string;
  path: string;
  /** Distinct class drugs that store any role on this enzyme. */
  drugs: number;
  roles: ClassHubEnzymeRole[];
}

export interface ClassHubPair {
  slug: string;
  nameA: string;
  nameB: string;
}

export interface ClassHubPairGroup {
  severity: Severity | "none";
  label: string;
  pairs: ClassHubPair[];
}

export interface ClassHub {
  key: string;
  slug: string;
  /** The catalog's own cls label. */
  name: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  canonical: string;
  path: string;
  /** Members with a /drug page. */
  members: ClassHubMember[];
  /** Other kind=drug catalog entries filed under the same label (desk links). */
  others: ClassHubMember[];
  enzymes: ClassHubEnzyme[];
  pairGroups: ClassHubPairGroup[];
  deskUrl: string;
  deskNames: string[];
  counts: { drugs: number; hubs: number; pairs: number };
}

export interface ClassIndexEntry {
  slug: string;
  name: string;
  path: string;
  counts: ClassHub["counts"];
}

/** Only medicines: foods, herbs and research peptides are not filed as drug classes here. */
const listed = (d: Drug) => d.kind === "drug" && Boolean(d.cls?.trim());

/** One stored role in plain words, without the per-drug flags. */
function gradeLabel(r: EnzymeRole): string {
  if (r.kind !== "substrate") return `${r.strength} ${r.kind}`;
  return r.sensitivity === "sensitive" ? "sensitive substrate" : `${r.sensitivity}-pathway substrate`;
}

const ROLE_ORDER = [
  "strong inhibitor",
  "moderate inhibitor",
  "weak inhibitor",
  "strong inducer",
  "moderate inducer",
  "weak inducer",
  "sensitive substrate",
  "major-pathway substrate",
  "minor-pathway substrate",
];

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The spelling most entries use; ties go to the alphabetically first. */
function displayName(labels: string[]): string {
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l.trim(), (counts.get(l.trim()) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function enzymeRows(drugs: Drug[]): ClassHubEnzyme[] {
  const out: ClassHubEnzyme[] = [];
  for (const enzyme of ENZYMES) {
    const byRole = new Map<string, Set<string>>();
    const ids = new Set<string>();
    for (const d of drugs) {
      for (const r of d.enzymes) {
        if (r.enzyme !== enzyme) continue;
        const label = gradeLabel(r);
        if (!byRole.has(label)) byRole.set(label, new Set());
        byRole.get(label)!.add(d.id);
        ids.add(d.id);
      }
    }
    if (!ids.size) continue;
    const nameOf = new Map(drugs.map((d) => [d.id, d.name]));
    const roles = [...byRole.entries()]
      .sort((a, b) => ROLE_ORDER.indexOf(a[0]) - ROLE_ORDER.indexOf(b[0]))
      .map(([label, set]) => ({
        label,
        count: set.size,
        names: [...set].map((id) => nameOf.get(id)!).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
      }));
    out.push({ enzyme, name: enzymeDisplayName(enzyme), path: enzymePath(enzyme), drugs: ids.size, roles });
  }
  return out;
}

function build(): ClassHub[] {
  const hubIds = new Set(drugHubs().map((h) => h.drugId));
  const pages = pairPages();
  const groups = new Map<string, Drug[]>();
  for (const d of DRUGS) {
    if (!listed(d)) continue;
    const key = classKey(d.cls);
    if (key in CLASS_HUB_EXCLUDED) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }

  const candidates: ClassHub[] = [];
  for (const [key, drugs] of groups) {
    const withHub = drugs.filter((d) => hubIds.has(d.id));
    if (withHub.length < CLASS_HUB_MIN_MEMBERS) continue;
    const memberIds = new Set(withHub.map((d) => d.id));
    const groupsBySeverity = new Map<Severity | "none", ClassHubPair[]>();
    for (const p of pages) {
      if (!memberIds.has(p.drugA) && !memberIds.has(p.drugB)) continue;
      if (!groupsBySeverity.has(p.severity)) groupsBySeverity.set(p.severity, []);
      groupsBySeverity.get(p.severity)!.push({ slug: p.slug, nameA: p.nameA, nameB: p.nameB });
    }
    const pairGroups: ClassHubPairGroup[] = [...groupsBySeverity.entries()]
      .sort((x, y) => SEVERITY_RANK[y[0]] - SEVERITY_RANK[x[0]])
      .map(([severity, pairs]) => ({
        severity,
        label: SEVERITY_LABEL[severity],
        pairs: pairs.sort((x, y) => `${x.nameA} ${x.nameB}`.localeCompare(`${y.nameA} ${y.nameB}`)),
      }));
    const pairCount = pairGroups.reduce((n, g) => n + g.pairs.length, 0);
    if (!pairCount) continue;

    const name = displayName(drugs.map((d) => d.cls));
    const slug = classSlug(name);
    if (!slug) continue;
    const members: ClassHubMember[] = withHub
      .map((d) => ({ id: d.id, name: drugHubName(d.id), href: drugHubPath(d.id), hub: true }))
      .sort(byName);
    const others: ClassHubMember[] = drugs
      .filter((d) => !memberIds.has(d.id))
      .map((d) => ({
        id: d.id,
        name: d.name,
        href: buildBriefUrl([d.id], { base: SITE_URL }).replace(SITE_URL, ""),
        hub: false,
      }))
      .sort(byName);
    const desk = members.slice(0, CLASS_HUB_DESK_MAX);
    const counts = { drugs: drugs.length, hubs: members.length, pairs: pairCount };
    const v = {
      cls: name,
      count: counts.drugs,
      hubs: counts.hubs,
      pairs: plural(pairCount, "label-sourced pair page", "label-sourced pair pages"),
    };
    candidates.push({
      key,
      slug,
      name,
      h1: fillClassTemplate(CLASS_HUB_H1_TEMPLATE, v),
      title: fillClassTemplate(CLASS_HUB_TITLE_TEMPLATE, v),
      description: fillClassTemplate(CLASS_HUB_DESCRIPTION_TEMPLATE, v),
      intro: fillClassTemplate(CLASS_HUB_INTRO_TEMPLATE, v),
      canonical: `${SITE_URL}/class/${slug}`,
      path: `/class/${slug}`,
      members,
      others,
      enzymes: enzymeRows(drugs),
      pairGroups,
      deskUrl: buildBriefUrl(desk.map((m) => m.id), { base: SITE_URL }).replace(SITE_URL, ""),
      deskNames: desk.map((m) => m.name),
      counts,
    });
  }

  // Two different labels that land on one slug would share a page: publish neither.
  const seen = new Map<string, number>();
  for (const h of candidates) seen.set(h.slug, (seen.get(h.slug) ?? 0) + 1);
  return candidates.filter((h) => seen.get(h.slug) === 1).sort(byName);
}

let cache: ClassHub[] | null = null;
/** Published class hubs, alphabetical by class name. */
export function classHubs(): ClassHub[] {
  return (cache ??= build());
}

export function classHubBySlug(slug: string): ClassHub | undefined {
  return classHubs().find((h) => h.slug === slug);
}

/** Loose address (SSRI, Azole_Antifungal, class-iii-antiarrhythmic/) -> canonical slug, for 301s. */
export function classHubRedirect(slug: string): string | undefined {
  if (classHubBySlug(slug)) return undefined;
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const want = squash(slug);
  if (!want) return undefined;
  const hits = classHubs().filter((h) => squash(h.slug) === want);
  return hits.length === 1 ? hits[0].slug : undefined;
}

/** Canonical URLs of every published class hub, for the sitemap. */
export function classHubUrls(): string[] {
  return classHubs().map((h) => h.canonical);
}

/** Small rows for /classes. */
export function classIndex(): ClassIndexEntry[] {
  return classHubs().map((h) => ({ slug: h.slug, name: h.name, path: h.path, counts: h.counts }));
}

/** The published class page a drug hub belongs to, if any. */
export function classLinkForDrug(drugId: string): { name: string; path: string } | undefined {
  const h = classHubs().find((c) => c.members.some((m) => m.id === drugId));
  return h ? { name: h.name, path: h.path } : undefined;
}
