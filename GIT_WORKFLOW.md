# Git workflow

Repository: `git@github.com:manetejas00/jewelry.git`. Original branch/remote main: `b68439a`. Review branch: `codex/live-production-audit`. No force-push, history rewrite, main reset or user-work discard was performed.

The first reviewed source commit is `aac7bc5` (`security: harden commerce configuration, pricing and account recovery`). Subsequent commits separate the last live-audit corrections and reports. Existing source edits were preserved. The three sample CSV files already had working changes and receive timestamp updates from existing tests; they remain uncommitted rather than being silently swept into the release.

## Required sequence

```sh
git status --short
npm ci
npm test
npm run build
npm audit
git diff --check
git diff --cached --check
# Stage explicit reviewed paths; never git-add private backups or ignored artifacts.
git commit -m 'fix: describe the verified behavior change'
git push origin codex/live-production-audit
```

For this candidate, a clean repository-style copy without `.env` or ignored generated multi-view assets passed all 116 tests. A dependent test fixture was corrected to generate isolated test images; recovery tests now establish their own URL. These fixes prevent misleading local-only success. No linter or TypeScript checker is configured in this JavaScript repository; no lint/type result is fabricated.

The quality workflow runs on `codex/**` pushes and pull requests. Main publication is a separate release gate: do not merge/push the audited runtime into the old PHP/static publisher. That publisher is paused after it caused an outage. A successful branch push or green test run is not proof of live deployment.

## Sensitive files

`.env`, `private/`, databases, logs, node_modules, dist, artifacts and runtime-generated asset folders remain ignored. Explicit staging/private-path and recognizable secret-pattern checks were applied before source commits. Public example configuration and test-only fixture strings are not real deployment credentials. Host exports, customer/order evidence, upload recovery archives and session values were excluded.

Never place production keys in a workflow file. No GitHub deployment key or hosting secret was added by this audit. Keep the existing GitHub/Hostinger integration as the release authority once it is configured for Node correctly; do not create a competing store or blind second publisher.
