import { useState } from "react";
import { readRegimen } from "@/lib/drugs/readers-rpc";
import { READER_TITLES, type ReaderBrief, type ReaderNote } from "@/lib/drugs/readers";

const ORDER = ["pair", "gap", "trainee"] as const;

const BLURB: Record<(typeof ORDER)[number], string> = {
  pair: "Restates the sharpest row, its clock, and the source already on this check.",
  gap: "Names blank pairs and the reason they stayed quiet. A blank is not a clearance.",
  trainee: "One question from the clock, the victim type, or the source.",
};

function keyOf(brief: ReaderBrief) {
  return JSON.stringify(brief);
}

export function DeskReaders({ brief }: { brief: ReaderBrief }) {
  const key = keyOf(brief);
  const [notes, setNotes] = useState<ReaderNote[] | null>(null);
  const [askedKey, setAskedKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const stale = Boolean(notes && askedKey && askedKey !== key);

  async function ask() {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await readRegimen({ data: brief });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setNotes(res.readers);
      setAskedKey(key);
    } catch {
      setErr("The readers did not answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Three readers</p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Separate reads of this check. They cannot add a row, a milligram, or a clearance. Ask only when you want them.
          </p>
        </div>
        <button
          type="button"
          onClick={ask}
          disabled={busy || brief.names.length === 0}
          className="h-11 shrink-0 rounded-full bg-ink px-4 text-xs font-medium text-bg disabled:opacity-50"
        >
          {busy ? "Reading…" : notes ? "Ask again" : "Ask the three readers"}
        </button>
      </div>
      {brief.fold ? (
        <p className="text-xs leading-relaxed text-muted">{brief.fold} Not a milligram.</p>
      ) : null}
      {stale ? (
        <p className="text-xs leading-relaxed text-muted">The desk changed. These notes are for the previous list.</p>
      ) : null}
      {err ? <p className="text-xs leading-relaxed text-danger">{err}</p> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        {ORDER.map((id) => {
          const note = notes?.find((n) => n.id === id);
          return (
            <div key={id} className="rounded-md bg-bg-sunken px-3 py-2.5">
              <p className="text-sm font-medium text-fg">{READER_TITLES[id]}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{note ? note.text : BLURB[id]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
