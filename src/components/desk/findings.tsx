import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Search, X } from "lucide-react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { reviewBases } from "@/lib/drugs/basis-review";
import { sourceLinkText } from "@/lib/drugs/grade-provenance";
import { findingsOnTray, partitionFindings } from "@/lib/drugs/brief";
import { isVirtual } from "@/lib/drugs/host";
import { clinicianScan, plainLanguageSummary } from "@/lib/drugs/interaction-summary";
import type { Finding, Severity } from "@/lib/drugs/types";
import { SEVERITY_HINT, SEVERITY_PLAIN } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { severitySurface, severityTone } from "./severity";
import { DeskOnlyNotice, GradePath, SourceReviewNote } from "./basis-review";

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

type BulkToggle = { open: boolean; seq: number } | null;

function matchesKind(f: Finding, kind: KindFilter) {
  if (kind === "all") return true;
  if (kind === "food") return f.tags.includes("food");
  return f.kind === kind;
}

function matchesQuery(f: Finding, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const fields = [
    f.headline,
    plainLanguageSummary(f),
    f.effect,
    f.clinical,
    f.mechanism,
    ...f.enzymes,
    ...f.tags,
    ...f.drugIds.map((id) => DRUG_BY_ID[id]?.name ?? ""),
  ];
  return fields.some((part) => part.toLowerCase().includes(normalizedQuery));
}

function startsOpen(f: Finding): boolean {
  return f.severity === "contraindicated" || f.severity === "major";
}

function filterPillClass(active: boolean, activeClass: string, dimmed = false): string {
  return cn(
    "inline-flex min-h-9 items-center rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 pointer-coarse:min-h-11",
    active ? activeClass : "bg-bg-sunken text-muted hover:text-fg",
    !active && dimmed && "opacity-60",
  );
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
  const [drugFocus, setDrugFocus] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [bulkToggle, setBulkToggle] = useState<BulkToggle>(null);

  const scoped = useMemo(
    () => (trayIds ? findingsOnTray(findings, trayIds) : findings),
    [findings, trayIds],
  );

  const severityCounts = useMemo(() => {
    const counts: Record<Severity | "all", number> = {
      all: scoped.length,
      contraindicated: 0,
      major: 0,
      moderate: 0,
      minor: 0,
    };
    for (const f of scoped) {
      counts[f.severity] += 1;
    }
    return counts;
  }, [scoped]);

  const kindCounts = useMemo(() => {
    const counts: Record<KindFilter, number> = {
      all: scoped.length,
      pk: 0,
      pd: 0,
      geno: 0,
      clinic: 0,
      food: 0,
    };
    for (const f of scoped) {
      if (matchesKind(f, "pk")) counts.pk += 1;
      if (matchesKind(f, "pd")) counts.pd += 1;
      if (matchesKind(f, "geno")) counts.geno += 1;
      if (matchesKind(f, "clinic")) counts.clinic += 1;
      if (matchesKind(f, "food")) counts.food += 1;
    }
    return counts;
  }, [scoped]);

  const involvedDrugs = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    for (const f of scoped) {
      for (const id of new Set(f.drugIds)) {
        if (!id || isVirtual(id)) continue;
        const drug = DRUG_BY_ID[id];
        if (!drug) continue;
        const existing = counts.get(id);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(id, { id, name: drug.name, count: 1 });
        }
      }
    }
    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }, [scoped]);

  const activeDrugFocus =
    drugFocus !== "all" && involvedDrugs.some((d) => d.id === drugFocus) ? drugFocus : "all";
  const showSearch = scoped.length >= 4;
  const activeQuery = showSearch ? query.trim().toLowerCase() : "";

  const { pairs, deskNotes } = useMemo(() => {
    const filtered = scoped.filter(
      (f) =>
        (filter === "all" || f.severity === filter) &&
        matchesKind(f, kind) &&
        (activeDrugFocus === "all" || f.drugIds.includes(activeDrugFocus)) &&
        matchesQuery(f, activeQuery),
    );
    return partitionFindings(filtered);
  }, [scoped, filter, kind, activeDrugFocus, activeQuery]);

  const visibleCount = pairs.length + deskNotes.length;

  if (findings.length === 0) return null;

  const filteredOut = findings.length > 0 && visibleCount === 0;
  const hasActiveFilter =
    filter !== "all" || kind !== "all" || activeDrugFocus !== "all" || activeQuery !== "";
  const allStartOpen =
    visibleCount > 0 && pairs.every(startsOpen) && deskNotes.every(startsOpen);
  const allExpanded = bulkToggle ? bulkToggle.open : allStartOpen;

  function resetFilters() {
    setFilter("all");
    setKind("all");
    setDrugFocus("all");
    setQuery("");
  }

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
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-serif text-lg tracking-tight text-fg">Collisions</h2>
          {visibleCount > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full text-xs"
              onClick={() =>
                setBulkToggle((prev) => ({
                  open: !allExpanded,
                  seq: (prev?.seq ?? 0) + 1,
                }))
              }
            >
              {allExpanded ? "Collapse all" : "Expand all"}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter collisions by severity">
          {SEVERITY_FILTERS.map((f) => {
            const count = severityCounts[f];
            const active = filter === f;
            const label = f === "all" ? "All" : SEVERITY_PLAIN[f];
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                title={f === "all" ? "Show every severity" : SEVERITY_HINT[f]}
                onClick={() => setFilter(f)}
                className={filterPillClass(active, "bg-ink text-bg", count === 0)}
              >
                {label}{" "}
                <span className={cn("ml-1 tabular-nums", active ? "text-bg" : "text-subtle")}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Possible concerns in the selected items. Plain chips (Avoid together / Serious concern / Use care / Mild note) are this
        checker’s categories — not a personal prediction of harm. Hover a chip for the longer hint; formal labels still appear on each card.
      </p>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter collisions by kind">
        {KIND_FILTERS.map((k) => {
          const count = kindCounts[k.id];
          const active = kind === k.id;
          return (
            <button
              key={k.id}
              type="button"
              aria-pressed={active}
              onClick={() => setKind(k.id)}
              className={filterPillClass(
                active,
                "bg-surface-2 text-fg shadow-[var(--shadow-border)]",
                count === 0,
              )}
            >
              {k.label}{" "}
              <span className={cn("ml-1 tabular-nums", active ? "text-muted" : "text-subtle")}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>
      {involvedDrugs.length >= 2 ? (
        <div
          role="group"
          aria-label="Filter collisions by medicine"
          className="flex flex-wrap items-center gap-1.5 rounded-lg bg-surface p-2 shadow-[var(--shadow-border)]"
        >
          <span className="px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Medicine
          </span>
          <button
            type="button"
            aria-pressed={activeDrugFocus === "all"}
            onClick={() => setDrugFocus("all")}
            className={filterPillClass(activeDrugFocus === "all", "bg-accent text-accent-fg")}
          >
            All medicines
          </button>
          {involvedDrugs.map((d) => {
            const active = activeDrugFocus === d.id;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={active}
                onClick={() => setDrugFocus((cur) => (cur === d.id ? "all" : d.id))}
                className={filterPillClass(active, "bg-accent text-accent-fg")}
              >
                {d.name}{" "}
                <span className={cn("ml-1 tabular-nums", active ? "text-accent-fg" : "text-subtle")}>
                  ({d.count})
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      {showSearch ? (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter collisions by keyword"
            placeholder="Filter by drug, enzyme, or effect"
            className="h-10 bg-surface-2 pl-9 pr-10 text-sm shadow-[var(--shadow-border)] placeholder:text-subtle [&::-webkit-search-cancel-button]:appearance-none pointer-coarse:h-11"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear keyword filter"
              className="absolute right-0.5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-sm text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 pointer-coarse:size-10"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 text-xs text-muted",
          !hasActiveFilter && "sr-only",
        )}
      >
        <span className="tabular-nums">
          {hasActiveFilter
            ? `Showing ${visibleCount} of ${scoped.length} collisions`
            : `Showing all ${scoped.length} collisions`}
        </span>
        {hasActiveFilter ? (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex min-h-9 items-center rounded-sm px-2 text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 pointer-coarse:min-h-11"
          >
            Reset filters
          </button>
        ) : null}
      </div>
      {filteredOut ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-5 shadow-[var(--shadow-border)]">
          <p className="text-sm font-medium text-fg">Nothing in this filter</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Try All, or clear your medicine, kind, or keyword filters. Empty here is not a green light — only this slice is hidden.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3 rounded-full bg-ink text-xs text-bg hover:opacity-90"
            onClick={resetFilters}
          >
            Clear filters
          </Button>
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
                  <FindingCard key={f.id} finding={f} bulkToggle={bulkToggle} />
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
                  <FindingCard key={f.id} finding={f} bulkToggle={bulkToggle} />
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function FindingCard({
  finding,
  bulkToggle,
}: {
  finding: Finding;
  bulkToggle: BulkToggle;
}) {
  const [open, setOpen] = useState(() =>
    bulkToggle ? bulkToggle.open : startsOpen(finding),
  );
  useEffect(() => {
    if (bulkToggle) setOpen(bulkToggle.open);
  }, [bulkToggle]);

  const drugs = [...new Set(finding.drugIds)].map((id) => DRUG_BY_ID[id]).filter(Boolean);
  const plainSummary = plainLanguageSummary(finding);
  const scan = clinicianScan(finding);

  return (
    <li className="rounded-lg bg-surface shadow-[var(--shadow-border)]">
      <button
        type="button"
        className="flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
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
          aria-hidden="true"
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
          <GradePath finding={finding} />
          <div className="space-y-2 rounded-md bg-bg-sunken px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Sources to check</p>
            <DeskOnlyNotice finding={finding} />
            {reviewBases(finding).map(({ basis: b, note, provenance }) => (
              <div key={`${b.kind}-${b.label}`}>
                <p className="text-xs font-medium text-fg">{b.label}</p>
                <SourceReviewNote note={note} provenance={provenance} />
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{b.detail}</p>
                {b.href ? (
                  <a
                    href={b.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex h-10 items-center gap-1 rounded-sm font-mono text-[11px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    {sourceLinkText(b.label, b.href)} <ExternalLink className="size-3" aria-hidden="true" />
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

// eslint-disable-next-line react-refresh/only-export-components
export { severityTone };
