import { useEffect, useState } from "react";
import { Check, Copy, CreditCard, KeyRound, Loader2, X } from "lucide-react";
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
  const previewUsed = useDesk((s) => s.previewUsed);
  const checkoutOpen = useDesk((s) => s.checkout.open);
  const openCheckout = useDesk((s) => s.openCheckout);
  const startPreview = useDesk((s) => s.startPreview);
  const downgrade = useDesk((s) => s.downgrade);
  const previewing = Boolean(previewUntil && Date.now() < previewUntil && current === "pro");
  const founding = lifetime || (current === "lab" && !previewing);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(id);
      window.setTimeout(() => setCopiedText(null), 1800);
    } catch {
      /* clipboard fallback */
    }
  };

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
                <Button variant="secondary" disabled className="w-full min-h-[44px] sm:w-auto">
                  <Check className="size-4" />
                  Founding is live on this desk
                </Button>
              ) : (
                <Button onClick={unlock} className="w-full min-h-[44px] sm:w-auto cursor-pointer">
                  Unlock founding · ${COMMERCE.founding} once
                </Button>
              )}
              <Button variant="secondary" onClick={redeem} className="w-full min-h-[44px] sm:w-auto cursor-pointer">
                <KeyRound className="size-4" />
                Have a key? Redeem it
              </Button>
              {current === "free" && !previewUsed ? (
                <button
                  type="button"
                  onClick={startPreview}
                  className="flex min-h-[44px] items-center text-sm text-muted underline-offset-4 hover:text-fg hover:underline cursor-pointer sm:px-2"
                >
                  Or try 1 day free
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {current !== "free" ? (
        <p className="rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">
          {previewing
            ? "Your 1-day preview is on — host factors and the enzyme atlas are open while it lasts."
            : founding
              ? "Founding is live — host factors, enzyme atlas, metabolite maps, full report, and export are yours."
              : "Your key is live — host factors and the enzyme atlas are open on this desk."}
          {license ? ` Key ${license}.` : ""}{" "}
          <button type="button" className="underline min-h-[44px] inline-flex items-center cursor-pointer" onClick={downgrade}>
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
                  <Button variant="secondary" className="w-full min-h-[44px]" disabled={current === "free"} onClick={downgrade}>
                    {current === "free" ? "You're on the free desk" : "Switch to free desk"}
                  </Button>
                ) : (
                  <>
                    {/* Prominent accepted payment badges directly on Founding card */}
                    {id === "lab" ? (
                      <div className="mb-3 space-y-1.5">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted font-semibold">
                          Accepted Payment Rails
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-bg-sunken px-2.5 py-1 font-mono text-[11px] font-medium text-fg border border-border/70">
                            <CreditCard className="size-3 text-accent shrink-0" />
                            Card / Stripe (Instant Key)
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-bg-sunken px-2.5 py-1 font-mono text-[11px] font-medium text-fg border border-border/70">
                            Venmo (@{OPERATOR.venmo})
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-bg-sunken px-2.5 py-1 font-mono text-[11px] font-medium text-fg border border-border/70">
                            Cash App (${OPERATOR.cashApp})
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-bg-sunken px-2.5 py-1 font-mono text-[11px] font-medium text-fg border border-border/70">
                            PayPal ({OPERATOR.paypal})
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {founding ? (
                      <Button variant="secondary" className="w-full min-h-[44px]" disabled>
                        Your current license
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button className="w-full min-h-[44px] cursor-pointer font-semibold" onClick={unlock}>
                          Unlock founding · ${COMMERCE.founding} once
                        </Button>
                        <button
                          type="button"
                          onClick={redeem}
                          className="flex min-h-[44px] w-full items-center justify-center text-sm font-medium text-accent hover:underline cursor-pointer"
                        >
                          Already paid? Redeem your key
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Accepted Payment Methods */}
      <section className="rounded-xl bg-surface px-4 py-5 shadow-[var(--shadow-border)] sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted font-semibold">Direct & instant payment</p>
            <h2 className="mt-1 font-serif text-xl tracking-tight text-fg">Accepted Payment Methods</h2>
          </div>
          <span className="font-mono text-xs text-accent font-medium">All payment rails directly on this desk</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          All payment methods are supported on the same page to avoid confusion. Choose instant automated card processing or your preferred manual rail below.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Credit / Debit Card */}
          <div className="flex flex-col justify-between rounded-lg bg-bg-sunken p-4 border border-border/50">
            <div>
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 shrink-0 text-accent" />
                  <span className="text-sm font-semibold text-fg">Card / Stripe</span>
                </div>
                <span className="rounded bg-ok-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ok">
                  Instant Key
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Instant automatic key minting & activation via Stripe. No manual waiting required.
              </p>
            </div>
            <div className="mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={unlock}
                className="min-h-[44px] w-full text-xs font-semibold cursor-pointer"
              >
                Card Checkout · Instant
              </Button>
            </div>
          </div>

          {/* Venmo */}
          <div className="flex flex-col justify-between rounded-lg bg-bg-sunken p-4 border border-border/50">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-semibold text-fg">Venmo</span>
                <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-xs font-semibold text-accent">
                  @{OPERATOR.venmo}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Send ${COMMERCE.founding} founding payment to <span className="font-mono text-fg font-medium">@{OPERATOR.venmo}</span>. Operator issues signed key after clearing.
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="secondary" size="sm" className="min-h-[44px] w-full text-xs font-semibold" asChild>
                <a href={OPERATOR.venmoUrl} target="_blank" rel="noreferrer">
                  Open Venmo (@{OPERATOR.venmo})
                </a>
              </Button>
              <button
                type="button"
                onClick={() => void copyText(`@${OPERATOR.venmo}`, "venmo")}
                className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md border border-border/70 bg-surface px-2 text-xs text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label={`Copy Venmo handle @${OPERATOR.venmo}`}
              >
                {copiedText === "venmo" ? (
                  <>
                    <Check className="size-3.5 text-ok" />
                    <span className="text-ok font-medium">Copied @{OPERATOR.venmo}!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy @{OPERATOR.venmo}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cash App */}
          <div className="flex flex-col justify-between rounded-lg bg-bg-sunken p-4 border border-border/50">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-semibold text-fg">Cash App</span>
                <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-xs font-semibold text-accent">
                  ${OPERATOR.cashApp}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Send ${COMMERCE.founding} founding payment to <span className="font-mono text-fg font-medium">${OPERATOR.cashApp}</span>. Key delivered via text or email.
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="secondary" size="sm" className="min-h-[44px] w-full text-xs font-semibold" asChild>
                <a href={OPERATOR.cashAppUrl} target="_blank" rel="noreferrer">
                  Open Cash App (${OPERATOR.cashApp})
                </a>
              </Button>
              <button
                type="button"
                onClick={() => void copyText(`$${OPERATOR.cashApp}`, "cashapp")}
                className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md border border-border/70 bg-surface px-2 text-xs text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label={`Copy Cash App handle $${OPERATOR.cashApp}`}
              >
                {copiedText === "cashapp" ? (
                  <>
                    <Check className="size-3.5 text-ok" />
                    <span className="text-ok font-medium">Copied ${OPERATOR.cashApp}!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy ${OPERATOR.cashApp}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PayPal */}
          <div className="flex flex-col justify-between rounded-lg bg-bg-sunken p-4 border border-border/50">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-semibold text-fg">PayPal</span>
                <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent truncate max-w-[130px]">
                  FirstPassInteractions
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Send to <span className="font-mono text-fg font-medium break-all">{OPERATOR.paypal}</span>. Key issued to your PayPal email.
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="secondary" size="sm" className="min-h-[44px] w-full text-xs font-semibold" asChild>
                <a href={OPERATOR.paypalUrl} target="_blank" rel="noreferrer">
                  Open PayPal
                </a>
              </Button>
              <button
                type="button"
                onClick={() => void copyText(OPERATOR.paypal, "paypal")}
                className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md border border-border/70 bg-surface px-2 text-xs text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label={`Copy PayPal email ${OPERATOR.paypal}`}
              >
                {copiedText === "paypal" ? (
                  <>
                    <Check className="size-3.5 text-ok" />
                    <span className="text-ok font-medium">Copied PayPal Email!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy PayPal Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-surface px-4 py-5 shadow-[var(--shadow-border)] sm:px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">How founding unlocks</p>
        <h2 className="mt-2 font-serif text-xl tracking-tight text-fg">Pay, get your key, Redeem</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{FOUNDING_UNLOCKS}</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {MANUAL_UNLOCK_STEPS.map((step) => (
            <li key={step.n} className="rounded-md bg-bg-sunken px-3 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-accent font-semibold">
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
        <button type="button" className="font-medium text-accent hover:underline min-h-[44px] inline-flex items-center cursor-pointer" onClick={redeem}>
          Paste and redeem it here
        </button>
        .
      </p>

      {!checkoutOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-md gap-2">
            {founding ? null : (
              <Button className="flex-1 min-h-[44px] cursor-pointer" onClick={unlock}>
                Founding · ${COMMERCE.founding} once
              </Button>
            )}
            <Button variant="secondary" className={cn("min-h-[44px] cursor-pointer", founding ? "flex-1" : "shrink-0")} onClick={redeem}>
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
  const previewUsed = useDesk((s) => s.previewUsed);
  const [busy, setBusy] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [key, setKey] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);
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
  const amount = priceFor(checkout.plan === "free" ? "pro" : checkout.plan, checkout.interval);
  const name = "Founding";
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
          email: email.trim(),
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

  async function copyHandle(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHandle(id);
      window.setTimeout(() => setCopiedHandle(null), 1800);
    } catch {
      /* clipboard */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-labelledby="checkout-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-[var(--shadow-border)] sm:max-h-[88dvh] sm:rounded-xl sm:p-6"
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
            className="flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted hover:bg-bg-sunken hover:text-fg cursor-pointer"
            onClick={close}
            aria-label="Close checkout"
          >
            <X className="size-5" />
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

        <p className="mt-4 text-xs leading-relaxed text-muted">
          All payment pathways are listed below on this same view. Choose instant automated card processing via Stripe or direct rails with Venmo, Cash App, or PayPal.
        </p>

        {/* Section A: Instant Card Checkout (Stripe) */}
        <section className="mt-4 rounded-xl border border-border bg-bg-sunken/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-accent-fg">
                A
              </span>
              <h3 className="text-sm font-semibold text-fg">
                Section A · Instant Card Checkout (Stripe)
              </h3>
            </div>
            <span className="rounded bg-ok-soft px-2 py-0.5 font-mono text-[11px] font-medium text-ok">
              Auto Key Minting
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted">
            Instant automatic key minting & activation via Stripe. No manual waiting required.
          </p>

          {cardLive ? (
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="checkout-email" className="block text-xs font-medium text-muted">
                  Receipt & license key email (optional)
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.org"
                  className="mt-1 min-h-[44px] w-full rounded-md bg-surface px-3 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                />
              </div>
              <Button
                className="min-h-[44px] w-full cursor-pointer font-semibold"
                onClick={() => void payCard()}
                disabled={cardBusy}
              >
                {cardBusy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                Pay ${amount} with card · Instant unlock
              </Button>
              {stripeMode === "test" ? (
                <p className="text-xs text-warn">Stripe is in test mode. No live charge.</p>
              ) : (
                <p className="text-xs text-ok">
                  Stripe mints a signed key immediately after the charge clears, landing you back on this desk.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-md bg-bg-sunken px-3 py-2.5 text-xs text-muted">
              {stripeMode === null
                ? "Checking card checkout…"
                : "Card checkout is not live on this desk yet. Use Section B below for direct payment via Venmo, Cash App, or PayPal."}
            </div>
          )}
        </section>

        {/* Section B: Direct Manual Rails (Venmo, Cash App, PayPal) */}
        <section className="mt-4 rounded-xl border border-border bg-bg-sunken/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-accent-fg">
                B
              </span>
              <h3 className="text-sm font-semibold text-fg">
                Section B · Direct Manual Rails (Venmo, Cash App, PayPal)
              </h3>
            </div>
            <span className="rounded bg-accent/15 px-2 py-0.5 font-mono text-xs font-semibold text-accent">
              ${amount} once
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted">
            Send ${amount} directly with your preferred app. After payment clears, the operator issues your signed key by email or text.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {/* Venmo */}
            <Button
              variant={cardLive ? "secondary" : "default"}
              className="h-auto min-h-[48px] w-full flex-col py-2.5 text-center cursor-pointer"
              asChild
            >
              <a href={OPERATOR.venmoUrl} target="_blank" rel="noreferrer">
                <span className="text-xs font-semibold">Venmo</span>
                <span className="font-mono text-[11px] opacity-80">@{OPERATOR.venmo}</span>
              </a>
            </Button>

            {/* Cash App */}
            <Button
              variant={cardLive ? "secondary" : "default"}
              className="h-auto min-h-[48px] w-full flex-col py-2.5 text-center cursor-pointer"
              asChild
            >
              <a href={OPERATOR.cashAppUrl} target="_blank" rel="noreferrer">
                <span className="text-xs font-semibold">Cash App</span>
                <span className="font-mono text-[11px] opacity-80">${OPERATOR.cashApp}</span>
              </a>
            </Button>

            {/* PayPal */}
            <Button
              variant={cardLive ? "secondary" : "default"}
              className="h-auto min-h-[48px] w-full flex-col py-2.5 text-center cursor-pointer"
              asChild
            >
              <a href={OPERATOR.paypalUrl} target="_blank" rel="noreferrer">
                <span className="text-xs font-semibold">PayPal</span>
                <span className="max-w-full truncate font-mono text-[10px] opacity-80">FirstPassInteractions</span>
              </a>
            </Button>
          </div>

          {/* 1-tap copy handles */}
          <div className="mt-3 space-y-2 rounded-lg bg-surface p-3 text-xs border border-border/70">
            <p className="font-semibold text-fg">Direct handles for your payment note (1-tap copy):</p>
            <div className="grid gap-1.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => void copyHandle(`@${OPERATOR.venmo}`, "drawer-venmo")}
                className="flex min-h-[44px] items-center justify-between gap-1 rounded-md border border-border bg-bg-sunken px-2.5 py-1.5 text-left text-xs font-mono hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label={`Copy Venmo handle @${OPERATOR.venmo}`}
              >
                <span className="truncate">Venmo: @{OPERATOR.venmo}</span>
                <span className="shrink-0 font-sans text-[11px] font-semibold text-accent">
                  {copiedHandle === "drawer-venmo" ? "Copied!" : "Copy"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => void copyHandle(`$${OPERATOR.cashApp}`, "drawer-cashapp")}
                className="flex min-h-[44px] items-center justify-between gap-1 rounded-md border border-border bg-bg-sunken px-2.5 py-1.5 text-left text-xs font-mono hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label={`Copy Cash App handle $${OPERATOR.cashApp}`}
              >
                <span className="truncate">Cash: ${OPERATOR.cashApp}</span>
                <span className="shrink-0 font-sans text-[11px] font-semibold text-accent">
                  {copiedHandle === "drawer-cashapp" ? "Copied!" : "Copy"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => void copyHandle(OPERATOR.paypal, "drawer-paypal")}
                className="flex min-h-[44px] items-center justify-between gap-1 rounded-md border border-border bg-bg-sunken px-2.5 py-1.5 text-left text-xs font-mono hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label={`Copy PayPal email ${OPERATOR.paypal}`}
              >
                <span className="truncate">PayPal Email</span>
                <span className="shrink-0 font-sans text-[11px] font-semibold text-accent">
                  {copiedHandle === "drawer-paypal" ? "Copied!" : "Copy"}
                </span>
              </button>
            </div>
            <p className="text-[11px] text-muted">
              Operator: {OPERATOR.name} · {OPERATOR.email} · {OPERATOR.phone}
            </p>
          </div>

          <Button
            variant="secondary"
            className="mt-3 min-h-[44px] w-full text-xs font-medium cursor-pointer"
            onClick={() => void copyRequest()}
          >
            {copied ? "Request copied to clipboard" : "Copy a license request note"}
          </Button>
        </section>

        {/* Section C: Step 3 · Redeem Signed Key */}
        <section className="mt-4 rounded-xl border border-border bg-bg-sunken/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs font-bold text-bg">
                C
              </span>
              <label className="text-sm font-semibold text-fg" htmlFor="license-key">
                Step 3 · Redeem Signed Key
              </label>
            </div>
            <span className="rounded bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent">
              Unlock Desk
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted">
            Paste the signed key from your email, text, or receipt. Keys look like <span className="font-mono text-fg font-medium">FP-LIFE-…</span>. Nothing unlocks until Redeem succeeds — the field stays empty until you paste one.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              id="license-key"
              value={key}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Paste FP-LIFE-… here"
              aria-invalid={Boolean(err) || undefined}
              className="min-h-[44px] flex-1 font-mono text-sm"
              onChange={(e) => {
                setKey(e.target.value);
                if (err) setErr("");
                if (ok) setOk("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void redeem();
              }}
            />
            <Button
              onClick={() => void redeem()}
              disabled={busy || !key.trim()}
              className="min-h-[44px] shrink-0 font-semibold cursor-pointer sm:w-28"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Redeem
            </Button>
          </div>

          {!key.trim() && !err && !ok ? (
            <p className="mt-2 text-[11px] text-muted">
              Waiting for a key — if you just paid via manual rails, hang tight for email or text from the operator.
            </p>
          ) : null}
          {err ? <p className="mt-2 text-xs font-medium text-danger" role="alert">{err}</p> : null}
          {ok ? <p className="mt-2 text-xs font-medium text-ok" role="status">{ok}</p> : null}
        </section>

        {checkout.plan !== "lab" || checkout.interval === "life" ? (
          previewUsed ? (
            <p className="mt-4 text-center text-xs text-muted">The 1-day preview was already used on this browser.</p>
          ) : (
            <button
              type="button"
              className="mt-4 flex min-h-[44px] w-full items-center justify-center text-center text-xs text-muted hover:text-fg cursor-pointer"
              onClick={startPreview}
            >
              Prefer to look first? Start a 1-day preview
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
