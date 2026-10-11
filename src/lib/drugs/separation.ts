/**
 * Labeled waits when a binder would keep the dose from arriving.
 * Intervals are the words already on the prescribing information.
 * Not a milligram and not a schedule for a named patient.
 */

import { DRUG_BY_ID } from "./catalog";

export interface SeparationRule {
  victimId: string;
  binderIds: string[];
  apart: string;
  source: string;
  /** Fires from the victim alone. Other tray drugs are the "other medication." */
  alone?: boolean;
}

const CANDIDATES: SeparationRule[] = [
  {
    victimId: "levothyroxine",
    binderIds: [
      "calcium",
      "calcium-carbonate",
      "ferrous-sulfate",
      "iron",
      "cholestyramine",
      "colesevelam",
      "sucralfate",
      "aluminum-hydroxide",
      "magnesium-hydroxide",
    ],
    apart:
      "Take it on an empty stomach, 30 to 60 minutes before breakfast. Separate it by at least 4 hours from calcium carbonate, iron, bile acid sequestrants, sucralfate, and antacids.",
    source: "Levothyroxine prescribing information.",
  },
  {
    victimId: "ciprofloxacin",
    binderIds: [
      "magnesium",
      "magnesium-hydroxide",
      "aluminum-hydroxide",
      "sucralfate",
      "iron",
      "ferrous-sulfate",
      "zinc",
      "calcium",
      "calcium-carbonate",
    ],
    apart:
      "Take ciprofloxacin 2 hours before or 6 hours after magnesium or aluminum antacids, sucralfate, iron, zinc, or calcium.",
    source: "Ciprofloxacin prescribing information.",
  },
  {
    victimId: "dolutegravir",
    binderIds: ["calcium", "calcium-carbonate", "iron", "ferrous-sulfate"],
    apart:
      "Take dolutegravir 2 hours before or 6 hours after calcium or iron. With a meal, calcium or iron may be taken at the same time.",
    source: "Dolutegravir prescribing information.",
  },
  {
    victimId: "bictegravir",
    binderIds: ["calcium", "calcium-carbonate", "iron", "ferrous-sulfate"],
    apart:
      "Take bictegravir 2 hours before or 6 hours after calcium or iron. With a meal, calcium or iron may be taken at the same time.",
    source: "Bictegravir prescribing information.",
  },
  {
    victimId: "alendronate",
    binderIds: [],
    apart:
      "Swallow alendronate with plain water on an empty stomach. Wait at least 30 minutes before the first food, drink, or other medication.",
    source: "Alendronate prescribing information.",
    alone: true,
  },
];

function knownId(id: string): boolean {
  return Boolean(DRUG_BY_ID[id]);
}

/** Rules whose victim is on this formulary. Missing binder ids are omitted. */
export const SEPARATION_RULES: SeparationRule[] = CANDIDATES.filter((rule) => knownId(rule.victimId)).map(
  (rule) => ({
    ...rule,
    binderIds: rule.binderIds.filter(knownId),
  }),
);

export interface SeparationHit {
  victimId: string;
  victimName: string;
  apart: string;
  source: string;
  bindersOnTray: { id: string; name: string }[];
  alone: boolean;
}

export function separationOnDesk(ids: string[]): boolean {
  const on = new Set(ids);
  return SEPARATION_RULES.some((rule) => on.has(rule.victimId));
}

export function separationHits(ids: string[]): SeparationHit[] {
  const on = new Set(ids);
  return SEPARATION_RULES.filter((rule) => on.has(rule.victimId)).map((rule) => ({
    victimId: rule.victimId,
    victimName: DRUG_BY_ID[rule.victimId]?.name ?? rule.victimId,
    apart: rule.apart,
    source: rule.source,
    bindersOnTray: rule.binderIds
      .filter((id) => on.has(id))
      .map((id) => ({ id, name: DRUG_BY_ID[id]?.name ?? id })),
    alone: Boolean(rule.alone),
  }));
}
