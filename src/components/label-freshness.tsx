import {
  labelFreshnessLine,
  liveLabelDateLine,
  noteLabelBasis,
  type GradeBasis,
} from "@/lib/drugs/grade-provenance";

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

/** Monograph note plus the stored SPL date for a DailyMed setid in that note.
 *  The note text is unchanged. No grade is read or written. */
export function MonographNote({ note }: { note: string }) {
  const basis = noteLabelBasis(note);
  return (
    <>
      <p className="mt-3 text-sm leading-relaxed text-fg">{note}</p>
      {basis ? <LabelFreshnessLine basis={basis} /> : null}
    </>
  );
}

/** Both dates when a live FDA or DailyMed day differs from the file. Nothing when
 *  they match, the setid is not on file, or the live pull sent no date. */
export function LiveLabelDates({ setid, liveDate }: { setid: string; liveDate?: string | null }) {
  const line = liveLabelDateLine(setid, liveDate);
  if (!line) return null;
  return (
    <p data-testid="label-date-compare" className="mt-1 text-xs leading-relaxed text-muted">
      {line}
    </p>
  );
}
