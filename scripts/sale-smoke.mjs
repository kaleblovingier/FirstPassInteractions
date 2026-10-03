#!/usr/bin/env node
/**
 * Live sale-path smoke check (no secrets). See docs/ops/sale-smoke.md.
 *
 *   npm run smoke:sale                       # live desk, default (warn-only copy checks)
 *   npm run smoke:sale -- --post-merge       # also require post-merge copy
 *   npm run smoke:sale -- https://preview.example.vercel.app [--post-merge] [--json]
 *
 * Read-only against the app: opens the desk, reads visible text on Desk,
 * Safety, and Plans, and tries to redeem an obviously fake key through the
 * real Plans → Redeem UI (server fn `redeemLicense`). It never mints, never
 * touches the operator Foundry, and reads no env files or keys. Writes nothing.
 */
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import {
  EDUCATIONAL_REFERENCE,
  FAKE_KEY,
  WHO_FOR,
  classifyRedeem,
  detectTiers,
  disallowedDecisionSupport,
  exitCodeFor,
  findPhrase,
  formatResult,
  hasEducationalReference,
  hasExact,
  hasFiveDrugLimit,
  hasFoundingPrice,
  hasNotFdaCleared,
  missingPayRails,
  parseSaleSmokeArgs,
  serverFnOk,
  statusFor,
} from "./sale-smoke-checks.mjs";

const args = parseSaleSmokeArgs(process.argv.slice(2), process.env);
if (args.error || args.help) {
  const usage = "usage: node scripts/sale-smoke.mjs [baseUrl] [--post-merge] [--json]";
  console[args.error ? "error" : "log"](args.error ? `${args.error}\n${usage}` : usage);
  process.exit(args.error ? 2 : 0);
}

const TIMEOUT = Number(process.env.SALE_SMOKE_TIMEOUT_MS || 30000);
const results = [];
function record(id, label, passed, detail, opts = {}) {
  const r = {
    id,
    label,
    status: statusFor(passed, { ...opts, postMerge: args.postMerge }),
    detail,
  };
  if (opts.postMergeOnly) r.postMergeOnly = true;
  results.push(r);
  if (!args.json) console.log(formatResult(r));
}

const executablePath =
  process.env.CHROME_PATH ||
  (existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined);

if (!args.json) {
  console.log(
    `FirstPass sale-path smoke → ${args.baseUrl} (${args.postMerge ? "post-merge" : "default"} mode)`,
  );
}

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
const context = await browser.newContext(); // fresh storage: free desk, no license
const page = await context.newPage();
page.setDefaultTimeout(TIMEOUT);
const nav = () => page.getByRole("navigation", { name: "Main navigation" });
const bodyText = () => page.locator("body").innerText();

async function openView(name) {
  await nav().getByRole("button", { name, exact: true }).click();
  await page.waitForTimeout(600);
  return bodyText();
}

let landing = "";
let safety = "";
let plans = "";

// 1. Desk loads
try {
  const res = await page.goto(`${args.baseUrl}/?smoke=${Date.now()}`, {
    waitUntil: "networkidle",
    timeout: TIMEOUT,
  });
  const status = res?.status() ?? 0;
  await nav().waitFor({ state: "visible", timeout: TIMEOUT });
  landing = await bodyText();
  const ok = status >= 200 && status < 400 && /FirstPass/.test(landing);
  record(
    "desk-loads",
    "Desk loads",
    ok,
    `HTTP ${status}${ok ? ", main navigation visible" : ", FirstPass brand missing"}`,
  );
} catch (e) {
  record(
    "desk-loads",
    "Desk loads",
    false,
    e instanceof Error ? e.message.split("\n")[0] : String(e),
  );
}

// 2. Not-FDA-cleared line (desk header / landing)
record(
  "not-fda-cleared",
  "Not-FDA-cleared line visible",
  hasNotFdaCleared(landing),
  hasNotFdaCleared(landing) ? "found on desk" : "no 'not FDA-cleared' text on desk",
);

// Safety view text (for copy checks only)
try {
  safety = await openView("Safety");
} catch (e) {
  safety = "";
  if (!args.json)
    console.log(
      `  (note) could not open Safety view: ${e instanceof Error ? e.message.split("\n")[0] : e}`,
    );
}

// 3–6. Plans content
let plansOpened = false;
try {
  plans = await openView("Plans");
  plansOpened = /founding/i.test(plans);
} catch {
  plans = "";
}
{
  const { tiers, extras } = detectTiers(plans);
  const ok =
    plansOpened && tiers.includes("free") && tiers.includes("founding") && extras.length === 0;
  const detail = !plansOpened
    ? "Plans view did not open"
    : `tiers seen: ${tiers.join(", ") || "none"}${extras.length ? `; unexpected: ${extras.join(", ")}` : ""}`;
  record("plans-tiers", "Plans shows only Free and Founding", ok, detail);
}
record(
  "founding-price",
  "Founding is $79 once / lifetime",
  hasFoundingPrice(plans),
  hasFoundingPrice(plans) ? "$79 with once/lifetime" : "missing $79 or once/lifetime",
);
record(
  "free-limit",
  "Five-drug free limit stated",
  hasFiveDrugLimit(plans),
  hasFiveDrugLimit(plans) ? "found" : "no 'five drugs/medicines' wording on Plans",
);
{
  const missing = missingPayRails(plans);
  record(
    "pay-rails",
    "Venmo, Cash App, PayPal listed",
    missing.length === 0,
    missing.length ? `missing: ${missing.join(", ")}` : "all three",
  );
}

// 7. Fake key rejected via the real Plans → Redeem path
try {
  const openers = [
    /^Have a key\? Redeem it$/,
    /^Already paid\? Redeem your key$/,
    /^Paste and redeem it here$/,
    /^Redeem key$/,
  ];
  let opened = false;
  for (const name of openers) {
    const btn = page.getByRole("button", { name }).first();
    if ((await btn.count()) && (await btn.isVisible())) {
      await btn.click();
      opened = true;
      break;
    }
  }
  if (!opened) throw new Error("no Redeem opener on Plans");
  const field = page.locator("#license-key");
  await field.waitFor({ state: "visible" });
  await field.fill(FAKE_KEY);
  const responseP = page
    .waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        r.url().includes("/_serverFn/") &&
        (r.request().postData() ?? "").includes(FAKE_KEY),
      { timeout: TIMEOUT },
    )
    .catch(() => null);
  await page.getByRole("button", { name: "Redeem", exact: true }).click();
  const response = await responseP;
  const body = response ? await response.text().catch(() => "") : "";
  await page
    .locator('[role="alert"], [role="status"]')
    .first()
    .waitFor({ state: "visible", timeout: 10000 })
    .catch(() => {});
  const alertText = (await page.locator('[role="alert"]').allInnerTexts()).join(" ");
  const statusText = (await page.locator('[role="status"]').allInnerTexts()).join(" ");
  const verdict = classifyRedeem({
    alertText,
    statusText,
    serverOk: body ? serverFnOk(body) : null,
  });
  record("redeem-fake-rejected", `Fake key ${FAKE_KEY} rejected`, verdict.pass, verdict.detail);
} catch (e) {
  record(
    "redeem-fake-rejected",
    `Fake key ${FAKE_KEY} rejected`,
    false,
    e instanceof Error ? e.message.split("\n")[0] : String(e),
  );
}

// 8–11. Post-merge copy (warn-only unless --post-merge)
const visible = [landing, safety, plans].join("\n");
const pm = { postMergeOnly: true };
record(
  "who-for",
  "Exact audience line (WHO_FOR)",
  hasExact(visible, WHO_FOR),
  hasExact(visible, WHO_FOR) ? "found" : "not found on Desk/Safety/Plans",
  pm,
);
record(
  "educational-reference",
  `"${EDUCATIONAL_REFERENCE}" wording`,
  hasEducationalReference(visible),
  hasEducationalReference(visible) ? "found" : "'educational interaction reference' not found",
  pm,
);
{
  const hits = findPhrase(visible, "trained safety staff");
  record(
    "no-trained-safety-staff",
    `No "trained safety staff"`,
    hits.length === 0,
    hits.length ? `${hits.length}× e.g. "…${hits[0].context}…"` : "absent",
    pm,
  );
}
{
  const hits = disallowedDecisionSupport(visible);
  record(
    "no-decision-support",
    `No "decision support" (outside FDA guidance citation)`,
    hits.length === 0,
    hits.length
      ? `${hits.length}× e.g. "…${hits[0].context}…"`
      : "absent (or only in FDA guidance citation)",
    pm,
  );
}

await browser.close();

const code = exitCodeFor(results);
const tally = (s) => results.filter((r) => r.status === s).length;
if (args.json) {
  console.log(
    JSON.stringify(
      { baseUrl: args.baseUrl, postMerge: args.postMerge, ok: code === 0, results },
      null,
      2,
    ),
  );
} else {
  console.log(
    `\n${tally("pass")} pass · ${tally("warn")} warn · ${tally("fail")} fail → ${code === 0 ? "OK" : "FAILED"}`,
  );
}
process.exit(code);
