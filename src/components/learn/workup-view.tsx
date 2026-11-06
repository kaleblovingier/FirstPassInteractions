import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LabelFreshnessLine } from "@/components/label-freshness";
import { PairDisclaimer } from "@/components/seo/pair-page";
import { severitySurface } from "@/components/desk/severity";
import { leadGradeBasis, sourceLinkText } from "@/lib/drugs/grade-provenance";
import { SEVERITY_LABEL, type Finding, type Severity } from "@/lib/drugs/types";
import {
  NOT_A_GREEN_LIGHT, WORKUP_INTRO, gradeWorkup, loadDone, saveDone, summaryLine, workupPath,
  type PairAnswer, type PairCall, type PairOutcome, type PairResult, type WorkupCase, type WorkupPair,
} from "@/lib/learn/workup";
import { cn } from "@/lib/utils";

const CALLS: PairCall[] = ["none", "pk", "pd"];
const CALL_LABEL: Record<PairCall, string> = {
  none: "No interaction",
  pk: "Levels (PK): enzymes or transporters",
  pd: "Effects (PD): additive effect",
};
// The desk's kind words (check.tsx), with the PK / PD term students are calling.
const KIND_WORD: Record<Finding["kind"], string> = { pk: "Levels (PK)", pd: "Effects (PD)", geno: "Genes", clinic: "Clinic" };
const SEVERITIES: Severity[] = ["contraindicated", "major", "moderate", "minor"];
const OUTCOME: Record<PairOutcome, { label: string; tone: "default" | "ok" | "warn" | "danger" }> = {
  found: { label: "Found", tone: "ok" },
  missed: { label: "Missed", tone: "danger" },
  "unmapped-call": { label: "Not on the desk's map", tone: "default" },
  "none-agreed": { label: "Agreed: nothing mapped", tone: "ok" },
};
const KICKER = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted";
const pairName = (p: WorkupPair) => `${p.a.name} + ${p.b.name}`;

export function WorkupView({ cases, caseId }: { cases: WorkupCase[]; caseId?: string }) {
  const current = cases.find((c) => c.id === caseId);
  // Read after mount so the server and first client render match.
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => setDone(loadDone()), []);
  const markDone = (id: string) => {
    const next = done.includes(id) ? done : [...done, id];
    setDone(next);
    saveDone(next);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10" data-testid="workup">
      <p className={KICKER}>Learn · Workup</p>
      <h1 className="mt-1 font-serif text-3xl leading-tight tracking-tight text-fg">Workup: find the interactions</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{WORKUP_INTRO}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{NOT_A_GREEN_LIGHT}</p>

      <nav aria-labelledby="workup-cases" className="mt-8">
        <h2 id="workup-cases" className={KICKER}>Pick a case</h2>
        {cases.length ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {cases.map((c) => {
              const on = c.id === current?.id;
              return (
                <li key={c.id}>
                  <a
                    href={workupPath(c.id)}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "block min-h-11 rounded-lg px-3 py-2.5 shadow-[var(--shadow-border)]",
                      on ? "bg-accent-soft ring-2 ring-accent" : "bg-surface hover:bg-surface-2",
                    )}
                  >
                    <span className="block text-sm font-medium text-fg">{c.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {c.drugs.length} medicines · {c.pairs.length} pairs
                      {done.includes(c.id) ? " · Checked on this device" : ""}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No workup cases are available.</p>
        )}
      </nav>

      {current ? <CaseWorkup key={current.id} c={current} onChecked={() => markDone(current.id)} /> : null}
      <PairDisclaimer />
    </main>
  );
}

function CaseWorkup({ c, onChecked }: { c: WorkupCase; onChecked: () => void }) {
  const [answers, setAnswers] = useState<Record<string, PairAnswer>>({});
  const [revealed, setRevealed] = useState(false);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  // The Check button goes away on reveal; move focus to the results instead of dropping it.
  useEffect(() => {
    if (revealed) resultsRef.current?.focus();
  }, [revealed]);
  const grade = revealed ? gradeWorkup(c, answers) : null;
  const called = c.pairs.filter((p) => answers[p.key]).length;
  const ready = called === c.pairs.length;

  return (
    <section aria-labelledby="workup-case" className="mt-8">
      <h2 id="workup-case" className="font-serif text-2xl leading-tight tracking-tight text-fg">{c.title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{c.blurb}</p>
      <CaseLinks c={c} />

      <h3 className={cn(KICKER, "mt-6")}>Medicine list</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-3">
        {c.drugs.map((d) => (
          <li key={d.id} className="rounded-lg bg-surface-2 px-3 py-2 shadow-[var(--shadow-border)]">
            <span className="block text-sm font-medium text-fg">{d.name}</span>
            <span className="block text-xs text-muted">{d.cls}</span>
          </li>
        ))}
      </ul>

      <h3 className={cn(KICKER, "mt-6")}>Call each pair</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready || revealed) return;
          setRevealed(true);
          onChecked();
        }}
      >
        <ol className="mt-2 space-y-3">
          {c.pairs.map((p, i) => (
            <li key={p.key}>
              <PairQuestion
                pair={p}
                answer={answers[p.key]}
                disabled={revealed}
                onChange={(a) => setAnswers((prev) => ({ ...prev, [p.key]: a }))}
              />
              {grade ? <PairOutcomeView r={grade.pairs[i]} /> : null}
            </li>
          ))}
        </ol>
        {revealed ? null : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!ready}>Check my workup</Button>
            <p className="text-xs text-muted">
              {called} of {c.pairs.length} pairs called
            </p>
          </div>
        )}
      </form>

      <div role="status" className="mt-6">
        {grade ? (
          <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <h3 ref={resultsRef} tabIndex={-1} className="font-serif text-xl text-fg">Your workup against the desk</h3>
            <p className="mt-1 text-sm leading-relaxed text-fg" data-testid="workup-summary">{summaryLine(grade)}</p>
          </div>
        ) : null}
      </div>

      {grade ? (
        <>
          {grade.also.length ? (
            <section aria-labelledby="workup-also" className="mt-6">
              <h3 id="workup-also" className={KICKER}>Also on the desk</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Not scored here: whole-regimen stacks, single-medicine clinic notes and gene rows.
              </p>
              <ul className="mt-2 space-y-2">
                {grade.also.map((f) => (
                  <li key={f.id}>
                    <FindingLine f={f} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="mt-6">
            <a href={workupPath(c.id)} className="inline-flex min-h-11 items-center text-sm text-accent underline">
              Try this case again
            </a>
          </p>
        </>
      ) : null}
    </section>
  );
}

function CaseLinks({ c }: { c: WorkupCase }) {
  const [note, setNote] = useState("");
  const copy = async () => {
    const url = new URL(workupPath(c.id), window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied.");
    } catch {
      setNote(`Copy this link: ${url}`);
    }
  };
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" onClick={copy}>
        <Copy aria-hidden="true" className="size-4" />
        Copy link to this case
      </Button>
      <Button asChild variant="secondary">
        <a href={c.deskUrl}>
          Open this regimen on the desk
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </Button>
      <p role="status" className="w-full text-xs text-muted [overflow-wrap:anywhere]">{note}</p>
    </div>
  );
}

function PairQuestion({ pair, answer, disabled, onChange }: {
  pair: WorkupPair; answer?: PairAnswer; disabled: boolean; onChange: (a: PairAnswer) => void;
}) {
  const id = useId();
  return (
    <fieldset disabled={disabled} className="rounded-lg bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4">
      <legend className="float-left w-full text-sm font-medium text-fg">{pairName(pair)}</legend>
      <div className="clear-both grid gap-1 pt-1 sm:grid-cols-3">
        {CALLS.map((call) => (
          <label
            key={call}
            htmlFor={`${id}-${call}`}
            className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-fg hover:bg-surface-2"
          >
            <input
              type="radio"
              id={`${id}-${call}`}
              name={id}
              value={call}
              checked={answer?.call === call}
              onChange={() => onChange({ call, severity: answer?.severity })}
              className="size-4 shrink-0 accent-accent"
            />
            {CALL_LABEL[call]}
          </label>
        ))}
      </div>
      {answer && answer.call !== "none" ? (
        <div className="mt-2">
          <label htmlFor={`${id}-severity`} className="block text-xs font-medium text-muted">
            Severity guess (optional)
          </label>
          <select
            id={`${id}-severity`}
            value={answer.severity ?? ""}
            onChange={(e) => onChange({ call: answer.call, severity: (e.target.value || undefined) as Severity | undefined })}
            className="mt-1 h-11 w-full rounded-md bg-surface-2 px-3 text-sm text-fg sm:w-64"
          >
            <option value="">No guess</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>
            ))}
          </select>
        </div>
      ) : null}
    </fieldset>
  );
}

function PairOutcomeView({ r }: { r: PairResult }) {
  const o = OUTCOME[r.outcome];
  const top = r.findings[0];
  const desk = top
    ? [
        `Desk: ${[...new Set(r.findings.map((f) => KIND_WORD[f.kind]))].join(" and ")}, highest grade ${SEVERITY_LABEL[top.severity]}.`,
        r.kindMatch === null ? "" : r.kindMatch ? "Kind matches." : "Kind differs.",
        r.severityMatch === null ? "" : r.severityMatch ? "Severity matches." : "Severity differs.",
      ].filter(Boolean).join(" ")
    : r.outcome === "unmapped-call"
      ? "You called this and the desk has no finding. That does not settle it: check both labels. That is not a green light either way."
      : "The desk maps nothing for this pair. That is not a green light.";
  return (
    <div className="mt-2 rounded-lg bg-bg-sunken p-3 [overflow-wrap:anywhere]" data-testid="workup-result">
      <p className="flex flex-wrap items-center gap-2 text-sm text-fg">
        <Badge tone={o.tone}>{o.label}</Badge>
        <span>
          Your call: {CALL_LABEL[r.call]}
          {r.severity ? ` · ${SEVERITY_LABEL[r.severity]}` : ""}
        </span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{desk}</p>
      {r.pair.pagePath ? (
        <a href={r.pair.pagePath} className="inline-flex min-h-11 items-center text-xs text-accent underline">
          Read the public page for {pairName(r.pair)}
        </a>
      ) : null}
      {r.findings.length ? (
        <ul className="mt-2 space-y-2">
          {r.findings.map((f) => (
            <li key={f.id}>
              <FindingLine f={f} sourceFor={pairName(r.pair)} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** A desk finding: grade, kind, headline and mechanism; with `sourceFor`, the desk's "Why this grade" basis too. */
function FindingLine({ f, sourceFor }: { f: Finding; sourceFor?: string }) {
  const b = sourceFor ? leadGradeBasis(f) : null;
  return (
    <div className="rounded-md bg-surface-2 px-3 py-2.5 shadow-[var(--shadow-border)]">
      <p className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px]", severitySurface(f.severity))}>
          {SEVERITY_LABEL[f.severity]}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">{KIND_WORD[f.kind]}</span>
      </p>
      <p className="mt-1 text-sm font-medium leading-snug text-fg">{f.headline}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">
        Mechanism: {f.mechanism}
        {f.effect ? ` · ${f.effect}` : ""}
      </p>
      {b ? (
        <div className="mt-2 border-t border-border pt-2" data-testid="workup-source" data-basis-kind={b.kind}>
          <p className={KICKER}>Why this grade</p>
          <p className="mt-1 text-xs font-medium text-fg">{b.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{b.detail}</p>
          {b.href ? (
            <a
              href={b.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1 text-xs text-accent underline"
            >
              {sourceLinkText(b.title, b.href)}
              <span className="sr-only">, for {sourceFor} (opens in a new tab)</span>
              <ExternalLink aria-hidden="true" className="size-3" />
            </a>
          ) : null}
          <LabelFreshnessLine basis={b} />
        </div>
      ) : null}
    </div>
  );
}
