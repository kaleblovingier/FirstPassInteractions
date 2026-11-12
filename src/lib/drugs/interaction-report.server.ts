/**
 * Live orchestrator: the offline InteractionReport plus whatever the outside sources add.
 *
 * Outside rows are quoted, never graded: they carry severity "Unknown" and the source's own words.
 * A source that fails or runs out of time leaves every engine row intact and is named in
 * `warnings`; a missing live row is not a clearance.
 */

import type { InteractionReport, LiteratureEvidence, PairwiseInteraction } from "../../types/interaction";
import { DRUG_BY_ID } from "./catalog";
import { buildInteractionReport, type TriageEntry, type TriageOptions } from "./interaction-report";
import { pubmedUrl, type PairEvidencePack } from "./pubmed";
import { searchPairEvidence } from "./pubmed.server";
import type { PsychonautPack } from "./psychonaut";
import { lookupPsychonaut } from "./psychonaut.server";
import type { RxnavReport } from "./live";
import { lookupInteractions } from "./rxnav.server";

/** The three outside lookups. Injectable so a test can fail one at a time. */
export interface LiveSources {
  psychonaut: (ids: string[]) => Promise<PsychonautPack>;
  labels: (ids: string[]) => Promise<RxnavReport>;
  pubmed: (ids: string[]) => Promise<PairEvidencePack>;
}

export interface LiveOptions extends TriageOptions {
  /** One budget for all three lookups together. Default 15 seconds. */
  budgetMs?: number;
  sources?: Partial<LiveSources>;
}

export interface LiveInteractionReport {
  report: InteractionReport;
  /** One plain sentence per source that failed, timed out or answered only in part. */
  warnings: string[];
}

const DEFAULT_BUDGET_MS = 15_000;

const REAL_SOURCES: LiveSources = {
  psychonaut: lookupPsychonaut,
  labels: lookupInteractions,
  pubmed: searchPairEvidence,
};

function withBudget<T>(work: Promise<T>, deadline: Promise<never>): Promise<T> {
  return Promise.race([work, deadline]);
}

export async function buildLiveInteractionReport(
  entries: readonly TriageEntry[],
  options: LiveOptions = {},
): Promise<LiveInteractionReport> {
  const base = buildInteractionReport(entries, options);
  const ids = base.substances.map((s) => s.id);
  const warnings: string[] = [];
  if (ids.length < 2) return { report: base, warnings };

  const sources = { ...REAL_SOURCES, ...options.sources };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timed out")), options.budgetMs ?? DEFAULT_BUDGET_MS);
  });
  deadline.catch(() => {});
  const guard = <T>(run: () => Promise<T>): Promise<T> => {
    try {
      return withBudget(run(), deadline);
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const [psychonaut, labels, pubmed] = await Promise.allSettled([
    guard(() => sources.psychonaut(ids)),
    guard(() => sources.labels(ids)),
    guard(() => sources.pubmed(ids)),
  ]);
  clearTimeout(timer);

  const nameOf = (id: string) => DRUG_BY_ID[id]!.name;
  const order = (a: string, b: string): [string, string] => (ids.indexOf(a) <= ids.indexOf(b) ? [a, b] : [b, a]);
  const rows: PairwiseInteraction[] = [];
  const literature: LiteratureEvidence[] = [...base.literature];
  const substances = base.substances.map((s) => ({ ...s }));

  const fail = (source: string, result: PromiseRejectedResult | undefined, reason?: string) => {
    const why = result ? (result.reason instanceof Error ? result.reason.message : "failed") : reason;
    warnings.push(
      `${source} did not answer${why ? ` (${why})` : ""}. The FirstPass rows are unchanged; a missing live row is not a clearance.`,
    );
  };

  if (psychonaut.status === "rejected") fail("TripSit", psychonaut);
  else {
    if (!psychonaut.value.ok) fail("PsychonautWiki and TripSit", undefined, undefined);
    for (const combo of psychonaut.value.combos) {
      if (!combo.ok || !combo.ids.every((id) => ids.includes(id))) continue;
      const [a, b] = order(combo.ids[0], combo.ids[1]);
      rows.push({
        pair: [nameOf(a), nameOf(b)],
        pairIds: [a, b],
        source: "psychonaut",
        severity: "Unknown",
        description: `TripSit combo chart: ${[combo.status, combo.note].filter(Boolean).join(". ")}`,
      });
    }
  }

  if (labels.status === "rejected") fail("The OpenFDA label scan", labels);
  else {
    const report = labels.value;
    if (!report.ok || report.reason) {
      fail("The OpenFDA label scan", undefined, report.reason ?? "no label answered");
    }
    const byName = new Map(ids.map((id) => [nameOf(id).toLowerCase(), id]));
    for (const pair of report.pairs) {
      const x = byName.get(pair.a.toLowerCase());
      const y = byName.get(pair.b.toLowerCase());
      if (!x || !y || x === y) continue;
      const [a, b] = order(x, y);
      rows.push({
        pair: [nameOf(a), nameOf(b)],
        pairIds: [a, b],
        source: "rxnav",
        severity: "Unknown",
        description: `${pair.source}, ${nameOf(x)} label names ${nameOf(y)}: "${pair.description}"`,
      });
    }
    // rxcuis arrive without ids, so they are matched by position only when every drug supplied one.
    const scanned = ids.filter((id) => DRUG_BY_ID[id]!.kind === "drug");
    if (report.rxcuis.length === scanned.length) {
      for (const s of substances) {
        const at = scanned.indexOf(s.id);
        if (at >= 0) s.rxcui = report.rxcuis[at]!;
      }
    }
  }

  if (pubmed.status === "rejected") fail("PubMed", pubmed);
  else {
    if (!pubmed.value.ok) fail("PubMed", undefined, pubmed.value.pairs[0]?.reason);
    const seen = new Set(literature.map((l) => `${l.pmid}|${l.pair.join("|")}`));
    for (const evidence of pubmed.value.pairs) {
      const [a, b] = order(evidence.pair[0], evidence.pair[1]);
      for (const hit of evidence.hits) {
        const names: [string, string] = [nameOf(a), nameOf(b)];
        const key = `${hit.pmid}|${names.join("|")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        literature.push({ pmid: hit.pmid, title: hit.title, url: pubmedUrl(hit.pmid), pair: names });
      }
    }
  }

  return {
    report: {
      ...base,
      substances,
      pairwiseInteractions: [...base.pairwiseInteractions, ...rows],
      literature,
    },
    warnings,
  };
}
