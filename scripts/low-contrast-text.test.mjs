import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import test from "node:test";

import {
  contrast,
  loadTailwindPalette,
  loadThemeTokens,
  over,
  pageBackgrounds,
} from "./contrast.mjs";
import { fix, replacementFor, scan, sourceFiles } from "./low-contrast-text.mjs";

const tokens = loadThemeTokens();
const palette = loadTailwindPalette();
const backgrounds = Object.values(pageBackgrounds(tokens));
const worstOnPage = (rgb) => Math.min(...backgrounds.map((bg) => contrast(rgb, bg)));
const worstOnTint = (rgb, hue) =>
  Math.min(
    ...backgrounds.flatMap((bg) =>
      [0.05, 0.1, 0.15, 0.2].map((a) => contrast(rgb, over(palette[`${hue}-500`], bg, a))),
    ),
  );

test("text tokens pass AA (4.5:1) on every page background", () => {
  for (const name of [
    "fg",
    "muted",
    "subtle",
    "accent",
    "danger",
    "warn",
    "ok",
    "info",
    "success",
    "warning",
  ]) {
    assert.ok(tokens[name], `--color-${name} is declared in @theme`);
    assert.ok(
      worstOnPage(tokens[name]) >= 4.5,
      `${name} is ${worstOnPage(tokens[name]).toFixed(2)}:1`,
    );
  }
});

test("every replacement passes AA on the page and on its own hue's tinted fills", () => {
  const families = {
    emerald: "success",
    green: "success",
    lime: "success",
    amber: "warning",
    yellow: "warning",
    red: "danger",
    rose: "danger",
  };
  for (const [hue, token] of Object.entries(families)) {
    assert.equal(replacementFor(hue, 500), token);
    assert.ok(
      worstOnTint(tokens[token], hue) >= 4.5,
      `${token} on ${hue} tints: ${worstOnTint(tokens[token], hue).toFixed(2)}`,
    );
  }
  for (const hue of [
    "orange",
    "cyan",
    "sky",
    "teal",
    "blue",
    "purple",
    "violet",
    "pink",
    "fuchsia",
    "indigo",
  ]) {
    const to = replacementFor(hue, 400);
    assert.ok(
      worstOnPage(palette[to]) >= 4.5,
      `${to} on page: ${worstOnPage(palette[to]).toFixed(2)}`,
    );
    assert.ok(
      worstOnTint(palette[to], hue) >= 4.5,
      `${to} on ${hue} tints: ${worstOnTint(palette[to], hue).toFixed(2)}`,
    );
  }
});

test("scan maps text, skips icons, dark: variants and SVG shapes", () => {
  const src = [
    `import { Flame } from "lucide-react";`,
    `const a = <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">ok</span>;`,
    `const b = <Flame className="size-4 text-amber-500" />;`,
    `const c = <text className="fill-cyan-600">x</text>;`,
    `const d = <circle className="fill-cyan-600" />;`,
    `const e = <p className={cn(n > 3 ? "hover:text-rose-500" : "text-muted/80")}>y</p>;`,
  ].join("\n");
  assert.deepEqual(
    scan(src).map((f) => `${f.from}>${f.to}`),
    [
      "text-emerald-600>text-success",
      "fill-cyan-600>fill-cyan-800",
      "hover:text-rose-500>hover:text-danger",
      "text-muted/80>text-subtle",
    ],
  );
  assert.match(fix(src), /text-success dark:text-emerald-400/);
  assert.match(fix(src), /<Flame className="size-4 text-amber-500"/);
});

test("no low-contrast palette text left in src", () => {
  const offenders = sourceFiles().flatMap((file) =>
    scan(readFileSync(file, "utf8")).map(
      (f) => `${relative(process.cwd(), file)}:${f.line} ${f.from}`,
    ),
  );
  assert.deepEqual(offenders, [], "run node scripts/low-contrast-text.mjs --fix");
});
