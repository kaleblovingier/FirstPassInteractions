import { z } from "zod";

/** Compact JWS: three base64url segments, bounded so a huge header never reaches jose. */
const segment = "[A-Za-z0-9_-]{1,4096}={0,2}";
export const GateIdentityTokenSchema = z.string().regex(new RegExp(`^${segment}\\.${segment}\\.${segment}$`));

export function readGateIdentityToken(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const parsed = GateIdentityTokenSchema.safeParse(raw.trim());
  return parsed.success ? parsed.data : null;
}
