# Security audit

> Live verification correction (10 November 2026): active storage is MySQL; the SQLite file is inactive legacy storage. The newer LIVE_AUDIT_REPORT.md and LIVE_DEPLOYMENT_VERIFICATION.md supersede earlier SQLite assumptions and describe the owner-triggered deployment incident/recovery.

10 November 2026. This is a source and limited live review, not a penetration-test certification.

## Critical live result

With the user's explicit approval, the documented preview staff login was accepted on test3 (HTTP 200). Immediate logout also returned 200. No customer/order/catalogue mutation was performed. The earlier automatic review rejection was resolved by explicit user authorization; it is not an outstanding permission block.

**Live remediation remains required:** retire that preview owner account, create a private merchant owner, rotate SESSION_SECRET, and invalidate existing staff sessions after a verified backup. The browser credential-change flow must be completed by the owner. Do not expose preview mode to real customer data. Local production startup now rejects preview settings, the default preview owner, and known fictional catalogue suppliers. These changes are not yet live.

## Source fixes and controls

- Production validates HTTPS APP_URL, secret length/placeholders, MySQL connection settings, explicit PREVIEW_MODE=false and supported payment mode before opening storage.
- Cookies are HttpOnly, SameSite Strict and Secure in production. `TRUST_PROXY` defaults to zero; configure only the actual trusted proxy hop count and restrict direct backend reachability.
- Existing session regeneration, staff roles and CSRF retained. Production no longer permits localhost mutation origins; cross-site fetch metadata is rejected.
- Guest checkout retries include a hash of session scope and immutable request details. Another guest cannot turn a guessed retry ID into an order-reading capability.
- Internal database/library errors return generic 500 responses. Sanitized logs contain event/correlation/method/status only, without request bodies, tokens, SQL or PII.
- Global API and login/checkout/reset endpoint limits; JSON limits vary for ordinary requests, CSV and image uploads.
- New image originals must be actual raster formats; SVG originals rejected. Existing `/uploads` responses receive sandbox CSP when delivered by Express. Review any direct LiteSpeed upload delivery separately.
- Offer validation rejects invalid enum values, nonfinite/negative discounts and >100% percentages.
- Reset tokens use 256 random bits, stored SHA-256 hashes, 30-minute expiry and transactional single use. Passwords use bcrypt cost 12; 12-character minimum and 72-byte limit. Reset increments account session version; API middleware removes old customer sessions. Generic forgot-password acknowledgment does not confirm an email's existence. Real SMTP failures return 503 without exposing credentials. Verify delivery/timing behavior with the actual provider.
- Knex parameterization retained. Existing order ownership checks prevent foreign account access; CSRF and state revision checks cover customer writes.
- Production CSP restricts scripts/connect/object/frame behavior. Inline styles remain allowed because the established UI uses them; avoid weakening script policy to accommodate new features.
- `csv-parse` upgraded to 7.0.3 for GHSA-8cw4-87c7-c6xx. SMTP dependency updated to current patched version after an initial vulnerable major was rejected. Final npm audit: zero reported vulnerabilities.

## Limitations and operational work

Live test3 still runs preview mode with active MySQL and a placeholder merchant contact; the earlier SQLite inference was disproven. LiteSpeed serves current HTML directly, so source-level headers/SEO do not prove live protection. Session-secret/owner rotation, database migration, external security monitoring and SMTP sender verification require a controlled host change. No mass credential guesses, destructive probes, payment transactions, filesystem extraction or live customer record reads were performed.

Rate limits use process memory; use an edge limiter or shared store before running multiple Node workers. There is no MFA, email verification, distributed queue, automated fraud prevention, gateway signature verification or refund implementation. Agree which are needed before accepting real commerce. Database backups/import payloads/sessions and customer PII must remain private and access-controlled. Retention policy is a merchant input.
