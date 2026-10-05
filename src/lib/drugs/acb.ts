/**
 * Anticholinergic Cognitive Burden (ACB) teaching scale.
 * Based on published geriatric criteria (Boustani et al. 2008, Campbell et al. 2013, AGS Beers Criteria).
 * Cumulative anticholinergic exposure scoring:
 *   Score 1: Mild / potential anticholinergic activity.
 *   Score 2: Moderate anticholinergic activity.
 *   Score 3: Severe / definite anticholinergic activity (serum anticholinergic activity or proven delirium / cognitive decline).
 * Total score >= 3 is the published high-risk threshold for cognitive impairment, falls, and delirium.
 * Educational reference only — not an order, not a deprescribing mandate. The Prescribing Information governs.
 */

import { DRUG_BY_ID } from "./catalog";

export interface AcbDrugEntry {
  id: string;
  score: 1 | 2 | 3;
  mechanism: string;
  alternative: string;
}

/**
 * Curated ACB scoring map grounded in Boustani 2008 and clinical pharmacology.
 */
export const ACB_CATALOG: Record<string, AcbDrugEntry> = {
  // —— Score 3: Severe / definite anticholinergics ——————————————————
  // Tricyclics
  amitriptyline: {
    id: "amitriptyline",
    score: 3,
    mechanism: "High muscarinic M1 blockade. Potent sedation and peripheral anticholinergic load.",
    alternative: "Consider SSRIs/SNRIs with negligible muscarinic affinity (sertraline, escitalopram) or non-anticholinergic neuropathic agents.",
  },
  nortriptyline: {
    id: "nortriptyline",
    score: 3,
    mechanism: "Secondary amine TCA with marked M1 antagonism, though slightly quieter than amitriptyline.",
    alternative: "Consider SSRIs/SNRIs with lower muscarinic affinity if treating depressive symptoms.",
  },
  clomipramine: {
    id: "clomipramine",
    score: 3,
    mechanism: "Non-selective TCA with strong muscarinic and histaminergic blockade.",
    alternative: "Consider SSRIs (fluvoxamine, sertraline) for OCD indications.",
  },
  desipramine: {
    id: "desipramine",
    score: 3,
    mechanism: "Secondary amine TCA retaining marked muscarinic antagonism.",
    alternative: "Consider bupropion or SSRIs/SNRIs.",
  },
  doxepin: {
    id: "doxepin",
    score: 3,
    mechanism: "Potent M1 and H1 antagonist. Substantial anticholinergic and sedating load.",
    alternative: "Consider non-anticholinergic sleep hygiene or low-dose melatonin.",
  },
  imipramine: {
    id: "imipramine",
    score: 3,
    mechanism: "Tertiary amine TCA with high anticholinergic burden.",
    alternative: "Consider SSRIs or SNRIs.",
  },
  "imipramine-pamoate": {
    id: "imipramine-pamoate",
    score: 3,
    mechanism: "Tertiary amine TCA with high anticholinergic burden.",
    alternative: "Consider SSRIs or SNRIs.",
  },
  protriptyline: {
    id: "protriptyline",
    score: 3,
    mechanism: "TCA with definite anticholinergic activity.",
    alternative: "Consider newer activating antidepressants.",
  },
  trimipramine: {
    id: "trimipramine",
    score: 3,
    mechanism: "Sedating TCA with strong muscarinic blockade.",
    alternative: "Consider non-anticholinergic alternatives.",
  },

  // First-generation antihistamines
  diphenhydramine: {
    id: "diphenhydramine",
    score: 3,
    mechanism: "Prototypical first-generation H1 blocker with high central and peripheral M1 blockade.",
    alternative: "Second-generation antihistamines (cetirizine, fexofenadine, loratadine) have minimal central M1 affinity.",
  },
  hydroxyzine: {
    id: "hydroxyzine",
    score: 3,
    mechanism: "Sedating piperazine antihistamine with marked central anticholinergic activity.",
    alternative: "Consider non-anticholinergic anxiolytics (buspirone, SSRIs) or second-generation antihistamines.",
  },
  chlorpheniramine: {
    id: "chlorpheniramine",
    score: 3,
    mechanism: "First-generation alkylamine antihistamine with prominent anticholinergic effects.",
    alternative: "Consider second-generation non-sedating antihistamines or intranasal saline / steroids.",
  },
  promethazine: {
    id: "promethazine",
    score: 3,
    mechanism: "Phenothiazine derivative with strong anticholinergic, antidopaminergic, and sedating effects.",
    alternative: "Consider ondansetron (5-HT3 antagonist) for nausea without anticholinergic burden.",
  },
  doxylamine: {
    id: "doxylamine",
    score: 3,
    mechanism: "Ethanolamine antihistamine commonly used for insomnia; pronounced M1 blockade.",
    alternative: "Consider non-pharmacologic sleep therapy or melatonin.",
  },
  clemastine: {
    id: "clemastine",
    score: 3,
    mechanism: "First-generation antihistamine with high anticholinergic affinity.",
    alternative: "Consider fexofenadine, cetirizine, or loratadine.",
  },
  meclizine: {
    id: "meclizine",
    score: 3,
    mechanism: "Antiemetic / antivertigo piperazine with marked central anticholinergic activity.",
    alternative: "Consider vestibular rehabilitation or non-anticholinergic antiemetics.",
  },
  dimenhydrinate: {
    id: "dimenhydrinate",
    score: 3,
    mechanism: "Diphenhydramine salt conjugate with severe anticholinergic burden.",
    alternative: "Consider acupressure or ondansetron for motion/nausea.",
  },
  brompheniramine: {
    id: "brompheniramine",
    score: 3,
    mechanism: "First-generation antihistamine with strong anticholinergic properties.",
    alternative: "Consider second-generation non-sedating antihistamines.",
  },
  triprolidine: {
    id: "triprolidine",
    score: 3,
    mechanism: "First-generation antihistamine with marked anticholinergic activity.",
    alternative: "Consider second-generation antihistamines.",
  },
  cyproheptadine: {
    id: "cyproheptadine",
    score: 3,
    mechanism: "First-generation antihistamine and 5-HT2 antagonist with heavy anticholinergic action.",
    alternative: "Consider targeted non-anticholinergic alternatives depending on indication.",
  },

  // Bladder antimuscarinics (OAB)
  oxybutynin: {
    id: "oxybutynin",
    score: 3,
    mechanism: "Non-selective muscarinic M1/M2/M3 antagonist with high blood-brain barrier penetration.",
    alternative: "Consider mirabegron or vibegron (β3-adrenoceptor agonists) which lack muscarinic receptor blockade.",
  },
  "oxybutynin-patch": {
    id: "oxybutynin-patch",
    score: 3,
    mechanism: "Transdermal oxybutynin reduces first-pass gut N-DEO formation but retains systemic muscarinic blockade.",
    alternative: "Consider β3-adrenoceptor agonists (mirabegron, vibegron).",
  },
  "oxybutynin-gel": {
    id: "oxybutynin-gel",
    score: 3,
    mechanism: "Topical oxybutynin with systemic muscarinic receptor blockade.",
    alternative: "Consider β3-adrenoceptor agonists (mirabegron, vibegron).",
  },
  tolterodine: {
    id: "tolterodine",
    score: 3,
    mechanism: "Muscarinic receptor antagonist for overactive bladder.",
    alternative: "Consider mirabegron or vibegron.",
  },
  trospium: {
    id: "trospium",
    score: 3,
    mechanism: "Quaternary amine antimuscarinic; peripheral burden remains marked despite lower brain entry.",
    alternative: "Consider mirabegron or vibegron.",
  },
  solifenacin: {
    id: "solifenacin",
    score: 3,
    mechanism: "Competitive muscarinic receptor antagonist with definite anticholinergic burden.",
    alternative: "Consider mirabegron or vibegron.",
  },
  darifenacin: {
    id: "darifenacin",
    score: 3,
    mechanism: "M3-selective antimuscarinic; still carries definite systemic anticholinergic score.",
    alternative: "Consider mirabegron or vibegron.",
  },
  fesoterodine: {
    id: "fesoterodine",
    score: 3,
    mechanism: "Prodrug to 5-HMT (same active moiety as tolterodine) with high anticholinergic score.",
    alternative: "Consider mirabegron or vibegron.",
  },
  "mirabegron-solifenacin": {
    id: "mirabegron-solifenacin",
    score: 3,
    mechanism: "Co-formulated solifenacin component provides definite anticholinergic activity.",
    alternative: "Consider mirabegron monotherapy.",
  },

  // GI antispasmodics
  dicyclomine: {
    id: "dicyclomine",
    score: 3,
    mechanism: "Synthetic antispasmodic with potent antimuscarinic action.",
    alternative: "Consider dietary modification, soluble fiber, or peppermint oil for IBS symptoms.",
  },
  hyoscyamine: {
    id: "hyoscyamine",
    score: 3,
    mechanism: "Belladonna alkaloid (levo-isomer of atropine) with potent peripheral and central M blockade.",
    alternative: "Consider non-anticholinergic GI antispasmodics or dietary adjustments.",
  },
  propantheline: {
    id: "propantheline",
    score: 3,
    mechanism: "Quaternary ammonium antimuscarinic agent.",
    alternative: "Consider non-anticholinergic alternatives.",
  },
  scopolamine: {
    id: "scopolamine",
    score: 3,
    mechanism: "Belladonna alkaloid with pronounced central and peripheral anticholinergic effects.",
    alternative: "Consider ondansetron or non-pharmacologic motion bands.",
  },
  "clidinium-chlordiazepoxide": {
    id: "clidinium-chlordiazepoxide",
    score: 3,
    mechanism: "Co-formulated clidinium is a potent quaternary anticholinergic.",
    alternative: "Consider non-anticholinergic GI and anxiety strategies.",
  },

  // EPS / Parkinson's antimuscarinics
  benztropine: {
    id: "benztropine",
    score: 3,
    mechanism: "Centrally acting antimuscarinic used for antipsychotic-induced EPS.",
    alternative: "Consider reducing antipsychotic dose or switching to a lower-EPS agent (quetiapine, aripiprazole).",
  },
  trihexyphenidyl: {
    id: "trihexyphenidyl",
    score: 3,
    mechanism: "Synthetic antimuscarinic with high central anticholinergic activity.",
    alternative: "Consider amantadine or dose adjustment of the offending dopamine blocker.",
  },

  // Antipsychotics with heavy M1 occupancy
  clozapine: {
    id: "clozapine",
    score: 3,
    mechanism: "Broad-spectrum atypical antipsychotic with high M1 affinity, prominent sialorrhea and severe constipation.",
    alternative: "Clozapine is typically refractory-use only; monitor bowel motility aggressively.",
  },
  chlorpromazine: {
    id: "chlorpromazine",
    score: 3,
    mechanism: "Low-potency phenothiazine with pronounced M1 and H1 receptor blockade.",
    alternative: "Consider newer atypical antipsychotics with lower anticholinergic affinity.",
  },
  thioridazine: {
    id: "thioridazine",
    score: 3,
    mechanism: "Low-potency phenothiazine with potent anticholinergic and cardiotoxic properties.",
    alternative: "Consider safer atypical antipsychotics.",
  },
  olanzapine: {
    id: "olanzapine",
    score: 3,
    mechanism: "High muscarinic M1 occupancy leading to central anticholinergic burden and sedation.",
    alternative: "Consider aripiprazole, risperidone, or lurasidone if anticholinergic burden is a concern.",
  },
  cobenfy: {
    id: "cobenfy",
    score: 3,
    mechanism: "Co-formulated trospium chloride component provides peripheral muscarinic receptor antagonism.",
    alternative: "Monitor peripheral anticholinergic symptoms (urinary retention, dry mouth).",
  },

  // —— Score 2: Moderate anticholinergics ———————————————————————————
  carbamazepine: {
    id: "carbamazepine",
    score: 2,
    mechanism: "Iminostilbene antiepileptic with moderate structural resemblance to TCAs and muscarinic affinity.",
    alternative: "Consider levetiracetam or lamotrigine depending on seizure or mood indication.",
  },
  oxcarbazepine: {
    id: "oxcarbazepine",
    score: 2,
    mechanism: "Keto-analog of carbamazepine with moderate anticholinergic potential.",
    alternative: "Consider levetiracetam or lamotrigine.",
  },
  cyclobenzaprine: {
    id: "cyclobenzaprine",
    score: 2,
    mechanism: "Tricyclic-related centrally acting muscle relaxant with moderate anticholinergic activity.",
    alternative: "Consider methocarbamol or non-pharmacologic physical therapy.",
  },
  disopyramide: {
    id: "disopyramide",
    score: 2,
    mechanism: "Class Ia antiarrhythmic with marked anticholinergic negative inotropic effects.",
    alternative: "Consider non-anticholinergic antiarrhythmic agents under cardiology guidance.",
  },
  amantadine: {
    id: "amantadine",
    score: 2,
    mechanism: "Dopamine-promoting agent with moderate central anticholinergic properties.",
    alternative: "Review Parkinsonian regimen with neurologist.",
  },
  amoxapine: {
    id: "amoxapine",
    score: 2,
    mechanism: "Tetracyclic antidepressant with moderate muscarinic antagonism.",
    alternative: "Consider modern non-anticholinergic antidepressants.",
  },
  maprotiline: {
    id: "maprotiline",
    score: 2,
    mechanism: "Tetracyclic antidepressant with moderate anticholinergic activity.",
    alternative: "Consider modern non-anticholinergic antidepressants.",
  },

  // —— Score 1: Mild / potential anticholinergics ——————————————————
  paroxetine: {
    id: "paroxetine",
    score: 1,
    mechanism: "The most anticholinergic SSRI; significant muscarinic M1 affinity relative to other SSRIs.",
    alternative: "Consider sertraline, escitalopram, or citalopram, which have negligible muscarinic affinity.",
  },
  quetiapine: {
    id: "quetiapine",
    score: 1,
    mechanism: "Active metabolite norquetiapine possesses moderate M1 antagonism; parent drug has mild affinity.",
    alternative: "Consider aripiprazole or low-dose melatonin for sleep.",
  },
  haloperidol: {
    id: "haloperidol",
    score: 1,
    mechanism: "High-potency typical antipsychotic with low but documented antimuscarinic binding.",
    alternative: "Assess antipsychotic necessity and consider lower-burden alternatives.",
  },
  risperidone: {
    id: "risperidone",
    score: 1,
    mechanism: "Atypical antipsychotic with weak muscarinic receptor affinity.",
    alternative: "Monitor total anticholinergic stack.",
  },
  cimetidine: {
    id: "cimetidine",
    score: 1,
    mechanism: "H2 receptor antagonist with mild serum anticholinergic activity.",
    alternative: "Consider famotidine or PPIs if acid suppression is indicated.",
  },
};

export type AcbRiskLevel = "none" | "low" | "high";

export interface AcbContributor {
  drugId: string;
  name: string;
  score: 1 | 2 | 3;
  mechanism: string;
  alternative: string;
}

export interface AcbReport {
  totalScore: number;
  riskLevel: AcbRiskLevel;
  contributors: AcbContributor[];
  summary: string;
  pearl: string;
}

/** Check whether any drug on the desk carries an ACB score. */
export function acbWanted(ids: string[]): boolean {
  return ids.some((id) => Boolean(ACB_CATALOG[id]));
}

/** Compute the Anticholinergic Cognitive Burden for tray drugs. */
export function acbOnDesk(ids: string[]): AcbReport | null {
  const hits: AcbContributor[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = ACB_CATALOG[id];
    if (entry) {
      const drug = DRUG_BY_ID[id];
      hits.push({
        drugId: id,
        name: drug?.name ?? id,
        score: entry.score,
        mechanism: entry.mechanism,
        alternative: entry.alternative,
      });
    }
  }

  if (hits.length === 0) return null;

  // Sort descending by score, then alphabetically by name
  hits.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const totalScore = hits.reduce((sum, h) => sum + h.score, 0);
  const riskLevel: AcbRiskLevel = totalScore >= 3 ? "high" : totalScore >= 1 ? "low" : "none";

  let summary = `Anticholinergic score: ${totalScore}.`;
  let pearl = "";

  if (totalScore >= 3) {
    summary = `Anticholinergic score: ${totalScore} (High burden: ≥3 threshold reached).`;
    pearl =
      "Scores ≥3 in published literature (Boustani 2008, Campbell 2013) correlate with significantly increased risk of acute delirium, cognitive decline, falls, constipation, and urinary retention. In older adults, review necessity and consider non-anticholinergic alternatives.";
  } else if (totalScore >= 1) {
    summary = `Anticholinergic score: ${totalScore} (Low burden).`;
    pearl =
      "Mild anticholinergic load. May cause dry mouth or constipation; monitor in frail or geriatric patients when combined with other central depressants.";
  } else {
    pearl = "No scored anticholinergic burden identified for the current desk drugs.";
  }

  return {
    totalScore,
    riskLevel,
    contributors: hits,
    summary,
    pearl,
  };
}

