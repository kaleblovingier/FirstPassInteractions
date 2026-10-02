/**
 * Keyboard focus and the 640px header wrap.
 * The focus outline has to stay unlayered so it wins over Tailwind's
 * focus-visible:outline-none, and the tab bar has to keep wrapping at 640px
 * (a 1280px window at 200% zoom).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../../components/desk/app.tsx", import.meta.url), "utf8");

test("focus outline is unlayered and uses the accent color", () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-accent\)/);
  assert.ok(css.lastIndexOf(":focus-visible") > css.lastIndexOf("@layer"));
});

test("tab bar wraps below the md breakpoint", () => {
  const nav = app.slice(app.indexOf('aria-label="Main navigation"'), app.indexOf("</nav>"));
  assert.equal(nav.includes("sm:flex-nowrap"), false);
  assert.equal(nav.includes("md:flex-nowrap"), true);
});
