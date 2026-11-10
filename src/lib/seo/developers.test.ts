import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DevelopersView } from "@/components/seo/developers-page";
import { API_LIMITS, API_TIERS } from "@/lib/billing/api-tiers";
import { NOT_CLEARED, STATUTORY_CDS_DISCLAIMER } from "@/lib/regulatory";
import { STATUTORY_CDS_DISCLAIMER as SERVED_DISCLAIMER } from "@/lib/server/api/cds-service";
import { PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";
import {
  DEVELOPERS_DESCRIPTION,
  DEVELOPERS_ENDPOINTS,
  DEVELOPERS_MAILTO,
  DEVELOPERS_TITLE,
  DEVELOPERS_URL,
} from "./developers";
import { sitemapXml } from "./pair-pages";

const html = renderToStaticMarkup(createElement(DevelopersView));
const decode = (h: string) =>
  h.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const body = decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const all = [DEVELOPERS_TITLE, DEVELOPERS_DESCRIPTION, body].join(" ");

/** Clearances and certifications FirstPass does not hold; each may appear only in a negated sentence. */
const CERT =
  /SOC ?2|ISO ?27001|HITRUST|FedRAMP|HIPAA[- ]complian(t|ce)|FDA[- ](cleared|approved|registered)(?! (Prescribing Information|labeling|label))|510\(k\)|cleared by the (U\.S\. )?(FDA|Food and Drug Administration)|clinically validated|reviewed by (a )?(pharmacists?|clinicians?)/gi;
const NEGATION = /\b(not|no|never|without|nor|none|neither|has not|have not|isn't|is not|does not)\b/i;

function affirmativeClaims(s: string): string[] {
  const out: string[] = [];
  for (const sentence of s.split(/(?<=[.!?])\s+/)) {
    for (const m of sentence.matchAll(CERT)) {
      if (!NEGATION.test(sentence.slice(0, m.index))) out.push(sentence.trim());
    }
  }
  return out;
}

describe("/developers", () => {
  it("lives at /developers and is in the sitemap", () => {
    assert.equal(DEVELOPERS_URL, `${SITE_URL}/developers`);
    assert.ok(sitemapXml().includes(`<loc>${SITE_URL}/developers</loc>`));
  });

  it("states the education-only use and rules out clinical systems and EHR alerting", () => {
    assert.match(body, /For education and teaching content only\./);
    assert.match(body, /Do not use the API for patient-specific alerting inside an EHR/);
    assert.match(body, /not a drug-interaction alerting service/);
    assert.match(body, /Do not send a real patient's details/);
  });

  it("shows the same disclaimer the API serves, the not-cleared line and the page disclaimer", () => {
    assert.equal(STATUTORY_CDS_DISCLAIMER, SERVED_DISCLAIMER);
    assert.ok(body.includes(STATUTORY_CDS_DISCLAIMER));
    assert.ok(body.includes(NOT_CLEARED));
    assert.ok(body.includes(PAIR_DISCLAIMER));
    assert.ok(DEVELOPERS_DESCRIPTION.includes(PAIR_DISCLAIMER));
  });

  it("documents every endpoint, both ways to send a key, the limits and the error shapes", () => {
    for (const e of DEVELOPERS_ENDPOINTS) assert.ok(body.includes(e.path), e.path);
    for (const p of ["/api/cds/health", "/api/cds/search", "/api/cds/check", "/api/cds/kinetics"]) {
      assert.ok(DEVELOPERS_ENDPOINTS.some((e) => e.path === p), p);
    }
    assert.match(body, /Authorization: Bearer <key>/);
    assert.match(body, /x-api-key/);
    assert.ok(body.includes(`${API_LIMITS.anonymous.max} requests per minute, per address`));
    for (const t of API_TIERS) assert.ok(body.includes(`${API_LIMITS[t.id].max.toLocaleString("en-US")} requests per minute, per key`), t.id);
    for (const s of [
      "400",
      "401",
      "404",
      "405",
      "Allow",
      "413",
      "10 MiB",
      "415",
      "Content-Type",
      "application/json",
      "422",
      "429",
      "503",
      "Retry-After",
      "RateLimit-Remaining",
      "Cache-Control: no-store",
      "X-Content-Type-Options: nosniff",
      "application/problem+json",
      "RFC 7807",
    ]) {
      assert.ok(body.includes(s), s);
    }
    assert.match(body, /1,000-node item budget/);
  });

  it("has no prices: licensing goes to the FirstPass mailbox", () => {
    assert.doesNotMatch(all, /\$\s?\d|\bUSD\b|per (year|month|seat)|\/yr\b|\bfree trial\b/i);
    assert.match(DEVELOPERS_MAILTO, /^mailto:FirstPassInteractions@gmail\.com\?subject=/);
    assert.ok(html.includes(`href="${DEVELOPERS_MAILTO.replace(/&/g, "&amp;")}"`));
    assert.match(body, /Contact for education licensing/);
  });

  it("claims no clearance or certification", () => {
    assert.deepEqual(affirmativeClaims(all), []);
  });
});
