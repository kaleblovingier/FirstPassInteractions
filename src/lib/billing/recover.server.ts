import Stripe from "stripe";
import { env } from "@/lib/env.server";
import { mailConfigured, sendLicenseMail } from "@/lib/billing/license-mail.server";
import { mintKeyFromPaid, verifyKey, type IssuedPlan } from "@/lib/billing/license.server";
import { checkListPrice, issuedFor, stripeMode, validatePaidSession } from "@/lib/billing/stripe.server";

/**
 * Self-serve "lost my key" recovery. A buyer types their purchase email; if a paid
 * Founding checkout exists for it, the existing key (same derivation as the webhook,
 * nothing new is minted or stored) is re-sent to that email only. The answer is the
 * same whether or not a purchase matched, so the form cannot probe for buyers.
 */

export const RECOVERY_GENERIC =
  "If a Founding purchase matches that email, we've emailed the key to it. Check spam, and allow a few minutes.";
export const RECOVERY_UNCONFIGURED =
  "Key recovery isn't switched on for this desk yet. Write to the desk owner and we'll send your key by hand.";
export const RECOVERY_LIMITED = "Too many recovery requests. Wait a little while and try again.";
export const RECOVERY_BAD_EMAIL = "Enter the email address you paid with.";

/* ---------------- rate limiting (in-memory, per server instance) ---------------- */

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export const LIMITS = {
  ip: { max: 5, windowMs: 15 * 60 * 1000 },
  email: { max: 3, windowMs: 60 * 60 * 1000 },
};

/** Sliding-window hit counter. Returns true when the call is allowed (and records it). */
export function hit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= max) {
    buckets.set(key, b);
    return false;
  }
  b.hits.push(now);
  buckets.set(key, b);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (!v.hits.some((t) => now - t < Math.max(LIMITS.ip.windowMs, LIMITS.email.windowMs))) buckets.delete(k);
    }
  }
  return true;
}

export function resetRecoveryLimits() {
  buckets.clear();
}

export function clientIp(request: Request): string {
  const h = request.headers;
  const raw =
    h.get("x-vercel-forwarded-for") || h.get("x-forwarded-for") || h.get("x-real-ip") || "unknown";
  return raw.split(",")[0]!.trim() || "unknown";
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  if (e.length < 3 || e.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

/* ---------------- lookup + send ---------------- */

export function recoveryConfigured(): boolean {
  return stripeMode() !== "off" && mailConfigured();
}

function sessionEmail(s: Stripe.Checkout.Session) {
  return (s.customer_details?.email || s.customer_email || "").trim().toLowerCase();
}

/** Paid, list-price Founding (lifetime) sessions for this email, newest first. */
export async function findFoundingSessions(stripe: Stripe, email: string) {
  const found: Stripe.Checkout.Session[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < 3; page += 1) {
    const list = await stripe.checkout.sessions.list({
      limit: 100,
      status: "complete",
      customer_details: { email },
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    } as Stripe.Checkout.SessionListParams);
    for (const s of list.data) {
      if (sessionEmail(s) !== email) continue;
      const valid = validatePaidSession(s);
      if (!valid.ok || !checkListPrice(s).ok) continue;
      const tagged = (s.metadata?.issued as IssuedPlan | undefined) ?? issuedFor(valid.plan, valid.interval);
      if (tagged !== "life") continue;
      found.push(s);
    }
    if (!list.has_more || !list.data.length) break;
    startingAfter = list.data[list.data.length - 1]?.id;
  }
  return found;
}

/** Re-send keys for every matching purchase. Returns how many emails were accepted (never shown to the buyer). */
export async function resendFoundingKeys(stripe: Stripe, email: string, now = Date.now()) {
  const sessions = await findFoundingSessions(stripe, email);
  let sent = 0;
  const day = Math.floor(now / 86_400_000);
  for (const s of sessions) {
    const key = s.metadata?.license_key || mintKeyFromPaid("life", s.id);
    if (!verifyKey(key).ok) continue;
    const ok = await sendLicenseMail({
      to: email, // only ever the address that was typed AND matches the purchase
      key,
      soldTo: (s.customer_details?.name || "").trim() || email,
      idempotencyKey: `fp-recover-${s.id}-${day}`,
    });
    if (ok) sent += 1;
  }
  return sent;
}

function json(status: number, message: string) {
  return Response.json({ ok: status === 200, message }, { status });
}

export async function handleRecoverRequest(
  request: Request,
  deps: { stripe?: Stripe | null } = {},
): Promise<Response> {
  if (!recoveryConfigured()) return json(503, RECOVERY_UNCONFIGURED);
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    /* handled below */
  }
  const email = normalizeEmail(body?.email);
  if (!email) return json(400, RECOVERY_BAD_EMAIL);

  const ip = clientIp(request);
  if (!hit(`ip:${ip}`, LIMITS.ip.max, LIMITS.ip.windowMs)) return json(429, RECOVERY_LIMITED);
  if (!hit(`email:${email}`, LIMITS.email.max, LIMITS.email.windowMs)) return json(429, RECOVERY_LIMITED);

  const stripe = deps.stripe ?? new Stripe(env("STRIPE_SECRET_KEY")!);
  try {
    await resendFoundingKeys(stripe, email);
  } catch {
    /* Swallow: the answer must not differ by whether a lookup or send failed. */
  }
  return json(200, RECOVERY_GENERIC);
}
