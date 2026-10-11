/**
 * GPCR & Second Messenger Signaling Switchboard
 * Educational clinical pharmacology decision-support database.
 *
 * FD&C Act § 520(o)(1)(E) non-prescriptive regulatory posture:
 * Educational decision support; cites peer-reviewed autonomic and molecular pharmacology literature;
 * no patient-specific dosing or prescriptive directives.
 */

export type GProteinType = "Gq" | "Gs" | "Gi" | "PDE";

export interface CascadeStep {
  stepNumber: number;
  title: string;
  stage: "receptor" | "g-protein" | "effector" | "second-messenger" | "kinase" | "action";
  component: string;
  mechanism: string;
}

export interface TissueResponse {
  tissue: string;
  receptorOrTarget: string;
  mechanism: string;
  physiologicalEffect: string;
}

export interface ClinicalDrugTarget {
  drugId: string;
  drugName: string;
  action: string;
  clinicalUse: string;
  targetReceptorOrEnzyme?: string;
}

export interface PharmacologyPearl {
  title: string;
  description: string;
  category: "mnemonic" | "collision" | "autonomic" | "receptor-tradeoff";
}

export interface GProteinPathway {
  id: string;
  gProtein: GProteinType;
  name: string;
  mnemonic: string;
  primaryReceptors: string[];
  effectorEnzyme: string;
  secondMessengers: string[];
  downstreamKinase: string;
  cellularResponse: string;
  molecularCascadeSummary: string;
  molecularSteps: CascadeStep[];
  tissueResponses: TissueResponse[];
  clinicalDrugTargets: ClinicalDrugTarget[];
  pharmacologyPearls: PharmacologyPearl[];
  regulatoryNotice: string;
  citations: string[];
}

export const G_PROTEIN_REGULATORY_DISCLAIMER =
  "FirstPass G-Protein Signaling Switchboard is an educational clinical pharmacology reference under Section 520(o)(1)(E) of the Federal Food, Drug, and Cosmetic Act (FD&C Act § 520(o)(1)(E)). It provides non-prescriptive educational decision-support describing autonomic, GPCR, and second messenger signaling cascades based on peer-reviewed molecular pharmacology literature. It does not provide medical diagnoses, treatment directives, or patient-specific dosing directives. Clinicians must consult full FDA-approved prescribing information and exercise independent clinical judgment.";

export const G_PROTEIN_CITATIONS: readonly string[] = [
  "Brunton LL, Hilal-Dandan R, Knollmann BC, eds. Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. McGraw-Hill; 2023.",
  "Katzung BG, Vanderah TW, eds. Basic & Clinical Pharmacology. 15th ed. McGraw-Hill; 2021.",
  "Pierce KL, Premont RT, Lefkowitz RJ. Seven-transmembrane receptors. Nat Rev Mol Cell Biol. 2002;3(9):639-650. doi:10.1038/nrm912.",
  "Gilman AG. G proteins: transducers of receptor-generated signals. Annu Rev Biochem. 1987;56:615-649. doi:10.1146/annurev.bi.56.070187.003151.",
  "Francis SH, Blount MA, Corbin JD. Mammalian cyclic nucleotide phosphodiesterases: molecular mechanisms and physiological functions. Physiol Rev. 2011;91(2):651-690. doi:10.1152/physrev.00030.2010.",
  "Webb RC. Smooth muscle contraction and relaxation. Adv Physiol Educ. 2003;27(4):201-206. doi:10.1152/advan.00025.2003.",
];

export const G_PROTEIN_PATHWAYS: readonly GProteinPathway[] = [
  {
    id: "gq-phospholipase-c",
    gProtein: "Gq",
    name: "Gq Cascade (Phospholipase C-β / IP3-DAG Axis)",
    mnemonic: "HAVe 1 M&M (H1, Alpha-1, V1, M1, M3, M5)",
    primaryReceptors: ["H1", "Alpha-1", "V1", "M1", "M3", "M5", "5-HT2A", "5-HT2C"],
    effectorEnzyme: "Phospholipase C-beta (PLCβ)",
    secondMessengers: [
      "Inositol 1,4,5-trisphosphate (IP3)",
      "Diacylglycerol (DAG)",
      "Calcium (Ca2+)",
    ],
    downstreamKinase: "Protein Kinase C (PKC) & Ca2+/Calmodulin-dependent Kinases (CaMK)",
    cellularResponse:
      "Vascular smooth muscle contraction (Alpha-1 vasoconstriction), bronchial smooth muscle contraction (H1 bronchoconstriction), glandular secretion (M3 salivation/lacrimation), ocular pupillary sphincter constriction (M3 miosis).",
    molecularCascadeSummary:
      "Ligand binds GPCR -> Galpha-q activation -> Phospholipase C-beta (PLC) stimulation -> Cleaves PIP2 into Inositol 1,4,5-trisphosphate (IP3) and Diacylglycerol (DAG) -> IP3 binds IP3R on endoplasmic/sarcoplasmic reticulum releasing Ca2+; DAG + Ca2+ activate Protein Kinase C (PKC).",
    molecularSteps: [
      {
        stepNumber: 1,
        title: "Ligand Binding",
        stage: "receptor",
        component: "GPCR (H1, Alpha-1, V1, M1, M3, M5, 5-HT2A)",
        mechanism:
          "Agonist binding triggers conformational change in 7-transmembrane receptor, inducing intracellular coupling to heterotrimeric Gq protein.",
      },
      {
        stepNumber: 2,
        title: "Gαq Subunit Activation",
        stage: "g-protein",
        component: "Gαq Heterotrimer",
        mechanism:
          "Gαq exchanges GDP for GTP and dissociates from the Gβγ heterodimer to adopt an active GTP-bound effector conformation.",
      },
      {
        stepNumber: 3,
        title: "PLCβ Stimulation",
        stage: "effector",
        component: "Phospholipase C-beta (PLCβ)",
        mechanism:
          "Active Gαq-GTP binds and stimulates membrane-anchored Phospholipase C-beta (PLCβ) on the inner leaflet of the plasma membrane.",
      },
      {
        stepNumber: 4,
        title: "PIP2 Cleavage into IP3 & DAG",
        stage: "second-messenger",
        component: "IP3 and Diacylglycerol (DAG)",
        mechanism:
          "PLCβ cleaves phosphatidylinositol 4,5-bisphosphate (PIP2) into soluble Inositol 1,4,5-trisphosphate (IP3) and membrane-bound Diacylglycerol (DAG).",
      },
      {
        stepNumber: 5,
        title: "Sarcoplasmic Ca2+ Efflux & PKC Activation",
        stage: "kinase",
        component: "IP3R & Protein Kinase C (PKC)",
        mechanism:
          "IP3 diffuses to endoplasmic/sarcoplasmic reticulum binding IP3 receptors (IP3R) to trigger Ca2+ release; DAG + Ca2+ recruit and activate Protein Kinase C (PKC).",
      },
      {
        stepNumber: 6,
        title: "Downstream Physiological Action",
        stage: "action",
        component: "Calmodulin-MLCK & Exocytic Machinery",
        mechanism:
          "Ca2+-Calmodulin complexes activate Myosin Light Chain Kinase (MLCK) in vascular/bronchial smooth muscle, driving actin-myosin crossbridge cycling and exocrine secretion.",
      },
    ],
    tissueResponses: [
      {
        tissue: "Vascular Smooth Muscle",
        receptorOrTarget: "Alpha-1 Adrenergic",
        mechanism: "Ca2+-Calmodulin activation of MLCK initiates myosin phosphorylation.",
        physiologicalEffect:
          "Arteriolar and venular vasoconstriction, increased systemic vascular resistance (SVR), and elevated mean arterial pressure.",
      },
      {
        tissue: "Bronchial Smooth Muscle",
        receptorOrTarget: "Histamine H1",
        mechanism: "Elevated intracellular Ca2+ induces airway smooth muscle contraction.",
        physiologicalEffect:
          "Bronchoconstriction and increased airway resistance during allergic/anaphylactoid responses.",
      },
      {
        tissue: "Exocrine Glands (Salivary, Lacrimal, Sweat)",
        receptorOrTarget: "Muscarinic M3",
        mechanism: "Ca2+ triggers exocytosis of secretory vesicles in acinar cells.",
        physiologicalEffect:
          "Copious glandular secretion: salivation, lacrimation, and diaphoresis (SLUDGE syndrome component).",
      },
      {
        tissue: "Eye (Pupillary Sphincter Muscle)",
        receptorOrTarget: "Muscarinic M3",
        mechanism: "Circumferential pupillary sphincter smooth muscle contraction via Ca2+ surge.",
        physiologicalEffect:
          "Miosis (pupillary constriction) and ciliary muscle contraction facilitating aqueous humor outflow.",
      },
    ],
    clinicalDrugTargets: [
      {
        drugId: "prazosin",
        drugName: "Prazosin",
        action: "Selective Alpha-1 adrenergic antagonist",
        clinicalUse:
          "Antihypertensive therapy, urinary obstruction relief in benign prostatic hyperplasia (BPH), and off-label reduction of PTSD-associated nightmares.",
        targetReceptorOrEnzyme: "Alpha-1",
      },
      {
        drugId: "clonidine",
        drugName: "Clonidine",
        action: "Centrally acting sympatholytic reference agent",
        clinicalUse:
          "Serves as central autonomic counterweight; stimulates presynaptic Alpha-2 (Gi) autoreceptors, quenching descending sympathetic drive and opposing peripheral Gq vasoconstriction.",
        targetReceptorOrEnzyme: "Alpha-2 / Autonomic switchboard",
      },
      {
        drugId: "atropine",
        drugName: "Atropine",
        action: "Non-selective competitive muscarinic antagonist",
        clinicalUse:
          "Emergency management of symptomatic sinus bradycardia, antidote for organophosphate/cholinesterase-inhibitor poisoning, and therapeutic mydriasis.",
        targetReceptorOrEnzyme: "M1, M2, M3",
      },
      {
        drugId: "diphenhydramine",
        drugName: "Diphenhydramine",
        action: "First-generation Histamine H1 antagonist (inverse agonist)",
        clinicalUse:
          "Immediate-type hypersensitivity allergic reactions, acute urticaria, motion sickness, and nighttime sedation.",
        targetReceptorOrEnzyme: "H1",
      },
      {
        drugId: "epinephrine",
        drugName: "Epinephrine",
        action: "Potent non-selective adrenergic agonist (Alpha-1, Beta-1, Beta-2)",
        clinicalUse:
          "First-line emergency pharmacotherapy for anaphylaxis (Alpha-1 Gq vasoconstriction reverses shock and mucosal edema; Beta-2 Gs reverses bronchospasm).",
        targetReceptorOrEnzyme: "Alpha-1, Beta-1, Beta-2",
      },
    ],
    pharmacologyPearls: [
      {
        title: "Autonomic Mnemonic: 'HAVe 1 M&M'",
        description:
          "Classical USMLE/NAPLEX mnemonic for Gq-coupled GPCRs: H1, Alpha-1, V1, M1, M3, M5 ('HAVe 1 M&M'). All converge on Phospholipase C-beta, generating IP3 and DAG to mobilize intracellular calcium.",
        category: "mnemonic",
      },
      {
        title: "Atropine Antidotal Mechanism in Cholinergic Poisoning",
        description:
          "Cholinesterase inhibitors (organophosphates, sarin) cause massive synaptic acetylcholine accumulation, hyperstimulating M1, M3, and M5 Gq pathways. Atropine competitive blockade halts lethal bronchorrhea and bronchoconstriction.",
        category: "collision",
      },
      {
        title: "Alpha-1 Antagonist First-Dose Orthostatic Syncope",
        description:
          "Prazosin abruptly removes tonic Gq-mediated vascular smooth muscle contraction. The sudden loss of peripheral vascular tone can precipitate marked orthostatic hypotension and syncope with the initial dose.",
        category: "autonomic",
      },
    ],
    regulatoryNotice:
      "Educational decision support under FD&C Act § 520(o)(1)(E). Autonomic receptor signaling data is derived from peer-reviewed pharmacology textbooks. No prescriptive dosing directives are provided.",
    citations: [
      "Brunton LL, et al. Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. 2023.",
      "Pierce KL, et al. Seven-transmembrane receptors. Nat Rev Mol Cell Biol. 2002;3(9):639-650.",
      "Webb RC. Smooth muscle contraction and relaxation. Adv Physiol Educ. 2003;27(4):201-206.",
    ],
  },
  {
    id: "gs-adenylyl-cyclase",
    gProtein: "Gs",
    name: "Gs Cascade (Adenylyl Cyclase / cAMP / PKA Axis)",
    mnemonic: "Beta-1, Beta-2, D1, H2, V2",
    primaryReceptors: ["Beta-1", "Beta-2", "Beta-3", "D1", "D5", "H2", "V2", "5-HT4", "5-HT7"],
    effectorEnzyme: "Adenylyl Cyclase (AC) [Stimulated]",
    secondMessengers: ["Cyclic AMP (cAMP)"],
    downstreamKinase: "Protein Kinase A (PKA)",
    cellularResponse:
      "Beta-1 in heart: positive inotropy, chronotropy, dromotropy via Cav1.2 and phospholamban; Beta-2 in smooth muscle: bronchodilation and vasodilation via MLCK inactivation; V2 in kidney: Aquaporin-2 insertion and water reabsorption; H2 in stomach: gastric acid secretion via proton pump stimulation.",
    molecularCascadeSummary:
      "Ligand binds GPCR -> Galpha-s activation -> Adenylyl Cyclase (AC) stimulation -> Converts ATP to cyclic AMP (cAMP) -> Activates Protein Kinase A (PKA) -> Phosphorylates target enzymes and ion channels.",
    molecularSteps: [
      {
        stepNumber: 1,
        title: "Ligand Binding",
        stage: "receptor",
        component: "GPCR (Beta-1, Beta-2, Beta-3, D1, H2, V2)",
        mechanism:
          "Agonist binding stabilizes the active receptor conformation, promoting high-affinity coupling to the heterotrimeric Gs protein.",
      },
      {
        stepNumber: 2,
        title: "Gαs Subunit Activation",
        stage: "g-protein",
        component: "Gαs Heterotrimer",
        mechanism:
          "Gαs exchanges GDP for GTP and releases the Gβγ dimer, allowing active Gαs-GTP to diffuse laterally across the plasma membrane.",
      },
      {
        stepNumber: 3,
        title: "Adenylyl Cyclase Stimulation",
        stage: "effector",
        component: "Adenylyl Cyclase (AC)",
        mechanism:
          "Gαs-GTP binds the catalytic domain of transmembrane Adenylyl Cyclase, stimulating enzymatic synthesis of cyclic nucleotides.",
      },
      {
        stepNumber: 4,
        title: "cAMP Second Messenger Generation",
        stage: "second-messenger",
        component: "Cyclic AMP (cAMP)",
        mechanism:
          "Stimulated Adenylyl Cyclase converts intracellular ATP into cyclic adenosine monophosphate (cAMP) with pyrophosphate release.",
      },
      {
        stepNumber: 5,
        title: "Protein Kinase A (PKA) Activation",
        stage: "kinase",
        component: "Protein Kinase A (PKA)",
        mechanism:
          "Four cAMP molecules bind cooperatively to the regulatory subunits of PKA holoenzyme, releasing active catalytic PKA monomers.",
      },
      {
        stepNumber: 6,
        title: "Target Phosphorylation & Cellular Action",
        stage: "action",
        component: "Cav1.2, Phospholamban, MLCK, Aquaporin-2, H+/K+ ATPase",
        mechanism:
          "PKA phosphorylates tissue-specific substrates: Cav1.2 and phospholamban in myocytes (contractility); MLCK in smooth muscle (relaxation); Aquaporin-2 vesicle translocation in collecting ducts; H+/K+ ATPase in parietal cells.",
      },
    ],
    tissueResponses: [
      {
        tissue: "Heart (Myocardium & Conduction System)",
        receptorOrTarget: "Beta-1 Adrenergic",
        mechanism:
          "PKA phosphorylates L-type Ca2+ channels (Cav1.2) and phospholamban, accelerating SERCA2a Ca2+ reuptake.",
        physiologicalEffect:
          "Positive inotropy (contractility), positive chronotropy (heart rate), and positive dromotropy (AV conduction velocity).",
      },
      {
        tissue: "Bronchial & Vascular Smooth Muscle",
        receptorOrTarget: "Beta-2 Adrenergic",
        mechanism:
          "PKA phosphorylates and inactivates Myosin Light Chain Kinase (MLCK), lowering myosin sensitivity to calcium.",
        physiologicalEffect:
          "Smooth muscle relaxation, potent bronchodilation, and peripheral vasodilation.",
      },
      {
        tissue: "Renal Collecting Duct Principal Cells",
        receptorOrTarget: "Vasopressin V2",
        mechanism:
          "PKA triggers microtubule-directed exocytic insertion of Aquaporin-2 water channel vesicles into apical luminal membrane.",
        physiologicalEffect:
          "Increased free water reabsorption, urine concentration, and systemic water retention.",
      },
      {
        tissue: "Gastric Parietal Cells",
        receptorOrTarget: "Histamine H2",
        mechanism:
          "PKA stimulation promotes vesicle fusion and activation of the apical H+/K+ ATPase proton pump.",
        physiologicalEffect:
          "Increased hydrochloric acid secretion into the gastric lumen.",
      },
    ],
    clinicalDrugTargets: [
      {
        drugId: "albuterol",
        drugName: "Albuterol",
        action: "Short-acting selective Beta-2 adrenergic agonist",
        clinicalUse:
          "Rapid bronchodilation for acute relief of bronchospasm in asthma and chronic obstructive pulmonary disease (COPD).",
        targetReceptorOrEnzyme: "Beta-2",
      },
      {
        drugId: "metoprolol",
        drugName: "Metoprolol",
        action: "Cardioselective Beta-1 adrenergic antagonist",
        clinicalUse:
          "Ventricular rate control in atrial fibrillation, antianginal therapy, post-myocardial infarction cardioprotection, and chronic heart failure mortality reduction.",
        targetReceptorOrEnzyme: "Beta-1",
      },
      {
        drugId: "famotidine",
        drugName: "Famotidine",
        action: "Competitive Histamine H2 receptor antagonist",
        clinicalUse:
          "Reduction of gastric acid secretion in gastroesophageal reflux disease (GERD), active peptic ulcer disease, and stress ulcer prophylaxis.",
        targetReceptorOrEnzyme: "H2",
      },
      {
        drugId: "desmopressin",
        drugName: "Desmopressin",
        action: "Selective Vasopressin V2 receptor agonist",
        clinicalUse:
          "Central diabetes insipidus management, primary nocturnal enuresis, and release of endothelial von Willebrand factor / factor VIII.",
        targetReceptorOrEnzyme: "V2",
      },
      {
        drugId: "dobutamine",
        drugName: "Dobutamine",
        action: "Synthetic Beta-1 inotropic adrenergic agonist",
        clinicalUse:
          "Short-term intravenous inotropic support in severe cardiogenic shock and refractory decompensated heart failure.",
        targetReceptorOrEnzyme: "Beta-1",
      },
    ],
    pharmacologyPearls: [
      {
        title: "Autonomic Mnemonic: 'Beta-1, Beta-2, D1, H2, V2'",
        description:
          "Classical mnemonic for major Gs-coupled receptors: all Beta-adrenergic receptors (Beta-1, Beta-2, Beta-3) plus D1, H2, and V2. All stimulate adenylyl cyclase to elevate cAMP and activate PKA.",
        category: "mnemonic",
      },
      {
        title: "Beta-1 Cardiac Inotropy vs Beta-2 Bronchial Relaxation Paradox",
        description:
          "Both receptors activate the identical Gs -> cAMP -> PKA cascade, yet produce opposite contractile responses. In cardiac myocytes, PKA phosphorylates Cav1.2 and phospholamban (increasing Ca2+ turnover and contraction). In smooth muscle, PKA phosphorylates and inactivates MLCK, preventing contraction and forcing relaxation.",
        category: "receptor-tradeoff",
      },
      {
        title: "Beta-Blocker + Beta-Agonist Pharmacodynamic Collision",
        description:
          "Non-selective beta-blockers (e.g. propranolol, carvedilol) or high-dose cardioselective blockers competitively displace albuterol from bronchial Beta-2 receptors, blocking Gs-cAMP activation and precipitating bronchospasm.",
        category: "collision",
      },
    ],
    regulatoryNotice:
      "Educational decision support under FD&C Act § 520(o)(1)(E). Autonomic receptor signaling data is derived from peer-reviewed pharmacology textbooks. No prescriptive dosing directives are provided.",
    citations: [
      "Brunton LL, et al. Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. 2023.",
      "Katzung BG, Vanderah TW. Basic & Clinical Pharmacology. 15th ed. 2021.",
      "Gilman AG. G proteins: transducers of receptor-generated signals. Annu Rev Biochem. 1987;56:615-649.",
    ],
  },
  {
    id: "gi-adenylyl-cyclase-inhibition",
    gProtein: "Gi",
    name: "Gi Cascade (Adenylyl Cyclase Inhibition / GIRK Activation Axis)",
    mnemonic: "MAD 2s: M2, Alpha-2, D2",
    primaryReceptors: [
      "M2",
      "M4",
      "Alpha-2",
      "D2",
      "D3",
      "D4",
      "5-HT1A",
      "Mu-Opioid (MOR)",
      "Kappa-Opioid (KOR)",
      "Delta-Opioid (DOR)",
      "GABA-B",
    ],
    effectorEnzyme: "Adenylyl Cyclase (AC) [Inhibited] & GIRK Channels [Activated]",
    secondMessengers: [
      "Decreased cyclic AMP (↓cAMP)",
      "Potassium (K+ efflux)",
      "Decreased intracellular Calcium (↓Ca2+ influx)",
    ],
    downstreamKinase: "Dampened Protein Kinase A (↓PKA) & Gβγ Effector Signaling",
    cellularResponse:
      "M2 in SA/AV node: opens GIRK channels causing hyperpolarization and slowing heart rate; Alpha-2 on presynaptic terminals: inhibits Ca2+ influx halting norepinephrine release; Mu-opioid in pain pathways: hyperpolarizes dorsal horn neurons and blocks substance P release producing analgesia and respiratory depression.",
    molecularCascadeSummary:
      "Ligand binds GPCR -> Galpha-i activation -> Inhibits Adenylyl Cyclase -> drops intracellular cAMP -> dampens PKA activity; Gbeta-gamma subunits directly activate GIRK (G-protein-coupled inwardly rectifying potassium) channels (causing K+ efflux and hyperpolarization) and close presynaptic N-type voltage-gated calcium channels.",
    molecularSteps: [
      {
        stepNumber: 1,
        title: "Ligand Binding",
        stage: "receptor",
        component: "GPCR (M2, Alpha-2, D2, Mu-Opioid, GABA-B)",
        mechanism:
          "Agonist binding stabilizes the Gi-preferred receptor conformation, inducing guanine nucleotide exchange on heterotrimeric Gi/o proteins.",
      },
      {
        stepNumber: 2,
        title: "Gαi Subunit & Gβγ Dissociation",
        stage: "g-protein",
        component: "Gαi Heterotrimer",
        mechanism:
          "Gαi exchanges GDP for GTP and dissociates from Gβγ. Both arms actively transduce distinct downstream inhibitory signals.",
      },
      {
        stepNumber: 3,
        title: "Adenylyl Cyclase Inhibition",
        stage: "effector",
        component: "Adenylyl Cyclase (AC) [Inhibited]",
        mechanism:
          "Active Gαi-GTP directly binds catalytic domains of Adenylyl Cyclase isoforms, inhibiting cAMP enzymatic generation.",
      },
      {
        stepNumber: 4,
        title: "Direct Gβγ Ion Channel Modulation",
        stage: "effector",
        component: "GIRK (Kir3) & N-type Ca2+ (Cav2.2) Channels",
        mechanism:
          "Freed Gβγ subunits directly bind and open inwardly rectifying potassium channels (GIRK/IK,ACh) and inhibit voltage-gated N-type calcium channels.",
      },
      {
        stepNumber: 5,
        title: "cAMP Drop & Membrane Hyperpolarization",
        stage: "second-messenger",
        component: "Decreased cAMP & K+ Efflux",
        mechanism:
          "Intracellular cAMP plummets, extinguishing baseline PKA activity; K+ efflux hyperpolarizes excitable neuronal and nodal membranes away from threshold.",
      },
      {
        stepNumber: 6,
        title: "Downstream Physiological Action",
        stage: "action",
        component: "SA/AV Nodal Slowing & Exocytosis Blockade",
        mechanism:
          "In SA/AV nodes, IK,ACh hyperpolarization slows phase 4 depolarization (bradycardia); presynaptically, Ca2+ channel closure halts neurotransmitter exocytosis.",
      },
    ],
    tissueResponses: [
      {
        tissue: "Sinoatrial (SA) & Atrioventricular (AV) Nodes",
        receptorOrTarget: "Muscarinic M2",
        mechanism:
          "Gβγ opens GIRK channels (IK,ACh) inducing K+ efflux and membrane hyperpolarization, while Gαi lowers cAMP and funny current (If).",
        physiologicalEffect:
          "Negative chronotropy (reduced heart rate) and negative dromotropy (prolonged AV conduction delay).",
      },
      {
        tissue: "Presynaptic Sympathetic Nerve Terminals",
        receptorOrTarget: "Alpha-2 Adrenergic Autoreceptor",
        mechanism:
          "Gβγ directly inhibits presynaptic N-type voltage-gated Ca2+ channels (Cav2.2), preventing Ca2+-dependent vesicular fusion.",
        physiologicalEffect:
          "Inhibition of norepinephrine exocytosis, resulting in central sympatholysis, reduced blood pressure, and decreased sympathetic outflow.",
      },
      {
        tissue: "Spinal Dorsal Horn & Brainstem Respiratory Center",
        receptorOrTarget: "Mu-Opioid Receptor (MOR)",
        mechanism:
          "GIRK activation hyperpolarizes second-order nociceptive neurons; presynaptic Cav2.2 inhibition halts substance P and glutamate release.",
        physiologicalEffect:
          "Profound analgesia, supraspinal sedation, suppression of cough reflex, and dose-dependent respiratory depression.",
      },
    ],
    clinicalDrugTargets: [
      {
        drugId: "clonidine",
        drugName: "Clonidine",
        action: "Centrally acting Alpha-2 adrenergic agonist",
        clinicalUse:
          "Antihypertensive sympatholytic, management of ADHD, and suppression of autonomic hyperactivity during opioid and substance withdrawal.",
        targetReceptorOrEnzyme: "Alpha-2",
      },
      {
        drugId: "morphine",
        drugName: "Morphine",
        action: "Full Mu-opioid receptor agonist",
        clinicalUse:
          "Analgesic standard for severe acute nociceptive pain, postoperative pain control, and dyspnea alleviation in palliative care.",
        targetReceptorOrEnzyme: "Mu-Opioid (MOR)",
      },
      {
        drugId: "fentanyl",
        drugName: "Fentanyl",
        action: "High-potency synthetic Mu-opioid receptor agonist",
        clinicalUse:
          "Intraoperative surgical anesthesia, acute procedural analgesia, and management of severe breakthrough cancer pain.",
        targetReceptorOrEnzyme: "Mu-Opioid (MOR)",
      },
      {
        drugId: "haloperidol",
        drugName: "Haloperidol",
        action: "High-potency Dopamine D2 receptor antagonist",
        clinicalUse:
          "Antipsychotic treatment for schizophrenia, acute psychotic agitation, ICU delirium, and severe Tourette motor tics.",
        targetReceptorOrEnzyme: "D2",
      },
      {
        drugId: "baclofen",
        drugName: "Baclofen",
        action: "GABA-B receptor agonist (Gi-coupled)",
        clinicalUse:
          "Skeletal muscle relaxant acting on spinal Gi-coupled GABA-B receptors to relieve severe spasticity in multiple sclerosis or spinal trauma.",
        targetReceptorOrEnzyme: "GABA-B",
      },
      {
        drugId: "methocarbamol",
        drugName: "Methocarbamol",
        action: "Centrally acting skeletal muscle relaxant",
        clinicalUse:
          "Adjunctive relief of acute, painful musculoskeletal conditions through central depressant polysynaptic pathway modulation.",
        targetReceptorOrEnzyme: "Central polysynaptic pathways",
      },
    ],
    pharmacologyPearls: [
      {
        title: "Autonomic Mnemonic: 'MAD 2s: M2, Alpha-2, D2'",
        description:
          "Classical mnemonic for canonical Gi-coupled receptors: M2, Alpha-2, D2 ('MAD 2s'), expanded to include all opioid receptors (Mu, Kappa, Delta) and GABA-B. All suppress adenylyl cyclase and mobilize Gβγ to activate GIRK channels.",
        category: "mnemonic",
      },
      {
        title: "Dual Action: Gαi vs Gβγ Subunits",
        description:
          "Gi signaling uniquely divides tasks: while Gαi inhibits adenylyl cyclase (lowering cAMP/PKA), the released Gβγ heterodimer directly opens GIRK potassium channels and closes presynaptic voltage-gated calcium channels.",
        category: "autonomic",
      },
      {
        title: "Clonidine Rebound Sympathetic Crisis",
        description:
          "Sudden cessation of chronic clonidine therapy abruptly relieves presynaptic Alpha-2 Gi inhibition. Massive uninhibited norepinephrine exocytosis can trigger life-threatening hypertensive emergency and tachyarrhythmias.",
        category: "collision",
      },
    ],
    regulatoryNotice:
      "Educational decision support under FD&C Act § 520(o)(1)(E). Autonomic receptor signaling data is derived from peer-reviewed pharmacology textbooks. No prescriptive dosing directives are provided.",
    citations: [
      "Brunton LL, et al. Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. 2023.",
      "Katzung BG, Vanderah TW. Basic & Clinical Pharmacology. 15th ed. 2021.",
      "Pierce KL, et al. Seven-transmembrane receptors. Nat Rev Mol Cell Biol. 2002;3(9):639-650.",
    ],
  },
  {
    id: "pde-cgmp-signaling",
    gProtein: "PDE",
    name: "PDE & cGMP Axis (NO-sGC-cGMP-PKG / Phosphodiesterase Pathway)",
    mnemonic: "NO / cGMP Vasodilator Axis & PDE Breakers (PDE-3, PDE-4, PDE-5)",
    primaryReceptors: [
      "Soluble Guanylyl Cyclase (sGC)",
      "PDE-3",
      "PDE-4",
      "PDE-5",
      "ANP-A/BNP Receptors (Particulate GC)",
    ],
    effectorEnzyme: "Soluble Guanylyl Cyclase (sGC) & Phosphodiesterases (PDE3, PDE4, PDE5)",
    secondMessengers: ["Cyclic GMP (cGMP)", "Nitric Oxide (NO)"],
    downstreamKinase: "Protein Kinase G (PKG) & Myosin Light Chain Phosphatase (MLCP)",
    cellularResponse:
      "Endothelial NO or organic nitrates stimulate sGC -> cGMP -> PKG -> MLCP dephosphorylation of myosin -> profound vascular smooth muscle relaxation. PDE-5 degrades cGMP to 5'-GMP. Sildenafil + Nitroglycerin collision causes fatal vasodilatory collapse.",
    molecularCascadeSummary:
      "Endothelial Nitric Oxide (NO) or organic nitrates diffuse into vascular smooth muscle -> stimulates sGC -> converts GTP to cyclic GMP (cGMP) -> activates Protein Kinase G (PKG) -> stimulates MLCP (Myosin Light Chain Phosphatase) dephosphorylating myosin -> profound smooth muscle relaxation. PDE-5 breaks down cGMP to 5'-GMP.",
    molecularSteps: [
      {
        stepNumber: 1,
        title: "Nitric Oxide (NO) Diffusion / Nitrate Bioactivation",
        stage: "receptor",
        component: "Endothelial eNOS & Organic Nitrates",
        mechanism:
          "Endothelial NO synthase generates gasotransmitter NO, or exogenous organic nitrates undergo mitochondrial ALDH2 enzymatic reduction releasing NO.",
      },
      {
        stepNumber: 2,
        title: "Soluble Guanylyl Cyclase (sGC) Heme Activation",
        stage: "effector",
        component: "Soluble Guanylyl Cyclase (sGC)",
        mechanism:
          "Lipophilic NO diffuses across the sarcolemma and binds the prosthetic ferrous-heme moiety of cytosolic Soluble Guanylyl Cyclase (sGC).",
      },
      {
        stepNumber: 3,
        title: "cGMP Second Messenger Synthesis",
        stage: "second-messenger",
        component: "Cyclic GMP (cGMP)",
        mechanism:
          "Activated sGC catalyzes the cyclization of guanosine triphosphate (GTP) into cyclic 3',5'-guanosine monophosphate (cGMP).",
      },
      {
        stepNumber: 4,
        title: "Protein Kinase G (PKG) Activation",
        stage: "kinase",
        component: "Protein Kinase G (PKG / cGK-I)",
        mechanism:
          "Intracellular cGMP binds regulatory tandem domains of Protein Kinase G (PKG), activating its catalytic serine/threonine kinase domain.",
      },
      {
        stepNumber: 5,
        title: "MLCP Stimulation & Intracellular Ca2+ Sequestration",
        stage: "action",
        component: "Myosin Light Chain Phosphatase (MLCP)",
        mechanism:
          "PKG phosphorylates MLCP, activating it to dephosphorylate myosin regulatory light chains; PKG also stimulates SERCA and blocks L-type Ca2+ entry, producing profound vascular smooth muscle relaxation.",
      },
      {
        stepNumber: 6,
        title: "cGMP Hydrolysis by Phosphodiesterase-5",
        stage: "effector",
        component: "Phosphodiesterase-5 (PDE-5)",
        mechanism:
          "PDE-5 specifically hydrolyzes cGMP into inactive 5'-GMP, terminating PKG activation and restoring vascular basal tone. Inhibitors block this step.",
      },
    ],
    tissueResponses: [
      {
        tissue: "Vascular Smooth Muscle (Coronary & Systemic Arteries / Veins)",
        receptorOrTarget: "sGC / PDE-5",
        mechanism:
          "cGMP-activated PKG stimulates MLCP, driving rapid dephosphorylation of myosin regulatory light chains.",
        physiologicalEffect:
          "Arteriolar and venous smooth muscle relaxation, decreased preload and afterload, reduced myocardial oxygen demand.",
      },
      {
        tissue: "Corpus Cavernosum Smooth Muscle",
        receptorOrTarget: "PDE-5",
        mechanism:
          "PDE-5 inhibition blocks cGMP degradation, sustaining PKG-mediated trabecular smooth muscle relaxation and sinusoidal engorgement.",
        physiologicalEffect:
          "Enhanced cavernous arterial inflow and sinusoidal expansion promoting penile erection.",
      },
      {
        tissue: "Cardiac Myocytes & Systemic Vasculature",
        receptorOrTarget: "PDE-3",
        mechanism:
          "PDE-3 inhibition prevents cAMP breakdown in myocardium and vascular beds.",
        physiologicalEffect:
          "Inotropic myocardial augmentation paired with peripheral systemic vasodilation ('inodilator' hemodynamic profile).",
      },
      {
        tissue: "Airway Smooth Muscle & Inflammatory Leukocytes",
        receptorOrTarget: "PDE-4",
        mechanism:
          "PDE-4 inhibition preserves intracellular cAMP in monocytes, neutrophils, and airway cells.",
        physiologicalEffect:
          "Suppression of inflammatory cytokine release and moderate bronchial smooth muscle relaxation in COPD.",
      },
    ],
    clinicalDrugTargets: [
      {
        drugId: "sildenafil",
        drugName: "Sildenafil",
        action: "Selective Phosphodiesterase-5 (PDE-5) inhibitor",
        clinicalUse:
          "Erectile dysfunction and pulmonary arterial hypertension (PAH) via selective stabilization of cGMP in cavernous and pulmonary vascular beds.",
        targetReceptorOrEnzyme: "PDE-5",
      },
      {
        drugId: "tadalafil",
        drugName: "Tadalafil",
        action: "Long-acting Phosphodiesterase-5 (PDE-5) inhibitor",
        clinicalUse:
          "Erectile dysfunction, pulmonary arterial hypertension, and lower urinary tract symptoms secondary to benign prostatic hyperplasia (BPH).",
        targetReceptorOrEnzyme: "PDE-5",
      },
      {
        drugId: "nitroglycerin",
        drugName: "Nitroglycerin",
        action: "Organic nitrate / Nitric Oxide donor stimulating sGC",
        clinicalUse:
          "Immediate sublingual relief and intravenous management of acute angina pectoris, coronary vasospasm, and acute pulmonary edema via venodilation.",
        targetReceptorOrEnzyme: "Soluble Guanylyl Cyclase (sGC)",
      },
      {
        drugId: "isosorbide-mononitrate",
        drugName: "Isosorbide mononitrate",
        action: "Long-acting oral organic nitrate / NO donor",
        clinicalUse:
          "Prophylactic maintenance management of chronic stable angina pectoris via sustained sGC activation.",
        targetReceptorOrEnzyme: "Soluble Guanylyl Cyclase (sGC)",
      },
      {
        drugId: "milrinone",
        drugName: "Milrinone",
        action: "Selective Phosphodiesterase-3 (PDE-3) inhibitor",
        clinicalUse:
          "Short-term intravenous inotropic and vasodilatory ('inodilator') support in acute decompensated biventricular heart failure.",
        targetReceptorOrEnzyme: "PDE-3",
      },
      {
        drugId: "roflumilast",
        drugName: "Roflumilast",
        action: "Selective Phosphodiesterase-4 (PDE-4) inhibitor",
        clinicalUse:
          "Maintenance treatment to reduce the frequency of exacerbations in patients with severe COPD associated with chronic bronchitis.",
        targetReceptorOrEnzyme: "PDE-4",
      },
    ],
    pharmacologyPearls: [
      {
        title: "High-Yield Fatal Collision: PDE-5 Inhibitor + Organic Nitrate",
        description:
          "Sildenafil/Tadalafil (blocking cGMP degradation) co-administered with Nitroglycerin/Isosorbide (hyper-stimulating cGMP synthesis) triggers catastrophic synergistic cGMP accumulation. Result: refractory vasodilatory collapse, severe hypotension, and coronary hypoperfusion. Absolute contraindication (minimum 24h separation for sildenafil, 48h for tadalafil).",
        category: "collision",
      },
      {
        title: "Phosphodiesterase Isoform Division of Labor",
        description:
          "PDE-3 degrades cAMP in cardiac myocytes (milrinone = inotrope); PDE-4 degrades cAMP in inflammatory cells (roflumilast = anti-inflammatory); PDE-5 specifically degrades cGMP in vascular and cavernosal smooth muscle (sildenafil/tadalafil = vasodilator).",
        category: "receptor-tradeoff",
      },
      {
        title: "Biochemical Opponents: MLCK (Gq) vs MLCP (cGMP-PKG)",
        description:
          "Vascular smooth muscle tone is governed by the ratio of active MLCK to active MLCP. Gq signaling stimulates MLCK (Ca2+-calmodulin mediated phosphorylation = contraction), whereas the NO-sGC-cGMP-PKG axis stimulates MLCP (dephosphorylation = relaxation).",
        category: "autonomic",
      },
    ],
    regulatoryNotice:
      "Educational decision support under FD&C Act § 520(o)(1)(E). Autonomic receptor signaling data is derived from peer-reviewed pharmacology textbooks. No prescriptive dosing directives are provided.",
    citations: [
      "Francis SH, et al. Mammalian cyclic nucleotide phosphodiesterases. Physiol Rev. 2011;91(2):651-690.",
      "Brunton LL, et al. Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. 2023.",
      "Webb RC. Smooth muscle contraction and relaxation. Adv Physiol Educ. 2003;27(4):201-206.",
    ],
  },
];

/**
 * Retrieve a G-protein signaling pathway by its unique ID.
 */
export function getGProteinPathwayById(id: string): GProteinPathway | null {
  return G_PROTEIN_PATHWAYS.find((p) => p.id === id) ?? null;
}

/**
 * Normalizes receptor strings for robust matching.
 */
function normalizeReceptorToken(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Map of synonyms/aliases to canonical pathway IDs for comprehensive receptor lookup.
 */
const RECEPTOR_ALIAS_MAP: Record<string, string> = {
  // Gq Receptors
  h1: "gq-phospholipase-c",
  histamine1: "gq-phospholipase-c",
  alpha1: "gq-phospholipase-c",
  alpha1a: "gq-phospholipase-c",
  alpha1b: "gq-phospholipase-c",
  alpha1d: "gq-phospholipase-c",
  a1: "gq-phospholipase-c",
  v1: "gq-phospholipase-c",
  v1a: "gq-phospholipase-c",
  v1b: "gq-phospholipase-c",
  vasopressin1: "gq-phospholipase-c",
  m1: "gq-phospholipase-c",
  m3: "gq-phospholipase-c",
  m5: "gq-phospholipase-c",
  "5ht2a": "gq-phospholipase-c",
  "5ht2c": "gq-phospholipase-c",
  serotonin2a: "gq-phospholipase-c",
  serotonin2c: "gq-phospholipase-c",

  // Gs Receptors
  beta1: "gs-adenylyl-cyclase",
  b1: "gs-adenylyl-cyclase",
  beta2: "gs-adenylyl-cyclase",
  b2: "gs-adenylyl-cyclase",
  beta3: "gs-adenylyl-cyclase",
  b3: "gs-adenylyl-cyclase",
  d1: "gs-adenylyl-cyclase",
  dopamine1: "gs-adenylyl-cyclase",
  d5: "gs-adenylyl-cyclase",
  h2: "gs-adenylyl-cyclase",
  histamine2: "gs-adenylyl-cyclase",
  v2: "gs-adenylyl-cyclase",
  vasopressin2: "gs-adenylyl-cyclase",
  "5ht4": "gs-adenylyl-cyclase",
  "5ht7": "gs-adenylyl-cyclase",

  // Gi Receptors
  m2: "gi-adenylyl-cyclase-inhibition",
  m4: "gi-adenylyl-cyclase-inhibition",
  alpha2: "gi-adenylyl-cyclase-inhibition",
  alpha2a: "gi-adenylyl-cyclase-inhibition",
  alpha2b: "gi-adenylyl-cyclase-inhibition",
  alpha2c: "gi-adenylyl-cyclase-inhibition",
  a2: "gi-adenylyl-cyclase-inhibition",
  d2: "gi-adenylyl-cyclase-inhibition",
  dopamine2: "gi-adenylyl-cyclase-inhibition",
  d3: "gi-adenylyl-cyclase-inhibition",
  d4: "gi-adenylyl-cyclase-inhibition",
  "5ht1a": "gi-adenylyl-cyclase-inhibition",
  mu: "gi-adenylyl-cyclase-inhibition",
  mor: "gi-adenylyl-cyclase-inhibition",
  muopioid: "gi-adenylyl-cyclase-inhibition",
  kappa: "gi-adenylyl-cyclase-inhibition",
  kor: "gi-adenylyl-cyclase-inhibition",
  delta: "gi-adenylyl-cyclase-inhibition",
  dor: "gi-adenylyl-cyclase-inhibition",
  gabab: "gi-adenylyl-cyclase-inhibition",

  // PDE / cGMP Axis
  sgc: "pde-cgmp-signaling",
  solubleGC: "pde-cgmp-signaling",
  pde3: "pde-cgmp-signaling",
  pde4: "pde-cgmp-signaling",
  pde5: "pde-cgmp-signaling",
  anpa: "pde-cgmp-signaling",
  anpb: "pde-cgmp-signaling",
};

/**
 * Find the primary G-protein signaling pathway coupled to a given receptor name.
 * Supports exact matches, common abbreviations, and normalized queries.
 */
export function findGProteinForReceptor(receptorName: string): GProteinPathway | null {
  if (!receptorName || typeof receptorName !== "string") return null;

  const token = normalizeReceptorToken(receptorName);
  if (!token) return null;

  // 1. Direct alias dictionary lookup
  const aliasId = RECEPTOR_ALIAS_MAP[token];
  if (aliasId) {
    const found = getGProteinPathwayById(aliasId);
    if (found) return found;
  }

  // 2. Search primaryReceptors in each pathway
  for (const pathway of G_PROTEIN_PATHWAYS) {
    for (const receptor of pathway.primaryReceptors) {
      const recToken = normalizeReceptorToken(receptor);
      if (recToken === token || token.includes(recToken) || recToken.includes(token)) {
        return pathway;
      }
    }
  }

  return null;
}

/**
 * Returns all four major classical second messenger pathways.
 */
export function getAllGProteinPathways(): readonly GProteinPathway[] {
  return G_PROTEIN_PATHWAYS;
}
