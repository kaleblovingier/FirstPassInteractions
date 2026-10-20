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
  assert.deepEqual(MARKET_STATUS, { terfenadine: WITHDRAWN, astemizole: WITHDRAWN, cisapride: CISAPRIDE });
  for (const [id, status] of Object.entries(MARKET_STATUS)) {
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
