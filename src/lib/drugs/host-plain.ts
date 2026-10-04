import type {
  AgeBand,
  AlcoholPattern,
  CannabisRoute,
  KetamineRoute,
  KidneyBand,
  Metabolizer,
  PregBand,
} from "./types";

/**
 * Everyday words for the Host factors panel (phenotype.tsx).
 * Educational only: no milligrams, no dose changes, no start/stop advice.
 * Scientific terms stay on screen, muted, next to the plain title.
 * Product labeling and the clinician govern care.
 */

/** A plain title with the scientific term shown muted underneath or beside it. */
export interface PlainTitle {
  plain: string;
  scientific: string;
}

/** How-this-works strip at the top of the Host factors card. */
export const HOST_COACH = {
  kicker: "How this works",
  title: { plain: "About this person", scientific: "Host factors" } satisfies PlainTitle,
  body: "The same drugs can act differently in different people. Pick only what you already know about this person (a metabolizer status from their chart, smoking, drinking, age, kidneys, pregnancy) and the desk re-reads every pair with that in mind.",
  how: "A slow built-in enzyme acts a lot like a drug that blocks that enzyme. Smoking speeds up the 1A2 enzyme. Heavy long-term drinking speeds up the 2E1 enzyme. Older age, weaker kidneys, and pregnancy open extra teaching cards (Beers list, kidney, and pregnancy notes).",
  empty:
    "Everything is set to typical. A typical person, or a quiet result, is not a green light: real people vary, and genetics are rarely known at the desk. Product labeling and the clinician govern.",
  footer:
    "Teaching only. The enzyme speed rows are a plain summary of CPIC guidance for a status you already know. They are not a genetic test result, not a gene report reading, and not a reason to change any medicine.",
} as const;

/** Section heading over the four enzyme rows. */
export const ENZYME_SPEED_TITLE: PlainTitle = {
  plain: "Built-in enzyme speed",
  scientific: "Metabolizer phenotype · CPIC paraphrase",
};

/** Helper line under the enzyme speed title: a known status in, a teaching summary out. */
export const ENZYME_SPEED_HELPER =
  "Pick a metabolizer status you already know. This is a teaching summary of CPIC guidance, not a genetic test result.";

/** Plain button words for each metabolizer type. The code (PM, IM, NM, UM) stays muted. */
export const METABOLIZER_PLAIN: Record<Metabolizer, string> = {
  PM: "Slow",
  IM: "A bit slow",
  NM: "Typical",
  UM: "Fast",
};

/** Lead-in before the population frequency string (the frequency data itself is unchanged). */
export function howCommonLine(freq: string): string {
  return `How common: ${freq}`;
}

/** Plain titles for each non-enzyme control. */
export const HOST_SECTION_TITLES = {
  smoking: { plain: "Smoking", scientific: "Tobacco smoke · CYP1A2 inducer" },
  alcohol: { plain: "Drinking", scientific: "Alcohol pattern · CYP2E1" },
  ketamine: { plain: "How ketamine goes in", scientific: "Ketamine route" },
  cannabis: { plain: "How cannabis is taken", scientific: "Cannabis route" },
  age: { plain: "Age", scientific: "Age band · Beers list" },
  kidney: { plain: "Kidneys", scientific: "Renal function · GFR" },
  preg: { plain: "Pregnancy or breastfeeding", scientific: "Pregnancy / lactation" },
} as const satisfies Record<string, PlainTitle>;

export const SMOKING_PLAIN = { off: "Doesn't smoke", on: "Smokes daily" } as const;

export const ALCOHOL_PLAIN: Record<AlcoholPattern, string> = {
  off: "None",
  acute: "Drinking today",
  chronic: "Heavy, long-term",
};

export const KETAMINE_ROUTE_PLAIN: Record<KetamineRoute, string> = {
  iv: "Shot or drip",
  in: "Nose spray",
  oral: "By mouth",
};

export const CANNABIS_ROUTE_PLAIN: Record<CannabisRoute, string> = {
  smoked: "Smoked",
  oral: "Edible",
};

export const AGE_PLAIN: Record<AgeBand, string> = {
  adult: "Adult",
  geriatric: "Older adult",
};

export const KIDNEY_PLAIN: Record<KidneyBand, string> = {
  ok: "Usual",
  ckd: "Filter slower",
};

export const PREG_PLAIN: Record<PregBand, string> = {
  off: "No",
  pregnant: "Pregnant",
  lactating: "Breastfeeding",
};

/** Free-tier note under the ketamine route control. Words, not symbols. */
export const KETAMINE_ROUTE_NOTE =
  "Free on this desk. Ketamine by mouth with grapefruit is the teaching demo for the gut first pass.";

/** Paid host factors besides the free ketamine route. */
export const OTHER_HOST_FACTORS_LINE = "The other host factors come with founding.";

/** Rounds coach: which host factors sit behind founding. */
export const ROUNDS_HOST_LINE =
  "Pathway speed, smoke, alcohol, and cannabis route come with founding.";

/** Every prose string in this lib, for guard tests. */
export function allHostPlainCopy(): string[] {
  return [
    HOST_COACH.kicker,
    HOST_COACH.title.plain,
    HOST_COACH.body,
    HOST_COACH.how,
    HOST_COACH.empty,
    HOST_COACH.footer,
    ENZYME_SPEED_TITLE.plain,
    ENZYME_SPEED_HELPER,
    ...Object.values(METABOLIZER_PLAIN),
    howCommonLine("~7% EUR"),
    ...Object.values(HOST_SECTION_TITLES).map((t) => t.plain),
    ...Object.values(SMOKING_PLAIN),
    ...Object.values(ALCOHOL_PLAIN),
    ...Object.values(KETAMINE_ROUTE_PLAIN),
    ...Object.values(CANNABIS_ROUTE_PLAIN),
    ...Object.values(AGE_PLAIN),
    ...Object.values(KIDNEY_PLAIN),
    ...Object.values(PREG_PLAIN),
    KETAMINE_ROUTE_NOTE,
    OTHER_HOST_FACTORS_LINE,
    ROUNDS_HOST_LINE,
  ];
}
