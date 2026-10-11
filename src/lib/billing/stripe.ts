import { createServerFn } from "@tanstack/react-start";

function readString(input: unknown, key: string) {
  if (!input || typeof input !== "object") return "";
  const v = (input as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
}

export const stripeStatus = createServerFn({ method: "POST" }).handler(async () => {
  const { stripeMode } = await import("./stripe.server");
  return { mode: stripeMode() };
});

export const startStripeCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({
    plan: readString(input, "plan"),
    interval: readString(input, "interval"),
    email: readString(input, "email"),
  }))
  .handler(async ({ data }) => {
    const { createCheckout } = await import("./stripe.server");
    return createCheckout(data.plan, data.interval, data.email);
  });

export const claimStripeCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({
    sessionId: readString(input, "sessionId"),
  }))
  .handler(async ({ data }) => {
    const { claimSession } = await import("./stripe.server");
    if (!data.sessionId.trim()) return { ok: false as const, reason: "Missing session." };
    return claimSession(data.sessionId);
  });

export const listPaidLicenses = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ pin: readString(input, "pin") }))
  .handler(async ({ data }) => {
    const { pinOk } = await import("./license.server");
    if (!pinOk(data.pin)) return { ok: false as const, reason: "Operator PIN is wrong." };
    const { listPaidSessions } = await import("./stripe.server");
    return listPaidSessions();
  });
