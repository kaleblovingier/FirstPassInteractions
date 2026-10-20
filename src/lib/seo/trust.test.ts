import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TrustView } from "@/components/seo/trust-page";
import { INTENDED_USERS, NOT_CLEARED, NOT_FOR, SOFTWARE, WARNINGS } from "@/lib/regulatory";
import { PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";
import {
  PROCUREMENT_MAILTO,
  REPO_URL,
  TRUST_DESCRIPTION,
  TRUST_SECTIONS,
  TRUST_TITLE,
  TRUST_URL,
  repoFile,
  trustSourcePaths,
} from "./trust";

const html = renderToStaticMarkup(createElement(TrustView));
const decode = (h: string) =>
  h.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (h: string) => decode(h.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const body = text(html);
const all = [TRUST_TITLE, TRUST_DESCRIPTION, body];

/** Dose instructions: amounts with units, frequencies, titration verbs. */
const DOSE =
  /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|mL|units?|IU)\b|\b(once|twice|three times|four times) (a|per|daily)\b|\bevery \d+\s?(h|hours?)\b|\b(take \d|reduce the dose|increase the dose|titrate|max(imum)? dose)\b/i;

/**
 * Certifications and clearances FirstPass does not hold. Each may appear only in a negated sentence.
 * "FDA-approved Prescribing Information" names the drug's label, not FirstPass, so it is exempt.
 */
const CERT =
  /SOC ?2|ISO ?27001|HITRUST|FedRAMP|HIPAA[- ]complian(t|ce)|HIPAA[- ]certified|FDA[- ](cleared|approved)(?! (Prescribing Information|labeling|label))|cleared by the (U\.S\. )?(FDA|Food and Drug Administration)|clinically validated|pharmacist[- ](reviewed|built|vetted)|reviewed by (a )?pharmacists?/gi;
const NEGATION = /\b(not|no|never|without|nor|none|neither|has not|have not|isn't|is not|does not)\b/i;

/** Affirmative certification claims: a CERT match with no negation earlier in its sentence. */
function affirmativeClaims(s: string): string[] {
  const out: string[] = [];
  for (const sentence of s.split(/(?<=[.!?])\s+/)) {
    for (const m of sentence.matchAll(CERT)) {
      const before = sentence.slice(0, m.index);
      if (!NEGATION.test(before)) out.push(sentence.trim());
    }
  }
  return out;
}

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

describe("/trust page", () => {
  it("has the title, description and canonical", () => {
    assert.equal(TRUST_TITLE, "Trust, privacy and validation | FirstPass");
    assert.equal(TRUST_URL, `${SITE_URL}/trust`);
    assert.ok(TRUST_DESCRIPTION.endsWith(PAIR_DISCLAIMER));
    assert.ok(TRUST_DESCRIPTION.length <= 200, `description is ${TRUST_DESCRIPTION.length} characters`);
  });

  it("ends with the pair disclaimer and has one h1", () => {
    assert.equal(PAIR_DISCLAIMER, "Educational reference only. Not FDA-cleared. The Prescribing Information governs.");
    assert.ok(html.includes('data-testid="pair-disclaimer"'));
    assert.ok(body.includes(PAIR_DISCLAIMER));
    assert.ok(html.lastIndexOf('data-testid="pair-disclaimer"') > html.lastIndexOf("<section"));
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
  });

  it("takes intended use and limits from regulatory.ts", () => {
    for (const s of [INTENDED_USERS, NOT_CLEARED, ...NOT_FOR, ...WARNINGS]) assert.ok(body.includes(s), s);
    assert.ok(body.includes(`FirstPass ${SOFTWARE.version}`));
  });

  it("has every section, the procurement contact and the programs link", () => {
    for (const id of ["what", "privacy", "security", "content", "accessibility", "procurement"]) {
      assert.ok(html.includes(`id="${id}"`), id);
      assert.ok(html.includes(`href="#${id}"`), `nav link to ${id}`);
    }
    assert.ok(body.includes("Questionnaires (HECVAT Lite, vendor security forms), W-9 and invoices on request."));
    assert.equal(PROCUREMENT_MAILTO, "mailto:FirstPassInteractions@gmail.com?subject=FirstPass%20procurement%20request");
    assert.ok(html.includes(`href="${PROCUREMENT_MAILTO}"`));
    assert.ok(body.includes("FirstPassInteractions@gmail.com"));
    assert.ok(html.includes('href="/for-programs"'));
  });

  it("says no PHI, no analytics, no clinician review yet, and that the ACR is a draft", () => {
    assert.match(body, /Do not enter patient information\./);
    assert.match(body, /protected health information \(PHI\)/);
    assert.match(body, /no analytics/i);
    assert.match(body, /No clinician has reviewed this content yet\./);
    assert.match(text(html.slice(html.indexOf('id="accessibility"'))), /It is a draft\./);
  });

  it("no Pro buyer wording, no dose instructions, no decision-support or patient-facing wording", () => {
    const BANNED = /\bPro\b|clinical decision support|decision support|\bCDS\b|ask your (doctor|pharmacist)|your doctor/i;
    for (const s of all) {
      assert.ok(!BANNED.test(s), s.match(BANNED)?.[0]);
      assert.ok(!DOSE.test(s), s.match(DOSE)?.[0]);
    }
    assert.ok(body.includes("Founding"));
  });

  it("claims no certification it does not hold", () => {
    for (const s of all) assert.deepEqual(affirmativeClaims(s), []);
    // The checker itself catches an affirmative claim and lets a negated one through.
    assert.equal(affirmativeClaims("FirstPass is SOC 2 certified.").length, 1);
    assert.equal(affirmativeClaims("The desk is HIPAA compliant.").length, 1);
    assert.equal(affirmativeClaims("FirstPass is FDA-cleared.").length, 1);
    assert.equal(affirmativeClaims("FirstPass is FDA-approved software.").length, 1);
    assert.equal(affirmativeClaims("The FDA-approved Prescribing Information is the authority.").length, 0);
    assert.equal(affirmativeClaims("FirstPass has no SOC 2 report. It is not FDA-cleared.").length, 0);
  });

  it("every GitHub link points to a file that exists in this repository", () => {
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => decode(m[1]!));
    const github = hrefs.filter((h) => h.startsWith("https://github.com/"));
    assert.ok(github.length >= 20, `only ${github.length} GitHub links`);
    const prefix = `${REPO_URL}/blob/main/`;
    for (const href of github) {
      assert.ok(href.startsWith(prefix), href);
      const path = href.slice(prefix.length);
      assert.ok(!path.includes("..") && !path.startsWith("/"), href);
      const abs = `${repoRoot}${path}`;
      assert.ok(existsSync(abs) && statSync(abs).isFile(), `missing: ${path}`);
    }
    for (const path of trustSourcePaths()) assert.ok(github.includes(repoFile(path)), `not linked: ${path}`);
  });

  it("every section names its sources", () => {
    for (const s of TRUST_SECTIONS) assert.ok(s.sources.length > 0, s.id);
  });
});
