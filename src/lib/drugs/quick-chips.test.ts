import test from "node:test";
import assert from "node:assert/strict";
import { availableQuickChips, plainWordsReport, SEARCH_QUICK_CHIPS } from "./quick-chips.ts";

test("quick chips skip items already on the tray", () => {
  const chips = availableQuickChips(["ketamine", "grapefruit"], 8);
  assert.equal(chips.some((c) => c.id === "ketamine"), false);
  assert.equal(chips.some((c) => c.id === "grapefruit"), false);
  assert.ok(chips.some((c) => c.id === "clarithromycin"));
});

test("every default chip exists in the catalog", () => {
  const all = availableQuickChips([], 20);
  assert.equal(all.length, SEARCH_QUICK_CHIPS.length);
});

test("plain words report includes disclaimer and findings", () => {
  const text = plainWordsReport("Ketamine + Clarithromycin", [
    {
      severity: "Avoid together",
      headline: "Ketamine and clarithromycin",
      plain: "In plain English: this pair can make one medicine build up.",
    },
  ], "Avoid together");
  assert.match(text, /Highest concern/);
  assert.match(text, /Educational model/);
  assert.match(text, /plain English/);
});
