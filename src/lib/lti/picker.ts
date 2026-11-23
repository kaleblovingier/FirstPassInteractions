/**
 * The Deep Linking content picker: what faculty can add to a course from FirstPass, and the two
 * server-rendered pages (the picker form and the auto-submitting return form). Loaded on demand
 * by ./lti.server.ts, because the pair and class lists pull in the catalog.
 *
 * Every item is a page that resolveLaunchTarget accepts as is, so the picker can only offer, and
 * the submit can only return, pages on the launch allowlist (LTI_TARGET_PATHS or the default).
 * The pages hold no user data: no name, email, id, course or role is shown or kept.
 */

import { deckFacets, practiceQuestions } from "@/lib/learn/practice";
import { classHubs } from "@/lib/seo/class-hubs";
import { COURSE_KIT_MODULES, COURSE_KIT_PATH } from "@/lib/seo/course-kit";
import { pairPageBySlug, pairPages } from "@/lib/seo/pair-pages";
import { LTI_DEEP_LINK_PATH, TOOL_TITLE, escapeHtml, resolveLaunchTarget } from "./lti";

export interface PickerItem {
  /** Site path with any allowed extras, e.g. /practice?enzyme=CYP3A4. Becomes firstpass_path. */
  path: string;
  /** Title of the item in the course. */
  title: string;
}

export interface PickerGroup {
  id: string;
  legend: string;
  items: PickerItem[];
}

/** Most pair pages one search lists. */
export const PAIR_RESULTS_MAX = 20;
/** Longest pair search accepted. */
export const PAIR_QUERY_MAX = 80;
/** Most items one answer may carry when the platform accepts several. */
export const PICK_MAX = 25;

function offerable(path: string, origin: string, allow: readonly string[]): boolean {
  return resolveLaunchTarget(path, origin, allow) === path;
}

/** The fixed lists (course kit, practice sets, class pages), each item checked against the allowlist. */
export function pickerGroups(origin: string, allow: readonly string[]): PickerGroup[] {
  const kit: PickerItem[] = [
    { path: COURSE_KIT_PATH, title: `${TOOL_TITLE} course kit` },
    ...COURSE_KIT_MODULES.map((m) => ({
      path: `${COURSE_KIT_PATH}#${m.id}`,
      title: `${TOOL_TITLE} course kit, week ${m.week}: ${m.title}`,
    })),
  ];
  const facets = deckFacets(practiceQuestions());
  const practice: PickerItem[] = [
    { path: "/practice", title: `${TOOL_TITLE} practice: all cards` },
    ...facets.enzymes.map((e) => ({
      path: `/practice?${new URLSearchParams({ enzyme: e })}`,
      title: `${TOOL_TITLE} practice: ${e} cards`,
    })),
    ...facets.classes.map((c) => ({
      path: `/practice?${new URLSearchParams({ class: c.key })}`,
      title: `${TOOL_TITLE} practice: ${c.label}`,
    })),
  ];
  const classes: PickerItem[] = classHubs().map((h) => ({
    path: `/class/${h.slug}`,
    title: `${TOOL_TITLE} class page: ${h.name}`,
  }));
  const keep = (items: PickerItem[]) => items.filter((i) => offerable(i.path, origin, allow));
  return [
    { id: "kit", legend: "Course kit weeks", items: keep(kit) },
    { id: "practice", legend: "Practice sets", items: keep(practice) },
    { id: "class", legend: "Class pages", items: keep(classes) },
  ].filter((g) => g.items.length > 0);
}

/** Pair search terms: lower case words, or null when the query is empty or too long. */
export function pairQueryTerms(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  const q = raw.trim().toLowerCase();
  if (!q || q.length > PAIR_QUERY_MAX) return null;
  const terms = q.split(/[^a-z0-9]+/).filter(Boolean);
  return terms.length ? terms : null;
}

const pairItem = (p: { slug: string; nameA: string; nameB: string }): PickerItem => ({
  path: `/pair/${p.slug}`,
  title: `${TOOL_TITLE} pair page: ${p.nameA} and ${p.nameB}`,
});

/** Pair pages whose slug or drug names hold every search word, at most PAIR_RESULTS_MAX. */
export function searchPairs(
  raw: string | null | undefined,
  origin: string,
  allow: readonly string[],
): PickerItem[] {
  const terms = pairQueryTerms(raw);
  if (!terms) return [];
  const out: PickerItem[] = [];
  for (const p of pairPages()) {
    const hay = `${p.slug} ${p.nameA} ${p.nameB}`.toLowerCase();
    if (!terms.every((t) => hay.includes(t))) continue;
    const item = pairItem(p);
    if (!offerable(item.path, origin, allow)) continue;
    out.push(item);
    if (out.length === PAIR_RESULTS_MAX) break;
  }
  return out;
}

/** The item a submitted value names, or null when the picker would not offer that value. */
export function pickerItem(
  value: string,
  origin: string,
  allow: readonly string[],
): PickerItem | null {
  if (!offerable(value, origin, allow)) return null;
  const pair = /^\/pair\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
  if (pair) {
    const page = pairPageBySlug(pair[1]!);
    return page ? pairItem(page) : null;
  }
  for (const g of pickerGroups(origin, allow)) {
    const hit = g.items.find((i) => i.path === value);
    if (hit) return hit;
  }
  return null;
}

/* ---------------- pages ---------------- */

const STYLE = `body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:16px;color:#1a1a1a;background:#fff}
main{max-width:760px;margin:0 auto}h1{font-size:1.3rem;margin:0 0 4px}p{margin:4px 0 12px}
fieldset{border:1px solid #ccc;border-radius:6px;margin:0 0 12px;padding:8px 12px}
legend{font-weight:600;padding:0 4px}summary{cursor:pointer;font-weight:600;padding:6px 0}
label{display:block;padding:3px 0}input[type=search]{font:inherit;padding:6px;width:min(100%,360px)}
button{font:inherit;padding:6px 14px;margin:4px 8px 4px 0;cursor:pointer}
.err{color:#a00;font-weight:600}.note{color:#555;font-size:.9rem}`;

export interface PickerView {
  token: string;
  groups: PickerGroup[];
  multiple: boolean;
  query?: string;
  results?: PickerItem[];
  selected?: ReadonlySet<string>;
  error?: string;
}

function choice(item: PickerItem, multiple: boolean, selected: ReadonlySet<string>): string {
  const type = multiple ? "checkbox" : "radio";
  const checked = selected.has(item.path) ? " checked" : "";
  return `<label><input type="${type}" name="item" value="${escapeHtml(item.path)}"${checked}> ${escapeHtml(item.title)}</label>`;
}

/** The picker form. No script; it posts back to LTI_DEEP_LINK_PATH with the picker token. */
export function renderPicker(v: PickerView): string {
  const selected = v.selected ?? new Set<string>();
  const results = v.results ?? [];
  const searched = v.query !== undefined && v.query.trim() !== "";
  const resultList = results.length
    ? results.map((i) => choice(i, v.multiple, selected)).join("")
    : searched
      ? `<p class="note">No pair page matches that search.</p>`
      : "";
  const groups = v.groups
    .map(
      (g, i) =>
        `<details${i === 0 ? " open" : ""}><summary>${escapeHtml(g.legend)} (${g.items.length})</summary><fieldset><legend>${escapeHtml(g.legend)}</legend>${g.items
          .map((it) => choice(it, v.multiple, selected))
          .join("")}</fieldset></details>`,
    )
    .join("");
  const how = v.multiple
    ? `Tick one or more items, then choose Add to course (up to ${PICK_MAX}).`
    : "Pick one item, then choose Add to course.";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex"><title>Add ${TOOL_TITLE} to your course</title><style>${STYLE}</style></head>
<body><main>
<h1>Add ${TOOL_TITLE} to your course</h1>
<p>${how} Each item opens the page in a new tab for students.</p>
${v.error ? `<p class="err" role="alert">${escapeHtml(v.error)}</p>` : ""}
<form method="post" action="${LTI_DEEP_LINK_PATH}">
<input type="hidden" name="token" value="${escapeHtml(v.token)}">
<fieldset><legend>Find a pair page</legend>
<label for="fp-q">Drug name or pair page address, e.g. warfarin fluconazole</label>
<input id="fp-q" type="search" name="q" maxlength="${PAIR_QUERY_MAX}" value="${escapeHtml(v.query ?? "")}">
<button type="submit" name="action" value="find">Find</button>
${resultList}
</fieldset>
${groups}
<p><button type="submit" name="action" value="add">Add to course</button><button type="submit" name="action" value="cancel">Cancel</button></p>
</form>
<p class="note">${TOOL_TITLE} is an educational reference. The Prescribing Information governs.</p>
</main></body></html>`;
}

/** The return page's only script: submit the form as soon as the page loads. */
export const RETURN_SCRIPT = `document.getElementById("fp-return").submit();`;

/** Posts the signed answer (the JWT form field) to the platform's deep_link_return_url. */
export function renderReturn(returnUrl: string, jwt: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex"><title>Returning to your course</title><style>${STYLE}</style></head>
<body><main>
<form id="fp-return" method="post" action="${escapeHtml(returnUrl)}">
<input type="hidden" name="JWT" value="${escapeHtml(jwt)}">
<p>Sending your choice back to your course.</p>
<button type="submit">Continue</button>
</form>
<script>${RETURN_SCRIPT}</script>
</main></body></html>`;
}
