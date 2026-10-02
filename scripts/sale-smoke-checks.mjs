/**
 * Pure helpers for scripts/sale-smoke.mjs — no network, no browser, no secrets.
 * Unit-tested in scripts/sale-smoke-checks.test.mjs.
 */

export const DEFAULT_BASE_URL = "https://firstpass-desk.vercel.app";

/** Obviously fake; must never verify. */
export const FAKE_KEY = "FP-LIFE-FAKE-0000";

/** Exact audience line the unmerged copy PRs introduce (required in --post-merge). */
export const WHO_FOR =
  "For licensed healthcare professionals, and for students in accredited health-professions programs using it for education under faculty or preceptor supervision.";

export const EDUCATIONAL_REFERENCE =
  "Educational interaction reference, not a substitute for clinical judgment.";

/** Tier label lines as rendered (innerText applies CSS uppercase, so compare uppercased). */
const TIER_LABELS = new Map([
  ["FREE", "free"],
  ["FREE DESK", "free"],
  ["FREE PLAN", "free"],
  ["FOUNDING", "founding"],
  ["FOUNDING LIFETIME", "founding"],
  ["FOUNDING · LIFETIME", "founding"],
  ["PRO", "pro"],
  ["PRO DESK", "pro"],
  ["PLUS", "plus"],
  ["PREMIUM", "premium"],
  ["TEAM", "team"],
  ["TEAMS", "team"],
  ["CLINIC", "clinic"],
  ["LAB", "lab"],
  ["ENTERPRISE", "enterprise"],
  ["INSTITUTION", "institution"],
  ["INSTITUTIONAL", "institution"],
  ["BASIC", "basic"],
  ["STARTER", "starter"],
  ["BUSINESS", "business"],
]);

/** Billing-interval toggles imply subscription tiers, which Plans must not offer. */
const INTERVAL_LABELS = new Set(["MONTHLY", "YEARLY", "ANNUAL", "ANNUALLY"]);
const SUBSCRIPTION_PRICE = /\$\s?\d+(?:\.\d+)?\s*(?:\/|per\s+)\s*(?:mo|month|yr|year)\b/i;

function lines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Tier cards found in Plans text. Returns { tiers: string[] (unique, in order),
 * extras: string[] (anything that is not free/founding, incl. interval toggles) }.
 */
export function detectTiers(plansText) {
  const tiers = [];
  const extras = [];
  for (const line of lines(plansText)) {
    const up = line.toUpperCase();
    const tier = TIER_LABELS.get(up);
    if (tier && !tiers.includes(tier)) tiers.push(tier);
    if (tier && tier !== "free" && tier !== "founding" && !extras.includes(line)) extras.push(line);
    if (INTERVAL_LABELS.has(up) && !extras.includes(line))
      extras.push(`${line} (billing interval)`);
  }
  const sub = SUBSCRIPTION_PRICE.exec(String(plansText ?? ""));
  if (sub) extras.push(`${sub[0]} (subscription price)`);
  return { tiers, extras };
}

export function hasFoundingPrice(text) {
  const t = String(text ?? "");
  return /\$79(?!\d)/.test(t) && /\bonce\b|\blifetime\b/i.test(t);
}

export function hasFiveDrugLimit(text) {
  return /\b(?:five|5)[-\s](?:drugs?|medicines?|medications?)\b/i.test(String(text ?? ""));
}

export function missingPayRails(text) {
  const t = String(text ?? "");
  return [
    ["Venmo", /\bvenmo\b/i],
    ["Cash App", /\bcash\s?app\b/i],
    ["PayPal", /\bpaypal\b/i],
  ]
    .filter(([, re]) => !re.test(t))
    .map(([name]) => name);
}

export function hasNotFdaCleared(text) {
  return /\bnot\s+FDA[-\s]cleared\b/i.test(String(text ?? ""));
}

function squash(s) {
  return String(s ?? "").replace(/\s+/g, " ");
}

export function hasExact(text, needle) {
  return squash(text).includes(squash(needle));
}

export function hasEducationalReference(text) {
  return /educational interaction reference/i.test(String(text ?? ""));
}

function snippet(text, index, len, pad = 60) {
  return text.slice(Math.max(0, index - pad), index + len + pad).trim();
}

/** Every occurrence of `phrase` (case-insensitive) with surrounding context. */
export function findPhrase(text, phrase) {
  const t = squash(text);
  const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  const hits = [];
  let m;
  while ((m = re.exec(t))) hits.push({ index: m.index, context: snippet(t, m.index, m[0].length) });
  return hits;
}

/**
 * "decision support" hits that are NOT part of an FDA guidance citation.
 * A hit is treated as a citation when the nearby text (±window chars) names
 * FDA guidance, e.g. "FDA Clinical Decision Support Software guidance (2022)".
 */
export function disallowedDecisionSupport(text, window = 100) {
  const t = squash(text);
  return findPhrase(t, "decision support").filter(({ index }) => {
    const around = t.slice(Math.max(0, index - window), index + "decision support".length + window);
    return !(/\bFDA\b/.test(around) && /\bguidance\b/i.test(around));
  });
}

/**
 * `ok` from a TanStack Start server-fn response (seroval JSON), or null if it
 * cannot be read. seroval constants: 2 = true, 3 = false.
 */
export function serverFnOk(body) {
  try {
    const root = JSON.parse(body);
    const result = root?.p?.v?.[0];
    const keys = result?.p?.k;
    const vals = result?.p?.v;
    if (!Array.isArray(keys) || !Array.isArray(vals)) return null;
    const i = keys.indexOf("ok");
    if (i < 0) return null;
    const v = vals[i];
    if (v?.t === 2 && v.s === 2) return true;
    if (v?.t === 2 && v.s === 3) return false;
    return null;
  } catch {
    return null;
  }
}

/** Fake key must be rejected: server says ok=false (or unreadable) AND the UI shows an error, not a success. */
export function classifyRedeem({ alertText = "", statusText = "", serverOk = null }) {
  if (serverOk === true) return { pass: false, detail: "server accepted the fake key (ok=true)" };
  if (/unlocked/i.test(statusText))
    return { pass: false, detail: `UI shows success: ${statusText}` };
  if (!alertText.trim()) {
    return { pass: false, detail: "no rejection message shown after Redeem" };
  }
  const src = serverOk === false ? "server ok=false" : "server response unread";
  return { pass: true, detail: `rejected (${src}): "${alertText.trim()}"` };
}

/** Result status after applying mode: post-merge-only checks warn in default mode. */
export function statusFor(passed, { postMergeOnly = false, postMerge = false } = {}) {
  if (passed) return "pass";
  return postMergeOnly && !postMerge ? "warn" : "fail";
}

export function exitCodeFor(results) {
  return results.some((r) => r.status === "fail") ? 1 : 0;
}

export function parseSaleSmokeArgs(argv, env = {}) {
  const out = {
    baseUrl: env.SALE_SMOKE_URL || DEFAULT_BASE_URL,
    postMerge: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--post-merge") out.postMerge = true;
    else if (a === "--json") out.json = true;
    else if (a === "-h" || a === "--help") out.help = true;
    else if (a === "--url") out.baseUrl = argv[++i] ?? "";
    else if (a.startsWith("--url=")) out.baseUrl = a.slice(6);
    else if (a.startsWith("-")) return { error: `unknown flag ${a}` };
    else out.baseUrl = a;
  }
  let u;
  try {
    u = new URL(out.baseUrl);
  } catch {
    return { error: `not a valid URL: ${out.baseUrl}` };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { error: `only http/https URLs are allowed, got ${u.protocol}` };
  }
  out.baseUrl = u.origin + u.pathname.replace(/\/+$/, "");
  return out;
}

export function formatResult(r) {
  const tag =
    { pass: "PASS", fail: "FAIL", warn: "WARN", skip: "SKIP" }[r.status] ?? r.status.toUpperCase();
  return `[${tag}] ${r.label}${r.detail ? ` — ${r.detail}` : ""}`;
}
