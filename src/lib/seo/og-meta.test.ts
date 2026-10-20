import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_OG_ALT, DEFAULT_OG_IMAGE, siteOgMeta } from "./og-meta";
import { OG_BANNED, STATIC_OG_JOBS, ogAlt, ogImageUrl } from "./og";

describe("og-meta defaults", () => {
  it("default card is the /pairs card with matching alt", () => {
    assert.equal(DEFAULT_OG_IMAGE, ogImageUrl("page", "pairs"));
    assert.equal(DEFAULT_OG_ALT, ogAlt(STATIC_OG_JOBS[0]));
    assert.match(DEFAULT_OG_IMAGE, /^https:\/\//);
  });
  it("siteOgMeta emits every required tag", () => {
    const m = siteOgMeta({ title: "T", description: "D", url: "https://x/" });
    const keys = m.map((t) => ("property" in t ? t.property : t.name));
    for (const k of ["og:title", "og:description", "og:image", "og:image:alt", "twitter:card"]) assert.ok(keys.includes(k), k);
  });
  it("every public route head ships a share card", () => {
    for (const r of ["__root", "privacy", "terms", "cookies", "trust", "enzymes", "pairs", "for-programs", "pair.$slug", "drug.$slug", "enzyme.$slug"]) {
      const src = readFileSync(`src/routes/${r}.tsx`, "utf8");
      assert.match(src, /\b(siteOgMeta|ogMeta)\(/, r);
    }
  });
  it("root description has no banned share words", () => {
    const src = readFileSync("src/routes/__root.tsx", "utf8");
    const desc = src.match(/SITE_DESCRIPTION =\s*"([^"]+)"/)![1];
    for (const re of OG_BANNED) assert.doesNotMatch(desc, re);
  });
});
