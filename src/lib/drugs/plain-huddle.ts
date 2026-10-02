import type { WindowBrief } from "./window";
import { huddleText } from "./window";

/** Everyday glosses — scientific term stays available for HCPs. */
export const PLAIN_GLOSS = {
  tdi: {
    term: "TDI / time-dependent inactivation",
    plain: "blocks the enzyme for days, not hours",
  },
  reversible: {
    term: "reversible inhibition",
    plain: "blocks the enzyme while the drug is present",
  },
  induction: {
    term: "induction lag",
    plain: "the enzyme ramps up over days after starting",
  },
  washout: {
    term: "washout",
    plain: "time to clear enough that the interaction eases",
  },
} as const;

export type PlainGlossKey = keyof typeof PLAIN_GLOSS;

export function glossPlain(key: PlainGlossKey): string {
  return PLAIN_GLOSS[key].plain;
}

export function glossWithTerm(key: PlainGlossKey): string {
  const g = PLAIN_GLOSS[key];
  return `${g.plain} (${g.term})`;
}

/** Badge / hover line for CYP start-stop clock kinds. */
export function plainClockKind(kind: "reversible" | "tdi" | "induction"): {
  label: string;
  title: string;
} {
  if (kind === "tdi") {
    return { label: "TDI", title: glossWithTerm("tdi") };
  }
  if (kind === "induction") {
    return { label: "induction", title: glossWithTerm("induction") };
  }
  return { label: "reversible", title: glossWithTerm("reversible") };
}

/**
 * Map jargon in huddle / washout copy to everyday words.
 * Keeps the scientific cue in parentheses so HCPs are not dumbed-down-only.
 * Does not invent doses, holds, or stop orders.
 */
export function plainLine(text: string): string {
  let out = text;
  const steps: [RegExp, string][] = [
    [/time-dependent inactivation/gi, PLAIN_GLOSS.tdi.plain],
    [
      /\bCYP TDI linger\b/g,
      `leftover enzyme block (${PLAIN_GLOSS.tdi.term} — ${PLAIN_GLOSS.tdi.plain})`,
    ],
    [
      /\bTDI linger\b/g,
      `leftover enzyme block (${PLAIN_GLOSS.tdi.term} — ${PLAIN_GLOSS.tdi.plain})`,
    ],
    [/\bTDI\b/g, `TDI (${PLAIN_GLOSS.tdi.plain})`],
    [
      /reversible (?:inhibition|occupancy)/gi,
      `${PLAIN_GLOSS.reversible.plain} (${PLAIN_GLOSS.reversible.term})`,
    ],
    [/induction lag/gi, `${PLAIN_GLOSS.induction.plain} (${PLAIN_GLOSS.induction.term})`],
    [
      /\bCYP induction clock\b/g,
      `enzyme ramp-up clock (${PLAIN_GLOSS.induction.plain})`,
    ],
    [
      /\binduction clock\b/gi,
      `enzyme ramp-up clock (${PLAIN_GLOSS.induction.plain})`,
    ],
    [
      /\bwashout\b/gi,
      `washout (${PLAIN_GLOSS.washout.plain})`,
    ],
  ];
  for (const [re, rep] of steps) {
    out = out.replace(re, rep);
  }
  return out;
}

/** Plain-words variant of a window / clinic briefing. */
export function plainBrief(brief: WindowBrief): WindowBrief {
  return {
    ...brief,
    watch: brief.watch.map(plainLine),
    tell: plainLine(brief.tell),
    call: plainLine(brief.call),
  };
}

/** Clipboard body for the mode currently on screen. */
export function huddleTextVisible(brief: WindowBrief, plain: boolean): string {
  return huddleText(plain ? plainBrief(brief) : brief);
}

type WashoutLike = { ids: string[]; days: number; label: string };

/**
 * One-line everyday lead for a washout clock row.
 * Protocol detail stays in the muted label underneath.
 */
export function plainWashoutLead(w: WashoutLike): string {
  const set = new Set(w.ids);
  const days = w.days;
  const ease = `washout (${PLAIN_GLOSS.washout.plain})`;

  if (set.has("fluoxetine")) {
    return `About ${days} days — this medicine can keep blocking an enzyme long after the last dose (${ease}).`;
  }
  if (set.has("phenelzine") || set.has("tranylcypromine") || set.has("isocarboxazid")) {
    return `About ${days} days — irreversible MAOI block needs this wait before serotonergic or stimulant partners (${ease}).`;
  }
  if (set.has("moclobemide") || set.has("harmaline")) {
    return `About ${days} day — reversible MAO-A usually eases within a day, but the interaction still matters (${ease}).`;
  }
  if (set.has("amiodarone")) {
    return `About ${days} days — this heart-rhythm medicine can keep blocking enzymes for weeks after the last dose (${ease}).`;
  }
  if (
    set.has("rifampin") ||
    set.has("carbamazepine") ||
    set.has("phenobarbital") ||
    set.has("primidone") ||
    set.has("st-johns-wort")
  ) {
    return `About ${days} days — strong enzyme boosters take 1–2 weeks to ramp up and about as long to fade (${ease}).`;
  }
  if (set.has("efavirenz")) {
    return `About ${days} days — efavirenz enzyme boost is not gone the morning after the last dose (${ease}).`;
  }
  if (set.has("bupropion")) {
    return `About ${days} days — this medicine can keep blocking CYP2D6 for about a week after the last dose (${ease}).`;
  }
  return `About ${days} days — wait for this leftover effect to ease (${ease}).`;
}

/** Quiet / empty washout card copy. */
export const PLAIN_WASHOUT_QUIET =
  "No lingering washout clocks mapped for this tray. An empty clock is not proof the combination is clear.";

export const PLAIN_WASHOUT_SUBTITLE =
  "Stopping yesterday does not always clear a leftover interaction — that wait is the washout (time to clear enough that the interaction eases).";
