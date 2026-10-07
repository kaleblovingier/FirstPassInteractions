import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LINES, linesText } from "./narcotic-bridge";
import { resolveState } from "@/lib/drugs/help-resources";

describe("narcotic bridge and addiction service resources", () => {
  it("LINES definitions are well-formed and include verified public services", () => {
    assert.ok(LINES.length >= 8);

    for (const line of LINES) {
      assert.ok(line.name.length > 0);
      assert.ok(line.detail.length > 0);
      assert.ok(line.href.startsWith("https://"));
      assert.ok(line.hrefLabel.length > 0);
      assert.ok(["crisis", "treatment", "harm", "specialty"].includes(line.category));

      if (line.phone) {
        assert.match(line.phone, /^\d{3,11}$/);
        assert.ok(line.phoneLabel && line.phoneLabel.length > 0);
      }
    }
  });

  it("all service categories have active entries", () => {
    const categories = ["crisis", "treatment", "harm", "specialty"] as const;
    for (const cat of categories) {
      const entries = LINES.filter((l) => l.category === cat);
      assert.ok(entries.length >= 2, `Category ${cat} should have at least 2 resources`);
    }
  });

  it("linesText formats national lines, locator instructions, and harm reduction", () => {
    const text = linesText("", "");
    assert.match(text, /988 Suicide & Crisis Lifeline/);
    assert.match(text, /SAMHSA National Helpline/);
    assert.match(text, /Never Use Alone/);
    assert.match(text, /NEXT Distro/);
    assert.match(text, /Naloxone is available under pharmacy standing orders/);
    assert.match(text, /findtreatment\.gov/);
  });

  it("linesText includes localized state helpline and naloxone when state is resolved", () => {
    const wa = resolveState("98101");
    assert.ok(wa);
    assert.equal(wa.code, "WA");

    const textWa = linesText("", "98101", wa);
    assert.match(textWa, /Local State Resource \(Washington\)/);
    assert.match(textWa, /Washington Recovery Help Line/);
    assert.match(textWa, /1-866-789-1511/);
    assert.match(textWa, /Free mail naloxone \(WA\)/);

    const ca = resolveState("90210");
    assert.ok(ca);
    assert.equal(ca.code, "CA");

    const textCa = linesText("", "90210", ca);
    assert.match(textCa, /Local State Resource \(California\)/);
    assert.match(textCa, /1-800-855-2455/);
    assert.match(textCa, /https:\/\/nextdistro\.org\/california/);
  });

  it("resource copy adheres to non-diagnostic, educational posture", () => {
    for (const line of LINES) {
      const content = `${line.name} ${line.detail}`;
      assert.doesNotMatch(content, /prescribe\s+\d+\s*mg/i);
      assert.doesNotMatch(content, /diagnose/i);
      assert.doesNotMatch(content, /dispense/i);
    }
  });
});

