import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CHIP, LINES, linesText } from "./narcotic-bridge";
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

  it("Spanish route uses 988 (Press 2) and texts AYUDA without legacy 888 number", () => {
    const spanish = LINES.find((l) => l.name === "Línea de Prevención en Español");
    assert.ok(spanish, "Spanish lifeline must be present");
    assert.equal(spanish.phone, "988");
    assert.equal(spanish.phoneLabel, "988 (Press 2)");
    assert.match(spanish.detail, /988/);
    assert.match(spanish.detail, /presione 2|Press 2/i);
    assert.match(spanish.detail, /AYUDA/);
    assert.equal(spanish.href, "https://988lifeline.org/help-yourself/en-espanol/");
    assert.equal(CHIP["Línea de Prevención en Español"], "Español 988 (Press 2)");

    // Ensure legacy number is completely absent from all definitions and chips
    const allText = JSON.stringify(LINES) + JSON.stringify(CHIP);
    assert.doesNotMatch(allText, /628-9454|18886289454/);
  });

  it("verifies all core public lines, numbers, and text instructions", () => {
    const byName = Object.fromEntries(LINES.map((l) => [l.name, l]));

    // 988 Suicide & Crisis Lifeline: tel:988, text 988
    const line988 = byName["988 Suicide & Crisis Lifeline"];
    assert.ok(line988);
    assert.equal(line988.phone, "988");
    assert.match(line988.phoneLabel ?? "", /988/);
    assert.match(line988.detail, /988/);
    assert.equal(line988.href, "https://988lifeline.org/");
    assert.equal(CHIP["988 Suicide & Crisis Lifeline"], "988 crisis");

    // Veterans Crisis Line: tel:988 (Press 1), text 838255
    const vet = byName["Veterans Crisis Line"];
    assert.ok(vet);
    assert.equal(vet.phone, "988");
    assert.equal(vet.phoneLabel, "988 (Press 1)");
    assert.match(vet.detail, /838255/);
    assert.equal(vet.href, "https://www.veteranscrisisline.net/");
    assert.equal(CHIP["Veterans Crisis Line"], "Veterans 988 (Press 1)");

    // Trevor Project: tel:18664887386, text START to 678-678
    const trevor = byName["Trevor Project Lifeline"];
    assert.ok(trevor);
    assert.equal(trevor.phone, "18664887386");
    assert.equal(trevor.phoneLabel, "866-488-7386");
    assert.match(trevor.detail, /START/i);
    assert.match(trevor.detail, /678-678/);
    assert.equal(trevor.href, "https://www.thetrevorproject.org/get-help/");
    assert.equal(CHIP["Trevor Project Lifeline"], "Trevor Project 866-488-7386");

    // Never Use Alone: 800-484-3731
    const nua = byName["Never Use Alone"];
    assert.ok(nua);
    assert.equal(nua.phone, "18004843731");
    assert.equal(nua.phoneLabel, "800-484-3731");
    assert.equal(nua.href, "https://neverusealone.com/");
    assert.equal(CHIP["Never Use Alone"], "Never Use Alone 800-484-3731");

    // NEXT Distro: https://nextdistro.org/
    const nextDistro = byName["NEXT Distro (Mail Naloxone)"];
    assert.ok(nextDistro);
    assert.equal(nextDistro.href, "https://nextdistro.org/");
    assert.equal(CHIP["NEXT Distro (Mail Naloxone)"], "NEXT Distro Naloxone");

    // NASEN Syringe Access Map: https://nasen.org/map/
    const nasen = byName["NASEN Syringe Access Map"];
    assert.ok(nasen);
    assert.equal(nasen.href, "https://nasen.org/map/");
    assert.equal(CHIP["NASEN Syringe Access Map"], "Syringe Access Map");

    // SAMHSA Helpline: 1-800-662-4357, text ZIP to 435748
    const samhsa = byName["SAMHSA National Helpline"];
    assert.ok(samhsa);
    assert.equal(samhsa.phone, "18006624357");
    assert.match(samhsa.phoneLabel ?? "", /1-800-662/);
    assert.match(samhsa.detail, /435748/);
    assert.equal(samhsa.href, "https://www.samhsa.gov/find-help/national-helpline");
    assert.equal(CHIP["SAMHSA National Helpline"], "SAMHSA 1-800-662-HELP");

    // FindTreatment.gov: https://findtreatment.gov/
    const findTx = byName["FindTreatment.gov"];
    assert.ok(findTx);
    assert.equal(findTx.href, "https://findtreatment.gov/");

    // FindSupport.gov: https://findsupport.gov/
    const findSupp = byName["FindSupport.gov"];
    assert.ok(findSupp);
    assert.equal(findSupp.href, "https://findsupport.gov/");
  });

  it("linesText formats national lines, locator instructions, static table notice, and harm reduction", () => {
    const text = linesText("", "");
    assert.match(text, /988 Suicide & Crisis Lifeline/);
    assert.match(text, /SAMHSA National Helpline/);
    assert.match(text, /Never Use Alone/);
    assert.match(text, /NEXT Distro/);
    assert.match(text, /Naloxone is available under pharmacy standing orders/);
    assert.match(text, /findtreatment\.gov/);
    assert.match(text, /static in-browser table/);
    assert.match(text, /does not transmit or store the ZIP/);
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

  it("resource copy adheres to non-diagnostic, educational posture and does not pick milligrams or treatments", () => {
    for (const line of LINES) {
      const content = `${line.name} ${line.detail}`;
      assert.doesNotMatch(content, /prescribe\s+\d+\s*mg/i);
      assert.doesNotMatch(content, /diagnose/i);
      assert.doesNotMatch(content, /dispense/i);
      assert.doesNotMatch(content, /\b\d+\s*mg\b/i);
    }
  });
});

