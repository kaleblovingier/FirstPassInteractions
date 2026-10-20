import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PairDisclaimer, PairsIndexView } from "@/components/seo/pair-page";
import { LIFETIME_TERMS, NOT_AFFILIATED_LINE, TERMS_DOC, TRADEMARK_LINE } from "@/lib/seo/legal";
import { FOR_PROGRAMS_KEY_STEPS } from "@/lib/seo/for-programs";
import { TRUST_SECTIONS } from "@/lib/seo/trust";

describe("legal follow-ups", () => {
  it("/terms defines lifetime, including shutdown", () => {
    const terms = TERMS_DOC.sections.flatMap((s) => s.paras).join(" ");
    assert.ok(terms.includes(LIFETIME_TERMS));
    assert.match(LIFETIME_TERMS, /stops offering the desk/);
    assert.doesNotMatch(LIFETIME_TERMS, /\bPro\b|\bfree\b|\d+\s?mg/i);
  });
  it("/pairs says not affiliated with FDA or NLM, and the disclaimer carries the trademark line", () => {
    assert.ok(renderToStaticMarkup(createElement(PairsIndexView, { pages: [] })).includes(NOT_AFFILIATED_LINE));
    assert.ok(renderToStaticMarkup(createElement(PairDisclaimer)).includes(TRADEMARK_LINE));
  });
  it("/for-programs no longer claims to store nothing", () => {
    assert.doesNotMatch(FOR_PROGRAMS_KEY_STEPS.join(" "), /store nothing/);
  });
});

describe("/trust payments line", () => {
  it("names Venmo, Cash App and PayPal and says Stripe is not live", () => {
    const pay = JSON.stringify(TRUST_SECTIONS).match(/Founding is paid by[^"]*/)?.[0] ?? "";
    assert.match(pay, /Venmo, Cash App or PayPal/);
    assert.match(pay, /Stripe checkout is built but switched off\./);
    assert.doesNotMatch(pay, /runs on Stripe|Stripe's hosted checkout/i);
  });
});

describe("MarketingFirstPass wording", () => {
  const all = (d: { sections: readonly { paras: readonly string[] }[] }) => d.sections.flatMap((s) => s.paras).join(" ");
  it("carries the exact lines", async () => {
    const { COOKIES_DOC, PRIVACY_DOC } = await import("@/lib/seo/legal");
    const terms = all(TERMS_DOC);
    for (const line of [
      "Educational reference only. Not FDA-cleared. The Prescribing Information governs.",
      "FirstPass is not affiliated with or endorsed by the FDA, the National Library of Medicine (NLM) or any drug manufacturer.",
      "Do not use FirstPass for self-treatment. If you are a patient, ask your pharmacist or clinician about your medicines.",
      "Lab-book receipts are not CE credit and are not accredited continuing education.",
      "If FirstPass stops offering the desk, the license ends and no further updates are owed.",
    ]) assert.ok(terms.includes(line), line);
    assert.doesNotMatch(TERMS_DOC.sections.find((x) => x.id === "license")!.paras.join(" "), /\$\d|\bPro\b/);
    assert.ok(all(COOKIES_DOC).includes("FirstPass has no database for it. Your license key is sent to the server only to check it, and isn't stored."));
    assert.ok(all(PRIVACY_DOC).includes("designed not to record request contents, emails or keys."));
  });
  it("legal pages show the draft note", async () => {
    const { LegalView } = await import("@/components/seo/legal-page");
    assert.ok(renderToStaticMarkup(createElement(LegalView, { doc: TERMS_DOC })).includes("Draft. These terms have not yet been reviewed by an attorney."));
  });
});

describe("/privacy payments", () => {
  it("does not say checkout runs on Stripe and names the live methods", async () => {
    const { PRIVACY_DOC } = await import("@/lib/seo/legal");
    const p = PRIVACY_DOC.sections.flatMap((s) => s.paras).join(" ");
    assert.doesNotMatch(p, /runs on Stripe|Stripe's hosted checkout|Card payments run/i);
    assert.match(p, /Stripe checkout is built but switched off\./);
    assert.match(p, /designed not to record request contents, emails or keys\./);
    assert.match(p, /Venmo, Cash App or PayPal/);
    assert.match(p, /If card checkout is added later, this policy will be updated/);
  });
});

describe("/terms disclaimer line", () => {
  it("uses the exact disclaimer and drops the local-protocols phrase", () => {
    const what = TERMS_DOC.sections.find((s) => s.id === "what")!.paras.join(" ");
    assert.ok(what.includes("Educational reference only. Not FDA-cleared. The Prescribing Information governs."));
    assert.doesNotMatch(what, /local protocols before acting/i);
  });
});

describe("lost-key recovery wording", () => {
  it("says recovery checks only card purchases and drops the Stripe lookup claims", async () => {
    const { PRIVACY_DOC } = await import("@/lib/seo/legal");
    const R = "Lost-key recovery checks only card purchases, and card checkout is switched off. If you paid by Venmo, Cash App or PayPal, email FirstPassInteractions@gmail.com to have your key resent.";
    const trust = JSON.stringify(TRUST_SECTIONS);
    const priv = PRIVACY_DOC.sections.flatMap((s) => s.paras).join(" ");
    for (const t of [trust, priv]) {
      assert.ok(t.includes(R));
      assert.doesNotMatch(t, /checked against Stripe|derived again from its Stripe/);
    }
    assert.ok(trust.includes("The operator issues each Founding key after matching the payment, and the key is sent in an email to the buyer."));
  });
});
