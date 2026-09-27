import { COMMERCE, OPERATOR, WHO_FOR, payClose } from "./commerce";

export type Prey = "clinic" | "mat" | "school" | "harm" | "assoc";
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

export interface PipeRow extends Target {
  status: PipeStatus;
  note: string;
  added: string;
}

export const PREY_LABEL: Record<Prey, string> = {
  clinic: "Ketamine clinic",
  mat: "MAT / OTP",
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

/** Public orgs only — websites, not personal inboxes. Bundle is public. */
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
];

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

export function filterDirectory(prey: Prey | "all", range: Range | "all") {
  return DIRECTORY.filter((t) => (prey === "all" || t.prey === prey) && (range === "all" || t.range === range));
}

export function targetDm(t: Pick<Target, "name" | "city" | "hook">, price = COMMERCE.founding) {
  return [
    `I built FirstPass, an educational CYP450 teaching desk. ${t.hook}`,
    WHO_FOR,
    "",
    `Looked you up because of ${t.name} in ${t.city}.`,
    "",
    "Up to five-drug collision checks stay free so you can kick the tires.",
    `Founding license is $${price} once: host factors, metabolites, enzyme atlas, JSON/CSV export.`,
    payClose(price),
    `${OPERATOR.email} · ${OPERATOR.phone}`,
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

export function savePipe(rows: PipeRow[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PIPE_KEY, JSON.stringify(rows.slice(0, 80)));
}

export function toPipe(t: Target, status: PipeStatus = "queued"): PipeRow {
  return { ...t, status, note: "", added: new Date().toISOString() };
}
