import { addDrug, check, chips, freshPage } from "./lib.mjs";
export default async function (browser) {
  const { ctx, page, errors } = await freshPage(browser);
  const input = page.locator("#drug-search");
  await input.click();
  await input.fill("clarith");
  const opts = page.locator('[id^="drug-option-"]');
  await opts.first().waitFor({ timeout: 5000 }).catch(() => {});
  const n = await opts.count();
  check(n > 0, `search: typing "clarith" shows suggestions (${n})`);
  check((await input.getAttribute("aria-expanded")) === "true", "search: combobox reports aria-expanded=true");
  check(/clarithromycin/i.test(await opts.first().innerText()), "search: first suggestion is clarithromycin");
  // Keyboard selection: ArrowDown moves the active option, Enter adds it.
  const before = await input.getAttribute("aria-activedescendant");
  await input.press("ArrowDown");
  const after = await input.getAttribute("aria-activedescendant");
  check(n < 2 || (after && after !== before), `search: ArrowDown moves the active option (${before} -> ${after})`);
  await input.press("ArrowUp");
  await input.press("Enter");
  await page.waitForTimeout(300);
  check((await chips(page).count()) === 1, "search: Enter adds the active suggestion to the desk");
  check((await input.inputValue()) === "", "search: field clears after adding");
  // No-results state.
  await input.fill("zzqxnotadrug");
  const status = page.locator('[role="status"]', { hasText: "No match for" });
  await status.waitFor({ timeout: 5000 }).catch(() => {});
  check(await status.isVisible(), "search: unknown text shows the no-match status");
  check(/does not mean an interaction is absent/i.test(await status.innerText().catch(() => "")), "search: no-match status keeps the safety line");
  check((await page.locator('[id^="drug-option-"]').count()) === 0, "search: no suggestions for unknown text");
  await input.press("Escape");
  check(errors.length === 0, `search: no page errors (${errors.join("; ").slice(0, 120)})`);
  await ctx.close();
  void addDrug;
}
