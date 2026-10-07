/**
 * Pharmacodynamic Target & Cascade Intersect Engine
 *
 * Evaluates cumulative receptor saturation, multi-target pharmacodynamic burden,
 * and downstream physiological cascades across any drug regimen on FirstPass.
 *
 * REGULATORY POSTURE (FD&C Act § 520(o)(1)(E)):
 * Non-device Clinical Decision Support software reference. This directory
 * provides educational, non-prescriptive mechanistic explanations and physiological
 * load calculations to enable licensed healthcare professionals and students to
 * independently analyze pharmacodynamic interactions. It does not provide patient-specific
 * dosing directives, prescriptive mandates, or diagnostic conclusions.
 */

import { DRUG_BY_ID } from "./catalog";

export type IntersectCategory =
  | "anticholinergic"
  | "sedation"
  | "serotonin"
  | "qtc"
  | "pressor";

export type BurdenLevel = "minimal" | "mild" | "moderate" | "high" | "severe";

export interface DrugContribution {
  drugId: string;
  drugName: string;
  target: string;
  action: string;
  points: number;
  contribution: "primary" | "secondary" | "minor";
  mechanismDetail: string;
}

export interface IntersectLoad {
  category: IntersectCategory;
  title: string;
  shortName: string;
  score: number;
  maxExpectedScore: number;
  level: BurdenLevel;
  summary: string;
  molecularMechanism: string;
  contributingDrugs: DrugContribution[];
  clinicalPearls: string[];
}

export interface IntersectResult {
  drugs: string[];
  loads: IntersectLoad[];
  overallRiskSummary: string;
  highestCategory: IntersectCategory | null;
  highestLevel: BurdenLevel;
}

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  drugIds: string[];
  expectedHighCategory: IntersectCategory;
}

export const INTERSECT_REGULATORY_NOTICE =
  "Educational Decision Support reference under FD&C Act 520(o)(1)(E). Cumulative mechanism scores reflect published receptor pharmacodynamics and clinical consensus scales (e.g. ACB, Sternbach/Hunter criteria, CredibleMeds). This tool does not diagnose, prescribe, or provide clinical directives." as const;

// 1. Anticholinergic Definitions (Muscarinic M1, M2, M3 Antagonism)
const ANTICHOLINERGIC_DRUGS: Record<string, { points: number; target: string; detail: string }> = {
  diphenhydramine: { points: 3, target: "M1, M2, M3", detail: "Potent central and peripheral muscarinic receptor antagonist." },
  amitriptyline: { points: 3, target: "M1, M2, M3", detail: "High-affinity tertiary amine muscarinic blockade; significant cognitive and cardiac antimuscarinic burden." },
  hydroxyzine: { points: 3, target: "M1, M3", detail: "First-generation piperazine H1 antagonist with pronounced antimuscarinic side-effect profile." },
  oxybutynin: { points: 3, target: "M1, M2, M3", detail: "Potent nonselective muscarinic receptor antagonist used for detrusor instability; readily crosses blood-brain barrier." },
  atropine: { points: 3, target: "M1, M2, M3, M4, M5", detail: "Prototypic non-selective competitive muscarinic acetylcholine receptor antagonist." },
  clozapine: { points: 3, target: "M1, M2, M3, M5", detail: "Substantial antimuscarinic occupancy; causes severe constipation, paralytic ileus, and paradoxical sialorrhea via M4 agonism / swallowing reflex blunting." },
  paroxetine: { points: 3, target: "M1", detail: "Highest muscarinic receptor affinity among SSRIs; causes dry mouth, constipation, and sedation." },
  olanzapine: { points: 2, target: "M1, M2, M3", detail: "Moderate muscarinic blockade contributing to sedation, dry mouth, and metabolic liability." },
  quetiapine: { points: 2, target: "M1", detail: "Active metabolite norquetiapine possesses moderate M1 antagonism." },
  nortriptyline: { points: 2, target: "M1, M2, M3", detail: "Secondary amine tricyclic with moderate antimuscarinic burden (less than amitriptyline)." },
  cyclobenzaprine: { points: 2, target: "M1", detail: "Centrally acting muscle relaxant structurally homologous to tricyclic antidepressants with prominent anticholinergic effects." },
  haloperidol: { points: 1, target: "M1", detail: "Weak muscarinic affinity; high D2 selectivity minimizes peripheral anticholinergic signs." },
  risperidone: { points: 1, target: "M1", detail: "Very low muscarinic affinity compared to its D2 and 5-HT2A occupancy." },
  cimetidine: { points: 1, target: "M1", detail: "Weak antimuscarinic contribution alongside hepatic CYP inhibition." },
  cetirizine: { points: 1, target: "M1", detail: "Second-generation H1 antagonist with minimal but non-zero peripheral muscarinic binding." },
};

// 2. CNS Sedation Definitions (GABA-A PAM, H1 Antagonism, Alpha-2 Agonism, Mu-Opioid)
const SEDATION_DRUGS: Record<string, { points: number; target: string; detail: string }> = {
  diazepam: { points: 3, target: "GABA-A (alpha-1,2,3,5)", detail: "Classical benzodiazepine positive allosteric modulator enhancing inhibitory chloride conductance." },
  alprazolam: { points: 3, target: "GABA-A (alpha-1,2,3,5)", detail: "High-potency triazolobenzodiazepine PAM with rapid onset and pronounced central sedative tone." },
  lorazepam: { points: 3, target: "GABA-A (alpha-1,2,3,5)", detail: "Intermediate-acting benzodiazepine PAM without active phase I hepatic metabolites." },
  clonazepam: { points: 3, target: "GABA-A (alpha-1,2,3,5)", detail: "High-affinity long-acting nitrobenzodiazepine PAM." },
  zolpidem: { points: 3, target: "GABA-A (alpha-1 selective)", detail: "Selective positive allosteric modulator at alpha-1 subunit-containing GABA-A receptors mediating hypnotic sedation." },
  morphine: { points: 3, target: "Mu-Opioid Receptor (MOR)", detail: "Prototypic opioid agonist inhibiting locus coeruleus noradrenergic firing and central ventilatory drive." },
  fentanyl: { points: 3, target: "Mu-Opioid Receptor (MOR)", detail: "High-potency synthetic opioid agonist with rapid blood-brain barrier penetration." },
  methadone: { points: 3, target: "Mu-Opioid / NMDA", detail: "Long-acting synthetic opioid with slow elimination clearance and cumulative somnolence." },
  oxycodone: { points: 3, target: "Mu-Opioid Receptor (MOR)", detail: "Semi-synthetic opioid agonist exerting central sedation and dose-dependent respiratory suppression." },
  phenobarbital: { points: 3, target: "GABA-A (barbiturate site)", detail: "Direct GABA-A channel opener and PAM; prolongs channel burst duration with narrow therapeutic safety margin." },
  dexmedetomidine: { points: 3, target: "Central Alpha-2A Adrenergic", detail: "Potent centrally acting alpha-2 agonist inhibiting locus coeruleus noradrenaline outflow, inducing cooperative sedation." },
  diphenhydramine: { points: 2, target: "Central H1 Receptor", detail: "Penetrates blood-brain barrier and blocks histamine-mediated arousal systems in the tuberomammillary nucleus." },
  hydroxyzine: { points: 2, target: "Central H1 Receptor", detail: "Blocks central histaminergic arousal pathways." },
  mirtazapine: { points: 2, target: "H1 / 5-HT2A", detail: "Very high H1 affinity explains robust low-dose sedation." },
  quetiapine: { points: 2, target: "H1", detail: "High H1 occupancy at low doses dominates its hypnotic clinical profile." },
  clonidine: { points: 2, target: "Central Alpha-2A", detail: "Centrally acting alpha-2 agonist causing sedation and sympatholytic hypotension." },
  tizanidine: { points: 2, target: "Central Alpha-2A", detail: "Centrally acting alpha-2 agonist muscle relaxant with significant hypnotic potential." },
  gabapentin: { points: 2, target: "Alpha-2-delta Calcium Subunit", detail: "Binds presynaptic voltage-gated calcium channels, attenuating excitatory neurotransmitter release." },
  pregabalin: { points: 2, target: "Alpha-2-delta Calcium Subunit", detail: "High-affinity presynaptic alpha-2-delta ligand dampening excitatory synaptic outflow." },
  tramadol: { points: 2, target: "Mu-Opioid / SERT / NET", detail: "Weak mu-opioid agonism combined with monoaminergic reuptake inhibition." },
};

// 3. Serotonin Definitions (SERT, 5-HT1A, MAO-A, Serotonergic Opioids)
const SEROTONIN_DRUGS: Record<string, { points: number; target: string; detail: string; isMaoi?: boolean; isSert?: boolean }> = {
  phenelzine: { points: 4, target: "MAO-A & MAO-B (Irreversible)", detail: "Irreversible non-selective monoamine oxidase inhibitor; completely arrests serotonin catabolism.", isMaoi: true },
  tranylcypromine: { points: 4, target: "MAO-A & MAO-B (Irreversible)", detail: "Irreversible non-selective MAOI; catastrophic serotonin surge when combined with reuptake inhibitors.", isMaoi: true },
  linezolid: { points: 3, target: "MAO-A (Reversible)", detail: "Oxazolidinone antibacterial with potent reversible MAO-A inhibition; triggers rapid serotonin syndrome with SSRIs.", isMaoi: true },
  "methylene-blue": { points: 4, target: "MAO-A (Potent Reversible)", detail: "Exceptionally potent MAO-A inhibitor (Ki ~65 nM); causes fatal serotonin toxicity with serotonergic agents.", isMaoi: true },
  fluoxetine: { points: 3, target: "SERT (Selective)", detail: "High-affinity serotonin transporter inhibitor with active metabolite norfluoxetine (half-life up to 16 days).", isSert: true },
  sertraline: { points: 3, target: "SERT (Selective)", detail: "Potent serotonin transporter inhibitor with weak DAT activity.", isSert: true },
  paroxetine: { points: 3, target: "SERT (Selective)", detail: "Very potent selective serotonin reuptake inhibitor.", isSert: true },
  escitalopram: { points: 3, target: "SERT (Allosteric)", detail: "Pure (S)-enantiomer with highest selectivity for the primary and allosteric SERT binding sites.", isSert: true },
  citalopram: { points: 3, target: "SERT (Selective)", detail: "Racemic selective serotonin reuptake inhibitor.", isSert: true },
  venlafaxine: { points: 3, target: "SERT > NET", detail: "Dual reuptake inhibitor; potent SERT inhibition at standard doses, NET at higher exposures.", isSert: true },
  duloxetine: { points: 3, target: "SERT & NET", detail: "Balanced dual serotonin and norepinephrine reuptake inhibitor.", isSert: true },
  amitriptyline: { points: 2, target: "SERT & NET", detail: "Tricyclic reuptake inhibitor; increases intrasynaptic serotonin concentrations.", isSert: true },
  tramadol: { points: 2, target: "SERT / Weak MOR", detail: "Inhibits serotonin reuptake while parent drug stimulates release; frequent precipitant of serotonin syndrome." },
  meperidine: { points: 3, target: "SERT / MOR", detail: "Synthetic phenylpiperidine opioid that inhibits serotonin reuptake; contraindicated with MAOIs." },
  methadone: { points: 2, target: "SERT / MOR / NMDA", detail: "Possesses moderate SERT inhibitory capacity in addition to opioid agonism." },
  dextromethorphan: { points: 2, target: "SERT / Sigma-1 / NMDA", detail: "Antitussive morphinan with significant SERT reuptake inhibition; common over-the-counter trigger." },
  buspirone: { points: 1, target: "5-HT1A Partial Agonist", detail: "Direct agonist activity at postsynaptic 5-HT1A receptors adds to cumulative serotonergic stimulation." },
};

// 4. Cardiac QTc Definitions (hERG / IKr Potassium Channel Blockade)
const QTC_DRUGS: Record<string, { points: number; target: string; detail: string }> = {
  amiodarone: { points: 3, target: "hERG (IKr) / Multi-channel", detail: "Class III antiarrhythmic; substantially delays Phase 3 ventricular repolarization (prolongs QTc with low TdP incidence due to multi-channel block)." },
  sotalol: { points: 3, target: "hERG (IKr) / Beta-blocker", detail: "Reverse use-dependent IKr blocker; marked prolongation of action potential duration at slow heart rates with high TdP risk." },
  dofetilide: { points: 3, target: "hERG (IKr) Selective", detail: "Pure selective IKr blocker with steep exposure-dependent QTc prolongation." },
  quinidine: { points: 3, target: "Nav1.5 / hERG (IKr)", detail: "Class IA agent; slows conduction and markedly delays repolarization." },
  haloperidol: { points: 3, target: "hERG (IKr)", detail: "High-affinity hERG channel blocker; IV administration carries severe torsadogenic risk." },
  ziprasidone: { points: 3, target: "hERG (IKr)", detail: "Highest intrinsic QTc-prolonging liability among modern atypical antipsychotics." },
  methadone: { points: 3, target: "hERG (IKr)", detail: "Dose-dependent hERG channel inhibition; high maintenance doses frequently produce QTc > 500 ms." },
  citalopram: { points: 2, target: "hERG (IKr)", detail: "Dose-dependent QTc prolongation leading to FDA labeling restrictions (maximum 40 mg/day; 20 mg/day in elderly)." },
  escitalopram: { points: 2, target: "hERG (IKr)", detail: "Dose-dependent repolarization delay (milder than racemic citalopram)." },
  ondansetron: { points: 2, target: "hERG (IKr) / 5-HT3", detail: "5-HT3 antagonist with transient but clinically significant IKr potassium channel inhibition." },
  ciprofloxacin: { points: 2, target: "hERG (IKr)", detail: "Fluoroquinolone antibiotic; additive repolarization delay when combined with cardiac or psychotropic drugs." },
  moxifloxacin: { points: 2, target: "hERG (IKr)", detail: "Fluoroquinolone with greatest intrinsic hERG channel affinity among respiratory quinolones." },
  azithromycin: { points: 2, target: "hERG (IKr)", detail: "Macrolide; delays ventricular repolarization and carries FDA warning for fatal cardiac arrhythmias." },
  clarithromycin: { points: 2, target: "hERG (IKr) & CYP3A4", detail: "Dual hazard: directly blocks hERG and potently inhibits CYP3A4 clearance of other QTc agents." },
  erythromycin: { points: 2, target: "hERG (IKr) & CYP3A4", detail: "Direct repolarization delay coupled with CYP3A4 inhibition." },
};

// 5. Adrenergic / Pressor Definitions (Alpha-1 Vasoconstriction, Beta-1 Inotropy/Chronotropy)
const PRESSOR_DRUGS: Record<string, { points: number; target: string; detail: string }> = {
  epinephrine: { points: 3, target: "Alpha-1, Beta-1, Beta-2", detail: "Direct sympathomimetic catecholamine; stimulates cardiac contractility, rate, and systemic vasoconstriction." },
  norepinephrine: { points: 3, target: "Alpha-1 > Beta-1", detail: "Potent direct alpha-1 vasoconstrictor with moderate beta-1 inotropic stimulation." },
  phenylephrine: { points: 3, target: "Alpha-1 Selective", detail: "Pure alpha-1 adrenergic agonist producing profound peripheral vasoconstriction and reflex bradycardia." },
  amphetamine: { points: 3, target: "TAAR1 / VMAT2 / NET", detail: "Reverses vesicular monoamine transport, flooding synapses with norepinephrine and dopamine." },
  cocaine: { points: 3, target: "NET / DAT / Nav1.5", detail: "Triple reuptake blocker with local anesthetic sodium channel inhibition; acute coronary vasospasm risk." },
  pseudoephedrine: { points: 2, target: "Alpha-1 / Beta-1", detail: "Mixed direct and indirect sympathomimetic causing arteriolar constriction and tachycardia." },
  bupropion: { points: 2, target: "NET / DAT", detail: "Norepinephrine and dopamine reuptake inhibitor; produces mild to moderate adrenergic tone elevations." },
  venlafaxine: { points: 2, target: "NET (high exposure)", detail: "Norepinephrine reuptake inhibition at doses >=150 mg produces dose-dependent blood pressure elevations." },
  methylphenidate: { points: 2, target: "NET / DAT", detail: "Inhibits presynaptic dopamine and norepinephrine reuptake; raises resting pulse and blood pressure." },
};

export const PRESET_SCENARIOS: readonly PresetScenario[] = [
  {
    id: "triple-anticholinergic-geriatric",
    name: "Geriatric Polypharmacy Anticholinergic Stack",
    description: "Classic high-risk combination of oxybutynin (bladder), amitriptyline (neuropathic pain), and diphenhydramine (sleep) producing severe cumulative muscarinic receptor saturation.",
    drugIds: ["oxybutynin", "amitriptyline", "diphenhydramine"],
    expectedHighCategory: "anticholinergic",
  },
  {
    id: "fatal-sedation-respiratory-depression",
    name: "Sedation & Respiratory Depression Stack",
    description: "Co-prescribing of benzodiazepine (alprazolam), potent opioid (fentanyl), and gabapentinoid (pregabalin) creating catastrophic cumulative depression of ventilatory drive.",
    drugIds: ["alprazolam", "fentanyl", "pregabalin"],
    expectedHighCategory: "sedation",
  },
  {
    id: "serotonin-hunter-collision",
    name: "Lethal Serotonin Toxicity Collision",
    description: "Combination of irreversible monoamine oxidase inhibitor (phenelzine) with selective serotonin reuptake inhibitor (fluoxetine) and tramadol, precipitating hyperthermic serotonin crisis.",
    drugIds: ["phenelzine", "fluoxetine", "tramadol"],
    expectedHighCategory: "serotonin",
  },
  {
    id: "cardio-herg-qtc-stack",
    name: "Additive QTc hERG Repolarization Stack",
    description: "Combination of multi-channel Class III antiarrhythmic (amiodarone), antipsychotic (haloperidol), and opioid agonist (methadone) producing extreme ventricular repolarization delay.",
    drugIds: ["amiodarone", "haloperidol", "methadone"],
    expectedHighCategory: "qtc",
  },
  {
    id: "sympathomimetic-pressor-push",
    name: "Sympathomimetic Hypertensive Stack",
    description: "Co-ingestion of stimulant (amphetamine), nasal decongestant (pseudoephedrine), and dual reuptake inhibitor (venlafaxine) driving malignant vasoconstrictive afterload.",
    drugIds: ["amphetamine", "pseudoephedrine", "venlafaxine"],
    expectedHighCategory: "pressor",
  },
];

function scoreToLevel(score: number, maxScore: number): BurdenLevel {
  const ratio = score / maxScore;
  if (score === 0) return "minimal";
  if (ratio < 0.25 || score <= 2) return "mild";
  if (ratio < 0.55 || score <= 4) return "moderate";
  if (ratio < 0.8 || score <= 7) return "high";
  return "severe";
}

export function evaluateMechanismIntersect(drugIds: string[]): IntersectResult {
  const uniqueIds = Array.from(new Set(drugIds.map((id) => id.trim().toLowerCase())));

  // 1. Anticholinergic Load
  const achContributions: DrugContribution[] = [];
  let achScore = 0;
  for (const id of uniqueIds) {
    const entry = ANTICHOLINERGIC_DRUGS[id];
    if (entry) {
      achScore += entry.points;
      const drug = DRUG_BY_ID[id];
      achContributions.push({
        drugId: id,
        drugName: drug ? drug.name : id,
        target: entry.target,
        action: "Muscarinic Receptor Antagonist",
        points: entry.points,
        contribution: entry.points >= 3 ? "primary" : entry.points === 2 ? "secondary" : "minor",
        mechanismDetail: entry.detail,
      });
    }
  }
  const achLoad: IntersectLoad = {
    category: "anticholinergic",
    title: "Cumulative Anticholinergic Burden",
    shortName: "Anticholinergic",
    score: achScore,
    maxExpectedScore: 9,
    level: scoreToLevel(achScore, 9),
    summary:
      achScore === 0
        ? "No mapped muscarinic receptor antagonists on this regimen."
        : `Cumulative muscarinic receptor blockade score of ${achScore}. High affinity for peripheral and central M1–M5 subtypes.`,
    molecularMechanism:
      "Competitive blockade of postjunctional muscarinic acetylcholine receptors: hippocampal M1 antagonism disrupts cholinergic memory circuits provoking delirium; detrusor smooth muscle M3 blockade inhibits bladder emptying causing acute retention; ciliary and pupillary sphincter M3 blockade causes cycloplegia and unmasks closed-angle glaucoma; eccrine sweat gland M3 blockade prevents thermoregulatory diaphoresis provoking hyperthermia.",
    contributingDrugs: achContributions.sort((a, b) => b.points - a.points),
    clinicalPearls: [
      "Anticholinergic Risk Scale (ARS) score >= 3 correlates with a 3-fold higher incidence of acute confusional states in older adults.",
      "Anhidrosis combined with impaired central thermoregulation can precipitate life-threatening anticholinergic heat stroke.",
      "Clozapine uniquely combines profound peripheral antimuscarinic constipation with paradoxical hypersalivation due to muscarinic M4 agonism and impaired swallowing reflexes.",
    ],
  };

  // 2. CNS Sedation & Respiratory Depression Load
  const sedContributions: DrugContribution[] = [];
  let sedScore = 0;
  let hasGaba = false;
  let hasOpioid = false;
  for (const id of uniqueIds) {
    const entry = SEDATION_DRUGS[id];
    if (entry) {
      sedScore += entry.points;
      if (entry.target.includes("GABA")) hasGaba = true;
      if (entry.target.includes("Opioid")) hasOpioid = true;
      const drug = DRUG_BY_ID[id];
      sedContributions.push({
        drugId: id,
        drugName: drug ? drug.name : id,
        target: entry.target,
        action: "Central Nervous System Depressant",
        points: entry.points,
        contribution: entry.points >= 3 ? "primary" : entry.points === 2 ? "secondary" : "minor",
        mechanismDetail: entry.detail,
      });
    }
  }
  const sedLoad: IntersectLoad = {
    category: "sedation",
    title: "Cumulative CNS Sedation & Ventilatory Depression",
    shortName: "CNS Sedation",
    score: sedScore,
    maxExpectedScore: 10,
    level: scoreToLevel(sedScore, 10),
    summary:
      sedScore === 0
        ? "No mapped central sedative agents on this regimen."
        : `Cumulative CNS sedation burden score of ${sedScore}. Multiple converging pathways dampening cortical arousal and pontomedullary respiratory centers.`,
    molecularMechanism:
      "Convergence of distinct molecular mechanisms on central nervous system depression: GABA-A positive allosteric modulation increases chloride conductance hyperpolarizing neuronal membranes; mu-opioid receptor (MOR) Gi-protein activation inhibits adenylyl cyclase, activates GIRK potassium channels, and blunts hypercapnic respiratory drive in the pre-Bötzinger complex; H1 receptor blockade disables ascending tuberomammillary arousal pathways.",
    contributingDrugs: sedContributions.sort((a, b) => b.points - a.points),
    clinicalPearls: [
      hasGaba && hasOpioid
        ? "CRITICAL COLLISION: Concomitant benzodiazepine/Z-drug and opioid administration carries an FDA Boxed Warning for profound sedation, respiratory arrest, and fatal overdose."
        : "Combining multiple sedatives exponentially multiplies fall risk and cognitive blunting rather than merely adding effects linearly.",
      "Central alpha-2 agonists (clonidine, tizanidine) inhibit locus coeruleus noradrenergic firing, synergistically amplifying opioid somnolence.",
    ],
  };

  // 3. Serotonergic Load
  const serContributions: DrugContribution[] = [];
  let serScore = 0;
  let hasMaoi = false;
  let hasSert = false;
  for (const id of uniqueIds) {
    const entry = SEROTONIN_DRUGS[id];
    if (entry) {
      serScore += entry.points;
      if (entry.isMaoi) hasMaoi = true;
      if (entry.isSert) hasSert = true;
      const drug = DRUG_BY_ID[id];
      serContributions.push({
        drugId: id,
        drugName: drug ? drug.name : id,
        target: entry.target,
        action: entry.isMaoi ? "Monoamine Oxidase Inhibitor" : "Serotonergic Modulator",
        points: entry.points,
        contribution: entry.points >= 3 ? "primary" : entry.points === 2 ? "secondary" : "minor",
        mechanismDetail: entry.detail,
      });
    }
  }
  const isLethalMaoiSertCollision = hasMaoi && hasSert;
  const serLoad: IntersectLoad = {
    category: "serotonin",
    title: "Cumulative Serotonergic Load & Hunter Toxicity",
    shortName: "Serotonergic Load",
    score: isLethalMaoiSertCollision ? 10 : serScore,
    maxExpectedScore: 10,
    level: isLethalMaoiSertCollision ? "severe" : scoreToLevel(serScore, 8),
    summary:
      isLethalMaoiSertCollision
        ? "CRITICAL COLLISION: Simultaneous MAO inhibition and SERT blockade creates catastrophic intrasynaptic serotonin accumulation."
        : serScore === 0
          ? "No mapped serotonergic agents on this regimen."
          : `Cumulative serotonergic burden score of ${serScore}. Reuptake inhibition and direct receptor stimulation raise synaptic serotonin levels.`,
    molecularMechanism:
      "Massive accumulation of intrasynaptic 5-hydroxytryptamine (5-HT) overstimulates postsynaptic 5-HT1A and 5-HT2A receptors in the brainstem and spinal cord. Excessive 5-HT2A stimulation triggers neuromuscular hyperactivity (spontaneous or inducible clonus, hyperreflexia), central autonomic dysregulation (hyperthermia, diaphoresis, tachycardia), and altered mental status (agitation, delirium).",
    contributingDrugs: serContributions.sort((a, b) => b.points - a.points),
    clinicalPearls: [
      isLethalMaoiSertCollision
        ? "STRICTLY CONTRAINDICATED: Combining an MAOI with an SSRI/SNRI or serotonergic opioid (tramadol, meperidine) can cause fatal serotonin toxicity within hours. Mandatory 14-day (5 weeks for fluoxetine) washout required."
        : "Hunter Serotonin Toxicity Criteria: Clonus (spontaneous, inducible, or ocular) with agitation or diaphoresis is the most sensitive diagnostic feature.",
      "Linezolid and methylene blue are potent MAO-A inhibitors; co-administration with SSRIs frequently precipitates unexpected hospital-acquired serotonin toxicity.",
    ],
  };

  // 4. Cardiac QTc Load
  const qtcContributions: DrugContribution[] = [];
  let qtcScore = 0;
  for (const id of uniqueIds) {
    const entry = QTC_DRUGS[id];
    if (entry) {
      qtcScore += entry.points;
      const drug = DRUG_BY_ID[id];
      qtcContributions.push({
        drugId: id,
        drugName: drug ? drug.name : id,
        target: entry.target,
        action: "hERG (IKr) Potassium Channel Inhibitor",
        points: entry.points,
        contribution: entry.points >= 3 ? "primary" : entry.points === 2 ? "secondary" : "minor",
        mechanismDetail: entry.detail,
      });
    }
  }
  const qtcLoad: IntersectLoad = {
    category: "qtc",
    title: "Cumulative Ventricular Repolarization (QTc / hERG) Stress",
    shortName: "QTc / hERG Stress",
    score: qtcScore,
    maxExpectedScore: 8,
    level: scoreToLevel(qtcScore, 8),
    summary:
      qtcScore === 0
        ? "No mapped hERG (IKr) channel-blocking agents on this regimen."
        : `Cumulative repolarization delay score of ${qtcScore}. Multiple agents prolong the cardiac action potential plateau and delay Phase 3 repolarization.`,
    molecularMechanism:
      "Blockade of the rapid delayed rectifier potassium current (IKr) encoded by the KCNH2 (hERG) gene prevents potassium efflux during Phase 3 of the cardiac ventricular action potential. The prolonged repolarization interval allows reactivation of L-type calcium channels, generating early afterdepolarizations (EADs) that trigger polymorphic ventricular tachycardia (Torsades de Pointes).",
    contributingDrugs: qtcContributions.sort((a, b) => b.points - a.points),
    clinicalPearls: [
      "Co-administration of two or more known QTc-prolonging drugs exponentially increases Torsades de Pointes risk, especially in the presence of hypokalemia (K+ < 3.5 mEq/L) or hypomagnesemia.",
      "Methadone causes dose-dependent hERG channel blockade; baseline ECG is recommended before exceeding 100 mg/day.",
      "Clarithromycin and erythromycin both directly block hERG and potently inhibit CYP3A4, causing double exposure spikes of co-administered cardiac agents.",
    ],
  };

  // 5. Adrenergic / Pressor Load
  const pressorContributions: DrugContribution[] = [];
  let pressorScore = 0;
  for (const id of uniqueIds) {
    const entry = PRESSOR_DRUGS[id];
    if (entry) {
      pressorScore += entry.points;
      const drug = DRUG_BY_ID[id];
      pressorContributions.push({
        drugId: id,
        drugName: drug ? drug.name : id,
        target: entry.target,
        action: "Sympathomimetic / Adrenergic Stimulator",
        points: entry.points,
        contribution: entry.points >= 3 ? "primary" : entry.points === 2 ? "secondary" : "minor",
        mechanismDetail: entry.detail,
      });
    }
  }
  const pressorLoad: IntersectLoad = {
    category: "pressor",
    title: "Cumulative Adrenergic & Pressor Push",
    shortName: "Adrenergic Push",
    score: pressorScore,
    maxExpectedScore: 8,
    level: scoreToLevel(pressorScore, 8),
    summary:
      pressorScore === 0
        ? "No mapped sympathomimetic agents on this regimen."
        : `Cumulative sympathomimetic burden score of ${pressorScore}. Stimulates vascular alpha-1 and cardiac beta-1 adrenergic receptors.`,
    molecularMechanism:
      "Activation of postjunctional alpha-1 adrenergic receptors (Gq-coupled) activates phospholipase C, generating IP3 and DAG to mobilize intracellular calcium and trigger vascular smooth muscle contraction. Concurrent beta-1 adrenergic stimulation (Gs-coupled) elevates intracellular cAMP and protein kinase A, driving cardiac inotropy, chronotropy, and myocardial oxygen demand.",
    contributingDrugs: pressorContributions.sort((a, b) => b.points - a.points),
    clinicalPearls: [
      "Over-the-counter pseudoephedrine combined with stimulants or SNRIs can precipitate acute hypertensive urgencies, myocardial ischemia, or intracranial hemorrhage.",
      "Beta-blocker monotherapy in high-catecholamine states (e.g. pheochromocytoma, cocaine) leaves alpha-1 vasoconstriction unopposed, precipitating paradoxical malignant hypertension.",
    ],
  };

  const loads: IntersectLoad[] = [achLoad, sedLoad, serLoad, qtcLoad, pressorLoad];

  // Determine highest load
  let highestCategory: IntersectCategory | null = null;
  let highestLevel: BurdenLevel = "minimal";
  const levelPriority: Record<BurdenLevel, number> = {
    minimal: 0,
    mild: 1,
    moderate: 2,
    high: 3,
    severe: 4,
  };

  for (const l of loads) {
    if (levelPriority[l.level] > levelPriority[highestLevel]) {
      highestLevel = l.level;
      highestCategory = l.category;
    }
  }

  const overallRiskSummary =
    highestLevel === "severe"
      ? "Severe multi-target pharmacodynamic collision detected. High risk of physiological collapse, organ toxicity, or malignant arrhythmia."
      : highestLevel === "high"
        ? "Substantial pharmacodynamic burden identified. Additive target occupancy requires close clinical vigilance."
        : highestLevel === "moderate"
          ? "Moderate pharmacodynamic overlap present across one or more receptor cascades."
          : highestLevel === "mild"
            ? "Mild pharmacodynamic signal detected with minimal cumulative collision risk."
            : "No significant cumulative pharmacodynamic saturation detected on this regimen.";

  return {
    drugs: uniqueIds,
    loads,
    overallRiskSummary,
    highestCategory,
    highestLevel,
  };
}
