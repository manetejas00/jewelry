# Automatic deployment status

**Status: GitHub Actions deploys `main`. The Hostinger Git publisher stays off.** That publisher copied this Node app into `public_html` as raw source, skipped the build, and removed uploads. Do not turn it back on.

A push to `main` runs `.github/workflows/deploy.yml`. The Action SSHs to the Hostinger app, checks out that commit, runs `npm ci`, `npm run build`, and `npm run migrate` with Node 22, copies the built homepage and hashed assets into `public_html`, then touches `tmp/restart.txt`. `.env` and `storage/uploads` stay on the server. The private key is the `HOSTINGER_SSH_KEY` Actions secret, not a file in this repository.

The hPanel control still says Git changes are not deployed automatically. That is correct. Leave it that way. This repository's Action is the deploy path.

The availability-only command is:

```sh
node scripts/verify-deployment.js https://test3.avinyacarefoundation.org --allow-preview
```

This explicit staging allowance passed after recovery. It does not approve live commerce. Omit the allowance for a production gate; preview must then fail. The report must state both the deployed version and blockers even when automated checks are green.

No webhook URL, SSH private key, deployment token or database password is stored in this repository. New hosting/API permissions were not created as an incidental workaround.
