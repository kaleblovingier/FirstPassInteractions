import test from "node:test";
import assert from "node:assert/strict";
import { clinicianScan, plainLanguageSummary } from "./interaction-summary.ts";

test("plain-language summary explains buildup and side effects without medical jargon", () => {
  const result = plainLanguageSummary({
    headline: "Clarithromycin × oral ketamine",
    effect: "↑ exposure",
    mechanism: "strong CYP3A4 inhibition of clearance",
    clinical: "Expect higher ketamine exposure and more dissociation, psychotomimetic effects, and sedation.",
  });

  assert.match(result, /build up/i);
  assert.match(result, /side effects|less effective|how it works/i);
  assert.ok(result.length < 220, "plain-language summary should stay brief");
});

test("plain-language summary handles loss of efficacy as a practical treatment issue", () => {
  const result = plainLanguageSummary({
    headline: "Rifampin × methadone",
    effect: "↓ exposure / loss of efficacy",
    mechanism: "strong CYP3A4 induction of clearance",
    clinical: "Expect falling methadone levels and loss of efficacy. Watch for withdrawal symptoms.",
  });

  assert.match(result, /not work as well|less effective/i);
  assert.match(result, /plain English/i);
});

test("platelet serotonin on a bleed row is bleeding, not serotonin toxicity", () => {
  const result = plainLanguageSummary({
    headline: "Warfarin × sertraline",
    effect: "additive bleeding",
    mechanism: "hemostasis synergy",
    clinical: "SSRIs add platelet-serotonin depletion and raise bleed risk.",
  });
  assert.match(result, /bleeding/i);
  assert.doesNotMatch(result, /fever|agitation/);
});

test("clinician scan is the enzyme and the direction, not a second essay", () => {
  const result = clinicianScan({
    enzymes: ["CYP3A4"],
    effect: "↑ exposure",
  });
  assert.equal(result, "CYP3A4 · ↑ exposure");
  assert.ok(result.length < 80);
});

test("clinician scan stays empty when the finding has neither", () => {
  assert.equal(clinicianScan({}), "");
});
