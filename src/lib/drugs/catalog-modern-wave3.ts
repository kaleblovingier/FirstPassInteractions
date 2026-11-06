/**
 * Formulary wave 3 — 2024–2026 FDA approvals not yet on the shelf.
 * Stacks on catalog.ts + catalog-modern.ts + catalog-modern-wave2.ts.
 * Every enzyme/PD claim here is pulled from the drug's actual FDA prescribing
 * information (or, for the two antibodies, the sponsor's medical-affairs
 * metabolism statement) — not extrapolated from drug class. Where the label
 * declines to grade an interaction (no strength, no dose number, a negative
 * in vivo study), this file declines too rather than inventing one; read the
 * note for what the label actually says.
 * Empty enzyme lists mean no CYP story here, not "safe."
 * Educational desk only. Not a dose. Not FDA-cleared. PI / FDA / DEA govern.
 */

import type { Drug, Enzyme, EnzymeRole, ItemKind, PdFlag, Strength, SubstrateSensitivity } from "./types";

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

function d(
  id: string,
  name: string,
  brands: string[],
  cls: string,
  enzymes: EnzymeRole[],
  pd: PdFlag[],
  toxicityHint: string,
  extra?: { aliases?: string[]; note?: string; kind?: ItemKind },
): Drug {
  return {
    id,
    name,
    brands,
    cls,
    aliases: extra?.aliases ?? [],
    enzymes,
    pd,
    toxicityHint,
    note: extra?.note,
    kind: extra?.kind ?? "drug",
  };
}

/** Third modern wave — merged after MODERN_WAVE2_FORMULARY. */
export const MODERN_WAVE3_FORMULARY: Drug[] = [
  // —— Anti-amyloid antibodies (Alzheimer's) ——————————————
  d("lecanemab", "Lecanemab", ["Leqembi"], "Amyloid beta-directed monoclonal antibody",
    [],
    [],
    "ARIA (edema/effusion or microhemorrhage); caution with anticoagulants/thrombolytics; ApoE4 homozygotes at highest risk",
    {
      aliases: ["leqembi", "lecanemab-irmb"],
      note: "IgG1 mAb against aggregated amyloid-beta; degraded by proteolysis like any endogenous IgG — not a CYP substrate, inhibitor, or inducer, full stop. Label 12.3: 'is not expected to undergo renal elimination or metabolism by hepatic enzymes.' There is no PK drug-drug-interaction story to code here. The real interaction is PD: ARIA-H (microhemorrhage) risk. Label 5.1 says 'additional caution should be exercised when considering the administration of antithrombotics or a thrombolytic agent,' and flags intracerebral hemorrhages >1cm in treated patients; ApoE4 homozygotes carry the highest ARIA burden and get enhanced monitoring in the first 14 weeks. This desk has no mAb/ARIA flag to collide against 'anticoagulant' structurally, so read that caution in prose, not in a chip. Source: LEQEMBI prescribing information, sections 5.1 and 12.3, BLA 761269 (https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/761269s000lbl.pdf).",
    }),
  d("donanemab", "Donanemab", ["Kisunla"], "Amyloid beta-directed monoclonal antibody",
    [],
    [],
    "Boxed warning ARIA; caution with antithrombotics/thrombolytics; test ApoE4 status before starting",
    {
      aliases: ["kisunla", "donanemab-azbt"],
      note: "Same family move as lecanemab: humanized IgG1 against amyloid plaque, catabolized by proteolysis 'in the same manner as endogenous IgG.' Lilly medical affairs states it plainly: not metabolized by CYP450, does not inhibit or induce CYP pathways, no active metabolites — nothing to hang a PK chip on. Boxed warning is ARIA; the label tells clinicians to consider whether a focal deficit is ARIA-E 'before giving thrombolytic therapy,' and patient counseling (17) says 'use of antithrombotic or thrombolytic medications while taking KISUNLA may increase the risk of bleeding in the brain.' One fatal intracerebral hemorrhage in a patient on a thrombolytic is on the label (5.1). ApoE4 homozygotes are tested before starting and carry the highest ARIA load. Same desk limitation as lecanemab: the real risk is PD (anticoagulation stacked on cerebral microhemorrhage risk), and there is no structured flag here for that collision — it lives in this note, not the chips. Source: KISUNLA prescribing information, Boxed Warning and sections 5.1/17, and Lilly Medical Affairs on donanemab metabolism/excretion (https://medical.lilly.com/us/products/answers/how-is-kisunla-donanemab-azbt-metabolized-and-excreted-213272).",
    }),

  // —— Cardiovascular ———————————————————————————————————
  d("aficamten", "Aficamten", ["Myqorzo"], "Cardiac myosin inhibitor",
    [sub("CYP2C9", "major"), sub("CYP3A4", "major")],
    [],
    "Boxed warning: reduces LVEF, can cause heart failure; dosing gated on echo LVEF; contraindicated with rifampin; REMS drug",
    {
      aliases: ["myqorzo"],
      note: "Mavacamten's 2025 sibling — same REMS idea, different enzyme. Label 12.3: aficamten 'is metabolized primarily by CYP2C9, and to a lesser extent by CYP3A, CYP2D6, and CYP2C19 enzymes,' but the actionable dosing table (2.3) is built around CYP3A: voriconazole (strong CYP3A/moderate CYP2C19/weak CYP2C9 inhibitor) triggers a dose cut or avoidance, and rifampin — a strong CYP3A inducer — is flatly contraindicated (section 4); carbamazepine (moderate-to-strong CYP3A inducer) gets its own 'reduce the dose when discontinuing' instruction. Graded major on CYP3A4 here despite the label's 'lesser extent' phrasing: this desk's 'major' substrate tier exists precisely to flag that a strong CYP3A perturbation has a clinically major consequence, which the flat rifampin contraindication and the voriconazole dose-cut both confirm — it is not a claim that CYP3A4 is pharmacokinetically co-equal to CYP2C9. Aficamten itself 'is not expected to inhibit' or induce CYP1A2/2B6/2C8/2C19/2D6/3A4 at clinically relevant concentrations (12.3) — it's a victim here, not a perpetrator, so no inh()/ind() role is coded. Boxed warning: reduces LVEF and can cause heart failure from systolic dysfunction; dosing (2.2) is gated on echo LVEF — cut the dose under 50%, hold under 40%, don't start under 55%. Thorough QT study was clean (12.2), so this desk does not chip it qt-possible. REMS: prescriber and pharmacy certification required (5.2), same structure as Camzyos. Approved and available December 2025. Source: MYQORZO prescribing information, sections 2.2/2.3/4/5.1-5.2/12.2/12.3.",
    }),
  d("etripamil", "Etripamil", ["Cardamyst"], "Intranasal non-dihydropyridine calcium channel blocker",
    [sub("CYP3A4", "minor")],
    ["ndhp-ccb", "bradycardic"],
    "Single-dose intranasal verapamil-class drug for PSVT conversion; AV block/bradycardia/hypotension; contraindicated in Mobitz II-or-higher AV block",
    {
      aliases: ["cardamyst"],
      note: "A verapamil-class molecule re-engineered as a patient-administered intranasal spray that converts paroxysmal SVT to sinus rhythm outside the hospital — the self-administer-at-home niche is the whole point. Label 12.3's actual sentence is 'Etripamil is primarily metabolized by blood esterases and hepatic metabolism, primarily via CYP3A4, and CYP3A5' — read closely, that names esterases and CYP3A4/5 hepatic metabolism as the two primary routes without the label ranking one over the other; it does not say esterase clearance dominates. CYP3A4 is graded minor here for a different reason: there's no inhibitor-strength data to hang a bigger grade on (see below), not because the label calls esterases dominant. In vitro, etripamil 'inhibits CYP2D6, CYP3A4, and CYP2C9,' but the label gives no strength grade and carries no formal section 7 drug-interaction table; it does state CARDAMYST 'was safely administered to patients taking beta blockers or calcium channel blockers' in trials (12.3) — so no inh() role is coded pending a graded label update, rather than guessing a strength that isn't stated. Contraindicated in second-degree Mobitz II-or-higher AV block (section 4); monitor for hypotension/bradycardia in at-risk patients (5.1); PR interval rose 8-10% within minutes of intranasal dosing in healthy subjects (12.2). Approved 2025. Source: CARDAMYST (etripamil) prescribing information, sections 4/5.1/10/12.2/12.3 (https://milestonepharma.com/etripamilprescribinginformation.pdf).",
    }),
  d("lerodalcibep", "Lerodalcibep", ["Lerochol"], "PCSK9-binding protein (Adnectin), LDL-lowering",
    [],
    [],
    "Monthly SC injection; no CYP story; discontinue once pregnancy is recognized (mechanism-based fetal risk); injection-site reactions",
    {
      aliases: ["lerochol", "lib003"],
      note: "Not an antibody — an engineered small binding protein (an Adnectin) that ties up circulating PCSK9 so LDL receptors stick around longer, same endpoint as alirocumab/evolocumab but monthly subcutaneous dosing on a different scaffold. Label 12.3 is almost defiantly simple: 'As a protein, lerodalcibep-liga is expected to degrade to small peptides and amino acids,' and 'no formal clinical drug interaction studies have been performed' — no CYP substrate, inhibitor, or inducer role exists to code. Worth shelving precisely as the control case: patients on this are very often also on a statin, which carries this desk's real CYP3A4/transporter-mediated interaction story under the statin's own entry — lerodalcibep is the add-on that doesn't add a PK problem. Discontinue once pregnancy is recognized; mechanism-based fetal-harm language per label (8.1), not a classic teratogen dataset. Approved December 2025. Source: LEROCHOL prescribing information, sections 1/4/8.1/12.3 (https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/761427s001lbl.pdf).",
    }),

  // —— Infectious disease / STI ———————————————————————
  d("zoliflodacin", "Zoliflodacin", ["Nuzolvence"], "Spiropyrimidinetrione antibacterial (bacterial topoisomerase inhibitor)",
    [sub("CYP3A4", "major"), sub("P-gp", "minor")],
    ["qt-possible"],
    "Single-dose oral gonorrhea therapy; CYP3A4 victim — contraindicated with moderate/strong 3A4 inducers (treatment failure risk); concentration-dependent QTc signal",
    {
      aliases: ["nuzolvence", "azd0914"],
      note: "First new oral drug class for gonorrhea in decades — a single-dose oral regimen, novel mechanism (bacterial type II topoisomerase), no cross-resistance with existing classes (12.4). Label 12.3: CYP-mediated clearance is 'via CYP3A4 (68%)' with minor contributions from CYP1A2/2C9/2C8/2C19; itraconazole (strong CYP3A4 inhibitor) raised AUC about 1.4-fold, and rifampin/efavirenz are predicted to cut AUC roughly 56%/41%. Section 7.1 makes the inducer side absolute: 'concomitant use of moderate or strong inducers of CYP3A4 with NUZOLVENCE is contraindicated' — this is an efficacy-failure (undertreated gonorrhea, resistance-selection) risk, not just a PK curiosity, which matters directly for harm-reduction and STI-clinic prescribing. Also a P-gp/BCRP substrate; at supratherapeutic concentrations it inhibits CYP2C8/2C9/2C19 in vitro, but the label frames that as 'well above anticipated unbound plasma levels,' so no inh() role is coded. Thorough QTc study showed a concentration-dependent QTc increase, though 'clinically significant QTc interval prolongation is not expected at the maximum recommended single dose' (12.2) — flagged qt-possible for the teaching stack, not as a crisis. Source: NUZOLVENCE prescribing information, NDA 219491, sections 7.1/12.2/12.3/12.4 (https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/219491Orig1s000lbl.pdf).",
    }),

  // —— Antiemetic ——————————————————————————————————————
  d("tradipitant", "Tradipitant", ["Nereus"], "NK1 (neurokinin-1) receptor antagonist (antiemetic)",
    [sub("CYP3A4", "major"), sub("CYP2C19", "minor")],
    ["cns-depressant"],
    "CYP3A4 victim — strong inhibitors raise exposure; avoid in any degree of hepatic impairment (no data, not a proven hepatotoxin); additive CNS impairment with other depressants",
    {
      aliases: ["nereus", "vln-101"],
      note: "First new motion-sickness mechanism in 40-plus years — same NK1-antagonist family as aprepitant, dosed here for vomiting from motion rather than chemo or post-op. Label 7.1: 'Tradipitant is a CYP3A4 substrate,' and strong CYP3A4 inhibitors 'may increase tradipitant exposure, which may increase the risk of adverse reactions'; 12.3 adds CYP2C19 and a smaller CYP2C8 contribution, plus UGT1A4/UGT2B7 glucuronidation (outside this desk's enzyme list). It also has in vitro CYP3A4 inhibitor/inducer potential, but the label is explicit that an in vivo midazolam study showed 'no clinically significant differences' — real human data overriding the in vitro signal, so no inh()/ind() role is coded; that negative study is the point, not an oversight. Section 8.7: not studied in any degree of hepatic impairment, so the label says avoid outright rather than dose-adjust — a 'no data' caution, kept out of toxicityHint as a hepatotoxicity claim it isn't. Label flags additive driving/CNS impairment with other CNS depressants, worse when combined with strong CYP3A4 inhibitors (5.1). No QT signal at the no-food dose tested (12.2). Approved 2025. Source: NEREUS prescribing information, sections 5.1/7.1/8.7/12.2/12.3.",
    }),

  // —— WHIM / cystic fibrosis (appended; do not insert above) ——
  d("mavorixafor", "Mavorixafor", ["Xolremdi"], "CXCR4 antagonist",
    [sub("CYP3A4", "major")],
    ["qt-known"],
    "Contraindicated with drugs highly dependent on CYP2D6 for clearance; CYP3A4 victim — strong inhibitors need a dosage reduction and strong inducers are avoided; QTc prolongation",
    {
      aliases: ["xolremdi"],
      note: "CXCR4 antagonist for WHIM syndrome. Section 4: 'Use of XOLREMDI is contraindicated with drugs that are highly dependent on CYP2D6 for clearance.' Section 7.2: 'Mavorixafor is a CYP2D6 inhibitor.' The label gives no strong, moderate, or weak word, so that inhibitor role stays ungraded and is not scored. The same section says mavorixafor increases exposure of CYP2D6 substrates. Section 12.3: 'Dextromethorphan (CYP2D6 substrate) Cmax increased by 6-fold (CI 90% : 5.1 to 8.3) and AUC by 9-fold (CI 90% : 6.5 to 12.3)' and still names no inhibitor strength. Section 7.2: 'Mavorixafor is an inhibitor of CYP3A4.' and 'Mavorixafor is an inhibitor of P-gp.' Neither sentence names a strength, so those perpetrator roles stay ungraded. The labeled action is more frequent monitoring where minimal substrate concentration changes may lead to serious adverse reactions. Section 12.3: 'Midazolam (CYP3A4 substrate) Cmax increased by 1.1-fold (CI 90% : 1.0 to 1.3) and AUC by 1.7-fold (CI 90% : 1.4 to 2.1)' and 'Digoxin Cmax increased by 1.5-fold (CI 90% : 1.3 to 1.8) and AUC increased by 1.6-fold (CI 90% : 1.4 to 1.9),' again with no strength word. Victim side the label does act on: section 7.1, 'Mavorixafor is a CYP3A4 substrate.' Highlights: 'Strong CYP3A4 inhibitors: Reduce XOLREMDI daily dosage.' Body: 'Avoid concomitant use with a strong CYP3A4 inducer.' Highlights: 'P-gp inhibitors or moderate CYP3A4 inhibitors: Monitor more frequently for XOLREMDI adverse reactions and reduce XOLREMDI daily dosage if necessary.' CYP3A4 is a major substrate here because a strong CYP3A4 inhibitor or inducer has a labeled dosage change or an avoid instruction. 'Mavorixafor is a P-gp substrate' is cited and left ungraded: no substrate-sensitivity word. Metformin may fall — section 12.3: 'Metformin Cmax decreased by 35% (CI 90% : 17 to 49%) and AUC decreased by 35% (CI 90% : 20 to 47%)' — and section 7.2 says 'The mechanism of this interaction is unknown,' so no enzyme role is coded. Section 5.2: 'XOLREMDI causes concentration-dependent QTc interval prolongation.' Section 7.3 names torsade de pointes with other QTc-prolonging products, so this desk chips qt-known, the same move as modern rows whose labels say the drug causes concentration-dependent QTc prolongation. Patient counseling (17): avoid grapefruit ('grapefruit is a strong CYP3A4 inhibitor'), goldenseal ('it is a strong CYP3A4 inhibitor'), and St. John's wort ('it is an inducer of CYP3A4'). Section 8.7: 'XOLREMDI is not recommended for use in patients with moderate to severe hepatic impairment' because those pharmacokinetics have not been studied; that is not coded as hepatotoxicity. Section 5.1: 'XOLREMDI is expected to cause fetal harm when administered to a pregnant woman.' Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7f3a5ee3-ca73-4876-85a0-ed1e108a2237",
    }),
  d("vanzacaftor-tezacaftor-deutivacaftor", "Vanzacaftor–tezacaftor–deutivacaftor", ["Alyftrek"], "CFTR modulator",
    [sub("CYP3A4", "major")],
    ["hepatotoxic"],
    "Boxed warning for drug-induced liver injury and liver failure; CYP3A victim — strong or moderate inducers are not recommended, and strong or moderate inhibitors need a dosage reduction; avoid grapefruit",
    {
      aliases: ["alyftrek", "vanzacaftor", "deutivacaftor"],
      note: "CFTR modulator combination, shelved like elexacaftor–tezacaftor–ivacaftor: one CYP3A victim grade and a liver flag, and no perpetrator strength the label does not give. Boxed warning is drug-induced liver injury and liver failure. 'ALYFTREK should not be used in patients with severe hepatic impairment (Child-Pugh Class C).' 'ALYFTREK is not recommended in patients with moderate hepatic impairment (Child-Pugh Class B).' Section 4: 'None.' Section 7.1: 'Vanzacaftor, tezacaftor, and deutivacaftor are substrates of CYP3A.' 'Concomitant use of ALYFTREK with strong or moderate CYP3A inducers is not recommended.' 'Reduce the ALYFTREK dosage when used concomitantly with a strong or moderate CYP3A inhibitor.' 'Food or drink containing grapefruit should be avoided during treatment with ALYFTREK.' CYP3A4 is a major substrate on this desk for that labeled action, the same tier as Trikafta. Perpetrator roles stay ungraded. Section 7.2: 'Tezacaftor and deutivacaftor (components of ALYFTREK) are P-gp inhibitors.' No strength word. 'Vanzacaftor (VNZ) and deutivacaftor (D-IVA) (components of ALYFTREK) are inhibitors of BCRP in vitro.' BCRP-substrate use 'has not been studied clinically.' Deutivacaftor 'is an inhibitor of CYP2C9 in vitro'; CYP2C9-substrate use 'has not been studied clinically,' and the labeled action is caution plus 'Monitor the international normalized ratio (INR) more frequently with concomitant use of ALYFTREK with warfarin.' Section 12.3: 'Deutivacaftor inhibits CYP2C8, CYP2C9, and CYP3A4' in vitro, and 'Vanzacaftor, tezacaftor, and deutivacaftor do not induce CYP3A4.' A tezacaftor/ivacaftor study found no clinically significant midazolam change. No inh() or ind() role is coded. Section 12.3: 'Tezacaftor and deutivacaftor are substrates of P-gp, but vanzacaftor is not a substrate of P-gp.' Section 7 gives no P-gp-inhibitor action against ALYFTREK, so no P-gp substrate role is coded. Cardiac electrophysiology: 'clinically significant QTc interval prolongation was not observed,' so this desk does not chip qt. Patient counseling: 'ALYFTREK is best absorbed by the body when taken with food that contains fat.' Educational desk only. Not a dose. Source: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7e635909-c6fd-4f0d-ae77-cdff03653a20",
    }),
];
