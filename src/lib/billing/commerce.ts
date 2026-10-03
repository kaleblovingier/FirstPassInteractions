/** Public pay / write lines — the operator asked these onto the desk. */

export const OPERATOR = {
  name: "Kaleb Lovingier",
  venmo: "kaleblovingier",
  email: "kaleblovingier@gmail.com",
  phone: "360-707-8923",
  phoneHref: "tel:+13607078923",
  social: ["@badbird", "@kaleblovingier"] as const,
  venmoUrl: "https://venmo.com/u/kaleblovingier",
  cashApp: "kaleblovingier7",
  cashAppUrl: "https://cash.app/$kaleblovingier7",
  paypal: "kaleblovingier@gmail.com",
  paypalUrl:
    "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=kaleblovingier%40gmail.com&item_name=FirstPass%20founding&amount=79&currency_code=USD",
  payLine:
    "Venmo @kaleblovingier · Cash App $kaleblovingier7 · PayPal kaleblovingier@gmail.com",
};

export const PAY_RAILS = [
  { id: "venmo", label: "Venmo", handle: `@${OPERATOR.venmo}`, href: OPERATOR.venmoUrl },
  { id: "cashapp", label: "Cash App", handle: `$${OPERATOR.cashApp}`, href: OPERATOR.cashAppUrl },
  { id: "paypal", label: "PayPal", handle: OPERATOR.paypal, href: OPERATOR.paypalUrl },
] as const;

/** Buyer-facing three-step path when Stripe is deferred (Venmo / Cash App / PayPal). */
export const MANUAL_UNLOCK_STEPS = [
  {
    n: "1",
    title: "Pay $79 once",
    detail: "Open Venmo, Cash App, or PayPal below and send the $79 founding payment.",
  },
  {
    n: "2",
    title: "Get your key",
    detail: "After payment clears, you get a signed key by email or text (FP-LIFE-…). Nothing unlocks by itself.",
  },
  {
    n: "3",
    title: "Redeem on this desk",
    detail: "Paste the key below and hit Redeem. Host factors, the liver enzyme map, and export open on this browser.",
  },
] as const;

/** Soft unlock note — no clinical claims; PI / Safety page still govern. */
export const FOUNDING_UNLOCKS =
  "Founding unlocks host factors, enzyme atlas, metabolite maps, full report, and JSON/CSV export — $79 once. Educational model; not FDA-cleared.";

/** Public URLs. Override the live desk with VITE_PUBLIC_URL when Vercel is linked. */
const PAGES_URL = "https://kaleblovingier.github.io/FirstPassInteractions/";

export const SITE = {
  repo: "https://github.com/kaleblovingier/FirstPassInteractions",
  pages: PAGES_URL,
  gamma: "https://gamma.app/docs/c1sxd9i8iyv80eq",
  gammaCard: "https://gamma.app/docs/h9grlpif6t8ogmt",
  /** Live desk. Prefer VITE_PUBLIC_URL; else the Vercel desk — never the bare repo. */
  url: (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim() || "https://firstpass-desk.vercel.app",
};

export const TRY_THREE = [
  {
    id: "oral-k-gf",
    title: "Oral ketamine × grapefruit",
    punch: "More of the dose may reach the bloodstream by mouth. How long it lasts does not change the same way. Compare with IV — that path skips the gut step.",
  },
  {
    id: "dxm-pm",
    title: "DXM in a 2D6 poor metabolizer, every 8 hours",
    punch: "In a slow metabolizer, cough medicine can build up with repeat doses. Once versus every 8 hours is the teaching point.",
  },
  {
    id: "tac-gf",
    title: "Tacrolimus × grapefruit",
    punch: "A kitchen interaction: more of the transplant medicine may get absorbed. The gut enzyme matters here more than the liver story alone.",
  },
] as const;

/** Plain "who it's for" line — Plans hero and pitch. */
export const WHO_FOR = "For licensed healthcare professionals, and for students in accredited health-professions programs using it for education under faculty or preceptor supervision.";

/** Short Plans FAQ. Contact answers reuse OPERATOR lines only — no new handles. */
export const PLANS_FAQ = [
  {
    q: "Is it a subscription?",
    a: "No. Founding is $79 once — no renewal, no monthly charge. The free desk stays free.",
  },
  {
    q: "Do I need a card for the free desk?",
    a: "No. Up to five drugs, no card, no key.",
  },
  {
    q: "I lost my key. Now what?",
    a: `Write ${OPERATOR.email} or text ${OPERATOR.phone} and ask for a fresh key, then paste it under Redeem.`,
  },
  {
    q: "Is this medical advice?",
    a: "No. FirstPass is an educational model, not FDA-cleared. The Prescribing Information governs, and an empty result is not proof a combination is safe.",
  },
] as const;

export const COMMERCE = {
  founding: 79,
  payUrl: (import.meta.env.VITE_PAY_URL as string | undefined)?.trim() || OPERATOR.venmoUrl,
  operatorContact: (import.meta.env.VITE_OPERATOR_CONTACT as string | undefined)?.trim() || OPERATOR.email,
  pitch: `A medicine-interaction learning desk. ${WHO_FOR}`,
};

export const BUYERS = [
  {
    who: "Ketamine / esketamine clinics",
    why: "Oral vs IV first-pass, benzo airway stack, 2B6 phenotype — teaching maps to read alongside the PI, not a substitute for their pharmacist.",
    hook: "oral vs IV ketamine, benzo airway stacks, and 2B6 phenotype",
  },
  {
    who: "MAT programs",
    why: "Teaching maps for xylazine, nitazenes, designer benzos, loperamide, and naltrexone, including why naloxone does not reverse xylazine's α2 effect.",
    hook: "xylazine, nitazenes, designer benzos, and the naltrexone / loperamide traps",
  },
  {
    who: "Pharmacy students and residents",
    why: "A teaching desk they will actually open. Lab export goes in the notebook.",
    hook: "a teaching desk they will actually open, with JSON/CSV for the lab book",
  },
  {
    who: "Psych and addiction-medicine NPs",
    why: "MDMA × SSRI, DXM × 2D6 PM, grapefruit × oral ketamine, lithium × mushrooms.",
    hook: "MDMA × SSRI, DXM in 2D6 PMs, grapefruit × oral ketamine",
  },
] as const;

export function payClose(price = COMMERCE.founding) {
  return `Pay $${price} once via Venmo @${OPERATOR.venmo}, Cash App $${OPERATOR.cashApp}, or PayPal ${OPERATOR.email}. After it clears you get a signed key by email or text — paste it under Redeem on the Plans page. Three steps: pay, get your key, redeem.`;
}

export function salesDm(price = COMMERCE.founding) {
  return [
    "I built FirstPass, a learning desk that maps how medicines interact across ketamine, MAT, street adulterants (xylazine, nitazenes), and common psych stacks, including grapefruit, smoking, and metabolizer status.",
    WHO_FOR,
    "",
    "Free: check up to five medicines for mapped interactions.",
    `Founding license: $${price} once. Host-factor teaching cards, metabolite maps, enzyme atlas, and export — yours on this desk.`,
    "",
    SITE.url,
    "",
    payClose(price),
    `${OPERATOR.email} · ${OPERATOR.phone}`,
    "",
    "Educational model — not FDA-cleared, not a clinical system of record. The Prescribing Information governs.",
  ].join("\n");
}

export function buyerDm(who: (typeof BUYERS)[number]["who"], price = COMMERCE.founding) {
  const buyer = BUYERS.find((b) => b.who === who);
  const hook = buyer?.hook ?? "CYP450 and drug-interaction teaching maps";
  return [
    `I built FirstPass, a medicine-interaction learning desk for ${hook}.`,
    WHO_FOR,
    "",
    "Checking up to five medicines stays free so you can kick the tires.",
    `Founding license is $${price} once: host-factor teaching cards, metabolite maps, enzyme atlas, and JSON/CSV export.`,
    "",
    SITE.url,
    "",
    payClose(price),
    `${OPERATOR.email} · ${OPERATOR.phone}`,
    "",
    "Educational model — not FDA-cleared, not a clinical system of record. The Prescribing Information governs.",
  ].join("\n");
}

export function launchTweet(price = COMMERCE.founding) {
  return [
    "FirstPass is an educational CYP450 desk for licensed healthcare professionals and supervised students.",
    "",
    "Free up to five drugs on the desk.",
    `Founding license $${price} once — host factors, enzyme atlas, export.`,
    SITE.url,
    `Pay $${price} once via Venmo, Cash App, or PayPal.`,
    "",
    "Educational model. Not FDA-cleared. Empty tray is not proof a combination is safe.",
  ].join("\n");
}

export interface LaunchPost {
  id: string;
  channel: string;
  title: string;
  where: string;
  compose: string;
  text: string;
}

export function launchPosts(price = COMMERCE.founding, url = SITE.pages): LaunchPost[] {
  const tryLines = TRY_THREE.map((t) => `• ${t.title} — ${t.punch}`).join("\n");
  return [
    {
      id: "x",
      channel: "X",
      title: "Launch thread",
      where: "Post from @badbird or @kaleblovingier",
      compose: "https://x.com/compose/post",
      text: [
        "1/",
        "FirstPass is an educational CYP450 desk for licensed healthcare professionals and supervised students.",
        "",
        "Free up to five drugs on the desk. Founding license $" + price + " once.",
        "",
        "2/",
        "Three cases the desk actually draws:",
        tryLines,
        "",
        "3/",
        url,
        `Venmo @${OPERATOR.venmo} · Cash App $${OPERATOR.cashApp} · PayPal ${OPERATOR.email}`,
        "",
        "Educational model. Not a charting system.",
      ].join("\n"),
    },
    {
      id: "reddit-pharmacy",
      channel: "Reddit",
      title: "r/pharmacy",
      // Professional sub. Check sub rules before posting.
      where: "Teaching post, not a cold pitch. Check sub rules before posting.",
      compose: "https://www.reddit.com/r/pharmacy/submit",
      text: [
        "Title: FirstPass — a CYP450 teaching desk (oral vs IV ketamine, 2D6 PM accumulation, grapefruit first-pass)",
        "",
        "I built an educational CYP450 / PD collision desk for the stacks I kept looking up by hand: ketamine (oral vs IV), MAT / street adulterants, psych, and kitchen inhibitors.",
        "",
        "Free: up to five drugs on the desk, collision cards, a one-compartment concentration sketch (AUCR, q8h accumulation, oral vs IV overlay).",
        "",
        "Three cases worth opening:",
        tryLines,
        "",
        WHO_FOR,
        "",
        "Not a clinical system of record. Not medical advice. Founding license is $" +
          price +
          " once if you want host phenotype, the enzyme atlas, and export.",
        "",
        url,
        SITE.repo,
      ].join("\n"),
    },
    // Retargeted from r/ketamine (a public / patient community) to a student venue.
    // r/PharmacySchool confirmed to exist (Sep 2026); r/CRNA also exists and fits the
    // oral vs IV ketamine case. Check sub rules before posting in either.
    {
      id: "reddit-pharmacyschool",
      channel: "Reddit",
      title: "r/PharmacySchool",
      where: "Student PK teaching post. Check sub rules before posting.",
      compose: "https://www.reddit.com/r/PharmacySchool/submit",
      text: [
        "Title: Oral vs IV first-pass as a PK teaching case (free CYP450 study desk)",
        "",
        "I built FirstPass, an educational CYP450 desk, and the case I keep coming back to for pharmacokinetics is oral vs IV ketamine. Grapefruit inhibits gut CYP3A4, so oral bioavailability can rise while half-life barely moves. An IV overlay on the same milligram scale stays flat, because IV skips the gut step. A strong hepatic 3A4 inhibitor draws a different shape, which makes a good contrast when you are studying AUC ratio vs half-life.",
        "",
        "Other cases on the desk: DXM accumulation in a 2D6 poor metabolizer with every-8-hour dosing, tacrolimus with grapefruit, and 2B6 phenotype.",
        "",
        WHO_FOR,
        "",
        "Checking up to five drugs is free, no card. A founding license is $" +
          price +
          " once if you want host factors, the enzyme atlas, and JSON/CSV export for a lab notebook.",
        "",
        "Educational model, not medical advice, not dosing guidance, and not FDA-cleared. The Prescribing Information governs.",
        "",
        url,
        SITE.repo,
      ].join("\n"),
    },
    {
      id: "hn",
      channel: "Hacker News",
      title: "Show HN",
      where: "news.ycombinator.com/submit",
      compose: "https://news.ycombinator.com/submit",
      text: [
        "Title: Show HN: FirstPass – educational CYP450 collision desk",
        "URL: " + url,
        "",
        "FirstPass is an educational CYP450 desk for licensed healthcare professionals and supervised students.",
        "",
        "It maps CYP450 / PD collisions for ketamine (oral vs IV), MAT and street adulterants, and the usual psych stack. Up to five-drug collision checks are free. A one-compartment sketch shows AUCR, q8h accumulation, and an oral/IV overlay. Host phenotype, the enzyme atlas, and export are a $" +
          price +
          " founding license.",
        "",
        "Educational interaction reference, not a substitute for clinical judgment. Not FDA-cleared; the Prescribing Information governs. Source: " + SITE.repo,
      ].join("\n"),
    },
    {
      id: "linkedin",
      channel: "LinkedIn",
      title: "Pharmacy / clinic note",
      where: "Your LinkedIn composer",
      compose: "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url),
      text: [
        "I built FirstPass, an educational CYP450 desk for ketamine, MAT, and psych teaching.",
        WHO_FOR,
        "",
        "Up to five-drug collision checks stay free so a preceptor can use it for teaching. Founding license is $" +
          price +
          " once: host metabolizer status, smoke and alcohol, metabolites, enzyme atlas, JSON/CSV export.",
        "",
        "Three teaching cases:",
        tryLines,
        "",
        url,
        "",
        payClose(price),
        "",
        "Educational CYP map — not a charting system.",
      ].join("\n"),
    },
  ];
}

export function requestLicense(price = COMMERCE.founding) {
  return `I'd like a FirstPass founding license ($${price} once). I'll pay Venmo @${OPERATOR.venmo}, Cash App $${OPERATOR.cashApp}, or PayPal ${OPERATOR.email}. Send the key when it clears.`;
}

export function fulfillKey(opts: { key: string; soldTo?: string }) {
  const to = opts.soldTo?.trim();
  return [
    to ? `${to} —` : "",
    "Your FirstPass founding license is ready.",
    "",
    opts.key,
    "",
    "Open the desk, open Plans, paste the key, and tap Redeem.",
    "",
    SITE.url,
    "",
    "Educational CYP map — not FDA-cleared, not a clinical system of record. The Prescribing Information governs, and an empty result is not proof a combination is safe.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export function fulfillKeys(rows: Array<{ key: string; soldTo?: string }>) {
  return rows.map((row) => fulfillKey(row)).join("\n\n———\n\n");
}

export function invoiceText(opts: {
  plan: string;
  price: number;
  pay: string;
  keyHint?: string;
}) {
  return [
    "FIRSTPASS DESK LICENSE",
    "Educational interaction reference, not a substitute for clinical judgment. Not FDA-cleared.",
    "",
    `From: ${OPERATOR.name}`,
    `Item: ${opts.plan}`,
    `Amount: $${opts.price}`,
    `Pay: ${opts.pay || OPERATOR.payLine}`,
    `Write: ${OPERATOR.email} · ${OPERATOR.phone}`,
    "",
    "After payment you receive a key like FP-LIFE-A1B2C3D4-9F3C2A1B.",
    "Paste it under Redeem on the Plans page of the desk.",
    opts.keyHint ? `Key: ${opts.keyHint}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export function tweetFor(regimen: string, highest: string, headline: string) {
  const line = `${regimen} — ${highest}`;
  const extra = headline && headline !== regimen ? `\n${headline}` : "";
  return `${line}${extra}\nMapped on FirstPass, an educational CYP desk for licensed healthcare professionals and supervised students.\n${SITE.url}`.trim();
}
