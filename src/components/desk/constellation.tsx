import { useMemo } from "react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import type { Finding, Severity } from "@/lib/drugs/types";
import { SEVERITY_LABEL } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";

const TONE: Record<Severity, string> = {
  contraindicated: "stroke-danger",
  major: "stroke-danger",
  moderate: "stroke-warn",
  minor: "stroke-info",
};

export function CollisionMap({
  selected,
  findings,
}: {
  selected: string[];
  findings: Finding[];
}) {
  const layout = useMemo(() => {
    const n = selected.length;
    if (n < 2) return null;
    const cx = 160;
    const cy = 96;
    const r = n === 2 ? 62 : 70;
    const nodes = selected.map((id, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return {
        id,
        name: DRUG_BY_ID[id]?.name ?? id,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
    const edges = findings
      .filter((f) => f.drugIds.length >= 2)
      .map((f) => {
        const a = nodes.find((n) => n.id === f.drugIds[0]);
        const b = nodes.find((n) => n.id === f.drugIds[1]);
        if (!a || !b) return null;
        return { id: f.id, a, b, severity: f.severity };
      })
      .filter(Boolean) as {
      id: string;
      a: (typeof nodes)[number];
      b: (typeof nodes)[number];
      severity: Severity;
    }[];
    return { nodes, edges };
  }, [selected, findings]);

  if (!layout) {
    return (
      <section className="rounded-xl border border-accent/15 bg-accent-soft/30 p-4 shadow-[var(--shadow-border)] sm:p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Pair map</p>
        <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">Who connects to whom</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Add a second medicine to draw lines between pairs. Lines are teaching collisions on this tray — not a
          charted order and not a green light when the map is blank.
        </p>
      </section>
    );
  }

  const noEdges = layout.edges.length === 0;

  return (
    <section className="overflow-hidden rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="mb-3">
        <h2 className="font-serif text-lg tracking-tight text-fg">Who connects to whom</h2>
        <p className="text-xs leading-relaxed text-muted">
          Each line is a pair that showed up in Collisions. Thicker / warmer lines mean a higher teaching severity
          bin — still not a personal prediction of harm.
        </p>
      </div>
      {noEdges ? (
        <div className="mb-3 rounded-lg border border-border bg-bg-sunken px-3 py-3">
          <p className="text-sm font-medium text-fg">Nodes only — no pair lines yet</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            These medicines are on the tray, but this checker has no mapped pair between them. Empty lines are not
            the same as safe.
          </p>
        </div>
      ) : null}
      <svg
        viewBox="0 0 320 210"
        className="block h-auto w-full max-w-sm"
        role="img"
        aria-label="Pair constellation: medicines as nodes, collisions as lines"
      >
        {layout.edges.map((e) => (
          <line
            key={e.id}
            x1={e.a.x}
            y1={e.a.y}
            x2={e.b.x}
            y2={e.b.y}
            className={cn(TONE[e.severity])}
            strokeWidth={e.severity === "contraindicated" || e.severity === "major" ? 2.4 : 1.4}
            strokeLinecap="round"
            opacity={0.85}
          />
        ))}
        {layout.nodes.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="16" className="fill-accent" />
            <circle cx={n.x} cy={n.y} r="5" className="fill-accent-fg" />
            <text
              x={n.x}
              y={n.y + 28}
              textAnchor="middle"
              className="fill-fg"
              style={{ fontSize: 9, fontFamily: "IBM Plex Sans, sans-serif" }}
            >
              {n.name.length > 16 ? `${n.name.slice(0, 15)}…` : n.name}
            </text>
          </g>
        ))}
      </svg>
      <ul className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-danger" /> {SEVERITY_LABEL.major} / do-not-combine
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-warn" /> {SEVERITY_LABEL.moderate}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-info" /> {SEVERITY_LABEL.minor}
        </li>
      </ul>
    </section>
  );
}
