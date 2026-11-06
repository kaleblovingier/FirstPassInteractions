import { z } from "zod";
import { GROK_PROVIDERS } from "./providers";

const providerIds = GROK_PROVIDERS.map((p) => p.providerId) as [string, ...string[]];

/** Only providers this app actually registers. The raw query value is never echoed. */
export const PopupProviderIdSchema = z.enum(providerIds);

const safeErrorCode = z.string().regex(/^[A-Za-z0-9_.:-]{1,80}$/);

export function readPopupProviderId(raw: string | null): string | null {
  const parsed = PopupProviderIdSchema.safeParse(raw?.trim());
  return parsed.success ? parsed.data : null;
}

/** Query and upstream error text reflected into the popup page. Unsafe text becomes the fallback. */
export function publicAuthError(raw: string | null | undefined, fallback = "sign_in_failed"): string {
  if (typeof raw !== "string") return fallback;
  const parsed = safeErrorCode.safeParse(raw.trim());
  return parsed.success ? parsed.data : fallback;
}
