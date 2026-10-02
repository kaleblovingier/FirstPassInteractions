import test from "node:test";
import assert from "node:assert/strict";
import { buildDeskCoach } from "./desk-coach.ts";

test("returns null for an empty tray", () => {
  assert.equal(buildDeskCoach([]), null);
});

test("single substrate gets partner adds and a phenotype tip", () => {
  const tip = buildDeskCoach(["ketamine"]);
  assert.ok(tip);
  assert.match(tip!.headline, /collided|alone|Why/i);
  assert.ok(tip!.actions.some((a) => a.kind === "add" && a.id === "clarithromycin"));
  assert.ok(tip!.actions.some((a) => a.kind === "add" && a.id === "grapefruit"));
});

test("empty metformin+aspirin pair still offers next steps", () => {
  const tip = buildDeskCoach(["metformin", "aspirin"]);
  assert.ok(tip);
  assert.match(tip!.headline, /No mapped|finding/i);
  assert.ok(tip!.actions.some((a) => a.kind === "view"));
  assert.ok(tip!.why.includes("not clearance") || tip!.why.includes("not proof") || tip!.why.length > 40);
});

test("does not suggest drugs already on the desk", () => {
  const tip = buildDeskCoach(["ketamine", "clarithromycin"]);
  assert.ok(tip);
  assert.equal(
    tip!.actions.some((a) => a.kind === "add" && a.id === "clarithromycin"),
    false,
  );
});

test("2D6 substrate suggests a poor-metabolizer flip", () => {
  const tip = buildDeskCoach(["dextromethorphan"]);
  assert.ok(tip);
  assert.ok(
    tip!.actions.some((a) => a.kind === "phenotype" && a.enzyme === "CYP2D6" && a.value === "PM"),
  );
});
