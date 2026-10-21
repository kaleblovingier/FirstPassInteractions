import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { SCOPED_PATHS, isExempt, findDoses, DOSE_PATTERN } from "./dose-rule";
import baseline from "./dose-baseline.json";

/** Files fully swept: must contain zero administered amounts. */
const CLEAN = [
  "src/lib/drugs/clinical-packet.ts",
  "src/components/desk/clinical-packet-dialog.tsx",
  "src/lib/drugs/qt-resus.ts",
  "src/lib/drugs/potassium.ts",
  "src/lib/drugs/antimicrobial-stewardship.ts",
];

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

const scan = () => {
  const out: Record<string, { line: number; match: string }[]> = {};
  for (const r of SCOPED_PATHS)
    for (const f of walk(r)) {
      if (!/\.(ts|tsx)$/.test(f) || isExempt(f)) continue;
      const hits = findDoses(readFileSync(f, "utf8"));
      if (hits.length) out[f] = hits;
    }
  return out;
};

test("dose rule: catches administered amounts, skips lab values", () => {
  const hit = (s: string) => (s.match(DOSE_PATTERN) ?? []).length;
  assert.equal(hit("Magnesium Sulfate 2 g IV push"), 1);
  assert.equal(hit("Calcium gluconate 1-2 g"), 1);
  assert.equal(hit("Regular insulin 10 units"), 1);
  assert.equal(hit("built-in auto-taper · 60 mg/min cap"), 1); // rounds.ts:1245
  assert.equal(hit("gentamicin 1 mg/kg q8h"), 1); // rounds.ts:1289
  assert.deepEqual("gentamicin 1 mg/kg q8h".match(DOSE_PATTERN), ["1 mg/kg q8h"]);
  assert.equal(hit("load 20 mg/kg"), 1);
  assert.equal(hit("norepinephrine 0.1 mcg/kg/min"), 1);
  assert.equal(hit("insulin 0.1 units/kg/h"), 1);
  assert.equal(hit("glucose 180 mg/dL, Na 126 mEq/L, level 15 mcg/mL, CrCl 30 mL/min, lactate 2 mmol/L, UOP 0.5 mL/kg/h"), 0);
  assert.equal(hit("glucose < 250 mg/dL, K+ 4.5 mEq/L, CrCl < 50 mL/min, trough 20 mcg/mL"), 0);
});

test("dose rule: swept files carry no administered dose", () => {
  const found = scan();
  for (const f of CLEAN) assert.deepEqual(found[f] ?? [], [], f);
});

test("dose rule: no file gains doses beyond the recorded baseline (ratchet)", () => {
  const found = scan();
  const b = baseline as Record<string, number>;
  for (const [f, hits] of Object.entries(found)) {
    assert.ok(hits.length <= (b[f] ?? 0), `${f}: ${hits.length} dose matches > baseline ${b[f] ?? 0}: ${hits.slice(0, 5).map((h) => `${h.line}:${h.match}`).join(", ")}`);
  }
});
