import { createServerFn } from "@tanstack/react-start";
import { STATS_RANGES, type StatsRange, type StatsResult } from "./contract";

export const MAX_PIN_LENGTH = 128;

export interface StatsInput {
  pin: string;
  days: StatsRange;
}

/**
 * Returns true if `value` contains any ASCII or C1 Unicode control character
 * (`\u0000-\u001f`, `\u007f-\u009f`).
 */
export function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

/**
 * Runtime validation and normalization for `getSiteStats` RPC input.
 * Rejects non-objects, arrays, unexpected keys, control characters, empty/oversized PINs,
 * and unsupported time ranges.
 */
export function validateStatsInput(input: unknown): StatsInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid stats request payload.");
  }

  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error("Invalid stats request payload.");
  }

  const record = input as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== "pin" && key !== "days") {
      throw new Error("Unexpected field in stats request.");
    }
  }

  const rawPin = Object.hasOwn(record, "pin") ? record.pin : undefined;
  if (typeof rawPin !== "string") {
    throw new Error("Operator PIN must be a string.");
  }
  if (rawPin.length > MAX_PIN_LENGTH) {
    throw new Error("Operator PIN exceeds maximum length.");
  }
  if (hasControlChar(rawPin)) {
    throw new Error("Operator PIN contains invalid characters.");
  }
  const pin = rawPin.trim();
  if (!pin) {
    throw new Error("Operator PIN is required.");
  }

  const rawDays = Object.hasOwn(record, "days") ? record.days : undefined;
  if (rawDays === undefined) {
    return { pin, days: 30 };
  }
  if (
    typeof rawDays !== "number" ||
    !Number.isInteger(rawDays) ||
    !(STATS_RANGES as readonly number[]).includes(rawDays)
  ) {
    throw new Error("Invalid stats range.");
  }

  return { pin, days: rawDays as StatsRange };
}

/**
 * Owner-only visitor stats for the Foundry. The server checks the operator PIN before reading.
 */
export const getSiteStats = createServerFn({ method: "POST" })
  .validator((input: unknown) => validateStatsInput(input))
  .handler(async ({ data }): Promise<StatsResult> => {
    const { handleGetSiteStats } = await import("./stats.server");
    return handleGetSiteStats(data);
  });
