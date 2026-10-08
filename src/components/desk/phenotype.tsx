import {
  AGE_LABEL,
  ALCOHOL_LABEL,
  CANNABIS_ROUTE_LABEL,
  KETAMINE_ROUTE_LABEL,
  KIDNEY_LABEL,
  METABOLIZER_LABEL,
  PHENO_FREQ,
  PHENOTYPE_ENZYMES,
  PREG_LABEL,
  type AgeBand,
  type AlcoholPattern,
  type CannabisRoute,
  type KetamineRoute,
  type KidneyBand,
  type Metabolizer,
  type PhenotypeEnzyme,
  type PregBand,
} from "@/lib/drugs/types";
import {
  alcoholBlurb,
  cannabisRouteBlurb,
  ketamineRouteBlurb,
  phenotypeBlurb,
  smokingBlurb,
} from "@/lib/drugs/host-blurbs";
import {
  AGE_PLAIN,
  ALCOHOL_PLAIN,
  CANNABIS_ROUTE_PLAIN,
  ENZYME_SPEED_HELPER,
  ENZYME_SPEED_TITLE,
  HOST_COACH,
  HOST_SECTION_TITLES,
  KETAMINE_ROUTE_NOTE,
  OTHER_HOST_FACTORS_LINE,
  KETAMINE_ROUTE_PLAIN,
  KIDNEY_PLAIN,
  METABOLIZER_PLAIN,
  PREG_PLAIN,
  SMOKING_PLAIN,
  howCommonLine,
  type PlainTitle,
} from "@/lib/drugs/host-plain";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import { useId } from "react";

const ORDER: Metabolizer[] = ["PM", "IM", "NM", "UM"];
const ROUTES: KetamineRoute[] = ["iv", "in", "oral"];
const CANNABIS: CannabisRoute[] = ["smoked", "oral"];
const ALCOHOL: AlcoholPattern[] = ["off", "acute", "chronic"];
const AGES: AgeBand[] = ["adult", "geriatric"];
const KIDNEYS: KidneyBand[] = ["ok", "ckd"];
const PREGS: PregBand[] = ["off", "pregnant", "lactating"];

const HINT: Record<PhenotypeEnzyme, string> = {
  CYP2D6: "DXM, MDMA, codeine, atomoxetine",
  CYP2C19: "Clobazam, diazepam, citalopram",
  CYP2C9: "Warfarin, phenytoin, edible THC",
  CYP2B6: "Ketamine, bupropion, methadone",
};

/** Plain section title with the scientific term muted beside it. */
function SectionTitle({ title, id }: { title: PlainTitle; id?: string }) {
  return (
    <div id={id} className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-xs font-medium text-fg">{title.plain}</span>
      <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">{title.scientific}</span>
    </div>
  );
}

export function KetamineRouteCard() {
  const ketamineRoute = useDesk((s) => s.ketamineRoute);
  const setKetamineRoute = useDesk((s) => s.setKetamineRoute);
  const uid = useId();
  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h2 id={`${uid}-ketamine`} className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-xs font-medium text-fg">{HOST_SECTION_TITLES.ketamine.plain}</span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">
          {HOST_SECTION_TITLES.ketamine.scientific}
        </span>
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        {KETAMINE_ROUTE_NOTE} {OTHER_HOST_FACTORS_LINE}
      </p>
      <div role="group" aria-labelledby={`${uid}-ketamine`} className="mt-3 grid grid-cols-3 gap-1">
        {ROUTES.map((r) => {
          const on = ketamineRoute === r;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              title={KETAMINE_ROUTE_LABEL[r]}
              onClick={() => setKetamineRoute(r)}
              className={cn(
                "h-10 rounded-sm text-[11px] font-medium",
                on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {KETAMINE_ROUTE_PLAIN[r]}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-1.5 text-xs leading-relaxed text-muted">{ketamineRouteBlurb(ketamineRoute)}</p>
    </div>
  );
}

export function PhenotypeCard({ hideKetamineRoute = false }: { hideKetamineRoute?: boolean }) {
  const phenotypes = useDesk((s) => s.phenotypes);
  const setPhenotype = useDesk((s) => s.setPhenotype);
  const resetPhenotypes = useDesk((s) => s.resetPhenotypes);
  const smoking = useDesk((s) => s.smoking);
  const setSmoking = useDesk((s) => s.setSmoking);
  const ketamineRoute = useDesk((s) => s.ketamineRoute);
  const setKetamineRoute = useDesk((s) => s.setKetamineRoute);
  const cannabisRoute = useDesk((s) => s.cannabisRoute);
  const setCannabisRoute = useDesk((s) => s.setCannabisRoute);
  const alcohol = useDesk((s) => s.alcohol);
  const setAlcohol = useDesk((s) => s.setAlcohol);
  const age = useDesk((s) => s.age);
  const setAge = useDesk((s) => s.setAge);
  const kidney = useDesk((s) => s.kidney);
  const setKidney = useDesk((s) => s.setKidney);
  const preg = useDesk((s) => s.preg);
  const setPreg = useDesk((s) => s.setPreg);
  const uid = useId();
  const dirty =
    PHENOTYPE_ENZYMES.some((e) => phenotypes[e] !== "NM") ||
    smoking ||
    ketamineRoute !== "iv" ||
    cannabisRoute !== "smoked" ||
    alcohol !== "off" ||
    age !== "adult" ||
    kidney !== "ok" ||
    preg !== "off";

  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xs font-medium text-fg">{HOST_COACH.title.plain}</span>
          <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">
            {HOST_COACH.title.scientific}
          </span>
        </h2>
        {dirty ? (
          <button
            type="button"
            onClick={resetPhenotypes}
            className="text-[11px] font-medium text-accent underline underline-offset-2"
          >
            Reset
          </button>
        ) : null}
      </div>
      <div
        className="mt-2 rounded-lg border border-accent/15 bg-accent-soft/30 p-3"
        role="note"
        aria-label="Host factors coach"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{HOST_COACH.kicker}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-fg">{HOST_COACH.body}</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{HOST_COACH.how}</p>
      </div>
      {!dirty ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted">{HOST_COACH.empty}</p>
      ) : null}
      <div className="mt-3">
        <SectionTitle title={ENZYME_SPEED_TITLE} />
        <p className="mt-1 text-[11px] leading-relaxed text-muted">{ENZYME_SPEED_HELPER}</p>
      </div>
      <ul className="mt-2 space-y-3">
        {PHENOTYPE_ENZYMES.map((enzyme) => {
          const gloss = phenotypeBlurb(phenotypes[enzyme]);
          return (
          <li key={enzyme}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span id={`${uid}-${enzyme}`} className="font-mono text-xs text-fg">{enzyme}</span>
                <button
                  type="button"
                  title={`Open ${enzyme} in the atlas`}
                  onClick={() => useDesk.getState().setAtlasEnzyme(enzyme)}
                  className="h-8 shrink-0 rounded-full bg-bg-sunken px-2 text-[10px] font-medium text-muted"
                >
                  Atlas
                </button>
              </div>
              <span className="truncate text-[10px] text-subtle">{HINT[enzyme]}</span>
            </div>
            <div role="group" aria-labelledby={`${uid}-${enzyme}`} className="mt-1.5 grid grid-cols-4 gap-1">
              {ORDER.map((m) => {
                const on = phenotypes[enzyme] === m;
                const freq = PHENO_FREQ[enzyme][m];
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    title={freq ? `${m} · ${METABOLIZER_LABEL[m]} · ${freq}` : `${m} · ${METABOLIZER_LABEL[m]}`}
                    onClick={() => setPhenotype(enzyme, m)}
                    className={cn(
                      "flex h-11 flex-col items-center justify-center rounded-sm px-0.5 text-[10px] font-medium leading-tight",
                      on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                    )}
                  >
                    <span>{METABOLIZER_PLAIN[m]}</span>
                    <span className="font-mono text-[9px]">{m}</span>
                  </button>
                );
              })}
            </div>
            <div aria-live="polite">
            {phenotypes[enzyme] !== "NM" && PHENO_FREQ[enzyme][phenotypes[enzyme]] ? (
              <p className="mt-1 text-[10px] text-subtle">
                {howCommonLine(PHENO_FREQ[enzyme][phenotypes[enzyme]]!)}
              </p>
            ) : null}
            {gloss ? <p className="mt-1 text-xs leading-relaxed text-muted">{gloss}</p> : null}
            </div>
          </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-border pt-3">
        <SectionTitle id={`${uid}-smoking`} title={HOST_SECTION_TITLES.smoking} />
        <div role="group" aria-labelledby={`${uid}-smoking`} className="mt-1.5 grid grid-cols-2 gap-1">
          <button
            type="button"
            aria-pressed={!smoking}
            onClick={() => setSmoking(false)}
            className={cn(
              "h-10 rounded-sm text-[11px] font-medium",
              !smoking ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            {SMOKING_PLAIN.off}
          </button>
          <button
            type="button"
            aria-pressed={smoking}
            onClick={() => setSmoking(true)}
            className={cn(
              "h-10 rounded-sm text-[11px] font-medium",
              smoking ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            {SMOKING_PLAIN.on}
          </button>
        </div>
        <p aria-live="polite" className="mt-1.5 text-xs leading-relaxed text-muted">{smokingBlurb(smoking)}</p>
      </div>

      <div className="mt-3">
        <SectionTitle id={`${uid}-alcohol`} title={HOST_SECTION_TITLES.alcohol} />
        <div role="group" aria-labelledby={`${uid}-alcohol`} className="mt-1.5 grid grid-cols-3 gap-1">
          {ALCOHOL.map((a) => {
            const on = alcohol === a;
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                title={ALCOHOL_LABEL[a]}
                onClick={() => setAlcohol(a)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {ALCOHOL_PLAIN[a]}
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="mt-1.5 text-xs leading-relaxed text-muted">{alcoholBlurb(alcohol)}</p>
      </div>

      {!hideKetamineRoute ? (
      <div className="mt-3">
        <SectionTitle id={`${uid}-ketamine`} title={HOST_SECTION_TITLES.ketamine} />
        <p className="mt-0.5 text-[10px] text-subtle">{KETAMINE_ROUTE_NOTE}</p>
        <div role="group" aria-labelledby={`${uid}-ketamine`} className="mt-1.5 grid grid-cols-3 gap-1">
          {ROUTES.map((r) => {
            const on = ketamineRoute === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                title={KETAMINE_ROUTE_LABEL[r]}
                onClick={() => setKetamineRoute(r)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {KETAMINE_ROUTE_PLAIN[r]}
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="mt-1.5 text-xs leading-relaxed text-muted">{ketamineRouteBlurb(ketamineRoute)}</p>
      </div>
      ) : null}

      <div className="mt-3">
        <SectionTitle id={`${uid}-cannabis`} title={HOST_SECTION_TITLES.cannabis} />
        <div role="group" aria-labelledby={`${uid}-cannabis`} className="mt-1.5 grid grid-cols-2 gap-1">
          {CANNABIS.map((r) => {
            const on = cannabisRoute === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                title={CANNABIS_ROUTE_LABEL[r]}
                onClick={() => setCannabisRoute(r)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {CANNABIS_ROUTE_PLAIN[r]}
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="mt-1.5 text-xs leading-relaxed text-muted">{cannabisRouteBlurb(cannabisRoute)}</p>
      </div>

      <div className="mt-3">
        <SectionTitle id={`${uid}-age`} title={HOST_SECTION_TITLES.age} />
        <div role="group" aria-labelledby={`${uid}-age`} className="mt-1.5 grid grid-cols-2 gap-1">
          {AGES.map((a) => {
            const on = age === a;
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                title={AGE_LABEL[a]}
                onClick={() => setAge(a)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {AGE_PLAIN[a]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <SectionTitle id={`${uid}-kidney`} title={HOST_SECTION_TITLES.kidney} />
        <div role="group" aria-labelledby={`${uid}-kidney`} className="mt-1.5 grid grid-cols-2 gap-1">
          {KIDNEYS.map((k) => {
            const on = kidney === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                title={KIDNEY_LABEL[k]}
                onClick={() => setKidney(k)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {KIDNEY_PLAIN[k]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <SectionTitle id={`${uid}-preg`} title={HOST_SECTION_TITLES.preg} />
        <div role="group" aria-labelledby={`${uid}-preg`} className="mt-1.5 grid grid-cols-3 gap-1">
          {PREGS.map((p) => {
            const on = preg === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                title={PREG_LABEL[p]}
                onClick={() => setPreg(p)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {PREG_PLAIN[p]}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-subtle">
        {HOST_COACH.footer}
      </p>
    </div>
  );
}
