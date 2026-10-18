import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EnzymePageView, EnzymesIndexView } from "@/components/seo/enzyme-page";
import { DrugHubView, PairPageView, PairsIndexView } from "@/components/seo/pair-page";
import { DRUGS, DRUG_BY_ID } from "@/lib/drugs/catalog";
import { drugsWithRole } from "@/lib/drugs/enzyme-shelf";
import { ENZYMES, SEVERITY_LABEL, type Enzyme, type EnzymeRole } from "@/lib/drugs/types";
import { breadcrumbJsonLd, HOME_CRUMB } from "./breadcrumbs";
import { drugHubBySlug, drugHubPath, drugHubs } from "./drug-hubs";
import {
  ENZYME_HUB_KINDS,
  ENZYME_HUB_MIN_ITEMS,
  drugEnzymeLinks,
  enzymeHubBySlug,
  enzymeHubRedirect,
  enzymeHubs,
  enzymeHubUrls,
  enzymePath,
  roleLabel,
  type EnzymeHubItem,
} from "./enzyme-hubs";
import * as copy from "./pair-copy";
import { pairPageBySlug, pairPages, sitemapXml } from "./pair-pages";

const { ENZYME_ABOUT, PAIR_DISCLAIMER, SITE_URL } = copy;
const hubs = enzymeHubs();
const pages = pairPages();
const html = (h: (typeof hubs)[number]) => renderToStaticMarkup(createElement(EnzymePageView, { hub: h }));
const text = (h: string) =>
  h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");
const rendered = new Map(hubs.map((h) => [h.slug, html(h)]));

/** Dose instructions, as in the pair and /for-programs tests (the stricter one). */
const DOSE =
  /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|mL|units?|IU)\b|\b(once|twice|three times|four times) (a|per|daily)\b|\bevery \d+\s?(h|hours?)\b|\b(take \d|reduce the dose|increase the dose|titrate|max(imum)? dose|dos(e|es|ing|age))\b/i;
const BANNED = /regimen|clinical decision support|decision support|\bCDS\b|\bfree\b|pric(e|ing)|\$\d|\bcost\b|\bPro\b/i;
const PATIENT = /\byou\b|\byour\b/i;

function items(h: (typeof hubs)[number]): { role: EnzymeRole["kind"]; grade: string; item: EnzymeHubItem }[] {
  return h.sections.flatMap((s) => s.groups.flatMap((g) => g.items.map((item) => ({ role: s.role, grade: g.grade, item }))));
}

function roleOf(id: string, enzyme: Enzyme, kind: EnzymeRole["kind"]) {
  return DRUG_BY_ID[id]?.enzymes.find((r) => r.enzyme === enzyme && r.kind === kind);
}

describe("enzyme hub pages", () => {
  it("one hub per enzyme, with stable unique slugs", () => {
    assert.deepEqual(
      hubs.map((h) => h.slug),
      ["cyp1a2", "cyp2b6", "cyp2c8", "cyp2c9", "cyp2c19", "cyp2d6", "cyp2e1", "cyp3a4", "p-gp"],
    );
    assert.deepEqual(hubs.map((h) => h.enzyme), [...ENZYMES]);
    for (const h of hubs) {
      assert.equal(enzymeHubBySlug(h.slug), h);
      assert.equal(h.path, `/enzyme/${h.slug}`);
      assert.equal(enzymePath(h.enzyme), h.path);
      assert.equal(h.canonical, `${SITE_URL}/enzyme/${h.slug}`);
    }
  });

  it("loose addresses 301 to the canonical slug", () => {
    assert.equal(enzymeHubRedirect("CYP3A4"), "cyp3a4");
    assert.equal(enzymeHubRedirect("cyp-2d6"), "cyp2d6");
    assert.equal(enzymeHubRedirect("pgp"), "p-gp");
    assert.equal(enzymeHubRedirect("cyp3a4"), undefined);
    assert.equal(enzymeHubRedirect("cyp9z9"), undefined);
  });

  it("every listed role exists in the catalog with the same grade and flags", () => {
    for (const h of hubs) {
      for (const { role, grade, item } of items(h)) {
        const d = DRUG_BY_ID[item.id];
        assert.ok(d, `${h.slug}: ${item.id} not in catalog`);
        assert.equal(item.name, d.name);
        assert.equal(item.kind, d.kind);
        const r = roleOf(item.id, h.enzyme, role);
        assert.ok(r, `${h.slug}: ${item.id} has no ${role} role`);
        if (r.kind === "substrate") {
          assert.equal(r.sensitivity, grade, `${h.slug}: ${item.id}`);
          const want = [r.pathway === "activation" ? "activation pathway" : null, r.nti ? "narrow therapeutic index" : null].filter(Boolean);
          assert.deepEqual(item.notes, want, `${h.slug}: ${item.id}`);
        } else {
          assert.equal(r.strength, grade, `${h.slug}: ${item.id}`);
          assert.deepEqual(item.notes, []);
        }
      }
    }
  });

  it("every catalog role on a listed kind appears exactly once, and counts match the desk's enzyme shelf", () => {
    for (const h of hubs) {
      const seen = new Map(items(h).map(({ role, item }) => [`${role}|${item.id}`, 0]));
      for (const { role, item } of items(h)) seen.set(`${role}|${item.id}`, seen.get(`${role}|${item.id}`)! + 1);
      for (const [k, n] of seen) assert.equal(n, 1, `${h.slug}: ${k} listed ${n} times`);
      for (const d of DRUGS) {
        if (!ENZYME_HUB_KINDS.includes(d.kind)) continue;
        for (const r of d.enzymes) if (r.enzyme === h.enzyme) assert.ok(seen.has(`${r.kind}|${d.id}`), `${h.slug}: missing ${d.id} ${r.kind}`);
      }
      for (const s of h.sections) {
        const shelf = drugsWithRole(h.enzyme, s.role).filter((d) => ENZYME_HUB_KINDS.includes(d.kind));
        assert.equal(s.count, shelf.length, `${h.slug} ${s.id}`);
        for (const g of s.groups) {
          const names = g.items.map((i) => i.name);
          assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)), `${h.slug} ${g.label} sorted`);
        }
      }
      assert.equal(h.counts.items, new Set(items(h).map((x) => x.item.id)).size, h.slug);
    }
  });

  it("lists only drugs, foods and herbs; research peptides are left out", () => {
    assert.deepEqual([...ENZYME_HUB_KINDS], ["drug", "food", "herb"]);
    const peptides = DRUGS.filter((d) => d.kind === "research-peptide");
    assert.ok(peptides.length > 0);
    for (const h of hubs) {
      for (const { item } of items(h)) assert.ok(ENZYME_HUB_KINDS.includes(item.kind), `${h.slug}: ${item.id} is ${item.kind}`);
      for (const p of peptides) assert.ok(!rendered.get(h.slug)!.includes(`brief=${p.id}"`), `${h.slug}: ${p.id}`);
    }
    for (const p of peptides) assert.deepEqual(drugEnzymeLinks(p.id), []);
    const kinds = new Set(hubs.flatMap((h) => items(h).map((x) => x.item.kind)));
    assert.ok(kinds.has("food") && kinds.has("herb") && kinds.has("drug"));
  });

  it("hubs under the item threshold are noindex and stay out of the sitemap; the rest are indexed", () => {
    assert.equal(ENZYME_HUB_MIN_ITEMS, 10);
    for (const h of hubs) {
      const want = h.counts.items >= ENZYME_HUB_MIN_ITEMS && h.counts.substrates > 0 && h.counts.inhibitors + h.counts.inducers > 0;
      assert.equal(h.indexable, want, h.slug);
    }
    assert.equal(enzymeHubBySlug("cyp2e1")!.indexable, false);
    assert.deepEqual(
      hubs.filter((h) => h.indexable).map((h) => h.slug),
      ["cyp1a2", "cyp2b6", "cyp2c8", "cyp2c9", "cyp2c19", "cyp2d6", "cyp3a4", "p-gp"],
    );
  });

  it("every drug link opens its hub when one exists, otherwise the desk via ?brief=", () => {
    const hubIds = new Set(drugHubs().map((h) => h.drugId));
    for (const h of hubs) {
      const m = rendered.get(h.slug)!;
      for (const { item } of items(h)) {
        if (item.hub) {
          assert.ok(hubIds.has(item.id), item.id);
          assert.equal(item.href, drugHubPath(item.id));
          assert.equal(drugHubBySlug(item.href.replace("/drug/", ""))?.drugId, item.id, item.href);
          assert.ok(m.includes(`href="${item.href}" class="underline"`), `${h.slug}: ${item.href}`);
        } else {
          assert.ok(!hubIds.has(item.id), `${item.id} has a hub but links to the desk`);
          assert.ok(item.href.startsWith("/?brief="), item.href);
          assert.equal(new URLSearchParams(item.href.split("?")[1]).get("brief"), item.id);
          assert.ok(m.includes(`href="${item.href}" rel="nofollow"`), `${h.slug}: ${item.href}`);
        }
      }
    }
  });

  it("lists every pair page whose mechanism runs through the enzyme, and nothing else", () => {
    for (const h of hubs) {
      const listed = h.pairGroups.flatMap((g) => g.pairs.map((p) => ({ ...p, label: g.label, severity: g.severity })));
      assert.equal(new Set(listed.map((p) => p.slug)).size, listed.length, `${h.slug}: duplicate pair`);
      assert.equal(h.counts.pairs, listed.length);
      for (const p of listed) {
        const page = pairPageBySlug(p.slug);
        assert.ok(page, p.slug);
        assert.ok(page.enzymes.includes(h.enzyme), `${h.slug}: ${p.slug}`);
        assert.ok(page.mechanism.includes(h.enzyme), `${h.slug}: ${p.slug} mechanism "${page.mechanism}"`);
        assert.equal(p.severity, page.severity);
        assert.equal(p.label, SEVERITY_LABEL[page.severity]);
        assert.ok(rendered.get(h.slug)!.includes(`href="/pair/${p.slug}"`), p.slug);
      }
      const want = pages.filter((p) => p.enzymes.includes(h.enzyme)).map((p) => p.slug).sort();
      assert.deepEqual(listed.map((p) => p.slug).sort(), want, h.slug);
    }
    assert.ok(enzymeHubBySlug("cyp3a4")!.counts.pairs > 100);
  });

  it("pair pages name exactly the enzymes in their mechanism line", () => {
    for (const p of pages) {
      const named = ENZYMES.filter((e) => p.mechanism.includes(e));
      assert.deepEqual([...p.enzymes].sort(), [...named].sort(), p.slug);
    }
  });

  it("titles, meta and h1 use the agreed wording and are unique", () => {
    const TIERS = Object.values(SEVERITY_LABEL);
    for (const h of hubs) {
      const roles = h.sections.filter((s) => s.count > 0).map((s) => s.id);
      const rolesText = roles.length > 1 ? `${roles.slice(0, -1).join(", ")} and ${roles[roles.length - 1]}` : roles.join("");
      assert.equal(h.title, `${h.name} ${rolesText} | FirstPass`);
      assert.equal(h.h1, `${h.name} ${rolesText}`);
      assert.ok(h.description.startsWith(`${h.name} ${rolesText} on the FirstPass desk: ${h.counts.items} mapped `), h.description);
      assert.ok(h.description.endsWith(PAIR_DISCLAIMER), h.slug);
      for (const s of [h.title, h.description, h.h1]) {
        for (const t of TIERS) assert.ok(!s.toLowerCase().includes(t.toLowerCase()), `${h.slug}: tier "${t}" in "${s}"`);
        assert.doesNotMatch(s, /contraindicat/i);
        assert.ok(!BANNED.test(s), `${h.slug}: ${s.match(BANNED)?.[0]}`);
        assert.ok(!DOSE.test(s), `${h.slug}: ${s.match(DOSE)?.[0]}`);
      }
    }
    assert.equal(enzymeHubBySlug("cyp3a4")!.title, "CYP3A4 inhibitors, inducers and substrates | FirstPass");
    assert.equal(enzymeHubBySlug("cyp2d6")!.title, "CYP2D6 inhibitors and substrates | FirstPass");
    assert.equal(enzymeHubBySlug("p-gp")!.title, "P-glycoprotein (P-gp) inhibitors, inducers and substrates | FirstPass");
    assert.equal(new Set(hubs.map((h) => h.title)).size, hubs.length);
    assert.equal(new Set(hubs.map((h) => h.description)).size, hubs.length);
  });

  it("each page renders one h1, the about text, the not-a-complete-list line and the disclaimer, with no dose, buyer or patient wording", () => {
    for (const h of hubs) {
      const m = rendered.get(h.slug)!;
      const t = text(m);
      assert.equal((m.match(/<h1[\s>]/g) ?? []).length, 1, h.slug);
      assert.ok(h.about.length > 80 && t.includes(h.about), `${h.slug} about`);
      assert.ok(t.includes(h.intro), `${h.slug} intro`);
      assert.ok(h.intro.includes("not a complete list") && h.intro.includes("hasn't been cleared as safe"), h.slug);
      assert.ok(t.includes(PAIR_DISCLAIMER), `${h.slug} disclaimer`);
      assert.ok(t.includes(h.inhibition) && t.includes(h.induction), `${h.slug} how to read`);
      assert.ok(!BANNED.test(t), `${h.slug}: ${t.match(BANNED)?.[0]}`);
      assert.ok(!DOSE.test(t), `${h.slug}: ${t.match(DOSE)?.[0]}`);
      assert.ok(!PATIENT.test(t), `${h.slug}: ${t.match(PATIENT)?.[0]}`);
      for (const s of h.sections) {
        if (s.count) assert.equal(s.none, null);
        else assert.ok(s.none && t.includes(s.none), `${h.slug} ${s.id} empty line`);
      }
      assert.equal(h.activationNote !== null, items(h).some((x) => x.item.notes.includes("activation pathway")), h.slug);
    }
    assert.ok(text(rendered.get("cyp2d6")!).includes("No inducers are mapped for CYP2D6 on the desk."));
    // P-gp is a transporter: no CYP-only wording on its page.
    const pgp = enzymeHubBySlug("p-gp")!;
    assert.doesNotMatch(`${pgp.inhibition} ${pgp.induction} ${pgp.strengthNote}`, /destroy|enzyme|FDA/);
    assert.ok(!rendered.get("p-gp")!.includes("fold"));
  });

  it("enzyme copy follows the pair-copy rules", () => {
    const strings: [string, string][] = [];
    for (const [k, v] of Object.entries(copy)) {
      if (typeof v === "string") strings.push([k, v]);
      else if (v && typeof v === "object") for (const [kk, vv] of Object.entries(v)) strings.push([`${k}.${kk}`, String(vv)]);
    }
    for (const [k, v] of strings.filter(([key]) => /ENZYME/.test(key))) {
      assert.ok(!BANNED.test(v), `${k}: ${v.match(BANNED)?.[0]}`);
      assert.ok(!DOSE.test(v), `${k}: ${v.match(DOSE)?.[0]}`);
      assert.ok(!PATIENT.test(v), `${k}: ${v.match(PATIENT)?.[0]}`);
    }
    assert.deepEqual(Object.keys(ENZYME_ABOUT).sort(), [...ENZYMES].sort());
  });

  it("every drug named in the about copy holds the role the copy gives it", () => {
    type Claim = [id: string, enzyme: Enzyme, kind: EnzymeRole["kind"], detail?: string];
    const CLAIMS: Record<Enzyme, Claim[]> = {
      CYP1A2: [
        ["caffeine", "CYP1A2", "substrate"], ["theophylline", "CYP1A2", "substrate"], ["clozapine", "CYP1A2", "substrate"],
        ["olanzapine", "CYP1A2", "substrate"], ["tizanidine", "CYP1A2", "substrate"], ["nicotine", "CYP1A2", "inducer"],
        ["fluvoxamine", "CYP1A2", "inhibitor", "strong"], ["ciprofloxacin", "CYP1A2", "inhibitor", "moderate"],
      ],
      CYP2B6: [["bupropion", "CYP2B6", "substrate"], ["efavirenz", "CYP2B6", "substrate"], ["ketamine", "CYP2B6", "substrate"], ["methadone", "CYP2B6", "substrate"]],
      CYP2C8: [
        ["repaglinide", "CYP2C8", "substrate"], ["pioglitazone", "CYP2C8", "substrate"], ["montelukast", "CYP2C8", "substrate"],
        ["gemfibrozil", "CYP2C8", "inhibitor", "strong"], ["clopidogrel", "CYP2C8", "inhibitor"],
      ],
      CYP2C9: [
        ["warfarin", "CYP2C9", "substrate", "nti"], ["phenytoin", "CYP2C9", "substrate", "nti"], ["celecoxib", "CYP2C9", "substrate"],
        ["ibuprofen", "CYP2C9", "substrate"], ["glipizide", "CYP2C9", "substrate"], ["losartan", "CYP2C9", "substrate", "activation"],
      ],
      CYP2C19: [
        ["clopidogrel", "CYP2C19", "substrate", "activation"], ["omeprazole", "CYP2C19", "substrate"], ["citalopram", "CYP2C19", "substrate"],
        ["escitalopram", "CYP2C19", "substrate"], ["diazepam", "CYP2C19", "substrate"], ["fluvoxamine", "CYP2C19", "inhibitor", "strong"],
      ],
      CYP2D6: [
        ["metoprolol", "CYP2D6", "substrate"], ["codeine", "CYP2D6", "substrate", "activation"], ["tramadol", "CYP2D6", "substrate", "activation"],
        ["tamoxifen", "CYP2D6", "substrate", "activation"], ["paroxetine", "CYP2D6", "inhibitor", "strong"], ["fluoxetine", "CYP2D6", "inhibitor", "strong"],
        ["bupropion", "CYP2D6", "inhibitor", "strong"], ["quinidine", "CYP2D6", "inhibitor", "strong"],
      ],
      CYP2E1: [["ethanol", "CYP2E1", "substrate"], ["ethanol", "CYP2E1", "inducer"], ["acetaminophen", "CYP2E1", "substrate", "activation"], ["disulfiram", "CYP2E1", "inhibitor", "strong"]],
      CYP3A4: [
        ["midazolam", "CYP3A4", "substrate"], ["simvastatin", "CYP3A4", "substrate"], ["grapefruit", "CYP3A4", "inhibitor"],
        ["clarithromycin", "CYP3A4", "inhibitor", "strong"], ["itraconazole", "CYP3A4", "inhibitor", "strong"], ["ritonavir", "CYP3A4", "inhibitor", "strong"],
        ["rifampin", "CYP3A4", "inducer", "strong"], ["st-johns-wort", "CYP3A4", "inducer", "strong"],
      ],
      "P-gp": [
        ["digoxin", "P-gp", "substrate"], ["dabigatran", "P-gp", "substrate"], ["verapamil", "P-gp", "inhibitor"], ["rifampin", "P-gp", "inducer"],
        // "Many drugs that act on CYP3A4 act on P-gp too": both examples must also hold a CYP3A4 role.
        ["verapamil", "CYP3A4", "inhibitor"], ["rifampin", "CYP3A4", "inducer"],
      ],
    };
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const enzyme of ENZYMES) {
      const about = ENZYME_ABOUT[enzyme]!.toLowerCase();
      const claims = CLAIMS[enzyme];
      for (const [id, e, kind, detail] of claims) {
        const d = DRUG_BY_ID[id];
        assert.ok(d, id);
        assert.ok(about.includes(d.name.toLowerCase().replace(" juice", "")), `${enzyme}: "${d.name}" not in the about text`);
        const r = roleOf(id, e, kind);
        assert.ok(r, `${enzyme}: ${id} is not a ${e} ${kind}`);
        if (!detail) continue;
        if (r.kind === "substrate") {
          if (detail === "activation") assert.equal(r.pathway, "activation", id);
          if (detail === "nti") assert.equal(r.nti, true, id);
        } else assert.equal(r.strength, detail, `${enzyme}: ${id}`);
      }
      // Any catalog item named in the text must be one of the checked claims.
      const claimed = new Set(claims.map((c) => c[0]));
      for (const d of DRUGS) {
        const names = [d.name, ...d.brands].map((s) => s.toLowerCase()).filter((s) => s.length >= 4);
        if (names.some((n) => new RegExp(`(^|[^a-z0-9])${esc(n)}([^a-z0-9]|$)`).test(about))) assert.ok(claimed.has(d.id), `${enzyme}: names ${d.id} without a checked claim`);
      }
    }
    assert.equal(enzymeHubBySlug("cyp2d6")!.counts.inducers, 0, "the CYP2D6 copy says medicines rarely induce it");
  });

  it("drug hubs link every enzyme their drug touches, with the catalog roles", () => {
    let linked = 0;
    for (const h of drugHubs()) {
      const d = DRUG_BY_ID[h.drugId]!;
      const want = ENZYMES.filter((e) => d.enzymes.some((r) => r.enzyme === e));
      assert.deepEqual(h.enzymes.map((e) => e.enzyme), want, h.slug);
      const m = renderToStaticMarkup(createElement(DrugHubView, { hub: h }));
      for (const e of h.enzymes) {
        assert.equal(e.path, enzymePath(e.enzyme));
        assert.ok(enzymeHubBySlug(e.path.replace("/enzyme/", "")), e.path);
        assert.deepEqual(e.roles, d.enzymes.filter((r) => r.enzyme === e.enzyme).map(roleLabel));
        assert.ok(m.includes(`href="${e.path}"`), `${h.slug} -> ${e.path}`);
        linked++;
      }
      if (!want.length) assert.ok(!m.includes('data-testid="drug-hub-enzymes"'), h.slug);
    }
    assert.ok(linked > 100);
    assert.equal(roleLabel({ enzyme: "CYP2C9", kind: "substrate", sensitivity: "sensitive", pathway: "clearance", nti: true }), "sensitive substrate (narrow therapeutic index)");
    assert.equal(roleLabel({ enzyme: "CYP3A4", kind: "inhibitor", strength: "strong" }), "strong inhibitor");
  });

  it("pair pages link the enzymes behind their mechanism", () => {
    for (const p of pages) {
      const m = renderToStaticMarkup(createElement(PairPageView, { page: p }));
      for (const e of p.enzymes) assert.ok(m.includes(`href="${enzymePath(e)}"`), `${p.slug} -> ${e}`);
      if (!p.enzymes.length) assert.ok(!m.includes("/enzyme/"), p.slug);
    }
    assert.ok(pages.filter((p) => p.enzymes.length).length > 200);
  });

  it("/enzymes links every hub with counts, and /pairs and /enzymes cross-link", () => {
    const idx = renderToStaticMarkup(createElement(EnzymesIndexView, { hubs }));
    const t = text(idx);
    assert.equal((idx.match(/<h1[\s>]/g) ?? []).length, 1);
    for (const h of hubs) {
      assert.ok(idx.includes(`href="${h.path}"`), h.slug);
      assert.ok(t.includes(`${h.counts.inhibitors} inhibitor`) && t.includes(`${h.counts.substrates} substrate`), h.slug);
    }
    assert.ok(idx.includes('href="/pairs"'));
    assert.ok(t.includes(PAIR_DISCLAIMER));
    assert.ok(!BANNED.test(t) && !DOSE.test(t) && !PATIENT.test(t));
    for (const s of [copy.ENZYMES_INDEX_TITLE, copy.ENZYMES_INDEX_DESCRIPTION]) assert.ok(!BANNED.test(s) && !DOSE.test(s), s);
    const pairsIdx = renderToStaticMarkup(createElement(PairsIndexView, { pages }));
    assert.ok(pairsIdx.includes('href="/enzymes"'));
    for (const h of hubs) assert.ok(pairsIdx.includes(`href="${h.path}"`), h.slug);
    for (const h of hubs) assert.ok(rendered.get(h.slug)!.includes('href="/enzymes"'), h.slug);
  });

  it("sitemap lists /enzymes and every indexable hub once, and no noindex hub", () => {
    const xml = sitemapXml();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.equal(new Set(locs).size, locs.length, "duplicate sitemap URL");
    assert.ok(locs.includes(`${SITE_URL}/enzymes`));
    for (const h of hubs) assert.equal(locs.includes(h.canonical), h.indexable, h.slug);
    assert.deepEqual(enzymeHubUrls(), hubs.filter((h) => h.indexable).map((h) => h.canonical));
    for (const u of locs) assert.ok(u.startsWith(`${SITE_URL}/`), u);
  });

  it("robots.txt allows crawling and points at the sitemap", () => {
    const robots = readFileSync(new URL("../../../public/robots.txt", import.meta.url), "utf8");
    assert.match(robots, /^User-agent: \*$/m);
    assert.match(robots, /^Allow: \/$/m);
    assert.doesNotMatch(robots, /^Disallow: \/\s*$/m);
    assert.ok(robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
  });

  it("breadcrumb JSON-LD is a plain BreadcrumbList on SITE_URL", () => {
    const ld = breadcrumbJsonLd([HOME_CRUMB, { name: "Enzymes", url: `${SITE_URL}/enzymes` }, { name: "CYP3A4", url: `${SITE_URL}/enzyme/cyp3a4` }]);
    assert.deepEqual(ld, {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "FirstPass", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Enzymes", item: `${SITE_URL}/enzymes` },
        { "@type": "ListItem", position: 3, name: "CYP3A4", item: `${SITE_URL}/enzyme/cyp3a4` },
      ],
    });
    assert.doesNotMatch(JSON.stringify(ld), /Medical|Drug"|MedicalWebPage|Physician/);
  });
});
