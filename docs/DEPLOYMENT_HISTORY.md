# Deployment and audit history — 10 November 2026

Times below are Asia/Kolkata unless otherwise labelled. Backups and sensitive evidence remain private.

| Event | Verified result |
|---|---|
| Earlier direct-route asset repair | app/dist entry aligned to the then-working public entry; admin rendered with correct JS/CSS MIME types |
| Initial live audit | 107 jewellery variants, six coins, 786 referenced local assets; raw HTML metadata/robots/sitemap failures documented |
| 23:18:38 owner-triggered Git deployment | Cloned main b68439a; Composer/raw publication; dashboard said Completed but API/direct routes returned hosting 404s |
| Repair authorization | Owner explicitly instructed finishing and repairing the deployment |
| Active database verification | MySQL confirmed; legacy SQLite inference corrected; migrations 001–008 present |
| Private backup | Consistent MySQL export plus current web-root/routing recovery copies taken; no restore rehearsal claimed |
| Service recovery | Node routing restored; matching compiled b68439a frontend installed; 672 original images and 672 thumbnails reconstructed and checksum-verified |
| Data preservation | Existing customer, order, product and coin aggregate checks unchanged; financial values excluded from Git |
| Unsafe publisher paused | Hostinger UI confirmed auto-deployment off |
| Source review commit aac7bc5 | Pushed to codex/live-production-audit; GitHub quality run 42872677946 succeeded |
| Post-recovery HTTP audit | 786 referenced assets successful; representative API/document checks passed; SEO/default-owner blockers remain |
| Post-recovery browser audit | Pagination/filter/search/gallery/guest quote/refresh tested; 12 responsive cases passed; fresh final browser captured no console errors |
| Approved privileged read | Preview login, media list and logout all returned 200; only listing count retained; no media/account changes |
| Final source/report commits | Review branch updated; main remains unchanged; see Git log and Actions for commit/run identifiers |

The previous 70/100 local estimate is not a live deployment result. Current live estimate is 42/100 with critical blockers open. The recovery restored availability of the legacy application; it did not silently apply the security candidate, change staff credentials, migrate schemas or enable real payments.


## Catalogue editor and PDP image update — 11 November 2026

Requested change: jewellery and coin editing share `CatalogueEditForm`, including name, publication status, photo selection, description, validation and save/cancel controls. Coin-specific inventory/pricing fields use the same form through its children. Both editors use the common expandable catalogue row. Detail photographs fill their responsive card with centered cover sizing; original images remain available in the zoom viewer.

Validation before publication: 116 regression tests pass; Vite production build succeeds; diff whitespace check passes. No separate lint/typecheck command is configured. Browser checks confirmed both editors open/cancel and the local coin save closes successfully. Existing generated sample CSV changes are excluded from this commit.

Publication scope: frontend only, from the pushed Git commit, with a private rollback copy of both live HTML entries and compiled assets. The existing backend, environment, database and uploaded media are preserved. The incompatible Hostinger raw-source automatic publisher remains paused; this is a verified Git-sourced publication over the existing SSH access, not an automatic CI/CD success claim. Deployment verification is recorded after publication.


Publication completed: frontend commit `172f15cdc004eb0c088ca69e0a859f249b1094a6` was cloned from Git on Test3, installed from its lockfile, built with Node 22, and published to both web-root and Passenger HTML entries. [GitHub Actions run 42881426927](https://github.com/manetejas00/jewelry/actions/runs/42881426927) succeeded. All five live JS/CSS files returned HTTP 200 and matched the locally tested build byte-for-byte. The availability gate passed with the documented preview allowance.

Live browser verification: jewellery and coin PDPs load; main image and card layout bounds match on mobile (343 × 395 px), and coin desktop bounds match (616 × 770 px). Mobile pages show no horizontal overflow. Jewellery angle selection and the full image viewer work. The browser captured no warning/error console entries. Product and coin save actions passed locally; no live catalogue mutation was performed. The protected backend and environment checksums remain unchanged.

Private rollback: `backups/ui-172f15c/` contains the previous public/Passenger HTML and compiled assets. Old hashed assets remain available, permitting restoration of the two HTML entries without changing database records. Current Git build is retained in `releases/ui-172f15c/`; its exact source commit is recorded privately in `releases/ui-current-commit`. Automatic raw-source publication remains off. This frontend update does not resolve the separate production-security blockers documented in the audit.
