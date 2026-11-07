import {
  deskOnlyNotice,
  gradePath,
  reviewBases,
  type BasisReview,
} from "@/lib/drugs/basis-review";
import type { Finding } from "@/lib/drugs/types";

/** Plain notice when the only basis on a row is the desk's own map (automation-bias guard). */
export function DeskOnlyNotice({ finding }: { finding: Finding }) {
  const notice = deskOnlyNotice(finding);
  if (!notice) return null;
  return (
    <p
      data-testid="desk-only-notice"
      className="rounded-md border border-warn/30 bg-warn-soft/30 px-3 py-2 text-xs leading-relaxed text-fg"
    >
      {notice}
    </p>
  );
}

/** "How this grade was reached": the rule inputs already on the finding. Adds no clinical content. */
export function GradePath({ finding }: { finding: Finding }) {
  return (
    <div data-testid="grade-path" className="rounded-md bg-bg-sunken px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted">
        How this grade was reached
      </p>
      <p className="mt-1 text-xs leading-relaxed text-fg">{gradePath(finding)}</p>
    </div>
  );
}

/** FDA section and retrieval date for one source, or a plain line saying they are not saved. */
export function SourceReviewNote({
  note,
  provenance,
}: Pick<BasisReview, "note" | "provenance">) {
  if (provenance === "desk") return null;
  return (
    <p data-testid="source-review" className="mt-0.5 text-[11px] leading-relaxed text-subtle">
      {note}
    </p>
  );
}

/** Section and retrieval notes for the first sources on a row, for views that show sources as pills. */
export function SourceReviewList({ finding, limit = 2 }: { finding: Finding; limit?: number }) {
  const rows = reviewBases(finding)
    .slice(0, limit)
    .filter((r) => r.provenance !== "desk");
  if (!rows.length) return null;
  return (
    <ul data-testid="source-review-list" className="space-y-0.5">
      {rows.map((r) => (
        <li
          key={`${r.basis.kind}-${r.basis.label}`}
          className="text-[11px] leading-relaxed text-subtle"
        >
          <span className="text-muted">{r.basis.label}.</span> {r.note}
        </li>
      ))}
    </ul>
  );
}
