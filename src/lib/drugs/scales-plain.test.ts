import test from "node:test";
import assert from "node:assert/strict";
import {
  BEDSIDE_SCALES_FOOTER,
  COWS_CONTEXT_WATCH,
  COWS_PRECIP_WATCH,
  HUNTER_NMS_WATCH,
  SCALE_INTROS,
  SCALES_COACH,
  scaleIntro,
  scaleTitleBlurb,
  softScaleCopy,
} from "./scales-plain.ts";

const COPY = [
  SCALES_COACH.kicker,
  SCALES_COACH.body,
  SCALES_COACH.empty,
  ...Object.values(SCALE_INTROS).flatMap((i) => [
    i.plainTitle,
    i.scientific,
    i.measures,
    i.published,
  ]),
  scaleTitleBlurb("cows", "Eleven items."),
  scaleTitleBlurb("ciwa", "Ten items."),
  COWS_PRECIP_WATCH,
  COWS_CONTEXT_WATCH,
  HUNTER_NMS_WATCH,
  BEDSIDE_SCALES_FOOTER,
  softScaleCopy("Do not give dantrolene. Do not chase film without a protocol."),
  softScaleCopy(
    "Not enough withdrawal to hang an induction on. Wait, or this is not opioid withdrawal.",
  ),
  softScaleCopy("Many office protocols wait for ≥8–12 before a first film."),
  softScaleCopy("Many CIWA-driven pathways start symptom-triggered benzos around 8–10."),
];

test("scale intros name what each published score measures", () => {
  const cows = scaleIntro("cows");
  assert.equal(cows.scientific, "COWS");
  assert.match(cows.plainTitle, /opioid withdrawal/i);
  assert.match(cows.measures, /pulse|sweat|pupil/i);
  assert.match(cows.published, /published score for independent review/i);
  assert.match(cows.published, /Wesson & Ling 2003/i);

  const ciwa = scaleIntro("ciwa");
  assert.equal(ciwa.scientific, "CIWA-Ar");
  assert.match(ciwa.plainTitle, /alcohol withdrawal/i);
  assert.match(ciwa.published, /Sullivan 1989/i);

  const hunter = scaleIntro("hunter");
  assert.match(hunter.scientific, /Hunter/i);
  assert.match(hunter.plainTitle, /serotonin toxicity/i);
  assert.match(hunter.published, /Dunkley 2003/i);
  assert.match(hunter.published, /not a rule-out diagnosis/i);

  assert.match(SCALES_COACH.body, /teaching aid/i);
  assert.match(SCALES_COACH.empty, /not a diagnosis/i);
  assert.match(scaleTitleBlurb("cows", "Max 48."), /independent review/i);
});

test("softScaleCopy turns order/hold tone into watch/consider", () => {
  const soft = softScaleCopy(
    "Do not give dantrolene. Do not chase precipitated withdrawal without a protocol.",
  );
  assert.match(soft, /Consider avoiding/i);
  assert.match(soft, /Watch for/i);
  assert.match(soft, /consider pausing/i);
  assert.doesNotMatch(soft, /\bDo not give\b/i);
  assert.doesNotMatch(soft, /\bDo not chase\b/i);

  const band = softScaleCopy(
    "Not enough withdrawal to hang an induction on. Wait, or this is not opioid withdrawal.",
  );
  assert.match(band, /consider waiting/i);
  assert.doesNotMatch(band, /hang an induction/i);

  assert.match(
    softScaleCopy("Many office maps wait for ≥8–12 before a first film."),
    /Many office maps consider/i,
  );
});

test("scales-plain copy is educational — no mg / dose / diagnosis-as-order claims", () => {
  for (const s of COPY) {
    assert.doesNotMatch(s, /\b\d+\s*mg\b/i);
    assert.doesNotMatch(s, /\bhold the\b/i);
    assert.doesNotMatch(s, /\bstop order\b/i);
    assert.doesNotMatch(s, /\bprescribe\b/i);
  }
  assert.match(SCALES_COACH.empty, /empty or zero score is not a diagnosis/i);
  assert.match(BEDSIDE_SCALES_FOOTER, /Empty ≠ diagnosis/);
});
