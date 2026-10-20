import { test } from "node:test";
import assert from "node:assert/strict";
import { OG_BANNED, OG_DISCLAIMER, ogAlt, ogImageJobs, ogMeta } from "./og";
import { pairPages } from "./pair-pages";
import { drugHubs } from "./drug-hubs";

test("one share image per pair page, drug hub and static page, unique paths", () => {
  const jobs = ogImageJobs();
  assert.equal(jobs.length, pairPages().length + drugHubs().length + 2);
  assert.equal(new Set(jobs.map((j) => j.path)).size, jobs.length);
  for (const j of jobs) assert.match(j.path, /^\/og\/(pair|drug|page)\/[a-z0-9-]+\.png$/);
});

test("share image text and alt never use banned wording", () => {
  for (const j of ogImageJobs()) {
    for (const text of [j.kicker, j.heading, j.sub, j.gradeLabel ?? "", ogAlt(j), OG_DISCLAIMER]) {
      for (const re of OG_BANNED) assert.ok(!re.test(text), `${j.path}: "${text}" matches ${re}`);
    }
  }
});

test("ogMeta emits og:image with dimensions and a large twitter card", () => {
  const m = ogMeta({ title: "T", description: "D", url: "https://x/p", image: "https://x/og/p.png", alt: "A" });
  const get = (k: string) => m.find((t) => ("property" in t ? t.property : t.name) === k)?.content;
  assert.equal(get("og:image"), "https://x/og/p.png");
  assert.equal(get("og:image:width"), "1200");
  assert.equal(get("og:image:height"), "630");
  assert.equal(get("twitter:card"), "summary_large_image");
  assert.equal(get("twitter:image:alt"), "A");
});
