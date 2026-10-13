import { SEVERITY_RANK, type Finding, type Severity } from "./types";

export const FANOUT_STAGES = ["resolve", "pair", "multi", "phenotype", "host", "reduce"] as const;

export const FANOUT_RULE =
  "Pairs are the unit of work. Do not split one pair across enzymes. Reduce in severity order after every pair returns.";

/** Upper triangle i < j, i ascending, then j ascending. */
export function pairSlots(n: number): [number, number][] {
  if (n < 2) return [];
  const slots: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      slots.push([i, j]);
    }
  }
  return slots;
}

/** Given an array of drug identifiers, returns all pairwise comparisons in pairSlots order. */
export function fanoutPairs(drugIds: readonly string[]): Array<[string, string]> {
  return pairSlots(drugIds.length).map(([i, j]) => [drugIds[i], drugIds[j]]);
}

/** PK and PD for one pair travel together. */
export function pairBundle(pk: Finding[], pd: Finding[]): Finding[] {
  return [...pk, ...pd];
}

function findingKey(f: Finding): string {
  if (f.kind === "pd") return f.id;
  return `${[...f.drugIds].sort().join("-")}|${f.enzymes.join(",")}|${f.tags.join(",")}`;
}

/** Flatten, dedupe (higher severity wins), then sort. Shard order does not matter. */
export function reduceFindings(shards: Finding[][]): Finding[] {
  const byKey = new Map<string, Finding>();
  for (const shard of shards) {
    for (const f of shard) {
      const key = findingKey(f);
      const prev = byKey.get(key);
      if (!prev || SEVERITY_RANK[f.severity] > SEVERITY_RANK[prev.severity]) {
        byKey.set(key, f);
      }
    }
  }
  return [...byKey.values()].sort((a, b) => {
    const d = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (d) return d;
    if (a.kind !== b.kind) return a.kind === "pk" ? -1 : 1;
    return a.headline.localeCompare(b.headline);
  });
}

export interface PairwiseSummary {
  pair: [string, string];
  totalFindings: number;
  highestSeverity: Severity | "none";
}

/** Summarize findings attributed to each pair slot. */
export function summarizePairs(
  drugIds: readonly string[],
  findings: readonly Finding[],
): PairwiseSummary[] {
  const pairs = fanoutPairs(drugIds);
  return pairs.map(([a, b]) => {
    const matching = findings.filter(
      (f) => f.drugIds.includes(a) && f.drugIds.includes(b),
    );
    let highest: Severity | "none" = "none";
    for (const f of matching) {
      if (highest === "none" || SEVERITY_RANK[f.severity] > SEVERITY_RANK[highest]) {
        highest = f.severity;
      }
    }
    return {
      pair: [a, b],
      totalFindings: matching.length,
      highestSeverity: highest,
    };
  });
}

