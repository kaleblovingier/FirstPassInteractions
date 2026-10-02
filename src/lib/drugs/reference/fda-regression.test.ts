/**
 * Regression gate: catalog vs FDA DDI Table 1. Fails if agreement on FDA
 * strong-inhibitor / strong-inducer pairs drops below the recorded baseline,
 * or if a direction mismatch appears that is not in the reviewed allowlist.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUGS } from "../catalog.ts";
import { pairKey, validateAgainstFda } from "./validate-fda.ts";
import { FDA_STRONG_PERPETRATOR_BASELINE_PCT, REVIEWED_DIRECTION_MISMATCHES } from "./fda-baseline.ts";

const result = validateAgainstFda(DRUGS);

test("FDA strong inhibitor/inducer agreement does not drop below baseline", () => {
  const s = result.strongPerpetrators;
  assert.ok(s.compared > 0, "no FDA strong perpetrator pairs matched the catalog");
  assert.ok(
    s.exactPct >= FDA_STRONG_PERPETRATOR_BASELINE_PCT,
    `strong perpetrator agreement ${s.exactPct}% (${s.exact}/${s.compared}) < baseline ${FDA_STRONG_PERPETRATOR_BASELINE_PCT}%`,
  );
});

test("no unreviewed direction mismatches vs FDA", () => {
  const allowed = new Set(REVIEWED_DIRECTION_MISMATCHES);
  const fresh = result.reviewList
    .filter((d) => d.category === "direction_mismatch")
    .map(pairKey)
    .filter((k) => !allowed.has(k));
  assert.deepEqual(fresh, [], "new direction mismatch(es); fix the catalog row or add to the reviewed allowlist");
});

test("reviewed allowlist has no stale entries", () => {
  const live = new Set(result.reviewList.filter((d) => d.category === "direction_mismatch").map(pairKey));
  assert.deepEqual(REVIEWED_DIRECTION_MISMATCHES.filter((k) => !live.has(k)), []);
});

test("review list only carries formulary-owner categories", () => {
  for (const d of result.reviewList) {
    assert.ok(["direction_mismatch", "strength_mismatch", "missing_in_catalog"].includes(d.category), d.category);
  }
});
