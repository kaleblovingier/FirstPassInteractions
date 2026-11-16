import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ClassPageView, ClassesIndexView } from "@/components/seo/class-page";
import { DrugHubView } from "@/components/seo/pair-page";
import { DRUGS, DRUG_BY_ID } from "@/lib/drugs/catalog";
import { SEVERITY_LABEL } from "@/lib/drugs/types";
import { drugHubBySlug, drugHubs } from "./drug-hubs";
import { enzymeHubBySlug } from "./enzyme-hubs";
import {
  CLASS_HUB_EXCLUDED,
  CLASS_HUB_MIN_MEMBERS,
  classHubBySlug,
  classHubRedirect,
  classHubs,
  classHubUrls,
  classIndex,
  classKey,
  classLinkForDrug,
  classSlug,
} from "./class-hubs";
import { DISCLAIMER_ACTION, PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";
import { pairPageBySlug, pairPages, sitemapXml } from "./pair-pages";

const hubs = classHubs();
const html = (h: (typeof hubs)[number]) => renderToStaticMarkup(createElement(ClassPageView, { hub: h }));
const text = (h: string) =>
  h.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
const rendered = new Map(hubs.map((h) => [h.slug, html(h)]));
const indexHtml = renderToStaticMarkup(createElement(ClassesIndexView, { classes: classIndex() }));

/** Same dose and wording guards as the enzyme hub tests. */
const DOSE =
  /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|mL|units?|IU)\b|\b(once|twice|three times|four times) (a|per|daily)\b|\bevery \d+\s?(h|hours?)\b|\b(take \d|reduce the dose|increase the dose|titrate|max(imum)? dose|dos(e|es|ing|age))\b/i;
const BANNED = /regimen|clinical decision support|decision support|\bCDS\b|\bfree\b|pric(e|ing)|\$\d|\bcost\b|\bPro\b|FDA[- ]approved|certified/i;
const TIERS = Object.values(SEVERITY_LABEL);

const hrefs = (h: string, prefix: string) =>
  [...h.matchAll(new RegExp(`href="(${prefix}[^"]*)"`, "g"))].map((m) => m[1]);

describe("class slugs", () => {
  it("are stable for known labels", () => {
    assert.equal(classSlug("SSRI"), "ssri");
    assert.equal(classSlug("Azole antifungal"), "azole-antifungal");
    assert.equal(classSlug("5-HT3 antagonist"), "5-ht3-antagonist");
    assert.equal(classSlug("Class III antiarrhythmic"), "class-iii-antiarrhythmic");
    assert.equal(classSlug("Vasopressor / inotrope"), "vasopressor-inotrope");
    assert.equal(classSlug("Statin (HMG-CoA reductase inhibitor)"), "statin-hmg-coa-reductase-inhibitor");
    assert.equal(classSlug("β3 agonist (OAB)"), "beta3-agonist-oab");
    assert.equal(classSlug("Central α2-agonist"), "central-alpha2-agonist");
  });

  it("fold only case, spacing and dash variants, never words", () => {
    assert.equal(classKey("  ssri "), classKey("SSRI"));
    assert.equal(classKey("Azole  Antifungal"), classKey("Azole antifungal"));
    assert.equal(classKey("Opioid agonist–antagonist"), classKey("opioid agonist-antagonist"));
    assert.notEqual(classKey("PDE5 inhibitor"), classKey("PDE5 inhibitor (PAH)"));
    assert.notEqual(classKey("Statin"), classKey("Statin (HMG-CoA reductase inhibitor)"));
    assert.notEqual(classKey("Antiepileptic"), classKey("Anticonvulsant"));
  });

  it("published slugs are unique and match the canonical", () => {
    assert.ok(hubs.length >= 10, `only ${hubs.length} class pages`);
    assert.equal(new Set(hubs.map((h) => h.slug)).size, hubs.length);
    for (const h of hubs) {
      assert.equal(h.slug, classSlug(h.name));
      assert.equal(classHubBySlug(h.slug), h);
      assert.equal(h.path, `/class/${h.slug}`);
      assert.equal(h.canonical, `${SITE_URL}/class/${h.slug}`);
    }
  });

  it("loose addresses 301 to the canonical slug", () => {
    assert.equal(classHubRedirect("SSRI"), "ssri");
    assert.equal(classHubRedirect("azole_antifungal"), "azole-antifungal");
    assert.equal(classHubRedirect("ssri"), undefined);
    assert.equal(classHubRedirect("not-a-class"), undefined);
  });
});

describe("class hub membership", () => {
  it("every published class has at least two drugs with drug pages and one pair page", () => {
    for (const h of hubs) {
      assert.ok(h.members.length >= CLASS_HUB_MIN_MEMBERS, h.slug);
      assert.equal(h.counts.hubs, h.members.length);
      assert.ok(h.counts.pairs >= 1, h.slug);
    }
  });

  it("members and others are exactly the kind=drug entries filed under the label", () => {
    for (const h of hubs) {
      const want = DRUGS.filter((d) => d.kind === "drug" && classKey(d.cls) === h.key).map((d) => d.id).sort();
      const got = [...h.members, ...h.others].map((m) => m.id).sort();
      assert.deepEqual(got, want, h.slug);
      assert.equal(h.counts.drugs, want.length);
      for (const m of [...h.members, ...h.others]) assert.equal(DRUG_BY_ID[m.id].kind, "drug");
    }
  });

  it("filing labels and multi-class buckets get no page", () => {
    const keys = new Set(hubs.map((h) => h.key));
    for (const k of Object.keys(CLASS_HUB_EXCLUDED)) assert.ok(!keys.has(k), k);
    assert.equal(classHubBySlug("fda-table-1-example"), undefined);
    assert.equal(classHubBySlug("named-on-a-stored-label"), undefined);
  });

  it("no label with fewer than two drug pages is published", () => {
    const hubIds = new Set(drugHubs().map((h) => h.drugId));
    const byKey = new Map<string, number>();
    for (const d of DRUGS) if (d.kind === "drug" && hubIds.has(d.id)) byKey.set(classKey(d.cls), (byKey.get(classKey(d.cls)) ?? 0) + 1);
    for (const [k, n] of byKey) if (n < CLASS_HUB_MIN_MEMBERS) assert.ok(!hubs.some((h) => h.key === k), k);
  });

  it("each drug hub links to at most one class page, and that class lists it", () => {
    for (const d of drugHubs()) {
      const link = classLinkForDrug(d.drugId);
      if (!link) continue;
      const h = classHubBySlug(link.path.replace("/class/", ""))!;
      assert.ok(h.members.some((m) => m.id === d.drugId), d.slug);
      const out = renderToStaticMarkup(createElement(DrugHubView, { hub: d, classLink: link }));
      assert.ok(out.includes(`href="${link.path}"`), d.slug);
    }
    assert.equal(classLinkForDrug("ketoconazole")?.path, "/class/azole-antifungal");
  });
});

describe("class hub links", () => {
  it("every /drug link resolves to an existing drug hub", () => {
    for (const [slug, h] of rendered) {
      const links = hrefs(h, "/drug/");
      assert.ok(links.length >= CLASS_HUB_MIN_MEMBERS, slug);
      for (const l of links) assert.ok(drugHubBySlug(l.slice("/drug/".length)), `${slug}: ${l}`);
    }
  });

  it("every /pair link resolves to an existing pair page, under the pair page's own grade", () => {
    for (const h of hubs) {
      const out = rendered.get(h.slug)!;
      const links = hrefs(out, "/pair/");
      assert.equal(links.length, h.counts.pairs, h.slug);
      for (const l of links) assert.ok(pairPageBySlug(l.slice("/pair/".length)), `${h.slug}: ${l}`);
      const ids = new Set(h.members.map((m) => m.id));
      const want = pairPages().filter((p) => ids.has(p.drugA) || ids.has(p.drugB));
      assert.equal(want.length, h.counts.pairs, h.slug);
      for (const g of h.pairGroups) {
        assert.equal(g.label, SEVERITY_LABEL[g.severity]);
        for (const p of g.pairs) assert.equal(pairPageBySlug(p.slug)!.severity, g.severity, p.slug);
      }
    }
  });

  it("every /enzyme link resolves, and role counts match the catalog", () => {
    for (const h of hubs) {
      for (const l of hrefs(rendered.get(h.slug)!, "/enzyme/")) assert.ok(enzymeHubBySlug(l.slice("/enzyme/".length)), l);
      const drugs = [...h.members, ...h.others].map((m) => DRUG_BY_ID[m.id]);
      for (const e of h.enzymes) {
        const holders = drugs.filter((d) => d.enzymes.some((r) => r.enzyme === e.enzyme));
        assert.equal(e.drugs, holders.length, `${h.slug} ${e.enzyme}`);
        for (const r of e.roles) assert.equal(r.names.length, r.count);
      }
    }
  });

  it("the desk link opens a few members", () => {
    for (const h of hubs) {
      assert.ok(rendered.get(h.slug)!.includes(`href="${h.deskUrl.replace(/&/g, "&amp;")}"`), h.slug);
      assert.ok(h.deskUrl.startsWith("/?brief="));
      const ids = decodeURIComponent(h.deskUrl.split("brief=")[1]).split(",");
      assert.ok(ids.length >= 2 && ids.length <= 4, h.slug);
      for (const id of ids) assert.ok(h.members.some((m) => m.id === id));
    }
  });
});

describe("class hub wording", () => {
  it("has a data-only intro, the disclaimer and no dose text", () => {
    for (const h of hubs) {
      const t = text(rendered.get(h.slug)!);
      assert.ok(t.includes(`${h.counts.drugs} drugs in FirstPass are filed under ${h.name}.`), h.slug);
      assert.ok(t.includes(PAIR_DISCLAIMER) && t.includes(DISCLAIMER_ACTION), h.slug);
      assert.ok(!DOSE.test(t), `${h.slug}: ${t.match(DOSE)?.[0]}`);
      for (const s of [h.title, h.description, h.h1, h.intro]) {
        assert.ok(!DOSE.test(s) && !BANNED.test(s), `${h.slug}: ${s}`);
        for (const tier of TIERS) assert.ok(!s.includes(tier), `${h.slug}: tier word in "${s}"`);
      }
    }
    const idx = text(indexHtml);
    assert.ok(idx.includes(PAIR_DISCLAIMER) && !DOSE.test(idx));
  });

  it("titles and descriptions are unique", () => {
    assert.equal(new Set(hubs.map((h) => h.title)).size, hubs.length);
    assert.equal(new Set(hubs.map((h) => h.description)).size, hubs.length);
  });
});

describe("classes index and sitemap", () => {
  it("lists every class alphabetically with counts", () => {
    const rows = classIndex();
    assert.equal(rows.length, hubs.length);
    const names = rows.map((r) => r.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
    for (const r of rows) assert.ok(indexHtml.includes(`href="/class/${r.slug}"`), r.slug);
  });

  it("sitemap includes /classes and every class page", () => {
    const xml = sitemapXml();
    assert.ok(xml.includes(`<loc>${SITE_URL}/classes</loc>`));
    for (const u of classHubUrls()) assert.ok(xml.includes(`<loc>${u}</loc>`), u);
  });
});
