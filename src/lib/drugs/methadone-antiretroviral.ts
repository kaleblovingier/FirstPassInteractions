/**
 * Methadone with a CYP3A4-inhibiting antiretroviral: which way the arrow points.
 *
 * The CYP3A4 inhibitor rule says a strong 3A4 inhibitor raises a major 3A4
 * substrate. For methadone and ritonavir-boosted protease inhibitors the
 * methadone label says the opposite (section 7, "Paradoxical Effects of
 * Antiretroviral Agents on Methadone Hydrochloride Tablets"). Every row listed
 * here (each carries a CYP3A4 inhibitor role; the test checks) therefore gets
 * no CYP3A4 "higher methadone" card with methadone, and no CYP clock or CYP3A4
 * phenoconversion line that names methadone as the 3A4 victim. Instead:
 *
 * - `falls`: the saved methadone label names this regimen among those that
 *   lowered methadone. The pair shows the `pd-methadone-ritonavir` card
 *   ("methadone may fall / withdrawal").
 * - `unsettled`: no saved source gives the direction (cobicistat products,
 *   unboosted indinavir and atazanavir rows, ritonavir combinations the label
 *   does not name). The pair shows a neutral `pd-methadone-arv-unsettled` card
 *   (Use care) and no rise or fall card.
 *
 * Source: Methadone HCl tablets SPL 540edd43-165d-4257-b989-3bccc8f54afb,
 * section 7, as saved in scripts/fixtures/label-drift-spl.json (retrieved
 * 2026-10-28). The quotes below are verbatim substrings of that text; the test
 * checks them. Standalone cobicistat (Tybost) is not listed here: its card and
 * desk copy are unchanged.
 *
 * Educational reference only. Not FDA-cleared. No doses.
 */

export const METHADONE_LABEL_SETID = "540edd43-165d-4257-b989-3bccc8f54afb";
export const METHADONE_ARV_SECTION =
  "7 DRUG INTERACTIONS (Paradoxical Effects of Antiretroviral Agents on Methadone Hydrochloride Tablets)";

/** The label sentence that names the antiretrovirals that lowered methadone. */
export const METHADONE_ARV_QUOTE =
  "Concurrent use of certain antiretroviral agents with CYP3A4 inhibitory activity, alone and in combination, such as abacavir, amprenavir, darunavir+ritonavir, efavirenz, nelfinavir, nevirapine, ritonavir, telaprevir, lopinavir+ritonavir, saquinavir+ritonavir, and tipranavir+ritonavir, has resulted in increased clearance or decreased plasma levels of methadone.";
export const METHADONE_ARV_FALL = "has resulted in increased clearance or decreased plasma levels of methadone";
export const METHADONE_ARV_WITHDRAWAL = "could precipitate a withdrawal syndrome";
/** Section 7 highlights line on antiretrovirals in general. */
export const METHADONE_ARV_HIGHLIGHT =
  "May result in decreased efficacy or, in certain cases, increased toxicity.";

export type MethadoneArvArrow = "falls" | "unsettled";

export interface MethadoneArvRow {
  arrow: MethadoneArvArrow;
  /** The label's own words for this regimen in METHADONE_ARV_QUOTE (falls rows only). */
  labelName?: string;
  /** One or two plain sentences: what the saved sources say about this row. */
  why: string;
}

const COBI =
  "Cobicistat-boosted. The methadone label does not name cobicistat or this regimen (it names darunavir+ritonavir, not darunavir with cobicistat).";

/** Catalog ids of CYP3A4-inhibiting antiretroviral rows, with the methadone arrow the saved sources support. */
export const METHADONE_ARV: Readonly<Record<string, MethadoneArvRow>> = {
  ritonavir: {
    arrow: "falls",
    labelName: "ritonavir",
    why: "The methadone label names ritonavir.",
  },
  paxlovid: {
    arrow: "falls",
    why: "Nirmatrelvir with ritonavir. The methadone label names ritonavir, not Paxlovid. Card unchanged from main.",
  },
  lopinavir: {
    arrow: "falls",
    labelName: "lopinavir+ritonavir",
    why: "The Kaletra row is lopinavir with ritonavir, which the methadone label names.",
  },
  darunavir: {
    arrow: "falls",
    labelName: "darunavir+ritonavir",
    why: "The Prezista row is graded as the boosted regimen. The methadone label names darunavir with ritonavir. It does not name darunavir with cobicistat (Prezcobix, Symtuza).",
  },
  saquinavir: {
    arrow: "falls",
    labelName: "saquinavir+ritonavir",
    why: "FDA Table 1 footnote 6: saquinavir is usually given with ritonavir. The methadone label names saquinavir with ritonavir.",
  },
  tipranavir: {
    arrow: "falls",
    labelName: "tipranavir+ritonavir",
    why: "The Aptivus row is graded as the ritonavir-boosted regimen. The methadone label names tipranavir with ritonavir.",
  },
  "tipranavir-and-ritonavir": {
    arrow: "falls",
    labelName: "tipranavir+ritonavir",
    why: "The methadone label names tipranavir with ritonavir.",
  },
  nelfinavir: {
    arrow: "falls",
    labelName: "nelfinavir",
    why: "The methadone label names nelfinavir on its own (no ritonavir).",
  },
  atazanavir: {
    arrow: "unsettled",
    why: "The Reyataz row is graded as boosted. The methadone label does not name atazanavir, and the saved Reyataz label text (section 4) does not mention methadone.",
  },
  indinavir: {
    arrow: "unsettled",
    why: "The methadone label does not name indinavir. No saved Crixivan label.",
  },
  "indinavir-and-ritonavir": {
    arrow: "unsettled",
    why: "Contains ritonavir, which the methadone label names, but the label does not name indinavir with ritonavir.",
  },
  "elvitegravir-and-ritonavir": {
    arrow: "unsettled",
    why: "Contains ritonavir, which the methadone label names, but the label does not name elvitegravir with ritonavir.",
  },
  "paritaprevir-and-ritonavir-and-ombitasvir-and-or-dasabuvir": {
    arrow: "unsettled",
    why: "Hepatitis C regimen. Contains ritonavir, which the methadone label names, but the label does not name this regimen.",
  },
  "darunavir-cobicistat": {
    arrow: "unsettled",
    why: `${COBI} The saved Prezcobix label text (section 4) does not mention methadone.`,
  },
  "darunavir-cobicistat-ftc-taf": {
    arrow: "unsettled",
    why: `${COBI} No saved Symtuza label.`,
  },
  "atazanavir-cobicistat": {
    arrow: "unsettled",
    why: "Cobicistat-boosted. The methadone label does not name atazanavir or cobicistat, and the saved Evotaz label text (section 4) does not mention methadone.",
  },
  "elvitegravir-cobicistat-ftc-taf": {
    arrow: "unsettled",
    why: "Cobicistat-boosted elvitegravir. The methadone label does not name elvitegravir or cobicistat. No saved Genvoya label.",
  },
  "elvitegravir-cobicistat-ftc-tdf": {
    arrow: "unsettled",
    why: "Cobicistat-boosted elvitegravir. The methadone label does not name elvitegravir or cobicistat. No saved Stribild label.",
  },
};

/** The antiretroviral row in a methadone pair, if the pair is one this file covers. */
export function methadoneArvPartner(aId: string, bId: string): { id: string; row: MethadoneArvRow } | undefined {
  const other = aId === "methadone" ? bId : bId === "methadone" ? aId : undefined;
  if (!other) return undefined;
  const row = METHADONE_ARV[other];
  return row ? { id: other, row } : undefined;
}

/**
 * True when methadone should not be scored as a CYP3A4 victim of this
 * perpetrator (no rise card, no clock or phenoconversion line naming it).
 */
export function skipMethadone3A4Victim(perpId: string, victimId: string): boolean {
  return victimId === "methadone" && Boolean(METHADONE_ARV[perpId]);
}
