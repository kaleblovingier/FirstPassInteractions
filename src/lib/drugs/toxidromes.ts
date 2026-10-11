/**
 * Toxicological Toxidrome & Antidotal Mechanism Simulator Database
 *
 * Comprehensive pharmacological database modeling:
 * 1) 6 Classical Toxidromes:
 *    - Anticholinergic
 *    - Cholinergic (SLUDGEM / DUMBELS)
 *    - Opioid Triad
 *    - Sympathomimetic
 *    - Sedative-Hypnotic
 *    - Serotonergic (Hunter Criteria)
 * 2) 10 Molecular Antidote Mechanism Pathways:
 *    - N-acetylcysteine (NAC) for Acetaminophen
 *    - Hydroxocobalamin for Cyanide (CN-)
 *    - Sodium Bicarbonate (NaHCO3) for TCA Cardiotoxicity / Nav1.5
 *    - Pralidoxime (2-PAM) for Organophosphates / AChE
 *    - Atropine for Cholinergic Crisis / mAChR
 *    - Naloxone for Opioid Overdose / MOR
 *    - Digoxin Immune Fab (DigiFab) for Digoxin
 *    - Glucagon for Beta-Blocker & CCB Toxicity / GPCR Gs
 *    - High-Dose Insulin Euglycemia Therapy (HIET) for CCB / BB Shock
 *    - Intravenous Lipid Emulsion (ILE / "Lipid Sink") for Lipophilic Cardiotoxins
 * 3) Toxidrome Discriminator Matrix & Clinical Sign Diagnostic Matcher
 * 4) Desk Tray Integration Engine
 *
 * REGULATORY POSTURE (FD&C Act § 520(o)(1)(E)):
 * Non-device Clinical Decision Support software reference. This module provides
 * educational, non-prescriptive mechanistic explanations, molecular receptor
 * antagonism, cellular kinetics, and physiological restoration targets to enable
 * licensed healthcare professionals and students to independently analyze
 * acute toxicological presentations. It does not provide patient-specific dosing
 * directives, prescribing instructions, or automated diagnostic determinations.
 * Emergency toxicology management requires independent clinical assessment and
 * consultation with regional poison control centers (1-800-222-1222).
 */

import { DRUG_BY_ID } from "./catalog";

export const TOXIDROME_REGULATORY_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support Reference: This Toxicological Toxidrome & Antidotal Mechanism Simulator provides educational, non-prescriptive mechanistic explanations, receptor binding pharmacology, physiological restoration targets, and molecular antidote pathways for licensed healthcare professionals and supervised students. It is intended solely for educational analysis and independent clinical reasoning. It does not provide patient-specific dosing directives, treatment orders, or diagnostic determinations. Resuscitation, toxicology consultations (e.g., Regional Poison Control Center: 1-800-222-1222), and emergency clinical decisions remain the sole independent responsibility of licensed clinicians.";

export type ClassicalToxidromeId =
  | "anticholinergic"
  | "cholinergic"
  | "opioid"
  | "sympathomimetic"
  | "sedative-hypnotic"
  | "serotonergic";

export interface ToxidromeMnemonicItem {
  phrase: string;
  manifestation: string;
  physiologicalBasis: string;
}

export interface CausativeAgentGroup {
  name: string;
  drugIds: string[];
  mechanism: string;
  representativeExamples: string[];
}

export interface ToxidromeAntidoteSummary {
  name: string;
  antidotePathwayId?: string;
  antidoteDrugId?: string;
  mechanismSummary: string;
  centralVsPeripheral: string;
  clinicalPearls: string[];
  boxedWarningsOrContraindications: string[];
}

export interface ToxidromeSigns {
  vitals: {
    heartRate: string;
    bloodPressure: string;
    respiratoryRate: string;
    temperature: string;
  };
  pupils: string;
  skin: string;
  mucousMembranes: string;
  bowelSounds: string;
  urinaryBladder: string;
  neuromuscular: string;
  mentalStatus: string;
}

export interface ClassicalToxidrome {
  id: ClassicalToxidromeId;
  name: string;
  headlineSummary: string;
  classicalMnemonic: string;
  mnemonicItems: ToxidromeMnemonicItem[];
  pathophysiology: string;
  signs: ToxidromeSigns;
  keyDiscriminators: {
    feature: string;
    description: string;
    discriminatingComparison: string;
  }[];
  associatedDrugIds: string[];
  causativeAgentGroups: CausativeAgentGroup[];
  primaryAntidote: ToxidromeAntidoteSummary;
  adjunctiveManagement: string[];
  diagnosticPearls: string[];
  references: string[];
}

export const CLASSICAL_TOXIDROMES: readonly ClassicalToxidrome[] = [
  // 1) Anticholinergic
  {
    id: "anticholinergic",
    name: "Anticholinergic Toxidrome",
    headlineSummary:
      "Competitive blockade of postganglionic muscarinic acetylcholine receptors resulting in parasympathetic paralysis and central antimuscarinic delirium.",
    classicalMnemonic:
      "Blind as a bat, mad as a hatter, red as a beet, hot as a hare, dry as a bone, full as a flask",
    mnemonicItems: [
      {
        phrase: "Blind as a bat",
        manifestation: "Mydriasis (dilated pupils) & Cycloplegia (blurred near vision)",
        physiologicalBasis:
          "Blockade of M3 receptors on the pupillary sphincter pupillae (paralyzing pupillary constriction) and ciliary muscle.",
      },
      {
        phrase: "Mad as a hatter",
        manifestation: "Delirium, agitation, hallucinations, purposeless picking (carphologia)",
        physiologicalBasis:
          "Blockade of central M1 and M2 muscarinic receptors in the cerebral cortex, hippocampus, and basal forebrain.",
      },
      {
        phrase: "Red as a beet",
        manifestation: "Cutaneous flushing and erythematous skin",
        physiologicalBasis:
          "Compensatory cutaneous vasodilatation in skin capillary beds attempting to dissipate heat in the absence of functional sweating.",
      },
      {
        phrase: "Hot as a hare",
        manifestation: "Hyperthermia (frequently > 38.5–40°C)",
        physiologicalBasis:
          "Loss of evaporative cutaneous heat dissipation due to profound muscarinic sweat gland inhibition.",
      },
      {
        phrase: "Dry as a bone",
        manifestation: "Anhidrosis (bone dry skin, dry axillae) and severe xerostomia",
        physiologicalBasis:
          "Blockade of sympathetic cholinergic M3 receptors innervating eccrine sweat glands and salivary glands (the key discriminator vs sympathomimetic diaphoresis).",
      },
      {
        phrase: "Full as a flask",
        manifestation: "Urinary retention and bladder distension",
        physiologicalBasis:
          "Inhibition of M2/M3 receptors on the detrusor smooth muscle preventing bladder wall contraction, coupled with internal sphincter contraction.",
      },
    ],
    pathophysiology:
      "Anticholinergic agents competitively antagonize muscarinic acetylcholine receptors (M1 through M5). Peripheral muscarinic blockade paralyzes parasympathetic neuroeffector junctions across the eye, exocrine glands, heart, gastrointestinal tract, and genitourinary smooth muscle. Central nervous system penetration produces delirium, cognitive fragmentation, and psychotic agitation through disruption of cholinergic neurotransmission in ascending thalamocortical networks.",
    signs: {
      vitals: {
        heartRate: "Tachycardia (early, prominent; loss of vagal tone)",
        bloodPressure: "Normal to mild hypertension",
        respiratoryRate: "Normal to tachypnea",
        temperature: "Hyperthermia (can be extreme and life-threatening)",
      },
      pupils: "Mydriasis (dilated, unreactive or sluggishly reactive to light, cycloplegia)",
      skin: "Dry, erythematous, flushed, anhidrosis (dry axillae and groin folds)",
      mucousMembranes: "Dry, severe xerostomia, absent oral secretions",
      bowelSounds: "Hypoactive to completely absent (paralytic ileus)",
      urinaryBladder: "Urinary retention with palpable full bladder (globe vésicale)",
      neuromuscular: "Tremor, myoclonus, choreoathetoid picking, picking at imaginary clothing",
      mentalStatus:
        "Agitated delirium, auditory and visual hallucinations ('muttering delirium'), disorientation, fluctuating alertness",
    },
    keyDiscriminators: [
      {
        feature: "Anhidrosis (Dry Skin & Axillae)",
        description:
          "Skin and skin folds are bone dry despite elevated core temperature due to eccrine sweat gland muscarinic blockade.",
        discriminatingComparison:
          "Decisive discriminator vs Sympathomimetic toxicity, which presents with profuse diaphoresis and drenched skin.",
      },
      {
        feature: "Silent Bowel Sounds & Urinary Retention",
        description: "Profound smooth muscle atony of gut and detrusor.",
        discriminatingComparison:
          "Opposite of Cholinergic crisis (hyperactive peristalsis, defecation, urination) and Serotonergic toxicity.",
      },
    ],
    associatedDrugIds: ["atropine", "scopolamine", "diphenhydramine", "amitriptyline"],
    causativeAgentGroups: [
      {
        name: "Antimuscarinic Belladonna Alkaloids",
        drugIds: ["atropine", "scopolamine"],
        mechanism: "Direct competitive antagonism of muscarinic acetylcholine receptors.",
        representativeExamples: ["Atropine", "Scopolamine", "Hyoscyamine", "Datura stramonium (Jimson weed)"],
      },
      {
        name: "First-Generation H1 Antihistamines",
        drugIds: ["diphenhydramine"],
        mechanism: "Potent off-target competitive muscarinic receptor blockade.",
        representativeExamples: ["Diphenhydramine", "Doxylamine", "Hydroxyzine", "Chlorpheniramine"],
      },
      {
        name: "Tricyclic Antidepressants (TCAs)",
        drugIds: ["amitriptyline"],
        mechanism: "Potent muscarinic M1/M2 antagonism in addition to Nav1.5 and SERT/NET blockade.",
        representativeExamples: ["Amitriptyline", "Nortriptyline", "Imipramine", "Doxepin"],
      },
    ],
    primaryAntidote: {
      name: "Physostigmine",
      antidotePathwayId: "atropine-cholinergic",
      antidoteDrugId: "physostigmine",
      mechanismSummary:
        "Reversible tertiary amine carbamate acetylcholinesterase inhibitor that readily crosses the blood-brain barrier to restore central and peripheral acetylcholine levels.",
      centralVsPeripheral:
        "Crosses blood-brain barrier (tertiary amine) to reverse both central delirium and peripheral muscarinic signs.",
      clinicalPearls: [
        "Reserved for pure anticholinergic delirium refractory to supportive calming or when diagnostic confirmation is required.",
        "Contraindicated in TCA overdose with widened QRS or heart block due to risk of asystole and intractable seizures.",
      ],
      boxedWarningsOrContraindications: [
        "Do not administer in known or suspected tricyclic antidepressant overdose or cardiac conduction delay.",
        "Rapid push can precipitate cholinergic crisis, severe bradycardia, or seizures; keep atropine ready at bedside.",
      ],
    },
    adjunctiveManagement: [
      "Benzodiazepines for psychomotor agitation and delirium",
      "Active evaporative external cooling for hyperthermia",
      "Urinary bladder catheterization for urinary retention",
      "Continuous cardiac rhythm monitoring",
    ],
    diagnosticPearls: [
      "Check axillary vaults and groin folds: moist axillae rule against pure anticholinergic toxicity.",
      "Muttering delirium with fine picking movements (carphologia) is a classic behavioral signature.",
    ],
    references: [
      "Goldfrank's Toxicologic Emergencies, 11th Ed. Anticholinergic Agents.",
      "Dawson AH, Buckley NA. Pharmacological management of anticholinergic delirium. Br J Clin Pharmacol. 2016.",
    ],
  },

  // 2) Cholinergic
  {
    id: "cholinergic",
    name: "Cholinergic Toxidrome",
    headlineSummary:
      "Excessive accumulation of synaptic acetylcholine due to acetylcholinesterase inhibition or direct receptor agonism, causing muscarinic hypersecretion and nicotinic neuromuscular exhaustion.",
    classicalMnemonic:
      "SLUDGEM (Salivation, Lacrimation, Urination, Defecation, GI cramping, Emesis, Miosis) & DUMBELS (Defecation, Urination, Miosis, Bronchorrhea/Bronchospasm/Bradycardia, Emesis, Lacrimation, Salivation) + Nicotinic MTWTF (Mydriasis, Tachycardia, Weakness, Tremor, Fasciculations)",
    mnemonicItems: [
      {
        phrase: "Salivation / Sialorrhea",
        manifestation: "Profuse oral frothing and pooling saliva",
        physiologicalBasis: "M3 muscarinic hyperstimulation of submandibular and parotid salivary glands.",
      },
      {
        phrase: "Lacrimation",
        manifestation: "Continuous tearing and conjunctival weeping",
        physiologicalBasis: "M3 muscarinic stimulation of the lacrimal glands.",
      },
      {
        phrase: "Urination",
        manifestation: "Involuntary bladder emptying and urinary incontinence",
        physiologicalBasis: "M2/M3-mediated vigorous detrusor contraction and trigone relaxation.",
      },
      {
        phrase: "Defecation & Diarrhea",
        manifestation: "Severe diarrhea and tenesmus",
        physiologicalBasis: "M2/M3-mediated intense gastrointestinal hypermotility.",
      },
      {
        phrase: "GI cramping & Emesis",
        manifestation: "Violent abdominal cramps, vomiting, borborygmi",
        physiologicalBasis: "Hyperperistalsis and stimulation of the chemoreceptor trigger zone.",
      },
      {
        phrase: "Miosis & Ciliary Spasm",
        manifestation: "Pinpoint pupils and eye pain/cyclospasm",
        physiologicalBasis: "M3-mediated contraction of the sphincter pupillae and ciliary muscle.",
      },
      {
        phrase: "The Killer Bs (Bronchorrhea, Bronchospasm, Bradycardia)",
        manifestation: "Airway drowning, wheezing, severe sinus bradycardia/AV block",
        physiologicalBasis:
          "M3 tracheobronchial hypersecretion and smooth muscle constriction + M2 sinoatrial nodal hyperpolarization; the primary mechanism of mortality.",
      },
      {
        phrase: "Nicotinic Fasciculations & Weakness",
        manifestation: "Muscle twitches (eyelids, tongue, limbs) progressing to flaccid diaphragmatic paralysis",
        physiologicalBasis:
          "Persistent depolarization of nicotinic acetylcholine receptors (nAChR) at the neuromuscular junction resulting in depolarizing neuromuscular blockade.",
      },
    ],
    pathophysiology:
      "Inhibition of acetylcholinesterase (AChE) by organophosphates or carbamates blocks acetylcholine degradation, resulting in massive neurotransmitter accumulation at postganglionic parasympathetic synapses (muscarinic), autonomic ganglia (nicotinic), somatic motor endplates (nicotinic), and central synapses. Organophosphates phosphorylate AChE; over time, covalent dealkylation ('aging') renders the enzyme permanently inactivated.",
    signs: {
      vitals: {
        heartRate: "Bradycardia (muscarinic nodal inhibition) or initial tachycardia (nicotinic sympathetic ganglia)",
        bloodPressure: "Hypotension (severe muscarinic shock) or early hypertension",
        respiratoryRate: "Tachypnea with respiratory distress, progressing to bradypnea and central apnea",
        temperature: "Hypothermia or normal",
      },
      pupils: "Miosis (pinpoint, 1 mm, though early nicotinic excess can rarely produce mydriasis)",
      skin: "Diaphoretic, drenched in cold sweat, pale",
      mucousMembranes: "Copious oral secretions, frothing at mouth, rhinorrhea",
      bowelSounds: "Markedly hyperactive with loud borborygmi and involuntary watery diarrhea",
      urinaryBladder: "Urinary incontinence / spontaneous bladder evacuation",
      neuromuscular: "Fine muscle fasciculations (face, tongue, limbs), profound muscle weakness, flaccid paralysis",
      mentalStatus: "Restlessness, confusion, agitation, central respiratory depression, seizures, coma",
    },
    keyDiscriminators: [
      {
        feature: "The Killer Bs (Bronchorrhea, Bronchospasm, Bradycardia)",
        description:
          "Copious pulmonary fluid drowning the alveoli combined with severe bronchoconstriction and bradycardia.",
        discriminatingComparison:
          "Lethal hallmark unique to cholinergic crisis; demands immediate aggressive atropinization to clear pulmonary secretions.",
      },
      {
        feature: "Muscle Fasciculations & Motor Endplate Weakness",
        description: "Nicotinic overstimulation producing visible involuntary twitching followed by paralysis.",
        discriminatingComparison:
          "Differentiates from pure muscarinic toxicity and other diaphoresis causes like sympathomimetic or serotonergic.",
      },
    ],
    associatedDrugIds: ["malathion", "neostigmine", "pyridostigmine", "physostigmine", "rivastigmine"],
    causativeAgentGroups: [
      {
        name: "Organophosphate Insecticides",
        drugIds: ["malathion"],
        mechanism: "Irreversible covalent phosphorylation of acetylcholinesterase with time-dependent chemical aging.",
        representativeExamples: ["Malathion", "Parathion", "Chlorpyrifos", "Diazinon"],
      },
      {
        name: "Carbamate Acetylcholinesterase Inhibitors",
        drugIds: ["neostigmine", "pyridostigmine", "physostigmine", "rivastigmine"],
        mechanism: "Reversible carbamylation of acetylcholinesterase without chemical aging.",
        representativeExamples: ["Neostigmine", "Pyridostigmine", "Physostigmine", "Rivastigmine", "Aldicarb"],
      },
    ],
    primaryAntidote: {
      name: "Atropine + Pralidoxime (2-PAM)",
      antidotePathwayId: "pralidoxime-organophosphates",
      antidoteDrugId: "atropine",
      mechanismSummary:
        "Dual-mechanism restoration: Atropine competitively blocks muscarinic M1/M2/M3 receptors to clear pulmonary secretions, while Pralidoxime nucleophilically reactivates phosphorylated AChE before chemical aging.",
      centralVsPeripheral:
        "Atropine penetrates the CNS to treat central respiratory depression; Pralidoxime acts primarily at peripheral neuromuscular nicotinic junctions.",
      clinicalPearls: [
        "Titrate atropine to pulmonary endpoints: dry tracheobronchial secretions and clear lung fields, NOT pupil size alone.",
        "Initiate pralidoxime early prior to irreversible organophosphate dealkylation ('aging').",
      ],
      boxedWarningsOrContraindications: [
        "Never administer succinylcholine for intubation (metabolized by plasma butyrylcholinesterase; leads to prolonged paralysis).",
        "Pralidoxime given too rapidly can precipitate transient neuromuscular weakness and hypertension.",
      ],
    },
    adjunctiveManagement: [
      "Decontamination and personal protective equipment (PPE) for healthcare workers",
      "Aggressive airway suctioning and positive pressure ventilation",
      "Benzodiazepines for seizure control and central neuroprotection",
    ],
    diagnosticPearls: [
      "A patient presenting with pinpoint pupils, wet skin, wet lungs, and muscle twitching is in cholinergic crisis.",
      "Pupillary miosis can be masked in early toxicity by nicotinic ganglionic sympathetic drive.",
    ],
    references: [
      "Eddleston M, et al. Management of acute organophosphorus pesticide poisoning. Lancet. 2008.",
      "Hulse EJ, et al. Respiratory complications of organophosphorus nerve agent and insecticide poisoning. Crit Care. 2014.",
    ],
  },

  // 3) Opioid
  {
    id: "opioid",
    name: "Opioid Toxidrome",
    headlineSummary:
      "Mu-opioid receptor hyperactivation in brainstem respiratory centers and ascending arousal pathways producing the classic triad of central hypoventilation, miosis, and coma.",
    classicalMnemonic: "Classic Opioid Triad: CNS Depression / Coma, Miosis (Pinpoint Pupils), Respiratory Depression",
    mnemonicItems: [
      {
        phrase: "Respiratory Depression",
        manifestation: "Severe bradypnea (< 8–10 bpm), shallow tidal volume, periodic apnea",
        physiologicalBasis:
          "Mu-2 (MOR) receptor-mediated inhibition of the medullary pre-Bötzinger complex, blunting central hypercapnic and hypoxic ventilatory drive.",
      },
      {
        phrase: "Miosis",
        manifestation: "Symmetric pinpoint pupils (1–2 mm)",
        physiologicalBasis:
          "Disinhibition of the Edinger-Westphal nucleus in the midbrain, stimulating parasympathetic pupilloconstrictor fibers via the oculomotor nerve.",
      },
      {
        phrase: "CNS Depression / Coma",
        manifestation: "Somnolence progressing to unresponsiveness and coma",
        physiologicalBasis:
          "Mu and kappa receptor-mediated hyperpolarization of thalamocortical and ascending reticular activating system (ARAS) projection neurons.",
      },
      {
        phrase: "Hypothermia & Bradycardia",
        manifestation: "Core hypothermia, peripheral vasodilation, sinus bradycardia",
        physiologicalBasis:
          "Hypothalamic thermoregulatory set-point depression coupled with central vagotonic parasympathetic activation and histamine-mediated vasodilatation.",
      },
    ],
    pathophysiology:
      "Opioids bind G-protein coupled mu (MOR), kappa (KOR), and delta (DOR) receptors (Gi/o). Activation inhibits adenylyl cyclase, closes voltage-gated N-type calcium channels, and opens G-protein inwardly rectifying potassium channels (GIRK), hyperpolarizing neurons. In the brainstem, this selectively silences autonomous respiratory pacemaking in the pre-Bötzinger complex, leading to respiratory acidosis, hypoxemia, and secondary cardiac arrest.",
    signs: {
      vitals: {
        heartRate: "Bradycardia",
        bloodPressure: "Hypotension",
        respiratoryRate: "Severe bradypnea (< 8–10 breaths/min), shallow tidal volume, periodic apnea",
        temperature: "Hypothermia (environmental exposure and blunted heat generation)",
      },
      pupils: "Miosis (pinpoint, 1–2 mm; caveat: meperidine, propoxyphene, or severe anoxic brain injury can cause mydriasis)",
      skin: "Cool, pale, clammy or cyanotic, dry (or diaphoresis secondary to terminal hypoxemia)",
      mucousMembranes: "Normal to dry",
      bowelSounds: "Hypoactive to completely absent (profound opioid bowel immobility)",
      urinaryBladder: "Urinary retention (increased detrusor compliance and internal sphincter tone)",
      neuromuscular: "Flaccid muscle tone, generalized hyporeflexia, jaw relaxation, loss of gag reflex",
      mentalStatus: "Stupor, profound somnolence, unresponsiveness, coma",
    },
    keyDiscriminators: [
      {
        feature: "Pinpoint Pupils + Severe Bradypnea (< 8 bpm)",
        description:
          "Direct selective suppression of medullary respiratory rhythmogenesis accompanied by intense parasympathetic pupilloconstriction.",
        discriminatingComparison:
          "Contrasts with Sedative-Hypnotic overdose where pupils are typically midposition and respiratory rate is less depressed at equivalent sedation depth.",
      },
    ],
    associatedDrugIds: ["morphine", "oxycodone", "fentanyl", "methadone"],
    causativeAgentGroups: [
      {
        name: "Natural & Semi-Synthetic Opioids",
        drugIds: ["morphine", "oxycodone"],
        mechanism: "Direct mu-opioid receptor agonism.",
        representativeExamples: ["Morphine", "Oxycodone", "Hydromorphone", "Hydrocodone", "Heroin"],
      },
      {
        name: "Potent Synthetic Opioids",
        drugIds: ["fentanyl"],
        mechanism: "Ultra-potent mu-opioid receptor agonism with rapid central penetration and chest wall rigidity risk.",
        representativeExamples: ["Fentanyl", "Sufentanil", "Carfentanil", "Nitazene analogues"],
      },
      {
        name: "Long-Acting Opioids",
        drugIds: ["methadone"],
        mechanism: "Prolonged mu-opioid agonism with slow terminal elimination half-life and hERG QT prolongation.",
        representativeExamples: ["Methadone", "Buprenorphine"],
      },
    ],
    primaryAntidote: {
      name: "Naloxone",
      antidotePathwayId: "naloxone-opioid",
      antidoteDrugId: "naloxone",
      mechanismSummary:
        "Pure competitive antagonist displacing agonists from mu, kappa, and delta opioid receptors, promptly restoring ventilatory drive.",
      centralVsPeripheral:
        "Rapidly crosses the blood-brain barrier to restore central medullary respiratory drive within 1–2 minutes.",
      clinicalPearls: [
        "Therapeutic objective is restoration of spontaneous ventilation and airway patency, NOT full patient wakefulness.",
        "Over-titration precipitates acute withdrawal storm with agitation, vomiting, and pulmonary edema.",
        "Monitor for renarcotization: naloxone's half-life (30–90 min) is shorter than many synthetic opioids or methadone.",
      ],
      boxedWarningsOrContraindications: [
        "Precipitation of acute opioid withdrawal in opioid-dependent patients.",
        "Does not reverse non-opioid sedatives such as xylazine or benzodiazepines co-ingested in contaminated street supplies.",
      ],
    },
    adjunctiveManagement: [
      "Bag-valve-mask manual ventilation with supplemental oxygen",
      "Airway positioning and suctioning",
      "Prolonged clinical surveillance for renarcotization",
    ],
    diagnosticPearls: [
      "A respiratory rate under 8–10 in an unarousable patient with pinpoint pupils warrants immediate ventilatory support and naloxone consideration.",
      "Severe cerebral hypoxia from prolonged apnea can produce bilateral dilated, unreactive pupils mimicking brain death.",
    ],
    references: [
      "Boyer EW. Management of opioid analgesic overdose. N Engl J Med. 2012.",
      "Kim HK, Nelson LS. Reducing the harm of opioid overdose with naloxone. Clin Pharmacol Ther. 2015.",
    ],
  },

  // 4) Sympathomimetic
  {
    id: "sympathomimetic",
    name: "Sympathomimetic Toxidrome",
    headlineSummary:
      "Excessive stimulation of alpha- and beta-adrenergic receptors and massive central catecholamine release driving a hyperdynamic, hypermetabolic state.",
    classicalMnemonic: "Hyperadrenergic Storm: Tachycardia, Hypertension, Hyperthermia, Mydriasis, DIAPHORESIS",
    mnemonicItems: [
      {
        phrase: "Tachycardia & Dysrhythmias",
        manifestation: "Marked sinus tachycardia (> 110–140 bpm), SVT, ventricular ectopy",
        physiologicalBasis: "Beta-1 adrenergic stimulation of the sinoatrial node and ventricular myocardium.",
      },
      {
        phrase: "Severe Hypertension",
        manifestation: "Systolic BP often > 180–220 mmHg, widened pulse pressure",
        physiologicalBasis:
          "Alpha-1 adrenergic vasoconstriction of peripheral resistance arterioles coupled with beta-1 inotropy.",
      },
      {
        phrase: "Hyperthermia",
        manifestation: "Elevated core body temperature (> 38.5–40°C)",
        physiologicalBasis:
          "Intense metabolic heat production from motor agitation, tremor, uncoupled oxidative metabolism, and cutaneous vasoconstriction.",
      },
      {
        phrase: "Mydriasis",
        manifestation: "Dilated pupils (reactive to bright light)",
        physiologicalBasis: "Alpha-1 adrenergic contraction of the pupillary dilator muscle.",
      },
      {
        phrase: "DIAPHORESIS (Drenched in Sweat)",
        manifestation: "Profuse sweating, soaked clothing, drenched axillae",
        physiologicalBasis:
          "Sympathetic postganglionic cholinergic stimulation of eccrine sweat glands (the key discriminator vs anticholinergic anhidrosis).",
      },
      {
        phrase: "Agitation & Psychosis",
        manifestation: "Hypervigilance, paranoia, formication ('cocaine bugs'), violent delirium",
        physiologicalBasis:
          "Central dopaminergic and noradrenergic excess in the mesolimbic and prefrontal networks.",
      },
    ],
    pathophysiology:
      "Sympathomimetic agents increase synaptic concentrations of endogenous catecholamines (norepinephrine, epinephrine, dopamine) by blocking monoamine reuptake transporters (NET, DAT, SERT), promoting vesicular release via VMAT2 reversal, or directly stimulating alpha and beta adrenoceptors. Central sympathetic outflow induces uninhibited autonomic hyperactivity, end-organ ischemia, and rhabdomyolysis.",
    signs: {
      vitals: {
        heartRate: "Marked tachycardia (> 110–150 bpm, tachyarrhythmias)",
        bloodPressure: "Marked hypertension (systolic frequently > 180–220 mmHg)",
        respiratoryRate: "Tachypnea, hyperpnea",
        temperature: "Hyperthermia (risk of malignant hyperpyrexia > 40°C)",
      },
      pupils: "Mydriasis (dilated, typically reactive to light)",
      skin: "Profusely diaphoretic (sweat-drenched, warm, clammy)",
      mucousMembranes: "Normal to dry (secondary to hyperventilation and dehydration)",
      bowelSounds: "Hyperactive to normal (active peristalsis)",
      urinaryBladder: "Normal to increased internal sphincter tone",
      neuromuscular: "Tremor, hyperreflexia, bruxism, motor restlessness, myoclonus, seizures, rhabdomyolysis",
      mentalStatus: "Agitation, intense paranoia, acute toxic psychosis, combativeness, delirium",
    },
    keyDiscriminators: [
      {
        feature: "Profuse Diaphoresis (Sweating) with Mydriasis",
        description:
          "Eccrine sweat glands are heavily stimulated by sympathetic activation, leaving the patient drenched in sweat.",
        discriminatingComparison:
          "The critical discriminator distinguishing sympathomimetic toxicity from anticholinergic toxicity (which has bone dry skin and anhidrosis).",
      },
      {
        feature: "Active / Hyperactive Bowel Sounds",
        description: "Bowel sounds remain present and frequently hyperactive.",
        discriminatingComparison: "Contrasts with the quiet or absent bowel sounds of anticholinergic ileus.",
      },
    ],
    associatedDrugIds: ["cocaine", "amphetamine", "methamphetamine", "mdma"],
    causativeAgentGroups: [
      {
        name: "Cocaine & Local Anesthetic Blocker",
        drugIds: ["cocaine"],
        mechanism: "Inhibition of NET and DAT reuptake plus local anesthetic fast Nav channel blockade.",
        representativeExamples: ["Cocaine (hydrochloride and crack freebase)"],
      },
      {
        name: "Amphetamines & Methamphetamine",
        drugIds: ["amphetamine", "methamphetamine"],
        mechanism: "VMAT2 reversal, stimulating massive non-exocytotic monoamine dumping into synaptic clefts.",
        representativeExamples: ["Dextroamphetamine", "Methamphetamine", "Methylphenidate"],
      },
      {
        name: "Ring-Substituted Amphetamines (Entactogens)",
        drugIds: ["mdma"],
        mechanism: "Potent serotonin and dopamine release with SIADH and hyperthermia risk.",
        representativeExamples: ["MDMA (Ecstasy / Molly)", "MDA"],
      },
    ],
    primaryAntidote: {
      name: "Benzodiazepines + Active Cooling",
      antidotePathwayId: "sodium-bicarbonate-tca",
      antidoteDrugId: "diazepam",
      mechanismSummary:
        "Positive allosteric modulation of GABA-A receptors, potentiating inhibitory chloride currents to blunt central sympathetic storm, terminate seizures, and restore hemodynamic stability.",
      centralVsPeripheral:
        "Acts centrally within the neuro-axis to suppress sympathetic outflow; active cooling restores peripheral thermal homeostasis.",
      clinicalPearls: [
        "Benzodiazepines are the frontline pharmacotherapy for tachycardia, hypertension, and hyperthermia driven by sympathomimetic storm.",
        "Avoid pure beta-blockers (e.g., propranolol) in acute cocaine/amphetamine toxicity due to risk of unopposed alpha-1 vasoconstriction.",
      ],
      boxedWarningsOrContraindications: [
        "Pure beta-blockade without alpha-blockade can worsen coronary vasospasm and paradoxical hypertensive crisis.",
      ],
    },
    adjunctiveManagement: [
      "Rapid external cooling (evaporative spray with fans, ice packs, ice-water immersion for temp > 39.5°C)",
      "Intravenous crystalloid fluid resuscitation for volume depletion and rhabdomyolysis prevention",
      "Direct vasodilators (e.g., nitroglycerin, nitroprusside, or phentolamine) for refractory severe hypertension",
      "Sodium bicarbonate for wide-complex dysrhythmias if cocaine local anesthetic sodium-channel blockade is suspected",
    ],
    diagnosticPearls: [
      "If the patient is agitated, tachycardic, hyperthermic, and sweating profusely: think sympathomimetic (or serotonergic). If bone dry: think anticholinergic.",
      "Check serum creatine kinase (CK) and urinalysis for myoglobinuria to catch early rhabdomyolysis.",
    ],
    references: [
      "Richards JR, et al. Treatment of cocaine cardiotoxicity with benzodiazepines. Circulation. 2010.",
      "Bozzo P, et al. Amphetamine and methamphetamine toxicity. Emerg Med Clin North Am. 2014.",
    ],
  },

  // 5) Sedative-Hypnotic
  {
    id: "sedative-hypnotic",
    name: "Sedative-Hypnotic Toxidrome",
    headlineSummary:
      "Potentiation of inhibitory GABAergic neurotransmission or depression of excitatory glutamate signaling, resulting in progressive generalized CNS and autonomic depression.",
    classicalMnemonic: "Generalized CNS Depression: Slurred Speech, Ataxia, Stupor, Normal/Midposition Pupils",
    mnemonicItems: [
      {
        phrase: "CNS Depression",
        manifestation: "Progressive lethargy, somnolence, stupor, and unarousable coma",
        physiologicalBasis:
          "Positive allosteric modulation of GABA-A receptor chloride channels, increasing membrane hyperpolarization across the cerebral cortex and reticular formation.",
      },
      {
        phrase: "Ataxia & Dysarthria",
        manifestation: "Gait unsteadiness, incoordination, and slurred speech",
        physiologicalBasis:
          "Inhibition of cerebellar Purkinje cell signaling and vestibular nuclei GABAergic modulation.",
      },
      {
        phrase: "Midposition Pupils",
        manifestation: "Pupils remain normal size or midposition and sluggishly reactive",
        physiologicalBasis:
          "Relative preservation of autonomic balance at the pupillary sphincter and dilator muscles (differentiates from opioid pinpoint pupils).",
      },
      {
        phrase: "Depressed / Preserved Vitals",
        manifestation: "Mild hypotension, mild bradycardia, normal or mildly decreased respiratory rate",
        physiologicalBasis:
          "Depression of autonomic outflow; in isolated oral benzodiazepine overdose, respiratory drive is remarkably preserved compared to opioids.",
      },
    ],
    pathophysiology:
      "Sedative-hypnotics (benzodiazepines, barbiturates, Z-drugs, ethanol) bind specific allosteric sites on the pentameric GABA-A receptor complex. Benzodiazepines increase chloride channel opening frequency; barbiturates increase opening duration and directly gate the channel at high concentrations. This influx of chloride ions hyperpolarizes post-synaptic neuronal membranes, dampening excitability across cortical, subcortical, and cerebellar pathways.",
    signs: {
      vitals: {
        heartRate: "Normal to mild bradycardia",
        bloodPressure: "Normal to mild hypotension",
        respiratoryRate: "Normal to mild bradypnea (shallow; severe depression when co-ingested with alcohol/opioids)",
        temperature: "Normal to hypothermia",
      },
      pupils: "Normal to midposition, sluggishly reactive to light (not pinpoint)",
      skin: "Normal, dry, pale",
      mucousMembranes: "Normal",
      bowelSounds: "Hypoactive to normal",
      urinaryBladder: "Normal to mild retention",
      neuromuscular: "Ataxia, dysmetria, dysarthria, nystagmus, generalized hypotonia, hyporeflexia (no clonus)",
      mentalStatus:
        "Somnolence, confusion, lethargy, stupor, coma with preservation of spontaneous respiratory efforts in isolated ingestions",
    },
    keyDiscriminators: [
      {
        feature: "Coma with Midposition Pupils & Preserved Spontaneous Breathing",
        description:
          "Unresponsive state with normal-sized pupils, lack of severe bradypnea (in isolated ingestions), and absence of clonus or diaphoresis.",
        discriminatingComparison:
          "Contrasts sharply with Opioids (pinpoint pupils and bradypnea < 8) and Serotonergic/Sympathomimetic toxicity (hyperdynamic vitals, agitation, clonus, diaphoresis).",
      },
    ],
    associatedDrugIds: [
      "diazepam",
      "lorazepam",
      "alprazolam",
      "clonazepam",
      "phenobarbital",
      "zolpidem",
      "ethanol",
    ],
    causativeAgentGroups: [
      {
        name: "Benzodiazepines",
        drugIds: ["diazepam", "lorazepam", "alprazolam", "clonazepam"],
        mechanism: "Allosteric modulation of GABA-A receptor, increasing chloride channel opening frequency.",
        representativeExamples: ["Diazepam", "Lorazepam", "Alprazolam", "Clonazepam", "Midazolam"],
      },
      {
        name: "Barbiturates",
        drugIds: ["phenobarbital"],
        mechanism: "Prolongs GABA-A channel open duration; directly gates chloride channel at elevated concentrations.",
        representativeExamples: ["Phenobarbital", "Butalbital", "Secobarbital"],
      },
      {
        name: "Non-Benzodiazepine Imidazopyridines (Z-Drugs)",
        drugIds: ["zolpidem"],
        mechanism: "Selective agonism at the alpha-1 subunit of the GABA-A receptor.",
        representativeExamples: ["Zolpidem", "Zaleplon", "Eszopiclone"],
      },
      {
        name: "Alcohols",
        drugIds: ["ethanol"],
        mechanism: "GABA-A facilitation, NMDA receptor antagonism, and membrane fluidity disruption.",
        representativeExamples: ["Ethanol", "Isopropanol"],
      },
    ],
    primaryAntidote: {
      name: "Flumazenil",
      antidotePathwayId: "naloxone-opioid",
      antidoteDrugId: "flumazenil",
      mechanismSummary:
        "Competitive antagonist at the benzodiazepine recognition site on the GABA-A receptor complex, displacing agonists and reversing sedation.",
      centralVsPeripheral:
        "Centrally active competitive antagonist reversing benzodiazepine-induced cortical and reticular sedation.",
      clinicalPearls: [
        "Not recommended for undifferentiated coma or mixed overdoses due to boxed warning for intractable withdrawal seizures.",
        "Appropriate for isolated iatrogenic procedural oversedation in benzodiazepine-naive patients.",
      ],
      boxedWarningsOrContraindications: [
        "Boxed Warning: Can precipitate life-threatening, refractory withdrawal seizures and ventricular arrhythmias in patients tolerant to benzodiazepines or co-ingesting proconvulsant agents (TCAs).",
        "Contraindicated in suspected TCA overdose, seizure history, or chronic benzodiazepine dependence.",
      ],
    },
    adjunctiveManagement: [
      "Airway protection and recovery positioning",
      "Urinary alkalinization (urine pH 7.5–8.0) for phenobarbital via ion trapping",
      "Supportive mechanical ventilation if mixed ingestion precipitates hypercapnic respiratory failure",
    ],
    diagnosticPearls: [
      "Isolated oral benzodiazepine overdoses are rarely fatal unless combined with other respiratory depressants (alcohol, opioids).",
      "Nystagmus, dysarthria, and ataxia in an awake patient point to sedative-hypnotic or ethanol intoxication.",
    ],
    references: [
      "Weinbroum AA, et al. Flumazenil in acute benzodiazepine intoxication. Ann Emerg Med. 1997.",
      "Sivilotti ML. Flumazenil, naloxone and the 'coma cocktail'. Br J Clin Pharmacol. 2016.",
    ],
  },

  // 6) Serotonergic
  {
    id: "serotonergic",
    name: "Serotonergic Toxidrome (Serotonin Toxicity)",
    headlineSummary:
      "Hyperstimulation of central and peripheral serotonin receptors (predominantly 5-HT2A and 5-HT1A) presenting with the classic triad of neuromuscular hyperactivity, autonomic instability, and altered mental status.",
    classicalMnemonic:
      "Hunter Serotonin Toxicity Criteria: Clonus (Spontaneous, Inducible, Ocular), Tremor, Hyperreflexia, Hyperthermia",
    mnemonicItems: [
      {
        phrase: "Spontaneous Clonus",
        manifestation: "Rhythmic, continuous involuntary muscle contractions at rest",
        physiologicalBasis:
          "Massive 5-HT2A and 5-HT1A spinal cord motor neuron hyperexcitability; diagnostic on its own under the Hunter Criteria in the presence of a serotonergic agent.",
      },
      {
        phrase: "Inducible Clonus + Agitation / Diaphoresis",
        manifestation: "Evoked sustained rhythmic beats of ankle or wrist dorsiflexion",
        physiologicalBasis:
          "Lower motor neuron disinhibition accompanied by autonomic hyperstimulation.",
      },
      {
        phrase: "Ocular Clonus + Agitation / Diaphoresis",
        manifestation: "Continuous rhythmic horizontal and pendular nystagmoid eye movements ('ping-pong gaze')",
        physiologicalBasis:
          "Serotonergic hyperstimulation of the abducens nuclei and paramedian pontine reticular formation.",
      },
      {
        phrase: "Tremor + Hyperreflexia",
        manifestation: "Symmetric intention tremor and brisk deep tendon reflexes (lower > upper extremities)",
        physiologicalBasis:
          "Enhanced spinal reflex arc transmission and descending monoaminergic pathway facilitation.",
      },
      {
        phrase: "Hypertonia + Hyperthermia (> 38.0°C) + Clonus",
        manifestation: "Lower extremity muscle rigidity and soaring core temperature",
        physiologicalBasis:
          "Severe continuous muscle contraction generating relentless metabolic heat; life-threatening emergency.",
      },
    ],
    pathophysiology:
      "Serotonin syndrome occurs through excessive intrasynaptic serotonin (5-HT) accumulation, typically caused by multi-drug combinations: impaired serotonin breakdown (MAOIs), reuptake inhibition (SSRIs, SNRIs, TCAs), precursor excess, or direct receptor agonism. Stimulation of post-synaptic 5-HT2A receptors in the brainstem, spinal motor neurons, and hypothalamus drives autonomic storm, thermoregulatory dysfunction, and lower extremity neuromuscular hyperactivity.",
    signs: {
      vitals: {
        heartRate: "Marked tachycardia (sinus tachycardia, labile)",
        bloodPressure: "Hypertension (labile, fluctuating)",
        respiratoryRate: "Tachypnea",
        temperature: "Hyperthermia (can rapidly exceed 39–41°C in severe cases with hypertonia)",
      },
      pupils: "Mydriasis (dilated, typically sluggishly reactive to light)",
      skin: "Profusely diaphoretic (sweating), flushed, warm",
      mucousMembranes: "Sialorrhea (increased salivation)",
      bowelSounds: "Markedly hyperactive (borborygmi), abdominal cramping, diarrhea",
      urinaryBladder: "Normal to incontinence",
      neuromuscular:
        "Clonus (spontaneous, inducible, ocular), marked lower extremity hyperreflexia, hypertonia / rigidity (lower > upper limbs), tremor, akathisia",
      mentalStatus: "Agitation, confusion, restlessness, mania, unresponsiveness, delirium",
    },
    keyDiscriminators: [
      {
        feature: "Clonus (Spontaneous, Inducible, or Ocular) & Lower Extremity Hyperreflexia",
        description:
          "Clonus is the most sensitive and specific clinical finding defining serotonin toxicity under the validated Hunter Criteria.",
        discriminatingComparison:
          "Distinguishes from Neuroleptic Malignant Syndrome (NMS, which has lead-pipe rigidity across all limbs, bradykinesia, and hyporeflexia) and Anticholinergic toxidrome (which has dry skin and myoclonus without true clonus).",
      },
      {
        feature: "Hyperactive Bowel Sounds & Diaphoresis",
        description: "Intense peripheral 5-HT3 and 5-HT4 gut stimulation producing hyperperistalsis and diarrhea.",
        discriminatingComparison:
          "Contrasts with the quiet/absent bowel sounds and dry skin of anticholinergic toxicity.",
      },
    ],
    associatedDrugIds: [
      "fluoxetine",
      "sertraline",
      "amitriptyline",
      "linezolid",
      "mdma",
      "dextromethorphan",
      "phenelzine",
      "tranylcypromine",
    ],
    causativeAgentGroups: [
      {
        name: "Selective Serotonin Reuptake Inhibitors (SSRIs/SNRIs)",
        drugIds: ["fluoxetine", "sertraline"],
        mechanism: "Inhibition of the presynaptic serotonin transporter (SERT).",
        representativeExamples: ["Fluoxetine", "Sertraline", "Citalopram", "Escitalopram", "Venlafaxine"],
      },
      {
        name: "Monoamine Oxidase Inhibitors (MAOIs)",
        drugIds: ["phenelzine", "tranylcypromine", "linezolid"],
        mechanism: "Inhibition of monoamine oxidase-A, blocking enzymatic breakdown of serotonin.",
        representativeExamples: ["Phenelzine", "Tranylcypromine", "Linezolid", "Methylene blue"],
      },
      {
        name: "Tricyclic Antidepressants with SERT Inhibition",
        drugIds: ["amitriptyline"],
        mechanism: "Serotonin and norepinephrine reuptake inhibition.",
        representativeExamples: ["Amitriptyline", "Clomipramine", "Imipramine"],
      },
      {
        name: "Recreational & Opioid/Antitussive Serotonergics",
        drugIds: ["mdma", "dextromethorphan"],
        mechanism: "Direct serotonin release or off-target SERT reuptake blockade.",
        representativeExamples: ["MDMA (Ecstasy)", "Dextromethorphan", "Tramadol", "Meperidine"],
      },
    ],
    primaryAntidote: {
      name: "Cyproheptadine",
      antidotePathwayId: "atropine-cholinergic",
      antidoteDrugId: "cyproheptadine",
      mechanismSummary:
        "Potent competitive antagonist at 5-HT2A and 5-HT1A receptors, terminating excessive central and peripheral serotonergic neurotransmission.",
      centralVsPeripheral:
        "Antagonizes central 5-HT2A receptors responsible for thermoregulatory and neuromuscular hyperexcitability.",
      clinicalPearls: [
        "Used as an adjunctive pharmacological antagonist in moderate-to-severe serotonin toxicity refractory to supportive benzodiazepines.",
        "Oral or nasogastric administration only (no parenteral formulation available).",
      ],
      boxedWarningsOrContraindications: [
        "Causes anticholinergic side effects (sedation, antimuscarinic dry mouth) which can complicate diagnostic monitoring.",
      ],
    },
    adjunctiveManagement: [
      "Immediate cessation of all serotonergic agents",
      "Benzodiazepines to reduce neuromuscular hyperactivity and blunted sympathetic tone",
      "Aggressive active cooling for hyperthermia (> 38.5°C)",
      "Neuromuscular paralysis (non-depolarizing agent e.g. vecuronium) and endotracheal intubation for severe hyperthermia (> 41°C)",
    ],
    diagnosticPearls: [
      "Hunter Criteria: In the presence of a serotonergic agent, look for: (1) Spontaneous clonus, OR (2) Inducible clonus + agitation/diaphoresis, OR (3) Ocular clonus + agitation/diaphoresis, OR (4) Tremor + hyperreflexia, OR (5) Hypertonia + fever > 38°C + ocular/inducible clonus.",
      "Rigidity in serotonin toxicity is characteristically pronounced in the lower extremities, whereas NMS produces generalized 'lead-pipe' rigidity.",
    ],
    references: [
      "Dunkley EJ, et al. The Hunter Serotonin Toxicity Criteria: simple and accurate diagnostic decision rules. QJM. 2003.",
      "Boyer EW, Shannon M. The serotonin syndrome. N Engl J Med. 2005.",
    ],
  },
];

export interface AntidoteBiochemicalStep {
  step: number;
  title: string;
  cellularCompartment:
    | "Extracellular / Plasma"
    | "Cell Membrane / Receptor"
    | "Cytoplasm"
    | "Mitochondria"
    | "Endoplasmic Reticulum"
    | "Neuromuscular Junction";
  biochemicalEvent: string;
  molecularDescription: string;
}

export interface AntidotePathway {
  id: string;
  name: string;
  targetToxicity: string;
  antidoteDrugId: string;
  toxinDrugIds: string[];
  biochemicalClassification: string;
  primaryTargetReceptorOrEnzyme: string;
  molecularMechanismSummary: string;
  stepByStepCascade: AntidoteBiochemicalStep[];
  kineticProfile: {
    onset: string;
    criticalWindow: string;
    eliminationAndMetabolism: string;
  };
  physiologicRestorationTargets: string[];
  monitoringParameters: string[];
  boxedWarningsOrContraindications: string[];
  clinicalPearls: string[];
  citations: string[];
}

export const ANTIDOTE_PATHWAYS: readonly AntidotePathway[] = [
  // 1) NAC for Acetaminophen
  {
    id: "nac-acetaminophen",
    name: "N-acetylcysteine (NAC)",
    targetToxicity: "Acetaminophen (APAP / Paracetamol) Hepatotoxicity",
    antidoteDrugId: "nac",
    toxinDrugIds: ["acetaminophen"],
    biochemicalClassification: "Glutathione Precursor & Nucleophilic Scavenger",
    primaryTargetReceptorOrEnzyme: "Intracellular Glutathione (GSH) & Electrophilic NAPQI Scavenging",
    molecularMechanismSummary:
      "Restores intracellular glutathione (GSH) reserves to detoxify toxic electrophile N-acetyl-p-benzoquinone imine (NAPQI) formed by CYP2E1, preventing covalent adduction to hepatocyte mitochondrial proteins and centrilobular hepatic necrosis.",
    stepByStepCascade: [
      {
        step: 1,
        title: "Cellular Entry",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Transmembrane transport into hepatocytes",
        molecularDescription:
          "NAC is transported across the hepatocyte sinusoidal membrane via sodium-dependent amino acid transporter systems.",
      },
      {
        step: 2,
        title: "Enzymatic Deacetylation",
        cellularCompartment: "Cytoplasm",
        biochemicalEvent: "Hydrolysis to L-cysteine",
        molecularDescription:
          "Cytoplasmic acylases cleave the N-acetyl group, yielding free L-cysteine, the rate-limiting substrate in glutathione biosynthesis.",
      },
      {
        step: 3,
        title: "Glutathione Resynthesis",
        cellularCompartment: "Cytoplasm",
        biochemicalEvent: "De novo GSH biosynthesis",
        molecularDescription:
          "Glutamate-cysteine ligase and glutathione synthetase rapidly synthesize reduced glutathione (GSH), replenishing depleted intracellular reserves.",
      },
      {
        step: 4,
        title: "NAPQI Electrophile Neutralization",
        cellularCompartment: "Cytoplasm",
        biochemicalEvent: "Nucleophilic addition to quinone imine",
        molecularDescription:
          "Free sulfhydryl (-SH) groups on GSH and NAC nucleophilically conjugate toxic NAPQI to form nontoxic 3-(N-acetyl-L-cystein-S-yl)acetaminophen (mercapturic acid conjugate).",
      },
      {
        step: 5,
        title: "Mitochondrial Protection",
        cellularCompartment: "Mitochondria",
        biochemicalEvent: "Halting mitochondrial permeability transition",
        molecularDescription:
          "Scavenges reactive oxygen species and preserves mitochondrial membrane potential, preventing opening of the mitochondrial permeability transition pore (mPTP) and necrosis.",
      },
    ],
    kineticProfile: {
      onset: "Within 30–60 minutes of administration; hepatic GSH synthesis accelerates rapidly.",
      criticalWindow:
        "Maximal hepatoprotection achieved within 8 hours of acute ingestion; still beneficial in late presentations with ongoing liver injury.",
      eliminationAndMetabolism:
        "Extensively metabolized in the liver; terminal elimination half-life approximately 5.6 hours.",
    },
    physiologicRestorationTargets: [
      "Normalization and prevention of transaminase elevation (ALT / AST)",
      "Preservation of hepatic synthetic function (INR < 1.5, normal factor V)",
      "Clearance of serum acetaminophen to non-detectable levels",
    ],
    monitoringParameters: [
      "Serum acetaminophen concentration plotted on the Rumack-Matthew nomogram",
      "Serial ALT, AST, total bilirubin, and INR",
      "Serum creatinine and BUN for hepatorenal syndrome surveillance",
    ],
    boxedWarningsOrContraindications: [
      "Anaphylactoid non-IgE reactions (flushing, pruritus, wheezing) during IV infusion; manage by temporarily pausing infusion, administering antihistamines, and restarting at reduced rate.",
    ],
    clinicalPearls: [
      "Nearly 100% effective in preventing hepatotoxicity if started within 8 hours of an acute overdose.",
      "Continue therapy until acetaminophen is undetectable, ALT/AST are normal or clearly declining, and INR < 2.0.",
    ],
    citations: [
      "Rumack BH, Matthew H. Acetaminophen poisoning and toxicity. Pediatrics. 1975.",
      "Prescott LF, et al. Treatment of paracetamol poisoning with N-acetylcysteine. Lancet. 1977.",
    ],
  },

  // 2) Hydroxocobalamin for Cyanide
  {
    id: "hydroxocobalamin-cyanide",
    name: "Hydroxocobalamin",
    targetToxicity: "Cyanide (CN-) Poisoning & Smoke Inhalation Toxicity",
    antidoteDrugId: "hydroxocobalamin",
    toxinDrugIds: ["nitroprusside"],
    biochemicalClassification: "Metallo-Chelating Cobalt Complex",
    primaryTargetReceptorOrEnzyme: "Cyanide Ion (CN-) Coordination vs. Cytochrome c Oxidase (Complex IV)",
    molecularMechanismSummary:
      "Cobalt ion (Co3+) coordinates cyanide with greater affinity than ferric iron (Fe3+) in cytochrome c oxidase (Complex IV), forming nontoxic cyanocobalamin excreted renally, reactivating aerobic mitochondrial respiration.",
    stepByStepCascade: [
      {
        step: 1,
        title: "Intravascular Chelation",
        cellularCompartment: "Extracellular / Plasma",
        biochemicalEvent: "Cobalt(III) ligand substitution",
        molecularDescription:
          "Hydroxocobalamin binds circulating cyanide ions via its central trivalent cobalt atom, exchanging its hydroxyl ligand for cyanide.",
      },
      {
        step: 2,
        title: "Tissue Decoupling",
        cellularCompartment: "Mitochondria",
        biochemicalEvent: "Cyanide extraction from Complex IV",
        molecularDescription:
          "Outcompetes the ferric iron (Fe3+) of cytochrome a3 within mitochondrial Complex IV due to higher thermodynamic binding affinity (Ka ~ 10^12 M^-1).",
      },
      {
        step: 3,
        title: "Cyanocobalamin Formation",
        cellularCompartment: "Extracellular / Plasma",
        biochemicalEvent: "Synthesis of Vitamin B12",
        molecularDescription:
          "Coordinates two cyanide ions per molecule to form stable, nontoxic cyanocobalamin (Vitamin B12).",
      },
      {
        step: 4,
        title: "Electron Transport Chain Reactivation",
        cellularCompartment: "Mitochondria",
        biochemicalEvent: "Resumption of oxidative phosphorylation",
        molecularDescription:
          "Unblocked cytochrome c oxidase resumes accepting electrons from cytochrome c and reducing O2 to H2O, restoring ATP synthesis and halting lactic acid production.",
      },
      {
        step: 5,
        title: "Renal Elimination",
        cellularCompartment: "Extracellular / Plasma",
        biochemicalEvent: "Glomerular filtration",
        molecularDescription:
          "Cyanocobalamin is excreted intact into the urine, producing harmless reddish-purple chromaturia.",
      },
    ],
    kineticProfile: {
      onset: "Immediate on intravenous infusion (within 1–5 minutes).",
      criticalWindow:
        "Emergency use: minutes matter in severe poisoning to prevent irreversible anoxic brain injury and asystole.",
      eliminationAndMetabolism: "Renal elimination of cyanocobalamin; half-life approximately 26–31 hours.",
    },
    physiologicRestorationTargets: [
      "Rapid clearance of severe lactic acidosis (lactate < 2 mmol/L)",
      "Normalization of central venous oxygen saturation (ScvO2) from abnormally high venous saturation",
      "Restoration of mean arterial pressure and cardiac contractility",
    ],
    monitoringParameters: [
      "Serial serum lactate levels (surrogate marker of mitochondrial uncoupling)",
      "Arterial blood gases and base deficit",
      "Continuous invasive blood pressure and cardiac rhythm",
    ],
    boxedWarningsOrContraindications: [
      "Benign reddish-purple skin and urine discoloration (chromaturia) that can persist for up to 48 hours.",
      "Causes significant spectrophotometric interference with hemodialysis machines and co-oximetry.",
    ],
    clinicalPearls: [
      "Preferred over sodium nitrite in smoke inhalation because it does not induce methemoglobinemia, preserving oxygen-carrying capacity in co-existing carbon monoxide toxicity.",
      "Serum lactate > 8–10 mmol/L in a fire victim strongly correlates with clinically significant cyanide toxicity.",
    ],
    citations: [
      "Borron SW, et al. Hydroxocobalamin for severe acute cyanide poisoning in smoke inhalation victims. Ann Emerg Med. 2007.",
      "Fortin JL, et al. Prehospital administration of hydroxocobalamin for smoke inhalation-associated cyanide poisoning. Crit Care. 2006.",
    ],
  },

  // 3) Sodium Bicarbonate for TCA Cardiotoxicity
  {
    id: "sodium-bicarbonate-tca",
    name: "Sodium Bicarbonate (NaHCO3)",
    targetToxicity: "Tricyclic Antidepressant (TCA) Cardiotoxicity & Nav1.5 Blockade",
    antidoteDrugId: "sodium-bicarbonate",
    toxinDrugIds: ["amitriptyline", "nortriptyline", "imipramine", "clomipramine"],
    biochemicalClassification: "Systemic Alkalinizer & High-Concentration Sodium Ion Vector",
    primaryTargetReceptorOrEnzyme: "Cardiac Fast Voltage-Gated Sodium Channels (Nav1.5)",
    molecularMechanismSummary:
      "Serum alkalinization (pH 7.45–7.55) decreases protonated ionized drug fraction, while high extracellular [Na+] overcomes Nav1.5 fast sodium channel blockade, narrowing QRS duration and aborting ventricular dysrhythmias.",
    stepByStepCascade: [
      {
        step: 1,
        title: "Serum Alkalinization",
        cellularCompartment: "Extracellular / Plasma",
        biochemicalEvent: "Elevation of arterial pH to 7.45–7.55",
        molecularDescription:
          "Hypertonic NaHCO3 infusion raises extracellular pH, shifting the Henderson-Hasselbalch equilibrium of basic tricyclic compounds (pKa ~ 8.5–9.5).",
      },
      {
        step: 2,
        title: "Deprotonation of Toxin",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Conversion to uncharged lipophilic state",
        molecularDescription:
          "Decreases the proportion of positively charged (ionized) TCA molecules, lowering their binding affinity to the internal pore of the sodium channel.",
      },
      {
        step: 3,
        title: "Competitive Sodium Loading",
        cellularCompartment: "Extracellular / Plasma",
        biochemicalEvent: "Elevation of extracellular Na+ concentration",
        molecularDescription:
          "High extracellular [Na+] increases the electrochemical driving gradient into cardiomyocytes, overcoming competitive Nav1.5 channel blockade.",
      },
      {
        step: 4,
        title: "Accelerated Phase 0 Depolarization",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Restoration of dV/dt max",
        molecularDescription:
          "Rapid inward sodium current is restored across cardiac Purkinje fibers and ventricular myocytes, normalizing Phase 0 conduction velocity.",
      },
      {
        step: 5,
        title: "ECG Normalization",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Narrowing of the QRS complex",
        molecularDescription:
          "Narrowing of the widened QRS complex (< 100 ms) and attenuation of the prominent terminal R wave in lead aVR, extinguishing reentry ventricular circuits.",
      },
    ],
    kineticProfile: {
      onset: "Immediate on intravenous bolus administration (within seconds to 2 minutes).",
      criticalWindow:
        "Emergency use indicated when QRS > 100 ms or terminal R wave in aVR > 3 mm to prevent ventricular tachycardia and seizure-induced arrest.",
      eliminationAndMetabolism: "Renal excretion of excess bicarbonate; dynamic pulmonary CO2 elimination.",
    },
    physiologicRestorationTargets: [
      "Narrowing of QRS duration to < 100 ms",
      "Resolution of wide-complex ventricular tachycardia",
      "Correction of metabolic acidosis (arterial pH target 7.45–7.55)",
    ],
    monitoringParameters: [
      "Continuous 12-lead ECG monitoring (serial measurement of QRS duration and lead aVR terminal R wave)",
      "Serial arterial or venous blood gases (monitor pH ceiling: do not exceed pH 7.55)",
      "Serum potassium (intracellular shift causes hypokalemia; keep K+ > 4.0 mEq/L)",
    ],
    boxedWarningsOrContraindications: [
      "Avoid extreme alkalemia (pH > 7.55) which can induce hypocalcemic tetany, cerebral vasoconstriction, and ventricular dysrhythmias.",
      "Monitor for hypernatremia and volume overload in patients with impaired cardiac or renal reserve.",
    ],
    clinicalPearls: [
      "Also effective for cardiotoxicity from other Type Ia/Ic sodium channel blockers (e.g., diphenhydramine, cocaine, flecainide, propafenone).",
      "Hyperventilation can assist alkalinization in intubated patients, but sodium loading is the critical dual mechanism.",
    ],
    citations: [
      "Pentel P, Benowitz N. Tricyclic antidepressant poisoning. Management of arrhythmias. Med Toxicol. 1986.",
      "Liebelt EL, et al. Efficacy of early sodium bicarbonate therapy in tricyclic antidepressant overdose. Ann Emerg Med. 1995.",
    ],
  },

  // 4) Pralidoxime for Organophosphates
  {
    id: "pralidoxime-organophosphates",
    name: "Pralidoxime (2-PAM)",
    targetToxicity: "Organophosphate Acetylcholinesterase Inhibition",
    antidoteDrugId: "pralidoxime",
    toxinDrugIds: ["malathion"],
    biochemicalClassification: "Nucleophilic Pyridinium Oxime Enzyme Reactivator",
    primaryTargetReceptorOrEnzyme: "Phosphorylated Catalytic Serine (Ser203) of Acetylcholinesterase",
    molecularMechanismSummary:
      "Nucleophilic attack on organophosphate-inhibited acetylcholinesterase, regenerating active enzyme prior to dealkylation aging.",
    stepByStepCascade: [
      {
        step: 1,
        title: "Docking at the Peripheral Anionic Site",
        cellularCompartment: "Neuromuscular Junction",
        biochemicalEvent: "Electrostatic alignment",
        molecularDescription:
          "The positively charged quaternary pyridinium nitrogen of 2-PAM electrostatically binds the peripheral anionic site of acetylcholinesterase, positioning its oxime group.",
      },
      {
        step: 2,
        title: "Nucleophilic Attack",
        cellularCompartment: "Neuromuscular Junction",
        biochemicalEvent: "Oxime attack on phosphorylated serine",
        molecularDescription:
          "The oxime anion (-N-O-) executes a directed nucleophilic attack on the organophosphate phosphorus atom covalently bound to active-site Ser203.",
      },
      {
        step: 3,
        title: "Phosphorus-Enzyme Bond Cleavage",
        cellularCompartment: "Neuromuscular Junction",
        biochemicalEvent: "Ester bond hydrolysis",
        molecularDescription:
          "The covalent bond between Ser203 and the organophosphoryl moiety is cleaved, forming a transient oxime-phosphonate conjugate.",
      },
      {
        step: 4,
        title: "Dissociation of Oxime-Phosphonate",
        cellularCompartment: "Neuromuscular Junction",
        biochemicalEvent: "Release from the active gorge",
        molecularDescription:
          "The phosphorylated-oxime complex dissociates from the enzyme gorge and is eliminated, leaving the catalytic triad unmodified.",
      },
      {
        step: 5,
        title: "Restoration of Acetylcholine Cleavage",
        cellularCompartment: "Neuromuscular Junction",
        biochemicalEvent: "Reactivation of synaptic hydrolysis",
        molecularDescription:
          "The regenerated enzyme resumes rapid hydrolysis of acetylcholine, resolving depolarizing block at motor endplates and reversing neuromuscular paralysis.",
      },
    ],
    kineticProfile: {
      onset: "Reactivation begins within 10–30 minutes of intravenous infusion.",
      criticalWindow:
        "Must be administered prior to irreversible covalent dealkylation ('chemical aging'); aging occurs over hours for nerve agents to days for insecticides.",
      eliminationAndMetabolism:
        "Rapidly excreted by renal glomerular filtration and tubular secretion; elimination half-life approximately 1.2–1.5 hours.",
    },
    physiologicRestorationTargets: [
      "Resolution of muscle fasciculations and motor weakness",
      "Restoration of voluntary diaphragmatic respiratory effort and tidal volume",
      "Recovery of red blood cell (RBC) cholinesterase catalytic activity",
    ],
    monitoringParameters: [
      "Neuromuscular strength and continuous pulse oximetry / tidal volume",
      "Serial RBC and plasma butyrylcholinesterase activity levels",
      "Continuous blood pressure (rapid infusion can cause transient hypertension)",
    ],
    boxedWarningsOrContraindications: [
      "Rapid IV bolus injection can cause transient neuromuscular weakness, laryngeal spasm, and hypertension.",
      "Ineffective once chemical aging has occurred; carbamate poisoning typically resolves without oximes.",
    ],
    clinicalPearls: [
      "Always give in conjunction with atropine: pralidoxime reverses nicotinic motor weakness, while atropine reverses muscarinic respiratory secretions.",
      "Continuous infusion is often necessary in lipophilic organophosphate exposures (e.g., malathion) due to redistribution from fat stores.",
    ],
    citations: [
      "Eddleston M, et al. Pralidoxime in acute organophosphorus-insecticide poisoning—a randomised controlled trial. PLoS Med. 2009.",
      "Worek F, et al. Progress in oxime-directed reactivation of organophosphorus-inhibited acetylcholinesterase. Biochem Pharmacol. 2016.",
    ],
  },

  // 5) Atropine for Cholinergic Crisis
  {
    id: "atropine-cholinergic",
    name: "Atropine",
    targetToxicity: "Cholinergic Crisis / Organophosphate & Carbamate Toxicity",
    antidoteDrugId: "atropine",
    toxinDrugIds: ["malathion", "neostigmine", "pyridostigmine", "physostigmine"],
    biochemicalClassification: "Competitive Muscarinic Acetylcholine Receptor Antagonist",
    primaryTargetReceptorOrEnzyme: "Muscarinic Acetylcholine Receptors (M1, M2, M3)",
    molecularMechanismSummary:
      "Competitive reversible muscarinic receptor antagonist blocking parasympathetic overdrive at M1, M2, M3, specifically clearing life-threatening bronchorrhea and bronchospasm.",
    stepByStepCascade: [
      {
        step: 1,
        title: "End-Organ Receptor Occupation",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Competitive orthosteric antagonism",
        molecularDescription:
          "Atropine binds orthosteric pockets on muscarinic M1, M2, and M3 receptors, competitively displacing accumulated acetylcholine.",
      },
      {
        step: 2,
        title: "Blockade of M3 Bronchial Secretions",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Halting Gq-mediated mucosal secretion",
        molecularDescription:
          "Inhibits Gq-phospholipase C signaling in submucosal tracheobronchial glands, arresting life-threatening bronchorrhea ('airway drowning').",
      },
      {
        step: 3,
        title: "Relief of M3 Bronchospasm",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Bronchial smooth muscle relaxation",
        molecularDescription:
          "Prevents IP3-induced intracellular calcium mobilization in bronchial smooth muscle, producing prompt bronchodilation.",
      },
      {
        step: 4,
        title: "Reversal of M2 Bradycardia",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Sinoatrial and AV nodal vagal blockade",
        molecularDescription:
          "Blocks Gi-coupled inhibition of adenylyl cyclase in SA and AV nodes, abolishing parasympathetic hyperpolarization and restoring sinus rate.",
      },
      {
        step: 5,
        title: "Central Penetration",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "CNS muscarinic blockade",
        molecularDescription:
          "Crosses the blood-brain barrier to alleviate central cholinergic respiratory depression and autonomic dysregulation.",
      },
    ],
    kineticProfile: {
      onset: "Within 1–2 minutes after intravenous administration.",
      criticalWindow:
        "Immediate emergency titration required; delay in clearing pulmonary secretions leads to fatal hypoxemia.",
      eliminationAndMetabolism:
        "Hepatic metabolism with renal elimination of unchanged drug; terminal half-life approximately 2–4 hours.",
    },
    physiologicRestorationTargets: [
      "Clearing of tracheobronchial secretions ('dry lung sounds on auscultation')",
      "Relief of bronchospasm and normalization of airway resistance",
      "Heart rate > 80 bpm with systolic BP > 90 mmHg",
      "Dry skin and axillae",
    ],
    monitoringParameters: [
      "Frequent pulmonary auscultation (lung sounds are the primary titration endpoint)",
      "Continuous pulse oximetry and capnography",
      "Heart rate, blood pressure, and skin moisture",
    ],
    boxedWarningsOrContraindications: [
      "Do not under-dose: organophosphate poisoning can require hundreds of milligrams of atropine in the first 24 hours.",
      "Atropine does not reverse nicotinic muscle weakness or diaphragmatic paralysis (requires pralidoxime and ventilatory support).",
    ],
    clinicalPearls: [
      "The endpoint of atropinization is CLEAR LUNG SOUNDS, not dilated pupils or tachycardia alone.",
      "If the patient still has moist airway secretions, double the atropine dose every 3–5 minutes until the chest is dry.",
    ],
    citations: [
      "Eddleston M, et al. Speed of initial atropinisation in significant organophosphorus pesticide poisoning. Heart. 2004.",
      "Roberts DM, Aaron CK. Managing acute organophosphorus pesticide poisoning. BMJ. 2007.",
    ],
  },

  // 6) Naloxone for Opioid Overdose
  {
    id: "naloxone-opioid",
    name: "Naloxone",
    targetToxicity: "Opioid Overdose & Central Hypoventilation",
    antidoteDrugId: "naloxone",
    toxinDrugIds: ["morphine", "oxycodone", "fentanyl", "methadone"],
    biochemicalClassification: "Pure Competitive Opioid Receptor Antagonist",
    primaryTargetReceptorOrEnzyme: "Mu (MOR), Kappa (KOR), and Delta (DOR) Opioid Receptors",
    molecularMechanismSummary:
      "Competitive displacement of agonists from mu, delta, kappa opioid receptors in brainstem respiratory centers, restoring spontaneous respiration.",
    stepByStepCascade: [
      {
        step: 1,
        title: "Blood-Brain Barrier Crossing",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Rapid central nervous system distribution",
        molecularDescription:
          "Naloxone's lipophilic tertiary morphinan core rapidly diffuses across the blood-brain barrier into brainstem and midbrain nuclei.",
      },
      {
        step: 2,
        title: "Competitive Mu-Receptor Displacement",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Orthosteric pocket occupancy",
        molecularDescription:
          "Binds the orthosteric binding pocket of mu-opioid receptors with high nanomolar affinity, competitively displacing bound opioid agonists.",
      },
      {
        step: 3,
        title: "Uncoupling of Gi/o Signaling",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Restoration of intracellular cAMP",
        molecularDescription:
          "Terminates Gi-mediated inhibition of adenylyl cyclase, re-elevating cytoplasmic cAMP levels and closing GIRK potassium channels.",
      },
      {
        step: 4,
        title: "Pre-Bötzinger Complex Reactivation",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Restoration of medullary pacemaking",
        molecularDescription:
          "Re-initiates autonomous burst generation in the pre-Bötzinger complex, restoring hypercapnic ventilatory drive and tidal volume.",
      },
      {
        step: 5,
        title: "Arousal & Airway Reflex Restoration",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Locus coeruleus disinhibition",
        molecularDescription:
          "Disinhibits ascending noradrenergic projections from the locus coeruleus, restoring upper airway tone and consciousness.",
      },
    ],
    kineticProfile: {
      onset: "1–2 minutes IV; 2–5 minutes IM / subcutaneous / intranasal.",
      criticalWindow:
        "Emergency use: minutes to abort hypoxic cardiac arrest and permanent anoxic brain injury.",
      eliminationAndMetabolism:
        "Rapid hepatic glucuronidation (naloxone-3-glucuronide); serum half-life approximately 30–90 minutes.",
    },
    physiologicRestorationTargets: [
      "Spontaneous respiratory rate ≥ 12 breaths/min with adequate tidal volume",
      "Restoration of oxygen saturation > 92% on ambient air",
      "Preservation of airway protective reflexes (cough and gag)",
    ],
    monitoringParameters: [
      "Continuous respiratory rate, pulse oximetry, and end-tidal CO2 (capnography)",
      "Surveillance for renarcotization after naloxone wears off (especially with fentanyl or methadone)",
      "Observation for signs of precipitated acute opioid withdrawal",
    ],
    boxedWarningsOrContraindications: [
      "Precipitation of acute opioid withdrawal (vomiting, aspiration risk, severe autonomic agitation, non-cardiogenic pulmonary edema).",
      "Duration of action is shorter than almost all full-agonist opioids; continuous observation is mandatory.",
    ],
    clinicalPearls: [
      "The clinical goal is adequate ventilation, not necessarily a fully awake patient.",
      "Synthetic contaminants like xylazine or medetomidine will not reverse with naloxone; support the airway first.",
    ],
    citations: [
      "Boyer EW. Management of opioid analgesic overdose. N Engl J Med. 2012.",
      "Clarke SF, et al. Naloxone in opioid poisoning: walking the tightrope. Emerg Med J. 2005.",
    ],
  },

  // 7) Digoxin Immune Fab for Digoxin
  {
    id: "digoxin-immune-fab",
    name: "Digoxin Immune Fab (DigiFab)",
    targetToxicity: "Digoxin Glycoside Cardiotoxicity & Hyperkalemic Dysrhythmias",
    antidoteDrugId: "digoxin-immune-fab",
    toxinDrugIds: ["digoxin"],
    biochemicalClassification: "Antigen-Binding Immunoglobulin Fragment (Fab)",
    primaryTargetReceptorOrEnzyme: "Free Circulating and Tissue-Bound Digoxin",
    molecularMechanismSummary:
      "High-affinity sheep immunoglobulin Fab fragments binding free intravascular digoxin, pulling tissue-bound drug from myocardial Na+/K+-ATPase down a steep concentration gradient.",
    stepByStepCascade: [
      {
        step: 1,
        title: "Intravascular Digoxin Sequestration",
        cellularCompartment: "Extracellular / Plasma",
        biochemicalEvent: "High-affinity epitope binding",
        molecularDescription:
          "Ovine Fab fragments bind free serum digoxin with Ka ~ 10^9 to 10^10 M^-1 (approximately 100-fold higher than the affinity of Na+/K+-ATPase).",
      },
      {
        step: 2,
        title: "Thermodynamic Concentration Gradient",
        cellularCompartment: "Extracellular / Plasma",
        biochemicalEvent: "Creation of zero-free-drug equilibrium",
        molecularDescription:
          "By reducing free intravascular digoxin to virtually zero, an outward concentration gradient is established from myocyte tissues to the vascular space.",
      },
      {
        step: 3,
        title: "Dissociation from Na+/K+-ATPase",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Release from cardiac alpha-subunits",
        molecularDescription:
          "Tissue-bound digoxin dissociates from the extracellular face of myocardial Na+/K+-ATPase pumps and diffuses into capillaries.",
      },
      {
        step: 4,
        title: "Reactivation of Myocardial Ion Transport",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Pumping Na+ out and K+ into myocytes",
        molecularDescription:
          "Restored pump activity normalizes intracellular sodium, enabling the 3Na+/Ca2+ exchanger (NCX) to clear toxic calcium overload and abolishing delayed afterdepolarizations (DADs).",
      },
      {
        step: 5,
        title: "Renal Filtration of Fab-Digoxin Complex",
        cellularCompartment: "Extracellular / Plasma",
        biochemicalEvent: "Glomerular clearance",
        molecularDescription:
          "The low-molecular-weight (~46 kDa) Fab-digoxin complex is rapidly filtered by renal glomeruli and eliminated in urine.",
      },
    ],
    kineticProfile: {
      onset: "Improvement in cardiac conduction and dysrhythmias typically seen within 15–30 minutes.",
      criticalWindow:
        "Indicated for life-threatening dysrhythmias, progressive conduction block, or serum potassium > 5.0–5.5 mEq/L in acute overdose.",
      eliminationAndMetabolism:
        "Renal elimination of the complex with elimination half-life of 15–20 hours; prolonged in renal failure.",
    },
    physiologicRestorationTargets: [
      "Termination of ventricular dysrhythmias (bidirectional VT, PVCs)",
      "Reversal of high-grade AV block and severe junctional bradycardia",
      "Normalization of life-threatening hyperkalemia",
    ],
    monitoringParameters: [
      "Continuous ECG monitoring for rhythm stabilization",
      "Serial serum potassium (potassium moves rapidly back into cells as pumps reactivate; avoid aggressive potassium-lowering once Fab is administered)",
      "Note: Total digoxin lab assays become falsely markedly elevated (measuring bound + free drug) and are uninterpretable for 1–2 weeks.",
    ],
    boxedWarningsOrContraindications: [
      "Hypokalemia can develop rapidly as reactivated Na+/K+-ATPase pumps drive potassium back into cells.",
      "Sudden loss of inotropic support can worsen underlying congestive heart failure or accelerate atrial fibrillation ventricular rates.",
    ],
    clinicalPearls: [
      "Hyperkalemia in acute digoxin overdose is a marker of severe poisoning (pump blockade), not renal failure alone.",
      "Do NOT administer calcium gluconate/chloride for hyperkalemia in suspected digoxin toxicity due to historical concerns of 'stone heart' from intracellular calcium overload.",
    ],
    citations: [
      "Antman EM, et al. Treatment of 150 cases of life-threatening digitalis intoxication with digoxin-specific Fab antibodies. Circulation. 1990.",
      "Chan BS, Buckley NA. Digoxin-specific antibody fragments in the treatment of digoxin toxicity. Clin Toxicol. 2014.",
    ],
  },

  // 8) Glucagon for Beta-Blocker / CCB Toxicity
  {
    id: "glucagon-cardiac",
    name: "Glucagon",
    targetToxicity: "Beta-Adrenergic Blocker and Calcium Channel Blocker Toxicity",
    antidoteDrugId: "glucagon",
    toxinDrugIds: ["propranolol", "metoprolol", "atenolol", "verapamil", "diltiazem"],
    biochemicalClassification: "Non-Adrenergic Inotropic GPCR Peptide Agonist (Gs)",
    primaryTargetReceptorOrEnzyme: "Myocardial Glucagon G-Protein Coupled Receptors",
    molecularMechanismSummary:
      "Bypasses blocked beta-1 adrenergic receptors by directly binding glucagon GPCRs (Gs), stimulating Adenylyl Cyclase -> cAMP -> PKA, augmenting contractility and chronotropy.",
    stepByStepCascade: [
      {
        step: 1,
        title: "Glucagon GPCR Binding",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Bypassing blocked beta-1 receptors",
        molecularDescription:
          "Glucagon selectively binds myocardial glucagon receptors without requiring access to pharmacologically blocked beta-1 adrenoceptors.",
      },
      {
        step: 2,
        title: "Gs Protein Transduction",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "GDP-GTP exchange on Gs-alpha",
        molecularDescription:
          "Receptor activation triggers Gs-alpha subunit dissociation and direct activation of transmembrane adenylyl cyclase.",
      },
      {
        step: 3,
        title: "cAMP Synthesis",
        cellularCompartment: "Cytoplasm",
        biochemicalEvent: "ATP conversion to cyclic AMP",
        molecularDescription:
          "Adenylyl cyclase accelerates the synthesis of cyclic AMP (cAMP) independently of beta-adrenergic receptor stimulation.",
      },
      {
        step: 4,
        title: "Protein Kinase A Phosphorylation",
        cellularCompartment: "Cytoplasm",
        biochemicalEvent: "PKA activation of calcium machinery",
        molecularDescription:
          "Elevated cAMP activates PKA, which phosphorylates L-type calcium channels (Cav1.2) and phospholamban on the sarcoplasmic reticulum.",
      },
      {
        step: 5,
        title: "Augmented Inotropy and Chronotropy",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Increased intracellular Ca2+ transients",
        molecularDescription:
          "Elevated intracellular calcium influx during Phase 2 improves myocardial contractility (inotropy) and accelerates SA/AV nodal conduction (chronotropy).",
      },
    ],
    kineticProfile: {
      onset: "Hemodynamic response typically begins within 1–3 minutes of IV bolus.",
      criticalWindow:
        "Emergency bridge therapy for profound bradycardia and cardiogenic shock while preparing high-dose insulin or mechanical circulatory support.",
      eliminationAndMetabolism:
        "Rapid hepatic and renal proteolytic degradation; half-life is brief (approximately 3–6 minutes).",
    },
    physiologicRestorationTargets: [
      "Restoration of mean arterial pressure > 65 mmHg",
      "Heart rate > 50–60 bpm",
      "Resolution of high-grade AV block and cardiogenic shock",
    ],
    monitoringParameters: [
      "Continuous invasive blood pressure and cardiac rhythm",
      "Blood glucose (initial hyperglycemia followed by possible rebound hypoglycemia)",
      "Electrolytes (hypokalemia from insulin release)",
    ],
    boxedWarningsOrContraindications: [
      "High incidence of severe nausea and vomiting (protect airway to prevent aspiration, especially in altered patients).",
      "Tachyphylaxis frequently develops with continuous infusions as glucagon receptors desensitize.",
    ],
    clinicalPearls: [
      "Useful as an immediate bridge therapy, but high-dose insulin euglycemia therapy (HIET) provides more durable metabolic inotropic support.",
      "Pre-treat with an antiemetic (e.g., ondansetron) prior to rapid bolus administration.",
    ],
    citations: [
      "Love JN, et al. A review of the mechanism of action of glucagon in the treatment of beta-blocker toxicity. J Emerg Med. 1998.",
      "Shepherd G. Treatment of poisoning caused by beta-adrenergic and calcium-channel blockers. Am J Health Syst Pharm. 2006.",
    ],
  },

  // 9) HIET for CCB / Beta-Blocker Toxicity
  {
    id: "hiet-ccb-bb",
    name: "High-Dose Insulin Euglycemia Therapy (HIET)",
    targetToxicity: "Calcium Channel Blocker (CCB) & Severe Beta-Blocker Cardiogenic Shock",
    antidoteDrugId: "insulin-regular",
    toxinDrugIds: ["verapamil", "diltiazem", "amlodipine", "nifedipine", "propranolol", "metoprolol"],
    biochemicalClassification: "Metabolic Substrate Switch & Hyperinsulinemic Inotrope",
    primaryTargetReceptorOrEnzyme: "Myocardial Insulin Receptors & Sarcoplasmic Calcium Handling",
    molecularMechanismSummary:
      "Shifts stressed myocardium from free fatty acid oxidation to efficient carbohydrate/glucose utilization while promoting intracellular Ca2+ entry and inotropy.",
    stepByStepCascade: [
      {
        step: 1,
        title: "Overcoming Pancreatic Inhibition",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Reversing toxin-induced hypoinsulinemia",
        molecularDescription:
          "CCBs block L-type calcium channels on pancreatic beta cells, abolishing endogenous insulin release; high-dose exogenous insulin overcomes this deficiency.",
      },
      {
        step: 2,
        title: "GLUT4 Sarcolemmal Translocation",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "PI3K/Akt-mediated glucose transport",
        molecularDescription:
          "Insulin receptor activation triggers Akt signaling, driving vesicle translocation of GLUT4 glucose transporters to the cardiomyocyte sarcolemma.",
      },
      {
        step: 3,
        title: "Metabolic Substrate Switch",
        cellularCompartment: "Cytoplasm",
        biochemicalEvent: "Shifting from fatty acid to glucose oxidation",
        molecularDescription:
          "Forces the stressed, ischemic heart from oxygen-expensive free fatty acid beta-oxidation to efficient aerobic carbohydrate metabolism.",
      },
      {
        step: 4,
        title: "Pyruvate Dehydrogenase Activation",
        cellularCompartment: "Mitochondria",
        biochemicalEvent: "Replenishing myocardial ATP",
        molecularDescription:
          "Stimulates pyruvate dehydrogenase, maximizing ATP yield per molecule of oxygen consumed and clearing lactic acidosis.",
      },
      {
        step: 5,
        title: "Direct Calcium Inotropy",
        cellularCompartment: "Endoplasmic Reticulum",
        biochemicalEvent: "SERCA2a calcium pumping acceleration",
        molecularDescription:
          "Enhances sarcoplasmic reticulum Ca2+-ATPase (SERCA2a) activity and myocyte calcium sensitivity, generating potent inotropic contractility without adrenergic tachycardia.",
      },
    ],
    kineticProfile: {
      onset: "Hemodynamic improvement typically requires 30–60 minutes of high-dose infusion to take effect.",
      criticalWindow:
        "First-line therapeutic protocol for severe CCB and beta-blocker overdose with refractory cardiogenic shock.",
      eliminationAndMetabolism:
        "Hepatic and renal degradation; high dosing requires hours to clear after discontinuation.",
    },
    physiologicRestorationTargets: [
      "Restoration of systemic cardiac index and stroke volume",
      "Mean arterial pressure > 65 mmHg without excessive vasopressor vasoconstriction",
      "Correction of severe lactic acidosis",
    ],
    monitoringParameters: [
      "Serial blood glucose every 15–30 minutes until stable, then hourly (co-infuse concentrated dextrose, e.g., D10W/D50W)",
      "Serial serum potassium every 1–2 hours (potassium shifts into cells; maintain K+ 2.5–3.5 mEq/L, avoid over-replacement)",
      "Continuous invasive arterial line blood pressure monitoring",
    ],
    boxedWarningsOrContraindications: [
      "Severe hypoglycemia if dextrose infusions are insufficient or interrupted.",
      "Profound hypokalemia from intracellular shifting; replace judiciously only when K+ drops below 2.5–2.8 mEq/L.",
    ],
    clinicalPearls: [
      "Insulin acts as a potent inotrope in this setting, not merely a glucose regulator; dosing is orders of magnitude higher than DKA (1–10 units/kg/hr).",
      "Because onset requires 30–60 minutes, start HIET early rather than as a last-resort rescue.",
    ],
    citations: [
      "Engebretsen KM, et al. High-dose insulin therapy in beta-blocker and calcium channel-blocker poisoning. Clin Toxicol. 2011.",
      "Woodward C, et al. High dose insulin therapy for calcium channel blocker and beta-blocker overdose. Ann Emerg Med. 2014.",
    ],
  },

  // 10) Intravenous Lipid Emulsion (ILE) for Lipophilic Toxins
  {
    id: "lipid-emulsion-ile",
    name: "Intravenous Lipid Emulsion (ILE / 'Lipid Sink')",
    targetToxicity: "Local Anesthetic Systemic Toxicity (LAST) & Lipophilic Xenobiotic Cardiotoxicity",
    antidoteDrugId: "lipid-emulsion",
    toxinDrugIds: ["bupivacaine", "verapamil", "amitriptyline"],
    biochemicalClassification: "Intravascular Lipophilic Partitioning Sink & Metabolic Substrate",
    primaryTargetReceptorOrEnzyme: "High LogP Lipophilic Xenobiotics & Mitochondrial Fatty Acid Oxidation",
    molecularMechanismSummary:
      "Creates an intravascular lipophilic compartment partitioning lipophilic xenobiotics (Bupivacaine, Verapamil, Amitriptyline) away from target myocardial and cerebral tissues.",
    stepByStepCascade: [
      {
        step: 1,
        title: "Lipid Sink Emulsion Expansion",
        cellularCompartment: "Extracellular / Plasma",
        biochemicalEvent: "Expansion of intravascular lipid phase",
        molecularDescription:
          "Infusion of 20% lipid emulsion droplets creates a high-capacity hydrophobic compartment circulating in the vascular tree.",
      },
      {
        step: 2,
        title: "Thermodynamic Partitioning",
        cellularCompartment: "Extracellular / Plasma",
        biochemicalEvent: "Equilibrium partition down logP gradient",
        molecularDescription:
          "Highly lipophilic xenobiotics (octanol:water partition coefficient logP > 2 to 4) thermodynamically partition out of plasma water into the lipid droplet core.",
      },
      {
        step: 3,
        title: "Tissue Extraction Gradient",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Extraction from heart and brain",
        molecularDescription:
          "Lowers free plasma concentration, creating a steep gradient that pulls drug off myocardial Nav1.5 channels and cerebral neurons.",
      },
      {
        step: 4,
        title: "Mitochondrial Substrate Delivery",
        cellularCompartment: "Mitochondria",
        biochemicalEvent: "Free fatty acid energy supplementation",
        molecularDescription:
          "Delivers high-energy fatty acids to cardiomyocytes, overcoming bupivacaine-mediated inhibition of carnitine acylcarnitine translocase.",
      },
      {
        step: 5,
        title: "Calcium Inotropy & Membrane Stabilization",
        cellularCompartment: "Cell Membrane / Receptor",
        biochemicalEvent: "Inotropic modulation",
        molecularDescription:
          "Increases intramyocyte calcium and promotes direct inotropic recovery, facilitating return of spontaneous circulation (ROSC).",
      },
    ],
    kineticProfile: {
      onset: "Rapid intravascular partitioning within 1–5 minutes of bolus administration.",
      criticalWindow:
        "First-line resuscitation protocol in Local Anesthetic Systemic Toxicity (LAST); rescue therapy in refractory lipophilic cardiotoxin arrest.",
      eliminationAndMetabolism:
        "Clearance by endothelial lipoprotein lipase and reticuloendothelial system over hours.",
    },
    physiologicRestorationTargets: [
      "Return of spontaneous circulation (ROSC) in refractory cardiac arrest",
      "Termination of refractory ventricular fibrillation or wide-complex tachycardia",
      "Restoration of mean arterial pressure and cardiac output",
    ],
    monitoringParameters: [
      "Continuous cardiac rhythm and invasive hemodynamic monitoring",
      "Serum triglycerides and amylase/lipase (surveillance for pancreatitis and lipid overload)",
      "Awareness that severe lipemia will interfere with laboratory analyzers (electrolytes, hemoglobin, co-oximetry)",
    ],
    boxedWarningsOrContraindications: [
      "Hypertriglyceridemia, acute pancreatitis, acute lung injury / fat embolism syndrome with prolonged excessive dosing.",
      "Reduces efficacy of other concurrent lipophilic resuscitation drugs (e.g., amiodarone) by partitioning them into the emulsion.",
    ],
    clinicalPearls: [
      "Standard of care for Bupivacaine-induced cardiac arrest (ASRA guidelines).",
      "Use 20% lipid emulsion formulations; do not substitute with propofol (which contains 10% lipid but carries profound myocardial depressant effects).",
    ],
    citations: [
      "Weinberg GL, et al. Pretreatment or resuscitation with a lipid infusion shifts the dose-response to bupivacaine-induced asystole in rats. Anesthesiology. 1998.",
      "Neal JM, et al. The ASRA practice advisory on local anesthetic systemic toxicity. Reg Anesth Pain Med. 2010.",
    ],
  },
];

export interface DiscriminatorRow {
  parameter: string;
  category: "vitals" | "pupils" | "skin" | "peristalsis" | "reflexes" | "mentalStatus";
  anticholinergic: string;
  cholinergic: string;
  opioid: string;
  sympathomimetic: string;
  sedativeHypnotic: string;
  serotonergic: string;
  discriminatorHighlight?: string;
}

export const TOXIDROME_DISCRIMINATOR_MATRIX: readonly DiscriminatorRow[] = [
  {
    parameter: "Heart Rate",
    category: "vitals",
    anticholinergic: "Tachycardia (early, prominent)",
    cholinergic: "Bradycardia (muscarinic) or tachycardia (nicotinic)",
    opioid: "Bradycardia",
    sympathomimetic: "Marked tachycardia (> 110–140 bpm)",
    sedativeHypnotic: "Normal to mild bradycardia",
    serotonergic: "Tachycardia (labile)",
    discriminatorHighlight: "Tachycardia distinguishes Anticholinergic & Sympathomimetic from Opioid & Sedative.",
  },
  {
    parameter: "Blood Pressure",
    category: "vitals",
    anticholinergic: "Normal to mild hypertension",
    cholinergic: "Hypotension (severe) or variable",
    opioid: "Hypotension",
    sympathomimetic: "Marked hypertension (> 180–220 mmHg)",
    sedativeHypnotic: "Normal to mild hypotension",
    serotonergic: "Hypertension (labile)",
    discriminatorHighlight: "Severe hypertension points strongly toward Sympathomimetic excess.",
  },
  {
    parameter: "Respiratory Rate",
    category: "vitals",
    anticholinergic: "Normal to tachypnea",
    cholinergic: "Tachypnea (distress) -> bradypnea / apnea",
    opioid: "Severe bradypnea (< 8–10 bpm, apnea)",
    sympathomimetic: "Tachypnea, hyperpnea",
    sedativeHypnotic: "Normal to mild bradypnea (shallow)",
    serotonergic: "Tachypnea",
    discriminatorHighlight: "Severe bradypnea (< 8 bpm) is the hallmark of Opioid poisoning.",
  },
  {
    parameter: "Temperature",
    category: "vitals",
    anticholinergic: "Hyperthermia (impaired sweating)",
    cholinergic: "Hypothermia or normal",
    opioid: "Hypothermia",
    sympathomimetic: "Hyperthermia (hypermetabolic)",
    sedativeHypnotic: "Normal to hypothermia",
    serotonergic: "Hyperthermia (> 38°C to > 41°C)",
    discriminatorHighlight: "Extreme hyperthermia occurs in Anticholinergic, Sympathomimetic, and Serotonergic states.",
  },
  {
    parameter: "Pupil Size & Light Response",
    category: "pupils",
    anticholinergic: "Mydriasis (dilated, poorly reactive, cycloplegia)",
    cholinergic: "Miosis (pinpoint pupils, ciliary spasm)",
    opioid: "Miosis (pinpoint, 1–2 mm, symmetric)",
    sympathomimetic: "Mydriasis (dilated, reactive)",
    sedativeHypnotic: "Normal or midposition (reactive)",
    serotonergic: "Mydriasis (dilated, sluggish)",
    discriminatorHighlight: "Pinpoint = Opioid / Cholinergic. Dilated = Anticholinergic / Sympathomimetic / Serotonergic.",
  },
  {
    parameter: "Skin Moisture / Sweating",
    category: "skin",
    anticholinergic: "Dry, flushed, anhidrosis (dry axillae)",
    cholinergic: "Diaphoretic, drenched in sweat, cool",
    opioid: "Cool, pale, clammy or dry",
    sympathomimetic: "Profusely diaphoretic (sweat-drenched)",
    sedativeHypnotic: "Normal, dry",
    serotonergic: "Profusely diaphoretic (sweating)",
    discriminatorHighlight:
      "KEY DISCRIMINATOR: Anticholinergic has bone dry skin (anhidrosis); Sympathomimetic and Serotonergic are drenched in sweat.",
  },
  {
    parameter: "Mucous Membranes",
    category: "skin",
    anticholinergic: "Severe xerostomia (dry mouth)",
    cholinergic: "Copious salivation (sialorrhea, frothing)",
    opioid: "Normal to dry",
    sympathomimetic: "Normal to dry",
    sedativeHypnotic: "Normal",
    serotonergic: "Increased salivation",
    discriminatorHighlight: "Sialorrhea and airway frothing define Cholinergic crisis.",
  },
  {
    parameter: "Bowel Sounds / Peristalsis",
    category: "peristalsis",
    anticholinergic: "Hypoactive to absent (paralytic ileus)",
    cholinergic: "Markedly hyperactive (borborygmi, diarrhea)",
    opioid: "Hypoactive to absent",
    sympathomimetic: "Hyperactive to normal",
    sedativeHypnotic: "Hypoactive to normal",
    serotonergic: "Markedly hyperactive (diarrhea, cramps)",
    discriminatorHighlight: "Absent bowel sounds = Anticholinergic / Opioid; Hyperactive = Cholinergic / Serotonergic.",
  },
  {
    parameter: "Urinary Bladder",
    category: "peristalsis",
    anticholinergic: "Urinary retention (full bladder)",
    cholinergic: "Urinary incontinence (frequent voiding)",
    opioid: "Urinary retention",
    sympathomimetic: "Normal to increased sphincter tone",
    sedativeHypnotic: "Normal to mild retention",
    serotonergic: "Normal to incontinence",
    discriminatorHighlight: "Urinary retention is prominent in Anticholinergic and Opioid toxidromes.",
  },
  {
    parameter: "Neuromuscular Tone & Reflexes",
    category: "reflexes",
    anticholinergic: "Tremor, picking movements, myoclonus",
    cholinergic: "Fasciculations, profound flaccid weakness",
    opioid: "Hyporeflexia, flaccidity",
    sympathomimetic: "Tremor, hyperreflexia, agitation",
    sedativeHypnotic: "Hypotonia, hyporeflexia, ataxia",
    serotonergic: "Clonus (spontaneous/inducible), hyperreflexia (lower limbs > upper)",
    discriminatorHighlight:
      "KEY DISCRIMINATOR: Clonus (ocular, inducible, spontaneous) uniquely identifies Serotonin Toxicity; fasciculations identify Cholinergic.",
  },
  {
    parameter: "Mental Status",
    category: "mentalStatus",
    anticholinergic: "Muttering delirium, hallucinations ('mad as a hatter')",
    cholinergic: "Confusion, agitation, lethargy, seizures, coma",
    opioid: "Somnolence, stupor, coma",
    sympathomimetic: "Agitation, paranoia, acute toxic psychosis",
    sedativeHypnotic: "Somnolence, slurred speech, stupor, coma",
    serotonergic: "Agitation, restlessness, delirium",
    discriminatorHighlight:
      "Anticholinergic presents with characteristic purposeless picking delirium; Opioid and Sedative present with coma.",
  },
  {
    parameter: "Pathognomonic Finding",
    category: "mentalStatus",
    anticholinergic: "Anhidrosis (dry axillae) + dilated pupils + delirium",
    cholinergic: "Killer Bs (Bronchorrhea, Bronchospasm, Bradycardia) + fasciculations",
    opioid: "Bradypnea (< 8 bpm) + Pinpoint pupils + Coma",
    sympathomimetic: "Diaphoresis + Dilated pupils + Hypertension + Tachycardia",
    sedativeHypnotic: "Coma with relatively preserved vitals & midposition pupils",
    serotonergic: "Clonus (spontaneous, inducible, or ocular) + lower limb hyperreflexia",
    discriminatorHighlight: "Single most specific physical sign for each respective toxidrome.",
  },
];

export interface ToxidromeObservedSigns {
  pupils?: "mydriasis" | "miosis" | "normal";
  skin?: "dry" | "diaphoretic" | "normal";
  heartRate?: "tachycardia" | "bradycardia" | "normal";
  bloodPressure?: "hypertension" | "hypotension" | "normal";
  respiratoryRate?: "tachypnea" | "bradypnea" | "normal";
  temperature?: "hyperthermia" | "hypothermia" | "normal";
  bowelSounds?: "hyperactive" | "hypoactive" | "normal";
  neuromuscular?: "clonus" | "fasciculations" | "tremor" | "hyporeflexia" | "normal";
  mentalStatus?: "agitation" | "delirium" | "coma" | "normal";
}

export interface ToxidromeMatchResult {
  toxidrome: ClassicalToxidrome;
  matchScore: number;
  totalEvaluated: number;
  confidenceTier: "High" | "Moderate" | "Low";
  matchingFeatures: string[];
  divergentFeatures: string[];
  discriminatingPearls: string[];
  clinicalRationale: string;
}

export interface DetectedToxidromeTrayResult {
  toxidrome?: ClassicalToxidrome;
  matchedCausativeDrugIds: string[];
  matchedCausativeDrugNames: string[];
  matchedAntidoteDrugIds: string[];
  matchedAntidoteDrugNames: string[];
  antidotePathway?: AntidotePathway;
  recommendedAntidoteDrugId?: string;
  recommendedAntidoteName?: string;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

export function getAllToxidromes(): readonly ClassicalToxidrome[] {
  return CLASSICAL_TOXIDROMES;
}

export function getToxidromeById(id: string): ClassicalToxidrome | undefined {
  return CLASSICAL_TOXIDROMES.find((t) => t.id === id);
}

export function getAllAntidotes(): readonly AntidotePathway[] {
  return ANTIDOTE_PATHWAYS;
}

export function getAntidoteById(id: string): AntidotePathway | undefined {
  return ANTIDOTE_PATHWAYS.find((a) => a.id === id);
}

export function matchToxidromeSigns(signs: Partial<ToxidromeObservedSigns>): ToxidromeMatchResult[] {
  const evaluatedKeys = Object.entries(signs).filter(([, v]) => v !== undefined && v !== "normal");
  const totalEvaluated = evaluatedKeys.length;

  return CLASSICAL_TOXIDROMES.map((t) => {
    const matching: string[] = [];
    const divergent: string[] = [];
    let score = 0;

    // 1) Pupils
    if (signs.pupils) {
      if (signs.pupils === "mydriasis") {
        if (["anticholinergic", "sympathomimetic", "serotonergic"].includes(t.id)) {
          matching.push("Mydriasis (dilated pupils)");
          score += 2;
        } else {
          divergent.push("Expected normal or pinpoint pupils, but mydriasis was observed");
        }
      } else if (signs.pupils === "miosis") {
        if (["cholinergic", "opioid"].includes(t.id)) {
          matching.push("Miosis (pinpoint pupils)");
          score += 2;
        } else {
          divergent.push("Expected dilated or midposition pupils, but pinpoint pupils were observed");
        }
      }
    }

    // 2) Skin (Sweating vs Dry Skin discriminator!)
    if (signs.skin) {
      if (signs.skin === "dry") {
        if (t.id === "anticholinergic") {
          matching.push("Anhidrosis / dry skin (key anticholinergic hallmark)");
          score += 3;
        } else if (t.id === "sedative-hypnotic" || t.id === "opioid") {
          matching.push("Dry or non-diaphoretic skin");
          score += 1;
        } else {
          divergent.push("Expected diaphoresis / profuse sweating, but bone dry skin was observed");
        }
      } else if (signs.skin === "diaphoretic") {
        if (["sympathomimetic", "cholinergic", "serotonergic"].includes(t.id)) {
          matching.push("Diaphoresis (profuse sweating)");
          score += 3;
        } else if (t.id === "anticholinergic") {
          divergent.push("CRITICAL DIVERGENCE: Anticholinergic toxidrome presents with anhidrosis (dry skin), not sweating");
        } else {
          divergent.push("Expected non-diaphoretic skin, but sweating was observed");
        }
      }
    }

    // 3) Heart Rate
    if (signs.heartRate) {
      if (signs.heartRate === "tachycardia") {
        if (["anticholinergic", "sympathomimetic", "serotonergic"].includes(t.id)) {
          matching.push("Tachycardia");
          score += 2;
        } else {
          divergent.push("Expected bradycardia or normal heart rate, but tachycardia was observed");
        }
      } else if (signs.heartRate === "bradycardia") {
        if (["cholinergic", "opioid"].includes(t.id)) {
          matching.push("Bradycardia");
          score += 2;
        } else {
          divergent.push("Expected tachycardia, but bradycardia was observed");
        }
      }
    }

    // 4) Blood Pressure
    if (signs.bloodPressure) {
      if (signs.bloodPressure === "hypertension") {
        if (["sympathomimetic", "serotonergic", "anticholinergic"].includes(t.id)) {
          matching.push("Hypertension");
          score += 1.5;
        } else {
          divergent.push("Expected hypotension or normotension, but hypertension was observed");
        }
      } else if (signs.bloodPressure === "hypotension") {
        if (["opioid", "cholinergic", "sedative-hypnotic"].includes(t.id)) {
          matching.push("Hypotension");
          score += 1.5;
        } else {
          divergent.push("Expected hypertension or normotension, but hypotension was observed");
        }
      }
    }

    // 5) Respiratory Rate
    if (signs.respiratoryRate) {
      if (signs.respiratoryRate === "bradypnea") {
        if (t.id === "opioid") {
          matching.push("Severe bradypnea (pathognomonic opioid triad element)");
          score += 3;
        } else if (t.id === "sedative-hypnotic") {
          matching.push("Depressed respiratory rate");
          score += 1.5;
        } else {
          divergent.push("Expected normal or elevated respiratory rate, but bradypnea was observed");
        }
      } else if (signs.respiratoryRate === "tachypnea") {
        if (["sympathomimetic", "serotonergic", "anticholinergic", "cholinergic"].includes(t.id)) {
          matching.push("Tachypnea");
          score += 1;
        } else {
          divergent.push("Expected bradypnea, but tachypnea was observed");
        }
      }
    }

    // 6) Temperature
    if (signs.temperature) {
      if (signs.temperature === "hyperthermia") {
        if (["anticholinergic", "sympathomimetic", "serotonergic"].includes(t.id)) {
          matching.push("Hyperthermia");
          score += 2;
        } else {
          divergent.push("Expected hypothermia or normothermia, but hyperthermia was observed");
        }
      } else if (signs.temperature === "hypothermia") {
        if (["opioid", "sedative-hypnotic", "cholinergic"].includes(t.id)) {
          matching.push("Hypothermia");
          score += 1.5;
        } else {
          divergent.push("Expected hyperthermia, but hypothermia was observed");
        }
      }
    }

    // 7) Bowel Sounds
    if (signs.bowelSounds) {
      if (signs.bowelSounds === "hyperactive") {
        if (["cholinergic", "serotonergic", "sympathomimetic"].includes(t.id)) {
          matching.push("Hyperactive bowel sounds");
          score += 2;
        } else {
          divergent.push("Expected hypoactive or absent bowel sounds, but hyperactive bowel sounds were observed");
        }
      } else if (signs.bowelSounds === "hypoactive") {
        if (["anticholinergic", "opioid", "sedative-hypnotic"].includes(t.id)) {
          matching.push("Hypoactive / absent bowel sounds");
          score += 2;
        } else {
          divergent.push("Expected hyperactive bowel sounds, but hypoactive bowel sounds were observed");
        }
      }
    }

    // 8) Neuromuscular
    if (signs.neuromuscular) {
      if (signs.neuromuscular === "clonus") {
        if (t.id === "serotonergic") {
          matching.push("Clonus (pathognomonic Hunter criteria finding)");
          score += 4;
        } else {
          divergent.push("Clonus is strongly characteristic of serotonin toxicity, not this toxidrome");
        }
      } else if (signs.neuromuscular === "fasciculations") {
        if (t.id === "cholinergic") {
          matching.push("Muscle fasciculations (nicotinic motor endplate hallmark)");
          score += 4;
        } else {
          divergent.push("Fasciculations specifically point toward cholinergic nicotinic excess");
        }
      } else if (signs.neuromuscular === "tremor") {
        if (["serotonergic", "sympathomimetic", "anticholinergic"].includes(t.id)) {
          matching.push("Tremor / motor restlessness");
          score += 1.5;
        }
      } else if (signs.neuromuscular === "hyporeflexia") {
        if (["opioid", "sedative-hypnotic"].includes(t.id)) {
          matching.push("Hyporeflexia / generalized motor depression");
          score += 2;
        } else {
          divergent.push("Expected hyperreflexia or clonus, but hyporeflexia was observed");
        }
      }
    }

    // 9) Mental Status
    if (signs.mentalStatus) {
      if (signs.mentalStatus === "delirium") {
        if (t.id === "anticholinergic") {
          matching.push("Muttering delirium and hallucinations ('mad as a hatter')");
          score += 3;
        } else if (t.id === "serotonergic" || t.id === "sympathomimetic") {
          matching.push("Agitated delirium / confusion");
          score += 1.5;
        }
      } else if (signs.mentalStatus === "agitation") {
        if (["sympathomimetic", "serotonergic", "anticholinergic"].includes(t.id)) {
          matching.push("Agitation / psychomotor restlessness");
          score += 2;
        } else {
          divergent.push("Expected sedation or coma, but agitation was observed");
        }
      } else if (signs.mentalStatus === "coma") {
        if (["opioid", "sedative-hypnotic"].includes(t.id)) {
          matching.push("Stupor / coma");
          score += 2.5;
        } else if (t.id === "cholinergic") {
          matching.push("Severe central respiratory depression / coma");
          score += 1;
        } else {
          divergent.push("Expected agitation or delirium, but deep coma was observed");
        }
      }
    }

    // Calculate confidence tier
    let confidenceTier: "High" | "Moderate" | "Low" = "Low";
    if (score >= 6 && divergent.length === 0) {
      confidenceTier = "High";
    } else if (score >= 4 && divergent.length <= 1) {
      confidenceTier = "Moderate";
    }

    // Generate clinical rationale
    let clinicalRationale = `${matching.length} matching feature(s) identified for ${t.name}.`;
    if (divergent.length > 0) {
      clinicalRationale += ` Note ${divergent.length} clinical divergence(s) requiring careful differential consideration.`;
    }

    return {
      toxidrome: t,
      matchScore: Math.round(score * 10) / 10,
      totalEvaluated,
      confidenceTier,
      matchingFeatures: matching,
      divergentFeatures: divergent,
      discriminatingPearls: t.diagnosticPearls,
      clinicalRationale,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

export function detectToxidromesOnTray(drugIds: string[]): DetectedToxidromeTrayResult[] {
  if (!drugIds.length) return [];

  const results: DetectedToxidromeTrayResult[] = [];

  for (const toxidrome of CLASSICAL_TOXIDROMES) {
    const matchedCausative = drugIds.filter((id) => toxidrome.associatedDrugIds.includes(id));

    if (matchedCausative.length > 0) {
      const matchedAntidotes = drugIds.filter(
        (id) =>
          (toxidrome.primaryAntidote.antidoteDrugId && id === toxidrome.primaryAntidote.antidoteDrugId) ||
          (toxidrome.id === "opioid" && id === "naloxone") ||
          (toxidrome.id === "anticholinergic" && id === "physostigmine") ||
          (toxidrome.id === "cholinergic" && (id === "atropine" || id === "pralidoxime")) ||
          (toxidrome.id === "sedative-hypnotic" && id === "flumazenil") ||
          (toxidrome.id === "serotonergic" && id === "cyproheptadine"),
      );

      const pathway = ANTIDOTE_PATHWAYS.find((p) => p.id === toxidrome.primaryAntidote.antidotePathwayId);

      results.push({
        toxidrome,
        matchedCausativeDrugIds: matchedCausative,
        matchedCausativeDrugNames: matchedCausative.map((id) => DRUG_BY_ID[id]?.name ?? id),
        matchedAntidoteDrugIds: matchedAntidotes,
        matchedAntidoteDrugNames: matchedAntidotes.map((id) => DRUG_BY_ID[id]?.name ?? id),
        antidotePathway: pathway,
        recommendedAntidoteDrugId: toxidrome.primaryAntidote.antidoteDrugId,
        recommendedAntidoteName: toxidrome.primaryAntidote.name,
      });
    }
  }

  // Also check if any antidote pathway's toxins are on the desk tray
  for (const pathway of ANTIDOTE_PATHWAYS) {
    const matchedToxins = drugIds.filter((id) => pathway.toxinDrugIds.includes(id));
    if (matchedToxins.length > 0) {
      const alreadyIncluded = results.some((r) => r.antidotePathway?.id === pathway.id);
      if (!alreadyIncluded) {
        let linkedToxidrome: ClassicalToxidrome | undefined;
        if (pathway.id === "sodium-bicarbonate-tca") {
          linkedToxidrome = getToxidromeById("anticholinergic");
        } else if (pathway.id === "pralidoxime-organophosphates" || pathway.id === "atropine-cholinergic") {
          linkedToxidrome = getToxidromeById("cholinergic");
        } else if (pathway.id === "naloxone-opioid") {
          linkedToxidrome = getToxidromeById("opioid");
        }

        const matchedAntidotes = drugIds.filter((id) => id === pathway.antidoteDrugId);
        results.push({
          toxidrome: linkedToxidrome,
          matchedCausativeDrugIds: matchedToxins,
          matchedCausativeDrugNames: matchedToxins.map((id) => DRUG_BY_ID[id]?.name ?? id),
          matchedAntidoteDrugIds: matchedAntidotes,
          matchedAntidoteDrugNames: matchedAntidotes.map((id) => DRUG_BY_ID[id]?.name ?? id),
          antidotePathway: pathway,
          recommendedAntidoteDrugId: pathway.antidoteDrugId,
          recommendedAntidoteName: pathway.name,
        });
      }
    }
  }

  return results;
}
