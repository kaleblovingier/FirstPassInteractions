#!/usr/bin/env node
/**
 * Finds Tailwind palette text colours that fall under WCAG AA (4.5:1) on the app's light paper
 * surfaces, and maps each to a colour that passes there and on that hue's tinted badge fills
 * (hue-500/5 to /20 over every page background).
 *
 *   node scripts/low-contrast-text.mjs          # list offenders, exit 1 if any
 *   node scripts/low-contrast-text.mjs --fix    # rewrite them in place
 *
 * Also flags faded muted text (text-muted/80), which drops the muted token under 4.5:1.
 *
 * Semantic families use theme tokens (src/styles.css): green -> success, amber/yellow -> warning,
 * red/rose -> danger. Categorical hues keep their hue and move to the first shade that passes.
 *
 * Not touched:
 *   - dark: variants. The app has a single light theme; src/styles.css scopes dark: to an explicit
 *     [data-theme="dark"] opt-in that nothing sets, so those classes never apply.
 *   - lucide icons (<Flame className="text-amber-500" />). They sit beside a text label and carry no
 *     information of their own; 1.4.3 covers text. Icon-only controls get a text name instead.
 *   - fill- on SVG shapes (only fill- on <text>/<tspan> is text).
 *   - -50 shades, which this codebase only uses as text on solid dark fills.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SEMANTIC = {
  emerald: "success",
  green: "success",
  lime: "success",
  amber: "warning",
  yellow: "warning",
  red: "danger",
  rose: "danger",
};
/** Highest failing shade per categorical hue, and the shade it moves to. */
const CATEGORICAL = {
  orange: [700, 800],
  cyan: [700, 800],
  sky: [700, 800],
  teal: [700, 800],
  blue: [700, 800],
  purple: [700, 800],
  violet: [700, 800],
  pink: [700, 800],
  fuchsia: [700, 800],
  indigo: [600, 700],
};
/** Highest shade of a semantic hue that still fails somewhere (700 fails on the /20 tints). */
const SEMANTIC_MAX = 700;

export function replacementFor(hue, shade) {
  if (shade < 100) return null;
  if (SEMANTIC[hue]) return shade <= SEMANTIC_MAX ? SEMANTIC[hue] : null;
  const cat = CATEGORICAL[hue];
  if (cat) return shade <= cat[0] ? `${hue}-${cat[1]}` : null;
  return null;
}

const HUES = [...Object.keys(SEMANTIC), ...Object.keys(CATEGORICAL)].join("|");
const TOKEN = new RegExp(
  `(?<![\\w-])((?:[a-z-]+:)*)(text|fill)-(${HUES})-(\\d{2,3})(\\/\\d+)?(?![\\w/-])`,
  "g",
);

/** text-muted/80 and friends: muted at 80% is 3.5:1, at 60% 2.4:1. Solid subtle is 4.5:1. */
const FADED = /(?<![\w-])((?:[a-z-]+:)*)text-(muted|subtle|muted-foreground)\/(\d+)(?![\w/-])/g;

function lucideNames(src) {
  const names = new Set();
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g)) {
    for (const part of m[1].split(",")) {
      const local = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (local) names.add(local);
    }
  }
  return names;
}

/** The JSX tag whose opening tag contains `index`, if any. */
function enclosingTag(src, index) {
  const before = src.slice(Math.max(0, index - 600), index);
  const open = [...before.matchAll(/<([A-Za-z][\w.]*)/g)].pop();
  if (!open) return null;
  // Strip arrows and comparisons, then any remaining '>' means the tag closed before the match.
  const between = before.slice(open.index + open[0].length).replace(/=>|>=|\s>\s/g, "");
  return between.includes(">") ? null : open[1];
}

export function scan(src) {
  const icons = lucideNames(src);
  const findings = [];
  for (const m of src.matchAll(TOKEN)) {
    const [whole, variants, prop, hue, shadeText, alpha = ""] = m;
    if (variants.split(":").includes("dark")) continue;
    const to = replacementFor(hue, Number(shadeText));
    if (!to) continue;
    const tag = enclosingTag(src, m.index);
    if (tag && (icons.has(tag) || /\.icon$|Icon$/.test(tag))) continue;
    // fill- only colours text inside SVG <text>/<tspan>; on shapes it is a graphic, not text.
    if (prop === "fill" && tag !== "text" && tag !== "tspan") continue;
    const line = src.slice(0, m.index).split("\n").length;
    findings.push({
      index: m.index,
      length: whole.length,
      from: whole,
      to: `${variants}${prop}-${to}${alpha}`,
      line,
    });
  }
  for (const m of src.matchAll(FADED)) {
    const [whole, variants] = m;
    if (variants.split(":").includes("dark")) continue;
    const tag = enclosingTag(src, m.index);
    if (tag && (icons.has(tag) || /\.icon$|Icon$/.test(tag))) continue;
    const line = src.slice(0, m.index).split("\n").length;
    findings.push({
      index: m.index,
      length: whole.length,
      from: whole,
      to: `${variants}text-subtle`,
      line,
    });
  }
  return findings.sort((a, b) => a.index - b.index);
}

export function fix(src) {
  let out = src;
  for (const f of scan(src).reverse())
    out = out.slice(0, f.index) + f.to + out.slice(f.index + f.length);
  return out;
}

export function sourceFiles(dir = join(root, "src")) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
    .map((e) => join(e.parentPath ?? e.path, e.name))
    .sort();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const write = process.argv.includes("--fix");
  let total = 0;
  for (const file of sourceFiles()) {
    const src = readFileSync(file, "utf8");
    const found = scan(src);
    if (!found.length) continue;
    total += found.length;
    if (write) writeFileSync(file, fix(src));
    for (const f of found) console.log(`${relative(root, file)}:${f.line}  ${f.from} -> ${f.to}`);
  }
  console.log(
    `${total} low-contrast text class${total === 1 ? "" : "es"}${write ? " rewritten" : ""}`,
  );
  if (total && !write) process.exit(1);
}
