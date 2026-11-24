import { useMemo, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { NO_SINGLE_HALF_LIFE } from "@/lib/drugs/half-lives";
import { halfLifeFor } from "@/lib/drugs/overlap";
import { useDesk } from "@/lib/drugs/store";
import {
  ENZYMES,
  type Drug,
  type Enzyme,
  type EnzymeRole,
  type Strength,
  type SubstrateSensitivity,
} from "@/lib/drugs/types";
import { cn } from "@/lib/utils";

type MatrixFilter = "active" | "all" | "collisions";
type SubstrateRole = Extract<EnzymeRole, { kind: "substrate" }>;
type PerpetratorRole = Extract<EnzymeRole, { kind: "inhibitor" | "inducer" }>;

interface CellRoles {
  sub?: SubstrateRole;
  inh?: PerpetratorRole;
  ind?: PerpetratorRole;
}

const SUBSTRATE_CODE: Record<SubstrateSensitivity, string> = {
  sensitive: "SENS",
  major: "MAJ",
  minor: "MIN",
};

const SUBSTRATE_LABEL: Record<SubstrateSensitivity, string> = {
  sensitive: "Sensitive substrate",
  major: "Major substrate",
  minor: "Minor substrate",
};

const SUBSTRATE_TIER_NOTE: Record<SubstrateSensitivity, string> = {
  sensitive: "FDA DDI index sensitivity: strong inhibition can raise AUC ≥5-fold.",
  major: "Major clearance pathway: meaningful fraction cleared via this enzyme.",
  minor: "Minor clearance pathway: smaller fractional contribution under usual conditions.",
};

const STRENGTH_CODE: Record<Strength, string> = {
  strong: "STR",
  moderate: "MOD",
  weak: "WK",
};

const STRENGTH_LABEL: Record<Strength, string> = {
  strong: "Strong",
  moderate: "Moderate",
  weak: "Weak",
};

const INHIBITOR_TIER_NOTE: Record<Strength, string> = {
  strong: "FDA DDI tier: increases sensitive substrate AUC ≥5-fold (or ≥80% clearance reduction).",
  moderate: "FDA DDI tier: increases sensitive substrate AUC 2 to <5-fold.",
  weak: "FDA DDI tier: increases sensitive substrate AUC 1.25 to <2-fold.",
};

const INDUCER_TIER_NOTE: Record<Strength, string> = {
  strong: "FDA DDI tier: decreases sensitive substrate AUC ≥80%.",
  moderate: "FDA DDI tier: decreases sensitive substrate AUC 50% to <80%.",
  weak: "FDA DDI tier: decreases sensitive substrate AUC 20% to <50%.",
};

function cellRoles(drug: Drug, enzyme: Enzyme): CellRoles {
  const roles = drug.enzymes.filter((e) => e.enzyme === enzyme);
  return {
    sub: roles.find((r): r is SubstrateRole => r.kind === "substrate"),
    inh: roles.find((r): r is PerpetratorRole => r.kind === "inhibitor"),
    ind: roles.find((r): r is PerpetratorRole => r.kind === "inducer"),
  };
}

function formatHalfLife(hours: number): string {
  const rounded = Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 10) / 10);
  return `${rounded} h`;
}

function halfLifeMeta(drugId: string): {
  display: string;
  tooltip: string;
  nonLinearNote?: string;
  source?: string;
} {
  if (Object.hasOwn(NO_SINGLE_HALF_LIFE, drugId)) {
    const note = NO_SINGLE_HALF_LIFE[drugId]!;
    return {
      display: "—",
      tooltip: note,
      nonLinearNote: note,
    };
  }
  const hl = halfLifeFor(drugId);
  if (!hl) {
    return {
      display: "—",
      tooltip: "Elimination half-life not mapped on this shelf.",
    };
  }
  const display = formatHalfLife(hl.hours);
  return {
    display,
    tooltip: `Typical adult elimination t½ ≈ ${display} (${hl.source})`,
    source: hl.source,
  };
}

function cellAriaLabel(drug: Drug, enzyme: Enzyme, roles: CellRoles, hit: boolean): string {
  const parts: string[] = [];
  if (roles.sub) {
    if (roles.sub.pathway === "activation") {
      parts.push(`prodrug bioactivation (${roles.sub.sensitivity})`);
    } else {
      parts.push(`${roles.sub.sensitivity} substrate`);
    }
    if (roles.sub.nti) parts.push("narrow therapeutic index");
  }
  if (roles.inh) {
    parts.push(`${roles.inh.strength} inhibitor`);
  }
  if (roles.ind) {
    parts.push(`${roles.ind.strength} inducer`);
  }
  if (hit) {
    parts.push("active tray collision");
  }
  return `Inspect ${drug.name} on ${enzyme}: ${parts.join(", ")}`;
}

export function PathwayDetailPanel({
  drug,
  enzyme,
  colliding,
  onOpenAtlas,
  onClose,
}: {
  drug: Drug;
  enzyme: Enzyme;
  colliding: boolean;
  onOpenAtlas: () => void;
  onClose: () => void;
}) {
  const roles = cellRoles(drug, enzyme);
  const hl = halfLifeMeta(drug.id);

  return (
    <div
      role="region"
      aria-label="Selected pathway detail"
      className="mt-3 rounded-lg border border-border-strong bg-surface-2 p-3.5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-base font-medium tracking-tight text-fg">
              {drug.name} × {enzyme}
            </h3>
            <span className="rounded border border-border bg-bg-sunken px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted tabular-nums">
              t½ {hl.display}
            </span>
            {colliding ? (
              <span className="rounded border border-danger/30 bg-danger-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-danger">
                Tray collision
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {drug.cls}
            {hl.source ? ` · Half-life source: ${hl.source}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenAtlas}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-accent/30 bg-accent-soft px-2.5 py-1 font-mono text-[11px] font-medium text-accent transition-colors hover:border-accent"
          >
            <span>Open {enzyme} in Atlas</span>
            <ExternalLink className="size-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pathway detail"
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-fg"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul className="mt-2.5 space-y-2 text-xs">
        {roles.sub ? (
          <li
            className={cn(
              "rounded-md border px-3 py-2",
              roles.sub.pathway === "activation"
                ? "border-info/30 bg-info-soft/50"
                : "border-border bg-surface",
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {roles.sub.pathway === "activation" ? (
                <span className="rounded border border-info/30 bg-info-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-info">
                  ACT
                </span>
              ) : (
                <span className="rounded border border-accent/25 bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent">
                  {SUBSTRATE_CODE[roles.sub.sensitivity]}
                </span>
              )}
              {roles.sub.nti ? (
                <span className="rounded border border-danger/35 bg-surface-2 px-1 py-0.5 font-mono text-[9px] font-semibold text-danger">
                  NTI
                </span>
              ) : null}
              <span className="font-medium text-fg">
                {roles.sub.pathway === "activation"
                  ? `Prodrug bioactivation via ${enzyme} (${roles.sub.sensitivity})`
                  : `${SUBSTRATE_LABEL[roles.sub.sensitivity]} on ${enzyme}`}
              </span>
            </div>
            <p className="mt-1 leading-relaxed text-muted">
              {roles.sub.pathway === "activation"
                ? `Prodrug bioactivation pathway: ${drug.name} relies on ${enzyme} to form active metabolite. Enzyme inhibition or poor metabolizer activity can blunt response, whereas ultrarapid activity can increase active metabolite exposure.`
                : SUBSTRATE_TIER_NOTE[roles.sub.sensitivity]}
              {roles.sub.nti
                ? " Narrow therapeutic index (NTI): modest exposure shifts carry elevated clinical significance."
                : ""}
            </p>
          </li>
        ) : null}

        {roles.inh ? (
          <li className="rounded-md border border-danger/25 bg-danger-soft/35 px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded border border-danger/30 bg-danger-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-danger tabular-nums">
                INH·{STRENGTH_CODE[roles.inh.strength]}
              </span>
              <span className="font-medium text-fg">
                {STRENGTH_LABEL[roles.inh.strength]} {enzyme} inhibitor
              </span>
            </div>
            <p className="mt-1 leading-relaxed text-muted">{INHIBITOR_TIER_NOTE[roles.inh.strength]}</p>
          </li>
        ) : null}

        {roles.ind ? (
          <li className="rounded-md border border-warn/25 bg-warn-soft/35 px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded border border-warn/30 bg-warn-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warn tabular-nums">
                IND·{STRENGTH_CODE[roles.ind.strength]}
              </span>
              <span className="font-medium text-fg">
                {STRENGTH_LABEL[roles.ind.strength]} {enzyme} inducer
              </span>
            </div>
            <p className="mt-1 leading-relaxed text-muted">{INDUCER_TIER_NOTE[roles.ind.strength]}</p>
          </li>
        ) : null}
      </ul>

      {hl.nonLinearNote ? (
        <p className="mt-2.5 border-t border-border pt-2 text-[11px] leading-relaxed text-muted">
          <span className="font-mono font-semibold text-fg">Half-life note:</span> {hl.nonLinearNote}
        </p>
      ) : null}
    </div>
  );
}

export function CypHeatmap({ drugs, colliding }: { drugs: Drug[]; colliding: Set<Enzyme> }) {
  const setAtlasEnzyme = useDesk((s) => s.setAtlasEnzyme);
  const setView = useDesk((s) => s.setView);
  const [filter, setFilter] = useState<MatrixFilter>("active");
  const [selectedCell, setSelectedCell] = useState<{ drugId: string; enzyme: Enzyme } | null>(null);

  const mapped = useMemo(() => drugs.filter((d) => d.enzymes.length > 0), [drugs]);

  const activeEnzymes = useMemo(
    () => ENZYMES.filter((enzyme) => mapped.some((d) => d.enzymes.some((role) => role.enzyme === enzyme))),
    [mapped],
  );

  const collidingEnzymes = useMemo(
    () => ENZYMES.filter((enzyme) => colliding.has(enzyme)),
    [colliding],
  );

  if (mapped.length === 0) return null;

  const effectiveFilter: MatrixFilter =
    filter === "collisions" && collidingEnzymes.length === 0
      ? activeEnzymes.length > 0
        ? "active"
        : "all"
      : filter === "active" && activeEnzymes.length === 0
        ? "all"
        : filter;

  const visibleEnzymes: readonly Enzyme[] =
    effectiveFilter === "all"
      ? ENZYMES
      : effectiveFilter === "collisions"
        ? collidingEnzymes
        : activeEnzymes;

  const counted = ENZYMES.flatMap((enzyme) => {
    const count = mapped.filter((d) => d.enzymes.some((role) => role.enzyme === enzyme)).length;
    return count > 0 ? [{ enzyme, short: enzyme.replace("CYP", ""), count }] : [];
  });
  const parts = counted.map(({ short, count }) => `${short} ${count}`).join(" · ");

  const inspectedDrug = selectedCell ? mapped.find((d) => d.id === selectedCell.drugId) : undefined;
  const inspectedEnzyme =
    selectedCell && visibleEnzymes.includes(selectedCell.enzyme) ? selectedCell.enzyme : undefined;
  const inspectedRoles =
    inspectedDrug && inspectedEnzyme ? cellRoles(inspectedDrug, inspectedEnzyme) : undefined;
  const showInspector = Boolean(
    inspectedDrug &&
      inspectedEnzyme &&
      inspectedRoles &&
      (inspectedRoles.sub || inspectedRoles.inh || inspectedRoles.ind),
  );

  const openAtlas = (enzyme: Enzyme) => {
    setAtlasEnzyme(enzyme);
    setView("atlas");
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            CYP450 &amp; P-gp Pathway Matrix
          </p>
          <h2 className="mt-0.5 font-serif text-lg tracking-tight text-fg">Who shares which enzyme</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            FDA potency and sensitivity roles by enzyme pathway. Highlighted columns mark active tray
            collisions; select any occupied cell to inspect mechanism tiers.
          </p>
        </div>

        <ul
          aria-label="Pathway role legend"
          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[11px] text-muted"
        >
          <li className="inline-flex items-center gap-1.5">
            <span className="rounded border border-accent/25 bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-accent tabular-nums">
              SENS / MAJ / MIN
            </span>
            <span>Substrate</span>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="rounded border border-info/30 bg-info-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-info tabular-nums">
              ACT
            </span>
            <span>Prodrug activation</span>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="rounded border border-danger/30 bg-danger-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-danger tabular-nums">
              INH
            </span>
            <span>Inhibitor (STR/MOD/WK)</span>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="rounded border border-warn/30 bg-warn-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-warn tabular-nums">
              IND
            </span>
            <span>Inducer (STR/MOD/WK)</span>
          </li>
        </ul>
      </div>

      <div className="my-3 flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Filter enzyme pathways" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-pressed={effectiveFilter === "active"}
            onClick={() => setFilter("active")}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              effectiveFilter === "active"
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-fg",
            )}
          >
            <span>Active pathways</span>
            <span className="font-mono text-[10px] tabular-nums">({activeEnzymes.length})</span>
          </button>
          <button
            type="button"
            aria-pressed={effectiveFilter === "all"}
            onClick={() => setFilter("all")}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              effectiveFilter === "all"
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-fg",
            )}
          >
            <span>All {ENZYMES.length} pathways</span>
          </button>
          <button
            type="button"
            aria-pressed={effectiveFilter === "collisions"}
            disabled={collidingEnzymes.length === 0}
            title={
              collidingEnzymes.length === 0
                ? "No active enzyme collisions on this tray"
                : "Show only pathways with active tray collisions"
            }
            onClick={() => setFilter("collisions")}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              effectiveFilter === "collisions"
                ? "border-danger/40 bg-danger-soft text-danger"
                : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-fg",
            )}
          >
            <span>Collisions only</span>
            <span className="font-mono text-[10px] tabular-nums">({collidingEnzymes.length})</span>
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-muted">
          Tap a pathway header to open it in the atlas. Drug names stay pinned on narrow screens.
        </p>
      </div>

      <div
        role="region"
        aria-label="Shared enzyme table"
        tabIndex={0}
        className="relative overflow-x-auto rounded-lg border border-border bg-surface-2"
      >
        <table className="min-w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-[132px] border-b border-r border-border bg-bg-sunken px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted"
              >
                Drug
              </th>
              <th
                scope="col"
                title="Typical adult elimination half-life"
                className="border-b border-r border-border bg-bg-sunken px-2.5 py-2 text-right font-mono text-[10px] font-semibold tracking-wide text-muted"
              >
                t½
              </th>
              {visibleEnzymes.map((e) => {
                const isColliding = colliding.has(e);
                return (
                  <th
                    key={e}
                    scope="col"
                    data-enzyme={e}
                    data-colliding={isColliding ? "true" : "false"}
                    className={cn(
                      "min-w-[84px] border-b border-r border-border px-1.5 py-2 text-center last:border-r-0",
                      isColliding ? "bg-danger-soft/65" : "bg-bg-sunken",
                    )}
                  >
                    <button
                      type="button"
                      title={`Open ${e} in the atlas`}
                      aria-label={`Open ${e} in the atlas${isColliding ? " (active collision)" : ""}`}
                      className={cn(
                        "inline-flex min-h-7 items-center justify-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors hover:bg-surface",
                        isColliding ? "text-danger" : "text-fg",
                      )}
                      onClick={() => openAtlas(e)}
                    >
                      <span>{e.replace("CYP", "")}</span>
                      {isColliding ? (
                        <span
                          aria-hidden="true"
                          className="inline-block size-1.5 rounded-full bg-danger"
                        />
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {mapped.map((drug) => {
              const hl = halfLifeMeta(drug.id);
              const drugHasNti = drug.enzymes.some((r) => r.kind === "substrate" && r.nti);
              return (
                <tr key={drug.id} className="group">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-r border-border bg-surface px-3 py-2 text-left align-middle group-last:border-b-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-fg">{drug.name}</span>
                      {drugHasNti ? (
                        <span
                          title="Narrow therapeutic index substrate"
                          className="rounded border border-danger/35 bg-danger-soft px-1 py-0.5 font-mono text-[9px] font-semibold leading-none text-danger"
                        >
                          NTI
                        </span>
                      ) : null}
                    </div>
                  </th>
                  <td
                    title={hl.tooltip}
                    className="whitespace-nowrap border-b border-r border-border bg-surface px-2.5 py-2 text-right align-middle font-mono text-[11px] tabular-nums group-last:border-b-0"
                  >
                    {hl.nonLinearNote ? (
                      <span className="cursor-help border-b border-dotted border-border-strong text-muted">
                        {hl.display}
                      </span>
                    ) : (
                      <span className={hl.source ? "text-fg" : "text-subtle"}>{hl.display}</span>
                    )}
                  </td>
                  {visibleEnzymes.map((enzyme) => {
                    const roles = cellRoles(drug, enzyme);
                    const { sub, inh, ind } = roles;
                    const occupied = Boolean(sub || inh || ind);
                    const isColliding = colliding.has(enzyme);
                    const hit = isColliding && occupied;
                    const isSelected =
                      showInspector &&
                      selectedCell?.drugId === drug.id &&
                      selectedCell?.enzyme === enzyme;

                    if (!occupied) {
                      return (
                        <td
                          key={enzyme}
                          className={cn(
                            "relative border-b border-r border-border px-1.5 py-2 text-center align-middle last:border-r-0 group-last:border-b-0",
                            isColliding ? "bg-danger-soft/20" : "bg-surface",
                          )}
                        >
                          <span aria-hidden="true" className="font-mono text-xs text-subtle">
                            —
                          </span>
                          <span className="sr-only">No mapped role on {enzyme}</span>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={enzyme}
                        data-hit={hit ? "true" : "false"}
                        className={cn(
                          "border-b border-r border-border p-1 text-center align-middle last:border-r-0 group-last:border-b-0",
                          hit
                            ? "border-t-2 border-l-2 border-t-danger border-l-danger bg-danger-soft/45"
                            : "bg-surface-2",
                        )}
                      >
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={cellAriaLabel(drug, enzyme, roles, hit)}
                          onClick={() =>
                            setSelectedCell((prev) =>
                              prev && prev.drugId === drug.id && prev.enzyme === enzyme
                                ? null
                                : { drugId: drug.id, enzyme },
                            )
                          }
                          className={cn(
                            "flex min-h-10 w-full flex-col items-center justify-center gap-1 rounded px-1.5 py-1 transition-colors",
                            isSelected
                              ? hit
                                ? "bg-surface-2 ring-1 ring-inset ring-danger"
                                : "bg-accent-soft/45 ring-1 ring-inset ring-accent"
                              : "hover:bg-bg-sunken/60",
                          )}
                        >
                          {sub ? (
                            <span className="inline-flex flex-wrap items-center justify-center gap-1">
                              {sub.pathway === "activation" ? (
                                <span
                                  title={`Prodrug bioactivation via ${enzyme} (${sub.sensitivity})`}
                                  className="inline-flex items-center rounded border border-info/30 bg-info-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-wide text-info tabular-nums"
                                >
                                  ACT
                                </span>
                              ) : (
                                <span
                                  title={`${SUBSTRATE_LABEL[sub.sensitivity]} via ${enzyme}${sub.nti ? " · Narrow therapeutic index (NTI)" : ""}`}
                                  className="inline-flex items-center rounded border border-accent/25 bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-wide text-accent tabular-nums"
                                >
                                  {SUBSTRATE_CODE[sub.sensitivity]}
                                </span>
                              )}
                              {sub.nti ? (
                                <span
                                  title="Narrow therapeutic index substrate"
                                  className="inline-flex items-center rounded border border-danger/35 bg-surface-2 px-1 py-0.5 font-mono text-[9px] font-semibold leading-none tracking-wide text-danger"
                                >
                                  NTI
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                          {inh ? (
                            <span
                              title={`${STRENGTH_LABEL[inh.strength]} ${enzyme} inhibitor · ${INHIBITOR_TIER_NOTE[inh.strength]}`}
                              className="inline-flex items-center rounded border border-danger/30 bg-danger-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-wide text-danger tabular-nums"
                            >
                              INH·{STRENGTH_CODE[inh.strength]}
                            </span>
                          ) : null}
                          {ind ? (
                            <span
                              title={`${STRENGTH_LABEL[ind.strength]} ${enzyme} inducer · ${INDUCER_TIER_NOTE[ind.strength]}`}
                              className="inline-flex items-center rounded border border-warn/30 bg-warn-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-wide text-warn tabular-nums"
                            >
                              IND·{STRENGTH_CODE[ind.strength]}
                            </span>
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showInspector && inspectedDrug && inspectedEnzyme ? (
        <PathwayDetailPanel
          drug={inspectedDrug}
          enzyme={inspectedEnzyme}
          colliding={colliding.has(inspectedEnzyme)}
          onOpenAtlas={() => openAtlas(inspectedEnzyme)}
          onClose={() => setSelectedCell(null)}
        />
      ) : (
        <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
          Select any occupied cell to inspect FDA potency tiers, prodrug activation notes, and
          half-life metadata.
        </p>
      )}

      {parts ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[11px] leading-relaxed text-muted tabular-nums">
            On this tray: {parts}. A count of drugs here that touch that enzyme. Not a collision by
            itself.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {counted.map(({ enzyme, short, count }) => {
              const isColliding = colliding.has(enzyme);
              return (
                <button
                  key={enzyme}
                  type="button"
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[10px] font-medium uppercase tracking-wide tabular-nums transition-colors",
                    isColliding
                      ? "border-danger/35 bg-danger-soft text-danger hover:border-danger"
                      : "border-border bg-bg-sunken text-muted hover:border-border-strong hover:text-fg",
                  )}
                  onClick={() => openAtlas(enzyme)}
                >
                  <span>{short}</span>
                  <span className="font-semibold">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
