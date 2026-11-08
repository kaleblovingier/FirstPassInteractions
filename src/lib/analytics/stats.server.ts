import { STATS_RANGES, type StatsRange, type StatsResult } from "./contract";
import { getSiteStatsFromStore } from "./store.server";
import { pinRefusal } from "../billing/license.server";
import { clientKey } from "../server/rate-limit";

export const STATS_SECURITY_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;

export async function handleGetSiteStats(
  data: { pin: string; days: StatsRange },
  key = clientKey(),
): Promise<StatsResult> {
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "Invalid request payload." };
  }

  const refusal = await pinRefusal(data.pin ?? "", key);
  if (refusal) {
    return { ok: false, reason: refusal };
  }

  const days: StatsRange = STATS_RANGES.includes(data.days) ? data.days : 30;
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

  const key = clientKey(request);

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, reason: "Invalid JSON request payload." },
      { status: 400, headers: STATS_SECURITY_HEADERS },
    );
  }

  if (!body || typeof body !== "object") {
    return Response.json(
      { ok: false, reason: "Invalid request payload." },
      { status: 400, headers: STATS_SECURITY_HEADERS },
    );
  }

  const payload = body as { pin?: unknown; days?: unknown };
  const pin = typeof payload.pin === "string" ? payload.pin : "";
  const refusal = await pinRefusal(pin, key);

  if (refusal) {
    const isRateLimited = refusal.startsWith("Too many wrong PINs");
    const status = isRateLimited ? 429 : 401;
    const headers: Record<string, string> = { ...STATS_SECURITY_HEADERS };

    if (isRateLimited) {
      const match = /(\d+)\s+seconds?/.exec(refusal);
      headers["Retry-After"] = match ? match[1]! : "60";
    }

    return Response.json({ ok: false, reason: refusal }, { status, headers });
  }

  const rawDays = typeof payload.days === "number" ? payload.days : 30;
  const days: StatsRange = STATS_RANGES.includes(rawDays as StatsRange) ? (rawDays as StatsRange) : 30;
  const stats = await getSiteStatsFromStore(days);

  return Response.json({ ok: true, stats }, { status: 200, headers: STATS_SECURITY_HEADERS });
}
