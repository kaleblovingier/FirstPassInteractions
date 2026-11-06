import { z } from "zod";

/**
 * Preview session token forwarded by `authMiddleware`. Visible ASCII only, so a
 * forged value cannot inject headers. Non-strings are rejected, not dropped.
 */
export const BearerTokenSchema = z.string().min(1).max(4_096).regex(/^[\x21-\x7E]+$/);

export type BearerCheck = { ok: true; token?: string } | { ok: false };

export function acceptBearerToken(value: unknown): BearerCheck {
  if (value == null || value === "") return { ok: true };
  const parsed = BearerTokenSchema.safeParse(value);
  if (!parsed.success) return { ok: false };
  return { ok: true, token: parsed.data };
}
