import assert from "node:assert/strict";
import test from "node:test";
import { hoursToTakenAt, ingestionTimes, useDesk } from "./store";

test("hoursToTakenAt keeps the moment, and rejects out-of-range or non-finite hours", () => {
  assert.equal(hoursToTakenAt(4, 10_000_000), 10_000_000 - 4 * 3_600_000);
  assert.equal(hoursToTakenAt(0, 5), 5);
  for (const bad of [-1, 721, Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
    assert.equal(hoursToTakenAt(bad, 1), undefined);
  }
});

test("ingestionTimes derives hours ago from the clock, so it moves", () => {
  const t0 = 1_000_000_000;
  const at = hoursToTakenAt(4, t0)!;
  assert.equal(ingestionTimes({ ketamine: at }, ["ketamine", "alprazolam"], t0).ketamine, 4);
  assert.equal(ingestionTimes({ ketamine: at }, ["ketamine"], t0 + 2 * 3_600_000).ketamine, 6);
  assert.deepEqual(ingestionTimes({ ketamine: at }, ["alprazolam"], t0), {});
});

test("a stated time goes away on remove, swap, clear and load", () => {
  const desk = useDesk.getState();
  desk.clear();
  desk.add("ketamine");
  desk.add("alprazolam");
  useDesk.getState().setTakenHoursAgo("ketamine", 4);
  useDesk.getState().setTakenHoursAgo("alprazolam", 2);
  useDesk.getState().setTakenHoursAgo("alprazolam", 9999);
  assert.deepEqual(Object.keys(useDesk.getState().takenAt), ["ketamine"]);
  useDesk.getState().swap("ketamine", "midazolam");
  assert.deepEqual(useDesk.getState().takenAt, {});
  useDesk.getState().setTakenHoursAgo("alprazolam", 2);
  useDesk.getState().remove("alprazolam");
  assert.deepEqual(useDesk.getState().takenAt, {});
  useDesk.getState().add("ketamine");
  useDesk.getState().setTakenHoursAgo("ketamine", 1);
  useDesk.getState().load(["ketamine"]);
  assert.deepEqual(useDesk.getState().takenAt, {});
  useDesk.getState().setTakenHoursAgo("ketamine", 1);
  useDesk.getState().clear();
  assert.deepEqual(useDesk.getState().takenAt, {});
});

test("times are not part of what the desk persists", async () => {
  const { partializeDesk } = await import("./desk-persist");
  const out = partializeDesk(useDesk.getState()) as Record<string, unknown>;
  assert.equal("takenAt" in out, false);
});
