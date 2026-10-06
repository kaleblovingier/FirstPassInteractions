import test from "node:test";
import assert from "node:assert/strict";
import {
  EMERGENCY_LINE,
  MEDICATION_OPTIONS,
  NATIONAL_LINES,
  OUTSIDE_US,
  STATE_RESOURCES,
  STREET_SAFETY_PROTOCOL,
  findTreatmentUrl,
  handoutText,
  help4uSmsHref,
  localLinks,
  parseLocation,
  resolveState,
  stateFromText,
  stateFromZip,
} from "./help-resources.ts";

test("parseLocation: ZIP, ZIP+4, place, empty, junk", () => {
  assert.deepEqual(parseLocation("98101"), { kind: "zip", query: "98101", zip: "98101", stateCode: "WA" });
  assert.deepEqual(parseLocation(" 98101-1234 "), { kind: "zip", query: "98101", zip: "98101", stateCode: "WA" });
  assert.equal(parseLocation("Seattle, WA").kind, "place");
  assert.equal(parseLocation("Seattle, WA").stateCode, "WA");
  assert.equal(parseLocation("El   Paso  TX").query, "El Paso TX");
  assert.equal(parseLocation("El   Paso  TX").stateCode, "TX");
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

test("stateFromZip accurately maps nationwide ZIP codes", () => {
  assert.equal(stateFromZip("98101")?.code, "WA");
  assert.equal(stateFromZip("90210")?.code, "CA");
  assert.equal(stateFromZip("10001")?.code, "NY");
  assert.equal(stateFromZip("75001")?.code, "TX");
  assert.equal(stateFromZip("02138")?.code, "MA");
  assert.equal(stateFromZip("33101")?.code, "FL");
  assert.equal(stateFromZip("60601")?.code, "IL");
  assert.equal(stateFromZip("00901")?.code, "PR");
  assert.equal(stateFromZip("20001")?.code, "DC");
  assert.equal(stateFromZip("99999")?.code, "AK");
  assert.equal(stateFromZip("00000"), null);
});

test("stateFromText resolves state codes and state names", () => {
  assert.equal(stateFromText("Seattle, WA")?.code, "WA");
  assert.equal(stateFromText("Austin, TX")?.code, "TX");
  assert.equal(stateFromText("Los Angeles, California")?.code, "CA");
  assert.equal(stateFromText("Chicago, Illinois")?.code, "IL");
  assert.equal(stateFromText("NY")?.code, "NY");
  assert.equal(stateFromText("Unknown City, ZZ"), null);
});

test("resolveState resolves from ParsedLocation or string", () => {
  assert.equal(resolveState(parseLocation("98101"))?.name, "Washington");
  assert.equal(resolveState(parseLocation("Seattle, WA"))?.name, "Washington");
  assert.equal(resolveState("10001")?.name, "New York");
  assert.equal(resolveState("Miami, FL")?.name, "Florida");
  assert.equal(resolveState(""), null);
});

test("STATE_RESOURCES covers all 50 states plus DC and Puerto Rico", () => {
  assert.equal(STATE_RESOURCES.length, 52);
  const codes = new Set(STATE_RESOURCES.map((s) => s.code));
  assert.ok(codes.has("WA"));
  assert.ok(codes.has("NY"));
  assert.ok(codes.has("CA"));
  assert.ok(codes.has("TX"));
  assert.ok(codes.has("FL"));
  assert.ok(codes.has("DC"));
  assert.ok(codes.has("PR"));

  for (const s of STATE_RESOURCES) {
    assert.ok(s.name.length > 0);
    assert.ok(s.phone.length > 0);
    assert.match(s.tel, /^tel:\d+/);
    assert.match(s.website, /^https:\/\//);
    if (s.naloxoneUrl) assert.match(s.naloxoneUrl, /^https:\/\//);
  }
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
    ...STATE_RESOURCES.map((s) => s.tel),
    ...STATE_RESOURCES.map((s) => s.website),
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
  for (const l of [EMERGENCY_LINE, ...NATIONAL_LINES]) {
    assert.equal(
      l.display.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""),
      l.tel.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""),
    );
  }
});

test("MOUD medications and safety protocols are defined and educational", () => {
  assert.ok(MEDICATION_OPTIONS.length >= 4);
  assert.ok(MEDICATION_OPTIONS.some((m) => m.id === "buprenorphine"));
  assert.ok(MEDICATION_OPTIONS.some((m) => m.id === "methadone"));
  assert.ok(MEDICATION_OPTIONS.some((m) => m.id === "naltrexone"));
  assert.ok(STREET_SAFETY_PROTOCOL.length >= 3);
  assert.ok(STREET_SAFETY_PROTOCOL.some((s) => s.action.includes("Naloxone")));
  assert.ok(STREET_SAFETY_PROTOCOL.some((s) => s.action.includes("Xylazine")));
});

test("handout carries 911 first, state helpline when detected, national lines, and disclaimer", () => {
  const outWa = handoutText(parseLocation("98101"));
  assert.ok(outWa.indexOf("911") < outWa.indexOf("988"));
  assert.match(outWa, /Washington Recovery Help Line/);
  assert.match(outWa, /1-866-789-1511/);
  assert.match(outWa, /1-800-662-4357/);
  assert.match(outWa, /1-800-484-3731/);
  assert.match(outWa, /sAddr=98101/);
  assert.match(outWa, /435748/);
  assert.match(outWa, /not medical advice/i);

  const none = handoutText(parseLocation(""));
  assert.doesNotMatch(none, /435748/);
  assert.match(none, /findtreatment\.gov\/locator\b/);
});
