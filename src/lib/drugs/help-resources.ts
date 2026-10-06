/**
 * Addiction / crisis resources, US-focused with state-level direct hotlines and harm reduction.
 *
 * Privacy contract: the location a person types is parsed in the browser and only
 * ever leaves the device inside a link they tap (it goes to that site's search).
 * It is never persisted and never sent to this app's server.
 *
 * Every number below is a public, official line and was checked against official
 * state or federal directories (SAMHSA, 988 Lifeline, Never Use Alone, Poison Help, State Agencies).
 * Numbers and hours change; the UI states this clearly and points to the official pages.
 */

export type LocationKind = "none" | "zip" | "place" | "invalid";

export interface ParsedLocation {
  kind: LocationKind;
  /** Cleaned text, safe to show and to put in a URL after encoding. */
  query: string;
  /** Five-digit ZIP when kind === "zip". */
  zip?: string;
  /** Two-letter US state code if detected. */
  stateCode?: string;
}

const MAX_LOCATION_LEN = 60;

export interface StateResource {
  code: string;
  name: string;
  helplineName: string;
  phone: string;
  tel: string;
  hours: string;
  website: string;
  naloxoneUrl?: string;
  textInfo?: string;
  description: string;
}

/** Comprehensive, verified state-level substance use access lines & programs across all 50 states + DC + PR. */
export const STATE_RESOURCES: readonly StateResource[] = [
  {
    code: "AL",
    name: "Alabama",
    helplineName: "Alabama Substance Use Crisis & Referral",
    phone: "1-844-307-1760",
    tel: "tel:18443071760",
    hours: "24/7 · Free & confidential",
    website: "https://mh.alabama.gov/substance-abuse-services/",
    naloxoneUrl: "https://nextdistro.org/alabama",
    description: "Alabama Department of Mental Health 24/7 connection to state-certified treatment providers, medical detox, and outpatient recovery services.",
  },
  {
    code: "AK",
    name: "Alaska",
    helplineName: "Alaska Careline & Substance Access",
    phone: "1-877-266-4357",
    tel: "tel:18772664357",
    hours: "24/7 · Free & confidential",
    website: "https://carelinealaska.com/",
    naloxoneUrl: "https://nextdistro.org/alaska",
    textInfo: "Text 4help to 839863 (Tues-Sat 3-11pm)",
    description: "Alaska's statewide crisis and addiction recovery line, linking rural and urban Alaskans to local village health clinics and regional treatment centers.",
  },
  {
    code: "AZ",
    name: "Arizona",
    helplineName: "Arizona Opioid Assistance & Referral (OAR) Line",
    phone: "1-888-688-4222",
    tel: "tel:18886884222",
    hours: "24/7 · Staffed by medical experts",
    website: "https://oarline.org/",
    naloxoneUrl: "https://nextdistro.org/arizona",
    description: "Operated by the Arizona Poison and Drug Information Centers; provides immediate clinical advice on buprenorphine induction, withdrawal management, and local referrals.",
  },
  {
    code: "AR",
    name: "Arkansas",
    helplineName: "Arkansas Substance Use Helpline",
    phone: "1-844-763-0198",
    tel: "tel:18447630198",
    hours: "24/7 · Free & confidential",
    website: "https://humanservices.arkansas.gov/",
    naloxoneUrl: "https://nextdistro.org/arkansas",
    description: "Arkansas Department of Human Services 24/7 referral line for state-funded inpatient detox, medication-assisted treatment, and recovery housing.",
  },
  {
    code: "CA",
    name: "California",
    helplineName: "California Substance Use Line / CA Bridge",
    phone: "1-800-855-2455",
    tel: "tel:18008552455",
    hours: "24/7 · Statewide access",
    website: "https://www.dhcs.ca.gov/individuals/Pages/MHR-SUD.aspx",
    naloxoneUrl: "https://nextdistro.org/california",
    description: "California Department of Health Care Services network and CA Bridge program providing 24/7 navigation to same-day buprenorphine, county clinics, and harm reduction.",
  },
  {
    code: "CO",
    name: "Colorado",
    helplineName: "Colorado Crisis Services / Substance Support",
    phone: "1-844-493-8255",
    tel: "tel:18444938255",
    hours: "24/7 · Call or text",
    website: "https://coloradocrisisservices.org/",
    naloxoneUrl: "https://nextdistro.org/colorado",
    textInfo: "Text TALK to 38255",
    description: "Walk-in crisis centers and 24/7 hotline providing addiction assessment, mobile crisis dispatch, and referrals to licensed Colorado recovery facilities.",
  },
  {
    code: "CT",
    name: "Connecticut",
    helplineName: "Connecticut DMHAS 24/7 Access Line",
    phone: "1-800-563-4086",
    tel: "tel:18005634086",
    hours: "24/7 · Immediate transportation available",
    website: "https://portal.ct.gov/dmhas",
    naloxoneUrl: "https://nextdistro.org/connecticut",
    description: "Connecticut Department of Mental Health and Addiction Services line with real-time bed placement and free state-arranged transportation to detox.",
  },
  {
    code: "DE",
    name: "Delaware",
    helplineName: "Delaware Hope Line (Help Is Here)",
    phone: "1-833-946-7333",
    tel: "tel:18339467333",
    hours: "24/7 · Free & confidential",
    website: "https://www.helpisherede.com/",
    naloxoneUrl: "https://nextdistro.org/delaware",
    description: "Single point of contact for Delawareans seeking substance use treatment, crisis intervention, residential detox, and family support.",
  },
  {
    code: "DC",
    name: "District of Columbia",
    helplineName: "DC Department of Behavioral Health Access Helpline",
    phone: "1-888-793-4357",
    tel: "tel:18887934357",
    hours: "24/7 · Free & confidential",
    website: "https://dbh.dc.gov/service/access-helpline",
    naloxoneUrl: "https://nextdistro.org/districtofcolumbia",
    description: "District of Columbia 24/7 entry point for addiction assessments, crisis mobile teams, same-day medication initiation, and Medicaid-covered detox.",
  },
  {
    code: "FL",
    name: "Florida",
    helplineName: "Florida Substance Abuse Referral (211 / Managing Entities)",
    phone: "1-800-662-4357",
    tel: "tel:18006624357",
    hours: "24/7 · Multilingual",
    website: "https://www.myflfamilies.com/services/substance-abuse",
    naloxoneUrl: "https://nextdistro.org/florida",
    description: "Coordinated network through Florida DCF and local Managing Entities connecting residents to state-funded detox beds, outpatient MAT, and crisis care.",
  },
  {
    code: "GA",
    name: "Georgia",
    helplineName: "Georgia Crisis & Access Line (GCAL)",
    phone: "1-800-715-4225",
    tel: "tel:18007154225",
    hours: "24/7 · App available",
    website: "https://www.mygcal.com/",
    naloxoneUrl: "https://nextdistro.org/georgia",
    textInfo: "My GCAL app available on iOS and Android",
    description: "Statewide routine and crisis referral service with direct mobile crisis dispatch and immediate placement into state-contracted detox and treatment beds.",
  },
  {
    code: "HI",
    name: "Hawaii",
    helplineName: "Hawaii CARES 988 / Substance Access",
    phone: "1-808-832-3100",
    tel: "tel:18088323100",
    hours: "24/7 · Local island coordination",
    website: "https://hicares.hawaii.gov/",
    naloxoneUrl: "https://nextdistro.org/hawaii",
    description: "Hawaii Coordinated Access Resource Entry System connecting individuals on Oahu and Neighbor Islands with localized treatment, detox, and peer mentors.",
  },
  {
    code: "ID",
    name: "Idaho",
    helplineName: "Idaho Substance Use Treatment Referral",
    phone: "1-800-922-3406",
    tel: "tel:18009223406",
    hours: "24/7 · Free & confidential",
    website: "https://healthandwelfare.idaho.gov/services-programs/behavioral-health",
    naloxoneUrl: "https://nextdistro.org/idaho",
    description: "Idaho Department of Health and Welfare behavioral health line for subsidized treatment authorization, regional recovery centers, and crisis support.",
  },
  {
    code: "IL",
    name: "Illinois",
    helplineName: "Illinois Helpline for Opioids & Other Substances",
    phone: "1-833-234-6343",
    tel: "tel:18332346343",
    hours: "24/7 · Confidential & multilingual",
    website: "https://helplineil.org/",
    naloxoneUrl: "https://nextdistro.org/illinois",
    textInfo: "Text HELP to 833234",
    description: "Illinois Department of Human Services helpline with trained specialists who navigate open treatment beds, MAT providers, and harm reduction programs.",
  },
  {
    code: "IN",
    name: "Indiana",
    helplineName: "Indiana 211 / Be Well Indiana",
    phone: "1-866-211-9966",
    tel: "tel:18662119966",
    hours: "24/7 · Dial 211 or 1-866-211-9966",
    website: "https://bewellindiana.com/",
    naloxoneUrl: "https://nextdistro.org/indiana",
    description: "Statewide navigation connecting Hoosiers directly to Community Mental Health Centers, state opioid treatment programs, and NaloxBox locations.",
  },
  {
    code: "IA",
    name: "Iowa",
    helplineName: "Your Life Iowa (Substance Use Access)",
    phone: "1-855-581-8111",
    tel: "tel:18555818111",
    hours: "24/7 · Call, text, or chat",
    website: "https://yourlifeiowa.org/",
    naloxoneUrl: "https://nextdistro.org/iowa",
    textInfo: "Text 855-895-8398",
    description: "Iowa Department of Health and Human Services 24/7 resource with live bed-availability tracking, local MAT clinics, and adolescent/adult recovery services.",
  },
  {
    code: "KS",
    name: "Kansas",
    helplineName: "Kansas Substance Use Disorder Help Line",
    phone: "1-866-645-8216",
    tel: "tel:18666458216",
    hours: "24/7 · Free & confidential",
    website: "https://www.kdads.ks.gov/",
    naloxoneUrl: "https://nextdistro.org/kansas",
    description: "Kansas Department for Aging and Disability Services line directing individuals to regional block-grant treatment programs and crisis stabilization.",
  },
  {
    code: "KY",
    name: "Kentucky",
    helplineName: "Kentucky Help for Addiction (KY STOP)",
    phone: "1-833-859-4357",
    tel: "tel:18338594357",
    hours: "24/7 · Call or text",
    website: "https://kystopoverdoses.ky.gov/",
    naloxoneUrl: "https://nextdistro.org/kentucky",
    description: "Kentucky statewide call center staffed by live specialists who verify insurance, locate open inpatient/outpatient beds, and coordinate transportation.",
  },
  {
    code: "LA",
    name: "Louisiana",
    helplineName: "Louisiana 24/7 Addiction & Mental Health Line",
    phone: "1-877-664-2248",
    tel: "tel:18776642248",
    hours: "24/7 · Free & confidential",
    website: "https://ldh.la.gov/page/behavioral-health",
    naloxoneUrl: "https://nextdistro.org/louisiana",
    description: "Louisiana Department of Health line linking residents to Human Services Districts, local Opioid Treatment Programs, and Medicaid-approved detox centers.",
  },
  {
    code: "ME",
    name: "Maine",
    helplineName: "Maine 211 / Maine Substance Use Help",
    phone: "1-866-811-5695",
    tel: "tel:18668115695",
    hours: "24/7 · Dial 211 or text your ZIP to 898211",
    website: "https://www.211maine.org/",
    naloxoneUrl: "https://nextdistro.org/maine",
    description: "Maine's dedicated directory for finding rapid-access buprenorphine providers, syringe service programs, and state-funded inpatient rehabilitation.",
  },
  {
    code: "MD",
    name: "Maryland",
    helplineName: "Maryland 211 Press 1 / Behavioral Health Line",
    phone: "1-800-422-0009",
    tel: "tel:18004220009",
    hours: "24/7 · Dial 211 and select option 1",
    website: "https://211md.org/special-programs/addiction/",
    naloxoneUrl: "https://nextdistro.org/maryland",
    textInfo: "Text your ZIP code to 898-211",
    description: "Partnership between 211 Maryland and the Maryland Department of Health providing crisis stabilization, overdose response resources, and local clinic intake.",
  },
  {
    code: "MA",
    name: "Massachusetts",
    helplineName: "Massachusetts Substance Use Helpline",
    phone: "1-800-327-5050",
    tel: "tel:18003275050",
    hours: "24/7 · Multilingual & anonymous",
    website: "https://helplineonline.com/",
    naloxoneUrl: "https://nextdistro.org/massachusetts",
    textInfo: "Text HOPE to 800327",
    description: "Official statewide public resource for finding substance use treatment and recovery services in Massachusetts with live insurance and bed-level filtering.",
  },
  {
    code: "MI",
    name: "Michigan",
    helplineName: "Michigan Substance Use Disorder Helpline",
    phone: "1-800-662-4357",
    tel: "tel:18006624357",
    hours: "24/7 · Free & confidential",
    website: "https://www.michigan.gov/mdhhs/keep-mi-healthy/mentalhealth/drugcontrol",
    naloxoneUrl: "https://nextdistro.org/michigan",
    description: "Michigan Department of Health and Human Services network connecting callers to Prepaid Inpatient Health Plans (PIHPs) for county-funded detox and treatment.",
  },
  {
    code: "MN",
    name: "Minnesota",
    helplineName: "Minnesota Fast-Tracker / Addiction Resource Line",
    phone: "1-800-462-5525",
    tel: "tel:18004625525",
    hours: "24/7 · Real-time availability",
    website: "https://www.fasttrackermn.org/",
    naloxoneUrl: "https://nextdistro.org/minnesota",
    description: "Real-time searchable directory and helpline identifying immediate open openings for medical detox, outpatient chemical dependency programs, and MAT.",
  },
  {
    code: "MS",
    name: "Mississippi",
    helplineName: "Mississippi DMH 24/7 Helpline",
    phone: "1-877-210-0402",
    tel: "tel:18772100402",
    hours: "24/7 · Free & confidential",
    website: "https://www.dmh.ms.gov/",
    naloxoneUrl: "https://nextdistro.org/mississippi",
    description: "Mississippi Department of Mental Health link to Community Mental Health Centers, state opioid treatment programs, and crisis intervention centers.",
  },
  {
    code: "MO",
    name: "Missouri",
    helplineName: "Missouri Access Crisis Intervention (ACI) Network",
    phone: "1-888-279-8188",
    tel: "tel:18882798188",
    hours: "24/7 · Statewide regional coverage",
    website: "https://dmh.mo.gov/behavioral-health/treatment-services/specialized-programs/substance-use",
    naloxoneUrl: "https://nextdistro.org/missouri",
    description: "Missouri Department of Mental Health regional access crisis network directing individuals to local certified treatment organizations and medical detox.",
  },
  {
    code: "MT",
    name: "Montana",
    helplineName: "Montana Substance Use & Crisis Line",
    phone: "1-877-603-4357",
    tel: "tel:18776034357",
    hours: "24/7 · Confidential",
    website: "https://dphhs.mt.gov/behavioralhealth/",
    naloxoneUrl: "https://nextdistro.org/montana",
    description: "Montana DPHHS connection to state-approved substance use providers, telehealth buprenorphine doctors, and tribal behavioral health programs.",
  },
  {
    code: "NE",
    name: "Nebraska",
    helplineName: "Nebraska Behavioral Health Helpline",
    phone: "1-888-866-8660",
    tel: "tel:18888668660",
    hours: "24/7 · Free & confidential",
    website: "https://dhhs.ne.gov/Pages/behavioral-health.aspx",
    naloxoneUrl: "https://nextdistro.org/nebraska",
    description: "Nebraska Department of Health and Human Services service linking callers to regional behavioral health authorities, social detox, and outpatient clinics.",
  },
  {
    code: "NV",
    name: "Nevada",
    helplineName: "Nevada 211 / Substance Abuse Resource Network",
    phone: "1-866-535-5654",
    tel: "tel:18665355654",
    hours: "24/7 · Dial 211 or 1-866-535-5654",
    website: "https://www.nevada211.org/",
    naloxoneUrl: "https://nextdistro.org/nevada",
    textInfo: "Text your ZIP code to 898211",
    description: "Statewide referral network coordinating public and private addiction treatment providers, SAPTA-certified programs, and mobile crisis teams.",
  },
  {
    code: "NH",
    name: "New Hampshire",
    helplineName: "New Hampshire The Doorway (24/7 Addiction Hub)",
    phone: "1-866-211-9966",
    tel: "tel:18662119966",
    hours: "24/7 · Dial 211 in NH",
    website: "https://www.thedoorway.nh.gov/",
    naloxoneUrl: "https://nextdistro.org/newhampshire",
    description: "New Hampshire's single-door entry system providing rapid evaluation, local medical treatment, recovery coaching, and free naloxone across 9 regional hubs.",
  },
  {
    code: "NJ",
    name: "New Jersey",
    helplineName: "New Jersey ReachNJ (24/7 Addiction Line)",
    phone: "1-844-732-2465",
    tel: "tel:18447322465",
    hours: "24/7 · Live operators regardless of insurance",
    website: "https://reachnj.gov/",
    naloxoneUrl: "https://nextdistro.org/newjersey",
    description: "Centralized state intake coordinating immediate detox placement, medication-assisted recovery, and residential facilities across New Jersey.",
  },
  {
    code: "NM",
    name: "New Mexico",
    helplineName: "New Mexico Crisis and Access Line (NMCAL)",
    phone: "1-855-662-7474",
    tel: "tel:18556627474",
    hours: "24/7 · Clinician-staffed",
    website: "https://nmcrisisline.com/",
    naloxoneUrl: "https://nextdistro.org/newmexico",
    description: "Statewide healthcare line staffed by licensed mental health clinicians connecting New Mexicans to community providers, detox, and peer recovery.",
  },
  {
    code: "NY",
    name: "New York",
    helplineName: "New York OASAS HOPEline",
    phone: "1-877-846-7369",
    tel: "tel:18778467369",
    hours: "24/7, 365 days · Multilingual",
    website: "https://oasas.ny.gov/hopeline",
    naloxoneUrl: "https://nextdistro.org/newyork",
    textInfo: "Text HOPENY to 467369",
    description: "New York State Office of Addiction Services and Supports 24/7 line with real-time bed dashboard access, outpatient clinics, and crisis detox centers.",
  },
  {
    code: "NC",
    name: "North Carolina",
    helplineName: "North Carolina Hope4NC & LME-MCO Crisis Lines",
    phone: "1-855-587-3463",
    tel: "tel:18555873463",
    hours: "24/7 · Free & confidential",
    website: "https://www.ncdhhs.gov/divisions/mental-health-developmental-disabilities-and-substance-use-services",
    naloxoneUrl: "https://nextdistro.org/northcarolina",
    description: "North Carolina Department of Health and Human Services network routing callers to their county LME/MCO management entity for subsidized care.",
  },
  {
    code: "ND",
    name: "North Dakota",
    helplineName: "North Dakota 211 / Free Substance Use Referral",
    phone: "1-800-472-2911",
    tel: "tel:18004722911",
    hours: "24/7 · Dial 211",
    website: "https://www.hhs.nd.gov/behavioral-health",
    naloxoneUrl: "https://nextdistro.org/northdakota",
    description: "Direct connection to North Dakota Human Service Centers, Free Through Recovery navigators, and licensed substance abuse clinics.",
  },
  {
    code: "OH",
    name: "Ohio",
    helplineName: "Ohio CareLine / OhioMHAS Treatment Line",
    phone: "1-800-720-9616",
    tel: "tel:18007209616",
    hours: "24/7 · Confidential",
    website: "https://mha.ohio.gov/",
    naloxoneUrl: "https://nextdistro.org/ohio",
    description: "Ohio Department of Mental Health and Addiction Services helpline staffed by credentialed clinicians coordinating local treatment and recovery housing.",
  },
  {
    code: "OK",
    name: "Oklahoma",
    helplineName: "Oklahoma 211 / Mental Health & Addiction Crisis",
    phone: "1-800-522-9054",
    tel: "tel:18005229054",
    hours: "24/7 · Dial 211 or 1-800-522-9054",
    website: "https://oklahoma.gov/odmhsas.html",
    naloxoneUrl: "https://nextdistro.org/oklahoma",
    description: "Oklahoma Department of Mental Health and Substance Abuse Services connection to Certified Community Behavioral Health Clinics (CCBHCs).",
  },
  {
    code: "OR",
    name: "Oregon",
    helplineName: "Lines for Life / Oregon Substance Use Helpline",
    phone: "1-800-923-4357",
    tel: "tel:18009234357",
    hours: "24/7 · Staffed by trained specialists",
    website: "https://www.linesforlife.org/",
    naloxoneUrl: "https://nextdistro.org/oregon",
    description: "Oregon's premier addiction referral line providing compassionate de-escalation, local county detox placement, and harm reduction navigation.",
  },
  {
    code: "PA",
    name: "Pennsylvania",
    helplineName: "Pennsylvania Get Help Now",
    phone: "1-800-662-4357",
    tel: "tel:18006624357",
    hours: "24/7 · Live chat available",
    website: "https://www.ddap.pa.gov/GetHelpNow/Pages/default.aspx",
    naloxoneUrl: "https://nextdistro.org/pennsylvania",
    textInfo: "Text 717-216-0905",
    description: "Pennsylvania Department of Drug and Alcohol Programs line connecting callers directly to Single County Authorities (SCAs) for immediate funding and detox intake.",
  },
  {
    code: "PR",
    name: "Puerto Rico",
    helplineName: "Puerto Rico ASSMCA Línea PAS",
    phone: "1-800-981-0023",
    tel: "tel:18009810023",
    hours: "24/7 · En español",
    website: "https://assmca.pr.gov/",
    naloxoneUrl: "https://nextdistro.org/puertorico",
    description: "Administración de Servicios de Salud Mental y Contra la Adicción (ASSMCA) línea de apoyo emocional, desintoxicación médica y tratamiento asistido por medicamentos.",
  },
  {
    code: "RI",
    name: "Rhode Island",
    helplineName: "Rhode Island BH Link (24/7 Crisis & Triage Hub)",
    phone: "1-401-414-5465",
    tel: "tel:14014145465",
    hours: "24/7 · Walk-in center & phone triage",
    website: "https://www.bhlink.org/",
    naloxoneUrl: "https://nextdistro.org/rhodeisland",
    description: "Comprehensive behavioral health facility and 24/7 hotline delivering immediate medical assessment, rapid buprenorphine access, and detox placement.",
  },
  {
    code: "SC",
    name: "South Carolina",
    helplineName: "South Carolina DAODAS / Addiction Helpline",
    phone: "1-800-922-1183",
    tel: "tel:18009221183",
    hours: "24/7 · Statewide coverage",
    website: "https://www.daodas.sc.gov/",
    naloxoneUrl: "https://nextdistro.org/southcarolina",
    description: "South Carolina Department of Alcohol and Other Drug Abuse Services connecting individuals to county authorities, inpatient facilities, and recovery courts.",
  },
  {
    code: "SD",
    name: "South Dakota",
    helplineName: "South Dakota 211 Helpline",
    phone: "1-800-920-4343",
    tel: "tel:18009204343",
    hours: "24/7 · Dial 211",
    website: "https://dss.sd.gov/behavioralhealth/community/",
    naloxoneUrl: "https://nextdistro.org/southdakota",
    description: "South Dakota Department of Social Services line guiding residents to accredited addiction counseling centers, medical detox, and state-funded programs.",
  },
  {
    code: "TN",
    name: "Tennessee",
    helplineName: "Tennessee REDLINE (Substance Use Referral)",
    phone: "1-800-889-9789",
    tel: "tel:18008899789",
    hours: "24/7 · Call or text",
    website: "https://www.tn.gov/behavioral-health/substance-abuse-services.html",
    naloxoneUrl: "https://nextdistro.org/tennessee",
    description: "Tennessee Department of Mental Health and Substance Abuse Services 24/7 resource coordinating county crisis centers, detox, and outpatient clinics.",
  },
  {
    code: "TX",
    name: "Texas",
    helplineName: "Texas OSAR (Outreach, Screening, Assessment & Referral)",
    phone: "1-877-541-7905",
    tel: "tel:18775417905",
    hours: "24/7 · Dial 211 option 6",
    website: "https://www.hhs.texas.gov/services/mental-health-substance-use",
    naloxoneUrl: "https://nextdistro.org/texas",
    description: "Texas Health and Human Services OSAR centers serve as the primary regional access points for state-funded substance use treatment, detox, and counseling.",
  },
  {
    code: "UT",
    name: "Utah",
    helplineName: "Utah Crisis Line / Huntsman Mental Health Institute",
    phone: "1-800-273-8255",
    tel: "tel:18002738255",
    hours: "24/7 · Statewide coordination",
    website: "https://healthcare.utah.edu/hmhi/programs/crisis-diversion",
    naloxoneUrl: "https://nextdistro.org/utah",
    description: "Huntsman Mental Health Institute statewide line coordinating Mobile Crisis Outreach Teams (MCOT), receiving centers, and specialized addiction clinics.",
  },
  {
    code: "VT",
    name: "Vermont",
    helplineName: "Vermont VT Helplink (Alcohol & Drug Solutions)",
    phone: "1-802-565-5465",
    tel: "tel:18025655465",
    hours: "24/7 · Free, confidential, non-judgmental",
    website: "https://vthelplink.org/",
    naloxoneUrl: "https://nextdistro.org/vermont",
    description: "Vermont Department of Health free statewide service linking callers to the Hub and Spoke system of comprehensive medication-assisted treatment.",
  },
  {
    code: "VA",
    name: "Virginia",
    helplineName: "Virginia DBHDS / CURA Addiction Services",
    phone: "1-800-552-7096",
    tel: "tel:18005527096",
    hours: "24/7 · Dial 211 in Virginia",
    website: "https://dbhds.virginia.gov/",
    naloxoneUrl: "https://nextdistro.org/virginia",
    description: "Virginia Department of Behavioral Health and Developmental Services line routing to Community Services Boards (CSBs) for immediate clinic access.",
  },
  {
    code: "WA",
    name: "Washington",
    helplineName: "Washington Recovery Help Line",
    phone: "1-866-789-1511",
    tel: "tel:18667891511",
    hours: "24/7, 365 days · Live operators",
    website: "https://www.warecoveryhelpline.org/",
    naloxoneUrl: "https://nextdistro.org/washington",
    description: "Washington State 24/7 service connecting callers to local substance use, mental health, and problem gambling resources with real-time bed tracking across WA.",
  },
  {
    code: "WV",
    name: "West Virginia",
    helplineName: "West Virginia HELP4WV (24/7 Recovery Network)",
    phone: "1-844-435-7498",
    tel: "tel:18444357498",
    hours: "24/7 · Call or text",
    website: "https://www.help4wv.com/",
    naloxoneUrl: "https://nextdistro.org/westvirginia",
    textInfo: "Text 1-844-435-7498",
    description: "West Virginia statewide program providing immediate confidential intervention, peer navigation, and transportation to detox and residential treatment.",
  },
  {
    code: "WI",
    name: "Wisconsin",
    helplineName: "Wisconsin Addiction Recovery Helpline",
    phone: "1-833-944-4673",
    tel: "tel:18339444673",
    hours: "24/7 · Dial 211 or 1-833-944-HOPE",
    website: "https://211wisconsin.org/addiction/",
    naloxoneUrl: "https://nextdistro.org/wisconsin",
    textInfo: "Text your ZIP code to 898211",
    description: "Statewide service funded by the Wisconsin Department of Health Services connecting callers with community-based treatment, recovery coaching, and harm reduction.",
  },
  {
    code: "WY",
    name: "Wyoming",
    helplineName: "Wyoming 211 / Behavioral Health Services",
    phone: "1-855-925-2273",
    tel: "tel:18559252273",
    hours: "24/7 · Dial 211 in WY",
    website: "https://wyoming211.org/",
    naloxoneUrl: "https://nextdistro.org/wyoming",
    description: "Wyoming Department of Health statewide resource connecting residents to local county mental health centers, crisis response, and outpatient care.",
  },
];

const STATE_BY_CODE = new Map<string, StateResource>(
  STATE_RESOURCES.map((s) => [s.code.toUpperCase(), s]),
);

const STATE_BY_NAME = new Map<string, StateResource>(
  STATE_RESOURCES.map((s) => [s.name.toLowerCase(), s]),
);

/** 5-digit ZIP prefix ranges mapping directly to US Postal codes. */
const ZIP_PREFIX_RANGES: ReadonlyArray<readonly [code: string, min: number, max: number]> = [
  ["AL", 35000, 36999],
  ["AK", 99500, 99999],
  ["AZ", 85000, 86599],
  ["AR", 71600, 72999],
  ["CA", 90000, 96199],
  ["CO", 80000, 81699],
  ["CT", 6000, 6999],
  ["DE", 19700, 19999],
  ["DC", 20000, 20599],
  ["FL", 32000, 34999],
  ["GA", 30000, 31999],
  ["GA", 39800, 39999],
  ["HI", 96700, 96899],
  ["ID", 83200, 83899],
  ["IL", 60000, 62999],
  ["IN", 46000, 47999],
  ["IA", 50000, 52899],
  ["KS", 66000, 67999],
  ["KY", 40000, 42799],
  ["LA", 70000, 71499],
  ["ME", 3900, 4999],
  ["MD", 20600, 21999],
  ["MA", 1000, 2799],
  ["MA", 5501, 5501],
  ["MI", 48000, 49999],
  ["MN", 55000, 56799],
  ["MS", 38600, 39799],
  ["MO", 63000, 65899],
  ["MT", 59000, 59999],
  ["NE", 68000, 69399],
  ["NV", 88900, 89899],
  ["NH", 3000, 3899],
  ["NJ", 7000, 8999],
  ["NM", 87000, 88499],
  ["NY", 10000, 14999],
  ["NY", 6390, 6390],
  ["NC", 27000, 28999],
  ["ND", 58000, 58899],
  ["OH", 43000, 45999],
  ["OK", 73000, 74999],
  ["OR", 97000, 97999],
  ["PA", 15000, 19699],
  ["PR", 600, 799],
  ["PR", 900, 999],
  ["RI", 2800, 2999],
  ["SC", 29000, 29999],
  ["SD", 57000, 57799],
  ["TN", 37000, 38599],
  ["TX", 75000, 79999],
  ["TX", 88500, 88599],
  ["UT", 84000, 84799],
  ["VT", 5000, 5999],
  ["VA", 20100, 20199],
  ["VA", 22000, 24699],
  ["WA", 98000, 99499],
  ["WV", 24700, 26899],
  ["WI", 53000, 54999],
  ["WY", 82000, 83199],
];

/** Resolves a US state by ZIP code number. */
export function stateFromZip(zip: string): StateResource | null {
  const n = parseInt(zip, 10);
  if (isNaN(n)) return null;
  for (const [code, min, max] of ZIP_PREFIX_RANGES) {
    if (n >= min && n <= max) {
      return STATE_BY_CODE.get(code) ?? null;
    }
  }
  return null;
}

/** Resolves a state from text (e.g. "Seattle, WA", "Texas", "Austin TX", "CA"). */
export function stateFromText(text: string): StateResource | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Direct 2-letter state code
  const upperCode = trimmed.toUpperCase();
  if (STATE_BY_CODE.has(upperCode)) {
    return STATE_BY_CODE.get(upperCode) ?? null;
  }

  // Comma or space separated suffix: e.g. "Seattle, WA" or "El Paso TX"
  const suffixMatch = /(?:,|\s)\s*([A-Za-z]{2})$/.exec(trimmed);
  if (suffixMatch) {
    const candidate = suffixMatch[1].toUpperCase();
    if (STATE_BY_CODE.has(candidate)) {
      return STATE_BY_CODE.get(candidate) ?? null;
    }
  }

  // Match full state name inside text
  const lower = trimmed.toLowerCase();
  for (const [name, resource] of STATE_BY_NAME.entries()) {
    if (lower.includes(name)) {
      return resource;
    }
  }

  return null;
}

/** Resolves a state from a ParsedLocation or raw string input. */
export function resolveState(input: ParsedLocation | string): StateResource | null {
  if (typeof input === "string") {
    const parsed = parseLocation(input);
    return resolveState(parsed);
  }
  if (input.kind === "zip" && input.zip) {
    return stateFromZip(input.zip);
  }
  if (input.kind === "place" && input.query) {
    return stateFromText(input.query);
  }
  return null;
}

/** Accepts `98101`, `98101-1234`, `Seattle, WA`, `El Paso TX`. */
export function parseLocation(raw: string): ParsedLocation {
  const cleaned = raw
    .replace(/[^A-Za-z0-9 ,.'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LOCATION_LEN)
    .trim();
  if (!cleaned) return { kind: "none", query: "" };
  const zip = /^(\d{5})(?:-\d{4})?$/.exec(cleaned);
  if (zip) {
    const st = stateFromZip(zip[1]);
    return { kind: "zip", query: zip[1], zip: zip[1], stateCode: st?.code };
  }
  // A place needs letters; bare digits that are not a ZIP are a typo, not a place.
  if (/[A-Za-z]{2}/.test(cleaned)) {
    const st = stateFromText(cleaned);
    return { kind: "place", query: cleaned, stateCode: st?.code };
  }
  return { kind: "invalid", query: cleaned };
}

export interface PhoneLine {
  id: string;
  name: string;
  /** What to say out loud / show on the button, e.g. "1-800-662-4357". */
  display: string;
  /** `tel:` href. */
  tel: string;
  hours: string;
  blurb: string;
  /** Official page that holds the current details. Omitted where there is none (911). */
  source?: string;
  sourceLabel?: string;
  /** Tone: emergency lines render with the danger color. */
  urgent?: boolean;
}

export const EMERGENCY_LINE: PhoneLine = {
  id: "911",
  name: "Emergency services",
  display: "911",
  tel: "tel:911",
  hours: "24/7",
  blurb:
    "Someone is unresponsive, barely breathing, blue or gray in the lips, having a seizure, or may be overdosing. Call first. Give naloxone if you have it.",
  urgent: true,
};

export const NATIONAL_LINES: readonly PhoneLine[] = [
  {
    id: "988",
    name: "988 Suicide & Crisis Lifeline",
    display: "988",
    tel: "tel:988",
    hours: "24/7 · call or text · chat online",
    blurb:
      "Free and confidential support for suicidal thoughts, emotional distress, or a substance use crisis. Press 2 for Spanish.",
    source: "https://988lifeline.org/",
    sourceLabel: "988lifeline.org",
  },
  {
    id: "samhsa",
    name: "SAMHSA National Helpline",
    display: "1-800-662-4357",
    tel: "tel:18006624357",
    hours: "24/7, 365 days · English and Spanish · TTY 1-800-487-4889",
    blurb:
      "Free, confidential treatment referral and information for substance use and mental health. You may be asked for a ZIP code to find local options. It is not a crisis line.",
    source: "https://www.samhsa.gov/find-help/helplines/national-helpline",
    sourceLabel: "samhsa.gov helpline",
  },
  {
    id: "poison",
    name: "Poison Help (Poison Control)",
    display: "1-800-222-1222",
    tel: "tel:18002221222",
    hours: "24/7",
    blurb:
      "Free expert advice after a possible poisoning, a swallowed dose, or a mix of substances. Do not wait for symptoms. If the person is unresponsive, call 911 instead.",
    source: "https://www.poisonhelp.org/",
    sourceLabel: "poisonhelp.org",
  },
  {
    id: "nua",
    name: "Never Use Alone",
    display: "1-800-484-3731",
    tel: "tel:18004843731",
    hours: "24/7",
    blurb:
      "Call before you use. A peer stays on the line, and if you stop responding they send emergency help to your location. Not a treatment line.",
    source: "https://neverusealone.com/",
    sourceLabel: "neverusealone.com",
  },
];

export interface HelpLink {
  id: string;
  group: "treatment" | "text" | "meetings" | "naloxone" | "local";
  title: string;
  blurb: string;
  href: string;
  /** Button text. */
  action: string;
  /** True when the link opens already searching the person's location. */
  prefilled: boolean;
}

/** Search this on the FindTreatment.gov locator (SAMHSA). Accepts a ZIP or "City, ST". */
export function findTreatmentUrl(loc: ParsedLocation): string {
  if (loc.kind !== "zip" && loc.kind !== "place") return "https://findtreatment.gov/locator";
  return `https://findtreatment.gov/locator?sAddr=${encodeURIComponent(loc.query)}`;
}

/** `sms:` link that pre-fills the ZIP for SAMHSA's HELP4U text line. ZIP only. */
export function help4uSmsHref(zip: string): string {
  return `sms:435748?&body=${encodeURIComponent(zip)}`;
}

/**
 * Local-finding links. Only FindTreatment and HELP4U can use the typed location;
 * the rest are the official finders for each kind of help and say so (`prefilled`).
 */
export function localLinks(loc: ParsedLocation): HelpLink[] {
  const where =
    loc.kind === "zip" || loc.kind === "place" ? ` near ${loc.query}` : "";
  const links: HelpLink[] = [
    {
      id: "findtreatment",
      group: "treatment",
      title: "Treatment programs" + where,
      blurb:
        "SAMHSA's FindTreatment.gov lists licensed substance use and mental health facilities, with filters for payment, medication (buprenorphine, methadone, naltrexone), and telehealth.",
      href: findTreatmentUrl(loc),
      action: "Open FindTreatment.gov",
      prefilled: loc.kind === "zip" || loc.kind === "place",
    },
  ];
  if (loc.kind === "zip" && loc.zip) {
    links.push({
      id: "help4u",
      group: "text",
      title: `Text ${loc.zip} to 435748`,
      blurb:
        "SAMHSA's HELP4U text line replies with local treatment information. English only. Message and data rates may apply. Reply STOP to cancel.",
      href: help4uSmsHref(loc.zip),
      action: "Open text message",
      prefilled: true,
    });
  }
  links.push(
    {
      id: "otp",
      group: "treatment",
      title: "Methadone and buprenorphine clinics",
      blurb:
        "SAMHSA's directory of certified opioid treatment programs. Pick your state to see clinics, phone numbers, and which medications each dispenses.",
      href: "https://dpt2.samhsa.gov/treatment/directory.aspx",
      action: "Open OTP directory",
      prefilled: false,
    },
    {
      id: "211",
      group: "local",
      title: "Local help with food, housing, and rides",
      blurb:
        "Dial 211 (or search by ZIP on 211.org) for local referrals: shelters, transportation to appointments, and programs that take no insurance.",
      href: "tel:211",
      action: "Call 211",
      prefilled: false,
    },
    {
      id: "naloxone",
      group: "naloxone",
      title: "Free naloxone (Narcan)",
      blurb:
        "Naloxone nasal spray is sold over the counter at most pharmacies. NEXT Distro mails it free in many states, and many harm reduction programs hand it out.",
      href: "https://nextdistro.org/",
      action: "Open NEXT Distro",
      prefilled: false,
    },
    {
      id: "harm-reduction",
      group: "local",
      title: "Harm reduction programs",
      blurb:
        "Syringe services, drug checking, safer-use supplies, and non-judgmental support without a requirement to stop using.",
      href: "https://harmreduction.org/resource-center/harm-reduction-near-you/",
      action: "Find a program",
      prefilled: false,
    },
    {
      id: "aa",
      group: "meetings",
      title: "Alcoholics Anonymous",
      blurb: "Find in-person and online meetings by location.",
      href: "https://www.aa.org/find-aa",
      action: "Find AA meetings",
      prefilled: false,
    },
    {
      id: "na",
      group: "meetings",
      title: "Narcotics Anonymous",
      blurb: "Find in-person and online meetings by location.",
      href: "https://www.na.org/meetingsearch/",
      action: "Find NA meetings",
      prefilled: false,
    },
    {
      id: "smart",
      group: "meetings",
      title: "SMART Recovery",
      blurb:
        "Science-based, non-12-step groups. Many meet online, and they welcome people on medications for addiction.",
      href: "https://meetings.smartrecovery.org/meetings/",
      action: "Find SMART meetings",
      prefilled: false,
    },
    {
      id: "alanon",
      group: "meetings",
      title: "Al-Anon (for family and friends)",
      blurb: "Support for people affected by someone else's drinking or drug use.",
      href: "https://al-anon.org/al-anon-meetings/find-an-al-anon-meeting/",
      action: "Find Al-Anon meetings",
      prefilled: false,
    },
  );
  return links;
}

/** Educational comparison of Medication for Opioid Use Disorder (MOUD) and Alcohol Use Disorder (MAUD). */
export interface MedicationOption {
  id: string;
  name: string;
  type: string;
  howItWorks: string;
  setting: string;
  pearls: string;
}

export const MEDICATION_OPTIONS: readonly MedicationOption[] = [
  {
    id: "buprenorphine",
    name: "Buprenorphine (Suboxone, Subutex)",
    type: "Partial μ-opioid agonist + naloxone",
    howItWorks: "Binds tightly to opioid receptors, eliminating cravings and withdrawal with a ceiling effect that prevents fatal respiratory depression.",
    setting: "Any doctor, NP, or PA can prescribe it under the federal MAT Act. Pick up at your local pharmacy.",
    pearls: "Wait until mild-to-moderate withdrawal before starting the first dose to prevent precipitated withdrawal, or use micro-induction (Bernese method) under clinical guidance.",
  },
  {
    id: "injectable-bup",
    name: "Injectable Buprenorphine (Sublocade, Brixadi)",
    type: "Extended-release partial agonist",
    howItWorks: "Subcutaneous depot releases steady buprenorphine over 1 month or 1 week, eliminating daily dosing peaks and troughs.",
    setting: "Administered in a clinic by a healthcare provider once monthly or weekly.",
    pearls: "No daily pills or films to carry; zero risk of losing a prescription or pharmacy refill delays. Smooth steady state protects against street supply surges.",
  },
  {
    id: "methadone",
    name: "Methadone",
    type: "Full μ-opioid agonist",
    howItWorks: "Full agonist with long half-life (24–36 hours) that stops withdrawal and blocks the euphoria of illicit opioids.",
    setting: "Dispensed at certified Opioid Treatment Programs (OTPs), transitioning to take-home doses as treatment stabilizes.",
    pearls: "Often the most effective option for individuals with high fentanyl or nitazene tolerance where partial agonists feel insufficient. No withdrawal wait required to start.",
  },
  {
    id: "naltrexone",
    name: "Naltrexone (Vivitrol injection or oral)",
    type: "Opioid antagonist (blocker)",
    howItWorks: "Blocks opioid receptors completely so opioids cannot bind. Also reduces the neurochemical reward of alcohol in Alcohol Use Disorder.",
    setting: "Monthly intramuscular injection in a clinic, or once-daily oral tablet.",
    pearls: "CRITICAL: Requires 7–14 days of complete opioid abstinence before starting. Taking naltrexone while opioids are in your system causes severe precipitated withdrawal. Highly effective for alcohol.",
  },
  {
    id: "medical-detox",
    name: "Medical Detoxification (Withdrawal Management)",
    type: "Acute clinical stabilization",
    howItWorks: "Physician-supervised inpatient or residential care using supportive medications to safely manage physical withdrawal.",
    setting: "Specialized hospital unit or licensed standalone detox center (typically 3–7 days).",
    pearls: "Essential for severe alcohol withdrawal (to prevent seizures and delirium tremens) and high-dose benzodiazepines. For opioids, detox should ALWAYS transition directly onto MOUD (buprenorphine/methadone).",
  },
];

/** Fentanyl and Xylazine overdose response protocol. */
export const STREET_SAFETY_PROTOCOL = [
  {
    step: "1. Recognize the signs",
    action: "Unresponsive to verbal or physical stimuli (sternal rub), slow or stopped breathing, snoring/gurgling sounds, blue or ashen lips/fingertips, pinpoint pupils.",
  },
  {
    step: "2. Administer Naloxone (Narcan)",
    action: "Spray 1 dose (4 mg) into one nostril. If no response within 2 to 3 minutes, give a second dose in the opposite nostril. Naloxone only reverses opioids (fentanyl, heroin, oxycodone).",
  },
  {
    step: "3. Rescue breathing for Xylazine (Tranq)",
    action: "Xylazine is a non-opioid sedative (alpha-2 agonist) and is NOT reversed by naloxone. If the person has received naloxone but is still not breathing adequately, provide rescue breathing (1 breath every 5 seconds) until paramedics arrive.",
  },
  {
    step: "4. Recovery position",
    action: "If breathing restarts or while waiting for help, turn the person onto their side with their top knee bent to keep their airway open and prevent choking if they vomit.",
  },
] as const;

export const OUTSIDE_US = {
  title: "Outside the United States",
  blurb:
    "Call your local emergency number first in an emergency. For a directory of free, verified helplines by country, use Find a Helpline.",
  href: "https://findahelpline.com/",
  action: "Open Find a Helpline",
} as const;

/** Plain-text handout a clinician can paste into a visit summary. */
export function handoutText(loc: ParsedLocation): string {
  const lines: string[] = [
    "Addiction & Crisis Resources — Free and Confidential",
    "",
    "In an emergency (not breathing, unresponsive, possible overdose): call 911. Give naloxone (Narcan) if you have it.",
    "",
  ];

  const state = resolveState(loc);
  if (state) {
    lines.push(`State Access Line (${state.name}):`);
    lines.push(`${state.helplineName}: ${state.phone} (${state.hours})`);
    if (state.textInfo) lines.push(state.textInfo);
    lines.push(`Website: ${state.website}`);
    if (state.naloxoneUrl) lines.push(`Free mail-order naloxone: ${state.naloxoneUrl}`);
    lines.push("");
  }

  lines.push("National Helplines:");
  for (const l of NATIONAL_LINES) {
    lines.push(`${l.name}: ${l.display} (${l.hours.split(" · ")[0]})`);
  }
  lines.push("");

  if (loc.kind === "zip" || loc.kind === "place") {
    lines.push(`Find licensed treatment near ${loc.query}: ${findTreatmentUrl(loc)}`);
  } else {
    lines.push(`Find licensed treatment: ${findTreatmentUrl(loc)}`);
  }
  if (loc.kind === "zip" && loc.zip) {
    lines.push(`Text your ZIP (${loc.zip}) to 435748 for local treatment options via SAMHSA HELP4U.`);
  }

  lines.push(
    "SAMHSA Certified Opioid Treatment Programs (Methadone/Buprenorphine): https://dpt2.samhsa.gov/treatment/directory.aspx",
    "Local social services, shelters, and medical rides: Dial 211 (or visit 211.org)",
    "Never Use Alone (peer overdose monitoring): 1-800-484-3731 (neverusealone.com)",
    "",
    "Numbers and hours can change; check the organization's own site. This handout is general information, not medical advice.",
  );
  return lines.join("\n");
}
