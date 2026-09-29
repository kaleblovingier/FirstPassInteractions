/**
 * Severity what-if preview: keep docs/validation/severity-whatif.md in sync and
 * make any gold-set loss explicit. Scans every catalog pair (~15 s). Regenerate:
 *   npx --yes tsx scripts/severity-whatif.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SEVERITY_RANK } from "../types";
import {
  DOC_PATH,
  EXPECTED_GOLD_LABEL_CI_DROPS,
  applyWhatIf,
  collect,
  goldLabelCiDrops,
  goldWhatIf,
  isPkOnlyContra,
  render,
} from "../../../../scripts/severity-whatif.ts";
import { analyze } from "../engine";
import { DEFAULT_HOST } from "../types";

const gold = goldWhatIf();

test("what-if doc is generated from the engine and in sync (fails when stale)", () => {
  const data = collect();
  assert.ok(data.pairsScanned > 0);
  assert.equal(data.moved.length + data.labelCitedPkContra, data.pkPerpContraFindings);
  const md = render(data, gold);
  assert.equal(readFileSync(DOC_PATH, "utf8"), md, "severity-whatif.md is stale; run npx --yes tsx scripts/severity-whatif.ts");
  assert.match(md, /This is a preview\. No severity has been changed\./);
  assert.match(md, /No clinician has reviewed this content\./);
  assert.match(md, /#58 and #60/);
  assert.doesNotMatch(md, /\b\d+(\.\d+)?\s*(mg|mcg)\b/i);
  assert.doesNotMatch(md, /\bStrong\s+(concern|interaction|severity|risk)\b/);
  assert.doesNotMatch(md, /clinical decision support/i);
});

test("what-if only lowers PK-only contraindicated findings to major; nothing else moves", () => {
  for (const ids of [["simvastatin", "clarithromycin"], ["methadone", "ketoconazole"], ["phenelzine", "meperidine"]]) {
    const before = analyze(ids, DEFAULT_HOST).findings;
    const after = applyWhatIf(before);
    before.forEach((f, i) => {
      if (isPkOnlyContra(f)) assert.equal(after[i].severity, "major");
      else assert.equal(after[i].severity, f.severity);
    });
  }
});

test("gold set: what-if never drops a label-contraindicated pair below contraindicated, except the explicit expected list", () => {
  assert.deepEqual(
    goldLabelCiDrops(gold),
    [...EXPECTED_GOLD_LABEL_CI_DROPS].sort(),
    "gold-set label-contraindicated losses changed; update EXPECTED_GOLD_LABEL_CI_DROPS and regenerate the doc so the change is visible",
  );
  for (const r of gold) {
    // The cap is at major, so nothing may fall below its label-supported floor.
    if (SEVERITY_RANK[r.before] >= SEVERITY_RANK[r.pair.expectedFloor])
      assert.ok(SEVERITY_RANK[r.after] >= SEVERITY_RANK[r.pair.expectedFloor], `${r.pair.id} would fall below its floor`);
    if (r.pair.expectContraindicated && r.before === "contraindicated" && r.after !== "contraindicated")
      assert.ok(EXPECTED_GOLD_LABEL_CI_DROPS.includes(r.pair.id), `${r.pair.id} silently lost contraindicated`);
  }
});
