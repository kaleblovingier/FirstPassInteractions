/** NCBI E-utilities. Server-only — dynamic-import from the RPC wrapper. */

import type { LiveCite, LiveResult } from "./pubmed";
import { BoundedLRUCache } from "../server/cache";
import { failurePhrase, fetchJson } from "../server/http";
import { logEvent } from "../server/log";

export type { LiveCite, LiveResult };

const TOOL = "firstpass";
const EMAIL = "kaleblovingier@gmail.com";
const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const MAX = 8;

const TTL = 10 * 60 * 1000;
const CALL_TIMEOUT_MS = 6_000;
const SEARCH_BUDGET_MS = 10_000;

export const pubmedCache = new BoundedLRUCache<LiveResult>(300, TTL);

function clean(q: string) {
  return q.replace(/[^\w\s+\-:"()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
}

function ncbi(path: string, source: string, signal: AbortSignal): Promise<unknown> {
  const url = `${BASE}/${path}${path.includes("?") ? "&" : "?"}tool=${TOOL}&email=${encodeURIComponent(EMAIL)}`;
  return fetchJson(url, {
    source,
    signal,
    timeoutMs: CALL_TIMEOUT_MS,
    headers: { Accept: "application/json" },
  });
}

async function pullPubmed(query: string): Promise<LiveResult> {
  const signal = AbortSignal.timeout(SEARCH_BUDGET_MS);
  const search = (await ncbi(
    `esearch.fcgi?db=pubmed&retmode=json&retmax=${MAX}&term=${encodeURIComponent(query)}`,
    "ncbi.esearch",
    signal,
  )) as {
    esearchresult?: { idlist?: unknown };
  } | null;
  const idlist = search?.esearchresult?.idlist;
  const ids = (Array.isArray(idlist) ? idlist : [])
    .filter((id): id is string => typeof id === "string" && Boolean(id))
    .slice(0, MAX);
  if (!ids.length) return { ok: true, hits: [], query };
  const summary = (await ncbi(
    `esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`,
    "ncbi.esummary",
    signal,
  )) as {
    result?: Record<string, {
      uid?: string;
      title?: string;
      pubdate?: string;
      source?: string;
      authors?: { name?: string }[];
    }> & { uids?: string[] };
  } | null;
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
  return { ok: true, hits, query };
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
