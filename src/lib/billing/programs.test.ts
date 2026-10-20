import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PROGRAM_TIERS, programQuote, tierForSeats } from "./programs";

const FOUNDING = 79;

describe("program tiers", () => {
  it("cover every seat count with contiguous bands", () => {
    for (let n = 1; n <= 500; n++) {
      const t = tierForSeats(n);
      assert.ok(t.seats === null || n <= t.seats, `${n} → ${t.id}`);
    }
    assert.equal(PROGRAM_TIERS.at(-1)!.seats, null);
  });

  it("cost less per year than Founding for each person, from the first seat each tier is chosen for (9+ on Team)", () => {
    let floor = 1;
    for (const t of PROGRAM_TIERS) {
      const first = Math.max(floor, t.id === "team" ? 9 : floor);
      assert.ok(t.annual < first * FOUNDING, `${t.id} at ${first} seats: $${t.annual} vs $${first * FOUNDING}`);
      floor = (t.seats ?? 0) + 1;
    }
  });

  it("quotes multi-year terms with the published discount", () => {
    const q = programQuote(60, 3);
    assert.equal(q.tier.id, "program");
    assert.equal(q.total, Math.round(q.tier.annual * 3 * 0.85));
  });
});
