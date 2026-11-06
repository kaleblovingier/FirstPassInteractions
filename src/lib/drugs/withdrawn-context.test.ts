import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DRUG_BY_ID } from "./catalog";
import { MARKET_STATUS } from "./catalog-label-names";
import { drugHubs } from "@/lib/seo/drug-hubs";
import { DrugHubView } from "@/components/seo/pair-page";

const WITHDRAWN = "Withdrawn from the US market; shown only because a current label still names it.";
const CISAPRIDE =
  "Removed from general US sale in 2000; available only through a limited-access program. Shown because a current label still names it.";

test("withdrawn and restricted label-named drugs carry their US market status", () => {
  // Andexxa and the rows below are current-shelf rows, not label-named ones; andexxa-status.test.ts and the next test cover them.
  const { "andexanet-alfa": andexxa, voxelotor: _v, lorcaserin: _l, tegaserod: _t, ...labelNamed } = MARKET_STATUS;
  assert.match(andexxa ?? "", /^No longer sold in the US\./);
  assert.deepEqual(labelNamed, { terfenadine: WITHDRAWN, astemizole: WITHDRAWN, cisapride: CISAPRIDE });
  for (const [id, status] of Object.entries(labelNamed)) {
    const d = DRUG_BY_ID[id];
    assert.ok(d, id);
    assert.ok(d.note?.startsWith(status), id);
    assert.match(d.note ?? "", /No enzyme grade is stored/);
    assert.equal(d.enzymes.length, 0, id);
    const hub = drugHubs().find((h) => h.drugId === id);
    assert.ok(hub, `${id} has a /drug page`);
    const html = renderToStaticMarkup(createElement(DrugHubView, { hub }));
    assert.ok(html.includes("drug-hub-market-status") && html.includes(status), id);
    assert.ok(html.includes("Educational reference only. Not FDA-cleared. The Prescribing Information governs."), id);
  }
});

test("withdrawn current-shelf rows quote their FDA source with its link; ranitidine is back on the market", () => {
  const sources: Record<string, [quote: string, url: string]> = {
    voxelotor: [
      "is being voluntarily withdrawn from the market by the manufacturer due to safety concerns",
      "https://www.fda.gov/drugs/drug-alerts-and-statements/fda-alerting-patients-and-health-care-professionals-about-voluntary-withdrawal-oxbryta-market-due",
    ],
    lorcaserin: [
      "voluntarily withdraw the weight-loss drug from the U.S. market because a safety clinical trial shows an increased occurrence of cancer",
      "https://www.fda.gov/drugs/drug-safety-communications/fda-requests-withdrawal-weight-loss-drug-belviq-belviq-xr-lorcaserin-market",
    ],
    tegaserod: [
      'marketing status "Discontinued"',
      "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=021200",
    ],
  };
  for (const [id, [quote, url]] of Object.entries(sources)) {
    const note = DRUG_BY_ID[id]?.note ?? "";
    assert.ok(note.startsWith(MARKET_STATUS[id]), id);
    assert.ok(note.includes(quote) && note.includes(url), id);
  }
  // FDA approved reformulated ranitidine tablets on 2025-11-24, so it carries no withdrawn status.
  assert.equal(MARKET_STATUS.ranitidine, undefined);
  assert.equal(DRUG_BY_ID.ranitidine?.note, undefined);
});
