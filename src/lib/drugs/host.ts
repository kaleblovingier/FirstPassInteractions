import type { CannabisRoute, Drug, EnzymeRole, HostContext, KetamineRoute } from "./types";

export const SMOKE: Drug = {
  id: "__smoke",
  name: "Tobacco smoke (PAH)",
  brands: [],
  cls: "Combustion CYP1A2 inducer",
  aliases: ["smoking", "cigarettes", "pah"],
  enzymes: [{ enzyme: "CYP1A2", kind: "inducer", strength: "strong" }],
  pd: [],
  toxicityHint: "Loss of 1A2-victim efficacy while smoking; rebound toxicity on cessation",
  note: "Polycyclic aromatic hydrocarbons induce CYP1A2. Nicotine itself is not the inducer.",
  kind: "food",
};

export const CHRONIC_ETOH: Drug = {
  id: "__etoh-chronic",
  name: "Chronic alcohol (CYP2E1)",
  brands: [],
  cls: "Lifestyle CYP2E1 inducer",
  aliases: ["chronic drinking"],
  enzymes: [{ enzyme: "CYP2E1", kind: "inducer", strength: "strong" }],
  pd: [],
  toxicityHint: "Induced 2E1 — more NAPQI from acetaminophen, faster 2E1-victim clearance",
  note: "Chronic daily drinking induces CYP2E1. Acute intoxication is a different story (CNS + 2E1 occupancy).",
  kind: "food",
};

export const HOST_ETOH_CNS: Drug = {
  id: "__etoh-cns",
  name: "Alcohol (host pattern)",
  brands: [],
  cls: "Host CNS depressant",
  aliases: ["drinking", "host alcohol"],
  enzymes: [],
  pd: ["alcohol", "cns-depressant", "seizure-lowering"],
  toxicityHint: "Respiratory depression with other CNS drugs, cocaethylene with cocaine",
  note: "Host-factor alcohol — the pattern on the desk, not a pour. Stacks as ethanol for PD.",
  kind: "food",
};

export const FIRST_PASS_NMDA = [
  "ketamine",
  "esketamine",
  "two-fdck",
  "mxe",
  "dck",
  "three-meo-pcp",
] as const;

export const FIRST_PASS_CANNABINOIDS = [
  "dronabinol",
  "hhc",
  "hhc-p",
  "hhc-o",
  "ten-oh-hhc",
] as const;

export const FIRST_PASS_CANNABINOID_SET: Set<string> = new Set<string>(
  FIRST_PASS_CANNABINOIDS,
);

export type ThcRoute = CannabisRoute | "inhaled";

function retargetKetamine(drug: Drug, route: KetamineRoute): Drug {
  if (!(FIRST_PASS_NMDA as readonly string[]).includes(drug.id)) return drug;
  const enzymes: EnzymeRole[] = drug.enzymes.filter((e) => e.enzyme !== "CYP3A4" && e.enzyme !== "CYP2B6");
  if (route === "oral") {
    enzymes.push(
      { enzyme: "CYP2B6", kind: "substrate", sensitivity: "major", pathway: "clearance" },
      { enzyme: "CYP3A4", kind: "substrate", sensitivity: "sensitive", pathway: "clearance" },
    );
  } else if (route === "in") {
    enzymes.push(
      { enzyme: "CYP2B6", kind: "substrate", sensitivity: "major", pathway: "clearance" },
      { enzyme: "CYP3A4", kind: "substrate", sensitivity: "major", pathway: "clearance" },
    );
  } else {
    enzymes.push(
      { enzyme: "CYP2B6", kind: "substrate", sensitivity: "major", pathway: "clearance" },
      { enzyme: "CYP3A4", kind: "substrate", sensitivity: "minor", pathway: "clearance" },
    );
  }
  const routeNote =
    route === "oral"
      ? "Oral dosing sees extensive 3A4/2B6 first-pass; 3A4 inhibitors raise exposure far more than IV."
      : route === "in"
        ? "Intranasal esketamine still hits hepatic 2B6/3A4, with less first-pass than oral."
        : "IV/IM bypasses gut 3A4 first-pass; hepatic CYP2B6 remains the main clearance step.";
  return { ...drug, enzymes, note: routeNote };
}

export function retargetThc(drug: Drug, route: ThcRoute): Drug {
  if (!FIRST_PASS_CANNABINOID_SET.has(drug.id)) return drug;
  if (drug.id === "dronabinol") {
    const enzymes: EnzymeRole[] =
      route === "oral"
        ? [
            { enzyme: "CYP2C9", kind: "substrate", sensitivity: "sensitive", pathway: "clearance" },
            { enzyme: "CYP3A4", kind: "substrate", sensitivity: "major", pathway: "clearance" },
          ]
        : [
            { enzyme: "CYP2C9", kind: "substrate", sensitivity: "minor", pathway: "clearance" },
            { enzyme: "CYP3A4", kind: "substrate", sensitivity: "minor", pathway: "clearance" },
          ];
    return {
      ...drug,
      enzymes,
      note:
        route === "oral"
          ? "Edible first-pass makes 11-OH-THC, which is more psychoactive than parent. CYP2C9/3A4 inhibitors stretch it."
          : "Smoked THC mostly skips 11-OH-THC first-pass. Hepatic 2C9/3A4 still clear parent, but the edible trap is quieter.",
    };
  }
  if (route === "oral") return drug;
  const enzymes: EnzymeRole[] = drug.enzymes.map((e) =>
    e.kind === "substrate" && (e.enzyme === "CYP2C9" || e.enzyme === "CYP3A4") && e.sensitivity === "major"
      ? { ...e, sensitivity: "minor" }
      : e,
  );
  const routeNote =
    drug.id === "hhc-o"
      ? "Inhaled / vaped route selected: bypasses presystemic hepatic first-pass extraction AND carries critical thermal pyrolysis hazard — heating O-acetylated cannabinoids (HHC acetate / HHC-O) generates toxic ketene gas linked to acute inhalational lung injury."
      : "Inhaled / vaped route selected: bypasses presystemic portal hepatic first-pass extraction, producing rapid peak brain CB1 delivery and reducing first-pass CYP2C9/CYP3A4 interaction amplitude compared with oral edibles.";
  return {
    ...drug,
    enzymes,
    note: drug.note ? `${drug.note} ${routeNote}` : routeNote,
  };
}

export function applyHost(
  drugs: Drug[],
  host: HostContext & { thcRoute?: ThcRoute },
): Drug[] {
  const thcRoute: ThcRoute = host.thcRoute ?? host.cannabisRoute;
  const mapped = drugs.map((d) => retargetThc(retargetKetamine(d, host.ketamineRoute), thcRoute));
  const extra: Drug[] = [];
  if (host.smoking) extra.push(SMOKE);
  if (host.alcohol === "chronic") extra.push(CHRONIC_ETOH);
  if (host.alcohol !== "off" && !drugs.some((d) => d.id === "ethanol")) extra.push(HOST_ETOH_CNS);
  return extra.length ? [...mapped, ...extra] : mapped;
}

export function isVirtual(id: string) {
  return id.startsWith("__");
}

export const WASHOUT: Array<{ ids: string[]; days: number; label: string }> = [
  {
    ids: ["fluoxetine"],
    days: 35,
    label:
      "Norfluoxetine keeps CYP2D6 blocked for ~5 weeks after the last dose. Stopping yesterday does not clear the interaction.",
  },
  {
    ids: ["phenelzine", "tranylcypromine", "isocarboxazid"],
    days: 14,
    label:
      "Irreversible MAOIs need a 14-day washout before a serotonergic, stimulant, or entactogen. Linezolid is an MAOI too.",
  },
  {
    ids: ["moclobemide", "harmaline"],
    days: 1,
    label:
      "Reversible MAO-A (moclobemide, harmala alkaloids) washes out faster (~24 h) but is still contraindicated with MDMA and DMT.",
  },
  {
    ids: ["amiodarone"],
    days: 28,
    label:
      "Amiodarone inhibition (2C9, 3A4, 2D6, 1A2, P-gp) lingers for weeks after the last dose. The half-life is measured in tens of days.",
  },
  {
    ids: ["rifampin", "carbamazepine", "phenobarbital", "primidone", "st-johns-wort"],
    days: 14,
    label:
      "Strong inducers take 1–2 weeks to wash in and about as long to wash out. Stopping yesterday does not restore oral ketamine, OCPs, or methadone.",
  },
  {
    ids: ["efavirenz"],
    days: 14,
    label:
      "Efavirenz 3A4/2B6 induction is not gone the morning after the last dose. Methadone withdrawal can lag a week either direction.",
  },
  {
    ids: ["bupropion"],
    days: 7,
    label:
      "Bupropion and hydroxybupropion keep CYP2D6 blocked for about a week after the last dose.",
  },
];

/**
 * Additional perpetrator washout reference clocks surfaced in the desk's
 * "How long it lingers" teaching panel via `washoutsFor()` without inflating
 * unrelated two-drug pair grades in `engine.ts`.
 */
export const EXTENDED_WASHOUT: Array<{ ids: string[]; days: number; label: string }> = [
  {
    ids: ["phenytoin"],
    days: 14,
    label:
      "Phenytoin activates CAR and PXR; elevated CYP3A4/2C9/2B6 clearance persists roughly 1–2 weeks after stopping.",
  },
  {
    ids: ["apalutamide", "enzalutamide"],
    days: 28,
    label:
      "Strong oncology PXR inducers combine multi-day active metabolite half-lives with slow CYP3A4/2C9/2C19 enzyme turnover; de-induction persists roughly a full month after stopping.",
  },
  {
    ids: ["modafinil", "armodafinil"],
    days: 28,
    label:
      "Moderate CYP3A4 induction outlasts plasma clearance; labeling specifies backup contraception during therapy and for one month after the final dose.",
  },
  {
    ids: ["terbinafine"],
    days: 14,
    label:
      "Lipophilic tissue depots keep CYP2D6 suppressed for weeks after an oral terbinafine course finishes, prolonging TCA, beta-blocker, and prodrug interactions.",
  },
  {
    ids: ["paroxetine", "ritonavir", "cobicistat", "clarithromycin", "grapefruit"],
    days: 5,
    label:
      "Mechanism-based CYP inactivators destroy active enzyme molecules; clearance does not recover until enterocytes and hepatocytes synthesize replacement protein over 3–7 days.",
  },
];

export function washoutsFor(ids: string[]) {
  const set = new Set(ids);
  return [...WASHOUT, ...EXTENDED_WASHOUT].filter((w) => w.ids.some((id) => set.has(id)));
}
