# Sale-path smoke check (no secrets)

`scripts/sale-smoke.mjs` checks the live buying path on the FirstPass desk with a
headless browser. It reads visible text on **Desk**, **Safety**, and **Plans**, and
tries to redeem an obviously fake key (`FP-LIFE-FAKE-0000`) through the real
Plans → Redeem UI, which calls the `redeemLicense` server function.

It needs no secrets, reads no env files, never mints a key, never opens the
operator Foundry, and writes nothing to disk. The fake key cannot verify.

## When to run it

- **After every merge batch to `main` and the Vercel redeploy that follows it.**
  Wait until the new deployment is live (Vercel shows it as Ready and promoted),
  then run it against the live desk.
- Before sharing the Plans link in outreach, if it has been a while since the last run.
- Optionally against a preview deployment before merging (pass its URL).

## How to run it

From the repo root with dependencies installed (`npm ci`). Playwright is already a
devDependency. The script uses `/usr/bin/google-chrome` if present, else
`CHROME_PATH`, else Playwright's bundled Chromium (`npx playwright install chromium`).

```bash
npm run smoke:sale                                   # live desk, default mode
npm run smoke:sale -- --post-merge                   # also require post-merge copy
npm run smoke:sale -- https://<preview>.vercel.app   # another deployment
npm run smoke:sale -- --json                         # machine-readable result
```

`SALE_SMOKE_URL` can set the base URL; `SALE_SMOKE_TIMEOUT_MS` (default 30000)
sets per-step timeouts.

### Modes

| Mode           | Copy checks (8–11)                      | Exit code                                      |
| -------------- | --------------------------------------- | ---------------------------------------------- |
| default        | reported as `WARN` if missing           | non-zero only if a sale-path check (1–7) fails |
| `--post-merge` | required, reported as `FAIL` if missing | non-zero if any check fails                    |

Use default mode while the copy PRs (audience line, "educational interaction
reference") are still unmerged. Once they are merged **and** redeployed, always
run with `--post-merge`.

Output is one line per check: `[PASS]`, `[WARN]`, or `[FAIL]` with a short
reason, then a tally. Exit code is `0` when nothing failed, `1` when something
failed, `2` for a bad argument.

## What each check means

| #   | Check                                      | Passes when                                                                                                                                                                                            |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Desk loads                                 | The page returns HTTP 2xx/3xx, shows the FirstPass brand, and the main navigation renders.                                                                                                             |
| 2   | Not-FDA-cleared line visible               | "not FDA-cleared" appears on the desk.                                                                                                                                                                 |
| 3   | Plans shows only Free and Founding         | Plans has a Free card and a Founding card, and no other tier card (Pro, Team, Clinic, …), no Monthly/Yearly toggle, and no `$N/mo`-style price.                                                        |
| 4   | Founding is $79 once / lifetime            | Plans shows `$79` and "once" or "lifetime".                                                                                                                                                            |
| 5   | Five-drug free limit stated                | Plans says "five drugs" / "five medicines" (or "five-drug").                                                                                                                                           |
| 6   | Venmo, Cash App, PayPal listed             | All three pay rails appear on Plans.                                                                                                                                                                   |
| 7   | Fake key rejected                          | After Redeem, the server returns `ok: false` (when readable), an error is shown, and nothing says "unlocked".                                                                                          |
| 8   | Exact audience line (post-merge)           | The exact WHO_FOR sentence appears: "For licensed healthcare professionals, and for students in accredited health-professions programs using it for education under faculty or preceptor supervision." |
| 9   | Educational reference wording (post-merge) | "Educational interaction reference" appears (full line: "Educational interaction reference, not a substitute for clinical judgment.").                                                                 |
| 10  | No "trained safety staff" (post-merge)     | The phrase is absent from visible Desk/Safety/Plans text.                                                                                                                                              |
| 11  | No "decision support" (post-merge)         | The phrase is absent, except inside an FDA guidance citation (within ~100 characters of both "FDA" and "guidance").                                                                                    |

## What to do when a check fails

1. **Re-run once.** Transient Vercel cold starts or network blips can fail check 1 or 7.
2. **Confirm what is live.** Check which commit the production deployment is built
   from in Vercel. If it is older than the merge batch, the redeploy has not
   landed yet; wait or trigger it, then re-run.
3. **Per check:**
   - **1 Desk loads:** check Vercel deployment status and runtime logs. If the
     deploy is broken, roll back to the previous deployment in Vercel.
   - **2 Not-FDA-cleared:** the regulatory line was dropped by a copy change. Treat
     as release-blocking; restore it before sharing links.
   - **3 Tiers:** Plans is showing a tier we do not sell (for example the old Pro
     card or a Monthly/Yearly toggle). Find the PR that restored it, or confirm
     live is still on an older build. Do not share Plans links until fixed.
   - **4–6 Price, limit, rails:** buyers cannot see what they pay, what is free,
     or how to pay. Fix the Plans copy (`src/lib/billing/commerce.ts`,
     `src/lib/billing/plans.ts`, `src/components/desk/plans.tsx`) and redeploy.
   - **7 Fake key rejected:** **highest priority.** If the fake key unlocks
     anything, license verification is broken. Pause sales/outreach, roll back
     the deployment, and investigate `src/lib/billing/license*.ts`. If the check
     fails because the Redeem button or `#license-key` field could not be found,
     the Plans UI changed; update the script's selectors.
   - **8–11 Copy (post-merge):** a copy PR was not merged, was reverted, or the
     wording drifted. Compare against the merged PR text; fix copy, not the check,
     unless the approved wording itself changed.
4. Record the run (date, URL, mode, result) in the merge-batch notes.

## Manual Foundry mint test (operator-only)

This script deliberately does **not** test minting or redeeming a real key. The
end-to-end test (mint an FP-LIFE key in the operator Foundry, redeem it on a clean
browser, confirm founding unlocks) is **operator-only and done privately** by the
operator. It uses private credentials that must never appear in this repo, in CI,
in logs, in tickets, or in chat. Do not automate it and do not paste any key,
PIN, or secret from it anywhere.
