/**
 * Everyday leads for published bedside scales (COWS / CIWA-Ar / Hunter).
 * Educational scoring display only — not a charted vital, not a diagnosis,
 * not a milligram, not an induction protocol. PI / published source governs.
 */

export type PublishedScaleId = "cows" | "ciwa" | "hunter";

export interface ScalePlainIntro {
  /** Everyday section title shown first. */
  plainTitle: string;
  /** Scientific name kept muted beside / under the title. */
  scientific: string;
  /** What it measures, in plain words. */
  measures: string;
  /** Published-score framing for independent review. */
  published: string;
}

export const SCALE_INTROS: Record<PublishedScaleId, ScalePlainIntro> = {
  cows: {
    plainTitle: "Opioid withdrawal check",
    scientific: "COWS",
    measures:
      "How strong opioid withdrawal looks and feels right now — pulse, sweating, restlessness, pupils, and related signs.",
    published:
      "Published score for independent review (Wesson & Ling 2003). Teaching display — not a charted vital and not an induction order.",
  },
  ciwa: {
    plainTitle: "Alcohol withdrawal check",
    scientific: "CIWA-Ar",
    measures:
      "How strong alcohol withdrawal looks right now — nausea, tremor, sweat, anxiety, orientation, and related signs.",
    published:
      "Published score for independent review (Sullivan 1989). Teaching display — not a charted vital and not a benzo protocol.",
  },
  hunter: {
    plainTitle: "Serotonin toxicity screen",
    scientific: "Hunter criteria",
    measures:
      "A yes/no teaching screen for serotonin toxicity signs (clonus, hyperreflexia, fever) when a serotonergic medicine is in play.",
    published:
      "Published decision rules for independent review (Dunkley 2003). Teaching screen — empty or negative is not a rule-out diagnosis.",
  },
};

/** Shared how-this-works strip for the scales surface. */
export const SCALES_COACH = {
  kicker: "How this works",
  body: "Walk published bedside scores in everyday words. The number stays on screen for review — it is a teaching aid for independent judgment, not an order and not a diagnosis.",
  empty:
    "An empty or zero score is not a diagnosis and not clearance. Product labeling and the clinician govern.",
} as const;

export function scaleIntro(id: PublishedScaleId): ScalePlainIntro {
  return SCALE_INTROS[id];
}

/** Short muted blurb under a scale title (item count / max filled by caller). */
export function scaleTitleBlurb(id: PublishedScaleId, detail: string): string {
  const intro = SCALE_INTROS[id];
  return `${intro.published} ${detail}`.trim();
}

/**
 * Soften order / hold sounding phrases toward watch / consider language.
 * Does not invent milligrams, doses, or stop orders.
 */
export function softScaleCopy(text: string): string {
  let out = text;
  const steps: [RegExp, string][] = [
    [/\bDo not chase\b/gi, "Watch for"],
    [/\bDo not give\b/gi, "Consider avoiding"],
    [
      /Not enough withdrawal to hang an induction on\. Wait, or this is not opioid withdrawal\./gi,
      "Not enough withdrawal to treat as an induction threshold. Consider waiting, or this may not be opioid withdrawal.",
    ],
    [/\bMany office protocols wait for\b/gi, "Many office maps consider"],
    [/\bMany office maps wait for\b/gi, "Many office maps consider"],
    [
      /\bpathways start symptom-triggered benzos\b/gi,
      "pathways consider symptom-triggered benzos",
    ],
    [
      /\bwithout a protocol\b/gi,
      "without a published protocol — consider pausing and reviewing occupancy",
    ],
  ];
  for (const [re, rep] of steps) {
    out = out.replace(re, rep);
  }
  return out;
}

/** Extra watch copy when buprenorphine sits with a full agonist (precip teaching). */
export const COWS_PRECIP_WATCH =
  "Fentanyl still in tissue can precipitate even when this COWS number looks 'high enough.' Occupancy matters more than the integer. Watch for precipitated withdrawal — stacking more film early without a published protocol is a consider-and-review moment, not a desk order.";

/** Milder context when COWS is relevant but no precip pair. */
export const COWS_CONTEXT_WATCH =
  "Many office maps consider ≥8–12 before a first film. Recent fentanyl is still occupancy, not this integer. Lofexidine / clonidine are α2 — naloxone will not reverse them.";

/** NMS contrast on the Hunter tab — watch/consider, not a give/hold order. */
export const HUNTER_NMS_WATCH =
  "NMS is lead-pipe rigidity, bradyreflexia, slower onset. Hunter is clonus and hyperreflexia. Consider avoiding dantrolene for serotonin toxicity just because someone said 'fever.'";

/** Footer under bedside math + scales. */
export const BEDSIDE_SCALES_FOOTER =
  "Formulas and published scores only. Not an ECG machine, not CKD-EPI, not IBW, not a milligram, not a COWS induction, not a CIWA benzo protocol. Empty ≠ diagnosis.";
