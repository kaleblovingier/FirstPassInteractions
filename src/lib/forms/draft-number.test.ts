import test from "node:test";
import assert from "node:assert/strict";
import { draftValue, settleDraft } from "./draft-number.ts";

const weight = { min: 20, max: 250, fallback: 70 };

test("partial typing below the floor is kept as a draft, not snapped to the floor", () => {
  assert.equal(draftValue("1", weight), null);
  assert.equal(draftValue("12", weight), null);
  assert.equal(draftValue("120", weight), 120);
  assert.equal(draftValue("", weight), null);
  assert.equal(draftValue("300", weight), null);
});

test("leaving the field clamps into range, and a blank field goes back to its default", () => {
  assert.equal(settleDraft("1", weight), 20);
  assert.equal(settleDraft("999", weight), 250);
  assert.equal(settleDraft("85.5", weight), 85.5);
  assert.equal(settleDraft("", weight), 70);
  assert.equal(settleDraft("abc", weight), 70);
});

test("a floor-only bound has no ceiling", () => {
  const dose = { min: 1, fallback: 100 };
  assert.equal(draftValue("50000", dose), 50000);
  assert.equal(settleDraft("0", dose), 1);
});
