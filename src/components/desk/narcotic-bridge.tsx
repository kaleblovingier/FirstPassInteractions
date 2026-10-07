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

function opioidOnDesk(ids: string[]) {
  return ids.some((id) => {
    const flags = DRUG_BY_ID[id]?.pd ?? [];
    return flags.includes("opioid") || flags.includes("partial-opioid");
  });
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

function linesText(note: string) {
  const body = LINES.map((line) => {
    const phone = "phoneLabel" in line ? `${line.phoneLabel}. ` : "";
    return `${line.name}. ${phone}${line.href}`;
  }).join("\n");
  return note ? `${note}\n${body}` : body;
}

export function NarcoticBridge({ ids, findings = [] }: { ids: string[]; findings?: Finding[] }) {
  const [reported, setReported] = useState(false);
  const [copied, setCopied] = useState<"ok" | "fail" | "">("");
  const [details, setDetails] = useState(false);
  const onMap = opioidOnDesk(ids);
  const open = reported || onMap;
  const note = open ? airwayNote(findings) : "";
  const handoff = linesText(note);

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
              ? "Narcotic use was reported, and an opioid is on this map."
              : reported
                ? "Narcotic use was reported."
                : onMap
                  ? "An opioid is on this map."
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
                {line.name === "SAMHSA National Helpline"
                  ? "SAMHSA 1-800-662-HELP"
                  : line.name === "988 Suicide & Crisis Lifeline"
                    ? "988 crisis"
                    : "Never Use Alone"}
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
            Public lines for the person. Not a diagnosis, not a treatment plan, and not a milligram. The report stays on this screen only.
          </p>
        </>
      ) : null}
    </div>
  );
}
