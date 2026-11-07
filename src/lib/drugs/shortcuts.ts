/**
 * Keyboard shortcuts for the desk, listed once so the "?" sheet and the key
 * handler cannot drift apart. Single-key shortcuts never fire while the person
 * is typing in a field, so a slash or question mark in a search stays text.
 */

export interface Shortcut {
  /** Keys pressed together, as shown on Windows and Linux. */
  keys: string[];
  /** The same keys on a Mac, when they differ. */
  mac?: string[];
  label: string;
}

export const SHORTCUT_GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: "Anywhere on the desk",
    items: [
      {
        keys: ["Ctrl", "K"],
        mac: ["⌘", "K"],
        label: "Search everything: views, stations, pages, drugs and recent trays",
      },
      { keys: ["/"], label: "Jump to the drug search on the desk" },
      { keys: ["?"], label: "Show this list of shortcuts" },
      { keys: ["Esc"], label: "Close a dialog or an open list" },
    ],
  },
  {
    title: "In Search everything and the drug search",
    items: [
      { keys: ["↑", "↓"], label: "Move through the results" },
      { keys: ["Enter"], label: "Open or add the highlighted result" },
    ],
  },
];

export type ShortcutAction = "sheet" | "search";

type KeyLike = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "isComposing" | "keyCode">;

type TargetLike = {
  tagName?: string;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
} | null;

/** True when keys pressed here belong to a field: inputs, text areas, selects and editable regions. */
export function isTypingTarget(target: TargetLike): boolean {
  if (!target) return false;
  const tag = (target.tagName ?? "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  const role = target.getAttribute?.("role");
  return role === "textbox" || role === "combobox" || role === "searchbox";
}

/** The single-key shortcut a key press asks for, or null. Ctrl+K stays with the palette. */
export function shortcutAction(e: KeyLike, target: TargetLike): ShortcutAction | null {
  if (e.isComposing || e.keyCode === 229) return null;
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (isTypingTarget(target)) return null;
  if (e.key === "?") return "sheet";
  if (e.key === "/") return "search";
  return null;
}
