import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyHistory,
  labelForIds,
  rememberTray,
  popUndo,
  readHistory,
  writeHistory,
  TRAY_HISTORY_KEY,
} from "./tray-history.ts";

test("labelForIds joins names", () => {
  assert.match(labelForIds(["ketamine", "alprazolam"]), /Ketamine/);
  assert.equal(labelForIds([]), "Empty tray");
});

test("rememberTray + popUndo round-trips", () => {
  writeHistory(emptyHistory());
  rememberTray(["ketamine", "alprazolam"]);
  const snap = popUndo();
  assert.ok(snap);
  assert.deepEqual(snap!.ids, ["ketamine", "alprazolam"]);
  assert.equal(popUndo(), null);
  writeHistory(emptyHistory());
  if (typeof localStorage !== "undefined") localStorage.removeItem(TRAY_HISTORY_KEY);
});

test("recent dedupes identical trays", () => {
  writeHistory(emptyHistory());
  rememberTray(["ketamine"]);
  rememberTray(["ketamine"]);
  const h = readHistory();
  assert.equal(h.recent.length, 1);
  writeHistory(emptyHistory());
});
