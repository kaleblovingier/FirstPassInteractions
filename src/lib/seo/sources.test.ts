import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SourcesView } from "@/components/seo/sources-page";
import { REFERENCE_RESOURCES, REFERENCE_RESOURCE_HOSTS } from "@/lib/drugs/reference-resources";
import { FDA_DDI_TABLE } from "@/lib/drugs/reference/fda-ddi-table";
import labelVersions from "@/lib/drugs/reference/label-versions.json" with { type: "json" };
import { PALETTE_PAGES } from "@/lib/drugs/palette";
import { dailymedSetUrl } from "@/lib/regulatory";
import { quotedRows } from "../../../scripts/label-drift-check";
import * as copy from "./sources";
import { SITE_URL } from "./pair-copy";
import { pairPages, sitemapXml } from "./pair-pages";
import {
  DDI_AGREEMENT_PATH,
  DRIFT_REPORT_PATH,
  SOURCES_DESCRIPTION,
  SOURCES_PATH,
  SOURCES_TITLE,
  SOURCES_URL,
  fdaDdiIndex,
  labelLibrary,
  otherLabels,
} from "./sources";

const labels = labelLibrary();
const others = otherLabels();
const targets = fdaDdiIndex();
const html = renderToStaticMarkup(createElement(SourcesView, { labels, others, targets }));
const text = html
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, " ");
const versions = labelVersions.labels as Record<string, { labelDrug: string; version: number | null; effective: string | null; checkedOn: string }>;

describe("/sources page", () => {
  it("prerenders, is in the sitemap, the palette and the pairs index, and has its route", () => {
    const vite = readFileSync("vite.config.ts", "utf8");
    assert.ok(vite.includes(`{ path: "${SOURCES_PATH}" }`), "in prerender pages");
    assert.ok(vite.includes(`path === "${SOURCES_PATH}"`), "in prerender filter");
    assert.ok(sitemapXml().includes(`<loc>${SITE_URL}${SOURCES_PATH}</loc>`));
    assert.ok(readFileSync("src/routes/sources.tsx", "utf8").includes(`createFileRoute("${SOURCES_PATH}")`));
    assert.equal(SOURCES_URL, `${SITE_URL}/sources`);
    assert.ok(PALETTE_PAGES.some((p) => p.href === SOURCES_PATH));
    assert.ok(readFileSync("src/components/seo/pair-page.tsx", "utf8").includes('href="/sources"'));
  });

  it("has one h1, the not-cleared notice and the disclaimer, and makes no approval or validation claim", () => {
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
    assert.ok(text.includes("has not been cleared or approved by the U.S. Food and Drug Administration"));
    assert.ok(html.includes('data-testid="pair-disclaimer"'));
    for (const s of [SOURCES_TITLE, SOURCES_DESCRIPTION, text]) {
      const banned = s.match(/\b(is|are) FDA[- ](approved|cleared)|clinically validated|reviewed by pharmacists/i);
      assert.equal(banned, null, banned?.[0]);
    }
    // Page copy (not label quotes, which stay verbatim) uses no em dashes.
    for (const [k, v] of Object.entries(copy)) if (typeof v === "string") assert.ok(!v.includes("\u2014"), k);
  });

  it("lists every saved label quote, once, under its label", () => {
    const rows = quotedRows();
    const shown = labels.flatMap((l) => l.quotes.map((q) => `${l.key}|${q.section}|${q.quote}`));
    assert.equal(new Set(shown).size, shown.length, "no quote listed twice under one label");
    assert.equal(shown.length, rows.length);
    for (const r of rows) {
      const key = r.setid?.toLowerCase() ?? r.url;
      const label = labels.find((l) => l.key === key);
      assert.ok(label, `label for ${r.labelDrug}`);
      const q = label.quotes.find((x) => x.section === r.labelSection && x.quote === r.quote);
      assert.ok(q, `${r.labelDrug}: ${r.quote.slice(0, 40)}`);
      assert.deepEqual(
        q.pairs.map((p) => p.id).sort(),
        [...r.pairs].sort(),
        `${r.labelDrug} pairs`,
      );
    }
  });

  it("gives each label its DailyMed link, set ID and the stored version and dates", () => {
    for (const l of labels) {
      if (!l.setid) continue;
      assert.equal(l.url, dailymedSetUrl(l.setid));
      assert.ok(html.includes(l.url.replace(/&/g, "&amp;")), l.labelDrug);
      assert.ok(text.includes(l.setid), l.setid);
      const v = versions[l.setid];
      assert.ok(v, `${l.setid} in label-versions.json`);
      assert.equal(l.version, v.version);
      assert.equal(l.effective, v.effective);
      assert.equal(l.checkedOn, v.checkedOn);
    }
    const all = new Set([...labels.map((l) => l.setid), ...others.map((o) => o.setid)]);
    for (const setid of Object.keys(versions)) assert.ok(all.has(setid), `${setid} listed`);
  });

  it("links a pair only to a pair page that exists", () => {
    const slugs = new Set(pairPages().map((p) => `/pair/${p.slug}`));
    let linked = 0;
    for (const l of labels)
      for (const q of l.quotes)
        for (const p of q.pairs) {
          if (!p.href) continue;
          linked++;
          assert.ok(slugs.has(p.href), p.href);
        }
    assert.ok(linked > 0);
  });

  it("indexes every transcribed FDA table row once, by enzyme and role, and cites the source", () => {
    const total = targets.reduce((n, t) => n + t.groups.reduce((m, g) => m + g.entries.length, 0), 0);
    assert.equal(total, FDA_DDI_TABLE.length);
    for (const t of targets) assert.equal(t.count, FDA_DDI_TABLE.filter((r) => r.target === t.target).length, t.target);
    assert.ok(html.includes("https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems"));
    assert.ok(text.includes("current as of 2026-05-29"));
    assert.ok(text.includes("not considered a comprehensive list"));
    const pgp = targets.find((t) => t.target === "P-gp")!;
    assert.ok(pgp.groups.every((g) => /no (strength|sensitivity) class/.test(g.heading)), "P-gp rows carry no FDA class");
    for (const t of targets) for (const f of t.footnotes) assert.ok(f.text.length > 0);
  });

  it("links the drift and agreement reports to files in this repository", () => {
    for (const p of [DRIFT_REPORT_PATH, DDI_AGREEMENT_PATH]) {
      assert.ok(readFileSync(p, "utf8").length > 0, p);
      assert.ok(html.includes(`/blob/main/${p}`), p);
    }
  });
});

describe("reference resources", () => {
  it("are https pages on FDA or NLM hosts, with unique ids, and appear on /sources and the desk", () => {
    const ids = REFERENCE_RESOURCES.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
    const desk = readFileSync("src/components/desk/resource-navigator.tsx", "utf8");
    assert.ok(desk.includes("REFERENCE_RESOURCES.map"));
    for (const r of REFERENCE_RESOURCES) {
      const u = new URL(r.url);
      assert.equal(u.protocol, "https:", r.id);
      assert.ok((REFERENCE_RESOURCE_HOSTS as readonly string[]).includes(u.host), r.url);
      assert.equal(u.search, "", `${r.id} has no query string`);
      assert.ok(html.includes(`href="${r.url}"`), r.id);
      for (const s of [r.name, r.description, r.onDesk]) assert.ok(!s.includes("\u2014"), r.id);
    }
    for (const id of ["medwatch", "drug-safety-communications", "dailymed", "drugs-at-fda", "orange-book", "fda-ddi-table-1"])
      assert.ok(ids.includes(id), id);
  });
});
