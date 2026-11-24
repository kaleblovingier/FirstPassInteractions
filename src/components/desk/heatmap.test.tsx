import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { analyze } from "@/lib/drugs/engine";
import { NO_SINGLE_HALF_LIFE } from "@/lib/drugs/half-lives";
import { DEFAULT_HOST, ENZYMES, type Drug, type Enzyme } from "@/lib/drugs/types";
import { findDoses } from "@/lib/guards/dose-rule";
import { CypHeatmap, PathwayDetailPanel } from "./heatmap";

const BANNED_REGULATORY_RE =
  /\b(?:FDA[- ]cleared|FDA[- ]registered|510\(k\)[- ]cleared|clinically (?:validated|proven|tested|verified)|medically reviewed|HIPAA[- ]compliant)\b/i;

const heatmapSource = readFileSync(new URL("./heatmap.tsx", import.meta.url), "utf8");

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function drugsByIds(ids: readonly string[]): Drug[] {
  return ids.map((id) => {
    const drug = DRUG_BY_ID[id];
    assert.ok(drug, `Expected catalog drug ${id}`);
    return drug;
  });
}

describe("CypHeatmap", () => {
  it("renders null when no drugs have mapped enzymes", () => {
    const unmappedDrug: Drug = {
      id: "test-unmapped",
      name: "Unmapped Agent",
      brands: [],
      cls: "Test class",
      aliases: [],
      enzymes: [],
      pd: [],
      toxicityHint: "",
      kind: "drug",
    };

    assert.equal(renderToStaticMarkup(<CypHeatmap drugs={[]} colliding={new Set()} />), "");
    assert.equal(renderToStaticMarkup(<CypHeatmap drugs={[unmappedDrug]} colliding={new Set()} />), "");
  });

  it("renders FDA potency tokens, prodrug ACT badge, t½ column, filters, and collision markers for codeine + fluoxetine + rifampin", () => {
    const ids = ["codeine", "fluoxetine", "rifampin"] as const;
    const drugs = drugsByIds(ids);
    const report = analyze([...ids], DEFAULT_HOST);
    const colliding = new Set<Enzyme>(
      report.burden.filter((b) => b.collisions > 0).map((b) => b.enzyme),
    );

    assert.ok(colliding.has("CYP2D6"), "Expected CYP2D6 collision");
    assert.ok(colliding.has("CYP3A4"), "Expected CYP3A4 collision");

    const html = renderToStaticMarkup(<CypHeatmap drugs={drugs} colliding={colliding} />);
    const text = stripTags(html);

    // Preserved landmarks and heading
    assert.match(html, /role="region" aria-label="Shared enzyme table"/);
    assert.match(html, /<h2[^>]*>Who shares which enzyme<\/h2>/);

    // Filter toggles with aria-pressed states
    assert.match(html, /role="group" aria-label="Filter enzyme pathways"/);
    assert.match(html, /aria-pressed="true"[^>]*><span>Active pathways<\/span>/);
    assert.match(html, new RegExp(`aria-pressed="false"[^>]*><span>All ${ENZYMES.length} pathways<\\/span>`));
    assert.match(html, /aria-pressed="false"[^>]*><span>Collisions only<\/span>/);
    assert.doesNotMatch(html, /disabled=""[^>]*><span>Collisions only<\/span>/);

    // Half-life column header and tabular-nums values
    assert.match(html, />t½<\/th>/);
    assert.match(html, /tabular-nums[^>]*><span[^>]*>3 h<\/span><\/td>/);
    assert.match(html, /tabular-nums[^>]*><span[^>]*>96 h<\/span><\/td>/);

    // Explicit FDA potency & prodrug activation badges
    assert.match(
      html,
      /title="Prodrug bioactivation via CYP2D6 \(sensitive\)"[^>]*>ACT<\/span>/,
    );
    assert.ok(text.includes("INH·STR"), "Expected strong inhibitor token for fluoxetine");
    assert.ok(text.includes("IND·STR"), "Expected strong inducer token for rifampin");
    assert.ok(text.includes("MAJ"), "Expected major substrate token for fluoxetine on CYP2D6");
    assert.ok(text.includes("MIN"), "Expected minor substrate token for codeine on CYP3A4");

    // Colliding column headers and colliding cell markers
    assert.match(html, /data-enzyme="CYP2D6" data-colliding="true"/);
    assert.match(html, /data-enzyme="CYP3A4" data-colliding="true"/);
    assert.match(html, /data-enzyme="P-gp" data-colliding="false"/);
    assert.match(html, /data-hit="true"[^>]*border-t-2 border-l-2 border-t-danger border-l-danger/);

    // Preserved summary count line and clickable atlas headers
    assert.ok(text.includes("On this tray:"));
    assert.ok(text.includes("2D6 2"));
    assert.ok(text.includes("3A4 3"));
    assert.ok(text.includes("P-gp 1"));
    assert.match(html, /title="Open CYP2D6 in the atlas"/);
    assert.match(html, /title="Open P-gp in the atlas"/);
  });

  it("renders NTI substrate flag, NO_SINGLE_HALF_LIFE tooltip, and disables Collisions only when colliding is empty", () => {
    const drugs = drugsByIds(["warfarin", "clopidogrel"]);
    const html = renderToStaticMarkup(<CypHeatmap drugs={drugs} colliding={new Set()} />);

    assert.match(html, /disabled=""[^>]*title="No active enzyme collisions on this tray"[^>]*><span>Collisions only<\/span>/);
    assert.match(html, />SENS<\/span>/);
    assert.match(html, />NTI<\/span>/);
    assert.match(html, />40 h<\/span>/);
    assert.ok(
      html.includes(NO_SINGLE_HALF_LIFE.clopidogrel!),
      "Expected non-linear/covalent half-life tooltip for clopidogrel",
    );
  });

  it("renders PathwayDetailPanel with prodrug bioactivation warning, FDA potency note, and Open in Atlas button", () => {
    const codeine = DRUG_BY_ID.codeine!;
    const fluoxetine = DRUG_BY_ID.fluoxetine!;

    const prodrugHtml = renderToStaticMarkup(
      <PathwayDetailPanel
        drug={codeine}
        enzyme="CYP2D6"
        colliding={true}
        onOpenAtlas={() => {}}
        onClose={() => {}}
      />,
    );
    const prodrugText = stripTags(prodrugHtml);
    assert.match(prodrugHtml, /role="region" aria-label="Selected pathway detail"/);
    assert.ok(prodrugText.includes("Codeine × CYP2D6"));
    assert.ok(prodrugText.includes("Prodrug bioactivation pathway"));
    assert.ok(prodrugText.includes("Open CYP2D6 in Atlas"));
    assert.ok(prodrugText.includes("Tray collision"));

    const inhHtml = renderToStaticMarkup(
      <PathwayDetailPanel
        drug={fluoxetine}
        enzyme="CYP2D6"
        colliding={true}
        onOpenAtlas={() => {}}
        onClose={() => {}}
      />,
    );
    const inhText = stripTags(inhHtml);
    assert.ok(inhText.includes("Fluoxetine × CYP2D6"));
    assert.ok(inhText.includes("Strong CYP2D6 inhibitor"));
    assert.ok(inhText.includes("≥5-fold"));
  });

  it("keeps source and rendered output free of administered doses and banned regulatory claims", () => {
    const drugs = drugsByIds(["codeine", "fluoxetine", "rifampin", "warfarin"]);
    const html = renderToStaticMarkup(<CypHeatmap drugs={drugs} colliding={new Set(["CYP2D6", "CYP3A4"])} />);
    const text = stripTags(html);

    assert.deepEqual(findDoses(heatmapSource), []);
    assert.deepEqual(findDoses(text), []);
    assert.equal(BANNED_REGULATORY_RE.test(heatmapSource), false);
    assert.equal(BANNED_REGULATORY_RE.test(html), false);
  });
});
