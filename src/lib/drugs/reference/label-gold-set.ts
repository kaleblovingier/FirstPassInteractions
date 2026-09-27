/**
 * Label-anchored gold set: well-documented interacting pairs, each tied to an
 * explicit statement on a current FDA-approved label (DailyMed SPL).
 *
 * Purpose: an end-to-end check that the desk's interaction engine (`analyze`)
 * flags each pair at least at `expectedFloor`. Educational tool, NOT FDA-cleared.
 * No dosing: quotes are trimmed so they carry no milligram amounts.
 *
 * Inclusion rule: the label must say the combination is contraindicated, or
 * explicitly "avoid" / "not recommended" / "should not be used". Monitoring-only
 * language (e.g. opioid boxed warnings about CYP3A4 inhibitors) does not qualify.
 *
 * Quotes are verbatim substrings of the SPL text retrieved on `retrieved`; a
 * "…" marks an elided span. `labelExample` (also verbatim) is used when the
 * governing sentence names a class and a nearby sentence names the drug.
 */
import type { Severity } from "../types";

export type LabelClass = "contraindicated" | "avoid";
export type GoldDomain =
  | "statins"
  | "muscle-relaxant"
  | "psychiatry"
  | "sleep"
  | "cardiology"
  | "antithrombotic"
  | "gi"
  | "maoi-opioid"
  | "antimicrobial";

export interface GoldPair {
  /** Stable id, `drugA+drugB`. */
  id: string;
  /** Catalog ids (DRUG_BY_ID keys). */
  drugA: string;
  drugB: string;
  /** What a user would type; each must resolve via `searchDrugs` to drugA/drugB. */
  queries: [string, string];
  /** Whose label carries the statement. */
  labelDrug: string;
  labelSection: string;
  quote: string;
  paraphrased: boolean;
  labelExample?: string;
  url: string;
  retrieved: "2026-09-27";
  labelClass: LabelClass;
  /** Minimum engine severity for the pair (pair-level findings only). */
  expectedFloor: Severity;
  /** Stricter expectation: the label says contraindicated, so ideally the desk says so too. */
  expectContraindicated: boolean;
  mechanism: "PK" | "PD" | "PK+PD";
  domain: GoldDomain;
  note?: string;
}

const DM = (setid: string) => `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`;

export const LABEL_SETIDS = {
  zocor: "8f55d5de-5a4f-4a39-8c84-c53976dd6af9",
  lovastatin: "9438d8a0-ca5b-4676-aab9-d0241ccff6c9",
  zanaflex: "60c27d35-7349-4fc6-86ad-70fffdbe3e08",
  pimozide: "70b079e2-a1f7-4a93-8685-d60a4d7c1280",
  fluvoxamine: "6eeb14df-6fcf-a737-5359-5744eb4accea",
  prozac: "c88f33ed-6dfb-4c5e-bc01-d8e36dd97299",
  thioridazine: "1fd16a99-e856-4a37-9dae-c443714fac14",
  latuda: "afad3051-9df2-4c54-9684-e8262a133af8",
  rozerem: "9de82310-70e8-47b9-b1fc-6c6848b99455",
  belsomra: "e5b72731-1acb-45b7-9c13-290ad12d3951",
  dayvigo: "7074cb65-77b3-45d2-8e8d-da8dc0f70bfd",
  triazolam: "5add318e-11b9-42f8-b052-0d8cebb32fcf",
  xyrem: "926eb076-a4a8-45e4-91ef-411f0aa4f3ca",
  corlanor: "92018a65-38f6-45f7-91d4-a34921b81d0d",
  multaq: "3bd4006a-8bad-4909-ac6d-b6d84390155c",
  ranexa: "e038f963-d78f-460e-a11f-46f224061505",
  inspra: "1a52bedc-8e2c-4116-a296-a87770676b4a",
  cafergot: "4db7eece-2eef-bc1b-e063-6394a90a98cb",
  plavix: "de8b0b67-eb25-4684-83b5-7ad785314227",
  brilinta: "f7b3f443-e83d-4bf2-0e96-023448fed9a8",
  eliquis: "41a133ef-e461-48ad-8221-b735bdd0ec25",
  xarelto: "10db92f9-2300-4a80-836b-673e1ae91610",
  lotronex: "35cbb9d5-639b-207a-e054-00144ff88e88",
  nardil: "513a41d0-37d4-4355-8a6d-a2c643bce6fa",
  parnate: "b72d8187-dfcc-4ea0-b5e9-c0be95b69a27",
  tramadol: "5c2ac7cb-3a38-2174-e063-6394a90a95cc",
  methadone: "540edd43-165d-4257-b989-3bccc8f54afb",
  zyvox: "3e5e9975-6f36-42e4-ab46-0e75dda83592",
  selegiline: "1924db3d-6a16-4496-cfd0-6903be146925",
  rifadin: "1b074c23-dd35-43c9-820c-0e603481fdd3",
  vfend: "08d08721-1f4c-478a-8abf-d9c402d50553",
  norvir: "2849298e-de6e-47bb-8194-56e075b33fc3",
} as const;
type LabelKey = keyof typeof LABEL_SETIDS;

type Row = Omit<GoldPair, "id" | "url" | "retrieved" | "expectedFloor" | "expectContraindicated" | "paraphrased"> & {
  label: LabelKey;
  paraphrased?: boolean;
};

function row(r: Row): GoldPair {
  const { label, paraphrased, ...rest } = r;
  return {
    id: `${r.drugA}+${r.drugB}`,
    ...rest,
    paraphrased: paraphrased ?? false,
    url: DM(LABEL_SETIDS[label]),
    retrieved: "2026-09-27",
    // Both label classes are serious; the desk should say at least "Serious concern" (major).
    expectedFloor: "major",
    expectContraindicated: r.labelClass === "contraindicated",
  };
}

const ZOCOR_4 =
  "Concomitant use of strong CYP3A4 inhibitors (select azole anti-fungals, macrolide antibiotics, anti-viral medications, and nefazodone)";

export const LABEL_GOLD_SET: GoldPair[] = [
  // ── Statins ────────────────────────────────────────────────────────────
  row({
    drugA: "simvastatin", drugB: "clarithromycin", queries: ["simvastatin", "clarithromycin"],
    labelDrug: "Zocor (simvastatin)", label: "zocor", labelSection: "4 CONTRAINDICATIONS",
    quote: ZOCOR_4,
    labelExample: "select macrolide antibiotics (e.g., erythromycin and clarithromycin)",
    labelClass: "contraindicated", mechanism: "PK", domain: "statins",
  }),
  row({
    drugA: "simvastatin", drugB: "itraconazole", queries: ["simvastatin", "itraconazole"],
    labelDrug: "Zocor (simvastatin)", label: "zocor", labelSection: "4 CONTRAINDICATIONS",
    quote: ZOCOR_4,
    labelExample: "Select azole anti-fungals (e.g., itraconazole, ketoconazole, posaconazole, and voriconazole)",
    labelClass: "contraindicated", mechanism: "PK", domain: "statins",
  }),
  row({
    drugA: "simvastatin", drugB: "ritonavir", queries: ["simvastatin", "ritonavir"],
    labelDrug: "Zocor (simvastatin)", label: "zocor", labelSection: "4 CONTRAINDICATIONS",
    quote: ZOCOR_4,
    labelExample: "select HIV protease inhibitors (e.g., nelfinavir, ritonavir, and darunavir/ritonavir)",
    labelClass: "contraindicated", mechanism: "PK", domain: "statins",
  }),
  row({
    drugA: "lovastatin", drugB: "clarithromycin", queries: ["lovastatin", "clarithromycin"],
    labelDrug: "Lovastatin tablets", label: "lovastatin", labelSection: "CONTRAINDICATIONS",
    quote: "Concomitant administration with strong CYP3A4 inhibitors (e.g., itraconazole, ketoconazole, … erythromycin, clarithromycin, telithromycin",
    labelClass: "contraindicated", mechanism: "PK", domain: "statins",
  }),
  // ── Tizanidine (CYP1A2) ───────────────────────────────────────────────
  row({
    drugA: "tizanidine", drugB: "fluvoxamine", queries: ["tizanidine", "fluvoxamine"],
    labelDrug: "Zanaflex (tizanidine)", label: "zanaflex", labelSection: "7.1 Strong CYP1A2 Inhibitors (see 4 CONTRAINDICATIONS)",
    quote: "Concomitant use of Zanaflex with strong cytochrome P450 1A2 (CYP1A2) inhibitors (e.g., fluvoxamine, ciprofloxacin) is contraindicated.",
    labelClass: "contraindicated", mechanism: "PK", domain: "muscle-relaxant",
  }),
  row({
    drugA: "tizanidine", drugB: "ciprofloxacin", queries: ["tizanidine", "ciprofloxacin"],
    labelDrug: "Zanaflex (tizanidine)", label: "zanaflex", labelSection: "7.1 Strong CYP1A2 Inhibitors (see 4 CONTRAINDICATIONS)",
    quote: "Concomitant use of Zanaflex with strong cytochrome P450 1A2 (CYP1A2) inhibitors (e.g., fluvoxamine, ciprofloxacin) is contraindicated.",
    labelClass: "contraindicated", mechanism: "PK", domain: "muscle-relaxant",
  }),
  // ── Antipsychotics / psychiatry ───────────────────────────────────────
  row({
    drugA: "pimozide", drugB: "clarithromycin", queries: ["pimozide", "clarithromycin"],
    labelDrug: "Pimozide tablets", label: "pimozide", labelSection: "CONTRAINDICATIONS",
    quote: "pimozide is contraindicated in patients receiving the macrolide antibiotics clarithromycin, erythromycin, azithromycin, dirithromycin, and troleandomycin.",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "psychiatry",
  }),
  row({
    drugA: "pimozide", drugB: "ketoconazole", queries: ["pimozide", "ketoconazole"],
    labelDrug: "Pimozide tablets", label: "pimozide", labelSection: "CONTRAINDICATIONS",
    quote: "pimozide is contraindicated in patients receiving the azole antifungal agents itraconazole and ketoconazole.",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row({
    drugA: "pimozide", drugB: "fluvoxamine", queries: ["pimozide", "fluvoxamine"],
    labelDrug: "Fluvoxamine maleate tablets", label: "fluvoxamine", labelSection: "4 CONTRAINDICATIONS",
    quote: "Coadministration of tizanidine, thioridazine, alosetron, or pimozide with Fluvoxamine Maleate Tablets is contraindicated",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row({
    drugA: "pimozide", drugB: "fluoxetine", queries: ["pimozide", "fluoxetine"],
    labelDrug: "Prozac (fluoxetine)", label: "prozac", labelSection: "4.2 Other Contraindications",
    quote: "The use of PROZAC is contraindicated with the following: Pimozide",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "psychiatry",
  }),
  row({
    drugA: "pimozide", drugB: "paroxetine", queries: ["pimozide", "paroxetine"],
    labelDrug: "Pimozide tablets", label: "pimozide", labelSection: "CONTRAINDICATIONS",
    quote: "Concomitant use of pimozide with paroxetine and other strong CYP 2D6 inhibitors is contraindicated",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row({
    drugA: "thioridazine", drugB: "fluoxetine", queries: ["thioridazine", "fluoxetine"],
    labelDrug: "Thioridazine HCl tablets", label: "thioridazine", labelSection: "CONTRAINDICATIONS",
    quote: "drugs that inhibit this isozyme (e.g., fluoxetine and paroxetine) … thioridazine is contraindicated with these drugs",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "psychiatry",
  }),
  row({
    drugA: "thioridazine", drugB: "paroxetine", queries: ["thioridazine", "paroxetine"],
    labelDrug: "Thioridazine HCl tablets", label: "thioridazine", labelSection: "CONTRAINDICATIONS",
    quote: "drugs that inhibit this isozyme (e.g., fluoxetine and paroxetine) … thioridazine is contraindicated with these drugs",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "psychiatry",
  }),
  row({
    drugA: "thioridazine", drugB: "fluvoxamine", queries: ["thioridazine", "fluvoxamine"],
    labelDrug: "Thioridazine HCl tablets", label: "thioridazine", labelSection: "CONTRAINDICATIONS",
    quote: "certain other drugs (e.g., fluvoxamine, propranolol, and pindolol) appear to appreciably inhibit the metabolism of thioridazine … thioridazine is contraindicated with these drugs",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "psychiatry",
    note: "Also named on the fluvoxamine label, 4 CONTRAINDICATIONS.",
  }),
  row({
    drugA: "lurasidone", drugB: "ketoconazole", queries: ["lurasidone", "ketoconazole"],
    labelDrug: "Latuda (lurasidone)", label: "latuda", labelSection: "4 CONTRAINDICATIONS",
    quote: "Strong CYP3A4 inhibitors (e.g., ketoconazole, clarithromycin, ritonavir, voriconazole, mibefradil, etc.)",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row({
    drugA: "lurasidone", drugB: "rifampin", queries: ["lurasidone", "rifampin"],
    labelDrug: "Latuda (lurasidone)", label: "latuda", labelSection: "4 CONTRAINDICATIONS",
    quote: "Strong CYP3A4 inducers (e.g., rifampin, avasimibe, St. John's wort, phenytoin, carbamazepine, etc.)",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row({
    drugA: "alosetron", drugB: "fluvoxamine", queries: ["alosetron", "fluvoxamine"],
    labelDrug: "Lotronex (alosetron)", label: "lotronex", labelSection: "4.3 Concomitant Use of Fluvoxamine",
    quote: "Concomitant administration of LOTRONEX with fluvoxamine is contraindicated.",
    labelClass: "contraindicated", mechanism: "PK", domain: "gi",
  }),
  // ── Sleep / sedative-hypnotics ────────────────────────────────────────
  row({
    drugA: "ramelteon", drugB: "fluvoxamine", queries: ["ramelteon", "fluvoxamine"],
    labelDrug: "Rozerem (ramelteon)", label: "rozerem", labelSection: "4 CONTRAINDICATIONS",
    quote: "Patients should not take ROZEREM in conjunction with fluvoxamine",
    labelClass: "contraindicated", mechanism: "PK", domain: "sleep",
  }),
  row({
    drugA: "suvorexant", drugB: "ketoconazole", queries: ["suvorexant", "ketoconazole"],
    labelDrug: "Belsomra (suvorexant)", label: "belsomra", labelSection: "7.2 Effects of Other Drugs on BELSOMRA",
    quote: "Concomitant use of BELSOMRA with strong inhibitors of CYP3A (e.g., ketoconazole, itraconazole, … is not recommended",
    labelClass: "avoid", mechanism: "PK", domain: "sleep",
  }),
  row({
    drugA: "lemborexant", drugB: "itraconazole", queries: ["lemborexant", "itraconazole"],
    labelDrug: "Dayvigo (lemborexant)", label: "dayvigo", labelSection: "2.2 Dosage Recommendations for Concomitant Use / 7.1",
    quote: "Avoid concomitant use of DAYVIGO with strong or moderate CYP3A inhibitors",
    labelExample: "Strong CYP3A inhibitors: itraconazole, clarithromycin",
    labelClass: "avoid", mechanism: "PK", domain: "sleep",
  }),
  row({
    drugA: "triazolam", drugB: "ketoconazole", queries: ["triazolam", "ketoconazole"],
    labelDrug: "Triazolam tablets", label: "triazolam", labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant administration of strong cytochrome P450 (CYP 3A) enzyme inhibitors (e.g., ketoconazole, itraconazole, nefazodone, lopinavir, ritonavir)",
    labelClass: "contraindicated", mechanism: "PK", domain: "sleep",
  }),
  row({
    drugA: "sodium-oxybate", drugB: "ethanol", queries: ["sodium oxybate", "alcohol"],
    labelDrug: "Xyrem (sodium oxybate)", label: "xyrem", labelSection: "4 CONTRAINDICATIONS",
    quote: "Xyrem is contraindicated for use in: … combination with alcohol",
    labelClass: "contraindicated", mechanism: "PD", domain: "sleep",
  }),
  row({
    drugA: "sodium-oxybate", drugB: "zolpidem", queries: ["sodium oxybate", "zolpidem"],
    labelDrug: "Xyrem (sodium oxybate)", label: "xyrem", labelSection: "4 CONTRAINDICATIONS",
    quote: "Xyrem is contraindicated for use in: •combination with sedative hypnotics",
    labelClass: "contraindicated", mechanism: "PD", domain: "sleep",
    note: "Label names the class (sedative hypnotics), not zolpidem specifically.",
  }),
  // ── Cardiology ────────────────────────────────────────────────────────
  row({
    drugA: "ivabradine", drugB: "clarithromycin", queries: ["ivabradine", "clarithromycin"],
    labelDrug: "Corlanor (ivabradine)", label: "corlanor", labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant use of strong cytochrome P450 3A4 (CYP3A4) inhibitors",
    labelExample: "macrolide antibiotics (e.g., clarithromycin, telithromycin)",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row({
    drugA: "dronedarone", drugB: "ketoconazole", queries: ["dronedarone", "ketoconazole"],
    labelDrug: "Multaq (dronedarone)", label: "multaq", labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant use of strong CYP3A inhibitors, such as ketoconazole, itraconazole, voriconazole, cyclosporine, telithromycin, clarithromycin, nefazodone, and ritonavir",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row({
    drugA: "ranolazine", drugB: "ketoconazole", queries: ["ranolazine", "ketoconazole"],
    labelDrug: "Ranexa (ranolazine)", label: "ranexa", labelSection: "7.1 (see 4 CONTRAINDICATIONS)",
    quote: "Do not use RANEXA with strong CYP3A inhibitors, including ketoconazole, itraconazole, clarithromycin, nefazodone, nelfinavir, ritonavir, indinavir, and saquinavir",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row({
    drugA: "ranolazine", drugB: "rifampin", queries: ["ranolazine", "rifampin"],
    labelDrug: "Ranexa (ranolazine)", label: "ranexa", labelSection: "7.1 (see 4 CONTRAINDICATIONS)",
    quote: "Do not use RANEXA with CYP3A inducers such as rifampin, rifabutin, rifapentine, phenobarbital, phenytoin, carbamazepine",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row({
    drugA: "eplerenone", drugB: "ketoconazole", queries: ["eplerenone", "ketoconazole"],
    labelDrug: "Inspra (eplerenone)", label: "inspra", labelSection: "4 CONTRAINDICATIONS",
    quote: "concomitant administration of strong CYP3A inhibitors (e.g., ketoconazole, itraconazole, nefazodone, troleandomycin, clarithromycin, ritonavir, and nelfinavir)",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row({
    drugA: "ergotamine", drugB: "ritonavir", queries: ["ergotamine", "ritonavir"],
    labelDrug: "Cafergot (ergotamine/caffeine)", label: "cafergot", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of ergotamine with potent CYP 3A4 inhibitors (ritonavir, nelfinavir, indinavir, erythromycin, clarithromycin, and troleandomycin) has been associated with acute ergot toxicity",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
    note: "Same section: 'ergotamine use is contraindicated with these drugs'.",
  }),
  // ── Antithrombotics ───────────────────────────────────────────────────
  row({
    drugA: "clopidogrel", drugB: "omeprazole", queries: ["clopidogrel", "omeprazole"],
    labelDrug: "Plavix (clopidogrel)", label: "plavix", labelSection: "7.2 CYP2C19 Inhibitors",
    quote: "Avoid concomitant use of Plavix with omeprazole or esomeprazole.",
    labelClass: "avoid", mechanism: "PK", domain: "antithrombotic",
  }),
  row({
    drugA: "clopidogrel", drugB: "esomeprazole", queries: ["clopidogrel", "esomeprazole"],
    labelDrug: "Plavix (clopidogrel)", label: "plavix", labelSection: "7.2 CYP2C19 Inhibitors",
    quote: "Avoid concomitant use of Plavix with omeprazole or esomeprazole.",
    labelClass: "avoid", mechanism: "PK", domain: "antithrombotic",
  }),
  row({
    drugA: "ticagrelor", drugB: "ketoconazole", queries: ["ticagrelor", "ketoconazole"],
    labelDrug: "Brilinta (ticagrelor)", label: "brilinta", labelSection: "7.1 Strong CYP3A Inhibitors",
    quote: "Avoid use of strong inhibitors of CYP3A (e.g., ketoconazole, itraconazole, voriconazole, clarithromycin, nefazodone, ritonavir",
    labelClass: "avoid", mechanism: "PK", domain: "antithrombotic",
  }),
  row({
    drugA: "apixaban", drugB: "rifampin", queries: ["apixaban", "rifampin"],
    labelDrug: "Eliquis (apixaban)", label: "eliquis", labelSection: "7.2 Combined P-gp and Strong CYP3A4 Inducers",
    quote: "Avoid concomitant use of ELIQUIS with combined P-gp and strong CYP3A4 inducers (e.g., rifampin, carbamazepine, phenytoin",
    labelClass: "avoid", mechanism: "PK", domain: "antithrombotic",
  }),
  row({
    drugA: "rivaroxaban", drugB: "ketoconazole", queries: ["rivaroxaban", "ketoconazole"],
    labelDrug: "Xarelto (rivaroxaban)", label: "xarelto", labelSection: "7.2 Drugs that Inhibit Cytochrome P450 3A Enzymes",
    quote: "Avoid concomitant administration of XARELTO with known combined P-gp and strong CYP3A inhibitors (e.g., ketoconazole and ritonavir)",
    labelClass: "avoid", mechanism: "PK", domain: "antithrombotic",
  }),
  // ── MAOIs, opioids, serotonergic ──────────────────────────────────────
  row({
    drugA: "phenelzine", drugB: "meperidine", queries: ["phenelzine", "meperidine"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "Concomitant use with meperidine is contraindicated",
    labelClass: "contraindicated", mechanism: "PD", domain: "maoi-opioid",
  }),
  row({
    drugA: "phenelzine", drugB: "dextromethorphan", queries: ["phenelzine", "dextromethorphan"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "NARDIL should not be used in combination with dextromethorphan or with CNS depressants such as alcohol and certain narcotics.",
    labelClass: "contraindicated", mechanism: "PD", domain: "maoi-opioid",
  }),
  row({
    drugA: "tranylcypromine", drugB: "meperidine", queries: ["tranylcypromine", "meperidine"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated.",
    labelClass: "contraindicated", mechanism: "PD", domain: "maoi-opioid",
    note: "Table 1 lists meperidine under Individual Drugs.",
  }),
  row({
    drugA: "phenelzine", drugB: "tramadol", queries: ["phenelzine", "tramadol"],
    labelDrug: "Tramadol HCl tablets", label: "tramadol", labelSection: "4 CONTRAINDICATIONS",
    quote: "Tramadol hydrochloride tablets are also contraindicated in patients with: … Concurrent use of monoamine oxidase inhibitors (MAOIs) or use within the last 14 days",
    labelClass: "contraindicated", mechanism: "PD", domain: "maoi-opioid",
  }),
  row({
    drugA: "phenelzine", drugB: "methadone", queries: ["phenelzine", "methadone"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "7 DRUG INTERACTIONS",
    quote: "The use of methadone hydrochloride tablets is not recommended for patients taking MAOIs or within 14 days of stopping such treatment.",
    labelClass: "avoid", mechanism: "PD", domain: "maoi-opioid",
  }),
  row({
    drugA: "linezolid", drugB: "phenelzine", queries: ["linezolid", "phenelzine"],
    labelDrug: "Zyvox (linezolid)", label: "zyvox", labelSection: "4.2 Monoamine Oxidase Inhibitors",
    quote: "Linezolid should not be used in patients taking any medicinal product which inhibits monoamine oxidases A or B (e.g., phenelzine, isocarboxazid)",
    labelClass: "contraindicated", mechanism: "PD", domain: "antimicrobial",
  }),
  row({
    drugA: "fluoxetine", drugB: "linezolid", queries: ["fluoxetine", "linezolid"],
    labelDrug: "Prozac (fluoxetine)", label: "prozac", labelSection: "4.1 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: "Starting PROZAC in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row({
    drugA: "phenelzine", drugB: "fluoxetine", queries: ["phenelzine", "fluoxetine"],
    labelDrug: "Prozac (fluoxetine)", label: "prozac", labelSection: "4.1 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: "The use of MAOIs intended to treat psychiatric disorders with PROZAC or within 5 weeks of stopping treatment with PROZAC is contraindicated",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row({
    drugA: "selegiline", drugB: "meperidine", queries: ["selegiline", "meperidine"],
    labelDrug: "Selegiline HCl capsules", label: "selegiline", labelSection: "CONTRAINDICATIONS",
    quote: "Selegiline is contraindicated for use with meperidine",
    labelClass: "contraindicated", mechanism: "PD", domain: "maoi-opioid",
  }),
  // ── Antimicrobials / HIV ──────────────────────────────────────────────
  row({
    drugA: "rifampin", drugB: "atazanavir", queries: ["rifampin", "atazanavir"],
    labelDrug: "Rifadin (rifampin)", label: "rifadin", labelSection: "CONTRAINDICATIONS",
    quote: "Rifampin is contraindicated in patients who are also receiving atazanavir, darunavir, fosamprenavir, saquinavir, tipranavir",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row({
    drugA: "voriconazole", drugB: "rifampin", queries: ["voriconazole", "rifampin"],
    labelDrug: "Vfend (voriconazole)", label: "vfend", labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant use of VFEND is contraindicated with drugs and herbal products that induce CYP2C19, CYP2C9, and/or CYP3A4 … Rifampin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
];

/**
 * Pairs where the engine currently sits BELOW `expectedFloor`.
 * For formulary owner (Grok Bot 5) review. Do not "fix" these by editing the
 * test; fix the catalog/engine in a separate PR and remove the id here (the
 * suite fails when a listed pair starts passing, so this list stays pruned).
 */
export const KNOWN_UNDERCALLS: readonly string[] = [
  // for formulary owner (Grok Bot 5) review
  "pimozide+fluoxetine", // label: contraindicated (Prozac 4.2) · engine: moderate
  "pimozide+paroxetine", // label: contraindicated (pimozide) · engine: none at pair level
  "thioridazine+fluvoxamine", // label: contraindicated (thioridazine; fluvoxamine 4) · engine: moderate
  "alosetron+fluvoxamine", // label: contraindicated (Lotronex 4.3) · engine: none
];

/**
 * Pairs that meet the "major" floor but where the label says contraindicated and
 * the engine says major ("Serious concern") rather than contraindicated
 * ("Avoid together"). Informational, for formulary owner (Grok Bot 5) review.
 * Pinned by a test so the list is pruned when the engine changes.
 */
export const KNOWN_CONTRAINDICATION_GAPS: readonly string[] = [
  "pimozide+fluvoxamine",
  "dronedarone+ketoconazole",
  "ergotamine+ritonavir",
  "rifampin+atazanavir",
  "voriconazole+rifampin",
];

/** Drugs we looked for but the catalog does not carry (not forced into the set). */
export const NOT_IN_CATALOG: { drug: string; reason: string }[] = [
  { drug: "flibanserin", reason: "Not in catalog (searchDrugs returns nothing); label has CYP3A4-inhibitor contraindications but was not curated." },
  { drug: "cisapride", reason: "Not in catalog; named in the Norvir contraindication list but not curated." },
];

/** Candidate pairs considered and dropped, with the reason. */
export const DROPPED_CANDIDATES: { pair: string; reason: string }[] = [
  {
    pair: "methadone / buprenorphine / fentanyl + strong CYP3A4 inhibitor or inducer",
    reason:
      "Labels checked (methadone tablets, buprenorphine/naloxone film, fentanyl transdermal) use monitor/consider-dose-change language, not contraindicated/avoid. Fails the inclusion rule.",
  },
  {
    pair: "colchicine + clarithromycin",
    reason:
      "Biaxin: contraindicated only 'in patients with renal or hepatic impairment'. Not cleanly expressible as a two-drug regimen on the default host.",
  },
  {
    pair: "ketamine + any",
    reason: "Ketalar 4 CONTRAINDICATIONS lists no drug-interaction contraindication; nothing to anchor.",
  },
  {
    pair: "darunavir + rifampin / St. John's wort",
    reason:
      "Verified on Prezista 4, but darunavir is only labeled with a booster (ritonavir/cobicistat); a two-drug regimen is ambiguous. rifampin+atazanavir kept instead.",
  },
  {
    pair: "extra verified duplicates (e.g. lovastatin+itraconazole, triazolam+ritonavir, dronedarone+clarithromycin, eplerenone+clarithromycin, lemborexant+rifampin, ticagrelor+rifampin, rivaroxaban+rifampin, tranylcypromine+dextromethorphan)",
    reason: "Label statement verified but trimmed to keep the set near 45 without repeating the same mechanism.",
  },
];
