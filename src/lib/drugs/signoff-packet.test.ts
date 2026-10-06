/**
 * The PharmD sign-off packet is generated from the engine; keep it in sync.
 * Scans every catalog pair (~20 s). Regenerate with:
 *   npx --no-install tsx scripts/signoff-packet.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PACKET_PATH, collect, renderPacket } from "../../../scripts/signoff-packet.ts";

test("signoff packet script runs and docs/clinical-review/signoff-packet.md is in sync", () => {
  const data = collect();
  assert.ok(data.rules.length > 0);
  assert.ok(data.rules.every((r) => r.severity === "contraindicated" || r.severity === "major"));
  const md = renderPacket(data);
  assert.equal(readFileSync(PACKET_PATH, "utf8").replace(/\r\n/g, "\n"), md.replace(/\r\n/g, "\n"), "packet is stale; re-run scripts/signoff-packet.ts");
  assert.match(md, /no clinician has reviewed this content yet/);
  assert.match(md, /Known open questions/);
  assert.doesNotMatch(md, /clinical decision support/i);
  assert.doesNotMatch(md, /\b\d+(\.\d+)?\s*(mg|mcg)\b/i);
});
