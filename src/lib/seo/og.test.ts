import { test } from "node:test";
import assert from "node:assert/strict";
import { OG_BANNED, OG_DISCLAIMER, ogAlt, ogImageJobs, ogMeta, ogImagePath, pairOgJob } from "./og";
import { SEVERITY_LABEL } from "@/lib/drugs/types";
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

test("every card carries the full disclaimer", () => {
  assert.equal(OG_DISCLAIMER, "Educational reference only. Not FDA-cleared. The Prescribing Information governs.");
  for (const j of ogImageJobs()) assert.equal(j.disclaimer, OG_DISCLAIMER, j.path);
});

test("every pair card's grade equals the grade on its pair page", () => {
  const byPath = new Map(ogImageJobs().map((j) => [j.path, j]));
  for (const p of pairPages()) {
    const j = byPath.get(ogImagePath("pair", p.slug));
    assert.ok(j, `missing card for ${p.slug}`);
    assert.deepEqual(j, pairOgJob(p));
    assert.equal(j.severity, p.severity, p.slug);
    assert.equal(j.gradeLabel, p.severityLabel, p.slug);
    assert.equal(j.gradeLabel, SEVERITY_LABEL[p.severity as keyof typeof SEVERITY_LABEL], p.slug);
  }
});
