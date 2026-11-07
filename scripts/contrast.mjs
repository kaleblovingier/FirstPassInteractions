#!/usr/bin/env node
/**
 * WCAG 2.x contrast helpers for the colour tokens in src/styles.css and the Tailwind palette.
 *
 *   node scripts/contrast.mjs emerald-600 ok "#80541b"   # ratios against every page background
 *
 * Tailwind v4 ships its palette as oklch(); we convert to sRGB (clamped, like the browser does
 * for out-of-gamut colours) and use the WCAG relative-luminance formula.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export function oklchToRgb(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((x) => {
    const c = Math.min(1, Math.max(0, x));
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(v * 255);
  });
}

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function luminance([r, g, b]) {
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Alpha-composite fg over bg (for tinted badge fills such as bg-emerald-500/10). */
export function over(fg, bg, alpha) {
  return fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
}

/** Tailwind's default palette, name ("emerald-600") to sRGB. */
export function loadTailwindPalette() {
  const css = readFileSync(
    join(dirname(require.resolve("tailwindcss/package.json")), "theme.css"),
    "utf8",
  );
  const out = {};
  for (const m of css.matchAll(
    /--color-([a-z]+-\d+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/g,
  )) {
    out[m[1]] = oklchToRgb(Number(m[2]) / 100, Number(m[3]), Number(m[4]));
  }
  return out;
}

/** Hex tokens declared in the @theme block of src/styles.css, name ("ok") to sRGB. */
export function loadThemeTokens(cssPath = join(here, "..", "src", "styles.css")) {
  const css = readFileSync(cssPath, "utf8");
  const theme = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const out = {};
  for (const m of theme.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g))
    out[m[1]] = hexToRgb(m[2]);
  return out;
}

/** The light surfaces text sits on across the app (the app has one light theme). */
export function pageBackgrounds(tokens = loadThemeTokens()) {
  return {
    bg: tokens.bg,
    "bg-sunken": tokens["bg-sunken"],
    surface: tokens.surface,
    "surface-2": tokens["surface-2"],
    white: [255, 255, 255],
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const palette = loadTailwindPalette();
  const tokens = loadThemeTokens();
  const bgs = pageBackgrounds(tokens);
  for (const name of process.argv.slice(2)) {
    const rgb = name.startsWith("#") ? hexToRgb(name) : (tokens[name] ?? palette[name]);
    if (!rgb) {
      console.log(`${name}: unknown colour`);
      continue;
    }
    const cells = Object.entries(bgs).map(([k, v]) => `${k} ${contrast(rgb, v).toFixed(2)}`);
    const worst = Math.min(...Object.values(bgs).map((v) => contrast(rgb, v)));
    console.log(
      `${name.padEnd(14)} worst ${worst.toFixed(2)} ${worst >= 4.5 ? "AA" : "FAIL"} | ${cells.join(" | ")}`,
    );
  }
}
