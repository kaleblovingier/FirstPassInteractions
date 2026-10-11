/**
 * Healthcare Resources Directory, Co-Pay Assistance & Public Health Navigation
 *
 * FD&C ACT § 520(o)(1)(E) REGULATORY COMPLIANCE POSTURE:
 * Non-Device Clinical Decision Support (CDS) Software Reference.
 * This software module provides an educational, transparent, and non-prescriptive
 * directory of verified national safety-net healthcare resources, patient assistance
 * programs (PAPs), teratology consultation networks, chronic disease co-pay relief
 * foundations, poison centers, and crisis support lifelines.
 *
 * In strict conformity with Section 520(o)(1)(E) of the Federal Food, Drug,
 * and Cosmetic Act (21 U.S.C. § 360j(o)(1)(E)):
 * 1. It does not acquire, process, or analyze medical images, IVD data, or physiologic signals;
 * 2. It displays public, verified directory listings, authoritative phone helplines, and
 *    official government / nonprofit public web portals;
 * 3. It formulates educational navigation rationale to support licensed healthcare professionals
 *    (physicians, clinical pharmacists, advanced practice clinicians, case managers, and social workers)
 *    and supervised trainees in guiding patients toward legitimate access pathways;
 * 4. It enables clinicians and patients to independently review the basis, eligibility, and
 *    institutional credentials of every resource;
 * 5. All context resolution occurs client-side in the browser. No patient health information (PHI),
 *    demographic data, or location queries are transmitted or stored remotely.
 */

import { DRUG_BY_ID } from "./catalog";
import type { HostContext } from "./types";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

// ============================================================================
// 1. REGULATORY NOTICE & STATUTORY POSTURE
// ============================================================================

export const HEALTHCARE_RESOURCES_CDS_DISCLAIMER =
  "FD&C Act § 520(o)(1)(E) Non-Device Clinical Decision Support Reference: This healthcare resource directory " +
  "and patient assistance navigator compiles public safety-net clinics, manufacturer assistance programs (PAPs), " +
  "perinatal teratogen hotlines, and organ-specialty foundations. It is strictly educational and non-prescriptive, " +
  "providing verified public links and helplines for independent review by licensed healthcare professionals and " +
  "navigators. It does not generate medical diagnoses, treatment directives, or prescription orders. In an emergent " +
  "or life-threatening situation, contact emergency services (911) or designated emergency hotlines immediately.";

export const RESOURCE_COMPLIANCE_CRITERIA = [
  {
    criterion: "FD&C Act § 520(o)(1)(E)(i)",
    title: "No In Vitro Diagnostic or Imaging Signal Analysis",
    details: "Operates exclusively on user-selected drug identifiers and clinical context flags. No patient diagnostic imaging, laboratory telemetry, or continuous physiologic monitoring is accepted.",
  },
  {
    criterion: "FD&C Act § 520(o)(1)(E)(ii)",
    title: "Displays Verified Public Information",
    details: "Surfaces transparent public directories, HTTPS links, toll-free helplines, and organizational profiles verified against HRSA, PhRMA, CDC, and recognized 501(c)(3) registries.",
  },
  {
    criterion: "FD&C Act § 520(o)(1)(E)(iii)",
    title: "Non-Prescriptive Healthcare Professional Support",
    details: "Supplies educational context and eligibility criteria to support clinician and case-manager discharge planning, without dictating specific therapeutic choices or medical treatments.",
  },
  {
    criterion: "FD&C Act § 520(o)(1)(E)(iv)",
    title: "Independent Reviewable Basis & Privacy",
    details: "Every recommendation cites public statutory programs (e.g., 340B, HRSA Section 330) or established non-profit services. All matching executes in-memory without remote data transmission.",
  },
] as const;

// ============================================================================
// 2. RESOURCE TAXONOMY & TYPES
// ============================================================================

export type ResourceDomain =
  | "primary-care"
  | "prescription-assistance"
  | "maternal-perinatal"
  | "chronic-specialty"
  | "toxicology-poison"
  | "crisis-mental-health";

export type CostStructure =
  | "free"
  | "sliding-scale"
  | "financial-assistance"
  | "covered-entities";

export type SubdomainTag =
  | "fqhc"
  | "pap"
  | "pregnancy"
  | "kidney"
  | "cardiac"
  | "transplant"
  | "diabetes"
  | "poison"
  | "crisis"
  | "oncology"
  | "hiv-adap"
  | "rare-disease"
  | "senior-medicare"
  | "harm-reduction"
  | "social-transport";

export interface HealthcareResource {
  id: string;
  name: string;
  shortName: string;
  domain: ResourceDomain;
  subdomainTag: SubdomainTag;
  organization: string;
  description: string;
  clinicalUtility: string;
  services: readonly string[];
  eligibilityNotes: string;
  url: string;
  phone?: string;
  sms?: string;
  availability: string;
  languages: readonly string[];
  cost: CostStructure;
  statutoryBasis?: string;
  tags: readonly string[];
}

export interface DomainCategoryInfo {
  id: ResourceDomain;
  label: string;
  shortLabel: string;
  description: string;
  filterPill: string;
}

export const RESOURCE_DOMAINS: readonly DomainCategoryInfo[] = [
  {
    id: "primary-care",
    label: "Primary Care & Safety Net Access",
    shortLabel: "Primary Care / FQHC",
    description: "Federally Qualified Health Centers, sliding-scale community clinics, and rural health networks.",
    filterPill: "Primary Care / FQHC",
  },
  {
    id: "prescription-assistance",
    label: "Prescription Drug Assistance & Co-Pay Navigators",
    shortLabel: "Prescription Co-Pay / PAP",
    description: "Manufacturer assistance programs, co-pay relief foundations, and 340B drug pricing access.",
    filterPill: "Prescription Co-Pay / PAP",
  },
  {
    id: "maternal-perinatal",
    label: "Maternal-Fetal, Perinatal & Teratogen Consultation",
    shortLabel: "Pregnancy & MotherToBaby",
    description: "Evidence-based teratogen exposure counseling, perinatal mental health, and postpartum support.",
    filterPill: "Pregnancy & MotherToBaby",
  },
  {
    id: "chronic-specialty",
    label: "Chronic Disease & Organ Specialty Navigation",
    shortLabel: "Organ Specialty",
    description: "Kidney, cardiovascular, organ transplant, and metabolic care patient navigation and emergency grants.",
    filterPill: "Kidney & Dialysis",
  },
  {
    id: "toxicology-poison",
    label: "Medical Toxicology & Poison Centers",
    shortLabel: "Poison Centers",
    description: "24/7 board-certified clinical toxicologist triage for drug toxicity, overdoses, and adverse exposures.",
    filterPill: "Poison & Crisis",
  },
  {
    id: "crisis-mental-health",
    label: "Crisis, Mental Health & Peer Navigation",
    shortLabel: "Crisis & Lifelines",
    description: "Immediate 988 lifeline triage, SAMHSA national referral, and peer overdose prevention networks.",
    filterPill: "Poison & Crisis",
  },
] as const;

// Domain filter pills for UI station
export type FilterPillId =
  | "all"
  | "pap"
  | "oncology"
  | "hiv-adap"
  | "rare-access"
  | "senior-extra-help"
  | "harm-reduction"
  | "fqhc"
  | "pregnancy"
  | "kidney"
  | "cardiac"
  | "transplant"
  | "poison-crisis";

export interface FilterPillConfig {
  id: FilterPillId;
  label: string;
  domain?: ResourceDomain;
  tag?: string;
}

export const FILTER_PILLS: readonly FilterPillConfig[] = [
  { id: "all", label: "All" },
  { id: "pap", label: "Prescription Co-Pay / PAP", domain: "prescription-assistance" },
  { id: "oncology", label: "Cancer & Oncology", tag: "oncology" },
  { id: "hiv-adap", label: "HIV / ADAP", tag: "hiv-adap" },
  { id: "rare-access", label: "Rare & Expanded Access", tag: "rare-disease" },
  { id: "senior-extra-help", label: "Senior & Extra Help", tag: "senior-medicare" },
  { id: "harm-reduction", label: "Harm Reduction", tag: "harm-reduction" },
  { id: "fqhc", label: "Primary Care / FQHC", domain: "primary-care" },
  { id: "pregnancy", label: "Pregnancy & MotherToBaby", domain: "maternal-perinatal" },
  { id: "kidney", label: "Kidney & Dialysis", tag: "kidney" },
  { id: "cardiac", label: "Cardiac", tag: "cardiac" },
  { id: "transplant", label: "Transplant", tag: "transplant" },
  { id: "poison-crisis", label: "Poison & Crisis" },
] as const;

// ============================================================================
// 3. MASTER HEALTHCARE RESOURCE DIRECTORY
// ============================================================================

export const HEALTHCARE_RESOURCES: readonly HealthcareResource[] = [
  // --------------------------------------------------------------------------
  // Domain 1: Primary Care & Safety Net Access
  // --------------------------------------------------------------------------
  {
    id: "hrsa-fqhc",
    name: "HRSA Health Center Finder (FQHCs)",
    shortName: "HRSA Health Centers",
    domain: "primary-care",
    subdomainTag: "fqhc",
    organization: "Health Resources and Services Administration (HRSA)",
    description:
      "Locates community-based Federally Qualified Health Centers providing comprehensive preventive, primary, dental, and pharmacy services.",
    clinicalUtility:
      "Crucial bridge for underinsured or uninsured patients requiring ongoing disease monitoring, primary care follow-up, and affordable maintenance pharmacotherapy.",
    services: [
      "Sliding-fee discount schedule based on family size and income (under 200% FPL)",
      "Comprehensive primary medical care and routine lab monitoring",
      "Integrated dental, behavioral health, and substance use services",
      "On-site or contracted discounted 340B outpatient pharmacy dispensing",
    ],
    eligibilityNotes: "Open to all individuals regardless of health insurance coverage, documentation, or ability to pay.",
    url: "https://findahealthcenter.hrsa.gov/",
    phone: "1-888-275-4772",
    availability: "Online locator 24/7; clinic hours vary by location",
    languages: ["English", "Spanish", "Multi-language interpretation"],
    cost: "sliding-scale",
    statutoryBasis: "Public Health Service Act § 330 (42 U.S.C. § 254b)",
    tags: ["fqhc", "primary-care", "safety-net", "sliding-scale", "uninsured", "dental", "general"],
  },
  {
    id: "nafc",
    name: "National Association of Free & Charitable Clinics (NAFC)",
    shortName: "NAFC Free Clinics",
    domain: "primary-care",
    subdomainTag: "fqhc",
    organization: "National Association of Free and Charitable Clinics",
    description:
      "Directory of more than 1,400 free and charitable clinics nationwide delivering comprehensive medical, pharmacy, and dental care to underserved populations.",
    clinicalUtility:
      "Essential resource for patients residing in regions without FQHC proximity or those needing zero-cost primary care and basic medications.",
    services: [
      "Completely free or nominal-donation outpatient clinical visits",
      "Essential prescription medication dispensing and prescription assistance navigation",
      "Chronic disease management for hypertension, diabetes, and asthma",
      "Preventive screening and diagnostic referral networks",
    ],
    eligibilityNotes: "Primarily serves uninsured and low-income individuals who do not qualify for Medicaid or ACA subsidies.",
    url: "https://nafcclinics.org/find-clinic/",
    phone: "1-703-647-9424",
    availability: "Online locator 24/7; clinic operational hours vary",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "501(c)(3) Charitable Safety-Net Network",
    tags: ["free-clinic", "nafc", "uninsured", "primary-care", "safety-net", "low-income"],
  },
  {
    id: "rhihub",
    name: "Rural Health Information Hub (RHIhub)",
    shortName: "RHIhub Rural Health",
    domain: "primary-care",
    subdomainTag: "fqhc",
    organization: "Rural Health Information Hub & HRSA Federal Office of Rural Health Policy",
    description:
      "National clearinghouse for rural healthcare programs, federally certified Rural Health Clinics (RHCs), and geographic healthcare access solutions.",
    clinicalUtility:
      "Assists clinicians and discharge planners in identifying regional clinical facilities, telehealth access points, and rural transportation services.",
    services: [
      "Directory of Rural Health Clinics (RHCs) and Critical Access Hospitals (CAHs)",
      "Rural health program funding, transportation, and clinical access guides",
      "Telehealth specialty consultation network guides",
      "Rural substance use and chronic disease management models",
    ],
    eligibilityNotes: "Public directory accessible to all patients, healthcare professionals, and rural health advocates.",
    url: "https://www.ruralhealthinfo.org/",
    phone: "1-800-270-1898",
    availability: "Online portal 24/7; information specialists Mon-Fri 8am-5pm CT",
    languages: ["English"],
    cost: "free",
    statutoryBasis: "HRSA Federal Office of Rural Health Policy Grant",
    tags: ["rural", "rhc", "telehealth", "safety-net", "primary-care", "access"],
  },

  // --------------------------------------------------------------------------
  // Domain 2: Prescription Drug Assistance & Co-Pay Navigators
  // --------------------------------------------------------------------------
  {
    id: "mat",
    name: "Medicine Assistance Tool (MAT / PhRMA)",
    shortName: "Medicine Assistance Tool",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "Pharmaceutical Research and Manufacturers of America (PhRMA)",
    description:
      "Search engine connecting uninsured and underinsured patients to biopharmaceutical manufacturer patient assistance programs (PAPs).",
    clinicalUtility:
      "Rapidly identifies brand-name drug financial assistance programs, co-pay cards, and manufacturer-sponsored free drug supply programs.",
    services: [
      "Automated matching engine across hundreds of brand-name prescription medications",
      "Direct links to manufacturer PAP applications and required clinician forms",
      "Medicare Part D Extra Help program screening information",
      "Cost-sharing reduction navigation toolkits",
    ],
    eligibilityNotes: "Eligibility criteria vary by drug manufacturer; generally requires income verification and lack of adequate drug coverage.",
    url: "https://medicineassistancetool.org/",
    availability: "Online tool 24/7",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "PhRMA Industry Patient Assistance Initiative",
    tags: ["pap", "prescription-assistance", "manufacturer-pap", "brand-drugs", "copay", "biologics"],
  },
  {
    id: "needymeds",
    name: "NeedyMeds National Database & Helpline",
    shortName: "NeedyMeds",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "NeedyMeds, Inc. (501(c)(3) Non-Profit)",
    description:
      "Comprehensive national clearinghouse of pharmaceutical patient assistance programs, government programs, and diagnosis-based financial assistance.",
    clinicalUtility:
      "Gold-standard non-profit database for finding PAPs, disease-specific grants, coupon cards, and application guidance for both brand and generic medications.",
    services: [
      "Searchable database of over 5,000 assistance programs and manufacturer PAPs",
      "Diagnosis-based assistance programs covering supplies, travel, and copays",
      "Free NeedyMeds Drug Discount Card (up to 80% off generic cash prices)",
      "Bilingual live helpline support for patients unable to navigate online tools",
    ],
    eligibilityNotes: "Free access for all patients and advocates; program eligibility depends on individual program rules.",
    url: "https://www.needymeds.org/",
    phone: "1-800-503-6897",
    availability: "Online database 24/7; live helpline Mon-Fri 9am-5pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "501(c)(3) Independent Non-Profit Organization",
    tags: ["pap", "prescription-assistance", "discount-card", "helpline", "copay", "diagnoses"],
  },
  {
    id: "rxassist",
    name: "RxAssist Clinician Directory of PAPs",
    shortName: "RxAssist",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "RxAssist / Center for Primary Care and Prevention",
    description:
      "Clinician- and advocate-focused database of pharmaceutical patient assistance programs, application guidelines, and downloadable enrollment forms.",
    clinicalUtility:
      "Streamlines the clinical workflow for physicians, nurses, and social workers submitting PAP applications on behalf of patients.",
    services: [
      "Direct downloadable PAP application forms for healthcare professionals",
      "Detailed manufacturer eligibility rules (income thresholds, insurance barriers)",
      "Practical instructions on income documentation and prescriber attestations",
      "Medication directory indexed by generic and trade names",
    ],
    eligibilityNotes: "Designed for healthcare providers, clinical advocates, and patients seeking structured application forms.",
    url: "https://www.rxassist.org/",
    availability: "Online portal 24/7",
    languages: ["English"],
    cost: "free",
    statutoryBasis: "Clinical & Community Health PAP Clearinghouse",
    tags: ["pap", "clinician-tool", "prescription-assistance", "forms", "enrollment", "advocacy"],
  },
  {
    id: "copay-relief",
    name: "Patient Advocate Foundation Co-Pay Relief Program",
    shortName: "PAF Co-Pay Relief",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "Patient Advocate Foundation (PAF)",
    description:
      "Provides direct financial grants to insured patients to cover prescription co-payments, co-insurance, and deductibles for chronic or life-threatening conditions.",
    clinicalUtility:
      "Overcomes catastrophic out-of-pocket prescription hurdles for patients with commercial insurance, Medicare, or military coverage.",
    services: [
      "Direct grant payments to pharmacies, medical providers, or patient reimbursements",
      "Coverage for disease-specific therapeutic regimens and specialty pharmaceuticals",
      "Assistance for cardiovascular, renal, oncology, and autoimmune conditions",
      "Dedicated bilingual case managers providing personalized case navigation",
    ],
    eligibilityNotes: "Must have valid health insurance with prescription coverage, meet income limits (up to 400-500% FPL), and carry qualifying diagnosis.",
    url: "https://copays.org/",
    phone: "1-866-512-3861",
    availability: "Online portal 24/7; phone support Mon-Fri 8:30am-5pm ET",
    languages: ["English", "Spanish"],
    cost: "financial-assistance",
    statutoryBasis: "501(c)(3) Independent Co-Pay Charitable Foundation",
    tags: ["copay", "deductibles", "specialty-drugs", "oncology", "cardiac", "kidney", "financial-aid"],
  },
  {
    id: "hrsa-340b",
    name: "340B Drug Pricing Program Covered Entities Guide",
    shortName: "340B Drug Pricing",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "HRSA Office of Pharmacy Affairs (OPA)",
    description:
      "Federal statutory program requiring manufacturers to provide outpatient medications at steep discounts (25-50%) to qualified safety-net healthcare organizations.",
    clinicalUtility:
      "Enables clinicians to route vulnerable patients to 340B covered clinics or contract pharmacies where costly medications can be dispensed at minimal out-of-pocket cost.",
    services: [
      "Directory of 340B eligible hospitals, FQHCs, Ryan White clinics, and specialized centers",
      "Information on 340B contract pharmacy networks and dispensing rules",
      "Guidance on patient eligibility requirements for receiving 340B discounted drugs",
      "Substantial discounts on biologics, insulins, inhalers, and specialty agents",
    ],
    eligibilityNotes: "Patient must receive established care from an eligible 340B covered entity healthcare provider.",
    url: "https://www.hrsa.gov/opa",
    phone: "1-888-340-2787",
    availability: "Information portal 24/7; OPA helpline Mon-Fri 9am-5pm ET",
    languages: ["English"],
    cost: "covered-entities",
    statutoryBasis: "Public Health Service Act § 340B (42 U.S.C. § 256b)",
    tags: ["340b", "safety-net", "discounted-pricing", "hrsa", "clinics", "specialty-care"],
  },

  // --------------------------------------------------------------------------
  // Domain 3: Maternal-Fetal, Perinatal & Teratogen Consultation
  // --------------------------------------------------------------------------
  {
    id: "mothertobaby",
    name: "MotherToBaby (OTIS Teratology Consultation Service)",
    shortName: "MotherToBaby",
    domain: "maternal-perinatal",
    subdomainTag: "pregnancy",
    organization: "Organization of Teratology Information Specialists (OTIS)",
    description:
      "Gold-standard free service providing evidence-based safety assessments and expert counseling on medications, vaccines, and exposures during pregnancy and lactation.",
    clinicalUtility:
      "Indispensable clinical consult service when managing pregnant or lactating patients exposed to teratogenic drugs, anticonvulsants, psychotropics, or biologics.",
    services: [
      "Free confidential consultations with board-certified teratogen information specialists",
      "Peer-reviewed, evidence-based exposure fact sheets in multiple languages",
      "Comprehensive risk assessments for prescription, OTC, herbal, and chemical exposures",
      "Direct chat, text message, and telephone communication channels",
    ],
    eligibilityNotes: "Available to any pregnant person, breastfeeding parent, healthcare professional, or family member nationwide.",
    url: "https://mothertobaby.org/",
    phone: "1-866-626-6847",
    sms: "855-999-3525",
    availability: "Phone/chat/text Mon-Fri 8am-5pm local time; fact sheets online 24/7",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "501(c)(3) Academic Teratology Non-Profit & CDC Partner",
    tags: ["pregnancy", "lactation", "teratogen", "breastfeeding", "obstetrics", "infant-safety"],
  },
  {
    id: "tlc-mama",
    name: "National Maternal Mental Health Hotline (1-833-TLC-MAMA)",
    shortName: "TLC-MAMA Hotline",
    domain: "maternal-perinatal",
    subdomainTag: "pregnancy",
    organization: "HRSA Maternal and Child Health Bureau",
    description:
      "24/7, free, confidential hotline providing voice and text support from trained, culturally competent perinatal mental health counselors.",
    clinicalUtility:
      "Direct referral line for perinatal depression, anxiety, postpartum mood episodes, and pregnancy-related psychiatric crises.",
    services: [
      "24/7/365 immediate voice call and text messaging support in English and Spanish",
      "Evidence-based screening and compassionate emotional support",
      "Referrals to local perinatal mental health providers, support groups, and crisis teams",
      "Interpretation services available in over 60 languages",
    ],
    eligibilityNotes: "Free and confidential for pregnant individuals, postpartum parents, and their loved ones.",
    url: "https://mchb.hrsa.gov/national-maternal-mental-health-hotline",
    phone: "1-833-852-6262",
    sms: "1-833-852-6262",
    availability: "24/7/365 toll-free call and text",
    languages: ["English", "Spanish", "Over 60 languages via interpreter"],
    cost: "free",
    statutoryBasis: "HRSA Maternal and Child Health Bureau (Federal Program)",
    tags: ["pregnancy", "postpartum", "mental-health", "crisis", "maternal-health", "24-7"],
  },
  {
    id: "psi",
    name: "Postpartum Support International (PSI)",
    shortName: "PSI Perinatal Support",
    domain: "maternal-perinatal",
    subdomainTag: "pregnancy",
    organization: "Postpartum Support International",
    description:
      "Global non-profit network dedicated to perinatal mood and anxiety disorders (PMADs), offering peer coordinators, online support groups, and clinician consultations.",
    clinicalUtility:
      "Provides both patient-facing peer navigation and a specialized Perinatal Psychiatric Consult Line for medical providers managing psychotropics in pregnancy.",
    services: [
      "National HelpLine with connection to local specialized support coordinators",
      "Provider-to-Provider Perinatal Psychiatric Consult Line (free for medical clinicians)",
      "Over 50 weekly specialized online peer support groups",
      "Resources for postpartum depression, anxiety, OCD, PTSD, and psychosis",
    ],
    eligibilityNotes: "Open to pregnant, postpartum, and post-loss parents, partners, and treating healthcare professionals.",
    url: "https://www.postpartum.net/",
    phone: "1-800-944-4773",
    sms: "800-944-4773",
    availability: "HelpLine returns messages within hours 7 days/week; directory 24/7",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "501(c)(3) Perinatal Mental Health Non-Profit",
    tags: ["pregnancy", "postpartum", "peer-support", "perinatal-psychiatry", "consult-line"],
  },

  // --------------------------------------------------------------------------
  // Domain 4: Chronic Disease & Organ Specialty Navigation
  // --------------------------------------------------------------------------
  {
    id: "nkf-cares",
    name: "National Kidney Foundation Cares (NKF Cares)",
    shortName: "NKF Cares Helpline",
    domain: "chronic-specialty",
    subdomainTag: "kidney",
    organization: "National Kidney Foundation (NKF)",
    description:
      "Dedicated patient information helpline staffed by trained specialists offering educational guidance, peer mentoring, and resources for chronic kidney disease.",
    clinicalUtility:
      "Assists patients with CKD stages 1-5, dialysis recipients, and clinicians navigating renal dietary restrictions, disease staging, and medication access.",
    services: [
      "Toll-free helpline providing customized chronic kidney disease education",
      "NKF Peers program connecting patients with trained kidney mentors",
      "Educational modules on dialysis modalities and kidney transplantation",
      "Community financial assistance and prescription savings navigation",
    ],
    eligibilityNotes: "Free and confidential for patients with CKD, dialysis patients, kidney donors, and family members.",
    url: "https://www.kidney.org/",
    phone: "1-855-653-2273",
    availability: "Helpline Mon-Fri 9am-5pm ET; educational portal 24/7",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "501(c)(3) National Kidney Health Non-Profit",
    tags: ["kidney", "ckd", "dialysis", "nephrology", "renal", "chronic-disease"],
  },
  {
    id: "akf",
    name: "American Kidney Fund (AKF)",
    shortName: "American Kidney Fund",
    domain: "chronic-specialty",
    subdomainTag: "kidney",
    organization: "American Kidney Fund",
    description:
      "Nation's leading independent non-profit providing direct financial assistance to dialysis and kidney transplant patients, including safety-net grants.",
    clinicalUtility:
      "Critical lifeline for ESRD and transplant patients unable to afford health insurance premiums, immunosuppressant co-pays, or transport to dialysis centers.",
    services: [
      "Health Insurance Premium Program (HIPP) covering Medicare Part B, Medigap, and commercial plans",
      "Safety-Net Grant Program for prescription co-pays, transportation, and emergency needs",
      "Disaster Relief grants for dialysis patients affected by natural emergencies",
      "Comprehensive kidney disease prevention and management education",
    ],
    eligibilityNotes: "Financial grants require nephrology/social worker referral and documented financial need (under specified FPL guidelines).",
    url: "https://www.kidneyfund.org/",
    phone: "1-800-638-8299",
    availability: "Online portal 24/7; phone assistance Mon-Fri 8am-5pm ET",
    languages: ["English", "Spanish"],
    cost: "financial-assistance",
    statutoryBasis: "501(c)(3) Charitable Foundation with OIG Advisory Opinion Compliance",
    tags: ["kidney", "dialysis", "esrd", "transplant", "financial-grants", "insurance-premiums"],
  },
  {
    id: "aha-support",
    name: "American Heart Association / Support Network",
    shortName: "AHA Support Network",
    domain: "chronic-specialty",
    subdomainTag: "cardiac",
    organization: "American Heart Association (AHA)",
    description:
      "National peer-to-peer online community and education hub for cardiac patients, stroke survivors, heart failure individuals, and their caregivers.",
    clinicalUtility:
      "Connects patients on complex cardiovascular regimens to peer mentors, lifestyle coaching, and cardiovascular prescription co-pay resources.",
    services: [
      "Online emotional support network with moderated condition-specific discussion forums",
      "Guideline-directed medical therapy educational guides for patients and families",
      "Directory of cardiovascular medication assistance programs and discount resources",
      "Heart failure, arrhythmia, and coronary artery disease recovery toolkits",
    ],
    eligibilityNotes: "Free access to all patients, survivors, caregivers, and medical professionals.",
    url: "https://supportnetwork.heart.org/",
    phone: "1-800-242-8721",
    availability: "Online community 24/7; AHA customer service Mon-Fri 7am-9pm CT, Sat 9am-5pm CT",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "501(c)(3) National Cardiovascular Non-Profit",
    tags: ["cardiac", "heart-failure", "cardiovascular", "arrhythmia", "peer-network", "stroke"],
  },
  {
    id: "unos",
    name: "United Network for Organ Sharing (UNOS Organ Center & Patient Services)",
    shortName: "UNOS Transplant Living",
    domain: "chronic-specialty",
    subdomainTag: "transplant",
    organization: "United Network for Organ Sharing (UNOS)",
    description:
      "Operates the nation's Organ Procurement and Transplantation Network (OPTN) and provides comprehensive patient navigation and educational guidance.",
    clinicalUtility:
      "Authoritative guide for candidates, recipients, and clinicians navigating organ allocation policies, transplant center selection, and recipient rights.",
    services: [
      "Transplant Living educational resources covering evaluation, waiting list, and post-transplant life",
      "Toll-free Patient Services helpline answering questions about allocation and transplant center data",
      "Directory of accredited transplant centers nationwide with comparative survival metrics",
      "Post-transplant medication adherence and financial planning resources",
    ],
    eligibilityNotes: "Free public service for pre-transplant candidates, living donors, recipients, and healthcare professionals.",
    url: "https://transplantliving.org/",
    phone: "1-888-894-6361",
    availability: "Transplant Living portal 24/7; Patient Services helpline Mon-Fri 8:30am-5pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "National Organ Transplant Act (NOTA; 42 U.S.C. § 273 et seq.) / OPTN Contractor",
    tags: ["transplant", "solid-organ", "immunosuppression", "optn", "unos", "kidney", "liver", "heart"],
  },
  {
    id: "nldac",
    name: "National Living Donor Assistance Center (NLDAC)",
    shortName: "NLDAC Living Donors",
    domain: "chronic-specialty",
    subdomainTag: "transplant",
    organization: "National Living Donor Assistance Center & HRSA",
    description:
      "Federal grant program providing financial reimbursement for non-medical expenses incurred by living kidney and liver donors.",
    clinicalUtility:
      "Removes non-medical financial disincentives (travel, lost wages) for living organ donors supporting patients awaiting solid-organ transplant.",
    services: [
      "Reimbursement of donor travel, lodging, and meal expenses related to donation",
      "Lost wage reimbursement during donor recovery and convalescence",
      "Dependent-care (childcare/eldercare) expense subsidies",
      "Program coordination through accredited transplant centers",
    ],
    eligibilityNotes: "Living organ donors whose recipient's household income falls within federal eligibility thresholds (up to 350% FPL).",
    url: "https://www.livingdonorassistance.org/",
    phone: "1-888-870-5002",
    availability: "Online portal 24/7; staff support Mon-Fri 9am-5pm ET",
    languages: ["English", "Spanish"],
    cost: "financial-assistance",
    statutoryBasis: "Public Health Service Act § 377 (42 U.S.C. § 274f) / HRSA Cooperative Agreement",
    tags: ["transplant", "living-donor", "kidney", "liver", "financial-grant", "travel-aid"],
  },
  {
    id: "ada",
    name: "American Diabetes Association (ADA & Insulin Help)",
    shortName: "ADA Insulin Help",
    domain: "chronic-specialty",
    subdomainTag: "diabetes",
    organization: "American Diabetes Association (ADA)",
    description:
      "National diabetes navigation service, clinical standards provider, and operator of the Insulin Help emergency affordability clearinghouse.",
    clinicalUtility:
      "Urgent resource when patients with diabetes experience sudden loss of insulin access, high co-pays, or lack of monitoring supplies.",
    services: [
      "Insulin Help clearinghouse (insulinhelp.org) connecting patients with $35 co-pay caps and emergency supplies",
      "Immediate triage protocols for patients with less than a 7-day supply of insulin",
      "Center for Information providing live phone and email support for diabetes management",
      "Standards of Care guideline education for clinicians and patients",
    ],
    eligibilityNotes: "Free clearinghouse open to all individuals with type 1 or type 2 diabetes and their healthcare providers.",
    url: "https://diabetes.org/",
    phone: "1-800-342-2383",
    availability: "Online directory 24/7; Center for Information Mon-Fri 9am-5:30pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "501(c)(3) National Diabetes Health Non-Profit",
    tags: ["diabetes", "insulin", "insulin-help", "endocrine", "copay-caps", "supplies"],
  },

  // --------------------------------------------------------------------------
  // Domain 5: Medical Toxicology & Poison Centers
  // --------------------------------------------------------------------------
  {
    id: "poison-help",
    name: "America's Poison Centers (Poison Help)",
    shortName: "Poison Help 1-800-222-1222",
    domain: "toxicology-poison",
    subdomainTag: "poison",
    organization: "America's Poison Centers (55 Regional Poison Centers Nationwide)",
    description:
      "24/7/365 immediate clinical triage and toxicology consultation staffed by medical toxicologists, clinical toxicologists, and certified poison specialists (CSPI).",
    clinicalUtility:
      "Immediate telephone consultation for acute medication overdoses, pediatric ingestions, adverse drug reactions, therapeutic errors, and chemical exposures.",
    services: [
      "24/7 free, confidential clinical consultation by telephone (1-800-222-1222)",
      "Online automated triage tool at PoisonHelp.org for non-emergent minor exposures",
      "Physician-to-physician clinical toxicology backup and antidote recommendations",
      "Immediate routing to local regional poison center based on caller area code/location",
    ],
    eligibilityNotes: "Free and confidential for the general public, paramedics, nurses, and physicians across all 50 states and US territories.",
    url: "https://www.poisonhelp.org/",
    phone: "1-800-222-1222",
    availability: "24/7/365 toll-free hotline nationwide",
    languages: ["English", "Spanish", "150+ languages via translation service"],
    cost: "free",
    statutoryBasis: "Federal Poison Center Support, Enhancement, and Awareness Act",
    tags: ["poison", "toxicology", "overdose", "antidote", "emergency", "24-7", "hotline"],
  },

  // --------------------------------------------------------------------------
  // Domain 6: Crisis, Mental Health & Peer Navigation
  // --------------------------------------------------------------------------
  {
    id: "lifeline-988",
    name: "988 Suicide & Crisis Lifeline",
    shortName: "988 Lifeline",
    domain: "crisis-mental-health",
    subdomainTag: "crisis",
    organization: "SAMHSA / Vibrant Emotional Health",
    description:
      "National 24/7/365 toll-free calling and texting network connecting anyone in suicidal crisis, emotional distress, or substance crisis to trained crisis counselors.",
    clinicalUtility:
      "Primary immediate safety-net referral for patients in acute depressive, suicidal, or severe psychiatric distress.",
    services: [
      "24/7 call and text via the 3-digit dialing code 988",
      "Online chat available at 988lifeline.org",
      "Dedicated Veterans Crisis Line (Dial 988, then press 1)",
      "Spanish-language crisis support (Dial 988, then press 2)",
      "Specialized LGBTQ+ youth and young adult counseling line",
    ],
    eligibilityNotes: "Free and confidential for anyone experiencing mental health distress, suicidal thoughts, or substance use crisis.",
    url: "https://988lifeline.org/",
    phone: "988",
    sms: "988",
    availability: "24/7/365 nationwide",
    languages: ["English", "Spanish", "240+ languages via Tele-Language"],
    cost: "free",
    statutoryBasis: "National Suicide Hotline Designation Act of 2020 (Public Law 116-172)",
    tags: ["crisis", "suicide-prevention", "mental-health", "lifeline", "24-7", "veterans"],
  },
  {
    id: "samhsa-helpline",
    name: "SAMHSA National Helpline & Treatment Locator",
    shortName: "SAMHSA Helpline",
    domain: "crisis-mental-health",
    subdomainTag: "crisis",
    organization: "Substance Abuse and Mental Health Services Administration (SAMHSA)",
    description:
      "24/7, 365-day-a-year treatment referral service for individuals and families facing mental health conditions, substance use disorders, or co-occurring issues.",
    clinicalUtility:
      "Locates licensed outpatient clinics, residential facilities, opioid treatment programs (OTPs), and buprenorphine providers nationwide.",
    services: [
      "Confidential treatment referrals to local community-based recovery facilities",
      "Searchable online treatment locator at FindTreatment.gov",
      "Bilingual live telephone navigation in English and Spanish",
      "Text messaging locator: text your 5-digit ZIP Code to 435748 (HELP4U)",
    ],
    eligibilityNotes: "Free public information service; treatment facilities accept varying combinations of Medicaid, Medicare, private insurance, or sliding-scale cash.",
    url: "https://findtreatment.gov/",
    phone: "1-800-662-4357",
    sms: "435748",
    availability: "24/7/365 toll-free hotline and web locator",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "Substance Abuse and Mental Health Services Administration (HHS)",
    tags: ["substance-use", "mental-health", "addiction", "treatment-locator", "otp", "samhsa"],
  },
  {
    id: "never-use-alone",
    name: "Never Use Alone (Peer Overdose Prevention Hotline)",
    shortName: "Never Use Alone",
    domain: "crisis-mental-health",
    subdomainTag: "crisis",
    organization: "Never Use Alone Inc. (501(c)(3) Non-Profit)",
    description:
      "Nationwide, toll-free, non-judgmental peer overdose prevention hotline providing real-time virtual monitoring during substance use.",
    clinicalUtility:
      "Lifesaving peer harm-reduction intervention for patients who use opioids or illicit sedatives alone, preventing fatal unattended overdoses.",
    services: [
      "Trained peer operator remains on phone with caller while they use substances",
      "Caller provides physical location in confidence; operator only contacts EMS if caller becomes unresponsive",
      "Zero judgment, zero law enforcement involvement unless medical emergency occurs",
      "Peer support, syringe service program (SSP) referral, and naloxone access guidance",
    ],
    eligibilityNotes: "Free and completely confidential for anyone using substances alone anywhere in the United States.",
    url: "https://neverusealone.com/",
    phone: "1-800-484-3731",
    availability: "24/7/365 nationwide hotline",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "501(c)(3) Peer Harm Reduction Organization",
    tags: ["harm-reduction", "overdose-prevention", "opioids", "fentanyl", "peer-support", "24-7"],
  },

  // --------------------------------------------------------------------------
  // Domain 7: HIV / AIDS ADAP & Ryan White CARE Act
  // --------------------------------------------------------------------------
  {
    id: "ryan-white-adap",
    name: "Ryan White HIV/AIDS Program & ADAP Directory",
    shortName: "Ryan White & ADAP",
    domain: "prescription-assistance",
    subdomainTag: "hiv-adap",
    organization: "HRSA HIV/AIDS Bureau (HAB)",
    description:
      "Federal safety-net program funding comprehensive medical care, support services, and the AIDS Drug Assistance Program (ADAP) for low-income people living with HIV.",
    clinicalUtility:
      "Provides essential antiretroviral therapy (ART), viral load monitoring, and medical co-pay coverage for underinsured or uninsured patients living with HIV.",
    services: [
      "AIDS Drug Assistance Program (ADAP) providing full formulary coverage or co-pay subsidies",
      "Comprehensive outpatient primary medical care and routine CD4/viral load monitoring",
      "Health insurance premium and cost-sharing assistance (SPAP coordination)",
      "Essential medical case management, housing assistance, and mental health support",
    ],
    eligibilityNotes: "Low-income individuals diagnosed with HIV who are uninsured or underinsured (state FPL guidelines typically 300%-500%).",
    url: "https://hab.hrsa.gov/get-care/find-ryan-white-services",
    phone: "1-888-275-4772",
    availability: "Online directory 24/7; HRSA Helpline Mon-Fri 8am-8pm ET",
    languages: ["English", "Spanish", "Interpretation available"],
    cost: "free",
    statutoryBasis: "Ryan White Comprehensive AIDS Resources Emergency Act (Title XXVI PHS Act)",
    tags: ["hiv", "aids", "adap", "ryan-white", "antiretroviral", "safety-net", "co-pay"],
  },

  // --------------------------------------------------------------------------
  // Domain 8: Oncology & Hematology Patient Co-Pay Funds
  // --------------------------------------------------------------------------
  {
    id: "lls-copay",
    name: "Leukemia & Lymphoma Society Co-Pay Assistance Program",
    shortName: "LLS Co-Pay Program",
    domain: "prescription-assistance",
    subdomainTag: "oncology",
    organization: "The Leukemia & Lymphoma Society (LLS)",
    description:
      "Provides direct financial grant assistance to blood cancer patients to cover prescription drug co-payments, health insurance premiums, and travel expenses.",
    clinicalUtility:
      "Critical funding source for patients diagnosed with leukemia, lymphoma, myeloma, or myelodysplastic syndromes facing high out-of-pocket costs for specialty oncolytics.",
    services: [
      "Direct financial co-pay and co-insurance assistance for approved blood cancer therapies",
      "Health insurance premium assistance for Medicare, commercial, and private plans",
      "Personalized Information Specialists (oncology social workers and nurses) providing navigation",
      "Clinical trial navigation and peer-to-peer support connections",
    ],
    eligibilityNotes: "Documented blood cancer diagnosis, US resident or permanent legal resident, household income within program guidelines (up to 500% FPL).",
    url: "https://www.lls.org/copay",
    phone: "1-877-557-2672",
    availability: "Online portal 24/7; phone assistance Mon-Fri 9am-8pm ET",
    languages: ["English", "Spanish"],
    cost: "financial-assistance",
    statutoryBasis: "501(c)(3) Independent Non-Profit Charitable Organization",
    tags: ["oncology", "hematology", "cancer", "copay", "leukemia", "lymphoma", "myeloma", "blood-cancer"],
  },
  {
    id: "cancer-support-community",
    name: "Cancer Support Community Helpline & Resources",
    shortName: "Cancer Support Community",
    domain: "chronic-specialty",
    subdomainTag: "oncology",
    organization: "Cancer Support Community (CSC)",
    description:
      "Global non-profit network providing free professional emotional support, cancer financial navigation, distress screening, and psychosocial resources.",
    clinicalUtility:
      "Provides clinical oncology social worker counseling, treatment decision support, and financial guidance for patients and families facing any malignant neoplasm.",
    services: [
      "Toll-free Cancer Support Helpline staffed by licensed oncology social workers",
      "Open Arms financial navigation and clinical trial search services",
      "Frankly Speaking About Cancer educational series and evidence-based guidance",
      "Online and local community support groups, nutrition guidance, and distress screening",
    ],
    eligibilityNotes: "Free and open to any person diagnosed with cancer, cancer survivors, family members, and caregivers.",
    url: "https://www.cancersupportcommunity.org/",
    phone: "1-888-793-9355",
    availability: "Helpline Mon-Fri 9am-9pm ET, Sat 9am-5pm ET; web resources 24/7",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "501(c)(3) Cancer Support Network",
    tags: ["oncology", "cancer", "counseling", "helpline", "financial-navigation", "psychosocial", "support"],
  },
  {
    id: "pan-foundation",
    name: "PAN Foundation (Patient Access Network)",
    shortName: "PAN Foundation",
    domain: "prescription-assistance",
    subdomainTag: "oncology",
    organization: "PAN Foundation (Patient Access Network)",
    description:
      "Independent charitable foundation helping underinsured patients with life-threatening, chronic, and rare diseases cover out-of-pocket prescription medication costs.",
    clinicalUtility:
      "Subsidizes out-of-pocket prescription co-payments, deductibles, and co-insurance for Medicare and commercially insured oncology, autoimmune, and specialty disease patients.",
    services: [
      "Direct financial grants for medication co-pays and insurance premiums across 70+ disease funds",
      "Transportation assistance grants covering travel to oncology clinics and specialty appointments",
      "FundFinder web tool sending real-time SMS and email alerts when closed disease funds reopen",
      "Dedicated patient advocacy and Medicare Part D reform guidance",
    ],
    eligibilityNotes: "Must have insurance covering the prescribed medication, qualifying diagnosis, household income <= 400%-500% FPL, and receive care in the US.",
    url: "https://www.panfoundation.org/",
    phone: "1-866-316-7263",
    availability: "Online portal 24/7; phone support Mon-Fri 9am-7pm ET",
    languages: ["English", "Spanish"],
    cost: "financial-assistance",
    statutoryBasis: "501(c)(3) Independent Co-Pay Assistance Foundation",
    tags: ["oncology", "cancer", "copay", "pan-foundation", "medicare", "grants", "specialty-drugs"],
  },
  {
    id: "healthwell-foundation",
    name: "HealthWell Foundation Co-Pay & Premium Relief",
    shortName: "HealthWell Foundation",
    domain: "prescription-assistance",
    subdomainTag: "oncology",
    organization: "HealthWell Foundation",
    description:
      "Non-profit organization providing financial assistance to underinsured individuals living with chronic, oncology, hematologic, or life-altering illnesses.",
    clinicalUtility:
      "Overcomes catastrophic prescription cost sharing for patients with oncology, hematology, and autoimmune diagnoses unable to afford co-pays or health insurance premiums.",
    services: [
      "Direct grant assistance for prescription co-payments, deductibles, and co-insurance",
      "Health insurance premium assistance for qualifying disease-specific funds",
      "Pediatric palliative care and behavioral health fund coverage",
      "Real-time online disease fund status check and rapid provider portal enrollment",
    ],
    eligibilityNotes: "Must have valid health insurance covering the drug, qualifying medical diagnosis, and household income <= 400%-500% FPL.",
    url: "https://www.healthwellfoundation.org/",
    phone: "1-800-675-8416",
    availability: "Online portal 24/7; phone assistance Mon-Fri 9am-5pm ET",
    languages: ["English", "Spanish"],
    cost: "financial-assistance",
    statutoryBasis: "501(c)(3) Independent Charitable Foundation",
    tags: ["oncology", "cancer", "healthwell", "copay", "premiums", "chronic-disease", "grants"],
  },

  // --------------------------------------------------------------------------
  // Domain 9: Rare Disease & Compassionate Use / Expanded Access
  // --------------------------------------------------------------------------
  {
    id: "nord-pap",
    name: "National Organization for Rare Disorders (NORD) Patient Assistance",
    shortName: "NORD Rare Disease PAP",
    domain: "prescription-assistance",
    subdomainTag: "rare-disease",
    organization: "National Organization for Rare Disorders (NORD)",
    description:
      "Dedicated patient assistance and medication access programs for individuals diagnosed with rare and orphan diseases.",
    clinicalUtility:
      "Provides medication co-payment assistance, diagnostic testing financial support, emergency relief grants, and travel assistance to specialized centers for rare diseases.",
    services: [
      "Disease-specific medication co-payment and insurance premium assistance funds",
      "Financial assistance for specialized rare disease diagnostic workups and genetic testing",
      "Travel and lodging assistance for expert consultations and clinical trials",
      "Educational clearinghouse and rare disease clinical advocacy support",
    ],
    eligibilityNotes: "Confirmed diagnosis of a recognized rare disease, US residency, and demonstrated financial need (typically <= 400%-500% FPL).",
    url: "https://rarediseases.org/",
    phone: "1-800-999-6673",
    availability: "Online database 24/7; phone support Mon-Fri 8:30am-5pm ET",
    languages: ["English", "Spanish"],
    cost: "financial-assistance",
    statutoryBasis: "501(c)(3) Rare Disease Advocacy Organization",
    tags: ["rare-disease", "orphan-drugs", "nord", "copay", "diagnostic-assistance", "expanded-access"],
  },
  {
    id: "fda-expanded-access",
    name: "FDA Expanded Access / Compassionate Use Navigator",
    shortName: "FDA Expanded Access",
    domain: "prescription-assistance",
    subdomainTag: "rare-disease",
    organization: "U.S. Food and Drug Administration (FDA CDER / OCE)",
    description:
      "Authoritative regulatory pathway enabling patients with immediately life-threatening or serious conditions to access investigational medical products outside clinical trials.",
    clinicalUtility:
      "Assists licensed physicians in submitting single-patient IND (emergency or non-emergency) requests under 21 CFR § 312.300 for investigational therapeutics when no satisfactory approved therapy exists.",
    services: [
      "Guidance for licensed physicians submitting FDA Form 3926 (Individual Patient Expanded Access IND)",
      "Project Facilitate (FDA Oncology Center of Excellence single-point-of-contact pilot for oncology requests)",
      "CDER Division of Drug Information rapid technical and regulatory assistance",
      "Coordination guidance between pharmaceutical manufacturers, treating oncologists, and IRBs",
    ],
    eligibilityNotes: "Patient has serious or life-threatening condition, no comparable satisfactory alternative therapy, and potential benefit justifies potential risks.",
    url: "https://www.fda.gov/news-events/public-health-focus/expanded-access",
    phone: "1-855-543-3784",
    availability: "Information portal 24/7; Project Facilitate phone line Mon-Fri 8am-4:30pm ET",
    languages: ["English"],
    cost: "free",
    statutoryBasis: "21 CFR § 312.300 (Subpart I) & FD&C Act § 561 (21 U.S.C. § 360bbb)",
    tags: ["expanded-access", "compassionate-use", "investigational-drugs", "fda", "ind", "rare-disease", "oncology"],
  },

  // --------------------------------------------------------------------------
  // Domain 10: Senior & Low-Income Medicare Navigation
  // --------------------------------------------------------------------------
  {
    id: "medicare-extra-help",
    name: "Medicare Part D Extra Help / Low Income Subsidy (LIS)",
    shortName: "Medicare Extra Help / LIS",
    domain: "prescription-assistance",
    subdomainTag: "senior-medicare",
    organization: "Social Security Administration (SSA) & CMS",
    description:
      "Federal program helping Medicare beneficiaries with limited income and resources pay Part D prescription drug costs (premiums, deductibles, and co-payments).",
    clinicalUtility:
      "Dramatically reduces prescription out-of-pocket expenses to statutory nominal co-pays (approx $4.50 generic, $11.20 brand in 2024+) with $0 deductible and no donut hole / coverage gap penalties.",
    services: [
      "Covers Medicare Part D monthly plan premiums up to the regional benchmark amount",
      "Eliminates annual Medicare Part D prescription deductible",
      "Fixes generic and brand-name co-payments to low federal statutory caps",
      "Eliminates Part D late enrollment penalties (LEP) for qualifying enrollees",
    ],
    eligibilityNotes: "Enrolled in Medicare Part A and/or Part B, reside in the US, meet annual income and resource/asset limits established by SSA.",
    url: "https://www.ssa.gov/medicare/part-d-extra-help",
    phone: "1-800-772-1213",
    availability: "Online application 24/7; SSA phone assistance Mon-Fri 8am-7pm local time",
    languages: ["English", "Spanish", "Multi-language interpretation"],
    cost: "financial-assistance",
    statutoryBasis: "Social Security Act § 1860D-14 (42 U.S.C. § 1395w-114)",
    tags: ["medicare", "extra-help", "lis", "part-d", "seniors", "low-income", "social-security"],
  },
  {
    id: "spap-directory",
    name: "State Pharmaceutical Assistance Programs (SPAPs) Directory",
    shortName: "State SPAP Directory",
    domain: "prescription-assistance",
    subdomainTag: "senior-medicare",
    organization: "Centers for Medicare & Medicaid Services (CMS) & State Health Agencies",
    description:
      "State-funded programs that provide financial assistance to help low-income seniors and individuals with disabilities pay for prescription drugs, wrapping around Medicare Part D.",
    clinicalUtility:
      "Wraps around Medicare Part D coverage to pay remaining deductibles, co-pays, or catastrophic coverage gaps for eligible residents in participating states.",
    services: [
      "Secondary payer coverage for Medicare Part D prescription co-payments and deductibles",
      "State-specific programs: New York EPIC, Pennsylvania PACE/PACENET, New Jersey PAAD, Texas SPAP, California, etc.",
      "Coverage for medications not listed on standard Part D plan formularies in certain states",
      "Seamless coordination with federal Low Income Subsidy (Extra Help) for dual-eligible seniors",
    ],
    eligibilityNotes: "State residency, age 65+ or documented disability (SSDI), Medicare Part D enrollment, and state-defined income thresholds.",
    url: "https://www.medicare.gov/health-drug-plans/part-d/state-pharmaceutical-assistance-programs",
    phone: "1-800-633-4227",
    availability: "CMS portal 24/7; 1-800-MEDICARE available 24/7/365",
    languages: ["English", "Spanish"],
    cost: "financial-assistance",
    statutoryBasis: "Social Security Act § 1860D-23 & State Statutes",
    tags: ["spap", "medicare", "seniors", "state-programs", "epic", "pace", "paad", "prescription-assistance"],
  },

  // --------------------------------------------------------------------------
  // Domain 11: Harm Reduction & Mail-Based Naloxone Access
  // --------------------------------------------------------------------------
  {
    id: "next-distro",
    name: "NEXT Distro (Mail-Based Harm Reduction & Naloxone Access)",
    shortName: "NEXT Distro Naloxone",
    domain: "toxicology-poison",
    subdomainTag: "harm-reduction",
    organization: "NEXT Harm Reduction (501(c)(3) Non-Profit)",
    description:
      "Online and mail-based harm reduction platform providing free, confidential delivery of intramuscular and nasal naloxone (Narcan) and harm reduction supplies.",
    clinicalUtility:
      "Vital lifeline for individuals who use drugs, their families, and rural or stigma-burdened patients unable to access in-person syringe service programs or retail pharmacy naloxone.",
    services: [
      "Free mail delivery of naloxone (intramuscular or nasal) directly to patient residence",
      "State-by-state online ordering portals and video training modules on overdose recognition and response",
      "Fentanyl and xylazine test strip distribution where legally authorized",
      "Safe sharps disposal guidance and digital syringe service program navigation",
    ],
    eligibilityNotes: "Free and completely confidential for individuals who use drugs, family members, and community responders in eligible states.",
    url: "https://nextdistro.org/",
    availability: "Online request portal 24/7; packages shipped discreetly",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "501(c)(3) Public Health Harm Reduction Initiative",
    tags: ["harm-reduction", "naloxone", "narcan", "overdose-prevention", "opioids", "mail-delivery", "free"],
  },
  {
    id: "remedichain",
    name: "RemediChain (Specialty Medication Redistribution Network)",
    shortName: "RemediChain",
    domain: "prescription-assistance",
    subdomainTag: "oncology",
    organization: "RemediChain & Good Shepherd Pharmacy",
    description:
      "Non-profit drug repository platform matching donated, unopened oral chemotherapy and high-cost specialty medications with vulnerable, uninsured patients.",
    clinicalUtility:
      "Facilitates prescription donation and reclamation under state drug repository laws, providing high-cost oral oncolytics and specialty drugs to patients in the coverage gap.",
    services: [
      "Patient reclamation of donated oral oncolytics, specialty biologics, and targeted therapies",
      "Pharmacist-verified safety, seal inspection, and expiration auditing of all donated drugs",
      "Full legal compliance under state Prescription Drug Repository Program statutes",
      "No-cost dispensing and direct home delivery for qualified uninsured/underinsured patients",
    ],
    eligibilityNotes: "Uninsured or underinsured patients who cannot afford prescribed specialty medications; valid prescription from licensed clinician required.",
    url: "https://www.remedichain.org/",
    phone: "1-833-997-3633",
    availability: "Online donation and request portal 24/7; pharmacy team Mon-Fri 9am-5pm CT",
    languages: ["English"],
    cost: "free",
    statutoryBasis: "State Prescription Drug Repository Laws",
    tags: ["remedichain", "oncology", "chemotherapy", "drug-repository", "donated-meds", "uninsured", "specialty-drugs"],
  },

  // --------------------------------------------------------------------------
  // Domain 12: Medical Transportation & Food as Medicine
  // --------------------------------------------------------------------------
  {
    id: "medicaid-nemt",
    name: "Medicaid Non-Emergency Medical Transportation (NEMT)",
    shortName: "Medicaid NEMT",
    domain: "primary-care",
    subdomainTag: "social-transport",
    organization: "Centers for Medicare & Medicaid Services (CMS) & State Medicaid Agencies",
    description:
      "Federally mandated Medicaid benefit providing free transportation to and from medical appointments, dialysis centers, oncology clinics, and pharmacies.",
    clinicalUtility:
      "Removes geographic and transportation barriers preventing adherence to chemotherapy regimens, daily radiation, scheduled hemodialysis, and essential follow-up visits.",
    services: [
      "Door-to-door van, wheelchair-accessible vehicle, taxi, and public transit vouchers",
      "Mileage reimbursement for volunteer or family member drivers",
      "Stretcher and non-emergent medical escort transportation",
      "Coordination through state Medicaid managed care organizations (MCOs) and transportation brokers",
    ],
    eligibilityNotes: "Enrolled in Medicaid, attending a Medicaid-covered healthcare appointment or pharmacy, and lacking other viable transportation.",
    url: "https://www.medicaid.gov/medicaid/benefits/prescription-drugs/non-emergency-medical-transportation",
    phone: "1-877-267-2323",
    availability: "State brokerage lines operate during regular business hours; online portals vary by state",
    languages: ["English", "Spanish", "State-mandated multi-language interpretation"],
    cost: "free",
    statutoryBasis: "42 CFR § 431.53 (Mandatory Medicaid Transportation Benefit)",
    tags: ["transportation", "nemt", "medicaid", "social-determinants", "dialysis-travel", "chemo-travel", "safety-net"],
  },
  {
    id: "fimc-nutrition",
    name: "Food as Medicine Coalition (FIMC Medically Tailored Meals)",
    shortName: "FIMC Medically Tailored Meals",
    domain: "chronic-specialty",
    subdomainTag: "social-transport",
    organization: "Food as Medicine Coalition (FIMC)",
    description:
      "National association of non-profit community food programs providing medically tailored meals (MTMs), medical nutrition therapy, and nutrition counseling for severe illness.",
    clinicalUtility:
      "Critical clinical intervention for patients with advanced heart failure, ESRD on dialysis, oncology cachexia, or uncontrolled diabetes unable to prepare therapeutic diets.",
    services: [
      "Home-delivered, medically tailored meals designed by registered dietitian nutritionists (RDNs)",
      "Disease-specific menus tailored for renal disease, cardiac restriction, diabetic control, and oncology",
      "Medical Nutrition Therapy (MNT) and personalized dietary counseling",
      "Referral navigation through Medicaid 1115 waivers, Medicare Advantage, and Ryan White CARE Act",
    ],
    eligibilityNotes: "Patients diagnosed with severe, chronic, or life-limiting illnesses with clinical referral from attending healthcare team.",
    url: "https://www.fimcoalition.org/",
    availability: "Directory 24/7; regional agency operational hours vary",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "501(c)(3) Nutrition & Healthcare Coalition / Medicaid 1115 Waiver Partner",
    tags: ["food-as-medicine", "fimc", "medically-tailored-meals", "nutrition", "heart-failure", "ckd", "oncology"],
  },

  // --------------------------------------------------------------------------
  // Domain 13: Manufacturer Direct Patient Assistance Program (PAP) Directory
  // --------------------------------------------------------------------------
  {
    id: "pap-humira-complete",
    name: "AbbVie Assist / Humira Complete (Adalimumab)",
    shortName: "Humira Complete PAP",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "AbbVie Inc.",
    description:
      "Manufacturer patient assistance program providing free Humira for qualifying uninsured/underinsured patients, alongside commercial co-pay cards (as little as $5/month).",
    clinicalUtility:
      "Provides rapid access and co-pay relief for patients prescribed adalimumab for rheumatoid arthritis, Crohn's disease, ulcerative colitis, or plaque psoriasis.",
    services: [
      "Free medication for eligible uninsured or underinsured patients meeting income limits",
      "Humira Complete Co-Pay Savings Card ($5/month for eligible commercially insured patients)",
      "Dedicated nurse ambassador support and injection training",
      "Sharps disposal container delivery and ongoing adherence monitoring",
    ],
    eligibilityNotes: "US resident; income typically <= 600% FPL for uninsured free drug program; commercial co-pay card excludes federal healthcare beneficiaries.",
    url: "https://www.humira.com/humira-complete",
    phone: "1-800-448-6472",
    availability: "Online portal 24/7; phone support Mon-Fri 8am-8pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "Manufacturer Patient Assistance Program (AbbVie)",
    tags: ["adalimumab", "humira", "pap", "biologic", "anti-tnf", "autoimmune", "abbvie"],
  },
  {
    id: "pap-dupixent-myway",
    name: "Dupixent MyWay Patient Support (Dupilumab)",
    shortName: "Dupixent MyWay PAP",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "Sanofi & Regeneron Pharmaceuticals",
    description:
      "Manufacturer assistance program providing co-pay card savings ($0 co-pay for eligible commercial patients) and free dupilumab for qualifying uninsured patients.",
    clinicalUtility:
      "Supports patient access to dupilumab for atopic dermatitis, severe asthma, chronic rhinosinusitis, and eosinophilic esophagitis.",
    services: [
      "Dupixent MyWay Co-Pay Card ($0 copay for commercially insured patients, up to annual max)",
      "Free medication through Sanofi Patient Assistance Foundation for eligible uninsured patients",
      "Insurance verification and prior authorization appeal assistance",
      "Nurse educator phone support and demonstration injection kits",
    ],
    eligibilityNotes: "Commercial insurance for co-pay card; uninsured US residents with household income <= 400% FPL qualify for Sanofi PAF.",
    url: "https://www.dupixent.com/support-savings/dupixent-my-way",
    phone: "1-844-387-4936",
    availability: "Online portal 24/7; specialists available Mon-Fri 8am-9pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "Manufacturer Patient Assistance Program (Sanofi / Regeneron)",
    tags: ["dupilumab", "dupixent", "pap", "biologic", "asthma", "atopic-dermatitis", "sanofi"],
  },
  {
    id: "pap-bms-eliquis",
    name: "Bristol Myers Squibb Patient Assistance Foundation (Apixaban)",
    shortName: "BMS Eliquis PAP",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "Bristol Myers Squibb Patient Assistance Foundation",
    description:
      "Independent charitable organization providing free Eliquis (apixaban) to eligible patients with financial hardship and no prescription insurance.",
    clinicalUtility:
      "Overcomes catastrophic out-of-pocket costs for direct oral anticoagulation in non-valvular atrial fibrillation or venous thromboembolism.",
    services: [
      "100% free outpatient supply of Eliquis for qualifying uninsured or underinsured patients",
      "Commercial co-pay card navigation ($10/month for eligible commercially insured patients)",
      "Dedicated case advocate assistance with clinician application certification",
      "Direct pharmacy shipment or clinic delivery options",
    ],
    eligibilityNotes: "US resident; uninsured or functionally underinsured; household income <= 300% FPL (Medicare Part D patients with coverage gap considered).",
    url: "https://www.bmspaf.org/",
    phone: "1-800-736-0003",
    availability: "Online portal 24/7; phone support Mon-Fri 8am-8pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "Manufacturer Charitable Foundation (BMS PAF)",
    tags: ["apixaban", "eliquis", "pap", "anticoagulant", "doac", "afib", "bms"],
  },
  {
    id: "pap-jnj-xarelto",
    name: "Johnson & Johnson Patient Assistance Foundation (Rivaroxaban)",
    shortName: "J&J Xarelto PAP",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "Johnson & Johnson Patient Assistance Foundation (JJPAF)",
    description:
      "Charitable foundation providing free Xarelto (rivaroxaban) to low-income patients who lack adequate prescription drug coverage.",
    clinicalUtility:
      "Secures uninterrupted anticoagulation therapy for patients with DVT, PE, CAD/PAD, or atrial fibrillation facing prescription affordability barriers.",
    services: [
      "Free outpatient medication supply of Xarelto for qualifying patients",
      "Xarelto withMe Savings Card ($10/month for eligible commercially insured patients)",
      "Benefit investigation and coverage determination advocacy",
      "Fast-track electronic enrollment for licensed prescribers",
    ],
    eligibilityNotes: "US resident; no prescription insurance or enrolled in Medicare Part D meeting hardship rules; household income <= 400% FPL.",
    url: "https://www.jjpaf.org/",
    phone: "1-800-652-6227",
    availability: "Online portal 24/7; phone assistance Mon-Fri 8am-8pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "Manufacturer Charitable Foundation (JJPAF)",
    tags: ["rivaroxaban", "xarelto", "pap", "anticoagulant", "doac", "janssen", "jnj"],
  },
  {
    id: "pap-boehringer-jardiance",
    name: "Boehringer Ingelheim Cares (Empagliflozin & Linagliptin)",
    shortName: "BI Cares Jardiance PAP",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "Boehringer Ingelheim Cares Foundation",
    description:
      "Supplies free outpatient Jardiance (empagliflozin) and Tradjenta (linagliptin) to eligible low-income patients without prescription drug insurance.",
    clinicalUtility:
      "Provides vital access to SGLT2 inhibitor therapy for patients with type 2 diabetes, heart failure (HFrEF/HFpEF), and chronic kidney disease.",
    services: [
      "Free outpatient drug dispensing for Jardiance, Tradjenta, Glyxambi, and Synjardy",
      "Commercial savings card programs ($10/month for eligible commercially insured patients)",
      "Prescriber electronic re-order portals and direct-to-patient home delivery",
      "Comprehensive disease education and lifestyle support resources",
    ],
    eligibilityNotes: "US resident; uninsured or Medicare Part D beneficiaries without affordable coverage; household income <= 400% FPL.",
    url: "https://www.boehringer-ingelheim.us/our-responsibility/patient-assistance-program",
    phone: "1-800-556-8317",
    availability: "Online portal 24/7; phone support Mon-Fri 8am-8pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "Manufacturer Charitable Foundation (BI Cares)",
    tags: ["empagliflozin", "jardiance", "linagliptin", "tradjenta", "pap", "sglt2", "diabetes", "heart-failure"],
  },
  {
    id: "pap-novocare-diabetes",
    name: "NovoCare Patient Assistance Program (Semaglutide & Liraglutide)",
    shortName: "NovoCare Diabetes PAP",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "Novo Nordisk Inc.",
    description:
      "Provides free Ozempic, Rybelsus, and Victoza for qualifying uninsured patients or Medicare Part D beneficiaries facing financial hardship.",
    clinicalUtility:
      "Ensures critical access to GLP-1 receptor agonists for type 2 diabetes management, cardiovascular risk reduction, and metabolic stability.",
    services: [
      "100% free prescription drug supplies for qualifying patients without insurance",
      "NovoCare Savings Card options for eligible commercially insured patients ($25/month)",
      "Medicare Part D Extra Help and foundation grant navigation support",
      "Dedicated customer care specialists and injection device instruction",
    ],
    eligibilityNotes: "US citizen or legal resident; household income <= 400% FPL; uninsured or Medicare Part D enrolled (commercial insurance excluded from free PAP).",
    url: "https://www.novocare.com/diabetes-overview/let-us-help/pap.html",
    phone: "1-866-310-7549",
    availability: "Online portal 24/7; live assistance Mon-Fri 8am-8pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "Manufacturer Patient Assistance Program (Novo Nordisk)",
    tags: ["semaglutide", "ozempic", "rybelsus", "liraglutide", "victoza", "glp1", "diabetes", "pap"],
  },
  {
    id: "pap-novartis-entresto",
    name: "Novartis Patient Assistance Foundation (Sacubitril/Valsartan)",
    shortName: "Novartis Entresto PAP",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "Novartis Patient Assistance Foundation (NPAF)",
    description:
      "Provides free Entresto to eligible patients experiencing financial hardship and lacking adequate prescription coverage.",
    clinicalUtility:
      "Crucial bridge ensuring access to guideline-directed medical therapy (ARNI) for patients with heart failure with reduced or preserved ejection fraction.",
    services: [
      "Free outpatient supplies of Entresto for uninsured or underinsured patients",
      "Entresto $10 Co-Pay Card for eligible commercially insured individuals",
      "Fast-track electronic enrollment application for cardiology clinic teams",
      "Continuous refill coordination and pharmacy ship-to-home service",
    ],
    eligibilityNotes: "US resident; household income <= 300% FPL; uninsured or underinsured; Medicare Part D patients must meet specific out-of-pocket spend requirements.",
    url: "https://www.entresto.com/financial-resources",
    phone: "1-800-277-2254",
    availability: "Online portal 24/7; phone assistance Mon-Fri 8am-8pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "Manufacturer Charitable Foundation (NPAF)",
    tags: ["sacubitril-valsartan", "entresto", "heart-failure", "cardiovascular", "arni", "novartis", "pap"],
  },
  {
    id: "pap-merck-keytruda",
    name: "The Merck Access Program & Patient Assistance (Pembrolizumab)",
    shortName: "Merck Keytruda PAP",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "Merck & Co., Inc.",
    description:
      "Offers reimbursement support, commercial co-pay assistance ($0-$25), and free Keytruda through the Merck Patient Assistance Program.",
    clinicalUtility:
      "Provides urgent access to anti-PD-1 immune checkpoint inhibitor therapy for patients diagnosed with diverse solid tumors and hematologic malignancies.",
    services: [
      "Free pembrolizumab product for eligible uninsured or underinsured oncology patients",
      "Merck Access Program Co-Pay Card for eligible commercially insured patients",
      "Dedicated reimbursement case manager conducting rapid benefit investigations",
      "Prior authorization and appeals guidance for clinical oncology teams",
    ],
    eligibilityNotes: "Uninsured or underinsured oncology patients; household income <= 500% FPL; medical documentation and prescriber attestation required.",
    url: "https://www.merckaccessprogram-keytruda.com/",
    phone: "1-855-257-3725",
    availability: "Portal 24/7; case managers available Mon-Fri 8am-8pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "Manufacturer Patient Assistance Program (Merck)",
    tags: ["pembrolizumab", "keytruda", "oncology", "cancer", "immunotherapy", "checkpoint-inhibitor", "pap"],
  },
  {
    id: "pap-janssen-stelara",
    name: "Janssen CarePath & JJPAF (Ustekinumab)",
    shortName: "Janssen Stelara PAP",
    domain: "prescription-assistance",
    subdomainTag: "pap",
    organization: "Janssen Biotech / Johnson & Johnson",
    description:
      "Comprehensive access support for Stelara including commercial co-pay savings ($5 per dose) and free medication for uninsured eligible patients.",
    clinicalUtility:
      "Supports patient access to targeted IL-12/23 inhibitor biologic therapy for plaque psoriasis, psoriatic arthritis, and Crohn's disease.",
    services: [
      "Janssen CarePath Savings Program ($5 per dose for commercially insured patients)",
      "Free medication through Johnson & Johnson Patient Assistance Foundation for uninsured patients",
      "Insurance verification and re-authorization tracking for specialty clinics",
      "Janssen CarePath Care Coordinator personalized phone support",
    ],
    eligibilityNotes: "Commercial insurance for savings card; uninsured or underinsured US residents with income <= 400% FPL qualify for free JJPAF medication.",
    url: "https://www.janssencarepath.com/patient/stelara",
    phone: "1-877-227-3728",
    availability: "Online portal 24/7; Care Coordinators Mon-Fri 8am-8pm ET",
    languages: ["English", "Spanish"],
    cost: "free",
    statutoryBasis: "Manufacturer Patient Assistance Program (Janssen / J&J)",
    tags: ["ustekinumab", "stelara", "biologic", "psoriasis", "crohns", "janssen", "pap"],
  },
] as const;

export const RESOURCE_BY_ID: Record<string, HealthcareResource> = Object.fromEntries(
  HEALTHCARE_RESOURCES.map((r) => [r.id, r]),
);

// ============================================================================
// 3B. MANUFACTURER DIRECT PATIENT ASSISTANCE PROGRAM (PAP) DIRECTORY
// ============================================================================

export interface ManufacturerPAPProgram {
  id: string;
  drugNames: readonly string[];
  genericIds: readonly string[];
  programName: string;
  manufacturer: string;
  description: string;
  eligibilitySummary: string;
  incomeThreshold: string;
  insuranceCriteria: string;
  url: string;
  phone: string;
  portalUrl?: string;
  formDownloadUrl?: string;
  tags: readonly string[];
}

export const MANUFACTURER_PAP_DIRECTORY: readonly ManufacturerPAPProgram[] = [
  {
    id: "pap-humira-complete",
    drugNames: ["Adalimumab", "Humira", "Humira Pen"],
    genericIds: ["adalimumab"],
    programName: "AbbVie Assist / Humira Complete",
    manufacturer: "AbbVie Inc.",
    description:
      "Provides free Humira to qualifying uninsured/underinsured patients, alongside commercial co-pay cards (as little as $5/month).",
    eligibilitySummary:
      "Uninsured or underinsured US residents; income typically <= 600% FPL; commercial savings card up to annual maximum.",
    incomeThreshold: "Up to 600% Federal Poverty Level",
    insuranceCriteria: "Uninsured, Medicare Part D with coverage gap/hardship, or commercial insurance",
    url: "https://www.humira.com/humira-complete",
    phone: "1-800-448-6472",
    tags: ["adalimumab", "humira", "biologic", "anti-tnf", "autoimmune", "abbvie"],
  },
  {
    id: "pap-dupixent-myway",
    drugNames: ["Dupilumab", "Dupixent"],
    genericIds: ["dupilumab"],
    programName: "Dupixent MyWay Patient Support",
    manufacturer: "Sanofi & Regeneron Pharmaceuticals",
    description:
      "Assists eligible patients with co-pay card savings ($0 co-pay for eligible commercial patients) and free medication for uninsured patients via the Sanofi Patient Assistance Foundation.",
    eligibilitySummary:
      "Commercial patients eligible for $0 copay card; uninsured qualify for Sanofi PAF (<= 400% FPL).",
    incomeThreshold: "Up to 400% FPL for free drug PAP",
    insuranceCriteria: "Commercial insurance (copay card) or uninsured (Sanofi PAF)",
    url: "https://www.dupixent.com/support-savings/dupixent-my-way",
    phone: "1-844-387-4936",
    tags: ["dupilumab", "dupixent", "biologic", "asthma", "atopic-dermatitis", "sanofi", "regeneron"],
  },
  {
    id: "pap-bms-eliquis",
    drugNames: ["Apixaban", "Eliquis"],
    genericIds: ["apixaban"],
    programName: "Bristol Myers Squibb Patient Assistance Foundation (BMS PAF)",
    manufacturer: "Bristol Myers Squibb",
    description:
      "Provides free Eliquis to eligible patients with no prescription coverage, plus commercial co-pay cards ($10/month for eligible commercial patients).",
    eligibilitySummary: "US resident; uninsured or underinsured; household income <= 300% FPL.",
    incomeThreshold: "Up to 300% Federal Poverty Level",
    insuranceCriteria: "Uninsured, or Medicare Part D patients meeting hardship criteria",
    url: "https://www.bmspaf.org/",
    phone: "1-800-736-0003",
    tags: ["apixaban", "eliquis", "anticoagulant", "doac", "afib", "dvt", "bms"],
  },
  {
    id: "pap-jnj-xarelto",
    drugNames: ["Rivaroxaban", "Xarelto"],
    genericIds: ["rivaroxaban"],
    programName: "Johnson & Johnson Patient Assistance Foundation (JJPAF)",
    manufacturer: "Johnson & Johnson Innovative Medicine",
    description:
      "Provides free Xarelto to patients with financial need and no prescription coverage; commercial savings card allows eligible patients to pay $10/month.",
    eligibilitySummary:
      "US resident; uninsured or Medicare Part D with qualifying spend; income <= 400% FPL.",
    incomeThreshold: "Up to 400% Federal Poverty Level",
    insuranceCriteria: "Uninsured, or Medicare Part D experiencing coverage gap",
    url: "https://www.jjpaf.org/",
    phone: "1-800-652-6227",
    tags: ["rivaroxaban", "xarelto", "anticoagulant", "doac", "jnj", "janssen"],
  },
  {
    id: "pap-boehringer-jardiance",
    drugNames: ["Empagliflozin", "Jardiance", "Linagliptin", "Tradjenta", "Glyxambi", "Synjardy"],
    genericIds: ["empagliflozin", "linagliptin", "empagliflozin-linagliptin", "empagliflozin-metformin"],
    programName: "Boehringer Ingelheim Cares Foundation Patient Assistance",
    manufacturer: "Boehringer Ingelheim",
    description:
      "Supplies free outpatient Jardiance and Tradjenta to eligible low-income patients without prescription drug insurance, and offers $10 commercial co-pay savings cards.",
    eligibilitySummary:
      "US resident; uninsured or Medicare Part D with no affordable coverage; household income <= 400% FPL.",
    incomeThreshold: "Up to 400% Federal Poverty Level",
    insuranceCriteria: "Uninsured or Medicare Part D beneficiaries",
    url: "https://www.boehringer-ingelheim.us/our-responsibility/patient-assistance-program",
    phone: "1-800-556-8317",
    tags: ["empagliflozin", "jardiance", "linagliptin", "tradjenta", "sglt2", "diabetes", "heart-failure", "boehringer"],
  },
  {
    id: "pap-novocare-diabetes",
    drugNames: ["Semaglutide", "Ozempic", "Rybelsus", "Wegovy", "Liraglutide", "Victoza", "Saxenda"],
    genericIds: ["semaglutide", "liraglutide", "semaglutide-oral", "semaglutide-wegovy", "liraglutide-saxenda"],
    programName: "NovoCare Patient Assistance Program (PAP)",
    manufacturer: "Novo Nordisk Inc.",
    description:
      "Provides free diabetes and metabolic medications for eligible patients with no insurance or Medicare Part D beneficiaries meeting hardship criteria.",
    eligibilitySummary:
      "US citizen or legal resident; household income <= 400% FPL; Medicare Part D or uninsured (excludes commercial insurance from free drug PAP).",
    incomeThreshold: "Up to 400% Federal Poverty Level",
    insuranceCriteria: "Uninsured or Medicare Part D with qualifying out-of-pocket spend",
    url: "https://www.novocare.com/diabetes-overview/let-us-help/pap.html",
    phone: "1-866-310-7549",
    tags: ["semaglutide", "ozempic", "rybelsus", "wegovy", "liraglutide", "victoza", "glp1", "diabetes", "novonordisk"],
  },
  {
    id: "pap-novartis-entresto",
    drugNames: ["Sacubitril/Valsartan", "Entresto"],
    genericIds: ["sacubitril-valsartan"],
    programName: "Novartis Patient Assistance Foundation (NPAF)",
    manufacturer: "Novartis Pharmaceuticals",
    description:
      "Provides free Entresto to eligible patients experiencing financial hardship and lacking adequate prescription coverage, alongside the Entresto $10 Co-Pay Card for commercial plans.",
    eligibilitySummary:
      "US resident; household income <= 300% FPL; uninsured or underinsured; Medicare Part D patients must meet specific out-of-pocket requirements.",
    incomeThreshold: "Up to 300% Federal Poverty Level",
    insuranceCriteria: "Uninsured, underinsured, or Medicare Part D",
    url: "https://www.entresto.com/financial-resources",
    phone: "1-800-277-2254",
    tags: ["sacubitril-valsartan", "entresto", "heart-failure", "arni", "novartis", "cardiovascular"],
  },
  {
    id: "pap-merck-keytruda",
    drugNames: ["Pembrolizumab", "Keytruda"],
    genericIds: ["pembrolizumab"],
    programName: "The Merck Access Program & Merck Patient Assistance",
    manufacturer: "Merck & Co., Inc.",
    description:
      "Offers personalized reimbursement support, insurance benefit investigations, commercial co-pay assistance ($0-$25), and free Keytruda through the Merck Patient Assistance Program.",
    eligibilitySummary:
      "Uninsured patients or insured patients without prescription coverage; household income <= 500% FPL; prescriber attestation of oncology indication.",
    incomeThreshold: "Up to 500% Federal Poverty Level",
    insuranceCriteria: "Uninsured or underinsured oncology patients",
    url: "https://www.merckaccessprogram-keytruda.com/",
    phone: "1-855-257-3725",
    tags: ["pembrolizumab", "keytruda", "oncology", "checkpoint-inhibitor", "cancer", "immunotherapy", "merck"],
  },
  {
    id: "pap-janssen-stelara",
    drugNames: ["Ustekinumab", "Stelara"],
    genericIds: ["ustekinumab"],
    programName: "Janssen CarePath & Johnson & Johnson Patient Assistance Foundation",
    manufacturer: "Janssen Biotech / Johnson & Johnson",
    description:
      "Offers commercial co-pay assistance ($5 per dose for eligible patients) and free Stelara for qualifying uninsured patients via the J&J Patient Assistance Foundation.",
    eligibilitySummary:
      "Commercial patients eligible for CarePath savings card; uninsured/underinsured qualify for JJPAF free drug program at <= 400% FPL.",
    incomeThreshold: "Up to 400% Federal Poverty Level",
    insuranceCriteria: "Commercial insurance (CarePath) or uninsured (JJPAF)",
    url: "https://www.janssencarepath.com/patient/stelara",
    phone: "1-877-227-3728",
    tags: ["ustekinumab", "stelara", "biologic", "psoriasis", "crohns", "janssen", "jnj"],
  },
] as const;

export function searchManufacturerPAPs(query = ""): ManufacturerPAPProgram[] {
  const q = query.toLowerCase().trim();
  if (!q) return [...MANUFACTURER_PAP_DIRECTORY];
  return MANUFACTURER_PAP_DIRECTORY.filter((pap) => {
    return (
      pap.programName.toLowerCase().includes(q) ||
      pap.manufacturer.toLowerCase().includes(q) ||
      pap.drugNames.some((d) => d.toLowerCase().includes(q)) ||
      pap.genericIds.some((id) => id.toLowerCase().includes(q)) ||
      pap.description.toLowerCase().includes(q) ||
      pap.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}

// ============================================================================
// 3C. STATE PHARMACEUTICAL ASSISTANCE PROGRAMS (SPAPs) DIRECTORY
// ============================================================================

export interface StatePAPInfo {
  stateCode: string;
  stateName: string;
  programName: string;
  description: string;
  eligibility: string;
  url: string;
  phone: string;
}

export const STATE_SPAP_DIRECTORY: readonly StatePAPInfo[] = [
  {
    stateCode: "NY",
    stateName: "New York",
    programName: "Elderly Pharmaceutical Insurance Coverage (EPIC)",
    description:
      "State-sponsored prescription plan helping Medicare-eligible NY seniors with out-of-pocket Part D drug costs.",
    eligibility:
      "NY resident, age 65+, annual income up to $75,000 (single) or $100,000 (married), enrolled in Medicare Part D.",
    url: "https://www.health.ny.gov/health_care/epic/",
    phone: "1-800-332-3742",
  },
  {
    stateCode: "PA",
    stateName: "Pennsylvania",
    programName: "PACE / PACENET Pharmaceutical Assistance",
    description:
      "Pennsylvania lottery-funded prescription assistance program for older Pennsylvanians.",
    eligibility:
      "PA resident, age 65+, income up to $33,500 (single) or $41,500 (married) for PACE; up to $37,500/$45,500 for PACENET.",
    url: "https://www.aging.pa.gov/aging-services/prescriptions/",
    phone: "1-800-225-7223",
  },
  {
    stateCode: "NJ",
    stateName: "New Jersey",
    programName: "Pharmaceutical Assistance to the Aged and Disabled (PAAD) & Senior Gold",
    description:
      "State programs helping eligible older adults and individuals with disabilities pay for prescription drugs.",
    eligibility:
      "NJ resident, age 65+ or receiving SSDI, annual income limits apply, enrolled in Medicare Part D.",
    url: "https://www.state.nj.us/humanservices/doas/services/paad/",
    phone: "1-800-792-9745",
  },
  {
    stateCode: "TX",
    stateName: "Texas",
    programName: "Texas State Pharmaceutical Assistance Program (SPAP)",
    description:
      "Assists low-income Texans enrolled in Medicare Part D, including specialized programs for HIV (Texas HIV SPAP) and kidney health.",
    eligibility:
      "Texas resident, Medicare Part D enrolled, income criteria according to state program guidelines.",
    url: "https://www.dshs.texas.gov/hivstd/meds/spap.shtm",
    phone: "1-800-252-8063",
  },
  {
    stateCode: "CA",
    stateName: "California",
    programName: "California Department of Public Health Insurance Assistance & SPAP",
    description:
      "California state assistance program covering Medicare Part D out-of-pocket costs, copays, and deductibles for vulnerable residents.",
    eligibility:
      "California resident, Medicare Part D enrolled, under state income threshold (typically <= 500% FPL).",
    url: "https://www.cdph.ca.gov/Programs/CID/DOA/Pages/OA_adap_spap.aspx",
    phone: "1-844-421-7050",
  },
  {
    stateCode: "MA",
    stateName: "Massachusetts",
    programName: "Prescription Advantage",
    description:
      "State-sponsored pharmacy assistance program supplementing Medicare Part D drug coverage for seniors and disabled residents.",
    eligibility: "MA resident, age 65+ or disabled, meets state income guidelines.",
    url: "https://www.mass.gov/prescription-advantage",
    phone: "1-800-243-4636",
  },
  {
    stateCode: "WI",
    stateName: "Wisconsin",
    programName: "SeniorCare Prescription Drug Assistance",
    description:
      "Wisconsin program helping seniors age 65+ pay for prescription drugs with low annual enrollment fee and sliding-scale copays.",
    eligibility: "WI resident, US citizen or qualifying immigrant, age 65 or older.",
    url: "https://www.dhs.wisconsin.gov/seniorcare/",
    phone: "1-800-657-2038",
  },
];

export function getStateSPAP(stateCodeOrName: string): StatePAPInfo | undefined {
  const q = stateCodeOrName.toLowerCase().trim();
  return STATE_SPAP_DIRECTORY.find(
    (s) => s.stateCode.toLowerCase() === q || s.stateName.toLowerCase() === q,
  );
}

// ============================================================================
// 4. CONTEXT-AWARE RECOMMENDER ENGINE
// ============================================================================

export type ResourceTriggerCategory =
  | "obstetrics-perinatal"
  | "transplant-immunosuppression"
  | "oncology-biologic"
  | "oncology-hematology"
  | "hiv-aids-adap"
  | "rare-disease-expanded"
  | "renal-nephrology"
  | "cardiovascular"
  | "diabetes-metabolic"
  | "opioid-sedative-safety"
  | "toxicology-poison"
  | "crisis-behavioral"
  | "geriatric-medicare"
  | "manufacturer-pap"
  | "harm-reduction"
  | "general-safety-net";

export interface ResourceRecommendation {
  resource: HealthcareResource;
  priority: "urgent" | "high" | "standard";
  matchReason: string;
  triggerCategory: ResourceTriggerCategory;
  relevantDrugIds: string[];
}

export interface HealthcareResourcesResult {
  recommendations: ResourceRecommendation[];
  allResources: readonly HealthcareResource[];
  totalMatches: number;
  hasUrgentMatch: boolean;
  activeContextFlags: {
    isPregnantOrLactating: boolean;
    hasCkd: boolean;
    hasOpioidsOrSedatives: boolean;
    hasTransplantDrugs: boolean;
    hasHighCostBiologics: boolean;
    hasCardiacDrugs: boolean;
    hasDiabetesDrugs: boolean;
    hasToxicologyRisk: boolean;
    hasOncologyDrugs: boolean;
    hasHivOrAntiviralDrugs: boolean;
    hasGeriatricHost: boolean;
    hasManufacturerPapMatch: boolean;
  };
  disclaimer: string;
}

// Well-characterized drug classification sets for context matching
const TERATOGENIC_OR_OBSTETRIC_DRUGS = new Set([
  "valproate",
  "carbamazepine",
  "phenytoin",
  "phenobarbital",
  "topiramate",
  "lithium",
  "methotrexate",
  "mycophenolate",
  "mycophenolic-acid",
  "isotretinoin",
  "thalidomide",
  "lenalidomide",
  "warfarin",
  "lisinopril",
  "losartan",
  "enalapril",
  "ramipril",
  "valsartan",
  "sacubitril-valsartan",
  "spironolactone",
  "finasteride",
  "dutasteride",
  "paroxetine",
  "efavirenz",
  "tetracycline",
  "doxycycline",
  "misoprostol",
  "ergotamine",
  "leflunomide",
  "bosentan",
  "amiodarone",
  "methimazole",
  "propylthiouracil",
  "diazepam",
  "clonazepam",
  "alprazolam",
]);

const TRANSPLANT_DRUGS = new Set([
  "tacrolimus",
  "cyclosporine",
  "mycophenolate",
  "mycophenolic-acid",
  "sirolimus",
  "everolimus",
  "belatacept",
  "azathioprine",
]);

const HIGH_COST_BIOLOGICS_OR_ONCOLOGY = new Set([
  "methotrexate",
  "cisplatin",
  "pembrolizumab",
  "nivolumab",
  "trastuzumab",
  "rituximab",
  "imatinib",
  "adalimumab",
  "infliximab",
  "dupilumab",
  "ustekinumab",
  "secukinumab",
  "vedolizumab",
  "tocilizumab",
  "semaglutide",
  "tirzepatide",
  "sofosbuvir",
  "ledipasvir-sofosbuvir",
  "sofosbuvir-velpatasvir",
]);

const RENAL_OR_CKD_DRUGS = new Set([
  "vancomycin",
  "gentamicin",
  "tobramycin",
  "amikacin",
  "lithium",
  "cisplatin",
  "amphotericin-b",
  "methotrexate",
  "digoxin",
  "gabapentin",
  "pregabalin",
  "valganciclovir",
  "acyclovir",
  "furosemide",
  "bumetanide",
  "torsemide",
  "spironolactone",
  "eplerenone",
  "lisinopril",
  "losartan",
  "sacubitril-valsartan",
  "metformin",
  "empagliflozin",
  "dapagliflozin",
  "canagliflozin",
  "potassium-chloride",
  "patiromer",
  "sodium-zirconium-cyclosilicate",
  "sodium-polystyrene-sulfonate",
  "sevelamer",
  "calcium-acetate",
]);

const CARDIAC_DRUGS = new Set([
  "amiodarone",
  "flecainide",
  "sotalol",
  "dofetilide",
  "dronedarone",
  "quinidine",
  "procainamide",
  "propafenone",
  "mexiletine",
  "lidocaine",
  "verapamil",
  "diltiazem",
  "digoxin",
  "adenosine",
  "milrinone",
  "dobutamine",
  "epinephrine",
  "norepinephrine",
  "dopamine",
  "vasopressin",
  "sacubitril-valsartan",
  "carvedilol",
  "metoprolol",
  "bisoprolol",
  "nebivolol",
  "spironolactone",
  "eplerenone",
  "isosorbide-mononitrate",
  "nitroglycerin",
  "hydralazine",
  "clopidogrel",
  "ticagrelor",
  "prasugrel",
  "warfarin",
  "apixaban",
  "rivaroxaban",
  "edoxaban",
  "dabigatran",
]);

const DIABETES_DRUGS = new Set([
  "insulin-regular",
  "insulin-glargine",
  "insulin-lispro",
  "insulin-aspart",
  "insulin-detemir",
  "insulin-degludec",
  "metformin",
  "semaglutide",
  "liraglutide",
  "tirzepatide",
  "empagliflozin",
  "dapagliflozin",
  "glipizide",
  "glimepiride",
  "glyburide",
  "pioglitazone",
  "sitagliptin",
]);

const OPIOID_OR_SEDATIVE_DRUGS = new Set([
  "morphine",
  "oxycodone",
  "hydrocodone",
  "hydromorphone",
  "fentanyl",
  "methadone",
  "buprenorphine",
  "oxymorphone",
  "codeine",
  "tramadol",
  "tapentadol",
  "meperidine",
  "heroin",
  "carfentanil",
  "dirty-30",
  "seven-oh",
  "alprazolam",
  "lorazepam",
  "clonazepam",
  "diazepam",
  "midazolam",
  "temazepam",
  "chlordiazepoxide",
  "zolpidem",
  "zaleplon",
  "eszopiclone",
  "carisoprodol",
  "baclofen",
  "xylazine",
  "medetomidine",
  "naloxone",
  "nalmefene",
  "flumazenil",
]);

const TOXICOLOGY_RISK_DRUGS = new Set([
  "acetaminophen",
  "aspirin",
  "salicylate",
  "colchicine",
  "iron",
  "ferrous-sulfate",
  "lithium",
  "digoxin",
  "theophylline",
  "ethylene-glycol",
  "methanol",
  "toxic-alcohols",
]);

const ONCOLOGY_DRUGS = new Set([
  "methotrexate",
  "cisplatin",
  "carboplatin",
  "oxaliplatin",
  "pembrolizumab",
  "nivolumab",
  "cemiplimab",
  "atezolizumab",
  "durvalumab",
  "avelumab",
  "ipilimumab",
  "relatlimab-nivolumab",
  "dostarlimab",
  "tremelimumab",
  "retifanlimab",
  "toripalimab",
  "trastuzumab",
  "rituximab",
  "imatinib",
  "cyclophosphamide",
  "ifosfamide",
  "melphalan",
  "chlorambucil",
  "busulfan",
  "dacarbazine",
  "temozolomide",
  "procarbazine",
  "lomustine",
  "carmustine",
  "streptozocin",
  "bendamustine",
  "thiotepa",
  "trabectedin",
  "lurbinectedin",
  "lenalidomide",
  "thalidomide",
  "doxorubicin",
  "paclitaxel",
  "fluorouracil",
  "capecitabine",
  "etoposide",
  "gemcitabine",
  "ibrutinib",
  "venetoclax",
  "erlotinib",
  "osimertinib",
  "ruxolitinib",
  "fedratinib",
  "tucatinib",
  "tamoxifen",
  "anastrozole",
]);

const HIV_OR_ANTIVIRAL_DRUGS = new Set([
  "ritonavir",
  "paxlovid",
  "nevirapine",
  "cobicistat",
  "efavirenz",
  "abacavir",
  "dolutegravir",
  "bictegravir",
  "raltegravir",
  "elvitegravir",
  "cabotegravir",
  "darunavir",
  "atazanavir",
  "lopinavir",
  "rilpivirine",
  "doravirine",
  "etravirine",
  "maraviroc",
  "fostemsavir",
  "lenacapavir",
  "tenofovir-df",
  "tenofovir-af",
  "tenofovir-alafenamide-combo",
  "bictegravir-emtricitabine-taf",
  "dolutegravir-abacavir-lamivudine",
  "dolutegravir-lamivudine",
  "dolutegravir-rilpivirine",
  "elvitegravir-cobicistat-ftc-taf",
  "elvitegravir-cobicistat-ftc-tdf",
  "darunavir-cobicistat",
  "darunavir-cobicistat-ftc-taf",
  "atazanavir-cobicistat",
  "efavirenz-ftc-tdf",
  "rilpivirine-ftc-taf",
  "rilpivirine-ftc-tdf",
  "doravirine-tdf-lamivudine",
  "cabotegravir-rilpivirine",
]);

const SGLT2_OR_GLP1_DRUGS = new Set([
  "empagliflozin",
  "dapagliflozin",
  "canagliflozin",
  "ertugliflozin",
  "bexagliflozin",
  "sotagliflozin",
  "empagliflozin-linagliptin",
  "empagliflozin-metformin",
  "dapagliflozin-metformin",
  "semaglutide",
  "semaglutide-oral",
  "semaglutide-wegovy",
  "liraglutide",
  "liraglutide-saxenda",
  "tirzepatide",
  "dulaglutide",
]);

const HIGH_COST_BIOLOGICS_DRUGS = new Set([
  "adalimumab",
  "dupilumab",
  "ustekinumab",
  "secukinumab",
  "vedolizumab",
  "tocilizumab",
  "infliximab",
  "omalizumab",
  "mepolizumab",
  "benralizumab",
  "reslizumab",
  "tezepelumab",
  "natalizumab",
  "ocrelizumab",
  "ofatumumab-kesimpta",
  "alemtuzumab",
  "romosozumab",
  "pembrolizumab",
  "nivolumab",
  "trastuzumab",
  "rituximab",
]);

/**
 * Context-aware recommender:
 * Evaluates current drug tray and host context, returning prioritized public resources.
 * Strictly non-prescriptive and privacy-preserving (client-side resolution).
 */
export function healthcareResourcesFor(
  drugIds: string[] = [],
  host?: HostContext,
): HealthcareResourcesResult {
  const normIds = drugIds.map((id) => id.toLowerCase().trim());
  const matchedRecs: ResourceRecommendation[] = [];
  const seenResourceIds = new Set<string>();

  function addRec(
    resId: string,
    priority: "urgent" | "high" | "standard",
    triggerCategory: ResourceRecommendation["triggerCategory"],
    matchReason: string,
    relevantDrugIds: string[],
  ) {
    const resource = RESOURCE_BY_ID[resId];
    if (!resource) return;

    if (!seenResourceIds.has(resId)) {
      seenResourceIds.add(resId);
      matchedRecs.push({
        resource,
        priority,
        matchReason,
        triggerCategory,
        relevantDrugIds,
      });
    } else {
      // Upgrade priority if a more critical indication matched
      const existing = matchedRecs.find((r) => r.resource.id === resId);
      if (existing) {
        if (priority === "urgent" && existing.priority !== "urgent") {
          existing.priority = "urgent";
          existing.matchReason = `${matchReason} (${existing.matchReason})`;
        } else if (priority === "high" && existing.priority === "standard") {
          existing.priority = "high";
        }
        for (const did of relevantDrugIds) {
          if (!existing.relevantDrugIds.includes(did)) {
            existing.relevantDrugIds.push(did);
          }
        }
      }
    }
  }

  // Determine host and clinical context flags
  const isPregnant = host?.preg === "pregnant";
  const isLactating = host?.preg === "lactating";
  const isPerinatal = isPregnant || isLactating;

  const isGeriatricHost = host?.age === "geriatric" || (typeof host?.age === "number" && host.age >= 65);

  const teratogenMatches = normIds.filter((id) => TERATOGENIC_OR_OBSTETRIC_DRUGS.has(id));
  const hasTeratogenOnDesk = teratogenMatches.length > 0;

  const isCkdHost = host?.kidney === "ckd";
  const renalMatches = normIds.filter((id) => RENAL_OR_CKD_DRUGS.has(id));
  const hasRenalDrugs = renalMatches.length > 0;

  const transplantMatches = normIds.filter((id) => TRANSPLANT_DRUGS.has(id));
  const hasTransplant = transplantMatches.length > 0;

  const oncologyMatches = normIds.filter((id) => {
    if (ONCOLOGY_DRUGS.has(id)) return true;
    const drug = DRUG_BY_ID[id];
    if (!drug) return false;
    const cls = drug.cls.toLowerCase();
    return (
      cls.includes("oncol") ||
      cls.includes("cancer") ||
      cls.includes("antineoplastic") ||
      cls.includes("checkpoint") ||
      cls.includes("kinase inhibitor")
    );
  });
  const hasOncology = oncologyMatches.length > 0;

  const hivMatches = normIds.filter((id) => {
    if (HIV_OR_ANTIVIRAL_DRUGS.has(id)) return true;
    const drug = DRUG_BY_ID[id];
    if (!drug) return false;
    const cls = drug.cls.toLowerCase();
    return (
      cls.includes("hiv") ||
      cls.includes("antiretroviral") ||
      cls.includes("protease inhibitor") ||
      cls.includes("nnrti") ||
      cls.includes("nrti") ||
      cls.includes("integrase")
    );
  });
  const hasHiv = hivMatches.length > 0;

  const sglt2Glp1Matches = normIds.filter((id) => SGLT2_OR_GLP1_DRUGS.has(id));
  const hasSglt2OrGlp1 = sglt2Glp1Matches.length > 0;

  const biologicMatches = normIds.filter(
    (id) => HIGH_COST_BIOLOGICS_OR_ONCOLOGY.has(id) || HIGH_COST_BIOLOGICS_DRUGS.has(id),
  );
  const hasBiologics = biologicMatches.length > 0;

  const cardiacMatches = normIds.filter((id) => CARDIAC_DRUGS.has(id));
  const hasCardiac = cardiacMatches.length > 0;

  const diabetesMatches = normIds.filter((id) => DIABETES_DRUGS.has(id) || SGLT2_OR_GLP1_DRUGS.has(id));
  const hasDiabetes = diabetesMatches.length > 0;

  const opioidSedativeMatches = normIds.filter((id) => {
    if (OPIOID_OR_SEDATIVE_DRUGS.has(id)) return true;
    const drug = DRUG_BY_ID[id];
    return Boolean(
      drug?.pd?.includes("opioid") ||
      drug?.pd?.includes("partial-opioid") ||
      drug?.pd?.includes("cns-depressant") ||
      drug?.pd?.includes("benzo-zdrug"),
    );
  });
  const hasOpioidsOrSedatives = opioidSedativeMatches.length > 0;

  const hasAlcoholFlag = host?.alcohol === "acute" || host?.alcohol === "chronic" || normIds.includes("ethanol");

  const toxicologyMatches = normIds.filter((id) => TOXICOLOGY_RISK_DRUGS.has(id));
  const hasToxicologyRisk = toxicologyMatches.length > 0;

  // 1. Perinatal / Teratogen Consultation
  if (isPerinatal || hasTeratogenOnDesk) {
    const isUrgentObstetric = isPerinatal && hasTeratogenOnDesk;
    addRec(
      "mothertobaby",
      isUrgentObstetric ? "urgent" : "high",
      "obstetrics-perinatal",
      isUrgentObstetric
        ? "Active pregnancy/lactation context with teratogenic agent(s) on tray; free expert teratogen risk counseling recommended"
        : hasTeratogenOnDesk
          ? "Potential teratogen/obstetric agent on tray; MotherToBaby provides evidence-based safety evaluation"
          : "Active pregnancy or lactation context; evidence-based medication safety navigation available",
      teratogenMatches,
    );
    addRec(
      "tlc-mama",
      "high",
      "obstetrics-perinatal",
      "Perinatal context: 24/7 free, confidential maternal mental health counseling and emotional support",
      [],
    );
    addRec(
      "psi",
      "standard",
      "obstetrics-perinatal",
      "Perinatal context: specialized postpartum and antenatal peer support and provider psychiatric consultation",
      [],
    );
  }

  // 2. Solid Organ Transplant Maintenance
  if (hasTransplant) {
    addRec(
      "unos",
      "high",
      "transplant-immunosuppression",
      "Transplant immunosuppressive regimen detected; UNOS Transplant Living offers patient navigation and center resources",
      transplantMatches,
    );
    addRec(
      "nldac",
      "high",
      "transplant-immunosuppression",
      "Transplant context; National Living Donor Assistance Center covers donor travel and wage expenses",
      transplantMatches,
    );
    addRec(
      "akf",
      "high",
      "transplant-immunosuppression",
      "High-cost immunosuppression; American Kidney Fund provides emergency medication co-pay grants",
      transplantMatches,
    );
    addRec(
      "needymeds",
      "high",
      "transplant-immunosuppression",
      "Maintenance immunosuppression co-pay relief and manufacturer PAP directory",
      transplantMatches,
    );
    addRec(
      "rxassist",
      "standard",
      "transplant-immunosuppression",
      "Clinician application directory for specialty immunosuppressive medication assistance programs",
      transplantMatches,
    );
  }

  // 3. Chronic Kidney Disease / Dialysis / Nephrology
  if (isCkdHost || hasRenalDrugs) {
    const renalPriority = isCkdHost ? "high" : "standard";
    addRec(
      "nkf-cares",
      renalPriority,
      "renal-nephrology",
      isCkdHost
        ? "Chronic kidney disease host context; NKF Cares provides specialized disease education and patient helpline"
        : "Renal clearance/nephrotoxic medication detected; National Kidney Foundation offers patient guides",
      renalMatches,
    );
    if (isCkdHost || normIds.some((id) => ["patiromer", "sevelamer", "calcium-acetate"].includes(id))) {
      addRec(
        "akf",
        "high",
        "renal-nephrology",
        "Advanced renal or dialysis support; American Kidney Fund offers prescription co-pay grants",
        renalMatches,
      );
    }
  }

  // 4. Cardiovascular, Heart Failure, Arrhythmia & Shock
  if (hasCardiac) {
    addRec(
      "aha-support",
      "high",
      "cardiovascular",
      "Cardiovascular/arrhythmic regimen detected; American Heart Association provides recovery networks and co-pay tools",
      cardiacMatches,
    );
    addRec(
      "copay-relief",
      "standard",
      "cardiovascular",
      "Chronic cardiovascular pharmacotherapy; Patient Advocate Foundation co-pay and deductible relief",
      cardiacMatches,
    );
  }

  // 5. High-Cost Biologics & Specialty Oncology
  if (hasBiologics || hasOncology) {
    addRec(
      "copay-relief",
      "urgent",
      "oncology-biologic",
      "High-cost specialty biologic/oncology therapy detected; PAF Co-Pay Relief provides direct financial grant assistance",
      biologicMatches.length > 0 ? biologicMatches : oncologyMatches,
    );
    addRec(
      "mat",
      "high",
      "oncology-biologic",
      "Biopharmaceutical manufacturer PAP matching for specialty biologics and targeted therapies",
      biologicMatches.length > 0 ? biologicMatches : oncologyMatches,
    );
    addRec(
      "hrsa-340b",
      "high",
      "oncology-biologic",
      "340B covered entity clinics offer significantly discounted outpatient pricing on specialty agents",
      biologicMatches.length > 0 ? biologicMatches : oncologyMatches,
    );
    addRec(
      "needymeds",
      "high",
      "oncology-biologic",
      "Specialty drug manufacturer assistance programs and co-pay foundation search",
      biologicMatches.length > 0 ? biologicMatches : oncologyMatches,
    );
  }

  // 5B. Oncology & Hematology Co-Pay Assistance & Redistribution
  if (hasOncology) {
    addRec(
      "lls-copay",
      "urgent",
      "oncology-hematology",
      "Oncology / hematology therapy detected; Leukemia & Lymphoma Society offers direct co-pay assistance grants and navigation",
      oncologyMatches,
    );
    addRec(
      "pan-foundation",
      "urgent",
      "oncology-hematology",
      "High-cost oncology regimen; PAN Foundation provides direct medication co-pay, deductible, and travel assistance",
      oncologyMatches,
    );
    addRec(
      "healthwell-foundation",
      "urgent",
      "oncology-hematology",
      "Oncology therapy detected; HealthWell Foundation provides prescription co-payment assistance for underinsured patients",
      oncologyMatches,
    );
    addRec(
      "cancer-support-community",
      "high",
      "oncology-hematology",
      "Oncology diagnosis; Cancer Support Community provides toll-free oncology social worker counseling and financial guidance",
      oncologyMatches,
    );
    addRec(
      "remedichain",
      "high",
      "oncology-hematology",
      "Oral chemotherapy/specialty oncology; RemediChain redistributes donated oral oncolytics to eligible uninsured patients",
      oncologyMatches,
    );
  }

  // 5C. HIV / AIDS ADAP & Ryan White CARE Act
  if (hasHiv) {
    addRec(
      "ryan-white-adap",
      "urgent",
      "hiv-aids-adap",
      "HIV/antiretroviral regimen detected; Ryan White HIV/AIDS Program & ADAP directory provide comprehensive medication coverage and co-pay relief",
      hivMatches,
    );
    addRec(
      "hrsa-340b",
      "high",
      "hiv-aids-adap",
      "340B Ryan White clinics provide statutory discounts on antiretrovirals and opportunistic infection medications",
      hivMatches,
    );
  }

  // 5D. Manufacturer Direct Patient Assistance Programs (PAPs)
  if (normIds.includes("adalimumab")) {
    addRec(
      "pap-humira-complete",
      "high",
      "manufacturer-pap",
      "Adalimumab detected; AbbVie Assist / Humira Complete provides patient assistance and $5 co-pay savings cards",
      ["adalimumab"],
    );
  }
  if (normIds.includes("dupilumab")) {
    addRec(
      "pap-dupixent-myway",
      "high",
      "manufacturer-pap",
      "Dupilumab detected; Dupixent MyWay provides commercial $0 co-pay card and free drug PAP for uninsured patients",
      ["dupilumab"],
    );
  }
  if (normIds.includes("apixaban")) {
    addRec(
      "pap-bms-eliquis",
      "high",
      "manufacturer-pap",
      "Apixaban detected; Bristol Myers Squibb Patient Assistance Foundation provides free Eliquis and co-pay cards",
      ["apixaban"],
    );
  }
  if (normIds.includes("rivaroxaban")) {
    addRec(
      "pap-jnj-xarelto",
      "high",
      "manufacturer-pap",
      "Rivaroxaban detected; Johnson & Johnson Patient Assistance Foundation provides free Xarelto and savings cards",
      ["rivaroxaban"],
    );
  }
  const empagliLinagliMatches = normIds.filter((id) =>
    ["empagliflozin", "linagliptin", "empagliflozin-linagliptin", "empagliflozin-metformin"].includes(id),
  );
  if (empagliLinagliMatches.length > 0) {
    addRec(
      "pap-boehringer-jardiance",
      "high",
      "manufacturer-pap",
      "Empagliflozin/linagliptin detected; Boehringer Ingelheim Cares provides PAP dispensing and $10 co-pay savings cards",
      empagliLinagliMatches,
    );
  }
  const semaLiraMatches = normIds.filter((id) =>
    ["semaglutide", "liraglutide", "semaglutide-oral", "semaglutide-wegovy", "liraglutide-saxenda"].includes(id),
  );
  if (semaLiraMatches.length > 0) {
    addRec(
      "pap-novocare-diabetes",
      "high",
      "manufacturer-pap",
      "Semaglutide/liraglutide detected; NovoCare Patient Assistance provides free drug supplies and commercial savings cards",
      semaLiraMatches,
    );
  }
  if (normIds.includes("sacubitril-valsartan")) {
    addRec(
      "pap-novartis-entresto",
      "high",
      "manufacturer-pap",
      "Sacubitril/valsartan detected; Novartis Patient Assistance Foundation provides free Entresto and $10 co-pay card",
      ["sacubitril-valsartan"],
    );
  }
  if (normIds.includes("pembrolizumab")) {
    addRec(
      "pap-merck-keytruda",
      "urgent",
      "manufacturer-pap",
      "Pembrolizumab detected; The Merck Access Program provides co-pay assistance and free product PAP",
      ["pembrolizumab"],
    );
  }
  if (normIds.includes("ustekinumab")) {
    addRec(
      "pap-janssen-stelara",
      "high",
      "manufacturer-pap",
      "Ustekinumab detected; Janssen CarePath and JJPAF provide $5 co-pay savings and free drug PAP",
      ["ustekinumab"],
    );
  }

  // 5E. Senior & Low-Income Medicare Navigation (Geriatric Host)
  if (isGeriatricHost) {
    addRec(
      "medicare-extra-help",
      "urgent",
      "geriatric-medicare",
      "Geriatric patient context (Medicare eligible); Medicare Part D Extra Help / Low Income Subsidy (LIS) reduces copayments to minimal statutory caps",
      normIds,
    );
    addRec(
      "spap-directory",
      "high",
      "geriatric-medicare",
      "Geriatric patient context; State Pharmaceutical Assistance Programs (SPAPs) provide secondary coverage wrapping around Medicare Part D",
      normIds,
    );
  }

  // 6. Diabetes & Insulin Affordability
  if (hasDiabetes) {
    addRec(
      "ada",
      "high",
      "diabetes-metabolic",
      "Insulin or anti-hyperglycemic regimen detected; ADA Insulin Help provides $35 co-pay caps and emergency supplies",
      diabetesMatches,
    );
    addRec(
      "needymeds",
      "standard",
      "diabetes-metabolic",
      "Diabetes medication manufacturer assistance programs and discount card directory",
      diabetesMatches,
    );
  }

  // 7. Opioids, Sedatives, Overdose Risk, Toxicology & Harm Reduction
  if (hasOpioidsOrSedatives || hasAlcoholFlag || hasToxicologyRisk) {
    const isPolySedative =
      opioidSedativeMatches.length >= 2 || (opioidSedativeMatches.length >= 1 && hasAlcoholFlag);

    addRec(
      "poison-help",
      isPolySedative || hasToxicologyRisk ? "urgent" : "high",
      "toxicology-poison",
      hasToxicologyRisk
        ? "Agent with acute toxicological risk or narrow therapeutic window; Poison Help offers 24/7 toxicologist triage"
        : "Opioid or sedative polypharmacy; Poison Help (1-800-222-1222) provides 24/7 immediate clinical adverse effect triage",
      [...opioidSedativeMatches, ...toxicologyMatches],
    );

    if (hasOpioidsOrSedatives || hasAlcoholFlag) {
      addRec(
        "never-use-alone",
        "urgent",
        "opioid-sedative-safety",
        "Opioid/sedative regimen detected; Never Use Alone (1-800-484-3731) provides real-time virtual peer overdose monitoring",
        opioidSedativeMatches,
      );
      addRec(
        "next-distro",
        "high",
        "harm-reduction",
        "Opioid / sedative exposure; NEXT Distro provides free mail-delivered naloxone (Narcan) and overdose prevention supplies",
        opioidSedativeMatches,
      );
      addRec(
        "samhsa-helpline",
        "high",
        "crisis-behavioral",
        "SAMHSA 24/7 National Helpline & FindTreatment.gov locator for substance use support and recovery clinics",
        opioidSedativeMatches,
      );
      addRec(
        "lifeline-988",
        "high",
        "crisis-behavioral",
        "988 Suicide & Crisis Lifeline provides 24/7 confidential crisis and emotional support nationwide",
        [],
      );
    }
  }

  // 8. General Safety Net & Primary Care (baseline for all regimens or when requested)
  addRec(
    "hrsa-fqhc",
    "standard",
    "general-safety-net",
    "HRSA Health Center Finder for sliding-scale primary care, routine labs, and affordable 340B pharmacy dispensing",
    normIds,
  );
  addRec(
    "nafc",
    "standard",
    "general-safety-net",
    "National network of 1,400+ free and charitable clinics providing care to uninsured patients",
    normIds,
  );
  addRec(
    "rxassist",
    "standard",
    "general-safety-net",
    "Clinician PAP directory and enrollment forms for brand-name prescription assistance",
    normIds,
  );

  // Sort recommendations: urgent first, then high, then standard
  const priorityOrder = { urgent: 0, high: 1, standard: 2 };
  matchedRecs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const hasUrgent = matchedRecs.some((r) => r.priority === "urgent");

  return {
    recommendations: matchedRecs,
    allResources: HEALTHCARE_RESOURCES,
    totalMatches: matchedRecs.length,
    hasUrgentMatch: hasUrgent,
    activeContextFlags: {
      isPregnantOrLactating: isPerinatal,
      hasCkd: isCkdHost,
      hasOpioidsOrSedatives,
      hasTransplantDrugs: hasTransplant,
      hasHighCostBiologics: hasBiologics,
      hasCardiacDrugs: hasCardiac,
      hasDiabetesDrugs: hasDiabetes,
      hasToxicologyRisk,
      hasOncologyDrugs: hasOncology,
      hasHivOrAntiviralDrugs: hasHiv,
      hasGeriatricHost: isGeriatricHost,
      hasManufacturerPapMatch: hasBiologics || hasSglt2OrGlp1,
    },
    disclaimer: `${HEALTHCARE_RESOURCES_CDS_DISCLAIMER}\n${NOT_CLEARED}\n${PI_FOOTER}`,
  };
}

// ============================================================================
// 5. QUERY & DOMAIN FILTERING UTILITIES
// ============================================================================

export function filterResources(query = "", filterPill: FilterPillId = "all"): HealthcareResource[] {
  const q = query.toLowerCase().trim();

  return HEALTHCARE_RESOURCES.filter((res) => {
    // 1. Filter pill match
    if (filterPill !== "all") {
      if (filterPill === "pap" && res.domain !== "prescription-assistance") return false;
      if (filterPill === "fqhc" && res.domain !== "primary-care") return false;
      if (filterPill === "pregnancy" && res.domain !== "maternal-perinatal") return false;
      if (filterPill === "kidney" && res.subdomainTag !== "kidney") return false;
      if (filterPill === "cardiac" && res.subdomainTag !== "cardiac") return false;
      if (filterPill === "transplant" && res.subdomainTag !== "transplant") return false;
      if (
        filterPill === "poison-crisis" &&
        res.domain !== "toxicology-poison" &&
        res.domain !== "crisis-mental-health"
      ) {
        return false;
      }
      if (
        filterPill === "oncology" &&
        res.subdomainTag !== "oncology" &&
        !res.tags.includes("oncology") &&
        !res.tags.includes("cancer")
      ) {
        return false;
      }
      if (
        filterPill === "hiv-adap" &&
        res.subdomainTag !== "hiv-adap" &&
        !res.tags.includes("hiv") &&
        !res.tags.includes("adap")
      ) {
        return false;
      }
      if (
        filterPill === "rare-access" &&
        res.subdomainTag !== "rare-disease" &&
        !res.tags.includes("rare-disease") &&
        !res.tags.includes("expanded-access")
      ) {
        return false;
      }
      if (
        filterPill === "senior-extra-help" &&
        res.subdomainTag !== "senior-medicare" &&
        !res.tags.includes("medicare") &&
        !res.tags.includes("spap") &&
        !res.tags.includes("seniors")
      ) {
        return false;
      }
      if (
        filterPill === "harm-reduction" &&
        res.subdomainTag !== "harm-reduction" &&
        !res.tags.includes("harm-reduction") &&
        !res.tags.includes("naloxone")
      ) {
        return false;
      }
    }

    // 2. Keyword query match
    if (!q) return true;

    return (
      res.name.toLowerCase().includes(q) ||
      res.shortName.toLowerCase().includes(q) ||
      res.organization.toLowerCase().includes(q) ||
      res.description.toLowerCase().includes(q) ||
      res.clinicalUtility.toLowerCase().includes(q) ||
      res.services.some((s) => s.toLowerCase().includes(q)) ||
      res.tags.some((t) => t.toLowerCase().includes(q)) ||
      (res.phone && res.phone.includes(q))
    );
  });
}

// ============================================================================
// 6. CLINICAL VISIT SUMMARY HANDOUT GENERATOR
// ============================================================================

export interface HandoutGeneratorOptions {
  selectedCategories?: string[];
  excludedCategories?: string[];
  patientName?: string;
  clinicHeader?: string;
  customNotes?: string;
  includeAssistanceSections?: boolean;
  zip?: string;
  drugIds?: string[];
  host?: HostContext;
}

/**
 * Generates a clean, professional, non-prescriptive plain-text handout
 * suitable for clipboard copying, EHR patient instructions, or printed clinical summaries.
 * Strictly adheres to FD&C Act § 520(o)(1)(E) non-device CDS standards.
 */
export function generateResourceHandout(options: HandoutGeneratorOptions = {}): string {
  const {
    selectedCategories,
    excludedCategories,
    patientName,
    clinicHeader,
    customNotes,
    includeAssistanceSections = true,
    zip,
    drugIds = [],
    host,
  } = options;

  // Determine which resources to display
  let resourcesToInclude: HealthcareResource[] = [];

  if (drugIds.length > 0 || host) {
    const recReport = healthcareResourcesFor(drugIds, host);
    resourcesToInclude = recReport.recommendations.map((r) => r.resource);
  } else {
    resourcesToInclude = [...HEALTHCARE_RESOURCES];
  }

  // Filter by selected category if specified
  if (selectedCategories && selectedCategories.length > 0) {
    const catSet = new Set(selectedCategories.map((c) => c.toLowerCase()));
    resourcesToInclude = resourcesToInclude.filter(
      (r) => catSet.has(r.domain.toLowerCase()) || catSet.has(r.subdomainTag.toLowerCase()),
    );
  }

  // Filter out excluded categories if specified
  if (excludedCategories && excludedCategories.length > 0) {
    const excSet = new Set(excludedCategories.map((c) => c.toLowerCase()));
    resourcesToInclude = resourcesToInclude.filter(
      (r) =>
        !excSet.has(r.domain.toLowerCase()) &&
        !excSet.has(r.subdomainTag.toLowerCase()) &&
        !r.tags.some((t) => excSet.has(t.toLowerCase())),
    );
  }

  // Deduplicate
  const seenIds = new Set<string>();
  resourcesToInclude = resourcesToInclude.filter((r) => {
    if (seenIds.has(r.id)) return false;
    seenIds.add(r.id);
    return true;
  });

  const lines: string[] = [];
  const divider = "=".repeat(72);
  const subDivider = "-".repeat(72);

  lines.push(divider);
  lines.push("PATIENT & CLINICAL HEALTHCARE RESOURCE DIRECTORY");
  lines.push("National Community Health, Prescription Assistance & Specialized Support");
  lines.push(divider);
  lines.push("");

  // Optional Clinic Header / Facility Name
  if (clinicHeader) {
    lines.push(`CLINICAL FACILITY / HEALTH SYSTEM: ${clinicHeader.trim()}`);
  }

  // Optional Patient Name / Identifier
  if (patientName) {
    lines.push(`PATIENT IDENTIFIER / REFERENCE: ${patientName.trim()}`);
  }

  if (clinicHeader || patientName) {
    lines.push("");
  }

  // Clinical CDS Regulatory Notice
  lines.push("NON-DEVICE CLINICAL DECISION SUPPORT NOTICE (FD&C Act § 520(o)(1)(E)):");
  lines.push("This summary is an educational reference directory of verified public healthcare");
  lines.push("resources, sliding-scale clinics, and assistance programs. It is provided for");
  lines.push("informational review and does not contain medical orders, treatment directives,");
  lines.push("or prescribing instructions. Consult your attending healthcare team for individual care.");
  lines.push("EMERGENCY NOTICE: If experiencing a life-threatening medical emergency, call 911.");
  lines.push("");

  // Optional Custom Clinician Notes
  if (customNotes) {
    lines.push("CLINICAL NAVIGATION NOTES:");
    lines.push(customNotes.trim());
    lines.push("");
  }

  // Optional Context Metadata
  if (zip) {
    lines.push(`Local Area Reference ZIP: ${zip.trim()}`);
    lines.push("Note: Location resolution is conducted entirely client-side. No personal data is stored.");
    lines.push("");
  }

  if (drugIds.length > 0) {
    const drugNames = drugIds
      .map((id) => DRUG_BY_ID[id]?.name || id)
      .join(", ");
    lines.push(`Regimen Reference Context: ${drugNames}`);
    lines.push("Resources below are matched to support safe access and disease navigation.");
    lines.push("");
  }

  // Emergency / 24-7 Hotlines Highlight
  lines.push(subDivider);
  lines.push("IMMEDIATE 24/7 NATIONWIDE HELPLINES (TOLL-FREE)");
  lines.push(subDivider);
  lines.push("• 988 Suicide & Crisis Lifeline: Dial or Text 988 (24/7/365, Free & Confidential)");
  lines.push("• America's Poison Centers (Poison Help): 1-800-222-1222 (24/7 Toxicologist Triage)");
  lines.push("• Never Use Alone (Peer Overdose Prevention): 1-800-484-3731 (24/7 Virtual Peer Support)");
  lines.push("• National Maternal Mental Health Hotline: 1-833-852-6262 (1-833-TLC-MAMA, 24/7 Call/Text)");
  lines.push("• SAMHSA National Helpline: 1-800-662-4357 (FindTreatment.gov, 24/7 Treatment Locator)");
  lines.push("");

  // Personalized Assistance Sections Highlight (if enabled and applicable)
  if (includeAssistanceSections && (drugIds.length > 0 || host)) {
    const matchedPaps = searchManufacturerPAPs().filter((p) =>
      p.genericIds.some((gid) => drugIds.includes(gid)),
    );

    if (matchedPaps.length > 0) {
      lines.push(subDivider);
      lines.push("MATCHED DIRECT MANUFACTURER PATIENT ASSISTANCE PROGRAMS (PAPs)");
      lines.push(subDivider);
      for (const pap of matchedPaps) {
        lines.push(`• ${pap.programName} (${pap.manufacturer})`);
        lines.push(`  Medications: ${pap.drugNames.join(", ")}`);
        lines.push(`  Phone: ${pap.phone} | Website: ${pap.url}`);
        lines.push(`  Income Threshold: ${pap.incomeThreshold}`);
        lines.push(`  Criteria: ${pap.eligibilitySummary}`);
        lines.push("");
      }
    }

    if (host?.age === "geriatric") {
      lines.push(subDivider);
      lines.push("MEDICARE EXTRA HELP (LIS) & STATE PHARMACEUTICAL ASSISTANCE (SPAP)");
      lines.push(subDivider);
      lines.push("• Medicare Part D Extra Help (Social Security Administration): 1-800-772-1213");
      lines.push("  https://www.ssa.gov/medicare/part-d-extra-help (Caps generic & brand copayments)");
      lines.push("• State Pharmaceutical Assistance Programs (SPAPs) wrap around Medicare Part D");
      lines.push("  Consult State SPAP directory at https://www.medicare.gov/ (1-800-MEDICARE)");
      lines.push("");
    }
  }

  // Group by Domain
  const domainsPresent = Array.from(new Set(resourcesToInclude.map((r) => r.domain)));

  for (const domainKey of domainsPresent) {
    const domainInfo = RESOURCE_DOMAINS.find((d) => d.id === domainKey);
    const domainResources = resourcesToInclude.filter((r) => r.domain === domainKey);

    lines.push(subDivider);
    lines.push(domainInfo?.label.toUpperCase() || domainKey.toUpperCase());
    lines.push(subDivider);

    for (const res of domainResources) {
      lines.push(`* ${res.name} (${res.organization})`);
      lines.push(`  Website: ${res.url}`);
      if (res.phone) {
        lines.push(`  Phone: ${res.phone} (${res.availability})`);
      }
      if (res.sms) {
        lines.push(`  Text Support: ${res.sms}`);
      }
      lines.push(`  Description: ${res.description}`);
      lines.push(`  Cost Structure: ${res.cost.replace("-", " ").toUpperCase()}`);
      lines.push("  Key Services:");
      for (const s of res.services) {
        lines.push(`    - ${s}`);
      }
      lines.push(`  Eligibility: ${res.eligibilityNotes}`);
      lines.push("");
    }
  }

  lines.push(divider);
  lines.push("FirstPass Interactions Desk — Non-Device CDS Reference");
  lines.push("Not FDA-cleared. Not FDA-approved. The FDA Prescribing Information governs.");
  lines.push(divider);

  return lines.join("\n");
}
