import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { COMPETITIVE_INHIBITORS, CYP_KINETICS_PRESETS } from "@/lib/drugs/cyp-kinetics";
import { findDoses } from "@/lib/guards/dose-rule";
import { CypKineticsSimulator } from "./cyp-kinetics";

const source = readFileSync(new URL("./cyp-kinetics.tsx", import.meta.url), "utf8");

describe("CypKineticsSimulator component & presets", () => {
  it("resolves every clinical preset drugId in DRUG_BY_ID (including tobacco-smoking)", () => {
    assert.ok(CYP_KINETICS_PRESETS.length >= 6);
    for (const preset of CYP_KINETICS_PRESETS) {
      assert.ok(preset.drugIds.length >= 2, `Preset ${preset.id} must have >= 2 drugs`);
      for (const id of preset.drugIds) {
        assert.ok(
          DRUG_BY_ID[id],
          `Preset '${preset.id}' references missing catalog ID '${id}'`,
        );
      }
    }
    const tobaccoPreset = CYP_KINETICS_PRESETS.find((p) => p.id === "tobacco-clozapine");
    assert.ok(tobaccoPreset?.drugIds.includes("tobacco-smoking"));
  });

  it("renders trajectory SVG, tabular-nums KPIs, and Competitive Inhibitor Ki table deterministically", () => {
    const html = renderToStaticMarkup(<CypKineticsSimulator />);
    assert.match(html, /Cytochrome P450 TDI &amp; Nuclear Induction Simulator/);
    assert.match(html, /role="img" aria-label="Active CYP enzyme pool trajectory chart/);
    assert.match(html, /role="region" aria-label="Competitive CYP inhibitor Ki reference table"/);
    assert.match(html, /tabular-nums/);
    assert.match(html, /FD&amp;C Act § 520\(o\)\(1\)\(E\)/);

    for (const comp of COMPETITIVE_INHIBITORS) {
      assert.ok(html.includes(comp.name), `Expected Ki table row for ${comp.name}`);
    }
  });

  it("stays free of neon cyan SVG hex codes, banned UI artifacts, and administered doses", () => {
    assert.equal(source.includes("#06b6d4"), false, "Neon cyan #06b6d4 must not appear in SVG chart");
    assert.equal(source.includes("#38bdf8"), false, "Neon sky #38bdf8 must not appear in SVG chart");
    assert.deepEqual(findDoses(source), []);
  });
});
