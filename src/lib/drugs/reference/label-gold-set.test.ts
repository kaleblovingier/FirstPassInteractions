import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID, searchDrugs } from "../catalog";
import { SEVERITY_RANK } from "../types";
import {
  KNOWN_CONTRAINDICATION_GAPS,
  KNOWN_UNDERCALLS,
  LABEL_GOLD_SET,
  NOT_IN_CATALOG,
  WAVE_1_COUNT,
  WAVE_2_COUNT,
  WAVE_3_COUNT,
  WAVE_4_COUNT,
  WAVE_5_COUNT,
} from "./label-gold-set";
import { evaluatePair } from "./label-gold-set-eval";

const byId = new Map(LABEL_GOLD_SET.map((p) => [p.id, p]));

test("gold set: shape, unique ids, catalog ids exist", () => {
  assert.ok(WAVE_1_COUNT >= 35 && WAVE_1_COUNT <= 50, `wave 1 size ${WAVE_1_COUNT}`);
  assert.ok(WAVE_2_COUNT >= 20 && WAVE_2_COUNT <= 35, `wave 2 size ${WAVE_2_COUNT}`);
  assert.ok(WAVE_3_COUNT >= 90 && WAVE_3_COUNT <= 110, `wave 3 size ${WAVE_3_COUNT}`);
  assert.ok(WAVE_4_COUNT >= 100 && WAVE_4_COUNT <= 120, `wave 4 size ${WAVE_4_COUNT}`);
  assert.ok(WAVE_5_COUNT >= 5 && WAVE_5_COUNT <= 25, `wave 5 size ${WAVE_5_COUNT}`);
  assert.equal(LABEL_GOLD_SET.length, WAVE_1_COUNT + WAVE_2_COUNT + WAVE_3_COUNT + WAVE_4_COUNT + WAVE_5_COUNT);
  assert.equal(byId.size, LABEL_GOLD_SET.length, "pair ids are unique");
  const unordered = new Set(LABEL_GOLD_SET.map((p) => [p.drugA, p.drugB].sort().join("+")));
  assert.equal(unordered.size, LABEL_GOLD_SET.length, "no pair listed twice in either order");
  for (const p of LABEL_GOLD_SET) {
    assert.ok(DRUG_BY_ID[p.drugA], `${p.drugA} in catalog`);
    assert.ok(DRUG_BY_ID[p.drugB], `${p.drugB} in catalog`);
    assert.notEqual(p.drugA, p.drugB);
    const retrieved = p.wave === 5 ? "2026-10-03" : p.wave >= 3 ? "2026-10-02" : "2026-09-27";
    assert.equal(p.retrieved, retrieved);
    assert.match(p.url, /^https:\/\/(dailymed\.nlm\.nih\.gov|www\.accessdata\.fda\.gov)\//);
    assert.ok(p.labelSection.trim().length > 0);
    assert.equal(p.expectContraindicated, p.labelClass === "contraindicated");
    if (p.wave === 1) {
      assert.equal(p.expectedFloor, "major");
      assert.ok(p.labelClass === "contraindicated" || p.labelClass === "avoid", `${p.id}: wave 1 class`);
    } else if (p.wave === 3 || p.wave === 4) {
      assert.equal(p.expectedFloor, "major", `${p.id}: floor`);
      assert.equal(p.labelClass, "contraindicated", `${p.id}: wave ${p.wave} class`);
    } else if (p.wave === 5) {
      assert.equal(p.expectedFloor, "contraindicated", `${p.id}: floor`);
      assert.equal(p.labelClass, "contraindicated", `${p.id}: wave 5 class`);
    } else {
      assert.equal(p.wave, 2);
      // avoid / boxed-warning stay at major. The naltrexone opioid labels
      // are held at contraindicated. Warning floors are major or moderate.
      if (p.labelClass === "contraindicated") assert.equal(p.expectedFloor, "contraindicated", `${p.id}: floor`);
      else if (p.labelClass !== "warning") assert.equal(p.expectedFloor, "major", `${p.id}: floor`);
      else assert.ok(p.expectedFloor === "major" || p.expectedFloor === "moderate", `${p.id}: floor`);
    }
  }
});

test("gold set: user-facing queries resolve to the catalog ids (search/alias normalization)", () => {
  for (const p of LABEL_GOLD_SET) {
    const [qa, qb] = p.queries;
    assert.equal(searchDrugs(qa)[0]?.id, p.drugA, `"${qa}" → ${p.drugA}`);
    assert.equal(searchDrugs(qb)[0]?.id, p.drugB, `"${qb}" → ${p.drugB}`);
  }
});

test("gold set: not-in-catalog drugs really are absent", () => {
  for (const n of NOT_IN_CATALOG) {
    const hit = searchDrugs(n.drug).find((d) => d.name.toLowerCase().includes(n.drug));
    assert.equal(hit, undefined, `${n.drug} unexpectedly found; move it into the gold set`);
  }
});

test("guard: quotes are short, dose-free, and never use 'Strong' as a severity label", () => {
  const banned: [RegExp, string][] = [
    [/\bmg\b/i, "'mg'"],
    [/\d+(\.\d+)?\s*(mg|mcg|g)\b/i, "a dose amount"],
    [/safe to start/i, "'safe to start'"],
    [/\bStrong\s+(concern|interaction|severity|risk)\b/, "'Strong' as a severity label"],
    [/\bseverity:\s*strong\b/i, "'Strong' as a severity label"],
  ];
  for (const p of LABEL_GOLD_SET) {
    for (const text of [p.quote, p.labelExample ?? "", p.note ?? ""]) {
      for (const [re, what] of banned) assert.doesNotMatch(text, re, `${p.id}: contains ${what}`);
    }
    const words = p.quote.split(/\s+/).filter((w) => w && w !== "…").length;
    assert.ok(words <= 25, `${p.id}: quote is ${words} words`);
    assert.equal(typeof p.paraphrased, "boolean");
  }
});

test("known lists only reference real pairs and do not overlap", () => {
  for (const id of KNOWN_UNDERCALLS) assert.ok(byId.has(id), `KNOWN_UNDERCALLS: unknown pair ${id}`);
  for (const id of KNOWN_CONTRAINDICATION_GAPS) assert.ok(byId.has(id), `KNOWN_CONTRAINDICATION_GAPS: unknown pair ${id}`);
  for (const id of KNOWN_UNDERCALLS) assert.ok(!KNOWN_CONTRAINDICATION_GAPS.includes(id), `${id} is in both lists`);
});

for (const pair of LABEL_GOLD_SET) {
  const under = KNOWN_UNDERCALLS.includes(pair.id);
  if (!under) {
    test(`end-to-end: ${pair.id} ≥ ${pair.expectedFloor} (${pair.labelDrug}, ${pair.labelClass})`, () => {
      const r = evaluatePair(pair);
      assert.ok(
        SEVERITY_RANK[r.engine] >= SEVERITY_RANK[pair.expectedFloor],
        `${pair.id}: engine ${r.engine} < floor ${pair.expectedFloor}. Label (${pair.labelSection}): "${pair.quote}"`,
      );
      if (pair.expectContraindicated) {
        const gap = KNOWN_CONTRAINDICATION_GAPS.includes(pair.id);
        assert.equal(
          r.engine !== "contraindicated",
          gap,
          gap
            ? `${pair.id} now reads contraindicated; remove it from KNOWN_CONTRAINDICATION_GAPS`
            : `${pair.id}: label contraindicated but engine says ${r.engine}; add to KNOWN_CONTRAINDICATION_GAPS or fix engine`,
        );
      }
    });
  } else {
    test(`known under-call still under floor: ${pair.id} (prune KNOWN_UNDERCALLS when this fails)`, () => {
      const r = evaluatePair(pair);
      assert.ok(
        SEVERITY_RANK[r.engine] < SEVERITY_RANK[pair.expectedFloor],
        `${pair.id} now meets the floor (${r.engine}); remove it from KNOWN_UNDERCALLS`,
      );
    });
  }
}
