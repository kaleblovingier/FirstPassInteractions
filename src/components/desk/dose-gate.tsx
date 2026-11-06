import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { doseAttested, useDesk } from "@/lib/drugs/store";

export const DOSE_ATTEST_LEAD = "Before using the dose calculators:";
export const DOSE_ATTEST_TEXT =
  "I'm a licensed healthcare professional, or a health-professions student working under supervision. I won't use them for time-critical decisions. The Prescribing Information and my institution's protocols govern.";

/**
 * Clinician attestation in front of a dose or infusion-rate calculator. The calculator
 * renders nothing, inputs included, until the user confirms. One confirmation, saved with
 * its version in this browser, opens every calculator. "Not now" saves nothing.
 */
export function DoseGate({ children }: { children?: ReactNode }) {
  const ok = useDesk(doseAttested);
  const attest = useDesk((s) => s.attestDose);
  const [later, setLater] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  const leadId = useId();

  // The button pressed is gone after the swap; keep focus here instead of dropping it to the page.
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    box.current?.focus();
  });
  const then = (fn: () => void) => () => {
    refocus.current = true;
    fn();
  };

  return (
    <div ref={box} tabIndex={-1} className="outline-none">
      {ok ? (
        children
      ) : later ? (
        <p className="text-sm text-muted">
          Dose calculators stay closed.{" "}
          <button type="button" onClick={then(() => setLater(false))} className="font-medium text-accent underline underline-offset-2">
            Review
          </button>
        </p>
      ) : (
        <section aria-labelledby={leadId} className="rounded-xl border border-border bg-warn-soft/60 p-4">
          <p className="text-sm leading-relaxed text-fg">
            <strong id={leadId} className="font-semibold">
              {DOSE_ATTEST_LEAD}
            </strong>{" "}
            {DOSE_ATTEST_TEXT}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={then(attest)}>
              Confirm
            </Button>
            <Button size="sm" variant="secondary" onClick={then(() => setLater(true))}>
              Not now
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
