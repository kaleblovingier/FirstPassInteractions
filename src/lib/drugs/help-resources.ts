/**
 * Addiction / crisis resources, US-focused.
 *
 * Privacy contract: the location a person types is parsed in the browser and only
 * ever leaves the device inside a link they tap (it goes to that site's search).
 * It is never persisted and never sent to this app's server.
 *
 * Every number below is a national, public line and was checked against the
 * operator's own page (SAMHSA, 988 Lifeline, Never Use Alone, Poison Help).
 * Numbers and hours change; the UI says so and points at the official page.
 */

export type LocationKind = "none" | "zip" | "place" | "invalid";

export interface ParsedLocation {
  kind: LocationKind;
  /** Cleaned text, safe to show and to put in a URL after encoding. */
  query: string;
  /** Five-digit ZIP when kind === "zip". */
  zip?: string;
}

const MAX_LOCATION_LEN = 60;

/** Accepts `98101`, `98101-1234`, `Seattle, WA`, `El Paso TX`. Rejects everything else. */
export function parseLocation(raw: string): ParsedLocation {
  const cleaned = raw
    .replace(/[^A-Za-z0-9 ,.'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LOCATION_LEN)
    .trim();
  if (!cleaned) return { kind: "none", query: "" };
  const zip = /^(\d{5})(?:-\d{4})?$/.exec(cleaned);
  if (zip) return { kind: "zip", query: zip[1], zip: zip[1] };
  // A place needs letters; bare digits that are not a ZIP are a typo, not a place.
  if (/[A-Za-z]{2}/.test(cleaned)) return { kind: "place", query: cleaned };
  return { kind: "invalid", query: cleaned };
}

export interface PhoneLine {
  id: string;
  name: string;
  /** What to say out loud / show on the button, e.g. "1-800-662-4357". */
  display: string;
  /** `tel:` href. */
  tel: string;
  hours: string;
  blurb: string;
  /** Official page that holds the current details. Omitted where there is none (911). */
  source?: string;
  sourceLabel?: string;
  /** Tone: emergency lines render with the danger color. */
  urgent?: boolean;
}

export const EMERGENCY_LINE: PhoneLine = {
  id: "911",
  name: "Emergency services",
  display: "911",
  tel: "tel:911",
  hours: "24/7",
  blurb:
    "Someone is unresponsive, barely breathing, blue or gray in the lips, having a seizure, or may be overdosing. Call first. Give naloxone if you have it.",
  urgent: true,
};

export const NATIONAL_LINES: readonly PhoneLine[] = [
  {
    id: "988",
    name: "988 Suicide & Crisis Lifeline",
    display: "988",
    tel: "tel:988",
    hours: "24/7 · call or text · chat online",
    blurb:
      "Free and confidential support for suicidal thoughts, emotional distress, or a substance use crisis. Press 2 for Spanish.",
    source: "https://988lifeline.org/",
    sourceLabel: "988lifeline.org",
  },
  {
    id: "samhsa",
    name: "SAMHSA National Helpline",
    display: "1-800-662-4357",
    tel: "tel:18006624357",
    hours: "24/7, 365 days · English and Spanish · TTY 1-800-487-4889",
    blurb:
      "Free, confidential treatment referral and information for substance use and mental health. You may be asked for a ZIP code to find local options. It is not a crisis line.",
    source: "https://www.samhsa.gov/find-help/helplines/national-helpline",
    sourceLabel: "samhsa.gov helpline",
  },
  {
    id: "poison",
    name: "Poison Help (Poison Control)",
    display: "1-800-222-1222",
    tel: "tel:18002221222",
    hours: "24/7",
    blurb:
      "Free expert advice after a possible poisoning, a swallowed dose, or a mix of substances. Do not wait for symptoms. If the person is unresponsive, call 911 instead.",
    source: "https://www.poisonhelp.org/",
    sourceLabel: "poisonhelp.org",
  },
  {
    id: "nua",
    name: "Never Use Alone",
    display: "1-800-484-3731",
    tel: "tel:18004843731",
    hours: "24/7",
    blurb:
      "Call before you use. A peer stays on the line, and if you stop responding they send emergency help to your location. Not a treatment line.",
    source: "https://neverusealone.com/",
    sourceLabel: "neverusealone.com",
  },
];

export interface HelpLink {
  id: string;
  group: "treatment" | "text" | "meetings" | "naloxone" | "local";
  title: string;
  blurb: string;
  href: string;
  /** Button text. */
  action: string;
  /** True when the link opens already searching the person's location. */
  prefilled: boolean;
}

/** Search this on the FindTreatment.gov locator (SAMHSA). Accepts a ZIP or "City, ST". */
export function findTreatmentUrl(loc: ParsedLocation): string {
  if (loc.kind !== "zip" && loc.kind !== "place") return "https://findtreatment.gov/locator";
  return `https://findtreatment.gov/locator?sAddr=${encodeURIComponent(loc.query)}`;
}

/** `sms:` link that pre-fills the ZIP for SAMHSA's HELP4U text line. ZIP only. */
export function help4uSmsHref(zip: string): string {
  return `sms:435748?&body=${encodeURIComponent(zip)}`;
}

/**
 * Local-finding links. Only FindTreatment and HELP4U can use the typed location;
 * the rest are the official finders for each kind of help and say so (`prefilled`).
 */
export function localLinks(loc: ParsedLocation): HelpLink[] {
  const where =
    loc.kind === "zip" || loc.kind === "place" ? ` near ${loc.query}` : "";
  const links: HelpLink[] = [
    {
      id: "findtreatment",
      group: "treatment",
      title: "Treatment programs" + where,
      blurb:
        "SAMHSA's FindTreatment.gov lists licensed substance use and mental health facilities, with filters for payment, medication (buprenorphine, methadone, naltrexone), and telehealth.",
      href: findTreatmentUrl(loc),
      action: "Open FindTreatment.gov",
      prefilled: loc.kind === "zip" || loc.kind === "place",
    },
  ];
  if (loc.kind === "zip" && loc.zip) {
    links.push({
      id: "help4u",
      group: "text",
      title: `Text ${loc.zip} to 435748`,
      blurb:
        "SAMHSA's HELP4U text line replies with local treatment information. English only. Message and data rates may apply. Reply STOP to cancel.",
      href: help4uSmsHref(loc.zip),
      action: "Open text message",
      prefilled: true,
    });
  }
  links.push(
    {
      id: "otp",
      group: "treatment",
      title: "Methadone and buprenorphine clinics",
      blurb:
        "SAMHSA's directory of certified opioid treatment programs. Pick your state to see clinics, phone numbers, and which medications each dispenses.",
      href: "https://dpt2.samhsa.gov/treatment/directory.aspx",
      action: "Open OTP directory",
      prefilled: false,
    },
    {
      id: "211",
      group: "local",
      title: "Local help with food, housing, and rides",
      blurb:
        "Dial 211 (or search by ZIP on 211.org) for local referrals: shelters, transportation to appointments, and programs that take no insurance.",
      href: "tel:211",
      action: "Call 211",
      prefilled: false,
    },
    {
      id: "naloxone",
      group: "naloxone",
      title: "Free naloxone (Narcan)",
      blurb:
        "Naloxone nasal spray is sold over the counter at most pharmacies. NEXT Distro mails it free in many states, and many harm reduction programs hand it out.",
      href: "https://nextdistro.org/",
      action: "Open NEXT Distro",
      prefilled: false,
    },
    {
      id: "harm-reduction",
      group: "local",
      title: "Harm reduction programs",
      blurb:
        "Syringe services, drug checking, safer-use supplies, and non-judgmental support without a requirement to stop using.",
      href: "https://harmreduction.org/resource-center/harm-reduction-near-you/",
      action: "Find a program",
      prefilled: false,
    },
    {
      id: "aa",
      group: "meetings",
      title: "Alcoholics Anonymous",
      blurb: "Find in-person and online meetings by location.",
      href: "https://www.aa.org/find-aa",
      action: "Find AA meetings",
      prefilled: false,
    },
    {
      id: "na",
      group: "meetings",
      title: "Narcotics Anonymous",
      blurb: "Find in-person and online meetings by location.",
      href: "https://www.na.org/meetingsearch/",
      action: "Find NA meetings",
      prefilled: false,
    },
    {
      id: "smart",
      group: "meetings",
      title: "SMART Recovery",
      blurb:
        "Science-based, non-12-step groups. Many meet online, and they welcome people on medications for addiction.",
      href: "https://meetings.smartrecovery.org/meetings/",
      action: "Find SMART meetings",
      prefilled: false,
    },
    {
      id: "alanon",
      group: "meetings",
      title: "Al-Anon (for family and friends)",
      blurb: "Support for people affected by someone else's drinking or drug use.",
      href: "https://al-anon.org/al-anon-meetings/find-an-al-anon-meeting/",
      action: "Find Al-Anon meetings",
      prefilled: false,
    },
  );
  return links;
}

export const OUTSIDE_US = {
  title: "Outside the United States",
  blurb:
    "Call your local emergency number first in an emergency. For a directory of free, verified helplines by country, use Find a Helpline.",
  href: "https://findahelpline.com/",
  action: "Open Find a Helpline",
} as const;

/** Plain-text handout a clinician can paste into a visit summary. */
export function handoutText(loc: ParsedLocation): string {
  const lines: string[] = [
    "Help is available — free and confidential",
    "",
    "In an emergency (not breathing, unresponsive, possible overdose): call 911. Give naloxone (Narcan) if you have it.",
    "",
  ];
  for (const l of NATIONAL_LINES) {
    lines.push(`${l.name}: ${l.display} (${l.hours.split(" · ")[0]})`);
  }
  lines.push("");
  if (loc.kind === "zip" || loc.kind === "place") {
    lines.push(`Treatment near ${loc.query}: ${findTreatmentUrl(loc)}`);
  } else {
    lines.push(`Find treatment: ${findTreatmentUrl(loc)}`);
  }
  if (loc.kind === "zip" && loc.zip) {
    lines.push(`Text your ZIP (${loc.zip}) to 435748 for local treatment info.`);
  }
  lines.push(
    "Local referrals: dial 211",
    "",
    "Numbers and hours can change; check the organization's own site. This handout is general information, not medical advice.",
  );
  return lines.join("\n");
}
