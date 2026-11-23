import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import { ClassEmbedBox, ClassEmbedCard, DrugEmbedBox, DrugEmbedCard } from "@/components/seo/hub-embed";
import { ClassPageView } from "@/components/seo/class-page";
import { DrugHubView } from "@/components/seo/pair-page";
import { EMBED_CSS } from "@/components/seo/pair-embed";
import {
  CLASS_EMBED_MAX_ENZYMES,
  CLASS_EMBED_MAX_MEMBERS,
  DRUG_EMBED_MAX_PAIRS,
  HUB_EMBED_HEIGHT,
  classEmbedSnippet,
  drugEmbedSnippet,
  embedClassUrl,
  embedDrugUrl,
} from "./hub-embed";
import { classEmbedBySlug, classEmbedFromHub, drugEmbedBySlug, drugEmbedFromHub, loadClassEmbed, loadDrugEmbed } from "./hub-embed-load";
import { CITED_ONLY_HUB_IDS, drugHubBySlug, drugHubs, legacyDrugHubRedirect } from "./drug-hubs";
import { classHubBySlug, classHubRedirect, classHubs, classLinkForDrug } from "./class-hubs";
import { sitemapXml } from "./pair-pages";
import { DISCLAIMER_ACTION, PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";
import { showsSiteHeader } from "./site-nav";
import { Route as DrugEmbedRoute } from "@/routes/embed.drug.$slug";
import { Route as ClassEmbedRoute } from "@/routes/embed.class.$slug";

const decode = (h: string) => h.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const text = (h: string) => decode(h.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

const hubs = drugHubs();
/** A hub with more pairs than the card shows, and one that fits. */
const bigDrug = hubs.filter((h) => h.pairCount > DRUG_EMBED_MAX_PAIRS).sort((a, b) => b.pairCount - a.pairCount)[0]!;
const smallDrug = hubs.find((h) => h.pairCount > 0 && h.pairCount <= DRUG_EMBED_MAX_PAIRS)!;
const citedOnly = hubs.find((h) => h.pairCount === 0 && (CITED_ONLY_HUB_IDS as readonly string[]).includes(h.drugId));
const classes = classHubs();
const azole = classHubBySlug("azole-antifungal") ?? classes[0]!;
const bigClass = classes.find((c) => c.members.length > CLASS_EMBED_MAX_MEMBERS);

type Head = { meta: Record<string, string>[]; links: { rel: string; href: string }[] };
const headOf = <T,>(route: { options: { head?: unknown } }, loaderData: T) => (route.options.head as (ctx: { loaderData: T }) => Head)({ loaderData });

function assertFramedCard(html: string, canonical: string) {
  assert.match(html, /<main class="fpe" aria-labelledby="fpe-title"/);
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
  assert.ok(decode(html).includes(PAIR_DISCLAIMER) && decode(html).includes(DISCLAIMER_ACTION), "disclaimer");
  assert.match(html, new RegExp(`<a href="${canonical}" target="_blank" rel="noopener" data-testid="embed-open">Open in FirstPass`));
  assert.match(html, new RegExp(`<a href="${SITE_URL}/sources" target="_blank" rel="noopener" data-testid="embed-sources">`));
  // Every link leaves the frame, to the canonical site.
  const anchors = html.match(/<a [^>]*>/g) ?? [];
  assert.ok(anchors.length >= 2);
  for (const a of anchors) {
    assert.match(a, /target="_blank" rel="noopener"/, a);
    assert.match(a, new RegExp(`href="${SITE_URL}/`), a);
  }
  assert.doesNotMatch(html, /<header|<nav|<script/);
  assert.ok(html.includes(EMBED_CSS.slice(0, 40)), "own light/dark styles");
}

describe("embed drug cards: data", () => {
  it("a card copies the hub's name, class link and pair rows in the hub's order, capped", () => {
    const card = drugEmbedBySlug(bigDrug.slug)!;
    assert.equal(card.name, bigDrug.name);
    assert.equal(card.canonical, `${SITE_URL}/drug/${bigDrug.slug}`);
    assert.equal(card.pairCount, bigDrug.pairCount);
    const rows = bigDrug.groups.flatMap((g) => g.pairs.map((p) => ({ slug: p.pairSlug, other: p.otherName, label: g.label })));
    assert.equal(card.pairs.length, DRUG_EMBED_MAX_PAIRS);
    assert.deepEqual(
      card.pairs.map((p) => ({ slug: p.pairSlug, other: p.otherName, label: p.severityLabel })),
      rows.slice(0, DRUG_EMBED_MAX_PAIRS),
    );
    for (const p of card.pairs) assert.equal(p.href, `${SITE_URL}/pair/${p.pairSlug}`);
    const cls = classLinkForDrug(bigDrug.drugId);
    assert.deepEqual(card.classLink, cls ? { name: cls.name, href: `${SITE_URL}${cls.path}` } : null);
    assert.equal(card.note, null);
  });

  it("every hub has a card whose labels are the hub's group labels", () => {
    for (const h of hubs) {
      const card = drugEmbedFromHub(h);
      const labels = new Map(h.groups.flatMap((g) => g.pairs.map((p) => [p.pairSlug, g.label] as const)));
      assert.equal(card.slug, h.slug);
      assert.ok(card.pairs.length <= DRUG_EMBED_MAX_PAIRS);
      for (const p of card.pairs) assert.equal(p.severityLabel, labels.get(p.pairSlug), `${h.slug} ${p.pairSlug}`);
    }
  });

  it("an unknown slug has no card and the loader throws notFound (404)", () => {
    assert.equal(drugEmbedBySlug("not-a-real-drug"), undefined);
    assert.throws(() => loadDrugEmbed("not-a-real-drug"), (e: unknown) => isNotFound(e));
    assert.equal(loadDrugEmbed(bigDrug.slug).slug, bigDrug.slug);
  });

  it("a renamed hub slug redirects to the current embed address", () => {
    const to = legacyDrugHubRedirect("naltrexone-bupropion");
    if (!to) return; // no rename in the data any more
    assert.throws(
      () => loadDrugEmbed("naltrexone-bupropion"),
      (e: unknown) => isRedirect(e) && e.options.to === "/embed/drug/$slug" && (e.options.params as { slug?: string } | undefined)?.slug === to && e.status === 301,
    );
  });
});

describe("embed class cards: data", () => {
  it("a card copies the class page's name, members, enzyme roles and pair counts", () => {
    const card = classEmbedBySlug(azole.slug)!;
    assert.equal(card.name, azole.name);
    assert.equal(card.canonical, `${SITE_URL}/class/${azole.slug}`);
    assert.equal(card.memberCount, azole.members.length);
    assert.deepEqual(card.members, azole.members.slice(0, CLASS_EMBED_MAX_MEMBERS).map((m) => ({ name: m.name, href: `${SITE_URL}${m.href}` })));
    assert.equal(card.enzymeCount, azole.enzymes.length);
    assert.ok(card.enzymes.length <= CLASS_EMBED_MAX_ENZYMES);
    card.enzymes.forEach((e, i) => {
      const src = azole.enzymes[i]!;
      assert.equal(e.name, src.name);
      assert.equal(e.drugs, src.drugs);
      assert.deepEqual(e.roles, src.roles.map((r) => ({ label: r.label, count: r.count })));
    });
    assert.deepEqual(card.severityCounts, azole.pairGroups.map((g) => ({ label: g.label, count: g.pairs.length })));
    assert.equal(card.pairCount, azole.counts.pairs);
    assert.equal(card.severityCounts.reduce((n, s) => n + s.count, 0), card.pairCount);
  });

  it("every class page has a card", () => {
    for (const c of classes) assert.equal(classEmbedFromHub(c).slug, c.slug);
  });

  it("an unknown slug has no card and the loader throws notFound (404)", () => {
    assert.equal(classEmbedBySlug("not-a-real-class"), undefined);
    assert.throws(() => loadClassEmbed("not-a-real-class"), (e: unknown) => isNotFound(e));
    assert.equal(loadClassEmbed(azole.slug).slug, azole.slug);
  });

  it("a loose class slug redirects to the canonical embed address", () => {
    const loose = azole.slug.replace(/-/g, "_").toUpperCase();
    const to = classHubRedirect(loose);
    assert.equal(to, azole.slug);
    assert.throws(
      () => loadClassEmbed(loose),
      (e: unknown) => isRedirect(e) && e.options.to === "/embed/class/$slug" && (e.options.params as { slug?: string } | undefined)?.slug === to && e.status === 301,
    );
  });

  it("embed pages stay out of the sitemap and the site header", () => {
    assert.doesNotMatch(sitemapXml(), /\/embed\//);
    assert.equal(showsSiteHeader(`/embed/drug/${bigDrug.slug}`), false);
    assert.equal(showsSiteHeader(`/embed/class/${azole.slug}`), false);
    assert.equal(showsSiteHeader(`/drug/${bigDrug.slug}`), true);
  });
});

describe("embed drug and class cards: page", () => {
  it("a drug card renders the name, class link, capped pair rows with grade labels, See all, and the disclaimer", () => {
    const card = drugEmbedBySlug(bigDrug.slug)!;
    const html = renderToStaticMarkup(<DrugEmbedCard card={card} />);
    assertFramedCard(html, card.canonical);
    assert.ok(decode(html).includes(`<h1 id="fpe-title">${card.name}</h1>`));
    const rows = /<ul class="fpe-list" data-testid="embed-pairs">([\s\S]*?)<\/ul>/.exec(html)![1]!;
    assert.equal((rows.match(/<li>/g) ?? []).length, DRUG_EMBED_MAX_PAIRS);
    const labels = [...rows.matchAll(/data-testid="embed-pair-severity">([^<]*)</g)].map((m) => decode(m[1]!));
    assert.deepEqual(labels, card.pairs.map((p) => p.severityLabel));
    for (const p of card.pairs) assert.ok(rows.includes(`href="${p.href}"`), p.pairSlug);
    assert.match(html, new RegExp(`data-testid="embed-see-all">See all ${card.pairCount} on FirstPass`));
    if (card.classLink) assert.match(html, /data-testid="embed-class"/);
    assert.ok(text(html).includes(`A drug that isn't listed here hasn't been cleared as safe with ${card.name}.`));
  });

  it("a drug card that shows every pair has no See all link; a cited-only hub shows its note", () => {
    const html = renderToStaticMarkup(<DrugEmbedCard card={drugEmbedBySlug(smallDrug.slug)!} />);
    assertFramedCard(html, smallDrug.canonical);
    assert.doesNotMatch(html, /embed-see-all/);
    if (citedOnly) {
      const c = renderToStaticMarkup(<DrugEmbedCard card={drugEmbedBySlug(citedOnly.slug)!} />);
      assertFramedCard(c, citedOnly.canonical);
      assert.match(c, /data-testid="embed-note"/);
      assert.doesNotMatch(c, /embed-pairs/);
    }
  });

  it("a class card renders the name, members, enzyme roles, pair counts and the disclaimer", () => {
    const card = classEmbedBySlug(azole.slug)!;
    const html = renderToStaticMarkup(<ClassEmbedCard card={card} />);
    assertFramedCard(html, card.canonical);
    assert.ok(decode(html).includes(`<h1 id="fpe-title">${card.name}</h1>`));
    for (const m of card.members) assert.ok(html.includes(`href="${m.href}"`), m.name);
    for (const e of card.enzymes) assert.ok(html.includes(`href="${e.href}"`), e.name);
    const counts = text(/data-testid="embed-severity-counts">([^<]*)</.exec(html)![1]!);
    assert.equal(counts, card.severityCounts.map((s) => `${s.label}: ${s.count}`).join(" · "));
    if (bigClass) {
      const big = renderToStaticMarkup(<ClassEmbedCard card={classEmbedFromHub(bigClass)} />);
      assert.ok(text(big).includes(`and ${bigClass.members.length - CLASS_EMBED_MAX_MEMBERS} more`));
    }
  });

  it("the routes are noindex, canonical to the hub, and server-rendered", () => {
    const drug = drugEmbedBySlug(bigDrug.slug)!;
    const dh = headOf(DrugEmbedRoute, drug);
    assert.ok(dh.meta.some((m) => m.name === "robots" && /noindex/.test(m.content!)));
    assert.deepEqual(dh.links, [{ rel: "canonical", href: `${SITE_URL}/drug/${bigDrug.slug}` }]);
    const cls = classEmbedBySlug(azole.slug)!;
    const ch = headOf(ClassEmbedRoute, cls);
    assert.ok(ch.meta.some((m) => m.name === "robots" && /noindex/.test(m.content!)));
    assert.deepEqual(ch.links, [{ rel: "canonical", href: `${SITE_URL}/class/${azole.slug}` }]);
    for (const head of [headOf(DrugEmbedRoute, undefined), headOf(ClassEmbedRoute, undefined)]) {
      assert.ok(head.meta.some((m) => m.name === "robots" && m.content === "noindex"));
    }
    assert.ok(readFileSync("src/routes/embed.drug.$slug.tsx", "utf8").includes('createFileRoute("/embed/drug/$slug")'));
    assert.ok(readFileSync("src/routes/embed.class.$slug.tsx", "utf8").includes('createFileRoute("/embed/class/$slug")'));
    const gen = readFileSync("src/routeTree.gen.ts", "utf8");
    assert.ok(gen.includes("'/embed/drug/$slug'") && gen.includes("'/embed/class/$slug'"));
    assert.doesNotMatch(readFileSync("vite.config.ts", "utf8"), /\/embed/, "embed pages are not prerendered");
  });
});

describe("drug and class embed snippets", () => {
  it("point at the canonical SITE_URL with the agreed attributes", () => {
    for (const [s, src, title] of [
      [drugEmbedSnippet(bigDrug), embedDrugUrl(bigDrug.slug), `FirstPass: ${bigDrug.name} drug-pair card`],
      [classEmbedSnippet(azole), embedClassUrl(azole.slug), `FirstPass: ${azole.name} drug-class card`],
    ] as const) {
      const attrs = Object.fromEntries([...s.matchAll(/ ([a-z]+)="([^"]*)"/g)].map((m) => [m[1]!, decode(m[2]!)]));
      assert.equal(attrs.src, src);
      assert.match(attrs.src!, /^https:\/\/firstpass-desk\.vercel\.app\/embed\/(drug|class)\//);
      assert.equal(attrs.title, title);
      assert.equal(attrs.width, "100%");
      assert.equal(attrs.height, String(HUB_EMBED_HEIGHT));
      assert.equal(HUB_EMBED_HEIGHT, 520);
      assert.equal(attrs.loading, "lazy");
      assert.match(s, /^<iframe [^<>]*><\/iframe>$/);
    }
  });

  it("escape names and slugs so nothing breaks out of an attribute", () => {
    const s = drugEmbedSnippet({ slug: 'a"b<c>&d e', name: 'X "Y" <Z> & W' });
    assert.match(s, /^<iframe [^<>]*><\/iframe>$/);
    assert.ok(s.includes(`src="${SITE_URL}/embed/drug/a%22b%3Cc%3E%26d%20e"`), s);
    assert.ok(s.includes('title="FirstPass: X &quot;Y&quot; &lt;Z&gt; &amp; W drug-pair card"'), s);
    assert.ok(classEmbedSnippet({ slug: "x y", name: "<b>" }).includes(`src="${SITE_URL}/embed/class/x%20y" title="FirstPass: &lt;b&gt; drug-class card"`));
  });

  it("drug hubs and class pages have a collapsed Embed this card box above the disclaimer", () => {
    const cases = [
      { html: renderToStaticMarkup(<DrugHubView hub={bigDrug} />), id: "drug-embed", snippet: drugEmbedSnippet(bigDrug), box: renderToStaticMarkup(<DrugEmbedBox hub={bigDrug} />), url: embedDrugUrl(bigDrug.slug) },
      { html: renderToStaticMarkup(<ClassPageView hub={azole} />), id: "class-embed", snippet: classEmbedSnippet(azole), box: renderToStaticMarkup(<ClassEmbedBox hub={azole} />), url: embedClassUrl(azole.slug) },
    ];
    for (const c of cases) {
      const box = new RegExp(`<details data-testid="${c.id}"[^>]*>([\\s\\S]*?)</details>`).exec(c.html);
      assert.ok(box, `${c.id} present`);
      assert.doesNotMatch(box![0], /<details[^>]* open/);
      assert.match(box![1]!, /<summary[^>]*>Embed this card<\/summary>/);
      const area = /<textarea([^>]*)>([^<]*)<\/textarea>/.exec(box![1]!);
      assert.ok(area && /readOnly|readonly/.test(area[1]!), "read-only textarea");
      assert.equal(decode(area![2]!), c.snippet);
      assert.match(box![1]!, /<label for="[^"]+"[^>]*>Embed code for/);
      assert.match(box![1]!, /<button type="button"[^>]*>Copy<\/button>/);
      assert.match(box![1]!, /role="status" aria-live="polite"/);
      assert.ok(c.html.indexOf(`data-testid="${c.id}"`) < c.html.indexOf('data-testid="pair-disclaimer"'));
      assert.ok(c.box.includes(c.url));
    }
    assert.ok(drugHubBySlug(bigDrug.slug));
  });
});
