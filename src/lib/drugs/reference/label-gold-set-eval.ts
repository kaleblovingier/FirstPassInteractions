/**
 * Runs label gold-set pairs through the real desk engine, the same way the desk
 * does: `analyze(selectedIds, host)` with the default host (no doses entered).
 * The pair's severity is the highest severity among findings that involve BOTH
 * drugs; single-drug findings (e.g. a phenotype note on one drug) are excluded
 * so an unrelated flag cannot mask a pair-level under-call.
 */
import { analyze } from "../engine";
import { DEFAULT_HOST, SEVERITY_RANK, type Finding, type Severity } from "../types";
import type { GoldPair } from "./label-gold-set";

export type PairSeverity = Severity | "none";

export interface GoldResult {
  pair: GoldPair;
  engine: PairSeverity;
  /** `report.highest` for the whole two-drug regimen (informational). */
  regimenHighest: PairSeverity;
  headline: string | null;
  meetsFloor: boolean;
  exactContraindicated: boolean;
}

export function pairFindings(a: string, b: string): Finding[] {
  return analyze([a, b], DEFAULT_HOST).findings.filter(
    (f) => f.drugIds.includes(a) && f.drugIds.includes(b),
  );
}

export function evaluatePair(pair: GoldPair): GoldResult {
  const report = analyze([pair.drugA, pair.drugB], DEFAULT_HOST);
  const own = report.findings
    .filter((f) => f.drugIds.includes(pair.drugA) && f.drugIds.includes(pair.drugB))
    .sort((x, y) => SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity]);
  const engine: PairSeverity = own[0]?.severity ?? "none";
  return {
    pair,
    engine,
    regimenHighest: report.highest,
    headline: own[0]?.headline ?? null,
    meetsFloor: SEVERITY_RANK[engine] >= SEVERITY_RANK[pair.expectedFloor],
    exactContraindicated: pair.expectContraindicated && engine === "contraindicated",
  };
}

export function evaluateGoldSet(pairs: GoldPair[]): GoldResult[] {
  return pairs.map(evaluatePair);
}
