/**
 * Perpetrator-label citations for PK rows whose perpetrator is not in FDA's
 * Table 1 (so `fda-ddi` cannot cite it). Quotes are verbatim substrings of the
 * current DailyMed SPL, retrieved via the openFDA label API on `retrieved`.
 * Educational tool, NOT FDA-cleared. No dosing.
 *
 * Honesty rule: a quote either states the contraindication for this exact
 * pair (`contraindicatedWith`) or only states the perpetrator's enzyme role.
 * In the second case the basis says the severity tier is the desk's rule.
 */
const DM = (setid: string) => `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`;

export interface PerpetratorLabel {
  /** Catalog ids of the perpetrator rows this label covers. */
  perpIds: readonly string[];
  brand: string;
  enzyme: string;
  role: "inhibitor" | "inducer";
  section: string;
  /** Verbatim role sentence. */
  roleQuote: string;
  /** Catalog ids of victims the label names as contraindicated, with the verbatim sentence. */
  contraindicatedWith?: { victimIds: readonly string[]; section: string; quote: string };
  url: string;
  labelEffective: string;
  retrieved: string;
}

export const PERPETRATOR_LABELS: readonly PerpetratorLabel[] = [
  {
    perpIds: ["mifepristone"],
    brand: "Korlym",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7.1 Drugs Metabolized by CYP3A",
    roleQuote:
      "Because KORLYM is an inhibitor of CYP3A, concurrent use of KORLYM with a drug whose metabolism is largely or solely mediated by CYP3A is likely to result in increased plasma concentrations of the drug.",
    contraindicatedWith: {
      // Only the drugs the label names. Fentanyl analogs, topical tacrolimus and
      // ophthalmic cyclosporine are deliberately excluded.
      victimIds: [
        "simvastatin", "simvastatin-ezetimibe", "lovastatin",
        "cyclosporine", "cyclosporine-modified", "cyclosporine-non-modified",
        "dihydroergotamine", "ergotamine", "fentanyl", "pimozide",
        "quinidine", "quinidine-gluconate", "sirolimus", "tacrolimus", "tacrolimus-xr",
      ],
      section: "4 Contraindications",
      quote:
        "KORLYM is contraindicated in: … Patients taking drugs metabolized by CYP3A such as simvastatin, lovastatin, and CYP3A substrates with narrow therapeutic ranges, such as cyclosporine, dihydroergotamine, ergotamine, fentanyl, pimozide, quinidine, sirolimus, and tacrolimus, due to an increased risk of adverse events.",
    },
    url: DM("542f3fae-8bc8-4f00-9228-e4b66c9ad6a9"),
    labelEffective: "2025-09-25",
    retrieved: "2026-09-27",
  },
  {
    perpIds: ["rifapentine"],
    brand: "Priftin",
    enzyme: "CYP3A4",
    role: "inducer",
    section: "7.4 Cytochrome P450 3A4 and 2C8/9",
    roleQuote: "Rifapentine is an inducer of cytochromes P450 3A4 and P450 2C8/9.",
    url: DM("3a64fb70-b85e-43d9-8bcd-7e893f568ae1"),
    labelEffective: "2026-02-06",
    retrieved: "2026-09-27",
  },
  {
    perpIds: ["fosphenytoin", "phenytoin-fosphenytoin"],
    brand: "Cerebyx",
    enzyme: "CYP3A4",
    role: "inducer",
    section: "7 Drug Interactions",
    roleQuote: "Phenytoin or CEREBYX is a potent inducer of hepatic drug-metabolizing enzymes.",
    url: DM("d4c36fad-0ba2-4cd4-9c5e-dcf843f38a5a"),
    labelEffective: "2025-08-28",
    retrieved: "2026-09-27",
  },
  {
    perpIds: ["darunavir"],
    brand: "Prezista",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7.1 Potential for PREZISTA/ritonavir to Affect Other Drugs",
    roleQuote: "PREZISTA co-administered with ritonavir is an inhibitor of CYP3A, CYP2D6, and P-gp.",
    url: DM("814301f9-c990-46a5-b481-2879a521a16f"),
    labelEffective: "2025-08-29",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["darunavir-cobicistat"],
    brand: "Prezcobix",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7.1 Potential for PREZCOBIX to Affect Other Drugs",
    roleQuote: "Darunavir co-administered with cobicistat is an inhibitor of CYP3A and CYP2D6.",
    url: DM("16ca460a-3c89-4697-8f45-972615a2a518"),
    labelEffective: "2024-01-02",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["darunavir-cobicistat-ftc-taf"],
    brand: "Symtuza",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7.2 Potential for SYMTUZA to Affect Other Drugs",
    roleQuote: "Darunavir co-administered with cobicistat is an inhibitor of CYP3A and CYP2D6.",
    url: DM("85a17d00-6b7c-41ea-a6b3-5ad924820dab"),
    labelEffective: "2026-04-17",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["atazanavir"],
    brand: "Reyataz",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7.1 Potential for REYATAZ to Affect Other Drugs",
    roleQuote: "Atazanavir is an inhibitor of CYP3A and UGT1A1.",
    url: DM("165cff62-b284-4a27-a65d-9ec8a5bfcdd8"),
    labelEffective: "2024-12-05",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["atazanavir-cobicistat"],
    brand: "Evotaz",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7.1 Potential for EVOTAZ to Affect Other Drugs",
    roleQuote: "Cobicistat is an inhibitor of CYP3A and CYP2D6.",
    url: DM("83db29d7-5d85-49d6-8cb6-740473365cf8"),
    labelEffective: "2025-05-12",
    retrieved: "2026-10-02",
  },
];
