import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, Copy, ExternalLink, Plus } from "lucide-react";
import {
  DIRECTORY,
  PARKED,
  PIPE_KEY,
  PREY_LABEL,
  RANGE_LABEL,
  RECIPES,
  STATUS_LABEL,
  filterDirectory,
  googleUrl,
  isoWeek,
  linkedinUrl,
  loadPipe,
  mailDraft,
  mapsUrl,
  savePipe,
  toPipe,
  weekTargets,
  xUrl,
  targetDm,
  type PipeRow,
  type PipeStatus,
  type Prey,
  type Range,
  type Target,
} from "@/lib/billing/hunts";
import {
  PIPE_LIMIT,
  directorySliceLabel,
  pipeExportName,
  pipeStatusCounts,
  pipeToCsv,
  pipeToJson,
  stepStatus,
  storedPipeIsReadable,
  type PipeExportRow,
  type PipeSaveOpts,
} from "@/lib/billing/operator-desk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUSES: PipeStatus[] = ["queued", "sent", "waiting", "keyed", "skip"];

function asExport(rows: PipeRow[]): PipeExportRow[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    prey: row.prey,
    range: row.range,
    city: row.city,
    who: row.who,
    site: row.site,
    hook: row.hook,
    status: row.status,
    note: row.note,
    added: row.added,
  }));
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function HuntDesk() {
  const [copied, setCopied] = useState("");
  const [pipe, setPipe] = useState<PipeRow[]>([]);
  const [bookReady, setBookReady] = useState(false);
  const [unreadable, setUnreadable] = useState(false);
  const [replaceArmed, setReplaceArmed] = useState(false);
  const [notice, setNotice] = useState("");
  const [dropId, setDropId] = useState<string | null>(null);
  const [prey, setPrey] = useState<Prey | "all">("all");
  const [range, setRange] = useState<Range | "all">("whatcom");
  const [custom, setCustom] = useState("");
  const week = useMemo(() => weekTargets(5), []);
  const listed = useMemo(() => filterDirectory(prey, range), [prey, range]);
  const counts = useMemo(() => pipeStatusCounts(pipe, STATUSES), [pipe]);
  const canEdit = bookReady && !unreadable;

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(PIPE_KEY);
    } catch {
      raw = null;
    }
    const blocked = raw != null && raw.trim() !== "" && !storedPipeIsReadable(raw);
    setUnreadable(blocked);
    setPipe(loadPipe());
    setBookReady(true);
  }, []);

  function write(next: PipeRow[], opts?: PipeSaveOpts) {
    if (!bookReady || unreadable) {
      if (unreadable) setNotice("Edits are paused because the saved book could not be read.");
      return;
    }
    const ok = savePipe(next, opts);
    if (!ok) {
      setPipe(loadPipe());
      setNotice("The saved book was left unchanged.");
      return;
    }
    setNotice("");
    setPipe(next.slice(0, PIPE_LIMIT));
  }

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setNotice("Clipboard was blocked. Use Download instead.");
    }
  }

  function addTargets(rows: Target[]) {
    if (!canEdit) return;
    const have = new Set(pipe.map((p) => p.id));
    const extra = rows.filter((t) => !have.has(t.id)).map((t) => toPipe(t));
    if (extra.length === 0) return;
    write([...extra, ...pipe]);
  }

  function setStatus(id: string, status: PipeStatus) {
    write(pipe.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  function setNote(id: string, note: string) {
    write(pipe.map((p) => (p.id === id ? { ...p, note } : p)));
  }

  function remove(id: string) {
    write(
      pipe.filter((p) => p.id !== id),
      { allowEmpty: true },
    );
    setDropId(null);
  }

  function replaceUnreadable() {
    const ok = savePipe([], { allowEmpty: true, replaceUnreadable: true });
    if (!ok) {
      setNotice("Could not replace the saved book.");
      return;
    }
    setUnreadable(false);
    setReplaceArmed(false);
    setPipe([]);
    setNotice("Replaced the unreadable book. It is empty now.");
  }

  function focusStatus(id: string, status: PipeStatus) {
    setStatus(id, status);
    window.requestAnimationFrame(() => {
      document.getElementById(`hunt-status-${id}-${status}`)?.focus();
    });
  }

  function onBookKey(event: KeyboardEvent, row: PipeRow) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;
    if (event.key >= "1" && event.key <= "5") {
      event.preventDefault();
      focusStatus(row.id, STATUSES[Number(event.key) - 1]);
      return;
    }
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp"
    ) {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.getAttribute("role") !== "radio") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    focusStatus(row.id, stepStatus(STATUSES, row.status, delta));
  }

  function addCustom() {
    const name = custom.trim();
    if (!name || !canEdit) return;
    const id = `custom-${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40)}-${Date.now().toString(36)}`;
    write([
      toPipe({
        id,
        name,
        prey: "clinic",
        range: "whatcom",
        city: "",
        who: "",
        site: "",
        hook: "The CYP maps you keep asking pharmacy for — ketamine, MAT, street adulterants.",
      }),
      ...pipe,
    ]);
    setCustom("");
  }

  function exportBook(kind: "csv" | "json") {
    const rows = asExport(pipe);
    const text = kind === "csv" ? pipeToCsv(rows) : pipeToJson(rows);
    const mime = kind === "csv" ? "text/csv;charset=utf-8" : "application/json";
    downloadText(pipeExportName(kind), text, mime);
  }

  const slice = directorySliceLabel(listed.length, DIRECTORY.length, PARKED.length);
  const filterBits = [
    prey === "all" ? "" : PREY_LABEL[prey],
    range === "all" ? "" : RANGE_LABEL[range],
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <p className="sr-only" role="status">
        {copied ? "Copied" : ""}
      </p>
      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Week {isoWeek()}
        </p>
        <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg">
          This week’s hunt is five names.
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Directory is real WA / PNW shops, weighted to Whatcom. Copy the DM, open the site, mark
          sent. Do not add more until these five are sent or skipped.{" "}
          {bookReady ? counts.sent + counts.waiting + counts.keyed : "…"} already moving in your
          book.
        </p>
        <div className="mt-4">
          <Button size="sm" onClick={() => addTargets(week)} disabled={!canEdit}>
            Load the five into the book
          </Button>
        </div>
        <ul className="mt-4 space-y-3">
          {week.map((t) => (
            <TargetRow
              key={t.id}
              t={t}
              copied={copied}
              onCopy={copy}
              onAdd={() => addTargets([t])}
              canBook={canEdit}
            />
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-xl tracking-tight text-fg">Open a hunt</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          These launch Google, Maps, X, and LinkedIn on the live query. Skim the first page, add
          names below.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {RECIPES.map((r) => (
            <li key={r.id} className="rounded-md bg-bg-sunken px-3 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-accent">{r.label}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <HuntLink href={googleUrl(r.google)}>Google</HuntLink>
                <HuntLink href={mapsUrl(r.maps)}>Maps</HuntLink>
                <HuntLink href={xUrl(r.x)}>X</HuntLink>
                <HuntLink href={linkedinUrl(r.linkedin)}>LinkedIn</HuntLink>
                <button
                  type="button"
                  className="h-9 rounded-sm px-2 text-xs font-medium text-muted hover:text-fg"
                  onClick={() => void copy(r.id, r.google)}
                >
                  {copied === r.id ? "Copied" : "Copy query"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl tracking-tight text-fg">
              Directory · {DIRECTORY.length}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Researched public shops. Add the ones you will actually DM.
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(["all", "clinic", "mat", "pharmacy", "school", "harm", "assoc"] as const).map(
              (id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPrey(id)}
                  className={
                    prey === id
                      ? "h-9 rounded-full bg-ink px-3 text-xs font-medium text-bg"
                      : "h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
                  }
                >
                  {id === "all" ? "All" : PREY_LABEL[id]}
                </button>
              ),
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {(["all", "whatcom", "puget", "eastwa", "pnw", "us"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              className={
                range === id
                  ? "h-9 rounded-full bg-ink px-3 text-xs font-medium text-bg"
                  : "h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
              }
            >
              {id === "all" ? "Any range" : RANGE_LABEL[id]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          {slice}
          {filterBits.length ? ` · ${filterBits.join(" · ")}` : ""}
        </p>
        {listed.length === 0 ? (
          <p className="mt-4 rounded-md bg-bg-sunken px-3 py-3 text-sm text-muted">
            No shops in this slice. Choose All and Any range to see the full directory.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {listed.map((t) => (
              <TargetRow
                key={t.id}
                t={t}
                copied={copied}
                onCopy={copy}
                onAdd={() => addTargets([t])}
                canBook={canEdit}
                compact
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-xl tracking-tight text-fg">The book</h2>
        <p className="mt-1 text-sm text-muted">
          {bookReady
            ? `${STATUSES.map((s) => `${counts[s] ?? 0} ${STATUS_LABEL[s]}`).join(" · ")}. Status stays on this browser.`
            : "Opening the book saved on this browser…"}
        </p>
        <p className="mt-1 text-xs text-muted">
          Arrow keys move status. 1 {STATUS_LABEL.queued}, 2 {STATUS_LABEL.sent}, 3{" "}
          {STATUS_LABEL.waiting}, 4 {STATUS_LABEL.keyed}, 5 {STATUS_LABEL.skip}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!bookReady || pipe.length === 0}
            onClick={() => exportBook("csv")}
          >
            Download CSV
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!bookReady || pipe.length === 0}
            onClick={() => exportBook("json")}
          >
            Download JSON
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!bookReady || pipe.length === 0}
            onClick={() => void copy("pipe-json", pipeToJson(asExport(pipe)))}
          >
            {copied === "pipe-json" ? "Copied" : "Copy JSON"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Backup of this browser’s book. Downloading does not change it.
        </p>
        {pipe.length >= PIPE_LIMIT ? (
          <p className="mt-2 text-sm text-warn">
            The book keeps {PIPE_LIMIT} names. Another add drops the last name in the list.
          </p>
        ) : null}
        {unreadable ? (
          <div className="mt-4 rounded-md bg-bg-sunken px-3 py-3">
            <p className="text-sm text-fg">
              The saved book could not be read, so edits are paused and it was not replaced.
            </p>
            {replaceArmed ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="danger" onClick={replaceUnreadable}>
                  Replace with an empty book
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReplaceArmed(false)}>
                  Keep it
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => setReplaceArmed(true)}
              >
                Replace unreadable book…
              </Button>
            )}
          </div>
        ) : null}
        {notice ? (
          <p className="mt-3 text-sm text-warn" role="status">
            {notice}
          </p>
        ) : null}
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addCustom();
          }}
        >
          <Input
            value={custom}
            placeholder="Name you found — clinic, NP, faculty"
            onChange={(e) => setCustom(e.target.value)}
            aria-label="Add a name to the book"
            disabled={!canEdit}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={!canEdit || !custom.trim()}
            className="shrink-0"
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </form>
        {!bookReady ? null : pipe.length === 0 && !unreadable ? (
          <div className="mt-4 rounded-md bg-bg-sunken px-3 py-4">
            <p className="text-sm font-medium text-fg">Nothing in the book yet.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Load this week’s five, or add a name you just found. The book stays in this browser —
              download a copy before you clear site data.
            </p>
            <Button size="sm" className="mt-3" onClick={() => addTargets(week)} disabled={!canEdit}>
              Load the five into the book
            </Button>
          </div>
        ) : pipe.length === 0 ? null : (
          <ul className="mt-4 space-y-3">
            {pipe.map((row) => (
              <li
                key={row.id}
                className="rounded-md bg-bg-sunken px-3 py-3"
                onKeyDown={(event) => onBookKey(event, row)}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-fg">{row.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {PREY_LABEL[row.prey]} · {row.city || RANGE_LABEL[row.range]}
                      {row.who ? ` · ${row.who}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void copy(`p-${row.id}`, targetDm(row))}
                    >
                      {copied === `p-${row.id}` ? "Copied" : "DM"}
                    </Button>
                    {row.site ? <HuntLink href={row.site}>Site</HuntLink> : null}
                    <a
                      href={mailDraft(row)}
                      className="inline-flex h-9 items-center rounded-sm px-2 text-xs font-medium text-muted hover:text-fg"
                    >
                      Mail
                    </a>
                    {dropId === row.id ? (
                      <>
                        <button
                          type="button"
                          className="h-9 px-2 text-xs text-danger"
                          onClick={() => remove(row.id)}
                        >
                          Confirm drop
                        </button>
                        <button
                          type="button"
                          className="h-9 px-2 text-xs text-muted hover:text-fg"
                          onClick={() => setDropId(null)}
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="h-9 px-2 text-xs text-muted hover:text-danger"
                        onClick={() => setDropId(row.id)}
                        disabled={!canEdit}
                      >
                        Drop
                      </button>
                    )}
                  </div>
                </div>
                <div
                  className="mt-2 flex flex-wrap gap-1"
                  role="radiogroup"
                  aria-label={`Status for ${row.name}`}
                >
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      id={`hunt-status-${row.id}-${s}`}
                      type="button"
                      role="radio"
                      aria-checked={row.status === s}
                      tabIndex={row.status === s ? 0 : -1}
                      disabled={!canEdit}
                      onClick={() => setStatus(row.id, s)}
                      className={
                        row.status === s
                          ? "h-9 rounded-full bg-ink px-2.5 text-[11px] font-medium text-bg"
                          : "h-9 rounded-full bg-surface px-2.5 text-[11px] font-medium text-muted hover:text-fg"
                      }
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
                <Input
                  className="mt-2 h-9"
                  value={row.note}
                  placeholder="Note — who you wrote, when they replied"
                  onChange={(e) => setNote(row.id, e.target.value)}
                  aria-label={`Note for ${row.name}`}
                  disabled={!canEdit}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HuntLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-9 items-center gap-1 rounded-sm bg-surface px-2 text-xs font-medium text-fg hover:bg-surface-2"
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}

function TargetRow({
  t,
  copied,
  onCopy,
  onAdd,
  canBook,
  compact,
}: {
  t: Target;
  copied: string;
  onCopy: (label: string, text: string) => void;
  onAdd: () => void;
  canBook: boolean;
  compact?: boolean;
}) {
  return (
    <li
      className={
        compact
          ? "border-t border-border pt-3 first:border-0 first:pt-0"
          : "rounded-md bg-bg-sunken px-3 py-3"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">{t.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {PREY_LABEL[t.prey]} · {t.city} · {t.who}
          </p>
          {compact ? null : <p className="mt-2 text-xs leading-relaxed text-muted">{t.hook}</p>}
        </div>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="secondary" onClick={() => void onCopy(t.id, targetDm(t))}>
            {copied === t.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied === t.id ? "Copied" : "DM"}
          </Button>
          {t.site ? <HuntLink href={t.site}>Site</HuntLink> : null}
          <Button size="sm" variant="ghost" onClick={onAdd} disabled={!canBook}>
            Book
          </Button>
        </div>
      </div>
    </li>
  );
}
