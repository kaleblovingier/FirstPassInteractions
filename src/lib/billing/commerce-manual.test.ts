import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/** Assert buyer-facing manual-pay copy without importing Vite-bound commerce.ts. */
const src = await readFile(new URL("./commerce.ts", import.meta.url), "utf8");

test("manual unlock is three clear buyer steps in commerce source", () => {
  assert.match(src, /MANUAL_UNLOCK_STEPS/);
  assert.match(src, /Pay \$79 once/);
  assert.match(src, /Get your key/);
  assert.match(src, /Redeem on this desk/);
  assert.match(src, /n: "1"/);
  assert.match(src, /n: "2"/);
  assert.match(src, /n: "3"/);
});

test("founding unlock note stays soft and non-clinical", () => {
  const start = src.indexOf("FOUNDING_UNLOCKS");
  assert.ok(start >= 0);
  const snippet = src.slice(start, start + 400);
  assert.match(snippet, /host factors/i);
  assert.match(snippet, /enzyme atlas/i);
  assert.match(snippet, /\$79 once/);
  assert.match(snippet, /not FDA-cleared/i);
  assert.doesNotMatch(snippet, /diagnos|treat|cure/i);
});

test("payClose names rails, redeem, and three-step path", () => {
  assert.match(src, /pay, get your key, redeem/i);
  assert.match(src, /Venmo/);
  assert.match(src, /Cash App/);
  assert.match(src, /PayPal/);
  assert.match(src, /Redeem on the Plans page/);
  assert.doesNotMatch(src, /→/);
});

test("PAY_RAILS still lists three written rails", () => {
  assert.match(src, /id: "venmo"/);
  assert.match(src, /id: "cashapp"/);
  assert.match(src, /id: "paypal"/);
});

test("plans FAQ answers subscription, card, lost key, and medical advice", () => {
  const start = src.indexOf("PLANS_FAQ");
  assert.ok(start >= 0);
  const faq = src.slice(start, src.indexOf("] as const;", start));
  assert.match(faq, /Is it a subscription\?/);
  assert.match(faq, /No\. Founding is \$79 once/);
  assert.match(faq, /need a card/i);
  assert.match(faq, /lost my key/i);
  // Lost-key answer reuses existing operator contact — no new handles.
  assert.match(faq, /\$\{OPERATOR\.email\}/);
  assert.match(faq, /\$\{OPERATOR\.phone\}/);
  assert.match(faq, /medical advice/i);
  assert.match(faq, /not FDA-cleared/i);
  assert.match(faq, /Prescribing Information governs/);
  assert.match(faq, /not proof a combination is safe/i);
  assert.doesNotMatch(faq, /diagnos|treat|cure/i);
});

test("who-it's-for line uses the approved audience wording", () => {
  const m = src.match(/WHO_FOR = "([^"]+)"/);
  assert.ok(m);
  assert.equal(
    m[1],
    "For licensed healthcare professionals, and for students in accredited health-professions programs using it for education under faculty or preceptor supervision.",
  );
  assert.doesNotMatch(src, /trained safety staff|harm-reduction teams|street-supply desks/i);
});

test("pitch no longer repeats a second free-tier line", () => {
  const start = src.indexOf("pitch:");
  const line = src.slice(start, src.indexOf("\n", start));
  assert.doesNotMatch(line, /free|five/i);
});

test("operator close copy does not pitch a card or a monthly comparison", async () => {
  assert.doesNotMatch(src, /card on the desk/i);
  assert.doesNotMatch(src, /\$12\/mo/);
  assert.doesNotMatch(src, /returned from Stripe/);
  const foundry = await readFile(new URL("../../components/desk/foundry.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(foundry, /card on the desk/i);
  assert.doesNotMatch(foundry, /\$12\/mo/);
  assert.doesNotMatch(foundry, /Stripe/);
  assert.match(foundry, /\$79 once/);
  assert.match(foundry, /Venmo, Cash App, or PayPal/);
  assert.match(foundry, /mint in Foundry/);
  const readme = await readFile(new URL("../../../README.md", import.meta.url), "utf8");
  const pay = readme.slice(readme.indexOf("## Pay / write"), readme.indexOf("## Who it's for"));
  assert.doesNotMatch(pay, /card on the desk/i);
  assert.doesNotMatch(pay, /Stripe/);
  assert.match(pay, /\$79 once/);
  assert.match(pay, /mint a signed key in Foundry/);
});


test("pay step names the apps instead of a rail", () => {
  const start = src.indexOf("MANUAL_UNLOCK_STEPS");
  const end = src.indexOf("FOUNDING_UNLOCKS", start);
  const steps = src.slice(start, end);
  assert.match(steps, /Open Venmo, Cash App, or PayPal below/);
  assert.match(steps, /liver enzyme map/);
  assert.doesNotMatch(steps, /rail/i);
  assert.doesNotMatch(steps, /send founding/);
});

test("hunt clinic DM includes the live desk URL", async () => {
  const hunts = await readFile(new URL("./hunts.ts", import.meta.url), "utf8");
  const start = hunts.indexOf("export function targetDm");
  const end = hunts.indexOf("export function mailSubject", start);
  assert.ok(start >= 0 && end > start);
  const fn = hunts.slice(start, end);
  assert.match(fn, /SITE\.url/);
  assert.match(fn, /payClose\(price\)/);
  assert.match(fn, /\$\$\{price\} once/);
});

test("foundry teaching packs use SITE.url pack links", async () => {
  const foundry = await readFile(new URL("../../components/desk/foundry.tsx", import.meta.url), "utf8");
  const permalinks = await readFile(new URL("../drugs/permalinks.ts", import.meta.url), "utf8");
  assert.match(src, /https:\/\/firstpass-desk\.vercel\.app/);
  assert.match(foundry, /Teaching packs/);
  assert.match(foundry, /teachingPackLinks\(SITE\.url\)/);
  assert.match(foundry, /Free try links/);
  assert.doesNotMatch(foundry, /\$12\/mo/);
  assert.doesNotMatch(foundry, /card on the desk/i);
  assert.match(permalinks, /export function teachingPackUrl/);
  assert.match(permalinks, /searchParams\.set\("pack", packId\)/);
  assert.match(permalinks, /return PACK_IDS\.map/);
});

test("public contact email is FirstPassInteractions, not the old gmail", () => {
  const start = src.indexOf("export const OPERATOR");
  const end = src.indexOf("export const PAY_RAILS", start);
  assert.ok(start >= 0 && end > start);
  const op = src.slice(start, end);
  assert.match(op, /email: "FirstPassInteractions@gmail\.com"/);
  assert.match(op, /paypal: "FirstPassInteractions@gmail\.com"/);
  assert.match(op, /business=FirstPassInteractions%40gmail\.com/);
  assert.match(op, /PayPal FirstPassInteractions@gmail\.com/);
  assert.doesNotMatch(op, /kaleblovingier@gmail\.com/);
  assert.match(op, /venmo: "kaleblovingier"/);
  assert.match(op, /cashApp: "kaleblovingier7"/);
});

test("Pages pitch lists founding pay rails, contact email, and live teaching packs", async () => {
  const pages = await readFile(new URL("../../../docs/index.html", import.meta.url), "utf8");
  assert.match(pages, /Venmo @kaleblovingier/);
  assert.match(pages, /https:\/\/venmo.com\/u\/kaleblovingier/);
  assert.match(pages, /Cash App \$kaleblovingier7/);
  assert.match(pages, /https:\/\/cash.app\/\$kaleblovingier7/);
  assert.match(pages, /FirstPassInteractions@gmail\.com/);
  assert.match(pages, /business=FirstPassInteractions%40gmail\.com/);
  assert.match(pages, /\?pack=clinic-onboard/);
  assert.match(pages, /\?pack=mat-cup/);
  assert.match(pages, /\?pack=pharmd/);
  assert.doesNotMatch(pages, /kaleblovingier@gmail\.com/);
  assert.match(pages, /grid\.querySelectorAll\("\.example-card"\)/);
});
