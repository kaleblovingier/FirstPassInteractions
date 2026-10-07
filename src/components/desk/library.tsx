import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  GitFork,
  Layers,
  Lock,
  Pill,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { ReceptorProfiler } from "./receptor-profiler";
import { MechanismPathways } from "./mechanism-pathways";
import { MechanismIntersect } from "./mechanism-intersect";
import { PkTdmMechanisms } from "./pk-tdm-mechanisms";
import { hasClinic } from "@/lib/drugs/clinic";
import { DRUGS, FAMILIES, familyOf, type FamilyId } from "@/lib/drugs/catalog";
import { ITEM_KIND_LABEL } from "@/lib/drugs/types";
import { hasCite } from "@/lib/drugs/pubmed";
import { hasPgx } from "@/lib/drugs/pgx";
import { hasStahl } from "@/lib/drugs/stahl";
import { plateForDrug } from "@/lib/drugs/visuals";
import { useDesk, usePlan } from "@/lib/drugs/store";
import { maxDrugs } from "@/lib/billing/plans";
import {
  foundingGateCopy as baseFoundingGateCopy,
  type FoundingGateKind,
} from "@/lib/billing/founding-gate";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plate } from "./plate";
import {
  CONTRAINDICATED_CONDITIONS,
  CONDITION_CATEGORIES,
  NON_PRESCRIPTIVE_CDS_POSTURE,
  filterContraindicatedConditions,
  type ConditionCategoryFilter,
  type ContraindicatedCondition,
  type ContraindicatedPair,
} from "@/lib/drugs/contraindicated-conditions";

/** Suggested family chips when a filter returns nothing (UI-only; catalog labels unchanged). */
const EMPTY_FAMILY_HINTS: FamilyId[] = ["psych", "opioid", "cardio", "food"];

/** Local gate copy adapter that adds support for the contraindications surface */
function foundingGateCopy(kind: "contraindications" | FoundingGateKind) {
  if (kind === "contraindications") {
    return {
      title: "Contraindicated Disease Conditions Matrix",
      blurb:
        "Contraindicated Disease Conditions Matrix is a Founding / Pro feature ($79 once).",
      reason:
        "Contraindicated Disease Conditions Matrix is a Founding / Pro feature ($79 once).",
    };
  }
  return baseFoundingGateCopy(kind);
}

export function Formulary() {
  const [viewTab, setViewTab] = useState<
    "compounds" | "contraindications" | "receptors" | "pathways" | "intersect" | "pk"
  >("compounds");

  return (
    <div className="space-y-6">
      {/* Top View Toggle */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl bg-bg-sunken p-1.5"
        role="tablist"
        aria-label="Library view mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewTab === "compounds"}
          onClick={() => setViewTab("compounds")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
            viewTab === "compounds"
              ? "bg-surface text-fg shadow-[var(--shadow-border)]"
              : "text-muted hover:bg-surface/50 hover:text-fg",
          )}
        >
          <Pill className="size-4 shrink-0 text-accent" />
          <span>Compounds Shelf</span>
          <span className="rounded-full bg-bg-sunken px-2 py-0.5 font-mono text-[11px] text-muted">
            {DRUGS.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={viewTab === "contraindications"}
          onClick={() => setViewTab("contraindications")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
            viewTab === "contraindications"
              ? "bg-surface text-fg shadow-[var(--shadow-border)]"
              : "text-muted hover:bg-surface/50 hover:text-fg",
          )}
        >
          <ShieldAlert className="size-4 shrink-0 text-danger" />
          <span>Contraindicated Conditions Matrix</span>
          <span className="rounded-full bg-danger-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-danger">
            {CONTRAINDICATED_CONDITIONS.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={viewTab === "receptors"}
          onClick={() => setViewTab("receptors")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
            viewTab === "receptors"
              ? "bg-surface text-fg shadow-[var(--shadow-border)]"
              : "text-muted hover:bg-surface/50 hover:text-fg",
          )}
        >
          <Activity className="size-4 shrink-0 text-amber-500" />
          <span>Receptor Profiler</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={viewTab === "pathways"}
          onClick={() => setViewTab("pathways")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
            viewTab === "pathways"
              ? "bg-surface text-fg shadow-[var(--shadow-border)]"
              : "text-muted hover:bg-surface/50 hover:text-fg",
          )}
        >
          <GitFork className="size-4 shrink-0 text-teal-500" />
          <span>Mechanism Pathways</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={viewTab === "intersect"}
          onClick={() => setViewTab("intersect")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
            viewTab === "intersect"
              ? "bg-surface text-fg shadow-[var(--shadow-border)]"
              : "text-muted hover:bg-surface/50 hover:text-fg",
          )}
        >
          <Layers className="size-4 shrink-0 text-indigo-500" />
          <span>Mechanism Intersect Engine</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={viewTab === "pk"}
          onClick={() => setViewTab("pk")}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold sm:flex-initial sm:text-sm transition-all",
            viewTab === "pk"
              ? "bg-surface text-fg shadow-[var(--shadow-border)]"
              : "text-muted hover:bg-surface/50 hover:text-fg",
          )}
        >
          <TrendingUp className="size-4 shrink-0 text-purple-500" />
          <span>PK &amp; Nonlinear Kinetics</span>
        </button>
      </div>

      {viewTab === "compounds" ? (
        <CompoundsShelf />
      ) : viewTab === "contraindications" ? (
        <ContraindicatedConditionsView />
      ) : viewTab === "receptors" ? (
        <ReceptorProfiler />
      ) : viewTab === "pathways" ? (
        <MechanismPathways />
      ) : viewTab === "intersect" ? (
        <MechanismIntersect />
      ) : (
        <PkTdmMechanisms />
      )}
    </div>
  );
}

/**
 * Standard Compounds Formulary Shelf
 */
function CompoundsShelf() {
  const add = useDesk((s) => s.add);
  const selected = useDesk((s) => s.selected);
  const setView = useDesk((s) => s.setView);
  const plan = usePlan();
  const cap = maxDrugs(plan);
  const [family, setFamily] = useState<FamilyId>("all");
  const [shelf, setShelf] = useState("");
  const [q, setQ] = useState("");

  const inFamily = useMemo(
    () => DRUGS.filter((d) => family === "all" || familyOf(d) === family),
    [family],
  );

  const shelves = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of inFamily) {
      if (!d.cls) continue;
      map.set(d.cls, (map.get(d.cls) ?? 0) + 1);
    }
    return [...map.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 14)
      .map(([cls, n]) => ({ cls, n }));
  }, [inFamily]);

  const shelfLine = useMemo(() => {
    if (!shelf) return "";
    const members = inFamily.filter((d) => d.cls === shelf);
    const tally = new Map<string, number>();
    for (const d of members) {
      for (const e of d.enzymes) {
        const key =
          e.kind === "substrate" ? `${e.enzyme} substrate` : `${e.strength} ${e.enzyme} ${e.kind}`;
        tally.set(key, (tally.get(key) ?? 0) + 1);
      }
    }
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (!top || top[1] < 2)
      return `${members.length} on the ${shelf} shelf. No shared enzyme role on this map. Not a collision.`;
    return `${top[1]} of ${members.length} on the ${shelf} shelf carry ${top[0]}. Not a collision.`;
  }, [inFamily, shelf]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inFamily
      .filter((d) => {
        if (shelf && d.cls !== shelf) return false;
        if (!needle) return true;
        return (
          d.name.toLowerCase().includes(needle) ||
          d.cls.toLowerCase().includes(needle) ||
          d.brands.some((b) => b.toLowerCase().includes(needle)) ||
          d.aliases.some((a) => a.toLowerCase().includes(needle)) ||
          d.enzymes.some((e) => e.enzyme.toLowerCase().includes(needle.replace(/\s+/g, "")))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [inFamily, shelf, q]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: DRUGS.length };
    for (const d of DRUGS) {
      const f = familyOf(d);
      map[f] = (map[f] ?? 0) + 1;
    }
    return map;
  }, []);

  const hasFilter = family !== "all" || shelf.length > 0 || q.trim().length > 0;
  const freeCapNote =
    plan === "free"
      ? `Up to ${cap} stay free on the desk.`
      : `Your plan holds up to ${cap} on the desk.`;

  function clearFilter() {
    setQ("");
    setShelf("");
    setFamily("all");
  }

  function browseAll() {
    setQ("");
    setShelf("");
    setFamily("all");
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
          <Plate src="/plates/heme.jpg" alt="" className="h-36 w-full min-h-36 sm:h-full" />
          <div className="px-5 py-5 sm:px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              Browse the shelf
            </p>
            <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg">
              {DRUGS.length} compounds on the shelf
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Pick a family or search, then tap a row to add it to the desk. {freeCapNote} Host
              factors and the liver enzyme map come with founding ($79 once).
            </p>
          </div>
        </div>
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name, brand, alias, or enzyme (CYP)…"
          aria-label="Filter the shelf"
          className="min-h-[44px] h-12 w-full rounded-lg bg-surface-2 pl-10 pr-4 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FAMILIES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setShelf("");
              setFamily(f.id);
            }}
            className={cn(
              "min-h-[44px] rounded-full px-3 text-xs font-medium transition-colors",
              family === f.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            {f.label}
            <span className="ml-1.5 font-mono tabular-nums">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {shelves.length > 0 ? (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wide text-subtle">Class shelves</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setShelf("")}
              aria-pressed={shelf === ""}
              className={cn(
                "min-h-[44px] rounded-full px-3 text-xs font-medium transition-colors",
                shelf === "" ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              All classes
            </button>
            {shelves.map((row) => (
              <button
                key={row.cls}
                type="button"
                onClick={() => setShelf(row.cls)}
                aria-pressed={shelf === row.cls}
                className={cn(
                  "min-h-[44px] rounded-full px-3 text-xs font-medium transition-colors",
                  shelf === row.cls ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {row.cls}
                <span className="ml-1.5 font-mono tabular-nums">{row.n}</span>
              </button>
            ))}
          </div>
          {shelfLine ? <p className="text-xs leading-relaxed text-muted">{shelfLine}</p> : null}
        </div>
      ) : null}

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
            className="ml-auto min-h-[44px] rounded-full bg-ink px-4 text-[11px] font-medium text-bg sm:ml-0"
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
                className="min-h-[44px] rounded-full bg-ink px-4 text-xs font-medium text-bg"
              >
                Clear filter
              </button>
            ) : null}
            <button
              type="button"
              onClick={browseAll}
              className="min-h-[44px] rounded-full bg-bg-sunken px-4 text-xs font-medium text-muted hover:text-fg"
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
                    setShelf("");
                    setFamily(id);
                  }}
                  className="min-h-[44px] rounded-full bg-bg-sunken px-4 text-xs font-medium text-muted hover:text-fg"
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
                    "flex h-full min-h-[44px] w-full overflow-hidden rounded-lg bg-surface text-left shadow-[var(--shadow-border)] transition-transform duration-150",
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
                      {d.kind !== "drug" ? `${ITEM_KIND_LABEL[d.kind]} · ` : ""}
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

/**
 * Interactive Contraindicated Conditions Matrix Directory
 */
function ContraindicatedConditionsView() {
  const plan = usePlan();
  const lifetime = useDesk((s) => s.lifetime);
  const openCheckout = useDesk((s) => s.openCheckout);
  const selected = useDesk((s) => s.selected);
  const setView = useDesk((s) => s.setView);
  const add = useDesk((s) => s.add);
  const load = useDesk((s) => s.load);
  const cap = maxDrugs(plan);

  const [category, setCategory] = useState<ConditionCategoryFilter>("All");
  const [query, setQuery] = useState("");

  const isUnlocked = plan !== "free" || lifetime;

  const filteredConditions = useMemo(() => {
    return filterContraindicatedConditions({ query, category });
  }, [query, category]);

  /** Add or load a contraindicated pair onto the desk */
  const handleAddPair = (drug1Id: string, drug2Id: string, drug3Id?: string) => {
    const is1On = selected.includes(drug1Id);
    const is2On = selected.includes(drug2Id);
    const is3On = drug3Id ? selected.includes(drug3Id) : true;
    if (is1On && is2On && is3On) {
      setView("desk");
      return;
    }
    const needed = (is1On ? 0 : 1) + (is2On ? 0 : 1) + (drug3Id && !is3On ? 1 : 0);
    if (selected.length + needed <= cap) {
      if (!is1On) add(drug1Id);
      if (!is2On) add(drug2Id);
      if (drug3Id && !is3On) add(drug3Id);
      setView("desk");
    } else {
      load(drug3Id ? [drug1Id, drug2Id, drug3Id] : [drug1Id, drug2Id]);
    }
  };

  // —— FREE TIER PREVIEW WITH FOUNDING PAYWALL BANNER —————————————————
  if (!isUnlocked) {
    return (
      <div className="space-y-6">
        {/* Prominent, elegant Founding Paywall banner */}
        <section className="relative overflow-hidden rounded-2xl border border-accent/30 bg-surface p-6 shadow-lg sm:p-8">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 size-56 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Lock className="size-4" />
                </span>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
                  Founding Clinical Matrix
                </p>
                <Badge tone="accent">Pro Feature</Badge>
              </div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                Contraindicated Disease Conditions Matrix is a Founding / Pro feature ($79 once).
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                Explore verified clinical disease thresholds, organ impairment contraindications,
                and fatal drug-pair collisions (Severe Renal Impairment CrCl &lt; 30, Child-Pugh C
                Cirrhosis, Myasthenia Gravis, Pheochromocytoma, Active Peptic Ulcer &amp; GI Bleed,
                Teratogenicity, Prolonged QTc &gt; 500 ms, MAOI Washouts, HFrEF, G6PD Deficiency,
                and Parkinson’s). Educational clinical decision support under FD&amp;C Act
                520(o)(1)(E).
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2.5 sm:items-end">
              <Button
                size="lg"
                onClick={() =>
                  openCheckout("lab", foundingGateCopy("contraindications").reason, "life")
                }
                className="min-h-[44px] w-full px-6 text-sm font-semibold sm:w-auto shadow-md"
              >
                <Sparkles className="mr-2 size-4" />
                Unlock Founding ($79 once)
              </Button>
              <p className="text-xs text-muted">
                One-time purchase · Lifetime desk access · No subscriptions
              </p>
            </div>
          </div>
        </section>

        {/* 2 Sample Conditions Visible in Free Tier Preview */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle/20 pb-3">
            <div>
              <h3 className="font-serif text-xl font-semibold tracking-tight text-fg">
                Sample Conditions Preview
              </h3>
              <p className="text-xs text-muted">
                Showing 2 of {CONTRAINDICATED_CONDITIONS.length} conditions in educational preview
                mode.
              </p>
            </div>
            <Badge tone="accent">Free Preview · 2 Conditions Visible</Badge>
          </div>

          <div className="space-y-6">
            {CONTRAINDICATED_CONDITIONS.slice(0, 2).map((condition) => (
              <ConditionCard
                key={condition.id}
                condition={condition}
                selected={selected}
                onAddPair={handleAddPair}
              />
            ))}
          </div>

          {/* Locked Conditions Teaser Callout */}
          <div className="relative overflow-hidden rounded-xl border border-dashed border-subtle/40 bg-surface/60 p-6 text-center sm:p-8">
            <ShieldAlert className="mx-auto size-10 text-muted" />
            <h4 className="mt-3 font-serif text-lg font-medium text-fg">
              + {CONTRAINDICATED_CONDITIONS.length - 2} More Clinical Disease Contraindications Locked
            </h4>
            <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-muted">
              Myasthenia Gravis, Pheochromocytoma, Active Peptic Ulcer &amp; GI Bleed, Pregnancy
              Teratogenicity (FDA Category X), Prolonged QTc / LQTS (&gt; 500 ms), Recent MAOI
              Exposure (&lt; 14 days), Heart Failure HFrEF, Narrow-Angle Glaucoma, G6PD Deficiency,
              and Parkinson’s / Lewy Body Dementia are reserved for Founding and Pro.
            </p>
            <div className="mt-5 flex justify-center">
              <Button
                size="default"
                variant="default"
                onClick={() =>
                  openCheckout("lab", foundingGateCopy("contraindications").reason, "life")
                }
                className="min-h-[44px] px-6 font-semibold"
              >
                <Lock className="mr-2 size-4" />
                Unlock Founding ($79 once)
              </Button>
            </div>
          </div>
        </div>

        {/* Non-prescriptive Posture Footer */}
        <p className="text-center font-mono text-[11px] leading-relaxed text-subtle">
          {NON_PRESCRIPTIVE_CDS_POSTURE}
        </p>
      </div>
    );
  }

  // —— PRO / FOUNDING / PREVIEW ACTIVE: FULL INTERACTIVE DIRECTORY ———
  return (
    <div className="space-y-6">
      {/* Directory Header Banner */}
      <section className="overflow-hidden rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">Founding Matrix Active</Badge>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                Clinical Pathology & Organ Impairment
              </p>
            </div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Contraindicated Conditions Directory
            </h2>
            <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-muted">
              {CONTRAINDICATED_CONDITIONS.length} major clinical conditions with verified organ
              impairment thresholds, pathophysiology mechanisms, and high-risk drug pairs. Load any
              pair directly onto the desk to analyze collision vectors.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-xl bg-bg-sunken px-3.5 py-2 text-center">
              <span className="block font-serif text-2xl font-bold text-fg">
                {CONTRAINDICATED_CONDITIONS.length}
              </span>
              <span className="font-mono text-[10px] uppercase text-muted">Conditions</span>
            </span>
          </div>
        </div>
      </section>

      {/* Search Input Filter */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by condition, drug name, or clinical hazard (e.g. renal, metformin, QTc, MAOI)…"
          aria-label="Filter contraindicated conditions"
          className="min-h-[44px] h-12 w-full rounded-lg bg-surface-2 pl-10 pr-4 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </div>

      {/* Category Filter Pills (Wrapping & Responsive, min-h-[44px]) */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-wide text-subtle">
          Filter by clinical category
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category filters">
          {CONDITION_CATEGORIES.map((cat) => {
            const count =
              cat === "All"
                ? CONTRAINDICATED_CONDITIONS.length
                : CONTRAINDICATED_CONDITIONS.filter((c) => c.category === cat).length;
            const isSelected = category === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-[44px] items-center rounded-full px-3.5 text-xs font-medium transition-colors",
                  isSelected
                    ? "bg-ink text-bg shadow-sm"
                    : "bg-bg-sunken text-muted hover:bg-surface hover:text-fg",
                )}
              >
                <span>{cat}</span>
                <span className="ml-1.5 font-mono tabular-nums opacity-80">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Results Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle/20 pb-2">
        <p className="text-xs text-muted">
          <span className="font-mono font-semibold tabular-nums text-fg">
            {filteredConditions.length}
          </span>{" "}
          of {CONTRAINDICATED_CONDITIONS.length} conditions displayed
          {category !== "All" ? ` · Category: ${category}` : ""}
          {query.trim() ? ` · Search: "${query.trim()}"` : ""}
        </p>
        {(category !== "All" || query.trim()) && (
          <button
            type="button"
            onClick={() => {
              setCategory("All");
              setQuery("");
            }}
            className="min-h-[44px] text-xs font-medium text-accent hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Conditions Cards Grid */}
      {filteredConditions.length === 0 ? (
        <div className="rounded-xl bg-surface px-6 py-12 text-center shadow-[var(--shadow-border)]">
          <AlertTriangle className="mx-auto size-8 text-warn" />
          <p className="mt-3 text-sm font-semibold text-fg">No matching conditions found</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
            No disease conditions or high-risk pairs matched your search criteria. Try a different
            keyword or reset category filters.
          </p>
          <div className="mt-4 flex justify-center">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setCategory("All");
                setQuery("");
              }}
              className="min-h-[44px] px-4"
            >
              Reset all filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredConditions.map((condition) => (
            <ConditionCard
              key={condition.id}
              condition={condition}
              selected={selected}
              onAddPair={handleAddPair}
            />
          ))}
        </div>
      )}

      {/* Non-prescriptive Posture Regulatory Note */}
      <footer className="rounded-xl bg-surface-2 p-4 text-center">
        <p className="font-mono text-[11px] leading-relaxed text-subtle">
          {NON_PRESCRIPTIVE_CDS_POSTURE}
        </p>
      </footer>
    </div>
  );
}

/**
 * Individual Condition Card displaying threshold, pathophysiology, individual drugs & high-risk pairs
 */
function ConditionCard({
  condition,
  selected,
  onAddPair,
}: {
  condition: ContraindicatedCondition;
  selected: string[];
  onAddPair: (drug1Id: string, drug2Id: string, drug3Id?: string) => void;
}) {
  const categoryTone = useMemo(() => {
    switch (condition.category) {
      case "Cardiac":
        return "danger";
      case "Organ Impairment":
        return "warn";
      case "Pregnancy":
        return "accent";
      case "Neuro & Psych":
        return "info";
      case "Metabolic":
        return "ok";
      default:
        return "default";
    }
  }, [condition.category]);

  return (
    <article className="rounded-xl border border-subtle/20 bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6 transition-all hover:border-subtle/40">
      {/* Header with Title and Badges */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={categoryTone}>{condition.category}</Badge>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {condition.organSystem}
            </span>
          </div>
          <h3 className="font-serif text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {condition.name}
          </h3>
        </div>
        <Badge tone="default" className="self-start sm:self-auto shrink-0 font-mono text-[11px]">
          {condition.contraindicatedPairs.length} high-risk pair
          {condition.contraindicatedPairs.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {/* Clinical Threshold Box */}
      <div className="mt-4 rounded-lg border-l-4 border-danger bg-bg-sunken px-4 py-3">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-danger">
          Clinical Contraindication Threshold
        </p>
        <p className="mt-1 font-mono text-xs font-medium text-fg sm:text-sm">
          {condition.clinicalThreshold}
        </p>
      </div>

      {/* Pathophysiology Explanation */}
      <div className="mt-4 space-y-1.5">
        <h4 className="font-mono text-[10px] uppercase tracking-wider text-subtle">
          Pathophysiology &amp; Organ Vulnerability
        </h4>
        <p className="text-xs sm:text-sm leading-relaxed text-muted">
          {condition.pathophysiology}
        </p>
      </div>

      {/* Single Contraindicated Agents (Wrapping badges and descriptions) */}
      {condition.contraindicatedDrugs.length > 0 && (
        <div className="mt-5 space-y-2">
          <h4 className="font-mono text-[10px] uppercase tracking-wider text-subtle">
            Single High-Risk Contraindicated Agents ({condition.contraindicatedDrugs.length})
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {condition.contraindicatedDrugs.map((drug) => {
              const onDesk = selected.includes(drug.drugId);

              return (
                <div
                  key={drug.drugId}
                  className="flex flex-col justify-between rounded-lg bg-surface-2 p-3 text-left border border-subtle/15"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-serif text-sm font-semibold text-fg">
                        {drug.drugName}
                      </span>
                      {drug.fdaBoxedWarning && (
                        <Badge tone="danger" className="text-[10px]">
                          Boxed Warning
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-danger">{drug.hazard}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted line-clamp-3">
                      {drug.mechanism}
                    </p>
                  </div>
                  {onDesk && (
                    <div className="mt-2 flex items-center gap-1 font-mono text-[10px] text-accent">
                      <Check className="size-3" />
                      <span>On Desk</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* High-Risk Drug Pairs with "Add pair to desk" button */}
      {condition.contraindicatedPairs.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="font-mono text-[10px] uppercase tracking-wider text-subtle">
            Verified High-Risk Drug Pairs ({condition.contraindicatedPairs.length})
          </h4>
          <div className="space-y-3">
            {condition.contraindicatedPairs.map((pair) => (
              <PairCard
                key={`${pair.drug1Id}-${pair.drug2Id}${pair.drug3Id ? `-${pair.drug3Id}` : ""}`}
                pair={pair}
                selected={selected}
                onAddPair={onAddPair}
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

/**
 * Individual Pair Card with "Add pair to desk" button
 */
function PairCard({
  pair,
  selected,
  onAddPair,
}: {
  pair: ContraindicatedPair;
  selected: string[];
  onAddPair: (drug1Id: string, drug2Id: string, drug3Id?: string) => void;
}) {
  const isAllOnDesk =
    selected.includes(pair.drug1Id) &&
    selected.includes(pair.drug2Id) &&
    (pair.drug3Id ? selected.includes(pair.drug3Id) : true);

  const displayNames = pair.drug3Name
    ? `${pair.drug1Name} + ${pair.drug2Name} + ${pair.drug3Name}`
    : `${pair.drug1Name} + ${pair.drug2Name}`;

  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border border-subtle/20 bg-bg-sunken p-4 sm:flex-row sm:items-center">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-serif text-sm font-bold text-fg sm:text-base">
            {displayNames}
          </span>
          <Badge tone={pair.severity === "contraindicated" ? "danger" : "warn"}>
            {pair.severity === "contraindicated" ? "Contraindicated" : "High Risk"}
          </Badge>
        </div>
        <p className="text-xs font-semibold text-danger">{pair.hazard}</p>
        <p className="text-xs leading-relaxed text-muted">{pair.mechanism}</p>
        <p className="text-[11px] leading-relaxed text-subtle">
          <span className="font-semibold text-muted">Management: </span>
          {pair.clinicalManagement}
        </p>
      </div>

      <div className="shrink-0 pt-2 sm:pt-0">
        <Button
          type="button"
          size="sm"
          variant={isAllOnDesk ? "secondary" : "default"}
          onClick={() => onAddPair(pair.drug1Id, pair.drug2Id, pair.drug3Id)}
          className="min-h-[44px] w-full px-4 text-xs font-semibold sm:w-auto"
          aria-label={
            isAllOnDesk
              ? `${displayNames} already on desk — view desk`
              : `Add ${displayNames} pair to desk`
          }
        >
          {isAllOnDesk ? (
            <>
              <Check className="mr-1.5 size-4 text-accent" />
              Pair on desk
            </>
          ) : (
            <>
              <ArrowRight className="mr-1.5 size-4" />
              Add pair to desk
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
