/**
 * Pharmacokinetics & Nonlinear Clearance Mechanism Engine
 *
 * Educational decision support under FD&C Act § 520(o)(1)(E).
 * Grounded in canonical pharmacokinetics literature:
 * - Rowland & Tozer's Clinical Pharmacokinetics and Pharmacodynamics (5th ed.)
 * - Goodman & Gilman's The Pharmacological Basis of Therapeutics (14th ed.)
 * - Applied Pharmacokinetics & Pharmacodynamics: Principles of Therapeutic Drug Monitoring (Burton et al., 4th ed.)
 * - Basic & Clinical Pharmacology (Katzung et al., 15th ed.)
 * - Basic Clinical Pharmacokinetics (Winter, 6th ed.)
 *
 * Provides biochemical, mathematical, and clinical explanations of nonlinear clearance,
 * volume of distribution, dialytic extraction, protein binding shifts, and steady-state accumulation.
 * Does NOT generate patient-specific dosing directives or clinical prescription orders.
 */

export const REGULATORY_NOTICE =
  "Educational Decision Support under FD&C Act § 520(o)(1)(E). This reference provides pharmacological, mathematical, and mechanistic principles for healthcare professional and trainee education. It does not provide patient-specific dosing orders, therapeutic prescriptions, or clinical treatment directives. Consult official FDA prescribing monographs, validated institutional therapeutic drug monitoring (TDM) protocols, and peer-reviewed clinical guidelines.";

export const PK_REGULATORY_NOTICE = REGULATORY_NOTICE;

export type PkCategory =
  | "Nonlinear Kinetics"
  | "Distribution & Binding"
  | "Clearance & Steady-State"
  | "Organ Clearance";

export interface PkEquation {
  name: string;
  formula: string;
  description: string;
}

export interface PkConcept {
  id: string;
  title: string;
  shortName: string;
  category: PkCategory;
  summary: string;
  molecularMechanism: string;
  clinicalImplications: string;
  exemplarDrugs: string[];
  mathematicalModel?: string;
  equations?: PkEquation[];
  citations: string[];
  clinicalPearls: string[];
  examBoardNotes: string[];
}

export interface MichaelisMentenPoint {
  doseMgDay: number;
  cssMgL: number;
}

export interface MichaelisMentenResult {
  doseMgDay: number;
  vMax: number;
  km: number;
  cssMgL: number | null;
  clearanceLDay: number | null;
  isSaturated: boolean;
  percentVmaxUtilized: number;
  regime: "linear" | "mixed-transitional" | "capacity-limited-zero-order";
  explanation: string;
  curve: MichaelisMentenPoint[];
}

export interface DialyzabilityEvaluation {
  vdLKg: number;
  proteinBindingPct: number;
  mwDa: number;
  rating: "dialyzable" | "partially-dialyzable" | "not-dialyzable";
  score: number;
  criteria: {
    vd: { meetsCriterion: boolean; detail: string; score: number };
    proteinBinding: { meetsCriterion: boolean; detail: string; score: number };
    molecularWeight: { meetsCriterion: boolean; detail: string; score: number };
    waterSolubility: { meetsCriterion: boolean; detail: string; score: number };
  };
  mechanisticExplanation: string;
  clinicalImplication: string;
}

export interface ProteinDisplacementResult {
  totalMeasuredMcgMl: number;
  baselineFreeFractionPct: number;
  displacedFreeFractionPct: number;
  baselineFreeMcgMl: number;
  displacedFreeMcgMl: number;
  freeIncreaseFold: number;
  serumAlbuminGDL: number;
  winterTozerCorrectedMcgMl: number;
  isDeceptiveNormal: boolean;
  explanation: string;
}

export interface SteadyStateAccumulationResult {
  halfLifeHours: number;
  intervalHours: number;
  eliminationRateKePerHr: number;
  accumulationFactorR: number;
  fractionRemainingAtTrough: number;
  hoursToNinetyPercentCss: number;
  hoursToNinetyFivePercentCss: number;
  halfLivesToSteadyState: number;
  loadingDoseRatio: number;
  explanation: string;
}

export const PK_CONCEPTS: readonly PkConcept[] = [
  {
    id: "michaelis-menten-phenytoin",
    title: "Michaelis-Menten Nonlinear Kinetics (Phenytoin Saturation)",
    shortName: "Michaelis-Menten Kinetics",
    category: "Nonlinear Kinetics",
    summary:
      "Metabolic enzyme capacity saturation shifts drug elimination from predictable linear first-order kinetics to dangerous capacity-limited zero-order kinetics as plasma concentrations approach the enzyme affinity constant Km (~4-6 mg/L). Small dose increments cause exponential plasma concentration spikes and severe cerebellar toxicity.",
    molecularMechanism:
      "Phenytoin elimination is mediated primarily by hepatic CYP2C9 (~90%) and CYP2C19 (~10%) into 5-(4-hydroxyphenyl)-5-phenylhydantoin (HPPH), which subsequently undergoes glucuronidation. The rate of elimination is governed by Michaelis-Menten kinetics: Rate = (Vmax * C) / (Km + C), where Vmax is the maximum rate of metabolism (typically ~7 mg/kg/day or ~400-600 mg/day in adults) and Km is the Michaelis constant representing the substrate concentration at half-maximal velocity (typically ~4-6 mg/L or mcg/mL). At low subtherapeutic concentrations where C << Km, the denominator simplifies to Km (Rate ≈ (Vmax / Km) * C); elimination behaves linearly (first-order), and clearance is constant. However, the therapeutic concentration range (10-20 mg/L) lies above the Km value. As plasma levels approach and exceed Km, CYP2C9 active sites become progressively occupied. Metabolic clearance (CL = Vmax / (Km + C)) declines precipitously. When the dosing rate nears Vmax, metabolic capacity is overwhelmed and the system transitions to zero-order elimination: a fixed amount of drug is cleared per unit time rather than a fixed fraction. Small dose escalations (such as 25-50 mg/day) eliminate the remaining metabolic reserve (Vmax - Dose), producing exponential, non-proportional surges in steady-state plasma concentrations.",
    clinicalImplications:
      "In linear kinetics, doubling the daily dose doubles the steady-state plasma concentration. In phenytoin's Michaelis-Menten regime, increasing daily intake by 20% to 30% can triple or quadruple serum levels, abruptly pushing a patient from subtherapeutic efficacy into life-threatening toxicity. Concentration-dependent neurological toxicity presents sequentially: horizontal nystagmus at >20 mcg/mL, gait ataxia and slurred speech at >30 mcg/mL, and encephalopathy, lethargy, coma, or paradoxical seizure aggravation at >40 mcg/mL. Dose escalations within the therapeutic range must be made in conservative 25-30 mg increments with therapeutic drug monitoring. The elimination half-life is not constant; it lengthens from ~12-24 hours at low concentrations to >40-60 hours at supratherapeutic concentrations, drastically delaying the time required to achieve a new steady state.",
    exemplarDrugs: ["phenytoin"],
    mathematicalModel:
      "Rate = (Vmax * C) / (Km + C); Steady-State Concentration Css = (Dose * Km) / (Vmax - Dose); Clearance CL = Vmax / (Km + C)",
    equations: [
      {
        name: "Michaelis-Menten Rate of Elimination",
        formula: "Rate = (Vmax * C) / (Km + C)",
        description:
          "Relates the elimination rate to plasma concentration C, maximum metabolic velocity Vmax, and substrate affinity Km.",
      },
      {
        name: "Steady-State Concentration (Css)",
        formula: "Css = (Dose * Km) / (Vmax - Dose)",
        description:
          "Predicts steady-state concentration for a given daily maintenance dose when Dose < Vmax. As Dose approaches Vmax, Css asymptotically approaches infinity.",
      },
      {
        name: "Concentration-Dependent Clearance",
        formula: "CL = Vmax / (Km + C)",
        description:
          "Clearance is not constant; it progressively decreases as plasma concentration C increases.",
      },
    ],
    citations: [
      "Rowland M, Tozer TN. Clinical Pharmacokinetics and Pharmacodynamics: Concepts and Applications. 5th ed. Wolters Kluwer; 2019.",
      "Brunton LL, Hilal-Dandan R, Knollmann BC. Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. McGraw-Hill; 2023.",
      "Winter ME. Basic Clinical Pharmacokinetics. 6th ed. Lippincott Williams & Wilkins; 2017.",
      "Burton ME, Shaw LM, Schentag JJ, Evans WE. Applied Pharmacokinetics & Pharmacodynamics: Principles of Therapeutic Drug Monitoring. 4th ed. Lippincott Williams & Wilkins; 2005.",
    ],
    clinicalPearls: [
      "Linear kinetics eliminate a constant fraction per unit time; Michaelis-Menten kinetics near Vmax eliminate a constant amount per unit time.",
      "Phenytoin's half-life is variable: t1/2 extends from 12 hours at subtherapeutic levels to over 48 hours at toxic levels because clearance collapses as CYP2C9 saturates.",
      "Enteral tube feeding formulas bind phenytoin in the gastrointestinal tract; holding enteral nutrition 1 to 2 hours before and after administration or monitoring free phenytoin prevents subtherapeutic treatment failure.",
      "CYP2C9 poor metabolizers (alleles *2 and *3) possess lower intrinsic Vmax values and experience saturation toxicity at standard dosages.",
    ],
    examBoardNotes: [
      "USMLE / NAPLEX Trap: If a patient on phenytoin 300 mg/day has a level of 8 mcg/mL and a goal of 15 mcg/mL, increasing to 400 mg/day will precipitate toxicity (>25-30 mcg/mL) because metabolic clearance is non-linear.",
      "Inflection Point: Below Km (~4 mg/L), elimination is approximately first-order; above Km, elimination approaches zero-order.",
      "Asymptote: When daily dose equals or exceeds Vmax, the denominator (Vmax - Dose) reaches zero or negative values, indicating that steady state is mathematically impossible and toxic accumulation will proceed unchecked.",
    ],
  },
  {
    id: "zero-order-ethanol-salicylate",
    title: "Capacity-Limited Clearance (Ethanol & Salicylate Overdose)",
    shortName: "Capacity-Limited Zero-Order",
    category: "Nonlinear Kinetics",
    summary:
      "When drug elimination pathways saturate, clearance switches from constant-fraction elimination to constant-amount elimination. Ethanol operates under fixed zero-order clearance even at social doses, while salicylates undergo dramatic zero-order transition during overdose as hepatic conjugation saturates, expanding elimination half-life from 2-4 hours to 20-30 hours.",
    molecularMechanism:
      "Ethanol: Hepatic alcohol dehydrogenase (ADH, class I) oxidizes ethanol to acetaldehyde with a very low Michaelis constant Km of ~0.05-0.10 g/L (~1-2 mM or ~2-5 mg/dL). Because legal intoxication is defined at 0.08 g/dL (80 mg/dL), ADH is fully saturated at virtually all ordinary, social, and toxic concentrations. Elimination therefore proceeds via fixed zero-order kinetics: a constant amount of ~7 to 10 grams of absolute alcohol per hour (corresponding to a plasma clearance rate of ~15 to 20 mg/dL per hour, or roughly one standard drink per hour) is metabolized by adults. Minor supplemental pathways including microsomal ethanol oxidizing system (CYP2E1) and catalase contribute only modest clearance at elevated levels.\n\nSalicylate (Aspirin): Acetylsalicylic acid is rapidly deacetylated by systemic esterases into salicylic acid. Salicylate clearance relies on five pathways: (1) glycine conjugation to salicyluric acid (~75%), (2) glucuronidation to salicyl phenolic glucuronide (~10%), (3) glucuronidation to salicyl acyl glucuronide (~5%), (4) ring hydroxylation to gentisic acid via CYP2C9/2E1 (<1%), and (5) unchanged renal glomerular filtration and tubular handling (~10% at therapeutic doses). Crucially, hepatic glycine N-acyltransferase and glucuronosyltransferases have low maximal capacities. At low antiplatelet doses (81 mg), elimination is linear first-order with an elimination half-life of 2 to 4 hours. In high anti-inflammatory doses or acute overdose (>150 mg/kg), the glycine and glucuronide conjugation pathways become completely saturated. Clearance shifts to capacity-limited zero-order elimination, and the apparent elimination half-life expands tenfold from 2-4 hours to 20-30 hours or longer.",
    clinicalImplications:
      "In salicylate intoxication, saturation of hepatic biotransformation shifts the burden of elimination onto renal tubular excretion of unchanged salicylate. Salicylic acid is a weak organic acid with a pKa of approximately 3.0. In normal acidic urine (pH 5.0 to 5.5), a substantial proportion exists as non-ionized, lipophilic salicylic acid, which readily diffuses across the renal tubular epithelium back into systemic circulation. Systemic acidemia further drives uncharged salicylate across the blood-brain barrier into cerebral tissue, where it uncouples oxidative phosphorylation, inhibits the citric acid cycle, and causes lethal neuroglycopenia, hyperpyrexia, and cerebral edema. Therapeutic alkalinization of the urine (target urine pH 7.5 to 8.5) utilizing intravenous sodium bicarbonate ionizes tubular salicylate into its impermeable salicylate conjugate base (COO-), trapping it in the tubular lumen (ion trapping) and accelerating renal clearance more than tenfold. Hemodialysis is the definitive extracorporeal intervention when serum levels exceed 90-100 mg/dL or when severe acidemia or end-organ impairment occurs.",
    exemplarDrugs: ["ethanol", "aspirin"],
    mathematicalModel:
      "dC/dt = -k0 (zero-order elimination rate); Salicylate half-life expansion: t1/2(low) = 2-4 h -> t1/2(overdose) = 20-30 h; Henderson-Hasselbalch Ion Trapping: pH - pKa = log([A-] / [HA])",
    equations: [
      {
        name: "Zero-Order Elimination Rate",
        formula: "dC/dt = -k0",
        description:
          "Concentration decreases linearly over time at constant rate k0 rather than exponentially.",
      },
      {
        name: "Henderson-Hasselbalch Ion Trapping",
        formula: "pH - pKa = log([A-] / [HA])",
        description:
          "At urine pH 8.0 with salicylate pKa 3.0, the ratio of ionized to non-ionized drug is 100,000:1, preventing passive tubular reabsorption.",
      },
    ],
    citations: [
      "Katzung BG, Vanderah TW. Basic & Clinical Pharmacology. 15th ed. McGraw-Hill; 2021.",
      "Goldfrank LR, Nelson LS, Howland MA, et al. Goldfrank's Toxicologic Emergencies. 11th ed. McGraw-Hill; 2019.",
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. McGraw-Hill; 2023.",
      "Levy G. Pharmacokinetics of salicylate elimination in man. J Pharm Sci. 1965;54(7):959-967.",
    ],
    clinicalPearls: [
      "Ethanol clears at a constant rate of approximately 15-20 mg/dL/hour regardless of initial concentration because alcohol dehydrogenase has a Km of only ~2-5 mg/dL.",
      "Aspirin overdose causes a classic biphasic acid-base disturbance: early primary respiratory alkalosis from direct medullary respiratory center stimulation, followed by primary high anion gap metabolic acidosis from uncoupling of oxidative phosphorylation and accumulation of lactate and ketoacids.",
      "Urinary alkalinization leverages ion trapping: raising urine pH from 6.0 to 8.0 increases the ionized fraction from 99.9% to 99.999%, resulting in a >10-fold increase in salicylate excretion.",
    ],
    examBoardNotes: [
      "Board Trap: In an acute aspirin overdose, do not assume an elimination half-life of 2 to 3 hours; capacity saturation prolongs t1/2 to 20 to 30 hours.",
      "First-order elimination produces a linear plot on semilogarithmic axes (constant fraction per time); zero-order elimination produces a linear plot on arithmetic axes (constant amount per time).",
    ],
  },
  {
    id: "volume-of-distribution-dialysis",
    title: "Volume of Distribution (Vd) & Extracorporeal Dialytic Clearance",
    shortName: "Vd & Dialytic Clearance",
    category: "Distribution & Binding",
    summary:
      "Apparent volume of distribution (Vd = Dose / C0) dictates the anatomical accessibility of drug molecules to extracorporeal hemodialyzer membranes. Drugs sequestered in peripheral tissue cannot be effectively cleared by blood-based dialysis, establishing the four cardinal determinants of dialyzability: Vd < 1 L/kg, protein binding < 80%, MW < 500 Da, and high water solubility.",
    molecularMechanism:
      "Apparent volume of distribution (Vd = Amount in body / Plasma concentration) is an abstract proportionality parameter reflecting the extent of extravascular tissue uptake relative to intravascular presence. Total body water comprises ~0.6 L/kg (~42 L in a 70 kg individual); intravascular plasma volume comprises ~0.04-0.05 L/kg (~3 L); extracellular fluid comprises ~0.2 L/kg (~14 L).\n\nWhen a drug exhibits a low Vd (<0.2 to 0.5 L/kg), the overwhelming majority of total body drug burden resides within the intravascular and extracellular fluid compartments, making it directly accessible to blood circulating through an extracorporeal dialyzer cartridge. Conversely, when a drug exhibits a large Vd (>1-2 L/kg, and especially >3-5 L/kg), extensive lipid solubility, high tissue binding, or intracellular sequestration partitions >95% to 99% of total body drug burden outside the vascular tree. Because hemodialysis clears only the blood volume passing through the dialyzer (plasma volume ~3 L), even a dialyzer with 100% extraction efficiency clears only a negligible fraction of the total body burden over a 4-hour session. Furthermore, temporary drops in serum levels during dialysis are rapidly erased by post-dialysis rebound as drug redistributes from deep tissue stores back into the vascular compartment.\n\nThe Four Cardinal Determinants of Dialyzability:\n1. Volume of Distribution: Vd < 1.0 L/kg (ideally < 0.2-0.5 L/kg).\n2. Protein Binding: Only free, unbound drug passes through dialyzer membrane pores. Protein binding must be < 80% (ideally < 50%).\n3. Molecular Weight: Conventional low-flux membranes clear solutes < 500 Da; high-flux synthetic membranes clear middle molecules up to 1000-1500 Da. Solutes > 1500 Da are excluded by size.\n4. Water Solubility: Hydrophilic molecules distribute into aqueous dialysate; lipophilic molecules adhere to tissue lipid bilayers.",
    clinicalImplications:
      "Gentamicin (Vd ~0.25 L/kg, protein binding ~10%, MW 477 Da) is hydrophilic and extracellular; hemodialysis clears ~50% of total body burden in a single run, mandating post-dialysis replacement dosing. Lithium (Vd ~0.7 L/kg, protein binding 0%, MW 7 Da) is an inorganic cation that is dialyzable; however, because it enters intracellular compartments, post-dialysis rebound occurs as intracellular lithium slowly diffuses back into plasma, often requiring extended or repeated dialysis sessions. In contrast, Digoxin (Vd ~5-7 L/kg, heavily bound to Na+/K+-ATPase in skeletal and cardiac muscle), Amiodarone (Vd ~60 L/kg, concentrated in adipose and liver), and Tricyclic Antidepressants (Amitriptyline Vd ~15-40 L/kg) have massive volumes of distribution; hemodialysis removes <2% to 3% of total body burden and is useless for toxicity. Warfarin (Vd ~0.14 L/kg, MW 308 Da) exemplifies the protein-binding barrier: despite a tiny Vd and low molecular weight, warfarin is ~99% bound to albumin; the free fraction (<1%) is so minuscule that dialytic extraction is clinically insignificant.",
    exemplarDrugs: ["gentamicin", "warfarin", "digoxin", "amiodarone", "lithium"],
    mathematicalModel:
      "Vd = Dose / C0; Dialytic Clearance CL_HD = Q_blood * ((C_in - C_out) / C_in); Fraction Removed = (CL_HD * t) / (Vd * C0)",
    equations: [
      {
        name: "Apparent Volume of Distribution",
        formula: "Vd = Amount in Body / Plasma Concentration",
        description:
          "Proportionality constant relating total body drug content to measured plasma concentration.",
      },
      {
        name: "Dialyzer Extraction Ratio",
        formula: "ER = (C_in - C_out) / C_in",
        description:
          "Fraction of drug entering the dialyzer that is extracted across the membrane in a single pass.",
      },
    ],
    citations: [
      "Burton ME, Shaw LM, Schentag JJ, Evans WE. Applied Pharmacokinetics & Pharmacodynamics. 4th ed. Lippincott Williams & Wilkins; 2005.",
      "Decker BS, et al. Extracorporeal Treatment in Poisoning (EXTRIP) Workgroup Guidelines. Clin J Am Soc Nephrol. 2014;9(11):1982-1988.",
      "Bennett WM, et al. Drug Prescribing in Renal Failure: Dosing Guidelines for Adults and Children. 5th ed. ACP; 2007.",
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. McGraw-Hill; 2023.",
    ],
    clinicalPearls: [
      "Vd is not a physical anatomic volume: highly tissue-bound drugs like amiodarone have calculated Vd values exceeding 4,000 liters in a 70 kg human.",
      "The Warfarin Paradox: Low Vd (~0.14 L/kg) and low MW (308 Da) would suggest dialyzability, but 99% albumin binding acts as an absolute barrier to membrane transit.",
      "Post-dialysis rebound: In two-compartment drugs like lithium and vancomycin, plasma concentrations drop during dialysis and rebound 20% to 35% within 2 to 4 hours post-run due to tissue redistribution.",
    ],
    examBoardNotes: [
      "USMLE / Nephrology Board Trap: Hemodialysis is ineffective for digoxin toxicity because of its massive volume of distribution (>5 L/kg); treatment requires Digoxin Immune Fab (DigiFab).",
      "The 4 Dialysis Criteria: Vd < 1 L/kg, Protein Binding < 80%, MW < 500 Da (or < 1500 Da with high-flux membranes), and High Water Solubility.",
    ],
  },
  {
    id: "protein-binding-displacement",
    title: "Plasma Protein Binding & Free Fraction (fu) Shifts",
    shortName: "Protein Binding Displacement",
    category: "Distribution & Binding",
    summary:
      "Only pharmacologically unbound (free) drug crosses capillary membranes and engages therapeutic targets. When highly protein-bound drugs are displaced from albumin, active free levels surge while measured total levels may appear deceptive or paradoxically normal.",
    molecularMechanism:
      "In circulating blood, drugs exist in dynamic equilibrium between protein-bound complexes and unbound molecules: Drug + Protein <=> Drug-Protein Complex. The free fraction is defined as fu = Unbound Concentration (Cu) / Total Concentration (Ctotal).\n\nTwo primary plasma proteins govern binding:\n1. Human Serum Albumin (~40-50 g/L, 66.5 kDa): Binds primarily acidic and neutral lipophilic drugs (e.g., phenytoin, valproic acid, warfarin, salicylates, ceftriaxone, NSAIDs, sulfonamides).\n2. Alpha-1-Acid Glycoprotein (AAG, ~0.4-1.0 g/L, 41 kDa): Acute-phase reactant synthesized by the liver; binds primarily basic and lipophilic drugs (e.g., lidocaine, propranolol, quinidine, tricyclic antidepressants, verapamil, methadone). AAG concentrations rise markedly during inflammation, infection, trauma, malignancy, and acute myocardial infarction.\n\nSaturable Binding & Displacement Mechanism: Phenytoin is normally ~90% bound to albumin (fu = 0.10). A total measured level of 15 mcg/mL corresponds to a therapeutic free concentration of 1.5 mcg/mL. When a displacing agent with high affinity and high molar concentration—such as Valproic Acid (therapeutic level 50-100 mcg/mL, 90% albumin bound)—is introduced, it competes for shared albumin binding loci (Sudlow Site II). Valproate displaces phenytoin, elevating phenytoin's free fraction from 10% to 20% (fu = 0.20). Concurrently, the elevated unbound phenytoin undergoes accelerated hepatic CYP2C9 clearance. The result is a clinical trap: total measured phenytoin falls to 10 mcg/mL (which appears low or acceptable), but the active unbound concentration is 2.0 mcg/mL (at the threshold of toxicity). In hypoalbuminemia or renal failure, the Winter-Tozer equation estimates corrected total concentrations: Ccorrected = Cmeasured / ((0.2 * Albumin) + 0.1).",
    clinicalImplications:
      "Routine clinical laboratory assays measure TOTAL drug concentration (bound + free). When protein binding is altered by displacement, hypoalbuminemia (<3.5 g/dL in cirrhosis, nephrotic syndrome, critical illness, malnutrition), or uremia (which generates endogenous organic acids that displace drugs from albumin binding sites), total drug levels become dangerously misleading. A patient exhibiting clinical phenytoin toxicity (nystagmus, ataxia) may have a 'normal' total level of 12 mcg/mL if hypoalbuminemia or valproate displacement has expanded the free fraction from 10% to 25% (free level = 3.0 mcg/mL). In such situations, clinicians must order a direct unbound (free) phenytoin level (target therapeutic window: 1.0 to 2.0 mcg/mL). Similar displacement risks occur when sulfamethoxazole displaces warfarin from albumin, acutely potentiating anticoagulant activity and spiking the INR.",
    exemplarDrugs: ["phenytoin", "valproate", "warfarin", "aspirin"],
    mathematicalModel:
      "fu = Cu / Ctotal; Cu = fu * Ctotal; Winter-Tozer Formula: Ccorrected = Cmeasured / ((0.2 * Albumin) + 0.1); In ESRD: Ccorrected = Cmeasured / ((0.1 * Albumin) + 0.1)",
    equations: [
      {
        name: "Free Fraction",
        formula: "fu = Cu / Ctotal",
        description:
          "Ratio of pharmacologically active unbound drug Cu to total measured concentration Ctotal.",
      },
      {
        name: "Winter-Tozer Albumin Correction",
        formula: "C_corrected = C_measured / ((0.2 * Albumin) + 0.1)",
        description:
          "Estimates equivalent total phenytoin concentration at normal albumin (4.4 g/dL) in non-uremic hypoalbuminemia.",
      },
      {
        name: "Winter-Tozer ESRD / Uremia Correction",
        formula: "C_corrected = C_measured / ((0.1 * Albumin) + 0.1)",
        description:
          "Adjusted formula for end-stage renal disease (CrCl < 20 mL/min) accounting for uremic toxins displacing phenytoin.",
      },
    ],
    citations: [
      "Winter ME. Basic Clinical Pharmacokinetics. 6th ed. Lippincott Williams & Wilkins; 2017.",
      "Burton ME, Shaw LM, Schentag JJ, Evans WE. Applied Pharmacokinetics & Pharmacodynamics. 4th ed. Lippincott Williams & Wilkins; 2005.",
      "Rowland M, Tozer TN. Clinical Pharmacokinetics and Pharmacodynamics. 5th ed. Wolters Kluwer; 2019.",
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. McGraw-Hill; 2023.",
    ],
    clinicalPearls: [
      "Only the unbound free drug exerts pharmacological activity, crosses biological membranes (including the blood-brain barrier), and undergoes glomerular filtration.",
      "The Phenytoin-Valproate Collision: Valproate displaces phenytoin from albumin (expanding free fraction) AND weakly inhibits CYP2C9 (blunting elimination), creating a dual-hit toxicity vulnerability.",
      "AAG is an acute-phase reactant: in acute myocardial infarction or sepsis, AAG levels surge, decreasing the free fraction of basic drugs like lidocaine and requiring careful clinical correlation.",
    ],
    examBoardNotes: [
      "Board Trap: In a patient with serum albumin 2.0 g/dL and total phenytoin 8 mcg/mL, do not increase the dose without calculating Winter-Tozer correction (Ccorrected = 8 / (0.4 + 0.1) = 16 mcg/mL, which is therapeutic).",
      "Albumin binds acidic drugs (phenytoin, warfarin, valproate); Alpha-1-acid glycoprotein binds basic drugs (lidocaine, propranolol, TCAs).",
    ],
  },
  {
    id: "steady-state-accumulation",
    title: "Steady-State (Css), Half-Life & Accumulation Factor",
    shortName: "Steady-State Accumulation",
    category: "Clearance & Steady-State",
    summary:
      "Steady-state plasma concentration (Css) is achieved after 4 to 5 elimination half-lives regardless of dose amount or dosing frequency. The accumulation factor R = 1 / (1 - e^(-ke * tau)) dictates drug buildup during repeated intermittent dosing, establishing the mathematical divergence between Loading Dose (governed by Vd) and Maintenance Dose (governed by Clearance).",
    molecularMechanism:
      "During repeated constant-interval dosing, drug accumulation continues until the rate of administration equals the rate of elimination: Rate In = Rate Out => (Dose * F) / tau = CL * Css_average, where F is bioavailability, tau is the dosing interval, and CL is systemic clearance.\n\nThe time to reach steady state is governed exclusively by the elimination rate constant ke and elimination half-life (t1/2 = ln(2) / ke = 0.693 / ke):\n- 1 half-life: 50.0% of steady state\n- 2 half-lives: 75.0% of steady state\n- 3 half-lives: 87.5% of steady state\n- 3.3 half-lives: 90.0% of steady state\n- 4 half-lives: 93.75% of steady state\n- 5 half-lives: 96.875% of steady state (~steady state achieved clinically)\n\nAccumulation Factor (R): When a drug is dosed repeatedly at interval tau, the residual fraction remaining from previous doses before each subsequent administration is f_remain = e^(-ke * tau). By summation of the infinite geometric series, the steady-state accumulation factor is:\nR = 1 / (1 - e^(-ke * tau)) = 1 / (1 - (0.5)^(tau / t1/2)).\nAt steady state, the maximum peak concentration is Css_max = C1_max * R, and minimum trough is Css_min = Css_max * e^(-ke * tau).\n\nLoading Dose (LD) vs Maintenance Dose (MD):\n- Loading Dose targets immediate attainment of the therapeutic target concentration in the apparent volume of distribution: LD = (Vd * Ctarget) / F. Clearance plays NO direct role in loading dose magnitude.\n- Maintenance Dose replaces the amount of drug eliminated over interval tau: MD = (CL * Ctarget * tau) / F = (ke * Vd * Ctarget * tau) / F. Systemic clearance is the primary determinant of maintenance dose requirements.",
    clinicalImplications:
      "Premature Therapeutic Drug Monitoring: Drawing a trough level before 4 to 5 half-lives have elapsed measures transient non-equilibrium concentrations, risking inappropriate dose escalations. For drugs with lengthy half-lives like amiodarone (t1/2 ~30 to 60 days) or phenobarbital (t1/2 ~4 to 5 days), steady state requires weeks or months without a loading regimen. Renal or hepatic impairment reduces clearance, thereby extending half-life (t1/2 = 0.693 * Vd / CL). While organ dysfunction prolongs the time required to reach steady state and necessitates reducing the maintenance dose or extending interval tau, the initial loading dose remains UNCHANGED unless the volume of distribution itself is altered (e.g., massive edema, ascites, septic resuscitation). In vancomycin and aminoglycoside TDM, AUC24 / MIC monitoring balances bacterial eradication against acute kidney injury risk.",
    exemplarDrugs: ["vancomycin", "digoxin", "lithium", "theophylline", "phenobarbital"],
    mathematicalModel:
      "Css_avg = (Dose * F) / (CL * tau); R = 1 / (1 - e^(-ke * tau)); LD = (Vd * Ctarget) / F; MD = (CL * Ctarget * tau) / F; t1/2 = 0.693 / ke",
    equations: [
      {
        name: "Steady-State Average Concentration",
        formula: "Css_avg = (Dose * F) / (CL * tau)",
        description:
          "Relates average steady-state plasma level to dose, bioavailability F, clearance CL, and interval tau.",
      },
      {
        name: "Accumulation Factor (R)",
        formula: "R = 1 / (1 - e^(-ke * tau))",
        description:
          "Quantifies the fold-increase in drug concentration at steady state compared to a single dose.",
      },
      {
        name: "Loading Dose (LD)",
        formula: "LD = (Vd * Ctarget) / F",
        description:
          "Determines the initial dose required to immediately fill the volume of distribution Vd.",
      },
      {
        name: "Maintenance Dose (MD)",
        formula: "MD = (CL * Ctarget * tau) / F",
        description:
          "Determines the recurring dose needed to match systemic clearance CL over interval tau.",
      },
    ],
    citations: [
      "Rowland M, Tozer TN. Clinical Pharmacokinetics and Pharmacodynamics: Concepts and Applications. 5th ed. Wolters Kluwer; 2019.",
      "Goodman & Gilman's The Pharmacological Basis of Therapeutics. 14th ed. McGraw-Hill; 2023.",
      "Bauer LA. Applied Clinical Pharmacokinetics. 3rd ed. McGraw-Hill; 2014.",
      "Rybak MJ, et al. Therapeutic monitoring of vancomycin for serious methicillin-resistant Staphylococcus aureus infections. Am J Health-Syst Pharm. 2020;77(11):835-864.",
    ],
    clinicalPearls: [
      "Loading dose depends on Volume of Distribution (Vd), NOT clearance. In acute renal failure, loading doses are unchanged, while maintenance doses must be adjusted.",
      "Rule of 5 Half-Lives: It takes 4 to 5 half-lives to reach steady state, and 4 to 5 half-lives to clear >95% of a drug after cessation, regardless of the dose amount.",
      "If the dosing interval tau equals the elimination half-life (tau = t1/2), the accumulation factor R is exactly 2.0, meaning peak steady-state concentration is double the initial dose peak.",
    ],
    examBoardNotes: [
      "Board Trap: A patient with end-stage renal disease (CrCl < 15 mL/min) requires vancomycin. The loading dose is based on actual body weight / Vd (~25-30 mg/kg), exactly the same as in a patient with normal renal function.",
      "Time to reach steady state depends SOLELY on elimination half-life; altering the dose or dosing frequency changes the steady-state concentration level, but NOT the time to achieve it.",
    ],
  },
];

/**
 * Retrieves a single PK concept by unique identifier.
 */
export function getPkConceptById(id: string): PkConcept | null {
  const normalized = id.trim().toLowerCase();
  return PK_CONCEPTS.find((c) => c.id.toLowerCase() === normalized) ?? null;
}

/**
 * Returns all registered PK concepts.
 */
export function getAllPkConcepts(): readonly PkConcept[] {
  return PK_CONCEPTS;
}

/**
 * Calculates Michaelis-Menten steady-state parameters for capacity-limited kinetics.
 *
 * Steady-state equation:
 * Dose (mg/day) = (Vmax * Css) / (Km + Css)
 * Solving for Css:
 * Css = (Dose * Km) / (Vmax - Dose)
 *
 * @param doseMgDay Daily dose in mg/day (e.g. 300)
 * @param vMax Maximum metabolic capacity in mg/day (default 500 mg/day for adult phenytoin)
 * @param km Substrate affinity constant in mg/L (default 4.0 mg/L)
 */
export function calculateMichaelisMenten(
  doseMgDay: number,
  vMax = 500,
  km = 4.0,
): MichaelisMentenResult {
  const safeDose = Math.max(0, doseMgDay);
  const safeVmax = Math.max(1, vMax);
  const safeKm = Math.max(0.1, km);

  const percentVmaxUtilized = Number(((safeDose / safeVmax) * 100).toFixed(1));
  const isSaturated = safeDose >= safeVmax;

  // Generate curve points for visual graphing up to 95% of Vmax
  const curvePoints: MichaelisMentenPoint[] = [];
  const maxPlotDose = Math.min(safeVmax * 0.95, safeVmax - 10);
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const d = (maxPlotDose / steps) * i;
    const c = (d * safeKm) / (safeVmax - d);
    curvePoints.push({
      doseMgDay: Number(d.toFixed(1)),
      cssMgL: Number(c.toFixed(2)),
    });
  }

  if (isSaturated) {
    return {
      doseMgDay: safeDose,
      vMax: safeVmax,
      km: safeKm,
      cssMgL: null,
      clearanceLDay: null,
      isSaturated: true,
      percentVmaxUtilized,
      regime: "capacity-limited-zero-order",
      explanation: `Dose (${safeDose} mg/day) equals or exceeds Vmax (${safeVmax} mg/day). Metabolic elimination is 100% saturated; drug accumulates continuously without reaching steady state. Severe toxicity is imminent.`,
      curve: curvePoints,
    };
  }

  const css = (safeDose * safeKm) / (safeVmax - safeDose);
  const cssMgL = Number(css.toFixed(2));
  const clearanceLDay = Number((safeDose / css).toFixed(2));

  let regime: "linear" | "mixed-transitional" | "capacity-limited-zero-order" = "mixed-transitional";
  if (percentVmaxUtilized < 40) {
    regime = "linear";
  } else if (percentVmaxUtilized >= 80) {
    regime = "capacity-limited-zero-order";
  }

  let explanation = "";
  if (regime === "linear") {
    explanation = `At ${safeDose} mg/day (${percentVmaxUtilized}% of Vmax), plasma concentration (${cssMgL} mg/L) is well below Km (${safeKm} mg/L). Elimination behaves primarily as linear first-order kinetics.`;
  } else if (regime === "mixed-transitional") {
    explanation = `At ${safeDose} mg/day (${percentVmaxUtilized}% of Vmax), plasma concentration (${cssMgL} mg/L) approaches Km (${safeKm} mg/L). Enzyme saturation begins; dose increments will produce non-linear concentration increases.`;
  } else {
    explanation = `At ${safeDose} mg/day (${percentVmaxUtilized}% of Vmax), hepatic enzymes are substantially saturated. Small dose increases will trigger steep exponential plasma concentration surges.`;
  }

  return {
    doseMgDay: safeDose,
    vMax: safeVmax,
    km: safeKm,
    cssMgL,
    clearanceLDay,
    isSaturated: false,
    percentVmaxUtilized,
    regime,
    explanation,
    curve: curvePoints,
  };
}

/**
 * Evaluates dialytic clearance feasibility based on the four cardinal determinants:
 * 1. Volume of Distribution (Vd < 1 L/kg, ideally < 0.2-0.5 L/kg)
 * 2. Protein Binding (< 80%, ideally < 50%)
 * 3. Molecular Weight (< 500 Da conventional, < 1500 Da high-flux)
 * 4. Water Solubility (Hydrophilic vs Lipophilic)
 *
 * @param vdLKg Apparent volume of distribution in L/kg (e.g. 0.25 for gentamicin, 6.0 for digoxin)
 * @param proteinBindingPct Protein binding percentage 0 to 100 (e.g. 10 for gentamicin, 99 for warfarin)
 * @param mwDa Molecular weight in Daltons (e.g. 477 for gentamicin, 7 for lithium)
 */
export function evaluateDialyzability(
  vdLKg: number,
  proteinBindingPct: number,
  mwDa: number,
): DialyzabilityEvaluation {
  const safeVd = Math.max(0.01, vdLKg);
  const safePb = Math.min(100, Math.max(0, proteinBindingPct));
  const safeMw = Math.max(1, mwDa);

  // Criterion 1: Volume of Distribution (Vd)
  let vdScore = 0;
  let vdDetail = "";
  let vdMeets = false;
  if (safeVd <= 0.5) {
    vdScore = 2;
    vdMeets = true;
    vdDetail = `Vd is low (${safeVd} L/kg <= 0.5 L/kg); drug is confined predominantly to the intravascular/extracellular space, providing excellent dialyzer accessibility.`;
  } else if (safeVd <= 1.0) {
    vdScore = 1;
    vdMeets = true;
    vdDetail = `Vd is moderate (${safeVd} L/kg <= 1.0 L/kg); reasonable proportion remains in circulation for dialytic extraction.`;
  } else if (safeVd <= 2.5) {
    vdScore = -1;
    vdMeets = false;
    vdDetail = `Vd is elevated (${safeVd} L/kg > 1.0 L/kg); substantial peripheral tissue distribution limits dialytic removal.`;
  } else {
    vdScore = -3;
    vdMeets = false;
    vdDetail = `Vd is very large (${safeVd} L/kg > 2.5 L/kg); drug is extensively sequestered in peripheral tissue/lipids. Hemodialysis clears <2-5% of total body burden.`;
  }

  // Criterion 2: Protein Binding (PB)
  let pbScore = 0;
  let pbDetail = "";
  let pbMeets = false;
  if (safePb < 50) {
    pbScore = 2;
    pbMeets = true;
    pbDetail = `Protein binding is low (${safePb}% < 50%); unbound free fraction is substantial (>50%) and freely traverses dialyzer membrane pores.`;
  } else if (safePb < 80) {
    pbScore = 1;
    pbMeets = true;
    pbDetail = `Protein binding is moderate (${safePb}% < 80%); sufficient free fraction exists for partial dialytic extraction.`;
  } else if (safePb < 92) {
    pbScore = -1;
    pbMeets = false;
    pbDetail = `Protein binding is high (${safePb}% >= 80%); only a small free fraction is available to pass across the dialyzer membrane.`;
  } else {
    pbScore = -3;
    pbMeets = false;
    pbDetail = `Protein binding is extreme (${safePb}% >= 92%); virtually all circulating drug is albumin-bound. Dialyzer clearance is negligible.`;
  }

  // Criterion 3: Molecular Weight (MW)
  let mwScore = 0;
  let mwDetail = "";
  let mwMeets = false;
  if (safeMw < 500) {
    mwScore = 2;
    mwMeets = true;
    mwDetail = `Molecular weight is low (${safeMw} Da < 500 Da); easily traverses standard low-flux and high-flux dialyzer membranes.`;
  } else if (safeMw <= 1500) {
    mwScore = 1;
    mwMeets = true;
    mwDetail = `Molecular weight is moderate (${safeMw} Da, 500-1500 Da); traverses synthetic high-flux dialyzer membranes, but poorly cleared by low-flux membranes.`;
  } else {
    mwScore = -2;
    mwMeets = false;
    mwDetail = `Molecular weight is high (${safeMw} Da > 1500 Da); macromolecules exceed membrane pore diameters, preventing significant dialytic filtration.`;
  }

  // Criterion 4: Water Solubility / Lipophilicity
  const waterScore = safeVd <= 1.0 ? 1 : 0;
  const waterMeets = safeVd <= 1.0;
  const waterDetail =
    safeVd <= 1.0
      ? "Hydrophilic distribution profile favors partitioning into aqueous dialysate solution."
      : "Lipophilic profile favors partitioning into cellular membrane lipids rather than aqueous dialysate.";

  const totalScore = vdScore + pbScore + mwScore + waterScore;

  // Strict physical barriers: if Vd > 2.5 or PB >= 92%, dialyzability is ruled out
  let rating: "dialyzable" | "partially-dialyzable" | "not-dialyzable";
  if (safeVd > 2.5 || safePb >= 92 || safeMw > 2000) {
    rating = "not-dialyzable";
  } else if (totalScore >= 5 && vdMeets && pbMeets && safeMw <= 600) {
    rating = "dialyzable";
  } else if (totalScore >= 1 && (vdMeets || safeVd <= 1.5) && safePb < 85 && safeMw <= 1500) {
    rating = "partially-dialyzable";
  } else {
    rating = "not-dialyzable";
  }

  let mechanisticExplanation = "";
  let clinicalImplication = "";

  if (rating === "dialyzable") {
    mechanisticExplanation = `Favorable profile across all determinants: low Vd (${safeVd} L/kg), manageable protein binding (${safePb}%), and low molecular weight (${safeMw} Da) allow rapid dialytic extraction from plasma into dialysate.`;
    clinicalImplication =
      "Significant dialytic clearance expected (~30% to 60%+ removed during standard 4-hour hemodialysis). Supplemental replacement dosing post-dialysis is typically required to avoid subtherapeutic treatment failure.";
  } else if (rating === "partially-dialyzable") {
    mechanisticExplanation = `Intermediate dialytic extraction: clearance is constrained by either moderate Vd (${safeVd} L/kg), moderate protein binding (${safePb}%), or molecular size requiring high-flux membranes (${safeMw} Da).`;
    clinicalImplication =
      "Partial clearance occurs (~15% to 30% removed). High-flux membranes and prolonged sessions increase removal. Monitor post-dialysis drug concentrations and assess need for supplemental dosing.";
  } else {
    mechanisticExplanation = `Physicochemical barriers prevent effective dialytic extraction: ${
      safeVd > 2.5
        ? `Massive volume of distribution (${safeVd} L/kg) sequesters drug in deep tissue stores.`
        : safePb >= 90
          ? `High plasma protein binding (${safePb}%) leaves negligible free drug to cross dialyzer pores.`
          : `Molecular weight (${safeMw} Da) or tissue partition limits extracorporeal clearance.`
    }`;
    clinicalImplication =
      "Hemodialysis removes a negligible fraction (<2% to 5%) of total body burden. Post-dialysis supplemental dosing is unnecessary; hemodialysis is ineffective for acute drug overdose.";
  }

  return {
    vdLKg: safeVd,
    proteinBindingPct: safePb,
    mwDa: safeMw,
    rating,
    score: totalScore,
    criteria: {
      vd: { meetsCriterion: vdMeets, detail: vdDetail, score: vdScore },
      proteinBinding: { meetsCriterion: pbMeets, detail: pbDetail, score: pbScore },
      molecularWeight: { meetsCriterion: mwMeets, detail: mwDetail, score: mwScore },
      waterSolubility: { meetsCriterion: waterMeets, detail: waterDetail, score: waterScore },
    },
    mechanisticExplanation,
    clinicalImplication,
  };
}

/**
 * Calculates protein binding displacement and Winter-Tozer corrected levels.
 *
 * @param totalMeasuredMcgMl Measured total drug concentration in mcg/mL (e.g. 10 for phenytoin)
 * @param baselineFreeFractionPct Baseline normal free fraction % (e.g. 10% for phenytoin)
 * @param displacedFreeFractionPct Displaced free fraction % (e.g. 20% when displaced by valproate)
 * @param serumAlbuminGDL Serum albumin level in g/dL (default 4.4 g/dL)
 */
export function calculateProteinDisplacement(
  totalMeasuredMcgMl: number,
  baselineFreeFractionPct = 10,
  displacedFreeFractionPct = 20,
  serumAlbuminGDL = 4.4,
): ProteinDisplacementResult {
  const safeTotal = Math.max(0, totalMeasuredMcgMl);
  const safeBaseFu = Math.min(100, Math.max(1, baselineFreeFractionPct)) / 100;
  const safeDispFu = Math.min(100, Math.max(1, displacedFreeFractionPct)) / 100;
  const safeAlbumin = Math.max(1.0, serumAlbuminGDL);

  const baselineFreeMcgMl = Number((safeTotal * safeBaseFu).toFixed(2));
  const displacedFreeMcgMl = Number((safeTotal * safeDispFu).toFixed(2));
  const freeIncreaseFold = Number((displacedFreeMcgMl / Math.max(0.01, baselineFreeMcgMl)).toFixed(2));

  // Winter-Tozer corrected total phenytoin
  const winterTozerCorrectedMcgMl = Number(
    (safeTotal / ((0.2 * safeAlbumin) + 0.1)).toFixed(2),
  );

  // Deceptive normal: total level is in normal range (10-20 mcg/mL) but free level is toxic (>2.0 mcg/mL)
  const isDeceptiveNormal =
    safeTotal >= 10 && safeTotal <= 20 && displacedFreeMcgMl > 2.0;

  const explanation =
    safeDispFu > safeBaseFu
      ? `Displacement increases free fraction from ${(safeBaseFu * 100).toFixed(0)}% to ${(safeDispFu * 100).toFixed(0)}%. While measured total level is ${safeTotal} mcg/mL, active unbound free drug has expanded ${freeIncreaseFold}x to ${displacedFreeMcgMl} mcg/mL.`
      : `Free fraction is at baseline (${(safeBaseFu * 100).toFixed(0)}%), yielding an active unbound concentration of ${baselineFreeMcgMl} mcg/mL.`;

  return {
    totalMeasuredMcgMl: safeTotal,
    baselineFreeFractionPct: safeBaseFu * 100,
    displacedFreeFractionPct: safeDispFu * 100,
    baselineFreeMcgMl,
    displacedFreeMcgMl,
    freeIncreaseFold,
    serumAlbuminGDL: safeAlbumin,
    winterTozerCorrectedMcgMl,
    isDeceptiveNormal,
    explanation,
  };
}

/**
 * Calculates steady-state accumulation parameters.
 *
 * @param halfLifeHours Elimination half-life in hours (e.g. 12)
 * @param intervalHours Dosing interval tau in hours (e.g. 12)
 */
export function calculateSteadyStateAccumulation(
  halfLifeHours: number,
  intervalHours: number,
): SteadyStateAccumulationResult {
  const safeT12 = Math.max(0.5, halfLifeHours);
  const safeTau = Math.max(1, intervalHours);

  const eliminationRateKePerHr = Number((Math.LN2 / safeT12).toFixed(4));
  const exponent = -eliminationRateKePerHr * safeTau;
  const fractionRemainingAtTrough = Number(Math.exp(exponent).toFixed(4));

  // R = 1 / (1 - e^(-ke * tau))
  const accumulationFactorR = Number((1 / (1 - fractionRemainingAtTrough)).toFixed(2));

  const hoursToNinetyPercentCss = Number((3.32 * safeT12).toFixed(1));
  const hoursToNinetyFivePercentCss = Number((4.32 * safeT12).toFixed(1));
  const halfLivesToSteadyState = 4.5;
  const loadingDoseRatio = accumulationFactorR;

  const explanation = `With t1/2 of ${safeT12} h and interval tau of ${safeTau} h, drug accumulates ${accumulationFactorR}x at steady state compared to the initial dose. Approximately 95% of steady state is attained after ${hoursToNinetyFivePercentCss} hours (~4.3 half-lives).`;

  return {
    halfLifeHours: safeT12,
    intervalHours: safeTau,
    eliminationRateKePerHr,
    accumulationFactorR,
    fractionRemainingAtTrough,
    hoursToNinetyPercentCss,
    hoursToNinetyFivePercentCss,
    halfLivesToSteadyState,
    loadingDoseRatio,
    explanation,
  };
}
