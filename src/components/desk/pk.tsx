import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DOSE_INTERVALS,
  modelsFor,
  modelPk,
  otherRoute,
} from "@/lib/drugs/pk";
import type { Drug, HostContext } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";

export function PkExplorer({ drugs, host }: { drugs: Drug[]; host: HostContext }) {
  const [tau, setTau] = useState(0);
  const [showAlt, setShowAlt] = useState(true);
  const models = useMemo(() => modelsFor(drugs, host, { tauH: tau }), [drugs, host, tau]);
  const [id, setId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    if (!models.length) {
      setId(null);
      return;
    }
    if (!id || !models.some((m) => m.id === id)) setId(models[0].id);
  }, [models, id]);
  const model = models.find((m) => m.id === id) ?? models[0];
  const altSpec = useMemo(
    () => (model ? otherRoute(model.id, host) : null),
    [model, host],
  );
  const alt = useMemo(() => {
    if (!showAlt || !model || !altSpec) return null;
    const victim = drugs.find((d) => d.id === model.id);
    if (!victim) return null;
    const others = drugs.filter((d) => d.id !== model.id && !d.id.startsWith("__"));
    const m = modelPk(victim, others, altSpec.host, {
      tauH: tau,
      horizonH: model.horizonH,
      n: model.points.length - 1,
      scale: model.scale,
    });
    return m;
  }, [showAlt, model, altSpec, drugs, tau]);
  const data = useMemo(() => {
    if (!model) return [];
    if (!alt) return model.points;
    return model.points.map((p, i) => ({ ...p, alt: alt.points[i]?.desk }));
  }, [model, alt]);
  if (!models.length || !model) {
    return (
      <section
        aria-label="Level sketch coach"
        className="rounded-xl border border-accent/15 bg-accent-soft/30 p-4 shadow-[var(--shadow-border)] sm:p-5"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Level sketch</p>
        <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">Nothing to draw yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Add a medicine with a mapped half-life story (ketamine, DXM, many CYP victims). Then flip a blocker,
          a metabolizer, or oral vs vein to see the teal line move. Not a plasma level and not a dose.
        </p>
      </section>
    );
  }
  const moved =
    Math.abs(Math.log(model.aucr)) > 0.08 ||
    Math.abs((model.metabFold ?? 1) - 1) > 0.15 ||
    (tau > 0 && model.rac >= 1.5);

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg tracking-tight text-fg">How levels might shift</h2>
          <p className="text-xs leading-relaxed text-muted">
            A teaching sketch of relative exposure — not a blood level and not a dose to give.
            {tau > 0
              ? " Repeated doses stack so you can see build-up."
              : " Grey is this route with a typical metabolizer and no blockers. Teal is this tray."}
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {DOSE_INTERVALS.map((row) => (
            <button
              key={row.id}
              type="button"
              aria-pressed={tau === row.id}
              onClick={() => setTau(row.id)}
              className={cn(
                "h-10 rounded-full px-3 text-xs font-medium",
                tau === row.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {row.label}
            </button>
          ))}
        </div>
        {altSpec ? (
          <button
            type="button"
            aria-pressed={showAlt}
            onClick={() => setShowAlt((v) => !v)}
            className={cn(
              "h-10 rounded-full px-3 text-xs font-medium",
              showAlt ? "bg-info-soft text-info" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            Overlay {altSpec.label.replace(/^If /, "")}
          </button>
        ) : null}
      </div>

      {models.length > 1 ? (
        <div className="mb-3 flex flex-wrap gap-1">
          {models.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === model.id}
              onClick={() => setId(m.id)}
              className={cn(
                "h-10 rounded-full px-3 text-xs font-medium",
                m.id === model.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {m.name}
              {Math.abs(Math.log(m.aucr)) > 0.08 ? (
                <span
                  className={cn(
                    "ml-1.5 font-mono tabular-nums",
                    m.id === model.id ? "text-accent-fg/80" : "text-accent",
                  )}
                >
                  {fold(m.aucr)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <dl className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat k="Exposure (AUCR)" v={fold(model.aucr)} hot={model.aucr >= 2 || model.aucr <= 0.5} />
        <Stat k="Cmax" v={fold(model.cmaxFold)} hot={model.cmaxFold >= 2} />
        <Stat
          k="Half-life"
          v={`${fmtH(model.tHalfBase)} → ${fmtH(model.tHalfDesk)}`}
          hot={model.tHalfDesk / model.tHalfBase >= 1.6}
        />
        {tau > 0 ? (
          <Stat k="Build-up (Rac)" v={fold(model.rac)} hot={model.rac >= 1.6} />
        ) : model.activationName ? (
          <Stat
            k={model.activationName}
            v={fold(model.metabFold ?? 1)}
            hot={(model.metabFold ?? 1) <= 0.5 || (model.metabFold ?? 1) >= 1.8}
          />
        ) : (
          <Stat k={model.iv ? "Input" : "Time to peak"} v={model.iv ? "Vein — skips gut" : fmtH(model.tmaxDesk)} />
        )}
        {tau > 0 && model.activationName ? (
          <Stat
            k={model.activationName}
            v={fold(model.metabFold ?? 1)}
            hot={(model.metabFold ?? 1) <= 0.5 || (model.metabFold ?? 1) >= 1.8}
          />
        ) : null}
      </dl>

      <div className={cn("w-full", tau > 0 ? "h-56 sm:h-64" : "h-52 sm:h-56")}>
        {ready ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={[0, model.horizonH]}
                ticks={axisTicks(model.horizonH)}
                tickFormatter={(t) => axisT(Number(t), model.horizonH)}
                tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={false}
                axisLine={false}
                tickLine={false}
                domain={[0, "auto"]}
                width={12}
              />
              <Tooltip
                content={
                  <PkTip
                    horizon={model.horizonH}
                    metabolite={model.activationName}
                    altLabel={altSpec && showAlt ? altSpec.label : undefined}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="base"
                name="Usual baseline"
                stroke="var(--color-subtle)"
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="desk"
                name="This tray"
                stroke="var(--color-accent)"
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
              {alt && showAlt ? (
                <Line
                  type="monotone"
                  dataKey="alt"
                  name={altSpec?.label ?? "Other route"}
                  stroke="var(--color-info)"
                  strokeWidth={1.6}
                  strokeDasharray="3 3"
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}
              {model.activationName ? (
                <Line
                  type="monotone"
                  dataKey="metab"
                  name={model.activationName}
                  stroke="var(--color-danger)"
                  strokeWidth={1.6}
                  strokeDasharray="5 4"
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-md bg-bg-sunken" />
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-px w-5 bg-subtle" /> Usual baseline
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-px w-5 bg-accent" /> This tray
        </span>
        {alt && showAlt ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-px w-5 bg-info" /> {altSpec?.label}
          </span>
        ) : null}
        {model.activationName ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-px w-5 bg-danger" /> {model.activationName}
          </span>
        ) : null}
        <span className="ml-auto text-subtle">
          {model.horizonH >= 48 ? "hours to days" : "hours"}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-fg">{model.note}</p>
      {tau > 0 ? (
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Build-up {fold(model.racBase)} → {fold(model.rac)} at every {tau}h. A simple stack of doses — not a trough
          level and not therapeutic drug monitoring.
        </p>
      ) : null}
      {moved && model.drivers.length ? (
        <ul className="mt-2 space-y-1">
          {model.drivers.slice(0, 4).map((d) => (
            <li key={d} className="text-xs leading-relaxed text-muted">
              {d}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Add a blocker, flip a metabolizer, tap a dosing interval, or overlay the other route to move the curve.
          This sketch teaches direction — it does not pick a milligram.
        </p>
      )}
    </section>
  );
}

function Stat({ k, v, hot }: { k: string; v: string; hot?: boolean }) {
  return (
    <div className="rounded-md bg-bg-sunken px-3 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">{k}</dt>
      <dd className={cn("mt-0.5 font-mono text-sm tabular-nums", hot ? "text-danger" : "text-fg")}>
        {v}
      </dd>
    </div>
  );
}

function fold(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 10) return `${n.toFixed(0)}×`;
  if (n >= 2 || n <= 0.5) return `${n.toFixed(1)}×`;
  return `${n.toFixed(2)}×`;
}

function fmtH(h: number) {
  if (h >= 48) return `${(h / 24).toFixed(h >= 96 ? 0 : 1)}d`;
  if (h >= 10) return `${h.toFixed(0)}h`;
  return `${h.toFixed(1)}h`;
}

function axisT(t: number, horizon: number) {
  if (horizon >= 48) return `${(t / 24).toFixed(t % 24 < 0.2 || t % 24 > 23.8 ? 0 : 1)}d`;
  return `${Math.round(t)}`;
}

function axisTicks(horizon: number) {
  const n = horizon >= 96 ? 4 : 5;
  return Array.from({ length: n + 1 }, (_, i) => (horizon * i) / n);
}

function PkTip({
  active,
  payload,
  label,
  horizon,
  metabolite,
  altLabel,
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number; color?: string }[];
  label?: string | number;
  horizon: number;
  metabolite?: string;
  altLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const names: Record<string, string> = {
    base: "Usual baseline",
    desk: "This tray",
    metab: metabolite ?? "Metabolite",
    alt: altLabel ?? "Other route",
  };
  return (
    <div className="rounded-md bg-surface-2 px-3 py-2 text-xs shadow-[var(--shadow-border)]">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
        {fmtH(Number(label))}
        {horizon >= 48 ? "" : " · h"}
      </p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex justify-between gap-4 font-mono tabular-nums">
            <span className="text-muted">{names[String(p.dataKey)] ?? p.dataKey}</span>
            <span className="text-fg">{Number(p.value ?? 0).toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
