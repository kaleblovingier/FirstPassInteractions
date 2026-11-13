/** Live PsychonautWiki MediaWiki extracts + TripSit combo. Server-only. */

import { DRUG_BY_ID } from "./catalog";
import {
  PW_TITLE,
  TRIPSIT_NAME,
  pwHref,
  pwTitleFor,
  sanitizeWiki,
  type LiveCombo,
  type PsychonautPack,
  type WikiPage,
} from "./psychonaut";
import { BoundedLRUCache } from "../server/cache";
import { UpstreamError, fetchJson, mapSettled } from "../server/http";
import { DESK_MAX_IDS } from "../server/rpc-input";
import { fanoutPairs } from "./fanout";
import { logEvent } from "../server/log";

export type { LiveCombo, PsychonautPack, WikiPage };

const TTL = 30 * 60 * 1000;
const WIKI_TIMEOUT_MS = 6_000;
const TRIPSIT_TIMEOUT_MS = 5_000;
const UA = "FirstPass/1.5 (educational CDS; FirstPassInteractions@gmail.com)";

interface MwPage {
  title?: string;
  extract?: string;
  missing?: boolean;
  fullurl?: string;
}

interface TripsitAnswer {
  status: string;
  note: string;
  ok: boolean;
  reason?: string;
}

/** Only answers are cached — a timeout or HTTP error is retried on the next desk load. */
export const wikiCache = new BoundedLRUCache<MwPage | null>(300, TTL);
export const comboCache = new BoundedLRUCache<TripsitAnswer>(300, TTL);

function own<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

function getJson(url: string, source: string, timeoutMs: number) {
  return fetchJson(url, {
    source,
    timeoutMs,
    headers: { Accept: "application/json", "User-Agent": UA },
  });
}

function didNotAnswer(source: string, error: unknown) {
  return error instanceof UpstreamError && error.kind === "timeout"
    ? `${source} didn't answer in time.`
    : `${source} did not answer.`;
}

async function wikiPage(wikiTitle: string): Promise<MwPage | null> {
  const url = `https://psychonautwiki.org/w/api.php?action=query&prop=extracts|info&exintro=1&explaintext=1&inprop=url&redirects=1&format=json&titles=${encodeURIComponent(wikiTitle)}`;
  const json = (await getJson(url, "psychonautwiki.extract", WIKI_TIMEOUT_MS)) as {
    query?: { pages?: Record<string, MwPage> };
  } | null;
  const page = Object.values(json?.query?.pages ?? {})[0];
  return page && typeof page === "object" ? page : null;
}

async function fetchWiki(id: string): Promise<WikiPage> {
  const drug = DRUG_BY_ID[id];
  const name = drug?.name ?? id;
  const wikiTitle = own(PW_TITLE, id) ?? pwTitleFor(id);
  if (!wikiTitle) {
    return { id, name, wikiTitle: "", url: "", extract: "", stripped: false, reason: "No PsychonautWiki title mapped." };
  }
  try {
    const page = await wikiCache.getOrFetch(wikiTitle, () => wikiPage(wikiTitle));
    if (!page || page.missing || !page.extract) {
      return {
        id,
        name,
        wikiTitle,
        url: pwHref(wikiTitle),
        extract: "",
        stripped: false,
        reason: "Wiki page had no intro extract.",
      };
    }
    const clean = sanitizeWiki(String(page.extract));
    return {
      id,
      name,
      wikiTitle: page.title ?? wikiTitle,
      url: page.fullurl ?? pwHref(wikiTitle),
      extract: clean.text,
      stripped: clean.stripped,
      reason: clean.text ? undefined : "Intro was only dosage / route — stripped. Open the wiki.",
    };
  } catch (error) {
    return {
      id,
      name,
      wikiTitle,
      url: pwHref(wikiTitle),
      extract: "",
      stripped: false,
      reason: didNotAnswer("PsychonautWiki", error),
    };
  }
}

function tripsitName(id: string): string | null {
  const mapped = own(TRIPSIT_NAME, id);
  if (mapped) return mapped;
  const d = DRUG_BY_ID[id];
  if (!d) return null;
  if (d.pd.includes("benzo-zdrug")) return "Benzodiazepines";
  if (d.pd.includes("opioid") || d.pd.includes("partial-opioid")) return "Opioids";
  if (d.pd.includes("maoi")) return "MAOIs";
  if (d.pd.includes("ssri-snri")) return "SSRIs";
  return null;
}

async function tripsitAnswer(na: string, nb: string): Promise<TripsitAnswer> {
  const url = `https://tripbot.tripsit.me/api/tripsit/getInteraction/${encodeURIComponent(na)}/${encodeURIComponent(nb)}`;
  const json = (await getJson(url, "tripsit.combo", TRIPSIT_TIMEOUT_MS)) as {
    err?: unknown;
    error?: { err?: boolean; msg?: string };
    success?: { status?: string; result?: string; note?: string; definition?: string };
    data?: Array<{
      status?: string;
      result?: string;
      note?: string;
      definition?: string;
    }>;
  } | null;
  if (!json || typeof json !== "object") throw new UpstreamError("tripsit.combo", "malformed");
  if (json.err && json.err !== null) {
    return { status: "", note: "", ok: false, reason: json.error?.msg || "TripSit had no row for this pair." };
  }
  const row = (Array.isArray(json.data) ? json.data[0] : undefined) ?? json.success ?? {};
  const status = String(row.status ?? row.result ?? "").trim();
  const note = sanitizeWiki(String(row.note ?? row.definition ?? "")).text;
  if (!status && !note) return { status: "", note: "", ok: false, reason: "Empty combo row." };
  return { status, note, ok: true };
}

async function fetchCombo(a: string, b: string, na: string, nb: string): Promise<LiveCombo> {
  try {
    const answer = await comboCache.getOrFetch(`${na}|${nb}`, () => tripsitAnswer(na, nb));
    return answer.ok
      ? { ids: [a, b], a: na, b: nb, status: answer.status, note: answer.note, source: "TripSit combo API", ok: true }
      : { ids: [a, b], a: na, b: nb, status: "", note: "", source: "TripSit", ok: false, reason: answer.reason };
  } catch (error) {
    return {
      ids: [a, b],
      a: na,
      b: nb,
      status: "",
      note: "",
      source: "TripSit",
      ok: false,
      reason: `${didNotAnswer("TripSit", error)} Local chart still stands.`,
    };
  }
}

/** Upstream calls in flight at once, and the whole-lookup budget (28 pairs must not hang). */
const LOOKUP_CONCURRENCY = 4;
export const LOOKUP_BUDGET_MS = 15_000;

export async function lookupPsychonaut(
  ids: string[],
  options: { budgetMs?: number } = {},
): Promise<PsychonautPack> {
  const unique = [...new Set(ids.filter((id) => Object.hasOwn(DRUG_BY_ID, id)))].slice(0, DESK_MAX_IDS);
  if (!unique.length) return { ok: false, pages: [], combos: [] };
  const started = Date.now();
  const deadline = started + (options.budgetMs ?? LOOKUP_BUDGET_MS);
  const spent = () => Date.now() >= deadline;

  const pairs: Array<{ a: string; b: string; na: string; nb: string }> = [];
  for (const [a, b] of fanoutPairs(unique)) {
    const na = tripsitName(a);
    const nb = tripsitName(b);
    if (na && nb && na !== nb) pairs.push({ a, b, na, nb });
  }

  // Combos queue first so they start with the wiki pages; one pool bounds both.
  const jobs: Array<() => Promise<LiveCombo | WikiPage>> = [
    ...pairs.map(({ a, b, na, nb }) => async (): Promise<LiveCombo> =>
      spent()
        ? { ids: [a, b], a: na, b: nb, status: "", note: "", source: "TripSit", ok: false,
            reason: "TripSit was not asked in time. Local chart still stands." }
        : fetchCombo(a, b, na, nb)),
    ...unique.map((id) => async (): Promise<WikiPage> =>
      spent()
        ? { id, name: DRUG_BY_ID[id]?.name ?? id, wikiTitle: "", url: "", extract: "", stripped: false,
            reason: "PsychonautWiki was not asked in time." }
        : fetchWiki(id)),
  ];
  const settled = await mapSettled(jobs, LOOKUP_CONCURRENCY, (job) => job());
  // fetchCombo and fetchWiki catch their own errors, so a rejection here is a bug; drop that row.
  const values = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const combos = values.slice(0, pairs.length) as LiveCombo[];
  const pages = values.slice(pairs.length) as WikiPage[];
  const ok = pages.some((p) => Boolean(p.extract)) || combos.some((c) => c.ok);
  logEvent(ok ? "info" : "warn", "psychonaut.lookup", {
    durationMs: Date.now() - started,
    pages: pages.length,
    extracts: pages.filter((p) => p.extract).length,
    combos: combos.length,
    combosOk: combos.filter((c) => c.ok).length,
    ok,
  });
  return { ok, pages, combos };
}
