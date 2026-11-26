import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PHARMACOGENES,
  PGX_INTERACTIONS,
  resolveGeneExplorerTarget,
} from "@/lib/drugs/pharmacogenomics";
import { findDoses } from "@/lib/guards/dose-rule";
import { Pharmacogenomics } from "./pharmacogenomics";

const source = readFileSync(new URL("./pharmacogenomics.tsx", import.meta.url), "utf8");

describe("Pharmacogenomics component & gene explorer routing", () => {
  it("resolveGeneExplorerTarget routes HLA-B5801 and SLCO1B1 to their own gene explorer panels", () => {
    assert.equal(resolveGeneExplorerTarget("HLA-B5801"), "HLA-B5801");
    assert.equal(resolveGeneExplorerTarget("HLA-B5701"), "HLA-B5701");
    assert.equal(resolveGeneExplorerTarget("HLA-B1502"), "HLA-B1502");
    assert.equal(resolveGeneExplorerTarget("SLCO1B1"), "SLCO1B1");
    assert.equal(resolveGeneExplorerTarget("CYP2D6"), "CYP2D6");
    // Uncataloged HLA-B subtype falls back gracefully
    assert.equal(resolveGeneExplorerTarget("HLA-B9999"), "HLA-B5701");
  });

  it("renders all 15 pharmacogene selector buttons, CPIC count badge, and relative overflow allele table", () => {
    const html = renderToStaticMarkup(<Pharmacogenomics />);
    assert.match(html, /Pharmacogenomics &amp; CPIC Mechanism Matrix/);
    assert.match(html, /role="region" aria-label="Allele table" tabindex="0" class="relative overflow-x-auto/);
    assert.ok(html.includes(`>${PGX_INTERACTIONS.length}<`), "Expected total CPIC interaction count badge");

    for (const gene of PHARMACOGENES) {
      assert.ok(html.includes(gene.symbol), `Expected selector button for ${gene.symbol}`);
    }
    assert.ok(html.includes("SLCO1B1"));
    assert.ok(html.includes("HLA-B*58:01"));
  });

  it("keeps pharmacogenomics.tsx free of administered doses", () => {
    assert.deepEqual(findDoses(source), []);
  });
});
