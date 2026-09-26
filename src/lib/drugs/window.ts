import { DRUG_BY_ID } from "./catalog";
import { clinicFor } from "./clinic";
import { protocolTray } from "./cyp-protocol";
import { SEVERITY_LABEL, type Finding, type HostContext, type Report, type Severity } from "./types";
import { PI_FOOTER } from "@/lib/regulatory";

/** OTP / street-agonist / antagonist IDs that put the desk in window mode. */
const MAT_IDS = new Set([
  "methadone",
  "buprenorphine",
  "naltrexone",
  "naloxone",
  "nalmefene",
  "lofexidine",
  "acamprosate",
  "fentanyl",
  "dirty-30",
  "heroin",
  "xylazine",
  "medetomidine",
  "seven-oh",
  "carfentanil",
  "isotonitazene",
  "protonitazene",
  "metonitazene",
  "etonitazene",
  "clonidine",
  "loperamide",
]);

const STREET_FOLD = new Set([
  "fentanyl",
  "dirty-30",
  "heroin",
  "carfentanil",
  "isotonitazene",
  "protonitazene",
  "metonitazene",
  "etonitazene",
]);

const BOOSTER = new Set(["paxlovid", "ritonavir", "cobicistat"]);

/** One-tap extras a dosing window actually hands over the glass. */
export const WINDOW_EXTRAS: { group: string; hint: string; items: { id: string; label: string }[] }[] = [
  {
    group: "Window",
    hint: "What they handed over the glass",
    items: [
      { id: "promethazine", label: "Phenergan" },
      { id: "hydroxyzine", label: "Vistaril" },
      { id: "ondansetron", label: "Zofran" },
      { id: "loperamide", label: "Imodium" },
    ],
  },
  {
    group: "New start",
    hint: "The covering prescription",
    items: [
      { id: "paxlovid", label: "Paxlovid" },
      { id: "azithromycin", label: "Z-Pak" },
      { id: "clarithromycin", label: "Biaxin" },
      { id: "fluvoxamine", label: "Luvox" },
      { id: "phenytoin", label: "Dilantin" },
      { id: "carbamazepine", label: "Tegretol" },
      { id: "rifampin", label: "Rifampin" },
      { id: "ciprofloxacin", label: "Cipro" },
      { id: "fluconazole", label: "Diflucan" },
      { id: "cimetidine", label: "Tagamet" },
    ],
  },
  {
    group: "Airway",
    hint: "The extras that still count",
    items: [
      { id: "naloxone", label: "Narcan" },
      { id: "clonazepam", label: "Klonopin" },
      { id: "gabapentin", label: "Neurontin" },
      { id: "pregabalin", label: "Lyrica" },
      { id: "cyclobenzaprine", label: "Flexeril" },
      { id: "quetiapine", label: "Seroquel" },
      { id: "ethanol", label: "Alcohol" },
    ],
  },
  {
    group: "Street",
    hint: "Today's supply",
    items: [
      { id: "fentanyl", label: "Fentanyl" },
      { id: "xylazine", label: "Xylazine" },
      { id: "medetomidine", label: "Medetomidine" },
      { id: "dirty-30", label: "Dirty 30" },
      { id: "seven-oh", label: "7-OH" },
      { id: "bromazolam", label: "Bromazolam" },
      { id: "naloxone", label: "Narcan" },
    ],
  },
  {
    group: "HIV / HCV",
    hint: "The infectious-disease row",
    items: [
      { id: "epclusa", label: "Epclusa" },
      { id: "efavirenz", label: "Sustiva" },
      { id: "nevirapine", label: "Viramune" },
      { id: "cobicistat", label: "Tybost" },
      { id: "ritonavir", label: "Norvir" },
    ],
  },
  {
    group: "Cup",
    hint: "What the immunoassay actually sees",
    items: [
      { id: "bupropion", label: "Wellbutrin" },
      { id: "sertraline", label: "Zoloft" },
      { id: "dextromethorphan", label: "DXM" },
      { id: "rifampin", label: "Rifampin" },
    ],
  },
];

export interface WindowBrief {
  mode: "mat" | "clinic";
  kicker: string;
  title: string;
  highest: Severity | "none";
  names: string;
  watch: string[];
  tell: string;
  call: string;
  tray: string[];
  quiet: boolean;
}

export function isMatDesk(ids: string[], findings: Finding[] = []) {
  return ids.some((id) => MAT_IDS.has(id)) || findings.some((f) => f.tags.includes("mat"));
}

function named(ids: string[]) {
  return ids.map((id) => DRUG_BY_ID[id]?.name).filter(Boolean).join(" + ");
}

function hasSuffix(findings: Finding[], suffix: string) {
  return findings.some((f) => f.id.includes(suffix));
}

function victimPk(findings: Finding[], victim: string, arrow: "up" | "down") {
  const needle = arrow === "up" ? "↑ exposure" : "↓ exposure";
  return findings.filter(
    (f) => f.kind === "pk" && f.drugIds[1] === victim && f.effect.includes(needle),
  );
}

function perpNames(findings: Finding[], victim: string, arrow: "up" | "down") {
  const names = victimPk(findings, victim, arrow)
    .map((f) => DRUG_BY_ID[f.drugIds[0]]?.name)
    .filter((n): n is string => Boolean(n));
  return [...new Set(names)];
}

function pushUnique(list: string[], item: string) {
  if (item && !list.includes(item)) list.push(item);
}

export function briefWindow(ids: string[], report: Report, host: HostContext): WindowBrief | null {
  if (ids.length === 0) return null;
  const mat = isMatDesk(ids, report.findings);
  const hot =
    report.highest === "contraindicated" ||
    report.highest === "major" ||
    report.findings.some((f) => f.kind === "clinic");
  if (!mat && report.findings.length === 0) return null;
  if (!mat && !hot && report.highest === "minor") return null;

  const findings = report.findings;
  const on = (id: string) => ids.includes(id);
  const methadone = on("methadone");
  const bup = on("buprenorphine");
  const naltrexone = on("naltrexone");
  const street = ids.some((id) => STREET_FOLD.has(id));
  const alpha2 = ids.some((id) => {
    const d = DRUG_BY_ID[id];
    return Boolean(d?.pd.includes("alpha2-agonist"));
  });
  const precip = hasSuffix(findings, "pd-bup-precip") || hasSuffix(findings, "pd-antag-opioid");
  const mixedArrow = hasSuffix(findings, "pd-methadone-ritonavir");
  const takeHome = hasSuffix(findings, "pd-opioid-stack") && methadone && street;
  const dump = perpNames(findings, "methadone", "down");
  const bump = perpNames(findings, "methadone", "up");
  const luvox = on("fluvoxamine") && methadone;
  const prozacMap = (on("fluoxetine") || on("paroxetine") || on("sertraline")) && methadone && !luvox;
  const zpak = on("azithromycin") && methadone;
  const clarith = (on("clarithromycin") || on("erythromycin")) && methadone;
  const tybost = on("cobicistat") && methadone;
  const bupBoost = bup && [...BOOSTER].some((id) => on(id));
  const cipro = on("ciprofloxacin") && methadone;
  const quiet = findings.length === 0 || (mat && report.highest === "none");

  const watch: string[] = [];
  let tell = "";
  const callBits: string[] = [];
  const tray: string[] = [];

  if (precip) {
    pushUnique(
      watch,
      "Precipitated withdrawal — yawning, gooseflesh, puking, restlessness within minutes of the film or the shot. Occupancy, not milligrams.",
    );
    tell =
      "This is receptor occupancy, not a missed milligram. Do not chase precipitated withdrawal by stacking more buprenorphine or agonist in the first stretch without a protocol.";
    pushUnique(callBits, "Get medical. Score COWS. This desk is not an induction protocol.");
    pushUnique(tray, "COWS");
    pushUnique(tray, "medical");
  }

  if (mixedArrow) {
    pushUnique(
      watch,
      "Withdrawal at the window, not nod — Paxlovid / ritonavir often drops methadone (2B6/UGT) even while it raises fentanyl.",
    );
    if (!tell) {
      tell =
        "The COVID pills can steal a methadone dose for a few days. Fentanyl on the same booster is the opposite arrow — parent and airway climb.";
    }
    pushUnique(callBits, "Call medical before a take-home bump. Withdrawal here is PK, not a missed bottle.");
    pushUnique(tray, "withdrawal watch");
  } else if ((on("paxlovid") || on("ritonavir")) && street && !methadone) {
    pushUnique(
      watch,
      "Fentanyl parent climbs — Paxlovid is a five-day ritonavir boost. Nod, pinpoint, hard to arouse. Opposite arrow from methadone.",
    );
    if (!tell) {
      tell = "The COVID pills can make today's fentanyl much stronger. Methadone on the same booster often falls — this is not that map.";
    }
    pushUnique(callBits, "If they cannot stay awake, hold and get medical. Support ventilation.");
    pushUnique(tray, "naloxone");
    pushUnique(tray, "airway");
  }

  if (tybost) {
    pushUnique(
      watch,
      "Tybost is not Norvir. Cobicistat raises methadone via 3A4 and does not induce 2B6. Nod at the window, not withdrawal.",
    );
    if (!tell) {
      tell =
        "The booster in Genvoya and Prezcobix is not Paxlovid's mixed arrow. Cobicistat has no 2B6 dump — parent climbs.";
    }
    pushUnique(callBits, "Pull an ECG if the pair cannot be separated. Check K and Mg.");
    pushUnique(tray, "ECG");
    pushUnique(tray, "K");
    pushUnique(tray, "Mg");
    pushUnique(tray, "airway");
  }

  if (bupBoost) {
    pushUnique(
      watch,
      "Opposite of methadone. Paxlovid / ritonavir / cobicistat can raise buprenorphine via 3A4. Watch nod, not a stolen film.",
    );
    if (!tell) {
      tell =
        "Tolerant patients usually do not need a cut. Do not treat this like methadone withdrawal on the same booster. Fentanyl on that booster is the airway climb.";
    }
    pushUnique(tray, "airway");
  }

  if (dump.length && !mixedArrow) {
    pushUnique(
      watch,
      `Stolen-dose picture — ${dump.join(", ")} can dump methadone within days. Yawning and begging for an increase with an unchanged milligram.`,
    );
    if (!tell) {
      tell = `The new ${dump.join(" / ")} can make a stable methadone look stolen. Withdrawal is induction, not a missed bottle.`;
    }
    pushUnique(callBits, "Medical before changing take-homes. Confirm the inducer is still on board.");
    pushUnique(tray, "withdrawal watch");
  }

  if (luvox) {
    pushUnique(
      watch,
      "Luvox bump — nod and a longer QTc while fluvoxamine is on; withdrawal when it stops, same milligram.",
    );
    if (!tell) {
      tell = "Luvox is not Prozac. Fluvoxamine raises methadone; stopping it later can feel like a stolen bottle.";
    }
    pushUnique(callBits, "Pull an ECG if the pair cannot be separated. Check K and Mg.");
    pushUnique(tray, "ECG");
    pushUnique(tray, "K");
    pushUnique(tray, "Mg");
  } else if (clarith) {
    pushUnique(
      watch,
      "Biaxin / erythromycin — 3A4 raise of methadone plus QT. Nod at the window and a longer QTc.",
    );
    if (!tell) {
      tell = "Biaxin is not a Z-Pak. Clarithromycin and erythromycin raise methadone via 3A4 and stack QT.";
    }
    pushUnique(callBits, "Pull an ECG if the pair cannot be separated. Check K and Mg.");
    pushUnique(tray, "ECG");
    pushUnique(tray, "K");
    pushUnique(tray, "Mg");
    pushUnique(tray, "airway");
  } else if (zpak) {
    pushUnique(
      watch,
      "Z-Pak QT stack — azithromycin barely touches CYP3A4, unlike Biaxin. It still prolongs repolarization next to methadone.",
    );
    if (!tell) {
      tell = "A Z-Pak does not dump or raise methadone via 3A4. It still stacks QT. Do not treat it as a free macrolide on a known-QT opioid.";
    }
    pushUnique(callBits, "Pull an ECG if the pair cannot be separated. Check K and Mg.");
    pushUnique(tray, "ECG");
    pushUnique(tray, "K");
    pushUnique(tray, "Mg");
  } else if (cipro) {
    pushUnique(
      watch,
      "Cipro on a known-QT opioid — 1A2/weak 3A4 can nudge parent, and the fluoroquinolone still prolongs QT. Nod plus palpitations.",
    );
    if (!tell) {
      tell = "Cipro is not a free UTI pill on methadone. Herrlin 2000 is the sedation-and-TdP case. Separate cations from the tablet; the CYP row is a different problem.";
    }
    pushUnique(callBits, "Pull an ECG if the pair cannot be separated. Check K and Mg.");
    pushUnique(tray, "ECG");
    pushUnique(tray, "K");
    pushUnique(tray, "Mg");
    pushUnique(tray, "airway");
  } else if (on("grapefruit") && methadone) {
    pushUnique(
      watch,
      "Gut 3A4 knockout — grapefruit raises methadone parent. Nod at the window, not a stolen bottle.",
    );
    if (!tell) {
      tell = "Breakfast juice is not a free extra on a known-QT opioid. This is intestinal CYP3A4, not a new milligram.";
    }
    pushUnique(tray, "airway");
  } else if (bump.length && !prozacMap && !tybost) {
    pushUnique(
      watch,
      `Methadone parent climbs with ${bump.join(", ")} — nod at the window, and QT if other extras are on the tray.`,
    );
    if (!tell) {
      tell = `${bump.join(" / ")} can make the same methadone milligram hit harder. This is not a free extra.`;
    }
    pushUnique(tray, "airway");
  }

  if (prozacMap) {
    pushUnique(
      watch,
      "Not the Luvox map — fluoxetine / paroxetine / sertraline are 2D6, not the OTP methadone bump. Still serotonin, and fluoxetine lingers weeks after it stops.",
    );
    if (!tell) {
      tell = "Prozac, Paxil, and Zoloft are not Luvox on this desk. Do not treat every SSRI as a methadone raise.";
    }
  }

  if (takeHome) {
    pushUnique(
      watch,
      "Stacked μ on a take-home — nod, pinpoint, hard to arouse. One airway, not two prescriptions.",
    );
    if (!tell) {
      tell = "The bottle plus today's fold is one opioid load. Naloxone reverses the μ-agonist; it does not reverse xylazine or medetomidine.";
    }
    pushUnique(callBits, "If they cannot stay awake through dosing, hold and get medical. Support ventilation.");
    pushUnique(tray, "naloxone");
    pushUnique(tray, "airway");
  } else if (hasSuffix(findings, "pd-opioid-stack")) {
    pushUnique(watch, "Two μ-agonists, one airway. Naloxone still reverses the opioid.");
    if (!tell) tell = "Stacked agonists are one respiratory load, not two prescriptions.";
    pushUnique(tray, "naloxone");
    pushUnique(tray, "airway");
  }

  if (hasSuffix(findings, "pd-alpha2-opioid") || (alpha2 && (methadone || street || bup))) {
    pushUnique(
      watch,
      "α2 sedation that naloxone will not finish — xylazine, medetomidine, Lucemyra, clonidine. They stay down after the opioid reverses.",
    );
    if (!tell) {
      tell = "Naloxone reverses the opioid, not the α2. Do not stack extra naloxone expecting a wake-up. Support ventilation.";
    }
    pushUnique(callBits, "Support ventilation. Extra naloxone will not reverse tranq.");
    pushUnique(tray, "ventilation");
    pushUnique(tray, "naloxone (μ only)");
  }

  if (hasSuffix(findings, "pd-speedball")) {
    pushUnique(
      watch,
      "Looking awake is not breathing — the stimulant masks apnea until it wears off.",
    );
    if (!tell) {
      tell = "A methadone take-home plus cocaine or meth is a speedball / goofball. QT can sit on top of the masked airway.";
    }
    pushUnique(tray, "airway");
    pushUnique(tray, "naloxone");
  }

  if (hasSuffix(findings, "pd-qt") && methadone && !zpak && !clarith && !luvox && !cipro) {
    pushUnique(
      watch,
      "Methadone QT stack — palpitations, syncope, a longer QTc. Vistaril, Zofran, Celexa, Seroquel, and macrolides are not free extras.",
    );
    pushUnique(callBits, "Pull an ECG if the pair cannot be separated. Check K and Mg.");
    pushUnique(tray, "ECG");
    pushUnique(tray, "K");
    pushUnique(tray, "Mg");
  } else if (hasSuffix(findings, "pd-qt") && !methadone) {
    pushUnique(watch, "Stacked QT — palpitations, syncope, torsades risk. Check electrolytes.");
    pushUnique(tray, "ECG");
    pushUnique(tray, "K");
    pushUnique(tray, "Mg");
  }

  if (hasSuffix(findings, "pd-opioid-benzo") || hasSuffix(findings, "pd-gaba-opioid")) {
    pushUnique(
      watch,
      "Boxed airway — opioid plus a benzo, Z-drug, or gabapentinoid. Pinpoint, hard to arouse, slow to blow off CO₂.",
    );
    if (!tell) {
      tell = "Klonopin, Xanax, gabapentin, and Lyrica are not free extras on methadone or Suboxone. Same boxed warning at any age.";
    }
    pushUnique(callBits, "If they cannot stay awake through dosing, hold and get medical.");
    pushUnique(tray, "airway");
    pushUnique(tray, "naloxone");
  } else if (hasSuffix(findings, "pd-cns") && (methadone || bup || street)) {
    pushUnique(watch, "Additive sedation next to the opioid — window antiemetics, Flexeril, trazodone, alcohol.");
    if (!tell) {
      tell = on("ethanol")
        ? "A drink on a take-home is boxed airway, not a CYP row."
        : "Phenergan, Flexeril, and a drink are not free next to a long μ-agonist.";
    }
    pushUnique(tray, "airway");
  }

  if (hasSuffix(findings, "pd-nitrate-pde5")) {
    pushUnique(watch, "Refractory hypotension — nitrates plus a PDE5 inhibitor. Nitro in the field makes it worse.");
    if (!tell) {
      tell = "Do not give nitroglycerin. Wait about 24 h after sildenafil, 48 h after tadalafil. This is labeled, not CYP.";
    }
    pushUnique(callBits, "Hold nitrates. Get medical. This desk is not a dose.");
    pushUnique(tray, "BP");
  }

  if (hasSuffix(findings, "pd-lithium")) {
    pushUnique(watch, "Lithium toxicity — tremor, confusion, GI, ataxia. NSAIDs, ACEI/ARB, and thiazides raise the level.");
    if (!tell) tell = "Prefer acetaminophen for pain on lithium. Recheck the level if an NSAID already landed.";
    pushUnique(tray, "Li");
    pushUnique(tray, "Cr");
  }

  if (hasSuffix(findings, "pd-bleed") || hasSuffix(findings, "pd-nsaid")) {
    pushUnique(watch, "Bleed — GI, bruise, black stool. SSRIs add platelet-serotonin depletion.");
    pushUnique(tray, "CBC");
    pushUnique(tray, "INR if warfarin");
  }

  if (hasSuffix(findings, "clinic-preg") || host.preg === "pregnant") {
    const avoid = findings.filter((f) => f.id.includes("preg-avoid"));
    if (avoid.length) {
      pushUnique(
        watch,
        `Pregnancy avoid — ${avoid.map((f) => DRUG_BY_ID[f.drugIds[0]]?.name ?? f.drugIds[0]).join(", ")}. Open the label.`,
      );
      if (methadone && !tell) {
        tell = "OTP continues methadone in pregnancy. Neonatal opioid withdrawal is expected, not a reason to stop. Other avoid drugs on this desk are a different row.";
      }
    } else if (methadone) {
      pushUnique(
        watch,
        "OTP pregnancy — continue methadone; clearance often rises in the third trimester so the same milligram can look stolen. Neonatal withdrawal is expected, not a reason to stop.",
      );
    } else if (bup) {
      pushUnique(watch, "Office-based and OTP both use buprenorphine in pregnancy. Precipitated withdrawal is occupancy, not a failed film.");
    }
  }

  if (hasSuffix(findings, "pd-sero") || hasSuffix(findings, "pd-maoi-sero")) {
    pushUnique(
      watch,
      "Serotonin — agitation, clonus, hyperreflexia, fever, diarrhea. Methadone and fentanyl are serotonergic too.",
    );
  }

  if (hasSuffix(findings, "cyp-clock") || hasSuffix(findings, "cyp-dual")) {
    const tdi = findings.some((f) => f.tags.includes("tdi"));
    const induction = findings.some((f) => f.tags.includes("induction"));
    if (tdi) {
      pushUnique(
        watch,
        "CYP TDI linger — the enzyme was destroyed, not occupied. Yesterday’s last macrolide, azole, booster, or grapefruit still raises oral victims until new CYP is made.",
      );
    }
    if (induction) {
      pushUnique(
        watch,
        "CYP induction clock — start looks like a stolen dose over a week; stop is rebound toxicity over two. Plan the stop on the start day.",
      );
    }
    if (!tdi && !induction) {
      pushUnique(
        watch,
        "CYP start/stop clock — victim climbs while the inhibitor is on and falls when it clears. Open the CYP tab.",
      );
    }
    pushUnique(callBits, "Open the CYP tab for the FDA grade and the stop clock. This desk is not a milligram.");
  }

  if (quiet && mat) {
    pushUnique(
      watch,
      ids.length === 1
        ? "Monograph on the desk. Tap today's extra on the window tray — a fold, Phenergan, a Z-Pak, Paxlovid, Luvox, or a benzo — to score the window."
        : "No mapped CYP collision, phenotype hit, or PD synergy on this pair. Absence is not proof of safety.",
    );
    if (!tell) {
      tell = on("epclusa") && methadone
        ? "Epclusa next to methadone should stay quiet on this desk. Rifampin should not. Do not cut the methadone 'because of the new liver drug' without a map."
        : ids.length === 1 && methadone
          ? "Stable milligram is not a free tray. Window antiemetics, macrolides, and today's supply still collide."
          : ids.length === 1 && bup
            ? "A Suboxone film is occupancy. A full agonist on top is precipitated withdrawal or a blocked high — add the second drug."
            : ids.length === 1 && naltrexone
              ? "Vivitrol occupies μ for weeks. A leftover fold is precipitated withdrawal, not a failed shot."
            : "Quiet on this map is not a free pass. Transporters, UGT, and unlisted pathways still apply.";
    }
  }

  if (!watch.length) {
    const top = findings[0];
    if (top) pushUnique(watch, `${top.headline} — ${top.effect}.`);
    else pushUnique(watch, "No mapped collision on this pair.");
  }

  if (!tell) {
    const top = findings[0];
    tell = top
      ? top.clinical.split(/(?<=\.)\s/)[0] ?? top.clinical
      : "Put the pair on the desk, then read the collisions. This is teaching, not a dose.";
  }

  if (!callBits.length) {
    if (mat) {
      callBits.push(
        "If they cannot stay awake through dosing, or they look newly sick on a stable milligram, hold and get medical. This desk is not a protocol.",
      );
    } else {
      callBits.push("If the pair cannot be separated, open the label and get medical. This desk is not a dose.");
    }
  }

  if (methadone || bup || street) {
    pushUnique(tray, "naloxone");
    pushUnique(tray, "airway");
    pushUnique(tray, "UDS");
    pushUnique(tray, "ID screen");
  }
  if (methadone) {
    pushUnique(tray, "EDDP");
  }
  if (bup || precip) {
    pushUnique(tray, "COWS");
  }
  if (on("ethanol") || host.alcohol === "acute" || host.alcohol === "chronic") {
    pushUnique(tray, "CIWA-Ar");
  }
  for (const chip of protocolTray(ids)) {
    pushUnique(tray, chip);
  }
  for (const id of ids) {
    for (const m of clinicFor(id)?.monitor ?? []) {
      if (m === "withdrawal" && tray.some((t) => t.includes("withdrawal"))) continue;
      pushUnique(tray, m);
    }
  }

  const names = named(ids);
  const mode: "mat" | "clinic" = mat ? "mat" : "clinic";

  return {
    mode,
    kicker: mode === "mat" ? "OTP window" : "Clinic huddle",
    title: mode === "mat" ? "Window briefing" : "Clinic briefing",
    highest: report.highest,
    names,
    watch,
    tell,
    call: callBits.join(" "),
    tray,
    quiet: Boolean(quiet),
  };
}

const PAIR_WATCH: Array<[string, string]> = [
  ["pd-bleed", "Bleed — GI, bruise, black stool. SSRIs add platelet-serotonin depletion."],
  ["pd-nsaid", "Bleed — GI, bruise, black stool. SSRIs add platelet-serotonin depletion."],
  ["pd-qt", "Stacked QT — palpitations, syncope, torsades risk. Check electrolytes."],
  ["pd-opioid-benzo", "Boxed airway — opioid plus a benzo, Z-drug, or gabapentinoid. Pinpoint, hard to arouse, slow to blow off CO₂."],
  ["pd-gaba-opioid", "Boxed airway — opioid plus a benzo, Z-drug, or gabapentinoid. Pinpoint, hard to arouse, slow to blow off CO₂."],
  ["pd-nitrate-pde5", "Refractory hypotension — nitrates plus a PDE5 inhibitor. Nitro in the field makes it worse."],
  ["pd-lithium", "Lithium toxicity — tremor, confusion, GI, ataxia. NSAIDs, ACEI/ARB, and thiazides raise the level."],
  ["pd-maoi-sero", "Serotonin — agitation, clonus, hyperreflexia, fever, diarrhea. Methadone and fentanyl are serotonergic too."],
  ["pd-sero", "Serotonin — agitation, clonus, hyperreflexia, fever, diarrhea. Methadone and fentanyl are serotonergic too."],
  ["pd-opioid-stack", "Two μ-agonists, one airway. Naloxone still reverses the opioid."],
  ["pd-speedball", "Looking awake is not breathing — the stimulant masks apnea until it wears off."],
];

/** The watch already written for this kind of row. Otherwise the row's own first sentence. */
export function watchLine(finding: Finding): string {
  const known = PAIR_WATCH.find(([suffix]) => finding.id.includes(suffix));
  if (known) return known[1];
  const sentence = (finding.clinical || finding.effect || finding.headline).split(/(?<=\.)\s/)[0]?.trim() ?? "";
  return sentence || "No watch line on this map for this pair.";
}

export function huddleText(brief: WindowBrief): string {
  const day = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const lines = [
    `FirstPass ${brief.kicker.toLowerCase()} huddle`,
    `${day} · ${brief.names}`,
    `Highest: ${SEVERITY_LABEL[brief.highest]}`,
    "",
    "WATCH",
    ...brief.watch.map((w) => `• ${w}`),
    "",
    `COUNSEL`,
    brief.tell,
    "",
    `CONSIDER / CALL`,
    brief.call,
  ];
  if (brief.tray.length) {
    lines.push("", "TRAY", brief.tray.join(" · "));
  }
  lines.push("", PI_FOOTER);
  return lines.join("\n");
}
