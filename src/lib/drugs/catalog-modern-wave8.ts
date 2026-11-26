/**
 * Formulary wave 8 — bioactive nootropics, senolytics, NAD+ precursors,
 * endocannabinoid-like lipid mediators, botanicals, and research peptides.
 *
 * Synthesized from published human clinical pharmacology studies, European/US
 * regulatory safety communications, and mechanism-first PK/PD profiling.
 * Empty enzyme lists mean no established human CYP grade here, not "safe."
 * Educational desk only. Not a dose. Not FDA-cleared. Official PI governs.
 */

import type {
  Drug,
  Enzyme,
  EnzymeRole,
  ItemKind,
  PdFlag,
  Strength,
} from "./types";

function inh(enzyme: Enzyme, strength: Strength): EnzymeRole {
  return { enzyme, kind: "inhibitor", strength };
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

/** Eighth modern wave — 12 bioactive nootropic, longevity, botanical, and research-peptide monographs, merged after MODERN_WAVE7_FORMULARY. */
export const MODERN_WAVE8_FORMULARY: Drug[] = [
  d(
    "pterostilbene",
    "Pterostilbene",
    "Stilbenoid supplement",
    "herb",
    ["trans-pterostilbene", "dimethylresveratrol", "pTeroPure"],
    [inh("CYP2C8", "weak")],
    ["antiplatelet"],
    "Weak CYP2C8 inhibitor; antiplatelet bleeding caution with warfarin/DOACs; monitor LDL cholesterol",
    "Dimethoxylated resveratrol analog with higher oral bioavailability than resveratrol due to slower first-pass glucuronidation and sulfation. Demonstrates weak CYP2C8 inhibition in vitro and carries stilbenoid antiplatelet bleeding caution alongside warfarin, DOACs, or antiplatelets; human randomized trials also reported modest LDL-cholesterol increases when taken without grape-seed extract. Educational desk only. Not a dose.",
  ),
  d(
    "pqq",
    "PQQ (pyrroloquinoline quinone)",
    "Redox cofactor supplement",
    "herb",
    ["pyrroloquinoline quinone", "methoxatin", "biopqq"],
    [],
    [],
    "No established human CYP450 grade; monitor for mild alertness or insomnia when stacked late with stimulants",
    "Water-soluble quinone redox cofactor studied for mitochondrial biogenesis (PGC-1alpha signaling) and antioxidant cycling. No established human CYP450 perpetrator or victim grade on this shelf; an empty interaction list does not establish safety with narrow-index prescriptions. Educational desk only. Not a dose.",
  ),
  d(
    "nicotinamide-riboside",
    "Nicotinamide riboside",
    "NAD+ precursor (vitamin B3)",
    "herb",
    ["niagen", "tru niagen", "nicotinamide riboside chloride", "nr supplement"],
    [],
    [],
    "No established human CYP450 grade; monitor transaminases if stacked with high-exposure niacin or hepatotoxic regimens",
    "Vitamin B3 nucleoside precursor converted via nicotinamide riboside kinases (NRK1/NRK2) into NMN and cellular NAD+, avoiding the GPR109A flushing typical of nicotinic acid. No graded human CYP450 drug-interaction profile on this shelf; review liver enzymes when combined with hepatotoxic medications. Educational desk only. Not a dose.",
  ),
  d(
    "polygala-tenuifolia",
    "Polygala tenuifolia",
    "Botanical monoamine modulator",
    "herb",
    ["yuan zhi", "tenuifolin", "chinese senega", "polygala extract"],
    [],
    ["serotonergic"],
    "Serotonergic / triple monoamine reuptake and MAO-B modulation caution with SSRIs, SNRIs, MAOIs, or linezolid",
    "Traditional root extract containing tenuifolin, 3,6'-disinapoyl sucrose, and xanthones with preclinical triple monoamine reuptake inhibition and mild MAO-B modulation. Flagged as serotonergic to surface additive serotonin-toxicity caution alongside SSRIs, SNRIs, tricyclics, tramadol, linezolid, or prescription MAOIs. Human CYP450 clinical DDI data remain sparse. Educational desk only. Not a dose.",
  ),
  d(
    "sabroxy",
    "Sabroxy (Oroxylum indicum)",
    "Botanical dopamine modulator",
    "herb",
    ["oroxylin a", "oroxylin-a", "oroxylum indicum", "indian trumpet flower"],
    [],
    ["stimulant"],
    "Dopamine reuptake inhibition & GABA-A negative allosteric modulation; additive stimulation or lowered seizure threshold caution",
    "Standardized Oroxylum indicum bark extract enriched in the flavone oroxylin A, which exhibits dopamine reuptake inhibition and negative allosteric modulation at the benzodiazepine site of GABA-A receptors in preclinical models. Monitor for additive sympathomimetic stimulation, anxiety, insomnia, or antagonism of benzodiazepine sedation when combined with CNS stimulants or sedatives. Educational desk only. Not a dose.",
  ),
  d(
    "thymosin-beta-4",
    "Thymosin beta-4 (TB-500)",
    "Research peptide (actin-binding)",
    "research-peptide",
    ["tb-500", "tb500", "timbetasin", "t-beta-4"],
    [],
    [],
    "Unapproved research peptide; compounding immunogenicity, impurity, and theoretical angiogenic/oncologic safety cautions",
    "43-amino-acid actin-sequestering peptide (and its synthetic LKKTETQ active fragment marketed online as TB-500) that is not FDA-approved for human systemic therapy. Carries peptide-impurity, immunogenicity, and theoretical pro-angiogenic safety concerns in patients with active or recent malignancy. No human CYP450 or pharmacodynamic interaction grade is assigned here; absence of mapped findings is not evidence of safety. Educational desk only. Not a dose.",
  ),
  d(
    "blue-lotus",
    "Blue lotus (Nymphaea caerulea)",
    "Botanical sedative / alkaloid",
    "herb",
    ["nymphaea caerulea", "nuciferine", "egyptian blue lily", "blue water lily"],
    [],
    ["cns-depressant"],
    "Additive CNS sedation with opioids/benzodiazepines; commercial vape/resin products are frequently adulterated with synthetic cannabinoids",
    "Aquatic botanical containing aporphine alkaloids (apomorphine and nuciferine) with mixed dopamine and serotonin receptor activity producing sedative and mild psychoactive effects. Carries additive CNS-depressant caution alongside opioids, benzodiazepines, or alcohol; forensic surveillance has repeatedly documented synthetic cannabinoid adulteration in commercial blue-lotus e-liquids and gummies. Educational desk only. Not a dose.",
  ),
  d(
    "magnesium-l-threonate",
    "Magnesium L-threonate",
    "Divalent cation / CNS magnesium chelate",
    "herb",
    ["magtein", "magnesium threonate", "l-threonate"],
    [],
    [],
    "Divalent Mg2+ cation chelates oral fluoroquinolones, tetracyclines, levothyroxine, bisphosphonates, and HIV integrase inhibitors",
    "Chelated magnesium salt formulated for enhanced cerebrospinal fluid magnesium delivery. Retains classic divalent-cation gut chelation liability: separate administration from oral fluoroquinolones, tetracyclines, levothyroxine, oral bisphosphonates, and integrase strand transfer inhibitors (dolutegravir, bictegravir) per Prescribing Information, and monitor magnesium accumulation in severe CKD. Educational desk only. Not a dose.",
  ),
  d(
    "palmitoylethanolamide",
    "Palmitoylethanolamide (PEA)",
    "Endocannabinoid-like lipid amide",
    "herb",
    ["pea supplement", "normast", "pelvilen", "palmidrol"],
    [],
    [],
    "Endogenous PPAR-alpha lipid mediator hydrolyzed by FAAH/NAAA; minimal established CYP450 DDI liability",
    "Endogenous fatty acid ethanolamide signaling via PPAR-alpha and GPR55 (with indirect endocannabinoid entourage tone) and metabolized locally by fatty acid amide hydrolase (FAAH) and NAAA rather than hepatic CYP450 isoforms. No established human CYP450 perpetrator grade; evaluate additive analgesia or sedation alongside neuropathic-pain agents. Educational desk only. Not a dose.",
  ),
  d(
    "oleamide",
    "Oleamide",
    "Fatty acid amide sedative",
    "herb",
    ["cis-9-octadecenamide", "cerebrodiene", "oleylamide"],
    [],
    ["cns-depressant"],
    "Additive CNS sedation with benzodiazepines, Z-drugs, opioids, or ethanol; metabolized by FAAH",
    "Endogenous sleep-inducing primary fatty acid amide interacting with CB1, 5-HT, and GABA-A signaling pathways and hydrolyzed by FAAH. Flagged for additive CNS depression and psychomotor impairment when co-used with benzodiazepines, Z-drugs, sedating antihistamines, opioids, or alcohol; human CYP450 DDI studies are lacking. Educational desk only. Not a dose.",
  ),
  d(
    "baicalin",
    "Baicalin (Scutellaria baicalensis)",
    "Botanical flavone / OATP & GABA modulator",
    "herb",
    ["baicalein", "scutellaria baicalensis", "chinese skullcap", "huang qin"],
    [inh("CYP2C9", "weak")],
    ["cns-depressant", "oatp-block"],
    "Reduces rosuvastatin exposure via OATP1B1 modulation; weak CYP2C9 inhibition; additive GABA-A sedation; rare hepatotoxicity reports",
    "Major flavone glucuronide of Scutellaria baicalensis (interconverting with aglycone baicalein via gut beta-glucuronidase). Human pharmacokinetic studies demonstrated OATP1B1-mediated reductions in rosuvastatin plasma exposure and weak CYP2C9 modulation; also acts as a GABA-A benzodiazepine-site positive modulator creating additive sedation with CNS depressants, with rare idiosyncratic hepatotoxicity reports for concentrated skullcap extracts. Educational desk only. Not a dose.",
  ),
  d(
    "fisetin",
    "Fisetin",
    "Senolytic flavonol supplement",
    "herb",
    ["cotinus coggygria", "smoke tree extract", "senolytic flavonol"],
    [inh("CYP2C9", "weak")],
    ["antiplatelet"],
    "Weak CYP2C9 inhibition & antiplatelet bleeding caution with warfarin/DOACs; rapid Phase II UGT/SULT clearance",
    "Plant flavonol under clinical investigation as a senolytic agent, undergoing rapid intestinal and hepatic glucuronidation, sulfation, and COMT methylation. Carries weak CYP2C9 inhibition and flavonol antiplatelet caution alongside warfarin, DOACs, or antiplatelet therapy; human clinical drug-interaction trials remain limited. Educational desk only. Not a dose.",
  ),
];
