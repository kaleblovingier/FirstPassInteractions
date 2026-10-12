import { ledgerFor, sharedEnzymes } from "@/lib/drugs/ledger";

export function EnzymeLedger({ ids }: { ids: readonly string[] }) {
  const drugs = ledgerFor(ids);
  if (drugs.length === 0) return null;
  const shared = sharedEnzymes(ids);
  return (
    <section aria-label="Stored enzyme ledger" className="mt-3 space-y-2">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Stored enzyme ledger</p>
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
        Stored rows only. Same enzyme is not a collision. Not a clearance and not a milligram.
      </p>
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
        <div className="min-w-0 space-y-0.5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Shared on this desk</p>
          {shared.map((row) => (
            <p key={row.enzyme} className="min-w-0 break-words font-mono text-[11px] text-muted">
              {row.enzyme} · {row.seats.map((seat) => `${seat.name} ${seat.kind} ${seat.detail}`).join(" · ")}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
