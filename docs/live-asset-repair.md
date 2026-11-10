# Test3 direct-route asset repair — 10 November 2026

The `/admin` page was blank because `app/dist/index.html` referenced missing files `index-CyyFgB3I.js` and `index-B1V_Dhe9.css`. Those URLs returned storefront HTML with HTTP 200; browser module/stylesheet MIME validation therefore rejected them.

The root homepage used existing `index-D4VH4yB8.js` and `index-CdbRg-UE.css` assets. After verifying both files were available with the correct content types, `app/dist/index.html` was updated through the authenticated hosting file manager to match the working homepage entry exactly. No backend release, migrations, credentials or commerce records were changed.

Verification:

- Live `/admin` HTML is byte-identical to the working homepage entry.
- JavaScript returned HTTP 200 with `application/x-javascript`.
- CSS returned HTTP 200 with `text/css`.
- A fresh browser loaded the merchant sign-in screen.
- Captured browser error log was empty.
- Screenshot: `artifacts/test3-admin-repaired.jpg`.
- Private before/after HTML snapshots: `private/test3-asset-repair/`.

For future frontend deployments, upload every referenced asset first, verify content types, and then update BOTH `public_html/index.html` and `app/dist/index.html` to the same build. Retain the previous hashed assets for existing browser sessions. Verify a direct `/admin` or product URL as well as the homepage after deployment. Do not deploy the newer locally audited frontend independently of its required backend changes.

The production-readiness blockers in PROJECT_AUDIT.md remain separate from this asset repair.
