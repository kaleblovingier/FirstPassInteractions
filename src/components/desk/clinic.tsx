import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { alertsFor } from "@/lib/drugs/alerts";
import { clinicFor, type ClinicCard, type ClinicFlag } from "@/lib/drugs/clinic";
import type { HostContext } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const FLAG_TONE: Record<ClinicFlag, "danger" | "warn" | "ok"> = {
  avoid: "danger",
  caution: "warn",
  ok: "ok",
};

/** Everyday flag words — ids (avoid/caution/ok) unchanged. */
const FLAG_PLAIN: Record<ClinicFlag, string> = {
  avoid: "Steer clear",
  caution: "Watch",
  ok: "Usually fine",
};

function Flag({
  label,
  flag,
  note,
  hot,
}: {
  label: string;
  flag?: ClinicFlag;
  note?: string;
  hot?: boolean;
}) {
  if (!flag) return null;
  return (
    <li className={cn("rounded-md px-3 py-2.5", hot ? "bg-accent-soft" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        <Badge tone={FLAG_TONE[flag]}>{FLAG_PLAIN[flag]}</Badge>
        {hot ? (
          <span className="font-mono text-[10px] uppercase tracking-wide text-accent">matches you</span>
        ) : null}
      </div>
      {note ? <p className="mt-1.5 text-sm leading-relaxed text-fg">{note}</p> : null}
    </li>
  );
}

function DrugClinic({ id, host }: { id: string; host: HostContext }) {
  const drug = DRUG_BY_ID[id];
  const card = clinicFor(id);
  if (!drug || !card) return null;
  return (
    <article>
      <h3 className="font-serif text-lg tracking-tight text-fg">{drug.name}</h3>
      <ul className="mt-2 space-y-2">
        <Flag
          label="Pregnancy"
          flag={card.pregnancy}
          note={card.pregNote}
          hot={host.preg === "pregnant" && (card.pregnancy === "avoid" || card.pregnancy === "caution")}
        />
        <Flag
          label="Breastfeeding"
          flag={card.lactation}
          note={card.lactNote}
          hot={host.preg === "lactating" && card.lactation === "avoid"}
        />
        <Flag
          label="Kidney"
          flag={card.renal}
          note={card.renalNote}
          hot={host.kidney === "ckd" && Boolean(card.renal && card.renal !== "ok")}
        />
        <Flag
          label="Liver"
          flag={card.hepatic}
          note={card.hepNote}
        />
      </ul>
      {card.boxed ? (
        <p className="mt-3 text-sm leading-relaxed text-fg">
          <span className="font-medium">Boxed warning. </span>
          {card.boxed}
        </p>
      ) : null}
      {card.beers ? (
        <p className={cn("mt-2 text-sm leading-relaxed", host.age === "geriatric" ? "text-fg" : "text-muted")}>
          <span className="font-medium">Older adults (Beers). </span>
          {card.beers}
          {host.age === "geriatric" ? (
            <span className="ml-2 font-mono text-[10px] uppercase text-accent">matches you</span>
          ) : null}
        </p>
      ) : null}
      {card.monitor?.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {card.monitor.map((m) => (
            <li key={m}>
              <Badge tone="info">{m}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      {alertsFor(id).length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {alertsFor(id).map((a) => (
            <li key={a.kind}>
              <Badge tone={a.kind === "rems" ? "danger" : a.kind === "niosh" ? "warn" : "info"}>{a.label}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function ClinicPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const present = ids.filter((id) => clinicFor(id));
  const empty = present.length === 0;
  const labs = new Set<string>();
  for (const id of present) {
    for (const m of clinicFor(id)?.monitor ?? []) labs.add(m);
  }

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="rounded-lg border border-accent/15 bg-accent-soft/30 p-3 sm:p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Clinic coach</p>
        <p className="mt-1.5 text-sm leading-relaxed text-fg">
          Teaching notes for clinic staples — pregnancy, breastfeeding, kidney, liver, older-adult (Beers)
          cautions, boxed label language, and labs to watch. Soft chips use everyday words; the mapped notes
          behind them are unchanged.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          An empty or quiet card is not a green light. Flip older adult / reduced kidney / pregnant on the
          person panel to highlight matches. Educational only — not a label, not a dose, and the PI + clinician
          still win.
        </p>
      </div>

      <div className="mt-4">
        <h2 className="font-serif text-lg tracking-tight text-fg">Clinic notes</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Pregnancy · breastfeeding · kidney · liver · older adults · boxed warnings · labs
        </p>
      </div>

      {empty ? (
        <div className="mt-4 rounded-lg border border-border bg-bg-sunken px-4 py-4">
          <p className="text-sm font-medium text-fg">No clinic notes mapped yet</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {ids.length === 0
              ? "Add a medicine on the tray to see pregnancy, kidney, liver, and Beers teaching notes when we have them."
              : "None of the names on this tray have a clinic staple card yet. Empty here is not “safe” — check the Prescribing Information strip and the label."}
          </p>
        </div>
      ) : (
        <>
          {labs.size ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="self-center text-[11px] uppercase tracking-wide text-muted">Labs to watch</span>
              {[...labs].map((m) => (
                <Badge key={m} tone="info">
                  {m}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="mt-4 space-y-6">
            {present.map((id) => (
              <DrugClinic key={id} id={id} host={host} />
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Steer clear / Watch / Usually fine are teaching bins for these notes — not a personal clearance.
            Quiet flags still need the full label.
          </p>
        </>
      )}
    </section>
  );
}

export function clinicPreview(card: ClinicCard): string {
  const bits = [
    card.pregnancy ? `pregnancy ${FLAG_PLAIN[card.pregnancy]}` : "",
    card.renal ? `kidney ${FLAG_PLAIN[card.renal]}` : "",
    card.beers ? "older adults" : "",
    card.boxed ? "boxed warning" : "",
  ].filter(Boolean);
  return bits.join(" · ");
}
