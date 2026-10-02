# FirstPass

Clinical decision support desk for licensed healthcare professionals: CYP450 / PD collisions, FDA-label excerpts, and published scales (COWS, CIWA-Ar, Hunter, MME).

The core checker stays free for up to five drugs, including CYP / PD collision cards, the curated formulary, and common-name / brand / alias search. Host factors (phenotype, smoke, alcohol, route), the enzyme atlas, metabolites, and export are licensed. Founding license is **$79 once**.

**Not FDA-cleared. Not FDA-approved. Not a dose. Not a charting system. The Prescribing Information governs.**

Intended use, warnings, CDS criteria, and residual risk live on the in-app **IFU** tab.

Pitch: [github.com/kaleblovingier/FirstPassInteractions](https://github.com/kaleblovingier/FirstPassInteractions)
Pages: [kaleblovingier.github.io/FirstPassInteractions](https://kaleblovingier.github.io/FirstPassInteractions/)
Deck: [gamma.app/docs/c1sxd9i8iyv80eq](https://gamma.app/docs/c1sxd9i8iyv80eq)

## Try these

Shareable desk links: `?case=gf-oral-ketamine` loads a sample; `?pack=clinic-onboard` or `?pack=mat-cup` opens a teaching pack (first case loads; the pack strip jumps the rest). `?lab=gf-oral-ketamine` opens Study with a PharmD lab-book assignment (three-sentence answer + receipt export on founding / lab). Add `&flip=1` to invert the ketamine route for oral↔IV contrast. Legacy `?sample=` still works.

**Lab book** — eight seeded assignments (oral ketamine × grapefruit, DXM 2D6 PM, ketamine × benzo, tacrolimus × GF, xylazine × fentanyl, naltrexone precip, smoke × clozapine, clozapine × lorazepam / Beers). Free desks open free cases; Pro-host cases and receipt JSON/CSV need founding.

1. **Oral ketamine × grapefruit** — F rises. Half-life does not. Overlay IV: the ghost is untouched.
2. **DXM in a 2D6 poor metabolizer, q8h** — accumulation Rac ~2.7×. Dextrorphan falls.
3. **Azathioprine × allopurinol** — xanthine oxidase, not CYP. Pancytopenia. Search `clinic` or `imuran`.
4. **Fluoxetine** — Stahl occupancy (SERT, long washout) plus DrugBank `DB00472`. Flip 2D6 PM: CPIC has no dose cut for Prozac, but it still locks 2D6 for codeine and tamoxifen. Search `stahl` / `pgx`.
5. **Berberine × simvastatin** — the glucose capsule is a 3A4/P-gp bully, not goldenseal tea. Search `supplement` or `berberine`.
6. **Activated charcoal × levothyroxine** — the binder. The dose never arrives. Metamucil does the same.
7. **Valproate, then flip Pregnant** — teratogen card. Search `pubmed` or open Cites for Bailey, Mega, Krantz, Hunter.
8. **Lorazepam, flip Geriatric** — Beers 2023. Search `beers`.
9. **Paroxetine × codeine** — 2D6 phenoconversion. NM on the lab, PM-like on the enzyme. Search `phenoconversion`.
10. **MDMA × sertraline** — Hunter screen. Clonus, not NMS. Search `hunter`.
11. **Methadone + oxycodone** — MME sketch plus live OpenFDA labels / NIH RxClass. Search `mme` / tap **Ask live sources**.
12. **Methadone cup** — opiate EIA stays negative. Search `uds`. EDDP is how an OTP proves they swallowed it.
13. **Buprenorphine + fentanyl** — precipitated withdrawal. Open Bedside for COWS. A score is not occupancy.
14. **Wellbutrin** — amphetamine-cup false-positive. Search `uds` or `cup`.
15. **N-Pyrrolidino etonitazene × bromazolam** — hot nitazene × designer benzo. Search `nitazene` / `npe`.
16. **Letermovir × tacrolimus** — CMV prophylaxis raises calcineurin. Search `prevymis`.
17. **Daridorexant × ritonavir** — Quviviq meets a strong 3A4 booster. Search `quviviq`.

## Pay / write

- Kaleb Lovingier
- Card on Stripe (primary)
- Venmo [@kaleblovingier](https://venmo.com/u/kaleblovingier)
- Cash App [$kaleblovingier7](https://cash.app/$kaleblovingier7)
- PayPal kaleblovingier@gmail.com
- kaleblovingier@gmail.com · 360-707-8923
- @badbird · @kaleblovingier

Pay $79 with card on the desk (Stripe), or Venmo / Cash App / PayPal. A signed key is minted only after payment clears. There is no fake checkout.

## Who it's for

| Buyer | Why they open it |
| --- | --- |
| Ketamine / esketamine clinics | Oral vs IV first-pass, benzo airway stacks, 2B6 phenotype |
| Primary care / IM / transplant | Imuran × Zyloprim, Imdur × Viagra, Flonase × ritonavir, Ozempic × SU |
| MAT / street-supply desks | Xylazine, nitazenes, designer benzos, naltrexone / loperamide |
| Pharmacy students | Lab book mode (`?lab=`): three-sentence answers + founding receipt export |
| Harm-reduction and psych NPs | MDMA × SSRI, DXM in 2D6 PMs, grapefruit × oral ketamine |

## License

HMAC-signed keys (`FP-LIFE-…`). The five-drug core checker stays free. Founding lifetime is $79.

---

## Map (for the other LLM)

Scholarly apothecary: paper `#efece4`, teal `#2f5d56`, Newsreader + IBM Plex. Auth and database **off**. Persist `firstpass.desk.v7`. Optional `VITE_PAY_URL`, `VITE_PUBLIC_URL`. Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (server only — never a `.env` in the repo). Live clinical lookups: OpenFDA (labels, FAERS, NDC, shortages, enforcement), RxNorm, PubChem, DailyMed, ClinicalTrials.gov, NCBI PubMed, NIH RxClass, CPIC API. (NLM retired the RxNav Interaction API in 2024.)

| Path | What |
| --- | --- |
| `src/lib/regulatory.ts` | Intended use, IFU, CDS criteria, residual risk |
| `src/lib/drugs/basis.ts` | Independent-review source for each collision |
| `src/lib/drugs/catalog.ts` | Formulary |
| `src/lib/drugs/drugbank.ts` | DrugBank accessions + targets |
| `src/lib/drugs/pgx.ts` | CPIC / ClinPGx teaching cards |
| `src/lib/drugs/pubmed.ts` | Curated PMIDs |
| `src/lib/drugs/pubmed.server.ts` | NCBI E-utilities live search |
| `src/lib/drugs/clinic.ts` | Pregnancy / Beers / renal / boxed teaching cards |
| `src/lib/drugs/pheno-convert.ts` | Phenoconversion (inhibitor rewrites genotype) |
| `src/lib/drugs/reversal.ts` | Antidote / will-not-reverse teaching map |
| `src/lib/drugs/mme.ts` | CDC 2022 oral MME factors |
| `src/lib/drugs/syndrome.ts` | Hunter criteria vs NMS |
| `src/lib/drugs/bedside.ts` | Bazett / Fridericia + Cockcroft–Gault + Sheiner–Tozer |
| `src/lib/drugs/otp.ts` | OTP tools: occupancy, Vivitrol washout, 42 CFR 8 take-homes, naloxone, ECG, ID screens |
| `src/lib/drugs/anc.ts` | Clozapine REMS ANC bands |
| `src/lib/drugs/inr.ts` | Warfarin INR movers on the desk |
| `src/lib/drugs/uds.ts` | Urine immunoassay teaching map |
| `src/lib/drugs/withdrawal.ts` | COWS / CIWA-Ar teaching scales |
| `src/lib/drugs/lactmed.ts` | LactMed-style RID cards |
| `src/lib/drugs/cpic.server.ts` | Live CPIC guideline API |
| `src/lib/drugs/live.server.ts` | OpenFDA, FAERS, RxNorm, PubChem, DailyMed, shortages |
| `src/lib/drugs/rxnav.server.ts` | NIH RxClass + OpenFDA label-pair scan |
| `src/lib/drugs/trials.server.ts` | ClinicalTrials.gov v2 |
| `src/lib/drugs/engine.ts` | PK + PD scoring |
| `src/lib/drugs/pk.ts` | One-compartment DDI / phenotype / route / accumulation sketch |
| `src/lib/drugs/host.ts` | Route, smoke, alcohol, washout |
| `src/lib/drugs/rounds.ts` | Teaching cases |
| `src/lib/drugs/samples.ts` | Sample regimens |
| `src/lib/drugs/permalinks.ts` | `?case=` / `?pack=` / `?lab=` share links and teaching packs |
| `src/lib/drugs/lab.ts` | PharmD lab-book assignments + receipt shape |
| `src/lib/billing/commerce.ts` | Pay rails, DMs, launch posts, invoices |
| `src/lib/billing/stripe.server.ts` | Stripe Checkout session + paid-session key mint |
| `src/lib/billing/hunts.ts` | WA/PNW buyer directory (public orgs, websites) |
| `src/components/desk/` | UI |
| `docs/index.html` | Public pitch page (GitHub Pages) |

Do not put a home address on the UI. Do not cold-email the Hunt directory. Educational disclaimer stays visible.
