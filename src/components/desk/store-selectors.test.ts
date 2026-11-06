/**
 * A zustand 5 selector that builds a new object or array on every read loops
 * until React throws error 185, which takes down the whole desk. The Resources
 * station did this and crashed every desk that opened on it. Node has no DOM to
 * mount it in, so this guards the source.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

test("no useDesk selector builds a new object or array without useShallow", () => {
  const bad = walk("src")
    .filter((p) => /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p))
    .filter((p) => /useDesk\(\(\w+\) => (\(\{|\[)/.test(readFileSync(p, "utf8")));
  assert.deepEqual(bad, []);
});

test("the Resources station reads the desk through useShallow", () => {
  const src = readFileSync("src/components/desk/resource-navigator.tsx", "utf8");
  assert.match(src, /useDesk\(useShallow\(\(s\) => \(\{/);
});
