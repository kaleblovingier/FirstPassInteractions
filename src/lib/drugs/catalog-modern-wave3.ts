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
      note: "Mavacamten's 2025 sibling — same REMS idea, different enzyme. Label 12.3: metabolized primarily by CYP2C9, and to a lesser extent by CYP3A, CYP2D6, and CYP2C19. Section 2.3 is not a CYP3A-only table. It covers fluconazole or voriconazole, fluvoxamine or a strong CYP2C9 inhibitor, and stopping a moderate-to-strong CYP3A inducer (carbamazepine is the example). Section 4 contraindicates rifampin. The interaction table calls rifampin a strong CYP3A inducer, a strong CYP2C19 inducer, and a moderate CYP2C9 inducer, so that contraindication is not a pure CYP3A story. Voriconazole is listed as a strong CYP3A, moderate CYP2C19, and weak CYP2C9 inhibitor and still has its own change, which is why CYP3A4 stays a major substrate even though the label calls that pathway lesser extent. Major here is not a claim that CYP3A4 is pharmacokinetically co-equal with CYP2C9. In vitro, aficamten is not expected to inhibit CYP1A2, CYP2B6, CYP2C8, CYP2C19, CYP2D6, or CYP3A4, and is not expected to induce CYP1A2, CYP2B6, or CYP3A4, at clinically relevant concentrations. The label does not say it is not expected to induce CYP2C8, CYP2C19, or CYP2D6. No inhibitor or inducer role is coded. It is not a sensitive transporter substrate, so no P-gp grade is stored. Boxed warning: reduces LVEF and can cause heart failure from systolic dysfunction. Do not start if LVEF is under 55% (not recommended). Lower it if LVEF is under 50% and at least 40%. Hold it if LVEF is under 40%. Thorough QT study showed no QTc prolongation across the therapeutic range (12.2), so this desk does not chip it qt-possible. REMS: prescriber and pharmacy certification required (5.2), same structure as Camzyos. Approved and available December 2025. Source: MYQORZO prescribing information, sections 2.1/2.2/2.3/4/5.1/5.3/7.1/12.2/12.3.",
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
    [sub("CYP3A4", "major")],
    ["qt-possible"],
    "Single oral gonorrhea treatment. Moderate or strong CYP3A4 inducers are labeled contraindicated (efficacy loss). A strong CYP3A4 inhibitor raised exposure about 1.4-fold; the label does not call that a clinically significant safety risk. Concentration-dependent QTc signal above the recommended dose.",
    {
      aliases: ["nuzolvence", "azd0914"],
      note: "First new oral drug class for gonorrhea in decades — one oral treatment, novel mechanism (bacterial type II topoisomerase), no cross-resistance with existing classes (12.4). Label 12.3: CYP-mediated clearance is via CYP3A4 (68%), with lesser contributions from CYP1A2, CYP2C9, CYP2C8, and CYP2C19. Itraconazole, a strong CYP3A4 inhibitor, raised AUC about 1.4-fold, and the label says co-administration with a strong CYP3A4 inhibitor is unlikely to translate to a clinically significant safety risk. The row stays a major CYP3A4 substrate because sections 4 and 7.1 contraindicate moderate or strong CYP3A4 inducers: concomitant use of moderate or strong inducers of CYP3A4 with NUZOLVENCE is contraindicated. Rifampin and efavirenz are predicted to cut AUC about 56% and 41%. A major chip next to a strong inhibitor over-reads that inhibitor study. The inducer side is the labeled problem. Also a P-gp and BCRP substrate. The label gives no potency word, so no P-gp grade is stored. It inhibited CYP2C8, CYP2C9, and CYP2C19 in vitro at concentrations about 14- to 28-fold above anticipated unbound therapeutic levels, so no inhibitor role is coded. A thorough QTc study showed a concentration-dependent QTc increase, and clinically significant QTc interval prolongation is not expected at the maximum recommended single dose (12.2). Flagged qt-possible for the teaching stack, not as a crisis. Source: NUZOLVENCE prescribing information, NDA 219491, sections 4/7.1/12.2/12.3/12.4 (https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/219491Orig1s000lbl.pdf).",
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
];
