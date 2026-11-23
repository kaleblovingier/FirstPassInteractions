import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_HOST } from "@/lib/drugs/types";
import { AddictionSafetyBanner } from "./safety-banner";

describe("AddictionSafetyBanner — 2025-2026 forensic supply surveillance", () => {
  it("renders nothing when selected is empty", () => {
    const html = renderToStaticMarkup(
      <AddictionSafetyBanner selected={[]} host={DEFAULT_HOST} onOpenHelp={() => {}} />,
    );
    assert.equal(html, "");
  });

  it("renders street safety warning and 2025-2026 forensic supply surveillance details for cychlorphine and medetomidine", () => {
    const html = renderToStaticMarkup(
      <AddictionSafetyBanner
        selected={["cychlorphine", "medetomidine"]}
        host={DEFAULT_HOST}
        onOpenHelp={() => {}}
      />,
    );
    assert.match(html, /aria-label="Street drug safety warning"/);
    assert.match(html, /Adulterant Supply Risk/);
    assert.match(html, /Overdose Response &amp; Local Care/);
    assert.match(html, /Emerging Forensic Supply \(2025–2026\)/);
    assert.match(html, /Cychlorphine \(N-propionitrile chlorphine\)/);
    assert.match(html, /Medetomidine \(racemic dexmedetomidine\)/);
    assert.match(html, /CFSRE · UNODC · EUDA · DEA/);
    assert.match(html, /Invisible on routine hospital opiate immunoassays/);
    assert.match(html, /Negative on xylazine test strips \(XTS\)/);
    assert.match(html, /Reversible at μ-opioid receptors/);
    assert.match(html, /NOT reversed by naloxone/);
  });

  it("renders respective surveillance entries for protonitazepyne + phenazolam and hhc-o", () => {
    const nitazeneBenzoHtml = renderToStaticMarkup(
      <AddictionSafetyBanner
        selected={["protonitazepyne", "phenazolam"]}
        host={DEFAULT_HOST}
        onOpenHelp={() => {}}
      />,
    );
    assert.match(nitazeneBenzoHtml, /Emerging Forensic Supply \(2025–2026\)/);
    assert.match(nitazeneBenzoHtml, /Protonitazepyne \(N-pyrrolidino protonitazene\)/);
    assert.match(nitazeneBenzoHtml, /Phenazolam \(Clobromazolam\)/);
    assert.match(nitazeneBenzoHtml, /N-pyrrolidino ring modification/);
    assert.match(nitazeneBenzoHtml, /Not reversed by naloxone/);

    const hhcHtml = renderToStaticMarkup(
      <AddictionSafetyBanner
        selected={["hhc-o"]}
        host={DEFAULT_HOST}
        onOpenHelp={() => {}}
      />,
    );
    assert.match(hhcHtml, /Emerging Forensic Supply \(2025–2026\)/);
    assert.match(hhcHtml, /HHC Acetate \(HHC-O\)/);
    assert.match(hhcHtml, /Deacetylates in vivo to HHC/);
    assert.match(hhcHtml, /manage acute inhalational lung injury/);
  });

  it("renders CDC opioid safety reminder without the street banner for a prescription opioid", () => {
    const html = renderToStaticMarkup(
      <AddictionSafetyBanner
        selected={["oxycodone"]}
        host={DEFAULT_HOST}
        onOpenHelp={() => {}}
      />,
    );
    assert.match(html, /aria-label="Opioid safety reminder"/);
    assert.match(html, /Harm Reduction Guidance/);
    assert.match(html, /CDC 2022 Co-Prescription Rails/);
    assert.doesNotMatch(html, /Street drug safety warning/);
    assert.doesNotMatch(html, /Emerging Forensic Supply \(2025–2026\)/);
  });
});
