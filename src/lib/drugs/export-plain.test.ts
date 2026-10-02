import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPORT_COACH,
  EXPORT_DISCLAIMER,
  EXPORT_EMPTY,
  EXPORT_FILE_NOTE,
  EXPORT_FOOTER,
  EXPORT_HIGHEST_LABEL,
  EXPORT_PERSON_NOTE,
  EXPORT_SECTIONS,
  EXPORT_TITLE,
  arrowsToWords,
  buildExportReport,
} from "./export-plain.ts";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory.ts";

const COPY = [
  EXPORT_TITLE.plainTitle,
  EXPORT_TITLE.scientific,
  EXPORT_COACH.kicker,
  EXPORT_COACH.body,
  EXPORT_COACH.use,
  ...Object.values(EXPORT_SECTIONS).flatMap((s) => [s.plainTitle, s.scientific]),
  EXPORT_HIGHEST_LABEL,
  EXPORT_PERSON_NOTE,
  EXPORT_EMPTY,
  EXPORT_DISCLAIMER,
  EXPORT_FOOTER,
  EXPORT_FILE_NOTE,
];

const person = [{ label: "CYP2D6 metabolizer", value: "Normal (NM)" }];

test("plain title leads, scientific term kept alongside", () => {
  assert.equal(EXPORT_TITLE.plainTitle, "Teaching handout");
  assert.match(EXPORT_TITLE.scientific, /CYP450/);
  assert.equal(EXPORT_SECTIONS.person.plainTitle, "About this person");
  assert.match(EXPORT_SECTIONS.findings.scientific, /mechanism/);
});

test("coach says what is inside, huddle handout, label and prescriber govern", () => {
  assert.match(EXPORT_COACH.body, /tray/);
  assert.match(EXPORT_COACH.use, /teaching handout for team huddles/);
  assert.match(EXPORT_COACH.use, /labeling and the prescriber govern/);
});

test("empty state is not a green light", () => {
  assert.match(EXPORT_EMPTY, /short or empty report is not a green light/);
  assert.match(EXPORT_FILE_NOTE, /not a green light/);
});

test("guard: no doses, no safe-to-start, no Strong severity, no arrows", () => {
  const empty = buildExportReport({ names: "Ketamine", person, highestLabel: "Not mapped", findings: [] });
  for (const line of [...COPY, ...empty.split("\n")]) {
    assert.doesNotMatch(line, /\bmg\b|milligram/i, line);
    assert.doesNotMatch(line, /safe to (start|restart|resume)/i, line);
    assert.doesNotMatch(line, /\bStrong\b/, line);
    assert.doesNotMatch(line, /[→←↑↓⇒]|->/, line);
  }
});

test("arrows become words; text otherwise unchanged", () => {
  assert.equal(arrowsToWords("codeine → morphine"), "codeine leads to morphine");
  assert.equal(arrowsToWords("↑ parent level"), "higher parent level");
  assert.equal(arrowsToWords("↓ active metabolite"), "lower active metabolite");
  assert.equal(arrowsToWords("A -> B"), "A leads to B");
  assert.equal(arrowsToWords("no arrows here"), "no arrows here");
});

test("report keeps disclaimer, not-cleared notice and PI footer (with and without findings)", () => {
  const withFindings = buildExportReport({
    names: "Ketamine + Clarithromycin",
    person,
    highestLabel: "Serious concern",
    findings: [
      {
        severity: "Serious concern",
        headline: "Clarithromycin blocks CYP3A4",
        plain: "Ketamine may build up.",
        mechanism: "CYP3A4 inhibition → ↑ ketamine",
        clinical: "Watch sedation.",
      },
    ],
  });
  const empty = buildExportReport({ names: "", person, highestLabel: "Not mapped", findings: [] });
  for (const out of [withFindings, empty]) {
    assert.ok(out.includes(EXPORT_DISCLAIMER));
    assert.ok(out.includes(NOT_CLEARED));
    assert.ok(out.includes(PI_FOOTER));
    assert.ok(out.includes(EXPORT_FOOTER));
    assert.ok(out.includes(EXPORT_COACH.use));
  }
  assert.ok(empty.includes(EXPORT_EMPTY));
  assert.ok(!withFindings.includes(EXPORT_EMPTY));
  assert.match(withFindings, /Biggest concern on this tray: Serious concern/);
  assert.match(withFindings, /How it happens: CYP3A4 inhibition leads to higher ketamine\./);
  assert.match(withFindings, /In plain words: Ketamine may build up\./);
  assert.doesNotMatch(withFindings, /[→↑↓]/);
});

test("person note frames metabolizer status as a CPIC teaching summary, not a test result", () => {
  assert.match(EXPORT_PERSON_NOTE, /already knew/);
  assert.match(EXPORT_PERSON_NOTE, /teaching summary of CPIC guidance/);
  assert.match(EXPORT_PERSON_NOTE, /not a genetic test result/);
  const out = buildExportReport({ names: "Codeine", person, highestLabel: "Not mapped", findings: [] });
  assert.ok(out.includes(EXPORT_PERSON_NOTE));
});
