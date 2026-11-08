import { PROGRAM_TIERS, type ProgramTierId } from "@/lib/billing/programs";
import type { PackId } from "@/lib/drugs/permalinks";
import { PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";
import { FOR_PROGRAMS_PATH, FOR_PROGRAMS_URL, seatsLabel } from "./for-programs";

/**
 * Copy for /for-programs/<audience>: one landing page per kind of program.
 * Every page is built from one entry here. Tier names and prices come from
 * src/lib/billing/programs.ts; pairs are named by catalog id and resolved
 * against pairPages() (for-programs-audience-pages.ts drops any that don't exist,
 * and the tests fail if one is listed that doesn't).
 *
 * Rules the tests enforce (for-programs-audiences.test.ts):
 * - No price, "free" or "Pro" in titles, descriptions or JSON-LD.
 * - No dose wording, no FDA clearance or approval claim, no invented customers,
 *   numbers or testimonials.
 * - Intended users are licensed clinicians and supervised students. Nothing
 *   here is written for patients.
 * - Teaching uses name only features that exist on the desk today, and link
 *   only to pages, packs and lab assignments that exist.
 */

export type AudienceSlug =
  | "pharmacy-schools"
  | "nursing-and-np-programs"
  | "pa-programs"
  | "pharmacy-tech-programs"
  | "residency-programs"
  | "ketamine-and-psychiatry-clinics"
  | "opioid-treatment-programs";

/** A link inside a teaching use. Either a site path, a teaching pack or a lab-book assignment. */
export type AudienceLink =
  | { kind: "path"; href: string; label: string }
  | { kind: "pack"; pack: PackId; label: string }
  | { kind: "lab"; lab: string; label: string };

export interface AudienceUse {
  name: string;
  text: string;
  link?: AudienceLink;
}

export interface ProgramAudience {
  slug: AudienceSlug;
  /** Short name, used in lists, breadcrumbs and the share image. */
  name: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  /** 3 or 4 teaching uses, each tied to a desk feature that exists. */
  uses: AudienceUse[];
  /** 3 to 5 pairs by catalog id, [drugA, drugB] in either order. */
  pairs: [string, string][];
  /** The program tier that usually fits. */
  tier: ProgramTierId;
  /** One plain sentence on why that tier, and what to pick instead. No prices: the tier card shows them. */
  tierNote: string;
}

const desc = (lead: string) => `${lead} Invoice and purchase order. ${PAIR_DISCLAIMER}`;

/* Shared teaching uses, worded once. */
const PAIR_PAGES_USE = (context: string): AudienceUse => ({
  name: "Label-quoted pair pages",
  text: `Each pair page quotes what the FDA Prescribing Information says about taking the two drugs together, names the label section, links to DailyMed and explains what the grade rests on. ${context}`,
  link: { kind: "path", href: "/pairs", label: "Browse the pair pages" },
});

const PRACTICE_USE = (context: string): AudienceUse => ({
  name: "Practice recall",
  text: `The /practice recall mode asks about label-sourced pairs one at a time. ${context}`,
  link: { kind: "path", href: "/practice", label: "Open practice" },
});

const SCORM_USE = (context: string): AudienceUse => ({
  name: "SCORM 1.2 package for your LMS",
  text: `A SCORM 1.2 package of label-quoted pair cards that LMS courses can host. It reports a page as viewed and sends no score. ${context}`,
});

const PHENO_USE = (context: string): AudienceUse => ({
  name: "Phenoconversion view",
  text: `The desk's phenoconversion view shows the same set of medicines with a blocker or inducer off, then on, so learners see how an enzyme can behave differently from a known metabolizer status. ${context}`,
  link: { kind: "path", href: "/enzymes", label: "Open the enzyme pages" },
});

const WORKUP_USE = (context: string): AudienceUse => ({
  name: "Regimen workups",
  text: `On /workup, learners call which pairs in a sample regimen interact and how, then compare with the desk's findings and sources. ${context}`,
  link: { kind: "path", href: "/workup", label: "Open workup" },
});

export const PROGRAM_AUDIENCES: readonly ProgramAudience[] = [
  {
    slug: "pharmacy-schools",
    name: "Pharmacy schools",
    title: "Drug-interaction teaching for PharmD pharmacology and therapeutics | FirstPass",
    description: desc(
      "A program license to FirstPass for PharmD pharmacology and therapeutics courses: label-quoted interaction pairs with DailyMed links, teaching packs and lab-book assignments.",
    ),
    h1: "FirstPass for pharmacy schools",
    intro:
      "PharmD students learn to read the Contraindications and Drug Interactions sections of the Prescribing Information. FirstPass puts those label statements next to the mechanism the desk maps, so a pharmacology or therapeutics course can teach from the label's own wording and check it on DailyMed.",
    uses: [
      {
        name: "A teaching pack for a lab session",
        text: "The PharmD lab pack opens a set of teaching cases on the desk from one link. Post it on the course page and every student starts from the same cases.",
        link: { kind: "pack", pack: "pharmd", label: "Open the PharmD lab pack" },
      },
      {
        name: "Lab-book assignments",
        text: "Each lab-book assignment asks students to explain one interaction in three sentences, then compare their answer with a written key. Students can export their answers and submit them.",
        link: { kind: "lab", lab: "tacrolimus-gf", label: "Open a lab-book assignment" },
      },
      PHENO_USE("It fits a pharmacogenomics or CYP lecture."),
      PAIR_PAGES_USE("A therapeutics class can discuss the reasoning, not just the result."),
    ],
    pairs: [
      ["simvastatin", "clarithromycin"],
      ["clopidogrel", "omeprazole"],
      ["tizanidine", "ciprofloxacin"],
      ["fluoxetine", "linezolid"],
      ["apixaban", "rifampin"],
    ],
    tier: "program",
    tierNote: "A PharmD class year usually fits the Program license. A whole school can use Site.",
  },
  {
    slug: "nursing-and-np-programs",
    name: "Nursing and NP programs",
    title: "Drug-interaction teaching for nursing and nurse practitioner programs | FirstPass",
    description: desc(
      "A program license to FirstPass for nursing and nurse practitioner pharmacology courses: label-quoted interaction pairs with DailyMed links, practice recall and regimen workups.",
    ),
    h1: "FirstPass for nursing and nurse practitioner programs",
    intro:
      "Nursing and nurse practitioner students meet drug interactions in pharmacology courses and again in clinical rotations. FirstPass shows what the FDA labels say about taking two drugs together, in the label's own wording with a DailyMed link, so faculty can teach students to find and read that wording themselves.",
    uses: [
      PAIR_PAGES_USE("Faculty can put one on screen in a pharmacology lecture and open the label from it."),
      PRACTICE_USE("Students can use it between classes."),
      WORKUP_USE("It works as a short in-class exercise before a clinical rotation."),
      SCORM_USE("It suits programs that teach online through an LMS."),
    ],
    pairs: [
      ["nitroglycerin", "sildenafil"],
      ["sertraline", "linezolid"],
      ["methadone", "ondansetron"],
      ["disulfiram", "ethanol"],
      ["rivaroxaban", "ketoconazole"],
    ],
    tier: "program",
    tierNote: "A nursing or NP cohort usually fits the Program license. A school with several cohorts can use Site.",
  },
  {
    slug: "pa-programs",
    name: "PA programs",
    title: "Drug-interaction teaching for physician assistant programs | FirstPass",
    description: desc(
      "A program license to FirstPass for physician assistant clinical pharmacology: label-quoted interaction pairs with DailyMed links, regimen workups and a phenoconversion view.",
    ),
    h1: "FirstPass for physician assistant programs",
    intro:
      "Physician assistant students cover clinical pharmacology in the didactic year and then see interactions on rotations. FirstPass gives a PA program one reference for teaching how FDA labels word interactions, with the source one click away.",
    uses: [
      WORKUP_USE("It fits a clinical pharmacology or clinical medicine session."),
      PAIR_PAGES_USE("Students can check a rotation question against the label wording."),
      PHENO_USE("It fits a lecture on CYP inhibitors and inducers."),
      PRACTICE_USE("Students can use it before an exam block."),
    ],
    pairs: [
      ["paxlovid", "simvastatin"],
      ["nitroglycerin", "tadalafil"],
      ["ziprasidone", "moxifloxacin"],
      ["apixaban", "rifampin"],
      ["clopidogrel", "esomeprazole"],
    ],
    tier: "program",
    tierNote: "A PA cohort usually fits the Program license. A program with more than one cohort can use Site.",
  },
  {
    slug: "pharmacy-tech-programs",
    name: "Pharmacy-tech programs",
    title: "Drug-interaction teaching for pharmacy technician programs | FirstPass",
    description: desc(
      "A program license to FirstPass for pharmacy technician courses: label-quoted interaction pairs with DailyMed links, practice recall and a SCORM 1.2 package for online courses.",
    ),
    h1: "FirstPass for pharmacy technician programs",
    intro:
      "Pharmacy technician students learn to recognize when a label names an interaction, so they can flag it for the pharmacist. FirstPass shows the label's wording in plain view, with a DailyMed link, for community college and online pharmacy-tech courses.",
    uses: [
      PAIR_PAGES_USE("Students see the exact wording a label uses for a contraindicated pair."),
      PRACTICE_USE("It helps students learn the label-named pairs by recall."),
      SCORM_USE("It suits online pharmacy-tech courses that run in an LMS."),
    ],
    pairs: [
      ["simvastatin", "clarithromycin"],
      ["phenelzine", "dextromethorphan"],
      ["tranylcypromine", "pseudoephedrine"],
      ["disulfiram", "ethanol"],
      ["clopidogrel", "omeprazole"],
    ],
    tier: "program",
    tierNote: "A pharmacy-tech cohort usually fits the Program license. A smaller cohort can use Team.",
  },
  {
    slug: "residency-programs",
    name: "Residency programs",
    title: "Drug-interaction teaching for pharmacy and medical residency programs | FirstPass",
    description: desc(
      "A program license to FirstPass for pharmacy and medical residency teaching: label-quoted interaction pairs with DailyMed links, a note on what each grade rests on, and lab-book assignments.",
    ),
    h1: "FirstPass for residency programs",
    intro:
      "Residency programs teach interactions in topic discussions, journal clubs and precepting. FirstPass gives residents and preceptors the same label wording to work from, with the DailyMed source and a short note on what each grade rests on.",
    uses: [
      PAIR_PAGES_USE("The \"Why this grade\" box gives a topic discussion something concrete to question."),
      {
        name: "Lab-book assignments for precepting",
        text: "A preceptor can assign one lab-book case, have the resident explain it in three sentences, then compare with the written key together.",
        link: { kind: "lab", lab: "beers-lorazepam", label: "Open a lab-book assignment" },
      },
      PHENO_USE("It fits a pharmacogenomics topic discussion."),
      {
        name: "What is and isn't checked",
        text: "The trust page lists what is and isn't backed by an outside source, for a journal-club discussion of where the grades come from.",
        link: { kind: "path", href: "/trust", label: "Read the trust page" },
      },
    ],
    pairs: [
      ["paxlovid", "amiodarone"],
      ["voriconazole", "sirolimus"],
      ["sertraline", "methylene-blue"],
      ["bictegravir", "rifampin"],
      ["methadone", "sotalol"],
    ],
    tier: "program",
    tierNote: "A residency program usually fits the Program license. A small group of residents and preceptors can use Team.",
  },
  {
    slug: "ketamine-and-psychiatry-clinics",
    name: "Ketamine and psychiatry clinics",
    title: "Drug-interaction in-services for ketamine and psychiatry clinics | FirstPass",
    description: desc(
      "A team license to FirstPass for in-services at ketamine and psychiatry clinics: what FDA labels say about ketamine, esketamine and common co-prescribed medicines, with DailyMed links.",
    ),
    h1: "FirstPass for ketamine and psychiatry clinics",
    intro:
      "Ketamine and psychiatry clinics train licensed staff on what labels say about common co-prescribed medicines, such as benzodiazepines, MAOIs and stimulants. FirstPass gives a clinic team one reference for in-services, in the label's own wording with a DailyMed link.",
    uses: [
      {
        name: "A clinic onboarding pack",
        text: "The clinic onboarding pack opens a short set of ketamine teaching cases on the desk from one link, for new staff in their first week.",
        link: { kind: "pack", pack: "clinic-onboard", label: "Open the clinic onboarding pack" },
      },
      {
        name: "Lab-book assignments for in-services",
        text: "A lab-book case asks staff to explain one interaction in three sentences, then compare with a written key. It works as a short in-service exercise.",
        link: { kind: "lab", lab: "ketamine-benzo", label: "Open a lab-book assignment" },
      },
      PAIR_PAGES_USE("Staff can open the label from the page during an in-service."),
      PRACTICE_USE("Staff can use it for self-study between in-services."),
    ],
    pairs: [
      ["ketamine", "lorazepam"],
      ["esketamine", "alprazolam"],
      ["ketamine", "ethanol"],
      ["esketamine", "phenelzine"],
      ["esketamine", "methylphenidate"],
    ],
    tier: "team",
    tierNote: "A clinic team usually fits the Team license. A group with several clinics can use Program or Site.",
  },
  {
    slug: "opioid-treatment-programs",
    name: "Opioid treatment programs",
    title: "Drug-interaction in-services for opioid treatment and buprenorphine programs | FirstPass",
    description: desc(
      "A team license to FirstPass for opioid treatment programs and office-based buprenorphine teams: what FDA labels say about methadone, buprenorphine and naltrexone with other medicines, with DailyMed links.",
    ),
    h1: "FirstPass for opioid treatment programs",
    intro:
      "Opioid treatment programs and office-based buprenorphine teams train licensed staff on what labels say about medicines taken with methadone, buprenorphine and naltrexone. FirstPass puts that label wording in one place for in-services and self-study, with a DailyMed link on every quote.",
    uses: [
      {
        name: "A MAT teaching pack",
        text: "The MAT teaching pack opens a set of opioid and sedative teaching cases on the desk from one link, for staff in-services.",
        link: { kind: "pack", pack: "mat-cup", label: "Open the MAT teaching pack" },
      },
      {
        name: "Lab-book assignments",
        text: "A lab-book case asks staff to explain one interaction in three sentences, then compare with a written key.",
        link: { kind: "lab", lab: "naltrexone-opioid", label: "Open a lab-book assignment" },
      },
      PAIR_PAGES_USE("Methadone and buprenorphine pairs each quote the label section they come from."),
    ],
    pairs: [
      ["methadone", "buprenorphine"],
      ["naltrexone", "buprenorphine"],
      ["buprenorphine", "alprazolam"],
      ["methadone", "rifampin"],
      ["methadone", "ondansetron"],
    ],
    tier: "team",
    tierNote: "An OTP or buprenorphine team usually fits the Team license. A program with several sites can use Program or Site.",
  },
];

export const AUDIENCE_BY_SLUG = Object.fromEntries(PROGRAM_AUDIENCES.map((a) => [a.slug, a])) as Record<AudienceSlug, ProgramAudience>;

export function audienceBySlug(slug: string): ProgramAudience | undefined {
  return Object.hasOwn(AUDIENCE_BY_SLUG, slug) ? AUDIENCE_BY_SLUG[slug as AudienceSlug] : undefined;
}

export const audiencePath = (slug: AudienceSlug) => `${FOR_PROGRAMS_PATH}/${slug}`;
export const audienceUrl = (slug: AudienceSlug) => `${FOR_PROGRAMS_URL}/${slug}`;

/** Every audience page's canonical URL, for the sitemap. */
export function audienceUrls(): string[] {
  return PROGRAM_AUDIENCES.map((a) => audienceUrl(a.slug));
}

/** The href a teaching-use link points to. Packs and lab-book assignments open on the desk. */
export function audienceLinkHref(link: AudienceLink): string {
  if (link.kind === "pack") return `/?pack=${encodeURIComponent(link.pack)}`;
  if (link.kind === "lab") return `/?lab=${encodeURIComponent(link.lab)}`;
  return link.href;
}

/* ---------------- structured data ---------------- */

/** JSON-LD for one audience page: the same Service shape as /for-programs, scoped to that audience. No prices. */
export function audienceJsonLd(a: ProgramAudience) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `FirstPass program license for ${a.name.toLowerCase()}`,
    serviceType: "Group and site licenses for an educational drug-interaction reference",
    description: `${a.h1}. An educational drug-interaction reference for licensed healthcare professionals and supervised health-professions students. Label-sourced pairs in the FDA label's own wording, with DailyMed links.`,
    url: audienceUrl(a.slug),
    audience: { "@type": "Audience", audienceType: a.name },
    provider: { "@type": "Organization", name: "FirstPass", url: `${SITE_URL}/` },
    isRelatedTo: { "@type": "Service", name: "FirstPass program license", url: FOR_PROGRAMS_URL },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Program tiers",
      itemListElement: PROGRAM_TIERS.map((t) => ({ "@type": "Offer", name: `${t.name} license`, description: `${seatsLabel(t)}. ${t.tagline}` })),
    },
  };
}
