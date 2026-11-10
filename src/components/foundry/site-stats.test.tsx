import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { SiteStats } from "@/lib/analytics/contract";
import { findDoses } from "@/lib/guards/dose-rule";
import { SiteStatsDesk } from "./site-stats";

const SAMPLE_STATS: SiteStats = {
  enabled: true,
  days: 7,
  totals: { views: 1420, visitors: 512 },
  daily: [
    { day: "2026-11-03", views: 110, visitors: 48 },
    { day: "2026-11-04", views: 0, visitors: 0 },
    { day: "2026-11-05", views: 195, visitors: 74 },
    { day: "2026-11-06", views: 340, visitors: 120 },
    { day: "2026-11-07", views: 265, visitors: 96 },
    { day: "2026-11-08", views: 290, visitors: 102 },
    { day: "2026-11-09", views: 220, visitors: 72 },
  ],
  pages: [
    { path: "/", views: 620, visitors: 240 },
    { path: "/pairs", views: 410, visitors: 165 },
  ],
  referrers: [{ host: "google.com", views: 180 }],
  countries: [{ code: "US", views: 1120 }],
  devices: [
    { device: "desktop", views: 994 },
    { device: "phone", views: 426 },
  ],
};

const BANNED_REGULATORY_RE =
  /\b(?:FDA[- ]cleared|FDA[- ]registered|510\(k\)[- ]cleared|FDA[- ]approved|clinically (?:validated|proven|tested|verified)|medically reviewed|HIPAA[- ]compliant)\b/i;

const source = readFileSync(new URL("./site-stats.tsx", import.meta.url), "utf8");

describe("SiteStatsDesk SSR & accessibility", () => {
  it("renders PIN prompt state, accessible timeframe group, and disabled export controls when locked", () => {
    const html = renderToStaticMarkup(<SiteStatsDesk pin="" />);

    assert.match(html, /Cookieless Visitor Analytics/);
    assert.match(html, /Enter the Operator PIN above to unlock visitor analytics\./);

    // Accessible timeframe group with aria-pressed state
    assert.match(html, /<div[^>]*role="group"[^>]*aria-label="Analytics timeframe"/);
    assert.match(html, /<button[^>]*aria-pressed="false"[^>]*disabled=""[^>]*>7d<\/button>/);
    assert.match(html, /<button[^>]*aria-pressed="true"[^>]*disabled=""[^>]*>30d<\/button>/);
    assert.match(html, /<button[^>]*aria-pressed="false"[^>]*disabled=""[^>]*>90d<\/button>/);

    // Export & refresh controls present and disabled until unlocked + loaded
    assert.match(html, /<button[^>]*disabled=""[^>]*>Refresh<\/button>/);
    assert.match(html, /<button[^>]*disabled=""[^>]*>[\s\S]*?Export JSON<\/button>/);
    assert.match(html, /<button[^>]*disabled=""[^>]*>[\s\S]*?Export CSV<\/button>/);

    // Metrics sections stay hidden before PIN unlock
    assert.equal(html.includes("Top Visited Pages"), false);
    assert.equal(BANNED_REGULATORY_RE.test(html), false);
    assert.deepEqual(findDoses(html), []);
  });

  it("renders daily trend sparkline above top pages and accessible device progress bars when stats are loaded", () => {
    const html = renderToStaticMarkup(<SiteStatsDesk pin="1234" initialStats={SAMPLE_STATS} />);

    // Timeframe reflects active 7d range
    assert.match(html, /<button[^>]*aria-pressed="true"[^>]*>7d<\/button>/);
    assert.match(html, /<button[^>]*aria-pressed="false"[^>]*>30d<\/button>/);

    // Export buttons are enabled when stats are enabled
    assert.doesNotMatch(html, /<button[^>]*disabled=""[^>]*>[\s\S]*?Export JSON<\/button>/);
    assert.doesNotMatch(html, /<button[^>]*disabled=""[^>]*>[\s\S]*?Export CSV<\/button>/);

    // Daily trend sparkline sits above Top Visited Pages with accessible summary & min/peak caption
    const sparklineIdx = html.indexOf("Daily Page Views (7 Days)");
    const topPagesIdx = html.indexOf("Top Visited Pages (7 Days)");
    assert.ok(sparklineIdx > 0, "expected Daily Page Views section");
    assert.ok(topPagesIdx > sparklineIdx, "expected Daily Page Views above Top Visited Pages");
    assert.match(
      html,
      /role="img"[^>]*aria-label="Daily page views from 2026-11-03 to 2026-11-09: peak 340 views on 2026-11-06, low 0 views, total 1,420 views across 7 days\."/,
    );
    assert.match(html, /Min 0 · Peak 340 views\/day/);

    // Device split bars expose progressbar ARIA semantics
    assert.match(
      html,
      /role="progressbar"[^>]*aria-valuenow="70"[^>]*aria-valuemin="0"[^>]*aria-valuemax="100"[^>]*aria-label="desktop traffic share"/,
    );
    assert.match(
      html,
      /role="progressbar"[^>]*aria-valuenow="30"[^>]*aria-valuemin="0"[^>]*aria-valuemax="100"[^>]*aria-label="phone traffic share"/,
    );

    assert.equal(BANNED_REGULATORY_RE.test(html), false);
    assert.deepEqual(findDoses(html), []);
  });

  it("uses standardized paper theme tokens and leaks zero banned regulatory words or doses in source", () => {
    assert.equal(source.includes("text-foreground"), false);
    assert.match(source, /\btext-fg\b/);
    assert.match(source, /\bborder-border\b/);
    assert.equal(BANNED_REGULATORY_RE.test(source), false);
    assert.deepEqual(findDoses(source), []);
  });
});
