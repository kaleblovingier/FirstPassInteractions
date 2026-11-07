import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WhyThisGrade } from "@/components/desk/check";
import { analyze } from "./engine.ts";
import { basisFor } from "./basis.ts";
import { leadGradeBasis } from "./grade-provenance.ts";
import { guidelineUrl, hasPgx, pgxFor } from "./pgx.ts";
import { DEFAULT_HOST, type Finding, type HostContext } from "./types.ts";

const CPIC_INDEX = "https://cpicpgx.org/guidelines/";

function pmHost(): HostContext {
  return { ...DEFAULT_HOST, phenotypes: { ...DEFAULT_HOST.phenotypes, CYP2D6: "PM" } };
}

function visible(finding: Finding): string {
  return renderToStaticMarkup(createElement(WhyThisGrade, { finding }));
}

test("shifted CYP2D6 phenoconversion leads with the desk teaching map", () => {
  const report = analyze(["paroxetine", "codeine"], DEFAULT_HOST);
  const f = report.findings.find(
    (x) => x.id.startsWith("pheno-CYP2D6-") && x.tags.includes("phenoconversion"),
  );
  assert.ok(f, "expected a shifted CYP2D6 phenoconversion finding");
  assert.equal(f.id.startsWith("pheno-CYP2D6-"), true);
  assert.equal(f.severity, "major");
  const lead = leadGradeBasis(f);
  assert.equal(lead.kind, "rule");
  assert.match(lead.detail, /The shift is the desk's teaching map/);
  assert.doesNotMatch(
    `${lead.title} ${lead.detail}`,
    /paraphrase|CPIC-aligned|cpicpgx\.org\/guidelines\/?$/i,
  );
  assert.equal(lead.href, undefined);
  const html = visible(f).replace(/&#x27;/g, "'");
  assert.match(html, /The shift is the desk's teaching map/);
  assert.doesNotMatch(html, /paraphrase published CPIC|CPIC-aligned/i);
  assert.ok(!html.includes(CPIC_INDEX));
  for (const b of basisFor(f)) {
    assert.notEqual(b.href?.replace(/\/$/, ""), CPIC_INDEX.replace(/\/$/, ""));
    assert.doesNotMatch(b.detail, /paraphrase published CPIC/i);
  }
});

test("a phenotype row with no PGX card states the inhibitor/inducer analogy", () => {
  assert.equal(hasPgx("dextromethorphan"), false);
  assert.equal(pgxFor("dextromethorphan").length, 0);
  const f = analyze(["dextromethorphan"], pmHost()).findings.find(
    (x) => x.id === "geno-CYP2D6-PM-dextromethorphan",
  );
  assert.ok(f, "expected a CYP2D6 PM phenotype finding for dextromethorphan");
  assert.equal(f.kind, "geno");
  assert.equal(f.severity, "major");
  assert.ok(!f.tags.includes("phenoconversion"));
  const lead = leadGradeBasis(f);
  assert.equal(lead.kind, "rule");
  assert.match(lead.detail, /The tier is the inhibitor\/inducer analogy/);
  assert.match(lead.detail, /No teaching card matches this drug and gene/);
  assert.equal(lead.href, undefined);
  assert.doesNotMatch(`${lead.title} ${lead.detail}`, /paraphrase|CPIC-aligned/i);
  const html = visible(f);
  assert.match(html, /inhibitor\/inducer analogy/);
  assert.ok(!html.includes(CPIC_INDEX));
  assert.doesNotMatch(html, /paraphrase published CPIC/i);
  for (const b of basisFor(f)) {
    assert.notEqual(b.href?.replace(/\/$/, ""), CPIC_INDEX.replace(/\/$/, ""));
  }
});

test("a phenotype row links the card guideline only when pgx.ts has that drug and gene", () => {
  const card = pgxFor("codeine").find((c) => c.gene === "CYP2D6");
  assert.ok(card);
  const url = guidelineUrl(card);
  assert.ok(url);
  assert.match(url, /^https:\/\/cpicpgx\.org\/guidelines\/guideline-for-codeine-and-cyp2d6\/$/);
  const f = analyze(["codeine"], pmHost()).findings.find((x) => x.id === "geno-CYP2D6-PM-codeine");
  assert.ok(f);
  assert.equal(f.severity, "major");
  const lead = leadGradeBasis(f);
  assert.equal(lead.href, url);
  assert.match(lead.detail, /inhibitor\/inducer analogy/);
  assert.match(lead.detail, /Check that the guideline names this drug/);
  assert.doesNotMatch(lead.detail, /paraphrase|CPIC-aligned|follows CPIC/i);
  assert.notEqual(lead.href, CPIC_INDEX);
  const html = visible(f);
  assert.ok(html.includes(url));
  assert.ok(!html.includes(`href="${CPIC_INDEX}"`));
});

test("a phenotype card that is not a CPIC guideline page does not use the guidelines index", () => {
  const card = pgxFor("metoprolol").find((c) => c.gene === "CYP2D6");
  assert.ok(card);
  assert.equal(card.source.kind, "unlinked");
  assert.equal(guidelineUrl(card), null);
  const f = analyze(["metoprolol"], pmHost()).findings.find(
    (x) => x.id === "geno-CYP2D6-PM-metoprolol",
  );
  assert.ok(f);
  assert.equal(f.severity, "major");
  const lead = leadGradeBasis(f);
  assert.equal(lead.title, "Teaching card");
  assert.equal(lead.href, card.clinpgx);
  assert.match(lead.detail, /inhibitor\/inducer analogy/);
  assert.doesNotMatch(`${lead.title} ${lead.detail}`, /paraphrase|CPIC-aligned|CPIC guideline/i);
  assert.ok(!basisFor(f).some((b) => (b.href ?? "").includes("cpicpgx.org/guidelines")));
});

test("a card with no CPIC guideline says so and links no other drug's guideline", () => {
  const card = pgxFor("aripiprazole").find((c) => c.gene === "CYP2D6");
  assert.ok(card);
  assert.equal(card.source.kind, "none");
  assert.equal(guidelineUrl(card), null);
  const f = analyze(["aripiprazole"], pmHost()).findings.find(
    (x) => x.id === "geno-CYP2D6-PM-aripiprazole",
  );
  assert.ok(f);
  const lead = leadGradeBasis(f);
  assert.equal(lead.title, "Teaching card");
  assert.equal(lead.href, card.clinpgx);
  assert.match(lead.detail, /inhibitor\/inducer analogy/);
  assert.match(lead.detail, /CPIC has no guideline for this drug/);
  assert.doesNotMatch(lead.detail, /paraphrase|CPIC-aligned|follows CPIC/i);
  assert.ok(!basisFor(f).some((b) => (b.href ?? "").includes("cpicpgx.org/guidelines")));
});

test("a non-genotype row tagged or named pheno gets no genotype basis", () => {
  const f: Finding = {
    id: "pheno-pd-mycophenolate-check",
    severity: "moderate",
    kind: "pd",
    drugIds: ["mycophenolate"],
    headline: "test",
    enzymes: [],
    effect: "",
    mechanism: "",
    clinical: "",
    tags: ["phenoconversion"],
  };
  for (const b of basisFor(f)) {
    assert.notEqual(b.kind, "cpic");
    assert.doesNotMatch(b.detail, /teaching map|inhibitor\/inducer analogy/);
  }
});
