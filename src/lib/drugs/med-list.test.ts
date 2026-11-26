import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MED_LIST_MAX_CHARS, MED_LIST_MAX_ITEMS, matchMedList, matchMedListName, readMedList } from "./med-list";

const EHR = `Current Medications:
1. Lexapro (escitalopram) 10 mg tablet - take 1 tab PO daily
2) metoprolol succinate ER 25 mg PO once daily
• Aspirin 81mg daily
- Tylenol PM 2 tabs at bedtime PRN
Take 1 tab atorvastatin at bedtime
5-HTP 100 mg
10 mg daily
Allergies: penicillin`;

describe("readMedList - one name per item, doses dropped", () => {
  it("splits commas and reads an EHR block past numbers, bullets, strengths, schedules, headings and allergies", () => {
    assert.deepEqual(readMedList("lisinopril, metformin, atorvastatin").names, ["lisinopril", "metformin", "atorvastatin"]);
    assert.deepEqual(readMedList(EHR).names, ["Lexapro", "metoprolol succinate ER", "Aspirin", "Tylenol PM", "atorvastatin", "5-HTP"]);
  });

  it("never keeps a number or a unit in a name", () => {
    for (const name of readMedList(EHR).names) assert.doesNotMatch(name, /\b\d+\s*(mg|mcg|ml|units?)\b/i, name);
  });

  it("drops duplicates, empty input and dose-only lines", () => {
    assert.deepEqual(readMedList("Lexapro\nlexapro 20mg\n\n  ;,").names, ["Lexapro"]);
    assert.deepEqual(readMedList("   ").names, []);
    assert.deepEqual(readMedList("10 mg daily\n2 tabs PRN").names, []);
    assert.deepEqual(readMedList("oral contraceptive").names, ["oral contraceptive"]);
  });

  it("reads at most 40 items and a bounded amount of text", () => {
    const many = Array.from({ length: MED_LIST_MAX_ITEMS + 5 }, (_, i) => `item${String.fromCharCode(97 + (i % 26))}${i}`).join("\n");
    const read = readMedList(many);
    assert.equal(read.names.length, MED_LIST_MAX_ITEMS);
    assert.equal(read.more, 5);
    const huge = "warfarin\n" + "x".repeat(MED_LIST_MAX_CHARS * 5) + "\nlisinopril";
    assert.deepEqual(readMedList(huge).names, ["warfarin"]);
  });
});

describe("matchMedList - found only on an exact name, never on a guess", () => {
  const status = (name: string) => matchMedListName(name);

  it("finds generics, brands, salt and release forms and combination products; a street name is a choice", () => {
    const idsOf = (name: string) => {
      const row = status(name);
      return row.status === "found" ? row.ids : null;
    };
    assert.deepEqual(idsOf("Lexapro"), ["escitalopram"]);
    assert.deepEqual(idsOf("lisinopril"), ["lisinopril"]);
    const ms = status("metoprolol succinate ER");
    assert.equal(ms.status, "found");
    for (const [name, id] of [["Molly", "mdma"], ["K", "ketamine"]] as const) {
      const street = status(name);
      assert.ok(street.status === "check" && street.street === name && street.options[0]?.id === id, `${name} is a choice, not a match`);
    }
    const pm = status("Tylenol PM");
    assert.ok(pm.status === "found" && pm.combo && pm.ids.length >= 2, JSON.stringify(pm));
  });

  it("offers choices for a partial name and spellings for a near miss", () => {
    const partial = status("metop");
    assert.ok(partial.status === "check" && partial.options.length > 0 && partial.options.length <= 3);
    const typo = status("sertaline");
    assert.ok(typo.status === "missing" && typo.suggestions.some((s) => s.label === "Sertraline"), JSON.stringify(typo));
    const none = status("notadrugxyz");
    assert.ok(none.status === "missing");
  });

  it("reads and matches a whole list", () => {
    const { rows, more } = matchMedList(EHR);
    assert.equal(more, 0);
    assert.deepEqual(rows.map((r) => r.status), ["found", "found", "found", "found", "found", "found"]);
  });
});
