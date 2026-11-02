import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The live pack's `reason` names the sources that failed (live.server.ts partialReason).
// Hiding it when the label landed made a failed shortage or recall pull look like "none on file".
test("FDA panel shows a partial live-source failure even when the label came back", () => {
  const s = readFileSync("src/components/desk/dossier.tsx", "utf8");
  assert.match(s, /\{pack\?\.ok && pack\.reason \? <p/);
  assert.doesNotMatch(s, /pack\?\.reason && !label/);
});
