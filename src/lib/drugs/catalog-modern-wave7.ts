/**
 * Formulary wave 7 — clinical nootropics, racetams, research peptides, and
 * bioactive botanical / amino-acid / nucleotide / OTC-mineral supplements.
 *
 * Synthesized from European SmPCs (piracetam/aniracetam/oxiracetam), published
 * clinical pharmacology reviews, FDA safety communications, and mechanism-first
 * PK/PD profiling. Empty enzyme lists mean no established human CYP grade here,
 * not "safe."
 * Educational desk only. Not a dose. Not FDA-cleared. Official PI governs.
 */

import type {
  Drug,
  Enzyme,
  EnzymeRole,
  ItemKind,
  PdFlag,
  Strength,
  SubstrateSensitivity,
} from "./types";

function sub(
  enzyme: Enzyme,
  sensitivity: SubstrateSensitivity,
  pathway: "clearance" | "activation" = "clearance",
  nti = false,
): EnzymeRole {
  return { enzyme, kind: "substrate", sensitivity, pathway, nti };
}

function inh(enzyme: Enzyme, strength: Strength): EnzymeRole {
  return { enzyme, kind: "inhibitor", strength };
}

function ind(enzyme: Enzyme, strength: Strength): EnzymeRole {
  return { enzyme, kind: "inducer", strength };
}

function d(
  id: string,
  name: string,
  cls: string,
  kind: ItemKind,
  aliases: string[],
  enzymes: EnzymeRole[],
  pd: PdFlag[],
  toxicityHint: string,
  note: string,
): Drug {
  return {
    id,
    name,
    brands: [],
    cls,
    aliases,
    enzymes,
    pd,
    toxicityHint,
    note,
    kind,
  };
}

/** Seventh modern wave — 20 nootropic, racetam, peptide, and bioactive supplement monographs, merged after MODERN_WAVE6_FORMULARY. */
export const MODERN_WAVE7_FORMULARY: Drug[] = [
  // —— Racetam nootropics (6) —————————————————————————————————————
  d(
    "aniracetam",
    "Aniracetam",
    "Racetam nootropic",
    "herb",
    ["draganon", "sarpul", "ampamet"],
    [],
    ["antiplatelet"],
    "Racetam-class antiplatelet bleeding caution with warfarin or antiplatelets; rapid hepatic first-pass cleavage to N-anisoyl-GABA",
    "Lipid-soluble AMPA-kine racetam that undergoes extensive presystemic hepatic first-pass cleavage into N-anisoyl-GABA, 2-pyrrolidinone, and p-anisic acid, leaving a very short parent half-life with active metabolite persistence. No established human CYP450 perpetrator grade, though additive cholinergic and glutamatergic signaling can occur when paired with choline donors (alpha-GPC, citicoline). Carries the racetam-class antiplatelet and bleeding caution alongside warfarin, DOACs, or antiplatelet agents. Educational desk only. Not a dose.",
  ),
  d(
    "oxiracetam",
    "Oxiracetam",
    "Racetam nootropic",
    "herb",
    ["neuromet", "isf-2522", "isf 2522"],
    [],
    ["stimulant"],
    "Predominantly unchanged renal excretion (accumulates in severe renal impairment); additive CNS stimulation with psychostimulants",
    "Water-soluble hydroxy-racetam excreted largely unchanged via the kidneys with minimal hepatic or CYP450 involvement. Accumulation risk rises sharply in moderate-to-severe renal impairment. Monitor for additive CNS stimulation, restlessness, insomnia, or sympathomimetic overlap when stacked with psychostimulants or high caffeine intake. Educational desk only. Not a dose.",
  ),
  d(
    "pramiracetam",
    "Pramiracetam",
    "Racetam nootropic",
    "herb",
    ["pramistar", "ci-879", "ci 879"],
    [],
    ["antiplatelet"],
    "Racetam-class antiplatelet bleeding caution; high-lipophilicity HACU enhancer with potential cholinergic headache",
    "Highly lipophilic racetam that enhances high-affinity choline uptake (HACU) in hippocampal nerve terminals. Undergoes hepatic metabolism without graded human CYP450 DDI characterization; unbuffered cholinergic demand is frequently associated with tension-type headache, and the racetam class carries a bleeding caution when combined with anticoagulants or antiplatelets. Educational desk only. Not a dose.",
  ),
  d(
    "fasoracetam",
    "Fasoracetam",
    "Racetam nootropic",
    "herb",
    ["ns-105", "ns105", "lam-105", "lam105"],
    [],
    [],
    "Investigational mGluR modulator with preclinical GABA-B upregulation; caution with GABA-B agonists and abrupt cessation",
    "Investigational metabotropic glutamate receptor (mGluR) modulator with preclinical GABA-B receptor upregulation and predominantly unchanged renal elimination (no graded human CYP450 profile). Exercise caution when combining with GABA-B agonists (baclofen, phenibut, GHB/sodium oxybate) due to unpredictable sedative or rebound excitatory shifts, and avoid abrupt cessation after sustained exposure. Educational desk only. Not a dose.",
  ),
  d(
    "coluracetam",
    "Coluracetam",
    "Racetam nootropic",
    "herb",
    ["bci-540", "bci540", "mkc-231", "mkc231"],
    [],
    [],
    "Investigational high-affinity choline uptake (HACU) enhancer; sparse human CYP data; avoid stacking blindly with AChE inhibitors",
    "Investigational racetam-scaffold high-affinity choline uptake (HACU) enhancer with sparse human CYP450 characterization and no formal clinical DDI labeling. Avoid stacking blindly with acetylcholinesterase inhibitors (donepezil, galantamine, rivastigmine, huperzine A) because combined presynaptic choline uptake and reduced synaptic breakdown can provoke peripheral and central cholinergic excess (nausea, diaphoresis, cramping, bradycardia). Educational desk only. Not a dose.",
  ),
  d(
    "nefiracetam",
    "Nefiracetam",
    "Racetam nootropic",
    "herb",
    ["dm-9384", "dm9384", "translon"],
    [sub("CYP3A4", "minor")],
    [],
    "Lipophilic racetam (CYP3A4 minor substrate); preclinical renal and testicular toxicity halted commercial development",
    "Lipophilic racetam acting across GABA-A, nicotinic acetylcholine, and L-type voltage-gated calcium channels. Metabolized hepatically in part via CYP3A4 (minor substrate) to active hydroxylated metabolites. Commercial development was halted following preclinical renal papillary and testicular toxicity findings; lacks FDA approval and standardized human DDI guidance. Educational desk only. Not a dose.",
  ),

  // —— Actoprotectors & wake-promoting analogues (2) ————————————————
  d(
    "bromantane",
    "Bromantane",
    "Actoprotector / dopaminergic nootropic",
    "herb",
    ["ladasten", "n-(2-adamantyl)-n-(4-bromophenyl)amine"],
    [sub("CYP3A4", "minor")],
    ["stimulant"],
    "Additive dopaminergic and pressor stimulation with psychostimulants or MAOIs; lipophilic hepatic oxidation (CYP3A4 minor substrate)",
    "Adamantane derivative that upregulates tyrosine hydroxylase and aromatic L-amino acid decarboxylase expression, supporting catecholamine synthesis without classic amphetamine-like monoamine release. Undergoes lipophilic hepatic oxidation (CYP3A4 minor substrate) and produces additive dopaminergic and pressor activation alongside psychostimulants or MAOIs. Lacks FDA approval and appears on WADA anti-doping prohibited lists. Educational desk only. Not a dose.",
  ),
  d(
    "flmodafinil",
    "Flmodafinil (CRL-40,940)",
    "Wake-promoting agent",
    "herb",
    ["flmodafinil", "crl-40,940", "crl-40940", "lauflumide", "bisfluoromodafinil"],
    [sub("CYP3A4", "minor"), ind("CYP3A4", "moderate"), inh("CYP2C19", "moderate")],
    ["stimulant"],
    "Unapproved bis-fluoro modafinil analogue; expected CYP3A4 induction (contraceptive/DOAC/immunosuppressant loss) and CYP2C19 inhibition",
    "Bis-fluoro structural analogue of modafinil lacking formal FDA approval and human clinical drug-interaction studies. Carries expected class-level CYP3A4 induction (risking reduced exposure of hormonal contraceptives, direct oral anticoagulants, and transplant immunosuppressants), CYP2C19 inhibition (raising exposure of CYP2C19 substrates), minor CYP3A4 substrate clearance, and additive sympathomimetic stimulation with other wake-promoting or stimulant agents. Educational desk only. Not a dose.",
  ),

  // —— Research peptides (2) ———————————————————————————————————————
  d(
    "cerebrolysin",
    "Cerebrolysin",
    "Research peptide (porcine neurotrophic peptides)",
    "research-peptide",
    ["fpv-1", "cerebrolysin-peptide", "cerebrolysin peptide"],
    [],
    ["serotonergic", "seizure-lowering"],
    "Parenteral porcine neurotrophic peptide mixture; proteolytic clearance (no CYP); MAOI/serotonergic excitation, hypersensitivity, and seizure-threshold caution",
    "Parenteral porcine brain-derived neurotrophic peptide mixture degraded via endogenous proteolysis with no CYP450 clearance. Not approved by the U.S. FDA. Regional prescribing references caution against additive serotonergic or excitatory reactions when combined with MAOIs or antidepressants, note anaphylactoid hypersensitivity risk from porcine tissue components, and flag seizure-threshold lowering in epilepsy. No CYP grade is not evidence of safety. Educational desk only. Not a dose.",
  ),
  d(
    "dihexa",
    "Dihexa",
    "Research peptide (angiotensin IV analogue)",
    "research-peptide",
    ["pnb-0408", "pnb0408", "n-hexanoic-tyr-ile-6-aminohexanoic-amide"],
    [],
    [],
    "Unapproved experimental HGF/c-Met potentiator; zero completed human PK or carcinogenicity trials; theoretical mitogenic/angiogenic risk",
    "Unapproved experimental hepatocyte growth factor (HGF) / c-Met receptor potentiator derived from angiotensin IV. Zero completed human pharmacokinetic, clinical safety, or carcinogenicity trials exist, leaving peptidase and hepatic clearance unmapped and raising theoretical mitogenic and angiogenic concern in occult or active neoplasia. No CYP or pharmacodynamic interaction grade is assigned here; no mapped finding is not evidence of safety. Educational desk only. Not a dose.",
  ),

  // —— Botanicals & phytochemicals (3) —————————————————————————————
  d(
    "sulforaphane",
    "Sulforaphane",
    "Isothiocyanate (Nrf2 / Phase II inducer)",
    "herb",
    ["broccoli sprout extract", "glucoraphanin", "sfn"],
    [ind("CYP1A2", "weak"), inh("CYP3A4", "weak")],
    [],
    "Nrf2/ARE Phase II (UGT, GST, NQO1) inducer with modest CYP1A2 induction and mild in vitro CYP3A4 inhibition",
    "Cruciferous isothiocyanate activating the Keap1-Nrf2-ARE pathway to induce Phase II conjugating enzymes (UGT, GST, NQO1) while modestly inducing CYP1A2 and mildly inhibiting CYP3A4 in vitro. Concentrated broccoli sprout extracts can subtly shift clearance of narrow-therapeutic-index CYP1A2 or UGT substrates (such as clozapine, theophylline, or lamotrigine), whereas routine culinary intake is milder. Educational desk only. Not a dose.",
  ),
  d(
    "cordyceps",
    "Cordyceps (Cordyceps militaris / sinensis)",
    "Medicinal mushroom / adenosine analogue",
    "herb",
    ["cordyceps", "cordyceps militaris", "cordyceps sinensis", "cordycepin"],
    [],
    ["antiplatelet", "hypoglycemic"],
    "Mild antiplatelet bleeding caution and additive hypoglycemic signaling; theoretical immunosuppressant overlap",
    "Medicinal fungal extract containing cordycepin (3'-deoxyadenosine) and bioactive polysaccharides with no established human CYP450 grade. Exhibits mild antiplatelet activity (bleeding caution alongside anticoagulants or antiplatelets), additive glucose-lowering signaling with insulin or sulfonylureas, and theoretical immunostimulatory antagonism with transplant or autoimmune immunosuppressants. Educational desk only. Not a dose.",
  ),
  d(
    "tongkat-ali",
    "Tongkat Ali (Eurycoma longifolia)",
    "Botanical adaptogen (quassinoid)",
    "herb",
    ["tongkat ali", "eurycoma longifolia", "longjack", "pasak bumi"],
    [inh("CYP2C9", "weak"), inh("CYP2D6", "weak")],
    [],
    "Mild CYP2C9/CYP2D6 inhibition in vitro; reported propranolol absorption reduction; supplement heavy-metal quality variance",
    "Southeast Asian root extract standardized to quassinoids including eurycomanone. Preclinical microsomal studies report mild inhibition of CYP1A2, CYP2C9, and CYP2D6 (graded weak on CYP2C9 and CYP2D6 here), and a human crossover study documented reduced oral propranolol absorption when co-administered. Monitor for hepatic injury signals, glycemic overlap, and heavy-metal or undeclared-adulterant variance in unverified commercial supplements. Educational desk only. Not a dose.",
  ),

  // —— Amino acids, mitochondrial donors, nucleotides & OTC minerals (7) —
  d(
    "agmatine",
    "Agmatine sulfate",
    "Decarboxylated arginine / imidazoline ligand",
    "herb",
    ["agmatine", "decarboxylated arginine"],
    [],
    ["cns-depressant"],
    "Potentiates opioid analgesia/sedation and clonidine-like hypotension; avoid unmonitored CNS-depressant or antihypertensive stacking",
    "Endogenous decarboxylated arginine polyamine interacting with imidazoline I1/I2, alpha-2-adrenergic, and NMDA receptors while inhibiting nitric oxide synthase (NOS), with no graded CYP450 role. Can potentiate opioid analgesia and sedation as well as alpha-2-mediated hypotension; avoid combining blindly with opioids, CNS depressants, alcohol, or centrally acting antihypertensives such as clonidine. Educational desk only. Not a dose.",
  ),
  d(
    "taurine",
    "Taurine",
    "Sulfonic amino acid",
    "herb",
    ["2-aminoethanesulfonic acid"],
    [],
    [],
    "No CYP450 clearance; modest blood-pressure lowering and mild GABA-A/glycine sedative modulation at high supplemental loads",
    "Conditionally essential osmoregulatory sulfonic amino acid modulating GABA-A and glycine receptors along with cellular calcium homeostasis, cleared renally without CYP450 metabolism. Can modestly lower blood pressure alongside antihypertensives, mildly attenuate caffeine-induced jitteriness, and subtly potentiate sedatives at heavy supplemental intake. Educational desk only. Not a dose.",
  ),
  d(
    "glycine",
    "Glycine",
    "Inhibitory amino acid / NMDA co-agonist",
    "herb",
    ["l-glycine", "aminoacetic acid"],
    [],
    [],
    "Non-CYP metabolic conjugation; published clinical reports note high supplemental glycine can attenuate clozapine response",
    "Spinal and brainstem inhibitory neurotransmitter and obligate NMDA receptor co-agonist cleared via endogenous metabolic conjugation rather than CYP450 enzymes. Notable clinical pharmacodynamic interaction: although studied adjunctively with conventional antipsychotics, high supplemental glycine has attenuated clinical response to clozapine in published clinical reports; coordinate with prescribers before pairing with clozapine. Educational desk only. Not a dose.",
  ),
  d(
    "alcar",
    "Acetyl-L-Carnitine (ALCAR)",
    "Mitochondrial acyl-carrier / cholinergic donor",
    "herb",
    ["acetyl-l-carnitine", "acetylcarnitine", "alc", "alcar"],
    [],
    ["antiplatelet"],
    "Documented warfarin INR potentiation (bleeding risk) and peripheral thyroid hormone antagonism (levothyroxine caution)",
    "Acetylated L-carnitine ester that crosses the blood-brain barrier to support mitochondrial beta-oxidation and acetylcholine synthesis, cleared via tissue esterases and renal excretion without CYP450 involvement. Documented clinical interactions include warfarin and acenocoumarol INR potentiation (bleeding caution) and peripheral antagonism of thyroid hormone cellular entry (caution alongside levothyroxine or liothyronine). Educational desk only. Not a dose.",
  ),
  d(
    "uridine-monophosphate",
    "Uridine Monophosphate (UMP)",
    "Pyrimidine nucleotide / phospholipid precursor",
    "herb",
    ["uridine", "ump", "triacetyluridine", "tau", "uridine monophosphate"],
    [],
    [],
    "Non-CYP pyrimidine salvage metabolism; caution with folate/fluoropyrimidine antagonists or hyperuricemia",
    "Kennedy-pathway pyrimidine nucleotide substrate supporting phosphatidylcholine membrane synthesis and striatal dopaminergic tone, metabolized via endogenous pyrimidine salvage with no CYP450 role. Exercise caution when stacked with folate-pathway or fluoropyrimidine antagonists (such as methotrexate or 5-fluorouracil) or in hyperuricemia and gout-prone conditions. Educational desk only. Not a dose.",
  ),
  d(
    "lithium-orotate",
    "Lithium Orotate",
    "Over-the-counter lithium salt",
    "herb",
    ["otc lithium", "lithium orotate supplement"],
    [],
    ["serotonergic"],
    "Unregulated OTC elemental lithium salt; NSAIDs, ACEi/ARBs, and thiazides cut renal clearance; duplicate exposure with Rx lithium",
    "Unregulated over-the-counter elemental lithium salt lacking FDA approval. Dissociated lithium ions share identical proximal renal tubular reabsorption with prescription lithium carbonate: NSAIDs, ACE inhibitors, ARBs, and thiazide diuretics reduce renal lithium clearance and risk cumulative toxicity. Stacking with prescription lithium causes duplicate elemental lithium exposure, and pairing with SSRIs, SNRIs, or MAOIs adds serotonergic load. Educational desk only. Not a dose.",
  ),
  d(
    "l-tryptophan",
    "L-Tryptophan",
    "Essential amino acid / serotonin precursor",
    "herb",
    ["tryptophan", "l-trp"],
    [],
    ["serotonergic", "tryptophan"],
    "High-risk serotonergic synergy with MAOIs, SSRIs, SNRIs, linezolid, and tramadol (serotonin syndrome)",
    "Essential dietary amino acid serving as the direct precursor to 5-HTP and serotonin via rate-limiting tryptophan hydroxylase, cleared via non-CYP kynurenine and serotonin pathways. Carries high-risk serotonergic synergy (serotonin syndrome) when combined with MAOIs, linezolid, methylene blue, SSRIs, SNRIs, tramadol, or MDMA. Educational desk only. Not a dose.",
  ),
];
