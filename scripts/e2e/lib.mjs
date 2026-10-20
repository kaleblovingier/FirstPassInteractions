// Shared helpers for the end-to-end tests (Playwright against a local build).
import { chromium } from "playwright";

export const BASE = process.env.E2E_BASE;
let fails = 0;
export function check(ok, msg) { if (!ok) fails++; console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); }
export const failures = () => fails;

export async function launch() {
  return chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ["--no-sandbox"] });
}
export async function freshPage(browser, { width = 1280 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(new URL("/", BASE).href, { waitUntil: "networkidle" });
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
