import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { analyze } from "@/lib/drugs/engine";
import { parseDoses } from "@/lib/drugs/dosing";
import {
  LAB_ASSIGNMENTS,
  buildLabUrl,
  labNeedsPro,
  labReceiptCsv,
  readLabBook,
  sampleForLab,
  writeLabAnswer,
  type LabAssignment,
  type LabReceipt,
} from "@/lib/drugs/lab";
import { buildLabPermalink } from "@/lib/drugs/permalinks";
import {
  STUDY_LANES,
  STUDY_PILES,
  cardsFor,
  pileOf,
  type StudyCard,
  type StudyLane,
  type StudyPile,
} from "@/lib/drugs/study";
import { useDesk, usePlan } from "@/lib/drugs/store";
import { LANE_PLATE } from "@/lib/drugs/visuals";
import { NOT_CLEARED, PI_FOOTER, SOFTWARE } from "@/lib/regulatory";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plate } from "./plate";

function labIdFromSearch(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("lab");
}

/** Everyday lane labels — ids/order stay in STUDY_LANES. */
const LANE_PLAIN: Record<StudyLane, string> = {
  drill: "Teaching rounds",
  boards: "Classic pairs",
  cyp: "Enzyme map",
  desk: "This desk",
};

/** Everyday pile labels — ids/order stay in STUDY_PILES. */
const PILE_PLAIN: Record<StudyPile, string> = {
  all: "All",
  open: "Not yet",
  miss: "Review",
};

const HOW_STEPS = [
  {
    n: "1",
    title: "Pick a lane",
    body: "Teaching rounds, classic pairs, the enzyme map, or whatever is on this desk.",
  },
  {
    n: "2",
    title: "Say it first",
    body: "Name the mechanism out loud, then reveal or pick an answer.",
  },
  {
    n: "3",
    title: "Mark and drill",
    body: "Got it or Review — then filter to Review only and run those again.",
  },
] as const;

export function StudyPage() {
  const selected = useDesk((s) => s.selected);
  const doses = useDesk((s) => s.doses);
  const phenotypes = useDesk((s) => s.phenotypes);
  const smoking = useDesk((s) => s.smoking);
  const ketamineRoute = useDesk((s) => s.ketamineRoute);
  const cannabisRoute = useDesk((s) => s.cannabisRoute);
  const alcohol = useDesk((s) => s.alcohol);
  const age = useDesk((s) => s.age);
  const kidney = useDesk((s) => s.kidney);
  const preg = useDesk((s) => s.preg);
  const marks = useDesk((s) => s.studyMarks);
  const markStudy = useDesk((s) => s.markStudy);
  const clearStudy = useDesk((s) => s.clearStudy);
  const load = useDesk((s) => s.load);
  const setView = useDesk((s) => s.setView);
  const openCheckout = useDesk((s) => s.openCheckout);
  const plan = usePlan();
  const [lane, setLane] = useState<StudyLane>(selected.length ? "desk" : "drill");
  const [pile, setPile] = useState<StudyPile>("all");
  const [epoch, setEpoch] = useState(0);
  const resetMarks = () => {
    clearStudy();
    setEpoch((n) => n + 1);
  };
  const [labId, setLabId] = useState<string | null>(() => labIdFromSearch() ?? LAB_ASSIGNMENTS[0]?.id ?? null);
  const [labText, setLabText] = useState("");
  const [labSavedAt, setLabSavedAt] = useState<string | null>(null);

  const assignment = useMemo(
    () => LAB_ASSIGNMENTS.find((a) => a.id === labId) ?? LAB_ASSIGNMENTS[0] ?? null,
    [labId],
  );

  useEffect(() => {
    if (!assignment) return;
    const book = readLabBook();
    const row = book[assignment.id];
    setLabText(row?.text ?? "");
    setLabSavedAt(row?.updatedAt ?? null);
  }, [assignment]);

  const findings = useMemo(
    () =>
      analyze(
        selected,
        { phenotypes, smoking, ketamineRoute, cannabisRoute, alcohol, age, kidney, preg },
        parseDoses(doses),
      ).findings,
    [selected, phenotypes, smoking, ketamineRoute, cannabisRoute, alcohol, age, kidney, preg, doses],
  );
  const leadHeadline = findings[0]?.headline ?? null;
  const source = useMemo(() => cardsFor(lane, selected, findings), [lane, selected, findings]);
  const key = `${lane}|${pile}|${epoch}|${source.map((c) => c.id).join(",")}`;
  const [frozen, setFrozen] = useState({ key: "", deck: [] as StudyCard[] });
  if (frozen.key !== key) {
    setFrozen({ key, deck: pileOf(source, pile, marks) });
  }
  const deck = frozen.key === key ? frozen.deck : pileOf(source, pile, marks);

  const [cursor, setCursor] = useState({ key: "", index: 0, revealed: false, picked: null as string | null });
  if (cursor.key !== key) {
    setCursor({ key, index: 0, revealed: false, picked: null });
  }
  const index = cursor.key === key ? cursor.index : 0;
  const revealed = cursor.key === key ? cursor.revealed : false;
  const picked = cursor.key === key ? cursor.picked : null;

  const card = deck[Math.min(index, Math.max(deck.length - 1, 0))];
  const known = source.filter((c) => marks[c.id] === "got").length;
  const missed = source.filter((c) => marks[c.id] === "miss").length;
  const unseen = source.length - known - missed;
  const knownPct = source.length ? Math.round((known / source.length) * 100) : 0;
  const missPct = source.length ? Math.round((missed / source.length) * 100) : 0;
  const firstRun = source.length > 0 && known + missed === 0;

  function jump(next: number) {
    setCursor({ key, index: next, revealed: false, picked: null });
  }

  function selectAssignment(next: LabAssignment) {
    const needsHost = labNeedsPro(next);
    if (needsHost && plan === "free") {
      openCheckout(
        "lab",
        "That lab assignment uses host factors (phenotype, smoke, or similar). Founding opens them.",
        "life",
      );
      return;
    }
    const sample = sampleForLab(next);
    if (!sample) return;
    const ok = load(sample.drugIds, {
      phenotypes: sample.phenotypes,
      smoking: sample.smoking,
      ketamineRoute: sample.ketamineRoute,
      cannabisRoute: sample.cannabisRoute,
      alcohol: sample.alcohol,
      doses: sample.doses,
    });
    if (!ok && needsHost) return;
    setLabId(next.id);
    setLane("desk");
    setView("study");
    const url = new URL(window.location.href);
    url.searchParams.set("lab", next.id);
    url.searchParams.delete("case");
    url.searchParams.delete("sample");
    url.searchParams.delete("pack");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function persistLabText(value: string) {
    setLabText(value);
    if (!assignment) return;
    const saved = writeLabAnswer(assignment.id, value);
    setLabSavedAt(saved.updatedAt);
  }

  function buildReceipt(): LabReceipt | null {
    if (!assignment) return null;
    const sample = sampleForLab(assignment);
    const drugs = (sample?.drugIds ?? selected).map((id) => DRUG_BY_ID[id]?.name ?? id);
    return {
      assignmentId: assignment.id,
      title: assignment.title,
      sampleId: assignment.sampleId,
      drugs,
      leadHeadline,
      studentText: labText.trim(),
      ts: new Date().toISOString(),
      softwareVersion: SOFTWARE.version,
      disclaimer: `${SOFTWARE.name} ${SOFTWARE.version} lab receipt. ${NOT_CLEARED} Educational only — not a dose, not a chart note, not a prescription. ${PI_FOOTER}`,
    };
  }

  function exportReceipt() {
    // Match desk JSON/CSV: founding / lab license (plan === "lab"). Pro can upgrade.
    if (plan !== "lab") {
      openCheckout("lab", "Lab-book receipt export is a founding / lab surface. $79 once.", "life");
      return;
    }
    const receipt = buildReceipt();
    if (!receipt) return;
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `firstpass-lab-${receipt.assignmentId}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const csvBlob = new Blob([labReceiptCsv(receipt)], { type: "text/csv" });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvA = document.createElement("a");
    csvA.href = csvUrl;
    csvA.download = `firstpass-lab-${receipt.assignmentId}.csv`;
    csvA.click();
    URL.revokeObjectURL(csvUrl);
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
          <Plate src={LANE_PLATE.clinic} alt="" className="h-36 w-full min-h-36 sm:h-full" />
          <div className="px-5 py-5 sm:px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Study coach</p>
            <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg">
              Practice the why before you peek.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Short flashcards for pharmacy and medical trainees. Say the enzyme story out loud, then reveal.
              Mark Got it or Review, and drill only the ones you missed. Not an exam key, not dosing advice,
              not a prescription — the Prescribing Information still wins.
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-muted">
              {known} got it · {missed} review · {unseen} not yet
              {plan === "free" ? " · five-drug desks stay free" : ""}
            </p>
            <div
              className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-bg-sunken"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={knownPct}
              aria-label={`${knownPct}% marked got it, ${missPct}% marked review`}
            >
              <div className="h-full bg-ok" style={{ width: `${knownPct}%` }} />
              <div className="h-full bg-warn" style={{ width: `${missPct}%` }} />
            </div>
          </div>
        </div>
      </section>

      {assignment ? (
        <section className="rounded-xl bg-surface px-5 py-5 shadow-[var(--shadow-border)] sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Lab book</p>
              <h3 className="mt-2 font-serif text-xl tracking-tight text-fg">{assignment.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{assignment.prompt}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {labNeedsPro(assignment) ? (
                <Badge tone="warn">Pro host</Badge>
              ) : (
                <Badge tone="ok">Free</Badge>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(buildLabPermalink(assignment.id));
                }}
              >
                Copy ?lab=
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1">
            {LAB_ASSIGNMENTS.map((a) => {
              const locked = labNeedsPro(a) && plan === "free";
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => selectAssignment(a)}
                  className={cn(
                    "h-10 rounded-full px-3 text-xs font-medium",
                    labId === a.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                  )}
                  title={locked ? "Host factors — founding / Pro" : a.title}
                >
                  {a.title}
                  {locked ? " · Pro" : ""}
                </button>
              );
            })}
          </div>

          <label className="mt-4 block text-xs font-medium text-muted" htmlFor="lab-answer">
            Your three-sentence answer (saved on this browser)
          </label>
          <textarea
            id="lab-answer"
            value={labText}
            rows={4}
            placeholder="Perpetrator · victim · direction of effect. No milligram."
            onChange={(e) => persistLabText(e.target.value)}
            className={cn(
              "mt-1.5 flex w-full rounded-md bg-bg-sunken px-3 py-2.5 text-sm text-fg shadow-[var(--shadow-border)]",
              "placeholder:text-subtle",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            )}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={exportReceipt}>
              <Download className="size-3.5" />
              {plan === "lab" ? "Export receipt" : "Export receipt · Lab"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const sample = sampleForLab(assignment);
                if (sample) {
                  load(sample.drugIds, {
                    phenotypes: sample.phenotypes,
                    smoking: sample.smoking,
                    ketamineRoute: sample.ketamineRoute,
                    cannabisRoute: sample.cannabisRoute,
                    alcohol: sample.alcohol,
                    doses: sample.doses,
                  });
                  setLane("desk");
                  setView("study");
                }
              }}
            >
              Load on desk
            </Button>
            <p className="font-mono text-[11px] text-muted">
              {labSavedAt ? `Saved ${new Date(labSavedAt).toLocaleString()}` : "Not saved yet"}
              {" · "}
              <span className="font-mono">{buildLabUrl(assignment.id).includes("lab=") ? `?lab=${assignment.id}` : assignment.id}</span>
            </p>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-subtle">
            Receipt includes assignment id, title, sample, drugs, lead headline if the desk has one, your
            text, timestamp, and software version. {NOT_CLEARED} Educational only — not PHI, not a chart
            note, not a dose.
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-1">
        {STUDY_LANES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setLane(s.id)}
            aria-pressed={lane === s.id}
            className={cn(
              "h-10 rounded-full px-3 text-xs font-medium",
              lane === s.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            {LANE_PLAIN[s.id]}
          </button>
        ))}
        <button
          type="button"
          onClick={resetMarks}
          className="h-10 rounded-full px-3 text-xs font-medium text-muted hover:text-fg"
        >
          Reset marks
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Study piles">
        {STUDY_PILES.map((s) => {
          const n = s.id === "all" ? source.length : s.id === "open" ? unseen : missed;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setPile(s.id)}
              aria-pressed={pile === s.id}
              className={cn(
                "h-10 rounded-full px-3 text-xs font-medium",
                pile === s.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {PILE_PLAIN[s.id]}{" "}
              <span className="font-mono tabular-nums opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      {firstRun && card ? (
        <div
          role="status"
          className="rounded-xl border border-accent/20 bg-accent-soft/40 px-5 py-4 shadow-[var(--shadow-border)] sm:px-6"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">First pass</p>
          <p className="mt-1 text-sm font-medium text-fg">No marks yet — that is fine.</p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
            Work one card, mark Got it or Review, then filter to Review when you want a tighter drill. You can
            also jump to the desk, library, or rounds anytime.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("desk")}
              className="h-9 rounded-full bg-ink px-3 text-xs font-medium text-bg"
            >
              Open desk
            </button>
            <button
              type="button"
              onClick={() => setView("library")}
              className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
            >
              Browse library
            </button>
            <button
              type="button"
              onClick={() => setView("rounds")}
              className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
            >
              Open rounds
            </button>
          </div>
        </div>
      ) : null}

      {!card ? (
        <p className="rounded-xl bg-surface px-5 py-8 text-sm text-muted shadow-[var(--shadow-border)]">
          {pile === "miss"
            ? "Nothing missed in this lane. Mark a miss, then come back."
            : pile === "open"
              ? "Nothing unseen here. Switch to All, or reset marks to start over."
              : lane === "desk"
                ? "Nothing on the desk yet. Load a lab assignment, a pair, or switch to Rounds, Named pairs, or CYP map."
                : "No cards in this lane."}
        </p>
      ) : (
        <StudyCardView
          card={card}
          n={Math.min(index, deck.length - 1) + 1}
          total={deck.length}
          revealed={revealed || Boolean(picked)}
          picked={picked}
          mark={marks[card.id]}
          onReveal={() => setCursor({ key, index, revealed: true, picked })}
          onPick={(id) => {
            setCursor({ key, index, revealed: true, picked: id });
            if (card.correct) markStudy(card.id, id === card.correct ? "got" : "miss");
          }}
          onMark={(m) => markStudy(card.id, m)}
          onPrev={() => jump(Math.max(0, index - 1))}
          onNext={() => jump(Math.min(deck.length - 1, index + 1))}
          onLoad={() => {
            if (card.drugIds.length) load(card.drugIds);
          }}
        />
      )}
    </div>
  );
}

function StudyEmptyCoach({
  lane,
  pile,
  selectedCount,
  onLane,
  onPile,
  onReset,
  onView,
}: {
  lane: StudyLane;
  pile: StudyPile;
  selectedCount: number;
  onLane: (id: StudyLane) => void;
  onPile: (id: StudyPile) => void;
  onReset: () => void;
  onView: (view: "desk" | "library" | "rounds") => void;
}) {
  const missEmpty = pile === "miss";
  const openEmpty = pile === "open";
  const deskEmpty = lane === "desk" && pile === "all";

  const headline = missEmpty
    ? "Nothing in Review for this lane"
    : openEmpty
      ? "Nothing left unmarked here"
      : deskEmpty
        ? selectedCount
          ? "No study cards for this desk yet"
          : "This desk lane needs a pair first"
        : "No cards in this lane";

  const body = missEmpty
    ? "Mark a miss on a card, then come back to drill only those. Or switch to All to keep going."
    : openEmpty
      ? "You have seen everything in this pile. Switch to All, open Review, or reset marks for a fresh pass."
      : deskEmpty
        ? selectedCount
          ? "The items on the desk did not yield a flashcard here. Try Teaching rounds or Classic pairs, or open the desk to add a teaching partner."
          : "Load a pair on the desk, or switch to Teaching rounds / Classic pairs to practice without a tray."
        : "Try another lane, or open rounds and the library for a different teaching path.";

  return (
    <div role="status" className="rounded-xl bg-surface px-5 py-8 shadow-[var(--shadow-border)] sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Study coach</p>
      <p className="mt-2 text-sm font-medium text-fg">{headline}</p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {missEmpty || openEmpty ? (
          <>
            <button
              type="button"
              onClick={() => onPile("all")}
              className="h-9 rounded-full bg-ink px-3 text-xs font-medium text-bg"
            >
              Show all
            </button>
            {missEmpty ? null : (
              <button
                type="button"
                onClick={() => onPile("miss")}
                className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
              >
                Open Review
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
            >
              Reset marks
            </button>
          </>
        ) : null}
        {deskEmpty || (!missEmpty && !openEmpty) ? (
          <>
            <button
              type="button"
              onClick={() => onLane("drill")}
              className="h-9 rounded-full bg-ink px-3 text-xs font-medium text-bg"
            >
              Try teaching rounds
            </button>
            <button
              type="button"
              onClick={() => onLane("boards")}
              className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
            >
              Classic pairs
            </button>
            <button
              type="button"
              onClick={() => onLane("cyp")}
              className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
            >
              Enzyme map
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => onView("desk")}
          className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
        >
          Open desk
        </button>
        <button
          type="button"
          onClick={() => onView("library")}
          className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
        >
          Browse library
        </button>
        <button
          type="button"
          onClick={() => onView("rounds")}
          className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
        >
          Open rounds
        </button>
      </div>
    </div>
  );
}

function StudyCardView({
  card,
  n,
  total,
  revealed,
  picked,
  mark,
  onReveal,
  onPick,
  onMark,
  onPrev,
  onNext,
  onLoad,
}: {
  card: StudyCard;
  n: number;
  total: number;
  revealed: boolean;
  picked: string | null;
  mark?: "got" | "miss";
  onReveal: () => void;
  onPick: (id: string) => void;
  onMark: (m: "got" | "miss") => void;
  onPrev: () => void;
  onNext: () => void;
  onLoad: () => void;
}) {
  const correct = card.choices?.find((c) => c.id === card.correct);
  return (
    <article className="rounded-xl bg-surface px-5 py-5 shadow-[var(--shadow-border)] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">{card.kicker}</p>
        <p className="font-mono text-[11px] text-muted">
          {n} / {total}
          {mark ? ` · ${mark === "got" ? "got it" : "review"}` : ""}
        </p>
      </div>
      <h3 className="mt-2 font-serif text-2xl tracking-tight text-fg">{card.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{card.prompt}</p>
      <p className="mt-3 text-sm font-medium leading-relaxed text-fg">{card.ask}</p>

      {card.choices ? (
        <ul className="mt-4 space-y-2">
          {card.choices.map((c) => {
            const on = picked === c.id;
            const isCorrect = revealed && c.id === card.correct;
            const isWrong = revealed && on && c.id !== card.correct;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={revealed}
                  onClick={() => onPick(c.id)}
                  className={cn(
                    "flex min-h-11 w-full items-start rounded-md px-3 py-2.5 text-left text-sm leading-relaxed",
                    isCorrect && "bg-ok-soft text-fg",
                    isWrong && "bg-danger-soft text-fg",
                    !isCorrect && !isWrong && "bg-bg-sunken text-fg hover:bg-surface-2",
                  )}
                >
                  {c.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {revealed ? (
        <div className="mt-4 rounded-md bg-bg-sunken px-3 py-3">
          {card.choices && correct ? (
            <p className="text-sm font-medium text-fg">
              {picked === card.correct ? "That role is on the map." : `Mapped answer: ${correct.label}`}
            </p>
          ) : null}
          <p className={cn("text-sm leading-relaxed text-fg", card.choices && correct && "mt-2")}>{card.answer}</p>
          {card.drugIds.length ? (
            <p className="mt-2 text-[11px] leading-relaxed text-subtle">
              {card.drugIds.map((id) => DRUG_BY_ID[id]?.name ?? id).join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {!card.choices && !revealed ? (
          <Button size="sm" onClick={onReveal}>
            Reveal
          </Button>
        ) : null}
        {revealed && !card.choices ? (
          <>
            <Button size="sm" variant={mark === "got" ? "default" : "secondary"} onClick={() => onMark("got")}>
              Got it
            </Button>
            <Button size="sm" variant={mark === "miss" ? "danger" : "secondary"} onClick={() => onMark("miss")}>
              Review
            </Button>
          </>
        ) : null}
        {card.drugIds.length ? (
          <Button size="sm" variant="secondary" onClick={onLoad}>
            Put on desk
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onPrev} disabled={n <= 1}>
          Back
        </Button>
        <Button size="sm" variant="ghost" onClick={onNext} disabled={n >= total}>
          Next
        </Button>
        {mark ? <Badge tone={mark === "got" ? "ok" : "warn"}>{mark === "got" ? "Got it" : "Review"}</Badge> : null}
      </div>
    </article>
  );
}
