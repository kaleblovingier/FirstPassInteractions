import test from "node:test";
import assert from "node:assert/strict";
import {
  WATCH_CAP_FOUNDING,
  WATCH_CAP_FREE,
  addToWatchlist,
  emptyWatchlist,
  removeFromWatchlist,
  toggleWatchlist,
  watchCap,
} from "./watchlist.ts";

test("watchCap is 5 free and 12 founding/pro/lab", () => {
  assert.equal(watchCap("free"), WATCH_CAP_FREE);
  assert.equal(watchCap("pro"), WATCH_CAP_FOUNDING);
  assert.equal(watchCap("lab"), WATCH_CAP_FOUNDING);
  assert.equal(WATCH_CAP_FREE, 5);
  assert.equal(WATCH_CAP_FOUNDING, 12);
});

test("addToWatchlist dedupes and respects cap", () => {
  let state = emptyWatchlist();
  const first = addToWatchlist(state, ["ketamine", "alprazolam", "ketamine"], 5);
  assert.deepEqual(first.added, ["ketamine", "alprazolam"]);
  assert.equal(first.rejected.length, 0);
  state = first.state;

  const more = addToWatchlist(state, ["ethanol", "clozapine", "lorazepam", "fluoxetine", "sertraline"], 5);
  assert.equal(more.state.ids.length, 5);
  assert.ok(more.added.length >= 1);
  assert.ok(more.rejected.length >= 1);
  assert.ok(!more.state.ids.includes("ketamine") || more.state.ids[0] === "ketamine");
});

test("removeFromWatchlist drops id", () => {
  const state = { ids: ["ketamine", "alprazolam"] };
  assert.deepEqual(removeFromWatchlist(state, "ketamine").ids, ["alprazolam"]);
});

test("toggleWatchlist flips and rejects over cap", () => {
  let state = emptyWatchlist();
  const on = toggleWatchlist(state, "ketamine", 1);
  assert.equal(on.on, true);
  state = on.state;
  const off = toggleWatchlist(state, "ketamine", 1);
  assert.equal(off.on, false);
  state = off.state;
  state = addToWatchlist(state, ["ketamine"], 1).state;
  const reject = toggleWatchlist(state, "alprazolam", 1);
  assert.equal(reject.rejected, true);
  assert.equal(reject.on, false);
  assert.deepEqual(reject.state.ids, ["ketamine"]);
});

test("add ignores unknown and virtual ids", () => {
  const { added, state } = addToWatchlist(emptyWatchlist(), ["__smoke", "not-real", "ketamine"], 5);
  assert.deepEqual(added, ["ketamine"]);
  assert.deepEqual(state.ids, ["ketamine"]);
});
