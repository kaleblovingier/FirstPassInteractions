import test from "node:test";
import assert from "node:assert/strict";
import { warnSafe } from "./safe-warn";

test("warnSafe logs only the label and error class/code", () => {
  const calls: unknown[][] = [];
  const orig = console.warn;
  console.warn = (...a: unknown[]) => void calls.push(a);
  try {
    const e = Object.assign(new TypeError("candidate a=candidate:1 peer-1234 user@example.com"), { code: "ERR_ICE" });
    warnSafe("[p2p] addIceCandidate failed:", e);
    warnSafe("[p2p] signal failed after retries", new Error("POST https://x/signal?to=peer-9 failed"));
  } finally {
    console.warn = orig;
  }
  assert.deepEqual(calls, [
    ["[p2p] addIceCandidate failed:", "TypeError (ERR_ICE)"],
    ["[p2p] signal failed after retries", "Error"],
  ]);
  assert.ok(!JSON.stringify(calls).includes("peer-"));
  assert.ok(!JSON.stringify(calls).includes("@"));
});
