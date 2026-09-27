import { useMemo, useState } from "react";
import { enzymeIndex } from "@/lib/drugs/engine";
import { DRUGS } from "@/lib/drugs/catalog";
import { isFdaIndex } from "@/lib/drugs/cyp-protocol";
import { ENZYMES, type Enzyme } from "@/lib/drugs/types";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ENZYME_PLATE } from "@/lib/drugs/visuals";
import { Plate } from "./plate";
import {
  ATLAS_COACH,
  ATLAS_COLUMN,
  ATLAS_COLUMN_EMPTY,
  ATLAS_ENZYME_PLAIN,
  ATLAS_FDA_INDEX,
  ATLAS_FOOTER,
  ATLAS_TITLE,
  type AtlasRole,
} from "@/lib/drugs/atlas-plain";

export function EnzymeAtlas() {
  const add = useDesk((s) => s.add);
  const selected = useDesk((s) => s.selected);
  const atlasEnzyme = useDesk((s) => s.atlasEnzyme);
  const setAtlasEnzyme = useDesk((s) => s.setAtlasEnzyme);
  const [q, setQ] = useState("");
  const index = useMemo(() => enzymeIndex(), []);
  const enzyme: Enzyme = ENZYMES.includes(atlasEnzyme as Enzyme)
    ? (atlasEnzyme as Enzyme)
    : "CYP3A4";
  const bucket = index[enzyme];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return null;
    return DRUGS.filter(
      (d) =>
        d.name.toLowerCase().includes(needle) ||
        d.brands.some((b) => b.toLowerCase().includes(needle)) ||
        d.cls.toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <Plate
            src={ENZYME_PLATE[enzyme]}
            alt={`${enzyme} specimen plate`}
            className="h-44 w-full lg:h-full min-h-44"
          />
          <div className="px-5 py-5 sm:px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              {ATLAS_TITLE.plainTitle}
              <span className="text-subtle"> · {ATLAS_TITLE.scientific}</span>
            </p>
            <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg">{ATLAS_ENZYME_PLAIN[enzyme].nickname}</h2>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{enzyme}</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg">{ATLAS_ENZYME_PLAIN[enzyme].blurb}</p>
            <div className="mt-3 max-w-2xl rounded-xl border border-accent/15 bg-accent-soft/30 p-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{ATLAS_COACH.kicker}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-fg">{ATLAS_COACH.body}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{ATLAS_FDA_INDEX.gloss}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{ATLAS_COACH.estimate}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ENZYMES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setAtlasEnzyme(e)}
            title={ATLAS_ENZYME_PLAIN[e].nickname}
            className={cn(
              "h-10 rounded-full px-3.5 font-mono text-xs font-medium",
              enzyme === e ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search this atlas — brand or generic…"
        className="h-11 w-full max-w-md rounded-md bg-surface-2 px-3 text-sm shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      />
      {filtered ? (
        filtered.length === 0 ? (
          <div
            role="status"
            className="rounded-xl border border-accent/20 bg-accent-soft/40 px-5 py-6 shadow-[var(--shadow-border)]"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Atlas coach</p>
            <h3 className="mt-1 font-serif text-lg tracking-tight text-fg">No medicines match “{q.trim()}”</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Try a generic or brand, clear the filter, or jump to a busy pathway like CYP3A4 or CYP2D6. Empty here only means the filter is tight — the desk is unchanged.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="h-10 rounded-full bg-ink px-3 text-xs font-medium text-bg"
                onClick={() => setQ("")}
              >
                Clear filter
              </button>
              <button
                type="button"
                className="h-10 rounded-full bg-bg-sunken px-3 text-xs font-medium text-fg hover:bg-accent-soft"
                onClick={() => {
                  setQ("");
                  setAtlasEnzyme("CYP3A4");
                }}
              >
                Open CYP3A4
              </button>
              <button
                type="button"
                className="h-10 rounded-full bg-bg-sunken px-3 text-xs font-medium text-fg hover:bg-accent-soft"
                onClick={() => {
                  setQ("");
                  setAtlasEnzyme("CYP2D6");
                }}
              >
                Open CYP2D6
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => add(d.id)}
                className="rounded-md bg-surface px-3 py-2.5 text-left shadow-[var(--shadow-border)] hover:bg-surface-2"
              >
                <div className="text-sm font-medium text-fg">{d.name}</div>
                <div className="text-xs text-muted">{d.cls}</div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          <AtlasColumn
            role="substrate"
            drugs={bucket.substrates}
            selected={selected}
            onAdd={add}
            enzyme={enzyme}
          />
          <AtlasColumn
            role="inhibitor"
            drugs={bucket.inhibitors}
            selected={selected}
            onAdd={add}
            enzyme={enzyme}
          />
          <AtlasColumn
            role="inducer"
            drugs={bucket.inducers}
            selected={selected}
            onAdd={add}
            enzyme={enzyme}
          />
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-subtle">{ATLAS_FOOTER}</p>
    </div>
  );
}

function AtlasColumn({
  drugs,
  selected,
  onAdd,
  enzyme,
  role,
}: {
  drugs: { id: string; name: string; cls: string; brands: string[] }[];
  selected: string[];
  onAdd: (id: string) => void;
  enzyme: Enzyme;
  role: AtlasRole;
}) {
  const copy = ATLAS_COLUMN[role];
  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-serif text-lg tracking-tight text-fg">{copy.title}</h3>
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">{copy.scientific}</p>
        </div>
        <Badge tone="default">{drugs.length}</Badge>
      </div>
      <p className="mb-3 text-xs text-muted">{copy.hint}</p>
      <ul className="space-y-1">
        {drugs.map((d) => {
          const on = selected.includes(d.id);
          const index = isFdaIndex(d.id, enzyme, role);
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onAdd(d.id)}
                disabled={on}
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left hover:bg-bg-sunken disabled:opacity-40"
              >
                <span>
                  <span className="block text-sm text-fg">{d.name}</span>
                  <span className="block text-[11px] text-muted">
                    {d.cls}
                    {index ? ` · ${ATLAS_FDA_INDEX.tag}` : ""}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-subtle">{copy.tag}</span>
              </button>
            </li>
          );
        })}
        {drugs.length === 0 ? (
          <li className="px-2 py-3 text-sm leading-relaxed text-muted">{ATLAS_COLUMN_EMPTY}</li>
        ) : null}
      </ul>
    </section>
  );
}
