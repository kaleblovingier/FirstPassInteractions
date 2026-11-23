// Accessibility gate: axe-core (WCAG 2.0/2.1/2.2 A+AA tags) plus scripts/wcag22-checks.mjs on the
// generated routes (read from /sitemap.xml), the pages derived from them and the desk's learning
// tools, at 320 and 1280 px. Exits 1 on any violation, so each new compound is checked automatically.
// Groups (scripts/a11y-routes.mjs picks the routes):
//   drug, pair, enzyme  /drug/*, /pair/*, /enzymes and /enzyme/* from the sitemap
//   class               /classes and /class/* from the sitemap
//   programs            /for-programs, /for-programs/course-kit and the /for-programs/<audience> pages
//   embed               /embed/pair/<slug> for a spread of pair slugs (not in the sitemap)
//   practice            /practice with an enzyme filter, a class filter and a ?set= link
//   tools               the desk's learning tools, plus /practice, /glossary, /workup, /help when served
//   stations            opt-in, see below
// --limit N caps each sitemap-driven type at N (audience pages and embeds at 3); without it every
// sitemap route runs and 12 embeds.
//
// Usage (against a local build: npm run build && npm run preview):
//   CHROME=/usr/bin/google-chrome node scripts/a11y-gate.mjs http://127.0.0.1:4173 \
//     [--only drug,pair,enzyme,class,programs,embed,practice,tools,stations] [--limit N] [--workers 4] [--skip-wcag22] [--json out.json] [--list]
// --list prints the routes it would check and exits without a browser.
// "stations" (the Library modules and a few clinical-board stations) is opt-in, not in the default
// set: it has not had a clean run yet. Run it with --only stations, fix what it finds, then add it
// to the default so CI gates it.
// axe-core is resolved from this repo, or from AXE_FROM=<dir with node_modules/axe-core>.
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_GROUPS, GROUPS, practiceClassKeys, routeSpecs, sitemapPaths } from "./a11y-routes.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (k) => { const i = args.indexOf(k); if (i < 0) return false; args.splice(i, 1); return true; };
const only = new Set(opt("--only", DEFAULT_GROUPS.join(",")).split(","));
const limit = Number(opt("--limit", "0"));
const workers = Number(opt("--workers", "4"));
const out = opt("--json", null);
const skipWcag22 = flag("--skip-wcag22");
const listOnly = flag("--list");
const [base] = args;
if (!base) { console.error("usage: node scripts/a11y-gate.mjs <baseUrl> [options]"); process.exit(2); }
const unknown = [...only].filter((g) => !GROUPS.includes(g));
if (unknown.length) { console.error(`a11y-gate: unknown group(s) ${unknown.join(", ")}; known: ${GROUPS.join(", ")}`); process.exit(2); }

const here = path.dirname(fileURLToPath(import.meta.url));
let axeSource;
try {
  const req = createRequire(process.env.AXE_FROM ? path.join(process.env.AXE_FROM, "x.js") : import.meta.url);
  axeSource = fs.readFileSync(req.resolve("axe-core/axe.min.js"), "utf8");
} catch {
  console.error("axe-core not found. Install it (npm i -D axe-core) or set AXE_FROM to a directory that has it.");
  process.exit(2);
}

const sitemap = await (await fetch(new URL("/sitemap.xml", base))).text();
// The class filter has to be a key /practice offers; read them from its server-rendered select.
let classKeys = [];
if (only.has("practice")) {
  try { classKeys = practiceClassKeys(await (await fetch(new URL("/practice", base))).text()); } catch { /* not served */ }
  if (!classKeys.length) console.log("a11y-gate: /practice offered no class filter; skipping the ?class= spec");
}
const specs = routeSpecs(sitemapPaths(sitemap), { only: [...only], limit, classKeys });
// Optional standalone learning routes: gated only when this build serves them.
for (const p of only.has("tools") ? ["/practice", "/glossary", "/workup", "/help"] : []) {
  try { if ((await fetch(new URL(p, base))).ok) specs.push(p); } catch { /* not served */ }
}
console.log(`a11y-gate: ${specs.length} routes x 2 widths`);
if (listOnly) { for (const s of specs) console.log(s); process.exit(0); }

const browser = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ["--no-sandbox"] });
const results = [];
async function axeOne(spec, width) {
  const [p, clicks] = spec.split("@");
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  try {
    await page.goto(new URL(p, base).href, { waitUntil: "networkidle" });
    for (const name of clicks ? clicks.split(">") : []) {
      await page.getByRole("button", { name, exact: true }).or(page.getByRole("tab", { name, exact: true })).first().click({ timeout: 10000 });
      await page.waitForTimeout(600);
    }
    // Stations are lazy chunks; let them load before axe reads the page.
    await page.waitForLoadState("networkidle");
    await page.addScriptTag({ content: axeSource });
    const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } })).violations
      .map((x) => ({ id: x.id, impact: x.impact, targets: x.nodes.slice(0, 5).map((n) => n.target.join(" ")), count: x.nodes.length })));
    for (const x of v) results.push({ spec, width, ...x });
  } catch (e) {
    results.push({ spec, width, id: "gate-error", impact: "critical", count: 1, targets: [String(e.message).split("\n")[0]] });
  } finally {
    await ctx.close();
  }
}
const queue = specs.flatMap((s) => [320, 1280].map((w) => [s, w]));
await Promise.all(Array.from({ length: workers }, async () => { while (queue.length) { const [s, w] = queue.shift(); await axeOne(s, w); } }));
await browser.close();
for (const r of results) console.log(`[axe ${r.impact}] ${r.spec} @${r.width} ${r.id} x${r.count} ${r.targets.join(" | ")}`);

// wcag22-checks (reflow, text spacing, reduced motion, target size, focus not obscured), in parallel chunks.
const wcagFails = [];
if (!skipWcag22) {
  const chunks = Array.from({ length: workers }, (_, i) => specs.filter((_, j) => j % workers === i)).filter((c) => c.length);
  await Promise.all(chunks.map((chunk) => new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(here, "wcag22-checks.mjs"), base, ...chunk], { env: process.env });
    let buf = "";
    child.stdout.on("data", (d) => { buf += d; });
    child.stderr.on("data", (d) => { buf += d; });
    child.on("close", (code) => {
      for (const line of buf.split("\n")) if (line.startsWith("FAIL")) wcagFails.push(line);
      if (code && !buf.includes(" failed")) wcagFails.push(`FAIL wcag22-checks crashed: ${buf.trim().split("\n").pop()}`);
      resolve();
    });
  })));
  for (const l of wcagFails) console.log(l);
}

const axeNodes = results.reduce((a, r) => a + r.count, 0);
console.log(`\na11y-gate: ${specs.length} routes, axe ${results.length} violations (${axeNodes} nodes), wcag22 ${wcagFails.length} failures`);
// Actions logs need a login; annotations are public, so a failure can be read without one.
if (process.env.GITHUB_ACTIONS) {
  for (const r of results) console.log(`::error::${r.spec} @${r.width} ${r.id}: ${r.targets.slice(0, 2).join(" ; ")}`);
  for (const l of wcagFails) console.log(`::error::${l}`);
}
if (out) fs.writeFileSync(out, JSON.stringify({ routes: specs, axe: results, wcag22: wcagFails }, null, 2));
process.exit(results.length || wcagFails.length ? 1 : 0);
