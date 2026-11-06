import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HelpView } from "@/components/seo/help-page";
import { HELP_DESCRIPTION, HELP_PATH, HELP_SCOPE, HELP_TITLE, HELP_URL } from "./help";
import { SITE_URL } from "./pair-copy";
import { sitemapXml } from "./pair-pages";

const html = renderToStaticMarkup(createElement(HelpView));
const text = html
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, " ");

/** Dose instructions, as in trust.test.ts: amounts with units, frequencies, titration verbs. */
const DOSE =
  /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|mL|units?|IU)\b|\b(once|twice|three times|four times) (a|per|daily)\b|\bevery \d+\s?(h|hours?)\b|\b(take \d|reduce the dose|increase the dose|titrate|max(imum)? dose)\b/i;

describe("/help page", () => {
  it("prerenders, is in the sitemap, and has its route", () => {
    const vite = readFileSync("vite.config.ts", "utf8");
    assert.ok(vite.includes(`{ path: "${HELP_PATH}" }`), "in prerender pages");
    assert.ok(vite.includes(`path === "${HELP_PATH}"`), "in prerender filter");
    assert.ok(sitemapXml().includes(`<loc>${SITE_URL}${HELP_PATH}</loc>`));
    assert.ok(readFileSync("src/routes/help.tsx", "utf8").includes(`createFileRoute("${HELP_PATH}")`));
    assert.equal(HELP_URL, `${SITE_URL}/help`);
  });

  it("has one h1, says it is for anyone, and carries the lines", () => {
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
    assert.ok(text.includes(HELP_SCOPE));
    for (const s of ["911", "988", "1-800-662-4357", "1-800-484-3731", "Never Use Alone", "FindTreatment.gov", "naloxone"]) {
      assert.ok(text.includes(s), s);
    }
  });

  it("carries no drug-combination analysis, no desk, and no decision-support or dose wording", () => {
    const src = readFileSync("src/components/seo/help-page.tsx", "utf8");
    for (const [, from] of src.matchAll(/from "([^"]+)"/g)) {
      assert.ok(!/drugs\/(?!help-resources)|components\/desk|billing/.test(from!), from);
    }
    for (const s of [HELP_TITLE, HELP_DESCRIPTION, text]) {
      const banned = s.match(/decision support|\bCDS\b|TripSit|PsychonautWiki|regimen|collision/i);
      assert.equal(banned, null, banned?.[0]);
      assert.ok(!DOSE.test(s), s.match(DOSE)?.[0]);
    }
  });

  it("the desk's Find help tab links to the page and no longer holds the public directory", () => {
    const desk = readFileSync("src/components/desk/help.tsx", "utf8");
    assert.ok(desk.includes("href={HELP_PATH}"));
    assert.ok(!/NATIONAL_LINES|localLinks|Never Use Alone \(1-800/.test(desk));
  });
});
