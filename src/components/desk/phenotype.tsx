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
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";

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

export function KetamineRouteCard() {
  const ketamineRoute = useDesk((s) => s.ketamineRoute);
  const setKetamineRoute = useDesk((s) => s.setKetamineRoute);
  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Ketamine route</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        Free teaching control — oral × grapefruit is the first-pass demo. Other host factors stay Pro.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1">
        {ROUTES.map((r) => {
          const on = ketamineRoute === r;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              onClick={() => setKetamineRoute(r)}
              className={cn(
                "h-10 rounded-sm text-[11px] font-medium",
                on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {KETAMINE_ROUTE_LABEL[r]}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{ketamineRouteBlurb(ketamineRoute)}</p>
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
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Host factors</h2>
        {dirty ? (
          <button
            type="button"
            onClick={resetPhenotypes}
            className="text-[11px] font-medium text-accent hover:underline"
          >
            Reset
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        A poor metabolizer acts like a strong inhibitor of that enzyme. Smoke induces 1A2. Chronic
        alcohol induces 2E1. Older age, CKD, and pregnancy score Beers / renal / teratogen cards.
      </p>
      <ul className="mt-3 space-y-3">
        {PHENOTYPE_ENZYMES.map((enzyme) => {
          const gloss = phenotypeBlurb(phenotypes[enzyme]);
          return (
          <li key={enzyme}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-xs text-fg">{enzyme}</span>
              <span className="truncate text-[10px] text-subtle">{HINT[enzyme]}</span>
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-1">
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
                    <span>{METABOLIZER_LABEL[m]}</span>
                    <span className="font-mono text-[9px] opacity-70">{m}</span>
                  </button>
                );
              })}
            </div>
            {phenotypes[enzyme] !== "NM" && PHENO_FREQ[enzyme][phenotypes[enzyme]] ? (
              <p className="mt-1 text-[10px] text-subtle">{PHENO_FREQ[enzyme][phenotypes[enzyme]]}</p>
            ) : null}
            {gloss ? <p className="mt-1 text-xs leading-relaxed text-muted">{gloss}</p> : null}
          </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-border pt-3">
        <div className="text-xs font-medium text-fg">Tobacco smoke</div>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          <button
            type="button"
            aria-pressed={!smoking}
            onClick={() => setSmoking(false)}
            className={cn(
              "h-10 rounded-sm text-[11px] font-medium",
              !smoking ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            Off
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
            Daily · 1A2
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{smokingBlurb(smoking)}</p>
      </div>

      <div className="mt-3">
        <div className="text-xs font-medium text-fg">Alcohol pattern</div>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {ALCOHOL.map((a) => {
            const on = alcohol === a;
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => setAlcohol(a)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {ALCOHOL_LABEL[a]}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{alcoholBlurb(alcohol)}</p>
      </div>

      {!hideKetamineRoute ? (
      <div className="mt-3">
        <div className="text-xs font-medium text-fg">Ketamine route</div>
        <p className="mt-0.5 text-[10px] text-subtle">Free on this desk — oral × grapefruit is the teaching demo.</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {ROUTES.map((r) => {
            const on = ketamineRoute === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => setKetamineRoute(r)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {KETAMINE_ROUTE_LABEL[r]}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{ketamineRouteBlurb(ketamineRoute)}</p>
      </div>
      ) : null}

      <div className="mt-3">
        <div className="text-xs font-medium text-fg">Cannabis route</div>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {CANNABIS.map((r) => {
            const on = cannabisRoute === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => setCannabisRoute(r)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {CANNABIS_ROUTE_LABEL[r]}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{cannabisRouteBlurb(cannabisRoute)}</p>
      </div>

      <div className="mt-3">
        <div className="text-xs font-medium text-fg">Age</div>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {AGES.map((a) => {
            const on = age === a;
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() => setAge(a)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {AGE_LABEL[a]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs font-medium text-fg">Kidney</div>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {KIDNEYS.map((k) => {
            const on = kidney === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setKidney(k)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {KIDNEY_LABEL[k]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs font-medium text-fg">Pregnancy / lactation</div>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {PREGS.map((p) => {
            const on = preg === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => setPreg(p)}
                className={cn(
                  "h-10 rounded-sm text-[11px] font-medium",
                  on ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {PREG_LABEL[p]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
