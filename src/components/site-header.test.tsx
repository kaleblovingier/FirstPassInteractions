import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteHeader } from "./site-header";
import { SITE_LINKS, showsSiteHeader } from "@/lib/seo/site-nav";

const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

describe("SiteHeader", () => {
  it("starts with a skip link, then the desk, then each section", () => {
    const html = renderToStaticMarkup(<SiteHeader pathname="/pair/warfarin-fluconazole" />);
    assert.deepEqual(hrefs(html), ["#content", "/", ...SITE_LINKS.map((l) => l.href)]);
    assert.match(html, /<header[^>]*>/);
    assert.match(html, /<nav aria-label="Site">/);
    assert.doesNotMatch(html, /aria-current/);
  });

  it("marks the page you are on", () => {
    const html = renderToStaticMarkup(<SiteHeader pathname="/practice" />);
    assert.equal(html.match(/aria-current="page"/g)?.length, 1);
    assert.match(html, /href="\/practice" aria-current="page"/);
  });

  it("links only to routes this app serves", () => {
    for (const { href } of SITE_LINKS) {
      const file = new URL(`../routes${href}.tsx`, import.meta.url);
      assert.ok(existsSync(file), `${href} has no route file`);
    }
  });

  it("stays off the desk and the API", () => {
    assert.equal(showsSiteHeader("/"), false);
    assert.equal(showsSiteHeader("/api/cds/hooks"), false);
    assert.equal(showsSiteHeader("/pairs"), true);
    assert.equal(showsSiteHeader("/drug/warfarin"), true);
  });
});
