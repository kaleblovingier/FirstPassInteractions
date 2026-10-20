import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LegalView } from "@/components/seo/legal-page";
import { COOKIES_DOC, LEGAL_DOCS, PRIVACY_DOC, TERMS_DOC } from "@/lib/seo/legal";
import { PAIR_DISCLAIMER } from "@/lib/seo/pair-copy";
import { sitemapXml } from "@/lib/seo/pair-pages";
import { SITE_URL } from "@/lib/seo/pair-copy";

const text = (d: (typeof LEGAL_DOCS)[number]) => d.sections.flatMap((s) => [s.title, ...s.paras]).join("\n");
const html = (d: (typeof LEGAL_DOCS)[number]) => renderToStaticMarkup(createElement(LegalView, { doc: d }));

describe("legal pages", () => {
  it("prerender and appear in the sitemap", () => {
    const vite = readFileSync("vite.config.ts", "utf8");
    const xml = sitemapXml();
    for (const d of LEGAL_DOCS) {
      assert.ok(vite.includes(`{ path: "${d.path}" }`), `${d.path} in prerender pages`);
      assert.ok(vite.includes(`path === "${d.path}"`), `${d.path} in prerender filter`);
      assert.ok(xml.includes(`<loc>${SITE_URL}${d.path}</loc>`));
      assert.ok(readFileSync(`src/routes${d.path}.tsx`, "utf8").includes(`createFileRoute("${d.path}")`));
    }
  });

  it("each page renders one h1, the disclaimer and the legal links", () => {
    for (const d of LEGAL_DOCS) {
      const h = html(d);
      assert.equal(h.match(/<h1/g)?.length, 1);
      assert.ok(h.includes('data-testid="pair-disclaimer"'));
      assert.ok(h.includes(PAIR_DISCLAIMER.slice(0, 40).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;")) || h.includes("pair-disclaimer"));
      for (const href of ["/privacy", "/terms", "/cookies"]) assert.ok(h.includes(`href="${href}"`));
      assert.ok(h.includes("Effective"));
    }
  });

  it("desk footer and data-capture forms link privacy and terms", () => {
    const footer = readFileSync("src/components/desk/operator.tsx", "utf8");
    for (const href of ["/privacy", "/terms", "/cookies"]) assert.ok(footer.includes(`href="${href}"`));
    for (const f of ["src/components/desk/lost-key.tsx", "src/components/seo/for-programs-page.tsx"]) {
      const s = readFileSync(f, "utf8");
      assert.ok(s.includes('href="/privacy"') && s.includes('href="/terms"'), f);
    }
  });

  it("terms carry the required disclaimers", () => {
    const t = text(TERMS_DOC);
    for (const needle of ["not medical advice", "not FDA-cleared", "Prescribing Information governs", "pharmacist-patient relationship", "\"as is\"", "Limitation of liability", "State of Washington", "protected health information", "TODO (Kaleb)"]) {
      assert.ok(t.includes(needle), needle);
    }
    const p = text(PRIVACY_DOC);
    for (const needle of ["HIPAA", "My Health My Data", "under 13", "FirstPassInteractions@gmail.com", "delete"]) assert.ok(p.includes(needle), needle);
    assert.ok(text(COOKIES_DOC).includes("no analytics"));
  });

  it("no banned words: Pro, clinical decision support, CDS, doses", () => {
    for (const d of LEGAL_DOCS) {
      const t = `${d.title}\n${d.h1}\n${d.description}\n${text(d)}`;
      assert.ok(!/\bPro\b/.test(t), `${d.path}: Pro`);
      assert.ok(!/decision support|\bCDS\b/i.test(t), `${d.path}: CDS`);
      assert.ok(!/\bdos(e|es|ing|age)\b|\b\d+\s?mg\b/i.test(t), `${d.path}: dose`);
      assert.ok(t.includes("Founding") || d === COOKIES_DOC);
    }
  });
});
