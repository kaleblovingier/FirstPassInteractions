import { useState } from "react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import type { Finding } from "@/lib/drugs/types";

const LINES = [
  {
    name: "SAMHSA National Helpline",
    detail: "Free, confidential, 24/7 treatment referral in English and Spanish. TTY 1-800-487-4889. Text a ZIP code to 435748.",
    phone: "18006624357",
    phoneLabel: "1-800-662-HELP (4357)",
    href: "https://www.samhsa.gov/find-help/national-helpline",
    hrefLabel: "Helpline page",
  },
  {
    name: "FindTreatment.gov",
    detail: "State-licensed substance use and mental health treatment near a ZIP code.",
    href: "https://findtreatment.gov/",
    hrefLabel: "Find treatment",
  },
  {
    name: "988 Suicide & Crisis Lifeline",
    detail: "Call or text if the person is in crisis. 24/7.",
    phone: "988",
    phoneLabel: "Call or text 988",
    href: "https://988lifeline.org/",
    hrefLabel: "988lifeline.org",
  },
  {
    name: "Never Use Alone",
    detail: "A volunteer stays on the line while someone is using and calls for help if they stop answering. Also 877-696-1996. Not treatment.",
    phone: "18004843731",
    phoneLabel: "800-484-3731",
    href: "https://neverusealone.com/",
    hrefLabel: "neverusealone.com",
  },
  {
    name: "FindSupport.gov",
    detail: "SAMHSA’s starting point for mental health and substance use support. Not a treatment plan.",
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
  return "phone" in line;
}

const CHIP: Record<string, string> = {
  "SAMHSA National Helpline": "SAMHSA 1-800-662-HELP",
  "988 Suicide & Crisis Lifeline": "988 crisis",
  "Never Use Alone": "Never Use Alone 800-484-3731",
};

function linesText(note: string, zip: string) {
  const loc =
    zip.length === 5
      ? `Text ${zip} to 435748 for a SAMHSA referral. Type ${zip} at https://findtreatment.gov/locator — that link does not carry the ZIP.`
      : "Text a ZIP code to 435748. Search it at https://findtreatment.gov/locator";
  const body = LINES.map((line) => {
    const phone = "phoneLabel" in line ? `${line.phoneLabel}. ` : "";
    return `${line.name}. ${phone}${line.detail} ${line.href}`;
  }).join("\n");
  return [note, loc, body].filter(Boolean).join("\n");
}

export function NarcoticBridge({ ids, findings = [] }: { ids: string[]; findings?: Finding[] }) {
  const [reported, setReported] = useState(false);
  const [copied, setCopied] = useState<"ok" | "fail" | "">("");
  const [details, setDetails] = useState(false);
  const [zip, setZip] = useState("");
  const onMap = namedOpioids(ids);
  const open = reported || onMap;
  const note = open ? airwayNote(findings) : "";
  const handoff = linesText(note, zip);
  const zipReady = zip.length === 5;

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
          <div className="flex flex-wrap gap-2">
            {LINES.filter(hasPhone).map((line) => (
              <a
                key={line.name}
                href={`tel:${line.phone}`}
                aria-label={`${line.name}, ${line.phoneLabel}`}
                className="inline-flex h-11 items-center rounded-full bg-ink px-3 text-xs font-medium text-bg"
              >
                {CHIP[line.name] ?? line.phoneLabel}
              </a>
            ))}
            <button
              type="button"
              onClick={() => void copyLines()}
              className="inline-flex h-11 items-center rounded-full bg-surface px-3 text-xs font-medium text-fg"
            >
              {copied === "ok" ? "Copied" : "Copy these lines"}
            </button>
          </div>
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
          <p className="text-[11px] leading-relaxed text-subtle">
            {zipReady
              ? "The text carries the ZIP. The locator does not. Type it there. This desk does not look up a facility."
              : "A ZIP can be texted to 435748. It is not stored."}
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
          <button
            type="button"
            onClick={() => setDetails((on) => !on)}
            className="h-10 text-left text-xs font-medium text-muted hover:text-fg"
            aria-expanded={details}
          >
            {details ? "Hide what each line does" : "What each line does"}
          </button>
          {details ? (
          <ul className="space-y-2">
            {LINES.map((line) => (
              <li key={line.name} className="rounded-md bg-surface px-3 py-2.5">
                <p className="text-sm font-medium text-fg">{line.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{line.detail}</p>
                <a
                  href={line.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex h-10 items-center text-xs font-medium text-accent hover:underline"
                >
                  {line.hrefLabel}
                </a>
              </li>
            ))}
          </ul>
          ) : null}
          <p className="text-[11px] leading-relaxed text-subtle">
            Public lines for the person. The ZIP stays on this screen. This desk does not look up a facility, store the code, diagnose a substance use disorder, or pick a milligram.
          </p>
        </>
      ) : null}
    </div>
  );
}
