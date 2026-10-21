import test from "node:test";
import assert from "node:assert/strict";
import { makeZip } from "./zip.mjs";
import { validate, readZip } from "./validate-scorm.mjs";

const D = "Educational reference only. Not FDA-cleared. The Prescribing Information governs.";
const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="m" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
<metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
<organizations default="o"><organization identifier="o"><title>t</title><item identifier="i" identifierref="r"><title>t</title></item></organization></organizations>
<resources><resource identifier="r" type="webcontent" adlcp:scormtype="sco" href="index.html"><file href="index.html"/></resource></resources></manifest>`;
const page = (body) => `<!doctype html><html lang="en"><head><title>x</title></head><body>${body}<p>${D}</p></body></html>`;
const zip = (files) => makeZip(Object.entries(files).map(([name, s]) => ({ name, data: Buffer.from(s) })));

test("valid package passes and round-trips", () => {
  const z = zip({ "imsmanifest.xml": manifest, "index.html": page("<h1>A + B</h1>") });
  assert.deepEqual(validate(z, { disclaimer: D }), []);
  assert.equal(readZip(z).get("index.html").toString().includes("A + B"), true);
});
test("flags missing manifest, missing file, dose, price, remote load, missing disclaimer", () => {
  assert.match(validate(zip({ "index.html": page("") }))[0], /imsmanifest/);
  assert.ok(validate(zip({ "imsmanifest.xml": manifest }), { disclaimer: D }).some((e) => /not in zip/.test(e)));
  const bad = (b) => validate(zip({ "imsmanifest.xml": manifest, "index.html": b }), { disclaimer: D });
  assert.ok(bad(page("Magnesium 2 g IV")).some((e) => /dose/.test(e)));
  assert.ok(bad(page("only $49")).some((e) => /price/.test(e)));
  assert.ok(bad(page('<script src="https://x.example/a.js"></script>')).some((e) => /remote/.test(e)));
  assert.ok(bad(page("<script>fetch('/api')</script>")).some((e) => /network/.test(e)));
  assert.ok(bad("<html lang=\"en\"><title>x</title></html>").some((e) => /disclaimer/.test(e)));
});

const withJs = (js) => validate(zip({ "imsmanifest.xml": manifest, "index.html": page(""), "scorm.js": js }), { disclaimer: D });
test("SCORM status: only lesson_status browsed is allowed", () => {
  assert.deepEqual(withJs('a.LMSSetValue("cmi.core.lesson_status","browsed");'), []);
  for (const v of ["completed", "passed", "failed"]) assert.ok(withJs(`a.LMSSetValue("cmi.core.lesson_status","${v}");`).length > 0, v);
  assert.ok(withJs('a.LMSSetValue("cmi.core.score.raw","100");').length > 0);
  assert.ok(withJs("a.LMSSetValue(k, v);").length > 0);
});
