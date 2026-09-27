/**
 * Harm-reduction teaching board.
 * PsychonautWiki / TripSit / SAMHSA / CDC paraphrases — not a protocol, not a milligram.
 * This desk does not pick a dose, a route, or a cooking method.
 */

import { DRUG_BY_ID } from "./catalog";
import type { Drug } from "./types";
import {
  PW_PRINCIPLES,
  PW_STATIC_RESOURCES,
  wikiResourcesFor,
} from "./psychonaut";

export type HrTone = "ok" | "warn" | "danger";

export interface HrCard {
  id: string;
  title: string;
  tone: HrTone;
  kicker: string;
  body: string;
  watch: string;
  source: string;
}

export interface StripCard {
  id: string;
  name: string;
  catches: string;
  misses: string;
}

export interface KitItem {
  id: string;
  label: string;
  hint: string;
}

export interface ResponseStep {
  n: number;
  title: string;
  body: string;
}

const STREET = new Set([
  "fentanyl",
  "dirty-30",
  "heroin",
  "carfentanil",
  "isotonitazene",
  "protonitazene",
  "metonitazene",
  "etonitazene",
  "xylazine",
  "medetomidine",
  "seven-oh",
  "bromazolam",
  "pressed-30",
  "kratom",
]);

const NITAZENE = new Set(["isotonitazene", "protonitazene", "metonitazene", "etonitazene", "carfentanil"]);
const ALPHA2 = new Set(["xylazine", "medetomidine", "clonidine", "lofexidine", "dexmedetomidine"]);
const OPIOIDISH = new Set([
  "fentanyl",
  "dirty-30",
  "heroin",
  "oxycodone",
  "hydrocodone",
  "morphine",
  "hydromorphone",
  "oxymorphone",
  "methadone",
  "codeine",
  "tramadol",
  "tapentadol",
  "meperidine",
  "loperamide",
  "seven-oh",
  "buprenorphine",
  "kratom",
  ...NITAZENE,
]);

function has(d: Drug, flag: Drug["pd"][number]) {
  return d.pd.includes(flag);
}

function anyOpioid(ids: string[]) {
  return ids.some((id) => {
    const d = DRUG_BY_ID[id];
    return OPIOIDISH.has(id) || (d && (has(d, "opioid") || has(d, "partial-opioid")));
  });
}

function anyAlpha2(ids: string[]) {
  return ids.some((id) => ALPHA2.has(id) || DRUG_BY_ID[id]?.pd.includes("alpha2-agonist"));
}

function anyGhb(ids: string[]) {
  return ids.some((id) => DRUG_BY_ID[id]?.pd.includes("ghb") || id === "sodium-oxybate");
}

function anyMdma(ids: string[]) {
  return ids.some((id) => id === "mdma" || id === "mda" || id === "methylone");
}

function anyDissoc(ids: string[]) {
  return ids.some((id) => DRUG_BY_ID[id]?.pd.includes("dissociative"));
}

function anyPsychedelic(ids: string[]) {
  return ids.some((id) => DRUG_BY_ID[id]?.pd.includes("psychedelic"));
}

function anyStim(ids: string[]) {
  return ids.some((id) => DRUG_BY_ID[id]?.pd.includes("stimulant"));
}

function anyBenzo(ids: string[]) {
  return ids.some((id) => DRUG_BY_ID[id]?.pd.includes("benzo-zdrug") || id === "bromazolam");
}

function anyAlcohol(ids: string[]) {
  return ids.some((id) => DRUG_BY_ID[id]?.pd.includes("alcohol"));
}

function anyNbome(ids: string[]) {
  return ids.some((id) => id === "twentyfive-i" || id.includes("nbome"));
}

function downerCount(ids: string[]) {
  let n = 0;
  if (anyOpioid(ids)) n += 1;
  if (anyBenzo(ids)) n += 1;
  if (anyAlcohol(ids)) n += 1;
  if (anyGhb(ids)) n += 1;
  if (anyAlpha2(ids)) n += 1;
  if (ids.some((id) => id === "gabapentin" || id === "pregabalin")) n += 1;
  return n;
}

export function harmWanted(ids: string[]) {
  if (!ids.length) return false;
  return ids.some((id) => {
    if (STREET.has(id) || OPIOIDISH.has(id) || ALPHA2.has(id)) return true;
    const d = DRUG_BY_ID[id];
    if (!d) return false;
    return d.pd.some((p) =>
      [
        "opioid",
        "partial-opioid",
        "opioid-antagonist",
        "cns-depressant",
        "stimulant",
        "dissociative",
        "psychedelic",
        "ghb",
        "alcohol",
        "cannabinoid",
        "benzo-zdrug",
      ].includes(p),
    );
  });
}

export function harmOnDesk(ids: string[]): HrCard[] {
  const out: HrCard[] = [];
  if (!harmWanted(ids)) return out;

  out.push({
    id: "never-alone",
    title: "Do not use alone",
    tone: "danger",
    kicker: "Stay / witness",
    body: "A person who is not breathing cannot naloxone themselves. Someone sober enough to call 911, put them on their side, and stay is the intervention that actually lands. Never Use Alone (US) is a phone that stays on the line.",
    watch: "If they must use alone, a live person on the phone is still a person. This desk is not a sitter.",
    source: "SAMHSA overdose education. PsychonautWiki Responsible drug use. Never Use Alone.",
  });

  if (downerCount(ids) >= 2) {
    out.push({
      id: "stack-downers",
      title: "Stacked depressants — one airway",
      tone: "danger",
      kicker: "TripSit / PsychonautWiki dangerous combinations",
      body: "Opioids, benzodiazepines, alcohol, GHB, gabapentinoids, and α2 agonists are one respiratory tree, not separate prescriptions. Deaths cluster on the mix, not the solo milligram. A stimulant on top only masks the apnea until it wears off.",
      watch: "Recovery position if they are breathing and unresponsive. Naloxone for the opioid. Extra Narcan does not reverse the benzo, the GHB, or the xylazine.",
      source: "PsychonautWiki Dangerous combinations (TripSit chart). FDA opioid–benzo boxed warning.",
    });
  }

  if (anyOpioid(ids)) {
    const nitazene = ids.some((id) => NITAZENE.has(id));
    out.push({
      id: "naloxone-first",
      title: nitazene ? "Nitazene / carfentanil — naloxone, then a long watch" : "Naloxone for the μ-agonist",
      tone: "danger",
      kicker: "Overdose response",
      body: nitazene
        ? "Nitazenes and carfentanil can outlast a first naloxone dose. Give naloxone, support ventilation, and stay. Re-narcotization is the rule, not a surprise. Fentanyl immunoassay strips often miss nitazenes."
        : "Naloxone displaces the μ-agonist. Show them the device they will actually leave with — nasal, IM, or both. A second dose if they are still not breathing. Stay; fentanyl can re-narcotize as naloxone wears off. PsychonautWiki / CDC: someone else has to give it.",
      watch: "Naloxone will not reverse xylazine, medetomidine, a benzo, GHB, or alcohol. The opioid still gets naloxone. This is counseling, not a kit protocol.",
      source: "CDC / SAMHSA naloxone. FDA Narcan / Kloxxado / Opvee labels.",
    });
  }

  if (anyOpioid(ids) && anyAlpha2(ids)) {
    out.push({
      id: "tranq-residual",
      title: "α2 residual after naloxone",
      tone: "danger",
      kicker: "Xylazine / medetomidine",
      body: "Naloxone restores some breaths. They stay down, bradycardic, and will not sit up. That is the α2 — veterinary xylazine or medetomidine cut into the fold. Extra naloxone will not reverse it. Airway and time.",
      watch: "Xylazine wounds are necrotic and slow. Not just an abscess. Do not ignore a blackened site. This desk is not a wound protocol.",
      source: "FDA 2022 xylazine communication. PsychonautWiki / street-supply teaching.",
    });
  } else if (anyAlpha2(ids)) {
    out.push({
      id: "alpha2-alone",
      title: "α2 agonist — naloxone will not reverse this",
      tone: "warn",
      kicker: "Xylazine / medetomidine / lofexidine",
      body: "Sedation and airway loss are independent of the μ receptor. Naloxone still belongs on the tray because the street supply is usually cut with an opioid.",
      watch: "Medetomidine is showing up in folds the way xylazine did. Same family, same 'naloxone did half the job' picture.",
      source: "FDA xylazine. Lucemyra / clonidine labels for the clinic cousins.",
    });
  }

  if (anyGhb(ids)) {
    out.push({
      id: "ghb-steep",
      title: "GHB — steep curve, short window",
      tone: "danger",
      kicker: "PsychonautWiki GHB",
      body: "A small extra volume is the difference between sleep and apnea. Onset is fast; compulsive redose is the trap — short duration plus rebound anxiety. Alcohol and benzos are labeled contraindicated with sodium oxybate — coma, not a hangover. GBL and 1,4-BD convert to the same molecule.",
      watch: "Recovery position. Do not leave them on their back. There is no naloxone for GHB. Airway and time. This desk does not pick a milliliter.",
      source: "Xyrem / Lumryz labels. PsychonautWiki GHB / Dangerous combinations.",
    });
  }

  if (anyMdma(ids)) {
    out.push({
      id: "mdma-heat",
      title: "MDMA — heat, water, and the pill you did not test",
      tone: "warn",
      kicker: "PsychonautWiki / festival safety",
      body: "Hyperthermia and hyponatremia kill more people on this molecule than a 'usual' milligram. Sip to thirst, do not chug. Cool the room, not ice-water shock. Pressed 'Mitsubishi' pills have carried PMA/PMMA — delayed onset, then a deadly redose. Test the solid. Crystal is not a guarantee. PsychonautWiki: frequent redose and stacked nights are the toxicity pattern.",
      watch: "MAOIs and some SSRIs are a serotonin-toxicity row on this desk. Do not redose because 'nothing is happening yet.' This desk does not pick a milligram.",
      source: "PsychonautWiki MDMA / Responsible drug use. DanceSafe / reagent teaching. Hunter tab if they look serotonergic.",
    });
  }

  if (anyDissoc(ids)) {
    out.push({
      id: "dissoc-swim",
      title: "Dissociative — do not swim, do not mix the airway",
      tone: "warn",
      kicker: "PsychonautWiki dissociatives",
      body: "Ketamine, PCP, and DXM disconnect motor control from the story in the head. Drownings and trauma are the unromantic deaths. Alcohol or a benzo on the same night is stacked vomiting plus a lost airway — PsychonautWiki flags that mix as dangerous.",
      watch: "Chronic ketamine has a bladder story (cystitis) that is not a CYP row. A k-hole is not a milligram from this desk. Set, setting, a sitter.",
      source: "PsychonautWiki Responsible drug use ('Do not swim'). Ketamine / esketamine labels for sedation.",
    });
  }

  if (anyPsychedelic(ids) || anyNbome(ids)) {
    out.push({
      id: "set-setting",
      title: anyNbome(ids)
        ? "NBOMe sold as LSD — vasoconstriction, not a gentle blotter"
        : "Set and setting",
      tone: anyNbome(ids) ? "danger" : "warn",
      kicker: "PsychonautWiki hallucinogens",
      body: anyNbome(ids)
        ? "25I-NBOMe on blotter is sold as LSD. Ehrlich reagent often stays quiet on NBOMe and lights on LSD. NBOMe has killed people at blotter doses LSD usually does not. Vasoconstriction, seizure, agitation — not a CYP story."
        : "A positive mindset gets louder; a bad one does too. Familiar room, no one to be responsible for, a sober sitter, an exit that is not more drug. Lithium next to a classic psychedelic is a seizure signal on this desk.",
      watch: "This desk does not abort a trip and does not pick a benzo milligram. Open Hunter if they look serotonergic.",
      source: "PsychonautWiki Set and setting / List of substances to avoid. Desk lithium × psychedelic row.",
    });
  }

  if (anyStim(ids) && !anyMdma(ids)) {
    out.push({
      id: "overamp",
      title: "Stimulant overamping",
      tone: "warn",
      kicker: "PsychonautWiki stimulants",
      body: "Agitation, rigidity, hyperthermia, paranoia. Cooling, a quiet room, do not restrain a rhabdomyolysis into being. A benzo in an ED is a different row than a street mix. Cocaine plus ethanol is cocaethylene — longer cardiotoxin, not a come-down.",
      watch: "Stimulant plus opioid is a speedball: the stimulant masks apnea until it wears off. Naloxone still, then the crash.",
      source: "PsychonautWiki Dangerous combinations. Desk cocaethylene / speedball rows.",
    });
  }

  if (anyBenzo(ids) && ids.includes("bromazolam")) {
    out.push({
      id: "street-benzo",
      title: "Street benzo — potency is not the pill stamp",
      tone: "danger",
      kicker: "Designer benzodiazepine",
      body: "Bromazolam in a pressed bar is not pharmaceutical alprazolam. Dose and duration wander. Flumazenil is not a street-overdose antidote — seizures in dependent people. Airway first.",
      watch: "Benzo withdrawal is a medical emergency (seizure). Do not 'detox' a dependent person without a plan you own. This desk is not that plan.",
      source: "PsychonautWiki benzodiazepines. Flumazenil labels (Reversal tab).",
    });
  }

  out.push({
    id: "test-supply",
    title: "Test the supply — a negative is not proof of safety",
    tone: "warn",
    kicker: "Reagents / immunoassay strips",
    body: "Fentanyl strips catch many illicit fentanyls and miss nitazenes, xylazine, and most benzos. Xylazine strips exist and still miss medetomidine. Reagents (Marquis, Ehrlich) name a chemical class, not a milligram and not a hidden fentanyl. PsychonautWiki: chemically test; do not eyeball.",
    watch: "You can always take less of an unknown fold; you cannot take it back. This desk does not pick the milligram and does not read a strip for you.",
    source: "PsychonautWiki Reagent testing kits / Responsible drug use. CDC fentanyl test-strip guidance.",
  });

  return out;
}

export function stripsFor(ids: string[]): StripCard[] {
  const out: StripCard[] = [
    {
      id: "fts",
      name: "Fentanyl immunoassay strip",
      catches: "Many illicit fentanyls in a dilute sample.",
      misses: "Nitazenes, carfentanil often, xylazine, benzos, stimulants. A negative is not 'clean.'",
    },
    {
      id: "xyl-strip",
      name: "Xylazine strip",
      catches: "Xylazine in some folds when the kit is built for it.",
      misses: "Medetomidine and other α2s. Still give naloxone — the opioid is usually there.",
    },
    {
      id: "benzo-strip",
      name: "Benzodiazepine strip",
      catches: "Some 1,4-benzodiazepines.",
      misses: "Designer benzos (bromazolam and friends) are kit-dependent. Flumazenil is still not the field move.",
    },
    {
      id: "reagent",
      name: "Reagent (Marquis / Mecke / Mandelin / Ehrlich / Liebermann)",
      catches: "Class clues — Marquis often lights on MDMA and stays quiet on PMA; Mandelin is the PMA tell; Ehrlich lights on LSD / tryptamines and stays quiet on many NBOMes; Liebermann helps MDMA vs meth vs MDA.",
      misses: "Does not measure purity or dose. Dark colors override weaker ones in the same pill. A positive is not 'safe.' Does not rule out fentanyl. Color charts lie in bad light. Use more than one reagent on a new scrap.",
    },
  ];
  if (
    !anyOpioid(ids) &&
    !ids.some((id) => STREET.has(id)) &&
    !anyMdma(ids) &&
    !anyPsychedelic(ids) &&
    !anyNbome(ids) &&
    !anyAlpha2(ids)
  ) {
    return out.slice(0, 1);
  }
  if (anyNbome(ids) || ids.includes("lsd")) return out;
  if (anyMdma(ids)) return out.filter((s) => s.id !== "benzo-strip");
  if (anyAlpha2(ids) || anyOpioid(ids)) return out.filter((s) => s.id !== "reagent" || anyMdma(ids));
  return out;
}

export function kitFor(ids: string[]): KitItem[] {
  const items: KitItem[] = [
    { id: "sitter", label: "Someone stays", hint: "A live person, not a text that goes unread." },
    { id: "phone", label: "Phone + 911", hint: "Good Samaritan laws in most US states cover the caller. Stay." },
    { id: "position", label: "Recovery position", hint: "Unresponsive but breathing: on their side, airway open, not on their back." },
  ];
  if (anyOpioid(ids) || ids.includes("naloxone") || ids.includes("nalmefene") || ids.includes("methadone") || ids.includes("buprenorphine")) {
    items.unshift({
      id: "naloxone",
      label: "Naloxone they can use",
      hint: "The device in the bag, not the one in a drawer at home. Second dose if still apneic.",
    });
  }
  if (anyOpioid(ids) || anyMdma(ids) || ids.some((id) => STREET.has(id))) {
    items.push({
      id: "strips",
      label: "Test strips if you have them",
      hint: "A tool, not a certificate of purity. Nitazenes miss fentanyl strips.",
    });
  }
  items.push({
    id: "ssp",
    label: "Sterile works / SSP",
    hint: "Do not share. HCV is 60–80% among people who inject. Needle exchange exists. This desk is not a cooking guide.",
  });
  if (anyAlpha2(ids)) {
    items.push({
      id: "wounds",
      label: "Xylazine wounds get care",
      hint: "Necrotic, slow, not 'just an abscess.' Do not wait on a black site.",
    });
  }
  if (anyMdma(ids) || anyStim(ids)) {
    items.push({
      id: "cool",
      label: "Cool / sip, do not chug",
      hint: "Heat stroke and hyponatremia are different deaths. Water is not a contest.",
    });
  }
  return items;
}

export function responseSteps(ids: string[]): ResponseStep[] {
  const opioid = anyOpioid(ids) || ids.includes("naloxone") || ids.includes("nalmefene");
  const alpha = anyAlpha2(ids);
  const ghb = anyGhb(ids);
  return [
    {
      n: 1,
      title: "Stimulate",
      body: "Shout, sternum rub. If they respond and stay awake, still do not leave them.",
    },
    {
      n: 2,
      title: "Call 911",
      body: "Say they are not breathing. Good Samaritan protections are the usual US rule for the caller. Stay on the line.",
    },
    {
      n: 3,
      title: "Airway",
      body: "Head tilt, look listen feel. Rescue breaths if you know them. Do not put a still person on their back and walk away.",
    },
    {
      n: 4,
      title: opioid ? "Naloxone" : "Naloxone if opioids are possible",
      body: opioid
        ? alpha
          ? "Give naloxone. Expect partial wake. The α2 residual is not extra Narcan. Support ventilation."
          : "Give naloxone. Repeat if still apneic. Fentanyl and nitazenes re-narcotize — stay."
        : "Unknown fold: naloxone is still reasonable. It will not reverse GHB, a benzo, alcohol, or a stimulant, and it will not hurt those.",
    },
    {
      n: 5,
      title: "Recovery position",
      body: ghb
        ? "If they are breathing and unresponsive, on their side so vomit drains — mouth down, chin up, not on their back. PsychonautWiki recovery position. GHB has no reversal agent. Time and airway."
        : "Breathing and unresponsive: on their side, mouth down so vomit drains, chin up. PsychonautWiki / first-aid recovery position. Do not leave them on their back.",
    },
    {
      n: 6,
      title: "Stay",
      body: "Re-narcotization, α2 residual, GHB nadir, and stimulant crash all happen after the first 'they're fine.' This is not a field protocol and not a milligram.",
    },
  ];
}

export const HR_PRINCIPLES = PW_PRINCIPLES;

export function hrResourcesFor(ids: string[]) {
  const molecule = wikiResourcesFor(ids);
  const rest = [
    {
      name: "Never Use Alone (US)",
      href: "https://neverusealone.com/",
      why: "800-484-3731 — an operator stays on the line while you use.",
    },
    {
      name: "SAMHSA national helpline",
      href: "https://www.samhsa.gov/find-help/national-helpline",
      why: "1-800-662-HELP (4357). Treatment referral, 24/7.",
    },
    {
      name: "CDC overdose response",
      href: "https://www.cdc.gov/stop-overdose/caring/naloxone.html",
      why: "Naloxone, rescue breathing, stay. Not a milligram from this desk.",
    },
    {
      name: "NASEN / syringe services",
      href: "https://nasen.org/",
      why: "Find a syringe service. Do not share. This desk is not a cooking guide.",
    },
    ...PW_STATIC_RESOURCES,
  ];
  const seen = new Set<string>();
  return [...molecule, ...rest].filter((r) => {
    if (seen.has(r.href)) return false;
    seen.add(r.href);
    return true;
  });
}

export const HR_RESOURCES = hrResourcesFor([]);

export const HR_FOOTER =
  "Teaching — not a protocol, not a milligram, not a cooking guide, not a trip. Live PsychonautWiki intros are stripped of dosage and route how-to before they land. A wiki is not a Prescribing Information. Street rows are maps of the supply, not approved drugs. Independently review.";
