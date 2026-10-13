import { SEVERITY_RANK, type Finding } from "./types";

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
