/**
 * Names a stored current label already contraindicates, that were not on the shelf.
 * No enzyme grade is stored. Not a dose. Not a therapeutic class. Not a new finding.
 */
import type { Drug, ItemKind, PdFlag } from "./types";

function d(
  id: string,
  name: string,
  brands: string[],
  cls: string,
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
    enzymes: [],
    pd,
    toxicityHint,
    note: extra?.note,
    kind: extra?.kind ?? "drug",
  };
}

const NOTE =
  "Named on a stored current label as contraindicated with another drug. No enzyme grade is stored. Not a milligram.";

export const LABEL_NAMED_SHELF: Drug[] = [
  d("cisapride", "cisapride", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("terfenadine", "terfenadine", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("astemizole", "astemizole", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("dirithromycin", "dirithromycin", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("troleandomycin", "troleandomycin", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("mesoridazine", "mesoridazine", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("sparfloxacin", "sparfloxacin", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("halofantrine", "halofantrine", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("pentamidine", "pentamidine", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("levomethadyl-acetate", "levomethadyl acetate", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("probucol", "probucol", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
];
