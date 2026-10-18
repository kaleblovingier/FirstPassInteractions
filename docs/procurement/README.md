# Procurement drafts

> **DRAFT. Nothing in this folder has been sent to anyone.** These are working drafts for the
> operator to review, correct and then send. Written 2026-10-18 against software 1.75.0.

Schools, residencies and clinics need sign-off from procurement, IT security and accessibility
offices before they can buy. This folder holds the drafts those offices usually ask for. The
public summary is the `/trust` page (`src/routes/trust.tsx`, copy in `src/lib/seo/trust.ts`).

## What is here

| File | What it is | Status |
| --- | --- | --- |
| [data-flow.md](data-flow.md) | What the browser stores, what leaves it and where it goes, third parties, secrets, logging, hosting. Every line cites a file. | DRAFT |
| [hecvat-lite-draft.md](hecvat-lite-draft.md) | Draft answers to common HECVAT Lite and higher-ed vendor security questions, with file references. | DRAFT, has "Operator to confirm" items |

Related documents elsewhere in the repo:

- Accessibility Conformance Report (draft): `docs/accessibility/ACR-WCAG22.md`
- Validation reports: `docs/validation/label-gold-set.md`, `docs/validation/fda-ddi-agreement.md`, `docs/validation/severity-whatif.md`
- Pharmacist sign-off packet: `docs/clinical-review/signoff-packet.md`
- Regulatory self-assessment: `docs/regulatory/gap-assessment.md`
- License delivery and recovery: `docs/automatic-license-delivery.md`

## Before sending anything

The operator must confirm or fix each of these. The HECVAT draft marks each one
**Operator to confirm:** with a suggested answer.

1. **Legal entity.** The legal form and state of "FirstPass Interactions", and the TIN on the W-9 (HECVAT 1.2).
2. **Company size and references.** Do not invent customers (1.7).
3. **BAA position.** Suggested: no BAAs, because PHI must not be entered (2.5).
4. **The patient name and MRN field.** Remove the "Patient Identifier / Name" field in the handout builder (`src/components/desk/resource-navigator.tsx`) before answering "No" to the PHI question (2.4).
5. **Program rosters and FERPA.** How names sent by a program are handled (2.6). Program keys are being built in another workstream; re-check this answer once they exist.
6. **AI readers.** xAI's data terms for API inputs, and whether to tell users on screen that the readers use an outside AI service (2.7).
7. **Data region, retention and deletion.** Vercel function region, Vercel log retention, Stripe and Resend retention, and how a deletion request is handled (2.8, 2.9, 7.2).
8. **Sharing and privacy policy.** Confirm "we do not sell or share user data", and decide whether to publish a privacy policy page (2.11, 2.12).
9. **Hosting provider attestations.** Quote Vercel's current documentation, not memory (3.3).
10. **Secrets.** Who can read the Vercel environment variables, and where `LICENSE_PEPPER` is backed up (4.3, 12.2).
11. **Account security.** MFA on Vercel, GitHub, Stripe, Resend, PayPal, xAI and the operator Gmail; who has access to each; operator PIN length and rotation (5.3, 5.4, 6.1, 6.3).
12. **Monitoring.** Whether anything watches errors today (7.4).
13. **Incident response and breach notice.** Write the plan; check the notification promise with counsel (8.1, 8.2).
14. **Security contact.** Whether to add `SECURITY.md` or `security.txt` (8.3).
15. **Insurance.** State only coverage that is in force (8.4).
16. **Dependency alerts, patch cadence, penetration testing** (9.3, 9.4).
17. **The public `/api/cds/*` API.** Whether it should stay public without authentication or rate limits (9.7).
18. **Change management.** Review steps before a push to `main`, which deploys straight to production (9.8).
19. **Subprocessor list.** Complete for the accounts in use; provider terms accepted (section 10).
20. **ACR.** The ACR says not to send it until Kaleb has reviewed every row. Its contact email differs from FirstPassInteractions@gmail.com, and its 2.1.4 row may be stale (11.1, 11.3).
21. **PCI SAQ type** with Stripe (section 13).
22. **SLA, disaster recovery, key-person risk.** Do not quote uptime numbers (12.3, 12.4).

## Rules for these drafts

- No certification claims. FirstPass has no SOC 2 report, ISO 27001 certificate, HITRUST or FedRAMP authorization, and is not FDA-cleared.
- No invented customers, uptime numbers, insurance or legal promises.
- Buyer wording says "Founding", never "Pro".
- Educational reference only. The Prescribing Information governs. No dose instructions.
- If the code changes, re-check the cited files and update the drafts and `src/lib/seo/trust.ts` together.
