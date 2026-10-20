import { addDrug, check, chips, freshPage } from "./lib.mjs";
export default async function (browser) {
  const { ctx, page, errors } = await freshPage(browser);
  await addDrug(page, "clarithromycin");
  await addDrug(page, "simvastatin");
  check((await chips(page).count()) === 2, "compare: two drugs on the desk");
  const main = page.locator("main");
  await page.waitForTimeout(500);
  const text = await main.innerText();
  check(/clarithromycin/i.test(text) && /simvastatin/i.test(text), "compare: pair result names both drugs");
  check(/avoid|contraindicated|serious|major|do not/i.test(text), "compare: pair result shows a severity");
  check((await page.locator("h1").count()) === 1, "compare: one h1 with a pair loaded");
  await addDrug(page, "grapefruit");
  check((await chips(page).count()) === 3, "compare: a third item can be added");
  await chips(page).last().click();
  await page.waitForTimeout(300);
  check((await chips(page).count()) === 2, "compare: removing a chip drops it from the desk");
  await chips(page).first().click();
  await chips(page).first().click();
  await page.waitForTimeout(300);
  check((await chips(page).count()) === 0, "compare: removing all drugs empties the desk");
  check(!/simvastatin/i.test(await page.locator('button[title="Remove from regimen"]').allInnerTexts().then((t) => t.join(" "))), "compare: removed drug is gone");
  // Case compare view.
  await page.getByRole("button", { name: "Compare", exact: true }).first().click();
  await page.waitForTimeout(600);
  const h1 = await page.locator("main h1").allInnerTexts();
  check(h1.length === 1 && /compare/i.test(h1[0]), `compare: Compare view opens with one h1 (${h1.join(" | ").slice(0, 60)})`);
  check(errors.length === 0, `compare: no page errors (${errors.join("; ").slice(0, 120)})`);
  await ctx.close();
}
