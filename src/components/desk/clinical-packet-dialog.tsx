import { useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  CheckSquare,
  Clipboard,
  ExternalLink,
  FileText,
  HeartPulse,
  Pill,
  Printer,
  ShieldAlert,
  Square,
  X,
} from "lucide-react";
import { buildClinicalPacket, reversalLine, withoutDose, type ClinicalPacketData } from "@/lib/drugs/clinical-packet";
import { EXPORT_NOT_A_DOSE, findingSourceLine } from "@/lib/drugs/brief";
import { NOT_CLEARED, PI_FOOTER } from "@/lib/regulatory";
import { SEVERITY_PLAIN } from "@/lib/drugs/types";
import type { Finding, HostContext, Severity } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";
import { useModalFocus } from "@/lib/a11y/use-modal-focus";
import { Button } from "@/components/ui/button";

export interface LabeledCollisionAlertItem {
  id: string;
  kind: "safety" | "ward";
  title: string;
  severity: Severity;
  tone: "danger" | "warn";
  mechanism: string;
  clinical: string;
  watch: string;
  source: string;
}

type PacketWithLabeledCollisions = ClinicalPacketData & {
  labeledCollisions?: readonly LabeledCollisionAlertItem[];
};

const EMPTY_DOSES: Record<string, string> = {};

interface ClinicalPacketDialogProps {
  open: boolean;
  onClose: () => void;
  selected: string[];
  host: HostContext;
  findings: Finding[];
  doses?: Record<string, string>;
  onOpenHelp?: () => void;
}

const CHECKLIST_ITEMS = [
  { id: "reconcile", label: "Active regimen reconciled against external pharmacy/EHR dispense history" },
  { id: "cyp", label: "CYP450 pharmacokinetic collisions and metabolizer phenotypes evaluated" },
  { id: "organ", label: "Organ clearance (renal CrCl, hepatic impairment) dosing considerations verified" },
  { id: "toxicity", label: "Multi-agent cumulative toxicity (ACB, QTc, Sedative Synergism, MME) reviewed" },
  { id: "counsel", label: "Plain-language patient counseling delivered to patient or designated caregiver" },
  { id: "naloxone", label: "Overdose risk assessed and take-home naloxone co-prescribed / access confirmed" },
];

export function LabeledCollisionsSection({
  items,
}: {
  items: readonly LabeledCollisionAlertItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="packet-labeled-collisions-title"
      className="print-break-inside min-w-0 space-y-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldAlert className="size-4 shrink-0 text-danger" aria-hidden="true" />
          <h3
            id="packet-labeled-collisions-title"
            className="min-w-0 font-serif text-base font-semibold text-fg [overflow-wrap:anywhere]"
          >
            High-Alert Labeled &amp; Institutional Safety Collisions
          </h3>
        </div>
        <span className="shrink-0 rounded-full border border-danger bg-danger-soft px-2.5 py-0.5 font-mono text-[11px] font-semibold text-danger">
          {items.length} alert{items.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const isDanger = item.tone === "danger";
          const Icon = isDanger ? ShieldAlert : AlertTriangle;
          const severityLabel = SEVERITY_PLAIN[item.severity];
          const kindLabel = item.kind === "ward" ? "Institutional Safety Rail" : "Labeled Safety Collision";
          return (
            <article
              key={item.id}
              className={cn(
                "min-w-0 rounded-xl border p-3.5 text-xs",
                isDanger ? "border-danger bg-danger-soft" : "border-warn bg-warn-soft",
              )}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <h4 className="min-w-0 flex-1 font-serif text-sm font-semibold text-fg [overflow-wrap:anywhere]">
                  {item.title}
                </h4>
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border bg-surface px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide",
                      isDanger ? "border-danger text-danger" : "border-warn text-warn",
                    )}
                  >
                    <Icon className="size-3 shrink-0" aria-hidden="true" />
                    <span>{severityLabel}</span>
                  </span>
                  <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[10px] font-medium text-muted">
                    {kindLabel}
                  </span>
                </div>
              </div>

              <p className="mt-2 leading-relaxed text-fg [overflow-wrap:anywhere]">
                <strong className="font-semibold">Mechanism: </strong>
                {withoutDose(item.mechanism)}
              </p>

              <div className="mt-2 rounded-lg border border-border bg-surface p-2.5 leading-relaxed text-fg [overflow-wrap:anywhere]">
                <strong className="font-mono text-[10px] uppercase tracking-wider text-accent">
                  Bedside Watch:{" "}
                </strong>
                <span>{withoutDose(item.watch)}</span>
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-muted [overflow-wrap:anywhere]">
                <strong className="font-medium text-fg">Official PI Source: </strong>
                {item.source}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ClinicalPacketDialog({
  open,
  onClose,
  selected,
  host,
  findings,
  doses = EMPTY_DOSES,
  onOpenHelp,
}: ClinicalPacketDialogProps) {
  const [copiedState, setCopiedState] = useState<"ehr" | "handout" | null>(null);
  // Starts empty: only the reviewing clinician ticks an attestation.
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  // Off until the clinician marks them: reversal and TdP lines print only for a present event.
  const [activeBleeding, setActiveBleeding] = useState(false);
  const [activeTdp, setActiveTdp] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRole, setReviewerRole] = useState("PharmD");
  const [clinicalNotes, setClinicalNotes] = useState("");

  const packet: ClinicalPacketData = useMemo(() => {
    return buildClinicalPacket(selected, host, findings, doses, { activeBleeding, activeTdp });
  }, [selected, host, findings, doses, activeBleeding, activeTdp]);

  const labeledCollisions = (packet as PacketWithLabeledCollisions).labeledCollisions ?? [];

  // Focus moves in on open, Tab stays inside, Escape closes, focus returns to the opener.
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(dialogRef, open, onClose);

  if (!open) return null;

  async function copyToClipboard(kind: "ehr" | "handout", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(kind);
      window.setTimeout(() => setCopiedState(null), 2000);
    } catch {
      /* clipboard write might fail in some sandbox environments */
    }
  }

  function toggleCheck(id: string) {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      // Focus lands here on open so the dialog name is read; it is not a control, so no ring.
      style={{ outline: "none" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="packet-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-2 sm:p-4 md:p-6 backdrop-blur-xs print-dialog-container overflow-y-auto"
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-dialog-card, .print-dialog-card * {
            visibility: visible;
          }
          .print-dialog-container {
            position: absolute !important;
            inset: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .print-dialog-card {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 12mm !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break-inside {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="relative flex max-h-[92vh] w-full max-w-4xl min-w-0 flex-col rounded-2xl border border-border bg-surface shadow-2xl print-dialog-card">
        <span role="status" aria-live="polite" className="sr-only">
          {copiedState === "ehr"
            ? "EHR Note copied to clipboard"
            : copiedState === "handout"
              ? "Patient Medication Guide copied to clipboard"
              : ""}
        </span>
        {/* Sticky Utility Header */}
        <div className="no-print sticky top-0 z-10 flex min-w-0 flex-wrap items-center justify-between gap-2.5 border-b border-border bg-surface/95 px-4 py-3 sm:px-5 sm:py-3.5 backdrop-blur-sm rounded-t-2xl">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <FileText className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="packet-dialog-title" className="font-serif text-lg font-medium text-fg [overflow-wrap:anywhere]">
                Clinical Sign-Off Packet
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted [overflow-wrap:anywhere]">
                Pre-Visit Regimen Review &amp; Consultation Document
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-auto min-h-[44px] sm:min-h-8 sm:h-8 gap-1.5 whitespace-normal py-1.5 text-center text-xs font-medium [overflow-wrap:anywhere]"
            >
              <Printer className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Print / Save PDF</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard("ehr", packet.ehrNoteText)}
              className="h-auto min-h-[44px] sm:min-h-8 sm:h-8 gap-1.5 whitespace-normal py-1.5 text-center text-xs font-medium [overflow-wrap:anywhere]"
            >
              {copiedState === "ehr" ? (
                <Check className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
              ) : (
                <Clipboard className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{copiedState === "ehr" ? "Copied EHR Note!" : "Copy EHR Note"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard("handout", packet.patientHandoutText)}
              className="h-auto min-h-[44px] sm:min-h-8 sm:h-8 gap-1.5 whitespace-normal py-1.5 text-center text-xs font-medium text-muted hover:text-fg [overflow-wrap:anywhere]"
            >
              {copiedState === "handout" ? (
                <Check className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
              ) : (
                <Clipboard className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{copiedState === "handout" ? "Copied Handout!" : "Patient Handout"}</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close clinical packet"
              className="ml-1 inline-flex size-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-muted hover:bg-bg-sunken hover:text-fg sm:size-8 sm:min-h-8 sm:min-w-8"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Packet Body */}
        <div className="min-w-0 space-y-6 overflow-y-auto p-4 sm:p-7 text-fg leading-relaxed">
          <div className="no-print flex min-w-0 flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">Mark only if present now:</span>
            {([
              ["Active bleeding", activeBleeding, setActiveBleeding],
              ["Torsades de pointes (TdP)", activeTdp, setActiveTdp],
            ] as const).map(([label, on, set]) => (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => set(!on)}
                className={cn(
                  "min-h-[44px] sm:min-h-0 rounded-full border px-3 py-1.5 text-left font-medium [overflow-wrap:anywhere]",
                  on ? "border-danger bg-danger-soft text-danger" : "border-border bg-bg-sunken text-muted",
                )}
              >
                {label}
              </button>
            ))}
            <span className="text-subtle">Reversal and TdP lines print only when marked.</span>
          </div>

          {/* Document Header & Regulatory Guardrail */}
          <div className="min-w-0 border-b border-border pb-4">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-widest text-accent">FirstPass Clinical Pharmacology</p>
                <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-fg [overflow-wrap:anywhere]">
                  Regimen Interaction Analysis &amp; Sign-Off Summary
                </h1>
              </div>
              <div className="min-w-0 text-left sm:text-right">
                <p className="font-mono text-xs text-muted">Generated: {packet.generatedAt}</p>
                <p className="font-mono text-[11px] text-subtle [overflow-wrap:anywhere]">
                  Review ID: FP-PKT-{packet.encounterDate.replace(/\s+/g, "-")}
                </p>
              </div>
            </div>

            <aside className="mt-3 rounded-lg border border-accent/20 bg-accent-soft/30 p-3 text-xs leading-relaxed text-fg">
              <strong className="font-semibold text-accent">Clinical Reference Notice: </strong>
              This packet is an educational interaction and risk assessment reference for licensed healthcare professionals and supervised trainees. It does not replace individualized clinical judgment, complete health records, or current FDA-approved Prescribing Information. Product labeling and the attending clinician govern.
            </aside>
          </div>

          {/* High-Alert Labeled & Institutional Safety Collisions */}
          <LabeledCollisionsSection items={labeledCollisions} />

          {/* Section 1: Modeled Host Context & CPIC Phenotypes */}
          <section className="print-break-inside space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-accent" />
              <h3 className="font-serif text-base font-semibold text-fg">1. Modeled Patient & Metabolizer Context</h3>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 rounded-xl bg-bg-sunken p-3.5 text-xs">
              <div>
                <span className="block font-mono text-[10px] uppercase text-muted">Age Category</span>
                <span className="font-medium text-fg">{packet.hostSummary.age}</span>
              </div>
              <div>
                <span className="block font-mono text-[10px] uppercase text-muted">Renal Clearance</span>
                <span className="font-medium text-fg">{packet.hostSummary.kidney}</span>
              </div>
              <div>
                <span className="block font-mono text-[10px] uppercase text-muted">Pregnancy / Lactation</span>
                <span className="font-medium text-fg">{packet.hostSummary.preg}</span>
              </div>
              <div>
                <span className="block font-mono text-[10px] uppercase text-muted">Combusted Tobacco</span>
                <span className="font-medium text-fg">{packet.hostSummary.smoking}</span>
              </div>
              <div>
                <span className="block font-mono text-[10px] uppercase text-muted">Alcohol Intake</span>
                <span className="font-medium text-fg">{packet.hostSummary.alcohol}</span>
              </div>
              <div>
                <span className="block font-mono text-[10px] uppercase text-muted">Route Context</span>
                <span className="font-medium text-fg">
                  Ketamine: {packet.hostSummary.ketamineRoute} · Cannabis: {packet.hostSummary.cannabisRoute}
                </span>
              </div>
            </div>

            {/* CPIC Enzyme Phenotypes Table */}
            <div role="region" aria-label="Modeled phenotypes table" tabIndex={0} className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-sunken font-mono text-[10px] uppercase text-muted border-b border-border">
                  <tr>
                    <th className="px-3 py-2">Enzyme</th>
                    <th className="px-3 py-2">Modeled Phenotype</th>
                    <th className="px-3 py-2">Clinical CPIC Teaching Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {packet.hostSummary.phenotypes.map((p) => (
                    <tr key={p.enzyme} className="hover:bg-bg-sunken/40">
                      <td className="px-3 py-2 font-mono font-medium text-accent">{p.enzyme}</td>
                      <td className="px-3 py-2 font-medium text-fg">{p.label}</td>
                      <td className="px-3 py-2 text-muted">
                        {p.phenotype === "poor"
                          ? "Markedly reduced clearance of sensitive substrates; decreased bioactivation of prodrugs."
                          : p.phenotype === "ultra"
                          ? "Accelerated clearance may cause therapeutic failure; accelerated prodrug bioactivation risks toxicity."
                          : p.phenotype === "rapid"
                          ? "Higher-than-average clearance; monitor therapeutic response."
                          : p.phenotype === "intermediate"
                          ? "Moderate clearance reduction; consider titration and close clinical monitoring."
                          : "Standard population metabolic clearance anticipated."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: Active Regimen Inventory */}
          <section className="print-break-inside space-y-3">
            <div className="flex items-center gap-2">
              <Pill className="size-4 text-accent" />
              <h3 className="font-serif text-base font-semibold text-fg">
                2. Active Regimen & Metabolic Pathways ({packet.regimen.length} items)
              </h3>
            </div>

            <div role="region" aria-label="Medication table" tabIndex={0} className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-sunken font-mono text-[10px] uppercase text-muted border-b border-border">
                  <tr>
                    <th className="px-3 py-2">Medication / Class</th>
                    <th className="px-3 py-2">Desk Dose</th>
                    <th className="px-3 py-2">Substrates (Victim)</th>
                    <th className="px-3 py-2">Inhibitors / Inducers (Perp)</th>
                    <th className="px-3 py-2">Safety / Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {packet.regimen.map((r) => (
                    <tr key={r.id} className="hover:bg-bg-sunken/40">
                      <td className="px-3 py-2">
                        <span className="font-medium text-fg">{r.name}</span>
                        {r.brandExamples.length > 0 && (
                          <span className="block text-[11px] text-muted">({r.brandExamples[0]})</span>
                        )}
                        <span className="block font-mono text-[10px] text-subtle">{r.cls}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-fg">{r.dose}</td>
                      <td className="px-3 py-2 text-muted">
                        {r.substrates.length > 0 ? (
                          <span className="font-mono text-accent">{r.substrates.join(", ")}</span>
                        ) : (
                          "None mapped"
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {r.inhibitors.length > 0 && (
                          <div className="text-[11px] text-warn">Inhibits: {r.inhibitors.join(", ")}</div>
                        )}
                        {r.inducers.length > 0 && (
                          <div className="text-[11px] text-accent">Induces: {r.inducers.join(", ")}</div>
                        )}
                        {!r.inhibitors.length && !r.inducers.length && "—"}
                      </td>
                      <td className="px-3 py-2">
                        {r.alertFlags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.alertFlags.map((af) => (
                              <span
                                key={af.kind}
                                className="rounded bg-warn-soft px-1.5 py-0.5 font-mono text-[9px] uppercase font-medium text-warn"
                              >
                                {af.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-subtle">Standard</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Multi-Agent Clinical Toxicity Indexes */}
          <section className="print-break-inside space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-accent" />
              <h3 className="font-serif text-base font-semibold text-fg">3. Composite Clinical Toxicity Indexes</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* ACB Box */}
              <div
                className={cn(
                  "rounded-xl border p-3.5 text-xs",
                  packet.riskIndexes.acb && packet.riskIndexes.acb.totalScore >= 3
                    ? "border-danger/30 bg-danger-soft/30"
                    : "border-border bg-bg-sunken",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-semibold text-fg">Anticholinergic Burden (ACB)</span>
                  <span className="font-mono text-xs font-bold text-accent">
                    Score: {packet.riskIndexes.acb ? packet.riskIndexes.acb.totalScore : 0}
                  </span>
                </div>
                <p className="mt-1 text-muted">
                  {packet.riskIndexes.acb
                    ? packet.riskIndexes.acb.summary
                    : "No scored anticholinergic burden identified for the current desk drugs."}
                </p>
                {packet.riskIndexes.acb && packet.riskIndexes.acb.contributors.length > 0 && (
                  <p className="mt-2 text-[11px] text-subtle">
                    Contributors: {packet.riskIndexes.acb.contributors.map((c) => `${c.name} (+${c.score})`).join(", ")}
                  </p>
                )}
              </div>

              {/* QTc Box */}
              <div
                className={cn(
                  "rounded-xl border p-3.5 text-xs",
                  packet.riskIndexes.qt && packet.riskIndexes.qt.score > 0
                    ? "border-warn/30 bg-warn-soft/30"
                    : "border-border bg-bg-sunken",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-semibold text-fg">Cardiac QTc Burden</span>
                  <span className="font-mono text-xs font-bold text-accent">
                    Score: {packet.riskIndexes.qt ? packet.riskIndexes.qt.score : 0}
                  </span>
                </div>
                <p className="mt-1 text-muted">
                  {packet.riskIndexes.qt && packet.riskIndexes.qt.score > 0
                    ? `${packet.riskIndexes.qt.known} known-risk, ${packet.riskIndexes.qt.possible} possible-risk agents on desk. ${packet.riskIndexes.qt.tell}`
                    : "No additive QTc prolongation agents mapped on this regimen."}
                </p>
                {packet.riskIndexes.qt?.tisdale && (
                  <div className="mt-2 rounded-md border border-border/60 bg-surface/80 p-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-fg">Tisdale Inpatient Score:</span>
                      <span className="font-mono font-bold text-accent">
                        {packet.riskIndexes.qt.tisdale.score}/21 ({packet.riskIndexes.qt.tisdale.tierLabel})
                      </span>
                    </div>
                    <p className="mt-0.5 text-subtle">{packet.riskIndexes.qt.tisdale.predictedRiskPercentage}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted">
                      Goals: K+ {packet.riskIndexes.qt.tisdale.electrolyteTargets.potassiumMeqL} · Mg2+ {packet.riskIndexes.qt.tisdale.electrolyteTargets.magnesiumMgDl}
                    </p>
                  </div>
                )}
              </div>

              {/* CNS Depression Box */}
              <div
                className={cn(
                  "rounded-xl border p-3.5 text-xs sm:col-span-2",
                  packet.riskIndexes.cnsDepression.hasSynergy
                    ? "border-danger/40 bg-danger-soft/40"
                    : "border-border bg-bg-sunken",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-semibold text-fg">Synergistic CNS / Respiratory Depression</span>
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                      packet.riskIndexes.cnsDepression.hasSynergy ? "bg-danger text-bg" : "bg-surface text-muted",
                    )}
                  >
                    {packet.riskIndexes.cnsDepression.hasSynergy ? "High Alert" : "Standard"}
                  </span>
                </div>
                <p className="mt-1 text-fg">
                  {packet.riskIndexes.cnsDepression.boxedWarning ??
                    "No high-synergy CNS depressant pairs (e.g. opioid + benzodiazepine or opioid + alcohol) flagged."}
                </p>
                {packet.riskIndexes.cnsDepression.agents.length > 0 && (
                  <p className="mt-1 text-[11px] text-muted">
                    CNS active agents: {packet.riskIndexes.cnsDepression.agents.join(", ")}
                  </p>
                )}
              </div>

              {/* Opioid / Harm Reduction Card */}
              {packet.riskIndexes.harmReduction.hasStreetOrOpioid && (
                <div className="rounded-xl border border-accent/30 bg-accent-soft/30 p-3.5 text-xs sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-serif font-semibold text-fg">
                      {packet.riskIndexes.harmReduction.headline}
                    </span>
                    {onOpenHelp && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenHelp();
                        }}
                        className="no-print inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-accent underline underline-offset-2"
                      >
                        Open State Resource & Naloxone Finder <ExternalLink className="size-3" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 leading-relaxed text-fg">{packet.riskIndexes.harmReduction.guidance}</p>
                </div>
              )}

              {/* Anticoagulation & Bleed Management Card */}
              {packet.riskIndexes.anticoagulation?.hasAnticoagulant && packet.riskIndexes.anticoagulation.report && (
                <div className="rounded-xl border border-warn/40 bg-warn-soft/30 p-3.5 text-xs sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-semibold text-fg">
                      Anticoagulation & Hemostatic Bleed Safety
                    </span>
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-warn-soft text-warn border border-warn/30">
                      Active Blood Thinner
                    </span>
                  </div>
                  <p className="mt-1 text-fg leading-relaxed">
                    {packet.riskIndexes.anticoagulation.summary}
                  </p>
                  {packet.riskIndexes.anticoagulation.report.apixabanAbc && (
                    <div className="mt-2 rounded bg-surface/60 p-2 border border-border/50 text-[11px]">
                      <span className="font-mono font-bold text-accent">Apixaban ABC Criteria: </span>
                      {withoutDose(packet.riskIndexes.anticoagulation.report.apixabanAbc.rationale)}
                    </div>
                  )}
                  {activeBleeding && packet.riskIndexes.anticoagulation.report.reversals.length > 0 && (
                    <div className="mt-2 text-[11px] text-muted">
                      <span className="font-semibold text-fg">Emergency Reversal Pathway: </span>
                      {packet.riskIndexes.anticoagulation.report.reversals.map((rev) => (
                        <span key={rev.agentId} className="block mt-0.5 font-mono">
                          • {rev.agentName}: {reversalLine(rev)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Potassium Homeostasis & Cardioprotection Card */}
              {packet.riskIndexes.potassium?.hasPotassiumIssue && packet.riskIndexes.potassium.report && (
                <div className="rounded-xl border border-danger/30 bg-danger-soft/20 p-3.5 text-xs sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-semibold text-fg">
                      Potassium Homeostasis & Cardioprotective Shifting
                    </span>
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-danger-soft text-danger border border-danger/30">
                      Tier: {packet.riskIndexes.potassium.report.severityTier}
                    </span>
                  </div>
                  <p className="mt-1 text-fg leading-relaxed">
                    {packet.riskIndexes.potassium.summary}
                  </p>
                  {packet.riskIndexes.potassium.report.perpetrators.length > 0 && (
                    <div className="mt-2 text-[11px] text-muted">
                      <span className="font-semibold text-fg">Active Perpetrators on Regimen: </span>
                      {packet.riskIndexes.potassium.report.perpetrators.map((p) => `${p.name} (${p.category})`).join(", ")}
                    </div>
                  )}
                  {packet.riskIndexes.potassium.report.membraneStabilization.indicated && (
                    <div className="mt-2 rounded bg-surface/60 p-2 border border-border/50 text-[11px]">
                      <span className="font-mono font-bold text-danger">Membrane Stabilization Required: </span>
                      {packet.riskIndexes.potassium.report.membraneStabilization.primaryAgent.name} ({packet.riskIndexes.potassium.report.membraneStabilization.primaryAgent.routePreference})
                    </div>
                  )}
                </div>
              )}

              {/* SGLT2 Inhibitor & euDKA Card */}
              {packet.riskIndexes.sglt2?.hasSglt2 && packet.riskIndexes.sglt2.report && (
                <div className="rounded-xl border border-warn/40 bg-warn-soft/20 p-3.5 text-xs sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-semibold text-fg">
                      SGLT2 Inhibitor Homeostasis, euDKA & Perioperative Rails
                    </span>
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-warn-soft text-warn border border-warn/30">
                      Active SGLT2i
                    </span>
                  </div>
                  <p className="mt-1 text-fg leading-relaxed">
                    {packet.riskIndexes.sglt2.summary}
                  </p>
                  {packet.riskIndexes.sglt2.report.preopSchedule.length > 0 && (
                    <div className="mt-2 rounded bg-surface/60 p-2 border border-border/50 text-[11px]">
                      <span className="font-mono font-bold text-accent">Perioperative Hold Schedule: </span>
                      {packet.riskIndexes.sglt2.report.preopSchedule.map((s) => `${s.agentName}: Hold >= ${s.recommendedHoldDays} days prior to major surgery`).join("; ")}
                    </div>
                  )}
                  <div className="mt-1.5 rounded bg-surface/60 p-2 border border-border/50 text-[11px] text-muted">
                    <span className="font-semibold text-fg">Euglycemic DKA Alert: </span>
                    Can present with near-normal glucose and a high anion gap metabolic acidosis. See the Prescribing Information.
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: Collision Triage */}
          <section className="print-break-inside min-w-0 space-y-3">
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-accent" aria-hidden="true" />
              <h3 className="min-w-0 font-serif text-base font-semibold text-fg [overflow-wrap:anywhere]">
                4. Pharmacological Collision Triage ({findings.length} mapped findings)
              </h3>
            </div>

            {findings.length === 0 ? (
              <p className="rounded-lg bg-bg-sunken p-3 text-xs text-muted">
                No mapped collisions identified for the current active regimen. Absence of a mapped collision is not proof of safety.
              </p>
            ) : (
              <div className="space-y-2.5">
                {packet.collisions.contraindicated.map((f) => (
                  <div key={f.id} className="min-w-0 rounded-lg border border-danger/30 bg-danger-soft/20 p-3 text-xs">
                    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
                      <span className="min-w-0 font-semibold text-fg [overflow-wrap:anywhere]">{f.headline}</span>
                      <span className="shrink-0 font-mono text-[10px] uppercase font-bold text-danger">Avoid together</span>
                    </div>
                    <p className="mt-1 text-muted [overflow-wrap:anywhere]">
                      <strong className="text-fg">Mechanism: </strong>
                      {f.mechanism}
                    </p>
                    <p className="mt-0.5 text-fg [overflow-wrap:anywhere]">
                      <strong className="text-accent">Clinical Watch: </strong>
                      {f.clinical}
                    </p>
                    <p className="mt-0.5 text-[11px] text-subtle [overflow-wrap:anywhere]">Source: {findingSourceLine(f)}</p>
                  </div>
                ))}

                {packet.collisions.major.map((f) => (
                  <div key={f.id} className="min-w-0 rounded-lg border border-warn/30 bg-warn-soft/20 p-3 text-xs">
                    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
                      <span className="min-w-0 font-semibold text-fg [overflow-wrap:anywhere]">{f.headline}</span>
                      <span className="shrink-0 font-mono text-[10px] uppercase font-bold text-warn">Serious concern</span>
                    </div>
                    <p className="mt-1 text-muted [overflow-wrap:anywhere]">
                      <strong className="text-fg">Mechanism: </strong>
                      {f.mechanism}
                    </p>
                    <p className="mt-0.5 text-fg [overflow-wrap:anywhere]">
                      <strong className="text-accent">Clinical Watch: </strong>
                      {f.clinical}
                    </p>
                    <p className="mt-0.5 text-[11px] text-subtle [overflow-wrap:anywhere]">Source: {findingSourceLine(f)}</p>
                  </div>
                ))}

                {packet.collisions.moderate.map((f) => (
                  <div key={f.id} className="min-w-0 rounded-lg border border-border bg-bg-sunken p-2.5 text-xs">
                    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
                      <span className="min-w-0 font-medium text-fg [overflow-wrap:anywhere]">{f.headline}</span>
                      <span className="shrink-0 font-mono text-[10px] uppercase text-muted">Use care</span>
                    </div>
                    <p className="mt-0.5 text-muted [overflow-wrap:anywhere]">{f.clinical}</p>
                    <p className="mt-0.5 text-[11px] text-subtle [overflow-wrap:anywhere]">Source: {findingSourceLine(f)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 5: Plain Language Patient Counseling Points */}
          <section className="print-break-inside space-y-2.5">
            <div className="flex items-center gap-2">
              <HeartPulse className="size-4 text-accent" />
              <h3 className="font-serif text-base font-semibold text-fg">5. Patient Counseling Talking Points</h3>
            </div>

            <ul className="list-disc pl-5 space-y-1.5 text-xs leading-relaxed text-fg">
              {packet.counselingPoints.map((pt, idx) => (
                <li key={idx}>{pt}</li>
              ))}
            </ul>
          </section>

          {/* Section 6: Clinician Attestation & Sign-Off Checklist */}
          <section className="print-break-inside space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="size-4 text-accent" />
              <h3 className="font-serif text-base font-semibold text-fg">6. Clinical Verification & Attestation</h3>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              {CHECKLIST_ITEMS.map((item) => {
                const isChecked = Boolean(checkedItems[item.id]);
                const Icon = isChecked ? CheckSquare : Square;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isChecked}
                    onClick={() => toggleCheck(item.id)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                      isChecked ? "border-accent bg-accent-soft/30 text-fg" : "border-border bg-bg-sunken text-muted",
                    )}
                  >
                    <Icon className="size-4 shrink-0 mt-0.5 text-accent" />
                    <span className="leading-snug">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Signature & Attestation Block */}
            <div className="mt-4 rounded-xl border border-border bg-bg-sunken p-4 text-xs space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor="clinician-name" className="block font-mono text-[10px] uppercase text-muted">
                    Reviewing Clinician Name
                  </label>
                  <input
                    id="clinician-name"
                    type="text"
                    placeholder="e.g. Alex Mercer, PharmD, BCPS"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-fg focus:outline-hidden focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label htmlFor="clinician-role" className="block font-mono text-[10px] uppercase text-muted">
                    Credentials / Role
                  </label>
                  <select
                    id="clinician-role"
                    value={reviewerRole}
                    onChange={(e) => setReviewerRole(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-fg focus:outline-hidden focus:ring-1 focus:ring-accent"
                  >
                    <option value="PharmD">PharmD / Clinical Pharmacist</option>
                    <option value="MD/DO">MD / DO Prescribing Physician</option>
                    <option value="NP">NP Nurse Practitioner</option>
                    <option value="PA">PA Physician Assistant</option>
                    <option value="Resident">Clinical Pharmacy Resident</option>
                    <option value="Student">PharmD / Medical Student</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="clinical-notes" className="block font-mono text-[10px] uppercase text-muted">
                  Action Plan & Clinical Discussion Notes
                </label>
                <textarea
                  id="clinical-notes"
                  rows={2}
                  placeholder="e.g., Recommended spacing fluoroquinolone and multivalent cations by 2 hours. Discussed naloxone co-prescription with patient."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-xs text-fg focus:outline-hidden focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="pt-2 text-[11px] text-muted flex flex-wrap items-center justify-between gap-2 border-t border-border">
                <span>Attested on {packet.generatedAt}</span>
                <span className="font-mono text-[10px] text-subtle">FirstPass Desk Review</span>
              </div>
            </div>
          </section>

          <p className="text-[11px] leading-relaxed text-subtle">
            {EXPORT_NOT_A_DOSE} {NOT_CLEARED} {PI_FOOTER}
          </p>
        </div>

        {/* Footer actions */}
        <div className="no-print flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/90 px-4 py-3 sm:px-5 rounded-b-2xl">
          <p className="min-w-0 text-[11px] text-muted">
            Ready to chart? Copy the structured EHR Note to paste directly into Epic, Cerner, or Athena.
          </p>
          <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-auto min-h-[44px] flex-1 whitespace-normal py-2 text-center [overflow-wrap:anywhere] sm:min-h-9 sm:flex-initial"
              onClick={() => copyToClipboard("ehr", packet.ehrNoteText)}
            >
              {copiedState === "ehr" ? "Copied EHR Note!" : "Copy EHR Note"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto min-h-[44px] flex-1 whitespace-normal py-2 text-center [overflow-wrap:anywhere] sm:min-h-9 sm:flex-initial"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

