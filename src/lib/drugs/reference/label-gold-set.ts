/**
 * Label-anchored gold set: well-documented interacting pairs, each tied to an
 * explicit statement on a current FDA-approved label (DailyMed SPL).
 *
 * Purpose: an end-to-end check that the desk's interaction engine (`analyze`)
 * flags each pair at least at `expectedFloor`. Educational tool, NOT FDA-cleared.
 * No dosing: quotes are trimmed so they carry no milligram amounts.
 *
 * Wave 1 inclusion rule: the label must say the combination is contraindicated,
 * or explicitly "avoid" / "not recommended" / "should not be used". Monitoring-only
 * language (e.g. opioid boxed warnings about CYP3A4 inhibitors) does not qualify.
 *
 * Wave 2 (MAT / ketamine clinic: methadone, buprenorphine, naltrexone, ketamine,
 * esketamine) also admits an explicit interaction statement in the Boxed Warning
 * (`boxed-warning`) or in Warnings/Drug Interactions (`warning`), with a per-pair
 * `expectedFloor` set to the minimum severity the label text supports:
 *   contraindicated / avoid / boxed-warning  -> major ("Serious concern")
 *   warning naming overdose / death          -> major
 *   warning with monitor / dose-change text  -> moderate ("Use care")
 *
 * Quotes are verbatim substrings of the SPL text retrieved on `retrieved`; a
 * "…" marks an elided span. `labelExample` (also verbatim) is used when the
 * governing sentence names a class and a nearby sentence names the drug.
 */
import type { Severity } from "../types";

export type LabelClass =
  | "contraindicated"
  | "avoid"
  /** Wave 2: the interaction is named in the label's Boxed Warning. */
  | "boxed-warning"
  /** Wave 2: explicit interaction statement in Warnings and Precautions / Drug Interactions. */
  | "warning";
export type GoldDomain =
  | "statins"
  | "muscle-relaxant"
  | "psychiatry"
  | "sleep"
  | "cardiology"
  | "antithrombotic"
  | "gi"
  | "maoi-opioid"
  | "antimicrobial"
  | "mat"
  | "ketamine-clinic";

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
  /** 1 = original set; 2 = MAT / ketamine-clinic wave. */
  wave: 1 | 2;
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
  // wave 2 (MAT / ketamine clinic)
  suboxone: "8a5edcf9-828c-4f97-b671-268ab13a8ecd",
  naltrexone: "06ff2d5a-e62b-4fa4-bbdb-01938535bc65",
  vivitrol: "cd11c435-b0f0-4bb9-ae78-60f101f3703f",
  ketalar: "14e8f864-8b8a-4e7e-8439-e510d3107063",
  spravato: "d81a6a79-a74a-44b7-822c-0dfa3036eaed",
} as const;
type LabelKey = keyof typeof LABEL_SETIDS;

type Row = Omit<GoldPair, "id" | "url" | "retrieved" | "expectedFloor" | "expectContraindicated" | "paraphrased" | "wave"> & {
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
    wave: 1,
  };
}

type Row2 = Row & {
  /** Minimum severity the quoted label text supports (see header). */
  expectedFloor: Extract<Severity, "major" | "moderate">;
};

/** Wave 2 row: explicit, label-supported floor instead of the blanket "major". */
function row2(r: Row2): GoldPair {
  const { label, paraphrased, expectedFloor, ...rest } = r;
  return {
    id: `${r.drugA}+${r.drugB}`,
    ...rest,
    paraphrased: paraphrased ?? false,
    url: DM(LABEL_SETIDS[label]),
    retrieved: "2026-09-27",
    expectedFloor,
    expectContraindicated: r.labelClass === "contraindicated",
    wave: 2,
  };
}

const ZOCOR_4 =
  "Concomitant use of strong CYP3A4 inhibitors (select azole anti-fungals, macrolide antibiotics, anti-viral medications, and nefazodone)";

const WAVE_1: GoldPair[] = [
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

// ════════════════════════════════════════════════════════════════════════
// Wave 2: MAT / ketamine clinic (methadone, buprenorphine, naltrexone,
// ketamine, esketamine). Floors follow the label text; see file header.
// ════════════════════════════════════════════════════════════════════════
const METHADONE_BOX_CYP =
  "The concomitant use of methadone hydrochloride tablets with all cytochrome P450 3A4, 2B6, 2C19, 2C9 or 2D6 inhibitors … could cause potentially fatal respiratory depression";
const METHADONE_7_INDUCERS =
  "The concomitant use of methadone hydrochloride tablets and CYP3A4, CYP2B6, CYP2C19, or CYP2C9 inducers can decrease the plasma concentration of methadone";
const METHADONE_BOX_CNS =
  "Concomitant use of opioids with benzodiazepines or other central nervous system (CNS) depressants, including alcohol, may result in profound sedation, respiratory depression, coma, and death.";
const NALTREXONE_4 = "Naltrexone hydrochloride is contraindicated in:";
const SPRAVATO_7_1 =
  "Concomitant use with CNS depressants (e.g., benzodiazepines, opioids, alcohol) may increase sedation … Closely monitor for sedation with concomitant use of SPRAVATO with CNS depressants.";
const SPRAVATO_7_2 =
  "Concomitant use with psychostimulants (e.g., amphetamines, methylphenidate, modafinil, armodafinil) may increase blood pressure … Closely monitor blood pressure with concomitant use of SPRAVATO with psychostimulants.";

const WAVE_2: GoldPair[] = [
  // ── Methadone (Methadone HCl tablets SPL) ─────────────────────────────
  row2({
    drugA: "methadone", drugB: "ketoconazole", queries: ["methadone", "ketoconazole"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "Boxed Warning (Cytochrome P450 Interaction); 7 DRUG INTERACTIONS",
    quote: METHADONE_BOX_CYP,
    labelExample: "azole-antifungal agents (e.g. ketoconazole)",
    labelClass: "boxed-warning", expectedFloor: "major", mechanism: "PK", domain: "mat",
  }),
  row2({
    drugA: "methadone", drugB: "fluconazole", queries: ["methadone", "fluconazole"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "Boxed Warning (Cytochrome P450 Interaction); 7 DRUG INTERACTIONS",
    quote: METHADONE_BOX_CYP,
    labelExample: "protease inhibitors (e.g., ritonavir), fluconazole, fluvoxamine",
    labelClass: "boxed-warning", expectedFloor: "major", mechanism: "PK", domain: "mat",
  }),
  row2({
    drugA: "methadone", drugB: "rifampin", queries: ["methadone", "rifampin"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "7 DRUG INTERACTIONS (Inducers of CYP3A4, CYP2B6, CYP2C19, or CYP2C9)",
    quote: METHADONE_7_INDUCERS,
    labelExample: "Rifampin, carbamazepine, phenytoin",
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PK", domain: "mat",
    note: "Label outcome is lost efficacy / withdrawal with monitor-and-adjust language, so the supported floor is moderate.",
  }),
  row2({
    drugA: "methadone", drugB: "carbamazepine", queries: ["methadone", "carbamazepine"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "7 DRUG INTERACTIONS (Inducers of CYP3A4, CYP2B6, CYP2C19, or CYP2C9)",
    quote: METHADONE_7_INDUCERS,
    labelExample: "Rifampin, carbamazepine, phenytoin",
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PK", domain: "mat",
  }),
  row2({
    drugA: "methadone", drugB: "alprazolam", queries: ["methadone", "alprazolam"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "Boxed Warning (Risks From Concomitant Use With Benzodiazepines Or Other CNS Depressants); 5.3",
    quote: METHADONE_BOX_CNS,
    labelClass: "boxed-warning", expectedFloor: "major", mechanism: "PD", domain: "mat",
    note: "Label names the class (benzodiazepines), not alprazolam specifically.",
  }),
  row2({
    drugA: "methadone", drugB: "ethanol", queries: ["methadone", "alcohol"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "Boxed Warning (Risks From Concomitant Use With Benzodiazepines Or Other CNS Depressants); 5.3",
    quote: METHADONE_BOX_CNS,
    labelClass: "boxed-warning", expectedFloor: "major", mechanism: "PD", domain: "mat",
  }),
  row2({
    drugA: "methadone", drugB: "gabapentin", queries: ["methadone", "gabapentin"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "5.3 Risks from Concomitant Use with Benzodiazepines or Other CNS Depressants (see Boxed Warning)",
    quote: "Profound sedation, respiratory depression, coma, and death may result from the concomitant use of methadone hydrochloride tablets with benzodiazepines and/or other CNS depressants … gabapentinoids",
    labelClass: "boxed-warning", expectedFloor: "major", mechanism: "PD", domain: "mat",
    note: "Boxed Warning covers 'other CNS depressants'; 5.3 names gabapentinoids.",
  }),
  row2({
    drugA: "methadone", drugB: "buprenorphine", queries: ["methadone", "buprenorphine"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "7 DRUG INTERACTIONS (Mixed Agonist/Antagonist and Partial Agonist Opioid Analgesics)",
    quote: "May reduce the analgesic effect of methadone hydrochloride tablets and/or precipitate withdrawal symptoms. … Avoid concomitant use.",
    labelExample: "Butorphanol, nalbuphine, pentazocine, buprenorphine.",
    labelClass: "avoid", expectedFloor: "major", mechanism: "PD", domain: "mat",
  }),
  row2({
    drugA: "methadone", drugB: "sotalol", queries: ["methadone", "sotalol"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "Boxed Warning (Life-Threatening QT Prolongation); 5.4; 7 DRUG INTERACTIONS",
    quote: "Closely monitor patients with risk factors for development of prolonged QT interval, … and those taking medications affecting cardiac conduction",
    labelExample: "Drugs known to have potential to prolong QT interval: Class I and III antiarrhythmics",
    labelClass: "boxed-warning", expectedFloor: "major", mechanism: "PD", domain: "mat",
    note: "Label names the class (Class III antiarrhythmics); sotalol is a class III agent.",
  }),
  row2({
    drugA: "methadone", drugB: "ondansetron", queries: ["methadone", "ondansetron"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "7 DRUG INTERACTIONS (Serotonergic Drugs); 5.9",
    quote: "The concomitant use of opioids with other drugs that affect the serotonergic neurotransmitter system has resulted in serotonin syndrome",
    labelExample: "5-HT3 receptor antagonists",
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PD", domain: "mat",
    note: "Label names the class (5-HT3 receptor antagonists); intervention is evaluate-and-monitor.",
  }),
  row2({
    drugA: "methadone", drugB: "zidovudine", queries: ["methadone", "zidovudine"],
    labelDrug: "Methadone HCl tablets", label: "methadone", labelSection: "7 DRUG INTERACTIONS (Effects of Methadone on Antiretroviral Agents)",
    quote: "Experimental evidence demonstrated that methadone increased the AUC of zidovudine, which could result in toxic effects.",
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PK", domain: "mat",
  }),
  // ── Buprenorphine / buprenorphine-naloxone (Suboxone film SPL) ────────
  row2({
    drugA: "buprenorphine", drugB: "alprazolam", queries: ["suboxone", "alprazolam"],
    labelDrug: "Suboxone (buprenorphine/naloxone) film", label: "suboxone", labelSection: "5.3 Managing Risks from Concomitant Use of Benzodiazepines or Other CNS Depressants",
    quote: "Concomitant use of buprenorphine and benzodiazepines and/or other CNS depressants … increases the risk of adverse reactions including overdose, respiratory depression, and death.",
    labelClass: "warning", expectedFloor: "major", mechanism: "PD", domain: "mat",
    note: "No Boxed Warning on this label; floor is major because the statement names overdose and death. Label names the class.",
  }),
  row2({
    drugA: "buprenorphine", drugB: "ethanol", queries: ["buprenorphine", "alcohol"],
    labelDrug: "Suboxone (buprenorphine/naloxone) film", label: "suboxone", labelSection: "7 DRUG INTERACTIONS (Benzodiazepines and Other CNS Depressants)",
    quote: "the concomitant use of benzodiazepines or other CNS depressants, including alcohol, increases the risk of respiratory depression, profound sedation, coma, and death",
    labelClass: "warning", expectedFloor: "major", mechanism: "PD", domain: "mat",
  }),
  row2({
    drugA: "buprenorphine", drugB: "pregabalin", queries: ["buprenorphine", "pregabalin"],
    labelDrug: "Suboxone (buprenorphine/naloxone) film", label: "suboxone", labelSection: "5.3 Managing Risks from Concomitant Use of Benzodiazepines or Other CNS Depressants",
    quote: "Concomitant use of buprenorphine and benzodiazepines and/or other CNS depressants (e.g., … gabapentinoids [gabapentin or pregabalin] … increases the risk of adverse reactions including overdose",
    labelClass: "warning", expectedFloor: "major", mechanism: "PD", domain: "mat",
  }),
  row2({
    drugA: "buprenorphine", drugB: "ketoconazole", queries: ["buprenorphine", "ketoconazole"],
    labelDrug: "Suboxone (buprenorphine/naloxone) film", label: "suboxone", labelSection: "7 DRUG INTERACTIONS (Inhibitors of CYP3A4)",
    quote: "The concomitant use of buprenorphine and CYP3A4 inhibitors can increase the plasma concentration of buprenorphine, resulting in increased or prolonged opioid effects",
    labelExample: "azole-antifungal agents (e.g. ketoconazole)",
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PK", domain: "mat",
  }),
  row2({
    drugA: "buprenorphine", drugB: "rifampin", queries: ["suboxone", "rifampin"],
    labelDrug: "Suboxone (buprenorphine/naloxone) film", label: "suboxone", labelSection: "7 DRUG INTERACTIONS (CYP3A4 Inducers)",
    quote: "The concomitant use of buprenorphine and CYP3A4 inducers can decrease the plasma concentration of buprenorphine",
    labelExample: "Rifampin, carbamazepine, phenytoin",
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PK", domain: "mat",
  }),
  row2({
    drugA: "buprenorphine", drugB: "atazanavir", queries: ["buprenorphine", "atazanavir"],
    labelDrug: "Suboxone (buprenorphine/naloxone) film", label: "suboxone", labelSection: "7 DRUG INTERACTIONS (Antiretrovirals: Protease inhibitors)",
    quote: "Symptoms of opioid excess have been found in post-marketing reports of patients receiving buprenorphine and atazanavir with and without ritonavir concomitantly.",
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PK", domain: "mat",
  }),
  row2({
    drugA: "buprenorphine", drugB: "phenelzine", queries: ["buprenorphine", "phenelzine"],
    labelDrug: "Suboxone (buprenorphine/naloxone) film", label: "suboxone", labelSection: "7 DRUG INTERACTIONS (Monoamine Oxidase Inhibitors)",
    quote: "The use of SUBOXONE sublingual film is not recommended for patients taking MAOIs or within 14 days of stopping such treatment.",
    labelExample: "phenelzine, tranylcypromine, linezolid",
    labelClass: "avoid", expectedFloor: "major", mechanism: "PD", domain: "maoi-opioid",
  }),
  // ── Naltrexone (oral tablets SPL; Vivitrol) ───────────────────────────
  row2({
    drugA: "naltrexone", drugB: "methadone", queries: ["naltrexone", "methadone"],
    labelDrug: "Naltrexone HCl tablets", label: "naltrexone", labelSection: "CONTRAINDICATIONS",
    quote: `${NALTREXONE_4} … Patients currently dependent on opioids, including those currently maintained on opiate agonists (e.g., methadone)`,
    labelClass: "contraindicated", expectedFloor: "major", mechanism: "PD", domain: "mat",
  }),
  row2({
    drugA: "naltrexone", drugB: "buprenorphine", queries: ["naltrexone", "buprenorphine"],
    labelDrug: "Naltrexone HCl tablets", label: "naltrexone", labelSection: "CONTRAINDICATIONS",
    quote: `${NALTREXONE_4} … Patients currently dependent on opioids, including those currently maintained on … partial agonists (e.g., buprenorphine).`,
    labelClass: "contraindicated", expectedFloor: "major", mechanism: "PD", domain: "mat",
  }),
  row2({
    drugA: "naltrexone", drugB: "oxycodone", queries: ["naltrexone", "oxycodone"],
    labelDrug: "Naltrexone HCl tablets", label: "naltrexone", labelSection: "CONTRAINDICATIONS",
    quote: `${NALTREXONE_4} … Patients receiving opioid analgesics.`,
    labelClass: "contraindicated", expectedFloor: "major", mechanism: "PD", domain: "mat",
    note: "Label names the class (opioid analgesics).",
  }),
  row2({
    drugA: "naltrexone", drugB: "hydrocodone", queries: ["vivitrol", "hydrocodone"],
    labelDrug: "Vivitrol (naltrexone ER injectable suspension)", label: "vivitrol", labelSection: "4 CONTRAINDICATIONS",
    quote: "VIVITROL is contraindicated in: … Patients receiving opioid analgesics",
    labelClass: "contraindicated", expectedFloor: "major", mechanism: "PD", domain: "mat",
    note: "Label names the class (opioid analgesics).",
  }),
  // ── Ketamine (Ketalar SPL) ────────────────────────────────────────────
  row2({
    drugA: "ketamine", drugB: "theophylline", queries: ["ketamine", "theophylline"],
    labelDrug: "Ketalar (ketamine)", label: "ketalar", labelSection: "7.1 Theophylline or Aminophylline",
    quote: "Concomitant administration of KETALAR and theophylline or aminophylline may lower the seizure threshold. Consider using an alternative to KETALAR in patients receiving theophylline or aminophylline.",
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PD", domain: "ketamine-clinic",
    note: "'Consider using an alternative' is weaker than 'avoid'; floor set at moderate.",
  }),
  row2({
    drugA: "ketamine", drugB: "lorazepam", queries: ["ketalar", "lorazepam"],
    labelDrug: "Ketalar (ketamine)", label: "ketalar", labelSection: "7.3 Benzodiazepines, Opioid Analgesics, Or Other CNS Depressants; 5.9",
    quote: "Concomitant use of ketamine with opioid analgesics, benzodiazepines, or other central nervous system (CNS) depressants … may result in profound sedation, respiratory depression, coma, and death",
    labelClass: "warning", expectedFloor: "major", mechanism: "PD", domain: "ketamine-clinic",
    note: "Floor is major because the statement names coma and death. Label names the class.",
  }),
  row2({
    drugA: "ketamine", drugB: "ethanol", queries: ["ketamine", "alcohol"],
    labelDrug: "Ketalar (ketamine)", label: "ketalar", labelSection: "7.3 Benzodiazepines, Opioid Analgesics, Or Other CNS Depressants; 5.9",
    quote: "Concomitant use of ketamine with … other central nervous system (CNS) depressants, including alcohol, may result in profound sedation, respiratory depression, coma, and death",
    labelClass: "warning", expectedFloor: "major", mechanism: "PD", domain: "ketamine-clinic",
  }),
  // ── Esketamine (Spravato SPL) ─────────────────────────────────────────
  row2({
    drugA: "esketamine", drugB: "alprazolam", queries: ["spravato", "alprazolam"],
    labelDrug: "Spravato (esketamine)", label: "spravato", labelSection: "7.1 Central Nervous System Depressants; 5.1",
    quote: SPRAVATO_7_1,
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PD", domain: "ketamine-clinic",
    note: "Monitor-level language (increased sedation). Label names the class.",
  }),
  row2({
    drugA: "esketamine", drugB: "ethanol", queries: ["esketamine", "alcohol"],
    labelDrug: "Spravato (esketamine)", label: "spravato", labelSection: "7.1 Central Nervous System Depressants; 5.1",
    quote: SPRAVATO_7_1,
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PD", domain: "ketamine-clinic",
  }),
  row2({
    drugA: "esketamine", drugB: "amphetamine", queries: ["esketamine", "amphetamine"],
    labelDrug: "Spravato (esketamine)", label: "spravato", labelSection: "7.2 Psychostimulants; 5.7",
    quote: SPRAVATO_7_2,
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PD", domain: "ketamine-clinic",
  }),
  row2({
    drugA: "esketamine", drugB: "methylphenidate", queries: ["esketamine", "methylphenidate"],
    labelDrug: "Spravato (esketamine)", label: "spravato", labelSection: "7.2 Psychostimulants; 5.7",
    quote: SPRAVATO_7_2,
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PD", domain: "ketamine-clinic",
  }),
  row2({
    drugA: "esketamine", drugB: "phenelzine", queries: ["esketamine", "phenelzine"],
    labelDrug: "Spravato (esketamine)", label: "spravato", labelSection: "7.3 Monoamine Oxidase Inhibitors (MAOIs); 5.7",
    quote: "Concomitant use with monoamine oxidase inhibitors (MAOIs) may increase blood pressure … Closely monitor blood pressure with concomitant use of SPRAVATO with MAOIs.",
    labelClass: "warning", expectedFloor: "moderate", mechanism: "PD", domain: "ketamine-clinic",
    note: "Label names the class (MAOIs).",
  }),
];

export const WAVE_1_COUNT = WAVE_1.length;
export const WAVE_2_COUNT = WAVE_2.length;
export const LABEL_GOLD_SET: GoldPair[] = [...WAVE_1, ...WAVE_2];

/**
 * Pairs where the engine currently sits BELOW `expectedFloor`.
 * For formulary owner (Grok Bot 5) review. Do not "fix" these by editing the
 * test; fix the catalog/engine in a separate PR and remove the id here (the
 * suite fails when a listed pair starts passing, so this list stays pruned).
 */
export const KNOWN_UNDERCALLS: readonly string[] = [
  // for formulary owner (Grok Bot 5) review
  // pimozide+fluoxetine / pimozide+paroxetine moved to KNOWN_CONTRAINDICATION_GAPS:
  // #58 added pimozide's FDA CYP2D6 major substrate role, so both now meet the major floor.
  // alosetron+fluvoxamine left this list: #58's CYP1A2 sensitive role plus the Lotronex pin
  // holds the pair at contraindicated.
  "thioridazine+fluvoxamine", // label: contraindicated (thioridazine; fluvoxamine 4) · engine: moderate
  // wave 2 (MAT / ketamine clinic), for formulary owner (Grok Bot 5) review
  "methadone+zidovudine", // label: warning, floor moderate (methadone 7: "could result in toxic effects") · engine: none at pair level
  "buprenorphine+phenelzine", // label: avoid, floor major (Suboxone 7: "not recommended" with MAOIs) · engine: moderate
  "esketamine+methylphenidate", // label: warning, floor moderate (Spravato 7.2: may increase blood pressure) · engine: none at pair level
];

/**
 * Pairs that meet the "major" floor but where the label says contraindicated and
 * the engine says major ("Serious concern") rather than contraindicated
 * ("Avoid together"). Informational, for formulary owner (Grok Bot 5) review.
 * Pinned by a test so the list is pruned when the engine changes.
 */
export const KNOWN_CONTRAINDICATION_GAPS: readonly string[] = [
  "pimozide+fluoxetine", // Prozac 4.2 contraindicated; #58 2D6 major substrate reaches major, not contraindicated
  "pimozide+paroxetine", // pimozide label contraindicated; #58 2D6 major substrate reaches major, not contraindicated
  "pimozide+fluvoxamine",
  "dronedarone+ketoconazole",
  "ergotamine+ritonavir",
  "rifampin+atazanavir",
  "voriconazole+rifampin",
  // wave 2: naltrexone labels say contraindicated; engine says major ("Serious concern")
  "naltrexone+methadone", // naltrexone tablets CONTRAINDICATIONS (opiate agonists, e.g., methadone)
  "naltrexone+buprenorphine", // naltrexone tablets CONTRAINDICATIONS (partial agonists, e.g., buprenorphine)
  "naltrexone+oxycodone", // naltrexone tablets CONTRAINDICATIONS (opioid analgesics)
  "naltrexone+hydrocodone", // Vivitrol 4 CONTRAINDICATIONS (opioid analgesics)
];

/** Drugs we looked for but the catalog does not carry (not forced into the set). */
export const NOT_IN_CATALOG: { drug: string; reason: string }[] = [
  { drug: "flibanserin", reason: "Not in catalog (searchDrugs returns nothing); label has CYP3A4-inhibitor contraindications but was not curated." },
  { drug: "cisapride", reason: "Not in catalog; named in the Norvir contraindication list but not curated." },
  { drug: "aminophylline", reason: "Not in catalog; named with theophylline on Ketalar 7.1. Wave 2 uses ketamine+theophylline instead." },
  {
    drug: "buprenorphine/naloxone",
    reason:
      "No separate combination row; 'suboxone' / 'zubsolv' resolve to the catalog 'buprenorphine' row, so wave-2 Suboxone-label pairs use that id.",
  },
];

/** Candidate pairs considered and dropped, with the reason. */
export const DROPPED_CANDIDATES: { pair: string; reason: string }[] = [
  {
    pair: "methadone / buprenorphine / fentanyl + strong CYP3A4 inhibitor or inducer",
    reason:
      "Wave 1: labels use monitor/consider-dose-change language, not contraindicated/avoid, so they failed the wave-1 rule. Wave 2 adds methadone and buprenorphine pairs under 'boxed-warning' / 'warning' with a label-supported floor; fentanyl not curated.",
  },
  {
    pair: "colchicine + clarithromycin",
    reason:
      "Biaxin: contraindicated only 'in patients with renal or hepatic impairment'. Not cleanly expressible as a two-drug regimen on the default host.",
  },
  {
    pair: "ketamine + any",
    reason:
      "Wave 1: Ketalar 4 CONTRAINDICATIONS lists no drug-interaction contraindication. Wave 2 anchors ketamine pairs on Ketalar 7.1 / 7.3 under 'warning'.",
  },
  {
    pair: "wave 2: methadone + St. John's wort / phenytoin / phenobarbital, other benzodiazepines, erythromycin, fluvoxamine, efavirenz, nevirapine",
    reason: "Named on the methadone label but trimmed to keep wave 2 near 30 without repeating the same mechanism.",
  },
  {
    pair: "wave 2: naltrexone + thioridazine",
    reason: "Naltrexone label reports lethargy and somnolence only (no avoid/monitor instruction); too weak to set a floor.",
  },
  {
    pair: "wave 2: esketamine + modafinil / armodafinil / tranylcypromine / opioids; buprenorphine + linezolid / tranylcypromine",
    reason: "Named on the label but trimmed as mechanism duplicates of pairs already in wave 2.",
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
