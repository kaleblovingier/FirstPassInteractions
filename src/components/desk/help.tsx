import { MEDICATION_OPTIONS } from "@/lib/drugs/help-resources";
import { HELP_PATH, HELP_URL } from "@/lib/seo/help";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The desk's Find help tab: a link to the public /help page, and the MOUD comparison for clinicians. */
export function HelpPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-surface px-5 py-5 shadow-[var(--shadow-border)] sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Find help</p>
        <h1 className="mt-2 font-serif text-2xl tracking-tight text-fg sm:text-3xl">
          Help for patients and families is a public page
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Crisis lines, a treatment locator by ZIP or state, free naloxone, Never Use Alone, and overdose
          response steps, written for anyone. It has no regimen on it, no combination check, and no sign-up,
          so the link can go to a patient or a family member.
        </p>
        <a href={HELP_PATH} className={cn(buttonVariants(), "mt-4")}>
          Open Find help
        </a>
        <p className="mt-2 text-xs text-muted">
          Link to share: <span className="font-mono [overflow-wrap:anywhere]">{HELP_URL}</span>
        </p>
      </section>

      <section aria-labelledby="medications-heading" className="space-y-4">
        <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
          <h2 id="medications-heading" className="font-serif text-2xl tracking-tight text-fg">
            Medications for Opioid & Alcohol Use Disorder
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Medications for Opioid Use Disorder (MOUD / MAT) reduce mortality by more than 50%, cut cravings,
            and normalize brain chemistry so individuals can rebuild their lives. Under the federal MAT Act, any
            DEA-licensed clinician (MD, DO, NP, PA) can prescribe buprenorphine without special waivers.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MEDICATION_OPTIONS.map((med) => (
            <div key={med.id} className="flex flex-col rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <h3 className="font-serif text-lg font-medium text-fg">{med.name}</h3>
                <Badge tone="accent">{med.type}</Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-fg">{med.howItWorks}</p>
              <div className="mt-3 flex-1 space-y-2 rounded-lg bg-bg-sunken p-3 text-xs leading-relaxed">
                <p>
                  <span className="font-semibold text-fg">Setting:</span> {med.setting}
                </p>
                <p>
                  <span className="font-semibold text-fg">Clinical note:</span> {med.pearls}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-accent-soft p-4 text-xs leading-relaxed text-ink">
          <span className="font-semibold">Taking medications is not "replacing one drug with another":</span> Medical
          evidence across decades proves that MOUD saves lives, prevents fatal overdoses, cuts HIV/HCV transmission,
          and restores cognitive and emotional stability.
        </div>
      </section>
    </div>
  );
}
