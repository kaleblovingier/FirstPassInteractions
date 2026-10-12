import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DrugHubView, PairPageView, PairsIndexView } from "@/components/seo/pair-page";
import { pairPages, sitemapXml } from "./pair-pages";
import { drugHubBySlug, drugHubs, drugHubPath } from "./drug-hubs";
import { DRUG_HUB_NOT_LISTED, PAIR_DISCLAIMER } from "./pair-copy";
import { SEVERITY_LABEL } from "@/lib/drugs/types";

const hubs = drugHubs();
const pages = pairPages();
const html = (h: (typeof hubs)[number]) => renderToStaticMarkup(createElement(DrugHubView, { hub: h }));
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
const DOSE = /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|mL|units?|IU)\b|\b(once|twice|three times|four times) (a|per|daily)\b|\bevery \d+\s?(h|hours?)\b|\b(take \d|reduce the dose|increase the dose|titrate|max(imum)? dose)\b/i;
const BANNED = /clinical decision support|\bCDS\b|\bfree\b|pric(e|ing)|\$\d|\bPro\b/i;

describe("drug hub pages", () => {
  it("one hub per catalog drug that appears in a pair page", () => {
    const ids = new Set(pages.flatMap((p) => [p.drugA, p.drugB]));
    assert.equal(hubs.length, ids.size);
    assert.equal(new Set(hubs.map((h) => h.slug)).size, hubs.length);
    for (const h of hubs) {
      assert.equal(drugHubBySlug(h.slug), h);
      assert.equal(h.pairCount, pages.filter((p) => p.drugA === h.drugId || p.drugB === h.drugId).length);
      assert.equal(h.groups.reduce((n, g) => n + g.pairs.length, 0), h.pairCount);
    }
  });

  it("every pair page is linked from both drugs' hubs, and links back to them", () => {
    const rendered = new Map(hubs.map((h) => [h.drugId, html(h)]));
    for (const p of pages) {
      for (const id of [p.drugA, p.drugB]) assert.ok(rendered.get(id)!.includes(`href="/pair/${p.slug}"`), `${id} → ${p.slug}`);
      const ph = renderToStaticMarkup(createElement(PairPageView, { page: p }));
      assert.ok(ph.includes(`href="${drugHubPath(p.drugA)}"`) && ph.includes(`href="${drugHubPath(p.drugB)}"`), p.slug);
    }
    const idx = renderToStaticMarkup(createElement(PairsIndexView, { pages }));
    for (const h of hubs) assert.ok(idx.includes(`href="/drug/${h.slug}"`), h.slug);
  });

  it("titles, meta, CTA, tier groups and disclaimer use the agreed wording", () => {
    const labels = new Set(Object.values(SEVERITY_LABEL));
    for (const h of hubs) {
      assert.equal(h.title, `${h.name} interactions on FDA labels | FirstPass`);
      assert.equal(h.description, `Drug pairs where an FDA label names an interaction with ${h.name}, each with the label's own wording and a DailyMed link. Educational reference only. Not FDA-cleared. The Prescribing Information governs.`);
      const t = text(html(h));
      assert.ok(t.includes(`Open ${h.name} in the desk`), h.slug);
      assert.ok(html(h).includes(`href="${h.deskUrl}"`) && h.deskUrl.endsWith(`brief=${h.drugId}`), h.slug);
      assert.ok(t.includes(PAIR_DISCLAIMER) && t.includes(DRUG_HUB_NOT_LISTED), h.slug);
      for (const g of h.groups) assert.ok(labels.has(g.label) && g.label === SEVERITY_LABEL[g.severity]);
    }
    assert.equal(DRUG_HUB_NOT_LISTED, "A pair that isn't listed here hasn't been cleared as safe; it just isn't on this list.");
    assert.equal(new Set(hubs.map((h) => h.title)).size, hubs.length);
  });

  it("no CDS, free, pricing or dose wording; exactly one h1", () => {
    for (const h of hubs) {
      const m = html(h);
      for (const s of [h.title, h.description, text(m)]) {
        assert.ok(!BANNED.test(s), `${h.slug}: ${s.match(BANNED)?.[0]}`);
        assert.ok(!DOSE.test(s), `${h.slug}: ${s.match(DOSE)?.[0]}`);
      }
      assert.equal((m.match(/<h1[\s>]/g) ?? []).length, 1, h.slug);
    }
  });

  it("sitemap lists every hub", () => {
    const xml = sitemapXml();
    for (const h of hubs) assert.ok(xml.includes(`<loc>${h.canonical}</loc>`), h.slug);
  });
});
