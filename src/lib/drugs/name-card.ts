import { DRUG_BY_ID } from "./catalog";
import { ITEM_KIND_LABEL, type ItemKind } from "./types";

export type StoredName = {
  id: string;
  name: string;
  kind: ItemKind;
  kindLabel: string;
  cls: string;
  watch: string;
  note: string;
};

/** Names already on the desk. Unknown ids are dropped. Not a finding. */
export function storedNames(ids: readonly string[]): StoredName[] {
  const seen = new Set<string>();
  const out: StoredName[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const drug = DRUG_BY_ID[id];
    if (!drug) continue;
    out.push({
      id: drug.id,
      name: drug.name,
      kind: drug.kind,
      kindLabel: ITEM_KIND_LABEL[drug.kind],
      cls: drug.cls,
      watch: drug.toxicityHint.trim(),
      note: (drug.note ?? "").trim(),
    });
  }
  return out;
}

/** Plain restatement of stored kind, class, watch phrase, and note. */
export function storedNamePlain(ids: readonly string[]): string {
  const lines = ["Stored name card. Not a diagnosis and not a milligram."];
  for (const row of storedNames(ids)) {
    lines.push(`${row.name}. ${row.kindLabel}. ${row.cls}.`);
    if (row.watch) lines.push(`Watch: ${row.watch}`);
    if (row.note) lines.push(`Note: ${row.note}`);
  }
  return lines.join("\n");
}
