import { Lock } from "lucide-react";
import { FOUNDING_UNLOCKS, PAY_RAILS } from "@/lib/billing/commerce";
import {
  FOUNDING_PATH_SHORT,
  FOUNDING_PATH_STEPS,
  FREE_DESK_LINE,
  FOUNDING_PRICE_LINE,
  foundingGateCopy,
  type FoundingGateKind,
} from "@/lib/billing/founding-gate";
import { useDesk } from "@/lib/drugs/store";
import { Button } from "@/components/ui/button";

export function Paywall({
  title,
  blurb,
  gate = "host",
  pin = false,
  children,
}: {
  title?: string;
  blurb?: string;
  /** Which founding surface this overlay coaches — drives shared free / $79 / path copy. */
  gate?: FoundingGateKind;
  /** Atlas is a long page. Pin the card to the top and keep it in view while the map scrolls. */
  pin?: boolean;
  children: React.ReactNode;
}) {
  const openCheckout = useDesk((s) => s.openCheckout);
  const startPreview = useDesk((s) => s.startPreview);
  const previewUsed = useDesk((s) => s.previewUsed);
  const setView = useDesk((s) => s.setView);
  const copy = foundingGateCopy(gate);
  const heading = title ?? copy.title;
  const body = blurb ?? copy.blurb;

  const card = (
    <>
      <Lock className="mx-auto size-4 text-accent" />
      <div>
        <p className="font-serif text-lg tracking-tight text-fg">{heading}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          {FREE_DESK_LINE} {FOUNDING_PRICE_LINE}
        </p>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-fg">
          {FOUNDING_PATH_SHORT}
          <span className="font-normal text-muted">
            {" "}
            · {FOUNDING_PATH_STEPS.map((s) => s.title).join(", ")}
          </span>
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">{FOUNDING_UNLOCKS}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" onClick={() => openCheckout("lab", copy.reason, "life")}>
          Founding · $79 once
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setView("plans");
          }}
        >
          Plans
        </Button>
        {previewUsed ? null : (
          <Button size="sm" variant="secondary" onClick={startPreview}>
            Try 1 day free
          </Button>
        )}
      </div>
      <p className="text-[11px] leading-relaxed text-muted">
        {FOUNDING_PATH_SHORT} · {PAY_RAILS.map((r) => `${r.label} ${r.handle}`).join(" · ")}
        {" · "}card when Stripe is live
      </p>
    </>
  );

  if (pin) {
    return (
      <div>
        <div className="sticky top-3 z-30 mx-auto mb-4 flex w-full max-w-lg flex-col items-center gap-3 rounded-xl bg-surface px-4 py-4 text-center shadow-[var(--shadow-border)]">
          {card}
        </div>
        <div className="pointer-events-none select-none blur-[3px]" aria-hidden>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="pointer-events-none select-none blur-[3px]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/80 px-4 py-5 text-center">
        {card}
      </div>
    </div>
  );
}
