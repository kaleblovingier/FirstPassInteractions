import { useEffect, useRef, useState } from "react";
import { Info, Loader2, X } from "lucide-react";
import { claimStripeCheckout } from "@/lib/billing/stripe";
import { useDesk } from "@/lib/drugs/store";

/** After Stripe Checkout returns, claim the paid session and activate the signed key. */
export function StripeReturn({ ready }: { ready: boolean }) {
  const activate = useDesk((s) => s.activateLicense);
  const openCheckout = useDesk((s) => s.openCheckout);
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

  if (claiming) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-lg border border-accent/30 bg-surface px-4 py-3 text-sm font-medium text-fg shadow-lg"
      >
        <Loader2 className="size-4 animate-spin text-accent" />
        <span>Verifying Stripe checkout & minting license…</span>
      </div>
    );
  }

  if (canceledMessage) {
    return (
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
          className="shrink-0 rounded p-1 text-muted hover:bg-bg-sunken hover:text-fg cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return null;
}
