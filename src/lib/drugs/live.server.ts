/** OpenFDA / FAERS / RxNorm / PubChem / DailyMed / shortages. Server-only. */

import type {
  DailyMedHit,
  FaersHit,
  FdaLabel,
  LiveSource,
  LiveSources,
  NdcHit,
  PubchemCard,
  RecallHit,
  RxnormCard,
  ShortageHit,
} from "./live";
import { EMPTY_LIVE } from "./live";
import { DRUG_BY_ID } from "./catalog";
import {
  INTERACTIONS_EXCERPT_CHARS,
  INTERACTIONS_SCAN_CHARS,
  LABEL_CANDIDATE_LIMIT,
  formatEffectiveTime,
  labelIdentityLine,
  pickSpl,
  setidsInText,
  splOpenFdaId,
  splSetId,
  storedLabelEffective,
} from "./label-identity";
import { BoundedLRUCache } from "../server/cache";
import { fetchJson, joinNames, sharedFailurePhrase } from "../server/http";
import { errorKind, logEvent } from "../server/log";

export type {
  DailyMedHit,
  FaersHit,
  FdaLabel,
  LiveSource,
  LiveSources,
  NdcHit,
  PubchemCard,
  RecallHit,
  RxnormCard,
  ShortageHit,
};

/** A lookup plus the sources that failed to answer — "no match" is an answer, not a failure. */
export interface LiveOutcome {
  sources: LiveSources;
  failed: LiveSource[];
}

interface Failure {
  source: LiveSource;
  error: unknown;
}

const LIVE_TTL_MS = 30 * 60 * 1000;
const PARTIAL_TTL_MS = 30 * 1000;
const CALL_TIMEOUT_MS = 6_000;
const LOOKUP_BUDGET_MS = 10_000;

export const liveCache = new BoundedLRUCache<LiveOutcome>(500, LIVE_TTL_MS);
const UA = "FirstPass/1.0 (educational CYP desk; kaleblovingier@gmail.com)";

const LABELED_SOURCES: LiveSource[] = ["label", "faers", "rxnorm", "pubchem", "dailymed", "shortage", "ndc", "recalls"];
const UNLABELED_SOURCES: LiveSource[] = ["rxnorm", "pubchem"];

const SOURCE_NAME: Record<LiveSource, string> = {
  label: "the OpenFDA label",
  faers: "FAERS",
  rxnorm: "RxNorm",
  pubchem: "PubChem",
  dailymed: "DailyMed",
  shortage: "FDA shortages",
  ndc: "NDC",
  recalls: "FDA enforcement",
};

function plain(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s: string, n = 720) {
  const t = plain(s);
  if (t.length <= n) return t;
  return `${t.slice(0, n).replace(/\s+\S*$/, "")}…`;
}

/** Full plain interactions text, capped so one huge SPL cannot fill the cache. */
function scanText(s: string, n: number) {
  const t = plain(s);
  return t.length <= n ? t : t.slice(0, n);
}

/** Setids cited on this drug's catalog note. Not a grade and not a quote. */
function noteSetids(id: string): string[] {
  return setidsInText(DRUG_BY_ID[id]?.note);
}

function liveCacheKey(chem: string, preferred: readonly string[]) {
  return preferred.length ? `${chem}\n${preferred.join(",")}` : chem;
}

/** OpenFDA and PubChem answer "no match" with a 404 — that resolves as null, not a failure. */
function getJson(url: string, source: string, signal: AbortSignal, notFoundAsEmpty = false) {
  return fetchJson(url, {
    source,
    signal,
    timeoutMs: CALL_TIMEOUT_MS,
    notFoundAsEmpty,
    headers: { Accept: "application/json", "User-Agent": UA },
  });
}

function firstString(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

function stringList(v: unknown, cap = 6): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, cap);
}

function rowsOf<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

async function fetchLabel(name: string, signal: AbortSignal, preferred: readonly string[]): Promise<FdaLabel | null> {
  const q = encodeURIComponent(`openfda.generic_name:"${name}"`);
  const url = `https://api.fda.gov/drug/label.json?search=${q}&limit=${LABEL_CANDIDATE_LIMIT}`;
  const json = (await getJson(url, "openfda.label", signal, true)) as {
    results?: unknown;
  } | null;
  const row = pickSpl(rowsOf<Record<string, unknown>>(json?.results), preferred);
  if (!row || typeof row !== "object") return null;
  const open = (row.openfda ?? {}) as Record<string, unknown>;
  const interactionsRaw = firstString(row.drug_interactions);
  const setId = splSetId(row);
  const openFdaId = splOpenFdaId(row);
  const effectiveTime = formatEffectiveTime(row.effective_time);
  return {
    boxed: clip(firstString(row.boxed_warning), 900),
    pregnancy: clip(firstString(row.pregnancy) || firstString(row.pregnancy_or_breast_feeding), 420),
    interactions: clip(interactionsRaw, INTERACTIONS_EXCERPT_CHARS),
    interactionsScan: scanText(interactionsRaw, INTERACTIONS_SCAN_CHARS),
    contraindications: clip(firstString(row.contraindications), 420),
    warnings: clip(firstString(row.warnings_and_cautions) || firstString(row.warnings), 520),
    indications: clip(firstString(row.indications_and_usage), 360),
    brands: stringList(open.brand_name, 5),
    rxcui: stringList(open.rxcui, 4),
    unii: stringList(open.unii, 2),
    classes: stringList(open.pharm_class_epc, 4),
    setId,
    openFdaId,
    effectiveTime,
    identity: labelIdentityLine({
      setId,
      openFdaId,
      effectiveTime,
      storedEffective: storedLabelEffective(setId),
    }),
  };
}

async function fetchFaers(name: string, signal: AbortSignal): Promise<FaersHit[]> {
  const q = encodeURIComponent(`patient.drug.openfda.generic_name:"${name}"`);
  const url = `https://api.fda.gov/drug/event.json?search=${q}&count=patient.reaction.reactionmeddrapt.exact`;
  const json = (await getJson(url, "openfda.event", signal, true)) as { results?: unknown } | null;
  return rowsOf<{ term?: string; count?: number }>(json?.results)
    .filter((r) => typeof r?.term === "string" && typeof r.count === "number")
    .slice(0, 8)
    .map((r) => ({ term: String(r.term), count: Number(r.count) }));
}

async function fetchRxnorm(name: string, signal: AbortSignal): Promise<RxnormCard | null> {
  const found = (await getJson(
    `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=2`,
    "rxnorm.rxcui",
    signal,
  )) as { idGroup?: { rxnormId?: unknown } } | null;
  const rxcui = rowsOf<unknown>(found?.idGroup?.rxnormId)[0];
  if (typeof rxcui !== "string" || !rxcui) return null;
  let brands: string[] = [];
  try {
    const rel = (await getJson(
      `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=BN`,
      "rxnorm.related",
      signal,
    )) as {
      relatedGroup?: {
        conceptGroup?: Array<{ tty?: string; conceptProperties?: Array<{ name?: string }> }>;
      };
    } | null;
    brands = rowsOf<{ conceptProperties?: Array<{ name?: string }> }>(rel?.relatedGroup?.conceptGroup)
      .flatMap((g) => rowsOf<{ name?: string }>(g?.conceptProperties))
      .map((c) => c?.name)
      .filter((n): n is string => typeof n === "string" && Boolean(n))
      .filter((n, i, all) => all.indexOf(n) === i)
      .slice(0, 8);
  } catch {
    brands = [];
  }
  return { rxcui, name, brands };
}

async function fetchPubchem(name: string, signal: AbortSignal): Promise<PubchemCard | null> {
  const json = (await getJson(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/MolecularFormula,MolecularWeight,IUPACName,InChIKey/JSON`,
    "pubchem.compound",
    signal,
    true,
  )) as {
    PropertyTable?: {
      Properties?: Array<{
        CID?: number;
        MolecularFormula?: string;
        MolecularWeight?: number | string;
        IUPACName?: string;
        InChIKey?: string;
      }>;
    };
  } | null;
  const row = rowsOf<{
    CID?: number;
    MolecularFormula?: string;
    MolecularWeight?: number | string;
    IUPACName?: string;
    InChIKey?: string;
  }>(json?.PropertyTable?.Properties)[0];
  if (!row?.CID) return null;
  return {
    cid: String(row.CID),
    formula: row.MolecularFormula ?? "",
    mw: row.MolecularWeight != null ? String(row.MolecularWeight) : "",
    inchikey: row.InChIKey ?? "",
    iupac: row.IUPACName ?? "",
  };
}

async function fetchDailyMed(name: string, signal: AbortSignal): Promise<DailyMedHit[]> {
  const json = (await getJson(
    `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(name)}&pagesize=3`,
    "dailymed.spls",
    signal,
  )) as { data?: unknown } | null;
  return rowsOf<{ setid?: string; title?: string; published_date?: string }>(json?.data)
    .filter((r) => typeof r?.setid === "string")
    .slice(0, 3)
    .map((r) => ({
      setId: String(r.setid),
      title: clip(String(r.title ?? name), 120),
      published: String(r.published_date ?? "").slice(0, 10),
    }));
}

async function fetchShortage(name: string, signal: AbortSignal): Promise<ShortageHit[]> {
  const q = encodeURIComponent(`generic_name:"${name}"`);
  const json = (await getJson(
    `https://api.fda.gov/drug/shortages.json?search=${q}&limit=5`,
    "openfda.shortages",
    signal,
    true,
  )) as { results?: unknown } | null;
  return rowsOf<{ generic_name?: string | string[]; status?: string; update_date?: string }>(json?.results)
    .slice(0, 4)
    .map((r) => ({
      name: firstString(r?.generic_name) || name,
      status: String(r?.status ?? "unknown"),
      updated: String(r?.update_date ?? "").slice(0, 10),
    }));
}

async function fetchNdc(name: string, signal: AbortSignal): Promise<NdcHit[]> {
  const q = encodeURIComponent(`generic_name:"${name}"`);
  const json = (await getJson(
    `https://api.fda.gov/drug/ndc.json?search=${q}&limit=5`,
    "openfda.ndc",
    signal,
    true,
  )) as { results?: unknown } | null;
  return rowsOf<{ product_ndc?: string; brand_name?: string; generic_name?: string; dosage_form?: string }>(
    json?.results,
  )
    .slice(0, 4)
    .map((r) => ({
      ndc: String(r?.product_ndc ?? ""),
      brand: String(r?.brand_name ?? ""),
      generic: String(r?.generic_name ?? name),
      form: String(r?.dosage_form ?? ""),
    }));
}

/** UTC midnight for YYYYMMDD or YYYY-MM-DD. Anything else, including an impossible calendar day, is unparsed. */
function initiationMillis(date: string): number | null {
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(date.trim());
  const dashed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const hit = compact ?? dashed;
  if (!hit) return null;
  const year = Number(hit[1]);
  const month = Number(hit[2]);
  const day = Number(hit[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const ms = Date.UTC(year, month - 1, day);
  const parsed = new Date(ms);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return ms;
}

/** Newest parseable initiation date first. Unparsed dates keep their relative order after the dated rows. */
export function orderEnforcementByInitiation<T extends { date: string }>(rows: readonly T[]): T[] {
  return rows
    .map((row, index) => ({ row, index, ms: initiationMillis(row.date) }))
    .sort((a, b) => {
      if (a.ms == null && b.ms == null) return a.index - b.index;
      if (a.ms == null) return 1;
      if (b.ms == null) return -1;
      if (a.ms !== b.ms) return b.ms - a.ms;
      return a.index - b.index;
    })
    .map((item) => item.row);
}

async function fetchRecalls(name: string, signal: AbortSignal): Promise<RecallHit[]> {
  const q = encodeURIComponent(`product_description:"${name}"`);
  const json = (await getJson(
    `https://api.fda.gov/drug/enforcement.json?search=${q}&sort=recall_initiation_date:desc&limit=4`,
    "openfda.enforcement",
    signal,
    true,
  )) as { results?: unknown } | null;
  const hits = rowsOf<{
    reason_for_recall?: string;
    status?: string;
    recall_initiation_date?: string;
    classification?: string;
  }>(json?.results).map((r) => ({
    reason: clip(String(r?.reason_for_recall ?? "Recall"), 180),
    status: String(r?.status ?? ""),
    date: String(r?.recall_initiation_date ?? "").slice(0, 10),
    classification: String(r?.classification ?? ""),
  }));
  return orderEnforcementByInitiation(hits).slice(0, 3);
}

const ALIAS: Record<string, string> = {
  "tmp-smx": "sulfamethoxazole",
  paxlovid: "nirmatrelvir",
  epclusa: "sofosbuvir",
  "insulin-glargine": "insulin glargine",
  valproate: "valproic acid",
  "st-johns-wort": "",
  "dirty-30": "",
  "seven-oh": "",
  "twentyfive-i": "",
  xylazine: "xylazine",
  "pressed-30": "",
  nac: "acetylcysteine",
};

export function liveQueryName(id: string, name: string) {
  if (Object.hasOwn(ALIAS, id)) return ALIAS[id];
  if (id.startsWith("__")) return "";
  return name.replace(/\(.*?\)/g, "").trim();
}

function failedNames(failures: Failure[]) {
  return joinNames(failures.map((f) => SOURCE_NAME[f.source]));
}

function failedPhrase(failures: Failure[]) {
  return sharedFailurePhrase(failures.map((f) => f.error));
}

/** Reader-facing reason for a lookup that still answered in part. */
function partialReason(labeled: boolean, failures: Failure[]): string | undefined {
  if (!labeled) {
    return failures.length
      ? `No FDA label for this item — ${failedNames(failures)} ${failedPhrase(failures)}.`
      : "No FDA label for this item — PubChem still ran.";
  }
  const label = failures.find((f) => f.source === "label");
  if (label) {
    return `OpenFDA ${failedPhrase([label])} — the label excerpt is unavailable; the Prescribing Information still governs.`;
  }
  if (failures.length) {
    return `${failedNames(failures)} ${failedPhrase(failures)} — those rows may be missing this time.`;
  }
  return undefined;
}

function failedReason(labeled: boolean, failures: Failure[]): string {
  if (!labeled) return partialReason(false, failures)!;
  return `Live sources ${failedPhrase(failures)} — the label excerpt is unavailable; the Prescribing Information still governs.`;
}

function pulled(sources: LiveSources, failed: LiveSource[]): LiveOutcome {
  return {
    sources: { ...sources, failed, fetchedAt: new Date().toISOString() },
    failed,
  };
}

async function pullLive(query: string, chem: string, preferred: readonly string[]): Promise<LiveOutcome> {
  const signal = AbortSignal.timeout(LOOKUP_BUDGET_MS);
  const labeled = Boolean(query);
  const failures: Failure[] = [];
  const guard = async <T>(source: LiveSource, run: () => Promise<T>, empty: T): Promise<T> => {
    try {
      return await run();
    } catch (error) {
      failures.push({ source, error });
      return empty;
    }
  };

  // Each source settles on its own; one slow or failed source leaves the others intact.
  const [label, faers, rxnorm, pubchem, dailymed, shortage, ndc, recalls] = await Promise.all([
    labeled ? guard("label", () => fetchLabel(query, signal, preferred), null) : null,
    labeled ? guard("faers", () => fetchFaers(query, signal), []) : [],
    guard("rxnorm", () => fetchRxnorm(labeled ? query : chem, signal), null),
    guard("pubchem", () => fetchPubchem(chem, signal), null),
    labeled ? guard("dailymed", () => fetchDailyMed(query, signal), []) : [],
    labeled ? guard("shortage", () => fetchShortage(query, signal), []) : [],
    labeled ? guard("ndc", () => fetchNdc(query, signal), []) : [],
    labeled ? guard("recalls", () => fetchRecalls(query, signal), []) : [],
  ]);

  const attempted = labeled ? LABELED_SOURCES : UNLABELED_SOURCES;
  const failed = attempted.filter((s) => failures.some((f) => f.source === s));
  if (failed.length === attempted.length) {
    return pulled(
      { ok: false, query: query || chem, ...EMPTY_LIVE, reason: failedReason(labeled, failures) },
      failed,
    );
  }
  return pulled(
    {
      ok: true,
      query: query || chem,
      label,
      faers,
      rxnorm,
      pubchem,
      dailymed,
      shortage,
      ndc,
      recalls,
      reason: partialReason(labeled, failures),
    },
    failed,
  );
}

/** Full answers keep for 30 minutes, partial ones briefly, total failures not at all. */
function liveTtl(outcome: LiveOutcome) {
  if (outcome.failed.length === 0) return LIVE_TTL_MS;
  return outcome.sources.ok ? PARTIAL_TTL_MS : 0;
}

function logLookup(cache: "hit" | "miss", started: number, outcome: LiveOutcome) {
  logEvent(outcome.failed.length ? "warn" : "info", "live.lookup", {
    cache,
    durationMs: Date.now() - started,
    ok: outcome.sources.ok,
    failed: outcome.failed.join(",") || undefined,
  });
}

export interface LiveLookupOptions {
  /** Skip liveCache for this pin and pull again. The RxClass cache is not touched. */
  bypassCache?: boolean;
}

/** Like lookupLive, plus which sources failed — rxnav needs to know a label went unscanned. */
export async function lookupLiveOutcome(
  id: string,
  name: string,
  options?: LiveLookupOptions,
): Promise<LiveOutcome> {
  const query = liveQueryName(id, name);
  const chem = (query || name)
    .replace(/\(.*?\)/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .trim();
  if (!chem) {
    return pulled({ ok: true, query: name, ...EMPTY_LIVE, reason: "No live label for this item." }, []);
  }

  const preferred = noteSetids(id);
  const cacheKey = liveCacheKey(chem, preferred);
  const started = Date.now();
  if (options?.bypassCache) {
    liveCache.delete(cacheKey);
  } else {
    const cached = liveCache.get(cacheKey);
    if (cached) {
      logLookup("hit", started, cached);
      return cached;
    }
  }
  try {
    const outcome = await liveCache.getOrFetch(cacheKey, () => pullLive(query, chem, preferred), liveTtl);
    logLookup("miss", started, outcome);
    return outcome;
  } catch (error) {
    logEvent("error", "live.lookup", {
      cache: "miss",
      durationMs: Date.now() - started,
      error: errorKind(error),
    });
    const labeled = Boolean(query);
    const failures = (labeled ? LABELED_SOURCES : UNLABELED_SOURCES).map((source) => ({ source, error }));
    return pulled(
      { ok: false, query: query || chem, ...EMPTY_LIVE, reason: failedReason(labeled, failures) },
      failures.map((f) => f.source),
    );
  }
}

export async function lookupLive(id: string, name: string, options?: LiveLookupOptions): Promise<LiveSources> {
  return (await lookupLiveOutcome(id, name, options)).sources;
}
