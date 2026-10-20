// Validate a SCORM 1.2 zip: zip integrity (CRC), imsmanifest.xml at root,
// SCORM 1.2 schema markers, every resource file present, no remote fetches,
// disclaimer on every page, no doses or prices.
//   node scripts/lms/validate-scorm.mjs path/to.zip
import { readFileSync } from "node:fs";
import { crc32, inflateRawSync } from "node:zlib";
import { hasDose, hasPrice } from "./content-guard.mjs";

export function readZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("no end-of-central-directory record");
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad central header");
    const method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nl);
    const ds = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const raw = buf.subarray(ds, ds + csize);
    const data = method === 8 ? inflateRawSync(raw) : raw;
    if (crc32(data) !== crc) throw new Error(`CRC mismatch: ${name}`);
    files.set(name, data);
    p += 46 + nl + el + cl;
  }
  return files;
}

export function validate(buf, { disclaimer } = {}) {
  const errors = [];
  const files = readZip(buf);
  const m = files.get("imsmanifest.xml")?.toString("utf8");
  if (!m) return ["imsmanifest.xml missing at zip root"];
  if (!/^<\?xml version="1.0"/.test(m)) errors.push("manifest lacks XML declaration");
  for (const s of ['xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"', 'xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"',
    "<schema>ADL SCORM</schema>", "<schemaversion>1.2</schemaversion>", 'adlcp:scormtype="sco"'])
    if (!m.includes(s)) errors.push(`manifest missing ${s}`);
  const def = m.match(/<organizations default="([^"]+)"/)?.[1];
  if (!def || !m.includes(`<organization identifier="${def}"`)) errors.push("default organization not found");
  for (const [, ref] of m.matchAll(/identifierref="([^"]+)"/g))
    if (!m.includes(`<resource identifier="${ref}"`)) errors.push(`item references missing resource ${ref}`);
  for (const [, h] of m.matchAll(/href="([^"]+)"/g)) if (!files.has(h)) errors.push(`manifest href not in zip: ${h}`);
  for (const [name, data] of files) {
    if (name.startsWith("/") || name.includes("..")) errors.push(`unsafe path ${name}`);
    if (!/\.(html|css|js)$/.test(name)) continue;
    const t = data.toString("utf8");
    if (/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|document\.cookie)\b/.test(t)) errors.push(`${name}: network or storage API`);
    if (/(?:src|href)="(?:https?:)?\/\//i.test(t) || /url\(\s*['"]?(?:https?:)?\/\//i.test(t)) errors.push(`${name}: loads a remote resource`);
    if (name.endsWith(".html")) {
      if (disclaimer && !t.includes(disclaimer)) errors.push(`${name}: disclaimer missing`);
      const text = t.replace(/<[^>]+>/g, " ");
      if (hasDose(text)) errors.push(`${name}: dose string`);
      if (hasPrice(text)) errors.push(`${name}: price string`);
      if (!/<html lang="/.test(t) || !/<title>[^<]+<\/title>/.test(t)) errors.push(`${name}: missing lang or title`);
    }
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = validate(readFileSync(process.argv[2]), {
    disclaimer: "Educational reference only. Not FDA-cleared. The Prescribing Information governs.",
  });
  for (const e of errors) console.error("FAIL", e);
  console.log(errors.length ? `${errors.length} problems` : "SCORM 1.2 package OK");
  process.exit(errors.length ? 1 : 0);
}
