import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./engine";
import { SWAP_COPY, swapDiff, swapIds } from "./swap";
import { DEFAULT_HOST, type HostContext } from "./types";

const TRAY = ["simvastatin", "clarithromycin", "amlodipine"];

test("swapIds replaces in place and keeps the tray's length and order", () => {
  assert.deepEqual(swapIds(TRAY, "clarithromycin", "azithromycin"), ["simvastatin", "azithromycin", "amlodipine"]);
  assert.equal(swapIds(TRAY, "clarithromycin", "clarithromycin"), null);
  assert.equal(swapIds(TRAY, "warfarin", "azithromycin"), null, "item not on the tray");
  assert.equal(swapIds(TRAY, "clarithromycin", "simvastatin"), null, "replacement already on the tray");
  assert.equal(swapIds(TRAY, "clarithromycin", "not-a-drug"), null);
  assert.equal(swapIds(TRAY, "clarithromycin", "__virtual"), null);
});

test("both sides are the engine's own reports, unchanged", () => {
  const diff = swapDiff(TRAY, DEFAULT_HOST, "clarithromycin", "azithromycin");
  assert.ok(diff);
  assert.deepEqual(diff.before, analyze(TRAY, DEFAULT_HOST, {}));
  assert.deepEqual(diff.after, analyze(diff.ids, DEFAULT_HOST, {}));
});

test("every finding lands in exactly one bucket, with the engine's grade", () => {
  const hosts: HostContext[] = [
    DEFAULT_HOST,
    { ...DEFAULT_HOST, phenotypes: { ...DEFAULT_HOST.phenotypes, CYP2D6: "PM" }, smoking: true },
  ];
  const cases: [string[], string, string][] = [
    [TRAY, "clarithromycin", "azithromycin"],
    [TRAY, "simvastatin", "pravastatin"],
    [["warfarin", "fluconazole", "sertraline"], "fluconazole", "terbinafine"],
    [["tramadol", "paroxetine"], "paroxetine", "sertraline"],
  ];
  for (const host of hosts) {
    for (const [ids, outId, inId] of cases) {
      const diff = swapDiff(ids, host, outId, inId);
      assert.ok(diff, `${outId} -> ${inId}`);
      const beforeIds = diff.before.findings.map((f) => f.id);
      const afterIds = diff.after.findings.map((f) => f.id);
      assert.equal(diff.gone.length + diff.regraded.length + diff.kept, beforeIds.length);
      assert.equal(diff.added.length + diff.regraded.length + diff.kept, afterIds.length);
      for (const f of diff.gone) assert.ok(beforeIds.includes(f.id) && !afterIds.includes(f.id));
      for (const f of diff.added) assert.ok(afterIds.includes(f.id) && !beforeIds.includes(f.id));
      const afterById = new Map(diff.after.findings.map((f) => [f.id, f]));
      const beforeById = new Map(diff.before.findings.map((f) => [f.id, f]));
      for (const f of diff.added) assert.equal(f, afterById.get(f.id), "added rows are the engine's objects");
      for (const f of diff.gone) assert.equal(f, beforeById.get(f.id), "gone rows are the engine's objects");
      for (const r of diff.regraded) {
        assert.equal(r.finding.severity, afterById.get(r.finding.id)?.severity);
        assert.equal(r.was, beforeById.get(r.finding.id)?.severity);
        assert.notEqual(r.was, r.finding.severity);
      }
    }
  }
});

test("taking off the inhibitor moves its findings to the gone list", () => {
  const diff = swapDiff(TRAY, DEFAULT_HOST, "clarithromycin", "azithromycin");
  assert.ok(diff);
  assert.ok(diff.gone.length > 0);
  assert.ok(diff.gone.every((f) => f.drugIds.includes("clarithromycin") || f.id.includes("clarithromycin")));
  // Sorted with the most serious first.
  const ranks = diff.gone.map((f) => ["minor", "moderate", "major", "contraindicated"].indexOf(f.severity));
  assert.deepEqual(ranks, [...ranks].sort((a, b) => b - a));
});

test("the amount for the item taken off is dropped and the rest are kept", () => {
  const amounts = { simvastatin: 40, clarithromycin: 500 };
  const diff = swapDiff(TRAY, DEFAULT_HOST, "clarithromycin", "azithromycin", amounts);
  assert.ok(diff);
  assert.deepEqual(diff.after, analyze(diff.ids, DEFAULT_HOST, { simvastatin: 40 }));
  assert.deepEqual(diff.before, analyze(TRAY, DEFAULT_HOST, amounts));
});

test("an impossible swap returns null", () => {
  assert.equal(swapDiff(TRAY, DEFAULT_HOST, "warfarin", "azithromycin"), null);
});

test("swap copy says teaching only and makes no clearance claim", () => {
  const all = Object.values(SWAP_COPY).join(" ");
  assert.match(SWAP_COPY.caveat, /not a substitution recommendation/);
  assert.match(SWAP_COPY.caveat, /not a clearance/);
  assert.doesNotMatch(all, /—/);
  assert.doesNotMatch(all, /\bsafe\b|FDA approved|FDA cleared|clinically validated/i);
});
