import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PINNED,
  clearUndo,
  emptyHistory,
  isTrayPinned,
  labelForIds,
  pinTray,
  popUndo,
  readHistory,
  rememberTray,
  sameTraySet,
  togglePinTray,
  unpinTray,
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

test("sameTraySet compares canonically regardless of order", () => {
  assert.equal(sameTraySet(["warfarin", "amiodarone"], ["amiodarone", "warfarin"]), true);
  assert.equal(sameTraySet(["warfarin", "warfarin"], ["warfarin"]), true);
  assert.equal(sameTraySet(["warfarin"], ["warfarin", "amiodarone"]), false);
  assert.equal(sameTraySet([], ["warfarin"]), false);
});

test("pinTray + order-insensitive isTrayPinned preserve display order and extras", () => {
  writeHistory(emptyHistory());
  const state = pinTray(["warfarin", "amiodarone"], { ketamineRoute: "oral" });
  assert.equal(state.pinned.length, 1);
  assert.deepEqual(state.pinned[0].ids, ["warfarin", "amiodarone"]);
  assert.equal(state.pinned[0].ketamineRoute, "oral");
  assert.equal(isTrayPinned(["warfarin", "amiodarone"]), true);
  assert.equal(isTrayPinned(["amiodarone", "warfarin"]), true);
  assert.equal(isTrayPinned(["warfarin"]), false);
  assert.equal(isTrayPinned([]), false);
  writeHistory(emptyHistory());
});

test("unpinTray removes matching canonical set and preserves others", () => {
  writeHistory(emptyHistory());
  pinTray(["warfarin", "amiodarone"]);
  pinTray(["ketamine", "alprazolam"]);
  const after = unpinTray(["amiodarone", "warfarin"]);
  assert.equal(after.pinned.length, 1);
  assert.deepEqual(after.pinned[0].ids, ["ketamine", "alprazolam"]);
  assert.equal(isTrayPinned(["warfarin", "amiodarone"]), false);
  assert.equal(isTrayPinned(["alprazolam", "ketamine"]), true);
  writeHistory(emptyHistory());
});

test("togglePinTray pins, unpins, and ignores empty trays", () => {
  writeHistory(emptyHistory());
  const empty = togglePinTray([]);
  assert.equal(empty.pinned, false);
  assert.equal(empty.state.pinned.length, 0);

  const first = togglePinTray(["simvastatin", "clarithromycin"]);
  assert.equal(first.pinned, true);
  assert.equal(isTrayPinned(["clarithromycin", "simvastatin"], first.state), true);

  const second = togglePinTray(["clarithromycin", "simvastatin"]);
  assert.equal(second.pinned, false);
  assert.equal(second.state.pinned.length, 0);
  writeHistory(emptyHistory());
});

test("pinTray bounds pinned trays to MAX_PINNED and dedupes re-pins", () => {
  writeHistory(emptyHistory());
  const pairs: [string, string][] = [
    ["warfarin", "amiodarone"],
    ["warfarin", "fluconazole"],
    ["simvastatin", "clarithromycin"],
    ["ketamine", "alprazolam"],
    ["sertraline", "tramadol"],
    ["metformin", "cimetidine"],
    ["digoxin", "verapamil"],
    ["lithium", "ibuprofen"],
    ["apixaban", "ketoconazole"],
    ["ondansetron", "haloperidol"],
  ];
  for (const pair of pairs) pinTray(pair);
  const h = readHistory();
  assert.equal(h.pinned.length, MAX_PINNED);
  assert.deepEqual(h.pinned[0].ids, ["ondansetron", "haloperidol"]);
  // Oldest two trays were evicted once MAX_PINNED was exceeded.
  assert.equal(isTrayPinned(["warfarin", "amiodarone"], h), false);
  assert.equal(isTrayPinned(["warfarin", "fluconazole"], h), false);
  // Re-pinning an existing pair in reversed order keeps count at MAX_PINNED and moves it first.
  const repinned = pinTray(["ketoconazole", "apixaban"]);
  assert.equal(repinned.pinned.length, MAX_PINNED);
  assert.deepEqual(repinned.pinned[0].ids, ["ketoconazole", "apixaban"]);
  writeHistory(emptyHistory());
});

test("rememberTray, clearUndo, and popUndo preserve pinned trays", () => {
  writeHistory(emptyHistory());
  pinTray(["warfarin", "amiodarone"]);
  rememberTray(["ketamine", "alprazolam"]);
  assert.equal(isTrayPinned(["amiodarone", "warfarin"]), true);
  const popped = popUndo();
  assert.deepEqual(popped?.ids, ["ketamine", "alprazolam"]);
  assert.equal(isTrayPinned(["warfarin", "amiodarone"]), true);
  rememberTray(["sertraline", "tramadol"]);
  const cleared = clearUndo();
  assert.equal(cleared.undo, null);
  assert.equal(isTrayPinned(["warfarin", "amiodarone"], cleared), true);
  writeHistory(emptyHistory());
});

test("readHistory safely defaults missing pinned field from legacy localStorage JSON", () => {
  const prevDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
  try {
    mockStorage.setItem(
      TRAY_HISTORY_KEY,
      JSON.stringify({
        undo: { ids: ["warfarin"], ts: 10 },
        recent: [{ ids: ["ketamine", "alprazolam"], ts: 20 }],
      }),
    );
    const state = readHistory();
    assert.deepEqual(state.pinned, []);
    assert.deepEqual(state.undo?.ids, ["warfarin"]);
    assert.deepEqual(state.recent[0]?.ids, ["ketamine", "alprazolam"]);
  } finally {
    if (prevDescriptor) {
      Object.defineProperty(globalThis, "localStorage", prevDescriptor);
    } else {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  }
});
