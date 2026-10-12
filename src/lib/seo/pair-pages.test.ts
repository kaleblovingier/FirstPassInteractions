import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PairPageView, PairsIndexView } from "@/components/seo/pair-page";
import { pairPages, pairPageBySlug, sitemapXml } from "./pair-pages";
import { PAIR_DISCLAIMER, PAIR_DESCRIPTION_TEMPLATE, PAIR_TITLE_TEMPLATE, PAIRS_INDEX_DESCRIPTION, PAIRS_INDEX_INTRO, PAIRS_INDEX_TITLE, PAIR_CTA } from "./pair-copy";
import { analyze } from "@/lib/drugs/engine";
import { LABEL_CONTRAINDICATIONS } from "@/lib/drugs/label-contraindications";
import { LABEL_GOLD_SET } from "@/lib/drugs/reference/label-gold-set";
import { SEVERITY_LABEL, SEVERITY_RANK, type Severity } from "@/lib/drugs/types";
import sources from "./pair-quote-sources.json" with { type: "json" };

const pages = pairPages();
const html = (p: (typeof pages)[number]) => renderToStaticMarkup(createElement(PairPageView, { page: p }));
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");

/** Dose instructions: amounts with units, frequencies, titration verbs. */
const DOSE = /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|mL|units?|IU)\b|\b(once|twice|three times|four times) (a|per|daily)\b|\bevery \d+\s?(h|hours?)\b|\b(take \d|reduce the dose|increase the dose|titrate|max(imum)? dose)\b/i;

const squash = (s: string) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2010-\u2013]/g, "-").replace(/\s+/g, "");

describe("public pair pages", () => {
  it("covers every gold-set and label-pinned catalog pair once, with unique slugs", () => {
    const keys = new Set(pages.map((p) => [p.drugA, p.drugB].sort().join("|")));
    assert.equal(keys.size, pages.length);
    assert.equal(new Set(pages.map((p) => p.slug)).size, pages.length);
    for (const g of LABEL_GOLD_SET) assert.ok(keys.has([g.drugA, g.drugB].sort().join("|")), g.id);
    for (const r of LABEL_CONTRAINDICATIONS) assert.ok(keys.has([r.labelDrugId, r.otherId].sort().join("|")), r.id);
    assert.ok(pages.length >= 300, `page count ${pages.length}`);
  });

  it("every page renders the pair, tier, mechanism, disclaimer and a desk CTA", () => {
    for (const p of pages) {
      assert.equal(pairPageBySlug(p.slug), p);
      const h = html(p);
      const t = text(h);
      assert.ok(t.includes(p.nameA) && t.includes(p.nameB), p.slug);
      assert.ok(t.includes(`Desk tier: ${p.severityLabel}`), p.slug);
      assert.ok(p.mechanism.length > 0 && !p.mechanism.includes("\n"), p.slug);
      assert.ok(t.includes(text(PAIR_DISCLAIMER).trim()), `${p.slug} disclaimer`);
      assert.ok(h.includes(`href="${p.deskUrl.replace(/&/g, "&amp;")}"`) && t.includes(PAIR_CTA), p.slug);
      assert.equal(new URLSearchParams(p.deskUrl.split("?")[1]).get("brief"), `${p.drugA},${p.drugB}`);
      if (p.quote) assert.ok(h.includes(p.quote.url), p.slug);
      assert.ok(p.canonical.endsWith(`/pair/${p.slug}`));
    }
    const idx = text(renderToStaticMarkup(createElement(PairsIndexView, { pages })));
    for (const p of pages) assert.ok(idx.includes(`${p.nameA} and ${p.nameB}`), p.slug);
  });

  it("the disclaimer says educational reference, not FDA-cleared, no dosing advice, and does not deny CDS status", () => {
    assert.match(PAIR_DISCLAIMER, /educational reference/i);
    assert.match(PAIR_DISCLAIMER, /not FDA-cleared/i);
    assert.match(PAIR_DISCLAIMER, /not a substitute for professional judgment/i);
    assert.match(PAIR_DISCLAIMER, /no dosing advice/i);
    // regulatory.ts labels FirstPass as non-device CDS; the pages must not contradict it.
    assert.doesNotMatch(PAIR_DISCLAIMER, /clinical decision support/i);
  });

  it("no page or copy carries dose instructions or Pro wording", () => {
    const copy = [PAIR_TITLE_TEMPLATE, PAIR_DESCRIPTION_TEMPLATE, PAIRS_INDEX_TITLE, PAIRS_INDEX_DESCRIPTION, PAIRS_INDEX_INTRO, PAIR_CTA, PAIR_DISCLAIMER];
    for (const c of copy) {
      assert.doesNotMatch(c, DOSE, c);
      assert.doesNotMatch(c, /\bPro\b/, c);
    }
    for (const p of pages) {
      const t = text(html(p));
      assert.doesNotMatch(t, DOSE, p.slug);
      assert.doesNotMatch(`${t} ${p.title} ${p.description}`, /\bPro\b/, p.slug);
    }
  });

  it("titles and meta descriptions never name a tier stronger than the desk's", () => {
    for (const p of pages) {
      const desk = analyze([p.drugA, p.drugB]).findings
        .filter((f) => f.drugIds.includes(p.drugA) && f.drugIds.includes(p.drugB))
        .reduce<Severity | "none">((m, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[m] ? f.severity : m), "none");
      assert.equal(p.severity, desk, p.slug);
      for (const [sev, label] of Object.entries(SEVERITY_LABEL) as [Severity | "none", string][]) {
        if (SEVERITY_RANK[sev] <= SEVERITY_RANK[p.severity]) continue;
        for (const s of [p.title, p.description]) {
          assert.ok(!s.toLowerCase().includes(label.toLowerCase()), `${p.slug}: "${label}" in "${s}"`);
          if (sev === "contraindicated") assert.doesNotMatch(s, /contraindicat/i, p.slug);
        }
      }
    }
  });

  it("every quote is byte-identical to its source record and an exact substring of the DailyMed label", () => {
    const ex = (sources as { excerpts: Record<string, { setid: string; excerpt: string }> }).excerpts;
    for (const p of pages) {
      if (!p.quote) continue;
      const rec =
        p.quote.source === "gold"
          ? LABEL_GOLD_SET.find((g) => g.id === p.quote!.sourceId)?.quote
          : LABEL_CONTRAINDICATIONS.find((r) => r.id === p.quote!.sourceId)?.quote;
      assert.equal(p.quote.quote, rec, p.slug);
      const src = ex[p.quote.sourceId];
      assert.ok(src, `${p.slug}: no captured label text; run scripts/verify-pair-quotes.ts --write`);
      assert.ok(p.quote.url.includes(src.setid), `${p.slug}: setid`);
      const hay = squash(src.excerpt).toLowerCase();
      for (const seg of p.quote.quote.split("…").map((s) => s.trim().replace(/^[.,;:]\s*|\s*[.,;:]$/g, "")).filter(Boolean)) {
        assert.ok(hay.includes(squash(seg).toLowerCase()), `${p.slug}: "${seg.slice(0, 80)}"`);
      }
    }
  });

  it("sitemap lists /, /pairs and every pair canonical", () => {
    const xml = sitemapXml();
    assert.equal((xml.match(/<loc>/g) ?? []).length, pages.length + 2);
    for (const p of pages) assert.ok(xml.includes(`<loc>${p.canonical}</loc>`), p.slug);
  });
});
