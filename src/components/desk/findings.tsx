import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { basisFor } from "@/lib/drugs/basis";
import { findingsOnTray, partitionFindings } from "@/lib/drugs/brief";
import { clinicianScan, plainLanguageSummary } from "@/lib/drugs/interaction-summary";
import type { Finding, Severity } from "@/lib/drugs/types";
import { SEVERITY_HINT, SEVERITY_PLAIN } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { severitySurface, severityTone } from "./severity";

const SEVERITY_FILTERS: Array<Severity | "all"> = ["all", "contraindicated", "major", "moderate", "minor"];
type KindFilter = "all" | "pk" | "pd" | "geno" | "clinic" | "food";
const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All kinds" },
  { id: "pk", label: "Levels / timing" },
  { id: "pd", label: "Same-system effects" },
  { id: "geno", label: "Metabolizer" },
  { id: "clinic", label: "Clinic" },
  { id: "food", label: "Food" },
];

function matchesKind(f: Finding, kind: KindFilter) {
  if (kind === "all") return true;
  if (kind === "food") return f.tags.includes("food");
  return f.kind === kind;
}

export function FindingList({
  findings,
  trayIds,
}: {
  findings: Finding[];
  /** When set, only show findings whose real drugs are all on the tray. */
  trayIds?: string[];
}) {
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const { pairs, deskNotes } = useMemo(() => {
    const scoped = trayIds ? findingsOnTray(findings, trayIds) : findings;
    const filtered = scoped.filter(
      (f) => (filter === "all" || f.severity === filter) && matchesKind(f, kind),
    );
    return partitionFindings(filtered);
  }, [findings, trayIds, filter, kind]);
  const visibleCount = pairs.length + deskNotes.length;

  if (findings.length === 0) return null;

  const filteredOut = findings.length > 0 && visibleCount === 0;

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-accent/15 bg-accent-soft/30 p-3 sm:p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">What this means</p>
        <p className="mt-1.5 text-sm leading-relaxed text-fg">
          Each card is a teaching collision on this tray — how levels might move, or how effects might stack.
          Labels like Serious concern are this checker’s bins, not a prediction of harm for one person.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          An empty list after filters is not the same as safe. Clear filters or add another medicine if you expected a hit.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-lg tracking-tight text-fg">Collisions</h2>
        <div className="flex flex-wrap gap-1">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              title={f === "all" ? "Show every severity" : SEVERITY_HINT[f]}
              onClick={() => setFilter(f)}
              className={cn(
                "h-9 rounded-full px-3 text-xs font-medium",
                filter === f ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {f === "all" ? "All" : SEVERITY_PLAIN[f]}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Possible concerns in the selected items. Plain chips (Avoid together / Serious concern / Use care / Mild note) are this
        checker’s categories — not a personal prediction of harm. Hover a chip for the longer hint; formal labels still appear on each card.
      </p>
      <div className="flex flex-wrap gap-1">
        {KIND_FILTERS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={cn(
              "h-9 rounded-full px-3 text-xs font-medium",
              kind === k.id ? "bg-surface-2 text-fg shadow-[var(--shadow-border)]" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>
      {filteredOut ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-5 shadow-[var(--shadow-border)]">
          <p className="text-sm font-medium text-fg">Nothing in this filter</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Try All, or tap Levels / Effects / Genes. Empty here is not a green light — only this slice is hidden.
          </p>
          <button
            type="button"
            className="mt-3 h-9 rounded-full bg-ink px-3 text-xs font-medium text-bg"
            onClick={() => {
              setFilter("all");
              setKind("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pairs.length > 0 ? (
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Pairs, worst first
              </p>
              <ol className="space-y-2">
                {pairs.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </ol>
            </div>
          ) : null}
          {deskNotes.length > 0 ? (
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Whole-desk notes
              </p>
              <ol className="space-y-2">
                {deskNotes.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(
    finding.severity === "contraindicated" || finding.severity === "major",
  );
  const drugs = [...new Set(finding.drugIds)].map((id) => DRUG_BY_ID[id]).filter(Boolean);
  const plainSummary = plainLanguageSummary(finding);
  const scan = clinicianScan(finding);

  return (
    <li className="rounded-lg bg-surface shadow-[var(--shadow-border)]">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span
          title={SEVERITY_HINT[finding.severity]}
          className={cn(
            "mt-0.5 inline-flex min-w-28 shrink-0 items-center justify-center rounded-sm px-2 py-1 text-[10px] font-medium tracking-wide",
            severitySurface(finding.severity),
          )}
        >
          {SEVERITY_PLAIN[finding.severity]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-fg">{finding.headline}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{plainSummary}</span>
          {scan ? (
            <span className="mt-1 block font-mono text-[11px] leading-relaxed text-fg">{scan}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-subtle transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <div className="rounded-md bg-bg-sunken px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Clinical detail</p>
            {scan ? <p className="mt-2 font-mono text-xs text-fg">{scan}</p> : null}
            <p className="mt-2 text-sm leading-relaxed text-fg">{finding.clinical}</p>
            {finding.mechanism ? (
              <p className="mt-2 text-xs leading-relaxed text-muted">{finding.mechanism}</p>
            ) : null}
          </div>
          <div className="space-y-2 rounded-md bg-bg-sunken px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Sources to check</p>
            {basisFor(finding).map((b) => (
              <div key={`${b.kind}-${b.label}`}>
                <p className="text-xs font-medium text-fg">{b.label}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{b.detail}</p>
                {b.href ? (
                  <a
                    href={b.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex h-10 items-center gap-1 font-mono text-[11px] text-accent hover:underline"
                  >
                    Open source <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              tone={
                finding.tags.includes("food")
                  ? "warn"
                  : finding.kind === "pk"
                    ? "accent"
                    : finding.kind === "geno"
                      ? "warn"
                      : finding.kind === "clinic"
                        ? "danger"
                        : "info"
              }
            >
              {finding.tags.includes("food")
                ? "Food"
                : finding.kind === "pk"
                  ? "Levels"
                  : finding.kind === "geno"
                    ? "Genes"
                    : finding.kind === "clinic"
                      ? "Clinic"
                      : "Effects"}
            </Badge>
            {finding.enzymes.map((e) => (
              <Badge key={e} tone="default">
                {e}
              </Badge>
            ))}
            {finding.tags
              .filter((t) => !finding.enzymes.includes(t as never))
              .slice(0, 4)
              .map((t) => (
                <Badge key={t} tone="default">
                  {t}
                </Badge>
              ))}
          </div>
          <ul className="space-y-1">
            {drugs.map((d) => (
              <li key={d.id} className="text-xs text-muted">
                <span className="font-medium text-fg">{d.name}</span>
                {d.brands.length ? ` (${d.brands[0]})` : ""} · {d.cls}
                {d.note ? ` — ${d.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

export { severityTone };
