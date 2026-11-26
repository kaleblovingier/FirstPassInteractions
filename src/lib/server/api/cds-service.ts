/**
 * Clinical Decision Support (CDS) API Service.
 *
 * Senior Backend Service orchestrating multi-agent pharmacology calculations,
 * schema validation, BoundedLRU caching, and standardized RFC 7807 problem
 * responses.
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support.
 */

import {
  DRUG_BY_ID,
  DRUGS,
  normalizeSearchText,
  matchedStreetName,
  searchDrugs,
  saltFormKeys,
  streetNameIds,
} from "../../drugs/catalog";
import { COMBINATION_BY_KEY } from "../../drugs/combos";
import { readMedList } from "../../drugs/med-list";
import {
  getCompetitiveInhibitorById,
  getNuclearInducerById,
  getTdiPerpetratorById,
} from "../../drugs/cyp-kinetics";
import { analyze, enzymeIndex } from "../../drugs/engine";
import { NO_SINGLE_HALF_LIFE } from "../../drugs/half-lives";
import { CHRONIC_ETOH, HOST_ETOH_CNS, SMOKE, isVirtual, washoutsFor } from "../../drugs/host";
import { halfLifeFor } from "../../drugs/overlap";
import { getInteractionsForDrug } from "../../drugs/pharmacogenomics";
import { TDM, type TdmCard } from "../../drugs/tdm";
import {
  getTransporterRolesForDrug,
  type DrugTransporterRoleSummary,
} from "../../drugs/transporter-network";
import { PI_FOOTER } from "../../regulatory";
import {
  FANOUT_STAGES,
  FANOUT_RULE,
  pairSlots,
  summarizePairs,
  type PairwiseSummary,
} from "../../drugs/fanout";
import {
  DEFAULT_HOST,
  type Drug,
  type Enzyme,
  type Finding,
  type HostContext,
  type KidneyBand,
  type Report,
  type Severity,
} from "../../drugs/types";
import { SOFTWARE, STATUTORY_CDS_DISCLAIMER } from "../../regulatory";
import { BoundedLRUCache } from "../cache";
import { errorKind, logEvent } from "../log";
import {
  type HostContextInput,
  type KidneyCategory,
  type KineticsModuleName,
  AnalyzeRequestSchema,
  AutocompleteRequestSchema,
  DrugLookupRequestSchema,
  ExportRequestSchema,
  InteractionCheckRequestSchema,
  KineticsEvaluationRequestSchema,
  kidneyEgfrConflict,
  validateSchema,
} from "./schemas";
import {
  ApiProblemError,
  problemBadRequest,
  problemInternal,
  problemNotFound,
  problemUnprocessable,
  type InvalidParamError,
  type ProblemDetails,
} from "./problem";

// Regional specialized kinetics engines
import { oncologyReportOnDesk } from "../../drugs/oncology-kinetics";
import { antimicrobialReportOnDesk } from "../../drugs/antimicrobial-stewardship";
import { phenytoinReportOnDesk } from "../../drugs/phenytoin-kinetics";
import { pregnancyReportOnDesk } from "../../drugs/pregnancy-lactation";
import { vasoactiveReportOnDesk } from "../../drugs/vasoactive-kinetics";
import { transplantReportOnDesk } from "../../drugs/transplant-immunosuppression";
import { anticoagulationReportOnDesk } from "../../drugs/anticoagulation-reversal";
import { toxicologyReportOnDesk } from "../../drugs/toxicology-kinetics";
import { neuropsychReportOnDesk } from "../../drugs/neuropsych-kinetics";
import { antiarrhythmicReportOnDesk } from "../../drugs/antiarrhythmic-kinetics";
import { acidBaseReportOnDesk } from "../../drugs/acid-base-kinetics";
import { anesthesiaReportOnDesk } from "../../drugs/anesthesia-reversal";
import { statusEpilepticusReportOnDesk } from "../../drugs/status-epilepticus";
import { obstetricReportOnDesk } from "../../drugs/obstetric-kinetics";
import { moudReportOnDesk } from "../../drugs/moud-kinetics";
import { glycemicReportOnDesk } from "../../drugs/glycemic-kinetics";
import { pediatricReportOnDesk } from "../../drugs/pediatric-kinetics";
import { rotationReportOnDesk } from "../../drugs/opioid-rotation";
import { hepaticReportOnDesk } from "../../drugs/hepatic-clearance";
import { allergyReportOnDesk } from "../../drugs/drug-allergy";
import { afReportOnDesk } from "../../drugs/af-stroke-bleed";
import { diliReportOnDesk } from "../../drugs/dili";
import { healthcareResourcesFor } from "../../drugs/healthcare-resources";
import { thyroidReportOnDesk } from "../../drugs/thyroid";
import { dialysisOnDesk } from "../../drugs/dialysis";
import { lithiumReportOnDesk } from "../../drugs/lithium";
import { digoxinReportOnDesk } from "../../drugs/digoxin";
import { valproateReportOnDesk } from "../../drugs/valproate";
import { vancomycinReportOnDesk } from "../../drugs/vancomycin";
import { aminoglycosideReportOnDesk } from "../../drugs/aminoglycosides";
import { detectToxidromesOnTray } from "../../drugs/toxidromes";
import { detectArrhythmiaCollisions } from "../../drugs/cardiac-electrophysiology";
import {
  EXPORT_EMPTY,
  EXPORT_NOT_A_DOSE,
  buildMarkdownRegimenReport,
  buildStructuredRegimenJson,
  type StructuredRegimenExport,
} from "../../drugs/brief";
import { buildInteractionReport, type TriageEntry } from "../../drugs/interaction-report";
import type { InteractionReport } from "../../../types/interaction";

/** Lives in regulatory.ts so the /developers page can show it without loading the drug catalog. */
export { STATUTORY_CDS_DISCLAIMER };

export interface ApiDrugSummary {
  id: string;
  name: string;
  brand?: string;
  family?: string;
  classes?: string[];
  routes?: string[];
  cypRoles?: { enzyme: string; role: string; strength?: string }[];
}

/** A catalog drug, or a host factor the engine adds itself (tobacco smoke, host alcohol pattern). */
export interface ApiDrugRef {
  id: string;
  name: string;
  hostFactor?: true;
}

/** "street-name" is a search-only nickname ("Molly"); an official id, name, brand or alias always wins. */
export type DrugMatch = "id" | "name" | "brand-or-alias" | "combination" | "street-name";

/** How one requested string was read. Only an exact id, name, brand, alias, or combination name resolves. */
export type DrugResolution =
  | {
      query: string;
      status: "resolved";
      drugId: string;
      matchedBy: DrugMatch;
      /** Combination products only: every catalog row analyzed for it (drugId first) and its label. */
      drugIds?: string[];
      source?: string;
    }
  | { query: string; status: "ambiguous" | "not-found"; candidates: ApiDrugRef[] };

export type ApiWarningCode =
  | "drugs-unresolved"
  | "street-name-resolved"
  | "live-source-failed"
  | "host-field-not-modeled"
  | "pediatric-age-not-modeled"
  | "lactation-not-applied"
  | "module-failed"
  | "no-mapped-findings"
  | "text-truncated";

/** Something the result does not reflect, stated instead of silently dropped. */
export interface ApiWarning {
  code: ApiWarningCode;
  field?: string;
  detail: string;
}

export interface ApiResponseMeta {
  engine: string;
  version: string;
  timestamp: string;
  durationMs: number;
  /** True when the clinical payload came from the cache. The envelope is always built per request. */
  cached: boolean;
  disclaimer: string;
  fanout?: {
    stages: readonly string[];
    pairs: [number, number][];
    rule: string;
    pairwise?: PairwiseSummary[];
  };
}

export interface ApiFinding {
  id: string;
  kind: Finding["kind"];
  severity: Severity;
  /** Every distinct drug or host factor on the row, in engine order. */
  drugs: ApiDrugRef[];
  enzymes: Enzyme[];
  effect: string;
  mechanism: string;
  /** The row headline (original field name). */
  evidence: string;
  /** The row's teaching note (original field name). It is not a directive. */
  actionableAdvice: string;
  /** Engine tags: enzyme, direction, pathway, label-pin markers (original field name; not citations). */
  sourceReferences: string[];
  /** Set only on pharmacokinetic inhibitor/inducer rows, where one drug acts on the other. */
  perpetratorId?: string;
  perpetratorName?: string;
  victimId?: string;
  victimName?: string;
}

export interface InteractionSummary {
  totalFindings: number;
  contraindicatedCount: number;
  majorCount: number;
  moderateCount: number;
  minorCount: number;
  highest: Severity | "none";
  highestSeverity: string;
}

export interface ResolvedQuery {
  requestedDrugs: string[];
  resolvedDrugs: ApiDrugSummary[];
  unresolvedDrugs: string[];
  resolution: DrugResolution[];
  host: HostContext;
}

/** `summary` and `findings` are shared, frozen cache entries; copy before mutating. */
export interface InteractionCheckResult {
  meta: ApiResponseMeta & {
    fanout: {
      stages: readonly string[];
      pairs: [number, number][];
      rule: string;
      pairwise: PairwiseSummary[];
    };
  };
  query: ResolvedQuery;
  warnings: ApiWarning[];
  summary: Readonly<InteractionSummary>;
  findings: readonly ApiFinding[];
}

/** Stands in for a station that threw, so the other stations still return. */
export interface KineticsModuleError {
  error: { type: "module-error"; detail: string; correlationId: string };
}

/** `modules` is a shared, frozen cache entry; copy before mutating. */
export interface KineticsEvaluationResult {
  meta: ApiResponseMeta;
  query: ResolvedQuery & { drugIds: string[]; modules: KineticsModuleName[] };
  warnings: ApiWarning[];
  modules: Readonly<Partial<Record<KineticsModuleName, unknown>>>;
}

export type SuggestionMatch = DrugMatch | "search";

export interface AutocompleteSuggestion {
  id: string;
  canonicalName: string;
  /** How the typed text reached this row. "search" is a prefix or fuzzy hit, not an exact label. */
  matchedBy: SuggestionMatch;
  /** The brand, alias or street name that matched ("Molly"). Absent for an id, name or search hit. */
  resolvedFrom?: string;
}

export interface AutocompleteResult {
  meta: ApiResponseMeta;
  data: AutocompleteSuggestion[];
}

/** `data` is the InteractionReport for the tray; its rawInput values are this caller's. */
export interface AnalyzeResult {
  meta: ApiResponseMeta;
  query: ResolvedQuery;
  warnings: ApiWarning[];
  data: InteractionReport;
}

export type ExportRegimenResult =
  | {
      format: "json";
      report: StructuredRegimenExport;
    }
  | {
      format: "markdown";
      contentType: "text/markdown; charset=utf-8";
      markdown: string;
      compounds: number;
      findings: number;
    };

export type ServiceResult<T> =
  { success: true; data: T } | { success: false; problem: ProblemDetails };

export interface ApiDrugMonographResult {
  meta: ApiResponseMeta;
  monograph: {
    id: string;
    name: string;
    brands: string[];
    cls: string;
    kind: Drug["kind"];
    aliases: string[];
    toxicityHint: string;
    note: string | null;
    halfLife:
      | { kind: "linear"; hours: number; washout5xHours: number; source: string }
      | { kind: "non-linear"; note: string }
      | null;
    enzymes: Drug["enzymes"];
    pd: Drug["pd"];
    cpicGenes: Array<{
      id: string;
      geneSymbol: string;
      cpicLevel: string;
      therapeuticArea: string;
      fdaBoxedWarning: boolean;
      guidelineTitle: string;
      guidelineUrl: string;
    }>;
    transporters: DrugTransporterRoleSummary[];
    perpetratorKinetics: {
      tdi: { targetIsoforms: string[]; subMechanismLabel: string; recoveryTimeDays: string } | null;
      inducer: {
        receptor: string;
        inducedIsoforms: string[];
        onsetLagDays: number;
        offsetWashoutWeeks: number;
      } | null;
      competitive: {
        targetIsoforms: string[];
        kiMicromolar: number;
        offsetHours: number;
      } | null;
    };
    washoutClocks: Array<{ days: number; label: string }>;
    tdm: TdmCard | null;
    disclaimer: string;
    prescribingNote: string;
  };
}

type KineticsModuleRunner = (drugIds: string[], host: HostContext) => unknown;

interface InteractionPayload {
  summary: InteractionSummary;
  findings: ApiFinding[];
}

type KineticsPayload = Partial<Record<KineticsModuleName, unknown>>;

const KINETICS_MODULES: Record<KineticsModuleName, KineticsModuleRunner> = {
  oncology: oncologyReportOnDesk,
  antimicrobial: antimicrobialReportOnDesk,
  phenytoin: phenytoinReportOnDesk,
  pregnancy: pregnancyReportOnDesk,
  vasoactive: vasoactiveReportOnDesk,
  transplant: transplantReportOnDesk,
  anticoagulation: anticoagulationReportOnDesk,
  toxicology: toxicologyReportOnDesk,
  neuropsych: neuropsychReportOnDesk,
  antiarrhythmic: antiarrhythmicReportOnDesk,
  acidbase: acidBaseReportOnDesk,
  anesthesia: anesthesiaReportOnDesk,
  epilepsy: statusEpilepticusReportOnDesk,
  obstetric: obstetricReportOnDesk,
  moud: moudReportOnDesk,
  glycemic: glycemicReportOnDesk,
  pediatric: pediatricReportOnDesk,
  rotation: rotationReportOnDesk,
  hepatic: hepaticReportOnDesk,
  allergy: allergyReportOnDesk,
  af: afReportOnDesk,
  dili: diliReportOnDesk,
  resources: healthcareResourcesFor,
  thyroid: (drugIds, host) => thyroidReportOnDesk(drugIds, host),
  dialysis: (drugIds) => dialysisOnDesk(drugIds),
  lithium: (drugIds) => lithiumReportOnDesk(drugIds),
  digoxin: (drugIds) => digoxinReportOnDesk(drugIds),
  valproate: (drugIds, host) => valproateReportOnDesk(drugIds, host),
  vancomycin: (drugIds) => vancomycinReportOnDesk(drugIds),
  aminoglycosides: (drugIds) => aminoglycosideReportOnDesk(drugIds),
  toxidromes: (drugIds) => detectToxidromesOnTray(drugIds),
  arrhythmia: (drugIds) => detectArrhythmiaCollisions(drugIds),
};

const ALL_MODULES = Object.keys(KINETICS_MODULES) as KineticsModuleName[];

interface EngineEntryPoints {
  analyze: (drugIds: string[], host: HostContext) => Report;
  modules: Record<KineticsModuleName, KineticsModuleRunner>;
}

const engine: EngineEntryPoints = { analyze, modules: KINETICS_MODULES };

// Bounded LRU caches for computed clinical payloads with 10-minute TTL. Keys carry the resolved ids
// and the full host context; per-request fields (requested strings, warnings, timing) are not cached.
const interactionCache = new BoundedLRUCache<InteractionPayload>(500, 10 * 60 * 1000);
// A payload with every station runs to several hundred KB, so this cache holds fewer entries.
const kineticsCache = new BoundedLRUCache<KineticsPayload>(100, 10 * 60 * 1000);

const analyzeCache = new BoundedLRUCache<InteractionReport>(300, 10 * 60 * 1000);
const autocompleteCache = new BoundedLRUCache<AutocompleteSuggestion[]>(500, 10 * 60 * 1000);

function clearAllCaches(): void {
  analyzeCache.clear();
  autocompleteCache.clear();
  interactionCache.clear();
  kineticsCache.clear();
}

/**
 * Test seam: swaps engine entry points until the returned restore function runs.
 * Caches are cleared on both sides so a stubbed payload never outlives the override.
 */
export function overrideEngineForTesting(patch: {
  analyze?: EngineEntryPoints["analyze"];
  modules?: Partial<Record<KineticsModuleName, KineticsModuleRunner>>;
}): () => void {
  const previous = { ...engine };
  engine.analyze = patch.analyze ?? engine.analyze;
  engine.modules = { ...engine.modules, ...patch.modules };
  clearAllCaches();
  return () => {
    Object.assign(engine, previous);
    clearAllCaches();
  };
}

const INTERACTIONS_ENGINE = "FirstPass Interactions Engine";
const KINETICS_ENGINE = "FirstPass Multi-Domain Pharmacokinetics Engine";

function responseMeta(engineName: string, startedAt: number, cached: boolean): ApiResponseMeta {
  return {
    engine: engineName,
    version: SOFTWARE.version,
    timestamp: new Date().toISOString(),
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    cached,
    disclaimer: STATUTORY_CDS_DISCLAIMER,
  };
}

/** Stable JSON with sorted keys, so equal host contexts always produce the same cache key. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value) || ArrayBuffer.isView(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function copyHost(host: HostContext): HostContext {
  return { ...host, phenotypes: { ...host.phenotypes } };
}

function catalogDrug(id: string): Drug | undefined {
  return Object.hasOwn(DRUG_BY_ID, id) ? DRUG_BY_ID[id] : undefined;
}

const HOST_FACTOR_NAMES = new Map([SMOKE, CHRONIC_ETOH, HOST_ETOH_CNS].map((d) => [d.id, d.name]));

function drugRef(id: string): ApiDrugRef {
  if (isVirtual(id)) return { id, name: HOST_FACTOR_NAMES.get(id) ?? id, hostFactor: true };
  return { id, name: catalogDrug(id)?.name ?? id };
}

type ExactIndex = Record<Exclude<DrugMatch, "combination" | "street-name">, Map<string, string[]>>;

let exactIndex: ExactIndex | undefined;

/** Normalized id, generic-name, and brand/alias keys over the catalog; built once on first use. */
function getExactIndex(): ExactIndex {
  if (exactIndex) return exactIndex;
  const index: ExactIndex = { id: new Map(), name: new Map(), "brand-or-alias": new Map() };
  const add = (map: Map<string, string[]>, label: string, drugId: string) => {
    const key = normalizeSearchText(label);
    if (!key) return;
    const ids = map.get(key);
    if (!ids) map.set(key, [drugId]);
    else if (!ids.includes(drugId)) ids.push(drugId);
  };
  for (const drug of DRUGS) {
    add(index.id, drug.id, drug.id);
    add(index.name, drug.name, drug.id);
    for (const label of [...drug.brands, ...drug.aliases]) {
      add(index["brand-or-alias"], label, drug.id);
    }
  }
  exactIndex = index;
  return index;
}

const MATCH_ORDER: readonly (keyof ExactIndex)[] = ["id", "name", "brand-or-alias"];
const MAX_CANDIDATES = 5;

/** Suggestions only; a search failure must not fail the check that asked for them. */
function searchCandidates(query: string): ApiDrugRef[] {
  try {
    return searchDrugs(query)
      .slice(0, MAX_CANDIDATES)
      .map((drug) => drugRef(drug.id));
  } catch (error) {
    logEvent("warn", "cds.candidate_search_failed", { errorKind: errorKind(error) });
    return [];
  }
}

/**
 * Reads one requested string as an exact catalog id, generic name, brand, or alias (case,
 * punctuation, and trailing salt/release tokens ignored), or as a combination product name, which
 * resolves to every cataloged ingredient (`drugIds`). A key shared by more than one entry is
 * ambiguous. Partial and misspelled strings never resolve, because a near miss can name a
 * different drug; they come back with search candidates instead.
 */
export function resolveDrugQuery(query: string): DrugResolution {
  const index = getExactIndex();
  const normalized = normalizeSearchText(query);
  for (const key of saltFormKeys(normalized)) {
    if (!key) continue;
    // A combination name (Percocet) reads as all of its ingredients; no such name is an id or generic name.
    const combo = COMBINATION_BY_KEY.get(key);
    if (combo) {
      return { query, status: "resolved", drugId: combo.ids[0], matchedBy: "combination", drugIds: [...combo.ids], source: combo.source };
    }
    for (const matchedBy of MATCH_ORDER) {
      const ids = index[matchedBy].get(key);
      if (!ids) continue;
      if (ids.length === 1) return { query, status: "resolved", drugId: ids[0], matchedBy };
      const candidates = ids.map(drugRef).sort((a, b) => a.name.localeCompare(b.name));
      return { query, status: "ambiguous", candidates };
    }
  }
  // Last resort: a street name is not an official label, so it never outranks one.
  const street = streetNameIds(query);
  if (street.length === 1) {
    return { query, status: "resolved", drugId: street[0]!, matchedBy: "street-name" };
  }
  if (street.length > 1) {
    return { query, status: "ambiguous", candidates: street.map(drugRef) };
  }
  return { query, status: "not-found", candidates: normalized ? searchCandidates(query) : [] };
}

/** Up to 24 rows for the typed text: exact labels first, then street names, then loose hits. */
function suggestFor(q: string): AutocompleteSuggestion[] {
  const key = normalizeSearchText(q);
  const found = searchDrugs(q);
  const seen = new Set(found.map((d) => d.id));
  const nicknames = streetNameIds(q).filter((id) => !seen.has(id) && catalogDrug(id));
  const rows = [...found, ...nicknames.map((id) => DRUG_BY_ID[id]!)].map(
    (drug): AutocompleteSuggestion => {
      const base = { id: drug.id, canonicalName: drug.name };
      if (normalizeSearchText(drug.id) === key) return { ...base, matchedBy: "id" };
      if (normalizeSearchText(drug.name) === key) return { ...base, matchedBy: "name" };
      const label = [...drug.brands, ...drug.aliases].find((l) => normalizeSearchText(l) === key);
      if (label) return { ...base, matchedBy: "brand-or-alias", resolvedFrom: label };
      const street = matchedStreetName(drug.id, q);
      if (street) return { ...base, matchedBy: "street-name", resolvedFrom: street };
      return { ...base, matchedBy: "search" };
    },
  );
  const rank = (m: SuggestionMatch) => (m === "search" ? 2 : m === "street-name" ? 1 : 0);
  return rows
    .map((row, i) => ({ row, i }))
    .sort((x, y) => rank(x.row.matchedBy) - rank(y.row.matchedBy) || x.i - y.i)
    .map((x) => x.row)
    .slice(0, 24);
}

export function resolveDrug(query: string): Drug | undefined {
  const resolution = resolveDrugQuery(query);
  return resolution.status === "resolved" ? catalogDrug(resolution.drugId) : undefined;
}

export function toApiDrugSummary(drug: Drug): ApiDrugSummary {
  return {
    id: drug.id,
    name: drug.name,
    brand: drug.brands?.[0],
    family: drug.cls,
    classes: [drug.cls],
    cypRoles: drug.enzymes?.map((r) => ({
      enzyme: r.enzyme,
      role: r.kind,
      strength: "strength" in r ? r.strength : r.sensitivity,
    })),
  };
}

interface RequestedDrugs {
  /** Sorted, de-duplicated catalog ids: the engine input and the cache key. */
  ids: string[];
  query: Omit<ResolvedQuery, "host">;
}

function resolveRequestedDrugs(requested: string[]): RequestedDrugs {
  const resolution = requested.map(resolveDrugQuery);
  const ordered: string[] = [];
  for (const r of resolution) {
    if (r.status !== "resolved") continue;
    for (const id of r.drugIds ?? [r.drugId]) if (!ordered.includes(id)) ordered.push(id);
  }
  return {
    ids: [...ordered].sort(),
    query: {
      requestedDrugs: [...requested],
      resolvedDrugs: ordered.map((id) => toApiDrugSummary(DRUG_BY_ID[id])),
      unresolvedDrugs: resolution.filter((r) => r.status !== "resolved").map((r) => r.query),
      resolution,
    },
  };
}

function unresolvedWarnings(query: Omit<ResolvedQuery, "host">): ApiWarning[] {
  const missing = query.unresolvedDrugs.length;
  if (!missing) return [];
  const total = query.requestedDrugs.length;
  return [
    {
      code: "drugs-unresolved",
      field: "drugs",
      detail: `${missing} of ${total} requested item${total === 1 ? "" : "s"} did not match exactly one catalog entry and ${missing === 1 ? "was" : "were"} not analyzed. A missing row is not a clearance.`,
    },
  ];
}

/** A nickname can mean more than one thing ("K"), so a street-name read is always said out loud. */
function streetNameWarnings(resolution: readonly DrugResolution[]): ApiWarning[] {
  return resolution.flatMap((r) =>
    r.status === "resolved" && r.matchedBy === "street-name"
      ? [
          {
            code: "street-name-resolved" as const,
            field: "drugs",
            detail: `"${r.query}" was read as the street name for ${catalogDrug(r.drugId)?.name ?? r.drugId} (${r.drugId}). Street names are slang and can mean more than one thing; send the catalog id to be exact.`,
          },
        ]
      : [],
  );
}

function unresolvedReason(resolution: DrugResolution): string {
  if (resolution.status === "resolved") return "Resolved.";
  const names = resolution.candidates.map((c) => `${c.name} (${c.id})`).join(", ");
  if (resolution.status === "ambiguous") {
    return `Matches more than one catalog entry: ${names}. Send the catalog id.`;
  }
  return names ? `No exact catalog match. Closest entries: ${names}.` : "No exact catalog match.";
}

function noneResolvedProblem(resolution: DrugResolution[]): ProblemDetails {
  const invalidParams: InvalidParamError[] = resolution.map((r, i) => ({
    name: `drugs.${i}`,
    reason: unresolvedReason(r),
  }));
  return problemNotFound(
    "None of the requested drugs matched exactly one catalog entry by id, generic name, brand, or alias, so nothing was analyzed.",
    undefined,
    invalidParams,
  );
}

const KIDNEY_BAND: Record<KidneyCategory, { band: KidneyBand; ckdStage?: number }> = {
  normal: { band: "ok" },
  mild: { band: "ok" },
  moderate: { band: "ckd", ckdStage: 3 },
  severe: { band: "ckd", ckdStage: 4 },
  esrd: { band: "ckd", ckdStage: 5 },
};

/** KDIGO G3–G5 from eGFR alone. G1–G2 need markers of kidney damage, so 60 or more sets no stage. */
function ckdStageForEgfr(egfr: number): number | undefined {
  if (egfr < 15) return 5;
  if (egfr < 30) return 4;
  if (egfr < 60) return 3;
  return undefined;
}

const PEDIATRIC_AGE_DETAIL =
  "Age under 18: the core interaction engine has no pediatric age band, so adult rules were applied. The pediatric station does not read this age either; it reports its built-in neonatal teaching case.";

const LACTATION_NOT_APPLIED =
  "Pregnant and lactating were both set. The engine models one reproductive state at a time, so pregnancy rules were applied and lactation rules were not.";

const UNMODELED_HOST_FIELDS: Partial<Record<keyof HostContextInput, string>> = {
  sex: "Sex is accepted but not used: no part of the engine reads it from this request.",
  weightKg:
    "Body weight is accepted but not used: no part of the engine reads it from this request, and the service does not dose.",
  scr: "Serum creatinine is accepted but not used, and it is not converted to an eGFR here. For renal context send egfr (mL/min/1.73 m²) or a kidney category.",
  ph: "Arterial pH is accepted but not used: no part of the engine reads it from this request.",
  serumAlbumin:
    "Serum albumin is accepted but not used: stations that adjust for albumin use their own teaching defaults, not this value.",
  urinePh: "Urine pH is accepted but not used: no part of the engine reads it from this request.",
};

/**
 * Maps a request host block onto the engine HostContext. eGFR sets the kidney band and CKD stage;
 * fields the engine cannot use come back as warnings instead of being dropped. Throws an
 * ApiProblemError (422) when the kidney category and eGFR disagree.
 */
export function resolveHostContext(input?: HostContextInput): {
  host: HostContext;
  warnings: ApiWarning[];
} {
  const host = copyHost(DEFAULT_HOST);
  const warnings: ApiWarning[] = [];
  if (!input) return { host, warnings };

  const conflict = kidneyEgfrConflict(input.kidney, input.egfr);
  if (conflict) {
    throw new ApiProblemError(
      problemUnprocessable("Validation failed for host context", [
        { name: "host.egfr", reason: conflict, value: undefined },
      ]),
    );
  }

  if (input.age !== undefined) {
    host.age = input.age >= 65 ? "geriatric" : "adult";
    if (input.age < 18) {
      warnings.push({
        code: "pediatric-age-not-modeled",
        field: "host.age",
        detail: PEDIATRIC_AGE_DETAIL,
      });
    }
  }

  if (input.kidney !== undefined) {
    const { band, ckdStage } = KIDNEY_BAND[input.kidney];
    host.kidney = band;
    if (ckdStage !== undefined) host.ckdStage = ckdStage;
  }
  if (input.egfr !== undefined) {
    const ckdStage = ckdStageForEgfr(input.egfr);
    host.egfr = input.egfr;
    host.kidney = ckdStage === undefined ? "ok" : "ckd";
    if (ckdStage !== undefined) host.ckdStage = ckdStage;
  }

  if (input.pregnant) {
    host.preg = "pregnant";
    if (input.lactating) {
      warnings.push({
        code: "lactation-not-applied",
        field: "host.lactating",
        detail: LACTATION_NOT_APPLIED,
      });
    }
  } else if (input.lactating) {
    host.preg = "lactating";
  }

  if (input.smoker !== undefined) host.smoking = input.smoker;

  for (const [field, detail] of Object.entries(UNMODELED_HOST_FIELDS)) {
    if (input[field as keyof HostContextInput] !== undefined) {
      warnings.push({ code: "host-field-not-modeled", field: `host.${field}`, detail });
    }
  }

  return { host, warnings };
}

/** Engine HostContext for a request host block. Throws ApiProblemError when kidney and eGFR disagree. */
export function buildHostContext(input?: HostContextInput): HostContext {
  return resolveHostContext(input).host;
}

const HIGHEST_SEVERITY_LABEL: Record<Severity | "none", string> = {
  contraindicated: "Contraindicated",
  major: "Major",
  moderate: "Moderate",
  minor: "Minor",
  none: "None",
};

/** Pharmacokinetic inhibitor/inducer rows list the perpetrator first, then the victim (engine.ts). */
function hasDirection(finding: Finding): boolean {
  return (
    finding.kind === "pk" &&
    finding.drugIds.length === 2 &&
    (finding.tags.includes("inhibitor") || finding.tags.includes("inducer"))
  );
}

function toApiFinding(finding: Finding): ApiFinding {
  const drugs = [...new Set(finding.drugIds)].map(drugRef);
  const row: ApiFinding = {
    id: finding.id,
    kind: finding.kind,
    severity: finding.severity,
    drugs,
    enzymes: [...finding.enzymes],
    effect: finding.effect,
    mechanism: finding.mechanism || finding.effect,
    evidence: finding.headline,
    actionableAdvice: finding.clinical,
    sourceReferences: [...finding.tags],
  };
  if (hasDirection(finding)) {
    const [perpetrator, victim] = drugs;
    row.perpetratorId = perpetrator.id;
    row.perpetratorName = perpetrator.name;
    row.victimId = victim.id;
    row.victimName = victim.name;
  }
  return row;
}

function buildInteractionPayload(report: Report): InteractionPayload {
  return deepFreeze({
    summary: {
      totalFindings: report.findings.length,
      contraindicatedCount: report.counts.contraindicated,
      majorCount: report.counts.major,
      moderateCount: report.counts.moderate,
      minorCount: report.counts.minor,
      highest: report.highest,
      highestSeverity: HIGHEST_SEVERITY_LABEL[report.highest],
    },
    findings: report.findings.map(toApiFinding),
  });
}

function selectModules(requested?: readonly (KineticsModuleName | "all")[]): KineticsModuleName[] {
  if (!requested || requested.includes("all")) return [...ALL_MODULES];
  const wanted = new Set(requested);
  return ALL_MODULES.filter((name) => wanted.has(name));
}

const MODULE_ERROR_DETAIL =
  "This station could not be evaluated for this request. Other stations are unaffected.";

function runKineticsModules(
  names: KineticsModuleName[],
  drugIds: string[],
  host: HostContext,
): { modules: KineticsPayload; failed: KineticsModuleName[] } {
  const modules: KineticsPayload = {};
  const failed: KineticsModuleName[] = [];
  let correlationId: string | undefined;
  for (const name of names) {
    try {
      // Cloned before freezing: station reports can share objects with module-level tables.
      modules[name] = deepFreeze(
        structuredClone(engine.modules[name]([...drugIds], copyHost(host))),
      );
    } catch (error) {
      correlationId ??= crypto.randomUUID();
      logEvent("warn", "cds.kinetics.module_failed", {
        module: name,
        errorKind: errorKind(error),
        correlationId,
      });
      const marker: KineticsModuleError = {
        error: { type: "module-error", detail: MODULE_ERROR_DETAIL, correlationId },
      };
      modules[name] = marker;
      failed.push(name);
    }
  }
  return { modules: deepFreeze(modules), failed };
}

function moduleFailedWarning(name: KineticsModuleName): ApiWarning {
  return {
    code: "module-failed",
    field: `modules.${name}`,
    detail: `The ${name} station could not be evaluated; its entry holds an error marker with a correlation id. Other stations are unaffected.`,
  };
}

function toProblem(error: unknown, operation: string): ProblemDetails {
  if (error instanceof ApiProblemError) return error.problem;
  const correlationId = crypto.randomUUID();
  logEvent("error", "cds.request_failed", {
    operation,
    errorKind: errorKind(error),
    correlationId,
  });
  return problemInternal(
    "The request could not be completed. Quote the correlation id when reporting this.",
    correlationId,
  );
}

function formatHostLine(host: HostContext): string | undefined {
  const parts: string[] = [];
  if (host.age === "geriatric") parts.push("Geriatric");
  if (host.kidney === "ckd") {
    const stage = host.ckdStage ? `CKD stage ${host.ckdStage}` : "CKD";
    parts.push(host.egfr !== undefined ? `${stage} (eGFR ${host.egfr})` : stage);
  }
  if (host.preg === "pregnant") parts.push("Pregnant");
  else if (host.preg === "lactating") parts.push("Lactating");
  if (host.smoking) parts.push("Smoker");
  return parts.length ? parts.join(" · ") : undefined;
}

export class ClinicalDecisionService {
  /**
   * Search drug catalog with auto-suggestions and optional enzyme/role/class filtering.
   * Fuzzy by design; checks resolve exact matches only.
   */
  static search(rawRequest: unknown): ServiceResult<ApiDrugSummary[]> {
    try {
      const val = validateSchema(DrugLookupRequestSchema, rawRequest);
      if (!val.success) {
        return {
          success: false,
          problem: problemUnprocessable("Invalid search parameters", val.errors),
        };
      }
      const { q, enzyme, role, cls, limit } = val.data;
      if (q && !enzyme && !role && !cls) {
        return { success: true, data: searchDrugs(q).slice(0, limit).map(toApiDrugSummary) };
      }

      let pool: readonly Drug[];
      if (q) {
        pool = searchDrugs(q);
      } else if (enzyme) {
        const bucket = enzymeIndex()[enzyme];
        if (role === "substrate") pool = bucket.substrates;
        else if (role === "inhibitor") pool = bucket.inhibitors;
        else if (role === "inducer") pool = bucket.inducers;
        else {
          const seen = new Set<string>();
          const merged: Drug[] = [];
          for (const d of [...bucket.inhibitors, ...bucket.inducers, ...bucket.substrates]) {
            if (seen.has(d.id)) continue;
            seen.add(d.id);
            merged.push(d);
          }
          merged.sort((a, b) => a.name.localeCompare(b.name));
          pool = merged;
        }
      } else {
        pool = [...DRUGS].sort((a, b) => a.name.localeCompare(b.name));
      }

      const normCls = cls ? normalizeSearchText(cls) : undefined;
      const filtered = pool.filter((drug) => {
        if (enzyme && role && !drug.enzymes.some((e) => e.enzyme === enzyme && e.kind === role)) {
          return false;
        }
        if (enzyme && !role && !drug.enzymes.some((e) => e.enzyme === enzyme)) {
          return false;
        }
        if (!enzyme && role && !drug.enzymes.some((e) => e.kind === role)) {
          return false;
        }
        if (normCls && !normalizeSearchText(drug.cls).includes(normCls)) {
          return false;
        }
        return true;
      });

      return { success: true, data: filtered.slice(0, limit).map(toApiDrugSummary) };
    } catch (error) {
      return { success: false, problem: toProblem(error, "search") };
    }
  }

  /**
   * Export a regimen monograph as structured JSON or Markdown.
   */
  static async exportRegimen(rawRequest: unknown): Promise<ServiceResult<ExportRegimenResult>> {
    try {
      const val = validateSchema(ExportRequestSchema, rawRequest);
      if (!val.success) {
        return {
          success: false,
          problem: problemBadRequest("Validation failed for regimen export request", val.errors),
        };
      }

      const { host } = resolveHostContext(val.data.host);
      const drugs = resolveRequestedDrugs(val.data.drugs);
      if (drugs.query.unresolvedDrugs.length > 0 || !drugs.ids.length) {
        const invalidParams: InvalidParamError[] = drugs.query.resolution.flatMap((r, i) =>
          r.status === "resolved"
            ? []
            : [{ name: `drugs.${i}`, reason: unresolvedReason(r), value: undefined }],
        );
        return {
          success: false,
          problem: problemBadRequest(
            "One or more requested drugs did not match a catalog entry by id, generic name, brand, or alias.",
            invalidParams,
          ),
        };
      }

      const trayIds = drugs.query.resolvedDrugs.map((d) => d.id);
      const analysis = engine.analyze(trayIds, copyHost(host));
      const hostLine = formatHostLine(host);

      if (val.data.format === "markdown") {
        const markdown = buildMarkdownRegimenReport({
          trayIds,
          report: analysis,
          hostLine,
        });
        return {
          success: true,
          data: {
            format: "markdown",
            contentType: "text/markdown; charset=utf-8",
            markdown,
            compounds: trayIds.length,
            findings: analysis.findings.length,
          },
        };
      }

      const report = buildStructuredRegimenJson({
        trayIds,
        report: analysis,
        hostLine,
      });
      return {
        success: true,
        data: {
          format: "json",
          report,
        },
      };
    } catch (error) {
      return { success: false, problem: toProblem(error, "export") };
    }
  }

  /**
   * Typeahead for API clients: catalog rows that match, each with how it matched. The desk
   * searches locally; this is for outside consumers.
   */
  static autocomplete(rawRequest: unknown): ServiceResult<AutocompleteResult> {
    const startedAt = performance.now();
    try {
      const val = validateSchema(AutocompleteRequestSchema, rawRequest);
      if (!val.success) {
        return {
          success: false,
          problem: problemUnprocessable("Invalid autocomplete parameters", val.errors),
        };
      }
      const { q, limit } = val.data;
      const key = `ac|${normalizeSearchText(q)}`;
      const hit = autocompleteCache.get(key);
      const all = hit ?? suggestFor(q);
      if (!hit) autocompleteCache.set(key, all);
      return {
        success: true,
        data: {
          meta: responseMeta(INTERACTIONS_ENGINE, startedAt, hit !== undefined),
          data: all.slice(0, limit),
        },
      };
    } catch (error) {
      return { success: false, problem: toProblem(error, "autocomplete") };
    }
  }

  /**
   * One tray in, one InteractionReport out: every pair, the synergy alerts, and with `live` the
   * outside sources. Names resolve exactly as in /check; a street name resolves with a warning.
   */
  static async analyze(rawRequest: unknown): Promise<ServiceResult<AnalyzeResult>> {
    const startedAt = performance.now();
    try {
      const val = validateSchema(AnalyzeRequestSchema, rawRequest);
      if (!val.success) {
        return {
          success: false,
          problem: problemUnprocessable("Validation failed for analyze request", val.errors),
        };
      }
      const { host, warnings } = resolveHostContext(val.data.host);
      // A pasted list is read like the desk's paste box: names only, doses dropped.
      const read = val.data.text === undefined ? null : readMedList(val.data.text);
      if (read && read.names.length === 0) {
        return {
          success: false,
          problem: problemUnprocessable("Validation failed for analyze request", [
            { name: "text", reason: "No medicine names were found in text." },
          ]),
        };
      }
      // The same 20 the substances list allows.
      const substances = val.data.substances ?? read?.names.slice(0, 20) ?? [];
      const leftOut = read ? read.names.length - substances.length + read.more : 0;
      const requested = substances.map((s) => (typeof s === "string" ? { name: s } : s));
      const drugs = resolveRequestedDrugs(requested.map((s) => s.name));
      if (!drugs.ids.length) {
        return { success: false, problem: noneResolvedProblem(drugs.query.resolution) };
      }

      // Tray order is request order; a combination product expands in place.
      const entries: TriageEntry[] = [];
      drugs.query.resolution.forEach((r, i) => {
        if (r.status !== "resolved") return;
        const hoursAgo = (requested[i] as { ingestionTimeHoursAgo?: number }).ingestionTimeHoursAgo;
        for (const id of r.drugIds ?? [r.drugId]) {
          if (entries.some((e) => e.id === id)) continue;
          entries.push({ rawInput: r.query, id, ...(hoursAgo === undefined ? {} : { hoursAgo }) });
        }
      });

      const extra: ApiWarning[] = [];
      if (leftOut > 0) {
        extra.push({
          code: "text-truncated",
          field: "text",
          detail: `Analyzed the first ${substances.length} names in text; ${leftOut} more were left out. A missing row is not a clearance.`,
        });
      }
      let report: InteractionReport;
      let cached = false;
      if (val.data.live) {
        // Outside data moves, so a live report is never cached.
        const { buildLiveInteractionReport } = await import("../../drugs/interaction-report.server");
        const live = await buildLiveInteractionReport(entries, { host });
        report = live.report;
        extra.push(
          ...live.warnings.map((detail) => ({ code: "live-source-failed" as const, field: "live", detail })),
        );
      } else {
        const key = `an|${entries.map((e) => `${e.id}@${e.hoursAgo ?? ""}`).join(",")}|${canonicalJson(host)}`;
        const hit = analyzeCache.get(key);
        report = hit ?? buildInteractionReport(entries, { host: copyHost(host) });
        if (!hit) analyzeCache.set(key, report);
        cached = hit !== undefined;
      }
      // A cached report may hold another caller's wording; this caller's input comes back as sent.
      const rawById = new Map(entries.map((e) => [e.id, e.rawInput]));
      const data: InteractionReport = {
        ...report,
        substances: report.substances.map((s) => ({ ...s, rawInput: rawById.get(s.id) ?? s.rawInput })),
        metadata: {
          timestamp: new Date().toISOString(),
          cached,
          executionTimeMs: Math.round(performance.now() - startedAt),
        },
      };
      return {
        success: true,
        data: {
          meta: responseMeta(INTERACTIONS_ENGINE, startedAt, cached),
          query: { ...drugs.query, host },
          warnings: [
            ...unresolvedWarnings(drugs.query),
            ...streetNameWarnings(drugs.query.resolution),
            ...warnings,
            ...extra,
          ],
          data,
        },
      };
    } catch (error) {
      return { success: false, problem: toProblem(error, "analyze") };
    }
  }

  /**
   * Check interactions across a multi-drug regimen with host context.
   */
  static async checkInteractions(
    rawRequest: unknown,
  ): Promise<ServiceResult<InteractionCheckResult>> {
    const startedAt = performance.now();
    try {
      const val = validateSchema(InteractionCheckRequestSchema, rawRequest);
      if (!val.success) {
        return {
          success: false,
          problem: problemUnprocessable(
            "Validation failed for interaction check request",
            val.errors,
          ),
        };
      }

      const { host, warnings } = resolveHostContext(val.data.host);
      const drugs = resolveRequestedDrugs(val.data.drugs);
      if (!drugs.ids.length) {
        return { success: false, problem: noneResolvedProblem(drugs.query.resolution) };
      }

      const cacheKey = `ix|${drugs.ids.join(",")}|${canonicalJson(host)}`;
      const hit = interactionCache.get(cacheKey);
      const payload = hit ?? buildInteractionPayload(engine.analyze(drugs.ids, copyHost(host)));
      if (!hit) interactionCache.set(cacheKey, payload);

      return {
        success: true,
        data: {
          meta: {
            ...responseMeta(INTERACTIONS_ENGINE, startedAt, hit !== undefined),
            fanout: {
              stages: [...FANOUT_STAGES],
              pairs: pairSlots(drugs.ids.length),
              rule: FANOUT_RULE,
              pairwise: summarizePairs(
                drugs.ids,
                payload.findings.map((f) => ({ drugIds: f.drugs.map((d) => d.id), severity: f.severity })),
              ),
            },
          },
          query: { ...drugs.query, host },
          warnings: [
            ...unresolvedWarnings(drugs.query),
            ...streetNameWarnings(drugs.query.resolution),
            ...warnings,
            // An empty list must not read as a clearance (highestSeverity "None").
            ...(payload.findings.length ? [] : [{ code: "no-mapped-findings" as const, detail: EXPORT_EMPTY }]),
          ],
          summary: payload.summary,
          findings: payload.findings,
        },
      };
    } catch (error) {
      return { success: false, problem: toProblem(error, "interactions") };
    }
  }

  /**
   * Evaluate pharmacokinetic stations across specialty domains.
   */
  static async evaluateKinetics(
    rawRequest: unknown,
  ): Promise<ServiceResult<KineticsEvaluationResult>> {
    const startedAt = performance.now();
    try {
      const val = validateSchema(KineticsEvaluationRequestSchema, rawRequest);
      if (!val.success) {
        return {
          success: false,
          problem: problemUnprocessable(
            "Validation failed for kinetics evaluation request",
            val.errors,
          ),
        };
      }

      const { host, warnings } = resolveHostContext(val.data.host);
      const drugs = resolveRequestedDrugs(val.data.drugs);
      if (!drugs.ids.length) {
        return { success: false, problem: noneResolvedProblem(drugs.query.resolution) };
      }

      const moduleNames = selectModules(val.data.modules);
      const cacheKey = `kin|${drugs.ids.join(",")}|${moduleNames.join(",")}|${canonicalJson(host)}`;
      const hit = kineticsCache.get(cacheKey);
      let modules = hit;
      const moduleWarnings: ApiWarning[] = [];
      if (!modules) {
        const run = runKineticsModules(moduleNames, drugs.ids, host);
        modules = run.modules;
        // A failed station carries this request's correlation id, so that payload is never shared.
        if (run.failed.length) moduleWarnings.push(...run.failed.map(moduleFailedWarning));
        else kineticsCache.set(cacheKey, modules);
      }

      return {
        success: true,
        data: {
          meta: responseMeta(KINETICS_ENGINE, startedAt, hit !== undefined),
          query: { ...drugs.query, drugIds: [...drugs.ids], modules: moduleNames, host },
          warnings: [
            ...unresolvedWarnings(drugs.query),
            ...streetNameWarnings(drugs.query.resolution),
            ...warnings,
            ...moduleWarnings,
          ],
          modules,
        },
      };
    } catch (error) {
      return { success: false, problem: toProblem(error, "kinetics") };
    }
  }

  /**
   * Retrieve a complete structured clinical pharmacology monograph for a single catalog compound.
   */
  static getMonograph(rawId: string): ServiceResult<ApiDrugMonographResult> {
    const startedAt = performance.now();
    try {
      const trimmed = typeof rawId === "string" ? rawId.trim() : "";
      if (!trimmed || trimmed.length > 120) {
        return {
          success: false,
          problem: problemNotFound(`Compound monograph '${trimmed}' not found`),
        };
      }
      const direct = catalogDrug(trimmed.toLowerCase());
      let drug = direct;
      if (!drug) {
        const resolved = resolveRequestedDrugs([trimmed]);
        const firstId = resolved.ids[0];
        if (firstId) drug = catalogDrug(firstId);
      }
      if (!drug) {
        return {
          success: false,
          problem: problemNotFound(`Compound monograph '${trimmed}' not found`),
        };
      }

      const hasNonLinear = Object.hasOwn(NO_SINGLE_HALF_LIFE, drug.id);
      const hl = hasNonLinear ? undefined : halfLifeFor(drug.id);
      const halfLife = hasNonLinear
        ? ({ kind: "non-linear", note: NO_SINGLE_HALF_LIFE[drug.id]! } as const)
        : hl
          ? ({
              kind: "linear",
              hours: hl.hours,
              washout5xHours: Math.round(hl.hours * 5 * 10) / 10,
              source: hl.source,
            } as const)
          : null;

      const cpicGenes = getInteractionsForDrug(drug.id).map((ix) => ({
        id: ix.id,
        geneSymbol: ix.geneSymbol,
        cpicLevel: ix.cpicLevel,
        therapeuticArea: ix.therapeuticArea,
        fdaBoxedWarning: ix.fdaBoxedWarning,
        guidelineTitle: ix.guidelineTitle,
        guidelineUrl: ix.guidelineUrl,
      }));
      const transporters = getTransporterRolesForDrug(drug.id);
      const tdi = getTdiPerpetratorById(drug.id);
      const ind = getNuclearInducerById(drug.id);
      const comp = getCompetitiveInhibitorById(drug.id);
      const washoutClocks = washoutsFor([drug.id]).map((w) => ({ days: w.days, label: w.label }));
      const tdm = Object.hasOwn(TDM, drug.id) ? TDM[drug.id]! : null;

      return {
        success: true,
        data: {
          meta: responseMeta(INTERACTIONS_ENGINE, startedAt, false),
          monograph: {
            id: drug.id,
            name: drug.name,
            brands: [...drug.brands],
            cls: drug.cls,
            kind: drug.kind,
            aliases: [...drug.aliases],
            toxicityHint: drug.toxicityHint,
            note: drug.note ?? null,
            halfLife,
            enzymes: drug.enzymes.map((e) => ({ ...e })),
            pd: [...drug.pd],
            cpicGenes,
            transporters,
            perpetratorKinetics: {
              tdi: tdi
                ? {
                    targetIsoforms: [...tdi.targetIsoforms],
                    subMechanismLabel: tdi.subMechanismLabel,
                    recoveryTimeDays: tdi.recoveryTimeDays,
                  }
                : null,
              inducer: ind
                ? {
                    receptor: ind.receptor,
                    inducedIsoforms: [...ind.inducedIsoforms],
                    onsetLagDays: ind.onsetLagDays,
                    offsetWashoutWeeks: ind.offsetWashoutWeeks,
                  }
                : null,
              competitive: comp
                ? {
                    targetIsoforms: [...comp.targetIsoforms],
                    kiMicromolar: comp.kiMicromolar,
                    offsetHours: comp.offsetHours,
                  }
                : null,
            },
            washoutClocks,
            tdm: tdm ? { ...tdm } : null,
            disclaimer: EXPORT_NOT_A_DOSE,
            prescribingNote: PI_FOOTER,
          },
        },
      };
    } catch (error) {
      return { success: false, problem: toProblem(error, "monograph") };
    }
  }

  /**
   * Clears internal caches.
   */
  static clearCaches(): void {
    clearAllCaches();
  }
}
