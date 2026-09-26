import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { basisFor } from "@/lib/drugs/basis";
import { clockForFinding } from "@/lib/drugs/cyp-protocol";
import { conditionLanes, foodBeside, sameShelf } from "@/lib/drugs/also";
import { plainLanguageSummary } from "@/lib/drugs/interaction-summary";
import { maxDrugs } from "@/lib/billing/plans";
import { useDesk, usePlan } from "@/lib/drugs/store";
import type { ReaderBrief } from "@/lib/drugs/readers";
import type { EnzymeRole, Finding, HostContext, Severity } from "@/lib/drugs/types";
import { SEVERITY_LABEL } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";
import { severitySurface } from "./severity";
import { DeskReaders } from "./readers";
import { watchLine } from "@/lib/drugs/window";

const TIERS: Array<Severity | "all"> = ["all", "contraindicated", "major", "moderate", "minor"];

const KIND_LABEL: Record<Finding["kind"], string> = {
  pk: "Levels",
  pd: "Effects",
  geno: "Genes",
  clinic: "Clinic",
};

function rank(f: Finding) {
  const sev = { contraindicated: 40, major: 30, moderate: 20, minor: 10 }[f.severity];
  return sev + (f.tags.includes("boxed") ? 6 : 0);
}

function ordered(findings: Finding[]) {
  return [...findings].sort((a, b) => rank(b) - rank(a) || a.headline.localeCompare(b.headline));
}

function roleText(e: EnzymeRole) {
  if (e.kind === "substrate") {
    const how = e.pathway === "activation" ? "activated by" : "broken down by";
    const sens =
      e.sensitivity === "sensitive"
        ? " · sensitive"
        : e.sensitivity === "major"
          ? " · major pathway"
          : " · minor pathway";
    const nti = e.nti ? " · narrow window" : "";
    return `${how} ${e.enzyme}${sens}${nti}`;
  }
  if (e.kind === "inhibitor") {
    return `${e.strength} slowdown · ${e.enzyme}`;
  }
  return `${e.strength} speed-up · ${e.enzyme}`;
}

function rolesFor(id: string, findings: Finding[]) {
  const drug = DRUG_BY_ID[id];
  if (!drug) return [];
  const hit = new Set(findings.flatMap((f) => f.enzymes));
  const relevant = hit.size ? drug.enzymes.filter((e) => hit.has(e.enzyme)) : drug.enzymes;
  const rows = (relevant.length ? relevant : drug.enzymes).slice(0, 4);
  return rows.map(roleText);
}

function uniqueIds(f: Finding) {
  return [...new Set(f.drugIds.filter((id) => DRUG_BY_ID[id]))];
}

function pairKeyOf(f: Finding) {
  const ids = uniqueIds(f);
  if (ids.length === 2) return [...ids].sort().join("|");
  return "";
}

function groupTitle(f: Finding) {
  const a = actors(f);
  if (a.verb && a.right) return `${a.left} · ${a.right}`;
  const names = uniqueIds(f).map((id) => DRUG_BY_ID[id]?.name ?? id);
  return names.join(" · ") || f.headline;
}

function regimenGroups(findings: Finding[]) {
  const map = new Map<string, Finding[]>();
  const desk: Finding[] = [];
  for (const f of findings) {
    const key = pairKeyOf(f);
    if (!key) {
      desk.push(f);
      continue;
    }
    const list = map.get(key) ?? [];
    list.push(f);
    map.set(key, list);
  }
  const pairs = [...map.entries()]
    .map(([key, rows]) => ({ key, title: groupTitle(rows[0]), rows: ordered(rows) }))
    .sort((a, b) => rank(b.rows[0]) - rank(a.rows[0]) || a.title.localeCompare(b.title));
  return { pairs, desk: ordered(desk) };
}

function unmappedPairs(ids: string[], hit: Set<string>) {
  const real = ids.filter((id) => DRUG_BY_ID[id]);
  const out: { key: string; title: string }[] = [];
  for (let i = 0; i < real.length; i++) {
    for (let j = i + 1; j < real.length; j++) {
      const key = [real[i], real[j]].sort().join("|");
      if (hit.has(key)) continue;
      const title = [DRUG_BY_ID[real[i]].name, DRUG_BY_ID[real[j]].name]
        .sort((a, b) => a.localeCompare(b))
        .join(" · ");
      out.push({ key, title });
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

function actors(f: Finding): { left: string; verb: string; right: string } {
  const names = f.drugIds.map((id) => DRUG_BY_ID[id]?.name ?? id);
  const induces = f.tags.includes("inducer");
  const inhibits = f.tags.includes("inhibitor");
  const activation = f.tags.includes("activation");
  if (f.kind === "pk" && (inhibits || induces) && names.length >= 2) {
    const verb = induces
      ? activation
        ? "speeds activation of"
        : "speeds clearance of"
      : activation
        ? "blocks activation of"
        : "slows clearance of";
    return { left: names[0], verb, right: names[1] };
  }
  if (f.kind === "pk" && f.tags.includes("competition") && names.length >= 2) {
    return { left: names[0], verb: "shares a pathway with", right: names[1] };
  }
  if (f.tags.includes("phenoconversion") && names.length >= 2) {
    const rest = [...new Set(names.slice(1))].filter((n) => n !== names[0]);
    return { left: names[0], verb: "rewrites the pathway for", right: (rest.length ? rest : [...new Set(names.slice(1))]).join(" · ") };
  }
  if (f.kind === "geno" && names[0]) {
    return { left: f.enzymes[0] ? `${f.enzymes[0]} gene status` : "Gene status", verb: "changes how the body handles", right: names[0] };
  }
  if (names.length >= 2) return { left: names[0], verb: "with", right: names.slice(1).join(" · ") };
  return { left: names[0] ?? f.headline, verb: "", right: "" };
}

export function CheckBoard({
  ids,
  findings,
  counts,
  host,
}: {
  ids: string[];
  findings: Finding[];
  counts: Record<Severity, number>;
  host: HostContext;
}) {
  const add = useDesk((s) => s.add);
  const plan = usePlan();
  const room = ids.length < maxDrugs(plan);
  const rows = ordered(findings);
  const food = useMemo(() => foodBeside(ids, host), [ids, host]);
  const lanes = useMemo(
    () => conditionLanes(ids, host, new Set(findings.map((f) => f.id))),
    [ids, host, findings],
  );
  const shelf = sameShelf(ids);
  const pairKey = ids.join("|");
  const [scope, setScope] = useState(pairKey);
  const [openId, setOpenId] = useState<string | null>(rows[0]?.id ?? food[0]?.id ?? null);
  const [showAll, setShowAll] = useState(false);
  const [tier, setTier] = useState<Severity | "all">("all");
  const [showFood, setShowFood] = useState(false);
  const [showQuiet, setShowQuiet] = useState(false);
  if (scope !== pairKey) {
    setScope(pairKey);
    setShowAll(false);
    setShowFood(false);
    setShowQuiet(false);
    setTier("all");
    setOpenId(rows[0]?.id ?? food[0]?.id ?? null);
  }
  const filtered = tier === "all" ? rows : rows.filter((f) => f.severity === tier);
  const split = regimenGroups(filtered);
  const grouped = ids.length >= 3 && split.pairs.length > 1;
  const visibleGroups = showAll ? split.pairs : split.pairs.slice(0, 4);
  const visible = showAll ? filtered : filtered.slice(0, 5);
  const hidden = grouped ? split.pairs.length - visibleGroups.length : filtered.length - visible.length;
  const foodShown = showFood ? food : food.slice(0, 4);
  const pairLead = rows[0];
  const foodLead = food[0];
  const lead =
    pairLead && foodLead ? (rank(foodLead) > rank(pairLead) ? foodLead : pairLead) : (pairLead ?? foodLead);
  const leadSev: Severity | "none" = lead?.severity ?? "none";
  const foodOutranks = Boolean(pairLead && foodLead && rank(foodLead) > rank(pairLead));
  const regimen = ids.length >= 3;
  const quietEnzymes = quietLine(ids, [...rows, ...food]);
  const plain = lead ? plainLanguageSummary(lead) : "";
  const quietPairs = ids.length >= 3 ? unmappedPairs(ids, new Set(regimenGroups(rows).pairs.map((p) => p.key))) : [];
  const readerBrief: ReaderBrief = {
    names: ids.map((id) => DRUG_BY_ID[id]?.name).filter((name): name is string => Boolean(name)),
    lead: lead ? `${SEVERITY_LABEL[lead.severity]}: ${verdictTitle(lead)}. ${plain}` : "",
    rows: rows.slice(0, 6).map((f) => ({
      severity: f.severity,
      line: f.headline,
      why: `${f.effect}. ${f.mechanism}`,
    })),
    quiet: quietPairs.map((p) => p.title),
    food: food.slice(0, 4).map((f) => `${SEVERITY_LABEL[f.severity]}: ${f.headline}`),
  };

  return (
    <section className="space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)] sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Interaction check</p>
          <h2 className="mt-1 font-serif text-2xl tracking-tight text-fg">
            {lead ? verdictTitle(lead) : "No interaction found in this map."}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {foodOutranks
              ? "The main concern shown is a food or drink, listed below the names. This is an educational map, not a dose tool — product labeling and a clinician still guide care."
              : rows.length === 0
                ? ids.length < 2
                  ? "Add another medicine, supplement, or substance to compare. An empty board is not a green light — this checker can miss risks."
                  : "No mapped interaction appeared for these names. Empty here is not the same as safe: the map can miss collisions, and labels still govern."
                : regimen
                  ? "You added more than two names, so this is a full list, not a single pair. The desk ranks every pair by the strongest mapped finding and leads with that row — not the order you typed. Start with the everyday-language line. Severity labels are teaching bins, not a personal prediction of harm."
                  : "A possible concern is mapped. Start with the everyday-language line; expand a row for clinical detail and sources. Severity labels are teaching bins, not a personal prediction of harm."}
          </p>
          {plain ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg">{plain}</p> : null}
        </div>
        <span
          className={cn(
            "inline-flex min-h-10 items-center justify-center rounded-md px-3 font-mono text-[11px] font-medium uppercase tracking-wider",
            severitySurface(leadSev),
          )}
        >
          {lead ? SEVERITY_LABEL[lead.severity] : "No mapped hit"}
        </span>
      </div>

      {lead ? <LeadRail finding={lead} /> : null}

      {shelf ? (
        <p className="rounded-md bg-bg-sunken px-3 py-2 text-sm leading-relaxed text-fg">
          {shelf}. Same shelf is not a collision by itself.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <p className="text-xs leading-relaxed text-muted">
            Severity chips are teaching bins — they do not estimate one person’s risk. Row chips:{" "}
            <span className="text-fg">Levels</span> (how much stays),{" "}
            <span className="text-fg">Effects</span> (how risks stack),{" "}
            <span className="text-fg">Genes</span> (phenotype rewrite).
          </p>
          <div className="flex flex-wrap gap-1">
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTier(t);
                  setShowAll(false);
                }}
                className={cn(
                  "h-10 rounded-full px-3 text-xs font-medium",
                  tier === t ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                )}
              >
                {t === "all"
                  ? `All ${rows.length}`
                  : `${SEVERITY_LABEL[t]} ${counts[t]}`}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {!regimen ? <RoleGrid ids={ids} rows={rows} /> : null}

      {rows.length === 0 && quietEnzymes ? (
        <p className="text-xs leading-relaxed text-muted">{quietEnzymes}</p>
      ) : filtered.length === 0 && rows.length > 0 ? (
        <div className="rounded-md border border-border bg-bg-sunken px-3 py-3">
          <p className="text-sm font-medium text-fg">Nothing in this severity slice</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Try All, or another chip. Hiding a slice is not a green light — only this filter is empty.
          </p>
        </div>
      ) : grouped ? (
        <div className="space-y-4">
          {visibleGroups.map((g) => (
            <div key={g.key} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-fg">{g.title}</p>
                <p className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-subtle">
                  {g.rows.length === 1 ? "1 row" : `${g.rows.length} rows`}
                </p>
              </div>
              <ol className="space-y-2">
                {g.rows.map((f) => (
                  <CheckRow
                    key={f.id}
                    finding={f}
                    open={openId === f.id}
                    onToggle={() => setOpenId((id) => (id === f.id ? null : f.id))}
                  />
                ))}
              </ol>
            </div>
          ))}
          {split.desk.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-fg">Whole-regimen notes</p>
                <p className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-subtle">Not a single pair</p>
              </div>
              <ol className="space-y-2">
                {split.desk.map((f) => (
                  <CheckRow
                    key={f.id}
                    finding={f}
                    open={openId === f.id}
                    onToggle={() => setOpenId((id) => (id === f.id ? null : f.id))}
                  />
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : rows.length > 0 ? (
        <ol className="space-y-2">
          {visible.map((f) => (
            <CheckRow
              key={f.id}
              finding={f}
              open={openId === f.id}
              onToggle={() => setOpenId((id) => (id === f.id ? null : f.id))}
            />
          ))}
        </ol>
      ) : null}

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="h-11 rounded-full px-3 text-xs font-medium text-muted hover:text-fg"
        >
          {hidden} more {grouped ? "pairs" : "in this check"}
        </button>
      ) : null}

      {rows.length > 0 && quietEnzymes ? <p className="text-xs leading-relaxed text-muted">{quietEnzymes}</p> : null}

      {quietPairs.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowQuiet((v) => !v)}
            aria-expanded={showQuiet}
            className="flex h-11 w-full items-center justify-between gap-3 text-left"
          >
            <span className="text-sm text-fg">
              {quietPairs.length === 1
                ? "1 pair with no mapped collision"
                : `${quietPairs.length} pairs with no mapped collision`}
            </span>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-subtle">
              {showQuiet ? "Hide" : "Show"} · not a clearance
            </span>
          </button>
          {showQuiet ? (
            <ul className="space-y-1">
              {quietPairs.map((p) => (
                <li key={p.key} className="rounded-md bg-bg-sunken px-3 py-2">
                  <p className="text-sm text-fg">{p.title}</p>
                  <p className="text-xs leading-relaxed text-muted">
                    No mapped collision on this pair. A blank here is not a clearance, and a note under Across the desk can still name both.
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {regimen ? <RoleGrid ids={ids} rows={rows} /> : null}

      {food.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Food, drink, alcohol</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Not on your tray yet — same checker, run against grapefruit, alcohol, dairy, St. John’s wort, leafy greens,
              coffee, calcium, and tyramine foods. Add one only if you want it on the desk.
            </p>
          </div>
          <ol className="space-y-2">
            {foodShown.map((f) => {
              const extra = f.drugIds.find((id) => !ids.includes(id) && DRUG_BY_ID[id]);
              return (
                <CheckRow
                  key={f.id}
                  finding={f}
                  open={openId === f.id}
                  onToggle={() => setOpenId((id) => (id === f.id ? null : f.id))}
                  action={
                    room && extra ? (
                      <button
                        type="button"
                        onClick={() => add(extra)}
                        className="h-10 rounded-full bg-surface px-3 text-xs font-medium text-fg"
                      >
                        Add {DRUG_BY_ID[extra]?.name}
                      </button>
                    ) : null
                  }
                />
              );
            })}
          </ol>
          {food.length > foodShown.length ? (
            <button
              type="button"
              onClick={() => setShowFood(true)}
              className="h-11 rounded-full px-3 text-xs font-medium text-muted hover:text-fg"
            >
              {food.length - foodShown.length} more food and drink
            </button>
          ) : null}
        </div>
      ) : null}

      {lanes.length > 0 ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">If the person changes</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              What changes if the host is different — pregnancy, reduced kidney function, older adult, or daily smoke.
              Not the person in front of you unless you flip that flag.
            </p>
          </div>
          {lanes.map((lane) => (
            <div key={lane.id} className="space-y-2">
              <p className="text-sm font-medium text-fg">{lane.label}</p>
              <ol className="space-y-2">
                {lane.findings.map((f) => (
                  <CheckRow
                    key={`${lane.id}-${f.id}`}
                    finding={f}
                    open={openId === `${lane.id}-${f.id}`}
                    onToggle={() =>
                      setOpenId((id) => (id === `${lane.id}-${f.id}` ? null : `${lane.id}-${f.id}`))
                    }
                  />
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : null}
      <DeskReaders brief={readerBrief} />
    </section>
  );
}

function LeadRail({ finding }: { finding: Finding }) {
  const card = clockForFinding(finding);
  const watch = card && finding.kind !== "pd" ? card.start.watch : watchLine(finding);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-md bg-bg-sunken px-3 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">Clock · this pair</p>
        {card ? (
          <div className="mt-1 space-y-2">
            <p className="text-sm leading-snug text-fg">
              {card.start.title}
              <span className="mt-0.5 block font-mono text-[11px] font-normal text-muted">{card.start.days}</span>
            </p>
            <p className="text-sm leading-snug text-fg">
              {card.stop.title}
              <span className="mt-0.5 block font-mono text-[11px] font-normal text-muted">{card.stop.days}</span>
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm leading-relaxed text-fg">No clock on this map for this pair.</p>
        )}
      </div>
      <div className="rounded-md bg-bg-sunken px-3 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">Watch · this pair</p>
        <p className="mt-1 text-sm leading-relaxed text-fg">{watch}</p>
      </div>
      <p className="sm:col-span-2 text-[11px] leading-relaxed text-subtle">
        This pair only. Not a milligram. If the label disagrees, the label wins.
      </p>
    </div>
  );
}

function RoleGrid({ ids, rows }: { ids: string[]; rows: Finding[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ids.map((id) => {
        const drug = DRUG_BY_ID[id];
        if (!drug) return null;
        const roles = rolesFor(id, rows);
        return (
          <div key={id} className="rounded-md bg-bg-sunken px-3 py-2.5">
            <p className="text-sm font-medium text-fg">{drug.name}</p>
            <p className="text-[11px] text-muted">{drug.cls}</p>
            {roles.length ? (
              <ul className="mt-1.5 space-y-0.5">
                {roles.map((r, i) => (
                  <li key={`${id}-${i}`} className="text-xs leading-relaxed text-fg">
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-xs text-muted">No enzyme role mapped here.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function actorLine(f: Finding) {
  const a = actors(f);
  if (!a.verb) return a.left;
  return `${a.left} ${a.verb} ${a.right}`.replace(/\s+/g, " ").trim();
}

function verdictTitle(f: Finding) {
  const raw = f.kind === "pk" || f.kind === "geno" ? actorLine(f) : f.effect || actorLine(f);
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw;
}

function quietLine(ids: string[], findings: Finding[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    for (const e of DRUG_BY_ID[id]?.enzymes ?? []) seen.add(e.enzyme);
  }
  const hit = new Set<string>(findings.flatMap((f) => f.enzymes));
  const quiet = [...seen].filter((e) => !hit.has(e));
  if (seen.size === 0) {
    return "No enzyme role was on the map for this list. Effect-stacking flags were still compared.";
  }
  if (quiet.length === 0) return "";
  return `Also checked, no collision on: ${quiet.join(", ")}.`;
}

function CheckRow({
  finding,
  open,
  onToggle,
  action,
}: {
  finding: Finding;
  open: boolean;
  onToggle: () => void;
  action?: ReactNode;
}) {
  const a = actors(finding);
  const basis = basisFor(finding).slice(0, 2);
  return (
    <li className="rounded-lg bg-bg-sunken">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 px-3 py-3 text-left">
        <span
          className={cn(
            "mt-0.5 inline-flex min-w-24 shrink-0 items-center justify-center rounded-sm px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider",
            severitySurface(finding.severity),
          )}
        >
          {SEVERITY_LABEL[finding.severity]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-snug text-fg">
            {a.left}
            {a.verb ? <span className="font-normal text-muted"> {a.verb} </span> : null}
            {a.right}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted">
            {plainLanguageSummary(finding)}
          </span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">
              {KIND_LABEL[finding.kind]}
            </span>
            {finding.tags.includes("boxed") ? (
              <span className="font-mono text-[10px] uppercase tracking-wide text-danger">Boxed warning (label)</span>
            ) : null}
            {finding.enzymes.map((e) => (
              <span key={e} className="font-mono text-[10px] uppercase tracking-wide text-subtle">
                {e}
              </span>
            ))}
          </span>
        </span>
        <ChevronDown className={cn("mt-1 size-4 shrink-0 text-subtle", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-3 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Clinical detail</p>
          <p className="text-sm leading-relaxed text-fg">{finding.clinical}</p>
          <p className="text-xs leading-relaxed text-muted">
            Mechanism: {finding.mechanism}
            {finding.effect ? ` · ${finding.effect}` : ""}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Sources to check</p>
          <div className="flex flex-wrap gap-2">
            {basis.map((b) =>
              b.href ? (
                <a
                  key={`${b.kind}-${b.label}`}
                  href={b.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-1 rounded-full bg-surface px-3 text-xs font-medium text-accent hover:underline"
                >
                  {b.label}
                  <ExternalLink className="size-3" />
                </a>
              ) : (
                <span key={`${b.kind}-${b.label}`} className="inline-flex h-10 items-center px-1 text-xs text-muted">
                  {b.label}
                </span>
              ),
            )}
          </div>
          {action}
        </div>
      ) : null}
    </li>
  );
}
