import type { AlcoholPattern, CannabisRoute, KetamineRoute, Metabolizer } from "./types";

/** Everyday “what this changes” lines for Host controls. Educational only — no dosing. */

export function smokingBlurb(on: boolean): string {
  return on
    ? "Smoke speeds the CYP1A2 pathway. Clozapine and olanzapine often clear faster while smoking; levels can rebound after quitting."
    : "Unlocking this teaches how smoke speeds CYP1A2 clearance — the classic clozapine / olanzapine lesson.";
}

export function alcoholBlurb(pattern: AlcoholPattern): string {
  switch (pattern) {
    case "acute":
      return "Acute drinking stacks sedation teaching with other CNS-depressant drugs. Product labeling and the clinician govern care.";
    case "chronic":
      return "Chronic drinking induces CYP2E1 — used here to teach acetaminophen NAPQI risk and faster 2E1-victim clearance.";
    default:
      return "Unlocking this teaches acute sedation stacking and chronic CYP2E1 induction — two different alcohol stories.";
  }
}

export function ketamineRouteBlurb(route: KetamineRoute): string {
  switch (route) {
    case "oral":
      return "Oral dosing hits gut CYP3A4 first-pass hard — the classic grapefruit teaching case.";
    case "in":
      return "Intranasal still meets hepatic enzymes, with less gut first-pass than oral.";
    default:
      return "IV / IM mostly skips gut first-pass; hepatic CYP2B6 still clears it.";
  }
}

export function cannabisRouteBlurb(route: CannabisRoute): string {
  return route === "oral"
    ? "Edibles make 11-OH-THC in the gut / liver — often stronger and longer-feeling than smoked."
    : "Smoked THC mostly skips the edible first-pass that makes 11-OH-THC.";
}

/** Short phenotype gloss. Returns null for normal metabolizer (nothing to explain). */
export function phenotypeBlurb(metabolizer: Metabolizer): string | null {
  switch (metabolizer) {
    case "PM":
      return "This pathway runs slow — similar teaching to a strong inhibitor on that enzyme.";
    case "IM":
      return "This pathway runs a bit slow.";
    case "UM":
      return "This pathway runs fast — substrates may clear quicker.";
    default:
      return null;
  }
}
