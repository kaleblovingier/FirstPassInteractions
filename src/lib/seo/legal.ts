/**
 * Copy for /privacy, /terms and /cookies. Every statement must match
 * docs/data-inventory.md. Do not claim anything the code does not do.
 * Not reviewed by an attorney. Items marked TODO need Kaleb's decision.
 */
import { SOFTWARE } from "@/lib/regulatory";
import { SITE_URL } from "@/lib/seo/pair-copy";

export const LEGAL_EFFECTIVE = "October 19, 2026";
export const LEGAL_EMAIL = SOFTWARE.email;

export type LegalSection = { id: string; title: string; paras: readonly string[] };
export type LegalDoc = {
  path: "/privacy" | "/terms" | "/cookies";
  title: string;
  h1: string;
  description: string;
  sections: readonly LegalSection[];
};

export const REFUND_TODO =
  "TODO (Kaleb): refund policy for the Founding license has not been set. Until it is, email " +
  LEGAL_EMAIL +
  " about any refund request.";

/** What "lifetime" means for the Founding license. */
export const LIFETIME_TERMS =
  "The Founding license is a one-time purchase. It unlocks the desk's licensed features for the buyer for as long as FirstPass offers the desk. If FirstPass stops offering the desk, the license ends and no further updates are owed.";

/** Sitewide trademark line. */
export const TRADEMARK_LINE =
  "Drug and product names are trademarks of their owners and are used only to identify the products.";

/** Shown on /pairs. */
export const NOT_AFFILIATED_LINE = "Not affiliated with or endorsed by FDA or NLM.";

export const PRIVACY_DOC: LegalDoc = {
  path: "/privacy",
  title: "Privacy policy | FirstPass",
  h1: "Privacy policy",
  description: "What FirstPass collects, where it goes, how long it is kept, and how to ask for access or deletion.",
  sections: [
    {
      id: "who",
      title: "Who we are",
      paras: [
        `FirstPass is run by ${SOFTWARE.developer} (FirstPass Interactions) in Washington State. Contact: ${LEGAL_EMAIL}.`,
      ],
    },
    {
      id: "phi",
      title: "Do not enter patient information",
      paras: [
        "FirstPass is an educational reference. It is not built to hold patient data and is not a HIPAA covered entity or business associate. Do not enter names, record numbers, dates of birth or any other protected health information (PHI). Use drug names and teaching toggles only.",
      ],
    },
    {
      id: "browser",
      title: "What stays in your browser",
      paras: [
        "The drugs on your desk, host toggles, any amounts you type, study marks, lab-book answers, saved briefs, recent trays, watch pins, a search-shortcut setting and your license key are kept in your browser's local storage. They are not sent to a FirstPass database (there is none). Clearing site data for this site removes them.",
        "Your license key is sent to the server when it is checked. The server checks its signature and does not store it.",
      ],
    },
    {
      id: "server",
      title: "What reaches the FirstPass server",
      paras: [
        "Live lookups: catalog drug names or ids. The server asks public sources (OpenFDA, NLM RxNorm and RxClass, PubChem, DailyMed, ClinicalTrials.gov, PubMed, CPIC, PsychonautWiki, TripSit) by drug name. Host toggles and typed amounts are not sent.",
        "\"Ask the three readers\": only when you press it, a short brief built from the check on screen (drug names, top rows, sources) is sent to xAI's API. Answers are kept in server memory for up to 10 minutes.",
        "Program inquiry form (/for-programs): your name, work email, organization and message are emailed to the FirstPass inbox through Resend, with your email as reply-to. The form does not store them in a database. They then live in the FirstPass email inbox.",
        "Lost-key recovery (/recover): the email you type is checked against Stripe, and if a purchase matches, the key is emailed to that address through Resend. Stripe checkout is built but switched off.",
        "Abuse limits: the recovery and inquiry forms count requests per IP address and per email in server memory only. Those counters are not written to disk and reset when a server instance restarts.",
        "FirstPass's own server logs record event names, status, timing and counts, and are designed not to record request contents, emails or keys. Vercel, our host, keeps its own request logs (which include IP addresses) under its own policy.",
      ],
    },
    {
      id: "payments",
      title: "Payments and the Founding license",
      paras: [
        "Founding is paid by Venmo, Cash App or PayPal. The payment happens in that app, so FirstPass never sees your card or bank details. The operator matches the payment and emails the Founding key. Stripe checkout is built but switched off. If card checkout is added later, this policy will be updated first.",
        "Venmo, Cash App and direct PayPal payments are handled by hand. The operator sees the payer's name, handle and the amount in that app and in the payment emails it sends, and uses them to issue the key.",
        "Founding keys are emailed through Resend to the purchase email, with a blind copy to the FirstPass inbox.",
      ],
    },
    {
      id: "processors",
      title: "Who else handles data",
      paras: [
        "Vercel (hosting and request logs), Venmo, Block (Cash App) and PayPal (payments), Stripe (Stripe checkout is built but switched off), Resend (email delivery), Google (Gmail inbox for FirstPass email; Google Fonts, which sees your IP address and browser when pages load fonts), xAI (only when you use the readers), and grok.com, which serves a \"Created with Grok\" badge script on desk pages. FirstPass does not sell or share personal information for advertising.",
      ],
    },
    {
      id: "retention",
      title: "How long we keep it",
      paras: [
        "Browser data: until you clear it. Rate-limit counters: until the server instance restarts, and at most a day. Reader answers: up to 10 minutes. Emails (key deliveries, inquiries, payment notices): in the FirstPass inbox until deleted. Venmo, Cash App and PayPal records: kept by those companies under their own rules, which include legal record-keeping. Vercel logs: per Vercel's retention.",
      ],
    },
    {
      id: "rights",
      title: "Your rights",
      paras: [
        `You can ask what we hold about you, ask us to correct it, or ask us to delete it, by emailing ${LEGAL_EMAIL}. We will answer within 45 days. We may keep payment records where the law requires it. We will not treat you differently for asking.`,
        "Washington's My Health My Data Act: FirstPass does not ask for or knowingly collect consumer health data. The desk's toggles and drug lists stay in your browser. If anything you send us (for example an inquiry message) contains health information about you, you can ask us to delete it, and we will not sell it or share it except with the processors above to answer you.",
        "California and other states with privacy laws: the same access, correction and deletion requests are open to you at the same address. We do not sell or share personal information as those laws define it.",
      ],
    },
    {
      id: "children",
      title: "Children",
      paras: ["FirstPass is for healthcare professionals and health-professions students. It is not intended for children under 13, and we do not knowingly collect their information."],
    },
    {
      id: "changes",
      title: "Changes",
      paras: [`We will update this page and its effective date when practices change. Effective ${LEGAL_EFFECTIVE}.`],
    },
  ],
};

export const COOKIES_DOC: LegalDoc = {
  path: "/cookies",
  title: "Cookie policy | FirstPass",
  h1: "Cookies and browser storage",
  description: "FirstPass sets no tracking or advertising cookies. What it stores in your browser and why.",
  sections: [
    {
      id: "cookies",
      title: "Cookies",
      paras: [
        "FirstPass uses no analytics, advertising or tracking cookies, so there is no cookie banner. Sign-in is switched off, so FirstPass's own code does not set cookies in normal use. If sign-in is switched on in the future, it would set strictly necessary session cookies, and this page would be updated first.",
        "Desk pages load a \"Created with Grok\" badge script from grok.com, the platform FirstPass was built with. FirstPass does not control that script, and grok.com may set its own cookies. Pages also load fonts from Google Fonts, which sees your IP address and browser.",
      ],
    },
    {
      id: "storage",
      title: "Local and session storage",
      paras: [
        "The desk keeps your work (drugs on the desk, toggles, study marks, lab answers, saved briefs, trays, watch pins, settings and your license key) in local storage so it is there next time. This is needed for the desk to work and stays in your browser. FirstPass has no database for it. Your license key is sent to the server only to check it, and isn't stored. Clear site data to remove it.",
      ],
    },
    { id: "changes", title: "Changes", paras: [`Effective ${LEGAL_EFFECTIVE}.`] },
  ],
};

export const TERMS_DOC: LegalDoc = {
  path: "/terms",
  title: "Terms of use | FirstPass",
  h1: "Terms of use",
  description: "Terms for using FirstPass: educational reference only, not medical advice, no warranty, and Washington law.",
  sections: [
    {
      id: "what",
      title: "What FirstPass is",
      paras: [
        "FirstPass is an educational drug-interaction reference for licensed healthcare professionals and health-professions students. It is not medical advice and does not replace professional judgment. Educational reference only. Not FDA-cleared. The Prescribing Information governs.",
        "Using FirstPass does not create a doctor-patient or pharmacist-patient relationship with anyone. A blank or mild result is not a statement that a combination is safe.",
        "FirstPass is not affiliated with or endorsed by the FDA, the National Library of Medicine (NLM) or any drug manufacturer. Drug and product names are trademarks of their owners and are used only to identify the products.",
      ],
    },
    {
      id: "you",
      title: "Your responsibilities",
      paras: [
        "You are responsible for how you use what FirstPass shows, and for checking it against primary sources. Do not enter protected health information or any patient-identifying data. Do not use FirstPass for self-treatment. If you are a patient, ask your pharmacist or clinician about your medicines. Do not try to break, overload or copy the service, or share license keys beyond what your license allows.",
      ],
    },
    {
      id: "license",
      title: "Founding license",
      paras: [
        LIFETIME_TERMS,
        "Keys are personal to the buyer unless a program license says otherwise.",
        "Lab-book receipts are not CE credit and are not accredited continuing education.",
        REFUND_TODO,
      ],
    },
    {
      id: "warranty",
      title: "No warranty",
      paras: [
        "FirstPass and its content are provided \"as is\" and \"as available\", without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, accuracy and non-infringement. Drug information changes and the content may be incomplete or wrong.",
      ],
    },
    {
      id: "liability",
      title: "Limitation of liability",
      paras: [
        "To the fullest extent the law allows, FirstPass and its developer are not liable for indirect, incidental, special, consequential or punitive damages, or for any clinical outcome, arising from use of or inability to use FirstPass. Total liability for any claim is limited to the greater of what you paid FirstPass in the prior 12 months or US$100.",
      ],
    },
    {
      id: "law",
      title: "Governing law",
      paras: ["These terms are governed by the laws of the State of Washington, USA, without regard to conflict-of-laws rules. Courts in Washington have jurisdiction, unless the law gives you a right to sue elsewhere."],
    },
    {
      id: "privacy",
      title: "Privacy",
      paras: ["How FirstPass handles data is described in the privacy policy (/privacy) and cookie policy (/cookies)."],
    },
    {
      id: "changes",
      title: "Changes and contact",
      paras: [`We may update these terms and will change the effective date when we do. Questions: ${LEGAL_EMAIL}. Effective ${LEGAL_EFFECTIVE}.`],
    },
  ],
};

export const LEGAL_DOCS = [PRIVACY_DOC, TERMS_DOC, COOKIES_DOC] as const;
export const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
] as const;
export const legalUrl = (d: LegalDoc) => `${SITE_URL}${d.path}`;
