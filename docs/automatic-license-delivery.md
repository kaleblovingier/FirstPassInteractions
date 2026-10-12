# Automatic Founding license delivery

Goal: a buyer pays $79 once and gets a signed key with nobody hand-minting it.

## How it works

- **Card (Stripe).** `createCheckout` opens a Stripe Checkout session. When the
  buyer returns, the desk claims the session straight from Stripe and shows the key.
  The signed webhook at `/api/stripe/webhook` does the same work as a backup, so a
  slow webhook never holds the buyer up.
- **PayPal (optional, off by default).** `paypal.server.ts` creates an Orders v2
  order. When the buyer returns, the desk captures it, checks status, USD, and
  exactly $79, then shows the key. Money only moves when the desk captures.
- **Key.** Deterministic from the payment id (`mintKeyFromPaid`), so the return page,
  the webhook, and a refresh all give the same key. Nothing is stored.
- **Email.** Resend sends a copy with an `Idempotency-Key`, so two paths racing send
  one email. If the send fails, the key still shows on the desk, and the webhook
  answers 500 so Stripe retries the email.

## Checks before a key is issued

Payment status is paid, currency is USD, product metadata is `firstpass`, plan and
interval are valid, and the pre-discount subtotal equals the list price (a promo code
still works; a session created at another price does not).

## Environment variables (Vercel project `firstpass-desk`, Production)

| Name | Needed for |
| --- | --- |
| `STRIPE_SECRET_KEY` | Card checkout. `sk_test_` is test mode, `sk_live_` is live. Anything else turns card checkout off. |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature check (`whsec_...`). |
| `RESEND_API_KEY` | Emailing the key. |
| `LICENSE_FROM` | Sender, e.g. `FirstPass <license@your-verified-domain>`. Without a verified domain Resend only delivers to its own account owner. |
| `LICENSE_PEPPER` | Signs and verifies keys. Required in production. Never change it after selling keys. |
| `FOUNDER_PIN` | Operator PIN. Required in production. |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal rail. Both must be set or PayPal stays off. |
| `PAYPAL_ENV` | `live` for real money. Anything else uses the PayPal sandbox. |
| `PUBLIC_ORIGIN` | Optional. Return address if request headers are missing. |

Env changes only apply to the next deployment, so redeploy after setting them.

## Webhook

URL: `https://firstpass-desk.vercel.app/api/stripe/webhook`
Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`.
PayPal needs no webhook (capture on return).

## Lost-key recovery (self-serve)

Buyers who lose their key go to `/recover` (linked under the Plans page as "Lost your
Founding key?"). They enter their purchase email and the desk `POST`s it to
`/api/license/recover` (`src/lib/billing/recover.server.ts`).

- **Lookup.** Stripe `checkout.sessions.list` (status `complete`, filtered by
  `customer_details.email`, exact match after lowercasing). Only sessions that pass the
  same checks as fulfillment (paid, USD, `firstpass`, list price) and are Founding
  (`issued = life`) count.
- **Key.** The key stamped on the session, or `mintKeyFromPaid("life", session.id)`,
  which is the same `LICENSE_PEPPER` derivation as the webhook. Nothing new is minted
  or stored.
- **Send.** Resend, to the typed email only (it must equal the purchase email), with
  `Idempotency-Key: fp-recover-<session>-<day>` so repeats within a day send once.
- **Same answer always.** Match, no match, Stripe error and Resend error all return 200
  with "If a Founding purchase matches that email, we've emailed the key to it."
- **Rate limits.** In-memory sliding windows: 5 requests per IP per 15 minutes and 3 per
  email per hour (429 with a friendly message).
- **Unconfigured.** Without a valid `STRIPE_SECRET_KEY` or `RESEND_API_KEY` the endpoint
  answers 503 with a friendly "not switched on yet" message.

## Known limits

- Keys are not revoked on refund or dispute. Handle those by hand.
- PayPal: if a buyer is charged and loses connection before the page loads, the key is
  only emailed (needs Resend) or re-claimable by the operator. A PayPal webhook would
  close this gap; it is not built.
- The PayPal rail has been tested against mocked responses only, not the PayPal sandbox.
- Recovery rate limits are in memory, so they reset on a cold start and are per Vercel
  instance, not global. Good enough to stop casual abuse; use a shared store (KV) if it
  is ever hammered.
- Recovery covers card (Stripe) purchases only, not PayPal or manual Venmo sales.
