import { DRUGS, DRUG_BY_ID } from "@/lib/drugs/catalog";
import { buildBriefUrl } from "@/lib/drugs/brief";
import { FDA_GRADES } from "@/lib/drugs/cyp-protocol";
import {
  ENZYMES,
  SEVERITY_LABEL,
  SEVERITY_RANK,
  type Enzyme,
  type EnzymeRole,
  type ItemKind,
  type Severity,
  type Strength,
  type SubstrateSensitivity,
} from "@/lib/drugs/types";
import { drugHubPath, drugHubs } from "./drug-hubs";
import { pairPages } from "./pair-pages";
import {
  ENZYME_ABOUT,
  ENZYME_ACTIVATION_NOTE_TEMPLATE,
  ENZYME_HUB_DESCRIPTION_TEMPLATE,
  ENZYME_HUB_H1_TEMPLATE,
  ENZYME_HUB_INTRO_TEMPLATE,
  ENZYME_HUB_TITLE_TEMPLATE,
  ENZYME_INDUCTION_TEMPLATE,
  ENZYME_INHIBITION_TEMPLATE,
  ENZYME_INHIBITION_TRANSPORTER_TEMPLATE,
  ENZYME_NONE_TEMPLATE,
  ENZYME_PAIRS_HEADING_TEMPLATE,
  ENZYME_PAIRS_INTRO_TEMPLATE,
  ENZYME_STRENGTH_NOTE,
  ENZYME_STRENGTH_NOTE_TRANSPORTER,
  ENZYME_SUBSTRATE_GROUP_NOTE,
  SITE_URL,
  fillEnzymeTemplate,
} from "./pair-copy";

/**
 * Public enzyme hubs (/enzyme/<slug>): every catalog item that stores a role on
 * one enzyme, grouped the way the catalog grades it. Nothing here adds or
 * edits a role; the page is a read-out of DRUGS[].enzymes.
 */

/** A hub with fewer distinct items than this renders but is noindex and left out of the sitemap. */
export const ENZYME_HUB_MIN_ITEMS = 10;

/**
 * Item kinds listed on the hubs. Research peptides are left out on purpose:
 * they are unapproved research chemicals, the catalog stores no enzyme role
 * for any of them, and a public page shouldn't sit them next to medicines.
 */
export const ENZYME_HUB_KINDS: readonly ItemKind[] = ["drug", "food", "herb"];

export type EnzymeRoleKind = EnzymeRole["kind"];

export interface EnzymeHubItem {
  id: string;
  name: string;
  kind: ItemKind;
  /** /drug/<slug> when a drug hub exists, else the desk link /?brief=<id>. */
  href: string;
  hub: boolean;
  /** Extra catalog flags on a substrate row: activation pathway, narrow therapeutic index. */
  notes: string[];
}

export interface EnzymeHubGroup {
  grade: Strength | SubstrateSensitivity;
  label: string;
  /** FDA fold-change bin (CYP perpetrators) or the sensitivity note (substrates). Empty for P-gp perpetrators. */
  note: string;
  items: EnzymeHubItem[];
}

export interface EnzymeHubSection {
  role: EnzymeRoleKind;
  /** Anchor id and plural word: inhibitors, inducers, substrates. */
  id: "inhibitors" | "inducers" | "substrates";
  heading: string;
  count: number;
  groups: EnzymeHubGroup[];
  /** Shown instead of groups when the catalog maps nothing in this role. */
  none: string | null;
}

export interface EnzymeHubPair {
  slug: string;
  nameA: string;
  nameB: string;
}

export interface EnzymeHubPairGroup {
  severity: Severity | "none";
  label: string;
  pairs: EnzymeHubPair[];
}

export interface EnzymeHub {
  enzyme: Enzyme;
  slug: string;
  /** Display name: CYP3A4, or P-glycoprotein (P-gp). */
  name: string;
  h1: string;
  title: string;
  description: string;
  canonical: string;
  path: string;
  indexable: boolean;
  about: string;
  intro: string;
  inhibition: string;
  induction: string;
  activationNote: string | null;
  strengthNote: string;
  sections: EnzymeHubSection[];
  pairsHeading: string;
  pairsIntro: string;
  pairGroups: EnzymeHubPairGroup[];
  counts: { items: number; inhibitors: number; inducers: number; substrates: number; pairs: number };
}

const toSlug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Hub slug for an enzyme: cyp3a4, cyp2d6, p-gp. */
export function enzymeSlug(e: Enzyme): string {
  return toSlug(e);
}

export function enzymePath(e: Enzyme): string {
  return `/enzyme/${enzymeSlug(e)}`;
}

export function enzymeDisplayName(e: Enzyme): string {
  return e === "P-gp" ? "P-glycoprotein (P-gp)" : e;
}

const SECTION_ORDER: { role: EnzymeRoleKind; id: EnzymeHubSection["id"]; heading: string }[] = [
  { role: "inhibitor", id: "inhibitors", heading: "Inhibitors" },
  { role: "inducer", id: "inducers", heading: "Inducers" },
  { role: "substrate", id: "substrates", heading: "Substrates" },
];

const STRENGTHS: Strength[] = ["strong", "moderate", "weak"];
const SENSITIVITIES: SubstrateSensitivity[] = ["sensitive", "major", "minor"];
const SENSITIVITY_LABEL: Record<SubstrateSensitivity, string> = {
  sensitive: "Sensitive substrates",
  major: "Major-pathway substrates",
  minor: "Minor-pathway substrates",
};
const KIND_WORD: Record<ItemKind, string> = {
  drug: "medicines",
  food: "foods",
  herb: "herbs",
  "research-peptide": "research peptides",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "a, b and c" */
function listWords(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** One catalog role in plain words: "strong inhibitor", "sensitive substrate (narrow therapeutic index)". */
export function roleLabel(r: EnzymeRole): string {
  if (r.kind !== "substrate") return `${r.strength} ${r.kind}`;
  const base = r.sensitivity === "sensitive" ? "sensitive substrate" : `${r.sensitivity}-pathway substrate`;
  const notes = substrateNotes(r);
  return notes.length ? `${base} (${notes.join(", ")})` : base;
}

function substrateNotes(r: EnzymeRole): string[] {
  if (r.kind !== "substrate") return [];
  const out: string[] = [];
  if (r.pathway === "activation") out.push("activation pathway");
  if (r.nti) out.push("narrow therapeutic index");
  return out;
}

/** The catalog items this hub may list, by kind. */
function listed(): typeof DRUGS {
  return DRUGS.filter((d) => ENZYME_HUB_KINDS.includes(d.kind));
}

function deskHref(id: string): string {
  return buildBriefUrl([id], { base: SITE_URL }).replace(SITE_URL, "");
}

function build(): EnzymeHub[] {
  const hubIds = new Set(drugHubs().map((h) => h.drugId));
  const pages = pairPages();
  const items = listed();
  return ENZYMES.map((enzyme) => {
    const name = enzymeDisplayName(enzyme);
    const transporter = enzyme === "P-gp";
    const ids = new Set<string>();
    let activation = false;
    const sections: EnzymeHubSection[] = SECTION_ORDER.map(({ role, id, heading }) => {
      const grades: (Strength | SubstrateSensitivity)[] = role === "substrate" ? SENSITIVITIES : STRENGTHS;
      const groups: EnzymeHubGroup[] = [];
      for (const grade of grades) {
        const rows: EnzymeHubItem[] = [];
        for (const d of items) {
          const r = d.enzymes.find(
            (x) =>
              x.enzyme === enzyme &&
              x.kind === role &&
              (x.kind === "substrate" ? x.sensitivity === grade : x.strength === grade),
          );
          if (!r) continue;
          ids.add(d.id);
          if (r.kind === "substrate" && r.pathway === "activation") activation = true;
          const hub = hubIds.has(d.id);
          rows.push({
            id: d.id,
            name: d.name,
            kind: d.kind,
            href: hub ? drugHubPath(d.id) : deskHref(d.id),
            hub,
            notes: substrateNotes(r),
          });
        }
        if (!rows.length) continue;
        rows.sort((a, b) => a.name.localeCompare(b.name));
        const label =
          role === "substrate" ? SENSITIVITY_LABEL[grade as SubstrateSensitivity] : `${cap(grade)} ${role}s`;
        const note =
          role === "substrate"
            ? fillEnzymeTemplate(ENZYME_SUBSTRATE_GROUP_NOTE[grade as SubstrateSensitivity], { enzyme })
            : transporter
              ? ""
              : FDA_GRADES[role][grade as Strength].fold;
        groups.push({ grade, label, note, items: rows });
      }
      const count = groups.reduce((n, g) => n + g.items.length, 0);
      return {
        role,
        id,
        heading,
        count,
        groups,
        none: count ? null : fillEnzymeTemplate(ENZYME_NONE_TEMPLATE, { enzyme, role: id }),
      };
    });

    const groupsBySeverity = new Map<Severity | "none", EnzymeHubPair[]>();
    for (const p of pages) {
      if (!p.enzymes.includes(enzyme)) continue;
      if (!groupsBySeverity.has(p.severity)) groupsBySeverity.set(p.severity, []);
      groupsBySeverity.get(p.severity)!.push({ slug: p.slug, nameA: p.nameA, nameB: p.nameB });
    }
    const pairGroups: EnzymeHubPairGroup[] = [...groupsBySeverity.entries()]
      .sort((x, y) => SEVERITY_RANK[y[0]] - SEVERITY_RANK[x[0]])
      .map(([severity, pairs]) => ({
        severity,
        label: SEVERITY_LABEL[severity],
        pairs: pairs.sort((x, y) => `${x.nameA} ${x.nameB}`.localeCompare(`${y.nameA} ${y.nameB}`)),
      }));

    const count = (role: EnzymeRoleKind) => sections.find((s) => s.role === role)!.count;
    const counts = {
      items: ids.size,
      inhibitors: count("inhibitor"),
      inducers: count("inducer"),
      substrates: count("substrate"),
      pairs: pairGroups.reduce((n, g) => n + g.pairs.length, 0),
    };
    const roles = listWords(sections.filter((s) => s.count > 0).map((s) => s.id));
    const kinds = ENZYME_HUB_KINDS.filter((k) => items.some((d) => d.kind === k && ids.has(d.id))).map((k) => KIND_WORD[k]);
    const v = { enzyme: name, roles, count: counts.items, items: listWords(kinds) };
    const slug = enzymeSlug(enzyme);
    return {
      enzyme,
      slug,
      name,
      h1: fillEnzymeTemplate(ENZYME_HUB_H1_TEMPLATE, v),
      title: fillEnzymeTemplate(ENZYME_HUB_TITLE_TEMPLATE, v),
      description: fillEnzymeTemplate(ENZYME_HUB_DESCRIPTION_TEMPLATE, v),
      canonical: `${SITE_URL}/enzyme/${slug}`,
      path: enzymePath(enzyme),
      indexable:
        counts.items >= ENZYME_HUB_MIN_ITEMS && counts.substrates > 0 && counts.inhibitors + counts.inducers > 0,
      about: ENZYME_ABOUT[enzyme] ?? "",
      intro: fillEnzymeTemplate(ENZYME_HUB_INTRO_TEMPLATE, { enzyme }),
      inhibition: fillEnzymeTemplate(
        transporter ? ENZYME_INHIBITION_TRANSPORTER_TEMPLATE : ENZYME_INHIBITION_TEMPLATE,
        { enzyme },
      ),
      induction: fillEnzymeTemplate(ENZYME_INDUCTION_TEMPLATE, { enzyme }),
      activationNote: activation ? fillEnzymeTemplate(ENZYME_ACTIVATION_NOTE_TEMPLATE, { enzyme }) : null,
      strengthNote: transporter ? ENZYME_STRENGTH_NOTE_TRANSPORTER : ENZYME_STRENGTH_NOTE,
      sections,
      pairsHeading: fillEnzymeTemplate(ENZYME_PAIRS_HEADING_TEMPLATE, { enzyme }),
      pairsIntro: fillEnzymeTemplate(ENZYME_PAIRS_INTRO_TEMPLATE, { enzyme }),
      pairGroups,
      counts,
    };
  });
}

let cache: EnzymeHub[] | null = null;
/** One hub per enzyme in ENZYMES, in that order. Check `indexable` before listing one for crawlers. */
export function enzymeHubs(): EnzymeHub[] {
  return (cache ??= build());
}

export function enzymeHubBySlug(slug: string): EnzymeHub | undefined {
  return enzymeHubs().find((h) => h.slug === slug);
}

/** Loose address (CYP3A4, pgp, cyp-2d6) -> canonical slug, for 301s. Undefined when already canonical or unknown. */
export function enzymeHubRedirect(slug: string): string | undefined {
  if (enzymeHubBySlug(slug)) return undefined;
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hub = enzymeHubs().find((h) => squash(h.slug) === squash(slug));
  return hub?.slug;
}

/** Canonical URLs of the hubs that clear ENZYME_HUB_MIN_ITEMS, for the sitemap. */
export function enzymeHubUrls(): string[] {
  return enzymeHubs()
    .filter((h) => h.indexable)
    .map((h) => h.canonical);
}

export interface DrugEnzymeLink {
  enzyme: Enzyme;
  path: string;
  /** Catalog roles on that enzyme, in plain words. */
  roles: string[];
}

/** Each enzyme a catalog drug stores a role on, with the hub link. Empty for kinds the hubs don't list. */
export function drugEnzymeLinks(drugId: string): DrugEnzymeLink[] {
  const d = DRUG_BY_ID[drugId];
  if (!d || !ENZYME_HUB_KINDS.includes(d.kind)) return [];
  return ENZYMES.filter((e) => d.enzymes.some((r) => r.enzyme === e)).map((e) => ({
    enzyme: e,
    path: enzymePath(e),
    roles: d.enzymes.filter((r) => r.enzyme === e).map(roleLabel),
  }));
}
