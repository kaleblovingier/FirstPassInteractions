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


## Keyboard, focus, and reflow (checked on a local build of this branch)

Checked in Chrome, by script, against a local build of current source. Not a screen reader.

- Tabbed the start screen (84 stops), a worked case (170), and the MAT pack (218). Focus never got stuck, and every stop had a visible indicator.
- The Unlock button had no visible focus ring. Its outline was turned off, and the shadow on the button replaced the faint accent ring, so keyboard users could not see where they were. Focus is now a 2px solid accent outline. Accent against the page backgrounds is at least 5.6:1, above the 3:1 minimum for a focus indicator.
- At 320px wide, and at 640px wide (what a 1280px window looks like at 200% zoom), the start screen, the worked case, the MAT pack, and all nine tabs fit without sideways scrolling.
- The sideways scroll at 640px came from the header. It switched to a single non-wrapping row at 640px, which is exactly the 200% width. The row now waits until 768px, and the tab bar wraps until then.

Still needs a person: a screen reader pass, text spacing, and whether the dimmed toggles in `dossier.tsx` and `clinical.tsx` are real options or disabled controls.

## Still needs a manual check

Automated tools catch roughly a third to a half of WCAG issues. These criteria need a person to test them before we claim conformance:

| Area | WCAG criteria | How to check |
| --- | --- | --- |
| Keyboard use | 2.1.1, 2.1.2, 2.4.7 | Script tabbed three views with no trap and a visible ring on every stop. A person still needs to add a drug, open a finding, and export with only the keyboard. |
| Screen reader | 1.3.1, 4.1.2, 4.1.3 | Run through a case with NVDA or VoiceOver. Findings, severity and status changes must be announced. |
| Zoom and reflow | 1.4.4, 1.4.10 | Script found no sideways scroll at 320px or at 640px on the views above. A person should still confirm nothing is cut off. |
| Text spacing | 1.4.12 | Apply the WCAG text-spacing bookmarklet and confirm nothing overlaps. |
| Non-text contrast | 1.4.11 | The focus outline is covered. Borders of inputs and toggles are not. |
| Color alone | 1.4.1 | Severity is never shown by color alone (the label text must always be present). |
| Dimmed toggles | 1.4.3 | The inactive toggles drawn at 40% opacity in `dossier.tsx` and `clinical.tsx`. If they are selectable options rather than disabled controls, they need full contrast. |

The locked tray state in `tray.tsx` is a disabled control and is exempt from the contrast rule.

## Next step toward a VPAT

Once the manual checks are done, fill in the ITI VPAT 2.x template (WCAG and Section 508 editions) from this report, marking each criterion Supports, Partially Supports or Does Not Support, with the evidence above.
