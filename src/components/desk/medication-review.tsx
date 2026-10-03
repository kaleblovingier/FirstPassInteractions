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
  const highAlertItems = alertsOnDesk(ids);
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
  const alertCount = highAlertItems.reduce((count, row) => count + row.flags.length, 0);
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
        <span className="rounded-full bg-bg-sunken px-2.5 py-1 font-mono text-[10px] text-muted" aria-live="polite">
          {completed}/{totalChecks} reviewed
        </span>
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
          {ids.map((id) => {
            const item = DRUG_BY_ID[id];
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
                        ? `${item.kind === "drug" ? "Medicine" : item.kind === "food" ? "Food" : "Herb"} · ${item.cls}`
                        : "Confirm identity and formulation"}
                      {item?.brands[0] ? ` · Brand example: ${item.brands[0]}` : ""}
                    </span>
                    {item?.kind === "drug" && doses[id] ? (
                      <span className="mt-1 block font-mono text-[11px] text-subtle">
                        Desk-entered value: {doses[id]} · verify dose, units, formulation, and source
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

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {checks.map((check) => {
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
