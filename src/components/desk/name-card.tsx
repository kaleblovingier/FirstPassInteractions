import { useState } from "react";
import { storedNamePlain, storedNames } from "@/lib/drugs/name-card";

export function StoredNameCard({ ids }: { ids: readonly string[] }) {
  const names = storedNames(ids);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"ok" | "hand" | "idle">("idle");
  if (names.length === 0) return null;
  const plain = storedNamePlain(ids);
  async function copyNames() {
    try {
      await navigator.clipboard.writeText(plain);
      setCopied("ok");
    } catch {
      setCopied("hand");
    }
  }
  return (
    <section aria-label="Stored name card" className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Stored name card</p>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="min-h-[44px] rounded-full bg-bg-sunken px-3 text-[11px] font-medium text-fg"
        >
          {open ? "Hide stored watch and note" : "Show stored watch and note"}
        </button>
        <button
          type="button"
          onClick={() => void copyNames()}
          className="min-h-[44px] rounded-full bg-bg-sunken px-3 text-[11px] font-medium text-fg"
        >
          {copied === "ok" ? "Copied" : "Copy stored names"}
        </button>
      </div>
      <p className="min-w-0 break-words text-[11px] text-muted">
        The watch phrase and the note were already stored. Opening them is not a new finding. Not a diagnosis and not a milligram.
      </p>
      {open
        ? names.map((row) => (
            <div key={row.id} className="min-w-0">
              <p className="text-sm text-fg">{row.name}</p>
              <p className="min-w-0 break-words font-mono text-[11px] text-muted">
                {row.kindLabel}. {row.cls}.
              </p>
              {row.watch ? (
                <p className="min-w-0 break-words text-[11px] text-muted">Watch: {row.watch} Not a diagnosis.</p>
              ) : null}
              {row.note ? (
                <p className="min-w-0 break-words text-[11px] text-muted">Note: {row.note} Not a clearance.</p>
              ) : null}
            </div>
          ))
        : null}
      {copied === "hand" ? (
        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg-sunken p-3 font-mono text-[11px] text-muted">
          {plain}
        </pre>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {copied === "ok" ? "Stored names copied." : copied === "hand" ? "Copy failed. The names are shown to copy by hand." : ""}
      </p>
    </section>
  );
}
