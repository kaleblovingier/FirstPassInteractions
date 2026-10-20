/**
 * Package the existing label-quoted pair cards as a static SCORM 1.2 zip.
 * Uses only content already shipped on /pair pages (names, tier, mechanism,
 * label quote and its source) plus PAIR_DISCLAIMER verbatim. No new clinical
 * text. Pairs whose card text contains a dose or a price are skipped.
 * The package makes no network requests: no scripts load from any server, and
 * it writes nothing about the learner. It only tells the hosting LMS the page
 * was opened (LMSInitialize / LMSFinish) when an LMS API is present.
 *
 *   npx tsx scripts/lms/build-scorm.ts [--out dir]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PairPage } from "@/lib/seo/pair-pages";
import { scormCards } from "@/lib/lms/scorm-cards";
import { PAIR_DISCLAIMER } from "@/lib/seo/pair-copy";
import { makeZip } from "./zip.mjs";

const args = process.argv.slice(2);
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1]! : "dist-lms";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const { cards, skipped } = scormCards();

const SCORM_SHIM = `(function(){var w=window,a=null,n=0;while(w&&n<10){if(w.API){a=w.API;break}if(w===w.parent)break;w=w.parent;n++}
if(!a&&window.opener&&window.opener.API)a=window.opener.API;if(!a)return;a.LMSInitialize("");
a.LMSSetValue("cmi.core.lesson_status","completed");a.LMSCommit("");
window.addEventListener("pagehide",function(){try{a.LMSFinish("")}catch(e){}});})();`;

const css = `body{font-family:system-ui,sans-serif;line-height:1.5;max-width:46rem;margin:0 auto;padding:1rem;color:#111;background:#fff}
a{color:#0b57d0}a:focus-visible{outline:3px solid #0b57d0;outline-offset:2px}
li{margin-block:.25rem}li a{display:inline-block;min-height:24px;line-height:24px}
blockquote{margin:1rem 0;padding-left:1rem;border-left:4px solid #555}.disclaimer{font-size:.875rem;color:#333;margin-top:2rem}`;

const page = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'">
<title>${esc(title)}</title><link rel="stylesheet" href="style.css"><script src="scorm.js"></script></head>
<body><main>${body}<p class="disclaimer" data-testid="pair-disclaimer">${esc(PAIR_DISCLAIMER)}</p></main></body></html>
`;

function cardHtml(p: PairPage) {
  const q = p.quote!;
  return page(`${p.nameA} + ${p.nameB}`, `<p><a href="index.html">All pairs</a></p>
<h1>${esc(p.nameA)} + ${esc(p.nameB)}</h1>
<p><strong>${esc(p.severityLabel)}</strong></p>
<p>${esc(p.mechanism)}</p>
<h2>Label</h2>
<blockquote><p>${esc(q.quote)}</p></blockquote>
<p>${esc(q.labelDrug)}, ${esc(q.labelSection)}. Source: ${esc(q.url)}</p>`);
}

const files: { name: string; data: Buffer }[] = [];
const add = (name: string, s: string) => files.push({ name, data: Buffer.from(s, "utf8") });
add("style.css", css);
add("scorm.js", SCORM_SHIM);
add("index.html", page("Interaction pairs", `<h1>Interaction pairs</h1><ul>${cards
  .map((p) => `<li><a href="pairs/${p.slug}.html">${esc(p.nameA)} + ${esc(p.nameB)}</a></li>`).join("")}</ul>`));
for (const p of cards) add(`pairs/${p.slug}.html`, cardHtml(p).replace('href="index.html"', 'href="../index.html"').replace('href="style.css"', 'href="../style.css"').replace('src="scorm.js"', 'src="../scorm.js"'));

const resFiles = files.map((f) => `      <file href="${esc(f.name)}"/>`).join("\n");
const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="firstpass-pairs" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>FirstPass interaction pairs</title>
      <item identifier="item1" identifierref="res1"><title>Interaction pairs</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" type="webcontent" adlcp:scormtype="sco" href="index.html">
${resFiles}
    </resource>
  </resources>
</manifest>
`;
files.unshift({ name: "imsmanifest.xml", data: Buffer.from(manifest, "utf8") });

mkdirSync(outDir, { recursive: true });
const zipPath = join(outDir, "firstpass-pairs-scorm12.zip");
writeFileSync(zipPath, makeZip(files));
console.log(JSON.stringify({ zip: zipPath, cards: cards.length, skipped }, null, 1));
