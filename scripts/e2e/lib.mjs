// Shared helpers for the end-to-end tests (Playwright against a local build).
import { chromium } from "playwright";

export const BASE = process.env.E2E_BASE;
let fails = 0;
export function check(ok, msg) {
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
  // Actions logs need a login; annotations are public, so a failure can be read without one.
  if (!ok && process.env.GITHUB_ACTIONS) console.log(`::error::${msg}`);
}
export const failures = () => fails;

export async function launch() {
  return chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ["--no-sandbox"] });
}
export async function freshPage(browser, { width = 1280 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  // A slow CI runner can take longer than the default 30 seconds to reach network idle.
  ctx.setDefaultNavigationTimeout(90_000);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(new URL("/", BASE).href, { waitUntil: "networkidle" });
  // Typing before React attaches changes the input without updating the desk, which fails the journey on a slow runner.
  await page.waitForFunction(() => {
    const input = document.querySelector("#drug-search");
    return input && Object.keys(input).some((k) => k.startsWith("__reactProps"));
  }, null, { timeout: 90_000 });
  return { ctx, page, errors };
}
export async function addDrug(page, query) {
  const input = page.locator("#drug-search");
  await input.click();
  await input.fill(query);
  await page.locator('[id^="drug-option-"]').first().waitFor({ timeout: 5000 });
  await input.press("Enter");
  await page.waitForTimeout(300);
}
export const chips = (page) => page.locator('button[title="Remove from regimen"]');
