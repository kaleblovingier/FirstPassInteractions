/**
 * Pharmacological Mechanism Pathways & Signaling Cascades
 *
 * Non-prescriptive clinical decision support under FD&C Act § 520(o)(1)(E).
 * Biochemical signaling pathways, receptor pharmacology, and downstream physiological
 * cascades for educational analysis and mechanism collision awareness.
 * Does not provide dosing directives, prescription instructions, or clinical protocols.
 * Consult official prescribing monographs and peer-reviewed clinical guidelines.
 */

export type PathwayNodeType =
  | "enzyme"
  | "receptor"
  | "transporter"
  | "ion-channel"
  | "messenger"
  | "effector";

export interface PathwayDrugTarget {
  drugId: string;
  drugName: string;
  drugClass?: string;
  action: string;
  effect: string;
}

export interface PathwayNode {
  id: string;
  name: string;
  type: PathwayNodeType;
  description: string;
  downstreamEffect?: string;
  drugTargets: PathwayDrugTarget[];
}

export interface ClinicalPearl {
  title: string;
  collisionOrMechanism: string;
  rationale: string;
  citation?: string;
}

export interface MechanismPathway {
  id: string;
  name: string;
  shortTitle: string;
  category:
    | "Cardiovascular & Renal"
    | "Hematology & Hemostasis"
    | "Neurotransmission"
    | "Autonomic & Neuromuscular"
    | "Inflammation & Eicosanoids";
  summary: string;
  clinicalRelevance: string;
  keyDrugIds: string[];
  citations: string[];
  clinicalPearls: ClinicalPearl[];
  nodes: PathwayNode[];
}

export const REGULATORY_NOTICE =
  "Educational Decision Support under FD&C Act § 520(o)(1)(E). Biochemical signaling models, receptor targets, and physiological pathways are presented for educational and pharmacology reference only. No prescriptive dosing directives or therapeutic recommendations are provided.";

export const MECHANISM_PATHWAYS: readonly MechanismPathway[] = [
  // 1) RAAS Cascade & Renal Arteriolar Hemodynamics
  {
    id: "raas-nephron",
    name: "RAAS Cascade & Renal Arteriolar Hemodynamics",
    shortTitle: "RAAS & Nephron",
    category: "Cardiovascular & Renal",
    summary:
      "The Renin-Angiotensin-Aldosterone System (RAAS) regulates systemic arterial pressure, circulating blood volume, and glomerular filtration rate (GFR). Glomerular hydrostatic pressure is governed by parallel arteriolar tone: afferent arteriolar vasodilation (driven by vasodilatory prostaglandins PGE2/PGI2 and modulated by SGLT2 tubuloglomerular feedback) versus efferent arteriolar vasoconstriction (driven by Angiotensin II).",
    clinicalRelevance:
      "Essential for understanding the renal hemodynamic consequences of ACE inhibitors, ARBs, direct renin inhibitors, MRAs, NSAIDs, and SGLT2 inhibitors. Clarifies the mechanism of the clinical 'triple whammy' acute kidney injury.",
    keyDrugIds: ["aliskiren", "lisinopril", "losartan", "spironolactone", "ibuprofen", "empagliflozin"],
    citations: [
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics, 14th Ed. (Section IV: Drugs Affecting Renal and Cardiovascular Function).",
      "Guyton and Hall Textbook of Medical Physiology, 14th Ed. (Chapter 26: Urine Formation by the Kidneys).",
      "KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease.",
    ],
    clinicalPearls: [
      {
        title: "The Hemodynamic Triple Whammy Collision",
        collisionOrMechanism: "NSAID + ACEi/ARB + Diuretic",
        rationale:
          "NSAIDs suppress renal vasodilatory prostaglandins, constricting the afferent arteriole; ACE inhibitors or ARBs block Angiotensin II, dilating the efferent arteriole; diuretics reduce circulating plasma volume. Concurrently, glomerular capillary hydrostatic pressure collapses, extinguishing the transcapillary pressure gradient required for glomerular filtration and precipitating prerenal acute kidney injury.",
        citation: "Thomas MC. Diuretics, ACE inhibitors and NSAIDs—the triple whammy. Med J Aust. 2000;172(4):184-185.",
      },
      {
        title: "Bradykinin & Kininase II Mechanism Divergence",
        collisionOrMechanism: "ACE Inhibitor vs ARB Bradykinin Handling",
        rationale:
          "Angiotensin-Converting Enzyme (ACE) is functionally identical to kininase II, which degrades vasodilator peptides bradykinin and substance P. ACE inhibitors prevent bradykinin degradation, augmenting nitric oxide/prostacyclin release (contributing to blood pressure reduction) but also triggering class-specific dry cough and bradykinin-mediated angioedema. ARBs block the AT1 receptor without inhibiting kininase II, leaving bradykinin metabolism intact.",
        citation: "Goodman & Gilman's The Pharmacological Basis of Therapeutics, 14th Ed. Chapter 26.",
      },
      {
        title: "Tubuloglomerular Feedback Renoprotection by SGLT2 Inhibitors",
        collisionOrMechanism: "SGLT2i Restoration of Macula Densa Signaling",
        rationale:
          "SGLT2 inhibitors block glucose and Na+ reabsorption in the early proximal tubule, increasing distal NaCl delivery to the macula densa. This stimulates adenosine production via the juxtaglomerular apparatus, restoring physiological tubuloglomerular feedback and inducing afferent arteriolar vasoconstriction. This alleviates diabetic intraglomerular hypertension and hyperfiltration, conferring long-term cardiorenal nephroprotection.",
        citation: "Heerspink HJL, et al. Sodium Glucose Cotransporter 2 Inhibition in the Nephron. Kidney Int. 2018;94(1):26-39.",
      },
    ],
    nodes: [
      {
        id: "raas-angiotensinogen",
        name: "Angiotensinogen",
        type: "messenger",
        description:
          "Circulating alpha-2-globulin constitutional precursor synthesized by hepatocytes, cleaved by renin at the Leu10-Val11 peptide bond.",
        downstreamEffect: "Substrate reservoir for catalytic generation of Angiotensin I.",
        drugTargets: [],
      },
      {
        id: "raas-renin",
        name: "Renin (Aspartyl Protease)",
        type: "enzyme",
        description:
          "Highly specific rate-limiting aspartyl protease secreted by juxtaglomerular cells in response to reduced renal perfusion pressure, sympathetic beta-1 stimulation, or low macula densa NaCl sensing.",
        downstreamEffect: "Cleaves angiotensinogen to yield the decapeptide Angiotensin I.",
        drugTargets: [
          {
            drugId: "aliskiren",
            drugName: "Aliskiren",
            drugClass: "Direct Renin Inhibitor",
            action: "Potent, competitive active-site transition-state catalytic pocket inhibition of renin",
            effect: "Blocks conversion of angiotensinogen to Ang I; reduces plasma renin activity without elevating Ang I or Ang II.",
          },
        ],
      },
      {
        id: "raas-ang-i",
        name: "Angiotensin I (Ang I)",
        type: "messenger",
        description: "Biologically inert decapeptide intermediate (Asp-Arg-Val-Tyr-Ile-His-Pro-Phe-His-Leu).",
        downstreamEffect: "Passes through pulmonary and systemic vascular beds to be cleaved by ACE.",
        drugTargets: [],
      },
      {
        id: "raas-ace",
        name: "Angiotensin-Converting Enzyme (ACE / Kininase II)",
        type: "enzyme",
        description:
          "Vascular endothelial zinc-metalloprotease that cleaves the C-terminal dipeptide from Ang I to generate active Ang II, while concurrently inactivating the vasodilatory nonapeptide bradykinin.",
        downstreamEffect:
          "Converts Ang I to vasoconstrictor Ang II; simultaneously metabolizes bradykinin and substance P into inactive peptide fragments.",
        drugTargets: [
          {
            drugId: "lisinopril",
            drugName: "Lisinopril",
            drugClass: "ACE Inhibitor (ACEi)",
            action: "Competitive active-site chelation of the zinc ion in the ACE/kininase II catalytic cleft",
            effect:
              "Suppresses conversion of Ang I to Ang II; blocks bradykinin degradation. Yields efferent arteriolar vasodilation, decreased aldosterone secretion, and increased bradykinin/substance P levels.",
          },
        ],
      },
      {
        id: "raas-ang-ii",
        name: "Angiotensin II (Ang II)",
        type: "messenger",
        description:
          "Primary effector octapeptide of the RAAS cascade. Stimulates systemic arteriolar vasoconstriction, adrenal aldosterone synthesis, proximal tubular Na+/H+ exchange, sympathetic outflow, and dipsogenesis.",
        downstreamEffect:
          "Preferentially constricts efferent arterioles to sustain intraglomerular capillary pressure; drives aldosterone release from adrenal zona glomerulosa.",
        drugTargets: [],
      },
      {
        id: "raas-at1-receptor",
        name: "Angiotensin II Type 1 (AT1) Receptor",
        type: "receptor",
        description:
          "Gq/11-coupled transmembrane GPCR expressed on vascular smooth muscle, renal efferent arterioles, adrenal cortex, and myocardium. Mediates vasoconstriction, aldosterone synthesis, and cellular hypertrophy.",
        downstreamEffect:
          "Activates phospholipase C (PLC-beta), generating IP3 (intracellular Ca2+ mobilization) and DAG (protein kinase C activation), leading to efferent vasoconstriction and adrenal aldosterone secretion.",
        drugTargets: [
          {
            drugId: "losartan",
            drugName: "Losartan",
            drugClass: "Angiotensin II Receptor Blocker (ARB)",
            action: "Potent, selective competitive antagonism at the AT1 receptor",
            effect:
              "Inhibits Ang II-induced efferent arteriolar constriction, aldosterone release, and vasopressor response; does not alter bradykinin breakdown (negligible dry cough).",
          },
        ],
      },
      {
        id: "raas-aldosterone-mr",
        name: "Mineralocorticoid Receptor (Aldosterone Axis)",
        type: "receptor",
        description:
          "Intracellular nuclear receptor located in distal convoluted tubule and cortical collecting duct principal cells; translocates to nucleus upon aldosterone binding.",
        downstreamEffect:
          "Up-regulates epithelial sodium channels (ENaC) on luminal membrane and basolateral Na+/K+-ATPase, promoting sodium reabsorption and potassium/hydrogen excretion.",
        drugTargets: [
          {
            drugId: "spironolactone",
            drugName: "Spironolactone",
            drugClass: "Mineralocorticoid Receptor Antagonist (MRA)",
            action: "Competitive antagonist at cytoplasmic mineralocorticoid receptors",
            effect:
              "Prevents aldosterone-dependent transcription of ENaC and Na+/K+-ATPase; causes natriuresis and water loss while sparing potassium; mitigates myocardial fibrosis.",
          },
        ],
      },
      {
        id: "raas-arteriolar-hemodynamics",
        name: "Glomerular Arteriolar Hemodynamic Axis (Afferent vs Efferent Tone)",
        type: "effector",
        description:
          "Intraglomerular filtration pressure depends on the ratio of afferent arteriolar resistance (vasodilated by prostaglandins PGE2/PGI2, constricted by tubuloglomerular feedback) to efferent arteriolar resistance (vasoconstricted by Ang II).",
        downstreamEffect:
          "Maintains normal GFR (~120 mL/min). Imbalance between afferent inflow and efferent resistance causes acute changes in intraglomerular hydrostatic pressure.",
        drugTargets: [
          {
            drugId: "ibuprofen",
            drugName: "Ibuprofen",
            drugClass: "Nonselective NSAID",
            action: "Inhibition of renal cyclooxygenases COX-1 and COX-2",
            effect:
              "Blocks synthesis of vasodilatory prostaglandins (PGE2, PGI2) at the afferent arteriole, inducing afferent vasoconstriction and reducing glomerular inflow pressure.",
          },
          {
            drugId: "empagliflozin",
            drugName: "Empagliflozin",
            drugClass: "SGLT2 Inhibitor",
            action: "Inhibition of proximal tubular sodium-glucose cotransporter 2 (SGLT2)",
            effect:
              "Increases sodium delivery to the macula densa, restoring tubuloglomerular feedback and modulating afferent arteriolar resistance to attenuate glomerular hyperfiltration.",
          },
        ],
      },
    ],
  },

  // 2) Coagulation Cascade & Targeted Anticoagulant Reversal
  {
    id: "coagulation-cascade",
    name: "Coagulation Cascade & Targeted Anticoagulant Reversal",
    shortTitle: "Coagulation & Reversals",
    category: "Hematology & Hemostasis",
    summary:
      "The cell-based coagulation cascade coordinates intrinsic and extrinsic enzymatic cascades converging upon Factor Xa generation. Factor Xa integrates with Factor Va into the prothrombinase complex to convert Prothrombin (Factor II) into Thrombin (Factor IIa), which cleaves Fibrinogen into crosslinked Fibrin. Targeted anticoagulants and their direct reversal antidotes act at discrete molecular nodes.",
    clinicalRelevance:
      "Crucial for distinguishing mechanism-specific reversal pathways: Idarucizumab specifically binds Dabigatran with zero effect on Factor Xa; Andexanet alfa specifically sequesters Factor Xa inhibitors; Protamine neutralizes polyanionic Heparin via electrostatic complexation; 4-Factor PCC replenishes vitamin K-dependent clotting factors.",
    keyDrugIds: [
      "warfarin",
      "apixaban",
      "rivaroxaban",
      "dabigatran",
      "idarucizumab",
      "andexanet-alfa",
      "protamine",
      "heparin",
    ],
    citations: [
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics, 14th Ed. (Chapter 32: Blood Coagulation and Anticoagulant, Fibrinolytic, and Antiplatelet Drugs).",
      "Katzung's Basic & Clinical Pharmacology, 15th Ed. (Chapter 34: Drugs Used in Disorders of Coagulation).",
      "CHEST Guideline and Expert Panel Report: Antithrombotic Therapy for VTE Disease (2021).",
    ],
    clinicalPearls: [
      {
        title: "Reversal Specificity and Cross-Class Inefficacy",
        collisionOrMechanism: "Idarucizumab vs Andexanet Alfa Target Exclusivity",
        rationale:
          "Idarucizumab is a humanized Fab fragment that binds dabigatran with ~350-fold higher affinity than thrombin, but has no interaction with Factor Xa or its inhibitors. Andexanet alfa is a catalytically inactive recombinant Factor Xa decoy that binds Factor Xa inhibitors (apixaban, rivaroxaban, edoxaban), but does not bind direct thrombin inhibitors. Reversal agent choice must align strictly with anticoagulant mechanism.",
        citation: "Pollack CV Jr, et al. Idarucizumab for Dabigatran Reversal. N Engl J Med. 2017;377(5):431-441.",
      },
      {
        title: "Transient Prothrombotic Window in Warfarin Induction",
        collisionOrMechanism: "Protein C Depletion Preceding Clotting Factor Clearance",
        rationale:
          "Warfarin blocks VKORC1, suppressing gamma-carboxylation of clotting factors II, VII, IX, X and natural anticoagulant proteins C and S. Protein C has a very short elimination half-life (~8 hours) compared to Factor II (prothrombin, ~60-72 hours) and Factor X (~36-48 hours). During the first 24-48 hours, early protein C depletion induces an initial hypercoagulable state, explaining warfarin-induced skin necrosis and necessitating parenteral bridge anticoagulation in acute thrombotic events.",
        citation: "Katzung's Basic & Clinical Pharmacology, 15th Ed. Chapter 34.",
      },
      {
        title: "Protamine Electrostatic Acid-Base Neutralization",
        collisionOrMechanism: "Polycationic Protamine with Polyanionic Heparin",
        rationale:
          "Protamine is an arginine-rich polycationic protein extracted from salmon sperm. Heparin is an intensely sulfated polyanionic glycosaminoglycan. Protamine does not act on clotting factor enzymes or antithrombin receptors; it neutralizes heparin through pure equimolar electrostatic salt complexation, rendering heparin incapable of binding Antithrombin III.",
        citation: "Goodman & Gilman's The Pharmacological Basis of Therapeutics, 14th Ed. Chapter 32.",
      },
    ],
    nodes: [
      {
        id: "coag-vkorc1",
        name: "Vitamin K Epoxide Reductase Complex 1 (VKORC1)",
        type: "enzyme",
        description:
          "Microsomal enzyme that reduces vitamin K 2,3-epoxide to vitamin K hydroquinone, an indispensable cofactor for gamma-glutamyl carboxylase in the post-translational carboxylation of Factors II, VII, IX, X, and proteins C and S.",
        downstreamEffect:
          "Enables synthesis of functional calcium- and phospholipid-binding gamma-carboxyglutamyl residues on clotting factor zymogens.",
        drugTargets: [
          {
            drugId: "warfarin",
            drugName: "Warfarin",
            drugClass: "Vitamin K Antagonist (Coumarin)",
            action: "Non-competitive inhibition of the VKORC1 catalytic subunit 1",
            effect:
              "Depletes reduced vitamin K hydroquinone; newly synthesized factors II, VII, IX, and X lack gamma-carboxylation and are biologically inert; prolongs PT/INR.",
          },
        ],
      },
      {
        id: "coag-factor-xa",
        name: "Factor Xa (Tenase Convergence & Prothrombinase)",
        type: "enzyme",
        description:
          "Active serine endopeptidase formed at the convergence of intrinsic tenase (IXa/VIIIa) and extrinsic tenase (tissue factor/VIIa). Assembles with Factor Va, Ca2+, and platelet anionic phospholipids to form the prothrombinase complex.",
        downstreamEffect:
          "Catalyzes the rate-limiting conversion of prothrombin (Factor II) to active thrombin (Factor IIa).",
        drugTargets: [
          {
            drugId: "apixaban",
            drugName: "Apixaban",
            drugClass: "Direct Factor Xa Inhibitor (Oral DOAC)",
            action: "Direct, selective, reversible competitive inhibition of free and clot-associated Factor Xa active site",
            effect:
              "Inhibits prothrombinase activity and suppresses thrombin generation without requiring antithrombin III as an obligate cofactor.",
          },
          {
            drugId: "rivaroxaban",
            drugName: "Rivaroxaban",
            drugClass: "Direct Factor Xa Inhibitor (Oral DOAC)",
            action: "Direct, selective Factor Xa active-site pocket inhibition",
            effect: "Dose-dependent prolongation of prothrombin time and suppression of prothrombinase activation.",
          },
          {
            drugId: "andexanet-alfa",
            drugName: "Andexanet Alfa",
            drugClass: "Decoy Reversal Agent for FXa Inhibitors",
            action: "Recombinant modified human factor Xa decoy lacking catalytic serine and membrane anchor domain",
            effect:
              "Binds and sequesters Factor Xa inhibitors (apixaban, rivaroxaban) with high stoichiometric affinity, restoring endogenous Factor Xa activity in the prothrombinase complex.",
          },
        ],
      },
      {
        id: "coag-thrombin",
        name: "Thrombin (Activated Factor IIa)",
        type: "enzyme",
        description:
          "Central multifunctional serine protease of hemostasis. Cleaves fibrinogen into fibrin monomers, amplifies upstream factors V, VIII, and XI, activates transglutaminase Factor XIII, and stimulates platelet PAR-1 receptors.",
        downstreamEffect:
          "Rapid conversion of soluble fibrinogen into fibrin polymer strands; triggers robust platelet aggregation.",
        drugTargets: [
          {
            drugId: "dabigatran",
            drugName: "Dabigatran",
            drugClass: "Direct Thrombin Inhibitor (Oral DTI)",
            action: "Potent, competitive, reversible direct active-site inhibitor of free and clot-bound thrombin (Factor IIa)",
            effect:
              "Blocks thrombin-mediated cleavage of fibrinogen to fibrin and suppresses thrombin-induced platelet aggregation; prolongs aPTT and dilute thrombin time.",
          },
          {
            drugId: "idarucizumab",
            drugName: "Idarucizumab",
            drugClass: "Monoclonal Antibody Fragment Reversal Agent",
            action: "Humanized Fab fragment that binds dabigatran and its glucuronide metabolites with ~350x greater affinity than thrombin",
            effect:
              "Rapidly sequesters dabigatran molecules, liberating endogenous thrombin to crosslink fibrin and re-establish physiological hemostasis.",
          },
        ],
      },
      {
        id: "coag-fibrinogen-fibrin",
        name: "Fibrinogen to Fibrin Clot Mesh (Factor XIIIa Crosslinking)",
        type: "effector",
        description:
          "Soluble 340-kDa hexameric plasma glycoprotein. Thrombin releases fibrinopeptides A and B, producing fibrin monomers that spontaneously polymerize into half-staggered protofibrils covalently stabilized by Factor XIIIa transglutaminase.",
        downstreamEffect:
          "Forms an insoluble structural fibrin meshwork that traps erythrocytes and platelets to establish the definitive hemostatic plug.",
        drugTargets: [],
      },
      {
        id: "coag-antithrombin-heparin",
        name: "Antithrombin III (AT-III) Heparin Mechanism",
        type: "enzyme",
        description:
          "Endogenous serine protease inhibitor (serpin) that inactivates thrombin, Factor Xa, and Factors IXa/XIa. Catalytic efficiency is accelerated >1000-fold upon binding specific sulfated pentasaccharide sequences on heparin.",
        downstreamEffect:
          "Rapid irreversible conformational suicide inhibition of thrombin and Factor Xa in circulating blood.",
        drugTargets: [
          {
            drugId: "heparin",
            drugName: "Heparin",
            drugClass: "Unfractionated Heparin (UFH)",
            action: "Binds AT-III via unique pentasaccharide, inducing conformational allosteric activation; long chains bridge AT-III to thrombin",
            effect:
              "Accelerates AT-III mediated inactivation of thrombin and Factor Xa by orders of magnitude; prolongs aPTT.",
          },
          {
            drugId: "protamine",
            drugName: "Protamine Sulfate",
            drugClass: "Specific Heparin Neutralizing Agent",
            action: "Strongly basic polycationic peptide rich in arginine that forms an inactive neutral salt complex with polyanionic heparin",
            effect:
              "Physically sequesters and neutralizes circulating heparin molecules, abolishing heparin's catalytic interaction with antithrombin III.",
          },
        ],
      },
    ],
  },

  // 3) Cardiac Ion Channels & Vaughan-Williams Classes
  {
    id: "cardiac-action-potential",
    name: "Cardiac Ion Channels & Vaughan-Williams Classes",
    shortTitle: "Cardiac Ion Channels",
    category: "Cardiovascular & Renal",
    summary:
      "The cardiac ventricular and pacemaker action potentials are generated by sequential, voltage-gated transmembrane ionic fluxes. The Vaughan-Williams classification categorizes antiarrhythmics by their target channel pore and electrophysiological phase: Phase 0 Na+ influx (Class I), Phase 2 Ca2+ L-type current (Class IV), Phase 3 K+ delayed rectifier / hERG current (Class III), and Phase 4 If pacemaker current alongside Beta-1 adrenergic tone (Class II).",
    clinicalRelevance:
      "Explains mechanisms of QT prolongation, torsades de pointes (reverse use-dependence with Class III agents), QRS widening and proarrhythmia (use-dependence with Class IC agents), and synergistic nodal arrest (Class II beta-blockers plus Class IV non-DHP calcium channel blockers).",
    keyDrugIds: [
      "quinidine",
      "lidocaine",
      "flecainide",
      "metoprolol",
      "amiodarone",
      "sotalol",
      "verapamil",
      "diltiazem",
      "ivabradine",
    ],
    citations: [
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics, 14th Ed. (Chapter 30: Antiarrhythmic Drugs).",
      "Katzung's Basic & Clinical Pharmacology, 15th Ed. (Chapter 14: Agents Used in Cardiac Arrhythmias).",
      "2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation.",
    ],
    clinicalPearls: [
      {
        title: "Reverse Use-Dependence and Torsadogenesis",
        collisionOrMechanism: "Class III IKr Blockade at Slower Heart Rates",
        rationale:
          "Class III potassium channel blockers (e.g., sotalol) exhibit reverse use-dependence: their inhibitory action on the rapid delayed rectifier K+ current (IKr) is greatest at slow heart rates and long cycle lengths. Bradycardia prolongs the plateau phase, enhancing drug binding to the hERG pore, extending the QT interval, and precipitating early afterdepolarizations (EADs) that trigger torsades de pointes.",
        citation: "Roden DM. Mechanisms and models of torsade de pointes. Electrophysiol Rev. 1999;3(4):287-291.",
      },
      {
        title: "Use-Dependence in Class IC Agents",
        collisionOrMechanism: "Flecainide Nav1.5 Dissociation Kinetics at Rapid Rates",
        rationale:
          "Class IC agents like flecainide possess very slow unbinding kinetics from the closed/resting state of Nav1.5 sodium channels. At faster heart rates (tachycardia), sodium channels reopen before the drug can dissociate, causing progressive channel block accumulation. This causes marked QRS widening and slowed conduction, heightening the risk of lethal re-entrant ventricular tachycardias in ischemic or scarred myocardium (CAST trial warning).",
        citation: "Echt DS, et al. Mortality and morbidity in patients receiving encainide, flecainide, or placebo. N Engl J Med. 1991;324(12):781-788.",
      },
      {
        title: "AV Nodal Blockade Synergy Collision",
        collisionOrMechanism: "Class II Beta-Blocker + Class IV Non-DHP Calcium Blocker",
        rationale:
          "Both beta-blockers (metoprolol) and non-dihydropyridine calcium channel blockers (verapamil, diltiazem) depress L-type Ca2+ channel conductance in SA and AV nodal tissues—beta-blockers by reducing cAMP/PKA phosphorylation and non-DHPs by directly blocking the Cav1.2 channel pore. Concurrent administration produces synergistic suppression of AV nodal dV/dt and refractory period, risking profound bradycardia, complete heart block, and cardiogenic shock.",
        citation: "Goodman & Gilman's The Pharmacological Basis of Therapeutics, 14th Ed. Chapter 14.",
      },
    ],
    nodes: [
      {
        id: "cardiac-phase-0-na",
        name: "Phase 0 Fast Inward Na+ Current (Nav1.5 / INa)",
        type: "ion-channel",
        description:
          "Rapid voltage-gated opening of Nav1.5 channels produces intense inward Na+ flux, generating the rapid depolarization upstroke (dV/dt max) of atrial, His-Purkinje, and ventricular action potentials.",
        downstreamEffect:
          "Determines the conduction velocity through myocardial tissue and dictates the width of the electrocardiographic QRS complex.",
        drugTargets: [
          {
            drugId: "quinidine",
            drugName: "Quinidine",
            drugClass: "Class IA Antiarrhythmic",
            action: "Moderate Nav1.5 blockade with intermediate dissociation kinetics; secondary block of IKr",
            effect: "Slows phase 0 conduction velocity, prolongs action potential duration (APD) and ERP; broadens QRS and lengthens QTc.",
          },
          {
            drugId: "lidocaine",
            drugName: "Lidocaine",
            drugClass: "Class IB Antiarrhythmic",
            action: "Rapid binding to open and inactivated Nav1.5 channels with rapid dissociation kinetics",
            effect: "Selectively depresses conduction in depolarized or ischemic ventricular tissue; shortens APD; negligible effect on normal QRS or QTc.",
          },
          {
            drugId: "flecainide",
            drugName: "Flecainide",
            drugClass: "Class IC Antiarrhythmic",
            action: "Potent Nav1.5 channel pore blockade with markedly slow dissociation kinetics (use-dependent)",
            effect: "Markedly depresses phase 0 upstroke velocity; slows intraventricular conduction and widens QRS complex with minimal effect on APD.",
          },
        ],
      },
      {
        id: "cardiac-phase-2-ca",
        name: "Phase 2 Plateau L-Type Ca2+ Current (Cav1.2 / ICa,L)",
        type: "ion-channel",
        description:
          "Voltage-gated inward calcium current through Cav1.2 channels that balances outward potassium currents to sustain the ventricular plateau phase and mediates the action potential upstroke in SA and AV nodal pacemaker tissue.",
        downstreamEffect:
          "Drives excitation-contraction coupling in myocytes via calcium-induced calcium release (CICR) from the sarcoplasmic reticulum; governs AV nodal conduction velocity.",
        drugTargets: [
          {
            drugId: "verapamil",
            drugName: "Verapamil",
            drugClass: "Class IV Non-Dihydropyridine CCB (Phenylalkylamine)",
            action: "Binds open and inactivated Cav1.2 channel alpha-1 subunit intracellular pore",
            effect: "Slows SA node automaticity and AV nodal conduction velocity; prolongs AV nodal refractoriness and PR interval; exerts negative inotropic effect.",
          },
          {
            drugId: "diltiazem",
            drugName: "Diltiazem",
            drugClass: "Class IV Non-Dihydropyridine CCB (Benzothiazepine)",
            action: "Intermediate-affinity Cav1.2 channel blockade in cardiac conduction and vascular smooth muscle",
            effect: "Depresses AV nodal conduction, prolongs nodal ERP, controls ventricular rate in supraventricular tachycardias.",
          },
        ],
      },
      {
        id: "cardiac-phase-3-k-herg",
        name: "Phase 3 Rapid Delayed Rectifier K+ Current (IKr / hERG)",
        type: "ion-channel",
        description:
          "Outward potassium current carried by KCNH2-encoded hERG channels, initiating phase 3 rapid repolarization of ventricular myocytes back toward the resting membrane potential.",
        downstreamEffect:
          "Dictates ventricular repolarization duration and action potential duration; corresponds electrophysiologically to the QT/QTc interval.",
        drugTargets: [
          {
            drugId: "amiodarone",
            drugName: "Amiodarone",
            drugClass: "Class III Antiarrhythmic (Multichannel Blocker)",
            action: "Inhibits IKr outward potassium currents; additionally exhibits non-competitive beta-blockade, Nav1.5 blockade, and Cav1.2 inhibition",
            effect: "Prolongs APD and refractoriness uniformly across cardiac tissues; low risk of torsades de pointes despite QT prolongation due to concurrent multichannel block.",
          },
          {
            drugId: "sotalol",
            drugName: "Sotalol",
            drugClass: "Class III Antiarrhythmic / Nonselective Beta-Blocker",
            action: "Potent IKr delayed rectifier K+ channel pore inhibition combined with competitive beta-1/beta-2 adrenergic antagonism",
            effect: "Extends ventricular APD and QT interval in a reverse use-dependent manner (magnified at slow heart rates), raising torsades risk during bradycardia.",
          },
        ],
      },
      {
        id: "cardiac-phase-4-if",
        name: "Phase 4 Hyperpolarization-Activated 'Funny' Current (HCN4 / If)",
        type: "ion-channel",
        description:
          "Mixed inward Na+/K+ current through HCN4 channels in the sinoatrial node, activated at hyperpolarized potentials (-40 to -65 mV) to drive spontaneous diastolic phase 4 depolarization.",
        downstreamEffect:
          "Establishes the slope of pacemaker depolarization, dictating intrinsic sinoatrial firing rate and resting heart rate.",
        drugTargets: [
          {
            drugId: "ivabradine",
            drugName: "Ivabradine",
            drugClass: "HCN Channel Blocker (Sinus Node Inhibitor)",
            action: "Selective, use-dependent inhibition of HCN4 channels from the intracellular pore face",
            effect: "Decreases the diastolic phase 4 depolarization slope of SA nodal cells; selectively slows heart rate without altering myocardial inotropy or ventricular repolarization.",
          },
        ],
      },
      {
        id: "cardiac-beta-1-adrenergic",
        name: "Phase 4 Beta-1 Adrenergic Receptor Signaling (Gs / PKA Cascade)",
        type: "receptor",
        description:
          "Gs-coupled transmembrane GPCR in nodal and ventricular myocytes. Agonism activates adenylyl cyclase, raising cAMP and phosphorylating L-type Ca2+ channels, phospholamban, and RyR2.",
        downstreamEffect:
          "Increases pacemaker diastolic depolarization slope, accelerates AV nodal conduction velocity, shortens refractory periods, and increases inotropy.",
        drugTargets: [
          {
            drugId: "metoprolol",
            drugName: "Metoprolol",
            drugClass: "Class II Antiarrhythmic (Selective Beta-1 Blocker)",
            action: "Competitive antagonism at cardiac beta-1 adrenergic receptors",
            effect: "Decreases intracellular cAMP; flattens SA nodal phase 4 slope; slows AV nodal conduction; dampens adrenergic trigger-mediated arrhythmias.",
          },
        ],
      },
    ],
  },

  // 4) Monoaminergic Synapse Transmission & Catabolism
  {
    id: "monoamine-synapse",
    name: "Monoaminergic Synapse Transmission & Catabolism",
    shortTitle: "Monoamine Synapse",
    category: "Neurotransmission",
    summary:
      "Central and peripheral monoaminergic neurotransmission (serotonin, norepinephrine, dopamine) involves vesicular packaging via VMAT2, exocytotic release, negative feedback regulation by presynaptic autoreceptors, rapid reuptake termination by SLC6 family transporters (SERT, NET, DAT), catabolic degradation by monoamine oxidases (MAO-A/B) and COMT, and downstream signaling through postsynaptic GPCRs.",
    clinicalRelevance:
      "Explains the molecular genesis of serotonin syndrome (MAO inhibitor plus reuptake inhibitor collisions), the tyramine-induced hypertensive crisis ('cheese reaction'), tardive dyskinesia treatment via VMAT2 inhibition, and peripheral COMT inhibition in Parkinson's disease.",
    keyDrugIds: [
      "valbenazine",
      "clonidine",
      "mirtazapine",
      "sumatriptan",
      "fluoxetine",
      "venlafaxine",
      "bupropion",
      "phenelzine",
      "selegiline",
      "linezolid",
      "entacapone",
    ],
    citations: [
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics, 14th Ed. (Chapter 15: Introduction to Central Nervous System Pharmacology; Chapter 18: 5-Hydroxytryptamine (Serotonin) and Dopamine).",
      "Stahl's Essential Psychopharmacology: Neuroscientific Basis and Practical Applications, 5th Ed.",
      "Boyer EW, Shannon M. The serotonin syndrome. N Engl J Med. 2005;352(11):1112-1120.",
    ],
    clinicalPearls: [
      {
        title: "The Serotonin Syndrome Lethal Collision",
        collisionOrMechanism: "MAOI + Reuptake Inhibitor (SSRI/SNRI/TCA)",
        rationale:
          "Irreversible MAO inhibitors (e.g. phenelzine) prevent enzymatic oxidation of intracellular serotonin, while reuptake blockers (fluoxetine, venlafaxine) prevent clearance from the synaptic cleft. The combination produces a catastrophic surge in synaptic serotonin that over-activates postsynaptic 5-HT2A and 5-HT1A receptors, causing neuromuscular hyperactivity (clonus, tremor, hyperreflexia), autonomic instability, and life-threatening hyperthermia. A minimum 14-day (5-week for fluoxetine) washout is required.",
        citation: "Boyer EW, Shannon M. The serotonin syndrome. N Engl J Med. 2005;352(11):1112-1120.",
      },
      {
        title: "The Cheese Reaction (Tyramine Hypertensive Crisis)",
        collisionOrMechanism: "MAO-A Inhibition + Dietary Tyramine",
        rationale:
          "Gastrointestinal and hepatic MAO-A normally degrades dietary tyramine (found in aged cheeses, cured meats, fermented beverages). When MAO-A is inhibited by nonselective MAOIs, un-degraded tyramine enters systemic circulation, penetrates sympathetic nerve terminals via NET, and displaces stored norepinephrine via VMAT2. Massive norepinephrine efflux overstimulates vascular alpha-1 receptors, causing severe malignant hypertension and stroke risk.",
        citation: "Goodman & Gilman's The Pharmacological Basis of Therapeutics, 14th Ed. Chapter 18.",
      },
      {
        title: "Linezolid as a Stealth MAOI",
        collisionOrMechanism: "Oxazolidinone Antimicrobial Reversible MAOI Activity",
        rationale:
          "Linezolid is a synthetic oxazolidinone antibacterial with structural homology to toloxatone, giving it weak, reversible, nonselective MAO-A and MAO-B inhibitory properties. Combining linezolid with serotonergic agents (SSRIs, SNRIs, meperidine) can trigger severe serotonin toxicity despite linezolid being prescribed as an antibiotic.",
        citation: "Taylor JJ, et al. Linezolid and Serotonergic Drug Interactions. Clin Infect Dis. 2006;43(2):180-187.",
      },
    ],
    nodes: [
      {
        id: "monoamine-vmat2",
        name: "Vesicular Monoamine Transporter 2 (VMAT2 / SLC18A2)",
        type: "transporter",
        description:
          "Proton-antiporter on synaptic vesicle membranes that utilizes an interior proton electrochemical gradient to package cytoplasmic dopamine, serotonin, norepinephrine, and histamine into secretory vesicles.",
        downstreamEffect:
          "Protects monoamines from cytosolic MAO degradation and establishes quantum-sized releasable transmitter stores.",
        drugTargets: [
          {
            drugId: "valbenazine",
            drugName: "Valbenazine",
            drugClass: "Selective VMAT2 Inhibitor",
            action: "Reversible selective inhibition of human vesicular monoamine transporter 2",
            effect: "Decreases presynaptic vesicular packaging and exocytotic release of dopamine, mitigating hyperkinetic movements in tardive dyskinesia.",
          },
        ],
      },
      {
        id: "monoamine-autoreceptors",
        name: "Presynaptic Inhibitory Autoreceptors (Alpha-2 & 5-HT1B/1D)",
        type: "receptor",
        description:
          "Gi/o-coupled receptors located on presynaptic terminal membranes that inhibit adenylyl cyclase, open inward-rectifying K+ channels, and inhibit voltage-gated Ca2+ channels.",
        downstreamEffect:
          "Functions as an autoinhibitory negative feedback governor that limits further vesicular neurotransmitter release during high synaptic firing.",
        drugTargets: [
          {
            drugId: "clonidine",
            drugName: "Clonidine",
            drugClass: "Centrally Acting Alpha-2 Adrenergic Agonist",
            action: "Agonism at presynaptic alpha-2A adrenergic autoreceptors in locus coeruleus and brainstem",
            effect: "Suppresses central sympathetic outflow, reducing norepinephrine release and lowering systemic blood pressure.",
          },
          {
            drugId: "mirtazapine",
            drugName: "Mirtazapine",
            drugClass: "Noradrenergic and Specific Serotonergic Antidepressant (NaSSA)",
            action: "Antagonism at presynaptic alpha-2 adrenergic autoreceptors and heteroreceptors",
            effect: "Disinhibits presynaptic negative feedback, enhancing synaptic release of both norepinephrine and serotonin.",
          },
          {
            drugId: "sumatriptan",
            drugName: "Sumatriptan",
            drugClass: "5-HT1B/1D Receptor Agonist (Triptan)",
            action: "Selective agonism at 5-HT1B (vascular) and 5-HT1D (neuronal presynaptic) receptors",
            effect: "Constricts painfully dilated cranial blood vessels and inhibits presynaptic release of vasodilatory calcitonin gene-related peptide (CGRP) from trigeminal nerve endings.",
          },
        ],
      },
      {
        id: "monoamine-reuptake",
        name: "High-Affinity Reuptake Transporters (SERT, NET, DAT)",
        type: "transporter",
        description:
          "Sodium- and chloride-coupled SLC6 secondary active transporters (SERT/SLC6A4, NET/SLC6A2, DAT/SLC6A3) located on presynaptic perisynaptic membranes that pump neurotransmitters out of the synaptic cleft.",
        downstreamEffect:
          "Terminates synaptic neurotransmission by recycling monoamines into presynaptic cytoplasm for repackaging or catabolism.",
        drugTargets: [
          {
            drugId: "fluoxetine",
            drugName: "Fluoxetine",
            drugClass: "Selective Serotonin Reuptake Inhibitor (SSRI)",
            action: "High-affinity competitive inhibition of the serotonin transporter (SERT)",
            effect: "Prolongs serotonin dwell time in synaptic cleft, enhancing activation of postsynaptic 5-HT receptors.",
          },
          {
            drugId: "venlafaxine",
            drugName: "Venlafaxine",
            drugClass: "Serotonin-Norepinephrine Reuptake Inhibitor (SNRI)",
            action: "Dose-dependent dual inhibition of SERT and NET",
            effect: "Elevates synaptic availability of both serotonin and norepinephrine throughout mood and nociceptive circuits.",
          },
          {
            drugId: "bupropion",
            drugName: "Bupropion",
            drugClass: "Norepinephrine-Dopamine Reuptake Inhibitor (NDRI)",
            action: "Dual inhibition of DAT and NET without serotonergic reuptake activity",
            effect: "Augments central noradrenergic and dopaminergic neurotransmission; lacks SSRI-associated sexual dysfunction and somnolence.",
          },
        ],
      },
      {
        id: "monoamine-catabolism",
        name: "Enzymatic Catabolism (MAO-A/B & COMT)",
        type: "enzyme",
        description:
          "Outer mitochondrial membrane flavoenzymes Monoamine Oxidase A and B (deaminating serotonin, norepinephrine, and dopamine) and cytosolic/membrane-bound Catechol-O-Methyltransferase (COMT).",
        downstreamEffect:
          "Converts active monoamines into inactive aldehyde and methyl metabolites (e.g. 5-HIAA, VMA, HVA).",
        drugTargets: [
          {
            drugId: "phenelzine",
            drugName: "Phenelzine",
            drugClass: "Non-selective MAO Inhibitor (Hydrazine MAOI)",
            action: "Irreversible covalent inactivation of both MAO-A and MAO-B catalytic flavin centers",
            effect: "Prevents intracellular oxidative deamination of serotonin, norepinephrine, and dopamine, markedly elevating cytoplasmic neurotransmitter stores.",
          },
          {
            drugId: "selegiline",
            drugName: "Selegiline",
            drugClass: "Selective MAO-B Inhibitor (at standard oral doses)",
            action: "Irreversible mechanism-based suicide inhibition of MAO-B",
            effect: "Selectively slows striatal dopamine degradation, augmenting levodopa efficacy in Parkinson's disease without inhibiting intestinal MAO-A at low doses.",
          },
          {
            drugId: "linezolid",
            drugName: "Linezolid",
            drugClass: "Oxazolidinone Antibiotic with MAOI Activity",
            action: "Reversible nonselective active-site inhibition of MAO-A and MAO-B",
            effect: "Imparts antimicrobial activity against resistant Gram-positive organisms while carrying potential for serotonergic drug interactions.",
          },
          {
            drugId: "entacapone",
            drugName: "Entacapone",
            drugClass: "Peripheral COMT Inhibitor",
            action: "Reversible competitive inhibition of catechol-O-methyltransferase in peripheral tissues",
            effect: "Blocks peripheral methylation of levodopa to 3-O-methyldopa, extending levodopa plasma half-life and central brain delivery.",
          },
        ],
      },
      {
        id: "monoamine-postsynaptic-gpcr",
        name: "Postsynaptic GPCRs (5-HT1A, 5-HT2A, Adrenergic)",
        type: "receptor",
        description:
          "Postsynaptic target receptors that transduce neurotransmitter signals into intracellular secondary messenger cascades: 5-HT1A (Gi/o, adenylyl cyclase inhibition), 5-HT2A (Gq/11, IP3/DAG/calcium mobilization).",
        downstreamEffect:
          "Mediates mood, anxiety, cognition, temperature regulation, blood pressure, and autonomic control.",
        drugTargets: [],
      },
    ],
  },

  // 5) Neuromuscular Junction & Cholinergic Signaling
  {
    id: "nmj-cholinergic",
    name: "Neuromuscular Junction & Cholinergic Signaling",
    shortTitle: "NMJ & Cholinergics",
    category: "Autonomic & Neuromuscular",
    summary:
      "Somatic motor transmission relies on acetylcholine (ACh) vesicular exocytosis into the neuromuscular synaptic cleft, binding to postsynaptic pentameric nicotinic acetylcholine receptors ((alpha-1)2 beta-1 delta epsilon), and rapid hydrolysis by acetylcholinesterase (AChE). Neuromuscular blocking agents act via persistent endplate depolarization (succinylcholine) or competitive antagonism (rocuronium). Reversal pathways operate through distinct principles: indirect enzymatic inhibition (neostigmine + glycopyrrolate) versus direct host-guest supramolecular chelation (sugammadex).",
    clinicalRelevance:
      "Essential for comparing neuromuscular blockade reversal strategies (sugammadex 1:1 cyclodextrin chelation vs neostigmine AChE inhibition + antimuscarinic co-administration), understanding succinylcholine-induced hyperkalemic cardiac arrest in denervated muscle, and avoiding sugammadex-hormonal contraceptive sequestration.",
    keyDrugIds: ["succinylcholine", "rocuronium", "sugammadex", "neostigmine", "glycopyrrolate"],
    citations: [
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics, 14th Ed. (Chapter 11: Nicotine and Agents Acting at the Neuromuscular Junction and Autonomic Ganglia).",
      "Miller's Anesthesia, 9th Ed. (Chapter 29: Neuromuscular Pharmacology).",
      "ASA Practice Guidelines for Monitoring and Antagonism of Neuromuscular Blockade (Anesthesiology 2023).",
    ],
    clinicalPearls: [
      {
        title: "Enzymatic vs Supramolecular Reversal Paradigm",
        collisionOrMechanism: "Neostigmine + Glycopyrrolate vs Sugammadex",
        rationale:
          "Neostigmine reverses neuromuscular blockade indirectly by inhibiting acetylcholinesterase, elevating acetylcholine to displace rocuronium from nicotinic receptors. However, excess ACh also stimulates muscarinic receptors (M2/M3), causing profound bradycardia, asystole, hypersalivation, and bronchospasm unless co-administered with an antimuscarinic (glycopyrrolate). Sugammadex reverses blockade directly by encapsulating rocuronium in a 1:1 cyclodextrin host-guest complex in plasma with zero cholinergic receptor activity.",
        citation: "Welliver M, et al. Sugammadex: A selective relaxant binding agent. AANA J. 2009;77(4):301-308.",
      },
      {
        title: "Succinylcholine Extrajunctional Receptor Hyperkalemia",
        collisionOrMechanism: "Depolarizing Blockade in Denervation / Burns",
        rationale:
          "In conditions with motor denervation, spinal cord injury, extensive burns, or prolonged immobility, immature fetal-type extrajunctional nicotinic receptors (alpha-1)2 beta-1 delta gamma proliferate across the entire muscle sarcolemma. Succinylcholine activates these widespread channels simultaneously, permitting massive, uncontrolled intracellular potassium efflux that causes lethal hyperkalemic cardiac arrest.",
        citation: "Martyn JA, Richtsfeld M. Succinylcholine-induced hyperkalemia in acquired pathologic states. Anesthesiology. 2006;104(1):158-169.",
      },
      {
        title: "Sugammadex Hormonal Contraceptive Chelation",
        collisionOrMechanism: "Cyclodextrin Sequestration of Progesterone",
        rationale:
          "Sugammadex possesses a lipophilic central core designed to bind steroidal neuromuscular blockers (rocuronium, vecuronium). Progesterone and synthetic progestins have steroidal ring structures that can also bind within the cyclodextrin cavity, lowering free serum progestin concentrations and simulating a missed dose of hormonal oral contraceptives.",
        citation: "ASA Practice Guidelines for Neuromuscular Blockade. Anesthesiology. 2023;138(1):13-41.",
      },
    ],
    nodes: [
      {
        id: "nmj-ach-release",
        name: "Presynaptic ACh Synthesis & Quantal Release",
        type: "transporter",
        description:
          "Choline is taken up into the presynaptic motor neuron terminal via CHT1, acetylated by choline acetyltransferase (ChAT), concentrated into synaptic vesicles by vesicular acetylcholine transporter (VAChT), and exocytosed across the active zone upon voltage-gated Ca2+ entry.",
        downstreamEffect:
          "Releases packets of ~5,000-10,000 acetylcholine molecules into the primary synaptic cleft.",
        drugTargets: [],
      },
      {
        id: "nmj-nachr",
        name: "Postjunctional Muscle Nicotinic ACh Receptor (nAChR)",
        type: "ion-channel",
        description:
          "Ligand-gated pentameric ion channel ((alpha-1)2 beta-1 delta epsilon) situated at the crests of junctional folds. Binding of two ACh molecules triggers channel pore opening, allowing rapid Na+ and Ca2+ influx and K+ efflux to generate an endplate potential.",
        downstreamEffect:
          "Depolarizes muscle sarcolemma past threshold, activating Nav1.4 channels to propagate a muscle action potential that initiates myofibrillar contraction.",
        drugTargets: [
          {
            drugId: "succinylcholine",
            drugName: "Succinylcholine",
            drugClass: "Depolarizing Neuromuscular Blocker",
            action: "Agonism at postjunctional muscle nAChR with resistance to synaptic acetylcholinesterase hydrolysis",
            effect: "Produces prolonged endplate depolarization, leading to initial muscle fasciculations followed by flaccid paralysis (Phase I block) due to voltage-gated sodium channel inactivation.",
          },
          {
            drugId: "rocuronium",
            drugName: "Rocuronium",
            drugClass: "Non-depolarizing Aminosteroid Neuromuscular Blocker",
            action: "Competitive antagonism at postjunctional muscle nicotinic acetylcholine receptors",
            effect: "Competitively prevents acetylcholine binding, abolishing endplate potential generation and causing flaccid paralysis without fasciculations.",
          },
        ],
      },
      {
        id: "nmj-ache",
        name: "Synaptic Acetylcholinesterase (AChE / Acetylhydrolase)",
        type: "enzyme",
        description:
          "High-turnover serine hydrolase anchored in the basal lamina of the synaptic gutter. Hydrolyzes released acetylcholine into choline and acetate in sub-millisecond timescales.",
        downstreamEffect:
          "Terminates each endplate action potential, allowing muscle repolarization in preparation for subsequent firing.",
        drugTargets: [
          {
            drugId: "neostigmine",
            drugName: "Neostigmine",
            drugClass: "Reversible Acetylcholinesterase Inhibitor",
            action: "Carbamylates the esteratic site of acetylcholinesterase, retarding enzyme recovery",
            effect: "Accumulates synaptic acetylcholine, which competitively displaces non-depolarizing blockers (rocuronium) from nAChR, restoring neuromuscular transmission.",
          },
        ],
      },
      {
        id: "nmj-cyclodextrin-chelation",
        name: "Host-Guest Supramolecular Chelation (Cyclodextrin)",
        type: "effector",
        description:
          "Physical non-covalent supramolecular chemical encapsulation. Modified gamma-cyclodextrin ring possesses a lipophilic internal cavity that tightly encapsulates steroidal neuromuscular blockers.",
        downstreamEffect:
          "Rapidly sequesters free aminosteroid molecules in plasma, shifting equilibrium away from neuromuscular junction receptors.",
        drugTargets: [
          {
            drugId: "sugammadex",
            drugName: "Sugammadex",
            drugClass: "Selective Relaxant Binding Agent (Modified Gamma-Cyclodextrin)",
            action: "Direct 1:1 host-guest supramolecular chelation of rocuronium and vecuronium in intravascular plasma",
            effect: "Rapidly reduces free plasma rocuronium to near zero, creating a steep chemical concentration gradient that draws rocuronium away from endplate nAChRs; terminates neuromuscular block in minutes.",
          },
        ],
      },
      {
        id: "nmj-muscarinic-axis",
        name: "Muscarinic Parasympathetic Axis (M2/M3 Receptors)",
        type: "receptor",
        description:
          "G-protein coupled muscarinic receptors: M2 (cardiac nodal tissue, Gi/o, causing profound bradycardia and conduction slowing) and M3 (airway smooth muscle and glands, Gq/11, causing bronchoconstriction and excessive secretions).",
        downstreamEffect:
          "Stimulated whenever systemic acetylcholinesterase is inhibited by neostigmine, leading to potential cholinergic crisis if unblocked.",
        drugTargets: [
          {
            drugId: "glycopyrrolate",
            drugName: "Glycopyrrolate",
            drugClass: "Quaternary Synthetic Antimuscarinic Agent",
            action: "Competitive antagonism at peripheral M2 and M3 muscarinic acetylcholine receptors; does not cross blood-brain barrier",
            effect: "Protects against neostigmine-induced severe bradycardia, asystole, excessive salivation, and bronchospasm during neuromuscular reversal.",
          },
        ],
      },
    ],
  },

  // 6) Arachidonic Acid Cascade & Eicosanoids
  {
    id: "arachidonic-eicosanoid",
    name: "Arachidonic Acid Cascade & Eicosanoids",
    shortTitle: "Arachidonic Acid & COX",
    category: "Inflammation & Eicosanoids",
    summary:
      "Membrane phospholipids are cleaved by phospholipase A2 (PLA2) to release 20-carbon arachidonic acid, which bifurcates into the cyclooxygenase pathway (COX-1 constitutive vs COX-2 inducible) and the 5-lipoxygenase pathway (5-LOX). The COX pathway yields prostaglandins (PGE2, PGI2) and thromboxane (TXA2); the 5-LOX pathway produces leukotrienes (LTB4, LTC4, LTD4, LTE4). Anti-inflammatory agents act through irreversible acetylation, selective or non-selective active-site competition, or transcriptional repression.",
    clinicalRelevance:
      "Explains the cardiovascular thrombotic risk of selective COX-2 inhibitors (loss of endothelial prostacyclin without platelet thromboxane inhibition), Aspirin-Exacerbated Respiratory Disease (AERD / Samter's triad from leukotriene shunting), and the competitive blunting of aspirin's antiplatelet action by prior ibuprofen administration.",
    keyDrugIds: ["prednisone", "dexamethasone", "aspirin", "celecoxib", "ibuprofen", "zileuton", "montelukast"],
    citations: [
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics, 14th Ed. (Chapter 34: Pharmacotherapy of Inflammation, Fever, Pain, and Gout).",
      "Katzung's Basic & Clinical Pharmacology, 15th Ed. (Chapter 36: Nonsteroidal Anti-Inflammatory Drugs).",
      "Grosser T, Fries S, FitzGerald GA. Biological basis for the cardiovascular consequences of COX-2 inhibition. J Clin Invest. 2006;116(1):4-15.",
    ],
    clinicalPearls: [
      {
        title: "Prothrombotic Imbalance with Selective COX-2 Inhibitors",
        collisionOrMechanism: "Endothelial PGI2 Suppression vs Platelet TXA2 Persistence",
        rationale:
          "Vascular endothelial cells express COX-2 to synthesize prostacyclin (PGI2), a potent vasodilator and inhibitor of platelet aggregation. Mature platelets express only COX-1, which generates thromboxane A2 (TXA2), a potent platelet aggregator and vasoconstrictor. Selective COX-2 inhibitors (celecoxib) suppress endothelial PGI2 while sparing platelet COX-1 TXA2, creating an unopposed prothrombotic state that elevates risk of myocardial infarction and stroke.",
        citation: "Grosser T, Fries S, FitzGerald GA. Biological basis for the cardiovascular consequences of COX-2 inhibition. J Clin Invest. 2006;116(1):4-15.",
      },
      {
        title: "Aspirin-Exacerbated Respiratory Disease (AERD)",
        collisionOrMechanism: "COX-1 Blockade Shunting to 5-LOX Pathway",
        rationale:
          "COX-1-derived PGE2 normally provides an inhibitory physiologic brake on 5-lipoxygenase activity in airway leukocytes. In AERD patients, non-selective COX-1 inhibition depletes PGE2, unleashing unchecked shunting of arachidonic acid through 5-LOX. This produces massive levels of cysteinyl leukotrienes (LTC4, LTD4, LTE4), causing severe bronchospasm, laryngospasm, and profuse rhinorrhea.",
        citation: "Laidlaw TM, Boyce JA. Pathogenesis of aspirin-exacerbated respiratory disease. J Allergy Clin Immunol. 2013;132(1):3-14.",
      },
      {
        title: "Aspirin-Ibuprofen Platelet Binding Steric Collision",
        collisionOrMechanism: "Reversible NSAID Blockade of Aspirin Ser529 Acetylation",
        rationale:
          "Aspirin permanently inactivates platelet COX-1 by covalently acetylating Serine-529 within the catalytic channel. Ibuprofen binds reversibly near Serine-529. If ibuprofen is taken prior to low-dose aspirin, it sterically blocks aspirin from reaching Serine-529. When ibuprofen dissociates hours later, un-acetylated platelet COX-1 recovers full thromboxane-producing capacity, nullifying aspirin's cardioprotective antiplatelet effect.",
        citation: "Catella-Lawson F, et al. Cyclooxygenase inhibitors and the antiplatelet effects of aspirin. N Engl J Med. 2001;345(25):1809-1817.",
      },
    ],
    nodes: [
      {
        id: "eicosanoid-pla2",
        name: "Phospholipase A2 (PLA2) Membrane Cleavage",
        type: "enzyme",
        description:
          "Calcium-dependent lipolytic enzyme that hydrolyzes the sn-2 ester bond of membrane glycerophospholipids to liberate free 20-carbon arachidonic acid into the cytoplasm.",
        downstreamEffect:
          "Serves as the primary committed substrate gateway for both cyclooxygenase and lipoxygenase eicosanoid cascades.",
        drugTargets: [
          {
            drugId: "prednisone",
            drugName: "Prednisone",
            drugClass: "Systemic Glucocorticoid (Corticosteroid)",
            action: "Transactivation of annexin A1 (lipocortin-1) via glucocorticoid receptor; suppresses NF-kB driven COX-2 transcription",
            effect: "Inhibits PLA2 activity to prevent arachidonic acid release; comprehensively shuts down synthesis of both prostaglandins and leukotrienes.",
          },
          {
            drugId: "dexamethasone",
            drugName: "Dexamethasone",
            drugClass: "High-Potency Glucocorticoid",
            action: "Potent glucocorticoid receptor agonism inducing annexin A1 and repressing inflammatory gene transcription",
            effect: "Profoundly suppresses upstream arachidonic acid liberation and cytokine-induced eicosanoid cascades.",
          },
        ],
      },
      {
        id: "eicosanoid-cox-1",
        name: "Cyclooxygenase-1 (COX-1 / PTGS1 - Constitutive)",
        type: "enzyme",
        description:
          "Constitutively expressed homodimeric hemoprotein in gastric mucosa, platelets, and renal vasculature. Converts arachidonic acid to PGH2, which is converted in platelets by TXA synthase into Thromboxane A2.",
        downstreamEffect:
          "Drives platelet aggregation, maintains gastric mucosal cytoprotective mucus/bicarbonate secretion, and preserves renal medullary blood flow.",
        drugTargets: [
          {
            drugId: "aspirin",
            drugName: "Aspirin (Acetylsalicylic Acid)",
            drugClass: "Irreversible Cyclooxygenase Inhibitor",
            action: "Irreversible covalent acetylation of Serine-529 in the COX-1 catalytic channel",
            effect: "Permanently blocks substrate access in anucleate platelets, suppressing thromboxane A2 (TXA2) generation for the 7-10 day platelet lifespan.",
          },
          {
            drugId: "ibuprofen",
            drugName: "Ibuprofen",
            drugClass: "Nonselective Reversible COX Inhibitor",
            action: "Reversible competitive inhibition of the COX-1 and COX-2 catalytic channels",
            effect: "Reversibly inhibits platelet TXA2 and suppresses gastric protective PGE2/PGI2, risking gastric mucosal erosions and ulceration.",
          },
        ],
      },
      {
        id: "eicosanoid-cox-2",
        name: "Cyclooxygenase-2 (COX-2 / PTGS2 - Inducible)",
        type: "enzyme",
        description:
          "Inducible homodimer markedly upregulated by inflammatory cytokines (IL-1, TNF-alpha), growth factors, and endotoxin in macrophages, synovial cells, and vascular endothelium; constitutively expressed in kidney and brain.",
        downstreamEffect:
          "Generates inflammatory prostaglandins (PGE2, PGI2) responsible for inflammatory pain, hyperalgesia, fever, and endothelial vasodilation.",
        drugTargets: [
          {
            drugId: "celecoxib",
            drugName: "Celecoxib",
            drugClass: "Selective COX-2 Inhibitor (Coxib)",
            action: "Selective competitive binding within the larger, flexible hydrophilic side pocket of COX-2",
            effect: "Reduces inflammatory pain and joint inflammation with lower gastric ulceration risk compared to nonselective NSAIDs; does not inhibit platelet COX-1 or TXA2.",
          },
        ],
      },
      {
        id: "eicosanoid-5-lox",
        name: "5-Lipoxygenase Pathway (5-LOX & FLAP)",
        type: "enzyme",
        description:
          "Non-heme iron dioxygenase that converts arachidonic acid in leukocytes into 5-HPETE and then leukotriene A4 (LTA4) in the presence of 5-lipoxygenase-activating protein (FLAP).",
        downstreamEffect:
          "Supplies LTA4 for conversion into chemotactic LTB4 (neutrophil activation) and cysteinyl leukotrienes LTC4, LTD4, and LTE4.",
        drugTargets: [
          {
            drugId: "zileuton",
            drugName: "Zileuton",
            drugClass: "5-Lipoxygenase Inhibitor",
            action: "Direct active-site iron-chelating antioxidant inhibition of 5-lipoxygenase",
            effect: "Suppresses initial conversion of arachidonic acid to 5-HPETE, blocking synthesis of both LTB4 and cysteinyl leukotrienes (LTC4/LTD4/LTE4).",
          },
        ],
      },
      {
        id: "eicosanoid-cyslt1-receptor",
        name: "Cysteinyl Leukotriene Receptor 1 (CysLT1)",
        type: "receptor",
        description:
          "Gq-coupled GPCR on human airway smooth muscle cells, pulmonary mast cells, and eosinophils, exhibiting high affinity for LTD4 and LTC4.",
        downstreamEffect:
          "Triggers profound airway smooth muscle bronchoconstriction (potency >1000x histamine), microvascular plasma leakage, and hypersecretion of mucus.",
        drugTargets: [
          {
            drugId: "montelukast",
            drugName: "Montelukast",
            drugClass: "Leukotriene Receptor Antagonist (LTRA)",
            action: "Selective, high-affinity competitive antagonism at the CysLT1 receptor",
            effect: "Prevents LTD4- and LTC4-mediated bronchospasm and airway mucosal edema in asthma and allergic rhinitis.",
          },
        ],
      },
    ],
  },
];

/**
 * Retrieve a specific pathway by its unique identifier.
 */
export function getPathwayById(id: string): MechanismPathway | null {
  const normalized = id.toLowerCase().trim();
  return MECHANISM_PATHWAYS.find((p) => p.id.toLowerCase() === normalized) ?? null;
}

/**
 * Find all mechanism pathways that feature a given drug (by ID or exact name).
 */
export function findPathwaysForDrug(drugId: string): MechanismPathway[] {
  const query = drugId.toLowerCase().trim();
  if (!query) return [];

  return MECHANISM_PATHWAYS.filter((pathway) => {
    // Check key drugs list
    if (pathway.keyDrugIds.some((k) => k.toLowerCase() === query)) {
      return true;
    }

    // Check node drug targets
    return pathway.nodes.some((node) =>
      node.drugTargets.some(
        (target) =>
          target.drugId.toLowerCase() === query ||
          target.drugName.toLowerCase() === query,
      ),
    );
  });
}

/**
 * Return all available mechanism pathways.
 */
export function getAllPathways(): readonly MechanismPathway[] {
  return MECHANISM_PATHWAYS;
}
