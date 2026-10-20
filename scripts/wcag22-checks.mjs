// Scripted WCAG 2.2 checks for criteria axe does not cover well:
// 1.4.10 reflow, 1.4.12 text spacing, 2.3.3 reduced motion, 2.5.8 target size, 2.4.11 focus not obscured.
// Usage: CHROME=/usr/bin/google-chrome node scripts/wcag22-checks.mjs <baseUrl> [path[@Button] ...]
import { chromium } from "playwright";
const [base, ...rest] = process.argv.slice(2);
if (!base) { console.error("usage: node scripts/wcag22-checks.mjs <baseUrl> [paths]"); process.exit(2); }
const paths = rest.length ? rest : ["/", "/recover", "/@Library", "/@Sources", "/pairs", "/for-programs"];
const browser = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ["--no-sandbox"] });
const SPACING = "*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}";
let fails = 0;
const report = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); };
async function open(spec, width, opts = {}) {
  const [path, click] = spec.split("@");
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: opts.reduce ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
  if (click) { await page.getByRole("button", { name: click, exact: true }).first().click(); await page.waitForTimeout(600); }
  return { ctx, page };
}
for (const spec of paths) for (const width of [320, 1280]) {
  const tag = `${spec} @${width}`;
  let { ctx, page } = await open(spec, width);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (width === 320) report(ov <= 0, `${tag} 1.4.10 no sideways scroll (${ov}px)`);
  // 2.5.8 target size: under 24x24 and its 24px box overlaps another target's box.
  const small = await page.evaluate(() => {
    const sel = "a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=checkbox],[role=switch],[tabindex]:not([tabindex='-1'])";
    const els = [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && !e.closest("p,li,td,dd,figcaption") ; });
    const boxes = els.map((e) => { const r = e.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2; return { e, r, b: { x: cx - 12, y: cy - 12, w: 24, h: 24 } }; });
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const out = [];
    for (const t of boxes) {
      if (t.r.width >= 24 && t.r.height >= 24) continue;
      const clash = boxes.some((o) => o !== t && !o.e.contains(t.e) && !t.e.contains(o.e) && hit(t.b, { x: o.r.x, y: o.r.y, w: o.r.width, h: o.r.height }));
      if (clash) out.push(`${t.e.tagName.toLowerCase()}${t.e.id ? "#" + t.e.id : ""} "${(t.e.getAttribute("aria-label") || t.e.textContent || "").trim().slice(0, 30)}" ${Math.round(t.r.width)}x${Math.round(t.r.height)}`);
    }
    return out;
  });
  report(small.length === 0, `${tag} 2.5.8 targets >=24px or spaced (${small.length})${small.length ? ": " + small.slice(0, 8).join("; ") : ""}`);
  // 2.4.11 focus not obscured: tab through; FAIL if fixed/sticky content fully covers the focused element.
  const hidden = [];
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press("Tab");
    const f = await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return { done: true };
      if (e.dataset.wcagSeen) return { done: true }; e.dataset.wcagSeen = "1";
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return {};
      const pts = [[r.x + 2, r.y + 2], [r.right - 2, r.y + 2], [r.x + 2, r.bottom - 2], [r.right - 2, r.bottom - 2], [r.x + r.width / 2, r.y + r.height / 2]]
        .filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
      if (!pts.length) return {};
      const covered = pts.every(([x, y]) => { const t = document.elementFromPoint(x, y); return t && !e.contains(t) && !t.contains(e); });
      return covered ? { bad: `${e.tagName.toLowerCase()} "${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 30)}"` } : {};
    });
    if (f.done) break; if (f.bad) hidden.push(f.bad);
  }
  report(hidden.length === 0, `${tag} 2.4.11 focused control never fully hidden (${hidden.length})${hidden.length ? ": " + hidden.slice(0, 5).join("; ") : ""}`);
  await ctx.close();
  // 1.4.12 text spacing.
  ({ ctx, page } = await open(spec, width));
  await page.addStyleTag({ content: SPACING }); await page.waitForTimeout(300);
  const ts = await page.evaluate(() => {
    const ov = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const clipped = [...document.querySelectorAll("body *")].filter((e) => {
      const s = getComputedStyle(e); if (!/(hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY)) return false;
      if (e.closest(".sr-only,.skip-link") || e.getClientRects().length === 0 || e.clientWidth <= 2) return false;
      if (s.textOverflow === "ellipsis" || /-webkit-box/.test(s.display)) return false;
      return e.textContent.trim() && (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2);
    }).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 3).join(".")}`);
    return { ov, clipped };
  });
  report((width !== 320 || ts.ov <= 0) && ts.clipped.length === 0, `${tag} 1.4.12 text spacing: sideways ${ts.ov}px, clipped ${ts.clipped.length}${ts.clipped.length ? ": " + ts.clipped.slice(0, 6).join("; ") : ""}`);
  await ctx.close();
  // 2.3.3 / 2.2.2 reduced motion: nothing keeps animating.
  ({ ctx, page } = await open(spec, width, { reduce: true }));
  const anim = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && (a.effect?.getComputedTiming().duration || 0) > 50).length);
  report(anim === 0, `${tag} reduced motion: running animations ${anim}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${fails} failed`);
process.exit(fails ? 1 : 0);
