import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CIRRHOSIS_PRESETS,
  HEPATIC_CITATIONS,
  HEPATIC_DISCLAIMER,
  HEPATIC_PROFILES,
  HEPATIC_PROFILE_BY_ID,
  compareHepatic,
  hepaticOnDesk,
  type CirrhosisPresetKey,
  type CirrhosisState,
  type ExtractionClass,
  type HepaticDrugProfile,
} from "@/lib/drugs/hepatic-clearance";
import {
  childPughOf,
  type AlbuminBand,
  type AscitesGrade,
  type BilirubinBand,
  type ChildPughInput,
  type EncephalopathyGrade,
  type InrBand,
} from "@/lib/drugs/bedside";
import type { HostContext } from "@/lib/drugs/types";

const PRESET_LABEL: Record<CirrhosisPresetKey, string> = {
  normal: "Normal",
  A: "Child-Pugh A",
  B: "Child-Pugh B",
  C: "Child-Pugh C",
};

const CLASS_TONE: Record<ExtractionClass, "danger" | "warn" | "info"> = {
  high: "danger",
  intermediate: "warn",
  low: "info",
};

const fmtRatio = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}×` : "∞");
const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

function toneFor(r: number): { bar: string; text: string } {
  if (!Number.isFinite(r) || r >= 2) return { bar: "text-danger", text: "text-danger" };
  if (r >= 1.25) return { bar: "text-warn", text: "text-warn" };
  if (r <= 0.8) return { bar: "text-info", text: "text-info" };
  return { bar: "text-ok", text: "text-ok" };
}

/** Diverging bar on a log2 scale centered at 1×, capped at 8× either way. */
function RatioBar({ label, hint, value }: { label: string; hint: string; value: number }) {
  const l = Number.isFinite(value) && value > 0 ? Math.log2(value) : 3;
  const half = (Math.min(Math.abs(l), 3) / 3) * 50;
  const tone = toneFor(value);
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-sm text-fg">
          {label} <span className="text-xs text-subtle">{hint}</span>
        </span>
        <span className={`shrink-0 font-mono text-sm ${tone.text}`}>{fmtRatio(value)}</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-bg-sunken" aria-hidden="true">
        <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
        <div
          className={`absolute inset-y-0 rounded-full bg-current ${tone.bar}`}
          style={l >= 0 ? { left: "50%", width: `${half}%` } : { right: "50%", width: `${half}%` }}
        />
      </div>
    </li>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs text-muted">
          {label}
        </label>
        <span className="font-mono text-xs text-fg">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}

const selectClass =
  "h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

function ChildPughScorer({ onClass }: { onClass: (k: CirrhosisPresetKey) => void }) {
  const [input, setInput] = useState<ChildPughInput>({
    bilirubin: "under2",
    albumin: "over35",
    inr: "under17",
    ascites: "none",
    encephalopathy: "none",
  });
  const result = childPughOf(input);
  const set = <K extends keyof ChildPughInput>(k: K, v: ChildPughInput[K]) => setInput((p) => ({ ...p, [k]: v }));

  return (
    <details className="rounded-xl bg-bg-sunken px-4 py-3">
      <summary className="cursor-pointer text-sm text-fg">Score Child-Pugh</summary>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="cp-bili" className="text-xs text-muted">Bilirubin (mg/dL)</label>
          <select id="cp-bili" className={selectClass} value={input.bilirubin} onChange={(e) => set("bilirubin", e.target.value as BilirubinBand)}>
            <option value="under2">Under 2</option>
            <option value="twoToThree">2 to 3</option>
            <option value="over3">Over 3</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="cp-alb" className="text-xs text-muted">Albumin (g/dL)</label>
          <select id="cp-alb" className={selectClass} value={input.albumin} onChange={(e) => set("albumin", e.target.value as AlbuminBand)}>
            <option value="over35">Over 3.5</option>
            <option value="twoEightToThreeFive">2.8 to 3.5</option>
            <option value="under28">Under 2.8</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="cp-inr" className="text-xs text-muted">INR</label>
          <select id="cp-inr" className={selectClass} value={input.inr} onChange={(e) => set("inr", e.target.value as InrBand)}>
            <option value="under17">Under 1.7</option>
            <option value="oneSevenToTwoThree">1.7 to 2.3</option>
            <option value="over23">Over 2.3</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="cp-asc" className="text-xs text-muted">Ascites</label>
          <select id="cp-asc" className={selectClass} value={input.ascites} onChange={(e) => set("ascites", e.target.value as AscitesGrade)}>
            <option value="none">None</option>
            <option value="slight">Slight</option>
            <option value="moderate">Moderate or worse</option>
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="cp-enc" className="text-xs text-muted">Encephalopathy</label>
          <select id="cp-enc" className={selectClass} value={input.encephalopathy} onChange={(e) => set("encephalopathy", e.target.value as EncephalopathyGrade)}>
            <option value="none">None</option>
            <option value="grade1_2">Grade 1–2</option>
            <option value="grade3_4">Grade 3–4</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-fg">{result.score} pts</span>
        <Badge tone="accent">{result.label}</Badge>
        <Button size="sm" variant="secondary" onClick={() => onClass(result.classBand)}>
          Load class {result.classBand}
        </Button>
      </div>
    </details>
  );
}

export function HepaticPanel({ ids, host: _host }: { ids: string[]; host: HostContext }) {
  const detection = hepaticOnDesk(ids);
  const ordered = {
    tray: detection.matchedIds.map((id) => HEPATIC_PROFILE_BY_ID[id]),
    rest: HEPATIC_PROFILES.filter((p) => !detection.matchedIds.includes(p.id)),
  };

  const [drugId, setDrugId] = useState<string>(detection.matchedIds[0] ?? "propranolol");
  const base = HEPATIC_PROFILE_BY_ID[drugId] ?? HEPATIC_PROFILES[0];
  const [extraction, setExtraction] = useState(base.extraction);
  const [fu, setFu] = useState(base.fu);
  const [preset, setPreset] = useState<CirrhosisPresetKey | "custom">("B");
  const [state, setState] = useState<CirrhosisState>(CIRRHOSIS_PRESETS.B);

  useEffect(() => {
    setExtraction(base.extraction);
    setFu(base.fu);
  }, [base]);

  const profile: HepaticDrugProfile = {
    ...base,
    extraction: Math.min(Math.max(extraction, 0.001), 0.99),
    fu: Math.min(Math.max(fu, 0.001), 1),
  };
  const c = compareHepatic(profile, state);

  const loadPreset = (k: CirrhosisPresetKey) => {
    setPreset(k);
    setState(CIRRHOSIS_PRESETS[k]);
  };
  const tweak = (patch: Partial<CirrhosisState>) => {
    setPreset("custom");
    setState((s) => ({ ...s, ...patch }));
  };

  const pickButton = (p: HepaticDrugProfile, onTray: boolean) => (
    <Button
      key={p.id}
      size="sm"
      variant={p.id === drugId ? "default" : onTray ? "secondary" : "outline"}
      aria-pressed={p.id === drugId}
      onClick={() => setDrugId(p.id)}
    >
      {p.name}
    </Button>
  );

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Liver</p>
        <h3 className="mt-1 font-serif text-lg tracking-tight text-fg">Hepatic clearance &amp; cirrhosis</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          The well-stirred liver model. Watch oral and IV exposure split apart for high-extraction drugs, and total
          and unbound exposure split apart for low-extraction drugs.
        </p>
      </div>

      <section className="space-y-2" aria-label="Drug">
        {ordered.tray.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-muted">On this tray</p>
            <div className="flex flex-wrap gap-2">{ordered.tray.map((p) => pickButton(p, true))}</div>
          </div>
        ) : null}
        <div className="space-y-1">
          <p className="text-xs text-muted">{ordered.tray.length > 0 ? "Other teaching drugs" : "Teaching drugs"}</p>
          <div className="flex flex-wrap gap-2">{ordered.rest.map((p) => pickButton(p, false))}</div>
        </div>
        <p className="text-xs leading-relaxed text-muted">{base.note}</p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Drug parameters">
        <div className="space-y-1">
          <label htmlFor="hep-e" className="text-xs text-muted">Extraction ratio E (healthy)</label>
          <Input
            id="hep-e"
            type="number"
            inputMode="decimal"
            min={0.001}
            max={0.99}
            step={0.01}
            value={extraction}
            onChange={(e) => setExtraction(Number(e.target.value))}
            className="font-mono"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="hep-fu" className="text-xs text-muted">Fraction unbound fu (healthy)</label>
          <Input
            id="hep-fu"
            type="number"
            inputMode="decimal"
            min={0.001}
            max={1}
            step={0.01}
            value={fu}
            onChange={(e) => setFu(Number(e.target.value))}
            className="font-mono"
          />
        </div>
        <p className="text-xs text-subtle sm:col-span-2">
          Approximate teaching parameters. Fg {base.fg}, Fa {base.fa}.
        </p>
      </section>

      <section className="space-y-3" aria-label="Liver state">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Child-Pugh preset">
          {(Object.keys(PRESET_LABEL) as CirrhosisPresetKey[]).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={preset === k ? "default" : "outline"}
              aria-pressed={preset === k}
              onClick={() => loadPreset(k)}
            >
              {PRESET_LABEL[k]}
            </Button>
          ))}
          {preset === "custom" ? <Badge tone="default">Custom</Badge> : null}
        </div>
        <div className="grid grid-cols-1 gap-3 rounded-xl bg-bg-sunken px-4 py-3 sm:grid-cols-2">
          <Slider
            id="hep-clint"
            label="Intrinsic clearance (× normal)"
            value={state.clintMultiplier}
            min={0.05}
            max={1.5}
            step={0.05}
            display={`${state.clintMultiplier.toFixed(2)}×`}
            onChange={(n) => tweak({ clintMultiplier: n })}
          />
          <Slider
            id="hep-flow"
            label="Hepatic blood flow (× normal)"
            value={state.flowMultiplier}
            min={0.3}
            max={1.5}
            step={0.05}
            display={`${state.flowMultiplier.toFixed(2)}×`}
            onChange={(n) => tweak({ flowMultiplier: n })}
          />
          <Slider
            id="hep-shunt"
            label="Portosystemic shunt"
            value={state.shuntFraction}
            min={0}
            max={0.9}
            step={0.05}
            display={fmtPct(state.shuntFraction)}
            onChange={(n) => tweak({ shuntFraction: n })}
          />
          <Slider
            id="hep-alb"
            label="Albumin (g/dL)"
            value={state.albuminGdl}
            min={1.5}
            max={5}
            step={0.1}
            display={state.albuminGdl.toFixed(1)}
            onChange={(n) => tweak({ albuminGdl: n })}
          />
        </div>
        <ChildPughScorer onClass={loadPreset} />
        <p className="text-xs text-subtle">Presets are illustrative teaching values, not measured constants.</p>
      </section>

      <section className="space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]" aria-label="Result">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-serif text-base text-fg">{profile.name}</p>
          <Badge tone={CLASS_TONE[c.extractionClass]}>{c.extractionClass} extraction</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Oral F</dt>
            <dd className="font-mono text-fg">
              {fmtPct(c.normal.fOral)} → {fmtPct(c.impaired.fOral)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">CLh (L/h)</dt>
            <dd className="font-mono text-fg">
              {c.normal.clh.toFixed(1)} → {c.impaired.clh.toFixed(1)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">fu</dt>
            <dd className="font-mono text-fg">
              {c.normal.fu.toPrecision(2)} → {c.impaired.fu.toPrecision(2)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">E (perfused)</dt>
            <dd className="font-mono text-fg">
              {c.normal.extractionPerfused.toFixed(2)} → {c.impaired.extractionPerfused.toFixed(2)}
            </dd>
          </div>
        </dl>
        <ul className="space-y-3" aria-label="Impaired over normal ratios">
          <RatioBar label="IV AUC" hint="total" value={c.ratios.aucIv} />
          <RatioBar label="Oral AUC" hint="total" value={c.ratios.aucOral} />
          <RatioBar label="IV AUC" hint="unbound" value={c.ratios.aucIvUnbound} />
          <RatioBar label="Oral AUC" hint="unbound" value={c.ratios.aucOralUnbound} />
          <RatioBar label="Oral F" hint="bioavailability" value={c.ratios.fOral} />
        </ul>
        <p className="text-xs text-subtle">Impaired ÷ normal, per unit dose. Bars use a log scale centered at 1×, capped at 8×.</p>
        <ul className="space-y-2">
          {c.teaching.map((t) => (
            <li key={t} className="text-sm leading-relaxed text-fg">
              {t}
            </li>
          ))}
        </ul>
      </section>

      <details className="rounded-xl bg-bg-sunken px-4 py-3">
        <summary className="cursor-pointer text-sm text-fg">The well-stirred equations</summary>
        <div className="mt-3 space-y-1 overflow-x-auto font-mono text-xs leading-relaxed text-fg">
          <p>fu·CLint = E·Q / (1 − E), Q = 90 L/h</p>
          <p>fu′ = 1 / (1 + ((1 − fu)/fu)·(Alb / 4.2))</p>
          <p>Qp = (1 − s)·flow·Q</p>
          <p>Ep = fu′·CLint′ / (Qp + fu′·CLint′)</p>
          <p>CLh = Qp·Ep</p>
          <p>Fh = s + (1 − s)(1 − Ep)</p>
          <p>F = Fa·Fg·Fh</p>
          <p>AUC_iv ∝ 1/CLh · AUC_oral ∝ F/CLh</p>
          <p>AUC_unbound = fu′ × AUC_total</p>
        </div>
      </details>

      <footer className="space-y-2">
        <ul className="space-y-1">
          {HEPATIC_CITATIONS.map((s) => (
            <li key={s} className="text-xs leading-relaxed text-subtle">
              {s}
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-subtle">{HEPATIC_DISCLAIMER}</p>
      </footer>
    </div>
  );
}
