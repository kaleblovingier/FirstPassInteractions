import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env.server";
import {
  PROGRAM_KEY_RE,
  PROGRAM_TIER_FROM_LETTER,
  PROGRAM_TIER_LETTER,
  isProgramTierId,
  programKeyEndsAt,
  type ProgramTierId,
} from "./programs";
import {
  PROGRAM_MAX_MONTHS_AHEAD,
  PROGRAM_ORG_MAX,
  displayOrgName,
  formatEndDay,
  isValidEndMonth,
  monthsAhead,
  normalizeOrgName,
  parseEndMonth,
  type ProgramGrant,
} from "./program-license";

export type IssuedPlan = "pro" | "lab" | "life";

export interface VerifyResult {
  ok: boolean;
  plan: "pro" | "lab";
  lifetime: boolean;
  license: string;
  reason?: string;
  /** Set only for a verified, unexpired program key (FP-ORG-…). */
  program?: ProgramGrant;
}

const DEFAULT_PEPPER = "firstpass-heme-license-v1";
const DEFAULT_PIN = "heme-450";
const BATCH_CAP = 40;

/** Deployed / production must set real secrets — defaults never work there. */
export function licenseSecretsRequired(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(env("GROK_PROJECT_ID"));
}

function resolvePepper(): string {
  const v = env("LICENSE_PEPPER");
  if (v) return v;
  if (licenseSecretsRequired()) {
    throw new Error(
      "LICENSE_PEPPER is unset. Refusing to mint or verify keys with the default pepper in production.",
    );
  }
  return DEFAULT_PEPPER;
}

function resolvePin(): string {
  const v = env("FOUNDER_PIN");
  if (v) return v;
  if (licenseSecretsRequired()) {
    throw new Error(
      "FOUNDER_PIN is unset. Refusing to accept the default operator PIN in production.",
    );
  }
  return DEFAULT_PIN;
}

function hmac(payload: string) {
  return createHmac("sha256", resolvePepper()).update(payload).digest("hex").slice(0, 8).toUpperCase();
}

function safeEq(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

export function pinOk(pin: string) {
  return safeEq(pin.trim(), resolvePin());
}

export function defaultPinSet() {
  return !env("FOUNDER_PIN");
}

export function defaultPepperSet() {
  return !env("LICENSE_PEPPER");
}

export function parseIssuedPlan(raw: string): IssuedPlan {
  if (raw === "lab" || raw === "life" || raw === "pro") return raw;
  return "life";
}

export function parseNameList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,;]+/)) {
    const name = part.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= BATCH_CAP) break;
  }
  return out;
}

export function mintKey(plan: IssuedPlan): string {
  const body = randomBytes(4).toString("hex").toUpperCase();
  const tag = plan.toUpperCase();
  const sig = hmac(`${tag}:${body}`);
  return `FP-${tag}-${body}-${sig}`;
}

export function mintKeys(plan: IssuedPlan, count: number): string[] {
  const n = Math.max(1, Math.min(BATCH_CAP, Math.floor(count) || 1));
  return Array.from({ length: n }, () => mintKey(plan));
}

export function mintKeyedRows(plan: IssuedPlan, names: string[]): Array<{ key: string; soldTo: string }> {
  return names.slice(0, BATCH_CAP).map((soldTo) => ({
    soldTo,
    key: soldTo.trim() ? mintKeyFromNote(plan, soldTo) : mintKey(plan),
  }));
}

/** Deterministic key for a paid Stripe session — claiming twice yields the same string. */
export function mintKeyFromPaid(plan: IssuedPlan, sessionId: string): string {
  const body = createHmac("sha256", resolvePepper())
    .update(`stripe:${sessionId.trim()}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  const tag = plan.toUpperCase();
  const sig = hmac(`${tag}:${body}`);
  return `FP-${tag}-${body}-${sig}`;
}

export function mintKeyFromNote(plan: IssuedPlan, note: string): string {
  return mintKeyFromPaid(plan, `note:${note.trim().toLowerCase().replace(/\s+/g, " ")}`);
}

export function verifyKey(raw: string, now: Date = new Date()): VerifyResult {
  try {
    const key = raw.trim().toUpperCase().replace(/\s+/g, "");
    if (key.startsWith("FP-ORG-")) return verifyProgramKey(key, now);
    const m = /^FP-(PRO|LAB|LIFE)-([0-9A-F]{8})-([0-9A-F]{8})$/.exec(key);
    if (!m) {
      return { ok: false, plan: "pro", lifetime: false, license: "", reason: "Not a FirstPass key." };
    }
    const tag = m[1] as "PRO" | "LAB" | "LIFE";
    const body = m[2];
    const sig = m[3];
    const expect = hmac(`${tag}:${body}`);
    if (!safeEq(sig, expect)) {
      return { ok: false, plan: "pro", lifetime: false, license: "", reason: "Signature does not verify." };
    }
    if (tag === "LIFE") return { ok: true, plan: "lab", lifetime: true, license: key };
    if (tag === "LAB") return { ok: true, plan: "lab", lifetime: false, license: key };
    return { ok: true, plan: "pro", lifetime: false, license: key };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "License secrets are not configured.";
    return { ok: false, plan: "pro", lifetime: false, license: "", reason: msg };
  }
}

/* ---------------------------------------------------------------------------
 * Program keys: FP-ORG-<T><YYYYMM>-<BODY>-<SIG> (contract in ./programs).
 * One key a whole program redeems. It unlocks what Founding ("lab") unlocks
 * through the last millisecond of the end month, UTC, and then stops.
 * ------------------------------------------------------------------------- */

/** BODY: 8 hex from the normalized organization name, keyed with the pepper. */
function programBody(org: string): string {
  return createHmac("sha256", resolvePepper())
    .update(`org:${normalizeOrgName(org)}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}

/**
 * Mints the program key for an organization, tier and last month (1-12).
 * Same org + tier + end month always gives the same key. Throws a plain
 * message when the input cannot make a key.
 */
export function mintProgramKey(
  tier: ProgramTierId,
  org: string,
  endYear: number,
  endMonth: number,
  now: Date = new Date(),
): string {
  if (!isProgramTierId(tier)) throw new Error("Pick a tier: Team, Program or Site.");
  const name = displayOrgName(org);
  if (!name) throw new Error("Add the organization name.");
  if (name.length > PROGRAM_ORG_MAX) {
    throw new Error(`Keep the organization name to ${PROGRAM_ORG_MAX} characters or fewer.`);
  }
  if (!isValidEndMonth(endYear, endMonth)) throw new Error("Pick a real end month.");
  const ahead = monthsAhead(endYear, endMonth, now);
  if (ahead < 0) throw new Error("That end month has already passed.");
  if (ahead > PROGRAM_MAX_MONTHS_AHEAD) throw new Error("Pick an end month within five years.");
  const letter = PROGRAM_TIER_LETTER[tier];
  const yyyymm = `${endYear}${String(endMonth).padStart(2, "0")}`;
  const body = programBody(name);
  const sig = hmac(`ORG:${letter}${yyyymm}:${body}`);
  return `FP-ORG-${letter}${yyyymm}-${body}-${sig}`;
}

function verifyProgramKey(key: string, now: Date): VerifyResult {
  const fail = (reason: string): VerifyResult => ({ ok: false, plan: "pro", lifetime: false, license: "", reason });
  const m = PROGRAM_KEY_RE.exec(key);
  if (!m) return fail("Not a FirstPass key.");
  const letter = m[1] as "T" | "P" | "S";
  const year = Number(m[2]);
  const month = Number(m[3]);
  const body = m[4];
  const sig = m[5];
  if (!isValidEndMonth(year, month)) return fail("That program key has an end month that does not exist.");
  const expect = hmac(`ORG:${letter}${m[2]}${m[3]}:${body}`);
  if (!safeEq(sig, expect)) return fail("Signature does not verify.");
  if (monthsAhead(year, month, now) > PROGRAM_MAX_MONTHS_AHEAD) {
    return fail("That program key ends more than five years out. Ask your program lead for a fresh key.");
  }
  const endsAt = programKeyEndsAt(year, month);
  if (now.getTime() > endsAt.getTime()) {
    return fail(`This program key ended on ${formatEndDay(endsAt)}. Ask your program lead for the renewed key.`);
  }
  return {
    ok: true,
    plan: "lab",
    lifetime: false,
    license: key,
    program: { tier: PROGRAM_TIER_FROM_LETTER[letter], endsAt: endsAt.toISOString() },
  };
}

export type ProgramMintResult =
  | {
      ok: true;
      key: string;
      tier: ProgramTierId;
      org: string;
      endsAt: string;
      defaultPin: boolean;
      defaultPepper: boolean;
    }
  | { ok: false; reason: string };

/** Foundry's program mint: PIN first, then tier, organization and end month ("YYYY-MM"). */
export function mintProgramForOperator(
  input: { pin: string; tier: string; org: string; end: string },
  now: Date = new Date(),
): ProgramMintResult {
  try {
    if (!pinOk(input.pin)) {
      return { ok: false, reason: "Operator PIN is wrong." };
    }
    if (!isProgramTierId(input.tier)) {
      return { ok: false, reason: "Pick a tier: Team, Program or Site." };
    }
    const org = displayOrgName(input.org);
    if (!org) return { ok: false, reason: "Add the organization name." };
    if (org.length > PROGRAM_ORG_MAX) {
      return { ok: false, reason: `Keep the organization name to ${PROGRAM_ORG_MAX} characters or fewer.` };
    }
    const end = parseEndMonth(input.end);
    if (!end) return { ok: false, reason: "Pick the last month the key should work." };
    const key = mintProgramKey(input.tier, org, end.year, end.month, now);
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
    const msg = e instanceof Error ? e.message : "License secrets are not configured.";
    return { ok: false, reason: msg };
  }
}
