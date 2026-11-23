import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { PairsIndexView, PairsResults, type PairIndexEntry } from "./pair-page";
import { pairPages } from "@/lib/seo/pair-pages";
import { SITE_URL } from "@/lib/seo/pair-copy";
import { PAIRS_PREFILTER_SCRIPT, filterPairs, pairKey, pairsCountText, parsePairsSearch, severityKey } from "@/lib/seo/pairs-filter";
import { Route as PairsRoute } from "@/routes/pairs";

const pages: PairIndexEntry[] = pairPages().map(({ slug, nameA, nameB, severityLabel }) => ({ slug, nameA, nameB, severityLabel }));
const rows = (html: string) => [...html.matchAll(/<li ([^>]*)><a href="\/pair\/([^"]+)"/g)].map((m) => ({ attrs: m[1]!, slug: m[2]! }));
const visibleSlugs = (html: string) => rows(html).filter((r) => !/\bhidden=""/.test(r.attrs)).map((r) => r.slug);
const testId = (html: string, id: string) => new RegExp(`<[a-z]+ [^>]*data-testid="${id}"[^>]*>`).exec(html)?.[0] ?? "";

describe("/pairs index: server HTML", () => {
  it("lists every pair link, none hidden, whatever the URL asks for", () => {
    for (const search of [{}, { q: "warfarin", severity: "major" as const }]) {
      const html = renderToStaticMarkup(<PairsIndexView pages={pages} search={search} />);
      assert.deepEqual(visibleSlugs(html), pages.map((p) => p.slug));
      assert.ok(html.includes(pairsCountText(pages.length, pages.length)));
      // The static page is the same for every URL, so the first browser render can match it.
      assert.match(testId(html, "pairs-empty"), /hidden=""/);
      assert.match(html, /<input[^>]*type="search"[^>]*value=""/);
    }
  });

  it("marks each row with the keys the prefilter script reads", () => {
    const html = renderToStaticMarkup(<PairsIndexView pages={pages.slice(0, 20)} />);
    const got = rows(html);
    assert.equal(got.length, 20);
    got.forEach((r, i) => {
      const p = pages[i]!;
      assert.ok(r.attrs.includes(`data-k="${pairKey(p.nameA, p.nameB)}"`), p.slug);
      assert.ok(r.attrs.includes(`data-s="${severityKey(p.severityLabel)}"`), p.slug);
    });
    assert.match(html, /<ul data-pairs-list="" data-testid="pairs-list"/);
  });

  it("has a labelled search box and tier choices in a search landmark that also works as a plain GET form", () => {
    const html = renderToStaticMarkup(<PairsIndexView pages={pages} />);
    const form = testId(html, "pairs-filter");
    for (const attr of ['role="search"', 'aria-label="Filter pairs"', 'action="/pairs"', 'method="get"', 'data-pairs-js=""']) {
      assert.ok(form.startsWith("<form ") && form.includes(attr), attr);
    }
    const inputId = /<input [^>]*id="([^"]+)"[^>]*type="search"/.exec(html)?.[1];
    assert.ok(inputId && html.includes(`<label for="${inputId}" class="block text-sm font-medium">Search by drug name</label>`));
    const box = /<input [^>]*type="search"[^>]*\/>/.exec(html)?.[0] ?? "";
    assert.ok(box.includes('name="q"') && /class="[^"]*\bh-11\b/.test(box), box);
    assert.match(html, /<fieldset[^>]*><legend[^>]*>Desk tier<\/legend>/);
    const choices = [...html.matchAll(/<label [^>]*class="[^"]*\bmin-h-11\b[^"]*">(<input type="radio"[^>]*\/>)([^<]+)<\/label>/g)];
    // Only the tiers the list has, in desk order, after All; All is picked.
    const choice = (m: RegExpMatchArray) => [/name="([^"]*)"/.exec(m[1]!)?.[1], /value="([^"]*)"/.exec(m[1]!)?.[1], m[2], m[1]!.includes('checked=""')];
    assert.deepEqual(choices.map(choice), [
      ["severity", "", "All", true],
      ["severity", "contraindicated", "Avoid together", false],
      ["severity", "major", "Serious concern", false],
      ["severity", "moderate", "Use care", false],
    ]);
  });

  it("announces the count politely", () => {
    const html = renderToStaticMarkup(<PairsIndexView pages={pages} />);
    const count = testId(html, "pairs-count");
    assert.match(count, /aria-live="polite"/);
    assert.match(count, /aria-atomic="true"/);
    assert.match(count, /data-pairs-prehydrate=""/);
  });
});

describe("/pairs index: filtered results", () => {
  it("hides the rows the filters leave out and keeps every link in the HTML", () => {
    const filters = { q: "simvastatin" };
    const html = renderToStaticMarkup(<PairsResults pages={pages} filters={filters} />);
    const want = filterPairs(pages, filters).map((p) => p.slug);
    assert.ok(want.length > 0 && want.length < pages.length);
    assert.equal(rows(html).length, pages.length);
    assert.deepEqual(visibleSlugs(html), want);
    assert.ok(html.includes(pairsCountText(want.length, pages.length)));
    assert.match(testId(html, "pairs-empty"), /hidden=""/);
  });

  it("combines search and tier", () => {
    const filters = parsePairsSearch({ q: "azole", severity: "major" });
    const html = renderToStaticMarkup(<PairsResults pages={pages} filters={filters} />);
    assert.deepEqual(visibleSlugs(html), filterPairs(pages, filters).map((p) => p.slug));
    for (const slug of visibleSlugs(html)) assert.equal(pages.find((p) => p.slug === slug)!.severityLabel, "Serious concern");
  });

  it("with no match, says so and links to clear the filters", () => {
    const html = renderToStaticMarkup(<PairsResults pages={pages} filters={{ q: "zzzz-not-a-drug" }} />);
    assert.deepEqual(visibleSlugs(html), []);
    assert.ok(html.includes(pairsCountText(0, pages.length)));
    const empty = /<p data-testid="pairs-empty"[^>]*>(.*?)<\/p>/.exec(html);
    assert.ok(empty && !/hidden/.test(empty[0].slice(0, empty[0].indexOf(">"))));
    assert.match(empty[1]!, /No pairs match\./);
    assert.match(empty[1]!, /<a href="\/pairs" class="[^"]*\bmin-h-11\b[^"]*">Clear filters<\/a>/);
  });
});

describe("/pairs route", () => {
  it("reads ?q= and ?severity=, keeps the canonical /pairs and runs the prefilter before paint", () => {
    const opts = PairsRoute.options as unknown as {
      validateSearch: (raw: unknown) => unknown;
      staleTime: number;
      head: () => { links: { rel: string; href: string }[]; meta: { name?: string }[]; scripts: { children: string }[] };
    };
    assert.deepEqual(opts.validateSearch({ q: " warfarin ", severity: "major", other: "x" }), { q: "warfarin", severity: "major" });
    assert.equal(opts.staleTime, Infinity);
    const head = opts.head();
    assert.deepEqual(head.links, [{ rel: "canonical", href: `${SITE_URL}/pairs` }]);
    assert.ok(!head.meta.some((m) => m.name === "robots"), "the canonical carries filtered URLs; no noindex");
    assert.deepEqual(head.scripts, [{ children: PAIRS_PREFILTER_SCRIPT }]);
  });
});
