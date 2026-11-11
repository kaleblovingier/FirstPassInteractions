/**
 * HTTP handler for the /api/collect visitor beacon.
 *
 * Guaranteed Privacy Invariants:
 * - Never logs or stores IP addresses, query strings, cookies, or user identifiers.
 * - Extracts and normalizes pathname only (stripping query string and hash).
 * - Extracts referrer hostname only (ignoring self-referrals and query strings).
 * - Classifies user agent into coarse device type ('phone' | 'tablet' | 'desktop') before discarding.
 */

import { type Device, MAX_PATH_LENGTH } from "./contract";
import { recordPageView } from "./store.server";
import { clientKey, SHARED_CLIENT, SlidingWindow } from "../server/rate-limit";

export const COLLECT_SECURITY_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;

export const MAX_COLLECT_BYTES = 4096;

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

function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

export function sanitizePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  // Extract path only, stripping query string and fragment before control-char / backslash checks
  const pathOnly = raw.split("?")[0]!.split("#")[0]!;
  if (hasControlChar(pathOnly) || pathOnly.includes("\\")) return null;

  const trimmed = pathOnly.trim();
  if (!trimmed || !trimmed.startsWith("/")) return null;

  return trimmed.slice(0, MAX_PATH_LENGTH);
}

function normalizeHostname(rawHost: string): string {
  if (hasControlChar(rawHost)) return "";
  const trimmed = rawHost.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`);
    return parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.+$/, "");
  } catch {
    return trimmed
      .toLowerCase()
      .split(":")[0]!
      .replace(/^www\./, "")
      .replace(/\.+$/, "");
  }
}

export function sanitizeReferrer(raw: unknown, requestHost?: string | null): string {
  if (typeof raw !== "string" || hasControlChar(raw)) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const host = url.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.+$/, "");
    if (!host || hasControlChar(host)) return "";

    // Ignore localhost, loopbacks, and same-host referrals
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]"
    ) {
      return "";
    }
    if (requestHost) {
      const cleanReqHost = normalizeHostname(requestHost);
      if (cleanReqHost && host === cleanReqHost) return "";
    }
    return host.slice(0, 100);
  } catch {
    return "";
  }
}

export function extractCountry(request: Request): string {
  const raw =
    request.headers.get("x-vercel-ip-country")?.trim() ||
    request.headers.get("cf-ipcountry")?.trim() ||
    "";
  const upper = raw.toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : "";
}

export type BoundedBodyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too-large" | "invalid-content-length" | "read-error" };

/** Validates an explicit Content-Length header against a byte cap without reading the stream. */
export function checkContentLength(
  request: Request,
  maxBytes: number,
): "ok" | "too-large" | "invalid" {
  const rawLength = request.headers.get("content-length");
  if (rawLength === null) return "ok";
  const trimmed = rawLength.trim();
  if (!/^\d+$/.test(trimmed)) return "invalid";
  const declared = Number(trimmed);
  if (!Number.isSafeInteger(declared) || declared > maxBytes) return "too-large";
  return "ok";
}

/**
 * Reads a request body as UTF-8 up to `maxBytes`, aborting the underlying stream
 * as soon as the cap is exceeded so oversized payloads cannot flood heap memory.
 */
export async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<BoundedBodyResult> {
  const headerCheck = checkContentLength(request, maxBytes);
  if (headerCheck !== "ok") {
    void request.body?.cancel().catch(() => {});
    return {
      ok: false,
      reason: headerCheck === "too-large" ? "too-large" : "invalid-content-length",
    };
  }

  if (!request.body) {
    return { ok: true, text: "" };
  }

  try {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }

    if (total === 0) return { ok: true, text: "" };
    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, text: new TextDecoder().decode(buffer) };
  } catch {
    return { ok: false, reason: "read-error" };
  }
}

function emptyCollectResponse(status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(null, {
    status,
    headers: extraHeaders
      ? { ...COLLECT_SECURITY_HEADERS, ...extraHeaders }
      : COLLECT_SECURITY_HEADERS,
  });
}

function isAllowedCollectContentType(header: string | null): boolean {
  if (header === null) return true;
  const mime = header.split(";")[0]?.trim().toLowerCase() ?? "";
  return mime === "" || mime === "application/json" || mime === "text/plain";
}

export async function handleCollectRequest(request: Request, now = Date.now()): Promise<Response> {
  if (request.method !== "POST") {
    return emptyCollectResponse(405, { Allow: "POST" });
  }

  const ip = clientKey(request);
  const limiter = ip === SHARED_CLIENT ? sharedLimiter : clientLimiter;
  if (!limiter.take(ip, now)) {
    const retryAfterSec = Math.max(1, Math.ceil(limiter.resetMs(ip, now) / 1000));
    return emptyCollectResponse(429, { "Retry-After": String(retryAfterSec) });
  }

  try {
    // Reject oversized Content-Length before checking or buffering anything further.
    const lengthCheck = checkContentLength(request, MAX_COLLECT_BYTES);
    if (lengthCheck === "too-large") {
      void request.body?.cancel().catch(() => {});
      return emptyCollectResponse(413);
    }
    if (lengthCheck === "invalid") {
      void request.body?.cancel().catch(() => {});
      return emptyCollectResponse(400);
    }

    if (!isAllowedCollectContentType(request.headers.get("content-type"))) {
      void request.body?.cancel().catch(() => {});
      return emptyCollectResponse(415);
    }

    const bodyResult = await readBoundedBody(request, MAX_COLLECT_BYTES);
    if (!bodyResult.ok) {
      if (bodyResult.reason === "too-large") return emptyCollectResponse(413);
      if (bodyResult.reason === "invalid-content-length") return emptyCollectResponse(400);
      return emptyCollectResponse(204);
    }

    let body: unknown = null;
    try {
      body = JSON.parse(bodyResult.text);
    } catch {
      return emptyCollectResponse(204);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return emptyCollectResponse(204);
    }

    const record = body as Record<string, unknown>;
    const path = sanitizePath(Object.hasOwn(record, "path") ? record.path : undefined);
    if (!path) {
      return emptyCollectResponse(204);
    }

    const hostHeader = request.headers.get("host");
    const referrerHost = sanitizeReferrer(
      Object.hasOwn(record, "referrer") ? record.referrer : undefined,
      hostHeader,
    );
    const ua = request.headers.get("user-agent") || "";
    const device = parseDevice(ua);
    const country = extractCountry(request);

    // Await store write (bounded by ANALYTICS_STORE_TIMEOUT_MS) so serverless runtimes
    // flush the INSERT before returning the 204 response.
    try {
      await recordPageView({
        path,
        referrerHost,
        country,
        device,
        ip,
        userAgent: ua,
        now,
      });
    } catch {
      // recordPageView logs and handles store failures; never break the beacon response.
    }

    return emptyCollectResponse(204);
  } catch {
    return emptyCollectResponse(204);
  }
}
