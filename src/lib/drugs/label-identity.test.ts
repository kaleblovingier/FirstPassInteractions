import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OPENFDA_NO_DATE,
  formatEffectiveTime,
  labelIdentityLine,
  pickSpl,
  setidsInText,
  storedLabelEffective,
} from "./label-identity";

const FILED = "9d5848f0-e9f0-4112-a7ca-bcc8ea2e69c6";
const NOTE = "80b57cfe-7819-4d95-a57d-014af42f118d";

describe("label identity", () => {
  it("reads a DailyMed setid out of a catalog note", () => {
    const note = `Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${NOTE}`;
    assert.deepEqual(setidsInText(note), [NOTE]);
    assert.deepEqual(setidsInText("no link here"), []);
  });

  it("prefers the catalog-note setid, then a setid on file, then the first hit", () => {
    const rows = [
      { set_id: "shown-first", id: "a" },
      { set_id: FILED, id: "b" },
      { set_id: NOTE.toUpperCase(), id: "c" },
    ];
    assert.equal(pickSpl(rows, [NOTE])?.id, "c");
    assert.equal(pickSpl(rows, [])?.id, "b");
    assert.equal(pickSpl(rows.slice(0, 1), [])?.id, "a");
  });

  it("formats an 8-digit effective_time and says when the stored date differs", () => {
    assert.equal(formatEffectiveTime("20200102"), "2020-01-02");
    assert.equal(formatEffectiveTime("2020-01-02"), "2020-01-02");
    assert.equal(formatEffectiveTime("20200102153000"), "2020-01-02");
    assert.equal(formatEffectiveTime(""), "");
    assert.equal(formatEffectiveTime(undefined), "");
    const stored = storedLabelEffective(FILED);
    assert.equal(stored, "2026-06-24");
    const line = labelIdentityLine({
      setId: FILED,
      openFdaId: "openfda-filed",
      effectiveTime: "2020-01-02",
      storedEffective: stored,
    });
    assert.match(line, /Effective 2020-01-02/);
    assert.match(line, /dated 2026-06-24, which differs/);
    assert.match(line, /The stored grade quote was not changed/);
    assert.equal(storedLabelEffective(FILED), "2026-06-24");
    assert.equal(
      labelIdentityLine({
        setId: "shown-first",
        openFdaId: "",
        effectiveTime: "",
        storedEffective: undefined,
      }),
      `SPL shown-first. ${OPENFDA_NO_DATE}.`,
    );
  });
});
