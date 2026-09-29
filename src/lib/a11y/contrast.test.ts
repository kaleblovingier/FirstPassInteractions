/**
 * WCAG 2.1 AA 1.4.3: text tokens must reach 4.5:1 on every background token
 * they sit on. Guards src/styles.css so a palette tweak can't quietly regress.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

function token(name: string): string {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `missing --color-${name}`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = ["fg", "muted", "subtle", "accent", "danger", "warn"];
const BACKGROUNDS = ["bg", "bg-sunken", "surface", "accent-soft", "danger-soft", "warn-soft"];

for (const fg of TEXT) {
  test(`--color-${fg} reaches 4.5:1 on every background`, () => {
    for (const bg of BACKGROUNDS) {
      const ratio = contrast(token(fg), token(bg));
      assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
    }
  });
}

test("--color-accent-fg reaches 4.5:1 on --color-accent", () => {
  assert.ok(contrast(token("accent-fg"), token("accent")) >= 4.5);
});
