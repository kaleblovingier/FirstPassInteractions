import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DRUG_BY_ID } from "./catalog";
import { analyze } from "./engine";
import { HALF_LIVES, NO_SINGLE_HALF_LIFE } from "./half-lives";
import { halfLifeFor, timeline } from "./overlap";
import { pkHalfLifeH } from "./pk";

describe("half-lives - the tables", () => {
  it("keys every row by a catalog id", () => {
    for (const id of [...Object.keys(HALF_LIVES), ...Object.keys(NO_SINGLE_HALF_LIFE)]) {
      assert.ok(Object.hasOwn(DRUG_BY_ID, id), id);
    }
  });

  it("holds finite, positive hours under a month, each with a source", () => {
    assert.ok(Object.keys(HALF_LIVES).length >= 47);
    for (const [id, row] of Object.entries(HALF_LIVES)) {
      assert.ok(Number.isFinite(row.hours) && row.hours > 0 && row.hours < 720, id);
      assert.ok(row.source.trim().length > 0, id);
    }
  });

  it("never repeats the PK shelf, and never lists an id in both tables", () => {
    for (const id of Object.keys(HALF_LIVES)) {
      assert.equal(pkHalfLifeH(id), undefined, `${id} is already on the PK shelf`);
      assert.ok(!Object.hasOwn(NO_SINGLE_HALF_LIFE, id), `${id} is in both tables`);
    }
  });

  it("gives every no-single-half-life row one plain sentence", () => {
    for (const [id, note] of Object.entries(NO_SINGLE_HALF_LIFE)) {
      assert.match(note, /^[A-Z].+\.$/, id);
    }
  });

  it("covers everyday anticoagulants, cardiovascular agents, metabolic drugs, anti-infectives, and CNS meds", () => {
    for (const id of [
      "apixaban",
      "rivaroxaban",
      "dabigatran",
      "edoxaban",
      "sotalol",
      "dofetilide",
      "dronedarone",
      "flecainide",
      "metoprolol",
      "carvedilol",
      "rosuvastatin",
      "furosemide",
      "lisinopril",
      "glipizide",
      "empagliflozin",
      "metformin",
      "clarithromycin",
      "azithromycin",
      "levofloxacin",
      "fluconazole",
      "vancomycin",
      "valproate",
      "levetiracetam",
      "topiramate",
      "everolimus",
      "fluvoxamine",
      "digoxin",
      "ciprofloxacin",
      "linezolid",
      "trazodone",
    ]) {
      assert.ok(Object.hasOwn(HALF_LIVES, id), `${id} missing from HALF_LIVES`);
    }
    for (const id of [
      "voriconazole",
      "phenytoin",
      "amiodarone",
      "spironolactone",
      "losartan",
      "omeprazole",
      "pantoprazole",
    ]) {
      assert.ok(Object.hasOwn(NO_SINGLE_HALF_LIFE, id), `${id} missing from NO_SINGLE_HALF_LIFE`);
      assert.equal(pkHalfLifeH(id), undefined, `${id} should not duplicate PK shelf`);
    }
  });
});

describe("half-lives - read through the timing sketch", () => {
  it("answers for items the PK shelf lacks", () => {
    assert.deepEqual(halfLifeFor("sertraline"), { hours: 26, source: "FDA label, clinical pharmacology" });
    assert.equal(halfLifeFor("lsd")?.hours, 4);
    assert.equal(halfLifeFor("mdma")?.source, "FirstPass PK shelf");
    assert.equal(halfLifeFor("apixaban")?.hours, 12);
    assert.equal(halfLifeFor("dronedarone")?.hours, 19);
    assert.equal(halfLifeFor("metoprolol")?.hours, 9);
    assert.equal(halfLifeFor("empagliflozin")?.hours, 12.4);
    assert.equal(halfLifeFor("fluconazole")?.hours, 30);
    assert.equal(halfLifeFor("azithromycin")?.hours, 68);
    assert.equal(halfLifeFor("topiramate")?.hours, 56);
    assert.equal(halfLifeFor("digoxin")?.hours, 48);
    assert.equal(halfLifeFor("ciprofloxacin")?.hours, 6);
    assert.equal(halfLifeFor("linezolid")?.hours, 5.4);
    assert.equal(halfLifeFor("trazodone")?.hours, 18);
  });

  it("shows a note and no share left where one half-life would mislead", () => {
    assert.equal(halfLifeFor("ethanol"), undefined);
    const ids = ["ethanol", "sertraline"];
    const sketch = timeline(ids, { ethanol: 2, sertraline: 26 }, analyze(ids));
    const ethanol = sketch.rows.find((row) => row.id === "ethanol")!;
    assert.equal(ethanol.remaining, undefined);
    assert.match(ethanol.note ?? "", /fixed amount per hour/);
    assert.equal(sketch.rows.find((row) => row.id === "sertraline")!.remaining, 0.5);
    assert.equal(sketch.pairs[0]!.activeOverlapPercent, undefined);

    for (const id of ["voriconazole", "phenytoin", "amiodarone", "spironolactone", "losartan", "omeprazole", "pantoprazole"]) {
      assert.equal(halfLifeFor(id), undefined, id);
    }
  });

  it("computes timeline overlap for newly added pairs and respects outlasting clocks", () => {
    const doacIds = ["apixaban", "fluconazole"];
    const doacEven = timeline(doacIds, { apixaban: 12, fluconazole: 30 }, analyze(doacIds));
    assert.equal(doacEven.rows.find((row) => row.id === "apixaban")!.remaining, 0.5);
    assert.equal(doacEven.rows.find((row) => row.id === "fluconazole")!.remaining, 0.5);
    assert.equal(doacEven.pairs[0]!.severity, "moderate");
    assert.equal(doacEven.pairs[0]!.activeOverlapPercent, 50);

    const doacAsym = timeline(doacIds, { apixaban: 24, fluconazole: 30 }, analyze(doacIds));
    assert.equal(doacAsym.rows.find((row) => row.id === "apixaban")!.remaining, 0.25);
    assert.equal(doacAsym.pairs[0]!.activeOverlapPercent, 25);

    const tdiIds = ["apixaban", "clarithromycin"];
    const tdiSketch = timeline(tdiIds, { apixaban: 12, clarithromycin: 7 }, analyze(tdiIds));
    assert.equal(tdiSketch.rows.find((row) => row.id === "clarithromycin")!.remaining, 0.5);
    assert.match(tdiSketch.pairs[0]!.holds ?? "", /clock/);
    assert.equal(tdiSketch.pairs[0]!.activeOverlapPercent, undefined);

    const unmappedOverlap = timeline(["azithromycin", "edoxaban"], { azithromycin: 68, edoxaban: 28 }, analyze(["azithromycin", "edoxaban"]));
    assert.equal(unmappedOverlap.rows.find((row) => row.id === "azithromycin")!.remaining, 0.5);
    assert.equal(unmappedOverlap.rows.find((row) => row.id === "edoxaban")!.remaining, 0.25);
    assert.equal(unmappedOverlap.pairs[0]!.activeOverlapPercent, 25);
  });

  it("suppresses decay percentages in timeline for nonlinear, long-tissue, active-metabolite, and PPI entries", () => {
    const voriPheny = timeline(["voriconazole", "phenytoin"], { voriconazole: 6, phenytoin: 22 }, analyze(["voriconazole", "phenytoin"]));
    const vori = voriPheny.rows.find((row) => row.id === "voriconazole")!;
    const pheny = voriPheny.rows.find((row) => row.id === "phenytoin")!;
    assert.equal(vori.remaining, undefined);
    assert.equal(pheny.remaining, undefined);
    assert.match(vori.note ?? "", /non-linear/i);
    assert.match(pheny.note ?? "", /Michaelis-Menten/i);
    assert.equal(voriPheny.pairs[0]!.severity, "major");
    assert.equal(voriPheny.pairs[0]!.activeOverlapPercent, undefined);

    const amioDab = timeline(["dabigatran", "amiodarone"], { dabigatran: 17, amiodarone: 240 }, analyze(["dabigatran", "amiodarone"]));
    assert.equal(amioDab.rows.find((row) => row.id === "dabigatran")!.remaining, 0.5);
    const amio = amioDab.rows.find((row) => row.id === "amiodarone")!;
    assert.equal(amio.remaining, undefined);
    assert.match(amio.note ?? "", /weeks to months/i);
    assert.equal(amioDab.pairs[0]!.activeOverlapPercent, undefined);

    const spiroLis = timeline(["spironolactone", "lisinopril"], { spironolactone: 12, lisinopril: 12 }, analyze(["spironolactone", "lisinopril"]));
    assert.equal(spiroLis.rows.find((row) => row.id === "spironolactone")!.remaining, undefined);
    assert.equal(spiroLis.rows.find((row) => row.id === "lisinopril")!.remaining, 0.5);
    assert.equal(spiroLis.pairs[0]!.severity, "major");
    assert.equal(spiroLis.pairs[0]!.activeOverlapPercent, undefined);
  });
});
