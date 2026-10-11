import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import {
  AYONRINDE_BANDS,
  DURAGESIC_TABLE,
  EQUIANALGESIC,
  EQUI_BY_KEY,
  METHADONE_START_CAP_MG,
  RIPAMONTI_BANDS,
  ROTATION_CITATIONS,
  ROTATION_DISCLAIMER,
  defaultFromKey,
  factorsFromHost,
  methadoneRatioFor,
  patchToOme,
  rotateOpioid,
  rotationReportOnDesk,
  toFentanylPatch,
  toMethadone,
  type MethadoneRatioBand,
  type RotationFactors,
  type RotationReason,
} from "@/lib/drugs/opioid-rotation";

type Section = "table" | "patch" | "methadone";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "table", label: "Table rotation" },
  { id: "patch", label: "Fentanyl patch" },
  { id: "methadone", label: "Methadone" },
];

const REASONS: { id: RotationReason; label: string }[] = [
  { id: "uncontrolled-pain", label: "Uncontrolled pain" },
  { id: "adverse-effects", label: "Adverse effects" },
  { id: "route-change", label: "Route change" },
  { id: "formulary", label: "Formulary" },
];

const INTERVALS = [4, 6, 8, 12];

const TARGETS = EQUIANALGESIC.filter((r) => r.target);

const selectClass =
  "mt-1 h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

const fmt = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 10) / 10) : "—");

function num(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
}

function Warnings({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((w) => (
        <li key={w} className="rounded-lg bg-warn-soft px-3 py-2 text-sm leading-relaxed text-warn">
          {w}
        </li>
      ))}
    </ul>
  );
}

function Steps({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-fg">
      {items.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 last:border-b-0">
      <dt className="min-w-0 text-sm text-muted">{label}</dt>
      <dd className="shrink-0 whitespace-nowrap text-right font-mono text-sm text-fg">{value}</dd>
    </div>
  );
}

export function RotationPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const report = useMemo(() => rotationReportOnDesk(ids, host), [ids, host]);
  const hostFactors = useMemo(() => factorsFromHost(ids, host), [ids, host]);

  const [section, setSection] = useState<Section>("table");

  // Table rotation
  const [fromKey, setFromKey] = useState(() => defaultFromKey(ids));
  const [toKey, setToKey] = useState(() => {
    const from = defaultFromKey(ids);
    const fromDrug = EQUI_BY_KEY[from]?.drugId;
    return TARGETS.find((r) => r.drugId !== fromDrug && r.route === "po")?.key ?? "hydromorphone-po";
  });
  const [dose, setDose] = useState("60");
  const [intervalH, setIntervalH] = useState(4);
  const [factors, setFactors] = useState<RotationFactors>(hostFactors);

  const rotation = rotateOpioid({
    fromKey,
    fromMgPer24h: num(dose),
    toKey,
    intervalH,
    factors,
  });
  const tableOme = rotation?.ome ?? 0;

  // Patch
  const [patchOmeInput, setPatchOmeInput] = useState<string | null>(null);
  const patchOmeStr = patchOmeInput ?? (tableOme > 0 ? fmt(tableOme) : "");
  const patch = toFentanylPatch(num(patchOmeStr));
  const [patchMcg, setPatchMcg] = useState("25");
  const patchBack = patchToOme(num(patchMcg));

  // Methadone
  const [methOmeInput, setMethOmeInput] = useState<string | null>(null);
  const methOmeStr = methOmeInput ?? (tableOme > 0 ? fmt(tableOme) : "");
  const methOme = num(methOmeStr);
  const methadone = toMethadone(methOme);

  const setFlag = (k: "geriatric" | "renalImpairment" | "hepaticImpairment" | "sedativeOnTray", v: boolean) =>
    setFactors((f) => ({ ...f, [k]: v }));

  const fromRow = EQUI_BY_KEY[fromKey];
  const toRow = EQUI_BY_KEY[toKey];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Rotate</p>
        <h3 className="mt-1 font-serif text-lg tracking-tight text-fg">Opioid rotation</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Old drug to oral morphine, morphine to the new drug, then cut for incomplete cross-tolerance. The patch and
          methadone do not follow the line, so they get their own paths.
        </p>
        {report.detection.opioidIds.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {report.detection.opioidIds.map((id) => (
              <Badge key={id} tone="accent">
                {DRUG_BY_ID[id]?.name ?? id}
              </Badge>
            ))}
            {report.detection.sedativeIds.map((id) => (
              <Badge key={id} tone="danger">
                {DRUG_BY_ID[id]?.name ?? id} · sedative
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rotation section">
        {SECTIONS.map((s) => (
          <Button
            key={s.id}
            type="button"
            size="sm"
            variant={section === s.id ? "default" : "outline"}
            aria-pressed={section === s.id}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {section === "table" ? (
        <section className="space-y-4" aria-label="Table rotation">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              From
              <select className={selectClass} value={fromKey} onChange={(e) => setFromKey(e.target.value)}>
                {EQUIANALGESIC.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label} ({r.equianalgesicMg} mg){r.target ? "" : " · convert from only"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-muted">
              To
              <select className={selectClass} value={toKey} onChange={(e) => setToKey(e.target.value)}>
                {TARGETS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label} ({r.equianalgesicMg} mg)
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-muted">
              Current total (mg / 24 h)
              <Input
                className="mt-1 font-mono"
                inputMode="decimal"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
              />
            </label>
            <label className="block text-xs text-muted">
              New schedule
              <select
                className={selectClass}
                value={intervalH}
                onChange={(e) => setIntervalH(Number(e.target.value))}
              >
                {INTERVALS.map((h) => (
                  <option key={h} value={h}>
                    Every {h} h ({24 / h} doses)
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-muted sm:col-span-2">
              Reason for the switch
              <select
                className={selectClass}
                value={factors.reason}
                onChange={(e) => setFactors((f) => ({ ...f, reason: e.target.value as RotationReason }))}
              >
                {REASONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="rounded-xl bg-bg-sunken px-4 py-3">
            <legend className="sr-only">Risk modifiers</legend>
            <p className="text-xs text-muted">Risk modifiers. Prefilled from the host and the tray.</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  ["geriatric", "Older adult"],
                  ["renalImpairment", "Renal impairment"],
                  ["hepaticImpairment", "Hepatic impairment"],
                  ["sedativeOnTray", "Other CNS depressant"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex min-h-10 items-center gap-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-accent)]"
                    checked={factors[k]}
                    onChange={(e) => setFlag(k, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {fromRow ? <p className="text-xs leading-relaxed text-muted">{fromRow.note}</p> : null}
          {toRow && toRow.key !== fromRow?.key ? (
            <p className="text-xs leading-relaxed text-muted">{toRow.note}</p>
          ) : null}

          {rotation ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-surface-2 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Teaching figure</p>
                <dl className="mt-2">
                  <Row label="Oral morphine equivalent" value={`${fmt(rotation.ome)} mg / 24 h`} />
                  <Row
                    label={`Calculated ${rotation.to.label}`}
                    value={`${fmt(rotation.calculatedTargetMgPer24h)} mg / 24 h`}
                  />
                  <Row
                    label={`After ${Math.round(rotation.crossTolerance.reduction * 100)}% cut`}
                    value={`${fmt(rotation.reducedTargetMgPer24h)} mg / 24 h`}
                  />
                  {rotation.crossTolerance.reduction > 0 ? (
                    <Row
                      label="25–50% range"
                      value={`${fmt(rotation.reducedRangeMgPer24h[0])}–${fmt(rotation.reducedRangeMgPer24h[1])} mg`}
                    />
                  ) : null}
                  <Row
                    label={`Per dose, every ${rotation.intervalH} h`}
                    value={`${fmt(rotation.perDoseMg)} mg × ${rotation.dosesPerDay}`}
                  />
                  <Row
                    label="Breakthrough (10–20%)"
                    value={`${fmt(rotation.breakthroughMg[0])}–${fmt(rotation.breakthroughMg[1])} mg`}
                  />
                </dl>
                <p className="mt-2 text-xs leading-relaxed text-muted">{rotation.crossTolerance.why}</p>
              </div>
              <div>
                <h4 className="font-serif text-base text-fg">Steps</h4>
                <div className="mt-2">
                  <Steps items={rotation.steps} />
                </div>
              </div>
              <Warnings items={rotation.warnings} />
            </div>
          ) : (
            <p className="rounded-xl bg-bg-sunken px-4 py-4 text-sm text-muted">
              Enter a 24-hour total above zero.
            </p>
          )}
        </section>
      ) : null}

      {section === "patch" ? (
        <section className="space-y-4" aria-label="Fentanyl patch">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              Oral morphine equivalent (mg / 24 h)
              <Input
                className="mt-1 font-mono"
                inputMode="decimal"
                value={patchOmeStr}
                onChange={(e) => setPatchOmeInput(e.target.value)}
              />
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={patchOmeInput === null}
                onClick={() => setPatchOmeInput(null)}
              >
                Use table rotation OME
              </Button>
            </div>
          </div>

          <div className="rounded-xl bg-surface-2 px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Teaching figure</p>
            <p className="mt-2 text-sm text-fg">
              {patch.mcgPerH !== null ? (
                <>
                  Label band: <span className="font-mono text-lg">{patch.mcgPerH} mcg/h</span>
                </>
              ) : patch.opioidTolerant ? (
                "Above the label table."
              ) : (
                "No patch. Not opioid tolerant."
              )}
            </p>
            {!patch.opioidTolerant ? (
              <Badge className="mt-2" tone="danger">
                opioid-naive
              </Badge>
            ) : null}
          </div>

          <Steps items={patch.steps} />
          <Warnings items={patch.warnings} />

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[280px] text-sm">
              <caption className="px-3 pt-2 text-left text-xs text-muted">
                Duragesic label: starting strength from oral morphine
              </caption>
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">OME mg / 24 h</th>
                  <th className="px-3 py-2 font-medium">Patch</th>
                </tr>
              </thead>
              <tbody>
                {DURAGESIC_TABLE.map((r) => {
                  const on = patch.mcgPerH === r.mcgPerH;
                  return (
                    <tr
                      key={r.mcgPerH}
                      className={cn("border-t border-border font-mono", on ? "bg-accent-soft text-accent" : "text-fg")}
                    >
                      <td className="px-3 py-1.5">
                        {r.omeLow}–{r.omeHigh}
                      </td>
                      <td className="px-3 py-1.5">{r.mcgPerH} mcg/h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl bg-bg-sunken px-4 py-3">
            <h4 className="font-serif text-base text-fg">Leaving a patch</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Patch to OME uses the CDC factor, 2.4 per mcg/h. Then take the usual cross-tolerance cut for the new
              drug.
            </p>
            <div className="mt-2 grid grid-cols-2 items-end gap-3">
              <label className="block text-xs text-muted">
                Patch (mcg/h)
                <Input
                  className="mt-1 font-mono"
                  inputMode="decimal"
                  value={patchMcg}
                  onChange={(e) => setPatchMcg(e.target.value)}
                />
              </label>
              <p className="pb-3 text-sm text-fg">
                ≈ <span className="font-mono">{fmt(patchBack)}</span> mg OME
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {section === "methadone" ? (
        <section className="space-y-4" aria-label="Methadone">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              Oral morphine equivalent (mg / 24 h)
              <Input
                className="mt-1 font-mono"
                inputMode="decimal"
                value={methOmeStr}
                onChange={(e) => setMethOmeInput(e.target.value)}
              />
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={methOmeInput === null}
                onClick={() => setMethOmeInput(null)}
              >
                Use table rotation OME
              </Button>
            </div>
          </div>

          {methadone ? (
            <>
              <div className="rounded-xl bg-surface-2 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Teaching figure</p>
                <dl className="mt-2">
                  {methadone.ratios.map((r) => (
                    <Row key={r.source} label={`${r.source}, ${r.ratio}:1`} value={`${fmt(r.mgPer24h)} mg / 24 h`} />
                  ))}
                  <Row label="Start cap" value={`${METHADONE_START_CAP_MG} mg / 24 h`} />
                  <Row label="Teaching start" value={`${fmt(methadone.cappedMgPer24h)} mg / 24 h`} />
                  <Row label="Split every 8 h" value={`≈ ${fmt(methadone.perDoseQ8hMg)} mg`} />
                </dl>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <BandTable title="Ripamonti 1998" bands={RIPAMONTI_BANDS} ome={methOme} />
                <BandTable title="Ayonrinde 2000" bands={AYONRINDE_BANDS} ome={methOme} />
              </div>

              <div>
                <h4 className="font-serif text-base text-fg">Steps</h4>
                <div className="mt-2">
                  <Steps items={methadone.steps} />
                </div>
              </div>
              <Warnings items={methadone.warnings} />
            </>
          ) : (
            <p className="rounded-xl bg-bg-sunken px-4 py-4 text-sm text-muted">Enter an OME above zero.</p>
          )}
        </section>
      ) : null}

      <footer className="space-y-3 border-t border-border pt-4">
        {report.notes.length > 0 ? (
          <ul className="space-y-2">
            {report.notes.map((n) => (
              <li key={n} className="rounded-lg bg-info-soft px-3 py-2 text-sm leading-relaxed text-info">
                {n}
              </li>
            ))}
          </ul>
        ) : null}
        <details>
          <summary className="cursor-pointer text-xs font-medium text-muted">Sources</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-muted">
            {ROTATION_CITATIONS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </details>
        <p className="text-xs leading-relaxed text-subtle">{ROTATION_DISCLAIMER}</p>
      </footer>
    </div>
  );
}

function BandTable({ title, bands, ome }: { title: string; bands: MethadoneRatioBand[]; ome: number }) {
  const active = Number.isFinite(ome) && ome > 0 ? methadoneRatioFor(bands, ome) : null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[220px] text-sm">
        <caption className="px-3 pt-2 text-left text-xs text-muted">{title}</caption>
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="px-3 py-2 font-medium">OME mg / 24 h</th>
            <th className="px-3 py-2 font-medium">Morphine : methadone</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((b, i) => {
            const low = i === 0 ? null : bands[i - 1].omeHigh;
            const range =
              low === null ? `≤ ${b.omeHigh}` : b.omeHigh === Infinity ? `> ${low}` : `${low + 1}–${b.omeHigh}`;
            const on = active === b;
            return (
              <tr
                key={`${b.source}-${b.omeHigh}`}
                className={cn("border-t border-border font-mono", on ? "bg-accent-soft text-accent" : "text-fg")}
              >
                <td className="px-3 py-1.5">{range}</td>
                <td className="px-3 py-1.5">{b.ratio}:1</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
