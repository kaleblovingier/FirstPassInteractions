import { OPERATOR, fulfillKey } from "@/lib/billing/commerce";
import { env } from "@/lib/env.server";

/** True when a mail provider is configured, so a failed send is worth retrying. */
export function mailConfigured(): boolean {
  return Boolean(env("RESEND_API_KEY"));
}

/**
 * Email a founding key through Resend. `idempotencyKey` makes the send safe to
 * repeat: the card-return page and the webhook can both run for one payment and
 * Resend delivers only one message for the same key.
 */
export async function sendLicenseMail(opts: {
  to: string;
  key: string;
  soldTo?: string;
  idempotencyKey?: string;
}): Promise<boolean> {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey || !opts.to) return false;
  const from = env("LICENSE_FROM") ?? "FirstPass <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
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
