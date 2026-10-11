/**
 * Hormonal contraception interaction teaching engine.
 *
 * Reads the tray for drugs that lower contraceptive hormones (enzyme inducers),
 * drugs whose own levels a contraceptive moves (lamotrigine, valproate),
 * sugammadex, emergency contraception, and the pairing that matters most: a
 * drug that is both an inducer and a teratogen. Methods are taught one at a
 * time: combined pill, patch or ring; progestin-only pill; etonogestrel
 * implant; DMPA; levonorgestrel IUD; copper IUD.
 *
 * Inducers are read three ways, most certain first:
 *   1. A US MEC 2024 drug-interaction row names the drug. Category numbers are
 *      quoted as printed.
 *   2. An FDA label or the FSRH 2022 guidance names it.
 *   3. The catalog marks it as a CYP3A4 inducer and nothing here names it.
 *      That is a signal to read the label, not a verdict.
 * Nevirapine and etravirine are the exception that teaches the rule: the
 * catalog marks CYP3A4 induction, yet US MEC 2024 rates every method 1 with
 * them, on outcome data.
 *
 * Reuses, rather than restates: catalog CYP3A4 roles, the desk's induction
 * clock (cyp-kinetics.ts), the sugammadex warning (anesthesia-reversal.ts),
 * and teratogen lines from clinic.ts and pregnancy-lactation.ts.
 *
 * Teaching, not a method choice, not a dose, not an order. The Prescribing
 * Information governs.
 *
 * Sources:
 *   Nguyen AT, et al. US MEC 2024. MMWR Recomm Rep 2024;73(RR-4):1–126.
 *   FSRH CEU Clinical Guidance: Drug Interactions with Hormonal Contraception. May 2022.
 *   FDA labels: Lamictal, ella, Bridion, Nexplanon, Topamax, Provigil, Depakote,
 *   Tracleer, Paxlovid, Aptiom, Xcopri.
 */

import { DRUG_BY_ID } from "./catalog";
import { clinicFor } from "./clinic";
import { HIGH_YIELD_TERATOGENS } from "./pregnancy-lactation";
import { REVERSAL_PROFILES } from "./anesthesia-reversal";
import { MOLECULAR_MODES } from "./cyp-kinetics";
import type { HostContext, Strength } from "./types";

export const CONTRACEPTION_DISCLAIMER =
  "Teaching, not a method choice, a dose, or an order. US MEC categories and FSRH advice describe populations; the Prescribing Information, current guidance, and the treating clinician govern.";

export const CONTRACEPTION_CITATIONS: string[] = [
  "Nguyen AT, Curtis KM, Tepper NK, et al. U.S. Medical Eligibility Criteria for Contraceptive Use, 2024. MMWR Recomm Rep 2024;73(No. RR-4):1–126. (Drug interaction rows: anticonvulsants, lamotrigine, rifamycins, antiretrovirals, antibiotics, St. John's wort.)",
  "Faculty of Sexual & Reproductive Healthcare, Clinical Effectiveness Unit. Clinical Guidance: Drug Interactions with Hormonal Contraception. May 2022. (28-day window, emergency contraception, teratogens, sugammadex, lamotrigine, topiramate, griseofulvin.)",
  "LAMICTAL (lamotrigine) Prescribing Information. GlaxoSmithKline. Sections 2.1, 5.9, 7 and 12.3 (estrogen-containing oral contraceptives; valproate).",
  "ella (ulipristal acetate) Prescribing Information. Section 7 (CYP3A4 inducers; hormonal contraception after ella).",
  "BRIDION (sugammadex) Prescribing Information. Merck. Section 7 (hormonal contraceptives).",
  "NEXPLANON (etonogestrel implant) Prescribing Information. Organon. Section 7 (enzyme inducers; back-up for 28 days after the inducer stops).",
  "TOPAMAX (topiramate) Prescribing Information. Janssen. Fetal toxicity; section 7 (oral contraceptives).",
  "PROVIGIL (modafinil) and NUVIGIL (armodafinil) Prescribing Information. Section 7 (steroidal contraceptives; one month after stopping).",
  "DEPAKOTE (divalproex sodium) Prescribing Information. AbbVie. Section 7 (estrogen-containing hormonal contraceptives).",
  "TRACLEER (bosentan) Prescribing Information. Boxed warning (embryo-fetal toxicity); section 7 (hormonal contraceptives).",
  "PAXLOVID (nirmatrelvir; ritonavir) Prescribing Information. Pfizer. Section 7 (ethinyl estradiol).",
  "APTIOM (eslicarbazepine acetate) and XCOPRI (cenobamate) Prescribing Information. Section 7 (hormonal contraceptives).",
];

/* ── Small helpers ────────────────────────────────────────────────────── */

const inCatalog = (id: string) => id in DRUG_BY_ID;
const nameOf = (id: string) => DRUG_BY_ID[id]?.name ?? id;
const names = (ids: string[]) => ids.map(nameOf).join(", ");
const uniq = (ids: string[]) => [...new Set(ids)];
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

/** Formulations that share a parent's interaction profile. The catalog leaves XR rows without enzyme roles. */
const PARENT: Record<string, string> = {
  "carbamazepine-xr": "carbamazepine",
  "oxcarbazepine-xr": "oxcarbazepine",
  "topiramate-xr": "topiramate",
  "phenytoin-fosphenytoin": "phenytoin",
  fosphenytoin: "phenytoin",
  "lamotrigine-xr": "lamotrigine",
  "lamotrigine-odt": "lamotrigine",
  divalproex: "valproate",
  "valproate-sprinkle": "valproate",
  "valproate-iv": "valproate",
};

export const parentOf = (id: string) => PARENT[id] ?? id;

/** CYP3A4 inducer strength as the catalog stores it, falling back to the parent formulation. */
export function cyp3a4InducerStrength(id: string): Strength | null {
  const read = (x: string): Strength | null => {
    for (const role of DRUG_BY_ID[x]?.enzymes ?? []) {
      if (role.enzyme === "CYP3A4" && role.kind === "inducer") return role.strength;
    }
    return null;
  };
  return read(id) ?? (parentOf(id) !== id ? read(parentOf(id)) : null);
}

/* ── Methods ──────────────────────────────────────────────────────────── */

export type MethodId = "chc" | "pop" | "implant" | "dmpa" | "lng-iud" | "cu-iud";

export const METHOD_IDS: MethodId[] = ["chc", "pop", "implant", "dmpa", "lng-iud", "cu-iud"];

export interface ContraceptiveMethod {
  id: MethodId;
  label: string;
  short: string;
  /** What FSRH 2022 expects an enzyme inducer to do to this method. */
  inducerEffect: "reduced" | "unaffected";
  why: string;
}

export const METHODS: Record<MethodId, ContraceptiveMethod> = {
  chc: {
    id: "chc",
    label: "Combined pill, patch or ring",
    short: "Combined",
    inducerEffect: "reduced",
    why: "Inducers speed liver clearance of the estrogen and the progestin. FSRH 2022: not advised during an inducer and for 28 days after it stops.",
  },
  pop: {
    id: "pop",
    label: "Progestin-only pill",
    short: "POP",
    inducerEffect: "reduced",
    why: "Low, steady progestin levels leave little margin. FSRH 2022: not advised during an inducer and for 28 days after. Taking two pills is not a fix.",
  },
  implant: {
    id: "implant",
    label: "Etonogestrel implant",
    short: "Implant",
    inducerEffect: "reduced",
    why: "Etonogestrel is cleared faster under induction. FSRH 2022: not advised during an inducer and for 28 days after. The Nexplanon label asks for backup for 28 days after the inducer stops.",
  },
  dmpa: {
    id: "dmpa",
    label: "DMPA injection",
    short: "DMPA",
    inducerEffect: "unaffected",
    why: "Serum progestin stays high enough. FSRH 2022: no extra precautions.",
  },
  "lng-iud": {
    id: "lng-iud",
    label: "Levonorgestrel IUD",
    short: "LNG-IUD",
    inducerEffect: "unaffected",
    why: "It acts locally on the lining of the uterus. FSRH 2022: no extra precautions.",
  },
  "cu-iud": {
    id: "cu-iud",
    label: "Copper IUD",
    short: "Copper IUD",
    inducerEffect: "unaffected",
    why: "No hormone to clear. It is also the most effective emergency contraception (FSRH 2022).",
  },
};

/** Methods an enzyme inducer can undermine (FSRH 2022). Oral emergency contraception is taught separately. */
const INDUCER_AFFECTS: MethodId[] = METHOD_IDS.filter((m) => METHODS[m].inducerEffect === "reduced");

/* ── US MEC 2024 drug-interaction rows ────────────────────────────────── */

export type MecRowId =
  | "anticonvulsants"
  | "rifamycins"
  | "st-johns-wort"
  | "efavirenz"
  | "boosted-pi"
  | "nnrti-no-effect"
  | "lamotrigine"
  | "antibiotics";

export interface MecRow {
  id: MecRowId;
  label: string;
  /** As printed. "1–2" on IUD columns for antiretrovirals reflects HIV status at insertion, not the drug. */
  categories: Record<MethodId, string>;
  note: string;
}

const cats = (cu: string, lng: string, implant: string, dmpa: string, pop: string, chc: string): Record<MethodId, string> => ({
  "cu-iud": cu,
  "lng-iud": lng,
  implant,
  dmpa,
  pop,
  chc,
});

const ARV_IUD_NOTE = "IUD 1–2 reflects HIV clinical status at insertion; there is no known drug interaction with IUDs.";

export const US_MEC_2024_ROWS: Record<MecRowId, MecRow> = {
  anticonvulsants: {
    id: "anticonvulsants",
    label: "Certain anticonvulsants (phenytoin, carbamazepine, barbiturates, primidone, topiramate, oxcarbazepine)",
    categories: cats("1", "1", "2", "1", "3", "3"),
    note: "Likely to reduce the effectiveness of combined methods, progestin-only pills and the implant. US MEC encourages other methods for long-term users.",
  },
  rifamycins: {
    id: "rifamycins",
    label: "Rifampin or rifabutin therapy",
    categories: cats("1", "1", "2", "1", "3", "3"),
    note: "The balance of evidence suggests rifampin reduces the effectiveness of combined pills.",
  },
  "st-johns-wort": {
    id: "st-johns-wort",
    label: "St. John's wort",
    categories: cats("1", "1", "2", "1", "2", "2"),
    note: "Data raise concern that it might decrease the effectiveness of hormonal methods.",
  },
  efavirenz: {
    id: "efavirenz",
    label: "Efavirenz",
    categories: cats("1–2", "1–2", "2", "1", "2", "2"),
    note: `These interactions might reduce the effectiveness of the hormonal method. ${ARV_IUD_NOTE}`,
  },
  "boosted-pi": {
    id: "boosted-pi",
    label: "Ritonavir-boosted atazanavir, darunavir, fosamprenavir, saquinavir or tipranavir",
    categories: cats("1–2", "1–2", "2", "1", "2", "2"),
    note: `Ethinyl estradiol falls; progestin can rise or fall with the partner drug. Ritonavir-boosted lopinavir is 1 for every method. ${ARV_IUD_NOTE}`,
  },
  "nnrti-no-effect": {
    id: "nnrti-no-effect",
    label: "Nevirapine or etravirine",
    categories: cats("1–2", "1–2", "1", "1", "1", "1"),
    note: `Pregnancy-rate and PK studies show no meaningful loss of effect. ${ARV_IUD_NOTE}`,
  },
  lamotrigine: {
    id: "lamotrigine",
    label: "Lamotrigine",
    categories: cats("1", "1", "1", "1", "1", "3"),
    note: "Category 3 for combined methods applies to lamotrigine monotherapy. The worry is falling lamotrigine and seizures, not pregnancy.",
  },
  antibiotics: {
    id: "antibiotics",
    label: "Broad-spectrum antibiotics",
    categories: cats("1", "1", "1", "1", "1", "1"),
    note: "Most broad-spectrum antibiotics do not affect the effectiveness of combined pills.",
  },
};

/* ── Hormones on the tray ─────────────────────────────────────────────── */

interface HormoneRole {
  methods: MethodId[];
  /** The product always carries ethinyl estradiol (the estrogen that moves lamotrigine). */
  estrogen: boolean;
  ec: "lng" | "upa" | null;
  role: string;
}

const HORMONE_ROLES: Record<string, HormoneRole> = {
  "ethinyl-estradiol": { methods: ["chc"], estrogen: true, ec: null, role: "The estrogen in combined pills, the patch and most rings." },
  segesterone: { methods: ["chc"], estrogen: true, ec: null, role: "Progestin in the yearlong ring, which also holds ethinyl estradiol." },
  norgestimate: { methods: ["chc"], estrogen: false, ec: null, role: "Progestin in combined pills." },
  dienogest: { methods: ["chc"], estrogen: false, ec: null, role: "Progestin in a combined pill with estradiol valerate." },
  desogestrel: { methods: ["chc", "pop"], estrogen: false, ec: null, role: "Progestin in combined pills; a progestin-only pill outside the US." },
  drospirenone: { methods: ["pop", "chc"], estrogen: false, ec: null, role: "A progestin-only pill (Slynd) or a combined pill partner." },
  norethindrone: { methods: ["pop", "chc"], estrogen: false, ec: null, role: "A progestin-only pill or a combined pill partner." },
  norgestrel: { methods: ["pop"], estrogen: false, ec: null, role: "The over-the-counter progestin-only pill (Opill)." },
  etonogestrel: { methods: ["implant", "chc"], estrogen: false, ec: null, role: "The implant (Nexplanon); also the progestin in a combined ring." },
  "levonorgestrel-oral": { methods: ["chc"], estrogen: false, ec: "lng", role: "Emergency contraception (Plan B) or a combined pill partner." },
  medroxyprogesterone: { methods: ["dmpa"], estrogen: false, ec: null, role: "The DMPA injection when given as Depo-Provera. Oral Provera is not contraception." },
  "levonorgestrel-iud": { methods: ["lng-iud"], estrogen: false, ec: null, role: "The levonorgestrel IUD." },
  ulipristal: { methods: [], estrogen: false, ec: "upa", role: "Emergency contraception (ella)." },
};

export const HORMONAL_CONTRACEPTIVE_IDS: string[] = Object.keys(HORMONE_ROLES).filter(inCatalog);
const HORMONE_SET = new Set(HORMONAL_CONTRACEPTIVE_IDS);

/** Menopausal hormone therapy rows. Not contraception, but inducers lower them too. */
export const HORMONE_THERAPY_IDS: string[] = ["estradiol-oral", "estradiol-patch", "conjugated-estrogens", "progesterone-micronized"].filter(inCatalog);
const HT_SET = new Set(HORMONE_THERAPY_IDS);

/** Order matters: the first match wins when the tray suggests more than one method. */
const LIKELY_METHOD_ORDER: { ids: string[]; method: MethodId }[] = [
  { ids: ["ethinyl-estradiol", "segesterone", "norgestimate", "dienogest"], method: "chc" },
  { ids: ["etonogestrel"], method: "implant" },
  { ids: ["levonorgestrel-iud"], method: "lng-iud" },
  { ids: ["medroxyprogesterone"], method: "dmpa" },
  { ids: ["norethindrone", "norgestrel", "drospirenone", "desogestrel"], method: "pop" },
];

export function likelyMethodOnTray(ids: string[]): MethodId | null {
  const set = new Set(ids);
  for (const row of LIKELY_METHOD_ORDER) if (row.ids.some((id) => set.has(id))) return row.method;
  return null;
}

/* ── Inducers ─────────────────────────────────────────────────────────── */

export type InducerBasis = "us-mec" | "label" | "fsrh" | "catalog";

export const INDUCER_BASIS_LABEL: Record<InducerBasis, string> = {
  "us-mec": "US MEC row",
  label: "FDA label",
  fsrh: "FSRH caution",
  catalog: "Catalog signal",
};

interface InducerEntry {
  basis: Exclude<InducerBasis, "catalog">;
  mecRow: MecRowId | null;
  source: string;
  note: string;
  doseDependent?: boolean;
  /** Methods the label names that FSRH does not expect to fail. */
  labelAlsoNames?: MethodId[];
}

const mec = (mecRow: MecRowId, note: string, extra: Partial<InducerEntry> = {}): InducerEntry => ({
  basis: "us-mec",
  mecRow,
  source: "US MEC 2024",
  note,
  ...extra,
});

const label = (source: string, note: string, extra: Partial<InducerEntry> = {}): InducerEntry => ({
  basis: "label",
  mecRow: null,
  source,
  note,
  ...extra,
});

/** Keyed by parent id. Formulations resolve through PARENT. */
const INDUCERS: Record<string, InducerEntry> = {
  carbamazepine: mec("anticonvulsants", "Strong inducer. It also lowers lamotrigine and ulipristal."),
  oxcarbazepine: mec("anticonvulsants", "Weaker than carbamazepine on the CYP map. US MEC still groups it with the classic inducers."),
  phenytoin: mec("anticonvulsants", "Strong inducer. Fosphenytoin is its prodrug and counts the same."),
  phenobarbital: mec("anticonvulsants", "A barbiturate. A long half-life plus enzyme turnover keeps induction going for weeks after the stop."),
  primidone: mec("anticonvulsants", "Converted to phenobarbital, so it induces the same way."),
  topiramate: mec(
    "anticonvulsants",
    "Dose matters on the label: no significant change in ethinyl estradiol at 50–200 mg/day, lower exposure at 200–800 mg/day. FSRH treats it as a potential inducer at any dose because it is a teratogen.",
    { doseDependent: true },
  ),
  rifampin: mec("rifamycins", "The prototype strong inducer."),
  rifabutin: mec("rifamycins", "Weaker than rifampin on the CYP map, but US MEC rates it the same."),
  "st-johns-wort": mec("st-johns-wort", "An herb. Ask about it by name; people often leave it off the list."),
  efavirenz: mec("efavirenz", "Might reduce effectiveness of hormonal methods (US MEC 2)."),
  ritonavir: mec(
    "boosted-pi",
    "Ritonavir blocks CYP3A4 yet lowers ethinyl estradiol by inducing other pathways. Progestin levels can go either way with the partner drug.",
  ),
  paxlovid: label("Paxlovid label", "A 5-day ritonavir-boosted course. The label: ethinyl estradiol falls; consider adding a non-hormonal method."),
  modafinil: label(
    "Provigil label",
    "Weak CYP3A4 inducer on the map, but the label warns that steroidal contraceptives may fail during use and for one month after stopping. It names depot and implanted methods too.",
    { labelAlsoNames: ["dmpa"] },
  ),
  armodafinil: label(
    "Nuvigil label",
    "Same warning as modafinil: steroidal contraceptives may fail during use and for one month after stopping.",
    { labelAlsoNames: ["dmpa"] },
  ),
  bosentan: label(
    "Tracleer label",
    "The label says hormonal methods, injection and implant included, may not be reliable alone with bosentan.",
    { labelAlsoNames: ["dmpa"] },
  ),
  eslicarbazepine: label("Aptiom label", "Lowers ethinyl estradiol and levonorgestrel. The label asks for an added or alternative non-hormonal method."),
  cenobamate: label("Xcopri label", "The label warns hormonal birth control may be less effective. It asks for an added or alternative non-hormonal method."),
  griseofulvin: {
    basis: "fsrh",
    mecRow: null,
    source: "FSRH 2022",
    note: "FSRH: probably not a true enzyme inducer, but case reports describe pill failures. It is a potential teratogen, so FSRH adds condoms to combined methods, progestin-only pills and the implant.",
  },
};

/** Catalog marks CYP3A4 induction, but US MEC 2024 rates every method 1 on outcome data. */
const MEC_NEUTRAL: Record<string, string> = {
  nevirapine:
    "The catalog marks moderate CYP3A4 induction, yet US MEC 2024 rates every method 1: five studies found no difference in pregnancy rates on combined pills.",
  etravirine:
    "The catalog marks moderate CYP3A4 induction, yet US MEC 2024 rates every method 1: no clinically relevant PK or ovulation change on combined pills.",
};

/** Ids the station names as contraception-relevant inducers (parents plus formulations). */
export const CONTRACEPTION_INDUCER_IDS: string[] = uniq([
  ...Object.keys(INDUCERS),
  ...Object.keys(PARENT).filter((id) => PARENT[id] in INDUCERS),
]).filter(inCatalog);

export const MEC_NEUTRAL_IDS: string[] = Object.keys(MEC_NEUTRAL).filter(inCatalog);

const ANTIBIOTIC_CLS =
  /antibiotic|aminoglycoside|antimycobacterial|beta-lactam|carbapenem|cephalosporin|fluoroquinolone|glycopeptide|lincosamide|macrolide|monobactam|nitrofuran|nitroimidazole|oxazolidinone|penicillin|polymyxin|rifamycin|sulfonamide|tetracycline/i;

export const isAntibiotic = (id: string) => Boolean(DRUG_BY_ID[id] && ANTIBIOTIC_CLS.test(DRUG_BY_ID[id].cls));

export interface InducerHit {
  id: string;
  name: string;
  basis: InducerBasis;
  source: string;
  mecRow: MecRowId | null;
  /** Catalog CYP3A4 inducer strength (self, else parent formulation). */
  catalogStrength: Strength | null;
  note: string;
  doseDependent: boolean;
  labelAlsoNames: MethodId[];
}

const CATALOG_SIGNAL_NOTE = (strength: Strength, antibiotic: boolean) =>
  `The catalog marks a ${strength} CYP3A4 inducer. Contraceptive steroids are CYP3A4 substrates. No US MEC row or label line is stored here, so read its label.` +
  (antibiotic ? " FSRH exempts antibiotics from backup only when they do not induce enzymes." : "");

/** Classify one tray id. Hormones, neutral NNRTIs and non-inducers return null. */
export function inducerHit(id: string): InducerHit | null {
  if (!inCatalog(id) || HORMONE_SET.has(id) || HT_SET.has(id)) return null;
  const parent = parentOf(id);
  if (parent in MEC_NEUTRAL) return null;
  const catalogStrength = cyp3a4InducerStrength(id);
  const entry = INDUCERS[id] ?? INDUCERS[parent];
  if (entry) {
    return {
      id,
      name: nameOf(id),
      basis: entry.basis,
      source: entry.source,
      mecRow: entry.mecRow,
      catalogStrength,
      note: entry.note,
      doseDependent: Boolean(entry.doseDependent),
      labelAlsoNames: entry.labelAlsoNames ?? [],
    };
  }
  const antibiotic = isAntibiotic(id);
  if (catalogStrength && (catalogStrength !== "weak" || antibiotic)) {
    return {
      id,
      name: nameOf(id),
      basis: "catalog",
      source: "Catalog CYP3A4 role",
      mecRow: null,
      catalogStrength,
      note: CATALOG_SIGNAL_NOTE(catalogStrength, antibiotic),
      doseDependent: false,
      labelAlsoNames: [],
    };
  }
  return null;
}

export function inducersOnTray(ids: string[]): InducerHit[] {
  return uniq(ids)
    .map(inducerHit)
    .filter((h): h is InducerHit => h !== null);
}

/** Curated hits and strong catalog signals light the station. Moderate catalog-only signals show inside it. */
const lightsStation = (h: InducerHit) => h.basis !== "catalog" || h.catalogStrength === "strong";

/* ── Lamotrigine, valproate ───────────────────────────────────────────── */

const LAMOTRIGINE = new Set(["lamotrigine", "lamotrigine-xr", "lamotrigine-odt"]);
const VALPROATE = new Set(["valproate", "divalproex", "valproate-sprinkle", "valproate-iv"]);
/** Lamictal label: these lower lamotrigine too. */
const LAMOTRIGINE_LOWERING_PARENTS = new Set(["carbamazepine", "phenytoin", "phenobarbital", "primidone", "rifampin"]);

export const LAMOTRIGINE_IDS: string[] = [...LAMOTRIGINE].filter(inCatalog);
export const VALPROATE_IDS: string[] = [...VALPROATE].filter(inCatalog);

export const LAMOTRIGINE_ESTROGEN_LINES = {
  estrogenLowers:
    "Estrogen lowers lamotrigine. Estrogen-containing pills cut lamotrigine by about half (Lamictal label). Ethinyl estradiol drives it by inducing glucuronidation; the progestin does not.",
  pillFreeWeek:
    "The pill-free week lets lamotrigine climb, as much as doubling by the end of the week (label). FSRH suggests a continuous regimen to avoid the swing.",
  startStop:
    "Starting or stopping an estrogen moves lamotrigine. FSRH asks that the neurologist or psychiatrist be involved either way. Rising levels show as dizziness, ataxia or double vision.",
  otherDirection:
    "The other direction: lamotrigine lowered levonorgestrel exposure by 19% in the label study, with no ovulation seen. FSRH adds condoms to combined methods, progestin-only pills and the implant to be safe.",
  progestinOnly:
    "Progestin-only pills had no effect on lamotrigine levels in the label study. FSRH notes desogestrel might raise it in some people.",
  valproate:
    "Valproate blocks glucuronidation and more than doubles lamotrigine (label). FSRH notes it may blunt the estrogen effect.",
};

export interface LamotrigineTeaching {
  lamotrigineIds: string[];
  estrogenIds: string[];
  /** Lamotrigine and an estrogen are both on the tray. */
  active: boolean;
  lines: string[];
  mec: string;
}

export function lamotrigineTeaching(ids: string[]): LamotrigineTeaching | null {
  const set = uniq(ids);
  const lamotrigineIds = set.filter((id) => LAMOTRIGINE.has(id));
  if (lamotrigineIds.length === 0) return null;
  const estrogenIds = set.filter((id) => HORMONE_ROLES[id]?.estrogen);
  const valproateIds = set.filter((id) => VALPROATE.has(id));
  const lowering = set.filter((id) => LAMOTRIGINE_LOWERING_PARENTS.has(parentOf(id)));
  const L = LAMOTRIGINE_ESTROGEN_LINES;
  const lines = [L.estrogenLowers, L.pillFreeWeek, L.startStop, L.otherDirection, L.progestinOnly];
  if (valproateIds.length > 0) lines.push(L.valproate);
  if (lowering.length > 0) lines.push(`${names(lowering)} also ${lowering.length === 1 ? "lowers" : "lower"} lamotrigine (label). The estrogen effect stacks on top.`);
  const row = US_MEC_2024_ROWS.lamotrigine;
  const mecLine = `US MEC 2024: lamotrigine is ${row.categories.chc} with combined methods and ${row.categories.pop} with progestin-only methods and IUDs. ${row.note}`;
  return { lamotrigineIds, estrogenIds, active: estrogenIds.length > 0, lines, mec: mecLine };
}

export interface ValproateTeaching {
  valproateIds: string[];
  lines: string[];
}

export function valproateTeaching(ids: string[]): ValproateTeaching | null {
  const valproateIds = uniq(ids).filter((id) => VALPROATE.has(id));
  if (valproateIds.length === 0) return null;
  return {
    valproateIds,
    lines: [
      "Valproate is not an enzyme inducer and is not in the US MEC anticonvulsant row. It does not lower contraceptive hormones.",
      "The reverse runs: estrogen-containing contraceptives may speed valproate clearance and lower its level, with a risk of more seizures (Depakote label).",
      "It is a major teratogen. The question is how reliable the method is, not whether valproate weakens it.",
    ],
  };
}

/* ── Sugammadex (wording lives on the anesthesia desk) ────────────────── */

export const SUGAMMADEX_BACKUP_DAYS = 7;

/** The anesthesia desk's own warning, linked rather than restated. */
export const SUGAMMADEX_ANESTHESIA_WARNING: string | null =
  REVERSAL_PROFILES.sugammadex.keyWarnings.find((w) => /contracept/i.test(w)) ?? null;

export const SUGAMMADEX_NOTE = `Sugammadex binds progestin, and estrogen less so. The Bridion label counts a dose as missed pills and asks for a non-hormonal backup for the next ${SUGAMMADEX_BACKUP_DAYS} days, oral or non-oral method. FSRH 2022: pill users follow the rules for one missed pill; other hormonal methods add condoms for ${SUGAMMADEX_BACKUP_DAYS} days. The effect is short-lived, and FSRH expects low risk with an LNG-IUD or DMPA. Full detail is on the anesthesia desk.`;

export interface SugammadexTeaching {
  onTray: boolean;
  hormoneIds: string[];
  backupDays: number;
  note: string;
  anesthesiaWarning: string | null;
}

/* ── Emergency contraception ──────────────────────────────────────────── */

export const EC_LINES = {
  copper: "Copper IUD: unaffected by inducers, and the most effective emergency contraception (FSRH 2022).",
  lng: "Levonorgestrel EC: inducers could lower its effect. If a copper IUD is declined or unsuitable, FSRH 2022 says a double dose can be offered within 96 hours, and that its effectiveness here is unknown.",
  upa: "Ulipristal (ella): the label says to avoid it with CYP3A4 inducers. FSRH 2022 allows a single standard dose with advice that effectiveness is unknown. Doubling it is not recommended.",
  upaProgestin:
    "Ulipristal and progestins pull against each other. FSRH: ulipristal may work less well if a progestin was taken in the prior 7 days. Hormonal contraception waits 5 days after ulipristal (ella label and FSRH).",
  noInducer:
    "No inducer on this tray. Ask about the last 28 days: a recently stopped inducer still counts for emergency contraception.",
};

export interface EmergencyTeaching {
  onTray: { lng: boolean; upa: boolean };
  withInducer: boolean;
  inducerIds: string[];
  lines: string[];
}

export function emergencyTeaching(ids: string[]): EmergencyTeaching {
  const set = uniq(ids);
  const lng = set.some((id) => HORMONE_ROLES[id]?.ec === "lng");
  const upa = set.some((id) => HORMONE_ROLES[id]?.ec === "upa");
  const inducerIds = inducersOnTray(set).map((h) => h.id);
  const withInducer = inducerIds.length > 0;
  const lines = [EC_LINES.copper];
  if (withInducer) lines.push(EC_LINES.lng, EC_LINES.upa);
  else lines.push(EC_LINES.noInducer);
  const progestin = set.some((id) => HORMONE_SET.has(id) && HORMONE_ROLES[id].ec !== "upa" && id !== "ethinyl-estradiol");
  if (upa && progestin) lines.push(EC_LINES.upaProgestin);
  return { onTray: { lng, upa }, withInducer, inducerIds, lines };
}

/* ── Antibiotics myth ─────────────────────────────────────────────────── */

export const ANTIBIOTIC_MYTH =
  "Non-rifamycin antibiotics do not lower contraceptive effect. US MEC 2024 rates broad-spectrum antibiotics 1 for every method. FSRH 2022: no extra precautions unless the antibiotic induces enzymes, or vomiting or severe diarrhea cuts pill absorption. Rifampin and rifabutin are the ones that count.";

export interface AntibioticTeaching {
  /** Tray antibiotics with no CYP3A4 inducer role in the catalog. */
  ids: string[];
  line: string;
}

export function antibioticTeaching(ids: string[]): AntibioticTeaching {
  const out = uniq(ids).filter((id) => isAntibiotic(id) && !inducerHit(id));
  return { ids: out, line: ANTIBIOTIC_MYTH };
}

/* ── Teratogen overlap ────────────────────────────────────────────────── */

export const TERATOGEN_INDUCER_RULE =
  "FSRH 2022: with a teratogen that is also an inducer, or with any inducer on board, use a copper IUD, an LNG-IUD, or DMPA plus condoms. Combined methods, progestin-only pills and the implant are not recommended. Short-term condoms alone are not enough during a teratogen.";

export const TERATOGEN_ONLY_RULE =
  "FSRH 2022: with a teratogen that is not an inducer, the implant, a copper IUD or an LNG-IUD is recommended. With a combined method, progestin-only pill or DMPA, add condoms.";

/** Label lines for inducer-teratogens the pregnancy modules do not carry yet. */
const LABEL_TERATOGEN: Record<string, { line: string; source: string }> = {
  topiramate: { line: "Fetal harm, including a higher risk of cleft lip and palate.", source: "Topamax label" },
  bosentan: { line: "Boxed warning for embryo-fetal toxicity.", source: "Tracleer label" },
  griseofulvin: { line: "A potential teratogen.", source: "FSRH 2022" },
};

const firstSentence = (s: string) => {
  const i = s.indexOf(". ");
  return i === -1 ? s : s.slice(0, i + 1);
};

/**
 * Structural (early-pregnancy) teratogen classes on the pregnancy desk. Late fetotoxins
 * (NSAID ductus, RAAS renal) are left out: the FSRH method rule is about conception.
 */
const STRUCTURAL_TERATOGEN_CLASSES = new Set([
  "crbn-sall4-ubiquitination",
  "rar-rxr-neural-crest-arrest",
  "dhfr-folate-synthesis-arrest",
  "hdac-inhibition-folate-blockade",
  "epoxide-folate-dysregulation",
  "vkorc1-osteocalcin-gla-depletion",
]);
const TERATOGEN_WORDS = /teratogen|neural-tube|neural tube|embryo/i;

/** Reuse the clinic card and the pregnancy desk before adding a label line. */
function teratogenLine(id: string): { line: string; source: string } | null {
  const parent = parentOf(id);
  const clinic = clinicFor(parent);
  const hyt = HIGH_YIELD_TERATOGENS[parent];
  if (parent === "phenytoin" && clinic?.pregNote) return { line: firstSentence(clinic.pregNote), source: "Clinic card" };
  if (clinic?.pregnancy === "avoid" && clinic.pregNote && TERATOGEN_WORDS.test(clinic.pregNote)) {
    return { line: clinic.pregNote, source: "Clinic card" };
  }
  if (hyt && STRUCTURAL_TERATOGEN_CLASSES.has(hyt.mechanismClass) && hyt.structuralManifestations[0]) {
    return { line: hyt.structuralManifestations[0], source: "Pregnancy desk" };
  }
  return LABEL_TERATOGEN[parent] ?? null;
}

export interface TeratogenRow {
  id: string;
  name: string;
  inducer: boolean;
  line: string;
  source: string;
}

export interface TeratogenOverlap {
  inducerTeratogens: TeratogenRow[];
  otherTeratogens: TeratogenRow[];
  rule: string | null;
}

export function teratogenOverlap(ids: string[]): TeratogenOverlap {
  const set = uniq(ids).filter((id) => inCatalog(id) && !HORMONE_SET.has(id) && !HT_SET.has(id));
  const inducerTeratogens: TeratogenRow[] = [];
  const otherTeratogens: TeratogenRow[] = [];
  for (const id of set) {
    const t = teratogenLine(id);
    if (!t) continue;
    const inducer = inducerHit(id) !== null;
    (inducer ? inducerTeratogens : otherTeratogens).push({ id, name: nameOf(id), inducer, line: t.line, source: t.source });
  }
  const anyInducer = inducersOnTray(set).length > 0;
  let rule: string | null = null;
  if (inducerTeratogens.length > 0 || (otherTeratogens.length > 0 && anyInducer)) rule = TERATOGEN_INDUCER_RULE;
  else if (otherTeratogens.length > 0) rule = TERATOGEN_ONLY_RULE;
  return { inducerTeratogens, otherTeratogens, rule };
}

/* ── Backup window ────────────────────────────────────────────────────── */

export const BACKUP_WINDOW_DAYS = 28;

/** The desk's induction clock, read from cyp-kinetics.ts. */
export const INDUCTION_CLOCK: string =
  MOLECULAR_MODES.find((m) => m.id === "nuclear-receptor-induction")?.clinicalAphorism ?? "";

export const BACKUP_WINDOW_NOTE = `The desk's induction clock: "${INDUCTION_CLOCK}" Contraception guidance pads the leaving side to ${BACKUP_WINDOW_DAYS} days after the last dose (FSRH 2022; the Nexplanon label agrees), because a failure here is a pregnancy. The modafinil label says one month.`;

export interface BackupWindow {
  valid: boolean;
  stillTaking: boolean;
  methodAffected: boolean;
  daysSinceStop: number | null;
  daysLeft: number;
  inWindow: boolean;
  message: string;
}

/**
 * Backup window after an inducer stops. Day 0 is the day of the last dose.
 * Days 0–27 are inside the 28-day window; day 28 and later are past it.
 */
export function backupWindow(input: { daysSinceStop: number; stillTaking?: boolean; method?: MethodId }): BackupWindow {
  const method = input.method ?? "chc";
  const methodAffected = METHODS[method].inducerEffect === "reduced";
  const base = { stillTaking: Boolean(input.stillTaking), methodAffected };
  if (!methodAffected) {
    return {
      ...base,
      valid: true,
      daysSinceStop: null,
      daysLeft: 0,
      inWindow: false,
      message: `${METHODS[method].label}: no backup window. FSRH 2022 does not expect induction to lower its effect.`,
    };
  }
  if (input.stillTaking) {
    return {
      ...base,
      valid: true,
      daysSinceStop: null,
      daysLeft: BACKUP_WINDOW_DAYS,
      inWindow: true,
      message: `The inducer is still on board, so the ${BACKUP_WINDOW_DAYS}-day window has not started. It starts on the day of the last dose.`,
    };
  }
  const d = input.daysSinceStop;
  if (!Number.isFinite(d) || d < 0) {
    return { ...base, valid: false, daysSinceStop: null, daysLeft: 0, inWindow: false, message: "Enter whole days since the last dose, 0 or more." };
  }
  const days = Math.floor(d);
  const daysLeft = Math.max(0, BACKUP_WINDOW_DAYS - days);
  const inWindow = daysLeft > 0;
  const message = inWindow
    ? `Day ${days} after the last dose. About ${daysLeft} ${plural(daysLeft, "day")} of the ${BACKUP_WINDOW_DAYS}-day window remain while induced enzymes clear.`
    : `Day ${days}. Past the ${BACKUP_WINDOW_DAYS}-day window for this inducer. A new inducer starts a new window.`;
  return { ...base, valid: true, daysSinceStop: days, daysLeft, inWindow, message };
}

/* ── Method verdict ───────────────────────────────────────────────────── */

export interface Underminer {
  id: string;
  name: string;
  kind: "inducer" | "possible";
  basis: InducerBasis | "lamotrigine";
  mecCategory: string | null;
  note: string;
}

export interface MecOnTray {
  id: string;
  name: string;
  row: MecRowId;
  category: string;
}

export interface MethodVerdict {
  method: MethodId;
  label: string;
  affected: boolean;
  underminers: Underminer[];
  mecOnTray: MecOnTray[];
  cautions: string[];
  why: string;
  summary: string;
}

function mecRowOf(id: string): MecRowId | null {
  const hit = inducerHit(id);
  if (hit?.mecRow) return hit.mecRow;
  const parent = parentOf(id);
  if (parent in MEC_NEUTRAL) return "nnrti-no-effect";
  if (LAMOTRIGINE.has(id)) return "lamotrigine";
  if (isAntibiotic(id) && !hit) return "antibiotics";
  return null;
}

export const EMPTY_NOTE =
  "Nothing on this tray lowers contraceptive hormones. That is not a green light: ask about herbs and supplements, drugs not on the list, and any inducer stopped in the last 28 days.";

export function methodVerdict(ids: string[], method: MethodId): MethodVerdict {
  const set = uniq(ids).filter(inCatalog);
  const m = METHODS[method];
  const hits = inducersOnTray(set);
  const underminers: Underminer[] = [];
  if (INDUCER_AFFECTS.includes(method)) {
    for (const h of hits) {
      underminers.push({
        id: h.id,
        name: h.name,
        kind: h.basis === "catalog" ? "possible" : "inducer",
        basis: h.basis,
        mecCategory: h.mecRow ? US_MEC_2024_ROWS[h.mecRow].categories[method] : null,
        note: h.note,
      });
    }
    for (const id of set.filter((x) => LAMOTRIGINE.has(x))) {
      underminers.push({
        id,
        name: nameOf(id),
        kind: "possible",
        basis: "lamotrigine",
        mecCategory: US_MEC_2024_ROWS.lamotrigine.categories[method],
        note: "Lamotrigine modestly lowers levonorgestrel. FSRH adds condoms to be safe; there are no outcome data.",
      });
    }
  }

  const mecOnTray: MecOnTray[] = [];
  for (const id of set) {
    const row = mecRowOf(id);
    if (row) mecOnTray.push({ id, name: nameOf(id), row, category: US_MEC_2024_ROWS[row].categories[method] });
  }

  const cautions: string[] = [];
  for (const h of hits) {
    if (h.labelAlsoNames.includes(method)) {
      cautions.push(`${h.name}: its label warns about injected methods too. FSRH does not expect DMPA to fail; the label is stricter.`);
    }
  }
  if (method !== "cu-iud" && set.includes("sugammadex")) {
    cautions.push(`Sugammadex is on the tray: the Bridion label asks for ${SUGAMMADEX_BACKUP_DAYS} days of non-hormonal backup after a dose.`);
  }
  if (method === "chc" && set.some((id) => LAMOTRIGINE.has(id))) {
    cautions.push("The estrogen lowers lamotrigine, and the pill-free week lets it climb. See the lamotrigine section.");
  }

  const inducerCount = underminers.filter((u) => u.kind === "inducer").length;
  const affected = inducerCount > 0;
  let summary: string;
  if (m.inducerEffect === "unaffected") {
    summary = hits.length > 0 ? `${m.label} holds with ${names(hits.map((h) => h.id))} on the tray. ${m.why}` : `${m.label}: ${m.why}`;
  } else if (affected) {
    const named = underminers.filter((u) => u.kind === "inducer").map((u) => u.name);
    summary = `${named.join(", ")} can lower the effect of the ${m.label.toLowerCase()}. FSRH 2022: not advised during the inducer and for ${BACKUP_WINDOW_DAYS} days after. Methods induction does not touch: DMPA, LNG-IUD, copper IUD.`;
  } else if (underminers.length > 0) {
    summary = `No named inducer, but ${underminers.map((u) => u.name).join(", ")} ${underminers.length === 1 ? "is a" : "are"} possible ${plural(underminers.length, "concern")}. Read the notes below.`;
  } else {
    summary = EMPTY_NOTE;
  }

  return { method, label: m.label, affected, underminers, mecOnTray, cautions, why: m.why, summary };
}

/* ── Desk detection and report ────────────────────────────────────────── */

export interface ContraceptionDeskDetection {
  /**
   * True when the tray holds any of:
   *  - a hormonal or emergency contraceptive (the method itself);
   *  - a drug that can lower contraceptive hormones: one named by a US MEC row,
   *    an FDA label or FSRH, or a strong CYP3A4 inducer in the catalog;
   *  - lamotrigine or valproate (estrogen moves their levels);
   *  - sugammadex (binds progestin).
   * The pill itself is rarely on a tray, so a drug that undermines contraception
   * is reason enough to open the station. Moderate catalog-only inducers,
   * teratogens alone and plain antibiotics show inside the station but do not
   * light it on their own.
   */
  hasContraceptionRelevant: boolean;
  hasHormonalContraceptive: boolean;
  hasEmergencyContraceptive: boolean;
  hasEstrogen: boolean;
  hasInducer: boolean;
  hasLamotrigine: boolean;
  hasValproate: boolean;
  hasSugammadex: boolean;
  hasInducerTeratogen: boolean;
  hasNonInducingAntibiotic: boolean;
  hormoneIds: string[];
  inducerIds: string[];
  lamotrigineIds: string[];
  valproateIds: string[];
  matchedIds: string[];
}

export function contraceptionOnDesk(ids: string[]): ContraceptionDeskDetection {
  const set = uniq(ids).filter(inCatalog);
  const hormoneIds = set.filter((id) => HORMONE_SET.has(id));
  const hits = inducersOnTray(set);
  const inducerIds = hits.map((h) => h.id);
  const lamotrigineIds = set.filter((id) => LAMOTRIGINE.has(id));
  const valproateIds = set.filter((id) => VALPROATE.has(id));
  const hasSugammadex = set.includes("sugammadex");
  const lighting = hits.filter(lightsStation).map((h) => h.id);
  const matchedIds = uniq([...hormoneIds, ...lighting, ...lamotrigineIds, ...valproateIds, ...(hasSugammadex ? ["sugammadex"] : [])]);
  const terat = teratogenOverlap(set);
  return {
    hasContraceptionRelevant: matchedIds.length > 0,
    hasHormonalContraceptive: hormoneIds.some((id) => HORMONE_ROLES[id].methods.length > 0),
    hasEmergencyContraceptive: hormoneIds.some((id) => HORMONE_ROLES[id].ec !== null),
    hasEstrogen: hormoneIds.some((id) => HORMONE_ROLES[id].estrogen),
    hasInducer: hits.length > 0,
    hasLamotrigine: lamotrigineIds.length > 0,
    hasValproate: valproateIds.length > 0,
    hasSugammadex,
    hasInducerTeratogen: terat.inducerTeratogens.length > 0,
    hasNonInducingAntibiotic: antibioticTeaching(set).ids.length > 0,
    hormoneIds,
    inducerIds,
    lamotrigineIds,
    valproateIds,
    matchedIds,
  };
}

export interface ContraceptionReport {
  detection: ContraceptionDeskDetection;
  likelyMethod: MethodId | null;
  trayMethods: MethodId[];
  hormones: { id: string; name: string; role: string }[];
  inducers: InducerHit[];
  mecNeutral: { id: string; name: string; note: string }[];
  methods: MethodVerdict[];
  lamotrigine: LamotrigineTeaching | null;
  valproate: ValproateTeaching | null;
  emergency: EmergencyTeaching;
  sugammadex: SugammadexTeaching | null;
  antibiotics: AntibioticTeaching;
  teratogens: TeratogenOverlap;
  backup: { days: number; note: string; inductionClock: string };
  notes: string[];
  citations: string[];
  disclaimer: string;
}

export function contraceptionReportOnDesk(ids: string[], host?: HostContext): ContraceptionReport {
  const set = uniq(ids).filter(inCatalog);
  const detection = contraceptionOnDesk(set);
  const inducers = inducersOnTray(set);
  const hormones = detection.hormoneIds.map((id) => ({ id, name: nameOf(id), role: HORMONE_ROLES[id].role }));
  const trayMethods = METHOD_IDS.filter((m) => detection.hormoneIds.some((id) => HORMONE_ROLES[id].methods.includes(m)));
  const mecNeutral = set.filter((id) => parentOf(id) in MEC_NEUTRAL).map((id) => ({ id, name: nameOf(id), note: MEC_NEUTRAL[parentOf(id)] }));

  const sugammadex: SugammadexTeaching | null = detection.hasSugammadex
    ? {
        onTray: true,
        hormoneIds: detection.hormoneIds,
        backupDays: SUGAMMADEX_BACKUP_DAYS,
        note: SUGAMMADEX_NOTE,
        anesthesiaWarning: SUGAMMADEX_ANESTHESIA_WARNING,
      }
    : null;

  const notes: string[] = [];
  const ee = DRUG_BY_ID["ethinyl-estradiol"];
  const eeIs3a4 = Boolean(ee?.enzymes.some((r) => r.enzyme === "CYP3A4" && r.kind === "substrate"));
  const strongModerate = inducers.filter((h) => h.catalogStrength === "strong" || h.catalogStrength === "moderate");
  if (detection.hasEstrogen && eeIs3a4 && strongModerate.length > 0) {
    notes.push(
      `Ethinyl estradiol is a CYP3A4 substrate on this map, and the catalog marks ${names(strongModerate.map((h) => h.id))} as ${strongModerate.length === 1 ? "a CYP3A4 inducer" : "CYP3A4 inducers"}.`,
    );
  }
  const ht = set.filter((id) => HT_SET.has(id));
  if (ht.length > 0) {
    notes.push(`${names(ht)}: menopausal hormone therapy, not contraception. Estrogen labels warn that CYP3A4 inducers can lower them too.`);
  }
  if (host?.preg === "pregnant") {
    notes.push("Pregnant flag set. Contraception is not the live question now; the teratogen rows are. See the pregnancy desk.");
  } else if (host?.preg === "lactating") {
    notes.push("Lactating flag set. US MEC restricts estrogen-containing methods in the first weeks postpartum while breastfeeding. Check its postpartum rows.");
  }
  if (!detection.hasContraceptionRelevant) notes.push(EMPTY_NOTE);

  return {
    detection,
    likelyMethod: likelyMethodOnTray(set),
    trayMethods,
    hormones,
    inducers,
    mecNeutral,
    methods: METHOD_IDS.map((m) => methodVerdict(set, m)),
    lamotrigine: lamotrigineTeaching(set),
    valproate: valproateTeaching(set),
    emergency: emergencyTeaching(set),
    sugammadex,
    antibiotics: antibioticTeaching(set),
    teratogens: teratogenOverlap(set),
    backup: { days: BACKUP_WINDOW_DAYS, note: BACKUP_WINDOW_NOTE, inductionClock: INDUCTION_CLOCK },
    notes,
    citations: CONTRACEPTION_CITATIONS,
    disclaimer: CONTRACEPTION_DISCLAIMER,
  };
}
