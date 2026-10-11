import { useMemo, useState } from "react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import type { Finding } from "@/lib/drugs/types";
import { resolveState, type StateResource } from "@/lib/drugs/help-resources";
import { useDesk } from "@/lib/drugs/store";

export type ServiceCategory = "all" | "crisis" | "treatment" | "harm" | "specialty";

export interface ServiceLine {
  name: string;
  detail: string;
  category: "crisis" | "treatment" | "harm" | "specialty";
  phone?: string;
  phoneLabel?: string;
  href: string;
  hrefLabel: string;
}

export const LINES: readonly ServiceLine[] = [
  {
    name: "SAMHSA National Helpline",
    detail: "Free, confidential, 24/7 treatment referral in English and Spanish. TTY 1-800-487-4889. Text a ZIP code to 435748.",
    category: "treatment",
    phone: "18006624357",
    phoneLabel: "1-800-662-HELP (4357)",
    href: "https://www.samhsa.gov/find-help/national-helpline",
    hrefLabel: "Helpline page",
  },
  {
    name: "988 Suicide & Crisis Lifeline",
    detail: "Call or text 988. Free, confidential crisis support 24/7 across the US.",
    category: "crisis",
    phone: "988",
    phoneLabel: "Call or text 988",
    href: "https://988lifeline.org/",
    hrefLabel: "988lifeline.org",
  },
  {
    name: "Never Use Alone",
    detail: "A volunteer stays on the line while someone is using and calls for emergency help if they stop answering. Also 877-696-1996. Not treatment.",
    category: "crisis",
    phone: "18004843731",
    phoneLabel: "800-484-3731",
    href: "https://neverusealone.com/",
    hrefLabel: "neverusealone.com",
  },
  {
    name: "NEXT Distro (Mail Naloxone)",
    detail: "Free, confidential mail delivery of naloxone nasal spray and harm reduction supplies for individuals unable to access in-person programs.",
    category: "harm",
    href: "https://nextdistro.org/",
    hrefLabel: "Free mail naloxone",
  },
  {
    name: "NASEN Syringe Access Map",
    detail: "North America Syringe Exchange Network directory for free, sterile supplies, test strips, and community harm reduction programs.",
    category: "harm",
    href: "https://nasen.org/map/",
    hrefLabel: "Syringe access map",
  },
  {
    name: "Veterans Crisis Line",
    detail: "Call 988 (Press 1) or text 838255. 24/7 confidential crisis line for military veterans, service members, and their loved ones.",
    category: "specialty",
    phone: "988",
    phoneLabel: "988 (Press 1)",
    href: "https://www.veteranscrisisline.net/",
    hrefLabel: "VeteransCrisisLine.net",
  },
  {
    name: "Trevor Project Lifeline",
    detail: "Call 866-488-7386 or text START to 678-678. Free, confidential 24/7 suicide prevention and crisis intervention for LGBTQ+ young people.",
    category: "specialty",
    phone: "18664887386",
    phoneLabel: "866-488-7386",
    href: "https://www.thetrevorproject.org/get-help/",
    hrefLabel: "The Trevor Project",
  },
  {
    name: "Línea de Prevención en Español",
    detail: "Llame al 988 (presione 2) o envíe AYUDA al 988. Apoyo gratuito y confidencial en español las 24 horas del día para personas en crisis.",
    category: "specialty",
    phone: "988",
    phoneLabel: "988 (Press 2)",
    href: "https://988lifeline.org/help-yourself/en-espanol/",
    hrefLabel: "Ayuda en español",
  },
  {
    name: "FindTreatment.gov",
    detail: "State-licensed substance use and mental health treatment near a ZIP code.",
    category: "treatment",
    href: "https://findtreatment.gov/",
    hrefLabel: "Find treatment",
  },
  {
    name: "FindSupport.gov",
    detail: "SAMHSA’s starting point for mental health and substance use support. Not a treatment plan.",
    category: "treatment",
    href: "https://findsupport.gov/",
    hrefLabel: "FindSupport.gov",
  },
] as const;

const AIRWAY = ["pd-opioid-benzo", "pd-gaba-opioid", "pd-opioid-stack"] as const;

function namedOpioids(ids: string[]) {
  const full: string[] = [];
  const partial: string[] = [];
  for (const id of ids) {
    const drug = DRUG_BY_ID[id];
    if (!drug) continue;
    if (drug.pd.includes("opioid")) full.push(drug.name);
    else if (drug.pd.includes("partial-opioid")) partial.push(drug.name);
  }
  const bits = [
    full.length ? `${joinNames(full)} ${full.length === 1 ? "is" : "are"} on this map` : "",
    partial.length === 1
      ? `${partial[0]} is a partial opioid on this map`
      : partial.length
        ? `${joinNames(partial)} are partial opioids on this map`
        : "",
  ].filter(Boolean);
  return bits.join(". ");
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function airwayNote(findings: Finding[]) {
  const hit = findings.find((f) => AIRWAY.some((suffix) => f.id.endsWith(suffix)));
  if (!hit) return "";
  const what = hit.mechanism || hit.effect || hit.headline;
  return `This map already has a row: ${what}. These lines are not that row and not a next step.`;
}

function hasPhone(line: (typeof LINES)[number]): line is (typeof LINES)[number] & { phone: string; phoneLabel: string } {
  return typeof line.phone === "string" && Boolean(line.phoneLabel);
}

export const CHIP: Record<string, string> = {
  "SAMHSA National Helpline": "SAMHSA 1-800-662-HELP",
  "SAMHSA Helpline": "SAMHSA 1-800-662-HELP",
  "988 Suicide & Crisis Lifeline": "988 crisis",
  "Never Use Alone": "Never Use Alone 800-484-3731",
  "NEXT Distro (Mail Naloxone)": "NEXT Distro Naloxone",
  "NEXT Distro": "NEXT Distro Naloxone",
  "NASEN Syringe Access Map": "Syringe Access Map",
  "NASEN Syringe Access Directory": "Syringe Access Map",
  "Veterans Crisis Line": "Veterans 988 (Press 1)",
  "Trevor Project Lifeline": "Trevor Project 866-488-7386",
  "Trevor Project": "Trevor Project 866-488-7386",
  "Línea de Prevención en Español": "Español 988 (Press 2)",
  "Spanish Lifeline": "Español 988 (Press 2)",
  "FindTreatment.gov": "FindTreatment.gov",
  "FindSupport.gov": "FindSupport.gov",
};

export function linesText(note: string, zip: string, stateRes?: StateResource | null) {
  const loc =
    zip.length === 5
      ? `Text ${zip} to 435748 for a SAMHSA referral. Type ${zip} at https://findtreatment.gov/locator — that link does not carry the ZIP. State lookup uses a static in-browser table that does not transmit or store the ZIP.`
      : "Text a ZIP code to 435748. Search it at https://findtreatment.gov/locator. State lookup uses a static in-browser table that does not transmit or store the ZIP.";

  const stateSection = stateRes
    ? [
        `\n--- Local State Resource (${stateRes.name}) ---`,
        `${stateRes.helplineName}: ${stateRes.phone} (${stateRes.hours})`,
        stateRes.textInfo ? `Text support: ${stateRes.textInfo}` : "",
        `Website: ${stateRes.website}`,
        stateRes.naloxoneUrl ? `Free mail naloxone (${stateRes.code}): ${stateRes.naloxoneUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const harmSection = [
    "\n--- Naloxone & Harm Reduction ---",
    "Naloxone is available under pharmacy standing orders in all 50 US states & DC without an individual prescription.",
    "NEXT Distro (free mail delivery): https://nextdistro.org/",
    "NASEN Syringe Access Map: https://nasen.org/map/",
  ].join("\n");

  const body = LINES.map((line) => {
    const phone = "phoneLabel" in line && line.phoneLabel ? `${line.phoneLabel}. ` : "";
    return `${line.name}. ${phone}${line.detail} ${line.href}`;
  }).join("\n");

  return [note, loc, stateSection, harmSection, "\n--- National Helplines ---", body]
    .filter(Boolean)
    .join("\n");
}

export function NarcoticBridge({ ids, findings = [] }: { ids: string[]; findings?: Finding[] }) {
  const [reported, setReported] = useState(false);
  const [copied, setCopied] = useState<"ok" | "fail" | "">("");
  const [details, setDetails] = useState(false);
  const [category, setCategory] = useState<ServiceCategory>("all");
  const [zip, setZip] = useState("");
  const setView = useDesk((s) => s.setView);
  const onMap = namedOpioids(ids);
  const open = reported || onMap;
  const note = open ? airwayNote(findings) : "";
  const zipReady = zip.length === 5;
  const stateRes = useMemo(() => (zipReady ? resolveState(zip) : null), [zipReady, zip]);
  const handoff = useMemo(() => linesText(note, zip, stateRes), [note, zip, stateRes]);

  const filteredLines = useMemo(() => {
    if (category === "all") return LINES;
    return LINES.filter((l) => l.category === category);
  }, [category]);

  async function copyLines() {
    try {
      await navigator.clipboard.writeText(handoff);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  }

  return (
    <div className="space-y-2 rounded-md bg-bg-sunken px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Addiction resources</p>
          <p className="mt-1 text-sm leading-relaxed text-fg">
            {reported && onMap
              ? `Narcotic use was reported. ${onMap}.`
              : reported
                ? "Narcotic use was reported."
                : onMap
                  ? `${onMap}.`
                  : "Report narcotic use if the person says so. This desk does not infer it."}
          </p>
          {note ? <p className="mt-1 text-sm leading-relaxed text-muted">{note}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setReported((on) => !on);
            setCopied("");
          }}
          className="h-11 shrink-0 rounded-full bg-surface px-4 text-xs font-medium text-fg"
        >
          {reported ? "Clear the report" : "Narcotic use reported"}
        </button>
      </div>
      {open ? (
        <>
          {/* Quick-dial and Direct Service Chips */}
          <div className="flex flex-wrap gap-2">
            {LINES.filter(hasPhone).map((line) => (
              <a
                key={line.name}
                href={`tel:${line.phone}`}
                aria-label={`${line.name}, ${line.phoneLabel}`}
                className="inline-flex h-11 items-center rounded-full bg-ink px-3 text-xs font-medium text-bg hover:opacity-90"
              >
                {CHIP[line.name] ?? line.phoneLabel}
              </a>
            ))}
            <a
              href="https://nextdistro.org/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-full bg-surface px-3 text-xs font-medium text-accent hover:underline"
            >
              NEXT Distro Naloxone
            </a>
            <a
              href="https://nasen.org/map/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-full bg-surface px-3 text-xs font-medium text-accent hover:underline"
            >
              Syringe Access Map
            </a>
            <button
              type="button"
              onClick={() => void copyLines()}
              className="inline-flex h-11 items-center rounded-full bg-surface px-3 text-xs font-medium text-fg"
            >
              {copied === "ok" ? "Copied" : "Copy these lines"}
            </button>
          </div>

          {/* Localized State Matching & ZIP Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="tx-zip" className="text-xs text-muted">
              ZIP for a local referral
            </label>
            <input
              id="tx-zip"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              value={zip}
              placeholder="ZIP"
              onChange={(event) => {
                setZip(event.target.value.replace(/\D/g, "").slice(0, 5));
                setCopied("");
              }}
              className="h-11 w-24 rounded-full bg-surface px-3 text-sm text-fg"
            />
            <a
              href={zipReady ? `sms:435748?body=${zip}` : "sms:435748"}
              className="inline-flex h-11 items-center rounded-full bg-ink px-3 text-xs font-medium text-bg"
            >
              {zipReady ? `Text ${zip} to 435748` : "Text a ZIP to 435748"}
            </a>
            <a
              href="https://findtreatment.gov/locator"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-full bg-surface px-3 text-xs font-medium text-accent hover:underline"
            >
              {zipReady ? `Search ${zip} on the locator` : "Open the locator"}
            </a>
          </div>

          {/* State-specific Helpline Banner */}
          {stateRes ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/25 bg-surface px-3 py-2 text-xs">
              <div className="min-w-0">
                <span className="font-semibold text-fg">📍 {stateRes.name} ({stateRes.code}):</span>{" "}
                <span className="text-muted">{stateRes.helplineName}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <a
                  href={stateRes.tel}
                  className="inline-flex h-8 items-center rounded-full bg-ink px-3 text-[11px] font-medium text-bg hover:opacity-90"
                >
                  Call {stateRes.phone}
                </a>
                {stateRes.naloxoneUrl ? (
                  <a
                    href={stateRes.naloxoneUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-full bg-accent/15 px-3 text-[11px] font-medium text-accent hover:underline"
                  >
                    Free mail naloxone
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setView("help");
                    window.scrollTo({ top: 0 });
                  }}
                  className="inline-flex h-8 items-center rounded-full bg-bg-sunken px-2.5 text-[11px] font-medium text-muted hover:text-fg"
                >
                  All {stateRes.name} services →
                </button>
              </div>
            </div>
          ) : null}

          <p className="text-[11px] leading-relaxed text-subtle">
            {zipReady
              ? stateRes
                ? `Mapped to ${stateRes.name} via static in-browser table. The ZIP is not transmitted or stored. The text carries the ZIP. The locator link does not carry it. This desk does not look up a private facility.`
                : "No state mapped from static in-browser table. The ZIP is not transmitted or stored. The text carries the ZIP. The locator link does not carry it. This desk does not look up a facility."
              : "State matching uses a static in-browser table that does not transmit or store the ZIP. A ZIP can be texted to 435748."}
          </p>

          {copied === "fail" ? (
            <textarea
              readOnly
              value={handoff}
              rows={5}
              className="w-full rounded-md bg-surface px-3 py-2 text-xs leading-relaxed text-fg"
              aria-label="Public lines to copy by hand"
            />
          ) : null}

          {/* Service Directory Disclosure & Category Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setDetails((on) => !on)}
              className="h-10 text-left text-xs font-medium text-muted hover:text-fg"
              aria-expanded={details}
            >
              {details ? "Hide what each line does" : "What each line does"}
            </button>
            {details ? (
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "crisis", label: "Crisis (24/7)" },
                    { id: "treatment", label: "Treatment" },
                    { id: "harm", label: "Harm Reduction" },
                    { id: "specialty", label: "Veterans / Youth" },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`h-7 rounded-full px-2.5 text-[11px] font-medium ${
                      category === cat.id ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {details ? (
            <ul className="space-y-2">
              {filteredLines.map((line) => (
                <li key={line.name} className="rounded-md bg-surface px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-fg">{line.name}</p>
                    <span className="font-mono text-[10px] uppercase text-muted tracking-wider">
                      {line.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{line.detail}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {line.phone ? (
                      <a
                        href={`tel:${line.phone}`}
                        className="inline-flex h-8 items-center text-xs font-medium text-fg hover:underline"
                      >
                        {line.phoneLabel ?? line.phone}
                      </a>
                    ) : null}
                    <a
                      href={line.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center text-xs font-medium text-accent hover:underline"
                    >
                      {line.hrefLabel}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="text-[11px] leading-relaxed text-subtle">
            Public lines for the person. State lookup uses a static in-browser table that does not transmit or store the ZIP. This desk does not look up a facility, diagnose a substance use disorder, or pick a milligram or treatment. Naloxone is available without an individual prescription under standing orders across all 50 US states and DC.
          </p>
        </>
      ) : null}
    </div>
  );
}
