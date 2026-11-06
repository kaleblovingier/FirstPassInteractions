/**
 * Formulary wave 4: recent small-molecule approvals missing from the shelf.
 * Stacks on catalog.ts and the earlier waves. Every enzyme and PD claim is read
 * from the drug's current DailyMed label, cited at the end of its note.
 *
 * Substrate grades:
 *   major: the label says avoid or change the dose with an inhibitor of that
 *     path, or reports an AUC rise of 2-fold or more with one.
 *   minor: the label acts only on inducers, and its inhibitor data show under
 *     2-fold or no clinically significant change. The engine scores a strong
 *     inducer major at any grade, so this keeps an inhibitor from reading major
 *     without losing the inducer.
 *   sensitive: not used. No label here uses the word for its own drug, even
 *     where a fold-change is that large. The note gives the number.
 * Paths the label names with no action are left off.
 *
 * Perpetrators: no inh() or ind() role. No label here gives its drug a clinical
 * strength word, so those sentences stay in the note and hint and the pair is
 * not scored.
 *
 * QT chips: qt-known for a boxed or section 5 QTc warning. qt-possible when 12.2
 * reports a concentration-dependent increase and does not also say clinically
 * significant prolongation was not observed. Otherwise none.
 *
 * Empty enzyme lists mean no CYP story here, not "safe."
 * Educational desk only. Not a dose. Not FDA-cleared. PI / FDA / DEA govern.
 */

import type { Drug, Enzyme, EnzymeRole, PdFlag, SubstrateSensitivity } from "./types";

function sub(enzyme: Enzyme, sensitivity: SubstrateSensitivity): EnzymeRole {
  return { enzyme, kind: "substrate", sensitivity, pathway: "clearance", nti: false };
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

/** Fourth modern wave, merged after MODERN_WAVE3_FORMULARY. */
export const MODERN_WAVE4_FORMULARY: Drug[] = [
  d("vorasidenib", "Vorasidenib", ["Voranigo"], "FLT3 / IDH / hedgehog",
    [sub("CYP1A2", "major")],
    ["hepatotoxic"],
    "CYP1A2 victim: avoid strong or moderate CYP1A2 inhibitors, moderate CYP1A2 inducers, and smoking; CYP3A inducer per label, strength ungraded, so CYP3A substrate and hormonal contraceptive pairs are not scored here; hepatotoxicity",
    "Inhibitor of IDH1 and IDH2. Section 12.3: 'Vorasidenib is primarily metabolized by CYP1A2 with minor contributions from CYP2B6, CYP2C8, CYP2C9, CYP2C19, CYP2D6 and CYP3A.' Section 7.1: 'Avoid concomitant use of VORANIGO with strong and moderate CYP1A2 inhibitors.' and 'Avoid concomitant use of VORANIGO with moderate CYP1A2 inducers and smoking tobacco.' Section 12.3: 'Concomitant use of ciprofloxacin (moderate CYP1A2 inhibitor) increased vorasidenib plasma Cmax 1.3-fold and AUC 2.5-fold.' and 'Concomitant use with fluvoxamine (strong CYP1A2 inhibitor) is predicted to increase vorasidenib Cmax and AUC by ≥5-fold.' The label does not call vorasidenib a sensitive substrate, so CYP1A2 stays major here. The perpetrator side stays ungraded. Section 12.3, in vitro: 'Vorasidenib is an inducer of CYP2B6, CYP2C8, CYP2C9, CYP2C19 and CYP3A and UGT1A4.' Section 7.2: 'Avoid concomitant use of VORANIGO with CYP3A substrates, where a minimal concentration change may lead to reduced therapeutic effect.' For hormonal contraception: 'If concomitant use cannot be avoided, use with nonhormonal contraception methods.' Neither sentence names a strength, so no ind() role is coded and this desk will not score those pairs. Read them here. Section 12.3 predicts no clinically significant change in digoxin or rosuvastatin. Section 5.1: 'VORANIGO can cause hepatic transaminase elevations, which can lead to hepatic failure, hepatic necrosis, and autoimmune hepatitis.' No QT chip: section 12.2 says 'a mean increase in the QTc interval >20 msec is unlikely' at the labeled timing, and adds 'There is insufficient information to characterize the QTc effects of VORANIGO at higher vorasidenib concentrations,' so the missing chip is not a clearance. Section 5.2: fetal harm. Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=31405fee-55b7-4857-987e-2724ee76be84"),
  d("inavolisib", "Inavolisib", ["Itovebi"], "PI3K / mTOR / AKT",
    [],
    [],
    "Severe or fatal hyperglycemia including ketoacidosis; severe stomatitis and diarrhea; embryo-fetal toxicity; no enzyme role is scored here, which is not a clearance",
    "Inhibitor of PI3K, predominantly PI3K-alpha, given with palbociclib and fulvestrant. This label has no section 7, and the empty enzyme list means this desk has nothing to score, not that the drug is free of interactions. Section 12.3: 'Inavolisib is primarily metabolized by hydrolysis.' and 'In vitro, inavolisib was minimally metabolized by CYP3A.' so no substrate role is coded. Section 12.3, in vitro: 'Inavolisib induces CYP3A and CYP2B6.' and 'Inavolisib is a time-dependent inhibitor of CYP3A.' The label gives no strength and no clinical study for either, so no perpetrator role is coded. 'Inavolisib is a substrate of P-glycoprotein (P-gp) and breast cancer resistance protein (BCRP)' in vitro, with no labeled action, so no P-gp role is coded. The one clinical interaction line is negative: 'No clinically significant difference in steady-state inavolisib pharmacokinetics were observed based upon concomitant use of a proton pump inhibitor'. Section 5.1: 'Severe or fatal hyperglycemia, including ketoacidosis, can occur in patients treated with ITOVEBI.' This desk has no hyperglycemia flag, so that risk lives in this note and in the hint. Section 5.2: 'Severe stomatitis can occur in patients treated with ITOVEBI.' Section 5.3: 'Severe diarrhea, including dehydration and acute kidney injury, can occur in patients treated with ITOVEBI.' Section 5.4: fetal harm. No QT chip: section 12.2 says 'a mean increase in the QTc interval of > 20 ms is unlikely'. Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=5de59f5b-e5db-410f-b692-658686ef4107"),
  d("ensartinib", "Ensartinib", ["Ensacove"], "ALK / ROS1 / NTRK / RET / MET TKI",
    [sub("CYP3A4", "major"), sub("P-gp", "major")],
    ["hepatotoxic", "bradycardic"],
    "Avoid strong or moderate CYP3A inhibitors and inducers and P-gp inhibitors, by mechanism, not yet studied clinically; ILD/pneumonitis; hepatotoxicity; symptomatic bradycardia; contraindicated with tartrazine hypersensitivity",
    "Kinase inhibitor of ALK that also inhibits MET and ROS1. Section 12.3: 'Ensartinib is predominantly metabolized by CYP3A.' and 'Ensartinib is a P-gp substrate'. Section 7.1: 'Avoid concomitant use of strong or moderate CYP3A inhibitors with ENSACOVE.' 'Avoid concomitant use of strong or moderate CYP3A inducers with ENSACOVE.' 'Avoid concomitant use of P-gp inhibitors with ENSACOVE.' Each of the three adds 'this has not been studied clinically,' so the label gives no fold-change to quote. CYP3A4 and P-gp are major here for those avoid instructions alone. Section 12.3, in vitro: 'Ensartinib does not inhibit CYP1A2, CYP2B6, CYP2C8, CYP2C9, CYP2C19, CYP2D6 and does not induce CYP1A2, CYP2B6, or CYP3A.' and 'Ensartinib does not inhibit BCRP, P-gp, OATP1B1, OATP1B3, OAT1, OAT3, OCT1, OCT2 or OCT3.' No perpetrator role is coded. Section 5.4: 'ENSACOVE can cause symptomatic bradycardia.' Section 2.4 has the reader look for 'a concomitant medication known to cause bradycardia', so this desk chips bradycardic. Section 5.2: 'ENSACOVE can cause hepatotoxicity including drug-induced liver injury.' Section 5.1: 'ENSACOVE can cause severe interstitial lung disease (ILD)/pneumonitis.' Section 5.5: 'ENSACOVE can cause hyperglycemia.' Section 4: 'ENSACOVE is contraindicated in patients who have experienced a severe hypersensitivity reaction to ENSACOVE, FD&C Yellow No. 5 (tartrazine), or to any of its components'. No QT chip: section 12.2 says 'a mean increase in the QTc interval > 20 ms was not observed'. Section 5.9: fetal harm. Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1e1b2f79-678a-472a-b924-66909c8a4b2e"),
  d("atrasentan", "Atrasentan", ["Vanrafia"], "ERA (endothelin antagonist)",
    [sub("CYP3A4", "minor")],
    ["hepatotoxic"],
    "Boxed warning: embryo-fetal toxicity, contraindicated in pregnancy; avoid strong or moderate CYP3A inducers and OATP1B1/1B3 inhibitors such as cyclosporine; the OATP path is not scored here; fluid retention",
    "Endothelin type A receptor antagonist. Section 12.3: metabolized by CYP3A and UGTs 'with approximately half via CYP3A and the remaining half via glucuronidation by multiple UGTs'. Section 7.1: 'Avoid concomitant use with a strong or moderate CYP3A inducer.' With rifampin, section 12.3 reports 'Atrasentan Ctrough decreased by 90%'. With ketoconazole it reports 'Atrasentan AUC increased by 90%', and section 7 gives no inhibitor action. CYP3A4 is minor here so a strong inhibitor does not read major on a rise the label does not act on. A strong inducer still scores major, but a moderate inducer scores moderate here even though the label says avoid. Section 7.1 also says: 'Avoid concomitant use with organic anion transporting polypeptides 1B1/1B3 (OATP1B1/1B3) inhibitors.' With cyclosporine, section 12.3 reports 'Atrasentan Cmax was 4.3 times as high and AUC was 3.8 times as high'. This desk has no OATP1B role, so that avoid lives in this note and the hint, and the cyclosporine pair will not show it as a finding. Perpetrator side: 'Atrasentan inhibits in vitro CYP3A, CYP2B6, CYP2C8 and CYP2C9 and induces CYP3A and CYP2B6, but is not expected to cause clinically significant interactions with these CYP450 enzymes in the liver.' and 'No clinically significant differences in the pharmacokinetics of midazolam (CYP3A4 substrate), losartan (CYP2C9 and CYP3A4 substrate) or fexofenadine (P-gp substrate) were observed or expected when used concomitantly with VANRAFIA.' No perpetrator role is coded. Section 4.1: 'Use of VANRAFIA is contraindicated in patients who are pregnant'. Section 5.2 is headed hepatotoxicity and speaks for the class first: 'Asymptomatic and transient transaminase elevations have been observed with VANRAFIA'. Section 5.3: 'Fluid retention may occur with ERAs and has been observed in clinical studies with VANRAFIA'. No QT chip: section 12.2 says 'clinically significant QTc interval prolongation was not observed'. Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=9a7e7f85-bfd0-44a0-beda-3bcfa8215c64"),
  d("sebetralstat", "Sebetralstat", ["Ekterly"], "Plasma kallikrein inhibitor",
    [sub("CYP3A4", "major")],
    ["qt-possible"],
    "On-demand tablet for acute HAE attacks; CYP3A4 victim: avoid strong inhibitors and moderate or strong inducers, dosage reduction with moderate inhibitors; concentration-dependent QTc increase in section 12.2",
    "Plasma kallikrein inhibitor for acute attacks of hereditary angioedema. Section 12.3: 'Sebetralstat is primarily metabolized by CYP3A4 and to a lesser extent by CYP2C8.' Section 7.1: 'Avoid use of EKTERLY with strong CYP3A4 inhibitors' and 'Use of EKTERLY with strong or moderate CYP3A4 inducers is not recommended.' Moderate inhibitors carry a labeled dose reduction; sections 2.2 and 7.1 give the amount, which this desk does not repeat. Section 12.3: 'Sebetralstat Cmax increased 2.4-fold and AUC 0-inf increased 5.2-fold following concomitant administration with itraconazole (a strong CYP3A4 inhibitor)' and 'Sebetralstat Cmax increased 1.8-fold and AUC 0-inf increased 2-fold following concomitant administration with verapamil (a moderate CYP3A4 inhibitor)'. With phenytoin: 'Sebetralstat Cmax decreased by 66% and AUC 0-inf decreased by 83%'. The label does not call sebetralstat a sensitive substrate, so CYP3A4 stays major here despite the size of that number. CYP2C8 carries no labeled action and is left off. Perpetrator side: 'Sebetralstat is an inhibitor of CYP2C9 and CYP3A4.' in vitro, with no strength, no clinical study, and no section 7 action, so no inh() role is coded. Section 12.3 also says 'No clinically significant differences in sebetralstat pharmacokinetics were observed when administered concomitantly with quinidine (P-gp inhibitor), eltrombopag (BCRP inhibitor), cimetidine (evaluated as a weak CYP3A4 inhibitor), or modafinil (weak CYP3A4 inducer).' Acid suppression is an estimate with no labeled action: 'Sebetralstat Cmax is estimated to decrease by up to 56% and AUC 0-inf is estimated to decrease by up to 30% at pH 6 relative to pH 0.5.' Section 12.2: 'The largest mean increase in QTc interval was 10.4 msec' at 2.5 times the maximum recommended dose, and 'The increase in the QTc interval was concentration dependent.' This label has no section 5, so the qt-possible chip rests on that section 12.2 line alone. Section 4 lists no contraindications. Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1d145e2f-8e7e-2e90-e063-6294a90a4449"),
  d("zongertinib", "Zongertinib", ["Hernexeos"], "HER2 TKI",
    [sub("CYP3A4", "minor")],
    ["hepatotoxic"],
    "Avoid strong CYP3A inducers; BCRP inhibitor per label that raises rosuvastatin exposure, BCRP is not scored here; severe hepatotoxicity; left ventricular dysfunction; ILD/pneumonitis",
    "Kinase inhibitor of HER2. Section 7.1: 'Zongertinib is a CYP3A substrate.' and 'Avoid concomitant use of HERNEXEOS with strong CYP3A inducers.' If that cannot be avoided the label raises the dose; section 2.4 gives the amount, which this desk does not repeat. Section 12.3: 'Zongertinib AUC decreased by 63% and Cmax decreased by 43% following concomitant use of carbamazepine (strong CYP3A inducer)' and 'The effect of concomitant use of moderate CYP3A inducers on zongertinib Cmax and AUC are unknown.' The inhibitor side is a negative study: 'No clinically significant differences in zongertinib pharmacokinetics were observed when used concomitantly with strong CYP3A, P-gp, BCRP inhibitors and rabeprazole (proton pump inhibitor).' CYP3A4 is minor here for that reason, even though 'CYP-mediated oxidation pathways represent 48% to 62% (mainly CYP3A4 and CYP3A5)'. A strong inducer still scores major. A strong inhibitor scores moderate on this desk, the lowest it can go while the role is on the row, and the label gives no reason to expect a change. No P-gp role is coded. Perpetrator side: 'Zongertinib is a BCRP inhibitor.' and 'Rosuvastatin (BCRP substrate) Cmax increased 3-fold and AUC 2.3-fold'. Section 7.2 says to avoid certain BCRP substrates 'where minimal concentration changes may lead to serious adverse reactions'. This desk has no BCRP role, so the rosuvastatin pair will not show it as a finding. Section 12.3 also reports no clinically significant change in midazolam, dabigatran, metformin, or repaglinide, so no CYP or P-gp perpetrator role is coded. Section 5.1: 'HERNEXEOS can cause severe and life-threatening hepatotoxicity, including drug induced liver injury.' Section 5.2: 'HERNEXEOS can cause severe left ventricular dysfunction.' Section 5.3: 'HERNEXEOS can cause severe and life-threatening interstitial lung disease (ILD)/pneumonitis.' Section 5.4: fetal harm. No QT chip: section 12.2 says 'a mean increase in the QTc interval > 20 ms was not observed'. Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d3fabf12-354e-4e5c-b5de-20fdb579b783"),
];
