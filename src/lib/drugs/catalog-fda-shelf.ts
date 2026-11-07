/**
 * FDA Table 1 names that were not on the shelf.
 * Each role and grade is copied from that table. A row with no grade stays off.
 * One exception (2026-11-07, pending Kaleb's approval): indinavir and saquinavir
 * also carry a strong CYP3A4 inhibitor role. Table 1 lists them only as
 * sensitive 3A substrates (footnote 6, usually given with ritonavir) and grades
 * "indinavir and ritonavir" and "saquinavir and ritonavir" strong. The inhibitor
 * grade is the one victim labels give: Ranexa 7.1, Belsomra 7.2 and Brilinta 7.1
 * name indinavir and saquinavir among strong CYP3A inhibitors. See
 * docs/validation/hiv-booster-roles-2026-11-07.md.
 * Not a dose. Not a therapeutic class. Not a new finding.
 */
import type { Drug, Enzyme, EnzymeRole, ItemKind, PdFlag, Strength, SubstrateSensitivity } from "./types";
import { MARKET_STATUS } from "./catalog-label-names";

function sub(
  enzyme: Enzyme,
  sensitivity: SubstrateSensitivity,
  pathway: "clearance" | "activation" = "clearance",
): EnzymeRole {
  return { enzyme, kind: "substrate", sensitivity, pathway };
}

function inh(enzyme: Enzyme, strength: Strength): EnzymeRole {
  return { enzyme, kind: "inhibitor", strength };
}

function ind(enzyme: Enzyme, strength: Strength): EnzymeRole {
  return { enzyme, kind: "inducer", strength };
}

function d(
  id: string,
  name: string,
  brands: string[],
  cls: string,
  enzymes: EnzymeRole[],
  pd: PdFlag[],
  toxicityHint: string,
  extra?: { aliases?: string[]; note?: string; kind?: ItemKind },
): Drug {
  return {
    id,
    name,
    brands,
    cls,
    aliases: extra?.aliases ?? [],
    enzymes,
    pd,
    toxicityHint,
    note: extra?.note,
    kind: extra?.kind ?? "drug",
  };
}

const NOTE =
  "Enzyme role and grade are from FDA Table 1 (content current as of 2026-05-29), examples and not a full list, and not a milligram.";

/** Indinavir and saquinavir: substrate role from Table 1, strong 3A4 inhibitor role from victim labels. */
const PI_INHIBITOR_NOTE =
  "The sensitive CYP3A4 substrate role is from FDA Table 1 (content current as of 2026-05-29), which notes it is usually given with ritonavir. Table 1 does not grade this drug as an inhibitor on its own. It grades the ritonavir combination a strong 3A inhibitor. The strong CYP3A4 inhibitor role here is from victim labels (Ranexa, Belsomra and Brilinta) that name it among strong CYP3A inhibitors. Not a milligram.";
const PI_INHIBITOR_HINT = "Strong 3A4 inhibitor per victim labels; Table 1 lists it as a 3A victim. Not a dose.";

export const FDA_TABLE_SHELF: Drug[] = [
  d("diosmin", "diosmin", [], "FDA Table 1 example",
    [inh("CYP2C9", "weak")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("eliglustat", "eliglustat", [], "FDA Table 1 example",
    [sub("CYP2D6", "sensitive"), sub("CYP3A4", "major")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("elvitegravir-and-ritonavir", "elvitegravir and ritonavir", [], "FDA Table 1 example",
    [inh("CYP3A4", "strong")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("indinavir", "indinavir", [], "FDA Table 1 example",
    [sub("CYP3A4", "sensitive"), inh("CYP3A4", "strong")],
    [],
    PI_INHIBITOR_HINT,
    { note: PI_INHIBITOR_NOTE }),
  d("indinavir-and-ritonavir", "indinavir and ritonavir", [], "FDA Table 1 example",
    [inh("CYP3A4", "strong")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("leniolisib", "leniolisib", [], "FDA Table 1 example",
    [sub("CYP3A4", "major")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("lomitapide", "lomitapide", [], "FDA Table 1 example",
    [inh("CYP3A4", "weak"), sub("CYP3A4", "sensitive")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("lorcaserin", "lorcaserin", [], "FDA Table 1 example",
    [inh("CYP2D6", "moderate")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: `${MARKET_STATUS.lorcaserin} ${NOTE}` }),
  d("methoxsalen", "methoxsalen", [], "FDA Table 1 example",
    [inh("CYP1A2", "moderate")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("nelfinavir", "nelfinavir", [], "FDA Table 1 example",
    [inh("CYP3A4", "strong")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("paritaprevir-and-ritonavir-and-ombitasvir-and-or-dasabuvir", "paritaprevir and ritonavir and (ombitasvir and/or dasabuvir)", [], "FDA Table 1 example",
    [inh("CYP3A4", "strong")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("r-venlafaxine", "R-venlafaxine", [], "FDA Table 1 example",
    [sub("CYP2D6", "sensitive")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("s-mephenytoin", "S-mephenytoin", [], "FDA Table 1 example",
    [sub("CYP2C19", "sensitive")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("s-venlafaxine", "S-venlafaxine", [], "FDA Table 1 example",
    [sub("CYP2D6", "major")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("saquinavir", "saquinavir", [], "FDA Table 1 example",
    [sub("CYP3A4", "sensitive"), inh("CYP3A4", "strong")],
    [],
    PI_INHIBITOR_HINT,
    { note: PI_INHIBITOR_NOTE }),
  d("sevabertinib", "sevabertinib", [], "FDA Table 1 example",
    [inh("CYP3A4", "weak"), sub("CYP3A4", "major")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("taletrectinib", "taletrectinib", [], "FDA Table 1 example",
    [sub("CYP3A4", "major")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("tenofovir", "tenofovir", [], "FDA Table 1 example",
    [inh("CYP2B6", "weak")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("ticlopidine", "ticlopidine", [], "FDA Table 1 example",
    [inh("CYP2C19", "strong"), inh("CYP2B6", "weak")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("tipranavir-and-ritonavir", "tipranavir and ritonavir", [], "FDA Table 1 example",
    [inh("CYP3A4", "strong")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("tobacco-smoking", "tobacco (smoking)", [], "FDA Table 1 example",
    [ind("CYP1A2", "moderate")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("tolbutamide", "tolbutamide", [], "FDA Table 1 example",
    [sub("CYP2C9", "major")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
  d("trimethoprim", "trimethoprim", [], "FDA Table 1 example",
    [inh("CYP2C8", "weak")],
    [],
    "FDA Table 1 role only. Not a dose.",
    { note: NOTE }),
];
