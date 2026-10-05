/** Live CPIC guideline lookup. Public PostgREST at api.cpicpgx.org. */

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

const cache = new Map<string, { at: number; value: CpicResult }>();
const TTL = 30 * 60 * 1000;
const UA = "FirstPass/1.0 (educational CYP desk; kaleblovingier@gmail.com)";

async function getJson(url: string, ms = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function cleanName(name: string) {
  return name.replace(/\(.*?\)/g, "").replace(/[^A-Za-z0-9 +-]/g, " ").replace(/\s+/g, " ").trim();
}

export async function lookupCpic(name: string): Promise<CpicResult> {
  const query = cleanName(name);
  if (query.length < 3) return { ok: false, query, hits: [], reason: "Name too short." };
  const hit = cache.get(query.toLowerCase());
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  try {
    const exact = (await getJson(
      `https://api.cpicpgx.org/v1/drug?name=eq.${encodeURIComponent(query.toLowerCase())}&select=drugid,name,guideline(*)`,
    )) as Array<{
      drugid?: string;
      name?: string;
      guideline?: { name?: string; url?: string; pharmgkbid?: string[] } | null;
    }>;
    let rows = exact;
    if (!rows?.length) {
      rows = (await getJson(
        `https://api.cpicpgx.org/v1/drug?name=ilike.*${encodeURIComponent(query)}*&select=drugid,name,guideline(*)&limit=6`,
      )) as typeof exact;
    }
    const hits: CpicHit[] = (rows ?? [])
      .filter((r) => r.guideline && r.guideline.name)
      .slice(0, 5)
      .map((r) => ({
        drug: r.name ?? query,
        drugid: r.drugid ?? "",
        guideline: r.guideline?.name ?? "",
        url: r.guideline?.url ?? "https://cpicpgx.org/guidelines/",
        pharmgkb: r.guideline?.pharmgkbid?.[0] ?? "",
      }));
    const value: CpicResult = {
      ok: true,
      query,
      hits,
      reason: hits.length ? undefined : "CPIC has no guideline row for this name.",
    };
    cache.set(query.toLowerCase(), { at: Date.now(), value });
    return value;
  } catch (err) {
    const reason = err instanceof Error ? (err.name === "AbortError" ? "Timed out." : err.message) : "Unreachable.";
    return { ok: false, query, hits: [], reason };
  }
}
