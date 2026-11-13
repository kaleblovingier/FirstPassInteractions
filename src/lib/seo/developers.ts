import { API_KEY_HEADER, API_LIMITS, API_TIERS, describeLimit } from "@/lib/billing/api-tiers";
import { SOFTWARE } from "@/lib/regulatory";
import { PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";

/**
 * Copy for /developers: the public JSON API at /api/cds/*, for education and teaching content.
 *
 * Limits and tiers come from src/lib/billing/api-tiers.ts (a draft); change them there, not here.
 * Rules the tests enforce (developers.test.ts): the statutory API disclaimer and the not-cleared line
 * are on the page, the EHR exclusion is stated, there are no prices, and no clearance is claimed.
 *
 * Why the EHR line matters: the non-device CDS position (regulatory.ts, CDS_CRITERIA) rests on a
 * professional reading the basis of each finding. An integration that fires patient-specific alerts
 * inside a clinical system changes that analysis, so the API is offered for teaching content only.
 */

export const DEVELOPERS_PATH = "/developers";
export const DEVELOPERS_URL = `${SITE_URL}${DEVELOPERS_PATH}`;
export const DEVELOPERS_TITLE = "FirstPass API for teaching content | FirstPass";
export const DEVELOPERS_DESCRIPTION = `A JSON API over the FirstPass interaction reference for education and teaching content: LMS courses, courseware and study apps for health-professions learners. Endpoints, keys, rate limits and error shapes. ${PAIR_DISCLAIMER}`;
export const DEVELOPERS_H1 = "FirstPass API for teaching content";

export const DEVELOPERS_EMAIL = SOFTWARE.email;
export const DEVELOPERS_SUBJECT = "FirstPass API education licensing";
export const DEVELOPERS_MAILTO = `mailto:${DEVELOPERS_EMAIL}?subject=${encodeURIComponent(DEVELOPERS_SUBJECT)}`;
export const DEVELOPERS_CTA = "Contact for education licensing";

export const DEVELOPERS_INTRO =
  "The same interaction reference the desk uses, as JSON. It is built for people who make teaching material for health-professions learners: LMS courses, courseware, question banks and study apps. Every finding carries its basis, so a learner can see why a pair was graded the way it was.";

/** The intended-use block. Keep it ahead of the endpoint list on the page. */
export const DEVELOPERS_USE = {
  title: "What the API is for",
  forLead: "For education and teaching content only.",
  forText:
    "Course pages, case studies, flashcards and study apps that teach how drug interactions are worded and graded, used by licensed healthcare professionals and by students in accredited health-professions programs.",
  notLead: "Not for clinical systems.",
  notText:
    "Do not use the API for patient-specific alerting inside an EHR, a pharmacy system, an order-entry system or any other clinical system, and do not use it to screen a real patient's medication list. It is not a drug-interaction alerting service.",
  hostText:
    "The optional host fields (age, weight, kidney function and the like) describe a teaching case. Do not send a real patient's details or any identifier. FirstPass does not take protected health information.",
} as const;

export interface DevelopersEndpoint {
  method: "GET" | "POST";
  path: string;
  summary: string;
  request?: string;
  keyed: boolean;
}

export const DEVELOPERS_BASE_URL = `${SITE_URL}/api/cds`;

export const DEVELOPERS_ENDPOINTS: readonly DevelopersEndpoint[] = [
  {
    method: "GET",
    path: "/api/cds/health",
    summary: "Service status, software version and the disclaimer every answer carries. Open: no key, no rate limit.",
    keyed: false,
  },
  {
    method: "GET",
    path: "/api/cds/search",
    summary: "Search the drug catalog by generic or brand name.",
    request: "?q=warfarin&limit=10 (limit 1 to 50, default 10)",
    keyed: true,
  },
  {
    method: "GET",
    path: "/api/cds/autocomplete",
    summary: "Typeahead for your own search box. Each suggestion carries its id, canonical name and how it matched (id, name, brand-or-alias, street-name or search); resolvedFrom names the brand, alias or street name that matched. The desk itself searches offline.",
    request: "?q=molly&limit=8 (limit 1 to 24, default 8)",
    keyed: true,
  },
  {
    method: "POST",
    path: "/api/cds/analyze",
    summary: "One teaching report for a tray: every pair, the synergy alerts by mechanism, and curated literature, as an InteractionReport. Set live to true to add quoted TripSit, OpenFDA label and PubMed rows; a source that fails is named in warnings. A street name resolves last (matchedBy street-name) and always comes with a warning, because slang can mean more than one thing. /check and /search keep their shapes; matchedBy there can now also read street-name.",
    request: '{ "substances": ["Molly", { "name": "alprazolam", "ingestionTimeHoursAgo": 12 }], "host": { ... }, "live": false } (1 to 20 substances; hours 0 to 720; host and live are optional)',
    keyed: true,
  },
  {
    method: "POST",
    path: "/api/cds/check",
    summary: "Interaction findings for a list of drugs, each with its mechanism, grade and sources.",
    request: '{ "drugs": ["clarithromycin", "simvastatin"], "host": { ... } } (1 to 20 drugs; host is optional)',
    keyed: true,
  },
  {
    method: "POST",
    path: "/api/cds/kinetics",
    summary: "Teaching pharmacokinetic modules for a list of drugs.",
    request: '{ "drugs": ["vancomycin"], "modules": ["vancomycin"], "host": { ... } } (modules is optional; omit it for all)',
    keyed: true,
  },
];

export const DEVELOPERS_AUTH: string[] = [
  "Send your key as Authorization: Bearer <key>. If your client cannot set that header, send it in the x-api-key header instead.",
  "Keys look like FP-API-E202712-XXXXXXXX-XXXXXXXX. The letter is the tier and the six digits are the last month the key works, through the end of that month (UTC).",
  "Calls without a key still work at a lower rate limit, so you can try the API before asking for a key.",
  "A key that does not verify, or has ended, gets a 401. It is never quietly treated as a call without a key.",
  "Keep the key on your server. Do not ship it in a browser bundle or a mobile app.",
];

export const DEVELOPERS_AUTH_HEADER = API_KEY_HEADER;

export interface DevelopersLimitRow {
  who: string;
  limit: string;
  fits: string;
}

export const DEVELOPERS_LIMITS: readonly DevelopersLimitRow[] = [
  { who: "No key", limit: `${describeLimit(API_LIMITS.anonymous)}, per address`, fits: "Trying the API by hand." },
  ...API_TIERS.map((t) => ({ who: `${t.name} key`, limit: `${describeLimit(API_LIMITS[t.id])}, per key`, fits: t.fits })),
];

export const DEVELOPERS_LIMITS_NOTE =
  "Limits are a sliding window. Every limited answer carries RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset and RateLimit-Policy headers, and API responses carry Cache-Control: no-store and X-Content-Type-Options: nosniff. Over the limit you get a 429 with a Retry-After header in seconds. These limits are a draft and may change before keys are issued widely.";

export const DEVELOPERS_ERRORS: { status: string; when: string }[] = [
  { status: "400", when: "The POST body is malformed JSON or exceeds the 1,000-node item budget." },
  { status: "401", when: "The key is malformed, does not verify or has ended. Carries a WWW-Authenticate header." },
  { status: "404", when: "No drug matched, or the endpoint does not exist." },
  { status: "405", when: "Wrong method for the endpoint. Carries an Allow header listing supported methods." },
  { status: "413", when: "The POST body exceeds the 10 MiB transport limit." },
  {
    status: "415",
    when: "Unsupported Media Type: when a POST request includes a Content-Type header, it must be application/json.",
  },
  { status: "422", when: "The body failed validation. invalidParams names each field." },
  { status: "429", when: "Over the rate limit. Wait the Retry-After seconds." },
  { status: "503", when: "Keys cannot be checked right now. Calls without a key still work." },
];

export const DEVELOPERS_ERROR_SHAPE = `{
  "type": "https://firstpass.app/errors/rate-limited",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Calls without an API key are limited to ${API_LIMITS.anonymous.max} per minute from one address. ...",
  "instance": "/api/cds/search",
  "timestamp": "2026-11-08T12:00:00.000Z"
}`;

export const DEVELOPERS_ERRORS_NOTE =
  "Errors are RFC 7807 problem details, sent as application/problem+json with Cache-Control: no-store and X-Content-Type-Options: nosniff.";

export const DEVELOPERS_INTEGRATION_RULES: string[] = [
  "Show each finding's basis (its mechanism and sources) next to the finding. A grade on its own is not enough.",
  "Show the disclaimer from the health endpoint wherever API output appears.",
  "A pair with no finding is not a statement that the combination is safe. Say so wherever you show an empty result.",
  "Link learners to the FDA-approved Prescribing Information. When the API and the label disagree, the label wins.",
];

export const DEVELOPERS_LICENSING =
  "Developer keys are for trying the API. Courseware, LMS and study-app publishers who want to build on it can ask for an Education key.";
