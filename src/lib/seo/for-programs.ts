import { PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";

/** Copy for /for-programs: group and site licenses for teaching and care programs. */
export const FOR_PROGRAMS_PATH = "/for-programs";
export const FOR_PROGRAMS_URL = `${SITE_URL}${FOR_PROGRAMS_PATH}`;
export const FOR_PROGRAMS_EMAIL = "FirstPassInteractions@gmail.com";
export const FOR_PROGRAMS_SUBJECT = "FirstPass group license inquiry";
export const FOR_PROGRAMS_MAILTO = `mailto:${FOR_PROGRAMS_EMAIL}?subject=${encodeURIComponent(FOR_PROGRAMS_SUBJECT)}`;

export const FOR_PROGRAMS_TITLE = "FirstPass for programs: group and site licenses | FirstPass";
export const FOR_PROGRAMS_DESCRIPTION = `Group and site licenses to FirstPass for pharmacy schools, pharmacy-tech programs, ketamine clinics, MAT and OTP programs, and harm-reduction groups. ${PAIR_DISCLAIMER}`;
export const FOR_PROGRAMS_H1 = "FirstPass for programs";
export const FOR_PROGRAMS_INTRO =
  "FirstPass shows what FDA drug labels say about taking two drugs together, with the label's own wording and a DailyMed link. Programs can set up a group or site license so a whole class, team or clinic works from the same reference.";

export const FOR_PROGRAMS_AUDIENCES: { name: string; use: string }[] = [
  { name: "Pharmacy schools", use: "Pharmacology and therapeutics courses that teach students to read interaction sections of the Prescribing Information." },
  { name: "Pharmacy-tech programs", use: "Community college and online programs training techs to spot label-named interactions before they reach the pharmacist." },
  { name: "Ketamine clinics", use: "Staff reviewing what labels say about a patient's other medicines during intake." },
  { name: "MAT and OTP programs", use: "Opioid treatment and office-based buprenorphine teams checking label wording on common co-prescribed drugs." },
  { name: "Harm-reduction groups", use: "Outreach and education staff who want plain-language label wording with a source link." },
];

export const FOR_PROGRAMS_INCLUDES: string[] = [
  "Founding licenses for a group, a site or a whole program",
  "Seats for every learner or staff member in the program",
  "The full desk, every pair page and every drug page",
  "Label quotes checked against current DailyMed labels",
  "A named contact for setup and questions",
];

export const FOR_PROGRAMS_CTA = "Email us about a group license";
