import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ForProgramsAudienceView } from "@/components/seo/for-programs-audience-page";
import { ForProgramsView } from "@/components/seo/for-programs-page";
import { PROGRAM_TIERS } from "@/lib/billing/programs";
import { PACKS } from "@/lib/drugs/permalinks";
import { labAssignment } from "@/lib/drugs/lab";
import { Route as AudienceRoute } from "@/routes/for-programs_.$audience";
import { pairPageBySlug, pairPages, sitemapXml } from "./pair-pages";
import { PAIR_DISCLAIMER } from "./pair-copy";
import { OG_BANNED, audienceOgJob, ogImageJobs } from "./og";
import {
  FOR_PROGRAMS_AUDIENCES,
  FOR_PROGRAMS_DESCRIPTION,
  FOR_PROGRAMS_MAILTO,
  FOR_PROGRAMS_TITLE,
  FOR_PROGRAMS_URL,
  FOR_PROGRAMS_USERS,
  formatUsd,
  PROGRAM_TYPES,
  seatsLabel,
} from "./for-programs";
import {
  AUDIENCE_BY_SLUG,
  audienceBySlug,
  audienceJsonLd,
  audienceLinkHref,
  audiencePath,
  audienceUrl,
  audienceUrls,
  PROGRAM_AUDIENCES,
  type AudienceLink,
} from "./for-programs-audiences";
import { audiencePageData, pairPageForIds } from "./for-programs-audience-pages";

const text = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

/** The same wording rules /for-programs is held to (for-programs.test.ts). */
const DOSE = /\b\d+(\.\d+)?\s?(mg|mcg|µg|g|mL|units?|IU)\b|\b(once|twice|three times|four times) (a|per|daily)\b|\bevery \d+\s?(h|hours?)\b|\b(take \d|reduce the dose|increase the dose|titrate|max(imum)? dose|dos(e|es|ing|age))\b/i;
const BANNED = /clinical decision support|decision support|\bCDS\b|\bfree\b|\bPro\b/i;
const HYPE = /revolutionary|seamless|unlock the power|game[- ]chang|cutting[- ]edge|world[- ]class|best[- ]in[- ]class/i;
const CLAIMS = /HIPAA|SOC ?2|ISO ?27001|FERPA[- ]compliant|certified|trusted by|testimonial|customers? (say|love)|\bused by\b|\bleading\b|\b\d+%|\bhundreds of\b|\bthousands of\b/i;
const FDA_CLAIM = /FDA[- ](cleared|approved|registered)|510\(k\)|clinically (validated|proven|tested)|medically reviewed/i;
const PATIENT = /\bintake\b|patient'?s other medicines|before they reach the pharmacist|for patients\b|patient-facing|\byour patients?\b|patients can\b/i;
const NO_PRICE = /\$\s?\d|\bUSD\b|\bprice|\bper (year|month|seat)\b|\bmonthly\b/i;

const pages = PROGRAM_AUDIENCES.map((a) => {
  const data = audiencePageData(a.slug)!;
  const html = renderToStaticMarkup(createElement(ForProgramsAudienceView, { data }));
  return { a, data, html, body: text(html) };
});

/** Site paths a teaching use may link to: routes that exist as files. */
function pathExists(href: string): boolean {
  const path = href.split(/[?#]/)[0]!.replace(/^\//, "");
  if (path === "") return true;
  return existsSync(`src/routes/${path}.tsx`);
}

function linkResolves(link: AudienceLink): boolean {
  if (link.kind === "pack") return Object.hasOwn(PACKS, link.pack);
  if (link.kind === "lab") return labAssignment(link.lab) !== null;
  return pathExists(link.href);
}

describe("/for-programs/<audience> pages", () => {
  it("has the seven audiences, with unique slugs", () => {
    assert.deepEqual(
      PROGRAM_AUDIENCES.map((a) => a.slug),
      [
        "pharmacy-schools",
        "nursing-and-np-programs",
        "pa-programs",
        "pharmacy-tech-programs",
        "residency-programs",
        "ketamine-and-psychiatry-clinics",
        "opioid-treatment-programs",
      ],
    );
    assert.equal(Object.keys(AUDIENCE_BY_SLUG).length, PROGRAM_AUDIENCES.length);
  });

  it("every audience renders its h1, intro, intended users, disclaimer and CTA", () => {
    for (const { a, html, body } of pages) {
      assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, a.slug);
      assert.ok(body.includes(a.h1), `${a.slug} h1`);
      assert.ok(body.includes(a.intro), `${a.slug} intro`);
      assert.ok(body.includes(FOR_PROGRAMS_USERS), `${a.slug} intended users`);
      assert.match(body, /licensed healthcare professionals/);
      assert.match(body, /supervision/);
      assert.ok(body.includes(PAIR_DISCLAIMER), `${a.slug} disclaimer`);
      assert.ok(html.includes('data-testid="pair-disclaimer"'), `${a.slug} disclaimer block`);
      assert.ok(html.includes('href="/for-programs#inquiry"'), `${a.slug} inquiry form link`);
      assert.ok(html.includes(`href="${FOR_PROGRAMS_MAILTO}"`), `${a.slug} mailto`);
      assert.ok(html.includes('href="/for-programs"'), `${a.slug} back to the main page`);
    }
  });

  it("names 3 or 4 teaching uses, each linking only to something that exists", () => {
    for (const { a, html } of pages) {
      assert.ok(a.uses.length >= 3 && a.uses.length <= 4, `${a.slug}: ${a.uses.length} uses`);
      assert.equal((html.match(/data-testid="audience-use"/g) ?? []).length, a.uses.length, a.slug);
      for (const u of a.uses) {
        if (!u.link) continue;
        assert.ok(linkResolves(u.link), `${a.slug}: ${JSON.stringify(u.link)}`);
        assert.ok(html.includes(`href="${audienceLinkHref(u.link).replace(/&/g, "&amp;")}"`), `${a.slug}: ${u.link.label}`);
      }
    }
  });

  it("only names desk features that exist in the repo", () => {
    const all = PROGRAM_AUDIENCES.flatMap((a) => a.uses.map((u) => `${u.name} ${u.text}`)).join(" ");
    if (/SCORM/.test(all)) assert.ok(existsSync("scripts/lms/build-scorm.ts"), "SCORM package script");
    if (/phenoconversion/i.test(all)) assert.ok(existsSync("src/components/desk/pheno-contrast.tsx"), "phenoconversion view");
    if (/lab-book/i.test(all)) assert.ok(existsSync("src/lib/drugs/lab.ts"), "lab book");
    if (/\/workup/.test(all)) assert.ok(existsSync("src/routes/workup.tsx"), "workup");
    if (/\/practice/.test(all)) assert.ok(existsSync("src/routes/practice.tsx"), "practice");
  });

  it("links 3 to 5 example pairs, and every linked pair exists", () => {
    const all = pairPages();
    for (const { a, data, html } of pages) {
      assert.ok(a.pairs.length >= 3 && a.pairs.length <= 5, `${a.slug}: ${a.pairs.length} pairs`);
      for (const [x, y] of a.pairs) assert.ok(pairPageForIds(x, y, all), `${a.slug}: no pair page for ${x} + ${y}`);
      assert.equal(data.pairs.length, a.pairs.length, a.slug);
      assert.equal(new Set(data.pairs.map((p) => p.slug)).size, data.pairs.length, `${a.slug} duplicate pair`);
      const hrefs = [...html.matchAll(/href="\/pair\/([^"]+)"/g)].map((m) => m[1]!);
      assert.equal(hrefs.length, a.pairs.length, a.slug);
      for (const slug of hrefs) assert.ok(pairPageBySlug(slug), `${a.slug}: /pair/${slug}`);
    }
  });

  it("shows the tier that usually fits, with its price from programs.ts", () => {
    for (const { a, data, html, body } of pages) {
      const tier = PROGRAM_TIERS.find((t) => t.id === a.tier)!;
      assert.equal(data.tier, tier);
      assert.ok(html.includes(`data-testid="tier-${tier.id}"`), a.slug);
      assert.ok(body.includes(`${formatUsd(tier.annual)} per year`), `${a.slug} price`);
      assert.ok(body.includes(seatsLabel(tier)), `${a.slug} seats`);
      assert.ok(body.includes(`Ask about ${tier.name}`), a.slug);
      assert.ok(body.includes(a.tierNote), a.slug);
      assert.ok(a.tierNote.includes(tier.name), `${a.slug} note names the tier`);
      for (const other of PROGRAM_TIERS.filter((t) => t.id !== tier.id)) {
        assert.ok(!html.includes(`data-testid="tier-${other.id}"`), `${a.slug} shows only one tier card`);
      }
      assert.ok(!NO_PRICE.test(a.tierNote), `${a.slug} tier note has no price`);
    }
  });

  it("keeps the copy rules: no price in meta, no dose, Pro, free, hype, invented claims, FDA claims or patient wording", () => {
    for (const { a, body } of pages) {
      const ld = JSON.stringify(audienceJsonLd(a));
      for (const s of [a.title, a.description, body, ld]) {
        assert.ok(!BANNED.test(s), `${a.slug}: ${s.match(BANNED)?.[0]}`);
        assert.ok(!DOSE.test(s), `${a.slug}: ${s.match(DOSE)?.[0]}`);
        assert.ok(!HYPE.test(s), `${a.slug}: ${s.match(HYPE)?.[0]}`);
        assert.ok(!CLAIMS.test(s), `${a.slug}: ${s.match(CLAIMS)?.[0]}`);
        assert.ok(!PATIENT.test(s), `${a.slug}: ${s.match(PATIENT)?.[0]}`);
        assert.ok(!FDA_CLAIM.test(s.replaceAll("Not FDA-cleared", "")), `${a.slug}: ${s.match(FDA_CLAIM)?.[0]}`);
      }
      for (const s of [a.title, a.description, ld]) assert.ok(!NO_PRICE.test(s), `${a.slug}: ${s.match(NO_PRICE)?.[0]}`);
      for (const s of [a.title, a.description, ...Object.values(audienceOgJob(a))]) {
        if (typeof s !== "string") continue;
        for (const re of OG_BANNED) assert.ok(!re.test(s), `${a.slug}: "${s}" matches ${re}`);
      }
      assert.ok(a.description.endsWith(PAIR_DISCLAIMER), `${a.slug} description ends with the disclaimer`);
      assert.match(a.description, /educational|DailyMed/);
    }
  });

  it("gives every page a unique title, description, canonical and share image", () => {
    const titles = [FOR_PROGRAMS_TITLE, ...PROGRAM_AUDIENCES.map((a) => a.title)];
    const descriptions = [FOR_PROGRAMS_DESCRIPTION, ...PROGRAM_AUDIENCES.map((a) => a.description)];
    assert.equal(new Set(titles).size, titles.length);
    assert.equal(new Set(descriptions).size, descriptions.length);
    for (const a of PROGRAM_AUDIENCES) {
      assert.match(a.title, /\| FirstPass$/);
      assert.ok(a.title.length <= 90, `${a.slug} title length ${a.title.length}`);
      assert.equal(audienceUrl(a.slug), `${FOR_PROGRAMS_URL}/${a.slug}`);
      assert.equal(audiencePath(a.slug), `/for-programs/${a.slug}`);
    }
    const paths = ogImageJobs().map((j) => j.path);
    for (const a of PROGRAM_AUDIENCES) assert.ok(paths.includes(audienceOgJob(a).path), a.slug);
    assert.equal(new Set(paths).size, paths.length);
  });

  it("route head: title, description, canonical, OG, breadcrumb and JSON-LD per page", () => {
    const head = AudienceRoute.options.head!;
    for (const { a, data } of pages) {
      const h = (head as (ctx: unknown) => { meta: Record<string, unknown>[]; links: { rel: string; href: string }[] })({ loaderData: data });
      const url = audienceUrl(a.slug);
      assert.deepEqual(h.links, [{ rel: "canonical", href: url }]);
      assert.ok(h.meta.some((m) => m.title === a.title), `${a.slug} title`);
      assert.ok(h.meta.some((m) => m.name === "description" && m.content === a.description), `${a.slug} description`);
      const og = (p: string) => h.meta.find((m) => m.property === p)?.content;
      assert.equal(og("og:title"), a.title);
      assert.equal(og("og:url"), url);
      assert.equal(og("og:image"), `${FOR_PROGRAMS_URL.replace(/\/for-programs$/, "")}${audienceOgJob(a).path}`);
      const ld = h.meta.map((m) => m["script:ld+json"]).filter(Boolean) as Record<string, unknown>[];
      const crumbs = ld.find((l) => l["@type"] === "BreadcrumbList") as { itemListElement: { name: string; item: string }[] };
      assert.deepEqual(
        crumbs.itemListElement.map((c) => [c.name, c.item]),
        [
          ["FirstPass", `${FOR_PROGRAMS_URL.replace(/\/for-programs$/, "")}/`],
          ["For programs", FOR_PROGRAMS_URL],
          [a.name, url],
        ],
      );
      const service = ld.find((l) => l["@type"] === "Service") as ReturnType<typeof audienceJsonLd>;
      assert.equal(service.url, url);
      assert.equal(service.audience.audienceType, a.name);
      assert.deepEqual(
        service.hasOfferCatalog.itemListElement.map((o) => o.name),
        PROGRAM_TIERS.map((t) => `${t.name} license`),
      );
      assert.ok(!/aggregateRating|review|"Pro"|price|\$\s?\d|USD/i.test(JSON.stringify(service)));
    }
  });

  it("an unknown audience is not found", () => {
    for (const bad of ["", "nope", "pharmacy", "constructor", "__proto__", "toString", "Pharmacy-Schools"]) {
      assert.equal(audienceBySlug(bad), undefined, bad);
      assert.equal(audiencePageData(bad), undefined, bad);
      assert.throws(() => (AudienceRoute.options.loader as (ctx: unknown) => unknown)({ params: { audience: bad } }), bad);
    }
  });

  it("every audience is in the sitemap", () => {
    const xml = sitemapXml();
    assert.equal(audienceUrls().length, PROGRAM_AUDIENCES.length);
    for (const u of audienceUrls()) assert.ok(xml.includes(`<loc>${u}</loc>`), u);
  });

  it("the main /for-programs page links every audience page, and every linked page exists", () => {
    const html = renderToStaticMarkup(createElement(ForProgramsView));
    for (const a of PROGRAM_AUDIENCES) assert.ok(html.includes(`href="/for-programs/${a.slug}"`), a.slug);
    for (const a of FOR_PROGRAMS_AUDIENCES) if (a.page) assert.ok(audienceBySlug(a.page), a.page);
    for (const { html: page } of pages) {
      for (const m of page.matchAll(/href="\/for-programs\/([^"#]+)"/g)) assert.ok(audienceBySlug(m[1]!), m[1]);
    }
    assert.ok(PROGRAM_TYPES.includes("Nursing and NP programs" as (typeof PROGRAM_TYPES)[number]));
    assert.ok(PROGRAM_TYPES.includes("PA programs" as (typeof PROGRAM_TYPES)[number]));
  });
});
