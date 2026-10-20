import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EstimateResult, ForProgramsView } from "@/components/seo/for-programs-page";
import { PairsIndexView } from "@/components/seo/pair-page";
import { MULTI_YEAR_DISCOUNT, PROGRAM_TIERS, programQuote } from "@/lib/billing/programs";
import { COMMERCE } from "@/lib/billing/commerce";
import { pairPages, sitemapXml } from "./pair-pages";
import { PAIR_DISCLAIMER } from "./pair-copy";
import {
  DEFAULT_ESTIMATE_SEATS,
  FOR_PROGRAMS_COMPARISON,
  FOR_PROGRAMS_DESCRIPTION,
  FOR_PROGRAMS_ESTIMATE_NOTE,
  FOR_PROGRAMS_FAQ,
  FOR_PROGRAMS_KEY_STEPS,
  FOR_PROGRAMS_MAILTO,
  FOR_PROGRAMS_TITLE,
  FOR_PROGRAMS_URL,
  formatUsd,
  formatUsdCents,
  forProgramsJsonLd,
  parseSeats,
  PROGRAM_TYPES,
  programEstimate,
  seatsLabel,
} from "./for-programs";

const html = renderToStaticMarkup(createElement(ForProgramsView));
const text = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");
const body = text(html);
const DOSE = /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|mL|units?|IU)\b|\b(once|twice|three times|four times) (a|per|daily)\b|\bevery \d+\s?(h|hours?)\b|\b(take \d|reduce the dose|increase the dose|titrate|max(imum)? dose|dos(e|es|ing|age))\b/i;
/** Prices are allowed on this page now; "Pro", "free" and CDS wording still are not. */
const BANNED = /clinical decision support|decision support|\bCDS\b|\bfree\b|\bPro\b/i;
const HYPE = /revolutionary|seamless|unlock the power|game[- ]chang|cutting[- ]edge|world[- ]class|best[- ]in[- ]class/i;
const CLAIMS = /HIPAA|SOC ?2|ISO ?27001|FERPA[- ]compliant|certified|trusted by|testimonial|customers? (say|love)/i;
const estimate = (seats: string, years: 1 | 2 | 3) => text(renderToStaticMarkup(createElement(EstimateResult, { seatsInput: seats, years })));

describe("/for-programs copy rules", () => {
  it("no Pro, free, dose, CDS, hype or invented-claim wording in title, meta or body", () => {
    for (const s of [FOR_PROGRAMS_TITLE, FOR_PROGRAMS_DESCRIPTION, body]) {
      assert.ok(!BANNED.test(s), s.match(BANNED)?.[0]);
      assert.ok(!DOSE.test(s), s.match(DOSE)?.[0]);
      assert.ok(!HYPE.test(s), s.match(HYPE)?.[0]);
      assert.ok(!CLAIMS.test(s), s.match(CLAIMS)?.[0]);
    }
    assert.ok(body.includes("Founding"));
  });

  it("no patient-use phrasing in title, meta or body", () => {
    const PATIENT = /\bintake\b|patient'?s other medicines|before they reach the pharmacist|for patients\b|patient-facing/i;
    for (const s of [FOR_PROGRAMS_TITLE, FOR_PROGRAMS_DESCRIPTION, body]) assert.ok(!PATIENT.test(s), s.match(PATIENT)?.[0]);
  });

  it("names the intended users", () => {
    assert.match(body, /licensed healthcare professionals/);
    assert.match(body, /supervision/);
  });

  it("title and description sell group and site licenses with yearly pricing", () => {
    assert.match(FOR_PROGRAMS_TITLE, /group and site licenses/i);
    assert.match(FOR_PROGRAMS_TITLE, /yearly|annual/i);
    assert.match(FOR_PROGRAMS_DESCRIPTION, /group and site licenses/i);
    assert.match(FOR_PROGRAMS_DESCRIPTION, /annual pricing from \$690 a year/i);
    assert.match(FOR_PROGRAMS_DESCRIPTION, /purchase order/);
  });

  it("has the disclaimer, one h1 and a prefilled mailto", () => {
    assert.equal(PAIR_DISCLAIMER, "Educational reference only. Not FDA-cleared. The Prescribing Information governs.");
    assert.ok(body.includes(PAIR_DISCLAIMER));
    assert.ok(html.includes('data-testid="pair-disclaimer"'));
    assert.ok(FOR_PROGRAMS_DESCRIPTION.endsWith(PAIR_DISCLAIMER));
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
    assert.equal(FOR_PROGRAMS_MAILTO, "mailto:FirstPassInteractions@gmail.com?subject=FirstPass%20group%20license%20inquiry");
    assert.ok(html.includes(`href="${FOR_PROGRAMS_MAILTO}"`));
    for (const a of ["Pharmacy schools", "Pharmacy-tech programs", "Ketamine clinics", "MAT and OTP programs", "Harm-reduction groups"]) assert.ok(body.includes(a), a);
  });

  it("is in the sitemap and linked from /pairs", () => {
    assert.ok(sitemapXml().includes(`<loc>${FOR_PROGRAMS_URL}</loc>`));
    assert.ok(renderToStaticMarkup(createElement(PairsIndexView, { pages: pairPages() })).includes('href="/for-programs"'));
  });
});

describe("/for-programs tiers", () => {
  it("renders a card for every tier from the contract", () => {
    assert.equal(PROGRAM_TIERS.length, 3);
    for (const t of PROGRAM_TIERS) {
      const start = html.indexOf(`data-testid="tier-${t.id}"`);
      assert.ok(start > 0, t.id);
      const card = text(html.slice(start, html.indexOf("</li>", html.indexOf(`Ask about ${t.name}`, start))));
      assert.ok(card.includes(t.name), t.name);
      assert.ok(card.includes(t.tagline), t.tagline);
      assert.ok(card.includes(`${formatUsd(t.annual)} per year`), `${t.id} price`);
      assert.ok(card.includes(seatsLabel(t)), `${t.id} seats`);
      assert.ok(card.includes(t.fits), `${t.id} fits`);
      for (const f of t.features) assert.ok(card.includes(f), f);
    }
  });

  it("says Unlimited at one organization when seats is null, and highlights the highlighted tier", () => {
    const site = PROGRAM_TIERS.find((t) => t.seats === null)!;
    assert.equal(seatsLabel(site), "Unlimited at one organization");
    assert.equal(seatsLabel(PROGRAM_TIERS[0]!), `Up to ${PROGRAM_TIERS[0]!.seats} people`);
    for (const t of PROGRAM_TIERS) {
      const open = html.match(new RegExp(`<li data-testid="tier-${t.id}" class="([^"]*)"`));
      assert.ok(open, t.id);
      assert.equal(/(^|\s)ring-accent(\s|$)/.test(open[1]!), Boolean(t.highlighted), t.id);
    }
    assert.equal((html.match(/A good place to start/g) ?? []).length, PROGRAM_TIERS.filter((t) => t.highlighted).length);
  });

  it("formats dollars the same way everywhere", () => {
    assert.equal(formatUsd(2400), "$2,400");
    assert.equal(formatUsd(690), "$690");
    assert.equal(formatUsdCents(24), "$24.00");
    assert.equal(formatUsdCents(4.425), "$4.43");
  });

  it("keeps the honest comparison with Founding", () => {
    assert.equal(
      FOR_PROGRAMS_COMPARISON,
      `One person can still buy Founding for $${COMMERCE.founding} once. A program buys one key for everyone, renewed each year, paid by invoice or purchase order.`,
    );
    assert.equal(COMMERCE.founding, 79);
    assert.ok(body.includes(FOR_PROGRAMS_COMPARISON));
  });
});

describe("/for-programs estimator", () => {
  it("server-renders the default estimate from programQuote", () => {
    const q = programQuote(DEFAULT_ESTIMATE_SEATS, 1);
    const est = text(html.slice(html.indexOf('data-testid="estimate"'), html.indexOf("Ask for this quote")));
    assert.ok(est.includes(`For ${DEFAULT_ESTIMATE_SEATS} people, 1 year`), est);
    assert.ok(est.includes(`${q.tier.name} license`));
    assert.ok(est.includes(`Total for 1 year ${formatUsd(q.total)}`), est);
    assert.ok(est.includes(`Per year ${formatUsd(q.perYear)}`));
    assert.ok(est.includes(`Per seat per year ${formatUsdCents(q.perSeatPerYear)}`));
    assert.ok(est.includes(FOR_PROGRAMS_ESTIMATE_NOTE));
    assert.equal(FOR_PROGRAMS_ESTIMATE_NOTE, "Estimate. We confirm every quote in writing.");
    assert.ok(html.includes('<label for="est-seats"'));
    assert.ok(html.includes('<label for="est-years"'));
  });

  it("shows the quote math for any seat count and term", () => {
    for (const [seats, years] of [
      ["1", 1],
      ["15", 1],
      ["16", 2],
      ["100", 3],
      ["101", 1],
      ["250", 3],
      ["1,200", 2],
      ["100000", 3],
    ] as const) {
      const q = programQuote(parseSeats(seats)!, years);
      const out = estimate(seats, years);
      assert.ok(out.includes(`${q.tier.name} license`), `${seats}: ${out}`);
      assert.ok(out.includes(formatUsd(q.total)), `${seats} total`);
      assert.ok(out.includes(formatUsd(q.perYear)), `${seats} per year`);
      assert.ok(out.includes(formatUsdCents(q.perSeatPerYear)), `${seats} per seat`);
      assert.ok(out.includes(FOR_PROGRAMS_ESTIMATE_NOTE));
      if (years > 1) assert.ok(out.includes(`${Math.round(MULTI_YEAR_DISCOUNT[years] * 100)}% off`), `${seats} discount`);
    }
  });

  it("matches the contract's numbers for a known case", () => {
    const out = estimate("40", 2);
    assert.ok(out.includes("Program license"));
    assert.ok(out.includes("$3,420"));
    assert.ok(out.includes("$1,710"));
    assert.ok(out.includes("$42.75"));
    assert.ok(out.includes("10% off"));
  });

  it("asks for a real number instead of guessing", () => {
    for (const bad of ["", "0", "-3", "2.5", "abc", "100001"]) {
      assert.equal(parseSeats(bad), null, bad);
      assert.match(estimate(bad, 1), /Enter a whole number of people from 1 to 100,000/);
    }
    assert.equal(parseSeats(" 1,200 "), 1200);
  });

  it("says when Founding for each person costs less", () => {
    const small = programEstimate(5, 1);
    assert.equal(small.foundingTotal, 5 * COMMERCE.founding);
    assert.match(estimate("5", 1), /Founding at \$79 once each comes to \$395, less than a year of Team/);
    assert.equal(programEstimate(40, 1).foundingTotal, null);
    assert.ok(!estimate("40", 1).includes("once each"));
  });
});

describe("/for-programs key, procurement and inquiry sections", () => {
  it("explains how a program key works without accounts or stored learner data", () => {
    const steps = FOR_PROGRAMS_KEY_STEPS.join(" ");
    assert.match(steps, /one program key/);
    assert.match(steps, /Plans/);
    assert.match(steps, /Redeem/);
    assert.match(steps, /end month/);
    assert.match(steps, /no accounts/i);
    assert.match(steps, /keep nothing about the learners/);
    assert.doesNotMatch(steps, /store nothing/);
    assert.match(steps, /name and email of the person who buys it/);
    for (const s of FOR_PROGRAMS_KEY_STEPS) assert.ok(body.includes(s), s);
  });

  it("answers the procurement questions and links to /trust", () => {
    const faq = FOR_PROGRAMS_FAQ.map((f) => `${f.q} ${f.a}`).join(" ");
    assert.match(faq, /invoice/);
    assert.match(faq, /purchase orders?/);
    assert.match(faq, /W-9/);
    assert.match(faq, /no PHI/);
    assert.match(faq, /never take patient information/);
    assert.match(faq, /any modern browser/);
    assert.match(faq, /accessibility conformance report/);
    assert.match(faq, /not FDA-cleared/);
    assert.ok(html.includes('href="/trust"'));
    for (const f of FOR_PROGRAMS_FAQ) assert.ok(body.includes(f.q), f.q);
  });

  it("labels every inquiry field and hides the honeypot from people", () => {
    for (const f of ["name", "email", "organization", "role", "programType", "seats", "years", "start", "message"]) {
      assert.ok(html.includes(`<label for="inq-${f}"`), `label for ${f}`);
      assert.ok(html.includes(`id="inq-${f}"`), `field ${f}`);
    }
    for (const p of PROGRAM_TYPES) assert.ok(html.includes(`<option value="${p}">`), p);
    assert.equal(PROGRAM_TYPES[PROGRAM_TYPES.length - 1], "Other");
    const pot = html.slice(html.indexOf('aria-hidden="true" class="absolute'), html.indexOf("Send inquiry"));
    assert.ok(pot.includes('name="homepage"'));
    assert.ok(pot.includes('tabindex="-1"'));
    assert.ok(html.includes('role="alert"'));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('placeholder="Spring 2027"'));
  });
});

describe("/for-programs JSON-LD", () => {
  it("lists the three tiers with no pricing", () => {
    const ld = forProgramsJsonLd();
    assert.equal(ld["@type"], "Service");
    assert.equal(ld.url, FOR_PROGRAMS_URL);
    assert.deepEqual(
      ld.hasOfferCatalog.itemListElement.map((o) => o.name),
      PROGRAM_TIERS.map((t) => `${t.name} license`),
    );
    const s = JSON.stringify(ld);
    assert.ok(!/aggregateRating|review|"Pro"|price|\$\s?\d|USD/i.test(s));
    assert.ok(!BANNED.test(s));
  });
});
