import Stripe from "stripe";
import { getRequest } from "@tanstack/react-start/server";
import { OPERATOR, fulfillKey } from "@/lib/billing/commerce";
import { env } from "@/lib/env.server";
import { priceFor, type Interval, type PlanId } from "@/lib/billing/plans";
import { mintKeyFromPaid, verifyKey, type IssuedPlan } from "@/lib/billing/license.server";

export type StripeMode = "off" | "test" | "live";

export type PaidLicenseRow = {
  sessionId: string;
  email: string;
  name: string;
  key: string;
  plan: IssuedPlan;
  amount: number;
  paidAt: string;
  mailed: boolean;
};

function secret() {
  return env("STRIPE_SECRET_KEY");
}

export function stripeMode(): StripeMode {
  const key = secret();
  if (!key) return "off";
  if (key.startsWith("sk_test_")) return "test";
  return "live";
}

function client(): Stripe | null {
  const key = secret();
  if (!key) return null;
  return new Stripe(key);
}

function publicOrigin(): string | null {
  const fallback =
    env("PUBLIC_ORIGIN") ||
    env("APP_URL") ||
    (env("VERCEL_PROJECT_PRODUCTION_URL")
      ? `https://${env("VERCEL_PROJECT_PRODUCTION_URL")}`
      : null);
  const req = getRequest();
  if (!req) return fallback;
  try {
    const url = new URL(req.url);
    const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", ""))
      .split(",")[0]
      ?.trim();
    const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host)
      .split(",")[0]
      ?.trim();
    if (proto && host) return `${proto}://${host}`;
  } catch {
    /* fallback below */
  }
  return fallback;
}

export function issuedFor(plan: string, interval: string): IssuedPlan {
  if (interval === "life") return "life";
  if (plan === "lab") return "lab";
  return "pro";
}

export type ValidatedPaidSessionResult =
  | {
      ok: true;
      plan: Exclude<PlanId, "free">;
      interval: Interval;
      issued: IssuedPlan;
    }
  | {
      ok: false;
      reason: string;
    };

export function validatePaidSession(
  session: any,
  expectedPriceCents?: number,
): ValidatedPaidSessionResult {
  if (!session || typeof session !== "object") {
    return { ok: false, reason: "Session is missing or invalid." };
  }
  if (session.metadata?.product !== "firstpass") {
    return { ok: false, reason: "That session is not a FirstPass license." };
  }
  if (session.payment_status !== "paid") {
    return {
      ok: false,
      reason: "Payment has not cleared yet. Refresh after the receipt, or write if it stalls.",
    };
  }
  if (typeof session.currency !== "string" || session.currency.toLowerCase() !== "usd") {
    return { ok: false, reason: "Invalid currency. FirstPass licenses require USD." };
  }
  if (typeof expectedPriceCents === "number") {
    if (session.amount_total !== expectedPriceCents) {
      return {
        ok: false,
        reason: `Amount mismatch: expected ${expectedPriceCents} cents, got ${session.amount_total}.`,
      };
    }
  }
  const plan = session.metadata?.plan;
  if (plan !== "pro" && plan !== "lab") {
    return { ok: false, reason: "Invalid plan in session metadata." };
  }
  const interval = session.metadata?.interval;
  if (interval !== "month" && interval !== "year" && interval !== "life") {
    return { ok: false, reason: "Invalid interval in session metadata." };
  }
  const issued = (session.metadata?.issued as IssuedPlan | undefined) || issuedFor(plan, interval);
  return { ok: true, plan, interval, issued };
}

function asPlan(plan: string): Exclude<PlanId, "free"> {
  return plan === "lab" ? "lab" : "pro";
}

function asInterval(interval: string): Interval {
  if (interval === "year" || interval === "month" || interval === "life") return interval;
  return "life";
}

function productName(issued: IssuedPlan, interval: Interval) {
  if (issued === "life") return "FirstPass founding lifetime";
  const span = interval === "year" ? "year" : "month";
  return issued === "lab" ? `FirstPass lab (${span})` : `FirstPass pro (${span})`;
}

function sessionEmail(session: Stripe.Checkout.Session) {
  return (session.customer_details?.email || session.customer_email || "").trim();
}

function sessionName(session: Stripe.Checkout.Session) {
  return (session.customer_details?.name || "").trim();
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  const pi = session.payment_intent;
  if (!pi) return "";
  return typeof pi === "string" ? pi : pi.id;
}

async function sendLicenseMail(opts: { to: string; key: string; soldTo?: string }) {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey || !opts.to) return false;
  const from = env("LICENSE_FROM") ?? "FirstPass <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        bcc: [OPERATOR.email],
        subject: "Your FirstPass founding license",
        text: fulfillKey({ key: opts.key, soldTo: opts.soldTo || opts.to }),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Mint, stamp Stripe, receipt-email. Safe to call twice — same key, no double mail. */
async function fulfillPaidSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  expectedPriceCents?: number,
) {
  const valid = validatePaidSession(session, expectedPriceCents);
  if (!valid.ok) {
    return { ok: false as const, reason: valid.reason };
  }
  const issued = issuedFor(valid.plan, valid.interval);
  const tagged = (session.metadata?.issued as IssuedPlan | undefined) ?? issued;
  const key = session.metadata?.license_key || mintKeyFromPaid(tagged, session.id);
  const verified = verifyKey(key);
  if (!verified.ok) {
    return { ok: false as const, reason: "Paid, but the desk could not sign a key." };
  }
  const email = sessionEmail(session);
  const name = sessionName(session);
  const meta: Record<string, string> = {};
  for (const [k, v] of Object.entries(session.metadata ?? {})) {
    if (typeof v === "string" && v.length) meta[k] = v;
  }
  meta.product = meta.product || "firstpass";
  meta.license_key = key;
  let mailed = meta.license_mailed === "1";

  const piId = paymentIntentId(session);
  if (piId && meta.receipt_stamped !== "1") {
    try {
      await stripe.paymentIntents.update(piId, {
        description: `${productName(tagged, asInterval(session.metadata?.interval ?? "life"))} — ${key}`,
        ...(email ? { receipt_email: email } : {}),
      });
      meta.receipt_stamped = "1";
    } catch {
      /* receipt stamp is best-effort */
    }
  }

  if (email && !mailed) {
    mailed = await sendLicenseMail({ to: email, key, soldTo: name || email });
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
      /* listing still works from the deterministic key */
    }
  }

  return {
    ok: true as const,
    key,
    plan: verified.plan,
    lifetime: verified.lifetime,
    license: verified.license,
    email,
    name,
    mailed,
  };
}

export async function createCheckout(planRaw: string, intervalRaw: string, emailRaw?: string) {
  const stripe = client();
  if (!stripe) {
    return { ok: false as const, reason: "Card checkout is not live on this desk yet." };
  }
  const plan = asPlan(planRaw);
  const interval = asInterval(intervalRaw);
  const issued = issuedFor(plan, interval);
  const dollars = priceFor(plan, interval);
  if (dollars <= 0) {
    return { ok: false as const, reason: "That license is free." };
  }
  const origin = publicOrigin();
  if (!origin) {
    return { ok: false as const, reason: "Could not resolve the return address." };
  }
  const cleanEmail = typeof emailRaw === "string" ? emailRaw.trim() : "";
  const validEmail = cleanEmail.includes("@") && cleanEmail.includes(".") ? cleanEmail : undefined;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_creation: "if_required",
      ...(validEmail ? { customer_email: validEmail } : {}),
      payment_intent_data: {
        description: productName(issued, interval),
        metadata: {
          product: "firstpass",
          plan,
          interval,
          issued,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: dollars * 100,
            product_data: {
              name: productName(issued, interval),
              description: "Educational CYP450 desk license. Not FDA-cleared. Not medical advice. Not a charting system. Key is issued automatically after payment.",
            },
          },
        },
      ],
      success_url: `${origin}/?fp_paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?fp_cancel=1`,
      metadata: {
        product: "firstpass",
        plan,
        interval,
        issued,
      },
    });
    if (!session.url) {
      return { ok: false as const, reason: "Stripe did not return a checkout URL." };
    }
    return { ok: true as const, url: session.url };
  } catch {
    return { ok: false as const, reason: "Stripe could not open checkout. Try again, or pay Venmo." };
  }
}

export async function claimSession(sessionIdRaw: string, expectedPriceCents?: number) {
  const sessionId = sessionIdRaw.trim();
  if (!sessionId.startsWith("cs_")) {
    return { ok: false as const, reason: "Not a Stripe session." };
  }
  const stripe = client();
  if (!stripe) {
    return { ok: false as const, reason: "Card checkout is not live on this desk yet." };
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
    const valid = validatePaidSession(session, expectedPriceCents);
    if (!valid.ok) {
      return { ok: false as const, reason: valid.reason };
    }
    return fulfillPaidSession(stripe, session, expectedPriceCents);
  } catch {
    return { ok: false as const, reason: "Could not read that Stripe session." };
  }
}

export async function listPaidSessions(): Promise<
  { ok: true; rows: PaidLicenseRow[] } | { ok: false; reason: string }
> {
  const stripe = client();
  if (!stripe) {
    return { ok: false, reason: "Stripe is not live on this desk yet." };
  }
  try {
    const rows: PaidLicenseRow[] = [];
    let startingAfter: string | undefined;
    for (let page = 0; page < 4; page += 1) {
      const list = await stripe.checkout.sessions.list({
        limit: 50,
        status: "complete",
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const session of list.data) {
        const valid = validatePaidSession(session);
        if (!valid.ok) continue;
        const issued = issuedFor(valid.plan, valid.interval);
        const tagged = (session.metadata?.issued as IssuedPlan | undefined) ?? issued;
        const key = session.metadata?.license_key || mintKeyFromPaid(tagged, session.id);
        rows.push({
          sessionId: session.id,
          email: sessionEmail(session),
          name: sessionName(session),
          key,
          plan: tagged,
          amount: (session.amount_total ?? 0) / 100,
          paidAt: session.created ? new Date(session.created * 1000).toISOString() : "",
          mailed: session.metadata?.license_mailed === "1",
        });
      }
      if (!list.has_more || !list.data.length) break;
      startingAfter = list.data[list.data.length - 1]?.id;
    }
    return { ok: true, rows };
  } catch {
    return { ok: false, reason: "Could not list paid sessions." };
  }
}

export async function handleStripeWebhook(request: Request): Promise<Response> {
  const stripe = client();
  const hookSecret = env("STRIPE_WEBHOOK_SECRET");
  if (!stripe || !hookSecret) {
    return Response.json({ ok: false, reason: "webhook unconfigured" }, { status: 503 });
  }
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return Response.json({ ok: false, reason: "missing signature" }, { status: 400 });
  }
  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, hookSecret);
  } catch {
    return Response.json({ ok: false, reason: "bad signature" }, { status: 400 });
  }
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    let session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      try {
        session = await stripe.checkout.sessions.retrieve(session.id, { expand: ["payment_intent"] });
        const valid = validatePaidSession(session);
        if (valid.ok) {
          await fulfillPaidSession(stripe, session);
        }
      } catch {
        /* Stripe will retry the webhook */
        return Response.json({ ok: false, reason: "fulfill failed" }, { status: 500 });
      }
    }
  }
  return Response.json({ received: true });
}
