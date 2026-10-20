/**
 * Renders 1200x630 PNG share images into public/og/ for every pair page, drug hub,
 * /pairs and /for-programs (satori -> SVG -> resvg -> PNG). Content-hash cache in
 * public/og/.cache.json: unchanged images are skipped, stale ones removed.
 * Usage: tsx scripts/og-images.ts [outDir]
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { OG_HEIGHT, OG_WIDTH, ogImageJobs, type OgImageJob } from "../src/lib/seo/og";

const require = createRequire(import.meta.url);
const fontDir = join(dirname(require.resolve("@fontsource/inter/package.json")), "files");
const fonts = [
  { name: "Inter", data: readFileSync(join(fontDir, "inter-latin-400-normal.woff")), weight: 400 as const, style: "normal" as const },
  { name: "Inter", data: readFileSync(join(fontDir, "inter-latin-700-normal.woff")), weight: 700 as const, style: "normal" as const },
];
const RENDER_VERSION = "3";

const GRADE_COLOR: Record<string, string> = {
  contraindicated: "#b91c1c", major: "#c2410c", moderate: "#a16207", minor: "#1d4ed8", none: "#475569",
};

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

function tree(j: OgImageJob): Node {
  const hl = j.heading.length;
  const size = hl > 60 ? 54 : hl > 40 ? 64 : 76;
  return h("div", { width: "100%", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "#f8fafc", color: "#0f172a", fontFamily: "Inter" }, [
    h("div", { display: "flex", alignItems: "center", justifyContent: "space-between" }, [
      h("div", { fontSize: 40, fontWeight: 700, color: "#0f766e" }, "FirstPass"),
      h("div", { fontSize: 26, color: "#475569" }, j.kicker),
    ]),
    h("div", { display: "flex", flexDirection: "column" }, [
      h("div", { fontSize: size, fontWeight: 700, lineHeight: 1.1 }, j.heading),
      h("div", { fontSize: 30, color: "#334155", marginTop: 20 }, j.sub),
      ...(j.gradeLabel
        ? [h("div", { display: "flex", marginTop: 28 }, [h("div", { fontSize: 32, fontWeight: 700, color: "#fff", background: GRADE_COLOR[j.severity ?? "none"] ?? "#475569", padding: "10px 24px", borderRadius: 12 }, j.gradeLabel)])]
        : []),
    ]),
    h("div", { display: "flex", fontSize: 24, color: "#475569", borderTop: "2px solid #cbd5e1", paddingTop: 20, whiteSpace: "nowrap" }, j.disclaimer),
  ]);
}

export async function renderOg(j: OgImageJob): Promise<Buffer> {
  const svg = await satori(tree(j) as never, { width: OG_WIDTH, height: OG_HEIGHT, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: OG_WIDTH } }).render().asPng();
}

export async function generate(outRoot = "public") {
  const t0 = Date.now();
  const ogDir = join(outRoot, "og");
  mkdirSync(ogDir, { recursive: true });
  const cacheFile = join(ogDir, ".cache.json");
  const cache: Record<string, string> = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
  const next: Record<string, string> = {};
  let rendered = 0;
  for (const j of ogImageJobs()) {
    const file = join(outRoot, j.path);
    const key = createHash("sha1").update(RENDER_VERSION + JSON.stringify(j)).digest("hex");
    next[j.path] = key;
    if (cache[j.path] === key && existsSync(file)) continue;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, await renderOg(j));
    rendered++;
  }
  for (const f of readdirSync(ogDir, { recursive: true }) as string[]) {
    const p = "/" + relative(outRoot, join(ogDir, f)).split("\\").join("/");
    if (p.endsWith(".png") && !next[p]) rmSync(join(ogDir, f));
  }
  writeFileSync(cacheFile, JSON.stringify(next));
  const total = Object.keys(next).length;
  console.log(`[og] ${total} share images (${rendered} rendered, ${total - rendered} cached) in ${Date.now() - t0} ms`);
  return { total, rendered };
}

if (process.argv[1] && /og-images\.ts$/.test(process.argv[1])) {
  generate(process.argv[2]).catch((e) => { console.error(e); process.exit(1); });
}
