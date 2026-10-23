/**
 * Wave 2 of the curated PubMed shelf — real citations for catalog rows that shipped with
 * real enzyme/PD data but zero curated sources backing them: the xylazine/medetomidine
 * street-supply α2-agonists, the metonitazene/protonitazene nitazenes, tapentadol,
 * suzetrigine, tianeptine, phenibut, tirzepatide, semaglutide, kratom, and methylene blue.
 * Same shape and voice as pubmed.ts. Titles and years from PubMed (NCBI) metadata.
 * A separate integration step merges this into the main CITES export — this file is not
 * imported by the app on its own yet.
 *
 * tianeptine note: searched for a PubMed-indexed source tying tianeptine to CYP3A4
 * metabolism (the enzyme role already on its catalog row) and found none — tianeptine's
 * documented clearance is mainly beta-oxidation of the heptanoic side chain, not a
 * well-characterized CYP3A4 pathway. The two citations below back the opioid-receptor /
 * withdrawal / respiratory-depression part of that row, not the CYP3A4 substrate claim;
 * that role may be worth a second look against the catalog.
 */

import type { Cite, CiteTag } from "./pubmed";

function c(
  pmid: string,
  year: number,
  journal: string,
  title: string,
  why: string,
  tags: CiteTag[],
  drugIds: string[],
  pair?: [string, string],
): Cite {
  return pair ? { pmid, year, journal, title, why, tags, drugIds, pair } : { pmid, year, journal, title, why, tags, drugIds };
}

export const CITES_WAVE2: Cite[] = [
  // —— α2-agonist street adulterants: xylazine / medetomidine ——————————————
  c("38707050", 2024, "Cureus", "The Management of Xylazine Overdose With Naloxone.",
    "Naloxone clears the opioid; the α2 sedation and bradycardia from xylazine itself do not budge. Airway support is the actual intervention, not more naloxone.",
    ["clinic"], ["xylazine"]),
  c("41704197", 2026, "ACS Chem Neurosci", "A Review of Alpha-2 Adrenergic Agents Implicated in Opioid Use Disorder.",
    "Xylazine and medetomidine sedate through α2, not μ — the mechanistic reason naloxone only solves half of a tranq-contaminated overdose.",
    ["clinic", "review"], ["xylazine", "medetomidine"]),
  c("41668237", 2026, "J Addict Med", "Medetomidine-Involved Overdoses Among Emergency Department Patients: Results From a US Multicenter Sentinel Surveillance Program.",
    "17-site ED surveillance: medetomidine exposure roughly quadrupled the odds of bradycardia on arrival (OR 4.03) without any extra naloxone, intubation, or BiPAP need — the α2 signature, not an opioid one.",
    ["clinic"], ["medetomidine"]),
  c("40257097", 2025, "J Addict Med", "Medetomidine-Associated Opioid Overdoses in Chicago, Illinois: A Report of 3 Cases.",
    "One of the first clinical case reports once medetomidine started replacing xylazine in a local supply — same α2 sedation, same naloxone-refractory picture.",
    ["clinic"], ["medetomidine"]),

  // —— Nitazenes: metonitazene / protonitazene ——————————————————————————
  c("42034717", 2026, "Arch Toxicol", "Fatal intoxications with nitazenes: postmortem findings, toxicology, and in vitro characterization at the μ-opioid receptor of six nitazene analogues.",
    "57 Swedish nitazene-positive autopsies: metonitazene (38) and protonitazene (10) were the two most-encountered analogs, with in vitro MOR potency matching or exceeding fentanyl.",
    ["clinic"], ["metonitazene", "protonitazene"]),
  c("42702575", 2026, "Br J Clin Pharmacol", "Acute toxic leucoencephalopathy following protonitazene ingestion.",
    "A named-analog case: protonitazene producing toxic leucoencephalopathy on top of the expected high-potency respiratory arrest.",
    ["clinic"], ["protonitazene"]),
  c("42484800", 2026, "Curr Pain Headache Rep", "Novel 2-Benzylbenzimidazole Opioids: Emerging Drugs of Abuse and Pharmacological Considerations with Nitazene Analogs.",
    "Review naming metonitazene and protonitazene specifically as high-potency MOR agonists that routine toxicology screens frequently miss.",
    ["review"], ["metonitazene", "protonitazene"]),

  // —— Tapentadol ——————————————————————————————————————————————
  c("36974332", 2023, "Drug Des Devel Ther", "Tapentadol: A Review of Experimental Pharmacology Studies, Clinical Trials, and Recent Findings.",
    "Confirms the dual mechanism this desk flags instead of a CYP row: μ-agonism plus norepinephrine reuptake inhibition — the NRI half is why MAOIs and other serotonergics still matter on a UGT2B7 drug.",
    ["mat", "review"], ["tapentadol"]),
  c("35084120", 2022, "Pharmacol Res Perspect", "Tapentadol shows lower intrinsic efficacy at µ receptor than morphine and oxycodone.",
    "Direct receptor pharmacology: real but lower-efficacy μ-agonism than morphine or oxycodone — still enough to add to this desk's CNS-depressant stack.",
    ["mat"], ["tapentadol"]),

  // —— Suzetrigine ——————————————————————————————————————————————
  c("42907086", 2026, "Adv Anesth", "Suzetrigine (JOURNAVX) for Acute Postoperative Pain: Evidence, Perioperative Integration, and Clinical Guidance.",
    "The clinical-guidance line behind this desk's CYP3A4 row: \"clinicians must screen for CYP3A interactions and counsel patients using certain hormonal contraceptives.\"",
    ["cyp", "clinic"], ["suzetrigine"]),
  c("42807747", 2026, "Cureus", "Suzetrigine: A Selective Inhibitor of the NaV1.8 Sodium Channel.",
    "States it plainly: suzetrigine \"is also metabolized by cytochrome P4503A (CYP3A) enzymes, suggesting potential drug interactions.\"",
    ["cyp", "review"], ["suzetrigine"]),

  // —— Tianeptine (opioid-receptor / withdrawal evidence — see file note on CYP3A4) ——
  c("42177839", 2026, "Drug Alcohol Depend", "Tianeptine misuse and addiction: A systematic review of withdrawal, toxicity, and clinical management.",
    "53 studies, 1055 patients: half the individual cases presented in withdrawal, nearly half in overdose, and roughly a third of detailed overdoses were fatal. The opioid-receptor framing, not the antidepressant one, is what kills.",
    ["mat", "review"], ["tianeptine"]),
  c("35211768", 2022, "Psychopharmacology (Berl)", "Opioid-like adverse effects of tianeptine in male rats and mice.",
    "Naltrexone-preventable locomotor activation and naloxone-reversible respiratory depression — tianeptine behaves at the μ receptor like an opioid because at abused doses it is one.",
    ["mat"], ["tianeptine"]),

  // —— Phenibut ————————————————————————————————————————————————
  c("30852710", 2019, "Curr Psychiatry Rep", "Phenibut (β-Phenyl-γ-Aminobutyric Acid): an Easily Obtainable \"Dietary Supplement\" With Propensities for Physical Dependence and Addiction.",
    "A GABA-B agonist marketed as a nootropic with the pharmacology of a sedative — physical dependence and withdrawal are the expected course here, not an edge case.",
    ["review"], ["phenibut"]),
  c("37930202", 2023, "J Clin Psychopharmacol", "Toxidrome of an Easily Obtainable Nootropic: A Case Report of Phenibut Intoxication and Withdrawal Delirium.",
    "An extreme-intake case: GABA-B plus some GABA-A and α2δ (gabapentinoid-like) activity — exactly why alcohol, benzodiazepines, and GHB stack on top of phenibut instead of just adding to it.",
    ["clinic"], ["phenibut"]),

  // —— GLP-1 / GIP peptides: tirzepatide / semaglutide ——————————————————————
  c("42721915", 2026, "Maturitas", "Tirzepatide and oral progestogens: A hypothesis-generating review of a biologically plausible pharmacokinetic interaction in gynaecologic disease control and menopausal hormone therapy.",
    "The one PK study on file: a single tirzepatide dose cut ethinylestradiol/norgestimate peak levels 55-66% and pushed time-to-peak out 2.5-4.5 hours — delayed gastric emptying doing exactly what this desk's note describes, to a real oral drug.",
    ["clinic"], ["tirzepatide"]),
  c("40330819", 2025, "Drug Des Devel Ther", "A Comprehensive Review on the Pharmacokinetics and Drug-Drug Interactions of Approved GLP-1 Receptor Agonists and a Dual GLP-1/GIP Receptor Agonist.",
    "No CYP- or transporter-mediated DDIs reported for this class. The one mechanism on file is delayed gastric emptying, which measurably changed oral-contraceptive exposure after tirzepatide and levothyroxine exposure after oral semaglutide.",
    ["clinic", "review"], ["tirzepatide", "semaglutide"]),
  c("39989027", 2025, "Pharmacotherapy", "GLP-1RA-induced delays in gastrointestinal motility: Predicted effects on coadministered drug absorption by PBPK analysis.",
    "PBPK modeling calibrated to semaglutide/liraglutide gastric-emptying data: a narrow-index drug like dabigatran could see its AUC rise ~205% riding the same delayed-emptying mechanism this desk's semaglutide note flags.",
    ["clinic"], ["semaglutide"]),

  // —— Kratom ————————————————————————————————————————————————
  c("36924284", 2023, "Clin Pharmacol Ther", "Clinical Assessment of the Drug Interaction Potential of the Psychotropic Natural Product Kratom.",
    "First human DDI study: a single cup of kratom tea raised the CYP3A4 probe midazolam's AUC ~39% via gut-wall inhibition. The same dose moved the CYP2D6 probe dextromethorphan not at all — real 3A4 signal, no 2D6 signal at this dose.",
    ["cyp", "clinic"], ["kratom"]),
  c("37019472", 2023, "J Pharmacol Exp Ther", "Pharmacokinetic and Pharmacodynamic Consequences of Cytochrome P450 3A Inhibition on Mitragynine Metabolism in Rats.",
    "Blocking CYP3A pushed mitragynine exposure up 120% and its more potent metabolite 7-OH-mitragynine up 130%, with matching gains in opioid-like potency — the substrate role this desk encodes, with the swing that makes it matter.",
    ["cyp"], ["kratom"]),
  c("35840540", 2022, "J Pharm Pract", "Case Report: Possible Serotonin Syndrome in a Patient Taking Kratom and Multiple Serotonergic Agents.",
    "Kratom is not only an opioid on this desk — this case is why the serotonergic flag sits next to SSRIs, SNRIs, and MAOIs.",
    ["serotonin", "clinic"], ["kratom"]),
  c("35165231", 2022, "J Addict Med", "A Case of Potential Pharmacokinetic Kratom-drug Interactions Resulting in Toxicity and Subsequent Treatment of Kratom Use Disorder With Buprenorphine/Naloxone.",
    "A real-world PK-interaction toxicity case, resolved with the same buprenorphine/naloxone induction this desk already maps for other opioids.",
    ["mat", "clinic"], ["kratom"]),

  // —— Methylene blue ————————————————————————————————————————————
  c("28377303", 2017, "Toxicol Appl Pharmacol", "The monoamine oxidase inhibition properties of selected structural analogues of methylene blue.",
    "The mechanism behind the pd flag: methylene blue is a potent, specific MAO-A inhibitor (IC50 ~0.07 µM) — an MAOI by structure, not just by case report.",
    ["serotonin"], ["methylene-blue"]),
  c("30104021", 2018, "Psychosomatics", "Serotonin Toxicity and Urinary Analgesics: A Case Report and Systematic Literature Review of Methylene Blue-Induced Serotonin Syndrome.",
    "50 pooled cases, one fatal, every one on a serotonergic antidepressant at the time. Prior cases were all parenteral methylene blue; this one's index case shows an oral MB-containing agent doing the same thing.",
    ["serotonin", "review"], ["methylene-blue"]),
  c("40271333", 2025, "Cureus", "Prevalence of Serotonergic Drug Use in Patients Exposed to Perioperative Methylene Blue: A Cross-Sectional Study.",
    "249,131 patients given perioperative methylene blue: 1 in 10 were already on an SSRI, SNRI, TCA, lithium, or an MAOI — the collision this desk flags is routine exposure, not a rare case report.",
    ["serotonin", "clinic"], ["methylene-blue"]),
];
