import { createServerFn } from "@tanstack/react-start";
import { assertNoClientInput } from "@/lib/server/empty-input";
import {
  billingRejected,
  checkBillingInput,
  ProgramCheckoutInput,
  StripeSessionInput,
  type BillingChecked,
} from "./rpc-input";

type ProgramCheckoutBody = BillingChecked<{
  tier: "team" | "program" | "site";
  org: string;
  email: string;
  seats: number;
  years: 1;
}>;
type SessionBody = BillingChecked<{ sessionId: string }>;

/** Tiers sold by card. Site stays quote and invoice. */
export type CardTier = "team" | "program";
export const CARD_TIERS: readonly CardTier[] = ["team", "program"];

export function isCardTier(id: string): id is CardTier {
  return id === "team" || id === "program";
}

/** No client payload. True only with PROGRAM_CHECKOUT=on and a Stripe key on the server. */
export const programCheckoutStatus = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    assertNoClientInput(input);
    return input;
  })
  .handler(async () => {
    const { programCheckoutStatus: status } = await import("./program-checkout.server");
    return { live: status().live };
  });

export async function handleStartProgramCheckout(data: ProgramCheckoutBody) {
  if (!data.ok) return billingRejected();
  const { createProgramCheckout } = await import("./program-checkout.server");
  return createProgramCheckout(data.value);
}

export async function handleClaimProgramCheckout(data: SessionBody) {
  if (!data.ok) return billingRejected();
  if (!data.value.sessionId.trim()) return { ok: false as const, reason: "Missing session." };
  const { claimProgramSession } = await import("./program-checkout.server");
  return claimProgramSession(data.value.sessionId);
}

export const startProgramCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("startProgramCheckout", ProgramCheckoutInput, input))
  .handler(async ({ data }) => handleStartProgramCheckout(data));

export const claimProgramCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("claimProgramCheckout", StripeSessionInput, input))
  .handler(async ({ data }) => handleClaimProgramCheckout(data));
