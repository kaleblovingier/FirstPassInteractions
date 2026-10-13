# DRAFT - NEEDS KALEB TO VERIFY

# FirstPass Accessibility Conformance Report
## WCAG 2.2 Edition (based on VPAT® Version 2.5 Rev)

> **DRAFT - NEEDS KALEB TO VERIFY.** This report is based only on automated scans and scripted keyboard tests. No manual screen-reader testing (NVDA, JAWS, VoiceOver, TalkBack) has been done. Do not send it to a customer until Kaleb has reviewed it.

**Name of Product/Version:** FirstPass desk (web app), `main` as of 2026-10-12 (includes PRs #94–#161 listed below)
**Report Date:** 2026-10-12 (draft)
**Product Description:** Educational drug-interaction desk and public label-sourced pair and drug pages, used in a web browser.
**Contact Information:** Kaleb Lovingier, kaleblovingier@gmail.com
**Notes:** Scope is the desk at `/` (all header views), `/recover`, Stripe-return cancel view, `/pairs`, `/pair/*` and `/drug/*`. Third-party checkout (Stripe, PayPal) is out of scope.
**Evaluation Methods Used:**
- **axe-core** (via `@axe-core/playwright`, Chrome) with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, at 320px and 1280px. Script: `/workspace/a11y19-test/audit.mjs` (results `before.json`, `after.json`, `after20.json`, `pr152.json`, `pr155.json`, `pr159.json`). Latest result: **0 violations** on every scanned view and page. Scanned views: desk home, a loaded pair, Library, Sources, Enzyme map, Learn, Cases, Compare, Safety, Find help, Plans, Unlock, Metabolizer status, `/recover`, Stripe-return cancel, `/pairs`, about 50 pair pages and 20 `/drug` hubs.
- **Lighthouse** (accessibility, best practices, SEO), mobile and desktop, on `/`, `/recover`, `/pairs` and 5 pair pages. Latest scores were 100 for accessibility, 77 for best practices and 100 for SEO on every page tested (`lh20-after-*.json`).
- **Scripted keyboard journeys:** `scripts/keyboard-journeys.mjs` (Playwright, keyboard only). Latest result was 36/36 checks passing.
- **Scripted checks** for headings and titles, reflow at 320/640/1280 CSS px, `prefers-reduced-motion` and forced-colors emulation (#158).
- **Not used:** manual screen-reader testing, testing with users with disabilities, mobile assistive technology.

## Applicable Standards/Guidelines

| Standard/Guideline | Included In Report |
| --- | --- |
| Web Content Accessibility Guidelines 2.2 | Level A (Yes), Level AA (Yes), Level AAA (No) |

## Terms

- **Supports:** automated or scripted evidence listed in the row shows the criterion is met for the scope tested, and no known failures exist.
- **Partially Supports:** some functionality is known not to meet the criterion, or only part was tested and gaps are known.
- **Does Not Support:** most functionality does not meet the criterion. *(No row currently uses this.)*
- **Not Applicable:** the criterion does not apply to the product.
- **Not tested:** there is no evidence yet. This is the VPAT "Not Evaluated" term, used here even for Level A/AA, which VPAT normally discourages. These rows must be tested before the report is final.

## WCAG 2.2 Report

### Table 1: Success Criteria, Level A

| Criteria | Conformance Level | Remarks and Explanations |
| --- | --- | --- |
| 1.1.1 Non-text Content | Not tested | axe `image-alt`, `svg-img-alt` and `button-name` pass on every scanned view (0 violations; `after.json`, `after20.json`). Decorative plates use `alt=""`. Whether each text alternative is *meaningful* has not been reviewed by a person. |
| 1.2.1 Audio-only and Video-only (Prerecorded) | Not applicable | The product has no audio or video (no `<audio>`, `<video>` or embedded media in `src/`). |
| 1.2.2 Captions (Prerecorded) | Not applicable | No video content. |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | Not applicable | No video content. |
| 1.3.1 Info and Relationships | Supports | axe structure rules (`list`, `listitem`, `dlitem`, `label`, `aria-*`, `heading-order` family) report 0 violations. #126 labels host-factor toggle groups (`role=group` + `aria-labelledby`); #153 fixed `<dt>/<dd>` without `<dl>` on Compare; #158 gives each page/view one h1; /drug hub grade groups use h2 + lists. Not verified with a screen reader. |
| 1.3.2 Meaningful Sequence | Not tested | Keyboard order follows visual order in the scripted journeys (`scripts/keyboard-journeys.mjs`), but reading order has not been checked with a screen reader. |
| 1.3.3 Sensory Characteristics | Not tested | No review of instructions for shape/position-only references. |
| 1.4.1 Use of Color | Supports | #108 underlines links that relied on accent color alone; #98 gives medication-review toggles a visible edge; #104 stops empty enzyme cells looking like substrate dots; severity is always labelled with text (`docs/accessibility/wcag-conformance.md`). #158 keeps pressed/selected toggles distinguishable in forced-colors mode. |
| 1.4.2 Audio Control | Not applicable | No audio. |
| 2.1.1 Keyboard | Supports | `scripts/keyboard-journeys.mjs` (36/36 checks, keyboard only): search and add drugs, open a pair result, switch all nine views, Unlock dialog, Plans, Library filters, host-factor toggles, /recover, /pairs → pair page → desk. #161 fixed search Escape and chip removal focus. Scope limit: the many specialty stations (e.g. renal, oncology, pregnancy) were not individually walked. |
| 2.1.2 No Keyboard Trap | Supports | Journey script and earlier tab walks (84/170/218 stops) found no trap; the only containment is the open Unlock/clinical packet dialog, which releases on Escape (#146). |
| 2.1.4 Character Key Shortcuts | Not tested | The search box shows a `/` hint. Whether a single-character shortcut exists and can be turned off or remapped was not tested. |
| 2.2.1 Timing Adjustable | Not tested | No session timeouts were found in the tested journeys, but this was not systematically reviewed (e.g. checkout handoff). |
| 2.2.2 Pause, Stop, Hide | Not tested | No auto-playing or auto-updating content was seen in scanned views, and a global `prefers-reduced-motion` override exists, but not formally reviewed. |
| 2.3.1 Three Flashes or Below Threshold | Not tested | No flashing content observed; not formally tested. |
| 2.4.1 Bypass Blocks | Supports | #113 adds a Skip to content link as the first focusable control, moving focus to `main`. axe `bypass` passes. |
| 2.4.2 Page Titled | Supports | Every route has a `<title>` (axe `document-title` passes). /pairs, pair pages and /drug hubs have unique descriptive titles (0 duplicates in the #159 scan); #158 gave /recover its own title. Note: in-app desk views (Library, Learn, etc.) are views of one page and share the title "FirstPass". |
| 2.4.3 Focus Order | Supports | Journey script: focus stays on the control after view switches and filter toggles, moves into dialogs and returns to the opener on close (#146), lands on the result after /recover submit (#149), and moves to the next chip or search box after removing a drug (#161). |
| 2.4.4 Link Purpose (In Context) | Not tested | axe `link-name` passes; purpose of each link in context was not reviewed by a person. |
| 2.5.1 Pointer Gestures | Not tested | No multipoint/path gestures known, not formally reviewed. |
| 2.5.2 Pointer Cancellation | Not tested | Controls are native buttons/links (activate on up-event by default); not formally tested. |
| 2.5.3 Label in Name | Not tested | Not reviewed (requires comparing visible labels with accessible names, e.g. chips and `aria-label` overrides). |
| 2.5.4 Motion Actuation | Not applicable | No device-motion features. |
| 3.1.1 Language of Page | Supports | `<html lang="en">` in `src/routes/__root.tsx`; axe `html-has-lang` / `html-lang-valid` pass. |
| 3.2.1 On Focus | Not tested | No context changes on focus seen in the journey script; not formally tested across all stations. |
| 3.2.2 On Input | Not tested | Not formally tested. |
| 3.2.6 Consistent Help | Not tested | The desk header has "Find help" in the same place on every view; static /pairs, pair and /drug pages were not checked for a help mechanism. |
| 3.3.1 Error Identification | Partially Supports | #149: /recover marks the email field `aria-invalid` and links it to the error text, which is announced. Other forms (checkout handoff, key redeem, dose entry) were not tested. |
| 3.3.2 Labels or Instructions | Partially Supports | axe `label` passes; the drug search and /recover email have programmatic labels. Other forms not manually reviewed. |
| 3.3.7 Redundant Entry | Not tested | Not tested. |
| 4.1.1 Parsing | Not applicable | Obsolete and removed in WCAG 2.2. |
| 4.1.2 Name, Role, Value | Supports | axe `button-name`, `aria-*`, `nested-interactive`, `aria-hidden-focus` pass (0 violations). Toggles expose `aria-pressed`, nav exposes `aria-current`, search is a combobox with `aria-activedescendant`; #153 made the locked preview `inert`. Not verified with NVDA/JAWS/VoiceOver. |

### Table 2: Success Criteria, Level AA

| Criteria | Conformance Level | Remarks and Explanations |
| --- | --- | --- |
| 1.2.4 Captions (Live) | Not applicable | No live media. |
| 1.2.5 Audio Description (Prerecorded) | Not applicable | No video. |
| 1.3.4 Orientation | Not tested | Layouts tested at 320px and 1280px widths, not by rotating a device. |
| 1.3.5 Identify Input Purpose | Not tested | `autocomplete` on email fields not reviewed. |
| 1.4.3 Contrast (Minimum) | Supports | axe `color-contrast` 0 violations on all scanned views; `src/lib/a11y/contrast.test.ts` fails the build if any text token drops below 4.5:1 (see `wcag-conformance.md`). |
| 1.4.4 Resize Text | Supports | 200% zoom checked as 640 CSS px on desk home, a loaded pair, /pairs, a pair page and the desk views: no horizontal scroll (#141, #158). Text-only zoom in a browser setting was not separately tested. |
| 1.4.5 Images of Text | Not tested | Not reviewed. |
| 1.4.10 Reflow | Supports | At 320 CSS px (400% of 1280) no view scrolls sideways (#141, #158 checks on all desk views, /recover, /pairs and pair pages). Data tables scroll inside their own container, which the exception allows. |
| 1.4.11 Non-text Contrast | Supports | Focus outline ≥5.6:1, text-field boundaries in the subtle text color (≥4.5:1), medication-review toggles given an edge (#98), enzyme empty cells fixed (#104). |
| 1.4.12 Text Spacing | Not tested | Only the start screen was checked with WCAG text-spacing values (no sideways scroll); other views and overlap were not checked. |
| 1.4.13 Content on Hover or Focus | Not tested | Some controls use `title` tooltips; dismissible/hoverable behavior not tested. |
| 2.4.5 Multiple Ways | Not tested | Navigation, search, /pairs index, /drug hubs and sitemap exist, but this was not assessed as a criterion. |
| 2.4.6 Headings and Labels | Supports | #158 promoted each view's main heading to h1 and added screen-reader-only h1s for Enzyme map and Learn; hub grade groups use descriptive h2s. axe `empty-heading` and `label` pass. |
| 2.4.7 Focus Visible | Supports | Global `:focus-visible` 2px accent outline; the journey script fails any focused element without an outline/ring and passed; #158 adds a forced-colors focus ring. |
| 2.4.11 Focus Not Obscured (Minimum) | Not tested | Sticky elements (e.g. Library's sticky count bar) were not checked for covering focused items. |
| 2.5.7 Dragging Movements | Not tested | No drag interactions known; not formally reviewed. |
| 2.5.8 Target Size (Minimum) | Supports | axe `target-size` (wcag22aa tag) passes on all scanned views at 320px and 1280px. |
| 3.1.2 Language of Parts | Not tested | Not reviewed. |
| 3.2.3 Consistent Navigation | Not tested | The desk header is the same on every desk view; consistency with static SEO pages not assessed. |
| 3.2.4 Consistent Identification | Not tested | Not reviewed. |
| 3.3.3 Error Suggestion | Not tested | Only /recover reviewed (#149); not assessed product-wide. |
| 3.3.4 Error Prevention (Legal, Financial, Data) | Not tested | Payment is handed to Stripe/PayPal-hosted checkout, which was out of scope and not tested. |
| 3.3.8 Accessible Authentication (Minimum) | Not tested | License-key redeem and the operator PIN screen not tested (e.g. whether paste and password managers work). |
| 4.1.3 Status Messages | Partially Supports | Announced: /recover success/error (#149), Library "N shown" count (#161), host-factor result text (#126), search no-match, drugs added to the desk (#161). Gap: removing a drug relies on `aria-relevant="removals"`, which several screen readers ignore, so removal may be silent. Not verified with a screen reader. |

### Table 3: Success Criteria, Level AAA

Not evaluated.

## Summary

| Conformance level | Count (A + AA, 56 criteria) |
| --- | --- |
| Supports | 16 |
| Partially Supports | 3 |
| Does Not Support | 0 |
| Not tested | 29 |
| Not applicable | 8 |

## Known gaps and open items

1. **No manual screen-reader testing.** Nothing in this report has been checked with NVDA, JAWS, VoiceOver or TalkBack. That pass is needed for 1.3.1, 1.3.2, 4.1.2 and 4.1.3.
2. **Removing a drug may not be announced.** The chip row uses `aria-live="polite"` with `aria-relevant="additions removals"` (#161). Many screen readers ignore removals, so a guaranteed "removed" message would need new screen-reader-only wording.
3. **Lighthouse best practices scores 77.** Both failures (third-party cookies and DevTools issues) come from the hosting platform's preview script `https://grok.com/grok-app-builder/extensions.js`, which `scripts/grok-pwa-shared.mjs` injects. That is not app code, and it has not been checked whether production loads it.
4. **Desk views share one title.** The desk's views are in-app states of one page, so they all share the title "FirstPass".
5. **Specialty stations were not keyboard-walked one by one** (renal, oncology, pregnancy, hepatic and so on). They are covered only by axe scans of the views they appear in.
6. **Out of scope:** Stripe and PayPal hosted checkout, and the emails Resend sends (key and recovery emails).
7. **Rows still marked "Not tested"** need a manual pass before this report is given to a buyer.

## Evidence index (merged PRs)

| PR | Merged (PT) | Change |
| --- | --- | --- |
| #94 | 2026-10-02 | Focus test updated for the tab-bar breakpoint |
| #98 | 2026-10-02 | Medication review toggles get a visible edge (1.4.11, 1.4.1) |
| #104 | 2026-10-03 | Empty enzyme cells no longer look like a substrate dot (1.4.1) |
| #108 | 2026-10-03 | Underline links that relied on accent color alone (1.4.1) |
| #113 | 2026-10-03 | Skip to content (2.4.1) |
| #126 | 2026-10-05 | Labelled host-factor toggle groups; result text announced (1.3.1, 4.1.3) |
| #141 | 2026-10-12 | No horizontal scroll at 320px (1.4.10) |
| #146 | 2026-10-12 | Clinical packet dialog focus trap and return (2.1.2, 2.4.3) |
| #149 | 2026-10-12 | /recover: announced status, focus, `aria-invalid` (3.3.1, 4.1.3) |
| #153 | 2026-10-12 | Locked preview is `inert`; Compare `<dl>` fix (4.1.2, 1.3.1) |
| #158 | 2026-10-12 | One h1 per view, /recover title, 320px reflow, forced colors (2.4.2, 2.4.6, 1.4.10) |
| #161 | 2026-10-12 | Keyboard flow fixes; announcements; journey script (2.1.1, 2.4.3, 4.1.3) |

Earlier contrast-token work is described in `docs/accessibility/wcag-conformance.md`.

---
*DRAFT - NEEDS KALEB TO VERIFY. "VPAT" is a registered trademark of the Information Technology Industry Council (ITI).*
