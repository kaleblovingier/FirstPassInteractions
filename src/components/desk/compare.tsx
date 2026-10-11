import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, Check, Copy, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { parseDoses } from "@/lib/drugs/dosing";
import { analyze } from "@/lib/drugs/engine";
import { buildCompareUrl, parseComparePair } from "@/lib/drugs/permalinks";
import {
  DEFAULT_HOST,
  KETAMINE_ROUTE_LABEL,
  SEVERITY_LABEL,
  SEVERITY_RANK,
  type Finding,
  type HostContext,
  type Severity,
} from "@/lib/drugs/types";
import { SAMPLE_REGIMENS, sampleNeedsPro, type SampleRegimen } from "@/lib/drugs/samples";
import { FDA_GRADES } from "@/lib/drugs/cyp-protocol";
import { severitySurface } from "./severity";

interface CaseCompareProps {
  pro: boolean;
  onUnlock: () => void;
  onOpenCase: (sample: SampleRegimen) => void;
}

const SEVERITIES: Severity[] = ["contraindicated", "major", "moderate", "minor"];

function hostFor(sample: SampleRegimen): HostContext {
  return {
    ...DEFAULT_HOST,
    phenotypes: { ...DEFAULT_HOST.phenotypes, ...sample.phenotypes },
    smoking: sample.smoking ?? false,
    ketamineRoute: sample.ketamineRoute ?? DEFAULT_HOST.ketamineRoute,
    cannabisRoute: sample.cannabisRoute ?? DEFAULT_HOST.cannabisRoute,
    alcohol: sample.alcohol ?? DEFAULT_HOST.alcohol,
  };
}

function contextLabels(sample: SampleRegimen): string[] {
  const labels = Object.entries(sample.phenotypes ?? {}).map(([enzyme, status]) => `${enzyme} ${status}`);
  if (sample.smoking) labels.push("Daily smoking");
  if (sample.alcohol) labels.push(`Alcohol: ${sample.alcohol}`);
  if (sample.cannabisRoute) labels.push(`Cannabis: ${sample.cannabisRoute}`);
  if (sample.ketamineRoute && sample.ketamineRoute !== DEFAULT_HOST.ketamineRoute) {
    labels.push(`Route: ${KETAMINE_ROUTE_LABEL[sample.ketamineRoute]}`);
  }
  if (sample.doses && Object.keys(sample.doses).length > 0) labels.push("Teaching dose entered");
  return labels;
}

function findingsFor(sample: SampleRegimen) {
  return analyze(sample.drugIds, hostFor(sample), parseDoses(sample.doses)).findings;
}

function kindWord(kind: Finding["kind"]): string {
  if (kind === "pk") return "Levels";
  if (kind === "pd") return "Effects";
  if (kind === "geno") return "Genes";
  return "Clinic";
}

function FindingRow({
  finding,
  shared,
  otherSeverity,
}: {
  finding: Finding;
  shared: boolean;
  otherSeverity?: Severity;
}) {
  const severityChanged = shared && otherSeverity !== undefined && finding.severity !== otherSeverity;
  const gradeWord = finding.mechanism.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const grade = gradeWord === "strong" || gradeWord === "moderate" || gradeWord === "weak" ? gradeWord : null;
  const kind = finding.tags.includes("inducer") ? "inducer" : finding.tags.includes("inhibitor") ? "inhibitor" : null;

  return (
    <li className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${severitySurface(finding.severity)}`}>
          {SEVERITY_LABEL[finding.severity]}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">
          {kindWord(finding.kind)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
          {shared ? "In both cases" : "Only in this case"}
        </span>
        {severityChanged ? (
          <span className="rounded-full bg-warn-soft px-2 py-0.5 font-mono text-[10px] text-warn">
            Other case: {SEVERITY_LABEL[otherSeverity]}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-medium leading-snug text-fg">{finding.headline}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{finding.effect}</p>
      {finding.enzymes.length > 0 ? (
        <p className="mt-1 font-mono text-[11px] uppercase text-subtle">{finding.enzymes.join(" · ")}</p>
      ) : null}
      {grade && kind ? (
        <p className="mt-1 text-xs leading-relaxed text-muted">
          FDA fold: {FDA_GRADES[kind][grade].fold}. Not a milligram.
        </p>
      ) : null}
    </li>
  );
}

function FindingList({
  findings,
  sharedIds,
  otherSeverities,
}: {
  findings: Finding[];
  sharedIds: Set<string>;
  otherSeverities: Map<string, Severity>;
}) {
  if (findings.length === 0) {
    return (
      <p className="rounded-lg bg-bg-sunken px-3 py-3 text-xs leading-relaxed text-muted">
        No mapped findings in this teaching model. That is not evidence of no interaction.
      </p>
    );
  }

  const visible = findings.slice(0, 4);
  const remaining = findings.slice(4);
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {visible.map((finding) => (
          <FindingRow
            key={finding.id}
            finding={finding}
            shared={sharedIds.has(finding.id)}
            otherSeverity={otherSeverities.get(finding.id)}
          />
        ))}
      </ul>
      {remaining.length > 0 ? (
        <details className="rounded-lg border border-border bg-surface px-3 py-2">
          <summary className="text-xs font-medium text-accent">
            Show {remaining.length} more mapped finding{remaining.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 space-y-2">
            {remaining.map((finding) => (
              <FindingRow
                key={finding.id}
                finding={finding}
                shared={sharedIds.has(finding.id)}
                otherSeverity={otherSeverities.get(finding.id)}
              />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function CasePanel({
  sample,
  findings,
  sharedIds,
  comparisonFindings,
  side,
  onOpenCase,
}: {
  sample: SampleRegimen;
  findings: Finding[];
  sharedIds: Set<string>;
  comparisonFindings: Finding[];
  side: "A" | "B";
  onOpenCase: (sample: SampleRegimen) => void;
}) {
  const labels = contextLabels(sample);
  const counts = SEVERITIES.map((severity) => ({
    severity,
    count: findings.filter((finding) => finding.severity === severity).length,
  }));
  const highest = findings[0]?.severity ?? "none";
  const drugs = sample.drugIds.map((id) => DRUG_BY_ID[id]?.name ?? id);
  const otherSeverities = new Map(comparisonFindings.map((finding) => [finding.id, finding.severity]));

  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Case {side}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severitySurface(highest)}`}>
          Highest mapped: {SEVERITY_LABEL[highest]}
        </span>
      </div>
      <h2 className="mt-3 font-serif text-xl leading-tight tracking-tight text-fg">{sample.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{sample.blurb}</p>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-subtle">{drugs.join(" · ")}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {labels.length ? (
          labels.map((label) => (
            <span key={label} className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] text-accent">
              {label}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-bg-sunken px-2.5 py-1 text-[11px] text-muted">Default teaching context</span>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.map(({ severity, count }) => (
          <div key={severity} className="rounded-lg bg-bg-sunken px-2.5 py-2">
            <dt className="text-[10px] leading-snug text-muted">{SEVERITY_LABEL[severity]}</dt>
            <dd className="mt-1 font-mono text-lg text-fg">{count}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          Mapped finding detail
        </h3>
        <FindingList findings={findings} sharedIds={sharedIds} otherSeverities={otherSeverities} />
      </div>
      <Button className="mt-4 w-full" variant="secondary" onClick={() => onOpenCase(sample)}>
        Review case in desk
        <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
    </section>
  );
}

export function CaseCompare({ pro, onUnlock, onOpenCase }: CaseCompareProps) {
  const choices = useMemo(
    () => SAMPLE_REGIMENS.filter((sample) => pro || !sampleNeedsPro(sample)),
    [pro],
  );
  const [copied, setCopied] = useState(false);
  const availableIds = useMemo(() => SAMPLE_REGIMENS.filter((sample) => pro || !sampleNeedsPro(sample)).map((sample) => sample.id), [pro]);
  const initialPair = useMemo(() => parseComparePair(window.location.search), []);
  const activeCaseId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const rawId = params.get("case") ?? params.get("sample");
    return rawId && availableIds.includes(rawId) ? rawId : null;
  }, [availableIds]);
  const [leftId, setLeftId] = useState(() => {
    const preferred = initialPair.leftId ?? activeCaseId ?? "gf-oral-ketamine";
    return availableIds.includes(preferred) ? preferred : availableIds[0] ?? "gf-oral-ketamine";
  });
  const [rightId, setRightId] = useState(() => {
    const preferred = initialPair.rightId ?? (activeCaseId && activeCaseId !== leftId ? activeCaseId : "ketamine-benzo");
    const initialRight = availableIds.includes(preferred) ? preferred : "ketamine-benzo";
    if (initialRight === leftId) {
      return availableIds.find((id) => id !== leftId) ?? initialRight;
    }
    return availableIds.includes(initialRight) ? initialRight : availableIds.find((id) => id !== leftId) ?? availableIds[0] ?? initialRight;
  });

  const left = choices.find((sample) => sample.id === leftId) ?? choices[0];
  const right =
    choices.find((sample) => sample.id === rightId && sample.id !== left?.id) ??
    choices.find((sample) => sample.id !== left?.id) ??
    left;

  useEffect(() => {
    if (!left || !right) return;
    const url = new URL(window.location.href);
    url.searchParams.set("compareA", left.id);
    url.searchParams.set("compareB", right.id);
    url.searchParams.delete("case");
    url.searchParams.delete("sample");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [left, right]);

  if (!left || !right) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h1 className="font-serif text-2xl text-fg">Compare teaching cases</h1>
        <p className="mt-2 text-sm text-muted">There are not enough available cases to compare.</p>
      </div>
    );
  }

  const leftFindings = findingsFor(left);
  const rightFindings = findingsFor(right);
  const leftIds = new Set(leftFindings.map((finding) => finding.id));
  const rightIds = new Set(rightFindings.map((finding) => finding.id));
  const sharedIds = new Set([...leftIds].filter((id) => rightIds.has(id)));
  const rightById = new Map(rightFindings.map((finding) => [finding.id, finding]));
  const severityShifts = leftFindings.filter((finding) => {
    const comparison = rightById.get(finding.id);
    return comparison !== undefined && comparison.severity !== finding.severity;
  }).length;
  const leftOnly = leftFindings.filter((finding) => !sharedIds.has(finding.id)).length;
  const rightOnly = rightFindings.filter((finding) => !sharedIds.has(finding.id)).length;
  const highestA = leftFindings[0]?.severity ?? "none";
  const highestB = rightFindings[0]?.severity ?? "none";
  const highestDelta = SEVERITY_RANK[highestA] - SEVERITY_RANK[highestB];

  function selectCase(side: "A" | "B", id: string) {
    if (side === "A") {
      setLeftId(id);
      if (id === right.id) setRightId(left.id);
    } else {
      setRightId(id);
      if (id === left.id) setLeftId(right.id);
    }
  }

  async function copyCompareLink() {
    const url = buildCompareUrl(left.id, right.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard can be blocked in some browser contexts; leave the link in the URL state.
    }
  }

  return (
    <div className="space-y-5">
      <header className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <ArrowLeftRight aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Teaching tool</p>
            <h1 className="mt-1 font-serif text-2xl leading-tight tracking-tight text-fg sm:text-3xl">
              Compare two cases
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              See which findings are shared and which appear only in one teaching scenario. Both cases
              use the desk&apos;s existing model and the context specified by each sample.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label className="block min-w-0 text-xs font-medium text-muted">
            Case A
            <select
              aria-label="Choose case A"
              value={left.id}
              onChange={(event) => selectCase("A", event.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {choices.map((sample) => (
                <option key={sample.id} value={sample.id} disabled={sample.id === right.id}>
                  {sample.title}
                </option>
              ))}
            </select>
          </label>
          <span className="hidden items-center justify-center pb-2 font-mono text-[10px] uppercase tracking-wide text-subtle sm:flex">
            versus
          </span>
          <label className="block min-w-0 text-xs font-medium text-muted">
            Case B
            <select
              aria-label="Choose case B"
              value={right.id}
              onChange={(event) => selectCase("B", event.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {choices.map((sample) => (
                <option key={sample.id} value={sample.id} disabled={sample.id === left.id}>
                  {sample.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={copyCompareLink}>
            {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
            {copied ? "Copied link" : "Copy compare link"}
          </Button>
        </div>
        {!pro ? (
          <div className="mt-4 flex flex-col gap-3 rounded-lg bg-bg-sunken p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-muted">
              Cases that set metabolizer status (phenotype), smoking, alcohol, or cannabis route appear with founding.
            </p>
            <Button variant="secondary" size="sm" className="shrink-0" onClick={onUnlock}>
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Unlock all cases
            </Button>
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-bg-sunken p-3 sm:grid-cols-4 sm:gap-2">
        <SummaryMetric label="Mapped in both" value={sharedIds.size} />
        <SummaryMetric label="Shared severity shifts" value={severityShifts} />
        <SummaryMetric label="Only in case A" value={leftOnly} />
        <SummaryMetric label="Only in case B" value={rightOnly} />
      </div>
      {highestDelta !== 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
          The highest mapped category differs: Case {highestDelta > 0 ? "A" : "B"} is{" "}
          {SEVERITY_LABEL[highestDelta > 0 ? highestA : highestB]}, while Case{" "}
          {highestDelta > 0 ? "B" : "A"} is{" "}
          {SEVERITY_LABEL[highestDelta > 0 ? highestB : highestA]}. This compares model labels only,
          not patient risk.
        </p>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <CasePanel
          sample={left}
          findings={leftFindings}
          sharedIds={sharedIds}
          comparisonFindings={rightFindings}
          side="A"
          onOpenCase={onOpenCase}
        />
        <CasePanel
          sample={right}
          findings={rightFindings}
          sharedIds={sharedIds}
          comparisonFindings={leftFindings}
          side="B"
          onOpenCase={onOpenCase}
        />
      </div>

      <p className="rounded-lg border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        Educational comparison only. Finding counts and severity labels are not a measure of patient
        risk and do not establish that either case is safe. Confirm current prescribing information and
        primary sources; this tool can miss clinically important interactions.
      </p>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-3 text-center shadow-[var(--shadow-border)]">
      <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-serif text-2xl leading-none text-fg">{value}</dd>
    </div>
  );
}
