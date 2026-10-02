import test from "node:test";
import assert from "node:assert/strict";
import {
  alcoholBlurb,
  cannabisRouteBlurb,
  ketamineRouteBlurb,
  phenotypeBlurb,
  smokingBlurb,
} from "./host-blurbs.ts";

const ALL = [
  smokingBlurb(false),
  smokingBlurb(true),
  alcoholBlurb("off"),
  alcoholBlurb("acute"),
  alcoholBlurb("chronic"),
  ketamineRouteBlurb("iv"),
  ketamineRouteBlurb("in"),
  ketamineRouteBlurb("oral"),
  cannabisRouteBlurb("smoked"),
  cannabisRouteBlurb("oral"),
  phenotypeBlurb("PM")!,
  phenotypeBlurb("IM")!,
  phenotypeBlurb("UM")!,
];

test("smoking blurbs teach CYP1A2 / clozapine-olanzapine without dosing language", () => {
  const on = smokingBlurb(true);
  const off = smokingBlurb(false);
  assert.match(on, /CYP1A2/i);
  assert.match(on, /clozapine/i);
  assert.match(on, /olanzapine/i);
  assert.match(off, /CYP1A2|clozapine|olanzapine/i);
  for (const s of [on, off]) {
    assert.doesNotMatch(s, /\bmg\b/i);
    assert.doesNotMatch(s, /\bdose\b/i);
  }
});

test("alcohol / ketamine / cannabis blurbs hit teaching keywords and stay educational", () => {
  assert.match(alcoholBlurb("chronic"), /2E1|CYP2E1/i);
  assert.match(alcoholBlurb("acute"), /sedat/i);
  assert.match(ketamineRouteBlurb("oral"), /3A4|first-pass/i);
  assert.match(cannabisRouteBlurb("oral"), /11-OH-THC/i);
  for (const s of ALL) {
    assert.doesNotMatch(s, /\bmg\b/i);
    assert.doesNotMatch(s, /\bdose\b/i);
    assert.doesNotMatch(s, /\bhold\b/i);
    assert.doesNotMatch(s, /\bstop order/i);
  }
});

test("phenotype blurb template: poor = pathway runs slow; normal is silent", () => {
  assert.match(phenotypeBlurb("PM")!, /runs slow/i);
  assert.equal(phenotypeBlurb("NM"), null);
  assert.match(phenotypeBlurb("UM")!, /runs fast/i);
});
