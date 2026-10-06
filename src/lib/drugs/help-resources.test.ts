import test from "node:test";
import assert from "node:assert/strict";
import {
  EMERGENCY_LINE,
  NATIONAL_LINES,
  OUTSIDE_US,
  findTreatmentUrl,
  handoutText,
  help4uSmsHref,
  localLinks,
  parseLocation,
} from "./help-resources.ts";

test("parseLocation: ZIP, ZIP+4, place, empty, junk", () => {
  assert.deepEqual(parseLocation("98101"), { kind: "zip", query: "98101", zip: "98101" });
  assert.deepEqual(parseLocation(" 98101-1234 "), { kind: "zip", query: "98101", zip: "98101" });
  assert.equal(parseLocation("Seattle, WA").kind, "place");
  assert.equal(parseLocation("El   Paso  TX").query, "El Paso TX");
  assert.equal(parseLocation("").kind, "none");
  assert.equal(parseLocation("   ").kind, "none");
  assert.equal(parseLocation("123").kind, "invalid");
  assert.equal(parseLocation("9810").kind, "invalid");
});

test("parseLocation strips URL / HTML metacharacters and caps length", () => {
  const p = parseLocation('Seattle<script>&x=1#frag?y="z"/');
  assert.equal(p.kind, "place");
  assert.doesNotMatch(p.query, /[<>&#?="/]/);
  assert.ok(parseLocation("a".repeat(500)).query.length <= 60);
});

test("FindTreatment link is pre-filled only when a location is valid", () => {
  assert.equal(
    findTreatmentUrl(parseLocation("98101")),
    "https://findtreatment.gov/locator?sAddr=98101",
  );
  assert.equal(
    findTreatmentUrl(parseLocation("El Paso, TX")),
    "https://findtreatment.gov/locator?sAddr=El%20Paso%2C%20TX",
  );
  assert.equal(findTreatmentUrl(parseLocation("")), "https://findtreatment.gov/locator");
  assert.equal(findTreatmentUrl(parseLocation("12")), "https://findtreatment.gov/locator");
});

test("HELP4U text line shows only for a ZIP, and carries that ZIP", () => {
  const zip = localLinks(parseLocation("98101"));
  const help4u = zip.find((l) => l.id === "help4u");
  assert.ok(help4u);
  assert.equal(help4u.href, help4uSmsHref("98101"));
  assert.match(help4u.href, /^sms:435748/);
  assert.equal(localLinks(parseLocation("Seattle, WA")).some((l) => l.id === "help4u"), false);
  assert.equal(localLinks(parseLocation("")).some((l) => l.id === "help4u"), false);
});

test("only links that really use the location claim to be pre-filled", () => {
  const prefilled = localLinks(parseLocation("98101"))
    .filter((l) => l.prefilled)
    .map((l) => l.id)
    .sort();
  assert.deepEqual(prefilled, ["findtreatment", "help4u"]);
  assert.deepEqual(localLinks(parseLocation("")).filter((l) => l.prefilled), []);
});

test("every outbound link is https, tel, or sms — nothing else", () => {
  const hrefs = [
    ...localLinks(parseLocation("98101")).map((l) => l.href),
    ...NATIONAL_LINES.map((l) => l.tel),
    ...NATIONAL_LINES.map((l) => l.source ?? "https://ok.example"),
    EMERGENCY_LINE.tel,
    OUTSIDE_US.href,
  ];
  for (const h of hrefs) assert.match(h, /^(https:\/\/|tel:|sms:)/, h);
});

test("national numbers match the operators' published numbers", () => {
  const by = Object.fromEntries(NATIONAL_LINES.map((l) => [l.id, l]));
  assert.equal(EMERGENCY_LINE.tel, "tel:911");
  assert.equal(by["988"].tel, "tel:988");
  assert.equal(by.samhsa.tel, "tel:18006624357");
  assert.equal(by.poison.tel, "tel:18002221222");
  assert.equal(by.nua.tel, "tel:18004843731");
  // Display digits and tel digits agree on every line.
  for (const l of [EMERGENCY_LINE, ...NATIONAL_LINES]) {
    assert.equal(l.display.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""), l.tel.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""));
  }
});

test("copy never claims a result list, a score, or a safe-to-use verdict", () => {
  const text = [
    ...NATIONAL_LINES.map((l) => l.blurb),
    EMERGENCY_LINE.blurb,
    ...localLinks(parseLocation("98101")).map((l) => l.blurb),
    handoutText(parseLocation("98101")),
  ].join("\n");
  assert.doesNotMatch(text, /\b(safe to use|guarantee|cure|best rehab|top[- ]rated)\b/i);
});

test("handout carries 911 first, national lines, location, and a disclaimer", () => {
  const out = handoutText(parseLocation("98101"));
  assert.ok(out.indexOf("911") < out.indexOf("988"));
  assert.match(out, /1-800-662-4357/);
  assert.match(out, /1-800-484-3731/);
  assert.match(out, /sAddr=98101/);
  assert.match(out, /435748/);
  assert.match(out, /not medical advice/i);
  const none = handoutText(parseLocation(""));
  assert.doesNotMatch(none, /435748/);
  assert.match(none, /findtreatment\.gov\/locator\b/);
});

