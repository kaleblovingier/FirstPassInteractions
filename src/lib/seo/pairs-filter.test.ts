import { describe, it } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { SEVERITY_LABEL } from "@/lib/drugs/types";
import { pairPages } from "./pair-pages";
import {
  PAIR_SEVERITIES, PAIR_SEVERITY_LABEL, PAIRS_PREFILTER_ATTR, PAIRS_PREFILTER_SCRIPT, PAIRS_Q_MAX, filterPairs, hasPairsFilter, nameKey,
  pairKey, pairsCountText, pairsSearch, parsePairsSearch, searchTokens, severityKey, type PairsSearch,
} from "./pairs-filter";

const ROWS = [
  { slug: "warfarin-fluconazole", nameA: "Warfarin", nameB: "Fluconazole", severityLabel: "Serious concern" },
  { slug: "simvastatin-itraconazole", nameA: "Simvastatin", nameB: "Itraconazole", severityLabel: "Avoid together" },
  { slug: "st-johns-wort-cyclosporine", nameA: "St. John's wort", nameB: "Cyclosporine", severityLabel: "Avoid together" },
  { slug: "atazanavir-cobicistat-alfuzosin", nameA: "Atazanavir–cobicistat", nameB: "Alfuzosin", severityLabel: "Avoid together" },
  { slug: "ethinyl-estradiol-ocp-tizanidine", nameA: "Ethinyl estradiol (OCP)", nameB: "Tizanidine", severityLabel: "Use care" },
  { slug: "acide-valproique-lamotrigine", nameA: "Acide valproïque", nameB: "Lamotrigine", severityLabel: "Use care" },
];
const slugs = (s: PairsSearch) => filterPairs(ROWS, s).map((r) => r.slug);

describe("pairs filter: names", () => {
  it("matches either drug name, ignoring case", () => {
    assert.deepEqual(slugs({ q: "warfarin" }), ["warfarin-fluconazole"]);
    assert.deepEqual(slugs({ q: "FLUCONAZOLE" }), ["warfarin-fluconazole"]);
    assert.deepEqual(slugs({ q: "conazole" }), ["warfarin-fluconazole", "simvastatin-itraconazole"]);
  });

  it("ignores accents on either side", () => {
    assert.deepEqual(slugs({ q: "valproique" }), ["acide-valproique-lamotrigine"]);
    assert.deepEqual(slugs({ q: "wárfarín" }), ["warfarin-fluconazole"]);
    assert.equal(nameKey("Acide valproïque"), "acidevalproique");
  });

  it("ignores punctuation and spacing inside a name", () => {
    assert.deepEqual(slugs({ q: "st johns" }), ["st-johns-wort-cyclosporine"]);
    assert.deepEqual(slugs({ q: "St. John's wort" }), ["st-johns-wort-cyclosporine"]);
    assert.deepEqual(slugs({ q: "atazanavir cobicistat" }), ["atazanavir-cobicistat-alfuzosin"]);
    assert.deepEqual(slugs({ q: "(ocp)" }), ["ethinyl-estradiol-ocp-tizanidine"]);
  });

  it("each word must match one of the two names, so two names find their pair", () => {
    assert.deepEqual(slugs({ q: "warfarin fluconazole" }), ["warfarin-fluconazole"]);
    assert.deepEqual(slugs({ q: "fluconazole warf" }), ["warfarin-fluconazole"]);
    assert.deepEqual(slugs({ q: "warfarin simvastatin" }), []);
    // "and" from the link text is not part of either name.
    assert.deepEqual(slugs({ q: "and" }), []);
  });

  it("a word cannot span the two names", () => {
    assert.equal(pairKey("Warfarin", "Fluconazole"), "warfarin fluconazole");
    assert.deepEqual(slugs({ q: "warfarinfluconazole" }), []);
  });
});

describe("pairs filter: severity and both", () => {
  it("maps each row label to its severity key", () => {
    for (const s of PAIR_SEVERITIES) assert.equal(severityKey(PAIR_SEVERITY_LABEL[s]), s);
    assert.equal(severityKey("Something else"), undefined);
  });

  it("filters by severity alone", () => {
    assert.deepEqual(slugs({ severity: "moderate" }), ["ethinyl-estradiol-ocp-tizanidine", "acide-valproique-lamotrigine"]);
    assert.deepEqual(slugs({ severity: "major" }), ["warfarin-fluconazole"]);
    assert.deepEqual(slugs({ severity: "minor" }), []);
  });

  it("combines the search and the severity", () => {
    assert.deepEqual(slugs({ q: "azole", severity: "contraindicated" }), ["simvastatin-itraconazole"]);
    assert.deepEqual(slugs({ q: "warfarin", severity: "contraindicated" }), []);
  });

  it("no filter, or a blank search, keeps every row", () => {
    assert.equal(filterPairs(ROWS, {}).length, ROWS.length);
    assert.equal(filterPairs(ROWS, { q: "  -  " }).length, ROWS.length);
    assert.equal(hasPairsFilter({}), false);
    assert.equal(hasPairsFilter({ q: " . " }), false);
    assert.equal(hasPairsFilter({ q: "w" }), true);
    assert.equal(hasPairsFilter({ severity: "major" }), true);
  });

  it("an empty list stays empty", () => {
    assert.deepEqual(filterPairs([], { q: "warfarin" }), []);
  });

  it("PAIR_SEVERITY_LABEL (copied for the entry bundle) matches the desk's SEVERITY_LABEL", () => {
    assert.deepEqual(PAIR_SEVERITY_LABEL, SEVERITY_LABEL);
  });

  it("every real pair row has a severity key", () => {
    for (const p of pairPages()) assert.equal(severityKey(p.severityLabel), p.severity, p.slug);
  });
});

describe("pairs filter: URL", () => {
  it("reads ?q= and ?severity=, trimmed", () => {
    assert.deepEqual(parsePairsSearch({ q: "  warfarin ", severity: "major" }), { q: "warfarin", severity: "major" });
    assert.deepEqual(parsePairsSearch({ q: "warfarin" }), { q: "warfarin" });
    assert.deepEqual(parsePairsSearch({ severity: "contraindicated" }), { severity: "contraindicated" });
  });

  it("drops malformed values instead of throwing", () => {
    assert.deepEqual(parsePairsSearch({ q: "", severity: "" }), {});
    assert.deepEqual(parsePairsSearch({ q: "   ", severity: "severe" }), {});
    assert.deepEqual(parsePairsSearch({ q: ["a"], severity: 3 }), {});
    assert.deepEqual(parsePairsSearch(null), {});
    assert.deepEqual(parsePairsSearch("junk"), {});
  });

  it("keeps numbers and booleans the router parsed from ?q= as text", () => {
    assert.deepEqual(parsePairsSearch({ q: 123 }), { q: "123" });
    assert.deepEqual(parsePairsSearch({ q: true }), { q: "true" });
  });

  it("cuts long search text to the box's limit", () => {
    const q = parsePairsSearch({ q: "a".repeat(PAIRS_Q_MAX + 40) }).q!;
    assert.equal(q.length, PAIRS_Q_MAX);
    assert.equal(searchTokens("b".repeat(PAIRS_Q_MAX + 40))[0]!.length, PAIRS_Q_MAX);
  });

  it("builds a URL search with only the set fields", () => {
    assert.deepEqual(pairsSearch("", undefined), {});
    assert.deepEqual(pairsSearch(" warf ", undefined), { q: "warf" });
    assert.deepEqual(pairsSearch("", "major"), { severity: "major" });
    assert.deepEqual(Object.keys(pairsSearch(" ", "minor")), ["severity"]);
  });

  it("states the count plainly", () => {
    assert.equal(pairsCountText(12, 585), "Showing 12 of 585 pairs");
    assert.equal(pairsCountText(0, 585), "Showing 0 of 585 pairs");
    assert.equal(pairsCountText(1, 1), "Showing 1 of 1 pair");
  });
});

/** Runs the head script against a stub document, returning the CSS it adds (or null) and whether it marked <html>. */
function prefilter(search: string, readyState = "loading") {
  let css: string | null = null;
  const attrs = new Map<string, string>();
  const document = {
    readyState,
    adoptedStyleSheets: [] as unknown[],
    documentElement: { setAttribute: (n: string, v: string) => attrs.set(n, v) },
  };
  class CSSStyleSheet {
    replaceSync(text: string) { css = text; }
  }
  const window: Record<string, unknown> = {};
  vm.runInNewContext(PAIRS_PREFILTER_SCRIPT, { document, location: { search }, URLSearchParams, CSSStyleSheet, window });
  return { css: css as string | null, marked: attrs.has(PAIRS_PREFILTER_ATTR), sheets: document.adoptedStyleSheets.length, stored: !!window.__fpPairsPrefilter };
}

/** The rows the script's CSS would hide, read back from its selectors. */
function hiddenBy(css: string, rows: { k: string; s: string | undefined }[]) {
  const tokens = [...css.matchAll(/data-k\*="([^"]*)"/g)].map((m) => m[1]!);
  const sev = /data-s="([^"]*)"/.exec(css)?.[1];
  return rows.map((r) => tokens.some((t) => !r.k.includes(t)) || (sev !== undefined && r.s !== sev));
}

describe("pairs prefilter script", () => {
  const real = pairPages().map((p) => ({ ...p, k: pairKey(p.nameA, p.nameB), s: severityKey(p.severityLabel) }));
  const enc = (o: Record<string, string>) => `?${new URLSearchParams(o)}`;

  it("does nothing without filters, after load, or for a bad severity", () => {
    assert.equal(prefilter("").css, null);
    assert.equal(prefilter(enc({ q: " - " })).css, null);
    assert.equal(prefilter(enc({ severity: "severe" })).css, null);
    assert.equal(prefilter(enc({ q: "warfarin" }), "complete").css, null);
    assert.equal(prefilter("").marked, false);
  });

  it("adds one sheet, marks <html> and keeps the controls invisible until hydration", () => {
    const r = prefilter(enc({ q: "warfarin" }));
    assert.ok(r.marked && r.stored);
    assert.equal(r.sheets, 1);
    assert.match(r.css!, /\[data-pairs-prehydrate\]\{visibility:hidden\}/);
    assert.ok(r.css!.startsWith(`html[${PAIRS_PREFILTER_ATTR}] [data-pairs-list]>li:not(`));
  });

  it("hides exactly the rows the React filter hides", () => {
    const cases: Record<string, string>[] = [
      { q: "warfarin" }, { q: "WÁRFARIN" }, { q: "azole" }, { q: "st. john's" }, { q: "fluconazole warf" },
      { severity: "major" }, { severity: "moderate" }, { q: "azole", severity: "contraindicated" }, { q: "zzzz" },
      { q: '"123"' }, { q: "x".repeat(PAIRS_Q_MAX + 5) },
    ];
    for (const c of cases) {
      const search = parsePairsSearch(c.q === '"123"' ? { q: "123" } : c);
      const want = new Set(filterPairs(real, search).map((p) => p.slug));
      const css = prefilter(enc(c)).css;
      assert.ok(css, JSON.stringify(c));
      const hidden = hiddenBy(css, real);
      real.forEach((p, i) => assert.equal(!hidden[i], want.has(p.slug), `${JSON.stringify(c)} ${p.slug}`));
    }
  });

  it("writes only letters and digits from the URL into its CSS", () => {
    const css = prefilter(enc({ q: 'a"]{}</style><b' })).css!;
    assert.deepEqual([...css.matchAll(/data-k\*="([^"]*)"/g)].map((m) => m[1]), ["a", "style", "b"]);
  });
});
