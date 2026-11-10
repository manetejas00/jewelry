# Live deployment consistency

10 November 2026.

## Verified source and runtime

- Existing GitHub repository: `manetejas00/jewelry`; original deployment branch `main`; starting/remote commit `b68439a`.
- Read-only SSH source hashes of the active backend `server/index.js`, `server/db.js`, `server/orders.js` and package lock match that older commit, not the hardened local candidate. The live source UI file also had independent differences; it was not assumed identical from Git status.
- Actual runtime: Node 22.23.4, Passenger, NODE_ENV production, PREVIEW_MODE true, DB_CLIENT mysql2, payment environment test. Public API still reports hardcoded COD/readiness.
- MySQL migrations 001–008 present; 009–011 absent. No schema migration was applied during this live audit.
- Recovered frontend compiled from existing main `b68439a`, using matching `index-BFeVVoU-.js` and `index-D4nRRMu-.css`. Both entry documents match that build.
- Hardened source review branch: `codex/live-production-audit`, initial commit `aac7bc5`. [Its GitHub quality run passed](https://github.com/manetejas00/jewelry/actions/runs/42872677946). Later branch commits are visible in Git; no branch push is claimed to be a live release.

## Owner-triggered deployment incident

At 23:18:38 IST a manual GitHub deployment began; the owner confirmed starting it and explicitly authorized repair. Hostinger's build log cloned `main` at `b68439a`, ran Composer installation, then published source to public_html. It did not install/build/start this Node app. The dashboard's “Completed” status was contradicted by public 404s and missing runtime assets/uploads.

Recovery restored the preserved Node routing, blocked accidental source/config exposure, restored a coherent frontend and reconstructed all 672 required originals plus 672 thumbnails from retained publication sources. The complete archive SHA-256 was verified before extraction. Uploads are now in persistent storage outside public_html with a public symlink. No commerce records or credentials were altered. Existing order/customer/catalogue aggregate checks were unchanged after recovery.

## Evidence after recovery

- Independent HTML/API/asset acceptance gate passed with explicit staging preview allowance.
- Both complete scans: 786 referenced same-origin asset URLs, zero failures.
- Fresh final browser: storefront rendered, zero captured console errors, no broken loaded images or overflow at its checked width.
- Representative responsive matrix: 12 checks across four page types and three widths passed.
- `public_html/index.html` and `app/dist/index.html` are aligned to one matching build.
- Hostinger auto-deployment was turned **off** because its current target is incompatible; UI confirmed that Git changes are no longer automatically published.

## Not verified / not deployed

The newer runtime guards, password reset, typed internal errors, exact-purity/silver safeguards, SEO renderer, health endpoints and additive migrations are not live. There is no verified automated Node release/restart/migration/rollback pipeline. The review branch's workflow runs tests/build/audit only and contains no deployment credentials. Main is intentionally unchanged until a safe compatible release is established.

The reviewed release archive is an artifact, not deployment evidence. It has been regenerated with the latest reports/source; its local build/test state must not be conflated with the restored legacy website. Backup exports and account/financial evidence remain private and are excluded from Git/package publication.
