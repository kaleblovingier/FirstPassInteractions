/** ClinicalTrials.gov API v2. Server-only. */

import type { TrialHit, TrialResult } from "./live";
import { BoundedLRUCache } from "../server/cache";
import { failurePhrase, fetchJson } from "../server/http";
import { logEvent } from "../server/log";

const TTL = 20 * 60 * 1000;
const CALL_TIMEOUT_MS = 8_000;
const UA = "FirstPass/1.0 (educational CYP desk; kaleblovingier@gmail.com)";

export const trialsCache = new BoundedLRUCache<TrialResult>(300, TTL);

function clean(q: string) {
  return q.replace(/[^\w\s+\-:"()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

async function pullTrials(query: string): Promise<TrialResult> {
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&pageSize=6`;
  const json = (await fetchJson(url, {
    source: "clinicaltrials.studies",
    timeoutMs: CALL_TIMEOUT_MS,
    headers: { Accept: "application/json", "User-Agent": UA },
  })) as {
    studies?: Array<{
      protocolSection?: {
        identificationModule?: { nctId?: string; briefTitle?: string };
        statusModule?: { overallStatus?: string };
        designModule?: { phases?: string[] };
      };
    }>;
  } | null;
  const hits: TrialHit[] = [];
  for (const s of Array.isArray(json?.studies) ? json.studies : []) {
    const id = s?.protocolSection?.identificationModule;
    const status = s?.protocolSection?.statusModule?.overallStatus ?? "";
    const phases = s?.protocolSection?.designModule?.phases;
    if (!id?.nctId) continue;
    hits.push({
      nctId: id.nctId,
      title: String(id.briefTitle || "Untitled").replace(/\s+/g, " ").trim(),
      status: String(status).replace(/_/g, " "),
      phase: (Array.isArray(phases) ? phases : []).filter((p) => p && p !== "NA").join(" / "),
    });
  }
  return { ok: true, query, hits };
}

export async function searchLiveTrials(raw: string): Promise<TrialResult> {
  const query = clean(raw);
  if (query.length < 3) return { ok: false, hits: [], reason: "Query too short.", query };
  const started = Date.now();
  const cached = trialsCache.get(query);
  if (cached) {
    logEvent("info", "trials.search", { cache: "hit", durationMs: 0, hits: cached.hits.length });
    return cached;
  }

  try {
    const value = await trialsCache.getOrFetch(query, () => pullTrials(query));
    logEvent("info", "trials.search", { cache: "miss", durationMs: Date.now() - started, hits: value.hits.length });
    return value;
  } catch (error) {
    logEvent("warn", "trials.search", { cache: "miss", durationMs: Date.now() - started, ok: false });
    return {
      ok: false,
      query,
      hits: [],
      reason: `ClinicalTrials.gov ${failurePhrase(error)} — live search is unavailable right now. Open CT.gov to search directly.`,
    };
  }
}
