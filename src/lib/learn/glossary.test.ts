import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GlossaryView } from "@/components/learn/glossary-view";
import { FDA_GRADES } from "@/lib/drugs/cyp-protocol";
import { DOSE_PATTERN } from "@/lib/guards/dose-rule";
import { enzymeHubBySlug } from "@/lib/seo/enzyme-hubs";
import {
  GLOSSARY, GLOSSARY_BY_ID, GLOSSARY_DESCRIPTION, GLOSSARY_INTRO, GLOSSARY_MAX_CHARS, GLOSSARY_MAX_SENTENCES,
  GLOSSARY_TITLE, GLOSSARY_URL, filterGlossary, glossaryJsonLd, glossaryJsonLdText, groupByLetter,
} from "./glossary";

const sentences = (s: string) => (s.match(/[.!?](?=\s|$)/g) ?? []).length;
const nums = (s: string) => (s.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

test("50 to 80 terms with unique slug ids and unique terms", () => {
  assert.ok(GLOSSARY.length >= 50 && GLOSSARY.length <= 80, `got ${GLOSSARY.length}`);
  const ids = GLOSSARY.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(GLOSSARY.map((t) => t.term.toLowerCase())).size, GLOSSARY.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, id);
});

test("every related id resolves to another term", () => {
  for (const t of GLOSSARY) {
    assert.ok(t.related.length > 0, t.id);
    assert.equal(new Set(t.related).size, t.related.length, t.id);
    for (const r of t.related) {
      assert.ok(GLOSSARY_BY_ID[r], `${t.id} -> ${r}`);
      assert.notEqual(r, t.id);
    }
  }
});

test("every entry cites an https source and links only to pages that exist", () => {
  const pages = new Set(["/enzymes", "/pairs", "/practice"]);
  for (const t of GLOSSARY) {
    assert.ok(t.source.title.trim(), t.id);
    assert.equal(new URL(t.source.url).protocol, "https:", t.id);
    for (const l of t.links ?? []) {
      const slug = l.href.match(/^\/enzyme\/([a-z0-9-]+)$/)?.[1];
      assert.ok(slug ? enzymeHubBySlug(slug) : pages.has(l.href), `${t.id}: ${l.href}`);
    }
  }
});

test("definitions stay within the cap and each on-desk line is one sentence", () => {
  for (const t of GLOSSARY) {
    assert.ok(sentences(t.definition) >= 1 && sentences(t.definition) <= GLOSSARY_MAX_SENTENCES, t.id);
    assert.ok(t.definition.length <= GLOSSARY_MAX_CHARS, `${t.id}: ${t.definition.length} chars`);
    assert.equal(sentences(t.onDesk), 1, t.id);
  }
});

test("no administered dose anywhere in the glossary copy", () => {
  const copy = [GLOSSARY_TITLE, GLOSSARY_DESCRIPTION, GLOSSARY_INTRO];
  for (const t of GLOSSARY) {
    copy.push(t.term, ...t.aka, t.definition, t.onDesk, t.source.title, ...(t.links ?? []).map((l) => l.label));
  }
  for (const s of copy) assert.equal(s.match(DOSE_PATTERN), null, s);
});

test("inhibitor and inducer bins match cyp-protocol FDA_GRADES fold-changes", () => {
  for (const kind of ["inhibitor", "inducer"] as const) {
    const g = FDA_GRADES[kind];
    const def = GLOSSARY_BY_ID[kind]!.definition;
    assert.deepEqual(nums(def), [g.strong, g.moderate, g.weak].flatMap((b) => nums(b.fold)), kind);
    for (const s of ["strong", "moderate", "weak"]) assert.ok(def.includes(s), `${kind}: ${s}`);
  }
});

test("filter matches the term, another name or the definition, ignoring case", () => {
  assert.equal(filterGlossary(GLOSSARY, "  ").length, GLOSSARY.length);
  assert.deepEqual(filterGlossary(GLOSSARY, "PHENOCONV").map((t) => t.id), ["phenoconversion"]);
  assert.ok(filterGlossary(GLOSSARY, "pxr").some((t) => t.id === "inducer"));
  assert.ok(filterGlossary(GLOSSARY, "acetylcholine").some((t) => t.id === "anticholinergic-burden"));
  assert.deepEqual(filterGlossary(GLOSSARY, "zzzz"), []);
});

test("A–Z groups are single ascending letters that keep every term in order", () => {
  const groups = groupByLetter(GLOSSARY);
  const letters = groups.map((g) => g.letter);
  for (const l of letters) assert.match(l, /^[A-Z]$/);
  assert.deepEqual(letters, [...letters].sort());
  assert.equal(new Set(letters).size, letters.length);
  assert.deepEqual(groups.flatMap((g) => g.terms), GLOSSARY);
});

test("JSON-LD is a DefinedTermSet with one DefinedTerm per entry", () => {
  const ld = glossaryJsonLd();
  assert.equal(ld["@context"], "https://schema.org");
  assert.equal(ld["@type"], "DefinedTermSet");
  assert.equal(ld.url, GLOSSARY_URL);
  assert.equal(ld.hasDefinedTerm.length, GLOSSARY.length);
  ld.hasDefinedTerm.forEach((d, i) => {
    const t = GLOSSARY[i]!;
    assert.equal(d["@type"], "DefinedTerm");
    assert.equal(d.name, t.term);
    assert.equal(d.description, t.definition);
    assert.equal(d.url, `${GLOSSARY_URL}#${t.id}`);
    assert.equal(d.inDefinedTermSet, GLOSSARY_URL);
  });
  assert.deepEqual(JSON.parse(JSON.stringify(ld)), ld);
});

test("the page carries the JSON-LD once, escaped so no term can close the script tag", () => {
  const text = glossaryJsonLdText();
  assert.deepEqual(JSON.parse(text), glossaryJsonLd());
  assert.doesNotMatch(text, /[<>&]/);
  const html = renderToStaticMarkup(createElement(GlossaryView));
  assert.equal(html.split('<script type="application/ld+json">').length, 2);
  assert.ok(html.includes(`<script type="application/ld+json">${text}</script>`));
});

test("server render lists every term as a heading anchor, the same way every time", () => {
  const html = renderToStaticMarkup(createElement(GlossaryView));
  assert.equal(renderToStaticMarkup(createElement(GlossaryView)), html);
  for (const t of GLOSSARY) assert.ok(html.includes(`<h3 id="${t.id}"`), t.id);
  for (const g of groupByLetter(GLOSSARY)) assert.ok(html.includes(`href="#letter-${g.letter.toLowerCase()}"`), g.letter);
  assert.ok(html.includes(`Showing ${GLOSSARY.length} of ${GLOSSARY.length} terms`));
  assert.ok(html.includes('data-testid="pair-disclaimer"'));
  assert.equal(html.match(DOSE_PATTERN), null);
});
