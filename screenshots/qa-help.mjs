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

  // If initial safety disclaimer banner is shown, dismiss it or click Find help
  const continueBtn = page.getByRole("button", { name: "Continue", exact: true });
  if (await continueBtn.isVisible()) {
    await continueBtn.click();
  }

  // Click Find help in nav
  const navBtn = page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Find help", exact: true });
  await navBtn.click();
  await page.getByRole("heading", { name: /Addiction help near you/ }).waitFor();

  const before = requests.length;
  const input = page.getByLabel(/Enter 5-digit ZIP code/);
  await input.fill("98101");

  // Verify WA State card rendered
  await page.getByText("Washington Recovery Help Line").waitFor();
  await page.getByText("1-866-789-1511").waitFor();

  const treat = page.getByRole("link", { name: /Open FindTreatment\.gov/ });
  const href = await treat.getAttribute("href");
  const sms = await page.getByRole("link", { name: /Open text message/ }).getAttribute("href");
  const tels = await page.locator('a[href^="tel:"]').evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const leaked = requests.slice(before).filter((u) => u.includes("98101"));

  // Check state dropdown selection
  const select = page.getByLabel(/Or choose a state/);
  await select.selectOption("TX");
  await page.getByText("Texas OSAR").waitFor();
  await page.getByText("1-877-541-7905").waitFor();

  // Test tabs
  await page.getByRole("button", { name: /Medication options/ }).click();
  await page.getByText("Buprenorphine (Suboxone, Subutex)").waitFor();
  await page.getByRole("heading", { name: "Methadone", exact: true }).waitFor();

  await page.getByRole("button", { name: /Fentanyl & Xylazine/ }).click();
  await page.getByText("Xylazine is a non-opioid sedative").waitFor();
  await page.getByRole("heading", { name: "Never Use Alone", exact: true }).waitFor();

  // Return to directory tab
  await page.getByRole("button", { name: /Local treatment/ }).click();

  await page.screenshot({ path: `screenshots/help-${name}.png`, fullPage: true });

  console.log(JSON.stringify({
    name,
    href,
    sms,
    telsCount: tels.length,
    overflow,
    leakedRequests: leaked,
    waHelplineVerified: true,
    txSelectVerified: true,
    moudTabVerified: true,
    safetyTabVerified: true
  }, null, 2));

  await ctx.close();
}

await run("desktop", { width: 1280, height: 900 });
await run("mobile", { width: 390, height: 844 });
await browser.close();
console.log("console/page errors:", JSON.stringify(errors, null, 2));
