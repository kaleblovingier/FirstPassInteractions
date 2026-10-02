import test from "node:test";
import assert from "node:assert/strict";
import {
  METABOLITE_CARD_INTRO,
  METABOLITE_PAYWALL_BLURB,
  metaboliteRoleLabel,
  parentRoleLabel,
  plainTreeLead,
  plainVia,
} from "./metabolite-plain.ts";

const ALL = [
  METABOLITE_CARD_INTRO,
  METABOLITE_PAYWALL_BLURB,
  plainTreeLead("codeine"),
  plainTreeLead("dronabinol"),
  plainVia("CYP2D6"),
  plainVia("CYP2B6 · CYP3A4"),
  plainVia("hCE1 + ethanol"),
  plainVia("further oxidation"),
  parentRoleLabel(),
  metaboliteRoleLabel(0),
  metaboliteRoleLabel(1),
];

test("card intro and paywall lead with parent → metabolite framing", () => {
  assert.match(METABOLITE_CARD_INTRO, /Parent drug\s*→\s*what the body turns it into/i);
  assert.match(METABOLITE_PAYWALL_BLURB, /what the body turns each drug into/i);
  assert.match(METABOLITE_PAYWALL_BLURB, /enzyme pathway/i);
  assert.doesNotMatch(METABOLITE_PAYWALL_BLURB, /isoform/i);
  assert.match(plainTreeLead("codeine"), /Starts as codeine/i);
  assert.match(plainTreeLead("codeine"), /what the body turns it into/i);
});

test("role labels and enzyme glosses stay readable", () => {
  assert.equal(parentRoleLabel(), "Starts as");
  assert.equal(metaboliteRoleLabel(0), "Becomes");
  assert.equal(metaboliteRoleLabel(1), "Then becomes");
  assert.match(plainVia("CYP2D6"), /CYP2D6/);
  assert.match(plainVia("CYP2D6"), /conversion pathway/i);
  assert.match(plainVia("CYP2B6 · CYP3A4"), /CYP2B6/);
  assert.match(plainVia("CYP2B6 · CYP3A4"), /CYP3A4/);
  assert.match(plainVia("further oxidation"), /next conversion step/i);
});

test("metabolite-plain copy is educational — no mg / dose language", () => {
  for (const s of ALL) {
    assert.doesNotMatch(s, /\bmg\b/i);
    assert.doesNotMatch(s, /\bdose\b/i);
    assert.doesNotMatch(s, /\bhold\b/i);
    assert.doesNotMatch(s, /\bstop order/i);
  }
});
