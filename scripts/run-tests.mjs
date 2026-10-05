#!/usr/bin/env node
/**
 * Runs every test in the repo on Node 20+:
 *   scripts/**\/*.test.mjs with node --test
 *   src/**\/*.test.ts(x)   with tsx --test (TypeScript, path aliases)
 * Node 20's --test takes no globs and has no type stripping, so we list files ourselves.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function find(dir, re) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && re.test(e.name))
    .map((e) => join(e.parentPath ?? e.path, e.name))
    .filter((p) => !p.includes("node_modules"))
    .sort();
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32" && cmd !== process.execPath,
  });
  return r.status ?? 1;
}

const js = find("scripts", /\.test\.mjs$/);
const ts = find("src", /\.test\.tsx?$/);
const tsx = process.env.TSX_BIN || join("node_modules", ".bin", "tsx");

let status = 0;
if (js.length) status ||= run(process.execPath, ["--test", ...js]);
if (ts.length) status = run(tsx, ["--test", ...ts]) || status;
console.log(`\nran ${js.length} script test files and ${ts.length} TypeScript test files`);
process.exit(status);
