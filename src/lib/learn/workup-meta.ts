// Kept apart from workup.ts: the route's search parser and head are in every page's entry bundle, and workup.ts pulls in the engine, catalog and samples.
export const WORKUP_TITLE = "Workup: find the interactions | FirstPass";
export const WORKUP_DESCRIPTION =
  "Work up a sample regimen as you would on rounds: call which drug pairs interact and how, then compare with the desk's findings and sources. Educational practice only.";

/** `?case=` when it is a string. WorkupView shows the picker for an id that names no case; parseWorkupSearch in workup.ts is the strict check. */
export const workupCaseSearch = (raw: Record<string, unknown>): { case?: string } =>
  typeof raw.case === "string" ? { case: raw.case } : {};
