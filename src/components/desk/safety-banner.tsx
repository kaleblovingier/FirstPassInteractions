import { ShieldAlert, AlertTriangle, ExternalLink, HeartPulse } from "lucide-react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { hasMme } from "@/lib/drugs/mme";
import type { HostContext } from "@/lib/drugs/types";
import { Button } from "@/components/ui/button";

const STREET_DRUGS = new Set([
  "fentanyl",
  "dirty-30",
  "heroin",
  "xylazine",
  "medetomidine",
  "seven-oh",
  "carfentanil",
  "isotonitazene",
  "protonitazene",
  "metonitazene",
  "etonitazene",
]);

interface AddictionSafetyBannerProps {
  selected: string[];
  host: HostContext;
  onOpenHelp: () => void;
}

export function AddictionSafetyBanner({ selected, host, onOpenHelp }: AddictionSafetyBannerProps) {
  if (selected.length === 0) return null;

  const hasStreet = selected.some((id) => STREET_DRUGS.has(id));
  const hasOpioid = selected.some((id) => {
    const d = DRUG_BY_ID[id];
    return d?.pd.includes("opioid") || hasMme([id]);
  });
  const hasAlcohol = selected.includes("ethanol") || host.alcohol === "acute" || host.alcohol === "chronic";

  if (!hasStreet && !hasOpioid && !hasAlcohol) return null;

  if (hasStreet) {
    return (
      <aside
        aria-label="Street drug safety warning"
        className="rounded-xl border border-danger/30 bg-danger-soft/30 p-3.5 sm:p-4 shadow-[var(--shadow-border)] text-fg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-danger/20 text-danger">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-danger">
                  Adulterant Supply Risk
                </span>
                <span className="rounded bg-danger/20 px-1.5 py-0.5 font-mono text-[9px] text-danger font-medium">
                  Xylazine & Fentanyl Alert
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-fg">
                Street supply contains high rates of potent synthetic opioids and alpha-2 adulterants (xylazine / tranq).
                <strong className="font-semibold text-fg"> Naloxone will not reverse xylazine sedation</strong> — rescue breathing is mandatory.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={onOpenHelp}
              className="h-8 gap-1.5 bg-danger text-bg hover:bg-danger/90 text-xs font-medium whitespace-nowrap"
            >
              <HeartPulse className="size-3.5" />
              Safety Protocols & Local Care
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  if (hasOpioid) {
    return (
      <aside
        aria-label="Opioid safety reminder"
        className="rounded-xl border border-accent/25 bg-accent-soft/35 p-3.5 sm:p-4 shadow-[var(--shadow-border)] text-fg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-accent">
                  Harm Reduction Guidance
                </span>
                <span className="rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[9px] text-accent font-medium">
                  CDC 2022 Co-Prescription Rails
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-fg">
                Opioid medication on tray. CDC guidance advises evaluating cumulative respiratory risk, verifying home naloxone (Narcan) access, and connecting patients to state MOUD/MAT resources.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenHelp}
              className="h-8 gap-1.5 text-xs font-medium border border-accent/30 whitespace-nowrap"
            >
              <HeartPulse className="size-3.5 text-accent" />
              Find Naloxone & Care
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  // hasAlcohol
  return (
    <aside
      aria-label="Alcohol safety alert"
      className="rounded-xl border border-border bg-bg-sunken p-3.5 sm:p-4 shadow-[var(--shadow-border)] text-fg"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
            <ShieldAlert className="size-4" />
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-muted">
              Substance Interaction Context
            </span>
            <p className="mt-1 text-xs leading-relaxed text-fg">
              Alcohol intake interacts with central GABAergic and sedative pathways. Review withdrawal risk (CIWA-Ar) or explore 24/7 state addiction access lines.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenHelp}
            className="h-8 gap-1.5 text-xs font-medium text-accent hover:bg-surface whitespace-nowrap"
          >
            Local Addiction Support
            <ExternalLink className="size-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

