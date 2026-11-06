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

/** FDA Safety Communication on Andexxa, December 18, 2025. */
export const ANDEXXA_FDA_URL =
  "https://www.fda.gov/safety/medical-product-safety-information/update-safety-andexxa-astrazeneca-fda-safety-communication";

/** Andexxa's US status, quoted from that communication. */
export const ANDEXXA_US_STATUS =
  'No longer sold in the US. FDA safety communication, December 18, 2025: the FDA "considers the risks of the product to outweigh its benefits", and Andexxa "will no longer be manufactured for or sold in the U.S. by AstraZeneca after December 22, 2025."';

/** Where Andexxa was the lead specific antidote. Deliberately names no replacement agent. */
export const ANDEXXA_REVERSAL_NOTE =
  "No longer sold in the US (FDA safety communication, December 18, 2025). Reversal follows the institution's protocol and the Prescribing Information.";

/** US market status for shelf rows that are no longer sold normally. Not a dose. */
export const MARKET_STATUS: Record<string, string> = {
  "andexanet-alfa": `${ANDEXXA_US_STATUS} ${ANDEXXA_FDA_URL}`,
  terfenadine: "Withdrawn from the US market; shown only because a current label still names it.",
  astemizole: "Withdrawn from the US market; shown only because a current label still names it.",
  cisapride:
    "Removed from general US sale in 2000; available only through a limited-access program. Shown because a current label still names it.",
  // Sources fetched 2026-11-04. Ranitidine is absent on purpose: FDA approved reformulated ranitidine tablets on 2025-11-24.
  voxelotor:
    'Withdrawn from the market. FDA alert, September 26, 2024: Oxbryta (voxelotor) "is being voluntarily withdrawn from the market by the manufacturer due to safety concerns", and "Health care professionals should stop prescribing Oxbryta." https://www.fda.gov/drugs/drug-alerts-and-statements/fda-alerting-patients-and-health-care-professionals-about-voluntary-withdrawal-oxbryta-market-due',
  lorcaserin:
    'Withdrawn from the US market. FDA drug safety communication, February 13, 2020: the FDA "has requested that the manufacturer of Belviq, Belviq XR (lorcaserin) voluntarily withdraw the weight-loss drug from the U.S. market because a safety clinical trial shows an increased occurrence of cancer." https://www.fda.gov/drugs/drug-safety-communications/fda-requests-withdrawal-weight-loss-drug-belviq-belviq-xr-lorcaserin-market',
  tegaserod:
    'Discontinued in the US. Drugs@FDA lists both Zelnorm (tegaserod maleate) tablet strengths, NDA 021200, with marketing status "Discontinued". https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=021200',
};
const withStatus = (id: string) => (MARKET_STATUS[id] ? `${MARKET_STATUS[id]} ${NOTE}` : NOTE);

export const LABEL_NAMED_SHELF: Drug[] = [
  d("cisapride", "cisapride", [], "Named on a stored label", [], "Name only. Not a dose.", { note: withStatus("cisapride") }),
  d("terfenadine", "terfenadine", [], "Named on a stored label", [], "Name only. Not a dose.", { note: withStatus("terfenadine") }),
  d("astemizole", "astemizole", [], "Named on a stored label", [], "Name only. Not a dose.", { note: withStatus("astemizole") }),
  d("dirithromycin", "dirithromycin", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("troleandomycin", "troleandomycin", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("mesoridazine", "mesoridazine", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("sparfloxacin", "sparfloxacin", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("halofantrine", "halofantrine", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("pentamidine", "pentamidine", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("levomethadyl-acetate", "levomethadyl acetate", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
  d("probucol", "probucol", [], "Named on a stored label", [], "Name only. Not a dose.", { note: NOTE }),
];
