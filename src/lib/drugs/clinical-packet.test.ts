import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ClinicalPacketDialog } from "@/components/desk/clinical-packet-dialog";
import { buildClinicalPacket, DOSE_PER_PI, withoutDose } from "./clinical-packet";
import { DOSE_PATTERN } from "../guards/dose-rule";
import { analyze } from "./engine";
import { DEFAULT_HOST } from "./types";
import { EXPORT_EMPTY, EXPORT_NOT_A_DOSE, findingSourceLine } from "./brief";
import { NOT_CLEARED, PI_FOOTER } from "../regulatory";

test("buildClinicalPacket: formats empty tray gracefully with disclaimers", () => {
  const host = { ...DEFAULT_HOST };
  const findings = analyze([], host).findings;
  const packet = buildClinicalPacket([], host, findings, {});

  assert.equal(packet.regimen.length, 0);
  assert.ok(packet.ehrNoteText.includes("FIRSTPASS CLINICAL PHARMACOLOGY"));
  assert.ok(packet.ehrNoteText.includes("Regulatory Notice"));
  assert.ok(packet.patientHandoutText.includes("Patient Medication Information Guide"));
  assert.equal(packet.riskIndexes.mme.hasOpioid, false);
  assert.equal(packet.riskIndexes.cnsDepression.hasSynergy, false);
});

test("buildClinicalPacket: correctly evaluates opioids, MME warnings, and harm reduction", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["oxycodone", "fentanyl"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { oxycodone: "10 mg q4h" });

  assert.equal(packet.regimen.length, 2);
  const oxy = packet.regimen.find((r) => r.id === "oxycodone");
  assert.equal(oxy?.dose, "10 mg q4h");
  assert.equal(packet.riskIndexes.mme.hasOpioid, true);
  assert.ok(packet.riskIndexes.mme.warning !== null);
  assert.ok(packet.riskIndexes.harmReduction.hasStreetOrOpioid);
  assert.ok(packet.counselingPoints.some((p) => p.includes("naloxone")));
});

test("buildClinicalPacket: detects multi-sedative CNS depression and FDA boxed warning", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["alprazolam", "oxycodone"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, {});

  assert.equal(packet.riskIndexes.cnsDepression.hasSynergy, true);
  assert.ok(packet.riskIndexes.cnsDepression.boxedWarning?.includes("FDA Boxed Warning"));
  assert.ok(packet.ehrNoteText.includes("Synergistic CNS / Respiratory Depression: HIGH CONCERN"));
});

test("buildClinicalPacket: calculates anticholinergic cognitive burden (ACB) score and warnings", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["amitriptyline", "diphenhydramine"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, {});

  assert.ok(packet.riskIndexes.acb !== null);
  assert.ok(packet.riskIndexes.acb.totalScore >= 3);
  assert.equal(packet.riskIndexes.acb.riskLevel, "high");
  assert.ok(packet.ehrNoteText.includes("Anticholinergic Cognitive Burden (ACB): Total Score"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("dry mouth") || cp.includes("memory fog")));
});

test("buildClinicalPacket: evaluates QTc prolongation and host phenotypes", () => {
  const host = {
    ...DEFAULT_HOST,
    smoking: true,
    phenotypes: {
      ...DEFAULT_HOST.phenotypes,
      CYP2D6: "PM" as const,
    },
  };
  const ids = ["methadone", "citalopram"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, {});

  assert.ok(packet.riskIndexes.qt !== null);
  assert.ok(packet.riskIndexes.qt.score > 0);
  assert.ok(packet.hostSummary.smoking.includes("Daily Combusted Tobacco"));
  const cyp2d6 = packet.hostSummary.phenotypes.find((p) => p.enzyme === "CYP2D6");
  assert.equal(cyp2d6?.phenotype, "PM");
});

test("buildClinicalPacket: evaluates anticoagulants, DOAC renal rails, and bleed counseling", () => {
  const host = {
    ...DEFAULT_HOST,
    age: "geriatric" as const,
    kidney: "ckd" as const,
  };
  const ids = ["apixaban", "aspirin"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { apixaban: "5 mg BID" }, { activeBleeding: true });

  assert.equal(packet.riskIndexes.anticoagulation.hasAnticoagulant, true);
  assert.equal(packet.riskIndexes.anticoagulation.hasDoac, true);
  assert.ok(packet.riskIndexes.anticoagulation.report !== null);
  assert.ok(packet.ehrNoteText.includes("Anticoagulation & Bleed Risk Evaluation"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("blood thinner") || cp.includes("unusual bleeding")));
  assert.ok(packet.ehrNoteText.includes("Emergency Reversal"));
});

test("buildClinicalPacket: evaluates valproate saturable binding, VHE, and L-carnitine antidote guidance", () => {
  const host = { ...DEFAULT_HOST };
  const ids = ["valproate", "topiramate"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { valproate: "500 mg BID" });

  assert.ok(packet.ehrNoteText.includes("Valproate Pharmacokinetics & Hyperammonemia Evaluation"));
  assert.ok(packet.ehrNoteText.includes("L-Carnitine"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("hyperammonemia") || cp.includes("sluggishness")));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("spina bifida") || cp.includes("birth defects")));
});

test("buildClinicalPacket: evaluates potassium homeostasis, perpetrators, binders, and shifting guidance", () => {
  const host = {
    ...DEFAULT_HOST,
    kidney: "ckd" as const,
  };
  const ids = ["lisinopril", "spironolactone", "tmp-smx", "patiromer"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { lisinopril: "20 mg daily", spironolactone: "25 mg daily" });

  assert.equal(packet.riskIndexes.potassium.hasPotassiumIssue, true);
  assert.equal(packet.riskIndexes.potassium.hasBinder, true);
  assert.ok(packet.riskIndexes.potassium.report !== null);
  assert.ok(packet.riskIndexes.potassium.perpetrators.length >= 3);
  assert.ok(packet.ehrNoteText.includes("Potassium Homeostasis & Cardioprotective Shifting"));
  assert.ok(packet.ehrNoteText.includes("Intracellular Shifting: See the Prescribing Information.") && !packet.ehrNoteText.includes("Regular Insulin"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("salt substitutes") || cp.includes("potassium chloride")));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("Patiromer") && cp.includes("3 hours")));
});

test("buildClinicalPacket: evaluates SGLT2 inhibitor perioperative hold and euDKA counseling", () => {
  const host = {
    ...DEFAULT_HOST,
    kidney: "ckd" as const,
  };
  const ids = ["empagliflozin", "furosemide", "lisinopril"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, { empagliflozin: "25 mg daily" });

  assert.equal(packet.riskIndexes.sglt2.hasSglt2, true);
  assert.ok(packet.riskIndexes.sglt2.report !== null);
  assert.ok(packet.riskIndexes.sglt2.agents.some((a) => a.includes("Empagliflozin")));
  assert.ok(packet.ehrNoteText.includes("SGLT2 Inhibitor & Euglycemic DKA Evaluation"));
  assert.ok(packet.ehrNoteText.includes("Perioperative Rail"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("SGLT2") && cp.includes("surgery")));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("Euglycemic DKA") || cp.includes("blood sugar reading is completely normal")));
});

test("buildClinicalPacket: evaluates Tisdale QTc score, inpatient telemetry, and TdP resuscitation nomogram", () => {
  const host = {
    ...DEFAULT_HOST,
    age: "geriatric" as const,
  };
  const ids = ["methadone", "ondansetron", "furosemide"];
  const findings = analyze(ids, host).findings;
  const packet = buildClinicalPacket(ids, host, findings, {}, { activeTdp: true });

  assert.ok(packet.riskIndexes.qt !== null);
  assert.ok(packet.riskIndexes.qt.tisdale !== undefined);
  assert.equal(packet.riskIndexes.qt.tisdale.factors.some((f) => f.id === "ageGeriatric" && f.present), true);
  assert.equal(packet.riskIndexes.qt.tisdale.factors.some((f) => f.id === "loopDiuretic" && f.present), true);
  assert.equal(packet.riskIndexes.qt.tisdale.factors.some((f) => f.id === "twoOrMoreQtDrugs" && f.present), true);
  assert.ok(packet.ehrNoteText.includes("Tisdale Inpatient QTc Risk"));
  assert.ok(packet.ehrNoteText.includes("Acute TdP Resuscitation Directive: Magnesium Sulfate (See the Prescribing Information)"));
  assert.ok(packet.counselingPoints.some((cp) => cp.includes("fluttering in your chest") || cp.includes("racing heartbeat")));
});



test("buildClinicalPacket: the EHR note never pre-ticks a clinician attestation", () => {
  const ids = ["methadone", "alprazolam"];
  const packet = buildClinicalPacket(ids, DEFAULT_HOST, analyze(ids, DEFAULT_HOST).findings, {});
  assert.doesNotMatch(packet.ehrNoteText, /\[X\]/i);
  assert.equal(packet.ehrNoteText.match(/^\[ \] /gm)?.length, 5);
});

test("ClinicalPacketDialog: the attestation checklist opens unticked", () => {
  const ids = ["methadone", "alprazolam"];
  const html = renderToStaticMarkup(
    createElement(ClinicalPacketDialog, {
      open: true,
      onClose: () => {},
      selected: ids,
      host: DEFAULT_HOST,
      findings: analyze(ids, DEFAULT_HOST).findings,
    }),
  );
  assert.ok(html.includes("Clinical Verification &amp; Attestation"));
  assert.ok(html.includes('aria-pressed="false"'));
  assert.doesNotMatch(html, /aria-pressed="true"/);
});

test("buildClinicalPacket: an empty or unscored desk never reads as safe", () => {
  const ids = ["ondansetron"];
  const packet = buildClinicalPacket(ids, DEFAULT_HOST, [], {});
  assert.ok(packet.ehrNoteText.includes(EXPORT_EMPTY));
  assert.match(packet.ehrNoteText, /Anticholinergic Cognitive Burden: not scored\. .*not a computed zero/);
  assert.doesNotMatch(packet.ehrNoteText, /Burden: 0 |No additive QTc prolonging agents identified/);
});

test("buildClinicalPacket: printed findings carry a source and the note and handout say not a dose", () => {
  const ids = ["clarithromycin", "simvastatin", "methadone", "alprazolam"];
  const findings = analyze(ids, DEFAULT_HOST).findings;
  const packet = buildClinicalPacket(ids, DEFAULT_HOST, findings, {});
  const printed = findings.filter((f) => f.severity !== "minor");
  assert.ok(printed.length >= 2);
  assert.equal(packet.ehrNoteText.match(/^ {2}Source: /gm)?.length, printed.length);
  for (const f of printed) assert.ok(packet.ehrNoteText.includes(`  Source: ${findingSourceLine(f)}`), f.id);
  assert.ok(packet.ehrNoteText.includes(`${EXPORT_NOT_A_DOSE}\n${PI_FOOTER}`));
  assert.match(packet.patientHandoutText, /does not set or change any dose/);
  assert.match(packet.patientHandoutText, /Prescribing Information\) govern/);
});

test("ClinicalPacketDialog: the printed packet carries sources and the not-cleared / PI footer", () => {
  const ids = ["clarithromycin", "simvastatin"];
  const findings = analyze(ids, DEFAULT_HOST).findings;
  const html = renderToStaticMarkup(
    createElement(ClinicalPacketDialog, { open: true, onClose: () => {}, selected: ids, host: DEFAULT_HOST, findings }),
  );
  assert.ok(html.includes("Source: "));
  for (const s of [EXPORT_NOT_A_DOSE, NOT_CLEARED, PI_FOOTER]) assert.ok(html.includes(s.replace(/&/g, "&amp;")), s);
});

const DOAC_DESKS: [string[], typeof DEFAULT_HOST][] = [
  [["apixaban", "aspirin"], { ...DEFAULT_HOST, age: "geriatric", kidney: "ckd" }],
  [["rivaroxaban", "clarithromycin"], DEFAULT_HOST],
  [["dabigatran", "amiodarone"], { ...DEFAULT_HOST, kidney: "ckd" }],
  [["warfarin", "fluconazole"], DEFAULT_HOST],
  [["edoxaban"], DEFAULT_HOST],
];
const doseIn = (s: string) => new RegExp(DOSE_PATTERN.source).test(s);

test("withoutDose: keeps guidance sentences and replaces only the ones with a dose", () => {
  assert.equal(withoutDose("5 g IV administered as two consecutive 2.5 g / 50 mL IV infusions or boluses."), DOSE_PER_PI);
  assert.equal(withoutDose("Avoid use (CrCl <30 mL/min in acute VTE)"), "Avoid use (CrCl <30 mL/min in acute VTE)");
  assert.equal(
    withoutDose("Dose reduction indicated: Patient meets 2 of 3 criteria. Recommended dose is 2.5 mg PO BID."),
    `Dose reduction indicated: Patient meets 2 of 3 criteria. ${DOSE_PER_PI}`,
  );
});

test("buildClinicalPacket: reversal and TdP lines print only when the clinician marks bleeding or TdP", () => {
  const ids = ["apixaban", "methadone", "ondansetron"];
  const host = { ...DEFAULT_HOST, age: "geriatric" as const };
  const findings = analyze(ids, host).findings;
  const quiet = buildClinicalPacket(ids, host, findings, {});
  assert.doesNotMatch(quiet.ehrNoteText, /Emergency Reversal|Resuscitation Directive/);
  const marked = buildClinicalPacket(ids, host, findings, {}, { activeBleeding: true, activeTdp: true });
  assert.match(marked.ehrNoteText, /Emergency Reversal: Andexanet alfa \(Andexxa\) — No longer sold in the US/);
  assert.match(marked.ehrNoteText, /Acute TdP Resuscitation Directive/);
});

test("buildClinicalPacket: renal rails and reversal lines keep agent and status but never a computed dose", () => {
  for (const [ids, host] of DOAC_DESKS) {
    const p = buildClinicalPacket(ids, host, analyze(ids, host).findings, {}, { activeBleeding: true, activeTdp: true });
    const rails = p.ehrNoteText.split("\n").filter((l) => / Renal Rail: /.test(l));
    for (const l of rails) assert.match(l, /^ {2}\S.* Renal Rail: .+ \[[A-Z_-]+\]$/, l);
    // Only the static label line on which tablet strengths go with food may still name a strength.
    const dosed = p.ehrNoteText.split("\n").filter((l) => doseIn(l) && !/Administration Note:/.test(l));
    assert.deepEqual(dosed, [], ids.join("+"));
    assert.ok(p.ehrNoteText.includes("Emergency Reversal: "), ids.join("+"));
  }
});

const BANNED_REGULATORY_RE =
  /\b(?:FDA[- ]registered|510\(k\)[- ]cleared|clinically (?:validated|proven|tested|verified)|medically reviewed|HIPAA[- ]compliant)\b/i;

test("ClinicalPacketDialog: bleeding and TdP marks start off and the printed card shows no computed dose", () => {
  for (const [ids, host] of DOAC_DESKS) {
    const html = renderToStaticMarkup(
      createElement(ClinicalPacketDialog, { open: true, onClose: () => {}, selected: ids, host, findings: analyze(ids, host).findings }),
    );
    assert.ok(html.includes("Active bleeding") && html.includes("Torsades de pointes (TdP)"));
    assert.doesNotMatch(html, /Emergency Reversal Pathway/);
    const text = html.replace(/<[^>]+>/g, "\n").split("\n").filter(doseIn);
    assert.deepEqual(text, [], ids.join("+"));
  }
});

test("buildClinicalPacket: captures wardsOnDesk and safetyOnDesk in labeledCollisions sorted by severity, tone, kind, and title", () => {
  const arniPacket = buildClinicalPacket(
    ["sacubitril-valsartan", "lisinopril"],
    DEFAULT_HOST,
    analyze(["sacubitril-valsartan", "lisinopril"], DEFAULT_HOST).findings,
    {},
  );
  assert.ok(arniPacket.labeledCollisions?.some((c) => c.kind === "ward" && c.id === "arni-acei" && c.severity === "contraindicated"));

  const theoPacket = buildClinicalPacket(
    ["theophylline", "ciprofloxacin"],
    DEFAULT_HOST,
    analyze(["theophylline", "ciprofloxacin"], DEFAULT_HOST).findings,
    {},
  );
  assert.ok(theoPacket.labeledCollisions?.some((c) => c.kind === "safety" && c.id === "theophylline-cyp1a2" && c.severity === "contraindicated"));

  const tizPacket = buildClinicalPacket(
    ["tizanidine", "fluvoxamine"],
    DEFAULT_HOST,
    analyze(["tizanidine", "fluvoxamine"], DEFAULT_HOST).findings,
    {},
  );
  assert.ok(tizPacket.labeledCollisions?.some((c) => c.kind === "safety" && c.id === "tizanidine-cyp1a2" && c.severity === "contraindicated"));

  // Combined regimen verifying deterministic ordering:
  // contraindicated before major before moderate; danger before warn; safety before ward; title.localeCompare
  const multiIds = [
    "sacubitril-valsartan",
    "lisinopril",
    "tizanidine",
    "fluvoxamine",
    "theophylline",
    "ciprofloxacin",
    "vancomycin",
    "piperacillin-tazobactam",
    "clopidogrel",
    "omeprazole",
    "semaglutide",
    "insulin-glargine",
  ];
  const multiPacket = buildClinicalPacket(multiIds, DEFAULT_HOST, analyze(multiIds, DEFAULT_HOST).findings, {});
  const items = multiPacket.labeledCollisions ?? [];
  assert.deepEqual(
    items.map((c) => `${c.severity}:${c.tone}:${c.kind}:${c.id}`),
    [
      "contraindicated:danger:safety:theophylline-cyp1a2",
      "contraindicated:danger:safety:tizanidine-cyp1a2",
      "contraindicated:danger:ward:arni-acei",
      "major:danger:ward:vanco-zosyn",
      "major:warn:safety:clopidogrel-ppi",
      "moderate:warn:ward:glp-insulin",
    ],
  );
});

test("buildClinicalPacket: renders HIGH-ALERT LABELED & INSTITUTIONAL SAFETY COLLISIONS in ehrNoteText with Mechanism, Bedside Watch, and Source", () => {
  const cases: { ids: string[]; expectedId: string; expectedBadge: string }[] = [
    { ids: ["sacubitril-valsartan", "lisinopril"], expectedId: "arni-acei", expectedBadge: "[AVOID TOGETHER]" },
    { ids: ["theophylline", "ciprofloxacin"], expectedId: "theophylline-cyp1a2", expectedBadge: "[AVOID TOGETHER]" },
    { ids: ["tizanidine", "fluvoxamine"], expectedId: "tizanidine-cyp1a2", expectedBadge: "[AVOID TOGETHER]" },
    { ids: ["vancomycin", "piperacillin-tazobactam"], expectedId: "vanco-zosyn", expectedBadge: "[SERIOUS CONCERN]" },
  ];

  for (const { ids, expectedId, expectedBadge } of cases) {
    const packet = buildClinicalPacket(ids, DEFAULT_HOST, analyze(ids, DEFAULT_HOST).findings, {});
    const alert = packet.labeledCollisions?.find((c) => c.id === expectedId);
    assert.ok(alert, `Expected labeled collision ${expectedId}`);

    assert.ok(packet.ehrNoteText.includes("[HIGH-ALERT LABELED & INSTITUTIONAL SAFETY COLLISIONS]"), ids.join("+"));
    assert.ok(packet.ehrNoteText.includes(expectedBadge), ids.join("+"));
    assert.ok(packet.ehrNoteText.includes(alert.title), ids.join("+"));
    assert.ok(packet.ehrNoteText.includes(`Mechanism: ${withoutDose(alert.mechanism)}`), ids.join("+"));
    assert.ok(packet.ehrNoteText.includes(`Bedside Watch: ${withoutDose(alert.watch)}`), ids.join("+"));
    assert.ok(packet.ehrNoteText.includes(`Source: ${alert.source}`), ids.join("+"));
    assert.ok(!packet.ehrNoteText.includes(EXPORT_EMPTY), ids.join("+"));
  }

  // Even if caller passes empty findings while labeled collisions exist, labeled collisions still print without EXPORT_EMPTY.
  const arniEmptyFindings = buildClinicalPacket(["sacubitril-valsartan", "lisinopril"], DEFAULT_HOST, [], {});
  assert.ok(arniEmptyFindings.ehrNoteText.includes("[HIGH-ALERT LABELED & INSTITUTIONAL SAFETY COLLISIONS]"));
  assert.ok(!arniEmptyFindings.ehrNoteText.includes(EXPORT_EMPTY));

  // Empty desk still outputs EXPORT_EMPTY and omits labeled collision header.
  const emptyPacket = buildClinicalPacket([], DEFAULT_HOST, [], {});
  assert.equal(emptyPacket.labeledCollisions?.length, 0);
  assert.ok(emptyPacket.ehrNoteText.includes(EXPORT_EMPTY));
  assert.ok(!emptyPacket.ehrNoteText.includes("[HIGH-ALERT LABELED & INSTITUTIONAL SAFETY COLLISIONS]"));
});

test("buildClinicalPacket: counselingPoints and patientHandoutText surface non-dosing, zero-claim high-alert guidance without duplicating opioid/benzo warnings", () => {
  const arniPacket = buildClinicalPacket(
    ["sacubitril-valsartan", "lisinopril"],
    DEFAULT_HOST,
    analyze(["sacubitril-valsartan", "lisinopril"], DEFAULT_HOST).findings,
    {},
  );
  assert.ok(arniPacket.counselingPoints.some((cp) => /angioedema|swelling of the face/i.test(cp)));
  assert.ok(/angioedema|swelling of the face/i.test(arniPacket.patientHandoutText));

  const theoPacket = buildClinicalPacket(
    ["theophylline", "ciprofloxacin"],
    DEFAULT_HOST,
    analyze(["theophylline", "ciprofloxacin"], DEFAULT_HOST).findings,
    {},
  );
  assert.ok(theoPacket.counselingPoints.some((cp) => /theophylline/i.test(cp) && /seizures/i.test(cp)));
  assert.ok(/theophylline/i.test(theoPacket.patientHandoutText));

  const tizPacket = buildClinicalPacket(
    ["tizanidine", "fluvoxamine"],
    DEFAULT_HOST,
    analyze(["tizanidine", "fluvoxamine"], DEFAULT_HOST).findings,
    {},
  );
  assert.ok(tizPacket.counselingPoints.some((cp) => /tizanidine/i.test(cp) && /blood pressure/i.test(cp)));
  assert.ok(/tizanidine/i.test(tizPacket.patientHandoutText));

  // Opioid + benzo should not emit duplicate overdose/naloxone/benzo points from safetyOnDesk
  const opBenzoPacket = buildClinicalPacket(
    ["oxycodone", "alprazolam"],
    DEFAULT_HOST,
    analyze(["oxycodone", "alprazolam"], DEFAULT_HOST).findings,
    {},
  );
  assert.equal(opBenzoPacket.counselingPoints.filter((cp) => /naloxone/i.test(cp)).length, 1);
  assert.equal(opBenzoPacket.counselingPoints.filter((cp) => /sedative|benzodiazepines/i.test(cp)).length, 2);

  // Overlapping ward + safety hits (meropenem + valproate) should deduplicate patient counseling
  const carbVpaPacket = buildClinicalPacket(
    ["meropenem", "valproate"],
    DEFAULT_HOST,
    analyze(["meropenem", "valproate"], DEFAULT_HOST).findings,
    {},
  );
  assert.equal(carbVpaPacket.labeledCollisions?.length, 2);
  assert.equal(
    carbVpaPacket.counselingPoints.filter((cp) => /Carbapenem antibiotics can cause valproate levels to drop/i.test(cp)).length,
    1,
  );

  // Verify zero DOSE_PATTERN leaks and zero banned regulatory claims across packets and dialog SSR
  for (const ids of [
    ["sacubitril-valsartan", "lisinopril"],
    ["theophylline", "ciprofloxacin"],
    ["tizanidine", "fluvoxamine"],
    ["oxycodone", "alprazolam"],
    ["meropenem", "valproate"],
  ]) {
    const findings = analyze(ids, DEFAULT_HOST).findings;
    const packet = buildClinicalPacket(ids, DEFAULT_HOST, findings, {});
    for (const cp of packet.counselingPoints) {
      assert.equal(doseIn(cp), false, `${ids.join("+")} counseling leaked dose: ${cp}`);
      assert.equal(BANNED_REGULATORY_RE.test(cp), false, `${ids.join("+")} counseling leaked regulatory claim: ${cp}`);
    }
    assert.deepEqual(
      packet.ehrNoteText.split("\n").filter(doseIn),
      [],
      `${ids.join("+")} ehrNoteText leaked dose`,
    );
    assert.deepEqual(
      packet.patientHandoutText.split("\n").filter(doseIn),
      [],
      `${ids.join("+")} patientHandoutText leaked dose`,
    );
    assert.equal(BANNED_REGULATORY_RE.test(packet.ehrNoteText), false, `${ids.join("+")} ehrNoteText leaked regulatory claim`);
    assert.equal(BANNED_REGULATORY_RE.test(packet.patientHandoutText), false, `${ids.join("+")} patientHandoutText leaked regulatory claim`);

    const html = renderToStaticMarkup(
      createElement(ClinicalPacketDialog, { open: true, onClose: () => {}, selected: ids, host: DEFAULT_HOST, findings }),
    );
    assert.ok(html.includes("High-Alert Labeled &amp; Institutional Safety Collisions"), ids.join("+"));
    const dialogText = html.replace(/<[^>]+>/g, "\n").split("\n").filter(doseIn);
    assert.deepEqual(dialogText, [], `${ids.join("+")} dialog leaked dose`);
  }
});

test("buildClinicalPacket: renders Round 6 & Round 7 high-alert pairs into labeledCollisions, ehrNoteText, counselingPoints, and patientHandoutText with zero dose leaks or banned claims", () => {
  const cases: {
    ids: string[];
    expectedId: string;
    expectedSeverity: "contraindicated" | "major";
    counselingPattern: RegExp;
  }[] = [
    {
      ids: ["ergotamine", "ritonavir"],
      expectedId: "ergot-strong-3a4",
      expectedSeverity: "contraindicated",
      counselingPattern: /blood-vessel spasms.*fingers or toes/i,
    },
    {
      ids: ["phenelzine", "pseudoephedrine"],
      expectedId: "maoi-tyramine-sympathomimetic",
      expectedSeverity: "contraindicated",
      counselingPattern: /spike in blood pressure.*never stop your MAOI abruptly/i,
    },
    {
      ids: ["amiodarone", "warfarin"],
      expectedId: "amiodarone-warfarin",
      expectedSeverity: "major",
      counselingPattern: /Never stop amiodarone or warfarin on your own.*INR/i,
    },
    {
      ids: ["isoniazid", "acetaminophen"],
      expectedId: "isoniazid-acetaminophen",
      expectedSeverity: "major",
      counselingPattern: /liver injury.*never stop isoniazid/i,
    },
    {
      ids: ["ivabradine", "diltiazem"],
      expectedId: "ivabradine-cyp3a4-ndhp-ccb",
      expectedSeverity: "contraindicated",
      counselingPattern: /ivabradine.*slow your heartbeat.*never stop your prescribed heart medicines abruptly/i,
    },
    {
      ids: ["glipizide", "tmp-smx"],
      expectedId: "sulfonylurea-cyp2c9-hypoglycemia",
      expectedSeverity: "major",
      counselingPattern: /drops in blood sugar.*days afterward/i,
    },
    {
      ids: ["phenytoin", "fluconazole"],
      expectedId: "phenytoin-cyp2c9-inhibition",
      expectedSeverity: "major",
      counselingPattern: /Never stop taking phenytoin on your own.*severe seizures/i,
    },
    {
      ids: ["amlodipine", "clarithromycin"],
      expectedId: "dihydropyridine-ccb-macrolide-hypotension",
      expectedSeverity: "major",
      counselingPattern: /dangerously low blood pressure and kidney strain.*never stop your blood pressure medicine on your own/i,
    },
    {
      ids: ["naltrexone", "oxycodone"],
      expectedId: "naltrexone-opioid-precipitated-overdose",
      expectedSeverity: "contraindicated",
      counselingPattern: /precipitated withdrawal.*override that blockade.*breathing arrest and overdose/i,
    },
  ];

  for (const { ids, expectedId, expectedSeverity, counselingPattern } of cases) {
    const findings = analyze(ids, DEFAULT_HOST).findings;
    const packet = buildClinicalPacket(ids, DEFAULT_HOST, findings, {});

    const alert = packet.labeledCollisions?.find((c) => c.id === expectedId);
    assert.ok(alert, `Expected labeled collision ${expectedId} for ${ids.join("+")}`);
    assert.equal(alert.severity, expectedSeverity, expectedId);
    assert.equal(alert.tone, "danger", expectedId);

    assert.ok(packet.ehrNoteText.includes("[HIGH-ALERT LABELED & INSTITUTIONAL SAFETY COLLISIONS]"), expectedId);
    assert.ok(packet.ehrNoteText.includes(withoutDose(alert.title)), expectedId);
    assert.ok(packet.ehrNoteText.includes(`Mechanism: ${withoutDose(alert.mechanism)}`), expectedId);
    assert.ok(packet.ehrNoteText.includes(`Bedside Watch: ${withoutDose(alert.watch)}`), expectedId);
    assert.ok(packet.ehrNoteText.includes(`Official PI Source: ${withoutDose(alert.source)}`), expectedId);

    assert.ok(
      !packet.counselingPoints.some((cp) => cp.startsWith("High-alert medication interaction (")),
      `${expectedId} fell back to generic counseling instead of dedicated entry`,
    );
    assert.ok(
      packet.counselingPoints.some((cp) => counselingPattern.test(cp)),
      `${expectedId} missing expected dedicated counseling point`,
    );
    assert.match(packet.patientHandoutText, counselingPattern, `${expectedId} missing counseling in patientHandoutText`);

    for (const cp of packet.counselingPoints) {
      assert.equal(doseIn(cp), false, `${expectedId} counseling leaked dose: ${cp}`);
      assert.equal(BANNED_REGULATORY_RE.test(cp), false, `${expectedId} counseling leaked regulatory claim: ${cp}`);
    }
    assert.deepEqual(packet.ehrNoteText.split("\n").filter(doseIn), [], `${expectedId} ehrNoteText leaked dose`);
    assert.deepEqual(packet.patientHandoutText.split("\n").filter(doseIn), [], `${expectedId} patientHandoutText leaked dose`);
    assert.equal(BANNED_REGULATORY_RE.test(packet.ehrNoteText), false, `${expectedId} ehrNoteText leaked claim`);
    assert.equal(BANNED_REGULATORY_RE.test(packet.patientHandoutText), false, `${expectedId} patientHandoutText leaked claim`);

    const html = renderToStaticMarkup(
      createElement(ClinicalPacketDialog, { open: true, onClose: () => {}, selected: ids, host: DEFAULT_HOST, findings }),
    );
    assert.ok(html.includes("High-Alert Labeled &amp; Institutional Safety Collisions"), expectedId);
    assert.deepEqual(html.replace(/<[^>]+>/g, "\n").split("\n").filter(doseIn), [], `${expectedId} dialog leaked dose`);
    assert.equal(BANNED_REGULATORY_RE.test(html), false, `${expectedId} dialog leaked claim`);
  }

  // Naltrexone + opioid should keep a single generic naloxone line while preserving the acute blockade-override warning
  const naltrexoneOxyPacket = buildClinicalPacket(
    ["naltrexone", "oxycodone"],
    DEFAULT_HOST,
    analyze(["naltrexone", "oxycodone"], DEFAULT_HOST).findings,
    {},
  );
  assert.equal(naltrexoneOxyPacket.counselingPoints.filter((cp) => /naloxone/i.test(cp)).length, 1);
  assert.equal(
    naltrexoneOxyPacket.counselingPoints.filter((cp) => /override that blockade/i.test(cp)).length,
    1,
  );

  // Complementary warfarin CYP2C9 warnings: rapid TMP-SMX + prolonged amiodarone both surface cleanly
  const multiWarfarinPacket = buildClinicalPacket(
    ["amiodarone", "warfarin", "tmp-smx"],
    DEFAULT_HOST,
    analyze(["amiodarone", "warfarin", "tmp-smx"], DEFAULT_HOST).findings,
    {},
  );
  assert.ok(multiWarfarinPacket.counselingPoints.some((cp) => /within days/i.test(cp)));
  assert.ok(multiWarfarinPacket.counselingPoints.some((cp) => /months even after amiodarone is stopped/i.test(cp)));
});
