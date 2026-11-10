# Production blockers — Test3

Updated 10 November 2026. **Do not accept real commerce yet.** Active database is verified MySQL; SQLite migration is not the current blocker.

| Priority | Blocker | What resolves it |
|---|---|---|
| CRITICAL | Documented preview administrator remains usable | Explicit owner approval and a private replacement/revocation plan; preserve other staff and all commerce data. No credential changes were authorized by this audit. |
| HIGH | Wrong hosting publisher | Existing Hostinger Git integration performs Composer/raw publication into public_html. Configure the same repository through an actual Node/Express build/release route. Keep auto-publication paused until it preserves runtime/storage and passes independent checks. |
| HIGH | Preview settings and fictional catalogue | Approve authoritative stock/specifications/policies/contact and proper production behavior; do not relabel fictional supplier data just to bypass guards. |
| HIGH | Audited backend and migrations undeployed | Rehearse additive 009–011 upgrades on an isolated MySQL copy and authorize a backed-up release window; no destructive/down migration. |
| HIGH | Password recovery / email | Supply approved SMTP sender/credentials privately; verify delivery and reset/session invalidation without emailing customers unnecessarily. |
| HIGH | Provider assumptions and absent scheduled imports | Verify supplier currency/unit/purity/freshness contract. Zero scheduled runs were found and no cron entry was observed. Configure and independently observe scheduling. |
| HIGH | Online payment absent, if required | Identify provider; implement server verification/webhooks and failure/cancel/refund handling. COD is not an online gateway or proof of collection. |
| MEDIUM | Live SEO/probes/error handling missing | Deploy compatible backend and route HTML/robots/sitemap/probes correctly; rerun `verify-deployment` and explicit SEO checks. |
| MEDIUM | Unverified restoration/mutation workflows | Rehearse MySQL restore and authorized customer/order/import/upload journeys using designated staging data; no fake live success claims. |
| MEDIUM | Unsupported certification and merchant claims | Merchant evidence or approved copy/data correction; static candidate copy already corrected locally. |
| MEDIUM | Core Web Vitals / capacity unmeasured | Controlled mobile browser metrics and agreed load/concurrency goals. |

## Access status

GitHub SSH access, the signed-in Hostinger session and existing SSH server access work. A private consistent MySQL export and filesystem recovery copies were taken. **Do not report hosting credentials as missing.** The remaining issues are authorization/configuration/service inputs and uncompleted validation, not an assumption that the server cannot be reached.

The current PHP/static integration offers no Node build settings in the inspected deployment controls. No second deployment system, new hosting account, new privileged key or alternate store was created. Use Hostinger's supported Node workflow/support to correct the existing website integration; do not delete/recreate this website or overwrite its data as a shortcut.

## Release gate

`node scripts/verify-deployment.js https://test3.avinyacarefoundation.org --allow-preview` passed only the recovered staging availability gate. Running without that explicit preview allowance must fail while preview is active. Availability does not satisfy the critical security/business blockers above.
