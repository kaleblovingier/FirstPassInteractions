/**
 * Stamps public/sw.js with a build id so every deploy ships a new service worker.
 *
 * The worker names its caches after VERSION. A new VERSION installs a new worker,
 * which re-caches what the reader had and deletes the old caches, so stale hashed
 * assets and pages do not pile up across deploys. The id is a hash of the client
 * build's file names (which carry content hashes) and of sw.js itself, so it only
 * changes when the shipped files or the worker change.
 *
 * In dev the token stays in place and the worker runs as "fp-offline-__FP_SW_BUILD__".
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SW_BUILD_TOKEN = "__FP_SW_BUILD__";
export const SW_FILE = "sw.js";

/** 12 hex characters from the sorted output file names and the worker source. */
export function swBuildId(fileNames, swSource) {
  const h = createHash("sha256");
  for (const name of [...new Set(fileNames)].sort()) h.update(`${name}\n`);
  h.update("\0");
  h.update(swSource);
  return h.digest("hex").slice(0, 12);
}

/** Replace the build token. Throws when the worker has no token, so a build cannot ship an unversioned worker. */
export function stampServiceWorker(source, id) {
  if (!/^[0-9a-z-]{1,40}$/.test(id)) throw new Error(`[sw] bad build id: ${id}`);
  if (!source.includes(SW_BUILD_TOKEN)) throw new Error(`[sw] ${SW_FILE} has no ${SW_BUILD_TOKEN} token to stamp`);
  return source.split(SW_BUILD_TOKEN).join(id);
}

/**
 * Vite plugin: once the client build has written its files, write the stamped
 * <outDir>/sw.js from public/sw.js. With Nitro the public/ copy happens later
 * and skips files that already exist, so the stamped worker is the one shipped.
 * Other environments (ssr, nitro) are skipped.
 */
export function swVersionPlugin() {
  let root = process.cwd();
  return {
    name: "firstpass:sw-version",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    writeBundle(options, bundle) {
      const env = this.environment?.name;
      if (env && env !== "client") return;
      const dir = options.dir;
      if (!dir) return;
      const src = join(root, "public", SW_FILE);
      if (!existsSync(src)) return;
      const source = readFileSync(src, "utf8");
      const id = swBuildId(Object.keys(bundle), source);
      writeFileSync(join(dir, SW_FILE), stampServiceWorker(source, id));
      console.log(`[sw] stamped ${SW_FILE} as fp-offline-${id}`);
    },
  };
}
