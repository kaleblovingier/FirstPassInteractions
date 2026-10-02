import { useEffect, useState } from "react";
import { Check, CreditCard, KeyRound, Loader2, X } from "lucide-react";
import {
  COMMERCE,
  FOUNDING_UNLOCKS,
  MANUAL_UNLOCK_STEPS,
  OPERATOR,
  PAY_RAILS,
  PLANS_FAQ,
  requestLicense,
} from "@/lib/billing/commerce";
import { redeemLicense } from "@/lib/billing/license";
import { startStripeCheckout, stripeStatus } from "@/lib/billing/stripe";
import { PLAN_BY_ID, PLAN_TIERS, priceFor } from "@/lib/billing/plans";
import { useDesk, usePlan } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plate } from "./plate";
import { OperatorCard } from "./operator";

const REDEEM_REASON = "Paste the signed key you were sent. Nothing unlocks until Redeem succeeds.";
const FOUNDING_REASON = `Founding is $${COMMERCE.founding} once — host factors, enzyme atlas, metabolite maps, full report, and JSON/CSV export.`;

export function PlansPage() {
  const current = usePlan();
  const license = useDesk((s) => s.license);
  const lifetime = useDesk((s) => s.lifetime);
  const previewUntil = useDesk((s) => s.previewUntil);
  const checkoutOpen = useDesk((s) => s.checkout.open);
  const openCheckout = useDesk((s) => s.openCheckout);
  const startPreview = useDesk((s) => s.startPreview);
  const downgrade = useDesk((s) => s.downgrade);
  const previewing = Boolean(previewUntil && Date.now() < previewUntil && current === "pro");
  const founding = lifetime || (current === "lab" && !previewing);

  const unlock = () => openCheckout("lab", FOUNDING_REASON, "life");
  const redeem = () => {
    openCheckout("lab", REDEEM_REASON, "life");
    // Jump straight to the key field — on phones it sits below the pay rails.
    window.setTimeout(() => {
      const field = document.getElementById("license-key");
      field?.scrollIntoView({ block: "center" });
      field?.focus();
    }, 60);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-24 sm:pb-0">
      <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <Plate src="/plates/heme.jpg" alt="" className="h-32 w-full min-h-32 sm:h-40 lg:h-full" />
          <div className="px-5 py-6 sm:px-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Free vs founding</p>
            <h1 className="mt-3 font-serif text-3xl tracking-tight text-fg sm:text-4xl">
              Five drugs free. Founding is ${COMMERCE.founding} once.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{COMMERCE.pitch}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {founding ? (
                <Button variant="secondary" disabled className="w-full sm:w-auto">
                  <Check className="size-4" />
                  Founding is live on this desk
                </Button>
              ) : (
                <Button onClick={unlock} className="w-full sm:w-auto">
                  Unlock founding · ${COMMERCE.founding} once
                </Button>
              )}
              <Button variant="secondary" onClick={redeem} className="w-full sm:w-auto">
                <KeyRound className="size-4" />
                Have a key? Redeem it
              </Button>
              {current === "free" ? (
                <button
                  type="button"
                  onClick={startPreview}
                  className="h-10 text-sm text-muted underline-offset-4 hover:text-fg hover:underline sm:px-2"
                >
                  Or try 7 days free
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {current !== "free" ? (
        <p className="rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">
          {previewing
            ? "Your 7-day preview is on — host factors and the enzyme atlas are open while it lasts."
            : founding
              ? "Founding is live — host factors, enzyme atlas, metabolite maps, full report, and export are yours."
              : "Your Pro key is live on this desk."}
          {license ? ` Key ${license}.` : ""}{" "}
          <button type="button" className="underline" onClick={downgrade}>
            Return to free desk
          </button>
        </p>
      ) : null}

      <ul className="grid gap-4 md:grid-cols-2">
        {PLAN_TIERS.map((id) => {
          const p = PLAN_BY_ID[id];
          const isFree = id === "free";
          return (
            <li
              key={id}
              className={cn(
                "flex flex-col rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
                p.highlighted && "ring-1 ring-accent",
              )}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{p.name}</p>
              <p className="mt-2 font-mono text-3xl tabular-nums text-fg">
                {isFree ? "$0" : `$${COMMERCE.founding}`}
                <span className="ml-1 text-sm text-muted">{isFree ? "forever" : "once · lifetime"}</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-fg">{p.tagline}</p>
              <ul className="mt-5 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-muted">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isFree ? (
                  <Button variant="secondary" className="w-full" disabled={current === "free"} onClick={downgrade}>
                    {current === "free" ? "You're on the free desk" : "Switch to free desk"}
                  </Button>
                ) : founding ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Your current license
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button className="w-full" onClick={unlock}>
                      Unlock founding · ${COMMERCE.founding} once
                    </Button>
                    <button
                      type="button"
                      onClick={redeem}
                      className="h-10 w-full text-sm font-medium text-accent hover:underline"
                    >
                      Already paid? Redeem your key
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <section className="rounded-xl bg-surface px-4 py-5 shadow-[var(--shadow-border)] sm:px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">How founding unlocks</p>
        <h2 className="mt-2 font-serif text-xl tracking-tight text-fg">Pay, get your key, Redeem</h2>
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

      <section>
        <h2 className="font-serif text-xl tracking-tight text-fg">Questions</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {PLANS_FAQ.map((item) => (
            <div key={item.q} className="rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
              <dt className="text-sm font-medium text-fg">{item.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <OperatorCard />

      <p className="text-center text-sm text-muted">
        Already paid, or have a key from email or text?{" "}
        <button type="button" className="font-medium text-accent hover:underline" onClick={redeem}>
          Paste and redeem it here
        </button>
        .
      </p>

      {!checkoutOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-md gap-2">
            {founding ? null : (
              <Button className="flex-1" onClick={unlock}>
                Founding · ${COMMERCE.founding} once
              </Button>
            )}
            <Button variant="secondary" className={founding ? "flex-1" : "shrink-0"} onClick={redeem}>
              <KeyRound className="size-4" />
              Redeem key
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CheckoutDrawer() {
  const checkout = useDesk((s) => s.checkout);
  const close = useDesk((s) => s.closeCheckout);
  const activate = useDesk((s) => s.activateLicense);
  const startPreview = useDesk((s) => s.startPreview);
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
  const name = checkout.interval === "life" || checkout.plan === "lab" ? "Founding" : "Pro";
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
            Prefer to look first? Start a 7-day preview
          </button>
        ) : null}
      </div>
    </div>
  );
}
