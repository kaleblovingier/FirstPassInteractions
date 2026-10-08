import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trash2, Plus, ExternalLink } from "lucide-react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { lookupLiveSources } from "@/lib/drugs/live-rpc";
import type { LiveSources } from "@/lib/drugs/live";
import {
  readWatchlist,
  saveAdd,
  saveRemove,
  watchCap,
  type WatchlistState,
} from "@/lib/drugs/watchlist";
import { useDesk, usePlan } from "@/lib/drugs/store";
import type { EnzymeRole } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type RowStatus = {
  busy: boolean;
  err: string | null;
  pack: LiveSources | null;
};

function watchEnzymeLine(enzymes: EnzymeRole[]): string | null {
  const perp = enzymes.find(
    (role): role is Extract<EnzymeRole, { kind: "inhibitor" | "inducer" }> =>
      role.kind === "inhibitor" || role.kind === "inducer",
  );
  if (perp) return `${perp.strength} ${perp.enzyme.replace("CYP", "")}`;
  const sub = enzymes.find(
    (role): role is Extract<EnzymeRole, { kind: "substrate" }> => role.kind === "substrate",
  );
  if (!sub) return null;
  const label = `${sub.sensitivity} ${sub.enzyme.replace("CYP", "")}`;
  return sub.pathway === "activation" ? `${label} activation` : label;
}

export function WatchPage() {
  const plan = usePlan();
  const selected = useDesk((s) => s.selected);
  const load = useDesk((s) => s.load);
  const setView = useDesk((s) => s.setView);
  const openCheckout = useDesk((s) => s.openCheckout);
  const cap = watchCap(plan);

  const [book, setBook] = useState<WatchlistState>(() =>
    typeof window === "undefined" ? { ids: [] } : readWatchlist(),
  );
  const [rows, setRows] = useState<Record<string, RowStatus>>({});
  const [epoch, setEpoch] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const refreshOne = useCallback(async (id: string) => {
    setRows((prev) => ({
      ...prev,
      [id]: { busy: true, err: null, pack: prev[id]?.pack ?? null },
    }));
    try {
      const pack = await lookupLiveSources({ data: { id } });
      setRows((prev) => ({
        ...prev,
        [id]: {
          busy: false,
          err: pack.ok ? null : (pack.reason ?? "Did not answer."),
          pack,
        },
      }));
    } catch {
      setRows((prev) => ({
        ...prev,
        [id]: { busy: false, err: "Did not answer.", pack: null },
      }));
    }
  }, []);

  useEffect(() => {
    setBook(readWatchlist());
  }, [epoch]);

  useEffect(() => {
    for (const id of book.ids) {
      void refreshOne(id);
    }
  }, [book.ids.join("|"), epoch]); // eslint-disable-line react-hooks/exhaustive-deps

  function addTray() {
    if (selected.length === 0) return;
    setNote(null);
    const room = cap - book.ids.length;
    if (room <= 0) {
      if (plan === "free") {
        openCheckout(
          "lab",
          `The free desk holds ${cap} pins. Founding ($79 once) holds 12.`,
          "life",
        );
      } else {
        setNote(`All ${cap} pins are in use. Remove one to add another.`);
      }
      return;
    }
    const { state, rejected } = saveAdd(selected, cap);
    setBook(state);
    setEpoch((e) => e + 1);
    if (rejected.length > 0) {
      if (plan === "free") {
        openCheckout(
          "lab",
          `Added what fit in the ${cap} free pins. Founding ($79 once) holds 12.`,
          "life",
        );
      } else {
        setNote(
          `Added what fit in your ${cap} pins. Remove one to make room for the rest.`,
        );
      }
    }
  }

  function remove(id: string) {
    setBook(saveRemove(id));
    setRows((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function refreshAll() {
    setEpoch((e) => e + 1);
  }

  function openOnDesk(id: string) {
    load([id]);
    setView("desk");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-surface px-5 py-5 shadow-[var(--shadow-border)] sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Watch coach</p>
        <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg">Recent shortage and recall notes to read</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Pin the medicines on your tray. When you open this page, we ask OpenFDA for shortage rows and
          the top recall or enforcement note for each pin. The excerpts are shortened for teaching, the
          same as the dossier. These are recent label, shortage, and recall notes to read, not safety
          alerts. Nothing here is a push notification, a real-time alert, or dosing advice. The Prescribing Information and the{" "}
          <a
            href="https://www.fda.gov/drugs/drug-safety-and-availability/drug-shortages"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            FDA shortage page
          </a>{" "}
          still win. Open the full label to read the whole entry. No patient data: pins stay in this browser
          only.
        </p>
        <p className="mt-2 font-mono text-[11px] text-muted">
          {book.ids.length} of {cap} pins · {plan === "free" ? "free desks hold 5" : "founding holds 12"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={addTray} disabled={selected.length === 0}>
            <Plus className="size-3.5" />
            Add tray to watchlist
          </Button>
          <Button variant="secondary" size="sm" onClick={refreshAll} disabled={book.ids.length === 0}>
            <RefreshCw className="size-3.5" />
            Refresh all
          </Button>
        </div>
        {note ? (
          <p className="mt-3 text-sm leading-relaxed text-muted" role="status">
            {note}
          </p>
        ) : null}
      </section>

      {book.ids.length === 0 ? (
        <p className="rounded-lg bg-surface px-4 py-8 text-sm text-muted shadow-[var(--shadow-border)]">
          No pins yet. Put medicines on the tray, then tap Add tray to watchlist.
        </p>
      ) : (
        <ul className="space-y-3">
          {book.ids.map((id) => {
            const drug = DRUG_BY_ID[id];
            const enzymes = drug?.enzymes;
            const enzymeLine = enzymes?.[0] ? watchEnzymeLine(enzymes) : null;
            const row = rows[id];
            const shortage = row?.pack?.shortage ?? [];
            const recall = row?.pack?.recalls?.[0];
            return (
              <li
                key={id}
                className="rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)] sm:px-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg tracking-tight text-fg">
                      {drug?.name ?? id}
                    </h3>
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-muted">
                      {drug?.cls ?? "unknown"} · {id}
                    </p>
                    {enzymeLine ? (
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-subtle">
                        {enzymeLine}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openOnDesk(id)}>
                      Open on desk
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => void refreshOne(id)}>
                      <RefreshCw className={cn("size-3.5", row?.busy && "animate-spin")} />
                      Refresh
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => remove(id)}>
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {row?.busy && !row.pack ? (
                    <p className="text-sm text-muted">Asking OpenFDA…</p>
                  ) : null}
                  {row?.err ? <p className="text-sm text-danger">{row.err}</p> : null}

                  {shortage.length > 0 ? (
                    <div className="rounded-md bg-warn-soft px-3 py-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                        FDA shortage (shortened)
                      </p>
                      <ul className="mt-1 space-y-1">
                        {shortage.slice(0, 3).map((s, i) => (
                          <li key={`${s.name}-${i}`} className="text-sm leading-relaxed text-fg">
                            <span className="font-medium">{s.name}</span>
                            {s.status ? ` · ${s.status}` : ""}
                            {s.updated ? (
                              <span className="text-muted"> · updated {s.updated}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : row?.pack && !row.busy ? (
                    <p className="text-sm text-muted">
                      No OpenFDA shortage rows came back this time. Empty is not a green light: check the FDA
                      shortage page and the label.
                    </p>
                  ) : null}

                  {recall ? (
                    <div className="rounded-md bg-bg-sunken px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
                          Top recall / enforcement
                        </p>
                        {recall.classification ? (
                          <Badge tone="warn">{recall.classification}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-fg">
                        {recall.reason || "Enforcement report on file."}
                        {recall.status ? ` · ${recall.status}` : ""}
                        {recall.date ? (
                          <span className="text-muted"> · {recall.date}</span>
                        ) : null}
                      </p>
                    </div>
                  ) : null}

                  <a
                    href="https://www.fda.gov/drugs/drug-safety-and-availability/drug-shortages"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-1 font-mono text-[11px] text-accent hover:underline"
                  >
                    Open FDA shortage page <ExternalLink className="size-3" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-muted">
        Live excerpts are shortened. The label and Prescribing Information still win. To clear all
        pins on this browser, remove each row or clear the storage key{" "}
        <span className="font-mono">firstpass.watch.v1</span>.
        {book.updatedAt ? (
          <>
            {" "}
            Last write {book.updatedAt}.
          </>
        ) : null}
      </p>
    </div>
  );
}
