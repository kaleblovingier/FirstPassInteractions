/**
 * Phenoconversion — a strong inhibitor or inducer rewriting the host genotype.
 * Teaching map. Not a CPIC table and not a test order.
 */

import { DRUG_BY_ID } from "./catalog";
import { isVirtual } from "./host";
import {
  METABOLIZER_LABEL,
  type Drug,
  type Enzyme,
  type EnzymeRole,
  type Finding,
  type HostContext,
  type Metabolizer,
  type Severity,
  type Strength,
} from "./types";

export type ClinicalPheno = Metabolizer | "NM-like" | "IM-like" | "PM-like" | "induced";

export interface PhenoConvertRow {
  enzyme: Enzyme;
  genotype: Metabolizer | "NM";
  clinical: ClinicalPheno;
  shifted: boolean;
  inhibitors: Array<{ id: string; name: string; strength: Strength }>;
  inducers: Array<{ id: string; name: string; strength: Strength }>;
  victims: Array<{ id: string; name: string; pathway: "clearance" | "activation" }>;
  headline: string;
  pearl: string;
}

const WATCH: Enzyme[] = ["CYP2D6", "CYP2C19", "CYP2C9", "CYP2B6", "CYP1A2", "CYP3A4"];

function strongest(
  drugs: Drug[],
  enzyme: Enzyme,
  kind: "inhibitor" | "inducer",
): Array<{ id: string; name: string; strength: Strength }> {
  const rank: Record<Strength, number> = { strong: 3, moderate: 2, weak: 1 };
  const hits: Array<{ id: string; name: string; strength: Strength; n: number }> = [];
  for (const d of drugs) {
    const roles = d.enzymes.filter(
      (e): e is Extract<EnzymeRole, { kind: "inhibitor" | "inducer" }> =>
        e.enzyme === enzyme && e.kind === kind,
    );
    if (!roles.length) continue;
    const best = roles.reduce((m, r) => (rank[r.strength] > rank[m.strength] ? r : m));
    hits.push({ id: d.id, name: d.name, strength: best.strength, n: rank[best.strength] });
  }
  hits.sort((a, b) => b.n - a.n);
  return hits.map(({ id, name, strength }) => ({ id, name, strength }));
}

function victimsOf(drugs: Drug[], enzyme: Enzyme) {
  const out: Array<{ id: string; name: string; pathway: "clearance" | "activation" }> = [];
  for (const d of drugs) {
    if (isVirtual(d.id)) continue;
    const subs = d.enzymes.filter(
      (e): e is Extract<EnzymeRole, { kind: "substrate" }> => e.enzyme === enzyme && e.kind === "substrate",
    );
    if (!subs.length) continue;
    const hot = subs.reduce((m, s) => {
      const rank = { sensitive: 3, major: 2, minor: 1 };
      return rank[s.sensitivity] > rank[m.sensitivity] ? s : m;
    });
    out.push({ id: d.id, name: d.name, pathway: hot.pathway });
  }
  return out;
}

function clinicalOf(
  genotype: Metabolizer,
  inh: Strength | null,
  ind: Strength | null,
): { clinical: ClinicalPheno; shifted: boolean } {
  if (inh === "strong") {
    if (genotype === "PM") return { clinical: "PM", shifted: false };
    if (genotype === "UM") return { clinical: "NM-like", shifted: true };
    return { clinical: "PM-like", shifted: true };
  }
  if (inh === "moderate") {
    if (genotype === "PM") return { clinical: "PM", shifted: false };
    if (genotype === "UM") return { clinical: "NM-like", shifted: true };
    if (genotype === "IM") return { clinical: "PM-like", shifted: true };
    return { clinical: "IM-like", shifted: true };
  }
  if (ind === "strong" || ind === "moderate") {
    if (genotype === "PM") return { clinical: "PM", shifted: false };
    return { clinical: "induced", shifted: true };
  }
  return { clinical: genotype, shifted: false };
}

function pearlFor(row: PhenoConvertRow): string {
  const inh = row.inhibitors[0];
  const ind = row.inducers[0];
  const victim = row.victims[0];
  if (inh && victim && row.shifted) {
    const verb = victim.pathway === "activation" ? "activation stalls" : "parent climbs";
    return `${inh.name} is a ${inh.strength} ${row.enzyme} inhibitor. The chart says ${METABOLIZER_LABEL[row.genotype] ?? "normal"} — the enzyme on this desk is ${row.clinical.replace("-like", "")}. ${victim.name}: ${verb}. That is phenoconversion, not a new genotype.`;
  }
  if (ind && victim && row.shifted) {
    return `${ind.name} induces ${row.enzyme}. A ${METABOLIZER_LABEL[row.genotype] ?? "normal"} host now clears like an induced phenotype. ${victim.name} will look stolen unless you retitrate.`;
  }
  if (inh && row.shifted) {
    return `${inh.name} locks ${row.enzyme}. Victims added later inherit a ${row.clinical} enzyme, not the lab report.`;
  }
  if (row.genotype !== "NM" && !row.shifted) {
    return `Host is already a ${METABOLIZER_LABEL[row.genotype].toLowerCase()} ${row.enzyme} metabolizer. A perpetrator on this desk does not rewrite a missing enzyme.`;
  }
  return `${row.enzyme} on this desk matches the genotype. Flip a perpetrator or a victim to see phenoconversion.`;
}

export function phenoConvertFromDrugs(drugs: Drug[], host: HostContext): PhenoConvertRow[] {
  const rows: PhenoConvertRow[] = [];
  for (const enzyme of WATCH) {
    const inhibitors = strongest(drugs, enzyme, "inhibitor");
    const inducers = strongest(drugs, enzyme, "inducer");
    const victims = victimsOf(drugs, enzyme);
    if (!inhibitors.length && !inducers.length && !victims.length) continue;
    const genotype: Metabolizer =
      enzyme === "CYP2D6" || enzyme === "CYP2C19" || enzyme === "CYP2C9" || enzyme === "CYP2B6"
        ? (host.phenotypes[enzyme] ?? "NM")
        : "NM";
    const { clinical, shifted } = clinicalOf(
      genotype,
      inhibitors[0]?.strength ?? null,
      inducers[0]?.strength ?? null,
    );
    if (!shifted && !victims.length) continue;
    const headline = shifted
      ? `${enzyme}: ${genotype} genotype → ${clinical} on this desk`
      : victims.length
        ? `${enzyme}: ${genotype} · ${victims.length} victim${victims.length === 1 ? "" : "s"}`
        : `${enzyme}: ${genotype}`;
    const row: PhenoConvertRow = {
      enzyme,
      genotype,
      clinical,
      shifted,
      inhibitors,
      inducers,
      victims,
      headline,
      pearl: "",
    };
    row.pearl = pearlFor(row);
    rows.push(row);
  }
  return rows.sort((a, b) => Number(b.shifted) - Number(a.shifted) || a.enzyme.localeCompare(b.enzyme));
}

export function phenoConvertOnDesk(ids: string[], host: HostContext): PhenoConvertRow[] {
  const drugs = ids.map((id) => DRUG_BY_ID[id]).filter((d): d is Drug => Boolean(d));
  return phenoConvertFromDrugs(drugs, host);
}

export function phenoconversionFindings(drugs: Drug[], host: HostContext): Finding[] {
  const rows = phenoConvertFromDrugs(drugs, host).filter((r) => r.shifted && r.victims.length);
  const out: Finding[] = [];
  for (const row of rows) {
    const perp = row.inhibitors[0] ?? row.inducers[0];
    if (!perp) continue;
    const severity: Severity = perp.strength === "strong" ? "major" : "moderate";
    const names = row.victims.map((v) => v.name).join(", ");
    out.push({
      id: `pheno-${row.enzyme}-${perp.id}`,
      severity,
      kind: "geno",
      drugIds: [perp.id, ...row.victims.map((v) => v.id)].filter((id) => !isVirtual(id)),
      headline: `${row.enzyme} phenoconversion`,
      enzymes: [row.enzyme],
      effect: row.inhibitors.length ? "genotype rewritten toward PM" : "genotype rewritten toward induced",
      mechanism: `${perp.name} · ${perp.strength} ${row.enzyme} ${row.inhibitors.length ? "inhibitor" : "inducer"}`,
      clinical: `${row.pearl} Victims on this desk: ${names}. The CPIC row still lists the lab genotype — the enzyme in the patient does not.`,
      tags: [row.enzyme, "phenoconversion", "phenotype"],
    });
  }
  return out;
}

export function hasPhenoConvert(ids: string[], host: HostContext) {
  return phenoConvertOnDesk(ids, host).some((r) => r.shifted || (r.inhibitors.length > 0 && r.victims.length > 0));
}

/** Plain labels for clinical (desk) phenotype — teaching, not a lab report. */
export const CLINICAL_PHENO_LABEL: Record<ClinicalPheno, string> = {
  PM: "Poor",
  IM: "Intermediate",
  NM: "Normal",
  UM: "Ultrarapid",
  "PM-like": "Poor-like (blocked)",
  "IM-like": "Intermediate-like (slowed)",
  "NM-like": "Normal-like",
  induced: "Induced (sped up)",
};

export function clinicalPhenoLabel(p: ClinicalPheno): string {
  return CLINICAL_PHENO_LABEL[p] ?? String(p);
}

export interface PhenoPerpetrator {
  id: string;
  name: string;
  kind: "inhibitor" | "inducer";
  strength: Strength;
}

/** One enzyme: same tray with perpetrator(s) off vs on. Never a milligram. */
export interface PhenoContrast {
  enzyme: Enzyme;
  genotype: Metabolizer | "NM";
  beforeClinical: ClinicalPheno;
  afterClinical: ClinicalPheno;
  shifted: boolean;
  perpetrators: PhenoPerpetrator[];
  victims: Array<{ id: string; name: string; pathway: "clearance" | "activation" }>;
  beforeBlurb: string;
  afterBlurb: string;
  pearl: string;
  beforeIds: string[];
  afterIds: string[];
}

function blurbsFor(c: Omit<PhenoContrast, "beforeBlurb" | "afterBlurb" | "pearl">, pearl: string) {
  const geno =
    c.genotype === "NM"
      ? "normal"
      : (METABOLIZER_LABEL[c.genotype] ?? c.genotype).toLowerCase();
  const beforeBlurb = c.victims.length
    ? `Lab says ${geno} ${c.enzyme}. The affected medicines stay on the tray and the blocker or inducer is off, so the enzyme still matches the lab report.`
    : `Lab says ${geno} ${c.enzyme}. Nothing on the tray blocks or speeds this enzyme yet, so the lab result and how the enzyme acts still match.`;
  const perp = c.perpetrators[0];
  const afterBlurb = perp
    ? `${perp.name} (${perp.strength} ${perp.kind}) is on. The chart still lists ${geno}; the enzyme on this desk acts ${clinicalPhenoLabel(c.afterClinical).toLowerCase()}. That is phenoconversion, not a new genotype.`
    : pearl;
  return { beforeBlurb, afterBlurb };
}

/**
 * Build before/after panels: remove inhibitors/inducers for that enzyme, keep victims.
 * Contrasts the same tray with perpetrator off vs on.
 */
export function phenoContrastsOnDesk(ids: string[], host: HostContext): PhenoContrast[] {
  const afterRows = phenoConvertOnDesk(ids, host);
  const out: PhenoContrast[] = [];
  for (const row of afterRows) {
    const perpetrators: PhenoPerpetrator[] = [
      ...row.inhibitors.map((p) => ({ ...p, kind: "inhibitor" as const })),
      ...row.inducers.map((p) => ({ ...p, kind: "inducer" as const })),
    ];
    if (!perpetrators.length) continue;
    const perpIds = new Set(perpetrators.map((p) => p.id));
    const beforeIds = ids.filter((id) => !perpIds.has(id));
    const beforeRow = phenoConvertOnDesk(beforeIds, host).find((r) => r.enzyme === row.enzyme);
    const beforeClinical: ClinicalPheno = beforeRow?.clinical ?? row.genotype;
    const base = {
      enzyme: row.enzyme,
      genotype: row.genotype,
      beforeClinical,
      afterClinical: row.clinical,
      shifted: row.shifted,
      perpetrators,
      victims: row.victims,
      beforeIds,
      afterIds: [...ids],
    };
    const { beforeBlurb, afterBlurb } = blurbsFor(base, row.pearl);
    out.push({ ...base, beforeBlurb, afterBlurb, pearl: row.pearl });
  }
  return out.sort((a, b) => Number(b.shifted) - Number(a.shifted) || a.enzyme.localeCompare(b.enzyme));
}

export function hasPhenoContrast(ids: string[], host: HostContext) {
  return phenoContrastsOnDesk(ids, host).some((c) => c.shifted);
}
