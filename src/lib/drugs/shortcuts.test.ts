import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SHORTCUT_GROUPS, isTypingTarget, shortcutAction } from "./shortcuts";

const key = (k: string, mods: Partial<Record<"ctrlKey" | "metaKey" | "altKey" | "isComposing", boolean>> = {}) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  isComposing: false,
  keyCode: 0,
  ...mods,
});
const el = (tagName: string, extra: { isContentEditable?: boolean; role?: string } = {}) => ({
  tagName,
  isContentEditable: extra.isContentEditable ?? false,
  getAttribute: (name: string) => (name === "role" ? (extra.role ?? null) : null),
});

test("? opens the sheet and / jumps to the drug search outside fields", () => {
  assert.equal(shortcutAction(key("?"), el("BODY")), "sheet");
  assert.equal(shortcutAction(key("/"), el("BUTTON")), "search");
  assert.equal(shortcutAction(key("/"), null), "search");
  assert.equal(shortcutAction(key("k"), el("BODY")), null);
});

test("single keys stay text while typing in a field", () => {
  for (const t of [el("INPUT"), el("textarea"), el("SELECT"), el("DIV", { isContentEditable: true }), el("DIV", { role: "combobox" })]) {
    assert.equal(isTypingTarget(t), true);
    assert.equal(shortcutAction(key("?"), t), null);
    assert.equal(shortcutAction(key("/"), t), null);
  }
  assert.equal(isTypingTarget(el("A")), false);
});

test("modifier keys and input methods leave the keys alone", () => {
  assert.equal(shortcutAction(key("/", { ctrlKey: true }), el("BODY")), null);
  assert.equal(shortcutAction(key("?", { metaKey: true }), el("BODY")), null);
  assert.equal(shortcutAction(key("/", { altKey: true }), el("BODY")), null);
  assert.equal(shortcutAction(key("?", { isComposing: true }), el("BODY")), null);
  assert.equal(shortcutAction({ ...key("/"), keyCode: 229 }, el("BODY")), null);
});

test("the sheet lists each shortcut the desk handles", () => {
  const all = SHORTCUT_GROUPS.flatMap((g) => g.items);
  const keys = all.map((s) => s.keys.join("+"));
  for (const k of ["Ctrl+K", "/", "?", "Esc", "Enter"]) assert.ok(keys.includes(k), k);
  assert.equal(new Set(all.map((s) => s.label)).size, all.length);
  for (const s of all) assert.doesNotMatch(s.label, /—/);
});

test("the footer mounts the sheet so the keys work on every desk view", () => {
  const footer = readFileSync(new URL("../../components/desk/operator.tsx", import.meta.url), "utf8");
  assert.match(footer, /<ShortcutSheet \/>/);
  const sheet = readFileSync(new URL("../../components/desk/shortcut-sheet.tsx", import.meta.url), "utf8");
  assert.match(sheet, /aria-modal="true"/, "another open dialog keeps the keyboard");
  assert.match(sheet, /getElementById\("drug-search"\)/);
});
