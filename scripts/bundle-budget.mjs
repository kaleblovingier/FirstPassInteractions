#!/usr/bin/env node
/**
 * Fails when the client entry chunk (and the catalog chunk every desk visit
 * loads) grows past the measured size plus a margin. Run after the build:
 *   node scripts/bundle-budget.mjs
 * Measured 2026-11: entry 523066 B raw / 165945 B gzip; catalog 536903 B raw
 * / 149707 B gzip. Entry limit is +10%. The catalog gets +20% because new
 * drugs are added to it; raise a limit deliberately, with the reason.
 */
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import assert from "node:assert/strict";

const DIR = ".vercel/output/static/assets";
const BUDGET = {
  index: { raw: 575_400, gzip: 182_500 },
  catalog: { raw: 644_300, gzip: 179_700 },
};
const files = readdirSync(DIR);
for (const [name, limit] of Object.entries(BUDGET)) {
  // The entry is the largest index-*.js; catalog-*.js is the catalog chunk, not catalog-clinic etc.
  const hits = files
    .filter((f) => new RegExp(`^${name}-[A-Za-z0-9_-]+[.]js$`).test(f))
    .map((f) => ({ f, buf: readFileSync(join(DIR, f)) }))
    .sort((a, b) => b.buf.length - a.buf.length);
  assert.ok(hits.length, `no ${name}-*.js chunk in ${DIR}; build first`);
  const { f, buf } = hits[0];
  const gz = gzipSync(buf).length;
  console.log(`${f}: ${buf.length} B raw (limit ${limit.raw}), ${gz} B gzip (limit ${limit.gzip})`);
  assert.ok(buf.length <= limit.raw, `${f} raw ${buf.length} exceeds ${limit.raw}`);
  assert.ok(gz <= limit.gzip, `${f} gzip ${gz} exceeds ${limit.gzip}`);
}
