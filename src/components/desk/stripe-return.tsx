import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { claimStripeCheckout } from "@/lib/billing/stripe";
import { useDesk } from "@/lib/drugs/store";

/** After Stripe Checkout returns, claim the paid session and activate the signed key. */
export function StripeReturn({ ready }: { ready: boolean }) {
  const activate = useDesk((s) => s.activateLicense);
  const openCheckout = useDesk((s) => s.openCheckout);
  const ran = useRef(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!ready || ran.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paid = params.get("fp_paid");
    const cancel = params.get("fp_cancel");
    if (!paid && !cancel) return;
    ran.current = true;
    const clean = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("fp_paid");
      url.searchParams.delete("fp_cancel");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    };
    if (cancel) {
      openCheckout(
        "lab",
        "Card checkout was cancelled. You can still unlock founding the written way: pay $79 once via Venmo, Cash App, or PayPal, get your key, then Redeem below.",
      );
      clean();
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

  if (!claiming) return null;

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
