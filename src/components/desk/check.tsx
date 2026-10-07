import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { basisFor } from "@/lib/drugs/basis";
import { clockForFinding } from "@/lib/drugs/cyp-protocol";
import { conditionLanes, foodBeside, sameShelfGroups } from "@/lib/drugs/also";
import { plainLanguageSummary } from "@/lib/drugs/interaction-summary";
import { maxDrugs } from "@/lib/billing/plans";
import { useDesk, usePlan } from "@/lib/drugs/store";
import type { ReaderBrief } from "@/lib/drugs/readers";
import type { EnzymeRole, Finding, HostContext, Severity } from "@/lib/drugs/types";
import { SEVERITY_LABEL } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";
import { severitySurface } from "./severity";
import { DeskReaders } from "./readers";
import { NarcoticBridge } from "./narcotic-bridge";
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
  const out: { key: string; title: string; reason: string }[] = [];
  for (let i = 0; i < real.length; i++) {
    for (let j = i + 1; j < real.length; j++) {
      const key = [real[i], real[j]].sort().join("|");
      if (hit.has(key)) continue;
      const title = [DRUG_BY_ID[real[i]].name, DRUG_BY_ID[real[j]].name]
        .sort((a, b) => a.localeCompare(b))
        .join(" · ");
      out.push({ key, title, reason: blankReason(real[i], real[j]) });
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

function blankReason(aId: string, bId: string) {
  const a = DRUG_BY_ID[aId];
  const b = DRUG_BY_ID[bId];
  if (!a || !b) return "Not a clearance.";
  const substrates = (id: string) => DRUG_BY_ID[id]?.enzymes.filter((e) => e.kind === "substrate") ?? [];
  const perps = (id: string) => DRUG_BY_ID[id]?.enzymes.filter((e) => e.kind !== "substrate") ?? [];
  const shared = [...new Set(substrates(aId).map((e) => e.enzyme))].filter((enzyme) =>
    substrates(bId).some((e) => e.enzyme === enzyme),
  );
  const near = (perpId: string, otherId: string) =>
    perps(perpId).find((role) => !substrates(otherId).some((e) => e.enzyme === role.enzyme));
  const fromA = near(aId, bId);
  const fromB = near(bId, aId);
  const miss = fromA ? { name: a.name, role: fromA, other: b.name } : fromB ? { name: b.name, role: fromB, other: a.name } : null;
  const verb = miss?.role.kind === "inducer" ? "speeds" : "slows";
  if (shared.length && miss) {
    return `No perpetrator on shared ${shared[0]}. ${miss.name} ${verb} ${miss.role.enzyme}, and ${miss.other} is not on it.`;
  }
  if (shared.length) {
    return `Both are ${shared.slice(0, 2).join(" and ")} substrates. No perpetrator was mapped.`;
  }
  if (miss) {
    return `${miss.name} ${verb} ${miss.role.enzyme}. ${miss.other} is not a ${miss.role.enzyme} substrate on this map.`;
  }
  return "No shared enzyme and no stacked-effect row on this map.";
}

function victimMark(f: Finding) {
  if (f.kind !== "pk" || f.drugIds.length < 2) return "";
  const victim = DRUG_BY_ID[f.drugIds[1]];
  const enzyme = f.enzymes[0];
  if (!victim || !enzyme) return "";
  const role = victim.enzymes.find((e) => e.kind === "substrate" && e.enzyme === enzyme);
  if (!role || role.kind !== "substrate") return "";
  if (role.pathway === "activation") return "prodrug";
  if (role.nti) return "narrow window";
  if (role.sensitivity === "sensitive") return "sensitive substrate";
  if (role.sensitivity === "minor") return "minor pathway";
  return "";
}

function extraNote(rows: Finding[]) {
  const lead = rows[0];
  if (!lead || rows.length < 2) return "";
  const leadEffect = (lead.effect || "").split("·")[0]?.trim().toLowerCase() ?? "";
  const next = rows.slice(1).find((f) => {
    const effect = (f.effect || "").split("·")[0]?.trim().toLowerCase() ?? "";
    return effect && effect !== leadEffect;
  });
  if (!next) return `+${rows.length - 1} more`;
  const named = (next.effect.split("·")[0]?.trim() ?? "").toLowerCase();
  const rest = rows.length - 2;
  return rest > 0 ? `also ${named} · +${rest}` : `also ${named}`;
}

function gradeOf(f: Finding) {
  const word = f.mechanism.split(" ")[0]?.toLowerCase();
  if (word === "strong" || word === "moderate" || word === "weak") return word;
  return "";
}

function sourceOf(f: Finding) {
  const basis = basisFor(f).find((item) => item.href && item.label);
  if (!basis?.href) return undefined;
  return { label: basis.label, href: basis.href };
}

function directionLine(rows: Finding[]) {
  const f = rows[0];
  if (!f) return "";
  const a = actors(f);
  let base: string;
  if (!a.verb || a.verb === "with") {
    const effect = f.effect?.split("·")[0]?.trim();
    base = effect ? effect.charAt(0).toUpperCase() + effect.slice(1) : a.left;
  } else {
    const short = a.verb.replace(/ of$/, "");
    base = short.charAt(0).toUpperCase() + short.slice(1);
  }
  const enzyme = f.enzymes.find((e) => !base.includes(e));
  if (enzyme) {
    const grade = gradeOf(f);
    base = grade ? `${base} · ${grade} ${enzyme}` : `${base} · ${enzyme}`;
  }
  const mark = victimMark(f);
  if (mark) base = `${base} · ${mark}`;
  const more = extraNote(rows);
  if (more) base = `${base} · ${more}`;
  return base;
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
  const shelfGroups = sameShelfGroups(ids);
  const pairKey = ids.join("|");
  const [scope, setScope] = useState(pairKey);
  const [openId, setOpenId] = useState<string | null>(rows[0]?.id ?? food[0]?.id ?? null);
  const [showAll, setShowAll] = useState(false);
  const [tier, setTier] = useState<Severity | "all">("all");
  const [showFood, setShowFood] = useState(false);
  if (scope !== pairKey) {
    setScope(pairKey);
    setShowAll(false);
    setShowFood(false);
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
  const foodPairs = [...regimenGroups(food).pairs].sort((a, b) => rank(b.rows[0]) - rank(a.rows[0]));
  const leadCard = lead ? clockForFinding(lead) : null;
  const leadWatch = lead ? (leadCard && lead.kind !== "pd" ? leadCard.start.watch : watchLine(lead)) : "";
  const leadSource = lead
    ? basisFor(lead)
        .map((b) => b.label)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ")
    : "";
  const readerBrief: ReaderBrief = {
    names: ids.map((id) => DRUG_BY_ID[id]?.name).filter((name): name is string => Boolean(name)),
    lead: lead ? `${SEVERITY_LABEL[lead.severity]}: ${verdictTitle(lead)}. ${plain}` : "",
    clock: leadCard
      ? `${leadCard.start.title} (${leadCard.start.days}). ${leadCard.stop.title} (${leadCard.stop.days}).`
      : lead
        ? "No clock on this map for this pair."
        : "",
    watch: leadWatch,
    source: leadSource,
    hands: ids.some((id) => {
      const flags = DRUG_BY_ID[id]?.pd ?? [];
      return flags.includes("opioid") || flags.includes("partial-opioid");
    })
      ? "Public lines are on this check. They are not a finding, a facility, or a ZIP."
      : "",
    rows: regimenGroups(rows).pairs.slice(0, 6).map((g) => ({
      severity: SEVERITY_LABEL[g.rows[0].severity],
      line: `${g.title}. ${directionLine(g.rows)}`,
      why: `${g.rows[0].effect}. ${g.rows[0].mechanism}`,
    })),
    quiet: quietPairs.map((p) => `${p.title}: ${p.reason}`),
    food: foodPairs.slice(0, 4).map((g) => `${g.title}: ${directionLine(g.rows)}`),
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
      {lead ? <LeadSources finding={lead} /> : null}
      <NarcoticBridge ids={ids} findings={findings} />

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

      {regimen && (split.pairs.length + quietPairs.length > 1 || quietPairs.length > 0) || foodPairs.length > 0 || lanes.length > 0 || shelfGroups.length > 0 ? (
        <PairGrid
          hits={
            regimen && (split.pairs.length + quietPairs.length > 1 || quietPairs.length > 0)
              ? regimenGroups(rows).pairs.map((g) => ({
                  key: g.key,
                  title: g.title,
                  line: directionLine(g.rows),
                  severity: g.rows[0].severity,
                  findingId: g.rows[0].id,
                  source: sourceOf(g.rows[0]),
                }))
              : []
          }
          blanks={regimen && (split.pairs.length + quietPairs.length > 1 || quietPairs.length > 0) ? quietPairs : []}
          beside={foodPairs.slice(0, 4).map((g) => ({
            key: g.key,
            title: g.title,
            line: directionLine(g.rows),
            severity: g.rows[0].severity,
            findingId: g.rows[0].id,
            source: sourceOf(g.rows[0]),
          }))}
          besideHidden={Math.max(0, foodPairs.length - 4)}
          hosts={lanes
            .map((lane) => {
              const top = [...lane.findings].sort((a, b) => rank(b) - rank(a))[0];
              if (!top) return null;
              return {
                key: lane.id,
                title: lane.label,
                line: `${groupTitle(top)}. ${directionLine([top])}${lane.findings.length > 1 ? ` · +${lane.findings.length - 1} in this lane` : ""}`,
                severity: top.severity,
                findingId: `${lane.id}-${top.id}`,
                source: sourceOf(top),
              };
            })
            .filter((cell): cell is NonNullable<typeof cell> => Boolean(cell))
            .slice(0, 4)}
          shelves={shelfGroups.map((group) => ({
            key: group.cls,
            title: group.names.join(" · "),
            line:
              group.names.length > 2
                ? `These are on the ${group.cls} shelf. Not a collision and not a clearance.`
                : `Both are on the ${group.cls} shelf. Not a collision and not a clearance.`,
          }))}
          onOpen={(id) => {
            setTier("all");
            setShowAll(true);
            setOpenId(id);
          }}
        />
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

type GridCell = {
  key: string;
  title: string;
  line: string;
  severity: Severity;
  findingId: string;
  source?: { label: string; href: string };
};

function MappedCell({
  cell,
  tag,
  onOpen,
}: {
  cell: GridCell;
  tag?: string;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="min-h-11 rounded-md bg-bg-sunken px-2.5 py-2">
      <button type="button" onClick={() => onOpen(cell.findingId)} className="w-full text-left">
        <span className={cn("inline-flex rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide", severitySurface(cell.severity))}>
          {SEVERITY_LABEL[cell.severity]}
        </span>
        {tag ? <span className="ml-1 font-mono text-[10px] uppercase tracking-wide text-subtle">{tag}</span> : null}
        <span className="mt-1 block text-xs leading-snug text-fg">{cell.title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted">{cell.line}</span>
      </button>
      {cell.source ? (
        <a
          href={cell.source.href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex font-mono text-[10px] text-accent underline underline-offset-2"
        >
          {cell.source.label}
        </a>
      ) : null}
    </div>
  );
}

function PairGrid({
  hits,
  blanks,
  beside = [],
  besideHidden = 0,
  hosts = [],
  shelves = [],
  onOpen,
}: {
  hits: GridCell[];
  blanks: { key: string; title: string; reason: string }[];
  beside?: GridCell[];
  besideHidden?: number;
  hosts?: GridCell[];
  shelves?: { key: string; title: string; line: string }[];
  onOpen: (id: string) => void;
}) {
  if (hits.length + blanks.length < 2 && beside.length === 0 && hosts.length === 0 && shelves.length === 0) return null;
  const pairs = hits.length + blanks.length >= 2;
  return (
    <div className="space-y-2">
      {pairs ? (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Every pair</p>
            <p className="font-mono text-[10px] uppercase tracking-wide text-subtle">
              {hits.length} mapped · {blanks.length} blank
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {hits.map((cell) => (
              <MappedCell key={cell.key} cell={cell} onOpen={onOpen} />
            ))}
            {blanks.map((cell) => (
              <div key={cell.key} className="min-h-11 rounded-md bg-bg-sunken px-2.5 py-2">
                <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">No mapped collision</span>
                <span className="mt-1 block text-xs leading-snug text-muted">{cell.title}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-subtle">{cell.reason}</span>
              </div>
            ))}
          </div>
          {blanks.length > 0 ? (
            <p className="text-[11px] leading-relaxed text-subtle">A blank cell says why this map stayed quiet. It is not a clearance.</p>
          ) : null}
        </>
      ) : null}
      {shelves.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <p className="font-mono text-[10px] uppercase tracking-wide text-subtle">Same shelf, not a collision</p>
          <div className="grid grid-cols-2 gap-1.5">
            {shelves.map((cell) => (
              <div key={cell.key} className="min-h-11 rounded-md bg-bg-sunken px-2.5 py-2">
                <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">Same shelf</span>
                <span className="mt-1 block text-xs leading-snug text-fg">{cell.title}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted">{cell.line}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {beside.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <p className="font-mono text-[10px] uppercase tracking-wide text-subtle">Food and drink, not on the desk</p>
          <div className="grid grid-cols-2 gap-1.5">
            {beside.map((cell) => (
              <MappedCell key={cell.key} cell={cell} tag="Food" onOpen={onOpen} />
            ))}
          </div>
          {besideHidden > 0 ? (
            <p className="text-[11px] leading-relaxed text-subtle">{besideHidden} more food and drink rows sit below.</p>
          ) : null}
        </div>
      ) : null}
      {hosts.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <p className="font-mono text-[10px] uppercase tracking-wide text-subtle">Different host, not this person</p>
          <div className="grid grid-cols-2 gap-1.5">
            {hosts.map((cell) => (
              <MappedCell key={cell.key} cell={cell} tag="Host" onOpen={onOpen} />
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-subtle">
            Pregnancy, kidney, age, or smoke. Not this person unless that flag is on. Not a milligram.
          </p>
        </div>
      ) : null}
    </div>
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
        This pair only. A study aid for how timing changes the picture, not a real-time alert. Not a
        milligram. If the label disagrees, the label wins.
      </p>
    </div>
  );
}

function LeadSources({ finding }: { finding: Finding }) {
  const sources = basisFor(finding).filter((b) => b.href).slice(0, 2);
  if (!sources.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">Open first</span>
      {sources.map((b) => (
        <a
          key={`${b.kind}-${b.label}`}
          href={b.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1 rounded-full bg-bg-sunken px-3 text-xs font-medium text-accent hover:underline"
        >
          {b.label}
          <ExternalLink className="size-3" />
        </a>
      ))}
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
  const roles = new Map<string, { sub: boolean; perp: boolean }>();
  for (const id of ids) {
    for (const e of DRUG_BY_ID[id]?.enzymes ?? []) {
      const row = roles.get(e.enzyme) ?? { sub: false, perp: false };
      if (e.kind === "substrate") row.sub = true;
      else row.perp = true;
      roles.set(e.enzyme, row);
    }
  }
  const hit = new Set<string>(findings.flatMap((f) => f.enzymes));
  const quiet = [...roles.entries()].filter(([enzyme]) => !hit.has(enzyme));
  if (roles.size === 0) {
    return "No enzyme role was on the map for this list. Effect-stacking flags were still compared.";
  }
  if (quiet.length === 0) return "";
  const parts = quiet.map(([enzyme, role]) => {
    if (role.sub && !role.perp) return `${enzyme}, no perpetrator mapped`;
    if (role.perp && !role.sub) return `${enzyme}, no victim mapped`;
    return `${enzyme}, no pair written`;
  });
  return `Compared, not a clearance: ${parts.join("; ")}.`;
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
            {finding.enzymes.map((e) => {
              const grade = finding.enzymes.length === 1 ? gradeOf(finding) : "";
              return (
                <span key={e} className="font-mono text-[10px] uppercase tracking-wide text-subtle">
                  {grade ? `${grade} ${e}` : e}
                </span>
              );
            })}
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
