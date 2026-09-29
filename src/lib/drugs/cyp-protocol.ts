/**
 * CYP450 safety clocks — FDA DDI grades, start vs stop, TDI linger, induction lag.
 * Teaching. Not a dose, not a hold, not an order. The Prescribing Information is the authority.
 *
 * Grades paraphrase FDA Clinical Drug Interaction Studies (Jan 2020) / Huang CPT 2007.
 * Index lists paraphrase FDA Table of Substrates, Inhibitors and Inducers.
 */

import { DRUG_BY_ID } from "./catalog";
import { isVirtual } from "./host";
import type { Enzyme, Finding, Severity, Strength } from "./types";

export type PerpKind = "inhibitor" | "inducer";
export type ClockKind = "reversible" | "tdi" | "induction";
export type Tone = "ok" | "warn" | "danger";

export const FDA_DDI_TABLE =
  "https://www.fda.gov/drugs/drug-interactions-labeling/drug-development-and-drug-interactions-table-substrates-inhibitors-and-inducers";

export const FDA_DDI_GUIDANCE =
  "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/in-vitro-drug-interaction-studies-cytochrome-p450-enzyme-and-transporter-mediated-drug-interactions";

export const FDA_GRADES: Record<
  PerpKind,
  Record<Strength, { label: string; fold: string }>
> = {
  inhibitor: {
    strong: { label: "Strong inhibitor", fold: "≥5-fold ↑ AUC of a sensitive index substrate" },
    moderate: { label: "Moderate inhibitor", fold: "≥2 to <5-fold ↑ AUC" },
    weak: { label: "Weak inhibitor", fold: "≥1.25 to <2-fold ↑ AUC" },
  },
  inducer: {
    strong: { label: "Strong inducer", fold: "≥80% ↓ AUC of a sensitive index substrate" },
    moderate: { label: "Moderate inducer", fold: "≥50 to <80% ↓ AUC" },
    weak: { label: "Weak inducer", fold: "≥20 to <50% ↓ AUC" },
  },
};

/** Mechanism-based / time-dependent inactivation — new enzyme must be synthesized. */
export const TDI: Record<
  string,
  { enzymes: Enzyme[]; resynth: string; pearl: string }
> = {
  clarithromycin: {
    enzymes: ["CYP3A4"],
    resynth: "intestinal 3A4 ~24–72 h; hepatic longer",
    pearl: "Macrolide MIC. Stopping yesterday does not restore oral midazolam, simvastatin, or a lozenge.",
  },
  erythromycin: {
    enzymes: ["CYP3A4"],
    resynth: "intestinal 3A4 ~24–72 h",
    pearl: "Weaker than clarithromycin, still time-dependent. QT is the other card.",
  },
  ritonavir: {
    enzymes: ["CYP3A4"],
    resynth: "days — booster occupancy plus inactivation",
    pearl: "The 3A4 knockout outlasts the last Norvir. Methadone is the mixed-arrow exception.",
  },
  paxlovid: {
    enzymes: ["CYP3A4"],
    resynth: "days after the five-day course",
    pearl: "Ritonavir is the clock. Fentanyl parent climbs; methadone often falls. Two arrows, one booster.",
  },
  grapefruit: {
    enzymes: ["CYP3A4"],
    resynth: "intestinal 3A4 24–72 h",
    pearl: "Bergamottin destroys gut 3A4. Yesterday’s glass still raises oral victims. IV is largely spared.",
  },
  paroxetine: {
    enzymes: ["CYP2D6"],
    resynth: "~3–7 days after the last dose",
    pearl: "Mechanism-based 2D6 inactivation. A NM on Paxil is a phenotypic PM until the enzyme is new.",
  },
  fluoxetine: {
    enzymes: ["CYP2D6"],
    resynth: "norfluoxetine ~5 weeks",
    pearl: "Stopping Prozac yesterday does not unlock 2D6. Codeine, tamoxifen, and DXM stay phenoconverted.",
  },
  bupropion: {
    enzymes: ["CYP2D6"],
    resynth: "hydroxybupropion ~1 week",
    pearl: "Wellbutrin and its metabolite keep 2D6 blocked after the last tablet.",
  },
  amiodarone: {
    enzymes: ["CYP2C9", "CYP3A4", "CYP2D6", "CYP1A2", "P-gp"],
    resynth: "weeks — t½ measured in tens of days",
    pearl: "The 2C9 warfarin climb is week three, not overnight. Stopping does not clear it.",
  },
  mdma: {
    enzymes: ["CYP2D6"],
    resynth: "days after a single exposure",
    pearl: "Auto-inactivation after the first pass. The second dose is not the first.",
  },
  gemfibrozil: {
    enzymes: ["CYP2C8"],
    resynth: "days — glucuronide TDI of 2C8",
    pearl: "Lopid is the index 2C8 knockout. Repaglinide and pioglitazone are the victims.",
  },
  diltiazem: {
    enzymes: ["CYP3A4"],
    resynth: "days — N-desmethyl metabolite inactivates 3A4",
    pearl: "Moderate on paper, time-dependent in the liver. Oral 3A4 victims still climb.",
  },
  verapamil: {
    enzymes: ["CYP3A4"],
    resynth: "days — norverapamil MIC",
    pearl: "Same neighborhood as diltiazem. P-gp travels with 3A4.",
  },
};

export const INDUCTION = {
  washIn: "Transcriptional. Often starts day 3–5, full by ~7 days on rifampin, 1–2 weeks on many others.",
  washOut:
    "Enzyme stays high ~1–2 weeks after the last dose. Victim levels rebound as induction dissipates. Stopping is the dangerous half.",
};

const RANK: Record<Strength, number> = { strong: 3, moderate: 2, weak: 1 };

export interface FdaIndexHit {
  id: string;
  name: string;
  enzyme: Enzyme;
  role: "substrate" | "inhibitor" | "inducer";
  grade: string;
}

/** FDA example / index lists — only IDs that live on this desk. */
const INDEX: FdaIndexHit[] = [
  // 3A sensitive substrates
  i("midazolam", "CYP3A4", "substrate", "sensitive index"),
  i("buspirone", "CYP3A4", "substrate", "sensitive"),
  i("simvastatin", "CYP3A4", "substrate", "sensitive"),
  i("lovastatin", "CYP3A4", "substrate", "sensitive"),
  i("felodipine", "CYP3A4", "substrate", "sensitive"),
  i("budesonide", "CYP3A4", "substrate", "sensitive (oral)"),
  i("eplerenone", "CYP3A4", "substrate", "sensitive"),
  i("sildenafil", "CYP3A4", "substrate", "sensitive"),
  // 3A strong inhibitors
  i("clarithromycin", "CYP3A4", "inhibitor", "strong · TDI"),
  i("ketoconazole", "CYP3A4", "inhibitor", "strong index"),
  i("itraconazole", "CYP3A4", "inhibitor", "strong index"),
  i("voriconazole", "CYP3A4", "inhibitor", "strong"),
  i("ritonavir", "CYP3A4", "inhibitor", "strong · TDI"),
  i("paxlovid", "CYP3A4", "inhibitor", "strong · TDI"),
  i("cobicistat", "CYP3A4", "inhibitor", "strong"),
  i("grapefruit", "CYP3A4", "inhibitor", "moderate intestinal · TDI"),
  // 3A moderate inhibitors
  i("erythromycin", "CYP3A4", "inhibitor", "moderate · TDI"),
  i("fluconazole", "CYP3A4", "inhibitor", "moderate"),
  i("diltiazem", "CYP3A4", "inhibitor", "moderate · TDI"),
  i("verapamil", "CYP3A4", "inhibitor", "moderate · TDI"),
  i("ciprofloxacin", "CYP3A4", "inhibitor", "moderate"),
  // 3A inducers
  i("rifampin", "CYP3A4", "inducer", "strong index"),
  i("carbamazepine", "CYP3A4", "inducer", "strong"),
  i("phenytoin", "CYP3A4", "inducer", "strong"),
  i("phenobarbital", "CYP3A4", "inducer", "moderate"),
  i("st-johns-wort", "CYP3A4", "inducer", "strong"),
  i("efavirenz", "CYP3A4", "inducer", "moderate"),
  // 2D6
  i("dextromethorphan", "CYP2D6", "substrate", "sensitive index"),
  i("metoprolol", "CYP2D6", "substrate", "sensitive"),
  i("nortriptyline", "CYP2D6", "substrate", "sensitive"),
  i("codeine", "CYP2D6", "substrate", "activation"),
  i("tramadol", "CYP2D6", "substrate", "activation"),
  i("tamoxifen", "CYP2D6", "substrate", "activation"),
  i("paroxetine", "CYP2D6", "inhibitor", "strong · TDI"),
  i("fluoxetine", "CYP2D6", "inhibitor", "strong · TDI"),
  i("bupropion", "CYP2D6", "inhibitor", "strong"),
  i("quinidine", "CYP2D6", "inhibitor", "strong index"),
  i("terbinafine", "CYP2D6", "inhibitor", "strong"),
  // 2C19
  i("omeprazole", "CYP2C19", "substrate", "sensitive index"),
  i("clopidogrel", "CYP2C19", "substrate", "activation"),
  i("citalopram", "CYP2C19", "substrate", "major"),
  i("fluvoxamine", "CYP2C19", "inhibitor", "strong"),
  i("fluconazole", "CYP2C19", "inhibitor", "strong"),
  i("fluoxetine", "CYP2C19", "inhibitor", "strong"),
  i("rifampin", "CYP2C19", "inducer", "strong"),
  // 2C9
  i("warfarin", "CYP2C9", "substrate", "sensitive NTI"),
  i("phenytoin", "CYP2C9", "substrate", "sensitive NTI"),
  i("celecoxib", "CYP2C9", "substrate", "sensitive"),
  i("fluconazole", "CYP2C9", "inhibitor", "moderate–strong"),
  i("amiodarone", "CYP2C9", "inhibitor", "moderate · linger"),
  i("rifampin", "CYP2C9", "inducer", "moderate"),
  // 2C8
  i("pioglitazone", "CYP2C8", "substrate", "sensitive"),
  i("gemfibrozil", "CYP2C8", "inhibitor", "strong · TDI"),
  // 1A2
  i("tizanidine", "CYP1A2", "substrate", "sensitive index"),
  i("theophylline", "CYP1A2", "substrate", "sensitive NTI"),
  i("clozapine", "CYP1A2", "substrate", "major NTI"),
  i("olanzapine", "CYP1A2", "substrate", "major"),
  i("caffeine", "CYP1A2", "substrate", "index probe"),
  i("fluvoxamine", "CYP1A2", "inhibitor", "strong index"),
  i("ciprofloxacin", "CYP1A2", "inhibitor", "moderate"),
  i("rifampin", "CYP1A2", "inducer", "moderate"),
  // 2B6
  i("bupropion", "CYP2B6", "substrate", "sensitive index"),
  i("efavirenz", "CYP2B6", "substrate", "sensitive"),
  i("methadone", "CYP2B6", "substrate", "major"),
  i("rifampin", "CYP2B6", "inducer", "moderate"),
  i("efavirenz", "CYP2B6", "inducer", "moderate (auto)"),
  // P-gp
  i("digoxin", "P-gp", "substrate", "index"),
  i("dabigatran", "P-gp", "substrate", "index"),
  i("fexofenadine", "P-gp", "substrate", "probe (also OATP)"),
  i("itraconazole", "P-gp", "inhibitor", "strong"),
  i("clarithromycin", "P-gp", "inhibitor", "moderate"),
  i("amiodarone", "P-gp", "inhibitor", "moderate"),
  i("rifampin", "P-gp", "inducer", "strong"),
  i("st-johns-wort", "P-gp", "inducer", "strong"),
];

function i(
  id: string,
  enzyme: Enzyme,
  role: FdaIndexHit["role"],
  grade: string,
): FdaIndexHit {
  const name = DRUG_BY_ID[id]?.name ?? id;
  return { id, name, enzyme, role, grade };
}

export function indexFor(enzyme: Enzyme) {
  const rows = INDEX.filter((r) => r.enzyme === enzyme && DRUG_BY_ID[r.id]);
  return {
    substrates: rows.filter((r) => r.role === "substrate"),
    inhibitors: rows.filter((r) => r.role === "inhibitor"),
    inducers: rows.filter((r) => r.role === "inducer"),
  };
}

export function fdaIndexOf(id: string, enzyme?: Enzyme, role?: FdaIndexHit["role"]) {
  return INDEX.filter(
    (r) => r.id === id && (!enzyme || r.enzyme === enzyme) && (!role || r.role === role),
  );
}

export interface ProtocolVictim {
  id: string;
  name: string;
  enzyme: Enzyme;
  sensitivity: string;
  pathway: "clearance" | "activation";
  nti: boolean;
}

export interface ProtocolClock {
  title: string;
  days: string;
  body: string;
  watch: string;
}

export interface ProtocolCard {
  perpId: string;
  name: string;
  kind: PerpKind;
  enzymes: Enzyme[];
  strength: Strength;
  clock: ClockKind;
  grade: string;
  fold: string;
  start: ProtocolClock;
  stop: ProtocolClock;
  linger?: string;
  victims: ProtocolVictim[];
  nti: boolean;
  dualHit: boolean;
  tone: Tone;
  steps: { id: string; title: string; body: string }[];
}

function perpRoles(id: string) {
  const d = DRUG_BY_ID[id];
  if (!d || isVirtual(id)) return [];
  const hits: Array<{ enzyme: Enzyme; kind: PerpKind; strength: Strength }> = [];
  for (const r of d.enzymes) {
    if (r.kind !== "inhibitor" && r.kind !== "inducer") continue;
    hits.push({ enzyme: r.enzyme, kind: r.kind, strength: r.strength });
  }
  return hits;
}

function bestPerp(id: string) {
  const roles = perpRoles(id);
  if (!roles.length) return null;
  const tdi = TDI[id];
  const inducers = roles.filter((r) => r.kind === "inducer");
  const inhibitors = roles.filter((r) => r.kind === "inhibitor");
  // Prefer the hotter role; induction wins on rifampin even though it also has nothing else.
  const pool = inducers.length && (!inhibitors.length || RANK[inducers[0].strength] >= RANK[inhibitors[0].strength])
    ? inducers
    : inhibitors.length
      ? inhibitors
      : roles;
  const top = pool.reduce((m, r) => (RANK[r.strength] > RANK[m.strength] ? r : m));
  const enzymes = [
    ...new Set(
      pool
        .filter((r) => r.kind === top.kind && RANK[r.strength] === RANK[top.strength])
        .map((r) => r.enzyme),
    ),
  ];
  const clock: ClockKind = top.kind === "inducer" ? "induction" : tdi ? "tdi" : "reversible";
  return { ...top, enzymes, clock };
}

function victimsOf(ids: string[], enzymes: Enzyme[]): ProtocolVictim[] {
  const out: ProtocolVictim[] = [];
  const enzymeSet = new Set(enzymes);
  for (const id of ids) {
    const d = DRUG_BY_ID[id];
    if (!d || isVirtual(id)) continue;
    for (const r of d.enzymes) {
      if (r.kind !== "substrate" || !enzymeSet.has(r.enzyme)) continue;
      out.push({
        id,
        name: d.name,
        enzyme: r.enzyme,
        sensitivity: r.sensitivity,
        pathway: r.pathway,
        nti: Boolean(r.nti),
      });
    }
  }
  const seen = new Set<string>();
  const uniq: ProtocolVictim[] = [];
  for (const v of out) {
    const k = `${v.id}:${v.enzyme}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(v);
  }
  const sensRank = { sensitive: 3, major: 2, minor: 1 } as Record<string, number>;
  uniq.sort((a, b) => {
    if (a.nti !== b.nti) return a.nti ? -1 : 1;
    return (sensRank[b.sensitivity] ?? 0) - (sensRank[a.sensitivity] ?? 0);
  });
  return uniq;
}

function toneOf(strength: Strength, nti: boolean, clock: ClockKind): Tone {
  if (nti && (strength === "strong" || clock === "induction")) return "danger";
  if (strength === "strong" || clock === "tdi" || clock === "induction") return "warn";
  return "ok";
}

function startClock(
  name: string,
  kind: PerpKind,
  clock: ClockKind,
  victims: ProtocolVictim[],
  tdi?: (typeof TDI)[string],
): ProtocolClock {
  const nti = victims.filter((v) => v.nti).map((v) => v.name);
  const names = victims.slice(0, 4).map((v) => v.name);
  const who = names.length ? names.join(", ") : "mapped victims";
  const many = names.length !== 1;
  if (kind === "inducer") {
    return {
      title: "Start — victim levels fall",
      days: "day 3–5 start · full ~7–14 d",
      body: `${name} turns transcription on. ${who} will look stolen or ineffective once induction is up. ${INDUCTION.washIn}`,
      watch: nti.length
        ? `NTI on this desk: ${nti.join(", ")}. Loss of effect can present as withdrawal, seizure, clot, or a failed OCP.`
        : "Watch for loss of effect, not toxicity. The milligram did not change.",
    };
  }
  if (clock === "tdi") {
    return {
      title: "Start — enzyme is being destroyed",
      days: tdi?.resynth ?? "hours to 1–2 days",
      body: `${name} is time-dependent. ${who} ${many ? "climb" : "climbs"} as CYP is inactivated, not just occupied. ${tdi?.pearl ?? ""}`.trim(),
      watch: nti.length
        ? `NTI on this desk: ${nti.join(", ")}. Toxicity is the start picture — nod, bleed, QT, rigidity.`
        : "Watch victim toxicity as the block lands. Reversible occupancy is the wrong mental model.",
    };
  }
  return {
    title: "Start — victim exposure climbs",
    days: "1–3 days (inhibitor steady-state)",
    body: `${name} occupies the isoform. ${who} ${many ? "rise" : "rises"} while the inhibitor is on. Competitive, so stopping is faster than TDI.`,
    watch: nti.length
      ? `NTI on this desk: ${nti.join(", ")}. Open the PI before the first overlapping day.`
      : "Watch victim toxicity. This desk does not pick a milligram.",
  };
}

function stopClock(
  name: string,
  kind: PerpKind,
  clock: ClockKind,
  victims: ProtocolVictim[],
  tdi?: (typeof TDI)[string],
): ProtocolClock {
  const nti = victims.filter((v) => v.nti).map((v) => v.name);
  const names = victims.slice(0, 4).map((v) => v.name);
  const who = names.length ? names.join(", ") : "mapped victims";
  const many = names.length !== 1;
  if (kind === "inducer") {
    return {
      title: "Stop — rebound as induction dissipates",
      days: "~1–2 weeks after the last dose",
      body: `${INDUCTION.washOut} ${who} ${many ? "climb" : "climbs"} back — sometimes past baseline if a dose was raised while induced. Niemi 2003: remember the stop.`,
      watch: nti.length
        ? `NTI rebound: ${nti.join(", ")}. Toxicity after a 'completed' rifampin course is still this clock.`
        : "The forgotten half. A stable milligram on rifampin is an overdose two weeks after it stops.",
    };
  }
  if (clock === "tdi") {
    return {
      title: "Stop — enzyme must be resynthesized",
      days: tdi?.resynth ?? "24–72 h+",
      body: `Stopping ${name} does not restore CYP. New protein has to be made. ${who} ${many ? "stay" : "stays"} high until then. ${tdi?.pearl ?? ""}`.trim(),
      watch: nti.length
        ? `NTI still hot: ${nti.join(", ")}. Yesterday’s last tablet is not a clear.`
        : "Do not treat the last day of a Z-Pak / azole / booster as a free victim day.",
    };
  }
  return {
    title: "Stop — victim levels fall",
    days: "1–3 days (inhibitor washout)",
    body: `${name} clears, ${who} ${many ? "fall" : "falls"}. Loss of effect, withdrawal, or a failed prodrug — not a new disease.`,
    watch: nti.length
      ? `NTI falling: ${nti.join(", ")}. A dose raised under the inhibitor is now too much to keep, too little to stop cold.`
      : "The milligram that was safe under the block may fail after it.",
  };
}

function stepsFor(card: Omit<ProtocolCard, "steps">): ProtocolCard["steps"] {
  const enz = card.enzymes.map((e) => e.replace("CYP", "")).join(" / ");
  return [
    {
      id: "grade",
      title: "Name the isoform and the FDA grade",
      body: `${card.name} is a ${card.grade.toLowerCase()} of ${enz}. ${card.fold}. Open the FDA table if the label and this desk disagree — the label wins.`,
    },
    {
      id: "victims",
      title: "List NTI and sensitive victims on this desk",
      body: card.victims.length
        ? card.victims
            .slice(0, 6)
            .map((v) => `${v.name} (${v.enzyme.replace("CYP", "")} ${v.sensitivity}${v.nti ? ", NTI" : ""}${v.pathway === "activation" ? ", prodrug" : ""})`)
            .join("; ")
        : "No mapped victim on the desk yet. Add the substrate you are about to start or stop next to.",
    },
    {
      id: "clock",
      title: "Pick the clock",
      body:
        card.clock === "induction"
          ? "Transcriptional. Start is loss of effect over a week. Stop is rebound over two."
          : card.clock === "tdi"
            ? `Time-dependent inactivation. ${card.linger ?? "New enzyme, not dissociation."}`
            : "Reversible occupancy. Start and stop track the inhibitor’s own half-life.",
    },
    {
      id: "start",
      title: "Start day",
      body: `${card.start.days}. ${card.start.watch}`,
    },
    {
      id: "stop",
      title: "Stop day — the forgotten half",
      body: `${card.stop.days}. ${card.stop.watch}`,
    },
    {
      id: "pi",
      title: "Open the Prescribing Information",
      body: "This desk paraphrases FDA grades and published clocks. Independently review each victim’s PI before you hold, split, or overlap. FirstPass does not pick a milligram.",
    },
  ];
}

export function protocolsOnDesk(ids: string[]): ProtocolCard[] {
  const real = ids.filter((id) => DRUG_BY_ID[id] && !isVirtual(id));
  const cards: ProtocolCard[] = [];
  for (const id of real) {
    const best = bestPerp(id);
    if (!best) continue;
    if (best.strength === "weak" && !TDI[id] && best.kind !== "inducer") continue;
    const d = DRUG_BY_ID[id]!;
    const tdi = TDI[id];
    const others = real.filter((x) => x !== id);
    const victims = victimsOf(others, best.enzymes).filter((v) => v.id !== id);
    const dualHit =
      best.kind === "inhibitor" &&
      best.enzymes.includes("CYP3A4") &&
      d.enzymes.some((r) => r.enzyme === "P-gp" && r.kind === "inhibitor");
    const nti = victims.some((v) => v.nti);
    const grade = FDA_GRADES[best.kind][best.strength];
    const base: Omit<ProtocolCard, "steps"> = {
      perpId: id,
      name: d.name,
      kind: best.kind,
      enzymes: best.enzymes,
      strength: best.strength,
      clock: best.clock,
      grade: grade.label,
      fold: grade.fold,
      start: startClock(d.name, best.kind, best.clock, victims, tdi),
      stop: stopClock(d.name, best.kind, best.clock, victims, tdi),
      linger: tdi ? `${tdi.resynth}. ${tdi.pearl}` : undefined,
      victims,
      nti,
      dualHit,
      tone: toneOf(best.strength, nti, best.clock),
    };
    cards.push({ ...base, steps: stepsFor(base) });
  }
  cards.sort((a, b) => {
    const t = { danger: 3, warn: 2, ok: 1 };
    if (t[b.tone] !== t[a.tone]) return t[b.tone] - t[a.tone];
    return RANK[b.strength] - RANK[a.strength];
  });
  return cards;
}

/** Clock for this finding's own names, not the rest of the desk. Null means the map has no clock. */
export function clockForFinding(finding: Finding): ProtocolCard | null {
  const ids = [...new Set(finding.drugIds.filter((id) => DRUG_BY_ID[id] && !isVirtual(id)))];
  if (ids.length < 2) return null;
  const cards = protocolsOnDesk(ids).filter((card) => {
    if (!finding.drugIds.includes(card.perpId)) return false;
    if (!card.victims.some((v) => finding.drugIds.includes(v.id))) return false;
    if (finding.enzymes.length && !card.enzymes.some((e) => finding.enzymes.includes(e))) return false;
    return true;
  });
  if (!cards.length) return null;
  return cards.find((c) => c.perpId === finding.drugIds[0]) ?? cards[0];
}

export function cypWanted(ids: string[]) {
  if (protocolsOnDesk(ids).length) return true;
  return ids.some((id) => Boolean(TDI[id]) || perpRoles(id).some((r) => r.strength !== "weak"));
}

export function protocolFindings(ids: string[]): Finding[] {
  const cards = protocolsOnDesk(ids);
  const out: Finding[] = [];
  for (const card of cards) {
    if (!card.victims.length) continue;
    const severity: Severity =
      card.tone === "danger" ? "major" : card.strength === "strong" ? "major" : "moderate";
    const victimIds = [...new Set(card.victims.map((v) => v.id))];
    const enz = card.enzymes;
    out.push({
      id: `${card.perpId}__cyp-clock`,
      severity,
      kind: "clinic",
      drugIds: [card.perpId, ...victimIds],
      headline: `${card.name} ${card.kind} clock`,
      enzymes: enz,
      effect: card.clock === "induction" ? "start ↓ / stop rebound" : card.clock === "tdi" ? "TDI linger" : "start ↑ / stop ↓",
      mechanism: `${card.grade} · ${card.clock}`,
      clinical: `${card.start.body} ${card.stop.body} Teaching clock — not a dose. Open the PI.`,
      tags: ["cyp-protocol", card.kind, card.clock, ...enz],
    });
    if (card.dualHit) {
      out.push({
        id: `${card.perpId}__cyp-dual`,
        severity: "major",
        kind: "clinic",
        drugIds: [card.perpId, ...victimIds],
        headline: `${card.name} hits CYP3A4 and P-gp`,
        enzymes: ["CYP3A4", "P-gp"],
        effect: "dual first-pass knockout",
        mechanism: "CYP3A4 + P-gp co-inhibition",
        clinical:
          "Oral victims that ride both gut 3A4 and P-gp (some DOACs, digoxin-neighborhood, many 3A4 first-pass drugs) move more than a CYP-only story. Independently review the PI.",
        tags: ["cyp-protocol", "dual-hit", "CYP3A4", "P-gp"],
      });
    }
  }
  return out;
}

export const SAFETY_CHECKS: { id: string; title: string; body: string }[] = [
  {
    id: "isoform",
    title: "Name the isoform",
    body: "3A4, 2D6, 2C19, 2C9, 1A2, 2B6, 2C8, P-gp. Dual 3A4 + P-gp is a different story than CYP alone.",
  },
  {
    id: "grade",
    title: "Grade it the FDA way",
    body: "Strong / moderate / weak by fold-change of a sensitive index substrate. Huang 2007 / FDA 2020. The label still wins.",
  },
  {
    id: "index",
    title: "Prefer an index pair when you can",
    body: "Midazolam for 3A4, DXM for 2D6, omeprazole for 2C19, S-warfarin for 2C9, tizanidine for 1A2, repaglinide for 2C8, digoxin for P-gp.",
  },
  {
    id: "clock",
    title: "Reversible vs TDI vs induction",
    body: "Occupancy follows the inhibitor. TDI waits on new enzyme. Induction is a transcription week in and two weeks out.",
  },
  {
    id: "stop",
    title: "Plan the stop on the start day",
    body: "Stopping an inducer is rebound toxicity. Stopping a TDI is lingering victim. Stopping a reversible inhibitor is falling levels.",
  },
  {
    id: "nti",
    title: "NTI victims get their own row",
    body: "Warfarin, phenytoin, theophylline, clozapine, calcineurin inhibitors, digoxin, methadone. Open the PI. This desk does not pick a milligram.",
  },
  {
    id: "prodrug",
    title: "Activation is the opposite arrow",
    body: "Codeine, clopidogrel, tamoxifen, tramadol need the enzyme. A strong inhibitor looks like a poor metabolizer — loss of effect, stacked parent.",
  },
  {
    id: "pi",
    title: "Independent review",
    body: "Open DailyMed / the SPL. Absence of a mapped clock is not proof of safety. FirstPass is not FDA-cleared.",
  },
];

export function protocolTray(ids: string[]): string[] {
  const cards = protocolsOnDesk(ids);
  const tray: string[] = [];
  if (!cards.length) return tray;
  tray.push("CYP clock");
  if (cards.some((c) => c.clock === "tdi")) tray.push("TDI linger");
  if (cards.some((c) => c.kind === "inducer")) tray.push("de-induce watch");
  if (cards.some((c) => c.nti)) tray.push("NTI victim");
  if (cards.some((c) => c.dualHit)) tray.push("3A4+P-gp");
  return tray;
}

/** Atlas helper — is this drug an FDA example on this isoform/role? */
export function isFdaIndex(id: string, enzyme: Enzyme, role: "substrate" | "inhibitor" | "inducer") {
  return INDEX.some((r) => r.id === id && r.enzyme === enzyme && r.role === role);
}
