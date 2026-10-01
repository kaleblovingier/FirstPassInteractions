import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/** Source-level checks (commerce.ts / hunts.ts are Vite-bound and not importable under node --test). */
const hunts = await readFile(new URL("./hunts.ts", import.meta.url), "utf8");
const commerce = await readFile(new URL("./commerce.ts", import.meta.url), "utf8");

function block(src: string, start: string, end: string) {
  const i = src.indexOf(start);
  assert.ok(i >= 0, `missing ${start}`);
  const j = src.indexOf(end, i);
  assert.ok(j > i, `missing end after ${start}`);
  return src.slice(i, j);
}

const directory = block(hunts, "export const DIRECTORY: Target[] = [", "\n];");
const parked = block(hunts, "export const PARKED: ParkedTarget[] = [", "\n];");
const recipes = block(hunts, "export const RECIPES = [", "] as const;");

test("parked targets are excluded from the active Hunt directory", () => {
  const parkedIds = [...parked.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(parkedIds.includes("phra"), "phra should be parked, not deleted");
  for (const id of parkedIds) {
    assert.doesNotMatch(directory, new RegExp(`id: "${id}"`), `${id} is parked but still active`);
  }
  // Every parked row carries the flag and a reason.
  const rows = parked.split(/\n  \{\n/).slice(1);
  assert.equal(rows.length, parkedIds.length);
  for (const row of rows) {
    assert.match(row, /parked: true/);
    assert.match(row, /reason: "[^"]*outside intended users/);
  }
  assert.doesNotMatch(directory, /parked: true/);
  assert.doesNotMatch(directory, /prey: "harm"/);
  assert.doesNotMatch(recipes, /prey: "harm"/);
});

test("active outreach helpers only read DIRECTORY", () => {
  const week = block(hunts, "export function weekTargets", "\n}\n");
  const filter = block(hunts, "export function filterDirectory", "\n}\n");
  for (const fn of [week, filter]) {
    assert.match(fn, /DIRECTORY/);
    assert.doesNotMatch(fn, /PARKED/);
  }
});

test("no sales post targets r/ketamine or other public/patient venues", () => {
  // Ignore code comments (the retarget note names the old sub); check live post data only.
  const posts = block(commerce, "export function launchPosts", "\n}\n")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  assert.doesNotMatch(posts, /r\/ketamine/i);
  assert.doesNotMatch(posts, /reddit\.com\/r\/ketamine/i);
  assert.match(posts, /r\/PharmacySchool/);
  // Every Reddit post carries a check-the-rules note and states the audience.
  const reddit = posts.split(/\n    \{\n/).filter((p) => /channel: "Reddit"/.test(p));
  assert.ok(reddit.length >= 2);
  for (const p of reddit) {
    assert.match(p, /Check sub rules before posting/);
    assert.match(p, /WHO_FOR/);
  }
});

test("sales copy never claims clinical review", () => {
  for (const src of [commerce, hunts]) {
    assert.doesNotMatch(src, /\b(reviewed by|vetted|pharmacist-built|clinician-reviewed|clinically reviewed)\b/i);
  }
});
