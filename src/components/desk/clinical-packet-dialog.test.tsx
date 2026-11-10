import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { analyze } from "@/lib/drugs/engine";
import { buildClinicalPacket, DOSE_PER_PI, type ClinicalPacketData } from "@/lib/drugs/clinical-packet";
import { DEFAULT_HOST } from "@/lib/drugs/types";
import { findDoses } from "@/lib/guards/dose-rule";
import {
  ClinicalPacketDialog,
  LabeledCollisionsSection,
  type LabeledCollisionAlertItem,
} from "./clinical-packet-dialog";

const BANNED_REGULATORY_RE =
  /\b(?:FDA[- ]registered|510\(k\)[- ]cleared|clinically (?:validated|proven|tested|verified)|medically reviewed|HIPAA[- ]compliant)\b/i;

const SAMPLE_LABELED_COLLISIONS: LabeledCollisionAlertItem[] = [
  {
    id: "tizanidine-fluvoxamine-1a2",
    kind: "safety",
    title: "Tizanidine + Fluvoxamine (Contraindicated CYP1A2 Inhibition)",
    severity: "contraindicated",
    tone: "danger",
    mechanism:
      "Fluvoxamine strongly inhibits CYP1A2 and markedly elevates systemic tizanidine exposure. Avoid doses such as 4 mg q8h together.",
    clinical: "Severe hypotension, bradycardia, and profound sedation.",
    watch: "Hold tizanidine and verify alternative muscle relaxant. Do not initiate at 2 mg orally.",
    source: "Tizanidine Prescribing Information (Section 4 & 7) · DailyMed",
  },
  {
    id: "arni-acei-angioedema",
    kind: "ward",
    title: "Sacubitril/Valsartan (Entresto) + Lisinopril (36-Hour Angioedema Washout)",
    severity: "major",
    tone: "warn",
    mechanism: "Dual neprilysin and ACE inhibition increases bradykinin accumulation.",
    clinical: "Elevated risk of life-threatening angioedema.",
    watch: "Maintain a strict 36-hour washout window between ACE inhibitor and ARNI therapy.",
    source: "Entresto Prescribing Information (Boxed Warning / Section 4) · DailyMed",
  },
];

const dialogSource = readFileSync(new URL("./clinical-packet-dialog.tsx", import.meta.url), "utf8");

describe("ClinicalPacketDialog SSR & WCAG 2.2 compliance", () => {
  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      <ClinicalPacketDialog
        open={false}
        onClose={() => {}}
        selected={["tizanidine", "fluvoxamine"]}
        host={DEFAULT_HOST}
        findings={[]}
      />,
    );
    assert.equal(html, "");
  });

  it("exposes modal dialog ARIA, clipboard status live region, and zero-dose / zero-claim copy for high-alert pairs", () => {
    const pairs: string[][] = [
      ["tizanidine", "fluvoxamine"],
      ["theophylline", "ciprofloxacin"],
      ["entresto", "lisinopril"],
    ];

    for (const ids of pairs) {
      const findings = analyze(ids, DEFAULT_HOST).findings;
      const packet = buildClinicalPacket(ids, DEFAULT_HOST, findings, {}) as ClinicalPacketData & {
        labeledCollisions?: LabeledCollisionAlertItem[];
      };

      const html = renderToStaticMarkup(
        <ClinicalPacketDialog
          open={true}
          onClose={() => {}}
          selected={ids}
          host={DEFAULT_HOST}
          findings={findings}
        />,
      );

      assert.match(html, /role="dialog"/, ids.join("+"));
      assert.match(html, /aria-modal="true"/, ids.join("+"));
      assert.match(html, /aria-labelledby="packet-dialog-title"/, ids.join("+"));
      assert.match(html, /<span[^>]*role="status"[^>]*aria-live="polite"[^>]*class="[^"]*sr-only[^"]*"/, ids.join("+"));
      assert.match(html, /Copy EHR Note/, ids.join("+"));
      assert.match(html, /Patient Handout/, ids.join("+"));

      if ((packet.labeledCollisions ?? []).length > 0) {
        assert.match(html, /High-Alert Labeled &amp; Institutional Safety Collisions/, ids.join("+"));
      }

      const textOnly = html.replace(/<[^>]+>/g, "\n");
      assert.deepEqual(findDoses(textOnly), [], `${ids.join("+")} leaked a dose in dialog markup`);
      assert.equal(BANNED_REGULATORY_RE.test(textOnly), false, `${ids.join("+")} leaked banned regulatory copy`);
    }
  });

  it("renders High-Alert Labeled & Institutional Safety Collisions with accessible tokens, non-color severity badges, Bedside Watch, and scrubbed doses", () => {
    const html = renderToStaticMarkup(<LabeledCollisionsSection items={SAMPLE_LABELED_COLLISIONS} />);

    assert.match(html, /High-Alert Labeled &amp; Institutional Safety Collisions/);
    assert.match(html, /2 alerts/);

    // WCAG 1.4.1 non-color cues: icon + text severity labels
    assert.match(html, /Avoid together/);
    assert.match(html, /Serious concern/);
    assert.match(html, /Labeled Safety Collision/);
    assert.match(html, /Institutional Safety Rail/);
    assert.match(html, /aria-hidden="true"/);

    // Accessible theme tokens
    assert.match(html, /border-danger bg-danger-soft/);
    assert.match(html, /border-warn bg-warn-soft/);
    assert.match(html, /text-danger/);
    assert.match(html, /text-warn/);

    // Titles wrap at 320px and Bedside Watch + Official PI Source render cleanly
    assert.match(html, /\[overflow-wrap:anywhere\][^"]*">Tizanidine \+ Fluvoxamine/);
    assert.match(html, /Bedside Watch:/);
    assert.match(html, /Official PI Source:/);
    assert.match(html, /Tizanidine Prescribing Information \(Section 4 &amp; 7\)/);
    assert.match(html, /Entresto Prescribing Information \(Boxed Warning \/ Section 4\)/);

    // withoutDose scrubs administered amounts from mechanism & watch
    assert.ok(html.includes(DOSE_PER_PI));
    assert.equal(html.includes("4 mg q8h"), false);
    assert.equal(html.includes("2 mg"), false);
    assert.deepEqual(findDoses(html.replace(/<[^>]+>/g, "\n")), []);
    assert.equal(BANNED_REGULATORY_RE.test(html), false);
  });

  it("renders nothing for an empty labeled collisions list and keeps component source free of doses or banned claims", () => {
    assert.equal(renderToStaticMarkup(<LabeledCollisionsSection items={[]} />), "");
    assert.deepEqual(findDoses(dialogSource), []);
    assert.equal(BANNED_REGULATORY_RE.test(dialogSource), false);
  });
});
