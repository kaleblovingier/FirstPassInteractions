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
  children,
}: {
  title?: string;
  blurb?: string;
  /** Which founding surface this overlay coaches — drives shared free / $79 / path copy. */
  gate?: FoundingGateKind;
  children: React.ReactNode;
}) {
  const openCheckout = useDesk((s) => s.openCheckout);
  const startPreview = useDesk((s) => s.startPreview);
  const setView = useDesk((s) => s.setView);
  const copy = foundingGateCopy(gate);
  const heading = title ?? copy.title;
  const body = blurb ?? copy.blurb;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="pointer-events-none select-none blur-[3px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/80 px-4 py-5 text-center">
        <Lock className="size-4 text-accent" />
        <div>
          <p className="font-serif text-lg tracking-tight text-fg">{heading}</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{body}</p>
          <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-muted">
            {FREE_DESK_LINE} {FOUNDING_PRICE_LINE}
          </p>
          <p className="mt-1 max-w-sm text-[11px] font-medium leading-relaxed text-fg">
            {FOUNDING_PATH_SHORT}
            <span className="font-normal text-muted">
              {" "}
              · {FOUNDING_PATH_STEPS.map((s) => s.title).join(" → ")}
            </span>
          </p>
          <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-muted">{FOUNDING_UNLOCKS}</p>
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
          <Button size="sm" variant="secondary" onClick={startPreview}>
            Try 7 days free
          </Button>
        </div>
        <p className="max-w-xs text-[11px] leading-relaxed text-muted">
          {FOUNDING_PATH_SHORT} · {PAY_RAILS.map((r) => `${r.label} ${r.handle}`).join(" · ")}
          {" · "}card when Stripe is live
        </p>
      </div>
    </div>
  );
}
