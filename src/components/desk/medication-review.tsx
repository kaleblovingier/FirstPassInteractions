import { useState } from "react";
import { CheckSquare, Square } from "lucide-react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { alertsOnDesk } from "@/lib/drugs/alerts";
import {
  AGE_LABEL,
  ALCOHOL_LABEL,
  CANNABIS_ROUTE_LABEL,
  KETAMINE_ROUTE_LABEL,
  KIDNEY_LABEL,
  METABOLIZER_LABEL,
  PHENOTYPE_ENZYMES,
  PREG_LABEL,
  SEVERITY_LABEL,
  ITEM_KIND_LABEL,
  type Finding,
  type HostContext,
} from "@/lib/drugs/types";
import { cn } from "@/lib/utils";

interface MedicationReviewProps {
  ids: string[];
  host: HostContext;
  findings: Finding[];
  doses: Record<string, string>;
}

export function MedicationReview({ ids, host, findings, doses }: MedicationReviewProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showRemainingOnly, setShowRemainingOnly] = useState(false);
  const highAlertItems = alertsOnDesk(ids);
  const alertCount = highAlertItems.reduce((count, row) => count + row.flags.length, 0);
  const researchPeptides = ids
    .map((id) => DRUG_BY_ID[id])
    .filter((item) => item?.kind === "research-peptide");
  const hasBpc157 = researchPeptides.some((item) => item.id === "bpc-157");
  const highest = findings[0];
  const checks = [
    {
      id: "reconcile",
      title: "Reconcile the real regimen",
      detail: "Confirm ingredient, strength, dose, route, schedule, last dose, and recent starts or stops—including OTC products and supplements.",
    },
    {
      id: "duplicates",
      title: "Screen for duplicate ingredients and combination products",
      detail: "Compare active ingredients across generic and brand names, scheduled and PRN medicines, OTC products, and combinations. Confirm intent before treating an overlap as an error.",
    },
    {
      id: "allergies",
      title: "Review allergies and prior adverse drug reactions",
      detail: "Confirm the substance, reaction, severity, and timing. Unknown or undocumented allergy status is not the same as no known allergies.",
    },
    {
      id: "context",
      title: "Verify patient-specific context",
      detail: "Confirm the relevant history and patient factors with the care team. This desk models only the context shown in its controls.",
    },
    ...(alertCount > 0
      ? [
          {
            id: "safety-programs",
            title: "Verify medication safety-program flags",
            detail: `Check the current handling or program guidance for ${highAlertItems
              .map((row) => {
                const itemName = DRUG_BY_ID[row.id]?.name ?? row.id;
                return `${itemName} (${row.flags.map((flag) => flag.label).join(", ")})`;
              })
              .join("; ")}. This desk's flag list is incomplete and is not an interaction finding.`,
          },
        ]
      : []),
    ...(researchPeptides.length
      ? [
          {
            id: "research-peptide-evidence",
            title: "Review research-peptide uncertainty",
            detail: `${researchPeptides.map((item) => item.name).join(", ")} have no validated interaction grade in this tool. Verify exact identity, formulation, route, source and quality, available human evidence, and applicable regulatory status. An empty map is not evidence of safety.`,
          },
        ]
      : []),
    ...(highest
      ? [
          {
            id: "finding",
            title: "Review the strongest mapped finding",
            detail: `${SEVERITY_LABEL[highest.severity]} — ${highest.headline}. A category from this model is not an individual risk estimate.`,
          },
        ]
      : [
          {
            id: "coverage",
            title: "Check coverage limitations",
            detail: "No mapped finding is not proof of safety. Confirm all products are represented and consult appropriate references.",
          },
        ]),
    {
      id: "label",
      title: "Verify current primary sources",
      detail: "Check current FDA-approved Prescribing Information and relevant primary references before drawing a clinical conclusion.",
    },
    {
      id: "decision",
      title: "Make and document an independent clinical assessment",
      detail: "This teaching tool does not choose a dose, treatment, monitoring schedule, or next clinical step.",
    },
  ];
  const completedChecks = checks.filter((check) => checked[check.id]).length;
  const completedItems = ids.filter((id) => checked[`item:${id}`]).length;
  const completed = completedChecks + completedItems;
  const totalChecks = checks.length + ids.length;
  const remaining = totalChecks - completed;
  const visibleIds = showRemainingOnly
    ? ids.filter((id) => !checked[`item:${id}`])
    : ids;
  const visibleChecks = showRemainingOnly
    ? checks.filter((check) => !checked[check.id])
    : checks;
  const modeledContext = [
    `Age: ${AGE_LABEL[host.age ?? "adult"]}`,
    `Kidney: ${KIDNEY_LABEL[host.kidney ?? "ok"]}`,
    `Pregnancy/lactation: ${PREG_LABEL[host.preg ?? "off"]}`,
    `Alcohol: ${ALCOHOL_LABEL[host.alcohol]}`,
    `Smoking: ${host.smoking ? "Daily" : "Off"}`,
    `Cannabis route: ${CANNABIS_ROUTE_LABEL[host.cannabisRoute]}`,
    `Ketamine route: ${KETAMINE_ROUTE_LABEL[host.ketamineRoute]}`,
    ...PHENOTYPE_ENZYMES.map(
      (enzyme) => `${enzyme}: ${METABOLIZER_LABEL[host.phenotypes[enzyme]]}`,
    ),
  ];

  function toggle(id: string) {
    setChecked((current) => ({ ...current, [id]: !current[id] }));
  }

  function resetChecks() {
    setChecked({});
  }

  return (
    <section aria-labelledby="medication-review-title" className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">Clinical workflow</p>
          <h2 id="medication-review-title" className="mt-1 font-serif text-xl tracking-tight text-fg">
            Medication review
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            A verification aid, not an order set or patient record. Checkmarks are temporary and reset when the regimen or modeled context changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-bg-sunken px-2.5 py-1 font-mono text-[10px] text-muted" aria-live="polite">
            {completed}/{totalChecks} reviewed
          </span>
          {completed > 0 ? (
            <>
              <button
                type="button"
                aria-pressed={showRemainingOnly}
                onClick={() => setShowRemainingOnly((current) => !current)}
                className="min-h-8 rounded-full px-2.5 text-[11px] font-medium text-muted hover:bg-bg-sunken hover:text-fg"
              >
                {showRemainingOnly ? "Show all items" : `Show remaining (${remaining})`}
              </button>
              <button
                type="button"
                onClick={resetChecks}
                className="min-h-8 rounded-full px-2.5 text-[11px] font-medium text-muted hover:bg-bg-sunken hover:text-fg"
              >
                Reset review
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Medication review progress"
        aria-valuemin={0}
        aria-valuemax={totalChecks}
        aria-valuenow={completed}
        aria-valuetext={`${completed} of ${totalChecks} review items complete`}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-sunken"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${(completed / totalChecks) * 100}%` }}
        />
      </div>

      <div className="mt-3 rounded-lg bg-bg-sunken px-3 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Modeled desk context</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {modeledContext.map((label) => (
            <li key={label} className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-fg">
              {label}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          These are desk settings, not verified patient data. CYP phenotype frequencies, where shown in other views, are population estimates—not an individual test result.
        </p>
      </div>

      {hasBpc157 ? (
        <aside className="mt-4 rounded-lg border border-warn/30 bg-warn-soft/40 px-3 py-2.5">
          <p className="text-xs font-medium text-fg">BPC-157: FDA compounding-risk context</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            FDA identifies potential immunogenicity risks for certain routes, peptide impurity and API-characterization complexities, and limited safety information for proposed routes. This review concerns proposed compounding bulk substance; it is not a product-specific analysis or an interaction assessment.
          </p>
          <a
            className="mt-2 inline-flex min-h-8 items-center text-xs font-medium text-accent underline underline-offset-2"
            href="https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks"
            target="_blank"
            rel="noreferrer"
          >
            Read FDA’s review
          </a>
        </aside>
      ) : null}

      {alertCount > 0 ? (
        <div className="mt-4 rounded-lg border border-warn/20 bg-warn-soft/40 px-3 py-2.5">
          <p className="text-xs font-medium text-fg">Additional medication flags on this desk</p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {highAlertItems.flatMap(({ id, flags }) =>
              flags.map((flag) => (
                <li key={`${id}-${flag.kind}`} className="text-xs text-muted">
                  {flag.label}: {id}
                </li>
              )),
            )}
          </ul>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            These flags are prompts to verify the relevant program or handling guidance; they are not interaction findings.
          </p>
        </div>
      ) : null}

      <div className="mt-4">
        <h3 className="font-mono text-[10px] uppercase tracking-wide text-muted">
          Confirm each desk item against the real regimen
        </h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {visibleIds.map((id) => {
            const item = DRUG_BY_ID[id];
            const enteredDose = doses[id]?.trim();
            const isChecked = Boolean(checked[`item:${id}`]);
            const Icon = isChecked ? CheckSquare : Square;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={isChecked}
                  onClick={() => toggle(`item:${id}`)}
                  className={cn(
                    "flex min-h-16 w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    isChecked
                      ? "border-accent bg-accent-soft/40"
                      : "border-subtle bg-bg-sunken hover:border-accent",
                  )}
                >
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-fg">{item?.name ?? id}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      {item
                        ? `${ITEM_KIND_LABEL[item.kind]} · ${item.cls}`
                        : "Confirm identity and formulation"}
                      {item?.brands[0] ? ` · Brand example: ${item.brands[0]}` : ""}
                    </span>
                    {item?.kind === "drug" ? (
                      <span className="mt-1 block font-mono text-[11px] text-subtle">
                        {enteredDose
                          ? `Desk-entered value: ${enteredDose} · verify dose, units, formulation, and source`
                          : "No dose entered on this desk · confirm whether applicable and verify dose, units, formulation, route, schedule, and source"}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          A checked item means it was reviewed in this browser only. It does not confirm adherence, dispense history, or clinical appropriateness.
        </p>
      </div>

      {showRemainingOnly && remaining === 0 ? (
        <p className="mt-4 rounded-lg bg-bg-sunken px-3 py-2.5 text-xs leading-relaxed text-muted" role="status">
          All listed items are marked reviewed. Marks are temporary and do not confirm clinical appropriateness.
        </p>
      ) : null}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {visibleChecks.map((check) => {
          const Icon = checked[check.id] ? CheckSquare : Square;
          return (
            <li key={check.id}>
              <button
                type="button"
                aria-pressed={Boolean(checked[check.id])}
                onClick={() => toggle(check.id)}
                className={cn(
                  "flex min-h-16 w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  checked[check.id]
                    ? "border-accent bg-accent-soft/40"
                    : "border-subtle bg-bg-sunken hover:border-accent",
                )}
              >
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  <span className="block text-xs font-medium text-fg">{check.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">{check.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
