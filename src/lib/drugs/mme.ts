/**
 * CDC oral MME teaching factors (2022 guideline).
 * Not a conversion protocol. Buprenorphine / street fentanyl / nitazenes are not MME-able.
 */

export interface MmeFactor {
  id: string;
  factor: number | null;
  unit: string;
  hint: string;
  note?: string;
  unconvertible?: boolean;
}

/** Oral MME factor unless noted. Methadone is dose-banded — use methadoneFactor(). */
export const MME_FACTOR: Record<string, MmeFactor> = {
  morphine: {
    id: "morphine",
    factor: 1,
    unit: "mg/day oral",
    hint: "The reference opioid.",
  },
  hydrocodone: {
    id: "hydrocodone",
    factor: 1,
    unit: "mg/day oral",
    hint: "Norco / Vicodin. Same factor as morphine.",
  },
  oxycodone: {
    id: "oxycodone",
    factor: 1.5,
    unit: "mg/day oral",
    hint: "Percocet milligrams × 1.5. Pressed 30s are not this row.",
  },
  oxymorphone: {
    id: "oxymorphone",
    factor: 3,
    unit: "mg/day oral",
    hint: "Opana. Three times morphine milligram-for-milligram oral.",
  },
  hydromorphone: {
    id: "hydromorphone",
    factor: 5,
    unit: "mg/day oral",
    hint: "Dilaudid. Oral factor 5. IV is a different map.",
  },
  codeine: {
    id: "codeine",
    factor: 0.15,
    unit: "mg/day oral",
    hint: "2D6 activation to morphine. A PM gets almost no MME; a UM gets a surprise.",
  },
  tramadol: {
    id: "tramadol",
    factor: 0.2,
    unit: "mg/day oral",
    hint: "Weak μ plus SNRI. MME undercounts the serotonin / seizure row.",
  },
  tapentadol: {
    id: "tapentadol",
    factor: 0.4,
    unit: "mg/day oral",
    hint: "Nucynta. Stronger μ than tramadol, still not morphine.",
  },
  meperidine: {
    id: "meperidine",
    factor: 0.1,
    unit: "mg/day oral",
    hint: "Demerol. Normeperidine seizures. Do not chase MME on this relic.",
  },
  methadone: {
    id: "methadone",
    factor: null,
    unit: "mg/day oral",
    hint: "Dose-banded. 1–20 mg ×4, 21–40 ×8, 41–60 ×10, ≥61 ×12. OTP is not this calculator.",
    note: "CDC bands. Incomplete for a take-home. QT and t½ are the louder rows.",
  },
  fentanyl: {
    id: "fentanyl",
    factor: null,
    unit: "mcg/hr patch or unknown street mg",
    hint: "Patch factor is 2.4 × mcg/hr. Illicit powder is not milligram-morphine.",
    note: "Street fentanyl is potency roulette. Treat as unknown, not a 50 MME assumption.",
  },
  "dirty-30": {
    id: "dirty-30",
    factor: null,
    unit: "unknown",
    hint: "Stamped 30 ≠ 30 mg oxycodone. Fentanyl ± xylazine ± a nitazene.",
  },
  "pressed-30": {
    id: "pressed-30",
    factor: null,
    unit: "unknown",
    hint: "Same as dirty 30. Do not convert a stamp to MME.",
  },
  heroin: {
    id: "heroin",
    factor: null,
    unit: "unknown",
    hint: "Diacetylmorphine. Street mass is not a milligram.",
  },
  buprenorphine: {
    id: "buprenorphine",
    factor: null,
    unit: "mg/day SL",
    hint: "Partial agonist. CDC does not convert MOUD bup to MME the same way.",
    note: "Occupancy, not morphine. Precipitated withdrawal is the induction row.",
  },
  carfentanil: {
    id: "carfentanil",
    factor: null,
    unit: "unknown",
    hint: "Veterinary. Not MME-able. Naloxone still, then a long watch.",
  },
  isotonitazene: {
    id: "isotonitazene",
    factor: null,
    unit: "unknown",
    hint: "Nitazene. Often hotter than fentanyl. Not a conversion.",
  },
  protonitazene: {
    id: "protonitazene",
    factor: null,
    unit: "unknown",
    hint: "Nitazene. Unknown potency. Naloxone, then the residual.",
  },
  metonitazene: {
    id: "metonitazene",
    factor: null,
    unit: "unknown",
    hint: "Nitazene. Not MME-able.",
  },
  etonitazene: {
    id: "etonitazene",
    factor: null,
    unit: "unknown",
    hint: "Nitazene. Not MME-able.",
  },
  "seven-oh": {
    id: "seven-oh",
    factor: null,
    unit: "unknown",
    hint: "7-OH-mitragynine. μ load that is not a morphine tablet.",
  },
  loperamide: {
    id: "loperamide",
    factor: null,
    unit: "mg (P-gp knockout)",
    hint: "Imodium is peripheral until P-gp is knocked out. Then it is a central opioid with QT. Not CDC MME.",
  },
  brorphine: {
    id: "brorphine",
    factor: null,
    unit: "unknown",
    hint: "Orphine synthetic opioid. Non-fentanyl μ-agonist with hERG QTc liability. Not MME-able.",
    note: "Illicit benzimidazolone-piperidine potency cannot be converted to oral morphine equivalents.",
  },
  cychlorphine: {
    id: "cychlorphine",
    factor: null,
    unit: "unknown",
    hint: "Orphine synthetic opioid (N-propionitrile chlorphine). High-affinity μ-agonist in counterfeit tablets. Not MME-able.",
    note: "No clinical equianalgesic conversion exists; manage as unknown high-potency synthetic opioid load.",
  },
  spirochlorphine: {
    id: "spirochlorphine",
    factor: null,
    unit: "unknown",
    hint: "Orphine synthetic opioid (R-6890). Archival spiro-piperidine μ-agonist with hERG signal. Not MME-able.",
    note: "Uncharacterized human oral equianalgesic ratio; not convertible on CDC MME tables.",
  },
  "sr-17018": {
    id: "sr-17018",
    factor: null,
    unit: "unknown",
    hint: "Orphine research compound (SR-17018). Preclinical G-protein bias does not provide an MME factor or prevent human apnea.",
    note: "Unpredictable cross-tolerance with fentanyl and buprenorphine; not MME-convertible.",
  },
  "dichloro-brorphine": {
    id: "dichloro-brorphine",
    factor: null,
    unit: "unknown",
    hint: "Halogenated orphine synthetic opioid. High-potency μ-agonist with hERG liability. Not MME-able.",
    note: "Illicit synthetic opioid; linear MME conversion does not apply.",
  },
  chlorphine: {
    id: "chlorphine",
    factor: null,
    unit: "unknown",
    hint: "Chloro-substituted brorphine analogue. Potent μ-agonist in illicit powders and pressed tablets. Not MME-able.",
    note: "Illicit benzimidazolone-piperidine; not convertible to oral morphine equivalents.",
  },
  "n-phenethyl-chloro-nor-orphine": {
    id: "n-phenethyl-chloro-nor-orphine",
    factor: null,
    unit: "unknown",
    hint: "Positional chloro-isomer nor-orphine derivative. High-potency μ-agonist. Not MME-able.",
    note: "Forensic NPS synthetic opioid without an established human equianalgesic factor.",
  },
  protonitazepyne: {
    id: "protonitazepyne",
    factor: null,
    unit: "unknown",
    hint: "N-pyrrolidino protonitazene. Ultra-potent benzimidazole μ-agonist. Not MME-able.",
    note: "Street nitazepyne potency far exceeds standard oral conversion tables.",
  },
  metonitazepyne: {
    id: "metonitazepyne",
    factor: null,
    unit: "unknown",
    hint: "N-pyrrolidino metonitazene. High-potency benzimidazole μ-agonist. Not MME-able.",
    note: "No clinical oral morphine conversion factor; high re-narcotization liability.",
  },
  etonitazepipne: {
    id: "etonitazepipne",
    factor: null,
    unit: "unknown",
    hint: "N-piperidinyl etonitazene. Ultra-potent ring-modified benzimidazole opioid. Not MME-able.",
    note: "Illicit nitazepipne cannot be converted on CDC oral MME tables.",
  },
  norisotonitazene: {
    id: "norisotonitazene",
    factor: null,
    unit: "unknown",
    hint: "Active N-deethylated isotonitazene metabolite and primary street nitazene. Not MME-able.",
    note: "Retains high μ-opioid potency; not convertible to oral morphine equivalents.",
  },
  "n-pyrrolidino-ethylene-isotonitazene": {
    id: "n-pyrrolidino-ethylene-isotonitazene",
    factor: null,
    unit: "unknown",
    hint: "Linker-modified pyrrolidino-isotonitazene analogue. Ultra-potent benzimidazole opioid. Not MME-able.",
    note: "Forensic benzimidazole NPS; linear MME conversion is not valid.",
  },
  "n-pyrrolidino-etonitazene": {
    id: "n-pyrrolidino-etonitazene",
    factor: null,
    unit: "unknown",
    hint: "N-pyrrolidino etonitazene (etonitazepyne). Ultra-potent benzimidazole μ-agonist. Not MME-able.",
  },
  etodesnitazene: {
    id: "etodesnitazene",
    factor: null,
    unit: "unknown",
    hint: "Desnitro-etonitazene analogue. Illicit benzimidazole opioid. Not MME-able.",
  },
  butonitazene: {
    id: "butonitazene",
    factor: null,
    unit: "unknown",
    hint: "Butoxy-benzimidazole nitazene analogue. Not MME-able.",
  },
  flunitazene: {
    id: "flunitazene",
    factor: null,
    unit: "unknown",
    hint: "Fluoro-substituted benzimidazole nitazene analogue. Not MME-able.",
  },
};

export function methadoneFactor(mgPerDay: number): number {
  if (!Number.isFinite(mgPerDay) || mgPerDay <= 0) return 4;
  if (mgPerDay <= 20) return 4;
  if (mgPerDay <= 40) return 8;
  if (mgPerDay <= 60) return 10;
  return 12;
}

export function fentanylPatchMme(mcgPerHr: number): number | null {
  if (!Number.isFinite(mcgPerHr) || mcgPerHr <= 0) return null;
  return mcgPerHr * 2.4;
}

export function mmeOnDesk(ids: string[]): MmeFactor[] {
  const seen = new Set<string>();
  const out: MmeFactor[] = [];
  for (const id of ids) {
    const card = MME_FACTOR[id];
    if (!card || seen.has(id)) continue;
    seen.add(id);
    out.push(card.factor === null ? { ...card, unconvertible: true } : card);
  }
  return out;
}

export const mmeForDesk = mmeOnDesk;

export function hasMme(ids: string[]) {
  return mmeOnDesk(ids).length > 0;
}
