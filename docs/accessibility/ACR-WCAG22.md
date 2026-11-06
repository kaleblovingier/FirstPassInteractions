# FirstPass Accessibility Conformance Report

> **DRAFT. Not a conformance claim.** Do not send this to a buyer until Kaleb has reviewed every row. "Supports" and "Partially Supports" are labels for the evidence in that row. They are not a certification, a VPAT grade to publish, or a statement that FirstPass conforms to WCAG. Marketing owns any public wording.

**Based on:** VPAT® Version 2.5 Rev (WCAG 2.2 edition), used as a row template only.

| | |
| --- | --- |
| **Product** | FirstPass desk (web app) and the public pages the checks below name (pair pages, pair index, drug hubs, enzyme pages, practice, recover, for-programs) |
| **Version** | `main` at `7c3bfc6` (2026-11-05), after PR #222 |
| **Report date** | 2026-11-05 (draft) |
| **Contact** | Kaleb Lovingier, kaleblovingier@gmail.com |
| **Standard** | WCAG 2.2, Level A and Level AA, as the reference for the rows |
| **Not covered** | WCAG Level AAA, Revised Section 508 chapters 3 to 6, EN 301 549 |

## Evaluation methods

Rows use only the evidence named here. Where that evidence does not cover the criterion, the row says **Not Evaluated**.

Where a row says "axe" or "the October audit," it means the dated runs below. It does not mean the CI job on `7c3bfc6` passed. That job was still in its preview step when this draft was written (GitHub Actions run [41953368575](https://github.com/kaleblovingier/FirstPassInteractions/actions/runs/41953368575)). This draft does not record that run as a pass or a failure.

1. **axe-core 4.14** (`axe-core` is a devDependency), Chrome through Playwright.
   - Rule tags in `scripts/a11y-gate.mjs`: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`. Best-practice rules are not in that tag list.
   - Widths: 320 and 1280 CSS px.
   - **On main, not yet a finished CI result.** PR #197 added the script. PR #222 added CI job `a11y`: production build, preview on `127.0.0.1:8081`, then `npm run a11y:gate` and `npm run a11y:wcag22`. The gate reads `/sitemap.xml` and checks every `/drug/`, `/pair/` and `/enzyme/` URL, `/enzymes`, the learning-tool clicks (`Learn`, `Cases`, `Enzyme map`, `Study drill`, `Classic pairs`, `Bedside & toxicology`), and `/practice` when that route is served. The gate also runs `scripts/wcag22-checks.mjs` on those same routes.
   - **Dated scans this draft actually uses:**
     - 2026-10-12 draft (after #161): axe through Playwright on the desk views then in the product, `/recover`, a cancelled-payment return, `/pairs`, a sample of pair pages and `/drug/*` hubs. That draft recorded 0 violations after #153. Those JSON files are not in the repo.
     - 2026-10-19 audit (`docs/accessibility/AUDIT-2026-10-19.md`), main `ceefa83`, plus the 2026-10-29 recheck notes in that file (main `9d8ce2c`). The audit is automated results only.
   - Routes the current CI job does **not** open: legal pages (`/privacy`, `/terms`, `/cookies`), `/trust`, the checkout dialog, the Plans view, Watch, Safety, Find help, Compare, specialty stations, and the operator screen. The October audit's extra sweep did include some of those. A clean gate would not re-prove them.
2. **`scripts/wcag22-checks.mjs`** (`npm run a11y:wcag22`), also invoked by the gate on the sitemap set.
   - When CI runs it with no extra paths, the default list is `/`, `/recover`, `/@Library`, `/@Sources`, `/pairs`, `/for-programs`, at 320 and 1280 CSS px.
   - What it measures: sideways scroll at 320 px (1.4.10), target size (2.5.8), focus fully covered (2.4.11), text spacing (1.4.12), and animations still running under `prefers-reduced-motion`.
   - It does not measure 640 px, forced colors, or a screen reader.
3. **Keyboard script** `scripts/keyboard-journeys.mjs`, added in #161 and unchanged since commit `8d7a47a`. It is **not** a CI step on main. It uses Tab, Shift+Tab, Enter, Space, Escape and the arrow keys. It does not submit payment or the recover form. Open PR **#226** (still open on 2026-11-05) would add a parallel `journeys` job that runs `a11y:keyboard` plus an end-to-end smoke of search, compare and export. That PR's description reports 36 passed on a local production preview of that branch. This draft did not re-run the script, and it does not treat #226 as merged.
   - The script's view loop names Library, Sources, Enzyme map, Learn, Cases, Compare, Safety, Find help and Desk. It also opens the Unlock and Plans buttons. It does not name Watch, Practice, the specialty stations or the operator screen. The shell now also has Watch, Plans and Practice in the navigation (`src/components/desk/app.tsx`).
4. **Contrast unit test** `src/lib/a11y/contrast.test.ts`, included in `npm test`. The `check` job on Actions run 41953368575 completed successfully (lint, typecheck, `npm test`, production build). The test fails if the named text tokens in `src/styles.css` drop below 4.5:1 on the named backgrounds. It does not compute every color in the app.
5. **Source review** of the files named in the rows (search shortcut, autocomplete attributes, status text, skip link, forced-colors CSS, titles).
6. **Earlier write-up** `docs/accessibility/wcag-conformance.md` (contrast, focus, reflow). It is not a second report. See the banner in that file.

**Lighthouse, not re-run.** The 2026-10-12 draft recorded accessibility 100, SEO 100 and best practices 77 on `/`, `/recover`, `/pairs` and 5 pair pages. Nothing in CI runs Lighthouse. Those numbers are not a current result. See known gap 5.

**Not done** (still open; do not read a passing script as covering these):

- Manual screen reader (NVDA, JAWS, VoiceOver, TalkBack)
- Speech recognition or switch access
- Browsers other than the Playwright Chromium build
- A manual pass in Windows high contrast / forced colors (CSS exists; see known gap 7). P2
- CSP and privacy follow-up. P2. A `Content-Security-Policy` header is present in `vercel.json` (#176). This draft does not grade that header and does not treat the P2 item as closed
- A manual expert audit
- A finished result from the CI `a11y` job on this commit

## Terms

| Term | Meaning |
| --- | --- |
| **Supports** | The evidence above covers the content that was tested, and that evidence matches the criterion. |
| **Partially Supports** | Some of the tested behavior does not meet the criterion, or a fix is in the tree and has not been confirmed with assistive technology. The gap is in the row. |
| **Not Evaluated** | The evidence is not strong enough to choose Supports or Partially Supports. An automated rule passing is not enough on its own for rows that need a person. |
| **Not Applicable** | The product has no content of this kind in the source that was searched. |

## Summary

| Level | Supports | Partially Supports | Not Evaluated | Not Applicable |
| --- | --- | --- | --- | --- |
| A (32 rows) | 9 | 0 | 16 | 7 |
| AA (24 rows) | 8 | 1 | 13 | 2 |
| **Total (56 rows)** | **17** | **1** | **29** | **9** |

These counts are row labels in this draft. They are not a score. The 56 rows include 4.1.1, which WCAG 2.2 removed. Its row is Not Applicable.

Changes since the 2026-10-12 draft, and only where the cited gap is gone in source: 2.1.4 and 1.3.5 moved from Partially Supports to Supports. 4.1.3 stays Partially Supports because nobody has used a screen reader. No other grade was raised. Nothing was marked Does Not Support; this template's rows do not use that label unless a failure is current and rechecked.

## Table 1: Success Criteria, Level A

| Criteria | Conformance level | Remarks and evidence |
| --- | --- | --- |
| 1.1.1 Non-text Content | Not Evaluated | October axe runs reported no `image-alt` violation on the views they scanned. Decorative plates use `alt=""`. No person has reviewed whether the alt text is meaningful. |
| 1.2.1 Audio-only and Video-only (Prerecorded) | Not Applicable | Source search found no `<audio>` or `<video>` elements. |
| 1.2.2 Captions (Prerecorded) | Not Applicable | No video element in source. |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | Not Applicable | No video element in source. |
| 1.3.1 Info and Relationships | Not Evaluated | October axe runs reported no violation on the views they scanned. In source: description lists (#153), one heading structure per view (#158), labelled toggle groups (#126, `phenotype.tsx`), medication-review controls (#98) and a labelled search combobox. No screen reader pass. |
| 1.3.2 Meaningful Sequence | Not Evaluated | The keyboard script follows visual order on the journeys it includes. It is not in CI. Reading order has not been checked with a screen reader. |
| 1.3.3 Sensory Characteristics | Not Evaluated | Instructions have not been reviewed for this criterion. |
| 1.4.1 Use of Color | Supports | Severity is shown with a text label. Links that had used accent color alone stay underlined (#108). Medication-review toggles use a visible edge (#98). Empty enzyme cells are not drawn as a faint substrate dot (#104). |
| 1.4.2 Audio Control | Not Applicable | No audio element in source. |
| 2.1.1 Keyboard | Supports | `scripts/keyboard-journeys.mjs` covers search, adding and removing a drug, the nine view names listed above, Library filters, one host-factor toggle, `/recover` (not submitted) and `/pairs` to a pair page to the desk. #161 recorded 36 passed. #226's description reports 36 passed on that branch's preview. Specialty stations, the operator screen, Watch and Practice are outside the script. The script is not in CI until #226 merges. |
| 2.1.2 No Keyboard Trap | Supports | The same script, and the earlier tabbing notes in `wcag-conformance.md` (84, 170 and 218 stops), found no trap on those paths. Dialogs that the script still finds keep focus inside while open and release it on Escape (#146, #161). The script treats Unlock or Plans as an in-page view when no dialog is present. |
| 2.1.4 Character Key Shortcuts | Supports | The only single-character shortcut found in `src/` is `/` in `src/components/desk/search.tsx`. It is ignored in text fields, textareas, selects and contenteditable. A button labelled "Turn off / key" (or "Turn on / key") sets `aria-pressed` and stores `firstpass.slash.v1` as `off`. The keyboard script does not press that button. There is no remap control. Turn-off is the mechanism this row uses. The 2026-10-12 row said the shortcut could not be turned off; that sentence was stale. |
| 2.2.1 Timing Adjustable | Not Evaluated | The journeys did not show a time limit. There has been no separate review of timers. |
| 2.2.2 Pause, Stop, Hide | Not Evaluated | `wcag22-checks.mjs` fails if an animation longer than 50 ms is still running under reduced motion. That does not review auto-moving content for someone who has not set reduced motion. |
| 2.3.1 Three Flashes or Below Threshold | Not Evaluated | Not reviewed. |
| 2.4.1 Bypass Blocks | Supports | "Skip to content" is the first focusable control in `src/components/desk/app.tsx` and moves focus to `#main` (#113). |
| 2.4.2 Page Titled | Supports | Route titles in `src/routes/` are unique for pair pages, `/pairs`, `/drug/*`, `/enzyme/*`, `/enzymes`, `/practice`, `/recover`, `/for-programs`, `/privacy`, `/terms`, `/cookies` and `/trust`. Desk views share the shell title from the root route. See known gap 4. |
| 2.4.3 Focus Order | Supports | The keyboard script checks order on its journeys. Source moves focus after a chip is removed and after Escape in search (#161), after the recover form would submit (#149) and after the packet dialog closes (#146). The script is not in CI on main. |
| 2.4.4 Link Purpose (In Context) | Not Evaluated | October axe runs reported no `link-name` violation on the views they scanned. Repeated controls such as "Copy link" have not been reviewed by a person. |
| 2.5.1 Pointer Gestures | Not Applicable | Source search found no multipoint or path-based gesture handlers. |
| 2.5.2 Pointer Cancellation | Not Evaluated | Controls are native buttons and links. Not verified against `down`/`up` handlers. |
| 2.5.3 Label in Name | Not Evaluated | Not reviewed by a person. |
| 2.5.4 Motion Actuation | Not Applicable | Source search found no device-motion handlers. |
| 3.1.1 Language of Page | Supports | `<html lang="en">`. October axe runs reported no `html-has-lang` violation on the views they scanned. |
| 3.2.1 On Focus | Supports | The keyboard script's tabbing did not change context on focus alone, on the journeys it includes. Not re-run for this draft. |
| 3.2.2 On Input | Not Evaluated | Not reviewed. |
| 3.2.6 Consistent Help | Not Evaluated | "Find help" is in the shell navigation on desk views. Public pages were not checked against this criterion. |
| 3.3.1 Error Identification | Not Evaluated | The recover error is tied to the field and `aria-invalid` (#149). Other fields that can error were not exercised for this draft. |
| 3.3.2 Labels or Instructions | Not Evaluated | October axe runs reported no `label` violation on the views they scanned. The search field and the recover email field have labels in source. Not reviewed by a person. |
| 3.3.7 Redundant Entry | Not Evaluated | Not reviewed. |
| 4.1.1 Parsing | Not Applicable | Removed in WCAG 2.2. |
| 4.1.2 Name, Role, Value | Not Evaluated | October axe runs reported no violation on the views they scanned. In source: `aria-pressed` on phenotype and Find help toggles, `aria-current` on the shell navigation, and the search combobox / listbox. No screen reader pass. |

## Table 2: Success Criteria, Level AA

| Criteria | Conformance level | Remarks and evidence |
| --- | --- | --- |
| 1.2.4 Captions (Live) | Not Applicable | No live media element in source. |
| 1.2.5 Audio Description (Prerecorded) | Not Evaluated | No video element was found. Left Not Evaluated until someone confirms there is no video on linked pages either. |
| 1.3.4 Orientation | Not Evaluated | No orientation lock was found in source. Not checked on a device. |
| 1.3.5 Identify Input Purpose | Supports | Source review, not an autofill session. `#checkout-email` in `src/components/desk/plans.tsx` has `autoComplete="email"`. The recover email field does too (`lost-key.tsx`). The for-programs form sets `name`, `email`, `organization` and `organization-title`. The drug search sets `autoComplete="off"` (it does not collect the user's identity). The 2026-10-12 row said the receipt email had no autocomplete; that attribute is in the tree now. |
| 1.4.3 Contrast (Minimum) | Supports | `contrast.test.ts` enforces 4.5:1 for the named text tokens, including `accent-fg` on `accent`. The `check` job on this commit passed `npm test`. #210 changed the selected bedside topic chip to `text-accent-fg` after the audit measured about 2.35:1. The audit's 2026-10-29 note says axe `color-contrast` was clear on that view after the change. This row does not claim the unfinished CI axe run. |
| 1.4.4 Resize Text | Supports | #158 recorded no sideways scroll at 640 CSS px (200% of 1280) on the views that draft scanned. `wcag22-checks.mjs` does not measure 640 px. A person has not confirmed that text is unclipped. |
| 1.4.5 Images of Text | Not Evaluated | Not reviewed. |
| 1.4.10 Reflow | Supports | `wcag22-checks.mjs` fails on sideways scroll at 320 px. #158 and #141 fixed the header and Library grid. The October audit did not list a 1.4.10 failure on the routes it finished. The checkout dialog and the Plans view are not in the CI route list. |
| 1.4.11 Non-text Contrast | Supports | Focus outline at least 5.6:1 in the earlier write-up. Text fields use a 1 px line in the subtle token; `contrast.test.ts` requires that boundary to clear 3:1. Medication-review toggles use a visible edge (#98). |
| 1.4.12 Text Spacing | Not Evaluated | The script applies WCAG spacing and fails on sideways scroll at 320 px or clipped overflow. #201 wraps long headings. #210 wraps enzyme-map column names; the audit's 2026-10-29 recheck recorded 0 px sideways and 0 clipped on `/@Enzyme map` at 320 px. The 2026-10-19 sweep recorded about 19 px of sideways scroll and clipped content in the checkout dialog and the Plans view at 320 px. Those two were not in the 2026-10-29 recheck and are not in the CI route list. See known gap 3. |
| 1.4.13 Content on Hover or Focus | Not Evaluated | The audit's check list names this criterion. The current `wcag22-checks.mjs` header does not implement a separate hover test. Search closes its list when focus leaves the field (`search.tsx`). Not reviewed as a full pass. |
| 2.4.5 Multiple Ways | Supports | Desk navigation, drug search, `/pairs`, `/drug/*` hubs and `sitemap.xml`. |
| 2.4.6 Headings and Labels | Not Evaluated | Views checked in #158 have one `h1` (Enzyme map and Learn use a screen-reader-only `h1`). Whether the headings are descriptive has not been reviewed by a person. |
| 2.4.7 Focus Visible | Supports | The keyboard script checks for a painted outline or shadow at each stop on its journeys. `src/styles.css` sets a `CanvasText` outline under `forced-colors: active` (#158). That media query is not executed in CI. See known gap 7. |
| 2.4.11 Focus Not Obscured (Minimum) | Not Evaluated | `wcag22-checks.mjs` tabs and fails if fixed or sticky content fully covers the focused control, on the routes it is given. The 2026-10-19 sweep recorded two Plans-view controls at 320 px ("Paste and redeem it here" and "Struggling with substance use?") as fully hidden when focused. That view was not in the 2026-10-29 recheck and is not in the CI route list. See known gap 3. |
| 2.5.7 Dragging Movements | Not Applicable | Source search found no drag-and-drop handlers. |
| 2.5.8 Target Size (Minimum) | Supports | The script and axe `target-size` (tag `wcag22aa`) measure this. #184 set 24 px minimums on drug-hub pair links, "Why this grade" summaries and legal links (`src/styles.css`). The audit's 2026-10-29 recheck recorded 0 target-size failures on all 222 `/drug/` routes at 320 and 1280 px. The CI job includes this check; its result on `7c3bfc6` is not in yet. |
| 3.1.2 Language of Parts | Not Evaluated | Not reviewed. |
| 3.2.3 Consistent Navigation | Not Evaluated | The shell navigation is shared across desk views. Not formally reviewed, including against public pages. |
| 3.2.4 Consistent Identification | Not Evaluated | Not reviewed. |
| 3.3.3 Error Suggestion | Not Evaluated | Not reviewed. |
| 3.3.4 Error Prevention (Legal, Financial, Data) | Not Evaluated | Card payment is handed to Stripe Checkout, which this product does not control. The in-app steps before that handoff have not been reviewed for this criterion. |
| 3.3.8 Accessible Authentication (Minimum) | Not Evaluated | Key redemption and sign-in have not been reviewed for this criterion. |
| 4.1.3 Status Messages | Partially Supports | In source, a screen-reader-only `role="status"` says `Removed {name}` when a chip is removed and "Tray cleared" when Clear is pressed (`src/components/desk/app.tsx`). The chip list still sets `aria-relevant="additions removals"`. The keyboard script checks that adding a drug changes live-region text. It does not assert the removal string. No screen reader has been used, so this row stays partial. Recover status (#149), phenotype blurbs and the Library count are also live regions in source and are equally unconfirmed with a screen reader. |

## Known gaps

1. **No screen reader, speech or switch testing.** NVDA, JAWS, VoiceOver and TalkBack have not been used. Most Not Evaluated rows wait on that. The removal and "Tray cleared" strings are in the DOM and have not been heard in a screen reader.
2. **Keyboard and journey CI is not on main.** The script is in the repo. PR #226 was open on 2026-11-05 and would run it, plus a search / compare / export smoke, in a `journeys` job. Until that merges, a red keyboard run does not fail CI. The script does not cover specialty stations, the operator screen, Watch or Practice.
3. **Checkout dialog and Plans view, 320 px (1.4.12 and 2.4.11).** Recorded in the 2026-10-19 audit. Not in the 2026-10-29 recheck. Not in the CI route list. Treat as still open until someone re-runs `wcag22-checks.mjs` on those views.
4. **Desk view titles (2.4.2, note).** In-app views share the shell title. Each URL that is its own route has its own title, which is why 2.4.2 is Supports. Per-view titles would be new wording.
5. **Lighthouse best practices 77, not re-run.** The 2026-10-12 draft attributed the two failing audits (third-party cookies and a DevTools issue) to `https://grok.com/grok-app-builder/extensions.js`, injected from `scripts/grok-pwa-shared.mjs`. That script source is still in the repo. Lighthouse was not run for this refresh. This item is not a WCAG row. `docs/procurement/data-flow.md` cites this gap number.
6. **Browser coverage.** Automated checks use Playwright's Chromium. No Firefox, Safari or mobile screen reader.
7. **Forced colors, manual. P2, still open.** `src/styles.css` includes a `forced-colors: active` rule for `:focus-visible` and pressed / selected states (#158). CI does not emulate forced colors. The October audit lists Windows high contrast as not tested.
8. **CSP and privacy. P2, still open for this lane.** `vercel.json` sends `Content-Security-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy` and `Strict-Transport-Security` (#176). This draft does not review that policy, the privacy page, or cookie copy, and it does not mark the P2 item done.
9. **CI `a11y` on this commit was still running.** Actions run 41953368575, job `a11y`, was in "Preview and browser checks" when this draft was written. The `check` job on that run had already succeeded. Do not quote the `a11y` job as green from this file.
10. **October gate coverage holes.** The 2026-10-19 audit says four `wcag22-checks` worker chunks crashed, so some routes had axe results only. The CI job is the re-run. Its result is not in this draft.

## Legal disclaimer

This draft describes what was tested, with the methods and dates above. It is not a guarantee of conformance and it is not permission to say the product is WCAG compliant. FirstPass is an educational tool. Third-party services, including Stripe Checkout and email delivery, are outside the rows above.
