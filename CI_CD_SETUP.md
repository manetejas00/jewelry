# CI/CD setup and evidence

## Existing hosting integration

Hostinger is connected to `manetejas00/jewelry`, branch main, root public_html. Its inspected build log ran Composer then published raw source; it did not run npm/Vite or manage this Node backend. The resulting “Completed” deployment caused a real availability failure and removed uploads. This integration's auto-publication is now off. No credentials are missing for the verified SSH recovery; the current deployment mode is incompatible.

Use the provider's supported Node/Express configuration for this same website/repository. Configure Node 22, install/build commands, server entry, private runtime environment, persistent uploads, readiness checks and rollback. Current inspected Git controls do not expose Node build settings. Do not substitute a Composer trick, untracked cron publisher, second hosting account, or deletion/recreation of the existing site without a reviewed migration.

[Hostinger's Node deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) describes the supported workflow. Provider configuration must be verified on the actual account; a guide is not evidence it has been applied.

## Added quality gate

`.github/workflows/ci.yml` uses read-only repository permissions, Node 22, npm ci, the regression suite, production build and npm audit. It runs on codex/** pushes and PRs. It does not deploy and has no hosting secrets. This adds testing to the existing repository, not a second deployment system.

The first reviewed commit's [GitHub Actions run completed successfully](https://github.com/manetejas00/jewelry/actions/runs/42872677946). Local clean-checkout validation passed 116 tests. Final branch CI must be checked independently after later commits; see deployment history/GitHub for the final result.

`assets:check` is a merchant asset/data-integrity check requiring the local catalogue and ignored generated originals; it is not falsely run against an empty GitHub database. Local asset validation passed 448 checks. The live scanner independently checked 786 referenced URLs after recovery.

## Release acceptance

A future deployment must run backed-up, rehearsed additive migrations explicitly, install the compatible backend and frontend together, preserve all commerce records and persistent media, start under the actual supervisor, and pass live HTML/API/asset/probe/auth/quote checks. No real payment, customer email or account mutation is implied by CI. Do not re-enable main auto-publication until the corrected integration has passed this acceptance gate.
