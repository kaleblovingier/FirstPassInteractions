import { createServerFn } from "@tanstack/react-start";

function readString(input: unknown, key: string) {
  if (!input || typeof input !== "object") return "";
  const v = (input as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
}

export const paypalStatus = createServerFn({ method: "POST" }).handler(async () => {
  const { paypalMode } = await import("./paypal.server");
  return { mode: paypalMode() };
});

export const startPaypalCheckout = createServerFn({ method: "POST" }).handler(async () => {
  const { createPaypalOrder } = await import("./paypal.server");
  return createPaypalOrder();
});

export const claimPaypalCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ orderId: readString(input, "orderId") }))
  .handler(async ({ data }) => {
    const { claimPaypalOrder } = await import("./paypal.server");
    if (!data.orderId.trim()) return { ok: false as const, reason: "Missing order." };
    return claimPaypalOrder(data.orderId);
  });
