/**
 * Perpetrator roles whose labels give no strength stay ungraded (no scored role).
 * Teaching data. Not a dose.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DRUG_BY_ID } from "./catalog";

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
