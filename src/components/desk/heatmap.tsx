import { ENZYMES, type Drug, type Enzyme } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";

function cellRoles(drug: Drug, enzyme: Enzyme) {
  const roles = drug.enzymes.filter((e) => e.enzyme === enzyme);
  return {
    sub: roles.find((r) => r.kind === "substrate"),
    inh: roles.find((r) => r.kind === "inhibitor"),
    ind: roles.find((r) => r.kind === "inducer"),
  };
}

function Occupancy({
  sub,
  inh,
  ind,
  hit,
}: {
  sub: boolean;
  inh: boolean;
  ind: boolean;
  hit: boolean;
}) {
  const occupied = sub || inh || ind;
  return (
    <svg viewBox="0 0 32 32" className="mx-auto size-8" aria-hidden>
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="7"
        className={hit ? "fill-danger-soft" : occupied ? "fill-bg-sunken" : "fill-transparent"}
      />
      <circle
        cx="16"
        cy="16"
        r="9"
        fill="none"
        className={hit ? "stroke-danger" : occupied ? "stroke-fg" : "stroke-border"}
        strokeWidth="1.6"
      />
      <circle
        cx="16"
        cy="16"
        r="3.2"
        className={
          inh ? "fill-danger" : ind ? "fill-warn" : sub ? "fill-accent" : "fill-border"
        }
      />
      {ind ? (
        <>
          <path d="M16 4v4" className="stroke-warn" strokeWidth="1.4" strokeLinecap="square" />
          <path d="M16 24v4" className="stroke-warn" strokeWidth="1.4" strokeLinecap="square" />
          <path d="M4 16h4" className="stroke-warn" strokeWidth="1.4" strokeLinecap="square" />
          <path d="M24 16h4" className="stroke-warn" strokeWidth="1.4" strokeLinecap="square" />
        </>
      ) : null}
      {inh ? (
        <path d="M8 16h16" className="stroke-danger" strokeWidth="1.6" strokeLinecap="square" />
      ) : null}
    </svg>
  );
}

export function CypHeatmap({
  drugs,
  colliding,
}: {
  drugs: Drug[];
  colliding: Set<Enzyme>;
}) {
  const mapped = drugs.filter((d) => d.enzymes.length > 0);
  if (mapped.length === 0) return null;

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg tracking-tight text-fg">Who shares which enzyme</h2>
          <p className="text-xs leading-relaxed text-muted">
            Dot = broken down by that enzyme. Bar = slows it. Rays = speeds it up. Red-tinted columns are where this tray collides.
          </p>
        </div>
        <ul className="flex flex-wrap gap-3 text-[11px] text-muted">
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" /> Broken down here
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-danger" /> Slows the enzyme
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-warn" /> Speeds the enzyme
          </li>
        </ul>
      </div>
      <div className="-mx-1 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface px-2 py-2 text-xs font-medium text-muted">Drug</th>
              {ENZYMES.map((e) => (
                <th
                  key={e}
                  className={cn(
                    "px-1 py-2 text-center font-mono text-[10px] font-medium uppercase tracking-wide",
                    colliding.has(e) ? "text-danger" : "text-muted",
                  )}
                >
                  {e.replace("CYP", "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mapped.map((drug) => (
              <tr key={drug.id}>
                <th className="sticky left-0 z-10 bg-surface px-2 py-1.5 text-left text-xs font-medium text-fg">
                  {drug.name}
                </th>
                {ENZYMES.map((enzyme) => {
                  const { sub, inh, ind } = cellRoles(drug, enzyme);
                  const hit = colliding.has(enzyme) && (Boolean(sub) || Boolean(inh) || Boolean(ind));
                  return (
                    <td key={enzyme} className="px-1 py-1.5 text-center">
                      <Occupancy
                        sub={Boolean(sub)}
                        inh={Boolean(inh)}
                        ind={Boolean(ind)}
                        hit={hit}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
