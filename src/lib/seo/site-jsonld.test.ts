import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { siteJsonLd } from "./site-jsonld";

describe("site JSON-LD", () => {
  it("has WebSite + Organization, no pricing or clinical claims", () => {
    const ld = siteJsonLd();
    assert.deepEqual(ld["@graph"].map((n) => n["@type"]), ["WebSite", "Organization"]);
    const s = JSON.stringify(ld);
    assert.doesNotMatch(s, /price|offer|\$\s?\d|\bfree\b|Medical|diagnos|treat/i);
  });
  it("key public routes ship a BreadcrumbList", () => {
    for (const r of ["privacy", "terms", "cookies", "trust", "for-programs", "pairs", "enzymes", "pair.$slug", "drug.$slug", "enzyme.$slug"]) {
      assert.match(readFileSync(`src/routes/${r}.tsx`, "utf8"), /breadcrumbMeta\(/, r);
    }
  });
});
