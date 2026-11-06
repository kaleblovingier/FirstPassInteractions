/**
 * Perpetrator roles whose labels give no strength stay ungraded (no scored role).
 * Teaching data. Not a dose.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";
import { UNGRADED_PERPETRATOR_IDS, ungradedPerpetratorsFor } from "./ungraded-perpetrators";

/** A new scored inh() or ind() on any of these ids fails CI. */
const LOCKED_UNGRADED_IDS = [
  "fedratinib",
  "mavacamten",
  "mavorixafor",
  "vanzacaftor-tezacaftor-deutivacaftor",
  "etripamil",
  "tradipitant",
  "zoliflodacin",
] as const;

test("fedratinib has no graded inhibitor role; Inrebic label names no strength", () => {
  const d = DRUG_BY_ID.fedratinib;
  assert.ok(d);
  assert.equal(d.enzymes.some((r) => r.kind === "inhibitor"), false);
  assert.match(d.toxicityHint ?? "", /ungraded/);
});

test("mavacamten inducer roles stay ungraded and cite Camzyos 7.2", () => {
  const d = DRUG_BY_ID.mavacamten;
  assert.ok(d);
  assert.equal(d.enzymes.some((r) => r.kind === "inducer"), false);
  assert.ok((d.note ?? "").includes("Mavacamten is an inducer of CYP3A4, CYP2C9, and CYP2C19."));
});

test("locked ungraded ids have no scored inh() or ind(), and match the annotation list", () => {
  assert.deepEqual([...UNGRADED_PERPETRATOR_IDS].sort(), [...LOCKED_UNGRADED_IDS].sort());
  for (const id of LOCKED_UNGRADED_IDS) {
    const d = DRUG_BY_ID[id];
    assert.ok(d, id);
    assert.equal(
      d.enzymes.some((r) => r.kind === "inhibitor" || r.kind === "inducer"),
      false,
      `${id} gained a scored perpetrator`,
    );
    assert.ok(ungradedPerpetratorsFor(id).length > 0, `${id} is missing an unscored annotation`);
  }
});
