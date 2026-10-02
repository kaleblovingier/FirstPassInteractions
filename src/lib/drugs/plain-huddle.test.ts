import test from "node:test";
import assert from "node:assert/strict";
import {
  glossPlain,
  plainBrief,
  plainClockKind,
  plainLine,
  plainWashoutLead,
  huddleTextVisible,
} from "./plain-huddle.ts";
import type { WindowBrief } from "./window.ts";

test("plainLine glosses TDI and washout without inventing a dose", () => {
  const line = plainLine("CYP TDI linger — the enzyme was destroyed. Plan the washout.");
  assert.match(line, /blocks the enzyme for days, not hours/i);
  assert.match(line, /time to clear enough that the interaction eases/i);
  assert.doesNotMatch(line, /\b\d+\s*mg\b/i);
  assert.doesNotMatch(line, /stop the drug/i);
});

test("plainBrief remaps watch / counsel / consider lines", () => {
  const brief: WindowBrief = {
    mode: "mat",
    kicker: "OTP window",
    title: "Window briefing",
    highest: "major",
    names: "Methadone + Paxlovid",
    watch: ["CYP induction clock — start looks stolen over a week."],
    tell: "Reversible inhibition clears faster than TDI.",
    call: "Open the CYP tab. This desk is not a milligram.",
    tray: ["withdrawal watch"],
    quiet: false,
  };
  const plain = plainBrief(brief);
  assert.match(plain.watch[0]!, /ramps up over days after starting/i);
  assert.match(plain.tell, /blocks the enzyme while the drug is present/i);
  assert.match(plain.tell, /blocks the enzyme for days, not hours/i);
  assert.equal(plain.call, brief.call);
});

test("plainWashoutLead leads with everyday washout timing", () => {
  const lead = plainWashoutLead({
    ids: ["fluoxetine"],
    days: 35,
    label: "Norfluoxetine keeps CYP2D6 blocked for ~5 weeks after the last dose.",
  });
  assert.match(lead, /About 35 days/i);
  assert.match(lead, /time to clear enough that the interaction eases/i);
  assert.doesNotMatch(lead, /\b\d+\s*mg\b/i);
});

test("huddleTextVisible copies the mode on screen; clock gloss keeps the term", () => {
  const brief: WindowBrief = {
    mode: "clinic",
    kicker: "Clinic huddle",
    title: "Clinic briefing",
    highest: "moderate",
    names: "Clarithromycin + oral ketamine",
    watch: ["CYP TDI linger — yesterday’s last macrolide still raises oral victims."],
    tell: "Teaching only.",
    call: "Open the label.",
    tray: [],
    quiet: false,
  };
  const plainCopy = huddleTextVisible(brief, true);
  const techCopy = huddleTextVisible(brief, false);
  assert.match(plainCopy, /blocks the enzyme for days, not hours/i);
  assert.match(techCopy, /CYP TDI linger/);
  assert.equal(glossPlain("tdi"), "blocks the enzyme for days, not hours");
  assert.match(plainClockKind("tdi").title, /time-dependent inactivation/i);
});
