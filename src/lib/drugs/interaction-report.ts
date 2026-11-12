/**
 * Triage report: the engine's answer for one tray, projected onto the wire contract in
 * src/types/interaction.ts. Pure and synchronous, so the desk can build it offline and the API
 * can build it on the server. Live outside rows are added by the server orchestrator, not here.
 *
 * This is a projection. It never grades: every tier is toSeverityTier of what analyze() stored.
 */

import type {
  CypProfile,
  InteractionReport,
  LiteratureEvidence,
  PairwiseInteraction,
  SeverityTier,
  SubstanceEntry,
} from "../../types/interaction";
import { DRUG_BY_ID } from "./catalog";
import { analyze } from "./engine";
import { fanoutPairs } from "./fanout";
import { timeline } from "./overlap";
import { citesFor, pubmedUrl } from "./pubmed";
import { STREET_NAMES } from "./street-names";
import { synergyAlerts } from "./synergy";
import type { Drug, Enzyme, Finding, HostContext, IngestionTimes, Severity } from "./types";

const TIER: Record<Severity | "none", SeverityTier> = {
  contraindicated: "Contraindicated",
  major: "Severe",
  moderate: "Moderate",
  minor: "Low",
  none: "Unknown",
};

/** The engine's severity under its wire name. The only place a tier is made. */
export function toSeverityTier(severity: Severity | "none"): SeverityTier {
  return TIER[severity];
}

/** The row a pair gets when the engine mapped nothing for it. */
export const NO_MAPPED_PAIR = "No mapped collision for this pair. A blank pair is not a clearance.";

/** One tray item as it was entered. */
export interface TriageEntry {
  /** What was typed or sent ("Molly"). */
  rawInput: string;
  /** Catalog id it resolved to ("mdma"). Entries that are not on the shelf are dropped. */
  id: string;
  /** Hours since the last dose. Left out when not stated. */
  hoursAgo?: number;
}

export interface TriageOptions {
  host?: HostContext;
  /** Clock for metadata.timestamp. Defaults to now. */
  now?: Date;
  /** Set by a caller that served this tray from its cache. */
  cached?: boolean;
}

/** Stored enzyme roles of one row, each enzyme once per role, in catalog order. */
export function cypProfileOf(drug: Drug): CypProfile {
  const pick = (kind: "substrate" | "inhibitor" | "inducer"): Enzyme[] => [
    ...new Set(drug.enzymes.filter((role) => role.kind === kind).map((role) => role.enzyme)),
  ];
  return { substrates: pick("substrate"), inhibitors: pick("inhibitor"), inducers: pick("inducer") };
}

function isOnShelf(id: string): boolean {
  return Object.hasOwn(DRUG_BY_ID, id);
}

/** A row about exactly this pair. Stack rows (three or more names) belong to synergyAlerts. */
function isPairRow(finding: Finding, a: string, b: string): boolean {
  const ids = new Set(finding.drugIds);
  return ids.size === 2 && ids.has(a) && ids.has(b);
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildInteractionReport(
  entries: readonly TriageEntry[],
  options: TriageOptions = {},
): InteractionReport {
  const started = Date.now();
  const seen = new Set<string>();
  const kept = entries.filter((entry) => {
    if (!isOnShelf(entry.id) || seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
  const ids = kept.map((entry) => entry.id);
  const times: IngestionTimes = {};
  for (const entry of kept) {
    if (entry.hoursAgo !== undefined) times[entry.id] = entry.hoursAgo;
  }

  const report = analyze(ids, options.host);
  const sketch = timeline(ids, times, report);
  const decay = new Map(sketch.rows.map((row) => [row.id, row]));
  const nameOf = (id: string) => DRUG_BY_ID[id]!.name;

  const substances: SubstanceEntry[] = kept.map((entry) => {
    const drug = DRUG_BY_ID[entry.id]!;
    const row = decay.get(entry.id);
    const street = Object.hasOwn(STREET_NAMES, entry.id) ? STREET_NAMES[entry.id]! : [];
    const substance: SubstanceEntry = {
      rawInput: entry.rawInput,
      id: drug.id,
      canonicalName: drug.name,
      rxcui: null,
      aliases: [...new Set([...drug.brands, ...drug.aliases, ...street])],
      cypProfile: cypProfileOf(drug),
    };
    if (row?.hoursAgo !== undefined) substance.ingestionTimeHoursAgo = row.hoursAgo;
    if (row?.halfLifeH !== undefined) substance.halfLifeHours = row.halfLifeH;
    return substance;
  });

  const pairwiseInteractions: PairwiseInteraction[] = [];
  for (const [a, b] of fanoutPairs(ids)) {
    const overlap = sketch.pairs.find((row) => row.pair[0] === a && row.pair[1] === b);
    const timing: Pick<PairwiseInteraction, "activeOverlapPercent" | "overlapNote"> = {};
    if (overlap?.holds) timing.overlapNote = overlap.holds;
    else if (overlap?.activeOverlapPercent !== undefined) {
      timing.activeOverlapPercent = roundPercent(overlap.activeOverlapPercent);
    }
    const base = { pair: [nameOf(a), nameOf(b)] as [string, string], pairIds: [a, b] as [string, string] };
    const rows = report.findings.filter((finding) => isPairRow(finding, a, b));
    if (rows.length === 0) {
      pairwiseInteractions.push({
        ...base,
        source: "firstpass",
        severity: "Unknown",
        description: NO_MAPPED_PAIR,
        ...timing,
      });
      continue;
    }
    for (const finding of rows) {
      pairwiseInteractions.push({
        ...base,
        source: finding.kind === "pk" ? "metabolic" : "firstpass",
        severity: toSeverityTier(finding.severity),
        description: finding.clinical,
        mechanism: `${finding.effect}: ${finding.mechanism}`,
        ...timing,
      });
    }
  }

  const literature: LiteratureEvidence[] = [];
  for (const cite of citesFor(ids)) {
    if (!cite.pair) continue;
    const [a, b] = cite.pair;
    if (!seen.has(a) || !seen.has(b)) continue;
    const ordered = ids.indexOf(a) <= ids.indexOf(b) ? [a, b] : [b, a];
    literature.push({
      pmid: cite.pmid,
      title: cite.title,
      url: pubmedUrl(cite.pmid),
      pair: [nameOf(ordered[0]!), nameOf(ordered[1]!)],
      takeaway: cite.why,
    });
  }

  return {
    substances,
    highestSeverity: toSeverityTier(report.highest),
    pairwiseInteractions,
    synergyAlerts: synergyAlerts(ids, report),
    literature,
    metadata: {
      timestamp: (options.now ?? new Date()).toISOString(),
      cached: options.cached ?? false,
      executionTimeMs: Date.now() - started,
    },
  };
}
