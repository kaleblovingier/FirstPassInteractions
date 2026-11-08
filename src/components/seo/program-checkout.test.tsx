import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ForProgramsView } from "./for-programs-page";
import { ProgramCheckoutSection } from "./program-checkout";
import { PROGRAM_TIER_BY_ID } from "@/lib/billing/programs";
import { formatUsd } from "@/lib/seo/for-programs";

describe("/for-programs card checkout UI", () => {
  it("is absent from the static page: nothing shows until the server says it is live", () => {
    const html = renderToStaticMarkup(createElement(ForProgramsView));
    assert.equal(html.includes("Pay by card"), false);
    assert.equal(html.includes("program-checkout"), false);
    assert.ok(html.includes("Ask about Team"));
    assert.ok(html.includes("Send inquiry"));
  });

  it("when live, offers Team and Program only, at the programs.ts prices, and keeps the invoice path", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramCheckoutSection, { live: true, tier: "team", onTier: () => {} }),
    );
    assert.ok(html.includes(`Team: ${formatUsd(PROGRAM_TIER_BY_ID.team.annual)} per year, up to 25 people`));
    assert.ok(html.includes(`Program: ${formatUsd(PROGRAM_TIER_BY_ID.program.annual)} per year, up to 100 people`));
    assert.equal(html.includes("Site:"), false);
    assert.ok(html.includes(`Pay ${formatUsd(PROGRAM_TIER_BY_ID.team.annual)} by card`));
    assert.ok(html.includes('href="#inquiry"'));
    assert.equal(/FDA[- ]cleared|FDA[- ]approved/i.test(html), false);
  });

  it("renders nothing when not live and no return is pending", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramCheckoutSection, { live: false, tier: "program", onTier: () => {} }),
    );
    assert.equal(html, "");
  });
});
