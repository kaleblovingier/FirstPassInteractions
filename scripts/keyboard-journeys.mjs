#!/usr/bin/env node
/**
 * Keyboard-only journey checks (Tab, Shift+Tab, Enter, Space, Escape, arrows).
 * Usage: node scripts/keyboard-journeys.mjs <baseUrl>   (app must already be running)
 * Env: CHROME=/path/to/chrome (defaults to Playwright's bundled Chromium)
 * Exits non-zero when any check fails. Never submits payment or recovery forms.
 */
import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:8080";
const failures = [];
const notes = [];
const check = (ok, msg) => {
  (ok ? notes : failures).push(msg);
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
};

const browser = await chromium.launch({
  ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}),
  args: ["--no-sandbox"],
});

async function fresh(path, width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
  return { ctx, page };
}

/** Describe the focused element and whether a focus indicator is painted. */
const focusInfo = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { body: true, desc: "BODY", visible: false };
    const cs = getComputedStyle(el);
    const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
    const ring = cs.boxShadow && cs.boxShadow !== "none";
    const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").trim().slice(0, 40);
    const r = el.getBoundingClientRect();
    return {
      body: false,
      desc: `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${name}"`,
      visible: outline || ring,
      onscreen: r.width > 0 && r.height > 0,
      inDialog: Boolean(el.closest('[role="dialog"],[role="alertdialog"],dialog')),
    };
  });

/** Tab until the focused element matches pred; checks every stop has a visible indicator. */
async function tabTo(page, pred, label, max = 80, key = "Tab") {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    const f = await focusInfo(page);
    if (!f.body && !f.visible) check(false, `${label}: focus indicator missing on ${f.desc}`);
    if (await page.evaluate(pred)) return true;
  }
  check(false, `${label}: never reached target within ${max} ${key} presses`);
  return false;
}

const liveText = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[aria-live]:not([aria-live="off"]),[role="status"],[role="alert"],[role="log"]')]
      .map((n) => n.textContent.trim())
      .join(" | "),
  );

// 1. Search and add two drugs, remove one, Escape behavior.
{
  const { ctx, page } = await fresh("/");
  await tabTo(page, () => document.activeElement?.id === "drug-search", "search");
  await page.keyboard.type("clarithro");
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  const before = await liveText(page);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  let f = await focusInfo(page);
  check(f.desc.startsWith("input#drug-search"), `search: focus stays in search after adding (got ${f.desc})`);
  const after = await liveText(page);
  check(/clarithromycin/i.test(after) && after !== before, "search: adding a drug is announced in a live region");
  await page.keyboard.type("ketamine");
  await page.waitForTimeout(300);
  // Tab from the combobox must not walk through every option.
  await page.keyboard.press("Tab");
  f = await focusInfo(page);
  check(!f.desc.includes("button#drug-option-"), `search: Tab leaves the listbox options out of the tab order (got ${f.desc})`);
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  check((await page.locator("h1").count()) === 1, "pair: result has one h1 after adding two drugs");
  await page.keyboard.type("xyz");
  await page.keyboard.press("Escape");
  f = await focusInfo(page);
  check(!f.body, `search: Escape closes the list without dropping focus (got ${f.desc})`);
  // Remove a chip with the keyboard.
  const chip = page.locator('button[title="Remove from regimen"]').first();
  await chip.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  f = await focusInfo(page);
  check(!f.body, `chips: focus has somewhere to go after removing a drug (got ${f.desc})`);
  await ctx.close();
}

// 2. Switch views by keyboard; nav reflects the current view.
{
  const { ctx, page } = await fresh("/");
  for (const name of ["Library", "Sources", "Enzyme map", "Learn", "Cases", "Compare", "Safety", "Find help", "Desk"]) {
    const btn = page.getByRole("button", { name, exact: true }).first();
    await btn.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    const f = await focusInfo(page);
    check(!f.body, `views: focus kept after opening ${name} (got ${f.desc})`);
    const cur = await btn.evaluate((b) => b.getAttribute("aria-current") || b.getAttribute("aria-pressed"));
    check(cur === "page" || cur === "true", `views: ${name} nav button exposes the current view (aria-current/pressed=${cur})`);
  }
  await ctx.close();
}

// 3. Dialogs: Unlock / Plans open, trap focus, Escape closes, focus returns.
for (const name of ["Unlock", "Plans"]) {
  const { ctx, page } = await fresh("/");
  const btn = page.getByRole("button", { name, exact: true }).first();
  await btn.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  const dialog = await page.locator('[role="dialog"],[role="alertdialog"]').count();
  if (!dialog) {
    check(true, `${name}: opens an in-page view (no dialog)`);
    await ctx.close();
    continue;
  }
  let f = await focusInfo(page);
  check(f.inDialog, `${name}: focus moves into the dialog (got ${f.desc})`);
  let escaped = false;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press(i % 2 ? "Shift+Tab" : "Tab");
    const g = await focusInfo(page);
    if (!g.inDialog) escaped = true;
    if (!g.body && !g.visible) check(false, `${name}: focus indicator missing on ${g.desc}`);
  }
  check(!escaped, `${name}: Tab/Shift+Tab stay inside the open dialog`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  f = await focusInfo(page);
  const back = await btn.evaluate((b) => b === document.activeElement);
  check(back, `${name}: Escape closes and returns focus to the opener (got ${f.desc})`);
  await ctx.close();
}

// 4. Library filters.
{
  const { ctx, page } = await fresh("/");
  await page.getByRole("button", { name: "Library", exact: true }).first().click();
  await page.waitForTimeout(500);
  const filters = page.locator("main [aria-pressed]");
  const n = await filters.count();
  check(n > 0, `library: filters expose pressed state (${n} found)`);
  if (n > 1) {
    const before = await liveText(page);
    const fb = filters.nth(1);
    await fb.focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(400);
    check((await fb.getAttribute("aria-pressed")) === "true", "library: Space toggles a filter on");
    check((await liveText(page)) !== before, "library: result count change is announced");
    const f = await focusInfo(page);
    check(!f.body, `library: focus stays on the filter (got ${f.desc})`);
  }
  await ctx.close();
}

// 5. Phenotype toggles.
{
  const { ctx, page } = await fresh("/");
  // Pin one element: a selector on aria-pressed="false" would re-resolve after the toggle.
  const t = page.locator('[role="group"] button[aria-pressed="false"]').first();
  if (await t.count()) await t.evaluate((el) => el.setAttribute("data-kbd-probe", ""));
  if (await t.count()) {
    await page.locator("[data-kbd-probe]").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const probe = page.locator("[data-kbd-probe]");
    check((await probe.getAttribute("aria-pressed")) === "true", "phenotype: Enter selects a host-factor toggle");
    const f = await focusInfo(page);
    check(!f.body && f.visible, `phenotype: focus stays visible on the toggle (got ${f.desc})`);
  } else check(false, "phenotype: no keyboard toggle found");
  await ctx.close();
}

// 6. /recover: label, order, visible focus (form is not submitted).
{
  const { ctx, page } = await fresh("/recover");
  await tabTo(page, () => document.activeElement?.tagName === "INPUT", "recover");
  const named = await page.evaluate(() => {
    const i = document.activeElement;
    return Boolean(i.labels?.length || i.getAttribute("aria-label"));
  });
  check(named, "recover: email field has a label");
  await ctx.close();
}

// 7. /pairs -> pair page -> "Open this pair in the desk".
{
  const { ctx, page } = await fresh("/pairs");
  await tabTo(page, () => /\/pair\//.test(document.activeElement?.getAttribute("href") || ""), "pairs");
  await Promise.all([page.waitForURL(/\/pair\//), page.keyboard.press("Enter")]);
  await page.waitForLoadState("networkidle");
  await tabTo(page, () => /Open this pair in the desk/.test(document.activeElement?.textContent || ""), "pair page");
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/pair")), page.keyboard.press("Enter")]);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  const chips = await page.locator('button[title="Remove from regimen"]').count();
  check(chips >= 2, `pair page: CTA opens the desk with the pair loaded (${chips} items)`);
  await ctx.close();
}

await browser.close();
console.log(`\n${notes.length} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
