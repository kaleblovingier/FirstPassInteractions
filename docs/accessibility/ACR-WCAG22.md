# FirstPass Accessibility Conformance Report

> **DRAFT - NEEDS KALEB TO VERIFY.** Do not send this to a buyer until Kaleb has reviewed every row. Several rows rest on automated or scripted checks only. No one has tested FirstPass with a screen reader yet.

**Based on:** VPAT® Version 2.5 Rev (WCAG 2.2 edition)

| | |
| --- | --- |
| **Product** | FirstPass desk (web app) and its public pair, pair index and drug hub pages |
| **Version** | `main` as of 2026-10-12, after PR #161 |
| **Report date** | 2026-10-12 (draft) |
| **Contact** | Kaleb Lovingier, kaleblovingier@gmail.com |
| **Standard** | WCAG 2.2, Level A and Level AA |
| **Not covered** | WCAG Level AAA, Revised Section 508 chapters 3 to 6, EN 301 549 |

## Evaluation methods

Every row below is based only on the evidence listed here. Where none of it applies, the row says **Not Evaluated**.

1. **axe-core 4.x through Playwright and Chrome**
   - Rule tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.
   - Widths: 320 CSS px and 1280 CSS px.
   - Script: `/workspace/a11y19-test/audit.mjs`. Results are in `before.json`, `after.json`, `after20.json`, `pr155.json` and `pr159.json`.
   - Views scanned:
     - The desk's home screen, a loaded pair (`?sample=`), and the Library, Sources, Enzyme map, Learn, Cases, Compare, Safety, Find help, Plans, Unlock and Metabolizer status views.
     - `/recover` and the Stripe return screen after a cancelled payment (`?fp_cancel=1`).
     - `/pairs`, a sample of pair pages, and a sample of `/drug/*` hub pages.
   - Before PR #153 the scan found 24 serious issues. Since then it has found **0 violations at any severity**.
2. **Lighthouse**
   - Categories: accessibility, best practices and SEO, mobile and desktop presets.
   - Pages: `/`, `/recover`, `/pairs` and 5 pair pages.
   - Scores: accessibility **100** on every page (`/` was 97 before PR #153), SEO **100**, best practices **77**. See the known gaps.
3. **Keyboard journey script**: `scripts/keyboard-journeys.mjs`, added in PR #161, 36 of 36 checks pass. It uses only Tab, Shift+Tab, Enter, Space, Escape and the arrow keys to:
   - search for drugs and add two
   - open a pair result
   - switch between all nine desk views
   - open the Unlock dialog, then close it with Escape and check that focus returns to the button
   - use the Library filters and the host-factor toggles
   - use `/recover`
   - go from `/pairs` to a pair page to "Open this pair in the desk"
4. **Other scripted checks** (PR #158 and the earlier `docs/accessibility/wcag-conformance.md`):
   - reflow at 320, 640 and 1280 CSS px
   - one h1 and a unique title per route
   - forced-colors (high contrast) emulation for focus rings and toggle states
   - reduced-motion emulation
   - text spacing on the start screen
5. **Unit test** `src/lib/a11y/contrast.test.ts`: fails if any text color drops below 4.5:1 on any background color the app uses.
6. **Source review**: targeted code searches, for example for video and audio elements, drag handlers and the `/` shortcut.
7. **Merged accessibility pull requests**: #94, #98, #104, #108, #113, #126, #146, #149, #153, #158 and #161. All are merged, as confirmed with `gh`.

**Not done:**
- manual testing with a screen reader (NVDA, JAWS, VoiceOver or TalkBack)
- testing with speech recognition or switch access
- browser testing beyond Chrome
- a manual expert audit

## Terms

| Term | Meaning |
| --- | --- |
| **Supports** | Evidence above shows the criterion is met for the content we tested. |
| **Partially Supports** | Some functionality does not meet the criterion. The gap is described in the row. |
| **Not Evaluated** | We have no evidence strong enough to claim support, even if automated checks pass. |
| **Not Applicable** | The product has no content of this kind. |

## Summary

| Level | Supports | Partially Supports | Not Evaluated | Not Applicable |
| --- | --- | --- | --- | --- |
| A (32 rows) | 8 | 1 | 16 | 7 |
| AA (24 rows) | 7 | 2 | 13 | 2 |
| **Total (56 rows)** | **15** | **3** | **29** | **9** |

The 56 rows include 4.1.1, which WCAG 2.2 removed. Its row is marked Not Applicable.

## Table 1: Success Criteria, Level A

| Criteria | Conformance level | Remarks and evidence |
| --- | --- | --- |
| 1.1.1 Non-text Content | Not Evaluated | axe `image-alt` and related rules pass. Decorative plates use `alt=""`. No person has reviewed whether the alt text is meaningful. |
| 1.2.1 Audio-only and Video-only (Prerecorded) | Not Applicable | Source search found no audio or video content. |
| 1.2.2 Captions (Prerecorded) | Not Applicable | No video. |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | Not Applicable | No video. |
| 1.3.1 Info and Relationships | Not Evaluated | axe passes. Fixes so far: real `<dl>` lists (#153), headings (#158), labelled toggle groups (#126) and a labelled search combobox. No screen reader pass yet. |
| 1.3.2 Meaningful Sequence | Not Evaluated | Tab order in the journey script follows the visual order. Reading order has not been checked with a screen reader. |
| 1.3.3 Sensory Characteristics | Not Evaluated | No review of the instructions text. |
| 1.4.1 Use of Color | Supports | Severity always has a text label. Links that relied on color alone are underlined (#108). Toggle states have a visible edge (#98), and empty enzyme cells no longer look like substrate dots (#104). |
| 1.4.2 Audio Control | Not Applicable | No audio. |
| 2.1.1 Keyboard | Supports | Keyboard journey script, 36 of 36 checks pass, covering the core journeys listed above. The specialty stations (for example oncology, renal and pregnancy) are not covered by the script. |
| 2.1.2 No Keyboard Trap | Supports | The script and earlier tabbing runs (84, 170 and 218 tab stops) found no traps. Dialogs keep focus inside only while open and release it on Escape (#146, #161). |
| 2.1.4 Character Key Shortcuts | Partially Supports | Pressing `/` outside a text field jumps to the search box (`search.tsx`). The shortcut can't be turned off or remapped. |
| 2.2.1 Timing Adjustable | Not Evaluated | No time limits were found in the journeys. There has been no formal review. |
| 2.2.2 Pause, Stop, Hide | Not Evaluated | A global reduced-motion rule turns off animations and transitions (0 elements animate under emulation). Auto-moving content has not been reviewed for users who don't set reduced motion. |
| 2.3.1 Three Flashes or Below Threshold | Not Evaluated | Not reviewed. |
| 2.4.1 Bypass Blocks | Supports | "Skip to content" is the first focusable control and moves focus to `#main` (#113). |
| 2.4.2 Page Titled | Supports | Every route has a unique, descriptive `<title>`: pair pages, `/pairs`, the `/drug/*` hubs and `/recover` (#158). The desk's in-app views share the route title "FirstPass"; see the known gaps. |
| 2.4.3 Focus Order | Supports | The journey script checks that focus order is logical. Focus is restored after the dialog closes (#146), after a chip is removed (#161), after the /recover form is submitted (#149) and after Escape in search (#161). |
| 2.4.4 Link Purpose (In Context) | Not Evaluated | axe `link-name` passes. Repeated "Copy link" buttons have not been reviewed by a person. |
| 2.5.1 Pointer Gestures | Not Applicable | Source search found no multipoint or path-based gestures. |
| 2.5.2 Pointer Cancellation | Not Evaluated | The app uses native buttons, but this has not been verified. |
| 2.5.3 Label in Name | Not Evaluated | Not reviewed by a person. |
| 2.5.4 Motion Actuation | Not Applicable | Source search found no device-motion handlers. |
| 3.1.1 Language of Page | Supports | `<html lang="en">`. axe `html-has-lang` passes. |
| 3.2.1 On Focus | Supports | Scripted tabbing across all views found no change of context on focus. |
| 3.2.2 On Input | Not Evaluated | Not reviewed. |
| 3.2.6 Consistent Help | Not Evaluated | "Find help" sits in the shell navigation on every desk view. This has not been formally checked against the public pages. |
| 3.3.1 Error Identification | Not Evaluated | The `/recover` error is linked to the field and marked invalid (#149). Other forms, such as the Plans email field and key redemption, have not been tested. |
| 3.3.2 Labels or Instructions | Not Evaluated | axe `label` passes. The search field and the `/recover` email field have labels. Not reviewed by a person. |
| 3.3.7 Redundant Entry | Not Evaluated | Not reviewed. |
| 4.1.1 Parsing | Not Applicable | Removed in WCAG 2.2. |
| 4.1.2 Name, Role, Value | Not Evaluated | axe passes. Fixes so far: `aria-pressed` on toggles and Find help tabs, `aria-current` on the navigation, and the search combobox and listbox pattern. No screen reader pass yet. |

## Table 2: Success Criteria, Level AA

| Criteria | Conformance level | Remarks and evidence |
| --- | --- | --- |
| 1.2.4 Captions (Live) | Not Applicable | No live media. |
| 1.2.5 Audio Description (Prerecorded) | Not Evaluated | No video was found. This row is left Not Evaluated until Kaleb confirms there is no video anywhere, including linked pages. |
| 1.3.4 Orientation | Not Evaluated | No orientation lock was found in source. Not Evaluated on a device. |
| 1.3.5 Identify Input Purpose | Partially Supports | `/recover` email uses `autocomplete="email"`. The Plans "Receipt & license key email" field has no `autocomplete` attribute. |
| 1.4.3 Contrast (Minimum) | Supports | axe `color-contrast` passes, and the `contrast.test.ts` unit test enforces 4.5:1 for text tokens. |
| 1.4.4 Resize Text | Supports | No horizontal scroll at 640 CSS px (200% of 1280) on any scanned view (#158). A person has not visually confirmed that nothing is clipped. |
| 1.4.5 Images of Text | Not Evaluated | Not reviewed. |
| 1.4.10 Reflow | Supports | No horizontal scroll at 320 CSS px on the desk views, `/pairs`, pair pages, the hubs and `/recover`. Drug chips and the Find help tabs were fixed to wrap (#158). |
| 1.4.11 Non-text Contrast | Supports | The focus outline is at least 5.6:1. Text fields have a 1px border in the subtle text color, at least 4.5:1. Toggles have visible edges (#98). |
| 1.4.12 Text Spacing | Not Evaluated | Only the start screen was checked, with no sideways scroll. The full pass still needs a person. |
| 1.4.13 Content on Hover or Focus | Not Evaluated | Not reviewed. |
| 2.4.5 Multiple Ways | Supports | Desk navigation, drug search, the `/pairs` index, `/drug/*` hubs and `sitemap.xml`. |
| 2.4.6 Headings and Labels | Not Evaluated | Every view has one h1 (#158; Enzyme map and Learn have screen-reader-only h1s). Whether the headings are descriptive has not been reviewed by a person. |
| 2.4.7 Focus Visible | Supports | The journey script checks for a painted indicator at every stop. Under forced colors the ring uses CanvasText (#158). See also #94 and #113. |
| 2.4.11 Focus Not Obscured (Minimum) | Not Evaluated | Sticky bars, such as the Library count bar, have not been checked against focused controls. |
| 2.5.7 Dragging Movements | Not Applicable | Source search found no drag interactions. Images set `draggable={false}`. |
| 2.5.8 Target Size (Minimum) | Supports | The axe `target-size` rule (in the `wcag22aa` tag) passes on every scanned view at both widths. |
| 3.1.2 Language of Parts | Not Evaluated | Not reviewed. |
| 3.2.3 Consistent Navigation | Not Evaluated | The shell navigation is shared across the desk. Not formally reviewed. |
| 3.2.4 Consistent Identification | Not Evaluated | Not reviewed. |
| 3.3.3 Error Suggestion | Not Evaluated | Not reviewed. |
| 3.3.4 Error Prevention (Legal, Financial, Data) | Not Evaluated | Payment happens on Stripe's hosted checkout, which we don't control. The in-app steps before payment have not been reviewed. |
| 3.3.8 Accessible Authentication (Minimum) | Not Evaluated | Key redemption and sign-in have not been reviewed. |
| 4.1.3 Status Messages | Partially Supports | Live regions announce the `/recover` result (#149), host-factor result text (#126), drug additions and the Library "shown" count (#161). Drug removals depend on `aria-relevant="removals"`, which many screen readers ignore. |


## Known gaps and planned fixes

1. **Drug removal announcement (4.1.3).** Removing a drug chip moves focus correctly, but the announcement relies on `aria-relevant="removals"`, which many screen readers don't support. A reliable fix needs a short screen-reader-only message such as "Removed X". That is new wording and needs Kaleb's approval.
2. **`/` shortcut (2.1.4).** The single-key shortcut to the search box can't be turned off. Possible fixes: add a modifier key, or only listen when no other control has focus plus add a setting.
3. **Plans email autocomplete (1.3.5).** The "Receipt & license key email" field needs `autocomplete="email"`. This is a one-attribute fix.
4. **Desk view titles (2.4.2, note).** Desk views share the route title "FirstPass". Each route has a unique title, so this row is marked Supports. Per-view titles would need new wording.
5. **Lighthouse best practices: 77.** Both failing audits (third-party cookies and DevTools issues) come from the hosting platform's injected `grok.com/grok-app-builder/extensions.js` (`scripts/grok-pwa-shared.mjs`), not from app code. This doesn't affect WCAG, but buyers' security reviewers may ask about it.
6. **No assistive technology testing.** Nobody has tested with NVDA, JAWS, VoiceOver or TalkBack, or with speech or switch input. Most of the Not Evaluated rows depend on that.
7. **Script coverage.** The keyboard journeys cover the core flows only. The specialty stations and the operator-only screen are not covered.
8. **Browser coverage.** Only Chrome on Linux (headless) was tested.

## Legal disclaimer

This report describes FirstPass as tested on the date above, using the methods listed. It is a draft and not a guarantee of conformance. FirstPass is an educational tool. Third-party services, such as Stripe Checkout and email delivery, are outside its scope.
