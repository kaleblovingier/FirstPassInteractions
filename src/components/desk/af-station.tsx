import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import type { Sex } from "@/lib/drugs/bedside";
import type { DoacRenalRail } from "@/lib/drugs/doac";
import {
  AF_CITATIONS,
  AF_DISCLAIMER,
  afDoacDosing,
  afReportOnDesk,
  cha2ds2Va,
  chads2Vasc,
  hasBled,
  trayBleedModifiers,
  type BleedScoreItem,
  type Modifiability,
  type ScoreItem,
  type StrokeScoreResult,
} from "@/lib/drugs/af-stroke-bleed";

const selectClass =
  "mt-1 h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

const TIER_TONE: Record<string, "danger" | "warn" | "ok"> = {
  recommended: "danger",
  reasonable: "warn",
  consider: "warn",
  "not-recommended": "ok",
};

const TIER_LABEL: Record<string, string> = {
  recommended: "Anticoagulation recommended",
  reasonable: "Reasonable to consider",
  consider: "Should be considered",
  "not-recommended": "Not recommended",
};

const RAIL_TONE: Record<DoacRenalRail["status"], "ok" | "warn" | "danger"> = {
  standard: "ok",
  reduced: "warn",
  caution: "warn",
  avoid: "danger",
  "black-box": "danger",
};

const RAIL_LABEL: Record<DoacRenalRail["status"], string> = {
  standard: "Standard",
  reduced: "Reduced",
  caution: "Caution",
  avoid: "Avoid",
  "black-box": "Boxed warning",
};

/** Apixaban: the ABC rule, not CrCl alone, decides the dose; show Reduced when two or more criteria are met. */
function railStatusOf(r: { rail: DoacRenalRail; abc?: { criteriaMetCount: number } | null }): DoacRenalRail["status"] {
  return r.abc && r.abc.criteriaMetCount >= 2 && r.rail.status === "caution" ? "reduced" : r.rail.status;
}

const MOD_LABEL: Record<Modifiability, string> = {
  modifiable: "Modifiable",
  partly: "Partly modifiable",
  fixed: "Fixed",
};

function num(s: string): number {
  if (s.trim() === "") return Number.NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
}

function Check({
  id,
  label,
  hint,
  checked,
  onChange,
  points,
  highlight,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  points: number;
  highlight?: boolean;
  disabled?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2",
        highlight ? "border-warn bg-warn-soft" : "border-border bg-surface",
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-accent"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <label htmlFor={id} className="min-w-0 flex-1 text-sm text-fg">
        {label}
        {hint ? <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span> : null}
      </label>
      <span className="shrink-0 whitespace-nowrap font-mono text-sm text-muted">+{points}</span>
    </li>
  );
}

function Breakdown({ title, result }: { title: string; result: StrokeScoreResult<string> }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h5 className="font-serif text-base text-fg">{title}</h5>
        <span className="whitespace-nowrap font-mono text-2xl text-fg">
          {result.score}
          <span className="text-sm text-subtle"> / {result.max}</span>
        </span>
      </div>
      <Badge tone={TIER_TONE[result.tier]} className="mt-1">
        {TIER_LABEL[result.tier]}
      </Badge>
      <dl className="mt-3">
        {result.items.map((i: ScoreItem) => (
          <div key={i.key} className="flex items-baseline justify-between gap-3 border-b border-border py-1 last:border-b-0">
            <dt className={cn("min-w-0 text-xs", i.met ? "text-fg" : "text-subtle")}>
              <span className="font-mono text-accent">{i.letter}</span> {i.label}
            </dt>
            <dd className={cn("shrink-0 whitespace-nowrap font-mono text-xs", i.met ? "text-fg" : "text-subtle")}>
              {i.points} / {i.maxPoints}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-fg">{result.recommendation}</p>
      <p className="mt-1 text-xs text-subtle">{result.source}</p>
    </div>
  );
}

export function AfPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const report = useMemo(() => afReportOnDesk(ids, host), [ids, host]);
  const tray = useMemo(() => trayBleedModifiers(ids), [ids]);
  // The triple-therapy note already shows in the net view.
  const footerNotes = report.notes.filter((n) => n !== tray.tripleTherapyNote);

  // Shared patient
  const [age, setAge] = useState(host.age === "geriatric" ? "78" : "68");
  const [sex, setSex] = useState<Sex>("female");

  // Stroke
  const [chf, setChf] = useState(false);
  const [htn, setHtn] = useState(true);
  const [dm, setDm] = useState(false);
  const [strokeTia, setStrokeTia] = useState(false);
  const [vascular, setVascular] = useState(false);

  // Bleed
  const [uncontrolledHtn, setUncontrolledHtn] = useState(false);
  const [renal, setRenal] = useState(false);
  const [liver, setLiver] = useState(false);
  const [bleeding, setBleeding] = useState(false);
  const [labileInr, setLabileInr] = useState(false);
  const [onVka, setOnVka] = useState(tray.autoFill.onVka);
  const [drugs, setDrugs] = useState(tray.autoFill.antiplateletOrNsaid);
  const [alcohol, setAlcohol] = useState(host.alcohol === "chronic");

  useEffect(() => setDrugs(tray.autoFill.antiplateletOrNsaid), [tray.autoFill.antiplateletOrNsaid]);
  useEffect(() => setOnVka(tray.autoFill.onVka), [tray.autoFill.onVka]);
  useEffect(() => setAlcohol(host.alcohol === "chronic"), [host.alcohol]);

  // DOAC rails
  const [weight, setWeight] = useState("70");
  const [scr, setScr] = useState("1.1");

  const ageN = num(age);
  const strokeInput = { ageYears: ageN, sex, chf, hypertension: htn, diabetes: dm, strokeTia, vascular };
  const vasc = chads2Vasc(strokeInput);
  const va = cha2ds2Va(strokeInput);
  const bled = hasBled({
    uncontrolledHtn,
    abnormalRenal: renal,
    abnormalLiver: liver,
    stroke: strokeTia,
    bleeding,
    labileInr,
    onVka,
    ageYears: ageN,
    antiplateletOrNsaid: drugs,
    alcohol,
  });
  const dosing = afDoacDosing({ ageYears: ageN, weightKg: num(weight), scrMgDl: num(scr), sex });

  const bledByKey = Object.fromEntries(bled.items.map((i) => [i.key, i])) as Record<string, BleedScoreItem>;
  const hl = (k: string) => bledByKey[k].met && bledByKey[k].modifiability !== "fixed";
  const strokeHigh = vasc.tier === "recommended" || va.tier === "recommended";

  const reset = () => {
    setChf(false);
    setHtn(false);
    setDm(false);
    setStrokeTia(false);
    setVascular(false);
    setUncontrolledHtn(false);
    setRenal(false);
    setLiver(false);
    setBleeding(false);
    setLabileInr(false);
  };

  const ageField = (id: string) => (
    <div>
      <label htmlFor={id} className="text-xs text-muted">
        Age (years)
      </label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={18}
        max={110}
        value={age}
        onChange={(e) => setAge(e.target.value)}
        className="mt-1 font-mono"
      />
    </div>
  );
  const sexField = (id: string) => (
    <div>
      <label htmlFor={id} className="text-xs text-muted">
        Sex
      </label>
      <select id={id} className={selectClass} value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
        <option value="female">Female</option>
        <option value="male">Male</option>
      </select>
    </div>
  );

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Atrial fibrillation</p>
        <h3 className="mt-1 font-serif text-lg tracking-tight text-fg">AF stroke &amp; bleed</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Score stroke risk and bleed risk side by side. The bleed score tells you what to fix. It does not, on its own,
          tell you to skip stroke prevention.
        </p>
      </div>

      {/* Stroke risk */}
      <section className="space-y-3" aria-labelledby="af-stroke-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 id="af-stroke-h" className="font-serif text-base text-fg">
            Stroke risk
          </h4>
          <Button size="sm" variant="ghost" onClick={reset}>
            Clear checkboxes
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ageField("af-age")}
          {sexField("af-sex")}
        </div>
        <ul className="space-y-2">
          <Check id="af-chf" label="Heart failure or LV dysfunction" checked={chf} onChange={setChf} points={1} />
          <Check id="af-htn" label="Hypertension" checked={htn} onChange={setHtn} points={1} />
          <Check id="af-dm" label="Diabetes" checked={dm} onChange={setDm} points={1} />
          <Check
            id="af-stroke"
            label="Prior stroke, TIA, or thromboembolism"
            hint="Also fills HAS-BLED's stroke item."
            checked={strokeTia}
            onChange={setStrokeTia}
            points={2}
          />
          <Check
            id="af-vasc"
            label="Vascular disease"
            hint="Prior MI, peripheral artery disease, or aortic plaque."
            checked={vascular}
            onChange={setVascular}
            points={1}
          />
        </ul>
        <p className="text-xs leading-relaxed text-subtle">Age is scored from the age field: 65–74 is 1 point, 75 or older is 2.</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Breakdown title="CHA2DS2-VASc" result={vasc} />
          <Breakdown title="CHA2DS2-VA" result={va} />
        </div>
        <ul className="space-y-1">
          {[...vasc.notes, ...va.notes].map((n) => (
            <li key={n} className="text-xs leading-relaxed text-muted">
              {n}
            </li>
          ))}
        </ul>
      </section>

      {/* Bleed risk */}
      <section className="space-y-3" aria-labelledby="af-bleed-h">
        <h4 id="af-bleed-h" className="font-serif text-base text-fg">
          Bleed risk
        </h4>
        <p className="text-xs leading-relaxed text-muted">
          Highlighted rows are met and can be acted on. Age and stroke come from the section above.
        </p>
        <ul className="space-y-2">
          <Check id="hb-htn" label="Uncontrolled hypertension (SBP >160)" checked={uncontrolledHtn} onChange={setUncontrolledHtn} points={1} highlight={hl("htn")} />
          <Check id="hb-renal" label="Abnormal renal function" hint={bledByKey.renal.note} checked={renal} onChange={setRenal} points={1} highlight={hl("renal")} />
          <Check id="hb-liver" label="Abnormal liver function" hint={bledByKey.liver.note} checked={liver} onChange={setLiver} points={1} highlight={hl("liver")} />
          <Check id="hb-stroke" label="Prior stroke (from stroke risk)" checked={strokeTia} points={1} disabled />
          <Check id="hb-bleed" label="Bleeding history or predisposition" hint={bledByKey.bleed.note} checked={bleeding} onChange={setBleeding} points={1} highlight={hl("bleed")} />
          <Check id="hb-vka" label="On a vitamin K antagonist" hint={tray.autoFill.onVka ? "Prefilled: warfarin is on the tray." : "Labile INR counts only when this is checked."} checked={onVka} onChange={setOnVka} points={0} />
          <Check id="hb-inr" label="Labile INR" hint={bledByKey.inr.note} checked={labileInr} onChange={setLabileInr} points={1} highlight={hl("inr")} />
          <Check id="hb-elderly" label="Elderly, over 65 (from age)" checked={bledByKey.elderly.met} points={1} disabled />
          <Check
            id="hb-drugs"
            label="Antiplatelet or NSAID"
            hint={tray.autoFill.antiplateletOrNsaid ? "Prefilled from the tray." : undefined}
            checked={drugs}
            onChange={setDrugs}
            points={1}
            highlight={hl("drugs")}
          />
          <Check
            id="hb-alcohol"
            label="Alcohol, 8 or more drinks a week"
            hint={host.alcohol === "chronic" ? "Prefilled from the host." : undefined}
            checked={alcohol}
            onChange={setAlcohol}
            points={1}
            highlight={hl("alcohol")}
          />
        </ul>
        <div className="rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h5 className="font-serif text-base text-fg">HAS-BLED</h5>
            <span className="whitespace-nowrap font-mono text-2xl text-fg">
              {bled.score}
              <span className="text-sm text-subtle"> / {bled.max}</span>
            </span>
          </div>
          <Badge tone={bled.highRisk ? "warn" : "ok"} className="mt-1">
            {bled.highRisk ? "High bleed risk (≥3)" : "Below 3"}
          </Badge>
          <p className="mt-3 text-sm leading-relaxed text-fg">{bled.message}</p>
          {bled.modifiableMet.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {bled.modifiableMet.map((i) => (
                <li key={i.key} className="rounded-lg bg-warn-soft px-3 py-2 text-sm leading-relaxed text-warn">
                  <span className="font-medium">{i.label}</span> ({MOD_LABEL[i.modifiability].toLowerCase()}). {i.fix}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* Net view */}
      <section className="space-y-3" aria-labelledby="af-net-h">
        <h4 id="af-net-h" className="font-serif text-base text-fg">
          Net view
        </h4>
        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-bg-sunken px-4 py-3">
          <div className="min-w-0">
            <dt className="text-xs text-muted">CHA2DS2-VASc</dt>
            <dd className="whitespace-nowrap font-mono text-lg text-fg">{vasc.score}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">CHA2DS2-VA</dt>
            <dd className="whitespace-nowrap font-mono text-lg text-fg">{va.score}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">HAS-BLED</dt>
            <dd className={cn("whitespace-nowrap font-mono text-lg", bled.highRisk ? "text-warn" : "text-fg")}>{bled.score}</dd>
          </div>
        </dl>
        <ul className="space-y-2 text-sm leading-relaxed text-fg">
          {strokeHigh && bled.highRisk ? (
            <li>
              Both scores are high. This is the common case, not a contradiction. The teaching answer is to address the
              modifiable bleed items and follow up more closely, not to skip anticoagulation.
            </li>
          ) : strokeHigh ? (
            <li>Stroke risk clears the anticoagulation threshold and bleed risk is not in the high band.</li>
          ) : bled.highRisk ? (
            <li>Bleed risk is high while stroke risk is low. Fix the modifiable items either way.</li>
          ) : (
            <li>Neither score is in its high band. Re-score as age and conditions change.</li>
          )}
          <li className="text-muted">
            Many HAS-BLED items (age, prior stroke, hypertension) also raise stroke risk. A high bleed score usually travels
            with a high stroke score.
          </li>
        </ul>
        {tray.tripleTherapyNote ? (
          <p className="rounded-lg bg-info-soft px-3 py-2 text-sm leading-relaxed text-info">{tray.tripleTherapyNote}</p>
        ) : null}
      </section>

      {/* DOAC rails */}
      <section className="space-y-3" aria-labelledby="af-doac-h">
        <h4 id="af-doac-h" className="font-serif text-base text-fg">
          DOAC rails
        </h4>
        <p className="text-xs leading-relaxed text-muted">Label rails for AF, taken from the DOAC desk. Age and sex are shared with stroke risk.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ageField("af-doac-age")}
          {sexField("af-doac-sex")}
          <div>
            <label htmlFor="af-doac-wt" className="text-xs text-muted">
              Weight (kg)
            </label>
            <Input
              id="af-doac-wt"
              type="number"
              inputMode="decimal"
              min={30}
              max={250}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <label htmlFor="af-doac-scr" className="text-xs text-muted">
              SCr (mg/dL)
            </label>
            <Input
              id="af-doac-scr"
              type="number"
              inputMode="decimal"
              min={0.1}
              max={20}
              step={0.1}
              value={scr}
              onChange={(e) => setScr(e.target.value)}
              className="mt-1 font-mono"
            />
          </div>
        </div>

        {dosing.crcl ? (
          <>
            <div className="flex flex-wrap items-baseline gap-2 rounded-xl bg-bg-sunken px-4 py-3">
              <span className="text-xs text-muted">Cockcroft–Gault CrCl</span>
              <span className="whitespace-nowrap font-mono text-lg text-fg">{dosing.crcl.crcl} mL/min</span>
            </div>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {dosing.rows.map((r) => (
                <li key={r.agentId} className="min-w-0 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-serif text-base text-fg">{r.agentName}</p>
                    <Badge tone={RAIL_TONE[railStatusOf(r)]}>{RAIL_LABEL[railStatusOf(r)]}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium text-fg">{r.rail.headline}</p>
                  <p className="mt-1 font-mono text-sm text-fg">{r.rail.doseRecommendation}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{r.rail.explanation}</p>
                  {r.abc ? (
                    <div className="mt-2 rounded-lg bg-bg-sunken px-3 py-2">
                      <p className="text-xs text-muted">
                        ABC criteria met:{" "}
                        <span className="whitespace-nowrap font-mono text-fg">{r.abc.criteriaMetCount} / 3</span>
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-fg">{r.abc.rationale}</p>
                    </div>
                  ) : null}
                  {r.rail.foodRequirement ? (
                    <p className="mt-2 text-xs leading-relaxed text-warn">{r.rail.foodRequirement}</p>
                  ) : null}
                  {r.rail.capsuleIntegrityWarning ? (
                    <p className="mt-2 text-xs leading-relaxed text-warn">{r.rail.capsuleIntegrityWarning}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <ul className="space-y-1">
          {dosing.notes.map((n) => (
            <li key={n} className="text-xs leading-relaxed text-muted">
              {n}
            </li>
          ))}
        </ul>
      </section>

      <footer className="space-y-3 border-t border-border pt-4">
        {footerNotes.length > 0 ? (
          <ul className="space-y-2">
            {footerNotes.map((n) => (
              <li key={n} className="rounded-lg bg-info-soft px-3 py-2 text-sm leading-relaxed text-info">
                {n}
              </li>
            ))}
          </ul>
        ) : null}
        <details>
          <summary className="cursor-pointer text-xs font-medium text-muted">Sources</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-muted">
            {AF_CITATIONS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </details>
        <p className="text-xs leading-relaxed text-subtle">{AF_DISCLAIMER}</p>
      </footer>
    </div>
  );
}
