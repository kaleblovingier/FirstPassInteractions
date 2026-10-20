import { COMMERCE } from "@/lib/billing/commerce";
import { MULTI_YEAR_DISCOUNT, PROGRAM_TIERS, programQuote, type ProgramTier } from "@/lib/billing/programs";
import { PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";

/**
 * Copy for /for-programs: group and site licenses for teaching and care programs.
 * Tier names, prices, seat caps and features come from src/lib/billing/programs.ts;
 * change them there, not here.
 */
export const FOR_PROGRAMS_PATH = "/for-programs";
export const FOR_PROGRAMS_URL = `${SITE_URL}${FOR_PROGRAMS_PATH}`;
export const FOR_PROGRAMS_EMAIL = "FirstPassInteractions@gmail.com";
export const FOR_PROGRAMS_SUBJECT = "FirstPass group license inquiry";
export const FOR_PROGRAMS_MAILTO = `mailto:${FOR_PROGRAMS_EMAIL}?subject=${encodeURIComponent(FOR_PROGRAMS_SUBJECT)}`;
/** Privacy, security and validation details live on their own page. */
export const FOR_PROGRAMS_TRUST_PATH = "/trust";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const USD_CENTS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "$2,400". Whole dollars; the same string on the server and in the browser. */
export function formatUsd(n: number): string {
  return USD.format(n);
}

/** "$24.00". */
export function formatUsdCents(n: number): string {
  return USD_CENTS.format(n);
}

const LOWEST_ANNUAL = Math.min(...PROGRAM_TIERS.map((t) => t.annual));

export const FOR_PROGRAMS_TITLE = "Group and site licenses for programs, billed yearly | FirstPass";
export const FOR_PROGRAMS_DESCRIPTION = `Group and site licenses to FirstPass for pharmacy schools, pharmacy-tech programs, ketamine clinics, MAT and OTP programs, and harm-reduction groups. Annual pricing from ${formatUsd(LOWEST_ANNUAL)} a year, with invoice and purchase order. ${PAIR_DISCLAIMER}`;
export const FOR_PROGRAMS_H1 = "FirstPass for programs";
export const FOR_PROGRAMS_INTRO =
  "FirstPass shows what FDA drug labels say about taking two drugs together, with the label's own wording and a DailyMed link. Programs can set up a group or site license so a whole class, team or clinic works from the same reference.";
export const FOR_PROGRAMS_USERS =
  "FirstPass is for licensed healthcare professionals and for students in health-professions programs working under faculty or preceptor supervision.";

export const FOR_PROGRAMS_AUDIENCES: { name: string; use: string }[] = [
  { name: "Pharmacy schools", use: "Pharmacology and therapeutics courses that teach students to read interaction sections of the Prescribing Information." },
  { name: "Pharmacy-tech programs", use: "Community college and online programs training techs to recognize label-named interactions." },
  { name: "Ketamine clinics", use: "Staff training on what labels say about common co-prescribed medicines." },
  { name: "MAT and OTP programs", use: "Opioid treatment and office-based buprenorphine teams learning the label wording on common co-prescribed drugs." },
  { name: "Harm-reduction groups", use: "Outreach and education staff who want plain-language label wording with a source link." },
];

/** Choices for "Program type" on the inquiry form. */
export const PROGRAM_TYPES = [...FOR_PROGRAMS_AUDIENCES.map((a) => a.name), "Other"] as const;

export const FOR_PROGRAMS_INCLUDES: string[] = [
  "One program key for every learner or staff member in the program",
  "Every Founding tool: host factors, the enzyme atlas, metabolite maps, the full report and export",
  "The full desk, every pair page and every drug page",
  "Label quotes checked against current DailyMed labels",
  `Questions go to ${FOR_PROGRAMS_EMAIL}`,
];

export const FOR_PROGRAMS_COMPARISON = `One person can still buy Founding for ${formatUsd(COMMERCE.founding)} once. A program buys one key for everyone, renewed each year, paid by invoice or purchase order.`;

export const FOR_PROGRAMS_KEY_STEPS: string[] = [
  "The program lead gets one program key once the order is in place.",
  "Share it with your learners or staff the way you already share course materials.",
  "Each person opens the desk, goes to Plans and pastes the key under Redeem.",
  "The key works through the end month printed on it. Renew and we send next year's key.",
  "There are no accounts for learners, and we keep nothing about the learners who use the key. We do keep the name and email of the person who buys it, so we can send the key and resend it if it's lost.",
];

export const FOR_PROGRAMS_FAQ: { q: string; a: string; link?: { href: string; label: string } }[] = [
  {
    q: "Can we pay by invoice or purchase order?",
    a: "Yes. We send an invoice to your program and accept purchase orders. Each year's renewal works the same way.",
  },
  { q: "Can you send a W-9?", a: "Yes, on request." },
  {
    q: "Does anyone enter patient information?",
    a: "No. FirstPass has no patient fields and no accounts, so there is nowhere to enter patient information. We never take patient information (no PHI).",
  },
  {
    q: "What do we need to install?",
    a: "Nothing. FirstPass runs in any modern browser on a laptop, tablet or phone.",
  },
  {
    q: "Is there an accessibility conformance report?",
    a: "Yes. We send an accessibility conformance report (VPAT) on request.",
  },
  {
    q: "How are seats counted?",
    a: "On trust. A seat is a person you expect to use the key. There are no accounts to count, so we go by your number.",
  },
  {
    q: "What happens when the year ends?",
    a: "The key stops working after its end month. Renew and we send a new key for the next year.",
  },
  {
    q: "Is FirstPass a clinical tool?",
    a: "No. It is an educational reference. It is not FDA-cleared, and the Prescribing Information governs.",
  },
  {
    q: "Where are the privacy, security and validation details?",
    a: "They are on one page.",
    link: { href: FOR_PROGRAMS_TRUST_PATH, label: "Read the trust page" },
  },
];

export const FOR_PROGRAMS_CTA = "Email us about a group license";
export const FOR_PROGRAMS_ESTIMATE_NOTE = "Estimate. We confirm every quote in writing.";

/* ---------------- the seat estimator ---------------- */

export function seatsLabel(tier: ProgramTier): string {
  return tier.seats === null ? "Unlimited at one organization" : `Up to ${tier.seats} people`;
}

export function yearsLabel(years: 1 | 2 | 3): string {
  return years === 1 ? "1 year" : `${years} years`;
}

/** "10% off" for a multi-year term, or "" for one year. */
export function discountLabel(years: 1 | 2 | 3): string {
  const d = MULTI_YEAR_DISCOUNT[years] ?? 0;
  return d > 0 ? `${Math.round(d * 100)}% off` : "";
}

export const MAX_SEATS = 100_000;
/** A typical class year; the estimator opens on it. */
export const DEFAULT_ESTIMATE_SEATS = 60;

/** Seat count typed into the estimator, or null when it isn't a whole number from 1 to 100,000. */
export function parseSeats(raw: string): number | null {
  const clean = raw.replace(/[,\s]/g, "");
  if (!/^\d+$/.test(clean)) return null;
  const n = Number(clean);
  return n >= 1 && n <= MAX_SEATS ? n : null;
}

export type ProgramEstimate = ReturnType<typeof programQuote> & {
  /** Founding once per person, when that costs less than one year of the program tier. */
  foundingTotal: number | null;
};

export function programEstimate(seats: number, years: 1 | 2 | 3): ProgramEstimate {
  const quote = programQuote(seats, years);
  const founding = quote.seats * COMMERCE.founding;
  return { ...quote, foundingTotal: founding < quote.perYear ? founding : null };
}

/** Plain-text lines for an estimate: the page, the operator email and the mailto fallback all use these. */
export function estimateLines(e: ReturnType<typeof programQuote>): string[] {
  const off = discountLabel(e.years);
  return [
    `Tier: ${e.tier.name} (${seatsLabel(e.tier).toLowerCase()})`,
    `Total for ${yearsLabel(e.years)}: ${formatUsd(e.total)}${off ? ` (${off})` : ""}`,
    `Per year: ${formatUsd(e.perYear)}`,
    `Per seat per year: ${formatUsdCents(e.perSeatPerYear)}`,
  ];
}

/* ---------------- structured data ---------------- */

/** JSON-LD for the program license. Identity only: no prices or offers. */
export function forProgramsJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "FirstPass program license",
    serviceType: "Group and site licenses",
    description:
      "Annual group and site licenses to FirstPass, an educational drug-interaction reference for licensed healthcare professionals and supervised health-professions students.",
    url: FOR_PROGRAMS_URL,
    provider: { "@type": "Organization", name: "FirstPass", url: FOR_PROGRAMS_URL.replace(/\/for-programs$/, "/") },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Program tiers",
      itemListElement: PROGRAM_TIERS.map((t) => ({ "@type": "Offer", name: `${t.name} license`, description: `${seatsLabel(t)}. ${t.tagline}` })),
    },
  };
}
