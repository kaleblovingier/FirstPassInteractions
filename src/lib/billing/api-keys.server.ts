/**
 * API keys (FP-API-…): mint and verify. The shape and tiers are in ./api-tiers.
 *
 * Deterministic and stateless like program keys: the same organization, tier and end month always
 * give the same key, and verifying needs only LICENSE_PEPPER. Payloads are tagged "API:" / "api:",
 * so an API key never verifies as a program or desk license, and the reverse.
 */
import {
  API_KEY_RE,
  API_TIER_BY_ID,
  API_TIER_FROM_LETTER,
  API_TIER_LETTER,
  isApiTierId,
  type ApiTierId,
  type ApiTierLetter,
} from "./api-tiers";
import { defaultPepperSet, defaultPinSet, pepperDigest, pepperSig, pinOk, sameSecret } from "./license.server";
import {
  PROGRAM_ORG_MAX,
  displayOrgName,
  formatEndDay,
  isValidEndMonth,
  monthsAhead,
  normalizeOrgName,
  parseEndMonth,
} from "./program-license";
import { programKeyEndsAt } from "./programs";

export type ApiKeyRefusal = "malformed" | "signature" | "expired" | "too-far" | "unavailable";

export type ApiKeyVerdict =
  | {
      ok: true;
      tier: ApiTierId;
      /** "E202712-1A2B3C4D": tier, end month and body. Not a credential (no signature); safe to log and to meter on. */
      keyId: string;
      endsAt: Date;
    }
  | { ok: false; reason: ApiKeyRefusal; detail: string };

function apiBody(org: string): string {
  return pepperDigest(`api:${normalizeOrgName(org)}`);
}

function apiSig(letter: ApiTierLetter, yyyymm: string, body: string): string {
  return pepperSig(`API:${letter}${yyyymm}:${body}`);
}

/**
 * Mints the API key for an organization, tier and last month (1-12). Throws a plain message when
 * the input cannot make a key, or when LICENSE_PEPPER is unset in production.
 */
export function mintApiKey(tier: ApiTierId, org: string, endYear: number, endMonth: number, now: Date = new Date()): string {
  if (!isApiTierId(tier)) throw new Error("Pick an API tier: Developer or Education.");
  const name = displayOrgName(org);
  if (!name) throw new Error("Add the organization name.");
  if (name.length > PROGRAM_ORG_MAX) {
    throw new Error(`Keep the organization name to ${PROGRAM_ORG_MAX} characters or fewer.`);
  }
  if (!isValidEndMonth(endYear, endMonth)) throw new Error("Pick a real end month.");
  const ahead = monthsAhead(endYear, endMonth, now);
  if (ahead < 0) throw new Error("That end month has already passed.");
  const cap = API_TIER_BY_ID[tier].maxMonthsAhead;
  if (ahead > cap) throw new Error(`Pick an end month within ${cap} months for a ${API_TIER_BY_ID[tier].name} key.`);
  const letter = API_TIER_LETTER[tier];
  const yyyymm = `${endYear}${String(endMonth).padStart(2, "0")}`;
  const body = apiBody(name);
  return `FP-API-${letter}${yyyymm}-${body}-${apiSig(letter, yyyymm, body)}`;
}

/** Checks a presented key. Never throws: a missing pepper in production is `unavailable`, not a bad key. */
export function verifyApiKey(raw: string, now: Date = new Date()): ApiKeyVerdict {
  const fail = (reason: ApiKeyRefusal, detail: string): ApiKeyVerdict => ({ ok: false, reason, detail });
  const key = raw.trim().toUpperCase().replace(/\s+/g, "");
  const m = API_KEY_RE.exec(key);
  if (!m) return fail("malformed", "That is not a FirstPass API key. Keys look like FP-API-E202712-XXXXXXXX-XXXXXXXX.");
  const letter = m[1] as ApiTierLetter;
  const year = Number(m[2]);
  const month = Number(m[3]);
  const body = m[4]!;
  const sig = m[5]!;
  if (!isValidEndMonth(year, month)) return fail("malformed", "That API key has an end month that does not exist.");
  let expect: string;
  try {
    expect = apiSig(letter, `${m[2]}${m[3]}`, body);
  } catch {
    return fail("unavailable", "API keys cannot be checked right now.");
  }
  if (!sameSecret(sig, expect)) return fail("signature", "That API key does not verify.");
  const tier = API_TIER_FROM_LETTER[letter];
  if (monthsAhead(year, month, now) > API_TIER_BY_ID[tier].maxMonthsAhead) {
    return fail("too-far", "That API key ends further out than its tier allows. Ask for a fresh key.");
  }
  const endsAt = programKeyEndsAt(year, month);
  if (now.getTime() > endsAt.getTime()) {
    return fail("expired", `This API key ended on ${formatEndDay(endsAt)}. Ask for the renewed key.`);
  }
  return { ok: true, tier, keyId: `${letter}${m[2]}${m[3]}-${body}`, endsAt };
}

export type ApiMintResult =
  | {
      ok: true;
      key: string;
      tier: ApiTierId;
      org: string;
      endsAt: string;
      defaultPin: boolean;
      defaultPepper: boolean;
    }
  | { ok: false; reason: string };

/** Foundry's API key mint: operator PIN first (same throttle as every mint), then tier, organization and end month ("YYYY-MM"). */
export async function mintApiKeyForOperator(
  input: { pin: string; tier: string; org: string; end: string },
  now: Date = new Date(),
): Promise<ApiMintResult> {
  try {
    if (!(await pinOk(input.pin))) return { ok: false, reason: "Operator PIN is wrong." };
    if (!isApiTierId(input.tier)) return { ok: false, reason: "Pick an API tier: Developer or Education." };
    const org = displayOrgName(input.org);
    if (!org) return { ok: false, reason: "Add the organization name." };
    const end = parseEndMonth(input.end);
    if (!end) return { ok: false, reason: "Pick the last month the key should work." };
    const key = mintApiKey(input.tier, org, end.year, end.month, now);
    return {
      ok: true,
      key,
      tier: input.tier,
      org,
      endsAt: programKeyEndsAt(end.year, end.month).toISOString(),
      defaultPin: defaultPinSet(),
      defaultPepper: defaultPepperSet(),
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "License secrets are not configured." };
  }
}
