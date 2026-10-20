import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkDose, dosingOnDesk, DOSING } from "./dosing";
import { DEFAULT_HOST } from "./types";

describe("dosing - Labeled Dose Rails & Interaction Caps", () => {
  it("enforces citalopram labeled rails and CYP2C19 interaction dose-cap", () => {
    assert.ok(DOSING.citalopram);
    assert.equal(DOSING.citalopram.usualLow, 20);
    assert.equal(DOSING.citalopram.usualHigh, 40);
    assert.equal(DOSING.citalopram.labeledMax, 40);
    assert.match(DOSING.citalopram.geriatric ?? "", /Max 20 mg/i);

    // Dose in usual range without perpetrator
    const usual = checkDose("citalopram", 30, ["citalopram"]);
    assert.ok(usual);
    assert.equal(usual.band, "usual");
    assert.equal(usual.tone, "ok");

    // Dose exceeding 40 mg labeled max
    const overMax = checkDose("citalopram", 60, ["citalopram"]);
    assert.ok(overMax);
    assert.equal(overMax.band, "over-max");
    assert.equal(overMax.tone, "danger");

    // With omeprazole (CYP2C19 inhibitor): capped at 20 mg
    const cappedOk = checkDose("citalopram", 20, ["citalopram", "omeprazole"]);
    assert.ok(cappedOk);
    assert.equal(cappedOk.cap?.mg, 20);

    const cappedExceeded = checkDose("citalopram", 40, ["citalopram", "omeprazole"]);
    assert.ok(cappedExceeded);
    assert.equal(cappedExceeded.band, "over-cap");
    assert.equal(cappedExceeded.tone, "danger");
    assert.match(cappedExceeded.headline, /exceeds the labeled 20 mg\/day cap/i);
    assert.match(cappedExceeded.detail, /CYP2C19.*QT prolongation/i);
  });

  it("checks multiple doses across desk regimen via dosingOnDesk", () => {
    const results = dosingOnDesk(["citalopram", "omeprazole"], { citalopram: 40 }, DEFAULT_HOST);
    assert.equal(results.length, 2);
    const cit = results.find((r) => r.id === "citalopram");
    assert.ok(cit);
    assert.equal(cit.band, "over-cap");
  });
});
