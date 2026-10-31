import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WhyThisGrade } from "@/components/desk/check";
import { DrugHubView, GradeBasisRow, PairPageView } from "@/components/seo/pair-page";
import { pairPages } from "@/lib/seo/pair-pages";
import { drugHubs } from "@/lib/seo/drug-hubs";
import { analyze } from "./engine";
import { setidOf } from "./reference/label-drift";
import { gradeBases, labelFreshnessLine, leadGradeBasis, sourceLinkText, type GradeBasis } from "./grade-provenance";

const labelVersions = JSON.parse(
  readFileSync(new URL("./reference/label-versions.json", import.meta.url), "utf8"),
) as { labels: Record<string, { effective?: string | null; checkedOn?: string | null }> };
const rowHtml = (basis: GradeBasis) => renderToStaticMarkup(createElement(GradeBasisRow, { basis }));
const freshnessCount = (html: string) => (html.match(/data-testid="label-freshness"/g) ?? []).length;
const ZANAFLEX = "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=60c27d35-7349-4fc6-86ad-70fffdbe3e08";
const ZANAFLEX_ID = "60c27d35-7349-4fc6-86ad-70fffdbe3e08";

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

describe("grade provenance: link names say which label they open", () => {
  const links = (html: string) => [...html.matchAll(/<a [^>]*target="_blank"[^>]*>(.*?)<\/a>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, ""));

  it("no pair page or drug page link reads 'Open source'", () => {
    for (const p of pages) {
      const html = renderToStaticMarkup(createElement(PairPageView, { page: p }));
      assert.ok(!/>\s*Open source\s*</.test(html), `${p.slug}: 'Open source' link`);
    }
    for (const h of drugHubs()) {
      const html = renderToStaticMarkup(createElement(DrugHubView, { hub: h }));
      assert.ok(!/>\s*Open source\s*</.test(html), `${h.slug}: 'Open source' link`);
    }
  });

  it("every DailyMed link names the label it opens", () => {
    for (const p of pages) {
      for (const b of p.why) {
        if (!b.href?.includes("dailymed")) continue;
        const t = sourceLinkText(b.title, b.href);
        if (b.href.includes("search.cfm")) {
          assert.match(t, /^Search DailyMed for \S/, `${p.slug}: ${b.title}`);
          assert.doesNotMatch(t, /label on DailyMed/, `${p.slug}: search link claims a label`);
        } else assert.match(t, /^\S.* label on DailyMed$/, `${p.slug}: ${b.title}`);
      }
    }
  });

  it("/drug/contrave source links have distinct accessible names", () => {
    const h = drugHubs().find((x) => x.slug === "contrave");
    assert.ok(h, "expected a /drug/contrave hub");
    const html = renderToStaticMarkup(createElement(DrugHubView, { hub: h }));
    const names = links(html);
    assert.ok(names.length > 1, "expected several source links on /drug/contrave");
    assert.equal(new Set(names).size, names.length, `duplicate link names: ${names.join(" | ")}`);
    for (const n of names) assert.match(n, /label on DailyMed|Search DailyMed for|label|PubMed|CPIC|FDA/, n);
  });

  it("sourceLinkText names the owner and never says 'Open source' or 'Strong'", () => {
    assert.equal(sourceLinkText("Contrave label, Contraindications", "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=x"), "Contrave label on DailyMed");
    assert.equal(sourceLinkText("Prescribing Information", "https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=sodium%20oxybate"), "Search DailyMed for Sodium oxybate");
    assert.equal(sourceLinkText("Basis: catalog rule", "https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=selegiline"), "Search DailyMed for Selegiline");
    assert.equal(sourceLinkText("PMID 123", "https://pubmed.ncbi.nlm.nih.gov/123/"), "PMID 123 on PubMed");
    for (const p of pages) for (const b of p.why) if (b.href) assert.doesNotMatch(sourceLinkText(b.title, b.href), /Open source|\bStrong\b/);
  });
});

describe("grade provenance: label version freshness", () => {
  it("quotes the stored effective and checkedOn dates, and nothing else", () => {
    const stored = { abc: { effective: "2026-04-30", checkedOn: "2026-10-20" } };
    const basis: GradeBasis = {
      kind: "label",
      title: "Example label",
      detail: "quote",
      href: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ABC",
    };
    assert.equal(
      labelFreshnessLine(basis, stored),
      "Label version dated 2026-04-30. Last checked 2026-10-20.",
    );
    assert.equal(
      labelFreshnessLine(basis, { abc: { effective: "2026-04-30", checkedOn: null } }),
      "Label version dated 2026-04-30.",
    );
    assert.equal(
      labelFreshnessLine(basis, { abc: { effective: "April 30, 2026", checkedOn: "2026-10-20" } }),
      "Last checked 2026-10-20.",
    );
    assert.equal(
      labelFreshnessLine(basis, { abc: { effective: "", checkedOn: "not-a-date" } }),
      "No label version date is on file.",
    );
    assert.equal(labelFreshnessLine(basis, {}), "No label version date is on file.");
    assert.equal(labelFreshnessLine({ ...basis, kind: "source" }, stored), null);
    assert.equal(labelFreshnessLine({ ...basis, kind: "rule" }, stored), null);
    assert.equal(
      labelFreshnessLine(
        { ...basis, href: "https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=zanaflex" },
        stored,
      ),
      null,
    );
    assert.equal(labelFreshnessLine({ ...basis, href: undefined }, stored), null);
  });

  it("pair and drug pages show only dates present for that DailyMed setid", () => {
    let matched = 0;
    let absent = 0;
    let omitted = 0;
    const checkRow = (basis: GradeBasis, where: string) => {
      const before = { ...basis };
      const line = labelFreshnessLine(basis);
      assert.deepEqual(basis, before, `${where}: freshness must not change the basis`);
      assert.doesNotMatch(
        `${basis.title} ${basis.detail}`,
        /Label version dated|No label version date is on file/,
      );
      const html = rowHtml(basis);
      const setid = basis.href ? setidOf(basis.href)?.trim().toLowerCase() : null;
      const stored = setid ? labelVersions.labels[setid] : undefined;
      if (basis.kind === "label" && setid && stored) {
        assert.match(stored.effective ?? "", /^\d{4}-\d{2}-\d{2}$/, where);
        assert.match(stored.checkedOn ?? "", /^\d{4}-\d{2}-\d{2}$/, where);
        const expected = `Label version dated ${stored.effective}. Last checked ${stored.checkedOn}.`;
        assert.equal(line, expected, where);
        assert.ok(html.includes(expected), where);
        assert.equal(freshnessCount(html), 1, where);
        for (const d of expected.match(/\d{4}-\d{2}-\d{2}/g) ?? []) {
          assert.ok(d === stored.effective || d === stored.checkedOn, `${where}: ${d}`);
        }
        matched++;
        return;
      }
      if (basis.kind === "label" && setid && !stored) {
        assert.equal(line, "No label version date is on file.", where);
        assert.ok(html.includes("No label version date is on file."), where);
        assert.doesNotMatch(line, /\d{4}-\d{2}-\d{2}/, where);
        absent++;
        return;
      }
      assert.equal(line, null, where);
      assert.equal(freshnessCount(html), 0, where);
      assert.ok(!html.includes("Label version dated"), where);
      omitted++;
    };
    for (const p of pages) {
      const html = renderToStaticMarkup(createElement(PairPageView, { page: p }));
      const lines = p.why.map((b) => labelFreshnessLine(b)).filter((x): x is string => Boolean(x));
      assert.equal(freshnessCount(html), lines.length, p.slug);
      for (const line of lines) assert.ok(html.includes(line), p.slug);
      for (const b of p.why) checkRow(b, p.slug);
    }
    for (const h of drugHubs()) {
      const html = renderToStaticMarkup(createElement(DrugHubView, { hub: h }));
      const whys = h.groups.flatMap((g) =>
        g.pairs.map((r) => r.why).filter((w): w is GradeBasis => Boolean(w)),
      );
      const lines = whys.map((b) => labelFreshnessLine(b)).filter((x): x is string => Boolean(x));
      assert.equal(freshnessCount(html), lines.length, h.slug);
      for (const line of lines) assert.ok(html.includes(line), h.slug);
    }
    assert.ok(matched > 0, "expected matched label cites");
    assert.ok(absent > 0, "expected a label cite with no version on file");
    assert.ok(omitted > 0, "expected rows with no freshness line");
  });

  it("Zanaflex pair page and the desk row quote the file, and a catalog rule stays silent", () => {
    const stored = labelVersions.labels[ZANAFLEX_ID]!;
    const page = pages.find(
      (p) => [p.drugA, p.drugB].sort().join("|") === "fluvoxamine|tizanidine",
    );
    assert.ok(page, "expected a tizanidine + fluvoxamine pair page");
    const html = renderToStaticMarkup(createElement(PairPageView, { page }));
    const expected = `Label version dated ${stored.effective}. Last checked ${stored.checkedOn}.`;
    assert.equal(page.why[0]!.href, ZANAFLEX);
    assert.ok(html.includes(expected), page.slug);
    assert.ok(
      html.includes(`data-testid="pair-severity"`) && html.includes(page.severityLabel),
      page.slug,
    );
    const finding = analyze(["tizanidine", "fluvoxamine"]).findings.find(
      (f) => f.severity === "contraindicated",
    );
    assert.ok(finding);
    const desk = renderToStaticMarkup(createElement(WhyThisGrade, { finding }));
    assert.ok(desk.includes("Why this grade"));
    assert.ok(desk.includes(expected));
    assert.equal(finding.severity, "contraindicated");

    const rule = analyze(["selegiline", "tyramine-foods"]).findings.find(
      (f) => f.severity === "contraindicated",
    );
    assert.ok(rule);
    const ruleHtml = renderToStaticMarkup(createElement(WhyThisGrade, { finding: rule }));
    assert.match(ruleHtml, /Basis: catalog/);
    assert.equal(freshnessCount(ruleHtml), 0);
    assert.ok(!ruleHtml.includes("Label version dated"));
    assert.ok(!ruleHtml.includes("No label version date is on file."));
  });
});
