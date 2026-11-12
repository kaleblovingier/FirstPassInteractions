/**
 * Wire contract for the triage report: the shape POST /api/cds/analyze returns, and the shared
 * vocabulary of the triage panels.
 *
 * Everything here is a projection. The engine in src/lib/drugs grades findings in its own terms
 * (Severity, Finding, Report in src/lib/drugs/types.ts), and nothing in this file grades anything.
 * A SeverityTier is the engine's severity under another name (toSeverityTier in
 * src/lib/drugs/interaction-report.ts). No code may raise or lower a tier on the way through, and
 * a row from an outside source is quoted, never regraded: it carries "Unknown".
 */

import type { Enzyme } from "../lib/drugs/types";

/** The engine's severity, renamed for the wire. "Unknown" is a pair with no mapped row: not a clearance. */
export type SeverityTier = "Contraindicated" | "Severe" | "Moderate" | "Low" | "Unknown";

/** Sharpest first. */
export const SEVERITY_TIERS: readonly SeverityTier[] = [
  "Contraindicated",
  "Severe",
  "Moderate",
  "Low",
  "Unknown",
];

/**
 * Enzyme roles stored on one catalog row. Covers CYP1A2, CYP2C9, CYP2C19, CYP2D6 and CYP3A4, plus
 * the other enzymes the catalog maps (CYP2B6, CYP2C8, CYP2E1, P-gp), so no stored role is dropped.
 */
export interface CypProfile {
  substrates: Enzyme[];
  inhibitors: Enzyme[];
  inducers: Enzyme[];
}

export interface SubstanceEntry {
  /** Exactly what was typed or sent, before resolution ("Molly"). */
  rawInput: string;
  /** Catalog id the input resolved to ("mdma"). The key the engine, the desk and the API share. */
  id: string;
  /** Catalog name ("MDMA"). Differs from rawInput when a brand, alias or street name resolved. */
  canonicalName: string;
  /** RxNorm concept id when a live lookup supplied one. Null when not looked up or not found. */
  rxcui?: string | null;
  /** Brands, stored aliases and search-only street names for this row. */
  aliases: string[];
  /** Hours since the last dose, when stated. */
  ingestionTimeHoursAgo?: number;
  /** Typical adult elimination half-life in hours. Absent when the shelf has none. */
  halfLifeHours?: number;
  cypProfile?: CypProfile;
}

/**
 * Where a pairwise row came from.
 * - "metabolic": a FirstPass engine pharmacokinetic row (enzyme or transporter).
 * - "firstpass": any other FirstPass engine row (pharmacodynamic, label pin, clinic), and the
 *   "no mapped collision" row of a blank pair.
 * - "psychonaut": a live TripSit / PsychonautWiki combination row, quoted.
 * - "rxnav": the live OpenFDA label partner scan with RxClass. NLM retired the RxNav interaction
 *   API in 2024; the name is kept for the module that replaced it.
 */
export type InteractionSource = "firstpass" | "metabolic" | "psychonaut" | "rxnav";

export interface PairwiseInteraction {
  /** Catalog names, in tray order. */
  pair: [string, string];
  /** Catalog ids, in tray order. */
  pairIds: [string, string];
  source: InteractionSource;
  /** The engine's severity for an engine row. Always "Unknown" for a live outside row. */
  severity: SeverityTier;
  description: string;
  mechanism?: string;
  /** 0–100: the smaller share still left of the two, from stated times and typical half-lives. */
  activeOverlapPercent?: number;
  /** A clock on this pair that outlasts half-life math. When set, no percent is given. */
  overlapNote?: string;
}

export type SynergyCategory =
  | "Serotonin Syndrome"
  | "CNS & Respiratory Depression"
  | "Sympathomimetic Crisis"
  | "QTc Prolongation"
  | "CYP450 Metabolic Bottleneck"
  | "Toxic Metabolite (e.g., Cocaethylene)";

export const SYNERGY_CATEGORIES: readonly SynergyCategory[] = [
  "Serotonin Syndrome",
  "CNS & Respiratory Depression",
  "Sympathomimetic Crisis",
  "QTc Prolongation",
  "CYP450 Metabolic Bottleneck",
  "Toxic Metabolite (e.g., Cocaethylene)",
];

/** Engine rows that share one mechanism, gathered under a category. See src/lib/drugs/synergy.ts. */
export interface SynergyAlert {
  category: SynergyCategory;
  /** The sharpest engine row gathered here. Never sharper than the engine graded. */
  riskLevel: SeverityTier;
  /** Catalog names, in tray order. */
  implicatedSubstances: string[];
  /** Catalog ids, in tray order. */
  implicatedIds: string[];
  clinicalExplanation: string;
  /** Teaching lines already on the desk. Not a protocol and not a milligram. */
  actionableGuidance: string[];
}

export interface LiteratureEvidence {
  pmid: string;
  title: string;
  url: string;
  /** Catalog names, in tray order. */
  pair: [string, string];
  /** The curated shelf's note for this paper. Absent for a live search hit: nothing is summarized. */
  takeaway?: string;
}

export interface InteractionReport {
  substances: SubstanceEntry[];
  highestSeverity: SeverityTier;
  /** At least one row for every pair on the tray: N substances give N(N-1)/2 pairs. */
  pairwiseInteractions: PairwiseInteraction[];
  synergyAlerts: SynergyAlert[];
  literature: LiteratureEvidence[];
  metadata: {
    /** ISO 8601. */
    timestamp: string;
    cached: boolean;
    executionTimeMs: number;
  };
}
