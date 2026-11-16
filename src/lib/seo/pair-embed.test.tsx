import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import { EMBED_CSS, EmbedSnippetDisclosure, PairEmbedCard } from "@/components/seo/pair-embed";
import { PairPageView } from "@/components/seo/pair-page";
import { EMBED_HEIGHT, embedPairUrl, embedSnippet, escapeAttr } from "./pair-embed";
import { loadPairEmbed, pairEmbedBySlug, pairEmbedFromPage } from "./pair-embed-load";
import { legacyPairRedirect, pairPageBySlug, pairPages, sitemapXml } from "./pair-pages";
import { DISCLAIMER_ACTION, PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";
import { showsSiteHeader } from "./site-nav";
import { Route as EmbedRoute } from "@/routes/embed.pair.$slug";

const pages = pairPages();
const known = pairPageBySlug("alosetron-fluvoxamine") ?? pages[0]!;
const decode = (h: string) => h.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const testIdText = (html: string, id: string) => decode(new RegExp(`data-testid="${id}"[^>]*>([^<]*)<`).exec(html)?.[1] ?? "");

describe("embed pair cards: data", () => {
  it("a known slug's card carries the pair page's own grade label, lead why and quote", () => {
    const card = pairEmbedBySlug(known.slug)!;
    assert.ok(card, known.slug);
    assert.equal(card.severityLabel, known.severityLabel);
    assert.equal(card.why?.title, known.why[0]?.title);
    assert.equal(card.why?.href, known.why[0]?.href);
    assert.equal(card.quote?.quote, known.quote?.quote);
    assert.equal(card.quote?.url, known.quote?.url);
    assert.equal(card.canonical, `${SITE_URL}/pair/${known.slug}`);
    // Rendered label matches what the pair page shows, character for character.
    const pairHtml = renderToStaticMarkup(<PairPageView page={known} />);
    const embedHtml = renderToStaticMarkup(<PairEmbedCard card={card} />);
    assert.equal(testIdText(embedHtml, "embed-severity"), testIdText(pairHtml, "pair-severity"));
    if (card.why?.href) assert.ok(decode(pairHtml).includes(card.why.linkText!), "source link text matches the pair page's");
  });

  it("every pair page has a card whose grade label is the page's", () => {
    for (const p of pages) {
      const card = pairEmbedFromPage(p);
      assert.equal(card.severityLabel, p.severityLabel, p.slug);
      assert.equal(card.slug, p.slug);
    }
  });

  it("an unknown slug has no card and the loader throws notFound (404)", () => {
    assert.equal(pairEmbedBySlug("not-a-real-pair"), undefined);
    assert.throws(() => loadPairEmbed("not-a-real-pair"), (e: unknown) => isNotFound(e));
    assert.equal(loadPairEmbed(known.slug).slug, known.slug);
  });

  it("a renamed slug redirects to the current embed address", () => {
    const legacy = "naltrexone-bupropion-bupropion";
    const to = legacyPairRedirect(legacy);
    if (!to) return; // no rename in the data any more
    assert.throws(
      () => loadPairEmbed(legacy),
      (e: unknown) => isRedirect(e) && (e.options.params as { slug?: string } | undefined)?.slug === to && e.status === 301,
    );
  });

  it("embed pages stay out of the sitemap and the site header", () => {
    assert.doesNotMatch(sitemapXml(), /\/embed\//);
    assert.equal(showsSiteHeader(`/embed/pair/${known.slug}`), false);
    assert.equal(showsSiteHeader(`/pair/${known.slug}`), true);
  });
});

describe("embed pair cards: page", () => {
  it("renders a heading, the disclaimer and an Open in FirstPass link to the canonical pair page", () => {
    const html = renderToStaticMarkup(<PairEmbedCard card={pairEmbedBySlug(known.slug)!} />);
    assert.match(html, /<h1 id="fpe-title">/);
    assert.match(html, /<main class="fpe" aria-labelledby="fpe-title"/);
    assert.ok(decode(html).includes(`${known.nameA} and ${known.nameB}`));
    assert.ok(decode(html).includes(PAIR_DISCLAIMER) && decode(html).includes(DISCLAIMER_ACTION));
    assert.match(html, new RegExp(`<a href="${known.canonical}" target="_blank" rel="noopener" data-testid="embed-open">Open in FirstPass`));
    if (known.quote) assert.ok(html.includes(escapeAttr(known.quote.url)));
    // Every link leaves the frame.
    const anchors = html.match(/<a [^>]*>/g) ?? [];
    assert.ok(anchors.length >= 2);
    for (const a of anchors) assert.match(a, /target="_blank" rel="noopener"/, a);
    assert.doesNotMatch(html, /<header|<nav|<script/);
  });

  it("styles follow prefers-color-scheme with readable contrast in both schemes", () => {
    assert.match(EMBED_CSS, /@media \(prefers-color-scheme:dark\)/);
    const vars = (block: string) => Object.fromEntries([...block.matchAll(/--fpe-([a-z]+):(#[0-9a-f]{6})/g)].map((m) => [m[1]!, m[2]!]));
    const [lightBlock, darkBlock] = EMBED_CSS.split("@media (prefers-color-scheme:dark)");
    for (const t of [vars(lightBlock!), vars(darkBlock!)]) {
      for (const bg of [t.bg!, t.quote!]) {
        assert.ok(contrast(t.fg!, bg) >= 7, `fg ${t.fg} on ${bg}`);
        assert.ok(contrast(t.muted!, bg) >= 4.5, `muted ${t.muted} on ${bg}`);
        assert.ok(contrast(t.link!, bg) >= 4.5, `link ${t.link} on ${bg}`);
      }
    }
  });

  it("the route is noindex, canonical to the pair page, and server-rendered", () => {
    const src = readFileSync("src/routes/embed.pair.$slug.tsx", "utf8");
    assert.ok(src.includes('createFileRoute("/embed/pair/$slug")'));
    const card = pairEmbedBySlug(known.slug)!;
    const head = (EmbedRoute.options.head as (ctx: { loaderData: typeof card }) => { meta: Record<string, string>[]; links: { rel: string; href: string }[] })({ loaderData: card });
    assert.ok(head.meta.some((m) => m.name === "robots" && /noindex/.test(m.content!)));
    assert.deepEqual(head.links, [{ rel: "canonical", href: `${SITE_URL}/pair/${known.slug}` }]);
    const vite = readFileSync("vite.config.ts", "utf8");
    assert.doesNotMatch(vite, /\/embed/, "embed pages are not prerendered");
  });
});

describe("embed snippet", () => {
  it("points at the canonical SITE_URL with the agreed attributes", () => {
    const s = embedSnippet(known);
    const attrs = Object.fromEntries([...s.matchAll(/ ([a-z]+)="([^"]*)"/g)].map((m) => [m[1]!, decode(m[2]!)]));
    assert.equal(attrs.src, `${SITE_URL}/embed/pair/${known.slug}`);
    assert.equal(attrs.src, embedPairUrl(known.slug));
    assert.match(attrs.src!, /^https:\/\/firstpass-desk\.vercel\.app\/embed\/pair\//);
    assert.equal(attrs.title, `FirstPass: ${known.nameA} and ${known.nameB} interaction card`);
    assert.equal(attrs.width, "100%");
    assert.equal(attrs.height, String(EMBED_HEIGHT));
    assert.equal(EMBED_HEIGHT, 340);
    assert.equal(attrs.loading, "lazy");
    assert.match(s, /^<iframe [^<>]*><\/iframe>$/);
  });

  it("escapes names and slugs so nothing breaks out of an attribute", () => {
    const s = embedSnippet({ slug: 'a"b<c>&d e', nameA: 'X "Y" <Z>', nameB: "Tom & Jerry's" });
    assert.match(s, /^<iframe [^<>]*><\/iframe>$/);
    assert.equal(s.match(/"/g)!.length % 2, 0);
    assert.ok(s.includes(`src="${SITE_URL}/embed/pair/a%22b%3Cc%3E%26d%20e"`), s);
    assert.ok(s.includes('title="FirstPass: X &quot;Y&quot; &lt;Z&gt; and Tom &amp; Jerry\'s interaction card"'), s);
    assert.equal(escapeAttr(`&"<>`), "&amp;&quot;&lt;&gt;");
  });

  it("each pair page has a collapsed Embed this card box with the snippet, a Copy button and live feedback", () => {
    const html = renderToStaticMarkup(<PairPageView page={known} />);
    const box = /<details data-testid="pair-embed"[^>]*>([\s\S]*?)<\/details>/.exec(html);
    assert.ok(box, "disclosure present");
    assert.doesNotMatch(box![0], /<details[^>]* open/);
    assert.match(box![1]!, /<summary[^>]*>Embed this card<\/summary>/);
    const area = /<textarea([^>]*)>([^<]*)<\/textarea>/.exec(box![1]!);
    assert.ok(area && /readOnly|readonly/.test(area[1]!), "read-only textarea");
    assert.equal(decode(area![2]!), embedSnippet(known));
    assert.match(box![1]!, /<label for="[^"]+"[^>]*>Embed code for/);
    assert.match(box![1]!, /<button type="button"[^>]*>Copy<\/button>/);
    assert.match(box![1]!, /role="status" aria-live="polite"/);
    // Below the main content: after the mechanism and hub links, before the disclaimer.
    assert.ok(html.indexOf('data-testid="pair-embed"') > html.indexOf('data-testid="pair-hub-links"'));
    assert.ok(html.indexOf('data-testid="pair-embed"') < html.indexOf('data-testid="pair-disclaimer"'));
    assert.ok(renderToStaticMarkup(<EmbedSnippetDisclosure page={known} />).includes(embedPairUrl(known.slug)));
  });
});

function contrast(a: string, b: string): number {
  const lum = (h: string) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}
