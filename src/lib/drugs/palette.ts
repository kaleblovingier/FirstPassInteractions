/**
 * Entries for the Ctrl+K palette: desk views, clinical stations and standalone
 * pages, matched and ranked for a query, plus the drug rows the desk search finds
 * and the recent trays kept in this browser.
 */
import { DRUG_BY_ID, normalizeSearchText, searchDrugs } from "./catalog";
import { labelForIds, type TraySnapshot } from "./tray-history";
import { groupStations, stationAlias, stationMatches, STATION_LABELS, type StationId } from "./station-groups";
import { ITEM_KIND_LABEL, type Drug } from "./types";

/** Desk views in header order. The header nav renders this list too. */
export const DESK_VIEWS = [
  ["desk", "Desk"],
  ["library", "Library"],
  ["cites", "Sources"],
  ["atlas", "Enzyme map"],
  ["study", "Learn"],
  ["rounds", "Cases"],
  ["compare", "Compare"],
  ["watch", "Watch"],
  ["label", "Safety"],
  ["help", "Find help"],
  ["plans", "Plans"],
] as const;

/** Pages outside the desk. Add new routes here. */
export const PALETTE_PAGES = [
  { href: "/practice", label: "Practice", hint: "Drug-pair recall" },
  { href: "/workup", label: "Workup", hint: "Call every pair in a regimen" },
  { href: "/glossary", label: "Glossary", hint: "Clinical pharmacology terms" },
  { href: "/help", label: "Help", hint: "How the desk works" },
  { href: "/pairs", label: "Interaction pairs", hint: "Label-sourced pair pages" },
  { href: "/enzymes", label: "Enzyme pages", hint: "CYP450 inhibitors, inducers and substrates" },
  { href: "/trust", label: "Trust and privacy", hint: "How FirstPass handles data and checks sources" },
];

export type PaletteItem =
  | { kind: "view"; id: (typeof DESK_VIEWS)[number][0]; label: string; hint: string }
  | { kind: "station"; id: StationId; label: string; hint: string }
  | { kind: "page" | "drug"; id: string; label: string; hint: string }
  | {
      kind: "tray";
      id: string;
      label: string;
      hint: string;
      /** The tray to load, in its saved order. */
      ids: string[];
      ketamineRoute?: TraySnapshot["ketamineRoute"];
    };

export interface PaletteGroup {
  kind: PaletteItem["kind"];
  label: string;
  items: PaletteItem[];
}

const GROUP_LABEL: Record<PaletteItem["kind"], string> = {
  view: "Go to",
  station: "Stations",
  page: "Pages",
  drug: "Add to tray",
  tray: "Recent trays",
};

/** Recent trays shown on a blank query, newest first. */
export const RECENT_TRAY_ROWS = 5;

/** Fewer than the desk search shows, so the other groups stay in view. */
const DRUG_ROWS = 8;

/** An entry and the extra words it matches: a view's id, a station's group, a page's hint. */
type Entry = { item: PaletteItem; keywords: string };

const VIEWS: Entry[] = DESK_VIEWS.map(([id, label]) => ({ item: { kind: "view", id, label, hint: "" }, keywords: id }));

const STATIONS: Entry[] = groupStations(
  (Object.keys(STATION_LABELS) as StationId[]).map((id) => ({ id, label: STATION_LABELS[id] })),
).flatMap((g) =>
  g.tabs.map((t) => ({
    item: { kind: "station", id: t.id, label: t.label, hint: [g.label, stationAlias(t.id)].filter(Boolean).join(" · ") },
    keywords: g.label,
  })),
);

const PAGES: Entry[] = PALETTE_PAGES.map((p) => ({
  item: { kind: "page", id: p.href, label: p.label, hint: p.hint },
  keywords: p.hint,
}));

/** 3: a name is the query. 2: a name starts with it. 1: a keyword match. 0: no match. */
function tier(names: readonly string[], keywordHit: boolean, q: string): number {
  const n = names.map(normalizeSearchText);
  if (n.includes(q)) return 3;
  if (n.some((name) => name.startsWith(q))) return 2;
  return keywordHit ? 1 : 0;
}

function drugItem(d: Drug): PaletteItem {
  const kind = d.kind === "drug" ? "" : ITEM_KIND_LABEL[d.kind];
  return { kind: "drug", id: d.id, label: d.name, hint: [kind, d.cls, d.brands.slice(0, 2).join(", ")].filter(Boolean).join(" · ") };
}

/** One palette row for a saved tray. Its id is the tray's items so a row stays put across opens. */
export function trayItem(snap: TraySnapshot): PaletteItem {
  const n = snap.ids.length;
  return {
    kind: "tray",
    id: `tray:${snap.ids.join("+")}`,
    label: labelForIds(snap.ids),
    hint: `${n} item${n === 1 ? "" : "s"} · loads with default person factors · saved on this browser only`,
    ids: snap.ids,
    ketamineRoute: snap.ketamineRoute,
  };
}

/** Names a saved tray matches on: each item's name, id, brands and aliases. */
function trayNames(snap: TraySnapshot): string[] {
  return snap.ids.flatMap((id) => {
    const d = DRUG_BY_ID[id];
    return d ? [d.name, d.id, ...d.brands, ...d.aliases] : [id];
  });
}

function group(items: PaletteItem[]): PaletteGroup {
  return { kind: items[0].kind, label: GROUP_LABEL[items[0].kind], items };
}

/**
 * Palette groups for a query. A blank query lists every view, station and page
 * in its usual order; drugs need a query and come from the desk search as is.
 * Inside a group, exact names lead, then names that start with the query, then
 * keyword matches (the station picker's filter). Groups follow their best match,
 * and ties keep the order Go to, Stations, Pages, Add to tray, Recent trays.
 * Recent trays lead a blank query; with a query, a tray shows when one of its
 * items matches.
 */
export function paletteGroups(query: string, recent: readonly TraySnapshot[] = []): PaletteGroup[] {
  const q = normalizeSearchText(query);
  const saved = recent.filter((snap) => snap.ids.length > 0);
  if (!q) {
    const base = [VIEWS, STATIONS, PAGES].map((entries) => group(entries.map((e) => e.item)));
    return saved.length ? [group(saved.slice(0, RECENT_TRAY_ROWS).map(trayItem)), ...base] : base;
  }
  const ranked = [VIEWS, STATIONS, PAGES].map((entries) =>
    entries
      .map((e) => {
        // A station's own alias counts as a keyword; other entries have none.
        const hit = stationMatches({ id: e.item.kind === "station" ? e.item.id : "", label: e.item.label }, e.keywords, query);
        return { item: e.item, tier: tier([e.item.label], hit, q) };
      })
      .filter((row) => row.tier > 0)
      .sort((a, b) => b.tier - a.tier),
  );
  const drugs = searchDrugs(query)
    .slice(0, DRUG_ROWS)
    .map((d) => ({ item: drugItem(d), tier: tier([d.name, d.id, ...d.brands, ...d.aliases], true, q) }));
  const trays = saved
    .map((snap) => ({ item: trayItem(snap), tier: tier(trayNames(snap), false, q) }))
    .filter((row) => row.tier > 0)
    .sort((a, b) => b.tier - a.tier);
  return [...ranked, drugs, trays]
    .filter((rows) => rows.length > 0)
    .map((rows) => ({ best: Math.max(...rows.map((row) => row.tier)), group: group(rows.map((row) => row.item)) }))
    .sort((a, b) => b.best - a.best)
    .map((g) => g.group);
}

/** Ctrl+K or ⌘K with no Alt or Shift, and not while an input method is composing text. */
export function isPaletteShortcut(
  e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "isComposing" | "keyCode">,
): boolean {
  if (e.isComposing || e.keyCode === 229) return false;
  return (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k";
}
