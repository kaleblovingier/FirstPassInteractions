import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { NO_SINGLE_HALF_LIFE } from "@/lib/drugs/half-lives";
import { DEFAULT_HOST } from "@/lib/drugs/types";
import { findDoses } from "@/lib/guards/dose-rule";
import { Dossier } from "./dossier";

const BANNED_REGULATORY_RE =
  /\b(?:FDA[- ]cleared|FDA[- ]registered|510\(k\)[- ]cleared|clinically (?:validated|proven|tested|verified)|medically reviewed|HIPAA[- ]compliant)\b/i;

const BANNED_HUE_OR_CHROME_RE =
  /\b(?:(?:bg|text|border(?:-[trblxyse])?|ring|from|via|to|fill|stroke|outline)-(?:purple|indigo|violet|fuchsia|cyan|pink)-\d+|bg-gradient-to-|backdrop-blur(?:-[a-z0-9]+)?)\b/;

const LOW_CONTRAST_RE =
  /\btext-(?:(?:emerald|green|lime|amber|yellow|red|rose|orange|cyan|sky|teal|blue|purple|violet|pink|fuchsia)-[1-7]00|indigo-[1-6]00|(?:muted|subtle|muted-foreground)\/\d+)\b/;

const dossierSource = readFileSync(new URL("./dossier.tsx", import.meta.url), "utf8");

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMonographStrip(html: string): string {
  const match = html.match(
    /<section[^>]*aria-label="Pharmacokinetic monograph for [^"]+"[^>]*>[\s\S]*?<\/section>/,
  );
  assert.ok(match, "Expected Pharmacokinetic monograph section to be rendered");
  return match[0];
}

describe("Dossier Clinical Monograph Pharmacokinetic Strip", () => {
  it("renders elimination half-life, 5x washout in hours + days (>= 48 h), FDA DDI tier chips, and /methodology link for modafinil", () => {
    const html = renderToStaticMarkup(<Dossier ids={["modafinil"]} host={DEFAULT_HOST} />);
    const stripHtml = extractMonographStrip(html);
    const text = stripTags(stripHtml);

    assert.match(stripHtml, /aria-label="Pharmacokinetic monograph for Modafinil"/);
    assert.ok(text.includes("15 h · ~75 h (3.1 d) washout"));
    assert.ok(text.includes("CYP2C19"));
    assert.ok(text.includes("Moderate 2–<5×"));
    assert.ok(text.includes("CYP3A4"));
    assert.ok(text.includes("Major 2–<5×"));
    assert.match(stripHtml, /href="\/methodology"[^>]*>FDA DDI tiers &amp; washout methodology →<\/a>/);

    assert.deepEqual(findDoses(text), []);
    assert.equal(BANNED_REGULATORY_RE.test(text), false);
    assert.equal(LOW_CONTRAST_RE.test(stripHtml), false);
  });

  it("renders < 48 h washout in hours and Prodrug Activation labeling for codeine", () => {
    const html = renderToStaticMarkup(<Dossier ids={["codeine"]} host={DEFAULT_HOST} />);
    const stripHtml = extractMonographStrip(html);
    const text = stripTags(stripHtml);

    assert.ok(text.includes("3 h · ~15 h washout"));
    assert.ok(text.includes("CYP2D6"));
    assert.ok(text.includes("Sensitive ≥5× AUC"));
    assert.match(text, /Prodrug Activation/);
    assert.deepEqual(findDoses(text), []);
    assert.equal(LOW_CONTRAST_RE.test(stripHtml), false);
  });

  it("renders Strong >=5x AUC inhibitor tiers and Weak 1.25-<2x inhibitor tiers for fluoxetine, plus NTI chip for warfarin", () => {
    const fluoxStrip = extractMonographStrip(
      renderToStaticMarkup(<Dossier ids={["fluoxetine"]} host={DEFAULT_HOST} />),
    );
    const fluoxText = stripTags(fluoxStrip);

    assert.ok(fluoxText.includes("96 h · ~480 h (20 d) washout"));
    assert.ok(fluoxText.includes("Strong ≥5× AUC"));
    assert.ok(fluoxText.includes("Weak 1.25–<2×"));

    const warfStrip = extractMonographStrip(
      renderToStaticMarkup(<Dossier ids={["warfarin"]} host={DEFAULT_HOST} />),
    );
    const warfText = stripTags(warfStrip);

    assert.ok(warfText.includes("40 h · ~200 h (8.3 d) washout"));
    assert.ok(warfText.includes("CYP2C9"));
    assert.ok(warfText.includes("Sensitive ≥5× AUC"));
    assert.ok(warfText.includes("NTI"));
    assert.deepEqual(findDoses(fluoxText), []);
    assert.deepEqual(findDoses(warfText), []);
    assert.equal(LOW_CONTRAST_RE.test(fluoxStrip), false);
    assert.equal(LOW_CONTRAST_RE.test(warfStrip), false);
  });

  it("renders Non-linear / covalent handling and rationale note for clopidogrel and omeprazole", () => {
    const clopStrip = extractMonographStrip(
      renderToStaticMarkup(<Dossier ids={["clopidogrel"]} host={DEFAULT_HOST} />),
    );
    const clopText = stripTags(clopStrip);

    assert.ok(clopText.includes("Non-linear / covalent"));
    assert.ok(clopText.includes(NO_SINGLE_HALF_LIFE.clopidogrel));
    assert.match(clopText, /Prodrug Activation/);
    assert.ok(clopText.includes("Moderate 2–<5×"));
    assert.ok(clopText.includes("Weak 1.25–<2×"));

    const omepStrip = extractMonographStrip(
      renderToStaticMarkup(<Dossier ids={["omeprazole"]} host={DEFAULT_HOST} />),
    );
    const omepText = stripTags(omepStrip);

    assert.ok(omepText.includes("Non-linear / covalent"));
    assert.ok(omepText.includes(NO_SINGLE_HALF_LIFE.omeprazole));
    assert.deepEqual(findDoses(clopText), []);
    assert.deepEqual(findDoses(omepText), []);
    assert.equal(LOW_CONTRAST_RE.test(clopStrip), false);
    assert.equal(LOW_CONTRAST_RE.test(omepStrip), false);
  });

  it("renders Strong and Moderate inducer FDA DDI tiers and Not mapped fallback for rifampin", () => {
    const stripHtml = extractMonographStrip(
      renderToStaticMarkup(<Dossier ids={["rifampin"]} host={DEFAULT_HOST} />),
    );
    const text = stripTags(stripHtml);

    assert.ok(text.includes("Not mapped"));
    assert.ok(text.includes("CYP3A4"));
    assert.ok(text.includes("Strong ≥80% ↓AUC"));
    assert.ok(text.includes("Moderate 50–<80% ↓AUC"));
    assert.deepEqual(findDoses(text), []);
    assert.equal(LOW_CONTRAST_RE.test(stripHtml), false);
  });

  it("keeps dossier.tsx source free of low-contrast classes, banned editorial hues, doses, and regulatory claims", () => {
    assert.deepEqual(findDoses(dossierSource), []);
    assert.equal(BANNED_REGULATORY_RE.test(dossierSource), false);
    assert.equal(BANNED_HUE_OR_CHROME_RE.test(dossierSource), false);
    assert.equal(LOW_CONTRAST_RE.test(dossierSource), false);
  });
});
