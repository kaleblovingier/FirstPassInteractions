import { SOFTWARE } from "@/lib/regulatory";
import { PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";

/**
 * Copy for /trust: privacy, security, content checks and accessibility for procurement,
 * IT security and accessibility reviewers.
 *
 * Every point names the repository files it rests on (`sources`), and the page links each
 * one on GitHub. If the code changes, change the point or drop it. Rules the tests enforce
 * (trust.test.ts): the disclaimer is on the page, buyer wording says "Founding" and never
 * "Pro", no certification is claimed, no dose instructions, and every GitHub link points to
 * a file that exists in this repository.
 */

export const TRUST_PATH = "/trust";
export const TRUST_URL = `${SITE_URL}${TRUST_PATH}`;
export const TRUST_TITLE = "Trust, privacy and validation | FirstPass";
export const TRUST_DESCRIPTION = `How FirstPass handles data, security, content checks and accessibility, with the source file for each claim. ${PAIR_DISCLAIMER}`;
export const TRUST_H1 = "Trust, privacy and validation";

/** The day these points were last checked against the code. Update it when you re-check. */
export const TRUST_REVIEWED = "2026-10-18";

export const REPO_URL = "https://github.com/kaleblovingier/FirstPassInteractions";

/** GitHub link to a file in the repository, on main. `path` is relative to the repo root. */
export function repoFile(path: string): string {
  return `${REPO_URL}/blob/main/${path}`;
}

export const TRUST_EMAIL = SOFTWARE.email;
export const PROCUREMENT_SUBJECT = "FirstPass procurement request";
export const PROCUREMENT_MAILTO = `mailto:${TRUST_EMAIL}?subject=${encodeURIComponent(PROCUREMENT_SUBJECT)}`;

export const TRUST_INTRO =
  "This page is for the people who sign off on software: procurement, IT security and accessibility offices. Each section links to the files it comes from, so you can check it against the code.";

/** `source`, when set, is the report this point summarizes; the page links it after the text. */
export type TrustPoint = { lead: string; text: string; source?: string };

export type TrustSection = {
  id: string;
  title: string;
  intro?: string;
  points: TrustPoint[];
  /** Repository paths, relative to the repo root, that back the points in this section. */
  sources: string[];
};

/** "What FirstPass is and is not" body text. The lists under it come from regulatory.ts. */
export const WHAT_SECTION = {
  id: "what",
  title: "What FirstPass is and is not",
  intro:
    "FirstPass is an educational desk for learning how medicines interact. It shows mapped enzyme and body-effect collisions, FDA label excerpts and published scales, with links to the sources behind them.",
  notForTitle: "It is not for",
  limitsTitle: "Limits stated in the instructions for use",
  more: "The full intended use, warnings and hazard list are on the desk's IFU tab.",
  sources: ["src/lib/regulatory.ts", "README.md"],
} as const;

export const PRIVACY: TrustSection = {
  id: "privacy",
  title: "Privacy",
  intro: "FirstPass has no accounts and no database. The desk runs in your browser.",
  points: [
    {
      lead: "No accounts.",
      text: "There is no sign-up and no sign-in. No database holds learner data.",
    },
    {
      lead: "What stays in your browser.",
      text: "The drugs on your desk, host toggles (smoking, alcohol, age band, kidney, pregnancy, metabolizer picks), any amounts you type, study marks, lab-book answers, saved briefs, recent trays and watch pins are kept in this browser's local storage, not on a FirstPass server. Clearing site data removes them. A license key is also kept there; it is sent to the server once, to check its signature, when you redeem it.",
    },
    {
      lead: "Live sources get drug names only.",
      text: "When you open a live lookup, the browser sends catalog drug ids or names to the FirstPass server. The server then asks public sources by drug name: OpenFDA, NLM RxNorm and RxClass, PubChem, DailyMed, ClinicalTrials.gov, NCBI PubMed, the CPIC API, PsychonautWiki and TripSit. Host toggles and typed amounts are not part of these lookups. Because the server makes the calls, those sources see the server, not your browser.",
    },
    {
      lead: "The three readers use an AI service.",
      text: "Only when you press \"Ask the three readers\", the server sends a short brief built from the check on screen (drug names, the top rows and their mechanisms, the source name and blank-pair reasons) to xAI's API, which runs a Grok model. Answers are screened for doses and held in server memory for 10 minutes. The readers are off when no xAI key is set.",
    },
    {
      lead: "Payments.",
      text: "Founding is paid by Venmo, Cash App or PayPal. The payment happens in that app, so FirstPass never sees your card or bank details. The operator matches the payment and emails the Founding key. Stripe checkout is built but switched off.",
    },
    {
      lead: "Key emails.",
      text: "Founding keys are emailed through Resend to the purchase email, with a blind copy to the FirstPass inbox.",
    },
    {
      lead: "Lost-key recovery.",
      text: "The email you type is checked against Stripe. To limit abuse, the server counts requests by email and IP address in memory. Those counters are lost when that server instance restarts, and they are not written to disk or a database.",
    },
    {
      lead: "No analytics.",
      text: "FirstPass has no analytics, advertising or tracking code. The feedback link opens your own email app.",
    },
    {
      lead: "Outside resources on every page.",
      text: "Pages load fonts from Google Fonts and a \"Created with Grok\" badge script from grok.com, the platform FirstPass was built with. Those requests show your IP address and browser to Google and to grok.com. FirstPass does not control the grok.com script, and grok.com can set its own cookies. FirstPass's own code sets no cookies.",
    },
    {
      lead: "Do not enter patient information.",
      text: "FirstPass is not built to hold protected health information (PHI). Its terms say users must not enter PHI, and that FirstPass is not a HIPAA covered entity or business associate. Use drug names and teaching toggles only.",
    },
    {
      lead: "Server logs.",
      text: "FirstPass server logs record event names, status, timing and counts. They are written so they never hold request contents, search text, regimens, host toggles or license keys. Vercel, the host, keeps its own request logs.",
    },
  ],
  sources: [
    ".grok/app-env.json",
    "src/lib/drugs/store.ts",
    "src/lib/drugs/lab.ts",
    "src/lib/drugs/watchlist.ts",
    "src/lib/drugs/live-rpc.ts",
    "src/lib/drugs/live.server.ts",
    "src/lib/drugs/psychonaut.server.ts",
    "src/lib/drugs/readers.server.ts",
    "src/lib/billing/stripe.server.ts",
    "src/lib/billing/paypal.server.ts",
    "src/lib/billing/license-mail.server.ts",
    "src/lib/billing/recover.server.ts",
    "src/lib/drugs/feedback.ts",
    "src/lib/regulatory.ts",
    "README.md",
    "src/routes/__root.tsx",
    "scripts/grok-pwa-shared.mjs",
    "src/lib/server/log.ts",
  ],
};

export const SECURITY: TrustSection = {
  id: "security",
  title: "Security",
  points: [
    {
      lead: "Signed keys.",
      text: "A license key is checked on the server with HMAC-SHA256 and a secret that never leaves the server. FirstPass keeps no key database: a paid key is derived again from its Stripe payment record, and the key is also written to that Stripe record.",
    },
    {
      lead: "Secrets stay on the server.",
      text: "Stripe, Resend, PayPal, xAI and signing secrets are read from server environment variables. None use the VITE_ prefix that would ship them to the browser, and .env files are kept out of the repository.",
    },
    {
      lead: "Fails closed in production.",
      text: "Without its signing secret or operator PIN, the server refuses to mint or check keys rather than fall back to a default. The Stripe webhook rejects calls without a valid signature. Card checkout, key recovery and the readers switch off when their keys are missing.",
    },
    {
      lead: "Rate limits.",
      text: "Key recovery allows 5 requests per IP address per 15 minutes and 3 per email per hour. The readers allow 30 asks per minute. These counters live in each server instance's memory, so they reset when an instance restarts. Other endpoints have no rate limit of their own. They rely on input checks: lists and text are capped, and unknown drug ids are dropped before any outside call.",
    },
    {
      lead: "HTTPS.",
      text: "The desk is hosted on Vercel and served over HTTPS. Plain HTTP redirects to HTTPS.",
    },
    {
      lead: "No stored learner data.",
      text: "There is no database. Learner work stays in the learner's own browser.",
    },
    {
      lead: "Operator tools.",
      text: "Minting keys and listing paid orders need an operator PIN, which the server checks in constant time.",
    },
    {
      lead: "Certifications.",
      text: "FirstPass has no SOC 2 report and no ISO 27001 certificate. It is not FDA-cleared.",
    },
  ],
  sources: [
    "src/lib/billing/license.server.ts",
    "src/lib/billing/license.ts",
    "src/lib/env.server.ts",
    ".gitignore",
    "src/lib/billing/stripe.server.ts",
    "src/lib/billing/recover.server.ts",
    "src/lib/drugs/readers.server.ts",
    "src/lib/server/rpc-input.ts",
    "README.md",
    "vercel.json",
    "docs/automatic-license-delivery.md",
    "docs/regulatory/gap-assessment.md",
  ],
};

export const CONTENT: TrustSection = {
  id: "content",
  title: "Content and validation",
  intro:
    "These numbers come from reports that scripts in the repository generate. Each is a snapshot from the day it was run. The full reports give the method and the limits.",
  points: [
    {
      lead: "Label gold set.",
      text: "481 drug pairs, each tied to an FDA label statement quoted from DailyMed. The desk is at or above the tier the label supports on 481 of 481. Where the label says contraindicated, the desk says \"Avoid together\" on 446 of 446. Some pairs are held at that tier by a stored label line, so this shows the desk reproduces those labels. It says nothing about pairs outside the set.",
      source: "docs/validation/label-gold-set.md",
    },
    {
      lead: "FDA interaction table.",
      text: "The desk's enzyme and P-gp roles were compared with FDA's table of example drugs that interact with CYP enzymes and transporters, across 280 drug, target and role pairs. Same role: 97.9% (274 of 280). Same role and FDA strength class: 84.6% (237 of 280). FDA strong inhibitors and inducers: 100% (35 of 35). No direction mismatches. FDA calls its table illustrative, not complete.",
      source: "docs/validation/fda-ddi-agreement.md",
    },
    {
      lead: "Enzyme-only \"Avoid together\".",
      text: "A scan of all 1,682,695 catalog pairs found 277 \"Avoid together\" findings that come from the enzyme rules. All 277 carry a label citation.",
      source: "docs/validation/severity-whatif.md",
    },
    {
      lead: "Clinical review.",
      text: "No clinician has reviewed this content yet. A sign-off packet lists every rule that can produce an \"Avoid together\" or \"Serious concern\" finding (100 rules), with pair counts, examples, the current source and a blank column for a pharmacist reviewer.",
      source: "docs/clinical-review/signoff-packet.md",
    },
    {
      lead: "Not every finding has an outside source.",
      text: "At the last full count (software 1.14.0, 2026-09-26), 48.9% of findings across all catalog pairs rested only on the desk's own map, with no FDA label, PubMed or CPIC source attached. Giving the contraindicated and major findings a specific outside source comes first.",
      source: "docs/regulatory/gap-assessment.md",
    },
    {
      lead: "Regulatory self-assessment.",
      text: "An engineering self-assessment of FirstPass against FDA guidance for software that is not a medical device. It is not legal advice and not an FDA determination.",
      source: "docs/regulatory/gap-assessment.md",
    },
  ],
  sources: [
    "docs/validation/label-gold-set.md",
    "docs/validation/fda-ddi-agreement.md",
    "docs/validation/severity-whatif.md",
    "docs/clinical-review/signoff-packet.md",
    "docs/regulatory/gap-assessment.md",
  ],
};

export const ACCESSIBILITY: TrustSection = {
  id: "accessibility",
  title: "Accessibility",
  intro:
    "A draft Accessibility Conformance Report (VPAT 2.5, WCAG 2.2 edition, dated 2026-10-12) covers the desk and the public pair and drug pages. It is a draft. The owner has not yet verified every row, and no one has tested FirstPass with a screen reader. The full report goes out on request once every row is verified.",
  points: [
    {
      lead: "Summary.",
      text: "Of 56 Level A and AA rows: 15 Supports, 3 Partially Supports, 29 Not Evaluated and 9 Not Applicable. The report names each partial gap and its planned fix.",
    },
    {
      lead: "Automated checks.",
      text: "axe-core scans at 320 and 1280 pixels wide find 0 violations on the scanned views. Lighthouse accessibility scored 100 on the tested pages.",
    },
    {
      lead: "Keyboard.",
      text: "A keyboard script passes 36 of 36 checks on the core journeys, including search, the desk views and the unlock dialog.",
    },
    {
      lead: "Not done yet.",
      text: "Testing with a screen reader, speech input or switch access, and in browsers other than Chrome. Most Not Evaluated rows wait on that.",
    },
  ],
  sources: ["docs/accessibility/wcag-conformance.md"],
};

export const PROCUREMENT = {
  id: "procurement",
  title: "For procurement",
  lines: [
    "Questionnaires (HECVAT Lite, vendor security forms), W-9 and invoices on request.",
    "Tell us your institution, the form you need and your deadline.",
  ],
  cta: "Email a procurement request",
  programs: "Group and site licenses",
} as const;

export const TRUST_SECTIONS: TrustSection[] = [PRIVACY, SECURITY, CONTENT, ACCESSIBILITY];

/** Every repository path the page links to. The tests check that each one exists. */
export function trustSourcePaths(): string[] {
  const fromPoints = TRUST_SECTIONS.flatMap((s) => s.points.flatMap((p) => (p.source ? [p.source] : [])));
  return [...new Set([...WHAT_SECTION.sources, ...TRUST_SECTIONS.flatMap((s) => s.sources), ...fromPoints])];
}
