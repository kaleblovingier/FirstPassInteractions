/**
 * Food, drink, and host-condition rows for names already on the desk.
 * Same engine as the pair check. Not a second database. Not a milligram.
 */

import { DRUG_BY_ID } from "./catalog";
import { analyze } from "./engine";
import type { Drug, Finding, HostContext, Severity } from "./types";

export const FOOD_PROBES = [
  "grapefruit",
  "ethanol",
  "dairy",
  "st-johns-wort",
  "leafy-greens",
  "coffee",
  "calcium",
  "tyramine-foods",
] as const;

const SEV: Record<Severity, number> = {
  contraindicated: 4,
  major: 3,
  moderate: 2,
  minor: 1,
};

function dedupe(rows: Finding[]) {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of rows) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
  }
  return out.sort((a, b) => SEV[b.severity] - SEV[a.severity] || a.headline.localeCompare(b.headline));
}

function realIds(ids: string[]) {
  return ids.filter((id) => DRUG_BY_ID[id] && !id.startsWith("__"));
}

export function foodBeside(ids: string[], host: HostContext): Finding[] {
  const real = realIds(ids);
  const out: Finding[] = [];
  for (const id of real) {
    for (const extra of FOOD_PROBES) {
      if (real.includes(extra) || !DRUG_BY_ID[extra]) continue;
      const report = analyze([id, extra], host);
      for (const f of report.findings) {
        if (f.drugIds.includes(extra)) out.push(f);
      }
    }
  }
  const ranked = dedupe(out).filter((f) => {
    if (!f.tags.includes("phenoconversion")) return true;
    const key = [...f.drugIds].sort().join("|");
    return !out.some(
      (other) =>
        other.kind === "pk" &&
        other.id !== f.id &&
        [...other.drugIds].sort().join("|") === key,
    );
  });
  const loud = ranked.filter((f) => f.severity !== "minor");
  return loud.length ? loud : ranked.slice(0, 4);
}

export interface ConditionLane {
  id: string;
  label: string;
  findings: Finding[];
}

export function conditionLanes(ids: string[], host: HostContext, already: Set<string>): ConditionLane[] {
  const real = realIds(ids);
  if (!real.length) return [];
  const base: HostContext = { ...host, phenotypes: { ...host.phenotypes } };
  const lanes: { id: string; label: string; host: HostContext }[] = [];
  if ((base.preg ?? "off") === "off") {
    lanes.push({ id: "preg", label: "If pregnant", host: { ...base, preg: "pregnant" } });
  }
  if ((base.kidney ?? "ok") === "ok") {
    lanes.push({ id: "ckd", label: "If CKD", host: { ...base, kidney: "ckd" } });
  }
  if ((base.age ?? "adult") === "adult") {
    lanes.push({ id: "age", label: "If older adult", host: { ...base, age: "geriatric" } });
  }
  if (!base.smoking) {
    lanes.push({ id: "smoke", label: "If daily smoke", host: { ...base, smoking: true } });
  }
  return lanes
    .map((lane) => ({
      id: lane.id,
      label: lane.label,
      findings: dedupe(analyze(real, lane.host).findings.filter((f) => !already.has(f.id))).slice(0, 3),
    }))
    .filter((lane) => lane.findings.length > 0);
}

export function sameShelfGroups(ids: string[]): { cls: string; names: string[] }[] {
  const named = realIds(ids)
    .map((id) => DRUG_BY_ID[id])
    .filter((d): d is Drug => Boolean(d) && d.kind === "drug");
  const by = new Map<string, string[]>();
  for (const d of named) {
    const list = by.get(d.cls) ?? [];
    list.push(d.name);
    by.set(d.cls, list);
  }
  return [...by.entries()].filter(([, names]) => names.length > 1).map(([cls, names]) => ({ cls, names }));
}

export function sameShelf(ids: string[]): string | null {
  const dups = sameShelfGroups(ids);
  if (!dups.length) return null;
  return dups.map(({ cls, names }) => `${names.join(" and ")} are both on the ${cls} shelf`).join(". ");
}
