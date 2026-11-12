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
});

describe("half-lives - read through the timing sketch", () => {
  it("answers for items the PK shelf lacks", () => {
    assert.deepEqual(halfLifeFor("sertraline"), { hours: 26, source: "FDA label, clinical pharmacology" });
    assert.equal(halfLifeFor("lsd")?.hours, 4);
    assert.equal(halfLifeFor("mdma")?.source, "FirstPass PK shelf");
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
  });
});
