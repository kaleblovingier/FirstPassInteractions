/**
 * Editorial Clinical UI regression guard.
 * FirstPass uses a crisp Clinical Monograph + Reference Laboratory palette (src/styles.css):
 * no purple/indigo/violet/fuchsia/cyan/pink utility classes, no decorative bg-gradient-to-*,
 * and no backdrop-blur-* glassmorphism in shipped React components.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const COMPONENTS_DIR = join(ROOT, "src", "components");

const DISALLOWED_PATTERNS: readonly { label: string; re: RegExp }[] = [
  {
    label: "banned neon/slop hue utility",
    re: /\b(?:bg|text|border(?:-[trblxyse])?|ring|from|via|to|fill|stroke|outline)-(?:purple|indigo|violet|fuchsia|cyan|pink)-\d+/g,
  },
  {
    label: "decorative CSS gradient utility",
    re: /\bbg-gradient-to-/g,
  },
  {
    label: "backdrop-blur glassmorphism utility",
    re: /\bbackdrop-blur(?:-[a-z0-9]+)?\b/g,
  },
  {
    label: "decorative Sparkles icon",
    re: /\bSparkles\b/g,
  },
];

function walkTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsxFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out.sort();
}

function scanSource(src: string): { line: number; label: string; match: string }[] {
  const hits: { line: number; label: string; match: string }[] = [];
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const text = lines[i] ?? "";
    for (const { label, re } of DISALLOWED_PATTERNS) {
      re.lastIndex = 0;
      for (const m of text.matchAll(re)) {
        hits.push({ line: i + 1, label, match: m[0] });
      }
    }
  }
  return hits;
}

test("editorial UI guard: catches disallowed palettes, gradients, and backdrop-blur", () => {
  assert.equal(scanSource('className="bg-purple-500/15 text-indigo-700"').length, 2);
  assert.equal(scanSource('className="border-l-4 border-l-purple-500 ring-violet-400"').length, 2);
  assert.equal(scanSource('className="bg-cyan-500 text-pink-800 border-fuchsia-300"').length, 3);
  assert.equal(scanSource('className="bg-gradient-to-r from-surface to-bg"').length, 1);
  assert.equal(scanSource('className="bg-bg/95 backdrop-blur-sm"').length, 1);
  assert.equal(scanSource('className="bg-ink/70 backdrop-blur"').length, 1);
  assert.equal(scanSource('<Sparkles className="size-4" />').length, 1);
  assert.equal(
    scanSource(
      'className="border-b border-border bg-surface text-fg bg-accent-soft text-accent text-info text-warn text-danger text-ok"',
    ).length,
    0,
  );
});

test("editorial UI guard: shipped src/components/**/*.tsx contain zero banned hues, gradients, or backdrop-blur", () => {
  const files = walkTsxFiles(COMPONENTS_DIR);
  assert.ok(files.length > 0, "Expected at least one .tsx component under src/components/");
  const violations: string[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    const hits = scanSource(readFileSync(file, "utf8"));
    for (const hit of hits) {
      violations.push(`${rel}:${hit.line} [${hit.label}] ${hit.match}`);
    }
  }
  assert.deepEqual(violations, []);
});
