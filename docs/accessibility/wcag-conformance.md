# Accessibility conformance report (draft, start of a VPAT)

**Product:** FirstPass desk (https://firstpass-desk.vercel.app/)
**Standards:** WCAG 2.1 Level A and AA; Section 508 (which incorporates WCAG 2.0 AA)
**Status:** Draft. Automated checks pass. Manual checks listed below have not been done yet, so this is not a conformance claim.

## What was checked, and how

Automated scan with axe-core (via Playwright and Chrome) using the WCAG 2.0 and 2.1 A and AA rule tags, run against the live desk with this branch's color tokens applied. Views scanned:

- The start screen, and the Library, Sources, CYP map, Learn, Cases and Safety tabs
- The MAT pack (`?pack=mat-cup`), a lab assignment (`?lab=1`), and two worked cases with findings (`?case=cocaine-alcohol`, `?case=dxm-2d6pm`)

Before this branch, the only rule that failed was **color contrast (1.4.3)**, on about 2,300 elements. The muted, subtle and warning text colors fell between about 2.8:1 and 4.44:1 against the page backgrounds, below the 4.5:1 minimum. Three small labels also lost contrast because they were drawn at 70% opacity.

After this branch, every scanned view reports zero violations.

## What changed

- `src/styles.css`: the muted, subtle and warning text colors are darker, so each reaches at least 4.5:1 on every background color the desk uses.
- The count badges in Library and Study and the metabolizer label in the phenotype panel are no longer drawn at reduced opacity.
- `src/lib/a11y/contrast.test.ts` reads `styles.css` and fails if any text color drops below 4.5:1 on any background color, so a future palette change can't quietly undo this.

## Still needs a manual check

Automated tools catch roughly a third to a half of WCAG issues. These criteria need a person to test them before we claim conformance:

| Area | WCAG criteria | How to check |
| --- | --- | --- |
| Keyboard use | 2.1.1, 2.1.2, 2.4.3, 2.4.7 | Use the whole desk with only the keyboard: add drugs, open findings, switch tabs, export. Focus must always be visible and never get trapped. |
| Screen reader | 1.3.1, 4.1.2, 4.1.3 | Run through a case with NVDA or VoiceOver. Findings, severity and status changes must be announced. |
| Zoom and reflow | 1.4.4, 1.4.10 | At 200% zoom and at a 320px-wide window, nothing is cut off and no sideways scrolling is needed. |
| Text spacing | 1.4.12 | Apply the WCAG text-spacing bookmarklet and confirm nothing overlaps. |
| Non-text contrast | 1.4.11 | Borders of inputs and toggles, and focus rings, reach 3:1. |
| Color alone | 1.4.1 | Severity is never shown by color alone (the label text must always be present). |
| Dimmed toggles | 1.4.3 | The inactive toggles drawn at 40% opacity in `dossier.tsx` and `clinical.tsx`. If they are selectable options rather than disabled controls, they need full contrast. |

The locked tray state in `tray.tsx` is a disabled control and is exempt from the contrast rule.

## Next step toward a VPAT

Once the manual checks are done, fill in the ITI VPAT 2.x template (WCAG and Section 508 editions) from this report, marking each criterion Supports, Partially Supports or Does Not Support, with the evidence above.
