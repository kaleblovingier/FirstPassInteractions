/**
 * Formulary wave 5: 2025-2026 approvals and older labeled-interaction drugs
 * missing from the shelf. Stacks on catalog.ts and the earlier waves. Every
 * enzyme and PD claim is read from the drug's current DailyMed label, cited at
 * the end of its note.
 *
 * Substrate grades follow wave 4:
 *   major: the label says avoid or change the dose with an inhibitor of that
 *     path, or reports an AUC rise of 2-fold or more with one.
 *   minor: the label acts only on inducers, and its inhibitor data show under
 *     2-fold or no clinically significant change.
 *   sensitive: not used. No label here uses the word for its own drug.
 * Paths the label names with no action are left off.
 *
 * Perpetrators: an inh() or ind() role only where section 7 gives the drug's
 * own strength word (centanafadine: "a moderate inhibitor of CYP1A2"). A role
 * with no strength word stays in the note and hint and is not scored, as in
 * wave 4.
 *
 * QT chips: qt-known for a boxed or section 5 QTc warning. Otherwise none.
 *
 * Empty enzyme lists mean no CYP story here, not "safe."
 * Educational desk only. Not a dose. Not FDA-cleared. PI / FDA / DEA govern.
 */

import type { Drug, Enzyme, EnzymeRole, PdFlag, Strength, SubstrateSensitivity } from "./types";

function sub(enzyme: Enzyme, sensitivity: SubstrateSensitivity): EnzymeRole {
  return { enzyme, kind: "substrate", sensitivity, pathway: "clearance", nti: false };
}

function inh(enzyme: Enzyme, strength: Strength): EnzymeRole {
  return { enzyme, kind: "inhibitor", strength };
}

function d(
  id: string,
  name: string,
  brands: string[],
  cls: string,
  enzymes: EnzymeRole[],
  pd: PdFlag[],
  toxicityHint: string,
  note: string,
): Drug {
  return { id, name, brands, cls, aliases: brands.map((b) => b.toLowerCase()), enzymes, pd, toxicityHint, note, kind: "drug" };
}

/** Fifth modern wave, merged after MODERN_WAVE4_FORMULARY. */
export const MODERN_WAVE5_FORMULARY: Drug[] = [
  d("milsaperidone", "Milsaperidone", ["Bysanti"], "Atypical antipsychotic",
    [sub("CYP2D6", "major"), sub("CYP3A4", "major")],
    ["qt-known"],
    "Boxed warning: increased mortality in elderly patients with dementia-related psychosis; QTc prolongation, avoid other QT-prolonging drugs; dosage reduction with strong CYP2D6 or strong CYP3A4 inhibitors; orthostatic hypotension, avoid alpha blockers",
    "Atypical antipsychotic that interconverts with iloperidone. Section 12.3: 'Milsaperidone undergoes oxidation to form iloperidone and iloperidone undergoes a stereospecific carbonyl reduction to form milsaperidone.' and 'Iloperidone is metabolized primarily by 3 biotransformation pathways: carbonyl reduction, hydroxylation (mediated by CYP2D6) and O-demethylation (mediated by CYP3A4).' Section 7.1: 'Reduce the dosage of BYSANTI when administered with a strong CYP2D6 inhibitor' and 'Reduce the dosage of BYSANTI when administered with a strong CYP3A4 inhibitor'. Section 2.4 gives the amounts, which this desk does not repeat. Section 12.3: fluoxetine 'increased the AUC of iloperidone and milsaperidone by approximately 2- to 3-fold', and ketoconazole 'increased the iloperidone AUC by 57%, the milsaperidone AUC by 55% and the P95 AUC by 35%'. Both paths are major here for the labeled dose change. The label does not call milsaperidone a sensitive substrate. Section 12.3 also says 'Concomitant use of BYSANTI or iloperidone have not been studied with CYP3A4 moderate inhibitors (e.g., erythromycin, grapefruit juice).' A moderate inhibitor still scores on this desk, and so does a strong CYP3A4 inducer, though the label gives no inducer data or action. Section 5.3: 'In a QTc study, the use of iloperidone (iloperidone and milsaperidone rapidly interconvert in vivo) was associated with QTc interval prolongation, especially with concomitant use of a CYP2D6 inhibitor or a CYP3A4 inhibitor.' Section 7.2: 'Avoid concomitant use of BYSANTI with other drugs that prolong the QTc interval' so this desk chips qt-known. Section 7.3: 'Avoid concomitant administration of BYSANTI with alpha-adrenergic blocking agents and consider lowering the dosage of other drugs that lower blood pressure'. This desk has no rule that pairs two alpha blockers, so that avoid lives in this note and the hint. No perpetrator role is coded. Section 12.3, in vitro: 'Iloperidone is an inhibitor of CYP isozymes 3A4, 3A5 and 2D6.' and, clinically, 'Thus, an interaction between iloperidone and other CYP2D6 substrates is unlikely.' and 'Thus, an interaction between iloperidone and other CYP3A4 substrates is unlikely.' Its in vitro transporter line calls iloperidone a weak P-gp inhibitor with no section 7 action, so no inh() role is coded. Boxed warning: 'Elderly patients with dementia-related psychosis treated with antipsychotic drugs are at an increased risk of death.' Section 4 lists hypersensitivity only. Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=254a1c01-4a4c-4bdd-85d6-1f23f2e4e6f8"),
  d("centanafadine", "Centanafadine", ["Simtriyo"], "NE / DA / 5-HT reuptake inhibitor (ADHD)",
    [inh("CYP1A2", "moderate")],
    ["stimulant", "serotonergic"],
    "Boxed warning: suicidal ideation in children, abuse and misuse; contraindicated with MAOIs and within 14 days of one; moderate CYP1A2 inhibitor per label, consider lowering CYP1A2 substrates; serotonin syndrome; added blood pressure and heart rate with other stimulants; avoid alcohol around a dose",
    "Section 12.1: 'Centanafadine has inhibitory activity at norepinephrine (NE), dopamine (DA), and serotonin (5-HT) reuptake transporters and is a central nervous system stimulant.' so this desk chips stimulant and serotonergic. Section 4 contraindicates use 'Taking, or within 14 days of stopping, MAOIs due to the risk of serious and possibly fatal drug interactions, including hypertensive crisis and serotonin syndrome'. The MAOI rules on this desk read contraindicated for those pairs. Section 5.9 names 'linezolid or intravenous methylene blue'. Perpetrator side, with the label's own strength word. Section 7: 'Centanafadine is a moderate inhibitor of CYP1A2.' and 'When SIMTRIYO is used concomitantly with CYP1A2 substrates, monitor for adverse reactions and consider dosage reduction of the concomitantly used CYP1A2 substrate.' Section 12.3: with caffeine 'there was a 2-fold increase in the AUC inf of caffeine'. So inh(CYP1A2, moderate) is coded and scored. Victim side: 'Centanafadine is primarily metabolized by monoamine oxidase A.' and 'No clinically meaningful change in pharmacokinetics of centanafadine was observed with concomitant use of ciprofloxacin (a CYP1A2 inhibitor), quinidine (a CYP2D6 inhibitor), or smoking (a CYP1A2 inducer).' so no substrate role is coded. Section 5.9: 'Concomitant use of SIMTRIYO with other serotonergic drugs may cause serotonin syndrome'. Section 7: 'Monitor for symptoms of serotonin syndrome when SIMTRIYO is used concomitantly with other drugs that may affect the serotonergic neurotransmitter systems.' This desk reads a serotonergic stimulant with another serotonergic drug as major, above that monitoring line. Section 7: 'Monitor for cardiovascular adverse reactions (e.g., increased blood pressure, increased heart rate) if SIMTRIYO is used with other CNS stimulants.' Alcohol, section 7: 'Avoid consumption of alcohol at the same time as, and for at least two hours after, administration of SIMTRIYO.' because it 'may result in a more rapid release of centanafadine'. This desk does not score that release effect, so read it here. Section 4 also contraindicates use 'With pheochromocytoma or a history of pheochromocytoma.' Boxed warning: 'SIMTRIYO has a potential for abuse and misuse.' and higher rates of suicidal ideation and behavior in children aged 6 to 12 years than with placebo. No QT chip: section 12.2 says 'clinically significant QTc interval prolongation was not observed'. Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ecfa41cc-c8c8-419b-8da3-ee5b819398c2"),
  d("baxdrostat", "Baxdrostat", ["Baxfendy"], "Aldosterone synthase inhibitor",
    [sub("CYP3A4", "minor")],
    ["k-sparing"],
    "Hyperkalemia, monitor potassium more often with drugs that raise it; hyponatremia; strong or moderate CYP3A inducers may lower its effect",
    "Section 12.1: 'Baxdrostat is an inhibitor of human aldosterone synthase.' Added to other antihypertensives. Section 5.1: 'BAXFENDY can cause hyperkalemia'. Section 7.1: 'Monitor serum potassium more frequently when BAXFENDY is used concomitantly with drugs that impair potassium excretion or increase serum potassium.' The label names no drug class beyond that sentence. The k-sparing chip is this desk's way into its hyperkalemia rule, the same chip finerenone and eplerenone carry here. That rule reads major with an ACE inhibitor or ARB, above the labeled action of more frequent potassium checks. This desk has no rule for two potassium-sparing agents together, so a spironolactone or eplerenone pair shows no finding. Read the monitoring line here. Section 12.3: 'Baxdrostat is primarily metabolized by CYP3A4 to an intermediate ketone metabolite'. Section 7.2: 'Monitor the therapeutic effect of BAXFENDY more frequently when concomitantly used with strong or moderate CYP3A inducers.' and 'Strong or moderate CYP3A inducers may decrease baxdrostat plasma concentration, which may reduce the efficacy of BAXFENDY.' With itraconazole, a strong CYP3A and P-gp inhibitor, section 12.3 reports a 1.56-fold AUC rise and calls it 'no clinically significant difference in baxdrostat exposure'. CYP3A4 is minor here so a strong inhibitor does not read major on a rise the label does not act on. A strong inducer still scores major and a moderate one moderate, above the labeled monitoring. 'Baxdrostat is a P-gp and BCRP substrate, but this is not expected to result in clinically significant drug-drug interactions.' so no P-gp role is coded. No perpetrator role is coded: 'Baxdrostat did not inhibit CYP1A2, CYP2B6, CYP2C8, CYP2C9, CYP2C19, CYP2D6 or CYP3A4/5, and did not induce CYP1A2, CYP2B6, or CYP3A4.' and 'There were no differences in the pharmacokinetics of either metformin (MATE1 and MATE2-K transporter substrate) or the oral contraceptive ethinyl estradiol/levonorgestrel when used concomitantly with baxdrostat.' Section 5.2: 'BAXFENDY can cause hyponatremia'. This desk has no sodium-loss chip, so that lives in this note and the hint. No QT chip: section 12.2 says 'Clinically significant QTc interval prolongation was not observed at 16 times the maximum recommended dose.' Section 4 lists no contraindications. Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b1fc1ee7-facc-4099-b3db-a4c1daeaa4be"),
  d("tavapadon", "Tavapadon", ["Juvmo"], "Dopamine agonist",
    [sub("CYP3A4", "major")],
    [],
    "CYP3A victim: strong or moderate CYP3A inhibitors call for less frequent dosing, strong CYP3A inducers not recommended; CYP3A inducer and CYP2C8 and BCRP inhibitor per label, strength ungraded and not scored here; orthostatic hypotension; hallucinations; impulse control behaviors",
    "Section 12.1: 'Tavapadon is a selective partial agonist at the dopamine D1 and D5 receptor subtypes'. Section 12.3: 'Tavapadon and its major inactive metabolite M4 are primarily metabolized by CYP3A.' Section 7.1: 'If JUVMO is used with a strong or moderate CYP3A inhibitor during JUVMO maintenance, reduce JUVMO dosage frequency' and 'Concomitant use of strong CYP3A inhibitors may increase the risk of hallucinations'. For inducers: 'Concomitant use of JUVMO with a strong CYP3A inducer is not recommended' and 'If JUVMO is used in a patient already on a long-term moderate CYP3A inducer, increase JUVMO dosage frequency'. Sections 2.2 and 2.3 give the schedules, which this desk does not repeat. Section 12.3: with itraconazole, a strong CYP3A inhibitor, tavapadon AUC rose 5-fold. With fluconazole it is predicted to 'increase the AUC τ and C max of tavapadon by approximately 2.6-fold and 2.3-fold'. With carbamazepine it 'decreased tavapadon AUC τ and C max by 63% and 49%'. The label does not call tavapadon a sensitive substrate, so CYP3A4 stays major here despite that rise. The perpetrator side stays ungraded. Section 7.2: 'JUVMO is an inducer of CYP3A' with 'Consider a dose modification of sensitive CYP3A substrates or CYP3A substrates where minimal concentration changes may lead to loss of efficacy, as clinically appropriate, when initiating or discontinuing JUVMO.' It adds 'JUVMO is an inhibitor of CYP2C8' and 'JUVMO is an inhibitor of efflux transporter BCRP'. Section 12.3: 'Tavapadon is predicted to cause clinically relevant induction of CYP3A, inhibition of CYP2C8, and BCRP'. None of those names a strength, so no ind() or inh() role is coded and this desk will not score those effects. Read them here. 'Tavapadon is a substrate for P-gp and BCRP, but is not expected to result in clinically significant drug interactions.' so no P-gp role is coded. Section 5.1: 'dopaminergic medications appear to impair the systemic regulation of blood pressure, resulting in hypotension and/or orthostatic hypotension'. Section 5.3: 'Medications for the treatment of PD, including JUVMO, can have effects on thinking and behavior.' Section 5.2 covers impulse control behaviors and 5.4 dyskinesia. Section 5 has no somnolence warning, so unlike older dopamine agonists on this desk it is not chipped cns-depressant. No QT chip: section 12.2 says 'a mean increase in the QTc interval >20 ms is unlikely'. Section 4 lists no contraindications. Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1ae6df6e-6ca0-420f-bec9-effa7acdd085"),
];
