import { useState } from "react";
import {
  ledgerFor,
  ledgerPlain,
  meetingLine,
  meetingOf,
  narrowIndexNames,
  sharedEnzymes,
} from "@/lib/drugs/ledger";

export function EnzymeLedger({ ids }: { ids: readonly string[] }) {
  const drugs = ledgerFor(ids);
  const [copied, setCopied] = useState<"ok" | "hand" | "idle">("idle");
  if (drugs.length === 0) return null;
  const shared = sharedEnzymes(ids);
  const narrow = narrowIndexNames(ids);
  const plain = ledgerPlain(ids);
  async function copyRows() {
    try {
      await navigator.clipboard.writeText(plain);
      setCopied("ok");
    } catch {
      setCopied("hand");
    }
  }
  return (
    <section aria-label="Stored enzyme ledger" className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Stored enzyme ledger</p>
        <button
          type="button"
          onClick={() => void copyRows()}
          className="min-h-[44px] rounded-full bg-bg-sunken px-3 text-[11px] font-medium text-fg"
        >
          {copied === "ok" ? "Copied" : "Copy stored rows"}
        </button>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
        Stored rows only. Same enzyme is not a collision. Not a clearance and not a milligram.
      </p>
      {narrow.length > 0 ? (
        <p className="min-w-0 break-words font-mono text-[11px] text-muted">
          Narrow index stored: {narrow.join(", ")}. A flag is not a clearance.
        </p>
      ) : null}
      <div className="space-y-2">
        {drugs.map((drug) => (
          <div key={drug.id} className="min-w-0">
            <p className="text-sm text-fg">{drug.name}</p>
            {drug.seats.length === 0 ? (
              <p className="font-mono text-[11px] text-muted">No enzyme row stored.</p>
            ) : (
              <ul className="mt-0.5 space-y-0.5">
                {drug.seats.map((seat, index) => (
                  <li
                    key={`${seat.enzyme}-${seat.kind}-${index}`}
                    className="min-w-0 break-words font-mono text-[11px] text-muted"
                  >
                    {seat.enzyme} · {seat.kind} · {seat.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {shared.length > 0 ? (
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Shared on this desk</p>
          {shared.map((row) => (
            <div key={row.enzyme} className="min-w-0">
              <p className="min-w-0 break-words font-mono text-[11px] text-muted">
                {row.enzyme} · {row.seats.map((seat) => `${seat.name} ${seat.kind} ${seat.detail}`).join(" · ")}
              </p>
              <p className="min-w-0 break-words text-[11px] text-muted">{meetingLine(meetingOf(row.seats))}</p>
            </div>
          ))}
        </div>
      ) : null}
      {copied === "hand" ? (
        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg-sunken p-3 font-mono text-[11px] text-muted">
          {plain}
        </pre>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {copied === "ok" ? "Stored rows copied." : copied === "hand" ? "Copy failed. The rows are shown to copy by hand." : ""}
      </p>
    </section>
  );
}
