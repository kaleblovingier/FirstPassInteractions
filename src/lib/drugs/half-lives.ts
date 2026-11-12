/**
 * Typical adult elimination half-lives for catalog ids that have no row on the PK shelf (pk.ts).
 * Read only by the timing sketch in overlap.ts. Nothing here changes a severity or a PK curve.
 *
 * Every row names where its number came from: the FDA label's clinical pharmacology text, read
 * through OpenFDA on 2026-11-12, or a PubMed abstract read the same day. The comment above each row
 * quotes the sentence. Rules for the number:
 * - the label's typical value when it states one;
 * - otherwise the top of the stated range, so the sketch never understates what is left;
 * - when formulations differ, the longest stated value, since the desk does not know which was taken.
 */

export interface HalfLifeRow {
  /** Typical adult elimination half-life, in hours. */
  hours: number;
  /** Where the number came from: a label section or a PubMed id. */
  source: string;
}

const LABEL = "FDA label, clinical pharmacology";

/** Keyed by catalog id. The PK shelf wins when both have a row. */
export const HALF_LIVES: Record<string, HalfLifeRow> = {
  // "The average terminal elimination half-life of plasma sertraline is about 26 hours."
  // set_id 00179766-980b-44b0-99d3-1fee2bb27e37 (2019-11-01)
  sertraline: { hours: 26, source: LABEL },
  // "...a mean terminal half-life of about 27-32 hours." set_id 0458445b-e431-4c82-86b8-90373813c10a
  escitalopram: { hours: 32, source: `${LABEL}: 27 to 32 hours; the top is used` },
  // "The mean elimination half-life is approximately 21 hours (CV 32%)..."
  // set_id 009d8b89-eab9-43ba-b077-86bfa993a745 (2026-07-08)
  paroxetine: { hours: 21, source: LABEL },
  // "Duloxetine has an elimination half-life of about 12 hours (range 8 to 17 hours)..."
  // set_id 00628e5e-4c5b-2573-e063-6294a90a0e3b (2026-08-20)
  duloxetine: { hours: 12, source: `${LABEL}: about 12 hours, range 8 to 17` },
  // "Mirtazapine has a half-life of about 20 to 40 hours following oral administration..."
  // set_id 0f19ab40-1a30-4ac2-9bd7-c2f8199e29e1 (2022-08-01)
  mirtazapine: { hours: 40, source: `${LABEL}: 20 to 40 hours; the top is used` },
  // "The mean elimination half-life for d-amphetamine is 10 hours in adults..." / "For the
  // l-amphetamine, the mean elimination half-life in adults is 13 hours..."
  // mixed amphetamine salts, set_id 084c625c-94c6-4c8a-ba5f-6e26206dd903 (2026-06-18)
  amphetamine: { hours: 13, source: `${LABEL}: d-amphetamine 10 hours, l-amphetamine 13; the longer is used` },
  // "The biological half-life has been reported in the range of 4 to 5 hours."
  // set_id 90c02ac6-e5e2-4c97-8c68-81e4e389a195 (2024-09-30)
  methamphetamine: { hours: 5, source: `${LABEL}: 4 to 5 hours; the top is used` },
  // "...extended-release capsules (t1/2=6.8 hours) is longer than ... immediate-release tablets
  // (t1/2=2.9 hours)..." set_id 10aa0dc0-bd0e-4927-a19a-8722d78ad67d (2026-05-27)
  methylphenidate: {
    hours: 6.8,
    source: `${LABEL}: 2.9 hours immediate release, 6.8 extended release; the longer is used`,
  },
  // "The effective terminal half-life of morphine sulfate after IV administration is reported to be
  // approximately 2 hours." set_id 07593aa4-f2c4-4d6e-b186-ab2a4ecaa38a (2025-10-10)
  morphine: { hours: 2, source: `${LABEL}: effective half-life about 2 hours` },
  // "The terminal elimination half-life of hydromorphone after an intravenous dose is about 2.3 hours."
  // set_id 18f6f54e-1537-4181-9d07-54ddf881a9ee (2025-12-04)
  hydromorphone: { hours: 2.3, source: LABEL },
  // "Half-life ranges from approximately 9-11 hours after a single oral dose (5-40 mg)."
  // set_id 06af7dff-c261-4c03-9cd9-0605c42507fa (2025-08-18)
  oxymorphone: { hours: 11, source: `${LABEL}: 9 to 11 hours; the top is used` },
  // "The terminal half-life is on average 5 hours after oral administration."
  // set_id 38de863e-56ff-4c43-9ab8-9b3e1ba82858 (2026-02-26)
  tapentadol: { hours: 5, source: LABEL },
  // "The elimination half-life of clonazepam is typically 30 to 40 hours."
  // set_id 00f323c0-e007-40df-ae7f-e6b3c7ba0aa8 (2026-03-16)
  clonazepam: { hours: 40, source: `${LABEL}: 30 to 40 hours; the top is used` },
  // "The mean half-life of unconjugated lorazepam in human plasma is about 12 hours..."
  // set_id 00960fbd-a5da-408b-9867-62982f20906f (2025-07-24)
  lorazepam: { hours: 12, source: LABEL },
  // "...the terminal half-life from 3.5 to 18.4 hours (mean 8.8 hours)..."
  // set_id 066e25b2-8a1b-4b08-b585-ce36753bf104 (2024-12-11)
  temazepam: { hours: 8.8, source: `${LABEL}: mean 8.8 hours, range 3.5 to 18.4` },
  // "Gabapentin elimination half-life is 5 to 7 hours and is unaltered by dose..."
  // set_id 01b810b7-f4c8-4412-bbc5-b9220d8770d8 (2024-04-02)
  gabapentin: {
    hours: 7,
    source: `${LABEL}: 5 to 7 hours with normal kidney function; the top is used`,
  },
  // "...a mean elimination half-life of 6.3 hours in subjects with normal renal function."
  // set_id 0101cd1f-4a95-40e9-86a8-ccde8d656e3d (2025-09-23)
  pregabalin: { hours: 6.3, source: `${LABEL}: with normal kidney function` },
  // "The elimination half-life of lithium is approximately 18 to 36 hours."
  // set_id 01c4facd-ed79-4078-ba33-2044de372d0f (2026-04-27)
  lithium: { hours: 36, source: `${LABEL}: 18 to 36 hours; the top is used` },
  // "GHB has an elimination half-life of 0.5 to 1 hour."
  // sodium oxybate (Lumryz), set_id 10e5e40c-52f3-4c73-8a34-2c29c690a934 (2026-09-08)
  "sodium-oxybate": { hours: 1, source: `${LABEL}: 0.5 to 1 hour; the top is used` },
  // "...an effective half-life of 18 hours (range 8 to 37 hours; n = 18)..."
  // set_id 00b20a8c-debd-e930-e063-6394a90a7ed0 (2026-05-20)
  cyclobenzaprine: { hours: 18, source: `${LABEL}: effective half-life 18 hours, range 8 to 37` },
  // "Elimination half-lives were 3.7 h (3.4-4.1) and 4.0 h (3.6-4.4), for 85 and 170 μg LSD"
  lsd: { hours: 4, source: "PMID 37596682: 3.7 and 4.0 hours at two doses; the longer is used" },
  // "Elimination half-life varied across studies, ranging from 1.5 to 4 h." (systematic review)
  psilocybin: { hours: 4, source: "PMID 40284409: 1.5 to 4 hours across studies; the top is used" },
};

const MAOI_NOTE =
  "Irreversible MAO inhibition outlasts the drug itself, so the label's washout clock on the check governs, not this sketch.";

/**
 * Ids where one half-life would mislead, with the sentence the sketch shows instead. These get no
 * share-left bar and no percent.
 */
export const NO_SINGLE_HALF_LIFE: Record<string, string> = {
  ethanol:
    "Ethanol is cleared at a roughly fixed amount per hour, not a fixed share, so a half-life sketch would mislead.",
  heroin:
    "Heroin is turned into 6-MAM and then morphine, which carry most of its effect, so its own half-life would understate what is left.",
  // "The mean elimination half-life (T 1/2) values for naltrexone and 6-β-naltrexol are 4 hours and
  // 13 hours, respectively." set_id 00c04ff4-b6f2-466c-9ab9-813a60577db0 (2023-12-15)
  naltrexone:
    "Its active metabolite, 6-beta-naltrexol, outlasts it (13 versus 4 hours on the label), so the parent half-life would understate what is left.",
  phenelzine: MAOI_NOTE,
  tranylcypromine: MAOI_NOTE,
  isocarboxazid: MAOI_NOTE,
};
