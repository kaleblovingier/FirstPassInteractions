/**
 * Zod gates for the public billing server functions.
 *
 * Shapes are strict and uncoerced: a number, array, or unknown key is a miss.
 * An unknown plan is a miss too — it must not fall through to a lifetime key.
 * The reason returned to the client does not echo the payload.
 */

import { z } from "zod";
import { logEvent } from "@/lib/server/log";
import { withinNodeBudget } from "@/lib/server/node-budget";

/** Operator collections can list a few hundred paid sessions. Still far below a hostile payload. */
export const BILLING_MAX_NODES = 8_000;

export const BILLING_INPUT_REASON = "That request was not understood.";

export type BillingChecked<T> = { ok: true; value: T } | { ok: false };

/** One field, no control characters. Newlines are rejected rather than trimmed into a value. */
// eslint-disable-next-line no-control-regex -- refusing control characters is the point.
const oneLine = (max: number) => z.string().max(max).refine((s) => !/[\u0000-\u001f\u007f]/.test(s));

const pin = oneLine(256);
const soldTo = oneLine(240);
/** Name lists are one string, many lines. Other controls are still refused. */
// eslint-disable-next-line no-control-regex -- refusing control characters is the point.
const nameList = z.string().max(12_000).refine((s) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s));
export const issuedPlan = z.enum(["pro", "lab", "life"]);
const checkoutPlan = z.enum(["pro", "lab"]);
const interval = z.enum(["month", "year", "life"]);
const tier = z.enum(["team", "program", "site"]);

/** Empty is allowed (no buyer email). Anything else must be a single plain address. */
const rowEmail = z
  .string()
  .max(254)
  .refine((s) => s === "" || /^[^\s@<>,"']+@[^\s@<>,"']+\.[^\s@<>,"']+$/.test(s));

export const RedeemInput = z.strictObject({
  key: oneLine(120),
});

export const MintLicenseInput = z.strictObject({
  pin,
  plan: issuedPlan,
  soldTo,
});

export const MintProgramInput = z.strictObject({
  pin,
  tier,
  org: oneLine(200),
  end: oneLine(32),
});

export const MintBatchInput = z.strictObject({
  pin,
  plan: issuedPlan,
  names: nameList,
});

export const StripeCheckoutInput = z.strictObject({
  plan: checkoutPlan,
  interval,
  email: oneLine(254),
});

export const StripeSessionInput = z.strictObject({
  sessionId: oneLine(200),
});

export const OperatorPinInput = z.strictObject({ pin });

export const PaypalOrderInput = z.strictObject({
  orderId: oneLine(64),
});

export const CollectInput = z.strictObject({
  pin,
  plan: issuedPlan,
  names: nameList,
  hunt: nameList,
});

export const CollectRowInput = z.strictObject({
  source: z.enum(["venmo", "cashapp", "paypal", "stripe", "hunt", "manual"]),
  soldTo,
  email: rowEmail,
  key: z.string().min(1).max(80).regex(/^[A-Za-z0-9-]+$/),
  plan: issuedPlan,
  amount: z.number().finite().nonnegative().max(1_000_000),
  at: oneLine(64),
  mailed: z.boolean(),
  messageId: oneLine(200).optional(),
});

export const DraftCollectedInput = z.strictObject({
  pin,
  rows: z.array(CollectRowInput).max(400),
});

export function billingRejected() {
  return { ok: false as const, reason: BILLING_INPUT_REASON };
}

export function checkBillingInput<S extends z.ZodType>(
  fn: string,
  schema: S,
  input: unknown,
): BillingChecked<z.output<S>> {
  if (!withinNodeBudget(input, BILLING_MAX_NODES)) {
    logEvent("info", "billing.invalid", { fn, oversized: true });
    return { ok: false };
  }
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  logEvent("info", "billing.invalid", { fn, issues: parsed.error.issues.length });
  return { ok: false };
}
