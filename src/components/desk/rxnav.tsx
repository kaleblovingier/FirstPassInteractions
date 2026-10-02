import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { lookupRxnavInteractions } from "@/lib/drugs/live-rpc";
import type { RxclassHit, RxnavPair } from "@/lib/drugs/live";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Everyday source chip — API `source` string unchanged. */
function plainSource(source: string) {
  if (source === "OpenFDA label") return "Official label";
  return source;
}

/** Soften known live-empty reason for the coach; leave other reasons as returned. */
function softReason(reason: string) {
  if (reason.includes("retired the RxNav Interaction API") || reason.includes("No partner name")) {
    return "Live sources did not name this partner in the label excerpt. That is not a green light — FirstPass still owns the enzyme / effect score on this desk, and drug classes (when returned) sit below.";
  }
  if (reason === "Put two labeled drugs on the desk.") {
    return "Add two labeled medicines on the desk, then ask live sources.";
  }
  return reason;
}

export function RxnavBoard({ ids }: { ids: string[] }) {
  const [pairs, setPairs] = useState<RxnavPair[] | null>(null);
  const [classes, setClasses] = useState<RxclassHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    setReason(null);
    try {
      const res = await lookupRxnavInteractions({ data: { ids } });
      if (!res.ok) setErr(res.reason ?? "Live sources did not answer.");
      else if (res.reason) setReason(res.reason);
      setPairs(res.pairs);
      setClasses(res.classes ?? []);
    } catch {
      setErr("Live sources did not answer.");
      setPairs([]);
      setClasses([]);
    } finally {
      setBusy(false);
    }
  }

  if (ids.length < 2) return null;

  const ran = pairs !== null;
  const emptyPairs = ran && pairs.length === 0 && !err;

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="rounded-lg border border-accent/15 bg-accent-soft/30 p-3 sm:p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Live label coach</p>
        <p className="mt-1.5 text-sm leading-relaxed text-fg">
          Short official-label excerpts that name a partner on this tray, plus NIH drug-class tags when available.
          Educational only — truncated label text, not a complete interaction engine.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Empty or quiet here is not a green light. Enzyme / effect scoring stays on this desk; the full label and a
          clinician still win.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg tracking-tight text-fg">Live label check</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Official label partner scan · drug classes · truncated excerpts
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => void run()}>
          {busy ? "Looking up live labels…" : pairs ? "Refresh" : "Ask live sources"}
        </Button>
      </div>

      {err ? (
        <div className="mt-4 rounded-lg border border-danger/20 bg-danger-soft/40 px-4 py-3">
          <p className="text-sm font-medium text-fg">Live sources did not answer</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {softReason(err)} A failed lookup is not the same as safe — re-try, open the full label, and confirm with a
            clinician.
          </p>
        </div>
      ) : null}

      {emptyPairs ? (
        <div className="mt-4 rounded-lg border border-border bg-bg-sunken px-4 py-4">
          <p className="text-sm font-medium text-fg">No partner named in the live excerpt</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {reason
              ? softReason(reason)
              : "Live sources did not return a partner name for this tray. Empty here is not a green light — FirstPass still owns the enzyme / effect score on this desk."}
          </p>
        </div>
      ) : reason && !err ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">{softReason(reason)}</p>
      ) : null}

      {pairs && pairs.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {pairs.map((p, i) => (
            <li key={`${p.source}-${p.a}-${p.b}-${i}`} className="rounded-md bg-bg-sunken px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-fg">
                  {p.a} × {p.b}
                </span>
                <Badge tone="info">{plainSource(p.source)}</Badge>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{p.description}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {classes.length ? (
        <div className="mt-4">
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-muted">
            Drug classes <span className="font-normal normal-case tracking-normal text-subtle">(RxClass)</span>
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {classes.map((c, i) => (
              <li key={`${c.rxcui}-${c.className}-${i}`}>
                <Badge tone="info">
                  {c.drug}: {c.className}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 text-[11px] leading-relaxed text-subtle">
        Truncated official-label text — not a complete interaction engine. Enzyme / effect scoring stays on this desk.{" "}
        <a
          className="text-accent underline"
          href="https://lhncbc.nlm.nih.gov/RxNav/APIs/RxClassAPIs.html"
          target="_blank"
          rel="noreferrer"
        >
          Drug-class docs
          <ExternalLink className="ml-1 inline size-3" />
        </a>
      </p>
    </section>
  );
}
