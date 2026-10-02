import { useEffect, useMemo, useState } from "react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { lookupLiveSources } from "@/lib/drugs/live-rpc";
import type { FdaLabel } from "@/lib/drugs/live";
import { dailymedSearchUrl, dailymedSetUrl, NOT_CLEARED } from "@/lib/regulatory";
import { Badge } from "@/components/ui/badge";

type Row = { id: string; name: string; label: FdaLabel | null; reason?: string };

export function PrescribingStrip({ ids }: { ids: string[] }) {
  const key = ids.join("|");
  const drugs = useMemo(
    () => ids.map((id) => DRUG_BY_ID[id]).filter((d) => d && d.kind === "drug").slice(0, 3),
    [key],
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (drugs.length === 0) {
      setRows([]);
      return;
    }
    let live = true;
    setBusy(true);
    void Promise.all(
      drugs.map(async (d) => {
        try {
          const pack = await lookupLiveSources({ data: { id: d.id } });
          return { id: d.id, name: d.name, label: pack.label, reason: pack.reason } satisfies Row;
        } catch {
          return { id: d.id, name: d.name, label: null, reason: "OpenFDA did not answer." } satisfies Row;
        }
      }),
    )
      .then((next) => {
        if (live) setRows(next);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [key]);

  if (drugs.length === 0) return null;

  const quietRows = !busy && rows.length > 0 && rows.every((r) => !r.label);

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="rounded-lg border border-accent/15 bg-accent-soft/30 p-3 sm:p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Label coach</p>
        <p className="mt-1.5 text-sm leading-relaxed text-fg">
          Short excerpts from the official label — boxed warnings, when not to use, and how it mixes with other
          medicines. Truncated on purpose; open the full DailyMed page for the real Prescribing Information.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          A quiet or missing excerpt is not a green light. Educational only — dosing lives on the PI, and the full
          label + clinician still win.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg tracking-tight text-fg">Label excerpts</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Boxed warnings · do not use when · mixes with other medicines · full DailyMed label
          </p>
        </div>
        <Badge tone="warn">Full label wins</Badge>
      </div>

      {busy && rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Looking up current labels…</p>
      ) : null}

      {quietRows ? (
        <div className="mt-4 rounded-lg border border-border bg-bg-sunken px-4 py-4">
          <p className="text-sm font-medium text-fg">No label excerpts landed yet</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Live OpenFDA did not return boxed / do-not-use / mixes text for these names. Empty here is not
            “safe” — open the full DailyMed label for each medicine and confirm with a clinician.
          </p>
          <ul className="mt-3 space-y-2">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-fg">{row.name}</span>
                <a
                  className="inline-flex h-10 items-center font-mono text-[11px] text-accent hover:underline"
                  href={dailymedSearchUrl(row.name)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full label
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md bg-bg-sunken px-3 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-base tracking-tight text-fg">{row.name}</h3>
                <a
                  className="inline-flex h-10 items-center font-mono text-[11px] text-accent hover:underline"
                  href={row.label?.setId ? dailymedSetUrl(row.label.setId) : dailymedSearchUrl(row.name)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full label
                </a>
              </div>
              {row.label?.boxed ? (
                <div className="mt-2 rounded-md bg-danger-soft px-3 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-danger">Boxed warning</p>
                  <p className="mt-1 text-sm leading-relaxed text-fg">{row.label.boxed}</p>
                </div>
              ) : null}
              {row.label?.contraindications ? (
                <p className="mt-2 text-sm leading-relaxed text-fg">
                  <span className="font-medium">Do not use when. </span>
                  {row.label.contraindications}
                </p>
              ) : null}
              {row.label?.interactions ? (
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  <span className="font-medium text-fg">Mixes with other medicines. </span>
                  {row.label.interactions}
                </p>
              ) : null}
              {!row.label && row.reason ? (
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  No excerpt for this name yet — not a green light.{" "}
                  <span className="text-subtle">({row.reason})</span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-subtle">
        {NOT_CLEARED} Dosing lives on the official label, not this card.
      </p>
    </section>
  );
}
