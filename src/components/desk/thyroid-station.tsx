import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import type { HostContext } from "@/lib/drugs/types";
import {
  OTHER_INDUCER_GROUP_KEY,
  THYROID_CITATIONS,
  THYROID_DISCLAIMER,
  THYROID_PATTERNS,
  defaultThyroidContext,
  thyroidExplain,
  thyroidReportOnDesk,
  type AntithyroidRow,
  type ThyroidContext,
  type ThyroidHit,
  type ThyroidMapRow,
  type ThyroidPattern,
  type ThyroidSeparation,
} from "@/lib/drugs/thyroid";

const selectClass =
  "mt-1 h-11 w-full min-w-0 rounded-md border border-border bg-surface-2 px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

const CONTEXT_LABEL: Record<ThyroidContext, string> = {
  treated: "On levothyroxine",
  untreated: "Untreated gland",
};

const CONTEXT_HINT: Record<ThyroidContext, string> = {
  treated:
    "A patient on a fixed levothyroxine dose cannot compensate. Gut, liver, and binding changes show up as a TSH change.",
  untreated:
    "An intact gland adjusts its own output. Gut, liver, and binding changes mostly wash out. Gland, pituitary, and assay effects still show.",
};

const PATTERN_LABEL: Record<ThyroidPattern, string> = {
  "tsh-up": "TSH up",
  "tsh-down": "TSH low",
  "t4-odd": "T4 off",
};

const nameOf = (id: string) => DRUG_BY_ID[id]?.name ?? id;

interface HitGroup {
  key: string;
  label: string;
  what: string;
  source: string;
  names: string[];
  patterns: ThyroidPattern[];
}

/** One row per teaching group; "other inducer" rows stay per drug because their text is per drug. */
function groupHits(hits: ThyroidHit[], ctx: ThyroidContext): HitGroup[] {
  const out = new Map<string, HitGroup>();
  for (const h of hits) {
    const key = h.groupKey === OTHER_INDUCER_GROUP_KEY ? `${h.groupKey}:${h.id}` : h.groupKey;
    const row = out.get(key);
    if (row) {
      if (!row.names.includes(h.name)) row.names.push(h.name);
    } else {
      out.set(key, {
        key,
        label: h.groupLabel,
        what: h.what,
        source: h.source,
        names: [h.name],
        patterns: ctx === "treated" ? h.treated : h.untreated,
      });
    }
  }
  return [...out.values()];
}

function HitCard({ g, showPatterns }: { g: HitGroup; showPatterns?: boolean }) {
  return (
    <li className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2">
      <p className="break-words text-sm font-medium text-fg">{g.names.join(", ")}</p>
      <p className="mt-0.5 text-xs text-muted">{g.label}</p>
      <p className="mt-1 text-sm leading-relaxed text-fg">{g.what}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {showPatterns ? (
          g.patterns.length > 0 ? (
            g.patterns.map((p) => (
              <Badge key={p} tone="accent">
                {PATTERN_LABEL[p]}
              </Badge>
            ))
          ) : (
            <Badge>No test change in this view</Badge>
          )
        ) : null}
        <span className="text-xs text-subtle">{g.source}</span>
      </div>
    </li>
  );
}

function SeparationBlock({ sep }: { sep: ThyroidSeparation | null }) {
  if (!sep) {
    return (
      <p className="text-xs leading-relaxed text-muted">
        Labeled levothyroxine spacing lives on the Separate station. Put levothyroxine on the tray to see it here.
      </p>
    );
  }
  return (
    <div className="rounded-lg bg-bg-sunken px-3 py-2">
      <p className="text-xs font-medium text-muted">Labeled spacing, from the Separate station</p>
      <p className="mt-1 text-sm leading-relaxed text-fg">{sep.apart}</p>
      <p className="mt-1 text-xs text-subtle">
        {sep.source}
        {sep.bindersOnTray.length > 0 ? ` On the tray: ${sep.bindersOnTray.map((b) => b.name).join(", ")}.` : ""}
      </p>
    </div>
  );
}

function CompareBlock({ rows }: { rows: AntithyroidRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted">Methimazole vs PTU</p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.topic} className="rounded-lg bg-bg-sunken px-3 py-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{r.topic}</p>
            <dl className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-xs text-muted">Methimazole</dt>
                <dd className="text-sm leading-relaxed text-fg">{r.methimazole}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted">PTU</dt>
                <dd className="text-sm leading-relaxed text-fg">{r.ptu}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MechanismCard({
  row,
  ctx,
  separation,
  compare,
}: {
  row: ThyroidMapRow;
  ctx: ThyroidContext;
  separation: ThyroidSeparation | null;
  compare: AntithyroidRow[];
}) {
  const groups = groupHits(row.hits, ctx);
  const count = new Set(row.hits.map((h) => h.id)).size;
  return (
    <li className="min-w-0 rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <details open={count > 0} className="group">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-2">
          <span className="min-w-0">
            <span className="font-serif text-base text-fg">{row.label}</span>
            <span className="ml-2 text-xs text-muted">{row.where}</span>
          </span>
          <Badge tone={count > 0 ? "accent" : "default"}>{count > 0 ? `${count} on tray` : "None on tray"}</Badge>
        </summary>
        <div className="space-y-3 border-t border-border px-4 py-3">
          <p className="text-sm leading-relaxed text-fg">{row.summary}</p>
          <p className="rounded-lg bg-bg-sunken px-3 py-2 text-sm leading-relaxed text-fg">
            <span className="font-medium">{CONTEXT_LABEL[ctx]}: </span>
            {row.inContext}
          </p>
          {groups.length > 0 ? (
            <ul className="space-y-2">
              {groups.map((g) => (
                <HitCard key={g.key} g={g} showPatterns />
              ))}
            </ul>
          ) : null}
          <p className="text-xs leading-relaxed text-muted">
            <span className="font-medium">In the map: </span>
            {row.groupLabels.join(" · ")}
            {row.alsoInClass ? `. Also in this class, not in the catalog: ${row.alsoInClass}.` : "."}
          </p>
          {row.mechanism === "absorption" ? <SeparationBlock sep={separation} /> : null}
          {row.mechanism === "antithyroid" ? <CompareBlock rows={compare} /> : null}
        </div>
      </details>
    </li>
  );
}

export function ThyroidPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const [ctxOverride, setCtxOverride] = useState<ThyroidContext | null>(null);
  const [pattern, setPattern] = useState<ThyroidPattern | "all">("tsh-up");

  const trayCtx = defaultThyroidContext(ids);
  const ctx = ctxOverride ?? trayCtx;

  const report = useMemo(() => thyroidReportOnDesk(ids, host, ctx), [ids, host, ctx]);
  const explain = useMemo(() => thyroidExplain(ids, ctx, pattern), [ids, ctx, pattern]);
  // The full comparison teaches even when no thionamide is on the tray.
  const compare = useMemo(() => thyroidReportOnDesk(["methimazole"]).antithyroid ?? [], []);

  const d = report.detection;
  const explainGroups = explain.groups.map((g) => ({ ...g, rows: groupHits(g.hits, ctx) }));

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Thyroid</p>
        <h3 className="mt-1 font-serif text-lg tracking-tight text-fg">Drugs that move thyroid tests</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          The same TSH change can start in the gut, the liver, the blood, the gland, the pituitary, or the lab tube. Sort the
          tray by where each drug acts.
        </p>
      </div>

      {d.hormoneIds.length > 0 || d.antithyroidIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {d.hormoneIds.map((id) => (
            <Badge key={id} tone="info">
              {nameOf(id)} · thyroid hormone
            </Badge>
          ))}
          {d.antithyroidIds.map((id) => (
            <Badge key={id} tone="warn">
              {nameOf(id)} · antithyroid
            </Badge>
          ))}
        </div>
      ) : null}

      {!d.hasThyroidRelevant ? (
        <div className="rounded-xl bg-bg-sunken px-4 py-3">
          <p className="text-sm font-medium text-fg">
            {d.hasAnyMapped ? "Nothing on the tray moves a thyroid test on its own." : "Nothing on the tray is in the thyroid map."}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {d.hasAnyMapped
              ? "The drugs filed below matter in the right setting, such as a patient on levothyroxine or a free T4 drawn on heparin. Switch the view to see how they would read."
              : "Add levothyroxine, methimazole, amiodarone, lithium, or biotin to see the map fill in. The mechanisms below still teach on an empty tray."}
          </p>
        </div>
      ) : null}

      {/* Which tray drug could explain it? */}
      <section className="space-y-3" aria-labelledby="thy-explain-h">
        <h4 id="thy-explain-h" className="font-serif text-base text-fg">
          Which tray drug could explain it?
        </h4>
        <fieldset className="min-w-0">
          <legend className="text-xs text-muted">Whose thyroid tests?</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["treated", "untreated"] as const).map((c) => (
              <Button
                key={c}
                type="button"
                variant={ctx === c ? "default" : "secondary"}
                aria-pressed={ctx === c}
                onClick={() => setCtxOverride(c === trayCtx ? null : c)}
                className="w-full min-w-0 whitespace-normal text-center leading-tight"
              >
                {CONTEXT_LABEL[c]}
              </Button>
            ))}
          </div>
        </fieldset>
        <p className="text-xs leading-relaxed text-muted">{CONTEXT_HINT[ctx]}</p>
        {ctx === "treated" && !d.onThyroidHormone ? (
          <p className="text-xs leading-relaxed text-subtle">
            No thyroid hormone is on the tray. This view shows how the tray would read if there were.
          </p>
        ) : null}

        <div>
          <label htmlFor="thy-pattern" className="text-xs text-muted">
            What changed?
          </label>
          <select
            id="thy-pattern"
            className={selectClass}
            value={pattern}
            onChange={(e) => setPattern(e.target.value as ThyroidPattern | "all")}
          >
            {THYROID_PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p[ctx]}
              </option>
            ))}
            <option value="all">Show every mechanism on the tray</option>
          </select>
        </div>

        {explain.empty ? (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm leading-relaxed text-warn" role="status">
            {explain.emptyNote}
          </p>
        ) : (
          <ol className="space-y-3" aria-label={explain.question}>
            {explainGroups.map((g) => (
              <li key={g.mechanism} className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-serif text-base text-fg">{g.label}</span>
                  <span className="text-xs text-muted">{g.where}</span>
                </div>
                <ul className="space-y-2">
                  {g.rows.map((r) => (
                    <HitCard key={r.key} g={r} />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
        {!explain.empty ? (
          <p className="text-xs leading-relaxed text-subtle">
            A match means the drug can do this, not that it did. Timing, dose, and the patient decide.
          </p>
        ) : null}
      </section>

      {/* Mechanism map */}
      <section className="space-y-3" aria-labelledby="thy-map-h">
        <h4 id="thy-map-h" className="font-serif text-base text-fg">
          Mechanism map
        </h4>
        <p className="text-xs leading-relaxed text-muted">
          Read for the view above: <span className="font-medium text-fg">{CONTEXT_LABEL[ctx].toLowerCase()}</span>. Cards with
          tray drugs open first.
        </p>
        <ul className="space-y-2">
          {report.map.map((row) => (
            <MechanismCard key={row.mechanism} row={row} ctx={ctx} separation={report.separation} compare={compare} />
          ))}
        </ul>
      </section>

      <footer className="space-y-3 border-t border-border pt-4">
        {report.notes.length > 0 ? (
          <ul className="space-y-2">
            {report.notes.map((n) => (
              <li key={n} className={cn("rounded-lg bg-info-soft px-3 py-2 text-sm leading-relaxed text-info")}>
                {n}
              </li>
            ))}
          </ul>
        ) : null}
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium text-muted">Sources</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-muted">
            {THYROID_CITATIONS.map((c) => (
              <li key={c} className="break-words">
                {c}
              </li>
            ))}
          </ol>
        </details>
        <p className="text-xs leading-relaxed text-subtle">{THYROID_DISCLAIMER}</p>
      </footer>
    </div>
  );
}
