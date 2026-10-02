import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { hasClinic } from "@/lib/drugs/clinic";
import { DRUGS, FAMILIES, familyOf, type FamilyId } from "@/lib/drugs/catalog";
import { hasCite } from "@/lib/drugs/pubmed";
import { hasPgx } from "@/lib/drugs/pgx";
import { hasStahl } from "@/lib/drugs/stahl";
import { plateForDrug } from "@/lib/drugs/visuals";
import { useDesk, usePlan } from "@/lib/drugs/store";
import { maxDrugs } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { Plate } from "./plate";

/** Suggested family chips when a filter returns nothing (UI-only; catalog labels unchanged). */
const EMPTY_FAMILY_HINTS: FamilyId[] = ["psych", "opioid", "cardio", "food"];

export function Formulary() {
  const add = useDesk((s) => s.add);
  const selected = useDesk((s) => s.selected);
  const setView = useDesk((s) => s.setView);
  const plan = usePlan();
  const cap = maxDrugs(plan);
  const [family, setFamily] = useState<FamilyId>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return DRUGS.filter((d) => {
      if (family !== "all" && familyOf(d) !== family) return false;
      if (!needle) return true;
      return (
        d.name.toLowerCase().includes(needle) ||
        d.cls.toLowerCase().includes(needle) ||
        d.brands.some((b) => b.toLowerCase().includes(needle)) ||
        d.aliases.some((a) => a.toLowerCase().includes(needle)) ||
        d.enzymes.some((e) => e.enzyme.toLowerCase().includes(needle.replace(/\s+/g, "")))
      );
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [family, q]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: DRUGS.length };
    for (const d of DRUGS) {
      const f = familyOf(d);
      map[f] = (map[f] ?? 0) + 1;
    }
    return map;
  }, []);

  const hasFilter = family !== "all" || q.trim().length > 0;
  const freeCapNote =
    plan === "free"
      ? `Up to ${cap} stay free on the desk.`
      : `Your plan holds up to ${cap} on the desk.`;

  function clearFilter() {
    setQ("");
    setFamily("all");
  }

  function browseAll() {
    setQ("");
    setFamily("all");
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
          <Plate src="/plates/heme.jpg" alt="" className="h-36 w-full sm:h-full min-h-36" />
          <div className="px-5 py-5 sm:px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              Browse the shelf
            </p>
            <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg">
              {DRUGS.length} compounds on the shelf
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Pick a family or search, then tap a row to add it to the desk.{" "}
              {freeCapNote} Host factors and the atlas are Pro.
            </p>
          </div>
        </div>
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name, brand, alias, CYP…"
          aria-label="Filter the shelf"
          className="h-12 w-full rounded-lg bg-surface-2 pl-10 pr-4 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {FAMILIES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFamily(f.id)}
            className={cn(
              "h-10 rounded-full px-3 text-xs font-medium",
              family === f.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            {f.label}
            <span className="ml-1.5 font-mono tabular-nums opacity-70">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 bg-bg/95 px-1 py-2 backdrop-blur-sm">
        <p className="text-xs text-muted">
          <span className="font-mono tabular-nums">{rows.length}</span> shown
          {selected.length ? (
            <>
              {" "}
              · <span className="font-mono tabular-nums">{selected.length}/{cap}</span> on the desk
            </>
          ) : (
            ""
          )}
        </p>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => setView("desk")}
            className="ml-auto h-8 rounded-full bg-ink px-3 text-[11px] font-medium text-bg sm:ml-0"
          >
            Open desk
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div
          role="status"
          className="rounded-xl bg-surface px-5 py-8 shadow-[var(--shadow-border)]"
        >
          <p className="text-sm font-medium text-fg">Nothing matches this filter</p>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
            {hasFilter
              ? "Try clearing the search, switching family, or browsing the whole shelf again."
              : "The shelf looks empty — that shouldn’t happen. Browse all to reset."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {hasFilter ? (
              <button
                type="button"
                onClick={clearFilter}
                className="h-9 rounded-full bg-ink px-3 text-xs font-medium text-bg"
              >
                Clear filter
              </button>
            ) : null}
            <button
              type="button"
              onClick={browseAll}
              className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
            >
              Browse all
            </button>
            {EMPTY_FAMILY_HINTS.filter((id) => id !== family).map((id) => {
              const meta = FAMILIES.find((f) => f.id === id);
              if (!meta) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setQ("");
                    setFamily(id);
                  }}
                  className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
                >
                  Try {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => {
            const on = selected.includes(d.id);
            const enzymes = d.enzymes
              .filter((e) => e.kind !== "substrate")
              .slice(0, 2)
              .map((e) => `${e.enzyme.replace("CYP", "")} ${e.kind === "inhibitor" ? "inh" : "ind"}`);
            const sub = d.enzymes.find((e) => e.kind === "substrate");
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (on) return;
                    const ok = add(d.id);
                    if (ok) setView("desk");
                  }}
                  disabled={on}
                  aria-disabled={on}
                  aria-label={on ? `${d.name}, already on the desk` : `Add ${d.name} to the desk`}
                  className={cn(
                    "flex h-full min-h-20 w-full overflow-hidden rounded-lg bg-surface text-left shadow-[var(--shadow-border)] transition-transform duration-150",
                    on
                      ? "cursor-default ring-1 ring-accent/25 opacity-90"
                      : "hover:-translate-y-px hover:bg-surface-2",
                  )}
                >
                  <img
                    src={plateForDrug(d)}
                    alt=""
                    className="h-full w-16 shrink-0 object-cover sm:w-20"
                  />
                  <span className="flex min-w-0 flex-1 flex-col justify-center px-3 py-3">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-fg">{d.name}</span>
                      {on ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                          <Check className="size-3" aria-hidden />
                          On desk
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 truncate text-[11px] text-muted">
                      {d.kind !== "drug" ? `${d.kind} · ` : ""}
                      {d.cls}
                    </span>
                    <span className="mt-1 font-mono text-[10px] uppercase tracking-wide text-subtle">
                      {on
                        ? "Already on the desk — open desk to remove"
                        : enzymes.length
                          ? enzymes.join(" · ")
                          : sub
                            ? `${sub.enzyme.replace("CYP", "")} sub`
                            : "PD only"}
                      {!on && hasStahl(d.id) ? " · Stahl" : ""}
                      {!on && hasPgx(d.id) ? " · PGx" : ""}
                      {!on && hasCite(d.id) ? " · PMID" : ""}
                      {!on && hasClinic(d.id) ? " · Clinic" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
