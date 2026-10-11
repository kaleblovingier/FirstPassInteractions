/**
 * Drug-induced liver injury (DILI) teaching engine.
 *
 * Four pieces a learner checks when the liver panel comes back wrong:
 *   1. Is this DILI-range at all? (Aithal 2011 case definition)
 *   2. What pattern? R ratio and the newer nR (ACG 2021).
 *   3. Is it a Hy's law case? (Temple 2006; FDA 2009 guidance)
 *   4. How strong is the drug link? RUCAM, updated (Danan & Teschke 2016).
 *
 * Per-drug likelihood comes from LiverTox (./livertox) — this file reads it,
 * it does not copy it.
 *
 * Teaching arithmetic only. Not a diagnosis and not an order.
 */

import { DRUG_BY_ID } from "./catalog";
import { LIVERTOX, livertoxOnDesk, type LiverCard, type LiverCat } from "./livertox";
import type { HostContext } from "./types";

export const DILI_DISCLAIMER =
  "Teaching arithmetic, not a diagnosis or an order. DILI is a diagnosis of exclusion; RUCAM and Hy's law frame the question, and the clinical team and the product label govern.";

export const DILI_CITATIONS: string[] = [
  "Chalasani NP, Maddur H, Russo MW, Wong RJ, Reddy KR. ACG Clinical Guideline: Diagnosis and Management of Idiosyncratic Drug-Induced Liver Injury. Am J Gastroenterol 2021;116(5):878–898.",
  "Danan G, Teschke R. RUCAM in drug and herb induced liver injury: the update. Int J Mol Sci 2016;17(1):14.",
  "Temple R. Hy's law: predicting serious hepatotoxicity. Pharmacoepidemiol Drug Saf 2006;15(4):241–243.",
  "U.S. FDA. Guidance for Industry: Drug-Induced Liver Injury: Premarketing Clinical Evaluation. July 2009.",
  "Björnsson ES, Hoofnagle JH. Categorization of drugs implicated in causing liver injury: critical assessment based on published case reports (LiverTox categories). Hepatology 2016;63(2):590–603.",
  "Aithal GP, Watkins PB, Andrade RJ, et al. Case definition and phenotype standardization in drug-induced liver injury. Clin Pharmacol Ther 2011;89(6):806–815.",
];

/* ── Pattern: R and nR ────────────────────────────────────────────────── */

export type DiliPattern = "hepatocellular" | "mixed" | "cholestatic";

export interface RResult {
  r: number;
  pattern: DiliPattern;
}

const xUln = (v: number, uln: number) => (Number.isFinite(v) && Number.isFinite(uln) && uln > 0 ? v / uln : Number.NaN);

/** R ≥ 5 hepatocellular, R ≤ 2 cholestatic, between is mixed. */
export function patternFromR(r: number): DiliPattern {
  if (Number.isNaN(r)) return "mixed";
  if (r >= 5) return "hepatocellular";
  if (r <= 2) return "cholestatic";
  return "mixed";
}

/** R = (ALT / ULN) ÷ (ALP / ULN). */
export function rRatio(i: { alt: number; altUln: number; alp: number; alpUln: number }): RResult {
  const a = xUln(i.alt, i.altUln);
  const p = xUln(i.alp, i.alpUln);
  const r = Number.isFinite(a) && Number.isFinite(p) ? (p > 0 ? a / p : Number.POSITIVE_INFINITY) : Number.NaN;
  return { r, pattern: patternFromR(r) };
}

/** nR (ACG 2021): uses whichever of ALT or AST is higher, each in ×ULN. */
export function newRRatio(i: {
  alt: number;
  altUln: number;
  ast: number;
  astUln: number;
  alp: number;
  alpUln: number;
}): RResult {
  const a = xUln(i.alt, i.altUln);
  const s = xUln(i.ast, i.astUln);
  const top = Number.isFinite(a) && Number.isFinite(s) ? Math.max(a, s) : Number.isFinite(a) ? a : s;
  const p = xUln(i.alp, i.alpUln);
  const r = Number.isFinite(top) && Number.isFinite(p) ? (p > 0 ? top / p : Number.POSITIVE_INFINITY) : Number.NaN;
  return { r, pattern: patternFromR(r) };
}

/* ── Case definition (Aithal 2011) ────────────────────────────────────── */

export interface DiliThresholdResult {
  met: boolean;
  criteria: { altFive: boolean; alpTwo: boolean; altThreeBiliTwo: boolean };
  why: string[];
}

/**
 * Any one of: ALT ≥ 5×ULN; ALP ≥ 2×ULN without a bone cause;
 * ALT ≥ 3×ULN with total bilirubin > 2×ULN.
 */
export function meetsDiliThreshold(i: {
  alt: number;
  altUln: number;
  alp: number;
  alpUln: number;
  tbili: number;
  tbiliUln: number;
  boneCause?: boolean;
}): DiliThresholdResult {
  const a = xUln(i.alt, i.altUln);
  const p = xUln(i.alp, i.alpUln);
  const b = xUln(i.tbili, i.tbiliUln);
  const altFive = a >= 5;
  const alpTwo = p >= 2 && !i.boneCause;
  const altThreeBiliTwo = a >= 3 && b > 2;
  const why: string[] = [];
  if (altFive) why.push("ALT at or above 5× ULN.");
  if (alpTwo) why.push("ALP at or above 2× ULN, no bone cause.");
  if (p >= 2 && i.boneCause) why.push("ALP is high, but a bone source does not count toward DILI.");
  if (altThreeBiliTwo) why.push("ALT at or above 3× ULN with bilirubin above 2× ULN.");
  return { met: altFive || alpTwo || altThreeBiliTwo, criteria: { altFive, alpTwo, altThreeBiliTwo }, why };
}

/* ── Hy's law ─────────────────────────────────────────────────────────── */

export interface HysLawResult {
  met: boolean;
  components: {
    /** ALT or AST > 3×ULN. */
    aminotransferase: boolean;
    /** Total bilirubin > 2×ULN. */
    bilirubin: boolean;
    /** ALP < 2×ULN (no initial cholestasis). */
    noCholestasis: boolean;
  };
  teaching: string;
  otherCauseNote: string;
}

export const HYS_LAW_TEACHING =
  "Hepatocellular injury plus jaundice. Roughly 10% or more of such cases end in death or transplant (Zimmerman's older series cited 10–50%).";

export function hysLaw(i: {
  alt: number;
  ast: number;
  altUln: number;
  astUln: number;
  tbili: number;
  tbiliUln: number;
  alp: number;
  alpUln: number;
}): HysLawResult {
  const a = xUln(i.alt, i.altUln);
  const s = xUln(i.ast, i.astUln);
  const b = xUln(i.tbili, i.tbiliUln);
  const p = xUln(i.alp, i.alpUln);
  const components = {
    aminotransferase: a > 3 || s > 3,
    bilirubin: b > 2,
    noCholestasis: Number.isFinite(p) && p < 2,
  };
  return {
    met: components.aminotransferase && components.bilirubin && components.noCholestasis,
    components,
    teaching: HYS_LAW_TEACHING,
    otherCauseNote:
      "The labs alone are not enough. Viral hepatitis, biliary obstruction, ischemia and another drug must also be ruled out.",
  };
}

/* ── RUCAM (updated) ──────────────────────────────────────────────────── */

/*
 * Source: Danan G, Teschke R. Int J Mol Sci 2016;17(1):14 — the updated RUCAM
 * tables for hepatocellular injury and for cholestatic or mixed injury.
 * Point values below were transcribed for teaching. Implementers should
 * double-check every option and point against the published Table before
 * relying on it. "Mixed" is scored on the cholestatic table, as in the source.
 *
 * Timing that is incompatible (reaction before the drug started, or more than
 * 15 days after stopping for hepatocellular / 30 days for cholestatic, outside
 * slowly metabolized drugs) makes the case "unrelated" — RUCAM is not scored.
 */

export type RucamPattern = "hepatocellular" | "cholestatic";

export type OnsetAnswer = "5to90" | "under5orOver90" | "afterStop" | "incompatible";
export type CourseHcAnswer = "drop50in8" | "drop50in30" | "noInfo" | "drop50after30" | "lessThan50after30";
export type CourseChAnswer = "drop50in180" | "dropUnder50in180" | "noInfo";
export type CourseAnswer = CourseHcAnswer | CourseChAnswer;
export type AlcoholAnswer = "yes" | "no";
export type AgeAnswer = "55plus" | "under55";
export type ConcomitantAnswer = "none" | "incompatible" | "compatible" | "knownHepatotoxin" | "evidence";
export type AlternativesAnswer = "allRuledOut" | "groupIRuledOut" | "fiveOrSix" | "underFive" | "highlyProbable";
export type PreviousAnswer = "labelled" | "published" | "unknown";
export type ReexposureAnswer = "doublingAlone" | "doublingWithOthers" | "riseNotDoubled" | "other";

export interface RucamAnswers {
  onset: OnsetAnswer;
  course: CourseAnswer;
  alcohol: AlcoholAnswer;
  age: AgeAnswer;
  concomitant: ConcomitantAnswer;
  alternatives: AlternativesAnswer;
  previous: PreviousAnswer;
  reexposure: ReexposureAnswer;
}

export type RucamKey = keyof RucamAnswers;

export interface RucamOption {
  value: string;
  label: string;
  points: number;
}

export interface RucamDomain {
  key: RucamKey;
  /** Domain number 1–7 in the published table. Risk factors (3) has two questions. */
  domain: number;
  label: string;
  options: Record<RucamPattern, RucamOption[]>;
}

const same = (opts: RucamOption[]): Record<RucamPattern, RucamOption[]> => ({ hepatocellular: opts, cholestatic: opts });

export const RUCAM_DOMAINS: RucamDomain[] = [
  {
    key: "onset",
    domain: 1,
    label: "Time to onset",
    options: {
      hepatocellular: [
        { value: "5to90", label: "5–90 days after starting", points: 2 },
        { value: "under5orOver90", label: "Under 5 or over 90 days after starting", points: 1 },
        { value: "afterStop", label: "Within 15 days of stopping", points: 1 },
        { value: "incompatible", label: "Incompatible (before start, or over 15 days after stopping)", points: 0 },
      ],
      cholestatic: [
        { value: "5to90", label: "5–90 days after starting", points: 2 },
        { value: "under5orOver90", label: "Under 5 or over 90 days after starting", points: 1 },
        { value: "afterStop", label: "Within 30 days of stopping (longer for slowly cleared drugs)", points: 1 },
        { value: "incompatible", label: "Incompatible (before start, or over 30 days after stopping)", points: 0 },
      ],
    },
  },
  {
    key: "course",
    domain: 2,
    label: "Course after stopping",
    options: {
      hepatocellular: [
        { value: "drop50in8", label: "ALT falls 50% or more within 8 days", points: 3 },
        { value: "drop50in30", label: "ALT falls 50% or more within 30 days", points: 2 },
        { value: "noInfo", label: "No information, or drug continued", points: 0 },
        { value: "drop50after30", label: "ALT falls 50% or more after day 30", points: 0 },
        { value: "lessThan50after30", label: "ALT falls under 50% after day 30, or rises again", points: -2 },
      ],
      cholestatic: [
        { value: "drop50in180", label: "ALP falls 50% or more within 180 days", points: 2 },
        { value: "dropUnder50in180", label: "ALP falls under 50% within 180 days", points: 1 },
        { value: "noInfo", label: "No information, persists, rises, or drug continued", points: 0 },
      ],
    },
  },
  {
    key: "alcohol",
    domain: 3,
    label: "Risk factor: alcohol (or pregnancy, cholestatic)",
    options: {
      hepatocellular: [
        { value: "yes", label: "Alcohol over 2 drinks/day (women) or 3 (men)", points: 1 },
        { value: "no", label: "No", points: 0 },
      ],
      cholestatic: [
        { value: "yes", label: "Alcohol use or pregnancy", points: 1 },
        { value: "no", label: "No", points: 0 },
      ],
    },
  },
  {
    key: "age",
    domain: 3,
    label: "Risk factor: age",
    options: same([
      { value: "55plus", label: "55 years or older", points: 1 },
      { value: "under55", label: "Under 55", points: 0 },
    ]),
  },
  {
    key: "concomitant",
    domain: 4,
    label: "Other drugs or herbs",
    options: same([
      { value: "none", label: "None, or no information", points: 0 },
      { value: "incompatible", label: "Present, timing incompatible", points: 0 },
      { value: "compatible", label: "Present, timing compatible or suggestive", points: -1 },
      { value: "knownHepatotoxin", label: "Known hepatotoxin, timing compatible or suggestive", points: -2 },
      { value: "evidence", label: "Evidence it caused this case (rechallenge or validated test)", points: -3 },
    ]),
  },
  {
    key: "alternatives",
    domain: 5,
    label: "Search for other causes",
    options: same([
      { value: "allRuledOut", label: "Groups I and II all ruled out", points: 2 },
      { value: "groupIRuledOut", label: "All 7 group I causes ruled out", points: 1 },
      { value: "fiveOrSix", label: "5 or 6 group I causes ruled out", points: 0 },
      { value: "underFive", label: "Fewer than 5 group I causes ruled out", points: -2 },
      { value: "highlyProbable", label: "Another cause is highly probable", points: -3 },
    ]),
  },
  {
    key: "previous",
    domain: 6,
    label: "Known hepatotoxicity of the drug",
    options: same([
      { value: "labelled", label: "In the product label", points: 2 },
      { value: "published", label: "Published, not in the label", points: 1 },
      { value: "unknown", label: "Unknown", points: 0 },
    ]),
  },
  {
    key: "reexposure",
    domain: 7,
    label: "Unintentional re-exposure",
    options: {
      hepatocellular: [
        { value: "doublingAlone", label: "ALT doubles with this drug alone (ALT under 5×ULN before re-exposure)", points: 3 },
        { value: "doublingWithOthers", label: "ALT doubles with the drugs given the first time", points: 1 },
        { value: "riseNotDoubled", label: "ALT rises but stays under ULN, same conditions", points: -2 },
        { value: "other", label: "Other, or not re-exposed", points: 0 },
      ],
      cholestatic: [
        { value: "doublingAlone", label: "ALP doubles with this drug alone (ALP under 2×ULN before re-exposure)", points: 3 },
        { value: "doublingWithOthers", label: "ALP doubles with the drugs given the first time", points: 1 },
        { value: "riseNotDoubled", label: "ALP rises but stays under ULN, same conditions", points: -2 },
        { value: "other", label: "Other, or not re-exposed", points: 0 },
      ],
    },
  },
];

export const RUCAM_GROUP_I = [
  "Hepatitis A (anti-HAV IgM)",
  "Hepatitis B (HBsAg, anti-HBc IgM, HBV DNA)",
  "Hepatitis C (anti-HCV, HCV RNA)",
  "Hepatitis E (anti-HEV IgM/IgG, HEV RNA)",
  "Hepatobiliary imaging (ultrasound, Doppler; biliary obstruction)",
  "Alcoholism (AST/ALT ≥ 2)",
  "Recent acute hypotension (especially with heart disease)",
];

export const RUCAM_GROUP_II = [
  "Complications of underlying disease (sepsis, metastatic cancer, autoimmune hepatitis, chronic HBV/HCV, PBC/PSC, genetic liver disease)",
  "CMV, EBV or HSV infection",
];

export const RUCAM_DEFAULTS: RucamAnswers = {
  onset: "5to90",
  course: "noInfo",
  alcohol: "no",
  age: "under55",
  concomitant: "none",
  alternatives: "fiveOrSix",
  previous: "unknown",
  reexposure: "other",
};

export type RucamBand = "excluded" | "unlikely" | "possible" | "probable" | "highly probable";

export function rucamBand(total: number): RucamBand {
  if (total <= 0) return "excluded";
  if (total <= 2) return "unlikely";
  if (total <= 5) return "possible";
  if (total <= 8) return "probable";
  return "highly probable";
}

export function rucamTable(pattern: DiliPattern | RucamPattern): RucamPattern {
  return pattern === "hepatocellular" ? "hepatocellular" : "cholestatic";
}

export interface RucamResult {
  table: RucamPattern;
  total: number;
  band: RucamBand;
  perDomain: Array<{ key: RucamKey; domain: number; label: string; answer: string; points: number }>;
  /** Timing incompatible → RUCAM calls the case unrelated regardless of the sum. */
  timingExcludes: boolean;
}

export function rucamOptions(key: RucamKey, pattern: DiliPattern | RucamPattern): RucamOption[] {
  const d = RUCAM_DOMAINS.find((x) => x.key === key);
  return d ? d.options[rucamTable(pattern)] : [];
}

export function rucam(pattern: DiliPattern | RucamPattern, answers: RucamAnswers): RucamResult {
  const table = rucamTable(pattern);
  const perDomain = RUCAM_DOMAINS.map((d) => {
    const answer = answers[d.key];
    const opt = d.options[table].find((o) => o.value === answer);
    return { key: d.key, domain: d.domain, label: d.label, answer: opt?.label ?? "Not answered", points: opt?.points ?? 0 };
  });
  const total = perDomain.reduce((s, x) => s + x.points, 0);
  const timingExcludes = answers.onset === "incompatible";
  return { table, total, band: timingExcludes ? "excluded" : rucamBand(total), perDomain, timingExcludes };
}

/* ── Desk detection ───────────────────────────────────────────────────── */

/**
 * Catalog products that share a LiverTox chapter with a LIVERTOX key
 * (same molecule, different salt or combination). Not new categories.
 */
const LIVERTOX_ALIAS: Record<string, string> = {
  divalproex: "valproate",
  "valproate-iv": "valproate",
  "valproate-sprinkle": "valproate",
  "simvastatin-ezetimibe": "simvastatin",
  "atorvastatin-amlodipine": "atorvastatin",
};

/**
 * Catalog drugs with a LiverTox chapter that ./livertox does not yet carry.
 * Teaching paraphrase; open the chapter for the official category.
 */
const LIVERTOX_SUPPLEMENT: Record<string, LiverCard> = {
  "amox-clav": {
    cat: "A",
    label: "Well-known cause",
    pearl: "The most common cause of idiosyncratic DILI in Western series. Cholestatic or mixed, often weeks after the course ends.",
  },
  nitrofurantoin: {
    cat: "A",
    label: "Well-known cause",
    pearl: "Acute hepatitis on short courses; autoimmune-like chronic hepatitis on long prophylaxis.",
  },
};

const CAT_ORDER: LiverCat[] = ["A", "B", "C", "D", "E"];

export interface DiliTrayCard {
  id: string;
  /** LIVERTOX key whose chapter this product uses (id itself unless aliased). */
  livertoxKey: string;
  card: LiverCard;
}

/** LiverTox cards for every tray drug, via livertoxOnDesk plus same-molecule aliases. */
export function diliCardsOnDesk(ids: string[]): DiliTrayCard[] {
  const out: DiliTrayCard[] = livertoxOnDesk(ids).map(({ id, card }) => ({ id, livertoxKey: id, card }));
  const seen = new Set(out.map((x) => x.id));
  for (const id of ids) {
    if (seen.has(id)) continue;
    const alias = LIVERTOX_ALIAS[id];
    const card = alias ? LIVERTOX[alias] : LIVERTOX_SUPPLEMENT[id];
    if (!card) continue;
    seen.add(id);
    out.push({ id, livertoxKey: alias ?? id, card });
  }
  return out;
}

export interface DiliDeskDetection {
  hasHepatotoxic: boolean;
  matchedIds: string[];
  topCategory: LiverCat | null;
}

export function diliOnDesk(ids: string[]): DiliDeskDetection {
  const cards = diliCardsOnDesk(ids);
  let top: LiverCat | null = null;
  for (const { card } of cards) {
    if (top === null || CAT_ORDER.indexOf(card.cat) < CAT_ORDER.indexOf(top)) top = card.cat;
  }
  return {
    hasHepatotoxic: cards.some((c) => c.card.cat !== "E"),
    matchedIds: cards.map((c) => c.id),
    topCategory: top,
  };
}

/* ── Teaching notes ───────────────────────────────────────────────────── */

const STATIN_IDS = new Set(
  [
    "atorvastatin",
    "simvastatin",
    "lovastatin",
    "rosuvastatin",
    "pravastatin",
    "fluvastatin",
    "pitavastatin",
    "simvastatin-ezetimibe",
    "atorvastatin-amlodipine",
    "rosuvastatin-ezetimibe",
  ].filter((id) => DRUG_BY_ID[id]),
);

const VALPROATE_IDS = new Set(["valproate", "divalproex", "valproate-iv", "valproate-sprinkle"].filter((id) => DRUG_BY_ID[id]));

/** Classic tray agents and their DILI teaching point. Every key is a catalog id. */
export const DILI_DRUG_NOTES: Record<string, string> = {
  acetaminophen:
    "Acetaminophen is intrinsic and dose-dependent, not idiosyncratic. NAPQI outruns glutathione. N-acetylcysteine is the antidote; see the acetaminophen tab for the nomogram.",
  "amox-clav":
    "Amoxicillin-clavulanate is the most common cause of idiosyncratic DILI in Western series. Usually cholestatic or mixed, and onset can come weeks after the course has ended.",
  isoniazid:
    "Isoniazid gives hepatocellular injury. Risk climbs with age and with alcohol. Symptoms mean stop and check, not wait.",
  valproate:
    "Valproate injury is mitochondrial. POLG variants carry a boxed warning, and young children on several antiseizure drugs carry the most risk.",
  methotrexate:
    "Methotrexate causes slow fibrosis on long-term weekly doses. Alcohol, obesity and diabetes add to it; transaminases can understate the damage.",
  amiodarone:
    "Amiodarone gives steatohepatitis with phospholipidosis. IV loading can cause an acute hepatitis. The long half-life means the drug lingers after stopping.",
  nitrofurantoin:
    "Nitrofurantoin on long prophylaxis can give an autoimmune-like hepatitis, with ANA and smooth-muscle antibodies. It can look like autoimmune hepatitis.",
  statin:
    "Statins: a mild transaminase rise is common and often settles. Serious statin DILI is rare. Routine LFT monitoring is no longer in the label.",
};

export interface DiliReport {
  detection: DiliDeskDetection;
  notes: string[];
  citations: string[];
  disclaimer: string;
}

export function diliReportOnDesk(ids: string[], host?: HostContext): DiliReport {
  const detection = diliOnDesk(ids);
  const notes: string[] = [];
  const has = (id: string) => ids.includes(id) && Boolean(DRUG_BY_ID[id]);

  if (has("acetaminophen")) notes.push(DILI_DRUG_NOTES.acetaminophen);
  if (has("amox-clav")) notes.push(DILI_DRUG_NOTES["amox-clav"]);
  if (has("isoniazid")) notes.push(DILI_DRUG_NOTES.isoniazid);
  if (ids.some((id) => VALPROATE_IDS.has(id))) notes.push(DILI_DRUG_NOTES.valproate);
  if (has("methotrexate")) notes.push(DILI_DRUG_NOTES.methotrexate);
  if (has("amiodarone")) notes.push(DILI_DRUG_NOTES.amiodarone);
  if (has("nitrofurantoin")) notes.push(DILI_DRUG_NOTES.nitrofurantoin);
  if (ids.some((id) => STATIN_IDS.has(id))) notes.push(DILI_DRUG_NOTES.statin);

  const strong = detection.matchedIds.filter((id) => {
    const c = diliCardsOnDesk([id])[0];
    return c && (c.card.cat === "A" || c.card.cat === "B");
  });
  if (strong.length >= 2) {
    notes.push(
      `More than one well-known hepatotoxin on the tray: ${strong.map((id) => DRUG_BY_ID[id]?.name ?? id).join(", ")}. If the liver panel turns, RUCAM's concomitant-drug item will cost points.`,
    );
  }
  if (host?.alcohol && host.alcohol !== "off" && detection.hasHepatotoxic) {
    notes.push("Alcohol is set on the host. RUCAM counts it as a risk factor, and it changes the acetaminophen story.");
  }
  if (host?.age === "geriatric" && detection.hasHepatotoxic) {
    notes.push("Older adult. RUCAM adds a point at age 55 or over.");
  }
  return { detection, notes, citations: DILI_CITATIONS, disclaimer: DILI_DISCLAIMER };
}
