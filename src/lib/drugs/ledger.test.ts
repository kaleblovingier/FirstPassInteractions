import test from "node:test";
import assert from "node:assert/strict";
import {
  countFourthEnzymes,
  countNarrowIndex,
  countThirdSubstrates,
  ledgerFor,
  sharedEnzymes,
} from "./ledger";

test("ledgerFor restates stored rows and drops unknown ids", () => {
  const rows = ledgerFor(["no-such-id", "warfarin"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, "warfarin");
  assert.deepEqual(
    rows[0]?.seats.map((seat) => `${seat.enzyme} ${seat.kind} ${seat.detail}`),
    [
      "CYP2C9 substrate sensitive clearance, narrow index",
      "CYP3A4 substrate minor clearance",
      "CYP1A2 substrate minor clearance",
    ],
  );
  const none = ledgerFor(["azithromycin"]);
  assert.equal(none.length, 1);
  assert.equal(none[0]?.seats.length, 0);
});

test("sharedEnzymes needs two different names", () => {
  const pair = sharedEnzymes(["warfarin", "clarithromycin"]).map((row) => row.enzyme);
  assert.ok(pair.includes("CYP3A4"));
  assert.equal(pair.includes("P-gp"), false);
  assert.equal(pair.includes("CYP2C9"), false);
  assert.equal(sharedEnzymes(["ritonavir"]).length, 0);
  assert.ok(sharedEnzymes(["simvastatin", "clarithromycin"]).some((row) => row.enzyme === "CYP3A4"));
});

test("clarithromycin and grapefruit seats restate stored strength", () => {
  const macro = ledgerFor(["clarithromycin"])[0];
  assert.ok(macro);
  assert.ok(macro.seats.some((seat) => seat.enzyme === "CYP3A4" && seat.kind === "substrate" && seat.detail === "major clearance"));
  assert.ok(macro.seats.some((seat) => seat.enzyme === "CYP3A4" && seat.kind === "inhibitor" && seat.detail === "strong"));
  assert.ok(macro.seats.some((seat) => seat.enzyme === "P-gp" && seat.kind === "inhibitor" && seat.detail === "moderate"));
  const juice = ledgerFor(["grapefruit"])[0];
  assert.ok(juice);
  assert.equal(juice.name, "Grapefruit juice");
  assert.equal(juice.seats[0]?.kind, "inhibitor");
  assert.equal(juice.seats[0]?.enzyme, "CYP3A4");
  assert.equal(juice.seats[0]?.detail, "moderate");
});

test("desk counts use stored rows only", () => {
  assert.equal(countFourthEnzymes(["rifampin", "warfarin"]), 1);
  assert.equal(countThirdSubstrates(["methadone", "simvastatin"]), 1);
  assert.equal(countNarrowIndex(["warfarin", "simvastatin"]), 1);
});
