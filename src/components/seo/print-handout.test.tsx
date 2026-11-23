import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PRINT_BUTTON_LABEL, PrintButton, PrintFooter } from "./print-handout";
import { printDate, printedFromAddress, printPage } from "@/lib/seo/print";
import { CourseKitView } from "./course-kit-page";
import { ClassPageView } from "./class-page";
import { DrugHubView, PairPageView } from "./pair-page";
import { pairPages } from "@/lib/seo/pair-pages";
import { classHubs } from "@/lib/seo/class-hubs";
import { drugHubs } from "@/lib/seo/drug-hubs";
import { COURSE_KIT_URL } from "@/lib/seo/course-kit";
import { SITE_URL } from "@/lib/seo/pair-copy";

const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const g = globalThis as { window?: unknown };

const pair = pairPages().find((p) => p.quote && p.why.some((b) => b.href)) ?? pairPages()[0]!;
const hub = classHubs()[0]!;
const drug = drugHubs().find((d) => d.groups.some((gr) => gr.pairs.some((p) => p.why?.href))) ?? drugHubs()[0]!;

const pages = {
  pair: { html: renderToStaticMarkup(createElement(PairPageView, { page: pair })), url: pair.canonical },
  class: { html: renderToStaticMarkup(createElement(ClassPageView, { hub })), url: hub.canonical },
  "course-kit": { html: renderToStaticMarkup(createElement(CourseKitView)), url: COURSE_KIT_URL },
  drug: { html: renderToStaticMarkup(createElement(DrugHubView, { hub: drug })), url: drug.canonical },
} as const;

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** Opening tags that sit inside an element marked data-print-hide (screen-only). */
function hiddenOnPaper(html: string, match: (attrs: string) => boolean): { hidden: number; shown: number } {
  const stack: boolean[] = [];
  let hidden = 0;
  let shown = 0;
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, close, tag, attrs, self] = m;
    if (close) {
      stack.pop();
      continue;
    }
    const inHidden = stack.some(Boolean) || /\sdata-print-hide=/.test(attrs!);
    if (match(attrs!)) {
      if (inHidden) hidden++;
      else shown++;
    }
    if (!self && !VOID.has(tag!.toLowerCase())) stack.push(inHidden);
  }
  return { hidden, shown };
}

/** The inside of the @media print block in styles.css, comments removed. */
function printBlock(): string {
  const start = css.indexOf("@media print");
  assert.ok(start >= 0, "styles.css has an @media print block");
  assert.equal(css.indexOf("@media print", start + 1), -1, "one @media print block");
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i).replace(/\/\*[\s\S]*?\*\//g, "");
  }
  throw new Error("unclosed @media print");
}

describe("Print this page button", () => {
  afterEach(() => {
    delete g.window;
  });

  it("is a keyboard-reachable button with a 44px target that never prints", () => {
    const html = renderToStaticMarkup(createElement(PrintButton));
    assert.match(html, /^<button type="button"/);
    assert.ok(html.includes(PRINT_BUTTON_LABEL));
    assert.ok(html.includes("data-print-hide"));
    assert.ok(html.includes("min-h-[44px]"));
    assert.ok(!html.includes("tabindex"), "no tabindex: the native button is in tab order");
    assert.ok(html.includes('aria-hidden="true"'), "the icon is decorative; the label is the name");
  });

  it("calls window.print when pressed", () => {
    let calls = 0;
    g.window = { print: () => calls++ };
    const el = PrintButton({}) as ReactElement<{ onClick: () => void }>;
    assert.ok(isValidElement(el));
    el.props.onClick();
    assert.equal(calls, 1);
  });

  it("does nothing without a browser window (server render)", () => {
    delete g.window;
    assert.doesNotThrow(() => printPage());
  });

  for (const name of ["pair", "class", "course-kit"] as const) {
    it(`renders once on the ${name} page`, () => {
      assert.equal((pages[name].html.match(/data-testid="print-button"/g) ?? []).length, 1, name);
    });
  }
});

describe("printed handouts", () => {
  for (const [name, { html, url }] of Object.entries(pages)) {
    it(`${name}: main is a handout and ends with a deterministic "Printed from" line`, () => {
      assert.match(html, new RegExp(`<main[^>]*data-print-handout="${name}"`));
      const footer = /<p data-print-only="" data-testid="print-footer"[^>]*>(.*?)<\/p>/.exec(html)?.[1];
      assert.equal(footer, `Printed from ${printedFromAddress(url)}.`);
      assert.ok(url.startsWith(SITE_URL), url);
      assert.equal(renderToStaticMarkup(createElement(PrintFooter, { canonical: url })), renderToStaticMarkup(createElement(PrintFooter, { canonical: url })));
    });

    it(`${name}: the disclaimer, trademark line and label sources still print`, () => {
      for (const id of ["pair-disclaimer", "trademark-line"]) {
        assert.deepEqual(hiddenOnPaper(html, (a) => a.includes(`data-testid="${id}"`)), { hidden: 0, shown: 1 }, `${name} ${id}`);
      }
      const sources = hiddenOnPaper(html, (a) => /\shref="https?:/.test(a));
      assert.equal(sources.hidden, 0, `${name}: an external source link is inside screen-only chrome`);
    });
  }

  it("pair: the quote, its DailyMed link and every grade basis print; the embed box and buttons do not", () => {
    const { html } = pages.pair;
    assert.deepEqual(hiddenOnPaper(html, (a) => a.includes('data-testid="pair-quote"')), { hidden: 0, shown: pair.quote ? 1 : 0 });
    assert.equal(hiddenOnPaper(html, (a) => a.includes('data-testid="grade-basis"')).hidden, 0);
    assert.ok(hiddenOnPaper(html, (a) => a.includes('data-testid="grade-basis"')).shown >= pair.why.length);
    assert.match(html, /data-print-open="" data-testid="pair-why"/);
    assert.deepEqual(hiddenOnPaper(html, (a) => a.includes('data-testid="pair-embed"')), { hidden: 1, shown: 0 });
    const buttons = hiddenOnPaper(html, (a) => a.startsWith(' type="button"'));
    assert.ok(buttons.hidden >= 2, "Print and Copy");
    assert.equal(buttons.shown, 0);
  });

  it("drug hub: every closed Why this grade opens for print", () => {
    const { html } = pages.drug;
    const why = html.match(/<details[^>]*data-testid="hub-why"/g) ?? [];
    assert.ok(why.length > 0);
    for (const d of why) assert.ok(d.includes("data-print-open"), d);
  });

  it("course kit: every week and practice round prints; export buttons and the license pitch do not", () => {
    const { html } = pages["course-kit"];
    assert.equal(hiddenOnPaper(html, (a) => a.includes('data-testid="course-kit-module"')).shown, 8);
    assert.equal(hiddenOnPaper(html, (a) => a.includes('data-testid="course-kit-check"')).shown, 8);
    assert.deepEqual(hiddenOnPaper(html, (a) => a.includes('data-testid="course-kit-export"')), { hidden: 1, shown: 0 });
    assert.deepEqual(hiddenOnPaper(html, (a) => a.includes('aria-labelledby="license-h"')), { hidden: 1, shown: 0 });
    assert.deepEqual(hiddenOnPaper(html, (a) => a.startsWith(' type="button"')), { hidden: 3, shown: 0 });
    // Activity and practice links carry the address that prints after them, without the scheme.
    const urls = [...html.matchAll(/data-print-url="([^"]+)"/g)].map((m) => m[1]!);
    assert.ok(urls.length > 8);
    for (const u of urls) assert.ok(u.startsWith(printedFromAddress(SITE_URL) + "/"), u);
  });

  it("printDate is a calendar date with no time", () => {
    const d = printDate(new Date(2026, 10, 23, 15, 4));
    assert.match(d, /2026/);
    assert.doesNotMatch(d, /15:04|3:04/);
  });
});

describe("print stylesheet (src/styles.css)", () => {
  const block = printBlock();

  it("hides site chrome and screen-only parts on paper, and paper-only parts on screen", () => {
    assert.match(block, /\.skip-link,\s*\[data-testid="site-header"\],\s*\[data-print-hide\]\s*\{\s*display:\s*none !important;/);
    assert.match(block, /\[data-print-only\]\s*\{\s*display:\s*block;/);
    const screen = css.slice(0, css.indexOf("@media print"));
    assert.match(screen, /\[data-print-only\]\s*\{\s*display:\s*none;/);
  });

  it("prints black on white with no fills or shadows", () => {
    assert.match(block, /background:\s*#fff !important;/);
    assert.match(block, /color:\s*#000 !important;/);
    assert.match(block, /background:\s*transparent !important;/);
    assert.match(block, /box-shadow:\s*none !important;/);
  });

  it("prints the address after external links only, never after internal ones", () => {
    assert.match(block, /\[data-print-handout\] a\[href\^="http"\]::after\s*\{\s*content:\s*" \(" attr\(href\) "\)";/);
    const afterHref = [...block.matchAll(/([^{}]*)\{[^}]*attr\(href\)/g)].map((m) => m[1]!.trim());
    assert.deepEqual(afterHref, ['[data-print-handout] a[href^="http"]::after']);
  });

  it("keeps quotes, grade bases and rows together and starts each course-kit week on its own sheet", () => {
    assert.match(block, /:is\(figure, blockquote, details, li, \[data-testid="grade-basis"\][^)]*\)\s*\{\s*break-inside:\s*avoid;/);
    assert.match(block, /\[data-print-handout="course-kit"\] \[data-testid="course-kit-module"\]\s*\{\s*break-before:\s*page;/);
    assert.match(block, /details\[data-print-open\]::details-content/);
  });

  it("never hides the disclaimer, the trademark line or a label source", () => {
    for (const id of ["pair-disclaimer", "trademark-line", "grade-basis", "label-freshness", "pair-quote", "pair-why"]) {
      const rule = new RegExp(`${id}"\\][^{]*\\{[^}]*display:\\s*none`);
      assert.doesNotMatch(block, rule, id);
    }
  });

  it("is scoped to handouts, so the desk's clinical packet print rules are untouched", () => {
    const packet = readFileSync(new URL("../desk/clinical-packet-dialog.tsx", import.meta.url), "utf8");
    assert.ok(packet.includes("@media print"));
    assert.doesNotMatch(block, /\bbody \*|\.print-dialog|\.no-print/);
    // Rules that change colour or layout all start from the handout marker.
    for (const m of block.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const [sel, body] = [m[1]!.trim(), m[2]!];
      if (sel.startsWith("@page") || /^\.skip-link/.test(sel) || sel === "[data-print-only]") continue;
      if (!/color|background|break|font|display|max-width|margin|padding/.test(body)) continue;
      for (const part of sel.split(/,(?![^(]*\))/)) assert.match(part.trim(),/^(html:has\(\[data-print-handout\]\)|\[data-print-handout)/, part);
    }
  });
});
