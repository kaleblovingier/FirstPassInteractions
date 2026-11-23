/** OTP / office-based MAT teaching tools. Not a protocol, not a milligram, not 42 CFR compliance software. */

import { DRUG_BY_ID } from "./catalog";
import {
  NPS_DESIGNER_BENZO_IDS,
  NPS_NITAZENE_IDS,
  NPS_ORPHINE_IDS,
} from "./nps-watch";

export type LastAgonist = "fentanyl" | "short" | "methadone" | "bup" | "unknown";
export type Tone = "ok" | "warn" | "danger";

export interface OtpCall {
  tone: Tone;
  title: string;
  body: string;
  consider: string;
}

const HIGH_AFFINITY_SYNTHETIC_OPIOIDS = new Set([
  "fentanyl",
  "dirty-30",
  "pressed-30",
  "carfentanil",
  "cychlorphine",
  "brorphine",
  "spirochlorphine",
  "sr-17018",
  "dichloro-brorphine",
  "chlorphine",
  "n-phenethyl-chloro-nor-orphine",
  "etonitazene",
  "isotonitazene",
  "protonitazene",
  "metonitazene",
  "clonitazene",
  "N-desethyl-isotonitazene",
  "n-pyrrolidino-etonitazene",
  "butonitazene",
  "protonitazepyne",
  "metonitazepyne",
  "etonitazepipne",
  "norisotonitazene",
  "n-pyrrolidino-ethylene-isotonitazene",
  ...NPS_ORPHINE_IDS,
  ...NPS_NITAZENE_IDS,
]);

export const LAST_AGONISTS: { id: LastAgonist; label: string; hint: string }[] = [
  { id: "fentanyl", label: "Fentanyl / nitazene / pressed 30", hint: "Lipophilic depot. Occupancy can outlast the COWS." },
  { id: "short", label: "Heroin / oxycodone / hydro", hint: "Shorter μ occupancy than fentanyl or methadone." },
  { id: "methadone", label: "Methadone", hint: "Days of occupancy. A first film is not a methadone taper." },
  { id: "bup", label: "Already on buprenorphine", hint: "A film on a film is not precipitated withdrawal." },
  { id: "unknown", label: "Unknown supply", hint: "Treat as fentanyl until the cup or the story is better." },
];

export function guessLastAgonist(ids: string[]): LastAgonist {
  if (ids.includes("methadone") && !ids.includes("buprenorphine")) return "methadone";
  if (ids.some((id) => HIGH_AFFINITY_SYNTHETIC_OPIOIDS.has(id))) {
    return "fentanyl";
  }
  if (ids.some((id) => ["heroin", "oxycodone", "hydrocodone", "morphine", "hydromorphone"].includes(id))) {
    return "short";
  }
  if (ids.includes("buprenorphine") && !ids.includes("naltrexone")) return "bup";
  return "unknown";
}

/** Occupancy vs COWS. ASAM 2020 / SAMHSA TIP 63 teaching — not an induction order. */
export function precipRisk(last: LastAgonist, hours: number, cows: number): OtpCall {
  const h = Number.isFinite(hours) ? hours : 0;
  const c = Number.isFinite(cows) ? cows : 0;
  if (last === "bup") {
    return {
      tone: "ok",
      title: "Already on a partial agonist",
      body: "A film on a working film is occupancy continuity, not precipitated withdrawal. New full agonist on the desk is the other row.",
      consider: "If they missed doses and used a full agonist, this is a restart question — not a first-film protocol on this desk.",
    };
  }
  if (last === "methadone") {
    return {
      tone: "danger",
      title: "Methadone occupancy lasts days",
      body: `Last methadone ~${Math.round(h)} h ago, COWS ${c}. A standard first film on recent methadone is a classic precip map. Micro-induction / Bernese maps exist in the literature; they are specialist, not this integer.`,
      consider: "Do not treat a high COWS as permission to start a film over methadone. Open the ASAM guideline. This desk does not pick milligrams.",
    };
  }
  if (last === "fentanyl" || last === "unknown") {
    if (h < 24) {
      return {
        tone: "danger",
        title: "Fentanyl depot is still likely",
        body: `~${Math.round(h)} h since last use, COWS ${c}. Tissue fentanyl can still occupy μ when they look sick enough to start. A high COWS does not clear the receptor.`,
        consider: "Wait, or use a published low-dose / micro-induction map under a protocol you own. This desk is not that protocol.",
      };
    }
    if (h < 48 || c < 8) {
      return {
        tone: "warn",
        title: "Occupancy may still be present",
        body: `~${Math.round(h)} h, COWS ${c}. Many office maps still wait past a day of fentanyl and for moderate COWS. Depot remains possible at 14.`,
        consider: "ASAM 2020 and TIP 63 discuss timing. Independently review. Do not chase precip by stacking film in the first stretch.",
      };
    }
    return {
      tone: "warn",
      title: "Standard maps often proceed — depot still possible",
      body: `~${Math.round(h)} h, COWS ${c}. Some published starts proceed here. Fentanyl in adipose can still precipitate. The integer is not the receptor.`,
      consider: "Name the risk. Have a rescue plan. This is not a go-ahead from FirstPass.",
    };
  }
  // short-acting
  if (h < 12 || c < 8) {
    return {
      tone: "warn",
      title: "Short-acting — still early or still mild",
      body: `~${Math.round(h)} h, COWS ${c}. Short-acting maps often wait for moderate withdrawal. A COWS under ~8 is a common reason to wait.`,
      consider: "Re-score. Do not start a film to 'prevent' withdrawal that has not started. Occupancy first.",
    };
  }
  return {
    tone: "ok",
    title: "Short-acting, moderate COWS — many maps start here",
    body: `~${Math.round(h)} h, COWS ${c}. Heroin / oxycodone occupancy is usually gone in this window. Still not a milligram from this desk.`,
    consider: "Confirm the last agonist is actually short-acting. Pressed 30s are fentanyl until proven otherwise.",
  };
}

export type NtxProduct = "oral" | "xr";

export function naltrexoneWashout(last: LastAgonist, days: number, product: NtxProduct): OtpCall {
  const d = Number.isFinite(days) ? days : 0;
  const shot = product === "xr";
  const name = shot ? "XR-naltrexone (Vivitrol)" : "Oral naltrexone";
  if (last === "bup") {
    return {
      tone: "warn",
      title: `${name} after buprenorphine`,
      body: `~${Math.round(d)} days off a partial agonist. Buprenorphine occupancy is long. A naloxone challenge is labeled teaching, not a dare.`,
      consider: "Open the Vivitrol / naltrexone PI. This desk does not time a shot.",
    };
  }
  if (last === "methadone") {
    if (d < 10) {
      return {
        tone: "danger",
        title: "Too soon after methadone",
        body: `~${Math.round(d)} days. Methadone occupancy plus a μ-antagonist is precipitated withdrawal that lasts. Labels discuss ~10–14 days after long-acting agonists.`,
        consider: "Do not give XR-naltrexone to 'save a window.' Open the PI. Independent review.",
      };
    }
    return {
      tone: "warn",
      title: "Methadone washout in the labeled neighborhood",
      body: `~${Math.round(d)} days off methadone. Still confirm with a challenge if the story is soft. ${name} is not a rescue for a missed bottle.`,
      consider: "PI plus a documented challenge. Not a dose and not a standing order from this desk.",
    };
  }
  const need = shot ? 7 : 7;
  if (d < need) {
    return {
      tone: "danger",
      title: `Too soon for ${name}`,
      body: `~${Math.round(d)} days after ${last === "fentanyl" || last === "unknown" ? "fentanyl-class" : "short-acting"} agonist. Labels typically discuss ~7–10 days after short-acting opioids. Fentanyl depot can run longer.`,
      consider: "Wait, or document a naloxone challenge you own. This desk does not clear a shot.",
    };
  }
  return {
    tone: "ok",
    title: "Washout in the usual labeled window",
    body: `~${Math.round(d)} days. ${name} maps often proceed after short-acting opioids here — still confirm occupancy. Unknown supply is fentanyl until it is not.`,
    consider: "Open DailyMed. A challenge is still reasonable if the history is thin.",
  };
}

export const TAKEHOME_DOMAINS: { id: string; label: string; hint: string }[] = [
  { id: "uds", label: "Toxicology is explained", hint: "Unexpected cups have a story, not a surprise." },
  { id: "safe", label: "Safe storage", hint: "Lockbox, no kids, no shared bottle." },
  { id: "stable", label: "Clinically stable", hint: "No recent overdose, diversion, or chaotic window." },
  { id: "cns", label: "Airway extras named", hint: "Benzos, alcohol, gabapentinoids are on the desk, not hidden." },
  { id: "housing", label: "A place to keep it", hint: "Unstable housing is a clinical factor, not a moral one." },
  { id: "time", label: "Time in treatment considered", hint: "2024 rule: time is a factor, not a lock." },
];

export const TAKEHOME_RULE =
  "42 CFR Part 8 (2024). SAMHSA replaced the old rigid take-home schedule with clinical judgment. This checklist is not an approval, not a SAMHSA form, and not a reason to dump a bottle. Independently review 89 FR 7528 and your state OTP rules.";

export const ID_SCREENS: { id: string; label: string; hint: string }[] = [
  { id: "hiv", label: "HIV", hint: "Offer test. ART boosters are a methadone / bup row." },
  { id: "hcv", label: "HCV Ab ± RNA", hint: "Epclusa on this desk dumps or nudges some OTP bottles." },
  { id: "hbv", label: "HBV", hint: "Vaccinate if non-immune. DAA can reactivate HBV." },
  { id: "syphilis", label: "Syphilis", hint: "ASAM / CDC STI screen on entry and when risk changes." },
  { id: "tb", label: "TB", hint: "Symptom screen ± IGRA. Rifampin is a stolen-dose card." },
  { id: "preg", label: "Pregnancy", hint: "Continue OTP. Do not detox to 'protect' the fetus." },
  { id: "hav", label: "HAV vaccine", hint: "Offer if not immune. Not a CYP row." },
];

export function naloxoneCounsel(ids: string[]): string[] | null {
  const opioid = ids.some((id) => {
    const d = DRUG_BY_ID[id];
    return d?.pd.includes("opioid") || d?.pd.includes("partial-opioid") || ["fentanyl", "dirty-30", "heroin", "pressed-30", "seven-oh"].includes(id);
  });
  if (!opioid && !ids.includes("methadone") && !ids.includes("buprenorphine")) return null;
  const xyl = ids.some((id) => ["xylazine", "medetomidine"].includes(id));
  const lines = [
    "Coprescribe naloxone. Show them the device they will actually leave with.",
    "Second dose if they are not breathing. Stay. Do not use alone.",
  ];
  if (xyl) {
    lines.push("Naloxone will not reverse xylazine or medetomidine. Airway still first; the opioid still gets naloxone.");
  }
  lines.push("This is counseling, not a kit protocol and not a milligram.");
  return lines;
}

export function methadoneMonitor(ids: string[], qtPartner: boolean): OtpCall | null {
  if (!ids.includes("methadone")) return null;
  if (qtPartner) {
    return {
      tone: "danger",
      title: "Methadone plus another QT drug",
      body: "Label: QTc, electrolytes, stacked QT. A new Seroquel, citalopram, Z-Pak, or Cipro is a reason to look at the last ECG — not a milligram from this desk.",
      consider: "Baseline ECG teaching, K/Mg, and the partner on this board. Independently review the methadone PI.",
    };
  }
  return {
    tone: "warn",
    title: "Methadone QT watch",
    body: "Methadone label: QT prolongation, arrhythmia. Teaching cadence is baseline, after large dose changes, and when a QT partner lands. Not a standing ECG order from FirstPass.",
    consider: "Open the PI. Bedside tab has Bazett / Fridericia if you already have a strip.",
  };
}

export function otpWanted(ids: string[]) {
  return ids.some(
    (id) =>
      HIGH_AFFINITY_SYNTHETIC_OPIOIDS.has(id) ||
      NPS_DESIGNER_BENZO_IDS.has(id) ||
      [
        "methadone",
        "buprenorphine",
        "naltrexone",
        "naloxone",
        "nalmefene",
        "lofexidine",
        "fentanyl",
        "dirty-30",
        "heroin",
        "xylazine",
        "pressed-30",
        "medetomidine",
        "seven-oh",
        "bromazolam",
      ].includes(id),
  );
}
