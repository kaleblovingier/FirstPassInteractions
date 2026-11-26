import { useId, useMemo, useRef, useState } from "react";
import { ClipboardList } from "lucide-react";
import { maxDrugs } from "@/lib/billing/plans";
import { combinationParts } from "@/lib/drugs/combos";
import { MED_LIST_MAX_CHARS, MED_LIST_MAX_ITEMS, matchMedList, medListLabel, type MedListRow } from "@/lib/drugs/med-list";
import { useDesk, usePlan } from "@/lib/drugs/store";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const BTN = `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs text-fg hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-45 ${FOCUS}`;
const BTN_PRIMARY = `inline-flex min-h-9 items-center justify-center rounded-md border border-ink bg-ink px-3 text-xs text-bg hover:bg-ink/90 disabled:pointer-events-none disabled:opacity-45 ${FOCUS}`;

type Choice = Record<number, string[]>;

/** The ids a row adds once chosen, past ids already on the desk. */
const fresh = (ids: readonly string[], onDesk: readonly string[]) => ids.filter((id) => !onDesk.includes(id));

/** Tick every exact match that still fits, in list order; partial and street-name matches wait for a pick. */
function defaultChoice(rows: MedListRow[], onDesk: readonly string[], room: number): Choice {
  const choice: Choice = {};
  const taken = new Set<string>();
  rows.forEach((row, i) => {
    if (row.status !== "found") return;
    const add = fresh(row.ids, onDesk).filter((id) => !taken.has(id));
    if (add.length === 0 || taken.size + add.length > room) return;
    add.forEach((id) => taken.add(id));
    choice[i] = row.ids;
  });
  return choice;
}

/**
 * Paste a medication list and add what it names. The text stays in this component: it is never
 * stored, sent or counted, and doses in it are dropped before anything is shown back.
 */
export function MedListPaste() {
  const selected = useDesk((s) => s.selected);
  const add = useDesk((s) => s.add);
  const cap = maxDrugs(usePlan());
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [read, setRead] = useState<{ rows: MedListRow[]; more: number } | null>(null);
  const [choice, setChoice] = useState<Choice>({});
  const [status, setStatus] = useState("");
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();
  const panelId = `${uid}-panel`;
  const textId = `${uid}-text`;

  const room = Math.max(cap - selected.length, 0);
  const chosen = useMemo(() => [...new Set(Object.values(choice).flat())].filter((id) => !selected.includes(id)), [choice, selected]);
  const over = chosen.length - room;

  function readList() {
    const next = matchMedList(text);
    setRead(next);
    setChoice(defaultChoice(next.rows, selected, room));
    const count = (s: MedListRow["status"]) => next.rows.filter((r) => r.status === s).length;
    setStatus(
      next.rows.length === 0
        ? "No medicine names found in that text."
        : `Read ${next.rows.length}: ${count("found")} found, ${count("check")} to check, ${count("missing")} not found.`,
    );
    requestAnimationFrame(() => resultsRef.current?.focus());
  }

  function reset() {
    setText("");
    setRead(null);
    setChoice({});
  }

  function addChosen() {
    const added = chosen.filter((id) => add(id));
    reset();
    setStatus(added.length ? `Added ${added.length} to the desk: ${added.map(medListLabel).join(", ")}.` : "Nothing was added.");
  }

  const set = (i: number, ids: string[]) => setChoice((c) => ({ ...c, [i]: ids }));

  if (!open) {
    return (
      <div>
        <button type="button" className={BTN} aria-expanded="false" aria-controls={panelId} onClick={() => setOpen(true)}>
          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
          Paste a medication list
        </button>
        {status ? (
          <p role="status" className="mt-2 text-xs text-muted">
            {status}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section
      id={panelId}
      aria-labelledby={`${uid}-h`}
      className="space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)] sm:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Paste a list</p>
          <h2 id={`${uid}-h`} className="mt-1 font-serif text-xl tracking-tight text-fg">
            Read a medication list
          </h2>
          <p className="mt-1 max-w-prose text-xs text-muted">
            From a chart, a discharge summary or a phone note: one medicine per line, or separated by commas. Doses,
            routes and schedules are ignored. The text stays on this screen: nothing is sent or saved. Leave out names,
            dates of birth and record numbers.
          </p>
        </div>
        <button
          type="button"
          className={BTN}
          aria-expanded="true"
          aria-controls={panelId}
          onClick={() => {
            reset();
            setStatus("");
            setOpen(false);
          }}
        >
          Close
        </button>
      </div>

      <label htmlFor={textId} className="sr-only">
        Medication list
      </label>
      <textarea
        id={textId}
        value={text}
        maxLength={MED_LIST_MAX_CHARS}
        rows={6}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setText(e.target.value)}
        placeholder={"Lexapro\nmetoprolol succinate ER\nTylenol PM"}
        className={`block w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-subtle ${FOCUS}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BTN_PRIMARY} disabled={!text.trim()} onClick={readList}>
          Read list
        </button>
        <button type="button" className={BTN} disabled={!text && !read} onClick={reset}>
          Clear
        </button>
      </div>

      <p role="status" aria-live="polite" className="text-xs text-muted">
        {status}
      </p>

      {read && read.rows.length > 0 ? (
        <div className="space-y-3">
          <h3 ref={resultsRef} tabIndex={-1} className={`text-sm font-medium text-fg ${FOCUS}`}>
            What the list names
          </h3>
          {read.more > 0 ? (
            <p className="text-xs text-muted">
              Read the first {MED_LIST_MAX_ITEMS} items; {read.more} more were not read.
            </p>
          ) : null}
          <ul className="space-y-2">
            {read.rows.map((row, i) => (
              <li key={`${i}-${row.name}`} className="rounded-lg border border-border/70 p-3 text-sm">
                <Row row={row} index={i} uid={uid} choice={choice[i] ?? []} onDesk={selected} set={set} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            {over > 0
              ? `The desk has room for ${room} more (it holds ${cap}). Untick ${over} to add the rest.`
              : `${chosen.length} chosen · room for ${room} more on the desk. No match does not mean an interaction is absent.`}
          </p>
          <button type="button" className={BTN_PRIMARY} disabled={chosen.length === 0 || over > 0} onClick={addChosen}>
            Add {chosen.length} to the desk
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Row({
  row,
  index,
  uid,
  choice,
  onDesk,
  set,
}: {
  row: MedListRow;
  index: number;
  uid: string;
  choice: string[];
  onDesk: readonly string[];
  set: (i: number, ids: string[]) => void;
}) {
  const typed = <span className="break-words text-muted">“{row.name}”</span>;

  if (row.status === "found") {
    const label = row.combo ? `${row.combo.name} (${combinationParts(row.ids)})` : medListLabel(row.ids[0]!);
    if (fresh(row.ids, onDesk).length === 0) {
      return (
        <p className="break-words">
          {typed} → <span className="text-fg">{label}</span> <span className="text-xs text-subtle">· already on the desk</span>
        </p>
      );
    }
    const id = `${uid}-r${index}`;
    return (
      <div className="flex items-start gap-2">
        <input
          id={id}
          type="checkbox"
          checked={choice.length > 0}
          onChange={(e) => set(index, e.target.checked ? row.ids : [])}
          className={`mt-1 h-4 w-4 shrink-0 accent-ink ${FOCUS}`}
        />
        <label htmlFor={id} className="min-w-0 break-words">
          {typed} → <span className="text-fg">{label}</span>
        </label>
      </div>
    );
  }

  if (row.status === "check") {
    const name = `${uid}-c${index}`;
    return (
      <fieldset className="min-w-0">
        <legend className="break-words">
          {typed} <span className="text-xs text-subtle">· not an exact name. Pick one, or leave it.</span>
        </legend>
        {row.street ? (
          <p className="mt-1 text-xs text-muted">
            “{row.street}” is a street name for {medListLabel(row.options[0]!.id)}. In a medication list a short name
            can mean something else (K is often potassium). Pick it only if that is what the list means.
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {[...row.options.map((d) => ({ value: d.id, label: d.name })), { value: "", label: "None of these" }].map((o) => (
            <label key={o.value || "none"} className="inline-flex items-center gap-1.5 text-xs text-fg">
              <input
                type="radio"
                name={name}
                checked={o.value ? choice[0] === o.value : choice.length === 0}
                onChange={() => set(index, o.value ? [o.value] : [])}
                className={`h-4 w-4 accent-ink ${FOCUS}`}
              />
              {o.label}
              {o.value && onDesk.includes(o.value) ? <span className="text-subtle">(on the desk)</span> : null}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <div className="min-w-0">
      <p className="break-words">
        {typed} <span className="text-xs text-subtle">· not on this shelf</span>
      </p>
      {row.suggestions.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Did you mean</span>
          {row.suggestions.map((s) => {
            const ids = s.combo ? [...s.combo.ids] : [s.drug.id];
            const on = choice.length > 0 && choice.join() === ids.join();
            return (
              <button
                key={s.label}
                type="button"
                aria-pressed={on}
                onClick={() => set(index, on ? [] : ids)}
                className={`${BTN} min-h-8 ${on ? "border-ink" : ""}`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
