import { addedSummary, rowsWith } from "@/lib/drugs/just-added";
import type { Finding } from "@/lib/drugs/types";

/** One line after an add: what the new item brought. The rows it names are marked New in the list. */
export function JustAddedNote({ ids, findings }: { ids: string[]; findings: Finding[] }) {
  if (ids.length === 0) return null;
  const marked = rowsWith(findings, ids).length > 0;
  return (
    <p role="status" className="rounded-lg border border-border/70 bg-surface px-4 py-2.5 text-sm text-fg">
      {addedSummary(ids, findings)}
      {marked ? <span className="text-muted"> Those rows are marked New in the findings.</span> : null}
    </p>
  );
}
