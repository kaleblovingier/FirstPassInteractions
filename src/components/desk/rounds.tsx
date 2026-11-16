import { useMemo, useState } from "react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { ROUND_SETTINGS, ROUNDS, roundNeedsPro, type Round, type RoundSetting } from "@/lib/drugs/rounds";
import { ROUNDS_HOST_LINE } from "@/lib/drugs/host-plain";
import { LANE_PLATE, plateForSample } from "@/lib/drugs/visuals";
import { useDesk, usePlan } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plate } from "./plate";

/** Everyday setting labels — ids/order stay in ROUND_SETTINGS. */
const SETTING_PLAIN: Record<RoundSetting | "all", string> = {
  all: "All",
  clinic: "Ketamine clinic",
  ward: "Hospital ward",
  mat: "Addiction care",
  street: "Street / overdose",
  kitchen: "Food & drink",
};

export function RoundsPage() {
  const load = useDesk((s) => s.load);
  const setView = useDesk((s) => s.setView);
  const plan = usePlan();
  const [setting, setSetting] = useState<RoundSetting | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const normalized = query.trim().toLowerCase();
  const rows = useMemo(() => {
    return ROUNDS.filter((r) => {
      if (setting !== "all" && r.setting !== setting) return false;
      if (!normalized) return true;
      const hay = `${r.title} ${r.stem} ${r.ask} ${r.teach} ${r.blurb} ${r.setting}`.toLowerCase();
      return normalized.split(/\s+/).every((token) => hay.includes(token));
    });
  }, [setting, normalized]);

  function reveal(id: string) {
    setOpen((cur) => (cur === id ? null : id));
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
          <Plate src={LANE_PLATE.clinic} alt="" className="h-36 w-full min-h-36 sm:h-full" />
          <div className="px-5 py-5 sm:px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Rounds coach</p>
            <h1 className="mt-2 font-serif text-2xl tracking-tight text-fg">
              {ROUNDS.length} teaching cases — read the stem, then put it on the desk.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Short clinic stories for pharmacy and medical trainees: first-pass by mouth, when a gene pathway
              acts like a second drug, sedation naloxone will not reverse, food and herb traps, and addiction-care
              stacks. Up to five-drug cases and oral ketamine route stay free. {ROUNDS_HOST_LINE}
            </p>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-subtle">
              Educational only — not an exam key, not dosing advice, not a prescription. The Prescribing
              Information and your clinician still win.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {ROUND_SETTINGS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={setting === s.id}
              onClick={() => setSetting(s.id)}
              className={cn(
                "h-10 rounded-full px-3 text-xs font-medium",
                setting === s.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search teaching rounds</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stems — grapefruit, 2D6, xylazine…"
            className="h-10 w-full rounded-lg bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </label>
      </div>

      <p className="text-xs text-muted">
        Showing {rows.length} of {ROUNDS.length}
        {setting !== "all" ? ` · ${ROUND_SETTINGS.find((s) => s.id === setting)?.label ?? setting}` : ""}
        {normalized ? ` · “${query.trim()}”` : ""}
      </p>

      {rows.length === 0 ? (
        <div
          role="status"
          className="rounded-xl border border-accent/20 bg-accent-soft/40 px-5 py-6 shadow-[var(--shadow-border)]"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Rounds coach</p>
          <h3 className="mt-1 font-serif text-lg tracking-tight text-fg">No cases match this filter</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Try another setting, clear the search, or jump back to All. Empty here only means the filter is tight — the desk map is unchanged.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSetting("all");
                setQuery("");
              }}
            >
              Show all rounds
            </Button>
            {normalized ? (
              <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
                Clear search
              </Button>
            ) : null}
            {setting !== "all" ? (
              <Button variant="secondary" size="sm" onClick={() => setSetting("all")}>
                Clear setting
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.map((r) => (
            <RoundCard
              key={r.id}
              round={r}
              revealed={open === r.id}
              onReveal={() => reveal(r.id)}
              onLoad={() => {
                load(r.drugIds, extrasOf(r));
                setView("desk");
              }}
              onStudy={() => {
                load(r.drugIds, extrasOf(r));
                setView("study");
              }}
              gated={plan === "free" && roundNeedsPro(r)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function extrasOf(r: Round) {
  return {
    phenotypes: r.phenotypes,
    smoking: r.smoking,
    ketamineRoute: r.ketamineRoute,
    cannabisRoute: r.cannabisRoute,
    alcohol: r.alcohol,
    doses: r.doses,
  };
}

function RoundCard({
  round,
  revealed,
  onReveal,
  onLoad,
  onStudy,
  gated,
}: {
  round: Round;
  revealed: boolean;
  onReveal: () => void;
  onLoad: () => void;
  onStudy: () => void;
  gated: boolean;
}) {
  return (
    <li className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <div className="flex gap-0">
        <Plate src={plateForSample(round)} alt="" className="hidden min-h-full w-24 shrink-0 sm:block" />
        <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              {SETTING_PLAIN[round.setting]}
            </p>
            {round.blurb ? (
              <span className="font-mono text-[11px] text-muted">{round.blurb}</span>
            ) : null}
          </div>
          <h3 className="mt-1 font-serif text-xl tracking-tight text-fg">{round.title}</h3>
          {round.drugIds.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {round.drugIds.map((id) => {
                const drug = DRUG_BY_ID[id];
                return (
                  <span
                    key={id}
                    className="inline-flex flex-col items-start rounded-md bg-bg-sunken px-2 py-0.5 font-mono text-[11px] text-muted"
                  >
                    {drug?.name ?? id}
                    {drug?.cls ? (
                      <span className="block text-[10px] text-subtle">{drug.cls}</span>
                    ) : null}
                  </span>
                );
              })}
            </div>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed text-muted">{round.stem}</p>
          <p className="mt-3 text-sm font-medium text-fg">{round.ask}</p>
          {revealed ? (
            <p className="mt-3 rounded-md bg-bg-sunken px-3 py-3 text-sm leading-relaxed text-fg">{round.teach}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={onLoad}>
              {gated ? "Put on desk · Founding" : "Put on desk"}
            </Button>
            {!gated && round.drugIds.length > 0 ? (
              <Button size="sm" variant="secondary" onClick={onStudy}>
                Study these names
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={onReveal}>
              {revealed ? "Hide teach" : "Reveal teach"}
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
