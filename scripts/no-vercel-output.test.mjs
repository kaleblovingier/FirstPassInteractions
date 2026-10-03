/**
 * Guard: .vercel/output must never be tracked. Vercel serves a committed
 * Build Output API folder as prebuilt and skips building from source.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test(".gitignore lists .vercel so local build output stays untracked", async () => {
  const gi = await readFile(join(root, ".gitignore"), "utf8");
  assert.match(gi, /^\.vercel\s*$/m, ".gitignore must contain a .vercel line");
});

test("no .vercel/output paths are tracked in git", () => {
  const out = execFileSync("git", ["ls-files", "--", ".vercel"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  assert.equal(
    out,
    "",
    `tracked .vercel paths (do not force-add; Vercel will serve them as prebuilt):\n${out}`,
  );
});
