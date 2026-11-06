# FirstPass accessibility statement

> **DRAFT - NEEDS KALEB TO VERIFY.** This draft is not published in the app. Kaleb needs to review the wording before it goes anywhere public.

## Our goal

We want FirstPass to be usable by everyone, including people who use a keyboard, screen magnification, high-contrast modes or assistive technology. We use the Web Content Accessibility Guidelines (WCAG) 2.2, Levels A and AA, as our reference.

## Current status

FirstPass does **not** claim conformance with WCAG 2.2 at Level A or AA. Our draft Accessibility Conformance Report (`docs/accessibility/ACR-WCAG22.md`) lists every criterion. It marks some as Supports or Partially Supports, and many as Not Evaluated.

What we have tested so far (see the report for dates and for what is not a pass):
- axe-core 4.14 and `scripts/wcag22-checks.mjs` (reflow at 320px, text spacing, reduced motion, target size, and focus fully covered). CI job `a11y` on main runs both against a production preview (PR #222). The first run on the commit named in the report was still going when this draft was updated, so this line is not a pass.
- A keyboard script (`scripts/keyboard-journeys.mjs`) for search, adding and removing drugs, named views, filters, dialogs and the key-recovery page. It is not a CI step yet. PR #226, still open, would add that job.
- A contrast unit test that runs with the rest of the test suite.
- Lighthouse numbers in older notes were not re-run for this draft.

Known limitations:
- Nobody has tested with a screen reader yet (NVDA, JAWS, VoiceOver or TalkBack).
- Removing a drug writes a hidden status ("Removed" plus the name). No screen reader has been used to check that it is spoken.
- Several WCAG 2.2 criteria have not been evaluated yet. The report lists which ones.
- Manual forced-colors testing, and the CSP / privacy follow-up, are still open (P2).
- Text spacing and covered focus on the checkout dialog and the Plans view were recorded in the October audit and have not been rechecked.

## Feedback

If you run into an accessibility barrier in FirstPass, or need information in another format, email **FirstPassInteractions@gmail.com** with "Accessibility" in the subject. Please tell us the page you were on, what you were trying to do, and the browser and any assistive technology you use. We read every message and use them to decide what to fix next.

## About this statement

Last reviewed: DRAFT, not yet reviewed (prepared Oct 19, 2026; testing notes aligned to the report on Nov 5, 2026). This statement is not published in the app.
