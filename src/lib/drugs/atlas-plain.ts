/**
 * Everyday copy for the Enzyme atlas ("Liver enzyme map").
 * Teaching display only — not a charting tool, not a stop order, not a dose.
 * The substrate / blocker / speeder lists come from the catalog via
 * enzymeIndex() and are never changed here. Product labeling and the
 * prescriber govern.
 */
import type { Enzyme } from "./types.ts";

/** Plain title first, scientific terms muted beside it. */
export const ATLAS_TITLE = {
  plainTitle: "Liver enzyme map",
  scientific: "Enzyme atlas · CYP450 · P-gp",
} as const;

/** Short how-this-works strip shown under the atlas header. */
export const ATLAS_COACH = {
  kicker: "How this works",
  body: "Each liver enzyme is a clearance lane. Pick a lane, then read three lists: medicines that lane clears, medicines that block it (so others can build up), and medicines that speed it up (so others can wear off faster). Tap any medicine to put it on the desk.",
  estimate:
    "Teaching map for independent review — not a charting tool and not a dose. Product labeling and the prescriber govern.",
} as const;

/** Plain nickname plus an everyday blurb for each pathway. Same facts as before, fewer terms. */
export const ATLAS_ENZYME_PLAIN: Record<Enzyme, { nickname: string; blurb: string }> = {
  CYP1A2: {
    nickname: "The smoking-sensitive enzyme",
    blurb:
      "Daily smoking turns this pathway up. Medicines that lean on it (tizanidine, theophylline, clozapine, caffeine) can drop when someone lights up every day.",
  },
  CYP2B6: {
    nickname: "The bupropion and methadone enzyme",
    blurb:
      "Handles bupropion and part of methadone's clearance. Powerful speeders like efavirenz or rifampin can make the effect wear off.",
  },
  CYP2C8: {
    nickname: "The gemfibrozil enzyme",
    blurb:
      "Gemfibrozil is the classic hard blocker here; repaglinide is the medicine teaching maps use to show the build-up.",
  },
  CYP2C9: {
    nickname: "The warfarin enzyme",
    blurb:
      "Clears S-warfarin, phenytoin, and many anti-inflammatory pain pills (NSAIDs) and sulfonylurea diabetes pills. Fluconazole and amiodarone slow it. Someone already known to be a poor metabolizer on this pathway looks like they already have a hard blocker on board. That is a teaching summary of CPIC guidance, not a genetic test result.",
  },
  CYP2C19: {
    nickname: "The clopidogrel enzyme",
    blurb:
      "Switches on clopidogrel and clears many stomach-acid pills (PPIs) and citalopram. Fluvoxamine and fluconazole block it hard.",
  },
  CYP2D6: {
    nickname: "The codeine switch-on enzyme",
    blurb:
      "Other medicines usually cannot speed it up. Needed to switch on codeine or tamoxifen; blocked by paroxetine, fluoxetine, or bupropion.",
  },
  CYP2E1: {
    nickname: "The alcohol enzyme",
    blurb:
      "Regular alcohol can speed it up. A minor path that turns acetaminophen into a reactive, liver-harming leftover (NAPQI).",
  },
  CYP3A4: {
    nickname: "The busiest enzyme",
    blurb:
      "Clears about half of medicines. Hard blockers (azole antifungals, ritonavir, clarithromycin) and speeders (rifampin, carbamazepine) drive most collision maps.",
  },
  "P-gp": {
    nickname: "The push-back pump",
    blurb:
      "Not an enzyme but a pump (ABCB1) that pushes medicines back out — digoxin, dabigatran, colchicine, many newer blood thinners (DOACs). Often shares blockers and speeders with CYP3A4.",
  },
};

export type AtlasRole = "substrate" | "inhibitor" | "inducer";

/** Column copy: plain title, muted science term, hint, and a word tag instead of a letter code. */
export const ATLAS_COLUMN: Record<
  AtlasRole,
  { title: string; scientific: string; hint: string; tag: string }
> = {
  substrate: {
    title: "Cleared here",
    scientific: "Substrates",
    hint: "Medicines this pathway breaks down or switches on. A blocker on the same tray can make these build up.",
    tag: "cleared",
  },
  inhibitor: {
    title: "Blockers",
    scientific: "Inhibitors",
    hint: "Can make the medicines in the first list build up while they are around.",
    tag: "blocks",
  },
  inducer: {
    title: "Speeders",
    scientific: "Inducers",
    hint: "Can make those medicines wear off faster. Stopping a speeder can let levels climb back over the following weeks.",
    tag: "speeds",
  },
};

/** What the FDA index tag means, in one line. */
export const ATLAS_FDA_INDEX = {
  tag: "FDA index",
  gloss:
    "FDA index means FDA uses this medicine as a textbook example when studying interactions on this pathway. Untagged medicines still count.",
} as const;

/** Empty column: nothing mapped is not a green light. */
export const ATLAS_COLUMN_EMPTY =
  "Nothing mapped in this list yet. Empty is not a green light — this desk only knows a short teaching list, and the label and prescriber still govern.";

/** Footer under the columns. */
export const ATLAS_FOOTER =
  "Teaching map only — not a charting tool, not a stop order, and not a dose. Confirm against the Prescribing Information; the label and prescriber govern.";
