/**
 * HIV PI / cobicistat booster role proposal (2026-11-07): keep
 * docs/validation/hiv-booster-roles-2026-11-07.md in sync with the engine and
 * make the size and direction of the grade change explicit. Regenerate:
 *   npx --yes tsx scripts/hiv-booster-roles.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHANGED_IDS, DOC_PATH, MAIN_ROLES, beforeRoles, collect, render, roleCode } from "../../../../scripts/hiv-booster-roles.ts";
import { DRUG_BY_ID } from "../catalog";
import { SEVERITY_RANK } from "../types";

const data = collect();

test("booster role doc is generated from the engine and in sync (fails when stale)", () => {
  const md = render(data);
  assert.equal(
    readFileSync(DOC_PATH, "utf8").replace(/\r\n/g, "\n"),
    md.replace(/\r\n/g, "\n"),
    "hiv-booster-roles-2026-11-07.md is stale; run npx --yes tsx scripts/hiv-booster-roles.ts",
  );
  assert.match(md, /Every grade change below needs Kaleb's approval before merge/);
  assert.doesNotMatch(md, /\b\d+(\.\d+)?\s*(mg|mcg)\b/i);
});

test("'before' in the doc is the catalog on main for the five rows", () => {
  assert.equal(data.mainRolesOk, true);
  for (const id of CHANGED_IDS) {
    assert.equal(beforeRoles(id).map(roleCode).join(";"), MAIN_ROLES[id], id);
    assert.ok(DRUG_BY_ID[id].enzymes.length > beforeRoles(id).length, `${id} gains a role`);
  }
});

test("the role change only raises grades, never to contraindicated, and leaves pinned pairs alone", () => {
  // 2,053 pairs (2,051 when written; +2 from the 2026-11-07 duplicate-row edit E1,
  // Genvoya and Stribild with dextromethorphan-bupropion). A change to this number means the catalog or the
  // engine moved under the proposal; regenerate the doc so the list stays complete.
  assert.equal(data.moved.length, 2053);
  for (const m of data.moved) {
    assert.ok(SEVERITY_RANK[m.after] > SEVERITY_RANK[m.before], `${m.changed}+${m.partner} goes down`);
    assert.notEqual(m.after, "contraindicated", `${m.changed}+${m.partner}`);
    assert.equal(m.pinned, false, `${m.changed}+${m.partner} is pinned`);
  }
  for (const p of data.pinned) {
    assert.equal(p.before, "contraindicated", p.id);
    assert.equal(p.after, "contraindicated", p.id);
  }
  for (const g of data.gold) {
    assert.ok(SEVERITY_RANK[g.after] >= SEVERITY_RANK[g.before], g.id);
    assert.ok(SEVERITY_RANK[g.after] >= SEVERITY_RANK[g.floor], g.id);
  }
});
