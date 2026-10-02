import { useState, type ReactNode } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { briefWindow } from "@/lib/drugs/window";
import { huddleTextVisible, plainBrief } from "@/lib/drugs/plain-huddle";
import type { HostContext } from "@/lib/drugs/types";
import { SEVERITY_LABEL } from "@/lib/drugs/types";
import { analyze } from "@/lib/drugs/engine";
import { PI_FOOTER } from "@/lib/regulatory";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { severitySurface, severityTone } from "./severity";

export function WindowBriefing({
  ids,
  host,
  report,
}: {
  ids: string[];
  host: HostContext;
  report: ReturnType<typeof analyze>;
}) {
  const brief = briefWindow(ids, report, host);
  const [copied, setCopied] = useState(false);
  /** Default on for friendliness; toggle off for the existing technical brief. */
  const [plain, setPlain] = useState(true);
  if (!brief) return null;

  const view = plain ? plainBrief(brief) : brief;

  async function copy() {
    try {
      await navigator.clipboard.writeText(huddleTextVisible(brief!, plain));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{brief.kicker}</p>
          <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">{brief.title}</h2>
          <p className="mt-1 text-xs text-muted">
            Considerations for independent review — not a treatment order. Confirm against the
            Prescribing Information. The label wins.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex min-w-24 items-center justify-center rounded-sm px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider",
              severitySurface(brief.highest),
            )}
          >
            {SEVERITY_LABEL[brief.highest]}
          </span>
          <Button
            variant={plain ? "default" : "secondary"}
            size="sm"
            className="h-10 min-w-24"
            aria-pressed={plain}
            title={plain ? "Showing everyday words — click for technical brief" : "Showing technical brief — click for everyday words"}
            onClick={() => setPlain((v) => !v)}
          >
            Plain words
          </Button>
          <Button variant="secondary" size="sm" className="h-10 min-w-24" onClick={() => void copy()}>
            {copied ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />}
            {copied ? "Copied" : "Copy huddle"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <HuddleCol kicker="Watch for" tone={brief.quiet ? "ok" : "danger"}>
          <ul className="space-y-2">
            {view.watch.map((w) => (
              <li key={w} className="text-sm leading-relaxed text-fg">
                {w}
              </li>
            ))}
          </ul>
        </HuddleCol>
        <HuddleCol kicker="Counsel" tone="info">
          <p className="text-sm leading-relaxed text-fg">{view.tell}</p>
        </HuddleCol>
        <HuddleCol kicker="Consider / call" tone="warn">
          <p className="text-sm leading-relaxed text-fg">{view.call}</p>
        </HuddleCol>
      </div>

      {brief.tray.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="self-center text-[11px] uppercase tracking-wide text-muted">On the tray</span>
          {brief.tray.map((t) => (
            <Badge key={t} tone={severityTone(brief.highest) === "danger" && t.includes("airway") ? "danger" : "info"}>
              {t}
            </Badge>
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-[11px] leading-relaxed text-subtle">{PI_FOOTER}</p>
    </section>
  );
}

function HuddleCol({
  kicker,
  tone,
  children,
}: {
  kicker: string;
  tone: "danger" | "warn" | "info" | "ok";
  children: ReactNode;
}) {
  const wash =
    tone === "danger"
      ? "bg-danger-soft"
      : tone === "warn"
        ? "bg-warn-soft"
        : tone === "ok"
          ? "bg-ok-soft"
          : "bg-info-soft";
  const ink =
    tone === "danger"
      ? "text-danger"
      : tone === "warn"
        ? "text-warn"
        : tone === "ok"
          ? "text-ok"
          : "text-info";
  return (
    <div className={cn("rounded-lg px-3 py-3", wash)}>
      <p className={cn("font-mono text-[10px] uppercase tracking-wide", ink)}>{kicker}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
