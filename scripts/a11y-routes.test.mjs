import assert from "node:assert/strict";
import test from "node:test";
import {
  AUDIENCE_SAMPLE,
  DEFAULT_GROUPS,
  EMBED_FULL,
  EMBED_SAMPLE,
  GROUPS,
  SET_SIZE,
  STATIONS,
  TOOLS,
  pickClassKey,
  practiceClassKeys,
  routeSpecs,
  sitemapPaths,
  spread,
  take,
} from "./a11y-routes.mjs";

const SITE = "https://example.test";
const pairs = Array.from({ length: 20 }, (_, i) => `/pair/a${i}-b${i}`);
const PATHS = [
  "/", "/pairs", "/enzymes", "/classes", "/for-programs", "/developers",
  "/for-programs/pharmacy-schools", "/for-programs/pa-programs", "/for-programs/residency-programs", "/for-programs/opioid-treatment-programs",
  "/for-programs/course-kit", "/practice", "/glossary",
  ...pairs,
  "/drug/a", "/drug/b", "/drug/c",
  "/enzyme/cyp3a4", "/enzyme/cyp2d6",
  "/class/azole-antifungal", "/class/macrolide", "/class/statin",
];

test("sitemapPaths reads every <loc> as a pathname, in order", () => {
  const xml = `<?xml version="1.0"?><urlset>\n  <url><loc>${SITE}/</loc></url>\n  <url><loc>${SITE}/pair/a-b</loc></url>\n  <url><loc> ${SITE}/class/statin </loc></url></urlset>`;
  assert.deepEqual(sitemapPaths(xml), ["/", "/pair/a-b", "/class/statin"]);
  assert.deepEqual(sitemapPaths(""), []);
});

test("take keeps the first N, or everything at 0", () => {
  assert.deepEqual(take([1, 2, 3], 2), [1, 2]);
  assert.deepEqual(take([1, 2, 3], 0), [1, 2, 3]);
});

test("spread picks n evenly spaced items, first included, without repeats", () => {
  assert.deepEqual(spread([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3), [0, 3, 6]);
  assert.deepEqual(spread([0, 1, 2], 5), [0, 1, 2]);
  assert.deepEqual(spread([0, 1, 2], 0), []);
  assert.deepEqual(spread([], 3), []);
  const many = spread(Array.from({ length: 911 }, (_, i) => i), 12);
  assert.equal(new Set(many).size, 12);
  assert.equal(many[0], 0);
});

test("practiceClassKeys reads the class options and leaves out enzymes, grades and the empty option", () => {
  const html = `<select><option value="">All enzymes</option><option value="CYP3A4">CYP3A4</option><option value="P-gp">P-gp</option></select>
    <select><option value="">All grades</option><option value="major">Serious concern</option><option value="minor">Minor</option></select>
    <select><option value="">All drug classes</option><option value="5-ht3-antagonist">5-HT3 antagonist (4)</option><option value="azole-antifungal" selected="">Azole antifungal (9)</option><option value="azole-antifungal">dup</option></select>`;
  assert.deepEqual(practiceClassKeys(html), ["5-ht3-antagonist", "azole-antifungal"]);
  assert.deepEqual(practiceClassKeys("<p>no select</p>"), []);
});

test("pickClassKey prefers a key that also has a class hub", () => {
  assert.equal(pickClassKey(["anticoagulant", "statin"], ["azole-antifungal", "statin"]), "statin");
  assert.equal(pickClassKey(["anticoagulant"], ["statin"]), "anticoagulant");
  assert.equal(pickClassKey([], ["statin"]), undefined);
});

test("the default groups are every group but the opt-in stations", () => {
  assert.deepEqual(DEFAULT_GROUPS, GROUPS.filter((g) => g !== "stations"));
  for (const g of ["class", "programs", "embed", "practice"]) assert.ok(DEFAULT_GROUPS.includes(g), g);
});

test("a sampled run covers the class, program, embed and practice routes", () => {
  const specs = routeSpecs(PATHS, { limit: 2, classKeys: ["5-ht3-antagonist", "macrolide"] });
  assert.deepEqual(specs.filter((s) => /^\/class(es|\/)/.test(s)), ["/classes", "/class/azole-antifungal", "/class/macrolide"]);
  assert.deepEqual(specs.filter((s) => s.startsWith("/for-programs")), [
    "/for-programs", "/for-programs/course-kit", "/for-programs/pharmacy-schools", "/for-programs/pa-programs",
  ]);
  assert.deepEqual(specs.filter((s) => s.startsWith("/embed/")), ["/embed/pair/a0-b0", "/embed/pair/a10-b10"]);
  const practice = specs.filter((s) => s.startsWith("/practice"));
  assert.equal(practice.length, 3);
  assert.equal(practice[0], "/practice?enzyme=CYP3A4");
  assert.equal(practice[1], "/practice?class=macrolide");
  const set = new URL(practice[2], SITE).searchParams.get("set").split(",");
  assert.equal(set.length, SET_SIZE);
  for (const slug of set) assert.ok(pairs.includes(`/pair/${slug}`), slug);
  assert.ok(specs.every((s) => !s.includes("@") || TOOLS.includes(s)), "only tool specs click");
  assert.equal(new Set(specs).size, specs.length);
});

test("the sample caps audience pages and embeds at 3 even when the limit is higher", () => {
  const specs = routeSpecs(PATHS, { limit: 6 });
  assert.equal(specs.filter((s) => /^\/for-programs\/(?!course-kit)/.test(s)).length, AUDIENCE_SAMPLE);
  assert.equal(specs.filter((s) => s.startsWith("/embed/")).length, EMBED_SAMPLE);
});

test("the full crawl takes every sitemap route of each type and a wider spread of embeds", () => {
  const specs = routeSpecs(PATHS, {});
  assert.equal(specs.filter((s) => s.startsWith("/pair/")).length, pairs.length);
  assert.equal(specs.filter((s) => s.startsWith("/class/")).length, 3);
  assert.equal(specs.filter((s) => /^\/for-programs\/(?!course-kit)/.test(s)).length, 4);
  assert.equal(specs.filter((s) => s.startsWith("/embed/")).length, Math.min(EMBED_FULL, pairs.length));
});

test("without a class key the class-filter spec is skipped, not guessed", () => {
  const specs = routeSpecs(PATHS, { only: ["practice"] });
  assert.deepEqual(specs.map((s) => s.split("=")[0]), ["/practice?enzyme", "/practice?set"]);
});

test("--only picks groups; stations only when asked", () => {
  assert.deepEqual(routeSpecs(PATHS, { only: ["tools"] }), TOOLS);
  assert.ok(!routeSpecs(PATHS).some((s) => STATIONS.includes(s)));
  assert.deepEqual(routeSpecs(PATHS, { only: ["stations"] }), STATIONS);
  assert.deepEqual(routeSpecs(PATHS, { only: ["drug", "enzyme"], limit: 1 }), ["/drug/a", "/enzymes", "/enzyme/cyp3a4"]);
});

test("a sitemap without the program pages adds none of them", () => {
  assert.deepEqual(routeSpecs(["/", ...pairs.slice(0, 2)], { only: ["programs", "class"] }), []);
});
