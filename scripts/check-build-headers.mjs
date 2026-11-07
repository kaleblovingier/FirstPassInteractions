#!/usr/bin/env node
// @ts-check
/**
 * After `vite build`: fails unless .vercel/output/config.json carries the security
 * headers and redirects from scripts/vercel-routes.mjs, ahead of the filesystem
 * and the server function. A deploy without them would serve pages with no CSP.
 *   node scripts/check-build-headers.mjs [path/to/config.json]
 */
import { readFileSync } from "node:fs";
import { checkBuildConfig } from "./vercel-routes-check.mjs";

const path = process.argv[2] ?? ".vercel/output/config.json";
let config;
try {
  config = JSON.parse(readFileSync(path, "utf8"));
} catch (err) {
  console.error(`[headers] cannot read ${path}: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
const problems = checkBuildConfig(config);
if (problems.length) {
  for (const p of problems) console.error(`[headers] ${p}`);
  process.exit(1);
}
console.log(`[headers] ${path}: security headers and redirects are in place.`);
