import { getRequest } from "@tanstack/react-start/server";
import { env } from "@/lib/env.server";
import { priceFor } from "@/lib/billing/plans";
import { mintKeyFromPaid, verifyKey } from "@/lib/billing/license.server";
import { sendLicenseMail } from "@/lib/billing/license-mail.server";

/**
 * Optional second automatic rail: PayPal Checkout (Orders v2), capture-on-return.
 * Off unless PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are both set. Sandbox unless
 * PAYPAL_ENV=live. Money only moves when WE capture, so a buyer who approves and
 * closes the tab is never charged without a key.
 */
export type PaypalMode = "off" | "sandbox" | "live";

type FetchLike = typeof fetch;

const CUSTOM_ID = "firstpass:life";

export function paypalMode(): PaypalMode {
  if (!env("PAYPAL_CLIENT_ID") || !env("PAYPAL_CLIENT_SECRET")) return "off";
  return env("PAYPAL_ENV")?.toLowerCase() === "live" ? "live" : "sandbox";
}

function base(mode: PaypalMode) {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function foundingCents() {
  return priceFor("lab", "life") * 100;
}

function origin(): string | null {
  const fallback =
    env("PUBLIC_ORIGIN") ||
    env("APP_URL") ||
    (env("VERCEL_PROJECT_PRODUCTION_URL") ? `https://${env("VERCEL_PROJECT_PRODUCTION_URL")}` : null);
  const req = getRequest();
  if (!req) return fallback;
  try {
    const url = new URL(req.url);
    const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0]?.trim();
    const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host).split(",")[0]?.trim();
    if (proto && host) return `${proto}://${host}`;
  } catch {
    /* fallback below */
  }
  return fallback;
}

async function accessToken(mode: PaypalMode, f: FetchLike): Promise<string | null> {
  const id = env("PAYPAL_CLIENT_ID");
  const secret = env("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) return null;
  const res = await f(`${base(mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

export type PaypalOrderCheck = { ok: true } | { ok: false; reason: string };

/** A completed order is only honored for the exact Founding price, in USD, that this desk created. */
export function checkPaypalOrder(order: any): PaypalOrderCheck {
  if (!order || typeof order !== "object") return { ok: false, reason: "Order is missing or invalid." };
  if (order.status !== "COMPLETED") {
    return { ok: false, reason: "PayPal payment has not completed yet. Refresh in a moment, or write if it stalls." };
  }
  const unit = order.purchase_units?.[0];
  if (!unit || unit.custom_id !== CUSTOM_ID) {
    return { ok: false, reason: "That order is not a FirstPass founding license." };
  }
  const capture = unit.payments?.captures?.[0];
  if (!capture || capture.status !== "COMPLETED") {
    return { ok: false, reason: "PayPal payment has not completed yet. Refresh in a moment, or write if it stalls." };
  }
  const amount = capture.amount;
  if (!amount || String(amount.currency_code).toUpperCase() !== "USD") {
    return { ok: false, reason: "Invalid currency. FirstPass licenses require USD." };
  }
  const cents = Math.round(Number(amount.value) * 100);
  if (cents !== foundingCents()) {
    return { ok: false, reason: `Amount mismatch: expected ${foundingCents()} cents, got ${cents}.` };
  }
  return { ok: true };
}

export async function createPaypalOrder(f: FetchLike = fetch) {
  const mode = paypalMode();
  if (mode === "off") {
    return { ok: false as const, reason: "PayPal checkout is not live on this desk yet." };
  }
  const root = origin();
  if (!root) return { ok: false as const, reason: "Could not resolve the return address." };
  try {
    const token = await accessToken(mode, f);
    if (!token) return { ok: false as const, reason: "PayPal could not open checkout. Try again, or pay by card." };
    const res = await f(`${base(mode)}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: CUSTOM_ID,
            description: "FirstPass founding lifetime license",
            amount: { currency_code: "USD", value: (foundingCents() / 100).toFixed(2) },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "FirstPass",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
              return_url: `${root}/?fp_pp=1`,
              cancel_url: `${root}/?fp_cancel=1`,
            },
          },
        },
      }),
    });
    if (!res.ok) return { ok: false as const, reason: "PayPal could not open checkout. Try again, or pay by card." };
    const order = (await res.json()) as { id?: string; links?: Array<{ rel: string; href: string }> };
    const url = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
    if (!url) return { ok: false as const, reason: "PayPal did not return a checkout URL." };
    return { ok: true as const, url };
  } catch {
    return { ok: false as const, reason: "PayPal could not open checkout. Try again, or pay by card." };
  }
}

/**
 * Capture the approved order (or read it if already captured), verify it, and
 * return the deterministic key. Safe to call twice: same order id, same key.
 */
export async function claimPaypalOrder(orderIdRaw: string, f: FetchLike = fetch) {
  const orderId = orderIdRaw.trim();
  if (!/^[A-Z0-9]{8,32}$/.test(orderId)) return { ok: false as const, reason: "Not a PayPal order." };
  const mode = paypalMode();
  if (mode === "off") return { ok: false as const, reason: "PayPal checkout is not live on this desk yet." };
  try {
    const token = await accessToken(mode, f);
    if (!token) return { ok: false as const, reason: "Could not reach PayPal. Try again in a moment." };
    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    let res = await f(`${base(mode)}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { ...auth, "PayPal-Request-Id": `fp-capture-${orderId}` },
    });
    if (!res.ok) {
      // Already captured by an earlier call (or a refresh): read the order instead.
      res = await f(`${base(mode)}/v2/checkout/orders/${orderId}`, { method: "GET", headers: auth });
      if (!res.ok) return { ok: false as const, reason: "Could not read that PayPal order." };
    }
    const order = (await res.json()) as any;
    const check = checkPaypalOrder(order);
    if (!check.ok) return { ok: false as const, reason: check.reason };
    const key = mintKeyFromPaid("life", `paypal:${orderId}`);
    const verified = verifyKey(key);
    if (!verified.ok) return { ok: false as const, reason: "Paid, but the desk could not sign a key." };
    const email = String(order.payer?.email_address ?? "").trim();
    const first = String(order.payer?.name?.given_name ?? "").trim();
    const mailed = email
      ? await sendLicenseMail({ to: email, key, soldTo: first || email, idempotencyKey: `fp-license-paypal-${orderId}` })
      : false;
    return {
      ok: true as const,
      key,
      plan: verified.plan,
      lifetime: verified.lifetime,
      license: verified.license,
      email,
      mailed,
    };
  } catch {
    return { ok: false as const, reason: "Could not verify that PayPal order." };
  }
}
