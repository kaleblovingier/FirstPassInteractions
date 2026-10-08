import test from "node:test";
import assert from "node:assert/strict";
import { CLINIC_FORMULARY, enz } from "./catalog-clinic";

test("enz maps d: to a weak CYP3A4 inducer", () => {
  const roles = enz("d:CYP3A4:weak");
  assert.equal(roles.length, 1);
  const role = roles[0];
  assert.equal(role.kind, "inducer");
  assert.equal(role.enzyme, "CYP3A4");
  if (role.kind !== "inducer") return;
  assert.equal(role.strength, "weak");
});

test("enz maps s: to a CYP3A4 substrate", () => {
  const roles = enz("s:CYP3A4:major");
  assert.equal(roles.length, 1);
  assert.equal(roles[0].kind, "substrate");
  assert.equal(roles[0].enzyme, "CYP3A4");
});

test("enz throws on an unknown enzyme code", () => {
  assert.throws(() => enz("nope:CYP3A4:strong"), /unknown clinic enzyme code: nope:CYP3A4:strong/);
});

test("CLINIC_FORMULARY loads and nafcillin CYP3A4 is an inducer", () => {
  assert.ok(CLINIC_FORMULARY.length > 0);
  const nafcillin = CLINIC_FORMULARY.find((drug) => drug.id === "nafcillin");
  assert.ok(nafcillin);
  const role = nafcillin.enzymes.find((entry) => entry.enzyme === "CYP3A4");
  assert.ok(role);
  assert.equal(role.kind, "inducer");
});
