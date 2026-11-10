# Automatic deployment status

**Status: intentionally paused; not production-ready.** The owner enabled an existing Hostinger Git integration during the live audit. Its main-branch deployment published this Node repository as PHP/static source into public_html, ran no Node build, and removed required assets/uploads. Hostinger's green “Completed” label was not a functional acceptance result.

The owner explicitly authorized repair. Service was restored using the preserved Node routing, a coherent frontend compiled from main b68439a, and original publication images. Database totals/counts remained unchanged. Uploads now live outside the publication root; no new database authority or second deployment system was created.

Auto-publication was switched off, with the UI confirming “Changes from Git are not deployed automatically.” The review branch is pushed and CI runs automatically. Main remains unchanged. The hardened backend/frontend is not represented as deployed.

## Conditions for resuming

1. Configure this existing website/repository through a supported Node/Express build path rather than raw PHP/static publication.
2. Resolve private owner access and preview-business-data approval. Do not bypass startup controls or discard existing data.
3. Rehearse the new additive MySQL migrations and restoration on isolated staging.
4. Preserve private environment/storage, align all HTML entries and uploaded assets, retain a rollback release, and independently verify the deployed commit.
5. Complete live acceptance and only then re-enable the provider's main-branch trigger.

The availability-only command is:

```sh
node scripts/verify-deployment.js https://test3.avinyacarefoundation.org --allow-preview
```

This explicit staging allowance passed after recovery. It does not approve live commerce. Omit the allowance for a production gate; preview must then fail. The report must state both the deployed version and blockers even when automated checks are green.

No webhook URL, SSH private key, deployment token or database password is stored in this repository. New hosting/API permissions were not created as an incidental workaround.
