import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/** Source-level checks: hunts.ts imports Vite-bound commerce.ts, so it is not importable under node --test. */
const hunts = (await readFile(new URL("./hunts.ts", import.meta.url), "utf8")).replace(/\r\n/g, "\n");

function block(start: string, end: string) {
  const i = hunts.indexOf(start);
  assert.ok(i >= 0, `missing ${start}`);
  const j = hunts.indexOf(end, i);
  assert.ok(j > i, `missing end after ${start}`);
  return hunts.slice(i, j);
}

const dm = block("export function targetDm", "export function mailSubject");
const demo = block("export function oralKetamineDemoUrl", "\n}\n");

test("hunt DM states the free five-drug desk and founding $79 once", () => {
  assert.match(dm, /up to five drugs/i);
  assert.match(dm, /No card, no key/);
  assert.match(dm, /Founding is \$\$\{price\} once, not a subscription/);
  assert.match(dm, /payClose\(price\)/);
});

test("hunt DM never calls the paid tier Pro", () => {
  assert.doesNotMatch(dm, /\bPro\b/);
});

test("hunt DM carries the live desk and Pages URLs plus the public contact", () => {
  assert.match(dm, /Desk: \$\{SITE\.url\}/);
  assert.match(dm, /One-pager: \$\{SITE\.pages\}/);
  assert.match(dm, /OPERATOR\.email/);
  assert.match(hunts, /import \{[^}]*OPERATOR[^}]*\} from "\.\/commerce"/);
});

test("clinic DMs lead with the free oral ketamine demo; other host factors are founding", () => {
  assert.match(dm, /t\.prey === "clinic"/);
  assert.match(dm, /oralKetamineDemoUrl\(\)/);
  assert.match(dm, /oral ketamine × grapefruit/);
  assert.match(dm, /the other host factors/);
  assert.match(demo, /searchParams\.set\("sample", "gf-oral-ketamine"\)/);
  assert.match(demo, /siteUrl: string = SITE\.url/);
});
