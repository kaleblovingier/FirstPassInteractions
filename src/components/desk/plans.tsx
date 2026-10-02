import { useEffect, useState } from "react";
import { Check, CreditCard, Loader2, X } from "lucide-react";
import {
  BUYERS,
  COMMERCE,
  FOUNDING_UNLOCKS,
  MANUAL_UNLOCK_STEPS,
  OPERATOR,
  PAY_RAILS,
  requestLicense,
} from "@/lib/billing/commerce";
import { redeemLicense } from "@/lib/billing/license";
import { startStripeCheckout, stripeStatus } from "@/lib/billing/stripe";
import { PLANS, priceFor, type Interval } from "@/lib/billing/plans";
import { useDesk, usePlan } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plate } from "./plate";
import { OperatorCard } from "./operator";

export function PlansPage() {
  const current = usePlan();
  const license = useDesk((s) => s.license);
  const lifetime = useDesk((s) => s.lifetime);
  const previewUntil = useDesk((s) => s.previewUntil);
  const interval = useDesk((s) => s.checkout.interval);
  const setInterval = useDesk((s) => s.setCheckoutInterval);
  const openCheckout = useDesk((s) => s.openCheckout);
  const startPreview = useDesk((s) => s.startPreview);
  const downgrade = useDesk((s) => s.downgrade);
  const previewing = Boolean(previewUntil && Date.now() < previewUntil && current === "pro");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <Plate src="/plates/heme.jpg" alt="" className="h-40 w-full lg:h-full min-h-40" />
          <div className="px-5 py-6 sm:px-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Free vs founding</p>
            <h1 className="mt-3 font-serif text-3xl tracking-tight text-fg sm:text-4xl">
              Five-drug checks stay free. Founding is ${COMMERCE.founding} once.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{COMMERCE.pitch}</p>
            <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
              <li className="rounded-md bg-bg-sunken px-3 py-2">
                <span className="font-medium text-fg">Free desk</span>
                <span className="mt-0.5 block text-xs leading-relaxed">
                  Up to five medicines, interaction cards, concentration sketch, and heatmap — no card
                  required.
                </span>
              </li>
              <li className="rounded-md bg-bg-sunken px-3 py-2">
                <span className="font-medium text-fg">Founding · ${COMMERCE.founding} lifetime</span>
                <span className="mt-0.5 block text-xs leading-relaxed">
                  Host factors, enzyme atlas, metabolite maps, full report, and JSON/CSV export —
                  yours for life on this desk.
                </span>
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  openCheckout(
                    "lab",
                    "Founding lifetime ($79 once) — Pro tools plus export, yours forever on this desk.",
                    "life",
                  )
                }
              >
                Unlock founding · ${COMMERCE.founding}
              </Button>
              {current === "free" ? (
                <Button variant="secondary" onClick={startPreview}>
                  Try 7 days free
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {(["life", "year", "month"] as Interval[]).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInterval(i)}
            className={cn(
              "h-10 rounded-full px-4 text-sm font-medium",
              interval === i ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            {i === "life" ? "Lifetime" : i === "year" ? "Yearly" : "Monthly"}
          </button>
        ))}
      </div>

      {current !== "free" ? (
        <p className="rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">
          {previewing
            ? "Pro preview is active — host factors and atlas are open while it lasts."
            : lifetime
              ? "Founding lifetime is live — host factors, atlas, and export are yours."
              : `${current === "lab" ? "Lab" : "Pro"} is live on this desk.`}
          {license ? ` Key ${license}.` : ""}{" "}
          <button type="button" className="underline" onClick={downgrade}>
            Return to free desk
          </button>
        </p>
      ) : null}

      <ul className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => {
          const price = priceFor(p.id, p.id === "free" ? "month" : interval);
          const on = current === p.id || (p.id === "pro" && previewing);
          const cta =
            p.id === "free"
              ? current === "free"
                ? "You're on the free desk"
                : "Switch to free desk"
              : interval === "life"
                ? `Founding · $${priceFor(p.id === "pro" ? "pro" : "lab", "life")} lifetime`
                : `Unlock ${p.name}`;
          return (
            <li
              key={p.id}
              className={cn(
                "flex flex-col rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
                p.highlighted && "ring-1 ring-accent",
              )}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{p.name}</p>
              <p className="mt-2 font-serif text-2xl tracking-tight text-fg">{p.tagline}</p>
              <p className="mt-4 font-mono text-3xl tabular-nums text-fg">
                {p.id === "free" ? "—" : `$${price}`}
                <span className="ml-1 text-sm text-muted">
                  {p.id === "free" ? "free" : interval === "life" ? " once" : interval === "year" ? "/yr" : "/mo"}
                </span>
              </p>
              <ul className="mt-5 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-muted">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {p.id === "free" ? (
                  <Button variant="secondary" className="w-full" disabled={current === "free"} onClick={downgrade}>
                    {cta}
                  </Button>
                ) : on && !previewing && !(interval === "life" && !lifetime) ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Current license
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() =>
                      openCheckout(
                        interval === "life" ? "lab" : p.id,
                        interval === "life"
                          ? "Founding lifetime ($79 once) — host factors, atlas, and export."
                          : p.name,
                        interval,
                      )
                    }
                  >
                    {cta}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <section>
        <h2 className="font-serif text-xl tracking-tight text-fg">Who this is for</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {BUYERS.map((b) => (
            <li key={b.who} className="rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
              <p className="text-sm font-medium text-fg">{b.who}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{b.why}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-surface px-4 py-5 shadow-[var(--shadow-border)] sm:px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">How founding unlocks</p>
        <h2 className="mt-2 font-serif text-xl tracking-tight text-fg">Pay → get key → Redeem</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{FOUNDING_UNLOCKS}</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {MANUAL_UNLOCK_STEPS.map((step) => (
            <li key={step.n} className="rounded-md bg-bg-sunken px-3 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-accent">
                Step {step.n} · {step.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <OperatorCard />

      <p className="text-center text-sm text-muted">
        Already paid, or have a key from email or text?{" "}
        <button
          type="button"
          className="font-medium text-accent hover:underline"
          onClick={() =>
            openCheckout("lab", "Paste the signed key you were sent. Nothing unlocks until Redeem succeeds.")
          }
        >
          Paste and redeem it here
        </button>
        .
      </p>
    </div>
  );
}

export function CheckoutDrawer() {
  const checkout = useDesk((s) => s.checkout);
  const close = useDesk((s) => s.closeCheckout);
  const activate = useDesk((s) => s.activateLicense);
  const startPreview = useDesk((s) => s.startPreview);
  const setInterval = useDesk((s) => s.setCheckoutInterval);
  const [busy, setBusy] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [copied, setCopied] = useState(false);
  const [stripeMode, setStripeMode] = useState<"off" | "test" | "live" | null>(null);
  useEffect(() => {
    if (!checkout.open) return;
    let live = true;
    void stripeStatus()
      .then((s) => {
        if (live) setStripeMode(s.mode);
      })
      .catch(() => {
        if (live) setStripeMode("off");
      });
    return () => {
      live = false;
    };
  }, [checkout.open]);
  if (!checkout.open) return null;
  const life = checkout.interval === "life" || checkout.plan === "lab";
  const amount = priceFor(checkout.plan === "free" ? "pro" : checkout.plan, checkout.interval);
  const name = checkout.interval === "life" ? "Founding" : checkout.plan === "lab" ? "Lab" : "Pro";
  const cardLive = stripeMode === "live" || stripeMode === "test";

  async function redeem() {
    const trimmed = key.trim();
    if (!trimmed) {
      setErr("Paste the key from your email or text first.");
      setOk("");
      return;
    }
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const res = await redeemLicense({ data: { key: trimmed } });
      if (!res.ok) {
        setErr(
          res.reason ??
            "That key did not verify. Check for a missing character, or ask for a fresh key.",
        );
        return;
      }
      setOk(
        res.lifetime
          ? "Founding lifetime unlocked. Host factors, atlas, and export are open on this desk."
          : "License unlocked. Host factors and atlas are open on this desk.",
      );
      activate({ plan: res.plan, license: res.license, lifetime: res.lifetime });
    } catch {
      setErr("Could not reach the license desk. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function payCard() {
    setCardBusy(true);
    setErr("");
    try {
      const res = await startStripeCheckout({
        data: {
          plan: checkout.plan === "lab" ? "lab" : "pro",
          interval: checkout.interval,
        },
      });
      if (!res.ok) {
        setErr(res.reason);
        return;
      }
      window.location.assign(res.url);
    } catch {
      setErr("Could not open Stripe.");
    } finally {
      setCardBusy(false);
    }
  }

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(requestLicense());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-labelledby="checkout-title"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Checkout</p>
            <h2 id="checkout-title" className="mt-1 font-serif text-2xl tracking-tight text-fg">
              FirstPass {name}
            </h2>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-sm text-muted hover:bg-bg-sunken hover:text-fg"
            onClick={close}
            aria-label="Close checkout"
          >
            <X className="size-4" />
          </button>
        </div>
        {checkout.reason ? <p className="mt-3 text-sm leading-relaxed text-muted">{checkout.reason}</p> : null}

        <p className="mt-3 text-sm leading-relaxed text-muted">{FOUNDING_UNLOCKS}</p>

        <ol className="mt-4 grid gap-2">
          {MANUAL_UNLOCK_STEPS.map((step) => (
            <li key={step.n} className="flex gap-3 rounded-md bg-bg-sunken px-3 py-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs font-medium text-bg">
                {step.n}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-fg">{step.title}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          {cardLive
            ? "Pay with card on Stripe. A signed key is minted only after Stripe confirms payment — there is no fake checkout. Prefer Venmo, Cash App, or PayPal? Use the buttons below, then paste your key when it arrives."
            : "Card checkout is not live on this desk yet. Pay with Venmo, Cash App, or PayPal below. After payment clears, you get a signed key by email or text — paste it under Redeem. Nothing unlocks until that key verifies."}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-1">
          {(["life", "year", "month"] as Interval[]).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={cn(
                "h-11 rounded-sm text-xs font-medium sm:text-sm",
                checkout.interval === i ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {i === "life"
                ? `$${priceFor("lab", "life")} once`
                : i === "year"
                  ? `$${priceFor(checkout.plan === "lab" ? "lab" : "pro", "year")}/yr`
                  : `$${priceFor(checkout.plan === "lab" ? "lab" : "pro", "month")}/mo`}
            </button>
          ))}
        </div>

        {cardLive ? (
          <>
            <Button className="mt-5 w-full" onClick={() => void payCard()} disabled={cardBusy}>
              {cardBusy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              Pay ${amount} with card
            </Button>
            {stripeMode === "test" ? (
              <p className="mt-2 text-xs text-warn">Stripe is in test mode. No live charge.</p>
            ) : (
              <p className="mt-2 text-xs text-ok">
                Stripe mints a signed key only after the charge clears. You land back on this desk.
              </p>
            )}
          </>
        ) : (
          <p className="mt-5 rounded-md bg-bg-sunken px-3 py-2 text-xs text-muted">
            {stripeMode === null
              ? "Checking card checkout…"
              : "Card button hidden until Stripe is configured. Use a pay rail below."}
          </p>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2">
          {PAY_RAILS.map((rail) => (
            <Button
              key={rail.id}
              variant={cardLive ? "secondary" : "default"}
              className="w-full"
              asChild
            >
              <a href={rail.href} target="_blank" rel="noreferrer">
                {rail.label}
              </a>
            </Button>
          ))}
        </div>
        <div className="mt-3 space-y-1.5 rounded-md bg-bg-sunken px-3 py-3 text-sm leading-relaxed text-muted">
          <p>
            {life
              ? cardLive
                ? `Founding is $${COMMERCE.founding} once. Card is the default; written rails still work.`
                : `Founding is $${COMMERCE.founding} once. Pay with a rail above, then wait for your key.`
              : cardLive
                ? `Pay $${amount} with card, or use a written rail.`
                : `Pay $${amount} via a rail above. Key arrives after it clears.`}
          </p>
          <p className="text-xs">
            Handles: {OPERATOR.payLine}
          </p>
          <p className="text-xs">
            Write: {OPERATOR.email} · {OPERATOR.phone}
            <span className="mt-0.5 block">{OPERATOR.social.join(" · ")}</span>
          </p>
        </div>

        <Button variant="secondary" className="mt-3 w-full" onClick={() => void copyRequest()}>
          {copied ? "Request copied" : "Copy a license request"}
        </Button>

        <div className="mt-5 rounded-lg border border-border px-3 py-3">
          <label className="block text-xs font-medium text-fg" htmlFor="license-key">
            Step 3 · Redeem your key
          </label>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Paste the signed key from email or text. Keys look like FP-LIFE-…. Nothing unlocks until
            Redeem succeeds — the field stays empty until you paste one.
          </p>
          <div className="mt-2.5 flex gap-2">
            <Input
              id="license-key"
              value={key}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Paste FP-LIFE-… here"
              aria-invalid={Boolean(err) || undefined}
              onChange={(e) => {
                setKey(e.target.value);
                if (err) setErr("");
                if (ok) setOk("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void redeem();
              }}
            />
            <Button onClick={() => void redeem()} disabled={busy || !key.trim()} className="shrink-0">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Redeem
            </Button>
          </div>
          {!key.trim() && !err && !ok ? (
            <p className="mt-2 text-[11px] text-muted">
              Waiting for a key — if you just paid, hang tight for email or text from the operator.
            </p>
          ) : null}
          {err ? <p className="mt-2 text-sm text-danger" role="alert">{err}</p> : null}
          {ok ? <p className="mt-2 text-sm text-ok" role="status">{ok}</p> : null}
        </div>

        {checkout.plan !== "lab" || checkout.interval === "life" ? (
          <button type="button" className="mt-3 h-10 w-full text-sm text-muted hover:text-fg" onClick={startPreview}>
            Prefer to look first? Start a 7-day Pro preview
          </button>
        ) : null}
      </div>
    </div>
  );
}
