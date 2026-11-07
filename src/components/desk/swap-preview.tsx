import { useId, useMemo, useState } from "react";
import { ArrowLeftRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DRUG_BY_ID, searchDrugs } from "@/lib/drugs/catalog";
import { useDesk } from "@/lib/drugs/store";
import { SWAP_COPY, swapDiff, type SwapDiff } from "@/lib/drugs/swap";
import { SEVERITY_LABEL, type Finding, type HostContext, type Severity } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";
import { severitySurface } from "./severity";

const PICKS = 6;

function chip(s: Severity | "none") {
  // "Not mapped" stays neutral here so an empty side never reads as a green light.
  return s === "none" ? "bg-bg-sunken text-muted" : severitySurface(s);
}

function name(id: string) {
  return DRUG_BY_ID[id]?.name ?? id;
}

function Rows({ title, findings, empty }: { title: string; findings: Finding[]; empty: string }) {
  return (
    <div className="min-w-0">
      <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {title} ({findings.length})
      </h4>
      {findings.length ? (
        <ul className="mt-2 space-y-1.5">
          {findings.map((f) => (
            <li key={f.id} className="rounded-md bg-bg-sunken px-2.5 py-2">
              <span className={cn("mr-2 rounded-full px-2 py-0.5 font-mono text-[10px]", chip(f.severity))}>
                {SEVERITY_LABEL[f.severity]}
              </span>
              <span className="text-xs leading-snug text-fg">{f.headline}</span>
              {f.enzymes.length ? (
                <span className="ml-1 font-mono text-[10px] uppercase text-subtle">{f.enzymes.join(" · ")}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">{empty}</p>
      )}
    </div>
  );
}

export function SwapResult({ diff, outId, inId }: { diff: SwapDiff; outId: string; inId: string }) {
  const quiet = diff.gone.length === 0 && diff.added.length === 0 && diff.regraded.length === 0;
  return (
    <div className="space-y-3" data-testid="swap-result">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>Biggest concern now</span>
        <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px]", chip(diff.before.highest))}>
          {SEVERITY_LABEL[diff.before.highest]}
        </span>
        <span>with {name(inId)} in place of {name(outId)}</span>
        <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px]", chip(diff.after.highest))}>
          {SEVERITY_LABEL[diff.after.highest]}
        </span>
      </div>
      {quiet ? (
        <p className="rounded-md bg-bg-sunken px-3 py-2 text-xs leading-relaxed text-muted">{SWAP_COPY.quiet}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <Rows title="Would leave the list" findings={diff.gone} empty="None leave the list." />
          <Rows title="Would join the list" findings={diff.added} empty="None join the list." />
          {diff.regraded.length ? (
            <div className="md:col-span-2">
              <h4 className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Graded differently ({diff.regraded.length})
              </h4>
              <ul className="mt-2 space-y-1.5">
                {diff.regraded.map(({ finding, was }) => (
                  <li key={finding.id} className="rounded-md bg-bg-sunken px-2.5 py-2 text-xs text-fg">
                    {finding.headline}: {SEVERITY_LABEL[was]} now, {SEVERITY_LABEL[finding.severity]} after the swap
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
      <p className="text-[11px] text-subtle">
        {diff.kept} finding{diff.kept === 1 ? "" : "s"} stay the same on both trays.
      </p>
    </div>
  );
}

/** What-if panel for a tray of two or more items. Presents engine output only. */
export function SwapPreview({
  ids,
  host,
  amounts,
}: {
  ids: string[];
  host: HostContext;
  amounts: Record<string, number>;
}) {
  const swap = useDesk((s) => s.swap);
  const [outPick, setOutPick] = useState<string>("");
  const [inId, setInId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const selectId = useId();
  const searchId = useId();
  const outId = outPick && ids.includes(outPick) ? outPick : ids[ids.length - 1];
  const matches = useMemo(() => (query.trim() ? searchDrugs(query, ids).slice(0, PICKS) : []), [query, ids]);
  const diff = useMemo(
    () => (inId ? swapDiff(ids, host, outId, inId, amounts) : null),
    [ids, host, outId, inId, amounts],
  );

  function reset() {
    setInId(null);
    setQuery("");
  }

  function apply() {
    if (!inId) return;
    const from = name(outId);
    const to = name(inId);
    if (swap(outId, inId)) {
      setNote(`Swapped ${from} for ${to}. The old tray is under Recent trays in Search everything (Ctrl K).`);
      setOutPick(inId);
      reset();
    }
  }

  return (
    <section
      aria-labelledby={`${selectId}-title`}
      className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5"
      data-testid="swap-preview"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <ArrowLeftRight aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 id={`${selectId}-title`} className="font-serif text-lg tracking-tight text-fg">
            {SWAP_COPY.title}{" "}
            <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">{SWAP_COPY.scientific}</span>
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{SWAP_COPY.intro}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={selectId} className="block font-mono text-[10px] uppercase tracking-wide text-muted">
            Take off
          </label>
          <select
            id={selectId}
            value={outId}
            onChange={(e) => {
              setOutPick(e.target.value);
              setInId(null);
            }}
            className="mt-1 h-11 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-fg sm:h-9"
          >
            {ids.map((id) => (
              <option key={id} value={id}>
                {name(id)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={searchId} className="block font-mono text-[10px] uppercase tracking-wide text-muted">
            Put on instead
          </label>
          <Input
            id={searchId}
            className="mt-1"
            value={inId ? name(inId) : query}
            readOnly={Boolean(inId)}
            placeholder="Generic or brand name"
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      {!inId && matches.length > 0 ? (
        <ul aria-label="Replacement matches" className="mt-2 flex flex-wrap gap-2">
          {matches.map((d) => (
            <li key={d.id}>
              <Button variant="secondary" size="sm" className="h-11 sm:h-9" onClick={() => setInId(d.id)}>
                {d.name}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {!inId && query.trim() && matches.length === 0 ? (
        <p className="mt-2 text-xs text-muted">No catalog match off the tray for that name.</p>
      ) : null}

      {diff && inId ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <SwapResult diff={diff} outId={outId} inId={inId} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="h-11 sm:h-9" onClick={apply}>
              <Check aria-hidden className="size-3.5" />
              Apply swap
            </Button>
            <Button variant="secondary" size="sm" className="h-11 sm:h-9" onClick={reset}>
              <X aria-hidden className="size-3.5" />
              Pick another
            </Button>
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-[11px] leading-relaxed text-subtle">{SWAP_COPY.caveat}</p>
      <p role="status" className={note ? "mt-2 text-xs text-fg" : "sr-only"}>
        {note}
      </p>
    </section>
  );
}
