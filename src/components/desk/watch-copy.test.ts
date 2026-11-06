import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  WATCH_RECALL_FAILED,
  WATCH_SHORTAGE_EMPTY,
  WATCH_SHORTAGE_FAILED,
  formatFetchedAt,
  watchRecallCopy,
  watchShortageCopy,
} from "./watch-copy";

test("a failed shortage on an otherwise ok pack uses the failure copy", () => {
  const copy = watchShortageCopy({
    ok: true,
    shortage: [],
    failed: ["shortage"],
  });
  assert.equal(copy, WATCH_SHORTAGE_FAILED);
  assert.notEqual(copy, WATCH_SHORTAGE_EMPTY);
  assert.match(copy, /FDA shortages did not answer/);
  assert.match(copy, /a quiet pull is not a green light/i);
  assert.doesNotMatch(copy, /No OpenFDA shortage rows came back/);
});

test("an empty shortage stays a different sentence and still refuses a green light", () => {
  const copy = watchShortageCopy({ ok: true, shortage: [], failed: [] });
  assert.equal(copy, WATCH_SHORTAGE_EMPTY);
  assert.match(copy, /No OpenFDA shortage rows came back this time/);
  assert.match(copy, /a quiet pull is not a green light/i);
  assert.doesNotMatch(copy, /did not answer/);
});

test("a named shortage failure keeps that phrase and still refuses a green light", () => {
  const reason = "FDA shortages answered with an error — those rows may be missing this time.";
  const copy = watchShortageCopy({ ok: true, shortage: [], failed: ["shortage"], reason });
  assert.equal(
    copy,
    "FDA shortages answered with an error — those rows may be missing this time. A quiet pull is not a green light: check the FDA shortage page and the label.",
  );
  assert.notEqual(copy, WATCH_SHORTAGE_EMPTY);
});

test("a failed enforcement pull is not the empty-shortage sentence", () => {
  const copy = watchRecallCopy({ recalls: [], failed: ["recalls"] });
  assert.equal(copy, WATCH_RECALL_FAILED);
  assert.notEqual(copy, WATCH_SHORTAGE_EMPTY);
  assert.notEqual(copy, WATCH_SHORTAGE_FAILED);
  assert.match(copy, /FDA enforcement did not answer/);
  assert.match(copy, /a quiet pull is not a green light/i);
});

test("rows win over a failed flag, and a total miss does not claim an empty shortage", () => {
  assert.equal(watchShortageCopy({ ok: true, shortage: [{ name: "warfarin" }], failed: ["shortage"] }), null);
  assert.equal(watchShortageCopy({ ok: false, shortage: [], failed: ["label"] }), null);
  assert.equal(watchRecallCopy({ recalls: [{ date: "2024-01-01" }], failed: ["recalls"] }), null);
});

test("fetched-at is the pack clock in UTC", () => {
  assert.equal(formatFetchedAt("2026-11-05T02:48:12.345Z"), "2026-11-05 02:48 UTC");
  assert.equal(formatFetchedAt("not-a-time"), "not-a-time");
});

test("Watch refresh skips the cache, names the pull time, and does not call a row Top", () => {
  const src = readFileSync("src/components/desk/watch.tsx", "utf8");
  assert.match(src, /refresh:\s*true|refresh,/);
  assert.match(src, /formatFetchedAt/);
  assert.match(src, /watchShortageCopy/);
  assert.match(src, /watchRecallCopy/);
  assert.match(src, /FDA enforcement/);
  assert.doesNotMatch(src, /Top recall/);
});
