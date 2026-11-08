# Program licenses by card (Team and Program)

A clinic or program can pay for a **Team** or **Program** license by card on
`/for-programs`, for one year, and get its program key (`FP-ORG-…`) on the return
page and by email. **Site** stays quote, invoice and purchase order. The invoice /
PO path and the inquiry form stay on the page either way.

**Off by default.** With the flag off, `/for-programs` looks exactly as before and
the start function refuses with a plain reason.

## Before turning it on: set the prices

The prices in `src/lib/billing/programs.ts` are still marked **DRAFT**
(Team $690/yr, Program $1,900/yr). Card checkout charges exactly those numbers.
Kaleb sets the real ones there first; the page, the Stripe line item and the
fulfilment amount check all follow that file.

## Turning it on

Set these on the Vercel project (Production), then redeploy:

| Name | Value |
| --- | --- |
| `PROGRAM_CHECKOUT` | `on` (anything else keeps it off) |
| `STRIPE_SECRET_KEY` | `sk_test_…` to try it, `sk_live_…` for real money. Same key as individual checkout. |
| `STRIPE_WEBHOOK_SECRET` | Already set for individual licenses. The same webhook (`/api/stripe/webhook`, `checkout.session.completed`) handles program sessions. |
| `RESEND_API_KEY`, `LICENSE_FROM` | To email the key. Without them the key still shows on the return page. |
| `LICENSE_PEPPER` | Already required. Never change it after selling keys. |

The "Pay by card" buttons appear only when the server reports both the flag and a
valid Stripe key. To turn it off, unset `PROGRAM_CHECKOUT` and redeploy. A buyer who
already paid can still claim their key while Stripe is configured.

## What the server checks

- Start: tier is Team or Program, seats are 1 to the tier cap (honor system),
  organization name and email present, term is one year. The client never sends a
  price; it comes from `programs.ts`. Promotion codes are off for program sessions.
- Fulfilment (return page and webhook): paid, USD, metadata product
  `firstpass-program`, tier Team or Program, `amount_total` equals the list price
  exactly, seats within the cap.
- Key: `mintProgramKey(tier, org, end month)` where the end month is 12 months after
  the Stripe session was created. The same session always gives the same key. The
  key is stamped on the session metadata and emailed once (idempotency key
  `fp-program-<session id>`), with the operator in Bcc.

## Test run (Stripe test mode)

1. Set `PROGRAM_CHECKOUT=on` and an `sk_test_` key on a preview deployment.
2. On `/for-programs`, choose Pay by card on Team, enter an org, an email and a seat
   count, and pay with Stripe's test card `4242 4242 4242 4242`.
3. The return page shows the `FP-ORG-T…` key. Redeem it on the desk under Plans.
4. In Stripe, the session's metadata shows `license_key`, and the webhook delivery
   returned 200.

Note: the program key's body comes from the organization name, so two buyers who
type the same name, tier and month get the same key. That matches how Foundry
already mints program keys.
