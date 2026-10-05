import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import {
  DIALYSIS_CATALOG,
  dialysisOnDesk,
  dialysisWanted,
} from "./dialysis";

describe("dialysis", () => {
  it("every drug in DIALYSIS_CATALOG exists in the main catalog", () => {
    for (const [id, entry] of Object.entries(DIALYSIS_CATALOG)) {
      assert.ok(
        DRUG_BY_ID[id],
        `Drug ID '${id}' in DIALYSIS_CATALOG must exist in DRUG_BY_ID`,
      );
      assert.equal(entry.id, id);
      assert.ok(entry.name.length > 0);
      assert.ok(entry.molecularWeightDa > 0);
      assert.ok(entry.proteinBindingPct >= 0 && entry.proteinBindingPct <= 100);
      assert.ok(entry.volumeDistributionLKg > 0);
      assert.ok(entry.mechanism.length > 0);
      assert.ok(entry.pearl.length > 0);
    }
  });

  it("dialysisWanted returns true only when mapped drugs exist", () => {
    assert.equal(dialysisWanted(["cefepime", "water"]), true);
    assert.equal(dialysisWanted(["non-existent-drug"]), false);
    assert.equal(dialysisWanted([]), false);
  });

  it("dialysisOnDesk returns null for empty or unmapped tray", () => {
    assert.equal(dialysisOnDesk([]), null);
    assert.equal(dialysisOnDesk(["unknown-molecule"]), null);
  });

  it("distinguishes dialyzed, partially-dialyzed, and non-dialyzed drugs", () => {
    const report = dialysisOnDesk([
      "cefepime",
      "vancomycin",
      "ceftriaxone",
      "lithium",
      "amiodarone",
    ]);
    assert.ok(report);
    assert.equal(report.rows.length, 5);

    const cefepime = report.rows.find((r) => r.id === "cefepime");
    assert.ok(cefepime);
    assert.equal(cefepime.dialyzability, "dialyzed");
    assert.equal(cefepime.schedule, "post-hd");

    const vanco = report.rows.find((r) => r.id === "vancomycin");
    assert.ok(vanco);
    assert.equal(vanco.dialyzability, "partially-dialyzed");

    const ceftriaxone = report.rows.find((r) => r.id === "ceftriaxone");
    assert.ok(ceftriaxone);
    assert.equal(ceftriaxone.dialyzability, "not-dialyzed");
    assert.equal(ceftriaxone.schedule, "standard");

    const lithium = report.rows.find((r) => r.id === "lithium");
    assert.ok(lithium);
    assert.equal(lithium.dialyzability, "dialyzed");

    const amiodarone = report.rows.find((r) => r.id === "amiodarone");
    assert.ok(amiodarone);
    assert.equal(amiodarone.dialyzability, "not-dialyzed");

    assert.equal(report.dialyzedCount, 2);
    assert.equal(report.partiallyDialyzedCount, 1);
    assert.equal(report.notDialyzedCount, 2);
  });

  it("deduplicates identical drug IDs on tray", () => {
    const report = dialysisOnDesk(["meropenem", "meropenem", "meropenem"]);
    assert.ok(report);
    assert.equal(report.rows.length, 1);
    assert.equal(report.dialyzedCount, 1);
  });

  it("identifies DOAC divergence: dabigatran dialyzed vs apixaban/rivaroxaban non-dialyzed", () => {
    const report = dialysisOnDesk(["dabigatran", "apixaban", "rivaroxaban"]);
    assert.ok(report);
    const dab = report.rows.find((r) => r.id === "dabigatran");
    const apix = report.rows.find((r) => r.id === "apixaban");
    const riva = report.rows.find((r) => r.id === "rivaroxaban");

    assert.equal(dab?.dialyzability, "dialyzed");
    assert.equal(apix?.dialyzability, "not-dialyzed");
    assert.equal(riva?.dialyzability, "not-dialyzed");
  });

  it("dialysis copy stays educational without prescribing replacement doses", () => {
    for (const entry of Object.values(DIALYSIS_CATALOG)) {
      const text = `${entry.mechanism} ${entry.pearl} ${entry.caution ?? ""}`;
      assert.doesNotMatch(text, /prescribe\s+\d+\s*mg/i);
      assert.doesNotMatch(text, /give\s+\d+\s*mg\s+now/i);
      assert.doesNotMatch(text, /FDA-approved replacement dose/i);
    }
  });
});

