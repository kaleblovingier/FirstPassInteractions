/** NCBI E-utilities. Server-only — dynamic-import from the RPC wrapper. */

import { DRUG_BY_ID } from "./catalog";
import { fanoutPairs } from "./fanout";
import type { LiveCite, LiveResult, PairEvidence, PairEvidencePack } from "./pubmed";
import { BoundedLRUCache } from "../server/cache";
import { UpstreamError, failurePhrase, fetchJson, mapSettled } from "../server/http";
import { logEvent } from "../server/log";
import { ncbiGate, type NcbiGate } from "../server/ncbi-gate";

export type { LiveCite, LiveResult, PairEvidence, PairEvidencePack };

const TOOL = "firstpass";
const EMAIL = "FirstPassInteractions@gmail.com";
const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const MAX = 8;

const TTL = 10 * 60 * 1000;
const CALL_TIMEOUT_MS = 6_000;
const SEARCH_BUDGET_MS = 10_000;

export const pubmedCache = new BoundedLRUCache<LiveResult>(300, TTL);

function clean(q: string) {
  return q.replace(/[^\w\s+\-:"()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
}

let gate: NcbiGate = ncbiGate;
/** Tests swap in a gate with a fake clock. */
export function setNcbiGate(next: NcbiGate | null): void {
  gate = next ?? ncbiGate;
}

/** Every NCBI request passes the gate. No retry: a second try would break the 3-per-second limit. */
async function ncbi(path: string, source: string, signal: AbortSignal): Promise<unknown> {
  await gate.acquire(source);
  const url = `${BASE}/${path}${path.includes("?") ? "&" : "?"}tool=${TOOL}&email=${encodeURIComponent(EMAIL)}`;
  return fetchJson(url, {
    source,
    signal,
    timeoutMs: CALL_TIMEOUT_MS,
    retry: false,
    headers: { Accept: "application/json" },
  });
}

interface SummaryRow {
  uid?: string;
  title?: string;
  pubdate?: string;
  source?: string;
  authors?: { name?: string }[];
}
type SummaryResult = Record<string, SummaryRow> & { uids?: string[] };

function citesFromSummary(summary: { result?: SummaryResult } | null, ids: string[]): LiveCite[] {
  const result = summary?.result ?? {};
  const uids = Array.isArray(result.uids) ? result.uids : ids;
  const hits: LiveCite[] = [];
  for (const id of uids) {
    const row = result[id];
    if (!row || typeof row !== "object") continue;
    const authors = (Array.isArray(row.authors) ? row.authors : [])
      .slice(0, 3)
      .map((a) => a?.name)
      .filter(Boolean)
      .join(", ");
    hits.push({
      pmid: String(row.uid ?? id),
      title: String(row.title || "Untitled").replace(/\s+/g, " ").trim(),
      year: String(row.pubdate ?? "").slice(0, 4),
      journal: row.source || "",
      authors,
    });
  }
  return hits;
}

function idsFromSearch(search: { esearchresult?: { idlist?: unknown } } | null, max: number): string[] {
  const idlist = search?.esearchresult?.idlist;
  return (Array.isArray(idlist) ? idlist : [])
    .filter((id): id is string => typeof id === "string" && Boolean(id))
    .slice(0, max);
}

async function pullPubmed(query: string): Promise<LiveResult> {
  const signal = AbortSignal.timeout(SEARCH_BUDGET_MS);
  const search = (await ncbi(
    `esearch.fcgi?db=pubmed&retmode=json&retmax=${MAX}&term=${encodeURIComponent(query)}`,
    "ncbi.esearch",
    signal,
  )) as { esearchresult?: { idlist?: unknown } } | null;
  const ids = idsFromSearch(search, MAX);
  if (!ids.length) return { ok: true, hits: [], query };
  const summary = (await ncbi(
    `esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`,
    "ncbi.esummary",
    signal,
  )) as { result?: SummaryResult } | null;
  return { ok: true, hits: citesFromSummary(summary, ids), query };
}

export async function searchLive(raw: string): Promise<LiveResult> {
  const query = clean(raw);
  if (query.length < 3) return { ok: false, hits: [], reason: "Query too short.", query };
  const started = Date.now();
  const cached = pubmedCache.get(query);
  if (cached) {
    logEvent("info", "pubmed.search", { cache: "hit", durationMs: 0, hits: cached.hits.length });
    return cached;
  }

  try {
    const value = await pubmedCache.getOrFetch(query, () => pullPubmed(query));
    logEvent("info", "pubmed.search", { cache: "miss", durationMs: Date.now() - started, hits: value.hits.length });
    return value;
  } catch (error) {
    logEvent("warn", "pubmed.search", { cache: "miss", durationMs: Date.now() - started, ok: false });
    return {
      ok: false,
      hits: [],
      reason: `PubMed ${failurePhrase(error)} — live search is unavailable right now. A quiet search is not a green light.`,
      query,
    };
  }
}

const PAIR_MAX = 5;
const PAIR_BUDGET_MS = 14_000;
const QUIET = "A quiet search is not a green light.";
export const pairCache = new BoundedLRUCache<{ hits: LiveCite[] }>(300, TTL);

/** Catalog names only: field tags are ours, so they skip clean(), which strips square brackets. */
function phrase(id: string): string {
  const name = (DRUG_BY_ID[id]?.name ?? id).replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
  return `"${name}"[Title/Abstract]`;
}

export function pairQuery(a: string, b: string): string {
  return (
    `(${phrase(a)} AND ${phrase(b)}) AND ` +
    "(interaction[Title/Abstract] OR toxicity[Title/Abstract] OR poisoning[Title/Abstract] OR pharmacokinetics[Title/Abstract]) " +
    "AND humans[MeSH Terms]"
  );
}

/**
 * Live PubMed evidence for every pair on the tray, in pairSlots order. One esearch per pair and one
 * esummary for all PMIDs, all through the NCBI gate. One failed pair never fails another.
 */
export async function searchPairEvidence(ids: readonly string[]): Promise<PairEvidencePack> {
  const unique = [...new Set(ids)].filter((id) => Object.hasOwn(DRUG_BY_ID, id));
  const slots = fanoutPairs(unique);
  const started = Date.now();
  const deadline = gate.now() + PAIR_BUDGET_MS;
  const signal = AbortSignal.timeout(PAIR_BUDGET_MS);
  const key = (a: string, b: string) => [a, b].sort().join("|");
  const fail = (pair: [string, string], query: string, reason: string): PairEvidence => ({
    pair,
    query,
    ok: false,
    hits: [],
    reason: `${reason} ${QUIET}`,
  });

  const found = new Map<number, string[]>();
  const searched = await mapSettled(slots, 3, async (pair, i) => {
    if (pairCache.get(key(pair[0], pair[1]))) return;
    if (gate.now() >= deadline) throw new UpstreamError("ncbi.esearch", "timeout");
    const search = (await ncbi(
      `esearch.fcgi?db=pubmed&retmode=json&retmax=${PAIR_MAX}&term=${encodeURIComponent(pairQuery(pair[0], pair[1]))}`,
      "ncbi.esearch",
      signal,
    )) as { esearchresult?: { idlist?: unknown } } | null;
    found.set(i, idsFromSearch(search, PAIR_MAX));
  });

  const allIds = [...new Set([...found.values()].flat())];
  let cites = new Map<string, LiveCite>();
  let summaryError: unknown = null;
  if (allIds.length) {
    try {
      const summary = (await ncbi(
        `esummary.fcgi?db=pubmed&retmode=json&id=${allIds.join(",")}`,
        "ncbi.esummary",
        signal,
      )) as { result?: SummaryResult } | null;
      cites = new Map(citesFromSummary(summary, allIds).map((c) => [c.pmid, c]));
    } catch (error) {
      summaryError = error;
    }
  }

  const pairs = slots.map((pair, i): PairEvidence => {
    const query = pairQuery(pair[0], pair[1]);
    const k = key(pair[0], pair[1]);
    const cached = pairCache.get(k);
    if (cached) return { pair, query, ok: true, hits: cached.hits };
    const outcome = searched[i]!;
    if (outcome.status === "rejected") {
      return fail(pair, query, `PubMed ${failurePhrase(outcome.reason)} for this pair.`);
    }
    const pmids = found.get(i) ?? [];
    if (!pmids.length) {
      pairCache.set(k, { hits: [] });
      return { pair, query, ok: true, hits: [], reason: `PubMed found no matching papers for this pair. ${QUIET}` };
    }
    if (summaryError) return fail(pair, query, `PubMed ${failurePhrase(summaryError)} for paper details.`);
    const hits = pmids.flatMap((id) => cites.get(id) ?? []);
    pairCache.set(k, { hits });
    return { pair, query, ok: true, hits };
  });
  logEvent("info", "pubmed.pairs", {
    durationMs: Date.now() - started,
    pairs: pairs.length,
    answered: pairs.filter((p) => p.ok).length,
  });
  return { ok: pairs.some((p) => p.ok), pairs };
}
