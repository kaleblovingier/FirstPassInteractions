import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink, Plus } from "lucide-react";
import {
  DIRECTORY,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUSES: PipeStatus[] = ["queued", "sent", "waiting", "keyed", "skip"];

export function HuntDesk() {
  const [copied, setCopied] = useState("");
  const [pipe, setPipe] = useState<PipeRow[]>([]);
  const [prey, setPrey] = useState<Prey | "all">("all");
  const [range, setRange] = useState<Range | "all">("whatcom");
  const [custom, setCustom] = useState("");
  const week = useMemo(() => weekTargets(5), []);
  const listed = useMemo(() => filterDirectory(prey, range), [prey, range]);
  useEffect(() => {
    setPipe(loadPipe());
  }, []);

  function write(next: PipeRow[]) {
    setPipe(next);
    savePipe(next);
  }

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      /* clipboard */
    }
  }

  function addTargets(rows: Target[]) {
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
    write(pipe.filter((p) => p.id !== id));
  }

  function addCustom() {
    const name = custom.trim();
    if (!name) return;
    const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Date.now().toString(36)}`;
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

  const sentThisWeek = pipe.filter((p) => p.status === "sent" || p.status === "waiting" || p.status === "keyed").length;
  const live = pipe.filter((p) => p.status !== "skip" && p.status !== "keyed");

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Week {isoWeek()}</p>
        <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg">This week’s hunt is five names.</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Directory is real WA / PNW shops, weighted to Whatcom. Copy the DM, open the site, mark sent.
          Do not add more until these five are sent or skipped. {sentThisWeek} already moving in your book.
        </p>
        <div className="mt-4">
          <Button size="sm" onClick={() => addTargets(week)}>
            Load the five into the book
          </Button>
        </div>
        <ul className="mt-4 space-y-3">
          {week.map((t) => (
            <TargetRow key={t.id} t={t} copied={copied} onCopy={copy} onAdd={() => addTargets([t])} />
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-xl tracking-tight text-fg">Open a hunt</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          These launch Google, Maps, X, and LinkedIn on the live query. Skim the first page, add names below.
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
            <h2 className="font-serif text-xl tracking-tight text-fg">Directory · {DIRECTORY.length}</h2>
            <p className="mt-1 text-sm text-muted">Researched public shops. Add the ones you will actually DM.</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(["all", "clinic", "mat", "pharmacy", "school", "harm", "assoc"] as const).map((id) => (
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
            ))}
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
        <ul className="mt-4 space-y-3">
          {listed.map((t) => (
            <TargetRow key={t.id} t={t} copied={copied} onCopy={copy} onAdd={() => addTargets([t])} compact />
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-xl tracking-tight text-fg">The book</h2>
        <p className="mt-1 text-sm text-muted">
          {live.length} live · {pipe.filter((p) => p.status === "keyed").length} keyed. Status lives on this browser.
        </p>
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
          />
          <Button type="submit" variant="secondary" disabled={!custom.trim()} className="shrink-0">
            <Plus className="size-3.5" />
            Add
          </Button>
        </form>
        {pipe.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Empty. Load the week, or add a name you just found.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pipe.map((row) => (
              <li key={row.id} className="rounded-md bg-bg-sunken px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-fg">{row.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {PREY_LABEL[row.prey]} · {row.city || RANGE_LABEL[row.range]}
                      {row.who ? ` · ${row.who}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="secondary" onClick={() => void copy(`p-${row.id}`, targetDm(row))}>
                      {copied === `p-${row.id}` ? "Copied" : "DM"}
                    </Button>
                    {row.site ? (
                      <HuntLink href={row.site}>Site</HuntLink>
                    ) : null}
                    <a
                      href={mailDraft(row)}
                      className="inline-flex h-9 items-center rounded-sm px-2 text-xs font-medium text-muted hover:text-fg"
                    >
                      Mail
                    </a>
                    <button
                      type="button"
                      className="h-9 px-2 text-xs text-muted hover:text-danger"
                      onClick={() => remove(row.id)}
                    >
                      Drop
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(row.id, s)}
                      className={
                        row.status === s
                          ? "h-8 rounded-full bg-ink px-2.5 text-[11px] font-medium text-bg"
                          : "h-8 rounded-full bg-surface px-2.5 text-[11px] font-medium text-muted hover:text-fg"
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
  compact,
}: {
  t: Target;
  copied: string;
  onCopy: (label: string, text: string) => void;
  onAdd: () => void;
  compact?: boolean;
}) {
  return (
    <li className={compact ? "border-t border-border pt-3 first:border-0 first:pt-0" : "rounded-md bg-bg-sunken px-3 py-3"}>
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
          <Button size="sm" variant="ghost" onClick={onAdd}>
            Book
          </Button>
        </div>
      </div>
    </li>
  );
}
