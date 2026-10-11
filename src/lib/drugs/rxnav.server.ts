/**
 * Live DDI from OpenFDA labels + NIH RxClass.
 * NLM retired the RxNav Interaction API in 2024 — this desk does not call it.
 */

import { DRUG_BY_ID } from "./catalog";
import { lookupLiveOutcome, type LiveOutcome } from "./live.server";
import type { RxclassHit, RxnavPair, RxnavReport } from "./live";
import type { Drug } from "./types";
import { BoundedLRUCache } from "../server/cache";
import { fetchJson, joinNames, mapSettled, sharedFailurePhrase } from "../server/http";
import { errorKind, logEvent } from "../server/log";

const REPORT_TTL_MS = 30 * 60 * 1000;
const CLASS_TTL_MS = 6 * 60 * 60 * 1000;
const CALL_TIMEOUT_MS = 6_000;
/** Whole-scan budget: RxClass calls still running at this point are cut off. */
const SCAN_BUDGET_MS = 20_000;
const DRUG_CONCURRENCY = 4;
const MAX_DRUGS = 8;
const UA = "FirstPass/1.0 (educational CYP desk; kaleblovingier@gmail.com)";

const CLASS_SOURCES = ["ATC", "FDASPL"] as const;
type ClassSource = (typeof CLASS_SOURCES)[number];

interface ClassRow {
  className: string;
  classType: string;
}

interface DrugScan {
  drug: Drug;
  live: LiveOutcome;
  rxcui: string;
  classes: RxclassHit[];
  classErrors: unknown[];
}

const NO_PARTNER_REASON =
  "NLM retired the RxNav Interaction API in 2024. No partner name in the OpenFDA excerpt — FirstPass still owns the CYP/PD score. RxClass (ATC / FDA SPL) is below.";

export const reportCache = new BoundedLRUCache<{ report: RxnavReport; complete: boolean }>(
  200,
  REPORT_TTL_MS,
);
export const classCache = new BoundedLRUCache<ClassRow[]>(1000, CLASS_TTL_MS);

function needles(id: string) {
  const d = DRUG_BY_ID[id];
  if (!d) return [];
  return [d.name, ...d.brands, ...d.aliases, d.id.replace(/-/g, " ")].map((s) => s.toLowerCase()).filter((s) => s.length >= 4);
}

function clipAround(hay: string, needle: string, n = 280) {
  const i = hay.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return hay.slice(0, n);
  const start = Math.max(0, i - 80);
  const end = Math.min(hay.length, i + needle.length + 200);
  const slice = hay.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${slice}${end < hay.length ? "…" : ""}`;
}

/** One RxClass source for one RxCUI; classes change rarely, so answers keep for hours. */
function classRows(rxcui: string, source: ClassSource, signal: AbortSignal): Promise<ClassRow[]> {
  return classCache.getOrFetch(`${source}:${rxcui}`, async () => {
    const json = (await fetchJson(
      `https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=${encodeURIComponent(rxcui)}&relaSource=${source}`,
      {
        source: `rxclass.${source.toLowerCase()}`,
        signal,
        timeoutMs: CALL_TIMEOUT_MS,
        headers: { Accept: "application/json", "User-Agent": UA },
      },
    )) as {
      rxclassDrugInfoList?: {
        rxclassDrugInfo?: Array<{
          rxclassMinConceptItem?: { className?: string; classType?: string };
        }>;
      };
    } | null;
    const rows = json?.rxclassDrugInfoList?.rxclassDrugInfo;
    const out: ClassRow[] = [];
    for (const row of Array.isArray(rows) ? rows.slice(0, 6) : []) {
      const name = row?.rxclassMinConceptItem?.className;
      if (typeof name !== "string" || !name) continue;
      out.push({ className: name, classType: row.rxclassMinConceptItem?.classType ?? source });
    }
    return out;
  });
}

/** ATC and FDA SPL in parallel; a missing source is fine, the other still counts. */
async function fetchClasses(rxcui: string, drug: string, signal: AbortSignal) {
  const settled = await Promise.allSettled(CLASS_SOURCES.map((source) => classRows(rxcui, source, signal)));
  const hits: RxclassHit[] = [];
  const errors: unknown[] = [];
  const seen = new Set<string>();
  settled.forEach((result, i) => {
    if (result.status === "rejected") {
      errors.push(result.reason);
      return;
    }
    for (const row of result.value) {
      const k = `${drug}|${row.className}`;
      if (seen.has(k)) continue;
      seen.add(k);
      hits.push({ rxcui, drug, className: row.className, classType: row.classType, source: CLASS_SOURCES[i]! });
    }
  });
  return { hits, errors };
}

/** Label pull, then that drug's classes — a slow drug never holds up another's classes. */
async function scanDrug(drug: Drug, signal: AbortSignal): Promise<DrugScan> {
  const live = await lookupLiveOutcome(drug.id, drug.name);
  const rxcui = live.sources.rxnorm?.rxcui || live.sources.label?.rxcui[0] || "";
  const classes = rxcui ? await fetchClasses(rxcui, drug.name, signal) : { hits: [], errors: [] };
  return { drug, live, rxcui, classes: classes.hits, classErrors: classes.errors };
}

async function buildReport(unique: string[]): Promise<{ report: RxnavReport; complete: boolean }> {
  const signal = AbortSignal.timeout(SCAN_BUDGET_MS);
  const settled = await mapSettled(unique, DRUG_CONCURRENCY, (id) => scanDrug(DRUG_BY_ID[id]!, signal));
  const packs = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
  const unscanned = unique.filter((_, i) => {
    const s = settled[i]!;
    return s.status === "rejected" || s.value.live.failed.includes("label");
  });

  const pairs: RxnavPair[] = [];
  for (let i = 0; i < packs.length; i++) {
    for (let j = i + 1; j < packs.length; j++) {
      const a = packs[i]!;
      const b = packs[j]!;
      const textA = a.live.sources.label?.interactions ?? "";
      const textB = b.live.sources.label?.interactions ?? "";
      const foundA = needles(b.drug.id).find((n) => textA.toLowerCase().includes(n));
      const foundB = needles(a.drug.id).find((n) => textB.toLowerCase().includes(n));
      if (foundA && textA) {
        pairs.push({
          a: a.drug.name,
          b: b.drug.name,
          source: "OpenFDA label",
          severity: "named",
          description: clipAround(textA, foundA),
        });
      }
      if (foundB && textB) {
        pairs.push({
          a: b.drug.name,
          b: a.drug.name,
          source: "OpenFDA label",
          severity: "named",
          description: clipAround(textB, foundB),
        });
      }
    }
  }

  const rxcuis: string[] = [];
  const classes: RxclassHit[] = [];
  const classErrors: unknown[] = [];
  for (const p of packs) {
    if (!p.rxcui) continue;
    rxcuis.push(p.rxcui);
    classes.push(...p.classes);
    classErrors.push(...p.classErrors);
  }

  const missed = unscanned.map((id) => DRUG_BY_ID[id]!.name);
  let reason: string | undefined;
  if (missed.length === unique.length) {
    reason =
      "OpenFDA didn't answer — no label excerpts were scanned for partners; the Prescribing Information still governs.";
  } else if (missed.length) {
    reason = `OpenFDA didn't answer for ${joinNames(missed)} — ${missed.length === 1 ? "that label wasn't" : "those labels weren't"} scanned, so this partner list is incomplete; the Prescribing Information still governs.`;
  } else if (!pairs.length) {
    reason = NO_PARTNER_REASON;
  } else if (classErrors.length) {
    reason = `RxClass ${sharedFailurePhrase(classErrors)} — drug classes may be missing this time.`;
  }

  return {
    report: {
      ok: missed.length < unique.length,
      rxcuis,
      pairs: pairs.slice(0, 16),
      classes: classes.slice(0, 24),
      reason,
    },
    complete: missed.length === 0 && classErrors.length === 0,
  };
}

export async function lookupInteractions(ids: string[]): Promise<RxnavReport> {
  const unique = [...new Set(ids)]
    .filter((id) => Object.hasOwn(DRUG_BY_ID, id) && DRUG_BY_ID[id]!.kind === "drug")
    .slice(0, MAX_DRUGS);
  if (unique.length < 2) {
    return { ok: true, rxcuis: [], pairs: [], classes: [], reason: "Put two labeled drugs on the desk." };
  }

  const key = [...unique].sort().join("|");
  const started = Date.now();
  const cached = reportCache.get(key);
  if (cached) {
    logEvent("info", "rxnav.lookup", {
      cache: "hit",
      durationMs: Date.now() - started,
      drugs: unique.length,
      pairs: cached.report.pairs.length,
      ok: cached.report.ok,
    });
    return cached.report;
  }

  try {
    const built = await reportCache.getOrFetch(
      key,
      () => buildReport(unique),
      (b) => (b.complete ? REPORT_TTL_MS : 0),
    );
    logEvent(built.complete ? "info" : "warn", "rxnav.lookup", {
      cache: "miss",
      durationMs: Date.now() - started,
      drugs: unique.length,
      pairs: built.report.pairs.length,
      complete: built.complete,
      ok: built.report.ok,
    });
    return built.report;
  } catch (error) {
    logEvent("error", "rxnav.lookup", {
      cache: "miss",
      durationMs: Date.now() - started,
      drugs: unique.length,
      error: errorKind(error),
    });
    return {
      ok: false,
      rxcuis: [],
      pairs: [],
      classes: [],
      reason: "Live label sources didn't answer — the partner scan is unavailable; the Prescribing Information still governs.",
    };
  }
}
