// End-to-end runner: serves the existing local build (npm run build first) with test-only env stubs,
// runs every scripts/e2e/*.e2e.mjs, stops the server, exits 1 on any failure.
//   CHROME=/usr/bin/google-chrome npx tsx scripts/e2e/run.mjs [name ...]
// The license pepper is a throwaway test value, never a real secret; nothing talks to Stripe.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const port = await new Promise((r) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const pepper = "e2e-test-pepper-not-a-secret";
const env = { ...process.env, LICENSE_PEPPER: pepper, FOUNDER_PIN: "e2e-test-pin", STRIPE_SECRET_KEY: "", RESEND_API_KEY: "" };
const server = spawn("npm", ["run", "preview", "--", "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { cwd: root, env, detached: true, stdio: "ignore" });
const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(base + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
process.env.E2E_BASE = base;
process.env.E2E_LICENSE_PEPPER = pepper;
const { launch, failures } = await import("./lib.mjs");
const wanted = process.argv.slice(2);
const files = fs.readdirSync(here).filter((f) => f.endsWith(".e2e.mjs")).filter((f) => !wanted.length || wanted.some((w) => f.startsWith(w)));
const browser = await launch();
for (const f of files) {
  console.log(`\n# ${f}`);
  try { await (await import(path.join(here, f))).default(browser); } catch (e) { console.log(`FAIL ${f} threw: ${String(e.message).split("\n")[0]}`); process.exitCode = 1; }
}
await browser.close();
try { process.kill(-server.pid); } catch {}
const n = failures();
console.log(`\ne2e: ${files.length} files, ${n} failed`);
process.exit(n || process.exitCode ? 1 : 0);
