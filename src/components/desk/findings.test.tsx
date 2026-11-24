import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { analyze } from "@/lib/drugs/engine";
import { DEFAULT_HOST, type Finding } from "@/lib/drugs/types";
import { findDoses } from "@/lib/guards/dose-rule";
import { FindingList, severityTone } from "./findings";

const BANNED_REGULATORY_RE =
  /\b(?:FDA[- ]cleared|FDA[- ]registered|510\(k\)[- ]cleared|clinically (?:validated|proven|tested|verified)|medically reviewed|HIPAA[- ]compliant)\b/i;

const findingsSource = readFileSync(new URL("./findings.tsx", import.meta.url), "utf8");

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

const SINGLE_MEDICINE_FINDINGS: Finding[] = [
  {
    id: "warfarin-smoke-1",
    severity: "moderate",
    kind: "pk",
    drugIds: ["warfarin", "__smoke"],
    headline: "Tobacco smoke (PAH) × Warfarin",
    enzymes: ["CYP1A2"],
    effect: "↓ R-warfarin clearance change",
    mechanism: "Strong CYP1A2 induction from polycyclic aromatic hydrocarbons.",
    clinical: "Smoking cessation can alter INR stability as CYP1A2 activity returns to baseline.",
    tags: ["CYP1A2", "inducer"],
  },
  {
    id: "warfarin-clinic-2",
    severity: "minor",
    kind: "clinic",
    drugIds: ["warfarin"],
    headline: "Warfarin monitoring reminder",
    enzymes: [],
    effect: "INR follow-up note",
    mechanism: "Vitamin K antagonist narrow therapeutic range.",
    clinical: "Review INR trends when starting or stopping interacting agents.",
    tags: ["monitoring"],
  },
];

const TWO_FINDINGS_TWO_MEDS: Finding[] = [
  {
    id: "fluconazole-warfarin-major",
    severity: "major",
    kind: "pk",
    drugIds: ["fluconazole", "warfarin"],
    headline: "Fluconazole × Warfarin",
    enzymes: ["CYP2C9"],
    effect: "↑ S-warfarin exposure",
    mechanism: "Moderate CYP2C9 inhibition slows S-warfarin clearance.",
    clinical: "Elevated bleeding risk and higher INR.",
    tags: ["CYP2C9", "inhibitor"],
  },
  {
    id: "fluconazole-warfarin-geno",
    severity: "major",
    kind: "geno",
    drugIds: ["fluconazole", "warfarin"],
    headline: "CYP2C9 phenoconversion with Fluconazole",
    enzymes: ["CYP2C9"],
    effect: "Reduced CYP2C9 capacity",
    mechanism: "CYP2C9 inhibition mimics intermediate or poor metabolizer activity.",
    clinical: "Greater warfarin exposure sensitivity while fluconazole is active.",
    tags: ["CYP2C9", "phenoconversion"],
  },
];

const MULTI_DRUG_FIVE_FINDINGS: Finding[] = [
  {
    id: "ci-pair-linezolid-citalopram",
    severity: "contraindicated",
    kind: "pd",
    drugIds: ["linezolid", "citalopram"],
    headline: "Linezolid × Citalopram",
    enzymes: [],
    effect: "Serotonin stacking",
    mechanism: "Reversible MAO inhibition combined with SSRI serotonin reuptake block.",
    clinical: "Avoid together due to serotonin toxicity risk.",
    tags: ["serotonin"],
  },
  {
    id: "major-pk-warfarin-fluconazole",
    severity: "major",
    kind: "pk",
    drugIds: ["fluconazole", "warfarin"],
    headline: "Fluconazole × Warfarin",
    enzymes: ["CYP2C9"],
    effect: "↑ exposure",
    mechanism: "Moderate CYP2C9 inhibitor reduces warfarin metabolism.",
    clinical: "Increased bleeding tendency.",
    tags: ["CYP2C9", "inhibitor"],
  },
  {
    id: "moderate-geno-warfarin-smoke",
    severity: "moderate",
    kind: "geno",
    drugIds: ["warfarin", "__smoke"],
    headline: "CYP1A2 induction on Warfarin",
    enzymes: ["CYP1A2"],
    effect: "↓ R-warfarin exposure",
    mechanism: "Strong CYP1A2 induction from tobacco smoke.",
    clinical: "Watch INR shifts if smoking pattern changes.",
    tags: ["CYP1A2", "inducer"],
  },
  {
    id: "moderate-clinic-warfarin-note",
    severity: "moderate",
    kind: "clinic",
    drugIds: ["warfarin"],
    headline: "Warfarin narrow-index note",
    enzymes: [],
    effect: "Careful monitoring",
    mechanism: "Small level shifts matter on anticoagulants.",
    clinical: "Track coagulation checks after regimen edits.",
    tags: ["clinic"],
  },
  {
    id: "minor-food-ciprofloxacin",
    severity: "minor",
    kind: "pk",
    drugIds: ["ciprofloxacin", "__smoke"],
    headline: "Ciprofloxacin × Caffeine / Food timing",
    enzymes: ["CYP1A2"],
    effect: "Slowed caffeine clearance",
    mechanism: "Moderate CYP1A2 inhibition with divalent cation chelation note.",
    clinical: "Separate from dairy or mineral supplements per label.",
    tags: ["food", "CYP1A2"],
  },
];

describe("FindingList", () => {
  it("returns empty markup when findings are empty and preserves severityTone export", () => {
    assert.equal(renderToStaticMarkup(<FindingList findings={[]} />), "");
    assert.equal(severityTone("contraindicated"), "danger");
    assert.equal(severityTone("moderate"), "warn");
  });

  it("renders severity and kind counts, aria-pressed states, and What this means header for 5 mixed findings", () => {
    const html = renderToStaticMarkup(<FindingList findings={MULTI_DRUG_FIVE_FINDINGS} />);
    const text = stripTags(html);

    assert.match(html, /What this means/);
    assert.match(html, /Collisions/);

    // Live severity counts and aria-pressed
    assert.match(html, /aria-pressed="true"[^>]*>All\s*<span[^>]*>\(5\)<\/span>/);
    assert.match(html, /aria-pressed="false"[^>]*>Avoid together\s*<span[^>]*>\(1\)<\/span>/);
    assert.match(html, /aria-pressed="false"[^>]*>Serious concern\s*<span[^>]*>\(1\)<\/span>/);
    assert.match(html, /aria-pressed="false"[^>]*>Use care\s*<span[^>]*>\(2\)<\/span>/);
    assert.match(html, /aria-pressed="false"[^>]*>Mild note\s*<span[^>]*>\(1\)<\/span>/);

    // Live kind counts and aria-pressed
    assert.match(html, /aria-pressed="true"[^>]*>All kinds\s*<span[^>]*>\(5\)<\/span>/);
    assert.match(html, /aria-pressed="false"[^>]*>Levels \/ timing\s*<span[^>]*>\(2\)<\/span>/);
    assert.match(html, /aria-pressed="false"[^>]*>Same-system effects\s*<span[^>]*>\(1\)<\/span>/);
    assert.match(html, /aria-pressed="false"[^>]*>Metabolizer\s*<span[^>]*>\(1\)<\/span>/);
    assert.match(html, /aria-pressed="false"[^>]*>Clinic\s*<span[^>]*>\(1\)<\/span>/);
    assert.match(html, /aria-pressed="false"[^>]*>Food\s*<span[^>]*>\(1\)<\/span>/);
    assert.match(html, /aria-pressed="false"[^>]*>Multi-drug\s*<span[^>]*>\(0\)<\/span>/);

    // Focus by Medicine strip includes real catalog meds sorted by descending count then name, excluding __smoke
    assert.match(html, /role="group" aria-label="Filter collisions by medicine"/);
    assert.match(html, /aria-pressed="true"[^>]*>All medicines/);
    assert.ok(text.includes("Warfarin (3)"));
    assert.ok(text.includes("Ciprofloxacin (1)"));
    assert.ok(text.includes("Citalopram (1)"));
    assert.ok(text.includes("Fluconazole (1)"));
    assert.ok(text.includes("Linezolid (1)"));
    assert.equal(text.includes("__smoke"), false);
    assert.equal(text.includes("Tobacco smoke (PAH) (2)"), false);
    assert.ok(text.indexOf("Warfarin (3)") < text.indexOf("Ciprofloxacin (1)"));
    assert.ok(text.indexOf("Ciprofloxacin (1)") < text.indexOf("Citalopram (1)"));
    assert.ok(text.indexOf("Citalopram (1)") < text.indexOf("Fluconazole (1)"));
    assert.ok(text.indexOf("Fluconazole (1)") < text.indexOf("Linezolid (1)"));

    // Contraindicated and major cards start expanded; moderate and minor start collapsed
    assert.match(html, /aria-expanded="true"[^>]*>.*?Linezolid × Citalopram/);
    assert.match(html, /aria-expanded="true"[^>]*>.*?Fluconazole × Warfarin/);
    assert.match(html, /aria-expanded="false"[^>]*>.*?CYP1A2 induction on Warfarin/);
    assert.match(html, /aria-expanded="false"[^>]*>.*?Ciprofloxacin × Caffeine \/ Food timing/);

    // Polite status live region, Expand all control, and keyword input (>= 4 findings)
    assert.match(html, /role="status" aria-live="polite"/);
    assert.match(html, />Expand all</);
    assert.match(html, /type="search"/);
    assert.match(html, /aria-label="Filter collisions by keyword"/);
    assert.match(html, /placeholder="Filter by drug, enzyme, or effect"/);
  });

  it("handles real multi-drug engine output with dimmed zero-count pills and Expand all", () => {
    const findings = analyze(
      ["warfarin", "fluconazole", "ciprofloxacin", "clarithromycin"],
      DEFAULT_HOST,
    ).findings;
    const html = renderToStaticMarkup(<FindingList findings={findings} />);
    const text = stripTags(html);

    assert.ok(findings.length >= 4);
    assert.ok(text.includes(`All (${findings.length})`));
    assert.ok(text.includes("Avoid together (0)"));
    assert.match(html, /opacity-60[^>]*>Avoid together/);
    assert.match(html, /role="group" aria-label="Filter collisions by medicine"/);
    assert.match(html, /aria-label="Filter collisions by keyword"/);
    assert.match(html, />Expand all</);

    assert.deepEqual(findDoses(text), []);
    assert.equal(BANNED_REGULATORY_RE.test(text), false);
  });

  it("omits Focus by Medicine strip for single-medicine findings and omits keyword input when fewer than 4 scoped findings exist", () => {
    const singleHtml = renderToStaticMarkup(<FindingList findings={SINGLE_MEDICINE_FINDINGS} />);
    const singleText = stripTags(singleHtml);

    assert.ok(singleText.includes("All (2)"));
    assert.equal(singleHtml.includes("Filter collisions by medicine"), false);
    assert.equal(singleHtml.includes("Filter collisions by keyword"), false);
    assert.match(singleHtml, />Expand all</);

    const twoPairHtml = renderToStaticMarkup(<FindingList findings={TWO_FINDINGS_TWO_MEDS} />);
    const twoPairText = stripTags(twoPairHtml);

    assert.ok(twoPairText.includes("All (2)"));
    assert.match(twoPairHtml, /role="group" aria-label="Filter collisions by medicine"/);
    assert.ok(twoPairText.includes("Fluconazole (2)"));
    assert.ok(twoPairText.includes("Warfarin (2)"));
    assert.equal(twoPairHtml.includes("Filter collisions by keyword"), false);
    // All cards start open (major), so the bulk button starts as Collapse all
    assert.match(twoPairHtml, />Collapse all</);

    // Tray scoping from 5 findings down to 3 (warfarin/fluconazole + __smoke) hides keyword search (< 4 scoped)
    const scopedHtml = renderToStaticMarkup(
      <FindingList findings={MULTI_DRUG_FIVE_FINDINGS} trayIds={["warfarin", "fluconazole"]} />,
    );
    const scopedText = stripTags(scopedHtml);
    assert.ok(scopedText.includes("All (3)"));
    assert.equal(scopedHtml.includes("Filter collisions by keyword"), false);
  });

  it("renders Multi-inhibitor saturation and Prodrug activation badges plus Multi-drug filter count for fluoxetine + bupropion + codeine", () => {
    const findings = analyze(["fluoxetine", "bupropion", "codeine"], DEFAULT_HOST).findings;
    const html = renderToStaticMarkup(<FindingList findings={findings} />);
    const text = stripTags(html);

    assert.match(
      html,
      /bg-danger-soft text-danger border border-danger\/30 font-mono text-\[10px\][^>]*>Multi-inhibitor saturation</,
    );
    assert.match(
      html,
      /bg-info-soft text-info border border-info\/30 font-mono text-\[10px\][^>]*>Prodrug activation</,
    );
    assert.match(html, /aria-pressed="false"[^>]*>Multi-drug\s*<span[^>]*>\(1\)<\/span>/);
    assert.ok(text.includes("Compounded CYP2D6 inhibition"));
    assert.deepEqual(findDoses(text), []);
    assert.equal(BANNED_REGULATORY_RE.test(text), false);
  });

  it("renders Opposing inh/ind tug-of-war badge and Multi-drug filter count for rifampin + ketoconazole + midazolam", () => {
    const findings = analyze(["rifampin", "ketoconazole", "midazolam"], DEFAULT_HOST).findings;
    const html = renderToStaticMarkup(<FindingList findings={findings} />);
    const text = stripTags(html);

    assert.match(
      html,
      /bg-warn-soft text-warn border border-warn\/30 font-mono text-\[10px\][^>]*>Opposing inh\/ind tug-of-war</,
    );
    assert.match(html, /aria-pressed="false"[^>]*>Multi-drug\s*<span[^>]*>\(1\)<\/span>/);
    assert.ok(text.includes("Opposing CYP3A4 inhibition + induction on the same tray"));
    assert.deepEqual(findDoses(text), []);
    assert.equal(BANNED_REGULATORY_RE.test(text), false);
  });

  it("keeps source and rendered output free of administered doses and banned regulatory claims", () => {
    const html = renderToStaticMarkup(<FindingList findings={MULTI_DRUG_FIVE_FINDINGS} />);
    const text = stripTags(html);

    assert.deepEqual(findDoses(findingsSource), []);
    assert.deepEqual(findDoses(text), []);
    assert.equal(BANNED_REGULATORY_RE.test(findingsSource), false);
    assert.equal(BANNED_REGULATORY_RE.test(html), false);
  });
});
