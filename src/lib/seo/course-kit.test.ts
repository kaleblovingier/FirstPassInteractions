import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { CourseKitView } from "@/components/seo/course-kit-page";
import { ForProgramsView } from "@/components/seo/for-programs-page";
import { ForProgramsAudienceView } from "@/components/seo/for-programs-audience-page";
import { PACKS } from "@/lib/drugs/permalinks";
import { parsePermalink } from "@/lib/drugs/permalinks";
import { labAssignment, labNeedsPro } from "@/lib/drugs/lab";
import { SAMPLE_REGIMENS, sampleNeedsPro } from "@/lib/drugs/samples";
import { parseWorkupSearch, workupCases } from "@/lib/learn/workup";
import { deckFacets, hasDoseText, parsePracticeSearch, practiceDeck, practiceQuestions } from "@/lib/learn/practice";
import { GLOSSARY_BY_ID } from "@/lib/learn/glossary";
import { Route as CourseKitRoute } from "@/routes/for-programs_.course-kit";
import { Route as AudienceRoute } from "@/routes/for-programs_.$audience";
import { enzymeHubBySlug } from "./enzyme-hubs";
import { pairPageBySlug, sitemapXml } from "./pair-pages";
import { PAIR_DISCLAIMER, SITE_URL } from "./pair-copy";
import { OG_BANNED, ogImageJobs, COURSE_KIT_OG_JOB } from "./og";
import { FOR_PROGRAMS_TITLE, FOR_PROGRAMS_URL, FOR_PROGRAMS_USERS } from "./for-programs";
import { audiencePageData } from "./for-programs-audience-pages";
import { audienceBySlug, PROGRAM_AUDIENCES } from "./for-programs-audiences";
import {
  COURSE_KIT_CSV_HEADER,
  COURSE_KIT_DESCRIPTION,
  COURSE_KIT_FRAMING,
  COURSE_KIT_H1,
  COURSE_KIT_HOST_NOTE,
  COURSE_KIT_HOW,
  COURSE_KIT_INTRO,
  COURSE_KIT_LMS,
  COURSE_KIT_MODULES,
  COURSE_KIT_PATH,
  COURSE_KIT_SLUG,
  COURSE_KIT_TITLE,
  COURSE_KIT_URL,
  courseKitCsv,
  courseKitJsonLd,
  courseKitMarkdown,
  courseKitMinutes,
  formatMinutes,
  glossaryHref,
  kitTargetHref,
  moduleMinutes,
  practiceHref,
  type KitTarget,
} from "./course-kit";

const text = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

/* The same wording rules as /for-programs and the audience pages (for-programs-audiences.test.ts). */
const DOSE = /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|mL|units?|IU)\b|\b(once|twice|three times|four times) (a|per|daily)\b|\bevery \d+\s?(h|hours?)\b|\b(take \d|reduce the dose|increase the dose|titrate|max(imum)? dose|dos(e|es|ing|age))\b/i;
const BANNED = /clinical decision support|decision support|\bCDS\b|\bfree\b|\bPro\b/i;
const HYPE = /revolutionary|seamless|unlock the power|game[- ]chang|cutting[- ]edge|world[- ]class|best[- ]in[- ]class/i;
const CLAIMS = /HIPAA|SOC ?2|ISO ?27001|FERPA[- ]compliant|certified|trusted by|testimonial|customers? (say|love)|\bused by\b|\bleading\b|\b\d+%|\bhundreds of\b|\bthousands of\b/i;
const FDA_CLAIM = /FDA[- ](cleared|approved|registered)|510\(k\)|clinically (validated|proven|tested)|medically reviewed/i;
const PATIENT = /\bintake\b|patient'?s other medicines|before they reach the pharmacist|for patients\b|patient-facing|\byour patients?\b|patients can\b/i;
const NO_PRICE = /\$\s?\d|\bUSD\b|\bprice|\bper (year|month|seat)\b|\bmonthly\b|\bcheckout\b|\bbuy\b/i;
/* Advice wording: the kit says what to look at, never what to do for a person. */
const ADVICE = /\b(should (be )?(avoid|stop|start|switch|give|take)|do not (give|take|combine)|safe to|monitor (the )?patient|recommend(ed)? (dose|therapy))\b/i;

const html = renderToStaticMarkup(createElement(CourseKitView));
const body = text(html);
const activities = COURSE_KIT_MODULES.flatMap((m) => m.activities);
const workupIds = new Set(workupCases().map((c) => c.id));
const questions = practiceQuestions();

function targetResolves(t: KitTarget): boolean {
  switch (t.kind) {
    case "pack":
      return Object.hasOwn(PACKS, t.pack) && parsePermalink(`?pack=${t.pack}`).kind === "pack";
    case "lab": {
      const a = labAssignment(t.lab);
      return a !== null && parsePermalink(`?lab=${t.lab}`).labId === t.lab;
    }
    case "case":
      return SAMPLE_REGIMENS.some((s) => s.id === t.caseId) && parsePermalink(`?case=${t.caseId}`).caseId === t.caseId;
    case "workup":
      return workupIds.has(t.caseId) && parseWorkupSearch({ case: t.caseId }).case === t.caseId;
    case "pair":
      return pairPageBySlug(t.slug) !== undefined;
    case "enzyme":
      return enzymeHubBySlug(t.slug) !== undefined;
  }
}

describe("/for-programs/course-kit plan", () => {
  it("has eight weekly modules in order, with unique ids", () => {
    assert.equal(COURSE_KIT_MODULES.length, 8);
    assert.deepEqual(COURSE_KIT_MODULES.map((m) => m.week), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(new Set(COURSE_KIT_MODULES.map((m) => m.id)).size, 8);
    for (const m of COURSE_KIT_MODULES) assert.match(m.id, /^[a-z0-9-]+$/);
  });

  it("gives every module 2-4 study goals, 2-4 key terms, 2-4 activities, minutes and a check", () => {
    for (const m of COURSE_KIT_MODULES) {
      assert.ok(m.objectives.length >= 2 && m.objectives.length <= 4, `${m.id} objectives`);
      assert.ok(m.terms.length >= 2 && m.terms.length <= 4, `${m.id} terms`);
      assert.ok(m.activities.length >= 2 && m.activities.length <= 4, `${m.id} activities`);
      for (const a of m.activities) assert.ok(Number.isInteger(a.minutes) && a.minutes >= 5 && a.minutes <= 60, `${m.id} ${a.label} minutes`);
      assert.ok(moduleMinutes(m) >= 30 && moduleMinutes(m) <= 120, `${m.id} total ${moduleMinutes(m)}`);
      assert.ok(m.check.text.length > 20 && /practice round|practice session/.test(m.check.text), `${m.id} check`);
      assert.equal(new Set(m.activities.map((a) => kitTargetHref(a.target))).size, m.activities.length, `${m.id} duplicate activity`);
    }
    assert.equal(courseKitMinutes(), COURSE_KIT_MODULES.reduce((n, m) => n + moduleMinutes(m), 0));
    assert.equal(formatMinutes(45), "45 min");
    assert.equal(formatMinutes(60), "1 h");
    assert.equal(formatMinutes(75), "1 h 15 min");
  });

  it("covers the planned topics, ending on a capstone workup", () => {
    const titles = COURSE_KIT_MODULES.map((m) => m.title.toLowerCase());
    for (const [i, re] of [/cyp|first-pass/, /inhibition|induction/, /phenoconversion|pharmacogenomic/, /pharmacodynamic/, /transporter/, /opioid|harm reduction/, /special populations/, /capstone/].entries()) {
      assert.match(titles[i]!, re, `week ${i + 1}`);
    }
    assert.ok(COURSE_KIT_MODULES[7]!.activities.filter((a) => a.target.kind === "workup").length >= 2, "capstone is mostly workups");
  });

  it("every activity resolves to an existing pack, lab, case, workup, pair or enzyme page", () => {
    for (const a of activities) assert.ok(targetResolves(a.target), `${a.label}: ${JSON.stringify(a.target)}`);
    const kinds = new Set(activities.map((a) => a.target.kind));
    for (const k of ["pack", "lab", "case", "workup", "pair", "enzyme"]) assert.ok(kinds.has(k as KitTarget["kind"]), `uses ${k}`);
  });

  it("every lab-book assignment and case opens on a desk without a key", () => {
    for (const { target: t } of activities) {
      if (t.kind === "lab") assert.equal(labNeedsPro(labAssignment(t.lab)!), false, t.lab);
      if (t.kind === "case") {
        const id = t.caseId;
        assert.equal(sampleNeedsPro(SAMPLE_REGIMENS.find((s) => s.id === id)!), false, id);
      }
    }
  });

  it("every key term is a glossary entry", () => {
    for (const m of COURSE_KIT_MODULES) for (const t of m.terms) assert.ok(Object.hasOwn(GLOSSARY_BY_ID, t), `${m.id}: /glossary#${t}`);
  });

  it("every check points at a practice filter that /practice parses and that has cards", () => {
    const facets = deckFacets(questions);
    for (const m of COURSE_KIT_MODULES) {
      const p = m.check.practice;
      if (p.enzyme) assert.ok(facets.enzymes.includes(p.enzyme), `${m.id}: enzyme ${p.enzyme}`);
      if (p.grade) assert.ok((facets.grades as string[]).includes(p.grade), `${m.id}: grade ${p.grade}`);
      const href = practiceHref(p);
      const parsed = parsePracticeSearch(Object.fromEntries(new URL(href, SITE_URL).searchParams));
      assert.deepEqual(parsed, p, `${m.id}: ${href} parses back`);
      const deck = practiceDeck(questions, parsed);
      assert.ok(deck.cards.length >= 5, `${m.id}: ${href} has ${deck.cards.length} cards`);
    }
    assert.equal(practiceHref({}), "/practice");
    assert.equal(practiceHref({ enzyme: "CYP3A4", grade: "major" }), "/practice?enzyme=CYP3A4&grade=major");
  });

  it("names only desk features that exist in the repo", () => {
    assert.ok(existsSync("scripts/lms/build-scorm.ts"), "SCORM package script");
    assert.match(COURSE_KIT_LMS, /SCORM 1\.2/);
    assert.ok(/lactating/.test(readFileSync("src/components/desk/phenotype.tsx", "utf8")), "host panel has pregnancy and lactation");
    assert.ok(/KIDNEYS/.test(readFileSync("src/components/desk/phenotype.tsx", "utf8")), "host panel has kidney function");
    assert.ok(COURSE_KIT_MODULES.some((m) => m.note === COURSE_KIT_HOST_NOTE));
  });
});

describe("/for-programs/course-kit page", () => {
  it("renders the h1, intro, intended users, framing, disclaimer and every module", () => {
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
    for (const s of [COURSE_KIT_H1, COURSE_KIT_INTRO, FOR_PROGRAMS_USERS, COURSE_KIT_FRAMING, COURSE_KIT_LMS, PAIR_DISCLAIMER, ...COURSE_KIT_HOW]) assert.ok(body.includes(s), s);
    assert.match(body, /supervised education/);
    assert.match(body, /licensed healthcare professionals/);
    assert.ok(html.includes('data-testid="pair-disclaimer"'));
    assert.equal((html.match(/data-testid="course-kit-module"/g) ?? []).length, 8);
    assert.equal((html.match(/data-testid="course-kit-activity"/g) ?? []).length, activities.length);
    assert.equal((html.match(/data-testid="course-kit-check"/g) ?? []).length, 8);
    for (const m of COURSE_KIT_MODULES) {
      assert.ok(html.includes(`id="${m.id}"`), m.id);
      assert.ok(html.includes(`href="#${m.id}"`), m.id);
      for (const o of m.objectives) assert.ok(body.includes(o), o);
      assert.ok(body.includes(m.check.text), m.check.text);
      assert.ok(html.includes(`href="${practiceHref(m.check.practice).replace(/&/g, "&amp;")}"`), m.id);
      for (const t of m.terms) assert.ok(html.includes(`href="${glossaryHref(t)}"`), t);
    }
    assert.ok(body.includes("Export plan (Markdown)") && body.includes("Export plan (CSV)"));
  });

  it("every link on the page resolves to something that exists", () => {
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!.replace(/&amp;/g, "&"));
    for (const h of hrefs) {
      const u = new URL(h, SITE_URL);
      if (h.startsWith("#")) assert.ok(html.includes(`id="${h.slice(1)}"`), h);
      else if (u.pathname.startsWith("/pair/")) assert.ok(pairPageBySlug(u.pathname.slice(6)), h);
      else if (u.pathname.startsWith("/enzyme/")) assert.ok(enzymeHubBySlug(u.pathname.slice(8)), h);
      else if (u.pathname === "/glossary" && u.hash) assert.ok(Object.hasOwn(GLOSSARY_BY_ID, u.hash.slice(1)), h);
      else if (u.pathname === "/workup") assert.ok(workupIds.has(u.searchParams.get("case") ?? ""), h);
      else if (u.pathname === "/" && u.search) assert.notEqual(parsePermalink(u.search).kind, "none", h);
      else if (u.pathname.startsWith("/for-programs")) assert.ok(u.pathname === "/for-programs" || u.pathname === COURSE_KIT_PATH, h);
      else if (u.protocol === "https:" && u.host === new URL(SITE_URL).host) assert.ok(existsSync(`src/routes/${u.pathname.replace(/^\//, "") || "index"}.tsx`), h);
    }
  });

  it("keeps the copy rules: no dose, price, Pro, free, hype, invented claims, FDA claims, advice or patient wording", () => {
    const strings = [
      COURSE_KIT_TITLE,
      COURSE_KIT_DESCRIPTION,
      body,
      JSON.stringify(courseKitJsonLd()),
      courseKitMarkdown(),
      courseKitCsv(),
      ...COURSE_KIT_MODULES.flatMap((m) => [m.title, ...m.objectives, m.check.text, m.note ?? "", ...m.activities.flatMap((a) => [a.label, a.what])]),
    ];
    for (const s of strings) {
      assert.ok(!DOSE.test(s), s.match(DOSE)?.[0]);
      assert.ok(!hasDoseText(s), s);
      assert.ok(!BANNED.test(s), s.match(BANNED)?.[0]);
      assert.ok(!HYPE.test(s), s.match(HYPE)?.[0]);
      assert.ok(!CLAIMS.test(s), s.match(CLAIMS)?.[0]);
      assert.ok(!PATIENT.test(s), s.match(PATIENT)?.[0]);
      assert.ok(!ADVICE.test(s), s.match(ADVICE)?.[0]);
      assert.ok(!FDA_CLAIM.test(s.replaceAll("Not FDA-cleared", "")), s.match(FDA_CLAIM)?.[0]);
      assert.ok(!NO_PRICE.test(s), s.match(NO_PRICE)?.[0]);
    }
    for (const s of [COURSE_KIT_TITLE, COURSE_KIT_DESCRIPTION, ...Object.values(COURSE_KIT_OG_JOB)]) {
      if (typeof s !== "string") continue;
      for (const re of OG_BANNED) assert.ok(!re.test(s), `"${s}" matches ${re}`);
    }
    assert.ok(COURSE_KIT_DESCRIPTION.endsWith(PAIR_DISCLAIMER));
    assert.ok(!/data-testid="tier-/.test(html), "no tier cards or prices on the kit");
  });

  it("route head: title, description, canonical, OG image, breadcrumb and JSON-LD", () => {
    const h = (CourseKitRoute.options.head as () => { meta: Record<string, unknown>[]; links: { rel: string; href: string }[] })();
    assert.deepEqual(h.links, [{ rel: "canonical", href: COURSE_KIT_URL }]);
    assert.equal(COURSE_KIT_URL, `${FOR_PROGRAMS_URL}/${COURSE_KIT_SLUG}`);
    assert.ok(h.meta.some((m) => m.title === COURSE_KIT_TITLE));
    assert.notEqual(COURSE_KIT_TITLE, FOR_PROGRAMS_TITLE);
    assert.ok(h.meta.some((m) => m.name === "description" && m.content === COURSE_KIT_DESCRIPTION));
    const og = (p: string) => h.meta.find((m) => m.property === p)?.content;
    assert.equal(og("og:url"), COURSE_KIT_URL);
    assert.equal(og("og:image"), `${SITE_URL}${COURSE_KIT_OG_JOB.path}`);
    assert.ok(ogImageJobs().some((j) => j.path === COURSE_KIT_OG_JOB.path));
    const ld = h.meta.map((m) => m["script:ld+json"]).filter(Boolean) as Record<string, unknown>[];
    const crumbs = ld.find((l) => l["@type"] === "BreadcrumbList") as { itemListElement: { name: string; item: string }[] };
    assert.deepEqual(
      crumbs.itemListElement.map((c) => c.item),
      [`${SITE_URL}/`, FOR_PROGRAMS_URL, COURSE_KIT_URL],
    );
    const kit = ld.find((l) => l["@type"] === "LearningResource") as ReturnType<typeof courseKitJsonLd>;
    assert.equal(kit.hasPart.length, 8);
    assert.ok(!/price|offer|\$\s?\d|USD|aggregateRating/i.test(JSON.stringify(kit)));
  });

  it("is in the sitemap and linked from /for-programs and every audience page", () => {
    assert.ok(sitemapXml().includes(`<loc>${COURSE_KIT_URL}</loc>`));
    assert.ok(renderToStaticMarkup(createElement(ForProgramsView)).includes(`href="${COURSE_KIT_PATH}"`));
    for (const a of PROGRAM_AUDIENCES) {
      const page = renderToStaticMarkup(createElement(ForProgramsAudienceView, { data: audiencePageData(a.slug)! }));
      assert.ok(page.includes(`href="${COURSE_KIT_PATH}"`), a.slug);
    }
  });
});

describe("/for-programs/course-kit exports", () => {
  it("Markdown lists every week, goal, activity, term and check with absolute links, and the disclaimer", () => {
    const md = courseKitMarkdown();
    assert.ok(md.startsWith("# "));
    assert.ok(md.includes(COURSE_KIT_FRAMING));
    assert.ok(md.includes(PAIR_DISCLAIMER));
    for (const m of COURSE_KIT_MODULES) {
      assert.ok(md.includes(`## Week ${m.week}: ${m.title}`), m.id);
      for (const o of m.objectives) assert.ok(md.includes(`- ${o}`), o);
      for (const a of m.activities) assert.ok(md.includes(`(${SITE_URL}${kitTargetHref(a.target)})`), a.label);
      for (const t of m.terms) assert.ok(md.includes(`${SITE_URL}${glossaryHref(t)}`), t);
      assert.ok(md.includes(`${SITE_URL}${practiceHref(m.check.practice)}`), m.id);
    }
  });

  it("CSV has a header, one row per activity and one check row per week, quoted and formula-safe", () => {
    const lines = courseKitCsv().trimEnd().split("\n");
    assert.ok(lines[0]!.startsWith("# ") && lines[0]!.includes(PAIR_DISCLAIMER));
    assert.equal(lines[1], COURSE_KIT_CSV_HEADER.join(","));
    const rows = lines.slice(2);
    assert.equal(rows.length, activities.length + COURSE_KIT_MODULES.length);
    for (const r of rows) {
      assert.match(r, /^"\d+",/);
      const cells = r.match(/"(?:[^"]|"")*"/g)!;
      assert.equal(cells.length, COURSE_KIT_CSV_HEADER.length, r);
      for (const c of cells) assert.ok(!/^"[=+\-@]/.test(c), c);
    }
    for (const a of activities) assert.ok(rows.some((r) => r.includes(`"${SITE_URL}${kitTargetHref(a.target)}"`)), a.label);
  });
});

describe("/for-programs/course-kit routing", () => {
  it("the generated route tree has the static course-kit route next to the audience param route", () => {
    const tree = readFileSync("src/routeTree.gen.ts", "utf8");
    assert.match(tree, /fullPath: '\/for-programs\/course-kit'/);
    assert.match(tree, /fullPath: '\/for-programs\/\$audience'/);
  });

  it("TanStack Router ranks the static segment above the param, and other slugs still reach the audience route", () => {
    const root = createRootRoute();
    const audience = createRoute({ getParentRoute: () => root, path: "for-programs/$audience" });
    const kit = createRoute({ getParentRoute: () => root, path: "for-programs/course-kit" });
    const router = createRouter({ routeTree: root.addChildren([audience, kit]), history: createMemoryHistory({ initialEntries: ["/"] }) });
    const leaf = (path: string): { routeId: string; params: Record<string, string> } => {
      const m = router.matchRoutes(path, {}).at(-1)!;
      return { routeId: m.routeId as string, params: m.params as Record<string, string> };
    };
    assert.equal(leaf("/for-programs/course-kit").routeId, kit.id);
    for (const a of PROGRAM_AUDIENCES) {
      const m = leaf(`/for-programs/${a.slug}`);
      assert.equal(m.routeId, audience.id, a.slug);
      assert.deepEqual({ ...m.params }, { audience: a.slug });
    }
  });

  it("every audience page still resolves, and course-kit is not an audience", () => {
    const loader = AudienceRoute.options.loader as (ctx: unknown) => unknown;
    for (const a of PROGRAM_AUDIENCES) assert.ok(loader({ params: { audience: a.slug } }), a.slug);
    assert.equal(audienceBySlug(COURSE_KIT_SLUG), undefined);
    assert.throws(() => loader({ params: { audience: COURSE_KIT_SLUG } }));
  });
});
