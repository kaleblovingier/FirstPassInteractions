#!/usr/bin/env node
/**
 * Runs every test in the repo on Node 20+:
 *   scripts/**\/*.test.mjs with node --test
 *   src/**\/*.test.ts(x)   with tsx --test (TypeScript, path aliases)
 * Node 20's --test takes no globs and has no type stripping, so we list files ourselves.
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

function find(dir, re) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && re.test(e.name))
    .map((e) => join(e.parentPath ?? e.path, e.name))
    .filter((p) => !p.includes("node_modules"))
    .sort();
}

const require = createRequire(import.meta.url);

function resolveTsx() {
  if (process.env.TSX_BIN) return { cmd: process.env.TSX_BIN, args: [] };
  try {
    const packageJsonPath = require.resolve("tsx/package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const bin = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.tsx;
    if (!bin) throw new Error("tsx package.json does not declare a CLI");
    return { cmd: process.execPath, args: [join(dirname(packageJsonPath), bin)] };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Unable to resolve tsx for TypeScript tests: ${detail}`);
    console.error("Run npm install to restore dev dependencies, or set TSX_BIN to a tsx executable.");
    return null;
  }
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

let status = 0;
if (js.length) status ||= run(process.execPath, ["--test", ...js]);
if (ts.length) {
  const tsx = resolveTsx();
  status = (tsx ? run(tsx.cmd, [...tsx.args, "--test", ...ts]) : 1) || status;
}
console.log(`\nran ${js.length} script test files and ${ts.length} TypeScript test files`);
process.exit(status);
