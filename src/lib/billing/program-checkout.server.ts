/**
 * Self-serve card checkout for Team and Program licenses (Stripe Checkout, one year).
 *
 * Off unless the server has PROGRAM_CHECKOUT=on and a Stripe secret key. Site stays
 * quote and invoice. The price always comes from ./programs on the server; the client
 * only names a tier, the organization, a buyer email and an honor-system seat count.
 *
 * Fulfilment (return page and webhook) mints the program key for the organization,
 * tier and an end month 12 months after the session was created, so the same paid
 * session always yields the same key. Nothing is stored here: the key is stamped on
 * the Stripe session and emailed with an idempotency key.
 */
import type Stripe from "stripe";
import { OPERATOR } from "@/lib/billing/commerce";
import { mailConfigured, sendLicenseMail } from "@/lib/billing/license-mail.server";
import { mintProgramKey, verifyKey } from "@/lib/billing/license.server";
import {
  PROGRAM_ORG_MAX,
  defaultProgramEndMonth,
  displayOrgName,
  parseEndMonth,
  programOnboardingNote,
} from "@/lib/billing/program-license";
import { PROGRAM_TIER_BY_ID, programKeyEndsAt } from "@/lib/billing/programs";
import { publicOrigin, stripeClient, stripeMode } from "@/lib/billing/stripe.server";
import { env } from "@/lib/env.server";
import { SITE_URL } from "@/lib/seo/pair-copy";

/** Stripe metadata `product` for a program license session. Individual licenses use "firstpass". */
export const PROGRAM_PRODUCT = "firstpass-program";

/** Tiers a buyer can pay for by card. Site stays quote and invoice. */
export const PROGRAM_CHECKOUT_TIERS = ["team", "program"] as const;
export type ProgramCheckoutTier = (typeof PROGRAM_CHECKOUT_TIERS)[number];

export const PROGRAM_CHECKOUT_OFF_REASON =
  "Card checkout for programs is not open yet. Ask for a quote and we will send an invoice.";
export const PROGRAM_STRIPE_OFF_REASON = "Card checkout is not live on this desk yet. Ask for a quote instead.";
export const PROGRAM_SITE_REASON = "Site licenses are quoted and invoiced. Ask for a quote below.";

export function isProgramCheckoutTier(raw: unknown): raw is ProgramCheckoutTier {
  return raw === "team" || raw === "program";
}

/** The operator's switch. Anything but "on" keeps program card checkout off. */
export function programCheckoutFlagOn(): boolean {
  return env("PROGRAM_CHECKOUT")?.toLowerCase() === "on";
}

/** Live only when the flag is on and Stripe has a real test or live secret key. */
export function programCheckoutStatus(): { live: boolean; mode: "off" | "test" | "live" } {
  const mode = stripeMode();
  const live = programCheckoutFlagOn() && mode !== "off";
  return { live, mode: live ? mode : "off" };
}

/** List price in cents for one year, read from programs.ts only. */
export function programListCents(tier: ProgramCheckoutTier): number {
  return PROGRAM_TIER_BY_ID[tier].annual * 100;
}

function seatCap(tier: ProgramCheckoutTier): number {
  // Team and Program always have a cap; Site (unlimited) is never sold here.
  return PROGRAM_TIER_BY_ID[tier].seats ?? 0;
}

const EMAIL_RE = /^[^\s@<>,"']+@[^\s@<>,"']+\.[^\s@<>,"']+$/;

export interface ProgramCheckoutRequest {
  tier: string;
  org: string;
  email: string;
  seats: number;
  years: number;
}

export type ProgramCheckoutResult = { ok: true; url: string } | { ok: false; reason: string };

/** Plain-language refusal for a request, or null when it can open a checkout. Flag and Stripe are checked by the caller. */
export function programRequestRefusal(input: ProgramCheckoutRequest): string | null {
  if (input.tier === "site") return PROGRAM_SITE_REASON;
  if (!isProgramCheckoutTier(input.tier)) return "Pick Team or Program.";
  if (input.years !== 1) return "Card checkout covers one year. Ask for a quote for a longer term.";
  const cap = seatCap(input.tier);
  if (!Number.isInteger(input.seats) || input.seats < 1) return "Enter how many people will use the key.";
  if (input.seats > cap) {
    const name = PROGRAM_TIER_BY_ID[input.tier].name;
    return input.tier === "team"
      ? `${name} covers up to ${cap} people. Pick Program, or ask for a Site quote.`
      : `${name} covers up to ${cap} people. Ask for a Site quote.`;
  }
  const org = displayOrgName(input.org);
  if (!org) return "Add the organization name.";
  if (org.length > PROGRAM_ORG_MAX) return `Keep the organization name to ${PROGRAM_ORG_MAX} characters or fewer.`;
  if (!EMAIL_RE.test(input.email.trim())) return "Enter the email where the key should go.";
  return null;
}

function productName(tier: ProgramCheckoutTier) {
  return `FirstPass ${PROGRAM_TIER_BY_ID[tier].name} program license (1 year)`;
}

/** Narrow Stripe surface this module uses, so tests can pass a fake. */
export type ProgramStripe = Pick<Stripe, "checkout" | "paymentIntents">;

export interface ProgramCheckoutDeps {
  stripe?: ProgramStripe | null;
  origin?: string | null;
}

/** Opens a one-year Stripe Checkout session for a Team or Program license. */
export async function createProgramCheckout(
  input: ProgramCheckoutRequest,
  deps: ProgramCheckoutDeps = {},
): Promise<ProgramCheckoutResult> {
  if (!programCheckoutFlagOn()) return { ok: false, reason: PROGRAM_CHECKOUT_OFF_REASON };
  if (stripeMode() === "off") return { ok: false, reason: PROGRAM_STRIPE_OFF_REASON };
  const stripe = deps.stripe === undefined ? stripeClient() : deps.stripe;
  if (!stripe) return { ok: false, reason: PROGRAM_STRIPE_OFF_REASON };
  const refused = programRequestRefusal(input);
  if (refused) return { ok: false, reason: refused };
  const tier = input.tier as ProgramCheckoutTier;
  const org = displayOrgName(input.org);
  const email = input.email.trim();
  let origin: string | null;
  if (deps.origin !== undefined) {
    origin = deps.origin;
  } else {
    try {
      origin = publicOrigin();
    } catch {
      origin = null;
    }
  }
  if (!origin) return { ok: false, reason: "Could not resolve the return address." };

  const cents = programListCents(tier);
  const metadata = {
    product: PROGRAM_PRODUCT,
    tier,
    org,
    seats: String(input.seats),
    years: "1",
  };
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      // Exact list price only. Discounts for programs go through a quote.
      allow_promotion_codes: false,
      billing_address_collection: "auto",
      customer_creation: "if_required",
      customer_email: email,
      payment_intent_data: {
        description: productName(tier),
        metadata,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: cents,
            product_data: {
              name: productName(tier),
              description: `One program key for ${org}, up to ${seatCap(tier)} people, for one year. Educational drug-interaction reference. Not FDA-cleared. Not medical advice. The key is issued automatically after payment.`,
            },
          },
        },
      ],
      success_url: `${origin}/for-programs?fp_program={CHECKOUT_SESSION_ID}#program-checkout`,
      cancel_url: `${origin}/for-programs?fp_program_cancel=1#program-checkout`,
      metadata,
    });
    if (!session.url) return { ok: false, reason: "Stripe did not return a checkout URL." };
    return { ok: true, url: session.url };
  } catch {
    return { ok: false, reason: "Stripe could not open checkout. Try again, or ask for an invoice." };
  }
}

export type ValidProgramSession =
  | { ok: true; tier: ProgramCheckoutTier; org: string; seats: number }
  | { ok: false; reason: string };

/** Paid, USD, our product, a card tier, the exact list amount and sane metadata. Takes any shape; every field is checked. */
export function validateProgramSession(session: any): ValidProgramSession {
  if (!session || typeof session !== "object") return { ok: false, reason: "Session is missing or invalid." };
  const meta = session.metadata ?? {};
  if (meta.product !== PROGRAM_PRODUCT) return { ok: false, reason: "That session is not a FirstPass program license." };
  if (session.payment_status !== "paid") {
    return { ok: false, reason: "Payment has not cleared yet. Refresh after the receipt, or write if it stalls." };
  }
  if (typeof session.currency !== "string" || session.currency.toLowerCase() !== "usd") {
    return { ok: false, reason: "Invalid currency. FirstPass licenses require USD." };
  }
  const tier = meta.tier;
  if (!isProgramCheckoutTier(tier)) return { ok: false, reason: "Invalid tier in session metadata." };
  const expected = programListCents(tier);
  if (session.amount_total !== expected) {
    return { ok: false, reason: `Amount mismatch: expected ${expected} cents, got ${session.amount_total}.` };
  }
  if (typeof session.amount_subtotal === "number" && session.amount_subtotal !== expected) {
    return { ok: false, reason: `Amount mismatch: expected ${expected} cents, got ${session.amount_subtotal}.` };
  }
  if (meta.years !== undefined && meta.years !== "1") return { ok: false, reason: "Invalid term in session metadata." };
  const seats = Number(meta.seats);
  if (!Number.isInteger(seats) || seats < 1 || seats > seatCap(tier)) {
    return { ok: false, reason: "Invalid seat count in session metadata." };
  }
  const org = typeof meta.org === "string" ? displayOrgName(meta.org) : "";
  if (!org || org.length > PROGRAM_ORG_MAX) return { ok: false, reason: "Invalid organization in session metadata." };
  if (typeof session.created !== "number" || !Number.isFinite(session.created)) {
    return { ok: false, reason: "Session has no creation time." };
  }
  return { ok: true, tier, org, seats };
}

/** End month 12 months after the session was created, so the key never depends on when it is claimed. */
export function programEndForSession(createdSeconds: number): { year: number; month: number; created: Date } {
  const created = new Date(createdSeconds * 1000);
  const end = parseEndMonth(defaultProgramEndMonth(created));
  if (!end) throw new Error("Could not work out the end month.");
  return { ...end, created };
}

export type ProgramFulfilment =
  | {
      ok: true;
      key: string;
      tier: ProgramCheckoutTier;
      org: string;
      seats: number;
      endsAt: string;
      email: string;
      mailed: boolean;
    }
  | { ok: false; reason: string };

function sessionEmail(session: Stripe.Checkout.Session) {
  return (session.customer_details?.email || session.customer_email || "").trim();
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  const pi = session.payment_intent;
  if (!pi) return "";
  return typeof pi === "string" ? pi : pi.id;
}

export interface FulfilDeps {
  mail?: typeof sendLicenseMail;
}

/** Mint, stamp Stripe, email the program lead. Safe to call twice: same key, one email. */
export async function fulfillProgramSession(
  stripe: ProgramStripe,
  session: Stripe.Checkout.Session,
  deps: FulfilDeps = {},
): Promise<ProgramFulfilment> {
  const valid = validateProgramSession(session);
  if (!valid.ok) return valid;
  let key: string;
  let endsAt: string;
  try {
    const end = programEndForSession(session.created);
    key = mintProgramKey(valid.tier, valid.org, end.year, end.month, end.created);
    endsAt = programKeyEndsAt(end.year, end.month).toISOString();
  } catch {
    return { ok: false, reason: "Paid, but the desk could not sign a key. Write and we will send it." };
  }
  if (!verifyKey(key).ok) {
    return { ok: false, reason: "Paid, but the desk could not sign a key. Write and we will send it." };
  }
  const email = sessionEmail(session);
  const meta: Record<string, string> = {};
  for (const [k, v] of Object.entries(session.metadata ?? {})) {
    if (typeof v === "string" && v.length) meta[k] = v;
  }
  meta.license_key = key;
  let mailed = meta.license_mailed === "1";

  const piId = paymentIntentId(session);
  if (piId && meta.receipt_stamped !== "1") {
    try {
      await stripe.paymentIntents.update(piId, {
        description: `${productName(valid.tier)}: ${valid.org} — ${key}`,
        ...(email ? { receipt_email: email } : {}),
      });
      meta.receipt_stamped = "1";
    } catch {
      /* receipt stamp is best-effort */
    }
  }

  if (email && !mailed) {
    const send = deps.mail ?? sendLicenseMail;
    mailed = await send({
      to: email,
      key,
      soldTo: valid.org,
      idempotencyKey: `fp-program-${session.id}`,
      subject: `Your FirstPass ${PROGRAM_TIER_BY_ID[valid.tier].name} program key`,
      text: programOnboardingNote({
        key,
        org: valid.org,
        tier: valid.tier,
        endsAt,
        siteUrl: SITE_URL,
        contact: OPERATOR.email,
      }),
    });
    if (mailed) meta.license_mailed = "1";
  }

  const dirty =
    meta.license_key !== session.metadata?.license_key ||
    meta.license_mailed !== session.metadata?.license_mailed ||
    meta.receipt_stamped !== session.metadata?.receipt_stamped;
  if (dirty) {
    try {
      await stripe.checkout.sessions.update(session.id, { metadata: meta });
    } catch {
      /* the key is deterministic, so a missed stamp loses nothing */
    }
  }

  return { ok: true, key, tier: valid.tier, org: valid.org, seats: valid.seats, endsAt, email, mailed };
}

/**
 * The return page's claim. Works whenever Stripe is configured, even if the flag
 * was turned off after someone paid: a paid buyer always gets their key.
 */
export async function claimProgramSession(
  sessionIdRaw: string,
  deps: { stripe?: ProgramStripe | null; mail?: typeof sendLicenseMail } = {},
): Promise<ProgramFulfilment> {
  const sessionId = sessionIdRaw.trim();
  if (!sessionId.startsWith("cs_")) return { ok: false, reason: "Not a Stripe session." };
  const stripe = deps.stripe === undefined ? stripeClient() : deps.stripe;
  if (!stripe) return { ok: false, reason: PROGRAM_STRIPE_OFF_REASON };
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  } catch {
    return { ok: false, reason: "Could not read that Stripe session." };
  }
  return fulfillProgramSession(stripe, session, { mail: deps.mail });
}

/** Webhook branch: fulfil a paid program session. A 500 asks Stripe to retry a failed email. */
export async function handleProgramWebhookSession(
  stripe: ProgramStripe,
  session: Stripe.Checkout.Session,
  deps: FulfilDeps = {},
): Promise<Response | null> {
  const done = await fulfillProgramSession(stripe, session, deps);
  if (done.ok && done.email && !done.mailed && mailConfigured()) {
    return Response.json({ ok: false, reason: "license email failed" }, { status: 500 });
  }
  return null;
}
