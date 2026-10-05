import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/** Source-level checks (commerce.ts / hunts.ts are Vite-bound and not importable under node --test). */
const hunts = (await readFile(new URL("./hunts.ts", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
const commerce = (await readFile(new URL("./commerce.ts", import.meta.url), "utf8")).replace(/\r\n/g, "\n");

function block(src: string, start: string, end: string) {
  const i = src.indexOf(start);
  assert.ok(i >= 0, `missing ${start}`);
  const j = src.indexOf(end, i);
  assert.ok(j > i, `missing end after ${start}`);
  return src.slice(i, j);
}

const directory = block(hunts, "export const DIRECTORY: Target[] = [", "\n];");
// PARKED may be `= [];` on one line (empty) or a multi-line array.
const parkedStart = hunts.indexOf("export const PARKED: ParkedTarget[] = [");
assert.ok(parkedStart >= 0, "missing PARKED");
const parkedEnd = hunts.indexOf("];", parkedStart);
assert.ok(parkedEnd > parkedStart, "missing PARKED end");
const parked = hunts.slice(parkedStart, parkedEnd);
const recipes = block(hunts, "export const RECIPES = [", "] as const;");

test("harm-reduction targets are active on the Hunt directory (operator un-park)", () => {
  for (const id of ["phra", "kc-needle-exchange"]) {
    assert.match(directory, new RegExp(`id: "${id}"`), `${id} should be active`);
    assert.doesNotMatch(parked, new RegExp(`id: "${id}"`), `${id} should not be parked`);
  }
  assert.match(directory, /prey: "harm"/);
  assert.match(recipes, /id: "harm-puget"/);
  assert.match(recipes, /prey: "harm"/);
  assert.doesNotMatch(directory, /parked: true/);
  // PARKED may be empty; any remaining parked rows still carry the flag + reason.
  const parkedIds = [...parked.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
  const rows = parked.split(/\n {2}\{\n/).slice(1);
  assert.equal(rows.length, parkedIds.length);
  for (const row of rows) {
    assert.match(row, /parked: true/);
    assert.match(row, /reason: "[^"]+/);
  }
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
  const reddit = posts.split(/\n {4}\{\n/).filter((p) => /channel: "Reddit"/.test(p));
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
