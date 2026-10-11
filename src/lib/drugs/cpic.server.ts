/** Live CPIC guideline lookup. Public PostgREST at api.cpicpgx.org. */

import { BoundedLRUCache } from "../server/cache";
import { UpstreamError, failurePhrase, fetchJson } from "../server/http";
import { logEvent } from "../server/log";

export interface CpicHit {
  drug: string;
  drugid: string;
  guideline: string;
  url: string;
  pharmgkb: string;
}

export interface CpicResult {
  ok: boolean;
  query: string;
  hits: CpicHit[];
  reason?: string;
}

type CpicRow = {
  drugid?: string;
  name?: string;
  guideline?: { name?: string; url?: string; pharmgkbid?: string[] } | null;
};

const TTL = 30 * 60 * 1000;
const CALL_TIMEOUT_MS = 6_000;
const LOOKUP_BUDGET_MS = 10_000;
const UA = "FirstPass/1.0 (educational CYP desk; kaleblovingier@gmail.com)";

export const cpicCache = new BoundedLRUCache<CpicResult>(300, TTL);

async function getRows(url: string, signal: AbortSignal): Promise<CpicRow[]> {
  const json = await fetchJson(url, {
    source: "cpic.drug",
    signal,
    timeoutMs: CALL_TIMEOUT_MS,
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!Array.isArray(json)) throw new UpstreamError("cpic.drug", "malformed");
  return json as CpicRow[];
}

function cleanName(name: string) {
  return name.replace(/\(.*?\)/g, "").replace(/[^A-Za-z0-9 +-]/g, " ").replace(/\s+/g, " ").trim();
}

async function pullCpic(query: string): Promise<CpicResult> {
  const signal = AbortSignal.timeout(LOOKUP_BUDGET_MS);
  let rows = await getRows(
    `https://api.cpicpgx.org/v1/drug?name=eq.${encodeURIComponent(query.toLowerCase())}&select=drugid,name,guideline(*)`,
    signal,
  );
  if (!rows.length) {
    rows = await getRows(
      `https://api.cpicpgx.org/v1/drug?name=ilike.*${encodeURIComponent(query)}*&select=drugid,name,guideline(*)&limit=6`,
      signal,
    );
  }
  const hits: CpicHit[] = rows
    .filter((r) => r?.guideline && r.guideline.name)
    .slice(0, 5)
    .map((r) => ({
      drug: r.name ?? query,
      drugid: r.drugid ?? "",
      guideline: r.guideline?.name ?? "",
      url: r.guideline?.url ?? "https://cpicpgx.org/guidelines/",
      pharmgkb: r.guideline?.pharmgkbid?.[0] ?? "",
    }));
  return {
    ok: true,
    query,
    hits,
    reason: hits.length ? undefined : "CPIC has no guideline row for this name.",
  };
}

export async function lookupCpic(name: string): Promise<CpicResult> {
  const query = cleanName(name);
  if (query.length < 3) return { ok: false, query, hits: [], reason: "Name too short." };
  const key = query.toLowerCase();
  const started = Date.now();
  const cached = cpicCache.get(key);
  if (cached) {
    logEvent("info", "cpic.lookup", { cache: "hit", durationMs: 0, hits: cached.hits.length });
    return cached;
  }

  try {
    const value = await cpicCache.getOrFetch(key, () => pullCpic(query));
    logEvent("info", "cpic.lookup", { cache: "miss", durationMs: Date.now() - started, hits: value.hits.length });
    return value;
  } catch (error) {
    logEvent("warn", "cpic.lookup", { cache: "miss", durationMs: Date.now() - started, ok: false });
    return {
      ok: false,
      query,
      hits: [],
      reason: `CPIC ${failurePhrase(error)} — the guideline lookup is unavailable right now. That is not a green light; open cpicpgx.org/guidelines.`,
    };
  }
}
