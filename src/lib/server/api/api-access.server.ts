/**
 * Who may call /api/cds/*, and how often.
 *
 * - /api/cds/health is open: no key, no meter (API_OPEN_PATHS).
 * - No key: allowed, counted per client address (clientKey: IPv4, or IPv6 /64) at the anonymous limit.
 * - A key (Authorization: Bearer <key>, or x-api-key): checked by signature and end month, then counted
 *   per key at its tier's limit. A bad, tampered or ended key is a 401, never a silent downgrade.
 * - Over the limit: 429 with Retry-After. Every metered answer carries RateLimit headers.
 *
 * Limits live in src/lib/billing/api-tiers.ts (a draft). Counts are shared across instances through the
 * throttle store when DATABASE_URL is set, and per instance otherwise (see throttle-store.ts).
 * Callers we cannot tell apart (SHARED_CLIENT, i.e. not on Vercel) are never refused for the anonymous
 * limit, following the rule in rate-limit.ts: a limit on that key must slow down, never refuse.
 */
import { API_KEY_HEADER, API_LIMITS, API_TIER_BY_ID, type ApiCallerTier } from "../../billing/api-tiers";
import { verifyApiKey } from "../../billing/api-keys.server";
import { logEvent } from "../log";
import { SHARED_CLIENT, clientKey } from "../rate-limit";
import { SharedWindow, sharedThrottleConfigured, withStore } from "../throttle-store";
import {
  problemTooManyRequests,
  problemUnauthorized,
  problemUnavailable,
  toProblemResponse,
} from "./problem";

export type PresentedKey = { kind: "none" } | { kind: "key"; key: string } | { kind: "unreadable"; detail: string };

export type Admission =
  | { ok: true; tier: ApiCallerTier; headers: Headers }
  | { ok: false; response: Response };

const WINDOWS: Record<ApiCallerTier, SharedWindow> = {
  anonymous: new SharedWindow("cds.api.anonymous", API_LIMITS.anonymous.max, API_LIMITS.anonymous.windowMs),
  developer: new SharedWindow("cds.api.developer", API_LIMITS.developer.max, API_LIMITS.developer.windowMs),
  education: new SharedWindow("cds.api.education", API_LIMITS.education.max, API_LIMITS.education.windowMs),
};

const WWW_AUTHENTICATE = 'Bearer realm="FirstPass CDS API", error="invalid_token"';

/** Test hook: forget this instance's counts. */
export function resetApiMeters(): void {
  for (const w of Object.values(WINDOWS)) w.reset();
}

/** The key a caller sent, if any. Bearer wins; x-api-key is the fallback for clients that cannot set Authorization. */
export function presentedKey(request: Request): PresentedKey {
  const auth = request.headers.get("authorization")?.trim() ?? "";
  const header = request.headers.get(API_KEY_HEADER)?.trim() ?? "";
  let bearer = "";
  if (auth) {
    const m = /^Bearer\s+(\S+)$/i.exec(auth);
    if (!m) {
      return {
        kind: "unreadable",
        detail: "Send the API key as 'Authorization: Bearer <key>' or in the x-api-key header.",
      };
    }
    bearer = m[1]!;
  }
  if (bearer && header && bearer.toUpperCase() !== header.toUpperCase()) {
    return { kind: "unreadable", detail: "Two different API keys were sent. Send one key." };
  }
  const key = bearer || header;
  return key ? { kind: "key", key } : { kind: "none" };
}

function seconds(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}

function policyHeaders(tier: ApiCallerTier): Headers {
  const { max, windowMs } = API_LIMITS[tier];
  return new Headers({
    "RateLimit-Policy": `${max};w=${seconds(windowMs)}`,
    "X-FirstPass-Api-Tier": tier,
  });
}

/** Takes one slot for `key` and says what is left. Reset and Retry-After are upper bounds when only the shared store knows. */
async function meter(tier: ApiCallerTier, key: string, now: number) {
  const win = WINDOWS[tier];
  const allowed = await win.take(key, now);
  let used = win.local.used(key, now);
  if (sharedThrottleConfigured()) {
    const shared = await withStore((s) => s.count(win.bucket, key, win.windowMs, now));
    if (shared !== undefined) used = Math.max(used, shared);
  }
  const resetMs = win.local.resetMs(key, now) || win.windowMs;
  return { allowed, limit: win.max, remaining: allowed ? Math.max(0, win.max - used) : 0, resetSec: seconds(resetMs) };
}

/**
 * Decides whether a metered /api/cds request may run. On `ok`, merge `headers` into the answer.
 * Never throws for a caller's input; a missing pepper in production is a 503, not a bad key.
 */
export async function admitCdsRequest(request: Request, instance: string, now = Date.now()): Promise<Admission> {
  const presented = presentedKey(request);
  if (presented.kind === "unreadable") {
    logEvent("warn", "cds.api.key_refused", { reason: "unreadable" });
    return {
      ok: false,
      response: toProblemResponse(problemUnauthorized(presented.detail, instance), { "WWW-Authenticate": WWW_AUTHENTICATE }),
    };
  }

  let tier: ApiCallerTier = "anonymous";
  let meterKey: string;
  let keyId: string | undefined;
  if (presented.kind === "key") {
    const verdict = verifyApiKey(presented.key, new Date(now));
    if (!verdict.ok) {
      if (verdict.reason === "unavailable") {
        logEvent("error", "cds.api.keys_unavailable", {});
        return { ok: false, response: toProblemResponse(problemUnavailable(verdict.detail, instance)) };
      }
      logEvent("warn", "cds.api.key_refused", { reason: verdict.reason });
      return {
        ok: false,
        response: toProblemResponse(problemUnauthorized(verdict.detail, instance), { "WWW-Authenticate": WWW_AUTHENTICATE }),
      };
    }
    tier = verdict.tier;
    keyId = verdict.keyId;
    meterKey = verdict.keyId;
  } else {
    meterKey = clientKey(request);
    // Not on Vercel every caller looks the same; refusing that key would refuse everyone.
    if (meterKey === SHARED_CLIENT) return { ok: true, tier, headers: policyHeaders(tier) };
  }

  const m = await meter(tier, meterKey, now);
  const headers = policyHeaders(tier);
  headers.set("RateLimit-Limit", String(m.limit));
  headers.set("RateLimit-Remaining", String(m.remaining));
  headers.set("RateLimit-Reset", String(m.resetSec));

  if (!m.allowed) {
    headers.set("Retry-After", String(m.resetSec));
    logEvent("warn", "cds.api.limited", { tier });
    const detail =
      tier === "anonymous"
        ? `Calls without an API key are limited to ${m.limit} per minute from one address. Try again in ${m.resetSec} seconds, or send an API key.`
        : `This ${API_TIER_BY_ID[tier].name} key is limited to ${m.limit} requests per minute. Try again in ${m.resetSec} seconds.`;
    return { ok: false, response: toProblemResponse(problemTooManyRequests(detail, instance), headers) };
  }

  // The metering record: one line per keyed call, with the key id (never the key) and its tier.
  if (keyId) logEvent("info", "cds.api.call", { tier, keyId, path: instance });
  return { ok: true, tier, headers };
}

/** Copies `res` with `headers` added. */
export function withHeaders(res: Response, headers: Headers): Response {
  const out = new Headers(res.headers);
  headers.forEach((value, name) => out.set(name, value));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}
