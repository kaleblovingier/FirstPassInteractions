/**
 * HTTP handler for the /api/collect visitor beacon.
 *
 * Guaranteed Privacy Invariants:
 * - Never logs or stores IP addresses, query strings, cookies, or user identifiers.
 * - Extracts and normalizes pathname only (stripping query string and hash).
 * - Extracts referrer hostname only (ignoring self-referrals and query strings).
 * - Classifies user agent into coarse device type ('phone' | 'tablet' | 'desktop') before discarding.
 */

import { type Device, type CollectBody, MAX_PATH_LENGTH } from "./contract";
import { recordPageView } from "./store.server";
import { clientKey, SHARED_CLIENT, SlidingWindow } from "../server/rate-limit";

export const COLLECT_RATE_LIMIT = {
  max: 120,
  sharedMax: 1_200,
  windowMs: 60 * 1000,
  maxKeys: 10_000,
} as const;

const clientLimiter = new SlidingWindow(
  COLLECT_RATE_LIMIT.max,
  COLLECT_RATE_LIMIT.windowMs,
  COLLECT_RATE_LIMIT.maxKeys,
);

const sharedLimiter = new SlidingWindow(
  COLLECT_RATE_LIMIT.sharedMax,
  COLLECT_RATE_LIMIT.windowMs,
  1,
);

/** Test hook: forget rate limiter hit history across both buckets. */
export function resetCollectLimiter(): void {
  clientLimiter.reset();
  sharedLimiter.reset();
}

export function parseDevice(ua: string): Device {
  const lower = ua.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(lower)) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(lower)) return "phone";
  return "desktop";
}

export function sanitizePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Extract path only, stripping query string and fragment
  const pathOnly = trimmed.split("?")[0]!.split("#")[0]!;
  if (!pathOnly.startsWith("/")) return null;

  return pathOnly.slice(0, MAX_PATH_LENGTH);
}

export function sanitizeReferrer(raw: unknown, requestHost?: string | null): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!host) return "";

    // Ignore localhost, loopbacks, and same-host referrals
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "";
    if (requestHost) {
      const cleanReqHost = requestHost.toLowerCase().replace(/^www\./, "").split(":")[0];
      if (host === cleanReqHost) return "";
    }
    return host.slice(0, 100);
  } catch {
    return "";
  }
}

export function extractCountry(request: Request): string {
  const raw =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    "";
  const upper = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : "";
}

export async function handleCollectRequest(request: Request, now = Date.now()): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }

  const ip = clientKey(request);
  const limiter = ip === SHARED_CLIENT ? sharedLimiter : clientLimiter;
  if (!limiter.take(ip, now)) {
    const retryAfterSec = Math.max(1, Math.ceil(limiter.resetMs(ip, now) / 1000));
    return new Response(null, {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  try {
    const body = (await request.json().catch(() => null)) as CollectBody | null;
    if (!body || typeof body !== "object") {
      return new Response(null, { status: 204 });
    }

    const path = sanitizePath(body.path);
    if (!path) {
      return new Response(null, { status: 204 });
    }

    const hostHeader = request.headers.get("host");
    const referrerHost = sanitizeReferrer(body.referrer, hostHeader);
    const ua = request.headers.get("user-agent") || "";
    const device = parseDevice(ua);
    const country = extractCountry(request);

    // Record view asynchronously in the background
    void recordPageView({
      path,
      referrerHost,
      country,
      device,
      ip,
      userAgent: ua,
      now,
    });

    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}
