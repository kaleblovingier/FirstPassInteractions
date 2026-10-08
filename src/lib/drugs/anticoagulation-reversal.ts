/**
 * Comprehensive Anticoagulation Reversal, DOAC Coagulopathy & Hemostatic Kinetics Engine.
 *
 * Authored from the clinical perspective of an MD (Hematologist & Critical Care Physician)
 * & PharmD (Anticoagulation & Hemostasis Clinical Specialist) and Senior Software Engineer.
 *
 * FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support (CDS) Architecture:
 * - Conforms to 21 U.S.C. § 360j(o)(1)(E) and FDA CDS Software Guidance (January 2026).
 * - Intended for licensed hematologists, critical care physicians, emergency medicine
 *   physicians, trauma surgeons, anesthesiologists, clinical pharmacists (PharmD), and
 *   supervised health-professions trainees in accredited programs.
 * - Displays transparent physiological, biochemical, pharmacokinetic, and clinical trial
 *   rationale derived from peer-reviewed literature (ANNEXA-4, ANNEXA-I, RE-VERSE AD, CHEST,
 *   ISTH, ASH, Neurocritical Care Society, and FDA-approved Prescribing Information).
 * - Enables independent clinical verification of the scientific basis of all reversal
 *   strategies, dosing nomograms, and lab interpretation matrices.
 * - STRICTLY NON-PRESCRIPTIVE: Does NOT generate automated medical orders, does NOT emit
 *   closed-loop infusion commands, and does NOT replace individualized bedside clinical
 *   evaluation, institutional anticoagulation stewardship policies, or the FDA-approved PI.
 */

import { DRUG_BY_ID } from "./catalog";
import { type HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

// ============================================================================
// 1. STATUTORY REGULATORY DISCLAIMER (FD&C Act § 520(o)(1)(E))
// ============================================================================

export const ANTICOAGULATION_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support: This educational anticoagulation reversal and hemostatic kinetics engine is intended solely for licensed healthcare professionals (hematologists, critical care physicians, emergency physicians, surgeons, anesthesiologists, and clinical pharmacologists) and supervised health-professions students. It displays pharmacological mechanisms, published clinical trial regimens (ANNEXA-4, RE-VERSE AD), weight- and lab-tiered dosing nomograms, kinetic parameters, and coagulation lab sensitivity matrices to enable independent verification of clinical decisions. It does not provide automated diagnostic conclusions, does not generate medical orders or infusion pump directives, and does not replace individualized bedside clinical evaluation, hospital anticoagulation stewardship protocols, or the FDA-approved Prescribing Information.";

export const ANTICOAGULATION_LITERATURE_CITATIONS: readonly string[] = [
  "Cuker A, et al. American Society of Hematology 2018 guidelines for management of venous thromboembolism: heparin-induced thrombocytopenia. Blood Adv. 2018;2(22):3360-3392.",
  "Warkentin TE, et al. The 4Ts score for heparin-induced thrombocytopenia. J Thromb Haemost. 2006;4(4):759-765.",
  "Warkentin TE. Heparin-induced thrombocytopenia: pathogenesis and management. Br J Haematol. 2003;121(4):535-555.",
  "Connolly SJ, et al. Full study report of andexanet alfa for bleeding associated with factor Xa inhibitors (ANNEXA-4). N Engl J Med. 2019;380(14):1326-1335.",
  "Pollack CV Jr, et al. Idarucizumab for dabigatran reversal - full cohort analysis (RE-VERSE AD). N Engl J Med. 2017;377(5):431-441.",
  "Sarode R, et al. Efficacy and safety of a 4-factor prothrombin complex concentrate in patients on vitamin K antagonists presenting with major bleeding. Circulation. 2013;128(11):1234-1243.",
  "Tomaselli GF, et al. 2020 ACC Expert Consensus Decision Pathway on Management of Bleeding in Patients on Oral Anticoagulants. J Am Coll Cardiol. 2020;76(5):594-622.",
  "Witt DM, et al. American Society of Hematology 2018 guidelines for management of venous thromboembolism: optimal management of anticoagulation therapy. Blood Adv. 2018;2(22):3257-3291.",
  "Frontera JA, et al. Guideline for Reversal of Antithrombotics in Intracranial Hemorrhage: A Statement for Healthcare Professionals from the Neurocritical Care Society and Society of Critical Care Medicine. Neurocrit Care. 2016;24(1):6-46.",
  "Bartholomew JR. Transitioning from argatroban to warfarin in heparin-induced thrombocytopenia: clinical management and avoidance of the INR crossover trap. Chest. 2005;127(5):1656-1663.",
  "Boer C, et al. 2017 EACTS/EACTA Guidelines on patient blood management for adult cardiac surgery. J Cardiothorac Vasc Anesth. 2018;32(1):88-120.",
];

// ============================================================================
// 2. ANTICOAGULANT DRUG TAXONOMY & PHARMACOKINETIC PROFILES
// ============================================================================

export type AnticoagulantClass =
  | "direct-fxa-inhibitor"
  | "direct-thrombin-inhibitor"
  | "vitamin-k-antagonist"
  | "indirect-heparinoid";

export type ReversalAgentId =
  | "andexanet-alfa"
  | "idarucizumab"
  | "four-factor-pcc"
  | "protamine-sulfate"
  | "phytonadione-vitamin-k";

export interface LabSensitivityProfile {
  ptInr: {
    effect: string;
    isSensitive: boolean;
    isQuantitative: boolean;
    clinicalPearl: string;
  };
  aptt: {
    effect: string;
    isSensitive: boolean;
    isQuantitative: boolean;
    clinicalPearl: string;
  };
  thrombinTime?: {
    effect: string;
    isSensitive: boolean;
    isQuantitative: boolean;
    clinicalPearl: string;
  };
  antiXa?: {
    effect: string;
    isSensitive: boolean;
    isQuantitative: boolean;
    clinicalPearl: string;
  };
  ecarinOrDiluteTt?: {
    effect: string;
    isSensitive: boolean;
    isQuantitative: boolean;
    clinicalPearl: string;
  };
}

export interface AnticoagulantProfile {
  id: string;
  name: string;
  brandNames: string[];
  class: AnticoagulantClass;
  mechanism: string;
  primaryTarget: string;
  oralBioavailabilityPct: number | string;
  proteinBindingPct: number;
  renalClearanceFraction: number; // Decimal (e.g. 0.27 for 27%)
  eliminationHalfLife: {
    normalHours: string;
    severeCkdHours?: string;
    notes: string;
  };
  metabolismAndElimination: string;
  dialyzability: {
    isDialyzable: boolean;
    clearancePct?: string;
    notes: string;
  };
  reversalOptions: {
    firstLine: string;
    alternativeOffLabel?: string;
    notes: string;
  };
  labSensitivity: LabSensitivityProfile;
  boxedWarningsAndTraps: string[];
}

export const ANTICOAGULANT_PROFILES: Record<string, AnticoagulantProfile> = {
  apixaban: {
    id: "apixaban",
    name: "Apixaban",
    brandNames: ["Eliquis"],
    class: "direct-fxa-inhibitor",
    mechanism: "Direct, selective, reversible inhibitor of free and clot-bound factor Xa and prothrombinase activity.",
    primaryTarget: "Factor Xa (free and prothrombinase-bound)",
    oralBioavailabilityPct: 50,
    proteinBindingPct: 87,
    renalClearanceFraction: 0.27, // ~27% renal clearance
    eliminationHalfLife: {
      normalHours: "8–15h (mean ~12h)",
      severeCkdHours: "15–18h",
      notes: "Prolonged modestly in severe renal impairment, but mostly cleared hepatically/fecally (~73%).",
    },
    metabolismAndElimination:
      "Hepatic metabolism primarily via CYP3A4 (major), with minor contributions from CYP1A2, 2C8, 2C9, 2C19, and 2J2. Substrate of P-gp and BCRP efflux transporters. ~27% eliminated unchanged in urine; remainder eliminated through biliary and direct intestinal secretion into feces.",
    dialyzability: {
      isDialyzable: false,
      clearancePct: "Negligible (~14% during 4h hemodialysis)",
      notes: "Due to high plasma protein binding (~87%), hemodialysis provides minimal systemic clearance and is ineffective for acute bleed management.",
    },
    reversalOptions: {
      firstLine: "Andexanet alfa (Andexxa, coagulation factor Xa [recombinant], inactivated-zhzo)",
      alternativeOffLabel: "4-Factor Prothrombin Complex Concentrate (4F-PCC / Kcentra) 2,000 units fixed or 25–50 units/kg",
      notes: "Andexanet alfa is the FDA-approved targeted decoy antidote. 4F-PCC is recommended by CHEST/ASH when andexanet is unavailable.",
    },
    labSensitivity: {
      ptInr: {
        effect: "Variable; insensitive at therapeutic concentrations",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl:
          "CRITICAL LAB TRAP: Normal PT/INR does NOT rule out clinically significant apixaban exposure! PT reagents vary widely in sensitivity; up to 30–50% of therapeutic patients have completely normal INR.",
      },
      aptt: {
        effect: "Poorly sensitive; mildly prolonged only at supratherapeutic levels",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "aPTT cannot be used to assess or monitor apixaban anticoagulant intensity.",
      },
      antiXa: {
        effect: "Linearly correlated when calibrated with apixaban standards",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl:
          "Gold standard: Apixaban-calibrated chromogenic anti-Factor Xa assay provides direct quantitative plasma concentration (ng/mL). Heparin-calibrated anti-Xa assays provide only qualitative presence.",
      },
    },
    boxedWarningsAndTraps: [
      "Premature discontinuation increases risk of thrombotic events.",
      "Epidural or spinal hematoma risk with neuraxial anesthesia or spinal puncture.",
      "LAB TRAP: A normal PT/INR does NOT rule out apixaban anticoagulant effect.",
    ],
  },

  rivaroxaban: {
    id: "rivaroxaban",
    name: "Rivaroxaban",
    brandNames: ["Xarelto"],
    class: "direct-fxa-inhibitor",
    mechanism: "Direct, selective, competitive, reversible inhibitor of free and clot-bound factor Xa and prothrombinase activity.",
    primaryTarget: "Factor Xa (free and prothrombinase-bound)",
    oralBioavailabilityPct: "66% fasting; ~100% with food (for 15 mg and 20 mg tablets)",
    proteinBindingPct: 93, // 92-95%
    renalClearanceFraction: 0.33, // ~33% renal clearance as unchanged drug
    eliminationHalfLife: {
      normalHours: "5–9h in young healthy adults; 11–13h in elderly",
      severeCkdHours: "13–15h",
      notes: "Renal clearance drops with declining GFR; terminal half-life extends with age.",
    },
    metabolismAndElimination:
      "Dual elimination pathway: ~66% metabolized by liver (CYP3A4/3A5, CYP2J2, and CYP-independent hydrolysis), of which half excreted in urine and half in feces. ~33% excreted unchanged in urine via active P-gp and BCRP secretion.",
    dialyzability: {
      isDialyzable: false,
      clearancePct: "Negligible",
      notes: "High plasma protein binding (92–95%, predominantly albumin) prevents clearance by hemodialysis.",
    },
    reversalOptions: {
      firstLine: "Andexanet alfa (Andexxa, coagulation factor Xa [recombinant], inactivated-zhzo)",
      alternativeOffLabel: "4-Factor Prothrombin Complex Concentrate (4F-PCC / Kcentra) 2,000 units fixed or 25–50 units/kg",
      notes: "Andexanet alfa is the FDA-approved specific reversal decoy. 4F-PCC is the primary off-label alternative.",
    },
    labSensitivity: {
      ptInr: {
        effect: "Prolonged in a concentration-dependent fashion (reagent-sensitive)",
        isSensitive: true,
        isQuantitative: false,
        clinicalPearl:
          "PT/INR is prolonged by rivaroxaban more sensitively than apixaban (especially Neoplastin CI Plus), but varies by thromboplastin reagent and cannot reliably quantify plasma levels. Normal PT suggests low or absent drug level with sensitive reagents.",
      },
      aptt: {
        effect: "Modestly prolonged; flattens at higher concentrations",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "aPTT is insensitive and non-linear; not recommended for monitoring.",
      },
      antiXa: {
        effect: "Direct linear correlation when calibrated with rivaroxaban standards",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl:
          "Quantitative chromogenic anti-FXa assay calibrated with rivaroxaban standards provides accurate drug concentration (ng/mL).",
      },
    },
    boxedWarningsAndTraps: [
      "Mandatory food requirement: 15 mg and 20 mg tablets must be taken with meals; fasting reduces bioavailability by ~34%.",
      "Premature discontinuation markedly raises ischemic stroke / thromboembolic risk.",
      "Neuraxial hematoma risk with spinal/epidural anesthesia.",
    ],
  },

  edoxaban: {
    id: "edoxaban",
    name: "Edoxaban",
    brandNames: ["Savaysa", "Lixiana"],
    class: "direct-fxa-inhibitor",
    mechanism: "Direct, selective, reversible inhibitor of free factor Xa and prothrombinase activity.",
    primaryTarget: "Factor Xa",
    oralBioavailabilityPct: 62,
    proteinBindingPct: 55,
    renalClearanceFraction: 0.50, // ~50% renal clearance
    eliminationHalfLife: {
      normalHours: "10–14h",
      severeCkdHours: "17–20h",
      notes: "Significant renal dependence (50%); drug accumulates heavily in renal impairment.",
    },
    metabolismAndElimination:
      "~50% cleared unchanged via kidneys (glomerular filtration and active P-gp secretion). ~50% eliminated through biliary/fecal and hepatic pathways. Minimal CYP metabolism (<10%, primarily CYP3A4); carboxylesterase 1 (CES1) hydrolyzes to M4 metabolite.",
    dialyzability: {
      isDialyzable: false,
      clearancePct: "Negligible (~9% over 4h hemodialysis)",
      notes: "Hemodialysis does not meaningfully remove edoxaban despite moderate protein binding (~55%).",
    },
    reversalOptions: {
      firstLine: "4-Factor Prothrombin Complex Concentrate (4F-PCC / Kcentra) 2,000 units fixed or 25–50 units/kg",
      alternativeOffLabel: "Andexanet alfa (unapproved / off-label for edoxaban; proof-of-concept in volunteer studies)",
      notes: "Andexanet alfa is NOT FDA-approved for edoxaban. 4F-PCC is the recommended reversal strategy in current clinical guidelines.",
    },
    labSensitivity: {
      ptInr: {
        effect: "Concentration-dependent prolongation (reagent sensitive)",
        isSensitive: true,
        isQuantitative: false,
        clinicalPearl: "Prolongs PT, but cannot quantify drug levels. Normal PT on sensitive reagent makes high drug concentration unlikely.",
      },
      aptt: {
        effect: "Poor sensitivity; variable response",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "Not useful for quantitative or qualitative clinical assessment.",
      },
      antiXa: {
        effect: "Direct linear correlation when calibrated with edoxaban standards",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl: "Specific edoxaban-calibrated chromogenic anti-FXa is the definitive quantitative test.",
      },
    },
    boxedWarningsAndTraps: [
      "FDA BLACK BOX WARNING: Reduced efficacy in NVAF with CrCl > 95 mL/min. High renal clearance drops edoxaban levels below therapeutic threshold, increasing ischemic stroke rate compared to warfarin.",
      "Premature cessation triggers rebound thromboembolism.",
      "Spinal / epidural hematoma risk.",
    ],
  },

  dabigatran: {
    id: "dabigatran",
    name: "Dabigatran",
    brandNames: ["Pradaxa"],
    class: "direct-thrombin-inhibitor",
    mechanism: "Direct, competitive, reversible inhibitor of free and clot-bound thrombin (Factor IIa).",
    primaryTarget: "Thrombin (Factor IIa)",
    oralBioavailabilityPct: "3–7% (administered as prodrug dabigatran etexilate mesylate)",
    proteinBindingPct: 35, // Low protein binding
    renalClearanceFraction: 0.80, // 80% renal clearance!
    eliminationHalfLife: {
      normalHours: "12–17h",
      severeCkdHours: ">28h (up to 34h in ESRD)",
      notes: "Highest renal clearance fraction among all DOACs (~80%). Massive accumulation in acute kidney injury or chronic renal disease.",
    },
    metabolismAndElimination:
      "Administered as lipophilic prodrug dabigatran etexilate. Converted by carboxylesterases (CES1 in liver, CES2 in gut) to active dabigatran. Conjugated to 4 active acylglucuronides (~10–20% of circulating activity). ~80% excreted unchanged in urine via glomerular filtration.",
    dialyzability: {
      isDialyzable: true,
      clearancePct: "~50–60% cleared over a 4-hour hemodialysis session",
      notes: "CRITICAL: The ONLY DOAC meaningfully dialyzable! Due to low protein binding (~35%) and moderate Vd (~50–70 L), hemodialysis removes ~50–60% over 4 hours. However, idarucizumab is preferred for emergency reversal due to immediate onset without need for vascular access.",
    },
    reversalOptions: {
      firstLine: "Idarucizumab (Praxbind) 5 g IV (two consecutive 2.5 g / 50 mL vials within 15 min)",
      alternativeOffLabel: "4-Factor Prothrombin Complex Concentrate (4F-PCC / Kcentra) 2,000 units or 50 units/kg OR emergent hemodialysis",
      notes: "Idarucizumab is the FDA-approved specific humanized Fab antibody fragment with 350-fold higher affinity for dabigatran than thrombin.",
    },
    labSensitivity: {
      ptInr: {
        effect: "Insensitive; prolongs only at very high concentrations",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "PT/INR is NOT reliable for dabigatran evaluation.",
      },
      aptt: {
        effect: "Prolonged curvi-linearly; sensitive at on-therapy concentrations, flattens at supratherapeutic levels",
        isSensitive: true,
        isQuantitative: false,
        clinicalPearl: "Normal aPTT generally excludes excess dabigatran levels; elevated aPTT confirms presence but flattens above 200 ng/mL.",
      },
      thrombinTime: {
        effect: "EXQUISITELY SENSITIVE (even trace dabigatran <10 ng/mL prolongs TT beyond measurable limit)",
        isSensitive: true,
        isQuantitative: false,
        clinicalPearl:
          "CRITICAL LAB TRAP: Normal Thrombin Time (TT) reliably EXCLUDES clinically meaningful dabigatran exposure! If TT is normal, significant dabigatran presence is ruled out. If TT is prolonged, dTT or ECT is needed for quantification.",
      },
      ecarinOrDiluteTt: {
        effect: "Linear direct correlation across entire therapeutic and supratherapeutic range",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl:
          "Dilute Thrombin Time (Hemoclot dTT) and Ecarin Clotting Time (ECT) / Ecarin Chromogenic Assay (ECA) provide linear quantitative dabigatran concentration.",
      },
    },
    boxedWarningsAndTraps: [
      "CAPSULE INTEGRITY WARNING: Do NOT open, chew, or crush capsules! Emptying pellets increases oral bioavailability by +75%, causing catastrophic exposure spikes and hemorrhage.",
      "Premature discontinuation leads to rebound ischemic strokes.",
      "Extreme renal clearance (80%): Contraindicated in mechanical heart valves and severely impaired renal function.",
    ],
  },

  argatroban: {
    id: "argatroban",
    name: "Argatroban",
    brandNames: ["Argatroban"],
    class: "direct-thrombin-inhibitor",
    mechanism: "Synthetic univalent direct, reversible inhibitor of thrombin (Factor IIa), derived from L-arginine.",
    primaryTarget: "Thrombin (Factor IIa active site)",
    oralBioavailabilityPct: "IV continuous infusion only",
    proteinBindingPct: 54,
    renalClearanceFraction: 0.16, // < 20% renal clearance
    eliminationHalfLife: {
      normalHours: "39–51 minutes",
      severeCkdHours: "39–51 minutes (unaltered by renal dysfunction)",
      notes: "Elimination half-life markedly prolonged in hepatic impairment (stretching to 181 minutes).",
    },
    metabolismAndElimination:
      "Hepatic metabolism via CYP3A4/5 hydroxylation and aromatization. Fecal excretion (~65%) is primary route; urine excretion ~22% (only 16% unchanged drug). Ideal for heparin-induced thrombocytopenia (HIT) in renal failure.",
    dialyzability: {
      isDialyzable: false,
      clearancePct: "Negligible (~20%)",
      notes: "Hemodialysis does not remove argatroban; cleared rapidly by liver.",
    },
    reversalOptions: {
      firstLine: "Discontinue infusion (short 40-minute half-life allows rapid spontaneous hemostatic recovery)",
      alternativeOffLabel: "Supportive hemostatic therapy, 4F-PCC, or rFVIIa for refractory life-threatening hemorrhage",
      notes: "No specific targeted antidote exists. Normal liver function clears drug within 2–4 hours of stopping infusion.",
    },
    labSensitivity: {
      ptInr: {
        effect: "SIGNIFICANTLY prolongs PT/INR (falsely elevates INR up to 4.0–5.0 at therapeutic aPTT)",
        isSensitive: true,
        isQuantitative: false,
        clinicalPearl:
          "CRITICAL ARGATROBAN LAB TRAP: Argatroban profoundly elevates PT/INR (falsely elevates INR). When bridging from argatroban to warfarin, INR is artifactually elevated. Target co-infusion INR > 4.0 before stopping argatroban, then re-check INR 4–6h post-infusion.",
      },
      aptt: {
        effect: "Dose-dependent prolongation; standard monitoring parameter",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl: "Titrated to target aPTT of 1.5 to 3.0 times patient baseline (not to exceed 100 seconds).",
      },
      thrombinTime: {
        effect: "Highly prolonged",
        isSensitive: true,
        isQuantitative: false,
        clinicalPearl: "Direct thrombin inhibition prolongs TT immediately.",
      },
    },
    boxedWarningsAndTraps: [
      "Artifactual PT/INR elevation complicates transition to warfarin in HIT patients.",
      "Hepatic dose reduction mandatory (decrease initial infusion rate from 2 mcg/kg/min to 0.5 mcg/kg/min in hepatic impairment).",
    ],
  },

  bivalirudin: {
    id: "bivalirudin",
    name: "Bivalirudin",
    brandNames: ["Angiomax"],
    class: "direct-thrombin-inhibitor",
    mechanism: "Synthetic 20-amino acid peptide bivalent direct thrombin inhibitor (binds both catalytic active site and exosite 1).",
    primaryTarget: "Thrombin (bivalent binding)",
    oralBioavailabilityPct: "IV continuous infusion only",
    proteinBindingPct: 0,
    renalClearanceFraction: 0.20, // ~20% renal clearance
    eliminationHalfLife: {
      normalHours: "25 minutes",
      severeCkdHours: "57 minutes in severe CKD; up to 3.5h in dialysis-dependent patients",
      notes: "Primarily cleaved proteolytically by thrombin itself (80%); remaining 20% eliminated renally.",
    },
    metabolismAndElimination:
      "~80% cleared via enzymatic cleavage by thrombin; ~20% cleared unchanged by glomerular filtration. Cleavage releases active thrombin catalytic site over time.",
    dialyzability: {
      isDialyzable: true,
      clearancePct: "~25% cleared by hemodialysis",
      notes: "Partial hemodialysis clearance; ultrafiltration removes peptide.",
    },
    reversalOptions: {
      firstLine: "Discontinue infusion (ultra-short 25-minute half-life restores hemostasis rapidly)",
      alternativeOffLabel: "Supportive hemostatic therapy, 4F-PCC, or rFVIIa",
      notes: "No specific antidote. Hemostasis typically normalizes within 1–2 hours of stopping infusion in normal renal function.",
    },
    labSensitivity: {
      ptInr: {
        effect: "Mild to moderate prolongation",
        isSensitive: true,
        isQuantitative: false,
        clinicalPearl: "Less confounding than argatroban on INR.",
      },
      aptt: {
        effect: "Prolonged; used for ICU monitoring (target 1.5–2.5x control)",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl: "Monitored via aPTT in medical/cardiac ICU, or ACT (Activated Clotting Time 300–350 sec) in cardiac cath lab.",
      },
    },
    boxedWarningsAndTraps: [
      "Accumulates in severe renal impairment (extend infusion stop time prior to surgery).",
      "Acute stent thrombosis risk if under-dosed in PCI.",
    ],
  },

  warfarin: {
    id: "warfarin",
    name: "Warfarin",
    brandNames: ["Coumadin", "Jantoven"],
    class: "vitamin-k-antagonist",
    mechanism:
      "Competitive inhibition of Vitamin K Epoxide Reductase Complex Subunit 1 (VKORC1), blocking conversion of vitamin K 2,3-epoxide to reduced vitamin K (hydroquinone / KH2). Depletes essential cofactor for hepatic gamma-glutamyl carboxylase, halting gamma-carboxylation of glutamic acid residues on factors II, VII, IX, X, and regulatory Proteins C and S.",
    primaryTarget: "VKORC1 (Vitamin K Epoxide Reductase)",
    oralBioavailabilityPct: ">95%",
    proteinBindingPct: 99, // Bound to albumin
    renalClearanceFraction: 0.01, // < 2% unchanged drug
    eliminationHalfLife: {
      normalHours: "20–60 hours (mean ~40 hours; S-warfarin 29h, R-warfarin 45h)",
      severeCkdHours: "20–60 hours",
      notes: "Clotting factor half-lives govern onset and offset of biological effect, NOT drug clearance alone.",
    },
    metabolismAndElimination:
      "Racemic mixture: S-warfarin is 3- to 5-fold more biologically potent than R-warfarin and is cleared primarily by hepatic CYP2C9 (sensitive to 2C9 inhibitors like amiodarone, TMP-SMX, metronidazole, fluconazole). R-warfarin is metabolized by CYP1A2, CYP3A4, and CYP2C19. Inactive metabolites excreted in urine and feces.",
    dialyzability: {
      isDialyzable: false,
      clearancePct: "Negligible",
      notes: "Extremely high protein binding (~99% albumin) precludes dialytic removal.",
    },
    reversalOptions: {
      firstLine: "4-Factor Prothrombin Complex Concentrate (4F-PCC / Kcentra) + Concurrent IV Vitamin K (Phytonadione 10 mg)",
      alternativeOffLabel: "Fresh Frozen Plasma (FFP 15–30 mL/kg) if 4F-PCC unavailable",
      notes:
        "4F-PCC provides immediate non-activated factors II, VII, IX, and X. Mandatory concurrent IV Vitamin K (10 mg slow IV push over 30 min) is required to sustain factor synthesis as infused FVII (half-life ~6h) decays.",
    },
    labSensitivity: {
      ptInr: {
        effect: "Standard therapeutic monitoring metric; international normalized ratio",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl:
          "Target INR 2.0–3.0 (atrial fibrillation, DVT/PE) or 2.5–3.5 (mechanical mitral valves). INR reflects Factor VII drop first (t1/2 ~6h), so early therapeutic INR on initiation does NOT reflect full antithrombotic protection until prothrombin (FII, t1/2 ~60h) is suppressed.",
      },
      aptt: {
        effect: "Prolonged at supratherapeutic INR (>3.5)",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "aPTT can prolong when factors IX, X, or II are severely depleted.",
      },
    },
    boxedWarningsAndTraps: [
      "FACTOR HALF-LIFE TRAP: Factor VII decays in ~6 hours; Factor II (prothrombin) decays in ~60 hours; Protein C decays in ~8 hours. Early warfarin administration without bridging causes a transient hypercoagulable state due to rapid Protein C drop (warfarin-induced skin necrosis risk).",
      "MANDATORY VITAMIN K RULE: Reversing warfarin with 4F-PCC WITHOUT concurrent Vitamin K causes rebound INR elevation in 12–24 hours because infused Factor VII decays in 6 hours while endogenous synthesis remains blocked by residual warfarin.",
      "Extensive CYP2C9 drug interactions (amiodarone, fluconazole, Bactrim dramatically amplify bleeding risk).",
    ],
  },

  heparin: {
    id: "heparin",
    name: "Unfractionated Heparin (UFH)",
    brandNames: ["Heparin Sodium"],
    class: "indirect-heparinoid",
    mechanism:
      "Binds antithrombin III (AT) via a unique high-affinity pentasaccharide sequence, inducing a 1000-fold conformational acceleration of AT-mediated inactivation of thrombin (Factor IIa) and Factor Xa in an equimolar (1:1) ratio. Ternary complex formation with thrombin requires chains >=18 saccharide units (MW > 5,400 Da).",
    primaryTarget: "Antithrombin III (accelerating inhibition of FIIa and FXa 1:1)",
    oralBioavailabilityPct: "IV or subcutaneous only",
    proteinBindingPct: 90, // Extensive nonspecific binding to acute-phase proteins, vitronectin, PF4, endothelial cells
    renalClearanceFraction: 0.10,
    eliminationHalfLife: {
      normalHours: "30–90 minutes (dose-dependent saturable kinetics)",
      severeCkdHours: "60–120 minutes",
      notes: "Combination of rapid saturable cellular/reticuloendothelial clearance and slower nonsaturable renal clearance.",
    },
    metabolismAndElimination:
      "Depolymerized and desulfated by reticuloendothelial system (RES) and endothelial cells; degraded fragments eliminated in urine.",
    dialyzability: {
      isDialyzable: false,
      clearancePct: "Negligible",
      notes: "Large molecular weight (3,000–30,000 Da, mean 15,000 Da) and nonspecific binding prevent dialytic clearance.",
    },
    reversalOptions: {
      firstLine: "Protamine sulfate IV (1 mg per 100 units heparin administered in previous 2–3h; max 50 mg)",
      alternativeOffLabel: "Time / spontaneous offset (half-life 60 min)",
      notes: "Protamine completely neutralizes 100% of unfractionated heparin's anti-IIa and anti-Xa activity via electrostatic salt formation.",
    },
    labSensitivity: {
      ptInr: {
        effect: "Prolonged only at high concentrations (>0.4 U/mL)",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "Reagent thromboplastins often contain heparin neutralizers.",
      },
      aptt: {
        effect: "Dose-dependent prolongation; canonical monitoring parameter",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl: "Target aPTT is typically 1.5–2.5 times baseline control (corresponding to 60–85 seconds).",
      },
      antiXa: {
        effect: "Linear correlation; gold standard therapeutic monitoring",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl: "Unfractionated heparin anti-Xa therapeutic target is 0.3–0.7 IU/mL.",
      },
      thrombinTime: {
        effect: "Exquisitely prolonged",
        isSensitive: true,
        isQuantitative: false,
        clinicalPearl: "Even minute UFH contamination prolongs TT.",
      },
    },
    boxedWarningsAndTraps: [
      "Heparin-Induced Thrombocytopenia (HIT) Type II: Immune-mediated PF4-heparin antibody activation causing catastrophic venous/arterial thrombosis.",
      "Heparin resistance: Due to antithrombin deficiency (consumption in shock, DIC, ECMO) or high acute phase reactants.",
    ],
  },

  enoxaparin: {
    id: "enoxaparin",
    name: "Enoxaparin",
    brandNames: ["Lovenox"],
    class: "indirect-heparinoid",
    mechanism:
      "Low Molecular Weight Heparin (mean MW ~4,500 Da) derived from chemical/enzymatic depolymerization of porcine heparin. Accelerates antithrombin III inhibition of Factor Xa with high selectivity (anti-Xa:anti-IIa activity ratio of ~3.8:1), because shorter polysaccharide chains lack the minimum 18-saccharide length needed to bridge AT to thrombin.",
    primaryTarget: "Antithrombin III (accelerating FXa >> FIIa inhibition ~3.8:1)",
    oralBioavailabilityPct: "~100% subcutaneous",
    proteinBindingPct: 10, // Minimal non-specific protein binding
    renalClearanceFraction: 0.40, // 40% cleared unchanged by kidneys
    eliminationHalfLife: {
      normalHours: "4.5–7 hours",
      severeCkdHours: "Up to 16 hours in severe renal impairment (CrCl < 30 mL/min)",
      notes: "Severe accumulation occurs in renal failure; dose adjustment mandatory.",
    },
    metabolismAndElimination:
      "Hepatic desulfation and depolymerization to smaller fragments; eliminated primarily via renal filtration (~40% active unchanged drug).",
    dialyzability: {
      isDialyzable: false,
      clearancePct: "Negligible",
      notes: "Not removed by hemodialysis.",
    },
    reversalOptions: {
      firstLine: "Protamine sulfate IV (1 mg per 1 mg enoxaparin administered within <= 8h; max 50 mg)",
      alternativeOffLabel: "4-Factor PCC or rFVIIa for refractory life-threatening bleeding",
      notes:
        "CRITICAL LMWH LIMITATION: Protamine only neutralizes ~60% of enoxaparin anti-Factor Xa activity (while reversing ~100% of anti-IIa activity). Partial neutralization must be factored into ongoing clinical assessment.",
    },
    labSensitivity: {
      ptInr: {
        effect: "Insensitive; no meaningful change",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "PT/INR is completely useless for LMWH assessment.",
      },
      aptt: {
        effect: "Insensitive at standard therapeutic doses",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "aPTT cannot be used to monitor enoxaparin.",
      },
      antiXa: {
        effect: "Linear correlation; therapeutic monitoring parameter",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl:
          "Measured 4 hours post-subcutaneous dose (peak level). Target: 0.6–1.0 IU/mL for twice-daily dosing; 1.0–2.0 IU/mL for once-daily dosing.",
      },
    },
    boxedWarningsAndTraps: [
      "PARTIAL REVERSAL TRAP: Protamine neutralizes only ~60% of anti-Xa activity. Do not assume protamine gives 100% cure for enoxaparin bleeding.",
      "Renal accumulation: In CrCl < 30 mL/min, reduce therapeutic dosing from 1 mg/kg BID to 1 mg/kg once daily.",
      "Spinal / epidural hematoma boxed warning.",
    ],
  },

  dalteparin: {
    id: "dalteparin",
    name: "Dalteparin",
    brandNames: ["Fragmin"],
    class: "indirect-heparinoid",
    mechanism: "Low Molecular Weight Heparin (mean MW ~6,000 Da) with anti-Xa to anti-IIa activity ratio of ~2.7:1 via antithrombin III.",
    primaryTarget: "Antithrombin III (FXa >> FIIa ~2.7:1)",
    oralBioavailabilityPct: "~87% subcutaneous",
    proteinBindingPct: 15,
    renalClearanceFraction: 0.35,
    eliminationHalfLife: {
      normalHours: "3–5 hours",
      severeCkdHours: "8–10 hours",
      notes: "Renal clearance; accumulates in kidney disease.",
    },
    metabolismAndElimination: "Renal excretion of active and inactive fragments.",
    dialyzability: {
      isDialyzable: false,
      clearancePct: "Negligible",
      notes: "Not cleared by dialysis.",
    },
    reversalOptions: {
      firstLine: "Protamine sulfate IV (1 mg per 100 anti-Xa units dalteparin administered in prior 8h; max 50 mg)",
      alternativeOffLabel: "4-Factor PCC for refractory severe bleeding",
      notes: "Partially neutralizes anti-Xa activity (~60–75%).",
    },
    labSensitivity: {
      ptInr: {
        effect: "Insensitive",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "PT/INR not useful.",
      },
      aptt: {
        effect: "Insensitive",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "aPTT not useful.",
      },
      antiXa: {
        effect: "Gold standard; measured 4h post-dose",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl: "Target 0.5–1.0 IU/mL (BID) or 1.0–1.5 IU/mL (QD) for treatment.",
      },
    },
    boxedWarningsAndTraps: [
      "Neuraxial hematoma risk with spinal/epidural anesthesia.",
      "Partial protamine neutralization.",
    ],
  },

  fondaparinux: {
    id: "fondaparinux",
    name: "Fondaparinux",
    brandNames: ["Arixtra"],
    class: "indirect-heparinoid",
    mechanism:
      "Synthetic pentasaccharide identical to the antithrombin-binding domain of heparin (MW 1,728 Da). Pure, selective indirect Factor Xa inhibitor via AT with zero thrombin (FIIa) inhibition (anti-Xa:anti-IIa ratio > 100:0).",
    primaryTarget: "Antithrombin III (selective FXa only, 0% FIIa)",
    oralBioavailabilityPct: "100% subcutaneous",
    proteinBindingPct: 94, // Specifically bound to antithrombin III
    renalClearanceFraction: 1.00, // 100% eliminated unchanged in urine!
    eliminationHalfLife: {
      normalHours: "17–21 hours",
      severeCkdHours: "Significantly prolonged (>30–40 hours in CrCl < 30 mL/min)",
      notes: "Strictly contraindicated in severe renal impairment (CrCl < 30 mL/min).",
    },
    metabolismAndElimination: "100% excreted unchanged by the kidneys. No hepatic metabolism.",
    dialyzability: {
      isDialyzable: false,
      clearancePct: "Negligible (~20% during prolonged high-flux dialysis)",
      notes: "Dialysis is clinically insufficient for acute bleeding.",
    },
    reversalOptions: {
      firstLine: "NO SPECIFIC ANTIDOTE! Protamine sulfate has ZERO effect on fondaparinux.",
      alternativeOffLabel: "Recombinant Factor VIIa (rFVIIa 90 mcg/kg) or 4F-PCC (50 units/kg) as salvage therapy",
      notes:
        "CRITICAL PROTAMINE TRAP: Protamine sulfate does NOT neutralize fondaparinux! The short synthetic pentasaccharide chain lacks the basic polyanionic charge density required for protamine salt complexation.",
    },
    labSensitivity: {
      ptInr: {
        effect: "Completely insensitive",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "PT/INR cannot evaluate fondaparinux.",
      },
      aptt: {
        effect: "Insensitive at standard doses",
        isSensitive: false,
        isQuantitative: false,
        clinicalPearl: "aPTT is not altered by fondaparinux.",
      },
      antiXa: {
        effect: "Linear correlation; requires fondaparinux-calibrated anti-Xa",
        isSensitive: true,
        isQuantitative: true,
        clinicalPearl: "Calibrated fondaparinux anti-Xa (mg/L) is the only valid laboratory measure.",
      },
    },
    boxedWarningsAndTraps: [
      "ZERO REVERSIBILITY BY PROTAMINE: Protamine sulfate does NOT reverse fondaparinux! Administration is useless and exposes patient to protamine anaphylaxis without hemostatic benefit.",
      "Strict contraindication: CrCl < 30 mL/min or body weight < 50 kg for VTE prophylaxis.",
      "Long half-life (17–21h) makes bleed management prolonged and challenging.",
    ],
  },
};

// ============================================================================
// 3. HEPARIN-INDUCED THROMBOCYTOPENIA (HIT) 4TS SCORING & TRIAGE ENGINE
// ============================================================================

export type HitProbabilityTier = "Low" | "Intermediate" | "High";

export type HitTimingCategory =
  | "days_5_10_or_rapid_within_30d"
  | "day_gt_10_or_rapid_30_100d"
  | "day_le_4_without_recent_heparin";

export type HitThrombosisCategory =
  | "proven_new_necrosis_acute_systemic"
  | "progressive_suspected_erythema"
  | "none";

export type HitOtherCausesCategory =
  | "none_apparent"
  | "possible"
  | "definite";

export interface Hit4TsInput {
  thrombocytopeniaScore?: 0 | 1 | 2;
  timingScore?: 0 | 1 | 2;
  thrombosisScore?: 0 | 1 | 2;
  otherCausesScore?: 0 | 1 | 2;
  // Raw parameters for automated evaluation
  baselinePlateletCount?: number;
  nadirPlateletCount?: number;
  timingCategory?: HitTimingCategory;
  thrombosisCategory?: HitThrombosisCategory;
  otherCausesCategory?: HitOtherCausesCategory;
}

export interface Hit4TsResult {
  totalScore: number;
  thrombocytopeniaScore: number;
  timingScore: number;
  thrombosisScore: number;
  otherCausesScore: number;
  probabilityTier: HitProbabilityTier;
  preTestProbabilityPct: string;
  clinicalInterpretation: string;
  recommendedActions: {
    cessationOfAllHeparin: boolean;
    orderPf4Elisa: boolean;
    orderFunctionalSra: boolean;
    initiateAlternativeAnticoagulant: boolean;
    avoidPlateletTransfusions: boolean;
    recommendedAlternativeAgents: string[];
    actionSummary: string;
  };
  scoringBreakdown: {
    thrombocytopenia: string;
    timing: string;
    thrombosis: string;
    otherCauses: string;
  };
}

/**
 * Evaluates the Thrombocytopenia component of the 4Ts score based on platelet drop and nadir.
 * 2 pts: >50% drop and nadir >= 20,000 /mcL
 * 1 pt: 30%–50% drop or nadir 10,000–19,000 /mcL
 * 0 pt: <30% drop or nadir < 10,000 /mcL
 */
export function evaluateThrombocytopeniaScore(baselinePlatelets: number, nadirPlatelets: number): 0 | 1 | 2 {
  if (baselinePlatelets <= 0 || nadirPlatelets < 0) return 0;
  // If inputs are in thousands (e.g. 250, 60) vs absolute counts (250000, 60000)
  const normBaseline = baselinePlatelets > 1000 ? baselinePlatelets / 1000 : baselinePlatelets;
  const normNadir = nadirPlatelets > 1000 ? nadirPlatelets / 1000 : nadirPlatelets;

  const dropPct = ((normBaseline - normNadir) / normBaseline) * 100;

  if (dropPct > 50 && normNadir >= 20) {
    return 2;
  }
  if ((dropPct >= 30 && dropPct <= 50) || (normNadir >= 10 && normNadir < 20)) {
    return 1;
  }
  return 0;
}

/**
 * Calculates the Heparin-Induced Thrombocytopenia (HIT) 4Ts score (0 to 8 points)
 * and stratifies pre-test probability according to Warkentin / ASH guidelines.
 */
export function calculateHit4TsScore(params: Hit4TsInput): Hit4TsResult {
  let tScore: 0 | 1 | 2 = params.thrombocytopeniaScore ?? 0;
  if (
    params.thrombocytopeniaScore === undefined &&
    params.baselinePlateletCount !== undefined &&
    params.nadirPlateletCount !== undefined
  ) {
    tScore = evaluateThrombocytopeniaScore(params.baselinePlateletCount, params.nadirPlateletCount);
  }

  let timingScore: 0 | 1 | 2 = params.timingScore ?? 0;
  if (params.timingScore === undefined && params.timingCategory) {
    if (params.timingCategory === "days_5_10_or_rapid_within_30d") timingScore = 2;
    else if (params.timingCategory === "day_gt_10_or_rapid_30_100d") timingScore = 1;
    else timingScore = 0;
  }

  let thrombosisScore: 0 | 1 | 2 = params.thrombosisScore ?? 0;
  if (params.thrombosisScore === undefined && params.thrombosisCategory) {
    if (params.thrombosisCategory === "proven_new_necrosis_acute_systemic") thrombosisScore = 2;
    else if (params.thrombosisCategory === "progressive_suspected_erythema") thrombosisScore = 1;
    else thrombosisScore = 0;
  }

  let otherCausesScore: 0 | 1 | 2 = params.otherCausesScore ?? 0;
  if (params.otherCausesScore === undefined && params.otherCausesCategory) {
    if (params.otherCausesCategory === "none_apparent") otherCausesScore = 2;
    else if (params.otherCausesCategory === "possible") otherCausesScore = 1;
    else otherCausesScore = 0;
  }

  const totalScore = tScore + timingScore + thrombosisScore + otherCausesScore;

  let probabilityTier: HitProbabilityTier;
  let preTestProbabilityPct: string;
  let clinicalInterpretation: string;

  if (totalScore <= 3) {
    probabilityTier = "Low";
    preTestProbabilityPct = "< 2%";
    clinicalInterpretation =
      "Low pre-test probability (< 2%). High negative predictive value (> 99%). Routine laboratory HIT antibody testing and cessation of heparin are NOT indicated. Continue heparin therapy as indicated, observe platelet counts, and investigate alternative non-HIT etiologies for thrombocytopenia.";
  } else if (totalScore <= 5) {
    probabilityTier = "Intermediate";
    preTestProbabilityPct = "~14%";
    clinicalInterpretation =
      "Intermediate pre-test probability (~14%). Moderate risk of clinical HIT. Immediate cessation of all heparin products (including heparin flushes, LMWH, catheter locks, heparin-bonded lines) is required. Order PF4-heparin ELISA immunoassay and confirmatory functional Serotonin Release Assay (SRA). Switch immediately to alternative non-heparin anticoagulation (Argatroban, Bivalirudin, or Fondaparinux). Avoid prophylactic platelet transfusions (risk of paradoxical thrombotic surge).";
  } else {
    probabilityTier = "High";
    preTestProbabilityPct = "~64%";
    clinicalInterpretation =
      "High pre-test probability (~64%). Severe risk of life-threatening heparin-induced thrombotic storm. Immediate cessation of all heparin products (flushes, locks, LMWH, UFH). Order PF4-heparin ELISA and confirmatory SRA. Immediately initiate therapeutic non-heparin anticoagulation (Argatroban, Bivalirudin, or Fondaparinux). Prophylactic platelet transfusions are strictly CONTRAINDICATED (paradoxical thrombotic surge). Obtain bilateral lower extremity venous compression duplex ultrasound to screen for occult DVT.";
  }

  const isIntermediateOrHigh = totalScore >= 4;

  const recommendedActions = {
    cessationOfAllHeparin: isIntermediateOrHigh,
    orderPf4Elisa: isIntermediateOrHigh,
    orderFunctionalSra: isIntermediateOrHigh,
    initiateAlternativeAnticoagulant: isIntermediateOrHigh,
    avoidPlateletTransfusions: isIntermediateOrHigh,
    recommendedAlternativeAgents: isIntermediateOrHigh
      ? [
          "Argatroban (preferred in renal impairment)",
          "Bivalirudin (preferred in hepatic impairment / PCI / cardiac surgery)",
          "Fondaparinux (if hemodynamically stable and CrCl > 30 mL/min)",
        ]
      : [],
    actionSummary: isIntermediateOrHigh
      ? "IMMEDIATE CESSATION of all heparin products (unfractionated heparin, LMWH, heparin flushes, catheter locks). Order PF4-heparin ELISA and confirmatory Serotonin Release Assay (SRA). Initiate non-heparin alternative anticoagulant (Argatroban, Bivalirudin, or Fondaparinux). Avoid prophylactic platelet transfusions due to extreme risk of paradoxical arterial/venous thrombotic occlusion."
      : "Continue heparin if clinically indicated. Observe platelet trends. Do not order PF4 ELISA reflexively due to high false-positive rate of non-pathogenic antibodies in low probability patients.",
  };

  const scoringBreakdown = {
    thrombocytopenia:
      tScore === 2
        ? "2 pts: Platelet drop > 50% AND nadir >= 20,000 /mcL"
        : tScore === 1
        ? "1 pt: Platelet drop 30%–50% OR nadir 10,000–19,000 /mcL"
        : "0 pts: Platelet drop < 30% OR nadir < 10,000 /mcL",
    timing:
      timingScore === 2
        ? "2 pts: Clear drop between days 5–10, or <= 1 day with heparin exposure within past 30 days"
        : timingScore === 1
        ? "1 pt: Consistent with days 5–10 fall (missing counts), onset > day 10, or <= 1 day with heparin 30–100 days ago"
        : "0 pts: Platelet drop <= day 4 without recent heparin exposure",
    thrombosis:
      thrombosisScore === 2
        ? "2 pts: Proven new thrombosis (venous/arterial), skin necrosis at injection site, or acute systemic reaction post-bolus"
        : thrombosisScore === 1
        ? "1 pt: Progressive/recurrent thrombosis, erythematous skin lesions, or suspected thrombosis"
        : "0 pts: None",
    otherCauses:
      otherCausesScore === 2
        ? "2 pts: None apparent (no alternative etiology identified)"
        : otherCausesScore === 1
        ? "1 pt: Possible alternative cause present (sepsis, ICU hemodilution, medications)"
        : "0 pts: Definite alternative cause present (severe DIC, cardiopulmonary bypass, chemotherapy)",
  };

  return {
    totalScore,
    thrombocytopeniaScore: tScore,
    timingScore,
    thrombosisScore,
    otherCausesScore,
    probabilityTier,
    preTestProbabilityPct,
    clinicalInterpretation,
    recommendedActions,
    scoringBreakdown,
  };
}

// ============================================================================
// 4. NON-HEPARIN DIRECT THROMBIN INHIBITOR (DTI) KINETICS & WARFARIN TRANSITION
// ============================================================================

export interface ArgatrobanKineticsParams {
  weightKg: number;
  hepaticImpairment?: "none" | "moderate" | "severe_shock";
  baselineApttSeconds?: number;
}

export interface ArgatrobanKineticsResult {
  agentName: string;
  molecularWeightDa: number;
  mechanism: string;
  primaryClearancePathway: string;
  isPreferredInRenalImpairment: boolean;
  hepaticStatus: "normal" | "mild_to_moderate" | "severe_shock";
  recommendedInitialInfusionRateMcgKgMin: number;
  calculatedInfusionRateMcgMin: number;
  calculatedInfusionRateMgHr: number;
  targetMonitoringParameter: string;
  eliminationHalfLifeMinutes: string;
  crossoverTrap: {
    trapName: string;
    mechanism: string;
    crossoverInrTargetOnCombinedTherapy: string;
    washoutWaitTimeHours: string;
    postWashoutTherapeuticInrThreshold: number;
    managementProtocol: string[];
  };
}

export function calculateArgatrobanKinetics(params: ArgatrobanKineticsParams): ArgatrobanKineticsResult {
  const { weightKg, hepaticImpairment = "none", baselineApttSeconds = 30 } = params;

  let initialRateMcgKgMin = 2.0;
  let halfLifeDesc = "39–51 minutes (mean ~45 min in normal hepatic function)";

  if (hepaticImpairment === "moderate") {
    initialRateMcgKgMin = 0.5;
    halfLifeDesc = "Prolonged to ~181 minutes (~3 hours) in Child-Pugh B/C or total bilirubin > 1.5 mg/dL";
  } else if (hepaticImpairment === "severe_shock") {
    initialRateMcgKgMin = 0.25;
    halfLifeDesc = "Severely prolonged (>3–4 hours) in critically ill heart failure / cardiogenic shock / multiorgan failure";
  }

  const calculatedInfusionRateMcgMin = weightKg * initialRateMcgKgMin;
  const calculatedInfusionRateMgHr = Number(((calculatedInfusionRateMcgMin * 60) / 1000).toFixed(2));

  return {
    agentName: "Argatroban",
    molecularWeightDa: 508.6,
    mechanism:
      "Synthetic small-molecule univalent direct, reversible competitive inhibitor of thrombin (Factor IIa), derived from L-arginine. Selectively binds catalytic active site of free and clot-bound thrombin.",
    primaryClearancePathway:
      "Hepatic metabolism via CYP3A4/5 hydroxylation and aromatization. Fecal excretion ~65%, urine ~22% (only 16% unchanged drug). Unaffected by renal clearance (<20% renal); PREFERRED anticoagulant in renal impairment, AKI, and ESRD on hemodialysis/CRRT.",
    isPreferredInRenalImpairment: true,
    hepaticStatus:
      hepaticImpairment === "none"
        ? "normal"
        : hepaticImpairment === "moderate"
        ? "mild_to_moderate"
        : "severe_shock",
    recommendedInitialInfusionRateMcgKgMin: initialRateMcgKgMin,
    calculatedInfusionRateMcgMin,
    calculatedInfusionRateMgHr,
    targetMonitoringParameter: `Titrate to target aPTT of 1.5 to 3.0 times patient baseline (typically 45–90 seconds; patient baseline: ${baselineApttSeconds}s -> target ${Math.round(baselineApttSeconds * 1.5)}–${Math.round(baselineApttSeconds * 3.0)}s, not to exceed 100s). Re-check aPTT 2 hours after initiation or rate titration.`,
    eliminationHalfLifeMinutes: halfLifeDesc,
    crossoverTrap: {
      trapName: "ARGATROBAN-WARFARIN CROSSOVER TRAP",
      mechanism:
        "Argatroban artificially prolongs PT/INR by 2- to 3-fold by directly inhibiting thrombin in the prothrombin time assay reagent. When transitioning to warfarin, co-administration produces supratherapeutic INR readings (often > 4.0 to 5.0) that do NOT reflect true intrinsic warfarin-mediated factor depletion.",
      crossoverInrTargetOnCombinedTherapy: "> 4.0 on combined therapy for at least 2 consecutive days",
      washoutWaitTimeHours: "4 to 6 hours after holding/stopping argatroban infusion",
      postWashoutTherapeuticInrThreshold: 2.0,
      managementProtocol: [
        "1. Do NOT discontinue argatroban when the INR reaches standard therapeutic target (2.0–3.0).",
        "2. Co-administer argatroban and warfarin until the INR on COMBINED therapy exceeds > 4.0 (for target INR 2.0–3.0) on 2 consecutive days.",
        "3. Hold / discontinue the argatroban infusion.",
        "4. Re-measure solitary INR in 4 to 6 hours after stopping argatroban (once argatroban has cleared hepatically).",
        "5. If the true solitary warfarin INR is >= 2.0, warfarin is therapeutic and argatroban remains discontinued. If true INR is < 2.0, resume argatroban immediately and titrate warfarin.",
      ],
    },
  };
}

export interface BivalirudinKineticsParams {
  weightKg: number;
  renalStatus?: "normal" | "moderate_ckd" | "severe_ckd" | "esrd_dialysis";
  indication?: "hit_treatment" | "pci";
  baselineApttSeconds?: number;
}

export interface BivalirudinKineticsResult {
  agentName: string;
  molecularWeightDa: number;
  mechanism: string;
  primaryClearancePathway: string;
  isPreferredInHepaticImpairment: boolean;
  renalStatus: "normal" | "moderate_ckd" | "severe_ckd" | "esrd_dialysis";
  indication: "hit_treatment" | "pci";
  recommendedInfusionRateMgKgHr: number;
  calculatedInfusionRateMgHr: number;
  eliminationHalfLifeMinutes: string;
  clinicalPearls: string[];
}

export function calculateBivalirudinKinetics(params: BivalirudinKineticsParams): BivalirudinKineticsResult {
  const { weightKg, renalStatus = "normal", indication = "hit_treatment", baselineApttSeconds = 30 } = params;

  let initialRateMgKgHr = 0.15;
  let halfLifeDesc = "25 minutes (normal renal function)";

  if (indication === "pci") {
    initialRateMgKgHr = 1.75;
    halfLifeDesc = "25 minutes (with 0.75 mg/kg initial IV bolus)";
  } else {
    // HIT treatment
    if (renalStatus === "normal") {
      initialRateMgKgHr = 0.15;
      halfLifeDesc = "25 minutes";
    } else if (renalStatus === "moderate_ckd") {
      initialRateMgKgHr = 0.15;
      halfLifeDesc = "~35–45 minutes";
    } else if (renalStatus === "severe_ckd") {
      initialRateMgKgHr = 0.10;
      halfLifeDesc = "57 minutes in severe CKD (CrCl < 30 mL/min)";
    } else {
      initialRateMgKgHr = 0.05;
      halfLifeDesc = "Prolonged to ~3.5 hours (up to 210 minutes in ESRD on hemodialysis)";
    }
  }

  const calculatedInfusionRateMgHr = Number((weightKg * initialRateMgKgHr).toFixed(2));

  return {
    agentName: "Bivalirudin",
    molecularWeightDa: 2180,
    mechanism:
      "Synthetic 20-amino acid peptide bivalent direct thrombin inhibitor (binds both catalytic active site and exosite 1). Reversible inhibition as thrombin slowly cleaves the Arg3-Pro4 bond of bivalirudin.",
    primaryClearancePathway:
      "Dual clearance: ~80% proteolytic enzymatic cleavage by circulating thrombin and proteases; ~20% renal elimination. PREFERRED in hepatic dysfunction, acute coronary syndrome / PCI, or postcardiac surgery.",
    isPreferredInHepaticImpairment: true,
    renalStatus,
    indication,
    recommendedInfusionRateMgKgHr: initialRateMgKgHr,
    calculatedInfusionRateMgHr,
    eliminationHalfLifeMinutes: halfLifeDesc,
    clinicalPearls: [
      "Preferred over argatroban in patients with acute liver failure or severe hepatic impairment because 80% of clearance is non-organ-dependent proteolytic cleavage.",
      "In HIT treatment without PCI, NO IV bolus is given; initiate continuous infusion directly (0.15–0.20 mg/kg/hr) and titrate to aPTT 1.5–2.5x baseline.",
      "Minimal confounding of PT/INR compared to argatroban, simplifying transition to oral anticoagulation.",
      "Ultra-short half-life (25 min in normal kidney function) enables rapid offset within 1–2 hours of discontinuation if bleeding occurs.",
    ],
  };
}

export interface ArgatrobanWarfarinCrossoverEvaluation {
  currentCombinedInr: number;
  hasExceededTargetInr4: boolean;
  canStopArgatrobanNow: boolean;
  recommendedNextStep: string;
  recheckInrWindowHours: string;
  trueWarfarinInrGoal: string;
  safetyAlert: string;
}

export function evaluateArgatrobanWarfarinCrossover(params: {
  combinedInr: number;
  daysOnCombinedTherapy?: number;
}): ArgatrobanWarfarinCrossoverEvaluation {
  const { combinedInr, daysOnCombinedTherapy = 1 } = params;

  const hasExceededTargetInr4 = combinedInr > 4.0;
  const canStopArgatrobanNow = hasExceededTargetInr4 && daysOnCombinedTherapy >= 2;

  let recommendedNextStep: string;
  let safetyAlert: string;

  if (combinedInr <= 4.0) {
    recommendedNextStep =
      "DO NOT STOP ARGATROBAN! Continue co-administration of argatroban and warfarin. Because argatroban artificially prolongs the INR by 2- to 3-fold, stopping argatroban at an INR <= 4.0 will uncover an unprotective, subtherapeutic solitary warfarin INR (< 2.0). Maintain combined therapy until INR exceeds > 4.0 for at least 2 consecutive days.";
    safetyAlert =
      "CRITICAL CROSSOVER TRAP: Stopping argatroban when the INR reaches standard therapeutic target (2.0–3.0) leads to immediate loss of antithrombotic protection and catastrophic recurrent thrombosis in HIT!";
  } else if (!canStopArgatrobanNow) {
    recommendedNextStep =
      `Combined INR is ${combinedInr.toFixed(1)} (> 4.0), but combined therapy has only been maintained for ${daysOnCombinedTherapy} day(s). Confirm therapeutic combined INR > 4.0 on a second consecutive day before holding argatroban to verify steady-state warfarin factor depression.`;
    safetyAlert =
      "Combined INR has surpassed 4.0. Ensure two consecutive days of combined INR > 4.0 before holding argatroban.";
  } else {
    recommendedNextStep =
      `Combined INR is ${combinedInr.toFixed(1)} (> 4.0) on consecutive days. HOLD argatroban infusion now. Wait 4 to 6 hours for argatroban washout (hepatic clearance). Re-measure solitary INR. If solitary INR is >= 2.0, warfarin is therapeutic and argatroban remains stopped. If < 2.0, resume argatroban immediately.`;
    safetyAlert =
      "Ready for argatroban hold. Hold infusion, wait 4–6 hours for complete hepatic clearance of argatroban, and measure true solitary warfarin INR.";
  }

  return {
    currentCombinedInr: combinedInr,
    hasExceededTargetInr4,
    canStopArgatrobanNow,
    recommendedNextStep,
    recheckInrWindowHours: "4 to 6 hours post-argatroban discontinuation",
    trueWarfarinInrGoal: ">= 2.0 (target 2.0–3.0)",
    safetyAlert,
  };
}

// ============================================================================
// 5. TARGETED REVERSAL AGENTS & DOSING PROTOCOL ENGINES
// ============================================================================

export interface AndexanetAlfaProtocolResult {
  agent: "apixaban" | "rivaroxaban";
  lastDoseMg: number;
  hoursSinceLastDose: number;
  regimenTier: "Low Dose" | "High Dose";
  isHighDose: boolean;
  ivBolusMg: number;
  ivBolusRateMgMin: number;
  ivBolusDurationMinutes: number;
  continuousInfusionMg: number;
  continuousInfusionRateMgMin: number;
  continuousInfusionDurationHours: number;
  totalDoseMg: number;
  vialsRequired: {
    vials100mgOnly: number;
    vials200mgOnly: number;
  };
  clinicalRationale: string;
  trialBenchmark: string;
  safetyWarnings: {
    prothromboticRisk: string;
    heparinResistance: string;
    offLabelRestrictions: string;
  };
}

/**
 * Calculates Andexanet alfa (Andexxa) dosing according to ANNEXA-4 trial criteria.
 *
 * Low Dose Criteria:
 * - Apixaban <= 5 mg last dose OR
 * - Rivaroxaban <= 10 mg last dose OR
 * - Either drug taken > 8 hours ago (or unknown timing > 8 hours).
 *
 * High Dose Criteria:
 * - Apixaban > 5 mg (or unknown dose) within <= 8 hours OR
 * - Rivaroxaban > 10 mg (or unknown dose) within <= 8 hours.
 */
export function calculateAndexanetAlfaDosing(params: {
  agent: "apixaban" | "rivaroxaban";
  lastDoseMg: number;
  hoursSinceLastDose: number;
}): AndexanetAlfaProtocolResult {
  const { agent, lastDoseMg, hoursSinceLastDose } = params;

  let isHighDose = false;

  if (hoursSinceLastDose <= 8) {
    if (agent === "apixaban" && lastDoseMg > 5) {
      isHighDose = true;
    } else if (agent === "rivaroxaban" && lastDoseMg > 10) {
      isHighDose = true;
    }
  }

  const ivBolusMg = isHighDose ? 800 : 400;
  const ivBolusRateMgMin = 30; // 30 mg/min standard rate
  const ivBolusDurationMinutes = isHighDose ? 800 / 30 : 400 / 30; // ~26.7 or ~13.3 min
  const continuousInfusionMg = isHighDose ? 960 : 480;
  const continuousInfusionRateMgMin = isHighDose ? 8 : 4; // 8 mg/min vs 4 mg/min
  const continuousInfusionDurationHours = 2; // 120 minutes
  const totalDoseMg = ivBolusMg + continuousInfusionMg; // 1760 mg vs 880 mg

  const vials100mgOnly = isHighDose ? 18 : 9;
  const vials200mgOnly = isHighDose ? 9 : 5; // 1760 mg requires 9x200mg; 880 mg requires 5x200mg

  const agentName = agent === "apixaban" ? "Apixaban (Eliquis)" : "Rivaroxaban (Xarelto)";
  const thresholdNote =
    agent === "apixaban"
      ? "> 5 mg within 8 hours"
      : "> 10 mg within 8 hours";

  const clinicalRationale = isHighDose
    ? `Patient took ${agentName} at ${lastDoseMg} mg within <= 8 hours ago (${hoursSinceLastDose}h), meeting criteria for the HIGH DOSE regimen (${thresholdNote}). High dose provides stoichiometric decoy binding to overcome peak plasma Factor Xa inhibitor concentration.`
    : `Patient took ${agentName} at ${lastDoseMg} mg (or last dose was > 8 hours ago: ${hoursSinceLastDose}h), qualifying for the LOW DOSE regimen. Low dose delivers sufficient decoy protein (880 mg total) to neutralize residual circulating drug while minimizing excessive TFPI depletion.`;

  return {
    agent,
    lastDoseMg,
    hoursSinceLastDose,
    regimenTier: isHighDose ? "High Dose" : "Low Dose",
    isHighDose,
    ivBolusMg,
    ivBolusRateMgMin,
    ivBolusDurationMinutes: Number(ivBolusDurationMinutes.toFixed(1)),
    continuousInfusionMg,
    continuousInfusionRateMgMin,
    continuousInfusionDurationHours,
    totalDoseMg,
    vialsRequired: {
      vials100mgOnly,
      vials200mgOnly,
    },
    clinicalRationale,
    trialBenchmark:
      "ANNEXA-4 Trial (Connolly et al., NEJM 2019): In patients with acute major bleeding on apixaban or rivaroxaban, andexanet alfa reduced anti-Factor Xa activity by 92% and achieved excellent or good hemostatic efficacy in 82% of patients at 12 hours.",
    safetyWarnings: {
      prothromboticRisk:
        "REBOUND THROMBOTIC RISK: Andexanet alfa binds and sequesters endogenous Tissue Factor Pathway Inhibitor (TFPI), triggering transient tissue-factor-dependent hypercoagulability. Thromboembolic events (DVT, PE, ischemic stroke, MI) occurred in ~10% of patients in ANNEXA-4 and ANNEXA-I trials. Resume therapeutic anticoagulation as soon as medically safe.",
      heparinResistance:
        "TRANSIENT HEPARIN RESISTANCE: Decoy factor Xa binding can sequester heparin-antithrombin complexes, causing transient heparin resistance. If urgent cardiopulmonary bypass or heparinization is required post-andexanet, standard heparin titration may fail, necessitating alternative non-heparin anticoagulation (e.g., bivalirudin) or higher heparin dosing guided by anti-Xa.",
      offLabelRestrictions:
        "FDA indication is strictly limited to apixaban and rivaroxaban. Not approved for edoxaban, enoxaparin, or fondaparinux.",
    },
  };
}

export interface IdarucizumabProtocolResult {
  agentName: string;
  brandName: string;
  structuralClass: string;
  mechanism: string;
  standardFixedDoseGrams: number;
  vialConfiguration: string;
  administrationRate: string;
  bindingAffinityKd: string;
  affinityFoldOverThrombin: number;
  trialEvidence: string;
  hemodialysisComparison: string;
  resumptionGuidance: string;
}

/**
 * Returns Idarucizumab (Praxbind) protocol parameters for dabigatran reversal.
 */
export function getIdarucizumabProtocol(): IdarucizumabProtocolResult {
  return {
    agentName: "Idarucizumab",
    brandName: "Praxbind",
    structuralClass: "Humanized monoclonal antibody Fab fragment (molecular weight ~47.8 kDa)",
    mechanism:
      "Specifically binds free and thrombin-bound dabigatran and its acylglucuronide active metabolites with exquisite affinity, stripping dabigatran from thrombin's active site and forming an inert, irreversible equimolar Fab-dabigatran complex cleared renally.",
    standardFixedDoseGrams: 5.0,
    vialConfiguration: "Administered as two separate 2.5 g / 50 mL vials back-to-back within <= 15 minutes.",
    administrationRate:
      "Administer as two consecutive IV infusions of 2.5 g / 50 mL over 5–10 minutes each, or as rapid IV bolus push injections.",
    bindingAffinityKd: "2.1 pM (~2 pM)",
    affinityFoldOverThrombin: 350,
    trialEvidence:
      "RE-VERSE AD Trial (Pollack et al., NEJM 2017): In 503 patients with uncontrolled bleeding or emergency surgery, idarucizumab completely reversed dabigatran anticoagulant effect within minutes in >98% of patients (normalizing dilute TT and ecarin clotting time immediately). Median time to hemostasis was 2.5 hours in surgical patients.",
    hemodialysisComparison:
      "While dabigatran is ~50–60% dialyzable over 4 hours, idarucizumab acts within minutes, requires no central venous dialysis catheter, causes no intradialytic hemodynamic instability, and is the definitive standard of care.",
    resumptionGuidance:
      "Therapeutic dabigatran may be resumed 24 hours post-idarucizumab if the patient is clinically stable and hemostasis is secure. Other anticoagulants (heparin, LMWH) can be initiated immediately if thrombotic prophylaxis or treatment is urgent.",
  };
}

export interface FourFactorPccWarfarinDosingResult {
  baselineInr: number;
  weightKg: number;
  dosingTierUnitsPerKg: number;
  calculatedUnitsRaw: number;
  cappedDoseUnits: number;
  maximumCapApplied: number;
  mandatoryVitaminK: {
    agent: string;
    dose: string;
    routeAndRate: string;
    physiologicalRationale: string;
  };
  factorComposition: string;
  factorHalfLivesSummary: {
    factorVII: string;
    factorIX: string;
    factorX: string;
    factorII: string;
    proteinC: string;
  };
  clinicalRationale: string;
}

/**
 * Calculates 4-Factor Prothrombin Complex Concentrate (4F-PCC / Kcentra) dosing
 * for urgent warfarin reversal based on baseline pre-treatment INR and body weight.
 *
 * FDA Labeled Dosing Rails:
 * - INR 2.0 to < 4.0: 25 units/kg (max 2,500 units)
 * - INR 4.0 to 6.0: 35 units/kg (max 3,500 units)
 * - INR > 6.0: 50 units/kg (max 5,000 units)
 *
 * Mandatory Concurrent IV Vitamin K (Phytonadione 10 mg slow IV) to prevent
 * rebound coagulopathy when infused Factor VII (half-life ~6h) decays.
 */
export function calculate4FPccWarfarinDosing(params: {
  baselineInr: number;
  weightKg: number;
}): FourFactorPccWarfarinDosingResult {
  const { baselineInr, weightKg } = params;

  let dosingTierUnitsPerKg = 0;
  let maximumCapApplied = 0;

  if (baselineInr >= 2.0 && baselineInr < 4.0) {
    dosingTierUnitsPerKg = 25;
    maximumCapApplied = 2500;
  } else if (baselineInr >= 4.0 && baselineInr <= 6.0) {
    dosingTierUnitsPerKg = 35;
    maximumCapApplied = 3500;
  } else if (baselineInr > 6.0) {
    dosingTierUnitsPerKg = 50;
    maximumCapApplied = 5000;
  } else {
    // INR < 2.0
    dosingTierUnitsPerKg = 0;
    maximumCapApplied = 0;
  }

  const calculatedUnitsRaw = Math.round(weightKg * dosingTierUnitsPerKg);
  const cappedDoseUnits = Math.min(calculatedUnitsRaw, maximumCapApplied);

  const clinicalRationale =
    baselineInr < 2.0
      ? "Baseline INR < 2.0 is below the labeled threshold for urgent 4F-PCC reversal. In the absence of documented severe factor deficiency or catastrophic intracranial bleeding, routine PCC is not indicated."
      : `Pre-treatment INR is ${baselineInr.toFixed(1)}, placing patient in the ${dosingTierUnitsPerKg} units/kg tier (maximum dose cap: ${maximumCapApplied} units based on 100 kg weight). At ${weightKg} kg, calculated dose is ${calculatedUnitsRaw} units, resulting in an administered dose of ${cappedDoseUnits} units Factor IX.`;

  return {
    baselineInr,
    weightKg,
    dosingTierUnitsPerKg,
    calculatedUnitsRaw,
    cappedDoseUnits,
    maximumCapApplied,
    mandatoryVitaminK: {
      agent: "Phytonadione (Vitamin K1)",
      dose: "10 mg IV",
      routeAndRate: "Administer in 50 mL normal saline or D5W as a slow IV infusion over 30 minutes (infusion rate <= 1 mg/min).",
      physiologicalRationale:
        "MANDATORY CO-PRESCRIPTION: Infused exogenous clotting factors have finite circulating half-lives. Specifically, Factor VII has a half-life of only ~6 hours. Without concurrent Vitamin K to reactivate hepatic VKORC1 and restore endogenous gamma-carboxylation of clotting factors, the INR will rebound sharply back into the supratherapeutic range within 12–24 hours as infused Factor VII decays.",
    },
    factorComposition:
      "Non-activated purified human plasma factors: Factor II (prothrombin), Factor VII, Factor IX, Factor X, along with endogenous anticoagulant Protein C, Protein S, and unfractionated heparin (added to prevent factor activation in the vial).",
    factorHalfLivesSummary: {
      factorVII: "~6 hours (shortest half-life; drives rapid initial INR normalization and requires Vitamin K to prevent rebound)",
      factorIX: "~24 hours",
      factorX: "~36 hours",
      factorII: "~60 hours (prothrombin; longest half-life; critical for sustaining clot tensile strength)",
      proteinC: "~8 hours (natural anticoagulant; early decay explains transient hypercoagulability during unbridged warfarin initiation)",
    },
    clinicalRationale,
  };
}

export interface FourFactorPccDoacGuidance {
  targetAgents: string[];
  recommendedDosing: {
    fixedDoseUnits: number;
    weightTieredRangeUnitsPerKg: string;
    preferredRegimen: string;
  };
  evidenceGrade: string;
  clinicalGuidelineConsensus: string;
  concurrentVitaminKRole: string;
  thromboticRiskMonitoring: string;
}

/**
 * Returns guidance for off-label 4F-PCC administration in DOAC-associated bleeding
 * when targeted antidotes (andexanet alfa or idarucizumab) are unavailable.
 */
export function get4FPccOffLabelDoacGuidance(): FourFactorPccDoacGuidance {
  return {
    targetAgents: ["apixaban", "rivaroxaban", "edoxaban", "dabigatran"],
    recommendedDosing: {
      fixedDoseUnits: 2000,
      weightTieredRangeUnitsPerKg: "25–50 units/kg (max 5,000 units)",
      preferredRegimen:
        "Fixed dose of 2,000 units Factor IX IV (or weight-based 50 units/kg) infused at rate per institutional protocol.",
    },
    evidenceGrade:
      "Moderate quality evidence; recommended as preferred alternative by CHEST (2020), Anticoagulation Forum (2022), and Neurocritical Care Society (2023) when specific reversal antidotes are unavailable.",
    clinicalGuidelineConsensus:
      "4F-PCC does NOT bind or remove the DOAC molecule; instead, it provides an overwhelming supra-physiological concentration of Factor X and Prothrombin (FII), substrate-flooding the coagulation cascade to overcome competitive DOAC enzyme inhibition and generate sufficient thrombin burst for stable fibrin clot formation.",
    concurrentVitaminKRole:
      "Vitamin K is NOT indicated for DOAC reversal with 4F-PCC (DOACs do not inhibit hepatic vitamin K epoxide reductase). Only administer Vitamin K if concurrent warfarin therapy or nutritional vitamin K deficiency is suspected.",
    thromboticRiskMonitoring:
      "Thromboembolic event rate is approximately 4–8%. Monitor for venous and arterial thrombosis; re-initiate prophylactic or therapeutic anticoagulation once bleeding is controlled and surgical hemostasis secured.",
  };
}

export interface ProtamineDosingResult {
  agent: "heparin" | "enoxaparin" | "fondaparinux" | "dalteparin";
  doseUnitsOrMg: number;
  hoursElapsed: number;
  calculatedProtamineDoseMg: number;
  maxDoseCapApplied: number;
  percentNeutralization: string;
  administrationRate: string;
  isFondaparinuxZeroReversal: boolean;
  clinicalRationale: string;
  anaphylactoidRiskFlags: {
    hasFishAllergy: boolean;
    hasPriorNphInsulin: boolean;
    hasPriorVasectomy: boolean;
    isHighRiskAnaphylaxis: boolean;
    pulmonaryVasoconstrictionWarning: string;
  };
}

/**
 * Calculates Protamine Sulfate dosing for heparin and LMWH reversal,
 * incorporating time-decay kinetics, max dose caps, partial LMWH reversal,
 * the fondaparinux zero-reversal alert, and severe anaphylaxis risk factors.
 *
 * UFH Reversal Nomogram (based on time since heparin discontinuation):
 * - Immediate (< 30 min): 1.0 mg protamine per 100 units UFH
 * - 30 to 60 min: 0.5 to 0.75 mg protamine per 100 units UFH
 * - > 2 hours: 0.25 to 0.375 mg protamine per 100 units UFH
 * - Max single dose: 50 mg (excess protamine possesses intrinsic anticoagulant activity)
 *
 * Enoxaparin Reversal:
 * - <= 8 hours: 1 mg protamine per 1 mg (100 anti-Xa units) enoxaparin (max 50 mg)
 * - > 8 hours: 0.5 mg protamine per 1 mg enoxaparin (max 50 mg)
 * - Neutralizes only ~60% of anti-Factor Xa activity.
 *
 * Fondaparinux:
 * - ZERO REVERSIBILITY! Protamine does NOT neutralize fondaparinux!
 */
export function calculateProtamineDosing(params: {
  agent: "heparin" | "enoxaparin" | "fondaparinux" | "dalteparin";
  doseUnitsOrMg: number;
  hoursElapsed: number;
  fishAllergy?: boolean;
  priorNphInsulin?: boolean;
  priorVasectomy?: boolean;
}): ProtamineDosingResult {
  const { agent, doseUnitsOrMg, hoursElapsed, fishAllergy, priorNphInsulin, priorVasectomy } = params;

  let calculatedProtamineDoseMg = 0;
  let percentNeutralization = "0%";
  let isFondaparinuxZeroReversal = false;
  let clinicalRationale = "";

  const maxDoseCapApplied = 50; // Maximum single dose 50 mg

  if (agent === "fondaparinux") {
    calculatedProtamineDoseMg = 0;
    percentNeutralization = "0% (COMPLETELY REFRACTORY)";
    isFondaparinuxZeroReversal = true;
    clinicalRationale =
      "CRITICAL PROTAMINE TRAP: Protamine sulfate has ZERO effect on fondaparinux! Protamine sulfate does NOT neutralize fondaparinux. Fondaparinux is a synthetic, low-molecular-weight pentasaccharide (MW 1,728 Da) lacking the polyanionic charge density required for electrostatic complexation with basic protamine. Administering protamine confers zero hemostatic benefit and subjects the patient to severe anaphylactoid and hypotension risks. Consider rFVIIa or 4F-PCC as off-label salvage.";
  } else if (agent === "heparin") {
    // doseUnitsOrMg is heparin units (e.g. 5,000 units)
    let ratioPer100U = 1.0;
    if (hoursElapsed <= 0.5) {
      ratioPer100U = 1.0;
    } else if (hoursElapsed <= 1.0) {
      ratioPer100U = 0.75;
    } else if (hoursElapsed <= 2.0) {
      ratioPer100U = 0.5;
    } else {
      ratioPer100U = 0.25;
    }

    const rawMg = (doseUnitsOrMg / 100) * ratioPer100U;
    calculatedProtamineDoseMg = Math.min(rawMg, maxDoseCapApplied);
    percentNeutralization = "100% (Complete anti-IIa and anti-Xa neutralization)";
    clinicalRationale = `Unfractionated heparin discontinued ${hoursElapsed.toFixed(1)}h ago. Based on heparin elimination half-life (30–90 min), protamine ratio is ${ratioPer100U} mg per 100 units UFH. Calculated dose is ${rawMg.toFixed(1)} mg, capped at ${calculatedProtamineDoseMg.toFixed(1)} mg (maximum 50 mg single dose). Excess protamine inhibits thrombin and platelets, causing intrinsic anticoagulation.`;
  } else if (agent === "enoxaparin") {
    // doseUnitsOrMg is enoxaparin mg (e.g. 80 mg)
    let ratioPerMg = 1.0;
    if (hoursElapsed <= 8) {
      ratioPerMg = 1.0;
    } else {
      ratioPerMg = 0.5;
    }

    const rawMg = doseUnitsOrMg * ratioPerMg;
    calculatedProtamineDoseMg = Math.min(rawMg, maxDoseCapApplied);
    percentNeutralization = "~60% of anti-Factor Xa activity (~100% of anti-IIa activity)";
    clinicalRationale = `Enoxaparin administered ${hoursElapsed.toFixed(1)}h ago at ${doseUnitsOrMg} mg. Protamine dosing is ${ratioPerMg} mg per 1 mg enoxaparin (calculated: ${rawMg.toFixed(1)} mg, capped at ${calculatedProtamineDoseMg.toFixed(1)} mg). PARTIAL REVERSAL: Protamine neutralizes only ~60% of enoxaparin's anti-FXa activity because shorter depolymerized heparin chains cannot be fully dislodged from antithrombin.`;
  } else if (agent === "dalteparin") {
    // doseUnitsOrMg is dalteparin anti-Xa units (e.g. 5,000 units)
    const rawMg = (doseUnitsOrMg / 100) * 1.0;
    calculatedProtamineDoseMg = Math.min(rawMg, maxDoseCapApplied);
    percentNeutralization = "~60–75% of anti-Factor Xa activity";
    clinicalRationale = `Dalteparin administered ${hoursElapsed.toFixed(1)}h ago. Dosed at 1 mg protamine per 100 anti-Xa units dalteparin, capped at ${calculatedProtamineDoseMg.toFixed(1)} mg.`;
  }

  const isHighRiskAnaphylaxis = Boolean(fishAllergy || priorNphInsulin || priorVasectomy);

  const anaphylactoidRiskFlags = {
    hasFishAllergy: Boolean(fishAllergy),
    hasPriorNphInsulin: Boolean(priorNphInsulin),
    hasPriorVasectomy: Boolean(priorVasectomy),
    isHighRiskAnaphylaxis,
    pulmonaryVasoconstrictionWarning:
      "PROTAMINE HYPERSENSITIVITY & INFUSION DISASTER WARNING: Rapid IV bolus injection of protamine triggers catastrophic acute pulmonary vasoconstriction, acute right ventricular failure, massive histamine release, and profound systemic hypotension. High-risk patients include those with fish/salmon hypersensitivity (protamine is a basic polycation derived from salmon sperm), prior Neutral Protamine Hagedorn (NPH) insulin exposure (anti-protamine IgG antibodies), and prior vasectomy (anti-sperm antibodies). Mandatory administration: slow IV infusion over >= 10–15 minutes (rate <= 5 mg/min) with resuscitation equipment and ephedrine/epinephrine immediately available.",
  };

  return {
    agent,
    doseUnitsOrMg,
    hoursElapsed,
    calculatedProtamineDoseMg: Number(calculatedProtamineDoseMg.toFixed(1)),
    maxDoseCapApplied,
    percentNeutralization,
    administrationRate: "Slow IV infusion over at least 10–15 minutes; rate must NOT exceed 5 mg/min.",
    isFondaparinuxZeroReversal,
    clinicalRationale,
    anaphylactoidRiskFlags,
  };
}

// ============================================================================
// 6. COAGULATION LAB TRAPS & MONITORING MATRIX
// ============================================================================

export interface LabTrapItem {
  assayName: string;
  targetDrug: string;
  trapType: "misleading-normal" | "artifactual-elevation" | "exclusion-rule" | "calibration-requirement";
  clinicalRule: string;
  underlyingMechanics: string;
}

export const COAGULATION_LAB_TRAPS: LabTrapItem[] = [
  {
    assayName: "Prothrombin Time / INR (PT/INR)",
    targetDrug: "Apixaban (Eliquis)",
    trapType: "misleading-normal",
    clinicalRule:
      "A completely normal PT/INR does NOT rule out on-therapy or supratherapeutic apixaban drug levels. Never rely on PT/INR to clear a patient for surgery or declare absence of apixaban coagulopathy.",
    underlyingMechanics:
      "Most commercial thromboplastin reagents have low sensitivity to apixaban-mediated Factor Xa inhibition. Up to 30–50% of patients with therapeutic apixaban concentrations have an INR within normal laboratory reference limits (0.8–1.2). Only a calibrated chromogenic anti-FXa assay can quantify apixaban.",
  },
  {
    assayName: "Thrombin Time (TT)",
    targetDrug: "Dabigatran (Pradaxa)",
    trapType: "exclusion-rule",
    clinicalRule:
      "A normal Thrombin Time (TT) reliably EXCLUDES clinically meaningful dabigatran anticoagulant exposure. If TT is normal, significant dabigatran is ruled out.",
    underlyingMechanics:
      "Thrombin Time measures the direct conversion of fibrinogen to fibrin upon addition of exogenous thrombin. Because dabigatran directly binds thrombin with picomolar affinity, TT is exquisitely sensitive, prolonging even at subtherapeutic concentrations (<10 ng/mL). A normal TT definitively excludes dabigatran presence.",
  },
  {
    assayName: "Prothrombin Time / INR (PT/INR)",
    targetDrug: "Argatroban",
    trapType: "artifactual-elevation",
    clinicalRule:
      "Argatroban profoundly elevates PT/INR artifactually (falsely elevates INR). When transitioning from argatroban to warfarin in HIT, target a co-infusion INR > 4.0 before stopping argatroban.",
    underlyingMechanics:
      "Argatroban directly inhibits thrombin in the PT reagent, falsely elevating the measured INR without reflecting true warfarin-mediated suppression of hepatic vitamin K factors. Stopping argatroban at an INR of 2.5 results in a true warfarin INR of ~1.5 (subtherapeutic).",
  },
  {
    assayName: "Chromogenic Anti-Factor Xa Assay",
    targetDrug: "DOAC Class (Calibrated Anti-FXa)",
    trapType: "calibration-requirement",
    clinicalRule:
      "Quantification of DOACs requires a target-specific calibrated anti-FXa assay (reporting in ng/mL). Standard hospital heparin-calibrated anti-Xa assays (reporting in IU/mL) confirm only presence, NOT true concentration.",
    underlyingMechanics:
      "Chromogenic anti-Xa assays measure residual Factor Xa cleavage of a synthetic chromophore. Converting optical absorbance into mass concentration (ng/mL) requires drug-specific calibration curves with verified reference standards.",
  },
  {
    assayName: "Creatinine Clearance (CrCl)",
    targetDrug: "Edoxaban (Savaysa)",
    trapType: "misleading-normal",
    clinicalRule:
      "FDA Boxed Warning: Patients with non-valvular atrial fibrillation and CrCl > 95 mL/min must NOT receive edoxaban due to elevated ischemic stroke rates compared to warfarin.",
    underlyingMechanics:
      "Edoxaban relies on renal excretion for 50% of clearance. Supranormal renal clearance (CrCl > 95 mL/min) accelerates drug elimination, leading to subtherapeutic plasma troughs and loss of stroke protection in atrial fibrillation.",
  },
];

// ============================================================================
// 7. DESK DETECTION & COMPREHENSIVE CLINICAL REPORT GENERATOR
// ============================================================================

export const ALL_ANTICOAGULANT_IDS = new Set([
  "apixaban",
  "rivaroxaban",
  "edoxaban",
  "dabigatran",
  "argatroban",
  "bivalirudin",
  "warfarin",
  "heparin",
  "enoxaparin",
  "dalteparin",
  "fondaparinux",
]);

export const DIRECT_FXA_IDS = new Set(["apixaban", "rivaroxaban", "edoxaban"]);
export const DIRECT_THROMBIN_IDS = new Set(["dabigatran", "argatroban", "bivalirudin"]);
export const DTI_IDS = new Set(["argatroban", "bivalirudin"]);
export const VKA_IDS = new Set(["warfarin"]);
export const HEPARINOID_IDS = new Set(["heparin", "enoxaparin", "dalteparin", "fondaparinux"]);

export const ALL_REVERSAL_IDS = new Set([
  "andexanet-alfa",
  "andexxa",
  "idarucizumab",
  "praxbind",
  "kcentra",
  "4f-pcc",
  "protamine",
  "protamine-sulfate",
  "vitamin-k",
  "phytonadione",
  "phytonadione-vitamin-k",
]);

export interface AnticoagulationOnDeskResult {
  hasAnticoagulant: boolean;
  hasDoac: boolean;
  hasDirectFxaInhibitor: boolean;
  hasDirectThrombinInhibitor: boolean;
  hasDti: boolean;
  hasVka: boolean;
  hasHeparinoid: boolean;
  hasReversalAgent: boolean;
  anticoagulants: string[];
  reversals: string[];
  anticoagulantProfiles: AnticoagulantProfile[];
  detectedDrugIds: string[];
}

/**
 * Screens drug IDs on the desk for anticoagulants and reversal agents.
 */
export function anticoagulationOnDesk(drugIds: string[]): AnticoagulationOnDeskResult {
  const normalized = drugIds.map((id) => id.toLowerCase().trim());

  const anticoagulants = normalized.filter((id) => ALL_ANTICOAGULANT_IDS.has(id));
  const reversals = normalized.filter((id) => ALL_REVERSAL_IDS.has(id));

  const hasDirectFxaInhibitor = anticoagulants.some((id) => DIRECT_FXA_IDS.has(id));
  const hasDirectThrombinInhibitor = anticoagulants.some((id) => DIRECT_THROMBIN_IDS.has(id));
  const hasDti = anticoagulants.some((id) => DTI_IDS.has(id));
  const hasDoac = hasDirectFxaInhibitor || (hasDirectThrombinInhibitor && anticoagulants.includes("dabigatran"));
  const hasVka = anticoagulants.some((id) => VKA_IDS.has(id));
  const hasHeparinoid = anticoagulants.some((id) => HEPARINOID_IDS.has(id));

  const anticoagulantProfiles = anticoagulants
    .map((id) => ANTICOAGULANT_PROFILES[id])
    .filter((p): p is AnticoagulantProfile => Boolean(p));

  return {
    hasAnticoagulant: anticoagulants.length > 0,
    hasDoac,
    hasDirectFxaInhibitor,
    hasDirectThrombinInhibitor,
    hasDti,
    hasVka,
    hasHeparinoid,
    hasReversalAgent: reversals.length > 0,
    anticoagulants,
    reversals,
    anticoagulantProfiles,
    detectedDrugIds: normalized,
  };
}

export interface AnticoagulationReportOptions {
  weightKg?: number;
  baselineInr?: number;
  lastDoseMg?: number;
  hoursSinceLastDose?: number;
  crClMlMin?: number;
  fishAllergy?: boolean;
  priorNphInsulin?: boolean;
  priorVasectomy?: boolean;
  // HIT 4Ts evaluation inputs
  hit4TsInput?: Hit4TsInput;
  plateletBaseline?: number;
  plateletNadir?: number;
  hitTimingScore?: 0 | 1 | 2;
  hitThrombosisScore?: 0 | 1 | 2;
  hitOtherCausesScore?: 0 | 1 | 2;
  hitThrombocytopeniaScore?: 0 | 1 | 2;
  // DTI kinetics inputs
  hepaticImpairment?: "none" | "moderate" | "severe_shock";
  renalStatus?: "normal" | "moderate_ckd" | "severe_ckd" | "esrd_dialysis";
  combinedInr?: number;
  daysOnCombinedTherapy?: number;
}

export interface AnticoagulationReport {
  onDesk: AnticoagulationOnDeskResult;
  patientParameters: {
    weightKg: number;
    baselineInr: number;
    lastDoseMg: number;
    hoursSinceLastDose: number;
    crClMlMin: number;
  };
  hit4TsEvaluation?: Hit4TsResult;
  argatrobanKinetics?: ArgatrobanKineticsResult;
  bivalirudinKinetics?: BivalirudinKineticsResult;
  argatrobanWarfarinCrossover?: ArgatrobanWarfarinCrossoverEvaluation;
  andexanetDosing?: AndexanetAlfaProtocolResult;
  idarucizumabProtocol?: IdarucizumabProtocolResult;
  fourFactorPccWarfarinDosing?: FourFactorPccWarfarinDosingResult;
  fourFactorPccDoacGuidance?: FourFactorPccDoacGuidance;
  protamineDosing?: ProtamineDosingResult;
  activeDrugProfiles: AnticoagulantProfile[];
  relevantLabTraps: LabTrapItem[];
  highYieldClinicalPearls: string[];
  disclaimer: string;
}

/**
 * Comprehensive clinical report generator for anticoagulation reversal, HIT triage,
 * and hemostasis on the desk.
 */
export function anticoagulationReportOnDesk(
  drugIds: string[],
  host: HostContext,
  options?: AnticoagulationReportOptions,
): AnticoagulationReport {
  const onDesk = anticoagulationOnDesk(drugIds);

  const weightKg = options?.weightKg ?? 70;
  const baselineInr = options?.baselineInr ?? (onDesk.hasVka ? 3.8 : 1.1);
  const lastDoseMg = options?.lastDoseMg ?? (drugIds.includes("apixaban") ? 5 : drugIds.includes("rivaroxaban") ? 20 : 100);
  const hoursSinceLastDose = options?.hoursSinceLastDose ?? 4;
  const crClMlMin = options?.crClMlMin ?? (host.kidney === "ckd" ? 25 : 85);

  // 1. HIT 4Ts Evaluation
  let hit4TsEvaluation: Hit4TsResult | undefined;
  if (options?.hit4TsInput) {
    hit4TsEvaluation = calculateHit4TsScore(options.hit4TsInput);
  } else if (
    drugIds.includes("heparin") ||
    drugIds.includes("enoxaparin") ||
    drugIds.includes("dalteparin") ||
    options?.plateletNadir !== undefined ||
    options?.hitThrombocytopeniaScore !== undefined
  ) {
    hit4TsEvaluation = calculateHit4TsScore({
      thrombocytopeniaScore: options?.hitThrombocytopeniaScore,
      timingScore: options?.hitTimingScore,
      thrombosisScore: options?.hitThrombosisScore,
      otherCausesScore: options?.hitOtherCausesScore,
      baselinePlateletCount: options?.plateletBaseline,
      nadirPlateletCount: options?.plateletNadir,
    });
  }

  // 2. Direct Thrombin Inhibitor Kinetics
  let argatrobanKinetics: ArgatrobanKineticsResult | undefined;
  if (drugIds.includes("argatroban") || options?.hepaticImpairment !== undefined) {
    argatrobanKinetics = calculateArgatrobanKinetics({
      weightKg,
      hepaticImpairment: options?.hepaticImpairment,
    });
  }

  let bivalirudinKinetics: BivalirudinKineticsResult | undefined;
  if (drugIds.includes("bivalirudin") || options?.renalStatus !== undefined) {
    bivalirudinKinetics = calculateBivalirudinKinetics({
      weightKg,
      renalStatus: options?.renalStatus,
    });
  }

  // 3. Argatroban-Warfarin Crossover Trap
  let argatrobanWarfarinCrossover: ArgatrobanWarfarinCrossoverEvaluation | undefined;
  if (
    (drugIds.includes("argatroban") && drugIds.includes("warfarin")) ||
    options?.combinedInr !== undefined
  ) {
    argatrobanWarfarinCrossover = evaluateArgatrobanWarfarinCrossover({
      combinedInr: options?.combinedInr ?? baselineInr,
      daysOnCombinedTherapy: options?.daysOnCombinedTherapy ?? 1,
    });
  }

  // 4. Targeted Reversal: Andexanet alfa
  let andexanetDosing: AndexanetAlfaProtocolResult | undefined;
  if (drugIds.includes("apixaban")) {
    andexanetDosing = calculateAndexanetAlfaDosing({
      agent: "apixaban",
      lastDoseMg,
      hoursSinceLastDose,
    });
  } else if (drugIds.includes("rivaroxaban")) {
    andexanetDosing = calculateAndexanetAlfaDosing({
      agent: "rivaroxaban",
      lastDoseMg,
      hoursSinceLastDose,
    });
  }

  // 5. Targeted Reversal: Idarucizumab
  let idarucizumabProtocol: IdarucizumabProtocolResult | undefined;
  if (drugIds.includes("dabigatran")) {
    idarucizumabProtocol = getIdarucizumabProtocol();
  }

  // 6. Urgent Warfarin Reversal: 4F-PCC + Vitamin K
  let fourFactorPccWarfarinDosing: FourFactorPccWarfarinDosingResult | undefined;
  if (drugIds.includes("warfarin") || baselineInr >= 2.0) {
    fourFactorPccWarfarinDosing = calculate4FPccWarfarinDosing({
      baselineInr,
      weightKg,
    });
  }

  // 7. Off-Label DOAC Guidance with 4F-PCC
  let fourFactorPccDoacGuidance: FourFactorPccDoacGuidance | undefined;
  if (onDesk.hasDoac) {
    fourFactorPccDoacGuidance = get4FPccOffLabelDoacGuidance();
  }

  // 8. Protamine Sulfate Heparin Neutralization
  let protamineDosing: ProtamineDosingResult | undefined;
  if (drugIds.includes("heparin")) {
    protamineDosing = calculateProtamineDosing({
      agent: "heparin",
      doseUnitsOrMg: lastDoseMg > 100 ? lastDoseMg : 5000,
      hoursElapsed: hoursSinceLastDose,
      fishAllergy: options?.fishAllergy,
      priorNphInsulin: options?.priorNphInsulin,
      priorVasectomy: options?.priorVasectomy,
    });
  } else if (drugIds.includes("enoxaparin")) {
    protamineDosing = calculateProtamineDosing({
      agent: "enoxaparin",
      doseUnitsOrMg: lastDoseMg,
      hoursElapsed: hoursSinceLastDose,
      fishAllergy: options?.fishAllergy,
      priorNphInsulin: options?.priorNphInsulin,
      priorVasectomy: options?.priorVasectomy,
    });
  } else if (drugIds.includes("fondaparinux")) {
    protamineDosing = calculateProtamineDosing({
      agent: "fondaparinux",
      doseUnitsOrMg: lastDoseMg,
      hoursElapsed: hoursSinceLastDose,
      fishAllergy: options?.fishAllergy,
      priorNphInsulin: options?.priorNphInsulin,
      priorVasectomy: options?.priorVasectomy,
    });
  }

  const activeDrugProfiles = onDesk.anticoagulants
    .map((id) => ANTICOAGULANT_PROFILES[id])
    .filter((p): p is AnticoagulantProfile => Boolean(p));

  const relevantLabTraps = COAGULATION_LAB_TRAPS.filter((trap) => {
    return onDesk.anticoagulants.some((id) => {
      const drugName = ANTICOAGULANT_PROFILES[id]?.name;
      return drugName && trap.targetDrug.toLowerCase().includes(drugName.toLowerCase());
    });
  });

  const highYieldClinicalPearls: string[] = [];

  if (onDesk.hasDoac) {
    highYieldClinicalPearls.push(
      "DOAC clearance depends on renal function: Dabigatran (80% renal), Edoxaban (50% renal), Rivaroxaban (33% renal), Apixaban (27% renal). Evaluate CrCl via Cockcroft-Gault.",
    );
  }

  if (drugIds.includes("apixaban")) {
    highYieldClinicalPearls.push(
      "Apixaban PT Trap: Normal PT/INR does NOT exclude apixaban anticoagulant effect (30–50% false negative rate). Only apixaban-calibrated anti-FXa provides quantitative verification.",
    );
  }

  if (drugIds.includes("dabigatran")) {
    highYieldClinicalPearls.push(
      "Dabigatran TT Rule: Normal Thrombin Time (TT) reliably EXCLUDES clinically meaningful dabigatran concentration. Dialysis clears ~60% over 4 hours, but Idarucizumab 5g IV is immediate standard of care.",
    );
  }

  if (drugIds.includes("warfarin")) {
    highYieldClinicalPearls.push(
      "Warfarin 4F-PCC + Vitamin K Rule: Reversal with 4F-PCC MUST include concurrent IV Vitamin K (10 mg slow IV over 30 min). Factor VII decays in 6 hours; without Vitamin K, INR rebounds in 12–24h.",
    );
  }

  if (drugIds.includes("enoxaparin")) {
    highYieldClinicalPearls.push(
      "LMWH Partial Reversal: Protamine sulfate neutralizes ~100% of anti-IIa activity but only ~60% of enoxaparin anti-Factor Xa activity. Ongoing hemostatic surveillance is required.",
    );
  }

  if (drugIds.includes("fondaparinux")) {
    highYieldClinicalPearls.push(
      "Fondaparinux Protamine Refractoriness: Protamine has ZERO effect on fondaparinux! Do NOT administer protamine for fondaparinux bleeding.",
    );
  }

  if (drugIds.includes("argatroban")) {
    highYieldClinicalPearls.push(
      "ARGATROBAN-WARFARIN CROSSOVER TRAP: Argatroban artificially elevates PT/INR 2- to 3-fold. Target combined INR > 4.0 before holding argatroban, then re-check solitary INR in 4–6 hours to ensure true INR >= 2.0.",
    );
  }

  if (drugIds.includes("heparin") || drugIds.includes("enoxaparin")) {
    highYieldClinicalPearls.push(
      "HIT 4Ts Triage: Intermediate or High probability (score >= 4) mandates immediate cessation of all heparin products (including flushes/locks) and starting alternative non-heparin anticoagulation (Argatroban/Bivalirudin). Avoid prophylactic platelet transfusions (paradoxical thrombotic surge).",
    );
  }

  return {
    onDesk,
    patientParameters: {
      weightKg,
      baselineInr,
      lastDoseMg,
      hoursSinceLastDose,
      crClMlMin,
    },
    hit4TsEvaluation,
    argatrobanKinetics,
    bivalirudinKinetics,
    argatrobanWarfarinCrossover,
    andexanetDosing,
    idarucizumabProtocol,
    fourFactorPccWarfarinDosing,
    fourFactorPccDoacGuidance,
    protamineDosing,
    activeDrugProfiles,
    relevantLabTraps: relevantLabTraps.length > 0 ? relevantLabTraps : COAGULATION_LAB_TRAPS,
    highYieldClinicalPearls,
    disclaimer: `${ANTICOAGULATION_CDS_DISCLAIMER} ${NOT_CLEARED} ${PI_FOOTER}`,
  };
}

// ============================================================================
// 8. HELPER ACCESSORS & REVERSAL REGISTRY
// ============================================================================

export function getAnticoagulantProfile(drugId: string): AnticoagulantProfile | undefined {
  return ANTICOAGULANT_PROFILES[drugId.toLowerCase().trim()];
}

export function getAllAnticoagulantProfiles(): AnticoagulantProfile[] {
  return Object.values(ANTICOAGULANT_PROFILES);
}
