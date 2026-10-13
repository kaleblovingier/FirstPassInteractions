import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ForProgramsView } from "@/components/seo/for-programs-page";
import { PairsIndexView } from "@/components/seo/pair-page";
import { pairPages, sitemapXml } from "./pair-pages";
import { PAIR_DISCLAIMER } from "./pair-copy";
import { FOR_PROGRAMS_DESCRIPTION, FOR_PROGRAMS_MAILTO, FOR_PROGRAMS_TITLE, FOR_PROGRAMS_URL } from "./for-programs";

const html = renderToStaticMarkup(createElement(ForProgramsView));
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
const DOSE = /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|mL|units?|IU)\b|\b(once|twice|three times|four times) (a|per|daily)\b|\bevery \d+\s?(h|hours?)\b|\b(take \d|reduce the dose|increase the dose|titrate|max(imum)? dose|dos(e|es|ing|age))\b/i;
const BANNED = /clinical decision support|decision support|\bCDS\b|\bfree\b|pric(e|ing)|\$\d|\bcost\b|\bPro\b/i;

describe("/for-programs page", () => {
  it("no Pro, free, pricing, dose or CDS wording in title, meta or body", () => {
    for (const s of [FOR_PROGRAMS_TITLE, FOR_PROGRAMS_DESCRIPTION, text(html)]) {
      assert.ok(!BANNED.test(s), s.match(BANNED)?.[0]);
      assert.ok(!DOSE.test(s), s.match(DOSE)?.[0]);
    }
    assert.ok(text(html).includes("Founding"));
  });

  it("has the disclaimer, one h1 and a prefilled mailto", () => {
    assert.equal(PAIR_DISCLAIMER, "Educational reference only. Not FDA-cleared. The Prescribing Information governs.");
    assert.ok(text(html).includes(PAIR_DISCLAIMER));
    assert.ok(FOR_PROGRAMS_DESCRIPTION.endsWith(PAIR_DISCLAIMER));
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
    assert.equal(FOR_PROGRAMS_MAILTO, "mailto:FirstPassInteractions@gmail.com?subject=FirstPass%20group%20license%20inquiry");
    assert.ok(html.includes(`href="${FOR_PROGRAMS_MAILTO}"`));
    for (const a of ["Pharmacy schools", "Pharmacy-tech programs", "Ketamine clinics", "MAT and OTP programs", "Harm-reduction groups"]) assert.ok(text(html).includes(a), a);
  });

  it("is in the sitemap and linked from /pairs", () => {
    assert.ok(sitemapXml().includes(`<loc>${FOR_PROGRAMS_URL}</loc>`));
    assert.ok(renderToStaticMarkup(createElement(PairsIndexView, { pages: pairPages() })).includes('href="/for-programs"'));
  });
});
