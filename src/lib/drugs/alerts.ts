/**
 * ISMP high-alert, NIOSH hazardous, and REMS teaching flags.
 * Paraphrase of public lists — open the source. Not a complete inventory.
 */

export type AlertKind = "ismp" | "niosh" | "rems";

export interface AlertFlag {
  kind: AlertKind;
  label: string;
  note: string;
}

const ISMP = new Set([
  "methadone",
  "fentanyl",
  "morphine",
  "hydromorphone",
  "oxycodone",
  "oxymorphone",
  "hydrocodone",
  "buprenorphine",
  "insulin-glargine",
  "insulin-aspart",
  "insulin-lispro",
  "insulin-regular",
  "insulin-detemir",
  "insulin-degludec",
  "insulin-nph",
  "vancomycin",
  "warfarin",
  "apixaban",
  "rivaroxaban",
  "dabigatran",
  "enoxaparin",
  "methotrexate",
  "digoxin",
  "lithium",
  "clozapine",
  "propofol",
  "midazolam",
  "ketamine",
  "esketamine",
  "amiodarone",
  "sotalol",
  "naloxone",
  "potassium",
]);

const NIOSH = new Set([
  "methotrexate",
  "valproate",
  "carbamazepine",
  "phenytoin",
  "spironolactone",
  "fluconazole",
  "risperidone",
  "paroxetine",
  "fluoxetine",
  "colchicine",
  "azathioprine",
  "mercaptopurine",
  "sirolimus",
  "tacrolimus",
  "cyclosporine",
  "mycophenolate",
  "capecitabine",
  "fluorouracil",
  "imatinib",
  "ibrutinib",
  "voclosporin",
  "lenalidomide",
  "thalidomide",
  "isotretinoin",
  "tamoxifen",
]);

const REMS: Record<string, string> = {
  clozapine: "Clozapine REMS — ANC before dispense. Benzodiazepines are the respiratory-collapse row, not the REMS form.",
  esketamine: "Spravato REMS — healthcare setting, 2-hour watch, no driving.",
  buprenorphine: "MOUD buprenorphine is no longer X-waiver; some film / implant products still carry REMS paperwork.",
  lenalidomide: "Revlimid REMS — embryo-fetal toxicity. Open the program. This desk is not a pregnancy test.",
  thalidomide: "Thalomid REMS — embryo-fetal toxicity. Open the program.",
  isotretinoin: "iPLEDGE REMS — embryo-fetal toxicity. This desk is not a pregnancy test.",
};

export function alertsFor(id: string): AlertFlag[] {
  const out: AlertFlag[] = [];
  if (ISMP.has(id) || id.startsWith("insulin-")) {
    out.push({
      kind: "ismp",
      label: "On ISMP's high-alert list (see ismp.org)",
      note: "When an error happens with this drug, the harm tends to be severe. Independent double-check culture, not a CYP finding.",
    });
  }
  if (NIOSH.has(id)) {
    out.push({
      kind: "niosh",
      label: "NIOSH hazardous",
      note: "Occupational handling — crush, split, and compounding PPE. Not a patient counseling point by itself.",
    });
  }
  if (REMS[id]) {
    out.push({
      kind: "rems",
      label: "REMS",
      note: REMS[id],
    });
  }
  return out;
}

export function alertsOnDesk(ids: string[]): Array<{ id: string; flags: AlertFlag[] }> {
  return ids
    .map((id) => ({ id, flags: alertsFor(id) }))
    .filter((row) => row.flags.length > 0);
}

export function hasAlerts(ids: string[]) {
  return alertsOnDesk(ids).length > 0;
}
