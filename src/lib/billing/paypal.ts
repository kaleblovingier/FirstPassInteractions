import { createServerFn } from "@tanstack/react-start";
import { assertNoClientInput } from "@/lib/server/empty-input";
import { billingRejected, checkBillingInput, PaypalOrderInput, type BillingChecked } from "./rpc-input";

type OrderBody = BillingChecked<{ orderId: string }>;

/** No client payload. PayPal mode is read from server env only. */
export const paypalStatus = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    assertNoClientInput(input);
    return input;
  })
  .handler(async () => {
    const { paypalMode } = await import("./paypal.server");
    return { mode: paypalMode() };
  });

/** No client payload. The order is always the founding lifetime price. */
export const startPaypalCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    assertNoClientInput(input);
    return input;
  })
  .handler(async () => {
    const { createPaypalOrder } = await import("./paypal.server");
    return createPaypalOrder();
  });

export async function handleClaimPaypalCheckout(data: OrderBody) {
  if (!data.ok) return billingRejected();
  const { claimPaypalOrder } = await import("./paypal.server");
  if (!data.value.orderId.trim()) return { ok: false as const, reason: "Missing order." };
  return claimPaypalOrder(data.value.orderId);
}

export const claimPaypalCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("claimPaypalCheckout", PaypalOrderInput, input))
  .handler(async ({ data }) => handleClaimPaypalCheckout(data));
