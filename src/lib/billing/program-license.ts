/**
 * Client-safe helpers for program license keys (FP-ORG-…).
 *
 * The key shape and tiers live in ./programs (the shared contract). Signing and
 * verifying live in ./license.server. This file holds the plain parts both
 * sides need: end-month math, date wording, the desk label and the onboarding
 * note Foundry hands to a program lead. No secrets, no Node APIs.
 */
import {
  PROGRAM_KEY_RE,
  PROGRAM_TIER_BY_ID,
  PROGRAM_TIER_FROM_LETTER,
  isProgramTierId,
  programKeyEndsAt,
  type ProgramTierId,
} from "./programs";

/** What a verified program key grants: a tier and the last moment it works (ISO, UTC). */
export interface ProgramGrant {
  tier: ProgramTierId;
  endsAt: string;
}

/** A program key may end at most this many months after the current month. */
export const PROGRAM_MAX_MONTHS_AHEAD = 60;

/** Organization names longer than this are refused at mint. */
export const PROGRAM_ORG_MAX = 120;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Trim, lowercase and collapse whitespace: the form the key body is derived from. */
export function normalizeOrgName(org: string): string {
  return org.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Trim and collapse whitespace, keeping the operator's capitals for display. */
export function displayOrgName(org: string): string {
  return org.trim().replace(/\s+/g, " ");
}

/** A real calendar month in a four-digit year. */
export function isValidEndMonth(year: number, month: number): boolean {
  return Number.isInteger(year) && Number.isInteger(month) && year >= 2000 && year <= 9999 && month >= 1 && month <= 12;
}

/** Whole months from the current UTC month to the given month (0 = this month, negative = past). */
export function monthsAhead(year: number, month: number, now: Date): number {
  return year * 12 + (month - 1) - (now.getUTCFullYear() * 12 + now.getUTCMonth());
}

/** Parses an `<input type="month">` value ("2027-03"). */
export function parseEndMonth(raw: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return isValidEndMonth(year, month) ? { year, month } : null;
}

export function endMonthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Default end month for a new key: the month 12 months from now (UTC). */
export function defaultProgramEndMonth(now: Date = new Date()): string {
  const total = now.getUTCFullYear() * 12 + now.getUTCMonth() + 12;
  return endMonthValue(Math.floor(total / 12), (total % 12) + 1);
}

function utc(endsAt: string | Date): Date {
  return typeof endsAt === "string" ? new Date(endsAt) : endsAt;
}

/** "Mar 2027" (short) or "March 2027" (long), read in UTC like the key itself. */
export function formatEndMonth(endsAt: string | Date, style: "short" | "long" = "short"): string {
  const d = utc(endsAt);
  const name = MONTHS[d.getUTCMonth()];
  return `${style === "short" ? name.slice(0, 3) : name} ${d.getUTCFullYear()}`;
}

/** "March 31, 2027": the last day the key works. */
export function formatEndDay(endsAt: string | Date): string {
  const d = utc(endsAt);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** True once `now` is past the last millisecond of the end month. */
export function programEnded(grant: ProgramGrant, now: number = Date.now()): boolean {
  const end = Date.parse(grant.endsAt);
  return !Number.isFinite(end) || now > end;
}

/** Tier and end month read straight from a program key string, or null for any other key. */
export function programFromLicense(license: string | null | undefined): ProgramGrant | null {
  if (!license) return null;
  const m = PROGRAM_KEY_RE.exec(license.trim().toUpperCase());
  if (!m) return null;
  const year = Number(m[2]);
  const month = Number(m[3]);
  if (!isValidEndMonth(year, month)) return null;
  return {
    tier: PROGRAM_TIER_FROM_LETTER[m[1] as "T" | "P" | "S"],
    endsAt: programKeyEndsAt(year, month).toISOString(),
  };
}

/** Accepts a saved grant only if it has a known tier and a real end date. */
export function normalizeProgramGrant(raw: unknown): ProgramGrant | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isProgramTierId(r.tier) || typeof r.endsAt !== "string") return null;
  if (!Number.isFinite(Date.parse(r.endsAt))) return null;
  return { tier: r.tier, endsAt: r.endsAt };
}

/** "Program license (Team) · through Mar 2027" */
export function programLicenseLabel(grant: ProgramGrant): string {
  return `Program license (${PROGRAM_TIER_BY_ID[grant.tier].name}) · through ${formatEndMonth(grant.endsAt)}`;
}

/** The one line the desk shows after a program license ends. */
export function programEndedNote(grant: ProgramGrant): string {
  return `Your program key ended on ${formatEndDay(grant.endsAt)}, so this desk is back to free. Ask your program lead for the renewed key and redeem it on Plans.`;
}

function seatLine(tier: ProgramTierId, org: string): string {
  const seats = PROGRAM_TIER_BY_ID[tier].seats;
  return seats === null
    ? `Seats: anyone at ${org} may use this key. Please keep it inside the organization.`
    : `Seats: up to ${seats} people. Please share the key only with the people this license covers.`;
}

/** Plain-text note the operator sends the program lead with a new key. */
export function programOnboardingNote(opts: {
  key: string;
  org: string;
  tier: ProgramTierId;
  endsAt: string;
  siteUrl: string;
  contact: string;
}): string {
  const tier = PROGRAM_TIER_BY_ID[opts.tier];
  const org = displayOrgName(opts.org);
  const lastDay = formatEndDay(opts.endsAt);
  return [
    `FirstPass program key for ${org}`,
    "",
    opts.key,
    "",
    "What it is",
    `One key for your whole program. Each person who redeems it gets every Founding tool on FirstPass. Tier: ${tier.name}. It works through ${lastDay}.`,
    seatLine(opts.tier, org),
    "",
    "How each learner redeems it",
    `1. Open ${opts.siteUrl}`,
    "2. Go to Plans, then Redeem.",
    "3. Paste the key and tap Redeem.",
    "Do this once on each browser you use.",
    "",
    "Privacy",
    "There are no accounts. Nothing about learners is stored. The key only unlocks the browser it is pasted into.",
    "",
    "When the term ends",
    `After ${lastDay} the desk goes back to the free five-drug version. Renew and we will send the new key.`,
    "",
    "Educational use only",
    "FirstPass is a study tool for licensed healthcare professionals and supervised students. It is not FDA-cleared. It does not give doses. The Prescribing Information governs.",
    "",
    `Questions: ${opts.contact}`,
  ].join("\n");
}
