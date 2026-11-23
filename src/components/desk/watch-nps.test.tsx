import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { WatchPage } from "./watch";

describe("WatchPage — Emerging Supply Surveillance (2025–2026)", () => {
  it("renders Emerging Supply Surveillance section, all 7 family filters + All (27), agency badges, and key compounds", () => {
    const html = renderToStaticMarkup(<WatchPage />);

    // Section heading & agencies
    assert.match(html, /Emerging Supply Surveillance \(2025–2026\)/);
    assert.match(html, /CFSRE/);
    assert.match(html, /UNODC/);
    assert.match(html, /EUDA/);
    assert.match(html, /DEA/);

    // Filter pills: All (27) + all 7 NPS_FAMILIES
    assert.match(html, /All \(27\)/);
    assert.match(html, /Orphine opioids \(7\)/);
    assert.match(html, /Nitazene opioids \(8\)/);
    assert.match(html, /Designer benzos \(4\)/);
    assert.match(html, /HHC cannabinoids \(4\)/);
    assert.match(html, /Veterinary α2 adulterants \(1\)/);
    assert.match(html, /Concentrated kratom alkaloids \(1\)/);
    assert.match(html, /Arylcyclohexylamine dissociatives \(2\)/);

    // Search input attributes
    assert.match(html, /aria-label="Filter emerging forensic compounds"/);
    assert.match(
      html,
      /placeholder="Filter 27 monitored compounds by name, agency, or blind spot…"/,
    );

    // Key monitored compounds & card labels
    assert.match(html, /Cychlorphine/);
    assert.match(html, /Protonitazepyne/);
    assert.match(html, /HHC Acetate/);
    assert.match(html, /Medetomidine/);
    assert.match(html, /Assay &amp; test-strip blind spot/);
    assert.match(html, /Reversal &amp; airway/);
    assert.match(html, /Add to tray/);
    assert.match(html, /Track on watchlist/);
  });
});
