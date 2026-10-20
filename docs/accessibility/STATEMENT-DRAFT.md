# FirstPass accessibility statement

> **DRAFT - NEEDS KALEB TO VERIFY.** This draft is not published in the app. Kaleb needs to review the wording before it goes anywhere public.

## Our goal

We want FirstPass to be usable by everyone, including people who use a keyboard, screen magnification, high-contrast modes or assistive technology. We use the Web Content Accessibility Guidelines (WCAG) 2.2, Levels A and AA, as our reference.

## Current status

FirstPass does **not** claim conformance with WCAG 2.2 at Level A or AA. Our draft Accessibility Conformance Report (`docs/accessibility/ACR-WCAG22.md`) lists every criterion. It marks some as Supports or Partially Supports, and many as Not Evaluated.

What we have tested so far:
- Automated axe-core and Lighthouse scans of the main views, at phone and desktop widths.
- Scripted keyboard tests (`scripts/keyboard-journeys.mjs`) covering search, adding and removing drugs, switching views, filters, dialogs and the key-recovery page.
- Scripted checks (`scripts/wcag22-checks.mjs`) for reflow at 320px, text spacing, reduced motion, target size, and focus not being hidden behind other content.

Known limitations:
- Nobody has tested with a screen reader yet (NVDA, JAWS, VoiceOver or TalkBack).
- Some screen readers may not announce it when you remove a drug from the list.
- Several WCAG 2.2 criteria have not been evaluated yet. The report lists which ones.

## Feedback

If you run into an accessibility barrier in FirstPass, or need information in another format, email **FirstPassInteractions@gmail.com** with "Accessibility" in the subject. Please tell us the page you were on, what you were trying to do, and the browser and any assistive technology you use. We read every message and use them to decide what to fix next.

## About this statement

Last reviewed: DRAFT, not yet reviewed (prepared Oct 19, 2026).
