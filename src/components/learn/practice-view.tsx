import { useEffect, useId, useMemo, useState } from "react";
import {
  GRADE_CHOICES, PRACTICE_INTRO, ROLE_CHOICES, enzymeChoices, loadScore, saveScore, scoreAnswer,
  type PracticeQuestion, type PracticeScore,
} from "@/lib/learn/practice";
import { PairDisclaimer } from "@/components/seo/pair-page";

function Choices({ legend, name, options, value, onChange, disabled }: {
  legend: string; name: string; options: string[]; value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  const id = useId();
  return (
    <fieldset className="mt-4" disabled={disabled}>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-1 flex flex-wrap gap-3">
        {options.map((o) => (
          <label key={o} htmlFor={`${id}-${o}`} className="flex items-center gap-1 text-sm">
            <input type="radio" id={`${id}-${o}`} name={name} value={o} checked={value === o} onChange={() => onChange(o)} />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PracticeView({ questions, initialIndex = 0 }: { questions: PracticeQuestion[]; initialIndex?: number }) {
  const pool = useMemo(() => questions.flatMap((q) => q.enzymes), [questions]);
  const [idx, setIdx] = useState(initialIndex % Math.max(1, questions.length));
  const [grade, setGrade] = useState("");
  const [enzyme, setEnzyme] = useState("");
  const [role, setRole] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState<PracticeScore>({ answered: 0, correct: 0 });
  useEffect(() => setScore(loadScore(typeof window === "undefined" ? undefined : window.localStorage)), []);

  const q = questions[idx];
  if (!q) return <main className="mx-auto max-w-2xl px-4 py-10"><p>No practice cards are available.</p></main>;
  const enzymeOpts = enzymeChoices(q, pool, idx);
  const result = revealed ? scoreAnswer(q, { grade, enzyme, role }) : null;
  const canReveal = grade !== "" && (!enzymeOpts.length || enzyme !== "") && (!q.roleA || role !== "");

  const reveal = () => {
    if (!canReveal || revealed) return;
    const r = scoreAnswer(q, { grade, enzyme, role });
    const next = { answered: score.answered + 1, correct: score.correct + (r.all ? 1 : 0) };
    setScore(next);
    saveScore(typeof window === "undefined" ? undefined : window.localStorage, next);
    setRevealed(true);
  };
  const nextCard = () => {
    setIdx((i) => (i + 1 + Math.floor(Math.random() * Math.max(1, questions.length - 1))) % questions.length);
    setGrade(""); setEnzyme(""); setRole(""); setRevealed(false);
  };
  const resetScore = () => {
    const z = { answered: 0, correct: 0 };
    setScore(z);
    saveScore(typeof window === "undefined" ? undefined : window.localStorage, z);
  };
  const mark = (ok: boolean | null) => (ok === null ? "" : ok ? " ✓ correct" : " ✗ not quite");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-testid="practice">
      <h1 className="text-2xl font-semibold">Practice: drug-pair recall</h1>
      <p className="mt-2 text-sm text-muted">{PRACTICE_INTRO}</p>
      <p className="mt-4 text-sm" aria-live="polite" data-testid="practice-score">
        Score on this device: {score.correct} of {score.answered}{" "}
        <button type="button" className="underline" onClick={resetScore}>Reset score</button>
      </p>
      <p className="mt-1 text-xs text-muted">Your score is kept only in this browser. We don't send or store your score.</p>

      <section aria-labelledby="practice-pair" className="mt-6 rounded border p-4">
        <h2 id="practice-pair" className="text-lg font-medium" data-testid="practice-pair">{q.nameA} + {q.nameB}</h2>
        <form onSubmit={(e) => { e.preventDefault(); reveal(); }}>
          <Choices legend="What grade does FirstPass give this pair?" name="grade" options={GRADE_CHOICES} value={grade} onChange={setGrade} disabled={revealed} />
          {enzymeOpts.length ? (
            <Choices legend="Which enzyme drives it?" name="enzyme" options={enzymeOpts} value={enzyme} onChange={setEnzyme} disabled={revealed} />
          ) : null}
          {q.roleA && q.enzymes[0] ? (
            <Choices legend={`What is ${q.nameA} at ${q.enzymes[0]}?`} name="role" options={ROLE_CHOICES} value={role} onChange={setRole} disabled={revealed} />
          ) : null}
          {!revealed ? (
            <button type="submit" className="mt-4 rounded border px-3 py-1" disabled={!canReveal} aria-disabled={!canReveal}>Reveal answer</button>
          ) : null}
        </form>

        {revealed && result ? (
          <div className="mt-4" aria-live="polite" data-testid="practice-answer">
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
            <p className="mt-2 text-xs"><a className="underline" href={`/pair/${q.slug}`}>Read the full pair page</a></p>
            <button type="button" className="mt-4 rounded border px-3 py-1" onClick={nextCard} autoFocus>Next pair</button>
          </div>
        ) : null}
      </section>
      <PairDisclaimer />
    </main>
  );
}
