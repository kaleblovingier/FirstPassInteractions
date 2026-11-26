import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze } from "./engine";
import { addedSummary, appendedIds, rowsWith } from "./just-added";

describe("appendedIds - only a pure addition counts", () => {
  it("returns what was appended to a tray that held something", () => {
    assert.deepEqual(appendedIds(["sertraline"], ["sertraline", "tramadol"]), ["tramadol"]);
    assert.deepEqual(appendedIds(["a"], ["a", "b", "c"]), ["b", "c"]);
  });

  it("gives none for the first fill, a removal, a swap or a reordered tray", () => {
    assert.deepEqual(appendedIds([], ["a", "b"]), []);
    assert.deepEqual(appendedIds(["a", "b"], ["a"]), []);
    assert.deepEqual(appendedIds(["a", "b"], ["a", "c"]), []);
    assert.deepEqual(appendedIds(["a", "b"], ["b", "a", "c"]), []);
    assert.deepEqual(appendedIds(["a"], ["a"]), []);
  });
});

describe("addedSummary - counts the engine's rows, never grades", () => {
  it("sums the rows the new drug brought, worst first", () => {
    const report = analyze(["sertraline", "tramadol"]);
    const rows = rowsWith(report.findings, ["tramadol"]);
    assert.ok(rows.length > 0);
    assert.match(addedSummary(["tramadol"], report.findings), new RegExp(`^Adding Tramadol brought ${rows.length} rows?: `));
    assert.match(addedSummary(["tramadol"], report.findings), /serious concern|avoid together/);
  });

  it("says a blank is not a clearance when nothing is mapped", () => {
    assert.equal(addedSummary(["x-missing"], []), "Adding x-missing brought no mapped rows. A blank pair is not a clearance.");
  });

  it("names several new items", () => {
    assert.match(addedSummary(["acetaminophen", "diphenhydramine"], []), /^Adding Acetaminophen and Diphenhydramine brought/);
  });
});
