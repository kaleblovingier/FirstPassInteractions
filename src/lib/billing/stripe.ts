import { createServerFn } from "@tanstack/react-start";
import { assertNoClientInput } from "@/lib/server/empty-input";
import {
  billingRejected,
  checkBillingInput,
  OperatorPinInput,
  StripeCheckoutInput,
  StripeSessionInput,
  type BillingChecked,
} from "./rpc-input";

type CheckoutBody = BillingChecked<{ plan: "pro" | "lab"; interval: "month" | "year" | "life"; email: string }>;
type SessionBody = BillingChecked<{ sessionId: string }>;
type PinBody = BillingChecked<{ pin: string }>;

/** No client payload. Card mode is read from server env only. */
export const stripeStatus = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    assertNoClientInput(input);
    return input;
  })
  .handler(async () => {
    const { stripeMode } = await import("./stripe.server");
    return { mode: stripeMode() };
  });

export async function handleStartStripeCheckout(data: CheckoutBody) {
  if (!data.ok) return billingRejected();
  const { createCheckout } = await import("./stripe.server");
  return createCheckout(data.value.plan, data.value.interval, data.value.email);
}

export async function handleClaimStripeCheckout(data: SessionBody) {
  if (!data.ok) return billingRejected();
  const { claimSession } = await import("./stripe.server");
  if (!data.value.sessionId.trim()) return { ok: false as const, reason: "Missing session." };
  return claimSession(data.value.sessionId);
}

export async function handleListPaidLicenses(data: PinBody) {
  if (!data.ok) return billingRejected();
  const { pinRefusal } = await import("./license.server");
  const refused = await pinRefusal(data.value.pin);
  if (refused) return { ok: false as const, reason: refused };
  const { listPaidSessions } = await import("./stripe.server");
  return listPaidSessions();
}

export const startStripeCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("startStripeCheckout", StripeCheckoutInput, input))
  .handler(async ({ data }) => handleStartStripeCheckout(data));

export const claimStripeCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("claimStripeCheckout", StripeSessionInput, input))
  .handler(async ({ data }) => handleClaimStripeCheckout(data));

export const listPaidLicenses = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("listPaidLicenses", OperatorPinInput, input))
  .handler(async ({ data }) => handleListPaidLicenses(data));
