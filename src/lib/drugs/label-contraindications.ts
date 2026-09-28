/**
 * Label-sourced contraindication pins for named CYP pairs.
 *
 * Why this exists: the enzyme rule (`pkSeverity` in engine.ts) grades pairs
 * from perpetrator strength and substrate sensitivity. For a short list of
 * pairs, the FDA-approved label itself lists the combination under
 * Contraindications. Those pairs should read "Avoid together" because the
 * label says so, not only because the enzyme grades happen to line up. When a
 * perpetrator grade is corrected to FDA's table (for example ciprofloxacin as a
 * moderate CYP1A2 inhibitor), the enzyme rule alone can drop a
 * label-contraindicated pair. A pin keeps it at contraindicated.
 *
 * Scope rules:
 * - Only exact, named catalog pairs. No class expansion, no global threshold
 *   change. Each pin names one enzyme and one direction (inhibitor or inducer).
 * - `quote`, `labelExample`, `labelSection` and `url` are copied byte-for-byte
 *   from `src/lib/drugs/reference/label-gold-set.ts` (PR #65), so the desk and
 *   the gold-set test cite identical text. Quotes are verbatim DailyMed SPL
 *   text ("…" marks an elided span), retrieved 2026-09-27.
 * - Rows with origin "restored-after-58" are not in the gold set. Their quotes
 *   reuse gold-set strings where the same label sentence applies, or are the
 *   verbatim DailyMed Contraindications text (Ranexa section 4).
 * - `contraindicationsSentence` is added only where the gold-set quote comes
 *   from a section other than Contraindications (Zanaflex 7.1, Ranexa 7.1). It
 *   is the verbatim section 4 sentence from the same DailyMed label.
 *
 * Educational reference, not FDA-cleared. No doses.
 */
import type { Enzyme } from "./types";

export interface LabelContraindication {
  /** Stable id, `labelDrugId+otherId` (matches the gold-set id). */
  id: string;
  /** Catalog id of the drug whose label carries the contraindication. */
  labelDrugId: string;
  /** Catalog id of the other drug (the CYP perpetrator). */
  otherId: string;
  /** Enzyme the pinned finding is on. */
  enzyme: Enzyme;
  /** Direction of the perpetrator on that enzyme. */
  kind: "inhibitor" | "inducer";
  labelDrug: string;
  labelSection: string;
  quote: string;
  labelExample?: string;
  contraindicationsSentence?: string;
  url: string;
  /**
   * `named`: the label names this drug (in the Contraindications sentence or
   * the example list it points to). `class`: the Contraindications sentence
   * covers a class this drug belongs to (for example "inducers of CYP3A") but
   * does not name it.
   */
  basis: "named" | "class";
  /** Why the pin was added: gold-set pair from PR #65, or restored after PR #58 grade changes. */
  origin: "gold-set" | "restored-after-58";
}

export const LABEL_CONTRAINDICATIONS_RETRIEVED = "2026-09-27";

export const LABEL_CONTRAINDICATIONS: readonly LabelContraindication[] = [
  {
    id: "simvastatin+clarithromycin",
    labelDrugId: "simvastatin",
    otherId: "clarithromycin",
    enzyme: "CYP3A4",
    kind: "inhibitor",
    labelDrug: "Zocor (simvastatin)",
    labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant use of strong CYP3A4 inhibitors (select azole anti-fungals, macrolide antibiotics, anti-viral medications, and nefazodone)",
    labelExample: "select macrolide antibiotics (e.g., erythromycin and clarithromycin)",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8f55d5de-5a4f-4a39-8c84-c53976dd6af9",
  },
  {
    id: "simvastatin+itraconazole",
    labelDrugId: "simvastatin",
    otherId: "itraconazole",
    enzyme: "CYP3A4",
    kind: "inhibitor",
    labelDrug: "Zocor (simvastatin)",
    labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant use of strong CYP3A4 inhibitors (select azole anti-fungals, macrolide antibiotics, anti-viral medications, and nefazodone)",
    labelExample: "Select azole anti-fungals (e.g., itraconazole, ketoconazole, posaconazole, and voriconazole)",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8f55d5de-5a4f-4a39-8c84-c53976dd6af9",
  },
  {
    id: "simvastatin+ritonavir",
    labelDrugId: "simvastatin",
    otherId: "ritonavir",
    enzyme: "CYP3A4",
    kind: "inhibitor",
    labelDrug: "Zocor (simvastatin)",
    labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant use of strong CYP3A4 inhibitors (select azole anti-fungals, macrolide antibiotics, anti-viral medications, and nefazodone)",
    labelExample: "select HIV protease inhibitors (e.g., nelfinavir, ritonavir, and darunavir/ritonavir)",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8f55d5de-5a4f-4a39-8c84-c53976dd6af9",
  },
  {
    id: "lovastatin+clarithromycin",
    labelDrugId: "lovastatin",
    otherId: "clarithromycin",
    enzyme: "CYP3A4",
    kind: "inhibitor",
    labelDrug: "Lovastatin tablets",
    labelSection: "CONTRAINDICATIONS",
    quote: "Concomitant administration with strong CYP3A4 inhibitors (e.g., itraconazole, ketoconazole, … erythromycin, clarithromycin, telithromycin",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=9438d8a0-ca5b-4676-aab9-d0241ccff6c9",
  },
  {
    id: "tizanidine+fluvoxamine",
    labelDrugId: "tizanidine",
    otherId: "fluvoxamine",
    enzyme: "CYP1A2",
    kind: "inhibitor",
    labelDrug: "Zanaflex (tizanidine)",
    labelSection: "7.1 Strong CYP1A2 Inhibitors (see 4 CONTRAINDICATIONS)",
    quote: "Concomitant use of Zanaflex with strong cytochrome P450 1A2 (CYP1A2) inhibitors (e.g., fluvoxamine, ciprofloxacin) is contraindicated.",
    contraindicationsSentence: "Zanaflex is contraindicated in patients taking strong CYP1A2 inhibitors",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=60c27d35-7349-4fc6-86ad-70fffdbe3e08",
  },
  {
    id: "tizanidine+ciprofloxacin",
    labelDrugId: "tizanidine",
    otherId: "ciprofloxacin",
    enzyme: "CYP1A2",
    kind: "inhibitor",
    labelDrug: "Zanaflex (tizanidine)",
    labelSection: "7.1 Strong CYP1A2 Inhibitors (see 4 CONTRAINDICATIONS)",
    quote: "Concomitant use of Zanaflex with strong cytochrome P450 1A2 (CYP1A2) inhibitors (e.g., fluvoxamine, ciprofloxacin) is contraindicated.",
    contraindicationsSentence: "Zanaflex is contraindicated in patients taking strong CYP1A2 inhibitors",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=60c27d35-7349-4fc6-86ad-70fffdbe3e08",
  },
  {
    id: "pimozide+clarithromycin",
    labelDrugId: "pimozide",
    otherId: "clarithromycin",
    enzyme: "CYP3A4",
    kind: "inhibitor",
    labelDrug: "Pimozide tablets",
    labelSection: "CONTRAINDICATIONS",
    quote: "pimozide is contraindicated in patients receiving the macrolide antibiotics clarithromycin, erythromycin, azithromycin, dirithromycin, and troleandomycin.",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=70b079e2-a1f7-4a93-8685-d60a4d7c1280",
  },
  {
    id: "pimozide+ketoconazole",
    labelDrugId: "pimozide",
    otherId: "ketoconazole",
    enzyme: "CYP3A4",
    kind: "inhibitor",
    labelDrug: "Pimozide tablets",
    labelSection: "CONTRAINDICATIONS",
    quote: "pimozide is contraindicated in patients receiving the azole antifungal agents itraconazole and ketoconazole.",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=70b079e2-a1f7-4a93-8685-d60a4d7c1280",
  },
  {
    id: "thioridazine+fluoxetine",
    labelDrugId: "thioridazine",
    otherId: "fluoxetine",
    enzyme: "CYP2D6",
    kind: "inhibitor",
    labelDrug: "Thioridazine HCl tablets",
    labelSection: "CONTRAINDICATIONS",
    quote: "drugs that inhibit this isozyme (e.g., fluoxetine and paroxetine) … thioridazine is contraindicated with these drugs",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1fd16a99-e856-4a37-9dae-c443714fac14",
  },
  {
    id: "thioridazine+paroxetine",
    labelDrugId: "thioridazine",
    otherId: "paroxetine",
    enzyme: "CYP2D6",
    kind: "inhibitor",
    labelDrug: "Thioridazine HCl tablets",
    labelSection: "CONTRAINDICATIONS",
    quote: "drugs that inhibit this isozyme (e.g., fluoxetine and paroxetine) … thioridazine is contraindicated with these drugs",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1fd16a99-e856-4a37-9dae-c443714fac14",
  },
  {
    id: "lurasidone+ketoconazole",
    labelDrugId: "lurasidone",
    otherId: "ketoconazole",
    enzyme: "CYP3A4",
    kind: "inhibitor",
    labelDrug: "Latuda (lurasidone)",
    labelSection: "4 CONTRAINDICATIONS",
    quote: "Strong CYP3A4 inhibitors (e.g., ketoconazole, clarithromycin, ritonavir, voriconazole, mibefradil, etc.)",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=afad3051-9df2-4c54-9684-e8262a133af8",
  },
  {
    id: "lurasidone+rifampin",
    labelDrugId: "lurasidone",
    otherId: "rifampin",
    enzyme: "CYP3A4",
    kind: "inducer",
    labelDrug: "Latuda (lurasidone)",
    labelSection: "4 CONTRAINDICATIONS",
    quote: "Strong CYP3A4 inducers (e.g., rifampin, avasimibe, St. John's wort, phenytoin, carbamazepine, etc.)",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=afad3051-9df2-4c54-9684-e8262a133af8",
  },
  {
    id: "ramelteon+fluvoxamine",
    labelDrugId: "ramelteon",
    otherId: "fluvoxamine",
    enzyme: "CYP1A2",
    kind: "inhibitor",
    labelDrug: "Rozerem (ramelteon)",
    labelSection: "4 CONTRAINDICATIONS",
    quote: "Patients should not take ROZEREM in conjunction with fluvoxamine",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=9de82310-70e8-47b9-b1fc-6c6848b99455",
  },
  {
    id: "triazolam+ketoconazole",
    labelDrugId: "triazolam",
    otherId: "ketoconazole",
    enzyme: "CYP3A4",
    kind: "inhibitor",
    labelDrug: "Triazolam tablets",
    labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant administration of strong cytochrome P450 (CYP 3A) enzyme inhibitors (e.g., ketoconazole, itraconazole, nefazodone, lopinavir, ritonavir)",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=5add318e-11b9-42f8-b052-0d8cebb32fcf",
  },
  {
    id: "ivabradine+clarithromycin",
    labelDrugId: "ivabradine",
    otherId: "clarithromycin",
    enzyme: "CYP3A4",
    kind: "inhibitor",
    labelDrug: "Corlanor (ivabradine)",
    labelSection: "4 CONTRAINDICATIONS",
    quote: "Concomitant use of strong cytochrome P450 3A4 (CYP3A4) inhibitors",
    labelExample: "macrolide antibiotics (e.g., clarithromycin, telithromycin)",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=92018a65-38f6-45f7-91d4-a34921b81d0d",
  },
  {
    id: "ranolazine+ketoconazole",
    labelDrugId: "ranolazine",
    otherId: "ketoconazole",
    enzyme: "CYP3A4",
    kind: "inhibitor",
    labelDrug: "Ranexa (ranolazine)",
    labelSection: "7.1 (see 4 CONTRAINDICATIONS)",
    quote: "Do not use RANEXA with strong CYP3A inhibitors, including ketoconazole, itraconazole, clarithromycin, nefazodone, nelfinavir, ritonavir, indinavir, and saquinavir",
    contraindicationsSentence: "RANEXA is contraindicated in patients: Taking strong inhibitors of CYP3A",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e038f963-d78f-460e-a11f-46f224061505",
  },
  {
    id: "ranolazine+rifampin",
    labelDrugId: "ranolazine",
    otherId: "rifampin",
    enzyme: "CYP3A4",
    kind: "inducer",
    labelDrug: "Ranexa (ranolazine)",
    labelSection: "7.1 (see 4 CONTRAINDICATIONS)",
    quote: "Do not use RANEXA with CYP3A inducers such as rifampin, rifabutin, rifapentine, phenobarbital, phenytoin, carbamazepine",
    contraindicationsSentence: "RANEXA is contraindicated in patients: … Taking inducers of CYP3A",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e038f963-d78f-460e-a11f-46f224061505",
  },
  {
    id: "eplerenone+ketoconazole",
    labelDrugId: "eplerenone",
    otherId: "ketoconazole",
    enzyme: "CYP3A4",
    kind: "inhibitor",
    labelDrug: "Inspra (eplerenone)",
    labelSection: "4 CONTRAINDICATIONS",
    quote: "concomitant administration of strong CYP3A inhibitors (e.g., ketoconazole, itraconazole, nefazodone, troleandomycin, clarithromycin, ritonavir, and nelfinavir)",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1a52bedc-8e2c-4116-a296-a87770676b4a",
  },
  {
    id: "alosetron+fluvoxamine",
    labelDrugId: "alosetron",
    otherId: "fluvoxamine",
    enzyme: "CYP1A2",
    kind: "inhibitor",
    labelDrug: "Lotronex (alosetron)",
    labelSection: "4.3 Concomitant Use of Fluvoxamine",
    quote: "Concomitant administration of LOTRONEX with fluvoxamine is contraindicated.",
    basis: "named",
    origin: "gold-set",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=35cbb9d5-639b-207a-e054-00144ff88e88",
  },
  // ── Restored after #58: were contraindicated on main via the enzyme rule, the
  // label contraindicates them, and #58's FDA-aligned grades dropped them to major.
  {
    id: "ranolazine+phenobarbital",
    labelDrugId: "ranolazine",
    otherId: "phenobarbital",
    enzyme: "CYP3A4",
    kind: "inducer",
    labelDrug: "Ranexa (ranolazine)",
    labelSection: "7.1 (see 4 CONTRAINDICATIONS)",
    quote: "Do not use RANEXA with CYP3A inducers such as rifampin, rifabutin, rifapentine, phenobarbital, phenytoin, carbamazepine",
    contraindicationsSentence: "RANEXA is contraindicated in patients: … Taking inducers of CYP3A",
    basis: "named",
    origin: "restored-after-58",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e038f963-d78f-460e-a11f-46f224061505",
  },
  {
    id: "ranolazine+primidone",
    labelDrugId: "ranolazine",
    otherId: "primidone",
    enzyme: "CYP3A4",
    kind: "inducer",
    labelDrug: "Ranexa (ranolazine)",
    labelSection: "4 CONTRAINDICATIONS",
    quote: "RANEXA is contraindicated in patients: … Taking inducers of CYP3A",
    basis: "class",
    origin: "restored-after-58",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e038f963-d78f-460e-a11f-46f224061505",
  },
  {
    id: "thioridazine+abiraterone",
    labelDrugId: "thioridazine",
    otherId: "abiraterone",
    enzyme: "CYP2D6",
    kind: "inhibitor",
    labelDrug: "Thioridazine HCl tablets",
    labelSection: "CONTRAINDICATIONS",
    quote: "drugs that inhibit this isozyme (e.g., fluoxetine and paroxetine) … thioridazine is contraindicated with these drugs",
    basis: "class",
    origin: "restored-after-58",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1fd16a99-e856-4a37-9dae-c443714fac14",
  },
  {
    id: "thioridazine+cinacalcet",
    labelDrugId: "thioridazine",
    otherId: "cinacalcet",
    enzyme: "CYP2D6",
    kind: "inhibitor",
    labelDrug: "Thioridazine HCl tablets",
    labelSection: "CONTRAINDICATIONS",
    quote: "drugs that inhibit this isozyme (e.g., fluoxetine and paroxetine) … thioridazine is contraindicated with these drugs",
    basis: "class",
    origin: "restored-after-58",
    url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1fd16a99-e856-4a37-9dae-c443714fac14",
  },
];

export const LABEL_CONTRAINDICATED_TAG = "label-contraindicated";

const BY_PAIR = new Map<string, LabelContraindication>();
for (const r of LABEL_CONTRAINDICATIONS) {
  BY_PAIR.set([r.labelDrugId, r.otherId].sort().join("|"), r);
}

/** Pin for an unordered pair of catalog ids, if the label contraindicates it. */
export function labelContraindicationFor(a: string, b: string): LabelContraindication | undefined {
  return BY_PAIR.get([a, b].sort().join("|"));
}

export function labelContraindicationById(id: string): LabelContraindication | undefined {
  return LABEL_CONTRAINDICATIONS.find((r) => r.id === id);
}

/** Plain sentence appended to the pinned finding's clinical text. */
export function labelPinSentence(r: LabelContraindication): string {
  return `The ${r.labelDrug} label lists this combination under Contraindications, so this desk shows it as Avoid together even where the enzyme grades alone would read lower.`;
}
