import { addDrug, check, freshPage } from "./lib.mjs";
import { testKey } from "./license.e2e.mjs";
// Dose-like strings that must never appear in an export. Reported, not fixed here.
const DOSE = [/\b\d+(\.\d+)?\s?(mg|mcg|µg|g|mL|units?|IU|mEq|mmol)\b/gi, /mg\/dL/gi, /\bD50W?\b/g, /albuterol[^.\n]{0,20}\b\d/gi, /\bunits?\/(kg|hr|h)\b/gi];
export default async function (browser) {
  const { ctx, page, errors } = await freshPage(browser);
  // Unlock first with a test-only key, so the export is not gated.
  await page.getByRole("button", { name: "Unlock", exact: true }).first().click();
  const dialog = page.locator('[role="dialog"]').first();
  await dialog.waitFor({ timeout: 5000 });
  await dialog.getByRole("textbox", { name: /key/i }).first().fill(testKey("LIFE"));
  await dialog.getByRole("button", { name: /redeem|unlock|apply|activate/i }).first().click();
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape").catch(() => {});
  const found = [];
  for (const [a, b] of [["clarithromycin", "simvastatin"], ["linezolid", "sertraline"], ["methadone", "alprazolam"]]) {
    await page.goto(new URL("/", process.env.E2E_BASE).href, { waitUntil: "networkidle" });
    await page.evaluate(() => { const k = "firstpass.desk.v7"; const s = JSON.parse(localStorage.getItem(k) || "{}"); if (s.state) { s.state.selected = []; localStorage.setItem(k, JSON.stringify(s)); } });
    await page.reload({ waitUntil: "networkidle" });
    await addDrug(page, a); await addDrug(page, b);
    const btn = page.getByRole("button", { name: "Clinical packet", exact: true }).first();
    if (!(await btn.count())) { check(false, `export ${a}+${b}: Clinical packet button present`); continue; }
    await btn.click();
    const pd = page.locator('[role="dialog"][aria-labelledby="packet-dialog-title"]').first();
    await pd.waitFor({ timeout: 5000 }).catch(() => {});
    const visible = await pd.innerText().catch(() => "");
    const texts = { packet: visible };
    for (const [kind, name] of [["ehr", /EHR Note/], ["handout", /Patient Handout/]]) {
      await page.evaluate(() => navigator.clipboard.writeText("")).catch(() => {});
      await pd.getByRole("button", { name }).first().click().catch(() => {});
      await page.waitForFunction(() => navigator.clipboard.readText().then((t) => t.length > 0), null, { timeout: 5000, polling: 200 }).catch(() => {});
      texts[kind] = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
    }
    for (const [kind, t] of Object.entries(texts)) {
      check(t.length > 50, `export ${a}+${b} ${kind}: produces output (${t.length} chars)`);
      check(/not (medical|clinical) advice|education|not a substitute|clinical judgment|disclaimer|does not replace/i.test(t), `export ${a}+${b} ${kind}: carries the disclaimer`);
      const hits = new Set();
      for (const re of DOSE) for (const m of t.matchAll(re)) hits.add(t.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\s+/g, " "));
      for (const h of hits) found.push(`${a}+${b} ${kind}: "${h}"`);
    }
    await page.getByRole("button", { name: "Close clinical packet" }).click().catch(() => {});
  }
  check(found.length === 0, `export: no dose strings in exports (${found.length})`);
  for (const f of found) console.log(`     dose-like: ${f}`);
  check(errors.length === 0, `export: no page errors (${errors.join("; ").slice(0, 120)})`);
  await ctx.close();
}
