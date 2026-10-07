/**
 * Receptor Binding Profiles & Pharmacological Target Reference
 *
 * Comprehensive pharmacological receptor profiling database for educational
 * decision-support under FD&C Act § 520(o)(1)(E).
 *
 * Affinities reflect in vitro equilibrium dissociation constants (Ki in nM)
 * primarily collated from the National Institute of Mental Health Psychoactive
 * Drug Screening Program (NIMH PDSP, Roth et al.), the IUPHAR/BPS Guide to
 * PHARMACOLOGY, and peer-reviewed pharmacodynamic literature.
 *
 * DISCLAIMER: For educational exploration and comparative pharmacodynamics only.
 * Does not provide individualized dosing, prescribing directives, or clinical treatment plans.
 */

export type AffinityTier =
  | "Sub-nanomolar"
  | "High"
  | "Moderate"
  | "Low"
  | "Negligible";

export type FunctionalActivity =
  | "Full Agonist"
  | "Partial Agonist"
  | "Antagonist"
  | "Inverse Agonist"
  | "Reuptake Inhibitor"
  | "PAM"
  | "Channel Blocker";

export type ReceptorFamily =
  | "Dopamine"
  | "Serotonin"
  | "Adrenergic"
  | "Histamine"
  | "Muscarinic"
  | "Opioid"
  | "Transporters"
  | "Ionotropic / Amino Acid";

export interface ReceptorBinding {
  receptor: string;
  targetFamily: ReceptorFamily;
  affinityKiNm?: number;
  affinityTier: AffinityTier;
  functionalActivity: FunctionalActivity;
  clinicalSignificance: string;
}

export interface DrugReceptorProfile {
  drugId: string;
  drugName: string;
  primaryClass: string;
  mechanismSummary: string;
  primaryTarget: string;
  bindings: ReceptorBinding[];
  downstreamEffects: string[];
}

export interface ReceptorTargetInfo {
  receptor: string;
  name: string;
  family: ReceptorFamily;
  description: string;
  agonismConsequences: string;
  antagonismConsequences: string;
  primaryClinicalImplications: string;
  citation: string;
}

export const RECEPTOR_PROFILES_REGULATORY_DISCLAIMER =
  "Educational pharmacodynamic decision-support reference under FD&C Act § 520(o)(1)(E). Data reflects in vitro receptor binding affinities (Ki in nM) from the NIMH PDSP database (Roth et al.), IUPHAR/BPS Guide to PHARMACOLOGY, and published neuropharmacology literature. Recombinant human and cloned receptor affinities vary across assay preparations and do not linearly extrapolate to clinical in vivo tissue concentrations. This desk provides no dosing directives, therapeutic substitution mandates, or prescriptive orders.";

/**
 * RECEPTOR_TARGETS
 * Master registry of pharmacological receptors with clinical consequence descriptions.
 */
export const RECEPTOR_TARGETS: Record<string, ReceptorTargetInfo> = {
  // Dopamine Family
  D1: {
    receptor: "D1",
    name: "Dopamine D1 Receptor",
    family: "Dopamine",
    description: "Gs-coupled receptor highly expressed in striatum, nucleus accumbens, and frontal cortex.",
    agonismConsequences: "Stimulates adenylyl cyclase, enhances working memory gating, locomotor activation.",
    antagonismConsequences: "May dampen prefrontal cortical signaling; rarely targeted in isolation by clinical neuroleptics.",
    primaryClinicalImplications: "Cortical processing, reward circuitry, fine motor coordination.",
    citation: "Neve KA et al. The Dopamine Receptors. Humana Press; 2002.",
  },
  D2: {
    receptor: "D2",
    name: "Dopamine D2 Receptor",
    family: "Dopamine",
    description: "Gi/o-coupled receptor mediating major dopamine transmission in mesolimbic, nigrostriatal, and tuberoinfundibular pathways.",
    agonismConsequences: "Suppresses prolactin release, enhances motor initiation, emetic stimulation at CTZ.",
    antagonismConsequences: "Antipsychotic efficacy (>=65% occupancy in mesolimbic pathway), extrapyramidal symptoms (EPS, >80% nigrostriatal occupancy), hyperprolactinemia (galactorrhea, amenorrhea), antiemetic effect.",
    primaryClinicalImplications: "Therapeutic threshold for typical and atypical antipsychotics; determinant of EPS and prolactin elevation.",
    citation: "Kapur S et al. Am J Psychiatry. 2000;157(4):514-520; Seeman P. Can J Psychiatry. 2002;47(1):27-38.",
  },
  D3: {
    receptor: "D3",
    name: "Dopamine D3 Receptor",
    family: "Dopamine",
    description: "Gi/o-coupled receptor enriched in limbic structures (islands of Calleja, nucleus accumbens).",
    agonismConsequences: "Modulates mood, executive function, and behavioral reinforcement.",
    antagonismConsequences: "Procognitive actions, mood elevation, mitigation of substance craving and negative symptoms.",
    primaryClinicalImplications: "Target for modern partial agonists (cariprazine) addressing negative symptoms and cognitive deficits.",
    citation: "Sokoloff P et al. Nature. 1990;347(6289):146-151.",
  },
  D4: {
    receptor: "D4",
    name: "Dopamine D4 Receptor",
    family: "Dopamine",
    description: "Gi/o-coupled receptor with prominent prefrontal cortex, hippocampal, and amygdala localization.",
    agonismConsequences: "Attentional control and cognitive regulation.",
    antagonismConsequences: "Modulates cortical dopaminergic tone; high affinity in clozapine may contribute to atypical profile without EPS.",
    primaryClinicalImplications: "Attention-deficit regulation, atypical antipsychotic action without parkinsonian liability.",
    citation: "Van Tol HH et al. Nature. 1991;350(6319):610-614.",
  },

  // Serotonin Family
  "5-HT1A": {
    receptor: "5-HT1A",
    name: "5-Hydroxytryptamine 1A Receptor",
    family: "Serotonin",
    description: "Gi/o-coupled presynaptic autoreceptor in dorsal raphe and postsynaptic receptor in limbic/cortical structures.",
    agonismConsequences: "Anxiolysis, antidepressant augmentation, hypothermia, reduced EPS liability, preservation of sexual function.",
    antagonismConsequences: "Blocks negative feedback inhibition of serotonin firing; potential pro-depressive effects.",
    primaryClinicalImplications: "Target of buspirone and second-generation atypical partial agonists to counteract EPS and anxiety.",
    citation: "Newman-Tancredi A et al. Neuropharmacology. 1998;37(10-11):1253-1260.",
  },
  "5-HT2A": {
    receptor: "5-HT2A",
    name: "5-Hydroxytryptamine 2A Receptor",
    family: "Serotonin",
    description: "Gq/11-coupled excitatory receptor widely distributed throughout neocortical pyramidal neurons and platelets.",
    agonismConsequences: "Hallucinogenic/psychedelic effects, perceptual distortion, platelet aggregation, vasoconstriction.",
    antagonismConsequences: "Marked reduction in EPS risk via disinhibition of striatal dopamine release; promotion of slow-wave sleep; mitigation of negative symptoms.",
    primaryClinicalImplications: "Core defining feature of atypical (second-generation) antipsychotics with high 5-HT2A:D2 affinity ratio.",
    citation: "Meltzer HY et al. J Pharmacol Exp Ther. 1989;251(1):238-246.",
  },
  "5-HT2C": {
    receptor: "5-HT2C",
    name: "5-Hydroxytryptamine 2C Receptor",
    family: "Serotonin",
    description: "Gq/11-coupled receptor expressed in choroid plexus, hypothalamus, and basal ganglia.",
    agonismConsequences: "Appetite suppression, satiety induction, anxiogenic responses at high activation.",
    antagonismConsequences: "Orexigenic appetite stimulation, hyperphagia, metabolic dysregulation and weight gain; antidepressant synergy.",
    primaryClinicalImplications: "Key contributor to metabolic syndrome with olanzapine, clozapine, and mirtazapine.",
    citation: "Tecott LH et al. Nature. 1995;374(6522):542-546.",
  },
  "5-HT3": {
    receptor: "5-HT3",
    name: "5-Hydroxytryptamine 3 Receptor",
    family: "Serotonin",
    description: "Pentameric ligand-gated cation channel (ionotropic) located on chemoreceptor trigger zone and enteric nervous system.",
    agonismConsequences: "Emesis, gastrointestinal hypermotility, visceral hypersensitivity, anxiety.",
    antagonismConsequences: "Potent antiemetic action, prevention of chemotherapy/drug-induced vomiting, relief of irritable bowel diarrhea.",
    primaryClinicalImplications: "Antagonism is exploited by ondansetron and contributes to mirtazapine's antiemetic, non-nauseating tolerability.",
    citation: "Barnes NM et al. Neuropharmacology. 2009;56(1):273-284.",
  },
  "5-HT7": {
    receptor: "5-HT7",
    name: "5-Hydroxytryptamine 7 Receptor",
    family: "Serotonin",
    description: "Gs-coupled receptor localized to suprachiasmatic nucleus (circadian pacemaker), thalamus, and hippocampus.",
    agonismConsequences: "Modulation of circadian rhythmicity, body temperature, smooth muscle relaxation.",
    antagonismConsequences: "Circadian rhythm stabilization, antidepressant synergy, procognitive enhancement in mood disorders.",
    primaryClinicalImplications: "Target of vortioxetine and lurasidone for cognitive and mood enhancement.",
    citation: "Hedlund PB. Psychopharmacology (Berl). 2009;206(3):345-354.",
  },

  // Adrenergic Family
  "Alpha-1": {
    receptor: "Alpha-1",
    name: "Alpha-1 Adrenergic Receptor (A1A/B/D)",
    family: "Adrenergic",
    description: "Gq/11-coupled post-junctional receptor mediating peripheral arterial vasoconstriction and central arousal.",
    agonismConsequences: "Vasoconstriction, elevated systemic vascular resistance, mydriasis, urinary bladder sphincter contraction.",
    antagonismConsequences: "Orthostatic hypotension, reflex tachycardia, dizziness, syncope, sedation, nasal congestion, priapism.",
    primaryClinicalImplications: "Major cause of initial-dose fall risk with clozapine, quetiapine, risperidone, and prazosin.",
    citation: "Piascik MT, Perez DM. J Pharmacol Exp Ther. 2001;298(2):403-410.",
  },
  "Alpha-2": {
    receptor: "Alpha-2",
    name: "Alpha-2 Adrenergic Receptor (A2A/B/C)",
    family: "Adrenergic",
    description: "Gi/o-coupled presynaptic auto- and heteroreceptor in locus coeruleus and sympathetic nerve terminals.",
    agonismConsequences: "Central sympatholysis, reduction in peripheral norepinephrine release, bradycardia, sedation, analgesia.",
    antagonismConsequences: "Disinhibition of central noradrenergic and serotonergic neurotransmission; antidepressant action, potential hypertension.",
    primaryClinicalImplications: "Agonism drives clonidine and dexmedetomidine sedation/hemodynamics; antagonism drives mirtazapine's efficacy.",
    citation: "Strosberg AD. Annu Rev Pharmacol Toxicol. 1993;33:279-296.",
  },
  "Beta-1": {
    receptor: "Beta-1",
    name: "Beta-1 Adrenergic Receptor",
    family: "Adrenergic",
    description: "Gs-coupled receptor predominant in cardiac myocardium, sinoatrial node, and juxtaglomerular apparatus.",
    agonismConsequences: "Positive inotropy, positive chronotropy, increased dromotropy, stimulation of renin secretion.",
    antagonismConsequences: "Decreased heart rate (bradycardia), reduced cardiac output, lowered blood pressure, reduced myocardial oxygen demand.",
    primaryClinicalImplications: "Core target for cardioselective and non-selective beta-blockers in hypertension, angina, and heart failure.",
    citation: "Brodde OE. Pharmacol Rev. 1991;43(2):203-242.",
  },
  "Beta-2": {
    receptor: "Beta-2",
    name: "Beta-2 Adrenergic Receptor",
    family: "Adrenergic",
    description: "Gs-coupled receptor enriched in bronchial and vascular smooth muscle and skeletal muscle.",
    agonismConsequences: "Bronchodilation, vasodilation of skeletal muscle beds, tremor, glycogenolysis, hypokalemia.",
    antagonismConsequences: "Bronchoconstriction (dangerous in reactive airway disease/asthma), peripheral vasoconstriction, blunted hypoglycemic response.",
    primaryClinicalImplications: "Must be considered when non-selective beta-blockers (propranolol) are administered in asthmatic patients.",
    citation: "Johnson M. J Allergy Clin Immunol. 2006;117(1):18-24.",
  },

  // Histamine Family
  H1: {
    receptor: "H1",
    name: "Histamine H1 Receptor",
    family: "Histamine",
    description: "Gq/11-coupled receptor driving central alertness/arousal in tuberomammillary projections, plus allergic vascular permeability.",
    agonismConsequences: "Wakefulness, pruritus, bronchoconstriction, allergic vasodilation.",
    antagonismConsequences: "Profound sedation, somnolence, fatigue, appetite stimulation, hyperphagia, body weight gain, antiemetic effect.",
    primaryClinicalImplications: "High affinity in clozapine, olanzapine, quetiapine, hydroxyzine, and mirtazapine dictates their sedative & metabolic footprints.",
    citation: "Hill SJ et al. Pharmacol Rev. 1997;49(3):253-278.",
  },

  // Muscarinic Family
  M1: {
    receptor: "M1",
    name: "Muscarinic Acetylcholine M1 Receptor",
    family: "Muscarinic",
    description: "Gq/11-coupled cholinergic receptor widely expressed in neocortex, hippocampus, and striatum.",
    agonismConsequences: "Facilitates long-term potentiation, attention, memory consolidation, salivation.",
    antagonismConsequences: "Anticholinergic cognitive blur, memory encoding impairment, confusion, delirium risk (especially in elderly), dry mouth.",
    primaryClinicalImplications: "Anticholinergic burden index; differentiates low-anticholinergic agents (haloperidol) from high-anticholinergic agents (clozapine, amitriptyline).",
    citation: "Caulfield MP, Birdsall NJ. Pharmacol Rev. 1998;50(2):279-290.",
  },
  M2: {
    receptor: "M2",
    name: "Muscarinic Acetylcholine M2 Receptor",
    family: "Muscarinic",
    description: "Gi/o-coupled receptor located primarily on nodal and atrial myocardium, plus presynaptic cholinergic autoreceptors.",
    agonismConsequences: "Decreased heart rate (vagal bradycardia), slowed AV nodal conduction.",
    antagonismConsequences: "Tachycardia via blockade of vagal cardiac braking.",
    primaryClinicalImplications: "Atropine vagolysis in bradycardia and AV block; contributes to antimuscarinic tachycardia.",
    citation: "Hulme EC et al. Annu Rev Pharmacol Toxicol. 1990;30:635-673.",
  },
  M3: {
    receptor: "M3",
    name: "Muscarinic Acetylcholine M3 Receptor",
    family: "Muscarinic",
    description: "Gq/11-coupled receptor on exocrine glands, pupillary sphincter, ciliary muscle, and gastrointestinal/urinary smooth muscle.",
    agonismConsequences: "Salivation, lacrimation, miosis, ciliary spasm, bronchosecretion, GI peristalsis, detrusor contraction.",
    antagonismConsequences: "Dry mouth (xerostomia), blurred near vision (cycloplegia), mydriasis, constipation, urinary retention, anhidrosis.",
    primaryClinicalImplications: "Classic peripheral anticholinergic toxidrome component seen with atropine, tricyclics, and phenothiazines.",
    citation: "Eglen RM. Auton Autacoid Pharmacol. 2006;26(1):3-11.",
  },

  // Opioid Family
  Mu: {
    receptor: "Mu",
    name: "Mu-Opioid Receptor (MOR / OPRM1)",
    family: "Opioid",
    description: "Gi/o-coupled receptor expressed in periaqueductal gray, spinal dorsal horn, thalamus, and ventral tegmental area.",
    agonismConsequences: "Potent supraspinal and spinal analgesia, dose-dependent respiratory depression, euphoria, miosis, constipation, physical dependence.",
    antagonismConsequences: "Reversal of opioid-induced narcosis and respiratory arrest (naloxone), precipitated withdrawal in dependent individuals.",
    primaryClinicalImplications: "Principal therapeutic target of clinical opioids (morphine, fentanyl, methadone) and site of opioid overdose toxicity.",
    citation: "Matthes HW et al. Nature. 1996;383(6603):819-823; Kieffer BL, Evans CJ. Trends Pharmacol Sci. 2009;30(10):527-535.",
  },
  Kappa: {
    receptor: "Kappa",
    name: "Kappa-Opioid Receptor (KOR / OPRK1)",
    family: "Opioid",
    description: "Gi/o-coupled receptor distributed in claustrum, amygdala, hypothalamus, and spinal cord.",
    agonismConsequences: "Spinal analgesia, dysphoria, anhedonia, psychotomimetic hallucinations, sedation, diuresis (aquaresis).",
    antagonismConsequences: "Antidepressant and anti-anhedonic effects; blocks kappa-mediated aversion and stress reactivity.",
    primaryClinicalImplications: "Agonism produces limiting dysphoria (pentazocine, salvinorin A); buprenorphine functions as a KOR antagonist.",
    citation: "Chavkin C et al. Neuropsychopharmacology. 2014;39(1):241-242.",
  },
  Delta: {
    receptor: "Delta",
    name: "Delta-Opioid Receptor (DOR / OPRD1)",
    family: "Opioid",
    description: "Gi/o-coupled receptor enriched in pontine nuclei, olfactory bulbs, and cerebral cortex.",
    agonismConsequences: "Analgesia, mood regulation, reduction of anxiety-like behavior; risk of pro-convulsant activity at high occupancy.",
    antagonismConsequences: "Blocks delta-mediated analgesia; minor physiological effects in isolation.",
    primaryClinicalImplications: "Target under active development for non-addictive analgesia and mood stabilization without respiratory suppression.",
    citation: "Gaveriaux-Ruff C, Kieffer BL. Neuropeptides. 2002;36(2-3):62-71.",
  },

  // Transporters
  SERT: {
    receptor: "SERT",
    name: "Serotonin Transporter (SLC6A4)",
    family: "Transporters",
    description: "Sodium/chloride-dependent plasma membrane transporter terminating serotonergic neurotransmission in synaptic cleft.",
    agonismConsequences: "Not applicable (transporter protein substrate).",
    antagonismConsequences: "Inhibition elevates synaptic serotonin: antidepressant and anxiolytic effects; initial GI nausea, tremor, sexual dysfunction, bleeding risk via platelet serotonin depletion.",
    primaryClinicalImplications: "Primary molecular target of SSRIs (fluoxetine, sertraline, escitalopram) and SNRIs (venlafaxine, duloxetine).",
    citation: "Blier P, de Montigny C. Trends Pharmacol Sci. 1994;15(7):220-226.",
  },
  NET: {
    receptor: "NET",
    name: "Norepinephrine Transporter (SLC6A2)",
    family: "Transporters",
    description: "Sodium/chloride-dependent transporter clearing extracellular norepinephrine in central and peripheral sympathetic synapses.",
    agonismConsequences: "Not applicable (transporter protein substrate).",
    antagonismConsequences: "Inhibition elevates synaptic norepinephrine: antidepressant action, enhanced focus/energy, executive function, tachycardia, elevated blood pressure, tremor.",
    primaryClinicalImplications: "Target of SNRIs, TCAs, and bupropion; confers energizing profile and sympathetic cardiovascular recruitment.",
    citation: "Axelrod J, Kopin IJ. Prog Brain Res. 1969;31:21-32.",
  },
  DAT: {
    receptor: "DAT",
    name: "Dopamine Transporter (SLC6A3)",
    family: "Transporters",
    description: "Sodium/chloride-dependent transporter mediating reuptake of dopamine in striatal and mesolimbic projections.",
    agonismConsequences: "Not applicable (transporter protein substrate).",
    antagonismConsequences: "Inhibition elevates synaptic dopamine: alertness, motivation, locomotor stimulation, appetite reduction, potential reinforcing/abuse liability.",
    primaryClinicalImplications: "Target of bupropion, methylphenidate, and sertraline (mild); absent in most classical SSRIs.",
    citation: "Giros B et al. Nature. 1996;379(6566):606-612.",
  },

  // Ionotropic / Amino Acid Channels
  NMDA: {
    receptor: "NMDA",
    name: "N-Methyl-D-Aspartate Receptor",
    family: "Ionotropic / Amino Acid",
    description: "Tetrameric ligand-gated cation channel permeable to Ca2+, requiring glutamate, glycine co-agonist, and membrane depolarization to expel Mg2+ block.",
    agonismConsequences: "Excitatory neurotransmission, synaptic plasticity, long-term potentiation; excitotoxicity at excessive activation.",
    antagonismConsequences: "Non-competitive channel blockade induces dissociative anesthesia, rapid synaptogenesis (BDNF/mTOR induction for rapid antidepressant effect), analgesia, psychotomimesis.",
    primaryClinicalImplications: "Target of ketamine for treatment-resistant depression and anesthesia; memantine in neurocognitive decline.",
    citation: "Zanos P, Gould TD. CNS Drugs. 2018;32(3):197-227.",
  },
  "GABA-A": {
    receptor: "GABA-A",
    name: "Gamma-Aminobutyric Acid Type A Receptor",
    family: "Ionotropic / Amino Acid",
    description: "Heteropentameric chloride-conducting ion channel providing fast inhibitory neurotransmission throughout the central nervous system.",
    agonismConsequences: "Direct channel opening hyperpolarizes neurons, suppressing action potential generation.",
    antagonismConsequences: "Convulsant activity, extreme anxiety, hyperexcitability.",
    primaryClinicalImplications: "Positive Allosteric Modulation (PAM) at alpha/gamma interface by benzodiazepines and Z-drugs produces anxiolysis, sedation, anticonvulsant, and muscle relaxant actions.",
    citation: "Sieghart W. Pharmacol Rev. 1995;47(2):181-234; Olsen RW, Sieghart W. Pharmacol Rev. 2008;60(3):243-260.",
  },
};

/**
 * DRUG_RECEPTOR_PROFILES
 * Over 30 representative clinical agents spanning antipsychotics, antidepressants,
 * sedatives/anxiolytics, analgesics, and cardiovascular/autonomic agents.
 */
export const DRUG_RECEPTOR_PROFILES: readonly DrugReceptorProfile[] = [
  // =========================================================================
  // ANTIPSYCHOTICS (6 required + 1 extra)
  // =========================================================================
  {
    drugId: "clozapine",
    drugName: "Clozapine",
    primaryClass: "Atypical Antipsychotic (Dibenzodiazepine)",
    mechanismSummary:
      "Loose, rapidly dissociating D2 antagonist with exceptionally potent 5-HT2A, H1, M1, and alpha-1 receptor antagonism; gold standard in treatment-resistant schizophrenia with negligible EPS risk but heavy metabolic and anticholinergic liability.",
    primaryTarget: "5-HT2A / H1 / M1 / D4",
    bindings: [
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 5.4,
        affinityTier: "High",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Mitigates extrapyramidal symptoms by disinhibiting striatal dopamine release; promotes slow-wave sleep.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1.1,
        affinityTier: "High",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Drives marked day-long somnolence, increased appetite, and profound metabolic weight gain.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1.9,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Severe anticholinergic burden: severe constipation, memory blunting; paradoxical sialorrhea via M4 agonism.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 1.6,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Severe orthostatic hypotension, syncope, and reflex sinus tachycardia during titration.",
      },
      {
        receptor: "D4",
        targetFamily: "Dopamine",
        affinityKiNm: 9.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Cortical dopaminergic modulation contributing to antipsychotic action without extrapyramidal motor block.",
      },
      {
        receptor: "D2",
        targetFamily: "Dopamine",
        affinityKiNm: 126,
        affinityTier: "Moderate",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Transient 'fast-off' binding (Ki ~126 nM); achieves antipsychotic response at <60% striatal occupancy, virtually eliminating EPS and hyperprolactinemia.",
      },
      {
        receptor: "5-HT2C",
        targetFamily: "Serotonin",
        affinityKiNm: 9.4,
        affinityTier: "High",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Synergistic metabolic dysregulation, severe weight gain, and insulin resistance.",
      },
      {
        receptor: "Alpha-2",
        targetFamily: "Adrenergic",
        affinityKiNm: 8.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Central noradrenergic disinhibition contributing to cardiovascular lability and tremor.",
      },
    ],
    downstreamEffects: [
      "Superior efficacy in treatment-resistant schizophrenia without EPS or tardive dyskinesia",
      "Low to absent prolactin elevation",
      "High incidence of severe sedation, weight gain, and new-onset diabetes",
      "Profound anticholinergic constipation (can lead to ileus) and nocturnal sialorrhea",
      "Orthostatic hypotension and resting sinus tachycardia",
    ],
  },
  {
    drugId: "olanzapine",
    drugName: "Olanzapine",
    primaryClass: "Atypical Antipsychotic (Thienobenzodiazepine)",
    mechanismSummary:
      "Potent 5-HT2A and D2 antagonist accompanied by high-affinity H1, M1, and 5-HT2C blockade; broad antipsychotic/antimanic efficacy coupled with prominent metabolic risk.",
    primaryTarget: "5-HT2A / D2 / H1",
    bindings: [
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 4.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "High 5-HT2A/D2 ratio protects against parkinsonian symptoms at standard clinical dosages.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 2.0,
        affinityTier: "High",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Major driver of rapid sleep induction, profound daytime somnolence, and marked hyperphagia.",
      },
      {
        receptor: "D2",
        targetFamily: "Dopamine",
        affinityKiNm: 11.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Provides robust mesolimbic antipsychotic control; EPS emerges predominantly at supra-therapeutic doses.",
      },
      {
        receptor: "5-HT2C",
        targetFamily: "Serotonin",
        affinityKiNm: 11.0,
        affinityTier: "High",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Synergizes with H1 antagonism to produce rapid weight gain and dyslipidemia.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 26.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Moderate anticholinergic dry mouth, constipation, and sedation.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 19.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Moderate orthostatic hypotension and reflex tachycardia.",
      },
    ],
    downstreamEffects: [
      "Robust antipsychotic and mood stabilizing efficacy with low EPS at typical therapeutic doses",
      "Substantial risk of metabolic syndrome: weight gain, hypertriglyceridemia, and insulin resistance",
      "Significant somnolence useful for acute agitation or acute mania sleep restoration",
      "Mild to moderate dry mouth and constipation",
    ],
  },
  {
    drugId: "quetiapine",
    drugName: "Quetiapine",
    primaryClass: "Atypical Antipsychotic (Dibenzothiazepine)",
    mechanismSummary:
      "Rapidly dissociating low-potency D2 antagonist with predominant H1 and alpha-1 antagonism; active metabolite norquetiapine adds NET reuptake inhibition and 5-HT1A partial agonism.",
    primaryTarget: "H1 / Alpha-1 / 5-HT2A",
    bindings: [
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 11.0,
        affinityTier: "High",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Primary receptor occupied at low doses (25-100 mg), generating profound sedation and sleep consolidation.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 22.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Drives orthostasis and dizziness upon initiation and dosage escalation.",
      },
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 101.0,
        affinityTier: "Moderate",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Buffers striatal dopamine tone, virtually abolishing parkinsonian side effects.",
      },
      {
        receptor: "D2",
        targetFamily: "Dopamine",
        affinityKiNm: 380.0,
        affinityTier: "Low",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Fast-off D2 binding with low affinity; requires 400-800 mg daily for adequate antipsychotic striatal occupancy.",
      },
      {
        receptor: "NET",
        targetFamily: "Transporters",
        affinityKiNm: 580.0,
        affinityTier: "Low",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Inhibited primarily by norquetiapine metabolite, delivering antidepressant augmenting efficacy in MDD/bipolar.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 620.0,
        affinityTier: "Low",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Parent drug has negligible antimuscarinic activity; norquetiapine possesses moderate M1 blockade.",
      },
    ],
    downstreamEffects: [
      "Dose-stratified clinical pharmacology: hypnotic at low doses, antidepressant at mid doses, antipsychotic at high doses",
      "Extremely low incidence of EPS, tremor, or hyperprolactinemia",
      "High rates of somnolence and moderate weight gain",
      "Orthostatic dizziness during dosage escalations",
    ],
  },
  {
    drugId: "risperidone",
    drugName: "Risperidone",
    primaryClass: "Atypical Antipsychotic (Benzisoxazole)",
    mechanismSummary:
      "Potent dual 5-HT2A and D2 antagonist with high alpha-1 and alpha-2 affinity; acts atypically at low doses but displays dose-dependent typical-like EPS and hyperprolactinemia as dose exceeds 4-6 mg/day.",
    primaryTarget: "5-HT2A / D2 / Alpha-1",
    bindings: [
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 0.17,
        affinityTier: "Sub-nanomolar",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Exceptionally high affinity blocks cortical 5-HT2A receptors at sub-milligram doses, buffering EPS in low dose ranges.",
      },
      {
        receptor: "D2",
        targetFamily: "Dopamine",
        affinityKiNm: 3.8,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Potent D2 blockade provides robust positive-symptom resolution; high pituitary occupancy leads to significant prolactin elevation.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 2.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Causes orthostatic blood pressure drops and reflex tachycardia upon dose initiation.",
      },
      {
        receptor: "Alpha-2",
        targetFamily: "Adrenergic",
        affinityKiNm: 8.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Central noradrenergic disinhibition.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 20.0,
        affinityTier: "High",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Moderate sedation and contribution to weight gain.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Spares muscarinic receptors; no intrinsic anticholinergic defense against emergent dystonia or parkinsonism.",
      },
    ],
    downstreamEffects: [
      "Potent antipsychotic efficacy with low EPS at 1-3 mg/day, rising sharply at >4-6 mg/day",
      "Marked elevation of serum prolactin (amenorrhea, galactorrhea, gynecomastia)",
      "Moderate sedation and weight gain",
      "Orthostasis upon initial administration",
    ],
  },
  {
    drugId: "aripiprazole",
    drugName: "Aripiprazole",
    primaryClass: "Atypical Antipsychotic (Dihydroquinolinone)",
    mechanismSummary:
      "Dopamine system stabilizer acting as a high-affinity D2 and D3 partial agonist (~30% intrinsic activity), 5-HT1A partial agonist, and 5-HT2A antagonist; achieves >80% D2 occupancy without classic motor blockade or hyperprolactinemia.",
    primaryTarget: "D2 (Partial Agonist) / 5-HT1A / 5-HT2A",
    bindings: [
      {
        receptor: "D2",
        targetFamily: "Dopamine",
        affinityKiNm: 0.74,
        affinityTier: "Sub-nanomolar",
        functionalActivity: "Partial Agonist",
        clinicalSignificance: "Stabilizes dopaminergic transmission: antagonizes hyperdopaminergic mesolimbic states while preserving baseline tone in nigrostriatal and tuberoinfundibular pathways.",
      },
      {
        receptor: "D3",
        targetFamily: "Dopamine",
        affinityKiNm: 1.1,
        affinityTier: "High",
        functionalActivity: "Partial Agonist",
        clinicalSignificance: "Limbic target modulating reward sensitivity, mood, and motivational tone.",
      },
      {
        receptor: "5-HT1A",
        targetFamily: "Serotonin",
        affinityKiNm: 5.6,
        affinityTier: "High",
        functionalActivity: "Partial Agonist",
        clinicalSignificance: "Provides anxiolysis, enhances antidepressant augmentation in MDD, and protects against motor rigidity.",
      },
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 3.4,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Improves mood and reduces EPS liability in striatal circuits.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 61.0,
        affinityTier: "Moderate",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Minimal antihistaminergic sedation compared to clozapine or quetiapine.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 57.0,
        affinityTier: "Moderate",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Low propensity for orthostatic hypotension.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Completely spares cholinergic receptors; zero anticholinergic cognitive impairment.",
      },
    ],
    downstreamEffects: [
      "Low risk of parkinsonism, dystonia, and tardive dyskinesia, but notable incidence of akathisia/inner restlessness",
      "Absence of prolactin elevation (frequently decreases elevated baseline prolactin)",
      "Minimal sedation and low metabolic/weight gain risk",
      "Activating or insomnia tendency during treatment initiation",
    ],
  },
  {
    drugId: "haloperidol",
    drugName: "Haloperidol",
    primaryClass: "First-Generation Antipsychotic (Butyrophenone)",
    mechanismSummary:
      "Archetypal high-potency D2 receptor antagonist with tight receptor binding and negligible muscarinic or histaminergic affinity; powerful antipsychotic and antiemetic efficacy with high EPS liability.",
    primaryTarget: "D2 (Antagonist)",
    bindings: [
      {
        receptor: "D2",
        targetFamily: "Dopamine",
        affinityKiNm: 1.2,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "High-affinity, tight dissociation D2 blockade delivers rapid control of delusions and hallucinations; high nigrostriatal occupancy causes acute EPS.",
      },
      {
        receptor: "D3",
        targetFamily: "Dopamine",
        affinityKiNm: 2.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Blocks limbic dopamine signaling in nucleus accumbens.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 12.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Mild orthostatic hypotension and modest sedation, especially via parenteral injection.",
      },
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 53.0,
        affinityTier: "Moderate",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Low affinity relative to D2; insufficient 5-HT2A occupancy to relieve dopamine blockade in basal ganglia.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 440.0,
        affinityTier: "Low",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Minimal direct antihistaminic sedation or orexigenic weight gain.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Zero anticholinergic buffering; unmitigated cholinergic striatal hyperactivity precipitates acute dystonia and parkinsonism.",
      },
    ],
    downstreamEffects: [
      "High incidence of acute extrapyramidal symptoms: acute dystonia, parkinsonian rigidity, tremor, akathisia",
      "Substantial elevation of serum prolactin due to tuberoinfundibular D2 blockade",
      "Very low propensity for weight gain, diabetes, or metabolic dysregulation",
      "Negligible dry mouth, constipation, or antimuscarinic cognitive blur",
    ],
  },
  {
    drugId: "ziprasidone",
    drugName: "Ziprasidone",
    primaryClass: "Atypical Antipsychotic (Benzothiazolylpiperazine)",
    mechanismSummary:
      "High 5-HT2A to D2 affinity ratio coupled with potent 5-HT1A partial agonism and unique dual SERT/NET reuptake inhibition; metabolic-neutral antipsychotic with QT considerations.",
    primaryTarget: "5-HT2A / D2 / 5-HT1A",
    bindings: [
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 0.42,
        affinityTier: "Sub-nanomolar",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Sub-nanomolar affinity strongly protects against EPS in the setting of therapeutic D2 blockade.",
      },
      {
        receptor: "D2",
        targetFamily: "Dopamine",
        affinityKiNm: 4.8,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Provides reliable antipsychotic efficacy with low extrapyramidal liability.",
      },
      {
        receptor: "5-HT1A",
        targetFamily: "Serotonin",
        affinityKiNm: 3.4,
        affinityTier: "High",
        functionalActivity: "Partial Agonist",
        clinicalSignificance: "Anxiolytic and antidepressant augmenting action.",
      },
      {
        receptor: "5-HT2C",
        targetFamily: "Serotonin",
        affinityKiNm: 1.3,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Contributes to antidepressant profile with minimal weight gain.",
      },
      {
        receptor: "SERT",
        targetFamily: "Transporters",
        affinityKiNm: 112.0,
        affinityTier: "Moderate",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Moderate monoamine reuptake inhibition conferring antidepressant-like mood properties.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 47.0,
        affinityTier: "Moderate",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Mild transient sedation without long-term metabolic or weight gain penalty.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Zero anticholinergic impairment.",
      },
    ],
    downstreamEffects: [
      "Favorable metabolic profile with minimal weight gain, glucose dysregulation, or lipid elevations",
      "Low EPS liability, modest akathisia risk",
      "Requires administration with food (>=500 calories) for adequate bioavailability",
      "Dose-dependent mild QTc prolongation requiring baseline ECG consideration",
    ],
  },

  // =========================================================================
  // ANTIDEPRESSANTS (6 required + 2 extra)
  // =========================================================================
  {
    drugId: "fluoxetine",
    drugName: "Fluoxetine",
    primaryClass: "Selective Serotonin Reuptake Inhibitor (SSRI)",
    mechanismSummary:
      "Potent SERT inhibitor featuring distinctive moderate 5-HT2C receptor antagonism, conferring an activating, energizing clinical profile with negligible anticholinergic activity.",
    primaryTarget: "SERT (Reuptake Inhibitor)",
    bindings: [
      {
        receptor: "SERT",
        targetFamily: "Transporters",
        affinityKiNm: 1.0,
        affinityTier: "High",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Blocks presynaptic serotonin clearance, increasing synaptic 5-HT availability to trigger downstream neuroplasticity.",
      },
      {
        receptor: "5-HT2C",
        targetFamily: "Serotonin",
        affinityKiNm: 54.0,
        affinityTier: "Moderate",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Disinhibits prefrontal dopamine and norepinephrine release; imparts energizing, activating clinical character and reduced appetite.",
      },
      {
        receptor: "NET",
        targetFamily: "Transporters",
        affinityKiNm: 660.0,
        affinityTier: "Low",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Very weak noradrenergic reuptake inhibition, relevant only at supratherapeutic plasma levels.",
      },
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 200.0,
        affinityTier: "Moderate",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Weak antagonism; clinical serotonin surge can still stimulate 5-HT2A causing initial agitation or sexual dysfunction.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Negligible sedation or antihistaminic weight gain.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Spares memory, salivation, and gastrointestinal motility from antimuscarinic blunting.",
      },
    ],
    downstreamEffects: [
      "Broad antidepressant and anti-obsessional efficacy with an energizing/activating initial response",
      "Initial gastrointestinal distress (5-HT3 activation) and sleep disturbance/insomnia",
      "Risk of sexual dysfunction (loss of libido, anorgasmia) via 5-HT2A stimulation",
      "Prolonged half-life (and active metabolite norfluoxetine) protects against abrupt discontinuation syndrome",
    ],
  },
  {
    drugId: "sertraline",
    drugName: "Sertraline",
    primaryClass: "Selective Serotonin Reuptake Inhibitor (SSRI)",
    mechanismSummary:
      "Highly selective, sub-nanomolar SERT inhibitor with modest dopamine transporter (DAT) inhibition and sigma-1 receptor binding; clean receptor footprint without sedative or anticholinergic off-target blocks.",
    primaryTarget: "SERT (Reuptake Inhibitor)",
    bindings: [
      {
        receptor: "SERT",
        targetFamily: "Transporters",
        affinityKiNm: 0.29,
        affinityTier: "Sub-nanomolar",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Extremely high affinity ensures near-complete SERT occupancy at standard therapeutic doses (50-200 mg).",
      },
      {
        receptor: "DAT",
        targetFamily: "Transporters",
        affinityKiNm: 25.0,
        affinityTier: "High",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Mild dopaminergic reuptake inhibition aids motivational recovery, executive function, and energy.",
      },
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "No intrinsic 5-HT2A blockade; synaptic serotonin excess may induce sexual dysfunction or tremor.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Does not produce daytime somnolence or antihistaminic weight gain.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Free of anticholinergic memory encoding deficits and dry mouth.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "No orthostatic blood pressure depression.",
      },
    ],
    downstreamEffects: [
      "Robust antidepressant and anti-panic efficacy with favorable motivational recovery",
      "Frequent initial gastrointestinal disturbance ('squirtraline' diarrhea via enteric 5-HT3/5-HT4 activation)",
      "High incidence of treatment-emergent sexual dysfunction",
      "Safe cardiovascular profile in ischemic heart disease",
    ],
  },
  {
    drugId: "venlafaxine",
    drugName: "Venlafaxine",
    primaryClass: "Serotonin-Norepinephrine Reuptake Inhibitor (SNRI)",
    mechanismSummary:
      "Dose-dependent dual reuptake inhibitor: acts as a potent SERT inhibitor at lower doses (<150 mg/day), sequentially engaging NET inhibition at higher doses (>=150-225 mg/day) with minimal off-target receptor binding.",
    primaryTarget: "SERT / NET",
    bindings: [
      {
        receptor: "SERT",
        targetFamily: "Transporters",
        affinityKiNm: 14.0,
        affinityTier: "High",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "High-affinity SERT blockade mediates primary antidepressant and anxiolytic efficacy.",
      },
      {
        receptor: "NET",
        targetFamily: "Transporters",
        affinityKiNm: 1060.0,
        affinityTier: "Low",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Engaged progressively as serum concentrations rise at higher doses; delivers noradrenergic drive and pain relief.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Zero antihistaminic sedation or weight gain.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Spares central and peripheral cholinergic function.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "No alpha-1-mediated vasodilation or orthostasis.",
      },
    ],
    downstreamEffects: [
      "Dual antidepressant efficacy with neuropathic and somatic pain relief at higher doses",
      "Dose-dependent elevations in diastolic blood pressure and heart rate via noradrenergic tone",
      "High susceptibility to severe discontinuation syndrome ('brain zaps', dizziness, sensory shocks)",
      "Gastrointestinal nausea and sexual dysfunction common",
    ],
  },
  {
    drugId: "bupropion",
    drugName: "Bupropion",
    primaryClass: "Norepinephrine-Dopamine Reuptake Inhibitor (NDRI)",
    mechanismSummary:
      "Dual norepinephrine and dopamine reuptake inhibitor without serotonergic activity; non-competitive antagonist of nicotinic acetylcholine receptors; activating antidepressant that avoids sexual dysfunction and weight gain.",
    primaryTarget: "DAT / NET",
    bindings: [
      {
        receptor: "DAT",
        targetFamily: "Transporters",
        affinityKiNm: 520.0,
        affinityTier: "Low",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Moderate striatal DAT occupancy (~14-26%) enhances motivation, energy, and smoking cessation.",
      },
      {
        receptor: "NET",
        targetFamily: "Transporters",
        affinityKiNm: 1400.0,
        affinityTier: "Low",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Active metabolites (hydroxybupropion) exert potent noradrenergic reuptake inhibition in vivo.",
      },
      {
        receptor: "SERT",
        targetFamily: "Transporters",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Complete lack of serotonin reuptake inhibition explains zero incidence of serotonergic sexual dysfunction or weight gain.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Free of antihistaminic somnolence.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Spares muscarinic cholinergic receptors completely.",
      },
    ],
    downstreamEffects: [
      "Activating antidepressant profile that improves fatigue, anhedonia, and concentration",
      "Absence of sexual dysfunction; frequently used as antidote for SSRI-induced sexual blunting",
      "Weight neutral or produces modest weight loss; assists tobacco cessation",
      "Dose-dependent lowering of seizure threshold (contraindicated in eating disorders or epilepsy)",
    ],
  },
  {
    drugId: "amitriptyline",
    drugName: "Amitriptyline",
    primaryClass: "Tricyclic Antidepressant (Tertiary Amine TCA)",
    mechanismSummary:
      "Potent balanced SERT and NET reuptake inhibitor burdened by non-selective, high-affinity antagonism of H1, M1, and alpha-1 receptors; effective in depression and neuropathic pain but heavily burdened by anticholinergic and cardiotoxic liabilities.",
    primaryTarget: "SERT / NET / H1 / M1 / Alpha-1",
    bindings: [
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1.1,
        affinityTier: "High",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Profound, fast sedation and substantial orexigenic weight gain.",
      },
      {
        receptor: "SERT",
        targetFamily: "Transporters",
        affinityKiNm: 4.3,
        affinityTier: "High",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Potent inhibition of serotonin clearance drives antidepressant response.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 18.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Prototypic anticholinergic toxidrome: severe xerostomia, constipation, blurred vision, delirium risk in elderly.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 27.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Marked orthostatic hypotension, postural instability, and compensatory reflex tachycardia.",
      },
      {
        receptor: "NET",
        targetFamily: "Transporters",
        affinityKiNm: 35.0,
        affinityTier: "High",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Noradrenergic reuptake inhibition contributes to central analgesia in neuropathic pain syndromes.",
      },
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 24.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Promotes slow-wave sleep and assists in reducing anxiety.",
      },
    ],
    downstreamEffects: [
      "Broad antidepressant and neuropathic analgesia / migraine prophylaxis efficacy",
      "High incidence of dry mouth, severe constipation, urinary hesitancy, and cognitive slowing",
      "Orthostatic dizziness and daytime drowsiness",
      "Lethal in acute overdose due to cardiac sodium channel blockade causing QRS widening and fatal ventricular arrhythmias",
    ],
  },
  {
    drugId: "mirtazapine",
    drugName: "Mirtazapine",
    primaryClass: "Noradrenergic & Specific Serotonergic Antidepressant (NaSSA)",
    mechanismSummary:
      "Central presynaptic alpha-2 antagonist that disinhibits both serotonin and norepinephrine firing, combined with potent blockade of 5-HT2A, 5-HT2C, 5-HT3, and H1 receptors; rapidly induces sleep and stimulates appetite without reuptake inhibition or sexual dysfunction.",
    primaryTarget: "H1 / Alpha-2 / 5-HT2A / 5-HT2C / 5-HT3",
    bindings: [
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 0.14,
        affinityTier: "Sub-nanomolar",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Sub-nanomolar potency dominates low dosages (7.5-15 mg), provoking intense sedation and increased carbohydrate craving.",
      },
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 6.3,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Deepens slow-wave sleep, suppresses anxiety, and completely avoids serotonergic sexual dysfunction.",
      },
      {
        receptor: "5-HT3",
        targetFamily: "Serotonin",
        affinityKiNm: 7.9,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Acts as a potent antiemetic; prevents drug-induced nausea and promotes gastrointestinal comfort.",
      },
      {
        receptor: "5-HT2C",
        targetFamily: "Serotonin",
        affinityKiNm: 8.9,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Synergizes with H1 blockade to dramatically stimulate appetite, leading to substantial weight gain.",
      },
      {
        receptor: "Alpha-2",
        targetFamily: "Adrenergic",
        affinityKiNm: 20.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Blocks presynaptic auto- and heteroreceptors, boosting noradrenergic and serotonergic neurotransmission (prominent at >=30 mg).",
      },
      {
        receptor: "SERT",
        targetFamily: "Transporters",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Zero transporter reuptake inhibition.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 670.0,
        affinityTier: "Low",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Very weak antimuscarinic action; anticholinergic symptoms are minimal.",
      },
    ],
    downstreamEffects: [
      "Rapid onset of sedation and sleep architecture restoration, particularly at low bedtime doses",
      "Marked appetite stimulation and weight gain (useful in cachectic or underweight depression)",
      "Zero incidence of nausea (5-HT3 blockade) or sexual dysfunction (5-HT2A blockade)",
      "Higher doses (30-45 mg) recruit noradrenergic drive, frequently offsetting daytime grogginess",
    ],
  },
  {
    drugId: "escitalopram",
    drugName: "Escitalopram",
    primaryClass: "Selective Serotonin Reuptake Inhibitor (SSRI)",
    mechanismSummary:
      "The purest SSRI: pure S-enantiomer of citalopram binding allosterically and orthosterically to SERT with virtually zero affinity for histaminergic, muscarinic, or adrenergic receptors.",
    primaryTarget: "SERT (Reuptake Inhibitor)",
    bindings: [
      {
        receptor: "SERT",
        targetFamily: "Transporters",
        affinityKiNm: 1.1,
        affinityTier: "High",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Exquisite selectivity for the serotonin transporter yields predictable serotonergic amplification.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Free of antihistaminic sedation or weight gain.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Zero antimuscarinic memory or autonomic toxicity.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "No cardiovascular postural instability.",
      },
      {
        receptor: "DAT",
        targetFamily: "Transporters",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Zero dopaminergic reuptake inhibition.",
      },
    ],
    downstreamEffects: [
      "High therapeutic tolerability and predictable antidepressant/anxiolytic response",
      "Serotonergic side effects: initial nausea, headache, tremor",
      "High rate of delayed ejaculation or anorgasmia",
      "Low drug-drug interaction burden relative to other SSRIs",
    ],
  },
  {
    drugId: "duloxetine",
    drugName: "Duloxetine",
    primaryClass: "Serotonin-Norepinephrine Reuptake Inhibitor (SNRI)",
    mechanismSummary:
      "Balanced, high-affinity dual SERT and NET reuptake inhibitor effective in major depressive disorder, generalized anxiety, diabetic peripheral neuropathic pain, fibromyalgia, and chronic musculoskeletal pain.",
    primaryTarget: "SERT / NET",
    bindings: [
      {
        receptor: "SERT",
        targetFamily: "Transporters",
        affinityKiNm: 1.6,
        affinityTier: "High",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Potent serotonin transporter inhibition starting at minimum starting dose (30-60 mg).",
      },
      {
        receptor: "NET",
        targetFamily: "Transporters",
        affinityKiNm: 18.0,
        affinityTier: "High",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Substantial noradrenergic reuptake inhibition provides descending spinal pain inhibitory pathway activation.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Negligible sedation or weight liability.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Zero direct muscarinic blockade (sweating/urinary hesitancy is noradrenergically mediated).",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "No alpha-1-mediated postural hypotension.",
      },
    ],
    downstreamEffects: [
      "Robust dual efficacy in depression, generalized anxiety, and central neuropathic/chronic pain",
      "Noradrenergic side effects: diaphoresis, mild blood pressure/heart rate elevation, urinary hesitancy",
      "Initial gastrointestinal nausea and fatigue",
      "Significant withdrawal symptoms upon abrupt cessation",
    ],
  },

  // =========================================================================
  // SEDATIVES / ANXIOLYTICS (5 required + 1 extra)
  // =========================================================================
  {
    drugId: "clonazepam",
    drugName: "Clonazepam",
    primaryClass: "High-Potency Benzodiazepine",
    mechanismSummary:
      "Positive allosteric modulator (PAM) of ionotropic GABA-A receptors binding the benzodiazepine site; enhances GABA-mediated chloride conductance, hyperpolarizing neuronal membranes to deliver potent anxiolytic and anticonvulsant actions.",
    primaryTarget: "GABA-A (PAM)",
    bindings: [
      {
        receptor: "GABA-A",
        targetFamily: "Ionotropic / Amino Acid",
        affinityKiNm: 1.5,
        affinityTier: "High",
        functionalActivity: "PAM",
        clinicalSignificance: "Binds alpha-1, alpha-2, alpha-3, and alpha-5 subunit-containing GABA-A receptors, facilitating chloride influx.",
      },
      {
        receptor: "5-HT1A",
        targetFamily: "Serotonin",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "No direct serotonergic receptor occupancy.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Sedation is entirely GABA-A-mediated, not antihistaminergic.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "No antimuscarinic receptor antagonism.",
      },
    ],
    downstreamEffects: [
      "Rapid anxiolysis, panic disorder suppression, and anticonvulsant prophylaxis",
      "Sedation, psychomotor impairment, ataxia, and fall risk in vulnerable populations",
      "Development of physical dependence and tolerance with prolonged exposure",
      "Severe rebound anxiety and seizure risk upon abrupt discontinuation",
    ],
  },
  {
    drugId: "lorazepam",
    drugName: "Lorazepam",
    primaryClass: "Intermediate-Acting Benzodiazepine",
    mechanismSummary:
      "Non-selective GABA-A receptor positive allosteric modulator; delivers prompt anxiolysis, sedation, and seizure cessation with direct glucuronidation metabolism that is unaffected by hepatic CYP enzymes.",
    primaryTarget: "GABA-A (PAM)",
    bindings: [
      {
        receptor: "GABA-A",
        targetFamily: "Ionotropic / Amino Acid",
        affinityKiNm: 2.7,
        affinityTier: "High",
        functionalActivity: "PAM",
        clinicalSignificance: "Enhances GABA affinity and channel opening frequency across alpha-1/2/3/5 pentamers.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "No direct histaminergic blockade.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "No direct anticholinergic activity.",
      },
    ],
    downstreamEffects: [
      "First-line termination of status epilepticus and acute procedural anxiolysis",
      "Anterograde amnesia, somnolence, and psychomotor blunting",
      "Dependence and withdrawal liability with continued administration",
      "Clean metabolic profile sparing CYP oxidation (favorable in hepatic impairment)",
    ],
  },
  {
    drugId: "zolpidem",
    drugName: "Zolpidem",
    primaryClass: "Non-Benzodiazepine Z-Hypnotic (Imidazopyridine)",
    mechanismSummary:
      "Preferential positive allosteric modulator at the alpha-1 subunit of GABA-A receptors; delivers targeted hypnotic sleep induction with minimal anxiolytic, anticonvulsant, or muscle relaxant actions.",
    primaryTarget: "GABA-A Alpha-1 (PAM)",
    bindings: [
      {
        receptor: "GABA-A",
        targetFamily: "Ionotropic / Amino Acid",
        affinityKiNm: 19.0,
        affinityTier: "High",
        functionalActivity: "PAM",
        clinicalSignificance: "High selectivity for alpha-1 subunit pentamers confers rapid sleep induction while sparing alpha-2/3 anxiolytic circuits.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Free of antihistaminergic daytime hangover.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Zero anticholinergic burden.",
      },
    ],
    downstreamEffects: [
      "Shortens sleep onset latency with preservation of deep (slow-wave) sleep architecture",
      "Short elimination half-life (~2-3 hours) reduces morning residual drowsiness",
      "Risk of complex sleep behaviors (sleep-walking, sleep-driving, nocturnal eating)",
      "Next-day motor coordination impairment at higher doses or in slow metabolizers",
    ],
  },
  {
    drugId: "buspirone",
    drugName: "Buspirone",
    primaryClass: "Azapirone Anxiolytic",
    mechanismSummary:
      "High-affinity partial agonist at 5-HT1A receptors and moderate D2 antagonist; provides non-sedating, non-habit-forming generalized anxiolysis without GABA-A involvement, motor impairment, or withdrawal.",
    primaryTarget: "5-HT1A (Partial Agonist) / D2",
    bindings: [
      {
        receptor: "5-HT1A",
        targetFamily: "Serotonin",
        affinityKiNm: 15.0,
        affinityTier: "High",
        functionalActivity: "Partial Agonist",
        clinicalSignificance: "Acts as presynaptic autoreceptor agonist in raphe (reducing excess firing) and postsynaptic partial agonist in cortex/limbic system.",
      },
      {
        receptor: "D2",
        targetFamily: "Dopamine",
        affinityKiNm: 120.0,
        affinityTier: "Moderate",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Moderate D2/D3/D4 receptor blockade, insufficient to trigger EPS or prolactin release at therapeutic doses.",
      },
      {
        receptor: "GABA-A",
        targetFamily: "Ionotropic / Amino Acid",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "PAM",
        clinicalSignificance: "Completely devoid of GABA-A interaction; does not cause benzodiazepine-like sedation or physical addiction.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Zero antihistaminic sedation.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 250.0,
        affinityTier: "Low",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Weak peripheral alpha-1 binding; minimal orthostatic risk.",
      },
    ],
    downstreamEffects: [
      "Gradual relief of generalized anxiety symptoms over 2-4 weeks of scheduled administration",
      "Absence of sedation, cognitive clouding, psychomotor slowing, or respiratory depression",
      "Zero abuse liability, physiological dependence, or discontinuation rebound",
      "Transient dizziness, headache, and lightheadedness following doses",
    ],
  },
  {
    drugId: "hydroxyzine",
    drugName: "Hydroxyzine",
    primaryClass: "First-Generation Piperazine Antihistamine",
    mechanismSummary:
      "Potent central H1 inverse agonist with moderate 5-HT2A and alpha-1 antagonism; widely utilized for acute non-controlled relief of anxiety, insomnia, pruritus, and nausea.",
    primaryTarget: "H1 (Inverse Agonist)",
    bindings: [
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 2.0,
        affinityTier: "High",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Crosses the blood-brain barrier to produce potent, prompt central sedation and anxiolysis.",
      },
      {
        receptor: "5-HT2A",
        targetFamily: "Serotonin",
        affinityKiNm: 38.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Moderate 5-HT2A blockade contributes to sleep promotion and emotional calming.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 150.0,
        affinityTier: "Moderate",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Mild peripheral vasodilation and occasional postural lightheadedness.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 140.0,
        affinityTier: "Moderate",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Mild to moderate anticholinergic dry mouth and blurred vision.",
      },
      {
        receptor: "D2",
        targetFamily: "Dopamine",
        affinityKiNm: 370.0,
        affinityTier: "Low",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Weak dopamine blockade contributes to antiemetic and anti-vertigo properties.",
      },
    ],
    downstreamEffects: [
      "Rapid-onset anxiolysis and sedation without schedule IV controlled status or addiction risk",
      "Daytime somnolence, drowsiness, and psychomotor coordination slowing",
      "Mild anticholinergic dry mouth",
      "Antipruritic and antiemetic efficacy",
    ],
  },
  {
    drugId: "dexmedetomidine",
    drugName: "Dexmedetomidine",
    primaryClass: "Selective Alpha-2 Adrenergic Agonist",
    mechanismSummary:
      "Super-selective central alpha-2A adrenergic receptor agonist (alpha-2:alpha-1 selectivity ratio ~1600:1); induces unique 'cooperative' or arousable sedation and analgesia without ventilatory depression by quieting locus coeruleus noradrenergic pacemakers.",
    primaryTarget: "Alpha-2 (Agonist)",
    bindings: [
      {
        receptor: "Alpha-2",
        targetFamily: "Adrenergic",
        affinityKiNm: 1.1,
        affinityTier: "High",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Potent activation of presynaptic alpha-2A receptors in locus coeruleus shuts off noradrenergic output, mimicking natural NREM stage 3 sleep.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 1800.0,
        affinityTier: "Low",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Extremely weak alpha-1 engagement; high bolus concentrations may provoke transient initial peripheral vasoconstriction.",
      },
      {
        receptor: "GABA-A",
        targetFamily: "Ionotropic / Amino Acid",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "PAM",
        clinicalSignificance: "Zero GABA-A action; does not cause GABA-mediated respiratory suppression or delirium.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "Completely independent of histaminergic circuits.",
      },
    ],
    downstreamEffects: [
      "Arousable, cooperative sedation enabling clinical neurological checks in ICU/procedural settings",
      "Absence of clinically significant respiratory depression",
      "Hemodynamic bradycardia and dose-dependent systemic hypotension via central sympatholysis",
      "Significant opioid-sparing analgesia and shivering attenuation",
    ],
  },

  // =========================================================================
  // ANALGESICS (5 required + 3 extra)
  // =========================================================================
  {
    drugId: "morphine",
    drugName: "Morphine",
    primaryClass: "Natural Phenanthrene Opiate Analgesic",
    mechanismSummary:
      "Prototypical opioid analgesic acting as a high-affinity mu-opioid receptor (MOR) full agonist; produces profound analgesia and euphoria coupled with respiratory depression, constipation, and histamine release.",
    primaryTarget: "Mu-Opioid (MOR Full Agonist)",
    bindings: [
      {
        receptor: "Mu",
        targetFamily: "Opioid",
        affinityKiNm: 1.8,
        affinityTier: "High",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Activates Gi/o signaling to close N-type Ca2+ channels and open GIRK K+ channels, damping nociceptive transmission across spinal and supraspinal pathways.",
      },
      {
        receptor: "Kappa",
        targetFamily: "Opioid",
        affinityKiNm: 45.0,
        affinityTier: "Moderate",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Moderate kappa engagement provides spinal analgesic synergy but can contribute to dysphoric feelings.",
      },
      {
        receptor: "Delta",
        targetFamily: "Opioid",
        affinityKiNm: 90.0,
        affinityTier: "Moderate",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Contributes to analgesia and affective tolerance.",
      },
      {
        receptor: "NMDA",
        targetFamily: "Ionotropic / Amino Acid",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Channel Blocker",
        clinicalSignificance: "No direct NMDA channel blockade.",
      },
    ],
    downstreamEffects: [
      "Potent visceral and somatic analgesia and sedation",
      "Dose-dependent respiratory depression mediated by brainstem MOR centers",
      "Severe constipation via enteric nervous system MOR activation (minimal tolerance develops)",
      "Mast cell degranulation triggering peripheral histamine release (pruritus, flushing, hypotension)",
    ],
  },
  {
    drugId: "fentanyl",
    drugName: "Fentanyl",
    primaryClass: "Synthetic Phenylpiperidine Opioid",
    mechanismSummary:
      "Rapid-onset, highly lipophilic, ultra-potent mu-opioid receptor agonist (~50-100 times more potent than morphine); lacks histamine release and delivers intense perioperative and acute analgesia.",
    primaryTarget: "Mu-Opioid (MOR Full Agonist)",
    bindings: [
      {
        receptor: "Mu",
        targetFamily: "Opioid",
        affinityKiNm: 0.39,
        affinityTier: "Sub-nanomolar",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Sub-nanomolar affinity paired with extreme lipophilicity drives rapid CNS penetration and profound analgesia.",
      },
      {
        receptor: "Delta",
        targetFamily: "Opioid",
        affinityKiNm: 78.0,
        affinityTier: "Moderate",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Weak delta-opioid cross-talk.",
      },
      {
        receptor: "Kappa",
        targetFamily: "Opioid",
        affinityKiNm: 250.0,
        affinityTier: "Low",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Negligible kappa engagement at therapeutic concentrations.",
      },
    ],
    downstreamEffects: [
      "Ultra-rapid surgical and breakthrough analgesia with minimal cardiovascular depression",
      "Absence of mast cell histamine degranulation (minimal pruritus or bronchospasm compared to morphine)",
      "Sudden, life-threatening respiratory arrest and chest wall rigidity ('wooden chest') upon rapid IV bolus",
      "High potency confers acute overdose lethality, requiring high or repeated doses of naloxone",
    ],
  },
  {
    drugId: "buprenorphine",
    drugName: "Buprenorphine",
    primaryClass: "Semisynthetic Thebaine Partial Opioid Agonist",
    mechanismSummary:
      "High-affinity, slow-dissociating partial agonist at mu-opioid receptors and potent antagonist at kappa-opioid receptors; ceiling effect on respiratory depression provides an exceptional safety index in opioid use disorder and chronic pain.",
    primaryTarget: "Mu-Opioid (Partial Agonist) / Kappa (Antagonist)",
    bindings: [
      {
        receptor: "Mu",
        targetFamily: "Opioid",
        affinityKiNm: 0.21,
        affinityTier: "Sub-nanomolar",
        functionalActivity: "Partial Agonist",
        clinicalSignificance: "Sub-nanomolar affinity binds MOR tightly with very slow dissociation; displaces full agonists and hits a clinical ceiling on respiratory depression.",
      },
      {
        receptor: "Kappa",
        targetFamily: "Opioid",
        affinityKiNm: 1.5,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Potent kappa antagonism yields anti-aversive, mood-elevating, and anti-craving benefits.",
      },
      {
        receptor: "Delta",
        targetFamily: "Opioid",
        affinityKiNm: 8.0,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "High-affinity delta receptor blockade.",
      },
    ],
    downstreamEffects: [
      "Effective maintenance therapy for opioid use disorder and refractory chronic pain",
      "Ceiling effect on respiratory depression dramatically lowers fatal overdose mortality",
      "Severe precipitated withdrawal if administered to patients with circulating full MOR agonists",
      "Resistant to routine naloxone displacement due to exceptionally slow receptor dissociation kinetics",
    ],
  },
  {
    drugId: "ketamine",
    drugName: "Ketamine",
    primaryClass: "Arylcyclohexylamine Dissociative Anesthetic",
    mechanismSummary:
      "Non-competitive open-channel blocker of the ionotropic NMDA receptor (PCP site); triggers rapid synaptic plasticity and BDNF/mTOR release to deliver revolutionary rapid-acting antidepressant effects alongside dissociative anesthesia and analgesia.",
    primaryTarget: "NMDA Channel Blocker",
    bindings: [
      {
        receptor: "NMDA",
        targetFamily: "Ionotropic / Amino Acid",
        affinityKiNm: 650.0,
        affinityTier: "Low",
        functionalActivity: "Channel Blocker",
        clinicalSignificance: "Trapped within open pore of NMDA channels on GABAergic interneurons, causing cortical disinhibition, glutamate burst, and rapid synaptogenesis.",
      },
      {
        receptor: "Mu",
        targetFamily: "Opioid",
        affinityKiNm: 1100.0,
        affinityTier: "Low",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Very weak MOR agonism; contributes subtly to acute antinociception without driving classical opioid dependence.",
      },
      {
        receptor: "DAT",
        targetFamily: "Transporters",
        affinityKiNm: 1500.0,
        affinityTier: "Low",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Weak monoamine reuptake inhibition contributes to sympathomimetic blood pressure and pulse elevations.",
      },
      {
        receptor: "NET",
        targetFamily: "Transporters",
        affinityKiNm: 1800.0,
        affinityTier: "Low",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Noradrenergic reuptake inhibition increases sympathetic outflow.",
      },
      {
        receptor: "D2",
        targetFamily: "Dopamine",
        affinityKiNm: 500.0,
        affinityTier: "Low",
        functionalActivity: "Partial Agonist",
        clinicalSignificance: "Weak dopamine receptor interaction linked to psychotomimetic dissociative symptoms.",
      },
    ],
    downstreamEffects: [
      "Rapid (hours) reversal of suicidal ideation and treatment-resistant depressive symptoms",
      "Dose-dependent dissociative anesthesia with preserved airway reflexes and hemodynamic support",
      "Emergence phenomena: depersonalization, vivid dreaming, perceptual distortions, delirium",
      "Transient sympathomimetic rise in blood pressure and heart rate",
    ],
  },
  {
    drugId: "tramadol",
    drugName: "Tramadol",
    primaryClass: "Centrally Acting Synthetic Opioid / SNRI Analgesic",
    mechanismSummary:
      "Dual-action atypical analgesic: parent drug inhibits neuronal reuptake of serotonin and norepinephrine, while the active CYP2D6 metabolite (O-desmethyltramadol / M1) acts as a high-affinity mu-opioid receptor agonist.",
    primaryTarget: "SERT / NET / Mu-Opioid",
    bindings: [
      {
        receptor: "SERT",
        targetFamily: "Transporters",
        affinityKiNm: 530.0,
        affinityTier: "Low",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Parent drug inhibits 5-HT reuptake; risks serotonin toxicity when combined with SSRIs or MAOIs.",
      },
      {
        receptor: "NET",
        targetFamily: "Transporters",
        affinityKiNm: 790.0,
        affinityTier: "Low",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Inhibits noradrenergic reuptake, activating descending inhibitory pain pathways.",
      },
      {
        receptor: "Mu",
        targetFamily: "Opioid",
        affinityKiNm: 2400.0,
        affinityTier: "Low",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Parent drug has weak MOR affinity (Ki ~2.4 uM); M1 active metabolite possesses 300x higher affinity (Ki ~8 nM) driving opioid analgesia.",
      },
      {
        receptor: "5-HT2C",
        targetFamily: "Serotonin",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Negligible 5-HT2C binding.",
      },
    ],
    downstreamEffects: [
      "Moderate multimodal analgesia effective in mixed nociceptive and neuropathic pain syndromes",
      "Risk of serotonin syndrome when co-prescribed with serotonergic antidepressants or triptans",
      "Lowers seizure threshold, particularly in overdose or in susceptible patients",
      "Efficacy is genetically dependent on CYP2D6 metabolizer status (poor metabolizers lack adequate analgesia)",
    ],
  },
  {
    drugId: "methadone",
    drugName: "Methadone",
    primaryClass: "Synthetic Opioid & NMDA Receptor Antagonist",
    mechanismSummary:
      "High-affinity full mu-opioid agonist combined with clinically relevant non-competitive NMDA receptor antagonism and weak monoamine reuptake inhibition; prolonged elimination half-life makes it foundational in OUD maintenance and complex neuropathic pain.",
    primaryTarget: "Mu-Opioid / NMDA Channel Blocker",
    bindings: [
      {
        receptor: "Mu",
        targetFamily: "Opioid",
        affinityKiNm: 1.5,
        affinityTier: "High",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Suppresses opioid withdrawal and cravings over 24-36 hour dosing intervals.",
      },
      {
        receptor: "NMDA",
        targetFamily: "Ionotropic / Amino Acid",
        affinityKiNm: 850.0,
        affinityTier: "Low",
        functionalActivity: "Channel Blocker",
        clinicalSignificance: "NMDA blockade prevents and reverses central opioid tolerance and mitigates neuropathic hyperalgesia.",
      },
      {
        receptor: "SERT",
        targetFamily: "Transporters",
        affinityKiNm: 400.0,
        affinityTier: "Low",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Weak serotonin reuptake inhibition; potential contributor to serotonin syndrome in multi-drug regimens.",
      },
      {
        receptor: "NET",
        targetFamily: "Transporters",
        affinityKiNm: 600.0,
        affinityTier: "Low",
        functionalActivity: "Reuptake Inhibitor",
        clinicalSignificance: "Weak noradrenergic uptake inhibition.",
      },
    ],
    downstreamEffects: [
      "Smooth 24-hour suppression of opioid withdrawal without fluctuating peaks and valleys",
      "Superior neuropathic pain relief via combined MOR and NMDA receptor actions",
      "Substantial risk of cumulative sedation and delayed respiratory depression due to tissue accumulation (half-life 15-60 hours)",
      "Dose-dependent block of hERG cardiac potassium channels causing QTc prolongation and Torsades de Pointes",
    ],
  },
  {
    drugId: "oxycodone",
    drugName: "Oxycodone",
    primaryClass: "Semisynthetic Phenanthrene Opioid Analgesic",
    mechanismSummary:
      "Potent mu-opioid receptor full agonist with moderate kappa-opioid interaction; high oral bioavailability compared to morphine provides reliable oral analgesia for moderate to severe acute and cancer pain.",
    primaryTarget: "Mu-Opioid (MOR Full Agonist)",
    bindings: [
      {
        receptor: "Mu",
        targetFamily: "Opioid",
        affinityKiNm: 18.0,
        affinityTier: "High",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "High MOR selectivity mediates primary supraspinal and spinal analgesia and respiratory slowing.",
      },
      {
        receptor: "Kappa",
        targetFamily: "Opioid",
        affinityKiNm: 670.0,
        affinityTier: "Low",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Low affinity at kappa receptors; minimal dysphoric liability.",
      },
      {
        receptor: "Delta",
        targetFamily: "Opioid",
        affinityKiNm: 950.0,
        affinityTier: "Low",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Weak delta interaction.",
      },
    ],
    downstreamEffects: [
      "Reliable oral analgesia with predictable dose-response relationship",
      "Dose-dependent respiratory depression, sedation, and mental clouding",
      "Pronounced constipation and nausea during therapy initiation",
      "High physiological dependence and addiction liability",
    ],
  },

  // =========================================================================
  // CARDIOVASCULAR / AUTONOMIC (5 required + 1 extra)
  // =========================================================================
  {
    drugId: "propranolol",
    drugName: "Propranolol",
    primaryClass: "Non-Selective Beta-Adrenergic Receptor Blocker",
    mechanismSummary:
      "Prototypic non-selective beta-1 and beta-2 adrenergic antagonist with membrane-stabilizing activity and high lipophilicity; penetrates the blood-brain barrier to reduce sympathetic tremor, situational performance anxiety, and migraine frequency alongside cardiovascular rate control.",
    primaryTarget: "Beta-1 / Beta-2 Adrenergic",
    bindings: [
      {
        receptor: "Beta-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 1.8,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Cardiac beta-1 blockade decreases sinoatrial nodal rate, slows AV conduction, and lowers myocardial contractility and renin release.",
      },
      {
        receptor: "Beta-2",
        targetFamily: "Adrenergic",
        affinityKiNm: 0.8,
        affinityTier: "Sub-nanomolar",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Sub-nanomolar beta-2 blockade dampens skeletal muscle tremor and sympathetic hyperarousal; can precipitate severe bronchospasm in asthma.",
      },
      {
        receptor: "5-HT1A",
        targetFamily: "Serotonin",
        affinityKiNm: 60.0,
        affinityTier: "Moderate",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Weak central 5-HT1A/1B antagonism contributing to central autonomic calming.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Does not block alpha-1 receptors directly (unopposed alpha-1 vasoconstriction can occur in high adrenergic states).",
      },
    ],
    downstreamEffects: [
      "Negative chronotropy, negative inotropy, and lowered systemic arterial blood pressure",
      "Suppression of autonomic performance anxiety symptoms (palpitations, vocal and hand tremor, diaphoresis)",
      "Risk of fatal bronchoconstriction in patients with asthma or severe reactive airway disease",
      "Central fatigue, vivid dreams/nightmares, and masking of hypoglycemic tachycardia signs",
    ],
  },
  {
    drugId: "clonidine",
    drugName: "Clonidine",
    primaryClass: "Centrally Acting Alpha-2 Adrenergic Agonist",
    mechanismSummary:
      "Centrally acting partial/full alpha-2 adrenergic receptor agonist (alpha-2:alpha-1 selectivity ~220:1) with imidazoline I1 receptor affinity; dampens sympathetic outflow from the medulla to lower blood pressure, alleviate ADHD symptoms, and suppress autonomic opioid withdrawal.",
    primaryTarget: "Alpha-2 Adrenergic",
    bindings: [
      {
        receptor: "Alpha-2",
        targetFamily: "Adrenergic",
        affinityKiNm: 3.5,
        affinityTier: "High",
        functionalActivity: "Partial Agonist",
        clinicalSignificance: "Stimulates presynaptic alpha-2 receptors in the nucleus tractus solitarius, dramatically diminishing peripheral sympathetic outflow.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 770.0,
        affinityTier: "Low",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "High intravenous bolus doses can cause transient initial peripheral vasoconstriction via vascular alpha-1 stimulation.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "No direct antihistaminic activity; sedation is driven by central sympatholysis.",
      },
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Dry mouth is secondary to central sympathetic suppression of salivation rather than direct antimuscarinic blockade.",
      },
    ],
    downstreamEffects: [
      "Lowered peripheral vascular resistance, bradycardia, and reduction in systolic/diastolic blood pressure",
      "Suppression of autonomic hyperarousal in acute opioid withdrawal and PTSD nightmares",
      "Common central somnolence, fatigue, dizziness, and xerostomia",
      "Severe rebound hypertensive crisis upon abrupt cessation (catecholamine surge)",
    ],
  },
  {
    drugId: "prazosin",
    drugName: "Prazosin",
    primaryClass: "Selective Alpha-1 Adrenergic Antagonist",
    mechanismSummary:
      "Highly selective, competitive post-junctional alpha-1 adrenergic antagonist (alpha-1:alpha-2 selectivity >1000:1); causes arterial and venous dilation without reflex tachycardia (spares alpha-2 feedback), and crosses the blood-brain barrier to alleviate PTSD-associated nightmares.",
    primaryTarget: "Alpha-1 Adrenergic",
    bindings: [
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 0.25,
        affinityTier: "Sub-nanomolar",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Sub-nanomolar blockade of vascular and central alpha-1A/1B/1D receptors relaxes smooth muscle and dampens traumatic hyperarousal.",
      },
      {
        receptor: "Alpha-2",
        targetFamily: "Adrenergic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Leaves presynaptic alpha-2 receptors unblocked; avoids unopposed norepinephrine spillover and severe reflex tachycardia.",
      },
      {
        receptor: "Beta-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "No beta receptor blockade.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "No direct antihistaminergic activity.",
      },
    ],
    downstreamEffects: [
      "Vasodilation of resistance arterioles and capacitance veins, lowering blood pressure",
      "Reduction in trauma-related nightmares and sleep fragmentation in PTSD via central alpha-1 blockade",
      "Risk of 'first-dose phenomenon': severe orthostatic hypotension and syncope (mitigated by bedtime dosing)",
      "Nasal congestion and reflex fluid retention with chronic monotherapy",
    ],
  },
  {
    drugId: "atropine",
    drugName: "Atropine",
    primaryClass: "Belladonna Alkaloid Antimuscarinic Agent",
    mechanismSummary:
      "Classic non-selective competitive antagonist at all five muscarinic acetylcholine receptor subtypes (M1-M5); abolishes parasympathetic vagal braking on the heart and dries exocrine secretions, serving as first-line therapy for symptomatic bradycardia and organophosphate poisoning.",
    primaryTarget: "M1 / M2 / M3 / M4 / M5 Muscarinic",
    bindings: [
      {
        receptor: "M1",
        targetFamily: "Muscarinic",
        affinityKiNm: 1.1,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Blocks cortical and hippocampal M1 receptors, provoking confusion, delirium, and memory blunting at high doses.",
      },
      {
        receptor: "M2",
        targetFamily: "Muscarinic",
        affinityKiNm: 1.5,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Abolishes vagal parasympathetic inhibition of the sinoatrial node, accelerating heart rate and AV conduction in bradycardia.",
      },
      {
        receptor: "M3",
        targetFamily: "Muscarinic",
        affinityKiNm: 1.3,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Completely halts glandular secretions (saliva, sweat, bronchial mucus), paralyzes pupillary accommodation, causes urinary retention.",
      },
      {
        receptor: "H1",
        targetFamily: "Histamine",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Inverse Agonist",
        clinicalSignificance: "No direct histaminergic receptor blockade.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 1000.0,
        affinityTier: "Negligible",
        functionalActivity: "Antagonist",
        clinicalSignificance: "No adrenergic receptor blockade.",
      },
    ],
    downstreamEffects: [
      "Reversal of sinus bradycardia, sinoatrial arrest, and high-degree AV nodal blocks",
      "Complete drying of salivation, lacrimation, and respiratory tract secretions (useful preoperatively)",
      "Profound mydriasis (pupillary dilation) and cycloplegia (loss of near accommodation)",
      "Classic anticholinergic toxidrome at excessive doses: hyperthermia ('hot as a hare'), delirium ('mad as a hatter'), flush, xerostomia",
    ],
  },
  {
    drugId: "epinephrine",
    drugName: "Epinephrine",
    primaryClass: "Endogenous Catecholamine Sympathomimetic",
    mechanismSummary:
      "Potent non-selective direct agonist across all alpha and beta adrenergic receptors (alpha-1, alpha-2, beta-1, beta-2); the premier emergency rescue drug for anaphylaxis, cardiac arrest, and severe bronchospasm.",
    primaryTarget: "Beta-1 / Beta-2 / Alpha-1 Adrenergic",
    bindings: [
      {
        receptor: "Beta-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 5.0,
        affinityTier: "High",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Powerful positive inotropy, chronotropy, and dromotropy; dramatically elevates cardiac output and oxygen consumption.",
      },
      {
        receptor: "Beta-2",
        targetFamily: "Adrenergic",
        affinityKiNm: 15.0,
        affinityTier: "High",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Potent bronchial smooth muscle relaxation and inhibition of mast cell mediator release (life-saving in anaphylaxis).",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 30.0,
        affinityTier: "High",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Intense peripheral precapillary vasoconstriction restores systemic vascular resistance and reverses anaphylactic shock.",
      },
      {
        receptor: "Alpha-2",
        targetFamily: "Adrenergic",
        affinityKiNm: 25.0,
        affinityTier: "High",
        functionalActivity: "Full Agonist",
        clinicalSignificance: "Modulates sympathetic feedback and glucose regulation (suppresses insulin).",
      },
    ],
    downstreamEffects: [
      "Rapid reversal of laryngeal edema, bronchoconstriction, and circulatory collapse in acute anaphylaxis",
      "Restoration of spontaneous circulation in ventricular fibrillation, asystole, and PEA arrest",
      "Marked tachycardia, palpitations, tremor, severe anxiety, and diaphoresis",
      "Risk of severe hypertension, myocardial ischemia, and fatal ventricular arrhythmias at excessive doses",
    ],
  },
  {
    drugId: "carvedilol",
    drugName: "Carvedilol",
    primaryClass: "Non-Selective Beta-Blocker with Alpha-1 Blockade",
    mechanismSummary:
      "Third-generation vasodilating beta-blocker combining non-selective beta-1/beta-2 antagonism with competitive alpha-1 adrenergic blockade and antioxidant properties; proven mortality-reducing therapy in heart failure with reduced ejection fraction.",
    primaryTarget: "Beta-1 / Beta-2 / Alpha-1 Adrenergic",
    bindings: [
      {
        receptor: "Beta-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 1.2,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Protects failing myocardium from chronic hyper-adrenergic toxicity, reducing remodeling and sudden cardiac death.",
      },
      {
        receptor: "Beta-2",
        targetFamily: "Adrenergic",
        affinityKiNm: 1.4,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Non-selective beta blockade; caution advised in reactive airway disease.",
      },
      {
        receptor: "Alpha-1",
        targetFamily: "Adrenergic",
        affinityKiNm: 2.2,
        affinityTier: "High",
        functionalActivity: "Antagonist",
        clinicalSignificance: "Peripheral alpha-1 vasodilation reduces systemic vascular resistance (afterload) without reflex tachycardia.",
      },
    ],
    downstreamEffects: [
      "Improved left ventricular ejection fraction and long-term survival in congestive heart failure",
      "Balanced blood pressure reduction without reflex tachycardia",
      "Risk of orthostatic dizziness upon initiation due to combined alpha-1 vasodilation",
      "Potential bronchoconstriction in asthmatic patients",
    ],
  },
];

// Lookup index
const PROFILES_BY_ID = new Map<string, DrugReceptorProfile>(
  DRUG_RECEPTOR_PROFILES.map((p) => [p.drugId.toLowerCase(), p]),
);

/**
 * Returns the receptor binding profile for a specific drug by its drugId.
 */
export function getProfileForDrug(drugId: string): DrugReceptorProfile | null {
  if (!drugId) return null;
  return PROFILES_BY_ID.get(drugId.toLowerCase().trim()) ?? null;
}

/**
 * Returns all defined drug receptor profiles.
 */
export function getAllDrugProfiles(): readonly DrugReceptorProfile[] {
  return DRUG_RECEPTOR_PROFILES;
}

/**
 * Filters drug receptor profiles by primary class or broad therapeutic category.
 * If drugClass is "all" or blank, returns all profiles.
 */
export function filterProfilesByClass(drugClass: string): DrugReceptorProfile[] {
  if (!drugClass || drugClass.toLowerCase() === "all") {
    return [...DRUG_RECEPTOR_PROFILES];
  }

  const query = drugClass.toLowerCase().trim();
  return DRUG_RECEPTOR_PROFILES.filter((profile) => {
    const cls = profile.primaryClass.toLowerCase();
    if (cls.includes(query)) return true;

    // Mapping for common filter pills
    if (query === "antipsychotics" && cls.includes("antipsychotic")) return true;
    if (
      query === "antidepressants" &&
      (cls.includes("antidepressant") ||
        cls.includes("ssri") ||
        cls.includes("snri") ||
        cls.includes("ndri") ||
        cls.includes("tca") ||
        cls.includes("reuptake inhibitor"))
    ) {
      return true;
    }
    if (query === "opioids" && (cls.includes("opioid") || cls.includes("opiate"))) return true;
    if (
      query === "sedatives" &&
      (cls.includes("benzodiazepine") ||
        cls.includes("hypnotic") ||
        cls.includes("anxiolytic") ||
        cls.includes("antihistamine") ||
        cls.includes("alpha-2 adrenergic agonist"))
    ) {
      return true;
    }
    if (
      query === "autonomic" &&
      (cls.includes("adrenergic") ||
        cls.includes("antimuscarinic") ||
        cls.includes("sympathomimetic") ||
        cls.includes("beta-blocker"))
    ) {
      return true;
    }

    return false;
  });
}

/**
 * Searches drug receptor profiles across name, ID, class, mechanism, targets, and receptor bindings.
 */
export function searchProfiles(query: string): DrugReceptorProfile[] {
  if (!query || !query.trim()) {
    return [...DRUG_RECEPTOR_PROFILES];
  }

  const term = query.toLowerCase().trim();
  return DRUG_RECEPTOR_PROFILES.filter((p) => {
    if (p.drugName.toLowerCase().includes(term)) return true;
    if (p.drugId.toLowerCase().includes(term)) return true;
    if (p.primaryClass.toLowerCase().includes(term)) return true;
    if (p.primaryTarget.toLowerCase().includes(term)) return true;
    if (p.mechanismSummary.toLowerCase().includes(term)) return true;
    if (p.downstreamEffects.some((eff) => eff.toLowerCase().includes(term))) return true;
    if (p.bindings.some((b) => b.receptor.toLowerCase().includes(term) || b.clinicalSignificance.toLowerCase().includes(term))) return true;
    return false;
  });
}

export interface ReceptorComparisonEntry {
  receptor: string;
  targetFamily: ReceptorFamily;
  drug1Binding?: ReceptorBinding;
  drug2Binding?: ReceptorBinding;
  divergenceSummary: string;
}

export interface ProfileComparisonResult {
  drug1: DrugReceptorProfile | null;
  drug2: DrugReceptorProfile | null;
  sharedReceptors: string[];
  divergentReceptors: string[];
  comparisonTable: ReceptorComparisonEntry[];
  clinicalDivergenceNotes: string[];
}

/**
 * Compares two drug receptor profiles side-by-side, analyzing shared targets,
 * affinity tier differentials, and divergent clinical consequences.
 */
export function compareReceptorProfiles(
  drugId1: string,
  drugId2: string,
): ProfileComparisonResult {
  const profile1 = getProfileForDrug(drugId1);
  const profile2 = getProfileForDrug(drugId2);

  if (!profile1 || !profile2) {
    return {
      drug1: profile1,
      drug2: profile2,
      sharedReceptors: [],
      divergentReceptors: [],
      comparisonTable: [],
      clinicalDivergenceNotes: [
        !profile1 && !profile2
          ? "Neither drug profile was found in the database."
          : !profile1
            ? `Drug profile for '${drugId1}' was not found.`
            : `Drug profile for '${drugId2}' was not found.`,
      ],
    };
  }

  const bMap1 = new Map<string, ReceptorBinding>(profile1.bindings.map((b) => [b.receptor, b]));
  const bMap2 = new Map<string, ReceptorBinding>(profile2.bindings.map((b) => [b.receptor, b]));

  const allReceptorKeys = Array.from(new Set([...bMap1.keys(), ...bMap2.keys()]));

  const sharedReceptors: string[] = [];
  const divergentReceptors: string[] = [];
  const comparisonTable: ReceptorComparisonEntry[] = [];
  const clinicalDivergenceNotes: string[] = [];

  for (const rec of allReceptorKeys) {
    const b1 = bMap1.get(rec);
    const b2 = bMap2.get(rec);
    const targetInfo = RECEPTOR_TARGETS[rec];
    const family: ReceptorFamily = b1?.targetFamily || b2?.targetFamily || targetInfo?.family || "Dopamine";

    let divergenceSummary = "";

    if (b1 && b2) {
      sharedReceptors.push(rec);
      if (b1.affinityTier === b2.affinityTier && b1.functionalActivity === b2.functionalActivity) {
        divergenceSummary = `Both agents share ${b1.affinityTier.toLowerCase()} affinity (${b1.functionalActivity}).`;
      } else {
        divergentReceptors.push(rec);
        const ki1Text = b1.affinityKiNm !== undefined ? `Ki ${b1.affinityKiNm} nM` : b1.affinityTier;
        const ki2Text = b2.affinityKiNm !== undefined ? `Ki ${b2.affinityKiNm} nM` : b2.affinityTier;
        divergenceSummary = `${profile1.drugName}: ${ki1Text} (${b1.functionalActivity}) vs ${profile2.drugName}: ${ki2Text} (${b2.functionalActivity}).`;
      }
    } else if (b1 && !b2) {
      divergentReceptors.push(rec);
      divergenceSummary = `Selective for ${profile1.drugName} (${b1.affinityTier} ${b1.functionalActivity}); negligible/unbound in ${profile2.drugName}.`;
    } else if (!b1 && b2) {
      divergentReceptors.push(rec);
      divergenceSummary = `Selective for ${profile2.drugName} (${b2.affinityTier} ${b2.functionalActivity}); negligible/unbound in ${profile1.drugName}.`;
    }

    comparisonTable.push({
      receptor: rec,
      targetFamily: family,
      drug1Binding: b1,
      drug2Binding: b2,
      divergenceSummary,
    });
  }

  // Generate automated clinical divergence highlights
  // Check H1 sedation differences
  const h1_1 = bMap1.get("H1");
  const h1_2 = bMap2.get("H1");
  if ((h1_1?.affinityTier === "High" || h1_1?.affinityTier === "Sub-nanomolar") && (!h1_2 || h1_2.affinityTier === "Negligible" || h1_2.affinityTier === "Low")) {
    clinicalDivergenceNotes.push(
      `Sedation & Weight Divergence: ${profile1.drugName} exhibits potent H1 antagonism driving marked sedation and appetite stimulation, whereas ${profile2.drugName} largely spares H1 receptors.`,
    );
  } else if ((h1_2?.affinityTier === "High" || h1_2?.affinityTier === "Sub-nanomolar") && (!h1_1 || h1_1.affinityTier === "Negligible" || h1_1.affinityTier === "Low")) {
    clinicalDivergenceNotes.push(
      `Sedation & Weight Divergence: ${profile2.drugName} exhibits potent H1 antagonism driving marked sedation and appetite stimulation, whereas ${profile1.drugName} largely spares H1 receptors.`,
    );
  }

  // Check M1 anticholinergic differences
  const m1_1 = bMap1.get("M1");
  const m1_2 = bMap2.get("M1");
  if ((m1_1?.affinityTier === "High" || m1_1?.affinityTier === "Sub-nanomolar") && (!m1_2 || m1_2.affinityTier === "Negligible" || m1_2.affinityTier === "Low")) {
    clinicalDivergenceNotes.push(
      `Anticholinergic Burden: ${profile1.drugName} carries high M1 antimuscarinic affinity (dry mouth, constipation, memory blunting), whereas ${profile2.drugName} displays negligible anticholinergic liability.`,
    );
  } else if ((m1_2?.affinityTier === "High" || m1_2?.affinityTier === "Sub-nanomolar") && (!m1_1 || m1_1.affinityTier === "Negligible" || m1_1.affinityTier === "Low")) {
    clinicalDivergenceNotes.push(
      `Anticholinergic Burden: ${profile2.drugName} carries high M1 antimuscarinic affinity (dry mouth, constipation, memory blunting), whereas ${profile1.drugName} displays negligible anticholinergic liability.`,
    );
  }

  // Check D2 vs 5-HT2A (EPS liability)
  const d2_1 = bMap1.get("D2");
  const d2_2 = bMap2.get("D2");
  const ht2a_1 = bMap1.get("5-HT2A");
  const ht2a_2 = bMap2.get("5-HT2A");
  const d2_1_potent = d2_1?.affinityTier === "High" || d2_1?.affinityTier === "Sub-nanomolar";
  const d2_2_potent = d2_2?.affinityTier === "High" || d2_2?.affinityTier === "Sub-nanomolar";
  const ht2a_1_buffering = ht2a_1?.affinityTier === "High" || ht2a_1?.affinityTier === "Sub-nanomolar";
  const ht2a_2_buffering = ht2a_2?.affinityTier === "High" || ht2a_2?.affinityTier === "Sub-nanomolar";

  if (d2_1_potent && (!d2_2_potent || (ht2a_2_buffering && !ht2a_1_buffering))) {
    clinicalDivergenceNotes.push(
      `Motor Side Effect Liability: ${profile1.drugName} is characterized by tight D2 blockade without high-affinity 5-HT2A buffering, correlating with substantially higher extrapyramidal symptom (EPS) and hyperprolactinemia risks compared to ${profile2.drugName}.`,
    );
  } else if (d2_2_potent && (!d2_1_potent || (ht2a_1_buffering && !ht2a_2_buffering))) {
    clinicalDivergenceNotes.push(
      `Motor Side Effect Liability: ${profile2.drugName} is characterized by tight D2 blockade without high-affinity 5-HT2A buffering, correlating with substantially higher extrapyramidal symptom (EPS) and hyperprolactinemia risks compared to ${profile1.drugName}.`,
    );
  }

  // Check Alpha-1 orthostasis differences
  const a1_1 = bMap1.get("Alpha-1");
  const a1_2 = bMap2.get("Alpha-1");
  if ((a1_1?.affinityTier === "High" || a1_1?.affinityTier === "Sub-nanomolar") && (!a1_2 || a1_2.affinityTier === "Negligible" || a1_2.affinityTier === "Low")) {
    clinicalDivergenceNotes.push(
      `Orthostatic Risk: ${profile1.drugName} carries potent Alpha-1 blockade, conferring higher risk of initial orthostatic hypotension and dizziness compared to ${profile2.drugName}.`,
    );
  } else if ((a1_2?.affinityTier === "High" || a1_2?.affinityTier === "Sub-nanomolar") && (!a1_1 || a1_1.affinityTier === "Negligible" || a1_1.affinityTier === "Low")) {
    clinicalDivergenceNotes.push(
      `Orthostatic Risk: ${profile2.drugName} carries potent Alpha-1 blockade, conferring higher risk of initial orthostatic hypotension and dizziness compared to ${profile1.drugName}.`,
    );
  }

  // General note if no specific divergence was flagged
  if (clinicalDivergenceNotes.length === 0) {
    clinicalDivergenceNotes.push(
      `Receptor profiles diverge across ${divergentReceptors.length} target(s). Observe binding affinity Ki tiers to evaluate distinct clinical efficacy and tolerability profiles.`,
    );
  }

  return {
    drug1: profile1,
    drug2: profile2,
    sharedReceptors,
    divergentReceptors,
    comparisonTable,
    clinicalDivergenceNotes,
  };
}
