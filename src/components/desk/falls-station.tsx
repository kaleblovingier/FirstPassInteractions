import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  DEPRESCRIBE_QUESTIONS,
  FALLS_CITATIONS,
  FALLS_DISCLAIMER,
  FALL_MECHANISMS,
  EMPTY_TRAY_NOTE,
  STEADI_NONE,
  WHAT_IF_NOTE,
  fallsReportOnDesk,
  fallsWhatIf,
  steadiScreen,
  type FallMechanism,
  type SteadiAnswers,
  type SteadiKey,
  type TaperFlag,
} from "@/lib/drugs/falls";

const TAPER_TONE: Record<TaperFlag, "warn" | "info" | "default"> = {
  yes: "warn",
  ask: "info",
  no: "default",
};

const TAPER_LABEL: Record<TaperFlag, string> = {
  yes: "Taper needed",
  ask: "Plan the stop",
  no: "Taper usually not needed",
};

const STEADI_TONE: Record<"high" | "watch" | "low", string> = {
  high: "bg-warn-soft text-warn",
  watch: "bg-info-soft text-info",
  low: "bg-bg-sunken text-fg",
};

const mechLabel = (m: FallMechanism) => FALL_MECHANISMS[m].label;

function Stat({ label, value, hint, alert }: { label: string; value: string | number; hint?: string; alert?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("whitespace-nowrap font-mono text-lg", alert ? "text-warn" : "text-fg")}>{value}</dd>
      {hint ? <dd className="text-xs leading-snug text-subtle">{hint}</dd> : null}
    </div>
  );
}

function MechanismBadges({ mechanisms }: { mechanisms: FallMechanism[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {mechanisms.map((m) => (
        <Badge key={m} tone="accent">
          {mechLabel(m)}
        </Badge>
      ))}
    </span>
  );
}

export function FallsPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const report = useMemo(() => fallsReportOnDesk(ids, host), [ids, host]);
  const { detection } = report;

  const [answers, setAnswers] = useState<SteadiAnswers>(STEADI_NONE);
  const steadi = steadiScreen(answers, detection.fridCount);
  const setAnswer = (key: SteadiKey, value: boolean) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const [removeId, setRemoveId] = useState<string | null>(null);
  const activeRemove = removeId && detection.fridIds.includes(removeId) ? removeId : null;
  const whatIf = useMemo(() => (activeRemove ? fallsWhatIf(ids, activeRemove) : null), [ids, activeRemove]);

  const footerNotes = report.notes.filter((n) => n !== EMPTY_TRAY_NOTE);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Falls</p>
        <h3 className="mt-1 font-serif text-lg tracking-tight text-fg">Falls risk &amp; deprescribing</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Count the fall-risk drugs on the tray, name how each one makes a person fall, and see how they stack. Then ask
          three questions of each class. The frame is STOPPFall and Beers 2023, with CDC STEADI for screening.
        </p>
      </div>

      <p
        className={cn(
          "rounded-lg px-3 py-2 text-sm leading-relaxed",
          report.host.olderAdult ? "bg-warn-soft text-warn" : "bg-info-soft text-info",
        )}
      >
        {report.host.message}
      </p>

      {!detection.hasFrid ? (
        <section className="space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]" aria-labelledby="falls-empty-h">
          <h4 id="falls-empty-h" className="font-serif text-base text-fg">
            No fall-risk drug mapped
          </h4>
          <p className="text-sm leading-relaxed text-fg">{EMPTY_TRAY_NOTE}</p>
          <p className="text-xs leading-relaxed text-muted">
            This station looks for drugs that cause falls through:{" "}
            {Object.values(FALL_MECHANISMS)
              .map((m) => m.label.toLowerCase())
              .join("; ")}
            . Add one to the tray to see the stack and the deprescribing questions.
          </p>
        </section>
      ) : (
        <section className="space-y-3" aria-labelledby="falls-stack-h">
          <h4 id="falls-stack-h" className="font-serif text-base text-fg">
            Fall-risk drugs on the tray
          </h4>
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-bg-sunken px-4 py-3 sm:grid-cols-4">
            <Stat label="Fall-risk drugs" value={detection.fridCount} alert={detection.stacked} />
            <Stat label="Mechanisms" value={detection.mechanismCount} />
            <Stat
              label="CNS-active (Beers)"
              value={detection.beersCnsActiveCount}
              hint={detection.beersCnsStack ? "Three or more" : "Beers line is 3"}
              alert={detection.beersCnsStack}
            />
            <Stat
              label="ACB total"
              value={report.acb ? report.acb.totalScore : 0}
              hint="From the ACB module"
              alert={Boolean(report.acb && report.acb.totalScore >= 3)}
            />
          </dl>
          <p className="text-sm leading-relaxed text-fg">{report.summary}</p>

          <h5 className="pt-1 text-xs font-medium uppercase tracking-wide text-muted">Stacked by mechanism</h5>
          <ul className="space-y-2">
            {report.mechanisms.map((m) => (
              <li key={m.id} className="min-w-0 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 font-serif text-base text-fg">{m.label}</p>
                  <span className="whitespace-nowrap font-mono text-sm text-muted">
                    {m.drugIds.length} {m.drugIds.length === 1 ? "drug" : "drugs"}
                  </span>
                </div>
                <div className="mt-2 flex gap-1" aria-hidden="true">
                  {m.drugIds.map((id) => (
                    <span key={id} className="h-2 flex-1 rounded-full bg-accent" />
                  ))}
                  {Array.from({ length: Math.max(0, detection.fridCount - m.drugIds.length) }, (_, i) => (
                    <span key={`gap-${i}`} className="h-2 flex-1 rounded-full bg-bg-sunken" />
                  ))}
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {m.drugIds.map((id, i) => (
                    <li key={id} className="max-w-full break-words rounded-full bg-bg-sunken px-2.5 py-1 text-xs text-fg">
                      {m.drugNames[i]}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs leading-relaxed text-muted">{m.how}</p>
                <p className="mt-1 text-xs leading-relaxed text-fg">
                  <span className="text-muted">Bedside check: </span>
                  {m.check}
                </p>
              </li>
            ))}
          </ul>

          <h5 className="pt-1 text-xs font-medium uppercase tracking-wide text-muted">Drug by drug</h5>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {report.drugs.map((d) => (
              <li key={d.id} className="min-w-0 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-words font-serif text-base text-fg">{d.name}</p>
                  {d.acbScore ? <Badge tone="default">ACB {d.acbScore}</Badge> : null}
                </div>
                <p className="mt-0.5 text-xs text-muted">{d.classLabels.join(" · ")}</p>
                <div className="mt-2">
                  <MechanismBadges mechanisms={d.mechanisms} />
                </div>
                {d.beersRow ? (
                  <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
                    <span className="font-medium">Beers row (clinic card): </span>
                    {d.beersRow}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* STEADI */}
      <section className="space-y-3" aria-labelledby="falls-steadi-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 id="falls-steadi-h" className="font-serif text-base text-fg">
            STEADI key questions
          </h4>
          <Button size="sm" variant="ghost" className="h-11" onClick={() => setAnswers(STEADI_NONE)}>
            Clear answers
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted">{report.steadi.rule}</p>
        <ul className="space-y-2">
          {report.steadi.questions.map((q) => {
            const id = `falls-steadi-${q.key}`;
            return (
              <li key={q.key}>
                <label
                  htmlFor={id}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5",
                    answers[q.key] ? "border-warn bg-warn-soft" : "border-border bg-surface",
                  )}
                >
                  <input
                    id={id}
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
                    checked={answers[q.key]}
                    onChange={(e) => setAnswer(q.key, e.target.checked)}
                  />
                  <span className="min-w-0 flex-1 text-sm text-fg">
                    {q.label}
                    {q.hint ? <span className="mt-0.5 block text-xs leading-relaxed text-muted">{q.hint}</span> : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className={cn("rounded-xl px-4 py-3", STEADI_TONE[steadi.tone])} aria-live="polite">
          <p className="text-sm font-medium leading-relaxed">{steadi.headline}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {steadi.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      {detection.hasFrid ? (
        <>
          {/* What-if */}
          <section className="space-y-3" aria-labelledby="falls-whatif-h">
            <h4 id="falls-whatif-h" className="font-serif text-base text-fg">
              Take one off: what changes?
            </h4>
            <p className="text-xs leading-relaxed text-muted">Pick a drug to see the count and the stack without it.</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Drug to take off in the what-if">
              {report.drugs.map((d) => (
                <Button
                  key={d.id}
                  variant={activeRemove === d.id ? "default" : "outline"}
                  aria-pressed={activeRemove === d.id}
                  className="h-auto min-h-11 max-w-full whitespace-normal break-words py-2 text-left"
                  onClick={() => setRemoveId(activeRemove === d.id ? null : d.id)}
                >
                  {d.name}
                </Button>
              ))}
              {activeRemove ? (
                <Button variant="ghost" className="min-h-11" onClick={() => setRemoveId(null)}>
                  Put it back
                </Button>
              ) : null}
            </div>
            {whatIf ? (
              <div className="space-y-2 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]" aria-live="polite">
                <dl className="grid grid-cols-3 gap-2">
                  <Stat label="Fall-risk drugs" value={`${whatIf.before.fridCount} → ${whatIf.after.fridCount}`} />
                  <Stat
                    label="Mechanisms"
                    value={`${whatIf.before.mechanisms.length} → ${whatIf.after.mechanisms.length}`}
                  />
                  <Stat label="CNS (Beers)" value={`${whatIf.before.beersCnsActiveCount} → ${whatIf.after.beersCnsActiveCount}`} />
                </dl>
                <p className="text-sm leading-relaxed text-fg">{whatIf.message}</p>
                {whatIf.lostMechanisms.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted">Leaves the stack:</span>
                    <MechanismBadges mechanisms={whatIf.lostMechanisms} />
                  </div>
                ) : null}
                <p className="text-xs leading-relaxed text-subtle">{WHAT_IF_NOTE}</p>
              </div>
            ) : null}
          </section>

          {/* Deprescribing */}
          <section className="space-y-3" aria-labelledby="falls-deprescribe-h">
            <h4 id="falls-deprescribe-h" className="font-serif text-base text-fg">
              Deprescribing questions, class by class
            </h4>
            <ol className="list-decimal space-y-0.5 pl-5 text-xs leading-relaxed text-muted">
              {DEPRESCRIBE_QUESTIONS.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
            <p className="text-xs leading-relaxed text-muted">
              No taper schedules here. Where a taper is needed, follow the named algorithm and the label; an abrupt stop
              risks withdrawal or rebound.
            </p>
            <ul className="space-y-3">
              {report.classes.map((c) => (
                <li key={c.id} className="min-w-0 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 font-serif text-base text-fg">{c.label}</p>
                    <Badge tone={TAPER_TONE[c.deprescribe.taper]}>{TAPER_LABEL[c.deprescribe.taper]}</Badge>
                  </div>
                  <p className="mt-0.5 break-words text-xs text-muted">On the tray: {c.drugNames.join(", ")}</p>
                  <div className="mt-2">
                    <MechanismBadges mechanisms={c.mechanisms} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-fg">{c.why}</p>
                  <dl className="mt-3 space-y-2 text-sm leading-relaxed">
                    <div>
                      <dt className="text-xs font-medium text-muted">1. Still indicated?</dt>
                      <dd className="text-fg">{c.deprescribe.indication}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted">2. Lower-risk option?</dt>
                      <dd className="text-fg">{c.deprescribe.alternative}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted">3. Taper?</dt>
                      <dd className="text-fg">{c.deprescribe.taperNote}</dd>
                    </div>
                  </dl>
                  {c.deprescribe.algorithm ? (
                    <p className="mt-2 rounded-lg bg-info-soft px-3 py-2 text-xs leading-relaxed text-info">{c.deprescribe.algorithm}</p>
                  ) : null}
                  {c.beers ? (
                    <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">{c.beers}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      <footer className="space-y-3 border-t border-border pt-4">
        {footerNotes.length > 0 ? (
          <ul className="space-y-2">
            {footerNotes.map((n) => (
              <li key={n} className="rounded-lg bg-info-soft px-3 py-2 text-sm leading-relaxed text-info">
                {n}
              </li>
            ))}
          </ul>
        ) : null}
        <details>
          <summary className="cursor-pointer py-3 text-xs font-medium leading-5 text-muted">Sources</summary>
          <ol className="mt-2 list-decimal space-y-1 break-words pl-5 text-xs leading-relaxed text-muted">
            {FALLS_CITATIONS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </details>
        <p className="text-xs leading-relaxed text-subtle">{FALLS_DISCLAIMER}</p>
      </footer>
    </div>
  );
}
