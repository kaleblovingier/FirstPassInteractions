import { useEffect, useRef, useState } from "react";
import { Check, Copy, Info, Loader2, Sparkles, X } from "lucide-react";
import { claimStripeCheckout } from "@/lib/billing/stripe";
import { useDesk } from "@/lib/drugs/store";
import { Button } from "@/components/ui/button";

export interface LicenseActivatedDialogProps {
  license: string;
  lifetime: boolean;
  onDismiss: () => void;
}

/** Celebratory dialog shown when a paid license is newly activated. */
export function LicenseActivatedDialog({
  license,
  lifetime,
  onDismiss,
}: LicenseActivatedDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!license) return;
    try {
      await navigator.clipboard.writeText(license);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard fallback */
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-activated-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-xs animate-in fade-in duration-200 sm:items-center sm:p-4"
    >
      <div className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl animate-in zoom-in-95 duration-200 sm:max-h-[88dvh] sm:rounded-2xl sm:p-7">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close dialog"
          className="absolute top-4 right-4 flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:bg-bg-sunken hover:text-fg transition-colors cursor-pointer"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3 pr-10">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Access Unlocked
            </p>
            <h2 id="license-activated-title" className="font-serif text-2xl font-bold tracking-tight text-fg">
              {lifetime ? "Founding Lifetime License Activated!" : "License Activated!"}
            </h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Thank you for supporting FirstPass! Your desk now has lifetime access to the Contraindicated Conditions Matrix, Host Factors & Genetics, Enzyme Atlas (CYP), Metabolite Trees, Full Clinical Reports, and CSV/JSON export.
        </p>

        {/* Monospace License Key block */}
        <div className="mt-5 rounded-xl border border-border bg-bg-sunken p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
              Signed License Key
            </span>
            <span className="text-[11px] text-muted">Backup for your records</span>
          </div>
          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div
              className="flex-1 overflow-x-auto rounded-lg border border-border/80 bg-surface px-3 py-2.5 font-mono text-xs font-bold text-fg select-all break-all"
              tabIndex={0}
              aria-label="License key"
            >
              {license}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleCopy()}
              className="min-h-[44px] shrink-0 gap-1.5 text-xs font-semibold cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-ok" />
                  <span className="text-ok">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-4 text-muted" />
                  <span>Copy Key</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] w-full sm:w-auto px-6 font-semibold cursor-pointer"
          >
            Start Exploring Desk
          </Button>
        </div>
      </div>
    </div>
  );
}

/** After Stripe Checkout returns, claim the paid session and activate the signed key. */
export function StripeReturn({ ready }: { ready: boolean }) {
  const activate = useDesk((s) => s.activateLicense);
  const openCheckout = useDesk((s) => s.openCheckout);
  const justActivated = useDesk((s) => s.justActivated);
  const license = useDesk((s) => s.license);
  const lifetime = useDesk((s) => s.lifetime);
  const dismiss = useDesk((s) => s.dismissActivated);
  const ran = useRef(false);
  const [claiming, setClaiming] = useState(false);
  const [canceledMessage, setCanceledMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!canceledMessage) return;
    const timer = window.setTimeout(() => setCanceledMessage(null), 6000);
    return () => window.clearTimeout(timer);
  }, [canceledMessage]);

  useEffect(() => {
    if (!ready || ran.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paid = params.get("session_id") || params.get("sessionId") || params.get("fp_paid");
    const cancel =
      params.get("fp_cancel") ||
      params.get("canceled") ||
      params.get("cancelled") ||
      params.get("cancel");
    if (!paid && !cancel) return;
    ran.current = true;
    const clean = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("session_id");
        url.searchParams.delete("sessionId");
        url.searchParams.delete("fp_paid");
        url.searchParams.delete("fp_cancel");
        url.searchParams.delete("canceled");
        url.searchParams.delete("cancelled");
        url.searchParams.delete("cancel");
        const nextSearch = url.searchParams.toString();
        const nextUrl = url.pathname + (nextSearch ? `?${nextSearch}` : "") + url.hash;
        window.history.replaceState({}, "", nextUrl);
      } catch {
        /* browser history fallback */
      }
    };
    if (cancel) {
      clean();
      setCanceledMessage("Card checkout was canceled. No charges were made.");
      return;
    }
    setClaiming(true);
    void (async () => {
      try {
        const res = await claimStripeCheckout({ data: { sessionId: paid ?? "" } });
        if (res.ok) {
          activate({ plan: res.plan, license: res.license, lifetime: res.lifetime });
        } else {
          openCheckout(
            "lab",
            res.reason ??
              "Payment did not clear yet. If you were charged, wait a moment or paste the key from your email under Redeem.",
          );
        }
      } catch {
        openCheckout(
          "lab",
          "Could not verify your card session. Check your internet connection or paste your key under Redeem.",
        );
      } finally {
        setClaiming(false);
        clean();
      }
    })();
  }, [ready, activate, openCheckout]);

  return (
    <>
      {claiming ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-lg border border-accent/30 bg-surface px-4 py-3 text-sm font-medium text-fg shadow-lg"
        >
          <Loader2 className="size-4 animate-spin text-accent" />
          <span>Verifying Stripe checkout & minting license…</span>
        </div>
      ) : null}

      {canceledMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 flex max-w-sm items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-fg shadow-lg animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <Info className="size-4 shrink-0 text-muted" />
            <span className="text-xs text-muted leading-relaxed">{canceledMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setCanceledMessage(null)}
            className="flex size-11 min-h-[44px] min-w-[44px] items-center justify-center shrink-0 rounded p-1 text-muted hover:bg-bg-sunken hover:text-fg cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {justActivated && license ? (
        <LicenseActivatedDialog
          license={license}
          lifetime={lifetime}
          onDismiss={dismiss}
        />
      ) : null}
    </>
  );
}
