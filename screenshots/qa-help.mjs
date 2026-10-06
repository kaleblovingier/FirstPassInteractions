import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("screenshots", { recursive: true });
const errors = [];
const browser = await chromium.launch();

async function run(name, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name} pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name} console: ${m.text()}`);
  });
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Find help", exact: true }).first().click();
  await page.getByRole("heading", { name: /Addiction help near you/ }).waitFor();

  const before = requests.length;
  const input = page.getByLabel("ZIP code, or city and state");
  await input.fill("98101");
  const treat = page.getByRole("link", { name: /Open FindTreatment\.gov/ });
  const href = await treat.getAttribute("href");
  const sms = await page.getByRole("link", { name: /Open text message/ }).getAttribute("href");
  const tels = await page.locator('a[href^="tel:"]').evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const leaked = requests.slice(before).filter((u) => u.includes("98101"));

  await page.screenshot({ path: `screenshots/help-${name}.png`, fullPage: true });

  await input.fill("123");
  const alert = await page.getByRole("alert").innerText().catch(() => "(none)");
  await input.fill("Seattle, WA");
  const smsGone = (await page.getByRole("link", { name: /Open text message/ }).count()) === 0;
  const href2 = await treat.getAttribute("href");

  console.log(JSON.stringify({ name, href, sms, tels, overflow, leakedRequests: leaked, alert, smsGoneForPlace: smsGone, href2 }, null, 2));
  await ctx.close();
}

await run("desktop", { width: 1280, height: 900 });
await run("mobile", { width: 390, height: 844 });
await browser.close();
console.log("console/page errors:", JSON.stringify(errors, null, 2));

