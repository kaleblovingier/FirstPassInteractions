/**
 * Opioid rotation teaching engine.
 *
 * Shows the arithmetic a pharmacist or prescriber checks when moving a patient
 * from one opioid to another: equianalgesic table → 24-hour oral morphine
 * equivalent (OME) → target drug → incomplete cross-tolerance reduction →
 * scheduled split and breakthrough range. Fentanyl patch and methadone get their
 * own paths because a linear table is wrong for both.
 *
 * Teaching math only. Not a dose, not an order. Equianalgesic tables are
 * single-dose, opioid-tolerant, population estimates; the label and the
 * patient in front of you govern.
 *
 * Sources:
 *   McPherson ML. Demystifying Opioid Conversion Calculations. 2nd ed. ASHP; 2018.
 *   Dowell D, et al. CDC Clinical Practice Guideline for Prescribing Opioids for Pain. MMWR Recomm Rep 2022;71(RR-3):1–95.
 *   Duragesic (fentanyl transdermal system) Prescribing Information, Janssen.
 *   Chou R, et al. Methadone safety: a clinical practice guideline (APS / CPDD / HRS). J Pain 2014;15(4):321–337.
 *   Ripamonti C, et al. Switching from morphine to oral methadone in treating cancer pain. J Clin Oncol 1998;16:3216–3221.
 *   Ayonrinde OT, Bridge DT. The rediscovery of methadone for cancer pain management. Med J Aust 2000;173:536–540.
 */

import { DRUG_BY_ID } from "./catalog";
import type { HostContext } from "./types";

export const ROTATION_DISCLAIMER =
  "Teaching arithmetic, not a dose or an order. Equianalgesic tables are population estimates from single-dose studies; the Prescribing Information and the prescriber's assessment govern.";

export type RotationRoute = "po" | "iv";

export interface EquianalgesicRow {
  key: string;
  drugId: string;
  label: string;
  route: RotationRoute;
  /** Milligrams of this drug and route ≈ 30 mg oral morphine. */
  equianalgesicMg: number;
  /** Can be picked as the target. False means "convert from only". */
  target: boolean;
  /** Usual scheduled interval for the immediate-release product, in hours. */
  usualIntervalH: number;
  note: string;
}

/** McPherson 2018 equianalgesic anchors (30 mg oral morphine reference). */
export const EQUIANALGESIC: EquianalgesicRow[] = [
  { key: "morphine-po", drugId: "morphine", label: "Morphine PO", route: "po", equianalgesicMg: 30, target: true, usualIntervalH: 4, note: "Reference. Active M6G and neuroexcitatory M3G accumulate when the kidney fails." },
  { key: "morphine-iv", drugId: "morphine", label: "Morphine IV", route: "iv", equianalgesicMg: 10, target: true, usualIntervalH: 3, note: "PO:IV about 3:1 with chronic dosing." },
  { key: "hydromorphone-po", drugId: "hydromorphone", label: "Hydromorphone PO", route: "po", equianalgesicMg: 7.5, target: true, usualIntervalH: 4, note: "H3G is neuroexcitatory in renal failure, less than M3G." },
  { key: "hydromorphone-iv", drugId: "hydromorphone", label: "Hydromorphone IV", route: "iv", equianalgesicMg: 1.5, target: true, usualIntervalH: 3, note: "PO:IV about 5:1. The most common ten-fold error is mg vs mL of a concentrated product." },
  { key: "oxycodone-po", drugId: "oxycodone", label: "Oxycodone PO", route: "po", equianalgesicMg: 20, target: true, usualIntervalH: 4, note: "3A4 and 2D6 substrate; a strong 3A4 inhibitor raises exposure." },
  { key: "hydrocodone-po", drugId: "hydrocodone", label: "Hydrocodone PO", route: "po", equianalgesicMg: 30, target: true, usualIntervalH: 4, note: "Combination products carry an acetaminophen ceiling." },
  { key: "oxymorphone-po", drugId: "oxymorphone", label: "Oxymorphone PO", route: "po", equianalgesicMg: 10, target: true, usualIntervalH: 6, note: "Take on an empty stomach; food and alcohol raise exposure." },
  { key: "fentanyl-iv", drugId: "fentanyl", label: "Fentanyl IV (single dose)", route: "iv", equianalgesicMg: 0.1, target: false, usualIntervalH: 1, note: "100 mcg ≈ 10 mg IV morphine for a bolus. Long infusions load fat, so the ratio drifts." },
  { key: "codeine-po", drugId: "codeine", label: "Codeine PO", route: "po", equianalgesicMg: 200, target: false, usualIntervalH: 4, note: "Prodrug. 2D6 phenotype decides how much morphine arrives." },
  { key: "tramadol-po", drugId: "tramadol", label: "Tramadol PO", route: "po", equianalgesicMg: 150, target: false, usualIntervalH: 6, note: "Anchored to the CDC 2022 factor 0.2. Published ratios vary widely. Serotonergic and seizure risk are not in the number." },
  { key: "tapentadol-po", drugId: "tapentadol", label: "Tapentadol PO", route: "po", equianalgesicMg: 75, target: false, usualIntervalH: 6, note: "Anchored to the CDC 2022 factor 0.4. Mu plus norepinephrine reuptake." },
];

export const EQUI_BY_KEY: Record<string, EquianalgesicRow> = Object.fromEntries(EQUIANALGESIC.map((r) => [r.key, r]));

export type RotationReason = "uncontrolled-pain" | "adverse-effects" | "route-change" | "formulary";

export interface RotationFactors {
  geriatric: boolean;
  renalImpairment: boolean;
  hepaticImpairment: boolean;
  sedativeOnTray: boolean;
  reason: RotationReason;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 24-hour total of any table row → 24-hour oral morphine equivalent. */
export function toOme(key: string, mgPer24h: number): number {
  const row = EQUI_BY_KEY[key];
  if (!row || !Number.isFinite(mgPer24h) || mgPer24h <= 0) return 0;
  return (mgPer24h * 30) / row.equianalgesicMg;
}

/** 24-hour oral morphine equivalent → 24-hour total of a table row, before any reduction. */
export function fromOme(key: string, ome: number): number {
  const row = EQUI_BY_KEY[key];
  if (!row || !Number.isFinite(ome) || ome <= 0) return 0;
  return (ome * row.equianalgesicMg) / 30;
}

export interface CrossToleranceChoice {
  /** Fraction removed, e.g. 0.25. */
  reduction: number;
  rangeLow: number;
  rangeHigh: number;
  why: string;
}

/**
 * Incomplete cross-tolerance: reduce the calculated equianalgesic dose 25–50%.
 * Same molecule, new route: no reduction for cross-tolerance (route ratio already applied).
 */
export function crossToleranceReduction(sameMolecule: boolean, f: RotationFactors): CrossToleranceChoice {
  if (sameMolecule) {
    return {
      reduction: 0,
      rangeLow: 0,
      rangeHigh: 0,
      why: "Same molecule, new route. The route ratio is the whole conversion; cross-tolerance is not in play.",
    };
  }
  const risks: string[] = [];
  if (f.geriatric) risks.push("older adult");
  if (f.renalImpairment) risks.push("renal impairment");
  if (f.hepaticImpairment) risks.push("hepatic impairment");
  if (f.sedativeOnTray) risks.push("another CNS depressant on the tray");
  if (f.reason === "adverse-effects") risks.push("switching because of adverse effects");
  if (risks.length > 0) {
    return {
      reduction: 0.5,
      rangeLow: 0.25,
      rangeHigh: 0.5,
      why: `Top of the 25–50% range: ${risks.join(", ")}.`,
    };
  }
  if (f.reason === "uncontrolled-pain") {
    return {
      reduction: 0.25,
      rangeLow: 0.25,
      rangeHigh: 0.5,
      why: "Bottom of the 25–50% range: pain is uncontrolled and no risk modifier is set.",
    };
  }
  return {
    reduction: 0.33,
    rangeLow: 0.25,
    rangeHigh: 0.5,
    why: "Middle of the 25–50% range: no risk modifier, pain is not the driver.",
  };
}

export interface RotationResult {
  from: EquianalgesicRow;
  to: EquianalgesicRow;
  fromMgPer24h: number;
  ome: number;
  calculatedTargetMgPer24h: number;
  crossTolerance: CrossToleranceChoice;
  reducedTargetMgPer24h: number;
  reducedRangeMgPer24h: [number, number];
  intervalH: number;
  dosesPerDay: number;
  perDoseMg: number;
  breakthroughMg: [number, number];
  steps: string[];
  warnings: string[];
}

export function rotateOpioid(input: {
  fromKey: string;
  fromMgPer24h: number;
  toKey: string;
  intervalH?: number;
  factors: RotationFactors;
}): RotationResult | null {
  const from = EQUI_BY_KEY[input.fromKey];
  const to = EQUI_BY_KEY[input.toKey];
  if (!from || !to || !to.target) return null;
  if (!Number.isFinite(input.fromMgPer24h) || input.fromMgPer24h <= 0) return null;

  const ome = toOme(from.key, input.fromMgPer24h);
  const calculated = fromOme(to.key, ome);
  const sameMolecule = from.drugId === to.drugId;
  const ct = crossToleranceReduction(sameMolecule, input.factors);
  const reduced = calculated * (1 - ct.reduction);
  const intervalH = input.intervalH && input.intervalH > 0 ? input.intervalH : to.usualIntervalH;
  const dosesPerDay = Math.max(1, Math.round(24 / intervalH));
  const perDose = reduced / dosesPerDay;

  const steps = [
    `${round1(input.fromMgPer24h)} mg/24 h ${from.label} × (30 ÷ ${from.equianalgesicMg}) = ${round1(ome)} mg oral morphine equivalent.`,
    `${round1(ome)} × (${to.equianalgesicMg} ÷ 30) = ${round1(calculated)} mg/24 h ${to.label}, before any reduction.`,
    sameMolecule
      ? "Same molecule: no cross-tolerance reduction."
      : `Reduce ${Math.round(ct.reduction * 100)}% for incomplete cross-tolerance → ${round1(reduced)} mg/24 h.`,
    `Split every ${intervalH} h (${dosesPerDay} doses) → about ${round1(perDose)} mg per dose. Round down to a strength that exists.`,
    `Breakthrough is 10–20% of the new 24 h total: ${round1(reduced * 0.1)}–${round1(reduced * 0.2)} mg of an immediate-release product.`,
  ];

  const warnings: string[] = [];
  if (!from.target) warnings.push(`${from.label} is a convert-from row only. ${from.note}`);
  if (ome >= 90) warnings.push("At or above 90 mg OME/day. CDC 2022 asks for a careful benefit–risk review before going higher and for offering naloxone.");
  else if (ome >= 50) warnings.push("At or above 50 mg OME/day. CDC 2022 asks clinicians to offer naloxone.");
  if (input.factors.sedativeOnTray) warnings.push("A benzodiazepine or other CNS depressant is on the tray. Concurrent use raises overdose risk (CDC 2022, boxed warnings).");
  if (input.factors.renalImpairment && ["morphine", "codeine", "tramadol", "meperidine"].includes(to.drugId)) {
    warnings.push(`${to.label} has renally cleared active or neurotoxic metabolites. Most references avoid it in significant renal impairment.`);
  }

  return {
    from,
    to,
    fromMgPer24h: input.fromMgPer24h,
    ome: round1(ome),
    calculatedTargetMgPer24h: round1(calculated),
    crossTolerance: ct,
    reducedTargetMgPer24h: round1(reduced),
    reducedRangeMgPer24h: [round1(calculated * (1 - ct.rangeHigh)), round1(calculated * (1 - ct.rangeLow))],
    intervalH,
    dosesPerDay,
    perDoseMg: round1(perDose),
    breakthroughMg: [round1(reduced * 0.1), round1(reduced * 0.2)],
    steps,
    warnings,
  };
}

/* ── Fentanyl transdermal ─────────────────────────────────────────────── */

/** Duragesic PI: initial patch strength from 24-hour oral morphine. The table is deliberately conservative; do not run it in reverse. */
export const DURAGESIC_TABLE: { omeLow: number; omeHigh: number; mcgPerH: number }[] = [
  { omeLow: 60, omeHigh: 134, mcgPerH: 25 },
  { omeLow: 135, omeHigh: 224, mcgPerH: 50 },
  { omeLow: 225, omeHigh: 314, mcgPerH: 75 },
  { omeLow: 315, omeHigh: 404, mcgPerH: 100 },
  { omeLow: 405, omeHigh: 494, mcgPerH: 125 },
  { omeLow: 495, omeHigh: 584, mcgPerH: 150 },
  { omeLow: 585, omeHigh: 674, mcgPerH: 175 },
  { omeLow: 675, omeHigh: 764, mcgPerH: 200 },
  { omeLow: 765, omeHigh: 854, mcgPerH: 225 },
  { omeLow: 855, omeHigh: 944, mcgPerH: 250 },
  { omeLow: 945, omeHigh: 1034, mcgPerH: 275 },
  { omeLow: 1035, omeHigh: 1124, mcgPerH: 300 },
];

export interface PatchResult {
  ome: number;
  opioidTolerant: boolean;
  mcgPerH: number | null;
  steps: string[];
  warnings: string[];
}

export function toFentanylPatch(ome: number): PatchResult {
  const o = Number.isFinite(ome) && ome > 0 ? ome : 0;
  const tolerant = o >= 60;
  // Bands are integer-edged in the label; treat a fractional OME by the band whose ceiling it has not passed.
  const row = DURAGESIC_TABLE.find((r) => o < r.omeHigh + 1 && o >= r.omeLow);
  const above = o >= DURAGESIC_TABLE[DURAGESIC_TABLE.length - 1].omeHigh + 1;
  const steps: string[] = [];
  const warnings: string[] = [];
  if (!tolerant) {
    warnings.push("Below 60 mg OME/day for a week is not opioid tolerant. The label contraindicates the patch in opioid-naive patients.");
    return { ome: round1(o), opioidTolerant: false, mcgPerH: null, steps, warnings };
  }
  steps.push(`${round1(o)} mg OME/day falls in the label band → ${row ? `${row.mcgPerH} mcg/h` : "above the table"}.`);
  steps.push("The label table already builds in a conservative start. Do not take a further cross-tolerance cut on top of it.");
  steps.push("Serum levels rise over 12–24 h. Keep the old regimen covering that gap; with a 12-hourly ER tablet, the patch goes on with the last dose.");
  steps.push("First titration no sooner than 3 days; later steps no more often than every 6 days.");
  warnings.push("Fever, heating pads, and hot baths raise absorption. Strong CYP3A4 inhibitors carry a boxed warning.");
  warnings.push("The table is one-way. Leaving a patch, fentanyl lingers about a day after removal; start the next opioid low.");
  if (above) warnings.push("Above the label table. This is specialist territory.");
  return { ome: round1(o), opioidTolerant: true, mcgPerH: row ? row.mcgPerH : null, steps, warnings };
}

/** Patch → OME uses the CDC factor (2.4 per mcg/h); then the usual cross-tolerance reduction applies. */
export function patchToOme(mcgPerH: number): number {
  if (!Number.isFinite(mcgPerH) || mcgPerH <= 0) return 0;
  return round1(mcgPerH * 2.4);
}

/* ── Methadone ────────────────────────────────────────────────────────── */

export interface MethadoneRatioBand {
  source: string;
  /** Inclusive lower bound is exclusive for every band after the first: ome > previous omeHigh. */
  omeHigh: number;
  ratio: number;
}

/** Ripamonti 1998: morphine-to-methadone ratio climbs with prior morphine dose. */
export const RIPAMONTI_BANDS: MethadoneRatioBand[] = [
  { source: "Ripamonti 1998", omeHigh: 90, ratio: 4 },
  { source: "Ripamonti 1998", omeHigh: 300, ratio: 8 },
  { source: "Ripamonti 1998", omeHigh: Infinity, ratio: 12 },
];

/** Ayonrinde & Bridge 2000. */
export const AYONRINDE_BANDS: MethadoneRatioBand[] = [
  { source: "Ayonrinde 2000", omeHigh: 100, ratio: 3 },
  { source: "Ayonrinde 2000", omeHigh: 300, ratio: 5 },
  { source: "Ayonrinde 2000", omeHigh: 600, ratio: 10 },
  { source: "Ayonrinde 2000", omeHigh: 800, ratio: 12 },
  { source: "Ayonrinde 2000", omeHigh: 1000, ratio: 15 },
  { source: "Ayonrinde 2000", omeHigh: Infinity, ratio: 20 },
];

export const METHADONE_START_CAP_MG = 40;

export interface MethadoneResult {
  ome: number;
  ratios: { source: string; ratio: number; mgPer24h: number }[];
  capMgPer24h: number;
  cappedMgPer24h: number;
  perDoseQ8hMg: number;
  steps: string[];
  warnings: string[];
}

export function methadoneRatioFor(bands: MethadoneRatioBand[], ome: number): MethadoneRatioBand {
  return bands.find((b) => ome <= b.omeHigh) ?? bands[bands.length - 1];
}

export function toMethadone(ome: number): MethadoneResult | null {
  if (!Number.isFinite(ome) || ome <= 0) return null;
  const rip = methadoneRatioFor(RIPAMONTI_BANDS, ome);
  const ayo = methadoneRatioFor(AYONRINDE_BANDS, ome);
  const ratios = [rip, ayo].map((b) => ({ source: b.source, ratio: b.ratio, mgPer24h: round1(ome / b.ratio) }));
  const lowest = Math.min(...ratios.map((r) => r.mgPer24h));
  const capped = Math.min(lowest, METHADONE_START_CAP_MG);
  const steps = [
    `${round1(ome)} mg OME/day. The morphine:methadone ratio is not fixed; it climbs as the prior dose climbs.`,
    ...ratios.map((r) => `${r.source}: ${r.ratio}:1 → ${r.mgPer24h} mg methadone/24 h.`),
    `APS/CPDD/HRS 2014: when coming from high doses, start well below the calculated figure and no higher than 30–40 mg/day. Teaching figure: ${round1(capped)} mg/24 h, split every 8 h ≈ ${round1(capped / 3)} mg.`,
    "Steady state takes 5–7 days or longer. Increase no faster than every 5–7 days.",
  ];
  const warnings = [
    "Half-life runs from about 8 to over 50 hours. Deaths cluster in the first weeks, when the dose is raised before the drug has accumulated.",
    "Get a baseline ECG. QTc above 450 ms needs a second look; above 500 ms most guidance says reconsider.",
    "CYP3A4, 2B6 and 2C19 substrate. Inducers can cause withdrawal; inhibitors and stopping an inducer can cause overdose.",
    "Rotation to methadone belongs with a clinician experienced in its use.",
  ];
  return {
    ome: round1(ome),
    ratios,
    capMgPer24h: METHADONE_START_CAP_MG,
    cappedMgPer24h: round1(capped),
    perDoseQ8hMg: round1(capped / 3),
    steps,
    warnings,
  };
}

/* ── Desk detection and report ────────────────────────────────────────── */

const ROTATION_IDS = new Set([...EQUIANALGESIC.map((r) => r.drugId), "methadone", "buprenorphine"]);

export interface RotationDeskDetection {
  hasOpioid: boolean;
  opioidIds: string[];
  sedativeIds: string[];
  hasBuprenorphine: boolean;
  hasMethadone: boolean;
}

export function rotationOnDesk(ids: string[]): RotationDeskDetection {
  const opioidIds = ids.filter((id) => ROTATION_IDS.has(id));
  const sedativeIds = ids.filter((id) => {
    if (ROTATION_IDS.has(id)) return false;
    const d = DRUG_BY_ID[id];
    return Boolean(d && d.pd.includes("cns-depressant") && !d.pd.includes("opioid"));
  });
  return {
    hasOpioid: opioidIds.length > 0,
    opioidIds,
    sedativeIds,
    hasBuprenorphine: ids.includes("buprenorphine"),
    hasMethadone: ids.includes("methadone"),
  };
}

/** Pick a sensible default "from" row for the tray. */
export function defaultFromKey(ids: string[]): string {
  const hit = EQUIANALGESIC.find((r) => r.route === "po" && ids.includes(r.drugId));
  return hit ? hit.key : "morphine-po";
}

export function factorsFromHost(ids: string[], host?: HostContext): RotationFactors {
  return {
    geriatric: host?.age === "geriatric",
    renalImpairment: host?.kidney === "ckd" || (typeof host?.egfr === "number" && host.egfr < 30),
    hepaticImpairment: false,
    sedativeOnTray: rotationOnDesk(ids).sedativeIds.length > 0,
    reason: "uncontrolled-pain",
  };
}

export interface RotationReport {
  detection: RotationDeskDetection;
  notes: string[];
  citations: string[];
  disclaimer: string;
}

export const ROTATION_CITATIONS = [
  "McPherson ML. Demystifying Opioid Conversion Calculations: A Guide for Effective Dosing. 2nd ed. Bethesda, MD: ASHP; 2018.",
  "Dowell D, Ragan KR, Jones CM, Baldwin GT, Chou R. CDC Clinical Practice Guideline for Prescribing Opioids for Pain — United States, 2022. MMWR Recomm Rep 2022;71(No. RR-3):1–95.",
  "Duragesic (fentanyl transdermal system) Prescribing Information. Janssen Pharmaceuticals.",
  "Chou R, Cruciani RA, Fiellin DA, et al. Methadone safety: a clinical practice guideline from APS and CPDD, in collaboration with HRS. J Pain 2014;15(4):321–337.",
  "Ripamonti C, Groff L, Brunelli C, et al. Switching from morphine to oral methadone in treating cancer pain: what is the equianalgesic dose ratio? J Clin Oncol 1998;16(10):3216–3221.",
  "Ayonrinde OT, Bridge DT. The rediscovery of methadone for cancer pain management. Med J Aust 2000;173(10):536–540.",
];

export function rotationReportOnDesk(ids: string[], host?: HostContext): RotationReport {
  const detection = rotationOnDesk(ids);
  const notes: string[] = [];
  if (detection.hasBuprenorphine) {
    notes.push("Buprenorphine is a high-affinity partial agonist. It does not sit on a linear equianalgesic table; moving to or from it is an induction or a bridging question.");
  }
  if (detection.hasMethadone) {
    notes.push("Methadone on the tray: converting away from it is not the reverse of converting to it. Its long half-life means the old drug is still arriving for days.");
  }
  if (detection.sedativeIds.length > 0) {
    notes.push(`CNS depressant alongside the opioid: ${detection.sedativeIds.map((id) => DRUG_BY_ID[id]?.name ?? id).join(", ")}.`);
  }
  if (host?.kidney === "ckd") {
    notes.push("Renal flag set. Morphine, codeine, tramadol and meperidine leave active or neurotoxic metabolites behind.");
  }
  return { detection, notes, citations: ROTATION_CITATIONS, disclaimer: ROTATION_DISCLAIMER };
}
