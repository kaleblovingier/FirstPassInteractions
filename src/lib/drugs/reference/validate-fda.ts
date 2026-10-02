/**
 * Compare FirstPass catalog CYP / P-gp roles against the FDA Table 1
 * transcription in ./fda-ddi-table.ts. Pure: no I/O, no clock, no globals
 * mutated. Pass any Drug[] (the real catalog or a tiny test fixture).
 *
 * Denominator (headline agreement): only (drug, target, role) pairs that FDA's
 * table actually lists AND whose drug resolves to a catalog entry. Catalog
 * drugs absent from the FDA table are never disagreements.
 *
 * Categories:
 *  - direction_mismatch   FDA lists inhibitor, we only say inducer on that target (or vice versa)
 *  - strength_mismatch    same role, different FDA class / substrate grade
 *  - missing_in_catalog   FDA lists the role, we have no role of that kind on that target
 *  - not_in_fda           we assert inhibitor/inducer for an FDA-listed drug where FDA lists none
 *                         (informational only: FDA's table is examples, not exhaustive)
 *  - drug_not_in_catalog  FDA drug we could not resolve to a catalog entry (coverage only)
 *
 * Formulary review list = direction_mismatch + strength_mismatch + missing_in_catalog.
 */
import type { Drug, EnzymeRole, SubstrateSensitivity } from "../types";
import { normalizeSearchText, stripSaltFormTokens } from "../catalog";
import { FDA_DDI_TABLE, FDA_TARGETS, type FdaDdiEntry, type FdaTarget } from "./fda-ddi-table";

export type DiscrepancyCategory =
  | "missing_in_catalog"
  | "not_in_fda"
  | "strength_mismatch"
  | "direction_mismatch"
  | "drug_not_in_catalog";

export type ReviewCategory = Extract<DiscrepancyCategory, "missing_in_catalog" | "strength_mismatch" | "direction_mismatch">;

export type PairOutcome = "match" | ReviewCategory;

export interface ComparedPair {
  fdaDrug: string;
  catalogId: string;
  catalogName: string;
  target: FdaTarget;
  kind: FdaDdiEntry["kind"];
  fdaClass: FdaDdiEntry["fdaClass"];
  /** Human-readable FDA role, e.g. "inhibitor (FDA strong)". */
  fdaRole: string;
  /** Human-readable catalog role(s) on that target, or null. */
  catalogRole: string | null;
  outcome: PairOutcome;
}

export interface Discrepancy {
  category: DiscrepancyCategory;
  fdaDrug: string;
  catalogId?: string;
  catalogName?: string;
  target?: FdaTarget;
  fdaRole?: string;
  catalogRole?: string | null;
}

export interface AgreementStats {
  compared: number;
  /** Role and class/grade both agree. */
  exact: number;
  /** Same role kind present on the target (class/grade ignored). */
  roleAgree: number;
  strengthMismatch: number;
  directionMismatch: number;
  missing: number;
  exactPct: number;
  rolePct: number;
}

export interface MatchedDrug {
  fdaDrug: string;
  catalogId: string;
  via: "id" | "name" | "alias" | "brand" | "reviewed-alias";
}

export interface ValidationResult {
  pairs: ComparedPair[];
  overall: AgreementStats;
  perTarget: Partial<Record<FdaTarget, AgreementStats>>;
  /** FDA strong inhibitor + strong inducer pairs only (the regression gate). */
  strongPerpetrators: AgreementStats;
  /** direction_mismatch + strength_mismatch + missing_in_catalog, for the formulary owner. */
  reviewList: Discrepancy[];
  /** Informational only; never counted against agreement. */
  notInFda: Discrepancy[];
  /** FDA drug names (in-scope rows) with no catalog entry. Coverage only. */
  drugsNotInCatalog: string[];
  matched: MatchedDrug[];
  counts: Record<DiscrepancyCategory, number>;
}

/**
 * Reviewed FDA-name → catalog-id links the generic normalizer cannot make
 * (FDA writes the active moiety or a class; we store the product). Keep this
 * list conservative: enantiomers (R-/S-venlafaxine), active moieties
 * (tenofovir), and single components of our combination products
 * (trimethoprim vs tmp-smx) are deliberately NOT linked.
 */
export const FDA_NAME_ALIASES: Readonly<Record<string, string>> = {
  "dabigatran etexilate": "dabigatran",
  "peginterferon alpha-2a": "peginterferon-alfa-2a",
  "oral contraceptives": "ethinyl-estradiol",
};

const key = (s: string) => stripSaltFormTokens(normalizeSearchText(s));
/** "lopinavir and ritonavir" ≈ "Lopinavir/ritonavir". */
const comboKey = (s: string) =>
  key(s)
    .split(" ")
    .filter((t) => t !== "and")
    .join(" ");

export function buildCatalogMatcher(
  drugs: readonly Drug[],
  aliases: Readonly<Record<string, string>> = FDA_NAME_ALIASES,
): (fdaName: string) => { drug: Drug; via: MatchedDrug["via"] } | null {
  const tiers: Record<"id" | "name" | "alias" | "brand", Map<string, Drug>> = {
    id: new Map(),
    name: new Map(),
    alias: new Map(),
    brand: new Map(),
  };
  const put = (m: Map<string, Drug>, k: string, d: Drug) => {
    if (k && !m.has(k)) m.set(k, d);
  };
  for (const d of drugs) {
    put(tiers.id, comboKey(d.id), d);
    put(tiers.name, comboKey(d.name), d);
    for (const a of d.aliases) put(tiers.alias, comboKey(a), d);
    for (const b of d.brands) put(tiers.brand, comboKey(b), d);
  }
  const byId = new Map(drugs.map((d) => [d.id, d]));
  const reviewed = new Map(Object.entries(aliases).map(([k, v]) => [comboKey(k), v]));
  return (fdaName) => {
    const k = comboKey(fdaName);
    if (!k) return null;
    const rid = reviewed.get(k);
    if (rid && byId.has(rid)) return { drug: byId.get(rid)!, via: "reviewed-alias" };
    for (const tier of ["id", "name", "alias", "brand"] as const) {
      const hit = tiers[tier].get(k);
      if (hit) return { drug: hit, via: tier };
    }
    return null;
  };
}

const SUBSTRATE_GRADE: Record<"sensitive" | "moderate-sensitive", SubstrateSensitivity> = {
  sensitive: "sensitive",
  "moderate-sensitive": "major",
};

export function describeFdaRole(e: Pick<FdaDdiEntry, "kind" | "fdaClass">): string {
  return e.fdaClass ? `${e.kind} (FDA ${e.fdaClass})` : e.kind;
}

export function describeCatalogRole(r: EnzymeRole): string {
  return r.kind === "substrate" ? `substrate (${r.sensitivity})` : `${r.kind} (${r.strength})`;
}

function emptyStats(): AgreementStats {
  return { compared: 0, exact: 0, roleAgree: 0, strengthMismatch: 0, directionMismatch: 0, missing: 0, exactPct: 0, rolePct: 0 };
}

function tally(s: AgreementStats, o: PairOutcome) {
  s.compared++;
  if (o === "match") {
    s.exact++;
    s.roleAgree++;
  } else if (o === "strength_mismatch") {
    s.strengthMismatch++;
    s.roleAgree++;
  } else if (o === "direction_mismatch") s.directionMismatch++;
  else s.missing++;
}

function finish(s: AgreementStats): AgreementStats {
  const pct = (n: number) => (s.compared ? Math.round((n / s.compared) * 1000) / 10 : 0);
  return { ...s, exactPct: pct(s.exact), rolePct: pct(s.roleAgree) };
}

export function classifyPair(entry: FdaDdiEntry, roles: readonly EnzymeRole[]): PairOutcome {
  const onTarget = roles.filter((r) => r.enzyme === entry.target);
  const same = onTarget.filter((r) => r.kind === entry.kind);
  if (entry.kind === "substrate") {
    if (!same.length) return "missing_in_catalog";
    if (!entry.fdaClass) return "match";
    const want = SUBSTRATE_GRADE[entry.fdaClass];
    return same.some((r) => r.kind === "substrate" && r.sensitivity === want) ? "match" : "strength_mismatch";
  }
  if (same.length) {
    if (!entry.fdaClass) return "match";
    return same.some((r) => r.kind !== "substrate" && r.strength === entry.fdaClass) ? "match" : "strength_mismatch";
  }
  const opposite = entry.kind === "inhibitor" ? "inducer" : "inhibitor";
  return onTarget.some((r) => r.kind === opposite) ? "direction_mismatch" : "missing_in_catalog";
}

export function validateAgainstFda(
  drugs: readonly Drug[],
  table: readonly FdaDdiEntry[] = FDA_DDI_TABLE,
  aliases: Readonly<Record<string, string>> = FDA_NAME_ALIASES,
): ValidationResult {
  const match = buildCatalogMatcher(drugs, aliases);
  const pairs: ComparedPair[] = [];
  const matched = new Map<string, MatchedDrug>();
  const missingDrugs = new Set<string>();
  const seen = new Set<string>();
  /** catalogId → FDA drug name → set of "target|kind" FDA lists. */
  const fdaRolesByCatalog = new Map<string, { fdaDrug: string; drug: Drug; roles: Set<string> }>();

  for (const entry of table) {
    const hit = match(entry.drug);
    if (!hit) {
      missingDrugs.add(entry.drug);
      continue;
    }
    const dedupe = `${hit.drug.id}|${entry.target}|${entry.kind}`;
    const bucket = fdaRolesByCatalog.get(hit.drug.id) ?? { fdaDrug: entry.drug, drug: hit.drug, roles: new Set<string>() };
    bucket.roles.add(`${entry.target}|${entry.kind}`);
    fdaRolesByCatalog.set(hit.drug.id, bucket);
    if (!matched.has(entry.drug)) matched.set(entry.drug, { fdaDrug: entry.drug, catalogId: hit.drug.id, via: hit.via });
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const onTarget = hit.drug.enzymes.filter((r) => r.enzyme === entry.target);
    pairs.push({
      fdaDrug: entry.drug,
      catalogId: hit.drug.id,
      catalogName: hit.drug.name,
      target: entry.target,
      kind: entry.kind,
      fdaClass: entry.fdaClass,
      fdaRole: describeFdaRole(entry),
      catalogRole: onTarget.length ? onTarget.map(describeCatalogRole).join("; ") : null,
      outcome: classifyPair(entry, hit.drug.enzymes),
    });
  }

  const overall = emptyStats();
  const strong = emptyStats();
  const perTarget: Partial<Record<FdaTarget, AgreementStats>> = {};
  const reviewList: Discrepancy[] = [];
  for (const p of pairs) {
    tally(overall, p.outcome);
    tally((perTarget[p.target] ??= emptyStats()), p.outcome);
    if (p.kind !== "substrate" && p.fdaClass === "strong") tally(strong, p.outcome);
    if (p.outcome !== "match") {
      reviewList.push({
        category: p.outcome,
        fdaDrug: p.fdaDrug,
        catalogId: p.catalogId,
        catalogName: p.catalogName,
        target: p.target,
        fdaRole: p.fdaRole,
        catalogRole: p.catalogRole,
      });
    }
  }
  for (const t of Object.keys(perTarget) as FdaTarget[]) perTarget[t] = finish(perTarget[t]!);

  const targets = new Set<string>(FDA_TARGETS);
  const notInFda: Discrepancy[] = [];
  for (const { fdaDrug, drug, roles } of fdaRolesByCatalog.values()) {
    for (const r of drug.enzymes) {
      if (r.kind === "substrate" || !targets.has(r.enzyme)) continue;
      if (roles.has(`${r.enzyme}|${r.kind}`)) continue;
      const opposite = r.kind === "inhibitor" ? "inducer" : "inhibitor";
      if (roles.has(`${r.enzyme}|${opposite}`)) continue; // already a direction_mismatch pair
      notInFda.push({
        category: "not_in_fda",
        fdaDrug,
        catalogId: drug.id,
        catalogName: drug.name,
        target: r.enzyme as FdaTarget,
        catalogRole: describeCatalogRole(r),
      });
    }
  }

  const order: Record<ReviewCategory, number> = { direction_mismatch: 0, strength_mismatch: 1, missing_in_catalog: 2 };
  reviewList.sort(
    (a, b) =>
      order[a.category as ReviewCategory] - order[b.category as ReviewCategory] ||
      a.fdaDrug.localeCompare(b.fdaDrug) ||
      String(a.target).localeCompare(String(b.target)),
  );
  const drugsNotInCatalog = [...missingDrugs].sort((a, b) => a.localeCompare(b));
  const count = (c: DiscrepancyCategory) => reviewList.filter((d) => d.category === c).length;

  return {
    pairs,
    overall: finish(overall),
    perTarget,
    strongPerpetrators: finish(strong),
    reviewList,
    notInFda,
    drugsNotInCatalog,
    matched: [...matched.values()],
    counts: {
      direction_mismatch: count("direction_mismatch"),
      strength_mismatch: count("strength_mismatch"),
      missing_in_catalog: count("missing_in_catalog"),
      not_in_fda: notInFda.length,
      drug_not_in_catalog: drugsNotInCatalog.length,
    },
  };
}

/** Stable key for the reviewed direction-mismatch allowlist. */
export const pairKey = (d: Pick<Discrepancy, "fdaDrug" | "target">) => `${d.fdaDrug}|${d.target}`;
