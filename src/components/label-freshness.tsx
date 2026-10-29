import { labelFreshnessLine, type GradeBasis } from "@/lib/drugs/grade-provenance";

/** Stored SPL date for a label cite. Nothing when this row is not a looked-up label. */
export function LabelFreshnessLine({ basis }: { basis: Pick<GradeBasis, "kind" | "href"> }) {
  const line = labelFreshnessLine(basis);
  if (!line) return null;
  return (
    <p data-testid="label-freshness" className="mt-1 text-xs leading-relaxed text-muted">
      {line}
    </p>
  );
}
