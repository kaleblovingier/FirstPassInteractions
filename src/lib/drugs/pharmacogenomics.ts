/**
 * Pharmacogenomics & CPIC Drug-Gene Mechanism Matrix
 *
 * Comprehensive clinical reference covering the major pharmacogenes, clinical alleles,
 * metabolic phenotype translation, molecular hypersensitivity pathways, and CPIC guideline
 * consensus recommendations.
 *
 * REGULATORY POSTURE (FD&C Act § 520(o)(1)(E)):
 * Non-device Clinical Decision Support software reference. This module provides
 * educational, non-prescriptive mechanistic explanations of drug-gene interactions,
 * allele functionality mappings, pharmacokinetic flux alterations, and CPIC guideline
 * consensus recommendations for healthcare professional and student evaluation.
 * It does NOT provide patient-specific dosing directives, therapeutic prescriptions,
 * or clinical treatment orders. Healthcare providers must exercise independent clinical
 * judgement and consult full FDA-approved Prescribing Information, institutional laboratory
 * protocols, and current Clinical Pharmacogenetics Implementation Consortium (CPIC) guidelines.
 */

import { DRUG_BY_ID } from "./catalog";

export const PHARMACOGENOMICS_REGULATORY_DISCLAIMER =
  "Non-prescriptive Clinical Decision Support reference under FD&C Act § 520(o)(1)(E). This module provides educational mechanisms of drug-gene interactions, allele functionality mappings, pharmacokinetic flux alterations, and CPIC guideline consensus recommendations for healthcare professional evaluation. It does not provide patient-specific dosing orders, therapeutic prescriptions, or clinical treatment directives. Healthcare providers must exercise independent clinical judgement and consult full FDA prescribing information and current CPIC guidelines.";

export type CpicLevel = "Level A" | "Level B" | "Level C" | "Level D";

export type TherapeuticArea =
  | "Oncology"
  | "Cardiology"
  | "Psychiatry"
  | "Infectious Disease"
  | "Pain & Neurology"
  | "Rheumatology & Immunology";

export type AlleleFunction =
  | "Normal Function"
  | "Decreased Function"
  | "No Function"
  | "Increased Function"
  | "Uncertain / Variable";

export interface GeneAllele {
  allele: string;
  name: string;
  functionality: AlleleFunction;
  activityScore: number;
  description: string;
  nucleotideChange?: string;
  proteinChange?: string;
  rsId?: string;
}

export interface MetabolizerPhenotype {
  code: string;
  name: string;
  activityScoreRange?: string;
  genotypeExamples: string[];
  clinicalSummary: string;
  populationFrequencyNotes?: string;
}

export interface Pharmacogene {
  id: string;
  symbol: string;
  name: string;
  chromosomeLocation: string;
  ncbiGeneId: string;
  systemRole: string;
  molecularMechanism: string;
  alleles: GeneAllele[];
  phenotypes: MetabolizerPhenotype[];
  primaryDrugs: string[];
  citations: string[];
}

export interface PhenotypeRiskProfile {
  phenotype: string;
  clinicalConsequence: string;
  pharmacokineticMechanism: string;
  cpicRecommendation: string;
  severity: "critical" | "high" | "moderate" | "informational";
}

export interface MetabolicFluxNode {
  label: string;
  fractionInNormal: number;
  fractionInAltered: number;
  description: string;
}

export interface PgxInteraction {
  id: string;
  drugId: string;
  drugName: string;
  geneId: string;
  geneSymbol: string;
  cpicLevel: CpicLevel;
  therapeuticArea: TherapeuticArea;
  guidelineTitle: string;
  guidelineUrl: string;
  fdaBoxedWarning: boolean;
  phenotypeRisks: PhenotypeRiskProfile[];
  molecularMechanism: string;
  fluxComparison?: {
    normalPhenotype: string;
    alteredPhenotype: string;
    nodes: MetabolicFluxNode[];
  };
  fdaLabelSection: string;
  citations: string[];
}

export interface DetectedPgxRisk {
  id: string;
  drugId: string;
  drugName: string;
  geneId: string;
  geneSymbol: string;
  cpicLevel: CpicLevel;
  therapeuticArea: TherapeuticArea;
  severity: "critical" | "high" | "moderate" | "informational";
  headline: string;
  mechanisticSummary: string;
  consensusGuideline: string;
  interaction: PgxInteraction;
}

/**
 * MAJOR PHARMACOGENES DATABASE
 */
export const PHARMACOGENES: Pharmacogene[] = [
  {
    id: "CYP2D6",
    symbol: "CYP2D6",
    name: "Cytochrome P450 Family 2 Subfamily D Member 6",
    chromosomeLocation: "22q13.2",
    ncbiGeneId: "1565",
    systemRole: "Phase I Microsomal Monooxygenase (High Polymorphic Affinity Enzyme)",
    molecularMechanism:
      "Responsible for the oxidative clearance or bioactivation of approximately 20-25% of clinically used drugs, including opioid analgesics, tricyclic antidepressants, beta-blockers, antiarrhythmics, and tamoxifen. Highly polymorphic locus prone to gene deletions (*5), gene duplications (*1xN, *2xN), and complex structural rearrangement with the neighboring CYP2D7/CYP2D8 pseudogenes.",
    alleles: [
      {
        allele: "*1",
        name: "Wild Type",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Fully active wild-type enzyme with standard catalytic capacity.",
      },
      {
        allele: "*2",
        name: "Arg296Cys, Ser486Thr",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Normal catalytic function across standard probe substrates.",
        proteinChange: "p.Arg296Cys, p.Ser486Thr",
        rsId: "rs16947",
      },
      {
        allele: "*4",
        name: "c.1846G>A Splice Defect",
        functionality: "No Function",
        activityScore: 0.0,
        description: "Canonical G-to-A transition causing aberrant mRNA splicing, frameshift, and non-functional truncated protein.",
        nucleotideChange: "c.1846G>A",
        rsId: "rs3892097",
      },
      {
        allele: "*5",
        name: "Complete Gene Deletion",
        functionality: "No Function",
        activityScore: 0.0,
        description: "Complete physical deletion of the CYP2D6 coding locus (~12 kb genomic deletion); zero enzyme production.",
      },
      {
        allele: "*10",
        name: "Pro34Ser",
        functionality: "Decreased Function",
        activityScore: 0.25,
        description: "Unstable enzyme with markedly reduced expression and catalytic rate; predominant in East Asian ancestries.",
        proteinChange: "p.Pro34Ser",
        rsId: "rs1065852",
      },
      {
        allele: "*41",
        name: "c.2988G>A Splicing Defect",
        functionality: "Decreased Function",
        activityScore: 0.5,
        description: "Intronic mutation impairing splicing efficiency, leading to diminished active CYP2D6 mRNA levels.",
        nucleotideChange: "c.2988G>A",
        rsId: "rs28371725",
      },
      {
        allele: "*1xN",
        name: "Gene Duplication / Multiplication",
        functionality: "Increased Function",
        activityScore: 2.0,
        description: "Tandem gene duplication or amplification (2 to 13+ copies) of functional *1 alleles leading to enzyme overexpression and ultrarapid clearance.",
      },
    ],
    phenotypes: [
      {
        code: "PM",
        name: "Poor Metabolizer",
        activityScoreRange: "AS = 0",
        genotypeExamples: ["*4/*4", "*4/*5", "*5/*5"],
        clinicalSummary:
          "Complete lack of functional CYP2D6 enzyme. Prodrugs requiring bioactivation (codeine, tramadol, tamoxifen) fail to produce active therapeutic moieties, while parent substrates (TCAs, fluoxetine, haloperidol) accumulate to supratherapeutic concentrations.",
        populationFrequencyNotes: "~5-10% in European ancestries; ~1-2% in East Asian ancestries.",
      },
      {
        code: "IM",
        name: "Intermediate Metabolizer",
        activityScoreRange: "0 < AS < 1.25",
        genotypeExamples: ["*4/*10", "*4/*41", "*10/*10", "*1/*4"],
        clinicalSummary:
          "Reduced metabolic capacity. Shows intermediate rates of prodrug activation and clearance; heightened sensitivity to enzyme saturation and drug-drug interactions.",
        populationFrequencyNotes: "Highly prevalent (~30-50%) in East Asian populations due to high frequency of *10.",
      },
      {
        code: "NM",
        name: "Normal Metabolizer",
        activityScoreRange: "1.25 ≤ AS ≤ 2.25",
        genotypeExamples: ["*1/*1", "*1/*2", "*1/*41", "*2/*2"],
        clinicalSummary:
          "Standard baseline metabolic rate. Standard pharmacokinetic clearance and expected rate of prodrug bioactivation.",
        populationFrequencyNotes: "Prevalent in ~65-80% of individuals across world populations.",
      },
      {
        code: "UM",
        name: "Ultrarapid Metabolizer",
        activityScoreRange: "AS > 2.25",
        genotypeExamples: ["*1/*1xN", "*2/*2xN", "*1xN/*2"],
        clinicalSummary:
          "Substantially increased enzyme activity due to gene duplication. Prodrugs (codeine, tramadol) undergo rapid and exaggerated conversion to active opioids, risking life-threatening toxicity. Active parent drugs (TCAs) are cleared too rapidly to sustain therapeutic levels.",
        populationFrequencyNotes: "1-2% in Northern Europeans; up to 10-29% in Middle Eastern and North African ancestries.",
      },
    ],
    primaryDrugs: ["codeine", "tramadol", "tamoxifen", "nortriptyline", "amitriptyline"],
    citations: [
      "Caudle KE, et al. Clin Pharmacol Ther. 2020;107(1):82-99.",
      "Crews KR, et al. Clin Pharmacol Ther. 2021;110(4):888-896.",
      "Goetz MP, et al. Clin Pharmacol Ther. 2018;103(5):770-777.",
      "Hicks JK, et al. Clin Pharmacol Ther. 2017;102(1):37-44.",
    ],
  },
  {
    id: "CYP2C19",
    symbol: "CYP2C19",
    name: "Cytochrome P450 Family 2 Subfamily C Member 19",
    chromosomeLocation: "10q23.33",
    ncbiGeneId: "1557",
    systemRole: "Phase I Microsomal Monooxygenase (Major Hepatic Drug Metabolizer)",
    molecularMechanism:
      "Key hepatic enzyme mediating the bioactivation of thienopyridine antiplatelet prodrugs (clopidogrel) and the metabolic clearance of proton pump inhibitors, selective serotonin reuptake inhibitors (citalopram, escitalopram), tricyclics, and triazole antifungals (voriconazole).",
    alleles: [
      {
        allele: "*1",
        name: "Wild Type",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Fully active wild-type allele.",
      },
      {
        allele: "*2",
        name: "c.681G>A Aberrant Splice Site",
        functionality: "No Function",
        activityScore: 0.0,
        description: "Splice site mutation in exon 5 creating an aberrant cryptic splice site, resulting in truncated non-functional enzyme.",
        nucleotideChange: "c.681G>A",
        rsId: "rs4244285",
      },
      {
        allele: "*3",
        name: "c.636G>A Premature Stop Codon",
        functionality: "No Function",
        activityScore: 0.0,
        description: "Nonsense mutation in exon 4 (p.Trp212Ter) generating a truncated inactive enzyme; prevalent in East Asian populations.",
        nucleotideChange: "c.636G>A",
        proteinChange: "p.Trp212Ter",
        rsId: "rs4986893",
      },
      {
        allele: "*17",
        name: "-806C>T Promoter Variant",
        functionality: "Increased Function",
        activityScore: 1.5,
        description: "Promoter variant enhancing transcription factor binding and gene transcription rate, resulting in elevated enzyme levels.",
        nucleotideChange: "-806C>T",
        rsId: "rs12248560",
      },
    ],
    phenotypes: [
      {
        code: "PM",
        name: "Poor Metabolizer",
        activityScoreRange: "Two no-function alleles",
        genotypeExamples: ["*2/*2", "*2/*3", "*3/*3"],
        clinicalSummary:
          "Severely deficient or absent CYP2C19 activity. Inability to bioactivate clopidogrel into its active thiol metabolite (high stent thrombosis risk); profound clearance impairment for voriconazole and citalopram/escitalopram.",
        populationFrequencyNotes: "~2-5% in Europeans; ~15-20% in East Asians.",
      },
      {
        code: "IM",
        name: "Intermediate Metabolizer",
        activityScoreRange: "One normal + one no-function, or one increased + one no-function",
        genotypeExamples: ["*1/*2", "*1/*3", "*2/*17"],
        clinicalSummary:
          "Substantially reduced bioactivation of clopidogrel and moderate reduction in clearance of substrates.",
        populationFrequencyNotes: "~25-30% in Europeans; ~45-50% in East Asians.",
      },
      {
        code: "NM",
        name: "Normal Metabolizer",
        activityScoreRange: "Two normal alleles",
        genotypeExamples: ["*1/*1"],
        clinicalSummary:
          "Expected baseline clearance and predictable antiplatelet response with clopidogrel.",
        populationFrequencyNotes: "~35-45% in European populations.",
      },
      {
        code: "RM",
        name: "Rapid Metabolizer",
        activityScoreRange: "One normal + one increased-function allele",
        genotypeExamples: ["*1/*17"],
        clinicalSummary:
          "Enhanced clearance of active substrates; enhanced bioactivation of clopidogrel.",
        populationFrequencyNotes: "~25-30% in Europeans and Africans.",
      },
      {
        code: "UM",
        name: "Ultrarapid Metabolizer",
        activityScoreRange: "Two increased-function alleles",
        genotypeExamples: ["*17/*17"],
        clinicalSummary:
          "Hyper-accelerated clearance of voriconazole and SSRIs, risking subtherapeutic drug concentrations and clinical non-response.",
        populationFrequencyNotes: "~4-6% in Europeans and Africans.",
      },
    ],
    primaryDrugs: ["clopidogrel", "voriconazole", "citalopram", "escitalopram"],
    citations: [
      "Lee CR, et al. Clin Pharmacol Ther. 2022;112(5):959-967.",
      "Moriyama B, et al. Clin Pharmacol Ther. 2017;102(1):45-51.",
      "Bousman CA, et al. Clin Pharmacol Ther. 2023;114(1):51-68.",
    ],
  },
  {
    id: "CYP2C9",
    symbol: "CYP2C9",
    name: "Cytochrome P450 Family 2 Subfamily C Member 9",
    chromosomeLocation: "10q23.33",
    ncbiGeneId: "1559",
    systemRole: "Phase I Microsomal Monooxygenase (Narrow Therapeutic Window Clearance)",
    molecularMechanism:
      "Major hepatic clearance enzyme for narrow therapeutic index drugs including S-warfarin, phenytoin, and multiple NSAIDs. CYP2C9 clears the biologically active S-enantiomer of warfarin, which is 3- to 5-fold more potent at inhibiting vitamin K epoxide reductase than R-warfarin.",
    alleles: [
      {
        allele: "*1",
        name: "Wild Type",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Fully functional wild-type allele.",
      },
      {
        allele: "*2",
        name: "Arg144Cys",
        functionality: "Decreased Function",
        activityScore: 0.5,
        description: "Arg144Cys (c.430C>T) missense variant resulting in ~30% reduced intrinsic clearance of S-warfarin and phenytoin.",
        nucleotideChange: "c.430C>T",
        proteinChange: "p.Arg144Cys",
        rsId: "rs1799853",
      },
      {
        allele: "*3",
        name: "Ile359Leu",
        functionality: "Decreased Function",
        activityScore: 0.2,
        description: "Ile359Leu (c.1075A>C) missense variant causing ~80% reduced clearance of S-warfarin and phenytoin.",
        nucleotideChange: "c.1075A>C",
        proteinChange: "p.Ile359Leu",
        rsId: "rs1057910",
      },
    ],
    phenotypes: [
      {
        code: "NM",
        name: "Normal Metabolizer",
        genotypeExamples: ["*1/*1"],
        clinicalSummary: "Normal clearance of S-warfarin and phenytoin.",
      },
      {
        code: "IM",
        name: "Intermediate Metabolizer",
        genotypeExamples: ["*1/*2", "*1/*3", "*2/*2"],
        clinicalSummary:
          "Reduced clearance of S-warfarin (requiring lower maintenance doses) and prolonged elimination half-life of phenytoin.",
      },
      {
        code: "PM",
        name: "Poor Metabolizer",
        genotypeExamples: ["*2/*3", "*3/*3"],
        clinicalSummary:
          "Profoundly impaired S-warfarin clearance leading to marked INR elevations and bleeding risks; early capacity saturation of phenytoin clearance leading to severe toxicity.",
      },
    ],
    primaryDrugs: ["warfarin", "phenytoin"],
    citations: [
      "Johnson JA, et al. Clin Pharmacol Ther. 2017;102(3):397-404.",
      "Karnes JH, et al. Clin Pharmacol Ther. 2021;109(2):302-309.",
    ],
  },
  {
    id: "VKORC1",
    symbol: "VKORC1",
    name: "Vitamin K Epoxide Reductase Complex Subunit 1",
    chromosomeLocation: "16p11.2",
    ncbiGeneId: "79001",
    systemRole: "Vitamin K Recycling Enzyme (Pharmacodynamic Warfarin Target)",
    molecularMechanism:
      "Catalyzes the rate-limiting reduction of vitamin K 2,3-epoxide to vitamin K hydroquinone, the essential cofactor for gamma-glutamyl carboxylase in activating clotting factors II, VII, IX, and X. Promoter polymorphism -1639G>A regulates transcription factor binding and enzyme expression levels.",
    alleles: [
      {
        allele: "G",
        name: "-1639G (Wild Type)",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Standard promoter transcription; normal VKORC1 protein expression; standard warfarin sensitivity.",
        nucleotideChange: "-1639G",
        rsId: "rs9923231",
      },
      {
        allele: "A",
        name: "-1639G>A Promoter Variant",
        functionality: "Decreased Function",
        activityScore: 0.5,
        description: "-1639G>A promoter variant disrupts an E-box transcription factor binding site, lowering hepatic VKORC1 mRNA and protein expression by ~50%; confers high warfarin sensitivity.",
        nucleotideChange: "-1639G>A",
        rsId: "rs9923231",
      },
    ],
    phenotypes: [
      {
        code: "Normal Sensitivity",
        name: "Normal Warfarin Sensitivity (GG)",
        genotypeExamples: ["-1639 G/G"],
        clinicalSummary: "Normal VKORC1 enzyme levels; standard therapeutic warfarin maintenance requirement (~5-7 mg/day).",
      },
      {
        code: "Moderate Sensitivity",
        name: "Intermediate Warfarin Sensitivity (GA)",
        genotypeExamples: ["-1639 G/A"],
        clinicalSummary: "Intermediate enzyme levels; moderate warfarin dose requirement (~3-4 mg/day).",
      },
      {
        code: "High Sensitivity",
        name: "High Warfarin Sensitivity (AA)",
        genotypeExamples: ["-1639 A/A"],
        clinicalSummary: "Low VKORC1 enzyme levels; high warfarin sensitivity; substantially lower maintenance requirement (~1-3 mg/day) to prevent dangerous supratherapeutic anticoagulation.",
      },
    ],
    primaryDrugs: ["warfarin"],
    citations: [
      "Johnson JA, et al. Clin Pharmacol Ther. 2017;102(3):397-404.",
      "Rieder MJ, et al. N Engl J Med. 2005;352(22):2285-2293.",
    ],
  },
  {
    id: "HLA-B5701",
    symbol: "HLA-B*57:01",
    name: "Major Histocompatibility Complex, Class I, B (*57:01)",
    chromosomeLocation: "6p21.33",
    ncbiGeneId: "3106",
    systemRole: "Class I MHC Antigen-Presenting Complex",
    molecularMechanism:
      "Presents endogenous peptide antigens to CD8+ cytotoxic T cells. Abacavir accommodates non-covalently in the F-pocket of the HLA-B*57:01 antigen-binding cleft, altering the shape and chemical environment of the pocket. This alters the self-peptide repertoire presented to CD8+ T cells, triggering massive autoimmune activation.",
    alleles: [
      {
        allele: "Non-carrier",
        name: "Negative (Non-carrier of HLA-B*57:01)",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Absence of the HLA-B*57:01 allele; low baseline risk of abacavir hypersensitivity reaction.",
      },
      {
        allele: "Carrier",
        name: "Positive (HLA-B*57:01 Allele Present)",
        functionality: "Increased Function",
        activityScore: 0.0,
        description: "Presence of the HLA-B*57:01 allele conferring ~50% absolute risk of severe systemic abacavir hypersensitivity.",
      },
    ],
    phenotypes: [
      {
        code: "Non-carrier",
        name: "HLA-B*57:01 Negative",
        genotypeExamples: ["*57:01 Negative"],
        clinicalSummary: "Low risk of abacavir hypersensitivity reaction (<1%); standard prescribing consideration.",
      },
      {
        code: "Carrier",
        name: "HLA-B*57:01 Positive",
        genotypeExamples: ["*57:01 Positive"],
        clinicalSummary:
          "High risk of life-threatening hypersensitivity reaction. Abacavir is strictly contraindicated; pre-treatment screening is mandatory.",
      },
    ],
    primaryDrugs: ["abacavir"],
    citations: [
      "Martin MA, et al. Clin Pharmacol Ther. 2014;95(5):499-500.",
      "Mallal S, et al. N Engl J Med. 2008;358(6):568-579.",
      "Illing PT, et al. Nature. 2012;486(7404):554-558.",
    ],
  },
  {
    id: "HLA-B1502",
    symbol: "HLA-B*15:02",
    name: "Major Histocompatibility Complex, Class I, B (*15:02)",
    chromosomeLocation: "6p21.33",
    ncbiGeneId: "3106",
    systemRole: "Class I MHC Antigen-Presenting Complex (Cutaneous Adverse Reactions)",
    molecularMechanism:
      "Binding of carbamazepine or oxcarbazepine in the antigen recognition cleft of HLA-B*15:02 triggers cytotoxic CD8+ T-cell and NK-cell activation, leading to massive granulysin release and extensive keratinocyte apoptosis, causing Stevens-Johnson Syndrome (SJS) and Toxic Epidermal Necrolysis (TEN).",
    alleles: [
      {
        allele: "Non-carrier",
        name: "Negative (Non-carrier of HLA-B*15:02)",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Absence of the HLA-B*15:02 allele; standard baseline population risk of aromatic antiepileptic SJS/TEN.",
      },
      {
        allele: "Carrier",
        name: "Positive (HLA-B*15:02 Allele Present)",
        functionality: "Increased Function",
        activityScore: 0.0,
        description: "Presence of HLA-B*15:02 allele conferring strong predisposition to carbamazepine- and oxcarbazepine-induced SJS/TEN.",
      },
    ],
    phenotypes: [
      {
        code: "Non-carrier",
        name: "HLA-B*15:02 Negative",
        genotypeExamples: ["*15:02 Negative"],
        clinicalSummary: "Baseline risk of aromatic antiepileptic cutaneous toxicity.",
      },
      {
        code: "Carrier",
        name: "HLA-B*15:02 Positive",
        genotypeExamples: ["*15:02 Positive"],
        clinicalSummary:
          "High risk of life-threatening SJS/TEN with carbamazepine and oxcarbazepine. Avoid carbamazepine and oxcarbazepine.",
      },
    ],
    primaryDrugs: ["carbamazepine", "oxcarbazepine"],
    citations: [
      "Leckband SG, et al. Clin Pharmacol Ther. 2013;94(3):324-328.",
      "Chung WH, et al. Nature. 2004;428(6982):486.",
      "Kaniwa N, et al. Epilepsia. 2010;51(12):2461-2465.",
    ],
  },
  {
    id: "HLA-A3101",
    symbol: "HLA-A*31:01",
    name: "Major Histocompatibility Complex, Class I, A (*31:01)",
    chromosomeLocation: "6p21.33",
    ncbiGeneId: "3105",
    systemRole: "Class I MHC Antigen-Presenting Complex (Pan-Ancestry SCAR Risk)",
    molecularMechanism:
      "Associated with a broad spectrum of carbamazepine-induced severe cutaneous adverse reactions (SCAR), including SJS/TEN, Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS), and maculopapular eruptions, across European, Japanese, Korean, and Hispanic ancestries.",
    alleles: [
      {
        allele: "Non-carrier",
        name: "Negative (Non-carrier of HLA-A*31:01)",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Absence of the HLA-A*31:01 allele.",
      },
      {
        allele: "Carrier",
        name: "Positive (HLA-A*31:01 Allele Present)",
        functionality: "Increased Function",
        activityScore: 0.0,
        description: "Presence of HLA-A*31:01 allele conferring elevated risk of carbamazepine hypersensitivity.",
      },
    ],
    phenotypes: [
      {
        code: "Non-carrier",
        name: "HLA-A*31:01 Negative",
        genotypeExamples: ["*31:01 Negative"],
        clinicalSummary: "Baseline population risk of carbamazepine cutaneous adverse reactions.",
      },
      {
        code: "Carrier",
        name: "HLA-A*31:01 Positive",
        genotypeExamples: ["*31:01 Positive"],
        clinicalSummary:
          "Elevated risk of carbamazepine-induced SJS/TEN, DRESS, and maculopapular exanthema. Avoid carbamazepine if alternative agents are available.",
      },
    ],
    primaryDrugs: ["carbamazepine"],
    citations: [
      "Leckband SG, et al. Clin Pharmacol Ther. 2013;94(3):324-328.",
      "McCormack M, et al. N Engl J Med. 2011;364(12):1134-1143.",
    ],
  },
  {
    id: "DPYD",
    symbol: "DPYD",
    name: "Dihydropyrimidine Dehydrogenase",
    chromosomeLocation: "1p21.3",
    ncbiGeneId: "1806",
    systemRole: "Rate-Limiting Pyrimidine Catabolism Enzyme (>80% 5-FU Clearance)",
    molecularMechanism:
      "DPD catalyzes the initial, rate-limiting step in the catabolism of pyrimidines, converting 5-fluorouracil (5-FU) to dihydrofluorouracil (DHFU). More than 80-85% of administered fluoropyrimidines are eliminated via DPD. Reduced or absent DPD activity leads to severe accumulation of cytotoxic fluorouracil metabolites (FdUMP, FdUTP, FUTP), causing catastrophic gastrointestinal, hematologic, and neurotoxicities.",
    alleles: [
      {
        allele: "*1",
        name: "Wild Type",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Normal DPD enzyme expression and catalytic activity.",
      },
      {
        allele: "*2A",
        name: "c.1905+1G>A Splice Site",
        functionality: "No Function",
        activityScore: 0.0,
        description: "c.1905+1G>A invariant splice donor site mutation causing skipping of exon 14, producing a truncated inactive DPD protein.",
        nucleotideChange: "c.1905+1G>A",
        rsId: "rs3918290",
      },
      {
        allele: "*13",
        name: "c.1679T>G (p.Ile560Ser)",
        functionality: "No Function",
        activityScore: 0.0,
        description: "c.1679T>G missense mutation (p.Ile560Ser) causing complete loss of catalytic function.",
        nucleotideChange: "c.1679T>G",
        proteinChange: "p.Ile560Ser",
        rsId: "rs55886062",
      },
      {
        allele: "c.2846A>T",
        name: "c.2846A>T (p.Asp949Val)",
        functionality: "Decreased Function",
        activityScore: 0.5,
        description: "c.2846A>T missense mutation (p.Asp949Val) reducing DPD enzymatic activity by ~50%.",
        nucleotideChange: "c.2846A>T",
        proteinChange: "p.Asp949Val",
        rsId: "rs67376798",
      },
    ],
    phenotypes: [
      {
        code: "NM",
        name: "Normal Metabolizer",
        activityScoreRange: "AS = 2.0",
        genotypeExamples: ["*1/*1"],
        clinicalSummary: "Normal DPD activity. Standard clearance of 5-fluorouracil and capecitabine.",
      },
      {
        code: "IM",
        name: "Intermediate Metabolizer",
        activityScoreRange: "1.0 ≤ AS ≤ 1.5",
        genotypeExamples: ["*1/*2A", "*1/*13", "*1/c.2846A>T"],
        clinicalSummary:
          "Reduced DPD activity. High risk of severe (grade ≥3) or lethal fluoropyrimidine toxicity (mucositis, neutropenic fever, diarrhea). Guideline consensus recommends significant dose reduction (typically 50%) or alternative therapy.",
      },
      {
        code: "PM",
        name: "Poor Metabolizer",
        activityScoreRange: "AS < 1.0",
        genotypeExamples: ["*2A/*2A", "*2A/*13"],
        clinicalSummary:
          "Complete or near-complete DPD deficiency. Lethal toxicity risk upon fluoropyrimidine exposure. Complete avoidance of 5-fluorouracil and capecitabine recommended.",
      },
    ],
    primaryDrugs: ["fluorouracil", "capecitabine"],
    citations: [
      "Amstutz U, et al. Clin Pharmacol Ther. 2018;103(2):210-216.",
      "Lunenburg CATC, et al. Clin Pharmacol Ther. 2020;108(2):208-215.",
    ],
  },
  {
    id: "TPMT",
    symbol: "TPMT",
    name: "Thiopurine S-Methyltransferase",
    chromosomeLocation: "6p22.3",
    ncbiGeneId: "7172",
    systemRole: "Phase II S-Adenosylmethionine Conjugation (Thiopurine Inactivation)",
    molecularMechanism:
      "Catalyzes the S-methylation of thiopurine antimetabolites (azathioprine, 6-mercaptopurine) into inactive 6-methylmercaptopurine (6-MMP). In TPMT deficiency, thiopurine flux is redirected toward the hypoxanthine phosphoribosyltransferase (HPRT) pathway, generating lethal intracellular concentrations of cytotoxic 6-thioguanine nucleotides (6-TGN).",
    alleles: [
      {
        allele: "*1",
        name: "Wild Type",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Fully active wild-type enzyme.",
      },
      {
        allele: "*2",
        name: "c.238G>C (p.Ala80Pro)",
        functionality: "No Function",
        activityScore: 0.0,
        description: "Missense mutation causing accelerated degradation of TPMT protein.",
        nucleotideChange: "c.238G>C",
        proteinChange: "p.Ala80Pro",
        rsId: "rs1800462",
      },
      {
        allele: "*3A",
        name: "c.460G>A & c.719A>G",
        functionality: "No Function",
        activityScore: 0.0,
        description: "Compound missense variant (p.Ala154Thr + p.Tyr240Cys); primary inactive allele in Caucasians.",
        nucleotideChange: "c.460G>A, c.719A>G",
        proteinChange: "p.Ala154Thr, p.Tyr240Cys",
        rsId: "rs1800460, rs1142345",
      },
      {
        allele: "*3C",
        name: "c.719A>G (p.Tyr240Cys)",
        functionality: "No Function",
        activityScore: 0.0,
        description: "Missense variant in exon 10; most common deficient allele in East Asian and African ancestries.",
        nucleotideChange: "c.719A>G",
        proteinChange: "p.Tyr240Cys",
        rsId: "rs1142345",
      },
    ],
    phenotypes: [
      {
        code: "NM",
        name: "Normal Metabolizer",
        genotypeExamples: ["*1/*1"],
        clinicalSummary: "Normal TPMT activity; expected 6-TGN production under standard dosing.",
      },
      {
        code: "IM",
        name: "Intermediate Metabolizer",
        genotypeExamples: ["*1/*2", "*1/*3A", "*1/*3C"],
        clinicalSummary:
          "Intermediate TPMT activity; elevated 6-TGN accumulation; moderate-to-high risk of leukopenia.",
      },
      {
        code: "PM",
        name: "Poor Metabolizer",
        genotypeExamples: ["*3A/*3A", "*3A/*3C", "*3C/*3C"],
        clinicalSummary:
          "Deficient TPMT activity; massive 6-TGN hyper-accumulation; profound life-threatening myelosuppression with standard dosing.",
      },
    ],
    primaryDrugs: ["azathioprine", "mercaptopurine"],
    citations: [
      "Relling MV, et al. Clin Pharmacol Ther. 2019;105(5):1095-1105.",
      "Ford LT, et al. Ann Clin Biochem. 2010;47(Pt 4):287-302.",
    ],
  },
  {
    id: "NUDT15",
    symbol: "NUDT15",
    name: "Nudix Hydrolase 15",
    chromosomeLocation: "13q14.2",
    ncbiGeneId: "55224",
    systemRole: "Nucleotide Pool Sanitizing Hydrolase (Degrades Toxic Thio-dGTP)",
    molecularMechanism:
      "Dephosphorylates cytotoxic thiopurine metabolites (specifically 6-thio-(d)GTP to 6-thio-(d)GMP), preventing their misincorporation into genomic DNA. In NUDT15-deficient individuals, persistent cytotoxic 6-thio-dGTP accumulates and incorporates into DNA, leading to severe double-strand breaks, apoptosis, and acute myelosuppression.",
    alleles: [
      {
        allele: "*1",
        name: "Wild Type",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Normal nucleoside diphosphatase sanitizing activity.",
      },
      {
        allele: "*3",
        name: "c.415C>T (p.Arg139Cys)",
        functionality: "No Function",
        activityScore: 0.0,
        description: "Missense mutation destabilizing the enzyme and abolishing phosphatase activity; highly prevalent in East Asian and Hispanic ancestries.",
        nucleotideChange: "c.415C>T",
        proteinChange: "p.Arg139Cys",
        rsId: "rs116855232",
      },
    ],
    phenotypes: [
      {
        code: "NM",
        name: "Normal Metabolizer",
        genotypeExamples: ["*1/*1"],
        clinicalSummary: "Normal thiopurine nucleotide pool sanitization.",
      },
      {
        code: "IM",
        name: "Intermediate Metabolizer",
        genotypeExamples: ["*1/*3"],
        clinicalSummary: "Reduced sanitizing capacity; heightened risk of thiopurine myelosuppression and severe alopecia.",
      },
      {
        code: "PM",
        name: "Poor Metabolizer",
        genotypeExamples: ["*3/*3"],
        clinicalSummary:
          "Severe inability to sanitize thio-dGTP; near 100% risk of profound early leukopenia and severe hair loss with standard thiopurine dosing.",
      },
    ],
    primaryDrugs: ["azathioprine", "mercaptopurine"],
    citations: [
      "Relling MV, et al. Clin Pharmacol Ther. 2019;105(5):1095-1105.",
      "Yang SK, et al. Nat Genet. 2014;46(9):1017-1022.",
    ],
  },
  {
    id: "G6PD",
    symbol: "G6PD",
    name: "Glucose-6-Phosphate Dehydrogenase",
    chromosomeLocation: "Xq28",
    ncbiGeneId: "2539",
    systemRole: "Rate-Limiting Pentose Phosphate Pathway Enzyme (Only Source of RBC NADPH)",
    molecularMechanism:
      "Catalyzes the oxidation of glucose-6-phosphate to 6-phosphoglucono-delta-lactone while reducing NADP+ to NADPH. In mature erythrocytes, which lack mitochondria, G6PD is the sole generator of NADPH required to maintain reduced glutathione (GSH). Exposure to oxidant drugs oxidizes hemoglobin sulfhydryl groups into disulfide aggregates (Heinz bodies), causes lipid membrane peroxidation, and induces acute intravascular and extravascular hemolysis.",
    alleles: [
      {
        allele: "Class IV",
        name: "Normal (Class IV)",
        functionality: "Normal Function",
        activityScore: 1.0,
        description: "Normal enzyme activity (60-150% of normal).",
      },
      {
        allele: "Class II (Mediterranean)",
        name: "Severe Deficiency (Class II, c.563C>T)",
        functionality: "No Function",
        activityScore: 0.05,
        description: "Severe deficiency (<10% activity); prone to acute, life-threatening hemolysis with oxidant xenobiotics.",
        nucleotideChange: "c.563C>T",
        proteinChange: "p.Ser188Phe",
        rsId: "rs5030868",
      },
      {
        allele: "Class III (A-)",
        name: "Moderate Deficiency (Class III, A-)",
        functionality: "Decreased Function",
        activityScore: 0.2,
        description: "Moderate deficiency (10-60% activity); accelerated enzyme decay in older red cells; prevalent in African ancestries.",
        nucleotideChange: "c.202G>A, c.376A>G",
        proteinChange: "p.Val68Met, p.Asn126Asp",
        rsId: "rs1050828, rs1050829",
      },
    ],
    phenotypes: [
      {
        code: "Normal",
        name: "G6PD Normal",
        genotypeExamples: ["Class IV Normal"],
        clinicalSummary: "Adequate NADPH generation to handle physiological and oxidant xenobiotic stress.",
      },
      {
        code: "Deficient",
        name: "G6PD Deficient",
        genotypeExamples: ["Class II (Mediterranean)", "Class III (A-) hemizygous/homozygous"],
        clinicalSummary:
          "Inadequate intraerythrocytic NADPH generation. Strong contraindication for rasburicase; severe hemolysis risk with primaquine, dapsone, and nitrofurantoin.",
      },
    ],
    primaryDrugs: ["rasburicase", "primaquine", "dapsone", "nitrofurantoin"],
    citations: [
      "Relling MV, et al. Clin Pharmacol Ther. 2014;96(2):169-174.",
      "Gammal RS, et al. Clin Pharmacol Ther. 2023;113(4):773-785.",
      "Luzzatto L, et al. Blood. 2020;136(11):1225-1240.",
    ],
  },
];

/**
 * CPIC PHARMACOGENOMIC DRUG-GENE INTERACTIONS MATRIX
 */
export const PGX_INTERACTIONS: PgxInteraction[] = [
  // 1. Codeine / CYP2D6
  {
    id: "codeine-cyp2d6",
    drugId: "codeine",
    drugName: "Codeine",
    geneId: "CYP2D6",
    geneSymbol: "CYP2D6",
    cpicLevel: "Level A",
    therapeuticArea: "Pain & Neurology",
    guidelineTitle: "CPIC Guideline for Codeine and CYP2D6",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-codeine-and-cyp2d6/",
    fdaBoxedWarning: true,
    phenotypeRisks: [
      {
        phenotype: "Ultrarapid Metabolizer (UM)",
        clinicalConsequence:
          "Life-threatening respiratory depression or fatal opioid overdose due to rapid and exaggerated metabolic conversion into morphine.",
        pharmacokineticMechanism:
          "CYP2D6 mediates O-demethylation of codeine to morphine (which has ~200-fold higher affinity for mu-opioid receptors). Gene duplication causes supra-physiological morphine Cmax and AUC.",
        cpicRecommendation:
          "Avoid codeine due to risk of life-threatening respiratory depression; consider alternative analgesics not dependent on CYP2D6 metabolism (e.g., morphine, non-opioids).",
        severity: "critical",
      },
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence: "Inadequate analgesia and therapeutic failure.",
        pharmacokineticMechanism:
          "Lack of functional CYP2D6 prevents bioactivation of codeine into morphine, resulting in subtherapeutic morphine concentrations.",
        cpicRecommendation:
          "Avoid codeine due to lack of analgesic efficacy; consider non-CYP2D6 analgesics.",
        severity: "high",
      },
    ],
    molecularMechanism:
      "Codeine is a weak mu-opioid prodrug requiring CYP2D6-mediated O-demethylation into active morphine. UMs rapidly produce excessive morphine, risking fatal respiratory depression (FDA Boxed Warning for pediatric post-tonsillectomy and nursing mothers), while PMs experience analgesic failure.",
    fluxComparison: {
      normalPhenotype: "Normal Metabolizer (NM)",
      alteredPhenotype: "Ultrarapid (UM) vs Poor (PM)",
      nodes: [
        { label: "Codeine Parent", fractionInNormal: 0.8, fractionInAltered: 0.2, description: "Unmetabolized parent codeine" },
        { label: "Morphine (O-demethylation)", fractionInNormal: 0.1, fractionInAltered: 0.6, description: "Active analgesic / respiratory depressant (UM surge vs PM null)" },
        { label: "Norcodeine (N-demethylation)", fractionInNormal: 0.1, fractionInAltered: 0.2, description: "CYP3A4 clearance path to inactive metabolite" },
      ],
    },
    fdaLabelSection: "Boxed Warning, Warnings and Precautions",
    citations: [
      "Crews KR, et al. Clin Pharmacol Ther. 2021;110(4):888-896.",
      "FDA Drug Safety Communication: Codeine and Tramadol restrictions in children and nursing mothers (2017).",
    ],
  },

  // 2. Tramadol / CYP2D6
  {
    id: "tramadol-cyp2d6",
    drugId: "tramadol",
    drugName: "Tramadol",
    geneId: "CYP2D6",
    geneSymbol: "CYP2D6",
    cpicLevel: "Level A",
    therapeuticArea: "Pain & Neurology",
    guidelineTitle: "CPIC Guideline for Codeine/Tramadol and CYP2D6",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-codeine-and-cyp2d6/",
    fdaBoxedWarning: true,
    phenotypeRisks: [
      {
        phenotype: "Ultrarapid Metabolizer (UM)",
        clinicalConsequence: "Heightened risk of life-threatening respiratory depression and profound sedation.",
        pharmacokineticMechanism:
          "Accelerated CYP2D6-mediated conversion of tramadol to its active M1 metabolite (O-desmethyltramadol), which exhibits ~200-fold higher mu-opioid affinity than parent tramadol.",
        cpicRecommendation:
          "Avoid tramadol due to risk of fatal opioid intoxication; select an alternative analgesic not metabolized by CYP2D6.",
        severity: "critical",
      },
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence: "Reduced analgesic efficacy and therapeutic failure.",
        pharmacokineticMechanism:
          "Diminished O-desmethyltramadol generation, leaving predominant parent tramadol with minimal mu-opioid activity (predominantly SNRI actions).",
        cpicRecommendation:
          "Avoid tramadol due to lack of efficacy; consider an alternative analgesic agent.",
        severity: "high",
      },
    ],
    molecularMechanism:
      "Tramadol is bioactivated via hepatic CYP2D6 O-demethylation to (+)-M1 (O-desmethyltramadol), which provides the primary mu-opioid analgesic effect. PMs fail to generate adequate M1; UMs generate excessive M1 rapidly.",
    fdaLabelSection: "Boxed Warning, Warnings and Precautions",
    citations: ["Crews KR, et al. Clin Pharmacol Ther. 2021;110(4):888-896."],
  },

  // 3. Tamoxifen / CYP2D6
  {
    id: "tamoxifen-cyp2d6",
    drugId: "tamoxifen",
    drugName: "Tamoxifen",
    geneId: "CYP2D6",
    geneSymbol: "CYP2D6",
    cpicLevel: "Level A",
    therapeuticArea: "Oncology",
    guidelineTitle: "CPIC Guideline for Tamoxifen and CYP2D6",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-tamoxifen-and-cyp2d6/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence:
          "Compromised breast cancer outcomes; higher recurrence rates and shorter relapse-free survival in ER+ breast cancer.",
        pharmacokineticMechanism:
          "Tamoxifen is a prodrug requiring CYP2D6 bioactivation to endoxifen (4-hydroxy-N-desmethyltamoxifen), which possesses ~100-fold higher affinity for estrogen receptors. PMs exhibit severely blunted endoxifen levels.",
        cpicRecommendation:
          "CPIC guideline recommends considering an alternative endocrine therapy such as an aromatase inhibitor (in postmenopausal women) or avoiding CYP2D6-inhibiting comedications.",
        severity: "high",
      },
      {
        phenotype: "Intermediate Metabolizer (IM)",
        clinicalConsequence: "Sub-optimal endoxifen plasma concentrations.",
        pharmacokineticMechanism: "Moderately reduced metabolic conversion to endoxifen.",
        cpicRecommendation:
          "Consideration of alternative endocrine therapies (aromatase inhibitor if postmenopausal) or avoidance of concurrent CYP2D6 inhibitors.",
        severity: "moderate",
      },
    ],
    molecularMechanism:
      "Tamoxifen undergoes multi-step hepatic biotransformation. CYP3A4 converts tamoxifen to N-desmethyltamoxifen, which is then hydroxylated by CYP2D6 to form endoxifen, the primary active metabolite responsible for anti-estrogenic anti-tumor efficacy.",
    fdaLabelSection: "Clinical Pharmacology, Drug Interactions",
    citations: ["Goetz MP, et al. Clin Pharmacol Ther. 2018;103(5):770-777."],
  },

  // 4. Amitriptyline / CYP2D6 & CYP2C19
  {
    id: "amitriptyline-cyp2d6",
    drugId: "amitriptyline",
    drugName: "Amitriptyline",
    geneId: "CYP2D6",
    geneSymbol: "CYP2D6",
    cpicLevel: "Level A",
    therapeuticArea: "Psychiatry",
    guidelineTitle: "CPIC Guideline for Tricyclic Antidepressants and CYP2D6/CYP2C19",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-tricyclic-antidepressants-and-cyp2d6-and-cyp2c19/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence:
          "Exaggerated plasma parent and metabolite exposure; elevated risk of cardiac toxicity, QTc prolongation, ventricular arrhythmias, and severe anticholinergic adverse effects.",
        pharmacokineticMechanism:
          "Severely impaired benzylic hydroxylation of amitriptyline and its active metabolite nortriptyline, resulting in pronounced clearance reduction and drug accumulation.",
        cpicRecommendation:
          "CPIC guideline consensus recommends avoiding amitriptyline or considering an alternative antidepressant not primarily cleared by CYP2D6; if used, substantial dosage reduction with therapeutic drug monitoring is advised.",
        severity: "high",
      },
      {
        phenotype: "Ultrarapid Metabolizer (UM)",
        clinicalConsequence: "Subtherapeutic plasma concentrations and failure of antidepressant therapy at standard doses.",
        pharmacokineticMechanism: "Greatly enhanced rate of CYP2D6-mediated oxidative elimination.",
        cpicRecommendation:
          "Avoid amitriptyline due to potential lack of efficacy; consider an alternative antidepressant agent.",
        severity: "moderate",
      },
    ],
    molecularMechanism:
      "Tertiary tricyclic antidepressants like amitriptyline are metabolized via CYP2C19 (N-demethylation to nortriptyline) and CYP2D6 (hydroxylation to 10-hydroxymetabolites). Impairment in CYP2D6 blocks final elimination, leading to severe cardiotoxicity.",
    fdaLabelSection: "Warnings and Precautions, Clinical Pharmacology",
    citations: ["Hicks JK, et al. Clin Pharmacol Ther. 2017;102(1):37-44."],
  },

  // 5. Nortriptyline / CYP2D6
  {
    id: "nortriptyline-cyp2d6",
    drugId: "nortriptyline",
    drugName: "Nortriptyline",
    geneId: "CYP2D6",
    geneSymbol: "CYP2D6",
    cpicLevel: "Level A",
    therapeuticArea: "Psychiatry",
    guidelineTitle: "CPIC Guideline for Tricyclic Antidepressants and CYP2D6",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-tricyclic-antidepressants-and-cyp2d6-and-cyp2c19/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence:
          "Excessive plasma concentration, cardiac conduction delays, hypotension, and anticholinergic toxicity.",
        pharmacokineticMechanism:
          "CYP2D6 is the sole primary enzyme mediating 10-hydroxylation clearance of secondary amine nortriptyline. Deficient clearance causes marked drug retention.",
        cpicRecommendation:
          "CPIC guideline recommends avoiding nortriptyline or utilizing an alternative agent; if therapy is deemed necessary, substantial dose reduction with plasma level monitoring is recommended.",
        severity: "high",
      },
      {
        phenotype: "Ultrarapid Metabolizer (UM)",
        clinicalConsequence: "Subtherapeutic drug exposure and therapy failure.",
        pharmacokineticMechanism: "Accelerated 10-hydroxylation clearance.",
        cpicRecommendation: "Avoid nortriptyline; consider an alternative antidepressant.",
        severity: "moderate",
      },
    ],
    molecularMechanism:
      "Secondary tricyclic antidepressant predominantly eliminated via CYP2D6 10-hydroxylation. Poor metabolizers exhibit prolonged elimination half-lives and narrow therapeutic window toxicity.",
    fdaLabelSection: "Warnings and Precautions, Clinical Pharmacology",
    citations: ["Hicks JK, et al. Clin Pharmacol Ther. 2017;102(1):37-44."],
  },

  // 6. Clopidogrel / CYP2C19
  {
    id: "clopidogrel-cyp2c19",
    drugId: "clopidogrel",
    drugName: "Clopidogrel",
    geneId: "CYP2C19",
    geneSymbol: "CYP2C19",
    cpicLevel: "Level A",
    therapeuticArea: "Cardiology",
    guidelineTitle: "CPIC Guideline for Clopidogrel and CYP2C19",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-clopidogrel-and-cyp2c19/",
    fdaBoxedWarning: true,
    phenotypeRisks: [
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence:
          "Impaired platelet inhibition, high on-treatment platelet reactivity, and markedly increased risk of stent thrombosis and major adverse cardiovascular events (MACE) after acute coronary syndrome (ACS) / percutaneous coronary intervention (PCI).",
        pharmacokineticMechanism:
          "Failure of sequential hepatic bioactivation into the active thiol metabolite that binds platelet P2Y12 ADP receptors.",
        cpicRecommendation:
          "CPIC Level A recommendation: Avoid clopidogrel and prescribe an alternative antiplatelet agent (e.g., prasugrel or ticagrelor) unless contraindicated.",
        severity: "critical",
      },
      {
        phenotype: "Intermediate Metabolizer (IM)",
        clinicalConsequence:
          "Diminished antiplatelet response and increased cardiovascular event rates compared to normal metabolizers.",
        pharmacokineticMechanism:
          "Substantially reduced generation of active thiol metabolite due to carriage of one loss-of-function allele (*2 or *3).",
        cpicRecommendation:
          "CPIC Level A recommendation: Prescribe an alternative P2Y12 inhibitor (prasugrel, ticagrelor) in ACS/PCI settings.",
        severity: "high",
      },
    ],
    molecularMechanism:
      "Clopidogrel is an inactive prodrug. Approximately 85% is inactivated by serum esterases. The remaining 15% requires two-step oxidation via CYP2C19, CYP1A2, and CYP2B6 to generate the active thiol metabolite R-130964, which forms an irreversible disulfide bond with P2Y12 receptors. In CYP2C19 loss-of-function carriers (*2, *3), bioactivation is compromised.",
    fluxComparison: {
      normalPhenotype: "Normal Metabolizer (NM)",
      alteredPhenotype: "Poor Metabolizer (PM)",
      nodes: [
        { label: "Serum Esterase Inactivation", fractionInNormal: 0.85, fractionInAltered: 0.95, description: "Direct hydrolysis to inactive carboxylic acid metabolite" },
        { label: "2-Step CYP Bioactivation", fractionInNormal: 0.15, fractionInAltered: 0.03, description: "Oxidation via CYP2C19 to 2-oxo-clopidogrel and active thiol metabolite" },
        { label: "Active Thiol (P2Y12 blockade)", fractionInNormal: 0.15, fractionInAltered: 0.01, description: "Active drug binding platelet receptors (drastically blunted in PM)" },
      ],
    },
    fdaLabelSection: "Boxed Warning, Clinical Pharmacology",
    citations: [
      "Lee CR, et al. Clin Pharmacol Ther. 2022;112(5):959-967.",
      "Mega JL, et al. N Engl J Med. 2009;360(4):354-362.",
    ],
  },

  // 7. Voriconazole / CYP2C19
  {
    id: "voriconazole-cyp2c19",
    drugId: "voriconazole",
    drugName: "Voriconazole",
    geneId: "CYP2C19",
    geneSymbol: "CYP2C19",
    cpicLevel: "Level A",
    therapeuticArea: "Infectious Disease",
    guidelineTitle: "CPIC Guideline for Voriconazole and CYP2C19",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-voriconazole-and-cyp2c19/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence:
          "Supratherapeutic voriconazole plasma trough concentrations (>5.5 mcg/mL) leading to elevated risk of severe neurotoxicity (visual hallucinations, confusion, encephalopathy), QTc prolongation, and hepatotoxicity.",
        pharmacokineticMechanism:
          "Markedly reduced clearance via CYP2C19-mediated N-oxidation, producing elevated AUC and extended elimination half-life.",
        cpicRecommendation:
          "CPIC guideline recommends selecting an alternative antifungal agent not dependent on CYP2C19 (e.g., isavuconazole, liposomal amphotericin B, posaconazole) or significant dose reduction with aggressive therapeutic drug monitoring.",
        severity: "high",
      },
      {
        phenotype: "Ultrarapid Metabolizer (UM)",
        clinicalConsequence:
          "Subtherapeutic voriconazole trough concentrations (<1.0-2.0 mcg/mL) resulting in therapeutic failure and breakthrough invasive fungal infection.",
        pharmacokineticMechanism: "Accelerated metabolic clearance via CYP2C19.",
        cpicRecommendation:
          "CPIC guideline recommends selecting an alternative antifungal agent (isavuconazole, liposomal amphotericin B) or close TDM if voriconazole is used.",
        severity: "high",
      },
    ],
    molecularMechanism:
      "Voriconazole is eliminated predominantly via hepatic metabolism, with CYP2C19 mediating primary N-oxidation to fluoropyrimidine N-oxide. CYP2C19 polymorphisms account for wide interindividual pharmacokinetic variability and non-linear kinetics.",
    fdaLabelSection: "Warnings and Precautions, Clinical Pharmacology",
    citations: ["Moriyama B, et al. Clin Pharmacol Ther. 2017;102(1):45-51."],
  },

  // 8. Citalopram & Escitalopram / CYP2C19
  {
    id: "citalopram-cyp2c19",
    drugId: "citalopram",
    drugName: "Citalopram",
    geneId: "CYP2C19",
    geneSymbol: "CYP2C19",
    cpicLevel: "Level A",
    therapeuticArea: "Psychiatry",
    guidelineTitle: "CPIC Guideline for SSRIs and CYP2D6/CYP2C19",
    guidelineUrl: "https://cpicpgx.org/guidelines/cpic-guideline-for-ssri-and-snri-antidepressants/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence:
          "Elevated systemic parent drug exposure and heightened risk of dose-dependent QTc prolongation, Torsades de Pointes, and adverse serotonergic events.",
        pharmacokineticMechanism:
          "Severely blunted CYP2C19 N-demethylation to desmethylcitalopram, producing elevated circulating concentrations of the parent compound.",
        cpicRecommendation:
          "CPIC consensus recommends selecting an alternative antidepressant not primarily cleared by CYP2C19, or considering a 50% dosage reduction with baseline and follow-up ECG monitoring.",
        severity: "high",
      },
      {
        phenotype: "Ultrarapid Metabolizer (UM)",
        clinicalConsequence: "Reduced drug exposure and heightened risk of clinical non-response.",
        pharmacokineticMechanism: "Accelerated clearance via enhanced CYP2C19 transcription.",
        cpicRecommendation:
          "Consider an alternative antidepressant not dependent on CYP2C19 metabolism.",
        severity: "moderate",
      },
    ],
    molecularMechanism:
      "Citalopram is metabolized primarily via CYP2C19 to desmethylcitalopram. Poor metabolizers exhibit prolonged elimination half-lives and elevated steady-state concentrations, amplifying ventricular repolarization delay (QTc prolongation).",
    fdaLabelSection: "Warnings and Precautions, Dosage and Administration",
    citations: ["Bousman CA, et al. Clin Pharmacol Ther. 2023;114(1):51-68."],
  },
  {
    id: "escitalopram-cyp2c19",
    drugId: "escitalopram",
    drugName: "Escitalopram",
    geneId: "CYP2C19",
    geneSymbol: "CYP2C19",
    cpicLevel: "Level A",
    therapeuticArea: "Psychiatry",
    guidelineTitle: "CPIC Guideline for SSRIs and CYP2D6/CYP2C19",
    guidelineUrl: "https://cpicpgx.org/guidelines/cpic-guideline-for-ssri-and-snri-antidepressants/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence:
          "Significantly increased systemic drug concentrations and risk of dose-dependent QTc prolongation.",
        pharmacokineticMechanism:
          "Impaired primary elimination via CYP2C19, leading to prolonged elimination half-life.",
        cpicRecommendation:
          "CPIC guideline recommends selecting an alternative antidepressant not dependent on CYP2C19, or considering a 50% dosage reduction.",
        severity: "high",
      },
      {
        phenotype: "Ultrarapid Metabolizer (UM)",
        clinicalConsequence: "Subtherapeutic exposure and possible lack of response.",
        pharmacokineticMechanism: "Accelerated metabolic clearance.",
        cpicRecommendation: "Consider an alternative antidepressant not cleared via CYP2C19.",
        severity: "moderate",
      },
    ],
    molecularMechanism:
      "The active S-enantiomer of citalopram relies heavily on CYP2C19 for initial N-demethylation. PMs experience significantly prolonged exposure and heightened risk of repolarization abnormalities.",
    fdaLabelSection: "Warnings and Precautions, Dosage and Administration",
    citations: ["Bousman CA, et al. Clin Pharmacol Ther. 2023;114(1):51-68."],
  },

  // 9. Warfarin / CYP2C9 & VKORC1
  {
    id: "warfarin-cyp2c9-vkorc1",
    drugId: "warfarin",
    drugName: "Warfarin",
    geneId: "CYP2C9",
    geneSymbol: "CYP2C9 / VKORC1",
    cpicLevel: "Level A",
    therapeuticArea: "Cardiology",
    guidelineTitle: "CPIC Guideline for Warfarin and CYP2C9/VKORC1",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-warfarin-and-cyp2c9-and-vkorc1/",
    fdaBoxedWarning: true,
    phenotypeRisks: [
      {
        phenotype: "CYP2C9 PM / IM (*2, *3)",
        clinicalConsequence:
          "Delayed attainment of stable anticoagulation, pronounced INR elevation, and dramatically increased risk of major bleeding complications during therapy initiation.",
        pharmacokineticMechanism:
          "Impaired 7-hydroxylation of the potent S-warfarin enantiomer (which is 3-5x more active than R-warfarin), leading to profound drug accumulation.",
        cpicRecommendation:
          "CPIC guideline recommends applying a validated pharmacogenetic dosing algorithm (e.g., WarfarinDosing.org) or initiating at a substantially reduced maintenance dose with frequent INR monitoring, or considering a direct oral anticoagulant (DOAC).",
        severity: "critical",
      },
      {
        phenotype: "VKORC1 -1639 A/A",
        clinicalConsequence:
          "Markedly heightened pharmacodynamic sensitivity to warfarin and severe bleeding risk at standard doses.",
        pharmacokineticMechanism:
          "Promoter mutation decreases target VKORC1 enzyme synthesis by ~50%, requiring significantly lower warfarin levels to inhibit clotting factor activation.",
        cpicRecommendation:
          "CPIC guideline recommends algorithm-guided initial dosing incorporating VKORC1 and CYP2C9 genotypes, or selecting a DOAC.",
        severity: "critical",
      },
    ],
    molecularMechanism:
      "Warfarin is a narrow therapeutic index vitamin K antagonist. CYP2C9 clears S-warfarin, while VKORC1 encodes the pharmacological target (vitamin K epoxide reductase). Variants in CYP2C9 (*2, *3) and VKORC1 (-1639G>A) account for up to 50% of dose variability.",
    fdaLabelSection: "Boxed Warning, Dosage and Administration, Clinical Pharmacology",
    citations: [
      "Johnson JA, et al. Clin Pharmacol Ther. 2017;102(3):397-404.",
      "Karnes JH, et al. Clin Pharmacol Ther. 2021;109(2):302-309.",
    ],
  },

  // 10. Phenytoin / CYP2C9
  {
    id: "phenytoin-cyp2c9",
    drugId: "phenytoin",
    drugName: "Phenytoin",
    geneId: "CYP2C9",
    geneSymbol: "CYP2C9",
    cpicLevel: "Level A",
    therapeuticArea: "Pain & Neurology",
    guidelineTitle: "CPIC Guideline for Phenytoin and CYP2C9",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-phenytoin-and-cyp2c9/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence:
          "Severe phenytoin toxicity including cerebellar ataxia, nystagmus, lethargy, encephalopathy, and cardiovascular collapse.",
        pharmacokineticMechanism:
          "Phenytoin undergoes non-linear, Michaelis-Menten capacity-limited parahydroxylation primarily mediated by CYP2C9 (~90%). In PMs, enzyme saturation occurs at much lower doses, producing exponential plasma accumulation.",
        cpicRecommendation:
          "CPIC guideline consensus recommends initiating maintenance therapy at a 50% dose reduction with therapeutic drug monitoring of unbound and total phenytoin, or selecting an alternative antiepileptic.",
        severity: "critical",
      },
      {
        phenotype: "Intermediate Metabolizer (IM)",
        clinicalConsequence: "Elevated serum levels and heightened risk of concentration-dependent toxicity.",
        pharmacokineticMechanism: "Moderately reduced intrinsic clearance and lower Vmax.",
        cpicRecommendation:
          "Consider approximately 25% reduction in starting maintenance dose with therapeutic drug monitoring.",
        severity: "high",
      },
    ],
    molecularMechanism:
      "Phenytoin exhibits non-linear clearance due to capacity saturation of CYP2C9-mediated 4-hydroxylation. In CYP2C9 IMs and PMs, Vmax is reduced, causing disproportionate serum level surges at standard maintenance doses.",
    fdaLabelSection: "Warnings and Precautions, Dosage and Administration",
    citations: ["Karnes JH, et al. Clin Pharmacol Ther. 2021;109(2):302-309."],
  },

  // 11. Abacavir / HLA-B*57:01
  {
    id: "abacavir-hlab5701",
    drugId: "abacavir",
    drugName: "Abacavir",
    geneId: "HLA-B5701",
    geneSymbol: "HLA-B*57:01",
    cpicLevel: "Level A",
    therapeuticArea: "Infectious Disease",
    guidelineTitle: "CPIC Guideline for Abacavir and HLA-B*57:01",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-abacavir-and-hla-b/",
    fdaBoxedWarning: true,
    phenotypeRisks: [
      {
        phenotype: "Carrier (HLA-B*57:01 Positive)",
        clinicalConsequence:
          "Severe multisystem Abacavir Hypersensitivity Reaction (HSR) with fever, maculopapular rash, gastrointestinal distress, fatigue, and respiratory distress; rechallenge is potentially fatal.",
        pharmacokineticMechanism:
          "Non-covalent binding in the F-pocket of HLA-B*57:01 antigen-binding cleft alters the repertoire of self-peptides presented to CD8+ T cells, inducing massive polyclonal cytotoxic T-cell activation.",
        cpicRecommendation:
          "CPIC Level A consensus: Abacavir is contraindicated in HLA-B*57:01-positive individuals. Pre-treatment genetic screening is mandatory prior to abacavir prescription.",
        severity: "critical",
      },
      {
        phenotype: "Non-carrier (HLA-B*57:01 Negative)",
        clinicalConsequence: "Low baseline risk of abacavir hypersensitivity reaction (<1%).",
        pharmacokineticMechanism: "Absence of the altered-peptide presentation pocket.",
        cpicRecommendation: "Standard abacavir therapy may be initiated according to approved prescribing information.",
        severity: "informational",
      },
    ],
    molecularMechanism:
      "Abacavir binds non-covalently into the F-pocket of the peptide-binding groove of the HLA-B*57:01 class I MHC molecule. This structural modification alters the shape and chemical specificity of the antigen-binding cleft, causing presentation of novel endogenous self-peptides that stimulate an intense CD8+ T-cell response with systemic cytokine release (IFN-gamma, TNF-alpha).",
    fdaLabelSection: "Boxed Warning, Contraindications, Warnings and Precautions",
    citations: [
      "Martin MA, et al. Clin Pharmacol Ther. 2014;95(5):499-500.",
      "Mallal S, et al. N Engl J Med. 2008;358(6):568-579.",
      "Illing PT, et al. Nature. 2012;486(7404):554-558.",
    ],
  },

  // 12. Carbamazepine / HLA-B*15:02 & HLA-A*31:01
  {
    id: "carbamazepine-hla",
    drugId: "carbamazepine",
    drugName: "Carbamazepine",
    geneId: "HLA-B1502",
    geneSymbol: "HLA-B*15:02 / HLA-A*31:01",
    cpicLevel: "Level A",
    therapeuticArea: "Pain & Neurology",
    guidelineTitle: "CPIC Guideline for Carbamazepine and HLA-B/HLA-A",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-carbamazepine-and-hla-b/",
    fdaBoxedWarning: true,
    phenotypeRisks: [
      {
        phenotype: "HLA-B*15:02 Carrier (Positive)",
        clinicalConsequence:
          "Catastrophic Stevens-Johnson Syndrome (SJS) and Toxic Epidermal Necrolysis (TEN) with extensive epidermal necrolysis and high mortality.",
        pharmacokineticMechanism:
          "Drug presentation in HLA-B*15:02 groove induces CD8+ T-cell and NK-cell degranulation with massive release of granulysin, triggering widespread keratinocyte apoptosis.",
        cpicRecommendation:
          "CPIC Level A: Avoid carbamazepine in patients testing positive for HLA-B*15:02; select an alternative antiepileptic agent not associated with SJS/TEN.",
        severity: "critical",
      },
      {
        phenotype: "HLA-A*31:01 Carrier (Positive)",
        clinicalConsequence:
          "Heightened risk of SJS/TEN, Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS), and severe maculopapular exanthema across diverse ethnic ancestries.",
        pharmacokineticMechanism: "MHC Class I presentation of carbamazepine induces polyclonal T-cell immune attack.",
        cpicRecommendation:
          "CPIC Level A: Avoid carbamazepine if alternative antiepileptics are clinically feasible.",
        severity: "high",
      },
    ],
    molecularMechanism:
      "Direct pharmacological interaction (p-i concept) between carbamazepine, the HLA-B*15:02 or HLA-A*31:01 antigen-binding groove, and specific T-cell receptors triggers severe cytotoxic immune-mediated epidermal detachment mediated by cytotoxic granulysin.",
    fdaLabelSection: "Boxed Warning, Warnings and Precautions",
    citations: [
      "Leckband SG, et al. Clin Pharmacol Ther. 2013;94(3):324-328.",
      "Chung WH, et al. Nature. 2004;428(6982):486.",
    ],
  },

  // 13. Oxcarbazepine / HLA-B*15:02
  {
    id: "oxcarbazepine-hlab1502",
    drugId: "oxcarbazepine",
    drugName: "Oxcarbazepine",
    geneId: "HLA-B1502",
    geneSymbol: "HLA-B*15:02",
    cpicLevel: "Level A",
    therapeuticArea: "Pain & Neurology",
    guidelineTitle: "CPIC Guideline for Oxcarbazepine and HLA-B",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-oxcarbazepine-and-hla-b/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "Carrier (HLA-B*15:02 Positive)",
        clinicalConsequence: "High risk of life-threatening Stevens-Johnson Syndrome (SJS) and Toxic Epidermal Necrolysis (TEN).",
        pharmacokineticMechanism:
          "Structural homology with carbamazepine allows oxcarbazepine to bind the HLA-B*15:02 cleft, stimulating cytotoxic T-cell-mediated granulysin release.",
        cpicRecommendation:
          "CPIC Level A recommendation: Avoid oxcarbazepine in HLA-B*15:02-positive patients; select an alternative antiepileptic.",
        severity: "critical",
      },
    ],
    molecularMechanism:
      "Oxcarbazepine shares a keto-congener structure with carbamazepine and exhibits cross-reactive hypersensitivity presentation in the HLA-B*15:02 groove, stimulating severe cutaneous adverse reactions.",
    fdaLabelSection: "Warnings and Precautions",
    citations: ["Leckband SG, et al. Clin Pharmacol Ther. 2013;94(3):324-328."],
  },

  // 14. Fluorouracil / DPYD
  {
    id: "fluorouracil-dpyd",
    drugId: "fluorouracil",
    drugName: "Fluorouracil",
    geneId: "DPYD",
    geneSymbol: "DPYD",
    cpicLevel: "Level A",
    therapeuticArea: "Oncology",
    guidelineTitle: "CPIC Guideline for Fluoropyrimidines and DPYD",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-fluoropyrimidines-and-dpyd/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence:
          "Catastrophic, potentially lethal multi-organ toxicity: grade 4-5 mucositis, profuse bloody diarrhea, neutropenic sepsis, cardiogenic shock, and neurotoxicity.",
        pharmacokineticMechanism:
          "Complete lack of DPD enzyme eliminates the primary catabolic pathway (>80% of dose), causing immense accumulation of active cytotoxic metabolites (FdUMP, FUTP).",
        cpicRecommendation:
          "CPIC Level A consensus: Avoid fluorouracil entirely in DPYD poor metabolizers; select an alternative non-fluoropyrimidine antineoplastic regimen.",
        severity: "critical",
      },
      {
        phenotype: "Intermediate Metabolizer (IM)",
        clinicalConsequence: "High risk of severe grade 3-4 treatment-limiting fluoropyrimidine toxicity.",
        pharmacokineticMechanism: "Reduced catabolic rate and delayed clearance of parent fluorouracil.",
        cpicRecommendation:
          "CPIC Level A consensus: Reduce initial dosage by at least 50% followed by careful titration based on toxicity and therapeutic monitoring, or select an alternative agent.",
        severity: "high",
      },
    ],
    molecularMechanism:
      "Dihydropyrimidine dehydrogenase (DPD) catabolizes >80% of 5-FU to inactive dihydrofluorouracil (DHFU). Deficiency blocks inactivation, shunting substrate into the anabolic pathways that generate FdUMP (thymidylate synthase inhibitor) and FUTP/FdUTP (RNA/DNA damage), causing widespread tissue necrosis.",
    fluxComparison: {
      normalPhenotype: "Normal Metabolizer (NM)",
      alteredPhenotype: "Intermediate (IM) / Poor (PM)",
      nodes: [
        { label: "DPD Hepatic Catabolism (DHFU)", fractionInNormal: 0.85, fractionInAltered: 0.1, description: "Primary inactivation pathway (severely impaired in deficiency)" },
        { label: "Renal Excretion", fractionInNormal: 0.1, fractionInAltered: 0.3, description: "Unchanged drug clearance" },
        { label: "Cytotoxic Anabolism (FdUMP/FUTP)", fractionInNormal: 0.05, fractionInAltered: 0.6, description: "Massive toxic accumulation in tissues and bone marrow" },
      ],
    },
    fdaLabelSection: "Warnings and Precautions, Clinical Pharmacology",
    citations: [
      "Amstutz U, et al. Clin Pharmacol Ther. 2018;103(2):210-216.",
      "Lunenburg CATC, et al. Clin Pharmacol Ther. 2020;108(2):208-215.",
    ],
  },

  // 15. Capecitabine / DPYD
  {
    id: "capecitabine-dpyd",
    drugId: "capecitabine",
    drugName: "Capecitabine",
    geneId: "DPYD",
    geneSymbol: "DPYD",
    cpicLevel: "Level A",
    therapeuticArea: "Oncology",
    guidelineTitle: "CPIC Guideline for Fluoropyrimidines and DPYD",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-fluoropyrimidines-and-dpyd/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "Poor Metabolizer (PM)",
        clinicalConsequence:
          "Lethal toxicity risk from accumulation of generated 5-FU: severe enteritis, pancytopenia, septic shock.",
        pharmacokineticMechanism:
          "Capecitabine is an oral fluoropyrimidine carbamate prodrug converted to 5-FU; deficient DPD prevents catabolism of generated 5-FU.",
        cpicRecommendation:
          "CPIC Level A: Avoid capecitabine in DPYD poor metabolizers; select an alternative non-fluoropyrimidine therapy.",
        severity: "critical",
      },
      {
        phenotype: "Intermediate Metabolizer (IM)",
        clinicalConsequence: "High risk of severe grade ≥3 gastrointestinal and hematologic toxicities.",
        pharmacokineticMechanism: "Delayed clearance of generated 5-FU metabolite.",
        cpicRecommendation:
          "CPIC Level A: Reduce starting dose by 50% followed by titration based on toxicity and tolerance.",
        severity: "high",
      },
    ],
    molecularMechanism:
      "Capecitabine is sequentially converted in the liver and tumor tissue by carboxylesterase, cytidine deaminase, and thymidine phosphorylase into 5-FU. Catabolism of the generated 5-FU relies on DPD; deficiency causes fatal accumulation.",
    fdaLabelSection: "Warnings and Precautions, Clinical Pharmacology",
    citations: ["Amstutz U, et al. Clin Pharmacol Ther. 2018;103(2):210-216."],
  },

  // 16. Azathioprine / TPMT & NUDT15
  {
    id: "azathioprine-tpmt-nudt15",
    drugId: "azathioprine",
    drugName: "Azathioprine",
    geneId: "TPMT",
    geneSymbol: "TPMT / NUDT15",
    cpicLevel: "Level A",
    therapeuticArea: "Rheumatology & Immunology",
    guidelineTitle: "CPIC Guideline for Thiopurines and TPMT/NUDT15",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-thiopurines-and-tpmt-nudt15/",
    fdaBoxedWarning: true,
    phenotypeRisks: [
      {
        phenotype: "TPMT or NUDT15 Poor Metabolizer (PM)",
        clinicalConsequence:
          "Catastrophic, life-threatening myelosuppression, pancytopenia, severe leukopenia, and fatal opportunistic sepsis.",
        pharmacokineticMechanism:
          "TPMT deficiency blocks S-methylation, shunting thiopurines into toxic 6-TGN nucleotides; NUDT15 deficiency prevents dephosphorylation and degradation of cytotoxic thio-dGTP, causing excessive incorporation into DNA.",
        cpicRecommendation:
          "CPIC Level A consensus: Consider alternative non-thiopurine immunosuppressants; if azathioprine is required, reduce starting dosage drastically (by ~90%, e.g., 10% of standard dose administered 3 times weekly) with close CBC monitoring.",
        severity: "critical",
      },
      {
        phenotype: "TPMT or NUDT15 Intermediate Metabolizer (IM)",
        clinicalConsequence: "Moderate-to-high risk of dose-dependent leukopenia and neutropenia.",
        pharmacokineticMechanism: "Partial impairment in thiopurine detoxification pathways.",
        cpicRecommendation:
          "CPIC Level A: Reduce initial dosage by 30-50% with weekly to biweekly CBC monitoring during dose titration.",
        severity: "high",
      },
    ],
    molecularMechanism:
      "Azathioprine is a prodrug non-enzymatically converted to 6-mercaptopurine. TPMT inactivates 6-MP to 6-MMP; NUDT15 dephosphorylates toxic thiopurine nucleotide triphosphates. Deficiencies in either enzyme cause toxic incorporation of 6-TGN into leukocyte DNA.",
    fdaLabelSection: "Boxed Warning, Warnings and Precautions, Dosage and Administration",
    citations: ["Relling MV, et al. Clin Pharmacol Ther. 2019;105(5):1095-1105."],
  },

  // 17. Mercaptopurine / TPMT & NUDT15
  {
    id: "mercaptopurine-tpmt-nudt15",
    drugId: "mercaptopurine",
    drugName: "Mercaptopurine",
    geneId: "TPMT",
    geneSymbol: "TPMT / NUDT15",
    cpicLevel: "Level A",
    therapeuticArea: "Oncology",
    guidelineTitle: "CPIC Guideline for Thiopurines and TPMT/NUDT15",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-thiopurines-and-tpmt-nudt15/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "TPMT or NUDT15 Poor Metabolizer (PM)",
        clinicalConsequence:
          "Profound myelosuppression, severe leukopenia, pancytopenia, thrombocytopenia, and death from infectious complications.",
        pharmacokineticMechanism:
          "Accumulation of active 6-TGN metabolites and failure to sanitize thio-dGTP before incorporation into leukemic and host cell genomes.",
        cpicRecommendation:
          "CPIC Level A: Drastically reduce dosage (e.g., 10% of standard maintenance dose) or consider alternative antineoplastic therapy with intensive hematologic surveillance.",
        severity: "critical",
      },
      {
        phenotype: "Intermediate Metabolizer (IM)",
        clinicalConsequence: "Elevated risk of myelosuppression at standard oncologic doses.",
        pharmacokineticMechanism: "Intermediate capacity to clear 6-MP to 6-MMP.",
        cpicRecommendation:
          "Reduce initial dosage by 30-50% and titrate based on degree of myelosuppression and ANC.",
        severity: "high",
      },
    ],
    molecularMechanism:
      "Direct substrate for TPMT inactivation and NUDT15 sanitization. Deficiencies directly elevate intraerythrocytic and bone marrow 6-TGN levels, arresting hematopoiesis.",
    fdaLabelSection: "Warnings and Precautions, Dosage and Administration",
    citations: ["Relling MV, et al. Clin Pharmacol Ther. 2019;105(5):1095-1105."],
  },

  // 18. Rasburicase / G6PD
  {
    id: "rasburicase-g6pd",
    drugId: "rasburicase",
    drugName: "Rasburicase",
    geneId: "G6PD",
    geneSymbol: "G6PD",
    cpicLevel: "Level A",
    therapeuticArea: "Oncology",
    guidelineTitle: "CPIC Guideline for Rasburicase and G6PD",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-rasburicase-and-g6pd/",
    fdaBoxedWarning: true,
    phenotypeRisks: [
      {
        phenotype: "G6PD Deficient",
        clinicalConsequence:
          "Severe intravascular hemolysis, acute hemoglobinuria, acute renal failure, methemoglobinemia, and potential death.",
        pharmacokineticMechanism:
          "Rasburicase converts uric acid to allantoin, generating hydrogen peroxide (H2O2) as an equimolar byproduct. G6PD-deficient erythrocytes cannot produce sufficient NADPH to regenerate reduced glutathione, resulting in uninhibited oxidative RBC lysis.",
        cpicRecommendation:
          "CPIC Level A: Rasburicase is strictly contraindicated in G6PD-deficient patients. Pre-treatment screening is mandatory prior to administration.",
        severity: "critical",
      },
    ],
    molecularMechanism:
      "Recombinant urate oxidase enzyme generating high localized fluxes of hydrogen peroxide. In normal red blood cells, glutathione peroxidase utilizes GSH (regenerated via NADPH from G6PD) to detoxify H2O2. In G6PD deficiency, hydrogen peroxide precipitates hemoglobin (Heinz bodies) and induces acute hemolysis.",
    fdaLabelSection: "Boxed Warning, Contraindications",
    citations: [
      "Relling MV, et al. Clin Pharmacol Ther. 2014;96(2):169-174.",
      "Gammal RS, et al. Clin Pharmacol Ther. 2023;113(4):773-785.",
    ],
  },

  // 19. Primaquine / G6PD
  {
    id: "primaquine-g6pd",
    drugId: "primaquine",
    drugName: "Primaquine",
    geneId: "G6PD",
    geneSymbol: "G6PD",
    cpicLevel: "Level A",
    therapeuticArea: "Infectious Disease",
    guidelineTitle: "CPIC Guideline for Primaquine and G6PD",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-primaquine-and-g6pd/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "G6PD Deficient",
        clinicalConsequence:
          "Acute hemolytic anemia, dark urine (hemoglobinuria), acute drop in hematocrit, and nephrotoxicity.",
        pharmacokineticMechanism:
          "Active 8-aminoquinoline quinone metabolites generate severe intraerythrocytic oxidative stress, exhausting limited GSH stores in deficient red cells.",
        cpicRecommendation:
          "CPIC Level A: Screen G6PD activity prior to therapy; contraindicated in severe deficiency. In mild-to-moderate variants, use specialized intermittent dosing regimens under close clinical and hematologic monitoring.",
        severity: "critical",
      },
    ],
    molecularMechanism:
      "Primaquine metabolites undergo cyclic oxidation-reduction reactions, producing reactive oxygen species that cross-link spectrin and oxidize hemoglobin sulfhydryls in G6PD-deficient red cells.",
    fdaLabelSection: "Warnings and Precautions, Contraindications",
    citations: ["Gammal RS, et al. Clin Pharmacol Ther. 2023;113(4):773-785."],
  },

  // 20. Dapsone / G6PD
  {
    id: "dapsone-g6pd",
    drugId: "dapsone",
    drugName: "Dapsone",
    geneId: "G6PD",
    geneSymbol: "G6PD",
    cpicLevel: "Level B",
    therapeuticArea: "Infectious Disease",
    guidelineTitle: "CPIC Guideline for Dapsone and G6PD",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-dapsone-and-g6pd/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "G6PD Deficient",
        clinicalConsequence: "Dose-dependent acute hemolytic crisis and symptomatic methemoglobinemia.",
        pharmacokineticMechanism:
          "Dapsone hydroxylamine metabolites generate intracellular free radicals that overwhelm low GSH levels.",
        cpicRecommendation:
          "CPIC Level B: Exercise caution and obtain baseline G6PD screening; consider alternative antimicrobial agents in confirmed deficiency.",
        severity: "high",
      },
    ],
    molecularMechanism:
      "Dapsone is converted by CYP2C19/CYP3A4 into dapsone hydroxylamine, which enters red cells and cycles with oxyhemoglobin to generate methemoglobin and reactive oxygen species.",
    fdaLabelSection: "Warnings and Precautions",
    citations: ["Gammal RS, et al. Clin Pharmacol Ther. 2023;113(4):773-785."],
  },

  // 21. Nitrofurantoin / G6PD
  {
    id: "nitrofurantoin-g6pd",
    drugId: "nitrofurantoin",
    drugName: "Nitrofurantoin",
    geneId: "G6PD",
    geneSymbol: "G6PD",
    cpicLevel: "Level B",
    therapeuticArea: "Infectious Disease",
    guidelineTitle: "CPIC Guideline for Nitrofurantoin and G6PD",
    guidelineUrl: "https://cpicpgx.org/guidelines/guideline-for-nitrofurantoin-and-g6pd/",
    fdaBoxedWarning: false,
    phenotypeRisks: [
      {
        phenotype: "G6PD Deficient",
        clinicalConsequence: "Acute hemolytic anemia and Heinz body formation.",
        pharmacokineticMechanism:
          "Redox cycling of the nitrofuran group generates superoxide anions that deplete reduced glutathione in deficient erythrocytes.",
        cpicRecommendation:
          "CPIC Level B: Avoid in patients with confirmed G6PD deficiency; contraindicated in pregnant patients at term and neonates.",
        severity: "moderate",
      },
    ],
    molecularMechanism:
      "Nitrofuran reduction by intracellular reductases generates free radical intermediates that oxidatively damage erythrocyte membranes and hemoglobin.",
    fdaLabelSection: "Contraindications, Warnings and Precautions",
    citations: ["Gammal RS, et al. Clin Pharmacol Ther. 2023;113(4):773-785."],
  },
];

/**
 * HELPER FUNCTIONS
 */

export function getAllPharmacogenes(): readonly Pharmacogene[] {
  return PHARMACOGENES;
}

export function getGeneById(id: string): Pharmacogene | null {
  const norm = id.trim().toUpperCase().replace(/[^A-Z0-9*:]/g, "");
  return (
    PHARMACOGENES.find((g) => {
      const gNorm = g.id.toUpperCase().replace(/[^A-Z0-9*:]/g, "");
      const sNorm = g.symbol.toUpperCase().replace(/[^A-Z0-9*:]/g, "");
      return gNorm === norm || sNorm === norm;
    }) ?? null
  );
}

export function getAllPgxInteractions(): readonly PgxInteraction[] {
  return PGX_INTERACTIONS;
}

export function getInteractionsForGene(geneId: string): PgxInteraction[] {
  const norm = geneId.trim().toUpperCase().replace(/[^A-Z0-9*:]/g, "");
  return PGX_INTERACTIONS.filter((ix) => {
    const gNorm = ix.geneId.toUpperCase().replace(/[^A-Z0-9*:]/g, "");
    const sNorm = ix.geneSymbol.toUpperCase().replace(/[^A-Z0-9*:]/g, "");
    return gNorm.includes(norm) || sNorm.includes(norm);
  });
}

export function getInteractionsForDrug(drugId: string): PgxInteraction[] {
  const norm = drugId.trim().toLowerCase();
  if (!norm) return [];
  return PGX_INTERACTIONS.filter((ix) => ix.drugId.toLowerCase() === norm);
}

export function getTherapeuticAreas(): TherapeuticArea[] {
  return [
    "Oncology",
    "Cardiology",
    "Psychiatry",
    "Infectious Disease",
    "Pain & Neurology",
    "Rheumatology & Immunology",
  ];
}

export function getInteractionsByTherapeuticArea(area: TherapeuticArea): PgxInteraction[] {
  return PGX_INTERACTIONS.filter((ix) => ix.therapeuticArea === area);
}

/**
 * Detects pharmacogenomic risks on the active desk tray
 */
export function detectPgxRisksOnTray(drugIds: string[]): DetectedPgxRisk[] {
  if (!drugIds || drugIds.length === 0) return [];

  const detected: DetectedPgxRisk[] = [];
  const normalizedIds = new Set(drugIds.map((id) => id.trim().toLowerCase()));

  for (const drugId of normalizedIds) {
    const interactions = getInteractionsForDrug(drugId);
    for (const ix of interactions) {
      // Pick highest severity phenotype risk as headline
      const topRisk =
        ix.phenotypeRisks.find((r) => r.severity === "critical") ??
        ix.phenotypeRisks.find((r) => r.severity === "high") ??
        ix.phenotypeRisks[0];

      const severity = topRisk?.severity ?? "high";
      const headline = `${ix.drugName} × ${ix.geneSymbol}: ${topRisk?.phenotype ?? "Genotype Variant"} Risk`;
      const mechanisticSummary = topRisk?.pharmacokineticMechanism ?? ix.molecularMechanism;
      const consensusGuideline = topRisk?.cpicRecommendation ?? "Consult CPIC guideline for genotype-specific prescribing recommendations.";

      detected.push({
        id: `${ix.id}-${drugId}`,
        drugId: ix.drugId,
        drugName: ix.drugName,
        geneId: ix.geneId,
        geneSymbol: ix.geneSymbol,
        cpicLevel: ix.cpicLevel,
        therapeuticArea: ix.therapeuticArea,
        severity,
        headline,
        mechanisticSummary,
        consensusGuideline,
        interaction: ix,
      });
    }
  }

  // Sort: critical first, then high, moderate, informational
  const severityRank: Record<string, number> = {
    critical: 0,
    high: 1,
    moderate: 2,
    informational: 3,
  };

  return detected.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
