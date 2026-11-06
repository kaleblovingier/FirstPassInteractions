import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import {
  FIRST_SESSION_SEED, GRADE_CHOICES, glossaryLinks, PRACTICE_INTRO, ROLE_CHOICES, deckFacets, enzymeChoices, loadMarks, loadScore,
  markAnswer, practiceDeck, saveMarks, saveScore, scoreAnswer, sessionCards, sessionSummary,
  type CardResult, type PracticeQuestion, type PracticeScore, type PracticeSearch,
} from "@/lib/learn/practice";
import { duePhrase, isDue, type StudyMark } from "@/lib/drugs/study-marks";
import { SEVERITY_LABEL } from "@/lib/drugs/types";
import { Button } from "@/components/ui/button";
import { PairDisclaimer } from "@/components/seo/pair-page";

const CARD = "mt-6 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5";
const KICKER = "font-mono text-[11px] uppercase tracking-[0.2em] text-muted";
const SELECT = "mt-1 block h-11 w-full cursor-pointer rounded-md bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)]";
const CHOICE = "flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-surface-2 px-3 text-sm shadow-[var(--shadow-border)] has-[:checked]:bg-accent-soft has-[:disabled]:cursor-default";
const NO_SEARCH: PracticeSearch = {};

/** localStorage, or undefined on the server or when the browser blocks storage (the getter itself can throw). */
function deviceStorage(): Storage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}

function Choices({ legend, labelledBy, name, options, value, onChange, disabled }: {
  legend: string; labelledBy?: string; name: string; options: string[]; value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  const id = useId();
  return (
    <fieldset className="mt-4" disabled={disabled} aria-labelledby={labelledBy ? `${labelledBy} ${id}-legend` : undefined}>
      <legend id={`${id}-legend`} className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o, i) => (
          <label key={o} htmlFor={`${id}-${i}`} className={CHOICE}>
            <input type="radio" id={`${id}-${i}`} name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="accent-accent" />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SessionSummary({ results, headingRef, onRetry, onNew }: {
  results: CardResult[]; headingRef: RefObject<HTMLHeadingElement | null>; onRetry: (missed: PracticeQuestion[]) => void; onNew: () => void;
}) {
  const s = sessionSummary(results);
  return (
    <section aria-labelledby="practice-summary" className={CARD} data-testid="practice-summary">
      <h2 id="practice-summary" ref={headingRef} tabIndex={-1} className="font-serif text-2xl tracking-tight">Session summary</h2>
      <p className="mt-2 text-sm">{s.correct} of {s.answered} cards fully right.</p>
      <h3 className="mt-4 text-sm font-medium">Accuracy by enzyme, weakest first</h3>
      <ul className="mt-1 space-y-1 text-sm" data-testid="practice-summary-enzymes">
        {s.byEnzyme.map((g) => (
          <li key={g.enzyme}>{g.enzyme}: {g.correct} of {g.answered} right ({Math.round((100 * g.correct) / g.answered)}%)</li>
        ))}
      </ul>
      <h3 className="mt-4 text-sm font-medium">Missed pairs</h3>
      {s.missed.length ? (
        <>
          <ul className="mt-1 text-sm" data-testid="practice-summary-missed">
            {s.missed.map((q) => (
              <li key={q.slug}><a href={`/pair/${q.slug}`} className="inline-flex min-h-11 items-center underline">{q.nameA} + {q.nameB}</a></li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted">Missed pairs are due for review now.</p>
        </>
      ) : (
        <p className="mt-1 text-sm">None. Every card was fully right.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {s.missed.length ? <Button type="button" onClick={() => onRetry(s.missed)}>Retry missed</Button> : null}
        <Button type="button" variant="secondary" onClick={onNew}>New session</Button>
      </div>
    </section>
  );
}

/** One session on one deck, with the answer being built for the current card. */
interface Run { deckKey: string; cards: PracticeQuestion[]; pos: number; results: CardResult[]; grade: string; enzyme: string; role: string; revealed: boolean }

export function PracticeView({ questions, search = NO_SEARCH, onSearch }: {
  questions: PracticeQuestion[]; search?: PracticeSearch; onSearch?: (search: PracticeSearch) => void;
}) {
  const id = useId();
  const pool = useMemo(() => questions.flatMap((q) => q.enzymes), [questions]);
  const facets = useMemo(() => deckFacets(questions), [questions]);
  const deck = useMemo(() => practiceDeck(questions, search), [questions, search]);
  const deckKey = `${deck.enzyme ?? ""}|${deck.grade ?? ""}`;
  const firstCards = useMemo(() => sessionCards(deck.cards, FIRST_SESSION_SEED), [deck.cards]);

  const [score, setScore] = useState<PracticeScore>({ answered: 0, correct: 0 });
  const [marks, setMarks] = useState<Record<string, StudyMark>>({});
  useEffect(() => {
    const storage = deviceStorage();
    setScore(loadScore(storage));
    setMarks(loadMarks(storage));
  }, []);

  // A session belongs to the deck it was started on; a new deck (filter change, back button) starts its own first session.
  const [stored, setRun] = useState<Run | null>(null);
  const fresh = (cards: PracticeQuestion[]): Run => ({ deckKey, cards, pos: 0, results: [], grade: "", enzyme: "", role: "", revealed: false });
  const run = stored?.deckKey === deckKey ? stored : fresh(firstCards);

  // Focus moves only after the student acts, never on page load or a filter change.
  const focusNext = useRef<"question" | "result" | "summary" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === "question") formRef.current?.querySelector("input")?.focus();
    if (target === "result") resultRef.current?.focus();
    if (target === "summary") summaryRef.current?.focus();
  });

  const now = Date.now();
  const due = deck.cards.filter((q) => isDue(marks[q.slug], now)).length;
  const start = (cards: PracticeQuestion[]) => {
    focusNext.current = "question";
    setRun(fresh(cards));
  };
  const newSeed = () => String(Math.random());

  const q = run.cards[run.pos];
  const enzymeOpts = q ? enzymeChoices(q, pool, run.pos) : [];
  const result = q && run.revealed ? scoreAnswer(q, run) : null;
  const canReveal = !!q && run.grade !== "" && (!enzymeOpts.length || run.enzyme !== "") && (!q.roleA || run.role !== "");
  const pick = (field: "grade" | "enzyme" | "role") => (v: string) => setRun({ ...run, [field]: v });

  const reveal = () => {
    if (!q || !canReveal || run.revealed) return;
    const r = scoreAnswer(q, run);
    const storage = deviceStorage();
    const nextScore = { answered: score.answered + 1, correct: score.correct + (r.all ? 1 : 0) };
    setScore(nextScore);
    saveScore(storage, nextScore);
    const nextMarks = markAnswer(marks, q.slug, r.all);
    setMarks(nextMarks);
    saveMarks(storage, nextMarks);
    focusNext.current = "result";
    setRun({ ...run, revealed: true, results: [...run.results, { q, all: r.all }] });
  };
  const nextCard = () => {
    focusNext.current = run.pos + 1 < run.cards.length ? "question" : "summary";
    setRun({ ...run, pos: run.pos + 1, grade: "", enzyme: "", role: "", revealed: false });
  };
  const resetScore = () => {
    const z = { answered: 0, correct: 0 };
    setScore(z);
    saveScore(deviceStorage(), z);
  };
  const mark = (ok: boolean | null) =>
    ok === null ? null : <span className={ok ? "text-ok" : "text-danger"}>{ok ? " ✓ correct" : " ✗ not quite"}</span>;
  const reviewMark = q ? marks[q.slug] : undefined;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-testid="practice">
      <h1 className="text-2xl font-semibold">Practice: drug-pair recall</h1>
      <p className="mt-2 text-sm text-muted">{PRACTICE_INTRO}</p>
      <p className="mt-4 text-sm" aria-live="polite" data-testid="practice-score">
        Score on this device: {score.correct} of {score.answered}{" "}
        <Button type="button" variant="ghost" size="sm" className="min-h-[44px] underline" onClick={resetScore}>Reset score</Button>
      </p>
      <p className="mt-1 text-xs text-muted">Your score and review marks are kept only in this browser. We don't send or store them.</p>

      <section aria-labelledby="practice-deck" className={CARD} data-testid="practice-deck">
        <h2 id="practice-deck" className={KICKER}>Deck</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-enzyme`} className="text-sm font-medium">Enzyme</label>
            <select
              id={`${id}-enzyme`}
              className={SELECT}
              value={deck.enzyme ?? ""}
              onChange={(e) => onSearch?.({ enzyme: facets.enzymes.find((x) => x === e.target.value), grade: deck.grade })}
            >
              <option value="">All enzymes</option>
              {facets.enzymes.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-grade`} className="text-sm font-medium">Grade</label>
            <select
              id={`${id}-grade`}
              className={SELECT}
              value={deck.grade ?? ""}
              onChange={(e) => onSearch?.({ enzyme: deck.enzyme, grade: facets.grades.find((x) => x === e.target.value) })}
            >
              <option value="">All grades</option>
              {facets.grades.map((g) => <option key={g} value={g}>{SEVERITY_LABEL[g]}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-3 text-sm" aria-live="polite" data-testid="practice-deck-size">
          {deck.cards.length} {deck.cards.length === 1 ? "card" : "cards"} in this deck · {due} due for review
        </p>
        {due > 0 ? (
          <Button type="button" className="mt-3" onClick={() => start(sessionCards(deck.cards, newSeed(), marks))}>
            Study the due cards first
          </Button>
        ) : null}
        <p className="mt-3 text-xs text-muted">The page link keeps these filters, so you can share this deck with a class, a preceptor or a study group.</p>
      </section>

      {!deck.cards.length ? (
        <p className={`${CARD} text-sm`} data-testid="practice-empty">No cards match this deck. Choose another enzyme or grade.</p>
      ) : q ? (
        <section aria-labelledby="practice-pair" className={CARD}>
          <p id="practice-progress" className={KICKER} data-testid="practice-progress">Card {run.pos + 1} of {run.cards.length}</p>
          <h2 id="practice-pair" className="mt-1 font-serif text-2xl tracking-tight" data-testid="practice-pair">{q.nameA} + {q.nameB}</h2>
          <form ref={formRef} onSubmit={(e) => { e.preventDefault(); reveal(); }}>
            <Choices
              legend="What grade does FirstPass give this pair?"
              labelledBy="practice-progress practice-pair"
              name="grade"
              options={GRADE_CHOICES}
              value={run.grade}
              onChange={pick("grade")}
              disabled={run.revealed}
            />
            {enzymeOpts.length ? (
              <Choices legend="Which enzyme drives it?" name="enzyme" options={enzymeOpts} value={run.enzyme} onChange={pick("enzyme")} disabled={run.revealed} />
            ) : null}
            {q.roleA && q.enzymes[0] ? (
              <Choices legend={`What is ${q.nameA} at ${q.enzymes[0]}?`} name="role" options={ROLE_CHOICES} value={run.role} onChange={pick("role")} disabled={run.revealed} />
            ) : null}
            {!run.revealed ? (
              <Button type="submit" className="mt-4" disabled={!canReveal} aria-disabled={!canReveal}>Reveal answer</Button>
            ) : null}
          </form>

          {result ? (
            <div ref={resultRef} tabIndex={-1} className="mt-4 rounded-lg bg-surface-2 p-3 shadow-[var(--shadow-border)] sm:p-4" data-testid="practice-answer">
              <p className="text-sm"><strong>Grade:</strong> {q.gradeLabel}{mark(result.grade)}</p>
              {q.enzymes.length ? <p className="text-sm"><strong>Enzyme:</strong> {q.enzymes.join(", ")}{mark(result.enzyme)}</p> : null}
              {q.roleA ? <p className="text-sm"><strong>{q.nameA}:</strong> {q.roleA}{mark(result.role)}</p> : null}
              {q.quote ? (
                <blockquote className="mt-3 border-l-2 pl-3 text-sm">
                  <p>“{q.quote.quote}”</p>
                  <footer className="mt-1 text-xs text-muted">
                    {q.quote.labelDrug} label, {q.quote.labelSection}.{" "}
                    <a href={q.quote.url} rel="noopener" target="_blank" className="underline">Open the label on DailyMed<span className="sr-only"> (opens in a new tab)</span></a>
                  </footer>
                </blockquote>
              ) : null}
              {reviewMark ? <p className="mt-2 text-xs text-muted" data-testid="practice-review">Spaced review: {duePhrase(reviewMark, now)}.</p> : null}
              <p className="mt-2 flex flex-wrap gap-x-4 text-xs">
                <a className="inline-flex min-h-11 items-center underline" href={`/pair/${q.slug}`}>Read the full pair page</a>
                {glossaryLinks(q).map((g) => (
                  <a key={g.id} className="inline-flex min-h-11 items-center underline" href={`/glossary#${g.id}`}>Glossary: {g.label}</a>
                ))}
              </p>
              <Button type="button" className="mt-4" onClick={nextCard}>
                {run.pos + 1 < run.cards.length ? "Next pair" : "See session summary"}
              </Button>
            </div>
          ) : null}
        </section>
      ) : (
        <SessionSummary
          results={run.results}
          headingRef={summaryRef}
          onRetry={start}
          onNew={() => start(sessionCards(deck.cards, newSeed()))}
        />
      )}
      <PairDisclaimer />
    </main>
  );
}
