import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DrugHubView, PairPageView } from "@/components/seo/pair-page";
import { pairPages } from "@/lib/seo/pair-pages";
import { drugHubs } from "@/lib/seo/drug-hubs";
import { analyze } from "./engine";
import { gradeBases, leadGradeBasis } from "./grade-provenance";

const pages = pairPages();
const serious = (s: string) => s === "contraindicated" || s === "major";

describe("grade provenance: one-click basis for every Avoid together / Serious concern grade", () => {
  it("every pair page shows an open 'Why this grade' with a basis", () => {
    for (const p of pages) {
      if (p.severity === "none") continue;
      assert.ok(p.why.length > 0, `${p.slug}: no basis`);
      const html = renderToStaticMarkup(createElement(PairPageView, { page: p }));
      assert.match(html, /data-testid="pair-why"[^>]*open|<details open[^>]*data-testid="pair-why"/, `${p.slug}: Why block not open`);
      assert.ok(html.includes("Why this grade"), p.slug);
    }
  });

  it("serious pair pages cite a linked source or say plainly it is a catalog rule", () => {
    for (const p of pages.filter((x) => serious(x.severity))) {
      const ok = p.why.some((b) => (b.kind !== "rule" && b.href) || (b.kind === "rule" && b.title.startsWith("Basis: catalog")));
      assert.ok(ok, `${p.slug}: ${p.severityLabel} without a one-click basis`);
    }
  });

  it("every serious row on a drug page has a one-click 'Why this grade'", () => {
    for (const h of drugHubs()) {
      const html = renderToStaticMarkup(createElement(DrugHubView, { hub: h }));
      for (const g of h.groups) {
        if (!serious(g.severity)) continue;
        for (const r of g.pairs) assert.ok(r.why, `${h.slug} / ${r.pairSlug}: no basis`);
      }
      if (h.groups.some((g) => g.pairs.some((r) => r.why))) assert.ok(html.includes('data-testid="hub-why"'), h.slug);
    }
  });

  it("every serious desk finding behind the pair pages has a lead basis", () => {
    for (const p of pages) {
      for (const f of analyze([p.drugA, p.drugB]).findings) {
        if (!serious(f.severity)) continue;
        const w = leadGradeBasis(f);
        assert.ok(w.title && w.detail, `${f.id}: empty basis`);
        if (w.kind !== "rule") assert.ok(w.href, `${f.id}: cited basis without a link`);
      }
    }
  });

  it("uncited Avoid together rows say so instead of inventing a source", () => {
    const f = analyze(["selegiline", "tyramine-foods"]).findings.find((x) => x.severity === "contraindicated");
    assert.ok(f, "expected selegiline + tyramine foods to be Avoid together");
    const w = gradeBases(f);
    assert.ok(w.every((b) => b.kind === "rule"), "fixture assumes no cited source; update if one is added");
    assert.match(w[0]!.title, /^Basis: catalog/);
    assert.match(w[0]!.detail, /not from a cited source/);
  });

  it("label-pinned contraindications lead with the DailyMed label", () => {
    const pinned = pages.filter((p) => p.quote?.source === "pin" && p.severity === "contraindicated");
    assert.ok(pinned.length > 0);
    for (const p of pinned) {
      const lead = p.why[0]!;
      assert.equal(lead.kind, "label", p.slug);
      assert.match(lead.href ?? "", /dailymed\.nlm\.nih\.gov/, p.slug);
    }
  });

  it("basis copy stays educational: no doses, no 'Strong' tier, no 'Pro'", () => {
    for (const p of pages) for (const b of p.why) {
      if (b.kind !== "rule") continue;
      assert.doesNotMatch(b.detail, /\b\d+\s?mg\b|\bPro\b|\bStrong\b/, p.slug);
    }
  });
});
