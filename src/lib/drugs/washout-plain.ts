/**
 * Everyday copy for the Washout panel ("How long it lingers").
 * Teaching display only — not a stop order, not a restart date, not a dose.
 * Numbers come from WASHOUT in ./host.ts and are never changed here.
 * Product labeling and the prescriber govern.
 */

type WashoutLike = { ids: string[]; days: number; label: string };

/** Plain title first, scientific terms muted beside it. */
export const WASHOUT_TITLE = {
  plainTitle: "How long it lingers",
  scientific: "Washout · half-life · enzyme recovery",
} as const;

/** Short how-this-works strip shown above the washout rows. */
export const WASHOUT_COACH = {
  kicker: "How this works",
  body: "A washout window is roughly how long a medicine, or its effect on a liver enzyme, keeps lingering after the last dose. Stopping yesterday does not always mean the interaction is gone today.",
  estimate:
    "These are teaching estimates for independent review, not a restart date and not a real-time alert. A study aid for how timing changes the picture. Product labeling and the prescriber govern.",
} as const;

/** Empty state: nothing mapped is not a green light. */
export const WASHOUT_EMPTY =
  "No lingering-effect windows are mapped for this tray. An empty list is not a green light — this desk only knows a short teaching list, and the label and prescriber still govern.";

/** Footer under the rows. */
export const WASHOUT_FOOTER =
  "Bars compare each window against six weeks for scale. Teaching estimate only — not a restart date and not a dose. The label and prescriber govern.";

export type WashoutOffsetKind =
  | "inducer"
  | "inhibitor"
  | "maoi-irreversible"
  | "maoi-reversible";

/** Plain offset explanations; mirrors wording already in the WASHOUT labels. */
export const WASHOUT_OFFSET: Record<WashoutOffsetKind, { tag: string; plain: string }> = {
  inducer: {
    tag: "Enzyme booster (inducer)",
    plain:
      "Boosters make the liver build extra enzyme. After stopping, the extra enzyme fades slowly over weeks as levels return to normal — not the morning after the last dose.",
  },
  inhibitor: {
    tag: "Enzyme blocker (inhibitor)",
    plain:
      "Blockers slow an enzyme while they are around. The effect usually fades as the medicine and its active leftovers clear — which can take a long time for slow-clearing medicines.",
  },
  "maoi-irreversible": {
    tag: "Permanent MAO block (irreversible)",
    plain:
      "This kind of block does not let go. The body has to make fresh enzyme, so the wait depends on rebuilding, not just on the pill clearing.",
  },
  "maoi-reversible": {
    tag: "Short MAO block (reversible)",
    plain:
      "This block lets go as the medicine clears, so it eases faster — but the interaction still matters while it is present.",
  },
};

const INDUCERS = new Set([
  "rifampin",
  "carbamazepine",
  "phenobarbital",
  "primidone",
  "st-johns-wort",
  "efavirenz",
]);
const INHIBITORS = new Set(["fluoxetine", "amiodarone", "bupropion"]);
const MAOI_IRREVERSIBLE = new Set(["phenelzine", "tranylcypromine", "isocarboxazid"]);
const MAOI_REVERSIBLE = new Set(["moclobemide", "harmaline"]);

/**
 * Classify a WASHOUT row by what its existing label already says.
 * Returns null when the data does not distinguish — we do not guess.
 */
export function washoutOffsetKind(w: WashoutLike): WashoutOffsetKind | null {
  const has = (s: Set<string>) => w.ids.some((id) => s.has(id));
  if (has(INDUCERS)) return "inducer";
  if (has(MAOI_IRREVERSIBLE)) return "maoi-irreversible";
  if (has(MAOI_REVERSIBLE)) return "maoi-reversible";
  if (has(INHIBITORS)) return "inhibitor";
  return null;
}

/** "about 35 days" / "about 1 day" — words instead of a bare "35d". */
export function washoutDaysWords(days: number): string {
  return `about ${days} ${days === 1 ? "day" : "days"}`;
}
