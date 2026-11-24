import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MethodologyView } from "@/components/learn/methodology-view";
import { DOSE_PATTERN, findDoses } from "@/lib/guards/dose-rule";
import {
  FDA_TIERS_CITATIONS,
  FIRST_PASS_CITATIONS,
  KINETICS_CITATIONS,
  METHODOLOGY_DESK_EXAMPLES,
  METHODOLOGY_H1,
  METHODOLOGY_SECTIONS,
  METHODOLOGY_URL,
  PRODRUG_CITATIONS,
  TRANSPORTERS_CITATIONS,
} from "@/lib/learn/methodology";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

test("MethodologyView renders all 6 pharmacology sections, anchors, and TOC deterministically", () => {
  const html = renderToStaticMarkup(createElement(MethodologyView));
  assert.equal(renderToStaticMarkup(createElement(MethodologyView)), html);

  assert.ok(html.includes('href="#methodology-content"'), "skip link present");
  assert.ok(html.includes(METHODOLOGY_H1.replaceAll("&", "&amp;")), "H1 title present");
  assert.ok(html.includes('aria-label="Methodology sections"'), "TOC nav present");

  assert.equal(METHODOLOGY_SECTIONS.length, 6);
  for (const section of METHODOLOGY_SECTIONS) {
    assert.ok(html.includes(`id="${section.id}"`), `section anchor ${section.id}`);
    assert.ok(
      html.includes(`data-testid="methodology-section-${section.id}"`),
      `section testid ${section.id}`,
    );
    assert.ok(html.includes(`href="#${section.id}"`), `TOC link #${section.id}`);
  }
});

test("MethodologyView renders FDA potency thresholds, first-pass route contrasts, and kinetic washout table", () => {
  const html = renderToStaticMarkup(createElement(MethodologyView));

  // Section 1: First-pass extraction & route contrasts
  assert.ok(html.includes("E_H"));
  assert.ok(html.includes("CYP3A4"));
  assert.ok(html.includes("P-gp"));
  assert.ok(html.includes("Oral vs. IV Ketamine"));
  assert.ok(html.includes("HHC"));

  // Section 2: FDA potency thresholds
  assert.ok(html.includes("5-fold"));
  assert.ok(html.includes("≥ 2 to &lt; 5-fold") || html.includes("2 to &lt; 5-fold"));
  assert.ok(html.includes("1.25"));
  assert.ok(html.includes("80%"));
  assert.ok(html.includes("50%"));
  assert.ok(html.includes("Strong Inhibitor"));
  assert.ok(html.includes("Moderate Inhibitor"));
  assert.ok(html.includes("Weak Inhibitor"));
  assert.ok(html.includes("Strong Inducer"));
  assert.ok(html.includes("Moderate Inducer"));
  assert.ok(html.includes("Sensitive Index Substrate"));

  // Section 3: Kinetics & induction washout table
  assert.ok(html.includes("Competitive Reversible Inhibition"));
  assert.ok(html.includes("Time-Dependent Inactivation (TDI)"));
  assert.ok(html.includes("Nuclear-Receptor Transcriptional Induction"));
  assert.ok(html.includes("24–72 h"));
  assert.ok(html.includes("1–2 weeks"));
  assert.ok(html.includes("PXR"));
  assert.ok(html.includes("CAR"));
  assert.ok(html.includes("AhR"));
});

test("MethodologyView renders prodrug traps, transporters, evidence hierarchy, desk links, and permanent disclaimer", () => {
  const html = renderToStaticMarkup(createElement(MethodologyView));

  // Section 4: Prodrug bioactivation traps
  for (const name of [
    "Codeine",
    "Tramadol",
    "Tamoxifen",
    "Clopidogrel",
    "Lisdexamfetamine",
    "Adrafinil",
    "Morphine",
    "O-desmethyltramadol",
    "Endoxifen",
  ]) {
    assert.ok(html.includes(name), `prodrug copy includes ${name}`);
  }

  // Section 5: Transporters & multi-drug stacking
  for (const term of ["ABCB1", "BCRP", "OATP1B1", "OATP1B3", "QTc", "serotonergic", "anticholinergic"]) {
    assert.ok(html.includes(term), `transporter/stacking copy includes ${term}`);
  }

  // Section 6: Evidence hierarchy & scope
  for (const src of ["DailyMed SPL", "FDA Table 1", "PubMed", "CFSRE", "UNODC", "EUDA", "DEA"]) {
    assert.ok(html.includes(src), `evidence hierarchy includes ${src}`);
  }
  assert.ok(html.includes("not FDA-cleared"));
  assert.ok(html.includes('data-testid="pair-disclaimer"'), "permanent PairDisclaimer footer");

  // Interactive desk links
  for (const href of [
    "/?brief=codeine,fluoxetine",
    "/?brief=clopidogrel,omeprazole",
    "/?brief=rifampin,ketoconazole,midazolam",
    "/?brief=warfarin,fluconazole",
  ]) {
    assert.ok(html.includes(`href="${href}"`), `interactive desk link ${href}`);
  }
  assert.ok(METHODOLOGY_DESK_EXAMPLES.length >= 4);
  assert.ok(METHODOLOGY_URL.endsWith("/methodology"));
});

test("methodology.ts and MethodologyView carry zero administered doses and valid https citations", () => {
  const dataSource = readFileSync(join(ROOT, "src", "lib", "learn", "methodology.ts"), "utf8");
  const viewSource = readFileSync(join(ROOT, "src", "components", "learn", "methodology-view.tsx"), "utf8");

  assert.deepEqual(findDoses(dataSource), [], "src/lib/learn/methodology.ts must have 0 dose matches");
  assert.deepEqual(findDoses(viewSource), [], "src/components/learn/methodology-view.tsx must have 0 dose matches");

  const html = renderToStaticMarkup(createElement(MethodologyView));
  assert.equal(html.match(DOSE_PATTERN), null, "rendered methodology HTML must have 0 dose matches");

  const allCitations = [
    ...FIRST_PASS_CITATIONS,
    ...FDA_TIERS_CITATIONS,
    ...KINETICS_CITATIONS,
    ...PRODRUG_CITATIONS,
    ...TRANSPORTERS_CITATIONS,
  ];
  assert.ok(allCitations.length >= 10);
  for (const c of allCitations) {
    assert.ok(c.label.trim().length > 0);
    assert.equal(new URL(c.url).protocol, "https:", c.url);
  }
});
