import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { logSafeError, safeErrorFields } from "./safe-log";

const realError = console.error;
let captured: string[] = [];
function capture() {
  captured = [];
  console.error = (...args: unknown[]) => {
    captured.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
}
afterEach(() => {
  console.error = realError;
});

const EMAIL = "patient.person@example.com";
const KEY = "FP-FOUNDING-ABCD-1234-SECRET";
const COOKIE = "better-auth.session_token=abc123.signedvalue";

describe("safe-log", () => {
  it("never emits message, stack, emails, keys or cookies", () => {
    capture();
    const err = Object.assign(new TypeError(`bad ${EMAIL} ${KEY} ${COOKIE}`), {
      code: "E_AUTH",
      cause: { email: EMAIL },
      body: { key: KEY },
    });
    logSafeError("[x] failed", err);
    logSafeError("[x] obj", { email: EMAIL, key: KEY, cookie: COOKIE, code: EMAIL });
    logSafeError("[x] str", `${EMAIL} ${KEY}`);
    const out = captured.join("\n");
    for (const s of [EMAIL, KEY, COOKIE, "signedvalue", "at "]) assert.ok(!out.includes(s), s);
    assert.match(out, /TypeError \(E_AUTH\)/);
  });

  it("rejects suspicious names and codes", () => {
    assert.deepEqual(safeErrorFields({ name: EMAIL, code: EMAIL }), { errorName: "Error" });
    assert.deepEqual(safeErrorFields("x"), { errorName: "string" });
    assert.deepEqual(safeErrorFields(Object.assign(new Error("m"), { status: 401 })), {
      errorName: "Error",
      errorCode: "401",
    });
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.server\.ts$|[\\/]routes[\\/]api[\\/].*\.ts$|[\\/]lib[\\/](db|server[\\/].*)\.ts$/.test(p) && !/\.test\.ts$/.test(p))
      out.push(p);
  }
  return out;
}

describe("server console calls", () => {
  it("never pass raw errors, emails, cookies, tokens, keys or bodies", () => {
    const bad: string[] = [];
    const files = walk("src");
    assert.ok(files.length > 5);
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const re = /console\.(log|info|warn|error|debug)\(([\s\S]*?)\);/g;
      for (const m of src.matchAll(re)) {
        const args = m[2];
        if (/^\s*line\s*$/.test(args)) continue; // log.ts JSON sink
        if (/(^|[\s,({])(err|error|e|email|cookie\w*|token\w*|key\w*|body|req|request|sub|signedCookie)\b(?!\s*[:=])/i.test(args.replace(/`[^`]*`|"[^"]*"|'[^']*'/g, "")))
          bad.push(`${f}: ${args.trim().slice(0, 80)}`);
      }
    }
    assert.deepEqual(bad, []);
  });
});
