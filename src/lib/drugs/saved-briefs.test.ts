import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSavedBriefSnapshot,
  readSavedBriefs,
  saveBriefSnapshot,
  SAVED_BRIEFS_KEY,
} from "./saved-briefs.ts";

test("saved briefs are sanitized and deduplicated by tray and title", () => {
  const first = buildSavedBriefSnapshot({
    ids: ["ketamine", "alprazolam", "grapefruit"],
    names: "Ketamine + alprazolam + grapefruit",
    highest: "contraindicated",
    summary: "Avoid together — CYP3A4 inhibition plus sedation.",
    hostLine: "Oral route",
    url: "https://example.test/?brief=ketamine,alprazolam",
  });

  const again = buildSavedBriefSnapshot({
    ids: ["ketamine", "alprazolam", "grapefruit"],
    names: "Ketamine + alprazolam + grapefruit",
    highest: "contraindicated",
    summary: "Avoid together — CYP3A4 inhibition plus sedation.",
    hostLine: "Oral route",
    url: "https://example.test/?brief=ketamine,alprazolam",
  });

  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.clear();
  }

  const afterFirst = saveBriefSnapshot(first);
  const afterDuplicate = saveBriefSnapshot(again);

  assert.equal(afterFirst.length, 1);
  assert.equal(afterDuplicate.length, 1);
  assert.equal(afterDuplicate[0]?.ids.join(","), "ketamine,alprazolam,grapefruit");
  assert.equal(afterDuplicate[0]?.hostLine, "Oral route");

  const stored = readSavedBriefs();
  assert.equal(stored.length, 1);
  assert.equal(stored[0]?.url, "https://example.test/?brief=ketamine,alprazolam");
  assert.equal(stored[0]?.key, `${SAVED_BRIEFS_KEY}:ketamine,alprazolam,grapefruit`);
});

test("saved briefs keep the newest entries first and respect the cap", () => {
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.clear();
  }

  const snapshots = Array.from({ length: 12 }, (_, index) =>
    buildSavedBriefSnapshot({
      ids: [`drug-${index}`],
      names: `Drug ${index}`,
      highest: index % 2 === 0 ? "major" : "minor",
      summary: `Case ${index}`,
      url: `https://example.test/${index}`,
    }),
  );

  const saved = snapshots.reduce<ReturnType<typeof readSavedBriefs>>((acc, snapshot) => {
    const next = saveBriefSnapshot(snapshot, acc);
    return next;
  }, []);

  assert.equal(saved.length, 8);
  assert.equal(saved[0]?.names, "Drug 11");
  assert.equal(saved[7]?.names, "Drug 4");
  assert.ok(saved.every((entry) => entry.ids.length > 0));
});
