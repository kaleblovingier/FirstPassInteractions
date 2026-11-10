import { STATS_RANGES, type StatsRange, type StatsResult } from "./contract";
import { readBoundedBody } from "./collect.server";
import { getSiteStatsFromStore } from "./store.server";
import { pinRefusal } from "../billing/license.server";
import { clientKey } from "../server/rate-limit";

export const STATS_SECURITY_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;

export const MAX_STATS_BODY_BYTES = 1024;
export const MAX_PIN_LENGTH = 128;

function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function validatePinShape(raw: unknown): { ok: true; pin: string } | { ok: false; reason: string } {
  if (typeof raw !== "string") {
    return { ok: false, reason: "Operator PIN is required." };
  }
  if (raw.length > MAX_PIN_LENGTH) {
    return { ok: false, reason: "Operator PIN exceeds maximum length." };
  }
  if (hasControlChar(raw)) {
    return { ok: false, reason: "Invalid operator PIN." };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reason: "Operator PIN is required." };
  }
  return { ok: true, pin: trimmed };
}

function resolveDays(raw: unknown): StatsRange {
  return typeof raw === "number" && STATS_RANGES.includes(raw as StatsRange)
    ? (raw as StatsRange)
    : 30;
}

function parseRetryAfterSeconds(refusal: string): string {
  const secMatch = /(\d+)\s+seconds?/.exec(refusal);
  if (secMatch) return secMatch[1]!;
  const minMatch = /(\d+)\s+minutes?/.exec(refusal);
  if (minMatch) return String(Number(minMatch[1]) * 60);
  return "60";
}

function statsJson(
  payload: unknown,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  const headers = extraHeaders
    ? { ...STATS_SECURITY_HEADERS, ...extraHeaders }
    : STATS_SECURITY_HEADERS;
  return Response.json(payload, { status, headers });
}

export async function handleGetSiteStats(
  data: { pin: string; days: StatsRange },
  key = clientKey(),
): Promise<StatsResult> {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, reason: "Invalid request payload." };
  }

  const checkedPin = validatePinShape(Object.hasOwn(data, "pin") ? data.pin : undefined);
  if (!checkedPin.ok) {
    return { ok: false, reason: checkedPin.reason };
  }

  const refusal = await pinRefusal(checkedPin.pin, key);
  if (refusal) {
    return { ok: false, reason: refusal };
  }

  const days = resolveDays(Object.hasOwn(data, "days") ? data.days : undefined);
  const stats = await getSiteStatsFromStore(days);
  return { ok: true, stats };
}

export async function handleStatsRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, {
      status: 405,
      headers: {
        Allow: "POST",
        ...STATS_SECURITY_HEADERS,
      },
    });
  }

  const bodyResult = await readBoundedBody(request, MAX_STATS_BODY_BYTES);
  if (!bodyResult.ok) {
    const status = bodyResult.reason === "too-large" ? 413 : 400;
    const reason =
      bodyResult.reason === "too-large" ? "Request payload too large." : "Invalid request payload.";
    return statsJson({ ok: false, reason }, status);
  }

  let body: unknown = null;
  try {
    body = JSON.parse(bodyResult.text);
  } catch {
    return statsJson({ ok: false, reason: "Invalid JSON request payload." }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return statsJson({ ok: false, reason: "Invalid request payload." }, 400);
  }

  const payload = body as Record<string, unknown>;
  for (const field of Object.keys(payload)) {
    if (field !== "pin" && field !== "days") {
      return statsJson({ ok: false, reason: "Unexpected field in request payload." }, 400);
    }
  }

  const checkedPin = validatePinShape(Object.hasOwn(payload, "pin") ? payload.pin : undefined);
  if (!checkedPin.ok) {
    return statsJson({ ok: false, reason: checkedPin.reason }, 400);
  }

  const key = clientKey(request);
  const refusal = await pinRefusal(checkedPin.pin, key);

  if (refusal) {
    const isRateLimited = refusal.startsWith("Too many wrong PINs");
    const status = isRateLimited ? 429 : 401;
    const extraHeaders = isRateLimited
      ? { "Retry-After": parseRetryAfterSeconds(refusal) }
      : undefined;

    return statsJson({ ok: false, reason: refusal }, status, extraHeaders);
  }

  const days = resolveDays(Object.hasOwn(payload, "days") ? payload.days : undefined);
  const stats = await getSiteStatsFromStore(days);

  return statsJson({ ok: true, stats }, 200);
}
