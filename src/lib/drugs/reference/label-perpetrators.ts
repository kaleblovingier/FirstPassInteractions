/**
 * Perpetrator-label citations. A named contraindication still quotes the label
 * when FDA Table 1 already grades the enzyme role. A role-only line is for
 * perpetrators Table 1 does not cite. Quotes are verbatim substrings of the
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
  /** More named-contraindication quotes, each covering its own victim ids. */
  contraindicatedGroups?: readonly { victimIds: readonly string[]; section: string; quote: string }[];
  /**
   * Catalog ids that appear in the contraindications section but are not quoted here
   * (inducers, or a conditional such as colchicine only with renal or hepatic impairment).
   * The role line stays off, so it cannot call the tier a desk rule.
   */
  alsoNamed?: readonly string[];
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
  {
    perpIds: ["paxlovid"],
    brand: "Paxlovid",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7.1 Potential for PAXLOVID to Affect Other Drugs",
    roleQuote:
      "PAXLOVID (nirmatrelvir co-packaged with ritonavir) is a strong inhibitor of CYP3A, and an inhibitor of CYP2D6, P-gp and OATP1B1.",
    contraindicatedGroups: [
      { victimIds: ["lovastatin", "simvastatin"], section: "4 Contraindications", quote: "HMG-CoA reductase inhibitors: lovastatin, simvastatin" },
      { victimIds: ["triazolam", "midazolam"], section: "4 Contraindications", quote: "Sedative/hypnotics: triazolam, oral midazolam" },
      { victimIds: ["alfuzosin"], section: "4 Contraindications", quote: "Alpha 1-adrenoreceptor antagonist: alfuzosin" },
      { victimIds: ["ranolazine"], section: "4 Contraindications", quote: "Antianginal: ranolazine" },
      { victimIds: ["lurasidone", "pimozide"], section: "4 Contraindications", quote: "Antipsychotics: lurasidone, pimozide" },
      { victimIds: ["naloxegol"], section: "4 Contraindications", quote: "Opioid antagonists: naloxegol" },
      { victimIds: ["eletriptan", "ubrogepant"], section: "4 Contraindications", quote: "Migraine medications: eletriptan, ubrogepant" },
      { victimIds: ["sildenafil-pah"], section: "4 Contraindications", quote: "PDE5 inhibitor: sildenafil (Revatio ® ) when used for pulmonary arterial hypertension (PAH)" },
      { victimIds: ["amiodarone", "dronedarone", "flecainide", "propafenone", "quinidine"], section: "4 Contraindications", quote: "Antiarrhythmic: amiodarone, dronedarone, flecainide, propafenone, quinidine" },
      { victimIds: ["dihydroergotamine", "ergotamine", "methylergonovine"], section: "4 Contraindications", quote: "Ergot derivatives: dihydroergotamine, ergotamine, methylergonovine" },
      { victimIds: ["eplerenone", "ivabradine"], section: "4 Contraindications", quote: "Cardiovascular agents: eplerenone, ivabradine" },
      { victimIds: ["finerenone"], section: "4 Contraindications", quote: "Mineralocorticoid receptor antagonists: finerenone" },
      { victimIds: ["tolvaptan"], section: "4 Contraindications", quote: "Vasopressin receptor antagonists: tolvaptan" },
    ],
    alsoNamed: [
      "rifampin", "carbamazepine", "phenytoin", "phenobarbital", "primidone", "rifapentine",
      "st-johns-wort", "enzalutamide", "apalutamide", "colchicine", "silodosin", "voclosporin", "suzetrigine",
    ],
    url: DM("8a99d6d6-fd9e-45bb-b1bf-48c7f761232a"),
    labelEffective: "2026-02-19",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["lopinavir"],
    brand: "Kaletra",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7.1 Potential for KALETRA to Affect Other Drugs",
    roleQuote:
      "Lopinavir/ritonavir is an inhibitor of CYP3A and may increase plasma concentrations of agents that are primarily metabolized by CYP3A.",
    contraindicatedGroups: [
      { victimIds: ["lovastatin", "simvastatin"], section: "4 Contraindications", quote: "HMG-CoA Reductase Inhibitors: lovastatin, simvastatin" },
      { victimIds: ["triazolam", "midazolam"], section: "4 Contraindications", quote: "Sedative/Hypnotics: triazolam, orally administered midazolam" },
      { victimIds: ["alfuzosin"], section: "4 Contraindications", quote: "Alpha 1- Adrenoreceptor Antagonist: alfuzosin" },
      { victimIds: ["ranolazine"], section: "4 Contraindications", quote: "Antianginal: ranolazine" },
      { victimIds: ["lurasidone", "pimozide"], section: "4 Contraindications", quote: "Antipsychotics: lurasidone, pimozide" },
      { victimIds: ["colchicine"], section: "4 Contraindications", quote: "Anti-gout: colchicine" },
      { victimIds: ["dronedarone"], section: "4 Contraindications", quote: "Antiarrhythmic: dronedarone" },
      { victimIds: ["dihydroergotamine", "ergotamine", "methylergonovine"], section: "4 Contraindications", quote: "Ergot Derivatives: dihydroergotamine, ergotamine, methylergonovine" },
      { victimIds: ["sildenafil-pah"], section: "4 Contraindications", quote: "PDE5 Inhibitor: sildenafil (Revatio ® ) when used for the treatment of pulmonary arterial hypertension" },
      { victimIds: ["grazoprevir-elbasvir"], section: "4 Contraindications", quote: "Hepatitis C direct acting antiviral: elbasvir/grazoprevir" },
    ],
    alsoNamed: ["rifampin", "st-johns-wort", "apalutamide", "suzetrigine"],
    url: DM("8290add3-4449-4e58-6c97-8fe1eec972e3"),
    labelEffective: "2026-07-23",
    retrieved: "2026-10-02",
  },

  {
    perpIds: ["nefazodone"],
    brand: "Nefazodone",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "Drug Interactions",
    roleQuote: "These effects appear to be due to the inhibition of CYP3A4 by nefazodone",
    contraindicatedGroups: [
      {
        victimIds: ["pimozide", "carbamazepine"],
        section: "Contraindications",
        quote: "Coadministration of terfenadine, astemizole, cisapride, pimozide, or carbamazepine with nefazodone hydrochloride is contraindicated",
      },
    ],
    // Triazolam is "should be avoided," not listed as contraindicated.
    alsoNamed: ["triazolam"],
    url: DM("0bd4c34a-4f43-4c84-8b98-1d074cba97d5"),
    labelEffective: "2025-09-04",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["rifampin"],
    brand: "Rifampin",
    enzyme: "CYP3A4",
    role: "inducer",
    section: "Drug Interactions",
    roleQuote: "Avoid the use of rifampin, a strong CYP3A4 inducer, if possible.",
    contraindicatedGroups: [
      {
        victimIds: ["atazanavir", "atazanavir-cobicistat", "darunavir", "darunavir-cobicistat", "cabotegravir", "fostemsavir", "lenacapavir"],
        section: "Contraindications",
        quote: "Rifampin is contraindicated in patients who are also receiving atazanavir, darunavir, fosamprenavir, saquinavir, tipranavir, cabotegravir, fostemsavir and lenacapavir (see prescribing information for SUNLENCA ® ) due to the potential of rifampin to substantially decrease plasma concentrations of these antiviral drugs, which may result in decreased antiviral efficacy and/or development of viral resistance.",
      },
      { victimIds: ["lurasidone"], section: "Contraindications", quote: "Rifampin is contraindicated in patients receiving lurasidone." },
      { victimIds: ["praziquantel"], section: "Contraindications", quote: "Rifampin is contraindicated in patients receiving praziquantel since therapeutically effective blood levels of praziquantel may not be achieved." },
    ],
    url: DM("8be91604-d7cd-4f2b-997d-e3364e4092e5"),
    labelEffective: "2026-05-05",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["clarithromycin"],
    brand: "Clarithromycin",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7 Drug Interactions",
    roleQuote:
      "Co-administration of clarithromycin is known to inhibit CYP3A, and a drug primarily metabolized by CYP3A may be associated with elevations in drug concentrations that could increase or prolong both therapeutic and adverse effects of the concomitant drug.",
    contraindicatedGroups: [
      { victimIds: ["pimozide"], section: "4 Contraindications", quote: "Concomitant administration of clarithromycin tablets with cisapride and pimozide is contraindicated" },
      { victimIds: ["lovastatin", "simvastatin", "simvastatin-ezetimibe"], section: "4 Contraindications", quote: "Concomitant administration of clarithromycin tablets with HMG-CoA reductase inhibitors (statins) that are extensively metabolized by CYP3A4 (lovastatin or simvastatin) is contraindicated, due to the increased risk of myopathy, including rhabdomyolysis" },
      { victimIds: ["ergotamine", "dihydroergotamine"], section: "4 Contraindications", quote: "Concomitant administration of clarithromycin and ergotamine or dihydroergotamine is contraindicated" },
      { victimIds: ["lurasidone"], section: "4 Contraindications", quote: "and lurasidone is contraindicated since it may result in an increase in lurasidone exposure and the potential for serious adverse reactions" },
    ],
    alsoNamed: ["colchicine"],
    url: DM("9d5848f0-e9f0-4112-a7ca-bcc8ea2e69c6"),
    labelEffective: "2026-06-24",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["itraconazole"],
    brand: "Itraconazole",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "Drug Interactions",
    roleQuote: "Itraconazole and its major metabolite, hydroxy-itraconazole, are potent CYP3A4 inhibitors.",
    contraindicatedGroups: [
      {
        victimIds: [
          "methadone", "disopyramide", "dofetilide", "dronedarone", "quinidine", "quinidine-gluconate", "isavuconazole",
          "dihydroergotamine", "ergotamine", "methylergonovine", "irinotecan", "lurasidone", "midazolam", "pimozide",
          "triazolam", "felodipine", "nisoldipine", "ivabradine", "ranolazine", "eplerenone", "naloxegol",
          "lovastatin", "simvastatin", "simvastatin-ezetimibe", "avanafil", "ticagrelor", "finerenone", "voclosporin",
        ],
        section: "Contraindications",
        quote:
          "Coadministration of a number of CYP3A4 substrates are contraindicated with itraconazole. Some examples of drugs for which plasma concentrations increase are: methadone, disopyramide, dofetilide, dronedarone, quinidine, isavuconazole, ergot alkaloids (such as dihydroergotamine, ergometrine (ergonovine), ergotamine, methylergometrine (methylergonovine)), irinotecan, lurasidone, oral midazolam, pimozide, triazolam, felodipine, nisoldipine, ivabradine, ranolazine, eplerenone, cisapride, naloxegol, lomitapide, lovastatin, simvastatin, avanafil, ticagrelor, finerenone, voclosporin.",
      },
    ],
    alsoNamed: ["venetoclax", "colchicine"],
    url: DM("6df5ff94-47ba-4881-abb4-b321e35a6955"),
    labelEffective: "2026-08-18",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["posaconazole"],
    brand: "Posaconazole",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7.2 Effects of Posaconazole on Other Drugs",
    roleQuote: "Posaconazole is a strong CYP3A4 inhibitor.",
    contraindicatedGroups: [
      { victimIds: ["sirolimus"], section: "4 Contraindications", quote: "Posaconazole delayed-release tablets are contraindicated with sirolimus." },
      { victimIds: ["pimozide", "quinidine", "quinidine-gluconate"], section: "4 Contraindications", quote: "Concomitant administration of posaconazole delayed-release tablets with the CYP3A4 substrates, pimozide and quinidine may result in increased plasma concentrations of these drugs, leading to QTc prolongation and cases of torsades de pointes" },
      { victimIds: ["atorvastatin", "lovastatin", "simvastatin", "simvastatin-ezetimibe"], section: "4 Contraindications", quote: "Coadministration with the HMG-CoA reductase inhibitors that are primarily metabolized through CYP3A4 (e.g., atorvastatin, lovastatin, and simvastatin) is contraindicated since increased plasma concentration of these drugs can lead to rhabdomyolysis" },
      { victimIds: ["ergotamine", "dihydroergotamine"], section: "4 Contraindications", quote: "Posaconazole delayed-release tablets may increase the plasma concentrations of ergot alkaloids (ergotamine and dihydroergotamine) which may lead to ergotism" },
    ],
    alsoNamed: ["venetoclax"],
    url: DM("f8a26673-261c-4e8e-b1e1-9e23aaf7f285"),
    labelEffective: "2026-08-03",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["ritonavir"],
    brand: "Norvir",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7.1 Potential for NORVIR to Affect Other Drugs",
    roleQuote:
      "Ritonavir is an inhibitor of cytochrome P450 3A (CYP3A) and may increase plasma concentrations of agents that are primarily metabolized by CYP3A.",
    contraindicatedGroups: [
      { victimIds: ["alfuzosin"], section: "4 Contraindications", quote: "Alpha 1- Adrenoreceptor Antagonist: alfuzosin" },
      { victimIds: ["ranolazine"], section: "4 Contraindications", quote: "Antianginal: ranolazine" },
      { victimIds: ["amiodarone", "dronedarone", "flecainide", "propafenone", "quinidine", "quinidine-gluconate"], section: "4 Contraindications", quote: "Antiarrhythmics: amiodarone, dronedarone, flecainide, propafenone, quinidine" },
      { victimIds: ["lurasidone", "pimozide"], section: "4 Contraindications", quote: "Antipsychotics: lurasidone, pimozide" },
      { victimIds: ["dihydroergotamine", "ergotamine", "methylergonovine"], section: "4 Contraindications", quote: "Ergot Derivatives: dihydroergotamine, ergotamine, methylergonovine" },
      { victimIds: ["lovastatin", "simvastatin", "simvastatin-ezetimibe"], section: "4 Contraindications", quote: "HMG-CoA Reductase Inhibitors: lovastatin, simvastatin" },
      { victimIds: ["suzetrigine"], section: "4 Contraindications", quote: "Non-opioid Analgesic (selective blocker of Na v 1.8 sodium channels): suzetrigine" },
      { victimIds: ["sildenafil-pah"], section: "4 Contraindications", quote: "PDE5 Inhibitor: sildenafil (Revatio ® ) when used for the treatment of pulmonary arterial hypertension" },
      { victimIds: ["triazolam", "midazolam"], section: "4 Contraindications", quote: "Sedative/Hypnotics: triazolam, orally administered midazolam" },
    ],
    alsoNamed: ["colchicine", "voriconazole", "apalutamide", "st-johns-wort"],
    url: DM("2849298e-de6e-47bb-8194-56e075b33fc3"),
    labelEffective: "2026-07-23",
    retrieved: "2026-10-02",
  },

  {
    perpIds: ["ciprofloxacin"],
    brand: "Ciprofloxacin",
    enzyme: "CYP1A2",
    role: "inhibitor",
    section: "7 Drug Interactions",
    roleQuote:
      "Ciprofloxacin is an inhibitor of human cytochrome P450 1A2 (CYP1A2) mediated metabolism.",
    contraindicatedGroups: [
      {
        victimIds: ["tizanidine"],
        section: "7 Drug Interactions",
        quote:
          "Concomitant administration of tizanidine and ciprofloxacin is contraindicated due to the potentiation of hypotensive and sedative effects of tizanidine",
      },
    ],
    // Named as avoid or use-with-caution, not contraindicated.
    alsoNamed: ["theophylline", "duloxetine", "clozapine", "caffeine"],
    url: DM("0fe3becb-f90e-4187-a8e8-bd0de5a79ad2"),
    labelEffective: "2026-07-13",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["fluvoxamine"],
    brand: "Fluvoxamine",
    enzyme: "CYP1A2",
    role: "inhibitor",
    section: "7 Drug Interactions",
    roleQuote:
      "Fluvoxamine inhibits several cytochrome P450 isoenzymes (CYP1A2, CYP2C9, CYP3A4, and CYP2C19)",
    contraindicatedGroups: [
      {
        victimIds: ["tizanidine", "ramelteon"],
        section: "4 Contraindications",
        quote:
          "Coadministration of thioridazine, tizanidine, pimozide, alosetron, or ramelteon with fluvoxamine maleate extended-release capsules is contraindicated",
      },
    ],
    // Pimozide is named in that sentence. This 1A2 row stays silent; the 3A4 row quotes it.
    alsoNamed: ["pimozide"],
    url: DM("0a6836ab-bd0e-410b-82af-07720e386532"),
    labelEffective: "2025-11-04",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["fluvoxamine"],
    brand: "Fluvoxamine",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7 Drug Interactions",
    roleQuote:
      "Fluvoxamine inhibits several cytochrome P450 isoenzymes (CYP1A2, CYP2C9, CYP3A4, and CYP2C19)",
    contraindicatedGroups: [
      {
        victimIds: ["pimozide"],
        section: "4 Contraindications",
        quote:
          "Coadministration of thioridazine, tizanidine, pimozide, alosetron, or ramelteon with fluvoxamine maleate extended-release capsules is contraindicated",
      },
    ],
    url: DM("0a6836ab-bd0e-410b-82af-07720e386532"),
    labelEffective: "2025-11-04",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["fluvoxamine"],
    brand: "Fluvoxamine",
    enzyme: "CYP2D6",
    role: "inhibitor",
    section: "7 Drug Interactions",
    roleQuote: "In vitro data suggest that fluvoxamine is a relatively weak inhibitor of CYP2D6.",
    contraindicatedGroups: [
      {
        victimIds: ["thioridazine"],
        section: "4 Contraindications",
        quote:
          "Coadministration of thioridazine, tizanidine, pimozide, alosetron, or ramelteon with fluvoxamine maleate extended-release capsules is contraindicated",
      },
    ],
    url: DM("0a6836ab-bd0e-410b-82af-07720e386532"),
    labelEffective: "2025-11-04",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["letermovir"],
    brand: "Prevymis",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7 Drug Interactions",
    roleQuote: "letermovir is a moderate inhibitor of CYP3A",
    contraindicatedGroups: [
      {
        victimIds: ["pimozide"],
        section: "4 Contraindications",
        quote:
          "Concomitant administration of PREVYMIS in patients receiving pimozide may result in increased concentrations of pimozide due to inhibition of cytochrome P450 3A (CYP3A) by letermovir, which may lead to QT prolongation and torsades de pointes",
      },
      {
        victimIds: ["ergotamine", "dihydroergotamine"],
        section: "4 Contraindications",
        quote:
          "Concomitant administration of PREVYMIS in patients receiving ergot alkaloids may result in increased concentrations of ergot alkaloids (ergotamine and dihydroergotamine) due to inhibition of CYP3A by letermovir, which may lead to ergotism",
      },
    ],
    // Contraindicated only when cyclosporine is also on board.
    alsoNamed: ["simvastatin", "pitavastatin"],
    url: DM("1b49df80-be4f-47e0-a0b7-123f3e69395b"),
    labelEffective: "2026-01-14",
    retrieved: "2026-10-02",
  },
  {
    perpIds: ["fluconazole"],
    brand: "Fluconazole",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7 Drug Interactions",
    roleQuote: "Fluconazole is a moderate CYP2C9 and CYP3A4 inhibitor.",
    contraindicatedGroups: [
      {
        victimIds: ["erythromycin", "pimozide", "quinidine", "quinidine-gluconate"],
        section: "4 Contraindications",
        quote:
          "Coadministration of other drugs known to prolong the QT interval and which are metabolized via the enzyme CYP3A4 such as erythromycin, pimozide, and quinidine are contraindicated in patients receiving fluconazole.",
      },
    ],
    url: DM("01df20c4-7b94-044e-e063-6394a90a406a"),
    labelEffective: "2025-11-17",
    retrieved: "2026-10-03",
  },
  {
    perpIds: ["voriconazole"],
    brand: "Voriconazole",
    enzyme: "CYP3A4",
    role: "inhibitor",
    section: "7 Drug Interactions",
    roleQuote: "Voriconazole is a strong inhibitor of CYP3A4, and also inhibits CYP2C19 and CYP2C9.",
    contraindicatedGroups: [
      {
        victimIds: ["pimozide", "quinidine", "quinidine-gluconate"],
        section: "4 Contraindications",
        quote:
          "Coadministration of pimozide, quinidine or ivabradine with voriconazole tablets is contraindicated because increased plasma concentrations of these drugs can lead to QT prolongation and rare occurrences of torsade de pointes",
      },
      {
        victimIds: ["sirolimus"],
        section: "4 Contraindications",
        quote:
          "Coadministration of voriconazole tablets with sirolimus is contraindicated because voriconazole tablets significantly increase sirolimus concentrations",
      },
      {
        victimIds: ["lurasidone"],
        section: "4 Contraindications",
        quote:
          "Coadministration of voriconazole tablets with lurasidone is contraindicated since it may result in significant increases in lurasidone exposure and the potential for serious adverse reactions",
      },
    ],
    // Dose-conditional, or the contraindication is the other drug lowering voriconazole.
    alsoNamed: ["efavirenz", "ritonavir"],
    url: DM("23f25c6b-f075-42dc-ae05-63b5bf410929"),
    labelEffective: "2026-05-28",
    retrieved: "2026-10-03",
  },
];
