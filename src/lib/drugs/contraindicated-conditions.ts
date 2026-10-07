/**
 * Contraindicated Conditions Matrix (FirstPass Educational Desk)
 *
 * Major clinical diseases and organ impairments with high-risk drug pairs and
 * individual contraindicated agents based on FDA Prescribing Information,
 * Boxed Warnings, and established pathophysiology.
 *
 * REGULATORY POSTURE (FD&C Act § 520(o)(1)(E)):
 * Non-device Clinical Decision Support software reference. This directory
 * provides educational, non-prescriptive mechanistic explanations and clinical
 * thresholds to enable licensed healthcare professionals to independently review
 * the pharmacological basis of disease-drug collisions. It does not generate
 * patient-specific prescriptions, treatment mandates, or clinical orders.
 * The official FDA-approved Prescribing Information governs.
 */

export type ConditionCategory =
  | "Organ Impairment"
  | "Cardiac"
  | "Pregnancy"
  | "Neuro & Psych"
  | "Metabolic";

export const CONDITION_CATEGORIES = [
  "All",
  "Organ Impairment",
  "Cardiac",
  "Pregnancy",
  "Neuro & Psych",
  "Metabolic",
] as const;

export type ConditionCategoryFilter = (typeof CONDITION_CATEGORIES)[number];

export interface ContraindicatedSingleDrug {
  /** Drug catalog ID */
  drugId: string;
  /** Drug display name */
  drugName: string;
  /** Primary clinical hazard */
  hazard: string;
  /** Pharmacological / physiological mechanism */
  mechanism: string;
  /** Whether the drug carries an FDA Boxed Warning for this condition */
  fdaBoxedWarning?: boolean;
}

export interface ContraindicatedPair {
  drug1Id: string;
  drug1Name: string;
  drug2Id: string;
  drug2Name: string;
  drug3Id?: string;
  drug3Name?: string;
  hazard: string;
  mechanism: string;
  clinicalManagement: string;
  severity: "contraindicated" | "high-risk";
}

export interface ContraindicatedCondition {
  id: string;
  name: string;
  shortName: string;
  category: ConditionCategory;
  clinicalThreshold: string;
  pathophysiology: string;
  organSystem: string;
  contraindicatedDrugs: ContraindicatedSingleDrug[];
  contraindicatedPairs: ContraindicatedPair[];
  educationalRationale: string;
  clinicalSummary: string;
}

/** Non-prescriptive regulatory posture constant for FDA 520(o)(1)(E) compliance */
export const NON_PRESCRIPTIVE_CDS_POSTURE =
  "Educational Decision Support reference under FD&C Act 520(o)(1)(E). All condition cards, thresholds, and drug pairs are non-prescriptive learning aids intended for independent review by licensed clinicians. FirstPass does not diagnose, prescribe, adjust dosing, or replace the FDA-approved Prescribing Information." as const;

export const CONTRAINDICATED_CONDITIONS: readonly ContraindicatedCondition[] = [
  {
    id: "severe-renal-impairment",
    name: "Severe Renal Impairment (CrCl < 30 mL/min / ESRD)",
    shortName: "Severe Renal Impairment",
    category: "Organ Impairment",
    clinicalThreshold: "CrCl < 30 mL/min or eGFR < 30 mL/min/1.73m² / Dialysis-Dependent ESRD",
    organSystem: "Renal / Nephrology",
    pathophysiology:
      "Severe drop in glomerular filtration rate (GFR) and tubular transport leads to reduced clearance of renally eliminated parent drugs and active metabolites, impaired metabolic buffering, and severe vulnerability to electrolyte disturbances and metabolic acidosis.",
    educationalRationale:
      "Renal clearance failure converts standard dosing into toxic accumulation kinetics. Understanding clearance thresholds (e.g., Cockcroft-Gault < 30 mL/min) prevents fatal metabolic and hemorrhagic events.",
    clinicalSummary:
      "Strict contraindication for drugs requiring intact renal filtration for clearance or urinary efficacy. High vulnerability to hyperkalemic cardiac arrest and lactic acidosis.",
    contraindicatedDrugs: [
      {
        drugId: "metformin",
        drugName: "Metformin",
        hazard: "Metformin-Associated Lactic Acidosis (MALA)",
        mechanism:
          "Reduced renal excretion causes systemic biguanide accumulation, which inhibits hepatic mitochondrial respiratory chain complex I, blocking lactate conversion to glucose and leading to severe lactic acidosis with high mortality.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "nitrofurantoin",
        drugName: "Nitrofurantoin",
        hazard: "Lack of Urinary Antiseptic Efficacy & Toxic Metabolite Neuropathy",
        mechanism:
          "Inadequate glomerular filtration prevents therapeutic drug concentrations in the urinary tract, rendering it ineffective for UTI while systemic metabolite retention causes severe peripheral polyneuropathy and pulmonary toxicity.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "empagliflozin",
        drugName: "Empagliflozin",
        hazard: "Glycemic Inefficacy & Risk of Euglycemic DKA / Dehydration",
        mechanism:
          "SGLT2 inhibition relies on glomerular filtered glucose load for glycemic efficacy; when eGFR is < 30 mL/min/1.73m², glucosuric lowering of blood glucose is negligible, while risks of volume depletion and euglycemic ketoacidosis persist.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "dapagliflozin",
        drugName: "Dapagliflozin",
        hazard: "Glycemic Inefficacy & Acute Renal Hemodynamic Stress",
        mechanism:
          "Inadequate filtered glucose load negates glycemic lowering efficacy at CrCl < 30 mL/min; transient reduction in intraglomerular pressure can further compromise marginal renal perfusion.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "dabigatran",
        drugName: "Dabigatran",
        hazard: "Fatal Hemorrhage from Severe Renal Accumulation",
        mechanism:
          "Dabigatran is predominantly (~80%) eliminated unchanged via the kidneys; severe renal impairment quadruples plasma drug exposure, leading to uncontrolled life-threatening bleeding without dose adjustment or avoidance.",
        fdaBoxedWarning: true,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "spironolactone",
        drug1Name: "Spironolactone",
        drug2Id: "lisinopril",
        drug2Name: "Lisinopril",
        hazard: "Life-Threatening Hyperkalemia & Cardiac Arrest",
        mechanism:
          "Concomitant mineralocorticoid receptor antagonism (spironolactone) and ACE inhibition (lisinopril) eliminates aldosterone-mediated potassium excretion in distal nephrons. With baseline CrCl < 30 mL/min, severe hyperkalemia (> 6.5 mEq/L) reliably precipitates fatal sine waves and asystole.",
        clinicalManagement:
          "Avoid combination in CrCl < 30 mL/min; monitor serum potassium and creatinine within 48-72 hours if clinically mandated under nephrology supervision.",
        severity: "contraindicated",
      },
      {
        drug1Id: "metformin",
        drug1Name: "Metformin",
        drug2Id: "furosemide",
        drug2Name: "Furosemide",
        hazard: "Acute Dehydration-Induced Lactic Acidosis Surge",
        mechanism:
          "Loop diuretic-induced intravascular volume contraction abruptly reduces renal plasma flow, precipitating acute worsening of GFR and rapid toxic surge of metformin levels.",
        clinicalManagement:
          "Metformin is contraindicated when CrCl < 30 mL/min; hold metformin during acute dehydrating illness or intensive loop diuresis.",
        severity: "contraindicated",
      },
    ],
  },

  {
    id: "severe-hepatic-impairment",
    name: "Severe Hepatic Impairment (Child-Pugh Class C / Cirrhosis)",
    shortName: "Severe Hepatic Impairment",
    category: "Organ Impairment",
    clinicalThreshold: "Child-Pugh Class C (Score 10-15) / Decompensated Cirrhosis (MELD > 15, Ascites, Hepatic Encephalopathy)",
    organSystem: "Hepatic / Gastroenterology",
    pathophysiology:
      "Profound loss of functional hepatocyte mass, portosystemic vascular shunting, and decreased hepatic cytochrome P450 and glucuronosyltransferase enzyme capacity drastically reduce phase I and phase II clearance of high-extraction and low-clearance drugs.",
    educationalRationale:
      "Hepatic clearance impairment leads to massive bioavailability spikes for high-first-pass agents and prolonged elimination half-lives, predisposing to encephalopathy and liver failure.",
    clinicalSummary:
      "Strict contraindication for hepatotoxins, mitochondrial uncouplers, and drugs heavily cleared by hepatic CYP/UGT pathways. Severe vulnerability to precipitated hepatic encephalopathy.",
    contraindicatedDrugs: [
      {
        drugId: "valproate",
        drugName: "Valproate (Valproic Acid)",
        hazard: "Fatal Mitochondrial Hepatotoxicity & Hyperammonemic Encephalopathy",
        mechanism:
          "FDA Boxed Warning for idiosyncratic and dose-dependent mitochondrial toxicity. Impairs mitochondrial beta-oxidation and inhibits carbamoyl phosphate synthetase I, causing microvesicular steatosis, acute liver necrosis, and life-threatening cerebral edema.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "nefazodone",
        drugName: "Nefazodone",
        hazard: "Fulminant Hepatic Failure & Hepatocellular Necrosis",
        mechanism:
          "FDA Boxed Warning for severe idiosyncratic liver failure leading to liver transplant or death. Absolute contraindication in underlying active hepatic disease or elevated transaminases.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "atorvastatin",
        drugName: "Atorvastatin",
        hazard: "Severe Drug Accumulation & Statin-Induced Myopathy / Rhabdomyolysis",
        mechanism:
          "Atorvastatin undergoes extensive first-pass hepatic metabolism and biliary excretion; in decompensated cirrhosis, systemic exposure spikes exponentially, leading to severe transaminitis, hepatocyte injury, and skeletal muscle necrosis.",
        fdaBoxedWarning: false,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "valproate",
        drug1Name: "Valproate",
        drug2Id: "atorvastatin",
        drug2Name: "Atorvastatin",
        hazard: "Compounded Hepatocellular Toxicity & Metabolic Impairment",
        mechanism:
          "Valproate-induced mitochondrial fatty acid oxidation stress combines with statin accumulation due to impaired hepatic CYP3A4 clearance in cirrhotic parenchyma, accelerating acute-on-chronic liver injury.",
        clinicalManagement:
          "Contraindicated in Child-Pugh Class C cirrhosis; monitor liver function panels and consider non-hepatotoxic therapeutic alternatives.",
        severity: "contraindicated",
      },
    ],
  },

  {
    id: "pregnancy-teratogenicity",
    name: "Pregnancy (FDA Category X / Teratogenicity)",
    shortName: "Pregnancy / Teratogenicity",
    category: "Pregnancy",
    clinicalThreshold: "Confirmed Pregnancy (Any Trimester; Special Vulnerability in 1st Trimester Organogenesis & 2nd/3rd Trimester Fetopathy)",
    organSystem: "Obstetrics / Reproductive Health",
    pathophysiology:
      "Transplacental drug passage during critical embryonic organogenesis (weeks 3-8) causes structural malformations, while exposure during the second and third trimesters disrupts fetal perfusion, renal development, and neurodevelopment.",
    educationalRationale:
      "Teratogens and fetotoxic agents carry absolute contraindications in pregnancy. Identifying mechanism-specific windows (neural crest disruption vs. fetal RAAS inhibition) prevents catastrophic fetal outcomes.",
    clinicalSummary:
      "Absolute contraindication for documented human teratogens and fetotoxic agents. Requires verified negative pregnancy tests and highly effective contraception in patients of reproductive potential.",
    contraindicatedDrugs: [
      {
        drugId: "isotretinoin",
        drugName: "Isotretinoin",
        hazard: "Severe Retinoic Acid Embryopathy (FDA Category X / iPLEDGE)",
        mechanism:
          "Disrupts cranial neural crest cell migration and homeobox gene expression, causing profound craniofacial malformations (microtia, cleft palate), conotruncal heart defects, and hydrocephalus in > 30% of exposed gestations.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "methotrexate",
        drugName: "Methotrexate",
        hazard: "Fetal Aminopterin Syndrome & Embryofetal Death (FDA Category X)",
        mechanism:
          "Dihydrofolate reductase inhibition starves rapidly dividing embryonic tissues of purines and thymidylate, resulting in anencephaly, severe skeletal dysplasias, meningomyelocele, and spontaneous abortion.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "warfarin",
        drugName: "Warfarin",
        hazard: "Fetal Warfarin Syndrome & Central Nervous System Hemorrhage (FDA Category X)",
        mechanism:
          "Crosses the placenta and inhibits gamma-carboxylation of osteocalcin and vitamin K-dependent clotting factors, leading to nasal hypoplasia, stippled epiphyses, microcephaly, optic atrophy, and fatal fetal intracranial bleeding.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "valproate",
        drugName: "Valproate (Valproic Acid)",
        hazard: "Neural Tube Defects (Spina Bifida) & Neurodevelopmental Decline",
        mechanism:
          "FDA Boxed Warning for major congenital malformations including lumbosacral spina bifida (1-2% incidence) and significant permanent reduction in childhood cognitive/IQ scores via histone deacetylase inhibition and folate antagonism.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "lisinopril",
        drugName: "Lisinopril",
        hazard: "Oligohydramnios Sequence & Fetal Renal Failure (FDA Boxed Warning)",
        mechanism:
          "Inhibition of the fetal renin-angiotensin system during the 2nd and 3rd trimesters produces severe fetal renal failure, anuria, oligohydramnios sequence (pulmonary hypoplasia, craniofacial deformity), calvarial hypoplasia, and intrauterine demise.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "losartan",
        drugName: "Losartan",
        hazard: "Fetal Angiotensin Receptor Fetopathy (FDA Boxed Warning)",
        mechanism:
          "Blockade of fetal AT1 receptors diminishes fetal renal perfusion and glomerular function, mirroring ACEi fetopathy with fatal oligohydramnios and calvarial hypoplasia.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "sacubitril-valsartan",
        drugName: "Sacubitril / Valsartan",
        hazard: "Dual Neprilysin / RAAS Fetopathy (FDA Boxed Warning)",
        mechanism:
          "Valsartan component causes profound fetal renal dysgenesis and death; neprilysin inhibition may further alter vasoactive peptide balance critical for placental-fetal hemodynamics.",
        fdaBoxedWarning: true,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "lisinopril",
        drug1Name: "Lisinopril",
        drug2Id: "losartan",
        drug2Name: "Losartan",
        hazard: "Compounded Fetal Renal Dysgenesis & Perinatal Death",
        mechanism:
          "Dual blockade of the renin-angiotensin cascade completely suppresses fetal glomerular filtration, inducing profound anuria, anhydramnios, pulmonary hypoplasia, and perinatal death.",
        clinicalManagement:
          "Absolute contraindication. Discontinue RAAS inhibitors immediately upon detection of pregnancy; transition to pregnancy-compatible antihypertensives (labetalol, nifedipine, methyldopa).",
        severity: "contraindicated",
      },
      {
        drug1Id: "methotrexate",
        drug1Name: "Methotrexate",
        drug2Id: "ibuprofen",
        drug2Name: "Ibuprofen",
        hazard: "Decreased Renal Clearance Amplifying Fetal Teratogenic Burden",
        mechanism:
          "NSAID inhibition of renal prostaglandins decreases renal tubular secretion and GFR of methotrexate, elevating cytotoxic exposure in pregnant individuals.",
        clinicalManagement:
          "Methotrexate is strictly contraindicated in pregnancy; NSAIDs in late pregnancy also risk premature closure of the ductus arteriosus.",
        severity: "contraindicated",
      },
    ],
  },

  {
    id: "prolonged-qtc",
    name: "Prolonged QTc / Congenital LQTS (> 500 ms)",
    shortName: "Prolonged QTc / LQTS",
    category: "Cardiac",
    clinicalThreshold: "Baseline QTc > 500 ms or Congenital Long QT Syndrome (LQTS) / ΔQTc > 60 ms",
    organSystem: "Cardiovascular / Electrophysiology",
    pathophysiology:
      "Delay in ventricular cardiac repolarization, primarily through pharmacological blockade of the rapid delayed rectifier potassium current (IKr / hERG channel), generates early afterdepolarizations (EADs) during phase 2 or 3 of the action potential, predisposing to Torsades de Pointes (TdP) and sudden cardiac death.",
    educationalRationale:
      "Combining drugs with known QT liability or pairing a QT-prolonging substrate with its metabolic clearance inhibitor multiplies torsadogenic risk exponentially.",
    clinicalSummary:
      "Strict contraindication for dual known-risk QTc-prolonging agents or high-affinity IKr blockers in patients with pre-existing repolarization prolongation.",
    contraindicatedDrugs: [
      {
        drugId: "ziprasidone",
        drugName: "Ziprasidone",
        hazard: "High-Potency IKr Channel Blockade & Arrhythmogenesis",
        mechanism:
          "Dose-dependent blockade of the hERG/IKr potassium repolarization current; FDA labeling warns against use in patients with a history of QT prolongation or concomitant QT-prolonging drugs.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "amiodarone",
        drugName: "Amiodarone",
        hazard: "Marked Action Potential Duration Prolongation",
        mechanism:
          "Class III antiarrhythmic with multi-channel blocking properties that prolongs phase 3 repolarization and QTc interval, with high tissue accumulation and extended half-life.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "methadone",
        drugName: "Methadone",
        hazard: "Dose-Dependent hERG Channel Inhibition & TdP",
        mechanism:
          "Direct stereoselective blockade of cardiac hERG potassium channels; daily doses > 100 mg significantly widen the QTc interval and carry high documented torsades rates.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "ciprofloxacin",
        drugName: "Ciprofloxacin",
        hazard: "Fluoroquinolone Repolarization Delay",
        mechanism:
          "Fluoroquinolone class effect inhibiting voltage-gated potassium repolarizing currents, additive with other QT-prolonging psychotropics or antiarrhythmics.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "haloperidol",
        drugName: "Haloperidol",
        hazard: "hERG Channel Blockade & Sudden Cardiac Death",
        mechanism:
          "Potent nanomolar blockade of hERG potassium channels, especially via intravenous route or in elderly patients with subclinical electrolyte depletion.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "ondansetron",
        drugName: "Ondansetron",
        hazard: "5-HT3 Antagonist Dose-Dependent QTc Widening",
        mechanism:
          "Concentration-dependent inhibition of IKr channels; FDA warning restricts single IV doses and cautions against use in congenital LQTS.",
        fdaBoxedWarning: false,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "ziprasidone",
        drug1Name: "Ziprasidone",
        drug2Id: "amiodarone",
        drug2Name: "Amiodarone",
        hazard: "Dual Known-Risk QTc Prolongation & Torsades de Pointes",
        mechanism:
          "Synergistic pharmacodynamic blockade of myocardial IKr potassium channels produces profound repolarization delay, marked EAD amplitude, and degenerate polymorphic ventricular tachycardia.",
        clinicalManagement:
          "Absolute contraindication. Avoid dual known-risk QT combinations; perform baseline 12-lead ECG and maintain serum potassium > 4.0 mEq/L and magnesium > 2.0 mg/dL.",
        severity: "contraindicated",
      },
      {
        drug1Id: "methadone",
        drug1Name: "Methadone",
        drug2Id: "ciprofloxacin",
        drug2Name: "Ciprofloxacin",
        hazard: "PK/PD Multiplier Arrhythmogenic Collision",
        mechanism:
          "Ciprofloxacin moderately inhibits CYP1A2 and CYP3A4-mediated clearance of methadone while directly contributing additive IKr potassium channel blockade, elevating methadone AUC and compounding QTc prolongation.",
        clinicalManagement:
          "Contraindicated or avoid. Select non-QT-prolonging antibiotic alternatives (e.g., cephalosporins, penicillins).",
        severity: "contraindicated",
      },
      {
        drug1Id: "haloperidol",
        drug1Name: "Haloperidol",
        drug2Id: "ondansetron",
        drug2Name: "Ondansetron",
        hazard: "Additive Acute Hospital-Acquired Ventricular Arrhythmia",
        mechanism:
          "Concurrent parenteral or oral administration in inpatient or emergency settings produces additive acute hERG channel inhibition, substantially elevating the risk of degenerate TdP.",
        clinicalManagement:
          "Avoid concurrent administration; monitor telemetry and replace electrolyte losses before giving antiemetic or antipsychotic therapy.",
        severity: "contraindicated",
      },
    ],
  },

  {
    id: "recent-maoi-exposure",
    name: "Recent MAOI Exposure (< 14 days)",
    shortName: "Recent MAOI Exposure",
    category: "Neuro & Psych",
    clinicalThreshold: "Within 14 Days of Discontinuing an Irreversible MAOI (or 5 Weeks Post-Fluoxetine Before Starting MAOI)",
    organSystem: "Neurology / Psychiatry",
    pathophysiology:
      "Irreversible monoamine oxidase (MAO-A and MAO-B) inhibition eliminates enzymatic degradation of serotonin, norepinephrine, and dopamine. Administration of serotonin reuptake inhibitors, serotonin releasers, or secondary MAO inhibitors triggers massive, unregulated synaptic serotonin accumulation.",
    educationalRationale:
      "MAO inhibition is irreversible and requires de novo enzyme synthesis over 14 days. Introducing serotonergic agents prior to full enzyme replenishment triggers the Hunter criteria for fatal Serotonin Syndrome.",
    clinicalSummary:
      "Absolute contraindication for SSRIs, SNRIs, TCAs, tramadol, dextromethorphan, linezolid, and methylene blue due to rapid-onset, life-threatening hyperthermia, rigidity, and autonomic storm.",
    contraindicatedDrugs: [
      {
        drugId: "phenelzine",
        drugName: "Phenelzine",
        hazard: "Irreversible Non-Selective MAO-A/B Inhibition",
        mechanism:
          "Forms covalent bond with MAO enzyme active site, destroying catalytic capability; persists until new enzyme proteins are synthesized over ~14 days.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "tranylcypromine",
        drugName: "Tranylcypromine",
        hazard: "Irreversible MAOI with Rapid-Onset Hypertensive & Serotonergic Liability",
        mechanism:
          "Irreversibly inhibits MAO-A and MAO-B; concurrent administration of serotonergic agents produces toxic intrasynaptic serotonin levels within hours.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "linezolid",
        drugName: "Linezolid",
        hazard: "Reversible Synthetic Oxazolidinone MAOI Action",
        mechanism:
          "Oxazolidinone antibacterial possessing non-selective reversible MAO inhibitory activity; contraindicated with recent MAOI exposure or concomitant SSRIs/SNRIs.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "methylene-blue",
        drugName: "Methylene Blue",
        hazard: "Potent Nanomolar Reversible MAO-A Inhibition",
        mechanism:
          "FDA Boxed Warning for severe, fatal serotonin toxicity when administered to patients receiving serotonergic psychiatric drugs or with recent MAOI history.",
        fdaBoxedWarning: true,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "phenelzine",
        drug1Name: "Phenelzine",
        drug2Id: "fluoxetine",
        drug2Name: "Fluoxetine",
        hazard: "Catastrophic Serotonin Syndrome & Hyperthermic Crisis",
        mechanism:
          "Irreversible blockade of serotonin breakdown combined with selective 5-HT reuptake inhibition floods synaptic clefts, causing severe neuromuscular rigidity, spontaneous clonus, core hyperthermia (> 41°C), and rhabdomyolysis.",
        clinicalManagement:
          "Absolute contraindication. Requires 14-day washout after phenelzine before starting fluoxetine, and a 5-week washout after stopping fluoxetine before initiating an MAOI.",
        severity: "contraindicated",
      },
      {
        drug1Id: "phenelzine",
        drug1Name: "Phenelzine",
        drug2Id: "venlafaxine",
        drug2Name: "Venlafaxine",
        hazard: "Fulminant Serotonergic-Noradrenergic Autonomic Collapse",
        mechanism:
          "Dual serotonin-norepinephrine reuptake blockade atop complete catabolic enzyme inhibition induces malignant hypertensive spikes, severe tremors, seizures, and hyperpyrexia.",
        clinicalManagement:
          "Absolute contraindication. Strict minimum 14-day washout required.",
        severity: "contraindicated",
      },
      {
        drug1Id: "phenelzine",
        drug1Name: "Phenelzine",
        drug2Id: "tramadol",
        drug2Name: "Tramadol",
        hazard: "Fatal Serotonin Toxicity & Intractable Seizures",
        mechanism:
          "Tramadol inhibits neuronal serotonin reuptake and stimulates serotonin release while lowering seizure threshold; combination with MAO inhibition reliably triggers severe serotonin syndrome.",
        clinicalManagement:
          "Absolute contraindication. Never administer tramadol within 14 days of an MAOI.",
        severity: "contraindicated",
      },
      {
        drug1Id: "phenelzine",
        drug1Name: "Phenelzine",
        drug2Id: "dextromethorphan",
        drug2Name: "Dextromethorphan",
        hazard: "Toxic Serotonergic Surge & Lethal Hyperpyrexia",
        mechanism:
          "Dextromethorphan acts as a serotonin reuptake inhibitor; co-administration with MAO inhibitors has produced documented fatalities from hyperthermic collapse.",
        clinicalManagement:
          "Absolute contraindication. Counsel patients against OTC cough preparations containing dextromethorphan.",
        severity: "contraindicated",
      },
    ],
  },

  {
    id: "heart-failure-hfref",
    name: "Heart Failure with Reduced Ejection Fraction (HFrEF / NYHA III-IV)",
    shortName: "Heart Failure (HFrEF)",
    category: "Cardiac",
    clinicalThreshold: "Left Ventricular Ejection Fraction (LVEF) < 40%, NYHA Functional Class III or IV",
    organSystem: "Cardiovascular / Heart Failure",
    pathophysiology:
      "Severely compromised baseline myocardial inotropic reserve and excessive neurohormonal activation (sympathetic and RAAS). Myocardium is acutely sensitive to negative inotropic suppression, while the impaired kidney cannot handle acute fluid retention or sudden drops in renal perfusion.",
    educationalRationale:
      "Negative inotropes and fluid-retaining drugs tip compensated or marginal HFrEF into acute cardiogenic pulmonary edema and cardiogenic shock.",
    clinicalSummary:
      "Contraindication for non-dihydropyridine calcium channel blockers, fluid-retaining thiazolidinediones, and nephrotoxic hemodynamic 'triple whammy' combinations.",
    contraindicatedDrugs: [
      {
        drugId: "diltiazem",
        drugName: "Diltiazem",
        hazard: "Acute Negative Inotropic Decompensation & Cardiogenic Shock",
        mechanism:
          "Non-dihydropyridine calcium channel blocker suppresses L-type calcium channels in failing myocytes, reducing left ventricular contractility, precipitating acute pulmonary congestion, and increasing mortality in HFrEF.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "verapamil",
        drugName: "Verapamil",
        hazard: "Profound Negative Inotropy & Hemodynamic Collapse",
        mechanism:
          "Direct myocardial depressant activity severely blunts left ventricular stroke volume and ejection fraction; contraindicated in NYHA Class III-IV heart failure and severe LV dysfunction.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "pioglitazone",
        drugName: "Pioglitazone",
        hazard: "Fluid Retention & Congestive Heart Failure Exacerbation",
        mechanism:
          "FDA Boxed Warning for heart failure exacerbation; PPAR-gamma agonism stimulates epithelial sodium channel (ENaC) reabsorption in the renal distal tubule, causing fluid expansion and pulmonary edema.",
        fdaBoxedWarning: true,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "ibuprofen",
        drug1Name: "Ibuprofen (NSAID)",
        drug2Id: "lisinopril",
        drug2Name: "Lisinopril (ACEi)",
        hazard: "'Triple Whammy' Hemodynamic Renal Failure & HF Decompensation",
        mechanism:
          "NSAID blocks renal prostaglandins (constricting afferent arteriole) while ACE inhibitor eliminates angiotensin II (dilating efferent arteriole), drastically reducing intraglomerular filtration pressure and promoting profound sodium/water retention in failing hearts.",
        clinicalManagement:
          "Avoid NSAIDs in heart failure; use acetaminophen for mild-to-moderate analgesia and optimize guideline-directed medical therapy (GDMT).",
        severity: "high-risk",
      },
      {
        drug1Id: "diltiazem",
        drug1Name: "Diltiazem",
        drug2Id: "verapamil",
        drug2Name: "Verapamil",
        hazard: "Complete AV Nodal Arrest & Myocardial Contractile Collapse",
        mechanism:
          "Synergistic calcium channel blockade severely depresses AV node conduction and ventricular inotropy, precipitating high-grade heart block, asystole, and acute cardiogenic shock.",
        clinicalManagement:
          "Absolute contraindication. Never combine non-dihydropyridine calcium channel blockers.",
        severity: "contraindicated",
      },
    ],
  },

  {
    id: "narrow-angle-glaucoma-urinary-retention",
    name: "Narrow-Angle Glaucoma & Severe Urinary Retention",
    shortName: "Narrow-Angle Glaucoma / Retention",
    category: "Organ Impairment",
    clinicalThreshold: "Anatomical Narrow Iridocorneal Angle (Van Herick Grade 1-2) or Severe Bladder Outlet Obstruction (BPH / Post-Void Residual > 250 mL)",
    organSystem: "Ophthalmology / Urology",
    pathophysiology:
      "Muscarinic (M3) receptor blockade in the iris sphincter muscle causes pupillary mydriasis, crowding iris tissue into the trabecular meshwork and blocking aqueous humor outflow, precipitating acute intraocular pressure elevation. In the bladder, M2/M3 antagonism paralyses detrusor muscle contraction against an obstructed bladder neck, causing complete urinary retention.",
    educationalRationale:
      "Stacking anticholinergic drugs compounds antimuscarinic occupancy at ocular and bladder smooth muscle, transforming subclinical anatomical narrowing into surgical emergencies.",
    clinicalSummary:
      "Contraindication for high-potency antimuscarinics and anticholinergic psychotropics. High risk of permanent optic nerve damage from acute angle closure and bladder rupture or urosepsis.",
    contraindicatedDrugs: [
      {
        drugId: "oxybutynin",
        drugName: "Oxybutynin",
        hazard: "Acute Angle-Closure Glaucoma Crisis & Bladder Atony",
        mechanism:
          "Competitive antagonism of postganglionic muscarinic acetylcholine receptors produces pupillary dilation, anterior chamber shallowing, and complete paralysis of bladder detrusor smooth muscle.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "amitriptyline",
        drugName: "Amitriptyline",
        hazard: "Potent Anticholinergic Intraocular Pressure Surge",
        mechanism:
          "High affinity for muscarinic receptors (Ki ~ 18 nM) generates powerful mydriasis and cycloplegia, precipitating rapid-onset pupillary block and acute glaucoma in anatomically predisposed eyes.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "diphenhydramine",
        drugName: "Diphenhydramine",
        hazard: "First-Generation Antihistaminic Muscarinic Blockade",
        mechanism:
          "Potent off-target antimuscarinic activity exacerbates pupillary dilation and urinary outflow resistance, provoking acute painful urinary retention.",
        fdaBoxedWarning: false,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "oxybutynin",
        drug1Name: "Oxybutynin",
        drug2Id: "amitriptyline",
        drug2Name: "Amitriptyline",
        hazard: "High-Anticholinergic Stack Ocular & Urologic Emergency",
        mechanism:
          "Additive saturation of peripheral M3 receptors completely paralyzes the iris sphincter and detrusor muscle, rapidly triggering acute angle-closure glaucoma (ophthalmologic emergency) and massive urinary retention.",
        clinicalManagement:
          "Contraindicated in narrow angles or severe urinary retention; calculate cumulative anticholinergic burden (ACB) score and deprescribe.",
        severity: "contraindicated",
      },
      {
        drug1Id: "amitriptyline",
        drug1Name: "Amitriptyline",
        drug2Id: "diphenhydramine",
        drug2Name: "Diphenhydramine",
        hazard: "Compounded Anticholinergic Toxicity & Delirium",
        mechanism:
          "Dual antimuscarinic blockade sharply spikes intraocular pressure while inducing acute urinary retention and central anticholinergic delirium.",
        clinicalManagement:
          "Avoid concurrent high-anticholinergic combinations; recommend non-anticholinergic alternatives (e.g., SSRIs/SNRIs, 2nd-gen antihistamines).",
        severity: "contraindicated",
      },
    ],
  },

  {
    id: "g6pd-deficiency",
    name: "G6PD Deficiency (Oxidative Hemolysis Liability)",
    shortName: "G6PD Deficiency",
    category: "Metabolic",
    clinicalThreshold: "Glucose-6-Phosphate Dehydrogenase Deficiency (< 30% of Normal Enzymatic Activity / WHO Class I-III Variants)",
    organSystem: "Hematology / Genetics",
    pathophysiology:
      "G6PD is the rate-limiting enzyme of the pentose phosphate pathway and the sole generator of NADPH in mature red blood cells. NADPH is required to regenerate reduced glutathione (GSH), which detoxifies reactive oxygen species (ROS). Oxidant xenobiotics exhaust GSH, causing uncontrolled hemoglobin oxidation, Heinz body precipitation, and severe intravascular and extravascular hemolysis.",
    educationalRationale:
      "Oxidizing drugs generate hydrogen peroxide or free radicals that normal erythrocytes buffer, but G6PD-deficient erythrocytes lyse within 24-72 hours, causing acute hemolytic anemia and pigment nephropathy.",
    clinicalSummary:
      "Absolute contraindication for rasburicase, primaquine, and dapsone in patients with G6PD deficiency. Mandates pre-treatment enzymatic screening.",
    contraindicatedDrugs: [
      {
        drugId: "rasburicase",
        drugName: "Rasburicase",
        hazard: "Fatal Intravascular Hemolysis & Methemoglobinemia",
        mechanism:
          "FDA Boxed Warning; recombinant urate oxidase catabolizes uric acid to allantoin, generating stoichiometric amounts of hydrogen peroxide (H2O2). In G6PD deficiency, H2O2 overwhelms erythrocytes, causing catastrophic hemolysis.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "primaquine",
        drugName: "Primaquine",
        hazard: "Severe Oxidative Acute Hemolytic Anemia",
        mechanism:
          "8-aminoquinoline reactive metabolites generate intracellular reactive oxygen species that cross-link membrane proteins and destroy G6PD-deficient red cells; requires prior G6PD activity testing.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "dapsone",
        drugName: "Dapsone",
        hazard: "Hydroxylamine-Induced Methemoglobinemia & Hemolysis",
        mechanism:
          "Hepatic CYP-mediated N-hydroxylation yields dapsone hydroxylamine, a redox-active metabolite that oxidizes erythrocyte hemoglobin to methemoglobin and triggers rapid hemolysis.",
        fdaBoxedWarning: false,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "primaquine",
        drug1Name: "Primaquine",
        drug2Id: "dapsone",
        drug2Name: "Dapsone",
        hazard: "Dual-Source Massive Oxidative Hemolytic Crisis",
        mechanism:
          "Additive generation of reactive oxidant species completely exhausts minimal residual erythrocyte glutathione stores, triggering acute intravascular hemolysis, hemoglobinuria, and pigment-induced acute tubular necrosis.",
        clinicalManagement:
          "Absolute contraindication in G6PD deficiency. Screen all patients prior to primaquine or dapsone therapy; discontinue immediately if jaundice or dark urine appears.",
        severity: "contraindicated",
      },
    ],
  },

  {
    id: "parkinsons-lewy-body",
    name: "Parkinson's Disease & Lewy Body Dementia",
    shortName: "Parkinson's / Lewy Body",
    category: "Neuro & Psych",
    clinicalThreshold: "Idiopathic Parkinson's Disease or Dementia with Lewy Bodies (DLB) with Severe Nigrostriatal Dopaminergic Depletion",
    organSystem: "Neurology / Movement Disorders",
    pathophysiology:
      "Profound degenerative loss of dopaminergic neurons in the substantia nigra pars compacta reduces striatal dopamine neurotransmission. Central dopamine D2 receptor blockade severely disrupts the balance between direct and indirect basal ganglia pathways, precipitating acute akinesia, severe rigidity, and potentially fatal neuroleptic malignant syndrome.",
    educationalRationale:
      "Dopamine receptor antagonists acutely reverse motor compensation in Parkinson's disease and precipitate severe neuroleptic sensitivity (excessive sedation, confusion, autonomic instability) in Lewy Body Dementia.",
    clinicalSummary:
      "Strict contraindication for central D2-blocking antiemetics and first-generation antipsychotics due to acute extrapyramidal crisis and neuroleptic sensitivity.",
    contraindicatedDrugs: [
      {
        drugId: "metoclopramide",
        drugName: "Metoclopramide",
        hazard: "Severe Extrapyramidal Crisis & Parkinsonian Freezing",
        mechanism:
          "FDA Boxed Warning; readily crosses the blood-brain barrier to competitively block striatal dopamine D2 receptors, precipitating acute dystonic reactions, profound rigidity, and irreversible tardive dyskinesia.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "prochlorperazine",
        drugName: "Prochlorperazine",
        hazard: "Potent Striatal D2 Blockade Exacerbating Motor Failure",
        mechanism:
          "Phenothiazine antiemetic with high-affinity central D2 receptor antagonism that severely destabilizes motor function and induces severe parkinsonian akinesia.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "haloperidol",
        drugName: "Haloperidol",
        hazard: "Neuroleptic Sensitivity & Neuroleptic Malignant Syndrome",
        mechanism:
          "High-potency first-generation antipsychotic with intense striatal D2 blockade; in Lewy Body Dementia, triggers profound neuroleptic sensitivity with rigidity, autonomic instability, and increased mortality.",
        fdaBoxedWarning: true,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "metoclopramide",
        drug1Name: "Metoclopramide",
        drug2Id: "haloperidol",
        drug2Name: "Haloperidol",
        hazard: "Catastrophic Central Dopamine D2 Receptor Blockade",
        mechanism:
          "Dual central dopamine antagonism completely shuts down remaining striatal dopaminergic transmission, producing acute severe akinesia, oculogyric crisis, laryngeal dystonia, and neuroleptic malignant syndrome.",
        clinicalManagement:
          "Absolute contraindication. Use non-dopaminergic antiemetics (e.g., 5-HT3 antagonists like ondansetron) and avoid first-generation antipsychotics; if antipsychotic is required in DLB, consider low-dose quetiapine.",
        severity: "contraindicated",
      },
      {
        drug1Id: "prochlorperazine",
        drug1Name: "Prochlorperazine",
        drug2Id: "haloperidol",
        drug2Name: "Haloperidol",
        hazard: "Additive Extrapyramidal Rigidity & Motor Arrest",
        mechanism:
          "Synergistic antagonism of nigrostriatal D2 receptors inducing severe parkinsonian crisis and postural instability.",
        clinicalManagement:
          "Avoid combination; select alternative gastrointestinal and neuropsychiatric agents.",
        severity: "contraindicated",
      },
    ],
  },

  {
    id: "myasthenia-gravis",
    name: "Myasthenia Gravis & Neuromuscular Junction Disorders",
    shortName: "Myasthenia Gravis",
    category: "Neuro & Psych",
    clinicalThreshold:
      "Confirmed Myasthenia Gravis, Lambert-Eaton Syndrome, or Myasthenic Crisis History",
    organSystem: "Neuromuscular",
    pathophysiology:
      "Autoantibodies against post-synaptic nicotinic acetylcholine receptors (AChR) or MuSK impair neuromuscular transmission. Pharmacologic agents that impair pre-synaptic ACh release, block calcium channels, or exhibit post-synaptic curare-like effects can precipitate acute respiratory failure (myasthenic crisis).",
    educationalRationale:
      "Neuromuscular junction transmission has a narrow safety margin in myasthenia gravis. Agents that interfere with either pre-synaptic calcium-dependent vesicular acetylcholine release (aminoglycosides) or post-synaptic receptor sensitivity (fluoroquinolones, macrolides) can rapidly precipitate fatal ventilatory failure.",
    clinicalSummary:
      "Strict contraindication for fluoroquinolones (FDA Boxed Warning), aminoglycosides, and macrolides/ketolides. High risk of precipitating acute myasthenic crisis requiring emergent intubation.",
    contraindicatedDrugs: [
      {
        drugId: "ciprofloxacin",
        drugName: "Ciprofloxacin",
        hazard: "Exacerbation of Muscle Weakness & Respiratory Depression",
        mechanism:
          "FDA Boxed Warning: fluoroquinolones exacerbate muscle weakness and respiratory depression in myasthenia gravis via post-synaptic neuromuscular blockade and impaired acetylcholine release.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "levofloxacin",
        drugName: "Levofloxacin",
        hazard: "Fluoroquinolone Neuromuscular Blockade & Crisis Risk",
        mechanism:
          "FDA Boxed Warning: fluoroquinolones worsen muscle weakness in patients with myasthenia gravis; can precipitate acute ventilatory failure requiring mechanical ventilation.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "gentamicin",
        drugName: "Gentamicin",
        hazard: "Inhibition of Pre-Synaptic Calcium Influx & ACh Release",
        mechanism:
          "Aminoglycosides inhibit pre-synaptic voltage-gated calcium channels, blocking vesicular acetylcholine release at the motor endplate and exacerbating neuromuscular blockade.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "tobramycin",
        drugName: "Tobramycin",
        hazard: "Aminoglycoside-Mediated Neuromuscular Junction Blockade",
        mechanism:
          "Inhibits pre-synaptic vesicular acetylcholine release and exhibits curare-like post-synaptic block, precipitating severe weakness and ventilatory failure.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "azithromycin",
        drugName: "Azithromycin",
        hazard: "Macrolide Post-Synaptic Neuromuscular Blockade",
        mechanism:
          "Macrolides impair post-synaptic acetylcholine receptor responsiveness; FDA warnings cite life-threatening exacerbation of myasthenia gravis symptoms.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "telithromycin",
        drugName: "Telithromycin",
        hazard: "Ketolide Nicotinic Receptor Blockade & Rapid Respiratory Crisis",
        mechanism:
          "FDA Boxed Warning: ketolide post-synaptic neuromuscular blockade; competitively antagonizes nicotinic acetylcholine receptors, precipitating acute respiratory arrest.",
        fdaBoxedWarning: true,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "ciprofloxacin",
        drug1Name: "Ciprofloxacin",
        drug2Id: "gentamicin",
        drug2Name: "Gentamicin",
        hazard: "Synergistic Presynaptic and Postsynaptic Neuromuscular Transmission Collapse",
        mechanism:
          "Gentamicin blocks pre-synaptic voltage-gated calcium entry while ciprofloxacin impairs post-synaptic acetylcholine response, inducing profound additive motor paralysis and acute respiratory failure.",
        clinicalManagement:
          "Avoid combination in myasthenia gravis. Select non-neuromuscular-impairing antimicrobial alternatives (e.g., beta-lactams) and maintain respiratory monitoring.",
        severity: "contraindicated",
      },
      {
        drug1Id: "azithromycin",
        drug1Name: "Azithromycin",
        drug2Id: "ciprofloxacin",
        drug2Name: "Ciprofloxacin",
        hazard: "Dual NMJ Blockade Combined with Additive Ventricular Repolarization Delay",
        mechanism:
          "Additive post-synaptic neuromuscular junction blockade compounds muscle weakness and respiratory depression while dual cardiac IKr potassium channel inhibition elevates QTc prolongation risk.",
        clinicalManagement:
          "Avoid concurrent administration. Discontinue fluoroquinolones and macrolides; select alternative antimicrobial classes under clinical supervision.",
        severity: "contraindicated",
      },
    ],
  },

  {
    id: "pheochromocytoma",
    name: "Pheochromocytoma & Paraganglioma (Without Alpha Blockade)",
    shortName: "Pheochromocytoma",
    category: "Metabolic",
    clinicalThreshold:
      "Active catecholamine-secreting pheochromocytoma prior to complete alpha-1 blockade",
    organSystem: "Endocrine / Adrenal",
    pathophysiology:
      "Tumor hypersecretion of norepinephrine and epinephrine. Initiating beta-blockade without prior irreversible or competitive alpha-1 blockade (e.g., phenoxybenzamine) removes beta-2 vasodilatory tone and cardiac beta-1 chronotropy while leaving peripheral alpha-1 vasoconstriction completely unopposed, precipitating catastrophic hypertensive emergency and acute pulmonary edema.",
    educationalRationale:
      "Adrenergic pharmacology dictates strict sequential receptor blockade in pheochromocytoma. Alpha-1 adrenergic receptors must be fully blocked before administering any beta-antagonist to avoid lethal unopposed vasoconstriction.",
    clinicalSummary:
      "Absolute contraindication for beta-blocker monotherapy prior to alpha blockade, metoclopramide (catecholamine secretagogue), and glucagon. High risk of malignant hypertensive crisis and flash pulmonary edema.",
    contraindicatedDrugs: [
      {
        drugId: "propranolol",
        drugName: "Propranolol",
        hazard: "Unopposed Alpha-1 Vasoconstriction & Hypertensive Crisis",
        mechanism:
          "Non-selective beta-blocker monotherapy without alpha blockade: removes beta-2 vasodilatory tone, allowing circulating catecholamines to produce severe unchecked peripheral alpha-1 vasoconstriction.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "metoprolol",
        drugName: "Metoprolol",
        hazard: "Beta-1 Blockade Without Vasodilatory Protection",
        mechanism:
          "Beta-blocker monotherapy without alpha blockade: blunts cardiac compensatory contractility against extreme afterload spikes driven by unopposed alpha-1 vasoconstriction.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "metoclopramide",
        drugName: "Metoclopramide",
        hazard: "Direct Adrenal Catecholamine Release & Malignant Hypertension",
        mechanism:
          "Direct dopamine antagonist that stimulates catecholamine release from pheochromocytoma chromaffin cells; labeled contraindication in pheochromocytoma.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "glucagon",
        drugName: "Glucagon",
        hazard: "Potent Secretagogue Provoking Hypertensive Crisis",
        mechanism:
          "Potent secretagogue for adrenal pheochromocytoma catecholamine release; binds chromaffin cell receptors triggering massive surge of epinephrine and norepinephrine.",
        fdaBoxedWarning: false,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "metoprolol",
        drug1Name: "Metoprolol",
        drug2Id: "metoclopramide",
        drug2Name: "Metoclopramide",
        hazard: "Surge of Circulating Catecholamines & Malignant Hypertension",
        mechanism:
          "Metoclopramide surges circulating catecholamines while beta-blocker prevents vasodilatory buffering, inducing malignant hypertension and acute cardiac afterload failure.",
        clinicalManagement:
          "Contraindicated in unblocked pheochromocytoma. Alpha-1 blockade must be fully established prior to beta-blockade; avoid dopamine receptor antagonists.",
        severity: "contraindicated",
      },
      {
        drug1Id: "propranolol",
        drug1Name: "Propranolol",
        drug2Id: "phenylephrine",
        drug2Name: "Phenylephrine",
        hazard: "Massive Afterload Spike & Severe Reflex Bradycardia",
        mechanism:
          "Pure alpha agonist with non-selective beta blockade causing massive afterload spike and reflex severe bradycardia from unchecked alpha-1 vasoconstriction.",
        clinicalManagement:
          "Contraindicated in pheochromocytoma without prior alpha blockade. Manage hypertensive emergencies with alpha-adrenergic antagonists.",
        severity: "contraindicated",
      },
    ],
  },

  {
    id: "active-peptic-ulcer-gi-bleed",
    name: "Active Peptic Ulcer Disease & Acute GI Hemorrhage",
    shortName: "Active Peptic Ulcer & GI Bleed",
    category: "Organ Impairment",
    clinicalThreshold:
      "Active gastric/duodenal ulceration, erosive gastritis, or acute GI bleeding within 30 days",
    organSystem: "Gastroenterology",
    pathophysiology:
      "Loss of mucosal epithelial integrity combined with inhibition of cytoprotective prostaglandin E2/I2 synthesis (via COX-1 inhibition) and pharmacologic impairment of platelet aggregation or coagulation cascade prevents hemostatic clot stabilization, resulting in exsanguinating gastrointestinal hemorrhage.",
    educationalRationale:
      "Gastric mucosal defense relies on continuous prostaglandin-mediated bicarbonate secretion and microvascular blood flow. Combining COX-inhibiting ulcerogenic agents with antithrombotic or platelet serotonin-depleting drugs removes both epithelial defense and hemostatic clotting, leading to uncontrolled hemorrhage.",
    clinicalSummary:
      "Strict contraindication for ketorolac (FDA Boxed Warning), non-selective NSAIDs, and systemic anticoagulants in active peptic ulceration or recent hemorrhage. High mortality from rapid hemorrhagic shock.",
    contraindicatedDrugs: [
      {
        drugId: "ketorolac",
        drugName: "Ketorolac",
        hazard: "Exsanguinating GI Hemorrhage & Ulcer Perforation",
        mechanism:
          "FDA Boxed Warning: contraindicated in active peptic ulcer disease, recent GI bleeding, or history of PUD due to profound inhibition of gastric mucosal prostaglandins and platelet thromboxane.",
        fdaBoxedWarning: true,
      },
      {
        drugId: "aspirin",
        drugName: "Aspirin",
        hazard: "Irreversible Platelet Inhibition & Mucosal Ulceration",
        mechanism:
          "Non-selective COX-1/2 inhibition eroding gastric mucosal barrier and irreversibly inhibiting platelet thromboxane A2 aggregation at bleeding sites.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "ibuprofen",
        drugName: "Ibuprofen",
        hazard: "Prostaglandin Synthesis Depletion & Impaired Mucosal Healing",
        mechanism:
          "Non-selective COX-1/2 inhibition eroding gastric mucosal barrier by blocking cytoprotective prostaglandin synthesis, preventing ulcer resolution and promoting active hemorrhage.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "apixaban",
        drugName: "Apixaban",
        hazard: "Systemic Factor Xa Inhibition Preventing Clot Stabilization",
        mechanism:
          "Systemic anticoagulation preventing clot formation at mucosal erosions; direct factor Xa inhibition suppresses thrombin generation at active bleeding craters.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "rivaroxaban",
        drugName: "Rivaroxaban",
        hazard: "Potent Anticoagulant Pressure on Exposed Ulcer Vasculature",
        mechanism:
          "Systemic anticoagulation preventing clot formation at mucosal erosions; impairs secondary hemostasis leading to continuous blood loss from denuded tissue.",
        fdaBoxedWarning: false,
      },
      {
        drugId: "warfarin",
        drugName: "Warfarin",
        hazard: "Coagulation Factor Depletion & Uncontrolled Bleeding",
        mechanism:
          "FDA Boxed Warning for major or fatal bleeding; systemic anticoagulation prevents clot stabilization at mucosal erosions by suppressing functional factors II, VII, IX, and X.",
        fdaBoxedWarning: true,
      },
    ],
    contraindicatedPairs: [
      {
        drug1Id: "ketorolac",
        drug1Name: "Ketorolac",
        drug2Id: "apixaban",
        drug2Name: "Apixaban",
        hazard: "Dual Mucosal Erosion & Factor Xa Inhibition Fatal Hemorrhage",
        mechanism:
          "Dual mucosal erosion and systemic factor Xa inhibition; prohibitive risk of fatal GI bleeding due to simultaneous epithelial injury and loss of secondary hemostasis.",
        clinicalManagement:
          "Absolute contraindication. Avoid systemic NSAIDs in anticoagulated patients with active ulceration; utilize gastroprotective proton pump inhibitors and non-ulcerogenic analgesics.",
        severity: "contraindicated",
      },
      {
        drug1Id: "aspirin",
        drug1Name: "Aspirin",
        drug2Id: "ibuprofen",
        drug2Name: "Ibuprofen",
        drug3Id: "sertraline",
        drug3Name: "Sertraline",
        hazard: "Synergistic Platelet Serotonin Depletion & Compounded GI Bleed",
        mechanism:
          "Dual COX inhibition plus serotonin reuptake blockade depleting platelet dense-granule serotonin, magnifying upper GI bleed risk 8-fold.",
        clinicalManagement:
          "Avoid dual NSAID combinations and co-administration with SSRIs in active ulcer disease; prescribe mucosal gastroprotection if antiplatelet therapy cannot be safely deferred.",
        severity: "contraindicated",
      },
    ],
  },
] as const;

/**
 * Filter conditions by search query and category.
 */
export function filterContraindicatedConditions(options?: {
  query?: string;
  category?: ConditionCategoryFilter;
}): ContraindicatedCondition[] {
  const q = options?.query?.trim().toLowerCase() ?? "";
  const cat = options?.category ?? "All";

  return CONTRAINDICATED_CONDITIONS.filter((cond) => {
    if (cat !== "All" && cond.category !== cat) {
      return false;
    }
    if (!q) return true;

    // Match name, shortName, threshold, category, pathophysiology
    if (
      cond.name.toLowerCase().includes(q) ||
      cond.shortName.toLowerCase().includes(q) ||
      cond.clinicalThreshold.toLowerCase().includes(q) ||
      cond.pathophysiology.toLowerCase().includes(q) ||
      cond.organSystem.toLowerCase().includes(q)
    ) {
      return true;
    }

    // Match individual drugs and hazards
    const drugMatch = cond.contraindicatedDrugs.some(
      (d) =>
        d.drugId.toLowerCase().includes(q) ||
        d.drugName.toLowerCase().includes(q) ||
        d.hazard.toLowerCase().includes(q) ||
        d.mechanism.toLowerCase().includes(q),
    );
    if (drugMatch) return true;

    // Match contraindicated pairs
    const pairMatch = cond.contraindicatedPairs.some(
      (p) =>
        p.drug1Id.toLowerCase().includes(q) ||
        p.drug1Name.toLowerCase().includes(q) ||
        p.drug2Id.toLowerCase().includes(q) ||
        p.drug2Name.toLowerCase().includes(q) ||
        (p.drug3Id && p.drug3Id.toLowerCase().includes(q)) ||
        (p.drug3Name && p.drug3Name.toLowerCase().includes(q)) ||
        p.hazard.toLowerCase().includes(q) ||
        p.mechanism.toLowerCase().includes(q),
    );
    return pairMatch;
  });
}

/**
 * Find a condition by its unique ID.
 */
export function findConditionById(id: string): ContraindicatedCondition | undefined {
  return CONTRAINDICATED_CONDITIONS.find((c) => c.id === id);
}

/**
 * Get a condition by its unique ID (alias for findConditionById).
 */
export function getConditionById(id: string): ContraindicatedCondition | undefined {
  return findConditionById(id);
}

/**
 * Return all conditions where a given drug is listed (either singly or as part of a pair).
 */
export function getConditionsForDrug(drugIdOrName: string): ContraindicatedCondition[] {
  const needle = drugIdOrName.trim().toLowerCase();
  return CONTRAINDICATED_CONDITIONS.filter((cond) => {
    const singleMatch = cond.contraindicatedDrugs.some(
      (d) => d.drugId.toLowerCase() === needle || d.drugName.toLowerCase() === needle,
    );
    if (singleMatch) return true;

    const pairMatch = cond.contraindicatedPairs.some(
      (p) =>
        p.drug1Id.toLowerCase() === needle ||
        p.drug1Name.toLowerCase() === needle ||
        p.drug2Id.toLowerCase() === needle ||
        p.drug2Name.toLowerCase() === needle ||
        (p.drug3Id && p.drug3Id.toLowerCase() === needle) ||
        (p.drug3Name && p.drug3Name.toLowerCase() === needle),
    );
    return pairMatch;
  });
}

/**
 * Check if a specific drug is contraindicated under a condition.
 */
export function isDrugContraindicatedInCondition(conditionId: string, drugId: string): boolean {
  const cond = findConditionById(conditionId);
  if (!cond) return false;
  const target = drugId.toLowerCase();
  return (
    cond.contraindicatedDrugs.some((d) => d.drugId.toLowerCase() === target) ||
    cond.contraindicatedPairs.some(
      (p) =>
        p.drug1Id.toLowerCase() === target ||
        p.drug2Id.toLowerCase() === target ||
        (p.drug3Id && p.drug3Id.toLowerCase() === target),
    )
  );
}

/**
 * Check if any selected desk drugs form contraindicated pairs under any condition.
 */
export function getContraindicatedPairsForDesk(
  selectedDrugIds: string[],
): Array<{ condition: ContraindicatedCondition; pair: ContraindicatedPair }> {
  const idSet = new Set(selectedDrugIds.map((id) => id.toLowerCase()));
  const results: Array<{ condition: ContraindicatedCondition; pair: ContraindicatedPair }> = [];

  for (const condition of CONTRAINDICATED_CONDITIONS) {
    for (const pair of condition.contraindicatedPairs) {
      const match1 = idSet.has(pair.drug1Id.toLowerCase());
      const match2 = idSet.has(pair.drug2Id.toLowerCase());
      const match3 = pair.drug3Id ? idSet.has(pair.drug3Id.toLowerCase()) : true;
      if (match1 && match2 && match3) {
        results.push({ condition, pair });
      }
    }
  }

  return results;
}

/**
 * Get all unique drug IDs referenced across all conditions.
 */
export function getAllContraindicatedDrugIds(): string[] {
  const set = new Set<string>();
  for (const cond of CONTRAINDICATED_CONDITIONS) {
    for (const d of cond.contraindicatedDrugs) {
      set.add(d.drugId);
    }
    for (const p of cond.contraindicatedPairs) {
      set.add(p.drug1Id);
      set.add(p.drug2Id);
      if (p.drug3Id) {
        set.add(p.drug3Id);
      }
    }
  }
  return Array.from(set).sort();
}

export interface ContraindicatedFinding {
  conditionId: string;
  conditionName: string;
  condition: ContraindicatedCondition;
  category: ConditionCategory;
  type: "single" | "pair";
  drugIds: string[];
  drugNames: string[];
  hazard: string;
  mechanism: string;
  severity: "contraindicated" | "high-risk";
  fdaBoxedWarning?: boolean;
  clinicalManagement?: string;
}

export interface ContraindicatedConditionsResult extends Array<ContraindicatedCondition> {
  conditions: ContraindicatedCondition[];
  matchedConditions: ContraindicatedCondition[];
  findings: ContraindicatedFinding[];
}

/**
 * Checks drug IDs against all single contraindicated drugs and pairs in CONTRAINDICATED_CONDITIONS.
 * Returns matched conditions and a structured findings list.
 */
export function findContraindicatedConditionsForDrugs(
  drugIds: string[],
): ContraindicatedConditionsResult {
  const normalized = (drugIds ?? [])
    .map((id) => (typeof id === "string" ? id.trim().toLowerCase() : ""))
    .filter(Boolean);
  const idSet = new Set(normalized);

  const matchedConditionsMap = new Map<string, ContraindicatedCondition>();
  const findings: ContraindicatedFinding[] = [];

  for (const condition of CONTRAINDICATED_CONDITIONS) {
    let conditionMatched = false;

    // Check single contraindicated drugs
    for (const drug of condition.contraindicatedDrugs) {
      if (
        idSet.has(drug.drugId.toLowerCase()) ||
        idSet.has(drug.drugName.toLowerCase())
      ) {
        conditionMatched = true;
        findings.push({
          conditionId: condition.id,
          conditionName: condition.name,
          condition,
          category: condition.category,
          type: "single",
          drugIds: [drug.drugId],
          drugNames: [drug.drugName],
          hazard: drug.hazard,
          mechanism: drug.mechanism,
          severity: "contraindicated",
          fdaBoxedWarning: Boolean(drug.fdaBoxedWarning),
        });
      }
    }

    // Check contraindicated pairs
    for (const pair of condition.contraindicatedPairs) {
      const match1 =
        idSet.has(pair.drug1Id.toLowerCase()) ||
        idSet.has(pair.drug1Name.toLowerCase());
      const match2 =
        idSet.has(pair.drug2Id.toLowerCase()) ||
        idSet.has(pair.drug2Name.toLowerCase());
      const match3 = pair.drug3Id
        ? idSet.has(pair.drug3Id.toLowerCase()) ||
          (pair.drug3Name ? idSet.has(pair.drug3Name.toLowerCase()) : false)
        : true;

      if (match1 && match2 && match3) {
        conditionMatched = true;
        const pairDrugIds = [pair.drug1Id, pair.drug2Id];
        const pairDrugNames = [pair.drug1Name, pair.drug2Name];
        if (pair.drug3Id && pair.drug3Name) {
          pairDrugIds.push(pair.drug3Id);
          pairDrugNames.push(pair.drug3Name);
        }

        findings.push({
          conditionId: condition.id,
          conditionName: condition.name,
          condition,
          category: condition.category,
          type: "pair",
          drugIds: pairDrugIds,
          drugNames: pairDrugNames,
          hazard: pair.hazard,
          mechanism: pair.mechanism,
          severity: pair.severity,
          clinicalManagement: pair.clinicalManagement,
        });
      }
    }

    if (conditionMatched) {
      matchedConditionsMap.set(condition.id, condition);
    }
  }

  const conditions = Array.from(matchedConditionsMap.values());
  const result = Object.assign([...conditions], {
    conditions,
    matchedConditions: conditions,
    findings,
  }) as ContraindicatedConditionsResult;

  return result;
}
