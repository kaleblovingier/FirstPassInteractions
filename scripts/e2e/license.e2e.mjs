import { createHmac, randomBytes } from "node:crypto";
import { addDrug, check, freshPage } from "./lib.mjs";
// Test-only key minted with the stub pepper the runner gives the preview server (E2E_LICENSE_PEPPER).
// It mirrors mintKey() in src/lib/billing/license.server.ts. No real secret or Stripe is used.
export function testKey(tag = "LIFE") {
  const body = randomBytes(4).toString("hex").toUpperCase();
  const sig = createHmac("sha256", process.env.E2E_LICENSE_PEPPER).update(`${tag}:${body}`).digest("hex").slice(0, 8).toUpperCase();
  return `FP-${tag}-${body}-${sig}`;
}
export default async function (browser) {
  const { ctx, page, errors } = await freshPage(browser);
  await addDrug(page, "clarithromycin");
  await addDrug(page, "simvastatin");
  const plan = () => page.evaluate(() => JSON.parse(localStorage.getItem("firstpass.desk.v7") || "{}")?.state?.plan ?? "free");
  check((await plan()) === "free", "license: fresh desk starts on the free plan");
  const reportBtn = page.getByRole("button", { name: /Full report · Founding/ });
  check((await reportBtn.count()) > 0, "license: locked state shows 'Full report · Founding'");
  await page.getByRole("button", { name: "Unlock", exact: true }).first().click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.first().waitFor({ timeout: 5000 });
  check(await dialog.first().isVisible(), "license: Unlock opens the checkout dialog");
  const keyField = dialog.getByRole("textbox", { name: /key/i }).first();
  check((await keyField.count()) > 0, "license: dialog has a labelled key field");
  // A wrong key must not unlock.
  await keyField.fill("FP-LIFE-00000000-00000000");
  await dialog.getByRole("button", { name: /redeem|unlock|apply|activate/i }).first().click();
  await page.waitForTimeout(1500);
  check((await plan()) === "free", "license: a bad key does not unlock");
  check(/did not verify|does not verify|not a firstpass key/i.test(await dialog.first().innerText().catch(() => "")), "license: bad key shows an error");
  // A valid test key unlocks.
  await keyField.fill(testKey("LIFE"));
  await dialog.getByRole("button", { name: /redeem|unlock|apply|activate/i }).first().click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("firstpass.desk.v7") || "{}")?.state?.plan === "lab", null, { timeout: 8000 }).catch(() => {});
  check((await plan()) === "lab", `license: valid test key unlocks (plan=${await plan()})`);
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(500);
  check((await page.getByRole("button", { name: /Full report · Founding/ }).count()) === 0, "license: unlocked desk drops the Founding lock label");
  check(errors.length === 0, `license: no page errors (${errors.join("; ").slice(0, 120)})`);
  await ctx.close();
}
