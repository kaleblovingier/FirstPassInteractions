import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  filterStationGroups,
  groupStations,
  isAlwaysOnStation,
  stationAlias,
  trayStations,
} from "@/lib/drugs/station-groups";

export interface StationTab<T extends string> {
  id: T;
  label: string;
  on: boolean;
}

const LOCKED_HINT = "Add a matching drug to the tray to open";

const pill =
  "h-10 rounded-full px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

function pillTone(active: boolean): string {
  return active ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg";
}

/**
 * Station picker for the clinical board.
 * Open stations for this tray show as pills. Every station sits in a grouped,
 * filterable list behind "All stations".
 */
export function StationPicker<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly StationTab<T>[];
  active: T;
  onSelect: (id: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const toggleRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  const rowLabelId = `${baseId}-row`;
  const panelId = `${baseId}-panel`;
  const filterId = `${baseId}-filter`;

  const row = useMemo(() => trayStations(tabs), [tabs]);
  const grouped = useMemo(() => groupStations(tabs), [tabs]);
  const shown = useMemo(() => filterStationGroups(grouped, query), [grouped, query]);
  const openCount = tabs.filter((t) => t.on).length;
  const trayOnly = row.every((t) => isAlwaysOnStation(t.id));

  const close = () => {
    setOpen(false);
    setQuery("");
    toggleRef.current?.focus();
  };

  const pick = (id: T) => {
    onSelect(id);
    close();
  };

  const onPanelKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };

  const onFilterKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const hits = shown.flatMap((g) => g.tabs).filter((t) => t.on);
    if (hits.length === 1) {
      e.preventDefault();
      pick(hits[0].id);
    }
  };

  return (
    <div className="mt-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={rowLabelId} className="font-mono text-[10px] uppercase tracking-wide text-muted">
          On this tray
        </p>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => (open ? close() : setOpen(true))}
          className={cn(pill, "inline-flex items-center gap-1.5 border border-border bg-transparent text-fg hover:bg-bg-sunken")}
        >
          All stations ({tabs.length})
          <ChevronDown
            aria-hidden="true"
            className={cn("size-3.5 shrink-0 transition-transform duration-150", open && "rotate-180")}
          />
        </button>
      </div>

      <ul aria-labelledby={rowLabelId} className="mt-2 flex flex-wrap gap-1">
        {row.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              aria-pressed={active === t.id}
              title={stationAlias(t.id)}
              onClick={() => onSelect(t.id)}
              className={cn(pill, pillTone(active === t.id))}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>
      {trayOnly ? (
        <p className="mt-2 text-xs text-muted">No drug on the tray opens a station yet.</p>
      ) : null}

      <div
        id={panelId}
        hidden={!open}
        onKeyDown={onPanelKey}
        className="mt-3 rounded-lg border border-border bg-surface-2 p-3"
      >
        <label htmlFor={filterId} className="text-xs font-medium text-fg">
          Find a station
        </label>
        <Input
          id={filterId}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onFilterKey}
          placeholder="Name or area, like heart or INR"
          className="mt-1"
        />
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {openCount} of {tabs.length} open for this tray. Dashed ones need a matching drug on the tray.
        </p>

        <div className="mt-3 max-h-[min(28rem,60vh)] space-y-4 overflow-y-auto overscroll-contain pr-1">
          {shown.length === 0 ? (
            <p className="text-sm text-muted" role="status">
              No station matches “{query.trim()}”.
            </p>
          ) : (
            shown.map((g) => {
              const headingId = `${baseId}-g-${g.id}`;
              const live = g.tabs.filter((t) => t.on).length;
              return (
                <section key={g.id} aria-labelledby={headingId}>
                  <h3 id={headingId} className="flex flex-wrap items-baseline gap-x-2 text-xs font-medium text-fg">
                    {g.label}
                    <span className="font-normal text-subtle">{live ? `${live} open` : "none open"}</span>
                  </h3>
                  <ul className="mt-1.5 flex flex-wrap gap-1">
                    {g.tabs.map((t) => {
                      const alias = stationAlias(t.id);
                      return (
                        <li key={t.id}>
                          {t.on ? (
                            <button
                              type="button"
                              aria-pressed={active === t.id}
                              title={alias}
                              onClick={() => pick(t.id)}
                              className={cn(pill, pillTone(active === t.id))}
                            >
                              {t.label}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title={alias ? `${alias}. ${LOCKED_HINT}.` : `${LOCKED_HINT}.`}
                              className={cn(
                                pill,
                                "cursor-not-allowed border border-dashed border-border-strong bg-transparent text-subtle",
                              )}
                            >
                              {t.label}
                              <span className="sr-only">. {LOCKED_HINT}.</span>
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
