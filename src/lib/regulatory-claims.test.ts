/** Fails when shipped copy makes a regulatory or review claim FirstPass cannot make.
 *  FirstPass is non-device CDS. It is not FDA-cleared or FDA-approved, and no
 *  clinician has reviewed it (docs/regulatory/gap-assessment.md, section 5).
 *  A sentence passes only when it negates the claim ("Not an FDA-cleared device")
 *  or quotes a label about a different product ("An FDA-cleared test ... is not
 *  currently available"). */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { INTENDED_USE, INTENDED_USERS, NOT_CLEARED, PI_FOOTER, WARNINGS } from "./regulatory.ts";
import { WHO_FOR } from "./billing/commerce.ts";

const ROOT = join(import.meta.dirname, "..", "..");

const BANNED: { name: string; re: RegExp }[] = [
  { name: "FDA-cleared", re: /\bFDA[- ]cleared\b/gi },
  { name: "FDA-registered", re: /\bFDA[- ]registered\b/gi },
  { name: "510(k) cleared", re: /\b510\(k\)[- ]cleared\b/gi },
  {
    name: "product called FDA-approved",
    re: /\b(?:FirstPass|this (?:desk|software|tool|app|reference|checker))\b[^.]{0,60}\bFDA[- ]approved\b/gi,
  },
  { name: "FDA-approved software", re: /\bFDA[- ]approved (?:software|app|device|tool|desk|checker)\b/gi },
  { name: "clinically validated", re: /\bclinically (?:validated|proven|tested|verified)\b/gi },
  { name: "medically reviewed", re: /\bmedically reviewed\b/gi },
  {
    name: "reviewed by a clinician",
    re: /\b(?:reviewed|vetted|validated|approved|checked|built) by (?:a |an |our |licensed )?(?:pharmacists?|clinicians?|physicians?|doctors?|PharmDs?|nurses?)\b/gi,
  },
  {
    name: "clinician-reviewed",
    re: /\b(?:pharmacist|clinician|physician|doctor|PharmD)[- ](?:reviewed|built|vetted|approved|validated|verified)\b/gi,
  },
  { name: "HIPAA compliant", re: /\bHIPAA[- ]compliant\b/gi },
];

/** A sentence that negates the claim is the disclaimer, not the claim. */
const NEGATION =
  /\b(?:not|no|never|nor|without|isn['’]t|aren['’]t|hasn['’]t|doesn['’]t|cannot|can['’]t|neither|none)\b/i;

function sentenceAround(text: string, index: number, length: number): string {
  const before = text.slice(0, index);
  const after = text.slice(index + length);
  const start = Math.max(before.lastIndexOf(". "), before.lastIndexOf("\n"), before.lastIndexOf('"'), 0);
  const ends = [after.indexOf(". "), after.indexOf("\n"), after.indexOf('"')].filter((n) => n >= 0);
  const end = ends.length ? Math.min(...ends) : after.length;
  return `${before.slice(start)}${text.slice(index, index + length)}${after.slice(0, end)}`;
}

function claimHits(text: string): string[] {
  const hits: string[] = [];
  for (const { name, re } of BANNED) {
    for (const m of text.matchAll(re)) {
      const sentence = sentenceAround(text, m.index ?? 0, m[0].length);
      if (NEGATION.test(sentence)) continue;
      hits.push(`${name}: ${sentence.trim().slice(0, 160)}`);
    }
  }
  return hits;
}

/** Sentences about a third party, not about FirstPass. Each entry names the file and the exact words. */
const ABOUT_SOMEONE_ELSE: { file: string; words: string }[] = [
  // A donated-medicine repository describing its own pharmacists. Not a claim about this desk.
  { file: "src/lib/drugs/healthcare-resources.ts", words: "Pharmacist-verified safety, seal inspection" },
];

function allowed(file: string, hit: string): boolean {
  return ABOUT_SOMEONE_ELSE.some((a) => a.file === file && hit.includes(a.words));
}

function shippedFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.(?:tsx?|html|json|md)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
    .map((e) => join(e.parentPath ?? (e as unknown as { path: string }).path, e.name))
    .filter((p) => !p.includes("node_modules"));
}

test("the claim scan catches a positive claim and lets a disclaimer through", () => {
  assert.equal(claimHits("FirstPass is FDA-cleared.").length, 1);
  assert.equal(claimHits("Every pair is reviewed by pharmacists.").length, 1);
  assert.equal(claimHits("Clinically validated interaction grades.").length, 1);
  assert.equal(claimHits("This desk is an FDA approved reference.").length, 1);
  assert.equal(claimHits("Not an FDA-cleared medical device.").length, 0);
  assert.equal(claimHits("FirstPass is not FDA-cleared and not FDA-approved.").length, 0);
  assert.equal(claimHits("Confirm against the FDA-approved Prescribing Information.").length, 0);
});

test("shipped copy makes no regulatory or clinical-review claim", () => {
  const hits: string[] = [];
  for (const dir of ["src", "public"]) {
    for (const file of shippedFiles(join(ROOT, dir))) {
      // Forward slashes, so the allow-list matches on Windows too.
      const rel = file.slice(ROOT.length + 1).replaceAll("\\", "/");
      for (const hit of claimHits(readFileSync(file, "utf8"))) {
        if (!allowed(rel, hit)) hits.push(`${rel}: ${hit}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

test("the labeling block keeps the not-cleared line and names the intended users once", () => {
  assert.match(NOT_CLEARED, /has not been cleared or approved by the U\.S\. Food and Drug Administration/);
  assert.match(PI_FOOTER, /Not FDA-cleared/);
  assert.match(WARNINGS[0], /not FDA-cleared and not FDA-approved/);
  assert.ok(INTENDED_USE.includes("licensed healthcare professionals"));
  assert.equal(WHO_FOR, INTENDED_USERS);
});
