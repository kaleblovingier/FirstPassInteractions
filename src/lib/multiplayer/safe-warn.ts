/**
 * Client-safe warning for the p2p layer: logs a static label plus only the
 * error's class name and short code (via safeErrorFields), never the message,
 * stack, SDP/ICE candidate text, peer ids or URLs.
 */
import { safeErrorFields } from "../server/safe-log";

/** `label` must be a static string. */
export function warnSafe(label: string, err: unknown): void {
  const f = safeErrorFields(err);
  console.warn(label, f.errorCode ? `${f.errorName} (${f.errorCode})` : f.errorName);
}
