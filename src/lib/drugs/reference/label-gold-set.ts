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
 *   avoid / boxed-warning                    -> major ("Serious concern")
 *   contraindicated (naltrexone + a labeled opioid) -> contraindicated ("Avoid together")
 *   warning naming overdose / death          -> major
 *   warning with monitor / dose-change text  -> moderate ("Use care")
 *
 * Wave 3 is label-stated contraindications only, for drugs behind leftover
 * rule-only CYP findings: Korlym (mifepristone), Prezista (darunavir),
 * Prezcobix (darunavir/cobicistat), Reyataz (atazanavir), and Evotaz
 * (atazanavir/cobicistat). Each named drug in section 4 that the catalog
 * carries is a pair, including combo rows. Renal/hepatic-only lines, and
 * Reyataz lines qualified "with ritonavir", are skipped. Floor is major
 * ("Serious concern"); the label class is contraindicated.
 *
 * Wave 4 is label-stated contraindications only, from the current DailyMed v2
 * SPL for clarithromycin tablets, Sporanox, Noxafil, Norvir, Paxlovid, and
 * Kaletra. Each unconditional named drug the catalog carries is a pair.
 * Colchicine, venetoclax, and voriconazole stay out where the line is
 * conditional (renal or hepatic impairment, or a dose-dependent line). Oral
 * ketoconazole is not a source. Pairs already in waves 1–3 are not repeated.
 * Floor is major ("Serious concern"); the label class is contraindicated.
 *
 * Wave 5 is label-stated contraindications from the current Geodon
 * (ziprasidone) SPL. Section 4.1 names drugs ziprasidone should not be given
 * with, under the contraindication. Section 4.3 contraindicates MAOIs,
 * including linezolid and intravenous methylene blue. Pairs already in waves
 * 1–4 are not repeated. The floor is contraindicated ("Avoid together")
 * because a label pin holds the engine there. No new CYP grade.
 *
 * Wave 6 is label-stated contraindications from the current Recorlev
 * (levoketoconazole) SPL, retrieved 2026-10-05. Section 4 contraindicates
 * drugs that cause QT prolongation associated with ventricular arrhythmias,
 * and certain sensitive CYP3A4 or CYP3A4 and P-gp substrates (see 7.1).
 * Table 6 in 7.1 says use with the QT row's drugs "is contraindicated" and
 * names them; only catalog drugs named there are pairs. Table 6's
 * sensitive-substrate row says "contraindicated or not recommended" without
 * saying which drug is which, so it is not used. The metabolizer-conditional
 * eliglustat line is not used. The floor is contraindicated ("Avoid
 * together") because a label pin holds the engine there. No new CYP grade.
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
  | "ketamine-clinic"
  | "endocrine"
  | "hiv";

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
  retrieved: "2026-09-27" | "2026-10-02" | "2026-10-03" | "2026-10-05" | "2026-10-12" | "2026-10-19";
  labelClass: LabelClass;
  /** Minimum engine severity for the pair (pair-level findings only). */
  expectedFloor: Severity;
  /** Stricter expectation: the label says contraindicated, so ideally the desk says so too. */
  expectContraindicated: boolean;
  mechanism: "PK" | "PD" | "PK+PD";
  domain: GoldDomain;
  note?: string;
  /** 1 = original set; 2 = MAT / ketamine-clinic wave; 3 = Korlym / HIV PIs; 4 = clarithromycin, azoles, Norvir, Paxlovid, Kaletra; 5 = Geodon; 6 = Recorlev; 7 = Tikosyn, Tracleer, Adempas, Xenazine, Austedo, Mavyret, Edurant, Biktarvy, Tivicay, Apokyn, Relpax, Vosevi. */
  wave: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9 | 10 | 11 | 12 | 13 | 14;
}

const DM = (setid: string) => `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`;

export const LABEL_SETIDS = {
  zocor: "8f55d5de-5a4f-4a39-8c84-c53976dd6af9",
  lovastatin: "9438d8a0-ca5b-4676-aab9-d0241ccff6c9",
  zanaflex: "60c27d35-7349-4fc6-86ad-70fffdbe3e08",
  pimozide: "70b079e2-a1f7-4a93-8685-d60a4d7c1280",
  fluvoxamine: "6eeb14df-6fcf-a737-5359-5744eb4accea",
  prozac: "c88f33ed-6dfb-4c5e-bc01-d8e36dd97299",
  // ProvayBlue (methylene blue) injection. DailyMed v2 SPL version 28, published 2025-06-12.
  provayblue: "4f6848e5-35ed-4046-b13c-3032b5ba3232",
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
  // wave 3 (Korlym / HIV protease inhibitors), DailyMed v2 SPL retrieved 2026-10-02
  korlym: "542f3fae-8bc8-4f00-9228-e4b66c9ad6a9",
  prezista: "814301f9-c990-46a5-b481-2879a521a16f",
  prezcobix: "9c38fdb6-d0ba-4f16-a0e3-85d9ec334d9f",
  reyataz: "165cff62-b284-4a27-a65d-9ec8a5bfcdd8",
  evotaz: "83db29d7-5d85-49d6-8cb6-740473365cf8",
  // wave 4, DailyMed v2 SPL retrieved 2026-10-02.
  // clarithromycin tablets (effective 2026-06-24). Not the 2012 Biaxin brand SPL.
  clarithromycin: "9d5848f0-e9f0-4112-a7ca-bcc8ea2e69c6",
  sporanox: "a4d555fa-787c-40fb-bb7d-b0d4f7318fd0",
  noxafil: "b073b082-7b57-4423-8c06-4fd4263d6f84",
  paxlovid: "8a99d6d6-fd9e-45bb-b1bf-48c7f761232a",
  kaletra: "8290add3-4449-4e58-6c97-8fe1eec972e3",
  // wave 5, DailyMed v2 SPL retrieved 2026-10-03.
  // Geodon capsules and injection. Effective time 2025-01-13. Published 2026-09-18.
  geodon: "8326928a-2cb6-4f7f-9712-03a425a14c37",
  // wave 6, DailyMed v2 SPL retrieved 2026-10-05.
  // Recorlev (levoketoconazole) tablets. SPL version 13, effective 2026-03-10, published 2026-06-26.
  recorlev: "d4c5fead-bc4a-fb02-e053-2a95a90ae4fc",

// wave 7, DailyMed v2 SPL retrieved 2026-10-12. Section 4 (Contraindications) text only.
  tikosyn: "02438044-d6a3-49e9-a1ac-3aad21ef2c8c",
  tracleer: "749e42fb-2fe0-45dd-9268-b43bb3f4081c",
  adempas: "7b57509a-3d5d-41d4-8fed-1471e26372a3",
  xenazine: "ac768bab-8afa-4446-bc7f-caeeffec0cda",
  austedo: "7ea3c60a-45c7-44cc-afc2-d87fa53993c0",
  mavyret: "7bf99777-0401-9095-8645-16c6e907fcc0",
  edurant: "03880372-2c68-45c6-a53a-f420c49541d6",
  biktarvy: "664cb8f0-1f65-441b-b0d9-ba3d798be309",
  tivicay: "63df5af3-b8ac-4e76-9830-2dbb340af922",
  apokyn: "3235535d-9ef9-4657-8b2a-176a807d091c",
  relpax: "2a501dbd-3ea8-47e4-9fcb-07035b8c8c9e",
  vosevi: "17ffc094-8ca7-45d2-80d8-fd043bc9a221",
  bixlenvo: "072a3c7e-33fb-4a87-ba21-3d8dad3f5c48",
  zokinvy: "97391d0c-943e-4c5a-8423-68e163aa7f50",
  tegretol: "8d409411-aa9f-4f3a-a52c-fbcb0c3ec053",
  "ranolazine-er": "00979fb3-d70f-493d-94ca-2914cbadaa9d",
  "dhe-injection": "07a9112c-8c04-4849-8cb3-9463f58731d2",
  movantik: "28596788-b73f-4247-85fc-3105f51fff5a",
  "bupropion-ir": "334e5635-e4cc-cf2a-e063-6294a90ae1e1",
  contrave: "485ff360-32c8-11df-928b-0002a5d5c51b",
  revatio: "3bb9363e-b28d-4019-8aae-539233dca214",
  // wave 11, DailyMed v2 SPL retrieved 2026-10-12.
  xadago: "c4d65f28-983f-42b4-bb23-023ae0fe81b2",
  // wave 10, DailyMed v2 SPL retrieved 2026-10-12.
  celexa: "4259d9b1-de34-43a4-85a8-41dd214e9177",
  lexapro: "13bb8267-1cab-43e5-acae-55a4d957630a",
  viibryd: "4c55ccfb-c4cf-11df-851a-0800200c9a66",
  fetzima: "f371258d-91b3-4b6a-ac99-434a1964c3af",
  savella: "16a4a314-f97e-4e91-95e9-576a3773d284",
  marplan: "95fde749-44ad-4668-86c4-0ff17bca0074",
  // wave 9, DailyMed v2 SPL retrieved 2026-10-12.
  zoloft: "fda754f6-d0f3-4dce-a17a-927d64f912f7",
  paxil: "ef3b5cbe-f9e1-c1ac-79da-cfe14e3a7e7e",
  "effexor-xr": "c848a5d8-ba94-4c84-80e3-0bf35fb8e32e",
  pristiq: "0f43610c-f290-46ea-d186-4f998ed99fce",
  cymbalta: "00acd9e9-b26a-4626-949e-112ecd2f27e6",
  trintellix: "1a5b68e2-14d0-419d-9ec6-1ca97145e838",
  remeron: "98ad1917-a094-44f5-a28f-a64a8cfcd887",
  trazodone: "4006d439-e2de-4590-82e9-fc9d56e3ec1b",
  anafranil: "4074b555-7635-41a9-809d-fae3b3610059",
  buspirone: "7c9eafb9-9ce1-4b28-900c-8fcb4b23424e",
  "adderall-xr": "aff45863-ffe1-4d4f-8acf-c7081512a6c0",
  vyvanse: "704e4378-ca83-445c-8b45-3cfa51c1ecad",
  azilect: "a40d0e73-3f9f-4b01-979d-402c9cdaeb60",
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
  expectedFloor: Extract<Severity, "contraindicated" | "major" | "moderate">;
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
    drugA: "fluoxetine", drugB: "methylene-blue", queries: ["fluoxetine", "methylene blue"],
    labelDrug: "ProvayBlue (methylene blue injection)", label: "provayblue",
    labelSection: "Boxed Warning (Serotonin Syndrome with Concomitant Use of Serotonergic Drugs and Opioids)",
    quote: "Avoid concomitant use of PROVAYBLUE with selective serotonin reuptake inhibitors (SSRIs), serotonin norepinephrine reuptake inhibitors (SNRIs), monoamine oxidase inhibitors (MAOIs) and opioids.",
    labelClass: "avoid", mechanism: "PD", domain: "psychiatry",
    note: "Boxed warning names SSRIs as a class and says avoid. Section 4 does not list serotonergic drugs. Fluoxetine is the catalog SSRI.",
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
    labelClass: "contraindicated", expectedFloor: "contraindicated", mechanism: "PD", domain: "mat",
  }),
  row2({
    drugA: "naltrexone", drugB: "buprenorphine", queries: ["naltrexone", "buprenorphine"],
    labelDrug: "Naltrexone HCl tablets", label: "naltrexone", labelSection: "CONTRAINDICATIONS",
    quote: `${NALTREXONE_4} … Patients currently dependent on opioids, including those currently maintained on … partial agonists (e.g., buprenorphine).`,
    labelClass: "contraindicated", expectedFloor: "contraindicated", mechanism: "PD", domain: "mat",
  }),
  row2({
    drugA: "naltrexone", drugB: "oxycodone", queries: ["naltrexone", "oxycodone"],
    labelDrug: "Naltrexone HCl tablets", label: "naltrexone", labelSection: "CONTRAINDICATIONS",
    quote: `${NALTREXONE_4} … Patients receiving opioid analgesics.`,
    labelClass: "contraindicated", expectedFloor: "contraindicated", mechanism: "PD", domain: "mat",
    note: "Label names the class (opioid analgesics).",
  }),
  row2({
    drugA: "naltrexone", drugB: "hydrocodone", queries: ["vivitrol", "hydrocodone"],
    labelDrug: "Vivitrol (naltrexone ER injectable suspension)", label: "vivitrol", labelSection: "4 CONTRAINDICATIONS",
    quote: "VIVITROL is contraindicated in: … Patients receiving opioid analgesics",
    labelClass: "contraindicated", expectedFloor: "contraindicated", mechanism: "PD", domain: "mat",
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


/** Wave 3 row: label says contraindicated. Floor stays major; exact match is separate. */
function row3(r: Row): GoldPair {
  const { label, paraphrased, ...rest } = r;
  return {
    id: `${r.drugA}+${r.drugB}`,
    ...rest,
    paraphrased: paraphrased ?? false,
    url: DM(LABEL_SETIDS[label]),
    retrieved: "2026-10-02",
    expectedFloor: "major",
    expectContraindicated: r.labelClass === "contraindicated",
    wave: 3,
  };
}

const KORLYM_4 =
  "KORLYM is contraindicated in: … Patients taking drugs metabolized by CYP3A such as simvastatin, lovastatin";
const KORLYM_NTI =
  "such as cyclosporine, dihydroergotamine, ergotamine, fentanyl, pimozide, quinidine, sirolimus, and tacrolimus";
const PREZISTA_4 =
  "Examples of these drugs and other contraindicated drugs (which may lead to reduced efficacy of darunavir) are listed below";
const PREZCOBIX_4 =
  "Examples of drugs that are contraindicated for co-administration with PREZCOBIX";
const REYATAZ_4 =
  "Coadministration is contraindicated with, but not limited to, the following drugs";
const EVOTAZ_4 =
  "The concomitant use of EVOTAZ and the following drugs in Table 1, are contraindicated";
const SJW_CURLY = "St. John\u2019s wort";

const WAVE_3: GoldPair[] = [
  // ── Korlym (mifepristone): 4 CONTRAINDICATIONS, named CYP3A victims ──
  row3({
    drugA: "mifepristone", drugB: "simvastatin", queries: ["korlym", "simvastatin"],
    labelDrug: "Korlym (mifepristone)", label: "korlym", labelSection: "4 CONTRAINDICATIONS",
    quote: KORLYM_4,
    labelClass: "contraindicated", mechanism: "PK", domain: "endocrine",
  }),
  row3({
    drugA: "mifepristone", drugB: "lovastatin", queries: ["korlym", "lovastatin"],
    labelDrug: "Korlym (mifepristone)", label: "korlym", labelSection: "4 CONTRAINDICATIONS",
    quote: KORLYM_4,
    labelClass: "contraindicated", mechanism: "PK", domain: "endocrine",
  }),
  row3({
    drugA: "mifepristone", drugB: "cyclosporine", queries: ["korlym", "cyclosporine"],
    labelDrug: "Korlym (mifepristone)", label: "korlym", labelSection: "4 CONTRAINDICATIONS",
    quote: KORLYM_4,
    labelExample: KORLYM_NTI,
    labelClass: "contraindicated", mechanism: "PK", domain: "endocrine",
  }),
  row3({
    drugA: "mifepristone", drugB: "dihydroergotamine", queries: ["korlym", "dihydroergotamine"],
    labelDrug: "Korlym (mifepristone)", label: "korlym", labelSection: "4 CONTRAINDICATIONS",
    quote: KORLYM_4,
    labelExample: KORLYM_NTI,
    labelClass: "contraindicated", mechanism: "PK", domain: "endocrine",
  }),
  row3({
    drugA: "mifepristone", drugB: "ergotamine", queries: ["korlym", "ergotamine"],
    labelDrug: "Korlym (mifepristone)", label: "korlym", labelSection: "4 CONTRAINDICATIONS",
    quote: KORLYM_4,
    labelExample: KORLYM_NTI,
    labelClass: "contraindicated", mechanism: "PK", domain: "endocrine",
  }),
  row3({
    drugA: "mifepristone", drugB: "fentanyl", queries: ["korlym", "fentanyl"],
    labelDrug: "Korlym (mifepristone)", label: "korlym", labelSection: "4 CONTRAINDICATIONS",
    quote: KORLYM_4,
    labelExample: KORLYM_NTI,
    labelClass: "contraindicated", mechanism: "PK", domain: "endocrine",
  }),
  row3({
    drugA: "mifepristone", drugB: "pimozide", queries: ["korlym", "pimozide"],
    labelDrug: "Korlym (mifepristone)", label: "korlym", labelSection: "4 CONTRAINDICATIONS",
    quote: KORLYM_4,
    labelExample: KORLYM_NTI,
    labelClass: "contraindicated", mechanism: "PK", domain: "endocrine",
  }),
  row3({
    drugA: "mifepristone", drugB: "quinidine", queries: ["korlym", "quinidine"],
    labelDrug: "Korlym (mifepristone)", label: "korlym", labelSection: "4 CONTRAINDICATIONS",
    quote: KORLYM_4,
    labelExample: KORLYM_NTI,
    labelClass: "contraindicated", mechanism: "PK", domain: "endocrine",
  }),
  row3({
    drugA: "mifepristone", drugB: "sirolimus", queries: ["korlym", "sirolimus"],
    labelDrug: "Korlym (mifepristone)", label: "korlym", labelSection: "4 CONTRAINDICATIONS",
    quote: KORLYM_4,
    labelExample: KORLYM_NTI,
    labelClass: "contraindicated", mechanism: "PK", domain: "endocrine",
  }),
  row3({
    drugA: "mifepristone", drugB: "tacrolimus", queries: ["korlym", "tacrolimus"],
    labelDrug: "Korlym (mifepristone)", label: "korlym", labelSection: "4 CONTRAINDICATIONS",
    quote: KORLYM_4,
    labelExample: KORLYM_NTI,
    labelClass: "contraindicated", mechanism: "PK", domain: "endocrine",
  }),
  // ── Prezista (darunavir): 4 CONTRAINDICATIONS. Colchicine is renal/hepatic only (skipped). ──
  row3({
    drugA: "darunavir", drugB: "alfuzosin", queries: ["prezista", "alfuzosin"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Alpha 1-adrenoreceptor antagonist: alfuzosin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "rifampin", queries: ["prezista", "rifampin"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Antimycobacterial: rifampin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "lurasidone", queries: ["prezista", "lurasidone"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Antipsychotics: lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "pimozide", queries: ["prezista", "pimozide"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Antipsychotics: lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "dronedarone", queries: ["prezista", "dronedarone"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Cardiac Disorders: dronedarone, ivabradine, ranolazine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "ivabradine", queries: ["prezista", "ivabradine"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Cardiac Disorders: dronedarone, ivabradine, ranolazine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "ranolazine", queries: ["prezista", "ranolazine"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Cardiac Disorders: dronedarone, ivabradine, ranolazine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "dihydroergotamine", queries: ["prezista", "dihydroergotamine"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Ergot derivatives, e.g. dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "ergotamine", queries: ["prezista", "ergotamine"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Ergot derivatives, e.g. dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "methylergonovine", queries: ["prezista", "methylergonovine"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Ergot derivatives, e.g. dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "st-johns-wort", queries: ["prezista", "st johns wort"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "St. John's wort",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "grazoprevir-elbasvir", queries: ["prezista", "zepatier"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Hepatitis C direct acting antiviral: elbasvir/grazoprevir",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "lovastatin", queries: ["prezista", "lovastatin"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Lipid modifying agents: lomitapide, lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "simvastatin", queries: ["prezista", "simvastatin"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Lipid modifying agents: lomitapide, lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "naloxegol", queries: ["prezista", "naloxegol"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "Opioid Antagonist: naloxegol",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  row3({
    drugA: "darunavir", drugB: "sildenafil-pah", queries: ["prezista", "sildenafil pah"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "sildenafil when used for treatment of pulmonary arterial hypertension",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone. Contraindication is for pulmonary arterial hypertension, not erectile dysfunction. Paired to the PAH catalog row.",
  }),
  row3({
    drugA: "darunavir", drugB: "midazolam", queries: ["prezista", "midazolam"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "orally administered midazolam, triazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone. Contraindication is for orally administered midazolam. Parenteral use is a different statement. The catalog row is not split by route.",
  }),
  row3({
    drugA: "darunavir", drugB: "triazolam", queries: ["prezista", "triazolam"],
    labelDrug: "Prezista (darunavir)", label: "prezista", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZISTA_4,
    labelExample: "orally administered midazolam, triazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Stated for PREZISTA co-administered with ritonavir. The catalog row is darunavir alone.",
  }),
  // ── Prezcobix (darunavir/cobicistat combo row) ──
  row3({
    drugA: "darunavir-cobicistat", drugB: "alfuzosin", queries: ["prezcobix", "alfuzosin"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Alpha 1-adrenoreceptor antagonist: alfuzosin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "carbamazepine", queries: ["prezcobix", "carbamazepine"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Anticonvulsants: carbamazepine, phenobarbital, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "phenobarbital", queries: ["prezcobix", "phenobarbital"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Anticonvulsants: carbamazepine, phenobarbital, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "phenytoin", queries: ["prezcobix", "phenytoin"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Anticonvulsants: carbamazepine, phenobarbital, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "rifampin", queries: ["prezcobix", "rifampin"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Antimycobacterial: rifampin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "lurasidone", queries: ["prezcobix", "lurasidone"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Antipsychotics: lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "pimozide", queries: ["prezcobix", "pimozide"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Antipsychotics: lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "dronedarone", queries: ["prezcobix", "dronedarone"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Cardiac Disorders: dronedarone, ivabradine, ranolazine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "ivabradine", queries: ["prezcobix", "ivabradine"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Cardiac Disorders: dronedarone, ivabradine, ranolazine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "ranolazine", queries: ["prezcobix", "ranolazine"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Cardiac Disorders: dronedarone, ivabradine, ranolazine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "dihydroergotamine", queries: ["prezcobix", "dihydroergotamine"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Ergot derivatives, e.g. dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "ergotamine", queries: ["prezcobix", "ergotamine"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Ergot derivatives, e.g. dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "methylergonovine", queries: ["prezcobix", "methylergonovine"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Ergot derivatives, e.g. dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "st-johns-wort", queries: ["prezcobix", "st johns wort"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "St. John's wort",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "grazoprevir-elbasvir", queries: ["prezcobix", "zepatier"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Hepatitis C direct acting antiviral: elbasvir/grazoprevir",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "lovastatin", queries: ["prezcobix", "lovastatin"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Lipid modifying agents: lomitapide, lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "simvastatin", queries: ["prezcobix", "simvastatin"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Lipid modifying agents: lomitapide, lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "naloxegol", queries: ["prezcobix", "naloxegol"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "Opioid Antagonist: naloxegol",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "sildenafil-pah", queries: ["prezcobix", "sildenafil pah"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "sildenafil when used for treatment of pulmonary arterial hypertension",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire. Contraindication is for pulmonary arterial hypertension, not erectile dysfunction. Paired to the PAH catalog row.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "midazolam", queries: ["prezcobix", "midazolam"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "orally administered midazolam, triazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire. Contraindication is for orally administered midazolam. Parenteral use is a different statement. The catalog row is not split by route.",
  }),
  row3({
    drugA: "darunavir-cobicistat", drugB: "triazolam", queries: ["prezcobix", "triazolam"],
    labelDrug: "Prezcobix (darunavir/cobicistat)", label: "prezcobix", labelSection: "4 CONTRAINDICATIONS",
    quote: PREZCOBIX_4,
    labelExample: "orally administered midazolam, triazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Prezcobix catalog row has no enzyme roles, so CYP rules on darunavir or cobicistat do not fire.",
  }),
  // ── Reyataz (atazanavir). rifampin+atazanavir is already wave 1. Ritonavir-qualified lines skipped. ──
  row3({
    drugA: "atazanavir", drugB: "alfuzosin", queries: ["reyataz", "alfuzosin"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Alpha 1-adrenoreceptor antagonist Alfuzosin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "carbamazepine", queries: ["reyataz", "carbamazepine"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Anticonvulsants Carbamazepine, phenobarbital, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "phenobarbital", queries: ["reyataz", "phenobarbital"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Anticonvulsants Carbamazepine, phenobarbital, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "phenytoin", queries: ["reyataz", "phenytoin"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Anticonvulsants Carbamazepine, phenobarbital, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "apalutamide", queries: ["reyataz", "apalutamide"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Antineoplastics Apalutamide, encorafenib, irinotecan, ivosidenib",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "encorafenib", queries: ["reyataz", "encorafenib"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Antineoplastics Apalutamide, encorafenib, irinotecan, ivosidenib",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "irinotecan", queries: ["reyataz", "irinotecan"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Antineoplastics Apalutamide, encorafenib, irinotecan, ivosidenib",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "ivosidenib", queries: ["reyataz", "ivosidenib"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Antineoplastics Apalutamide, encorafenib, irinotecan, ivosidenib",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "pimozide", queries: ["reyataz", "pimozide"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Antipsychotics Lurasidone (with ritonavir), pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Pimozide is listed without a ritonavir qualifier. Lurasidone on the same line is only with ritonavir and is not its own pair.",
  }),
  row3({
    drugA: "atazanavir", drugB: "midazolam", queries: ["reyataz", "midazolam"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Benzodiazepines Orally administered midazolam a , triazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Contraindication is for orally administered midazolam. Parenteral use is a different statement. The catalog row is not split by route.",
  }),
  row3({
    drugA: "atazanavir", drugB: "triazolam", queries: ["reyataz", "triazolam"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Benzodiazepines Orally administered midazolam a , triazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "dihydroergotamine", queries: ["reyataz", "dihydroergotamine"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Ergot Derivatives Dihydroergotamine, ergonovine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "ergotamine", queries: ["reyataz", "ergotamine"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Ergot Derivatives Dihydroergotamine, ergonovine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "methylergonovine", queries: ["reyataz", "methylergonovine"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Ergot Derivatives Dihydroergotamine, ergonovine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "grazoprevir-elbasvir", queries: ["reyataz", "zepatier"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Hepatitis C Direct-Acting Antivirals Elbasvir/grazoprevir; glecaprevir/pibrentasvir",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "glecaprevir-pibrentasvir", queries: ["reyataz", "mavyret"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Hepatitis C Direct-Acting Antivirals Elbasvir/grazoprevir; glecaprevir/pibrentasvir",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "st-johns-wort", queries: ["reyataz", "st johns wort"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: SJW_CURLY,
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "lovastatin", queries: ["reyataz", "lovastatin"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Lipid-Modifying Agents: Lomitapide, lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "simvastatin", queries: ["reyataz", "simvastatin"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Lipid-Modifying Agents: Lomitapide, lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row3({
    drugA: "atazanavir", drugB: "sildenafil-pah", queries: ["reyataz", "sildenafil pah"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Sildenafil b when dosed as REVATIO ® for the treatment of pulmonary arterial hypertension",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Contraindication is for pulmonary arterial hypertension, not erectile dysfunction. Paired to the PAH catalog row.",
  }),
  row3({
    drugA: "atazanavir", drugB: "nevirapine", queries: ["reyataz", "nevirapine"],
    labelDrug: "Reyataz (atazanavir)", label: "reyataz", labelSection: "4 CONTRAINDICATIONS (Table 6)",
    quote: REYATAZ_4,
    labelExample: "Non-nucleoside Reverse Transcriptase Inhibitors Nevirapine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  // ── Evotaz (atazanavir/cobicistat combo row). Colchicine is hepatic/renal only (skipped). ──
  row3({
    drugA: "atazanavir-cobicistat", drugB: "alfuzosin", queries: ["evotaz", "alfuzosin"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Alpha 1-adrenoreceptor antagonist alfuzosin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "ranolazine", queries: ["evotaz", "ranolazine"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Antianginal ranolazine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "dronedarone", queries: ["evotaz", "dronedarone"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Antiarrhythmics dronedarone",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "carbamazepine", queries: ["evotaz", "carbamazepine"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Anticonvulsants carbamazepine, phenobarbital, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "phenobarbital", queries: ["evotaz", "phenobarbital"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Anticonvulsants carbamazepine, phenobarbital, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "phenytoin", queries: ["evotaz", "phenytoin"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Anticonvulsants carbamazepine, phenobarbital, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "rifampin", queries: ["evotaz", "rifampin"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Antimycobacterials rifampin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "apalutamide", queries: ["evotaz", "apalutamide"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Antineoplastics apalutamide, encorafenib, irinotecan, ivosidenib",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "encorafenib", queries: ["evotaz", "encorafenib"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Antineoplastics apalutamide, encorafenib, irinotecan, ivosidenib",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "irinotecan", queries: ["evotaz", "irinotecan"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Antineoplastics apalutamide, encorafenib, irinotecan, ivosidenib",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "ivosidenib", queries: ["evotaz", "ivosidenib"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Antineoplastics apalutamide, encorafenib, irinotecan, ivosidenib",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "lurasidone", queries: ["evotaz", "lurasidone"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Antipsychotics lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "pimozide", queries: ["evotaz", "pimozide"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Antipsychotics lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "dihydroergotamine", queries: ["evotaz", "dihydroergotamine"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Ergot Derivatives dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "ergotamine", queries: ["evotaz", "ergotamine"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Ergot Derivatives dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "methylergonovine", queries: ["evotaz", "methylergonovine"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Ergot Derivatives dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "grazoprevir-elbasvir", queries: ["evotaz", "zepatier"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Hepatitis C Direct-Acting Antivirals elbasvir/grazoprevir; glecaprevir/pibrentasvir",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "glecaprevir-pibrentasvir", queries: ["evotaz", "mavyret"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Hepatitis C Direct-Acting Antivirals elbasvir/grazoprevir; glecaprevir/pibrentasvir",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "st-johns-wort", queries: ["evotaz", "st johns wort"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: SJW_CURLY,
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "drospirenone", queries: ["evotaz", "drospirenone"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "drospirenone/ethinyl estradiol",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire. Table 1 names drospirenone/ethinyl estradiol. Drug Interactions ties the contraindication to drospirenone-associated hyperkalemia.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "ethinyl-estradiol", queries: ["evotaz", "ethinyl estradiol"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "drospirenone/ethinyl estradiol",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire. Table 1 names drospirenone/ethinyl estradiol. No combo row; Yaz resolves to this ethinyl estradiol row.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "lovastatin", queries: ["evotaz", "lovastatin"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Lipid-modifying Agents lomitapide, lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "simvastatin", queries: ["evotaz", "simvastatin"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Lipid-modifying Agents lomitapide, lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "nevirapine", queries: ["evotaz", "nevirapine"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Non-nucleoside Reverse Transcriptase Inhibitor nevirapine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "sildenafil-pah", queries: ["evotaz", "sildenafil pah"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "sildenafil a when administered for the treatment of pulmonary arterial hypertension",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire. Contraindication is for pulmonary arterial hypertension, not erectile dysfunction. Paired to the PAH catalog row.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "triazolam", queries: ["evotaz", "triazolam"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Sedative/hypnotics triazolam, orally administered midazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire.",
  }),
  row3({
    drugA: "atazanavir-cobicistat", drugB: "midazolam", queries: ["evotaz", "midazolam"],
    labelDrug: "Evotaz (atazanavir/cobicistat)", label: "evotaz", labelSection: "4 CONTRAINDICATIONS (Table 1)",
    quote: EVOTAZ_4,
    labelExample: "Sedative/hypnotics triazolam, orally administered midazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Evotaz catalog row has no enzyme roles, so CYP rules on atazanavir or cobicistat do not fire. Contraindication is for orally administered midazolam. Parenteral use is a different statement. The catalog row is not split by route.",
  }),
];

/** Wave 4 row: label says contraindicated. Floor stays major; exact match is separate. */
function row4(r: Row): GoldPair {
  const { label, paraphrased, ...rest } = r;
  return {
    id: `${r.drugA}+${r.drugB}`,
    ...rest,
    paraphrased: paraphrased ?? false,
    url: DM(LABEL_SETIDS[label]),
    retrieved: "2026-10-02",
    expectedFloor: "major",
    expectContraindicated: r.labelClass === "contraindicated",
    wave: 4,
  };
}

const WAVE_4: GoldPair[] = [
  // ── Clarithromycin tablets: 4 CONTRAINDICATIONS ──
  row4({
    drugA: "clarithromycin", drugB: "ergotamine", queries: ["biaxin", "ergotamine"],
    labelDrug: "Clarithromycin tablets", label: "clarithromycin", labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant administration of clarithromycin and ergotamine or dihydroergotamine is contraindicated",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Quotes are from the current clarithromycin tablets SPL (effective 2026-06-24). The Biaxin brand SPL on DailyMed is effective 2012-02-22 and is not this text.",
  }),
  row4({
    drugA: "clarithromycin", drugB: "dihydroergotamine", queries: ["biaxin", "dihydroergotamine"],
    labelDrug: "Clarithromycin tablets", label: "clarithromycin", labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant administration of clarithromycin and ergotamine or dihydroergotamine is contraindicated",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Quotes are from the current clarithromycin tablets SPL (effective 2026-06-24). The Biaxin brand SPL on DailyMed is effective 2012-02-22 and is not this text.",
  }),
  row4({
    drugA: "clarithromycin", drugB: "lurasidone", queries: ["biaxin", "lurasidone"],
    labelDrug: "Clarithromycin tablets", label: "clarithromycin", labelSection: "4 CONTRAINDICATIONS",
    quote: "and lurasidone is contraindicated since it may result in an increase in lurasidone exposure",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Quotes are from the current clarithromycin tablets SPL (effective 2026-06-24). The Biaxin brand SPL on DailyMed is effective 2012-02-22 and is not this text.",
  }),
  // ── Sporanox (itraconazole): CONTRAINDICATIONS ──
  row4({
    drugA: "itraconazole", drugB: "methadone", queries: ["sporanox", "methadone"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "methadone",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "disopyramide", queries: ["sporanox", "disopyramide"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "disopyramide",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "dofetilide", queries: ["sporanox", "dofetilide"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "dofetilide",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "dronedarone", queries: ["sporanox", "dronedarone"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "dronedarone",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "quinidine", queries: ["sporanox", "quinidine"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "isavuconazole", queries: ["sporanox", "isavuconazole"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "isavuconazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Label says isavuconazole. The catalog row is isavuconazonium.",
  }),
  row4({
    drugA: "itraconazole", drugB: "dihydroergotamine", queries: ["sporanox", "dihydroergotamine"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "dihydroergotamine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "ergotamine", queries: ["sporanox", "ergotamine"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "ergotamine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "methylergonovine", queries: ["sporanox", "methylergonovine"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "irinotecan", queries: ["sporanox", "irinotecan"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "irinotecan",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "lurasidone", queries: ["sporanox", "lurasidone"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "lurasidone",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "midazolam", queries: ["sporanox", "midazolam"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "oral midazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Label says oral midazolam. The catalog row is not split by route.",
  }),
  row4({
    drugA: "itraconazole", drugB: "pimozide", queries: ["sporanox", "pimozide"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "triazolam", queries: ["sporanox", "triazolam"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "triazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "felodipine", queries: ["sporanox", "felodipine"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "felodipine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "nisoldipine", queries: ["sporanox", "nisoldipine"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "nisoldipine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "ivabradine", queries: ["sporanox", "ivabradine"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "ivabradine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "ranolazine", queries: ["sporanox", "ranolazine"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "ranolazine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "eplerenone", queries: ["sporanox", "eplerenone"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "eplerenone",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "naloxegol", queries: ["sporanox", "naloxegol"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "naloxegol",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "lovastatin", queries: ["sporanox", "lovastatin"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "lovastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "avanafil", queries: ["sporanox", "avanafil"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "avanafil",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "ticagrelor", queries: ["sporanox", "ticagrelor"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "ticagrelor",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "finerenone", queries: ["sporanox", "finerenone"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "finerenone",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "itraconazole", drugB: "voclosporin", queries: ["sporanox", "voclosporin"],
    labelDrug: "Sporanox (itraconazole)", label: "sporanox", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of a number of CYP3A4 substrates are contraindicated with SPORANOX®.",
    labelExample: "voclosporin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  // ── Noxafil (posaconazole): 4 CONTRAINDICATIONS ──
  row4({
    drugA: "posaconazole", drugB: "sirolimus", queries: ["noxafil", "sirolimus"],
    labelDrug: "Noxafil (posaconazole)", label: "noxafil", labelSection: "4 CONTRAINDICATIONS",
    quote: "Noxafil is contraindicated with sirolimus.",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "posaconazole", drugB: "pimozide", queries: ["noxafil", "pimozide"],
    labelDrug: "Noxafil (posaconazole)", label: "noxafil", labelSection: "4 CONTRAINDICATIONS",
    quote: "Noxafil is contraindicated with CYP3A4 substrates that prolong the QT interval.",
    labelExample: "pimozide and quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "posaconazole", drugB: "quinidine", queries: ["noxafil", "quinidine"],
    labelDrug: "Noxafil (posaconazole)", label: "noxafil", labelSection: "4 CONTRAINDICATIONS",
    quote: "Noxafil is contraindicated with CYP3A4 substrates that prolong the QT interval.",
    labelExample: "pimozide and quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "posaconazole", drugB: "atorvastatin", queries: ["noxafil", "atorvastatin"],
    labelDrug: "Noxafil (posaconazole)", label: "noxafil", labelSection: "4 CONTRAINDICATIONS",
    quote: "Coadministration with the HMG-CoA reductase inhibitors that are primarily metabolized through CYP3A4 (e.g., atorvastatin, lovastatin, and simvastatin) is contraindicated",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "posaconazole", drugB: "lovastatin", queries: ["noxafil", "lovastatin"],
    labelDrug: "Noxafil (posaconazole)", label: "noxafil", labelSection: "4 CONTRAINDICATIONS",
    quote: "Coadministration with the HMG-CoA reductase inhibitors that are primarily metabolized through CYP3A4 (e.g., atorvastatin, lovastatin, and simvastatin) is contraindicated",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "posaconazole", drugB: "simvastatin", queries: ["noxafil", "simvastatin"],
    labelDrug: "Noxafil (posaconazole)", label: "noxafil", labelSection: "4 CONTRAINDICATIONS",
    quote: "Coadministration with the HMG-CoA reductase inhibitors that are primarily metabolized through CYP3A4 (e.g., atorvastatin, lovastatin, and simvastatin) is contraindicated",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "posaconazole", drugB: "ergotamine", queries: ["noxafil", "ergotamine"],
    labelDrug: "Noxafil (posaconazole)", label: "noxafil", labelSection: "4 CONTRAINDICATIONS",
    quote: "Coadministration of Noxafil with the following drugs is contraindicated",
    labelExample: "ergot alkaloids (ergotamine and dihydroergotamine)",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Highlights list ergot alkaloids among coadministration contraindications. Section 4.5 names ergotamine and dihydroergotamine.",
  }),
  row4({
    drugA: "posaconazole", drugB: "dihydroergotamine", queries: ["noxafil", "dihydroergotamine"],
    labelDrug: "Noxafil (posaconazole)", label: "noxafil", labelSection: "4 CONTRAINDICATIONS",
    quote: "Coadministration of Noxafil with the following drugs is contraindicated",
    labelExample: "ergot alkaloids (ergotamine and dihydroergotamine)",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Highlights list ergot alkaloids among coadministration contraindications. Section 4.5 names ergotamine and dihydroergotamine.",
  }),
  // ── Norvir (ritonavir): 4 CONTRAINDICATIONS ──
  row4({
    drugA: "ritonavir", drugB: "alfuzosin", queries: ["norvir", "alfuzosin"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Alpha 1- Adrenoreceptor Antagonist: alfuzosin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "ranolazine", queries: ["norvir", "ranolazine"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antianginal: ranolazine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "amiodarone", queries: ["norvir", "amiodarone"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antiarrhythmics: amiodarone, dronedarone, flecainide, propafenone, quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "dronedarone", queries: ["norvir", "dronedarone"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antiarrhythmics: amiodarone, dronedarone, flecainide, propafenone, quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "flecainide", queries: ["norvir", "flecainide"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antiarrhythmics: amiodarone, dronedarone, flecainide, propafenone, quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "propafenone", queries: ["norvir", "propafenone"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antiarrhythmics: amiodarone, dronedarone, flecainide, propafenone, quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "quinidine", queries: ["norvir", "quinidine"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antiarrhythmics: amiodarone, dronedarone, flecainide, propafenone, quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "lurasidone", queries: ["norvir", "lurasidone"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antipsychotics: lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "pimozide", queries: ["norvir", "pimozide"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antipsychotics: lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "dihydroergotamine", queries: ["norvir", "dihydroergotamine"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Ergot Derivatives: dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "methylergonovine", queries: ["norvir", "methylergonovine"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Ergot Derivatives: dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "lovastatin", queries: ["norvir", "lovastatin"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "HMG-CoA Reductase Inhibitors: lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "suzetrigine", queries: ["norvir", "suzetrigine"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Non-opioid Analgesic (selective blocker of Nav1.8 sodium channels): suzetrigine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "sildenafil-pah", queries: ["norvir", "sildenafil pah"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "PDE5 Inhibitor: sildenafil (Revatio®) when used for the treatment of pulmonary arterial hypertension",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Contraindication is for pulmonary arterial hypertension, not erectile dysfunction. Paired to the PAH catalog row.",
  }),
  row4({
    drugA: "ritonavir", drugB: "triazolam", queries: ["norvir", "triazolam"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Sedative/Hypnotics: triazolam, orally administered midazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "midazolam", queries: ["norvir", "midazolam"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Sedative/Hypnotics: triazolam, orally administered midazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Label says orally administered midazolam. The catalog row is not split by route.",
  }),
  row4({
    drugA: "ritonavir", drugB: "apalutamide", queries: ["norvir", "apalutamide"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are potent CYP3A inducers",
    labelExample: "Anticancer Agents: apalutamide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "ritonavir", drugB: "st-johns-wort", queries: ["norvir", "st johns wort"],
    labelDrug: "Norvir (ritonavir)", label: "norvir", labelSection: "4 CONTRAINDICATIONS",
    quote: "NORVIR is contraindicated with drugs that are potent CYP3A inducers",
    labelExample: "St. John's Wort (hypericum perforatum)",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  // ── Paxlovid (nirmatrelvir/ritonavir): 4 CONTRAINDICATIONS ──
  row4({
    drugA: "paxlovid", drugB: "alfuzosin", queries: ["paxlovid", "alfuzosin"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Alpha 1-adrenoreceptor antagonist: alfuzosin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "ranolazine", queries: ["paxlovid", "ranolazine"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Antianginal: ranolazine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "amiodarone", queries: ["paxlovid", "amiodarone"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Antiarrhythmic: amiodarone, dronedarone, flecainide, propafenone, quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "dronedarone", queries: ["paxlovid", "dronedarone"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Antiarrhythmic: amiodarone, dronedarone, flecainide, propafenone, quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "flecainide", queries: ["paxlovid", "flecainide"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Antiarrhythmic: amiodarone, dronedarone, flecainide, propafenone, quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "propafenone", queries: ["paxlovid", "propafenone"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Antiarrhythmic: amiodarone, dronedarone, flecainide, propafenone, quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "quinidine", queries: ["paxlovid", "quinidine"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Antiarrhythmic: amiodarone, dronedarone, flecainide, propafenone, quinidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "lurasidone", queries: ["paxlovid", "lurasidone"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Antipsychotics: lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "pimozide", queries: ["paxlovid", "pimozide"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Antipsychotics: lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "silodosin", queries: ["paxlovid", "silodosin"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Benign prostatic hyperplasia agents: silodosin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "eplerenone", queries: ["paxlovid", "eplerenone"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Cardiovascular agents: eplerenone, ivabradine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "ivabradine", queries: ["paxlovid", "ivabradine"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Cardiovascular agents: eplerenone, ivabradine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "dihydroergotamine", queries: ["paxlovid", "dihydroergotamine"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Ergot derivatives: dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "ergotamine", queries: ["paxlovid", "ergotamine"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Ergot derivatives: dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "methylergonovine", queries: ["paxlovid", "methylergonovine"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Ergot derivatives: dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "lovastatin", queries: ["paxlovid", "lovastatin"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "HMG-CoA reductase inhibitors: lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Section 4 lists these as contraindicated and says they can be paused so PAXLOVID can be used.",
  }),
  row4({
    drugA: "paxlovid", drugB: "simvastatin", queries: ["paxlovid", "simvastatin"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "HMG-CoA reductase inhibitors: lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Section 4 lists these as contraindicated and says they can be paused so PAXLOVID can be used.",
  }),
  row4({
    drugA: "paxlovid", drugB: "voclosporin", queries: ["paxlovid", "voclosporin"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Immunosuppressants: voclosporin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "eletriptan", queries: ["paxlovid", "eletriptan"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Migraine medications: eletriptan, ubrogepant",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "ubrogepant", queries: ["paxlovid", "ubrogepant"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Migraine medications: eletriptan, ubrogepant",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "finerenone", queries: ["paxlovid", "finerenone"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Mineralocorticoid receptor antagonists: finerenone",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "suzetrigine", queries: ["paxlovid", "suzetrigine"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Non-opioid analgesic (selective blocker of Nav1.8 sodium channels): suzetrigine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "naloxegol", queries: ["paxlovid", "naloxegol"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Opioid antagonists: naloxegol",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "sildenafil-pah", queries: ["paxlovid", "sildenafil pah"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "PDE5 inhibitor: sildenafil (Revatio®) when used for pulmonary arterial hypertension (PAH)",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Contraindication is for pulmonary arterial hypertension, not erectile dysfunction. Paired to the PAH catalog row.",
  }),
  row4({
    drugA: "paxlovid", drugB: "triazolam", queries: ["paxlovid", "triazolam"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Sedative/hypnotics: triazolam, oral midazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "midazolam", queries: ["paxlovid", "midazolam"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Sedative/hypnotics: triazolam, oral midazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Label says oral midazolam. The catalog row is not split by route.",
  }),
  row4({
    drugA: "paxlovid", drugB: "tolvaptan", queries: ["paxlovid", "tolvaptan"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A",
    labelExample: "Vasopressin receptor antagonists: tolvaptan",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "apalutamide", queries: ["paxlovid", "apalutamide"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A … and drugs that are strong CYP3A inducers",
    labelExample: "Anticancer drugs: apalutamide, enzalutamide",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "enzalutamide", queries: ["paxlovid", "enzalutamide"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A … and drugs that are strong CYP3A inducers",
    labelExample: "Anticancer drugs: apalutamide, enzalutamide",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "carbamazepine", queries: ["paxlovid", "carbamazepine"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A … and drugs that are strong CYP3A inducers",
    labelExample: "Anticonvulsant: carbamazepine, phenobarbital, primidone, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "phenobarbital", queries: ["paxlovid", "phenobarbital"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A … and drugs that are strong CYP3A inducers",
    labelExample: "Anticonvulsant: carbamazepine, phenobarbital, primidone, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "primidone", queries: ["paxlovid", "primidone"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A … and drugs that are strong CYP3A inducers",
    labelExample: "Anticonvulsant: carbamazepine, phenobarbital, primidone, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "phenytoin", queries: ["paxlovid", "phenytoin"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A … and drugs that are strong CYP3A inducers",
    labelExample: "Anticonvulsant: carbamazepine, phenobarbital, primidone, phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "rifampin", queries: ["paxlovid", "rifampin"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A … and drugs that are strong CYP3A inducers",
    labelExample: "Antimycobacterials: rifampin, rifapentine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "rifapentine", queries: ["paxlovid", "rifapentine"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A … and drugs that are strong CYP3A inducers",
    labelExample: "Antimycobacterials: rifampin, rifapentine",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row4({
    drugA: "paxlovid", drugB: "lumacaftor-ivacaftor", queries: ["paxlovid", "lumacaftor"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A … and drugs that are strong CYP3A inducers",
    labelExample: "Cystic fibrosis transmembrane conductance regulator potentiators: lumacaftor/ivacaftor",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
    note: "Label names lumacaftor/ivacaftor. Paired to the combo row, not ivacaftor alone.",
  }),
  row4({
    drugA: "paxlovid", drugB: "st-johns-wort", queries: ["paxlovid", "st johns wort"],
    labelDrug: "Paxlovid (nirmatrelvir/ritonavir)", label: "paxlovid", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXLOVID is contraindicated with drugs that are primarily metabolized by CYP3A … and drugs that are strong CYP3A inducers",
    labelExample: "Herbal products: St. John's Wort (hypericum perforatum)",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  // ── Kaletra (lopinavir/ritonavir): 4 CONTRAINDICATIONS ──
  row4({
    drugA: "lopinavir", drugB: "alfuzosin", queries: ["kaletra", "alfuzosin"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Alpha 1- Adrenoreceptor Antagonist: alfuzosin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "ranolazine", queries: ["kaletra", "ranolazine"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antianginal: ranolazine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "dronedarone", queries: ["kaletra", "dronedarone"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antiarrhythmic: dronedarone",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "lurasidone", queries: ["kaletra", "lurasidone"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antipsychotics: lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "pimozide", queries: ["kaletra", "pimozide"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Antipsychotics: lurasidone, pimozide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "dihydroergotamine", queries: ["kaletra", "dihydroergotamine"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Ergot Derivatives: dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "ergotamine", queries: ["kaletra", "ergotamine"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Ergot Derivatives: dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "methylergonovine", queries: ["kaletra", "methylergonovine"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Ergot Derivatives: dihydroergotamine, ergotamine, methylergonovine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "grazoprevir-elbasvir", queries: ["kaletra", "elbasvir"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Hepatitis C direct acting antiviral: elbasvir/grazoprevir",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Label names elbasvir/grazoprevir. Paired to the combo row.",
  }),
  row4({
    drugA: "lopinavir", drugB: "lovastatin", queries: ["kaletra", "lovastatin"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "HMG-CoA Reductase Inhibitors: lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "simvastatin", queries: ["kaletra", "simvastatin"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "HMG-CoA Reductase Inhibitors: lovastatin, simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "suzetrigine", queries: ["kaletra", "suzetrigine"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Non-opioid Analgesic (selective blocker of Nav1.8 sodium channels): suzetrigine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "sildenafil-pah", queries: ["kaletra", "sildenafil pah"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "PDE5 Inhibitor: sildenafil (Revatio®) when used for the treatment of pulmonary arterial hypertension",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Contraindication is for pulmonary arterial hypertension, not erectile dysfunction. Paired to the PAH catalog row.",
  }),
  row4({
    drugA: "lopinavir", drugB: "triazolam", queries: ["kaletra", "triazolam"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Sedative/Hypnotics: triazolam, orally administered midazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "midazolam", queries: ["kaletra", "midazolam"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are highly dependent on CYP3A for clearance",
    labelExample: "Sedative/Hypnotics: triazolam, orally administered midazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
    note: "Label says orally administered midazolam. The catalog row is not split by route.",
  }),
  row4({
    drugA: "lopinavir", drugB: "apalutamide", queries: ["kaletra", "apalutamide"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are potent CYP3A inducers",
    labelExample: "Anticancer Agents: apalutamide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "rifampin", queries: ["kaletra", "rifampin"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are potent CYP3A inducers",
    labelExample: "Antimycobacterial: rifampin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row4({
    drugA: "lopinavir", drugB: "st-johns-wort", queries: ["kaletra", "st johns wort"],
    labelDrug: "Kaletra (lopinavir/ritonavir)", label: "kaletra", labelSection: "4 CONTRAINDICATIONS",
    quote: "KALETRA is contraindicated with drugs that are potent CYP3A inducers",
    labelExample: "Herbal Products: St. John's Wort (hypericum perforatum)",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
];

export const WAVE_1_COUNT = WAVE_1.length;
export const WAVE_2_COUNT = WAVE_2.length;
export const WAVE_3_COUNT = WAVE_3.length;
/** Wave 5 row: the label says contraindicated and the pin holds the engine there. */
function row5(r: Row): GoldPair {
  const { label, paraphrased, ...rest } = r;
  return {
    id: `${r.drugA}+${r.drugB}`,
    ...rest,
    paraphrased: paraphrased ?? false,
    url: DM(LABEL_SETIDS[label]),
    retrieved: "2026-10-03",
    expectedFloor: "contraindicated",
    expectContraindicated: r.labelClass === "contraindicated",
    wave: 5,
  };
}

const GEODON_QT =
  "ziprasidone is contraindicated: … Therefore, ziprasidone should not be given with:";
const GEODON_QT_CLASS = "other Class Ia and III anti-arrhythmics";
const GEODON_MAOI =
  "Ziprasidone is contraindicated in patients taking, or within 14 days of stopping, MAOIs (including the MAOIs linezolid and intravenous methylene blue)";

const WAVE_5: GoldPair[] = [
  // ── Geodon 4.1: named drugs ziprasidone should not be given with ──
  row5({
    drugA: "ziprasidone", drugB: "dofetilide", queries: ["geodon", "dofetilide"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "dofetilide",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
    note: "Current Geodon SPL, effective 2025-01-13. Section 4.1 lists the drugs after stating that ziprasidone is contraindicated.",
  }),
  row5({
    drugA: "ziprasidone", drugB: "sotalol", queries: ["geodon", "sotalol"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "sotalol",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row5({
    drugA: "ziprasidone", drugB: "quinidine", queries: ["geodon", "quinidine"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "quinidine",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row5({
    drugA: "ziprasidone", drugB: "thioridazine", queries: ["geodon", "thioridazine"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "thioridazine",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row5({
    drugA: "ziprasidone", drugB: "chlorpromazine", queries: ["geodon", "chlorpromazine"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "chlorpromazine",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row5({
    drugA: "ziprasidone", drugB: "droperidol", queries: ["geodon", "droperidol"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "droperidol",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row5({
    drugA: "ziprasidone", drugB: "pimozide", queries: ["geodon", "pimozide"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "pimozide",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row5({
    drugA: "ziprasidone", drugB: "gatifloxacin", queries: ["geodon", "gatifloxacin"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "gatifloxacin",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row5({
    drugA: "ziprasidone", drugB: "moxifloxacin", queries: ["geodon", "moxifloxacin"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "moxifloxacin",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row5({
    drugA: "ziprasidone", drugB: "mefloquine", queries: ["geodon", "mefloquine"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "mefloquine",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row5({
    drugA: "ziprasidone", drugB: "dolasetron", queries: ["geodon", "dolasetron"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "dolasetron mesylate",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row5({
    drugA: "ziprasidone", drugB: "arsenic-trioxide", queries: ["geodon", "arsenic trioxide"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: "arsenic trioxide",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
    note: "No pair finding before the pin. The pin is a standalone card and does not assign a CYP grade.",
  }),
  // ── Geodon 4.1: Class Ia and III anti-arrhythmics not already named above ──
  row5({
    drugA: "ziprasidone", drugB: "amiodarone", queries: ["geodon", "amiodarone"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: GEODON_QT_CLASS,
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
    note: "Class III antiarrhythmic. The list names dofetilide, sotalol, and quinidine, then this class.",
  }),
  row5({
    drugA: "ziprasidone", drugB: "dronedarone", queries: ["geodon", "dronedarone"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: GEODON_QT_CLASS,
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
    note: "Class III antiarrhythmic. The list names dofetilide, sotalol, and quinidine, then this class.",
  }),
  row5({
    drugA: "ziprasidone", drugB: "ibutilide", queries: ["geodon", "ibutilide"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: GEODON_QT_CLASS,
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
    note: "Class III antiarrhythmic. The list names dofetilide, sotalol, and quinidine, then this class.",
  }),
  row5({
    drugA: "ziprasidone", drugB: "procainamide", queries: ["geodon", "procainamide"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.1 QT Prolongation",
    quote: GEODON_QT, labelExample: GEODON_QT_CLASS,
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
    note: "Class Ia antiarrhythmic. Quinidine is named on its own. This row is the rest of that class.",
  }),
  // ── Geodon 4.3: MAOIs ──
  row5({
    drugA: "ziprasidone", drugB: "linezolid", queries: ["geodon", "linezolid"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.3 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: GEODON_MAOI, labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row5({
    drugA: "ziprasidone", drugB: "methylene-blue", queries: ["geodon", "methylene blue"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.3 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: GEODON_MAOI, labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "The catalog row is ProvayBlue, the intravenous product the sentence names.",
  }),
  row5({
    drugA: "ziprasidone", drugB: "phenelzine", queries: ["geodon", "phenelzine"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.3 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: GEODON_MAOI,
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Irreversible MAOI. The sentence names the class and gives linezolid and intravenous methylene blue as examples.",
  }),
  row5({
    drugA: "ziprasidone", drugB: "tranylcypromine", queries: ["geodon", "tranylcypromine"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.3 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: GEODON_MAOI,
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Irreversible MAOI. The sentence names the class and gives linezolid and intravenous methylene blue as examples.",
  }),
  row5({
    drugA: "ziprasidone", drugB: "isocarboxazid", queries: ["geodon", "isocarboxazid"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.3 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: GEODON_MAOI,
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Irreversible MAOI. The sentence names the class and gives linezolid and intravenous methylene blue as examples.",
  }),
  row5({
    drugA: "ziprasidone", drugB: "moclobemide", queries: ["geodon", "moclobemide"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.3 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: GEODON_MAOI,
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Reversible MAOI. The sentence names the class and gives linezolid and intravenous methylene blue as examples.",
  }),
  row5({
    drugA: "ziprasidone", drugB: "selegiline", queries: ["geodon", "selegiline"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.3 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: GEODON_MAOI,
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "MAO-B inhibitor. The sentence names the class and gives linezolid and intravenous methylene blue as examples.",
  }),
  row5({
    drugA: "ziprasidone", drugB: "safinamide", queries: ["geodon", "safinamide"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.3 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: GEODON_MAOI,
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "MAO-B inhibitor. The sentence names the class and gives linezolid and intravenous methylene blue as examples.",
  }),
  row5({
    drugA: "ziprasidone", drugB: "rasagiline", queries: ["geodon", "rasagiline"],
    labelDrug: "Geodon (ziprasidone)", label: "geodon", labelSection: "4.3 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: GEODON_MAOI,
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "MAO-B inhibitor. The sentence names the class and gives linezolid and intravenous methylene blue as examples.",
  }),
];

/** Wave 6 row: Recorlev. The label says contraindicated and the pin holds the engine there. */
function row6(r: Row): GoldPair {
  const { label, paraphrased, ...rest } = r;
  return {
    id: `${r.drugA}+${r.drugB}`,
    ...rest,
    paraphrased: paraphrased ?? false,
    url: DM(LABEL_SETIDS[label]),
    retrieved: "2026-10-05",
    expectedFloor: "contraindicated",
    expectContraindicated: r.labelClass === "contraindicated",
    wave: 6,
  };
}

const RECORLEV_SECTION = "7.1 Effect of RECORLEV on Other Drugs (Table 6)";
const RECORLEV_QT =
  "Concomitant use of RECORLEV with other drugs that cause QT prolongation associated with ventricular arrhythmias, including torsades de pointes, is contraindicated";
const RECORLEV_NOTE =
  "Table 6 row: CYP3A4 or CYP3A4 and P-gp substrates that may prolong QT. Section 4 contraindicates drugs that cause QT prolongation associated with ventricular arrhythmias.";

const WAVE_6: GoldPair[] = [
  // ── Recorlev Table 6: named QT drugs, use is contraindicated ──
  row6({
    drugA: "levoketoconazole", drugB: "bosutinib", queries: ["recorlev", "bosutinib"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "Bosutinib",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "clarithromycin", queries: ["recorlev", "clarithromycin"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "clarithromycin",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "cobimetinib", queries: ["recorlev", "cobimetinib"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "cobimetinib",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "crizotinib", queries: ["recorlev", "crizotinib"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "crizotinib",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "disopyramide", queries: ["recorlev", "disopyramide"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "disopyramide",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "dofetilide", queries: ["recorlev", "dofetilide"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "dofetilide",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "dronedarone", queries: ["recorlev", "dronedarone"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "dronedarone",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "ivabradine", queries: ["recorlev", "ivabradine"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "ivabradine",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "methadone", queries: ["recorlev", "methadone"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "methadone",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "midostaurin", queries: ["recorlev", "midostaurin"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "midostaurin",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "nicardipine", queries: ["recorlev", "nicardipine"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "nicardipine",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "pimozide", queries: ["recorlev", "pimozide"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "pimozide",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "quinidine", queries: ["recorlev", "quinidine"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "quinidine",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
  row6({
    drugA: "levoketoconazole", drugB: "ranolazine", queries: ["recorlev", "ranolazine"],
    labelDrug: "Recorlev (levoketoconazole)", label: "recorlev", labelSection: RECORLEV_SECTION,
    quote: RECORLEV_QT, labelExample: "ranolazine",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "endocrine",
    note: RECORLEV_NOTE,
  }),
];

const W7_QUOTES = {
  "tikosyn": "The concomitant use of verapamil or the cation transport system inhibitors cimetidine, trimethoprim (alone or in combination with sulfamethoxazole), or ketoconazole with TIKOSYN is contraindicated",
  "tracleer-c": "concomitant use of TRACLEER and cyclosporine A is contraindicated",
  "tracleer-g": "co-administration of glyburide and TRACLEER is contraindicated",
  "adempas": "Concomitant administration of Adempas with specific PDE-5 inhibitors (such as sildenafil, tadalafil, or vardenafil) or nonspecific PDE-5 inhibitors (such as dipyridamole or theophylline) is contraindicated",
  "xenazine": "XENAZINE is contraindicated in patients: … Taking deutetrabenazine or valbenazine",
  "austedo": "AUSTEDO XR and AUSTEDO are contraindicated in patients: … Taking tetrabenazine or valbenazine",
  "mavyret": "MAVYRET is contraindicated with atazanavir or rifampin",
  "edurant": "EDURANT and EDURANT PED are contraindicated for coadministration with the drugs in Table 2",
  "biktarvy-d": "BIKTARVY is contraindicated to be co-administered with: dofetilide",
  "biktarvy-r": "BIKTARVY is contraindicated to be co-administered with: … rifampin due to decreased BIC plasma concentrations",
  "tivicay": "TIVICAY and TIVICAY PD are contraindicated in patients: … receiving dofetilide",
  "apokyn": "APOKYN is contraindicated in patients: Using concomitant drugs of the 5HT 3 antagonist class including antiemetics (e.g., ondansetron, granisetron, dolasetron, palonosetron) and alosetron",
  "relpax": "Recent use (i.e., within at least 72 hours) of the following potent CYP3A4 inhibitors: ketoconazole, itraconazole, nefazodone, troleandomycin, clarithromycin, ritonavir, or nelfinavir",
  "vosevi": "VOSEVI is contraindicated with rifampin",
  "bixlenvo": "Concomitant administration of BIXLENVO is contraindicated with: dofetilide",
} as const;

function row7(r: Row): GoldPair {
  const { label, paraphrased, ...rest } = r;
  return {
    id: `${r.drugA}+${r.drugB}`,
    ...rest,
    paraphrased: paraphrased ?? false,
    url: DM(LABEL_SETIDS[label]),
    retrieved: "2026-10-12",
    expectedFloor: "contraindicated",
    expectContraindicated: r.labelClass === "contraindicated",
    wave: 7,
  };
}

const WAVE_7: GoldPair[] = [
  row7({
    drugA: "dofetilide", drugB: "verapamil", queries: ["tikosyn", "verapamil"],
    labelDrug: "Tikosyn (dofetilide)", label: "tikosyn", labelSection: "CONTRAINDICATIONS",
    quote: W7_QUOTES["tikosyn"], labelExample: "verapamil",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "dofetilide", drugB: "cimetidine", queries: ["tikosyn", "cimetidine"],
    labelDrug: "Tikosyn (dofetilide)", label: "tikosyn", labelSection: "CONTRAINDICATIONS",
    quote: W7_QUOTES["tikosyn"], labelExample: "cimetidine",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "dofetilide", drugB: "ketoconazole", queries: ["tikosyn", "ketoconazole"],
    labelDrug: "Tikosyn (dofetilide)", label: "tikosyn", labelSection: "CONTRAINDICATIONS",
    quote: W7_QUOTES["tikosyn"], labelExample: "ketoconazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "bosentan", drugB: "cyclosporine", queries: ["tracleer", "cyclosporine"],
    labelDrug: "Tracleer (bosentan)", label: "tracleer", labelSection: "4.2 Use with Cyclosporine A",
    quote: W7_QUOTES["tracleer-c"], labelExample: "cyclosporine A",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "bosentan", drugB: "glyburide", queries: ["tracleer", "glyburide"],
    labelDrug: "Tracleer (bosentan)", label: "tracleer", labelSection: "4.3 Use with Glyburide",
    quote: W7_QUOTES["tracleer-g"], labelExample: "glyburide",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "cardiology",
  }),
  row7({
    drugA: "riociguat", drugB: "dipyridamole", queries: ["adempas", "dipyridamole"],
    labelDrug: "Adempas (riociguat)", label: "adempas", labelSection: "4.3 Phosphodiesterase Inhibitors",
    quote: W7_QUOTES["adempas"], labelExample: "dipyridamole",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row7({
    drugA: "riociguat", drugB: "theophylline", queries: ["adempas", "theophylline"],
    labelDrug: "Adempas (riociguat)", label: "adempas", labelSection: "4.3 Phosphodiesterase Inhibitors",
    quote: W7_QUOTES["adempas"], labelExample: "theophylline",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row7({
    drugA: "riociguat", drugB: "sildenafil", queries: ["adempas", "sildenafil"],
    labelDrug: "Adempas (riociguat)", label: "adempas", labelSection: "4.3 Phosphodiesterase Inhibitors",
    quote: W7_QUOTES["adempas"], labelExample: "sildenafil",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row7({
    drugA: "riociguat", drugB: "tadalafil", queries: ["adempas", "tadalafil"],
    labelDrug: "Adempas (riociguat)", label: "adempas", labelSection: "4.3 Phosphodiesterase Inhibitors",
    quote: W7_QUOTES["adempas"], labelExample: "tadalafil",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row7({
    drugA: "riociguat", drugB: "vardenafil", queries: ["adempas", "vardenafil"],
    labelDrug: "Adempas (riociguat)", label: "adempas", labelSection: "4.3 Phosphodiesterase Inhibitors",
    quote: W7_QUOTES["adempas"], labelExample: "vardenafil",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
  row7({
    drugA: "tetrabenazine", drugB: "deutetrabenazine", queries: ["xenazine", "deutetrabenazine"],
    labelDrug: "Xenazine (tetrabenazine)", label: "xenazine", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["xenazine"], labelExample: "deutetrabenazine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "tetrabenazine", drugB: "valbenazine", queries: ["xenazine", "valbenazine"],
    labelDrug: "Xenazine (tetrabenazine)", label: "xenazine", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["xenazine"], labelExample: "valbenazine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "deutetrabenazine", drugB: "valbenazine", queries: ["austedo", "valbenazine"],
    labelDrug: "Austedo (deutetrabenazine)", label: "austedo", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["austedo"], labelExample: "valbenazine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "glecaprevir-pibrentasvir", drugB: "rifampin", queries: ["mavyret", "rifampin"],
    labelDrug: "Mavyret (glecaprevir/pibrentasvir)", label: "mavyret", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["mavyret"], labelExample: "rifampin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row7({
    drugA: "rilpivirine", drugB: "carbamazepine", queries: ["edurant", "carbamazepine"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "Carbamazepine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "rilpivirine", drugB: "oxcarbazepine", queries: ["edurant", "oxcarbazepine"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "Oxcarbazepine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "rilpivirine", drugB: "phenobarbital", queries: ["edurant", "phenobarbital"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "Phenobarbital",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "rilpivirine", drugB: "phenytoin", queries: ["edurant", "phenytoin"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "Phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "rilpivirine", drugB: "rifampin", queries: ["edurant", "rifampin"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "Rifampin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "rilpivirine", drugB: "rifapentine", queries: ["edurant", "rifapentine"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "Rifapentine",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "rilpivirine", drugB: "st-johns-wort", queries: ["edurant", "st. john's wort"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "St. John's wort",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "rilpivirine", drugB: "esomeprazole", queries: ["edurant", "esomeprazole"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "Esomeprazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "rilpivirine", drugB: "lansoprazole", queries: ["edurant", "lansoprazole"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "Lansoprazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "rilpivirine", drugB: "omeprazole", queries: ["edurant", "omeprazole"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "Omeprazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "rilpivirine", drugB: "pantoprazole", queries: ["edurant", "pantoprazole"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "Pantoprazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "rilpivirine", drugB: "rabeprazole", queries: ["edurant", "rabeprazole"],
    labelDrug: "Edurant (rilpivirine)", label: "edurant", labelSection: "4 CONTRAINDICATIONS (Table 2)",
    quote: W7_QUOTES["edurant"], labelExample: "Rabeprazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "bictegravir", drugB: "dofetilide", queries: ["biktarvy", "dofetilide"],
    labelDrug: "Biktarvy (bictegravir/emtricitabine/tenofovir alafenamide)", label: "biktarvy", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["biktarvy-d"], labelExample: "dofetilide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "bictegravir", drugB: "rifampin", queries: ["biktarvy", "rifampin"],
    labelDrug: "Biktarvy (bictegravir/emtricitabine/tenofovir alafenamide)", label: "biktarvy", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["biktarvy-r"], labelExample: "rifampin",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "dolutegravir", drugB: "dofetilide", queries: ["tivicay", "dofetilide"],
    labelDrug: "Tivicay (dolutegravir)", label: "tivicay", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["tivicay"], labelExample: "dofetilide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "apomorphine", drugB: "ondansetron", queries: ["apokyn", "ondansetron"],
    labelDrug: "Apokyn (apomorphine)", label: "apokyn", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["apokyn"], labelExample: "ondansetron",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "apomorphine", drugB: "granisetron", queries: ["apokyn", "granisetron"],
    labelDrug: "Apokyn (apomorphine)", label: "apokyn", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["apokyn"], labelExample: "granisetron",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "apomorphine", drugB: "dolasetron", queries: ["apokyn", "dolasetron"],
    labelDrug: "Apokyn (apomorphine)", label: "apokyn", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["apokyn"], labelExample: "dolasetron",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "apomorphine", drugB: "palonosetron", queries: ["apokyn", "palonosetron"],
    labelDrug: "Apokyn (apomorphine)", label: "apokyn", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["apokyn"], labelExample: "palonosetron",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "apomorphine", drugB: "alosetron", queries: ["apokyn", "alosetron"],
    labelDrug: "Apokyn (apomorphine)", label: "apokyn", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["apokyn"], labelExample: "alosetron",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "eletriptan", drugB: "ketoconazole", queries: ["relpax", "ketoconazole"],
    labelDrug: "Relpax (eletriptan)", label: "relpax", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["relpax"], labelExample: "ketoconazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "eletriptan", drugB: "itraconazole", queries: ["relpax", "itraconazole"],
    labelDrug: "Relpax (eletriptan)", label: "relpax", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["relpax"], labelExample: "itraconazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "eletriptan", drugB: "nefazodone", queries: ["relpax", "nefazodone"],
    labelDrug: "Relpax (eletriptan)", label: "relpax", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["relpax"], labelExample: "nefazodone",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "eletriptan", drugB: "clarithromycin", queries: ["relpax", "clarithromycin"],
    labelDrug: "Relpax (eletriptan)", label: "relpax", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["relpax"], labelExample: "clarithromycin",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "eletriptan", drugB: "ritonavir", queries: ["relpax", "ritonavir"],
    labelDrug: "Relpax (eletriptan)", label: "relpax", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["relpax"], labelExample: "ritonavir",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "sofosbuvir-velpatasvir-voxilaprevir", drugB: "rifampin", queries: ["vosevi", "rifampin"],
    labelDrug: "Vosevi (sofosbuvir/velpatasvir/voxilaprevir)", label: "vosevi", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["vosevi"], labelExample: "rifampin",
    labelClass: "contraindicated", mechanism: "PK", domain: "antimicrobial",
  }),
  row7({
    drugA: "bictegravir-lenacapavir", drugB: "dofetilide", queries: ["bixlenvo", "dofetilide"],
    labelDrug: "Bixlenvo (bictegravir/lenacapavir)", label: "bixlenvo", labelSection: "4 CONTRAINDICATIONS",
    quote: W7_QUOTES["bixlenvo"], labelExample: "dofetilide",
    labelClass: "contraindicated", mechanism: "PK", domain: "hiv",
  }),
  row7({
    drugA: "lonafarnib", drugB: "midazolam", queries: ["zokinvy", "versed"],
    labelDrug: "Zokinvy (lonafarnib)", label: "zokinvy", labelSection: "4 CONTRAINDICATIONS",
    quote: "ZOKINVY is contraindicated in patients taking: … Midazolam", labelExample: "Midazolam",
    labelClass: "contraindicated", mechanism: "PK", domain: "sleep",
  }),
  row7({
    drugA: "lonafarnib", drugB: "lovastatin", queries: ["zokinvy", "mevacor"],
    labelDrug: "Zokinvy (lonafarnib)", label: "zokinvy", labelSection: "4 CONTRAINDICATIONS",
    quote: "ZOKINVY is contraindicated in patients taking: … Lovastatin, simvastatin, or atorvastatin", labelExample: "Lovastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "statins",
  }),
  row7({
    drugA: "lonafarnib", drugB: "simvastatin", queries: ["zokinvy", "zocor"],
    labelDrug: "Zokinvy (lonafarnib)", label: "zokinvy", labelSection: "4 CONTRAINDICATIONS",
    quote: "ZOKINVY is contraindicated in patients taking: … Lovastatin, simvastatin, or atorvastatin", labelExample: "simvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "statins",
  }),
  row7({
    drugA: "lonafarnib", drugB: "atorvastatin", queries: ["zokinvy", "lipitor"],
    labelDrug: "Zokinvy (lonafarnib)", label: "zokinvy", labelSection: "4 CONTRAINDICATIONS",
    quote: "ZOKINVY is contraindicated in patients taking: … Lovastatin, simvastatin, or atorvastatin", labelExample: "atorvastatin",
    labelClass: "contraindicated", mechanism: "PK", domain: "statins",
  }),
  row7({
    drugA: "pimozide", drugB: "erythromycin", queries: ["pimozide", "ery-tab"],
    labelDrug: "Pimozide", label: "pimozide", labelSection: "CONTRAINDICATIONS",
    quote: "pimozide is contraindicated in patients receiving the macrolide antibiotics clarithromycin, erythromycin, azithromycin, dirithromycin, and troleandomycin", labelExample: "erythromycin",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "psychiatry",
  }),
  row7({
    drugA: "pimozide", drugB: "azithromycin", queries: ["pimozide", "zithromax"],
    labelDrug: "Pimozide", label: "pimozide", labelSection: "CONTRAINDICATIONS",
    quote: "pimozide is contraindicated in patients receiving the macrolide antibiotics clarithromycin, erythromycin, azithromycin, dirithromycin, and troleandomycin", labelExample: "azithromycin",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "pimozide", drugB: "citalopram", queries: ["pimozide", "celexa"],
    labelDrug: "Pimozide", label: "pimozide", labelSection: "CONTRAINDICATIONS",
    quote: "Concomitant use in patients taking Celexa or Lexapro is contraindicated", labelExample: "Celexa",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "pimozide", drugB: "escitalopram", queries: ["pimozide", "lexapro"],
    labelDrug: "Pimozide", label: "pimozide", labelSection: "CONTRAINDICATIONS",
    quote: "Concomitant use in patients taking Celexa or Lexapro is contraindicated", labelExample: "Lexapro",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "pimozide", drugB: "sertraline", queries: ["pimozide", "zoloft"],
    labelDrug: "Pimozide", label: "pimozide", labelSection: "CONTRAINDICATIONS",
    quote: "Concomitant use of pimozide in patients taking sertraline is contraindicated", labelExample: "sertraline",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "pimozide", drugB: "nefazodone", queries: ["pimozide", "serzone"],
    labelDrug: "Pimozide", label: "pimozide", labelSection: "CONTRAINDICATIONS",
    quote: "Nefazodone is a potent inhibitor of CYP 3A4, and its concomitant use with pimozide is also contraindicated", labelExample: "Nefazodone",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "triazolam", drugB: "nefazodone", queries: ["triazolam", "serzone"],
    labelDrug: "Triazolam", label: "triazolam", labelSection: "4 CONTRAINDICATIONS",
    quote: "Triazolam is contraindicated in: … Concomitant administration of strong cytochrome P450 (CYP 3A) enzyme inhibitors (e.g., ketoconazole, itraconazole, nefazodone, lopinavir, ritonavir)", labelExample: "nefazodone",
    labelClass: "contraindicated", mechanism: "PK", domain: "sleep",
  }),
  row7({
    drugA: "carbamazepine", drugB: "nefazodone", queries: ["tegretol", "serzone"],
    labelDrug: "Tegretol (carbamazepine)", label: "tegretol", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of carbamazepine with nefazodone is contraindicated.", labelExample: "nefazodone",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "ranolazine", drugB: "clarithromycin", queries: ["ranolazine", "biaxin"],
    labelDrug: "Ranolazine extended-release", label: "ranolazine-er", labelSection: "4 CONTRAINDICATIONS",
    quote: "Ranolazine is contraindicated in patients: Taking strong inhibitors of CYP3A … Strong CYP3A inhibitors (e.g., ketoconazole, clarithromycin, nelfinavir)", labelExample: "clarithromycin",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "ranolazine", drugB: "st-johns-wort", queries: ["ranolazine", "st. john's wort"],
    labelDrug: "Ranolazine extended-release", label: "ranolazine-er", labelSection: "4 CONTRAINDICATIONS",
    quote: "Ranolazine is contraindicated in patients: … Taking inducers of CYP3A … CYP3A inducers (e.g., rifampin, phenobarbital, St. John's wort)", labelExample: "St. John's wort",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "ergotamine", drugB: "erythromycin", queries: ["cafergot", "ery-tab"],
    labelDrug: "Cafergot (ergotamine/caffeine)", label: "cafergot", labelSection: "CONTRAINDICATIONS",
    quote: "Coadministration of ergotamine with potent CYP 3A4 inhibitors (ritonavir, nelfinavir, indinavir, erythromycin, clarithromycin, and troleandomycin) … ergotamine use is contraindicated with these drugs", labelExample: "erythromycin",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "ergotamine", drugB: "ketoconazole", queries: ["cafergot", "nizoral"],
    labelDrug: "Cafergot (ergotamine/caffeine)", label: "cafergot", labelSection: "CONTRAINDICATIONS",
    quote: "ergotamine use is contraindicated with these drugs and other potent inhibitors of CYP 3A4 (e.g., ketoconazole, itraconazole)", labelExample: "ketoconazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "dihydroergotamine", drugB: "erythromycin", queries: ["dihydroergotamine", "ery-tab"],
    labelDrug: "Dihydroergotamine mesylate injection", label: "dhe-injection", labelSection: "CONTRAINDICATIONS",
    quote: "The use of potent CYP3A4 inhibitors (i.e., ritonavir, nelfinavir, indinavir, erythromycin, clarithromycin, troleandomycin, ketoconazole, itraconazole) with dihydroergotamine is, therefore contraindicated", labelExample: "erythromycin",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "dihydroergotamine", drugB: "ketoconazole", queries: ["dihydroergotamine", "nizoral"],
    labelDrug: "Dihydroergotamine mesylate injection", label: "dhe-injection", labelSection: "CONTRAINDICATIONS",
    quote: "The use of potent CYP3A4 inhibitors (i.e., ritonavir, nelfinavir, indinavir, erythromycin, clarithromycin, troleandomycin, ketoconazole, itraconazole) with dihydroergotamine is, therefore contraindicated", labelExample: "ketoconazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "lurasidone", drugB: "voriconazole", queries: ["latuda", "vfend"],
    labelDrug: "Latuda (lurasidone)", label: "latuda", labelSection: "4 CONTRAINDICATIONS",
    quote: "Strong CYP3A4 inhibitors (e.g., ketoconazole, clarithromycin, ritonavir, voriconazole, mibefradil, etc.)", labelExample: "voriconazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "lurasidone", drugB: "st-johns-wort", queries: ["latuda", "st. john's wort"],
    labelDrug: "Latuda (lurasidone)", label: "latuda", labelSection: "4 CONTRAINDICATIONS",
    quote: "Strong CYP3A4 inducers (e.g., rifampin, avasimibe, St. John's wort, phenytoin, carbamazepine, etc.)", labelExample: "St. John's wort",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "lurasidone", drugB: "phenytoin", queries: ["latuda", "dilantin"],
    labelDrug: "Latuda (lurasidone)", label: "latuda", labelSection: "4 CONTRAINDICATIONS",
    quote: "Strong CYP3A4 inducers (e.g., rifampin, avasimibe, St. John's wort, phenytoin, carbamazepine, etc.)", labelExample: "phenytoin",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "lurasidone", drugB: "carbamazepine", queries: ["latuda", "tegretol"],
    labelDrug: "Latuda (lurasidone)", label: "latuda", labelSection: "4 CONTRAINDICATIONS",
    quote: "Strong CYP3A4 inducers (e.g., rifampin, avasimibe, St. John's wort, phenytoin, carbamazepine, etc.)", labelExample: "carbamazepine",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "eplerenone", drugB: "nefazodone", queries: ["inspra", "serzone"],
    labelDrug: "Inspra (eplerenone)", label: "inspra", labelSection: "4 CONTRAINDICATIONS",
    quote: "INSPRA is contraindicated in all patients with: … concomitant administration of strong CYP3A inhibitors (e.g., ketoconazole, itraconazole, nefazodone, troleandomycin, clarithromycin, ritonavir, and nelfinavir)", labelExample: "nefazodone",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "eplerenone", drugB: "clarithromycin", queries: ["inspra", "biaxin"],
    labelDrug: "Inspra (eplerenone)", label: "inspra", labelSection: "4 CONTRAINDICATIONS",
    quote: "INSPRA is contraindicated in all patients with: … concomitant administration of strong CYP3A inhibitors (e.g., ketoconazole, itraconazole, nefazodone, troleandomycin, clarithromycin, ritonavir, and nelfinavir)", labelExample: "clarithromycin",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "eplerenone", drugB: "ritonavir", queries: ["inspra", "norvir"],
    labelDrug: "Inspra (eplerenone)", label: "inspra", labelSection: "4 CONTRAINDICATIONS",
    quote: "INSPRA is contraindicated in all patients with: … concomitant administration of strong CYP3A inhibitors (e.g., ketoconazole, itraconazole, nefazodone, troleandomycin, clarithromycin, ritonavir, and nelfinavir)", labelExample: "ritonavir",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "dronedarone", drugB: "voriconazole", queries: ["multaq", "vfend"],
    labelDrug: "Multaq (dronedarone)", label: "multaq", labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant use of strong CYP3A inhibitors, such as ketoconazole, itraconazole, voriconazole, cyclosporine, telithromycin, clarithromycin, nefazodone, and ritonavir", labelExample: "voriconazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "dronedarone", drugB: "telithromycin", queries: ["multaq", "ketek"],
    labelDrug: "Multaq (dronedarone)", label: "multaq", labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant use of strong CYP3A inhibitors, such as ketoconazole, itraconazole, voriconazole, cyclosporine, telithromycin, clarithromycin, nefazodone, and ritonavir", labelExample: "telithromycin",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "dronedarone", drugB: "clarithromycin", queries: ["multaq", "biaxin"],
    labelDrug: "Multaq (dronedarone)", label: "multaq", labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant use of strong CYP3A inhibitors, such as ketoconazole, itraconazole, voriconazole, cyclosporine, telithromycin, clarithromycin, nefazodone, and ritonavir", labelExample: "clarithromycin",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "dronedarone", drugB: "nefazodone", queries: ["multaq", "serzone"],
    labelDrug: "Multaq (dronedarone)", label: "multaq", labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant use of strong CYP3A inhibitors, such as ketoconazole, itraconazole, voriconazole, cyclosporine, telithromycin, clarithromycin, nefazodone, and ritonavir", labelExample: "nefazodone",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "dronedarone", drugB: "erythromycin", queries: ["multaq", "ery-tab"],
    labelDrug: "Multaq (dronedarone)", label: "multaq", labelSection: "4 CONTRAINDICATIONS",
    quote: "MULTAQ is contraindicated in patients with: … Concomitant use of erythromycin", labelExample: "erythromycin",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "cardiology",
  }),
  row7({
    drugA: "naloxegol", drugB: "clarithromycin", queries: ["movantik", "biaxin"],
    labelDrug: "Movantik (naloxegol)", label: "movantik", labelSection: "4 CONTRAINDICATIONS",
    quote: "MOVANTIK is contraindicated in: … Patients concomitantly using strong CYP3A4 inhibitors (e.g., clarithromycin, ketoconazole)", labelExample: "clarithromycin",
    labelClass: "contraindicated", mechanism: "PK", domain: "gi",
  }),
  row7({
    drugA: "naloxegol", drugB: "ketoconazole", queries: ["movantik", "nizoral"],
    labelDrug: "Movantik (naloxegol)", label: "movantik", labelSection: "4 CONTRAINDICATIONS",
    quote: "MOVANTIK is contraindicated in: … Patients concomitantly using strong CYP3A4 inhibitors (e.g., clarithromycin, ketoconazole)", labelExample: "ketoconazole",
    labelClass: "contraindicated", mechanism: "PK", domain: "gi",
  }),
  row7({
    drugA: "bupropion", drugB: "linezolid", queries: ["bupropion", "zyvox"],
    labelDrug: "Bupropion hydrochloride tablets", label: "bupropion-ir", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting bupropion hydrochloride tablets in a patient treated with reversible MAOIs such as linezolid or intravenous methylene blue is contraindicated", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "bupropion", drugB: "methylene-blue", queries: ["bupropion", "methylene blue"],
    labelDrug: "Bupropion hydrochloride tablets", label: "bupropion-ir", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting bupropion hydrochloride tablets in a patient treated with reversible MAOIs such as linezolid or intravenous methylene blue is contraindicated", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "naltrexone-bupropion", drugB: "methadone", queries: ["naltrexone–bupropion", "dolophine"],
    labelDrug: "Contrave (naltrexone/bupropion)", label: "contrave", labelSection: "4 CONTRAINDICATIONS",
    quote: "CONTRAVE is contraindicated in … Chronic opioid or opiate agonist (e.g., methadone) or partial agonists (e.g., buprenorphine) use, or acute opiate withdrawal", labelExample: "methadone",
    labelClass: "contraindicated", mechanism: "PD", domain: "mat",
  }),
  row7({
    drugA: "naltrexone-bupropion", drugB: "buprenorphine", queries: ["naltrexone–bupropion", "suboxone"],
    labelDrug: "Contrave (naltrexone/bupropion)", label: "contrave", labelSection: "4 CONTRAINDICATIONS",
    quote: "CONTRAVE is contraindicated in … Chronic opioid or opiate agonist (e.g., methadone) or partial agonists (e.g., buprenorphine) use, or acute opiate withdrawal", labelExample: "buprenorphine",
    labelClass: "contraindicated", mechanism: "PD", domain: "mat",
  }),
  row7({
    drugA: "naltrexone-bupropion", drugB: "bupropion", queries: ["naltrexone–bupropion", "bupropion"],
    labelDrug: "Contrave (naltrexone/bupropion)", label: "contrave", labelSection: "4 CONTRAINDICATIONS",
    quote: "CONTRAVE is contraindicated in … Use of other bupropion-containing products (including, but not limited to, WELLBUTRIN, WELLBUTRIN SR, WELLBUTRIN XL, APLENZIN and ZYBAN)", labelExample: "WELLBUTRIN",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "naltrexone-bupropion", drugB: "bupropion-xl", queries: ["naltrexone–bupropion", "forfivo"],
    labelDrug: "Contrave (naltrexone/bupropion)", label: "contrave", labelSection: "4 CONTRAINDICATIONS",
    quote: "CONTRAVE is contraindicated in … Use of other bupropion-containing products (including, but not limited to, WELLBUTRIN, WELLBUTRIN SR, WELLBUTRIN XL, APLENZIN and ZYBAN)", labelExample: "WELLBUTRIN XL",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "naltrexone-bupropion", drugB: "linezolid", queries: ["naltrexone–bupropion", "zyvox"],
    labelDrug: "Contrave (naltrexone/bupropion)", label: "contrave", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting CONTRAVE in a patient treated with reversible MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "naltrexone-bupropion", drugB: "methylene-blue", queries: ["naltrexone–bupropion", "methylene blue"],
    labelDrug: "Contrave (naltrexone/bupropion)", label: "contrave", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting CONTRAVE in a patient treated with reversible MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row7({
    drugA: "dofetilide", drugB: "tmp-smx", queries: ["tikosyn", "bactrim"],
    labelDrug: "Tikosyn (dofetilide)", label: "tikosyn", labelSection: "CONTRAINDICATIONS",
    quote: "The concomitant use of verapamil or the cation transport system inhibitors cimetidine, trimethoprim (alone or in combination with sulfamethoxazole), or ketoconazole with TIKOSYN is contraindicated", labelExample: "trimethoprim (alone or in combination with sulfamethoxazole)",
    labelClass: "contraindicated", mechanism: "PK", domain: "cardiology",
  }),
  row7({
    drugA: "dofetilide", drugB: "hctz", queries: ["tikosyn", "hydrochlorothiazide"],
    labelDrug: "Tikosyn (dofetilide)", label: "tikosyn", labelSection: "CONTRAINDICATIONS",
    quote: "The concomitant use of hydrochlorothiazide (alone or in combinations such as with triamterene) with TIKOSYN is contraindicated", labelExample: "hydrochlorothiazide",
    labelClass: "contraindicated", mechanism: "PK+PD", domain: "cardiology",
  }),
  row7({
    drugA: "thioridazine", drugB: "pindolol", queries: ["thioridazine", "visken"],
    labelDrug: "Thioridazine", label: "thioridazine", labelSection: "CONTRAINDICATIONS",
    quote: "certain other drugs (e.g., fluvoxamine, propranolol, and pindolol) appear to appreciably inhibit the metabolism of thioridazine. … Therefore, thioridazine is contraindicated with these drugs", labelExample: "pindolol",
    labelClass: "contraindicated", mechanism: "PK", domain: "psychiatry",
  }),
  row7({
    drugA: "sildenafil-pah", drugB: "riociguat", queries: ["sildenafil (pah)", "adempas"],
    labelDrug: "Revatio (sildenafil)", label: "revatio", labelSection: "4 CONTRAINDICATIONS",
    quote: "REVATIO is contraindicated in patients with: … Concomitant use of riociguat, a guanylate cyclase stimulator.", labelExample: "riociguat",
    labelClass: "contraindicated", mechanism: "PD", domain: "cardiology",
  }),
];

/**
 * Wave 9 (DailyMed v2 SPL retrieved 2026-10-12): MAOI-class Contraindications that
 * name linezolid and intravenous methylene blue (SSRIs, SNRIs, mirtazapine,
 * trazodone, clomipramine, buspirone, amphetamines), plus partners named on
 * Azilect and in Parnate Table 1. Wave 8 (#154) was filed under wave 7.
 */
function row9(r: Row): GoldPair {
  return { ...row7(r), wave: 9 };
}

const WAVE_9: GoldPair[] = [
  row9({
    drugA: "sertraline", drugB: "linezolid", queries: ["zoloft", "linezolid"],
    labelDrug: "Zoloft (sertraline)", label: "zoloft", labelSection: "4 CONTRAINDICATIONS",
    quote: "ZOLOFT is contraindicated in patients: … Taking, or within 14 days of stopping, MAOIs, (including the MAOIs linezolid and intravenous methylene blue)", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "sertraline", drugB: "methylene-blue", queries: ["zoloft", "methylene blue"],
    labelDrug: "Zoloft (sertraline)", label: "zoloft", labelSection: "4 CONTRAINDICATIONS",
    quote: "ZOLOFT is contraindicated in patients: … Taking, or within 14 days of stopping, MAOIs, (including the MAOIs linezolid and intravenous methylene blue)", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "paroxetine", drugB: "linezolid", queries: ["paxil", "linezolid"],
    labelDrug: "Paxil (paroxetine)", label: "paxil", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXIL is contraindicated in patients: Taking, or within 14 days of stopping, MAOIs (including the MAOIs linezolid and intravenous methylene blue)", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "paroxetine", drugB: "methylene-blue", queries: ["paxil", "methylene blue"],
    labelDrug: "Paxil (paroxetine)", label: "paxil", labelSection: "4 CONTRAINDICATIONS",
    quote: "PAXIL is contraindicated in patients: Taking, or within 14 days of stopping, MAOIs (including the MAOIs linezolid and intravenous methylene blue)", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "fluvoxamine", drugB: "linezolid", queries: ["fluvoxamine", "linezolid"],
    labelDrug: "Fluvoxamine maleate tablets", label: "fluvoxamine", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting Fluvoxamine Maleate Tablets in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "fluvoxamine", drugB: "methylene-blue", queries: ["fluvoxamine", "methylene blue"],
    labelDrug: "Fluvoxamine maleate tablets", label: "fluvoxamine", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting Fluvoxamine Maleate Tablets in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "venlafaxine", drugB: "linezolid", queries: ["effexor", "linezolid"],
    labelDrug: "Effexor XR (venlafaxine)", label: "effexor-xr", labelSection: "4 CONTRAINDICATIONS",
    quote: "Effexor XR is contraindicated in patients: … taking, or within 14 days of stopping, MAOIs (including the MAOIs linezolid and intravenous methylene blue)", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "venlafaxine", drugB: "methylene-blue", queries: ["effexor", "methylene blue"],
    labelDrug: "Effexor XR (venlafaxine)", label: "effexor-xr", labelSection: "4 CONTRAINDICATIONS",
    quote: "Effexor XR is contraindicated in patients: … taking, or within 14 days of stopping, MAOIs (including the MAOIs linezolid and intravenous methylene blue)", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "desvenlafaxine", drugB: "linezolid", queries: ["pristiq", "linezolid"],
    labelDrug: "Pristiq (desvenlafaxine)", label: "pristiq", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting PRISTIQ in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "desvenlafaxine", drugB: "methylene-blue", queries: ["pristiq", "methylene blue"],
    labelDrug: "Pristiq (desvenlafaxine)", label: "pristiq", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting PRISTIQ in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "duloxetine", drugB: "linezolid", queries: ["cymbalta", "linezolid"],
    labelDrug: "Cymbalta (duloxetine)", label: "cymbalta", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting CYMBALTA in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "duloxetine", drugB: "methylene-blue", queries: ["cymbalta", "methylene blue"],
    labelDrug: "Cymbalta (duloxetine)", label: "cymbalta", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting CYMBALTA in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "vortioxetine", drugB: "linezolid", queries: ["trintellix", "linezolid"],
    labelDrug: "Trintellix (vortioxetine)", label: "trintellix", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting TRINTELLIX in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "vortioxetine", drugB: "methylene-blue", queries: ["trintellix", "methylene blue"],
    labelDrug: "Trintellix (vortioxetine)", label: "trintellix", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting TRINTELLIX in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "mirtazapine", drugB: "linezolid", queries: ["remeron", "linezolid"],
    labelDrug: "Remeron (mirtazapine)", label: "remeron", labelSection: "4 CONTRAINDICATIONS",
    quote: "REMERON/REMERONSolTab is contraindicated in patients: Taking, or within 14 days of stopping, MAOIs (including the MAOIs linezolid and intravenous methylene blue)", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "mirtazapine", drugB: "methylene-blue", queries: ["remeron", "methylene blue"],
    labelDrug: "Remeron (mirtazapine)", label: "remeron", labelSection: "4 CONTRAINDICATIONS",
    quote: "REMERON/REMERONSolTab is contraindicated in patients: Taking, or within 14 days of stopping, MAOIs (including the MAOIs linezolid and intravenous methylene blue)", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "trazodone", drugB: "linezolid", queries: ["trazodone", "linezolid"],
    labelDrug: "Trazodone hydrochloride tablets", label: "trazodone", labelSection: "4 CONTRAINDICATIONS",
    quote: "Patients taking, or within 14 days of stopping, monoamine oxidase inhibitors (MAOIs), including MAOIs such as linezolid or intravenous methylene blue", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "trazodone", drugB: "methylene-blue", queries: ["trazodone", "methylene blue"],
    labelDrug: "Trazodone hydrochloride tablets", label: "trazodone", labelSection: "4 CONTRAINDICATIONS",
    quote: "Patients taking, or within 14 days of stopping, monoamine oxidase inhibitors (MAOIs), including MAOIs such as linezolid or intravenous methylene blue", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "clomipramine", drugB: "linezolid", queries: ["anafranil", "linezolid"],
    labelDrug: "Anafranil (clomipramine)", label: "anafranil", labelSection: "CONTRAINDICATIONS",
    quote: "Starting Anafranil in a patient who is being treated with linezolid or intravenous methylene blue is also contraindicated", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "clomipramine", drugB: "methylene-blue", queries: ["anafranil", "methylene blue"],
    labelDrug: "Anafranil (clomipramine)", label: "anafranil", labelSection: "CONTRAINDICATIONS",
    quote: "Starting Anafranil in a patient who is being treated with linezolid or intravenous methylene blue is also contraindicated", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "buspirone", drugB: "linezolid", queries: ["buspirone", "linezolid"],
    labelDrug: "Buspirone hydrochloride tablets", label: "buspirone", labelSection: "CONTRAINDICATIONS",
    quote: "Starting buspirone in a patient who is being treated with reversible MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "buspirone", drugB: "methylene-blue", queries: ["buspirone", "methylene blue"],
    labelDrug: "Buspirone hydrochloride tablets", label: "buspirone", labelSection: "CONTRAINDICATIONS",
    quote: "Starting buspirone in a patient who is being treated with reversible MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "amphetamine", drugB: "linezolid", queries: ["adderall", "linezolid"],
    labelDrug: "Adderall XR (mixed amphetamine salts)", label: "adderall-xr", labelSection: "4 CONTRAINDICATIONS",
    quote: "ADDERALL XR administration is contraindicated in patients: … taking monoamine oxidase inhibitors (MAOIs) … (including MAOIs such as linezolid or intravenous methylene blue)", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "amphetamine", drugB: "methylene-blue", queries: ["adderall", "methylene blue"],
    labelDrug: "Adderall XR (mixed amphetamine salts)", label: "adderall-xr", labelSection: "4 CONTRAINDICATIONS",
    quote: "ADDERALL XR administration is contraindicated in patients: … taking monoamine oxidase inhibitors (MAOIs) … (including MAOIs such as linezolid or intravenous methylene blue)", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "lisdexamfetamine", drugB: "linezolid", queries: ["vyvanse", "linezolid"],
    labelDrug: "Vyvanse (lisdexamfetamine)", label: "vyvanse", labelSection: "4 CONTRAINDICATIONS",
    quote: "VYVANSE is contraindicated in patients with: … Patients taking monoamine oxidase inhibitors (MAOIs) … (including MAOIs such as linezolid or intravenous methylene blue)", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "lisdexamfetamine", drugB: "methylene-blue", queries: ["vyvanse", "methylene blue"],
    labelDrug: "Vyvanse (lisdexamfetamine)", label: "vyvanse", labelSection: "4 CONTRAINDICATIONS",
    quote: "VYVANSE is contraindicated in patients with: … Patients taking monoamine oxidase inhibitors (MAOIs) … (including MAOIs such as linezolid or intravenous methylene blue)", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "rasagiline", drugB: "meperidine", queries: ["azilect", "meperidine"],
    labelDrug: "Azilect (rasagiline)", label: "azilect", labelSection: "4 CONTRAINDICATIONS",
    quote: "AZILECT is contraindicated for use with meperidine, tramadol, methadone, propoxyphene, and MAO inhibitors (MAOIs)", labelExample: "meperidine",
    labelClass: "contraindicated", mechanism: "PD", domain: "maoi-opioid",
  }),
  row9({
    drugA: "rasagiline", drugB: "tramadol", queries: ["azilect", "tramadol"],
    labelDrug: "Azilect (rasagiline)", label: "azilect", labelSection: "4 CONTRAINDICATIONS",
    quote: "AZILECT is contraindicated for use with meperidine, tramadol, methadone, propoxyphene, and MAO inhibitors (MAOIs)", labelExample: "tramadol",
    labelClass: "contraindicated", mechanism: "PD", domain: "maoi-opioid",
  }),
  row9({
    drugA: "rasagiline", drugB: "methadone", queries: ["azilect", "methadone"],
    labelDrug: "Azilect (rasagiline)", label: "azilect", labelSection: "4 CONTRAINDICATIONS",
    quote: "AZILECT is contraindicated for use with meperidine, tramadol, methadone, propoxyphene, and MAO inhibitors (MAOIs)", labelExample: "methadone",
    labelClass: "contraindicated", mechanism: "PD", domain: "mat",
  }),
  row9({
    drugA: "rasagiline", drugB: "cyclobenzaprine", queries: ["azilect", "cyclobenzaprine"],
    labelDrug: "Azilect (rasagiline)", label: "azilect", labelSection: "4 CONTRAINDICATIONS",
    quote: "AZILECT is contraindicated for use with St. John’s wort and with cyclobenzaprine", labelExample: "cyclobenzaprine",
    labelClass: "contraindicated", mechanism: "PD", domain: "muscle-relaxant",
  }),
  row9({
    drugA: "tranylcypromine", drugB: "buspirone", queries: ["parnate", "buspirone"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … buspirone", labelExample: "buspirone",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "tranylcypromine", drugB: "tapentadol", queries: ["parnate", "tapentadol"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … tapentadol", labelExample: "tapentadol",
    labelClass: "contraindicated", mechanism: "PD", domain: "maoi-opioid",
  }),
  row9({
    drugA: "tranylcypromine", drugB: "cyclobenzaprine", queries: ["parnate", "cyclobenzaprine"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … cyclobenzaprine", labelExample: "cyclobenzaprine",
    labelClass: "contraindicated", mechanism: "PD", domain: "muscle-relaxant",
  }),
  row9({
    drugA: "tranylcypromine", drugB: "milnacipran", queries: ["parnate", "milnacipran"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … milnacipran", labelExample: "milnacipran",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row9({
    drugA: "tranylcypromine", drugB: "rasagiline", queries: ["parnate", "rasagiline"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … rasagiline", labelExample: "rasagiline",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
];

/**
 * Wave 10 (DailyMed v2 SPL retrieved 2026-10-12): Nardil Contraindications pairings
 * (each quoted from Nardil's own label), Parnate Table 1 "Other antidepressants"
 * (from Parnate's own label), Marplan and Zyvox named partners, and Celexa,
 * Lexapro, Viibryd, Fetzima and Savella with linezolid / IV methylene blue.
 */
function row10(r: Row): GoldPair {
  return { ...row7(r), wave: 10 };
}

const WAVE_10: GoldPair[] = [
  row10({
    drugA: "phenelzine", drugB: "fluvoxamine", queries: ["nardil", "fluvoxamine"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "serotoninergic drugs (e.g., … fluvoxamine … the concomitant use of NARDIL with serotoninergic agents is contraindicated", labelExample: "fluvoxamine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "phenelzine", drugB: "paroxetine", queries: ["nardil", "paroxetine"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "serotoninergic drugs (e.g., … paroxetine … the concomitant use of NARDIL with serotoninergic agents is contraindicated", labelExample: "paroxetine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "phenelzine", drugB: "sertraline", queries: ["nardil", "sertraline"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "serotoninergic drugs (e.g., … sertraline … the concomitant use of NARDIL with serotoninergic agents is contraindicated", labelExample: "sertraline",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "phenelzine", drugB: "citalopram", queries: ["nardil", "citalopram"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "serotoninergic drugs (e.g., … citalopram … the concomitant use of NARDIL with serotoninergic agents is contraindicated", labelExample: "citalopram",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "phenelzine", drugB: "venlafaxine", queries: ["nardil", "venlafaxine"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "serotoninergic drugs (e.g., … venlafaxine … the concomitant use of NARDIL with serotoninergic agents is contraindicated", labelExample: "venlafaxine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "phenelzine", drugB: "buspirone", queries: ["nardil", "buspirone"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "NARDIL should also not be used in combination with buspirone HCl", labelExample: "buspirone",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "phenelzine", drugB: "amphetamine", queries: ["nardil", "amphetamine"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "patients being treated with NARDIL should not take sympathomimetic drugs (including … amphetamines", labelExample: "amphetamines",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "phenelzine", drugB: "cocaine", queries: ["nardil", "cocaine"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "patients being treated with NARDIL should not take sympathomimetic drugs (including … cocaine", labelExample: "cocaine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "phenelzine", drugB: "methylphenidate", queries: ["nardil", "methylphenidate"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "patients being treated with NARDIL should not take sympathomimetic drugs (including … methylphenidate", labelExample: "methylphenidate",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),  row10({
    drugA: "phenelzine", drugB: "dopamine", queries: ["nardil", "dopamine"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "patients being treated with NARDIL should not take sympathomimetic drugs (including … dopamine", labelExample: "dopamine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "phenelzine", drugB: "epinephrine", queries: ["nardil", "epinephrine"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "patients being treated with NARDIL should not take sympathomimetic drugs (including … epinephrine", labelExample: "epinephrine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "phenelzine", drugB: "norepinephrine", queries: ["nardil", "norepinephrine"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "patients being treated with NARDIL should not take sympathomimetic drugs (including … norepinephrine", labelExample: "norepinephrine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),

  row10({
    drugA: "phenelzine", drugB: "isocarboxazid", queries: ["nardil", "isocarboxazid"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "NARDIL should not be administered together with or in rapid succession to other MAO inhibitors … isocarboxazid", labelExample: "isocarboxazid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "phenelzine", drugB: "tranylcypromine", queries: ["nardil", "tranylcypromine"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "NARDIL should not be administered together with or in rapid succession to other MAO inhibitors … tranylcypromine", labelExample: "tranylcypromine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "tranylcypromine", drugB: "trazodone", queries: ["parnate", "trazodone"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … Other antidepressants (e.g., … trazodone", labelExample: "trazodone",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "tranylcypromine", drugB: "nefazodone", queries: ["parnate", "nefazodone"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … Other antidepressants (e.g., … nefazodone", labelExample: "nefazodone",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "tranylcypromine", drugB: "vilazodone", queries: ["parnate", "vilazodone"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … Other antidepressants (e.g., … vilazodone", labelExample: "vilazodone",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "tranylcypromine", drugB: "vortioxetine", queries: ["parnate", "vortioxetine"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … Other antidepressants (e.g., … vortioxetine", labelExample: "vortioxetine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "isocarboxazid", drugB: "buspirone", queries: ["marplan", "buspirone"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan (isocarboxazid) should not be administered in combination with any of the following: … buspirone", labelExample: "buspirone",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "isocarboxazid", drugB: "dextromethorphan", queries: ["marplan", "dextromethorphan"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan (isocarboxazid) should not be administered in combination with any of the following: … dextromethorphan", labelExample: "dextromethorphan",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "linezolid", drugB: "isocarboxazid", queries: ["zyvox", "isocarboxazid"],
    labelDrug: "Zyvox (linezolid)", label: "zyvox", labelSection: "4.2 Monoamine Oxidase Inhibitors",
    quote: "Linezolid should not be used in patients taking any medicinal product which inhibits monoamine oxidases A or B (e.g., phenelzine, isocarboxazid)", labelExample: "isocarboxazid",
    labelClass: "contraindicated", mechanism: "PD", domain: "antimicrobial",
  }),
  row10({
    drugA: "citalopram", drugB: "linezolid", queries: ["celexa", "linezolid"],
    labelDrug: "Celexa (citalopram)", label: "celexa", labelSection: "4 CONTRAINDICATIONS",
    quote: "CELEXA is contraindicated in patients: taking, or within 14 days of stopping, MAOIs (including MAOIs such as linezolid or intravenous methylene blue)", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "citalopram", drugB: "methylene-blue", queries: ["celexa", "methylene blue"],
    labelDrug: "Celexa (citalopram)", label: "celexa", labelSection: "4 CONTRAINDICATIONS",
    quote: "CELEXA is contraindicated in patients: taking, or within 14 days of stopping, MAOIs (including MAOIs such as linezolid or intravenous methylene blue)", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "escitalopram", drugB: "linezolid", queries: ["lexapro", "linezolid"],
    labelDrug: "Lexapro (escitalopram)", label: "lexapro", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting Lexapro in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "escitalopram", drugB: "methylene-blue", queries: ["lexapro", "methylene blue"],
    labelDrug: "Lexapro (escitalopram)", label: "lexapro", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting Lexapro in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "vilazodone", drugB: "linezolid", queries: ["viibryd", "linezolid"],
    labelDrug: "Viibryd (vilazodone)", label: "viibryd", labelSection: "4 CONTRAINDICATIONS",
    quote: "VIIBRYD is contraindicated in: Patients taking, or within 14 days of stopping, monoamine oxidase inhibitors (MAOIs), including MAOIs such as linezolid or intravenous methylene blue", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "vilazodone", drugB: "methylene-blue", queries: ["viibryd", "methylene blue"],
    labelDrug: "Viibryd (vilazodone)", label: "viibryd", labelSection: "4 CONTRAINDICATIONS",
    quote: "VIIBRYD is contraindicated in: Patients taking, or within 14 days of stopping, monoamine oxidase inhibitors (MAOIs), including MAOIs such as linezolid or intravenous methylene blue", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "levomilnacipran", drugB: "linezolid", queries: ["fetzima", "linezolid"],
    labelDrug: "Fetzima (levomilnacipran)", label: "fetzima", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting FETZIMA in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "levomilnacipran", drugB: "methylene-blue", queries: ["fetzima", "methylene blue"],
    labelDrug: "Fetzima (levomilnacipran)", label: "fetzima", labelSection: "4 CONTRAINDICATIONS",
    quote: "Starting FETZIMA in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "milnacipran", drugB: "linezolid", queries: ["savella", "linezolid"],
    labelDrug: "Savella (milnacipran)", label: "savella", labelSection: "4.1 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: "Starting SAVELLA in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row10({
    drugA: "milnacipran", drugB: "methylene-blue", queries: ["savella", "methylene blue"],
    labelDrug: "Savella (milnacipran)", label: "savella", labelSection: "4.1 Monoamine Oxidase Inhibitors (MAOIs)",
    quote: "Starting SAVELLA in a patient who is being treated with MAOIs such as linezolid or intravenous methylene blue is also contraindicated", labelExample: "intravenous methylene blue",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
];

/**
 * Wave 11 (DailyMed v2 SPL retrieved 2026-10-12): inducer-naming Contraindications.
 * Most labels that name rifampin, carbamazepine, phenytoin, phenobarbital or
 * St. John's wort pair with a CYP3A inducer card that reads Serious concern, so
 * they are listed in DROPPED_CANDIDATES as severity-change candidates. Pinned here:
 * St. John's wort on Xadago and Azilect, and the other partners Xadago names,
 * where the existing MAOI card already reads Avoid together.
 */
function row11(r: Row): GoldPair {
  return { ...row7(r), wave: 11 };
}

const WAVE_11: GoldPair[] = [
  row11({
    drugA: "safinamide", drugB: "linezolid", queries: ["xadago", "linezolid"],
    labelDrug: "Xadago (safinamide)", label: "xadago", labelSection: "4 CONTRAINDICATIONS",
    quote: "XADAGO is contraindicated in patients with: Concomitant use of other drugs in the monoamine oxidase inhibitor (MAOI) class … including linezolid", labelExample: "linezolid",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row11({
    drugA: "safinamide", drugB: "meperidine", queries: ["xadago", "meperidine"],
    labelDrug: "Xadago (safinamide)", label: "xadago", labelSection: "4 CONTRAINDICATIONS",
    quote: "XADAGO is contraindicated in patients with: … Concomitant use of opioid drugs (e.g., meperidine and its derivatives, methadone, propoxyphene, or tramadol)", labelExample: "meperidine",
    labelClass: "contraindicated", mechanism: "PD", domain: "maoi-opioid",
  }),
  row11({
    drugA: "safinamide", drugB: "methadone", queries: ["xadago", "methadone"],
    labelDrug: "Xadago (safinamide)", label: "xadago", labelSection: "4 CONTRAINDICATIONS",
    quote: "XADAGO is contraindicated in patients with: … Concomitant use of opioid drugs (e.g., meperidine and its derivatives, methadone, propoxyphene, or tramadol)", labelExample: "methadone",
    labelClass: "contraindicated", mechanism: "PD", domain: "mat",
  }),
  row11({
    drugA: "safinamide", drugB: "tramadol", queries: ["xadago", "tramadol"],
    labelDrug: "Xadago (safinamide)", label: "xadago", labelSection: "4 CONTRAINDICATIONS",
    quote: "XADAGO is contraindicated in patients with: … Concomitant use of opioid drugs (e.g., meperidine and its derivatives, methadone, propoxyphene, or tramadol)", labelExample: "tramadol",
    labelClass: "contraindicated", mechanism: "PD", domain: "maoi-opioid",
  }),
  row11({
    drugA: "safinamide", drugB: "cyclobenzaprine", queries: ["xadago", "cyclobenzaprine"],
    labelDrug: "Xadago (safinamide)", label: "xadago", labelSection: "4 CONTRAINDICATIONS",
    quote: "XADAGO is contraindicated in patients with: … cyclobenzaprine", labelExample: "cyclobenzaprine",
    labelClass: "contraindicated", mechanism: "PD", domain: "muscle-relaxant",
  }),
  row11({
    drugA: "safinamide", drugB: "methylphenidate", queries: ["xadago", "methylphenidate"],
    labelDrug: "Xadago (safinamide)", label: "xadago", labelSection: "4 CONTRAINDICATIONS",
    quote: "XADAGO is contraindicated in patients with: … methylphenidate, amphetamine, and their derivatives", labelExample: "methylphenidate",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row11({
    drugA: "safinamide", drugB: "amphetamine", queries: ["xadago", "amphetamine"],
    labelDrug: "Xadago (safinamide)", label: "xadago", labelSection: "4 CONTRAINDICATIONS",
    quote: "XADAGO is contraindicated in patients with: … methylphenidate, amphetamine, and their derivatives", labelExample: "amphetamine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row11({
    drugA: "safinamide", drugB: "st-johns-wort", queries: ["xadago", "st john's wort"],
    labelDrug: "Xadago (safinamide)", label: "xadago", labelSection: "4 CONTRAINDICATIONS",
    quote: "XADAGO is contraindicated in patients with: … St John's wort", labelExample: "St John's wort",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row11({
    drugA: "rasagiline", drugB: "st-johns-wort", queries: ["azilect", "st john's wort"],
    labelDrug: "Azilect (rasagiline)", label: "azilect", labelSection: "4 CONTRAINDICATIONS",
    quote: "AZILECT is contraindicated for use with St. John’s wort and with cyclobenzaprine", labelExample: "St. John’s wort",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
];

export const WAVE_4_COUNT = WAVE_4.length;
/**
 * Wave 12 (DailyMed v2 SPL retrieved 2026-10-19): closes Avoid together grades
 * that had no cited source (docs/grade-provenance-audit.md). Only partners named
 * in the Contraindications section, where the MAOI card already reads Avoid
 * together. Partners named only in Warnings, Drug Interactions or a dietary
 * section are in DROPPED_CANDIDATES for Kaleb and are not pinned.
 */
function row12(r: Row): GoldPair {
  return { ...row7(r), wave: 12, retrieved: "2026-10-19" };
}

const WAVE_12: GoldPair[] = [
  row12({
    drugA: "tranylcypromine", drugB: "five-htp", queries: ["parnate", "5-HTP / L-tryptophan"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … hydroxytryptophan", labelExample: "hydroxytryptophan",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Table 1 lists tryptophan and hydroxytryptophan under Individual Drugs.",
  }),
  row12({
    drugA: "isocarboxazid", drugB: "tyramine-foods", queries: ["marplan", "Tyramine foods"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan (isocarboxazid) should not be administered in combination with any of the following: … cheese or other foods with a high tyramine content", labelExample: "cheese or other foods with a high tyramine content",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
];

/**
 * Wave 13 (DailyMed v2 SPL retrieved 2026-10-19): Avoid together cards that had
 * no gold row, where the Contraindications section names the partner. Parnate
 * Table 1 (4.1) and Nardil CONTRAINDICATIONS. Every pair card already read
 * Avoid together; no grade changes.
 */
function row13(r: Row): GoldPair {
  return { ...row7(r), wave: 13, retrieved: "2026-10-19" };
}

const WAVE_13: GoldPair[] = [
  row13({
    drugA: "tranylcypromine", drugB: "dextromethorphan", queries: ["parnate", "dextromethorphan"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … dextromethorphan", labelExample: "dextromethorphan",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Table 1 lists dextromethorphan under Individual Drugs.",
  }),
  row13({
    drugA: "tranylcypromine", drugB: "sam-e", queries: ["parnate", "SAM-e"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … s-adenosyl-L-methionine (SAM-e)", labelExample: "s-adenosyl-L-methionine (SAM-e)",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Table 1 lists SAM-e under Individual Drugs.",
  }),
  row13({
    drugA: "tranylcypromine", drugB: "amoxapine", queries: ["parnate", "amoxapine"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … Other antidepressants (e.g., amoxapine", labelExample: "amoxapine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Table 1 names amoxapine under Other antidepressants.",
  }),
  row13({
    drugA: "tranylcypromine", drugB: "dopamine", queries: ["parnate", "dopamine"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … dopamine", labelExample: "dopamine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Table 1 lists dopamine under Individual Drugs.",
  }),
  row13({
    drugA: "tranylcypromine", drugB: "pseudoephedrine", queries: ["parnate", "pseudoephedrine"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … Sympathomimetic products … vasoconstrictors such as … pseudoephedrine", labelExample: "pseudoephedrine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Table 1 names pseudoephedrine under Sympathomimetic products.",
  }),
  row13({
    drugA: "tranylcypromine", drugB: "phenylephrine", queries: ["parnate", "phenylephrine"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … Sympathomimetic products … vasoconstrictors such as … phenylephrine", labelExample: "phenylephrine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Table 1 names phenylephrine under Sympathomimetic products.",
  }),
  row13({
    drugA: "tranylcypromine", drugB: "ephedrine", queries: ["parnate", "Akovaz"],
    labelDrug: "Parnate (tranylcypromine)", label: "parnate", labelSection: "4.1 Combination with Certain Drugs",
    quote: "Concomitant use of PARNATE or use in rapid succession with the products in Table 1 is contraindicated … Sympathomimetic products … vasoconstrictors such as … and ephedrine", labelExample: "ephedrine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Table 1 names ephedrine under Sympathomimetic products.",
  }),
  row13({
    drugA: "phenelzine", drugB: "tyramine-foods", queries: ["nardil", "Tyramine foods"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "Hypertensive crises during NARDIL therapy may also be caused by the ingestion of foods with a high concentration of tyramine or dopamine", labelExample: "foods with a high concentration of tyramine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
  row13({
    drugA: "phenelzine", drugB: "five-htp", queries: ["nardil", "5-HTP / L-tryptophan"],
    labelDrug: "Nardil (phenelzine)", label: "nardil", labelSection: "CONTRAINDICATIONS",
    quote: "patients being treated with NARDIL should not take sympathomimetic drugs … or related compounds (including methyldopa, L-dopa, L-tryptophan, L-tyrosine, and phenylalanine)", labelExample: "L-tryptophan",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
  }),
];

/**
 * Wave 14 (DailyMed v2 SPL setid 95fde749-44ad-4668-86c4-0ff17bca0074,
 * retrieved 2026-10-19): Marplan CONTRAINDICATIONS. Avoid together cards with no
 * gold row whose partner the section names. Every pair card already read
 * Avoid together; no grade changes. Class-only, "may precipitate" and
 * misspelled mentions are in DROPPED_CANDIDATES.
 */
function row14(r: Row): GoldPair {
  return { ...row7(r), wave: 14, retrieved: "2026-10-19" };
}

const WAVE_14: GoldPair[] = [
  row14({
    drugA: "isocarboxazid", drugB: "meperidine", queries: ["marplan", "meperidine"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Meperidine should not be used concomitantly with MAO inhibitors or within 2- or 3-weeks following MAO therapy", labelExample: "Meperidine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "The Meperidine subsection of Contraindicated MAOI-Other Drug Combinations.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "fluoxetine", queries: ["marplan", "fluoxetine"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Fluoxetine and other SSRIs should therefore not be used in combination with Marplan", labelExample: "Fluoxetine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "SSRI subsection. Sertraline and paroxetine are named only in washout and \"may occur\" sentences; see DROPPED_CANDIDATES.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "cocaine", queries: ["marplan", "cocaine"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Patients taking Marplan should not undergo elective surgery requiring general anesthesia. Also, they should not be given cocaine", labelExample: "cocaine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Anesthetic Agents subsection.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "tranylcypromine", queries: ["marplan", "tranylcypromine"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan should not be administered together with, or in close proximity to, other MAO inhibitors or dibenzazepine-related entities … Tranylcypromine sulfate", labelExample: "Tranylcypromine sulfate",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Listed under Other MAO Inhibitors.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "amitriptyline", queries: ["marplan", "amitriptyline"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan should not be administered together with, or in close proximity to, other MAO inhibitors or dibenzazepine-related entities … Amitriptyline HCL", labelExample: "Amitriptyline HCL",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Listed under Dibenzazepine-Related and Other Tricyclics.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "clomipramine", queries: ["marplan", "clomipramine"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan should not be administered together with, or in close proximity to, other MAO inhibitors or dibenzazepine-related entities … Clomipramine hydrochloride", labelExample: "Clomipramine hydrochloride",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Listed under Dibenzazepine-Related and Other Tricyclics.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "desipramine", queries: ["marplan", "desipramine"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan should not be administered together with, or in close proximity to, other MAO inhibitors or dibenzazepine-related entities … Desipramine HCL", labelExample: "Desipramine HCL",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Listed under Dibenzazepine-Related and Other Tricyclics.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "imipramine", queries: ["marplan", "imipramine"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan should not be administered together with, or in close proximity to, other MAO inhibitors or dibenzazepine-related entities … Imipramine HCL", labelExample: "Imipramine HCL",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Listed under Dibenzazepine-Related and Other Tricyclics.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "nortriptyline", queries: ["marplan", "nortriptyline"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan should not be administered together with, or in close proximity to, other MAO inhibitors or dibenzazepine-related entities … Nortriptyline HCL", labelExample: "Nortriptyline HCL",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Listed under Dibenzazepine-Related and Other Tricyclics.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "doxepin", queries: ["marplan", "doxepin"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan should not be administered together with, or in close proximity to, other MAO inhibitors or dibenzazepine-related entities … Doxepin HCL", labelExample: "Doxepin HCL",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Listed under Dibenzazepine-Related and Other Tricyclics.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "cyclobenzaprine", queries: ["marplan", "cyclobenzaprine"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan should not be administered together with, or in close proximity to, other MAO inhibitors or dibenzazepine-related entities … Cyclobenzaprine HCL", labelExample: "Cyclobenzaprine HCL",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Listed under Dibenzazepine-Related and Other Tricyclics.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "amoxapine", queries: ["marplan", "amoxapine"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan should not be administered together with, or in close proximity to, other MAO inhibitors or dibenzazepine-related entities … Amoxapine", labelExample: "Amoxapine",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Listed under Dibenzazepine-Related and Other Tricyclics.",
  }),
  row14({
    drugA: "isocarboxazid", drugB: "trimipramine", queries: ["marplan", "trimipramine"],
    labelDrug: "Marplan (isocarboxazid)", label: "marplan", labelSection: "CONTRAINDICATIONS",
    quote: "Marplan should not be administered together with, or in close proximity to, other MAO inhibitors or dibenzazepine-related entities … Trimipramine maleate", labelExample: "Trimipramine maleate",
    labelClass: "contraindicated", mechanism: "PD", domain: "psychiatry",
    note: "Listed under Dibenzazepine-Related and Other Tricyclics.",
  }),
];


export const WAVE_5_COUNT = WAVE_5.length;
export const WAVE_6_COUNT = WAVE_6.length;
export const WAVE_7_COUNT = WAVE_7.length;
export const WAVE_9_COUNT = WAVE_9.length;
export const WAVE_10_COUNT = WAVE_10.length;
export const WAVE_11_COUNT = WAVE_11.length;
export const WAVE_12_COUNT = WAVE_12.length;
export const WAVE_13_COUNT = WAVE_13.length;
export const WAVE_14_COUNT = WAVE_14.length;
export const LABEL_GOLD_SET: GoldPair[] = [...WAVE_1, ...WAVE_2, ...WAVE_3, ...WAVE_4, ...WAVE_5, ...WAVE_6, ...WAVE_7, ...WAVE_9, ...WAVE_10, ...WAVE_11, ...WAVE_12, ...WAVE_13, ...WAVE_14];

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
  // thioridazine+fluvoxamine left this list: the leftover label pin holds it at contraindicated.
  // wave 2 (MAT / ketamine clinic): methadone+zidovudine (floor moderate),
  // buprenorphine+phenelzine (floor major), and esketamine+methylphenidate
  // (floor moderate) now meet those floors and left this list. Their labels are
  // warning or avoid, not contraindicated, so they are not gap entries.

  // wave 3: #58 holds the CYP-backed misses at contraindicated (49 label pins,
  // plus boosted cobicistat combo rows whose CYP3A4 role already reads
  // contraindicated). #81 pins the seven with no CYP finding
  // (elbasvir/grazoprevir, irinotecan, drospirenone) as standalone
  // contraindicated findings, so they meet the floor and left this list.

  // wave 4: the 11 pairs that sat below major (itraconazole+dofetilide,
  // itraconazole+irinotecan, ritonavir+flecainide, paxlovid+flecainide,
  // paxlovid+phenobarbital, paxlovid+primidone, paxlovid+phenytoin,
  // paxlovid+rifampin, paxlovid+rifapentine, paxlovid+st-johns-wort,
  // lopinavir+grazoprevir-elbasvir) left this list. The wave-4 pins hold
  // them at contraindicated.
];

/**
 * Pairs that meet the "major" floor but where the label says contraindicated and
 * the engine says major ("Serious concern") rather than contraindicated
 * ("Avoid together"). Informational, for formulary owner (Grok Bot 5) review.
 * Pinned by a test so the list is pruned when the engine changes.
 */
export const KNOWN_CONTRAINDICATION_GAPS: readonly string[] = [
  // Empty. 91 pairs (41 wave 3, 50 wave 4) fell to major ("Serious concern") when
  // Ship 1.51 (7bdfa95) capped pkSeverity() at major for a strong inhibitor with a
  // sensitive substrate. They had no label pin, because the enzyme rule had been
  // holding them at contraindicated. 5bdbcd5 listed them here. Kaleb approved
  // pinning them, and each now has a wave-3 or wave-4 pin in
  // label-contraindications.ts that holds the existing CYP3A4 finding at
  // contraindicated. The gaps were closed by pins, not by an engine change.
];

/** Drugs we looked for but the catalog does not carry (not forced into the set). */
export const NOT_IN_CATALOG: { drug: string; reason: string }[] = [
  { drug: "flibanserin", reason: "Not in catalog. Paxlovid section 4 names it. Not curated." },
  { drug: "eliglustat", reason: "Not in catalog. Sporanox contraindicates it only for certain CYP2D6 metabolizer groups. Recorlev Table 6 names it with the same metabolizer condition." },
  { drug: "astemizole", reason: "Not in catalog. Named on the 2012 Biaxin contraindications list, not on the current clarithromycin tablets label." },
  { drug: "terfenadine", reason: "Not in catalog. Named on the 2012 Biaxin contraindications list, not on the current clarithromycin tablets label." },
  { drug: "cisapride", reason: "Not in catalog. Named on the Norvir, current clarithromycin, Sporanox, and Kaletra contraindication lists, and in the Recorlev Table 6 QT row." },
  { drug: "aminophylline", reason: "Not in catalog; named with theophylline on Ketalar 7.1. Wave 2 uses ketamine+theophylline instead." },
  {
    drug: "buprenorphine/naloxone",
    reason:
      "No separate combination row; 'suboxone' / 'zubsolv' resolve to the catalog 'buprenorphine' row, so wave-2 Suboxone-label pairs use that id.",
  },
  { drug: "lomitapide", reason: "Named on the Prezista, Prezcobix, Reyataz, Evotaz, clarithromycin, Sporanox, Norvir, Paxlovid, and Kaletra contraindication lists. Not in the catalog." },
  { drug: "indinavir", reason: "Named on Reyataz Table 6 and Evotaz Table 1. Not in the catalog." },
  { drug: "mesoridazine", reason: "Named on Geodon section 4.1. Not in the catalog." },
  { drug: "sparfloxacin", reason: "Named on Geodon section 4.1. Not in the catalog." },
  { drug: "halofantrine", reason: "Named on Geodon section 4.1. Not in the catalog." },
  { drug: "pentamidine", reason: "Named on Geodon section 4.1. Not in the catalog." },
  { drug: "probucol", reason: "Named on Geodon section 4.1. Not in the catalog." },
  { drug: "levomethadyl acetate", reason: "Named on Geodon section 4.1. Not in the catalog." },
];

/** Candidate pairs considered and dropped, with the reason. */
export const DROPPED_CANDIDATES: { pair: string; reason: string }[] = [
  {
    pair: "wave 7: Bixlenvo (bictegravir/lenacapavir) + strong CYP3A inducers",
    reason: "Section 4 names the class only, with no drug named. Not expanded.",
  },
  {
    pair: "wave 7: Orladeyo, Ravicti, fexinidazole",
    reason:
      "Orladeyo section 4 is 'None'. Ravicti section 4 is hypersensitivity only. Fexinidazole names metronidazole and tinidazole only as nitroimidazole hypersensitivity, not coadministration.",
  },
  {
    pair: "wave 7: riociguat + nitrates (nitroglycerin, isosorbide mononitrate, isosorbide dinitrate)",
    reason: "Adempas section 4.2 names a class ('nitrates or nitric oxide donors') and only amyl nitrite as an example. No catalog nitrate is named.",
  },
  {
    pair: "wave 7: dofetilide + prochlorperazine / dolutegravir / megestrol (Tikosyn)",
    reason:
      "Tikosyn says these 'should not be used', not 'contraindicated'. dolutegravir + dofetilide is carried by the Tivicay section 4 sentence instead. Trimethoprim, megestrol and hydrochlorothiazide are not catalog rows.",
  },
  {
    pair: "wave 7: rilpivirine + dexamethasone (Edurant Table 2)",
    reason: "Contraindicated only for more than a single-dose treatment. Not an unconditional pair.",
  },
  {
    pair: "wave 7: metronidazole + disulfiram (Flagyl)",
    reason: "The Flagyl Contraindications section says 'Do not administer' within two weeks of disulfiram, not 'contraindicated'. Skipped as ambiguous wording.",
  },
  {
    pair: "wave 7: tetrabenazine / deutetrabenazine + MAOIs or reserpine",
    reason: "MAOIs are a class (not expanded); reserpine is not a catalog row.",
  },
  {
    pair: "wave 7: eletriptan + troleandomycin / nelfinavir; Mavyret + atazanavir",
    reason: "Troleandomycin and nelfinavir are not catalog rows. Mavyret + atazanavir is already in the gold set.",
  },
  {
    pair: "wave 6: levoketoconazole + Table 6 sensitive CYP3A4 or CYP3A4 and P-gp substrates (alfentanil, avanafil, buspirone, conivaptan, dabigatran etexilate, darifenacin, darunavir, digoxin, everolimus, fexofenadine, ibrutinib, lovastatin, lurasidone, midazolam, naloxegol, nisoldipine, simvastatin, sirolimus, tacrolimus, triazolam, vardenafil)",
    reason:
      "Recorlev Table 6 says use with these is \"contraindicated or not recommended\" and does not say which. Section 4 says \"certain\" sensitive substrates. Not pinned as contraindicated. Ebastine, lomitapide, saquinavir, and tipranavir are not in the catalog.",
  },
  {
    pair: "wave 6: levoketoconazole + strong CYP3A4 inhibitors or inducers (Table 7)",
    reason: "Recorlev Table 7 says \"not recommended\", not contraindicated.",
  },
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
      "Wave 1 left these off because darunavir is labeled with a booster. Wave 3 adds them from the current Prezista and Prezcobix contraindication lists, including the combo rows.",
  },
  {
    pair: "extra verified duplicates (e.g. lovastatin+itraconazole, triazolam+ritonavir, dronedarone+clarithromycin, eplerenone+clarithromycin, lemborexant+rifampin, ticagrelor+rifampin, rivaroxaban+rifampin)",
    reason: "Label statement verified but trimmed to keep the set near 45 without repeating the same mechanism.",
  },
  {
    pair: "colchicine + Prezista / Prezcobix / Evotaz",
    reason:
      "Contraindicated only in renal and/or hepatic impairment. Not expressible on the default host. Reyataz section 4 does not name colchicine.",
  },
  {
    pair: "Reyataz + amiodarone / quinidine / lurasidone",
    reason:
      "Table 6 qualifies these as contraindicated only with ritonavir. Unboosted atazanavir on a two-drug regimen is not that statement. Evotaz lists lurasidone without that qualifier and is included.",
  },
  {
    pair: "rifampin + atazanavir (Reyataz Table 6)",
    reason:
      "Already in wave 1 from the Rifadin label (rifampin+atazanavir). Not duplicated. Evotaz + rifampin uses atazanavir-cobicistat and is included.",
  },
  {
    pair: "ergonovine + atazanavir",
    reason:
      "Named on Reyataz ergot derivatives. No ergonovine catalog row. Methylergonovine is a different drug and is paired on its own. Not listed under NOT_IN_CATALOG because that check treats a name substring as a hit.",
  },
  {
    pair: "cisapride + Reyataz",
    reason: "Named on Reyataz Table 6. Already recorded as not in the catalog.",
  },
  {
    pair: "Symtuza (darunavir/cobicistat/FTC/TAF) pairs",
    reason:
      "A combo row exists, but wave 3 anchors only the named labels: Prezista, Prezcobix, Reyataz, and Evotaz.",
  },
  {
    pair: "glecaprevir, pibrentasvir, or elbasvir as single ingredients",
    reason:
      "Labels name the fixed combinations. Paired to grazoprevir-elbasvir and glecaprevir-pibrentasvir, not the single-ingredient rows.",
  },
  {
    pair: "Biaxin brand SPL as the wave-4 clarithromycin source",
    reason:
      "DailyMed v2 effective time is 2012-02-22. Wave 4 quotes the current clarithromycin tablets SPL instead (effective 2026-06-24).",
  },
  {
    pair: "clarithromycin + astemizole / terfenadine",
    reason:
      "Named on the 2012 Biaxin contraindications list. Not on the current clarithromycin tablets contraindications section, and not in the catalog.",
  },
  {
    pair: "clarithromycin + pimozide / lovastatin / simvastatin",
    reason:
      "Already in wave 1. Not repeated from the current clarithromycin tablets label.",
  },
  {
    pair: "clarithromycin + colchicine",
    reason: "Current clarithromycin tablets: contraindicated only in renal or hepatic impairment.",
  },
  {
    pair: "itraconazole + simvastatin",
    reason: "Already in wave 1 from the Zocor label. Not repeated from Sporanox.",
  },
  {
    pair: "Sporanox + colchicine / fesoterodine / solifenacin",
    reason: "Contraindicated only in renal or hepatic impairment.",
  },
  {
    pair: "Sporanox + eliglustat",
    reason:
      "Contraindicated only in CYP2D6 poor or intermediate metabolizers, or when a CYP2D6 inhibitor is also on board. Not in the catalog.",
  },
  {
    pair: "Sporanox + venetoclax",
    reason: "Contraindicated only in CLL/SLL during initiation and ramp-up.",
  },
  {
    pair: "Sporanox + ergonovine",
    reason:
      "The label names ergometrine (ergonovine). No ergonovine catalog row. Methylergonovine is a different drug and is paired on its own. Not listed under NOT_IN_CATALOG because that check treats a name substring as a hit.",
  },
  {
    pair: "Noxafil + venetoclax",
    reason: "Contraindicated only at initiation and during the ramp-up phase in CLL or SLL.",
  },
  {
    pair: "Norvir + voriconazole",
    reason:
      "Section 7 makes the contraindication depend on the ritonavir dose. Not an unconditional pair.",
  },
  {
    pair: "Norvir + colchicine",
    reason:
      "Section 4 lists colchicine, and the patient information limits that warning to kidney or liver problems. Section 7 is a dose change, not an unconditional contraindication.",
  },
  {
    pair: "Norvir + ergotamine / simvastatin",
    reason: "Already in wave 1. Not repeated.",
  },
  {
    pair: "oral ketoconazole as a label source",
    reason:
      "Not used. Open DailyMed ketoconazole labels are topical, and these six labels do not name ketoconazole as an unconditional contraindicated partner.",
  },
  {
    pair: "Paxlovid + colchicine",
    reason: "Contraindicated only in renal and/or hepatic impairment.",
  },
  {
    pair: "Paxlovid paired to nirmatrelvir alone, or ivacaftor alone",
    reason:
      "The label is the nirmatrelvir/ritonavir kit, and it names lumacaftor/ivacaftor. Pairs use the paxlovid and lumacaftor-ivacaftor rows.",
  },
  {
    pair: "Kaletra + colchicine",
    reason:
      "Section 4 lists colchicine, and the patient information limits that warning to kidney or liver problems. Section 7 is a dose change, not an unconditional contraindication.",
  },
  {
    pair: "Kaletra + venetoclax",
    reason: "Drug Interactions says avoid. It is not a section 4 contraindication.",
  },
  {
    pair: "Geodon + tacrolimus",
    reason:
      "Named on section 4.1. The only pair card is a CYP3A4 substrate competition, not the QT contraindication. A no-enzyme card would say there is no CYP finding, which is false. Not pinned.",
  },
  {
    pair: "Geodon + quinidine gluconate / sotalol AF",
    reason: "The same named drugs as the quinidine and sotalol rows. Those rows carry the pair.",
  },
  {
    pair: "Geodon + disopyramide",
    reason:
      "Class Ia, so the section 4.1 class covers it. Trimmed at the 25-pair cap. Procainamide carries the class.",
  },
  {
    pair: "Geodon + other QT drugs described as a boxed or bolded warning",
    reason:
      "Section 4.1 states that broader class after the named list. It is not a clean class of catalog drugs. Not expanded.",
  },
  {
    pair: "Geodon + harmaline / ozanimod / tedizolid",
    reason:
      "Section 4.3 says MAOIs and names linezolid and intravenous methylene blue. Harmaline is a plant beta-carboline, ozanimod is an S1P modulator, and tedizolid is not the named oxazolidinone. Not included.",
  },
  {
    pair: "wave 7: Zokinvy + strong CYP3A inhibitors / strong or moderate CYP3A inducers",
    reason:
      "Zokinvy section 4 states both as classes and names no drug. Only the named midazolam and lovastatin / simvastatin / atorvastatin lines are pinned.",
  },
  {
    pair: "wave 7: Braftovi (encorafenib) section 4",
    reason:
      "The current label (setid 235dfc38-0f0b-4037-b501-7a9f4294740c) lists no contraindications. Nothing to pin.",
  },
  {
    pair: "wave 7: Lifyorli (relacorilant) + systemic glucocorticoids",
    reason:
      "Section 4 is conditional (glucocorticoids given for lifesaving purposes) and names no catalog drug. Not pinned.",
  },
  {
    pair: "wave 7: Etcamah (camizestrant) section 4",
    reason:
      "The current label (setid c54223d3-f3c7-4186-afa0-429d84805826) lists no contraindications. Nothing to pin.",
  },
  {
    pair: "wave 7: Contrave + bupropion SR (Wellbutrin SR)",
    reason:
      "Contrave section 4 names WELLBUTRIN SR, but no user query resolves to the bupropion-sr row first ('wellbutrin sr' returns bupropion). Bupropion and bupropion XL are pinned. Search is out of scope here.",
  },
  {
    pair: "wave 7: Multaq + cyclosporine",
    reason:
      "Section 4 lists cyclosporine as a strong CYP3A inhibitor. The only CYP card is dronedarone raising cyclosporine, the opposite direction. Pinning it would tell the wrong story. Not pinned.",
  },
  {
    pair: "wave 7: Multaq + amiodarone",
    reason:
      "Section 4 is about liver or lung toxicity from previous amiodarone use, not co-use. Not a pair contraindication.",
  },
  {
    pair: "wave 7: thioridazine + propranolol",
    reason:
      "Named on the thioridazine contraindication. The only card is thioridazine inhibiting propranolol's CYP2D6 clearance, the opposite direction, and a no-enzyme card would say there is no CYP finding. Not pinned. Pindolol has no card and is pinned.",
  },
  {
    pair: "wave 7: pimozide + methylphenidate / amphetamines",
    reason:
      "Pimozide says not to use until the tic-causing drug is withdrawn to sort out the cause of tics. Diagnostic, not an unconditional contraindication.",
  },
  {
    pair: "wave 7: pimozide + zileuton / fluvoxamine",
    reason:
      "The pimozide label says 'should also be avoided', not contraindicated.",
  },
  {
    pair: "wave 7: nefazodone + triazolam (nefazodone label)",
    reason:
      "The nefazodone label says 'should be avoided'. The pair is pinned from the triazolam label section 4, which names nefazodone.",
  },
  {
    pair: "wave 7: Tikosyn + prochlorperazine / megestrol / triamterene alone",
    reason:
      "Tikosyn says prochlorperazine, dolutegravir and megestrol 'should not be used', not contraindicated. Megestrol is not in the catalog. Triamterene is named only as a partner in hydrochlorothiazide combinations.",
  },
  {
    pair: "wave 7: Inspra + amiloride / spironolactone / triamterene",
    reason:
      "Contraindicated only when Inspra treats hypertension. Not unconditional.",
  },
  {
    pair: "wave 7: Tegretol + tricyclics",
    reason:
      "Section 4 names amitriptyline, desipramine, imipramine, protriptyline and nortriptyline only as a hypersensitivity cross-reaction, not co-use.",
  },
  {
    pair: "wave 7: disulfiram + metronidazole",
    reason:
      "Disulfiram and Flagyl name each other. The only pair card is a seizure-threshold card, not the psychotic reaction the labels describe. Not pinned (the Geodon + tacrolimus rule).",
  },
  {
    pair: "wave 7: triptans (Imitrex, Maxalt, Zomig, Amerge, almotriptan, frovatriptan, Relpax) + ergotamine / dihydroergotamine",
    reason:
      "Section 4 names ergotamine and dihydroergotamine within 24 hours. The only pair card is a serotonin card, not the vasospasm the labels describe. Not pinned without a matching card.",
  },
  {
    pair: "wave 7: Lybalvi + opioids",
    reason:
      "Section 4 says 'patients using opioids' and names no drug.",
  },
  {
    pair: "wave 7: Movantik, Inspra, Latuda, Multaq + nelfinavir / indinavir / troleandomycin / mibefradil / avasimibe / saquinavir",
    reason:
      "Named on these labels. Not in the catalog.",
  },
  {
    pair: "wave 7: Lexapro / Celexa + pimozide; Zoloft + pimozide; Tegretol + nefazodone",
    reason:
      "Same pair as the pimozide-label and nefazodone rows. One row per pair.",
  },
  {
    pair: "wave 7: Zoloft oral solution + disulfiram",
    reason:
      "Contraindicated for the oral solution only (it contains alcohol). The catalog sertraline row is not formulation-specific.",
  },
  {
    pair: "wave 9: Parnate + carbamazepine",
    reason: "Named in Parnate Table 1. The only pair cards are washout cards, not the hypertensive or serotonin reaction the label describes. Not pinned without a matching card.",
  },
  {
    pair: "wave 9: Azilect + dextromethorphan",
    reason: "Named on Azilect section 4 for psychosis or bizarre behavior. The pair card is a serotonin card. Not pinned without a matching card.",
  },
  {
    pair: "wave 9: Emsam (selegiline transdermal) + SSRIs, SNRIs, clomipramine, imipramine, meperidine, tramadol, methadone, dextromethorphan, carbamazepine",
    reason: "Contraindicated on the transdermal system label. The catalog selegiline row is not formulation-specific (the Zoloft oral solution rule).",
  },
  {
    pair: "wave 9: Parnate + bupropion, trazodone, nefazodone, vilazodone, vortioxetine",
    reason: "Deferred from wave 9. Trazodone, nefazodone, vilazodone and vortioxetine were added in wave 10; bupropion is dropped (see wave 10).",
  },

  {
    pair: "wave 9: Nardil",
    reason: "Deferred from wave 9. Reviewed line by line in wave 10.",
  },

  {
    pair: "wave 9: Inspra + spironolactone, amiloride, triamterene; Multaq + cyclosporine",
    reason: "Out of scope for this wave (psychiatric, MAT and ketamine focus). Candidates for a cardiology wave.",
  },
  {
    pair: "wave 10: Parnate + bupropion; Nardil + bupropion; Marplan + bupropion",
    reason: "Each label names bupropion. The only pair cards are washout cards (major), not a serotonin or hypertensive card, so a pin would raise a washout card to Avoid together. Not pinned without a matching card (the Parnate + carbamazepine rule).",
  },
  {
    pair: "wave 10: Nardil + levodopa, methyldopa, alcohol; Nardil + guanethidine",
    reason: "Named in Nardil's Contraindications section. Levodopa, methyldopa and alcohol have only a washout card. Guanethidine is not in the catalog.",
  },
  {
    pair: "wave 10: Nardil + fluoxetine, meperidine, dextromethorphan; Zyvox + phenelzine",
    reason: "Already in the gold set. One row per pair.",
  },
  {
    pair: "wave 10: Marplan + amphetamines, narcotics, alcohol, antihypertensives",
    reason: "Marplan names these as classes, not individual drugs.",
  },
  {
    pair: "wave 11 (severity change, for Kaleb): Pifeltro (doravirine) + rifampin, rifapentine, carbamazepine, oxcarbazepine, phenobarbital, phenytoin, enzalutamide, mitotane, St. John's wort",
    reason: "Pifeltro section 4 names each as a strong CYP3A inducer it is contraindicated with. Each pair's card is a CYP3A4 inducer card at Serious concern (major), not contraindicated. Pinning would raise 9 pairs to Avoid together. Not pinned.",
  },
  {
    pair: "wave 11 (severity change, for Kaleb): Rukobia (fostemsavir) + rifampin, carbamazepine, phenytoin, enzalutamide, mitotane, St. John's wort",
    reason: "Named in Rukobia section 4 (strong CYP3A inducers). CYP3A4 inducer cards read major. Pinning would raise 6 pairs. Not pinned.",
  },
  {
    pair: "wave 11 (severity change, for Kaleb): Genvoya (elvitegravir/cobicistat) + rifampin, carbamazepine, phenobarbital, phenytoin, St. John's wort",
    reason: "Named in Genvoya section 4. CYP3A4 inducer cards read major. Pinning would raise 5 pairs. Not pinned.",
  },
  {
    pair: "wave 11 (severity change, for Kaleb): Prezcobix (darunavir/cobicistat) + carbamazepine, phenobarbital, phenytoin",
    reason: "Named in Prezcobix section 4. CYP3A4 inducer cards read major. Pinning would raise 3 pairs. Not pinned.",
  },
  {
    pair: "wave 11 (severity change, for Kaleb): Cresemba (isavuconazonium) + rifampin, carbamazepine, St. John's wort",
    reason: "Named in Cresemba section 4 (strong CYP3A4 inducers). CYP3A4 inducer cards read major. Pinning would raise 3 pairs. Not pinned.",
  },
  {
    pair: "wave 11 (severity change, for Kaleb): Vfend (voriconazole) + carbamazepine, efavirenz, rifabutin, St. John's wort",
    reason: "Named in Vfend section 4. CYP3A4 / CYP2C19 inducer cards read major. Pinning would raise 4 pairs. The efavirenz line is dose-conditional on the label. Not pinned.",
  },
  {
    pair: "wave 11 (severity change, for Kaleb): Edurant (rilpivirine) + dexamethasone; Biltricide (praziquantel) + rifampin",
    reason: "Named in each label's section 4 (Edurant: systemic dexamethasone, more than a single-dose treatment; Biltricide: strong CYP3A inducers such as rifampin). CYP3A4 inducer cards read major. Not pinned.",
  },
  {
    pair: "wave 11 (severity change, for Kaleb): Coartem (artemether/lumefantrine) + rifampin, carbamazepine, phenytoin, St. John's wort",
    reason: "Listed under section 4 'Strong CYP3A4 Inducers', but the sentence says coadministration 'can result in decreased concentrations' rather than 'contraindicated'. Inducer cards read major. Not pinned.",
  },
  {
    pair: "wave 11: Cabenuva (cabotegravir/rilpivirine) + carbamazepine, oxcarbazepine, phenobarbital, phenytoin, rifabutin, rifampin, rifapentine, dexamethasone, St. John's wort",
    reason: "Named in Cabenuva section 4. The catalog cabotegravir row has no inducer card for these (washout card only, or no card), so there is nothing contraindicated to hold. Needs a catalog change before any pin.",
  },
  {
    pair: "wave 11: Tybost (cobicistat) + rifampin, carbamazepine, phenobarbital, phenytoin, nevirapine, St. John's wort",
    reason: "Named in Tybost section 4. Cards are washout cards, a cobicistat inhibitor card (major), or none. No contraindicated inducer card to hold. Not pinned.",
  },
  {
    pair: "wave 11: Paxlovid, Latuda, Ranexa, Xtandi, Biktarvy, Mavyret, Vosevi, Edurant (other inducers), Korlym, Corlanor, Multaq, Inspra, Brilinta, Eliquis, Xarelto and others",
    reason: "Checked. Inducer pairs named in their section 4 are already pinned or in the gold set, or the label does not contraindicate an inducer (Eliquis, Xarelto, Brilinta: warnings only).",
  },
  {
    pair: "wave 11 (severity-change candidates for Kaleb): Pifeltro (doravirine) + carbamazepine, oxcarbazepine, phenobarbital, phenytoin, enzalutamide, rifampin, rifapentine, mitotane, St. John's wort",
    reason: "Pifeltro section 4 names each drug as a strong CYP3A inducer it is contraindicated with. The existing CYP3A4 inducer card reads Serious concern (major), so a pin would raise it to Avoid together. Not pinned without Kaleb's approval.",
  },
  {
    pair: "wave 11 (severity-change candidates for Kaleb): Rukobia (fostemsavir) + enzalutamide, carbamazepine, phenytoin, rifampin, mitotane, St. John's wort",
    reason: "Rukobia section 4 names each drug. The existing CYP3A4 inducer card reads major. A pin would change severity. Not pinned.",
  },
  {
    pair: "wave 11 (severity-change candidates for Kaleb): Genvoya (elvitegravir) + carbamazepine, phenobarbital, phenytoin, rifampin, St. John's wort",
    reason: "Genvoya section 4 names each drug. The existing CYP3A4 inducer card reads major. A pin would change severity. Not pinned.",
  },
  {
    pair: "wave 11 (severity-change candidates for Kaleb): Prezcobix (darunavir) + carbamazepine, phenobarbital, phenytoin",
    reason: "Prezcobix section 4 names each anticonvulsant. The existing CYP3A4 inducer card reads major. A pin would change severity. Not pinned.",
  },
  {
    pair: "wave 11 (severity-change candidates for Kaleb): Vfend (voriconazole) + carbamazepine, rifabutin",
    reason: "Vfend section 4 names both. The existing CYP3A4/CYP2C19 inducer cards read major. A pin would change severity. Not pinned. Vfend + efavirenz is contraindicated only at standard doses, so it is conditional and dropped.",
  },
  {
    pair: "wave 11 (severity-change candidates for Kaleb): Cresemba (isavuconazole) + rifampin, carbamazepine, St. John's wort; Coartem + rifampin, carbamazepine, phenytoin, St. John's wort; Biltricide (praziquantel) + rifampin",
    reason: "Each section 4 names these drugs as strong CYP3A4 inducers. The existing CYP3A4 inducer card reads major. A pin would change severity. Not pinned.",
  },
  {
    pair: "wave 11: Vocabria (cabotegravir) + carbamazepine, oxcarbazepine, phenobarbital, phenytoin, rifampin, rifapentine, rifabutin; Tybost (cobicistat) + carbamazepine, phenobarbital, phenytoin, rifampin, St. John's wort, nevirapine",
    reason: "Named in section 4, but the catalog has no matching inducer card (washout card only, or no card) for cabotegravir (UGT1A1 induction) or for cobicistat as a standalone row. Pinning would add a new contraindicated card. Not pinned.",
  },
  {
    pair: "wave 11: Juluca, Odefsey, Edurant + dexamethasone",
    reason: "Juluca and Odefsey are combination products whose catalog rows (dolutegravir, emtricitabine) do not carry the rilpivirine contraindication. Dexamethasone is contraindicated only beyond a single dose, so it is conditional.",
  },
  {
    pair: "wave 11: Xadago + dextromethorphan",
    reason: "Named on Xadago section 4 for psychosis or abnormal behavior. The pair card is a serotonin card. Not pinned without a matching card (the Azilect + dextromethorphan rule).",
  },
  {
    pair: "wave 11 severity-change candidates (Kaleb): Pifeltro (doravirine) + rifampin, rifapentine, carbamazepine, oxcarbazepine, phenobarbital, phenytoin, enzalutamide, mitotane, St. John's wort",
    reason: "Named in Pifeltro section 4. Each pair's only PK card is a CYP3A4 inducer card at major (Serious concern). A pin would raise it to Avoid together, so not pinned under this wave's rule.",
  },
  {
    pair: "wave 11 severity-change candidates (Kaleb): Rukobia (fostemsavir) + rifampin, carbamazepine, phenytoin, enzalutamide, mitotane, St. John's wort",
    reason: "Named in Rukobia section 4. CYP3A4 inducer cards read major. A pin would change severity.",
  },
  {
    pair: "wave 11 severity-change candidates (Kaleb): Cresemba (isavuconazole) + rifampin, carbamazepine, St. John's wort; Biltricide (praziquantel) + rifampin",
    reason: "Named in section 4. CYP3A4 inducer cards read major. A pin would change severity.",
  },
  {
    pair: "wave 11 severity-change candidates (Kaleb): Vfend (voriconazole) + rifabutin, carbamazepine, St. John's wort",
    reason: "Named in Vfend section 4. CYP3A4/CYP2C19 inducer and inhibitor cards read major. A pin would change severity. Vfend + efavirenz is conditional on the efavirenz dose and is not a candidate.",
  },
  {
    pair: "wave 11 severity-change candidates (Kaleb): Tybost (cobicistat) + carbamazepine, nevirapine (CYP3A4 card at major); + rifampin, phenobarbital, phenytoin, St. John's wort (washout card only or no card)",
    reason: "Named in Tybost section 4 (some lines apply only with atazanavir). No card reads Avoid together, so a pin would change severity or add a standalone finding.",
  },
  {
    pair: "wave 11: Genvoya / Stribild (elvitegravir) + rifampin, carbamazepine, phenobarbital, phenytoin, St. John's wort; Symtuza / Prezcobix (darunavir) + carbamazepine, phenobarbital, phenytoin; Cabenuva + rifampin, rifabutin, carbamazepine and others",
    reason: "Contraindicated on cobicistat- or rilpivirine-containing combination products. The catalog rows (elvitegravir, darunavir, cabotegravir) are single agents, and the inducer cards read major. Not pinned (formulation rule); severity-change candidates if the catalog adds the combination products.",
  },
  {
    pair: "wave 11: Edurant / Odefsey / Complera / Juluca + dexamethasone",
    reason: "Contraindicated only for more than a single dose. Conditional; not pinned.",
  },
  {
    pair: 'wave 12 (label-cited outside Contraindications, for Kaleb): Marplan (isocarboxazid) + 5-HTP / L-tryptophan',
    reason: 'Marplan CONTRAINDICATIONS, Sympathomimetics paragraph: "Use of sympathomimetics and compounds such as guanethidine, methyldopa, methylphenidate, reserpine, epinephrine, norepinephrine, phenylalanine, dopamine, levodopa, tyrosine, and tryptophan with Marplan may precipitate hypertension, headache, and related symptoms." Inside the section, but the sentence says may precipitate, not should not be administered. Not pinned; grade unchanged.',
  },
  {
    pair: 'wave 12 (label-cited outside Contraindications, for Kaleb): Parnate (tranylcypromine) + Tyramine foods',
    reason: 'Not in Table 1 (4.1). Boxed Warning, 5.2 and 7.2 name it. 5.2: "MAOIs, including PARNATE, have been associated with hypertensive crises caused by the ingestion of foods or beverages with a high concentration of tyramine." Not pinned; grade unchanged.',
  },
  {
    pair: 'wave 12 (label-cited outside Contraindications, for Kaleb): Selegiline HCl capsules + Tyramine foods',
    reason: 'WARNINGS: "Rare cases of hypertensive reactions associated with ingestion of tyramine-containing foods have been reported in patients taking the recommended daily dose of selegiline." Not in CONTRAINDICATIONS. Not pinned; grade unchanged.',
  },
  {
    pair: 'wave 12 (label-cited outside Contraindications, for Kaleb): Azilect (rasagiline) + Tyramine foods',
    reason: '5.1 Hypertension: "Dietary tyramine restriction is not required during treatment with recommended doses of AZILECT." The label also says certain very high tyramine foods could cause severe hypertension. Not in section 4. Not pinned; grade unchanged.',
  },
  {
    pair: 'wave 12 (label-cited outside Contraindications, for Kaleb): Xadago (safinamide) + Tyramine foods',
    reason: '5.1 Hypertension: "Dietary tyramine restriction is not required during treatment with recommended doses of XADAGO." Also 7.6 Tyramine. Not in section 4. Not pinned; grade unchanged.',
  },
  {
    pair: 'wave 12 (label-cited outside Contraindications, for Kaleb): Sivextro (tedizolid) + Tyramine foods',
    reason: 'Named only in 12.3 Pharmacokinetics (a tyramine pressor study): "Two placebo-controlled crossover studies were conducted to assess the potential of … SIVEXTRO at steady state to enhance pressor responses to pseudoephedrine and tyramine in healthy adults." Not in section 4. Not pinned; grade unchanged.',
  },
  {
    pair: 'wave 12 (label-cited outside Contraindications, for Kaleb): Zeposia (ozanimod) + Tyramine foods',
    reason: 'Named only in 12.2 and 12.3: "No clinically significant effect in tyramine induced pressor response was observed" and ozanimod "had no effect on the plasma concentrations of oral tyramine". The label text does not support Avoid together. Not pinned; grade unchanged.',
  },
  {
    pair: 'wave 12 (label-cited outside Contraindications, for Kaleb): Bactrim (sulfamethoxazole and trimethoprim) + methotrexate',
    reason: 'PRECAUTIONS, Drug Interactions table: "Methotrexate Avoid concurrent use". Label class is avoid, not contraindicated. Not pinned; grade unchanged.',
  },
  {
    pair: 'wave 12 (not named on label): Selegiline, Azilect, Xadago, ProvayBlue, Sivextro, Zeposia + 5-HTP / L-tryptophan; ProvayBlue + Tyramine foods',
    reason: 'The current SPL does not name tryptophan, hydroxytryptophan or tyramine. ProvayBlue names serotonergic drug classes (SSRIs, SNRIs, MAOIs) and opioids only. Not pinned; grade unchanged.',
  },
  {
    pair: 'wave 12 (no FDA label): moclobemide, harmaline + 5-HTP / L-tryptophan and Tyramine foods',
    reason: 'No US-approved DailyMed label for moclobemide or harmaline, and 5-HTP / L-tryptophan and tyramine foods are supplements or foods. Not pinned; grade unchanged.',
  },
  {
    pair: 'wave 12 (severity change, for Kaleb): Varubi (rolapitant) + thioridazine',
    reason: 'Varubi 4 CONTRAINDICATIONS (setid 8670c3cf-82d9-466d-be49-de33d8c8742b, retrieved 2026-10-19): "VARUBI is contraindicated in patients taking CYP2D6 substrates with a narrow therapeutic index, such as thioridazine and pimozide." The pair card reads major (Serious concern). A pin would raise it to Avoid together, so not pinned.',
  },
  {
    pair: 'wave 12 (severity change, for Kaleb): Varubi (rolapitant) + pimozide',
    reason: 'Varubi 4 CONTRAINDICATIONS (setid 8670c3cf-82d9-466d-be49-de33d8c8742b, retrieved 2026-10-19): "VARUBI is contraindicated in patients taking CYP2D6 substrates with a narrow therapeutic index, such as thioridazine and pimozide." The pair card reads moderate (Use care). A pin would raise it to Avoid together, so not pinned.',
  },
  {
    pair: "wave 13: Parnate (tranylcypromine) + norepinephrine; Xadago (safinamide) + norepinephrine",
    reason: "A name scan matched \"norepinephrine\" only inside \"serotonin and norepinephrine reuptake inhibitors\". Neither section 4 names norepinephrine as a drug. Not pinned; grade unchanged.",
  },
  {
    pair: "wave 13: Parnate (tranylcypromine) + Ephedra",
    reason: "Table 1 names \"dietary supplements that contain sympathomimetics\" as a class and names ephedrine, not ephedra. Not an exact name. Not pinned; grade unchanged.",
  },
  {
    pair: "wave 13: Gemfibrozil + simvastatin",
    reason: 'Gemfibrozil tablets CONTRAINDICATIONS (setid 1967afce-ce55-4b10-bd8c-e4e94130de87): "Combination therapy of gemfibrozil with simvastatin". Zocor section 4 also names gemfibrozil. The card already reads Avoid together and the quote is exact, but a pin adds a public pair page, and the card\'s existing PubMed note says "not free", which the pair-page copy guard rejects. Not pinned until that card note is reworded (Kaleb\'s call); grade unchanged.',
  },
  {
    pair: "wave 14: Marplan (isocarboxazid) + sertraline, paroxetine, fluvoxamine, citalopram, venlafaxine",
    reason: 'Named only in a washout sentence ("At least 2 weeks should be allowed after stopping sertraline … or paroxetine") or a "Serious reactions may also occur" example list. The contraindication sentence ("should not be administered in combination with any SSRI") names the class only. Not pinned; grade unchanged.',
  },
  {
    pair: "wave 14 (for Kaleb): Marplan (isocarboxazid) + methylphenidate, epinephrine, norepinephrine, dopamine",
    reason: 'Named in CONTRAINDICATIONS, but the sentence says use "with Marplan may precipitate hypertension, headache, and related symptoms", not "should not be administered" (same wording as the Marplan + tryptophan row). Possible pin candidates for Kaleb; not pinned; grade unchanged.',
  },
  {
    pair: "wave 14: Marplan (isocarboxazid) + amphetamine",
    reason: 'Section names "sympathomimetics (including amphetamines)" as a class, not the catalog drug (the wave 10 class rule). Not pinned.',
  },
  {
    pair: "wave 14: Marplan (isocarboxazid) + protriptyline",
    reason: 'The SPL table spells it "Protripyline HCL". Not an exact name match. Not pinned until the label is corrected or Kaleb accepts the spelling.',
  },
  {
    pair: "wave 14: Parnate (tranylcypromine) + amphetamine, methylphenidate",
    reason: 'Table 1 names the class row "Amphetamines and methylphenidates and derivatives", not individual drugs. Not pinned.',
  },
  {
    pair: "wave 14: Parnate, Xadago, Emsam + epinephrine; Xadago, Emsam + norepinephrine",
    reason: 'Substring false matches: "epinephrine" only inside "norepinephrine", and "norepinephrine" only inside "serotonin-norepinephrine reuptake inhibitors". Emsam is also covered by the wave 9 transdermal-formulation rule. Not pinned.',
  },
  {
    pair: "wave 14: Nardil (phenelzine) + Mucuna pruriens (L-DOPA)",
    reason: 'Nardil names "L-dopa", a constituent, not Mucuna pruriens. Not an exact name. Not pinned.',
  },
  {
    pair: "wave 14 (conditional): Entresto (sacubitril/valsartan) + aliskiren",
    reason: 'Section 4: "with concomitant use of aliskiren in patients with diabetes". Contraindicated only in a patient subgroup. Not pinned; grade unchanged.',
  },
];
