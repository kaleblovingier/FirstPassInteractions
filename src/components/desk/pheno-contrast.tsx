import { useMemo } from "react";
import {
  clinicalPhenoLabel,
  phenoContrastsOnDesk,
  type PhenoContrast,
} from "@/lib/drugs/pheno-convert";
import { METABOLIZER_LABEL, type HostContext } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function genotypeLabel(g: PhenoContrast["genotype"]) {
  if (g === "NM") return "Normal";
  return METABOLIZER_LABEL[g] ?? g;
}

function SideCard({
  title,
  subtitle,
  clinical,
  genotype,
  blurb,
  tone,
  names,
}: {
  title: string;
  subtitle: string;
  clinical: PhenoContrast["beforeClinical"];
  genotype: PhenoContrast["genotype"];
  blurb: string;
  tone: "before" | "after";
  names: string[];
}) {
  const hot = tone === "after";
  return (
    <div
      className={cn(
        "rounded-md px-3 py-3",
        hot ? "bg-accent-soft ring-1 ring-accent/20" : "bg-bg-sunken",
      )}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{title}</p>
      <p className="mt-1 text-xs text-muted">{subtitle}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-serif text-xl tracking-tight text-fg">{clinicalPhenoLabel(clinical)}</span>
        <Badge tone={hot ? "warn" : "info"}>
          known status: {genotypeLabel(genotype)}
        </Badge>
      </div>
      {names.length ? (
        <p className="mt-2 text-xs text-muted">
          On tray: <span className="text-fg">{names.join(", ")}</span>
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">No medicine on this tray depends on this enzyme.</p>
      )}
      <p className="mt-2 text-sm leading-relaxed text-fg">{blurb}</p>
    </div>
  );
}

function ContrastRow({ contrast }: { contrast: PhenoContrast }) {
  const beforeNames = contrast.victims.map((v) =>
    v.pathway === "activation" ? `${v.name} (needs activation)` : v.name,
  );
  const afterNames = [
    ...contrast.perpetrators.map((p) => `${p.name} · ${p.strength} ${p.kind}`),
    ...contrast.victims.map((v) => v.name),
  ];
  return (
    <article className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-mono text-sm text-fg">{contrast.enzyme}</h3>
        {contrast.shifted ? (
          <Badge tone="warn">phenotype rewritten</Badge>
        ) : (
          <Badge tone="info">no shift yet</Badge>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SideCard
          title="Before"
          subtitle="Blocker or inducer off, same other medicines"
          clinical={contrast.beforeClinical}
          genotype={contrast.genotype}
          blurb={contrast.beforeBlurb}
          tone="before"
          names={beforeNames}
        />
        <SideCard
          title="After"
          subtitle="Blocker or inducer on, as the tray is now"
          clinical={contrast.afterClinical}
          genotype={contrast.genotype}
          blurb={contrast.afterBlurb}
          tone="after"
          names={afterNames}
        />
      </div>
      <p className="text-sm leading-relaxed text-muted">{contrast.pearl}</p>
    </article>
  );
}

/** Two-panel phenoconversion: perpetrator off vs on for the current tray. */
export function PhenoContrastBoard({
  ids,
  host,
  emptyHint,
}: {
  ids: string[];
  host: HostContext;
  emptyHint?: string;
}) {
  const contrasts = useMemo(() => phenoContrastsOnDesk(ids, host), [ids.join("|"), host]);

  if (!contrasts.length) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        {emptyHint ??
          "No blocker or inducer sits next to a medicine it affects on this tray yet. Empty is not a green light: the map may not cover these names. Try paroxetine with codeine, the teaching pair. The left panel is the tray without the blocker; the right panel is the tray as it is. Educational only, not a milligram, not a new genotype report."}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted">
        Same tray, blocker or inducer off, then on. The metabolizer status you already know does not
        change. How the enzyme behaves on this tray does. Not a dose, not a test order, and not a genetic
        test result.
      </p>
      {contrasts.map((c) => (
        <ContrastRow key={c.enzyme} contrast={c} />
      ))}
      <p className="text-[11px] leading-relaxed text-subtle">
        Shah &amp; Smith: phenoconversion is the Achilles heel of a genotype report. CPIC guidance is
        written for the known status; this desk scores how the enzyme behaves on this tray. A teaching
        summary of CPIC guidance, not a gene report reading. The Prescribing Information still wins.
      </p>
    </div>
  );
}
