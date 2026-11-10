# Repository quality and operations

This project uses TanStack Start, Vite, TypeScript, React, Radix primitives,
CVA, and a small existing `src/components/ui/` library. Preserve the design
system. Do not install a duplicate shadcn/ui component tree or Storybook
before reviewing the current components and their tests. Storybook can be a
separate scoped PR after verifying compatibility and lockfile updates.

## Pull-request checks already in place

`.github/workflows/ci.yml` runs ESLint, typecheck, tests, Vite production
build, header/bundle checks, axe-core WCAG checks at desktop and mobile widths,
keyboard journeys, and Playwright search/compare/export smoke journeys.
These workflows are the canonical gates; avoid redundant jobs.

## Added review and maintenance checks

- `security.yml` runs CodeQL on TS/JS and a local scan for common committed
  credential formats. The pattern scan is deliberately narrow and cannot
  substitute for GitHub secret scanning, push protection, or secret rotation.
- Dependabot proposes weekly minor/patch npm updates and Actions upgrades
  through PRs. Run existing CI for every update; never auto-merge.
- `performance.yml` audits a **local** Vite production preview of the home,
  pairs, and trust pages. Lighthouse reports remain Actions artifacts, not
  public uploads. Scores are warnings for the first baseline; review the
  reports and introduce justified error thresholds in a follow-up PR.
- The existing hourly `uptime.yml` probes a public homepage and CDS health
  endpoint. Failures appear in Actions, with notifications controlled by the
  repository owner's GitHub settings.

## Privacy and production instrumentation

The current product already has a first-party analytics subsystem.
Before integrating the connected PostHog service or external error telemetry,
review consent, privacy policy, CSP, sensitive medication searches, and
whether every field could reveal health information. Use only allowlisted
non-sensitive events and disable session replay by default. This PR does not
send traffic to any third-party analytics provider or modify production env.

## Human release checklist

- [ ] All existing CI and new security/performance checks completed
- [ ] Review critical and high CodeQL findings and credential scan alerts
- [ ] Verify private data cannot enter telemetry, errors, or audit artifacts
- [ ] Test keyboard navigation with a human, screen reader, and at 320px
- [ ] Inspect Lighthouse regressions and review bundle budget
- [ ] Confirm preview environment, consent, auth, and production secrets
- [ ] Obtain human PR approval; merge and deploy separately

To enforce these checks, configure GitHub branch protection or repository
rulesets for required jobs and at least one independent reviewer.
