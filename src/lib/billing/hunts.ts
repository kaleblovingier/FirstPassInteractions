import { COMMERCE, OPERATOR, SITE, WHO_FOR, payClose } from "./commerce";
import { nextPipeStorage, type PipeSaveOpts } from "./operator-desk";

export type Prey = "clinic" | "mat" | "pharmacy" | "school" | "harm" | "assoc";
export type Range = "whatcom" | "puget" | "eastwa" | "pnw" | "us";
export type PipeStatus = "queued" | "sent" | "waiting" | "keyed" | "skip";

export interface Target {
  id: string;
  name: string;
  prey: Prey;
  range: Range;
  city: string;
  who: string;
  site: string;
  hook: string;
}

/** A target kept on file but out of active outreach. Never shown in DIRECTORY / weekTargets. */
export interface ParkedTarget extends Target {
  parked: true;
  reason: string;
}

export interface PipeRow extends Target {
  status: PipeStatus;
  note: string;
  added: string;
}

export const PREY_LABEL: Record<Prey, string> = {
  clinic: "Ketamine clinic",
  mat: "MAT / OTP",
  pharmacy: "Pharmacy",
  school: "Pharmacy school",
  harm: "Harm reduction",
  assoc: "Association",
};

export const RANGE_LABEL: Record<Range, string> = {
  whatcom: "Whatcom / Skagit",
  puget: "Puget Sound",
  eastwa: "Eastern WA",
  pnw: "PNW",
  us: "National",
};

export const STATUS_LABEL: Record<PipeStatus, string> = {
  queued: "Queued",
  sent: "DM sent",
  waiting: "Waiting on pay",
  keyed: "Keyed",
  skip: "Skip",
};

/**
 * Active outreach targets. Public orgs only (websites, not personal inboxes); bundle is public.
 * Core audience matches WHO_FOR (licensed HCPs + supervised students). Harm-reduction programs
 * (SSPs) are on the send list by operator choice — "even ghetto harm reduction is harm reduction."
 * Use PARKED below for rows that should stay off weekTargets / filterDirectory.
 */
export const DIRECTORY: Target[] = [
  {
    id: "salish-ketamine",
    name: "Salish Ketamine",
    prey: "clinic",
    range: "whatcom",
    city: "Bellingham",
    who: "Nate Stephens, DO",
    site: "https://www.salishketamine.com/",
    hook: "Your IV ketamine panel in Fairhaven. Oral vs IV first-pass and benzo airway stacks, as teaching maps.",
  },
  {
    id: "cascade-medical-advantage",
    name: "Cascade Medical Advantage",
    prey: "mat",
    range: "whatcom",
    city: "Bellingham",
    who: "Office-based MAT, Dr. Adam Kartman",
    site: "https://cascademedicaladvantage.org/",
    hook: "Long-running buprenorphine desk. Xylazine, nitazenes, and naltrexone traps show up in the same patients.",
  },
  {
    id: "sea-mar-mat-bellingham",
    name: "Sea Mar MAT — Bellingham",
    prey: "mat",
    range: "whatcom",
    city: "Bellingham",
    who: "MAT program (Suboxone, Vivitrol)",
    site: "https://www.seamar.org/whatcom-bh-mat-bellingham.html",
    hook: "Naltrexone × leftover opioid, loperamide, and street-benzo stacks, as teaching maps for MAT education.",
  },
  {
    id: "ideal-option-bellingham",
    name: "Ideal Option — Bellingham",
    prey: "mat",
    range: "whatcom",
    city: "Bellingham",
    who: "Medication-assisted treatment clinic",
    site: "https://www.idealoption.com/clinics/bellingham",
    hook: "High-throughput MAT. The five-drug free desk is an easy way to try it; founding adds host factors and export for teaching.",
  },
  {
    id: "ccs-recovery",
    name: "CCS Recovery Center",
    prey: "mat",
    range: "whatcom",
    city: "Bellingham",
    who: "Catholic Community Services — MAT / outpatient",
    site: "https://ccsww.org/",
    hook: "Outpatient + MAT. Street adulterants and psych meds on the same board.",
  },
  {
    id: "ctc-bellingham",
    name: "Bellingham Comprehensive Treatment Center",
    prey: "mat",
    range: "whatcom",
    city: "Bellingham",
    who: "OTP / methadone + MAT",
    site: "https://www.ctcprograms.com/location/bellingham-comprehensive-treatment-center/",
    hook: "Methadone × 3A4 inducers, QT stacks, and naltrexone timing — OTP pharmacy already lives this.",
  },
  {
    id: "lifeline-bellingham",
    name: "Lifeline Connections — Bellingham",
    prey: "mat",
    range: "whatcom",
    city: "Bellingham",
    who: "IOP / MAT",
    site: "https://www.lifelineconnections.org/",
    hook: "MAT plus psych meds. Designer benzos and xylazine are already in the county supply.",
  },
  {
    id: "lummi-care",
    name: "Lummi Care",
    prey: "mat",
    range: "whatcom",
    city: "Lummi Nation",
    who: "Tribal SUD / MAT",
    site: "https://www.lummi-nsn.gov/",
    hook: "Tribal MAT desk. Same CYP maps, plus alcohol pattern and first-pass oral meds.",
  },
  {
    id: "didgwalic",
    name: "didgʷálič Wellness Center",
    prey: "mat",
    range: "whatcom",
    city: "Anacortes / Bellingham MMU",
    who: "Swinomish Tribe OTP + mobile unit",
    site: "https://www.didgwalic.com/",
    hook: "OTP plus a downtown Bellingham mobile unit. Street supply and methadone CYP maps in one desk.",
  },
  {
    id: "lwrtc",
    name: "Lake Whatcom Treatment Center",
    prey: "mat",
    range: "whatcom",
    city: "Bellingham",
    who: "Inpatient co-occurring",
    site: "https://lwrtc.org/",
    hook: "Co-occurring inpatient. Psych + SUD stacks are the whole census.",
  },
  {
    id: "nw-ketamine",
    name: "Northwest Ketamine Clinics",
    prey: "clinic",
    range: "puget",
    city: "Seattle / Bellevue / Tacoma",
    who: "Allyn Wilcock, CRNA — 50k+ infusions",
    site: "https://nwketamineclinics.com/",
    hook: "Multi-site IV ketamine practice. First-pass vs IV and 2B6 phenotype are the questions their referring pharmacies already ask.",
  },
  {
    id: "ketamine-seattle",
    name: "The Ketamine Clinic of Seattle",
    prey: "clinic",
    range: "puget",
    city: "Seattle",
    who: "Julie Chinnock, CRNA",
    site: "https://ketamineclinicofseattle.com/",
    hook: "Fremont IV desk. Benzo premed + ketamine airway stack is the teaching case.",
  },
  {
    id: "quest-ketamine",
    name: "Quest Ketamine Therapies",
    prey: "clinic",
    range: "puget",
    city: "Issaquah",
    who: "Mitchell Keszler, CRNA",
    site: "https://questketamineclinics.com/",
    hook: "Eastside infusion clinic. Oral boosters vs IV are a first-pass story.",
  },
  {
    id: "lighthouse-infusions",
    name: "Lighthouse Infusions",
    prey: "clinic",
    range: "puget",
    city: "Kenmore",
    who: "Liana Ren, CRNA ARNP",
    site: "https://lhinfusions.com/",
    hook: "North-end infusion. Same oral vs IV map, smaller shop — $79 is an easy yes.",
  },
  {
    id: "seattle-ntc",
    name: "Seattle Neuropsychiatric Treatment Center",
    prey: "clinic",
    range: "puget",
    city: "Seattle / Poulsbo",
    who: "Joshua Bess, MD",
    site: "https://seattlentc.com/",
    hook: "Spravato + interventional psych. Esketamine × 2B6/3A4 inducers is the collision.",
  },
  {
    id: "aims-institute",
    name: "AIMS Institute",
    prey: "clinic",
    range: "puget",
    city: "Seattle",
    who: "Integrative oncology + KAP",
    site: "https://www.aimsinstitute.net/",
    hook: "Ketamine lozenges are a first-pass teaching case: grapefruit and 3A4 inhibitors can change how much reaches the bloodstream.",
  },
  {
    id: "acute-pain-bellevue",
    name: "Acute Pain Therapies",
    prey: "clinic",
    range: "puget",
    city: "Bellevue",
    who: "Zachary Fisk, MD",
    site: "https://acutepaintherapies.com/",
    hook: "Pain + ketamine. Opioid + benzo + NMDA is the airway stack they already respect.",
  },
  {
    id: "nomad-therapeutics",
    name: "Nomad Therapeutics",
    prey: "clinic",
    range: "puget",
    city: "Seattle",
    who: "In-home nurse KAP",
    site: "https://nomadtherapeutics.org/",
    hook: "Home ketamine. Route and host factors make the teaching case.",
  },
  {
    id: "looking-glass-tacoma",
    name: "Looking Glass Ketamine",
    prey: "clinic",
    range: "puget",
    city: "Tacoma",
    who: "Melissa Louthain, NP",
    site: "https://lookingglassketamine.com/",
    hook: "South Sound KAP. Teaching desk for the NP-run clinic.",
  },
  {
    id: "vancouver-ketamine",
    name: "Vancouver Ketamine Infusions",
    prey: "clinic",
    range: "puget",
    city: "Vancouver, WA",
    who: "Infusion clinic",
    site: "https://vancouverketamineinfusions.com/",
    hook: "Portland-adjacent infusion. Same IV vs oral map, less Seattle noise.",
  },
  {
    id: "lakeview-everett",
    name: "Lakeview Mental Health",
    prey: "clinic",
    range: "puget",
    city: "Everett",
    who: "Alexandra Pales",
    site: "https://lakeviewmentalhealth.com/",
    hook: "Snohomish psych + ketamine. Phenotype and benzo stack for the mid-size shop.",
  },
  {
    id: "sky-valley",
    name: "Sky Valley Psychedelic Medical",
    prey: "clinic",
    range: "puget",
    city: "Lynnwood / Monroe",
    who: "Dr. John Lovejoy",
    site: "https://ketamineskyvalley.com/",
    hook: "North-end psychedelic medical. Street + clinic maps in one desk.",
  },
  {
    id: "mountain-psychiatry",
    name: "Mountain Psychiatry",
    prey: "clinic",
    range: "eastwa",
    city: "Spokane",
    who: "Kelsey Martell, DO",
    site: "https://mountainpsych.com/",
    hook: "East-side psych + ketamine. Fewer tools out there. A $79 teaching desk for education, not a substitute for a pharmacist.",
  },
  {
    id: "illume-wellbeing",
    name: "Illume Wellbeing",
    prey: "clinic",
    range: "eastwa",
    city: "Spokane Valley",
    who: "Danielle Wolff, MD",
    site: "https://illume-wellbeing.com/",
    hook: "Spokane Valley ketamine. Host factors and first-pass oral boosters.",
  },
  {
    id: "tricities-infusion",
    name: "Tri-Cities Infusion and Wellness",
    prey: "clinic",
    range: "eastwa",
    city: "Kennewick",
    who: "Tyler Thornock, CRNA",
    site: "https://tricitieswellness.com/",
    hook: "Kennewick infusion clinic that still asks pharmacy the CYP question.",
  },
  {
    id: "uw-sop",
    name: "UW School of Pharmacy",
    prey: "school",
    range: "puget",
    city: "Seattle",
    who: "PharmD program / Student & Academic Services",
    site: "https://sop.washington.edu/",
    hook: "Teaching desk they will actually open. Lab export goes in the notebook. Five-drug maps stay free for the class.",
  },
  {
    id: "wsu-pharmacy",
    name: "WSU College of Pharmacy",
    prey: "school",
    range: "eastwa",
    city: "Spokane",
    who: "PharmD admissions / faculty",
    site: "https://pharmacy.wsu.edu/",
    hook: "Spokane PharmD. Psych + MAT cases are the rotation they already run.",
  },
  {
    id: "pacific-pharmacy",
    name: "Pacific University School of Pharmacy",
    prey: "school",
    range: "pnw",
    city: "Hillsboro, OR",
    who: "PharmD faculty",
    site: "https://www.pacificu.edu/pharmacy-pharmd",
    hook: "Oregon PharmD. A CYP teaching desk with street + clinic maps for coursework.",
  },
  {
    id: "osu-pharmacy",
    name: "Oregon State College of Pharmacy",
    prey: "school",
    range: "pnw",
    city: "Corvallis / Portland",
    who: "PharmD program",
    site: "https://pharmacy.oregonstate.edu/",
    hook: "OSU PharmD. Same pitch: a desk students open during psych and pain modules.",
  },
  {
    id: "phra",
    name: "People's Harm Reduction Alliance",
    prey: "harm",
    range: "puget",
    city: "Seattle",
    who: "Peer-run SSP + naloxone mail",
    site: "https://phra.org/",
    hook: "Teaching maps for xylazine, nitazenes, and designer benzos, including why naloxone does not reverse xylazine's α2 effect.",
  },
  {
    id: "kc-needle-exchange",
    name: "King County Needle Exchange",
    prey: "harm",
    range: "puget",
    city: "Seattle",
    who: "Public Health — Seattle & King County",
    site: "https://doh.wa.gov/you-and-your-family/drug-user-health/syringe-service-programs/syringe-service-program-directory",
    hook: "County SSP. Street-supply combinations as teaching maps. Educational desk, not a charting system.",
  },
  {
    id: "askp3",
    name: "ASKP3",
    prey: "assoc",
    range: "us",
    city: "National",
    who: "American Society of Ketamine Physicians, Psychotherapists & Practitioners",
    site: "https://askp.org/",
    hook: "Ketamine-clinic membership. Oral vs IV first-pass and 2B6 phenotype as teaching maps for member education.",
  },
  {
    id: "aapp",
    name: "AAPP (psychiatric pharmacists)",
    prey: "assoc",
    range: "us",
    city: "National",
    who: "American Association of Psychiatric Pharmacists",
    site: "https://aapp.org/",
    hook: "Psych pharmacists already live CYP + PD. A teaching desk with street maps is the thing they email residents.",
  },
  {
    id: "wspa",
    name: "Washington State Pharmacy Association",
    prey: "assoc",
    range: "pnw",
    city: "Washington",
    who: "WSPA members / CE",
    site: "https://www.wsparx.org/",
    hook: "State association. Ketamine, MAT, and street adulterants on one CYP teaching map for member education. Not accredited CE.",
  },
  {
    id: "hoagland-pharmacy",
    name: "Hoagland Pharmacy",
    prey: "pharmacy",
    range: "whatcom",
    city: "Bellingham",
    who: "Independent compounding and long-term care",
    site: "https://www.hoaglandpharmacy.com/",
    hook: "Compounding and long-term-care counter. A five-drug free desk is a way to teach CYP stacks. Not a charting system.",
  },
  {
    id: "rx-mart",
    name: "Rx Mart Pharmacy",
    prey: "pharmacy",
    range: "whatcom",
    city: "Bellingham",
    who: "Independent community pharmacy",
    site: "https://www.rxmartpharmacy.com/",
    hook: "Independent community pharmacy. The free five-drug desk is enough to try a teaching check. Founding adds export.",
  },
  {
    id: "unity-care-pharmacy",
    name: "Unity Care NW Pharmacy",
    prey: "pharmacy",
    range: "whatcom",
    city: "Bellingham",
    who: "FQHC pharmacy",
    site: "https://www.unitycarenw.org/pharmacy",
    hook: "Clinic pharmacy next to primary care. Label wording for co-prescribed drugs, as a teaching map. Not a chart.",
  },
  {
    id: "custom-rx-shoppe",
    name: "Custom Rx Shoppe",
    prey: "pharmacy",
    range: "whatcom",
    city: "Ferndale",
    who: "Independent and long-term-care pharmacy",
    site: "https://www.customrxshoppe.com/",
    hook: "Retail and long-term-care delivery. Polypharmacy teaching without a chain formulary committee.",
  },
  {
    id: "swedish-pharmacy",
    name: "Swedish Pharmacy",
    prey: "pharmacy",
    range: "puget",
    city: "Seattle",
    who: "Hospital and clinic pharmacy",
    site: "https://www.swedish.org/services/pharmacy",
    hook: "Hospital pharmacy service. A teaching desk for interaction sections, not an order-entry system.",
  },
  {
    id: "evergreen-treatment",
    name: "Evergreen Treatment Services",
    prey: "mat",
    range: "puget",
    city: "Seattle",
    who: "OTP, methadone and buprenorphine",
    site: "https://www.evergreentreatment.org/",
    hook: "Opioid treatment program. Methadone, 3A4 inducers, and naltrexone timing as teaching maps. Not a dispensing system.",
  },
  {
    id: "we-care-daily",
    name: "We Care Daily Clinics",
    prey: "mat",
    range: "puget",
    city: "Auburn",
    who: "OTP, methadone, buprenorphine, and naltrexone",
    site: "https://www.wecaredailyclinics.com/medication-for-opioid-use-disorder",
    hook: "Opioid treatment with mobile dosing. The same label maps a teaching desk already stores. Not a chart.",
  },
  {
    id: "sound-choice",
    name: "Sound Choice Mental Health",
    prey: "clinic",
    range: "puget",
    city: "Lacey",
    who: "Spravato clinic",
    site: "https://www.soundchoicementalhealth.com/spravato",
    hook: "Esketamine beside oral antidepressants. Oral vs other routes as teaching maps. Not a protocol.",
  },
  {
    id: "touchstone-tms",
    name: "Touchstone TMS",
    prey: "clinic",
    range: "puget",
    city: "Olympia",
    who: "Spravato and interventional psychiatry",
    site: "https://touchstonetms.com/",
    hook: "South Sound Spravato clinics. Staff teaching on what labels say about co-prescribed medicines.",
  },
  {
    id: "tacoma-needle",
    name: "Tacoma Needle Exchange",
    prey: "harm",
    range: "puget",
    city: "Tacoma",
    who: "Pierce County syringe service",
    site: "https://tacomaneedleexchange.org/",
    hook: "Naloxone and drug checking. Street-supply combinations as teaching maps. Educational desk, not a charting system.",
  },
  {
    id: "btc",
    name: "Bellingham Technical College",
    prey: "school",
    range: "whatcom",
    city: "Bellingham",
    who: "Health-professions programs",
    site: "https://www.btc.edu/all-programs/",
    hook: "Health-professions programs. A group license is a teaching desk for supervised students, not a chart.",
  },
  {
    id: "skagit-valley-college",
    name: "Skagit Valley College",
    prey: "school",
    range: "whatcom",
    city: "Mount Vernon",
    who: "Pharmacy technician program",
    site: "https://www.skagit.edu/academics/areas-of-study/health-sciences/allied-health-education/pharmacy-technician/",
    hook: "Pharmacy technician certificate. A class license so students read the same stored label line. Not a practicum chart.",
  },
  {
    id: "seattle-colleges",
    name: "Seattle Colleges",
    prey: "school",
    range: "puget",
    city: "Seattle",
    who: "Community college programs",
    site: "https://www.seattlecolleges.edu/",
    hook: "Community college district. A site license for supervised students reading interaction sections.",
  },
  {
    id: "vmfh",
    name: "Virginia Mason Franciscan Health",
    prey: "school",
    range: "puget",
    city: "Seattle",
    who: "Pharmacy residency programs",
    site: "https://www.vmfh.org/",
    hook: "Pharmacy residency case conference. A CYP teaching desk, not a clinical system.",
  },
  {
    id: "wspha",
    name: "Washington State Public Health Association",
    prey: "assoc",
    range: "pnw",
    city: "Washington",
    who: "Public health members",
    site: "https://www.wspha.org/",
    hook: "Public health association. Outreach education with label wording and a source link. Not accredited CE.",
  },
  {
    id: "ferndale-pharmacy",
    name: "Ferndale Pharmacy",
    prey: "pharmacy",
    range: "whatcom",
    city: "Ferndale",
    who: "Independent community pharmacy",
    site: "https://www.ferndalepharmacy.com/",
    hook: "Ferndale pharmacy that lists multi-dose packaging. A five-drug teaching desk for the counter. Not a dispensing system.",
  },
  {
    id: "fairway-drug",
    name: "Fairway Drug",
    prey: "pharmacy",
    range: "whatcom",
    city: "Lynden",
    who: "Independent community pharmacy",
    site: "https://www.mygnp.com/pharmacies/fairway-drug-lynden-wa-98264/",
    hook: "Independent pharmacy in Lynden. A five-drug free desk is a teaching check. Not a charting system.",
  },
  {
    id: "valley-drug",
    name: "Valley Drug",
    prey: "pharmacy",
    range: "whatcom",
    city: "Everson",
    who: "Independent community pharmacy",
    site: "https://www.mygnp.com/pharmacies/valley-drug-everson-wa-98247/",
    hook: "Independent pharmacy in Everson. Staff can try the five-drug teaching desk. Not a dispensing system.",
  },
  {
    id: "hilltop-pharmacy",
    name: "Hilltop Pharmacy",
    prey: "pharmacy",
    range: "whatcom",
    city: "Mount Vernon",
    who: "Independent community pharmacy",
    site: "https://www.rxhilltop.com/",
    hook: "Mount Vernon pharmacy. Stored label lines as a teaching map for the staff. Not a chart.",
  },
  {
    id: "makers-compounding",
    name: "Makers Compounding Pharmacy",
    prey: "pharmacy",
    range: "whatcom",
    city: "Mount Vernon",
    who: "Compounding pharmacy",
    site: "https://makerscompounding.com/",
    hook: "Skagit Valley compounding pharmacy. A teaching desk for the pharmacists. Not a formula.",
  },
  {
    id: "neighborcare-pharmacy",
    name: "Neighborcare Health Pharmacy",
    prey: "pharmacy",
    range: "puget",
    city: "Seattle",
    who: "Community health pharmacy",
    site: "https://www.neighborcare.org/services/pharmacy/",
    hook: "Community health pharmacy. Label wording as a teaching map for the pharmacists. Not a chart.",
  },
  {
    id: "north-seattle-pharm-tech",
    name: "North Seattle College Pharmacy Technician Program",
    prey: "school",
    range: "puget",
    city: "Seattle",
    who: "Pharmacy technician program",
    site: "https://northseattle.edu/programs/pharmacy-technician",
    hook: "Pharmacy technician program. A group license for supervised students reading interaction sections. Not a chart.",
  },
  {
    id: "scc-pharm-tech",
    name: "Spokane Community College Pharmacy Technician Program",
    prey: "school",
    range: "eastwa",
    city: "Spokane",
    who: "Pharmacy technician program",
    site: "https://scc.spokane.edu/What-to-Study/Programs/Pathway-Course-Map?plan=Pharmacy",
    hook: "Pharmacy technician pathway in Spokane. A class desk for the same stored label wording. Not a practicum chart.",
  },
  {
    id: "chemeketa-pharm-tech",
    name: "Chemeketa Community College Pharmacy Technician Program",
    prey: "school",
    range: "pnw",
    city: "Salem",
    who: "Pharmacy technician program",
    site: "https://www.chemeketa.edu/programs-classes/program-finder/pharmacy-technician/",
    hook: "Pharmacy technician program in Salem. A class license for stored label lines. Not a chart.",
  },
  {
    id: "isu-pharmacy",
    name: "Idaho State University College of Pharmacy",
    prey: "school",
    range: "pnw",
    city: "Pocatello",
    who: "College of pharmacy",
    site: "https://www.isu.edu/pharmacy/",
    hook: "College of pharmacy in Pocatello. A teaching desk for supervised students. Not a clinical system.",
  },
  {
    id: "legacy-pgy1",
    name: "Legacy Health PGY1 Pharmacy Residency",
    prey: "school",
    range: "pnw",
    city: "Portland",
    who: "PGY1 pharmacy residency",
    site: "https://www.legacyhealth.org/for-health-professionals/education-for-health-professionals/pharmacy-residency-program/pgy1-residency-program",
    hook: "PGY1 pharmacy residency. A teaching desk for topic discussion. Not a clinical system.",
  },
  {
    id: "vmc-pgy1",
    name: "Valley Medical Center PGY1 Pharmacy Residency",
    prey: "school",
    range: "puget",
    city: "Renton",
    who: "PGY1 pharmacy residency",
    site: "https://www.valleymed.org/pharmacyresidency/",
    hook: "PGY1 pharmacy residency. Case conference on stored label lines. Not an order-entry system.",
  },
  {
    id: "coda",
    name: "CODA, Inc.",
    prey: "mat",
    range: "pnw",
    city: "Portland",
    who: "Opioid treatment program",
    site: "https://codainc.org/",
    hook: "Opioid treatment program in Portland. Teaching maps for medicines on the same list. Not a dispensing system.",
  },
  {
    id: "skagit-cjc",
    name: "Skagit County Community Justice Center",
    prey: "mat",
    range: "whatcom",
    city: "Mount Vernon",
    who: "Medications for opioid use disorder",
    site: "https://www.skagitcountywa.gov/services/public-health/community-services/behavioral-health/",
    hook: "The county page says people at the Community Justice Center can be offered buprenorphine or methadone. A teaching desk for that team. Not a chart.",
  },
  {
    id: "skagit-syringe",
    name: "Skagit County Mobile Syringe Exchange",
    prey: "harm",
    range: "whatcom",
    city: "Skagit County",
    who: "Mobile syringe exchange",
    site: "https://www.skagitcountywa.gov/services/public-health/community-services/behavioral-health/",
    hook: "County mobile syringe exchange. A teaching desk for exchange staff. Not a patient handout.",
  },
  {
    id: "whatcom-has-hope",
    name: "Whatcom Has Hope",
    prey: "harm",
    range: "whatcom",
    city: "Whatcom County",
    who: "Overdose education",
    site: "https://whatcomhope.org/",
    hook: "Overdose education that points people to naloxone. A teaching desk for the educators, not a patient handout.",
  },
  {
    id: "dave-purchase",
    name: "Dave Purchase Project",
    prey: "harm",
    range: "puget",
    city: "Tacoma",
    who: "Harm-reduction supply project",
    site: "https://www.davepurchaseproject.org/",
    hook: "Harm-reduction supply project. Needle-exchange questions as teaching maps. Not a charting system.",
  },
  {
    id: "ishp",
    name: "Idaho Society of Health-System Pharmacy",
    prey: "assoc",
    range: "pnw",
    city: "Idaho",
    who: "Health-system pharmacy society",
    site: "https://ishp.wildapricot.org/",
    hook: "Health-system pharmacy society. Member teaching on stored label lines. Not accredited CE.",
  },
  {
    id: "cocc-pharm-tech",
    name: "Central Oregon Community College Pharmacy Technician Program",
    prey: "school",
    range: "pnw",
    city: "Bend",
    who: "Pharmacy technician program",
    site: "https://cocc.edu/programs/pharmacy-tech/",
    hook: "Pharmacy technician program. A class license for stored label lines. Not a practicum chart.",
  },
  {
    id: "wvc-pharm-tech",
    name: "Wenatchee Valley College Pharmacy Technician Program",
    prey: "school",
    range: "eastwa",
    city: "Wenatchee",
    who: "Pharmacy technician program",
    site: "https://catalog.wvc.edu/pharmacy-technician",
    hook: "Pharmacy technician program. A class desk for the same stored label wording. Not a chart.",
  },
  {
    id: "nic-pharm-tech",
    name: "North Idaho College Pharmacy Technician Program",
    prey: "school",
    range: "pnw",
    city: "Coeur d'Alene",
    who: "Pharmacy technician program",
    site: "https://www.nic.edu/healthcareers/pharmacy-technician-training-program/",
    hook: "Pharmacy technician training program. A group license for supervised students. Not a chart.",
  },
  {
    id: "ohsu-pgy1",
    name: "OHSU PGY1 Pharmacy Residency",
    prey: "school",
    range: "pnw",
    city: "Portland",
    who: "PGY1 pharmacy residency",
    site: "https://www.ohsu.edu/pharmacy/pgy1-pharmacy-residency",
    hook: "PGY1 pharmacy residency. A teaching desk for topic discussion. Not a clinical system.",
  },
  {
    id: "va-puget-pgy1",
    name: "VA Puget Sound Pharmacy Residency",
    prey: "school",
    range: "puget",
    city: "Seattle",
    who: "PGY1 and PGY2 pharmacy residency",
    site: "https://www.va.gov/puget-sound-health-care/work-with-us/internships-and-fellowships/va-puget-sound-pharmacy-residency-programs-in-seattle-washington-pgy1-and-pgy2/",
    hook: "VA pharmacy residency programs in Seattle. A teaching desk for case conference. Not an order-entry system.",
  },
  {
    id: "spokane-va-pgy1",
    name: "Spokane VA Pharmacy Residency",
    prey: "school",
    range: "eastwa",
    city: "Spokane",
    who: "Pharmacy residency program",
    site: "https://www.va.gov/spokane-health-care/work-with-us/internships-and-fellowships/spokane-va-pharmacy-residency-program/",
    hook: "VA pharmacy residency in Spokane. A teaching desk for topic discussion. Not a clinical system.",
  },
  {
    id: "quil-ceda",
    name: "Quil Ceda Creek Counseling Company",
    prey: "mat",
    range: "puget",
    city: "Tulalip",
    who: "Opioid treatment program",
    site: "https://www.quilcedacreekcounselingcompany.com/",
    hook: "The site names methadone and buprenorphine. A teaching desk for that team. Not a dispensing system.",
  },
  {
    id: "marion-county-mat",
    name: "Marion County Medication-Assisted Treatment",
    prey: "mat",
    range: "pnw",
    city: "Salem",
    who: "Medication-assisted treatment services",
    site: "https://www.co.marion.or.us/HLT/ATS/Pages/Medication-Assisted-Treatment-Services.aspx",
    hook: "County medication-assisted treatment services. A teaching desk for that team. Not a chart.",
  },
  {
    id: "lonerock",
    name: "Lonerock Clinic",
    prey: "clinic",
    range: "pnw",
    city: "Eugene",
    who: "Spravato clinic",
    site: "https://www.lonerockclinic.com/spravato-treatment",
    hook: "Esketamine clinic. Oral versus other routes as teaching maps. Not a protocol.",
  },
  {
    id: "transformative-hw",
    name: "Transformative Health & Wellness",
    prey: "clinic",
    range: "pnw",
    city: "Corvallis",
    who: "Ketamine and Spravato clinic",
    site: "https://www.transformativehw.com/ketamine-spravato",
    hook: "Ketamine and esketamine clinic. Staff teaching on co-prescribed medicines. Not a protocol.",
  },
  {
    id: "wa-doh-ssp",
    name: "Washington State Department of Health Syringe Service Programs",
    prey: "harm",
    range: "pnw",
    city: "Washington",
    who: "Syringe service programs",
    site: "https://doh.wa.gov/you-and-your-family/drug-user-health/syringe-service-programs",
    hook: "State page for syringe service programs. A teaching desk for outreach staff. Not a patient handout.",
  },
  {
    id: "ispa",
    name: "Idaho State Pharmacy Association",
    prey: "assoc",
    range: "pnw",
    city: "Idaho",
    who: "Pharmacy association",
    site: "https://idahopharmacy.weebly.com/",
    hook: "Pharmacy association. Member teaching on stored label lines. Not accredited CE.",
  },
];

/**
 * Parked: kept for the record, excluded from active outreach (DIRECTORY, weekTargets,
 * filterDirectory). Empty after operator un-parked PHRA / King County Needle Exchange.
 */
export const PARKED: ParkedTarget[] = [];

export const RECIPES = [
  {
    id: "clinic-whatcom",
    prey: "clinic" as Prey,
    range: "whatcom" as Range,
    label: "Ketamine clinics — Whatcom",
    google: "ketamine clinic OR esketamine OR Spravato Bellingham OR Whatcom OR Mount Vernon",
    maps: "ketamine clinic Bellingham WA",
    x: "ketamine clinic (Bellingham OR Whatcom) (infusion OR Spravato)",
    linkedin: "medical director ketamine Bellingham",
  },
  {
    id: "clinic-puget",
    prey: "clinic" as Prey,
    range: "puget" as Range,
    label: "Ketamine clinics — Puget Sound",
    google: "ketamine infusion clinic (Seattle OR Bellevue OR Tacoma OR Everett) Spravato",
    maps: "ketamine clinic Seattle WA",
    x: "ketamine (clinic OR infusion) (Seattle OR Bellevue OR Tacoma)",
    linkedin: "CRNA OR PMHNP ketamine clinic Seattle",
  },
  {
    id: "clinic-east",
    prey: "clinic" as Prey,
    range: "eastwa" as Range,
    label: "Ketamine clinics — East of the mountains",
    google: "ketamine clinic (Spokane OR Kennewick OR Yakima OR Wenatchee)",
    maps: "ketamine clinic Spokane WA",
    x: "ketamine clinic (Spokane OR Tri-Cities OR Yakima)",
    linkedin: "ketamine clinic Spokane medical director",
  },
  {
    id: "mat-whatcom",
    prey: "mat" as Prey,
    range: "whatcom" as Range,
    label: "MAT / OTP — Whatcom & Skagit",
    google: "MAT OR \"medication assisted\" OR methadone OR buprenorphine clinic Bellingham OR Whatcom",
    maps: "medication assisted treatment Bellingham WA",
    x: "MAT OR buprenorphine OR OTP (Bellingham OR Whatcom)",
    linkedin: "MAT medical director Bellingham",
  },
  {
    id: "mat-puget",
    prey: "mat" as Prey,
    range: "puget" as Range,
    label: "MAT / OTP — Puget Sound",
    google: "opioid treatment program OR Ideal Option OR Evergreen Treatment Seattle",
    maps: "opioid treatment program Seattle WA",
    x: "(MAT OR methadone clinic) (Seattle OR Tacoma) xylazine",
    linkedin: "opioid treatment program medical director Seattle",
  },
  {
    id: "school-pnw",
    prey: "school" as Prey,
    range: "pnw" as Range,
    label: "Pharmacy schools — PNW",
    google: "\"school of pharmacy\" (Washington OR Oregon) psychopharmacology faculty",
    maps: "school of pharmacy Seattle",
    x: "PharmD (UW OR WSU OR \"Pacific University\" OR OSU) (CYP OR psychopharm)",
    linkedin: "professor pharmacy psychopharmacology Washington OR Oregon",
  },
  {
    id: "harm-puget",
    prey: "harm" as Prey,
    range: "puget" as Range,
    label: "Harm reduction — Puget Sound",
    google: "syringe service OR \"harm reduction\" (Seattle OR Whatcom OR Tacoma) xylazine",
    maps: "needle exchange Seattle WA",
    x: "(xylazine OR nitazene OR \"harm reduction\") (Seattle OR Bellingham)",
    linkedin: "harm reduction program manager Seattle",
  },
  {
    id: "pharmacy-whatcom",
    prey: "pharmacy" as Prey,
    range: "whatcom" as Range,
    label: "Pharmacies — Whatcom & Skagit",
    google: "independent pharmacy (Bellingham OR Ferndale OR Lynden OR \"Mount Vernon\" OR Burlington)",
    maps: "pharmacy Bellingham WA",
    x: "pharmacy (Bellingham OR Whatcom OR Skagit)",
    linkedin: "pharmacist in charge Bellingham",
  },
  {
    id: "pharmacy-puget",
    prey: "pharmacy" as Prey,
    range: "puget" as Range,
    label: "Pharmacies — Puget Sound",
    google: "independent pharmacy OR \"specialty pharmacy\" (Seattle OR Tacoma OR Everett OR Bellevue)",
    maps: "pharmacy Seattle WA",
    x: "pharmacy (Seattle OR Tacoma OR Everett)",
    linkedin: "pharmacy manager Seattle",
  },
  {
    id: "assoc-us",
    prey: "assoc" as Prey,
    range: "us" as Range,
    label: "Associations that amplify",
    google: "ASKP3 OR \"psychiatric pharmacists\" OR WSPA ketamine education",
    maps: "pharmacy association Olympia WA",
    x: "ASKP OR \"psychiatric pharmacist\" ketamine CYP",
    linkedin: "ASKP ketamine physician OR psychiatric pharmacist faculty",
  },
] as const;

/** Search recipes for parked audiences. Not rendered with RECIPES. Currently empty. */
export const PARKED_RECIPES = [] as const;

export function googleUrl(q: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
export function mapsUrl(q: string) {
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
}
export function xUrl(q: string) {
  return `https://x.com/search?q=${encodeURIComponent(q)}&src=typed_query&f=live`;
}
export function linkedinUrl(q: string) {
  return `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(q)}`;
}

export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

const RANGE_RANK: Record<Range, number> = {
  whatcom: 0,
  puget: 1,
  eastwa: 2,
  pnw: 3,
  us: 4,
};

function pickRotate<T>(arr: T[], seed: number, n: number): T[] {
  if (arr.length === 0 || n <= 0) return [];
  const start = (seed * 3) % arr.length;
  const out: T[] = [];
  for (let i = 0; i < arr.length && out.length < n; i++) {
    out.push(arr[(start + i) % arr.length]);
  }
  return out;
}

export function weekTargets(count = 5): Target[] {
  const week = isoWeek();
  const local = DIRECTORY.filter((t) => t.range === "whatcom").sort((a, b) => a.name.localeCompare(b.name));
  const rest = DIRECTORY.filter((t) => t.range !== "whatcom").sort(
    (a, b) => RANGE_RANK[a.range] - RANGE_RANK[b.range] || a.name.localeCompare(b.name),
  );
  const here = pickRotate(local, week, Math.min(2, count));
  const have = new Set(here.map((t) => t.id));
  const more = pickRotate(rest, week, count - here.length).filter((t) => !have.has(t.id));
  return [...here, ...more].slice(0, count);
}

/** Active outreach only: parked targets are never in DIRECTORY, so they never show here. */
export function filterDirectory(prey: Prey | "all", range: Range | "all") {
  return DIRECTORY.filter((t) => (prey === "all" || t.prey === prey) && (range === "all" || t.range === range));
}

/** Free oral-ketamine teaching demo on the live desk (`?sample=gf-oral-ketamine`). No key needed. */
export function oralKetamineDemoUrl(siteUrl: string = SITE.url) {
  const url = new URL(siteUrl);
  url.hash = "";
  url.search = "";
  url.searchParams.set("sample", "gf-oral-ketamine");
  return url.toString();
}

/**
 * Hunt DM. Canon: five drugs free; founding $79 once (not Pro, not a subscription);
 * oral ketamine route is the free teaching demo; the other host factors come with founding.
 * Clinic DMs lead with the free oral-ketamine link. Every DM carries the desk + Pages URLs.
 */
export function targetDm(t: Pick<Target, "name" | "city" | "hook"> & Partial<Pick<Target, "prey">>, price = COMMERCE.founding) {
  const clinic = t.prey === "clinic";
  return [
    `I built FirstPass, an educational CYP450 teaching desk. ${t.hook}`,
    WHO_FOR,
    "",
    `Looked you up because of ${t.name} in ${t.city}.`,
    "",
    "Free: check up to five drugs. No card, no key.",
    ...(clinic
      ? [`Free teaching demo, oral ketamine × grapefruit (the gut first pass): ${oralKetamineDemoUrl()}`]
      : []),
    `Founding is $${price} once, not a subscription: ${clinic ? "the other host factors" : "host factors"}, metabolite maps, enzyme atlas, and JSON/CSV export.`,
    "",
    `Desk: ${SITE.url}`,
    `One-pager: ${SITE.pages}`,
    "",
    payClose(price),
    `Questions or a missing key: ${OPERATOR.email} · ${OPERATOR.phone}`,
    "",
    "Educational model — not FDA-cleared, not a clinical system of record. The Prescribing Information governs.",
  ].join("\n");
}

export function mailSubject(t: Pick<Target, "name">) {
  return `FirstPass CYP450 desk — for ${t.name}`;
}

export function mailDraft(t: Target) {
  return `mailto:?subject=${encodeURIComponent(mailSubject(t))}&body=${encodeURIComponent(targetDm(t))}`;
}

export const PIPE_KEY = "firstpass.pipeline.v1";

export function loadPipe(): PipeRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PIPE_KEY);
    const rows = raw ? (JSON.parse(raw) as Partial<PipeRow>[]) : [];
    return rows
      .filter((r) => typeof r.id === "string" && typeof r.name === "string")
      .map((r) => ({
        id: r.id as string,
        name: r.name as string,
        prey: (r.prey as Prey) ?? "clinic",
        range: (r.range as Range) ?? "puget",
        city: typeof r.city === "string" ? r.city : "",
        who: typeof r.who === "string" ? r.who : "",
        site: typeof r.site === "string" ? r.site : "",
        hook: typeof r.hook === "string" ? r.hook : "",
        status: (r.status as PipeStatus) ?? "queued",
        note: typeof r.note === "string" ? r.note : "",
        added: typeof r.added === "string" ? r.added : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

/**
 * Persist the book. Returns false when the write is refused:
 * an empty list over a real book (pass `allowEmpty`), or any edit over
 * storage that does not parse as an array (pass `replaceUnreadable`).
 */
export function savePipe(rows: PipeRow[], opts?: PipeSaveOpts): boolean {
  if (typeof window === "undefined") return false;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PIPE_KEY);
  } catch {
    return false;
  }
  const payload = nextPipeStorage(raw, rows, opts);
  if (payload == null) return false;
  try {
    localStorage.setItem(PIPE_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

export function toPipe(t: Target, status: PipeStatus = "queued"): PipeRow {
  return { ...t, status, note: "", added: new Date().toISOString() };
}
