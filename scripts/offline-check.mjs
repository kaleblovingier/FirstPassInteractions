// Offline reading check (Playwright). Visit once online, let the service worker
// precache, go offline, then confirm drug, pair and enzyme pages (with label
// quotes) still render, and that /api/ and gated pages were never cached.
//   node scripts/offline-check.mjs http://127.0.0.1:PORT
import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:3000";
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ["--no-sandbox"] });
const ctx = await browser.newContext();
const page = await ctx.newPage();
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); if (!ok) fails++; };

const xml = await (await fetch(new URL("/sitemap.xml", base))).text();
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const want = (re) => locs.filter((p) => re.test(p));
const drugs = want(/^\/drug\//), pairs = want(/^\/pair\//), enzymes = want(/^\/enzyme\//);
const expected = drugs.length + pairs.length + enzymes.length + 3;

await page.goto(base + "/", { waitUntil: "load" });
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload({ waitUntil: "load" });
check(await page.evaluate(() => !!navigator.serviceWorker.controller), "service worker controls the page");

const deadline = Date.now() + 240_000;
let cached = 0;
while (Date.now() < deadline) {
  cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const k = keys.find((n) => n.endsWith("-pages"));
    return k ? (await (await caches.open(k)).keys()).length : 0;
  });
  if (cached >= expected) break;
  await page.waitForTimeout(2000);
}
check(cached >= expected, `precached ${cached}/${expected} reference pages`);

const leaked = await page.evaluate(async () => {
  const out = [];
  for (const k of await caches.keys())
    for (const r of await (await caches.open(k)).keys()) {
      const p = new URL(r.url).pathname;
      if (/^\/(api|__grok)\//.test(p) || /license|gate|recover|checkout|stripe/i.test(p) || !/^\/(drug|pair|enzyme)\/|^\/(pairs|enzymes)?$|^\/assets\/|^\/favicon\.svg$/.test(p)) out.push(p);
    }
  return out;
});
check(leaked.length === 0, `no API, gate or desk responses cached${leaked.length ? ": " + leaked.slice(0, 5).join(", ") : ""}`);

await ctx.setOffline(true);
const sample = [drugs[0], drugs.at(-1), pairs[0], pairs[Math.floor(pairs.length / 2)], pairs.at(-1), enzymes[0], "/pairs", "/enzymes"];
for (const p of sample) {
  try {
    await page.goto(base + p, { waitUntil: "domcontentloaded", timeout: 15000 });
    const h1 = await page.locator("h1").first().textContent({ timeout: 5000 });
    const styled = await page.evaluate(() => getComputedStyle(document.body).backgroundColor !== "rgba(0, 0, 0, 0)");
    let quote = true;
    if (p.startsWith("/pair/")) quote = (await page.locator("blockquote, [data-testid='pair-quote']").count()) > 0;
    const disclaimer = (await page.getByText("The Prescribing Information governs").count()) > 0;
    check(!!h1 && styled && quote && disclaimer, `offline ${p}: h1 "${(h1 || "").trim().slice(0, 40)}", styled=${styled}, quote=${quote}, disclaimer=${disclaimer}`);
  } catch (e) {
    check(false, `offline ${p}: ${String(e.message).split("\n")[0]}`);
  }
}
const apiOffline = await page.evaluate(() => fetch("/api/license/recover", { method: "POST" }).then(() => "answered", () => "network error"));
check(apiOffline === "network error", `offline /api/license/recover is not served from cache (${apiOffline})`);

await browser.close();
console.log(fails ? `${fails} failed` : "offline check passed");
process.exit(fails ? 1 : 0);
